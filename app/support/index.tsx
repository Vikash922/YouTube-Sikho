import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Linking,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  MessageCircle,
  Phone,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Send,
  CheckCircle,
} from 'lucide-react-native';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { useThemeColors } from '../../src/theme';
import { firebaseFirestore, firebaseAuth } from '../../src/services/firebase';
import { clientConfig } from '../../src/config/client.config';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

export default function SupportScreen() {
  const router = useRouter();
  const colors = useThemeColors();

  const [faqs, setFaqs] = useState<FAQItem[]>([]);
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>(null);

  // Ticket Form
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [ticketSuccess, setTicketSuccess] = useState(false);

  const user = firebaseAuth.currentUser;

  // Real-time listener for FAQs
  useEffect(() => {
    const q = query(collection(firebaseFirestore, 'faqs'), orderBy('order', 'asc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs
          .map((d) => ({ id: d.id, ...d.data() } as FAQItem));
        setFaqs(list);
      },
      (err) => {
        console.warn('FAQ load warning:', err.message);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleOpenWhatsApp = () => {
    const phone = clientConfig.supportWhatsApp || '+919876543210';
    const text = encodeURIComponent('Hello YouTube Sikho Support! I need help with my course.');
    Linking.openURL(`whatsapp://send?phone=${phone}&text=${text}`).catch(() => {
      Alert.alert('WhatsApp Not Installed', 'Please install WhatsApp or contact us via Phone/Email.');
    });
  };

  const handleCallSupport = () => {
    const phone = clientConfig.supportPhone || '+919876543210';
    Linking.openURL(`tel:${phone}`);
  };

  const handleToggleFaq = (id: string) => {
    setExpandedFaqId((prev) => (prev === id ? null : id));
  };

  const handleSubmitTicket = async () => {
    if (!subject.trim() || !message.trim()) {
      Alert.alert('Incomplete Form', 'Please enter both subject and message.');
      return;
    }

    setSubmitting(true);
    try {
      await addDoc(collection(firebaseFirestore, 'tickets'), {
        uid: user?.uid || 'guest_user',
        userName: user?.displayName || 'Student',
        email: user?.email || '',
        subject: subject.trim(),
        message: message.trim(),
        status: 'open',
        createdAt: serverTimestamp(),
      });

      setTicketSuccess(true);
      setSubject('');
      setMessage('');
      setTimeout(() => setTicketSuccess(false), 5000);
    } catch (err: any) {
      Alert.alert('Submission Error', err.message || 'Could not submit support ticket.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.headerBar,
          { backgroundColor: colors.surface, borderBottomColor: colors.border },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.headerBtn}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          Help & Support
        </Text>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 1. Direct Contact Channels */}
        <View style={styles.channelsRow}>
          <TouchableOpacity
            onPress={handleOpenWhatsApp}
            style={[
              styles.channelCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Chat on WhatsApp"
          >
            <View style={[styles.channelIconCircle, { backgroundColor: colors.successBg }]}>
              <MessageCircle size={24} color={colors.semanticSuccess} />
            </View>
            <Text style={[styles.channelTitle, { color: colors.textPrimary }]}>
              WhatsApp Support
            </Text>
            <Text style={[styles.channelSubtitle, { color: colors.textSecondary }]}>
              Chat directly with our team
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleCallSupport}
            style={[
              styles.channelCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Call Support"
          >
            <View style={[styles.channelIconCircle, { backgroundColor: colors.accentMuted }]}>
              <Phone size={24} color={colors.primary} />
            </View>
            <Text style={[styles.channelTitle, { color: colors.textPrimary }]}>
              Phone Hotline
            </Text>
            <Text style={[styles.channelSubtitle, { color: colors.textSecondary }]}>
              Mon–Sat (10 AM to 7 PM)
            </Text>
          </TouchableOpacity>
        </View>

        {/* 2. Interactive FAQ Accordion */}
        <View style={styles.sectionWrapper}>
          <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>
            Frequently Asked Questions
          </Text>

          {faqs.length === 0 ? (
            <View style={[styles.emptyFaqBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <HelpCircle size={28} color={colors.textTertiary} />
              <Text style={[styles.emptyFaqText, { color: colors.textSecondary }]}>
                FAQs are loading...
              </Text>
            </View>
          ) : (
            <View style={styles.faqList}>
              {faqs.map((faq) => {
                const isExpanded = expandedFaqId === faq.id;

                return (
                  <View
                    key={faq.id}
                    style={[
                      styles.faqCard,
                      { backgroundColor: colors.surface, borderColor: colors.border },
                    ]}
                  >
                    <TouchableOpacity
                      onPress={() => handleToggleFaq(faq.id)}
                      style={styles.faqHeader}
                      accessibilityRole="button"
                      accessibilityLabel={faq.question}
                    >
                      <Text style={[styles.faqQuestionText, { color: colors.textPrimary }]}>
                        {faq.question}
                      </Text>
                      {isExpanded ? (
                        <ChevronUp size={20} color={colors.primary} />
                      ) : (
                        <ChevronDown size={20} color={colors.textSecondary} />
                      )}
                    </TouchableOpacity>

                    {isExpanded && (
                      <View style={[styles.faqBody, { borderTopColor: colors.border }]}>
                        <Text style={[styles.faqAnswerText, { color: colors.textSecondary }]}>
                          {faq.answer}
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* 3. Submit Support Ticket Form */}
        <View
          style={[
            styles.ticketCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.ticketTitle, { color: colors.textPrimary }]}>
            Submit a Help Ticket
          </Text>
          <Text style={[styles.ticketSubtitle, { color: colors.textSecondary }]}>
            Can't find what you need? Send us a ticket and our academic mentor will reply within 24 hours.
          </Text>

          {ticketSuccess && (
            <View style={[styles.successBanner, { backgroundColor: colors.successBg, borderColor: colors.semanticSuccess }]}>
              <CheckCircle size={18} color={colors.semanticSuccess} />
              <Text style={[styles.successText, { color: colors.semanticSuccess }]}>
                Ticket submitted! We will email you shortly.
              </Text>
            </View>
          )}

          <View style={styles.formGroup}>
            <TextInput
              value={subject}
              onChangeText={setSubject}
              placeholder="Issue Subject (e.g. Payment receipt or Video lag)"
              placeholderTextColor={colors.textTertiary}
              style={[
                styles.input,
                { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.border },
              ]}
            />

            <TextInput
              value={message}
              onChangeText={setMessage}
              placeholder="Describe your question or difficulty in detail..."
              placeholderTextColor={colors.textTertiary}
              multiline
              numberOfLines={4}
              style={[
                styles.textArea,
                { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.border },
              ]}
            />

            <TouchableOpacity
              onPress={handleSubmitTicket}
              disabled={submitting}
              style={[styles.submitTicketBtn, { backgroundColor: colors.primary }]}
              accessibilityRole="button"
              accessibilityLabel="Submit Ticket"
            >
              {submitting ? (
                <ActivityIndicator size="small" color={colors.surface} />
              ) : (
                <>
                  <Send size={18} color={colors.surface} />
                  <Text style={[styles.submitTicketText, { color: colors.surface }]}>
                    Submit Ticket
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBar: {
    height: 64,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  headerBtn: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 20,
  },
  channelsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  channelCard: {
    flex: 1,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    textAlign: 'center',
  },
  channelIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  channelTitle: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  channelSubtitle: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 2,
  },
  sectionWrapper: {
    gap: 12,
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: '700',
  },
  emptyFaqBox: {
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyFaqText: {
    fontSize: 13,
  },
  faqList: {
    gap: 10,
  },
  faqCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  faqHeader: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  faqQuestionText: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    lineHeight: 20,
  },
  faqBody: {
    borderTopWidth: 1,
    padding: 16,
    paddingTop: 12,
  },
  faqAnswerText: {
    fontSize: 13,
    lineHeight: 20,
  },
  ticketCard: {
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
  },
  ticketTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  ticketSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
    marginBottom: 16,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  successText: {
    fontSize: 13,
    fontWeight: '600',
  },
  formGroup: {
    gap: 12,
  },
  input: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 14,
  },
  textArea: {
    height: 100,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  submitTicketBtn: {
    minHeight: 48,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitTicketText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
