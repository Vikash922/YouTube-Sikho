import { doc, getDoc, collection, query, onSnapshot, where } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { firebaseFirestore, functions, firebaseAuth } from './firebase';

/**
 * Real-time listener for Quizzes belonging to a specific course
 */
export function subscribeToCourseQuizzes(
  courseId: string,
  onUpdate: (quizzes: QuizMetadata[]) => void
): () => void {
  if (!courseId) {
    onUpdate([]);
    return () => {};
  }
  const q = query(
    collection(firebaseFirestore, 'quizzes'),
    where('courseId', '==', courseId)
  );

  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as QuizMetadata));
      onUpdate(list);
    },
    (err) => {
      console.warn('[quizService] subscribeToCourseQuizzes error:', err.message);
      onUpdate([]);
    }
  );
}

export interface QuizMetadata {
  id: string;
  title: string;
  courseId: string;
  courseTitle?: string;
  durationMinutes: number;
  passMarks: number;
  totalMarks: number;
  negativeMarkingRate: number;
  allowRetries: boolean;
}

export interface QuizQuestionClient {
  id: string;
  questionText: string;
  options: string[];
  marks: number;
  order: number;
  // Note: correctOptionIndex and explanation are omitted for client integrity!
}

export interface QuizEvaluationResult {
  resultId: string;
  score: number;
  totalMarks: number;
  accuracy: number;
  passed: boolean;
  correctCount: number;
  wrongCount: number;
  unattemptedCount: number;
  reviewBreakup: Array<{
    questionId: string;
    questionText: string;
    options: string[];
    selectedOptionIndex: number | null;
    correctOptionIndex: number;
    isCorrect: boolean;
    explanation: string;
    marks: number;
  }>;
}

/**
 * Fetch Quiz Metadata
 */
export async function fetchQuizMetadata(quizId: string): Promise<QuizMetadata | null> {
  const quizDoc = await getDoc(doc(firebaseFirestore, 'quizzes', quizId));
  if (!quizDoc.exists()) return null;
  return { id: quizDoc.id, ...quizDoc.data() } as QuizMetadata;
}

/**
 * Fetch Questions sanitized for the client via Cloud Function (anti-cheat: answers omitted)
 */
export async function fetchQuizQuestions(quizId: string): Promise<QuizQuestionClient[]> {
  const getQuestionsFn = httpsCallable<{ quizId: string }, any>(functions, 'getQuizQuestions');
  const res = await getQuestionsFn({ quizId });
  const list = res.data?.questions || [];

  return list.map((q: any) => ({
    id: q.id,
    questionText: q.question || q.questionText || '',
    options: q.options || [],
    marks: q.marks || 1,
    order: q.order || 0,
  }));
}

/**
 * Autosave quiz state to AsyncStorage to prevent loss on app kill or crash
 */
export async function saveLocalQuizProgress(
  quizId: string,
  state: { answers: Record<string, number>; markedForReview: string[]; remainingSeconds: number }
): Promise<void> {
  try {
    const uid = firebaseAuth.currentUser?.uid || 'guest';
    await AsyncStorage.setItem(`@quiz_progress_${uid}_${quizId}`, JSON.stringify(state));
  } catch (err) {
    console.warn('Autosave error:', err);
  }
}

/**
 * Restore autosaved quiz state from AsyncStorage
 */
export async function restoreLocalQuizProgress(
  quizId: string
): Promise<{ answers: Record<string, number>; markedForReview: string[]; remainingSeconds: number } | null> {
  try {
    const uid = firebaseAuth.currentUser?.uid || 'guest';
    const raw = await AsyncStorage.getItem(`@quiz_progress_${uid}_${quizId}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Clear autosaved state after successful submission
 */
export async function clearLocalQuizProgress(quizId: string): Promise<void> {
  try {
    const uid = firebaseAuth.currentUser?.uid || 'guest';
    await AsyncStorage.removeItem(`@quiz_progress_${uid}_${quizId}`);
  } catch {}
}

/**
 * Submit Quiz to Server Cloud Function for Evaluation
 */
export async function submitQuizToServer(
  quizId: string,
  answers: Record<string, number>,
  timeTakenSeconds: number
): Promise<QuizEvaluationResult> {
  const submitFn = httpsCallable(functions, 'submitQuiz');
  const res: any = await submitFn({
    quizId,
    answers,
    timeTakenSeconds,
  });

  await clearLocalQuizProgress(quizId);
  return res.data as QuizEvaluationResult;
}

/**
 * Fetch past quiz result
 */
export async function fetchQuizResult(resultId: string): Promise<QuizEvaluationResult | null> {
  const resDoc = await getDoc(doc(firebaseFirestore, 'quizResults', resultId));
  if (!resDoc.exists()) return null;
  return resDoc.data() as QuizEvaluationResult;
}
