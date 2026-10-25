import * as admin from 'firebase-admin';
import { HttpsError } from 'firebase-functions/v2/https';
import { getRazorpayClient, getRazorpaySecrets } from '../config';
import { evaluateCoupon } from './validateCoupon';

export interface CreateOrderRequest {
  courseId: string;
  couponCode?: string;
  // Intentionally accept a client-submitted price to demonstrate that server ignores it
  clientSubmittedPrice?: number;
}

export interface CreateOrderResponse {
  orderId: string;
  razorpayOrderId: string;
  amountPaise: number;
  amount?: number; // alias in paise
  finalPrice?: number; // in rupees
  currency: string;
  keyId: string;
  courseTitle: string;
  discountPaise: number;
  discountAmount?: number; // in rupees
}

export async function createOrderHandler(
  data: CreateOrderRequest,
  uid: string | null,
  db: admin.firestore.Firestore = admin.firestore()
): Promise<CreateOrderResponse> {
  if (!uid) {
    throw new HttpsError('unauthenticated', 'Authentication required to create a course purchase order.');
  }

  const { courseId, couponCode } = data || {};
  if (!courseId) {
    throw new HttpsError('invalid-argument', 'Missing required argument: courseId.');
  }

  // 1. Rate Limiting Check (Max 5 order creations per minute per user)
  const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
  const recentOrders = await db
    .collection('orders')
    .where('uid', '==', uid)
    .where('createdAt', '>=', oneMinuteAgo)
    .get();

  if (recentOrders.size >= 5) {
    throw new HttpsError(
      'resource-exhausted',
      'Rate limit exceeded: Too many order attempts. Please wait 1 minute before trying again.'
    );
  }

  // 2. Fetch Course Data directly from Server (NEVER trust client price)
  const courseDoc = await db.doc(`courses/${courseId}`).get();
  if (!courseDoc.exists) {
    throw new HttpsError('not-found', `Course with ID ${courseId} does not exist.`);
  }

  const courseData = courseDoc.data() || {};
  if (courseData.isPublished === false) {
    throw new HttpsError('failed-precondition', 'Course is not currently available for purchase.');
  }

  const basePriceInRupees =
    courseData.discountPrice !== undefined && courseData.discountPrice !== null
      ? Number(courseData.discountPrice)
      : Number(courseData.price || 0);

  const basePricePaise = Math.round(basePriceInRupees * 100);

  // 3. Coupon Validation & Calculation (Unified server-side logic)
  let discountPaise = 0;
  let finalPaise = basePricePaise;
  let normalizedCouponCode: string | null = null;

  if (couponCode && couponCode.trim()) {
    const couponResult = await evaluateCoupon(courseId, couponCode, db);
    if (!couponResult.valid) {
      throw new HttpsError('invalid-argument', couponResult.message);
    }
    discountPaise = couponResult.discountAmountPaise;
    finalPaise = couponResult.finalPricePaise;
    normalizedCouponCode = couponResult.couponData?.code || couponCode.trim().toUpperCase();
  }

  // 4. Official Razorpay Order Generation (Real Gateway Call)
  const { keyId } = getRazorpaySecrets();
  const razorpay = getRazorpayClient();

  const receipt = `rcpt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  let rzpOrder: any;

  try {
    rzpOrder = await razorpay.orders.create({
      amount: finalPaise,
      currency: 'INR',
      receipt,
      notes: {
        uid,
        courseId,
        couponCode: normalizedCouponCode || '',
      },
    });
  } catch (err: any) {
    console.error('Razorpay order creation failed:', err);
    throw new HttpsError(
      'internal',
      `Payment gateway error: ${err.message || 'Unable to create Razorpay order.'}`
    );
  }

  if (!rzpOrder || !rzpOrder.id) {
    throw new HttpsError('internal', 'Razorpay failed to return an order ID.');
  }

  const generatedOrderId = rzpOrder.id;

  // 5. Store Order Document in Firestore with status 'created'
  const orderDocData = {
    orderId: generatedOrderId,
    razorpayOrderId: generatedOrderId,
    uid,
    courseId,
    courseTitle: courseData.title || 'Course Enrollment',
    amountPaise: finalPaise,
    currency: 'INR',
    status: 'created',
    couponCode: normalizedCouponCode,
    discountPaise,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  await db.doc(`orders/${generatedOrderId}`).set(orderDocData);

  // Return server-authoritative response
  return {
    orderId: generatedOrderId,
    razorpayOrderId: generatedOrderId,
    amountPaise: finalPaise,
    amount: finalPaise,
    finalPrice: Math.round(finalPaise / 100),
    currency: 'INR',
    keyId,
    courseTitle: courseData.title || 'Course Enrollment',
    discountPaise,
    discountAmount: Math.round(discountPaise / 100),
  };
}
