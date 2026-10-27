import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { getFunctions, httpsCallable, Functions } from 'firebase/functions';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';

const env = (import.meta as any).env || {};

export const rawFirebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || '',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: env.VITE_FIREBASE_APP_ID || '',
};

// Check for missing keys
export const missingFirebaseKeys: string[] = [];
if (!rawFirebaseConfig.apiKey) missingFirebaseKeys.push('VITE_FIREBASE_API_KEY');
if (!rawFirebaseConfig.authDomain) missingFirebaseKeys.push('VITE_FIREBASE_AUTH_DOMAIN');
if (!rawFirebaseConfig.projectId) missingFirebaseKeys.push('VITE_FIREBASE_PROJECT_ID');
if (!rawFirebaseConfig.storageBucket) missingFirebaseKeys.push('VITE_FIREBASE_STORAGE_BUCKET');
if (!rawFirebaseConfig.messagingSenderId) missingFirebaseKeys.push('VITE_FIREBASE_MESSAGING_SENDER_ID');
if (!rawFirebaseConfig.appId) missingFirebaseKeys.push('VITE_FIREBASE_APP_ID');

export const isFirebaseConfigValid = missingFirebaseKeys.length === 0;

let appInstance: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;
let storageInstance: FirebaseStorage | null = null;
let functionsInstance: Functions | null = null;

if (isFirebaseConfigValid) {
  appInstance = getApps().length > 0 ? getApp() : initializeApp(rawFirebaseConfig);
  authInstance = getAuth(appInstance);
  dbInstance = getFirestore(appInstance);
  storageInstance = getStorage(appInstance);
  functionsInstance = getFunctions(appInstance, 'asia-south1');

  // Initialize App Check for Admin Web Console (reCAPTCHA v3)
  if (env.VITE_RECAPTCHA_SITE_KEY) {
    try {
      initializeAppCheck(appInstance, {
        provider: new ReCaptchaV3Provider(env.VITE_RECAPTCHA_SITE_KEY),
        isTokenAutoRefreshEnabled: true,
      });
      console.log('[AppCheck] Initialized successfully with reCAPTCHA v3');
    } catch (err) {
      console.warn('[AppCheck] Web initialization warning:', err);
    }
  }
} else {
  console.error(
    `[Client Config Error] Firebase configuration is incomplete. Missing keys: ${missingFirebaseKeys.join(', ')}. Firebase was NOT initialized to prevent cross-client data contamination.`
  );
}

export const app = appInstance as FirebaseApp;
export const auth = authInstance as Auth;
export const db = dbInstance as Firestore;
export const storage = storageInstance as FirebaseStorage;
export const functions = functionsInstance as Functions;

export { httpsCallable };
