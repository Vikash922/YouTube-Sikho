import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  PlayCircle,
  Play,
  CheckCircle2,
  Clock,
  BookOpen,
  Sparkles,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import {
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
} from 'firebase/firestore';
import { firebaseFirestore } from '../../src/services/firebase';
import { useTheme } from '../../src/theme';
import { useAuthStore } from '../../src/store/useAuthStore';
import { Screen } from '../../src/components/common/Screen';
import { Header } from '../../src/components/common/Header';
import { EmptyState } from '../../src/components/common/EmptyState';
import { Card } from '../../src/components/common/Card';
import { Button } from '../../src/components/common/Button';
import { Badge } from '../../src/components/common/Badge';
import { ProgressBar } from '../../src/components/common/Progress';
import {
  getCourseById,
  subscribeToUserEnrollments,
  Course,
} from '../../src/services/courseService';
import { getCourseProgress, CourseProgressData } from '../../src/services/videoService';

interface EnrolledCourseItem {
  course: Course;
  progress: CourseProgressData | null;
  percentComplete: number;
  lastLessonTitle?: string;
  lastLessonId?: string;
}

export default function MyLearningScreen() {
  const router = useRouter();
  const { colors, typography, spacing, radius } = useTheme();
  const user = useAuthStore((state) => state.user);

  const [enrolledList, setEnrolledList] = useState<EnrolledCourseItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Real-time listener for enrolled courses
  useEffect(() => {
    if (!user?.uid) {
      setEnrolledList([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsub = subscribeToUserEnrollments(user.uid, async (enrollments) => {
      if (enrollments.length === 0) {
        setEnrolledList([]);
        setLoading(false);
        return;
      }

      const items: EnrolledCourseItem[] = [];
      for (const enr of enrollments) {
        const course = await getCourseById(enr.courseId);
        if (course) {
          const progress = await getCourseProgress(user.uid, course.id);
          const totalLessons =
            course.sections?.reduce((acc, s) => acc + s.lessons.length, 0) || 1;
          const completedCount = progress?.completedLessons?.length || 0;
          const percent = Math.min(100, Math.round((completedCount / totalLessons) * 100));

          let lastLessonTitle = course.sections?.[0]?.lessons?.[0]?.title;
          let lastLessonId = course.sections?.[0]?.lessons?.[0]?.id;

          if (progress?.lastLessonId) {
            for (const sec of course.sections || []) {
              const found = sec.lessons.find((l) => l.id === progress.lastLessonId);
              if (found) {
                lastLessonTitle = found.title;
                lastLessonId = found.id;
                break;
              }
            }
          }

          items.push({
            course,
            progress,
            percentComplete: percent,
            lastLessonTitle,
            lastLessonId,
          });
        }
      }

      setEnrolledList(items);
      setLoading(false);
    });

    return () => unsub();
  }, [user?.uid]);

  const handleResume = (item: EnrolledCourseItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const targetLessonId =
      item.lastLessonId || item.course.sections?.[0]?.lessons?.[0]?.id || 'l1';

    router.push({
      pathname: '/player/[lessonId]',
      params: { lessonId: targetLessonId, courseId: item.course.id },
    });
  };

  return (
    <Screen withTopInset>
      <Header
        title="My Learning"
        subtitle="Resume your enrolled video courses & study notes"
      />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingHorizontal: spacing.screen },
          enrolledList.length === 0 && styles.emptyContainer,
        ]}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loaderBox}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[typography.caption, { color: colors.textMuted, marginTop: spacing.sm }]}>
              Syncing enrolled courses...
            </Text>
          </View>
        ) : enrolledList.length === 0 ? (
          <EmptyState
            icon={<PlayCircle size={36} color={colors.primary} strokeWidth={1.75} />}
            title="No courses enrolled yet"
            description="Explore our curated catalog and start mastering YouTube growth today."
            actionTitle="Browse Courses"
            onAction={() => router.push('/(tabs)/courses')}
          />
        ) : (
          <View style={{ gap: spacing.base, marginTop: spacing.md }}>
            {enrolledList.map((item, idx) => (
              <Animated.View
                key={item.course.id}
                entering={FadeInDown.duration(400).delay(idx * 80)}
              >
                <Card
                  padding={spacing.base}
                  style={[styles.courseCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                >
                  {item.course.thumbnail ? (
                    <View
                      style={{
                        width: '100%',
                        height: 140,
                        borderRadius: radius.md,
                        overflow: 'hidden',
                        marginBottom: spacing.sm,
                        backgroundColor: colors.surfaceElevated,
                      }}
                    >
                      <Image
                        source={{ uri: item.course.thumbnail }}
                        style={{ width: '100%', height: '100%' }}
                        contentFit="cover"
                        transition={200}
                      />
                    </View>
                  ) : null}

                  <View style={styles.cardHeader}>
                    <Badge label={item.course.category} variant="primary" size="sm" />
                    {item.percentComplete === 100 ? (
                      <View style={styles.completedBadge}>
                        <CheckCircle2 size={13} color={colors.success} strokeWidth={2} />
                        <Text style={[typography.caption, { color: colors.success, marginLeft: 4, fontWeight: '700' }]}>
                          Completed
                        </Text>
                      </View>
                    ) : (
                      <Text style={[typography.caption, { color: colors.primary, fontWeight: '700' }]}>
                        {item.percentComplete}% Complete
                      </Text>
                    )}
                  </View>

                  <Text
                    style={[typography.title, { color: colors.text, marginTop: spacing.sm }]}
                    numberOfLines={2}
                  >
                    {item.course.title}
                  </Text>

                  <Text style={[typography.small, { color: colors.textMuted, marginTop: 2 }]}>
                    Instructor: {item.course.instructor}
                  </Text>

                  {/* Progress Bar */}
                  <View style={{ marginTop: spacing.md }}>
                    <ProgressBar value={item.percentComplete} />
                  </View>

                  {/* Last watched note & Resume Button */}
                  <View style={[styles.cardFooter, { borderTopColor: colors.border, marginTop: spacing.md, paddingTop: spacing.sm }]}>
                    <View style={{ flex: 1, marginRight: spacing.sm }}>
                      <Text style={[typography.caption, { color: colors.textMuted }]}>
                        Next Lesson
                      </Text>
                      <Text
                        style={[typography.small, { color: colors.text, fontWeight: '600' }]}
                        numberOfLines={1}
                      >
                        {item.lastLessonTitle || 'Start Lesson 1'}
                      </Text>
                    </View>

                    <Button
                      title="Resume"
                      size="sm"
                      variant="primary"
                      onPress={() => handleResume(item)}
                      icon={<Play size={14} color={colors.surface} strokeWidth={2.5} />}
                      style={styles.resumeBtn}
                    />
                  </View>
                </Card>
              </Animated.View>
            ))}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    paddingBottom: 110,
  },
  emptyContainer: {
    justifyContent: 'center',
  },
  loaderBox: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  courseCard: {
    borderRadius: 16,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
  },
  resumeBtn: {
    minHeight: 40,
    height: 40,
    paddingHorizontal: 14,
  },
});
