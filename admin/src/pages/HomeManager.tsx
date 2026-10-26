import React, { useState, useEffect } from 'react';
import {
  collection,
  onSnapshot,
  query,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
  writeBatch,
  getDocs,
  serverTimestamp,
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
  Link as LinkIcon,
  BookOpen,
  FolderTree,
  RotateCcw,
} from 'lucide-react';
import { db } from '../firebase';
import { Button } from '../components/common/Button';
import { useToast } from '../context/ToastContext';
import { ImageUploadField } from '../components/common/ImageUploadField';
import { PhoneMockup } from '../components/common/PhoneMockup';
import { Course } from '../types';

export interface AdminBanner {
  id: string;
  title: string;
  imageUrl: string;
  actionType: 'course' | 'category' | 'url' | 'none';
  actionValue?: string;
  targetType?: 'course' | 'category' | 'url' | 'none';
  targetValue?: string;
  order: number;
  isVisible: boolean;
}

export type CanonicalSectionType =
  | 'banners'
  | 'liveNow'
  | 'continueWatching'
  | 'categories'
  | 'newCourses'
  | 'featured'
  | 'popular'
  | 'streak';

export interface AdminHomeSection {
  id: string;
  type: CanonicalSectionType | string;
  title: string;
  order: number;
  isVisible: boolean;
  config?: Record<string, any>;
}

export const CANONICAL_DEFAULT_SECTIONS: AdminHomeSection[] = [
  { id: 'banners', type: 'banners', title: 'Top Featured Highlights', order: 1, isVisible: true },
  { id: 'liveNow', type: 'liveNow', title: 'Live Interactive Classes', order: 2, isVisible: true },
  { id: 'continueWatching', type: 'continueWatching', title: 'Continue Learning', order: 3, isVisible: true },
  { id: 'categories', type: 'categories', title: 'Explore Top Topics', order: 4, isVisible: true },
  { id: 'newCourses', type: 'newCourses', title: 'New Releases', order: 5, isVisible: true },
  { id: 'featured', type: 'featured', title: 'Recommended Masterclasses', order: 6, isVisible: true },
  { id: 'popular', type: 'popular', title: 'Most Enrolled Courses', order: 7, isVisible: true },
  { id: 'streak', type: 'streak', title: 'Daily Learning Streak', order: 8, isVisible: true },
];

