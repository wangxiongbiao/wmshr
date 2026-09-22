import * as React from "react";
import { Clock, X, Check } from "lucide-react";
import { cn } from "../../lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

export interface TimePickerProps {
  value?: string; // HH:mm format, e.g. "09:00"
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onValueChange?: (value: string) => void;
  name?: string;
  id?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  presets?: string[];
}

const DEFAULT_PRESETS = [
  "08:00",
  "08:30",
  "09:00",
  "09:30",
  "12:00",
  "12:30",
  "13:00",
  "13:30",
  "17:30",
  "18:00",
  "18:30",
  "19:00",
  "20:00",
  "21:00",
];

function padZero(num: number): string {
  return num < 10 ? `0${num}` : `${num}`;
}

export const TimePicker = React.forwardRef<HTMLInputElement, TimePickerProps>(
  (
    {
      value = "",
      onChange,
      onValueChange,
      name,
      id,
      placeholder = "选择时间",
      disabled = false,
      required = false,
      className,
      presets = DEFAULT_PRESETS,
    },
    ref
  ) => {
    const [open, setOpen] = React.useState(false);
    const hiddenInputRef = React.useRef<HTMLInputElement | null>(null);

    React.useImperativeHandle(ref, () => hiddenInputRef.current as HTMLInputElement);

    const [currentHour, currentMinute] = React.useMemo(() => {
      if (value && /^\d{1,2}:\d{2}$/.test(value)) {
        const [h, m] = value.split(":");
        return [padZero(Number(h)), padZero(Number(m))];
      }
      return ["09", "00"];
    }, [value]);

    const triggerChange = (nextValue: string) => {
      if (onValueChange) {
        onValueChange(nextValue);
      }
      if (onChange) {
        const syntheticEvent = {
          target: { name: name || "", value: nextValue, type: "time" },
          currentTarget: { name: name || "", value: nextValue, type: "time" },
          bubbles: true,
          cancelable: true,
        } as unknown as React.ChangeEvent<HTMLInputElement>;
        onChange(syntheticEvent);
      }
    };

    const handleSelectHour = (h: string) => {
      const nextVal = `${h}:${currentMinute}`;
      triggerChange(nextVal);
    };

    const handleSelectMinute = (m: string) => {
      const nextVal = `${currentHour}:${m}`;
      triggerChange(nextVal);
    };

    const handleSetNow = () => {
      const now = new Date();
      const timeStr = `${padZero(now.getHours())}:${padZero(now.getMinutes())}`;
      triggerChange(timeStr);
      setOpen(false);
    };

    const hours = Array.from({ length: 24 }, (_, i) => padZero(i));
    const minutes = Array.from({ length: 12 }, (_, i) => padZero(i * 5));

    return (
      <div className="relative inline-block w-full">
        <input
          ref={hiddenInputRef}
          type="hidden"
          name={name}
          id={id}
          value={value}
          required={required}
        />

        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              disabled={disabled}
              className={cn(
                "flex h-9 w-full items-center justify-between rounded-lg border border-slate-300 bg-white px-3 py-1 text-sm shadow-xs transition-colors hover:border-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:border-transparent disabled:cursor-not-allowed disabled:opacity-50 text-left font-normal cursor-pointer",
                !value && "text-slate-400",
                className
              )}
            >
              <div className="flex items-center gap-2 overflow-hidden truncate">
                <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                <span className={cn("truncate font-mono", !value ? "text-slate-400" : "text-slate-800 font-medium")}>
                  {value || placeholder}
                </span>
              </div>
              {Boolean(value && !disabled) && (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    triggerChange("");
                  }}
                  className="rounded p-0.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors ml-1 cursor-pointer"
                  title="清空"
                >
                  <X className="w-3.5 h-3.5" />
                </span>
              )}
            </button>
          </PopoverTrigger>

          <PopoverContent className="p-3 border-slate-200 shadow-xl rounded-xl w-[280px]" align="start">
            <div className="space-y-3">
              {/* Direct time input header */}
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
                <span className="text-xs font-semibold text-slate-600">输入时间</span>
                <input
                  type="time"
                  value={value}
                  onChange={(e) => triggerChange(e.target.value)}
                  className="px-2 py-0.5 text-xs font-mono border border-slate-200 rounded-md focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>

              {/* Quick Preset Pills */}
              <div>
                <span className="text-[11px] font-medium text-slate-400 block mb-1.5">快捷预设</span>
                <div className="grid grid-cols-4 gap-1">
                  {presets.slice(0, 8).map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        triggerChange(preset);
                        setOpen(false);
                      }}
                      className={cn(
                        "text-xs font-mono py-1 rounded-md transition-colors cursor-pointer text-center",
                        value === preset
                          ? "bg-blue-600 text-white font-medium shadow-xs"
                          : "bg-slate-50 text-slate-700 hover:bg-blue-50 hover:text-blue-600"
                      )}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Hours & Minutes Column Picker */}
              <div>
                <div className="grid grid-cols-2 text-center text-[11px] font-semibold text-slate-500 mb-1 border-b border-slate-100 pb-1">
                  <span>时</span>
                  <span>分</span>
                </div>
                <div className="grid grid-cols-2 gap-1 h-32 overflow-hidden">
                  {/* Hours */}
                  <div className="overflow-y-auto space-y-0.5 pr-1 text-center scrollbar-thin">
                    {hours.map((h) => (
                      <button
                        key={h}
                        type="button"
                        onClick={() => handleSelectHour(h)}
                        className={cn(
                          "w-full text-xs font-mono py-0.5 rounded transition-colors cursor-pointer",
                          currentHour === h
                            ? "bg-blue-600 text-white font-semibold"
                            : "text-slate-600 hover:bg-slate-100"
                        )}
                      >
                        {h}
                      </button>
                    ))}
                  </div>

                  {/* Minutes */}
                  <div className="overflow-y-auto space-y-0.5 pr-1 text-center scrollbar-thin">
                    {minutes.map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => handleSelectMinute(m)}
                        className={cn(
                          "w-full text-xs font-mono py-0.5 rounded transition-colors cursor-pointer",
                          currentMinute === m
                            ? "bg-blue-600 text-white font-semibold"
                            : "text-slate-600 hover:bg-slate-100"
                        )}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Footer actions */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    triggerChange("");
                  }}
                  className="text-slate-400 hover:text-slate-600 px-2 py-0.5 rounded hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  清空
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSetNow}
                    className="text-blue-600 hover:text-blue-700 font-medium px-2 py-0.5 rounded hover:bg-blue-50 transition-colors cursor-pointer"
                  >
                    当前时间
                  </button>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="bg-blue-600 text-white hover:bg-blue-700 px-2.5 py-0.5 rounded-md font-medium transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <Check className="w-3 h-3" />
                    确定
                  </button>
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    );
  }
);
TimePicker.displayName = "TimePicker";
