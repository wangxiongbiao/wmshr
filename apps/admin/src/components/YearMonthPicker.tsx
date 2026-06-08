/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useMemo } from "react";
import { cn } from "../lib/utils";

interface YearMonthPickerProps {
  value: string;
  onChange: (value: string) => void;
  availableMonths?: string[];
  className?: string;
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

export function YearMonthPicker({ value, onChange, availableMonths = [], className }: YearMonthPickerProps) {
  const { year, month } = useMemo(() => parseYearMonth(value), [value]);

  const availableYears = useMemo(() => {
    const years = new Set<number>([
      year,
      new Date().getFullYear(),
      ...availableMonths
        .map((item) => Number(item.slice(0, 4)))
        .filter((item) => Number.isFinite(item))
    ]);

    return Array.from(years).sort((a, b) => b - a);
  }, [availableMonths, year]);

  const monthOptions = useMemo(() => {
    return Array.from({ length: 12 }, (_, index) => {
      const monthValue = index + 1;
      return {
        value: String(monthValue).padStart(2, "0"),
        label: `${monthValue.toString().padStart(2, "0")}月`
      };
    });
  }, []);

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* 年月拆成两个联动下拉，只改变同一个 YYYY-MM 状态，避免旧的“快捷月份 + 自定义”双入口并存时出现认知分裂。 */}
      <select
        value={String(year)}
        onChange={(event) => onChange(`${event.target.value}-${String(month).padStart(2, "0")}`)}
        className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-mono text-sm focus:ring-2 focus:ring-brand-500 outline-none cursor-pointer"
      >
        {availableYears.map((item) => (
          <option key={item} value={item}>{item}年</option>
        ))}
      </select>

      <select
        value={String(month).padStart(2, "0")}
        onChange={(event) => onChange(`${year}-${event.target.value}`)}
        className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-mono text-sm focus:ring-2 focus:ring-brand-500 outline-none cursor-pointer"
      >
        {monthOptions.map((item) => (
          <option key={item.value} value={item.value}>{item.label}</option>
        ))}
      </select>
    </div>
  );
}
