/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { cn } from "../lib/utils";

export interface SearchableSelectOption {
  value: string;
  label: string;
  description?: string;
  keywords?: string[];
}

interface SearchableSelectProps {
  value: string;
  options: SearchableSelectOption[];
  onChange: (value: string) => void;
  onQueryChange?: (query: string) => void;
  queryDebounceMs?: number;
  minQueryLength?: number;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
}

export function SearchableSelect({
  value,
  options,
  onChange,
  onQueryChange,
  queryDebounceMs = 300,
  minQueryLength = 2,
  placeholder,
  searchPlaceholder,
  emptyText,
  loading = false,
  disabled = false,
  className,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const lastDispatchedQueryRef = useRef<string | null>(null);
  const onQueryChangeRef = useRef(onQueryChange);

  useEffect(() => {
    onQueryChangeRef.current = onQueryChange;
  }, [onQueryChange]);

  const selectedOption = useMemo(() => {
    return options.find((option) => option.value === value) || null;
  }, [options, value]);

  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return options;
    }

    return options.filter((option) => {
      const haystacks = [option.label, option.description || "", ...(option.keywords || [])]
        .join("\n")
        .toLowerCase();
      return haystacks.includes(normalizedQuery);
    });
  }, [options, query]);

  useEffect(() => {
    if (!isOpen) {
      setQuery("");
      lastDispatchedQueryRef.current = "";
      onQueryChangeRef.current?.("");
      return;
    }

    window.requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const timer = window.setTimeout(() => {
      const trimmedQuery = query.trim();
      const nextQuery = trimmedQuery.length >= minQueryLength ? trimmedQuery : "";
      if (lastDispatchedQueryRef.current === nextQuery) {
        return;
      }
      lastDispatchedQueryRef.current = nextQuery;
      onQueryChangeRef.current?.(nextQuery);
    }, queryDebounceMs);

    return () => {
      window.clearTimeout(timer);
    };
  }, [isOpen, minQueryLength, query, queryDebounceMs]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          "flex h-[38px] w-full items-center justify-between gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-left text-sm text-slate-700 outline-none transition",
          "focus:ring-2 focus:ring-brand-500 focus:border-brand-500",
          disabled && "cursor-not-allowed opacity-60"
        )}
      >
        <div className="min-w-0 flex-1">
          <div className={cn("truncate", !selectedOption && "text-slate-400")}>
            {selectedOption?.label || placeholder || ""}
          </div>
          {selectedOption?.description ? (
            <div className="truncate text-xs text-slate-400">{selectedOption.description}</div>
          ) : null}
        </div>
        <ChevronDown className={cn("h-4 w-4 flex-shrink-0 text-slate-400 transition-transform", isOpen && "rotate-180")} />
      </button>

      {isOpen ? (
        <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          <div className="border-b border-slate-100 p-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={searchPlaceholder}
                className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-3 text-sm text-slate-700 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto p-1.5">
            {loading ? (
              <div className="px-3 py-6 text-center text-sm text-slate-400">{searchPlaceholder || emptyText}</div>
            ) : filteredOptions.length === 0 ? (
              <div className="px-3 py-6 text-center text-sm text-slate-400">{emptyText}</div>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = option.value === value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      onChange(option.value);
                      setIsOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-start justify-between gap-3 rounded-lg px-3 py-2 text-left transition",
                      isSelected ? "bg-brand-50 text-brand-700" : "text-slate-700 hover:bg-slate-50"
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{option.label}</div>
                      {option.description ? (
                        <div className="truncate text-xs text-slate-400">{option.description}</div>
                      ) : null}
                    </div>
                    <Check className={cn("mt-0.5 h-4 w-4 flex-shrink-0", isSelected ? "opacity-100" : "opacity-0")} />
                  </button>
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
