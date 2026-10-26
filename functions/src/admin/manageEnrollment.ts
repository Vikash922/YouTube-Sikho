import * as admin from 'firebase-admin';
import { CallableRequest } from 'firebase-functions/v2/https';
import { requireAdmin, assertString, assertEnum, writeAuditLog } from '../lib';
import { sendNotificationInternal } from '../notifications/sendNotification';

export interface ManageEnrollmentRequest {
  action: 'grant' | 'enroll' | 'revoke';
  targetUid: string;
  courseId: string;
  reason?: string;
}

export interface ManageEnrollmentResponse {
  success: boolean;
  action: 'grant' | 'enroll' | 'revoke';
  enrollmentId: string;
}

export async function manageEnrollmentHandler(
  data: ManageEnrollmentRequest,
  request: CallableRequest<any>,
  db: admin.firestore.Firestore = admin.firestore()
): Promise<ManageEnrollmentResponse> {
  const caller = requireAdmin(request);

  const action = assertEnum(data.action, 'action', ['grant', 'enroll', 'revoke'] as const);
  const targetUid = assertString(data.targetUid, 'targetUid');
  const courseId = assertString(data.courseId, 'courseId');
  const reason = data.reason || 'Administrative action';

  const enrollmentId = `${targetUid}_${courseId}`;
  const enrollmentRef = db.doc(`enrollments/${enrollmentId}`);

  // Fetch course title for notification
  let courseTitle = 'your course';
  try {
    const cDoc = await db.collection('courses').doc(courseId).get();
    if (cDoc.exists) {
      courseTitle = cDoc.data()?.title || courseTitle;
    }
  } catch {}

  if (action === 'grant' || action === 'enroll') {
    await enrollmentRef.set(
      {
        uid: targetUid,
        courseId,
        orderId: `manual_${Date.now()}`,
        status: 'active',
        active: true,
        manualEnrollment: true,
        enrolledBy: caller.uid,
        reason,
        enrolledAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    // Send in-app notification & push to student
    await sendNotificationInternal({
      title: 'Course Access Granted! 🎉',
      body: `You have been granted access to "${courseTitle}". Start learning now!`,
      actionType: 'course',
      actionValue: courseId,
      targetType: 'user',
      targetId: targetUid,
      senderUid: caller.uid,
      db,
    }).catch((e) => console.warn('[manageEnrollment] Notification note:', e.message));

    // Audit Log
    await writeAuditLog(caller.uid, 'enroll_grant', 'enrollment', enrollmentId, {
      targetUid,
      courseId,
      reason,
    });
  } else if (action === 'revoke') {
    await enrollmentRef.set(
      {
        status: 'revoked',
        active: false,
        revokedAt: admin.firestore.FieldValue.serverTimestamp(),
        revokedBy: caller.uid,
        revokeReason: reason,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    // Send notification
    await sendNotificationInternal({
      title: 'Course Access Ended',
      body: `Your enrollment in "${courseTitle}" has been revoked by an administrator.`,
      actionType: 'none',
      targetType: 'user',
      targetId: targetUid,
      senderUid: caller.uid,
      db,
    }).catch((e) => console.warn('[manageEnrollment] Revoke notification note:', e.message));

    // Audit Log
    await writeAuditLog(caller.uid, 'enroll_revoke', 'enrollment', enrollmentId, {
      targetUid,
      courseId,
      reason,
    });
  }

  return {
    success: true,
    action,
    enrollmentId,
  };
}
