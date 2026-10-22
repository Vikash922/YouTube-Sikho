import React, { useState, useEffect } from 'react';
import {
  FileQuestion,
  Plus,
  Trash2,
  Clock,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  Loader2,
} from 'lucide-react';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import { Course } from '../types';

export interface AdminQuiz {
  id: string;
  title: string;
  courseId: string;
  courseTitle?: string;
  durationMinutes: number;
  passMarks: number;
  totalMarks: number;
  negativeMarkingRate: number; // e.g. 0.25
  allowRetries: boolean;
  isPublished: boolean;
  questionsCount?: number;
  createdAt?: any;
}

export interface AdminQuestion {
  id?: string;
  questionText: string;
  options: string[];
  correctOptionIndex: number;
  marks: number;
  explanation: string;
  order: number;
}

export const Quizzes: React.FC = () => {
  const [quizzes, setQuizzes] = useState<AdminQuiz[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);
  const [editingQuizId, setEditingQuizId] = useState<string | null>(null);
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [selectedQuiz, setSelectedQuiz] = useState<AdminQuiz | null>(null);
  const [questions, setQuestions] = useState<AdminQuestion[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);

  // Form Fields for Quiz
  const [title, setTitle] = useState('');
  const [courseId, setCourseId] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(15);
  const [passMarks, setPassMarks] = useState(5);
  const [negativeMarkingRate, setNegativeMarkingRate] = useState(0.25);
  const [allowRetries, setAllowRetries] = useState(true);

  // Form Fields for Single Question
  const [questionText, setQuestionText] = useState('');
  const [options, setOptions] = useState<string[]>(['', '', '', '']);
  const [correctOptionIndex, setCorrectOptionIndex] = useState(0);
  const questionMarks = 1;
  const [explanation, setExplanation] = useState('');

  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Load courses
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const snap = await getDocs(collection(db, 'courses'));
        setCourses(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Course)));
      } catch (err) {
        console.warn('Courses fetch error:', err);
      }
    };
    fetchCourses();
  }, []);

  // Real-time listener for quizzes
  useEffect(() => {
    const q = query(collection(db, 'quizzes'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setQuizzes(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as AdminQuiz)));
        setLoading(false);
      },
      (err) => {
        console.warn('Quizzes listener error:', err.message);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  // Load questions when question builder modal opens
  const openQuestionBuilder = async (quiz: AdminQuiz) => {
    setSelectedQuiz(quiz);
    setLoadingQuestions(true);
    setIsQuestionModalOpen(true);

    try {
      const qSnap = await getDocs(
        query(collection(db, 'quizzes', quiz.id, 'questions'), orderBy('order', 'asc'))
      );
      const list = qSnap.docs.map((d) => ({ id: d.id, ...d.data() } as AdminQuestion));
      setQuestions(list);
    } catch (err: any) {
      console.warn('Questions load error:', err.message);
    } finally {
      setLoadingQuestions(false);
    }
  };

  const openCreateQuizModal = () => {
    setEditingQuizId(null);
    setTitle('');
    setCourseId(courses[0]?.id || '');
    setDurationMinutes(15);
    setPassMarks(5);
    setNegativeMarkingRate(0.25);
    setAllowRetries(true);
    setIsQuizModalOpen(true);
  };

  const handleSaveQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setFeedback({ type: 'error', message: 'Title is required.' });
      return;
    }

    setSaving(true);
    const selectedCourse = courses.find((c) => c.id === courseId);

    const payload = {
      title: title.trim(),
      courseId,
      courseTitle: selectedCourse?.title || '',
      durationMinutes: Number(durationMinutes),
      passMarks: Number(passMarks),
      negativeMarkingRate: Number(negativeMarkingRate),
      allowRetries,
      isPublished: true,
      updatedAt: serverTimestamp(),
    };

    try {
      if (editingQuizId) {
        await updateDoc(doc(db, 'quizzes', editingQuizId), payload);
        setFeedback({ type: 'success', message: 'Quiz updated successfully!' });
      } else {
        await addDoc(collection(db, 'quizzes'), {
          ...payload,
          totalMarks: 10,
          createdAt: serverTimestamp(),
        });
        setFeedback({ type: 'success', message: 'New quiz created successfully!' });
      }
      setIsQuizModalOpen(false);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Could not save quiz.' });
    } finally {
      setSaving(false);
    }
  };

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQuiz || !questionText.trim()) return;

    if (options.some((opt) => !opt.trim())) {
      setFeedback({ type: 'error', message: 'All 4 options must be filled.' });
      return;
    }

    setSaving(true);
    const newQuestion: AdminQuestion = {
      questionText: questionText.trim(),
      options: options.map((o) => o.trim()),
      correctOptionIndex,
      marks: Number(questionMarks),
      explanation: explanation.trim(),
      order: questions.length + 1,
    };

    try {
      const qRef = await addDoc(
        collection(db, 'quizzes', selectedQuiz.id, 'questions'),
        newQuestion
      );
      setQuestions((prev) => [...prev, { id: qRef.id, ...newQuestion }]);

      // Clear question form
      setQuestionText('');
      setOptions(['', '', '', '']);
      setCorrectOptionIndex(0);
      setExplanation('');
      setFeedback({ type: 'success', message: 'Question added to quiz!' });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Could not add question.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteQuestion = async (qId?: string) => {
    if (!selectedQuiz || !qId) return;
    try {
      await deleteDoc(doc(db, 'quizzes', selectedQuiz.id, 'questions', qId));
      setQuestions((prev) => prev.filter((q) => q.id !== qId));
    } catch (err: any) {
      console.warn('Failed to delete question:', err.message);
    }
  };

  const handleDeleteQuiz = async (id: string) => {
    if (!window.confirm('Delete this quiz and all its questions?')) return;
    try {
      await deleteDoc(doc(db, 'quizzes', id));
      setFeedback({ type: 'success', message: 'Quiz deleted successfully.' });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Could not delete quiz.' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-light-text dark:text-dark-text tracking-tight">
            Quizzes & Question Bank
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Build timed MCQ tests, set negative marking penalties, and evaluate learner comprehension.
          </p>
        </div>
        <button
          onClick={openCreateQuizModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-btn bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm shadow-md shadow-brand-500/20 self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Quiz</span>
        </button>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl flex items-center gap-3 border ${
            feedback.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50'
              : 'bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800/50'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
          )}
          <span className="text-sm font-medium">{feedback.message}</span>
        </div>
      )}

      {/* Quiz Table */}
      <div className="bg-white dark:bg-dark-surface rounded-card border border-light-border dark:border-dark-border shadow-sm overflow-hidden">
        <div className="p-4 border-b border-light-border dark:border-dark-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileQuestion className="w-5 h-5 text-brand-600" />
            <h3 className="font-bold font-display text-base text-light-text dark:text-dark-text">
              Active Tests ({quizzes.length})
            </h3>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500 flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-brand-600" />
            <span>Loading quizzes...</span>
          </div>
        ) : quizzes.length === 0 ? (
          <div className="p-12 text-center text-slate-500 dark:text-slate-400">
            No quizzes created yet. Click "Create New Quiz" to start adding questions.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-dark-card/50 text-slate-500 dark:text-slate-400 text-xs uppercase font-semibold">
                <tr>
                  <th className="py-3 px-4">Quiz Title</th>
                  <th className="py-3 px-4">Course</th>
                  <th className="py-3 px-4">Timer</th>
                  <th className="py-3 px-4">Pass / Penalty</th>
                  <th className="py-3 px-4">Question Bank</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-light-border dark:divide-dark-border">
                {quizzes.map((quiz) => (
                  <tr key={quiz.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="py-3 px-4 font-semibold text-light-text dark:text-dark-text max-w-xs truncate">
                      {quiz.title}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-500">
                      {quiz.courseTitle || 'General'}
                    </td>
                    <td className="py-3 px-4 text-xs font-mono text-slate-600 dark:text-slate-400">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{quiz.durationMinutes} mins</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-xs">
                      <span className="font-semibold text-emerald-600">Pass: {quiz.passMarks}</span>
                      <span className="text-slate-400 ml-2 font-mono">
                        (-{quiz.negativeMarkingRate})
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => openQuestionBuilder(quiz)}
                        className="px-3 py-1 rounded-lg bg-brand-50 dark:bg-brand-950/50 text-brand-600 dark:text-brand-400 text-xs font-bold border border-brand-200 hover:bg-brand-100 flex items-center gap-1.5"
                      >
                        <HelpCircle className="w-3.5 h-3.5" />
                        <span>Manage Questions</span>
                      </button>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleDeleteQuiz(quiz.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                        title="Delete Quiz"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quiz Modal */}
      {isQuizModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-dark-surface w-full max-w-md rounded-card border border-light-border dark:border-dark-border shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-light-border dark:border-dark-border">
              <h3 className="text-lg font-bold font-display text-light-text dark:text-dark-text">
                {editingQuizId ? 'Edit Quiz' : 'Create New Quiz'}
              </h3>
              <button
                onClick={() => setIsQuizModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveQuiz} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                  Quiz Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. YouTube Algorithm & SEO Checkpoint"
                  className="w-full px-3.5 py-2.5 rounded-btn border border-light-border dark:border-dark-border bg-white dark:bg-dark-card text-sm font-semibold focus:ring-2 focus:ring-brand-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                  Associated Course
                </label>
                <select
                  value={courseId}
                  onChange={(e) => setCourseId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-btn border border-light-border dark:border-dark-border bg-white dark:bg-dark-card text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                    Duration (Mins)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={180}
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Number(e.target.value))}
                    className="w-full px-3.5 py-2 rounded-btn border border-light-border dark:border-dark-border bg-white dark:bg-dark-card text-sm font-mono focus:ring-2 focus:ring-brand-500 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                    Passing Marks
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={passMarks}
                    onChange={(e) => setPassMarks(Number(e.target.value))}
                    className="w-full px-3.5 py-2 rounded-btn border border-light-border dark:border-dark-border bg-white dark:bg-dark-card text-sm font-mono focus:ring-2 focus:ring-brand-500 outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                  Negative Marking Penalty (Per wrong answer)
                </label>
                <select
                  value={negativeMarkingRate}
                  onChange={(e) => setNegativeMarkingRate(Number(e.target.value))}
                  className="w-full px-3.5 py-2 rounded-btn border border-light-border dark:border-dark-border bg-white dark:bg-dark-card text-sm font-mono focus:ring-2 focus:ring-brand-500 outline-none"
                >
                  <option value={0}>0 (No Penalty)</option>
                  <option value={0.25}>0.25 (1/4th Mark Deduction)</option>
                  <option value={0.33}>0.33 (1/3rd Mark Deduction)</option>
                  <option value={0.5}>0.5 (Half Mark Deduction)</option>
                  <option value={1}>1.0 (Full Mark Deduction)</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="retryCheck"
                  checked={allowRetries}
                  onChange={(e) => setAllowRetries(e.target.checked)}
                  className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500"
                />
                <label htmlFor="retryCheck" className="text-sm text-slate-700 dark:text-slate-300">
                  Allow students to retry quiz
                </label>
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-light-border dark:border-dark-border">
                <button
                  type="button"
                  onClick={() => setIsQuizModalOpen(false)}
                  className="px-4 py-2 rounded-btn border border-light-border dark:border-dark-border text-sm font-medium hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-btn bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold shadow-md shadow-brand-500/20 disabled:opacity-50"
                >
                  Save Quiz
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Question Builder Drawer Modal */}
      {isQuestionModalOpen && selectedQuiz && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-dark-surface w-full max-w-3xl rounded-card border border-light-border dark:border-dark-border shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-light-border dark:border-dark-border">
              <div>
                <h3 className="text-lg font-bold font-display text-light-text dark:text-dark-text">
                  Question Bank: {selectedQuiz.title}
                </h3>
                <span className="text-xs text-slate-500">
                  Total Questions: {questions.length}
                </span>
              </div>
              <button
                onClick={() => setIsQuestionModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            {/* Existing Questions List */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Configured Questions
              </h4>

              {loadingQuestions ? (
                <div className="p-4 text-center text-slate-400">Loading questions...</div>
              ) : questions.length === 0 ? (
                <div className="p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-center text-xs text-slate-400">
                  No questions in this quiz yet. Add your first question below.
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {questions.map((q, idx) => (
                    <div
                      key={q.id || idx}
                      className="p-3 rounded-xl border border-light-border dark:border-dark-border bg-slate-50 dark:bg-dark-card/50 flex items-start justify-between gap-3 text-xs"
                    >
                      <div className="flex-1 space-y-1">
                        <div className="font-bold text-light-text dark:text-dark-text">
                          Q{idx + 1}: {q.questionText}
                        </div>
                        <div className="text-slate-500">
                          Correct: Option {String.fromCharCode(65 + q.correctOptionIndex)} (
                          {q.options[q.correctOptionIndex]})
                        </div>
                        {q.explanation && (
                          <div className="text-[11px] text-slate-400 italic">
                            Why: {q.explanation}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => handleDeleteQuestion(q.id)}
                        className="text-slate-400 hover:text-red-600 p-1"
                        title="Delete Question"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add New Question Form */}
            <form onSubmit={handleAddQuestion} className="pt-3 border-t border-light-border dark:border-dark-border space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                + Add Next Question
              </h4>

              <div>
                <input
                  type="text"
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  placeholder="Enter Question Text (e.g. What is the optimal YouTube video length for high retention?)"
                  className="w-full px-3.5 py-2.5 rounded-btn border border-light-border dark:border-dark-border bg-white dark:bg-dark-card text-xs font-semibold focus:ring-2 focus:ring-brand-500 outline-none"
                  required
                />
              </div>

              {/* 4 Options Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {options.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCorrectOptionIndex(i)}
                      className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 transition-colors ${
                        correctOptionIndex === i
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                      title="Set as correct answer"
                    >
                      {String.fromCharCode(65 + i)}
                    </button>
                    <input
                      type="text"
                      value={opt}
                      onChange={(e) => {
                        const next = [...options];
                        next[i] = e.target.value;
                        setOptions(next);
                      }}
                      placeholder={`Option ${String.fromCharCode(65 + i)}`}
                      className="flex-1 px-3 py-1.5 rounded-lg border border-light-border dark:border-dark-border bg-white dark:bg-dark-card text-xs focus:ring-2 focus:ring-brand-500 outline-none"
                      required
                    />
                  </div>
                ))}
              </div>

              <div>
                <input
                  type="text"
                  value={explanation}
                  onChange={(e) => setExplanation(e.target.value)}
                  placeholder="Explanation shown to student after submitting quiz (Why this answer is right)"
                  className="w-full px-3 py-2 rounded-btn border border-light-border dark:border-dark-border bg-white dark:bg-dark-card text-xs focus:ring-2 focus:ring-brand-500 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-btn bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold shadow-sm flex items-center gap-1.5"
                >
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Question</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
