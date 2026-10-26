import React, { useState, useEffect } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  User,
} from 'lucide-react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { DataTable, Column } from '../components/common/DataTable';

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

  useEffect(() => {
    const q = query(collection(db, 'auditLog'), orderBy('createdAt', 'desc'), limit(500));

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

  const getActionBadge = (action: string) => {
    if (action.includes('delete') || action.includes('revoke') || action.includes('blocked')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400">
          <AlertTriangle className="w-3 h-3" />
          {action}
        </span>
      );
    }
    if (action.includes('grant') || action.includes('create') || action.includes('complete') || action.includes('unblocked')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
          <CheckCircle2 className="w-3 h-3" />
          {action}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400">
        <Activity className="w-3 h-3" />
        {action}
      </span>
    );
  };

  const columns: Column<AuditLogItem>[] = [
    {
      header: 'Action',
      accessorKey: 'action',
      sortable: true,
      cell: (log) => getActionBadge(log.action),
    },
    {
      header: 'Target',
      accessorKey: 'targetType',
      sortable: true,
      cell: (log) => (
        <div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-dark-card text-slate-700 dark:text-slate-300 uppercase">
            {log.targetType}
          </span>
          <div className="text-[11px] text-slate-400 font-mono mt-1">
            ID: {log.targetId}
          </div>
        </div>
      ),
    },
    {
      header: 'Actor UID',
      accessorKey: 'actorUid',
      sortable: true,
      cell: (log) => (
        <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 font-mono">
          <User className="w-3.5 h-3.5 text-slate-400" />
          <span>{log.actorUid.slice(0, 12)}...</span>
        </div>
      ),
    },
    {
      header: 'Metadata / Reason',
      cell: (log) => {
        if (!log.metadata || Object.keys(log.metadata).length === 0) {
          return <span className="text-xs text-slate-400">—</span>;
        }
        return (
          <div className="text-[11px] text-slate-500 font-mono max-w-xs truncate">
            {JSON.stringify(log.metadata)}
          </div>
        );
      },
    },
    {
      header: 'Timestamp',
      accessorKey: 'createdAt',
      sortable: true,
      cell: (log) => {
        const ts = log.createdAt;
        const formatted = ts?.toDate
          ? ts.toDate().toLocaleString('en-IN')
          : ts
          ? new Date(ts).toLocaleString('en-IN')
          : 'Recently';
        return <span className="text-xs text-slate-500 font-mono">{formatted}</span>;
      },
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display text-light-text dark:text-dark-text tracking-tight">
          System Audit & Activity Log
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Cryptographically timestamped trail of administrative actions, enrollments, and security events.
        </p>
      </div>

      <DataTable
        data={logs}
        columns={columns}
        loading={loading}
        searchPlaceholder="Search audit log by action, target or actor..."
        exportFileName="audit-logs.csv"
        emptyMessage="No administrative actions logged yet."
      />
    </div>
  );
};

export default ActivityLog;
