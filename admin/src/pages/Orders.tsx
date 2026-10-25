import React, { useState, useEffect } from 'react';
import {
  collection,
  onSnapshot,
  query,
} from 'firebase/firestore';
import {
  CreditCard,
  Search,
  CheckCircle2,
  Clock,
  RotateCcw,
  User,
  ShieldAlert,
  Download,
} from 'lucide-react';
import { db, functions, httpsCallable } from '../firebase';
import { Order } from '../types';
import { Button } from '../components/common/Button';
import { useToast } from '../context/ToastContext';

export const Orders: React.FC = () => {
  const { showToast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'created' | 'refunded'>('all');

  // Refund dialog state
  const [refundingOrder, setRefundingOrder] = useState<Order | null>(null);
  const [refundReason, setRefundReason] = useState('Customer requested refund within 7-day guarantee');
  const [processingRefund, setProcessingRefund] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'orders'));
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
        console.warn('Orders onSnapshot error, using mock data for admin preview:', err);
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

  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      (o.id && o.id.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (o.uid && o.uid.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (o.courseTitle && o.courseTitle.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleExportCSV = () => {
    if (filteredOrders.length === 0) {
      showToast('No orders to export', 'error');
      return;
    }
    const headers = ['Order ID', 'Student UID', 'Course Title', 'Amount', 'Status', 'Date', 'Payment ID / UTR'];
    const rows = filteredOrders.map((o) => [
      o.id,
      o.uid || '',
      o.courseTitle || '',
      o.amountPaise !== undefined ? o.amountPaise / 100 : o.amount,
      o.status,
      o.createdAt ? new Date(o.createdAt).toISOString() : '',
      o.utr ? `UTR: ${o.utr}` : (o.paymentId || o.razorpayPaymentId || ''),
    ]);
    const csvContent = [
      headers.join(','),
      ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `orders_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Exported ${filteredOrders.length} orders to CSV`, 'success');
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-display text-light-text dark:text-dark-text flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-brand-600 dark:text-brand-400" />
            Orders & Payment Gateway History
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Real-time server-verified transactions, Razorpay gateway references, and one-click refund handling.
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          icon={<Download className="w-4 h-4" />}
          onClick={handleExportCSV}
        >
          Export CSV ({filteredOrders.length})
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by order ID, student UID, or course..."
            className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-surface text-light-text dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
          />
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-auto bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold">
          {(['all', 'paid', 'created', 'refunded'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg capitalize transition-colors ${
                statusFilter === st
                  ? 'bg-white dark:bg-dark-surface text-brand-600 dark:text-brand-400 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Table */}
      <div className="rounded-2xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-surface overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-sm text-slate-400">Loading orders...</div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-12 text-center">
            <CreditCard className="w-10 h-10 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
              No orders found
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Completed student transactions will appear here in real-time.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-light-border dark:border-dark-border text-slate-500 dark:text-slate-400 uppercase font-semibold">
                <tr>
                  <th className="px-5 py-3">Order Details</th>
                  <th className="px-5 py-3">Student</th>
                  <th className="px-5 py-3">Course</th>
                  <th className="px-5 py-3">Amount</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-light-border dark:divide-dark-border font-medium text-slate-700 dark:text-slate-200">
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="px-5 py-3 font-mono text-[11px]">
                      <div className="font-bold text-light-text dark:text-dark-text">
                        {order.id}
                      </div>
                      {order.utr && (
                        <div className="text-emerald-600 dark:text-emerald-400 text-[10px]">
                          UTR: {order.utr}
                        </div>
                      )}
                      {(order.paymentId || order.razorpayPaymentId) && (
                        <div className="text-slate-400 text-[10px]">
                          PayID: {order.paymentId || order.razorpayPaymentId}
                        </div>
                      )}
                    </td>

                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1.5 font-mono text-[11px]">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span className="truncate max-w-[120px]">{order.uid}</span>
                      </div>
                    </td>

                    <td className="px-5 py-3">
                      <div className="font-semibold text-light-text dark:text-dark-text">
                        {order.courseTitle || order.courseId}
                      </div>
                      {order.couponCode && (
                        <span className="text-[10px] text-brand-600 dark:text-brand-400 font-mono font-bold">
                          Promo: {order.couponCode}
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-3 font-bold font-display text-sm text-light-text dark:text-dark-text">
                      ₹{order.amountPaise !== undefined ? order.amountPaise / 100 : (order.amount || 0)}
                    </td>

                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                          order.status === 'paid'
                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                            : order.status === 'refunded'
                            ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300'
                            : order.status === 'created'
                            ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                            : 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                        }`}
                      >
                        {order.status === 'paid' && <CheckCircle2 className="w-3 h-3" />}
                        {order.status === 'created' && <Clock className="w-3 h-3" />}
                        {order.status === 'refunded' && <RotateCcw className="w-3 h-3" />}
                        {order.status}
                      </span>
                    </td>

                    <td className="px-5 py-3 text-slate-400 text-[11px]">
                      {order.createdAt
                        ? new Date(order.createdAt).toLocaleDateString()
                        : 'Recent'}
                    </td>

                    <td className="px-5 py-3 text-right">
                      {order.status === 'paid' ? (
                        <button
                          onClick={() => setRefundingOrder(order)}
                          className="px-2 py-1 rounded bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400 font-semibold text-[11px] transition-colors"
                        >
                          Refund
                        </button>
                      ) : (
                        <span className="text-slate-400 text-[11px]">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Refund Confirmation Modal */}
      {refundingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-2xl w-full max-w-md shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
              <ShieldAlert className="w-6 h-6" />
              <h3 className="font-bold font-display text-base text-light-text dark:text-dark-text">
                Confirm Razorpay Refund
              </h3>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Initiating a refund will automatically process the transaction via Razorpay API and
              immediately revoke the student&apos;s access to the course in Firestore.
            </p>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-light-border dark:border-dark-border text-xs space-y-1">
              <div>
                <strong>Order ID:</strong> {refundingOrder.id}
              </div>
              <div>
                <strong>Amount:</strong> ₹{refundingOrder.amountPaise !== undefined ? refundingOrder.amountPaise / 100 : (refundingOrder.amount || 0)}
              </div>
              <div>
                <strong>Student UID:</strong> {refundingOrder.uid}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Refund Reason
              </label>
              <textarea
                rows={2}
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-light-border dark:border-dark-border bg-slate-50 dark:bg-slate-800/50 text-light-text dark:text-dark-text focus:outline-none focus:border-brand-500"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="ghost"
                onClick={() => setRefundingOrder(null)}
                disabled={processingRefund}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleExecuteRefund}
                loading={processingRefund}
              >
                Execute Full Refund
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
