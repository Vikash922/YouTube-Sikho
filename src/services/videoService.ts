import { doc, getDoc, setDoc, collection, query, where, onSnapshot } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { firebaseFirestore, firebaseAuth, functions } from './firebase';

export interface LessonProgress {
  position: number;
  duration: number;
  completed: boolean;
  updatedAt: string;
}

export interface CourseProgressData {
  uid: string;
  courseId: string;
  lastLessonId: string;
  lastPosition: number;
  completedLessons: string[];
  lessons: Record<string, LessonProgress>;
  percentComplete: number;
  updatedAt: string;
}

// In-memory queue for debouncing position updates (syncs every 10s)
let syncTimer: any = null;
let pendingUpdate: {
  uid: string;
  courseId: string;
  lessonId: string;
  position: number;
  duration: number;
} | null = null;

// Track already marked complete lessons in session to avoid duplicate callable triggers
const markedCompleteInSession = new Set<string>();

/**
 * Server-authoritative lesson completion callable
 */
export async function callMarkLessonComplete(
  courseId: string,
  lessonId: string,
  watchedSeconds?: number
): Promise<{ success: boolean; completedLessons: string[]; percentage: number } | null> {
  if (!firebaseAuth.currentUser || !courseId || !lessonId) return null;

  try {
    const markCompleteFn = httpsCallable<
      { courseId: string; lessonId: string; watchedSeconds?: number },
      { success: boolean; completedLessons: string[]; percentage: number }
    >(functions, 'markLessonComplete');

    const res = await markCompleteFn({
      courseId,
      lessonId,
      watchedSeconds: watchedSeconds ? Math.round(watchedSeconds) : 0,
    });
    markedCompleteInSession.add(`${courseId}_${lessonId}`);
    return res.data;
  } catch (err: any) {
    console.warn('[videoService] markLessonComplete error:', err.message);
    return null;
  }
}

/**
 * 1. Queue Progress Update (Debounced 10s interval)
 */
export function queueProgressUpdate(
  uid: string | null | undefined,
  courseId: string,
  lessonId: string,
  positionSec: number,
  durationSec: number
): void {
  if (!uid || !courseId || !lessonId || durationSec <= 0) return;

  pendingUpdate = {
    uid,
    courseId,
    lessonId,
    position: positionSec,
    duration: durationSec,
  };

  if (!syncTimer) {
    syncTimer = setTimeout(async () => {
      syncTimer = null;
      if (pendingUpdate) {
        const u = pendingUpdate;
        pendingUpdate = null;
        await executeProgressSave(u.uid, u.courseId, u.lessonId, u.position, u.duration);
      }
    }, 10000);
  }
}

export const queueProgressSave = queueProgressUpdate;

export async function getVideoToken(
  courseId: string,
  lessonId: string
): Promise<{ hlsUrl: string; expiresAt: number }> {
  return { hlsUrl: '', expiresAt: 0 };
}

/**
 * 2. Save Position directly + trigger Server-Authoritative Completion when 90% reached
 */
export async function executeProgressSave(
  uid: string | null | undefined,
  courseId: string,
  lessonId: string,
  positionSec: number,
  durationSec: number
): Promise<void> {
  if (!uid || !courseId || !lessonId || durationSec <= 0 || !firebaseAuth.currentUser) return;

  try {
    const progressId = `${uid}_${courseId}`;
    const progressRef = doc(firebaseFirestore, 'progress', progressId);

    // Save position directly to satisfy Part 4 Firestore rules
    await setDoc(
      progressRef,
      {
        uid,
        courseId,
        lastLessonId: lessonId,
        lastPosition: Math.round(positionSec),
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    // If 90% watched and not yet submitted to Cloud Function this session, invoke markLessonComplete
    const isNinetyPercent = positionSec / durationSec >= 0.9;
    const sessionKey = `${courseId}_${lessonId}`;

    if (isNinetyPercent && !markedCompleteInSession.has(sessionKey)) {
      await callMarkLessonComplete(courseId, lessonId, positionSec);
    }
  } catch (err) {
    // Graceful fallback
  }
}

/**
 * 3. Fetch Course Progress
 */
export async function getCourseProgress(
  uid: string | null | undefined,
  courseId: string
): Promise<CourseProgressData | null> {
  if (!uid || !courseId || !firebaseAuth.currentUser) return null;

  try {
    const progressId = `${uid}_${courseId}`;
    const snap = await getDoc(doc(firebaseFirestore, 'progress', progressId));
    if (snap.exists()) {
      const data = snap.data();
      return {
        uid: data.uid,
        courseId: data.courseId,
        lastLessonId: data.lastLessonId || '',
        lastPosition: data.lastPosition || 0,
        completedLessons: data.completedLessons || [],
        lessons: data.lessons || {},
        percentComplete: data.percentComplete || data.percentage || 0,
        updatedAt: data.updatedAt,
      };
    }
  } catch (err) {
    // Return null quietly if not yet saved
  }

  return null;
}

/**
 * 4. Subscribe to Real-Time Progress for User
 */
export function subscribeToUserProgress(
  uid: string | null | undefined,
  onUpdate: (progressList: CourseProgressData[]) => void
): () => void {
  if (!uid) {
    onUpdate([]);
    return () => {};
  }
  const colRef = collection(firebaseFirestore, 'progress');
  const q = query(colRef, where('uid', '==', uid));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => {
        const data = d.data();
        return {
          uid: data.uid,
          courseId: data.courseId,
          lastLessonId: data.lastLessonId || '',
          lastPosition: data.lastPosition || 0,
          completedLessons: data.completedLessons || [],
          lessons: data.lessons || {},
          percentComplete: data.percentComplete || data.percentage || 0,
          updatedAt: data.updatedAt,
        } as CourseProgressData;
      });
      onUpdate(list);
    },
    (err) => {
      console.warn('[videoService] subscribeToUserProgress error:', err.message);
      onUpdate([]);
    }
  );
}

