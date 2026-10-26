import * as admin from 'firebase-admin';
import { HttpsError } from 'firebase-functions/v2/https';
import { getRazorpayClient } from '../config';

export interface RefundPaymentRequest {
  orderId: string;
  amount?: number; // Optional partial refund in INR
  reason?: string;
}

export interface RefundPaymentResponse {
  success: boolean;
  refundId: string;
  orderId: string;
  revokedEnrollmentId: string;
  status: string;
}

export async function refundPaymentHandler(
  data: RefundPaymentRequest,
  adminUid: string,
  db: admin.firestore.Firestore = admin.firestore()
): Promise<RefundPaymentResponse> {
  const { orderId, amount, reason = 'Admin initiated refund' } = data || {};
  if (!orderId) {
    throw new HttpsError('invalid-argument', 'orderId is required.');
  }

  const orderRef = db.doc(`orders/${orderId}`);
  const orderDoc = await orderRef.get();
  if (!orderDoc.exists) {
    throw new HttpsError('not-found', `Order ${orderId} does not exist.`);
  }

  const orderData = orderDoc.data() || {};
  if (orderData.status !== 'paid') {
    throw new HttpsError(
      'failed-precondition',
      `Cannot refund order in '${orderData.status}' status. Only paid orders can be refunded.`
    );
  }

  const razorpayPaymentId = orderData.razorpayPaymentId || orderData.paymentId;
  if (!razorpayPaymentId || !razorpayPaymentId.startsWith('pay_')) {
    throw new HttpsError(
      'failed-precondition',
      'Order does not contain a verified Razorpay payment ID (pay_...). Cannot issue gateway refund.'
    );
  }

  // Calculate refund amount in paise (1 INR = 100 paise)
  const fullAmountPaise = Number(
    orderData.amountPaise !== undefined
      ? orderData.amountPaise
      : (orderData.amount ? orderData.amount * 100 : 0)
  );

  const refundAmountPaise = amount ? Math.round(amount * 100) : fullAmountPaise;

  if (refundAmountPaise <= 0 || refundAmountPaise > fullAmountPaise) {
    throw new HttpsError(
      'invalid-argument',
      `Refund amount must be between ₹1 and ₹${fullAmountPaise / 100}.`
    );
  }

  // 1. Call REAL Razorpay refund API
  const razorpay = getRazorpayClient();
  let razorpayRefund: any;

  try {
    razorpayRefund = await razorpay.payments.refund(razorpayPaymentId, {
      amount: refundAmountPaise,
      notes: {
        orderId,
        refundedBy: adminUid,
        reason,
      },
    });
  } catch (rzpErr: any) {
    console.error(`Razorpay refund failed for payment ${razorpayPaymentId}:`, rzpErr);
    const msg = rzpErr?.error?.description || rzpErr?.message || 'Razorpay refund API call failed.';
    throw new HttpsError('failed-precondition', `Razorpay refund rejected: ${msg}`);
  }

  if (!razorpayRefund || !razorpayRefund.id) {
    throw new HttpsError('internal', 'Razorpay did not return a valid refund reference.');
  }

  const refundId = razorpayRefund.id;
  const enrollmentId = `${orderData.uid}_${orderData.courseId}`;
  const enrollmentRef = db.doc(`enrollments/${enrollmentId}`);

  // 2. Atomic Order Update, Enrollment Revocation, and Audit Log
  await db.runTransaction(async (transaction) => {
    transaction.update(orderRef, {
      status: 'refunded',
      razorpayRefundId: refundId,
      refundReason: reason,
      refundAmount: refundAmountPaise / 100,
      refundedAt: admin.firestore.FieldValue.serverTimestamp(),
      refundedBy: adminUid,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Revoke enrollment per ARCHITECTURE.md (status: 'revoked', do NOT delete)
    transaction.set(
      enrollmentRef,
      {
        status: 'revoked',
        refundedAt: admin.firestore.FieldValue.serverTimestamp(),
        refundedBy: adminUid,
        refundReason: reason,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    // Write audit log entry using canonical auditLog collection
    const auditRef = db.collection('auditLog').doc();
    transaction.set(auditRef, {
      actorUid: adminUid,
      action: 'payment_refund',
      targetType: 'payment',
      targetId: orderId,
      metadata: {
        targetUser: orderData.uid,
        courseId: orderData.courseId,
        amount: refundAmountPaise / 100,
        razorpayRefundId: refundId,
        reason,
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

  // 3. Dispatch Notification to Student about Refund
  try {
    const { sendNotificationInternal } = await import('../notifications/sendNotification');
    await sendNotificationInternal({
      title: 'Course Refund Processed',
      body: `Your refund of ₹${refundAmountPaise / 100} for order #${orderId.slice(0, 8)} has been initiated.`,
      actionType: 'none',
      targetType: 'user',
      targetId: orderData.uid,
      senderUid: adminUid,
      db,
    });
  } catch (notifErr: any) {
    console.warn('[refundPayment] Student notification note:', notifErr.message);
  }

  return {
    success: true,
    refundId,
    orderId,
    revokedEnrollmentId: enrollmentId,
    status: 'refunded',
  };
}
