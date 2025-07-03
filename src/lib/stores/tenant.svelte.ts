// src/lib/stores/tenant.svelte.ts
// Optimized tenant store with correct role structure

import { doc, getDoc, collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db } from '$lib/firebase/config';
import type { User as FirebaseUser } from 'firebase/auth';

// Types
export type UserRole = 'owner' | 'manager' | 'team_member';

export interface TeamMember {
  id: string;
  email: string;
  name?: string;
  role: UserRole;
  permissions: string[];
  joinedAt: Date;
  status: 'active' | 'invited' | 'suspended';
  invitedBy?: string;
}

export interface TenantInvite {
  id: string;
  tenantId: string;
  tenantName: string;
  email: string;
  role: UserRole;
  invitedBy: string;
  invitedByName?: string;
  createdAt: Date;
  expiresAt: Date;
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
  code?: string;
}

export interface TenantSettings {
  timezone?: string;
  currency?: string;
  dateFormat?: string;
  workingHours?: {
    start: string;
    end: string;
    days: number[];
  };
  notifications?: {
    email: boolean;
    sms: boolean;
    push: boolean;
  };
  branding?: {
    primaryColor?: string;
    logo?: string;
  };
}

export interface Tenant {
  id: string;
  name: string;
  type?: string | null;
  plan?: 'starter' | 'professional' | 'enterprise';
  settings: TenantSettings;
  limits?: {
    users: number;
    clients: string;
    jobs: string;
    storage?: number;
  };
  createdAt: Date;
  updatedAt?: Date;
  ownerId: string;
}

// Permission definitions
const PERMISSIONS = {
  owner: [
    'all' // Full control
  ],
  manager: [
    'manage_team',
    'assign_jobs',
    'approve_quotes',
    'approve_invoices', 
    'manage_schedules',
    'manage_clients',
    'manage_jobs',
    'view_reports',
    'view_analytics'
  ],
  team_member: [
    'view_assigned_jobs',
    'update_job_status',
    'add_notes',
    'use_voice_notes',
    'field_mode',
    'view_own_schedule',
    'update_time_tracking'
  ]
} as const;

// State for team management
let teamMembers = $state<TeamMember[]>([]);
let pendingInvites = $state<TenantInvite[]>([]);
let isLoadingTeam = $state(false);
let teamError = $state<string | null>(null);

// Cache for user documents to avoid repeated fetches
const userCache = new Map<string, any>();

// Helper to get auth store
const getAuthStore = () => {
  if (typeof window !== 'undefined' && (window as any).__authStore) {
    return (window as any).__authStore;
  }
  return {
    tenant: null,
    tenants: [],
    isLoading: false,
    error: null,
    user: null,
    hasTenant: false,
    isOwner: false,
    setTenant: async () => {},
    createBusiness: async () => {},
    updateTenant: async () => {},
  };
};

// Optimized team loading with batching
async function loadTeamMembers(): Promise<void> {
  const store = getAuthStore();
  const currentTenant = store.tenant;
  
  if (!currentTenant) {
    teamMembers = [];
    return;
  }
  
  isLoadingTeam = true;
  teamError = null;
  
  try {
    const members: TeamMember[] = [];
    
    // IMPORTANT: First, add the owner from tenant data
    if (currentTenant.ownerId) {
      // Get owner details
      let ownerData;
      if (userCache.has(currentTenant.ownerId)) {
        ownerData = userCache.get(currentTenant.ownerId);
      } else {
        const ownerDoc = await getDoc(doc(db, 'users', currentTenant.ownerId));
        ownerData = ownerDoc.exists() ? ownerDoc.data() : null;
        if (ownerData) {
          userCache.set(currentTenant.ownerId, ownerData);
        }
      }
      
      // Add owner as a team member
      members.push({
        id: currentTenant.ownerId,
        email: ownerData?.email || '',
        name: ownerData?.displayName || ownerData?.name,
        role: 'owner',
        permissions: getDefaultPermissions('owner'),
        joinedAt: currentTenant.createdAt || new Date(),
        status: 'active'
      });
    }
    
    // Then get all other users who belong to this tenant
    const userTenantsQuery = query(
      collection(db, 'userTenants')
    );
    
    const snapshot = await getDocs(userTenantsQuery);
    const userIds: string[] = [];
    
    // First pass: collect user IDs that belong to this tenant (excluding owner)
    snapshot.forEach((doc) => {
      const data = doc.data();
      if (data.tenants && data.tenants[currentTenant.id] && doc.id !== currentTenant.ownerId) {
        userIds.push(doc.id);
      }
    });
    
    // Batch fetch user details
    const userPromises = userIds.map(async (userId) => {
      // Check cache first
      if (userCache.has(userId)) {
        return { id: userId, data: userCache.get(userId) };
      }
      
      const userDoc = await getDoc(doc(db, 'users', userId));
      const userData = userDoc.exists() ? userDoc.data() : null;
      
      // Cache the result
      if (userData) {
        userCache.set(userId, userData);
      }
      
      return { id: userId, data: userData };
    });
    
    const userResults = await Promise.all(userPromises);
    
    // Build team members list for non-owners
    snapshot.forEach((doc) => {
      const data = doc.data();
      const tenantData = data.tenants?.[currentTenant.id];
      
      if (tenantData && doc.id !== currentTenant.ownerId) {
        const userResult = userResults.find(u => u.id === doc.id);
        const userData = userResult?.data;
        
        members.push({
          id: doc.id,
          email: userData?.email || '',
          name: userData?.displayName || userData?.name,
          role: tenantData.role || 'team_member',
          permissions: tenantData.permissions || getDefaultPermissions(tenantData.role),
          joinedAt: tenantData.joinedAt?.toDate() || new Date(),
          status: tenantData.status || 'active',
          invitedBy: tenantData.invitedBy
        });
      }
    });
    
    teamMembers = members;
    
    // Load pending invites
    await loadPendingInvites();
  } catch (err) {
    console.error('Error loading team members:', err);
    teamError = err instanceof Error ? err.message : 'Failed to load team members';
  } finally {
    isLoadingTeam = false;
  }
}

