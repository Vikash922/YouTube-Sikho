import { doc, updateDoc, deleteDoc, collection, query, orderBy, onSnapshot, getDoc } from 'firebase/firestore';
import { firebaseFirestore, firebaseAuth } from './firebase';

export interface UserNotificationItem {
  id: string;
  title: string;
  body: string;
  imageUrl?: string | null;
  actionType: 'course' | 'live' | 'notifications' | 'url';
  actionData?: string | null;
  read: boolean;
  createdAt?: any;
}

/**
 * Register or update the student's FCM Push Token in Firestore
 */
export async function registerFcmToken(fcmToken: string): Promise<void> {
  const user = firebaseAuth.currentUser;
  if (!user || !fcmToken) return;

  try {
    const userRef = doc(firebaseFirestore, 'users', user.uid);
    await updateDoc(userRef, {
      fcmToken,
      fcmTokenUpdatedAt: new Date(),
    });
  } catch (err: any) {
    console.warn('Failed to register FCM token in Firestore:', err.message);
  }
}

/**
 * Real-time subscription to current user's in-app notification center feed
 */
export function subscribeToUserNotifications(
  uid: string,
  onUpdate: (items: UserNotificationItem[]) => void,
  onError?: (err: Error) => void
): () => void {
  if (!uid) {
    onUpdate([]);
    return () => {};
  }

  const q = query(
    collection(firebaseFirestore, 'userNotifications', uid, 'items'),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const list = snapshot.docs.map(
        (d) => ({ id: d.id, ...d.data() } as UserNotificationItem)
      );
      onUpdate(list);
    },
    (err) => {
      console.warn('Notifications listener warning:', err.message);
      if (onError) onError(err);
    }
  );
}

/**
 * Mark a single notification item as read
 */
export async function markNotificationAsRead(uid: string, itemId: string): Promise<void> {
  if (!uid || !itemId) return;
  try {
    const itemRef = doc(firebaseFirestore, 'userNotifications', uid, 'items', itemId);
    await updateDoc(itemRef, { read: true });
  } catch (err: any) {
    console.warn('Failed to mark notification as read:', err.message);
  }
}

/**
 * Delete a notification from the student's feed (swipe to delete)
 */
export async function deleteNotificationItem(uid: string, itemId: string): Promise<void> {
  if (!uid || !itemId) return;
  try {
    const itemRef = doc(firebaseFirestore, 'userNotifications', uid, 'items', itemId);
    await deleteDoc(itemRef);
  } catch (err: any) {
    console.warn('Failed to delete notification item:', err.message);
  }
}
