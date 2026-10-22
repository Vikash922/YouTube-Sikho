import React, { useState, useEffect } from 'react';
import {
  collection,
  onSnapshot,
  query,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
} from 'firebase/firestore';
import {
  Layers,
  Image as ImageIcon,
  Plus,
  Edit,
  Trash2,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
} from 'lucide-react';
import { db } from '../firebase';
import { Button } from '../components/common/Button';
import { useToast } from '../context/ToastContext';

export interface AdminBanner {
  id: string;
  title: string;
  imageUrl: string;
  targetType: 'course' | 'url' | 'none';
  targetValue?: string;
  order: number;
  isVisible: boolean;
}

export interface AdminHomeSection {
  id: string;
  type: 'live_stream' | 'streak_banner' | 'featured_courses' | 'popular_courses';
  title: string;
  order: number;
  isVisible: boolean;
}

const DEFAULT_SECTIONS: AdminHomeSection[] = [
  { id: 'sec_live', type: 'live_stream', title: 'Live Now Streaming', order: 1, isVisible: true },
  { id: 'sec_streak', type: 'streak_banner', title: 'Daily Learning Streak', order: 2, isVisible: true },
  { id: 'sec_featured', type: 'featured_courses', title: 'Featured Masterclasses', order: 3, isVisible: true },
  { id: 'sec_popular', type: 'popular_courses', title: 'Popular Courses', order: 4, isVisible: true },
];