// Optimized invite loading
async function loadPendingInvites(): Promise<void> {
  const store = getAuthStore();
  const currentTenant = store.tenant;
  
  if (!currentTenant) return;
  
  try {
    const invitesQuery = query(
      collection(db, 'tenantInvites'),
      where('tenantId', '==', currentTenant.id),
      where('status', '==', 'pending')
    );
    
    const snapshot = await getDocs(invitesQuery);
    const invites: TenantInvite[] = [];
    const now = new Date();
    const batch = writeBatch(db);
    let hasExpired = false;
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      const invite = {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        expiresAt: data.expiresAt?.toDate() || new Date()
      } as TenantInvite;
      
      // Auto-expire old invites
      if (invite.expiresAt < now) {
        batch.update(doc.ref, { status: 'expired' });
        hasExpired = true;
      } else {
        invites.push(invite);
      }
    });
    
    // Commit expired updates if any
    if (hasExpired) {
      await batch.commit();
    }
    
    pendingInvites = invites;
  } catch (err) {
    console.error('Error loading invites:', err);
  }
}

// Create team member invite
async function inviteTeamMember(
  email: string, 
  role: UserRole, 
  invitedByUser: { id: string; name?: string }
): Promise<{ success: boolean; error?: string; invite?: TenantInvite }> {
  const store = getAuthStore();
  const currentTenant = store.tenant;
  
  if (!currentTenant) {
    return { success: false, error: 'No tenant selected' };
  }
  
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { success: false, error: 'Invalid email format' };
  }
  
  try {
    // Check if user already exists in team
    const existingMember = teamMembers.find(m => 
      m.email.toLowerCase() === email.toLowerCase()
    );
    if (existingMember) {
      return { success: false, error: 'User is already a team member' };
    }
    
    // Check if invite already exists
    const existingInvite = pendingInvites.find(i => 
      i.email.toLowerCase() === email.toLowerCase()
    );
    if (existingInvite) {
      return { success: false, error: 'An invite is already pending for this email' };
    }
    
    // Check team member limits
    const memberCount = teamMembers.length + pendingInvites.length;
    const userLimit = currentTenant.limits?.users || 10; // Default to 10 for starter
    
    if (userLimit !== -1 && memberCount >= userLimit) {
      return { success: false, error: `Team member limit (${userLimit}) reached. Upgrade your plan to add more members.` };
    }
    
    // Create invite
    const inviteData = {
      tenantId: currentTenant.id,
      tenantName: currentTenant.name,
      email: email.toLowerCase().trim(),
      role,
      invitedBy: invitedByUser.id,
      invitedByName: invitedByUser.name || invitedByUser.id,
      createdAt: serverTimestamp(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      status: 'pending',
      code: generateInviteCode()
    };
    
    const inviteRef = await addDoc(collection(db, 'tenantInvites'), inviteData);
    
    const newInvite: TenantInvite = {
      id: inviteRef.id,
      ...inviteData,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    } as TenantInvite;
    
    pendingInvites = [...pendingInvites, newInvite];
    
    return { success: true, invite: newInvite };
  } catch (err) {
    console.error('Error inviting team member:', err);
    return { 
      success: false, 
      error: err instanceof Error ? err.message : 'Failed to send invite' 
    };
  }
}

