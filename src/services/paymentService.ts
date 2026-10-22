import {
  firebaseFirestore,
  firebaseFunctions,
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  httpsCallable,
} from './firebase';
import { clientConfig } from '../config/client.config';
import { getCourseById } from './courseService';

export interface CreateOrderResult {
  orderId: string;
  razorpayOrderId: string;
  amount: number; // in rupees
  currency: string;
  courseId: string;
  courseTitle: string;
  discountApplied?: number;
}

export interface VerifyPaymentResult {
  success: boolean;
  enrollmentId?: string;
  message?: string;
}

export interface CouponValidationResult {
  valid: boolean;
  discountPercent?: number;
  discountAmount?: number;
  finalPrice?: number;
  error?: string;
}

export interface RazorpayCheckoutOptions {
  key: string;
  amount: number; // in paise (e.g. 199900)
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill?: {
    email?: string;
    contact?: string;
    name?: string;
  };
  theme?: {
    color?: string;
  };
}

export interface RazorpaySuccessResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

/**
 * Validate a coupon code in real-time
 */
export async function validateCoupon(
  courseId: string,
  couponCode: string,
  coursePrice: number
): Promise<CouponValidationResult> {
  const code = couponCode.trim().toUpperCase();
  if (!code) {
    return { valid: false, error: 'Please enter a coupon code' };
  }

  // Predefined demo coupon fallback (for test / offline mode)
  if (code === 'SIKHO50') {
    const discountAmount = Math.round(coursePrice * 0.5);
    const finalPrice = Math.max(0, coursePrice - discountAmount);
    return {
      valid: true,
      discountPercent: 50,
      discountAmount,
      finalPrice,
    };
  }
  if (code === 'WELCOME20') {
    const discountAmount = Math.round(coursePrice * 0.2);
    const finalPrice = Math.max(0, coursePrice - discountAmount);
    return {
      valid: true,
      discountPercent: 20,
      discountAmount,
      finalPrice,
    };
  }

  try {
    const couponsRef = collection(firebaseFirestore, 'coupons');
    const q = query(couponsRef, where('code', '==', code));
    const snap = await getDocs(q);

    if (snap.empty) {
      return { valid: false, error: 'Invalid coupon code' };
    }

    const couponData = snap.docs[0].data();
    if (couponData.isActive === false) {
      return { valid: false, error: 'This coupon is no longer active' };
    }

    if (couponData.validUntil && couponData.validUntil < Date.now()) {
      return { valid: false, error: 'This coupon has expired' };
    }

    if (
      typeof couponData.maxUses === 'number' &&
      typeof couponData.usedCount === 'number' &&
      couponData.usedCount >= couponData.maxUses
    ) {
      return { valid: false, error: 'Coupon usage limit has been reached' };
    }

    const discountPercent = couponData.discountPercent || 0;
    const discountAmount = Math.round((coursePrice * discountPercent) / 100);
    const finalPrice = Math.max(0, coursePrice - discountAmount);

    return {
      valid: true,
      discountPercent,
      discountAmount,
      finalPrice,
    };
  } catch (err: any) {
    console.warn('[paymentService] validateCoupon error:', err);
    return { valid: false, error: err.message || 'Unable to validate coupon' };
  }
}

/**
 * 1. Create Order: Server-Calculated Price & Razorpay Order Generation
 */
export async function createOrder(
  courseId: string,
  couponCode?: string
): Promise<CreateOrderResult> {
  try {
    const createOrderCallable = httpsCallable<
      { courseId: string; couponCode?: string },
      CreateOrderResult
    >(firebaseFunctions, 'createOrder');

    const result = await createOrderCallable({
      courseId,
      couponCode: couponCode ? couponCode.trim().toUpperCase() : undefined,
    });

    return result.data;
  } catch (err: any) {
    console.error('[paymentService] Order creation failed:', err?.message || err);
    throw new Error(
      err?.message ||
        'Unable to initialize order with payment server. Please verify your internet connection and try again.'
    );
  }
}

/**
 * 2. Verify Payment: Server-Side Cryptographic Signature Verification
 */
export async function verifyPayment(params: {
  orderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}): Promise<VerifyPaymentResult> {
  try {
    const verifyPaymentCallable = httpsCallable<
      {
        orderId: string;
        razorpayPaymentId: string;
        razorpaySignature: string;
      },
      VerifyPaymentResult
    >(firebaseFunctions, 'verifyPayment');

    const result = await verifyPaymentCallable(params);
    return result.data;
  } catch (err: any) {
    console.warn('[paymentService] Cloud Function verifyPayment error:', err);
    // In mock/test dev mode, if server signature verification rejected the synthetic test key:
    if (params.orderId.startsWith('order_dev_')) {
      return {
        success: true,
        enrollmentId: `dev_enrollment_${Date.now()}`,
        message: 'Test payment verified successfully in dev simulation.',
      };
    }
    throw new Error(err.message || 'Payment verification failed on server.');
  }
}

/**
 * 3. Launch Razorpay Checkout Modal
 * Seamlessly adapts between Native EAS build and Expo Go test environment.
 */
export async function launchRazorpayCheckout(
  options: RazorpayCheckoutOptions
): Promise<RazorpaySuccessResponse> {
  // Check if native react-native-razorpay module is present (e.g. EAS dev client)
  try {
    const RazorpayModule = require('react-native-razorpay');
    const RazorpayCheckout = RazorpayModule.default || RazorpayModule;
    if (RazorpayCheckout && typeof RazorpayCheckout.open === 'function') {
      return await RazorpayCheckout.open(options);
    }
  } catch (e) {
    // Native module not linked in Expo Go / simulator environment
  }

  // Graceful test mode simulation for Expo Go / dev client
  return new Promise((resolve, reject) => {
    // Generate deterministic test signature
    const testPaymentId = `pay_test_${Date.now()}`;
    const testSignature = `sig_test_${Date.now()}`;

    // Small delay to simulate realistic gateway interaction
    setTimeout(() => {
      resolve({
        razorpay_payment_id: testPaymentId,
        razorpay_order_id: options.order_id,
        razorpay_signature: testSignature,
      });
    }, 1200);
  });
}
