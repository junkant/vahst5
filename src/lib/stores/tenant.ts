// src/lib/stores/tenant.ts
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  onSnapshot,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
  type Unsubscribe
} from 'firebase/firestore';
import { db } from '$lib/firebase/config';
import { useAuth } from './auth';
import type { User as FirebaseUser } from 'firebase/auth';

// Tenant types
export interface Tenant {
  id: string;
  name: string;
  plan: 'starter' | 'professional' | 'enterprise';
  settings: TenantSettings;
  limits: TenantLimits;
  createdAt: Date;
  updatedAt: Date;
  ownerId: string;
}

export interface TenantSettings {
  businessType?: 'hvac' | 'plumbing' | 'electrical' | 'general';
  timezone?: string;
  currency?: string;
  taxRate?: number;
  invoicePrefix?: string;
  customFields?: Record<string, any>;
}

export interface TenantLimits {
  users: number | 'unlimited';
  clients: number | 'unlimited';
  jobs: number | 'unlimited';
  storage: number; // in GB
}

export interface UserTenant {
  tenantId: string;
  role: 'owner' | 'admin' | 'manager' | 'technician';
  permissions: string[];
  joinedAt: Date;
  status: 'active' | 'inactive' | 'invited';
}

export interface TenantInvite {
  id: string;
  tenantId: string;
  email: string;
  role: UserTenant['role'];
  invitedBy: string;
  invitedAt: Date;
  status: 'pending' | 'accepted' | 'expired';
  expiresAt: Date;
}

// Svelte 5 state
let currentTenant = $state<Tenant | null>(null);
let availableTenants = $state<Tenant[]>([]);
let userTenants = $state<Map<string, UserTenant>>(new Map());
let isLoading = $state(true);
let error = $state<string | null>(null);
let unsubscribers: Unsubscribe[] = [];

// Initialize tenant data when auth changes
function initializeTenantData(user: FirebaseUser | null) {
  // Clean up previous subscriptions
  unsubscribers.forEach(unsub => unsub());
  unsubscribers = [];
  
  if (!user) {
    currentTenant = null;
    availableTenants = [];
    userTenants.clear();
    isLoading = false;
    return;
  }
  
  isLoading = true;
  
  // Subscribe to user's tenant memberships
  const userTenantsRef = doc(db, 'userTenants', user.uid);
  const unsubscribe = onSnapshot(
    userTenantsRef,
    async (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const tenantMemberships = new Map<string, UserTenant>();
        
        // Process tenant memberships
        for (const [tenantId, membership] of Object.entries(data.tenants || {})) {
          tenantMemberships.set(tenantId, membership as UserTenant);
        }
        
        userTenants = tenantMemberships;
        
        // Fetch tenant details
        const tenantPromises = Array.from(tenantMemberships.keys()).map(async (tenantId) => {
          const tenantDoc = await getDoc(doc(db, 'tenants', tenantId));
          if (tenantDoc.exists()) {
            return { id: tenantDoc.id, ...tenantDoc.data() } as Tenant;
          }
          return null;
        });
        
        const tenants = (await Promise.all(tenantPromises)).filter(Boolean) as Tenant[];
        availableTenants = tenants;
        
        // Set current tenant
        if (!currentTenant && tenants.length > 0) {
          // Try to restore from localStorage
          const savedTenantId = localStorage.getItem('selectedTenantId');
          const savedTenant = tenants.find(t => t.id === savedTenantId);
          currentTenant = savedTenant || tenants[0];
        }
        
        isLoading = false;
      } else {
        // No tenant memberships yet
        availableTenants = [];
        currentTenant = null;
        isLoading = false;
      }
    },
    (err) => {
      console.error('Error loading tenant data:', err);
      error = err.message;
      isLoading = false;
    }
  );
  
  unsubscribers.push(unsubscribe);
}

