import * as admin from 'firebase-admin';
import { HttpsError } from 'firebase-functions/v2/https';

export interface SubmitQuizPayload {
  attemptId: string;
  quizId?: string; // optional for backward compatibility
  answers: Record<string, number>; // { [questionId]: selectedOptionIndex }
  timeTakenSeconds?: number;
}

export interface QuestionBreakdown {
  questionId: string;
  question: string;
  options: string[];
  selectedOptionIndex: number | null;
  status: 'correct' | 'wrong' | 'unanswered';
  marks: number;
  earnedMarks: number;
  correctAnswerIndex?: number;
  explanation?: string;
}

export interface SubmitQuizResponse {
  success: boolean;
  resultId: string;
  attemptId: string;
  attemptNumber: number;
  score: number;
  maxScore: number;
  percentage: number;
  passingPercentage: number;
  passed: boolean;
  correctCount: number;
  wrongCount: number;
  unansweredCount: number;
  timeTakenSeconds: number;
  isLate: boolean;
  breakdown: QuestionBreakdown[];
  answersRevealed: boolean;
}

export async function submitQuizHandler(
  data: SubmitQuizPayload,
  callerUid: string | null,
  db: admin.firestore.Firestore = admin.firestore()
): Promise<SubmitQuizResponse> {
  if (!callerUid) {
    throw new HttpsError('unauthenticated', 'Authentication required to submit quiz.');
  }

  const { attemptId, quizId: providedQuizId, answers = {} } = data || {};
  if (!attemptId && !providedQuizId) {
    throw new HttpsError('invalid-argument', 'Attempt ID or Quiz ID is required.');
  }

  // 1. Resolve Attempt Document
  // attemptId is either "{uid}_{quizId}_{n}" or doc ID in quizAttempts
  let attemptDoc: admin.firestore.DocumentSnapshot | null = null;
  let attemptData: any = null;

  if (attemptId) {
    // Try finding by attemptId query first
    const attemptQuery = await db.collection('quizAttempts').where('attemptId', '==', attemptId).limit(1).get();
    if (!attemptQuery.empty) {
      attemptDoc = attemptQuery.docs[0];
      attemptData = attemptDoc.data();
    }
  }

  if (!attemptDoc) {
    // Fallback: Check doc by uid_quizId
    const fallbackQuizId = providedQuizId || (attemptId ? attemptId.split('_')[1] : null);
    if (fallbackQuizId) {
      const fallbackRef = db.collection('quizAttempts').doc(`${callerUid}_${fallbackQuizId}`);
      const fallbackSnap = await fallbackRef.get();
      if (fallbackSnap.exists) {
        attemptDoc = fallbackSnap;
        attemptData = fallbackSnap.data();
      }
    }
  }

  if (!attemptDoc || !attemptData) {
    throw new HttpsError('not-found', 'Quiz attempt session not found. Please start the quiz again.');
  }

  // Verify ownership
  if (attemptData.uid !== callerUid) {
    throw new HttpsError('permission-denied', 'You do not own this quiz attempt.');
  }

  const quizId = attemptData.quizId || providedQuizId;
  const attemptNumber = attemptData.attemptNumber || 1;
  const canonicalAttemptId = attemptData.attemptId || `${callerUid}_${quizId}_${attemptNumber}`;
  const resultDocId = `${callerUid}_${quizId}_${attemptNumber}`;

  // 2. Idempotency Check: if already submitted, return the existing result
  if (attemptData.status === 'completed' || attemptData.status === 'submitted') {
    const existingResultSnap = await db.collection('quizResults').doc(resultDocId).get();
    if (existingResultSnap.exists) {
      const resData = existingResultSnap.data()!;
      return {
        success: true,
        resultId: resultDocId,
        attemptId: canonicalAttemptId,
        attemptNumber,
        score: resData.score,
        maxScore: resData.totalMarks || resData.maxScore,
        percentage: resData.percentage,
        passingPercentage: resData.passingPercentage,
        passed: resData.passed,
        correctCount: resData.correctCount,
        wrongCount: resData.wrongCount,
        unansweredCount: resData.unansweredCount || resData.unattemptedCount || 0,
        timeTakenSeconds: resData.timeTakenSeconds,
        isLate: resData.isLate || false,
        breakdown: resData.breakdown || [],
        answersRevealed: resData.answersRevealed || false,
      };
    }
  }

  // 3. User block check
  const userDoc = await db.collection('users').doc(callerUid).get();
  if (userDoc.exists && userDoc.data()?.isBlocked === true) {
    throw new HttpsError('permission-denied', 'Your account is blocked from submitting quizzes.');
  }

  // 4. Fetch Quiz Master Document
  const quizDoc = await db.collection('quizzes').doc(quizId).get();
  if (!quizDoc.exists) {
    throw new HttpsError('not-found', 'The associated quiz was not found.');
  }

  const quizData = quizDoc.data()!;
  const courseId = quizData.courseId || '';
  const timeLimitMinutes = Number(quizData.timeLimitMinutes || quizData.durationMinutes || 15);
  const passingPercentage = Number(quizData.passingPercentage || 60);
  const allowRetries = quizData.allowRetries !== false;
  const maxAttempts = Number(quizData.maxAttempts || 0);
  const negativeMarkingEnabled = quizData.negativeMarkingEnabled ?? (quizData.negativeMarkingRate > 0);
  const negativeMarkingRate = negativeMarkingEnabled ? Number(quizData.negativeMarkingRate || 0.25) : 0;
  const showAnswersAfterSubmit = quizData.showAnswersAfterSubmit === true;

  // 5. Server-Authoritative Time Check
  const nowMs = Date.now();
  const startedAtMs = attemptData.startedAtMs || (nowMs - 60000);
  const timeTakenSeconds = Math.max(1, Math.round((nowMs - startedAtMs) / 1000));

  // Small grace period of 15 seconds for network latency
  const maxAllowedSeconds = timeLimitMinutes * 60 + 15;
  const isLate = timeTakenSeconds > maxAllowedSeconds;

  // 6. Fetch Question Bank
  const questionsSnap = await db
    .collection('quizzes')
    .doc(quizId)
    .collection('questions')
    .get();

  if (questionsSnap.empty) {
    throw new HttpsError('failed-precondition', 'Quiz has no questions configured.');
  }

  const questionsList: any[] = [];
  questionsSnap.forEach((doc) => {
    questionsList.push({ id: doc.id, ...doc.data() });
  });

  // Sort in memory by order
  questionsList.sort((a, b) => Number(a.order || 0) - Number(b.order || 0));

  // 7. Determine if Answer Key can be revealed
  // Rule: ONLY if showAnswersAfterSubmit is true AND (no retries OR final attempt reached)
  const isFinalAttempt = !allowRetries || (maxAttempts > 0 && attemptNumber >= maxAttempts);
  const canRevealAnswerKey = showAnswersAfterSubmit && isFinalAttempt;

  let correctCount = 0;
  let wrongCount = 0;
  let unansweredCount = 0;
  let earnedScore = 0;
  let maxScore = 0;

  const breakdown: QuestionBreakdown[] = [];

  for (const q of questionsList) {
    const qMarks = Number(q.marks || 1);
    maxScore += qMarks;

    const qOptions = Array.isArray(q.options) ? q.options : [];
    const correctIdx = Number(q.correctAnswerIndex !== undefined ? q.correctAnswerIndex : q.correctOptionIndex);

    // Validate client submitted answer
    let selectedOption: number | null = null;
    const rawVal = answers[q.id];
    if (typeof rawVal === 'number' && rawVal >= 0 && rawVal < qOptions.length && Number.isInteger(rawVal)) {
      selectedOption = rawVal;
    }

    let status: 'correct' | 'wrong' | 'unanswered' = 'unanswered';
    let qEarned = 0;

    if (selectedOption === null) {
      unansweredCount++;
      status = 'unanswered';
    } else if (selectedOption === correctIdx) {
      correctCount++;
      earnedScore += qMarks;
      qEarned = qMarks;
      status = 'correct';
    } else {
      wrongCount++;
      const penalty = negativeMarkingRate * qMarks;
      earnedScore -= penalty;
      qEarned = -penalty;
      status = 'wrong';
    }

    const item: QuestionBreakdown = {
      questionId: q.id,
      question: q.question || q.questionText || '',
      options: qOptions,
      selectedOptionIndex: selectedOption,
      status,
      marks: qMarks,
      earnedMarks: qEarned,
    };

    // Strict Answer-Key Protection:
    // Only disclose correctAnswerIndex and explanation if permitted
    if (canRevealAnswerKey) {
      item.correctAnswerIndex = correctIdx;
      item.explanation = q.explanation || '';
    }

    breakdown.push(item);
  }

  // Bounds checks
  const finalScore = Math.max(0, Math.round(earnedScore * 100) / 100);
  const percentage = maxScore > 0 ? Math.round((finalScore / maxScore) * 100) : 0;
  const passed = percentage >= passingPercentage && !isLate;

  // 8. Save Result Document: quizResults/{uid}_{quizId}_{attemptNumber}
  const resultPayload = {
    resultId: resultDocId,
    attemptId: canonicalAttemptId,
    uid: callerUid,
    quizId,
    courseId,
    score: finalScore,
    maxScore,
    totalMarks: maxScore,
    percentage,
    passingPercentage,
    passed,
    correctCount,
    wrongCount,
    unansweredCount,
    timeTakenSeconds,
    attemptNumber,
    isLate,
    breakdown,
    answersRevealed: canRevealAnswerKey,
    submittedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  const batch = db.batch();
  batch.set(db.collection('quizResults').doc(resultDocId), resultPayload);
  // Also keep backward-compatible pointer on quizResults/{uid}_{quizId}
  batch.set(db.collection('quizResults').doc(`${callerUid}_${quizId}`), resultPayload);

  // 9. Update Best-Attempt Pointer: quizBest/{uid}_{quizId}
  const bestRef = db.collection('quizBest').doc(`${callerUid}_${quizId}`);
  const bestSnap = await bestRef.get();
  const shouldUpdateBest = !bestSnap.exists || (bestSnap.data()?.score || 0) < finalScore;

  if (shouldUpdateBest) {
    batch.set(bestRef, {
      uid: callerUid,
      quizId,
      courseId,
      bestResultId: resultDocId,
      bestAttemptNumber: attemptNumber,
      score: finalScore,
      maxScore,
      percentage,
      passed,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  // 10. Mark Attempt Completed in quizAttempts
  batch.update(attemptDoc.ref, {
    status: 'completed',
    resultId: resultDocId,
    score: finalScore,
    percentage,
    passed,
    completedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  await batch.commit();

  return {
    success: true,
    resultId: resultDocId,
    attemptId: canonicalAttemptId,
    attemptNumber,
    score: finalScore,
    maxScore,
    percentage,
    passingPercentage,
    passed,
    correctCount,
    wrongCount,
    unansweredCount,
    timeTakenSeconds,
    isLate,
    breakdown,
    answersRevealed: canRevealAnswerKey,
  };
}
