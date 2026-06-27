import { normalizeLanguage, type SupportedLanguageCode } from "@wmshr/i18n";
import type { TabId } from "../types";

// Admin 一级业务页签统一在这里维护；v3 三模块已经正式并入当前后台，路由白名单必须和 Sidebar、App 标题映射保持同一份来源，避免分享链接与可见导航脱节。
export const ADMIN_TABS: readonly TabId[] = ["dashboard", "employees", "attendance", "leave", "payroll", "sop", "customers", "goods", "expenses"] as const;
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