// Tenant operations
async function createTenant(tenantData: Partial<Tenant>): Promise<Tenant> {
  const auth = useAuth();
  if (!auth.user) throw new Error('User must be authenticated to create a tenant');
  
  const tenantRef = doc(collection(db, 'tenants'));
  const tenant: Omit<Tenant, 'id'> = {
    name: tenantData.name || '',
    plan: tenantData.plan || 'starter',
    settings: tenantData.settings || {},
    limits: tenantData.limits || {
      users: 10,
      clients: 'unlimited',
      jobs: 'unlimited',
      storage: 5
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    ownerId: auth.user.uid
  };
  
  await setDoc(tenantRef, {
    ...tenant,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  
  // Add user as owner
  await setDoc(doc(db, 'userTenants', auth.user.uid), {
    tenants: {
      [tenantRef.id]: {
        tenantId: tenantRef.id,
        role: 'owner',
        permissions: ['all'],
        joinedAt: serverTimestamp(),
        status: 'active'
      }
    },
    defaultTenant: tenantRef.id
  }, { merge: true });
  
  const newTenant = { id: tenantRef.id, ...tenant };
  
  // Update local state
  availableTenants = [...availableTenants, newTenant];
  currentTenant = newTenant;
  
  return newTenant;
}

async function updateTenant(tenantId: string, updates: Partial<Tenant>): Promise<void> {
  const tenantRef = doc(db, 'tenants', tenantId);
  await updateDoc(tenantRef, {
    ...updates,
    updatedAt: serverTimestamp()
  });
  
  // Update local state
  availableTenants = availableTenants.map(t => 
    t.id === tenantId ? { ...t, ...updates, updatedAt: new Date() } : t
  );
  
  if (currentTenant?.id === tenantId) {
    currentTenant = { ...currentTenant, ...updates, updatedAt: new Date() };
  }
}

async function switchTenant(tenantId: string): Promise<void> {
  const tenant = availableTenants.find(t => t.id === tenantId);
  if (!tenant) throw new Error('Tenant not found');
  
  currentTenant = tenant;
  localStorage.setItem('selectedTenantId', tenantId);
}

async function inviteUserToTenant(
  tenantId: string, 
  email: string, 
  role: UserTenant['role']
): Promise<TenantInvite> {
  const auth = useAuth();
  if (!auth.user) throw new Error('User must be authenticated');
  
  const inviteRef = doc(collection(db, 'tenantInvites'));
  const invite: Omit<TenantInvite, 'id'> = {
    tenantId,
    email,
    role,
    invitedBy: auth.user.uid,
    invitedAt: new Date(),
    status: 'pending',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
  };
  
  await setDoc(inviteRef, {
    ...invite,
    invitedAt: serverTimestamp(),
    expiresAt: serverTimestamp()
  });
  
  return { id: inviteRef.id, ...invite };
}

async function acceptInvite(inviteId: string): Promise<void> {
  const auth = useAuth();
  if (!auth.user) throw new Error('User must be authenticated');
  
  const inviteRef = doc(db, 'tenantInvites', inviteId);
  const inviteSnap = await getDoc(inviteRef);
  
  if (!inviteSnap.exists()) throw new Error('Invite not found');
  
  const invite = inviteSnap.data() as TenantInvite;
  
  if (invite.status !== 'pending') throw new Error('Invite already used');
  if (new Date(invite.expiresAt) < new Date()) throw new Error('Invite expired');
  
  // Add user to tenant
  await setDoc(doc(db, 'userTenants', auth.user.uid), {
    tenants: {
      [invite.tenantId]: {
        tenantId: invite.tenantId,
        role: invite.role,
        permissions: getRolePermissions(invite.role),
        joinedAt: serverTimestamp(),
        status: 'active'
      }
    }
  }, { merge: true });
  
  // Update invite status
  await updateDoc(inviteRef, { status: 'accepted' });
  
  // Reload tenant data
  initializeTenantData(auth.user);
}

// Helper functions
function getRolePermissions(role: UserTenant['role']): string[] {
  switch (role) {
    case 'owner':
      return ['all'];
    case 'admin':
      return ['manage-users', 'manage-clients', 'manage-jobs', 'manage-invoices', 'view-reports'];
    case 'manager':
      return ['manage-clients', 'manage-jobs', 'manage-invoices', 'view-reports'];
    case 'technician':
      return ['view-clients', 'manage-jobs', 'create-invoices'];
    default:
      return [];
  }
}

function hasPermission(permission: string): boolean {
  if (!currentTenant) return false;
  
  const membership = userTenants.get(currentTenant.id);
  if (!membership) return false;
  
  return membership.permissions.includes('all') || membership.permissions.includes(permission);
}

function getUserRole(tenantId?: string): UserTenant['role'] | null {
  const targetTenantId = tenantId || currentTenant?.id;
  if (!targetTenantId) return null;
  
  const membership = userTenants.get(targetTenantId);
  return membership?.role || null;
}

// Export the store hook
export function useTenant() {
  const auth = useAuth();
  
  // Initialize when auth changes
  $effect(() => {
    initializeTenantData(auth.user);
  });
  
  // Cleanup on unmount
  $effect(() => {
    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  });
  
  return {
    // State
    get current() { return currentTenant; },
    get all() { return availableTenants; },
    get isLoading() { return isLoading; },
    get error() { return error; },
    
    // User's role and permissions
    get userRole() { return getUserRole(); },
    hasPermission,
    
    // Actions
    create: createTenant,
    update: updateTenant,
    switch: switchTenant,
    inviteUser: inviteUserToTenant,
    acceptInvite,
    
    // Get specific tenant
    getById: (id: string) => availableTenants.find(t => t.id === id),
    
    // Check if user is owner
    isOwner: (tenantId?: string) => getUserRole(tenantId) === 'owner',
    
    // Check if user is admin or higher
    isAdmin: (tenantId?: string) => {
      const role = getUserRole(tenantId);
      return role === 'owner' || role === 'admin';
    }
  };
}