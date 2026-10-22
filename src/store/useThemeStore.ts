import { create } from 'zustand';
import { Appearance } from 'react-native';

export type ThemePreference = 'light' | 'dark' | 'system';
export type ThemeMode = 'light' | 'dark';

interface ThemeState {
  preference: ThemePreference;
  mode: ThemeMode;
  setPreference: (pref: ThemePreference) => void;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  preference: 'dark',
  mode: 'dark',
  setPreference: (preference) => {
    if (preference === 'system') {
      const systemScheme = Appearance.getColorScheme();
      set({ preference, mode: systemScheme === 'light' ? 'light' : 'dark' });
    } else {
      set({ preference, mode: preference });
    }
  },
  toggleTheme: () =>
    set((state) => ({
      preference: state.mode === 'dark' ? 'light' : 'dark',
      mode: state.mode === 'dark' ? 'light' : 'dark',
    })),
}));
