import * as admin from 'firebase-admin';
import { onCall, onRequest, HttpsError } from 'firebase-functions/v2/https';
import { createOrderHandler } from './payments/createOrder';
import { verifyPaymentHandler } from './payments/verifyPayment';
import { razorpayWebhookHandler } from './payments/razorpayWebhook';
import { refundPaymentHandler } from './payments/refundPayment';
import { getVideoTokenHandler } from './bunny/getVideoToken';
import { createBunnyUploadHandler } from './bunny/createBunnyUpload';
import { manageEnrollmentHandler } from './admin/manageEnrollment';
import { sendNotificationHandler } from './notifications/sendNotification';
import { deleteAccountHandler } from './user/deleteAccount';
import { submitQuizHandler } from './quizzes/submitQuiz';

// Initialize Firebase Admin App
if (admin.apps.length === 0) {
  admin.initializeApp();
}

/**
 * 1. createOrder: Server-Calculated Price & Razorpay Order Creation
 */
export const createOrder = onCall({ cors: true }, async (request) => {
  const uid = request.auth?.uid || null;
  try {
    return await createOrderHandler(request.data, uid);
  } catch (err: any) {
    throw new HttpsError('invalid-argument', err.message || 'Failed to create order.');
  }
});

/**
 * 2. verifyPayment: Cryptographic HMAC Signature Verification & Enrollment Unlock
 */
export const verifyPayment = onCall({ cors: true }, async (request) => {
  const uid = request.auth?.uid || null;
  try {
    return await verifyPaymentHandler(request.data, uid);
  } catch (err: any) {
    throw new HttpsError('invalid-argument', err.message || 'Payment verification failed.');
  }
});

/**
 * 3. razorpayWebhook: Asynchronous Webhook Backup Processor
 */
export const razorpayWebhook = onRequest(async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  const signature = req.headers['x-razorpay-signature'] as string | undefined;
  const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);

  try {
    const result = await razorpayWebhookHandler(rawBody, signature);
    res.status(200).json(result);
  } catch (err: any) {
    console.error('Webhook processing error:', err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
  }
});

/**
 * 4. getVideoToken: Time-Limited Bunny Stream Signed Token HLS Generator
 */
export const getVideoToken = onCall({ cors: true }, async (request) => {
  const uid = request.auth?.uid || null;
  try {
    return await getVideoTokenHandler(request.data, uid);
  } catch (err: any) {
    throw new HttpsError('permission-denied', err.message || 'Could not retrieve video playback token.');
  }
});

/**
 * 5. createBunnyUpload: Admin-Only Video Upload Asset Creation
 */
export const createBunnyUpload = onCall({ cors: true }, async (request) => {
  const uid = request.auth?.uid || null;
  try {
    return await createBunnyUploadHandler(request.data, uid);
  } catch (err: any) {
    throw new HttpsError('permission-denied', err.message || 'Could not initialize video upload.');
  }
});

/**
 * 6. refundPayment: Admin-Only Refund API & Immediate Access Revocation
 */
export const refundPayment = onCall({ cors: true }, async (request) => {
  const uid = request.auth?.uid || null;
  try {
    return await refundPaymentHandler(request.data, uid);
  } catch (err: any) {
    throw new HttpsError('permission-denied', err.message || 'Refund processing failed.');
  }
});

/**
 * 7. manageEnrollment: Admin-Only Manual Student Enroll & Revoke
 */
export const manageEnrollment = onCall({ cors: true }, async (request) => {
  const uid = request.auth?.uid || null;
  try {
    return await manageEnrollmentHandler(request.data, uid);
  } catch (err: any) {
    throw new HttpsError('permission-denied', err.message || 'Manual enrollment management failed.');
  }
});

/**
 * 8. sendNotification: Targeted Push & In-App Notification Dispatcher
 */
export const sendNotification = onCall({ cors: true }, async (request) => {
  const uid = request.auth?.uid || null;
  try {
    return await sendNotificationHandler(request.data, uid);
  } catch (err: any) {
    throw new HttpsError('permission-denied', err.message || 'Notification dispatch failed.');
  }
});

/**
 * 9. submitQuiz: Server-Side Quiz Evaluation & Anti-Cheat Engine
 */
export const submitQuiz = onCall({ cors: true }, async (request) => {
  const uid = request.auth?.uid || null;
  try {
    return await submitQuizHandler(request.data, uid);
  } catch (err: any) {
    throw new HttpsError('invalid-argument', err.message || 'Quiz evaluation failed.');
  }
});

/**
 * 10. deleteAccount: Play Store Compliant User Data Purge
 */
export const deleteAccount = onCall({ cors: true }, async (request) => {
  const uid = request.auth?.uid || null;
  try {
    return await deleteAccountHandler(uid);
  } catch (err: any) {
    throw new HttpsError('permission-denied', err.message || 'Account deletion failed.');
  }
});
