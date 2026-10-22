import { doc, getDoc, collection, getDocs, orderBy, query, onSnapshot, where } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { firebaseFirestore, functions } from './firebase';

// In-memory fallback cache for autosaved quiz progress across screen transitions
const localQuizProgressStore: Record<string, string> = {};

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
 * Fetch Questions sanitized for the client (answers omitted)
 */
export async function fetchQuizQuestions(quizId: string): Promise<QuizQuestionClient[]> {
  const qSnap = await getDocs(
    query(collection(firebaseFirestore, 'quizzes', quizId, 'questions'), orderBy('order', 'asc'))
  );

  return qSnap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      questionText: data.questionText || '',
      options: data.options || [],
      marks: data.marks || 1,
      order: data.order || 0,
    };
  });
}

/**
 * Autosave quiz state to prevent loss on app kill or crash
 */
export async function saveLocalQuizProgress(
  quizId: string,
  state: { answers: Record<string, number>; markedForReview: string[]; remainingSeconds: number }
): Promise<void> {
  try {
    localQuizProgressStore[`@quiz_progress_${quizId}`] = JSON.stringify(state);
  } catch (err) {
    console.warn('Autosave error:', err);
  }
}

/**
 * Restore autosaved quiz state
 */
export async function restoreLocalQuizProgress(
  quizId: string
): Promise<{ answers: Record<string, number>; markedForReview: string[]; remainingSeconds: number } | null> {
  try {
    const raw = localQuizProgressStore[`@quiz_progress_${quizId}`];
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
    delete localQuizProgressStore[`@quiz_progress_${quizId}`];
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
