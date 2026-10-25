import * as admin from 'firebase-admin';
import { getSecrets } from '../config';

export interface CreateOrderRequest {
  courseId: string;
  couponCode?: string;
  // Intentionally accept a spoofed client price to prove the server ignores it
  clientSubmittedPrice?: number;
}

export interface CreateOrderResponse {
  orderId: string;
  paymentId?: string;
  checkoutUrl?: string;
  amount: number; // in paise (e.g. 49900)
  currency: string;
  keyId: string;
  courseTitle: string;
  finalPrice: number; // in rupees (e.g. 499)
  discountAmount: number;
  razorpayOrderId?: string; // backward compatibility
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

  // 4. Official Razorpay Order Generation
  const secrets = getSecrets();
  let generatedOrderId = `order_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

  if (secrets.RAZORPAY_KEY_ID && secrets.RAZORPAY_KEY_SECRET) {
    try {
      const Razorpay = require('razorpay');
      const rzp = new Razorpay({
        key_id: secrets.RAZORPAY_KEY_ID,
        key_secret: secrets.RAZORPAY_KEY_SECRET,
      });
      const rzpOrder = await rzp.orders.create({
        amount: amountPaise,
        currency: 'INR',
        receipt: `rcpt_${Date.now()}`,
        notes: {
          uid,
          courseId,
          couponCode: normalizedCouponCode || '',
        },
      });
      if (rzpOrder && rzpOrder.id) {
        generatedOrderId = rzpOrder.id;
      }
    } catch (rzpErr: any) {
      console.warn('Razorpay order creation fallback/mock:', rzpErr.message);
    }
  }

  // 5. Store Order Document in Firestore with status 'created'
  const orderDocData = {
    orderId: generatedOrderId,
    razorpayOrderId: generatedOrderId,
    uid,
    courseId,
    courseTitle: courseData.title || 'Course Enrollment',
    serverPrice,
    finalPrice,
    amountPaise,
    couponCode: normalizedCouponCode,
    discountAmount,
    status: 'created',
    gateway: 'razorpay',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  await db.doc(`orders/${generatedOrderId}`).set(orderDocData);

  return {
    orderId: generatedOrderId,
    razorpayOrderId: generatedOrderId,
    amount: amountPaise,
    currency: 'INR',
    keyId: secrets.RAZORPAY_KEY_ID,
    courseTitle: courseData.title || 'Course Enrollment',
    finalPrice,
    discountAmount,
  };
}
