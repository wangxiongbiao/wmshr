/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useMemo } from "react";
import { tAdmin } from "../lib/i18nText";
import { cn } from "../lib/utils";

type PaginationItem = number | "ellipsis";

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  itemName: string;
  disabled?: boolean;
  className?: string;
  onPageChange: (page: number) => void;
}

export function Pagination({
  page,
  pageSize,
  total,
  itemName,
  disabled = false,
  className,
  onPageChange
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

  if (totalPages <= 1) {
    return null;
  }

  return (
    <nav
      aria-label={tAdmin("分页导航")}
      className={cn(
        "flex flex-col gap-3 rounded-xl border border-slate-200 bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      <div className="text-sm text-slate-500">
        {tAdmin("当前第 {{currentPage}} / {{totalPages}} 页，显示 {{pageStart}}-{{pageEnd}}，共 {{total}} {{itemName}}", { currentPage, totalPages, pageStart, pageEnd, total, itemName })}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={disabled || currentPage <= 1}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >{tAdmin("上一页")}</button>
        {paginationItems.map((item, index) => (
          item === "ellipsis" ? (
            <span key={`ellipsis-${index}`} className="px-2 text-sm text-slate-400">
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
                "min-w-10 rounded-lg border px-3 py-2 text-sm transition disabled:opacity-50",
                item === currentPage
                  ? "border-brand-600 bg-brand-600 text-white"
                  : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              )}
            >
              {item}
            </button>
          )
        ))}
        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={disabled || currentPage >= totalPages}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >{tAdmin("下一页")}</button>
      </div>
    </nav>
  );
}
