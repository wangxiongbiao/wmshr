export const LANGUAGE_STORAGE_KEY = "wmshr.language";
export const MOBILE_LANGUAGE_STORAGE_KEY = "wmshr-mobile.language";

export const SUPPORTED_LANGUAGES = [
  { code: "zh", name: "简体中文", nativeName: "简体中文" },
  { code: "en", name: "English", nativeName: "English" },
  { code: "zht", name: "繁體中文", nativeName: "繁體中文" },
  { code: "th", name: "ไทย", nativeName: "ไทย" },
  { code: "id", name: "Bahasa Indonesia", nativeName: "Bahasa Indonesia" },
  { code: "ms", name: "Bahasa Melayu", nativeName: "Bahasa Melayu" },
  { code: "es", name: "Español", nativeName: "Español" },
  { code: "pt", name: "Português", nativeName: "Português" },
] as const;

export type SupportedLanguageCode = (typeof SUPPORTED_LANGUAGES)[number]["code"];
export const DEFAULT_LANGUAGE: SupportedLanguageCode = "zh";

export function normalizeLanguage(input?: string | null): SupportedLanguageCode {
  if (!input) return DEFAULT_LANGUAGE;
  const lowered = input.toLowerCase();
  if (lowered.startsWith("zh-tw") || lowered.startsWith("zh-hk") || lowered.startsWith("zh-mo")) return "zht";
  if (lowered.startsWith("zh")) return "zh";
  if (lowered.startsWith("en")) return "en";
  if (lowered.startsWith("th")) return "th";
  if (lowered.startsWith("id")) return "id";
  if (lowered.startsWith("ms")) return "ms";
  if (lowered.startsWith("es")) return "es";
  if (lowered.startsWith("pt")) return "pt";
  return DEFAULT_LANGUAGE;
}
