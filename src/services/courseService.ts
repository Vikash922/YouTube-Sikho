import {
  firebaseFirestore,
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
} from './firebase';

export interface Lesson {
  id: string;
  title: string;
  type: 'video' | 'pdf' | 'quiz';
  videoId?: string;
  pdfUrl?: string;
  duration?: number; // in seconds
  isFreePreview?: boolean;
  order: number;
}

export interface Section {
  id: string;
  title: string;
  order: number;
  lessons: Lesson[];
}

export interface Course {
  id: string;
  title: string;
  description: string;
  category: string;
  price: number;
  discountPrice?: number;
  instructor: string;
  thumbnail?: string;
  language?: string;
  duration?: string;
  rating?: number;
  totalStudents?: number;
  isPublished: boolean;
  isFeatured?: boolean;
  isNew?: boolean;
  sections?: Section[];
}

export interface Enrollment {
  id: string;
  uid: string;
  courseId: string;
  courseTitle?: string;
  orderId?: string;
  amount?: number;
  status: 'active' | 'revoked' | 'refunded';
  createdAt: any;
}

// Clean empty catalog for fresh deployment
export const FALLBACK_COURSES: Record<string, Course> = {};

/**
 * Real-time listener for published courses from Firestore
 */
export function subscribeToPublishedCourses(
  onUpdate: (courses: Course[]) => void,
  onError?: (err: Error) => void
): () => void {
  const colRef = collection(firebaseFirestore, 'courses');

  return onSnapshot(
    colRef,
    (snapshot) => {
      const list = snapshot.docs
        .map((d) => {
          const data = d.data();
          return {
            id: d.id,
            ...data,
            thumbnail: data.thumbnail || data.thumbnailUrl || '',
          } as Course;
        })
        .filter((c) => c.isPublished !== false);
      onUpdate(list);
    },
    (err) => {
      console.warn('[courseService] subscribeToPublishedCourses error:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Fetch a course by ID from Firestore, falling back to predefined catalog
 */
export async function getCourseById(courseId: string): Promise<Course | null> {
  try {
    const courseRef = doc(firebaseFirestore, 'courses', courseId);
    const snap = await getDoc(courseRef);
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() } as Course;
    }
  } catch (err) {
    console.warn('[courseService] Firestore getCourseById failed, using fallback:', err);
  }

  return FALLBACK_COURSES[courseId] || null;
}

/**
 * Check if a student is actively enrolled in a course
 */
export async function checkCourseEnrollment(
  uid: string | null | undefined,
  courseId: string
): Promise<boolean> {
  if (!uid) return false;
  try {
    const enrollId = `${uid}_${courseId}`;
    const snap = await getDoc(doc(firebaseFirestore, 'enrollments', enrollId));
    if (snap.exists()) {
      const data = snap.data();
      return data.status === 'active';
    }
  } catch (err) {
    console.warn('[courseService] Check enrollment error:', err);
  }
  return false;
}

/**
 * Real-time listener for student enrollment status
 */
export function subscribeToEnrollment(
  uid: string | null | undefined,
  courseId: string,
  onUpdate: (isEnrolled: boolean) => void
): () => void {
  if (!uid) {
    onUpdate(false);
    return () => {};
  }
  const enrollId = `${uid}_${courseId}`;
  return onSnapshot(
    doc(firebaseFirestore, 'enrollments', enrollId),
    (snap) => {
      if (snap.exists() && (snap.data()?.status === 'active' || snap.data()?.active === true)) {
        onUpdate(true);
      } else {
        onUpdate(false);
      }
    },
    (error) => {
      console.warn('[courseService] subscribeToEnrollment error:', error);
      onUpdate(false);
    }
  );
}

/**
 * Real-time listener for all active enrollments of a student
 */
export function subscribeToUserEnrollments(
  uid: string | null | undefined,
  onUpdate: (enrollments: Enrollment[]) => void,
  onError?: (err: Error) => void
): () => void {
  if (!uid) {
    onUpdate([]);
    return () => {};
  }
  const q = query(
    collection(firebaseFirestore, 'enrollments'),
    where('uid', '==', uid)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const list = snapshot.docs
        .map((d) => ({ id: d.id, ...d.data() } as Enrollment))
        .filter((e) => e.status === 'active' || (e as any).active === true);
      onUpdate(list);
    },
    (err) => {
      console.warn('[courseService] subscribeToUserEnrollments error:', err);
      if (onError) onError(err);
    }
  );
}
