/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "../lib/utils";

type PaginationItem = number | "ellipsis";

export interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  itemName?: string;
  disabled?: boolean;
  className?: string;
  pageSizeOptions?: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
}

export function Pagination({
  page,
  pageSize,
  total,
  itemName = "条",
  disabled = false,
  className,
  pageSizeOptions,
  onPageChange,
  onPageSizeChange,
}: PaginationProps) {
  const normalizedPageSize = Math.max(1, pageSize);
  const totalPages = Math.max(1, Math.ceil(total / normalizedPageSize));
  const currentPage = Math.min(Math.max(page, 1), totalPages);
  const pageStart = total === 0 ? 0 : (currentPage - 1) * normalizedPageSize + 1;
  const pageEnd = total === 0 ? 0 : Math.min(currentPage * normalizedPageSize, total);

  const paginationItems = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    const pages = new Set<number>([1, totalPages, currentPage - 1, currentPage, currentPage + 1]);
    if (currentPage <= 3) {
      pages.add(2);
      pages.add(3);
      pages.add(4);
    }
    if (currentPage >= totalPages - 2) {
      pages.add(totalPages - 1);
      pages.add(totalPages - 2);
      pages.add(totalPages - 3);
    }

    const sorted = Array.from(pages)
      .filter((item) => item >= 1 && item <= totalPages)
      .sort((a, b) => a - b);

    const result: PaginationItem[] = [];
    for (let index = 0; index < sorted.length; index += 1) {
      const current = sorted[index];
      const previous = sorted[index - 1];
      if (previous && current - previous > 1) {
        result.push("ellipsis");
      }
      result.push(current);
    }

    return result;
  }, [currentPage, totalPages]);

  if (total === 0) {
    return null;
  }

  return (
    <nav
      aria-label="分页导航"
      className={cn(
        "flex flex-col gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between text-xs sm:text-sm text-slate-600 shadow-2xs",
        className
      )}
    >
      <div className="flex items-center gap-1.5 text-xs text-slate-500">
        <span>
          共 <strong className="font-semibold text-slate-700">{total}</strong> {itemName}
        </span>

        {onPageSizeChange && (
          <>
            <span className="text-slate-400">，每页</span>
            <select
              value={pageSize}
              disabled={disabled}
              onChange={(e) => {
                const newSize = Number(e.target.value);
                onPageSizeChange(newSize);
                onPageChange(1);
              }}
              className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-700 focus:border-brand-500 focus:outline-hidden cursor-pointer hover:bg-slate-100 transition"
            >
              {(pageSizeOptions && pageSizeOptions.length > 0 ? pageSizeOptions : [10, 20, 50, 100]).map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            <span className="text-slate-400">条</span>
          </>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={disabled || currentPage <= 1}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white transition cursor-pointer disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>上一页</span>
        </button>

        {paginationItems.map((item, index) =>
          item === "ellipsis" ? (
            <span key={`ellipsis-${index}`} className="px-1.5 text-xs text-slate-400">
              ...
            </span>
          ) : (
            <button
              key={item}
              type="button"
              onClick={() => onPageChange(item)}
              disabled={disabled}
              aria-current={item === currentPage ? "page" : undefined}
              className={cn(
                "min-w-8 h-8 rounded-lg border text-xs font-medium transition cursor-pointer disabled:cursor-not-allowed",
                item === currentPage
                  ? "border-brand-600 bg-brand-600 text-white shadow-xs"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              )}
            >
              {item}
            </button>
          )
        )}

        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={disabled || currentPage >= totalPages}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white transition cursor-pointer disabled:cursor-not-allowed"
        >
          <span>下一页</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </nav>
  );
}
