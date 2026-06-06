/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useTranslation } from "react-i18next";
import { SUPPORTED_LANGUAGES } from "@wmshr/i18n";

interface HeaderProps {
  title: string;
  userEmail?: string | null;
  onSignOut?: () => void;
}

export function Header({ title, userEmail, onSignOut }: HeaderProps) {
  const { t, i18n } = useTranslation(["admin", "common"]);

  return (
    <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-6 flex-shrink-0">
      <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
      <div className="flex items-center gap-3 text-right">
        <label className="hidden md:flex items-center gap-2 text-xs text-slate-500">
          <span>{t("语言")}</span>
          <select
            value={i18n.resolvedLanguage || i18n.language}
            onChange={(event) => void i18n.changeLanguage(event.target.value)}
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
              <div className="text-xs text-slate-500">{t("Google 已登录")}</div>
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
