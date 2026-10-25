import * as admin from 'firebase-admin';

export interface GetQuizQuestionsRequest {
  quizId: string;
}

export interface SanitizedQuestion {
  id: string;
  question: string;
  options: string[];
  marks: number;
  order: number;
}

export interface GetQuizQuestionsResponse {
  quizId: string;
  title: string;
  timeLimitMinutes: number;
  passingPercentage: number;
  questionCount: number;
  questions: SanitizedQuestion[];
  attemptNumber: number;
  startedAt: number;
}

export async function getQuizQuestionsHandler(
  data: GetQuizQuestionsRequest,
  callerUid: string | null,
  db: admin.firestore.Firestore = admin.firestore()
): Promise<GetQuizQuestionsResponse> {
  if (!callerUid) {
    throw new Error('Unauthenticated: Authentication required to access quizzes.');
  }

  const { quizId } = data;
  if (!quizId) {
    throw new Error('Invalid-argument: quizId is required.');
  }

  // 1. Verify User is not blocked
  const userDoc = await db.collection('users').doc(callerUid).get();
  if (userDoc.exists && userDoc.data()?.isBlocked === true) {
    throw new Error('Permission-denied: Your account is blocked from taking quizzes.');
  }

  // 2. Fetch Quiz Metadata
  const quizDoc = await db.collection('quizzes').doc(quizId).get();
  if (!quizDoc.exists) {
    throw new Error('Not-found: Quiz does not exist.');
  }

  const quizData = quizDoc.data()!;
  const courseId = quizData.courseId;
  const timeLimitMinutes = Number(quizData.timeLimitMinutes || quizData.durationMinutes || 15);
  const passingPercentage = Number(quizData.passingPercentage || 60);

  // 3. Verify Active Enrollment if course is locked
  if (courseId && courseId !== 'free_for_all' && courseId !== 'free') {
    const enrollmentDoc = await db.collection('enrollments').doc(`${callerUid}_${courseId}`).get();
    const isEnrolled = enrollmentDoc.exists && (enrollmentDoc.data()?.status === 'active' || enrollmentDoc.data()?.active === true);

    if (!isEnrolled) {
      // Admin bypass check
      const adminDoc = await db.collection('admins').doc(callerUid).get();
      if (!adminDoc.exists) {
        throw new Error('Permission-denied: Active course enrollment is required to take this quiz.');
      }
    }
  }

  // 4. Fetch all questions from private subcollection without orderBy (prevents dropped docs)
  const questionsSnap = await db
    .collection('quizzes')
    .doc(quizId)
    .collection('questions')
    .get();

  const rawQuestions: SanitizedQuestion[] = [];
  questionsSnap.forEach((doc) => {
    const qData = doc.data();
    rawQuestions.push({
      id: doc.id,
      question: qData.question || qData.questionText || '',
      options: Array.isArray(qData.options) ? qData.options : [],
      marks: Number(qData.marks || 1),
      order: Number(qData.order || 0),
    });
  });

  // Sort questions in memory by order
  rawQuestions.sort((a, b) => a.order - b.order);

  // 5. Track or create Attempt in quizAttempts/{uid_quizId}
  const attemptRef = db.collection('quizAttempts').doc(`${callerUid}_${quizId}`);
  const existingAttempt = await attemptRef.get();
  let attemptNumber = 1;

  if (existingAttempt.exists) {
    const prev = existingAttempt.data();
    attemptNumber = (prev?.attemptNumber || 1) + 1;
  }

  const startedAt = Date.now();
  await attemptRef.set({
    uid: callerUid,
    quizId,
    courseId: courseId || '',
    attemptNumber,
    startedAt: admin.firestore.FieldValue.serverTimestamp(),
    startedAtMs: startedAt,
    timeLimitMinutes,
    completed: false,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return {
    quizId,
    title: quizData.title || 'Course Quiz',
    timeLimitMinutes,
    passingPercentage,
    questionCount: rawQuestions.length,
    questions: rawQuestions,
    attemptNumber,
    startedAt,
  };
}
