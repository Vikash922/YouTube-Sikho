import { create } from 'zustand';
import { collection, onSnapshot, query, limit } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { firebaseFirestore } from '../services/firebase';

export interface InAppNotification {
  id: string;
  title: string;
  body: string;
  imageUrl?: string | null;
  type?: string;
  actionType?: string;
  actionData?: string | null;
  createdAt?: any;
  sentAt?: any;
  target?: string;
  targetId?: string | null;
}

interface NotificationState {
  rawNotifications: InAppNotification[];
  notifications: InAppNotification[];
  readIds: string[];
  deletedIds: string[];
  unreadCount: number;
  isInitialized: boolean;
  initListener: () => () => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (id: string) => void;
  clearAll: () => void;
}

const READ_STORAGE_KEY = '@app_read_notification_ids';
const DELETED_STORAGE_KEY = '@app_deleted_notification_ids';

const loadPersistedIds = async (key: string): Promise<string[]> => {
  try {
    const stored = await AsyncStorage.getItem(key);
    if (stored) return JSON.parse(stored);
  } catch (e) {
    try {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem(key);
        if (stored) return JSON.parse(stored);
      }
    } catch {}
  }
  return [];
};

const savePersistedIds = async (key: string, ids: string[]) => {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(ids));
  } catch (e) {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(key, JSON.stringify(ids));
      }
    } catch {}
  }
};

export const useNotificationStore = create<NotificationState>((set, get) => ({
  rawNotifications: [],
  notifications: [],
  readIds: [],
  deletedIds: [],
  unreadCount: 0,
  isInitialized: false,

  initListener: () => {
    // 1. Load persisted read and deleted ids from AsyncStorage immediately
    Promise.all([
      loadPersistedIds(READ_STORAGE_KEY),
      loadPersistedIds(DELETED_STORAGE_KEY),
    ]).then(([persistedRead, persistedDeleted]) => {
      const { rawNotifications } = get();
      const visibleList = rawNotifications.filter(
        (n) => !persistedDeleted.includes(n.id)
      );
      const unread = visibleList.filter(
        (n) => !persistedRead.includes(n.id)
      ).length;

      set({
        readIds: persistedRead,
        deletedIds: persistedDeleted,
        notifications: visibleList,
        unreadCount: unread,
      });
    });

    const broadcastRef = collection(firebaseFirestore, 'notifications');
    const q = query(broadcastRef, limit(50));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            title: data.title || 'Announcement',
            body: data.body || '',
            imageUrl: data.imageUrl || null,
            type: data.actionType || data.type || 'general',
            actionType: data.actionType || 'notifications',
            actionData: data.actionData || null,
            createdAt: data.sentAt || data.createdAt || new Date(),
            target: data.target || 'all',
            targetId: data.targetId || null,
          } as InAppNotification;
        });

        // Sort descending (newest first)
        list.sort((a, b) => {
          const tA = a.createdAt?.seconds
            ? a.createdAt.seconds * 1000
            : new Date(a.createdAt || 0).getTime();
          const tB = b.createdAt?.seconds
            ? b.createdAt.seconds * 1000
            : new Date(b.createdAt || 0).getTime();
          return tB - tA;
        });

        const { readIds, deletedIds } = get();
        const visibleList = list.filter((n) => !deletedIds.includes(n.id));
        const unread = visibleList.filter((n) => !readIds.includes(n.id)).length;

        set({
          rawNotifications: list,
          notifications: visibleList,
          unreadCount: unread,
          isInitialized: true,
        });
      },
      (err) => {
        console.warn('[NotificationStore] Listener warning:', err.message);
      }
    );

    return unsubscribe;
  },

  markAsRead: (id: string) => {
    const { readIds, notifications } = get();
    if (!readIds.includes(id)) {
      const updatedReadIds = [...readIds, id];
      savePersistedIds(READ_STORAGE_KEY, updatedReadIds);
      const unread = notifications.filter((n) => !updatedReadIds.includes(n.id)).length;
      set({ readIds: updatedReadIds, unreadCount: unread });
    }
  },

  markAllAsRead: () => {
    const { notifications, readIds } = get();
    const allIds = Array.from(new Set([...readIds, ...notifications.map((n) => n.id)]));
    savePersistedIds(READ_STORAGE_KEY, allIds);
    set({ readIds: allIds, unreadCount: 0 });
  },

  deleteNotification: (id: string) => {
    const { deletedIds, rawNotifications, readIds } = get();
    const updatedDeletedIds = Array.from(new Set([...deletedIds, id]));
    savePersistedIds(DELETED_STORAGE_KEY, updatedDeletedIds);
    const visibleList = rawNotifications.filter(
      (n) => !updatedDeletedIds.includes(n.id)
    );
    const unread = visibleList.filter(
      (n) => !readIds.includes(n.id)
    ).length;
    set({
      deletedIds: updatedDeletedIds,
      notifications: visibleList,
      unreadCount: unread,
    });
  },

  clearAll: () => {
    const { deletedIds, notifications } = get();
    const allDeleted = Array.from(
      new Set([...deletedIds, ...notifications.map((n) => n.id)])
    );
    savePersistedIds(DELETED_STORAGE_KEY, allDeleted);
    set({
      deletedIds: allDeleted,
      notifications: [],
      unreadCount: 0,
    });
  },
}));
