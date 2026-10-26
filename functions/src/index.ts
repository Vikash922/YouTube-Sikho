import * as admin from 'firebase-admin';
import { onCall, onRequest } from 'firebase-functions/v2/https';
import { razorpaySecrets, youtubeSecrets, r2Secrets } from './config';
import {
  REGION,
  defaultCallableOptions,
  heavyCallableOptions,
  requireAdmin,
  requireAuth,
  normalizeError,
} from './lib';

import { setAdminClaimHandler } from './auth';
import { validateYoutubeVideoHandler } from './youtube/validateYoutubeVideo';
import { createOrderHandler } from './payments/createOrder';
import { verifyPaymentHandler } from './payments/verifyPayment';
import { razorpayWebhookHandler } from './payments/razorpayWebhook';
import { refundPaymentHandler } from './payments/refundPayment';
import { validateCouponHandler } from './payments/validateCoupon';
import { manageEnrollmentHandler } from './admin/manageEnrollment';
import { sendNotificationHandler } from './notifications/sendNotification';
import { deleteAccountHandler } from './user/deleteAccount';
import { submitQuizHandler } from './quizzes/submitQuiz';
import { getQuizQuestionsHandler } from './quizzes/getQuizQuestions';
import { getMaterialUrlHandler } from './materials/getMaterialUrl';
import { getMaterialUploadUrlHandler } from './materials/getMaterialUploadUrl';
import {
  deleteCourseHandler,
  deleteQuizHandler,
  deleteLiveClassHandler,
} from './admin/cascadeDeletes';
import { getLiveStreamHandler } from './live/getLiveStream';
import { markLessonCompleteHandler } from './progress/markLessonComplete';
import { issueCertificateHandler } from './certificates/issueCertificate';

// Initialize Firebase Admin App singleton
if (admin.apps.length === 0) {
  admin.initializeApp();
}

/**
 * 1. validateCoupon: Server-Side Coupon Validation & Discount Calculation
 */
export const validateCoupon = onCall(defaultCallableOptions, async (request) => {
  const uid = request.auth?.uid || null;
  try {
    return await validateCouponHandler(request.data, uid);
  } catch (err: any) {
    throw normalizeError(err, 'validateCoupon');
  }
});

/**
 * 2. createOrder: Server-Calculated Price & Razorpay Order Creation
 */
export const createOrder = onCall(
  { ...defaultCallableOptions, secrets: razorpaySecrets },
  async (request) => {
    const auth = requireAuth(request);
    try {
      return await createOrderHandler(request.data, auth.uid);
    } catch (err: any) {
      throw normalizeError(err, 'createOrder');
    }
  }
);

/**
 * 3. verifyPayment: Cryptographic HMAC Signature Verification & Enrollment Unlock
 */
