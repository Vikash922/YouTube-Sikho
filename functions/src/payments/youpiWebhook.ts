import * as crypto from 'crypto';
import * as admin from 'firebase-admin';
import { getSecrets } from '../config';

export function computeWebhookSignature(rawBody: string, webhookSecret: string): string {
  return crypto
    .createHmac('sha256', webhookSecret)
    .update(rawBody)
    .digest('hex');
}

export function verifyGatewaySignature(
  rawBody: string,
  signatureHeader: string,
  secret: string
): boolean {
  if (!signatureHeader || !secret) return false;
  const cleanHeader = signatureHeader.startsWith('sha256=')
    ? signatureHeader.slice(7).trim()
    : signatureHeader.trim();

  const expected = computeWebhookSignature(rawBody, secret);
  try {
    const a = Buffer.from(cleanHeader, 'hex');
    const b = Buffer.from(expected, 'hex');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return cleanHeader.toLowerCase() === expected.toLowerCase();
  }
}

export async function youpiWebhookHandler(
  rawBody: string,
  signatureHeader: string | undefined,
  db: admin.firestore.Firestore = admin.firestore()
): Promise<{ status: string; event: string }> {
  if (!signatureHeader) {
    throw new Error('Missing X-Gateway-Signature header.');
  }

  const secrets = getSecrets();
  const isValidYoupi = verifyGatewaySignature(
    rawBody,
    signatureHeader,
    secrets.YOUPI_WEBHOOK_SECRET
  );
  const isValidLegacy = verifyGatewaySignature(
    rawBody,
    signatureHeader,
    secrets.RAZORPAY_WEBHOOK_SECRET
  );

  if (!isValidYoupi && !isValidLegacy) {
    throw new Error('Unauthorized: Invalid Razorpay webhook signature.');
  }

  const payload = JSON.parse(rawBody);
  const eventName = payload.event;

  if (eventName === 'SUCCESS' || eventName === 'payment.captured') {
    const payment = payload.payload?.payment?.entity;
    const orderId = payload.orderId || payment?.order_id;
    const paymentId = payload.paymentId || payment?.id;
    const utr = payload.utr || payload.bankRef || '';
    const metadata = payload.metadata || payment?.notes || {};
    let uid = metadata.uid;
    let courseId = metadata.courseId;

    if (!orderId) {
      return { status: 'missing_order_id', event: eventName };
    }

    const orderRef = db.doc(`orders/${orderId}`);

    // If metadata was missing in webhook, lookup order in Firestore
    if (!uid || !courseId) {
      const existingOrderSnap = await orderRef.get();
      if (existingOrderSnap.exists) {
        const d = existingOrderSnap.data();
        uid = uid || d?.uid;
        courseId = courseId || d?.courseId;
      }
    }

    if (!uid || !courseId) {
      console.warn(`Webhook SUCCESS event missing essential order/student notes: orderId=${orderId}`);
      return { status: 'missing_metadata', event: eventName };
    }

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
          paymentId: paymentId || orderId,
          utr: utr || orderDoc.data()?.utr || '',
          razorpayPaymentId: paymentId || orderId, // backward-compat
          paidAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      transaction.set(enrollmentRef, {
        uid,
        courseId,
        orderId,
        paymentId: paymentId || orderId,
        utr: utr || '',
        enrolledAt: admin.firestore.FieldValue.serverTimestamp(),
        active: true,
        source: 'youpi_webhook',
      }, { merge: true });
    });
  } else if (eventName === 'FAILED' || eventName === 'CANCELLED' || eventName === 'EXPIRED' || eventName === 'payment.failed') {
    const payment = payload.payload?.payment?.entity;
    const orderId = payload.orderId || payment?.order_id;
    if (orderId) {
      await db.doc(`orders/${orderId}`).set({
        status: 'failed',
        failureCode: payload.failureCode || payment?.error_code || 'PAYMENT_FAILED',
        failureReason: payload.message || payment?.error_description || 'Payment rejected or cancelled',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
    }
  } else if (eventName === 'refund.processed') {
    const refund = payload.payload?.refund?.entity;
    if (refund?.payment_id) {
      const ordersSnap = await db
        .collection('orders')
        .where('paymentId', '==', refund.payment_id)
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

// Keep backward-compatible alias
export const razorpayWebhookHandler = youpiWebhookHandler;
