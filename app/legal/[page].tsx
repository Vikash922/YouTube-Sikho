import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ArrowLeft, Shield, FileText, RefreshCw, Info, ExternalLink } from 'lucide-react-native';
import { useTheme } from '../../src/theme';
import { Card } from '../../src/components/common/Card';
import { Screen } from '../../src/components/common/Screen';
import { clientConfig } from '../../src/config/client.config';

interface LegalDoc {
  title: string;
  subtitle: string;
  lastUpdated: string;
  icon: any;
  sections: { heading: string; body: string }[];
}

const LEGAL_DOCS: Record<string, LegalDoc> = {
  privacy: {
    title: 'Privacy Policy',
    subtitle: 'Data protection and Play Store compliance',
    lastUpdated: 'October 2026',
    icon: Shield,
    sections: [
      {
        heading: '1. Information We Collect',
        body: 'We collect your name, phone number, and email address when you register. When you interact with our courses, we log your lesson progress, video timestamps, and quiz answers to provide personalized learning analytics.',
      },
      {
        heading: '2. Payment Data & Security',
        body: 'All payment processing is securely executed through Razorpay and RBI-authorized payment partners (supporting UPI, Cards, and NetBanking). We do not store your credit card numbers, banking passwords, or UPI MPIN on our servers.',
      },
      {
        heading: '3. Data Retention & Account Deletion',
        body: 'In strict compliance with Google Play Store User Data policies, you can permanently delete your account, enrolled courses, and all associated personal data anytime directly from the App Settings screen or by contacting support.',
      },
      {
        heading: '4. Communications & Notifications',
        body: 'We may send you transactional SMS alerts for OTP verification and push notifications for upcoming live classes and test announcements. You can toggle push notifications off at any time in Settings.',
      },
    ],
  },
  terms: {
    title: 'Terms of Service',
    subtitle: 'Platform usage terms and learner agreement',
    lastUpdated: 'October 2026',
    icon: FileText,
    sections: [
      {
        heading: '1. Course Access & License',
        body: 'Upon purchasing a course or enrolling in a free workshop, you are granted a non-exclusive, non-transferable, revocable single-user license to access and stream the course content for personal learning.',
      },
      {
        heading: '2. Account Sharing & Anti-Piracy',
        body: 'Accounts are strictly for individual use. Account sharing, credential distribution, or commercial broadcasting of live classes is strictly prohibited and results in immediate account revocation without refund.',
      },
      {
        heading: '3. Screen Recording & Copyright Protection',
        body: 'All course videos, PDFs, and tests are protected under applicable copyright laws. Dynamic watermarking with the learner’s verified identity is displayed during playback. In standalone mobile app builds, screen capturing is restricted via Android FLAG_SECURE and iOS recording detection.',
      },
      {
        heading: '4. Code of Conduct in Live Classes',
        body: 'Students must maintain respectful behavior in live chat rooms and discussion forums. Abusive language, harassment, or spamming will lead to permanent chat bans.',
      },
    ],
  },
  refund: {
    title: 'Refund & Cancellation',
    subtitle: 'Policy for course enrollments and digital items',
    lastUpdated: 'October 2026',
    icon: RefreshCw,
    sections: [
      {
        heading: '1. 7-Day Money Back Guarantee',
        body: 'We want you to be completely satisfied with your learning experience. If a course does not meet your expectations, you may request a refund within 7 days of purchase, provided you have watched less than 25% of total course lessons.',
      },
      {
        heading: '2. Ineligible Refund Scenarios',
        body: 'Refunds cannot be granted if: (a) More than 25% of the course has been completed; (b) Course completion certificate has already been generated; or (c) Account has violated terms of service.',
      },
      {
        heading: '3. Processing Timeline',
        body: 'Approved refunds are credited back to the original payment source (UPI, NetBanking) via direct gateway reversal within 5 to 7 business banking days.',
      },
    ],
  },
  about: {
    title: 'About Us',
    subtitle: 'Creator Academy & Mission',
    lastUpdated: 'October 2026',
    icon: Info,
    sections: [
      {
        heading: '1. Our Mission',
        body: 'YouTube Sikho is India’s premier creator education academy dedicated to empowering aspiring content creators, editors, and digital entrepreneurs with world-class Hindi tutorials, live masterclasses, and hands-on mentorship.',
      },
      {
        heading: '2. Creator-First Pedagogy',
        body: 'Every course is designed with actionable templates, real-world case studies, and verified analytics from top creators with millions of subscribers.',
      },
    ],
  },
};

export default function LegalScreen() {
  const { page } = useLocalSearchParams<{ page: string }>();
  const router = useRouter();
  const { colors, typography, radius, spacing } = useTheme();

  const docKey = typeof page === 'string' && LEGAL_DOCS[page] ? page : 'privacy';
  const doc = LEGAL_DOCS[docKey];
  const IconComponent = doc.icon;

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
          <Text style={[typography.title, { color: colors.text }]}>{doc.title}</Text>
          <Text style={[typography.caption, { color: colors.textMuted }]}>{doc.subtitle}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: spacing.screen }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Card */}
        <Animated.View entering={FadeInDown.duration(350).delay(80)} style={{ marginTop: spacing.base }}>
          <Card padding={spacing.base}>
            <View style={styles.heroRow}>
              <View
                style={[
                  styles.iconBox,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <IconComponent size={24} color={colors.primary} strokeWidth={1.75} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[typography.heading, { color: colors.text }]}>{doc.title}</Text>
                <Text style={[typography.caption, typography.tabular, { color: colors.textMuted }]}>
                  Effective: {doc.lastUpdated}
                </Text>
              </View>
            </View>
          </Card>
        </Animated.View>

        {/* Policy Sections */}
        {doc.sections.map((sec, idx) => (
          <Animated.View
            key={sec.heading}
            entering={FadeInDown.duration(350).delay(120 + idx * 60)}
            style={{ marginTop: spacing.base }}
          >
            <Card padding={spacing.base}>
              <Text style={[typography.heading, { color: colors.text, marginBottom: 6 }]}>
                {sec.heading}
              </Text>
              <Text
                style={[
                  typography.body,
                  { color: colors.textMuted, lineHeight: 22 },
                ]}
              >
                {sec.body}
              </Text>
            </Card>
          </Animated.View>
        ))}

        {/* Contact Support Link */}
        <Animated.View
          entering={FadeInDown.duration(350).delay(380)}
          style={{ marginTop: spacing.lg, marginBottom: 40 }}
        >
          <TouchableOpacity
            onPress={() => router.push('/support')}
            style={[
              styles.supportLinkRow,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderRadius: radius.card,
              },
            ]}
            activeOpacity={0.7}
          >
            <View style={{ flex: 1 }}>
              <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>
                Questions about our policies?
              </Text>
              <Text style={[typography.caption, { color: colors.textMuted }]}>
                Contact our learner support team 24/7
              </Text>
            </View>
            <ExternalLink size={18} color={colors.primary} strokeWidth={1.75} />
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
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
    paddingBottom: 40,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  supportLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    minHeight: 56,
  },
});
