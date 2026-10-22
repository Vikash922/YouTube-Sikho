import { create } from 'zustand';
import { User, signOut } from 'firebase/auth';
import { UserProfile, getUserProfile } from '../services/userService';
import { firebaseAuth } from '../services/firebase';

export interface PhoneConfirmation {
  confirm: (verificationCode: string) => Promise<{ user: User }>;
}

interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  confirmation: PhoneConfirmation | null;
  phoneNumber: string;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;

  setUser: (user: User | null) => void;
  setProfile: (profile: UserProfile | null) => void;
  setConfirmation: (confirmation: PhoneConfirmation | null) => void;
  setPhoneNumber: (phone: string) => void;
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
  isLoading: false,
  isInitialized: false,
  error: null,

  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  setConfirmation: (confirmation) => set({ confirmation }),
  setPhoneNumber: (phoneNumber) => set({ phoneNumber }),
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
    try {
      await signOut(firebaseAuth);
    } catch (err) {
      console.warn('[useAuthStore] Firebase signOut error:', err);
    }
    set({
      user: null,
      profile: null,
      confirmation: null,
      phoneNumber: '',
      error: null,
    });
  },
}));
