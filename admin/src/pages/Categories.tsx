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
  FolderTree,
  Plus,
  Edit,
  Trash2,
  ArrowUp,
  ArrowDown,
  Loader2,
  Search,
} from 'lucide-react';
import { db } from '../firebase';
import { Button } from '../components/common/Button';
import { useToast } from '../context/ToastContext';

export interface AdminCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  order: number;
  courseCount?: number;
}

export const Categories: React.FC = () => {
  const { showToast } = useToast();
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<AdminCategory | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [categoryDescription, setCategoryDescription] = useState('');
  const [saving, setSaving] = useState(false);

  // Real-time listener for categories
  useEffect(() => {
    const q = query(collection(db, 'categories'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map(
          (d) => ({ id: d.id, ...d.data() } as AdminCategory)
        );
        list.sort((a, b) => (a.order || 0) - (b.order || 0));
        setCategories(list);
        setLoading(false);
      },
      (err) => {
        console.warn('Categories listener error:', err.message);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const openAddModal = () => {
    setEditingCategory(null);
    setCategoryName('');
    setCategoryDescription('');
    setIsModalOpen(true);
  };

  const openEditModal = (cat: AdminCategory) => {
    setEditingCategory(cat);
    setCategoryName(cat.name);
    setCategoryDescription(cat.description || '');
    setIsModalOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryName.trim()) return;
    setSaving(true);

    const slug = categoryName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');

    try {
      if (editingCategory) {
        await updateDoc(doc(db, 'categories', editingCategory.id), {
          name: categoryName.trim(),
          slug,
          description: categoryDescription.trim(),
          updatedAt: new Date().toISOString(),
        });
        showToast('Category updated successfully!', 'success');
      } else {
        const newId = `cat_${Date.now()}`;
        await setDoc(doc(db, 'categories', newId), {
          id: newId,
          name: categoryName.trim(),
          slug,
          description: categoryDescription.trim(),
          order: categories.length + 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        showToast('New category created!', 'success');
      }
      setIsModalOpen(false);
    } catch (err: any) {
      showToast(err.message || 'Failed to save category', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete category "${name}"?`)) return;
    try {
      await deleteDoc(doc(db, 'categories', id));
      showToast('Category deleted', 'info');
    } catch (err: any) {
      showToast(err.message || 'Failed to delete category', 'error');
    }
  };

  const handleMoveOrder = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= categories.length) return;

    const currentItem = categories[index];
    const targetItem = categories[targetIndex];

    try {
      await updateDoc(doc(db, 'categories', currentItem.id), { order: targetIndex + 1 });
      await updateDoc(doc(db, 'categories', targetItem.id), { order: index + 1 });
      showToast('Order updated', 'success');
    } catch (err: any) {
      showToast('Could not reorder categories', 'error');
    }
  };

  const filteredCategories = categories.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-light-text dark:text-dark-text tracking-tight">
            Categories Management
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Organize courses into high-converting categories. Reordering here changes mobile filter chips live.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={openAddModal}
          icon={<Plus className="w-4 h-4" />}
        >
          Add New Category
        </Button>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search categories..."
          className="w-full pl-10 pr-4 py-2.5 rounded-btn bg-white dark:bg-dark-surface border border-light-border dark:border-dark-border text-sm text-light-text dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-sm"
        />
      </div>

      {/* Category List Table */}
      <div className="bg-white dark:bg-dark-surface rounded-card border border-light-border dark:border-dark-border shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-16 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="p-12 text-center">
            <FolderTree className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <h3 className="font-bold text-light-text dark:text-dark-text">No categories found</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              Create your first category to organize your course catalog for students.
            </p>
            <Button variant="primary" onClick={openAddModal} className="mt-4" icon={<Plus className="w-4 h-4" />}>
              Add Category
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-light-border dark:divide-dark-border">
            {filteredCategories.map((cat, idx) => (
              <div
                key={cat.id}
                className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold text-sm">
                    {idx + 1}
                  </div>
                  <div>
                    <h3 className="font-bold text-light-text dark:text-dark-text">
                      {cat.name}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                      slug: {cat.slug} {cat.description ? `• ${cat.description}` : ''}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Order controls */}
                  <div className="flex items-center border border-light-border dark:border-dark-border rounded-lg overflow-hidden mr-2">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMoveOrder(idx, 'up')}
                      className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Move Up"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === filteredCategories.length - 1}
                      onClick={() => handleMoveOrder(idx, 'down')}
                      className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed border-l border-light-border dark:border-dark-border"
                      title="Move Down"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openEditModal(cat)}
                    icon={<Edit className="w-3.5 h-3.5" />}
                  >
                    Edit
                  </Button>

                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => handleDeleteCategory(cat.id, cat.name)}
                    icon={<Trash2 className="w-3.5 h-3.5" />}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add / Edit Category Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-dark-surface rounded-card border border-light-border dark:border-dark-border w-full max-w-md p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold font-display text-light-text dark:text-dark-text">
              {editingCategory ? 'Edit Category' : 'Create New Category'}
            </h3>

            <form onSubmit={handleSaveCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                  Category Name
                </label>
                <input
                  type="text"
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  placeholder="e.g. YouTube Growth, Video Editing"
                  required
                  className="w-full px-3.5 py-2.5 rounded-btn bg-slate-50 dark:bg-dark-bg border border-light-border dark:border-dark-border text-sm text-light-text dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">
                  Brief Description (Optional)
                </label>
                <textarea
                  value={categoryDescription}
                  onChange={(e) => setCategoryDescription(e.target.value)}
                  placeholder="What creators learn in this track..."
                  rows={2}
                  className="w-full px-3.5 py-2.5 rounded-btn bg-slate-50 dark:bg-dark-bg border border-light-border dark:border-dark-border text-sm text-light-text dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  loading={saving}
                >
                  {editingCategory ? 'Save Changes' : 'Create Category'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};