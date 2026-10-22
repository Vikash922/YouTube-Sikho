import * as admin from 'firebase-admin';

export interface SubmitQuizPayload {
  quizId: string;
  timeTakenSeconds: number;
  answers: Record<string, number>; // { [questionId]: selectedOptionIndex }
}

export async function submitQuizHandler(
  data: SubmitQuizPayload,
  callerUid: string | null,
  db: any = admin.firestore()
) {
  if (!callerUid) {
    throw new Error('Authentication required.');
  }

  const { quizId, timeTakenSeconds, answers = {} } = data;
  if (!quizId) {
    throw new Error('Quiz ID is required.');
  }

  // 1. Fetch Quiz Metadata
  const quizDoc = await db.collection('quizzes').doc(quizId).get();
  if (!quizDoc.exists) {
    throw new Error('Quiz not found.');
  }

  const quizData = quizDoc.data()!;
  const passMarks = quizData.passMarks || 0;
  const negativeMarkingRate = quizData.negativeMarkingRate || 0; // e.g. 0.25 or 1
  const allowRetries = quizData.allowRetries !== false;

  // 2. Check if already submitted and retries are disabled
  const resultDocId = `${callerUid}_${quizId}`;
  const existingResult = await db.collection('quizResults').doc(resultDocId).get();
  if (existingResult.exists && !allowRetries) {
    throw new Error('Retries are disabled for this quiz. Submission rejected.');
  }

  // 3. Fetch Secret Questions & Correct Answers from Server Subcollection
  const questionsSnap = await db
    .collection('quizzes')
    .doc(quizId)
    .collection('questions')
    .orderBy('order', 'asc')
    .get();

  let totalQuestions = questionsSnap.size;
  let correctCount = 0;
  let wrongCount = 0;
  let unattemptedCount = 0;
  let rawScore = 0;
  let totalMarks = 0;

  const reviewBreakup: Array<{
    questionId: string;
    questionText: string;
    options: string[];
    selectedOptionIndex: number | null;
    correctOptionIndex: number;
    isCorrect: boolean;
    explanation: string;
    marks: number;
  }> = [];

  questionsSnap.forEach((doc: any) => {
    const qData = doc.data();
    const qId = doc.id;
    const qMarks = qData.marks || 1;
    totalMarks += qMarks;

    const selectedOption = answers[qId] !== undefined ? answers[qId] : null;
    const correctOption = qData.correctOptionIndex;

    let isCorrect = false;
    if (selectedOption === null || selectedOption === -1) {
      unattemptedCount++;
    } else if (selectedOption === correctOption) {
      isCorrect = true;
      correctCount++;
      rawScore += qMarks;
    } else {
      wrongCount++;
      rawScore -= negativeMarkingRate * qMarks;
    }

    reviewBreakup.push({
      questionId: qId,
      questionText: qData.questionText || '',
      options: qData.options || [],
      selectedOptionIndex: selectedOption,
      correctOptionIndex: correctOption,
      isCorrect,
      explanation: qData.explanation || '',
      marks: qMarks,
    });
  });

  // Ensure score doesn't fall below zero
  const finalScore = Math.max(0, Math.round(rawScore * 100) / 100);
  const accuracy = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
  const passed = finalScore >= passMarks;

  // 4. Save to /quizResults/{uid_quizId}
  const resultRecord = {
    id: resultDocId,
    uid: callerUid,
    quizId,
    quizTitle: quizData.title || 'Course Quiz',
    courseId: quizData.courseId || null,
    score: finalScore,
    totalMarks,
    passMarks,
    accuracy,
    timeTakenSeconds: timeTakenSeconds || 0,
    passed,
    correctCount,
    wrongCount,
    unattemptedCount,
    totalQuestions,
    submittedAt: admin.firestore.FieldValue.serverTimestamp(),
    reviewBreakup,
  };

  await db.collection('quizResults').doc(resultDocId).set(resultRecord);

  // 5. Return Results & Explanations safely AFTER evaluation
  return {
    success: true,
    resultId: resultDocId,
    score: finalScore,
    totalMarks,
    accuracy,
    passed,
    correctCount,
    wrongCount,
    unattemptedCount,
    reviewBreakup,
  };
}
