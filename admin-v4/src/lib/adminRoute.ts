import { TabId } from "../types";
import { Language } from "./i18n";

export const ADMIN_TABS: readonly (TabId | "login")[] = [
  "login",
  "dashboard",
  "employees",
  "attendance",
  "leave_requests",
  "payroll",
  "customers",
  "orders",
  "goods",
  "products",
  "expenses",
  "invoices",
  "express",
  "sop",
  "sop_training",
  "sop_catering",
  "employee_app"
] as const;

export const DEFAULT_ADMIN_TAB: TabId = "dashboard";

export const SUPPORTED_LANGUAGES: readonly Language[] = ["zh-CN", "zh-TW", "en", "th"] as const;
export const DEFAULT_LANGUAGE: Language = "zh-CN";

export function isSupportedLanguage(lang?: string | null): lang is Language {
  return Boolean(lang) && SUPPORTED_LANGUAGES.includes(lang as Language);
}

export function normalizeLanguage(lang?: string | null): Language {
  if (!lang) return DEFAULT_LANGUAGE;
  if (isSupportedLanguage(lang)) return lang;
  if (lang.startsWith("zh")) return lang.includes("TW") || lang.includes("HK") ? "zh-TW" : "zh-CN";
  if (lang.startsWith("en")) return "en";
  if (lang.startsWith("th")) return "th";
  return DEFAULT_LANGUAGE;
}

export function isAdminTab(value?: string | null): value is (TabId | "login") {
  return Boolean(value) && ADMIN_TABS.includes(value as TabId);
}

export function normalizeAdminTab(value?: string | null): TabId {
  return isAdminTab(value) ? value : DEFAULT_ADMIN_TAB;
}

export function buildAdminRoute(language: Language, tab: TabId | "login") {
  return `/${language}/${tab}`;
}

export function parseAdminRoute(pathname: string) {
  const parts = pathname.replace(/^\/+|\/+$/g, "").split("/");
  if (parts.length === 1 && parts[0] === "login") {
    return {
      language: DEFAULT_LANGUAGE,
      tab: "login" as any,
      isCanonical: true,
      canonicalPath: buildAdminRoute(DEFAULT_LANGUAGE, "login" as any)
    };
  }
  const rawLanguage = parts[0];
  const rawTab = parts[1];

  const language = normalizeLanguage(rawLanguage);
  const tab = (rawTab === "login" ? "login" : normalizeAdminTab(rawTab)) as any;
  const isCanonical = rawLanguage === language && rawTab === tab;

  return {
    language,
    tab,
    isCanonical,
    canonicalPath: buildAdminRoute(language, tab)
  };
}
