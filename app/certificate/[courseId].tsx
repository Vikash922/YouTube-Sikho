import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
  Alert,
  ActivityIndicator,
  Linking,
  Platform,
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
  Lock,
  ExternalLink,
  BookOpen,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../src/services/firebase';
import { useTheme } from '../../src/theme';
import { useAuthStore } from '../../src/store/useAuthStore';
import { useConfigStore } from '../../src/store/useConfigStore';
import { useScreenProtection } from '../../src/hooks/useScreenProtection';
import { clientConfig } from '../../src/config/client.config';
import { Card } from '../../src/components/common/Card';
import { Button } from '../../src/components/common/Button';
import { ConfettiBurst } from '../../src/motion/particles/ConfettiBurst';
import { Screen } from '../../src/components/common/Screen';

interface CertificateData {
  id: string;
  uid: string;
  studentName: string;
  courseId: string;
  courseTitle: string;
  issuedAt: string;
  clientName: string;
  verifyUrl: string;
}

export default function CertificateScreen() {
  const { courseId } = useLocalSearchParams<{ courseId: string }>();
  const router = useRouter();
  const { colors, typography, radius, spacing } = useTheme();
  const { profile, user } = useAuthStore();
  const config = useConfigStore((state) => state.config);
  const { isScreenCaptured } = useScreenProtection(`certificate_${courseId}`);

  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [cert, setCert] = useState<CertificateData | null>(null);
  const [lockError, setLockError] = useState<string | null>(null);

  useEffect(() => {
    if (!courseId) return;

    let isMounted = true;
    const loadCertificate = async () => {
      try {
        const issueCertCallable = httpsCallable<{ courseId: string }, any>(
          functions,
          'issueCertificate'
        );
        const res = await issueCertCallable({ courseId });
        if (isMounted && res.data?.certificate) {
          setCert(res.data.certificate);
          setLockError(null);
        }
      } catch (err: any) {
        if (isMounted) {
          setLockError(err.message || 'Course completion requirement not yet satisfied.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadCertificate();
    return () => {
      isMounted = false;
    };
  }, [courseId]);

  const clientName = cert?.clientName || config?.appName || clientConfig.appName;
  const studentName = cert?.studentName || profile?.name || user?.displayName || 'Learner';
  const courseTitle = cert?.courseTitle || 'Master Course';
  const certificateId = cert?.id || 'PENDING';
  const projectId = clientConfig.firebaseConfig?.projectId || 'app';
  const verifyUrl = cert?.verifyUrl || `https://${projectId}.web.app/verify?id=${certificateId}`;

  const formattedDate = cert?.issuedAt
    ? new Date(cert.issuedAt).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : new Date().toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });

  const handleShare = async () => {
    if (!cert) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await Share.share({
        title: `Official Certificate: ${courseTitle}`,
        message: `I have officially completed "${courseTitle}" from ${clientName}!\n\nVerify my credential online:\n${verifyUrl}\nCertificate ID: ${certificateId}`,
      });
    } catch (err) {
      // Ignored
    }
  };

  const handleGeneratePdf = async () => {
    if (!cert || downloading) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setDownloading(true);

    try {
      const brandColor = clientConfig.colors.primary;
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            @page { size: landscape; margin: 0; }
            body {
              margin: 0;
              padding: 40px;
              font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
              background-color: rgb(248, 250, 252);
              color: rgb(15, 23, 42);
              display: flex;
              align-items: center;
              justify-content: center;
              height: 100vh;
              box-sizing: border-box;
            }
            .cert-container {
              background: #FFFFFF;
              width: 100%;
              height: 100%;
              border: 12px double ${brandColor};
              padding: 40px 60px;
              box-sizing: border-box;
              text-align: center;
              position: relative;
            }
            .brand-name {
              font-size: 22px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 4px;
              color: ${brandColor};
              margin-bottom: 8px;
            }
            .cert-title {
              font-size: 38px;
              font-weight: 900;
              text-transform: uppercase;
              letter-spacing: 2px;
              margin: 10px 0;
              color: rgb(30, 41, 59);
            }
            .cert-subtitle {
              font-size: 14px;
              color: rgb(100, 116, 139);
              text-transform: uppercase;
              letter-spacing: 2px;
              margin-bottom: 25px;
            }
            .recipient-name {
              font-size: 34px;
              font-weight: 800;
              color: rgb(15, 23, 42);
              border-bottom: 2px solid ${brandColor};
              display: inline-block;
              padding-bottom: 6px;
              margin-bottom: 20px;
            }
            .course-name {
              font-size: 20px;
              font-weight: 700;
              color: rgb(51, 65, 85);
              margin-bottom: 30px;
            }
            .footer-row {
              position: absolute;
              bottom: 35px;
              left: 60px;
              right: 60px;
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
              font-size: 12px;
              color: rgb(100, 116, 139);
            }
            .meta-item { text-align: left; }
            .meta-id { font-family: monospace; font-weight: bold; color: ${brandColor}; font-size: 14px; }
            .badge-verified {
              display: inline-block;
              background: rgba(16, 185, 129, 0.1);
              color: ${brandColor};
              border: 1px solid ${brandColor};
              padding: 4px 12px;
              font-weight: bold;
              border-radius: 4px;
              font-size: 11px;
              text-transform: uppercase;
            }
          </style>
        </head>
        <body>
          <div class="cert-container">
            <div class="brand-name">${clientName}</div>
            <div class="cert-title">Certificate of Completion</div>
            <div class="cert-subtitle">This is proudly presented to</div>
            
            <div class="recipient-name">${studentName}</div>
            
            <p style="font-size: 15px; color: rgb(71, 85, 105); max-width: 600px; margin: 0 auto 10px;">
              for successfully completing all lessons, projects, and authoritatively passing evaluation checkpoints for
            </p>
            <div class="course-name">"${courseTitle}"</div>

            <div class="badge-verified">✓ Verified Authentic Credential</div>

            <div class="footer-row">
              <div class="meta-item">
                <div>Date of Issuance: <strong>${formattedDate}</strong></div>
                <div>Verification Registry: ${verifyUrl}</div>
              </div>
              <div style="text-align: right;">
                <div>Certificate ID: <span class="meta-id">${certificateId}</span></div>
                <div style="font-size: 10px; margin-top: 4px; color: rgb(148, 163, 184);">Issued via Firebase Protected Authority</div>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html: htmlContent });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `${courseTitle} - Certificate`,
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert('PDF Created', `Certificate generated at: ${uri}`);
      }
    } catch (err: any) {
      Alert.alert('PDF Generation Failed', err.message || 'Could not export certificate PDF.');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <Screen withTopInset>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[typography.caption, { color: colors.textMuted, marginTop: 12 }]}>
            Checking course completion and verifying credential...
          </Text>
        </View>
      </Screen>
    );
  }

  // Locked State if course not 100% completed
  if (lockError || !cert) {
    return (
      <Screen withTopInset>
        <View style={[styles.headerRow, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={20} color={colors.text} />
          </TouchableOpacity>
          <Text style={[typography.title, { color: colors.text, marginLeft: 12 }]}>
            Course Certificate
          </Text>
        </View>

        <View style={styles.centerContainer}>
          <View style={[styles.lockIconCircle, { backgroundColor: colors.surfaceHover }]}>
            <Lock size={36} color={colors.textMuted} />
          </View>
          <Text style={[typography.headline, { color: colors.text, marginTop: 16 }]}>
            Certificate Locked
          </Text>
          <Text style={[typography.body, { color: colors.textMuted, textAlign: 'center', marginTop: 8, marginHorizontal: 24, lineHeight: 20 }]}>
            {lockError || 'Complete 100% of course lessons and pass required checkpoint quizzes to unlock your verified certificate.'}
          </Text>

          <Button
            title="Continue Learning"
            variant="primary"
            onPress={() => router.back()}
            icon={<BookOpen size={16} color={colors.surface} />}
            style={{ marginTop: 24 }}
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen withTopInset>
      <ConfettiBurst count={80} />
      {/* Header */}
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
        >
          <ArrowLeft size={20} color={colors.text} strokeWidth={2} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: spacing.sm }}>
          <Text style={[typography.title, { color: colors.text }]}>Verified Certificate</Text>
          <Text style={[typography.caption, { color: colors.textMuted }]}>
            Issued by {clientName}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: spacing.screen }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Certificate Card */}
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
            <View style={[styles.certInnerBorder, { borderColor: colors.accent }]}>
              {/* Award Ribbon Circle */}
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

              <Text style={[typography.small, { color: colors.accent, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 }]}>
                {clientName}
              </Text>

              <Text style={[typography.title, { color: colors.text, textAlign: 'center', marginBottom: 8, fontSize: 18, fontWeight: '800' }]}>
                CERTIFICATE OF COMPLETION
              </Text>

              <Text style={[typography.caption, { color: colors.textMuted, marginBottom: 12 }]}>
                This acknowledges that
              </Text>

              <Text style={[typography.headline, { color: colors.primary, textAlign: 'center', fontWeight: '800', marginBottom: 10 }]}>
                {studentName}
              </Text>

              <Text style={[typography.caption, { color: colors.textMuted, textAlign: 'center', paddingHorizontal: 16, marginBottom: 8 }]}>
                has successfully completed all lessons, assignments, and verified requirements for
              </Text>

              <Text style={[typography.body, { color: colors.text, textAlign: 'center', fontWeight: '700', paddingHorizontal: 12, marginBottom: 16 }]}>
                {courseTitle}
              </Text>

              {/* Verified Ribbon */}
              <View style={[styles.verifiedPill, { backgroundColor: colors.successBg, borderColor: colors.semanticSuccess }]}>
                <ShieldCheck size={14} color={colors.semanticSuccess} />
                <Text style={[styles.verifiedPillText, { color: colors.semanticSuccess }]}>
                  Verified Authentic Credential
                </Text>
              </View>

              {/* ID & Date Footer */}
              <View style={[styles.certFooter, { borderTopColor: colors.border }]}>
                <View style={{ alignItems: 'flex-start' }}>
                  <Text style={[typography.caption, { color: colors.textMuted, fontSize: 10 }]}>
                    Date Issued
                  </Text>
                  <Text style={[typography.caption, { color: colors.text, fontWeight: '600', fontSize: 11 }]}>
                    {formattedDate}
                  </Text>
                </View>

                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[typography.caption, { color: colors.textMuted, fontSize: 10 }]}>
                    Certificate ID
                  </Text>
                  <Text style={[typography.caption, { color: colors.primary, fontWeight: '700', fontSize: 11, fontVariant: ['tabular-nums'] }]}>
                    {certificateId}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Action Buttons */}
        <Animated.View entering={FadeInDown.duration(400).delay(200)} style={{ marginTop: spacing.xl, gap: spacing.sm }}>
          <Button
            title={downloading ? 'Generating Official PDF...' : 'Download Certificate PDF'}
            variant="primary"
            onPress={handleGeneratePdf}
            disabled={downloading}
            icon={downloading ? <ActivityIndicator size="small" color={colors.surface} /> : <Download size={18} color={colors.surface} />}
          />

          <Button
            title="Share Verified Credential"
            variant="outline"
            onPress={handleShare}
            icon={<Share2 size={18} color={colors.text} />}
          />

          <TouchableOpacity
            onPress={() => Linking.openURL(verifyUrl)}
            style={styles.verifyLinkRow}
          >
            <ExternalLink size={13} color={colors.primary} />
            <Text style={[typography.caption, { color: colors.primary, fontWeight: '600' }]}>
              Verify online: {verifyUrl}
            </Text>
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
    height: 56,
    paddingHorizontal: 16,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  lockIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  certBorder: {
    borderWidth: 3,
    padding: 8,
  },
  certInnerBorder: {
    borderWidth: 1,
    borderStyle: 'dashed',
    padding: 20,
    alignItems: 'center',
  },
  badgeWrapper: {
    marginBottom: 12,
  },
  awardCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  verifiedPillText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  certFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingTop: 12,
    borderTopWidth: 1,
  },
  verifyLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    marginTop: 4,
  },
});
