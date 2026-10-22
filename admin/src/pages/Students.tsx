import React, { useState, useEffect } from 'react';
import {
  collection,
  onSnapshot,
  query,
  doc,
  updateDoc,
  setDoc,
  getDocs,
} from 'firebase/firestore';
import {
  Users,
  Search,
  BookOpen,
  UserCheck,
  UserX,
  Mail,
  Phone,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { db } from '../firebase';
import { Course } from '../types';
import { Button } from '../components/common/Button';
import { useToast } from '../context/ToastContext';

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

export const Students: React.FC = () => {
  const { showToast } = useToast();
  const [students, setStudents] = useState<AdminStudent[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

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
        setLoading(false);
      },
      (err) => {
        console.warn('Students listener error:', err.message);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  // 2. Fetch courses for manual enroll dropdown
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

  // Block / Unblock student toggle
  const handleToggleBlock = async (student: AdminStudent) => {
    const nextBlocked = !student.isBlocked;
    const confirmMsg = nextBlocked
      ? `Block student "${student.name || student.email || student.uid}"? They will be signed out immediately.`
      : `Unblock student "${student.name || student.email || student.uid}"?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      await updateDoc(doc(db, 'users', student.uid), {
        isBlocked: nextBlocked,
        blockReason: nextBlocked ? 'Violated terms of service' : '',
        blockedAt: nextBlocked ? new Date().toISOString() : null,
      });
      showToast(
        nextBlocked ? 'Student blocked and signed out live!' : 'Student unblocked!',
        nextBlocked ? 'info' : 'success'
      );
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
        `Successfully enrolled ${selectedStudent.name || 'student'} into "${selectedCourse?.title}"!`,
        'success'
      );
      setIsEnrollModalOpen(false);
    } catch (err: any) {
      showToast(err.message || 'Could not enroll student', 'error');
    } finally {
      setEnrolling(false);
    }
  };

  const filteredStudents = students.filter((s) => {
    const q = searchQuery.toLowerCase();
    return (
      (s.name && s.name.toLowerCase().includes(q)) ||
      (s.email && s.email.toLowerCase().includes(q)) ||
      (s.phone && s.phone.includes(q)) ||
      s.uid.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold font-display text-light-text dark:text-dark-text tracking-tight">
          Student Account Administration
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Monitor registered students, grant manual course access, and block accounts with live instant session termination.
        </p>
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by student name, email, or phone..."
          className="w-full pl-10 pr-4 py-2.5 rounded-btn bg-white dark:bg-dark-surface border border-light-border dark:border-dark-border text-sm text-light-text dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-sm"
        />
      </div>

      {/* Students Table */}
      <div className="bg-white dark:bg-dark-surface rounded-card border border-light-border dark:border-dark-border shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-16 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <h3 className="font-bold text-light-text dark:text-dark-text">No students registered yet</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              When students sign up on the mobile app, their accounts will appear here in real time.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-light-border dark:divide-dark-border">
            {filteredStudents.map((student) => (
              <div
                key={student.uid}
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors"
              >
                <div className="flex items-start sm:items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-brand-100 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center font-bold text-sm flex-shrink-0">
                    {student.name ? student.name[0].toUpperCase() : 'S'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm text-light-text dark:text-dark-text">
                        {student.name || 'Anonymous Student'}
                      </h3>
                      {student.isBlocked ? (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400">
                          BLOCKED
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                      {student.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3" /> {student.email}
                        </span>
                      )}
                      {student.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" /> {student.phone}
                        </span>
                      )}
                      <span className="font-mono text-[11px] text-slate-400">
                        UID: {student.uid.slice(0, 10)}...
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedStudent(student);
                      setIsEnrollModalOpen(true);
                    }}
                    icon={<BookOpen className="w-3.5 h-3.5" />}
                  >
                    Grant Access
                  </Button>

                  <Button
                    size="sm"
                    variant={student.isBlocked ? 'secondary' : 'danger'}
                    onClick={() => handleToggleBlock(student)}
                    icon={student.isBlocked ? <UserCheck className="w-3.5 h-3.5" /> : <UserX className="w-3.5 h-3.5" />}
                  >
                    {student.isBlocked ? 'Unblock' : 'Block'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Manual Enroll Modal */}
      {isEnrollModalOpen && selectedStudent && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-dark-surface rounded-card border border-light-border dark:border-dark-border w-full max-w-md p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold font-display text-light-text dark:text-dark-text">
              Manual Course Enrollment
            </h3>
            <p className="text-sm text-slate-500">
              Grant free course access to student <strong className="text-light-text dark:text-dark-text">{selectedStudent.name || selectedStudent.email || selectedStudent.uid}</strong>.
            </p>

            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase">
                Select Course
              </label>
              <select
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-btn bg-slate-50 dark:bg-dark-bg border border-light-border dark:border-dark-border text-sm text-light-text dark:text-dark-text focus:outline-none"
              >
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title} (₹{c.price})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-3 pt-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsEnrollModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                loading={enrolling}
                onClick={handleManualEnroll}
                icon={<CheckCircle2 className="w-4 h-4" />}
              >
                Enroll Student
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};