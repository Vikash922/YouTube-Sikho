import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  ArrowLeft,
  LifeBuoy,
  MessageCircle,
  Phone,
  Send,
  Plus,
  CheckCircle2,
  Clock,
  HelpCircle,
  Sparkles,
  RefreshCw,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import {
  collection,
  onSnapshot,
  query,
  where,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { firebaseFirestore, firebaseAuth } from '../src/services/firebase';
import { useTheme } from '../src/theme';
import { useAuthStore } from '../src/store/useAuthStore';
import { useConfigStore } from '../src/store/useConfigStore';
import { useLanguageStore } from '../src/store/useLanguageStore';
import { clientConfig } from '../src/config/client.config';
import { Screen } from '../src/components/common/Screen';
import { Card } from '../src/components/common/Card';
import { Button } from '../src/components/common/Button';

export interface SupportTicket {
  id: string;
  uid: string;
  userName: string;
  userEmail: string;
  subject: string;
  message: string;
  category: 'payment' | 'course_access' | 'video_playback' | 'other';
  status: 'open' | 'in_progress' | 'resolved';
  adminReply?: string;
  createdAt?: any;
}

const FAQS = [
  {
    q: 'How do I download video lessons for offline watching?',
    a: 'Due to copyright protection, videos stream in high definition directly within the app player. Ensure an active WiFi or mobile data connection.',
  },
  {
    q: 'Will I get lifetime access to purchased courses?',
    a: 'Yes! Once you enroll in any masterclass, you get unconditional lifetime access including all future module updates and bonus study notes.',
  },
  {
    q: 'How do I get my Course Completion Certificate?',
    a: 'Once you watch all required video lessons and pass the final quiz with minimum passing marks, your verified certificate is automatically generated in your course portal.',
  },
];

export default function SupportScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, typography, spacing, radius, shadows } = useTheme();
  const user = useAuthStore((state) => state.user);
  const profile = useAuthStore((state) => state.profile);
  const config = useConfigStore((state) => state.config);
  const t = useLanguageStore((state) => state.t);

  const [activeTab, setActiveTab] = useState<'tickets' | 'faqs'>('tickets');
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);

  // New ticket modal/form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState<'payment' | 'course_access' | 'video_playback' | 'other'>('course_access');
  const [submitting, setSubmitting] = useState(false);

  // Live subscription to user's tickets
  useEffect(() => {
    const authUser = firebaseAuth.currentUser;
    // Strictly guard to avoid permission denied when unauthenticated
    if (!authUser || !user?.uid || authUser.uid !== user.uid) {
      setTickets([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(firebaseFirestore, 'tickets'),
      where('uid', '==', authUser.uid)
    );

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map(
          (d) => ({ id: d.id, ...d.data() } as SupportTicket)
        );
        setTickets(list);
        setLoading(false);
      },
      (err) => {
        console.warn('Tickets listener notice:', err.message);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [user?.uid]);

  const handleCreateTicket = async () => {
    if (!subject.trim() || !message.trim()) {
      Alert.alert('Required Fields', 'Please enter a subject and describe your query.');
      return;
    }

    const authUser = firebaseAuth.currentUser;
    if (!authUser) {
      Alert.alert('Sign-In Required', 'Please sign in to open a support ticket.');
      return;
    }

    setSubmitting(true);
    try {
      await addDoc(collection(firebaseFirestore, 'tickets'), {
        uid: authUser.uid,
        userName: profile?.name || 'Student',
        userEmail: authUser.email || user?.email || '',
        subject: subject.trim(),
        message: message.trim(),
        category,
        status: 'open',
        createdAt: serverTimestamp(),
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Ticket Submitted', 'Our support team will respond within a few hours.');
      setSubject('');
      setMessage('');
      setShowCreateForm(false);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not submit ticket.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenWhatsApp = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const raw = config?.supportWhatsApp || clientConfig.supportWhatsApp;
    const clean = raw.replace(/\D/g, '');
    Linking.openURL(`https://wa.me/${clean}`).catch(() => {});
  };

  const handleCallSupport = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const raw = config?.supportPhone || clientConfig.supportPhone || '+91 98765 43210';
    const cleanPhone = raw.replace(/[^\d+]/g, '');
    Linking.openURL(`tel:${cleanPhone}`).catch(() => {});
  };

  const renderStatusNotch = (status: 'open' | 'in_progress' | 'resolved') => {
    if (status === 'resolved') {
      return (
        <View style={[styles.statusNotch, { backgroundColor: colors.success + '20', borderColor: colors.success }]}>
          <CheckCircle2 size={12} color={colors.success} strokeWidth={2.5} />
          <Text style={[typography.caption, { color: colors.success, fontWeight: '700', marginLeft: 4, fontSize: 10 }]}>
            RESOLVED
          </Text>
        </View>
      );
    }
    if (status === 'in_progress') {
      return (
        <View style={[styles.statusNotch, { backgroundColor: colors.primaryGlow, borderColor: colors.primary }]}>
          <RefreshCw size={12} color={colors.primary} strokeWidth={2.5} />
          <Text style={[typography.caption, { color: colors.primary, fontWeight: '700', marginLeft: 4, fontSize: 10 }]}>
            IN PROGRESS
          </Text>
        </View>
      );
    }
    return (
      <View style={[styles.statusNotch, { backgroundColor: colors.accent + '20', borderColor: colors.accent }]}>
        <Clock size={12} color={colors.accent} strokeWidth={2.5} />
        <Text style={[typography.caption, { color: colors.accent, fontWeight: '700', marginLeft: 4, fontSize: 10 }]}>
          OPEN
        </Text>
      </View>
    );
  };

  return (
    <Screen style={{ backgroundColor: colors.background }}>
      {/* 1. Header */}
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
          style={[styles.backButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <ArrowLeft size={20} color={colors.text} strokeWidth={2} />
        </TouchableOpacity>

        <View style={{ flex: 1, marginLeft: spacing.sm }}>
          <Text style={[typography.title, { color: colors.text }]} numberOfLines={1}>
            {t('helpSupport')}
          </Text>
          <Text style={[typography.caption, { color: colors.textMuted }]}>
            {t('helpSupportSubtitle')}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: spacing.screen }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Quick Contact Bar */}
        <Animated.View entering={FadeInDown.duration(300)} style={{ marginTop: spacing.md }}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity
              onPress={handleOpenWhatsApp}
              style={[
                styles.quickContactBtn,
                { backgroundColor: '#25D366', borderRadius: radius.card },
              ]}
              activeOpacity={0.8}
            >
              <MessageCircle size={18} color="#FFFFFF" strokeWidth={2} />
              <Text style={[typography.small, { color: '#FFFFFF', fontWeight: '700', marginLeft: 6 }]}>
                {t('chatWhatsApp')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleCallSupport}
              style={[
                styles.quickContactBtn,
                { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.card },
              ]}
              activeOpacity={0.8}
            >
              <Phone size={18} color={colors.primary} strokeWidth={2} />
              <Text style={[typography.small, { color: colors.text, fontWeight: '700', marginLeft: 6 }]}>
                {t('callSupport')}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Tab Selector */}
        <View style={[styles.tabBar, { backgroundColor: colors.surface, borderRadius: radius.button, marginTop: spacing.lg }]}>
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setActiveTab('tickets');
            }}
            style={[
              styles.tabBtn,
              activeTab === 'tickets' && { backgroundColor: colors.primary, borderRadius: radius.button - 2 },
            ]}
          >
            <Text
              style={[
                typography.small,
                {
                  color: activeTab === 'tickets' ? '#FFFFFF' : colors.textMuted,
                  fontWeight: '700',
                },
              ]}
            >
              {t('myTickets')} ({tickets.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setActiveTab('faqs');
            }}
            style={[
              styles.tabBtn,
              activeTab === 'faqs' && { backgroundColor: colors.primary, borderRadius: radius.button - 2 },
            ]}
          >
            <Text
              style={[
                typography.small,
                {
                  color: activeTab === 'faqs' ? '#FFFFFF' : colors.textMuted,
                  fontWeight: '700',
                },
              ]}
            >
              {t('faqs')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* 2. Tickets Tab View */}
        {activeTab === 'tickets' && (
          <View style={{ marginTop: spacing.base }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
              <Text style={[typography.heading, { color: colors.text }]}>
                {t('recentInquiries')}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowCreateForm((prev) => !prev);
                }}
                style={[
                  styles.createTicketBtn,
                  { backgroundColor: colors.primary, borderRadius: radius.button },
                ]}
              >
                <Plus size={16} color="#FFFFFF" strokeWidth={2} />
                <Text style={[typography.caption, { color: '#FFFFFF', fontWeight: '700', marginLeft: 4 }]}>
                  {showCreateForm ? t('closeForm') : t('newTicket')}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Create Ticket Form */}
            {showCreateForm && (
              <Card padding={spacing.base} style={{ marginBottom: spacing.lg, borderColor: colors.primary, borderWidth: 1.5 }}>
                <Text style={[typography.heading, { color: colors.text, fontSize: 16 }]}>
                  {t('openTicket')}
                </Text>

                <TextInput
                  style={[
                    styles.inputField,
                    typography.body,
                    {
                      backgroundColor: colors.background,
                      color: colors.text,
                      borderColor: colors.border,
                      borderRadius: radius.input,
                      marginTop: spacing.sm,
                    },
                  ]}
                  placeholder="Subject (e.g. Video playback issue)"
                  placeholderTextColor={colors.textMuted}
                  value={subject}
                  onChangeText={setSubject}
                />

                <TextInput
                  style={[
                    styles.inputField,
                    typography.body,
                    {
                      backgroundColor: colors.background,
                      color: colors.text,
                      borderColor: colors.border,
                      borderRadius: radius.input,
                      marginTop: spacing.sm,
                      height: 80,
                      textAlignVertical: 'top',
                    },
                  ]}
                  placeholder="Describe your query in detail..."
                  placeholderTextColor={colors.textMuted}
                  value={message}
                  onChangeText={setMessage}
                  multiline
                />

                <Button
                  title={t('submitTicket')}
                  variant="primary"
                  loading={submitting}
                  onPress={handleCreateTicket}
                  style={{ marginTop: spacing.md }}
                />
              </Card>
            )}

            {/* Tickets List */}
            {loading ? (
              <View style={{ padding: 32, alignItems: 'center' }}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : tickets.length === 0 ? (
              <Card padding={spacing.lg} style={{ alignItems: 'center', marginVertical: 12 }}>
                <LifeBuoy size={36} color={colors.primary} strokeWidth={1.75} />
                <Text style={[typography.heading, { color: colors.text, marginTop: 12, textAlign: 'center' }]}>
                  No support tickets yet
                </Text>
                <Text style={[typography.caption, { color: colors.textMuted, marginTop: 4, textAlign: 'center' }]}>
                  Need help with course access or payment? Click "New Ticket" to message our team.
                </Text>
              </Card>
            ) : (
              <View style={{ gap: 12 }}>
                {tickets.map((tItem) => (
                  <Card key={tItem.id} padding={spacing.base} style={styles.ticketCard}>
                    {/* Top Row with notch badge and category */}
                    <View style={styles.ticketTopRow}>
                      <View style={[styles.categoryPill, { backgroundColor: colors.background, borderColor: colors.border }]}>
                        <Text style={[typography.caption, { color: colors.textMuted, fontSize: 10, fontWeight: '700', textTransform: 'uppercase' }]}>
                          {tItem.category.replace('_', ' ')}
                        </Text>
                      </View>
                      {renderStatusNotch(tItem.status)}
                    </View>

                    <Text style={[typography.heading, { color: colors.text, marginTop: spacing.sm, fontSize: 16 }]}>
                      {tItem.subject}
                    </Text>

                    <Text style={[typography.body, { color: colors.textMuted, marginTop: 6, fontSize: 14, lineHeight: 20 }]}>
                      {tItem.message}
                    </Text>

                    {/* Official Admin Reply Speech Bubble */}
                    {tItem.adminReply && (
                      <View
                        style={[
                          styles.adminReplyBubble,
                          {
                            backgroundColor: colors.background,
                            borderColor: colors.border,
                            borderLeftColor: colors.primary,
                          },
                        ]}
                      >
                        <View style={styles.adminHeaderRow}>
                          <Sparkles size={14} color={colors.primary} strokeWidth={2} />
                          <Text style={[typography.caption, { color: colors.primary, fontWeight: '700', marginLeft: 6 }]}>
                            OFFICIAL INSTRUCTOR RESPONSE
                          </Text>
                        </View>
                        <Text style={[typography.body, { color: colors.text, fontSize: 13, marginTop: 6, lineHeight: 20 }]}>
                          {tItem.adminReply}
                        </Text>
                      </View>
                    )}
                  </Card>
                ))}
              </View>
            )}
          </View>
        )}

        {/* 3. FAQs Tab View */}
        {activeTab === 'faqs' && (
          <View style={{ marginTop: spacing.base, gap: 12 }}>
            {FAQS.map((faq, i) => (
              <Card key={i} padding={spacing.base}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <HelpCircle size={18} color={colors.primary} strokeWidth={2} />
                  <Text style={[typography.heading, { color: colors.text, fontSize: 15, flex: 1 }]}>
                    {faq.q}
                  </Text>
                </View>
                <Text style={[typography.body, { color: colors.textMuted, marginTop: 8, fontSize: 14, lineHeight: 22 }]}>
                  {faq.a}
                </Text>
              </Card>
            ))}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingBottom: 80,
  },
  quickContactBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 16,
  },
  tabBar: {
    flexDirection: 'row',
    padding: 4,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    minHeight: 40,
  },
  createTicketBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  inputField: {
    height: 48,
    paddingHorizontal: 14,
    borderWidth: 1,
  },
  ticketCard: {
    position: 'relative',
    overflow: 'hidden',
  },
  ticketTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
  },
  statusNotch: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  adminReplyBubble: {
    borderWidth: 1,
    borderLeftWidth: 3,
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  adminHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
