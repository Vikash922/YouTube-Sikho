import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Radio,
  Clock,
  Calendar,
  Users,
  Play,
  Bell,
  CheckCircle,
  Video,
  Lock,
} from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  useReducedMotion,
  FadeInDown,
} from 'react-native-reanimated';
import { useTheme } from '../../src/theme';
import { Screen } from '../../src/components/common/Screen';
import { Header } from '../../src/components/common/Header';
import { useLanguageStore } from '../../src/store/useLanguageStore';
import { firebaseAuth } from '../../src/services/firebase';
import {
  subscribeToLiveClasses,
  canStudentJoinLiveClass,
} from '../../src/services/liveClassService';
import { LiveClassData } from '../../src/services/liveStreamProvider';

export default function LiveScreen() {
  const router = useRouter();
  const { colors, spacing, typography, radius, shadows } = useTheme();
  const shouldReduceMotion = useReducedMotion();
  const t = useLanguageStore((state) => state.t);

  const [classes, setClasses] = useState<LiveClassData[]>([]);
  const [loading, setLoading] = useState(true);
  const [reminders, setReminders] = useState<Record<string, boolean>>({});

  // Pulsing animation for LIVE badge
  const pulseOpacity = useSharedValue(1);

  useEffect(() => {
    if (shouldReduceMotion) return;
    pulseOpacity.value = withRepeat(
      withTiming(0.3, { duration: 800 }),
      -1,
      true
    );
  }, [shouldReduceMotion]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: shouldReduceMotion ? 1 : pulseOpacity.value,
  }));

  // Real-time listener for live classes
  useEffect(() => {
    const unsubscribe = subscribeToLiveClasses(
      (list) => {
        setClasses(list);
        setLoading(false);
      },
      () => {
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const liveNow = classes.filter((c) => c.status === 'live');
  const upcoming = classes.filter((c) => c.status === 'scheduled');
  const past = classes.filter((c) => c.status === 'ended');

  const handleJoinClass = async (cls: LiveClassData) => {
    const user = firebaseAuth.currentUser;
    const isAllowed = await canStudentJoinLiveClass(cls, user?.uid);

    if (!isAllowed) {
      Alert.alert(
        'Enrollment Required',
        `This live masterclass is exclusive to students enrolled in "${cls.courseTitle || 'this course'}". Please enroll to join.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'View Course',
            onPress: () => router.push(`/course/${cls.courseId}` as any),
          },
        ]
      );
      return;
    }

    router.push(`/live/${cls.id}` as any);
  };

  const handleToggleReminder = (classId: string, title: string) => {
    const isSet = !!reminders[classId];
    setReminders((prev) => ({ ...prev, [classId]: !isSet }));

    Alert.alert(
      !isSet ? 'Reminder Scheduled' : 'Reminder Cancelled',
      !isSet
        ? `We will notify you 10 minutes before "${title}" starts.`
        : `Reminder for "${title}" has been removed.`
    );
  };

  const formatCountdown = (isoString: string) => {
    const target = new Date(isoString).getTime();
    const diff = target - Date.now();
    if (diff <= 0) return 'Starting soon';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `Starts in ${days}d ${hours % 24}h`;
    }
    return `Starts in ${hours}h ${minutes}m`;
  };

  return (
    <Screen withTopInset>
      <Header
        title={t('liveMasterclasses')}
        subtitle={t('liveMasterclassesSubtitle')}
        showBack={false}
      />

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[typography.caption, { color: colors.textMuted, marginTop: 12 }]}>
            Loading live schedules...
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingHorizontal: spacing.screen, paddingBottom: 40 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* 1. LIVE NOW SECTION */}
          {liveNow.length > 0 && (
            <View style={{ marginBottom: spacing.xl }}>
              <View style={styles.sectionHeader}>
                <View
                  style={[
                    styles.pulsingDotWrapper,
                    { backgroundColor: colors.errorBg },
                  ]}
                >
                  <Animated.View
                    style={[
                      styles.pulsingDot,
                      { backgroundColor: colors.error },
                      pulseStyle,
                    ]}
                  />
                </View>
                <Text style={[typography.heading, { color: colors.text, fontWeight: '700' }]}>
                  {t('liveNow')}
                </Text>
              </View>

              {liveNow.map((cls) => (
                <Animated.View
                  key={cls.id}
                  entering={FadeInDown.duration(400)}
                  style={[
                    styles.liveCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.error,
                      borderRadius: radius.card,
                    },
                    shadows.md,
                  ]}
                >
                  <View style={styles.liveCardTop}>
                    <View
                      style={[
                        styles.liveBadge,
                        { backgroundColor: colors.error },
                      ]}
                    >
                      <Text style={[styles.liveBadgeText, { color: colors.surface }]}>
                        LIVE
                      </Text>
                    </View>

                    <Text style={[typography.caption, { color: colors.textMuted }]}>
                      {cls.courseId === 'free_for_all' ? 'Free for all' : cls.courseTitle}
                    </Text>
                  </View>

                  <Text
                    style={[
                      typography.heading,
                      { color: colors.text, fontWeight: '700', marginTop: 8 },
                    ]}
                  >
                    {cls.title}
                  </Text>

                  <View style={styles.liveMetaRow}>
                    <View style={styles.metaItem}>
                      <Users size={16} color={colors.textMuted} />
                      <Text style={[typography.caption, { color: colors.textMuted }]}>
                        Interactive Live Room
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    onPress={() => handleJoinClass(cls)}
                    style={[
                      styles.joinBtn,
                      { backgroundColor: colors.primary, borderRadius: radius.button },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`Join Live Class: ${cls.title}`}
                  >
                    <Play size={18} color={colors.surface} />
                    <Text style={[styles.joinBtnText, { color: colors.surface }]}>
                      {t('joinNow')}
                    </Text>
                  </TouchableOpacity>
                </Animated.View>
              ))}
            </View>
          )}

          {/* 2. UPCOMING SESSIONS */}
          <View style={{ marginBottom: spacing.xl }}>
            <Text style={[typography.heading, { color: colors.text, fontWeight: '700', marginBottom: 12 }]}>
              {t('upcoming')}
            </Text>

            {upcoming.length === 0 ? (
              <View
                style={[
                  styles.emptyUpcomingBox,
                  { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.card },
                ]}
              >
                <Clock size={32} color={colors.textMuted} />
                <Text style={[typography.body, { color: colors.text, fontWeight: '600', marginTop: 8 }]}>
                  {t('noLiveClasses')}
                </Text>
                <Text style={[typography.caption, { color: colors.textMuted, textAlign: 'center', marginTop: 4 }]}>
                  {t('noLiveClassesDesc')}
                </Text>
              </View>
            ) : (
              upcoming.map((cls) => {
                const isReminderSet = !!reminders[cls.id];

                return (
                  <View
                    key={cls.id}
                    style={[
                      styles.upcomingCard,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                        borderRadius: radius.card,
                      },
                    ]}
                  >
                    <View style={styles.upcomingTopRow}>
                      <View style={[styles.timePill, { backgroundColor: colors.surfaceElevated }]}>
                        <Clock size={12} color={colors.primary} />
                        <Text style={[styles.timePillText, { color: colors.primary }]}>
                          {formatCountdown(cls.scheduledAt)}
                        </Text>
                      </View>

                      <Text style={[typography.caption, { color: colors.textMuted }]}>
                        {new Date(cls.scheduledAt).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    </View>

                    <Text style={[typography.body, { color: colors.text, fontWeight: '700', marginTop: 6 }]}>
                      {cls.title}
                    </Text>

                    <Text style={[typography.caption, { color: colors.textMuted, marginTop: 4 }]}>
                      {cls.courseId === 'free_for_all' ? 'Free for all students' : `Course: ${cls.courseTitle}`}
                    </Text>

                    <View style={styles.upcomingFooter}>
                      <TouchableOpacity
                        onPress={() => handleToggleReminder(cls.id, cls.title)}
                        style={[
                          styles.remindBtn,
                          {
                            borderColor: isReminderSet ? colors.primary : colors.border,
                            backgroundColor: isReminderSet ? colors.surfaceElevated : colors.surface,
                            borderRadius: radius.button,
                          },
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel={isReminderSet ? 'Reminder set' : 'Remind me'}
                      >
                        {isReminderSet ? (
                          <CheckCircle size={16} color={colors.primary} />
                        ) : (
                          <Bell size={16} color={colors.textMuted} />
                        )}
                        <Text
                          style={[
                            styles.remindBtnText,
                            { color: isReminderSet ? colors.primary : colors.text },
                          ]}
                        >
                          {isReminderSet ? t('reminderSet') : t('setReminder')}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </View>

          {/* 3. PAST SESSIONS */}
          {past.length > 0 && (
            <View>
              <Text style={[typography.heading, { color: colors.text, fontWeight: '700', marginBottom: 12 }]}>
                Past Recordings
              </Text>

              {past.map((cls) => (
                <View
                  key={cls.id}
                  style={[
                    styles.pastCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      borderRadius: radius.card,
                    },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>
                      {cls.title}
                    </Text>
                    <Text style={[typography.caption, { color: colors.textMuted, marginTop: 2 }]}>
                      {new Date(cls.scheduledAt).toLocaleDateString('en-IN', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={() => handleJoinClass(cls)}
                    style={[
                      styles.recordingBtn,
                      { backgroundColor: colors.surfaceElevated, borderRadius: radius.button },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`Watch recording of ${cls.title}`}
                  >
                    <Video size={16} color={colors.primary} />
                    <Text style={[styles.recordingBtnText, { color: colors.primary }]}>
                      Replay
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingTop: 12,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  pulsingDotWrapper: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulsingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  liveCard: {
    padding: 16,
    borderWidth: 1.5,
    marginBottom: 14,
  },
  liveCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  liveBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  liveBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  liveMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 10,
    marginBottom: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  joinBtn: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
  },
  joinBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  emptyUpcomingBox: {
    padding: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  upcomingCard: {
    padding: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  upcomingTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  timePillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  upcomingFooter: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  remindBtn: {
    minHeight: 48,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    gap: 6,
  },
  remindBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  pastCard: {
    padding: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  recordingBtn: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    gap: 6,
  },
  recordingBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
