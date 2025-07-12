// src/lib/stores/auth.svelte.ts - COMPLETE VERSION WITH TENANT STORE REGISTRATION
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut as firebaseSignOut } from 'firebase/auth';
import type { User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, collection, updateDoc } from 'firebase/firestore';
import { auth, db } from '$lib/firebase/config';
import { getUserTenants } from '$lib/firebase/firestore';
import { registerAuthStore } from '$lib/stores/tenant.svelte';

// Import tenant type
interface Tenant {
  id: string;
  name: string;
  type?: string | null;
  plan?: 'starter' | 'professional' | 'enterprise';
  settings: any;
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

// Svelte 5 state using runes
let user = $state<FirebaseUser | null>(null);
let currentTenant = $state<Tenant | null>(null);
let availableTenants = $state<Tenant[]>([]);
let isLoading = $state(true);
let error = $state<string | null>(null);
// ADD: Track if tenants have been loaded
let tenantsLoaded = $state(false);

// Initialize auth listener
if (typeof window !== 'undefined') {
  onAuthStateChanged(auth, async (firebaseUser) => {
    user = firebaseUser;
    
    if (firebaseUser) {
      try {
        // Load user's tenants
        const tenants = await getUserTenants(firebaseUser.uid);
        availableTenants = tenants;
        tenantsLoaded = true; // Mark tenants as loaded
        
        // Set current tenant (from localStorage or require selection for multiple)
        const savedTenantId = localStorage.getItem('selectedTenantId');
        const savedTenant = tenants.find(t => t.id === savedTenantId);
        
        if (savedTenant) {
          // User had a previously selected tenant
          currentTenant = savedTenant;
        } else if (tenants.length === 1) {
          // Only one tenant, auto-select it
          currentTenant = tenants[0];
          localStorage.setItem('selectedTenantId', tenants[0].id);
        } else {
          // Multiple tenants, no saved selection - user needs to choose
          currentTenant = null;
        }
      } catch (err) {
        console.error('Failed to load tenant data:', err);
        error = err instanceof Error ? err.message : 'Failed to load tenant data';
        tenantsLoaded = true; // Even on error, mark as loaded
      }
    } else {
      currentTenant = null;
      availableTenants = [];
      tenantsLoaded = false;
      // Clear localStorage when user signs out
      if (typeof window !== 'undefined') {
        localStorage.removeItem('selectedTenantId');
      }
    }
    
    isLoading = false;
  });
}

// Auth operations
async function signIn(email: string, password: string) {
  try {
    error = null;
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    
    // IMPORTANT: Wait for tenants to be loaded by the auth state listener
    // The onAuthStateChanged handler will load tenants automatically
    
    return { user: userCredential.user, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Sign in failed';
    error = message;
    return { user: null, error: message };
  }
}

async function signUp(email: string, password: string, businessName: string) {
  try {
    error = null;
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const newUser = userCredential.user;

    // Create a new tenant/business
    const tenantRef = doc(collection(db, 'tenants'));
    const tenantData = {
      name: businessName,
      ownerId: newUser.uid,
      plan: 'starter' as const,
      type: null,
      settings: {},
      limits: {
        users: 10,
        clients: 'unlimited',
        jobs: 'unlimited'
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    await setDoc(tenantRef, tenantData);

    // Create user profile
    await setDoc(doc(db, 'users', newUser.uid), {
      email: newUser.email,
      createdAt: serverTimestamp(),
      defaultTenant: tenantRef.id
    });

    // Create user-tenant relationship
    await setDoc(doc(db, 'userTenants', newUser.uid), {
      tenants: {
        [tenantRef.id]: {
          role: 'owner',
          permissions: ['all'],
          joinedAt: serverTimestamp()
        }
      },
      defaultTenant: tenantRef.id
    });

    // Update local state
    const newTenant: Tenant = {
      id: tenantRef.id,
      ...tenantData,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    availableTenants = [newTenant];
    currentTenant = newTenant;
    localStorage.setItem('selectedTenantId', tenantRef.id);

    return { user: newUser, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Sign up failed';
    error = message;
    return { user: null, error: message };
  }
}

async function signOut() {
  try {
    error = null;
    
    // Clean up all stores before signing out
    try {
      // Import and cleanup task store
      const { cleanupJobStore } = await import('./task.svelte');
      if (typeof cleanupJobStore === 'function') {
        cleanupJobStore();
      }
      
      // Import and cleanup client store
      const { cleanupClientStore } = await import('./client.svelte');
      if (typeof cleanupClientStore === 'function') {
        cleanupClientStore();
      }
      
      // Import and cleanup team store
      const { cleanupTeamStore } = await import('./team.svelte');
      if (typeof cleanupTeamStore === 'function') {
        cleanupTeamStore();
      }
    } catch (cleanupError) {
      console.error('Error during store cleanup:', cleanupError);
      // Continue with sign out even if cleanup fails
    }
    
    await firebaseSignOut(auth);
    currentTenant = null;
    availableTenants = [];
    tenantsLoaded = false;
    return { error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Sign out failed';
    error = message;
    return { error: message };
  }
}

// CRITICAL: Updated setTenant that properly handles client cleanup
async function setTenant(tenant: Tenant) {
  // Don't do anything if it's the same tenant
  if (currentTenant?.id === tenant.id) return;
  
  try {
    // Import client store
    const { useClients } = await import('./client.svelte');
    const clients = useClients();
    
    // Clear selected client BEFORE switching tenant
    if (clients.selectedClient) {
      clients.selectClient(null);
    }
    
    // Update current tenant
    currentTenant = tenant;
    localStorage.setItem('selectedTenantId', tenant.id);
    
    // Force client store to reload for new tenant
    clients.subscribeTenant(tenant.id);
    
    console.log(`✅ Switched to tenant: ${tenant.name} (${tenant.id})`);
  } catch (error) {
    console.error('Error during tenant switch:', error);
    throw error;
  }
}

// Add a new tenant to the user's available tenants
function addTenant(tenant: Tenant) {
  if (!availableTenants.find(t => t.id === tenant.id)) {
    availableTenants = [...availableTenants, tenant];
  }
}

// Remove a tenant from the user's available tenants
function removeTenant(tenantId: string) {
  availableTenants = availableTenants.filter(t => t.id !== tenantId);
  
  // If the current tenant was removed, clear it
  if (currentTenant?.id === tenantId) {
    currentTenant = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('selectedTenantId');
    }
  }
}

// Check if user needs business selection
function needsBusinessSelection(): boolean {
  // User must be authenticated
  if (!user) return false;
  
  // IMPORTANT: Wait for tenants to be loaded
  if (!tenantsLoaded) return false;
  
  // If no tenants, they need to create one
  if (!availableTenants.length) return true;
  
  // If multiple tenants but none selected, they need to choose
  if (availableTenants.length > 1 && !currentTenant) return true;
  
  // Single tenant with no selection (should auto-select)
  if (availableTenants.length === 1 && !currentTenant) {
    setTenant(availableTenants[0]);
    return false;
  }
  
  return false;
}

// Get the redirect path after login
function getPostLoginRedirect(): string {
  if (!user) return '/login';
  
  // IMPORTANT: If tenants haven't loaded yet, don't redirect anywhere
  if (!tenantsLoaded) return '/';
  
  // If user has no tenants, go to business selection to create one
  if (!availableTenants.length) return '/select-business';
  
  // If user has multiple tenants but none selected, go to business selection
  if (availableTenants.length > 1 && !currentTenant) return '/select-business';
  
  // If user has only one tenant, auto-select it and go to app
  if (availableTenants.length === 1 && !currentTenant) {
    setTenant(availableTenants[0]);
    return '/my-day';
  }
  
  // User has tenant selected, go to app
  return '/my-day';
}

// Create a new business for the current user
async function createBusiness(businessName: string, businessType?: string) {
  if (!user) throw new Error('Must be authenticated to create a business');
  
  try {
    // Create a new tenant/business
    const tenantRef = doc(collection(db, 'tenants'));
    const tenantData = {
      name: businessName,
      ownerId: user.uid,
      plan: 'starter' as const,
      type: businessType || null,
      settings: {},
      limits: {
        users: 10,
        clients: 'unlimited',
        jobs: 'unlimited'
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    await setDoc(tenantRef, tenantData);

    // Update user-tenant relationship
    const userTenantRef = doc(db, 'userTenants', user.uid);
    const userTenantDoc = await getDoc(userTenantRef);
    
    if (userTenantDoc.exists()) {
      // Add to existing tenants
      await updateDoc(userTenantRef, {
        [`tenants.${tenantRef.id}`]: {
          role: 'owner',
          permissions: ['all'],
          joinedAt: serverTimestamp()
        }
      });
    } else {
      // Create new document
      await setDoc(userTenantRef, {
        tenants: {
          [tenantRef.id]: {
            role: 'owner',
            permissions: ['all'],
            joinedAt: serverTimestamp()
          }
        },
        defaultTenant: tenantRef.id
      });
    }

    // Create tenant object
    const newTenant: Tenant = {
      id: tenantRef.id,
      name: businessName,
      ownerId: user.uid,
      plan: 'starter',
      type: businessType || null,
      settings: {},
      limits: {
        users: 10,
        clients: 'unlimited',
        jobs: 'unlimited'
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Update local state
    addTenant(newTenant);
    await setTenant(newTenant);
    
    return newTenant;
  } catch (error) {
    console.error('Failed to create business:', error);
    throw error;
  }
}

// Update tenant
async function updateTenant(tenantId: string, updates: Partial<Tenant>): Promise<{ success: boolean; error?: any }> {
  try {
    await updateDoc(doc(db, 'tenants', tenantId), {
      ...updates,
      updatedAt: serverTimestamp()
    });
    
    // Update local state if it's the current tenant
    if (currentTenant?.id === tenantId) {
      currentTenant = {
        ...currentTenant,
        ...updates,
        updatedAt: new Date()
      };
    }
    
    // Update in available tenants list
    availableTenants = availableTenants.map(t => 
      t.id === tenantId 
        ? { ...t, ...updates, updatedAt: new Date() }
        : t
    );
    
    return { success: true };
  } catch (error) {
    console.error('Failed to update tenant:', error);
    return { success: false, error };
  }
}

// Export the auth store
export function useAuth() {
  return {
    // State
    get user() { return user; },
    get tenant() { return currentTenant; },
    get tenants() { return availableTenants; },
    get isAuthenticated() { return !!user; },
    get isLoading() { return isLoading; },
    get error() { return error; },
    get tenantsLoaded() { return tenantsLoaded; }, // Export this for checking
    get hasTenant() { return !!currentTenant; },
    get isOwner() { return currentTenant?.ownerId === user?.uid; },
    
    // Actions
    signIn,
    signUp,
    signOut,
    setTenant,
    addTenant,
    removeTenant,
    createBusiness,
    updateTenant,
    
    // Helpers
    needsBusinessSelection,
    getPostLoginRedirect
  };
}

// IMPORTANT: Create and register the auth store with the tenant store
const authStore = {
  get user() { return user; },
  get tenant() { return currentTenant; },
  get tenants() { return availableTenants; },
  get isLoading() { return isLoading; },
  get error() { return error; },
  get hasTenant() { return !!currentTenant; },
  get isOwner() { return currentTenant?.ownerId === user?.uid; },
  setTenant,
  createBusiness,
  updateTenant
};

// Register the auth store with the tenant store
if (typeof window !== 'undefined') {
  registerAuthStore(authStore);
}