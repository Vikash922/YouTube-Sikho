import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Clock,
  ArrowLeft,
  Bookmark,
  CheckCircle,
  HelpCircle,
  Send,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Flame,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useThemeColors } from '../../src/theme';
import {
  QuizMetadata,
  QuizQuestionClient,
  fetchQuizMetadata,
  fetchQuizQuestions,
  saveLocalQuizProgress,
  restoreLocalQuizProgress,
  submitQuizToServer,
} from '../../src/services/quizService';

export default function QuizTakingScreen() {
  const { quizId } = useLocalSearchParams<{ quizId: string }>();
  const router = useRouter();
  const colors = useThemeColors();

  const [quiz, setQuiz] = useState<QuizMetadata | null>(null);
  const [questions, setQuestions] = useState<QuizQuestionClient[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [markedForReview, setMarkedForReview] = useState<string[]>([]);
  const [remainingSeconds, setRemainingSeconds] = useState(15 * 60);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isSubmitModalVisible, setIsSubmitModalVisible] = useState(false);

  const totalTimeSeconds = useRef(15 * 60);

  // 1. Load Quiz and Questions + Restore Autosave
  useEffect(() => {
    if (!quizId) return;

    const loadData = async () => {
      try {
        const [meta, qList] = await Promise.all([
          fetchQuizMetadata(quizId),
          fetchQuizQuestions(quizId),
        ]);

        if (!meta) {
          Alert.alert('Quiz Not Found', 'This quiz could not be loaded.');
          router.back();
          return;
        }

        setQuiz(meta);
        setQuestions(qList);

        const durationSec = meta.durationMinutes * 60;
        totalTimeSeconds.current = durationSec;

        // Restore any autosaved state
        const saved = await restoreLocalQuizProgress(quizId);
        if (saved) {
          setAnswers(saved.answers || {});
          setMarkedForReview(saved.markedForReview || []);
          setRemainingSeconds(saved.remainingSeconds > 0 ? saved.remainingSeconds : durationSec);
        } else {
          setRemainingSeconds(durationSec);
        }
      } catch (err: any) {
        Alert.alert('Error', err.message || 'Could not load quiz.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [quizId]);

  // 2. Countdown Timer Loop
  useEffect(() => {
    if (loading || submitting || remainingSeconds <= 0) return;

    const timer = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [loading, submitting, remainingSeconds]);

  // 3. Periodic Autosave
  useEffect(() => {
    if (loading || !quizId) return;
    saveLocalQuizProgress(quizId, {
      answers,
      markedForReview,
      remainingSeconds,
    });
  }, [answers, markedForReview, remainingSeconds, quizId, loading]);

  const handleAutoSubmit = () => {
    Alert.alert('Time Up!', 'The timer has expired. Your quiz will now be automatically evaluated.', [
      { text: 'Submit Now', onPress: executeSubmit },
    ]);
  };

  const handleSelectOption = (optionIndex: number) => {
    const currentQ = questions[currentIndex];
    if (!currentQ) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setAnswers((prev) => ({
      ...prev,
      [currentQ.id]: optionIndex,
    }));
  };

  const handleToggleMarkReview = () => {
    const currentQ = questions[currentIndex];
    if (!currentQ) return;

    Haptics.selectionAsync();
    setMarkedForReview((prev) =>
      prev.includes(currentQ.id)
        ? prev.filter((id) => id !== currentQ.id)
        : [...prev, currentQ.id]
    );
  };

  const executeSubmit = async () => {
    if (!quizId || submitting) return;
    setSubmitting(true);
    setIsSubmitModalVisible(false);

    const timeTaken = totalTimeSeconds.current - remainingSeconds;

    try {
      const result = await submitQuizToServer(quizId, answers, timeTaken);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace(`/quiz/result/${result.resultId}` as any);
    } catch (err: any) {
      setSubmitting(false);
      Alert.alert('Submission Error', err.message || 'Could not submit quiz.');
    }
  };

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Loading test questions...
        </Text>
      </View>
    );
  }

  if (questions.length === 0) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <AlertCircle size={48} color={colors.semanticWarning} />
        <Text style={[styles.errorTitle, { color: colors.textPrimary }]}>
          Questions Pending
        </Text>
        <Text style={[styles.errorSubtitle, { color: colors.textSecondary }]}>
          The instructor has not added questions to this checkpoint yet.
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backBtn, { backgroundColor: colors.primary }]}
        >
          <Text style={[styles.backBtnText, { color: colors.surface }]}>
            Back to Course
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const currentQuestion = questions[currentIndex];
  const selectedOptionIndex = answers[currentQuestion.id];
  const isMarked = markedForReview.includes(currentQuestion.id);

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const answeredCount = Object.keys(answers).length;
  const unattemptedCount = questions.length - answeredCount;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* 1. Header with Back Button & Tabular Timer */}
      <View
        style={[
          styles.headerBar,
          { backgroundColor: colors.surface, borderBottomColor: colors.border },
        ]}
      >
        <TouchableOpacity
          onPress={() => {
            Alert.alert(
              'Exit Quiz?',
              'Your progress is saved locally. You can resume anytime before submission.',
              [
                { text: 'Resume Test', style: 'cancel' },
                { text: 'Exit', style: 'destructive', onPress: () => router.back() },
              ]
            );
          }}
          style={styles.headerIconButton}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <ArrowLeft size={22} color={colors.textPrimary} />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: colors.textPrimary }]} numberOfLines={1}>
          {quiz?.title || 'Checkpoint Quiz'}
        </Text>

        {/* Timer Badge with Tabular Numbers */}
        <View
          style={[
            styles.timerPill,
            {
              backgroundColor: remainingSeconds < 120 ? colors.errorBg : colors.accentMuted,
              borderColor: remainingSeconds < 120 ? colors.error : colors.primary,
            },
          ]}
        >
          <Clock
            size={14}
            color={remainingSeconds < 120 ? colors.error : colors.primary}
          />
          <Text
            style={[
              styles.timerText,
              {
                color: remainingSeconds < 120 ? colors.error : colors.primary,
              },
            ]}
          >
            {formatTimer(remainingSeconds)}
          </Text>
        </View>
      </View>

      {/* 2. Horizontal Question Palette */}
      <View
        style={[
          styles.paletteContainer,
          { backgroundColor: colors.surface, borderBottomColor: colors.border },
        ]}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.paletteScroll}
        >
          {questions.map((q, idx) => {
            const hasAnswered = answers[q.id] !== undefined;
            const isQMarked = markedForReview.includes(q.id);
            const isCurrent = idx === currentIndex;

            return (
              <TouchableOpacity
                key={q.id}
                onPress={() => setCurrentIndex(idx)}
                style={[
                  styles.paletteChip,
                  {
                    backgroundColor: isCurrent
                      ? colors.primary
                      : isQMarked
                      ? colors.warningBg
                      : hasAnswered
                      ? colors.accentMuted
                      : colors.surfaceHover,
                    borderColor: isCurrent
                      ? colors.primary
                      : isQMarked
                      ? colors.warning
                      : hasAnswered
                      ? colors.primary
                      : colors.border,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Question ${idx + 1}`}
              >
                <Text
                  style={[
                    styles.paletteChipText,
                    {
                      color: isCurrent
                        ? colors.surface
                        : isQMarked
                        ? colors.warning
                        : hasAnswered
                        ? colors.primary
                        : colors.textSecondary,
                    },
                  ]}
                >
                  {idx + 1}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* 3. Question Body Card */}
      <ScrollView
        contentContainerStyle={styles.bodyContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Meta badges */}
        <View style={styles.questionMetaRow}>
          <Text style={[styles.qIndexText, { color: colors.primary }]}>
            Question {currentIndex + 1} of {questions.length}
          </Text>
          <View style={[styles.marksBadge, { backgroundColor: colors.surfaceHover }]}>
            <Text style={[styles.marksText, { color: colors.textSecondary }]}>
              +{currentQuestion.marks} Marks
            </Text>
          </View>
        </View>

        {/* Question Text */}
        <Text style={[styles.questionText, { color: colors.textPrimary }]}>
          {currentQuestion.questionText}
        </Text>

        {/* Options List */}
        <View style={styles.optionsList}>
          {currentQuestion.options.map((option, idx) => {
            const isSelected = selectedOptionIndex === idx;

            return (
              <TouchableOpacity
                key={idx}
                onPress={() => handleSelectOption(idx)}
                activeOpacity={0.8}
                style={[
                  styles.optionCard,
                  {
                    backgroundColor: isSelected ? colors.accentMuted : colors.surface,
                    borderColor: isSelected ? colors.primary : colors.border,
                  },
                ]}
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={`Option ${String.fromCharCode(65 + idx)}: ${option}`}
              >
                <View
                  style={[
                    styles.optionLetterCircle,
                    {
                      backgroundColor: isSelected ? colors.primary : colors.surfaceHover,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.optionLetterText,
                      { color: isSelected ? colors.surface : colors.textPrimary },
                    ]}
                  >
                    {String.fromCharCode(65 + idx)}
                  </Text>
                </View>

                <Text
                  style={[
                    styles.optionText,
                    {
                      color: isSelected ? colors.textPrimary : colors.textSecondary,
                      fontWeight: isSelected ? '600' : '400',
                    },
                  ]}
                >
                  {option}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* 4. Bottom Action Bar (48px Touch Targets) */}
      <View
        style={[
          styles.bottomBar,
          { backgroundColor: colors.surface, borderTopColor: colors.border },
        ]}
      >
        <TouchableOpacity
          onPress={handleToggleMarkReview}
          style={[
            styles.reviewButton,
            {
              backgroundColor: isMarked ? colors.warningBg : colors.surfaceHover,
              borderColor: isMarked ? colors.warning : colors.border,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel={isMarked ? 'Marked for review' : 'Mark for review'}
        >
          <Bookmark size={18} color={isMarked ? colors.warning : colors.textSecondary} />
        </TouchableOpacity>

        <View style={styles.navButtonsGroup}>
          <TouchableOpacity
            onPress={() => setCurrentIndex((i) => Math.max(0, i - 1))}
            disabled={currentIndex === 0}
            style={[
              styles.navBtn,
              {
                backgroundColor: colors.surfaceHover,
                borderColor: colors.border,
                opacity: currentIndex === 0 ? 0.4 : 1,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Previous Question"
          >
            <ChevronLeft size={20} color={colors.textPrimary} />
          </TouchableOpacity>

          {currentIndex < questions.length - 1 ? (
            <TouchableOpacity
              onPress={() => setCurrentIndex((i) => Math.min(questions.length - 1, i + 1))}
              style={[
                styles.navBtn,
                { backgroundColor: colors.primary, borderColor: colors.primary },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Next Question"
            >
              <ChevronRight size={20} color={colors.surface} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={() => setIsSubmitModalVisible(true)}
              style={[
                styles.finishBtn,
                { backgroundColor: colors.semanticSuccess },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Submit Quiz"
            >
              <Send size={16} color={colors.surface} />
              <Text style={[styles.finishBtnText, { color: colors.surface }]}>
                Submit
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* 5. Submit Confirmation Bottom Sheet Modal */}
      <Modal
        visible={isSubmitModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsSubmitModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalSheet,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
              Ready to Submit?
            </Text>
            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
              Check your test summary before finalizing submission.
            </Text>

            {/* Test Summary Grid */}
            <View style={styles.summaryGrid}>
              <View style={[styles.summaryTile, { backgroundColor: colors.surfaceHover }]}>
                <Text style={[styles.summaryNumber, { color: colors.semanticSuccess }]}>
                  {answeredCount}
                </Text>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                  Answered
                </Text>
              </View>

              <View style={[styles.summaryTile, { backgroundColor: colors.surfaceHover }]}>
                <Text style={[styles.summaryNumber, { color: colors.semanticWarning }]}>
                  {markedForReview.length}
                </Text>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                  Marked
                </Text>
              </View>

              <View style={[styles.summaryTile, { backgroundColor: colors.surfaceHover }]}>
                <Text style={[styles.summaryNumber, { color: colors.textTertiary }]}>
                  {unattemptedCount}
                </Text>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                  Unanswered
                </Text>
              </View>
            </View>

            {/* Modal Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={executeSubmit}
                disabled={submitting}
                style={[
                  styles.modalSubmitBtn,
                  { backgroundColor: colors.primary },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Confirm Submit Quiz"
              >
                {submitting ? (
                  <ActivityIndicator size="small" color={colors.surface} />
                ) : (
                  <Text style={[styles.modalSubmitText, { color: colors.surface }]}>
                    Confirm & View Score
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setIsSubmitModalVisible(false)}
                disabled={submitting}
                style={[styles.modalCancelBtn, { borderColor: colors.border }]}
                accessibilityRole="button"
                accessibilityLabel="Resume Test"
              >
                <Text style={[styles.modalCancelText, { color: colors.textSecondary }]}>
                  Keep Reviewing
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    paddingHorizontal: 16,
    justifyContent: 'space-between',
    gap: 12,
  },
  headerIconButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  timerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
  },
  timerText: {
    fontSize: 13,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  paletteContainer: {
    borderBottomWidth: 1,
    paddingVertical: 8,
  },
  paletteScroll: {
    paddingHorizontal: 16,
    gap: 8,
    flexDirection: 'row',
  },
  paletteChip: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paletteChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  bodyContent: {
    padding: 20,
    paddingBottom: 40,
  },
  questionMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  qIndexText: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  marksBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  marksText: {
    fontSize: 11,
    fontWeight: '600',
  },
  questionText: {
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 26,
    marginBottom: 24,
  },
  optionsList: {
    gap: 12,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    gap: 12,
  },
  optionLetterCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionLetterText: {
    fontSize: 13,
    fontWeight: '700',
  },
  optionText: {
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  bottomBar: {
    height: 72,
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    justifyContent: 'space-between',
  },
  reviewButton: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navButtonsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  navBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  finishBtn: {
    height: 48,
    paddingHorizontal: 20,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  finishBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 8,
  },
  errorSubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  backBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    padding: 24,
    paddingBottom: 36,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 20,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  summaryTile: {
    flex: 1,
    padding: 14,
    borderRadius: 16,
    alignItems: 'center',
  },
  summaryNumber: {
    fontSize: 22,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  modalActions: {
    gap: 10,
  },
  modalSubmitBtn: {
    minHeight: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSubmitText: {
    fontSize: 15,
    fontWeight: '700',
  },
  modalCancelBtn: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
