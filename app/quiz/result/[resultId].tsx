import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Trophy,
  CheckCircle,
  XCircle,
  Clock,
  RotateCcw,
  BookOpen,
  ArrowLeft,
  Award,
  ShieldAlert,
  AlertCircle,
} from 'lucide-react-native';
import { useThemeColors } from '../../../src/theme';
import { fetchQuizResult, QuizEvaluationResult, QuestionBreakdownItem } from '../../../src/services/quizService';
import { ConfettiBurst } from '../../../src/motion/particles/ConfettiBurst';
import { AnimatedProgressRing } from '../../../src/motion/svg/AnimatedProgressRing';

export default function QuizResultScreen() {
  const { resultId } = useLocalSearchParams<{ resultId: string }>();
  const router = useRouter();
  const colors = useThemeColors();

  const [result, setResult] = useState<QuizEvaluationResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!resultId) return;

    fetchQuizResult(resultId)
      .then((data) => {
        setResult(data);
        setLoading(false);
      })
      .catch((err) => {
        console.warn('Failed to load result:', err);
        setLoading(false);
      });
  }, [resultId]);

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Loading test evaluation...
        </Text>
      </View>
    );
  }

  if (!result) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          Result Not Available
        </Text>
        <TouchableOpacity
          onPress={() => router.replace('/(tabs)/courses')}
          style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
        >
          <Text style={[styles.primaryBtnText, { color: colors.surface }]}>
            Back to Courses
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isPassed = result.passed;
  const breakdownList: QuestionBreakdownItem[] = result.breakdown || result.reviewBreakup || [];
  const answersRevealed = result.answersRevealed === true;

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
          onPress={() => router.replace('/(tabs)/learning')}
          style={styles.headerBtn}
          accessibilityRole="button"
          accessibilityLabel="Back to Learning"
        >
          <ArrowLeft size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          Performance Assessment
        </Text>
        <View style={{ width: 48 }} />
      </View>

      {isPassed && <ConfettiBurst count={72} />}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Score Card Hero Banner */}
        <View
          style={[
            styles.scoreHeroCard,
            {
              backgroundColor: colors.surface,
              borderColor: isPassed ? colors.semanticSuccess : colors.border,
            },
          ]}
        >
          <View style={{ alignItems: 'center', marginBottom: 16 }}>
            <AnimatedProgressRing
              progress={result.percentage}
              targetValue={result.percentage}
              size={120}
              strokeWidth={10}
              color={isPassed ? colors.semanticSuccess : colors.primary}
              trackColor={colors.surfaceHover}
              textColor={colors.textPrimary}
              unit="%"
              label="Score"
            />
          </View>

          <View
            style={[
              styles.trophyCircle,
              {
                backgroundColor: isPassed ? colors.successBg : colors.surfaceHover,
              },
            ]}
          >
            {isPassed ? (
              <Trophy size={40} color={colors.semanticSuccess} />
            ) : (
              <Award size={40} color={colors.textSecondary} />
            )}
          </View>

          <Text
            style={[
              styles.statusHeading,
              { color: isPassed ? colors.semanticSuccess : colors.textPrimary },
            ]}
          >
            {isPassed ? 'Congratulations! Passed 🎉' : 'Needs More Practice'}
          </Text>

          <Text style={[styles.statusSubtitle, { color: colors.textSecondary }]}>
            {isPassed
              ? `You achieved ${result.percentage}% and cleared the ${result.passingPercentage}% requirement.`
              : `You scored ${result.percentage}% (required: ${result.passingPercentage}%). Retake the quiz to master this checkpoint.`}
          </Text>

          {/* Score Numbers with Tabular Figures */}
          <View style={styles.scoreRow}>
            <Text style={[styles.bigScore, { color: colors.primary }]}>
              {result.score}
            </Text>
            <Text style={[styles.totalScore, { color: colors.textTertiary }]}>
              / {result.maxScore || result.totalMarks} Marks
            </Text>
          </View>

          {/* Metrics Row */}
          <View style={styles.metricsRow}>
            <View style={[styles.metricBox, { backgroundColor: colors.surfaceHover }]}>
              <Text style={[styles.metricVal, { color: colors.textPrimary }]}>
                {result.percentage}%
              </Text>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
                Accuracy
              </Text>
            </View>

            <View style={[styles.metricBox, { backgroundColor: colors.surfaceHover }]}>
              <Text style={[styles.metricVal, { color: colors.semanticSuccess }]}>
                {result.correctCount}
              </Text>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
                Correct
              </Text>
            </View>

            <View style={[styles.metricBox, { backgroundColor: colors.surfaceHover }]}>
              <Text style={[styles.metricVal, { color: colors.semanticError }]}>
                {result.wrongCount}
              </Text>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
                Wrong
              </Text>
            </View>

            <View style={[styles.metricBox, { backgroundColor: colors.surfaceHover }]}>
              <Text style={[styles.metricVal, { color: colors.textSecondary }]}>
                {result.unansweredCount}
              </Text>
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
                Skipped
              </Text>
            </View>
          </View>
        </View>

        {/* Anti-Cheat Key Notice if answers are protected */}
        {!answersRevealed && (
          <View
            style={[
              styles.noticeCard,
              { backgroundColor: colors.surfaceHover, borderColor: colors.border },
            ]}
          >
            <ShieldAlert size={18} color={colors.primary} />
            <Text style={[styles.noticeText, { color: colors.textSecondary }]}>
              Official answer keys and explanations are concealed while retakes remain active. They will unlock after your final attempt.
            </Text>
          </View>
        )}

        {/* 2. Detailed Question Review */}
        <View style={styles.reviewSection}>
          <Text style={[styles.reviewSectionTitle, { color: colors.textPrimary }]}>
            Question Analysis ({breakdownList.length})
          </Text>

          {breakdownList.map((q, idx) => {
            const isCorrect = q.status === 'correct';
            const isUnattempted = q.status === 'unanswered' || q.selectedOptionIndex === null || q.selectedOptionIndex === -1;

            return (
              <View
                key={q.questionId || idx}
                style={[
                  styles.reviewCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                {/* Question Header */}
                <View style={styles.qHeaderRow}>
                  <Text style={[styles.qNumText, { color: colors.primary }]}>
                    Question {idx + 1}
                  </Text>
                  <View
                    style={[
                      styles.resultPill,
                      {
                        backgroundColor: isCorrect
                          ? colors.successBg
                          : isUnattempted
                          ? colors.surfaceHover
                          : colors.errorBg,
                      },
                    ]}
                  >
                    {isCorrect ? (
                      <CheckCircle size={14} color={colors.semanticSuccess} />
                    ) : isUnattempted ? (
                      <AlertCircle size={14} color={colors.textSecondary} />
                    ) : (
                      <XCircle size={14} color={colors.semanticError} />
                    )}
                    <Text
                      style={[
                        styles.resultPillText,
                        {
                          color: isCorrect
                            ? colors.semanticSuccess
                            : isUnattempted
                            ? colors.textSecondary
                            : colors.semanticError,
                        },
                      ]}
                    >
                      {isCorrect ? 'Correct' : isUnattempted ? 'Unattempted' : 'Incorrect'}
                    </Text>
                  </View>
                </View>

                {/* Question Text */}
                <Text style={[styles.reviewQuestionText, { color: colors.textPrimary }]}>
                  {q.question}
                </Text>

                {/* Options Review */}
                <View style={styles.optionsReviewList}>
                  {q.options.map((opt, oIdx) => {
                    const isUserChoice = q.selectedOptionIndex === oIdx;
                    const isRightAnswer = answersRevealed && q.correctAnswerIndex === oIdx;

                    let optBg = colors.surfaceHover;
                    let optBorder = colors.border;
                    let optTextColor = colors.textSecondary;

                    if (isRightAnswer) {
                      optBg = colors.successBg;
                      optBorder = colors.semanticSuccess;
                      optTextColor = colors.semanticSuccess;
                    } else if (isUserChoice && !isCorrect) {
                      optBg = colors.errorBg;
                      optBorder = colors.semanticError;
                      optTextColor = colors.semanticError;
                    } else if (isUserChoice && isCorrect) {
                      optBg = colors.successBg;
                      optBorder = colors.semanticSuccess;
                      optTextColor = colors.semanticSuccess;
                    }

                    return (
                      <View
                        key={oIdx}
                        style={[
                          styles.optionReviewRow,
                          { backgroundColor: optBg, borderColor: optBorder },
                        ]}
                      >
                        <Text style={[styles.optionReviewLetter, { color: optTextColor }]}>
                          {String.fromCharCode(65 + oIdx)}.
                        </Text>
                        <Text
                          style={[
                            styles.optionReviewText,
                            {
                              color: optTextColor,
                              fontWeight: isRightAnswer || isUserChoice ? '700' : '400',
                            },
                          ]}
                        >
                          {opt}
                        </Text>
                        {isRightAnswer && (
                          <Text style={[styles.tagRight, { color: colors.semanticSuccess }]}>
                            (Correct)
                          </Text>
                        )}
                        {isUserChoice && !isRightAnswer && (
                          <Text style={[styles.tagWrong, { color: colors.semanticError }]}>
                            (Your Choice)
                          </Text>
                        )}
                      </View>
                    );
                  })}
                </View>

                {/* Explanation Box (when revealed) */}
                {answersRevealed && q.explanation ? (
                  <View
                    style={[
                      styles.explanationBox,
                      { backgroundColor: colors.surfaceHover, borderColor: colors.border },
                    ]}
                  >
                    <Text style={[styles.explanationHeader, { color: colors.primary }]}>
                      💡 Explanation
                    </Text>
                    <Text style={[styles.explanationText, { color: colors.textSecondary }]}>
                      {q.explanation}
                    </Text>
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>

        {/* 3. Bottom Actions */}
        <View style={styles.footerActions}>
          <TouchableOpacity
            onPress={() => router.replace('/(tabs)/learning')}
            style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
            accessibilityRole="button"
            accessibilityLabel="Continue Learning"
          >
            <BookOpen size={18} color={colors.surface} />
            <Text style={[styles.primaryBtnText, { color: colors.surface }]}>
              Continue Learning
            </Text>
          </TouchableOpacity>
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
    height: 56,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  headerBtn: {
    padding: 6,
    marginLeft: -6,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
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
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  scrollContent: {
    padding: 18,
    paddingBottom: 40,
  },
  scoreHeroCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  trophyCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  statusHeading: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 6,
    textAlign: 'center',
  },
  statusSubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 18,
    maxWidth: 280,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginBottom: 18,
  },
  bigScore: {
    fontSize: 42,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  totalScore: {
    fontSize: 15,
    fontWeight: '600',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
  },
  metricBox: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  metricVal: {
    fontSize: 16,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  noticeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
  },
  noticeText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
  },
  reviewSection: {
    gap: 12,
    marginBottom: 24,
  },
  reviewSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  reviewCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  qHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  qNumText: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  resultPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  resultPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  reviewQuestionText: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    marginBottom: 12,
  },
  optionsReviewList: {
    gap: 6,
  },
  optionReviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  optionReviewLetter: {
    fontSize: 12,
    fontWeight: '700',
  },
  optionReviewText: {
    flex: 1,
    fontSize: 13,
  },
  tagRight: {
    fontSize: 11,
    fontWeight: '700',
  },
  tagWrong: {
    fontSize: 11,
    fontWeight: '700',
  },
  explanationBox: {
    marginTop: 12,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  explanationHeader: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  explanationText: {
    fontSize: 12,
    lineHeight: 16,
  },
  footerActions: {
    marginTop: 8,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
