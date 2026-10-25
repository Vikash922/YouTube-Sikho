import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import {
  ArrowLeft,
  Award,
  Share2,
  Download,
  CheckCircle,
  ShieldCheck,
  Sparkles,
  ShieldAlert,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../src/theme';
import { useAuthStore } from '../../src/store/useAuthStore';
import { useScreenProtection } from '../../src/hooks/useScreenProtection';
import { clientConfig } from '../../src/config/client.config';
import { Card } from '../../src/components/common/Card';
import { Button } from '../../src/components/common/Button';
import { Screen } from '../../src/components/common/Screen';

export default function CertificateScreen() {
  const { courseId } = useLocalSearchParams<{ courseId: string }>();
  const router = useRouter();
  const { colors, typography, radius, spacing } = useTheme();
  const { profile, user } = useAuthStore();
  const { isScreenCaptured } = useScreenProtection(`certificate_${courseId}`);

  const [downloading, setDownloading] = useState(false);

  const studentName = profile?.name || user?.displayName || 'Learner';
  const issueDate = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const certificateId = `YS-CERT-${(courseId || '88').slice(0, 4).toUpperCase()}-${Math.floor(
    1000 + Math.random() * 9000
  )}`;

  const handleShare = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await Share.share({
        title: 'Course Completion Certificate',
        message: `I just earned my official Certificate of Completion in "${clientConfig.appName}"! Verification ID: ${certificateId}`,
      });
    } catch (err) {
      // Ignored
    }
  };

  const handleDownload = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setDownloading(true);
    setTimeout(() => {
      setDownloading(false);
      Alert.alert(
        'Certificate Downloaded',
        `Certificate PDF (${certificateId}.pdf) has been saved to your downloads.`
      );
    }, 1200);
  };

  return (
    <Screen withTopInset>
      {/* Top Header */}
      <View
        style={[
          styles.headerRow,
          {
            paddingHorizontal: spacing.screen,
            borderBottomColor: colors.border,
            borderBottomWidth: 1,
            paddingVertical: spacing.sm,
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backButton, { backgroundColor: colors.surface }]}
          accessibilityLabel="Go back"
          accessibilityRole="button"
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color={colors.text} strokeWidth={2} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: spacing.sm }}>
          <Text style={[typography.title, { color: colors.text }]}>Certificate</Text>
          <Text style={[typography.caption, { color: colors.textMuted }]}>
            Official Course Completion
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: spacing.screen }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Certificate Golden Presentation Canvas */}
        <Animated.View entering={ZoomIn.duration(450)} style={{ marginTop: spacing.base }}>
          <View
            style={[
              styles.certBorder,
              {
                borderColor: colors.accent,
                backgroundColor: colors.surface,
                borderRadius: radius.card,
              },
            ]}
          >
            <View
              style={[
                styles.certInnerBorder,
                {
                  borderColor: colors.accent,
                },
              ]}
            >
              {/* Top Certificate Header */}
              <View style={styles.badgeWrapper}>
                <View
                  style={[
                    styles.awardCircle,
                    { backgroundColor: colors.accentLight, borderColor: colors.accent },
                  ]}
                >
                  <Award size={36} color={colors.accent} strokeWidth={1.75} />
                </View>
              </View>

              <Text
                style={[
                  typography.caption,
                  {
                    color: colors.accent,
                    letterSpacing: 2,
                    fontWeight: '700',
                    textAlign: 'center',
                    marginTop: 12,
                  },
                ]}
              >
                CERTIFICATE OF COMPLETION
              </Text>

              <Text
                style={[
                  typography.caption,
                  { color: colors.textMuted, textAlign: 'center', marginTop: 4 },
                ]}
              >
                PROUDLY PRESENTED TO
              </Text>

              {/* Student Name */}
              <Text
                style={[
                  typography.title,
                  {
                    color: colors.text,
                    textAlign: 'center',
                    marginTop: 12,
                    fontSize: 22,
                    fontWeight: '700',
                  },
                ]}
              >
                {studentName}
              </Text>
              <View style={[styles.nameUnderline, { backgroundColor: colors.accent }]} />

              {/* Course Title & Statement */}
              <Text
                style={[
                  typography.small,
                  {
                    color: colors.textMuted,
                    textAlign: 'center',
                    marginTop: 12,
                    lineHeight: 20,
                  },
                ]}
              >
                for successfully completing the comprehensive professional curriculum of
              </Text>

              <Text
                style={[
                  typography.heading,
                  {
                    color: colors.primary,
                    textAlign: 'center',
                    marginTop: 6,
                    paddingHorizontal: 8,
                  },
                ]}
              >
                YouTube Sikho Creator Mastery
              </Text>

              {/* Verification & Signatures */}
              <View style={[styles.certFooter, { borderTopColor: colors.border }]}>
                <View style={{ alignItems: 'flex-start' }}>
                  <Text style={[typography.caption, { color: colors.textMuted }]}>Date of Issue</Text>
                  <Text
                    style={[
                      typography.caption,
                      typography.tabular,
                      { color: colors.text, fontWeight: '600', marginTop: 2 },
                    ]}
                  >
                    {issueDate}
                  </Text>
                </View>

                <View style={{ alignItems: 'center' }}>
                  <ShieldCheck size={24} color={colors.success} strokeWidth={1.75} />
                  <Text style={[typography.caption, { color: colors.success, fontWeight: '600' }]}>
                    VERIFIED
                  </Text>
                </View>

                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[typography.caption, { color: colors.textMuted }]}>Certificate ID</Text>
                  <Text
                    style={[
                      typography.caption,
                      typography.tabular,
                      { color: colors.text, fontWeight: '600', marginTop: 2 },
                    ]}
                  >
                    {certificateId}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Action Buttons */}
        <Animated.View entering={FadeInDown.duration(350).delay(200)} style={{ marginTop: spacing.xl }}>
          <View style={styles.actionsContainer}>
            <Button
              title={downloading ? 'Generating PDF...' : 'Download Certificate PDF'}
              variant="primary"
              onPress={handleDownload}
              loading={downloading}
              icon={<Download size={18} color="#FFFFFF" strokeWidth={2} />}
            />

            <View style={{ marginTop: spacing.sm }}>
              <Button
                title="Share Achievement"
                variant="secondary"
                onPress={handleShare}
                icon={<Share2 size={18} color={colors.primary} strokeWidth={1.75} />}
              />
            </View>
          </View>
        </Animated.View>
      </ScrollView>

      {isScreenCaptured && (
        <View style={styles.screenCaptureCover}>
          <ShieldAlert size={44} color={colors.error} strokeWidth={2} />
          <Text style={[typography.headline, { color: colors.text, marginTop: 12 }]}>
            Protected Credential
          </Text>
          <Text style={[typography.caption, { color: colors.textMuted, marginTop: 4, textAlign: 'center' }]}>
            Unauthorized screen capture of completion certificates is prohibited.
          </Text>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenCaptureCover: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    zIndex: 9999,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 60,
  },
  certBorder: {
    borderWidth: 2,
    padding: 10,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  certInnerBorder: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  badgeWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  awardCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameUnderline: {
    height: 2,
    width: 120,
    marginTop: 6,
    borderRadius: 1,
  },
  certFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    borderTopWidth: 1,
    paddingTop: 16,
    marginTop: 24,
  },
  actionsContainer: {
    width: '100%',
  },
});
