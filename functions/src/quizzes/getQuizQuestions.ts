import * as admin from 'firebase-admin';
import { HttpsError } from 'firebase-functions/v2/https';

export interface GetQuizQuestionsRequest {
  quizId: string;
}

export interface SanitizedQuestion {
  id: string;
  question: string;
  imageUrl?: string | null;
  options: string[];
  marks: number;
  order: number;
}

export interface GetQuizQuestionsResponse {
  attemptId: string;
  quizId: string;
  title: string;
  timeLimitMinutes: number;
  passingPercentage: number;
  questionCount: number;
  questions: SanitizedQuestion[];
  attemptNumber: number;
  startedAt: number;
  expiresAt: number;
  serverNow: string;
}

export async function getQuizQuestionsHandler(
  data: GetQuizQuestionsRequest,
  callerUid: string | null,
  db: admin.firestore.Firestore = admin.firestore()
): Promise<GetQuizQuestionsResponse> {
  if (!callerUid) {
    throw new HttpsError('unauthenticated', 'Authentication required to access quizzes.');
  }

  const { quizId } = data || {};
  if (!quizId) {
    throw new HttpsError('invalid-argument', 'Quiz ID is required.');
  }

  // 1. Verify User is not blocked
  const userDoc = await db.collection('users').doc(callerUid).get();
  if (userDoc.exists && userDoc.data()?.isBlocked === true) {
    throw new HttpsError('permission-denied', 'Your account is blocked from taking quizzes.');
  }

  // 2. Fetch Quiz Metadata
  const quizDoc = await db.collection('quizzes').doc(quizId).get();
  if (!quizDoc.exists) {
    throw new HttpsError('not-found', 'Quiz does not exist.');
  }

  const quizData = quizDoc.data()!;
  if (quizData.isPublished === false) {
    throw new HttpsError('failed-precondition', 'This quiz is not currently published.');
  }

  const courseId = quizData.courseId;
  const timeLimitMinutes = Number(quizData.timeLimitMinutes || quizData.durationMinutes || 15);
  const passingPercentage = Number(quizData.passingPercentage || 60);
  const allowRetries = quizData.allowRetries !== false;
  const maxAttempts = Number(quizData.maxAttempts || 0);

  // 3. Verify Active Enrollment if course is locked
  if (courseId && courseId !== 'free_for_all' && courseId !== 'free') {
    const enrollmentDoc = await db.collection('enrollments').doc(`${callerUid}_${courseId}`).get();
    const isEnrolled = enrollmentDoc.exists && (enrollmentDoc.data()?.status === 'active' || enrollmentDoc.data()?.active === true);

    if (!isEnrolled) {
      // Admin bypass check
      const adminDoc = await db.collection('admins').doc(callerUid).get();
      if (!adminDoc.exists) {
        throw new HttpsError('permission-denied', 'Active course enrollment is required to take this quiz.');
      }
    }
  }

  // 4. Check past completed attempts
  const resultsSnap = await db
    .collection('quizResults')
    .where('uid', '==', callerUid)
    .where('quizId', '==', quizId)
    .get();

  const finishedCount = resultsSnap.size;

  if (!allowRetries && finishedCount >= 1) {
    throw new HttpsError('failed-precondition', 'Retries are disabled for this quiz. You have already completed your attempt.');
  }

  if (maxAttempts > 0 && finishedCount >= maxAttempts) {
    throw new HttpsError('failed-precondition', `Maximum allowed attempts (${maxAttempts}) reached for this quiz.`);
  }

  // 5. Check for an active in_progress attempt that has not expired
  const attemptDocId = `${callerUid}_${quizId}`;
  const attemptRef = db.collection('quizAttempts').doc(attemptDocId);
  const existingAttempt = await attemptRef.get();

  const nowMs = Date.now();
  let attemptNumber = finishedCount + 1;
  let startedAt = nowMs;
  let expiresAt = nowMs + timeLimitMinutes * 60 * 1000;
  let attemptId = `${attemptDocId}_${attemptNumber}`;

  if (existingAttempt.exists) {
    const prev = existingAttempt.data()!;
    if (prev.status === 'in_progress' && prev.expiresAtMs && prev.expiresAtMs > nowMs) {
      // Resume existing active attempt
      attemptNumber = prev.attemptNumber || attemptNumber;
      startedAt = prev.startedAtMs || nowMs;
      expiresAt = prev.expiresAtMs;
      attemptId = prev.attemptId || attemptId;
    } else {
      // Previous attempt was completed or expired, start next attempt
      await attemptRef.set({
        attemptId,
        uid: callerUid,
        quizId,
        courseId: courseId || '',
        attemptNumber,
        status: 'in_progress',
        startedAt: admin.firestore.FieldValue.serverTimestamp(),
        startedAtMs: startedAt,
        expiresAtMs: expiresAt,
        timeLimitMinutes,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  } else {
    // Fresh attempt
    await attemptRef.set({
      attemptId,
      uid: callerUid,
      quizId,
      courseId: courseId || '',
      attemptNumber,
      status: 'in_progress',
      startedAt: admin.firestore.FieldValue.serverTimestamp(),
      startedAtMs: startedAt,
      expiresAtMs: expiresAt,
      timeLimitMinutes,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  // 6. Fetch questions without orderBy to guarantee no questions are dropped
  const questionsSnap = await db
    .collection('quizzes')
    .doc(quizId)
    .collection('questions')
    .get();

  if (questionsSnap.empty) {
    throw new HttpsError('failed-precondition', 'This quiz has no questions configured.');
  }

  const rawQuestions: SanitizedQuestion[] = [];
  questionsSnap.forEach((doc) => {
    const qData = doc.data();
    rawQuestions.push({
      id: doc.id,
      question: qData.question || qData.questionText || '',
      imageUrl: qData.imageUrl || null,
      options: Array.isArray(qData.options) ? qData.options : [],
      marks: Number(qData.marks || 1),
      order: Number(qData.order !== undefined ? qData.order : 0),
    });
  });

  // Sort in memory by order, treats missing order as 0
  rawQuestions.sort((a, b) => a.order - b.order);

  return {
    attemptId,
    quizId,
    title: quizData.title || 'Course Quiz',
    timeLimitMinutes,
    passingPercentage,
    questionCount: rawQuestions.length,
    questions: rawQuestions,
    attemptNumber,
    startedAt,
    expiresAt,
    serverNow: new Date().toISOString(),
  };
}
