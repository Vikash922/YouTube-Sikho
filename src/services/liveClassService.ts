import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  addDoc,
  updateDoc,
  getDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { firebaseFirestore, firebaseAuth } from './firebase';
import { LiveClassData } from './liveStreamProvider';

export interface LiveChatMessage {
  id: string;
  uid: string;
  userName: string;
  text: string;
  createdAt?: any;
  isDeleted?: boolean;
}

/**
 * Real-time listener for all Live Classes (Live Now, Upcoming, Past)
 */
export function subscribeToLiveClasses(
  onUpdate: (classes: LiveClassData[]) => void,
  onError?: (err: Error) => void
): () => void {
  const colRef = collection(firebaseFirestore, 'liveClasses');

  return onSnapshot(
    colRef,
    (snapshot) => {
      const list = snapshot.docs.map(
        (d) => ({ id: d.id, ...d.data() } as LiveClassData)
      );
      list.sort(
        (a, b) =>
          new Date(a.scheduledAt || 0).getTime() -
          new Date(b.scheduledAt || 0).getTime()
      );
      onUpdate(list);
    },
    (err) => {
      console.warn('Live classes listener error:', err.message);
      if (onError) onError(err);
    }
  );
}

/**
 * Real-time listener for a single Live Class
 */
export function subscribeToSingleLiveClass(
  classId: string,
  onUpdate: (classData: LiveClassData | null) => void
): () => void {
  const ref = doc(firebaseFirestore, 'liveClasses', classId);
  return onSnapshot(ref, (snap) => {
    if (snap.exists()) {
      onUpdate({ id: snap.id, ...snap.data() } as LiveClassData);
    } else {
      onUpdate(null);
    }
  });
}

/**
 * Real-time chat listener for a Live Room
 */
export function subscribeToLiveChat(
  classId: string,
  onUpdate: (messages: LiveChatMessage[]) => void
): () => void {
  const q = query(
    collection(firebaseFirestore, 'liveClasses', classId, 'messages'),
    orderBy('createdAt', 'asc')
  );

  return onSnapshot(q, (snapshot) => {
    const msgs = snapshot.docs
      .map((d) => ({ id: d.id, ...d.data() } as LiveChatMessage))
      .filter((m) => !m.isDeleted);
    onUpdate(msgs);
  });
}

/**
 * Send a chat message into the live room with rate-limiting check
 */
let lastSentTimestamp = 0;

export async function sendLiveChatMessage(
  classId: string,
  text: string
): Promise<void> {
  const user = firebaseAuth.currentUser;
  if (!user) throw new Error('Sign in required to chat.');

  const trimmed = text.trim();
  if (!trimmed || trimmed.length > 300) {
    throw new Error('Message must be between 1 and 300 characters.');
  }

  // 1-second client rate limit guard
  const now = Date.now();
  if (now - lastSentTimestamp < 1000) {
    throw new Error('Please wait a moment before sending another message.');
  }
  lastSentTimestamp = now;

  const messagesRef = collection(firebaseFirestore, 'liveClasses', classId, 'messages');
  await addDoc(messagesRef, {
    uid: user.uid,
    userName: user.displayName || 'Student',
    text: trimmed,
    createdAt: serverTimestamp(),
    isDeleted: false,
  });
}

/**
 * Admin Moderation: Soft delete chat message
 */
export async function deleteChatMessage(classId: string, messageId: string): Promise<void> {
  const msgRef = doc(firebaseFirestore, 'liveClasses', classId, 'messages', messageId);
  await updateDoc(msgRef, { isDeleted: true });
}

/**
 * Check if the student is permitted to join this live class
 */
export async function canStudentJoinLiveClass(
  classData: LiveClassData,
  uid?: string
): Promise<boolean> {
  if (classData.courseId === 'free_for_all' || !classData.courseId) {
    return true;
  }
  if (!uid) return false;

  // Check enrollment in Firestore
  const enrollmentDocId = `${uid}_${classData.courseId}`;
  const enrRef = doc(firebaseFirestore, 'enrollments', enrollmentDocId);
  const snap = await getDoc(enrRef);
  if (!snap.exists()) return false;
  const data = snap.data();
  return data?.status === 'active' || data?.active === true;
}
