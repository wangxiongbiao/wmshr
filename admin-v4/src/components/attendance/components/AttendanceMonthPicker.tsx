import { useState } from "react";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { cn, formatMonthLabel } from "../../../lib/utils";

interface AttendanceMonthPickerProps {
  selectedMonth: string;
  defaultMonth: string;
  onSelectMonth: (month: string) => void;
}

export function AttendanceMonthPicker({
  selectedMonth,
  defaultMonth,
  onSelectMonth
}: AttendanceMonthPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState<number>(() => {
    const y = parseInt((selectedMonth || defaultMonth).split("-")[0]);
    return isNaN(y) ? new Date().getFullYear() : y;
  });

  const handlePrevMonth = () => {
    const currentMonthStr = selectedMonth || defaultMonth;
    const [y, m] = currentMonthStr.split("-").map(Number);
    const d = new Date(y, m - 2, 1);
    const newMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    onSelectMonth(newMonth);
    setPickerYear(d.getFullYear());
  };

  const handleNextMonth = () => {
    const currentMonthStr = selectedMonth || defaultMonth;
    const [y, m] = currentMonthStr.split("-").map(Number);
    const d = new Date(y, m, 1);
    const newMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    onSelectMonth(newMonth);
    setPickerYear(d.getFullYear());
  };

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={handlePrevMonth}
        className="p-1 border border-slate-200 hover:border-slate-300 rounded-lg text-slate-500 hover:text-slate-800 bg-white h-[32px] w-[32px] flex items-center justify-center transition cursor-pointer shadow-xs"
        title="切换至上一月"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="px-2.5 py-1 border border-slate-200 rounded-lg hover:border-slate-300 transition-colors bg-white shadow-xs flex items-center justify-between text-xs font-mono text-slate-700 h-[32px] w-[130px] cursor-pointer focus:ring-1 focus:ring-brand-500 outline-none animate-fade-in"
        >
          <span>
            {selectedMonth ? formatMonthLabel(selectedMonth) : "全部"}
          </span>
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
        </button>

        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-40 cursor-default bg-transparent"
              onClick={() => setIsOpen(false)}
            />
            <div className="absolute right-0 mt-1.5 w-[220px] bg-white border border-slate-100 rounded-xl shadow-lg p-3 z-50 animate-fade-in space-y-2">
              {/* Year navigation */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <button
                  type="button"
                  onClick={() => setPickerYear(prev => prev - 1)}
                  className="p-1 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-700 cursor-pointer transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-semibold text-slate-700">{pickerYear}年</span>
                <button
                  type="button"
                  onClick={() => setPickerYear(prev => prev + 1)}
                  className="p-1 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-700 cursor-pointer transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Month Grid */}
              <div className="grid grid-cols-3 gap-1">
                {Array.from({ length: 12 }, (_, i) => {
                  const monthNum = i + 1;
                  const monthStr = String(monthNum).padStart(2, "0");
                  const value = `${pickerYear}-${monthStr}`;
                  const isSelected = selectedMonth === value;
                  const now = new Date();
                  const isCurrentMonth = now.getFullYear() === pickerYear && (now.getMonth() + 1) === monthNum;

                  return (
                    <button
                      key={monthNum}
                      type="button"
                      onClick={() => {
                        onSelectMonth(value);
                        setIsOpen(false);
                      }}
                      className={cn(
                        "py-1.5 text-xs rounded-lg cursor-pointer transition-all text-center",
                        isSelected
                          ? "bg-brand-500 text-white font-medium shadow-xs"
                          : isCurrentMonth
                            ? "bg-brand-50 text-brand-700 hover:bg-brand-100 font-medium"
                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      )}
                    >
                      {monthNum}月
                    </button>
                  );
                })}
              </div>

              {/* Footer Quick Selection */}
              <div className="flex justify-between items-center pt-2 border-t border-slate-100 text-[11px]">
                <button
                  type="button"
                  onClick={() => {
                    const now = new Date();
                    const yyyy = now.getFullYear();
                    const mm = String(now.getMonth() + 1).padStart(2, "0");
                    onSelectMonth(`${yyyy}-${mm}`);
                    setPickerYear(yyyy);
                    setIsOpen(false);
                  }}
                  className="text-brand-600 hover:text-brand-700 font-medium cursor-pointer"
                >
                  本月
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onSelectMonth(defaultMonth);
                    const [y] = defaultMonth.split("-");
                    const initY = parseInt(y);
                    setPickerYear(isNaN(initY) ? new Date().getFullYear() : initY);
                    setIsOpen(false);
                  }}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  恢复默认
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <button
        type="button"
        onClick={handleNextMonth}
        className="p-1 border border-slate-200 hover:border-slate-300 rounded-lg text-slate-500 hover:text-slate-800 bg-white h-[32px] w-[32px] flex items-center justify-center transition cursor-pointer shadow-xs"
        title="切换至下一月"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
