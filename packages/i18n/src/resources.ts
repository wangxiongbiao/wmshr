import { commonTranslations } from "./namespaces/common";
import { authTranslations } from "./namespaces/auth";
import { adminTranslations } from "./namespaces/admin";
import { appTranslations } from "./namespaces/app";
import { portalTranslations } from "./namespaces/portal";
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES, type SupportedLanguageCode } from "./languages";
import type { I18nNamespace } from "./types";

export const NAMESPACES: I18nNamespace[] = ["common", "portal", "auth", "admin", "app"];

function extractPortalNamespace(locale: string) {
  return (portalTranslations as Record<string, { translation?: unknown }>)[locale]?.translation ?? {};
}

function extractFlatNamespace<T extends Record<string, Record<string, string>>>(translations: T, locale: string) {
  return (translations as Record<string, Record<string, string>>)[locale] ?? {};
}

export function buildResources() {
  return Object.fromEntries(
    SUPPORTED_LANGUAGES.map(({ code }) => [
      code,
      {
        common: extractFlatNamespace(commonTranslations, code),
        portal: extractPortalNamespace(code),
        auth: extractFlatNamespace(authTranslations, code),
        admin: extractFlatNamespace(adminTranslations, code),
        app: extractFlatNamespace(appTranslations, code),
      },
    ]),
  ) as Record<SupportedLanguageCode, Record<I18nNamespace, Record<string, unknown>>>;
}

export const resources = buildResources();
export { DEFAULT_LANGUAGE };
