import * as admin from 'firebase-admin';
import { HttpsError } from 'firebase-functions/v2/https';

export interface GetLiveStreamRequest {
  classId: string;
}

export interface GetLiveStreamResponse {
  classId: string;
  title: string;
  instructor?: string;
  streamUrl: string;
  status: 'upcoming' | 'live' | 'ended';
  isLive: boolean;
}

export async function getLiveStreamHandler(
  data: GetLiveStreamRequest,
  uid: string | null,
  authContext?: { admin?: boolean },
  db: admin.firestore.Firestore = admin.firestore()
): Promise<GetLiveStreamResponse> {
  const { classId } = data;

  if (!classId) {
    throw new HttpsError('invalid-argument', 'Missing required parameter: classId.');
  }

  if (!uid) {
    throw new HttpsError('unauthenticated', 'You must be signed in to access live stream broadcasts.');
  }

  const classDoc = await db.doc(`liveClasses/${classId}`).get();
  if (!classDoc.exists) {
    throw new HttpsError('not-found', `Live class ${classId} not found.`);
  }

  const classData = classDoc.data() || {};
  const courseId = classData.courseId;

  // 1. Check Admin status
  let isUserAdmin = authContext?.admin === true;
  if (!isUserAdmin) {
    const adminDoc = await db.doc(`admins/${uid}`).get();
    isUserAdmin = adminDoc.exists;
  }

  // 2. If the live class is tied to a course, verify enrollment
  if (!isUserAdmin && courseId) {
    const courseDoc = await db.doc(`courses/${courseId}`).get();
    const coursePrice = courseDoc.exists ? (courseDoc.data()?.price || 0) : 0;

    if (coursePrice > 0) {
      const enrollmentDoc = await db.doc(`enrollments/${uid}_${courseId}`).get();
      let isEnrolled = enrollmentDoc.exists && enrollmentDoc.data()?.status === 'active';

      if (!isEnrolled) {
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
          'You must be enrolled in the course to access this live class stream.'
        );
      }
    }
  }

  const streamUrl = classData.streamUrl || classData.hlsUrl || '';
  if (!streamUrl) {
    throw new HttpsError('not-found', 'Live stream URL is not currently configured for this session.');
  }

  return {
    classId,
    title: classData.title || 'Live Stream',
    instructor: classData.instructor,
    streamUrl,
    status: classData.status || 'live',
    isLive: classData.status === 'live',
  };
}
