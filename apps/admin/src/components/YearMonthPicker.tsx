/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useMemo } from "react";
import { RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn, formatLocalDatePart } from "../lib/utils";

interface YearMonthPickerProps {
  value: string;
  onChange: (value: string) => void;
  availableMonths?: string[];
  className?: string;
}

function getCurrentYearMonth() {
  return formatLocalDatePart().yearMonth;
}

function clampYearMonth(value: string) {
  const currentYearMonth = getCurrentYearMonth();
  if (!/^\d{4}-\d{2}$/.test(value)) {
    return currentYearMonth;
  }
  return value > currentYearMonth ? currentYearMonth : value;
}

function parseYearMonth(value: string) {
  const [yearPart, monthPart] = value.split("-");
  const year = Number(yearPart);
  const month = Number(monthPart);
  return {
    year: Number.isFinite(year) ? year : new Date().getFullYear(),
    month: Number.isFinite(month) && month >= 1 && month <= 12 ? month : new Date().getMonth() + 1
  };
}

function resolveIntlLocale(language: string) {
  switch (language) {
    case "zht":
      return "zh-Hant";
    case "zh":
      return "zh-CN";
    case "th":
      return "th-TH";
    case "id":
      return "id-ID";
    case "ms":
      return "ms-MY";
    case "es":
      return "es-ES";
    case "pt":
      return "pt-PT";
    default:
      return "en-US";
  }
}

export function YearMonthPicker({ value, onChange, availableMonths = [], className }: YearMonthPickerProps) {
  const { t, i18n } = useTranslation("admin");
  const safeValue = useMemo(() => clampYearMonth(value), [value]);
  const { year, month } = useMemo(() => parseYearMonth(safeValue), [safeValue]);
  const currentYearMonth = getCurrentYearMonth();
  const currentYear = Number(currentYearMonth.slice(0, 4));
  const currentMonth = Number(currentYearMonth.slice(5, 7));
  const intlLocale = useMemo(
    () => resolveIntlLocale(i18n.resolvedLanguage || i18n.language),
    [i18n.language, i18n.resolvedLanguage]
  );

  const availableYears = useMemo(() => {
    const years = new Set<number>([
      year,
      new Date().getFullYear(),
      ...availableMonths
        .map((item) => Number(item.slice(0, 4)))
        .filter((item) => Number.isFinite(item) && item <= currentYear)
    ]);

    return Array.from(years).sort((a, b) => b - a);
  }, [availableMonths, currentYear, year]);

  const monthOptions = useMemo(() => {
    const maxMonth = year === currentYear ? currentMonth : 12;
    // Month labels must be formatted in UTC as well; otherwise west-of-UTC timezones
    // (for example America/Los_Angeles) render `Date.UTC(..., month, 1)` as the
    // previous local day and shift every visible label back by one month.
    const formatter = new Intl.DateTimeFormat(intlLocale, { month: "short", timeZone: "UTC" });
    return Array.from({ length: maxMonth }, (_, index) => {
      const monthValue = index + 1;
      const date = new Date(Date.UTC(2024, index, 1));
      return {
        value: String(monthValue).padStart(2, "0"),
        label: formatter.format(date)
      };
    });
  }, [currentMonth, currentYear, intlLocale, year]);

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* 年月拆成两个联动下拉，只改变同一个 YYYY-MM 状态，避免旧的“快捷月份 + 自定义”双入口并存时出现认知分裂。 */}
      <select
        value={String(year)}
        onChange={(event) => onChange(clampYearMonth(`${event.target.value}-${String(month).padStart(2, "0")}`))}
        aria-label={t("选择年份")}
        lang={intlLocale}
        className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-mono text-sm focus:ring-2 focus:ring-brand-500 outline-none cursor-pointer"
      >
        {availableYears.map((item) => (
          <option key={item} value={item}>{item}</option>
        ))}
      </select>

      <select
        value={String(month).padStart(2, "0")}
        onChange={(event) => onChange(clampYearMonth(`${year}-${event.target.value}`))}
        aria-label={t("选择月份")}
        lang={intlLocale}
        className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-mono text-sm focus:ring-2 focus:ring-brand-500 outline-none cursor-pointer"
      >
        {monthOptions.map((item) => (
          <option key={item.value} value={item.value}>{item.label}</option>
        ))}
      </select>

      <button
        type="button"
        onClick={() => onChange(currentYearMonth)}
        disabled={value === currentYearMonth}
        title={t("回到当前月")}
        aria-label={t("回到当前月")}
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-brand-600 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <RefreshCw className="h-4 w-4" />
      </button>
    </div>
  );
}