// Accept invite
async function acceptInvite(inviteCode: string, user: FirebaseUser): Promise<{ success: boolean; error?: string }> {
  try {
    // Find invite by code
    const invitesQuery = query(
      collection(db, 'tenantInvites'),
      where('code', '==', inviteCode.toUpperCase()),
      where('status', '==', 'pending')
    );
    
    const snapshot = await getDocs(invitesQuery);
    if (snapshot.empty) {
      return { success: false, error: 'Invalid or expired invite code' };
    }
    
    const inviteDoc = snapshot.docs[0];
    const invite = { id: inviteDoc.id, ...inviteDoc.data() } as TenantInvite;
    
    // Check if invite is expired
    if (new Date(invite.expiresAt) < new Date()) {
      await updateDoc(doc(db, 'tenantInvites', invite.id), { status: 'expired' });
      return { success: false, error: 'This invite has expired' };
    }
    
    // Check if email matches (case-insensitive)
    if (invite.email.toLowerCase() !== user.email?.toLowerCase()) {
      return { success: false, error: 'This invite is for a different email address' };
    }
    
    // Use batch write for atomic operation
    const batch = writeBatch(db);
    
    // Add/update user in userTenants
    const userTenantRef = doc(db, 'userTenants', user.uid);
    const userTenantDoc = await getDoc(userTenantRef);
    
    if (userTenantDoc.exists()) {
      // Update existing document
      batch.update(userTenantRef, {
        [`tenants.${invite.tenantId}`]: {
          tenantId: invite.tenantId,
          role: invite.role,
          permissions: getDefaultPermissions(invite.role),
          joinedAt: serverTimestamp(),
          status: 'active',
          invitedBy: invite.invitedBy
        }
      });
    } else {
      // Create new document
      batch.set(userTenantRef, {
        tenants: {
          [invite.tenantId]: {
            tenantId: invite.tenantId,
            role: invite.role,
            permissions: getDefaultPermissions(invite.role),
            joinedAt: serverTimestamp(),
            status: 'active',
            invitedBy: invite.invitedBy
          }
        }
      });
    }
    
    // Update invite status
    batch.update(doc(db, 'tenantInvites', invite.id), { 
      status: 'accepted',
      acceptedAt: serverTimestamp(),
      acceptedBy: user.uid
    });
    
    // Commit all changes
    await batch.commit();
    
    return { success: true };
  } catch (err) {
    console.error('Error accepting invite:', err);
    return { 
      success: false, 
      error: err instanceof Error ? err.message : 'Failed to accept invite' 
    };
  }
}

// Update team member role
async function updateTeamMemberRole(memberId: string, newRole: UserRole): Promise<{ success: boolean; error?: string }> {
  const store = getAuthStore();
  const currentTenant = store.tenant;
  const currentUser = store.user;
  
  if (!currentTenant || !currentUser) {
    return { success: false, error: 'No tenant selected' };
  }
  
  try {
    // Prevent self-demotion for last owner
    if (memberId === currentUser.uid) {
      const member = teamMembers.find(m => m.id === memberId);
      if (member?.role === 'owner' && newRole !== 'owner') {
        const ownerCount = teamMembers.filter(m => m.role === 'owner').length;
        if (ownerCount === 1) {
          return { success: false, error: 'Cannot demote the only owner. Promote another member to owner first.' };
        }
      }
    }
    
    // Update in Firestore
    const userTenantRef = doc(db, 'userTenants', memberId);
    await updateDoc(userTenantRef, {
      [`tenants.${currentTenant.id}.role`]: newRole,
      [`tenants.${currentTenant.id}.permissions`]: getDefaultPermissions(newRole)
    });
    
    // Update local state
    teamMembers = teamMembers.map(m => 
      m.id === memberId 
        ? { ...m, role: newRole, permissions: getDefaultPermissions(newRole) }
        : m
    );
    
    return { success: true };
  } catch (err) {
    console.error('Error updating team member role:', err);
    return { 
      success: false, 
      error: err instanceof Error ? err.message : 'Failed to update role' 
    };
  }
}

