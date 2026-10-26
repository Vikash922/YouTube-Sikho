import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Dimensions,
  Linking,
} from 'react-native';
import { Image } from 'expo-image';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Search,
  Sparkles,
  BookOpen,
  Clock,
  Star,
  ArrowRight,
  Flame,
  Bell,
  Radio,
  Play,
  FolderOpen,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/store/useAuthStore';
import { useNotificationStore } from '../../src/store/useNotificationStore';
import { useTheme } from '../../src/theme';
import { clientConfig } from '../../src/config/client.config';
import { Avatar } from '../../src/components/common/Avatar';
import { Card } from '../../src/components/common/Card';
import { Badge } from '../../src/components/common/Badge';
import { ProgressBar } from '../../src/components/common/Progress';
import { Skeleton } from '../../src/components/common/Skeleton';
import { Screen } from '../../src/components/common/Screen';
import {
  Course,
  subscribeToPublishedCourses,
  FALLBACK_COURSES,
} from '../../src/services/courseService';
import { subscribeToLiveClasses } from '../../src/services/liveClassService';
import { LiveClassData } from '../../src/services/liveStreamProvider';
import {
  subscribeToBanners,
  Banner,
  subscribeToHomeSections,
  HomeSectionConfig,
  DEFAULT_HOME_SECTIONS,
} from '../../src/services/bannerService';
import { subscribeToCategories, Category } from '../../src/services/categoryService';
import { subscribeToUserProgress, CourseProgressData } from '../../src/services/videoService';
import { resolveImageUrl } from '../../src/utils/imageUrlResolver';
import { useLanguageStore } from '../../src/store/useLanguageStore';

