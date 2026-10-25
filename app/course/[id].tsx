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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  ArrowLeft,
  Star,
  Clock,
  BookOpen,
  Lock,
  Play,
  FileText,
  CheckCircle2,
  Users,
  ShieldCheck,
  Sparkles,
  Award,
  FolderDown,
  HelpCircle,
  ChevronRight,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { doc, onSnapshot } from 'firebase/firestore';
import { Image } from 'expo-image';
import { useTheme } from '../../src/theme';
import { useAuthStore } from '../../src/store/useAuthStore';
import { useLanguageStore } from '../../src/store/useLanguageStore';
import { firebaseFirestore } from '../../src/services/firebase';
import { Card } from '../../src/components/common/Card';
import { Button } from '../../src/components/common/Button';
import { Badge } from '../../src/components/common/Badge';
import { Screen } from '../../src/components/common/Screen';
import { resolveImageUrl } from '../../src/utils/imageUrlResolver';
import {
  getCourseById,
  subscribeToEnrollment,
  subscribeToCourseCurriculum,
  Course,
  Section,
  Lesson,
  FALLBACK_COURSES,
} from '../../src/services/courseService';
import { QuizMetadata, subscribeToCourseQuizzes } from '../../src/services/quizService';
import { analytics } from '../../src/services/analyticsService';

