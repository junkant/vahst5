// src/lib/firebase-admin.ts
import { initializeApp, cert, getApps, type ServiceAccount } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { dev } from '$app/environment';

let initialized = false;

export function initializeFirebaseAdmin() {
  if (initialized || getApps().length > 0) {
    return;
  }
  
  // In development, use emulator
  if (dev) {
    process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099';
    process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
  }
  
  // Get service account from environment variables
  const serviceAccount: ServiceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID!,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')!
  };
  
  initializeApp({
    credential: cert(serviceAccount)
  });
  
  initialized = true;
}

export { getAuth, getFirestore };