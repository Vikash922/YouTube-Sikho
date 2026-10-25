import React, { useState, useEffect } from 'react';
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  updateDoc,
  getDocs,
  getDoc,
  query,
  orderBy,
  writeBatch,
  deleteField,
  serverTimestamp,
} from 'firebase/firestore';
import {
  BookOpen,
  Plus,
  Search,
  Edit,
  Trash2,
  Layers,
  ArrowLeft,
  Download,
  Loader2,
} from 'lucide-react';
import { db, functions, httpsCallable } from '../firebase';
import { Course, Section, Lesson } from '../types';
import { Button } from '../components/common/Button';
import { CourseContentBuilder } from '../components/courses/CourseContentBuilder';
import { useToast } from '../context/ToastContext';
import { ImageUploadField } from '../components/common/ImageUploadField';

export const Courses: React.FC = () => {
  const { showToast } = useToast();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Course Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [courseForm, setCourseForm] = useState({
    title: '',
    description: '',
    category: 'YouTube Growth',
    price: 1999,
    discountPrice: 999,
    instructor: 'Aman Dhattarwal',
    language: 'Hindi',
    thumbnailUrl: '',
    isPublished: true,
    isFeatured: false,
    isNew: false,
  });

  // Curriculum Builder view state
  const [activeCurriculumCourse, setActiveCurriculumCourse] = useState<Course | null>(null);
  const [curriculumSections, setCurriculumSections] = useState<Section[]>([]);
  const [savingCurriculum, setSavingCurriculum] = useState(false);
  const [loadingCurriculum, setLoadingCurriculum] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'courses'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        })) as Course[];
        setCourses(items);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching courses:', err);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleOpenAdd = () => {
    setEditingCourse(null);
    setCourseForm({
      title: '',
      description: '',
      category: 'YouTube Growth',
      price: 0,
      discountPrice: 0,
      instructor: '',
      language: 'Hindi',
      thumbnailUrl: '',
      isPublished: true,
      isFeatured: false,
      isNew: false,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (course: Course) => {
    setEditingCourse(course);
    setCourseForm({
      title: course.title || '',
      description: course.description || '',
      category: course.category || 'YouTube Growth',
      price: course.price || 0,
      discountPrice: course.discountPrice || 0,
      instructor: course.instructor || '',
      language: course.language || 'Hindi',
      thumbnailUrl: course.thumbnailUrl || '',
      isPublished: course.isPublished ?? true,
      isFeatured: course.isFeatured ?? false,
      isNew: course.isNew ?? false,
    });
    setIsModalOpen(true);
  };

  const handleSaveCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseForm.title.trim()) {
      showToast('Course title is required', 'error');
      return;
    }

    try {
      if (editingCourse) {
        await updateDoc(doc(db, 'courses', editingCourse.id), {
          ...courseForm,
          thumbnail: courseForm.thumbnailUrl,
          updatedAt: new Date().toISOString(),
        });
        showToast('Course updated successfully!', 'success');
      } else {
        const newId = `course_${Date.now()}`;
        await setDoc(doc(db, 'courses', newId), {
          id: newId,
          ...courseForm,
          thumbnail: courseForm.thumbnailUrl,
          order: courses.length + 1,
          totalLessons: 0,
          totalDuration: '0 Hours',
          sections: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        showToast('New course created!', 'success');
      }
      setIsModalOpen(false);
    } catch (err: any) {
      console.error('Save course error:', err);
      showToast(err.message || 'Failed to save course', 'error');
    }
  };

  const handleDeleteCourse = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this course and all its curriculum lessons? This action is irreversible.')) return;
    try {
      const deleteCourseCallable = httpsCallable<{ courseId: string }, { success: boolean }>(
        functions,
        'deleteCourse'
      );
      await deleteCourseCallable({ courseId: id });
      showToast('Course and syllabus subcollections deleted successfully', 'info');
    } catch (err: any) {
      console.error('Delete course error:', err);
      showToast(err.message || 'Failed to delete course', 'error');
    }
  };

  const parseDurationInSeconds = (dur: string | number | undefined): number => {
    if (!dur) return 0;
    if (typeof dur === 'number') return Math.round(dur);
    const parts = String(dur).trim().split(':').map((p) => parseInt(p, 10) || 0);
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 1 && !isNaN(Number(parts[0]))) return Number(parts[0]);
    return 0;
  };

  // Open Curriculum Editor (Loads subcollections if present, or legacy sections array)
  const handleOpenCurriculum = async (course: Course) => {
    setActiveCurriculumCourse(course);
    setLoadingCurriculum(true);
    try {
      const sectionsQuery = query(
        collection(db, 'courses', course.id, 'sections'),
        orderBy('order', 'asc')
      );
      const secSnap = await getDocs(sectionsQuery);

      if (!secSnap.empty) {
        const loadedSections: Section[] = [];
        for (const sDoc of secSnap.docs) {
          const secData = sDoc.data();
          const lessonsQuery = query(
            collection(db, 'courses', course.id, 'sections', sDoc.id, 'lessons'),
            orderBy('order', 'asc')
          );
          const lesSnap = await getDocs(lessonsQuery);
          const loadedLessons: Lesson[] = [];

          for (const lDoc of lesSnap.docs) {
            const lData = lDoc.data();
            let videoId = lData.videoId || '';
            try {
              const mediaSnap = await getDoc(
                doc(db, 'courses', course.id, 'sections', sDoc.id, 'lessons', lDoc.id, 'private', 'media')
              );
              if (mediaSnap.exists()) {
                const mData = mediaSnap.data();
                videoId = mData?.videoId || mData?.pdfPath || videoId;
              }
            } catch (mErr) {
              console.warn('Could not read private/media:', mErr);
            }

            loadedLessons.push({
              id: lDoc.id,
              title: lData.title || 'Untitled Lesson',
              type: lData.type || 'video',
              videoId: videoId,
              duration: lData.duration || '',
              order: lData.order || 1,
              isFreePreview: !!lData.isFreePreview,
            });
          }

          loadedSections.push({
            id: sDoc.id,
            title: secData.title || 'Untitled Section',
            order: secData.order || 1,
            lessons: loadedLessons,
          });
        }
        setCurriculumSections(loadedSections);
      } else {
        setCurriculumSections(course.sections || []);
      }
    } catch (err: any) {
      console.error('Failed to load subcollection curriculum:', err);
      setCurriculumSections(course.sections || []);
      showToast('Loaded curriculum from course doc (subcollections empty)', 'info');
    } finally {
      setLoadingCurriculum(false);
    }
  };

  const handleSaveCurriculum = async () => {
    if (!activeCurriculumCourse) return;
    setSavingCurriculum(true);
    try {
      const courseId = activeCurriculumCourse.id;

      // 1. Calculate totals
      let totalLessons = 0;
      let totalDurationSeconds = 0;
      for (const sec of curriculumSections) {
        for (const les of sec.lessons || []) {
          totalLessons++;
          totalDurationSeconds += parseDurationInSeconds(les.duration);
        }
      }

      // 2. Fetch existing subcollections to detect deletions
      const existingSectionsSnap = await getDocs(collection(db, 'courses', courseId, 'sections'));
      const currentSectionIds = new Set(curriculumSections.map((s) => s.id));

      const batch = writeBatch(db);

      // Clean up deleted sections and lessons
      for (const sDoc of existingSectionsSnap.docs) {
        if (!currentSectionIds.has(sDoc.id)) {
          const oldLessonsSnap = await getDocs(
            collection(db, 'courses', courseId, 'sections', sDoc.id, 'lessons')
          );
          for (const lDoc of oldLessonsSnap.docs) {
            batch.delete(doc(db, 'courses', courseId, 'sections', sDoc.id, 'lessons', lDoc.id, 'private', 'media'));
            batch.delete(doc(db, 'courses', courseId, 'sections', sDoc.id, 'lessons', lDoc.id));
          }
          batch.delete(doc(db, 'courses', courseId, 'sections', sDoc.id));
        } else {
          const currentSec = curriculumSections.find((s) => s.id === sDoc.id);
          const currentLessonIds = new Set((currentSec?.lessons || []).map((l) => l.id));
          const oldLessonsSnap = await getDocs(
            collection(db, 'courses', courseId, 'sections', sDoc.id, 'lessons')
          );
          for (const lDoc of oldLessonsSnap.docs) {
            if (!currentLessonIds.has(lDoc.id)) {
              batch.delete(doc(db, 'courses', courseId, 'sections', sDoc.id, 'lessons', lDoc.id, 'private', 'media'));
              batch.delete(doc(db, 'courses', courseId, 'sections', sDoc.id, 'lessons', lDoc.id));
            }
          }
        }
      }

      // 3. Write active sections, lessons, and private/media
      curriculumSections.forEach((sec, secIdx) => {
        const secRef = doc(db, 'courses', courseId, 'sections', sec.id);
        batch.set(secRef, {
          id: sec.id,
          title: sec.title,
          order: secIdx + 1,
          updatedAt: serverTimestamp(),
        }, { merge: true });

        (sec.lessons || []).forEach((les, lesIdx) => {
          const lesRef = doc(db, 'courses', courseId, 'sections', sec.id, 'lessons', les.id);
          batch.set(lesRef, {
            id: les.id,
            title: les.title,
            order: lesIdx + 1,
            type: les.type,
            duration: les.duration || '',
            durationSeconds: les.durationSeconds || 0,
            isFreePreview: !!les.isFreePreview,
            hasMedia: !!les.videoId,
            provider: 'youtube',
            updatedAt: serverTimestamp(),
          }, { merge: true });

          const mediaRef = doc(db, 'courses', courseId, 'sections', sec.id, 'lessons', les.id, 'private', 'media');
          batch.set(mediaRef, {
            provider: 'youtube',
            videoId: les.videoId || '',
            pdfPath: les.videoId || '',
            updatedAt: serverTimestamp(),
          }, { merge: true });
        });
      });

      // 4. Update course metadata: delete legacy sections array & store totals
      const courseRef = doc(db, 'courses', courseId);
      batch.update(courseRef, {
        totalLessons,
        lessonsCount: totalLessons,
        totalDurationSeconds,
        updatedAt: serverTimestamp(),
        sections: deleteField(),
      });

      await batch.commit();
      showToast('Curriculum saved to secure subcollections successfully!', 'success');
    } catch (err: any) {
      console.error('Save curriculum error:', err);
      showToast(err.message || 'Failed to save curriculum', 'error');
    } finally {
      setSavingCurriculum(false);
    }
  };

  // If in curriculum mode, render Curriculum Builder
  if (activeCurriculumCourse) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setActiveCurriculumCourse(null)}
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Courses
          </Button>
          <div className="border-l border-slate-300 dark:border-slate-700 h-6" />
          <div>
            <h2 className="text-lg font-bold font-display text-light-text dark:text-dark-text">
              {activeCurriculumCourse.title}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Editing course curriculum and video content
            </p>
          </div>
        </div>

        {loadingCurriculum ? (
          <div className="p-16 flex flex-col items-center justify-center space-y-3 bg-white dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-xl">
            <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
              Loading curriculum from secure subcollections...
            </p>
          </div>
        ) : (
          <CourseContentBuilder
            sections={curriculumSections}
            onChange={setCurriculumSections}
            onSave={handleSaveCurriculum}
            saving={savingCurriculum}
          />
        )}
      </div>
    );
  }

  const filteredCourses = courses.filter(
    (c) =>
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.instructor.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleExportCoursesCSV = () => {
    if (filteredCourses.length === 0) {
      showToast('No courses to export', 'error');
      return;
    }
    const headers = ['Course ID', 'Title', 'Category', 'Instructor', 'Price', 'Discount Price', 'Published', 'Lessons Count'];
    const rows = filteredCourses.map((c) => [
      c.id,
      c.title,
      c.category,
      c.instructor,
      c.price,
      c.discountPrice || '',
      c.isPublished !== false ? 'Yes' : 'No',
      c.totalLessons || c.lessonsCount || c.sections?.length || 0,
    ]);
    const csvContent = [
      headers.join(','),
      ...rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `courses_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Exported ${filteredCourses.length} courses to CSV`, 'success');
  };

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-display text-light-text dark:text-dark-text">
            Courses Management
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Create and edit masterclass courses, manage curriculum, and track pricing.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            icon={<Download className="w-4 h-4" />}
            onClick={handleExportCoursesCSV}
          >
            Export CSV
          </Button>
          <Button variant="primary" onClick={handleOpenAdd}>
            <Plus className="w-4 h-4 mr-2" /> Add New Course
          </Button>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by title, instructor or category..."
          className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-surface text-light-text dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
        />
      </div>

      {/* Courses Grid / List */}
      {loading ? (
        <div className="p-12 text-center text-sm text-slate-400">
          Loading courses catalog...
        </div>
      ) : filteredCourses.length === 0 ? (
        <div className="p-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-dark-surface">
          <BookOpen className="w-10 h-10 text-slate-400 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
            No courses found
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Create your first course to start adding lessons.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((course) => (
            <div
              key={course.id}
              className="rounded-2xl border border-light-border dark:border-dark-border bg-white dark:bg-dark-surface overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
            >
              <div>
                {/* Course Header Thumbnail */}
                <div className="relative h-40 bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  {course.thumbnailUrl ? (
                    <img
                      src={course.thumbnailUrl}
                      alt={course.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                      <BookOpen className="w-10 h-10" />
                    </div>
                  )}
                  <div className="absolute top-3 left-3 flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-brand-600 text-white shadow-sm">
                      {course.category}
                    </span>
                    {course.isFeatured && (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500 text-white shadow-sm">
                        Featured
                      </span>
                    )}
                  </div>
                  <div className="absolute top-3 right-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-bold shadow-sm ${
                        course.isPublished
                          ? 'bg-emerald-500 text-white'
                          : 'bg-slate-700 text-slate-200'
                      }`}
                    >
                      {course.isPublished ? 'Published' : 'Draft'}
                    </span>
                  </div>
                </div>

                {/* Details */}
                <div className="p-5 space-y-3">
                  <h3 className="font-bold font-display text-base text-light-text dark:text-dark-text line-clamp-1">
                    {course.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                    {course.description || 'No description provided.'}
                  </p>

                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span>By {course.instructor}</span>
                    <span className="flex items-center gap-1 font-semibold text-light-text dark:text-dark-text">
                      <Layers className="w-3.5 h-3.5 text-brand-500" />
                      {course.totalLessons ||
                        course.lessonsCount ||
                        course.sections?.reduce(
                          (acc, s) => acc + (s.lessons?.length || 0),
                          0
                        ) ||
                        0}{' '}
                      Lessons
                    </span>
                  </div>

                  <div className="flex items-baseline gap-2">
                    <span className="text-base font-bold text-brand-600 dark:text-brand-400 font-display">
                      ₹{course.discountPrice || course.price}
                    </span>
                    {course.discountPrice && course.discountPrice < course.price && (
                      <span className="text-xs text-slate-400 line-through">
                        ₹{course.price}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-4 border-t border-light-border dark:border-dark-border bg-slate-50/50 dark:bg-slate-900/30 flex items-center justify-between gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleOpenCurriculum(course)}
                  className="flex-1 text-xs"
                >
                  <Layers className="w-3.5 h-3.5 mr-1" /> Add/Manage Lessons & Videos
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleOpenEdit(course)}
                  className="text-xs"
                >
                  <Edit className="w-3.5 h-3.5" />
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteCourse(course.id)}
                  className="text-xs text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Course Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-light-border dark:border-dark-border flex items-center justify-between">
              <h3 className="font-bold font-display text-base text-light-text dark:text-dark-text">
                {editingCourse ? 'Edit Course Details' : 'Create New Course'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCourse} className="p-6 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Course Title *
                </label>
                <input
                  type="text"
                  required
                  value={courseForm.title}
                  onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })}
                  placeholder="e.g. YouTube Complete Masterclass 2026"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-light-border dark:border-dark-border bg-slate-50 dark:bg-slate-800/50 text-light-text dark:text-dark-text focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={courseForm.description}
                  onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })}
                  placeholder="Brief course overview..."
                  className="w-full px-3 py-2 text-sm rounded-xl border border-light-border dark:border-dark-border bg-slate-50 dark:bg-slate-800/50 text-light-text dark:text-dark-text focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Original Price (₹)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={courseForm.price}
                    onChange={(e) =>
                      setCourseForm({ ...courseForm, price: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 text-sm rounded-xl border border-light-border dark:border-dark-border bg-slate-50 dark:bg-slate-800/50 text-light-text dark:text-dark-text focus:outline-none focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Discount Price (₹)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={courseForm.discountPrice}
                    onChange={(e) =>
                      setCourseForm({ ...courseForm, discountPrice: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 text-sm rounded-xl border border-light-border dark:border-dark-border bg-slate-50 dark:bg-slate-800/50 text-light-text dark:text-dark-text focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Instructor Name
                  </label>
                  <input
                    type="text"
                    value={courseForm.instructor}
                    onChange={(e) =>
                      setCourseForm({ ...courseForm, instructor: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm rounded-xl border border-light-border dark:border-dark-border bg-slate-50 dark:bg-slate-800/50 text-light-text dark:text-dark-text focus:outline-none focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Category
                  </label>
                  <select
                    value={courseForm.category}
                    onChange={(e) =>
                      setCourseForm({ ...courseForm, category: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm rounded-xl border border-light-border dark:border-dark-border bg-slate-50 dark:bg-slate-800/50 text-light-text dark:text-dark-text focus:outline-none focus:border-brand-500"
                  >
                    <option value="YouTube Growth">YouTube Growth</option>
                    <option value="Video Editing">Video Editing</option>
                    <option value="Monetization">Monetization</option>
                    <option value="Audio Production">Audio Production</option>
                  </select>
                </div>
              </div>

              <ImageUploadField
                label="Course Cover Thumbnail"
                value={courseForm.thumbnailUrl}
                onChange={(url) => setCourseForm({ ...courseForm, thumbnailUrl: url })}
                aspectRatio="16/9"
                storageFolder="thumbnails"
                helpText="Upload course cover from phone/PC, or paste Google Photos / Drive / image link."
              />

              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={courseForm.isPublished}
                    onChange={(e) =>
                      setCourseForm({ ...courseForm, isPublished: e.target.checked })
                    }
                    className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  />
                  Published
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={courseForm.isFeatured}
                    onChange={(e) =>
                      setCourseForm({ ...courseForm, isFeatured: e.target.checked })
                    }
                    className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  />
                  Featured Badge
                </label>
              </div>

              <div className="pt-4 border-t border-light-border dark:border-dark-border flex justify-end gap-3">
                <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit">
                  {editingCourse ? 'Save Changes' : 'Create Course'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
