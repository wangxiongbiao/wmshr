import React, { useState, useRef, useEffect } from "react";
import { Calendar } from "lucide-react";
import { Button } from "../../ui/button";
import { cn } from "../../../lib/utils";
import { MonthPickerProps } from "../types";

export const MonthPicker: React.FC<MonthPickerProps> = ({ value, onChange, lang, placeholder, className }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [viewYear, setViewYear] = useState(() => {
    if (value) {
      const parts = value.split("-");
      if (parts.length >= 1) return parseInt(parts[0], 10);
    }
    return new Date().getFullYear();
  });

  useEffect(() => {
    if (value) {
      const parts = value.split("-");
      if (parts.length >= 1) {
        setViewYear(parseInt(parts[0], 10));
      }
    }
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handlePrevYear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewYear(y => y - 1);
  };

  const handleNextYear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewYear(y => y + 1);
  };

  const handleSelectMonth = (monthNum: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const mStr = monthNum.toString().padStart(2, "0");
    onChange(`${viewYear}-${mStr}`);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
    setIsOpen(false);
  };

  const monthsZH = [
    "1月", "2月", "3月", "4月", "5月", "6月",
    "7月", "8月", "9月", "10月", "11月", "12月"
  ];
  const monthsEN = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];
  const monthsTH = [
    "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
    "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."
  ];

  const getMonthNames = () => {
    if (lang === "zh-CN" || lang === "zh-TW") return monthsZH;
    if (lang === "th") return monthsTH;
    return monthsEN;
  };

  const formattedDisplay = value ? (() => {
    const parts = value.split("-");
    const year = parts[0];
    const month = parseInt(parts[1], 10);
    if (lang === "zh-CN" || lang === "zh-TW") {
      return `${year}年${month}月`;
    } else if (lang === "th") {
      return `${monthsTH[month - 1]} ${year}`;
    }
    return `${monthsEN[month - 1]} ${year}`;
  })() : (placeholder || (lang === "zh-CN" || lang === "zh-TW" ? "----年--月" : "YYYY-MM"));

  return (
    <div className={cn("relative", className || "w-full")} ref={dropdownRef}>
      <Button
        type="button"
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 flex items-center justify-between cursor-pointer hover:bg-slate-50 hover:border-slate-300 focus:border-brand-500 h-8 shadow-2xs"
      >
        <span className={cn("truncate text-xs", value ? "text-slate-800 font-semibold" : "text-slate-400")}>{formattedDisplay}</span>
        <div className="flex items-center gap-1 shrink-0 ml-1">
          {value && (
            <span
              onClick={handleClear}
              className="text-slate-400 hover:text-slate-600 font-bold px-0.5 hover:bg-slate-100 rounded text-[10px]"
              title={lang === "zh-CN" ? "清除" : "Clear"}
            >
              ×
            </span>
          )}
          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        </div>
      </Button>

      {isOpen && (
        <div className="absolute right-0 mt-1 w-56 bg-white border border-slate-200 rounded-xl shadow-lg p-3 z-50 text-slate-800">
          {/* Header with Year selection */}
          <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handlePrevYear}
              className="h-7 w-7 text-xs font-bold"
            >
              ◀
            </Button>
            <span className="text-xs font-bold text-slate-700">
              {viewYear}{lang === "zh-CN" || lang === "zh-TW" ? "年" : ""}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleNextYear}
              className="h-7 w-7 text-xs font-bold"
            >
              ▶
            </Button>
          </div>

          {/* Month grid (3 columns x 4 rows) */}
          <div className="grid grid-cols-3 gap-1.5">
            {getMonthNames().map((mName, idx) => {
              const mNum = idx + 1;
              const mStr = mNum.toString().padStart(2, "0");
              const targetVal = `${viewYear}-${mStr}`;
              const isSelected = value === targetVal;

              return (
                <Button
                  key={idx}
                  type="button"
                  variant={isSelected ? "default" : "ghost"}
                  size="sm"
                  onClick={(e) => handleSelectMonth(mNum, e)}
                  className={cn(
                    "py-2 text-[11px] font-bold rounded-lg transition text-center cursor-pointer h-8",
                    isSelected
                      ? "bg-brand-600 text-white shadow-xs"
                      : "hover:bg-slate-100 text-slate-600"
                  )}
                >
                  {mName}
                </Button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
