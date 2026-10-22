import React, { useState, useEffect } from 'react';
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
} from 'firebase/firestore';
import {
  Tag,
  Plus,
  Search,
  Edit,
  Trash2,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { db } from '../firebase';
import { Coupon } from '../types';
import { Button } from '../components/common/Button';
import { useToast } from '../context/ToastContext';

export const Coupons: React.FC = () => {
  const { showToast } = useToast();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [form, setForm] = useState({
    code: '',
    discountPercent: 20,
    maxUses: 100,
    validUntilDate: '2026-12-31',
    isActive: true,
  });

  useEffect(() => {
    const q = query(collection(db, 'coupons'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        })) as Coupon[];
        setCoupons(items);
        setLoading(false);
      },
      (err) => {
        console.warn('Coupons onSnapshot error, using demo coupons:', err);
        setCoupons([
          {
            id: 'coup_1',
            code: 'SIKHO50',
            discountPercent: 50,
            maxUses: 500,
            usedCount: 42,
            validUntil: new Date('2026-12-31').getTime(),
            isActive: true,
          },
          {
            id: 'coup_2',
            code: 'WELCOME20',
            discountPercent: 20,
            maxUses: 1000,
            usedCount: 185,
            validUntil: new Date('2026-12-31').getTime(),
            isActive: true,
          },
        ]);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleOpenAdd = () => {
    setEditingCoupon(null);
    setForm({
      code: '',
      discountPercent: 20,
      maxUses: 100,
      validUntilDate: '2026-12-31',
      isActive: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    const dateStr = coupon.validUntil
      ? new Date(coupon.validUntil).toISOString().split('T')[0]
      : '2026-12-31';
    setForm({
      code: coupon.code,
      discountPercent: coupon.discountPercent,
      maxUses: coupon.maxUses || 100,
      validUntilDate: dateStr,
      isActive: coupon.isActive,
    });
    setIsModalOpen(true);
  };

  const handleSaveCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = form.code.trim().toUpperCase();
    if (!cleanCode) {
      showToast('Coupon code is required', 'error');
      return;
    }

    try {
      const validUntil = new Date(form.validUntilDate).getTime();
      if (editingCoupon) {
        await updateDoc(doc(db, 'coupons', editingCoupon.id), {
          code: cleanCode,
          discountPercent: Number(form.discountPercent),
          maxUses: Number(form.maxUses),
          validUntil,
          isActive: form.isActive,
          updatedAt: new Date().toISOString(),
        });
        showToast('Coupon updated successfully!', 'success');
      } else {
        const newId = `coup_${cleanCode}`;
        await setDoc(doc(db, 'coupons', newId), {
          id: newId,
          code: cleanCode,
          discountPercent: Number(form.discountPercent),
          maxUses: Number(form.maxUses),
          usedCount: 0,
          validUntil,
          isActive: form.isActive,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        showToast('New coupon created!', 'success');
      }
      setIsModalOpen(false);
    } catch (err: any) {
      console.error('Save coupon error:', err);
      showToast(err.message || 'Failed to save coupon', 'error');
    }
  };

  const handleDeleteCoupon = async (id: string) => {
    if (!window.confirm('Delete this coupon?')) return;
    try {
      await deleteDoc(doc(db, 'coupons', id));
      showToast('Coupon deleted', 'info');
    } catch (err: any) {
      showToast(err.message || 'Failed to delete coupon', 'error');
    }
  };

  const handleToggleActive = async (coupon: Coupon) => {
    try {
      await updateDoc(doc(db, 'coupons', coupon.id), {
        isActive: !coupon.isActive,
      });
      showToast(`Coupon marked ${!coupon.isActive ? 'active' : 'inactive'}`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to toggle status', 'error');
    }
  };

  const filteredCoupons = coupons.filter((c) =>
    c.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-display text-light-text dark:text-dark-text flex items-center gap-2">
            <Tag className="w-5 h-5 text-brand-600 dark:text-brand-400" />
            Coupons & Discounts Manager
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Create promotional codes with percentage discounts, expiry dates, and usage limits.
          </p>
        </div>

        <Button variant="primary" onClick={handleOpenAdd}>
          <Plus className="w-4 h-4 mr-2" /> Add New Coupon
        </Button>
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by coupon code (e.g. SIKHO50)..."
          className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-surface text-light-text dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
        />
      </div>

      {/* Coupons Table */}
      <div className="rounded-2xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-surface overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-sm text-slate-400">Loading coupons...</div>
        ) : filteredCoupons.length === 0 ? (
          <div className="p-12 text-center">
            <Tag className="w-10 h-10 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
              No coupons created yet
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Click &quot;Add New Coupon&quot; to offer checkout discounts.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-light-border dark:border-dark-border text-slate-500 dark:text-slate-400 uppercase font-semibold">
                <tr>
                  <th className="px-5 py-3">Coupon Code</th>
                  <th className="px-5 py-3">Discount</th>
                  <th className="px-5 py-3">Usage</th>
                  <th className="px-5 py-3">Valid Until</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-light-border dark:divide-dark-border font-medium text-slate-700 dark:text-slate-200">
                {filteredCoupons.map((coupon) => (
                  <tr key={coupon.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="px-5 py-3 font-mono font-bold text-sm text-brand-600 dark:text-brand-400">
                      {coupon.code}
                    </td>

                    <td className="px-5 py-3 font-bold font-display text-sm text-light-text dark:text-dark-text">
                      {coupon.discountPercent}% OFF
                    </td>

                    <td className="px-5 py-3">
                      <span className="text-slate-600 dark:text-slate-300 font-mono">
                        {coupon.usedCount || 0} / {coupon.maxUses || '∞'}
                      </span>
                    </td>

                    <td className="px-5 py-3 text-slate-500 dark:text-slate-400">
                      {coupon.validUntil
                        ? new Date(coupon.validUntil).toLocaleDateString()
                        : 'Never expires'}
                    </td>

                    <td className="px-5 py-3">
                      <button
                        onClick={() => handleToggleActive(coupon)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition-colors ${
                          coupon.isActive
                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {coupon.isActive ? (
                          <>
                            <CheckCircle2 className="w-3 h-3" /> Active
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3" /> Inactive
                          </>
                        )}
                      </button>
                    </td>

                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenEdit(coupon)}
                          className="p-1.5 rounded text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteCoupon(coupon.id)}
                          className="p-1.5 rounded text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Coupon Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-2xl w-full max-w-md shadow-2xl overflow-hidden p-6 space-y-4">
            <h3 className="font-bold font-display text-base text-light-text dark:text-dark-text">
              {editingCoupon ? 'Edit Coupon Code' : 'Create New Promo Coupon'}
            </h3>

            <form onSubmit={handleSaveCoupon} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Coupon Code *
                </label>
                <input
                  type="text"
                  required
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  placeholder="e.g. SIKHO50"
                  className="w-full px-3 py-2 text-sm font-mono font-bold rounded-xl border border-light-border dark:border-dark-border bg-slate-50 dark:bg-slate-800/50 text-light-text dark:text-dark-text focus:outline-none focus:border-brand-500 uppercase"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Discount Percent (%) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    required
                    value={form.discountPercent}
                    onChange={(e) =>
                      setForm({ ...form, discountPercent: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 text-sm rounded-xl border border-light-border dark:border-dark-border bg-slate-50 dark:bg-slate-800/50 text-light-text dark:text-dark-text focus:outline-none focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Max Uses Limit
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={form.maxUses}
                    onChange={(e) =>
                      setForm({ ...form, maxUses: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 text-sm rounded-xl border border-light-border dark:border-dark-border bg-slate-50 dark:bg-slate-800/50 text-light-text dark:text-dark-text focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Valid Until Expiry Date
                </label>
                <input
                  type="date"
                  value={form.validUntilDate}
                  onChange={(e) => setForm({ ...form, validUntilDate: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-light-border dark:border-dark-border bg-slate-50 dark:bg-slate-800/50 text-light-text dark:text-dark-text focus:outline-none focus:border-brand-500"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300 pt-1">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                Active (Can be redeemed at checkout)
              </label>

              <div className="flex justify-end gap-3 pt-3 border-t border-light-border dark:border-dark-border">
                <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit">
                  {editingCoupon ? 'Save Changes' : 'Create Coupon'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
