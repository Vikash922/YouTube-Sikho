import * as crypto from 'crypto';
import * as admin from 'firebase-admin';
import { getSecrets } from '../config';

export interface GetVideoTokenRequest {
  courseId: string;
  lessonId: string;
  sectionId?: string;
}

export interface GetVideoTokenResponse {
  hlsUrl: string;
  expiresAt: number;
  isFreePreview: boolean;
  videoId: string;
}

export function generateBunnyHlsUrl(
  cdnHostname: string,
  videoId: string,
  tokenAuthKey: string,
  expiresInSeconds: number = 3600
): { hlsUrl: string; expiresAt: number } {
  const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const path = `/${videoId}/playlist.m3u8`;
  const hashableBase = `${tokenAuthKey}${path}${expiresAt}`;

  const token = crypto
    .createHash('sha256')
    .update(hashableBase)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  const hlsUrl = `https://${cdnHostname}${path}?token=${token}&expires=${expiresAt}`;
  return { hlsUrl, expiresAt };
}

export async function getVideoTokenHandler(
  data: GetVideoTokenRequest,
  uid: string | null,
  db: admin.firestore.Firestore = admin.firestore()
): Promise<GetVideoTokenResponse> {
  const { courseId, lessonId, sectionId } = data;

  if (!courseId || !lessonId) {
    throw new Error('Missing required arguments: courseId and lessonId.');
  }

  const secrets = getSecrets();

  // 1. Locate the lesson in Firestore
  let lessonDoc: admin.firestore.DocumentSnapshot | null = null;
  let legacyLesson: any = null;

  if (sectionId) {
    lessonDoc = await db.doc(`courses/${courseId}/sections/${sectionId}/lessons/${lessonId}`).get();
  } else {
    // If sectionId is omitted, scan sections subcollections under this course
    const sectionsSnap = await db.collection(`courses/${courseId}/sections`).get();
    for (const sec of sectionsSnap.docs) {
      const candidate = await db.doc(`courses/${courseId}/sections/${sec.id}/lessons/${lessonId}`).get();
      if (candidate.exists) {
        lessonDoc = candidate;
        break;
      }
    }
  }

  // Backward compatibility fallback: check legacy courseDoc.sections array during migration
  if (!lessonDoc || !lessonDoc.exists) {
    const courseDoc = await db.doc(`courses/${courseId}`).get();
    const courseData = courseDoc.data();
    if (courseData?.sections && Array.isArray(courseData.sections)) {
      for (const sec of courseData.sections) {
        const candidate = (sec.lessons || []).find((l: any) => l.id === lessonId);
        if (candidate) {
          legacyLesson = candidate;
          break;
        }
      }
    }
  }

  if ((!lessonDoc || !lessonDoc.exists) && !legacyLesson) {
    throw new Error(`Lesson ${lessonId} not found in course ${courseId}.`);
  }

  const lessonData = lessonDoc && lessonDoc.exists ? (lessonDoc.data() || {}) : legacyLesson;
  const isFreePreview = lessonData.isFreePreview === true;

  // Retrieve private media asset (isolated from public lesson doc)
  let videoId = '';
  if (lessonDoc && lessonDoc.exists) {
    const mediaSnap = await lessonDoc.ref.collection('private').doc('media').get();
    videoId = (mediaSnap.exists ? mediaSnap.data()?.videoId : null) || lessonData.videoId;
  } else if (legacyLesson) {
    videoId = legacyLesson.videoId;
  }

  if (!videoId) {
    throw new Error('Lesson does not have an active videoId configured.');
  }

  // 2. Access Authorization Check
  if (!isFreePreview) {
    if (!uid) {
      throw new Error('Authentication required: Non-preview lessons require an active student session.');
    }

    // Check enrollment
    const enrollmentRef = db.doc(`enrollments/${uid}_${courseId}`);
    const enrollmentSnap = await enrollmentRef.get();

    if (!enrollmentSnap.exists) {
      // Also check query for backward compatibility
      const querySnap = await db
        .collection('enrollments')
        .where('uid', '==', uid)
        .where('courseId', '==', courseId)
        .limit(1)
        .get();

      if (querySnap.empty) {
        throw new Error('Permission denied: You must be enrolled in this course to access this video.');
      }
    }
  }

  // 3. Generate Signed Token HLS Manifest URL
  const { hlsUrl, expiresAt } = generateBunnyHlsUrl(
    secrets.BUNNY_CDN_HOSTNAME,
    videoId,
    secrets.BUNNY_TOKEN_AUTH_KEY,
    3600
  );

  return {
    hlsUrl,
    expiresAt,
    isFreePreview,
    videoId,
  };
}
