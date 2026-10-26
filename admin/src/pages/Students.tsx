import React, { useState, useEffect } from 'react';
import {
  collection,
  onSnapshot,
  query,
  doc,
  deleteDoc,
  updateDoc,
  setDoc,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import {
  BookOpen,
  UserCheck,
  UserX,
  Mail,
  Phone,
  Loader2,
  Star,
  Eye,
  EyeOff,
  Trash2,
} from 'lucide-react';
import { db, functions } from '../firebase';
import { Course } from '../types';
import { useToast } from '../context/ToastContext';
import { DataTable, Column } from '../components/common/DataTable';

export interface AdminStudent {
  uid: string;
  name?: string;
  email?: string;
  phone?: string;
  photoUrl?: string;
  isBlocked?: boolean;
  blockReason?: string;
  createdAt?: any;
}

export interface AdminReview {
  id: string;
  uid: string;
  userName?: string;
  courseId: string;
  courseTitle?: string;
  rating: number;
  comment: string;
  isHidden?: boolean;
  createdAt?: any;
}

export const Students: React.FC = () => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'students' | 'reviews'>('students');
  const [students, setStudents] = useState<AdminStudent[]>([]);
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [loadingReviews, setLoadingReviews] = useState(true);

  // Manual Enroll Modal State
  const [selectedStudent, setSelectedStudent] = useState<AdminStudent | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [enrolling, setEnrolling] = useState(false);

  // 1. Listen to /users collection
  useEffect(() => {
    const q = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({
          uid: d.id,
          ...d.data(),
        })) as AdminStudent[];
        setStudents(list);
        setLoadingStudents(false);
      },
      (err) => {
        console.warn('Students listener error:', err.message);
        setLoadingStudents(false);
      }
    );
    return () => unsubscribe();
  }, []);

  // 2. Listen to /reviews collection for Moderation
  useEffect(() => {
    const q = query(collection(db, 'reviews'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as AdminReview[];
        setReviews(list);
        setLoadingReviews(false);
      },
      (err) => {
        console.warn('Reviews listener error:', err.message);
        setLoadingReviews(false);
      }
    );
    return () => unsubscribe();
  }, []);

  // 3. Fetch courses for manual enroll dropdown
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const snap = await getDocs(collection(db, 'courses'));
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Course));
        setCourses(list);
        if (list.length > 0) setSelectedCourseId(list[0].id);
      } catch (err) {
        console.warn('Could not load courses for enrollment dropdown:', err);
      }
    };
    fetchCourses();
  }, []);

  // Block / Unblock student toggle with Cloud Functions fallback
  const handleToggleBlock = async (student: AdminStudent) => {
    const nextBlocked = !student.isBlocked;
    const confirmMsg = nextBlocked
      ? `Block student "${student.name || student.email || student.uid}"? Their active session will be terminated immediately.`
      : `Unblock student "${student.name || student.email || student.uid}"?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      if (nextBlocked) {
        // Try Cloud Function callable first
        try {
          const blockFn = httpsCallable<{ uid: string; reason?: string }>(functions, 'blockUser');
          await blockFn({ uid: student.uid, reason: 'Account suspended by administrator' });
        } catch {
          // Fallback to direct Firestore update
          await updateDoc(doc(db, 'users', student.uid), {
            isBlocked: true,
            blockReason: 'Account suspended by administrator',
            blockedAt: serverTimestamp(),
          });
        }
        showToast(`Student ${student.name || 'user'} has been blocked.`, 'info');
      } else {
        try {
          const unblockFn = httpsCallable<{ uid: string }>(functions, 'unblockUser');
          await unblockFn({ uid: student.uid });
        } catch {
          await updateDoc(doc(db, 'users', student.uid), {
            isBlocked: false,
            unblockedAt: serverTimestamp(),
          });
        }
        showToast(`Student ${student.name || 'user'} has been unblocked.`, 'success');
      }
    } catch (err: any) {
      showToast(err.message || 'Could not update student status', 'error');
    }
  };

  // Manual course enrollment
  const handleManualEnroll = async () => {
    if (!selectedStudent || !selectedCourseId) return;
    setEnrolling(true);

    const enrollmentId = `${selectedStudent.uid}_${selectedCourseId}`;
    const selectedCourse = courses.find((c) => c.id === selectedCourseId);

    try {
      await setDoc(doc(db, 'enrollments', enrollmentId), {
        id: enrollmentId,
        uid: selectedStudent.uid,
        courseId: selectedCourseId,
        courseTitle: selectedCourse?.title || 'Masterclass',
        status: 'active',
        active: true,
        enrolledBy: 'admin',
        createdAt: new Date().toISOString(),
      });
      showToast(
        `Enrolled ${selectedStudent.name || 'student'} into "${selectedCourse?.title}"!`,
        'success'
      );
      setIsEnrollModalOpen(false);
    } catch (err: any) {
      showToast(err.message || 'Could not enroll student', 'error');
    } finally {
      setEnrolling(false);
    }
  };

  // Toggle Review Visibility (Hide / Show)
  const handleToggleReviewVisibility = async (review: AdminReview) => {
    const nextHidden = !review.isHidden;
    try {
      await updateDoc(doc(db, 'reviews', review.id), {
        isHidden: nextHidden,
        moderatedAt: serverTimestamp(),
      });
      showToast(
        `Review is now ${nextHidden ? 'hidden from students' : 'visible on course page'}.`,
        nextHidden ? 'info' : 'success'
      );
    } catch (err: any) {
      showToast(err.message || 'Could not update review visibility', 'error');
    }
  };

  // Delete Review
  const handleDeleteReview = async (reviewId: string) => {
    if (!window.confirm('Delete this review permanently?')) return;
    try {
      await deleteDoc(doc(db, 'reviews', reviewId));
      showToast('Review permanently deleted.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Could not delete review', 'error');
    }
  };

  // Student Columns for DataTable
  const studentColumns: Column<AdminStudent>[] = [
    {
      header: 'Student',
      accessorKey: 'name',
      sortable: true,
      cell: (student) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center font-bold text-xs uppercase overflow-hidden flex-shrink-0">
            {student.photoUrl ? (
              <img src={student.photoUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              (student.name || 'S').charAt(0)
            )}
          </div>
          <div>
            <div className="font-semibold text-light-text dark:text-dark-text text-xs">
              {student.name || 'Unnamed Student'}
            </div>
            <div className="text-[11px] text-slate-400 font-mono">
              {student.uid.slice(0, 10)}...
            </div>
          </div>
        </div>
      ),
    },
    {
      header: 'Contact Info',
      accessorKey: 'email',
      sortable: true,
      cell: (student) => (
        <div className="space-y-0.5 text-xs">
          {student.email && (
            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
              <Mail className="w-3 h-3 text-slate-400" />
              <span>{student.email}</span>
            </div>
          )}
          {student.phone && (
            <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
              <Phone className="w-3 h-3 text-slate-400" />
              <span>{student.phone}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      header: 'Status',
      accessorKey: 'isBlocked',
      sortable: true,
      cell: (student) => (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${
            student.isBlocked
              ? 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300'
              : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
          }`}
        >
          {student.isBlocked ? 'Blocked' : 'Active'}
        </span>
      ),
    },
    {
      header: 'Actions',
      cell: (student) => (
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedStudent(student);
              setIsEnrollModalOpen(true);
            }}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg border border-brand-200 dark:border-brand-800 text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-950/40 font-semibold"
          >
            <BookOpen className="w-3 h-3" />
            <span>Enroll</span>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleToggleBlock(student);
            }}
            className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg border font-semibold ${
              student.isBlocked
                ? 'border-emerald-200 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400'
                : 'border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400'
            }`}
          >
            {student.isBlocked ? (
              <>
                <UserCheck className="w-3 h-3" />
                <span>Unblock</span>
              </>
            ) : (
              <>
                <UserX className="w-3 h-3" />
                <span>Block</span>
              </>
            )}
          </button>
        </div>
      ),
    },
  ];

  // Review Columns for DataTable
  const reviewColumns: Column<AdminReview>[] = [
    {
      header: 'Course & Student',
      accessorKey: 'courseTitle',
      sortable: true,
      cell: (rev) => (
        <div>
          <div className="font-semibold text-light-text dark:text-dark-text text-xs">
            {rev.courseTitle || rev.courseId}
          </div>
          <div className="text-[11px] text-slate-400">
            By {rev.userName || 'Student'}
          </div>
        </div>
      ),
    },
    {
      header: 'Rating',
      accessorKey: 'rating',
      sortable: true,
      cell: (rev) => (
        <div className="flex items-center gap-1">
          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
          <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
            {rev.rating}/5
          </span>
        </div>
      ),
    },
    {
      header: 'Comment',
      accessorKey: 'comment',
      cell: (rev) => (
        <p className="text-xs text-slate-600 dark:text-slate-300 max-w-md line-clamp-2">
          {rev.comment}
        </p>
      ),
    },
    {
      header: 'Visibility',
      accessorKey: 'isHidden',
      sortable: true,
      cell: (rev) => (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${
            rev.isHidden
              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
              : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
          }`}
        >
          {rev.isHidden ? 'Hidden' : 'Public'}
        </span>
      ),
    },
    {
      header: 'Actions',
      cell: (rev) => (
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => handleToggleReviewVisibility(rev)}
            className="p-1.5 rounded-lg border border-light-border dark:border-dark-border hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
            title={rev.isHidden ? 'Unhide review' : 'Hide review'}
          >
            {rev.isHidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => handleDeleteReview(rev.id)}
            className="p-1.5 rounded-lg border border-red-200 dark:border-red-800/40 hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600"
            title="Delete review"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
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
            Student Management & Moderation
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage student access, manual course enrollments, and moderate course ratings.
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-dark-card p-1 rounded-btn self-start md:self-auto">
          <button
            onClick={() => setActiveTab('students')}
            className={`px-4 py-2 rounded-btn text-xs font-bold transition-all ${
              activeTab === 'students'
                ? 'bg-white dark:bg-dark-surface text-brand-600 dark:text-brand-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Registered Students ({students.length})
          </button>
          <button
            onClick={() => setActiveTab('reviews')}
            className={`px-4 py-2 rounded-btn text-xs font-bold transition-all ${
              activeTab === 'reviews'
                ? 'bg-white dark:bg-dark-surface text-brand-600 dark:text-brand-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Course Reviews ({reviews.length})
          </button>
        </div>
      </div>

      {/* STUDENTS TAB */}
      {activeTab === 'students' && (
        <DataTable
          data={students}
          columns={studentColumns}
          loading={loadingStudents}
          searchPlaceholder="Search students by name, email, phone or UID..."
          exportFileName="students-export.csv"
          emptyMessage="No registered students found."
        />
      )}

      {/* REVIEWS TAB */}
      {activeTab === 'reviews' && (
        <DataTable
          data={reviews}
          columns={reviewColumns}
          loading={loadingReviews}
          searchPlaceholder="Search reviews by course title or student..."
          exportFileName="reviews-moderation.csv"
          emptyMessage="No course reviews found."
        />
      )}

      {/* MANUAL ENROLLMENT MODAL */}
      {isEnrollModalOpen && selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-dark-surface rounded-2xl max-w-md w-full p-6 shadow-2xl border border-light-border dark:border-dark-border">
            <h3 className="font-bold font-display text-lg text-light-text dark:text-dark-text mb-2">
              Grant Manual Course Access
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Enrolling{' '}
              <strong className="text-brand-600">
                {selectedStudent.name || selectedStudent.email || selectedStudent.uid}
              </strong>
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">
                  Select Masterclass
                </label>
                <select
                  value={selectedCourseId}
                  onChange={(e) => setSelectedCourseId(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-light-border dark:border-dark-border bg-slate-50 dark:bg-dark-card font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-light-border dark:border-dark-border">
                <button
                  type="button"
                  onClick={() => setIsEnrollModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleManualEnroll}
                  disabled={enrolling}
                  className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-2 shadow-sm"
                >
                  {enrolling && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Grant Access</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Students;