// Remove team member
async function removeTeamMember(memberId: string): Promise<{ success: boolean; error?: string }> {
  const store = getAuthStore();
  const currentTenant = store.tenant;
  
  if (!currentTenant) {
    return { success: false, error: 'No tenant selected' };
  }
  
  try {
    // Prevent removing the only owner
    const member = teamMembers.find(m => m.id === memberId);
    if (member?.role === 'owner') {
      const ownerCount = teamMembers.filter(m => m.role === 'owner').length;
      if (ownerCount === 1) {
        return { success: false, error: 'Cannot remove the only owner' };
      }
    }
    
    // Remove from Firestore
    const userTenantRef = doc(db, 'userTenants', memberId);
    const userTenantDoc = await getDoc(userTenantRef);
    
    if (userTenantDoc.exists()) {
      const data = userTenantDoc.data();
      delete data.tenants[currentTenant.id];
      
      // If user has no more tenants, delete the document
      if (Object.keys(data.tenants).length === 0) {
        await deleteDoc(userTenantRef);
      } else {
        await updateDoc(userTenantRef, { tenants: data.tenants });
      }
    }
    
    // Update local state
    teamMembers = teamMembers.filter(m => m.id !== memberId);
    
    // Clear cache for this user
    userCache.delete(memberId);
    
    return { success: true };
  } catch (err) {
    console.error('Error removing team member:', err);
    return { 
      success: false, 
      error: err instanceof Error ? err.message : 'Failed to remove team member' 
    };
  }
}

// Cancel invite
async function cancelInvite(inviteId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await updateDoc(doc(db, 'tenantInvites', inviteId), { 
      status: 'cancelled',
      cancelledAt: serverTimestamp()
    });
    
    pendingInvites = pendingInvites.filter(i => i.id !== inviteId);
    
    return { success: true };
  } catch (err) {
    console.error('Error cancelling invite:', err);
    return { 
      success: false, 
      error: err instanceof Error ? err.message : 'Failed to cancel invite' 
    };
  }
}

// Helper functions
function getDefaultPermissions(role: UserRole): string[] {
  return PERMISSIONS[role] || [];
}

function generateInviteCode(): string {
  // More secure code generation
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Check if user has specific permission
function hasPermission(permission: string): boolean {
  const store = getAuthStore();
  if (!store.user || !store.tenant) return false;
  
  const member = teamMembers.find(m => m.id === store.user.uid);
  if (!member) return false;
  
  return member.permissions.includes('all') || member.permissions.includes(permission);
}

// Get current user's role
function getCurrentUserRole(): UserRole | null {
  const store = getAuthStore();
  if (!store.user || !store.tenant) return null;
  
  const member = teamMembers.find(m => m.id === store.user.uid);
  return member?.role || null;
}

// Clear user cache (call on logout)
function clearCache() {
  userCache.clear();
}

// Export enhanced tenant store
export function useTenant() {
  return {
    // Existing functionality from auth store
    get current() {
      return getAuthStore().tenant;
    },
    
    get all() {
      return getAuthStore().tenants;
    },
    
    get isLoading() {
      return getAuthStore().isLoading || isLoadingTeam;
    },
    
    get error() {
      return getAuthStore().error || teamError;
    },
    
    get userRole() {
      return getCurrentUserRole();
    },
    
    get hasTenant() {
      return getAuthStore().hasTenant;
    },
    
    get isOwner() {
      return getCurrentUserRole() === 'owner';
    },
    
    get isManager() {
      const role = getCurrentUserRole();
      return role === 'owner' || role === 'manager';
    },
    
    get canManageTeam() {
      return hasPermission('manage_team') || getCurrentUserRole() === 'owner';
    },
    
    // Tenant operations
    async switch(tenantId: string) {
      const store = getAuthStore();
      const tenant = store.tenants.find((t: Tenant) => t.id === tenantId);
      if (tenant) {
        await store.setTenant(tenant);
        // Reload team data for new tenant
        await loadTeamMembers();
      } else {
        throw new Error('Tenant not found');
      }
    },
    
    async create(tenantData: Partial<Tenant>) {
      const store = getAuthStore();
      return store.createBusiness(tenantData.name || 'New Business', tenantData.type);
    },
    
    async update(tenantId: string, updates: Partial<Tenant>) {
      const store = getAuthStore();
      return store.updateTenant(tenantId, updates);
    },
    
    // Permission checking
    hasPermission,
    
    // Team management
    get team() { return teamMembers; },
    get invites() { return pendingInvites; },
    get isLoadingTeam() { return isLoadingTeam; },
    get teamError() { return teamError; },
    
    loadTeamMembers,
    inviteTeamMember,
    acceptInvite,
    updateTeamMemberRole,
    removeTeamMember,
    cancelInvite,
    
    // Cleanup
    cleanup() {
      teamMembers = [];
      pendingInvites = [];
      teamError = null;
      clearCache();
    },
    
    async initialize(user?: FirebaseUser) {
      if (getAuthStore().tenant) {
        await loadTeamMembers();
      }
    }
  };
}

// Helper to register auth store globally (call this from your auth store)
export function registerAuthStore(authStore: any) {
  if (typeof window !== 'undefined') {
    (window as any).__authStore = authStore;
  }
}