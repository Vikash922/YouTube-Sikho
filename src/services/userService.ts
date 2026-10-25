import {
  firebaseFirestore,
  firebaseAuth,
  doc,
  getDoc,
  setDoc,
  updateDoc,
} from './firebase';

export interface UserProfile {
  uid: string;
  name: string;
  phone: string;
  email?: string;
  role?: string;
  photoUrl?: string;
  fcmToken?: string;
  isBlocked: boolean;
  createdAt: any;
  updatedAt?: any;
}

/**
 * Fetch student profile from Firestore users/{uid}
 */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    const userRef = doc(firebaseFirestore, 'users', uid);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      const data = userSnap.data();
      return {
        uid,
        name: data.name || '',
        phone: data.phone || '',
        email: data.email || '',
        role: data.role || 'student',
        photoUrl: data.photoUrl || '',
        fcmToken: data.fcmToken || '',
        isBlocked: data.isBlocked === true,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      } as UserProfile;
    }
    return null;
  } catch (error) {
    console.error('[userService] Error fetching user profile:', error);
    return null;
  }
}

/**
 * Creates or updates student profile document in Firestore users/{uid}
 * Strictly complies with non-writable security fields (never writes isBlocked/role)
 */
export async function saveUserProfile(
  uid: string,
  data: { name: string; phone?: string; email?: string; photoUrl?: string }
): Promise<void> {
  if (!uid) return;
  // Guard against unauthenticated writes which trigger Firestore permission-denied
  if (!firebaseAuth.currentUser || firebaseAuth.currentUser.uid !== uid) {
    console.warn('[userService] Postponing profile save: user not currently authenticated as', uid);
    return;
  }
  try {
    const userRef = doc(firebaseFirestore, 'users', uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      await setDoc(userRef, {
        uid,
        name: data.name.trim(),
        phone: data.phone || '',
        ...(data.email ? { email: data.email } : {}),
        photoUrl: data.photoUrl || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    } else {
      await updateDoc(userRef, {
        name: data.name.trim(),
        ...(data.phone ? { phone: data.phone } : {}),
        ...(data.email ? { email: data.email } : {}),
        ...(data.photoUrl ? { photoUrl: data.photoUrl } : {}),
        updatedAt: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error('[userService] Error saving user profile:', error);
    throw error;
  }
}

/**
 * Sync FCM push notification token for target user
 */
export async function syncFCMToken(uid: string, token: string): Promise<void> {
  if (!uid || !firebaseAuth.currentUser || firebaseAuth.currentUser.uid !== uid) return;
  try {
    const userRef = doc(firebaseFirestore, 'users', uid);
    await updateDoc(userRef, {
      fcmToken: token,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.warn('[userService] Failed to sync FCM token:', error);
  }
}