export const HomeManager: React.FC = () => {
  const { showToast } = useToast();
  const [banners, setBanners] = useState<AdminBanner[]>([]);
  const [sections, setSections] = useState<AdminHomeSection[]>(CANONICAL_DEFAULT_SECTIONS);
  const [courses, setCourses] = useState<Course[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);

  // Banner Modal State
  const [isBannerModalOpen, setIsBannerModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<AdminBanner | null>(null);
  const [bannerForm, setBannerForm] = useState({
    title: '',
    imageUrl: '',
    actionType: 'course' as 'course' | 'category' | 'url' | 'none',
    actionValue: '',
    isVisible: true,
  });
  const [savingBanner, setSavingBanner] = useState(false);

  // Section Modal State
  const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<AdminHomeSection | null>(null);
  const [sectionForm, setSectionForm] = useState<{
    id: string;
    type: CanonicalSectionType;
    title: string;
    isVisible: boolean;
  }>({
    id: '',
    type: 'featured',
    title: '',
    isVisible: true,
  });
  const [savingSection, setSavingSection] = useState(false);

  // 1. Listen to Banners collection
  useEffect(() => {
    const q = query(collection(db, 'banners'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map((d) => {
          const data = d.data();
          const actionType = data.actionType || data.targetType || 'none';
          const actionValue = data.actionValue || data.targetValue || '';
          return {
            id: d.id,
            ...data,
            actionType,
            actionValue,
            targetType: actionType,
            targetValue: actionValue,
            order: data.order || 0,
            isVisible: data.isVisible !== false,
          } as AdminBanner;
        });
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
      } else {
        setSections(CANONICAL_DEFAULT_SECTIONS);
      }
    });
    return () => unsubscribe();
  }, []);

  // 3. Load Courses & Categories for validated banner targeting
  useEffect(() => {
    getDocs(collection(db, 'courses')).then((snap) => {
      setCourses(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Course)));
    });
    getDocs(collection(db, 'categories')).then((snap) => {
      setCategories(snap.docs.map((d) => ({ id: d.id, name: d.data().name || d.id })));
    });
  }, []);

  // Banner Actions
  const openAddBanner = () => {
    setEditingBanner(null);
    setBannerForm({
      title: '',
      imageUrl: '',
      actionType: 'course',
      actionValue: courses[0]?.id || '',
      isVisible: true,
    });
    setIsBannerModalOpen(true);
  };

  const openEditBanner = (b: AdminBanner) => {
    setEditingBanner(b);
    setBannerForm({
      title: b.title || '',
      imageUrl: b.imageUrl,
      actionType: b.actionType || 'course',
      actionValue: b.actionValue || '',
      isVisible: b.isVisible,
    });
    setIsBannerModalOpen(true);
  };

  const handleSaveBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bannerForm.imageUrl.trim()) {
      showToast('Please provide an image for the banner.', 'error');
      return;
    }

    if (bannerForm.actionType === 'url') {
      if (!bannerForm.actionValue.startsWith('https://')) {
        showToast('Banner action URL must begin with https:// for security.', 'error');
        return;
      }
    }

    setSavingBanner(true);
    try {
      const payload = {
        title: bannerForm.title.trim(),
        imageUrl: bannerForm.imageUrl.trim(),
        actionType: bannerForm.actionType,
        actionValue: bannerForm.actionValue.trim(),
        targetType: bannerForm.actionType,
        targetValue: bannerForm.actionValue.trim(),
        isVisible: bannerForm.isVisible,
        active: bannerForm.isVisible,
        updatedAt: serverTimestamp(),
      };

      if (editingBanner) {
        await updateDoc(doc(db, 'banners', editingBanner.id), payload);
        showToast('Banner updated successfully!', 'success');
      } else {
        const newId = `banner_${Date.now()}`;
        await setDoc(doc(db, 'banners', newId), {
          id: newId,
          ...payload,
          order: banners.length + 1,
          createdAt: serverTimestamp(),
        });
        showToast('New promotional banner added!', 'success');
      }
      setIsBannerModalOpen(false);
    } catch (err: any) {
      showToast(err.message || 'Failed to save banner', 'error');
    } finally {
      setSavingBanner(false);
    }
  };

  const handleDeleteBanner = async (id: string) => {
    if (!window.confirm('Delete this banner? This action cannot be undone.')) return;
    try {
      await deleteDoc(doc(db, 'banners', id));
      showToast('Banner deleted', 'info');
    } catch (err: any) {
      showToast('Could not delete banner', 'error');
    }
  };

  const handleToggleBannerVisibility = async (b: AdminBanner) => {
    try {
      await updateDoc(doc(db, 'banners', b.id), {
        isVisible: !b.isVisible,
        active: !b.isVisible,
      });
      showToast(b.isVisible ? 'Banner hidden' : 'Banner active', 'info');
    } catch (err: any) {
      showToast('Could not update visibility', 'error');
    }
  };

  // Section Management Actions
  const handleToggleSectionVisibility = async (sec: AdminHomeSection) => {
    const updated = !sec.isVisible;
    try {
      await setDoc(doc(db, 'homeSections', sec.id), { ...sec, isVisible: updated }, { merge: true });
      showToast(`Section "${sec.title}" visibility updated`, 'info');
    } catch (err: any) {
      showToast('Could not update section', 'error');
    }
  };

  // Atomic batch reordering for sections
  const handleMoveSection = async (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= sections.length) return;

    const reordered = [...sections];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIdx, 0, moved);

    try {
      const batch = writeBatch(db);
      reordered.forEach((sec, idx) => {
        batch.set(doc(db, 'homeSections', sec.id), { ...sec, order: idx + 1, updatedAt: serverTimestamp() }, { merge: true });
      });
      await batch.commit();
      showToast('Home sections reordered live with atomic batch write!', 'success');
    } catch (err: any) {
      showToast('Could not reorder sections: ' + err.message, 'error');
    }
  };

  // One-click create/restore canonical default home
  const handleCreateDefaultHome = async () => {
    if (!window.confirm('Initialize/reset home screen sections to the canonical default layout?')) return;
    try {
      const batch = writeBatch(db);
      CANONICAL_DEFAULT_SECTIONS.forEach((sec, idx) => {
        batch.set(doc(db, 'homeSections', sec.id), {
          ...sec,
          order: idx + 1,
          updatedAt: serverTimestamp(),
        });
      });
      await batch.commit();
      showToast('Canonical default home sections successfully created!', 'success');
    } catch (err: any) {
      showToast('Failed to create default home: ' + err.message, 'error');
    }
  };

  const handleSaveSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sectionForm.title.trim()) return;
    setSavingSection(true);
    try {
      const secId = editingSection ? editingSection.id : `sec_${sectionForm.type}_${Date.now()}`;
      await setDoc(
        doc(db, 'homeSections', secId),
        {
          id: secId,
          type: sectionForm.type,
          title: sectionForm.title.trim(),
          isVisible: sectionForm.isVisible,
          order: editingSection ? editingSection.order : sections.length + 1,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      showToast(editingSection ? 'Section updated!' : 'New home section added!', 'success');
      setIsSectionModalOpen(false);
    } catch (err: any) {
      showToast(err.message || 'Failed to save section', 'error');
    } finally {
      setSavingSection(false);
    }
  };

  const handleDeleteSection = async (id: string) => {
    if (!window.confirm('Remove this section from the home screen layout?')) return;
    try {
      await deleteDoc(doc(db, 'homeSections', id));
      showToast('Section removed', 'info');
    } catch (err: any) {
      showToast('Could not remove section', 'error');
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-light-text dark:text-dark-text tracking-tight">
            Dynamic Home Screen Manager
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage promotional carousel banners and re-order home screen modules live without releasing a new app build.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          icon={<RotateCcw className="w-4 h-4" />}
          onClick={handleCreateDefaultHome}
        >
          Reset Default Home
        </Button>
      </div>

      {/* Main Grid: Management Panels + Live Phone Mockup */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start">
        {/* Left Column (2 cols): Banners & Sections */}
        <div className="xl:col-span-2 space-y-8">
          {/* 1. Dynamic Hero Banners Section */}
          <div className="bg-white dark:bg-dark-surface rounded-card border border-light-border dark:border-dark-border p-6 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3 border-b border-light-border dark:border-dark-border">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-brand-600" />
                <h2 className="font-bold text-light-text dark:text-dark-text">
                  Hero Carousel Banners ({banners.length})
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
                    <div className="aspect-[16/7] relative bg-slate-800">
                      <img
                        src={b.imageUrl}
                        alt={b.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex items-end p-3">
                        <span className="text-xs font-bold text-white leading-snug line-clamp-1">
                          {b.title || 'Untitled Banner'}
                        </span>
                      </div>
                    </div>

                    <div className="p-3 flex items-center justify-between gap-2 border-t border-light-border dark:border-dark-border bg-white dark:bg-dark-surface">
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                        {b.actionType === 'course' ? (
                          <BookOpen className="w-3.5 h-3.5 text-brand-500" />
                        ) : b.actionType === 'category' ? (
                          <FolderTree className="w-3.5 h-3.5 text-amber-500" />
                        ) : (
                          <LinkIcon className="w-3.5 h-3.5 text-slate-400" />
                        )}
                        <span className="truncate max-w-[120px] font-mono text-[11px]">
                          {b.actionType}: {b.actionValue || 'none'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleToggleBannerVisibility(b)}
                          className="p-1.5 rounded-lg border border-light-border dark:border-dark-border hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                          title={b.isVisible ? 'Hide Banner' : 'Show Banner'}
                        >
                          {b.isVisible ? <Eye className="w-4 h-4 text-emerald-500" /> : <EyeOff className="w-4 h-4 text-slate-400" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditBanner(b)}
                          className="p-1.5 rounded-lg border border-light-border dark:border-dark-border hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                          title="Edit Banner"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteBanner(b.id)}
                          className="p-1.5 rounded-lg border border-red-200 dark:border-red-900 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                          title="Delete Banner"
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
            <div className="flex items-center justify-between pb-3 border-b border-light-border dark:border-dark-border">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-brand-600" />
                <h2 className="font-bold text-light-text dark:text-dark-text">
                  Home Sections Order & Visibility ({sections.length})
                </h2>
              </div>

              <Button
                size="sm"
                variant="outline"
                icon={<Plus className="w-4 h-4" />}
                onClick={() => {
                  setEditingSection(null);
                  setSectionForm({
                    id: '',
                    type: 'newCourses',
                    title: 'New Releases',
                    isVisible: true,
                  });
                  setIsSectionModalOpen(true);
                }}
              >
                Add Section
              </Button>
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

                  <div className="flex items-center gap-2">
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

                    <button
                      type="button"
                      onClick={() => {
                        setEditingSection(sec);
                        setSectionForm({
                          id: sec.id,
                          type: (sec.type as any) || 'featured',
                          title: sec.title,
                          isVisible: sec.isVisible,
                        });
                        setIsSectionModalOpen(true);
                      }}
                      className="p-1.5 rounded-lg border border-light-border dark:border-dark-border hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                      title="Edit Section"
                    >
                      <Edit className="w-4 h-4" />
                    </button>

                    <div className="flex items-center border border-light-border dark:border-dark-border rounded-lg overflow-hidden">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => handleMoveSection(idx, 'up')}
                        className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 disabled:opacity-30"
                        title="Move Up"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === sections.length - 1}
                        onClick={() => handleMoveSection(idx, 'down')}
                        className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 disabled:opacity-30 border-l border-light-border dark:border-dark-border"
                        title="Move Down"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteSection(sec.id)}
                      className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                      title="Delete Section"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Live Phone Mockup Preview */}
        <div className="xl:col-span-1 sticky top-24">
          <PhoneMockup banners={banners} sections={sections as any} />
        </div>
      </div>

      {/* Modal: Add/Edit Banner */}
      {isBannerModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white dark:bg-dark-surface rounded-2xl border border-light-border dark:border-dark-border p-6 shadow-2xl">
            <h3 className="text-base font-bold text-light-text dark:text-dark-text mb-4">
              {editingBanner ? 'Edit Hero Banner' : 'Add Hero Banner'}
            </h3>

            <form onSubmit={handleSaveBanner} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                  Banner Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Masterclass on YouTube SEO"
                  value={bannerForm.title}
                  onChange={(e) => setBannerForm({ ...bannerForm, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-dark-bg border border-light-border dark:border-dark-border text-xs text-light-text dark:text-dark-text"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                  Banner Image (16:9 or 16:7)
                </label>
                <ImageUploadField
                  value={bannerForm.imageUrl}
                  onChange={(url) => setBannerForm({ ...bannerForm, imageUrl: url })}
                  aspectRatio="16/9"
                  label="Upload Banner Graphic"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                    Tap Action
                  </label>
                  <select
                    value={bannerForm.actionType}
                    onChange={(e) => setBannerForm({ ...bannerForm, actionType: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-dark-bg border border-light-border dark:border-dark-border text-xs text-light-text dark:text-dark-text"
                  >
                    <option value="course">Open Course</option>
                    <option value="category">Open Category</option>
                    <option value="url">External Link</option>
                    <option value="none">None (Static)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                    Action Target
                  </label>
                  {bannerForm.actionType === 'course' ? (
                    <select
                      value={bannerForm.actionValue}
                      onChange={(e) => setBannerForm({ ...bannerForm, actionValue: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-dark-bg border border-light-border dark:border-dark-border text-xs text-light-text dark:text-dark-text"
                    >
                      <option value="">Select course...</option>
                      {courses.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.title}
                        </option>
                      ))}
                    </select>
                  ) : bannerForm.actionType === 'category' ? (
                    <select
                      value={bannerForm.actionValue}
                      onChange={(e) => setBannerForm({ ...bannerForm, actionValue: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-dark-bg border border-light-border dark:border-dark-border text-xs text-light-text dark:text-dark-text"
                    >
                      <option value="">Select category...</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      placeholder="https://..."
                      value={bannerForm.actionValue}
                      onChange={(e) => setBannerForm({ ...bannerForm, actionValue: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-dark-bg border border-light-border dark:border-dark-border text-xs text-light-text dark:text-dark-text"
                    />
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="bannerVisible"
                  checked={bannerForm.isVisible}
                  onChange={(e) => setBannerForm({ ...bannerForm, isVisible: e.target.checked })}
                  className="rounded text-brand-600"
                />
                <label htmlFor="bannerVisible" className="text-xs text-light-text dark:text-dark-text">
                  Visible in app carousel
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-light-border dark:border-dark-border">
                <Button variant="outline" size="sm" onClick={() => setIsBannerModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit" loading={savingBanner}>
                  Save Banner
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add/Edit Section */}
      {isSectionModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white dark:bg-dark-surface rounded-2xl border border-light-border dark:border-dark-border p-6 shadow-2xl">
            <h3 className="text-base font-bold text-light-text dark:text-dark-text mb-4">
              {editingSection ? 'Edit Home Section' : 'Add Home Section'}
            </h3>

            <form onSubmit={handleSaveSection} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                  Section Type
                </label>
                <select
                  disabled={Boolean(editingSection)}
                  value={sectionForm.type}
                  onChange={(e) => setSectionForm({ ...sectionForm, type: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-dark-bg border border-light-border dark:border-dark-border text-xs text-light-text dark:text-dark-text"
                >
                  <option value="banners">Banners Carousel</option>
                  <option value="liveNow">Live Now Stream Card</option>
                  <option value="continueWatching">Continue Learning (Real Progress)</option>
                  <option value="categories">Top Categories Chips</option>
                  <option value="newCourses">New Releases Horizontal List</option>
                  <option value="featured">Featured Courses</option>
                  <option value="popular">Popular Courses</option>
                  <option value="streak">Student Learning Streak</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                  Section Title Displayed in App
                </label>
                <input
                  type="text"
                  placeholder="e.g. Recommended Masterclasses"
                  value={sectionForm.title}
                  onChange={(e) => setSectionForm({ ...sectionForm, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-dark-bg border border-light-border dark:border-dark-border text-xs text-light-text dark:text-dark-text"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="sectionVisible"
                  checked={sectionForm.isVisible}
                  onChange={(e) => setSectionForm({ ...sectionForm, isVisible: e.target.checked })}
                  className="rounded text-brand-600"
                />
                <label htmlFor="sectionVisible" className="text-xs text-light-text dark:text-dark-text">
                  Visible in app home
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-light-border dark:border-dark-border">
                <Button variant="outline" size="sm" onClick={() => setIsSectionModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit" loading={savingSection}>
                  Save Section
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
