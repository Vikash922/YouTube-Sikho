import React, { useState, useEffect } from 'react';
import {
  Radio,
  Plus,
  Play,
  Square,
  Edit,
  Trash2,
  Clock,
  ExternalLink,
  Loader2,
  CheckCircle,
  AlertCircle,
  Video,
} from 'lucide-react';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import { Course } from '../types';
import { LiveStudioModal } from '../components/live/LiveStudioModal';

export interface AdminLiveClass {
  id: string;
  title: string;
  courseId: string;
  courseTitle?: string;
  scheduledAt: string; // ISO string for form input
  status: 'scheduled' | 'live' | 'ended';
  streamUrl: string;
  streamProvider: 'youtube' | '100ms' | 'zegocloud';
  chatEnabled: boolean;
  viewerCount?: number;
  recordingUrl?: string;
  createdAt?: any;
}

export const LiveClasses: React.FC = () => {
  const [classes, setClasses] = useState<AdminLiveClass[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeStudioClass, setActiveStudioClass] = useState<AdminLiveClass | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form Fields
  const [title, setTitle] = useState('');
  const [courseId, setCourseId] = useState('free_for_all');
  const [scheduledAt, setScheduledAt] = useState('');
  const [streamUrl, setStreamUrl] = useState('');
  const [chatEnabled, setChatEnabled] = useState(true);
  const [recordingUrl, setRecordingUrl] = useState('');

  // Fetch Courses for Dropdown
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const snap = await getDocs(collection(db, 'courses'));
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Course));
        setCourses(list);
      } catch (err) {
        console.warn('Could not load courses for live selector:', err);
      }
    };
    fetchCourses();
  }, []);

  // Real-time listener on liveClasses collection
  useEffect(() => {
    const q = query(collection(db, 'liveClasses'), orderBy('scheduledAt', 'desc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as AdminLiveClass));
        setClasses(list);
        setLoading(false);
      },
      (err) => {
        console.warn('Live classes listener error:', err.message);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const openCreateModal = () => {
    setEditingId(null);
    setTitle('');
    setCourseId('free_for_all');
    // Default scheduled time: 1 hour from now formatted for datetime-local
    const d = new Date(Date.now() + 60 * 60 * 1000);
    setScheduledAt(d.toISOString().slice(0, 16));
    setStreamUrl('');
    setChatEnabled(true);
    setRecordingUrl('');
    setIsModalOpen(true);
  };

  const openEditModal = (item: AdminLiveClass) => {
    setEditingId(item.id);
    setTitle(item.title);
    setCourseId(item.courseId || 'free_for_all');
    setScheduledAt(item.scheduledAt ? item.scheduledAt.slice(0, 16) : '');
    setStreamUrl(item.streamUrl || '');
    setChatEnabled(item.chatEnabled !== false);
    setRecordingUrl(item.recordingUrl || '');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !streamUrl.trim() || !scheduledAt) {
      setFeedback({ type: 'error', message: 'Title, stream URL and scheduled time are required.' });
      return;
    }

    const cleanUrl = streamUrl.trim();
    const isStudio = cleanUrl === 'studio';
    const isHttpsYouTube =
      cleanUrl.startsWith('https://www.youtube.com/') ||
      cleanUrl.startsWith('https://youtu.be/') ||
      cleanUrl.startsWith('https://youtube.com/') ||
      cleanUrl.startsWith('https://www.youtube-nocookie.com/');
    const isHttpsMedia = cleanUrl.startsWith('https://') && (cleanUrl.includes('.m3u8') || cleanUrl.includes('.mp4'));

    if (!isStudio && !isHttpsYouTube && !isHttpsMedia) {
      setFeedback({
        type: 'error',
        message: 'Invalid stream URL: Must be an official HTTPS YouTube live link or HTTPS CDN video stream. Arbitrary or insecure (http) URLs are rejected.',
      });
      return;
    }

    setSaving(true);
    setFeedback(null);

    const selectedCourse = courses.find((c) => c.id === courseId);

    const payload = {
      title: title.trim(),
      courseId,
      courseTitle: courseId === 'free_for_all' ? 'Free for all students' : selectedCourse?.title || '',
      scheduledAt: new Date(scheduledAt).toISOString(),
      streamUrl: streamUrl.trim(),
      streamProvider: 'youtube' as const,
      chatEnabled,
      recordingUrl: recordingUrl.trim() || null,
      updatedAt: serverTimestamp(),
    };

    try {
      if (editingId) {
        await updateDoc(doc(db, 'liveClasses', editingId), payload);
        setFeedback({ type: 'success', message: 'Live class updated successfully!' });
      } else {
        await addDoc(collection(db, 'liveClasses'), {
          ...payload,
          status: 'scheduled',
          viewerCount: 0,
          createdAt: serverTimestamp(),
        });
        setFeedback({ type: 'success', message: 'New live class scheduled successfully!' });
      }
      setIsModalOpen(false);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to save live class.' });
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (id: string, newStatus: 'scheduled' | 'live' | 'ended') => {
    try {
      await updateDoc(doc(db, 'liveClasses', id), {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });
      setFeedback({ type: 'success', message: `Class status updated to "${newStatus.toUpperCase()}".` });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to update status.' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this live class?')) return;
    try {
      await deleteDoc(doc(db, 'liveClasses', id));
      setFeedback({ type: 'success', message: 'Live class deleted successfully.' });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to delete class.' });
    }
  };

  const handleStartInstantStudio = async (existingClass?: AdminLiveClass) => {
    if (existingClass) {
      setActiveStudioClass(existingClass);
      return;
    }

    try {
      const docRef = await addDoc(collection(db, 'liveClasses'), {
        title: `Live Studio Class - ${new Date().toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
        courseId: 'free_for_all',
        courseTitle: 'Free for all students',
        scheduledAt: new Date().toISOString(),
        status: 'live',
        streamUrl: 'studio',
        streamProvider: 'studio',
        chatEnabled: true,
        viewerCount: 1,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setActiveStudioClass({
        id: docRef.id,
        title: `Live Studio Class - ${new Date().toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
        courseId: 'free_for_all',
        courseTitle: 'Free for all students',
        scheduledAt: new Date().toISOString(),
        status: 'live',
        streamUrl: 'studio',
        streamProvider: 'youtube',
        chatEnabled: true,
        viewerCount: 1,
      });
    } catch (e: any) {
      setFeedback({ type: 'error', message: e.message || 'Could not start studio live.' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-light-text dark:text-dark-text tracking-tight">
            Live Interactive Classes
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Broadcast camera and screen share directly from browser, or host YouTube live sessions.
          </p>
        </div>
        <div className="flex items-center gap-3 self-start md:self-auto flex-wrap">
          <button
            onClick={() => handleStartInstantStudio()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-btn bg-red-600 hover:bg-red-700 text-white font-semibold text-sm shadow-md shadow-red-500/20 transition-all animate-pulse"
          >
            <Radio className="w-4 h-4" />
            <span>Go Live (Camera & Screen Share)</span>
          </button>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-btn bg-slate-800 hover:bg-slate-900 text-white font-semibold text-sm shadow-md transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Schedule Session</span>
          </button>
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

      {/* Class List Table */}
      <div className="bg-white dark:bg-dark-surface rounded-card border border-light-border dark:border-dark-border shadow-sm overflow-hidden">
        <div className="p-4 border-b border-light-border dark:border-dark-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-red-500 animate-pulse" />
            <h3 className="font-bold font-display text-base text-light-text dark:text-dark-text">
              Sessions ({classes.length})
            </h3>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500 flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-brand-600" />
            <span>Loading live classes...</span>
          </div>
        ) : classes.length === 0 ? (
          <div className="p-12 text-center text-slate-500 dark:text-slate-400">
            No live classes scheduled yet. Click "Schedule Live Class" to create your first session.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-dark-card/50 text-slate-500 dark:text-slate-400 text-xs uppercase font-semibold">
                <tr>
                  <th className="py-3 px-4">Session Title</th>
                  <th className="py-3 px-4">Audience</th>
                  <th className="py-3 px-4">Scheduled Time</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Live Controls</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-light-border dark:divide-dark-border">
                {classes.map((cls) => {
                  const isLive = cls.status === 'live';
                  const isEnded = cls.status === 'ended';

                  return (
                    <tr key={cls.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="py-3 px-4 max-w-xs">
                        <div className="font-semibold text-light-text dark:text-dark-text truncate">
                          {cls.title}
                        </div>
                        <a
                          href={cls.streamUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-brand-600 dark:text-brand-400 hover:underline inline-flex items-center gap-1 mt-0.5"
                        >
                          <Video className="w-3.5 h-3.5" />
                          <span>Stream Link</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </td>

                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {cls.courseId === 'free_for_all' ? 'Free for all' : cls.courseTitle || 'Paid Course'}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-400">
                        <div className="flex items-center gap-1 font-mono">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {new Date(cls.scheduledAt).toLocaleString('en-IN', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        {isLive ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 animate-pulse">
                            <span className="w-2 h-2 rounded-full bg-red-600" />
                            LIVE NOW
                          </span>
                        ) : isEnded ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                            Ended
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
                            Scheduled
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleStartInstantStudio(cls)}
                            className="px-2.5 py-1 rounded-lg bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/60 dark:hover:bg-brand-900/60 text-brand-600 dark:text-brand-400 font-semibold text-xs flex items-center gap-1 transition-all"
                            title="Open Camera & Screen Share Studio"
                          >
                            <Video className="w-3.5 h-3.5" />
                            <span>Studio</span>
                          </button>

                          {!isLive && !isEnded && (
                            <button
                              onClick={() => handleStatusChange(cls.id, 'live')}
                              className="px-3 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold text-xs flex items-center gap-1 transition-all shadow-sm shadow-red-500/20"
                            >
                              <Play className="w-3.5 h-3.5" />
                              <span>Go Live</span>
                            </button>
                          )}

                          {isLive && (
                            <button
                              onClick={() => handleStatusChange(cls.id, 'ended')}
                              className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs flex items-center gap-1 transition-all"
                            >
                              <Square className="w-3.5 h-3.5" />
                              <span>End Session</span>
                            </button>
                          )}

                          {isEnded && (
                            <button
                              onClick={() => handleStatusChange(cls.id, 'live')}
                              className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100"
                            >
                              Restart
                            </button>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEditModal(cls)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-brand-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(cls.id)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Schedule / Edit Class Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-dark-surface w-full max-w-lg rounded-card border border-light-border dark:border-dark-border shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-light-border dark:border-dark-border">
              <h3 className="text-lg font-bold font-display text-light-text dark:text-dark-text">
                {editingId ? 'Edit Live Class' : 'Schedule New Live Class'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                  Class Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. YouTube Monetization & RPM Doubling Masterclass"
                  className="w-full px-3.5 py-2.5 rounded-btn border border-light-border dark:border-dark-border bg-white dark:bg-dark-card text-sm font-semibold focus:ring-2 focus:ring-brand-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                  Target Course Cohort
                </label>
                <select
                  value={courseId}
                  onChange={(e) => setCourseId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-btn border border-light-border dark:border-dark-border bg-white dark:bg-dark-card text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                >
                  <option value="free_for_all">Free for all students (Public)</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title} (Only Enrolled Students)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                  Scheduled Start Time
                </label>
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-btn border border-light-border dark:border-dark-border bg-white dark:bg-dark-card text-sm font-mono focus:ring-2 focus:ring-brand-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                  YouTube Live Stream Link
                </label>
                <input
                  type="url"
                  value={streamUrl}
                  onChange={(e) => setStreamUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=... or https://youtu.be/..."
                  className="w-full px-3.5 py-2.5 rounded-btn border border-light-border dark:border-dark-border bg-white dark:bg-dark-card text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                  Recording URL (Optional, after session ends)
                </label>
                <input
                  type="url"
                  value={recordingUrl}
                  onChange={(e) => setRecordingUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3.5 py-2 rounded-btn border border-light-border dark:border-dark-border bg-white dark:bg-dark-card text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="chatToggle"
                  checked={chatEnabled}
                  onChange={(e) => setChatEnabled(e.target.checked)}
                  className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500"
                />
                <label htmlFor="chatToggle" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Enable Real-Time Interactive Live Chat
                </label>
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-light-border dark:border-dark-border">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-btn border border-light-border dark:border-dark-border text-sm font-medium hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-btn bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold shadow-md shadow-brand-500/20 disabled:opacity-50 flex items-center gap-2"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{editingId ? 'Update Session' : 'Save & Schedule'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Live Studio Camera & Screen Broadcast Modal */}
      {activeStudioClass && (
        <LiveStudioModal
          isOpen={true}
          onClose={() => setActiveStudioClass(null)}
          liveClass={activeStudioClass}
        />
      )}
    </div>
  );
};
