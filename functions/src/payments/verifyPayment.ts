import * as crypto from 'crypto';
import * as admin from 'firebase-admin';
import { getSecrets } from '../config';

export interface VerifyPaymentRequest {
  orderId: string;
  paymentId?: string;
  utr?: string;
  signature?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
}

export interface VerifyPaymentResponse {
  success: boolean;
  orderId: string;
  enrollmentId: string;
  alreadyProcessed?: boolean;
  utr?: string;
}

export function computeYoupiSignature(
  orderId: string,
  paymentId: string,
  keySecret: string
): string {
  return crypto
    .createHmac('sha256', keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
}

export const computeRazorpaySignature = computeYoupiSignature;

export async function verifyPaymentHandler(
  data: VerifyPaymentRequest,
  uid: string | null,
  db: admin.firestore.Firestore = admin.firestore()
): Promise<VerifyPaymentResponse> {
  if (!uid) {
    throw new Error('Authentication required to verify payment.');
  }

  const orderId = data.orderId;
  const paymentId = data.paymentId || data.razorpayPaymentId;
  const signature = data.signature || data.razorpaySignature;
  const utr = data.utr || '';

  if (!orderId || !paymentId || !signature) {
    throw new Error('Missing required arguments: orderId, paymentId, and signature.');
  }

  const secrets = getSecrets();

  // 1. Cryptographic Signature Verification
  const expectedSignature = computeYoupiSignature(
    orderId,
    paymentId,
    secrets.YOUPI_WEBHOOK_SECRET || secrets.RAZORPAY_KEY_SECRET
  );
  const legacySignature = computeYoupiSignature(
    orderId,
    paymentId,
    secrets.RAZORPAY_KEY_SECRET
  );

  if (expectedSignature !== signature && legacySignature !== signature) {
    throw new Error('Payment verification failed: Invalid cryptographic signature.');
  }

  // 2. Atomic Idempotent Transaction
  const orderRef = db.doc(`orders/${orderId}`);
  let enrollmentId = '';
  let alreadyProcessed = false;

  await db.runTransaction(async (transaction) => {
    const orderDoc = await transaction.get(orderRef);
    if (!orderDoc.exists) {
      throw new Error(`Order ${orderId} does not exist.`);
    }

    const orderData = orderDoc.data() || {};
    if (orderData.uid !== uid) {
      throw new Error('Security violation: Cannot verify payment for another user.');
    }

    const courseId = orderData.courseId;
    enrollmentId = `${uid}_${courseId}`;
    const enrollmentRef = db.doc(`enrollments/${enrollmentId}`);
    const enrollmentDoc = await transaction.get(enrollmentRef);

    // Idempotency: If already marked paid and enrollment exists, exit gracefully
    if (orderData.status === 'paid' && enrollmentDoc.exists) {
      alreadyProcessed = true;
      return;
    }

    // 3. Mark Order as Paid
    transaction.update(orderRef, {
      status: 'paid',
      paymentId,
      utr: utr || orderData.utr || '',
      signature,
      razorpayPaymentId: paymentId, // backward-compat
      razorpaySignature: signature, // backward-compat
      paidAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // 4. Create Student Enrollment Document
    transaction.set(enrollmentRef, {
      uid,
      courseId,
      orderId,
      paymentId,
      utr: utr || orderData.utr || '',
      enrolledAt: admin.firestore.FieldValue.serverTimestamp(),
      active: true,
      source: 'youpi_direct',
    }, { merge: true });

    // 5. Increment coupon usage if a coupon was used
    if (orderData.couponCode) {
      const couponRef = db.doc(`coupons/${orderData.couponCode}`);
      transaction.update(couponRef, {
        usageCount: admin.firestore.FieldValue.increment(1),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  });

  return {
    success: true,
    orderId,
    enrollmentId,
    alreadyProcessed,
  };
}
