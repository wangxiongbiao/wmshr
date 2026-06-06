import i18next, { type i18n as I18nInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import { DEFAULT_LANGUAGE, MOBILE_LANGUAGE_STORAGE_KEY, normalizeLanguage } from "./languages";
import { NAMESPACES, resources } from "./resources";
import type { I18nNamespace } from "./types";

async function loadStoredLanguage(loadPersistedLanguage?: () => Promise<string | null>) {
  if (!loadPersistedLanguage) return null;
  try {
    return await loadPersistedLanguage();
  } catch {
    return null;
  }
}

export async function createMobileI18n(options: {
  defaultNS: I18nNamespace;
  instance?: I18nInstance;
  loadPersistedLanguage?: () => Promise<string | null>;
  persistLanguage?: (language: string) => Promise<void>;
}) {
  const instance = options.instance ?? i18next;
  const stored = await loadStoredLanguage(options.loadPersistedLanguage);
  const system = typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().locale : DEFAULT_LANGUAGE;
  const initialLanguage = normalizeLanguage(stored || system || DEFAULT_LANGUAGE);

  await instance.use(initReactI18next).init({
    resources,
    defaultNS: options.defaultNS,
    ns: NAMESPACES,
    fallbackNS: "common",
    fallbackLng: DEFAULT_LANGUAGE,
    lng: initialLanguage,
    interpolation: { escapeValue: false },
    returnEmptyString: false,
    react: { useSuspense: false },
  });

  if (options.persistLanguage) {
    instance.on("languageChanged", (language) => {
      void options.persistLanguage?.(normalizeLanguage(language));
    });
  }

  return instance;
}

export { MOBILE_LANGUAGE_STORAGE_KEY };
