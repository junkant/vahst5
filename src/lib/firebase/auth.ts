import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged
} from 'firebase/auth';
import type { User } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from './config';

interface TenantInfo {
  tenantId: string;
  role?: string;
  permissions?: string[];
}

export async function signIn(email: string, password: string) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return { user: userCredential.user, error: null };
  } catch (error: any) {
    return { user: null, error: error.message };
  }
}

export async function signUp(email: string, password: string, tenantInfo: TenantInfo) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    await setDoc(doc(db, 'users', user.uid), {
      email: user.email,
      createdAt: new Date(),
      defaultTenant: tenantInfo.tenantId
    });

    await setDoc(doc(db, 'userTenants', user.uid), {
      tenants: {
        [tenantInfo.tenantId]: {
          role: tenantInfo.role || 'owner',
          permissions: tenantInfo.permissions || ['all'],
          joinedAt: new Date()
        }
      },
      defaultTenant: tenantInfo.tenantId
    });

    return { user, error: null };
  } catch (error: any) {
    return { user: null, error: error.message };
  }
}

export async function signOut() {
  try {
    await firebaseSignOut(auth);
    return { error: null };
  } catch (error: any) {
    return { error: error.message };
  }
}

export function subscribeToAuthState(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}