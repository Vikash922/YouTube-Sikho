import { doc, getDoc, collection, query, onSnapshot, where } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { firebaseFirestore, functions, firebaseAuth } from './firebase';

export interface QuizMetadata {
  id: string;
  title: string;
  courseId: string;
  courseTitle?: string;
  lessonId?: string;
  timeLimitMinutes: number;
  passingPercentage: number;
  questionCount: number;
  allowRetries: boolean;
  maxAttempts: number;
  negativeMarkingEnabled: boolean;
  negativeMarkingRate: number;
  showAnswersAfterSubmit: boolean;
  isPublished: boolean;
  durationMinutes?: number;
  passMarks?: number;
  totalMarks?: number;
}

export interface QuizQuestionClient {
  id: string;
  question: string;
  questionText: string;
  imageUrl?: string | null;
  options: string[];
  marks: number;
  order: number;
}

export interface StartQuizSessionResponse {
  attemptId: string;
  quizId: string;
  title: string;
  timeLimitMinutes: number;
  passingPercentage: number;
  questionCount: number;
  questions: QuizQuestionClient[];
  attemptNumber: number;
  startedAt: number;
  expiresAt: number;
  serverNow: string;
}

export interface QuestionBreakdownItem {
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

export interface QuizEvaluationResult {
  resultId: string;
  attemptId: string;
  attemptNumber: number;
  score: number;
  maxScore: number;
  totalMarks?: number;
  percentage: number;
  accuracy?: number;
  passingPercentage: number;
  passed: boolean;
  correctCount: number;
  wrongCount: number;
  unansweredCount: number;
  unattemptedCount?: number;
  timeTakenSeconds: number;
  isLate: boolean;
  breakdown: QuestionBreakdownItem[];
  reviewBreakup?: QuestionBreakdownItem[];
  answersRevealed: boolean;
}

export interface QuizAutosaveState {
  attemptId: string;
  answers: Record<string, number>;
  markedForReview: string[];
  currentIndex: number;
}

/**
 * Real-time listener for published course quizzes
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
      const list = snap.docs
        .map((d) => {
          const raw = d.data() as any;
          return {
            id: d.id,
            title: raw.title || 'Untitled Quiz',
            courseId: raw.courseId || courseId,
            courseTitle: raw.courseTitle || '',
            lessonId: raw.lessonId,
            timeLimitMinutes: raw.timeLimitMinutes ?? raw.durationMinutes ?? 15,
            passingPercentage: raw.passingPercentage ?? 60,
            questionCount: raw.questionCount ?? raw.questionsCount ?? 0,
            allowRetries: raw.allowRetries !== false,
            maxAttempts: raw.maxAttempts ?? 0,
            negativeMarkingEnabled: raw.negativeMarkingEnabled ?? (raw.negativeMarkingRate > 0),
            negativeMarkingRate: raw.negativeMarkingRate ?? 0.25,
            showAnswersAfterSubmit: raw.showAnswersAfterSubmit === true,
            isPublished: raw.isPublished !== false,
          } as QuizMetadata;
        })
        .filter((q) => q.isPublished !== false);
      onUpdate(list);
    },
    (err) => {
      console.warn('[quizService] subscribeToCourseQuizzes error:', err.message);
      onUpdate([]);
    }
  );
}

/**
 * Fetch Quiz Metadata
 */
export async function fetchQuizMetadata(quizId: string): Promise<QuizMetadata | null> {
  const quizDoc = await getDoc(doc(firebaseFirestore, 'quizzes', quizId));
  if (!quizDoc.exists()) return null;
  const raw = quizDoc.data() as any;
  return {
    id: quizDoc.id,
    title: raw.title || 'Untitled Quiz',
    courseId: raw.courseId || '',
    courseTitle: raw.courseTitle || '',
    lessonId: raw.lessonId,
    timeLimitMinutes: raw.timeLimitMinutes ?? raw.durationMinutes ?? 15,
    passingPercentage: raw.passingPercentage ?? 60,
    questionCount: raw.questionCount ?? raw.questionsCount ?? 0,
    allowRetries: raw.allowRetries !== false,
    maxAttempts: raw.maxAttempts ?? 0,
    negativeMarkingEnabled: raw.negativeMarkingEnabled ?? (raw.negativeMarkingRate > 0),
    negativeMarkingRate: raw.negativeMarkingRate ?? 0.25,
    showAnswersAfterSubmit: raw.showAnswersAfterSubmit === true,
    isPublished: raw.isPublished !== false,
  };
}

/**
 * Start or resume quiz session via server-authoritative Cloud Function
 */
export async function startQuizSession(quizId: string): Promise<StartQuizSessionResponse> {
  const getQuestionsCallable = httpsCallable<{ quizId: string }, StartQuizSessionResponse>(
    functions,
    'getQuizQuestions'
  );
  const res = await getQuestionsCallable({ quizId });
  const data = res.data;

  const normalizedQuestions: QuizQuestionClient[] = (data.questions || []).map((q: any) => ({
    id: q.id,
    question: q.question || q.questionText || '',
    questionText: q.question || q.questionText || '',
    imageUrl: q.imageUrl || null,
    options: q.options || [],
    marks: Number(q.marks || 1),
    order: Number(q.order || 0),
  }));

  return {
    ...data,
    questions: normalizedQuestions,
  };
}

/**
 * Submit Quiz to server for authoritative scoring
 */
export async function submitQuizToServer(
  attemptId: string,
  quizId: string,
  answers: Record<string, number>,
  timeTakenSeconds: number
): Promise<QuizEvaluationResult> {
  const submitFn = httpsCallable<any, any>(functions, 'submitQuiz');
  const res = await submitFn({
    attemptId,
    quizId,
    answers,
    timeTakenSeconds,
  });

  const raw = res.data;
  // Normalize breakdown fields
  const breakdown: QuestionBreakdownItem[] = raw.breakdown || raw.reviewBreakup || [];

  const result: QuizEvaluationResult = {
    resultId: raw.resultId,
    attemptId: raw.attemptId || attemptId,
    attemptNumber: raw.attemptNumber || 1,
    score: raw.score,
    maxScore: raw.maxScore || raw.totalMarks || 10,
    totalMarks: raw.maxScore || raw.totalMarks || 10,
    percentage: raw.percentage,
    accuracy: raw.percentage,
    passingPercentage: raw.passingPercentage,
    passed: raw.passed,
    correctCount: raw.correctCount,
    wrongCount: raw.wrongCount,
    unansweredCount: raw.unansweredCount ?? raw.unattemptedCount ?? 0,
    timeTakenSeconds: raw.timeTakenSeconds,
    isLate: raw.isLate || false,
    breakdown,
    reviewBreakup: breakdown,
    answersRevealed: raw.answersRevealed === true,
  };

  // Clear autosave after submit
  await clearLocalQuizProgress(quizId);
  return result;
}

/**
 * Autosave quiz state to AsyncStorage (scoped per uid + quizId)
 */
export async function saveLocalQuizProgress(
  quizId: string,
  state: QuizAutosaveState
): Promise<void> {
  try {
    const uid = firebaseAuth.currentUser?.uid || 'guest';
    const key = `@quiz_autosave_${uid}_${quizId}`;
    await AsyncStorage.setItem(key, JSON.stringify(state));
  } catch (err) {
    console.warn('[quizService] Autosave error:', err);
  }
}

/**
 * Restore autosaved state from AsyncStorage
 */
export async function restoreLocalQuizProgress(
  quizId: string
): Promise<QuizAutosaveState | null> {
  try {
    const uid = firebaseAuth.currentUser?.uid || 'guest';
    const key = `@quiz_autosave_${uid}_${quizId}`;
    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Clear autosaved state after submission or expiration
 */
export async function clearLocalQuizProgress(quizId: string): Promise<void> {
  try {
    const uid = firebaseAuth.currentUser?.uid || 'guest';
    const key = `@quiz_autosave_${uid}_${quizId}`;
    await AsyncStorage.removeItem(key);
  } catch {}
}

/**
 * Fetch past quiz result directly by resultId
 */
export async function fetchQuizResult(resultId: string): Promise<QuizEvaluationResult | null> {
  const resDoc = await getDoc(doc(firebaseFirestore, 'quizResults', resultId));
  if (!resDoc.exists()) return null;
  const raw = resDoc.data() as any;
  const breakdown: QuestionBreakdownItem[] = raw.breakdown || raw.reviewBreakup || [];
  return {
    resultId: resDoc.id,
    attemptId: raw.attemptId || '',
    attemptNumber: raw.attemptNumber || 1,
    score: raw.score,
    maxScore: raw.maxScore || raw.totalMarks || 10,
    totalMarks: raw.maxScore || raw.totalMarks || 10,
    percentage: raw.percentage,
    accuracy: raw.percentage,
    passingPercentage: raw.passingPercentage,
    passed: raw.passed,
    correctCount: raw.correctCount,
    wrongCount: raw.wrongCount,
    unansweredCount: raw.unansweredCount ?? raw.unattemptedCount ?? 0,
    timeTakenSeconds: raw.timeTakenSeconds,
    isLate: raw.isLate || false,
    breakdown,
    reviewBreakup: breakdown,
    answersRevealed: raw.answersRevealed === true,
  };
}
