import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions, httpsCallable } from 'firebase/functions';

export const firebaseConfig = {
  apiKey: "AIzaSyC2a-_m9-hR5bk0ioLVch-KcUE6pyu_Ja4",
  authDomain: "sikho-77341.firebaseapp.com",
  projectId: "sikho-77341",
  storageBucket: "sikho-77341.firebasestorage.app",
  messagingSenderId: "202721234137",
  appId: "1:202721234137:android:0f96cea8ee5c0f29efc2c8",
};

export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

export { httpsCallable };
