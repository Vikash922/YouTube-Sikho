import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
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
  ArrowRight,
  Home,
  ShieldCheck,
  BookOpen,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../src/theme';
import { Button } from '../../src/components/common/Button';
import { Card } from '../../src/components/common/Card';
import { Screen } from '../../src/components/common/Screen';

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

  // Celebration spring animation
  const scale = useSharedValue(0.3);
  const opacity = useSharedValue(0);

  useEffect(() => {
    // Trigger success haptic burst
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    scale.value = withSpring(1, { damping: 10, stiffness: 120 });
    opacity.value = withSpring(1);
  }, [scale, opacity]);

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
            You're Enrolled!
          </Text>

          <Text
            style={[
              typography.body,
              { color: colors.textMuted, marginTop: spacing.xs, textAlign: 'center' },
            ]}
          >
            Congratulations! Your payment has been verified. You now have lifetime access to all course lessons, notes, and future updates.
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
                {params.courseTitle || 'YouTube Sikho Course'}
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
                {params.orderId || `ord_${Date.now().toString(36)}`}
              </Text>
            </View>

            <View style={[styles.receiptDivider, { backgroundColor: colors.border }]} />

            <View style={styles.receiptRow}>
              <Text style={[typography.caption, { color: colors.textMuted }]}>
                Amount Paid
              </Text>
              <Text style={[typography.heading, { color: colors.success }]}>
                ₹{params.amount || '1,999'}
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
                  Paid & Verified
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
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBadgeWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  iconOuterRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
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
    paddingHorizontal: 16,
  },
  celebrationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  receiptCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  receiptDivider: {
    height: 1,
    marginVertical: 10,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'stretch',
  },
  mainCtaButton: {
    height: 52,
    minHeight: 48,
  },
  homeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 12,
  },
});
