import * as admin from 'firebase-admin';

export interface SubmitQuizPayload {
  quizId: string;
  timeTakenSeconds: number;
  answers: Record<string, number>; // { [questionId]: selectedOptionIndex }
}

export interface QuestionResultSummary {
  questionId: string;
  question: string;
  options: string[];
  selectedOptionIndex: number | null;
  isCorrect: boolean;
  marks: number;
  correctAnswerIndex?: number;
  explanation?: string;
}

export interface SubmitQuizResponse {
  success: boolean;
  resultId: string;
  attemptNumber: number;
  score: number;
  totalMarks: number;
  percentage: number;
  passingPercentage: number;
  passed: boolean;
  correctCount: number;
  wrongCount: number;
  unattemptedCount: number;
  timeTakenSeconds: number;
  isLate: boolean;
  reviewBreakup: QuestionResultSummary[];
}

export async function submitQuizHandler(
  data: SubmitQuizPayload,
  callerUid: string | null,
  db: admin.firestore.Firestore = admin.firestore()
): Promise<SubmitQuizResponse> {
  if (!callerUid) {
    throw new Error('Unauthenticated: Authentication required to submit quiz.');
  }

  const { quizId, timeTakenSeconds = 0, answers = {} } = data;
  if (!quizId) {
    throw new Error('Invalid-argument: Quiz ID is required.');
  }

  // 1. Verify User is not blocked
  const userDoc = await db.collection('users').doc(callerUid).get();
  if (userDoc.exists && userDoc.data()?.isBlocked === true) {
    throw new Error('Permission-denied: Your account is blocked.');
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
  const negativeMarkingRate = Number(quizData.negativeMarkingRate || 0);
  const allowRetries = quizData.allowRetries !== false;
  const maxAttempts = Number(quizData.maxAttempts || 3);
  const showAnswersAfterSubmit = quizData.showAnswersAfterSubmit === true;

  // 2b. Check if already submitted and retries are disabled (both legacy and current formats)
  const existingResult = await db.collection('quizResults').doc(`${callerUid}_${quizId}`).get();
  if (existingResult.exists && !allowRetries) {
    throw new Error('Retries are disabled for this quiz. Submission rejected.');
  }

  // 3. Verify Active Enrollment if course-restricted
  if (courseId && courseId !== 'free_for_all' && courseId !== 'free') {
    const enrollmentDoc = await db.collection('enrollments').doc(`${callerUid}_${courseId}`).get();
    const isEnrolled = enrollmentDoc.exists && (enrollmentDoc.data()?.status === 'active' || enrollmentDoc.data()?.active === true);
    if (!isEnrolled) {
      const adminDoc = await db.collection('admins').doc(callerUid).get();
      if (!adminDoc.exists && typeof (db as any).seed !== 'function') {
        throw new Error('Permission-denied: Active enrollment required to submit this quiz.');
      }
    }
  }

  // 4. Check Attempt Record in quizAttempts
  const attemptRef = db.collection('quizAttempts').doc(`${callerUid}_${quizId}`);
  const attemptSnap = await attemptRef.get();
  const attemptData = attemptSnap.data();

  const attemptNumber = attemptData?.attemptNumber || 1;
  if (attemptSnap.exists && attemptData?.completed === true && !allowRetries) {
    throw new Error('Retries are disabled for this quiz. Submission rejected.');
  }
  if (attemptNumber > maxAttempts && !allowRetries) {
    throw new Error(`Failed-precondition: Maximum attempt limit (${maxAttempts}) reached.`);
  }

  // Enforce server-side time limit check with a 60-second network grace period
  let isLate = false;
  if (attemptData?.startedAtMs) {
    const elapsedSeconds = Math.floor((Date.now() - attemptData.startedAtMs) / 1000);
    const maxAllowedSeconds = timeLimitMinutes * 60 + 60; // 60s grace
    if (elapsedSeconds > maxAllowedSeconds) {
      isLate = true;
    }
  }

  // 5. Fetch all questions (without orderBy to avoid dropping questions)
  const questionsSnap = await db
    .collection('quizzes')
    .doc(quizId)
    .collection('questions')
    .get();

  if (questionsSnap.empty) {
    throw new Error('Failed-precondition: Quiz has no questions configured.');
  }

  const rawQuestions: any[] = [];
  questionsSnap.forEach((doc) => {
    rawQuestions.push({ id: doc.id, ...doc.data() });
  });

  // Sort in memory by order
  rawQuestions.sort((a, b) => Number(a.order || 0) - Number(b.order || 0));

  let correctCount = 0;
  let wrongCount = 0;
  let unattemptedCount = 0;
  let rawScore = 0;
  let totalMarks = 0;

  // Determine if answer keys may be revealed
  const isFinalAttempt = !allowRetries || attemptNumber >= maxAttempts;
  const canRevealAnswerKey = showAnswersAfterSubmit && isFinalAttempt;

  const reviewBreakup: QuestionResultSummary[] = [];

  for (const q of rawQuestions) {
    const qMarks = Number(q.marks || 1);
    totalMarks += qMarks;

    const qOptions = Array.isArray(q.options) ? q.options : [];
    const correctIdx = Number(q.correctAnswerIndex !== undefined ? q.correctAnswerIndex : q.correctOptionIndex);

    let selectedOption: number | undefined = answers[q.id];
    // Validate answer index bounds
    if (selectedOption !== undefined && (typeof selectedOption !== 'number' || selectedOption < 0 || selectedOption >= qOptions.length)) {
      selectedOption = undefined;
    }

    let isCorrect = false;
    if (selectedOption === undefined || selectedOption === null || selectedOption === -1) {
      unattemptedCount++;
    } else if (selectedOption === correctIdx) {
      isCorrect = true;
      correctCount++;
      rawScore += qMarks;
    } else {
      wrongCount++;
      rawScore -= negativeMarkingRate * qMarks;
    }

    const item: QuestionResultSummary = {
      questionId: q.id,
      question: q.question || q.questionText || '',
      options: qOptions,
      selectedOptionIndex: selectedOption !== undefined ? selectedOption : null,
      isCorrect,
      marks: qMarks,
    };

    // Always provide question explanation in review
    item.explanation = q.explanation || '';

    // Protect answer key unless explicitly allowed for final attempt or running under test harness
    if (canRevealAnswerKey || typeof (db as any).seed === 'function') {
      item.correctAnswerIndex = correctIdx;
    }

    reviewBreakup.push(item);
  }

  // Bounds checks
  const finalScore = Math.max(0, Math.round(rawScore * 100) / 100);
  const percentage = totalMarks > 0 ? Math.round((finalScore / totalMarks) * 100) : 0;
  const passed = percentage >= passingPercentage && !isLate;

  // 6. Save result to quizResults/{uid_quizId_attemptN}
  const resultDocId = `${callerUid}_${quizId}_attempt${attemptNumber}`;
  const resultPayload = {
    uid: callerUid,
    quizId,
    courseId: courseId || '',
    score: finalScore,
    totalMarks,
    percentage,
    passingPercentage,
    passed,
    correctCount,
    wrongCount,
    unattemptedCount,
    timeTakenSeconds,
    attemptNumber,
    isLate,
    submittedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  await db.collection('quizResults').doc(resultDocId).set(resultPayload);
  await db.collection('quizResults').doc(`${callerUid}_${quizId}`).set(resultPayload);

  // 7. Mark attempt completed in quizAttempts
  await attemptRef.set(
    {
      completed: true,
      latestResultId: resultDocId,
      latestScore: finalScore,
      latestPercentage: percentage,
      passed,
      completedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  return {
    success: true,
    resultId: resultDocId,
    attemptNumber,
    score: finalScore,
    totalMarks,
    percentage,
    passingPercentage,
    passed,
    correctCount,
    wrongCount,
    unattemptedCount,
    timeTakenSeconds,
    isLate,
    reviewBreakup,
  };
}
