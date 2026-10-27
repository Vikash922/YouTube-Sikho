/**
 * FIREBASE AUTHENTICATION SERVICE
 * -------------------------------------------------------------
 * Implements:
 *  - Email/Password Sign Up & Sign In
 *  - Password Reset
 *  - Google Sign-In with automatic Firestore profile creation
 *  - Sign Out
 *
 * Configured dynamically from ClientConfig
 * Guided by: ARCHITECTURE.md & Firebase Auth Best Practices
 */

import { Platform } from 'react-native';
import {
  firebaseAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  updateProfile,
} from './firebase';
import { saveUserProfile, getUserProfile } from './userService';

export interface AuthResult {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  isNewUser?: boolean;
}

/**
 * 1. Sign In with Email and Password
 */
export async function loginWithEmail(email: string, pass: string): Promise<AuthResult> {
  const credential = await signInWithEmailAndPassword(firebaseAuth, email.trim(), pass);
  const user = credential.user;

  // Retrieve or ensure profile in Firestore
  let profile = await getUserProfile(user.uid);
  if (!profile) {
    await saveUserProfile(user.uid, {
      name: user.displayName || email.split('@')[0],
      phone: user.phoneNumber || '',
      photoUrl: user.photoURL || '',
    });
  }

  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName || email.split('@')[0],
    photoURL: user.photoURL,
  };
}

/**
 * 2. Sign Up with Email and Password
 */
export async function registerWithEmail(
  email: string,
  pass: string,
  name: string
): Promise<AuthResult> {
  const credential = await createUserWithEmailAndPassword(firebaseAuth, email.trim(), pass);
  const user = credential.user;

  if (name.trim()) {
    try {
      await updateProfile(user, { displayName: name.trim() });
    } catch (e) {
      console.warn('[authService] Could not update displayName on auth user:', e);
    }
  }

  // Create initial student profile in Firestore users/{uid}
  await saveUserProfile(user.uid, {
    name: name.trim() || email.split('@')[0],
    phone: '',
    photoUrl: user.photoURL || '',
  });

  return {
    uid: user.uid,
    email: user.email,
    displayName: name.trim() || email.split('@')[0],
    photoURL: user.photoURL,
    isNewUser: true,
  };
}

/**
 * 3. Send Password Reset Email
 */
export async function resetPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(firebaseAuth, email.trim());
}

/**
 * 4. Google Sign-In
 */
export async function loginWithGoogle(): Promise<AuthResult> {
  if (Platform.OS === 'web' && typeof signInWithPopup === 'function') {
    const provider = new GoogleAuthProvider();
    provider.addScope('profile');
    provider.addScope('email');

    const result = await signInWithPopup(firebaseAuth, provider);
    const user = result.user;

    await saveUserProfile(user.uid, {
      name: user.displayName || 'Student',
      phone: user.phoneNumber || '',
      photoUrl: user.photoURL || '',
    });

    return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
    };
  }

  throw new Error('Google Sign-In on mobile requires native Google Play Services credentials in an EAS development build. To test in Expo Go, please use Email & Password or Phone OTP.');
}

/**
 * 5. Sign Out
 */
export async function logoutUser(): Promise<void> {
  await signOut(firebaseAuth);
}
