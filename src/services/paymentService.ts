import {
  firebaseFunctions,
  httpsCallable,
} from './firebase';
import { clientConfig } from '../config/client.config';

export interface CreateOrderResult {
  orderId: string;
  razorpayOrderId?: string;
  amount: number; // in paise (e.g. 49900)
  amountPaise?: number;
  finalPrice?: number; // in rupees (e.g. 499)
  currency: string;
  keyId: string;
  courseTitle: string;
  discountAmount?: number;
  discountPaise?: number;
}

export interface VerifyPaymentResult {
  success: boolean;
  enrollmentId?: string;
  message?: string;
  alreadyProcessed?: boolean;
}

export interface CouponValidationResult {
  valid: boolean;
  discountPercent?: number;
  discountAmount?: number; // in rupees
  finalPrice?: number; // in rupees
  discountAmountPaise?: number; // in paise
  finalPricePaise?: number; // in paise
  message?: string;
  error?: string;
}

export interface RazorpayCheckoutOptions {
  keyId: string;
  orderId: string;
  amount: number; // in paise
  name: string;
  description: string;
  image?: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  themeColor?: string;
}

export interface RazorpaySuccessResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

/**
 * Validate a coupon code via Cloud Function (protecting business logic)
 */
export async function validateCoupon(
  courseId: string,
  couponCode: string,
  _coursePrice?: number
): Promise<CouponValidationResult> {
  const code = couponCode.trim().toUpperCase();
  if (!code) {
    return { valid: false, error: 'Please enter a coupon code' };
  }

  try {
    const validateCouponFn = httpsCallable<
      { courseId: string; code: string },
      { valid: boolean; discountAmountPaise: number; finalPricePaise: number; message: string }
    >(firebaseFunctions, 'validateCoupon');

    const result = await validateCouponFn({ courseId, code });
    const data = result.data;
    return {
      valid: data.valid,
      discountAmount: (data.discountAmountPaise || 0) / 100,
      finalPrice: (data.finalPricePaise || 0) / 100,
      discountAmountPaise: data.discountAmountPaise,
      finalPricePaise: data.finalPricePaise,
      message: data.message,
      error: data.valid ? undefined : data.message,
    };
  } catch (err: any) {
    return {
      valid: false,
      error: err?.message || 'Unable to validate coupon code.',
    };
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
  const payload = {
    orderId: params.orderId,
    razorpayPaymentId: params.razorpayPaymentId,
    razorpaySignature: params.razorpaySignature,
  };

  try {
    const verifyPaymentCallable = httpsCallable<typeof payload, VerifyPaymentResult>(
      firebaseFunctions,
      'verifyPayment'
    );

    const result = await verifyPaymentCallable(payload);
    return result.data;
  } catch (err: any) {
    console.error('[paymentService] Cloud Function verifyPayment error:', err);
    throw new Error(err?.message || 'Payment verification failed on server.');
  }
}

/**
 * 3. Launch Real Native Razorpay Checkout
 */
export async function launchRazorpayCheckout(
  options: RazorpayCheckoutOptions
): Promise<RazorpaySuccessResponse> {
  let Razorpay: any = null;
  try {
    Razorpay = require('react-native-razorpay').default || require('react-native-razorpay');
  } catch {
    console.warn('react-native-razorpay native module is not available in Expo Go.');
  }

  if (!Razorpay || typeof Razorpay.open !== 'function') {
    throw new Error(
      'Native Razorpay checkout requires an EAS development build (eas build --profile development). It cannot run inside standard Expo Go.'
    );
  }

  const rzpOptions = {
    key: options.keyId,
    amount: options.amount,
    currency: 'INR',
    name: options.name,
    description: options.description,
    image: options.image || clientConfig.logoUrl,
    order_id: options.orderId,
    prefill: {
      name: options.prefill?.name || '',
      email: options.prefill?.email || '',
      contact: options.prefill?.contact || '',
    },
    theme: {
      color: options.themeColor || clientConfig.colors.primary,
    },
  };

  return new Promise((resolve, reject) => {
    Razorpay.open(rzpOptions)
      .then((data: RazorpaySuccessResponse) => resolve(data))
      .catch((error: any) => {
        reject(new Error(error?.description || error?.message || 'Payment cancelled or failed.'));
      });
  });
}
