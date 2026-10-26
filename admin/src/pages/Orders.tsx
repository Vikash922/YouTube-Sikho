import React, { useState, useEffect } from 'react';
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import {
  CheckCircle2,
  Clock,
  RotateCcw,
  User,
  ShieldAlert,
  Loader2,
} from 'lucide-react';
import { db, functions, httpsCallable } from '../firebase';
import { Order } from '../types';
import { useToast } from '../context/ToastContext';
import { DataTable, Column } from '../components/common/DataTable';

export const Orders: React.FC = () => {
  const { showToast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'created' | 'refunded'>('all');

  // Refund dialog state
  const [refundingOrder, setRefundingOrder] = useState<Order | null>(null);
  const [refundReason, setRefundReason] = useState('Customer requested refund within 7-day guarantee');
  const [processingRefund, setProcessingRefund] = useState(false);

  useEffect(() => {
    // Limit to latest 500 orders to avoid runaway memory, ordered by date
    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'), limit(500));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        })) as Order[];
        setOrders(items);
        setLoading(false);
      },
      (err) => {
        console.warn('Orders onSnapshot error:', err.message);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleExecuteRefund = async () => {
    if (!refundingOrder) return;
    setProcessingRefund(true);
    try {
      const refundCallable = httpsCallable<
        { orderId: string; reason: string },
        { success: boolean; refundId?: string; message?: string }
      >(functions, 'refundPayment');

      const res = await refundCallable({
        orderId: refundingOrder.id,
        reason: refundReason,
      });

      showToast(`Refund processed successfully: ${res.data.refundId || 'Success'}`, 'success');
      setRefundingOrder(null);
    } catch (err: any) {
      console.error('Refund execution error:', err);
      showToast(err.message || 'Refund processing failed', 'error');
    } finally {
      setProcessingRefund(false);
    }
  };

  const filteredByStatus = statusFilter === 'all'
    ? orders
    : orders.filter((o) => o.status === statusFilter);

  const formatAmount = (order: Order) => {
    if (order.amountPaise !== undefined) {
      return `₹${(order.amountPaise / 100).toLocaleString('en-IN')}`;
    }
    if (typeof order.amount === 'number') {
      return `₹${order.amount.toLocaleString('en-IN')}`;
    }
    return `₹${order.amount || 0}`;
  };

  const orderColumns: Column<Order>[] = [
    {
      header: 'Order Details',
      accessorKey: 'id',
      sortable: true,
      cell: (order) => (
        <div>
          <div className="font-semibold text-light-text dark:text-dark-text text-xs">
            {order.courseTitle || 'Masterclass Enrollment'}
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            {order.id}
          </div>
        </div>
      ),
    },
    {
      header: 'Student UID',
      accessorKey: 'uid',
      sortable: true,
      cell: (order) => (
        <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 font-mono">
          <User className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          <span className="truncate max-w-[140px]">{order.uid || 'Anonymous'}</span>
        </div>
      ),
    },
    {
      header: 'Amount',
      accessorKey: 'amount',
      sortable: true,
      cell: (order) => (
        <span className="font-bold text-xs font-mono text-light-text dark:text-dark-text">
          {formatAmount(order)}
        </span>
      ),
    },
    {
      header: 'Status',
      accessorKey: 'status',
      sortable: true,
      cell: (order) => (
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
            order.status === 'paid'
              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
              : order.status === 'refunded'
              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
              : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
          }`}
        >
          {order.status === 'paid' && <CheckCircle2 className="w-3 h-3" />}
          {order.status === 'refunded' && <RotateCcw className="w-3 h-3" />}
          {order.status === 'created' && <Clock className="w-3 h-3" />}
          <span className="capitalize">{order.status}</span>
        </span>
      ),
    },
    {
      header: 'Date',
      accessorKey: 'createdAt',
      sortable: true,
      cell: (order) => (
        <span className="text-xs text-slate-500 font-mono">
          {order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-IN') : 'Recently'}
        </span>
      ),
    },
    {
      header: 'Actions',
      cell: (order) => (
        <div className="text-right">
          {order.status === 'paid' ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setRefundingOrder(order);
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 font-semibold transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Refund</span>
            </button>
          ) : (
            <span className="text-xs text-slate-400">—</span>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-light-text dark:text-dark-text tracking-tight">
            Orders & Transactions
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time audit log of student payments, Razorpay transactions, and access grants.
          </p>
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-dark-card p-1 rounded-btn self-start md:self-auto">
          {(['all', 'paid', 'created', 'refunded'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-btn text-xs font-bold capitalize transition-all ${
                statusFilter === st
                  ? 'bg-white dark:bg-dark-surface text-brand-600 dark:text-brand-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Orders DataTable */}
      <DataTable
        data={filteredByStatus}
        columns={orderColumns}
        loading={loading}
        searchPlaceholder="Search orders by ID, course, or student UID..."
        exportFileName="orders-transactions.csv"
        emptyMessage="No matching orders found."
      />

      {/* REFUND MODAL */}
      {refundingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-dark-surface rounded-2xl max-w-md w-full p-6 shadow-2xl border border-light-border dark:border-dark-border">
            <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/50 text-rose-600 flex items-center justify-center mb-4">
              <ShieldAlert className="w-6 h-6" />
            </div>

            <h3 className="font-bold font-display text-lg text-light-text dark:text-dark-text mb-1">
              Issue Official Refund
            </h3>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              This will trigger a full refund of <strong className="text-light-text dark:text-dark-text">{formatAmount(refundingOrder)}</strong> back to the customer&apos;s original payment method and revoke their course enrollment immediately.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">
                  Reason for Refund
                </label>
                <textarea
                  rows={3}
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-light-border dark:border-dark-border bg-slate-50 dark:bg-dark-card focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-light-border dark:border-dark-border">
                <button
                  type="button"
                  onClick={() => setRefundingOrder(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExecuteRefund}
                  disabled={processingRefund}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-2 shadow-sm"
                >
                  {processingRefund && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Confirm Refund</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Orders;
