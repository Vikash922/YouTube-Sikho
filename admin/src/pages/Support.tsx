import React, { useState, useEffect } from 'react';
import {
  Plus,
  Trash2,
  CheckCircle,
  Loader2,
  AlertCircle,
  Mail,
  MessageSquare,
  Send,
  X,
  Edit2,
  HelpCircle,
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
import { db, auth } from '../firebase';
import { brandConfig } from '../config/branding';

export interface AdminTicket {
  id: string;
  uid: string;
  userName: string;
  email?: string;
  userEmail?: string;
  phone?: string;
  subject: string;
  message: string;
  status: 'open' | 'in_progress' | 'resolved';
  category?: string;
  adminReply?: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface TicketMessage {
  id: string;
  senderType: 'student' | 'admin';
  senderUid: string;
  senderName: string;
  text: string;
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

  // Selected ticket for conversation thread modal
  const [selectedTicket, setSelectedTicket] = useState<AdminTicket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  // FAQ Modal
  const [isFaqModalOpen, setIsFaqModalOpen] = useState(false);
  const [editingFaqId, setEditingFaqId] = useState<string | null>(null);
  const [faqQuestion, setFaqQuestion] = useState('');
  const [faqAnswer, setFaqAnswer] = useState('');
  const [faqCategory, setFaqCategory] = useState('General');
  const [faqOrder, setFaqOrder] = useState<number>(1);
  const [faqPublished, setFaqPublished] = useState(true);
  const [savingFaq, setSavingFaq] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Auto-clear feedback toast
  useEffect(() => {
    if (!feedback) return;
    const t = setTimeout(() => setFeedback(null), 4000);
    return () => clearTimeout(t);
  }, [feedback]);

  // Real-time listener for tickets
  useEffect(() => {
    const q = query(collection(db, 'tickets'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map((d) => {
          const data = d.data();
          // Normalize legacy 'closed' to canonical 'resolved'
          const rawStatus = data.status === 'closed' ? 'resolved' : data.status || 'open';
          return {
            id: d.id,
            ...data,
            status: rawStatus,
          } as AdminTicket;
        });
        setTickets(list);
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
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        } as AdminFAQ));
        setFaqs(list);
      },
      (err) => {
        console.warn('FAQs listener warning:', err.message);
      }
    );
    return () => unsubscribe();
  }, []);

  // Real-time listener for messages of selected ticket
  useEffect(() => {
    if (!selectedTicket?.id) {
      setMessages([]);
      return;
    }
    const msgsRef = collection(db, 'tickets', selectedTicket.id, 'messages');
    const q = query(msgsRef, orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        } as TicketMessage));
        setMessages(list);
      },
      (err) => {
        console.warn('Messages listener error:', err.message);
      }
    );
    return () => unsubscribe();
  }, [selectedTicket?.id]);

  const handleUpdateTicketStatus = async (ticketId: string, status: 'open' | 'in_progress' | 'resolved') => {
    try {
      await updateDoc(doc(db, 'tickets', ticketId), {
        status,
        updatedAt: serverTimestamp(),
      });
      if (selectedTicket && selectedTicket.id === ticketId) {
        setSelectedTicket((prev) => (prev ? { ...prev, status } : null));
      }
      setFeedback({ type: 'success', message: `Ticket status set to ${status.replace('_', ' ').toUpperCase()}.` });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Could not update ticket.' });
    }
  };

  const handleSendReply = async () => {
    if (!selectedTicket || !replyText.trim()) return;

    setSendingReply(true);
    const text = replyText.trim();
    try {
      const msgsRef = collection(db, 'tickets', selectedTicket.id, 'messages');
      await addDoc(msgsRef, {
        senderType: 'admin',
        senderUid: auth.currentUser?.uid || 'admin',
        senderName: auth.currentUser?.displayName || brandConfig.appName + ' Support',
        text,
        createdAt: serverTimestamp(),
      });

      // Update ticket with last reply and set to in_progress if open
      const newStatus = selectedTicket.status === 'open' ? 'in_progress' : selectedTicket.status;
      await updateDoc(doc(db, 'tickets', selectedTicket.id), {
        adminReply: text,
        status: newStatus,
        updatedAt: serverTimestamp(),
      });

      setSelectedTicket((prev) => (prev ? { ...prev, adminReply: text, status: newStatus } : null));
      setReplyText('');
      setFeedback({ type: 'success', message: 'Reply sent to student.' });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Could not send reply.' });
    } finally {
      setSendingReply(false);
    }
  };

  const handleOpenFaqModal = (faq?: AdminFAQ) => {
    if (faq) {
      setEditingFaqId(faq.id);
      setFaqQuestion(faq.question);
      setFaqAnswer(faq.answer);
      setFaqCategory(faq.category || 'General');
      setFaqOrder(faq.order || 1);
      setFaqPublished(faq.isPublished !== false);
    } else {
      setEditingFaqId(null);
      setFaqQuestion('');
      setFaqAnswer('');
      setFaqCategory('General');
      setFaqOrder(faqs.length + 1);
      setFaqPublished(true);
    }
    setIsFaqModalOpen(true);
  };

  const handleSaveFaq = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!faqQuestion.trim() || !faqAnswer.trim()) return;

    setSavingFaq(true);
    const payload = {
      question: faqQuestion.trim(),
      answer: faqAnswer.trim(),
      category: faqCategory.trim() || 'General',
      order: Number(faqOrder) || faqs.length + 1,
      isPublished: faqPublished,
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
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Could not save FAQ.' });
    } finally {
      setSavingFaq(false);
    }
  };

  const handleDeleteFaq = async (id: string) => {
    if (!window.confirm('Delete this FAQ entry permanently?')) return;
    try {
      await deleteDoc(doc(db, 'faqs', id));
      setFeedback({ type: 'success', message: 'FAQ deleted.' });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Could not delete FAQ.' });
    }
  };

  const handleToggleFaqPublish = async (faq: AdminFAQ) => {
    try {
      await updateDoc(doc(db, 'faqs', faq.id), {
        isPublished: !faq.isPublished,
        updatedAt: serverTimestamp(),
      });
      setFeedback({
        type: 'success',
        message: `FAQ is now ${!faq.isPublished ? 'published' : 'hidden'}.`,
      });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Could not update status.' });
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
            Review student help tickets, thread live conversations, and manage in-app FAQs.
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
            <span className="text-xs text-slate-400 font-mono">
              Click a ticket row to open live thread
            </span>
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
                    <th className="py-3 px-4">Subject & Query</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-light-border dark:divide-dark-border">
                  {tickets.map((t) => (
                    <tr
                      key={t.id}
                      onClick={() => setSelectedTicket(t)}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="font-semibold text-light-text dark:text-dark-text">
                          {t.userName || 'Student'}
                        </div>
                        <div className="text-xs text-slate-400 flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          <span>{t.userEmail || t.email || t.uid.slice(0, 10)}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 max-w-sm">
                        <div className="font-bold text-xs text-slate-800 dark:text-slate-200">
                          {t.subject}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                          {t.message}
                        </div>
                        {t.adminReply && (
                          <div className="text-[11px] text-brand-600 dark:text-brand-400 mt-1 flex items-center gap-1 font-medium">
                            <MessageSquare className="w-3 h-3" />
                            <span className="line-clamp-1">Latest: {t.adminReply}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-dark-card text-slate-600 dark:text-slate-300 uppercase">
                          {(t.category || 'general').replace('_', ' ')}
                        </span>
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
                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <select
                          value={t.status}
                          onChange={(e) => handleUpdateTicketStatus(t.id, e.target.value as any)}
                          className="px-2 py-1 text-xs rounded-lg border border-light-border dark:border-dark-border bg-white dark:bg-dark-card font-semibold"
                        >
                          <option value="open">Open</option>
                          <option value="in_progress">In Progress</option>
                          <option value="resolved">Resolved</option>
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

      {/* TICKET CONVERSATION MODAL */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-dark-surface rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-light-border dark:border-dark-border overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 border-b border-light-border dark:border-dark-border flex items-center justify-between bg-slate-50 dark:bg-dark-card/50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-brand-100 dark:bg-brand-950/50 flex items-center justify-center text-brand-600 dark:text-brand-400 font-bold text-sm">
                  {(selectedTicket.userName || 'S').charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-light-text dark:text-dark-text">
                    {selectedTicket.subject}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {selectedTicket.userName} ({selectedTicket.userEmail || selectedTicket.email || 'Student'})
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={selectedTicket.status}
                  onChange={(e) => handleUpdateTicketStatus(selectedTicket.id, e.target.value as any)}
                  className="px-2 py-1 text-xs rounded-lg border border-light-border dark:border-dark-border bg-white dark:bg-dark-surface font-semibold"
                >
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                </select>
                <button
                  onClick={() => setSelectedTicket(null)}
                  className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Conversation Messages */}
            <div className="p-4 flex-1 overflow-y-auto space-y-4 bg-slate-50/50 dark:bg-dark-card/20">
              {/* Initial ticket query */}
              <div className="p-3.5 rounded-xl bg-white dark:bg-dark-surface border border-light-border dark:border-dark-border shadow-xs">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {selectedTicket.userName || 'Student'} (Initial Query)
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {selectedTicket.createdAt?.toDate ? selectedTicket.createdAt.toDate().toLocaleTimeString('en-IN') : ''}
                  </span>
                </div>
                <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                  {selectedTicket.message}
                </p>
              </div>

              {/* Subcollection thread messages */}
              {messages.map((msg) => {
                const isAdmin = msg.senderType === 'admin';
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[80%] p-3.5 rounded-2xl text-sm ${
                        isAdmin
                          ? 'bg-brand-600 text-white rounded-br-xs shadow-sm'
                          : 'bg-white dark:bg-dark-surface text-slate-800 dark:text-slate-200 border border-light-border dark:border-dark-border rounded-bl-xs'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[11px] font-bold ${isAdmin ? 'text-brand-100' : 'text-slate-400'}`}>
                          {msg.senderName || (isAdmin ? 'Admin Support' : 'Student')}
                        </span>
                        <span className={`text-[10px] ${isAdmin ? 'text-brand-200' : 'text-slate-400'}`}>
                          {msg.createdAt?.toDate ? msg.createdAt.toDate().toLocaleTimeString('en-IN') : ''}
                        </span>
                      </div>
                      <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Reply Input Bar */}
            <div className="p-3 border-t border-light-border dark:border-dark-border bg-white dark:bg-dark-surface flex items-center gap-2">
              <input
                type="text"
                placeholder="Type your official response..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendReply();
                  }
                }}
                className="flex-1 px-3.5 py-2 text-sm rounded-xl border border-light-border dark:border-dark-border bg-slate-50 dark:bg-dark-card focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <button
                onClick={handleSendReply}
                disabled={sendingReply || !replyText.trim()}
                className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm"
              >
                {sendingReply ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Reply</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FAQS TAB */}
      {activeTab === 'faqs' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              FAQs created here appear directly in the mobile student app in real time.
            </p>
            <button
              onClick={() => handleOpenFaqModal()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-btn bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Add New FAQ</span>
            </button>
          </div>

          <div className="bg-white dark:bg-dark-surface rounded-card border border-light-border dark:border-dark-border shadow-sm overflow-hidden">
            {faqs.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                <HelpCircle className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p>No FAQs created yet. Click &quot;Add New FAQ&quot; to answer common student questions.</p>
              </div>
            ) : (
              <div className="divide-y divide-light-border dark:divide-dark-border">
                {faqs.map((faq, index) => (
                  <div key={faq.id} className="p-4 flex items-start justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-slate-400">#{index + 1}</span>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-dark-card text-slate-600 dark:text-slate-300">
                          {faq.category || 'General'}
                        </span>
                        <button
                          onClick={() => handleToggleFaqPublish(faq)}
                          className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                            faq.isPublished !== false
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                          }`}
                        >
                          {faq.isPublished !== false ? 'Published' : 'Hidden'}
                        </button>
                      </div>
                      <h4 className="font-bold text-sm text-light-text dark:text-dark-text pt-1">
                        {faq.question}
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                        {faq.answer}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0 pt-1">
                      <button
                        onClick={() => handleOpenFaqModal(faq)}
                        className="p-1.5 rounded-lg border border-light-border dark:border-dark-border hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                        title="Edit FAQ"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteFaq(faq.id)}
                        className="p-1.5 rounded-lg border border-red-200 dark:border-red-800/40 hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600"
                        title="Delete FAQ"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* FAQ ADD / EDIT MODAL */}
      {isFaqModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-dark-surface rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-light-border dark:border-dark-border">
            <h3 className="font-bold font-display text-lg text-light-text dark:text-dark-text mb-4">
              {editingFaqId ? 'Edit FAQ Item' : 'Create New FAQ Item'}
            </h3>

            <form onSubmit={handleSaveFaq} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">
                  Question
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. How do I access courses offline?"
                  value={faqQuestion}
                  onChange={(e) => setFaqQuestion(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-light-border dark:border-dark-border bg-slate-50 dark:bg-dark-card focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">
                  Answer
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Detailed explanation for the student..."
                  value={faqAnswer}
                  onChange={(e) => setFaqAnswer(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-light-border dark:border-dark-border bg-slate-50 dark:bg-dark-card focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">
                    Category
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Courses, Billing, Certificates"
                    value={faqCategory}
                    onChange={(e) => setFaqCategory(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-light-border dark:border-dark-border bg-slate-50 dark:bg-dark-card focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">
                    Display Order
                  </label>
                  <input
                    type="number"
                    value={faqOrder}
                    onChange={(e) => setFaqOrder(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-light-border dark:border-dark-border bg-slate-50 dark:bg-dark-card focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="faqPublishedCheck"
                  checked={faqPublished}
                  onChange={(e) => setFaqPublished(e.target.checked)}
                  className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 border-light-border dark:border-dark-border"
                />
                <label htmlFor="faqPublishedCheck" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Publish to mobile app immediately
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-light-border dark:border-dark-border">
                <button
                  type="button"
                  onClick={() => setIsFaqModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingFaq}
                  className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-2 shadow-sm"
                >
                  {savingFaq && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Save FAQ</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default Support;