export const verifyPayment = onCall(
  { ...defaultCallableOptions, secrets: razorpaySecrets },
  async (request) => {
    const auth = requireAuth(request);
    try {
      return await verifyPaymentHandler(request.data, auth.uid);
    } catch (err: any) {
      throw normalizeError(err, 'verifyPayment');
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
 * 5. refundPayment: Admin-Only Refund API & Immediate Access Revocation
 */
export const refundPayment = onCall(
  { ...defaultCallableOptions, secrets: razorpaySecrets },
  async (request) => {
    const caller = requireAdmin(request);
    try {
      return await refundPaymentHandler(request.data, caller.uid);
    } catch (err: any) {
      throw normalizeError(err, 'refundPayment');
    }
  }
);

/**
 * 6. validateYoutubeVideo: Server-Side Unlisted YouTube Video Verification
 */
export const validateYoutubeVideo = onCall(
  { ...defaultCallableOptions, secrets: youtubeSecrets },
  async (request) => {
    requireAdmin(request);
    try {
      return await validateYoutubeVideoHandler(request.data);
    } catch (err: any) {
      throw normalizeError(err, 'validateYoutubeVideo');
    }
  }
);

/**
 * 7. manageEnrollment: Admin-Only Manual Student Enroll & Revoke
 */
export const manageEnrollment = onCall(defaultCallableOptions, async (request) => {
  try {
    return await manageEnrollmentHandler(request.data, request);
  } catch (err: any) {
    throw normalizeError(err, 'manageEnrollment');
  }
});

/**
 * 7b. setAdminClaim: Owner-Only Custom Claim Privilege Management
 */
export const setAdminClaim = onCall(defaultCallableOptions, async (request) => {
  try {
    return await setAdminClaimHandler(request.data, request);
  } catch (err: any) {
    throw normalizeError(err, 'setAdminClaim');
  }
});

/**
 * 8. sendNotification: Targeted Push & In-App Notification Dispatcher (Chunked)
 */
export const sendNotification = onCall(heavyCallableOptions, async (request) => {
  try {
    return await sendNotificationHandler(request.data, request);
  } catch (err: any) {
    throw normalizeError(err, 'sendNotification');
  }
});

/**
 * 8b. getQuizQuestions: Sanitized Question Bank Retrieval for Enrolled Students
 */
export const getQuizQuestions = onCall(defaultCallableOptions, async (request) => {
  const auth = requireAuth(request);
  try {
    return await getQuizQuestionsHandler(request.data, auth.uid);
  } catch (err: any) {
    throw normalizeError(err, 'getQuizQuestions');
  }
});

/**
 * 9. submitQuiz: Server-Side Quiz Evaluation & Anti-Cheat Engine
 */
export const submitQuiz = onCall(defaultCallableOptions, async (request) => {
  const auth = requireAuth(request);
  try {
    return await submitQuizHandler(request.data, auth.uid);
  } catch (err: any) {
    throw normalizeError(err, 'submitQuiz');
  }
});

/**
 * 10. deleteAccount: Play Store & GDPR Compliant User Data Purge (Resumable)
 */
export const deleteAccount = onCall(heavyCallableOptions, async (request) => {
  try {
    return await deleteAccountHandler(request);
  } catch (err: any) {
    throw normalizeError(err, 'deleteAccount');
  }
});

/**
 * 11. getMaterialUrl: Short-Lived Ephemeral Download URL for Course Study Materials (R2 & Storage)
 */
export const getMaterialUrl = onCall(
  { ...defaultCallableOptions, secrets: r2Secrets },
  async (request) => {
    const auth = requireAuth(request);
    const adminClaim = request.auth?.token?.admin === true || request.auth?.token?.role === 'owner';
    try {
      return await getMaterialUrlHandler(request.data, auth.uid, { admin: adminClaim });
    } catch (err: any) {
      throw normalizeError(err, 'getMaterialUrl');
    }
  }
);

/**
 * 11b. getMaterialUploadUrl: Secure Admin Presigned Upload Link for Cloudflare R2
 */
export const getMaterialUploadUrl = onCall(
  { ...defaultCallableOptions, secrets: r2Secrets },
  async (request) => {
    try {
      return await getMaterialUploadUrlHandler(request);
    } catch (err: any) {
      throw normalizeError(err, 'getMaterialUploadUrl');
    }
  }
);

/**
 * 12. getLiveStream: Gated Live Broadcast Access
 */
export const getLiveStream = onCall(defaultCallableOptions, async (request) => {
  const auth = requireAuth(request);
  const adminClaim = request.auth?.token?.admin === true || request.auth?.token?.role === 'owner';
  try {
    return await getLiveStreamHandler(request.data, auth.uid, { admin: adminClaim });
  } catch (err: any) {
    throw normalizeError(err, 'getLiveStream');
  }
});

/**
 * 13. deleteCourse: Administrative Cascade Delete with Active Enrollment Safeguard
 */
export const deleteCourse = onCall(heavyCallableOptions, async (request) => {
  const caller = requireAdmin(request);
  try {
    return await deleteCourseHandler(request.data, caller);
  } catch (err: any) {
    throw normalizeError(err, 'deleteCourse');
  }
});

/**
 * 14. deleteQuiz: Administrative Cascade Delete for Quizzes
 */
export const deleteQuiz = onCall(heavyCallableOptions, async (request) => {
  const caller = requireAdmin(request);
  try {
    return await deleteQuizHandler(request.data, caller);
  } catch (err: any) {
    throw normalizeError(err, 'deleteQuiz');
  }
});

/**
 * 15. deleteLiveClass: Administrative Cascade Delete for Live Classes
 */
export const deleteLiveClass = onCall(heavyCallableOptions, async (request) => {
  const caller = requireAdmin(request);
  try {
    return await deleteLiveClassHandler(request.data, caller);
  } catch (err: any) {
    throw normalizeError(err, 'deleteLiveClass');
  }
});

/**
 * 16. markLessonComplete: Authoritative Progress Evaluation & Completion Check
 */
export const markLessonComplete = onCall(defaultCallableOptions, async (request) => {
  const auth = requireAuth(request);
  try {
    return await markLessonCompleteHandler(request.data, auth.uid);
  } catch (err: any) {
    throw normalizeError(err, 'markLessonComplete');
  }
});

/**
 * 17. issueCertificate: Authoritative 100% Progress Verification & Certificate Issuance
 */
export const issueCertificate = onCall(defaultCallableOptions, async (request) => {
  const auth = requireAuth(request);
  try {
    return await issueCertificateHandler(request.data, auth.uid);
  } catch (err: any) {
    throw normalizeError(err, 'issueCertificate');
  }
});

// Automated Triggers & Scheduled Jobs
export { onCoursePublished, onLiveClassReminder } from './notifications/triggers';
export { dailyMaintenance } from './maintenance/dailyMaintenance';
export {
  onOrderStatsUpdate,
  onUserCreatedStats,
  onUserDeletedStats,
} from './stats/dashboardStats';
export { blockUser, unblockUser } from './admin/manageUserBlock';

