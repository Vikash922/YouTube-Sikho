import { create } from 'zustand';
import { User, signOut } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile, getUserProfile } from '../services/userService';
import { firebaseAuth } from '../services/firebase';
import { removePushTokenOnLogout } from '../services/pushNotificationService';

export interface PhoneConfirmation {
  confirm: (verificationCode: string) => Promise<{ user: User }>;
}

interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  confirmation: PhoneConfirmation | null;
  phoneNumber: string;
  pendingRedirectRoute: string | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;

  setUser: (user: User | null) => void;
  setProfile: (profile: UserProfile | null) => void;
  setConfirmation: (confirmation: PhoneConfirmation | null) => void;
  setPhoneNumber: (phone: string) => void;
  setPendingRedirectRoute: (route: string | null) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  refreshProfile: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  confirmation: null,
  phoneNumber: '',
  pendingRedirectRoute: null,
  isLoading: false,
  isInitialized: false,
  error: null,

  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  setConfirmation: (confirmation) => set({ confirmation }),
  setPhoneNumber: (phoneNumber) => set({ phoneNumber }),
  setPendingRedirectRoute: (pendingRedirectRoute) => set({ pendingRedirectRoute }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  refreshProfile: async () => {
    const user = get().user;
    if (!user) {
      set({ profile: null });
      return;
    }
    try {
      const profile = await getUserProfile(user.uid);
      set({ profile });
    } catch (err: any) {
      console.warn('[useAuthStore] Error refreshing profile:', err);
    }
  },

  logout: async () => {
    const currentUid = get().user?.uid;
    if (currentUid) {
      await removePushTokenOnLogout(currentUid);
    }
    try {
      await signOut(firebaseAuth);
    } catch (err) {
      console.warn('[useAuthStore] Firebase signOut error:', err);
    }
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const keysToRemove = allKeys.filter(
        (k) =>
          k.startsWith('@sikho_user_') ||
          k.startsWith('@quiz_autosave_') ||
          k === '@fcm_token'
      );
      if (keysToRemove.length > 0) {
        await AsyncStorage.multiRemove(keysToRemove);
      }
    } catch (storageErr) {
      console.warn('[useAuthStore] Cache clear warning:', storageErr);
    }
    set({
      user: null,
      profile: null,
      confirmation: null,
      phoneNumber: '',
      pendingRedirectRoute: null,
      error: null,
    });
  },
}));
