import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  ArrowLeft,
  ShieldCheck,
  Tag,
  CheckCircle2,
  AlertCircle,
  X,
  Lock,
  Sparkles,
  WifiOff,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../src/theme';
import { clientConfig } from '../../src/config/client.config';
import { useAuthStore } from '../../src/store/useAuthStore';
import { Card } from '../../src/components/common/Card';
import { Button } from '../../src/components/common/Button';
import { Badge } from '../../src/components/common/Badge';
import { Screen } from '../../src/components/common/Screen';
import { getCourseById, Course } from '../../src/services/courseService';
import {
  createOrder,
  verifyPayment,
  launchYouPICheckout,
  launchRazorpayCheckout,
  validateCoupon,
  CouponValidationResult,
} from '../../src/services/paymentService';

export default function CheckoutScreen() {
  const { courseId } = useLocalSearchParams<{ courseId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, typography, spacing } = useTheme();
  const profile = useAuthStore((state) => state.profile);

  const [course, setCourse] = useState<Course | null>(null);
  const [loadingCourse, setLoadingCourse] = useState(true);

  // Coupon state
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<CouponValidationResult | null>(null);
  const [couponCode, setAppliedCode] = useState('');
  const [couponValidating, setCouponValidating] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);

  // Payment execution state
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState<string>('');
  const [isOffline] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      if (!courseId) return;
      setLoadingCourse(true);
      const data = await getCourseById(courseId);
      if (isMounted) {
        setCourse(data);
        setLoadingCourse(false);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, [courseId]);

  // Price calculations
  const originalPrice = course?.price || 0;
  const baseDiscountedPrice = course?.discountPrice || originalPrice;
  const courseDiscount = Math.max(0, originalPrice - baseDiscountedPrice);

  const couponDiscount = appliedCoupon?.discountAmount || 0;
  const finalPayable = Math.max(0, baseDiscountedPrice - couponDiscount);

  // Apply Coupon Handler
  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) return;
    setCouponValidating(true);
    setCouponError(null);

    const result = await validateCoupon(
      course?.id || '',
      couponInput,
      baseDiscountedPrice
    );

    setCouponValidating(false);
    if (result.valid) {
      setAppliedCoupon(result);
      setAppliedCode(couponInput.trim().toUpperCase());
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      setCouponError(result.error || 'Invalid coupon code');
      setAppliedCoupon(null);
      setAppliedCode('');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setAppliedCode('');
    setCouponInput('');
    setCouponError(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // Main Secure Pay Flow
  const handlePaySecurely = async () => {
    if (!course || isProcessing || isOffline) return;

    try {
      setIsProcessing(true);
      setProcessingStep('Creating secure order...');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // 1. Server calculates final price & generates YouPI Gateway Order
      const order = await createOrder(course.id, appliedCoupon ? couponCode : undefined);

      setProcessingStep('Opening YouPI UPI gateway...');

      // 2. Launch Direct YouPI UPI Checkout
      const checkoutOptions = {
        orderId: order.orderId,
        paymentId: order.paymentId,
        checkoutUrl: order.checkoutUrl,
        amount: order.finalPrice !== undefined ? order.finalPrice : order.amount / 100,
        currency: order.currency || 'INR',
        name: clientConfig.appName,
        description: `Enrollment: ${course.title}`,
        customer: {
          name: profile?.name || 'Student',
          phone: profile?.phone || '',
          email: `${profile?.uid || 'student'}@youtubesikho.com`,
        },
        upiVpa: clientConfig.merchantUpiVpa,
        theme: {
          color: colors.primary,
        },
      };

      const youpiResponse = await launchYouPICheckout(checkoutOptions);

      // 3. Cryptographic Signature Verification via Cloud Function
      setProcessingStep('Verifying UPI payment & unlocking course...');
      const verifyResult = await verifyPayment({
        orderId: order.orderId,
        paymentId: youpiResponse.paymentId,
        signature: youpiResponse.signature,
        utr: youpiResponse.utr,
        razorpayPaymentId: youpiResponse.paymentId,
        razorpaySignature: youpiResponse.signature,
      });

      if (verifyResult.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace({
          pathname: '/payment/success',
          params: {
            orderId: order.orderId,
            courseId: course.id,
            courseTitle: course.title,
            amount: String(order.amount),
          },
        });
      } else {
        throw new Error(verifyResult.message || 'Signature verification failed.');
      }
    } catch (err: any) {
      console.error('[Checkout] Payment flow failed:', err);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      router.push({
        pathname: '/payment/failed',
        params: {
          courseId: course?.id || '',
          orderId: `err_${Date.now()}`,
          error: err?.message || 'Payment was cancelled or failed.',
        },
      });
    } finally {
      setIsProcessing(false);
      setProcessingStep('');
    }
  };

  if (loadingCourse) {
    return (
      <Screen>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[typography.body, { color: colors.textMuted, marginTop: spacing.md }]}>
            Loading course details...
          </Text>
        </View>
      </Screen>
    );
  }

  if (!course) {
    return (
      <Screen>
        <View style={styles.errorContainer}>
          <AlertCircle size={48} color={colors.error} strokeWidth={1.75} />
          <Text style={[typography.title, { color: colors.text, marginTop: spacing.md }]}>
            Course Not Found
          </Text>
          <Text style={[typography.body, { color: colors.textMuted, marginTop: spacing.xs, textAlign: 'center' }]}>
            The selected course could not be located or has been archived.
          </Text>
          <Button
            title="Browse Courses"
            variant="primary"
            onPress={() => router.back()}
            style={{ marginTop: spacing.lg }}
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      {/* 1. Header Bar */}
      <View
        style={[
          styles.headerBar,
          {
            paddingTop: insets.top + spacing.xs,
            paddingHorizontal: spacing.screen,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={[styles.backButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <ArrowLeft size={20} color={colors.text} strokeWidth={1.75} />
        </TouchableOpacity>
        <Text style={[typography.title, { color: colors.text, flex: 1, marginLeft: spacing.sm }]}>
          Checkout
        </Text>
        <View style={styles.secureHeaderBadge}>
          <Lock size={14} color={colors.success} strokeWidth={1.75} />
          <Text style={[typography.caption, { color: colors.success, marginLeft: 4, fontWeight: '600' }]}>
            Secure
          </Text>
        </View>
      </View>

      {/* Offline Alert */}
      {isOffline && (
        <View style={[styles.offlineBanner, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <WifiOff size={16} color={colors.error} strokeWidth={1.75} />
          <Text style={[typography.caption, { color: colors.error, marginLeft: 8, flex: 1 }]}>
            No internet connection. Payment is disabled until you are back online.
          </Text>
        </View>
      )}

      {/* Scrollable Content */}
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: spacing.screen }]}
        showsVerticalScrollIndicator={false}
      >
        {/* 2. Course Summary Card */}
        <Animated.View entering={FadeInDown.duration(400).delay(80)}>
          <Text style={[typography.caption, { color: colors.textMuted, marginBottom: spacing.xs, textTransform: 'uppercase' }]}>
            Selected Course
          </Text>
          <Card style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.courseHeaderRow}>
              <View style={[styles.courseIconBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Sparkles size={24} color={colors.primary} strokeWidth={1.75} />
              </View>
              <View style={{ flex: 1, marginLeft: spacing.sm }}>
                <Badge label={course.category} variant="primary" size="sm" />
                <Text
                  style={[typography.title, { color: colors.text, marginTop: 4 }]}
                  numberOfLines={2}
                >
                  {course.title}
                </Text>
              </View>
            </View>

            <View style={[styles.metaRow, { borderTopColor: colors.border, marginTop: spacing.md, paddingTop: spacing.sm }]}>
              <Text style={[typography.small, { color: colors.textMuted }]}>
                Instructor: <Text style={{ color: colors.text, fontWeight: '600' }}>{course.instructor}</Text>
              </Text>
              {course.duration && (
                <Text style={[typography.small, { color: colors.textMuted }]}>
                  {course.duration}
                </Text>
              )}
            </View>
          </Card>
        </Animated.View>

        {/* 3. Coupon Code Input Section */}
        <Animated.View entering={FadeInDown.duration(400).delay(140)} style={{ marginTop: spacing.lg }}>
          <Text style={[typography.caption, { color: colors.textMuted, marginBottom: spacing.xs, textTransform: 'uppercase' }]}>
            Have a Discount Coupon?
          </Text>

          {appliedCoupon ? (
            <View
              style={[
                styles.appliedCouponCard,
                { backgroundColor: colors.surface, borderColor: colors.success },
              ]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <CheckCircle2 size={20} color={colors.success} strokeWidth={1.75} />
                <View style={{ marginLeft: spacing.sm, flex: 1 }}>
                  <Text style={[typography.heading, { color: colors.success }]}>
                    {couponCode} APPLIED
                  </Text>
                  <Text style={[typography.caption, { color: colors.textMuted }]}>
                    {appliedCoupon.discountPercent}% OFF • You save ₹{appliedCoupon.discountAmount}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={handleRemoveCoupon}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel="Remove coupon"
                style={[styles.removeCouponBtn, { borderColor: colors.border }]}
              >
                <X size={16} color={colors.textMuted} strokeWidth={1.75} />
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              <View style={[styles.couponInputWrapper, { backgroundColor: colors.surface, borderColor: couponError ? colors.error : colors.border }]}>
                <Tag size={18} color={colors.textMuted} strokeWidth={1.75} style={{ marginLeft: 12 }} />
                <TextInput
                  value={couponInput}
                  onChangeText={(text) => {
                    setCouponInput(text);
                    if (couponError) setCouponError(null);
                  }}
                  placeholder="Enter coupon (e.g. SIKHO50)"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  style={[
                    styles.couponTextInput,
                    { color: colors.text },
                    typography.body,
                  ]}
                />
                <TouchableOpacity
                  onPress={handleApplyCoupon}
                  disabled={couponValidating || !couponInput.trim()}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel="Apply coupon code"
                  style={[
                    styles.applyBtn,
                    {
                      backgroundColor: couponInput.trim() ? colors.primary : colors.background,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  {couponValidating ? (
                    <ActivityIndicator size="small" color={colors.surface} />
                  ) : (
                    <Text
                      style={[
                        typography.small,
                        { color: couponInput.trim() ? colors.surface : colors.textMuted, fontWeight: '700' },
                      ]}
                    >
                      Apply
                    </Text>
                  )}
                </TouchableOpacity>
              </View>

              {couponError && (
                <View style={styles.errorCaptionRow}>
                  <AlertCircle size={14} color={colors.error} strokeWidth={1.75} />
                  <Text style={[typography.caption, { color: colors.error, marginLeft: 6 }]}>
                    {couponError}
                  </Text>
                </View>
              )}

              {/* Coupon suggestion helper */}
              <TouchableOpacity
                onPress={() => {
                  setCouponInput('SIKHO50');
                  setCouponError(null);
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={styles.suggestionRow}
              >
                <Sparkles size={13} color={colors.accent} strokeWidth={1.75} />
                <Text style={[typography.caption, { color: colors.accent, marginLeft: 4 }]}>
                  Try promo code <Text style={{ fontWeight: '700' }}>SIKHO50</Text> for 50% discount
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>

        {/* 4. Price Breakdown Card */}
        <Animated.View entering={FadeInDown.duration(400).delay(200)} style={{ marginTop: spacing.lg }}>
          <Text style={[typography.caption, { color: colors.textMuted, marginBottom: spacing.xs, textTransform: 'uppercase' }]}>
            Price Breakdown
          </Text>
          <Card style={[styles.breakdownCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.breakdownRow}>
              <Text style={[typography.body, { color: colors.textMuted }]}>Original Price</Text>
              <Text
                style={[
                  typography.body,
                  typography.tabular,
                  courseDiscount > 0
                    ? [styles.strikeThrough, { color: colors.textMuted }]
                    : { color: colors.text },
                ]}
              >
                ₹{originalPrice.toLocaleString('en-IN')}
              </Text>
            </View>

            {courseDiscount > 0 && (
              <View style={styles.breakdownRow}>
                <Text style={[typography.body, { color: colors.textMuted }]}>Course Discount</Text>
                <Text style={[typography.body, typography.tabular, { color: colors.success, fontWeight: '600' }]}>
                  -₹{courseDiscount.toLocaleString('en-IN')}
                </Text>
              </View>
            )}

            {couponDiscount > 0 && (
              <View style={styles.breakdownRow}>
                <Text style={[typography.body, { color: colors.textMuted }]}>
                  Coupon Discount ({appliedCoupon?.discountPercent}%)
                </Text>
                <Text style={[typography.body, typography.tabular, { color: colors.success, fontWeight: '600' }]}>
                  -₹{couponDiscount.toLocaleString('en-IN')}
                </Text>
              </View>
            )}

            <View style={[styles.totalDivider, { backgroundColor: colors.border }]} />

            <View style={styles.totalRow}>
              <View>
                <Text style={[typography.heading, { color: colors.text }]}>Total Amount</Text>
                <Text style={[typography.caption, { color: colors.textMuted }]}>Inclusive of all taxes</Text>
              </View>
              <Text style={[typography.display, typography.tabular, { color: colors.primary, fontWeight: '700' }]}>
                ₹{finalPayable.toLocaleString('en-IN')}
              </Text>
            </View>
          </Card>
        </Animated.View>

        {/* 5. Trust & Security Badge Pill */}
        <View style={[styles.trustPill, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <ShieldCheck size={16} color={colors.primary} strokeWidth={2} />
          <Text style={[typography.caption, { color: colors.textMuted, marginLeft: 8, fontWeight: '600' }]}>
            100% Secure Checkout • Instant Course Access
          </Text>
        </View>
      </ScrollView>

      {/* 6. Sticky Bottom Thumb Zone */}
      <View
        style={[
          styles.stickyBottomBar,
          {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            paddingBottom: insets.bottom + spacing.sm,
            paddingHorizontal: spacing.screen,
          },
        ]}
      >
        <View style={styles.stickyPriceColumn}>
          <Text style={[typography.caption, { color: colors.textMuted }]}>Payable Now</Text>
          <Text style={[typography.heading, typography.tabular, { color: colors.text, fontWeight: '700' }]}>
            ₹{finalPayable.toLocaleString('en-IN')}
          </Text>
        </View>

        <View style={{ flex: 1, marginLeft: spacing.md }}>
          <Button
            title={isProcessing ? processingStep || 'Processing...' : 'Pay Securely'}
            variant="primary"
            loading={isProcessing}
            disabled={isProcessing || isOffline}
            onPress={handlePaySecurely}
            accessibilityRole="button"
            accessibilityLabel="Pay securely with Direct UPI"
            style={styles.payButton}
          />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 48,
    height: 48,
    minHeight: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secureHeaderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  scrollContent: {
    paddingTop: 16,
    paddingBottom: 120,
  },
  summaryCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  courseHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  courseIconBox: {
    width: 52,
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
  },
  appliedCouponCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  removeCouponBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  couponInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
  },
  couponTextInput: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 12,
    fontWeight: '600',
  },
  applyBtn: {
    height: 40,
    minHeight: 40,
    paddingHorizontal: 16,
    marginRight: 6,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorCaptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    paddingHorizontal: 4,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 4,
  },
  breakdownCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 6,
  },
  strikeThrough: {
    textDecorationLine: 'line-through',
  },
  totalDivider: {
    height: 1,
    marginVertical: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  trustPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  stickyBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
  },
  stickyPriceColumn: {
    justifyContent: 'center',
  },
  payButton: {
    height: 52,
    minHeight: 48,
  },
});
