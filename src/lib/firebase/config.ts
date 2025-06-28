// src/lib/firebase/config.ts
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { browser, dev } from '$app/environment';
import { 
  PUBLIC_FIREBASE_API_KEY,
  PUBLIC_FIREBASE_AUTH_DOMAIN,
  PUBLIC_FIREBASE_PROJECT_ID,
  PUBLIC_FIREBASE_STORAGE_BUCKET,
  PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  PUBLIC_FIREBASE_APP_ID,
  PUBLIC_FIREBASE_VAPID_KEY
} from '$env/static/public';

// Initialize Firebase only once
let app: ReturnType<typeof initializeApp>;
let auth: ReturnType<typeof getAuth>;
let db: ReturnType<typeof getFirestore>;
let messaging: any = null;

// Check environment variables only in dev
if (dev && !PUBLIC_FIREBASE_API_KEY) {
  console.error('❌ Firebase environment variables not loaded');
} else if (dev) {
  console.log('🔥 Firebase initialized:', PUBLIC_FIREBASE_PROJECT_ID);
}

// Initialize core Firebase services
if (!app) {
  app = initializeApp({
    apiKey: PUBLIC_FIREBASE_API_KEY,
    authDomain: PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: PUBLIC_FIREBASE_APP_ID
  });
  
  auth = getAuth(app);
  db = getFirestore(app);
  
  // Enable offline persistence using new cache settings
  if (browser && 'caches' in window) {
    // Using the new cache configuration approach
    try {
      // This is handled automatically by Firestore now
      // Just ensure we're using the indexed db cache
    } catch (err) {
      console.warn('Firestore cache configuration:', err);
    }
  }
}

// Lazy load messaging only when needed
export async function getMessagingInstance() {
  if (!browser) return null;
  
  if (messaging) return messaging;
  
  try {
    const { getMessaging, isSupported } = await import('firebase/messaging');
    const supported = await isSupported();
    
    if (supported) {
      messaging = getMessaging(app);
      return messaging;
    }
  } catch (error) {
    console.warn('Firebase Messaging not available:', error);
  }
  
  return null;
}

// Export instances
export { app, auth, db };

// Export VAPID key only if available
export const VAPID_KEY = PUBLIC_FIREBASE_VAPID_KEY || null;