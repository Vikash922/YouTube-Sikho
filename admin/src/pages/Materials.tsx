import React, { useState, useEffect } from 'react';
import {
  FileText,
  Plus,
  Trash2,
  Edit2,
  ArrowUp,
  ArrowDown,
  Upload,
  CheckCircle,
  AlertCircle,
  Loader2,
  X,
  Search,
  Layers,
  FileArchive,
  Link as LinkIcon,
} from 'lucide-react';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { ref, uploadBytesResumable, deleteObject } from 'firebase/storage';
import { db, storage, functions, httpsCallable } from '../firebase';
import { Course, Material } from '../types';

export const Materials: React.FC = () => {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCourseId, setFilterCourseId] = useState<string>('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMaterialId, setEditingMaterialId] = useState<string | null>(null);

  // Form Fields
  const [courseId, setCourseId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'pdf' | 'zip' | 'link'>('pdf');
  const [externalUrl, setExternalUrl] = useState('');
  const [isPublished, setIsPublished] = useState(true);

  // File Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [existingStoragePath, setExistingStoragePath] = useState<string>('');
  const [existingR2Key, setExistingR2Key] = useState<string>('');
  const [existingFileName, setExistingFileName] = useState<string>('');
  const [existingSizeBytes, setExistingSizeBytes] = useState<number>(0);

  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Load courses
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const snap = await getDocs(collection(db, 'courses'));
        setCourses(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Course)));
      } catch (err: any) {
        console.warn('Courses fetch error:', err.message);
      }
    };
    fetchCourses();
  }, []);

  // Real-time listener for materials
  useEffect(() => {
    const q = query(collection(db, 'materials'), orderBy('order', 'asc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: Material[] = snapshot.docs.map((d) => {
          const raw = d.data() as any;
          return {
            id: d.id,
            courseId: raw.courseId || '',
            courseTitle: raw.courseTitle || '',
            title: raw.title || 'Untitled Material',
            description: raw.description || '',
            type: raw.type || 'pdf',
            storagePath: raw.storagePath || raw.filePath || '',
            r2Key: raw.r2Key || '',
            fileName: raw.fileName || '',
            externalUrl: raw.externalUrl || raw.url || '',
            sizeBytes: raw.sizeBytes || raw.fileSize || 0,
            order: typeof raw.order === 'number' ? raw.order : 1,
            isPublished: raw.isPublished !== false,
            createdAt: raw.createdAt,
            updatedAt: raw.updatedAt,
          };
        });
        setMaterials(list);
        setLoading(false);
      },
      (err) => {
        console.warn('Materials listener error:', err.message);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  // Auto-dismiss feedback after 4 seconds
  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  const openCreateModal = () => {
    setEditingMaterialId(null);
    setCourseId(courses[0]?.id || '');
    setTitle('');
    setDescription('');
    setType('pdf');
    setExternalUrl('');
    setIsPublished(true);
    setSelectedFile(null);
    setUploadProgress(null);
    setExistingStoragePath('');
    setExistingR2Key('');
    setExistingFileName('');
    setExistingSizeBytes(0);
    setIsModalOpen(true);
  };

  const openEditModal = (item: Material) => {
    setEditingMaterialId(item.id);
    setCourseId(item.courseId);
    setTitle(item.title);
    setDescription(item.description);
    setType(item.type);
    setExternalUrl(item.externalUrl || '');
    setIsPublished(item.isPublished);
    setSelectedFile(null);
    setUploadProgress(null);
    setExistingStoragePath(item.storagePath || '');
    setExistingR2Key(item.r2Key || '');
    setExistingFileName(item.fileName || '');
    setExistingSizeBytes(item.sizeBytes || 0);
    setIsModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit: 50MB
    const maxBytes = 50 * 1024 * 1024;
    if (file.size > maxBytes) {
      setFeedback({ type: 'error', message: 'File size exceeds 50MB limit.' });
      return;
    }

    // Check content-type
    if (type === 'pdf' && file.type !== 'application/pdf') {
      setFeedback({ type: 'error', message: 'Selected file is not a valid PDF document.' });
      return;
    }
    if (type === 'zip' && !file.type.includes('zip') && !file.name.endsWith('.zip')) {
      setFeedback({ type: 'error', message: 'Selected file is not a valid ZIP archive.' });
      return;
    }

    setSelectedFile(file);
    if (!title.trim()) {
      // Auto-populate title from sanitized file name
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
      setTitle(nameWithoutExt);
    }
  };

  const handleSaveMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setFeedback({ type: 'error', message: 'Title is required.' });
      return;
    }
    if (!courseId) {
      setFeedback({ type: 'error', message: 'Please select a course.' });
      return;
    }

    if (type === 'link') {
      if (!externalUrl.trim() || !externalUrl.startsWith('https://')) {
        setFeedback({ type: 'error', message: 'External link must be a valid secure URL starting with https://' });
        return;
      }
    } else {
      if (!editingMaterialId && !selectedFile) {
        setFeedback({ type: 'error', message: `Please upload a ${type.toUpperCase()} file.` });
        return;
      }
    }

    setSaving(true);
    const selectedCourse = courses.find((c) => c.id === courseId);
    let finalStoragePath = existingStoragePath;
    let finalR2Key = existingR2Key;
    let finalFileName = existingFileName;
    let finalSizeBytes = existingSizeBytes;

    try {
      // 1. Upload file if a new file is chosen
      if (selectedFile && (type === 'pdf' || type === 'zip')) {
        let uploadedToR2 = false;

        // Try direct upload to Cloudflare R2 first (Zero Egress, Free Bandwidth)
        try {
          const getUploadUrlCallable = httpsCallable<
            { courseId: string; fileName: string; contentType: string; sizeBytes: number },
            { uploadUrl: string; key: string; fileName: string; expiresAt: number }
          >(functions, 'getMaterialUploadUrl');

          const uploadRes = await getUploadUrlCallable({
            courseId,
            fileName: selectedFile.name,
            contentType: selectedFile.type || (type === 'pdf' ? 'application/pdf' : 'application/zip'),
            sizeBytes: selectedFile.size,
          });

          const { uploadUrl, key, fileName: cleanName } = uploadRes.data;

          await new Promise<void>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('PUT', uploadUrl);
            xhr.setRequestHeader(
              'Content-Type',
              selectedFile.type || (type === 'pdf' ? 'application/pdf' : 'application/zip')
            );

            xhr.upload.onprogress = (evt) => {
              if (evt.lengthComputable) {
                const percent = Math.round((evt.loaded / evt.total) * 100);
                setUploadProgress(percent);
              }
            };

            xhr.onload = () => {
              if (xhr.status >= 200 && xhr.status < 300) {
                resolve();
              } else {
                reject(new Error(`R2 upload responded with status ${xhr.status}`));
              }
            };

            xhr.onerror = () =>
              reject(new Error('Network error during R2 upload. Verify Cloudflare CORS configuration.'));
            xhr.send(selectedFile);
          });

          finalR2Key = key;
          finalFileName = cleanName;
          finalStoragePath = key;
          finalSizeBytes = selectedFile.size;
          uploadedToR2 = true;
        } catch (r2Err: any) {
          console.warn('Direct R2 upload not active or failed, falling back to Firebase Storage:', r2Err);
        }

        // Fallback to Firebase Storage if R2 is not configured
        if (!uploadedToR2) {
          const sanitizedFileName = selectedFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
          const storageFilePath = `materials/${courseId}/${Date.now()}_${sanitizedFileName}`;
          const fileRef = ref(storage, storageFilePath);

          const uploadTask = uploadBytesResumable(fileRef, selectedFile, {
            contentType: selectedFile.type || (type === 'pdf' ? 'application/pdf' : 'application/zip'),
          });

          await new Promise<void>((resolve, reject) => {
            uploadTask.on(
              'state_changed',
              (snapshot) => {
                const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
                setUploadProgress(progress);
              },
              (error) => reject(error),
              () => resolve()
            );
          });

          finalStoragePath = storageFilePath;
          finalFileName = sanitizedFileName;
          finalSizeBytes = selectedFile.size;

          // If replacing an old storage file, clean up old file
          if (existingStoragePath && existingStoragePath !== storageFilePath && !existingStoragePath.startsWith('courses/')) {
            try {
              await deleteObject(ref(storage, existingStoragePath));
            } catch (delErr) {
              console.warn('Could not remove old file:', delErr);
            }
          }
        }
      }

      const courseMaterials = materials.filter((m) => m.courseId === courseId);
      const nextOrder = editingMaterialId
        ? materials.find((m) => m.id === editingMaterialId)?.order || 1
        : courseMaterials.length + 1;

      const payload: any = {
        courseId,
        courseTitle: selectedCourse?.title || '',
        title: title.trim(),
        description: description.trim(),
        type,
        sizeBytes: finalSizeBytes,
        order: nextOrder,
        isPublished: Boolean(isPublished),
        fileName: finalFileName,
        updatedAt: serverTimestamp(),
      };

      if (type === 'link') {
        payload.externalUrl = externalUrl.trim();
        payload.storagePath = '';
        payload.r2Key = '';
      } else {
        payload.storagePath = finalStoragePath;
        if (finalR2Key) {
          payload.r2Key = finalR2Key;
        }
        payload.externalUrl = '';
      }

      if (editingMaterialId) {
        await updateDoc(doc(db, 'materials', editingMaterialId), payload);
        setFeedback({ type: 'success', message: 'Study material updated successfully!' });
      } else {
        await addDoc(collection(db, 'materials'), {
          ...payload,
          createdAt: serverTimestamp(),
        });
        setFeedback({ type: 'success', message: 'New study material added to course!' });
      }

      setIsModalOpen(false);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to save study material.' });
    } finally {
      setSaving(false);
      setUploadProgress(null);
    }
  };

  const handleDeleteMaterial = async (item: Material) => {
    if (!window.confirm(`Permanently delete "${item.title}"? This cannot be undone.`)) return;

    try {
      // 1. Delete file from Firebase Storage
      if (item.storagePath) {
        try {
          await deleteObject(ref(storage, item.storagePath));
        } catch (storageErr: any) {
          console.warn('Storage file deletion error:', storageErr.message);
        }
      }

      // 2. Delete Firestore document
      await deleteDoc(doc(db, 'materials', item.id));

      // 3. Re-index remaining course materials
      const remaining = materials.filter((m) => m.courseId === item.courseId && m.id !== item.id);
      const batch = writeBatch(db);
      remaining.forEach((m, idx) => {
        const order = idx + 1;
        if (m.order !== order) {
          batch.update(doc(db, 'materials', m.id), { order });
        }
      });
      await batch.commit();

      setFeedback({ type: 'success', message: `Deleted material "${item.title}".` });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to delete material.' });
    }
  };

  const handleMoveOrder = async (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= filteredMaterials.length) return;

    const currentItem = filteredMaterials[index];
    const targetItem = filteredMaterials[targetIdx];

    const currentOrder = currentItem.order;
    const targetOrder = targetItem.order;

    try {
      const batch = writeBatch(db);
      batch.update(doc(db, 'materials', currentItem.id), { order: targetOrder });
      batch.update(doc(db, 'materials', targetItem.id), { order: currentOrder });
      await batch.commit();
    } catch (err: any) {
      console.warn('Reorder failed:', err.message);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const filteredMaterials = materials.filter((m) => {
    const matchesSearch =
      m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.courseTitle && m.courseTitle.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCourse = filterCourseId === 'all' || m.courseId === filterCourseId;
    return matchesSearch && matchesCourse;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <FileText className="w-6 h-6 text-brand-500" /> Study Materials & PDFs
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Upload course PDF notes, cheat-sheets, resource ZIP archives, and external documentation.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs uppercase tracking-wider rounded-none shadow-sm transition-colors self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Study Material</span>
        </button>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-3 rounded-none flex items-center justify-between gap-3 border text-xs font-semibold ${
            feedback.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
              : 'bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 border-red-300 dark:border-red-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle className="w-4 h-4 flex-shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Filter / Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-white dark:bg-dark-surface p-3 border border-slate-200 dark:border-slate-800 rounded-none shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search material title or course..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-none focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
        <div className="w-full sm:w-64">
          <select
            value={filterCourseId}
            onChange={(e) => setFilterCourseId(e.target.value)}
            className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-none focus:outline-none focus:ring-1 focus:ring-brand-500 font-semibold"
          >
            <option value="all">All Courses ({courses.length})</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Materials Table */}
      <div className="bg-white dark:bg-dark-surface border border-slate-200 dark:border-slate-800 rounded-none shadow-sm overflow-hidden">
        <div className="p-3 bg-slate-50/70 dark:bg-slate-900/70 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-brand-500" />
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Uploaded Course Files ({filteredMaterials.length})
            </h3>
          </div>
          <span className="text-[11px] text-slate-400">Canonical Materials (Part 6.6)</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-brand-500" />
            <span className="text-xs">Loading course materials...</span>
          </div>
        ) : filteredMaterials.length === 0 ? (
          <div className="p-12 text-center text-slate-500 dark:text-slate-400">
            <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2 opacity-50" />
            <p className="text-xs font-semibold">No study materials found.</p>
            <button
              onClick={openCreateModal}
              className="mt-3 px-3 py-1 bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs uppercase rounded-none"
            >
              + Upload First File
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-2.5 px-4">Order</th>
                  <th className="py-2.5 px-4">Title & Description</th>
                  <th className="py-2.5 px-4">Course</th>
                  <th className="py-2.5 px-4">Format / Size</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredMaterials.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-400 text-xs">
                      <div className="flex items-center gap-1.5">
                        <span>#{item.order}</span>
                        <div className="flex flex-col">
                          <button
                            onClick={() => handleMoveOrder(idx, 'up')}
                            disabled={idx === 0}
                            className="text-slate-400 hover:text-slate-600 disabled:opacity-20"
                            title="Move Up"
                          >
                            <ArrowUp className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleMoveOrder(idx, 'down')}
                            disabled={idx === filteredMaterials.length - 1}
                            className="text-slate-400 hover:text-slate-600 disabled:opacity-20"
                            title="Move Down"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 max-w-xs">
                      <div className="flex items-center gap-2">
                        {item.type === 'pdf' ? (
                          <FileText className="w-4 h-4 text-red-500 flex-shrink-0" />
                        ) : item.type === 'zip' ? (
                          <FileArchive className="w-4 h-4 text-amber-500 flex-shrink-0" />
                        ) : (
                          <LinkIcon className="w-4 h-4 text-blue-500 flex-shrink-0" />
                        )}
                        <div>
                          <div className="font-semibold text-slate-800 dark:text-slate-200">
                            {item.title}
                          </div>
                          {item.description ? (
                            <div className="text-[10px] text-slate-400 truncate max-w-xs">
                              {item.description}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-500 dark:text-slate-400">
                      {item.courseTitle || courses.find((c) => c.id === item.courseId)?.title || 'General'}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <span className="uppercase font-bold">{item.type}</span>
                        <span>•</span>
                        <span>{item.type === 'link' ? 'External Link' : formatFileSize(item.sizeBytes)}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {item.isPublished ? (
                        <span className="px-1.5 py-0.5 rounded-none bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                          Published
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded-none bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 text-[10px] font-bold">
                          Draft
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => openEditModal(item)}
                          className="p-1.5 text-slate-400 hover:text-brand-600 rounded-none hover:bg-slate-100 dark:hover:bg-slate-800"
                          title="Edit Material"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteMaterial(item)}
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded-none hover:bg-slate-100 dark:hover:bg-slate-800"
                          title="Delete File from Storage & Database"
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

      {/* Upload / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-dark-surface w-full max-w-lg rounded-none border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <FileText className="w-4 h-4 text-brand-500" />
                {editingMaterialId ? 'Edit Study Material' : 'Upload New Study Material'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveMaterial} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                  Target Course *
                </label>
                <select
                  value={courseId}
                  onChange={(e) => setCourseId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs rounded-none focus:outline-none focus:ring-1 focus:ring-brand-500 font-medium"
                  required
                >
                  <option value="">Select a course...</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                  Material Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. YouTube Title & Thumbnail Formula Guide (PDF)"
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold rounded-none focus:outline-none focus:ring-1 focus:ring-brand-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                  Description / Topic Notes
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Summary of resources included in this document..."
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs rounded-none focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              {/* Resource Type Selection */}
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                  Resource Type *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['pdf', 'zip', 'link'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setType(t)}
                      className={`py-2 px-3 text-xs font-bold uppercase rounded-none border flex items-center justify-center gap-1.5 transition-colors ${
                        type === t
                          ? 'bg-brand-500 text-white border-brand-500'
                          : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {t === 'pdf' ? (
                        <FileText className="w-3.5 h-3.5" />
                      ) : t === 'zip' ? (
                        <FileArchive className="w-3.5 h-3.5" />
                      ) : (
                        <LinkIcon className="w-3.5 h-3.5" />
                      )}
                      <span>{t}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* File Upload or Link Input */}
              {type === 'link' ? (
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400 mb-1">
                    External HTTPS Resource Link *
                  </label>
                  <input
                    type="url"
                    value={externalUrl}
                    onChange={(e) => setExternalUrl(e.target.value)}
                    placeholder="https://docs.google.com/document/d/..."
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono rounded-none focus:outline-none focus:ring-1 focus:ring-brand-500"
                    required
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase text-slate-600 dark:text-slate-400">
                    Upload {type.toUpperCase()} File (Max 50MB) *
                  </label>

                  <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 p-4 text-center bg-slate-50/50 dark:bg-slate-900/50 rounded-none">
                    <input
                      type="file"
                      id="matFileInput"
                      onChange={handleFileChange}
                      accept={type === 'pdf' ? '.pdf,application/pdf' : '.zip,application/zip'}
                      className="hidden"
                    />
                    <label
                      htmlFor="matFileInput"
                      className="cursor-pointer flex flex-col items-center justify-center gap-2"
                    >
                      <Upload className="w-6 h-6 text-brand-500" />
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {selectedFile
                          ? `Selected: ${selectedFile.name} (${formatFileSize(selectedFile.size)})`
                          : existingStoragePath
                          ? `Current: ${existingStoragePath.split('/').pop()} (Click to replace)`
                          : `Click to browse or drop ${type.toUpperCase()} file`}
                      </span>
                    </label>
                  </div>

                  {uploadProgress !== null && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] font-mono text-slate-500">
                        <span>Uploading to Storage...</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-none overflow-hidden">
                        <div
                          className="bg-brand-500 h-full transition-all duration-200"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Publish Toggle */}
              <div className="flex items-center gap-2 pt-1 border-t border-slate-200 dark:border-slate-800">
                <input
                  type="checkbox"
                  id="pubMatCheck"
                  checked={isPublished}
                  onChange={(e) => setIsPublished(e.target.checked)}
                  className="w-3.5 h-3.5 text-brand-600 focus:ring-brand-500 rounded-none"
                />
                <label htmlFor="pubMatCheck" className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  Publish Material (Enrolled students can download or view)
                </label>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 text-xs font-bold uppercase rounded-none hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-1.5 bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold uppercase rounded-none disabled:opacity-50 flex items-center gap-1.5"
                >
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingMaterialId ? 'Update Material' : 'Save Material'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
