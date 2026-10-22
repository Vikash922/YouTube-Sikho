import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Bell,
  ArrowLeft,
  Trash2,
  BookOpen,
  Radio,
  ExternalLink,
  CheckCheck,
  CheckCircle2,
} from 'lucide-react-native';
import { useThemeColors } from '../../src/theme';
import { firebaseAuth } from '../../src/services/firebase';
import {
  UserNotificationItem,
  subscribeToUserNotifications,
  markNotificationAsRead,
  deleteNotificationItem,
} from '../../src/services/notificationService';

export default function NotificationCenterScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const [notifications, setNotifications] = useState<UserNotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const currentUser = firebaseAuth.currentUser;
  const uid = currentUser?.uid || '';

  useEffect(() => {
    if (!uid) {
      setLoading(false);
      return;
    }

    const unsubscribe = subscribeToUserNotifications(
      uid,
      (items) => {
        setNotifications(items);
        setLoading(false);
      },
      () => {
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [uid]);

  const handleItemPress = async (item: UserNotificationItem) => {
    if (!item.read && uid) {
      markNotificationAsRead(uid, item.id);
    }

    if (item.actionType === 'course' && item.actionData) {
      router.push(`/course/${item.actionData}` as any);
    } else if (item.actionType === 'live' && item.actionData) {
      router.push(`/live/${item.actionData}` as any);
    } else if (item.actionType === 'url' && item.actionData) {
      Linking.openURL(item.actionData).catch((err) =>
        console.warn('Could not open external URL:', err)
      );
    }
  };

  const handleDelete = (itemId: string) => {
    if (!uid) return;
    deleteNotificationItem(uid, itemId);
  };

  const handleMarkAllRead = () => {
    if (!uid) return;
    notifications.forEach((item) => {
      if (!item.read) {
        markNotificationAsRead(uid, item.id);
      }
    });
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  const renderItem = ({ item }: { item: UserNotificationItem }) => {
    const isUnread = !item.read;

    return (
      <TouchableOpacity
        onPress={() => handleItemPress(item)}
        style={[
          styles.itemCard,
          {
            backgroundColor: isUnread ? colors.surfaceHighlight : colors.surface,
            borderColor: colors.border,
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel={`${isUnread ? 'Unread: ' : ''}${item.title}. ${item.body}`}
      >
        {/* Left Action Icon */}
        <View
          style={[
            styles.iconWrapper,
            { backgroundColor: isUnread ? colors.accentMuted : colors.surfaceHover },
          ]}
        >
          {item.actionType === 'course' ? (
            <BookOpen size={20} color={colors.primary} />
          ) : item.actionType === 'live' ? (
            <Radio size={20} color={colors.semanticError} />
          ) : item.actionType === 'url' ? (
            <ExternalLink size={20} color={colors.primary} />
          ) : (
            <Bell size={20} color={colors.primary} />
          )}
        </View>

        {/* Content */}
        <View style={styles.textContainer}>
          <View style={styles.titleRow}>
            <Text
              style={[
                styles.title,
                {
                  color: colors.textPrimary,
                  fontWeight: isUnread ? '700' : '600',
                },
              ]}
              numberOfLines={1}
            >
              {item.title}
            </Text>
            {isUnread && (
              <View
                style={[styles.unreadDot, { backgroundColor: colors.primary }]}
              />
            )}
          </View>
          <Text
            style={[styles.bodyText, { color: colors.textSecondary }]}
            numberOfLines={2}
          >
            {item.body}
          </Text>
        </View>

        {/* Delete action */}
        <TouchableOpacity
          onPress={() => handleDelete(item.id)}
          style={styles.deleteBtn}
          accessibilityRole="button"
          accessibilityLabel="Delete notification"
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Trash2 size={18} color={colors.textTertiary} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top Header */}
      <View
        style={[
          styles.header,
          { backgroundColor: colors.surface, borderBottomColor: colors.border },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={22} color={colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            Notifications
          </Text>
          {unreadCount > 0 && (
            <View
              style={[
                styles.badgePill,
                { backgroundColor: colors.accentMuted },
              ]}
            >
              <Text style={[styles.badgeText, { color: colors.primary }]}>
                {unreadCount} new
              </Text>
            </View>
          )}
        </View>

        {unreadCount > 0 && (
          <TouchableOpacity
            onPress={handleMarkAllRead}
            style={styles.markReadBtn}
            accessibilityRole="button"
            accessibilityLabel="Mark all as read"
          >
            <CheckCheck size={18} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Main Content */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Loading alerts...
          </Text>
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.centerContainer}>
          <View
            style={[
              styles.emptyIconCircle,
              { backgroundColor: colors.surfaceHover },
            ]}
          >
            <CheckCircle2 size={40} color={colors.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
            All caught up!
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            You have no notifications right now. When live classes or updates are posted, you'll see them here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: 64,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  badgePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  markReadBtn: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContainer: {
    padding: 16,
    gap: 12,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
    gap: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontSize: 14,
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  bodyText: {
    fontSize: 13,
    lineHeight: 18,
  },
  deleteBtn: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    marginTop: 8,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  emptySubtitle: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },
});
