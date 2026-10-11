import { useState, useMemo, useEffect, useRef } from "react";
import type { AttendanceRecord, Employee } from "../../../types";
import { fetchAttendanceCalculations, type AttendanceCalculationRow } from "../../../lib/attendanceApi";
import type { FlatAttendanceRow } from "../types";

interface UseAttendanceDataParams {
  employees: Employee[];
  attendance: AttendanceRecord[];
  selectedIds: Set<string>;
  warehouseCode?: string;
  onRefresh?: () => Promise<void> | void;
  addToast?: (msg: string, kind?: "success" | "error" | "info") => void;
}

export function useAttendanceData({
  employees,
  attendance,
  selectedIds,
  warehouseCode,
  onRefresh,
  addToast
}: UseAttendanceDataParams) {
  const defaultMonth = useMemo(() => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    return `${yyyy}-${mm}`;
  }, []);

  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | "all">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [selectedMonth, setSelectedMonth] = useState<string>(defaultMonth);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);

  const [serverRows, setServerRows] = useState<AttendanceCalculationRow[] | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isTableLoading, setIsTableLoading] = useState<boolean>(true);
  const [reloadTrigger, setReloadTrigger] = useState<number>(0);

  const isRefreshingRef = useRef<boolean>(false);
  const isInitialMountRef = useRef<boolean>(true);
  const prevMonthRef = useRef<string>(selectedMonth);
  const prevWarehouseRef = useRef<string | undefined>(warehouseCode);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedEmployeeId, statusFilter, selectedMonth]);

  useEffect(() => {
    let active = true;
    const isManualRefresh = isRefreshingRef.current;
    isRefreshingRef.current = false;

    const monthChanged = prevMonthRef.current !== selectedMonth;
    const warehouseChanged = prevWarehouseRef.current !== warehouseCode;
    prevMonthRef.current = selectedMonth;
    prevWarehouseRef.current = warehouseCode;

    if (isInitialMountRef.current || isManualRefresh || monthChanged || warehouseChanged) {
      setIsTableLoading(true);
      isInitialMountRef.current = false;
    }

    fetchAttendanceCalculations({ month: selectedMonth, warehouseCode })
      .then(res => {
        if (active && res && Array.isArray(res.rows)) {
          setServerRows(res.rows);
        }
      })
      .catch(() => {
        // Fallback to local rows if server fails or offline
      })
      .finally(() => {
        if (active) setIsTableLoading(false);
      });

    return () => {
      active = false;
    };
  }, [selectedMonth, reloadTrigger, attendance, warehouseCode]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    isRefreshingRef.current = true;
    setIsTableLoading(true);
    setSelectedEmployeeId("all");
    setStatusFilter("all");
    setSelectedMonth(defaultMonth);
    setCurrentPage(1);
    setReloadTrigger(k => k + 1);

    try {
      if (onRefresh) {
        await onRefresh();
      }
      addToast?.("考勤数据已刷新", "success");
    } catch (err: any) {
      addToast?.(err?.message || "刷新考勤数据失败", "error");
    } finally {
      setTimeout(() => {
        setIsRefreshing(false);
        setIsTableLoading(false);
      }, 300);
    }
  };

  const allDates = useMemo(() => {
    const dateSet = new Set<string>();
    attendance.forEach(r => dateSet.add(r.date));
    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
    dateSet.add(today);
    dateSet.add(yesterday);
    return Array.from(dateSet).sort().reverse();
  }, [attendance]);

  const flatRows = useMemo(() => {
    let rows: FlatAttendanceRow[] = [];
    if (serverRows && serverRows.length > 0) {
      const attendanceMap = new Map<string, AttendanceRecord>();
      attendance.forEach(a => {
        attendanceMap.set(a.empId + "_" + a.date, a);
      });

      const coveredKeys = new Set<string>();
      rows = serverRows.map(sr => {
        const key = sr.emp.id + "_" + sr.date;
        coveredKeys.add(key);
        const localRec = attendanceMap.get(key);
        const latestEmp = employees.find(e => e.id === sr.emp.id) || sr.emp;
        return {
          ...sr,
          emp: latestEmp,
          rec: localRec !== undefined ? localRec : sr.rec
        };
      });

      attendance.forEach(a => {
        const key = a.empId + "_" + a.date;
        if (!coveredKeys.has(key)) {
          const emp = employees.find(e => e.id === a.empId);
          if (emp) {
            rows.push({ emp, rec: a, date: a.date });
          }
        }
      });
    } else {
      allDates.forEach(date => {
        employees.forEach(emp => {
          const hasRec = attendance.some(a => a.empId === emp.id && a.date === date);
          if (emp.joinDate && date < emp.joinDate && !hasRec) {
            return;
          }
          if (emp.status === "离职" && !hasRec) {
            return;
          }
          const rec = attendance.find(a => a.empId === emp.id && a.date === date) || null;
          rows.push({ emp, rec, date });
        });
      });
    }

    if (statusFilter === "active") {
      rows = rows.filter(r => r.emp.status !== "离职");
    } else if (statusFilter === "inactive") {
      rows = rows.filter(r => r.emp.status === "离职");
    }

    if (selectedEmployeeId !== "all") {
      rows = rows.filter(r => r.emp.id === selectedEmployeeId);
    }

    if (selectedMonth) {
      rows = rows.filter(r => r.date.startsWith(selectedMonth));
    }

    return rows.sort((a, b) => {
      if (a.date !== b.date) return b.date.localeCompare(a.date);
      return a.emp.name.localeCompare(b.emp.name);
    });
  }, [serverRows, allDates, employees, attendance, selectedEmployeeId, statusFilter, selectedMonth]);

  const totalPages = Math.max(1, Math.ceil(flatRows.length / pageSize));

  const pagedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return flatRows.slice(start, start + pageSize);
  }, [flatRows, currentPage, pageSize]);

  const visibleAttendanceRecords = useMemo(() => {
    const list: AttendanceRecord[] = [];
    pagedRows.forEach(r => {
      if (r.rec) {
        list.push(r.rec);
      }
    });
    return list;
  }, [pagedRows]);

  const selectedVisibleCount = useMemo(() => {
    return visibleAttendanceRecords.filter(r => selectedIds.has(r.id)).length;
  }, [visibleAttendanceRecords, selectedIds]);

  const isAllSelected = useMemo(() => {
    if (visibleAttendanceRecords.length === 0) return false;
    return selectedVisibleCount === visibleAttendanceRecords.length;
  }, [visibleAttendanceRecords, selectedVisibleCount]);

  const isPartiallySelected = useMemo(() => {
    return selectedVisibleCount > 0 && !isAllSelected;
  }, [selectedVisibleCount, isAllSelected]);

  const handleResetFilters = () => {
    setSelectedEmployeeId("all");
    setStatusFilter("all");
    setSelectedMonth(defaultMonth);
    setCurrentPage(1);
  };

  return {
    defaultMonth,
    selectedEmployeeId,
    setSelectedEmployeeId,
    statusFilter,
    setStatusFilter,
    selectedMonth,
    setSelectedMonth,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    isTableLoading,
    isRefreshing,
    handleRefresh,
    handleResetFilters,
    flatRows,
    pagedRows,
    totalPages,
    visibleAttendanceRecords,
    isAllSelected,
    isPartiallySelected,
    selectedVisibleCount
  };
}
