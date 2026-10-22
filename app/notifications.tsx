import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  ArrowLeft,
  Bell,
  CheckCircle2,
  Trash2,
  Sparkles,
  Info,
  Clock,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  doc,
  updateDoc,
  deleteDoc,
  limit,
} from 'firebase/firestore';
import { firebaseFirestore } from '../src/services/firebase';
import { useTheme } from '../src/theme';
import { useAuthStore } from '../src/store/useAuthStore';
import { Screen } from '../src/components/common/Screen';
import { EmptyState } from '../src/components/common/EmptyState';
import { Badge } from '../src/components/common/Badge';

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  type?: 'general' | 'live' | 'course' | 'system';
  isRead?: boolean;
  createdAt?: any;
  targetUrl?: string;
  targetId?: string;
}

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, typography, spacing, radius, shadows } = useTheme();
  const user = useAuthStore((state) => state.user);

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  // Real-time listener for notifications
  useEffect(() => {
    // 1. Listen to broadcast notifications
    const broadcastRef = collection(firebaseFirestore, 'notifications');
    const q = query(broadcastRef, limit(30));

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            title: data.title || 'Announcement',
            body: data.body || '',
            type: data.type || 'general',
            isRead: false,
            createdAt: data.createdAt,
            targetUrl: data.targetUrl,
            targetId: data.targetId,
          } as AppNotification;
        });

        setNotifications(list);
        setLoading(false);
      },
      (err) => {
        console.warn('Notifications listener error:', err.message);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [user?.uid]);

  const handleMarkAsRead = (item: AppNotification) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setNotifications((prev) =>
      prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n))
    );

    if (item.targetId) {
      router.push({ pathname: '/course/[id]', params: { id: item.targetId } });
    }
  };

  const handleDelete = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <Screen style={{ backgroundColor: colors.background }}>
      {/* Header */}
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

        <Text
          style={[typography.title, { color: colors.text, flex: 1, marginLeft: spacing.sm }]}
          numberOfLines={1}
        >
          Notification Center
        </Text>
      </View>

      {/* Notifications List */}
      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[typography.caption, { color: colors.textMuted, marginTop: 12 }]}>
            Loading notifications...
          </Text>
        </View>
      ) : notifications.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <EmptyState
            icon={<Bell size={36} color={colors.primary} strokeWidth={1.75} />}
            title="All caught up!"
            description="You don't have any notifications right now. Important announcements and course updates will appear here."
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
            <Animated.View entering={FadeInDown.duration(300).delay(index * 40)}>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => handleMarkAsRead(item)}
                style={[
                  styles.notificationCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: item.isRead ? colors.border : colors.primary,
                    borderRadius: radius.card,
                  },
                  shadows.sm,
                ]}
              >
                <View style={styles.cardTopRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Info size={16} color={colors.primary} strokeWidth={2} />
                    <Text style={[typography.heading, { color: colors.text, fontSize: 15 }]}>
                      {item.title}
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={() => handleDelete(item.id)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Trash2 size={16} color={colors.textMuted} strokeWidth={1.75} />
                  </TouchableOpacity>
                </View>

                <Text style={[typography.body, { color: colors.textMuted, marginTop: 6, fontSize: 14, lineHeight: 20 }]}>
                  {item.body}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          )}
        />
      )}
    </Screen>
  );
}

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
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingVertical: 16,
    gap: 12,
  },
  notificationCard: {
    padding: 16,
    borderWidth: 1,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});