export const HomeManager: React.FC = () => {
  const { showToast } = useToast();
  const [banners, setBanners] = useState<AdminBanner[]>([]);
  const [sections, setSections] = useState<AdminHomeSection[]>(DEFAULT_SECTIONS);

  // Banner Modal State
  const [isBannerModalOpen, setIsBannerModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<AdminBanner | null>(null);
  const [bannerForm, setBannerForm] = useState({
    title: '',
    imageUrl: '',
    targetType: 'course' as 'course' | 'url' | 'none',
    targetValue: '',
    isVisible: true,
  });
  const [savingBanner, setSavingBanner] = useState(false);

  // 1. Listen to Banners collection
  useEffect(() => {
    const q = query(collection(db, 'banners'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map(
          (d) => ({ id: d.id, ...d.data() } as AdminBanner)
        );
        list.sort((a, b) => (a.order || 0) - (b.order || 0));
        setBanners(list);
      },
      (err) => {
        console.warn('Banners listener error:', err.message);
      }
    );
    return () => unsubscribe();
  }, []);

  // 2. Listen to Home Sections collection
  useEffect(() => {
    const q = query(collection(db, 'homeSections'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const list = snapshot.docs.map(
          (d) => ({ id: d.id, ...d.data() } as AdminHomeSection)
        );
        list.sort((a, b) => (a.order || 0) - (b.order || 0));
        setSections(list);
      }
    });
    return () => unsubscribe();
  }, []);

  // Open Banner Modal
  const openAddBanner = () => {
    setEditingBanner(null);
    setBannerForm({
      title: '',
      imageUrl: '',
      targetType: 'course',
      targetValue: '',
      isVisible: true,
    });
    setIsBannerModalOpen(true);
  };

  const openEditBanner = (b: AdminBanner) => {
    setEditingBanner(b);
    setBannerForm({
      title: b.title,
      imageUrl: b.imageUrl,
      targetType: b.targetType,
      targetValue: b.targetValue || '',
      isVisible: b.isVisible,
    });
    setIsBannerModalOpen(true);
  };

  const handleSaveBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bannerForm.imageUrl.trim()) return;
    setSavingBanner(true);

    try {
      if (editingBanner) {
        await updateDoc(doc(db, 'banners', editingBanner.id), {
          ...bannerForm,
          updatedAt: new Date().toISOString(),
        });
        showToast('Banner updated successfully!', 'success');
      } else {
        const newId = `banner_${Date.now()}`;
        await setDoc(doc(db, 'banners', newId), {
          id: newId,
          ...bannerForm,
          order: banners.length + 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        showToast('New banner added!', 'success');
      }
      setIsBannerModalOpen(false);
    } catch (err: any) {
      showToast(err.message || 'Failed to save banner', 'error');
    } finally {
      setSavingBanner(false);
    }
  };

  const handleDeleteBanner = async (id: string) => {
    if (!window.confirm('Delete this banner?')) return;
    try {
      await deleteDoc(doc(db, 'banners', id));
      showToast('Banner deleted', 'info');
    } catch (err: any) {
      showToast('Could not delete banner', 'error');
    }
  };

  const handleToggleBannerVisibility = async (b: AdminBanner) => {
    try {
      await updateDoc(doc(db, 'banners', b.id), { isVisible: !b.isVisible });
      showToast(b.isVisible ? 'Banner hidden' : 'Banner active', 'info');
    } catch (err: any) {
      showToast('Could not update visibility', 'error');
    }
  };

  // Section toggle visibility
  const handleToggleSectionVisibility = async (sec: AdminHomeSection) => {
    const updated = !sec.isVisible;
    try {
      await setDoc(
        doc(db, 'homeSections', sec.id),
        { ...sec, isVisible: updated },
        { merge: true }
      );
      showToast(`Section "${sec.title}" visibility updated`, 'info');
    } catch (err: any) {
      showToast('Could not update section', 'error');
    }
  };

  const handleMoveSection = async (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= sections.length) return;

    const currentSec = sections[index];
    const targetSec = sections[targetIdx];

    try {
      await setDoc(doc(db, 'homeSections', currentSec.id), { ...currentSec, order: targetIdx + 1 }, { merge: true });
      await setDoc(doc(db, 'homeSections', targetSec.id), { ...targetSec, order: index + 1 }, { merge: true });
      showToast('Home sections reordered live!', 'success');
    } catch (err: any) {
      showToast('Could not reorder sections', 'error');
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold font-display text-light-text dark:text-dark-text tracking-tight">
          Dynamic Home Screen Manager
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Manage promotional carousel banners and re-order home screen modules live without releasing a new app build.
        </p>
      </div>

      {/* 1. Dynamic Hero Banners Section */}
      <div className="bg-white dark:bg-dark-surface rounded-card border border-light-border dark:border-dark-border p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3 border-b border-light-border dark:border-dark-border">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-brand-600" />
            <h2 className="font-bold text-light-text dark:text-dark-text">
              Top Carousel Banners ({banners.length})
            </h2>
          </div>

          <Button
            size="sm"
            variant="primary"
            onClick={openAddBanner}
            icon={<Plus className="w-4 h-4" />}
          >
            Add New Banner
          </Button>
        </div>

        {banners.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 dark:bg-dark-bg rounded-xl border border-dashed border-light-border dark:border-dark-border">
            <p className="text-sm text-slate-500">No custom banners added yet. The default featured brand banner is currently displayed.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {banners.map((b) => (
              <div
                key={b.id}
                className="rounded-xl border border-light-border dark:border-dark-border overflow-hidden bg-slate-50 dark:bg-dark-bg flex flex-col justify-between"
              >
                <div className="aspect-[16/7] w-full bg-slate-200 dark:bg-slate-800 relative overflow-hidden">
                  <img src={b.imageUrl} alt={b.title} className="w-full h-full object-cover" />
                  <span
                    className={`absolute top-2 left-2 px-2 py-0.5 text-xs font-bold rounded-md ${
                      b.isVisible
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-700 text-slate-200'
                    }`}
                  >
                    {b.isVisible ? 'LIVE' : 'HIDDEN'}
                  </span>
                </div>

                <div className="p-4 flex items-center justify-between gap-3">
                  <div>
                    <h4 className="font-bold text-sm text-light-text dark:text-dark-text">
                      {b.title || 'Promotional Banner'}
                    </h4>
                    <p className="text-xs text-slate-500">
                      Target: {b.targetType} {b.targetValue ? `(${b.targetValue})` : ''}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleToggleBannerVisibility(b)}
                      className="p-1.5 rounded-lg border border-light-border dark:border-dark-border text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                      title={b.isVisible ? 'Hide' : 'Show'}
                    >
                      {b.isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditBanner(b)}
                      className="p-1.5 rounded-lg border border-light-border dark:border-dark-border text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteBanner(b.id)}
                      className="p-1.5 rounded-lg border border-red-200 dark:border-red-900 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. Dynamic Home Screen Sections Reordering */}
      <div className="bg-white dark:bg-dark-surface rounded-card border border-light-border dark:border-dark-border p-6 shadow-sm space-y-5">
        <div className="flex items-center gap-2 pb-3 border-b border-light-border dark:border-dark-border">
          <Layers className="w-5 h-5 text-brand-600" />
          <h2 className="font-bold text-light-text dark:text-dark-text">
            Home Sections Order & Visibility
          </h2>
        </div>

        <div className="divide-y divide-light-border dark:divide-dark-border border border-light-border dark:border-dark-border rounded-xl overflow-hidden">
          {sections.map((sec, idx) => (
            <div
              key={sec.id}
              className="p-4 flex items-center justify-between gap-4 bg-slate-50/50 dark:bg-dark-bg/40 hover:bg-slate-100/50 dark:hover:bg-slate-800/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-brand-100 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center font-bold text-xs">
                  {idx + 1}
                </span>
                <div>
                  <h4 className="font-bold text-sm text-light-text dark:text-dark-text">
                    {sec.title}
                  </h4>
                  <p className="text-xs text-slate-500 font-mono">
                    type: {sec.type}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleToggleSectionVisibility(sec)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors ${
                    sec.isVisible
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-400'
                      : 'bg-slate-100 text-slate-500 border-slate-300 dark:bg-slate-800 dark:text-slate-400'
                  }`}
                >
                  {sec.isVisible ? 'Visible' : 'Hidden'}
                </button>

                <div className="flex items-center border border-light-border dark:border-dark-border rounded-lg overflow-hidden">
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => handleMoveSection(idx, 'up')}
                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 disabled:opacity-30"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    disabled={idx === sections.length - 1}
                    onClick={() => handleMoveSection(idx, 'down')}
                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 disabled:opacity-30 border-l border-light-border dark:border-dark-border"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add / Edit Banner Modal */}
      {isBannerModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-dark-surface rounded-card border border-light-border dark:border-dark-border w-full max-w-md p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold font-display text-light-text dark:text-dark-text">
              {editingBanner ? 'Edit Banner' : 'Add Top Carousel Banner'}
            </h3>

            <form onSubmit={handleSaveBanner} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                  Banner Title
                </label>
                <input
                  type="text"
                  value={bannerForm.title}
                  onChange={(e) => setBannerForm({ ...bannerForm, title: e.target.value })}
                  placeholder="e.g. 50% Off YouTube Masterclass"
                  required
                  className="w-full px-3.5 py-2.5 rounded-btn bg-slate-50 dark:bg-dark-bg border border-light-border dark:border-dark-border text-sm text-light-text dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                  Image URL (16:7 Aspect Ratio)
                </label>
                <input
                  type="url"
                  value={bannerForm.imageUrl}
                  onChange={(e) => setBannerForm({ ...bannerForm, imageUrl: e.target.value })}
                  placeholder="https://..."
                  required
                  className="w-full px-3.5 py-2.5 rounded-btn bg-slate-50 dark:bg-dark-bg border border-light-border dark:border-dark-border text-sm text-light-text dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                    Tap Action
                  </label>
                  <select
                    value={bannerForm.targetType}
                    onChange={(e: any) => setBannerForm({ ...bannerForm, targetType: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-btn bg-slate-50 dark:bg-dark-bg border border-light-border dark:border-dark-border text-sm text-light-text dark:text-dark-text focus:outline-none"
                  >
                    <option value="course">Open Course</option>
                    <option value="url">External Link</option>
                    <option value="none">None</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                    Course ID or URL
                  </label>
                  <input
                    type="text"
                    value={bannerForm.targetValue}
                    onChange={(e) => setBannerForm({ ...bannerForm, targetValue: e.target.value })}
                    placeholder="c1 or https://..."
                    className="w-full px-3.5 py-2.5 rounded-btn bg-slate-50 dark:bg-dark-bg border border-light-border dark:border-dark-border text-sm text-light-text dark:text-dark-text focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsBannerModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  loading={savingBanner}
                >
                  {editingBanner ? 'Save Banner' : 'Create Banner'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};