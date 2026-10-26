import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  UserPlus,
  Shield,
  Trash2,
  AlertCircle,
  CheckCircle,
  Loader2,
  Search,
} from 'lucide-react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db, functions, httpsCallable } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/common/Button';

interface AdminRecord {
  id: string; // uid
  email: string;
  role: 'owner' | 'editor' | 'support' | 'admin';
  active: boolean;
  updatedAt?: any;
  updatedBy?: string;
}

export const Admins: React.FC = () => {
  const { adminData } = useAuth();
  const [adminsList, setAdminsList] = useState<AdminRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [targetUid, setTargetUid] = useState('');
  const [targetRole, setTargetRole] = useState<'owner' | 'editor' | 'support'>('editor');
  const [actionLoading, setActionLoading] = useState(false);

  const isOwner = adminData?.role === 'owner';

  useEffect(() => {
    document.title = 'Admin Role Management | Admin Console';
    const q = query(collection(db, 'admins'), orderBy('updatedAt', 'desc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as any),
        }));
        setAdminsList(list);
        setLoading(false);
      },
      (err) => {
        console.warn('Admins listener error:', err.message);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleSetRole = async (uid: string, role: 'owner' | 'editor' | 'support', grantAdmin: boolean = true) => {
    if (!isOwner) {
      setFeedback({ type: 'error', message: 'Only accounts with role "owner" can manage administrators.' });
      return;
    }

    setActionLoading(true);
    setFeedback(null);
    try {
      const setClaimCallable = httpsCallable<
        { targetUid: string; admin: boolean; role: string },
        { success: boolean }
      >(functions, 'setAdminClaim');

      await setClaimCallable({
        targetUid: uid.trim(),
        admin: grantAdmin,
        role,
      });

      setFeedback({
        type: 'success',
        message: grantAdmin ? `Admin role updated to '${role}' successfully.` : 'Administrator claim revoked.',
      });
      setIsModalOpen(false);
      setTargetUid('');
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to update admin role.' });
    } finally {
      setActionLoading(false);
    }
  };

  const filteredAdmins = adminsList.filter((a) =>
    a.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-display text-light-text dark:text-dark-text">
            Administrator Roles & Access
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Control elevated RBAC permissions across Owner, Editor, and Support staff
          </p>
        </div>

        {isOwner && (
          <Button
            variant="primary"
            size="sm"
            icon={<UserPlus className="w-4 h-4" />}
            onClick={() => {
              setTargetUid('');
              setTargetRole('editor');
              setIsModalOpen(true);
            }}
          >
            Assign Admin Role
          </Button>
        )}
      </div>

      {/* Role explanation cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-dark-surface p-4 rounded-xl border border-light-border dark:border-dark-border shadow-sm">
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-sm mb-1">
            <Shield className="w-4 h-4" />
            <span>Owner</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Full permissions: can issue payment refunds, manage settings, assign and revoke admin roles.
          </p>
        </div>

        <div className="bg-white dark:bg-dark-surface p-4 rounded-xl border border-light-border dark:border-dark-border shadow-sm">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>Editor</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Can create & modify courses, lessons, quizzes, banners, categories, and push notifications. Cannot issue refunds.
          </p>
        </div>

        <div className="bg-white dark:bg-dark-surface p-4 rounded-xl border border-light-border dark:border-dark-border shadow-sm">
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-sm mb-1">
            <Shield className="w-4 h-4" />
            <span>Support</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Can respond to student help desk tickets, update FAQs, and view enrolled student rosters. Cannot modify content.
          </p>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl flex items-center gap-2 text-xs font-semibold ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/50'
              : 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 border border-red-200 dark:border-red-900/50'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Admins Table */}
      <div className="bg-white dark:bg-dark-surface rounded-card border border-light-border dark:border-dark-border shadow-sm overflow-hidden">
        <div className="p-4 border-b border-light-border dark:border-dark-border flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by email or UID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-dark-bg border border-light-border dark:border-dark-border text-light-text dark:text-dark-text"
            />
          </div>
          <div className="text-xs text-slate-400 font-mono">
            {filteredAdmins.length} administrators
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-light-text dark:text-dark-text">
            <thead className="bg-slate-50 dark:bg-dark-bg/60 text-slate-500 uppercase tracking-wider font-semibold border-b border-light-border dark:border-dark-border">
              <tr>
                <th className="px-4 py-3">Administrator</th>
                <th className="px-4 py-3">Assigned Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-light-border dark:divide-dark-border">
              {loading ? (
                <tr>
                  <td colSpan={4} className="text-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-brand-600 mb-2" />
                    <span className="text-slate-400">Loading administrators...</span>
                  </td>
                </tr>
              ) : filteredAdmins.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-slate-400">
                    No administrators found matching query.
                  </td>
                </tr>
              ) : (
                filteredAdmins.map((admin) => (
                  <tr key={admin.id} className="hover:bg-slate-50/50 dark:hover:bg-dark-bg/40 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {admin.email || 'System Administrator'}
                      </div>
                      <div className="font-mono text-[10px] text-slate-400">{admin.id}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          admin.role === 'owner'
                            ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                            : admin.role === 'editor'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                        }`}
                      >
                        {admin.role || 'admin'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
                          admin.active !== false ? 'text-emerald-600' : 'text-red-500'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${admin.active !== false ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        {admin.active !== false ? 'Active' : 'Revoked'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {isOwner && admin.id !== adminData?.uid ? (
                        <div className="flex items-center justify-end gap-2">
                          <select
                            value={admin.role || 'editor'}
                            onChange={(e) => handleSetRole(admin.id, e.target.value as any, true)}
                            className="text-[11px] px-2 py-1 rounded bg-slate-50 dark:bg-dark-bg border border-light-border dark:border-dark-border"
                          >
                            <option value="owner">Owner</option>
                            <option value="editor">Editor</option>
                            <option value="support">Support</option>
                          </select>
                          <button
                            onClick={() => handleSetRole(admin.id, (admin.role as any) || 'editor', false)}
                            className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                            title="Revoke Admin Access"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">
                          {admin.id === adminData?.uid ? 'Current Account' : 'Protected'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Assign New Admin */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white dark:bg-dark-surface rounded-2xl border border-light-border dark:border-dark-border p-6 shadow-2xl">
            <h3 className="text-base font-bold text-light-text dark:text-dark-text mb-2">
              Assign Administrator Claim
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Enter the Firebase Auth UID of the registered user and choose their elevated administrative role.
            </p>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                  User UID
                </label>
                <input
                  type="text"
                  placeholder="e.g. 7qZ2K9..."
                  value={targetUid}
                  onChange={(e) => setTargetUid(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-dark-bg border border-light-border dark:border-dark-border text-xs font-mono text-light-text dark:text-dark-text"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                  Administrative Role
                </label>
                <select
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-dark-bg border border-light-border dark:border-dark-border text-xs text-light-text dark:text-dark-text"
                >
                  <option value="owner">Owner (Full unrestricted admin + roles + refunds)</option>
                  <option value="editor">Editor (Courses, quizzes, materials, notifications)</option>
                  <option value="support">Support (Tickets, FAQs, view students)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                loading={actionLoading}
                disabled={!targetUid.trim() || actionLoading}
                onClick={() => handleSetRole(targetUid, targetRole, true)}
              >
                Promote Admin
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
