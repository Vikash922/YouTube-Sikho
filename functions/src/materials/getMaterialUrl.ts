import * as admin from 'firebase-admin';
import { HttpsError } from 'firebase-functions/v2/https';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getR2Client, getR2BucketName } from '../config';

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

const DOWNLOAD_TTL_SECONDS = 30 * 60; // 30 minutes valid

function safeName(name: string): string {
  return name.replace(/[^\w.\- ]/g, '_').slice(0, 120);
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
        // Fallback check with userId field
        const querySnap2 = await db
          .collection('enrollments')
          .where('userId', '==', uid)
          .where('courseId', '==', courseId)
          .limit(1)
          .get();
        isEnrolled = !querySnap2.empty && querySnap2.docs[0].data()?.status === 'active';
      }

      if (!isEnrolled) {
        throw new HttpsError(
          'permission-denied',
          'You must be actively enrolled in this course to access this study material.'
        );
      }
    }
  }

  // 3. Locate the Material Document (check root materials/{id} or nested courses/{courseId}/materials/{id})
  let materialDoc = await db.doc(`materials/${materialId}`).get();
  if (!materialDoc.exists) {
    materialDoc = await db.doc(`courses/${courseId}/materials/${materialId}`).get();
  }

  if (!materialDoc.exists) {
    throw new HttpsError('not-found', `Study material ${materialId} not found.`);
  }

  const materialData = materialDoc.data() || {};
  if (materialData.courseId && materialData.courseId !== courseId) {
    throw new HttpsError('permission-denied', 'Material does not belong to the specified course.');
  }

  const fileName = materialData.fileName || materialData.title || 'material.pdf';
  const cleanFileName = safeName(fileName);

  // 4. If material has Cloudflare R2 key (r2Key)
  if (materialData.r2Key && typeof materialData.r2Key === 'string') {
    try {
      const client = getR2Client();
      const bucket = getR2BucketName();
      const isPdf = cleanFileName.toLowerCase().endsWith('.pdf');

      const command = new GetObjectCommand({
        Bucket: bucket,
        Key: materialData.r2Key,
        ResponseContentType: isPdf ? 'application/pdf' : 'application/octet-stream',
        ResponseContentDisposition: `inline; filename="${encodeURIComponent(cleanFileName)}"`,
      });

      const downloadUrl = await getSignedUrl(client, command, {
        expiresIn: DOWNLOAD_TTL_SECONDS,
      });

      return {
        downloadUrl,
        expiresAt: Math.floor(Date.now() / 1000) + DOWNLOAD_TTL_SECONDS,
        title: materialData.title || cleanFileName,
        fileName: cleanFileName,
      };
    } catch (r2Err: any) {
      console.error('Error generating Cloudflare R2 download URL:', r2Err);
      throw new HttpsError('internal', `Failed to generate R2 download URL: ${r2Err.message}`);
    }
  }

  // 5. If already an external HTTPS URL (e.g. external CDN)
  const rawPath = materialData.storagePath || materialData.filePath || materialData.pdfPath || materialData.url;
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

  // 6. Fallback: Firebase Storage (GCS) for backward compatibility
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
