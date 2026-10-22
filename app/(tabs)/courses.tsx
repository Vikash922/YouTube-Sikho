import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Search, BookOpen, Clock, Star, Filter } from 'lucide-react-native';
import { useTheme } from '../../src/theme';
import { Card } from '../../src/components/common/Card';
import { Badge } from '../../src/components/common/Badge';
import { Chip } from '../../src/components/common/Chip';
import { Skeleton } from '../../src/components/common/Skeleton';
import { Screen } from '../../src/components/common/Screen';
import { Header } from '../../src/components/common/Header';
import { EmptyState } from '../../src/components/common/EmptyState';
import {
  Course,
  subscribeToPublishedCourses,
} from '../../src/services/courseService';
import { subscribeToCategories } from '../../src/services/categoryService';

export default function CoursesScreen() {
  const router = useRouter();
  const { colors, typography, radius, spacing, shadows } = useTheme();
  const [courses, setCourses] = useState<Course[]>([]);
  const [categoryNames, setCategoryNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Subscribe to real-time published courses from Firestore
  useEffect(() => {
    const unsubscribe = subscribeToPublishedCourses(
      (list) => {
        setCourses(list);
        setLoading(false);
      },
      () => {
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  // 2. Subscribe to real-time categories from Firestore
  useEffect(() => {
    const unsubCats = subscribeToCategories((cats) => {
      setCategoryNames(cats.map((c) => c.name));
    });
    return () => unsubCats();
  }, []);

  const derivedCategories = Array.from(new Set(courses.map((c) => c.category).filter(Boolean)));
  const categories = [
    'All',
    ...(categoryNames.length > 0 ? categoryNames : derivedCategories),
  ];

  const filteredCourses = courses.filter((c) => {
    const matchesCategory =
      selectedCategory === 'All' || c.category === selectedCategory;
    const matchesSearch =
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.instructor && c.instructor.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  return (
    <Screen withTopInset>
      <Header title="Explore Courses" subtitle="Discover masterclasses curated for creators" />

      {/* Search Input */}
      <View style={{ paddingHorizontal: spacing.screen }}>
        <View
          style={[
            styles.searchBox,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: radius.input,
            },
            shadows.sm,
          ]}
        >
          <Search size={18} color={colors.textMuted} strokeWidth={1.75} style={{ marginRight: 10 }} />
          <TextInput
            placeholder="Search by title or mentor..."
            placeholderTextColor={colors.textMuted}
            style={[
              typography.body,
              styles.searchInput,
              { color: colors.text },
            ]}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Horizontal Category Chips */}
      <View style={{ marginTop: spacing.base }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: spacing.screen, gap: spacing.sm }}
        >
          {categories.map((cat) => (
            <Chip
              key={cat}
              label={cat}
              selected={selectedCategory === cat}
              onPress={() => setSelectedCategory(cat)}
            />
          ))}
        </ScrollView>
      </View>

      {/* Courses List */}
      <ScrollView
        contentContainerStyle={[
          styles.listContent,
          { paddingHorizontal: spacing.screen, marginTop: spacing.lg },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {loading && courses.length === 0 ? (
          <View style={{ gap: spacing.base }}>
            <Skeleton height={140} borderRadius={radius.card} />
            <Skeleton height={140} borderRadius={radius.card} />
            <Skeleton height={140} borderRadius={radius.card} />
          </View>
        ) : filteredCourses.length === 0 ? (
          <EmptyState
            icon={<BookOpen size={32} color={colors.primary} strokeWidth={1.75} />}
            title="No courses found"
            description="Try searching with a different keyword or category."
            actionTitle="Clear Filter"
            onAction={() => {
              setSelectedCategory('All');
              setSearchQuery('');
            }}
          />
        ) : (
          <View style={{ gap: spacing.base }}>
            {filteredCourses.map((course) => {
              const displayPrice = course.discountPrice
                ? `₹${course.discountPrice.toLocaleString('en-IN')}`
                : typeof course.price === 'number'
                ? `₹${course.price.toLocaleString('en-IN')}`
                : course.price;
              const displayBadge =
                course.isFeatured ? 'FEATURED' : course.isNew ? 'NEW' : 'POPULAR';

              return (
                <Card
                  key={course.id}
                  onPress={() => router.push({ pathname: '/course/[id]', params: { id: course.id } })}
                  padding={spacing.base}
                >
                  <View style={styles.cardHeader}>
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

                  <View
                    style={[
                      styles.cardFooter,
                      { borderTopColor: colors.border, marginTop: spacing.md, paddingTop: spacing.sm },
                    ]}
                  >
                    <View style={styles.metaRow}>
                      <Clock size={14} color={colors.textMuted} strokeWidth={1.75} />
                      <Text style={[typography.caption, { color: colors.textMuted, marginLeft: 4 }]}>
                        {course.duration || 'Comprehensive'}
                      </Text>
                    </View>
                    <Text style={[typography.heading, { color: colors.primary }]}>
                      {displayPrice}
                    </Text>
                  </View>
                </Card>
              );
            })}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  searchBox: {
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
  listContent: {
    flexGrow: 1,
    paddingBottom: 100,
  },
  cardHeader: {
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