export default function HomeScreen() {
  const router = useRouter();
  const { colors, typography, radius, spacing, shadows } = useTheme();
  const profile = useAuthStore((state) => state.profile);
  const t = useLanguageStore((state) => state.t);

  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<Course[]>(Object.values(FALLBACK_COURSES));
  const [liveNowClass, setLiveNowClass] = useState<LiveClassData | null>(null);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [homeSections, setHomeSections] = useState<HomeSectionConfig[]>(DEFAULT_HOME_SECTIONS);
  const [categories, setCategories] = useState<Category[]>([]);
  const [userProgress, setUserProgress] = useState<CourseProgressData[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const unreadCount = useNotificationStore((state) => state.unreadCount);

  // 1. Subscribe to real-time published courses from Firestore
  useEffect(() => {
    const unsubscribe = subscribeToPublishedCourses((list) => {
      setCourses(list);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. Subscribe to real-time live classes
  useEffect(() => {
    const unsubLive = subscribeToLiveClasses((classes) => {
      const active = classes.find((c) => c.status === 'live');
      setLiveNowClass(active || null);
    });
    return () => unsubLive();
  }, []);

  // 3. Subscribe to real-time banners
  useEffect(() => {
    const unsubBanners = subscribeToBanners((list) => {
      setBanners(list);
    });
    return () => unsubBanners();
  }, []);

  // 4. Subscribe to real-time home sections
  useEffect(() => {
    const unsubSections = subscribeToHomeSections((sections) => {
      setHomeSections(sections);
    });
    return () => unsubSections();
  }, []);

  // 5. Subscribe to real-time categories
  useEffect(() => {
    const unsubCategories = subscribeToCategories((list) => {
      setCategories(list);
    });
    return () => unsubCategories();
  }, []);

  // 6. Subscribe to real-time user course progress (Continue Watching)
  useEffect(() => {
    if (!profile?.uid) {
      setUserProgress([]);
      return;
    }
    const unsubProgress = subscribeToUserProgress(profile.uid, (list) => {
      setUserProgress(list);
    });
    return () => unsubProgress();
  }, [profile?.uid]);

  const handleBannerPress = (b: Banner) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const targetType = b.actionType || b.targetType;
    const targetValue = b.actionValue || b.targetValue;
    if (targetType === 'course' && targetValue) {
      router.push({ pathname: '/course/[id]', params: { id: targetValue } });
    } else if (targetType === 'category' && targetValue) {
      router.push('/(tabs)/courses');
    } else if (targetType === 'url' && targetValue) {
      Linking.openURL(targetValue).catch(() => {});
    }
  };

  const currentHour = new Date().getHours();
  const timeOfDayGreeting =
    currentHour >= 5 && currentHour < 12
      ? t('goodMorning')
      : currentHour >= 12 && currentHour < 17
      ? t('goodAfternoon')
      : currentHour >= 17 && currentHour < 22
      ? t('goodEvening')
      : t('goodNight');

  // In-progress courses calculation
  const inProgressList = userProgress
    .filter((p) => (p.percentComplete || 0) < 100 && ((p.percentComplete || 0) > 0 || (p.lastPosition || 0) > 0))
    .map((p) => {
      const course = courses.find((c) => c.id === p.courseId);
      return course ? { ...course, progress: p } : null;
    })
    .filter(Boolean) as (Course & { progress: CourseProgressData })[];

  // Filtered course lists
  const newCoursesList = courses.filter((c) => c.isNew);
  const featuredList = courses.filter((c) => c.isFeatured);
  const popularList = courses.filter((c) => !c.isFeatured && !c.isNew).slice(0, 4).length > 0
    ? courses.filter((c) => !c.isFeatured && !c.isNew).slice(0, 4)
    : courses.slice(0, 4);

  // Search filtered view if user types something
  const filteredCourses = searchQuery.trim()
    ? courses.filter((c) =>
        c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.instructor?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : null;

  // Render a standard course card
  const renderCourseCard = (course: Course) => {
    const displayPrice = course.discountPrice
      ? `₹${course.discountPrice.toLocaleString('en-IN')}`
      : typeof course.price === 'number'
      ? `₹${course.price.toLocaleString('en-IN')}`
      : course.price;
    const displayBadge =
      course.isFeatured ? t('featured') : course.isNew ? t('newBadge') : t('bestseller');

    return (
      <Card
        key={course.id}
        onPress={() => router.push({ pathname: '/course/[id]', params: { id: course.id } })}
        padding={spacing.base}
      >
        {course.thumbnail ? (
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
              source={{ uri: resolveImageUrl(course.thumbnail) }}
              style={{ width: '100%', height: '100%' }}
              contentFit="cover"
              transition={200}
            />
          </View>
        ) : null}

        <View style={styles.courseHeader}>
          <Badge label={displayBadge} variant="primary" size="sm" />
          <View style={styles.ratingRow}>
            <Star size={13} color={colors.accent} fill={colors.accent} />
            <Text
              style={[
                typography.caption,
                { color: colors.text, fontWeight: '600', marginLeft: 4 },
              ]}
            >
              {course.rating || 4.9}
            </Text>
          </View>
        </View>

        <Text
          style={[
            typography.title,
            { color: colors.text, marginTop: spacing.sm },
          ]}
          numberOfLines={2}
        >
          {course.title}
        </Text>

        <Text
          style={[
            typography.small,
            { color: colors.textMuted, marginTop: 2 },
          ]}
        >
          By {course.instructor || 'Instructor'}
        </Text>

        <View style={[styles.cardFooter, { borderTopColor: colors.border, marginTop: spacing.md, paddingTop: spacing.sm }]}>
          <View style={styles.metaRow}>
            <Clock size={14} color={colors.textMuted} strokeWidth={1.75} />
            <Text style={[typography.caption, { color: colors.textMuted, marginLeft: 4 }]}>
              {course.duration || '12 Hours'}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
            <Text style={[typography.heading, typography.tabular, { color: colors.primary }]}>
              {displayPrice}
            </Text>
            {course.discountPrice && typeof course.price === 'number' && (
              <Text
                style={[
                  typography.caption,
                  typography.tabular,
                  { color: colors.textMuted, textDecorationLine: 'line-through' },
                ]}
              >
                ₹{course.price.toLocaleString('en-IN')}
              </Text>
            )}
          </View>
        </View>
      </Card>
    );
  };

  // SectionRenderer for canonical section types
  const renderSection = (section: HomeSectionConfig, index: number) => {
    if (section.isVisible === false) return null;

    switch (section.type) {
      case 'banners':
        return (
          <Animated.View
            key={section.id || `banners-${index}`}
            entering={FadeInDown.duration(400).delay(180)}
            style={{ marginTop: spacing.xl }}
          >
            {banners.length > 0 ? (
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 12 }}
              >
                {banners.map((b) => (
                  <TouchableOpacity
                    key={b.id}
                    activeOpacity={0.9}
                    onPress={() => handleBannerPress(b)}
                    style={[
                      {
                        width: Dimensions.get('window').width - 40,
                        height: 160,
                        borderRadius: radius.card,
                        overflow: 'hidden',
                        backgroundColor: colors.surface,
                        borderWidth: 1,
                        borderColor: colors.border,
                      },
                      shadows.sm,
                    ]}
                  >
                    <Image
                      source={{ uri: resolveImageUrl(b.imageUrl) }}
                      style={{ width: '100%', height: '100%' }}
                      contentFit="cover"
                    />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : (
              <View style={[styles.bannerWrapper, radius.heroCard, shadows.sm]}>
                <LinearGradient
                  colors={colors.primaryGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.bannerGradient, { padding: spacing.screen }, radius.heroCard]}
                >
                  <Badge
                    label="FEATURED"
                    variant="accent"
                    icon={<Sparkles size={12} color={colors.accentText} strokeWidth={1.75} />}
                    size="sm"
                  />
                  <Text style={[typography.title, { color: '#FFFFFF', marginTop: spacing.md }]}>
                    {clientConfig.appName}
                  </Text>
                  <Text
                    style={[
                      typography.small,
                      { color: 'rgba(255,255,255,0.85)', marginTop: spacing.xs, maxWidth: 280 },
                    ]}
                  >
                    Upgrade your skills with structured video masterclasses taught by top creators.
                  </Text>
                </LinearGradient>
              </View>
            )}
          </Animated.View>
        );

      case 'liveNow':
      case 'live_stream':
        if (!liveNowClass) return null;
        return (
          <Animated.View
            key={section.id || `live-${index}`}
            entering={FadeInDown.duration(400)}
            style={{ marginTop: spacing.lg }}
          >
            <Card
              padding={spacing.base}
              onPress={() => router.push('/(tabs)/live')}
              style={{
                borderColor: colors.error,
                borderWidth: 1.5,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Radio size={16} color={colors.error} strokeWidth={2.5} />
                  <Text style={[typography.heading, { color: colors.error, fontSize: 13 }]}>
                    {section.title || t('liveStreamNow')}
                  </Text>
                </View>
                <Badge label={t('joinNow')} variant="error" size="sm" />
              </View>
              <Text
                style={[typography.title, { color: colors.text, marginTop: spacing.xs, fontSize: 16 }]}
                numberOfLines={1}
              >
                {liveNowClass.title}
              </Text>
              <Text style={[typography.caption, { color: colors.textMuted, marginTop: 2 }]}>
                {liveNowClass.courseTitle || 'Free Masterclass'} • Tap to join live stream
              </Text>
            </Card>
          </Animated.View>
        );

      case 'continueWatching':
        if (inProgressList.length === 0) return null;
        return (
          <Animated.View
            key={section.id || `continue-${index}`}
            entering={FadeInDown.duration(400).delay(200)}
            style={{ marginTop: spacing.xl }}
          >
            <View style={styles.sectionHeader}>
              <Text style={[typography.heading, { color: colors.text }]}>
                {section.title || 'Continue Learning'}
              </Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 12, marginTop: spacing.md }}
            >
              {inProgressList.map((item) => (
                <Card
                  key={`progress-${item.id}`}
                  onPress={() => router.push({ pathname: '/course/[id]', params: { id: item.id } })}
                  padding={spacing.sm}
                  style={{ width: 240 }}
                >
                  <View
                    style={{
                      width: '100%',
                      height: 100,
                      borderRadius: radius.sm,
                      overflow: 'hidden',
                      backgroundColor: colors.surfaceElevated,
                      position: 'relative',
                    }}
                  >
                    {item.thumbnail ? (
                      <Image
                        source={{ uri: resolveImageUrl(item.thumbnail) }}
                        style={{ width: '100%', height: '100%' }}
                        contentFit="cover"
                      />
                    ) : null}
                    <View
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.3)',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <View
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 18,
                          backgroundColor: colors.primary,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Play size={16} color="#FFFFFF" fill="#FFFFFF" style={{ marginLeft: 2 }} />
                      </View>
                    </View>
                  </View>
                  <Text
                    style={[typography.caption, { color: colors.text, fontWeight: '600', marginTop: 8 }]}
                    numberOfLines={1}
                  >
                    {item.title}
                  </Text>
                  <View style={{ marginTop: 6 }}>
                    <ProgressBar
                      value={item.progress.percentComplete || 10}
                      label={`${Math.round(item.progress.percentComplete || 10)}% completed`}
                    />
                  </View>
                </Card>
              ))}
            </ScrollView>
          </Animated.View>
        );

      case 'categories':
        if (categories.length === 0) return null;
        return (
          <Animated.View
            key={section.id || `categories-${index}`}
            entering={FadeInDown.duration(400).delay(220)}
            style={{ marginTop: spacing.xl }}
          >
            <View style={styles.sectionHeader}>
              <Text style={[typography.heading, { color: colors.text }]}>
                {section.title || 'Explore Categories'}
              </Text>
              <TouchableOpacity
                onPress={() => router.push('/(tabs)/courses')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={[typography.caption, { color: colors.primary, fontWeight: '600' }]}>
                  {t('seeAll')}
                </Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, marginTop: spacing.md }}
            >
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => router.push('/(tabs)/courses')}
                  activeOpacity={0.8}
                  style={[
                    {
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      paddingHorizontal: 14,
                      paddingVertical: 10,
                      borderRadius: radius.full,
                      backgroundColor: colors.surface,
                      borderWidth: 1,
                      borderColor: colors.border,
                    },
                    shadows.sm,
                  ]}
                >
                  <FolderOpen size={14} color={colors.primary} />
                  <Text style={[typography.caption, { color: colors.text, fontWeight: '600' }]}>
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Animated.View>
        );

      case 'newCourses':
        if (newCoursesList.length === 0) return null;
        return (
          <Animated.View
            key={section.id || `new-${index}`}
            entering={FadeInDown.duration(400).delay(240)}
            style={{ marginTop: spacing.xl }}
          >
            <View style={styles.sectionHeader}>
              <Text style={[typography.heading, { color: colors.text }]}>
                {section.title || 'New Releases'}
              </Text>
              <TouchableOpacity
                onPress={() => router.push('/(tabs)/courses')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={[typography.caption, { color: colors.primary, fontWeight: '600' }]}>
                  {t('seeAll')}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={{ gap: spacing.base, marginTop: spacing.md }}>
              {newCoursesList.slice(0, 3).map(renderCourseCard)}
            </View>
          </Animated.View>
        );

      case 'featured':
      case 'featured_courses':
        if (featuredList.length === 0) return null;
        return (
          <Animated.View
            key={section.id || `featured-${index}`}
            entering={FadeInDown.duration(400).delay(250)}
            style={{ marginTop: spacing.xl }}
          >
            <View style={styles.sectionHeader}>
              <Text style={[typography.heading, { color: colors.text }]}>
                {section.title || t('featured')}
              </Text>
              <TouchableOpacity
                onPress={() => router.push('/(tabs)/courses')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={[typography.caption, { color: colors.primary, fontWeight: '600' }]}>
                  {t('seeAll')}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={{ gap: spacing.base, marginTop: spacing.md }}>
              {featuredList.slice(0, 3).map(renderCourseCard)}
            </View>
          </Animated.View>
        );

      case 'popular':
      case 'popular_courses':
        return (
          <Animated.View
            key={section.id || `popular-${index}`}
            entering={FadeInDown.duration(400).delay(260)}
            style={{ marginTop: spacing.xl }}
          >
            <View style={styles.sectionHeader}>
              <Text style={[typography.heading, { color: colors.text }]}>
                {section.title || t('popularCourses')}
              </Text>
              <TouchableOpacity
                onPress={() => router.push('/(tabs)/courses')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={[typography.caption, { color: colors.primary, fontWeight: '600' }]}>
                  {t('seeAll')}
                </Text>
              </TouchableOpacity>
            </View>

            {loading ? (
              <View style={{ gap: spacing.base, marginTop: spacing.md }}>
                <Skeleton height={140} borderRadius={radius.card} />
                <Skeleton height={140} borderRadius={radius.card} />
              </View>
            ) : (
              <View style={{ gap: spacing.base, marginTop: spacing.md }}>
                {popularList.map(renderCourseCard)}
              </View>
            )}
          </Animated.View>
        );

      case 'streak':
      case 'streak_banner':
        return (
          <Animated.View
            key={section.id || `streak-${index}`}
            entering={FadeInDown.duration(400).delay(230)}
            style={{ marginTop: spacing.lg }}
          >
            <Card padding={spacing.base}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Flame size={18} color={colors.accent} strokeWidth={1.75} />
                  <Text style={[typography.heading, { color: colors.text, marginLeft: 6 }]}>
                    {section.title || `3-${t('dayStreak')}`}
                  </Text>
                </View>
                <Badge label={t('onTrack')} variant="success" size="sm" />
              </View>
              <Text style={[typography.caption, { color: colors.textMuted, marginTop: 4 }]}>
                {t('watchStreakDesc')}
              </Text>
              <View style={{ marginTop: spacing.md }}>
                <ProgressBar value={60} label={t('weeklyGoal')} />
              </View>
            </Card>
          </Animated.View>
        );

      default:
        return null;
    }
  };

  // Sort home sections by order
  const sortedSections = [...homeSections].sort((a, b) => (a.order || 0) - (b.order || 0));

  return (
    <Screen withTopInset>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: spacing.screen }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header with Greeting & Avatar */}
        <Animated.View
          entering={FadeInDown.duration(400).delay(80)}
          style={[styles.headerRow, { marginTop: spacing.base }]}
        >
          <View style={{ flex: 1 }}>
            <Text style={[typography.caption, { color: colors.textMuted }]}>
              {timeOfDayGreeting}
            </Text>
            <Text
              style={[
                typography.title,
                { color: colors.text, marginTop: 2 },
              ]}
              numberOfLines={1}
            >
              {profile?.name || t('student')}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TouchableOpacity
              onPress={() => router.push('/notifications')}
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.border,
                alignItems: 'center',
                justifyContent: 'center',
              }}
              accessibilityRole="button"
              accessibilityLabel="Open Notifications"
            >
              <Bell size={20} color={colors.text} strokeWidth={1.75} />
              {unreadCount > 0 && (
                <View
                  style={{
                    position: 'absolute',
                    top: 6,
                    right: 6,
                    minWidth: 18,
                    height: 18,
                    borderRadius: 9,
                    backgroundColor: colors.error,
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingHorizontal: 4,
                  }}
                >
                  <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '700' }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push('/(tabs)/profile')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Avatar source={profile?.photoUrl} name={profile?.name} size="md" />
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Search Input Bar */}
        <Animated.View
          entering={FadeInDown.duration(400).delay(140)}
          style={[
            styles.searchContainer,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: radius.input,
              marginTop: spacing.lg,
            },
            shadows.sm,
          ]}
        >
          <Search size={18} color={colors.textMuted} strokeWidth={1.75} style={{ marginRight: 10 }} />
          <TextInput
            placeholder={t('searchHomePlaceholder')}
            placeholderTextColor={colors.textMuted}
            style={[
              typography.body,
              styles.searchInput,
              { color: colors.text },
            ]}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </Animated.View>

        {/* Search Results Filter (if typing) OR Dynamic Home Sections */}
        {filteredCourses ? (
          <View style={{ marginTop: spacing.xl, gap: spacing.base }}>
            <Text style={[typography.heading, { color: colors.text }]}>
              {`Search Results (${filteredCourses.length})`}
            </Text>
            {filteredCourses.length === 0 ? (
              <Text style={[typography.body, { color: colors.textMuted, marginTop: 8 }]}>
                No courses match &quot;{searchQuery}&quot;
              </Text>
            ) : (
              filteredCourses.map(renderCourseCard)
            )}
          </View>
        ) : (
          sortedSections.map((section, idx) => renderSection(section, idx))
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 100,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    minHeight: 48,
    paddingHorizontal: 16,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    paddingVertical: 0,
  },
  bannerWrapper: {
    overflow: 'hidden',
    width: '100%',
  },
  bannerGradient: {
    width: '100%',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  courseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
