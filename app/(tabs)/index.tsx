import React, { useState, useEffect, useMemo } from 'react';
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
import { motionLayout } from '../../src/motion/tokens/layout';
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
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
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

  // 4. Subscribe to real-time home sections (for admin visibility toggles)
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

  const handleBannerPress = (b: Banner) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const targetType = b.actionType || b.targetType;
    const targetValue = b.actionValue || b.targetValue;
    if (targetType === 'course' && targetValue) {
      router.push({ pathname: '/course/[id]', params: { id: targetValue } });
    } else if (targetType === 'category') {
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

  // Derive categories dynamically from catalog if none exist in standalone collection
  const categoryPills = useMemo(() => {
    const baseNames = categories.length > 0
      ? categories.map((c) => c.name)
      : Array.from(new Set(courses.map((c) => c.category).filter(Boolean)));
    return ['All', ...(baseNames.length > 0 ? baseNames : ['YouTube Growth', 'Monetization', 'Video Editing'])];
  }, [categories, courses]);

  // Filter courses by search or category
  const displayList = useMemo(() => {
    let list = courses;
    if (selectedCategory !== 'All') {
      list = list.filter((c) => c.category === selectedCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.instructor?.toLowerCase().includes(q) ||
          c.category?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [courses, selectedCategory, searchQuery]);

  // Section visibility guards (from HomeSections manager)
  const isBannersVisible =
    homeSections.find((s) => s.type === 'banners' || s.type === 'banner' || s.id === 'sec_banner')?.isVisible !== false;
  const isLiveSectionVisible =
    homeSections.find((s) => s.type === 'live_stream' || s.type === 'liveNow')?.isVisible !== false;
  const isStreakVisible =
    homeSections.find((s) => s.type === 'streak_banner' || s.type === 'streak')?.isVisible !== false;
  const isCoursesVisible =
    homeSections.find((s) => s.type === 'courses' || s.type === 'popular_courses' || s.type === 'popular' || s.id === 'sec_featured')?.isVisible !== false;

  return (
    <Screen withTopInset>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: spacing.screen }]}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Header: Greeting & Avatar */}
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

        {/* 2. Search Input Bar */}
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

        {/* 3. Hero Promotional Banners (Carousel or Signature Gradient Card) */}
        {isBannersVisible && (
          <Animated.View
            entering={FadeInDown.duration(400).delay(200)}
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

                  <Text
                    style={[
                      typography.title,
                      { color: '#FFFFFF', marginTop: spacing.md },
                    ]}
                  >
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
        )}

        {/* 4. Real-time Live Class Banner (when live) */}
        {isLiveSectionVisible && liveNowClass && (
          <Animated.View
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
                    {t('liveStreamNow')}
                  </Text>
                </View>
                <Badge label={t('joinNow')} variant="error" size="sm" />
              </View>
              <Text
                style={[
                  typography.title,
                  { color: colors.text, marginTop: spacing.xs, fontSize: 16 },
                ]}
                numberOfLines={1}
              >
                {liveNowClass.title}
              </Text>
              <Text
                style={[
                  typography.caption,
                  { color: colors.textMuted, marginTop: 2 },
                ]}
              >
                {liveNowClass.courseTitle || 'Free Masterclass'} • Tap to join live stream
              </Text>
            </Card>
          </Animated.View>
        )}

        {/* 5. Daily Learning Streak Widget */}
        {isStreakVisible && (
          <Animated.View
            entering={FadeInDown.duration(400).delay(230)}
            style={{ marginTop: spacing.lg }}
          >
            <Card padding={spacing.base}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Flame size={18} color={colors.accent} strokeWidth={1.75} />
                  <Text style={[typography.heading, { color: colors.text, marginLeft: 6 }]}>
                    {`3-${t('dayStreak')}`}
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
        )}

        {/* 6. Quick Category Filters Row */}
        <Animated.View
          entering={FadeInDown.duration(400).delay(240)}
          style={{ marginTop: spacing.xl }}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
          >
            {categoryPills.map((catName) => {
              const isSelected = selectedCategory === catName;
              return (
                <TouchableOpacity
                  key={catName}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedCategory(catName);
                  }}
                  activeOpacity={0.8}
                  style={[
                    styles.categoryPill,
                    {
                      backgroundColor: isSelected ? colors.primary : colors.surface,
                      borderColor: isSelected ? colors.primary : colors.border,
                      borderRadius: radius.full,
                    },
                    shadows.sm,
                  ]}
                >
                  <FolderOpen size={13} color={isSelected ? '#FFFFFF' : colors.textMuted} />
                  <Text
                    style={[
                      typography.caption,
                      {
                        color: isSelected ? '#FFFFFF' : colors.text,
                        fontWeight: isSelected ? '700' : '500',
                      },
                    ]}
                  >
                    {catName}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Animated.View>

        {/* 7. Popular & Featured Courses Section */}
        {isCoursesVisible && (
          <Animated.View
            entering={FadeInDown.duration(400).delay(260)}
            style={{ marginTop: spacing.xl }}
          >
            <View style={styles.sectionHeader}>
              <Text style={[typography.heading, { color: colors.text }]}>
                {selectedCategory === 'All' ? t('popularCourses') : `${selectedCategory} Courses`}
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
            ) : displayList.length === 0 ? (
              <Card padding={spacing.xl} style={{ marginTop: spacing.md, alignItems: 'center' }}>
                <BookOpen size={36} color={colors.textMuted} strokeWidth={1.5} />
                <Text style={[typography.title, { color: colors.text, marginTop: 12, textAlign: 'center' }]}>
                  No Courses Found
                </Text>
                <Text style={[typography.small, { color: colors.textMuted, marginTop: 4, textAlign: 'center' }]}>
                  {searchQuery
                    ? `No courses matching "${searchQuery}"`
                    : 'Check back soon for new course releases.'}
                </Text>
              </Card>
            ) : (
              <View style={{ gap: spacing.base, marginTop: spacing.md }}>
                {displayList.map((course) => {
                  const displayPrice = course.discountPrice
                    ? `₹${course.discountPrice.toLocaleString('en-IN')}`
                    : typeof course.price === 'number'
                    ? `₹${course.price.toLocaleString('en-IN')}`
                    : course.price;
                  const displayBadge =
                    course.isFeatured ? t('featured') : course.isNew ? t('newBadge') : t('bestseller');

                  return (
                    <Animated.View key={course.id} layout={motionLayout.snappy}>
                      <Card
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

                        {/* Card Footer: Metadata & Price */}
                        <View
                          style={[
                            styles.cardFooter,
                            {
                              borderTopColor: colors.border,
                              marginTop: spacing.md,
                              paddingTop: spacing.sm,
                            },
                          ]}
                        >
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
                    </Animated.View>
                  );
                })}
              </View>
            )}
          </Animated.View>
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
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
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
