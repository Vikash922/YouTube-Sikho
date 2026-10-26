import React, { useState } from 'react';
import { ShieldAlert, CheckCircle, Send, ArrowLeft, Loader2, Info } from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

export const PublicAccountDeletion: React.FC = () => {
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [reason, setReason] = useState('');
  const [confirmUnderstood, setConfirmUnderstood] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailOrPhone.trim()) {
      setError('Please provide your registered Email or Mobile Number.');
      return;
    }
    if (!confirmUnderstood) {
      setError('Please acknowledge that account deletion is permanent and irreversible.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await addDoc(collection(db, 'accountDeletionRequests'), {
        identifier: emailOrPhone.trim(),
        reason: reason.trim() || 'User request via public portal',
        status: 'pending',
        submittedAt: serverTimestamp(),
        createdAt: new Date().toISOString(),
      });
      setSubmitted(true);
    } catch (err: any) {
      console.error('Account deletion request error:', err);
      setError('Failed to submit request. Please email support directly at support@youtubesikho.com');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 p-8">
        <div className="flex items-center gap-3 text-red-600 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-950/50 flex items-center justify-center">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Request Account & Data Deletion</h1>
            <p className="text-xs text-slate-500">YouTube Sikho Academy Data Privacy Portal</p>
          </div>
        </div>

        {submitted ? (
          <div className="text-center py-8 space-y-4">
            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Deletion Request Received</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Your request for <span className="font-semibold text-slate-800 dark:text-slate-200">{emailOrPhone}</span> has been logged. Our data protection team will verify and permanently purge your account and records within 7 business days.
            </p>
            <a
              href="/"
              className="inline-flex items-center gap-2 text-sm font-semibold text-brand-600 hover:underline pt-4"
            >
              <ArrowLeft className="w-4 h-4" /> Return to Home
            </a>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-2xl text-xs text-amber-800 dark:text-amber-200 space-y-1">
              <div className="flex items-center gap-2 font-bold">
                <Info className="w-4 h-4" /> What will be deleted:
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-slate-600 dark:text-slate-400 pt-1">
                <li>Your profile details, name, phone, and email address.</li>
                <li>Your course progress, completed lessons, and study records.</li>
                <li>Your quiz attempts, test submissions, and high scores.</li>
                <li>Customer support tickets, reviews, and uploaded avatar media.</li>
              </ul>
            </div>

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-950/40 text-red-600 text-sm rounded-xl border border-red-200 dark:border-red-800">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                Registered Email or Mobile Number *
              </label>
              <input
                type="text"
                required
                value={emailOrPhone}
                onChange={(e) => setEmailOrPhone(e.target.value)}
                placeholder="e.g., student@example.com or +91 9876543210"
                className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-brand-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                Reason for leaving (Optional)
              </label>
              <textarea
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Tell us why you wish to delete your account..."
                className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-brand-500 outline-none"
              />
            </div>

            <div className="flex items-start gap-3 pt-2">
              <input
                type="checkbox"
                id="confirm"
                checked={confirmUnderstood}
                onChange={(e) => setConfirmUnderstood(e.target.checked)}
                className="mt-1 w-4 h-4 rounded text-red-600 focus:ring-red-500 border-slate-300"
              />
              <label htmlFor="confirm" className="text-xs text-slate-600 dark:text-slate-400">
                I understand that account deletion is permanent and cannot be undone. I will lose access to all purchased courses and certificates.
              </label>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
              <a href="/" className="text-xs font-semibold text-slate-500 hover:underline">
                Cancel
              </a>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold shadow-lg shadow-red-600/30 flex items-center gap-2 disabled:opacity-50"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Submit Deletion Request
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
