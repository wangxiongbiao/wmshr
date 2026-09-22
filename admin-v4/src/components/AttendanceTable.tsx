/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Settings, Edit, Download, Eye, X, MapPin, Search, Calendar, User, SlidersHorizontal, ChevronLeft, ChevronRight, RefreshCw, Loader2 } from "lucide-react";
import { AppConfig, AttendanceRecord, Employee, HolidayRecord, LeaveRequest } from "../types";
import { cn, calcAttendanceDetails, formatCurrency, formatDuration, calcOvertimePay, formatTime, formatTimeRange, formatMonthLabel, formatDate, getNowDateStr, getNowMonthStr } from "../lib/utils";
import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { fetchAttendanceCalculations, type AttendanceCalculationRow } from "../lib/attendanceApi";
import { CheckCircle, XCircle, AlertCircle, Clock } from "lucide-react";
import { Pagination } from "./Pagination";
import { TableHorizontalScroller } from "./TableHorizontalScroller";

interface AttendanceTableProps {
  employees: Employee[];
  attendance: AttendanceRecord[];
  config: AppConfig;
  selectedIds: Set<string>;
  onSelect: (id: string, checked: boolean) => void;
  onSelectAll: (ids: string[]) => void;
  onEditRecord: (id: string | null, empId?: number, date?: string, rec?: AttendanceRecord | null) => void;
  holidays: HolidayRecord[];
  leaveRequests?: LeaveRequest[];
  onUpdateLeaveRequests?: (newList: LeaveRequest[]) => void;
  hasPermission?: (permId: string) => boolean;
  onRefresh?: () => Promise<void> | void;
  addToast?: (msg: string, kind?: "success" | "error" | "info") => void;
  warehouseCode?: string;
}



export const ATTENDANCE_TYPE_NAMES: Record<string, string> = {
  normal: "正常",
  late: "迟到",
  early: "早退",
  absent: "缺勤",
  leave: "假期",
  sick_leave: "病假",
  overtime: "加班",
  manual_adjusted: "人工调整",
  checked_in: "已上班",
  pending: "待打卡",
  exception: "异常"
};

export const ATTENDANCE_TYPE_CLASSES: Record<string, string> = {
  normal: "bg-green-100 text-green-700",
  late: "bg-yellow-100 text-yellow-700",
  early: "bg-orange-100 text-orange-700",
  absent: "bg-red-100 text-red-700",
  leave: "bg-blue-100 text-blue-700",
  sick_leave: "bg-cyan-100 text-cyan-700",
  overtime: "bg-purple-100 text-purple-700",
  manual_adjusted: "bg-amber-100 text-amber-700",
  checked_in: "bg-indigo-100 text-indigo-700",
  pending: "bg-slate-100 text-slate-700",
  exception: "bg-rose-100 text-rose-700"
};

export const isNonWorkingAttendanceType = (t: string) =>
  t === "absent" || t === "leave" || t === "sick_leave" || t === "pending";

function getRowMetrics(row: any, config: AppConfig, holidays: HolidayRecord[], leaveRequests: LeaveRequest[] = []) {
  if (row && row.details && typeof row.shiftPay === "number" && typeof row.totalPay === "number") {
    const type = row.status || (row.rec ? row.rec.type : "absent");
    const isAbsentOrLeave = isNonWorkingAttendanceType(type) || !row.rec;
    return {
      details: row.details || { valid: 0, ot: 0 },
      shiftPay: Number(row.shiftPay) || 0,
      otPay: Number(row.otPay) || 0,
      mealAllowance: Number(row.mealAllowance) || 0,
      dailySocialSecurity: Number(row.dailySocialSecurity) || 0,
      dailyServiceFee: Number(row.dailyServiceFee) || 0,
      totalPay: Number(row.totalPay) || 0,
      typeName: ATTENDANCE_TYPE_NAMES[type] || type || "正常",
      type,
      isAbsentOrLeave
    };
  }

  const { emp, rec, date } = row;
  let details = { valid: 0, ot: 0 };
  let typeName = "缺勤";

  const hasApprovedLeave = leaveRequests.some(l => {
    if (String(l.empId) !== String(emp.id) || l.status !== "approved") return false;
    return date >= l.startDate && date <= l.endDate;
  });

  if (emp.status === "休假") {
    typeName = "假期";
  } else if (hasApprovedLeave) {
    typeName = "请假";
  } else if (rec) {
    details = calcAttendanceDetails(rec, config);
    typeName = ATTENDANCE_TYPE_NAMES[rec.type] || "正常";
  }

  const isAbsentOrLeave = emp.status === "休假" || hasApprovedLeave || !rec || isNonWorkingAttendanceType(rec.type);
  const hasBaseWage = emp.baseMonthlyWage !== undefined && emp.baseMonthlyWage !== null && emp.baseMonthlyWage > 0;
  const hasDailyWage = emp.dailyWage !== undefined && emp.dailyWage !== null && emp.dailyWage > 0;

  const shiftPay = isAbsentOrLeave
    ? 0
    : (emp.salaryType === "hourly"
        ? ((details.valid - details.ot) * (emp.hourlyRate ?? 0))
        : (hasBaseWage
            ? (emp.baseMonthlyWage / 30)
            : (hasDailyWage
                ? ((details.valid - details.ot) * (emp.dailyWage / config.standardHours))
                : ((details.valid - details.ot) * (emp.hourlyRate ?? 0))
              )
          )
      );
  const otPay = calcOvertimePay(emp, date, details.ot, config, holidays).amount;

  const getMealAllowanceVal = (e: Employee, isLeaveOrAbsent: boolean) => {
    if (isLeaveOrAbsent) return 0;
    return e.mealAllowanceDaily !== undefined && e.mealAllowanceDaily !== null ? e.mealAllowanceDaily : 0;
  };
  const mealAllowance = getMealAllowanceVal(emp, isAbsentOrLeave);
  const dailySocialSecurity = isAbsentOrLeave ? 0 : (emp.socialSecurity ? (emp.socialSecurity / 30) : 0);

  const isDispatch = emp.sourceType === "劳务派遣";
  const commRate = isDispatch ? (emp.dispatchCommissionRate ?? 0) : 0;
  const dailyServiceFee = isAbsentOrLeave ? 0 : shiftPay * (commRate / 100);

  const totalPay = shiftPay + otPay + mealAllowance - dailySocialSecurity + dailyServiceFee;
  const type = rec?.type || (isAbsentOrLeave ? "absent" : "normal");

  return {
    details,
    shiftPay,
    otPay,
    mealAllowance,
    dailySocialSecurity,
    dailyServiceFee,
    totalPay,
    typeName,
    type,
    isAbsentOrLeave
  };
}

