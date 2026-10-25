import { Platform } from 'react-native';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { firebaseFirestore, firebaseAuth } from './firebase';

export interface AnalyticsEventParams {
  [key: string]: string | number | boolean | undefined | null;
}

export type StandardAnalyticsEvent =
  | 'screen_view'
  | 'view_course'
  | 'begin_checkout'
  | 'apply_coupon'
  | 'purchase_success'
  | 'purchase_failed'
  | 'lesson_play'
  | 'quiz_complete'
  | 'share_course';

/**
 * FIREBASE ANALYTICS & PURCHASE FUNNEL SERVICE
 * -------------------------------------------------------------
 * Logs client events to Firestore 'analyticsEvents' collection and
 * console for purchase funnel drop-off analysis and engagement tracking.
 */
class AnalyticsService {
  private isEnabled: boolean = true;

  /**
   * Log any named event with custom metadata params
   */
  async logEvent(eventName: StandardAnalyticsEvent | string, params: AnalyticsEventParams = {}): Promise<void> {
    if (!this.isEnabled) return;

    try {
      const user = firebaseAuth.currentUser;
      const payload = {
        eventName,
        params,
        uid: user?.uid || 'anonymous',
        userEmail: user?.email || null,
        platform: Platform.OS,
        timestamp: serverTimestamp(),
        createdAt: new Date().toISOString(),
      };

      if (__DEV__) {
        console.log(`[Analytics Event] ${eventName}:`, JSON.stringify(params));
      }

      // Record to Firestore analytics collection (non-blocking)
      const eventsRef = collection(firebaseFirestore, 'analyticsEvents');
      await addDoc(eventsRef, payload);
    } catch (err: any) {
      // Analytics errors should NEVER crash or interrupt student user experience
      if (__DEV__) {
        console.warn(`[Analytics] Failed to record event ${eventName}:`, err.message);
      }
    }
  }

  /**
   * Track when a student views a specific screen
   */
  logScreenView(screenName: string, additionalParams: AnalyticsEventParams = {}): void {
    void this.logEvent('screen_view', { screenName, ...additionalParams });
  }

  /**
   * Funnel Step 1: Track when student opens a Course Details page
   */
  logViewCourse(courseId: string, courseTitle: string, price: number): void {
    void this.logEvent('view_course', {
      courseId,
      courseTitle,
      price,
    });
  }

  /**
   * Funnel Step 2: Track when student enters Checkout screen
   */
  logBeginCheckout(courseId: string, courseTitle: string, amount: number, couponCode?: string): void {
    void this.logEvent('begin_checkout', {
      courseId,
      courseTitle,
      amount,
      couponCode: couponCode || null,
    });
  }

  /**
   * Funnel Step 3: Track coupon applied at checkout
   */
  logApplyCoupon(courseId: string, couponCode: string, discountAmount: number, isSuccess: boolean): void {
    void this.logEvent('apply_coupon', {
      courseId,
      couponCode,
      discountAmount,
      isSuccess,
    });
  }

  /**
   * Funnel Step 4: Track confirmed successful purchase
   */
  logPurchaseSuccess(orderId: string, courseId: string, amount: number, paymentId: string): void {
    void this.logEvent('purchase_success', {
      orderId,
      courseId,
      amount,
      paymentId,
    });
  }

  /**
   * Funnel Step 4 (Failed): Track checkout / payment failure
   */
  logPurchaseFailed(courseId: string, reason: string): void {
    void this.logEvent('purchase_failed', {
      courseId,
      reason,
    });
  }

  /**
   * Track video lesson engagement
   */
  logLessonPlay(courseId: string, lessonId: string, lessonTitle?: string): void {
    void this.logEvent('lesson_play', {
      courseId,
      lessonId,
      lessonTitle: lessonTitle || null,
    });
  }
}

export const analytics = new AnalyticsService();
