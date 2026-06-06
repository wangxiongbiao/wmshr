import i18next, { type i18n as I18nInstance } from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";
import { DEFAULT_LANGUAGE, LANGUAGE_STORAGE_KEY, normalizeLanguage } from "./languages";
import { NAMESPACES, resources } from "./resources";
import type { I18nNamespace } from "./types";

export function createWebI18n(options: { defaultNS: I18nNamespace; instance?: I18nInstance }) {
  const instance = options.instance ?? i18next;

  instance
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources,
      defaultNS: options.defaultNS,
      ns: NAMESPACES,
      fallbackNS: "common",
      fallbackLng: DEFAULT_LANGUAGE,
      lng: DEFAULT_LANGUAGE,
      interpolation: { escapeValue: false },
      detection: {
        order: ["querystring", "localStorage", "navigator"],
        lookupQuerystring: "lang",
        lookupLocalStorage: LANGUAGE_STORAGE_KEY,
        caches: ["localStorage"],
        convertDetectedLanguage: (lng: string) => normalizeLanguage(lng),
      },
      returnEmptyString: false,
      react: { useSuspense: false },
    });

  return instance;
}
