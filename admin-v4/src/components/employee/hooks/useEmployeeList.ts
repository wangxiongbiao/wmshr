/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo, useRef } from "react";
import type { Employee, EmployeeStatusFilter } from "../types";
import type { EmployeePageResult } from "../../../lib/employeeApi";
import type { Language } from "../../../lib/i18n";
import { DEFAULT_PAGE_SIZE } from "../constants";

export interface UseEmployeeListOptions {
  employees: Employee[];
  loadEmployees?: (status: EmployeeStatusFilter, keyword: string, page: number, pageSize: number, warehouseCode?: string) => Promise<EmployeePageResult>;
  onRefresh?: () => Promise<void> | void;
  warehouseCode?: string;
  reloadKey?: number;
  addToast?: (msg: string, type?: "success" | "error" | "info") => void;
  lang?: Language;
}

export function useEmployeeList({
  employees,
  loadEmployees,
  onRefresh,
  warehouseCode = "TH",
  reloadKey = 0,
  addToast,
  lang = "zh-CN",
}: UseEmployeeListOptions) {
  const [query, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<EmployeeStatusFilter>("active");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const [remoteRows, setRemoteRows] = useState<Employee[] | null>(null);
  const [remoteTotal, setRemoteTotal] = useState<number | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [remoteLoading, setRemoteLoading] = useState(false);
  const [remoteError, setRemoteError] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const requestIdRef = useRef(0);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      if (onRefresh) {
        await onRefresh();
      }
      if (loadEmployees) {
        const result = await loadEmployees(statusFilter, query, page, pageSize, warehouseCode);
        setRemoteRows(result.items);
        setRemoteTotal(result.total);
        setHasMore(result.hasMore);
      }
      addToast?.(lang === "zh-CN" ? "员工与考勤数据已刷新" : "Data refreshed", "success");
    } catch (err) {
      console.error("Manual refresh error:", err);
      addToast?.(err instanceof Error ? err.message : "刷新失败", "error");
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  useEffect(() => {
    setPage(1);
    setRemoteRows(null);
    setRemoteTotal(null);
  }, [query, statusFilter, warehouseCode]);

  useEffect(() => {
    if (!loadEmployees) return;
    const requestId = ++requestIdRef.current;
    setRemoteLoading(true);
    const delay = query.trim() ? 150 : 0;
    const timer = window.setTimeout(() => {
      setRemoteError("");
      void loadEmployees(statusFilter, query, page, pageSize, warehouseCode)
        .then((result) => {
          if (requestId !== requestIdRef.current) return;
          setRemoteRows(result.items);
          setRemoteTotal(result.total);
          setHasMore(result.hasMore);
        })
        .catch((error) => {
          if (requestId === requestIdRef.current) {
            setRemoteError(error instanceof Error ? error.message : "员工列表加载失败");
          }
        })
        .finally(() => {
          if (requestId === requestIdRef.current) setRemoteLoading(false);
        });
    }, delay);
    return () => window.clearTimeout(timer);
  }, [loadEmployees, page, pageSize, query, reloadKey, statusFilter, warehouseCode]);

  const inMemoryFiltered = useMemo(() => {
    return employees.filter((emp) => {
      const matchesWarehouse = !emp.warehouseCode || emp.warehouseCode === warehouseCode;
      if (!matchesWarehouse) return false;

      const q = query.trim().toLowerCase();
      const matchesQuery =
        !q ||
        emp.name.toLowerCase().includes(q) ||
        emp.role.toLowerCase().includes(q) ||
        emp.dept.toLowerCase().includes(q) ||
        (emp.employeeNo && emp.employeeNo.toLowerCase().includes(q));

      if (!matchesQuery) return false;

      const isResigned = emp.status === "离职" || (emp.status as unknown as string) === "resigned";
      if (statusFilter === "active") {
        return !isResigned;
      } else if (statusFilter === "resigned") {
        return isResigned;
      }
      return true;
    });
  }, [employees, warehouseCode, query, statusFilter]);

  const filteredEmployees = useMemo(() => {
    if (!loadEmployees) {
      return inMemoryFiltered;
    }
    if (remoteRows) {
      const empMap = new Map(employees.map((e) => [e.id, e]));
      const updatedRows = remoteRows.map((r) => empMap.get(r.id) || r);
      const validRows = updatedRows.filter((emp) => {
        const isResigned = emp.status === "离职" || (emp.status as unknown as string) === "resigned";
        if (statusFilter === "active") {
          return !isResigned;
        } else if (statusFilter === "resigned") {
          return isResigned;
        }
        return true;
      });
      const remoteIds = new Set(remoteRows.map((r) => r.id));
      const newlyAdded = inMemoryFiltered.filter((e) => !remoteIds.has(e.id));
      return [...newlyAdded, ...validRows];
    }
    return inMemoryFiltered;
  }, [loadEmployees, inMemoryFiltered, remoteRows, employees, statusFilter]);

  const totalEmployees = remoteTotal ?? inMemoryFiltered.length;

  return {
    query,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    page,
    setPage,
    pageSize,
    setPageSize,
    remoteRows,
    remoteTotal,
    hasMore,
    remoteLoading,
    remoteError,
    isRefreshing,
    handleManualRefresh,
    filteredEmployees,
    totalEmployees,
  };
}
