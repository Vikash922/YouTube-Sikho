import * as admin from 'firebase-admin';

export interface ManageEnrollmentRequest {
  action: 'enroll' | 'revoke';
  targetUid: string;
  courseId: string;
  reason?: string;
}

export interface ManageEnrollmentResponse {
  success: boolean;
  action: 'enroll' | 'revoke';
  enrollmentId: string;
}

export async function manageEnrollmentHandler(
  data: ManageEnrollmentRequest,
  uid: string | null,
  db: admin.firestore.Firestore = admin.firestore()
): Promise<ManageEnrollmentResponse> {
  if (!uid) {
    throw new Error('Authentication required.');
  }

  // Admin Check
  const adminDoc = await db.doc(`admins/${uid}`).get();
  if (!adminDoc.exists) {
    throw new Error('Permission denied: Only platform administrators can manually manage student enrollments.');
  }

  const { action, targetUid, courseId, reason } = data;
  if (!targetUid || !courseId || !action) {
    throw new Error('Missing required arguments: action, targetUid, courseId.');
  }

  const enrollmentId = `${targetUid}_${courseId}`;
  const enrollmentRef = db.doc(`enrollments/${enrollmentId}`);

  if (action === 'enroll') {
    await enrollmentRef.set({
      uid: targetUid,
      courseId,
      orderId: `manual_${Date.now()}`,
      enrolledAt: admin.firestore.FieldValue.serverTimestamp(),
      active: true,
      manualEnrollment: true,
      enrolledBy: uid,
      reason: reason || 'Manual Admin Enrollment',
    }, { merge: true });
  } else if (action === 'revoke') {
    await enrollmentRef.delete();
  } else {
    throw new Error(`Invalid action: '${action}'. Expected 'enroll' or 'revoke'.`);
  }

  return {
    success: true,
    action,
    enrollmentId,
  };
}
