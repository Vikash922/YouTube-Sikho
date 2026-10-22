import { create } from 'zustand';
import { collection, onSnapshot, query, limit, orderBy } from 'firebase/firestore';
import { firebaseFirestore, firebaseAuth } from '../services/firebase';

export interface InAppNotification {
  id: string;
  title: string;
  body: string;
  imageUrl?: string | null;
  type?: string;
  actionType?: string;
  actionData?: string | null;
  createdAt?: any;
  read?: boolean;
}

interface NotificationState {
  notifications: InAppNotification[];
  readIds: string[];
  unreadCount: number;
  isInitialized: boolean;
  initListener: () => () => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  readIds: [],
  unreadCount: 0,
  isInitialized: false,

  initListener: () => {
    // 1. Listen to broadcast notifications
    const broadcastRef = collection(firebaseFirestore, 'notifications');
    const q = query(broadcastRef, limit(40));

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
          } as InAppNotification;
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
        console.warn('[NotificationStore] Listener error:', err.message);
      }
    );

    return unsubscribe;
  },

  markAsRead: (id: string) => {
    const { readIds, notifications } = get();
    if (!readIds.includes(id)) {
      const updatedReadIds = [...readIds, id];
      const unread = notifications.filter((n) => !updatedReadIds.includes(n.id)).length;
      set({ readIds: updatedReadIds, unreadCount: unread });
    }
  },

  markAllAsRead: () => {
    const { notifications } = get();
    const allIds = notifications.map((n) => n.id);
    set({ readIds: allIds, unreadCount: 0 });
  },
}));
