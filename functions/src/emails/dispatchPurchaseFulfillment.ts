import * as admin from 'firebase-admin';
import { renderPurchaseEmailHtml } from './purchaseEmailTemplate';

export interface PurchaseFulfillmentParams {
  uid: string;
  courseId: string;
  orderId: string;
  paymentId: string;
  amountPaise: number;
  email?: string;
}

/**
 * Dispatches post-payment fulfillment:
 * 1. Creates an in-app confirmation notification in userNotifications/{uid}/items
 * 2. Queues a transactional email receipt in the standard 'mail' collection
 */
export async function dispatchPurchaseFulfillment(
  db: admin.firestore.Firestore,
  params: PurchaseFulfillmentParams
): Promise<void> {
  const { uid, courseId, orderId, paymentId, amountPaise, email } = params;

  try {
    const [courseSnap, userSnap] = await Promise.all([
      db.doc(`courses/${courseId}`).get(),
      db.doc(`users/${uid}`).get(),
    ]);

    const courseData = courseSnap.data() || {};
    const userData = userSnap.data() || {};
    const studentEmail = email || userData.email;
    const studentName = userData.name || userData.displayName || 'Student';
    const courseTitle = courseData.title || 'Course';
    const amountRupees = Math.round(amountPaise / 100);

    // 1. In-App Notification (Delivered real-time to student's bell icon)
    await db.collection(`userNotifications/${uid}/items`).add({
      title: '🎉 Course Unlocked!',
      body: `Your payment of ₹${amountRupees} for "${courseTitle}" was successful. Start learning now!`,
      actionType: 'course',
      actionData: courseId,
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // 2. Transactional Email Receipt (Compatible with Firebase Trigger Email extension)
    if (studentEmail) {
      const emailHtml = renderPurchaseEmailHtml({
        studentName,
        studentEmail,
        courseTitle,
        amountRupees,
        orderId,
        paymentId,
        dateStr: new Date().toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }),
      });

      await db.collection('mail').add({
        to: studentEmail,
        message: {
          subject: `Receipt for your purchase: ${courseTitle}`,
          html: emailHtml,
        },
        metadata: {
          type: 'course_purchase_receipt',
          orderId,
          courseId,
          uid,
        },
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log(`[Fulfillment] Queued transactional email to ${studentEmail} for order ${orderId}`);
    }
  } catch (err: any) {
    console.warn(`[Fulfillment] Post-payment fulfillment notice:`, err.message);
  }
}
