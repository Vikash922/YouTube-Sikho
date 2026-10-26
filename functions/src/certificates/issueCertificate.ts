import * as admin from 'firebase-admin';
import { HttpsError } from 'firebase-functions/v2/https';

export interface IssueCertificateRequest {
  courseId: string;
}

export interface CertificateData {
  id: string;
  uid: string;
  studentName: string;
  courseId: string;
  courseTitle: string;
  issuedAt: string;
  clientName: string;
  verifyUrl: string;
}

export interface IssueCertificateResponse {
  success: boolean;
  certificateId: string;
  certificate: CertificateData;
}

export async function issueCertificateHandler(
  data: IssueCertificateRequest,
  callerUid: string | null,
  db: admin.firestore.Firestore = admin.firestore()
): Promise<IssueCertificateResponse> {
  if (!callerUid) {
    throw new HttpsError('unauthenticated', 'Authentication required to issue certificates.');
  }

  const { courseId } = data || {};
  if (!courseId) {
    throw new HttpsError('invalid-argument', 'courseId is required.');
  }

  // 1. Verify Active Enrollment
  const enrollmentSnap = await db.collection('enrollments').doc(`${callerUid}_${courseId}`).get();
  const isEnrolled = enrollmentSnap.exists && (enrollmentSnap.data()?.status === 'active' || enrollmentSnap.data()?.active === true);

  if (!isEnrolled) {
    const adminSnap = await db.collection('admins').doc(callerUid).get();
    if (!adminSnap.exists) {
      throw new HttpsError('permission-denied', 'Active course enrollment required to claim certificate.');
    }
  }

  // 2. Server-Authoritative 100% Progress Verification
  const progressSnap = await db.collection('progress').doc(`${callerUid}_${courseId}`).get();
  if (!progressSnap.exists) {
    throw new HttpsError('failed-precondition', 'No learning progress recorded for this course.');
  }

  const progressData = progressSnap.data()!;
  const percentComplete = Number(progressData.percentComplete || progressData.percentage || 0);

  if (percentComplete < 100 && !progressData.isCompleted) {
    throw new HttpsError(
      'failed-precondition',
      `Course is only ${percentComplete}% complete. All lessons and quizzes must be completed to unlock the verified certificate.`
    );
  }

  // 3. Idempotency Check: Return existing certificate if already issued
  const existingCertSnap = await db
    .collection('certificates')
    .where('uid', '==', callerUid)
    .where('courseId', '==', courseId)
    .limit(1)
    .get();

  if (!existingCertSnap.empty) {
    const existingDoc = existingCertSnap.docs[0];
    const cData = existingDoc.data();
    return {
      success: true,
      certificateId: existingDoc.id,
      certificate: {
        id: existingDoc.id,
        uid: callerUid,
        studentName: cData.studentName || 'Student',
        courseId,
        courseTitle: cData.courseTitle || 'Master Course',
        issuedAt: cData.issuedAt || new Date().toISOString(),
        clientName: cData.clientName || 'Academy',
        verifyUrl: cData.verifyUrl || `https://sikho-77341.web.app/verify?id=${existingDoc.id}`,
      },
    };
  }

  // 4. Gather Metadata for Certificate
  const [userSnap, courseSnap, configSnap] = await Promise.all([
    db.collection('users').doc(callerUid).get(),
    db.collection('courses').doc(courseId).get(),
    db.collection('appConfig').doc('main').get(),
  ]);

  const userData = userSnap.data() || {};
  const courseData = courseSnap.data() || {};
  const configData = configSnap.data() || {};

  const studentName = userData.name || userData.displayName || (userData.phone ? `Learner (${userData.phone.slice(-4)})` : 'Course Graduate');
  const courseTitle = courseData.title || 'Course Certificate';
  const clientName = configData.appName || 'YouTube Sikho';

  // Stable unique certificate ID format: CERT-XXXX-XXXX
  const timestampPart = Date.now().toString(36).toUpperCase();
  const randomPart = Math.random().toString(36).slice(2, 6).toUpperCase();
  const certId = `CERT-${timestampPart}-${randomPart}`;

  // Verification URL hosted on admin or firebase web app
  const verifyUrl = `https://sikho-77341.web.app/verify?id=${certId}`;
  const nowIso = new Date().toISOString();

  const certPayload = {
    id: certId,
    certId,
    uid: callerUid,
    studentName,
    studentEmail: userData.email || '',
    studentPhone: userData.phone || '',
    courseId,
    courseTitle,
    issuedAt: nowIso,
    issuedTimestamp: admin.firestore.FieldValue.serverTimestamp(),
    clientName,
    verifyUrl,
    isValid: true,
  };

  const batch = db.batch();
  batch.set(db.collection('certificates').doc(certId), certPayload);
  batch.update(db.collection('progress').doc(`${callerUid}_${courseId}`), {
    certificateId: certId,
    certificateIssuedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  await batch.commit();

  return {
    success: true,
    certificateId: certId,
    certificate: {
      id: certId,
      uid: callerUid,
      studentName,
      courseId,
      courseTitle,
      issuedAt: nowIso,
      clientName,
      verifyUrl,
    },
  };
}
