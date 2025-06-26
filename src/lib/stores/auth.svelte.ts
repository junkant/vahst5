// src/lib/stores/auth.ts
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut as firebaseSignOut } from 'firebase/auth';
import type { User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, collection } from 'firebase/firestore';
import { auth, db } from '$lib/firebase/config';
import { getUserTenants } from '$lib/firebase/firestore';
import type { Tenant } from './tenant';

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
        
        // Set current tenant (from localStorage or first available)
        const savedTenantId = localStorage.getItem('selectedTenantId');
        const savedTenant = tenants.find(t => t.id === savedTenantId);
        currentTenant = savedTenant || tenants[0] || null;
      } catch (err) {
        error = err instanceof Error ? err.message : 'Failed to load tenant data';
      }
    } else {
      currentTenant = null;
      availableTenants = [];
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
      plan: 'starter',
      settings: {},
      limits: {
        users: 10,
        clients: 'unlimited',
        jobs: 'unlimited'
      },
      createdAt: serverTimestamp(),
      ownerId: newUser.uid
    });
    
    // Add user to tenant
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
  localStorage.setItem('selectedTenantId', tenant.id);
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
    
    // Actions
    signIn,
    signUp,
    signOut,
    setTenant,
    
    // Computed values
    get isAuthenticated() { return !!user; },
    get hasTenant() { return !!currentTenant; }
  };
}
