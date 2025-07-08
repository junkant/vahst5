// src/lib/stores/tenant.svelte.ts
// Complete tenant store with enhanced invitation system

import { doc, getDoc, collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db } from '$lib/firebase/config';
import type { User as FirebaseUser } from 'firebase/auth';
import { createInvite, getInviteByCode, getTenantInvites } from '$lib/firebase/invites';
import type { CreateInviteInput, TeamInvite as EnhancedInvite } from '$lib/types/invites';

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
  
  // Recipient info
  recipientEmail: string;
  recipientName?: string;
  recipientPhone?: string;
  invitedRole: UserRole;
  
  // Invite details
  code: string; // ABCD-1234 format
  shortUrl: string; // vahst.app/invite/ABCD1234
  qrCodeUrl?: string; // Data URL for QR code
  
  // Status tracking
  status: 'pending_approval' | 'active' | 'accepted' | 'expired' | 'cancelled';
  
  // Personal touch
  personalMessage?: string;
  messageTemplate: 'casual' | 'formal';
  
  // Created by
  createdBy: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
  };
  
  // For team member suggestions
  needsApproval: boolean;
  approvedBy?: {
    id: string;
    name: string;
    timestamp: Date;
  };
  
  // Tracking
  createdAt: Date;
  expiresAt: Date;
  firstViewedAt?: Date;
  acceptedAt?: Date;
  acceptedBy?: string;
  
  // Share tracking
  shareLog: Array<{
    method: 'copied_email' | 'copied_sms' | 'copied_link' | 'showed_qr' | 'downloaded_qr';
    timestamp: Date;
  }>;
  
  // Legacy fields for type compatibility
  email?: string;
  role?: UserRole;
  invitedBy?: string;
  invitedByName?: string;
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

// Load pending invites from enhanced system
async function loadPendingInvites(): Promise<void> {
  const store = getAuthStore();
  const currentTenant = store.tenant;
  
  if (!currentTenant) return;
  
  try {
    // Load enhanced invites from the new system
    const invites = await getTenantInvites(currentTenant.id);
    
    // Auto-expire old invites
    const now = new Date();
    const batch = writeBatch(db);
    let hasExpired = false;
    
    const activeInvites = invites.filter(invite => {
      if (invite.expiresAt < now && invite.status === 'active') {
        batch.update(doc(db, 'tenants', currentTenant.id, 'invites', invite.id), { 
          status: 'expired' 
        });
        hasExpired = true;
        return false;
      }
      return true;
    });
    
    // Commit expired updates if any
    if (hasExpired) {
      await batch.commit();
    }
    
    // Update local state with enhanced invite objects
    pendingInvites = activeInvites as TenantInvite[];
  } catch (err) {
    console.error('Error loading invites:', err);
  }
}

