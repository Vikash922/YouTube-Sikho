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

const createTranslator = (lang: SupportedLanguage) => (key: TranslationKey): string => {
  const dict = translations[lang] || translations.en;
  return (dict as Record<string, string>)[key] || (translations.en as Record<string, string>)[key] || (key as string);
};

export const useLanguageStore = create<LanguageState>((set) => ({
  language: 'en',
  isLoaded: false,
  t: createTranslator('en'),

  setLanguage: async (newLang: SupportedLanguage) => {
    set({ language: newLang, t: createTranslator(newLang) });
    try {
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, newLang);
    } catch (e) {
      console.warn('[useLanguageStore] Error saving language:', e);
    }
  },
}));

// Auto-hydrate saved language on startup
(async () => {
  try {
    const saved = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (saved === 'en' || saved === 'hi') {
      useLanguageStore.setState({ language: saved, t: createTranslator(saved), isLoaded: true });
    } else {
      useLanguageStore.setState({ isLoaded: true });
    }
  } catch {
    useLanguageStore.setState({ isLoaded: true });
  }
})();
