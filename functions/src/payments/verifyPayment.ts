import * as crypto from 'crypto';
import * as admin from 'firebase-admin';
import { getSecrets } from '../config';

export interface VerifyPaymentRequest {
  orderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

export interface VerifyPaymentResponse {
  success: boolean;
  orderId: string;
  enrollmentId: string;
  alreadyProcessed?: boolean;
}

export function computeRazorpaySignature(
  orderId: string,
  paymentId: string,
  keySecret: string
): string {
  return crypto
    .createHmac('sha256', keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
}

export async function verifyPaymentHandler(
  data: VerifyPaymentRequest,
  uid: string | null,
  db: admin.firestore.Firestore = admin.firestore()
): Promise<VerifyPaymentResponse> {
  if (!uid) {
    throw new Error('Authentication required to verify payment.');
  }

  const { orderId, razorpayPaymentId, razorpaySignature } = data;
  if (!orderId || !razorpayPaymentId || !razorpaySignature) {
    throw new Error('Missing required arguments: orderId, razorpayPaymentId, and razorpaySignature.');
  }

  const secrets = getSecrets();

  // 1. Cryptographic Signature Verification
  const expectedSignature = computeRazorpaySignature(
    orderId,
    razorpayPaymentId,
    secrets.RAZORPAY_KEY_SECRET
  );

  if (expectedSignature !== razorpaySignature) {
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
      razorpayPaymentId,
      razorpaySignature,
      paidAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // 4. Create Student Enrollment Document
    transaction.set(enrollmentRef, {
      uid,
      courseId,
      orderId,
      paymentId: razorpayPaymentId,
      enrolledAt: admin.firestore.FieldValue.serverTimestamp(),
      active: true,
      source: 'razorpay_direct',
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
