import { create } from 'zustand';
import { collection, onSnapshot, query, limit } from 'firebase/firestore';
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
  notifications: InAppNotification[];
  readIds: string[];
  unreadCount: number;
  isInitialized: boolean;
  initListener: () => () => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
}

const STORAGE_KEY = 'user_read_notification_ids';

const loadStoredReadIds = (): string[] => {
  try {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    }
  } catch (e) {}
  return [];
};

const saveStoredReadIds = (ids: string[]) => {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    }
  } catch (e) {}
};

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  readIds: loadStoredReadIds(),
  unreadCount: 0,
  isInitialized: false,

  initListener: () => {
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
          const tA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : new Date(a.createdAt || 0).getTime();
          const tB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : new Date(b.createdAt || 0).getTime();
          return tB - tA;
        });

        const currentReadIds = get().readIds;
        const unread = list.filter((n) => !currentReadIds.includes(n.id)).length;

        set({
          notifications: list,
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
      saveStoredReadIds(updatedReadIds);
      const unread = notifications.filter((n) => !updatedReadIds.includes(n.id)).length;
      set({ readIds: updatedReadIds, unreadCount: unread });
    }
  },

  markAllAsRead: () => {
    const { notifications } = get();
    const allIds = notifications.map((n) => n.id);
    saveStoredReadIds(allIds);
    set({ readIds: allIds, unreadCount: 0 });
  },

  clearAll: () => {
    const { notifications } = get();
    const allIds = notifications.map((n) => n.id);
    saveStoredReadIds(allIds);
    set({ readIds: allIds, unreadCount: 0 });
  },
}));
