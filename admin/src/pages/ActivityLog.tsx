import React, { useState, useEffect } from 'react';
import {
  Clock,
  Activity,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Loader2,
} from 'lucide-react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

export interface AuditLogItem {
  id: string;
  actorUid: string;
  action: string;
  targetType: string;
  targetId: string;
  metadata?: Record<string, any>;
  createdAt?: any;
}

export const ActivityLog: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAction, setSelectedAction] = useState<string>('all');

  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, 'auditLog'), orderBy('createdAt', 'desc'), limit(100));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as AuditLogItem[];
        setLogs(items);
        setLoading(false);
      },
      (err) => {
        console.warn('ActivityLog listener warning:', err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.targetId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.actorUid.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesAction =
      selectedAction === 'all' || log.action === selectedAction || log.targetType === selectedAction;

    return matchesSearch && matchesAction;
  });

  const getActionBadge = (action: string) => {
    if (action.includes('delete') || action.includes('revoke')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400 border border-red-200 dark:border-red-900/50">
          <AlertTriangle className="w-3 h-3" />
          {action}
        </span>
      );
    }
    if (action.includes('grant') || action.includes('create') || action.includes('complete')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50">
          <CheckCircle2 className="w-3 h-3" />
          {action}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50">
        <Activity className="w-3 h-3" />
        {action}
      </span>
    );
  };

  const formatTimestamp = (ts: any) => {
    if (!ts) return 'Just now';
    try {
      const date = ts.toDate ? ts.toDate() : new Date(ts);
      return date.toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
    } catch {
      return 'Recent';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Activity className="w-7 h-7 text-brand-600 dark:text-brand-400" />
            Security & Activity Audit Log
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Tamper-proof chronological records of administrative operations, enrollments, refunds, and purges.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-500 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800">
            {logs.length} Total Events
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by action, target ID, or actor UID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
            className="px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="all">All Events</option>
            <option value="enroll_grant">Enrollment Grants</option>
            <option value="enroll_revoke">Enrollment Revocations</option>
            <option value="payment_refund">Payment Refunds</option>
            <option value="delete_course">Course Deletions</option>
            <option value="delete_quiz">Quiz Deletions</option>
            <option value="delete_live_class">Live Class Deletions</option>
            <option value="delete_account">Account Purges</option>
            <option value="send_notification">Notifications</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center text-slate-400 gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
            <span className="text-sm font-medium">Loading audit events...</span>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-slate-500 dark:text-slate-400">
            <FileText className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="font-semibold text-slate-700 dark:text-slate-300">No audit events match your filter</p>
            <p className="text-xs text-slate-500 mt-1">Actions performed by administrators will appear here automatically.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 text-xs font-semibold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Target Type</th>
                  <th className="py-3 px-4">Target ID</th>
                  <th className="py-3 px-4">Actor UID</th>
                  <th className="py-3 px-4">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-4 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {formatTimestamp(log.createdAt)}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {getActionBadge(log.action)}
                    </td>
                    <td className="py-3.5 px-4 text-xs font-medium text-slate-700 dark:text-slate-300 capitalize">
                      {log.targetType}
                    </td>
                    <td className="py-3.5 px-4 text-xs font-mono text-slate-600 dark:text-slate-400 max-w-[140px] truncate" title={log.targetId}>
                      {log.targetId}
                    </td>
                    <td className="py-3.5 px-4 text-xs font-mono text-slate-500 max-w-[120px] truncate" title={log.actorUid}>
                      {log.actorUid}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-600 dark:text-slate-400">
                      {log.metadata ? (
                        <span className="font-mono text-[11px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                          {JSON.stringify(log.metadata).slice(0, 45)}
                          {JSON.stringify(log.metadata).length > 45 ? '...' : ''}
                        </span>
                      ) : (
                        '-'
                      )}
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
