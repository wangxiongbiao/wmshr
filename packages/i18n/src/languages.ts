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
  // 路由层已经直接使用 `zht` 作为繁体规范值；这里必须先单独识别它，不能让通用 `zh*` 分支把它吞回简体 `zh`。
  // 若后续要扩更多中文别名，仍应保证“显式繁体 key 优先、区域别名其次、通用 zh 最后”的顺序。
  if (lowered === "zht") return "zht";
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
