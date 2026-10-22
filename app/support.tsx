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
  FileQuestion,
  ChevronDown,
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
import { firebaseFirestore } from '../src/services/firebase';
import { useTheme } from '../src/theme';
import { useAuthStore } from '../src/store/useAuthStore';
import { useConfigStore } from '../src/store/useConfigStore';
import { clientConfig } from '../src/config/client.config';
import { Screen } from '../src/components/common/Screen';
import { Card } from '../src/components/common/Card';
import { Badge } from '../src/components/common/Badge';
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
    if (!user?.uid) {
      setTickets([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(firebaseFirestore, 'tickets'),
      where('uid', '==', user.uid)
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
        console.warn('Tickets listener error:', err.message);
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

    setSubmitting(true);
    try {
      await addDoc(collection(firebaseFirestore, 'tickets'), {
        uid: user?.uid || 'anonymous',
        userName: profile?.name || 'Student',
        userEmail: user?.email || '',
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
    const raw = config?.supportWhatsApp || clientConfig.supportWhatsApp;
    const clean = raw.replace(/\D/g, '');
    Linking.openURL(`https://wa.me/${clean}`).catch(() => {});
  };

  const handleCallSupport = () => {
    const phone = config?.supportPhone || clientConfig.supportPhone;
    Linking.openURL(`tel:${phone}`).catch(() => {});
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
        >
          <ArrowLeft size={20} color={colors.text} strokeWidth={1.75} />
        </TouchableOpacity>

        <Text
          style={[typography.title, { color: colors.text, flex: 1, marginLeft: spacing.sm }]}
          numberOfLines={1}
        >
          Help & Support Center
        </Text>
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
            >
              <MessageCircle size={18} color="#FFFFFF" strokeWidth={2} />
              <Text style={[typography.small, { color: '#FFFFFF', fontWeight: '700', marginLeft: 6 }]}>
                WhatsApp Us
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleCallSupport}
              style={[
                styles.quickContactBtn,
                { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.card },
              ]}
            >
              <Phone size={18} color={colors.primary} strokeWidth={2} />
              <Text style={[typography.small, { color: colors.text, fontWeight: '700', marginLeft: 6 }]}>
                Call Helpline
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Tab Selector */}
        <View style={[styles.tabBar, { backgroundColor: colors.surface, borderRadius: radius.button, marginTop: spacing.lg }]}>
          <TouchableOpacity
            onPress={() => setActiveTab('tickets')}
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
              My Support Tickets ({tickets.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab('faqs')}
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
              Common FAQs
            </Text>
          </TouchableOpacity>
        </View>

        {/* 2. Tickets Tab View */}
        {activeTab === 'tickets' && (
          <View style={{ marginTop: spacing.base }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
              <Text style={[typography.heading, { color: colors.text }]}>
                Recent Inquiries
              </Text>
              <TouchableOpacity
                onPress={() => setShowCreateForm((prev) => !prev)}
                style={[
                  styles.createTicketBtn,
                  { backgroundColor: colors.primary, borderRadius: radius.button },
                ]}
              >
                <Plus size={16} color="#FFFFFF" strokeWidth={2} />
                <Text style={[typography.caption, { color: '#FFFFFF', fontWeight: '700', marginLeft: 4 }]}>
                  {showCreateForm ? 'Close Form' : 'New Ticket'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Create Ticket Form */}
            {showCreateForm && (
              <Card padding={spacing.base} style={{ marginBottom: spacing.lg, borderColor: colors.primary, borderWidth: 1.5 }}>
                <Text style={[typography.heading, { color: colors.text, fontSize: 16 }]}>
                  Open a Support Ticket
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
                  title="Submit Ticket"
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
                  No support tickets
                </Text>
                <Text style={[typography.caption, { color: colors.textMuted, marginTop: 4, textAlign: 'center' }]}>
                  Need help with course access or payment? Click "New Ticket" to message our team.
                </Text>
              </Card>
            ) : (
              <View style={{ gap: 12 }}>
                {tickets.map((t) => (
                  <Card key={t.id} padding={spacing.base}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Badge
                        label={t.status.toUpperCase()}
                        variant={t.status === 'resolved' ? 'success' : 'neutral'}
                        size="sm"
                      />
                      <Text style={[typography.caption, { color: colors.textMuted }]}>
                        {t.category}
                      </Text>
                    </View>

                    <Text style={[typography.heading, { color: colors.text, marginTop: spacing.xs, fontSize: 16 }]}>
                      {t.subject}
                    </Text>

                    <Text style={[typography.body, { color: colors.textMuted, marginTop: 4, fontSize: 14 }]}>
                      {t.message}
                    </Text>

                    {t.adminReply && (
                      <View
                        style={{
                          backgroundColor: colors.surface,
                          borderColor: colors.border,
                          borderLeftColor: colors.primary,
                          borderLeftWidth: 3,
                          padding: 10,
                          borderRadius: 8,
                          marginTop: 10,
                        }}
                      >
                        <Text style={[typography.caption, { color: colors.primary, fontWeight: '700' }]}>
                          Administrator Reply:
                        </Text>
                        <Text style={[typography.body, { color: colors.text, fontSize: 13, marginTop: 2 }]}>
                          {t.adminReply}
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
});