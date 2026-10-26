import * as admin from 'firebase-admin';
import { HttpsError } from 'firebase-functions/v2/https';

export interface MarkLessonCompleteRequest {
  courseId: string;
  lessonId: string;
  watchedSeconds?: number;
}

export interface MarkLessonCompleteResponse {
  success: boolean;
  lessonId: string;
  completedLessons: string[];
  percentage: number;
  isFullyCompleted: boolean;
}

export async function markLessonCompleteHandler(
  data: MarkLessonCompleteRequest,
  callerUid: string | null,
  db: admin.firestore.Firestore = admin.firestore()
): Promise<MarkLessonCompleteResponse> {
  if (!callerUid) {
    throw new HttpsError('unauthenticated', 'Authentication required to update course progress.');
  }

  const { courseId, lessonId, watchedSeconds = 0 } = data || {};
  if (!courseId || !lessonId) {
    throw new HttpsError('invalid-argument', 'courseId and lessonId are required.');
  }

  // 1. Verify Active Enrollment
  const enrollmentSnap = await db.collection('enrollments').doc(`${callerUid}_${courseId}`).get();
  const isEnrolled = enrollmentSnap.exists && (enrollmentSnap.data()?.status === 'active' || enrollmentSnap.data()?.active === true);

  if (!isEnrolled) {
    const adminSnap = await db.collection('admins').doc(callerUid).get();
    if (!adminSnap.exists) {
      throw new HttpsError('permission-denied', 'Active enrollment required to record course completion.');
    }
  }

  // 2. Fetch Course Document
  const courseDoc = await db.collection('courses').doc(courseId).get();
  if (!courseDoc.exists) {
    throw new HttpsError('not-found', 'Course not found.');
  }

  // 3. Locate Lesson in Subcollections or Embedded Syllabus
  let targetLesson: any = null;
  let totalLessonsCount = 0;

  const sectionsSnap = await db.collection('courses').doc(courseId).collection('sections').get();
  if (!sectionsSnap.empty) {
    for (const secDoc of sectionsSnap.docs) {
      const lessonsSnap = await db
        .collection('courses')
        .doc(courseId)
        .collection('sections')
        .doc(secDoc.id)
        .collection('lessons')
        .get();

      totalLessonsCount += lessonsSnap.size;

      for (const lDoc of lessonsSnap.docs) {
        if (lDoc.id === lessonId) {
          targetLesson = { id: lDoc.id, ...lDoc.data() };
        }
      }
    }
  }

  // Fallback to embedded sections if subcollections are not yet populated
  if (!targetLesson && courseDoc.data()?.sections) {
    const embeddedSections = courseDoc.data()?.sections || [];
    for (const sec of embeddedSections) {
      const lessons = sec.lessons || [];
      totalLessonsCount += lessons.length;
      for (const l of lessons) {
        if (l.id === lessonId) {
          targetLesson = l;
        }
      }
    }
  }

  if (!targetLesson) {
    throw new HttpsError('not-found', `Lesson ${lessonId} does not exist in course ${courseId}.`);
  }

  if (totalLessonsCount === 0) {
    totalLessonsCount = courseDoc.data()?.totalLessons || courseDoc.data()?.lessonsCount || 1;
  }

  // 4. Plausibility Verification
  const lessonType = targetLesson.type || 'video';

  if (lessonType === 'video') {
    let durationSec = Number(targetLesson.durationSeconds || 0);
    if (!durationSec && targetLesson.duration) {
      // parse "12:30" or seconds
      if (typeof targetLesson.duration === 'string' && targetLesson.duration.includes(':')) {
        const parts = targetLesson.duration.split(':').map(Number);
        if (parts.length === 2) durationSec = parts[0] * 60 + parts[1];
        else if (parts.length === 3) durationSec = parts[0] * 3600 + parts[1] * 60 + parts[2];
      } else {
        durationSec = Number(targetLesson.duration) || 0;
      }
    }

    if (durationSec > 10) {
      const requiredThreshold = durationSec * 0.9;
      if (watchedSeconds < requiredThreshold) {
        throw new HttpsError(
          'failed-precondition',
          `Cannot mark video complete: watched ${Math.round(watchedSeconds)}s out of required ${Math.round(requiredThreshold)}s (90%).`
        );
      }
    }
  } else if (lessonType === 'quiz') {
    // Verify passing quiz attempt exists
    const quizId = targetLesson.quizId || targetLesson.id;
    const bestQuizSnap = await db.collection('quizBest').doc(`${callerUid}_${quizId}`).get();
    const passed = bestQuizSnap.exists && bestQuizSnap.data()?.passed === true;

    if (!passed) {
      // Check quizResults as fallback
      const resultSnap = await db.collection('quizResults').doc(`${callerUid}_${quizId}`).get();
      const resultPassed = resultSnap.exists && resultSnap.data()?.passed === true;
      if (!resultPassed) {
        throw new HttpsError('failed-precondition', 'Cannot mark quiz lesson complete without passing the required quiz checkpoint.');
      }
    }
  }

  // 5. Atomic Update to progress/{uid}_{courseId} using Admin SDK
  const progressDocId = `${callerUid}_${courseId}`;
  const progressRef = db.collection('progress').doc(progressDocId);
  const progressSnap = await progressRef.get();

  let completedLessons: string[] = [];
  if (progressSnap.exists) {
    completedLessons = progressSnap.data()?.completedLessons || [];
  }

  if (!completedLessons.includes(lessonId)) {
    completedLessons.push(lessonId);
  }

  const percentage = Math.min(100, Math.round((completedLessons.length / totalLessonsCount) * 100));
  const isFullyCompleted = percentage >= 100;

  const progressPayload = {
    uid: callerUid,
    courseId,
    lastLessonId: lessonId,
    completedLessons,
    completedLessonsCount: completedLessons.length,
    totalLessons: totalLessonsCount,
    percentComplete: percentage,
    percentage,
    isCompleted: isFullyCompleted,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  await progressRef.set(progressPayload, { merge: true });

  return {
    success: true,
    lessonId,
    completedLessons,
    percentage,
    isFullyCompleted,
  };
}
