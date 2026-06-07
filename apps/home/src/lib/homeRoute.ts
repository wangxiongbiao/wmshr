import { normalizeLanguage, type SupportedLanguageCode } from "@wmshr/i18n";

export const DEFAULT_HOME_LANGUAGE: SupportedLanguageCode = "en";

export function buildHomeRoute(language: SupportedLanguageCode) {
  return `/${language}`;
}

export function parseHomeRoute(pathname: string) {
  const [rawLanguage] = pathname.replace(/^\/+|\/+$/g, "").split("/");
  const language = normalizeLanguage(rawLanguage || DEFAULT_HOME_LANGUAGE);
  const isCanonical = rawLanguage === language;

  return {
    language,
    isCanonical,
    canonicalPath: buildHomeRoute(language),
  };
}
