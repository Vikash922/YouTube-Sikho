import React, { useState, useEffect } from 'react';
import {
  Plus,
  Trash2,
  CheckCircle,
  Loader2,
  AlertCircle,
  Mail,
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
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';

export interface AdminTicket {
  id: string;
  uid: string;
  userName: string;
  email?: string;
  phone?: string;
  subject: string;
  message: string;
  status: 'open' | 'in_progress' | 'closed';
  createdAt?: any;
}

export interface AdminFAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
  order: number;
  isPublished: boolean;
}

export const Support: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'tickets' | 'faqs'>('tickets');
  const [tickets, setTickets] = useState<AdminTicket[]>([]);
  const [faqs, setFaqs] = useState<AdminFAQ[]>([]);
  const [loading, setLoading] = useState(true);

  // FAQ Modal
  const [isFaqModalOpen, setIsFaqModalOpen] = useState(false);
  const [editingFaqId, setEditingFaqId] = useState<string | null>(null);
  const [faqQuestion, setFaqQuestion] = useState('');
  const [faqAnswer, setFaqAnswer] = useState('');
  const [faqCategory, setFaqCategory] = useState('Courses');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Real-time listener for tickets
  useEffect(() => {
    const q = query(collection(db, 'tickets'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setTickets(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as AdminTicket)));
        setLoading(false);
      },
      (err) => {
        console.warn('Tickets listener warning:', err.message);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  // Real-time listener for FAQs
  useEffect(() => {
    const q = query(collection(db, 'faqs'), orderBy('order', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setFaqs(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as AdminFAQ)));
    });
    return () => unsubscribe();
  }, []);

  const handleUpdateTicketStatus = async (ticketId: string, status: 'open' | 'in_progress' | 'closed') => {
    try {
      await updateDoc(doc(db, 'tickets', ticketId), {
        status,
        updatedAt: serverTimestamp(),
      });
      setFeedback({ type: 'success', message: `Ticket status updated to ${status}.` });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Could not update ticket.' });
    }
  };

  const handleSaveFaq = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!faqQuestion.trim() || !faqAnswer.trim()) return;

    setSaving(true);
    const payload = {
      question: faqQuestion.trim(),
      answer: faqAnswer.trim(),
      category: faqCategory,
      order: faqs.length + 1,
      isPublished: true,
      updatedAt: serverTimestamp(),
    };

    try {
      if (editingFaqId) {
        await updateDoc(doc(db, 'faqs', editingFaqId), payload);
        setFeedback({ type: 'success', message: 'FAQ updated successfully!' });
      } else {
        await addDoc(collection(db, 'faqs'), {
          ...payload,
          createdAt: serverTimestamp(),
        });
        setFeedback({ type: 'success', message: 'FAQ created successfully!' });
      }
      setIsFaqModalOpen(false);
      setFaqQuestion('');
      setFaqAnswer('');
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Could not save FAQ.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteFaq = async (id: string) => {
    if (!window.confirm('Delete this FAQ entry?')) return;
    try {
      await deleteDoc(doc(db, 'faqs', id));
      setFeedback({ type: 'success', message: 'FAQ deleted.' });
    } catch (err: any) {
      console.warn('FAQ delete error:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-light-text dark:text-dark-text tracking-tight">
            Support Desk & Knowledge Base
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Review student help tickets, update resolution status, and manage in-app FAQ accordion.
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-dark-card p-1 rounded-btn self-start md:self-auto">
          <button
            onClick={() => setActiveTab('tickets')}
            className={`px-4 py-2 rounded-btn text-xs font-bold transition-all ${
              activeTab === 'tickets'
                ? 'bg-white dark:bg-dark-surface text-brand-600 dark:text-brand-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Student Tickets ({tickets.length})
          </button>
          <button
            onClick={() => setActiveTab('faqs')}
            className={`px-4 py-2 rounded-btn text-xs font-bold transition-all ${
              activeTab === 'faqs'
                ? 'bg-white dark:bg-dark-surface text-brand-600 dark:text-brand-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            FAQ Accordion ({faqs.length})
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

      {/* TICKETS TAB */}
      {activeTab === 'tickets' && (
        <div className="bg-white dark:bg-dark-surface rounded-card border border-light-border dark:border-dark-border shadow-sm overflow-hidden">
          <div className="p-4 border-b border-light-border dark:border-dark-border flex items-center justify-between">
            <h3 className="font-bold font-display text-base text-light-text dark:text-dark-text">
              Recent Inquiries
            </h3>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-500 flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-brand-600" />
              <span>Loading tickets...</span>
            </div>
          ) : tickets.length === 0 ? (
            <div className="p-12 text-center text-slate-500 dark:text-slate-400">
              No support tickets submitted yet. All students are satisfied!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-dark-card/50 text-slate-500 dark:text-slate-400 text-xs uppercase font-semibold">
                  <tr>
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Subject & Message</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Submitted</th>
                    <th className="py-3 px-4 text-right">Update Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-light-border dark:divide-dark-border">
                  {tickets.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-light-text dark:text-dark-text">
                          {t.userName || 'Student'}
                        </div>
                        <div className="text-xs text-slate-400 flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          <span>{t.email || t.uid}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 max-w-sm">
                        <div className="font-bold text-xs text-slate-800 dark:text-slate-200">
                          {t.subject}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                          {t.message}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            t.status === 'open'
                              ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                              : t.status === 'in_progress'
                              ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                              : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                          }`}
                        >
                          {t.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-500 font-mono">
                        {t.createdAt?.toDate ? t.createdAt.toDate().toLocaleDateString('en-IN') : 'Recently'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <select
                          value={t.status}
                          onChange={(e) => handleUpdateTicketStatus(t.id, e.target.value as any)}
                          className="px-2.5 py-1 text-xs rounded-lg border border-light-border dark:border-dark-border bg-white dark:bg-dark-card font-semibold"
                        >
                          <option value="open">Open</option>
                          <option value="in_progress">In Progress</option>
                          <option value="closed">Closed / Resolved</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* FAQS TAB */}
      {activeTab === 'faqs' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => {
                setEditingFaqId(null);
                setFaqQuestion('');
                setFaqAnswer('');
                setIsFaqModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-btn bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Add New FAQ</span>
            </button>
          </div>

          <div className="bg-white dark:bg-dark-surface rounded-card border border-light-border dark:border-dark-border shadow-sm divide-y divide-light-border dark:divide-dark-border">
            {faqs.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                No FAQs added yet. Click "Add New FAQ" to populate the student help accordion.
              </div>
            ) : (
              faqs.map((faq) => (
                <div key={faq.id} className="p-4 flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/60 px-2 py-0.5 rounded-full">
                      {faq.category}
                    </span>
                    <h4 className="text-sm font-bold text-light-text dark:text-dark-text mt-1">
                      {faq.question}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      {faq.answer}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteFaq(faq.id)}
                    className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg"
                    title="Delete FAQ"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* FAQ Creation Modal */}
      {isFaqModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-dark-surface w-full max-w-md rounded-card border border-light-border dark:border-dark-border shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-light-border dark:border-dark-border">
              <h3 className="text-base font-bold text-light-text dark:text-dark-text">
                Add FAQ Accordion Item
              </h3>
              <button
                onClick={() => setIsFaqModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveFaq} className="space-y-3">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                  Category
                </label>
                <select
                  value={faqCategory}
                  onChange={(e) => setFaqCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-btn border border-light-border dark:border-dark-border bg-white dark:bg-dark-card text-xs focus:ring-2 focus:ring-brand-500 outline-none"
                >
                  <option value="Courses">Courses & Access</option>
                  <option value="Live Classes">Live Classes</option>
                  <option value="Payments">Payments & Refunds</option>
                  <option value="Technical">Account & Technical</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                  Question
                </label>
                <input
                  type="text"
                  value={faqQuestion}
                  onChange={(e) => setFaqQuestion(e.target.value)}
                  placeholder="e.g. Can I watch lessons offline?"
                  className="w-full px-3 py-2 rounded-btn border border-light-border dark:border-dark-border bg-white dark:bg-dark-card text-xs font-semibold focus:ring-2 focus:ring-brand-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                  Answer
                </label>
                <textarea
                  value={faqAnswer}
                  onChange={(e) => setFaqAnswer(e.target.value)}
                  placeholder="Detailed answer shown when expanded in mobile app..."
                  rows={4}
                  className="w-full px-3 py-2 rounded-btn border border-light-border dark:border-dark-border bg-white dark:bg-dark-card text-xs focus:ring-2 focus:ring-brand-500 outline-none"
                  required
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-light-border dark:border-dark-border">
                <button
                  type="button"
                  onClick={() => setIsFaqModalOpen(false)}
                  className="px-3 py-1.5 rounded-btn border text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-1.5 rounded-btn bg-brand-600 text-white text-xs font-semibold"
                >
                  Save FAQ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
