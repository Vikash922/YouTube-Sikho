import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  FadeInDown,
} from 'react-native-reanimated';
import {
  CheckCircle2,
  Sparkles,
  Home,
  ShieldCheck,
  BookOpen,
  AlertCircle,
  Headphones,
  RefreshCw,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../src/theme';
import { Button } from '../../src/components/common/Button';
import { Card } from '../../src/components/common/Card';
import { Screen } from '../../src/components/common/Screen';
import { useAuthStore } from '../../src/store/useAuthStore';
import { doc, onSnapshot, firebaseFirestore } from '../../src/services/firebase';

export default function PaymentSuccessScreen() {
  const params = useLocalSearchParams<{
    orderId?: string;
    courseId?: string;
    courseTitle?: string;
    amount?: string;
  }>();

  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, typography, spacing } = useTheme();
  const { user } = useAuthStore();

  const [isVerified, setIsVerified] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  // Celebration spring animation
  const scale = useSharedValue(0.3);
  const opacity = useSharedValue(0);

  // Listen to server enrollment document: enrollments/{uid}_{courseId}
  useEffect(() => {
    if (!user?.uid || !params.courseId) {
      setTimedOut(true);
      return;
    }

    const enrollmentId = `${user.uid}_${params.courseId}`;
    const enrollmentRef = doc(firebaseFirestore, 'enrollments', enrollmentId);

    const timer = setTimeout(() => {
      setTimedOut(true);
    }, 10000); // 10 second verification timeout

    const unsubscribe = onSnapshot(
      enrollmentRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data?.status === 'active') {
            clearTimeout(timer);
            setIsVerified(true);
            setTimedOut(false);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            scale.value = withSpring(1, { damping: 10, stiffness: 120 });
            opacity.value = withSpring(1);
          }
        }
      },
      (error) => {
        console.error('Enrollment verification listener error:', error);
      }
    );

    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, [user?.uid, params.courseId, retryKey, scale, opacity]);

  const animatedHeroStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const handleStartLearning = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (params.courseId) {
      router.replace({
        pathname: '/course/[id]',
        params: { id: params.courseId },
      });
    } else {
      router.replace('/(tabs)/learning');
    }
  };

  const handleGoHome = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.replace('/(tabs)');
  };

  const handleContactSupport = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/support');
  };

  // State 1: Awaiting server enrollment confirmation
  if (!isVerified && !timedOut) {
    return (
      <Screen>
        <View style={[styles.centeredContainer, { paddingHorizontal: spacing.screen }]}>
          <View style={[styles.loadingCircle, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
          <Text style={[typography.title, { color: colors.text, marginTop: spacing.lg, textAlign: 'center' }]}>
            Verifying Your Enrollment...
          </Text>
          <Text style={[typography.body, { color: colors.textMuted, marginTop: spacing.xs, textAlign: 'center' }]}>
            Confirming your payment with the gateway and provisioning your lifetime course access on the server.
          </Text>
        </View>
      </Screen>
    );
  }

  // State 2: 10-second timeout without verified server enrollment
  if (!isVerified && timedOut) {
    return (
      <Screen>
        <ScrollView
          contentContainerStyle={[
            styles.container,
            {
              paddingTop: insets.top + spacing.xl,
              paddingBottom: insets.bottom + spacing.xl,
              paddingHorizontal: spacing.screen,
            },
          ]}
        >
          <View style={[styles.loadingCircle, { backgroundColor: colors.surface, borderColor: colors.warning }]}>
            <AlertCircle size={44} color={colors.warning} />
          </View>
          <Text style={[typography.title, { color: colors.text, marginTop: spacing.lg, textAlign: 'center' }]}>
            Payment Processing
          </Text>
          <Text style={[typography.body, { color: colors.textMuted, marginTop: spacing.xs, textAlign: 'center' }]}>
            Your payment might still be confirming with the bank or webhook. If you were charged, your course access will activate automatically within moments.
          </Text>

          <View style={{ width: '100%', marginTop: spacing.xl, gap: spacing.md }}>
            <Button
              title="Check Status Again"
              variant="primary"
              onPress={() => {
                setTimedOut(false);
                setRetryKey((k) => k + 1);
              }}
              icon={<RefreshCw size={18} color={colors.surface} />}
            />
            <Button
              title="Contact Support"
              variant="secondary"
              onPress={handleContactSupport}
              icon={<Headphones size={18} color={colors.text} />}
            />
            <Button
              title="Go to Home"
              variant="ghost"
              onPress={handleGoHome}
              icon={<Home size={18} color={colors.textMuted} />}
            />
          </View>
        </ScrollView>
      </Screen>
    );
  }

  // State 3: Confirmed server enrollment
  return (
    <Screen>
      <ScrollView
        contentContainerStyle={[
          styles.container,
          {
            paddingTop: insets.top + spacing.xl,
            paddingBottom: insets.bottom + spacing.xl,
            paddingHorizontal: spacing.screen,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Hero Celebration Moment */}
        <Animated.View style={[styles.heroBadgeWrapper, animatedHeroStyle]}>
          <View
            style={[
              styles.iconOuterRing,
              { backgroundColor: colors.surface, borderColor: colors.success },
            ]}
          >
            <View
              style={[
                styles.iconInnerCircle,
                { backgroundColor: colors.success },
              ]}
            >
              <CheckCircle2 size={44} color={colors.surface} strokeWidth={2.2} />
            </View>
          </View>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.duration(400).delay(200)}
          style={styles.textCenterBlock}
        >
          <View style={styles.celebrationRow}>
            <Sparkles size={18} color={colors.accent} strokeWidth={2} />
            <Text
              style={[
                typography.caption,
                { color: colors.accent, marginLeft: 6, fontWeight: '700', textTransform: 'uppercase' },
              ]}
            >
              Enrollment Confirmed
            </Text>
          </View>

          <Text
            style={[
              typography.display,
              { color: colors.text, marginTop: spacing.xs, textAlign: 'center' },
            ]}
          >
            You&apos;re Enrolled!
          </Text>

          <Text
            style={[
              typography.body,
              { color: colors.textMuted, marginTop: spacing.xs, textAlign: 'center' },
            ]}
          >
            Congratulations! Your payment has been server-verified. You now have full lifetime access to all lessons, quizzes, and resources.
          </Text>
        </Animated.View>

        {/* 2. Order Receipt Card */}
        <Animated.View
          entering={FadeInDown.duration(400).delay(350)}
          style={{ width: '100%', marginTop: spacing.xl }}
        >
          <Card
            style={[
              styles.receiptCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View style={styles.receiptRow}>
              <Text style={[typography.caption, { color: colors.textMuted }]}>
                Course
              </Text>
              <Text
                style={[
                  typography.small,
                  { color: colors.text, fontWeight: '600', maxWidth: '65%', textAlign: 'right' },
                ]}
                numberOfLines={2}
              >
                {params.courseTitle || 'Course Enrollment'}
              </Text>
            </View>

            <View style={[styles.receiptDivider, { backgroundColor: colors.border }]} />

            <View style={styles.receiptRow}>
              <Text style={[typography.caption, { color: colors.textMuted }]}>
                Order ID
              </Text>
              <Text
                style={[
                  typography.small,
                  { color: colors.textMuted, fontFamily: 'monospace' },
                ]}
                numberOfLines={1}
              >
                {params.orderId || 'Verified'}
              </Text>
            </View>

            <View style={[styles.receiptDivider, { backgroundColor: colors.border }]} />

            <View style={styles.receiptRow}>
              <Text style={[typography.caption, { color: colors.textMuted }]}>
                Payment Status
              </Text>
              <View style={styles.statusBadge}>
                <ShieldCheck size={14} color={colors.success} strokeWidth={2} />
                <Text
                  style={[
                    typography.caption,
                    { color: colors.success, marginLeft: 4, fontWeight: '700' },
                  ]}
                >
                  Verified & Active
                </Text>
              </View>
            </View>
          </Card>
        </Animated.View>

        {/* 3. Action Buttons in Thumb Zone */}
        <Animated.View
          entering={FadeInDown.duration(400).delay(450)}
          style={[styles.buttonContainer, { marginTop: spacing.xl }]}
        >
          <Button
            title="Start Learning Now"
            variant="primary"
            onPress={handleStartLearning}
            icon={<BookOpen size={18} color={colors.surface} strokeWidth={2} />}
            accessibilityRole="button"
            accessibilityLabel="Start learning this course"
            style={styles.mainCtaButton}
          />

          <TouchableOpacity
            onPress={handleGoHome}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Go back to home screen"
            style={[
              styles.homeButton,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Home size={18} color={colors.text} strokeWidth={1.75} />
            <Text style={[typography.small, { color: colors.text, marginLeft: 8, fontWeight: '600' }]}>
              Go to Home
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  centeredContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBadgeWrapper: {
    marginBottom: 8,
  },
  iconOuterRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  iconInnerCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCenterBlock: {
    alignItems: 'center',
    marginTop: 16,
    paddingHorizontal: 12,
  },
  celebrationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  receiptCard: {
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  receiptDivider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 10,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  mainCtaButton: {
    width: '100%',
  },
  homeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
});
