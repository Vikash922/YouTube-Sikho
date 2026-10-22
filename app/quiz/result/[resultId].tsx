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
  Sparkles,
  Award,
} from 'lucide-react-native';
import { useThemeColors } from '../../../src/theme';
import { fetchQuizResult, QuizEvaluationResult } from '../../../src/services/quizService';

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
              ? 'You have successfully cleared the passing threshold for this topic.'
              : 'Review the question explanations below and retake the test to master this checkpoint.'}
          </Text>

          {/* Score Numbers with Tabular Figures */}
          <View style={styles.scoreRow}>
            <Text style={[styles.bigScore, { color: colors.primary }]}>
              {result.score}
            </Text>
            <Text style={[styles.totalScore, { color: colors.textTertiary }]}>
              / {result.totalMarks} Marks
            </Text>
          </View>

          {/* Metrics Pill Grid */}
          <View style={styles.metricsRow}>
            <View style={[styles.metricBox, { backgroundColor: colors.surfaceHover }]}>
              <Text style={[styles.metricVal, { color: colors.textPrimary }]}>
                {result.accuracy}%
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
          </View>
        </View>

        {/* 2. Detailed Question Review Breakup */}
        <View style={styles.reviewSection}>
          <Text style={[styles.reviewSectionTitle, { color: colors.textPrimary }]}>
            Detailed Answer Review
          </Text>

          {result.reviewBreakup.map((q, idx) => {
            const isCorrect = q.isCorrect;
            const isUnattempted = q.selectedOptionIndex === null || q.selectedOptionIndex === -1;

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
                    Q{idx + 1}
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
                  {q.questionText}
                </Text>

                {/* Options Review */}
                <View style={styles.optionsReviewList}>
                  {q.options.map((opt, oIdx) => {
                    const isUserChoice = q.selectedOptionIndex === oIdx;
                    const isRightAnswer = q.correctOptionIndex === oIdx;

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
                            { color: optTextColor, fontWeight: isRightAnswer || isUserChoice ? '700' : '400' },
                          ]}
                        >
                          {opt}
                        </Text>
                        {isRightAnswer && (
                          <Text style={[styles.tagRight, { color: colors.semanticSuccess }]}>
                            (Correct Answer)
                          </Text>
                        )}
                        {isUserChoice && !isRightAnswer && (
                          <Text style={[styles.tagWrong, { color: colors.semanticError }]}>
                            (Your Pick)
                          </Text>
                        )}
                      </View>
                    );
                  })}
                </View>

                {/* Explanation Box */}
                {q.explanation ? (
                  <View
                    style={[
                      styles.explanationBox,
                      { backgroundColor: colors.surfaceHighlight, borderColor: colors.border },
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
    fontSize: 16,
    fontWeight: '700',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  scoreHeroCard: {
    padding: 24,
    borderRadius: 24,
    borderWidth: 1.5,
    alignItems: 'center',
    marginBottom: 24,
  },
  trophyCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  statusHeading: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 6,
  },
  statusSubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
    paddingHorizontal: 12,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginBottom: 20,
  },
  bigScore: {
    fontSize: 42,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  totalScore: {
    fontSize: 18,
    fontWeight: '600',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  metricBox: {
    flex: 1,
    padding: 12,
    borderRadius: 14,
    alignItems: 'center',
  },
  metricVal: {
    fontSize: 18,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  reviewSection: {
    marginBottom: 24,
  },
  reviewSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 14,
  },
  reviewCard: {
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 14,
  },
  qHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  qNumText: {
    fontSize: 14,
    fontWeight: '800',
  },
  resultPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  resultPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  reviewQuestionText: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 22,
    marginBottom: 14,
  },
  optionsReviewList: {
    gap: 8,
    marginBottom: 12,
  },
  optionReviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  optionReviewLetter: {
    fontSize: 12,
    fontWeight: '700',
  },
  optionReviewText: {
    fontSize: 13,
    flex: 1,
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
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 6,
  },
  explanationHeader: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  explanationText: {
    fontSize: 12,
    lineHeight: 18,
  },
  footerActions: {
    gap: 12,
  },
  primaryBtn: {
    minHeight: 48,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
  },
  primaryBtnText: {
    fontSize: 15,
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
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
});
