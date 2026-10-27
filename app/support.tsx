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
  Modal,
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
  X,
  MessageSquare,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import {
  collection,
  onSnapshot,
  query,
  where,
  orderBy,
  addDoc,
  updateDoc,
  doc,
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

export interface TicketMessage {
  id: string;
  senderType: 'student' | 'admin';
  senderUid: string;
  senderName: string;
  text: string;
  createdAt?: any;
}

const DEFAULT_FAQS = [
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
  const [faqsList, setFaqsList] = useState<{ q: string; a: string; category?: string }[]>(DEFAULT_FAQS);
  const [loading, setLoading] = useState(true);

  // Active ticket for conversation thread modal
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [threadMessages, setThreadMessages] = useState<TicketMessage[]>([]);
  const [studentReplyText, setStudentReplyText] = useState('');
  const [sendingStudentReply, setSendingStudentReply] = useState(false);

  // Live subscription to published FAQs
  useEffect(() => {
    const q = query(
      collection(firebaseFirestore, 'faqs'),
      where('isPublished', '==', true)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        if (!snap.empty) {
          const list = snap.docs
            .map((d) => {
              const data = d.data();
              return {
                q: data.question || data.q || '',
                a: data.answer || data.a || '',
                order: data.order || 0,
                category: data.category || 'General',
              };
            })
            .sort((a, b) => a.order - b.order)
            .map(({ q, a, category }) => ({ q, a, category }));
          setFaqsList(list);
        } else {
          setFaqsList(DEFAULT_FAQS);
        }
      },
      (err) => {
        console.warn('FAQs listener notice:', err.message);
        setFaqsList(DEFAULT_FAQS);
      }
    );
    return () => unsub();
  }, []);

  // New ticket modal/form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState<'payment' | 'course_access' | 'video_playback' | 'other'>('course_access');
  const [submitting, setSubmitting] = useState(false);

  // Live subscription to user's tickets
  useEffect(() => {
    const authUser = firebaseAuth.currentUser;
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
        const list = snapshot.docs.map((d) => {
          const data = d.data();
          const rawStatus = data.status === 'closed' ? 'resolved' : data.status || 'open';
          return {
            id: d.id,
            ...data,
            status: rawStatus,
          } as SupportTicket;
        });
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

  // Live listener for thread messages of selected ticket
  useEffect(() => {
    if (!selectedTicket?.id) {
      setThreadMessages([]);
      return;
    }
    const msgsRef = collection(firebaseFirestore, 'tickets', selectedTicket.id, 'messages');
    const q = query(msgsRef, orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        } as TicketMessage));
        setThreadMessages(list);
      },
      (err) => {
        console.warn('Thread messages listener notice:', err.message);
      }
    );
    return () => unsub();
  }, [selectedTicket?.id]);

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
      Alert.alert('Ticket Submitted', 'Our support team will respond shortly.');
      setSubject('');
      setMessage('');
      setShowCreateForm(false);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not submit ticket.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendStudentReply = async () => {
    if (!selectedTicket || !studentReplyText.trim()) return;
    const authUser = firebaseAuth.currentUser;
    if (!authUser) return;

    setSendingStudentReply(true);
    try {
      const msgsRef = collection(firebaseFirestore, 'tickets', selectedTicket.id, 'messages');
      await addDoc(msgsRef, {
        senderType: 'student',
        senderUid: authUser.uid,
        senderName: profile?.name || 'Student',
        text: studentReplyText.trim(),
        createdAt: serverTimestamp(),
      });

      // Update ticket updatedAt timestamp
      await updateDoc(doc(firebaseFirestore, 'tickets', selectedTicket.id), {
        updatedAt: serverTimestamp(),
      });

      setStudentReplyText('');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not send message.');
    } finally {
      setSendingStudentReply(false);
    }
  };

  const handleMarkResolved = async (ticketId: string) => {
    try {
      await updateDoc(doc(firebaseFirestore, 'tickets', ticketId), {
        status: 'resolved',
        updatedAt: serverTimestamp(),
      });
      if (selectedTicket && selectedTicket.id === ticketId) {
        setSelectedTicket((prev) => (prev ? { ...prev, status: 'resolved' } : null));
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Ticket Resolved', 'Thank you! Glad we could help.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not update ticket.');
    }
  };

  const supportWhatsApp = config?.supportWhatsApp || clientConfig.supportWhatsApp;
  const supportPhone = config?.supportPhone || clientConfig.supportPhone;

  const handleOpenWhatsApp = () => {
    if (!supportWhatsApp) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const clean = supportWhatsApp.replace(/\D/g, '');
    Linking.openURL(`https://wa.me/${clean}`).catch(() => {});
  };

  const handleCallSupport = () => {
    if (!supportPhone) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const cleanPhone = supportPhone.replace(/[^\d+]/g, '');
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
        {(supportWhatsApp || supportPhone) && (
          <Animated.View entering={FadeInDown.duration(300)} style={{ marginTop: spacing.md }}>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {supportWhatsApp ? (
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
              ) : null}

              {supportPhone ? (
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
              ) : null}
            </View>
          </Animated.View>
        )}

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
                  Need help with course access or payment? Click &quot;New Ticket&quot; to message our team.
                </Text>
              </Card>
            ) : (
              <View style={{ gap: 12 }}>
                {tickets.map((tItem) => (
                  <Card
                    key={tItem.id}
                    onPress={() => setSelectedTicket(tItem)}
                    padding={spacing.base}
                    style={styles.ticketCard}
                  >
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
                            OFFICIAL RESPONSE
                          </Text>
                        </View>
                        <Text style={[typography.body, { color: colors.text, fontSize: 13, marginTop: 4, lineHeight: 18 }]}>
                          {tItem.adminReply}
                        </Text>
                      </View>
                    )}

                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 10 }}>
                      <Text style={[typography.caption, { color: colors.primary, fontWeight: '600' }]}>
                        View Conversation Thread →
                      </Text>
                    </View>
                  </Card>
                ))}
              </View>
            )}
          </View>
        )}

        {/* 3. FAQs Tab View */}
        {activeTab === 'faqs' && (
          <View style={{ marginTop: spacing.base, gap: 12 }}>
            {faqsList.map((faq, i) => (
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

      {/* TICKET THREAD MODAL FOR STUDENT */}
      <Modal
        visible={!!selectedTicket}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedTicket(null)}
      >
        <Screen style={{ backgroundColor: colors.background }}>
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
            <View style={{ flex: 1 }}>
              <Text style={[typography.title, { color: colors.text }]} numberOfLines={1}>
                {selectedTicket?.subject}
              </Text>
              <Text style={[typography.caption, { color: colors.textMuted }]}>
                Status: {(selectedTicket?.status || 'open').replace('_', ' ').toUpperCase()}
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => setSelectedTicket(null)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={[styles.backButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <X size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={{ padding: spacing.screen, paddingBottom: 100 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Initial Query Box */}
            <Card padding={spacing.base} style={{ marginBottom: spacing.md }}>
              <Text style={[typography.caption, { color: colors.textMuted, fontWeight: '700' }]}>
                INITIAL QUERY
              </Text>
              <Text style={[typography.body, { color: colors.text, marginTop: 6, lineHeight: 20 }]}>
                {selectedTicket?.message}
              </Text>
            </Card>

            {/* Conversation Thread */}
            <Text style={[typography.heading, { color: colors.text, fontSize: 14, marginBottom: spacing.sm }]}>
              Conversation History
            </Text>

            {threadMessages.length === 0 ? (
              <Card padding={spacing.base} style={{ alignItems: 'center', marginVertical: 8 }}>
                <MessageSquare size={24} color={colors.textMuted} />
                <Text style={[typography.caption, { color: colors.textMuted, marginTop: 6 }]}>
                  No responses yet. Support will reply here.
                </Text>
              </Card>
            ) : (
              <View style={{ gap: 10 }}>
                {threadMessages.map((msg) => {
                  const isStudent = msg.senderType === 'student';
                  return (
                    <View
                      key={msg.id}
                      style={{
                        alignSelf: isStudent ? 'flex-end' : 'flex-start',
                        maxWidth: '85%',
                        backgroundColor: isStudent ? colors.primary : colors.surface,
                        borderColor: colors.border,
                        borderWidth: isStudent ? 0 : 1,
                        padding: spacing.sm + 4,
                        borderRadius: radius.card,
                      }}
                    >
                      <Text
                        style={[
                          typography.caption,
                          {
                            color: isStudent ? 'rgba(255,255,255,0.8)' : colors.primary,
                            fontWeight: '700',
                            fontSize: 11,
                          },
                        ]}
                      >
                        {msg.senderName || (isStudent ? 'You' : 'Instructor Support')}
                      </Text>
                      <Text
                        style={[
                          typography.body,
                          {
                            color: isStudent ? '#FFFFFF' : colors.text,
                            marginTop: 4,
                            lineHeight: 18,
                            fontSize: 13,
                          },
                        ]}
                      >
                        {msg.text}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Mark as resolved option */}
            {selectedTicket && selectedTicket.status !== 'resolved' && (
              <View style={{ marginTop: spacing.xl, alignItems: 'center' }}>
                <TouchableOpacity
                  onPress={() => handleMarkResolved(selectedTicket.id)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    borderRadius: radius.button,
                    backgroundColor: colors.surface,
                    borderColor: colors.success,
                    borderWidth: 1,
                  }}
                >
                  <CheckCircle2 size={16} color={colors.success} />
                  <Text style={[typography.caption, { color: colors.success, fontWeight: '700' }]}>
                    Mark Ticket as Resolved
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>

          {/* Reply Bar */}
          <View
            style={[
              styles.replyBar,
              {
                paddingBottom: insets.bottom + 8,
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <TextInput
              style={[
                styles.replyInput,
                typography.body,
                {
                  backgroundColor: colors.background,
                  color: colors.text,
                  borderColor: colors.border,
                  borderRadius: radius.input,
                },
              ]}
              placeholder="Type your response..."
              placeholderTextColor={colors.textMuted}
              value={studentReplyText}
              onChangeText={setStudentReplyText}
            />
            <TouchableOpacity
              onPress={handleSendStudentReply}
              disabled={sendingStudentReply || !studentReplyText.trim()}
              style={[
                styles.sendBtn,
                {
                  backgroundColor: colors.primary,
                  opacity: sendingStudentReply || !studentReplyText.trim() ? 0.5 : 1,
                  borderRadius: radius.button,
                },
              ]}
            >
              <Send size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </Screen>
      </Modal>
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
    flexGrow: 1,
    paddingBottom: 40,
  },
  quickContactBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
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
  },
  createTicketBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  inputField: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
  },
  ticketCard: {
    borderWidth: 1,
  },
  ticketTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusNotch: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  adminReplyBubble: {
    marginTop: 12,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderLeftWidth: 3,
  },
  adminHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  replyBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderTopWidth: 1,
    gap: 8,
  },
  replyInput: {
    flex: 1,
    height: 44,
    paddingHorizontal: 14,
    borderWidth: 1,
  },
  sendBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
