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
  IndianRupee,
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
  const [loadError, setLoadError] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [form, setForm] = useState({
    code: '',
    discountType: 'percent' as 'percent' | 'flat',
    value: 20,
    maxUses: 0, // 0 = unlimited
    expiresAtDate: '',
    minPrice: '',
    isActive: true,
  });

  useEffect(() => {
    const q = query(collection(db, 'coupons'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          const discountType = data.discountType || (data.type === 'flat' ? 'flat' : 'percent');
          const value = Number(data.value !== undefined ? data.value : (data.discountPercent || 0));
          const maxUses = Number(data.maxUses !== undefined ? data.maxUses : 0);
          const usedCount = Number(data.usedCount !== undefined ? data.usedCount : (data.usageCount || 0));
          const isActive = data.isActive !== undefined ? Boolean(data.isActive) : (data.active !== undefined ? Boolean(data.active) : true);
          let expiresAt = data.expiresAt || data.validUntil || null;
          if (expiresAt && typeof expiresAt.toDate === 'function') {
            expiresAt = expiresAt.toDate().toISOString();
          }

          return {
            id: docSnap.id,
            code: (data.code || docSnap.id).toUpperCase(),
            discountType,
            value,
            maxUses,
            usedCount,
            expiresAt,
            minPrice: data.minPrice ? Number(data.minPrice) : undefined,
            courseIds: data.courseIds || [],
            isActive,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          } as Coupon;
        });

        setCoupons(items);
        setLoadError(null);
        setLoading(false);
      },
      (err) => {
        console.error('Coupons onSnapshot error:', err);
        setLoadError(err.message || 'Failed to load coupons from Firestore.');
        setCoupons([]);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleOpenAdd = () => {
    setEditingCoupon(null);
    setForm({
      code: '',
      discountType: 'percent',
      value: 20,
      maxUses: 0,
      expiresAtDate: '',
      minPrice: '',
      isActive: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    let dateStr = '';
    if (coupon.expiresAt) {
      try {
        const d = new Date(coupon.expiresAt);
        if (!isNaN(d.getTime())) {
          dateStr = d.toISOString().split('T')[0];
        }
      } catch {}
    }

    setForm({
      code: coupon.code,
      discountType: coupon.discountType || 'percent',
      value: coupon.value || 0,
      maxUses: coupon.maxUses || 0,
      expiresAtDate: dateStr,
      minPrice: coupon.minPrice ? String(coupon.minPrice) : '',
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

    if (form.value <= 0) {
      showToast('Discount value must be greater than 0', 'error');
      return;
    }

    if (form.discountType === 'percent' && form.value > 100) {
      showToast('Percentage discount cannot exceed 100%', 'error');
      return;
    }

    try {
      const expiresAt = form.expiresAtDate
        ? new Date(`${form.expiresAtDate}T23:59:59.999Z`).toISOString()
        : null;

      const couponPayload = {
        code: cleanCode,
        discountType: form.discountType,
        value: Number(form.value),
        maxUses: Number(form.maxUses) || 0,
        expiresAt,
        minPrice: form.minPrice ? Number(form.minPrice) : null,
        isActive: form.isActive,
        updatedAt: new Date().toISOString(),
      };

      if (editingCoupon) {
        // If code changed, delete old and write new
        if (editingCoupon.id !== cleanCode) {
          await deleteDoc(doc(db, 'coupons', editingCoupon.id));
        }
        await setDoc(
          doc(db, 'coupons', cleanCode),
          {
            ...couponPayload,
            usedCount: editingCoupon.usedCount || 0,
            createdAt: editingCoupon.createdAt || new Date().toISOString(),
          },
          { merge: true }
        );
        showToast(`Coupon ${cleanCode} updated!`, 'success');
      } else {
        await setDoc(doc(db, 'coupons', cleanCode), {
          ...couponPayload,
          usedCount: 0,
          createdAt: new Date().toISOString(),
        });
        showToast(`Coupon ${cleanCode} created!`, 'success');
      }

      setIsModalOpen(false);
    } catch (err: any) {
      console.error('Save coupon error:', err);
      showToast(err.message || 'Failed to save coupon', 'error');
    }
  };

  const handleDeleteCoupon = async (id: string) => {
    if (!window.confirm(`Delete coupon ${id}?`)) return;
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
        updatedAt: new Date().toISOString(),
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
            Server-authoritative promotional codes (coupons/&#123;CODE&#125;) with percent/flat discounts and usage caps.
          </p>
        </div>

        <Button variant="primary" onClick={handleOpenAdd}>
          <Plus className="w-4 h-4 mr-2" /> Add New Coupon
        </Button>
      </div>

      {loadError && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-600 dark:text-rose-400">
          <strong>Database error:</strong> {loadError}
        </div>
      )}

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
              Click &quot;Add New Coupon&quot; to offer discounts to learners.
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
                  <th className="px-5 py-3">Min. Course Price</th>
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
                      {coupon.discountType === 'flat' ? (
                        <span className="flex items-center gap-0.5">
                          <IndianRupee className="w-3.5 h-3.5" />
                          {coupon.value} FLAT OFF
                        </span>
                      ) : (
                        <span className="flex items-center gap-0.5">
                          {coupon.value}% OFF
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-3">
                      <span className="text-slate-600 dark:text-slate-300 font-mono">
                        {coupon.usedCount || 0} / {coupon.maxUses === 0 ? '∞' : coupon.maxUses}
                      </span>
                    </td>

                    <td className="px-5 py-3 text-slate-500 dark:text-slate-400">
                      {coupon.expiresAt
                        ? new Date(coupon.expiresAt).toLocaleDateString()
                        : 'Never expires'}
                    </td>

                    <td className="px-5 py-3 text-slate-500 dark:text-slate-400">
                      {coupon.minPrice ? `₹${coupon.minPrice}` : 'None'}
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
                          title="Edit"
                          className="p-1.5 rounded text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteCoupon(coupon.id)}
                          title="Delete"
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
                  placeholder="e.g. SIKHO20"
                  className="w-full px-3 py-2 text-sm font-mono font-bold rounded-xl border border-light-border dark:border-dark-border bg-slate-50 dark:bg-slate-800/50 text-light-text dark:text-dark-text focus:outline-none focus:border-brand-500 uppercase"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Discount Type
                  </label>
                  <select
                    value={form.discountType}
                    onChange={(e) =>
                      setForm({ ...form, discountType: e.target.value as 'percent' | 'flat' })
                    }
                    className="w-full px-3 py-2 text-sm rounded-xl border border-light-border dark:border-dark-border bg-slate-50 dark:bg-slate-800/50 text-light-text dark:text-dark-text focus:outline-none focus:border-brand-500"
                  >
                    <option value="percent">Percentage (%)</option>
                    <option value="flat">Flat Amount (₹)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Discount Value *
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={form.discountType === 'percent' ? 100 : 100000}
                    required
                    value={form.value}
                    onChange={(e) => setForm({ ...form, value: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-light-border dark:border-dark-border bg-slate-50 dark:bg-slate-800/50 text-light-text dark:text-dark-text focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Max Uses (0 = unlimited)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={form.maxUses}
                    onChange={(e) => setForm({ ...form, maxUses: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-light-border dark:border-dark-border bg-slate-50 dark:bg-slate-800/50 text-light-text dark:text-dark-text focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Min. Course Price (₹)
                  </label>
                  <input
                    type="number"
                    min={0}
                    placeholder="Optional"
                    value={form.minPrice}
                    onChange={(e) => setForm({ ...form, minPrice: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-light-border dark:border-dark-border bg-slate-50 dark:bg-slate-800/50 text-light-text dark:text-dark-text focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Valid Until Expiry Date (Optional)
                </label>
                <input
                  type="date"
                  value={form.expiresAtDate}
                  onChange={(e) => setForm({ ...form, expiresAtDate: e.target.value })}
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
