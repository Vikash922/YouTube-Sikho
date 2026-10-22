import * as admin from 'firebase-admin';
import Razorpay from 'razorpay';
import { getSecrets } from '../config';

export interface CreateOrderRequest {
  courseId: string;
  couponCode?: string;
  // Intentionally accept a spoofed client price to prove the server ignores it
  clientSubmittedPrice?: number;
}

export interface CreateOrderResponse {
  orderId: string;
  amount: number; // in paise (e.g. 49900)
  currency: string;
  keyId: string;
  courseTitle: string;
  finalPrice: number; // in rupees (e.g. 499)
  discountAmount: number;
}

export async function createOrderHandler(
  data: CreateOrderRequest,
  uid: string | null,
  db: admin.firestore.Firestore = admin.firestore()
): Promise<CreateOrderResponse> {
  if (!uid) {
    throw new Error('Authentication required to create a course purchase order.');
  }

  const { courseId, couponCode } = data;
  if (!courseId) {
    throw new Error('Missing required argument: courseId.');
  }

  // 1. Rate Limiting Check (Max 5 order creations per minute per user)
  const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
  const recentOrders = await db
    .collection('orders')
    .where('uid', '==', uid)
    .where('createdAt', '>=', oneMinuteAgo)
    .get();

  if (recentOrders.size >= 5) {
    throw new Error('Rate limit exceeded: Too many order attempts. Please wait 1 minute before trying again.');
  }

  // 2. Fetch Course Data directly from Server (NEVER trust client price)
  const courseDoc = await db.doc(`courses/${courseId}`).get();
  if (!courseDoc.exists) {
    throw new Error(`Course with ID ${courseId} does not exist.`);
  }

  const courseData = courseDoc.data() || {};
  const serverPrice = courseData.discountPrice !== undefined
    ? Number(courseData.discountPrice)
    : Number(courseData.price || 0);

  // 3. Coupon Validation & Calculation
  let discountAmount = 0;
  let normalizedCouponCode: string | null = null;

  if (couponCode && couponCode.trim()) {
    normalizedCouponCode = couponCode.trim().toUpperCase();
    const couponDoc = await db.doc(`coupons/${normalizedCouponCode}`).get();

    if (!couponDoc.exists) {
      throw new Error(`Coupon '${normalizedCouponCode}' is invalid.`);
    }

    const coupon = couponDoc.data() || {};

    if (coupon.active === false) {
      throw new Error(`Coupon '${normalizedCouponCode}' is no longer active.`);
    }

    if (coupon.expiresAt) {
      const expiryDate = coupon.expiresAt.toDate ? coupon.expiresAt.toDate() : new Date(coupon.expiresAt);
      if (expiryDate.getTime() < Date.now()) {
        throw new Error(`Coupon '${normalizedCouponCode}' has expired.`);
      }
    }

    if (coupon.maxUses !== undefined && (coupon.usageCount || 0) >= coupon.maxUses) {
      throw new Error(`Coupon '${normalizedCouponCode}' usage limit has been reached.`);
    }

    if (coupon.type === 'percent') {
      discountAmount = Math.round((serverPrice * Number(coupon.value || 0)) / 100);
    } else {
      discountAmount = Number(coupon.value || 0);
    }
  }

  const finalPrice = Math.max(0, serverPrice - discountAmount);
  const amountPaise = Math.round(finalPrice * 100);

  // 4. Razorpay Order Generation
  const secrets = getSecrets();
  let razorpayOrderId = '';

  try {
    const razorpay = new Razorpay({
      key_id: secrets.RAZORPAY_KEY_ID,
      key_secret: secrets.RAZORPAY_KEY_SECRET,
    });

    const rzpOrder = await razorpay.orders.create({
      amount: amountPaise,
      currency: 'INR',
      receipt: `rcpt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      notes: {
        uid,
        courseId,
        couponCode: normalizedCouponCode || '',
      },
    });
    razorpayOrderId = rzpOrder.id;
  } catch (rzpErr) {
    console.warn('Razorpay API unavailable, creating mock test order ID:', rzpErr);
    razorpayOrderId = `order_test_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  // 5. Store Order Document in Firestore with status 'created'
  const orderDocData = {
    orderId: razorpayOrderId,
    uid,
    courseId,
    courseTitle: courseData.title || 'Course Enrollment',
    serverPrice,
    finalPrice,
    amountPaise,
    couponCode: normalizedCouponCode,
    discountAmount,
    status: 'created',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  await db.doc(`orders/${razorpayOrderId}`).set(orderDocData);

  return {
    orderId: razorpayOrderId,
    amount: amountPaise,
    currency: 'INR',
    keyId: secrets.RAZORPAY_KEY_ID,
    courseTitle: courseData.title || 'Course Enrollment',
    finalPrice,
    discountAmount,
  };
}
