import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  AppState,
  AppStateStatus,
  BackHandler,
  Platform,
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
  X,
  FileQuestion,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import { useQuizCardSwipe } from '../../src/motion/hooks/useQuizCardSwipe';
import { useThemeColors } from '../../src/theme';
import {
  startQuizSession,
  submitQuizToServer,
  saveLocalQuizProgress,
  restoreLocalQuizProgress,
  clearLocalQuizProgress,
  QuizQuestionClient,
  StartQuizSessionResponse,
} from '../../src/services/quizService';

export default function QuizTakingScreen() {
  const { quizId } = useLocalSearchParams<{ quizId: string }>();
  const router = useRouter();
  const colors = useThemeColors();

  const [session, setSession] = useState<StartQuizSessionResponse | null>(null);
  const [questions, setQuestions] = useState<QuizQuestionClient[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [markedForReview, setMarkedForReview] = useState<string[]>([]);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isSubmitModalVisible, setIsSubmitModalVisible] = useState(false);

  // Server Time Offset Tracking (serverNow - clientNow)
  const serverOffsetRef = useRef<number>(0);
  const expiresAtMsRef = useRef<number>(0);
  const timerIntervalRef = useRef<any>(null);
  const autoSubmittedRef = useRef<boolean>(false);

  // 1. Initialize Server-Authoritative Quiz Session & Restore Autosave
  useEffect(() => {
    if (!quizId) return;

    let isMounted = true;

    const initQuiz = async () => {
      try {
        const sess = await startQuizSession(quizId);
        if (!isMounted) return;

        setSession(sess);
        setQuestions(sess.questions || []);

        // Compute clock sync offset
        const clientNow = Date.now();
        const serverNowMs = sess.serverNow ? Date.parse(sess.serverNow) : clientNow;
        serverOffsetRef.current = serverNowMs - clientNow;
        expiresAtMsRef.current = sess.expiresAt;

        // Calculate initial remaining seconds
        const currentServerNow = clientNow + serverOffsetRef.current;
        const initialRemaining = Math.max(0, Math.floor((sess.expiresAt - currentServerNow) / 1000));
        setRemainingSeconds(initialRemaining);

        // Check and restore local autosave if valid for current attempt
        const saved = await restoreLocalQuizProgress(quizId);
        if (saved && saved.attemptId === sess.attemptId) {
          setAnswers(saved.answers || {});
          setMarkedForReview(saved.markedForReview || []);
          if (typeof saved.currentIndex === 'number' && saved.currentIndex < sess.questions.length) {
            setCurrentIndex(saved.currentIndex);
          }
        } else if (saved && saved.attemptId !== sess.attemptId) {
          // Discard stale autosave from a past attempt
          await clearLocalQuizProgress(quizId);
        }
      } catch (err: any) {
        if (!isMounted) return;
        Alert.alert('Quiz Notice', err.message || 'Could not load quiz session.', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    initQuiz();

    return () => {
      isMounted = false;
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [quizId]);

  // 2. Authoritative Timer Loop using Server expiresAt & AppState Resumption
  const recomputeRemainingTime = useCallback(() => {
    if (!expiresAtMsRef.current) return 0;
    const currentServerNow = Date.now() + serverOffsetRef.current;
    const diffSeconds = Math.max(0, Math.floor((expiresAtMsRef.current - currentServerNow) / 1000));
    setRemainingSeconds(diffSeconds);
    return diffSeconds;
  }, []);

  useEffect(() => {
    if (loading || submitting || !expiresAtMsRef.current) return;

    // Start single ticking interval
    timerIntervalRef.current = setInterval(() => {
      const remaining = recomputeRemainingTime();
      if (remaining <= 0 && !autoSubmittedRef.current) {
        autoSubmittedRef.current = true;
        clearInterval(timerIntervalRef.current);
        handleAutoSubmit();
      }
    }, 1000);

    // AppState Foreground Re-sync
    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        const remaining = recomputeRemainingTime();
        if (remaining <= 0 && !autoSubmittedRef.current) {
          autoSubmittedRef.current = true;
          if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
          handleAutoSubmit();
        }
      }
    });

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      subscription.remove();
    };
  }, [loading, submitting, recomputeRemainingTime]);

  // 3. Autosave on every answer / review change
  useEffect(() => {
    if (loading || !quizId || !session?.attemptId) return;
    saveLocalQuizProgress(quizId, {
      attemptId: session.attemptId,
      answers,
      markedForReview,
      currentIndex,
    });
  }, [answers, markedForReview, currentIndex, quizId, session?.attemptId, loading]);

  // 4. Exit Protection (Android BackHandler & In-app Confirmation)
  useEffect(() => {
    const onBackPress = () => {
      confirmExit();
      return true;
    };

    const backSub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => backSub.remove();
  }, []);

  const confirmExit = () => {
    Alert.alert(
      'Exit Quiz Session?',
      'Your selected answers are saved locally. However, the official timer continues to tick on the server until expiration.',
      [
        { text: 'Keep Playing', style: 'cancel' },
        {
          text: 'Leave Quiz',
          style: 'destructive',
          onPress: () => router.back(),
        },
      ]
    );
  };

  const handleAutoSubmit = () => {
    Alert.alert(
      'Time Expired!',
      'The time limit for this quiz has ended. Your answers are now being submitted automatically.',
      [{ text: 'Submit Now', onPress: executeSubmit }]
    );
    executeSubmit();
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
    if (!quizId || !session?.attemptId || submitting) return;
    setSubmitting(true);
    setIsSubmitModalVisible(false);

    const startedAt = session.startedAt || Date.now();
    const timeTaken = Math.max(1, Math.round((Date.now() - startedAt) / 1000));

    try {
      const result = await submitQuizToServer(session.attemptId, quizId, answers, timeTaken);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace(`/quiz/result/${result.resultId}` as any);
    } catch (err: any) {
      setSubmitting(false);
      Alert.alert('Submission Error', err.message || 'Could not complete quiz submission.');
    }
  };

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Loading secure quiz session...
        </Text>
      </View>
    );
  }

  if (questions.length === 0) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <AlertCircle size={48} color={colors.semanticWarning} />
        <Text style={[styles.errorTitle, { color: colors.textPrimary }]}>
          No Questions Available
        </Text>
        <Text style={[styles.errorSubtitle, { color: colors.textSecondary }]}>
          This checkpoint has no configured questions at this time.
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backBtn, { backgroundColor: colors.primary }]}
        >
          <Text style={[styles.backBtnText, { color: colors.surface }]}>Back to Course</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const currentQuestion = questions[currentIndex];
  const selectedOptionIndex = currentQuestion ? answers[currentQuestion.id] : undefined;
  const isMarked = currentQuestion ? markedForReview.includes(currentQuestion.id) : false;

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const answeredCount = Object.keys(answers).length;
  const unattemptedCount = Math.max(0, questions.length - answeredCount);
  const markedCount = markedForReview.length;

  const handleNextQuestion = () => {
    setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1));
  };

  const handlePrevQuestion = () => {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  };

  const { gesture: cardSwipeGesture, cardAnimatedStyle } = useQuizCardSwipe({
    onNext: handleNextQuestion,
    onPrev: handlePrevQuestion,
    threshold: 100,
    velocityThreshold: 600,
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* 1. Header Bar */}
      <View
        style={[
          styles.headerBar,
          { backgroundColor: colors.surface, borderBottomColor: colors.border },
        ]}
      >
        <TouchableOpacity
          onPress={confirmExit}
          style={styles.headerIconButton}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <ArrowLeft size={22} color={colors.textPrimary} />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: colors.textPrimary }]} numberOfLines={1}>
          {session?.title || 'Checkpoint Quiz'}
        </Text>

        {/* Tabular Server Timer */}
        <View
          style={[
            styles.timerPill,
            {
              backgroundColor: remainingSeconds < 120 ? colors.errorBg : colors.accentMuted,
              borderColor: remainingSeconds < 120 ? colors.error : colors.primary,
            },
          ]}
        >
          <Clock size={14} color={remainingSeconds < 120 ? colors.error : colors.primary} />
          <Text
            style={[
              styles.timerText,
              { color: remainingSeconds < 120 ? colors.error : colors.primary },
            ]}
          >
            {formatTimer(remainingSeconds)}
          </Text>
        </View>
      </View>

      {/* 2. Question Navigation Strip */}
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
                      : hasAnswered
                      ? colors.successBg
                      : isQMarked
                      ? colors.warningBg
                      : colors.surfaceHover,
                    borderColor: isCurrent
                      ? colors.primary
                      : hasAnswered
                      ? colors.semanticSuccess
                      : isQMarked
                      ? colors.semanticWarning
                      : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.paletteChipText,
                    {
                      color: isCurrent
                        ? colors.surface
                        : hasAnswered
                        ? colors.semanticSuccess
                        : isQMarked
                        ? colors.semanticWarning
                        : colors.textSecondary,
                      fontWeight: isCurrent ? '700' : '600',
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

      {/* 3. Question Body with Swipeable Card Gesture */}
      <GestureDetector gesture={cardSwipeGesture}>
        <Animated.View style={[{ flex: 1 }, cardAnimatedStyle]}>
          <ScrollView
            contentContainerStyle={styles.questionScroll}
            showsVerticalScrollIndicator={false}
          >
        {/* Question Counter Card */}
        <View style={styles.qMetaRow}>
          <Text style={[styles.qIndexLabel, { color: colors.primary }]}>
            Question {currentIndex + 1} of {questions.length}
          </Text>
          <TouchableOpacity
            onPress={handleToggleMarkReview}
            style={[
              styles.reviewBtn,
              {
                backgroundColor: isMarked ? colors.warningBg : colors.surfaceHover,
                borderColor: isMarked ? colors.semanticWarning : colors.border,
              },
            ]}
          >
            <Bookmark
              size={14}
              color={isMarked ? colors.semanticWarning : colors.textSecondary}
            />
            <Text
              style={[
                styles.reviewBtnText,
                { color: isMarked ? colors.semanticWarning : colors.textSecondary },
              ]}
            >
              {isMarked ? 'Marked' : 'Review'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Question Prompt */}
        <Text style={[styles.questionPrompt, { color: colors.textPrimary }]}>
          {currentQuestion?.question || currentQuestion?.questionText}
        </Text>

        {/* Options List */}
        <View style={styles.optionsContainer}>
          {currentQuestion?.options.map((optionText, optIdx) => {
            const isSelected = selectedOptionIndex === optIdx;

            return (
              <TouchableOpacity
                key={optIdx}
                onPress={() => handleSelectOption(optIdx)}
                activeOpacity={0.7}
                style={[
                  styles.optionCard,
                  {
                    backgroundColor: isSelected ? colors.accentMuted : colors.surface,
                    borderColor: isSelected ? colors.primary : colors.border,
                  },
                ]}
              >
                <View
                  style={[
                    styles.optionBadge,
                    {
                      backgroundColor: isSelected ? colors.primary : colors.surfaceHover,
                      borderColor: isSelected ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.optionBadgeText,
                      { color: isSelected ? colors.surface : colors.textSecondary },
                    ]}
                  >
                    {String.fromCharCode(65 + optIdx)}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.optionText,
                    {
                      color: isSelected ? colors.primary : colors.textPrimary,
                      fontWeight: isSelected ? '700' : '500',
                    },
                  ]}
                >
                  {optionText}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
          </ScrollView>
        </Animated.View>
      </GestureDetector>

      {/* 4. Bottom Controls Toolbar */}
      <View
        style={[
          styles.bottomToolbar,
          { backgroundColor: colors.surface, borderTopColor: colors.border },
        ]}
      >
        <TouchableOpacity
          onPress={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
          disabled={currentIndex === 0}
          style={[
            styles.navBtn,
            {
              backgroundColor: colors.surfaceHover,
              borderColor: colors.border,
              opacity: currentIndex === 0 ? 0.3 : 1,
            },
          ]}
        >
          <ChevronLeft size={18} color={colors.textPrimary} />
          <Text style={[styles.navBtnText, { color: colors.textPrimary }]}>Prev</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setIsSubmitModalVisible(true)}
          style={[styles.submitTriggerBtn, { backgroundColor: colors.semanticSuccess }]}
        >
          <Send size={16} color={colors.surface} />
          <Text style={[styles.submitTriggerText, { color: colors.surface }]}>
            Submit ({answeredCount}/{questions.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))}
          disabled={currentIndex === questions.length - 1}
          style={[
            styles.navBtn,
            {
              backgroundColor: colors.surfaceHover,
              borderColor: colors.border,
              opacity: currentIndex === questions.length - 1 ? 0.3 : 1,
            },
          ]}
        >
          <Text style={[styles.navBtnText, { color: colors.textPrimary }]}>Next</Text>
          <ChevronRight size={18} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* 5. Submit Confirmation Bottom Sheet Modal */}
      <Modal
        visible={isSubmitModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsSubmitModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                Ready to Submit?
              </Text>
              <TouchableOpacity onPress={() => setIsSubmitModalVisible(false)}>
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
              Please review your summary before finalizing your test submission.
            </Text>

            <View style={styles.summaryGrid}>
              <View style={[styles.summaryBox, { backgroundColor: colors.surfaceHover }]}>
                <Text style={[styles.summaryVal, { color: colors.semanticSuccess }]}>
                  {answeredCount}
                </Text>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                  Answered
                </Text>
              </View>

              <View style={[styles.summaryBox, { backgroundColor: colors.surfaceHover }]}>
                <Text style={[styles.summaryVal, { color: colors.semanticWarning }]}>
                  {unattemptedCount}
                </Text>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                  Unanswered
                </Text>
              </View>

              <View style={[styles.summaryBox, { backgroundColor: colors.surfaceHover }]}>
                <Text style={[styles.summaryVal, { color: colors.primary }]}>
                  {markedCount}
                </Text>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                  Marked
                </Text>
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => setIsSubmitModalVisible(false)}
                style={[styles.modalCancelBtn, { borderColor: colors.border }]}
              >
                <Text style={[styles.modalCancelText, { color: colors.textPrimary }]}>
                  Return to Test
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={executeSubmit}
                disabled={submitting}
                style={[styles.modalConfirmBtn, { backgroundColor: colors.primary }]}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color={colors.surface} />
                ) : (
                  <Text style={[styles.modalConfirmText, { color: colors.surface }]}>
                    Confirm & Submit
                  </Text>
                )}
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
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '500',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
  },
  errorSubtitle: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 20,
    lineHeight: 18,
  },
  backBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  headerBar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  headerIconButton: {
    padding: 6,
    marginLeft: -6,
  },
  headerTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    marginHorizontal: 10,
  },
  timerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    borderWidth: 1,
  },
  timerText: {
    fontSize: 13,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  paletteContainer: {
    height: 50,
    borderBottomWidth: 1,
  },
  paletteScroll: {
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 8,
  },
  paletteChip: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  paletteChipText: {
    fontSize: 13,
  },
  questionScroll: {
    padding: 18,
    paddingBottom: 40,
  },
  qMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  qIndexLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  reviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  reviewBtnText: {
    fontSize: 11,
    fontWeight: '600',
  },
  questionPrompt: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 24,
    marginBottom: 20,
  },
  optionsContainer: {
    gap: 12,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 12,
  },
  optionBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  optionBadgeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  optionText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  bottomToolbar: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderTopWidth: 1,
  },
  navBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  navBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  submitTriggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  submitTriggerText: {
    fontSize: 13,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  modalSubtitle: {
    fontSize: 13,
    marginTop: 4,
    marginBottom: 16,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  summaryBox: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  summaryVal: {
    fontSize: 20,
    fontWeight: '800',
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 13,
    fontWeight: '600',
  },
  modalConfirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalConfirmText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
