import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ArrowLeft, Shield, FileText, RefreshCw, Info, ExternalLink } from 'lucide-react-native';
import { doc, onSnapshot } from 'firebase/firestore';
import { firebaseFirestore } from '../../src/services/firebase';
import { useTheme } from '../../src/theme';
import { Card } from '../../src/components/common/Card';
import { Screen } from '../../src/components/common/Screen';
import { clientConfig } from '../../src/config/client.config';

interface LegalDoc {
  title: string;
  subtitle: string;
  lastUpdated: string;
  icon: any;
  webUrl?: string;
  sections: { heading: string; body: string }[];
}

const DEFAULT_LEGAL_DOCS: Record<string, LegalDoc> = {
  privacy: {
    title: 'Privacy Policy',
    subtitle: 'Data protection and Play Store compliance',
    lastUpdated: 'Updated Recently',
    icon: Shield,
    webUrl: clientConfig.privacyPolicyUrl,
    sections: [
      {
        heading: '1. Information We Collect',
        body: 'We collect your name, phone number, and email address when you register. When you interact with our courses, we log your lesson progress, video timestamps, and quiz answers to provide personalized learning analytics.',
      },
      {
        heading: '2. Payment Data & Security',
        body: 'All payment processing is securely executed through authorized payment gateway partners. We do not store your credit card numbers, banking passwords, or UPI MPIN on our servers.',
      },
      {
        heading: '3. Data Retention & Account Deletion',
        body: 'In strict compliance with Google Play Store User Data policies, you can permanently delete your account, enrolled courses, and all associated personal data anytime directly from the App Settings screen or by contacting support.',
      },
      {
        heading: '4. Communications & Notifications',
        body: 'We may send you transactional messages for verification and push notifications for upcoming live classes and test announcements. You can toggle push notifications off at any time in Settings.',
      },
    ],
  },
  terms: {
    title: 'Terms of Service',
    subtitle: 'Platform usage terms and learner agreement',
    lastUpdated: 'Updated Recently',
    icon: FileText,
    webUrl: clientConfig.termsUrl,
    sections: [
      {
        heading: '1. Course Access & License',
        body: 'Upon purchasing a course or enrolling in a workshop, you are granted a non-exclusive, non-transferable, revocable single-user license to access and stream the course content for personal learning.',
      },
      {
        heading: '2. Account Sharing & Anti-Piracy',
        body: 'Accounts are strictly for individual use. Account sharing, credential distribution, or commercial broadcasting of classes is strictly prohibited and results in immediate account revocation without refund.',
      },
      {
        heading: '3. Screen Recording & Copyright Protection',
        body: 'All course videos, materials, and certificates are protected under applicable copyright laws. Screen capture is blocked on Android and detected on iOS.',
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
    lastUpdated: 'Updated Recently',
    icon: RefreshCw,
    webUrl: clientConfig.refundPolicyUrl,
    sections: [
      {
        heading: '1. Money Back Guarantee',
        body: 'We want you to be completely satisfied with your learning experience. If a course does not meet your expectations, you may request a refund within 7 days of purchase, provided you have watched less than 25% of total course lessons.',
      },
      {
        heading: '2. Ineligible Refund Scenarios',
        body: 'Refunds cannot be granted if: (a) More than 25% of the course has been completed; (b) Course completion certificate has already been generated; or (c) Account has violated terms of service.',
      },
      {
        heading: '3. Processing Timeline',
        body: 'Approved refunds are credited back to the original payment source (UPI, Cards, NetBanking) via direct gateway reversal within 5 to 7 business banking days.',
      },
    ],
  },
  about: {
    title: 'About Us',
    subtitle: `${clientConfig.appName} Mission`,
    lastUpdated: 'Updated Recently',
    icon: Info,
    webUrl: clientConfig.privacyPolicyUrl,
    sections: [
      {
        heading: '1. Our Mission',
        body: `${clientConfig.appName} by ${clientConfig.companyLegalName} is an education academy dedicated to empowering learners with structured masterclasses, practical skills, and expert mentorship.`,
      },
      {
        heading: '2. Creator-First Pedagogy',
        body: 'Every course is designed with actionable templates, real-world case studies, and verified analytics from experienced educators and creators.',
      },
    ],
  },
};

export default function LegalScreen() {
  const { page } = useLocalSearchParams<{ page: string }>();
  const router = useRouter();
  const { colors, typography, radius, spacing, shadows } = useTheme();

  const docKey = typeof page === 'string' && DEFAULT_LEGAL_DOCS[page] ? page : 'privacy';
  const defaultDoc = DEFAULT_LEGAL_DOCS[docKey];
  const [legalDoc, setLegalDoc] = useState<LegalDoc>(defaultDoc);

  // Real-time listener for Firestore dynamic legal text overrides
  useEffect(() => {
    const unsub = onSnapshot(
      doc(firebaseFirestore, 'legalPages', docKey),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (Array.isArray(data.sections) && data.sections.length > 0) {
            setLegalDoc((prev) => ({
              ...prev,
              title: data.title || prev.title,
              subtitle: data.subtitle || prev.subtitle,
              lastUpdated: data.lastUpdated || prev.lastUpdated,
              sections: data.sections,
            }));
          }
        }
      },
      (err) => {
        // Fallback to default document cleanly
      }
    );
    return () => unsub();
  }, [docKey]);

  const IconComponent = legalDoc.icon;

  const handleOpenWeb = () => {
    if (legalDoc.webUrl) {
      Linking.openURL(legalDoc.webUrl).catch(() => {});
    }
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
          <Text style={[typography.title, { color: colors.text }]}>{legalDoc.title}</Text>
          <Text style={[typography.caption, { color: colors.textMuted }]}>{legalDoc.subtitle}</Text>
        </View>
        <View style={[styles.iconBadge, { backgroundColor: colors.surfaceElevated }]}>
          <IconComponent size={20} color={colors.primary} strokeWidth={1.75} />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingHorizontal: spacing.screen, paddingVertical: spacing.base },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Document Header Card */}
        <Animated.View entering={FadeInDown.duration(300)}>
          <Card padding={spacing.base} style={{ backgroundColor: colors.surface }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View>
                <Text style={[typography.caption, { color: colors.textMuted }]}>
                  {clientConfig.companyLegalName}
                </Text>
                <Text style={[typography.caption, { color: colors.textMuted, marginTop: 2 }]}>
                  {legalDoc.lastUpdated}
                </Text>
              </View>
              {legalDoc.webUrl ? (
                <TouchableOpacity
                  onPress={handleOpenWeb}
                  style={[styles.webBtn, { borderColor: colors.border }]}
                  activeOpacity={0.7}
                >
                  <Text style={[typography.caption, { color: colors.primary, fontWeight: '600' }]}>
                    Web Version
                  </Text>
                  <ExternalLink size={12} color={colors.primary} style={{ marginLeft: 4 }} />
                </TouchableOpacity>
              ) : null}
            </View>
          </Card>
        </Animated.View>

        {/* Sections */}
        <View style={{ gap: spacing.base, marginTop: spacing.base }}>
          {legalDoc.sections.map((sec, idx) => (
            <Animated.View key={idx} entering={FadeInDown.duration(300).delay(idx * 60)}>
              <Card padding={spacing.base} style={{ backgroundColor: colors.surface }}>
                <Text style={[typography.heading, { color: colors.text, marginBottom: spacing.xs }]}>
                  {sec.heading}
                </Text>
                <Text style={[typography.body, { color: colors.textMuted, lineHeight: 22 }]}>
                  {sec.body}
                </Text>
              </Card>
            </Animated.View>
          ))}
        </View>

        {/* Contact Support Footnote */}
        <View style={[styles.footerNote, { marginTop: spacing.xl }]}>
          <Text style={[typography.caption, { color: colors.textMuted, textAlign: 'center' }]}>
            Questions regarding our policies? Contact us at{' '}
            <Text
              style={{ color: colors.primary }}
              onPress={() => Linking.openURL(`mailto:${clientConfig.supportEmail}`)}
            >
              {clientConfig.supportEmail}
            </Text>
          </Text>
        </View>
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
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  webBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  footerNote: {
    alignItems: 'center',
    paddingVertical: 12,
  },
});
