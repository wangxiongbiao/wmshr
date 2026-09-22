import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "../../lib/utils";

export interface CalendarProps {
  selected?: string; // YYYY-MM-DD
  onSelect?: (date: string) => void;
  minDate?: string;
  maxDate?: string;
  className?: string;
}

function padZero(num: number): string {
  return num < 10 ? `0${num}` : `${num}`;
}

function formatDate(year: number, month: number, day: number): string {
  return `${year}-${padZero(month + 1)}-${padZero(day)}`;
}

export function Calendar({
  selected,
  onSelect,
  minDate,
  maxDate,
  className,
}: CalendarProps) {
  const today = new Date();
  const todayStr = formatDate(today.getFullYear(), today.getMonth(), today.getDate());

  const initialDate = React.useMemo(() => {
    if (selected && /^\d{4}-\d{2}-\d{2}$/.test(selected)) {
      const [y, m, d] = selected.split("-").map(Number);
      return new Date(y, m - 1, d);
    }
    return today;
  }, [selected]);

  const [viewYear, setViewYear] = React.useState(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = React.useState(initialDate.getMonth());

  React.useEffect(() => {
    if (selected && /^\d{4}-\d{2}-\d{2}$/.test(selected)) {
      const [y, m, d] = selected.split("-").map(Number);
      setViewYear(y);
      setViewMonth(m - 1);
    }
  }, [selected]);

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewYear(prev => prev - 1);
      setViewMonth(11);
    } else {
      setViewMonth(prev => prev - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewYear(prev => prev + 1);
      setViewMonth(0);
    } else {
      setViewMonth(prev => prev + 1);
    }
  };

  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
  const daysInCurrentMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

  const days: { dateStr: string; dayNumber: number; isCurrentMonth: boolean }[] = [];

  // Trailing days of previous month
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i;
    const prevMonthIdx = viewMonth === 0 ? 11 : viewMonth - 1;
    const prevYear = viewMonth === 0 ? viewYear - 1 : viewYear;
    days.push({
      dateStr: formatDate(prevYear, prevMonthIdx, d),
      dayNumber: d,
      isCurrentMonth: false,
    });
  }

  // Days in current month
  for (let d = 1; d <= daysInCurrentMonth; d++) {
    days.push({
      dateStr: formatDate(viewYear, viewMonth, d),
      dayNumber: d,
      isCurrentMonth: true,
    });
  }

  // Leading days of next month to round out the grid (35 or 42 cells)
  const totalCells = days.length > 35 ? 42 : 35;
  const remaining = totalCells - days.length;
  for (let d = 1; d <= remaining; d++) {
    const nextMonthIdx = viewMonth === 11 ? 0 : viewMonth + 1;
    const nextYear = viewMonth === 11 ? viewYear + 1 : viewYear;
    days.push({
      dateStr: formatDate(nextYear, nextMonthIdx, d),
      dayNumber: d,
      isCurrentMonth: false,
    });
  }

  const weekdays = ["日", "一", "二", "三", "四", "五", "六"];

  // Generate a reasonable range of years for fast picking
  const currentYear = today.getFullYear();
  const years = React.useMemo(() => {
    const list: number[] = [];
    for (let y = currentYear - 30; y <= currentYear + 15; y++) {
      list.push(y);
    }
    return list;
  }, [currentYear]);

  return (
    <div className={cn("p-2.5 w-[280px] select-none", className)}>
      {/* Header with quick selectors and navigation */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
        <button
          type="button"
          onClick={prevMonth}
          className="p-1 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors cursor-pointer"
          title="上一月"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
          <select
            value={viewYear}
            onChange={(e) => setViewYear(Number(e.target.value))}
            className="bg-transparent hover:bg-slate-100 px-1.5 py-0.5 rounded cursor-pointer outline-none border border-transparent hover:border-slate-200 transition-colors"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}年
              </option>
            ))}
          </select>
          <select
            value={viewMonth}
            onChange={(e) => setViewMonth(Number(e.target.value))}
            className="bg-transparent hover:bg-slate-100 px-1.5 py-0.5 rounded cursor-pointer outline-none border border-transparent hover:border-slate-200 transition-colors"
          >
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i} value={i}>
                {i + 1}月
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={nextMonth}
          className="p-1 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors cursor-pointer"
          title="下一月"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 mb-1.5 text-center">
        {weekdays.map((w, i) => (
          <div
            key={w}
            className={cn(
              "text-[11px] font-semibold py-0.5",
              i === 0 || i === 6 ? "text-amber-500" : "text-slate-400"
            )}
          >
            {w}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-1 text-center">
        {days.map(({ dateStr, dayNumber, isCurrentMonth }) => {
          const isSelected = selected === dateStr;
          const isToday = todayStr === dateStr;
          const isDisabled =
            Boolean(minDate && dateStr < minDate) ||
            Boolean(maxDate && dateStr > maxDate);

          return (
            <button
              key={dateStr}
              type="button"
              disabled={isDisabled}
              onClick={() => onSelect?.(dateStr)}
              className={cn(
                "h-7 w-7 mx-auto flex items-center justify-center rounded-lg text-xs font-normal transition-all cursor-pointer",
                !isCurrentMonth && "text-slate-300",
                isCurrentMonth && !isSelected && "text-slate-700 hover:bg-slate-100",
                isToday && !isSelected && "border border-blue-500 font-semibold text-blue-600",
                isSelected && "bg-blue-600 text-white font-semibold shadow-xs hover:bg-blue-700",
                isDisabled && "opacity-30 cursor-not-allowed hover:bg-transparent"
              )}
            >
              {dayNumber}
            </button>
          );
        })}
      </div>

      {/* Footer quick action buttons */}
      <div className="flex items-center justify-between pt-2 mt-2 border-t border-slate-100 text-xs">
        <button
          type="button"
          onClick={() => onSelect?.("")}
          className="text-slate-400 hover:text-slate-600 px-2 py-0.5 rounded hover:bg-slate-50 transition-colors cursor-pointer"
        >
          清空
        </button>
        <button
          type="button"
          onClick={() => onSelect?.(todayStr)}
          className="text-blue-600 hover:text-blue-700 font-medium px-2 py-0.5 rounded hover:bg-blue-50 transition-colors cursor-pointer"
        >
          今天
        </button>
      </div>
    </div>
  );
}
