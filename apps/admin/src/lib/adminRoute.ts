import { normalizeLanguage, type SupportedLanguageCode } from "@wmshr/i18n";
import type { TabId } from "../types";

// Admin 当前只允许这 5 个一级业务页签进入路由；这里集中维护，避免 Sidebar、Header、App 各自散落一份合法值判断。
export const ADMIN_TABS: readonly TabId[] = ["dashboard", "employees", "attendance", "payroll", "sop"] as const;
export const DEFAULT_ADMIN_TAB: TabId = "dashboard";

export function isAdminTab(value?: string | null): value is TabId {
  return Boolean(value) && ADMIN_TABS.includes(value as TabId);
}

export function normalizeAdminTab(value?: string | null): TabId {
  return isAdminTab(value) ? value : DEFAULT_ADMIN_TAB;
}

export function buildAdminRoute(language: SupportedLanguageCode, tab: TabId) {
  return `/${language}/${tab}`;
}

export function parseAdminRoute(pathname: string) {
  const [rawLanguage, rawTab] = pathname.replace(/^\/+|\/+$/g, "").split("/");
  const language = normalizeLanguage(rawLanguage);
  const tab = normalizeAdminTab(rawTab);
  const isCanonical = rawLanguage === language && rawTab === tab;

  return {
    language,
    tab,
    isCanonical,
    canonicalPath: buildAdminRoute(language, tab),
  };
}