// Create team member invite with enhanced features
async function inviteTeamMember(
  email: string, 
  role: UserRole, 
  invitedByUser: { id: string; name?: string },
  additionalData?: { name?: string; phone?: string; message?: string; template?: 'casual' | 'formal' }
): Promise<{ success: boolean; error?: string; invite?: EnhancedInvite }> {
  const store = getAuthStore();
  const currentTenant = store.tenant;
  
  if (!store.user || !currentTenant) {
    return { success: false, error: 'No authenticated user or tenant' };
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
      i.recipientEmail?.toLowerCase() === email.toLowerCase() ||
      i.email?.toLowerCase() === email.toLowerCase() // Legacy support
    );
    if (existingInvite) {
      return { success: false, error: 'An invite is already pending for this email' };
    }
    
    // Check team member limits
    const activeMemberCount = teamMembers.length;
    const activeInviteCount = pendingInvites.filter(i => 
      i.status === 'active' || i.status === 'pending_approval'
    ).length;
    const totalCount = activeMemberCount + activeInviteCount;
    const userLimit = currentTenant.limits?.users || 10;
    
    if (userLimit !== -1 && totalCount >= userLimit) {
      return { success: false, error: `Team member limit (${userLimit}) reached. Upgrade your plan to add more members.` };
    }
    
    // Get current user's role for the invite
    const currentUserRole = getCurrentUserRole() || 'team_member';
    
    // Create the invite input
    const inviteInput: CreateInviteInput = {
      email: email.toLowerCase().trim(),
      role,
      name: additionalData?.name,
      phone: additionalData?.phone,
      message: additionalData?.message,
      template: additionalData?.template || 'casual'
    };
    
    // Use the new enhanced invite creation
    const invite = await createInvite(
      currentTenant.id,
      currentTenant.name,
      inviteInput,
      {
        uid: store.user.uid,
        displayName: store.user.displayName,
        email: store.user.email,
        role: currentUserRole
      }
    );
    
    // Add to local state (convert to TenantInvite type)
    const tenantInvite: TenantInvite = {
      ...invite,
      email: invite.recipientEmail, // Legacy support
      role: invite.invitedRole, // Legacy support
      invitedBy: invite.createdBy.id, // Legacy support
      invitedByName: invite.createdBy.name // Legacy support
    };
    
    pendingInvites = [...pendingInvites, tenantInvite];
    
    return { success: true, invite };
  } catch (err) {
    console.error('Error inviting team member:', err);
    return { 
      success: false, 
      error: err instanceof Error ? err.message : 'Failed to send invite' 
    };
  }
}

// Accept invite with enhanced system
async function acceptInvite(inviteCode: string, user: FirebaseUser): Promise<{ success: boolean; error?: string }> {
  try {
    // Format the code and get enhanced invite details
    const formattedCode = inviteCode.toUpperCase();
    const invite = await getInviteByCode(formattedCode);
    
    if (!invite) {
      return { success: false, error: 'Invalid or expired invite code' };
    }
    
    // Validate invite
    if (invite.status !== 'active') {
      return { success: false, error: `This invitation is ${invite.status}` };
    }
    
    if (new Date() > invite.expiresAt) {
      return { success: false, error: 'This invitation has expired' };
    }
    
    if (invite.recipientEmail.toLowerCase() !== user.email?.toLowerCase()) {
      return { success: false, error: 'This invitation is for a different email address' };
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
          role: invite.invitedRole,
          permissions: getDefaultPermissions(invite.invitedRole),
          joinedAt: serverTimestamp(),
          status: 'active',
          invitedBy: invite.createdBy.id
        }
      });
    } else {
      // Create new document
      batch.set(userTenantRef, {
        tenants: {
          [invite.tenantId]: {
            tenantId: invite.tenantId,
            role: invite.invitedRole,
            permissions: getDefaultPermissions(invite.invitedRole),
            joinedAt: serverTimestamp(),
            status: 'active',
            invitedBy: invite.createdBy.id
          }
        }
      });
    }
    
    // Update invite status
    batch.update(doc(db, 'tenants', invite.tenantId, 'invites', invite.id), { 
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

// Cancel invite with enhanced system
async function cancelInvite(inviteId: string): Promise<{ success: boolean; error?: string }> {
  const store = getAuthStore();
  const currentTenant = store.tenant;
  
  if (!currentTenant) {
    return { success: false, error: 'No tenant selected' };
  }
  
  try {
    await updateDoc(doc(db, 'tenants', currentTenant.id, 'invites', inviteId), { 
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
  // Enhanced format for better readability
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // No I or O
  const numbers = '23456789'; // No 0 or 1
  
  const letterPart = Array(4).fill(0).map(() => 
    letters[Math.floor(Math.random() * letters.length)]
  ).join('');
  
  const numberPart = Array(4).fill(0).map(() => 
    numbers[Math.floor(Math.random() * numbers.length)]
  ).join('');
  
  return `${letterPart}-${numberPart}`;
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