import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  AlertTriangle,
  RefreshCw,
  MessageCircle,
  ArrowLeft,
  HelpCircle,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../src/theme';
import { clientConfig } from '../../src/config/client.config';
import { Button } from '../../src/components/common/Button';
import { Card } from '../../src/components/common/Card';
import { Screen } from '../../src/components/common/Screen';

export default function PaymentFailedScreen() {
  const params = useLocalSearchParams<{
    orderId?: string;
    courseId?: string;
    error?: string;
  }>();

  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, typography, spacing } = useTheme();

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  }, []);

  const handleTryAgain = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (params.courseId) {
      router.replace({
        pathname: '/checkout/[courseId]',
        params: { courseId: params.courseId },
      });
    } else {
      router.back();
    }
  };

  const handleContactWhatsApp = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const cleanPhone = (clientConfig.supportWhatsApp || '').replace(/[^0-9]/g, '');
    const message = encodeURIComponent(
      `Hello ${clientConfig.appName} Support, I experienced an issue during checkout for course ID ${params.courseId || 'unknown'}. Order ID: ${params.orderId || 'N/A'}. Could you please assist me?`
    );
    const url = `https://wa.me/${cleanPhone}?text=${message}`;
    Linking.openURL(url).catch((err) => {
      console.warn('Failed to open WhatsApp URL:', err);
    });
  };

  const handleBrowseCourses = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.replace('/(tabs)/courses');
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
        {/* 1. Polite Alert Icon */}
        <Animated.View entering={FadeInDown.duration(400).delay(100)} style={styles.iconContainer}>
          <View
            style={[
              styles.iconOuterRing,
              { backgroundColor: colors.surface, borderColor: colors.error },
            ]}
          >
            <View
              style={[
                styles.iconInnerCircle,
                { backgroundColor: colors.surface },
              ]}
            >
              <AlertTriangle size={38} color={colors.error} strokeWidth={2} />
            </View>
          </View>
        </Animated.View>

        {/* 2. Empathetic Messaging */}
        <Animated.View
          entering={FadeInDown.duration(400).delay(200)}
          style={styles.textCenterBlock}
        >
          <Text
            style={[
              typography.display,
              { color: colors.text, textAlign: 'center' },
            ]}
          >
            Payment Incomplete
          </Text>

          <Text
            style={[
              typography.body,
              { color: colors.textMuted, marginTop: spacing.xs, textAlign: 'center' },
            ]}
          >
            Your payment could not be processed at this moment.
          </Text>
        </Animated.View>

        {/* 3. Reassurance & Reason Card */}
        <Animated.View
          entering={FadeInDown.duration(400).delay(300)}
          style={{ width: '100%', marginTop: spacing.lg }}
        >
          <Card
            style={[
              styles.infoCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View style={styles.infoRow}>
              <HelpCircle size={18} color={colors.primary} strokeWidth={1.75} />
              <Text
                style={[
                  typography.small,
                  { color: colors.text, marginLeft: 8, fontWeight: '600', flex: 1 },
                ]}
              >
                Safe & Protected
              </Text>
            </View>
            <Text
              style={[
                typography.caption,
                { color: colors.textMuted, marginTop: 6, lineHeight: 18 },
              ]}
            >
              No amount has been collected. If your bank debited your account or UPI wallet, it is held by the banking network and will be auto-refunded to your source account within 48 hours.
            </Text>

            {params.error && (
              <View
                style={[
                  styles.errorNoteBox,
                  { backgroundColor: colors.background, borderColor: colors.border },
                ]}
              >
                <Text style={[typography.caption, { color: colors.error, fontStyle: 'italic' }]}>
                  Reason: {params.error}
                </Text>
              </View>
            )}
          </Card>
        </Animated.View>

        {/* 4. Action Buttons */}
        <Animated.View
          entering={FadeInDown.duration(400).delay(400)}
          style={[styles.buttonContainer, { marginTop: spacing.xl }]}
        >
          <Button
            title="Try Again"
            variant="primary"
            onPress={handleTryAgain}
            icon={<RefreshCw size={18} color={colors.surface} strokeWidth={2} />}
            accessibilityRole="button"
            accessibilityLabel="Retry payment"
            style={styles.mainCtaButton}
          />

          <TouchableOpacity
            onPress={handleContactWhatsApp}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Contact customer support on WhatsApp"
            style={[
              styles.secondaryButton,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <MessageCircle size={18} color={colors.text} strokeWidth={1.75} />
            <Text
              style={[
                typography.small,
                { color: colors.text, marginLeft: 8, fontWeight: '600' },
              ]}
            >
              Contact WhatsApp Support
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleBrowseCourses}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Return to course catalog"
            style={[
              styles.secondaryButton,
              { backgroundColor: colors.background, borderColor: colors.border },
            ]}
          >
            <ArrowLeft size={18} color={colors.textMuted} strokeWidth={1.75} />
            <Text
              style={[
                typography.small,
                { color: colors.textMuted, marginLeft: 8, fontWeight: '600' },
              ]}
            >
              Browse Other Courses
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
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  iconOuterRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconInnerCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCenterBlock: {
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  infoCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorNoteBox: {
    marginTop: 12,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'stretch',
  },
  mainCtaButton: {
    height: 52,
    minHeight: 48,
  },
  secondaryButton: {
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
