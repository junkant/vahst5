import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { 
  PUBLIC_FIREBASE_API_KEY,
  PUBLIC_FIREBASE_AUTH_DOMAIN,
  PUBLIC_FIREBASE_PROJECT_ID,
  PUBLIC_FIREBASE_STORAGE_BUCKET,
  PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  PUBLIC_FIREBASE_APP_ID
} from '$env/static/public';

const firebaseConfig = {
  apiKey: PUBLIC_FIREBASE_API_KEY,
  authDomain: PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: PUBLIC_FIREBASE_APP_ID
};

// Verify environment variables loaded correctly
if (!PUBLIC_FIREBASE_API_KEY) {
  console.error('❌ Firebase environment variables not loaded');
  console.error('Check that your .env file is in the project root and formatted correctly');
} else {
  console.log('✅ Firebase environment variables loaded successfully');
  console.log('🔥 Firebase initialized with project:', PUBLIC_FIREBASE_PROJECT_ID);
}

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);