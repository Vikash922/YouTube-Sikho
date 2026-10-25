import * as crypto from 'crypto';
import * as admin from 'firebase-admin';
import { HttpsError } from 'firebase-functions/v2/https';
import { getRazorpayClient, getRazorpaySecrets } from '../config';

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
  message?: string;
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
    throw new HttpsError('unauthenticated', 'Authentication required to verify payment.');
  }

  const { orderId, razorpayPaymentId, razorpaySignature } = data || {};
  if (!orderId || !razorpayPaymentId || !razorpaySignature) {
    throw new HttpsError(
      'invalid-argument',
      'Missing required arguments: orderId, razorpayPaymentId, and razorpaySignature.'
    );
  }

  const { keySecret } = getRazorpaySecrets();

  // 1. Cryptographic HMAC-SHA256 Signature Verification
  const expectedSignature = computeRazorpaySignature(
    orderId,
    razorpayPaymentId,
    keySecret
  );

  const sigBuf = Buffer.from(razorpaySignature, 'utf8');
  const expBuf = Buffer.from(expectedSignature, 'utf8');

  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    throw new HttpsError(
      'permission-denied',
      'Payment verification failed: Invalid cryptographic signature.'
    );
  }

  // 2. Fetch Order from Firestore and Validate Ownership
  const orderRef = db.doc(`orders/${orderId}`);
  const orderDoc = await orderRef.get();
  if (!orderDoc.exists) {
    throw new HttpsError('not-found', `Order ${orderId} does not exist.`);
  }

  const orderData = orderDoc.data() || {};
  if (orderData.uid !== uid) {
    throw new HttpsError(
      'permission-denied',
      'Security violation: Cannot verify payment for another user.'
    );
  }

  // 3. Confirm with Razorpay API (Status, Amount, Currency)
  const razorpay = getRazorpayClient();
  let paymentEntity: any;

  try {
    paymentEntity = await razorpay.payments.fetch(razorpayPaymentId);
  } catch (err: any) {
    console.error(`Razorpay payments.fetch failed for ${razorpayPaymentId}:`, err);
    throw new HttpsError(
      'internal',
      `Payment gateway check failed: ${err.message || 'Unable to fetch payment details from Razorpay.'}`
    );
  }

  if (!paymentEntity) {
    throw new HttpsError('not-found', 'Payment not found on Razorpay.');
  }

  if (paymentEntity.status !== 'captured' && paymentEntity.status !== 'authorized') {
    throw new HttpsError(
      'failed-precondition',
      `Payment is not confirmed. Current status: ${paymentEntity.status}.`
    );
  }

  if (paymentEntity.currency !== 'INR') {
    throw new HttpsError('invalid-argument', `Invalid payment currency: ${paymentEntity.currency}.`);
  }

  const expectedPaise = Number(orderData.amountPaise !== undefined ? orderData.amountPaise : (orderData.amount || 0));
  if (paymentEntity.amount !== expectedPaise) {
    throw new HttpsError(
      'invalid-argument',
      `Payment amount mismatch: expected ₹${expectedPaise / 100}, but received ₹${paymentEntity.amount / 100}.`
    );
  }

  // 4. Atomic Idempotent Transaction: Order -> paid, Enrollment -> active, Coupon -> usedCount++
  const courseId = orderData.courseId;
  const enrollmentId = `${uid}_${courseId}`;
  const enrollmentRef = db.doc(`enrollments/${enrollmentId}`);
  let alreadyProcessed = false;

  await db.runTransaction(async (transaction) => {
    const currentOrderDoc = await transaction.get(orderRef);
    if (!currentOrderDoc.exists) {
      throw new HttpsError('not-found', `Order ${orderId} missing during transaction.`);
    }

    const currentOrder = currentOrderDoc.data() || {};
    const currentEnrollmentDoc = await transaction.get(enrollmentRef);

    // Idempotency: If order is already paid and enrollment exists and is active, return immediately
    if (
      currentOrder.status === 'paid' &&
      currentEnrollmentDoc.exists &&
      currentEnrollmentDoc.data()?.status === 'active'
    ) {
      alreadyProcessed = true;
      return;
    }

    // Check Coupon Max Uses inside transaction if a coupon was used
    let couponRef: admin.firestore.DocumentReference | null = null;
    if (currentOrder.couponCode) {
      couponRef = db.doc(`coupons/${currentOrder.couponCode}`);
      const couponDoc = await transaction.get(couponRef);
      if (couponDoc.exists) {
        const cData = couponDoc.data() || {};
        const maxUses = Number(cData.maxUses || 0);
        const usedCount = Number(cData.usedCount !== undefined ? cData.usedCount : (cData.usageCount || 0));
        if (maxUses > 0 && usedCount >= maxUses && currentOrder.status !== 'paid') {
          throw new HttpsError('resource-exhausted', `Coupon ${currentOrder.couponCode} reached max uses.`);
        }
      }
    }

    // Mark Order as Paid
    transaction.update(orderRef, {
      status: 'paid',
      razorpayPaymentId,
      razorpaySignature,
      paymentMethod: paymentEntity.method || 'online',
      paidAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Create / Update Enrollment with unified status: 'active'
    transaction.set(
      enrollmentRef,
      {
        uid,
        courseId,
        orderId,
        razorpayPaymentId,
        status: 'active',
        enrolledAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    // Increment coupon usedCount
    if (couponRef && currentOrder.status !== 'paid') {
      transaction.update(couponRef, {
        usedCount: admin.firestore.FieldValue.increment(1),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  });

  return {
    success: true,
    orderId,
    enrollmentId,
    alreadyProcessed,
    message: alreadyProcessed
      ? 'Payment was already verified and enrollment is active.'
      : 'Payment verified successfully and course access unlocked.',
  };
}
