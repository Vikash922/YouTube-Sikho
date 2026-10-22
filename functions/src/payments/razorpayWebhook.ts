import * as crypto from 'crypto';
import * as admin from 'firebase-admin';
import { getSecrets } from '../config';

export function computeWebhookSignature(rawBody: string, webhookSecret: string): string {
  return crypto
    .createHmac('sha256', webhookSecret)
    .update(rawBody)
    .digest('hex');
}

export async function razorpayWebhookHandler(
  rawBody: string,
  signatureHeader: string | undefined,
  db: admin.firestore.Firestore = admin.firestore()
): Promise<{ status: string; event: string }> {
  if (!signatureHeader) {
    throw new Error('Missing X-Razorpay-Signature header.');
  }

  const secrets = getSecrets();
  const expectedSignature = computeWebhookSignature(rawBody, secrets.RAZORPAY_WEBHOOK_SECRET);

  if (expectedSignature !== signatureHeader) {
    throw new Error('Unauthorized: Invalid Razorpay webhook signature.');
  }

  const payload = JSON.parse(rawBody);
  const eventName = payload.event;

  if (eventName === 'payment.captured') {
    const payment = payload.payload?.payment?.entity;
    if (!payment) return { status: 'ignored', event: eventName };

    const orderId = payment.order_id;
    const paymentId = payment.id;
    const notes = payment.notes || {};
    const uid = notes.uid;
    const courseId = notes.courseId;

    if (!orderId || !uid || !courseId) {
      console.warn(`Webhook payment.captured event missing essential order/student notes: orderId=${orderId}, uid=${uid}, courseId=${courseId}`);
      return { status: 'missing_metadata', event: eventName };
    }

    const orderRef = db.doc(`orders/${orderId}`);
    const enrollmentId = `${uid}_${courseId}`;
    const enrollmentRef = db.doc(`enrollments/${enrollmentId}`);

    // Idempotent Transaction Execution
    await db.runTransaction(async (transaction) => {
      const orderDoc = await transaction.get(orderRef);
      const enrollmentDoc = await transaction.get(enrollmentRef);

      // If already enrolled, no duplicate write needed
      if (enrollmentDoc.exists && orderDoc.data()?.status === 'paid') {
        return;
      }

      if (orderDoc.exists) {
        transaction.update(orderRef, {
          status: 'paid',
          razorpayPaymentId: paymentId,
          paidAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      transaction.set(enrollmentRef, {
        uid,
        courseId,
        orderId,
        paymentId,
        enrolledAt: admin.firestore.FieldValue.serverTimestamp(),
        active: true,
        source: 'razorpay_webhook',
      }, { merge: true });
    });
  } else if (eventName === 'payment.failed') {
    const payment = payload.payload?.payment?.entity;
    if (payment?.order_id) {
      await db.doc(`orders/${payment.order_id}`).set({
        status: 'failed',
        failureCode: payment.error_code || 'PAYMENT_FAILED',
        failureReason: payment.error_description || 'Payment rejected by bank',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
    }
  } else if (eventName === 'refund.processed') {
    const refund = payload.payload?.refund?.entity;
    if (refund?.payment_id) {
      const ordersSnap = await db
        .collection('orders')
        .where('razorpayPaymentId', '==', refund.payment_id)
        .limit(1)
        .get();

      if (!ordersSnap.empty) {
        const orderDoc = ordersSnap.docs[0];
        const { uid, courseId } = orderDoc.data();

        await orderDoc.ref.update({
          status: 'refunded',
          refundId: refund.id,
          refundedAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        if (uid && courseId) {
          await db.doc(`enrollments/${uid}_${courseId}`).delete();
        }
      }
    }
  }

  return { status: 'ok', event: eventName };
}
