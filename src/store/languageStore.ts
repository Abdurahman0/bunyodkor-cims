import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  translations,
  type Language,
  type TranslationKey,
} from "@/i18n/translations";

interface LanguageState {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: TranslationKey) => string;
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set, get) => ({
      language: "uz",
      setLanguage: (language) => set({ language }),
      t: (key) => {
        const { language } = get();
        return translations[language][key] || translations.en[key] || key;
      },
    }),
    { name: "bunyodkor-language" },
  ),
);
