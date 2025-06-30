// src/lib/stores/auth.svelte.ts
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut as firebaseSignOut } from 'firebase/auth';
import type { User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, collection, updateDoc } from 'firebase/firestore';
import { auth, db } from '$lib/firebase/config';
import { getUserTenants } from '$lib/firebase/firestore';
import type { Tenant } from './tenant.svelte';

interface AuthState {
  user: FirebaseUser | null;
  currentTenant: Tenant | null;
  availableTenants: Tenant[];
  isLoading: boolean;
  error: string | null;
}

// Svelte 5 state using runes
let user = $state<FirebaseUser | null>(null);
let currentTenant = $state<Tenant | null>(null);
let availableTenants = $state<Tenant[]>([]);
let isLoading = $state(true);
let error = $state<string | null>(null);

// Initialize auth listener
if (typeof window !== 'undefined') {
  onAuthStateChanged(auth, async (firebaseUser) => {
    user = firebaseUser;
    
    if (firebaseUser) {
      try {
        // Load user's tenants
        const tenants = await getUserTenants(firebaseUser.uid);
        availableTenants = tenants;
        
        // Set current tenant (from localStorage or require selection for multiple)
        const savedTenantId = localStorage.getItem('selectedTenantId');
        const savedTenant = tenants.find(t => t.id === savedTenantId);
        
        if (savedTenant) {
          // User had a previously selected tenant
          currentTenant = savedTenant;
        } else if (tenants.length === 1) {
          // Only one tenant, auto-select it
          setTenant(tenants[0]);
        } else {
          // Multiple tenants, no saved selection - user needs to choose
          currentTenant = null;
        }
      } catch (err) {
        error = err instanceof Error ? err.message : 'Failed to load tenant data';
      }
    } else {
      currentTenant = null;
      availableTenants = [];
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
    return { user: userCredential.user, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Sign in failed';
    error = message;
    return { user: null, error: message };
  }
}

async function signUp(email: string, password: string, tenantName: string) {
  try {
    error = null;
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const newUser = userCredential.user;
    
    // Create user profile
    await setDoc(doc(db, 'users', newUser.uid), {
      email: newUser.email,
      createdAt: serverTimestamp()
    });
    
    // Create tenant and add user as owner
    const tenantRef = doc(collection(db, 'tenants'));
    await setDoc(tenantRef, {
      name: tenantName,
      type: null,
      settings: {},
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      ownerId: newUser.uid
    });
    
    // Add user to tenant
    await setDoc(doc(db, 'userTenants', newUser.uid), {
      tenants: {
        [tenantRef.id]: {
          role: 'owner',
          permissions: ['all'],
          joinedAt: serverTimestamp(),
          status: 'active'
        }
      },
      defaultTenant: tenantRef.id
    });
    
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
    await firebaseSignOut(auth);
    currentTenant = null;
    availableTenants = [];
    return { error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Sign out failed';
    error = message;
    return { error: message };
  }
}

function setTenant(tenant: Tenant) {
  currentTenant = tenant;
  if (typeof window !== 'undefined') {
    localStorage.setItem('selectedTenantId', tenant.id);
  }
}

// NEW: Add a new tenant to the user's available tenants
function addTenant(tenant: Tenant) {
  if (!availableTenants.find(t => t.id === tenant.id)) {
    availableTenants = [...availableTenants, tenant];
  }
}

// NEW: Remove a tenant from the user's available tenants
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

// NEW: Check if user needs business selection
function needsBusinessSelection(): boolean {
  // User must be authenticated
  if (!user) return false;
  
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

// NEW: Get the redirect path after login
function getPostLoginRedirect(): string {
  if (!user) return '/login';
  
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

// NEW: Create a new business for the current user
async function createBusiness(businessName: string, businessType?: string): Promise<Tenant> {
  if (!user) {
    throw new Error('User must be authenticated to create a business');
  }
  
  try {
    error = null;
    
    // Create new tenant
    const tenantRef = doc(collection(db, 'tenants'));
    const tenantData = {
      name: businessName.trim(),
      type: businessType || null,
      settings: {},
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      ownerId: user.uid
    };
    
    await setDoc(tenantRef, tenantData);
    
    // Add user as owner to this tenant
    const userTenantRef = doc(db, 'userTenants', user.uid);
    await setDoc(userTenantRef, {
      tenants: {
        [tenantRef.id]: {
          role: 'owner',
          permissions: ['all'],
          joinedAt: serverTimestamp(),
          status: 'active'
        }
      }
    }, { merge: true });
    
    // Create the new tenant object for local state
    const newTenant: Tenant = {
      id: tenantRef.id,
      name: businessName.trim(),
      type: businessType || null,
      settings: {},
      createdAt: new Date(),
      updatedAt: new Date(),
      ownerId: user.uid
    };
    
    // Update local state
    addTenant(newTenant);
    setTenant(newTenant);
    
    return newTenant;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create business';
    error = message;
    throw new Error(message);
  }
}

// NEW: Update tenant information
async function updateTenant(tenantId: string, updates: Partial<Tenant>): Promise<void> {
  if (!user) {
    throw new Error('User must be authenticated to update tenant');
  }
  
  try {
    error = null;
    
    // Update in Firestore
    const tenantRef = doc(db, 'tenants', tenantId);
    await updateDoc(tenantRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
    
    // Update local state
    availableTenants = availableTenants.map(t => 
      t.id === tenantId ? { ...t, ...updates, updatedAt: new Date() } : t
    );
    
    // Update current tenant if it's the one being updated
    if (currentTenant?.id === tenantId) {
      currentTenant = { ...currentTenant, ...updates, updatedAt: new Date() };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update tenant';
    error = message;
    throw new Error(message);
  }
}

// NEW: Refresh tenant data from server
async function refreshTenants(): Promise<void> {
  if (!user) return;
  
  try {
    error = null;
    const tenants = await getUserTenants(user.uid);
    availableTenants = tenants;
    
    // Update current tenant if it exists in the refreshed list
    if (currentTenant) {
      const refreshedCurrentTenant = tenants.find(t => t.id === currentTenant.id);
      if (refreshedCurrentTenant) {
        currentTenant = refreshedCurrentTenant;
      } else {
        // Current tenant no longer exists, clear it
        currentTenant = null;
        if (typeof window !== 'undefined') {
          localStorage.removeItem('selectedTenantId');
        }
      }
    }
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to refresh tenant data';
  }
}

// Export the store hook
export function useAuth() {
  return {
    // State getters
    get user() { return user; },
    get tenant() { return currentTenant; },
    get tenants() { return availableTenants; },
    get isLoading() { return isLoading; },
    get error() { return error; },
    
    // Auth actions
    signIn,
    signUp,
    signOut,
    
    // Tenant actions
    setTenant,
    addTenant,
    removeTenant,
    createBusiness,
    updateTenant,
    refreshTenants,
    
    // Navigation helpers
    needsBusinessSelection,
    getPostLoginRedirect,
    
    // Computed values
    get isAuthenticated() { return !!user; },
    get hasTenant() { return !!currentTenant; },
    get hasMultipleTenants() { return availableTenants.length > 1; },
    get isOwner() { 
      if (!currentTenant || !user) return false;
      return currentTenant.ownerId === user.uid;
    }
  };
}