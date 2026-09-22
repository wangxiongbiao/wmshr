import * as React from "react";
import { Calendar as CalendarIcon, X } from "lucide-react";
import { cn } from "../../lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { Calendar } from "./calendar";

export interface DatePickerProps {
  value?: string; // YYYY-MM-DD
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onValueChange?: (value: string) => void;
  name?: string;
  id?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  min?: string;
  max?: string;
}

export const DatePicker = React.forwardRef<HTMLInputElement, DatePickerProps>(
  (
    {
      value = "",
      onChange,
      onValueChange,
      name,
      id,
      placeholder = "选择日期",
      disabled = false,
      required = false,
      className,
      min,
      max,
    },
    ref
  ) => {
    const [open, setOpen] = React.useState(false);
    const hiddenInputRef = React.useRef<HTMLInputElement | null>(null);

    // Merge internal ref with forwarded ref
    React.useImperativeHandle(ref, () => hiddenInputRef.current as HTMLInputElement);

    const triggerChange = (nextValue: string) => {
      if (onValueChange) {
        onValueChange(nextValue);
      }
      if (onChange) {
        // Create standard synthetic event so parent handleChange works seamlessly
        const syntheticEvent = {
          target: { name: name || "", value: nextValue, type: "date" },
          currentTarget: { name: name || "", value: nextValue, type: "date" },
          bubbles: true,
          cancelable: true,
        } as unknown as React.ChangeEvent<HTMLInputElement>;
        onChange(syntheticEvent);
      }
    };

    const handleSelect = (selectedDate: string) => {
      triggerChange(selectedDate);
      setOpen(false);
    };

    return (
      <div className="relative inline-block w-full">
        {/* Real hidden input for form data and validation */}
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
                <CalendarIcon className="w-4 h-4 text-slate-400 shrink-0" />
                <span className={cn("truncate", !value ? "text-slate-400" : "text-slate-700 font-medium")}>
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

          <PopoverContent className="p-0 border-slate-200 shadow-xl rounded-xl w-auto" align="start">
            <Calendar
              selected={value}
              minDate={min}
              maxDate={max}
              onSelect={handleSelect}
            />
          </PopoverContent>
        </Popover>
      </div>
    );
  }
);
DatePicker.displayName = "DatePicker";
