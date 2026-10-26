import { create } from 'zustand';
import { collection, onSnapshot, query, limit, orderBy, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { firebaseFirestore, firebaseAuth, onAuthStateChanged } from '../services/firebase';

export interface InAppNotification {
  id: string;
  title: string;
  body: string;
  imageUrl?: string | null;
  type?: string;
  actionType?: string;
  actionValue?: string | null;
  actionData?: string | null;
  createdAt?: any;
  sentAt?: any;
  isRead?: boolean;
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
        (n) => !n.isRead && !persistedRead.includes(n.id)
      ).length;

      set({
        readIds: persistedRead,
        deletedIds: persistedDeleted,
        notifications: visibleList,
        unreadCount: unread,
      });
    });

    let currentUnsubscribe: (() => void) | null = null;

    const setupUserListener = (uid: string | null) => {
      if (currentUnsubscribe) {
        currentUnsubscribe();
        currentUnsubscribe = null;
      }

      if (!uid) {
        set({
          rawNotifications: [],
          notifications: [],
          unreadCount: 0,
          isInitialized: true,
        });
        return;
      }

      // Read strictly from userNotifications/{uid}/items per ARCHITECTURE.md Part 7.3
      const itemsRef = collection(firebaseFirestore, 'userNotifications', uid, 'items');
      const q = query(itemsRef, orderBy('createdAt', 'desc'), limit(50));

      currentUnsubscribe = onSnapshot(
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
              actionType: data.actionType || 'none',
              actionValue: data.actionValue || data.actionData || null,
              actionData: data.actionValue || data.actionData || null,
              isRead: data.isRead === true,
              createdAt: data.createdAt || data.sentAt || new Date(),
            } as InAppNotification;
          });

          const { readIds, deletedIds } = get();
          const visibleList = list.filter((n) => !deletedIds.includes(n.id));
          const unread = visibleList.filter((n) => !n.isRead && !readIds.includes(n.id)).length;

          set({
            rawNotifications: list,
            notifications: visibleList,
            unreadCount: unread,
            isInitialized: true,
          });
        },
        (err) => {
          console.warn('[NotificationStore] Listener warning:', err.message);
          set({ isInitialized: true });
        }
      );
    };

    // Listen to Auth State to attach or detach user inbox listener
    const authUnsubscribe = onAuthStateChanged(firebaseAuth, (user: any) => {
      setupUserListener(user?.uid || null);
    });

    return () => {
      authUnsubscribe();
      if (currentUnsubscribe) currentUnsubscribe();
    };
  },

  markAsRead: (id: string) => {
    const { readIds, notifications } = get();
    const currentUser = firebaseAuth.currentUser;

    if (!readIds.includes(id)) {
      const updatedReadIds = [...readIds, id];
      savePersistedIds(READ_STORAGE_KEY, updatedReadIds);
      const unread = notifications.filter((n) => !n.isRead && !updatedReadIds.includes(n.id)).length;
      set({ readIds: updatedReadIds, unreadCount: unread });
    }

    // Update in Firestore userNotifications/{uid}/items/{id} if signed in
    if (currentUser?.uid) {
      const itemRef = doc(firebaseFirestore, 'userNotifications', currentUser.uid, 'items', id);
      updateDoc(itemRef, { isRead: true }).catch(() => {});
    }
  },

  markAllAsRead: () => {
    const { notifications, readIds } = get();
    const currentUser = firebaseAuth.currentUser;
    const allIds = Array.from(new Set([...readIds, ...notifications.map((n) => n.id)]));
    savePersistedIds(READ_STORAGE_KEY, allIds);
    set({ readIds: allIds, unreadCount: 0 });

    if (currentUser?.uid) {
      notifications.forEach((n) => {
        if (!n.isRead) {
          const itemRef = doc(firebaseFirestore, 'userNotifications', currentUser.uid, 'items', n.id);
          updateDoc(itemRef, { isRead: true }).catch(() => {});
        }
      });
    }
  },

  deleteNotification: (id: string) => {
    const { deletedIds, rawNotifications, readIds } = get();
    const currentUser = firebaseAuth.currentUser;
    const updatedDeletedIds = Array.from(new Set([...deletedIds, id]));
    savePersistedIds(DELETED_STORAGE_KEY, updatedDeletedIds);

    const visibleList = rawNotifications.filter(
      (n) => !updatedDeletedIds.includes(n.id)
    );
    const unread = visibleList.filter(
      (n) => !n.isRead && !readIds.includes(n.id)
    ).length;

    set({
      deletedIds: updatedDeletedIds,
      notifications: visibleList,
      unreadCount: unread,
    });

    if (currentUser?.uid) {
      const itemRef = doc(firebaseFirestore, 'userNotifications', currentUser.uid, 'items', id);
      deleteDoc(itemRef).catch(() => {});
    }
  },

  clearAll: () => {
    const { deletedIds, notifications } = get();
    const currentUser = firebaseAuth.currentUser;
    const allDeleted = Array.from(
      new Set([...deletedIds, ...notifications.map((n) => n.id)])
    );
    savePersistedIds(DELETED_STORAGE_KEY, allDeleted);
    set({
      deletedIds: allDeleted,
      notifications: [],
      unreadCount: 0,
    });

    if (currentUser?.uid) {
      notifications.forEach((n) => {
        const itemRef = doc(firebaseFirestore, 'userNotifications', currentUser.uid, 'items', n.id);
        deleteDoc(itemRef).catch(() => {});
      });
    }
  },
}));