export function AttendanceTable({
  employees,
  attendance,
  config,
  selectedIds,
  onSelect,
  onSelectAll,
  onEditRecord,
  holidays,
  leaveRequests = [],
  onUpdateLeaveRequests,
  hasPermission = () => true,
  onRefresh,
  addToast,
  warehouseCode
}: AttendanceTableProps) {
  const defaultMonth = useMemo(() => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    return `${yyyy}-${mm}`;
  }, []);

  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>(defaultMonth);
  const [isEmployeeDropdownOpen, setIsEmployeeDropdownOpen] = useState<boolean>(false);
  const [employeeSearchQuery, setEmployeeSearchQuery] = useState<string>('');
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState<boolean>(false);
  const [pickerYear, setPickerYear] = useState<number>(() => {
    const y = parseInt(defaultMonth.split('-')[0]);
    return isNaN(y) ? new Date().getFullYear() : y;
  });

  // Manual Attendance Record Add States
  const [isManualAddOpen, setIsManualAddOpen] = useState<boolean>(false);
  const [manualEmpId, setManualEmpId] = useState<number | ''>('');
  const [manualDate, setManualDate] = useState<string>(() => getNowDateStr());
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isTableLoading, setIsTableLoading] = useState<boolean>(true);
  const [serverRows, setServerRows] = useState<AttendanceCalculationRow[] | null>(null);
  const [reloadTrigger, setReloadTrigger] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedEmployeeId, statusFilter, selectedMonth]);

  const tableContainerRef = useRef<HTMLDivElement | null>(null);
  const isRefreshingRef = useRef<boolean>(false);
  const isInitialMountRef = useRef<boolean>(true);
  const prevMonthRef = useRef<string>(selectedMonth);
  const prevWarehouseRef = useRef<string>(warehouseCode);
  const mirrorHeaderRef = useRef<HTMLDivElement | null>(null);
  const realTableRef = useRef<HTMLTableElement | null>(null);
  const realTheadRef = useRef<HTMLTableSectionElement | null>(null);
  const tableHeadSentinelRef = useRef<HTMLDivElement | null>(null);
  const actionBarRef = useRef<HTMLDivElement | null>(null);
  const [isMirrorHeaderVisible, setIsMirrorHeaderVisible] = useState(false);
  const [colWidths, setColWidths] = useState<number[]>([]);
  const [realTableWidth, setRealTableWidth] = useState<number>(0);


  useEffect(() => {
    let active = true;
    const isManualRefresh = isRefreshingRef.current;
    isRefreshingRef.current = false;

    const monthChanged = prevMonthRef.current !== selectedMonth;
    const warehouseChanged = prevWarehouseRef.current !== warehouseCode;
    prevMonthRef.current = selectedMonth;
    prevWarehouseRef.current = warehouseCode;

    // Only show center loading spinner on initial mount, manual refresh, or warehouse/month switch
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
    return () => { active = false; };
  }, [selectedMonth, reloadTrigger, attendance, warehouseCode]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    isRefreshingRef.current = true;
    setIsTableLoading(true);
    setSelectedEmployeeId('all');
    setStatusFilter('all');
    setSelectedMonth(defaultMonth);
    setEmployeeSearchQuery('');
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

  const getEmployeeInfo = (empId: number) => {
    return employees.find(e => e.id === empId);
  };
  
  const filteredEmployeesForDropdown = useMemo(() => {
    if (statusFilter === 'active') {
      return employees.filter(emp => emp.status !== '离职');
    } else if (statusFilter === 'inactive') {
      return employees.filter(emp => emp.status === '离职');
    }
    return employees;
  }, [employees, statusFilter]);

  const searchedEmployees = useMemo(() => {
    let list = filteredEmployeesForDropdown;
    if (employeeSearchQuery.trim()) {
      const q = employeeSearchQuery.toLowerCase();
      list = list.filter(emp => 
        emp.name.toLowerCase().includes(q) || 
        (emp.role && emp.role.toLowerCase().includes(q)) || 
        (emp.dept && emp.dept.toLowerCase().includes(q))
      );
    }
    return list;
  }, [filteredEmployeesForDropdown, employeeSearchQuery]);

  const [detailRecord, setDetailRecord] = useState<{
    emp: Employee;
    rec: AttendanceRecord | null;
    date: string;
    details: { valid: number; ot: number };
    shiftPay: number;
    otPay: number;
    mealAllowance: number;
    dailySocialSecurity: number;
    dailyServiceFee: number;
    totalPay: number;
  } | null>(null);

  const exportRowsToCSV = (rowsToExport: any[], filename: string) => {
    const headers = [
      "日期", "员工姓名", "来源国家", "性别", "职位", "所属区域", 
      "时薪", "基本日薪", "上班时间", "下班时间", "有效工时", "加班工时", 
      "今天上班费用", "餐补费用", "加班费", "服务费", "合计费用", "考勤状态", "备注"
    ];

    const countryNames: Record<string, string> = { MM: "缅甸", TH: "泰国", CN: "中国", VN: "越南", KH: "柬埔寨" };

    const totals = {
      validHours: 0,
      overtimeHours: 0,
      workPay: 0,
      mealAllowance: 0,
      overtimePay: 0,
      serviceFee: 0,
      totalPay: 0
    };

    const rows = rowsToExport.map(row => {
      const { emp, rec, date } = row;
      const { details, shiftPay, otPay, mealAllowance, dailyServiceFee, totalPay, typeName } = getRowMetrics(row, config, holidays, leaveRequests);
      const hasBaseWage = emp.baseMonthlyWage !== undefined && emp.baseMonthlyWage !== null && emp.baseMonthlyWage > 0;
      const hasDailyWage = emp.dailyWage !== undefined && emp.dailyWage !== null && emp.dailyWage > 0;

      const baseDailyWage = hasBaseWage 
        ? (emp.baseMonthlyWage / 30) 
        : (hasDailyWage
            ? emp.dailyWage
            : (config.standardHours * (emp.hourlyRate ?? 0))
          );

      const displayHourlyRate = hasBaseWage 
        ? (baseDailyWage / config.standardHours) 
        : (hasDailyWage 
            ? (emp.dailyWage / config.standardHours)
            : (emp.hourlyRate ?? 0)
          );

      const isFixedSalaryEmployee = hasBaseWage;

      totals.validHours += Number(details.valid || 0);
      totals.overtimeHours += Number(details.ot || 0);
      totals.workPay += isFixedSalaryEmployee ? 0 : Number(shiftPay || 0);
      totals.mealAllowance += Number(mealAllowance || 0);
      totals.overtimePay += Number(otPay || 0);
      totals.serviceFee += isFixedSalaryEmployee ? 0 : Number(dailyServiceFee || 0);
      totals.totalPay += isFixedSalaryEmployee ? 0 : Number(totalPay || 0);

      return [
        date,
        emp.name,
        countryNames[emp.country] || emp.country || "-",
        emp.gender === "female" ? "女" : (emp.gender === "male" ? "男" : "-"),
        emp.role || "-",
        emp.dept || "-",
        Number(displayHourlyRate || 0).toFixed(2),
        Number(baseDailyWage || 0).toFixed(2),
        rec?.inTime || "-",
        rec?.outTime || "-",
        `${Number(details.valid || 0).toFixed(2)}h`,
        `${Number(details.ot || 0).toFixed(2)}h`,
        isFixedSalaryEmployee ? "-" : Number(shiftPay || 0).toFixed(2),
        Number(mealAllowance || 0).toFixed(2),
        Number(otPay || 0).toFixed(2),
        isFixedSalaryEmployee ? "-" : Number(dailyServiceFee || 0).toFixed(2),
        isFixedSalaryEmployee ? "-" : Number(totalPay || 0).toFixed(2),
        typeName,
        rec?.note || ""
      ];
    });

    const summaryRow = [
      "合计",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      `${totals.validHours.toFixed(2)}h`,
      `${totals.overtimeHours.toFixed(2)}h`,
      totals.workPay.toFixed(2),
      totals.mealAllowance.toFixed(2),
      totals.overtimePay.toFixed(2),
      totals.serviceFee.toFixed(2),
      totals.totalPay.toFixed(2),
      "",
      ""
    ];

    const csvContent = "\ufeff" + [headers, ...rows, summaryRow]
      .map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportCSV = () => {
    exportRowsToCSV(flatRows, `海外仓考勤报表_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const handleExportSelectedCSV = () => {
    if (selectedIds.size === 0) return;
    const selectedRows = flatRows.filter(r => r.rec && selectedIds.has(r.rec.id));
    exportRowsToCSV(selectedRows, `海外仓选中考勤报表_${selectedMonth}_${selectedIds.size}条.csv`);
  };
  
  const allDates = useMemo(() => {
    const dateSet = new Set<string>();
    attendance.forEach(r => dateSet.add(r.date));
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    dateSet.add(today);
    dateSet.add(yesterday);
    return Array.from(dateSet).sort().reverse();
  }, [attendance]);

  const flatRows = useMemo(() => {
    let rows: (AttendanceCalculationRow | { emp: Employee; rec: AttendanceRecord | null; date: string })[] = [];
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

    // Apply Employee status filter (在职/离职/全部)
    if (statusFilter === 'active') {
      rows = rows.filter(r => r.emp.status !== '离职');
    } else if (statusFilter === 'inactive') {
      rows = rows.filter(r => r.emp.status === '离职');
    }

    // Apply Employee filter
    if (selectedEmployeeId !== 'all') {
      rows = rows.filter(r => r.emp.id === selectedEmployeeId);
    }

    // Apply Time filter
    if (selectedMonth) {
      rows = rows.filter(r => r.date.startsWith(selectedMonth));
    }

    return rows.sort((a, b) => {
      if (a.date !== b.date) return b.date.localeCompare(a.date);
      return a.emp.name.localeCompare(b.emp.name);
    });
  }, [serverRows, allDates, employees, attendance, selectedEmployeeId, statusFilter, selectedMonth]);

  const totalPages = Math.max(1, Math.ceil(flatRows.length / pageSize));
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  const pagedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return flatRows.slice(start, start + pageSize);
  }, [flatRows, currentPage, pageSize]);

  const visibleAttendanceRecords = useMemo(() => {
    const list: AttendanceRecord[] = [];
    flatRows.forEach(row => {
      if (row.rec) {
        list.push(row.rec);
      }
    });
    return list;
  }, [flatRows]);

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

  // 测量真实表头各列像素宽度与表格总宽度
  const updateColWidths = useCallback(() => {
    if (!realTheadRef.current || !realTableRef.current) return;
    const thElements = realTheadRef.current.querySelectorAll("th");
    if (thElements.length > 0) {
      const widths = Array.from(thElements).map((th) => th.getBoundingClientRect().width);
      setColWidths(widths);
      setRealTableWidth(realTableRef.current.getBoundingClientRect().width);
    }
  }, []);

  useEffect(() => {
    updateColWidths();
    window.addEventListener("resize", updateColWidths);
    return () => window.removeEventListener("resize", updateColWidths);
  }, [updateColWidths, flatRows.length, pageSize, currentPage, isTableLoading]);

  // 横向滚动同步：真实表格容器滚动时，实时将 scrollLeft 赋给悬浮镜像表头
  const handleTableScroll = () => {
    if (tableContainerRef.current && mirrorHeaderRef.current) {
      mirrorHeaderRef.current.scrollLeft = tableContainerRef.current.scrollLeft;
    }
  };

  useEffect(() => {
    if (isMirrorHeaderVisible && tableContainerRef.current && mirrorHeaderRef.current) {
      mirrorHeaderRef.current.scrollLeft = tableContainerRef.current.scrollLeft;
    }
  }, [isMirrorHeaderVisible]);

  // 监听长页面纵向滚动，当真实表头滑动至吸顶操作栏下方时，动态浮现镜像表头
  useEffect(() => {
    const sentinel = tableHeadSentinelRef.current;
    if (!sentinel) return;

    let scrollParent: HTMLElement | null = sentinel.parentElement;
    while (scrollParent && scrollParent !== document.body) {
      const overflowY = window.getComputedStyle(scrollParent).overflowY;
      if (overflowY === "auto" || overflowY === "scroll") break;
      scrollParent = scrollParent.parentElement;
    }

    const target = scrollParent || window;
    const handleScroll = () => {
      if (!sentinel) return;
      const rect = sentinel.getBoundingClientRect();
      const threshold = actionBarRef.current
        ? actionBarRef.current.getBoundingClientRect().bottom
        : 75;
      const tableBottom = realTableRef.current
        ? realTableRef.current.getBoundingClientRect().bottom
        : Infinity;
      const shouldShow = rect.top <= threshold && tableBottom > threshold;
      if (shouldShow) {
        updateColWidths();
      }
      setIsMirrorHeaderVisible(shouldShow);
    };

    target.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll, { passive: true });
    handleScroll();

    return () => {
      target.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, [updateColWidths]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && detailRecord) {
        setDetailRecord(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [detailRecord]);

  return (
    <div className="space-y-4 animate-fade-in">
      {/* 批量操作浮动栏 */}
      {selectedIds.size > 0 && (
        <div className="bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center justify-between gap-4 animate-fade-in text-xs z-30">
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-brand-400 animate-pulse" />
            <span>已选择 <strong className="text-brand-300 font-mono text-sm">{selectedIds.size}</strong> 条考勤记录</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportSelectedCSV}
              className="bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 cursor-pointer"
              title="仅导出选中的考勤记录为 CSV"
            >
              <Download className="w-3.5 h-3.5" />
              导出所选 ({selectedIds.size})
            </button>
            <button
              type="button"
              onClick={() => onSelectAll([])}
              className="text-slate-400 hover:text-white px-2.5 py-1.5 rounded-lg transition cursor-pointer"
            >
              取消选择
            </button>
          </div>
        </div>
      )}

      {/* Compact Filter Panel */}
      <div className="bg-slate-50/95 border border-slate-200/80 rounded-xl p-3 shadow-2xs">
        <div className="flex flex-wrap items-center gap-4">
          {/* 1. 员工状态筛选 (在职/离职) */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
              员工状态:
            </span>
            <div className="flex items-center gap-0.5 bg-slate-200/60 p-0.5 rounded-lg border border-slate-200/40">
              <button
                type="button"
                onClick={() => {
                  setStatusFilter('all');
                  setSelectedEmployeeId('all');
                }}
                className={cn(
                  "px-3 py-1 text-xs font-medium rounded-md transition-all cursor-pointer",
                  statusFilter === 'all'
                    ? "bg-white text-slate-800 shadow-xs border border-slate-200/30"
                    : "text-slate-600 hover:text-slate-800"
                )}
              >
                全部
              </button>
              <button
                type="button"
                onClick={() => {
                  setStatusFilter('active');
                  setSelectedEmployeeId('all');
                }}
                className={cn(
                  "px-3 py-1 text-xs font-medium rounded-md transition-all cursor-pointer",
                  statusFilter === 'active'
                    ? "bg-emerald-500 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-800"
                )}
              >
                在职员工
              </button>
              <button
                type="button"
                onClick={() => {
                  setStatusFilter('inactive');
                  setSelectedEmployeeId('all');
                }}
                className={cn(
                  "px-3 py-1 text-xs font-medium rounded-md transition-all cursor-pointer",
                  statusFilter === 'inactive'
                    ? "bg-rose-500 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-800"
                )}
              >
                离职员工
              </button>
            </div>
          </div>

          {/* 2. 筛选员工 (Searchable Dropdown) */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-slate-400" />
              筛选员工:
            </span>
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsEmployeeDropdownOpen(!isEmployeeDropdownOpen)}
                className="px-3 py-1 border border-slate-200 rounded-lg bg-white text-slate-700 text-xs font-medium flex items-center gap-1.5 h-[32px] hover:border-slate-300 transition-colors cursor-pointer min-w-[120px] justify-between shadow-xs"
              >
                <span>
                  {selectedEmployeeId === 'all' 
                    ? "🔍 所有员工" 
                    : (employees.find(e => e.id === selectedEmployeeId)?.name || "未知员工")
                  }
                </span>
                <span className="text-[10px] text-slate-400">▼</span>
              </button>

              {isEmployeeDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsEmployeeDropdownOpen(false)} />
                  <div className="absolute left-0 mt-1 w-64 bg-white border border-slate-200 rounded-lg shadow-lg z-50 p-2 animate-fade-in">
                    <div className="relative mb-1.5">
                      <input
                        type="text"
                        placeholder="搜索姓名、职位、部门..."
                        value={employeeSearchQuery}
                        onChange={(e) => setEmployeeSearchQuery(e.target.value)}
                        className="w-full px-2.5 py-1.5 pr-7 text-xs border border-slate-200 rounded-md focus:ring-1 focus:ring-brand-500 outline-none"
                        autoFocus
                      />
                      {employeeSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setEmployeeSearchQuery("")}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
                          title="清空搜索"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <div className="max-h-48 overflow-y-auto space-y-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedEmployeeId('all');
                          setIsEmployeeDropdownOpen(false);
                          setEmployeeSearchQuery('');
                        }}
                        className={cn(
                          "w-full text-left px-2 py-1.5 text-xs rounded-md transition-colors cursor-pointer",
                          selectedEmployeeId === 'all' ? "bg-brand-50 text-brand-700 font-medium" : "text-slate-600 hover:bg-slate-50"
                        )}
                      >
                        🔍 所有员工
                      </button>
                      {searchedEmployees.length === 0 ? (
                        <div className="text-center text-slate-400 py-3 text-xs">无匹配员工</div>
                      ) : (
                        searchedEmployees.map(emp => (
                          <button
                            key={emp.id}
                            type="button"
                            onClick={() => {
                              setSelectedEmployeeId(emp.id);
                              setIsEmployeeDropdownOpen(false);
                              setEmployeeSearchQuery('');
                            }}
                            className={cn(
                              "w-full text-left px-2 py-1.5 text-xs rounded-md transition-colors flex items-center justify-between cursor-pointer",
                              selectedEmployeeId === emp.id ? "bg-brand-50 text-brand-700 font-medium" : "text-slate-600 hover:bg-slate-50"
                            )}
                          >
                            <span>{emp.name} <span className="text-slate-400 text-[10px]">({emp.role})</span></span>
                            {emp.status === '离职' && <span className="text-[10px] text-red-500 bg-red-50 px-1 rounded">离职</span>}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* 3. 时间筛选 */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              按月筛选:
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  const currentMonthStr = selectedMonth || defaultMonth;
                  const [y, m] = currentMonthStr.split('-').map(Number);
                  const d = new Date(y, m - 2, 1);
                  const newMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                  setSelectedMonth(newMonth);
                  setPickerYear(d.getFullYear());
                }}
                className="p-1 border border-slate-200 hover:border-slate-300 rounded-lg text-slate-500 hover:text-slate-800 bg-white h-[32px] w-[32px] flex items-center justify-center transition cursor-pointer shadow-xs"
                title="切换至上一月"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsMonthPickerOpen(!isMonthPickerOpen)}
                  className="px-2.5 py-1 border border-slate-200 rounded-lg hover:border-slate-300 transition-colors bg-white shadow-xs flex items-center justify-between text-xs font-mono text-slate-700 h-[32px] w-[130px] cursor-pointer focus:ring-1 focus:ring-brand-500 outline-none animate-fade-in"
                >
                <span>
                  {selectedMonth ? formatMonthLabel(selectedMonth, lang) : "全部"}
                </span>
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {isMonthPickerOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40 cursor-default bg-transparent" 
                    onClick={() => setIsMonthPickerOpen(false)}
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
                        const monthStr = String(monthNum).padStart(2, '0');
                        const value = `${pickerYear}-${monthStr}`;
                        const isSelected = selectedMonth === value;
                        const isCurrentMonth = (() => {
                          const now = new Date();
                          return now.getFullYear() === pickerYear && (now.getMonth() + 1) === monthNum;
                        })();

                        return (
                          <button
                            key={monthNum}
                            type="button"
                            onClick={() => {
                              setSelectedMonth(value);
                              setIsMonthPickerOpen(false);
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
                          const mm = String(now.getMonth() + 1).padStart(2, '0');
                          setSelectedMonth(`${yyyy}-${mm}`);
                          setPickerYear(yyyy);
                          setIsMonthPickerOpen(false);
                        }}
                        className="text-brand-600 hover:text-brand-700 font-medium cursor-pointer"
                      >
                        本月
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedMonth(defaultMonth);
                          const [y] = defaultMonth.split('-');
                          const initY = parseInt(y);
                          setPickerYear(isNaN(initY) ? new Date().getFullYear() : initY);
                          setIsMonthPickerOpen(false);
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
                onClick={() => {
                  const currentMonthStr = selectedMonth || defaultMonth;
                  const [y, m] = currentMonthStr.split('-').map(Number);
                  const d = new Date(y, m, 1);
                  const newMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                  setSelectedMonth(newMonth);
                  setPickerYear(d.getFullYear());
                }}
                className="p-1 border border-slate-200 hover:border-slate-300 rounded-lg text-slate-500 hover:text-slate-800 bg-white h-[32px] w-[32px] flex items-center justify-center transition cursor-pointer shadow-xs"
                title="切换至下一月"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Reset button inside the list - close to other items */}
          {(selectedEmployeeId !== 'all' || statusFilter !== 'all' || selectedMonth !== defaultMonth) && (
            <button
              onClick={() => {
                setSelectedEmployeeId('all');
                setStatusFilter('all');
                setSelectedMonth(defaultMonth);
                const [y] = defaultMonth.split('-');
                const initY = parseInt(y);
                setPickerYear(isNaN(initY) ? new Date().getFullYear() : initY);
              }}
              className="text-xs font-medium text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1 border border-rose-100 cursor-pointer h-[32px] shadow-xs"
            >
              <X className="w-3.5 h-3.5" /> 重置筛选
            </button>
          )}
        </div>
      </div>

      <div className="glass-panel rounded-xl shadow-sm border border-slate-200/80 bg-white">
        <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-xs rounded-t-xl shadow-2xs border-b border-slate-100">
          <div ref={actionBarRef} className="px-4 py-3 flex justify-between items-center">
          <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
            <span>考勤列表</span>
            {(selectedEmployeeId !== 'all' || selectedMonth !== defaultMonth || statusFilter !== 'all') && (
              <span className="text-xs bg-brand-50 text-brand-700 px-2 py-0.5 rounded-full font-normal border border-brand-100 animate-pulse">
                已启用筛选
              </span>
            )}
          </h3>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="bg-white border border-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-slate-50 transition flex items-center gap-1.5 cursor-pointer shadow-2xs disabled:opacity-60 disabled:cursor-not-allowed"
              title="刷新考勤数据并重置筛选条件"
            >
              <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
              刷新数据
            </button>
            {hasPermission("attendance_edit") && (
              <button
                onClick={() => onEditRecord(null, 0, '', null)}
                className="bg-brand-600 hover:bg-brand-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Clock className="w-4 h-4" />
                手动新增考勤
              </button>
            )}
            <button
              onClick={handleExportCSV}
              className="bg-brand-50 border border-brand-200 text-brand-700 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-brand-100 transition flex items-center gap-1.5 shadow-2xs"
              title="导出当前表格显示的数据为 CSV 文件"
            >
              <Download className="w-4 h-4" />
              导出当前数据
            </button>

            <div className="w-px h-5 bg-slate-200 mx-0.5 hidden sm:block" />
            <TableHorizontalScroller targetRef={tableContainerRef} />
          </div>
        </div>

        {/* 悬浮镜像表头 (Sticky Mirror Header - 方案二) */}
        {isMirrorHeaderVisible && (
          <div
            ref={mirrorHeaderRef}
            className="overflow-x-hidden border-t border-slate-200/80 bg-slate-50/95 backdrop-blur-xs shadow-xs transition-opacity duration-150"
          >
            <table
              style={{ width: realTableWidth ? `${realTableWidth}px` : "100%", minWidth: "1440px" }}
              className="text-left border-collapse table-fixed"
            >
              <thead>
                <tr className="text-slate-500 text-xs uppercase bg-slate-50/95">
                  <th style={{ width: colWidths[0] ? `${colWidths[0]}px` : undefined }} className="px-4 py-3 text-center border-b border-slate-200">
                    <input
                      type="checkbox"
                      ref={el => {
                        if (el) {
                          el.indeterminate = isPartiallySelected;
                        }
                      }}
                      checked={isAllSelected}
                      onChange={(e) => {
                        if (e.target.checked) {
                          onSelectAll(visibleAttendanceRecords.map(r => r.id));
                        } else {
                          onSelectAll([]);
                        }
                      }}
                      className="w-4 h-4 accent-brand-600 cursor-pointer"
                    />
                  </th>
                  <th style={{ width: colWidths[1] ? `${colWidths[1]}px` : undefined }} className="px-4 py-3 font-medium text-left border-b border-slate-200 whitespace-nowrap">日期</th>
                  <th style={{ width: colWidths[2] ? `${colWidths[2]}px` : undefined }} className="px-4 py-3 font-medium text-left border-b border-slate-200 whitespace-nowrap">员工</th>
                  <th style={{ width: colWidths[3] ? `${colWidths[3]}px` : undefined }} className="px-4 py-3 font-medium text-center border-b border-slate-200 whitespace-nowrap">状态</th>
                  <th style={{ width: colWidths[4] ? `${colWidths[4]}px` : undefined }} className="px-4 py-3 font-medium text-center border-b border-slate-200 whitespace-nowrap">上班</th>
                  <th style={{ width: colWidths[5] ? `${colWidths[5]}px` : undefined }} className="px-4 py-3 font-medium text-center border-b border-slate-200 whitespace-nowrap">下班</th>
                  <th style={{ width: colWidths[6] ? `${colWidths[6]}px` : undefined }} className="px-4 py-3 font-medium text-center border-b border-slate-200 whitespace-nowrap">工时</th>
                  <th style={{ width: colWidths[7] ? `${colWidths[7]}px` : undefined }} className="px-4 py-3 font-medium text-center border-b border-slate-200 whitespace-nowrap">加班</th>
                  <th style={{ width: colWidths[8] ? `${colWidths[8]}px` : undefined }} className="px-4 py-3 font-medium text-right border-b border-slate-200 whitespace-nowrap">薪资</th>
                  <th style={{ width: colWidths[9] ? `${colWidths[9]}px` : undefined }} className="px-4 py-3 font-medium text-right border-b border-slate-200 whitespace-nowrap">加班费</th>
                  <th style={{ width: colWidths[10] ? `${colWidths[10]}px` : undefined }} className="px-4 py-3 font-medium text-right border-b border-slate-200 whitespace-nowrap">餐补</th>
                  <th style={{ width: colWidths[11] ? `${colWidths[11]}px` : undefined }} className="px-4 py-3 font-medium text-right border-b border-slate-200 whitespace-nowrap">社保</th>
                  <th style={{ width: colWidths[12] ? `${colWidths[12]}px` : undefined }} className="px-4 py-3 font-medium text-right border-b border-slate-200 whitespace-nowrap">服务费</th>
                  <th style={{ width: colWidths[13] ? `${colWidths[13]}px` : undefined }} className="px-4 py-3 font-medium text-right text-blue-600 border-b border-slate-200 whitespace-nowrap">合计</th>
                  <th style={{ width: colWidths[14] ? `${colWidths[14]}px` : undefined }} className="sticky right-0 bg-slate-50/95 px-4 py-3 font-medium text-center border-b border-slate-200 whitespace-nowrap shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)]">操作</th>
                </tr>
              </thead>
            </table>
          </div>
        )}
      </div>

      <div ref={tableHeadSentinelRef} className="h-0 w-full" />
      <div ref={tableContainerRef} onScroll={handleTableScroll} className="overflow-x-auto relative rounded-b-xl">
        <table ref={realTableRef} className="w-full text-left border-collapse min-w-[1440px]">
          <thead ref={realTheadRef}>
            <tr className="text-slate-500 text-xs uppercase border-b border-slate-100 bg-slate-50/75">
              <th className="px-4 py-3 text-center w-10 border-b border-slate-100">
                <input
                  type="checkbox"
                  ref={el => {
                    if (el) {
                      el.indeterminate = isPartiallySelected;
                    }
                  }}
                  checked={isAllSelected}
                  onChange={(e) => {
                    if (e.target.checked) {
                      onSelectAll(visibleAttendanceRecords.map(r => r.id));
                    } else {
                      onSelectAll([]);
                    }
                  }}
                  className="w-4 h-4 accent-brand-600 cursor-pointer"
                />
              </th>
              <th className="px-4 py-3 font-medium text-left border-b border-slate-100 whitespace-nowrap min-w-[110px]">日期</th>
              <th className="px-4 py-3 font-medium text-left border-b border-slate-100 whitespace-nowrap min-w-[140px]">员工</th>
              <th className="px-4 py-3 font-medium text-center border-b border-slate-100 whitespace-nowrap min-w-[80px]">状态</th>
              <th className="px-4 py-3 font-medium text-center border-b border-slate-100 whitespace-nowrap min-w-[95px]">上班</th>
              <th className="px-4 py-3 font-medium text-center border-b border-slate-100 whitespace-nowrap min-w-[95px]">下班</th>
              <th className="px-4 py-3 font-medium text-center border-b border-slate-100 whitespace-nowrap min-w-[80px]">工时</th>
              <th className="px-4 py-3 font-medium text-center border-b border-slate-100 whitespace-nowrap min-w-[80px]">加班</th>
              <th className="px-4 py-3 font-medium text-right border-b border-slate-100 whitespace-nowrap min-w-[95px]">薪资</th>
              <th className="px-4 py-3 font-medium text-right border-b border-slate-100 whitespace-nowrap min-w-[95px]">加班费</th>
              <th className="px-4 py-3 font-medium text-right border-b border-slate-100 whitespace-nowrap min-w-[85px]">餐补</th>
              <th className="px-4 py-3 font-medium text-right border-b border-slate-100 whitespace-nowrap min-w-[85px]">社保</th>
              <th className="px-4 py-3 font-medium text-right border-b border-slate-100 whitespace-nowrap min-w-[85px]">服务费</th>
              <th className="px-4 py-3 font-medium text-right text-blue-600 border-b border-slate-100 whitespace-nowrap min-w-[100px]">合计</th>
              <th className="sticky right-0 bg-slate-50/95 px-4 py-3 font-medium text-center border-b border-slate-100 whitespace-nowrap min-w-[140px] shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)]">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
              {isTableLoading ? (
                <tr>
                  <td colSpan={15} className="px-6 py-20 text-center text-slate-400 text-sm">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
                      <span className="text-xs text-slate-500 font-medium">正在加载考勤数据...</span>
                    </div>
                  </td>
                </tr>
              ) : flatRows.length === 0 ? (
                <tr>
                  <td colSpan={15} className="px-6 py-12 text-center text-slate-400 text-sm">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Clock className="w-8 h-8 text-slate-300 stroke-[1.5]" />
                      <p>没有找到符合筛选条件的考勤记录</p>
                      {(selectedEmployeeId !== 'all' || statusFilter !== 'all' || selectedMonth !== defaultMonth) && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedEmployeeId('all');
                            setStatusFilter('all');
                            setSelectedMonth(defaultMonth);
                            setEmployeeSearchQuery('');
                            const [y] = defaultMonth.split('-');
                            const initY = parseInt(y);
                            setPickerYear(isNaN(initY) ? new Date().getFullYear() : initY);
                          }}
                          className="mt-1 text-xs text-brand-600 hover:text-brand-700 font-medium underline cursor-pointer"
                        >
                          重置所有筛选条件并查看全部
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                pagedRows.map((row, idx) => {
                  const { emp, rec, date } = row;
                  const isSelected = rec ? selectedIds.has(rec.id) : false;
                  const { details, shiftPay, otPay, mealAllowance, dailySocialSecurity, dailyServiceFee, totalPay, type, typeName, isAbsentOrLeave } = getRowMetrics(row, config, holidays, leaveRequests);

                  const statusBadge = (
                    <span className={cn("px-2.5 py-0.5 rounded text-xs font-medium inline-block whitespace-nowrap", ATTENDANCE_TYPE_CLASSES[type] || 'bg-slate-100 text-slate-700')}>
                      {typeName}
                    </span>
                  );

                  return (
                    <tr
                      key={`${emp.id}-${date}`}
                      className={cn(
                        "group hover:bg-slate-50 transition-colors border-b border-slate-100 bg-white",
                        isSelected && "selected-row"
                      )}
                    >
                      <td className="px-4 py-4.5 text-center">
                        <input
                          type="checkbox"
                          disabled={!rec}
                          checked={isSelected}
                          onChange={(e) => rec && onSelect(rec.id, e.target.checked)}
                          className={cn("w-4 h-4 accent-brand-600 cursor-pointer", !rec && "opacity-30")}
                        />
                      </td>
                      <td className="px-4 py-4.5 text-sm text-slate-500 font-mono text-left whitespace-nowrap">{date}</td>
                      <td className="px-4 py-4.5 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold overflow-hidden border-2 border-white shadow-sm flex-shrink-0">
                            {emp.photo ? (
                              <img src={emp.photo} className="w-full h-full object-cover" alt="" />
                            ) : (
                              <span style={{ fontSize: '14.4px' }}>{emp.name.charAt(0)}</span>
                            )}
                          </div>
                          <span className="font-medium text-slate-900 whitespace-nowrap">{emp.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4.5 text-center whitespace-nowrap">
                        {statusBadge}
                      </td>
                      <td className="px-4 py-4.5 text-sm text-slate-700 text-center font-mono whitespace-nowrap">
                        {isAbsentOrLeave ? '-' : (
                          <div className="flex flex-col items-center justify-center">
                            <span>{formatTime(rec?.inTime)}</span>
                            {rec && rec.inLat != null && (
                              <div className={cn(
                                "text-[10px] mt-0.5 flex items-center justify-center gap-0.5 font-semibold leading-none",
                                rec.inDeviated ? "text-red-600" : "text-emerald-600"
                              )} title={`打卡坐标: ${Number(rec.inLat).toFixed(6)}, ${rec.inLng != null ? Number(rec.inLng).toFixed(6) : "-"}\n距离公司: ${rec.inDistance != null ? `${rec.inDistance}米` : "-"}`}>
                                <MapPin className="w-2.5 h-2.5 flex-shrink-0" />
                                <span>{rec.inDistance != null ? `${rec.inDistance}米` : "已定位"}</span>
                                {rec.inDeviated && <span className="text-[9px] bg-red-100 text-red-700 px-1 rounded-sm">异地</span>}
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4.5 text-sm text-slate-700 text-center font-mono whitespace-nowrap">
                        {isAbsentOrLeave ? '-' : (
                          <div className="flex flex-col items-center justify-center">
                            <span>{formatTime(rec?.outTime)}</span>
                            {rec && rec.outLat != null && (
                              <div className={cn(
                                "text-[10px] mt-0.5 flex items-center justify-center gap-0.5 font-semibold leading-none",
                                rec.outDeviated ? "text-red-600" : "text-emerald-600"
                              )} title={`打卡坐标: ${Number(rec.outLat).toFixed(6)}, ${rec.outLng != null ? Number(rec.outLng).toFixed(6) : "-"}\n距离公司: ${rec.outDistance != null ? `${rec.outDistance}米` : "-"}`}>
                                <MapPin className="w-2.5 h-2.5 flex-shrink-0" />
                                <span>{rec.outDistance != null ? `${rec.outDistance}米` : "已定位"}</span>
                                {rec.outDeviated && <span className="text-[9px] bg-red-100 text-red-700 px-1 rounded-sm">异地</span>}
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4.5 text-sm text-center whitespace-nowrap">
                        {isAbsentOrLeave ? <span className="text-slate-400">-</span> : <span className="text-slate-700 font-mono">{formatDuration(details.valid)}</span>}
                      </td>
                      <td className="px-4 py-4.5 text-sm text-center whitespace-nowrap">
                        {isAbsentOrLeave ? <span className="text-slate-400 font-mono">0.00h</span> : <span className="font-mono text-slate-700">{formatDuration(details.ot)}</span>}
                      </td>
                      <td className={cn(
                        "px-4 py-4.5 text-sm font-mono text-right font-medium whitespace-nowrap",
                        isAbsentOrLeave ? "text-slate-400" : "text-slate-700"
                      )}>
                        {formatCurrency(shiftPay, emp.currency)}
                      </td>
                      <td className={cn(
                        "px-4 py-4.5 text-sm font-mono text-right font-medium whitespace-nowrap",
                        isAbsentOrLeave ? "text-slate-400" : "text-slate-700"
                      )}>
                        {formatCurrency(otPay, emp.currency)}
                      </td>
                      <td className={cn(
                        "px-4 py-4.5 text-sm font-mono text-right font-medium whitespace-nowrap",
                        isAbsentOrLeave ? "text-slate-400" : "text-slate-700"
                      )}>
                        {formatCurrency(mealAllowance, emp.currency)}
                      </td>
                      <td className={cn(
                        "px-4 py-4.5 text-sm font-mono text-right font-medium whitespace-nowrap",
                        isAbsentOrLeave ? "text-slate-400" : "text-slate-700"
                      )}>
                        {formatCurrency(dailySocialSecurity, emp.currency)}
                      </td>
                      <td className={cn(
                        "px-4 py-4.5 text-sm font-mono text-right font-medium whitespace-nowrap",
                        isAbsentOrLeave ? "text-slate-400" : "text-slate-700"
                      )}>
                        {formatCurrency(dailyServiceFee, emp.currency)}
                      </td>
                      <td className={cn(
                        "px-4 py-4.5 text-sm font-mono text-right font-bold whitespace-nowrap",
                        isAbsentOrLeave ? "text-slate-400" : "text-blue-600"
                      )}>
                        {formatCurrency(totalPay, emp.currency)}
                      </td>
                      <td className={cn(
                        "sticky right-0 transition-colors z-10 px-4 py-4.5 text-center whitespace-nowrap shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)]",
                        isSelected ? "bg-blue-50" : "bg-white group-hover:bg-slate-50"
                      )}>
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => {
                              setDetailRecord({
                                emp,
                                rec,
                                date,
                                details,
                                shiftPay,
                                otPay,
                                mealAllowance,
                                dailySocialSecurity,
                                dailyServiceFee,
                                totalPay
                              });
                            }}
                            className="px-2.5 py-1 bg-teal-50 hover:bg-teal-100 text-teal-600 hover:text-teal-700 text-xs font-semibold rounded-lg transition inline-flex items-center gap-1 border border-teal-100 cursor-pointer"
                            title="查看考勤与薪酬费用详情"
                          >
                            <Eye className="w-3 h-3" />
                            <span>查看</span>
                          </button>
                          <button
                            onClick={() => {
                              if (hasPermission("attendance_edit")) {
                                const rowRec: AttendanceRecord = rec ? {
                                  ...rec,
                                  type: rec.type || (type as any) || "normal"
                                } : {
                                  id: `new-${emp.id}-${date}`,
                                  empId: emp.id,
                                  date,
                                  inTime: isAbsentOrLeave ? "" : (config.startShift || "08:30"),
                                  outTime: isAbsentOrLeave ? "" : (config.endShift || "17:30"),
                                  type: (type as any) || (isAbsentOrLeave ? "absent" : "normal"),
                                  note: ""
                                };
                                onEditRecord(rowRec.id, emp.id, date, rowRec);
                              }
                            }}
                            disabled={!hasPermission("attendance_edit")}
                            className={cn(
                              "px-2.5 py-1 text-xs font-semibold rounded-lg transition inline-flex items-center gap-1 border",
                              hasPermission("attendance_edit")
                                ? "bg-indigo-50 hover:bg-indigo-100 text-indigo-600 hover:text-indigo-700 border-indigo-100 cursor-pointer"
                                : "bg-slate-50 text-slate-400 border-slate-100 cursor-not-allowed"
                            )}
                            title={hasPermission("attendance_edit") ? "手动补签/调整该员工当天的考勤记录" : "无权限修改考勤记录"}
                          >
                            <Edit className="w-3 h-3" />
                            <span>{!hasPermission("attendance_edit") && "🔒"}调整</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4">
        <Pagination
          page={currentPage}
          pageSize={pageSize}
          total={flatRows.length}
          itemName="条"
          pageSizeOptions={[20, 50, 100]}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      </div>

      {/* 考勤明细查看弹窗 */}
      {detailRecord && (
        <div 
          onClick={() => setDetailRecord(null)}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-100 transform scale-100 transition-all flex flex-col cursor-default max-h-[90vh] overflow-y-auto"
          >
            
            {/* Modal Header */}
            <div className="bg-brand-600 text-white p-5 flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold">考勤明细详情</h3>
                <p className="text-xs text-brand-100 mt-0.5">日期：{detailRecord.date}</p>
              </div>
              <button 
                onClick={() => setDetailRecord(null)}
                className="text-white/80 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
              {/* Employee Info Block */}
              <div className="flex items-center gap-3.5 bg-slate-50 p-3 rounded-lg border border-slate-100">
                <div className="w-11 h-11 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold overflow-hidden border border-slate-200 shadow-xs flex-shrink-0">
                  {detailRecord.emp.photo ? (
                    <img src={detailRecord.emp.photo} className="w-full h-full object-cover" alt="" />
                  ) : (
                    <span className="text-lg">{detailRecord.emp.name.charAt(0)}</span>
                  )}
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">{detailRecord.emp.name}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">{detailRecord.emp.dept} · {detailRecord.emp.role}</p>
                </div>
              </div>

              {/* Status & Hours Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-50/60 rounded-lg border border-slate-100 text-center flex flex-col justify-center min-h-[72px]">
                  <span className="text-xs text-slate-400 font-semibold block mb-1">考勤状态</span>
                  <div>
                    {detailRecord.rec ? (
                      <span className={cn(
                        "px-2.5 py-0.5 rounded text-xs font-bold inline-block",
                        detailRecord.rec.type === 'normal' && "bg-green-100 text-green-700",
                        detailRecord.rec.type === 'late' && "bg-yellow-100 text-yellow-700",
                        detailRecord.rec.type === 'early' && "bg-orange-100 text-orange-700",
                        detailRecord.rec.type === 'absent' && "bg-red-100 text-red-700",
                        detailRecord.rec.type === 'leave' && "bg-blue-100 text-blue-700",
                        detailRecord.rec.type === 'overtime' && "bg-purple-100 text-purple-700"
                      )}>
                        {detailRecord.rec.type === 'normal' && '正常'}
                        {detailRecord.rec.type === 'late' && '迟到'}
                        {detailRecord.rec.type === 'early' && '早退'}
                        {detailRecord.rec.type === 'absent' && '缺勤'}
                        {detailRecord.rec.type === 'leave' && '假期'}
                        {detailRecord.rec.type === 'overtime' && '加班'}
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-red-100 text-red-700 inline-block">
                        {detailRecord.emp.status === '休假' ? '假期' : '缺勤'}
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-3 bg-slate-50/60 rounded-lg border border-slate-100 text-center flex flex-col justify-center min-h-[72px]">
                  <span className="text-xs text-slate-400 font-semibold block mb-1">打卡时间</span>
                  <span className="text-xs font-mono font-bold text-slate-700">
                    {detailRecord.rec ? formatTimeRange(detailRecord.rec.inTime, detailRecord.rec.outTime) : '-'}
                  </span>
                </div>

                <div className="p-3 bg-slate-50/60 rounded-lg border border-slate-100 text-center flex flex-col justify-center min-h-[72px]">
                  <span className="text-xs text-slate-400 font-semibold block mb-1">累计工时</span>
                  <span className="text-sm font-mono font-bold text-slate-800">
                    {formatDuration(detailRecord.details.valid)}
                  </span>
                </div>

                <div className="p-3 bg-slate-50/60 rounded-lg border border-slate-100 text-center flex flex-col justify-center min-h-[72px]">
                  <span className="text-xs text-slate-400 font-semibold block mb-1">加班时长</span>
                  <span className="text-sm font-mono font-bold text-blue-600">
                    {formatDuration(detailRecord.details.ot)}
                  </span>
                </div>
              </div>

              {/* Financial Calculations list */}
              <div className="bg-white border border-slate-150 rounded-xl overflow-hidden shadow-2xs">
                <div className="bg-slate-100/85 px-4 py-2.5 border-b border-slate-200 text-xs font-bold text-slate-600 flex justify-between">
                  <span>多维费用拆解</span>
                  <span>币种: {detailRecord.emp.currency}</span>
                </div>
                <div className="divide-y divide-slate-100 text-sm">
                  <div className="px-4 py-3 flex justify-between items-center">
                    <span className="text-slate-500 font-medium">基本薪资</span>
                    <span className="font-mono font-bold text-slate-800">
                      {formatCurrency(detailRecord.shiftPay, detailRecord.emp.currency)}
                    </span>
                  </div>
                  <div className="px-4 py-3 flex justify-between items-center">
                    <span className="text-slate-500 font-medium">
                      加班费用 {(() => {
                        const otInfo = calcOvertimePay(detailRecord.emp, detailRecord.date, detailRecord.details.ot, config, holidays);
                        return otInfo.label ? `(${otInfo.label})` : "";
                      })()}
                    </span>
                    <span className="font-mono font-bold text-blue-600">
                      {formatCurrency(detailRecord.otPay, detailRecord.emp.currency)}
                    </span>
                  </div>
                  <div className="px-4 py-3 flex justify-between items-center">
                    <span className="text-slate-500 font-medium">餐补费用</span>
                    <span className="font-mono font-bold text-amber-600">
                      + {formatCurrency(detailRecord.mealAllowance, detailRecord.emp.currency)}
                    </span>
                  </div>
                  <div className="px-4 py-3 flex justify-between items-center">
                    <span className="text-slate-500 font-medium">社保费用 (每日拆算扣款)</span>
                    <span className="font-mono font-bold text-red-500">
                      - {formatCurrency(detailRecord.dailySocialSecurity, detailRecord.emp.currency)}
                    </span>
                  </div>
                  <div className="px-4 py-3 flex justify-between items-center">
                    <span className="text-slate-500 font-medium">
                      {detailRecord.emp.sourceType === '劳务派遣'
                        ? `派遣服务费 (${detailRecord.emp.dispatchCommissionRate ?? 0}%)`
                        : "派遣服务费 (自招员工无抽佣)"
                      }
                    </span>
                    <span className="font-mono font-bold text-teal-600">
                      + {formatCurrency(detailRecord.dailyServiceFee, detailRecord.emp.currency)}
                    </span>
                  </div>
                  <div className="px-4 py-3.5 bg-brand-50/50 flex justify-between items-center border-t border-slate-200">
                    <span className="font-bold text-brand-900">合计总费用</span>
                    <span className="font-mono font-black text-rose-600 text-base">
                      {formatCurrency(detailRecord.totalPay, detailRecord.emp.currency)}
                    </span>
                  </div>
                </div>
              </div>

              {/* 地理定位核验 */}
              {detailRecord.rec && (detailRecord.rec.inLat != null || detailRecord.rec.outLat != null) && (
                <div className="bg-slate-50 p-4.5 rounded-xl border border-slate-250 space-y-3">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-brand-600" />
                    📍 移动端考勤打卡地理定位核验 (Geo-fencing Verification)
                  </h4>
                  <div className="text-[11px] text-slate-500 bg-white px-3 py-1.5 rounded-lg border border-slate-100 flex justify-between items-center">
                    <span>公司预设办公地点：<b>{config.companyAddress || "默认仓区"}</b></span>
                    <span className="font-mono text-slate-400">({config.companyLat != null ? Number(config.companyLat).toFixed(4) : "-"}, {config.companyLng != null ? Number(config.companyLng).toFixed(4) : "-"})</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* 上班打卡 */}
                    {detailRecord.rec.inLat != null && (
                      <div className={cn(
                        "p-3.5 rounded-lg border bg-white flex flex-col gap-1.5",
                        detailRecord.rec.inDeviated ? "border-red-200 shadow-xs shadow-red-50/50" : "border-emerald-200 shadow-xs shadow-emerald-50/50"
                      )}>
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-slate-700">🌅 上班打卡定位</span>
                          {detailRecord.rec.inDeviated ? (
                            <span className="px-2 py-0.5 text-[10px] font-bold text-red-700 bg-red-100 rounded">异地打卡</span>
                          ) : (
                            <span className="px-2 py-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-100 rounded">公司范围内</span>
                          )}
                        </div>
                        <div className="text-xs font-semibold text-slate-500">
                          打卡距离：
                          <span className={cn(
                            "text-sm font-bold font-mono",
                            detailRecord.rec.inDeviated ? "text-red-600" : "text-emerald-600"
                          )}>
                            {detailRecord.rec.inDistance} 米
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-1">
                          坐标: {Number(detailRecord.rec.inLat).toFixed(6)}, {detailRecord.rec.inLng != null ? Number(detailRecord.rec.inLng).toFixed(6) : "-"}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1">
                          {detailRecord.rec.inDeviated ? "⚠️ 员工打卡位置超出公司规定范围（限制 800 米），需向考勤组核实。" : "✅ 符合考勤地理围栏，确认在公司。"}
                        </div>
                      </div>
                    )}

                    {/* 下班打卡 */}
                    {detailRecord.rec.outLat != null && (
                      <div className={cn(
                        "p-3.5 rounded-lg border bg-white flex flex-col gap-1.5",
                        detailRecord.rec.outDeviated ? "border-red-200 shadow-xs shadow-red-50/50" : "border-emerald-200 shadow-xs shadow-emerald-50/50"
                      )}>
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-slate-700">🌇 下班打卡定位</span>
                          {detailRecord.rec.outDeviated ? (
                            <span className="px-2 py-0.5 text-[10px] font-bold text-red-700 bg-red-100 rounded">异地打卡</span>
                          ) : (
                            <span className="px-2 py-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-100 rounded">公司范围内</span>
                          )}
                        </div>
                        <div className="text-xs font-semibold text-slate-500">
                          打卡距离：
                          <span className={cn(
                            "text-sm font-bold font-mono",
                            detailRecord.rec.outDeviated ? "text-red-600" : "text-emerald-600"
                          )}>
                            {detailRecord.rec.outDistance} 米
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-1">
                          坐标: {Number(detailRecord.rec.outLat).toFixed(6)}, {detailRecord.rec.outLng != null ? Number(detailRecord.rec.outLng).toFixed(6) : "-"}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1">
                          {detailRecord.rec.outDeviated ? "⚠️ 员工打卡位置超出公司规定范围（限制 800 米），需向考勤组核实。" : "✅ 符合考勤地理围栏，确认在公司。"}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Note / Remarks */}
              <div className="p-3 bg-amber-50/40 rounded-lg border border-amber-100 text-xs">
                <span className="font-bold text-amber-800 block mb-1">备注说明</span>
                <span className="text-amber-900/80 font-medium">
                  {detailRecord.rec?.note || '无特别备注。'}
                </span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 p-3.5 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setDetailRecord(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-lg transition"
              >
                关闭
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