export default function CourseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, typography, spacing, radius } = useTheme();
  const user = useAuthStore((state) => state.user);
  const t = useLanguageStore((state) => state.t);

  const [course, setCourse] = useState<Course | null>(null);
  const [curriculum, setCurriculum] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [quizzes, setQuizzes] = useState<QuizMetadata[]>([]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);

    // 1. Real-time course updates from Firestore
    const unsubCourse = onSnapshot(
      doc(firebaseFirestore, 'courses', id),
      (snap) => {
        if (snap.exists()) {
          const courseData = { id: snap.id, ...snap.data() } as Course;
          setCourse(courseData);
          analytics.logViewCourse(courseData.id, courseData.title, courseData.price);
        } else if (FALLBACK_COURSES[id]) {
          setCourse(FALLBACK_COURSES[id]);
        } else {
          setCourse(null);
        }
        setLoading(false);
      },
      (err) => {
        console.warn('[courseDetail] onSnapshot error:', err);
        setCourse(FALLBACK_COURSES[id] || null);
        setLoading(false);
      }
    );

    // 2. Real-time enrollment listener
    const unsubEnroll = subscribeToEnrollment(user?.uid, id, (enrolled) => {
      setIsEnrolled(enrolled);
    });

    // 3. Real-time course quizzes listener
    const unsubQuizzes = subscribeToCourseQuizzes(id, (quizList) => {
      setQuizzes(quizList);
    });

    // 4. Real-time curriculum subcollections listener
    const unsubCurriculum = subscribeToCourseCurriculum(id, (sections) => {
      setCurriculum(sections);
    });

    return () => {
      unsubCourse();
      unsubEnroll();
      unsubQuizzes();
      unsubCurriculum();
    };
  }, [id, user?.uid]);

  const handleLessonPress = (lesson: Lesson) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isEnrolled || lesson.isFreePreview) {
      router.push({
        pathname: '/player/[lessonId]',
        params: {
          lessonId: lesson.id,
          courseId: course?.id || '',
          type: lesson.type,
        },
      });
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      router.push({
        pathname: '/checkout/[courseId]',
        params: { courseId: course?.id || '' },
      });
    }
  };

  const formatLessonDuration = (dur: number | string | undefined) => {
    if (!dur) return null;
    if (typeof dur === 'string' && dur.includes(':')) return dur;
    const num = Number(dur);
    if (Number.isFinite(num) && num > 0) {
      return `${Math.round(num / 60)} mins`;
    }
    return String(dur);
  };

  const displayedSections = curriculum.length > 0 ? curriculum : (course?.sections || []);
  const totalLessonsCount =
    course?.totalLessons ||
    course?.lessonsCount ||
    displayedSections.reduce((acc, s) => acc + (s.lessons?.length || 0), 0) ||
    0;

  const handleEnrollOrResume = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (isEnrolled) {
      const firstLesson = displayedSections?.[0]?.lessons?.[0];
      router.push({
        pathname: '/player/[lessonId]',
        params: {
          lessonId: firstLesson?.id || 'l1',
          courseId: course?.id || '',
        },
      });
    } else {
      router.push({
        pathname: '/checkout/[courseId]',
        params: { courseId: course?.id || '' },
      });
    }
  };

  if (loading) {
    return (
      <Screen>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[typography.body, { color: colors.textMuted, marginTop: spacing.md }]}>
            Loading course curriculum...
          </Text>
        </View>
      </Screen>
    );
  }

  if (!course || (course.isPublished === false && !isEnrolled)) {
    return (
      <Screen>
        <View style={styles.centerContainer}>
          <Text style={[typography.title, { color: colors.text, textAlign: 'center' }]}>
            Course No Longer Available
          </Text>
          <Text style={[typography.body, { color: colors.textMuted, marginTop: 8, textAlign: 'center' }]}>
            This masterclass has been unpublished or archived by administration.
          </Text>
          <Button
            title="Explore Other Courses"
            variant="primary"
            onPress={() => router.replace('/(tabs)/courses')}
            style={{ marginTop: spacing.lg }}
          />
        </View>
      </Screen>
    );
  }

  const originalPrice = course.price;
  const currentPrice = course.discountPrice || originalPrice;
  const hasDiscount = course.discountPrice && course.discountPrice < course.price;

  return (
    <Screen>
      {/* 1. Top Header */}
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
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={[styles.backButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <ArrowLeft size={20} color={colors.text} strokeWidth={1.75} />
        </TouchableOpacity>
        <Text
          style={[typography.title, { color: colors.text, flex: 1, marginLeft: spacing.sm }]}
          numberOfLines={1}
        >
          {course.title}
        </Text>
        {isEnrolled && (
          <View style={[styles.enrolledPill, { backgroundColor: colors.surface, borderColor: colors.success }]}>
            <CheckCircle2 size={14} color={colors.success} strokeWidth={2} />
            <Text style={[typography.caption, { color: colors.success, marginLeft: 4, fontWeight: '700' }]}>
              Enrolled
            </Text>
          </View>
        )}
      </View>

      {/* Main Content */}
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: spacing.screen }]}
        showsVerticalScrollIndicator={false}
      >
        {/* 2. Hero Overview Card */}
        <Animated.View entering={FadeInDown.duration(400).delay(60)}>
          <Card style={[styles.heroCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {course.thumbnail ? (
              <View
                style={{
                  width: '100%',
                  height: 180,
                  borderRadius: radius.md,
                  overflow: 'hidden',
                  marginBottom: spacing.md,
                  backgroundColor: colors.surfaceElevated,
                }}
              >
                <Image
                  source={{ uri: resolveImageUrl(course.thumbnail) }}
                  style={{ width: '100%', height: '100%' }}
                  contentFit="cover"
                  transition={200}
                />
              </View>
            ) : null}

            <View style={styles.badgeRow}>
              <Badge label={course.category} variant="primary" size="sm" />
              {course.rating && (
                <View style={styles.ratingBadge}>
                  <Star size={14} color={colors.accent} fill={colors.accent} strokeWidth={1.5} />
                  <Text style={[typography.caption, { color: colors.text, marginLeft: 4, fontWeight: '700' }]}>
                    {course.rating}
                  </Text>
                </View>
              )}
            </View>

            <Text style={[typography.heading, { color: colors.text, marginTop: spacing.sm }]}>
              {course.title}
            </Text>

            <Text style={[typography.body, { color: colors.textMuted, marginTop: spacing.xs, lineHeight: 22 }]}>
              {course.description}
            </Text>

            <View style={[styles.metaDivider, { backgroundColor: colors.border }]} />

            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <Clock size={16} color={colors.textMuted} strokeWidth={1.75} />
                <Text style={[typography.caption, { color: colors.textMuted, marginLeft: 6 }]}>
                  {course.duration || '10+ Hours'}
                </Text>
              </View>

              <View style={styles.metaItem}>
                <Users size={16} color={colors.textMuted} strokeWidth={1.75} />
                <Text style={[typography.caption, { color: colors.textMuted, marginLeft: 6 }]}>
                  {course.totalStudents ? `${course.totalStudents.toLocaleString()} students` : 'Active'}
                </Text>
              </View>

              <View style={styles.metaItem}>
                <ShieldCheck size={16} color={colors.textMuted} strokeWidth={1.75} />
                <Text style={[typography.caption, { color: colors.textMuted, marginLeft: 6 }]}>
                  Lifetime Access
                </Text>
              </View>
            </View>
          </Card>
        </Animated.View>

        {/* 3. Instructor Details */}
        <Animated.View entering={FadeInDown.duration(400).delay(120)} style={{ marginTop: spacing.lg }}>
          <Text style={[typography.caption, { color: colors.textMuted, marginBottom: spacing.xs, textTransform: 'uppercase' }]}>
            Lead Instructor
          </Text>
          <Card style={[styles.instructorCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.instructorAvatarBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Sparkles size={22} color={colors.primary} strokeWidth={1.75} />
            </View>
            <View style={{ marginLeft: spacing.sm, flex: 1 }}>
              <Text style={[typography.heading, { color: colors.text }]}>
                {course.instructor}
              </Text>
              <Text style={[typography.caption, { color: colors.textMuted }]}>
                Verified Educator & Content Creator
              </Text>
            </View>
          </Card>
        </Animated.View>

        {/* Enrolled Quick Actions: Study Materials & Certificate */}
        {isEnrolled && (
          <Animated.View entering={FadeInDown.duration(400).delay(150)} style={{ marginTop: spacing.lg }}>
            <Text style={[typography.caption, { color: colors.textMuted, marginBottom: spacing.xs, textTransform: 'uppercase' }]}>
              Enrolled Student Resources
            </Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push(`/materials/${course.id}`);
                }}
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: 12,
                  minHeight: 48,
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderWidth: 1,
                  borderRadius: 14,
                }}
                activeOpacity={0.8}
              >
                <FolderDown size={18} color={colors.primary} strokeWidth={1.75} />
                <View style={{ marginLeft: 8, flex: 1 }}>
                  <Text style={[typography.caption, { color: colors.text, fontWeight: '600' }]} numberOfLines={1}>
                    Study Materials
                  </Text>
                  <Text style={[typography.caption, { color: colors.textMuted, fontSize: 11 }]}>
                    PDFs & Notes
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push(`/certificate/${course.id}`);
                }}
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: 12,
                  minHeight: 48,
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderWidth: 1,
                  borderRadius: 14,
                }}
                activeOpacity={0.8}
              >
                <Award size={18} color={colors.accent} strokeWidth={1.75} />
                <View style={{ marginLeft: 8, flex: 1 }}>
                  <Text style={[typography.caption, { color: colors.text, fontWeight: '600' }]} numberOfLines={1}>
                    Certificate
                  </Text>
                  <Text style={[typography.caption, { color: colors.textMuted, fontSize: 11 }]}>
                    Completion ID
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}

        {/* Course Quizzes & Mock Tests (Live from Firestore) */}
        {quizzes.length > 0 && (
          <Animated.View entering={FadeInDown.duration(400).delay(160)} style={{ marginTop: spacing.lg }}>
            <View style={styles.curriculumHeaderRow}>
              <Text style={[typography.caption, { color: colors.textMuted, textTransform: 'uppercase' }]}>
                Quizzes & Practice Tests
              </Text>
              <Text style={[typography.caption, { color: colors.accent, fontWeight: '600' }]}>
                {quizzes.length} {quizzes.length === 1 ? 'Test' : 'Tests'}
              </Text>
            </View>

            <View style={{ marginTop: spacing.xs, gap: 8 }}>
              {quizzes.map((q) => (
                <TouchableOpacity
                  key={q.id}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push(`/quiz/${q.id}`);
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    padding: 14,
                    minHeight: 56,
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    borderWidth: 1,
                    borderRadius: 14,
                  }}
                  activeOpacity={0.8}
                >
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: colors.background,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <HelpCircle size={20} color={colors.primary} strokeWidth={1.75} />
                  </View>

                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]} numberOfLines={1}>
                      {q.title}
                    </Text>
                    <Text style={[typography.caption, typography.tabular, { color: colors.textMuted, marginTop: 2 }]}>
                      {q.durationMinutes} mins • Pass: {q.passMarks} marks • Total: {q.totalMarks || 10} marks
                    </Text>
                  </View>

                  <ChevronRight size={18} color={colors.textMuted} strokeWidth={1.75} />
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>
        )}

        {/* 4. Curriculum Modules & Lessons */}
        <Animated.View entering={FadeInDown.duration(400).delay(180)} style={{ marginTop: spacing.lg }}>
          <View style={styles.curriculumHeaderRow}>
            <Text style={[typography.caption, { color: colors.textMuted, textTransform: 'uppercase' }]}>
              {t('courseSyllabus')}
            </Text>
            <Text style={[typography.caption, { color: colors.primary, fontWeight: '600' }]}>
              {totalLessonsCount} Lessons
            </Text>
          </View>

          {displayedSections && displayedSections.length > 0 ? (
            displayedSections.map((section, sIdx) => (
              <View key={section.id || sIdx} style={{ marginTop: spacing.md }}>
                <Text style={[typography.small, { color: colors.text, fontWeight: '700', marginBottom: 8 }]}>
                  {section.title}
                </Text>

                {section.lessons.map((lesson, lIdx) => {
                  const isUnlocked = isEnrolled || lesson.isFreePreview;
                  return (
                    <TouchableOpacity
                      key={lesson.id || lIdx}
                      onPress={() => handleLessonPress(lesson)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      accessible={true}
                      accessibilityRole="button"
                      accessibilityLabel={`${lesson.title}, ${isUnlocked ? 'Available to watch' : 'Locked lesson'}`}
                      style={[
                        styles.lessonCard,
                        {
                          backgroundColor: colors.surface,
                          borderColor: isUnlocked && lesson.isFreePreview ? colors.accent : colors.border,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.lessonIconBox,
                          {
                            backgroundColor: isUnlocked ? colors.background : colors.surface,
                            borderColor: colors.border,
                          },
                        ]}
                      >
                        {isUnlocked ? (
                          lesson.type === 'pdf' ? (
                            <FileText size={16} color={colors.primary} strokeWidth={1.75} />
                          ) : (
                            <Play size={16} color={colors.primary} strokeWidth={1.75} />
                          )
                        ) : (
                          <Lock size={16} color={colors.textMuted} strokeWidth={1.75} />
                        )}
                      </View>

                      <View style={{ flex: 1, marginLeft: spacing.sm }}>
                        <Text
                          style={[
                            typography.body,
                            {
                              color: isUnlocked ? colors.text : colors.textMuted,
                              fontWeight: isUnlocked ? '600' : '400',
                            },
                          ]}
                          numberOfLines={2}
                        >
                          {lesson.title}
                        </Text>
                        {lesson.duration && (
                          <Text style={[typography.caption, { color: colors.textMuted, marginTop: 2 }]}>
                            {formatLessonDuration(lesson.duration)} • {lesson.type.toUpperCase()}
                          </Text>
                        )}
                      </View>

                      {lesson.isFreePreview && !isEnrolled && (
                        <View style={[styles.freePreviewPill, { borderColor: colors.accent, backgroundColor: colors.accent + '15' }]}>
                          <Text style={[typography.caption, { color: colors.accent, fontWeight: '700', fontSize: 10 }]}>
                            {t('freePreview')}
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))
          ) : (
            <Card style={[styles.emptyCurriculumCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <BookOpen size={24} color={colors.textMuted} strokeWidth={1.75} />
              <Text style={[typography.caption, { color: colors.textMuted, marginTop: 8 }]}>
                Syllabus lessons are being updated for this course.
              </Text>
            </Card>
          )}
        </Animated.View>
      </ScrollView>

      {/* 5. Sticky Bottom Action Bar */}
      <View
        style={[
          styles.stickyBottomBar,
          {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            paddingBottom: insets.bottom + spacing.sm,
            paddingHorizontal: spacing.screen,
          },
        ]}
      >
        {!isEnrolled ? (
          <>
            <View style={styles.priceColumn}>
              <Text style={[typography.caption, { color: colors.textMuted }]}>
                Course Price
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                <Text style={[typography.heading, typography.tabular, { color: colors.text, fontWeight: '700' }]}>
                  ₹{currentPrice.toLocaleString('en-IN')}
                </Text>
                {hasDiscount && (
                  <Text style={[typography.caption, typography.tabular, styles.strikeThrough, { color: colors.textMuted, marginLeft: 6 }]}>
                    ₹{originalPrice.toLocaleString('en-IN')}
                  </Text>
                )}
              </View>
            </View>

            <View style={{ flex: 1, marginLeft: spacing.md }}>
              <Button
                title="Enroll Now"
                variant="primary"
                onPress={handleEnrollOrResume}
                accessibilityRole="button"
                accessibilityLabel="Enroll in this course"
                style={styles.actionButton}
              />
            </View>
          </>
        ) : (
          <View style={{ flex: 1 }}>
            <Button
              title="Continue Learning"
              variant="primary"
              onPress={handleEnrollOrResume}
              icon={<Play size={18} color={colors.surface} strokeWidth={2} />}
              accessibilityRole="button"
              accessibilityLabel="Continue learning course lessons"
              style={styles.actionButton}
            />
          </View>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 48,
    height: 48,
    minHeight: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  enrolledPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
  },
  scrollContent: {
    paddingTop: 16,
    paddingBottom: 120,
  },
  heroCard: {
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaDivider: {
    height: 1,
    marginVertical: 14,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  instructorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  instructorAvatarBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  curriculumHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  lessonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
    minHeight: 48,
  },
  lessonIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  freePreviewPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 2, // Sharp non-rounded highlight
    borderWidth: 1,
  },
  emptyCurriculumCard: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
  },
  stickyBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
  },
  priceColumn: {
    justifyContent: 'center',
  },
  strikeThrough: {
    textDecorationLine: 'line-through',
  },
  actionButton: {
    height: 52,
    minHeight: 48,
  },
});
