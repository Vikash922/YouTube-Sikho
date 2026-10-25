import * as admin from 'firebase-admin';
import { HttpsError } from 'firebase-functions/v2/https';

export interface GetMaterialUrlRequest {
  courseId: string;
  materialId: string;
}

export interface GetMaterialUrlResponse {
  downloadUrl: string;
  expiresAt: number;
  title: string;
  fileName?: string;
}

export async function getMaterialUrlHandler(
  data: GetMaterialUrlRequest,
  uid: string | null,
  authContext?: { admin?: boolean },
  db: admin.firestore.Firestore = admin.firestore()
): Promise<GetMaterialUrlResponse> {
  const { courseId, materialId } = data;

  if (!courseId || !materialId) {
    throw new HttpsError('invalid-argument', 'Missing required arguments: courseId and materialId.');
  }

  if (!uid) {
    throw new HttpsError('unauthenticated', 'You must be signed in to access course materials.');
  }

  // 1. Check Admin status
  let isUserAdmin = authContext?.admin === true;
  if (!isUserAdmin) {
    const adminDoc = await db.doc(`admins/${uid}`).get();
    isUserAdmin = adminDoc.exists;
  }

  // 2. If not admin, verify course enrollment or free access
  if (!isUserAdmin) {
    const courseDoc = await db.doc(`courses/${courseId}`).get();
    if (!courseDoc.exists) {
      throw new HttpsError('not-found', `Course ${courseId} not found.`);
    }

    const courseData = courseDoc.data() || {};
    const isFreeCourse = courseData.price === 0;

    if (!isFreeCourse) {
      const enrollmentDoc = await db.doc(`enrollments/${uid}_${courseId}`).get();
      let isEnrolled = enrollmentDoc.exists && enrollmentDoc.data()?.status === 'active';

      if (!isEnrolled) {
        // Fallback check by query
        const querySnap = await db
          .collection('enrollments')
          .where('uid', '==', uid)
          .where('courseId', '==', courseId)
          .limit(1)
          .get();
        isEnrolled = !querySnap.empty && querySnap.docs[0].data()?.status === 'active';
      }

      if (!isEnrolled) {
        throw new HttpsError(
          'permission-denied',
          'You must be actively enrolled in this course to access this study material.'
        );
      }
    }
  }

  // 3. Locate the Material Document
  const materialDoc = await db.doc(`materials/${materialId}`).get();
  if (!materialDoc.exists) {
    throw new HttpsError('not-found', `Study material ${materialId} not found.`);
  }

  const materialData = materialDoc.data() || {};
  if (materialData.courseId && materialData.courseId !== courseId) {
    throw new HttpsError('permission-denied', 'Material does not belong to the specified course.');
  }

  const rawPath = materialData.storagePath || materialData.filePath || materialData.pdfPath || materialData.url;
  const fileName = materialData.fileName || materialData.title || 'material.pdf';

  // If already an external HTTPS URL (e.g. external CDN), return as-is
  if (
    typeof rawPath === 'string' &&
    (rawPath.startsWith('http://') || rawPath.startsWith('https://')) &&
    !rawPath.includes('firebasestorage.googleapis.com')
  ) {
    return {
      downloadUrl: rawPath,
      expiresAt: Math.floor(Date.now() / 1000) + 3600,
      title: materialData.title || fileName,
      fileName,
    };
  }

  // 4. Generate signed GCS URL for Cloud Storage object
  try {
    let storagePath = rawPath;
    if (!storagePath) {
      storagePath = `materials/${courseId}/${materialId}.pdf`;
    } else if (storagePath.startsWith('gs://')) {
      const parts = storagePath.replace('gs://', '').split('/');
      parts.shift(); // remove bucket
      storagePath = parts.join('/');
    }

    const bucket = admin.storage().bucket();
    const file = bucket.file(storagePath);

    const [exists] = await file.exists();
    if (!exists) {
      if (materialData.url && typeof materialData.url === 'string') {
        return {
          downloadUrl: materialData.url,
          expiresAt: Math.floor(Date.now() / 1000) + 3600,
          title: materialData.title || fileName,
          fileName,
        };
      }
      throw new HttpsError('not-found', `Storage asset for material ${materialId} does not exist in bucket.`);
    }

    const expiresAtMs = Date.now() + 60 * 60 * 1000; // 60 minutes
    const [downloadUrl] = await file.getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: expiresAtMs,
      responseDisposition: `inline; filename="${encodeURIComponent(fileName)}"`,
    });

    return {
      downloadUrl,
      expiresAt: Math.floor(expiresAtMs / 1000),
      title: materialData.title || fileName,
      fileName,
    };
  } catch (err: any) {
    if (err instanceof HttpsError) throw err;
    console.error('Error generating signed material URL:', err);
    throw new HttpsError('internal', err.message || 'Failed to generate secure material download link.');
  }
}
