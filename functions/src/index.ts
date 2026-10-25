import * as admin from 'firebase-admin';
import { onCall, onRequest, HttpsError } from 'firebase-functions/v2/https';
import { razorpaySecrets, bunnySecrets } from './config';
import { requireAdmin, setAdminClaimHandler } from './auth';
import { createOrderHandler } from './payments/createOrder';
import { verifyPaymentHandler } from './payments/verifyPayment';
import { razorpayWebhookHandler } from './payments/razorpayWebhook';
import { refundPaymentHandler } from './payments/refundPayment';
import { validateCouponHandler } from './payments/validateCoupon';
import { getVideoTokenHandler } from './bunny/getVideoToken';
import { createBunnyUploadHandler } from './bunny/createBunnyUpload';
import { manageEnrollmentHandler } from './admin/manageEnrollment';
import { sendNotificationHandler } from './notifications/sendNotification';
import { deleteAccountHandler } from './user/deleteAccount';
import { submitQuizHandler } from './quizzes/submitQuiz';
import { getQuizQuestionsHandler } from './quizzes/getQuizQuestions';
import { getMaterialUrlHandler } from './materials/getMaterialUrl';
import {
  deleteCourseHandler,
  deleteQuizHandler,
  deleteLiveClassHandler,
} from './admin/cascadeDeletes';
import { getLiveStreamHandler } from './live/getLiveStream';

// Initialize Firebase Admin App
if (admin.apps.length === 0) {
  admin.initializeApp();
}

const REGION = 'asia-south1';

/**
 * 1. validateCoupon: Server-Side Coupon Validation & Discount Calculation
 */
export const validateCoupon = onCall(
  { region: REGION, cors: true },
  async (request) => {
    const uid = request.auth?.uid || null;
    try {
      return await validateCouponHandler(request.data, uid);
    } catch (err: any) {
      if (err instanceof HttpsError) throw err;
      throw new HttpsError('invalid-argument', err.message || 'Coupon validation failed.');
    }
  }
);

/**
 * 2. createOrder: Server-Calculated Price & Razorpay Order Creation
 */
export const createOrder = onCall(
  { region: REGION, cors: true, secrets: razorpaySecrets },
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
 * 3. verifyPayment: Cryptographic HMAC Signature Verification & Enrollment Unlock
 */
export const verifyPayment = onCall(
  { region: REGION, cors: true, secrets: razorpaySecrets },
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
 * 4. razorpayWebhook: Official Payment Gateway Webhook Handler
 */
export const razorpayWebhook = onRequest(
  { region: REGION, cors: true, secrets: razorpaySecrets },
  async (req, res) => {
    await razorpayWebhookHandler(req, res);
  }
);

/**
 * 5. getVideoToken: Time-Limited Bunny Stream Signed Token HLS Generator
 */
export const getVideoToken = onCall(
  { region: REGION, cors: true, secrets: bunnySecrets },
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
 * 6. createBunnyUpload: Admin-Only Video Upload Asset Creation
 */
export const createBunnyUpload = onCall(
  { region: REGION, cors: true, secrets: bunnySecrets },
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
 * 7. refundPayment: Admin-Only Refund API & Immediate Access Revocation
 */
export const refundPayment = onCall(
  { region: REGION, cors: true, secrets: razorpaySecrets },
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
 * 7b. setAdminClaim: Owner-Only Custom Claim Privilege Management
 */
export const setAdminClaim = onCall(
  { region: REGION, cors: true },
  async (request) => {
    try {
      return await setAdminClaimHandler(request.data, request);
    } catch (err: any) {
      if (err instanceof HttpsError) throw err;
      throw new HttpsError('permission-denied', err.message || 'Failed to update admin claims.');
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

/**
 * 11. getMaterialUrl: Short-Lived Ephemeral Download URL for Course Study Materials
 */
export const getMaterialUrl = onCall(
  { region: REGION, cors: true },
  async (request) => {
    const uid = request.auth?.uid || null;
    const adminClaim = request.auth?.token?.admin === true || request.auth?.token?.role === 'owner';
    try {
      return await getMaterialUrlHandler(request.data, uid, { admin: adminClaim });
    } catch (err: any) {
      if (err instanceof HttpsError) throw err;
      throw new HttpsError('internal', err.message || 'Failed to generate download URL.');
    }
  }
);

/**
 * 12. getLiveStream: Gated Live Broadcast Access
 */
export const getLiveStream = onCall(
  { region: REGION, cors: true },
  async (request) => {
    const uid = request.auth?.uid || null;
    const adminClaim = request.auth?.token?.admin === true || request.auth?.token?.role === 'owner';
    try {
      return await getLiveStreamHandler(request.data, uid, { admin: adminClaim });
    } catch (err: any) {
      if (err instanceof HttpsError) throw err;
      throw new HttpsError('permission-denied', err.message || 'Failed to retrieve live stream.');
    }
  }
);

/**
 * 13. deleteCourse: Administrative Cascade Delete with Active Enrollment Safeguard
 */
export const deleteCourse = onCall(
  { region: REGION, cors: true },
  async (request) => {
    const caller = requireAdmin(request);
    try {
      return await deleteCourseHandler(request.data, caller);
    } catch (err: any) {
      if (err instanceof HttpsError) throw err;
      throw new HttpsError('internal', err.message || 'Failed to delete course.');
    }
  }
);

/**
 * 14. deleteQuiz: Administrative Cascade Delete for Quizzes
 */
export const deleteQuiz = onCall(
  { region: REGION, cors: true },
  async (request) => {
    const caller = requireAdmin(request);
    try {
      return await deleteQuizHandler(request.data, caller);
    } catch (err: any) {
      if (err instanceof HttpsError) throw err;
      throw new HttpsError('internal', err.message || 'Failed to delete quiz.');
    }
  }
);

/**
 * 15. deleteLiveClass: Administrative Cascade Delete for Live Classes
 */
export const deleteLiveClass = onCall(
  { region: REGION, cors: true },
  async (request) => {
    const caller = requireAdmin(request);
    try {
      return await deleteLiveClassHandler(request.data, caller);
    } catch (err: any) {
      if (err instanceof HttpsError) throw err;
      throw new HttpsError('internal', err.message || 'Failed to delete live class.');
    }
  }
);
