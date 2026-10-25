import * as admin from 'firebase-admin';
import { HttpsError } from 'firebase-functions/v2/https';

export interface CouponEvaluationResult {
  valid: boolean;
  message: string;
  discountAmountPaise: number;
  finalPricePaise: number;
  basePricePaise: number;
  courseTitle: string;
  couponData?: {
    code: string;
    discountType: 'percent' | 'flat';
    value: number;
    maxUses: number;
    usedCount: number;
  };
}

/**
 * Shared evaluation logic for coupons against a course
 */
export async function evaluateCoupon(
  courseId: string,
  rawCode: string,
  db: admin.firestore.Firestore = admin.firestore()
): Promise<CouponEvaluationResult> {
  const code = (rawCode || '').trim().toUpperCase();
  if (!code) {
    return {
      valid: false,
      message: 'Please provide a coupon code.',
      discountAmountPaise: 0,
      finalPricePaise: 0,
      basePricePaise: 0,
      courseTitle: '',
    };
  }

  // 1. Fetch Course
  const courseDoc = await db.doc(`courses/${courseId}`).get();
  if (!courseDoc.exists) {
    return {
      valid: false,
      message: 'Course not found.',
      discountAmountPaise: 0,
      finalPricePaise: 0,
      basePricePaise: 0,
      courseTitle: '',
    };
  }

  const courseData = courseDoc.data() || {};
  if (courseData.isPublished === false) {
    return {
      valid: false,
      message: 'Course is not currently available for enrollment.',
      discountAmountPaise: 0,
      finalPricePaise: 0,
      basePricePaise: 0,
      courseTitle: courseData.title || '',
    };
  }

  const basePriceInRupees =
    courseData.discountPrice !== undefined && courseData.discountPrice !== null
      ? Number(courseData.discountPrice)
      : Number(courseData.price || 0);

  const basePricePaise = Math.round(basePriceInRupees * 100);

  // 2. Fetch Coupon from coupons/{CODE}
  const couponDoc = await db.doc(`coupons/${code}`).get();
  if (!couponDoc.exists) {
    return {
      valid: false,
      message: `Coupon code '${code}' is invalid.`,
      discountAmountPaise: 0,
      finalPricePaise: basePricePaise,
      basePricePaise,
      courseTitle: courseData.title || '',
    };
  }

  const coupon = couponDoc.data() || {};

  // Check Active
  const isActive = coupon.isActive !== undefined ? coupon.isActive : coupon.active;
  if (isActive === false) {
    return {
      valid: false,
      message: `Coupon '${code}' is no longer active.`,
      discountAmountPaise: 0,
      finalPricePaise: basePricePaise,
      basePricePaise,
      courseTitle: courseData.title || '',
    };
  }

  // Check Expiry
  if (coupon.expiresAt) {
    const expiryDate =
      typeof coupon.expiresAt?.toDate === 'function'
        ? coupon.expiresAt.toDate()
        : new Date(coupon.expiresAt);

    if (expiryDate.getTime() < Date.now()) {
      return {
        valid: false,
        message: `Coupon '${code}' has expired.`,
        discountAmountPaise: 0,
        finalPricePaise: basePricePaise,
        basePricePaise,
        courseTitle: courseData.title || '',
      };
    }
  }

  // Check Usage Limits
  const maxUses = Number(coupon.maxUses || 0);
  const usedCount = Number(coupon.usedCount !== undefined ? coupon.usedCount : (coupon.usageCount || 0));
  if (maxUses > 0 && usedCount >= maxUses) {
    return {
      valid: false,
      message: `Coupon '${code}' has reached its maximum redemption limit.`,
      discountAmountPaise: 0,
      finalPricePaise: basePricePaise,
      basePricePaise,
      courseTitle: courseData.title || '',
    };
  }

  // Check Minimum Course Price
  if (coupon.minPrice && basePriceInRupees < Number(coupon.minPrice)) {
    return {
      valid: false,
      message: `Coupon requires a minimum course value of ₹${coupon.minPrice}.`,
      discountAmountPaise: 0,
      finalPricePaise: basePricePaise,
      basePricePaise,
      courseTitle: courseData.title || '',
    };
  }

  // Check Course Specificity
  if (Array.isArray(coupon.courseIds) && coupon.courseIds.length > 0) {
    if (!coupon.courseIds.includes(courseId)) {
      return {
        valid: false,
        message: `Coupon '${code}' is not applicable to this course.`,
        discountAmountPaise: 0,
        finalPricePaise: basePricePaise,
        basePricePaise,
        courseTitle: courseData.title || '',
      };
    }
  }

  // Compute Discount
  const discountType: 'percent' | 'flat' =
    coupon.discountType === 'flat' || coupon.type === 'flat' ? 'flat' : 'percent';
  const rawValue = Number(coupon.value !== undefined ? coupon.value : (coupon.discountPercent || 0));

  let discountAmountPaise = 0;
  if (discountType === 'percent') {
    discountAmountPaise = Math.round((basePricePaise * rawValue) / 100);
  } else {
    discountAmountPaise = Math.round(rawValue * 100);
  }

  // Cap discount at base price
  discountAmountPaise = Math.min(discountAmountPaise, basePricePaise);
  const finalPricePaise = Math.max(0, basePricePaise - discountAmountPaise);

  return {
    valid: true,
    message: 'Coupon applied successfully.',
    discountAmountPaise,
    finalPricePaise,
    basePricePaise,
    courseTitle: courseData.title || '',
    couponData: {
      code,
      discountType,
      value: rawValue,
      maxUses,
      usedCount,
    },
  };
}

export interface ValidateCouponRequest {
  courseId: string;
  code: string;
}

export interface ValidateCouponResponse {
  valid: boolean;
  discountAmountPaise: number;
  finalPricePaise: number;
  message: string;
}

/**
 * Callable handler for validateCoupon({ courseId, code })
 */
export async function validateCouponHandler(
  data: ValidateCouponRequest,
  uid: string | null,
  db: admin.firestore.Firestore = admin.firestore()
): Promise<ValidateCouponResponse> {
  if (!uid) {
    throw new HttpsError('unauthenticated', 'Authentication required to validate coupons.');
  }

  const { courseId, code } = data || {};
  if (!courseId || !code) {
    throw new HttpsError('invalid-argument', 'courseId and code are required.');
  }

  const result = await evaluateCoupon(courseId, code, db);
  return {
    valid: result.valid,
    discountAmountPaise: result.discountAmountPaise,
    finalPricePaise: result.finalPricePaise,
    message: result.message,
  };
}
