import {
  firebaseFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
} from './firebase';

export interface UserProfile {
  uid: string;
  name: string;
  phone: string;
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
      return userSnap.data() as UserProfile;
    }
    return null;
  } catch (error) {
    console.error('[userService] Error fetching user profile:', error);
    return null;
  }
}

/**
 * Creates or updates student profile document in Firestore users/{uid}
 */
export async function saveUserProfile(
  uid: string,
  data: { name: string; phone: string; photoUrl?: string }
): Promise<void> {
  try {
    const userRef = doc(firebaseFirestore, 'users', uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      await setDoc(userRef, {
        uid,
        name: data.name.trim(),
        phone: data.phone,
        photoUrl: data.photoUrl || '',
        isBlocked: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    } else {
      await updateDoc(userRef, {
        name: data.name.trim(),
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
