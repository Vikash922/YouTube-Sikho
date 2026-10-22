import {
  firebaseFirestore,
  firebaseFunctions,
  doc,
  getDoc,
  setDoc,
  httpsCallable,
} from './firebase';

export interface VideoTokenResult {
  hlsUrl: string;
  expiresAt: number;
}

export interface LessonProgress {
  position: number; // in seconds
  duration: number; // in seconds
  completed: boolean;
  updatedAt?: any;
}

export interface CourseProgressData {
  uid: string;
  courseId: string;
  lastLessonId: string;
  lastPosition: number;
  completedLessons: string[];
  lessons: Record<string, LessonProgress>;
  percentComplete: number;
  updatedAt?: any;
}

/**
 * Demo fallback HLS stream (for testing & offline preview)
 */
const DEMO_HLS_STREAM =
  'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8';

/**
 * 1. Request Short-Lived Signed HLS URL from Cloud Function
 */
export async function getVideoToken(
  courseId: string,
  lessonId: string
): Promise<VideoTokenResult> {
  try {
    const getVideoTokenCallable = httpsCallable<
      { courseId: string; lessonId: string },
      VideoTokenResult
    >(firebaseFunctions, 'getVideoToken');

    const result = await getVideoTokenCallable({ courseId, lessonId });
    return result.data;
  } catch (err: any) {
    console.warn('[videoService] getVideoToken Cloud Function unavailable, using fallback stream:', err);
    // Return sample HLS stream with 1-hour expiry for offline/test environments
    return {
      hlsUrl: DEMO_HLS_STREAM,
      expiresAt: Math.floor(Date.now() / 1000) + 3600,
    };
  }
}

/**
 * 2. Save Progress to Firestore /progress/{uid}_{courseId} (Debounced)
 */
let saveProgressTimeout: any = null;

export function queueProgressSave(
  uid: string | null | undefined,
  courseId: string,
  lessonId: string,
  positionSec: number,
  durationSec: number
): void {
  if (!uid || !courseId || !lessonId || durationSec <= 0) return;

  if (saveProgressTimeout) {
    clearTimeout(saveProgressTimeout);
  }

  // Debounce saving every 10 seconds or on pause
  saveProgressTimeout = setTimeout(() => {
    executeProgressSave(uid, courseId, lessonId, positionSec, durationSec);
  }, 10000);
}

export async function executeProgressSave(
  uid: string | null | undefined,
  courseId: string,
  lessonId: string,
  positionSec: number,
  durationSec: number
): Promise<void> {
  if (!uid || !courseId || !lessonId || durationSec <= 0) return;

  try {
    const progressId = `${uid}_${courseId}`;
    const progressRef = doc(firebaseFirestore, 'progress', progressId);

    const isComplete = positionSec / durationSec >= 0.9;
    const snap = await getDoc(progressRef);

    let existingData: any = {};
    let completedList: string[] = [];

    if (snap.exists()) {
      existingData = snap.data();
      completedList = existingData.completedLessons || [];
    }

    if (isComplete && !completedList.includes(lessonId)) {
      completedList.push(lessonId);
    }

    const updatedLessons = {
      ...(existingData.lessons || {}),
      [lessonId]: {
        position: Math.round(positionSec),
        duration: Math.round(durationSec),
        completed: isComplete,
        updatedAt: new Date().toISOString(),
      },
    };

    await setDoc(
      progressRef,
      {
        uid,
        courseId,
        lastLessonId: lessonId,
        lastPosition: Math.round(positionSec),
        completedLessons: completedList,
        lessons: updatedLessons,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('[videoService] Failed to save progress to Firestore:', err);
  }
}

/**
 * 3. Fetch Course Progress
 */
export async function getCourseProgress(
  uid: string | null | undefined,
  courseId: string
): Promise<CourseProgressData | null> {
  if (!uid || !courseId) return null;

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
        percentComplete: data.percentComplete || 0,
        updatedAt: data.updatedAt,
      };
    }
  } catch (err) {
    console.warn('[videoService] getCourseProgress error:', err);
  }

  return null;
}
