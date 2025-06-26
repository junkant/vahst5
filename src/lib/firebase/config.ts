import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Using direct values since env vars aren't loading properly
// TODO: Fix environment variable loading later
const firebaseConfig = {
  apiKey: "AIzaSyDZ2cGgriL4f3ipiCxnVulH-bbFk_SqKrc",
  authDomain: "vahst5.firebaseapp.com", 
  projectId: "vahst5",
  storageBucket: "vahst5.firebasestorage.app",
  messagingSenderId: "483828342118",
  appId: "1:483828342118:web:0fac6d022074768e377ca7"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);