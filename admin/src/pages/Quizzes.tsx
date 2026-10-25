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
  Edit2,
  ArrowUp,
  ArrowDown,
  Layers,
  X,
  Percent,
  Search,
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
  increment,
  writeBatch,
} from 'firebase/firestore';
import { db, functions, httpsCallable } from '../firebase';
import { Course, Quiz, QuizQuestion } from '../types';

export const Quizzes: React.FC = () => {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCourseId, setFilterCourseId] = useState<string>('all');

  // Quiz Modal State
  const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);
  const [editingQuizId, setEditingQuizId] = useState<string | null>(null);

  // Form Fields for Quiz (Canonical Schema)
  const [title, setTitle] = useState('');
  const [courseId, setCourseId] = useState('');
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(15);
  const [passingPercentage, setPassingPercentage] = useState(60);
  const [allowRetries, setAllowRetries] = useState(true);
  const [maxAttempts, setMaxAttempts] = useState(0); // 0 = unlimited
  const [negativeMarkingEnabled, setNegativeMarkingEnabled] = useState(true);
  const [negativeMarkingRate, setNegativeMarkingRate] = useState(0.25);
  const [showAnswersAfterSubmit, setShowAnswersAfterSubmit] = useState(false);
  const [isPublished, setIsPublished] = useState(true);

  // Question Builder Modal State
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);

  // Question Form State (Add / Edit)
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [questionText, setQuestionText] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [options, setOptions] = useState<string[]>(['', '', '', '']);
  const [correctAnswerIndex, setCorrectAnswerIndex] = useState(0);
  const [marks, setMarks] = useState(1);
  const [explanation, setExplanation] = useState('');

  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Load courses
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const snap = await getDocs(collection(db, 'courses'));
        setCourses(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Course)));
      } catch (err: any) {
        console.warn('Courses fetch error:', err.message);
      }
    };
    fetchCourses();
  }, []);

  // Real-time listener for quizzes (normalized to canonical schema)
  useEffect(() => {
    const q = query(collection(db, 'quizzes'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: Quiz[] = snapshot.docs.map((d) => {
          const raw = d.data() as any;
          return {
            id: d.id,
            title: raw.title || 'Untitled Quiz',
            courseId: raw.courseId || '',
            courseTitle: raw.courseTitle || '',
            lessonId: raw.lessonId || undefined,
            timeLimitMinutes: raw.timeLimitMinutes ?? raw.durationMinutes ?? 15,
            passingPercentage:
              raw.passingPercentage ??
              (raw.passMarks && raw.totalMarks ? Math.round((raw.passMarks / raw.totalMarks) * 100) : 60),
            questionCount: raw.questionCount ?? raw.questionsCount ?? 0,
            allowRetries: raw.allowRetries !== false,
            maxAttempts: raw.maxAttempts ?? 0,
            negativeMarkingEnabled: raw.negativeMarkingEnabled ?? (raw.negativeMarkingRate > 0),
            negativeMarkingRate: raw.negativeMarkingRate ?? 0.25,
            showAnswersAfterSubmit: raw.showAnswersAfterSubmit === true,
            isPublished: raw.isPublished !== false,
            createdAt: raw.createdAt,
            updatedAt: raw.updatedAt,
          };
        });
        setQuizzes(list);
        setLoading(false);
      },
      (err) => {
        console.warn('Quizzes listener error:', err.message);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  // Auto-dismiss feedback after 4 seconds
  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  // Open Create Quiz Modal
  const openCreateQuizModal = () => {
    setEditingQuizId(null);
    setTitle('');
    setCourseId(courses[0]?.id || '');
    setTimeLimitMinutes(15);
    setPassingPercentage(60);
    setAllowRetries(true);
    setMaxAttempts(0);
    setNegativeMarkingEnabled(true);
    setNegativeMarkingRate(0.25);
    setShowAnswersAfterSubmit(false);
    setIsPublished(true);
    setIsQuizModalOpen(true);
  };

  // Open Edit Quiz Modal
  const openEditQuizModal = (quiz: Quiz) => {
    setEditingQuizId(quiz.id);
    setTitle(quiz.title);
    setCourseId(quiz.courseId);
    setTimeLimitMinutes(quiz.timeLimitMinutes);
    setPassingPercentage(quiz.passingPercentage);
    setAllowRetries(quiz.allowRetries);
    setMaxAttempts(quiz.maxAttempts || 0);
    setNegativeMarkingEnabled(quiz.negativeMarkingEnabled);
    setNegativeMarkingRate(quiz.negativeMarkingRate);
    setShowAnswersAfterSubmit(quiz.showAnswersAfterSubmit);
    setIsPublished(quiz.isPublished);
    setIsQuizModalOpen(true);
  };

  // Save Quiz (Create or Update with Canonical Schema)
  const handleSaveQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setFeedback({ type: 'error', message: 'Quiz title is required.' });
      return;
    }
    if (!courseId) {
      setFeedback({ type: 'error', message: 'Please select an associated course.' });
      return;
    }
    if (timeLimitMinutes <= 0) {
      setFeedback({ type: 'error', message: 'Time limit must be greater than 0 minutes.' });
      return;
    }
    if (passingPercentage < 1 || passingPercentage > 100) {
      setFeedback({ type: 'error', message: 'Passing percentage must be between 1% and 100%.' });
      return;
    }

    setSaving(true);
    const selectedCourse = courses.find((c) => c.id === courseId);

    const payload = {
      title: title.trim(),
      courseId,
      courseTitle: selectedCourse?.title || '',
      timeLimitMinutes: Number(timeLimitMinutes),
      passingPercentage: Number(passingPercentage),
      allowRetries: Boolean(allowRetries),
      maxAttempts: Number(maxAttempts) || 0,
      negativeMarkingEnabled: Boolean(negativeMarkingEnabled),
      negativeMarkingRate: negativeMarkingEnabled ? Number(negativeMarkingRate) : 0,
      showAnswersAfterSubmit: Boolean(showAnswersAfterSubmit),
      isPublished: Boolean(isPublished),
      updatedAt: serverTimestamp(),
    };

    try {
      if (editingQuizId) {
        await updateDoc(doc(db, 'quizzes', editingQuizId), payload);
        setFeedback({ type: 'success', message: 'Quiz settings updated successfully!' });
      } else {
        await addDoc(collection(db, 'quizzes'), {
          ...payload,
          questionCount: 0,
          createdAt: serverTimestamp(),
        });
        setFeedback({ type: 'success', message: 'New quiz created! Now click "Manage Questions" to add questions.' });
      }
      setIsQuizModalOpen(false);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Could not save quiz.' });
    } finally {
      setSaving(false);
    }
  };

  // Open Question Bank Builder for a Quiz
  const openQuestionBuilder = async (quiz: Quiz) => {
    setSelectedQuiz(quiz);
    setLoadingQuestions(true);
    setIsQuestionModalOpen(true);
    resetQuestionForm();

    try {
      const qSnap = await getDocs(
        query(collection(db, 'quizzes', quiz.id, 'questions'), orderBy('order', 'asc'))
      );
      const list: QuizQuestion[] = qSnap.docs.map((d, index) => {
        const raw = d.data() as any;
        return {
          id: d.id,
          question: raw.question || raw.questionText || '',
          imageUrl: raw.imageUrl || undefined,
          options: Array.isArray(raw.options) ? raw.options : ['', ''],
          correctAnswerIndex: raw.correctAnswerIndex ?? raw.correctOptionIndex ?? 0,
          marks: raw.marks || 1,
          explanation: raw.explanation || '',
          order: typeof raw.order === 'number' ? raw.order : index + 1,
        };
      });
      setQuestions(list);

      // Keep questionCount on parent quiz document strictly in sync
      if (quiz.questionCount !== list.length) {
        await updateDoc(doc(db, 'quizzes', quiz.id), {
          questionCount: list.length,
          updatedAt: serverTimestamp(),
        });
      }
    } catch (err: any) {
      console.warn('Questions load error:', err.message);
      setFeedback({ type: 'error', message: 'Failed to load questions from database.' });
    } finally {
      setLoadingQuestions(false);
    }
  };

  const resetQuestionForm = () => {
    setEditingQuestionId(null);
    setQuestionText('');
    setImageUrl('');
    setOptions(['', '', '', '']);
    setCorrectAnswerIndex(0);
    setMarks(1);
    setExplanation('');
  };

  const handleEditQuestion = (q: QuizQuestion) => {
    setEditingQuestionId(q.id);
    setQuestionText(q.question);
    setImageUrl(q.imageUrl || '');
    setOptions([...q.options]);
    setCorrectAnswerIndex(q.correctAnswerIndex);
    setMarks(q.marks || 1);
    setExplanation(q.explanation || '');
  };

  // Add Option (max 6)
  const handleAddOptionField = () => {
    if (options.length < 6) {
      setOptions([...options, '']);
    }
  };

  // Remove Option (min 2)
  const handleRemoveOptionField = (idxToRemove: number) => {
    if (options.length <= 2) return;
    const nextOptions = options.filter((_, i) => i !== idxToRemove);
    setOptions(nextOptions);
    if (correctAnswerIndex >= nextOptions.length) {
      setCorrectAnswerIndex(nextOptions.length - 1);
    } else if (correctAnswerIndex === idxToRemove) {
      setCorrectAnswerIndex(0);
    }
  };

  // Save Question (Add or Update)
  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQuiz) return;

    if (!questionText.trim()) {
      setFeedback({ type: 'error', message: 'Question prompt is required.' });
      return;
    }
    if (options.length < 2 || options.length > 6) {
      setFeedback({ type: 'error', message: 'A question must have between 2 and 6 options.' });
      return;
    }
    if (options.some((opt) => !opt.trim())) {
      setFeedback({ type: 'error', message: 'All option fields must have non-empty text.' });
      return;
    }
    if (correctAnswerIndex < 0 || correctAnswerIndex >= options.length) {
      setFeedback({ type: 'error', message: 'Please select a valid correct answer option.' });
      return;
    }
    if (marks <= 0) {
      setFeedback({ type: 'error', message: 'Question marks must be greater than 0.' });
      return;
    }

    setSaving(true);
    const cleanedOptions = options.map((o) => o.trim());

    try {
      if (editingQuestionId) {
        // Updating existing question
        const questionRef = doc(db, 'quizzes', selectedQuiz.id, 'questions', editingQuestionId);
        const payload: any = {
          question: questionText.trim(),
          options: cleanedOptions,
          correctAnswerIndex: Number(correctAnswerIndex),
          marks: Number(marks),
          explanation: explanation.trim(),
        };
        if (imageUrl.trim()) payload.imageUrl = imageUrl.trim();

        await updateDoc(questionRef, payload);

        setQuestions((prev) =>
          prev.map((q) =>
            q.id === editingQuestionId
              ? {
                  ...q,
                  ...payload,
                }
              : q
          )
        );
        setFeedback({ type: 'success', message: 'Question updated successfully!' });
      } else {
        // Adding new question
        const nextOrder = questions.length + 1;
        const newQuestionPayload: any = {
          question: questionText.trim(),
          options: cleanedOptions,
          correctAnswerIndex: Number(correctAnswerIndex),
          marks: Number(marks),
          explanation: explanation.trim(),
          order: nextOrder,
        };
        if (imageUrl.trim()) newQuestionPayload.imageUrl = imageUrl.trim();

        const qRef = await addDoc(
          collection(db, 'quizzes', selectedQuiz.id, 'questions'),
          newQuestionPayload
        );

        // Keep parent questionCount in sync
        await updateDoc(doc(db, 'quizzes', selectedQuiz.id), {
          questionCount: increment(1),
          updatedAt: serverTimestamp(),
        });

        setQuestions((prev) => [...prev, { id: qRef.id, ...newQuestionPayload }]);
        setFeedback({ type: 'success', message: `Question #${nextOrder} added to quiz!` });
      }

      resetQuestionForm();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Could not save question.' });
    } finally {
      setSaving(false);
    }
  };

  // Delete Question and keep questionCount in sync
  const handleDeleteQuestion = async (qId: string) => {
    if (!selectedQuiz || !qId) return;
    if (!window.confirm('Delete this question?')) return;

    try {
      await deleteDoc(doc(db, 'quizzes', selectedQuiz.id, 'questions', qId));

      // Decrement questionCount on parent quiz
      await updateDoc(doc(db, 'quizzes', selectedQuiz.id), {
        questionCount: increment(-1),
        updatedAt: serverTimestamp(),
      });

      const updated = questions.filter((q) => q.id !== qId);
      // Re-index orders
      const batch = writeBatch(db);
      updated.forEach((q, idx) => {
        const order = idx + 1;
        if (q.order !== order) {
          batch.update(doc(db, 'quizzes', selectedQuiz.id, 'questions', q.id), { order });
          q.order = order;
        }
      });
      await batch.commit();

      setQuestions(updated);
      setFeedback({ type: 'success', message: 'Question deleted and question bank reindexed.' });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to delete question.' });
    }
  };

  // Reorder Question Up/Down
  const handleMoveQuestion = async (index: number, direction: 'up' | 'down') => {
    if (!selectedQuiz) return;
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= questions.length) return;

    const copy = [...questions];
    const currentQ = copy[index];
    const targetQ = copy[targetIdx];

    const currentOrder = currentQ.order;
    const targetOrder = targetQ.order;

    currentQ.order = targetOrder;
    targetQ.order = currentOrder;

    copy[index] = targetQ;
    copy[targetIdx] = currentQ;

    setQuestions(copy);

    try {
      const batch = writeBatch(db);
      batch.update(doc(db, 'quizzes', selectedQuiz.id, 'questions', currentQ.id), {
        order: currentQ.order,
      });
      batch.update(doc(db, 'quizzes', selectedQuiz.id, 'questions', targetQ.id), {
        order: targetQ.order,
      });
      await batch.commit();
    } catch (err: any) {
      console.warn('Reorder failed:', err.message);
    }
  };

  // Delete Entire Quiz via Server-Authoritative Cascade Delete Callable
  const handleDeleteQuiz = async (quiz: Quiz) => {
    if (
      !window.confirm(
        `Are you sure you want to permanently delete "${quiz.title}" and all its questions? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      const deleteQuizCallable = httpsCallable<{ quizId: string }, { success: boolean }>(
        functions,
        'deleteQuiz'
      );
      await deleteQuizCallable({ quizId: quiz.id });
      setFeedback({
        type: 'success',
        message: `Quiz "${quiz.title}" and all associated questions deleted.`,
      });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Could not delete quiz.' });
    }
  };

  // Filtered Quizzes
  const filteredQuizzes = quizzes.filter((q) => {
    const matchesSearch =
      q.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (q.courseTitle && q.courseTitle.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCourse = filterCourseId === 'all' || q.courseId === filterCourseId;
    return matchesSearch && matchesCourse;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <FileQuestion className="w-6 h-6 text-brand-500" /> Quizzes & Question Bank
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Build server-authoritative timed MCQ quizzes, configure negative marking, and protect question answer keys.
          </p>
        </div>
        <button
          onClick={openCreateQuizModal}
          className="inline-flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs uppercase tracking-wider rounded-none shadow-sm transition-colors self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Quiz</span>
        </button>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-3 rounded-none flex items-center justify-between gap-3 border text-xs font-semibold ${
            feedback.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
              : 'bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 border-red-300 dark:border-red-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle className="w-4 h-4 flex-shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Filter / Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-white dark:bg-dark-surface p-3 border border-slate-200 dark:border-slate-800 rounded-none shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search quiz title or course..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-none focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
        <div className="w-full sm:w-64">
          <select
            value={filterCourseId}
            onChange={(e) => setFilterCourseId(e.target.value)}
            className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-none focus:outline-none focus:ring-1 focus:ring-brand-500 font-semibold"
          >
            <option value="all">All Courses ({courses.length})</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Quiz Table */}
      <div className="bg-white dark:bg-dark-surface border border-slate-200 dark:border-slate-800 rounded-none shadow-sm overflow-hidden">
        <div className="p-3 bg-slate-50/70 dark:bg-slate-900/70 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-brand-500" />
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Configured Quizzes ({filteredQuizzes.length})
            </h3>
          </div>
          <span className="text-[11px] text-slate-400">Canonical Schema (Part 6.1)</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-brand-500" />
            <span className="text-xs">Loading quizzes...</span>
          </div>
        ) : filteredQuizzes.length === 0 ? (
          <div className="p-12 text-center text-slate-500 dark:text-slate-400">
            <FileQuestion className="w-8 h-8 text-slate-300 mx-auto mb-2 opacity-50" />
            <p className="text-xs font-semibold">No quizzes found matching your filter.</p>
            <button
              onClick={openCreateQuizModal}
              className="mt-3 px-3 py-1 bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs uppercase rounded-none"
            >
              + Create First Quiz
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-2.5 px-4">Quiz Title & Status</th>
                  <th className="py-2.5 px-4">Course</th>
                  <th className="py-2.5 px-4">Timer</th>
                  <th className="py-2.5 px-4">Pass % / Penalty</th>
                  <th className="py-2.5 px-4">Retries & Answers</th>
                  <th className="py-2.5 px-4">Questions Bank</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredQuizzes.map((quiz) => (
                  <tr key={quiz.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200 max-w-xs">
                      <div className="flex items-center gap-2">
                        <span>{quiz.title}</span>
                        {quiz.isPublished ? (
                          <span className="px-1.5 py-0.5 rounded-none bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                            Live
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded-none bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 text-[10px] font-bold">
                            Draft
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-500 dark:text-slate-400">
                      {quiz.courseTitle || courses.find((c) => c.id === quiz.courseId)?.title || 'General'}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{quiz.timeLimitMinutes} mins</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          {quiz.passingPercentage}% Pass
                        </span>
                        {quiz.negativeMarkingEnabled && quiz.negativeMarkingRate > 0 ? (
                          <span className="text-[10px] text-red-500 font-mono">
                            -{quiz.negativeMarkingRate} per wrong
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400">No penalty</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-[11px]">
                      <div className="flex flex-col gap-0.5">
                        <span className={quiz.allowRetries ? 'text-slate-600 dark:text-slate-300' : 'text-slate-400'}>
                          {quiz.allowRetries
                            ? quiz.maxAttempts > 0
                              ? `Max ${quiz.maxAttempts} attempts`
                              : 'Unlimited Retries'
                            : 'Single Attempt Only'}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {quiz.showAnswersAfterSubmit ? 'Answers shown after end' : 'Answers hidden'}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => openQuestionBuilder(quiz)}
                        className="px-2.5 py-1 rounded-none bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 text-xs font-bold border border-brand-200 dark:border-brand-800 hover:bg-brand-100 flex items-center gap-1.5 transition-colors"
                      >
                        <HelpCircle className="w-3.5 h-3.5" />
                        <span>Questions ({quiz.questionCount})</span>
                      </button>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => openEditQuizModal(quiz)}
                          className="p-1.5 text-slate-400 hover:text-brand-600 rounded-none hover:bg-slate-100 dark:hover:bg-slate-800"
                          title="Edit Quiz Settings"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteQuiz(quiz)}
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded-none hover:bg-slate-100 dark:hover:bg-slate-800"
                          title="Cascade Delete Quiz & Questions"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quiz Create/Edit Modal */}
      {isQuizModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-dark-surface w-full max-w-lg rounded-none border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <FileQuestion className="w-4 h-4 text-brand-500" />
                {editingQuizId ? 'Edit Quiz Settings' : 'Create New Timed Quiz'}
              </h3>
              <button
                onClick={() => setIsQuizModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveQuiz} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                  Quiz Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. YouTube Retention & Click-Through Rate Mastery"
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold rounded-none focus:outline-none focus:ring-1 focus:ring-brand-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                  Associated Course *
                </label>
                <select
                  value={courseId}
                  onChange={(e) => setCourseId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs rounded-none focus:outline-none focus:ring-1 focus:ring-brand-500 font-medium"
                  required
                >
                  <option value="">Select a course...</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" /> Time Limit (Minutes) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={300}
                    value={timeLimitMinutes}
                    onChange={(e) => setTimeLimitMinutes(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono rounded-none focus:outline-none focus:ring-1 focus:ring-brand-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1">
                    <Percent className="w-3.5 h-3.5 text-slate-400" /> Passing Percentage *
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={passingPercentage}
                    onChange={(e) => setPassingPercentage(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono rounded-none focus:outline-none focus:ring-1 focus:ring-brand-500"
                    required
                  />
                </div>
              </div>

              {/* Negative Marking Group */}
              <div className="p-3 border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="negCheck"
                      checked={negativeMarkingEnabled}
                      onChange={(e) => setNegativeMarkingEnabled(e.target.checked)}
                      className="w-3.5 h-3.5 text-brand-600 focus:ring-brand-500 rounded-none"
                    />
                    <label htmlFor="negCheck" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Enable Negative Marking
                    </label>
                  </div>
                  {negativeMarkingEnabled && (
                    <span className="text-[10px] font-mono text-red-500 font-bold">
                      -{negativeMarkingRate} marks / wrong
                    </span>
                  )}
                </div>

                {negativeMarkingEnabled && (
                  <div>
                    <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                      Penalty per incorrect response:
                    </label>
                    <select
                      value={negativeMarkingRate}
                      onChange={(e) => setNegativeMarkingRate(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono rounded-none focus:outline-none focus:ring-1 focus:ring-brand-500"
                    >
                      <option value={0.25}>0.25 (1/4 mark deduction)</option>
                      <option value={0.33}>0.33 (1/3 mark deduction)</option>
                      <option value={0.5}>0.50 (1/2 mark deduction)</option>
                      <option value={1.0}>1.00 (Full mark deduction)</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Retries and Security Flags */}
              <div className="space-y-2 pt-1 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="retryCheck"
                      checked={allowRetries}
                      onChange={(e) => setAllowRetries(e.target.checked)}
                      className="w-3.5 h-3.5 text-brand-600 focus:ring-brand-500 rounded-none"
                    />
                    <label htmlFor="retryCheck" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Allow Students to Retake Quiz
                    </label>
                  </div>
                  {allowRetries && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-500">Max Attempts:</span>
                      <input
                        type="number"
                        min={0}
                        max={10}
                        value={maxAttempts}
                        onChange={(e) => setMaxAttempts(Number(e.target.value))}
                        className="w-14 px-2 py-0.5 text-xs font-mono border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-none text-center"
                        title="0 = unlimited"
                      />
                      <span className="text-[10px] text-slate-400 font-mono">(0=unlimited)</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="showAnsCheck"
                    checked={showAnswersAfterSubmit}
                    onChange={(e) => setShowAnswersAfterSubmit(e.target.checked)}
                    className="w-3.5 h-3.5 text-brand-600 focus:ring-brand-500 rounded-none"
                  />
                  <label htmlFor="showAnsCheck" className="text-xs text-slate-700 dark:text-slate-300">
                    Show full answer key & explanations after final attempt
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="publishCheck"
                    checked={isPublished}
                    onChange={(e) => setIsPublished(e.target.checked)}
                    className="w-3.5 h-3.5 text-brand-600 focus:ring-brand-500 rounded-none"
                  />
                  <label htmlFor="publishCheck" className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    Publish Quiz (Visible to enrolled students)
                  </label>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsQuizModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 text-xs font-bold uppercase rounded-none hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-1.5 bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold uppercase rounded-none disabled:opacity-50 flex items-center gap-1.5"
                >
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingQuizId ? 'Update Quiz' : 'Create Quiz'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Question Builder Drawer Modal */}
      {isQuestionModalOpen && selectedQuiz && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-dark-surface w-full max-w-3xl rounded-none border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-brand-500" /> Question Bank: {selectedQuiz.title}
                </h3>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Total Questions: {questions.length} | Questions are NEVER readable directly by students
                </span>
              </div>
              <button
                onClick={() => setIsQuestionModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Questions List */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                Current Questions in Exam ({questions.length})
              </h4>

              {loadingQuestions ? (
                <div className="p-6 text-center text-slate-400 flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-brand-500" />
                  <span className="text-xs">Loading questions...</span>
                </div>
              ) : questions.length === 0 ? (
                <div className="p-6 rounded-none border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400 bg-slate-50/50 dark:bg-slate-900/50">
                  No questions in this quiz yet. Fill out the form below to add question #1.
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {questions.map((q, idx) => (
                    <div
                      key={q.id || idx}
                      className="p-3 rounded-none border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 flex items-start justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-1.5 pt-0.5">
                        <span className="font-mono font-bold text-slate-400 text-[11px]">#{q.order}</span>
                        <div className="flex flex-col">
                          <button
                            onClick={() => handleMoveQuestion(idx, 'up')}
                            disabled={idx === 0}
                            className="text-slate-400 hover:text-slate-600 disabled:opacity-20"
                            title="Move Up"
                          >
                            <ArrowUp className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleMoveQuestion(idx, 'down')}
                            disabled={idx === questions.length - 1}
                            className="text-slate-400 hover:text-slate-600 disabled:opacity-20"
                            title="Move Down"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      <div className="flex-1 space-y-1">
                        <div className="font-bold text-slate-800 dark:text-slate-200">
                          {q.question}
                          <span className="ml-2 font-mono text-[10px] text-brand-600 dark:text-brand-400">
                            ({q.marks} {q.marks === 1 ? 'mark' : 'marks'})
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 text-[11px]">
                          {q.options.map((opt, optIdx) => (
                            <span
                              key={optIdx}
                              className={`px-2 py-0.5 rounded-none font-medium border text-[10px] ${
                                optIdx === q.correctAnswerIndex
                                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700 font-bold'
                                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                              }`}
                            >
                              {String.fromCharCode(65 + optIdx)}: {opt}
                            </span>
                          ))}
                        </div>
                        {q.explanation && (
                          <div className="text-[10px] text-slate-400 italic">
                            Explanation: {q.explanation}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleEditQuestion(q)}
                          className="p-1 text-slate-400 hover:text-brand-600"
                          title="Edit Question"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteQuestion(q.id)}
                          className="p-1 text-slate-400 hover:text-red-600"
                          title="Delete Question"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Question Form (Add or Edit) */}
            <form onSubmit={handleSaveQuestion} className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  {editingQuestionId ? '✏️ Edit Question' : `+ Add Question #${questions.length + 1}`}
                </h4>
                {editingQuestionId && (
                  <button
                    type="button"
                    onClick={resetQuestionForm}
                    className="text-[11px] text-slate-400 hover:text-slate-600 underline"
                  >
                    Cancel Edit / Add New
                  </button>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                  Question Prompt *
                </label>
                <input
                  type="text"
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  placeholder="e.g. What is the optimal hook duration for a YouTube short video?"
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold rounded-none focus:outline-none focus:ring-1 focus:ring-brand-500"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                    Image URL (Optional Diagram / Chart)
                  </label>
                  <input
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://example.com/diagram.png"
                    className="w-full px-3 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs rounded-none focus:outline-none focus:ring-1 focus:ring-brand-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                    Marks for this question *
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={marks}
                    onChange={(e) => setMarks(Number(e.target.value))}
                    className="w-full px-3 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono rounded-none focus:outline-none focus:ring-1 focus:ring-brand-500"
                    required
                  />
                </div>
              </div>

              {/* Options Grid (2 to 6) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold uppercase text-slate-500">
                    Options (2 to 6) — Click green letter to set the CORRECT answer *
                  </label>
                  {options.length < 6 && (
                    <button
                      type="button"
                      onClick={handleAddOptionField}
                      className="text-[11px] text-brand-600 dark:text-brand-400 hover:underline font-bold flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Add Option
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {options.map((opt, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setCorrectAnswerIndex(i)}
                        className={`w-7 h-7 rounded-none flex items-center justify-center font-bold text-xs flex-shrink-0 transition-colors ${
                          correctAnswerIndex === i
                            ? 'bg-emerald-600 text-white font-bold ring-2 ring-emerald-400'
                            : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-300'
                        }`}
                        title="Click to set as correct answer"
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
                        className="flex-1 px-3 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs rounded-none focus:outline-none focus:ring-1 focus:ring-brand-500 font-medium"
                        required
                      />
                      {options.length > 2 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveOptionField(i)}
                          className="text-slate-400 hover:text-red-500 p-1"
                          title="Remove this option"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                  Explanation (Shown only after quiz submit when allowed)
                </label>
                <input
                  type="text"
                  value={explanation}
                  onChange={(e) => setExplanation(e.target.value)}
                  placeholder="Explain why this option is correct to help students learn..."
                  className="w-full px-3 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs rounded-none focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-1.5 bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold uppercase rounded-none shadow-sm flex items-center gap-1.5"
                >
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingQuestionId ? 'Update Question' : 'Save Question'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
