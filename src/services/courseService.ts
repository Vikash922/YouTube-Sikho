import {
  firebaseFirestore,
  firebaseAuth,
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
  orderBy,
} from './firebase';

export interface Lesson {
  id: string;
  title: string;
  type: 'video' | 'pdf' | 'quiz';
  order: number;
  durationSeconds?: number;
  duration?: number | string;
  isFreePreview?: boolean;
  hasMedia?: boolean;
  provider?: 'youtube' | string;
  pdfUrl?: string;
}

export interface LessonPrivateMedia {
  provider: 'youtube' | string;
  videoId: string;
  privacyStatus?: 'unlisted' | 'public' | 'private';
  embeddable?: boolean;
  title?: string;
  durationSeconds?: number;
  checkedAt?: string | number;
  updatedAt?: string | number;
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
  thumbnailUrl?: string;
  language?: string;
  duration?: string;
  totalDurationSeconds?: number;
  totalLessons?: number;
  lessonsCount?: number;
  rating?: number;
  totalStudents?: number;
  isPublished: boolean;
  isFeatured?: boolean;
  isNew?: boolean;
  order?: number;
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
 * Real-time listener for published courses from Firestore.
 * Conforms strictly to Firestore security rules (filters by isPublished == true).
 */
export function subscribeToPublishedCourses(
  onUpdate: (courses: Course[]) => void,
  onError?: (err: Error) => void
): () => void {
  const colRef = collection(firebaseFirestore, 'courses');
  const q = query(colRef, where('isPublished', '==', true));

  return onSnapshot(
    q,
    (snapshot) => {
      const list = snapshot.docs
        .map((d) => {
          const data = d.data();
          return ({
            id: d.id,
            ...data,
            thumbnail: data.thumbnail || data.thumbnailUrl || data.image || '',
            thumbnailUrl: data.thumbnailUrl || data.thumbnail || data.image || '',
          } as unknown as Course);
        })
        .sort((a, b) => (a.order || 0) - (b.order || 0));
      onUpdate(list);
    },
    (err) => {
      console.warn('[courseService] subscribeToPublishedCourses error:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Fetch course curriculum from secure subcollections:
 * courses/{courseId}/sections/{sectionId} -> lessons/{lessonId}
 * Falls back to legacy course.sections array if subcollections are not populated.
 */
export async function getCourseCurriculum(courseId: string): Promise<Section[]> {
  try {
    const secColRef = collection(firebaseFirestore, 'courses', courseId, 'sections');
    const secSnap = await getDocs(query(secColRef, orderBy('order', 'asc')));

    if (!secSnap.empty) {
      const sections: Section[] = [];
      for (const sDoc of secSnap.docs) {
        const sData = sDoc.data();
        const lesColRef = collection(firebaseFirestore, 'courses', courseId, 'sections', sDoc.id, 'lessons');
        const lesSnap = await getDocs(query(lesColRef, orderBy('order', 'asc')));
        const lessons: Lesson[] = lesSnap.docs.map((lDoc) => {
          const lData = lDoc.data();
          return {
            id: lDoc.id,
            title: lData.title || '',
            type: lData.type || 'video',
            duration: lData.duration,
            isFreePreview: !!lData.isFreePreview,
            order: lData.order || 1,
          };
        });

        sections.push({
          id: sDoc.id,
          title: sData.title || '',
          order: sData.order || 1,
          lessons,
        });
      }
      return sections;
    }
  } catch (err) {
    console.warn('[courseService] getCourseCurriculum subcollections fetch error:', err);
  }

  // Backward compatibility fallback to legacy course.sections
  const course = await getCourseById(courseId);
  return course?.sections || [];
}

/**
 * Real-time listener for course curriculum subcollections
 */
export function subscribeToCourseCurriculum(
  courseId: string,
  onUpdate: (sections: Section[]) => void,
  onError?: (err: Error) => void
): () => void {
  const secColRef = collection(firebaseFirestore, 'courses', courseId, 'sections');
  const secQuery = query(secColRef, orderBy('order', 'asc'));

  return onSnapshot(
    secQuery,
    async (snapshot) => {
      if (snapshot.empty) {
        // Fallback: check if parent course doc has legacy sections
        const course = await getCourseById(courseId);
        onUpdate(course?.sections || []);
        return;
      }

      try {
        const sections: Section[] = [];
        for (const sDoc of snapshot.docs) {
          const sData = sDoc.data();
          const lesColRef = collection(firebaseFirestore, 'courses', courseId, 'sections', sDoc.id, 'lessons');
          const lesSnap = await getDocs(query(lesColRef, orderBy('order', 'asc')));
          const lessons: Lesson[] = lesSnap.docs.map((lDoc) => {
            const lData = lDoc.data();
            return {
              id: lDoc.id,
              title: lData.title || '',
              type: lData.type || 'video',
              duration: lData.duration,
              isFreePreview: !!lData.isFreePreview,
              order: lData.order || 1,
            };
          });

          sections.push({
            id: sDoc.id,
            title: sData.title || '',
            order: sData.order || 1,
            lessons,
          });
        }
        onUpdate(sections);
      } catch (err: any) {
        if (onError) onError(err);
      }
    },
    (err) => {
      console.warn('[courseService] subscribeToCourseCurriculum error:', err);
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
  if (!uid || !courseId) return false;
  try {
    const enrollId = `${uid}_${courseId}`;
    const snap = await getDoc(doc(firebaseFirestore, 'enrollments', enrollId));
    if (snap.exists()) {
      const data = snap.data();
      return data.status === 'active';
    }
  } catch (err) {
    // Quietly return false if not enrolled or permission denied
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
