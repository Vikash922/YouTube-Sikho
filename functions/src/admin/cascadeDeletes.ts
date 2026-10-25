import * as admin from 'firebase-admin';
import { HttpsError } from 'firebase-functions/v2/https';

/**
 * Cascade Delete for Courses:
 * - Prevents deletion if active student enrollments exist.
 * - Recursively deletes courses/{courseId} and all subcollections:
 *   sections, lessons, private/media.
 * - Deletes associated materials.
 * - Writes immutable audit log.
 */
export async function deleteCourseHandler(
  data: { courseId: string },
  caller: { uid: string },
  db: admin.firestore.Firestore = admin.firestore()
) {
  const { courseId } = data;
  if (!courseId) {
    throw new HttpsError('invalid-argument', 'Missing required parameter: courseId.');
  }

  const courseRef = db.doc(`courses/${courseId}`);
  const courseSnap = await courseRef.get();
  if (!courseSnap.exists) {
    throw new HttpsError('not-found', `Course ${courseId} does not exist.`);
  }

  // 1. Guard against deleting courses with active student enrollments
  const activeEnrollmentsSnap = await db
    .collection('enrollments')
    .where('courseId', '==', courseId)
    .where('status', '==', 'active')
    .limit(1)
    .get();

  if (!activeEnrollmentsSnap.empty) {
    throw new HttpsError(
      'failed-precondition',
      'Cannot delete course with active student enrollments. Revoke enrollments or unpublish the course instead.'
    );
  }

  const legacyEnrollmentsSnap = await db
    .collection('enrollments')
    .where('courseId', '==', courseId)
    .where('active', '==', true)
    .limit(1)
    .get();

  if (!legacyEnrollmentsSnap.empty) {
    throw new HttpsError(
      'failed-precondition',
      'Cannot delete course with active student enrollments. Revoke enrollments or unpublish the course instead.'
    );
  }

  // 2. Cascade delete all subcollections (sections, lessons, private/media) recursively
  await db.recursiveDelete(courseRef);

  // 3. Clean up associated materials
  const materialsSnap = await db.collection('materials').where('courseId', '==', courseId).get();
  if (!materialsSnap.empty) {
    const batch = db.batch();
    materialsSnap.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  }

  // 4. Record Audit Log
  await db.collection('auditLogs').add({
    action: 'delete_course',
    courseId,
    courseTitle: courseSnap.data()?.title || '',
    deletedBy: caller.uid,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { success: true, courseId };
}

/**
 * Cascade Delete for Quizzes:
 * - Recursively deletes quizzes/{quizId} and its questions subcollection.
 * - Writes immutable audit log.
 */
export async function deleteQuizHandler(
  data: { quizId: string },
  caller: { uid: string },
  db: admin.firestore.Firestore = admin.firestore()
) {
  const { quizId } = data;
  if (!quizId) {
    throw new HttpsError('invalid-argument', 'Missing required parameter: quizId.');
  }

  const quizRef = db.doc(`quizzes/${quizId}`);
  const quizSnap = await quizRef.get();
  if (!quizSnap.exists) {
    throw new HttpsError('not-found', `Quiz ${quizId} does not exist.`);
  }

  // Cascade delete quiz and its questions subcollection recursively
  await db.recursiveDelete(quizRef);

  // Record Audit Log
  await db.collection('auditLogs').add({
    action: 'delete_quiz',
    quizId,
    quizTitle: quizSnap.data()?.title || '',
    deletedBy: caller.uid,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { success: true, quizId };
}

/**
 * Cascade Delete for Live Classes:
 * - Recursively deletes liveClasses/{classId} and its messages, handRaises, viewers subcollections.
 * - Writes immutable audit log.
 */
export async function deleteLiveClassHandler(
  data: { classId: string },
  caller: { uid: string },
  db: admin.firestore.Firestore = admin.firestore()
) {
  const { classId } = data;
  if (!classId) {
    throw new HttpsError('invalid-argument', 'Missing required parameter: classId.');
  }

  const classRef = db.doc(`liveClasses/${classId}`);
  const classSnap = await classRef.get();
  if (!classSnap.exists) {
    throw new HttpsError('not-found', `Live class ${classId} does not exist.`);
  }

  // Cascade delete live class and messages, handRaises subcollections recursively
  await db.recursiveDelete(classRef);

  // Record Audit Log
  await db.collection('auditLogs').add({
    action: 'delete_live_class',
    classId,
    classTitle: classSnap.data()?.title || '',
    deletedBy: caller.uid,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { success: true, classId };
}
