import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { translations, SupportedLanguage, TranslationKey } from '../i18n/translations';

const LANGUAGE_STORAGE_KEY = '@app_language';

interface LanguageState {
  language: SupportedLanguage;
  isLoaded: boolean;
  setLanguage: (lang: SupportedLanguage) => Promise<void>;
  t: (key: TranslationKey) => string;
}

export const useLanguageStore = create<LanguageState>((set, get) => ({
  language: 'en',
  isLoaded: false,

  setLanguage: async (newLang: SupportedLanguage) => {
    set({ language: newLang });
    try {
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, newLang);
    } catch (e) {
      console.warn('[useLanguageStore] Error saving language:', e);
    }
  },

  t: (key: TranslationKey): string => {
    const currentLang = get().language;
    const dict = translations[currentLang] || translations.en;
    return dict[key] || translations.en[key] || (key as string);
  },
}));

// Auto-hydrate saved language on startup
(async () => {
  try {
    const saved = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (saved === 'en' || saved === 'hi') {
      useLanguageStore.setState({ language: saved, isLoaded: true });
    } else {
      useLanguageStore.setState({ isLoaded: true });
    }
  } catch {
    useLanguageStore.setState({ isLoaded: true });
  }
})();
