import React, { useState, useEffect } from 'react';
import {
  Bell,
  Send,
  Users,
  BookOpen,
  Radio,
  ExternalLink,
  Loader2,
  CheckCircle,
  AlertCircle,
  History,
  Smartphone,
  Sparkles,
} from 'lucide-react';
import { collection, query, orderBy, onSnapshot, getDocs } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../firebase';
import { Course } from '../types';

interface BroadcastRecord {
  id: string;
  title: string;
  body: string;
  target: 'all' | 'course' | 'user';
  targetId?: string;
  actionType: string;
  actionData?: string;
  sentAt?: any;
  recipientCount: number;
  fcmSuccessCount: number;
}

export const Notifications: React.FC = () => {
  const [target, setTarget] = useState<'all' | 'course' | 'user'>('all');
  const [targetId, setTargetId] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [actionType, setActionType] = useState<'notifications' | 'course' | 'live' | 'url'>('notifications');
  const [actionData, setActionData] = useState('');

  const [courses, setCourses] = useState<Course[]>([]);
  const [history, setHistory] = useState<BroadcastRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Load published courses for course target selector
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const snap = await getDocs(collection(db, 'courses'));
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Course));
        setCourses(list);
      } catch (e) {
        console.warn('Could not load courses for target dropdown:', e);
      }
    };
    fetchCourses();
  }, []);

  // Real-time listener on broadcast history
  useEffect(() => {
    const q = query(collection(db, 'notifications'), orderBy('sentAt', 'desc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const records = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as BroadcastRecord));
        setHistory(records);
        setLoadingHistory(false);
      },
      (err) => {
        console.warn('History listener warning:', err.message);
        setLoadingHistory(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      setFeedback({ type: 'error', message: 'Please provide both title and body text.' });
      return;
    }
    if (target === 'course' && !targetId) {
      setFeedback({ type: 'error', message: 'Please select a target course.' });
      return;
    }
    if (target === 'user' && !targetId.trim()) {
      setFeedback({ type: 'error', message: 'Please provide the recipient user ID.' });
      return;
    }

    setSending(true);
    setFeedback(null);

    try {
      const sendNotificationFn = httpsCallable(functions, 'sendNotification');
      const res: any = await sendNotificationFn({
        target,
        targetId: target !== 'all' ? targetId : undefined,
        title: title.trim(),
        body: body.trim(),
        imageUrl: imageUrl.trim() || undefined,
        actionType,
        actionData: actionData.trim() || undefined,
      });

      setFeedback({
        type: 'success',
        message: `Notification dispatched successfully to ${res.data?.recipients || 0} students!`,
      });

      // Clear form
      setTitle('');
      setBody('');
      setImageUrl('');
      setActionData('');
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to dispatch notification broadcast.',
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-light-text dark:text-dark-text tracking-tight">
            Push Notifications & Broadcasts
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Dispatch instant FCM push alerts and feed updates to all students or specific cohorts.
          </p>
        </div>
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

      {/* Main Grid: Composer + Live Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Composer Form (2 Cols) */}
        <div className="lg:col-span-2 bg-white dark:bg-dark-surface p-6 rounded-card border border-light-border dark:border-dark-border shadow-sm">
          <form onSubmit={handleSend} className="space-y-5">
            {/* Target Audience */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                1. Target Audience
              </label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => { setTarget('all'); setTargetId(''); }}
                  className={`p-3 rounded-btn border text-sm font-semibold flex flex-col items-center gap-1.5 transition-all ${
                    target === 'all'
                      ? 'border-brand-600 bg-brand-50 dark:bg-brand-950/50 text-brand-600 dark:text-brand-400 shadow-sm'
                      : 'border-light-border dark:border-dark-border text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <Users className="w-5 h-5" />
                  <span>All Students</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTarget('course')}
                  className={`p-3 rounded-btn border text-sm font-semibold flex flex-col items-center gap-1.5 transition-all ${
                    target === 'course'
                      ? 'border-brand-600 bg-brand-50 dark:bg-brand-950/50 text-brand-600 dark:text-brand-400 shadow-sm'
                      : 'border-light-border dark:border-dark-border text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <BookOpen className="w-5 h-5" />
                  <span>Course Cohort</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTarget('user')}
                  className={`p-3 rounded-btn border text-sm font-semibold flex flex-col items-center gap-1.5 transition-all ${
                    target === 'user'
                      ? 'border-brand-600 bg-brand-50 dark:bg-brand-950/50 text-brand-600 dark:text-brand-400 shadow-sm'
                      : 'border-light-border dark:border-dark-border text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <Sparkles className="w-5 h-5" />
                  <span>Single Student</span>
                </button>
              </div>

              {/* Conditional Target Selector */}
              {target === 'course' && (
                <div className="mt-3">
                  <select
                    value={targetId}
                    onChange={(e) => setTargetId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-btn border border-light-border dark:border-dark-border bg-white dark:bg-dark-card text-light-text dark:text-dark-text text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    required
                  >
                    <option value="">-- Select Course --</option>
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {target === 'user' && (
                <div className="mt-3">
                  <input
                    type="text"
                    value={targetId}
                    onChange={(e) => setTargetId(e.target.value)}
                    placeholder="Enter Student UID (e.g. user_abc123)"
                    className="w-full px-3.5 py-2.5 rounded-btn border border-light-border dark:border-dark-border bg-white dark:bg-dark-card text-light-text dark:text-dark-text text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    required
                  />
                </div>
              )}
            </div>

            {/* Notification Content */}
            <div className="space-y-4">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                2. Notification Content
              </label>

              <div>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Notification Title (e.g. 🔴 Live Masterclass Starting!)"
                  maxLength={100}
                  className="w-full px-3.5 py-2.5 rounded-btn border border-light-border dark:border-dark-border bg-white dark:bg-dark-card text-light-text dark:text-dark-text text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500"
                  required
                />
                <span className="text-[11px] text-slate-400 mt-1 block text-right">
                  {title.length}/100
                </span>
              </div>

              <div>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Notification Body (e.g. Join YouTube SEO masterclass now. Sir is answering live questions!)"
                  rows={3}
                  maxLength={300}
                  className="w-full px-3.5 py-2.5 rounded-btn border border-light-border dark:border-dark-border bg-white dark:bg-dark-card text-light-text dark:text-dark-text text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  required
                />
                <span className="text-[11px] text-slate-400 mt-1 block text-right">
                  {body.length}/300
                </span>
              </div>

              <div>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="Optional Banner Image URL (https://...)"
                  className="w-full px-3.5 py-2 rounded-btn border border-light-border dark:border-dark-border bg-white dark:bg-dark-card text-light-text dark:text-dark-text text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            {/* Action / Deep Link */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                3. On Tap Action
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'notifications', label: 'Feed Center', icon: <Bell className="w-4 h-4" /> },
                  { id: 'course', label: 'Open Course', icon: <BookOpen className="w-4 h-4" /> },
                  { id: 'live', label: 'Live Room', icon: <Radio className="w-4 h-4" /> },
                  { id: 'url', label: 'Web Link', icon: <ExternalLink className="w-4 h-4" /> },
                ].map((act) => (
                  <button
                    key={act.id}
                    type="button"
                    onClick={() => {
                      setActionType(act.id as any);
                      if (act.id === 'notifications') setActionData('');
                    }}
                    className={`p-2.5 rounded-btn border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      actionType === act.id
                        ? 'border-brand-600 bg-brand-50 dark:bg-brand-950/50 text-brand-600 dark:text-brand-400'
                        : 'border-light-border dark:border-dark-border text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                    }`}
                  >
                    {act.icon}
                    <span>{act.label}</span>
                  </button>
                ))}
              </div>

              {actionType !== 'notifications' && (
                <div className="mt-3">
                  <input
                    type="text"
                    value={actionData}
                    onChange={(e) => setActionData(e.target.value)}
                    placeholder={
                      actionType === 'course'
                        ? 'Course ID (e.g. course_yt_starter)'
                        : actionType === 'live'
                        ? 'Live Class ID (e.g. class_live_1)'
                        : 'External URL (https://...)'
                    }
                    className="w-full px-3.5 py-2 rounded-btn border border-light-border dark:border-dark-border bg-white dark:bg-dark-card text-light-text dark:text-dark-text text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    required
                  />
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={sending}
                className="w-full py-3.5 px-4 rounded-btn bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm shadow-md shadow-brand-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {sending ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Broadcasting Alert...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    <span>Send Push Broadcast</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Live Phone Preview (1 Col) */}
        <div className="bg-slate-100 dark:bg-dark-card/60 p-6 rounded-card border border-light-border dark:border-dark-border flex flex-col items-center justify-start">
          <div className="flex items-center gap-2 mb-4 text-xs font-bold uppercase tracking-wider text-slate-500">
            <Smartphone className="w-4 h-4" />
            <span>Mobile Lock Screen Preview</span>
          </div>

          <div className="w-full max-w-[280px] bg-slate-900 text-white rounded-3xl p-3 shadow-xl border-4 border-slate-700">
            {/* Phone Status bar mock */}
            <div className="flex justify-between items-center text-[10px] text-slate-400 px-2 pb-3">
              <span>09:41</span>
              <div className="flex items-center gap-1">
                <span>5G</span>
                <span>100%</span>
              </div>
            </div>

            {/* Push Banner Card */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/20 shadow-md">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-4 h-4 rounded-md bg-brand-600 flex items-center justify-center text-white text-[8px] font-bold">
                  YS
                </div>
                <span className="text-[11px] font-semibold text-slate-200">YouTube Sikho</span>
                <span className="text-[9px] text-slate-400 ml-auto">now</span>
              </div>
              <h4 className="text-xs font-bold text-white leading-tight">
                {title || '🔴 Live Masterclass Starting!'}
              </h4>
              <p className="text-[11px] text-slate-300 line-clamp-2 mt-0.5 leading-snug">
                {body || 'Join in now to learn secret algorithm ranking tactics directly with Sir.'}
              </p>
              {imageUrl && (
                <div className="mt-2 rounded-lg overflow-hidden h-24 bg-slate-800">
                  <img
                    src={imageUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>

            <div className="mt-8 text-center text-[10px] text-slate-500">
              Swipe up to open YouTube Sikho
            </div>
          </div>
        </div>
      </div>

      {/* Broadcast History Table */}
      <div className="bg-white dark:bg-dark-surface rounded-card border border-light-border dark:border-dark-border shadow-sm overflow-hidden">
        <div className="p-4 border-b border-light-border dark:border-dark-border flex items-center gap-2">
          <History className="w-5 h-5 text-slate-500" />
          <h3 className="font-bold font-display text-base text-light-text dark:text-dark-text">
            Broadcast History
          </h3>
          <span className="text-xs text-slate-400 ml-auto font-mono">
            Total Sent: {history.length}
          </span>
        </div>

        {loadingHistory ? (
          <div className="p-8 text-center text-slate-500 flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-brand-600" />
            <span>Loading history...</span>
          </div>
        ) : history.length === 0 ? (
          <div className="p-8 text-center text-slate-500 dark:text-slate-400">
            No notification broadcasts sent yet. Compose your first message above.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-dark-card/50 text-slate-500 dark:text-slate-400 text-xs uppercase font-semibold">
                <tr>
                  <th className="py-3 px-4">Notification</th>
                  <th className="py-3 px-4">Audience</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Recipients</th>
                  <th className="py-3 px-4">Sent Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-light-border dark:divide-dark-border">
                {history.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="py-3 px-4 max-w-xs">
                      <div className="font-semibold text-light-text dark:text-dark-text truncate">
                        {record.title}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {record.body}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                        {record.target === 'all'
                          ? 'All Students'
                          : record.target === 'course'
                          ? `Course: ${record.targetId}`
                          : `User: ${record.targetId}`}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-600 dark:text-slate-300">
                      {record.actionType}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-700 dark:text-slate-200">
                      {record.recipientCount}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-500">
                      {record.sentAt?.toDate
                        ? record.sentAt.toDate().toLocaleString('en-IN')
                        : 'Just now'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
