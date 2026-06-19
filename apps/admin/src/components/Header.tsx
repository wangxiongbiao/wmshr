/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useTranslation } from "react-i18next";
import { SUPPORTED_LANGUAGES, type SupportedLanguageCode } from "@wmshr/i18n";

interface HeaderProps {
  title: string;
  currentLanguage: SupportedLanguageCode;
  onLanguageChange: (language: SupportedLanguageCode) => void;
  userEmail?: string | null;
  onSignOut?: () => void;
}

export function Header({ title, currentLanguage, onLanguageChange, userEmail, onSignOut }: HeaderProps) {
  const { t } = useTranslation(["admin", "common"]);

  return (
    <header className="bg-white border-b border-slate-200 min-h-16 flex items-center justify-between gap-4 px-6 py-3 flex-shrink-0">
      {/* 顶部标题来自 tab 翻译；这里必须允许长文案在一行放不下时占据更多垂直空间，而不是把右侧操作区硬挤出可视区域。 */}
      <h2 className="min-w-0 flex-1 text-lg font-semibold text-slate-800 leading-tight break-words">{title}</h2>
      <div className="flex items-center gap-3 text-right flex-shrink-0">
        <label className="hidden md:flex items-center gap-2 text-xs text-slate-500">
          <span>{t("语言")}</span>
          <select
            value={currentLanguage}
            // 语言切换必须交给上层路由处理，才能在替换 lang 时保留当前业务 tab，不回退到默认 dashboard。
            onChange={(event) => onLanguageChange(event.target.value as SupportedLanguageCode)}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 outline-none"
          >
            {SUPPORTED_LANGUAGES.map((language) => (
              <option key={language.code} value={language.code}>{language.nativeName}</option>
            ))}
          </select>
        </label>
        {userEmail && onSignOut && (
          <div className="hidden sm:flex items-center gap-3">
            <div className="text-right">
              <div className="text-sm font-medium text-slate-700">{userEmail}</div>
              <div className="text-xs text-slate-500">{t("管理员已登录")}</div>
            </div>
            <button
              onClick={onSignOut}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-sm text-slate-600 transition"
            >
              {t("退出登录")}
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
