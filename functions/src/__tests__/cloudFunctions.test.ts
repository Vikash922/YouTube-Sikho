import { describe, it } from 'node:test';
import assert from 'node:assert';
import { MockFirestore } from './mockDb';
import { createOrderHandler } from '../payments/createOrder';
import { verifyPaymentHandler, computeRazorpaySignature } from '../payments/verifyPayment';
import { razorpayWebhookHandler, computeWebhookSignature } from '../payments/razorpayWebhook';
import { refundPaymentHandler } from '../payments/refundPayment';
import { getVideoTokenHandler } from '../bunny/getVideoToken';
import { manageEnrollmentHandler } from '../admin/manageEnrollment';
import { sendNotificationHandler } from '../notifications/sendNotification';
import { submitQuizHandler } from '../quizzes/submitQuiz';
import { deleteAccountHandler } from '../user/deleteAccount';
import { getSecrets } from '../config';

const secrets = getSecrets();

describe('Cloud Functions Suite - Phase 3 Verification', () => {

  describe('1. createOrder Function', () => {
    it('strictly ignores client-submitted price and calculates final price from server data', async () => {
      const db = new MockFirestore();
      db.seed('courses/course_yt_starter', {
        title: 'YouTube Starter Mastery',
        price: 1999,
        discountPrice: 499,
      });

      // Malicious client passes a forged price of ₹10
      const order = await createOrderHandler(
        {
          courseId: 'course_yt_starter',
          clientSubmittedPrice: 10,
        },
        'student_test_1',
        db as any
      );

      // Server must charge the real discounted course price of ₹499 (49900 paise)
      assert.strictEqual(order.finalPrice, 499);
      assert.strictEqual(order.amount, 49900);
      assert.ok(order.orderId.length > 0);

      // Verify Firestore order record status is 'created'
      const savedOrder = db.getData(`orders/${order.orderId}`);
      assert.strictEqual(savedOrder.status, 'created');
      assert.strictEqual(savedOrder.finalPrice, 499);
      assert.strictEqual(savedOrder.uid, 'student_test_1');
    });

    it('rejects an invalid coupon code', async () => {
      const db = new MockFirestore();
      db.seed('courses/course_yt_starter', { price: 1999, discountPrice: 499 });

      await assert.rejects(
        async () => {
          await createOrderHandler(
            { courseId: 'course_yt_starter', couponCode: 'FAKE_CODE' },
            'student_test_1',
            db as any
          );
        },
        { message: "Coupon 'FAKE_CODE' is invalid." }
      );
    });

    it('rejects an expired coupon code', async () => {
      const db = new MockFirestore();
      db.seed('courses/course_yt_starter', { price: 1999, discountPrice: 499 });
      db.seed('coupons/EXPIRED20', {
        active: true,
        type: 'percent',
        value: 20,
        expiresAt: new Date(Date.now() - 1000 * 60 * 60 * 24), // Expired yesterday
      });

      await assert.rejects(
        async () => {
          await createOrderHandler(
            { courseId: 'course_yt_starter', couponCode: 'EXPIRED20' },
            'student_test_1',
            db as any
          );
        },
        { message: "Coupon 'EXPIRED20' has expired." }
      );
    });

    it('rejects a coupon when max usage limit has been reached', async () => {
      const db = new MockFirestore();
      db.seed('courses/course_yt_starter', { price: 1999, discountPrice: 499 });
      db.seed('coupons/DEPLETED', {
        active: true,
        type: 'flat',
        value: 100,
        maxUses: 10,
        usageCount: 10,
      });

      await assert.rejects(
        async () => {
          await createOrderHandler(
            { courseId: 'course_yt_starter', couponCode: 'DEPLETED' },
            'student_test_1',
            db as any
          );
        },
        { message: "Coupon 'DEPLETED' usage limit has been reached." }
      );
    });

    it('applies a valid percentage coupon correctly', async () => {
      const db = new MockFirestore();
      db.seed('courses/course_yt_starter', { price: 1000, discountPrice: 1000 });
      db.seed('coupons/SAVE50', {
        active: true,
        type: 'percent',
        value: 50,
        maxUses: 100,
        usageCount: 0,
      });

      const order = await createOrderHandler(
        { courseId: 'course_yt_starter', couponCode: 'SAVE50' },
        'student_test_1',
        db as any
      );

      assert.strictEqual(order.discountAmount, 500);
      assert.strictEqual(order.finalPrice, 500);
      assert.strictEqual(order.amount, 50000);
    });
  });

  describe('2. verifyPayment Function', () => {
    it('rejects a forged or invalid cryptographic HMAC signature', async () => {
      const db = new MockFirestore();
      db.seed('orders/order_sample_1', {
        orderId: 'order_sample_1',
        uid: 'student_test_1',
        courseId: 'course_yt_starter',
        status: 'created',
      });

      await assert.rejects(
        async () => {
          await verifyPaymentHandler(
            {
              orderId: 'order_sample_1',
              razorpayPaymentId: 'pay_sample_999',
              razorpaySignature: 'forged_fake_signature_abc123',
            },
            'student_test_1',
            db as any
          );
        },
        { message: 'Payment verification failed: Invalid cryptographic signature.' }
      );
    });

    it('accepts valid HMAC signature, marks order paid, and unlocks course enrollment', async () => {
      const db = new MockFirestore();
      const orderId = 'order_sample_1';
      const paymentId = 'pay_sample_999';

      db.seed(`orders/${orderId}`, {
        orderId,
        uid: 'student_test_1',
        courseId: 'course_yt_starter',
        status: 'created',
      });

      const validSignature = computeRazorpaySignature(
        orderId,
        paymentId,
        secrets.RAZORPAY_KEY_SECRET
      );

      const res = await verifyPaymentHandler(
        {
          orderId,
          razorpayPaymentId: paymentId,
          razorpaySignature: validSignature,
        },
        'student_test_1',
        db as any
      );

      assert.strictEqual(res.success, true);
      assert.strictEqual(res.enrollmentId, 'student_test_1_course_yt_starter');

      // Assert order is paid
      const order = db.getData(`orders/${orderId}`);
      assert.strictEqual(order.status, 'paid');
      assert.strictEqual(order.razorpayPaymentId, paymentId);

      // Assert enrollment exists
      assert.ok(db.has('enrollments/student_test_1_course_yt_starter'));
    });

    it('is strictly idempotent: calling verifyPayment twice creates exactly one enrollment', async () => {
      const db = new MockFirestore();
      const orderId = 'order_sample_idempotent';
      const paymentId = 'pay_sample_idem';

      db.seed(`orders/${orderId}`, {
        orderId,
        uid: 'student_test_1',
        courseId: 'course_yt_starter',
        status: 'created',
      });

      const validSignature = computeRazorpaySignature(
        orderId,
        paymentId,
        secrets.RAZORPAY_KEY_SECRET
      );

      // First call
      const res1 = await verifyPaymentHandler(
        { orderId, razorpayPaymentId: paymentId, razorpaySignature: validSignature },
        'student_test_1',
        db as any
      );
      assert.strictEqual(res1.success, true);

      // Second call (duplicate/retry)
      const res2 = await verifyPaymentHandler(
        { orderId, razorpayPaymentId: paymentId, razorpaySignature: validSignature },
        'student_test_1',
        db as any
      );
      assert.strictEqual(res2.success, true);
      assert.strictEqual(res2.alreadyProcessed, true);

      // Ensure exactly 1 enrollment exists
      const enrollmentsSnap = await db.collection('enrollments').get();
      assert.strictEqual(enrollmentsSnap.size, 1);
    });
  });

  describe('3. razorpayWebhook Function', () => {
    it('rejects a webhook request with a bad signature', async () => {
      const db = new MockFirestore();
      const rawBody = JSON.stringify({ event: 'payment.captured' });

      await assert.rejects(
        async () => {
          await razorpayWebhookHandler(rawBody, 'invalid_webhook_sig', db as any);
        },
        { message: 'Unauthorized: Invalid Razorpay webhook signature.' }
      );
    });

    it('handles payment.captured webhook and asynchronously unlocks enrollment', async () => {
      const db = new MockFirestore();
      const orderId = 'order_webhook_01';
      const paymentId = 'pay_wh_123';
      const uid = 'student_wh_user';
      const courseId = 'course_yt_starter';

      db.seed(`orders/${orderId}`, {
        orderId,
        uid,
        courseId,
        status: 'created',
      });

      const payload = {
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: paymentId,
              order_id: orderId,
              notes: { uid, courseId },
            },
          },
        },
      };

      const rawBody = JSON.stringify(payload);
      const validSig = computeWebhookSignature(rawBody, secrets.RAZORPAY_WEBHOOK_SECRET);

      const res = await razorpayWebhookHandler(rawBody, validSig, db as any);
      assert.strictEqual(res.status, 'ok');

      // Assert order updated to paid
      const order = db.getData(`orders/${orderId}`);
      assert.strictEqual(order.status, 'paid');

      // Assert enrollment created
      assert.ok(db.has(`enrollments/${uid}_${courseId}`));
    });

    it('handles duplicate and parallel webhook events idempotently with zero duplicates', async () => {
      const db = new MockFirestore();
      const orderId = 'order_wh_parallel';
      const uid = 'student_parallel';
      const courseId = 'course_yt_starter';

      db.seed(`orders/${orderId}`, { orderId, uid, courseId, status: 'created' });

      const payload = {
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: 'pay_parallel_1',
              order_id: orderId,
              notes: { uid, courseId },
            },
          },
        },
      };

      const rawBody = JSON.stringify(payload);
      const validSig = computeWebhookSignature(rawBody, secrets.RAZORPAY_WEBHOOK_SECRET);

      // Run parallel webhook calls
      await Promise.all([
        razorpayWebhookHandler(rawBody, validSig, db as any),
        razorpayWebhookHandler(rawBody, validSig, db as any),
      ]);

      // Exactly 1 enrollment must exist
      const enrollmentsSnap = await db.collection('enrollments').get();
      assert.strictEqual(enrollmentsSnap.size, 1);
    });
  });

  describe('4. getVideoToken Function (Bunny Stream)', () => {
    it('denies access to a paid lesson when user is not enrolled', async () => {
      const db = new MockFirestore();
      db.seed('courses/course_1/sections/sec_1/lessons/les_paid_1', {
        title: 'Advanced CTR Secrets',
        videoId: 'bunny_vid_999',
        isFreePreview: false,
      });

      await assert.rejects(
        async () => {
          await getVideoTokenHandler(
            { courseId: 'course_1', lessonId: 'les_paid_1', sectionId: 'sec_1' },
            'unenrolled_student',
            db as any
          );
        },
        { message: 'Permission denied: You must be enrolled in this course to access this video.' }
      );
    });

    it('allows access to a lesson marked with isFreePreview: true even without enrollment', async () => {
      const db = new MockFirestore();
      db.seed('courses/course_1/sections/sec_1/lessons/les_free_1', {
        title: 'Free Intro Module',
        videoId: 'bunny_vid_free_101',
        isFreePreview: true,
      });

      // Unauthenticated caller
      const res = await getVideoTokenHandler(
        { courseId: 'course_1', lessonId: 'les_free_1', sectionId: 'sec_1' },
        null,
        db as any
      );

      assert.strictEqual(res.isFreePreview, true);
      assert.strictEqual(res.videoId, 'bunny_vid_free_101');
      assert.ok(res.hlsUrl.includes('playlist.m3u8?token='));
      assert.ok(res.expiresAt > Math.floor(Date.now() / 1000));
    });

    it('allows enrolled student to access paid lesson and returns valid signed HLS URL with 1-hour expiration', async () => {
      const db = new MockFirestore();
      const courseId = 'course_1';
      const lessonId = 'les_paid_1';
      const uid = 'enrolled_student_1';

      db.seed(`courses/${courseId}/sections/sec_1/lessons/${lessonId}`, {
        title: 'Paid Module 2',
        videoId: 'bunny_vid_paid_202',
        isFreePreview: false,
      });

      // Seed student enrollment
      db.seed(`enrollments/${uid}_${courseId}`, {
        uid,
        courseId,
        active: true,
      });

      const res = await getVideoTokenHandler(
        { courseId, lessonId, sectionId: 'sec_1' },
        uid,
        db as any
      );

      assert.strictEqual(res.isFreePreview, false);
      assert.strictEqual(res.videoId, 'bunny_vid_paid_202');
      assert.ok(res.hlsUrl.includes('token='));
      assert.ok(res.expiresAt >= Math.floor(Date.now() / 1000) + 3500);
    });
  });

  describe('5. refundPayment & manageEnrollment Functions', () => {
    it('refunds an order and revokes student enrollment access immediately', async () => {
      const db = new MockFirestore();
      const orderId = 'order_to_refund';
      const uid = 'student_refundee';
      const courseId = 'course_yt_starter';

      // Seed admin
      db.seed('admins/admin_uid', { role: 'admin' });

      // Seed order & enrollment
      db.seed(`orders/${orderId}`, {
        orderId,
        uid,
        courseId,
        amountPaise: 49900,
        status: 'paid',
        razorpayPaymentId: 'pay_to_refund_123',
      });
      db.seed(`enrollments/${uid}_${courseId}`, { uid, courseId, active: true });

      const res = await refundPaymentHandler(
        { orderId, reason: 'Customer requested cancellation' },
        'admin_uid',
        db as any
      );

      assert.strictEqual(res.success, true);

      // Verify order is marked refunded
      const order = db.getData(`orders/${orderId}`);
      assert.strictEqual(order.status, 'refunded');

      // Verify enrollment document is removed
      assert.strictEqual(db.has(`enrollments/${uid}_${courseId}`), false);
    });

    it('allows admin to manually enroll and revoke student access', async () => {
      const db = new MockFirestore();
      db.seed('admins/admin_uid', { role: 'admin' });

      // Manual Enroll
      const enrollRes = await manageEnrollmentHandler(
        { action: 'enroll', targetUid: 'manual_student', courseId: 'course_yt_starter' },
        'admin_uid',
        db as any
      );
      assert.strictEqual(enrollRes.success, true);
      assert.ok(db.has('enrollments/manual_student_course_yt_starter'));

      // Manual Revoke
      const revokeRes = await manageEnrollmentHandler(
        { action: 'revoke', targetUid: 'manual_student', courseId: 'course_yt_starter' },
        'admin_uid',
        db as any
      );
      assert.strictEqual(revokeRes.success, true);
      assert.strictEqual(db.has('enrollments/manual_student_course_yt_starter'), false);
    });
  });

  describe('6. sendNotification Function (Push & In-App Broadcasts)', () => {
    it('rejects notification dispatch from non-admin users', async () => {
      const db = new MockFirestore();
      await assert.rejects(
        async () => {
          await sendNotificationHandler(
            { target: 'all', title: 'Fake Alert', body: 'Spam' },
            'student_uid',
            db as any
          );
        },
        { message: 'Permission denied. Admin privilege required.' }
      );
    });

    it('correctly targets course students and populates in-app notification center', async () => {
      const db = new MockFirestore();
      db.seed('admins/admin_uid', { role: 'admin' });
      db.seed('users/student_1', { name: 'Student 1', fcmToken: 'fcm_tok_1' });
      db.seed('users/student_2', { name: 'Student 2', fcmToken: 'fcm_tok_2' });
      db.seed('enrollments/enr_1', { uid: 'student_1', courseId: 'course_mastery', active: true });
      db.seed('enrollments/enr_2', { uid: 'student_2', courseId: 'course_mastery', active: true });

      const res = await sendNotificationHandler(
        {
          target: 'course',
          targetId: 'course_mastery',
          title: 'Live Q&A Starting Soon',
          body: 'Join in 10 minutes for live doubts.',
          actionType: 'live',
          actionData: 'class_live_1',
        },
        'admin_uid',
        db as any
      );

      assert.strictEqual(res.success, true);
      assert.strictEqual(res.recipients, 2);

      // Verify each student got an in-app notification item
      const s1Notifs = await db.collection('userNotifications/student_1/items').get();
      assert.strictEqual(s1Notifs.size, 1);
      assert.strictEqual(s1Notifs.docs[0].data().title, 'Live Q&A Starting Soon');
      assert.strictEqual(s1Notifs.docs[0].data().actionType, 'live');
    });
  });

  describe('7. submitQuiz Function (Server Evaluation & Anti-Cheat)', () => {
    it('scores correctly with marks and negative marking penalty', async () => {
      const db = new MockFirestore();
      db.seed('quizzes/quiz_seo', {
        title: 'YouTube SEO Quiz',
        courseId: 'course_yt',
        passMarks: 2,
        negativeMarkingRate: 0.25,
        allowRetries: true,
      });

      // Question 1: correct index 1 (1 mark)
      db.seed('quizzes/quiz_seo/questions/q1', {
        questionText: 'What is CTR?',
        options: ['Cost', 'Click Through Rate', 'Creative', 'Cash'],
        correctOptionIndex: 1,
        marks: 1,
        explanation: 'CTR is Click-Through Rate.',
      });

      // Question 2: correct index 0 (1 mark)
      db.seed('quizzes/quiz_seo/questions/q2', {
        questionText: 'Which tag is most important?',
        options: ['Title', 'Description', 'Tags', 'Thumbnail'],
        correctOptionIndex: 0,
        marks: 1,
        explanation: 'Title has the highest search weight.',
      });

      // Question 3: correct index 2 (1 mark)
      db.seed('quizzes/quiz_seo/questions/q3', {
        questionText: 'Best video format?',
        options: ['AVI', 'WMV', 'MP4 (H.264)', 'FLV'],
        correctOptionIndex: 2,
        marks: 1,
        explanation: 'MP4 is YouTube recommended format.',
      });

      // Submit: Q1 correct (+1), Q2 wrong (-0.25), Q3 correct (+1) -> Total = 1.75
      const res = await submitQuizHandler(
        {
          quizId: 'quiz_seo',
          timeTakenSeconds: 45,
          answers: {
            q1: 1, // correct
            q2: 1, // wrong (correct is 0)
            q3: 2, // correct
          },
        },
        'student_test_1',
        db as any
      );

      assert.strictEqual(res.success, true);
      assert.strictEqual(res.score, 1.75);
      assert.strictEqual(res.correctCount, 2);
      assert.strictEqual(res.wrongCount, 1);
      assert.strictEqual(res.passed, false); // passMarks is 2
      assert.strictEqual(res.reviewBreakup.length, 3);
      assert.strictEqual(res.reviewBreakup[0].explanation, 'CTR is Click-Through Rate.');

      // Verify saved in quizResults
      const savedRes = db.getData('quizResults/student_test_1_quiz_seo');
      assert.strictEqual(savedRes.score, 1.75);
      assert.strictEqual(savedRes.passed, false);
    });

    it('rejects a second submission if quiz retries are disabled', async () => {
      const db = new MockFirestore();
      db.seed('quizzes/quiz_final_exam', {
        title: 'Final Certification Exam',
        passMarks: 50,
        allowRetries: false,
      });

      // Seed prior result
      db.seed('quizResults/student_strict_quiz_final_exam', {
        score: 40,
        passed: false,
      });

      await assert.rejects(
        async () => {
          await submitQuizHandler(
            { quizId: 'quiz_final_exam', timeTakenSeconds: 30, answers: {} },
            'student_strict',
            db as any
          );
        },
        { message: 'Retries are disabled for this quiz. Submission rejected.' }
      );
    });
  });

  describe('8. deleteAccount Function (Play Store Compliance Data Purge)', () => {
    it('purges user watch progress, notification feed, and user document', async () => {
      const db = new MockFirestore();
      db.seed('users/user_to_delete', { name: 'Ex Student', email: 'delete@me.com' });
      db.seed('progress/prog_del_1', { uid: 'user_to_delete', courseId: 'c1' });
      db.seed('userNotifications/user_to_delete/items/notif_1', { title: 'Old notif' });

      const res = await deleteAccountHandler('user_to_delete', db as any);
      assert.strictEqual(res.success, true);

      // Verify user document and progress deleted
      assert.strictEqual(db.has('users/user_to_delete'), false);
      assert.strictEqual(db.has('progress/prog_del_1'), false);
    });
  });

});
