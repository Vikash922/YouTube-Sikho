import * as admin from 'firebase-admin';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { sendNotificationInternal } from './sendNotification';
import { REGION } from '../lib';

/**
 * Trigger: When a course is published, notify all students
 */
export const onCoursePublished = onDocumentWritten(
  {
    document: 'courses/{courseId}',
    region: REGION,
  },
  async (event) => {
    const beforeData = event.data?.before?.data();
    const afterData = event.data?.after?.data();

    // Only fire if the document was newly created as published or changed from unpublished to published
    if (!afterData) return; // Deleted

    const wasPublished = beforeData?.isPublished === true;
    const isNowPublished = afterData.isPublished === true;

    if (!wasPublished && isNowPublished) {
      const courseTitle = afterData.title || 'New Course';
      const courseId = event.params.courseId;

      console.log(`[Notification Trigger] Course '${courseTitle}' (${courseId}) published. Broadcasting.`);

      await sendNotificationInternal({
        title: 'New Course Available! 🎓',
        body: `Enroll now in "${courseTitle}" and start learning!`,
        actionType: 'course',
        actionValue: courseId,
        targetType: 'all',
        senderUid: 'system_course_trigger',
      });
    }
  }
);

/**
 * Scheduled Cron: Check for live classes starting soon (every 5 minutes)
 */
export const onLiveClassReminder = onSchedule(
  {
    schedule: 'every 5 minutes',
    region: REGION,
    timeZone: 'Asia/Kolkata',
  },
  async () => {
    const db = admin.firestore();
    const now = Date.now();
    const fifteenMinutesLater = now + 15 * 60 * 1000;

    // Find scheduled classes
    const snap = await db
      .collection('liveClasses')
      .where('status', '==', 'scheduled')
      .get();

    for (const doc of snap.docs) {
      const data = doc.data();
      if (data.notifiedAt) continue;

      const scheduledAtMs = data.scheduledAt
        ? new Date(data.scheduledAt).getTime()
        : data.scheduledDate
        ? new Date(data.scheduledDate).getTime()
        : 0;

      // If class is starting within the next 15 minutes and hasn't started yet
      if (scheduledAtMs > now - 5 * 60 * 1000 && scheduledAtMs <= fifteenMinutesLater) {
        console.log(`[Notification Schedule] Live class '${data.title}' starting soon. Sending reminder.`);

        await sendNotificationInternal({
          title: 'Live Class Starting Soon! 🔴',
          body: `"${data.title || 'Live Session'}" is scheduled to start shortly. Join now!`,
          actionType: 'live',
          actionValue: doc.id,
          targetType: data.courseId ? 'course' : 'all',
          targetId: data.courseId || undefined,
          senderUid: 'system_live_scheduler',
        });

        // Mark as notified to prevent duplicate pushes
        await doc.ref.update({
          notifiedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    }
  }
);
