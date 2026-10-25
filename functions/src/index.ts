import * as admin from 'firebase-admin';
import { onCall, onRequest, HttpsError } from 'firebase-functions/v2/https';
import { allSecrets } from './config';
import { requireAdmin } from './auth';
import { createOrderHandler } from './payments/createOrder';
import { verifyPaymentHandler } from './payments/verifyPayment';
import { youpiWebhookHandler } from './payments/youpiWebhook';
import { refundPaymentHandler } from './payments/refundPayment';
import { getVideoTokenHandler } from './bunny/getVideoToken';
import { createBunnyUploadHandler } from './bunny/createBunnyUpload';
import { manageEnrollmentHandler } from './admin/manageEnrollment';
import { sendNotificationHandler } from './notifications/sendNotification';
import { deleteAccountHandler } from './user/deleteAccount';
import { submitQuizHandler } from './quizzes/submitQuiz';
import { getQuizQuestionsHandler } from './quizzes/getQuizQuestions';

// Initialize Firebase Admin App
if (admin.apps.length === 0) {
  admin.initializeApp();
}

const REGION = 'asia-south1';

/**
 * 1. createOrder: Server-Calculated Price & Razorpay Order Creation
 */
export const createOrder = onCall(
  { region: REGION, cors: true, secrets: allSecrets },
  async (request) => {
    const uid = request.auth?.uid || null;
    try {
      return await createOrderHandler(request.data, uid);
    } catch (err: any) {
      if (err instanceof HttpsError) throw err;
      throw new HttpsError('invalid-argument', err.message || 'Failed to create order.');
    }
  }
);

/**
 * 2. verifyPayment: Cryptographic HMAC Signature Verification & Enrollment Unlock
 */
export const verifyPayment = onCall(
  { region: REGION, cors: true, secrets: allSecrets },
  async (request) => {
    const uid = request.auth?.uid || null;
    try {
      return await verifyPaymentHandler(request.data, uid);
    } catch (err: any) {
      if (err instanceof HttpsError) throw err;
      throw new HttpsError('invalid-argument', err.message || 'Payment verification failed.');
    }
  }
);

/**
 * 3. youpiWebhook / razorpayWebhook: Payment Gateway Webhook Handler
 */
export const youpiWebhook = onRequest(
  { region: REGION, cors: true, secrets: allSecrets },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).send('Method Not Allowed');
      return;
    }

    const signature =
      (req.headers['x-razorpay-signature'] as string | undefined) ||
      (req.headers['x-gateway-signature'] as string | undefined);
    const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);

    try {
      const result = await youpiWebhookHandler(rawBody, signature);
      res.status(200).json(result);
    } catch (err: any) {
      console.error('Razorpay Webhook processing error:', err.message);
      res.status(400).send(`Webhook Error: ${err.message}`);
    }
  }
);

export const razorpayWebhook = youpiWebhook;

/**
 * 4. getVideoToken: Time-Limited Bunny Stream Signed Token HLS Generator
 */
export const getVideoToken = onCall(
  { region: REGION, cors: true, secrets: allSecrets },
  async (request) => {
    const uid = request.auth?.uid || null;
    try {
      return await getVideoTokenHandler(request.data, uid);
    } catch (err: any) {
      if (err instanceof HttpsError) throw err;
      throw new HttpsError('permission-denied', err.message || 'Could not retrieve video playback token.');
    }
  }
);

/**
 * 5. createBunnyUpload: Admin-Only Video Upload Asset Creation
 */
export const createBunnyUpload = onCall(
  { region: REGION, cors: true, secrets: allSecrets },
  async (request) => {
    requireAdmin(request);
    const uid = request.auth!.uid;
    try {
      return await createBunnyUploadHandler(request.data, uid);
    } catch (err: any) {
      if (err instanceof HttpsError) throw err;
      throw new HttpsError('permission-denied', err.message || 'Could not initialize video upload.');
    }
  }
);

/**
 * 6. refundPayment: Admin-Only Refund API & Immediate Access Revocation
 */
export const refundPayment = onCall(
  { region: REGION, cors: true, secrets: allSecrets },
  async (request) => {
    requireAdmin(request);
    const uid = request.auth!.uid;
    try {
      return await refundPaymentHandler(request.data, uid);
    } catch (err: any) {
      if (err instanceof HttpsError) throw err;
      throw new HttpsError('permission-denied', err.message || 'Refund processing failed.');
    }
  }
);

/**
 * 7. manageEnrollment: Admin-Only Manual Student Enroll & Revoke
 */
export const manageEnrollment = onCall(
  { region: REGION, cors: true },
  async (request) => {
    requireAdmin(request);
    const uid = request.auth!.uid;
    try {
      return await manageEnrollmentHandler(request.data, uid);
    } catch (err: any) {
      if (err instanceof HttpsError) throw err;
      throw new HttpsError('permission-denied', err.message || 'Manual enrollment management failed.');
    }
  }
);

/**
 * 8. sendNotification: Targeted Push & In-App Notification Dispatcher
 */
export const sendNotification = onCall(
  { region: REGION, cors: true },
  async (request) => {
    requireAdmin(request);
    const uid = request.auth!.uid;
    try {
      return await sendNotificationHandler(request.data, uid);
    } catch (err: any) {
      if (err instanceof HttpsError) throw err;
      throw new HttpsError('permission-denied', err.message || 'Notification dispatch failed.');
    }
  }
);

/**
 * 8b. getQuizQuestions: Sanitized Question Bank Retrieval for Enrolled Students
 */
export const getQuizQuestions = onCall(
  { region: REGION, cors: true },
  async (request) => {
    const uid = request.auth?.uid || null;
    try {
      return await getQuizQuestionsHandler(request.data, uid);
    } catch (err: any) {
      if (err instanceof HttpsError) throw err;
      throw new HttpsError('permission-denied', err.message || 'Could not fetch quiz questions.');
    }
  }
);

/**
 * 9. submitQuiz: Server-Side Quiz Evaluation & Anti-Cheat Engine
 */
export const submitQuiz = onCall(
  { region: REGION, cors: true },
  async (request) => {
    const uid = request.auth?.uid || null;
    try {
      return await submitQuizHandler(request.data, uid);
    } catch (err: any) {
      if (err instanceof HttpsError) throw err;
      throw new HttpsError('invalid-argument', err.message || 'Quiz evaluation failed.');
    }
  }
);

/**
 * 10. deleteAccount: Play Store Compliant User Data Purge
 */
export const deleteAccount = onCall(
  { region: REGION, cors: true },
  async (request) => {
    if (!request.auth?.uid) {
      throw new HttpsError('unauthenticated', 'Authentication required.');
    }
    try {
      return await deleteAccountHandler(request);
    } catch (err: any) {
      if (err instanceof HttpsError) throw err;
      throw new HttpsError('permission-denied', err.message || 'Account deletion failed.');
    }
  }
);
