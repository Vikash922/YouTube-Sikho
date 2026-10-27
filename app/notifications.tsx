import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { GestureDetector } from 'react-native-gesture-handler';
import { Image } from 'expo-image';
import {
  ArrowLeft,
  Bell,
  CheckCheck,
  Radio,
  BookOpen,
  ExternalLink,
  Clock,
  Trash2,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../src/theme';
import { useNotificationStore, InAppNotification } from '../src/store/useNotificationStore';
import { Screen } from '../src/components/common/Screen';
import { EmptyState } from '../src/components/common/EmptyState';
import { resolveImageUrl } from '../src/utils/imageUrlResolver';
import { useSwipeAction } from '../src/motion/hooks/useSwipeAction';
import { motionLayout } from '../src/motion/tokens/layout';
import { AnimatedLottieView } from '../src/motion/lottie';

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, typography, spacing } = useTheme();

  const notifications = useNotificationStore((state) => state.notifications);
  const readIds = useNotificationStore((state) => state.readIds);
  const unreadCount = useNotificationStore((state) => state.unreadCount);
  const markAsRead = useNotificationStore((state) => state.markAsRead);
  const markAllAsRead = useNotificationStore((state) => state.markAllAsRead);
  const deleteNotification = useNotificationStore((state) => state.deleteNotification);
  const clearAll = useNotificationStore((state) => state.clearAll);

  const handleNotificationPress = (item: InAppNotification) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    markAsRead(item.id);

    if (item.actionType === 'course' && item.actionData) {
      router.push({ pathname: '/course/[id]', params: { id: item.actionData } });
    } else if (item.actionType === 'live' && item.actionData) {
      router.push({ pathname: '/live/[id]', params: { id: item.actionData } });
    } else if (item.actionType === 'url' && item.actionData) {
      Linking.openURL(item.actionData);
    }
  };

  const handleMarkAll = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    markAllAsRead();
  };

  const handleDeleteItem = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    deleteNotification(id);
  };

  const handleClearAll = () => {
    Alert.alert(
      'Clear All Notifications',
      'Are you sure you want to remove all notifications?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            clearAll();
          },
        },
      ]
    );
  };

  const formatTimeAgo = (dateVal: any): string => {
    if (!dateVal) return '';
    try {
      const ms = dateVal.seconds
        ? dateVal.seconds * 1000
        : new Date(dateVal).getTime();
      const diffSecs = Math.floor((Date.now() - ms) / 1000);
      if (diffSecs < 60) return 'Just now';
      if (diffSecs < 3600) return `${Math.floor(diffSecs / 60)}m ago`;
      if (diffSecs < 86400) return `${Math.floor(diffSecs / 3600)}h ago`;
      return `${Math.floor(diffSecs / 86400)}d ago`;
    } catch {
      return '';
    }
  };

  return (
    <Screen style={{ backgroundColor: colors.background }}>
      {/* 1. Header Bar */}
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
          accessibilityLabel="Back"
          style={[styles.backButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <ArrowLeft size={20} color={colors.text} strokeWidth={1.75} />
        </TouchableOpacity>

        <View style={{ flex: 1, marginLeft: spacing.sm }}>
          <Text style={[typography.title, { color: colors.text }]} numberOfLines={1}>
            Notifications
          </Text>
          <Text style={[typography.caption, { color: colors.textMuted }]}>
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
          </Text>
        </View>

        {notifications.length > 0 && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {unreadCount > 0 && (
              <TouchableOpacity
                onPress={handleMarkAll}
                style={[
                  styles.markAllBtn,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
                accessibilityLabel="Mark all read"
              >
                <CheckCheck size={16} color={colors.primary} strokeWidth={2} />
                <Text style={[typography.small, { color: colors.primary, fontWeight: '700', marginLeft: 4 }]}>
                  Read all
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={handleClearAll}
              style={[
                styles.iconActionBtn,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
              accessibilityLabel="Clear all notifications"
            >
              <Trash2 size={16} color={colors.error} strokeWidth={1.75} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* 2. Notifications List */}
      {notifications.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <EmptyState
            icon={
              <AnimatedLottieView
                source={require('../assets/animations/empty-notifications.json')}
                style={{ width: 44, height: 44 }}
                fallbackIcon={<Bell size={36} color={colors.primary} strokeWidth={1.75} />}
              />
            }
            title="All caught up!"
            description="You don't have any notifications right now. Broadcast announcements, live stream alerts, and course updates will appear here."
            actionTitle="Explore Courses"
            onAction={() => router.replace('/(tabs)/courses')}
          />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.listContent, { paddingHorizontal: spacing.screen }]}
          renderItem={({ item, index }) => (
            <NotificationItemRow
              key={item.id}
              item={item}
              index={index}
              isRead={readIds.includes(item.id)}
              timeAgo={formatTimeAgo(item.createdAt)}
              onPress={() => handleNotificationPress(item)}
              onDelete={() => handleDeleteItem(item.id)}
            />
          )}
        />
      )}
    </Screen>
  );
}

interface NotificationItemRowProps {
  item: InAppNotification;
  index: number;
  isRead: boolean;
  timeAgo: string;
  onPress: () => void;
  onDelete: () => void;
}

const NotificationItemRow: React.FC<NotificationItemRowProps> = ({
  item,
  index,
  isRead,
  timeAgo,
  onPress,
  onDelete,
}) => {
  const { colors, typography, radius, shadows } = useTheme();
  const resolvedImg = resolveImageUrl(item.imageUrl);

  const { gesture, animatedStyle } = useSwipeAction({
    onDelete,
    revealWidth: 80,
    dismissThreshold: 140,
  });

  return (
    <Animated.View
      layout={motionLayout.snappy}
      entering={FadeInDown.duration(300).delay(index * 40)}
      style={styles.swipeWrapper}
    >
      {/* Background Delete Action Revealed on Swipe */}
      <View
        style={[
          styles.deleteActionBehind,
          {
            backgroundColor: colors.error,
            borderRadius: radius.card,
          },
        ]}
      >
        <TouchableOpacity
          onPress={onDelete}
          style={styles.deleteButtonTouch}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Delete notification"
        >
          <Trash2 size={20} color="#FFFFFF" strokeWidth={2} />
          <Text style={[typography.caption, { color: '#FFFFFF', fontWeight: '700', marginTop: 2 }]}>
            Delete
          </Text>
        </TouchableOpacity>
      </View>

      {/* Swipeable Foreground Card */}
      <GestureDetector gesture={gesture}>
        <Animated.View style={[animatedStyle, { width: '100%' }]}>
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={onPress}
            style={[
              styles.notificationCard,
              {
                backgroundColor: isRead ? colors.surface : colors.surfaceElevated,
                borderColor: isRead ? colors.border : colors.primary,
                borderRadius: radius.card,
              },
              shadows.sm,
            ]}
          >
            <View style={styles.cardHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                {!isRead && (
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: colors.primary,
                    }}
                  />
                )}
                <Text
                  style={[
                    typography.heading,
                    {
                      color: colors.text,
                      fontSize: 15,
                      fontWeight: isRead ? '600' : '700',
                      flex: 1,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {item.title}
                </Text>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {timeAgo ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                    <Clock size={12} color={colors.textMuted} />
                    <Text style={[typography.caption, { color: colors.textMuted }]}>
                      {timeAgo}
                    </Text>
                  </View>
                ) : null}

                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation?.();
                    onDelete();
                  }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  accessibilityRole="button"
                  accessibilityLabel="Delete notification"
                  style={styles.deleteItemBtn}
                >
                  <Trash2 size={15} color={colors.textMuted} strokeWidth={1.75} />
                </TouchableOpacity>
              </View>
            </View>

            <Text
              style={[
                typography.body,
                {
                  color: colors.textMuted,
                  marginTop: 6,
                  fontSize: 13,
                  lineHeight: 18,
                },
              ]}
            >
              {item.body}
            </Text>

            {/* Optional resolved banner image */}
            {resolvedImg ? (
              <View
                style={{
                  width: '100%',
                  height: 140,
                  borderRadius: radius.sm,
                  overflow: 'hidden',
                  marginTop: 10,
                  backgroundColor: colors.background,
                }}
              >
                <Image
                  source={{ uri: resolvedImg }}
                  style={{ width: '100%', height: '100%' }}
                  contentFit="cover"
                  transition={200}
                />
              </View>
            ) : null}

            {/* Action Link Footer */}
            {item.actionType && item.actionType !== 'notifications' && item.actionData && (
              <View style={styles.actionFooter}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  {item.actionType === 'live' && <Radio size={14} color={colors.error} />}
                  {item.actionType === 'course' && <BookOpen size={14} color={colors.primary} />}
                  {item.actionType === 'url' && <ExternalLink size={14} color={colors.primary} />}
                  <Text
                    style={[
                      typography.caption,
                      {
                        color: item.actionType === 'live' ? colors.error : colors.primary,
                        fontWeight: '700',
                      },
                    ]}
                  >
                    {item.actionType === 'live'
                      ? 'Tap to Join Live Class'
                      : item.actionType === 'course'
                      ? 'Tap to View Course'
                      : 'Open Link'}
                  </Text>
                </View>
              </View>
            )}
          </TouchableOpacity>
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  iconActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteItemBtn: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingVertical: 16,
    gap: 12,
  },
  swipeWrapper: {
    position: 'relative',
    width: '100%',
  },
  deleteActionBehind: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButtonTouch: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationCard: {
    padding: 16,
    borderWidth: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionFooter: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(150,150,150,0.2)',
  },
});
