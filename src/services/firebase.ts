import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  initializeAuth,
  // @ts-ignore - Exported at runtime in React Native Firebase Auth bundle
  getReactNativePersistence,
  inMemoryPersistence,
  getAuth,
  onAuthStateChanged,
  signOut,
  signInAnonymously,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithCredential,
  signInWithPopup,
  updateProfile,
  User,
} from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  initializeFirestore,
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
  orderBy,
  limit,
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { clientConfig } from '../config/client.config';

/**
 * Universal Firebase SDK (100% Expo Go & Production Compatible)
 * Configured for Project: sikho-77341
 */
const firebaseApp =
  getApps().length === 0
    ? initializeApp(clientConfig.firebaseConfig)
    : getApp();

let authInstance: any;
try {
  const persistence =
    typeof getReactNativePersistence === 'function' && AsyncStorage
      ? getReactNativePersistence(AsyncStorage)
      : inMemoryPersistence;
  authInstance = initializeAuth(firebaseApp, {
    persistence,
  });
} catch (e) {
  authInstance = getAuth(firebaseApp);
}

let firestoreInstance: any;
try {
  firestoreInstance = initializeFirestore(firebaseApp, {
    experimentalForceLongPolling: true,
  });
} catch (e) {
  firestoreInstance = getFirestore(firebaseApp);
}

export const firebaseAuth = authInstance;
export const firebaseFirestore = firestoreInstance;
export const firebaseFunctions = getFunctions(firebaseApp, 'asia-south1');
export const functions = firebaseFunctions;

// Messaging placeholder for Expo Go
export const firebaseMessaging = {
  requestPermission: async () => 1,
  getToken: async () => 'expo-go-dummy-token',
  AuthorizationStatus: { AUTHORIZED: 1, PROVISIONAL: 2 },
};

export {
  onAuthStateChanged,
  signOut,
  signInAnonymously,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithCredential,
  signInWithPopup,
  updateProfile,
  User,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
  orderBy,
  limit,
  getFunctions,
  httpsCallable,
};

export default {
  app: firebaseApp,
  auth: firebaseAuth,
  firestore: firebaseFirestore,
  functions: firebaseFunctions,
};
