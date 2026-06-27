/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { type FormEvent, type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { tAdmin } from "../lib/i18nText";
import { Download, Edit, Eye, Plus, RefreshCw, Settings } from "lucide-react";
import type {
  AppConfig,
  AttendanceCalculationDetail,
  AttendanceCalculationResult,
  AttendanceRecordUpdatePayload,
  Employee
} from "../types";
import {
  createAttendanceRecord,
  fetchAttendanceCalculationDetail,
  fetchAttendanceCalculations,
  fetchAllAttendanceCalculations,
  fetchAttendanceConfig,
  fetchEmployeeAvatars,
  generateMonthlyPayroll,
  recalculateMonthlyAttendance,
  runAttendanceDailyMaintenance,
  searchEmployees,
  updateAttendanceConfig,
  updateAttendanceRecord
} from "../lib/api";
import { ModalShell } from "./ModalShell";
import { cn, formatCurrency as formatPayrollCurrency, formatDuration, formatLocalDatePart } from "../lib/utils";
import { Pagination } from "./Pagination";
import { SearchableSelect, type SearchableSelectOption } from "./SearchableSelect";
import { YearMonthPicker } from "./YearMonthPicker";

interface AttendanceTableProps {
  isActive: boolean;
}

type CreateAttendanceForm = Omit<AttendanceRecordUpdatePayload, "type"> & {
  employeeId: string;
  // 新增考勤记录要求操作员主动选择类型；空值只存在于表单层，提交前必须校验并收窄为后端 AttendanceType。
  type: AttendanceRecordUpdatePayload["type"] | "";
};

type AdjustAttendanceForm = Omit<AttendanceRecordUpdatePayload, "type" | "employeeOvertimeHourlyFee"> & {
  // 新增补卡记录要求操作员主动选择类型；编辑已有原始记录时仍会回填现有类型。
  type: AttendanceRecordUpdatePayload["type"] | "";
  employeeOvertimeHourlyFee?: number | "";
  employeeOvertimeRuleEnabled?: boolean | null;
};

const DEFAULT_CREATE_IN_TIME = "08:30";
const DEFAULT_CREATE_OUT_TIME = "17:30";
const ATTENDANCE_REFRESH_TTL_MS = 1000 * 10;

const STATUS_CLASS_NAMES: Record<string, string> = {
  normal: "bg-green-100 text-green-700",
  pending: "bg-slate-100 text-slate-700",
  checked_in: "bg-indigo-100 text-indigo-700",
  late: "bg-yellow-100 text-yellow-700",
  early: "bg-orange-100 text-orange-700",
  absent: "bg-red-100 text-red-700",
  leave: "bg-blue-100 text-blue-700",
  sick_leave: "bg-cyan-100 text-cyan-700",
  overtime: "bg-purple-100 text-purple-700",
  manual_adjusted: "bg-amber-100 text-amber-700",
  exception: "bg-red-100 text-red-700"
};

function getDefaultDate() {
  return formatLocalDatePart().date;
}

function getDefaultMonth() {
  return formatLocalDatePart().yearMonth;
}

function formatCurrency(value: number, currency: string) {
  // 考勤计算列表的可见金额列对齐薪资核算列表，统一用货币符号承载币种，避免同页金额展示口径分叉。
  return formatPayrollCurrency(Number(value || 0), (currency || "THB") as Parameters<typeof formatPayrollCurrency>[1]);
}

function formatMoneyNumber(value: number) {
  // CSV 导出保留原有紧凑数字列，避免本次“可见列表展示”改动影响已有导出字段解析口径。
  return Number(value || 0).toFixed(2);
}

function formatEmployeeDisplayName(employee: Pick<Employee, "name" | "nickname">) {
  return employee.nickname ? `${employee.name}(${employee.nickname})` : employee.name;
}

function extractAttendanceLocation(note: string | null | undefined) {
  const lines = String(note || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const locationLine = lines.find((line) => /^位置[:：]\s*/.test(line));
  return locationLine ? locationLine.replace(/^位置[:：]\s*/, "").trim() : "";
}

function stripAttendanceLocationNote(note: string | null | undefined) {
  return String(note || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => Boolean(line) && !/^位置[:：]\s*/.test(line))
    .join("\n")
    .trim();
}

function parseHolidayDatesInput(value: string) {
  return Array.from(new Set(
    value
      .split(/[\n,，\s]+/)
      .map((item) => item.trim())
      .filter((item) => /^\d{4}-\d{2}-\d{2}$/.test(item))
  )).sort();
}

function formatHolidayDatesInput(dates: string[] | undefined) {
  return Array.isArray(dates) ? dates.join("\n") : "";
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function getAttendanceTotalPayWithService(item: AttendanceCalculationResult) {
  // attendance_calculation_results.totalPay 是历史沉淀的“上班+餐补+加班”；列表合计需要额外计入服务费，但不在前端重算其他费用口径。
  return Number(item.totalPay || 0) + Number(item.serviceFeeAmount || 0);
}

function getStatusLabel(status: string) {
  // 状态文案必须在函数内翻译；模块顶层只保留状态码和样式，保证语言切换后重新渲染能拿到新语言。
  switch (status) {
    case "pending": return tAdmin("待打卡");
    case "checked_in": return tAdmin("已上班");
    case "late": return tAdmin("迟到");
    case "early": return tAdmin("早退");
    case "absent": return tAdmin("缺勤");
    case "leave": return tAdmin("假期");
    case "sick_leave": return tAdmin("病假");
    case "overtime": return tAdmin("加班");
    case "manual_adjusted": return tAdmin("人工调整");
    case "exception": return tAdmin("异常");
    case "normal":
    default: return tAdmin("全勤");
  }
}

function getStatusMeta(item: AttendanceCalculationResult) {
  const status = item.isOvertime && item.status === "normal" ? "overtime" : item.status;
  if (STATUS_CLASS_NAMES[status]) return { label: getStatusLabel(status), className: STATUS_CLASS_NAMES[status] };
  return { label: item.statusLabel || item.status || tAdmin("全勤"), className: "bg-slate-100 text-slate-700" };
}

function Modal({
  isOpen,
  title,
  onClose,
  children,
  className = "max-w-2xl",
  footer
}: {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  footer?: ReactNode;
}) {
  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      className={className}
      bodyClassName="overflow-y-auto"
      footer={footer}
    >
      {children}
    </ModalShell>
  );
}

export function AttendanceTable({ isActive }: AttendanceTableProps) {
  const employeeSearchRequestIdRef = useRef(0);
  const [avatarMap, setAvatarMap] = useState<Record<number, string | null>>({});
  const backgroundRefreshTimersRef = useRef<number[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | "all">("all");
  const [resignedOnly, setResignedOnly] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(getDefaultMonth());
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [calculations, setCalculations] = useState<AttendanceCalculationResult[]>([]);
  const [total, setTotal] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [configForm, setConfigForm] = useState<AppConfig | null>(null);
  const [holidayDatesText, setHolidayDatesText] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHolidaySettingsOpen, setIsHolidaySettingsOpen] = useState(false);
  const [isAdjustmentOpen, setIsAdjustmentOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isMaintenanceConfirmOpen, setIsMaintenanceConfirmOpen] = useState(false);
  const [adjustingResult, setAdjustingResult] = useState<AttendanceCalculationResult | null>(null);
  const [detailResult, setDetailResult] = useState<AttendanceCalculationResult | null>(null);
  const [detailRecord, setDetailRecord] = useState<AttendanceCalculationDetail["record"] | null>(null);
  const [createForm, setCreateForm] = useState<CreateAttendanceForm>({
    employeeId: "",
    date: getDefaultDate(),
    type: "",
    inTime: DEFAULT_CREATE_IN_TIME,
    outTime: DEFAULT_CREATE_OUT_TIME,
    note: ""
  });
  const [adjustForm, setAdjustForm] = useState<AdjustAttendanceForm>({
    date: "",
    type: "",
    inTime: null,
    outTime: null,
    note: "",
    employeeOvertimeHourlyFee: "",
    employeeOvertimeRuleEnabled: null
  });
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [adjustmentLoading, setAdjustmentLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState("");
  const [error, setError] = useState("");
  const [lastLoadedAt, setLastLoadedAt] = useState(0);
  const [reloadNonce, setReloadNonce] = useState(0);
  const loadRequestIdRef = useRef(0);
  const lastLoadedFilterKeyRef = useRef("");
  const [selectedFilterEmployee, setSelectedFilterEmployee] = useState<Employee | null>(null);
  const [employeeFilterSearchResults, setEmployeeFilterSearchResults] = useState<Employee[]>([]);
  const [employeeFilterLoading, setEmployeeFilterLoading] = useState(false);
  const [filterSelectResetKey, setFilterSelectResetKey] = useState(0);
  const [selectedCreateEmployee, setSelectedCreateEmployee] = useState<Employee | null>(null);
  const [createEmployeeSearchResults, setCreateEmployeeSearchResults] = useState<Employee[]>([]);
  const [createEmployeeLoading, setCreateEmployeeLoading] = useState(false);

  const isFiltered = resignedOnly || selectedEmployeeId !== "all" || Boolean(selectedDate) || selectedMonth !== getDefaultMonth();
  const getCreateDefaultTimes = () => ({
    inTime: configForm?.startShift || DEFAULT_CREATE_IN_TIME,
    outTime: configForm?.endShift || DEFAULT_CREATE_OUT_TIME
  });
  const mergeUniqueEmployees = (rows: Array<Employee | null | undefined>) => {
    const deduped = new Map<number, Employee>();
    rows.forEach((employee) => {
      if (!employee) {
        return;
      }
      deduped.set(Number(employee.id), employee);
    });
    return Array.from(deduped.values());
  };
  const employeeFilterOptions = useMemo(() => {
    const optionEmployees = mergeUniqueEmployees([selectedFilterEmployee, ...employeeFilterSearchResults]);
    // 员工筛选统一只显示主文案；员工编号/岗位等信息继续保留在关键词里供搜索命中。
    return [
      {
        value: "all",
        label: tAdmin("所有员工 (全部)")
      },
      ...optionEmployees.map((employee) => ({
        value: String(employee.id),
        label: formatEmployeeDisplayName(employee),
        keywords: [employee.name, employee.nickname, employee.employeeNo, employee.role, employee.dept]
      }))
    ];
  }, [employeeFilterSearchResults, selectedFilterEmployee]);
  const createEmployeeOptions = useMemo<SearchableSelectOption[]>(() => {
    return mergeUniqueEmployees([selectedCreateEmployee, ...createEmployeeSearchResults]).map((employee) => ({
      value: String(employee.id),
      label: formatEmployeeDisplayName(employee),
      description: [employee.employeeNo, employee.role].filter(Boolean).join(" · "),
      keywords: [employee.name, employee.nickname, employee.employeeNo, employee.role, employee.dept]
    }));
  }, [createEmployeeSearchResults, selectedCreateEmployee]);
  const selectedDay = selectedDate.startsWith(`${selectedMonth}-`) ? selectedDate.slice(8, 10) : "";
  const selectedMonthDayOptions = useMemo(() => {
    const [yearPart, monthPart] = selectedMonth.split("-");
    const year = Number(yearPart);
    const month = Number(monthPart);
    if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
      return [];
    }

    const totalDays = getDaysInMonth(year, month);
    const isCurrentMonth = selectedMonth === getDefaultMonth();
    const maxDay = isCurrentMonth ? Number(getDefaultDate().slice(8, 10)) : totalDays;

    return Array.from({ length: maxDay }, (_, index) => {
      const day = index + 1;
      return {
        value: String(day).padStart(2, "0"),
        label: String(day)
      };
    });
  }, [selectedMonth]);

  useEffect(() => {
    const employeeIds = calculations
      .map((item) => item.employeeId)
      .filter((id, index, arr) => arr.indexOf(id) === index)
      .filter((id) => !(id in avatarMap));
    if (employeeIds.length === 0) {
      return;
    }

    let cancelled = false;
    void fetchEmployeeAvatars(employeeIds).then((result) => {
      if (cancelled) {
        return;
      }
      setAvatarMap((prev) => {
        const next = { ...prev };
        result.items.forEach((item) => {
          next[item.id] = item.photo;
        });
        return next;
      });
    }).catch(() => {
      // 考勤列表头像补图失败不影响主列表展示。
    });

    return () => {
      cancelled = true;
    };
  }, [avatarMap, calculations]);

  const displayedCalculations = useMemo(
    () => calculations.map((item) => ({
      ...item,
      employeePhoto: avatarMap[item.employeeId] ?? item.employeePhoto
    })),
    [avatarMap, calculations]
  );

  useEffect(() => {
    const employeeId = selectedCreateEmployee?.id;
    if (!employeeId || employeeId in avatarMap) {
      return;
    }

    let cancelled = false;
    void fetchEmployeeAvatars([employeeId]).then((result) => {
      if (cancelled) {
        return;
      }
      setAvatarMap((prev) => {
        const next = { ...prev };
        result.items.forEach((item) => {
          next[item.id] = item.photo;
        });
        return next;
      });
    }).catch(() => {
      // 新增考勤记录里的员工头像补图失败不影响选人和保存。
    });

    return () => {
      cancelled = true;
    };
  }, [avatarMap, selectedCreateEmployee]);

  const runEmployeeSearch = async (query: string, mode: "filter" | "create") => {
    const requestId = ++employeeSearchRequestIdRef.current;
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      if (mode === "filter") {
        setEmployeeFilterSearchResults([]);
        setEmployeeFilterLoading(false);
      } else {
        setCreateEmployeeSearchResults([]);
        setCreateEmployeeLoading(false);
      }
      return;
    }

    if (mode === "filter") {
      setEmployeeFilterLoading(true);
    } else {
      setCreateEmployeeLoading(true);
    }

    try {
      const rows = await searchEmployees(trimmedQuery, mode === "filter"
        ? { status: resignedOnly ? "resigned" : "all", includeInactive: resignedOnly }
        : {});
      if (requestId !== employeeSearchRequestIdRef.current) {
        return;
      }
      if (mode === "filter") {
        setEmployeeFilterSearchResults(rows);
      } else {
        setCreateEmployeeSearchResults(rows);
      }
    } finally {
      if (requestId !== employeeSearchRequestIdRef.current) {
        return;
      }
      if (mode === "filter") {
        setEmployeeFilterLoading(false);
      } else {
        setCreateEmployeeLoading(false);
      }
    }
  };

  const scheduleBackgroundRefresh = () => {
    backgroundRefreshTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    backgroundRefreshTimersRef.current = [
      window.setTimeout(() => {
        void loadData();
      }, 1200),
      window.setTimeout(() => {
        void loadData();
      }, 3500)
    ];
  };

  const buildLoadFilterKey = () => JSON.stringify({
    employeeId: selectedEmployeeId,
    resignedOnly,
    selectedDate,
    selectedMonth,
    page
  });

  const loadData = async () => {
    const requestId = ++loadRequestIdRef.current;
    const effectiveDate = selectedDate || undefined;
    const effectiveMonth = selectedMonth || effectiveDate?.slice(0, 7);
    const filterKey = buildLoadFilterKey();

    setLoading(true);
    setError("");
    try {
      const nextPage = await fetchAttendanceCalculations({
        yearMonth: effectiveMonth,
        date: effectiveDate,
        employeeId: selectedEmployeeId === "all" ? null : selectedEmployeeId,
        employeeStatus: resignedOnly ? "resigned" : "all",
        page,
        pageSize,
        includeInactive: resignedOnly
      });
      if (requestId !== loadRequestIdRef.current) {
        return;
      }
      setCalculations(nextPage.items);
      setTotal(nextPage.total);
      setSelectedIds(new Set());
      setLastLoadedAt(Date.now());
      lastLoadedFilterKeyRef.current = filterKey;
    } catch (nextError) {
      if (requestId !== loadRequestIdRef.current) {
        return;
      }
      setError(nextError instanceof Error ? nextError.message : tAdmin("考勤计算数据加载失败"));
    } finally {
      if (requestId === loadRequestIdRef.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (!isActive) {
      return;
    }

    const currentFilterKey = buildLoadFilterKey();
    if (
      calculations.length > 0
      && Date.now() - lastLoadedAt < ATTENDANCE_REFRESH_TTL_MS
      && lastLoadedFilterKeyRef.current === currentFilterKey
    ) {
      return;
    }

    // 考勤页被缓存后切回来时需要按当前筛选条件后台重拉数据，但不能先清空表格主体。
    void loadData();
  }, [calculations.length, isActive, lastLoadedAt, page, reloadNonce, resignedOnly, selectedDate, selectedEmployeeId, selectedMonth]);

  useEffect(() => {
    void fetchAttendanceConfig()
      .then((nextConfig) => {
        setConfigForm(nextConfig);
        setHolidayDatesText(formatHolidayDatesInput(nextConfig.holidayDates));
      })
      .catch((nextError) => setError(nextError instanceof Error ? nextError.message : tAdmin("考勤规则配置加载失败")));
  }, []);

  useEffect(() => {
    // 只有筛选条件变化时才回到第一页；真实后端分页下，翻页本身会触发 loadData，不能再被返回结果反向重置。
    setPage(1);
  }, [resignedOnly, selectedDate, selectedEmployeeId, selectedMonth]);

  useEffect(() => {
    return () => {
      backgroundRefreshTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    };
  }, []);
  const showRefreshing = loading && calculations.length > 0;

  const isAllSelected = calculations.length > 0 && calculations.every((row) => selectedIds.has(row.id));

  const toggleSelectAll = (checked: boolean) => {
    setSelectedIds(checked ? new Set(calculations.map((row) => row.id)) : new Set());
  };

  const toggleSelect = (id: number, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  const resetFilters = () => {
    setSelectedEmployeeId("all");
    setSelectedFilterEmployee(null);
    setEmployeeFilterSearchResults([]);
    setEmployeeFilterLoading(false);
    setSelectedDate("");
    setSelectedMonth(getDefaultMonth());
    setResignedOnly(false);
    setFilterSelectResetKey((prev) => prev + 1);
    setLastLoadedAt(0);
    setReloadNonce((prev) => prev + 1);
    setPage(1);
  };

  const applyDefaultTimeWhenNormal = <T extends { type: AttendanceRecordUpdatePayload["type"] | ""; inTime: string | null; outTime: string | null }>(
    prev: T,
    nextType: AttendanceRecordUpdatePayload["type"] | ""
  ): T => ({
    ...prev,
    type: nextType,
    // 只在切回“全勤(normal)”时恢复业务默认上下班时间；空值和其他考勤类型保留用户已填时间，避免病假/缺勤等记录被强塞默认时间。
    inTime: nextType === "normal" ? DEFAULT_CREATE_IN_TIME : prev.inTime,
    outTime: nextType === "normal" ? DEFAULT_CREATE_OUT_TIME : prev.outTime
  } as T);

  const handleRunDailyMaintenance = async () => {
    setSubmitting(true);
    setError("");
    setMaintenanceMessage("");
    try {
      await runAttendanceDailyMaintenance();
      // 用户只需要看到业务结果，不展示底层维护日期、底稿数量或失败统计，避免把自动维护细节暴露到主界面。
      setMaintenanceMessage(tAdmin("更新成功"));
      setIsMaintenanceConfirmOpen(false);
      await loadData();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : tAdmin("考勤每日维护补跑失败"));
      setIsMaintenanceConfirmOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleExportCSV = async () => {
    setIsExporting(true);
    setError("");
    try {
      const effectiveDate = selectedDate || undefined;
      const effectiveMonth = selectedMonth || effectiveDate?.slice(0, 7);
      const exportCalculations = await fetchAllAttendanceCalculations({
        yearMonth: effectiveMonth,
        date: effectiveDate,
        employeeId: selectedEmployeeId === "all" ? null : selectedEmployeeId,
        employeeStatus: resignedOnly ? "resigned" : "all",
        includeInactive: resignedOnly
      });
      const headers = [
        tAdmin("日期"), tAdmin("员工姓名"), tAdmin("来源国家"), tAdmin("性别"), tAdmin("职位"), tAdmin("所属区域"),
        tAdmin("时薪"), tAdmin("基本日薪"), tAdmin("上班时间"), tAdmin("下班时间"), tAdmin("有效工时"), tAdmin("加班工时"),
        tAdmin("今天上班费用"), tAdmin("餐补费用"), tAdmin("加班费"), tAdmin("服务费"), tAdmin("合计费用"), tAdmin("考勤状态"), tAdmin("备注")
      ];
      const countryNames: Record<string, string> = { MM: tAdmin("缅甸"), TH: tAdmin("泰国"), CN: tAdmin("中国"), VN: tAdmin("越南"), KH: tAdmin("柬埔寨") };
      const totals = exportCalculations.reduce(
        (acc, item) => {
          acc.validHours += Number(item.validHours || 0);
          acc.overtimeHours += Number(item.overtimePayHours || 0);
          acc.workPay += Number(item.workPay || 0);
          acc.mealAllowance += Number(item.mealAllowanceAmount || 0);
          acc.overtimePay += Number(item.overtimePay || 0);
          acc.serviceFee += Number(item.serviceFeeAmount || 0);
          acc.totalPay += getAttendanceTotalPayWithService(item);
          return acc;
        },
        { validHours: 0, overtimeHours: 0, workPay: 0, mealAllowance: 0, overtimePay: 0, serviceFee: 0, totalPay: 0 }
      );
      const rows = exportCalculations.map((item) => {
        const baseDailyWage = item.fixedSalary && item.fixedSalary > 0 ? item.fixedSalary / 30 : item.standardHours * (item.hourlyRate || 0);
        const displayHourlyRate = item.fixedSalary && item.fixedSalary > 0 ? baseDailyWage / Math.max(1, item.standardHours) : item.hourlyRate || 0;
        const isFixedSalaryEmployee = item.salaryType === "fixed";
        return [
          item.date,
          item.employeeName,
          countryNames[item.employeeCountry || ""] || item.employeeCountry || "-",
          item.employeeGender === "female" ? tAdmin("女") : item.employeeGender === "male" ? tAdmin("男") : "-",
          item.employeeRole || "-",
          item.employeeDept || "-",
          formatMoneyNumber(displayHourlyRate),
          formatMoneyNumber(baseDailyWage),
          item.rawInTime || "-",
          item.rawOutTime || "-",
          `${item.validHours.toFixed(2)}h`,
          `${item.overtimePayHours.toFixed(2)}h`,
          isFixedSalaryEmployee ? "-" : formatMoneyNumber(item.workPay),
          formatMoneyNumber(item.mealAllowanceAmount),
          formatMoneyNumber(item.overtimePay),
          isFixedSalaryEmployee ? "-" : formatMoneyNumber(item.serviceFeeAmount),
          isFixedSalaryEmployee ? "-" : formatCurrency(getAttendanceTotalPayWithService(item), item.currency),
          getStatusMeta(item).label,
          item.note || ""
        ];
      });
      // 导出底部合计必须和当前筛选结果同口径：只汇总工时/金额列，不伪造单价、时间点或状态字段。
      const summaryRow = [
        tAdmin("合计"),
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
        formatMoneyNumber(totals.workPay),
        formatMoneyNumber(totals.mealAllowance),
        formatMoneyNumber(totals.overtimePay),
        formatMoneyNumber(totals.serviceFee),
        formatMoneyNumber(totals.totalPay),
        "",
        ""
      ];
      // 导出必须按“当前筛选全部数据”单独拉全量结果；表格当前页只负责屏幕展示，不能再被当成导出数据源。
      const csvContent = "\ufeff" + [headers, ...rows, summaryRow]
        .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","))
        .join("\n");
      const url = URL.createObjectURL(new Blob([csvContent], { type: "text/csv;charset=utf-8;" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = tAdmin("海外仓考勤报表_{{date}}.csv", { date: getDefaultDate() });
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : tAdmin("考勤报表导出失败"));
    } finally {
      setIsExporting(false);
    }
  };

  const handleOpenAdjustment = async (result: AttendanceCalculationResult) => {
    setAdjustingResult(result);
    setAdjustForm({
      date: result.date,
      type: "",
      inTime: result.rawInTime || null,
      outTime: result.rawOutTime || null,
      note: result.note || "",
      employeeOvertimeHourlyFee: "",
      employeeOvertimeRuleEnabled: configForm?.overtimeRuleEnabled ?? null
    });
    setIsAdjustmentOpen(true);
    setAdjustmentLoading(true);
    setError("");
    try {
      const detail = result.attendanceRecordId ? await fetchAttendanceCalculationDetail(result.id) : null;
      setAdjustForm({
        date: detail?.record?.date || result.date,
        type: detail?.record?.type || "",
        inTime: detail?.record?.inTime || result.rawInTime || null,
        outTime: detail?.record?.outTime || result.rawOutTime || null,
        note: detail?.record?.note || result.note || "",
        employeeOvertimeHourlyFee: detail?.employee?.overtimeHourlyFee ?? "",
        employeeOvertimeRuleEnabled: detail?.employee?.overtimeRuleEnabled ?? configForm?.overtimeRuleEnabled ?? null
      });
      setIsAdjustmentOpen(true);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : tAdmin("考勤记录加载失败"));
    } finally {
      setAdjustmentLoading(false);
    }
  };

  const handleOpenDetail = async (result: AttendanceCalculationResult) => {
    // 详情弹窗必须允许查看离职员工的历史打卡；只有“调整”动作继续限制为在职员工，避免误改历史记录。
    setDetailResult(result);
    setDetailRecord(null);
    setDetailError("");
    setDetailLoading(false);
    setIsDetailOpen(true);

    if (!result.attendanceRecordId) {
      return;
    }

    setDetailLoading(true);
    try {
      const detail = await fetchAttendanceCalculationDetail(result.id);
      setDetailRecord(detail.record);
    } catch (nextError) {
      setDetailError(nextError instanceof Error ? nextError.message : tAdmin("考勤详情加载失败"));
    } finally {
      setDetailLoading(false);
    }
  };

  const handleSaveAdjustment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!adjustingResult) {
      return;
    }
    if (!adjustForm.type) {
      setError(tAdmin("请选择考勤类型"));
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const isHourlyEmployeeWithRule = adjustingResult.salaryType === "hourly"
        && Boolean(adjustForm.employeeOvertimeRuleEnabled ?? configForm?.overtimeRuleEnabled);
      const adjustmentPayload: AttendanceRecordUpdatePayload = {
        ...adjustForm,
        type: adjustForm.type,
        employeeOvertimeHourlyFee: isHourlyEmployeeWithRule
          ? null
          : (adjustForm.employeeOvertimeHourlyFee === "" ? null : Number(adjustForm.employeeOvertimeHourlyFee)),
        employeeOvertimeRuleEnabled: adjustForm.employeeOvertimeRuleEnabled ?? configForm?.overtimeRuleEnabled ?? null
      };
      if (adjustingResult.attendanceRecordId) {
        await updateAttendanceRecord(adjustingResult.attendanceRecordId, adjustmentPayload);
        await loadData();
      } else {
        const response = await createAttendanceRecord({ employeeId: adjustingResult.employeeId, ...adjustmentPayload });
        setMaintenanceMessage(response.message || tAdmin("考勤记录已添加，后台正在继续计算"));
        scheduleBackgroundRefresh();
      }
      setIsAdjustmentOpen(false);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : tAdmin("考勤调整失败"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenCreate = () => {
    setCreateForm((prev) => ({
      ...prev,
      // 新增记录只沿用当前筛选员工和日期；上下班时间每次打开都回到业务默认值，避免上次补卡的临时时间污染下一条新增记录。
      employeeId: selectedEmployeeId === "all" ? prev.employeeId : String(selectedEmployeeId),
      date: selectedDate || prev.date || getDefaultDate(),
      // 每次打开新增弹窗都清空考勤类型，要求操作员主动确认本次记录类型，避免沿用上一条补卡选择。
      type: "",
      inTime: "",
      outTime: ""
    }));
    setIsCreateOpen(true);
  };

  const handleSaveCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const employeeId = Number(createForm.employeeId);
    if (!employeeId) {
      setError(tAdmin("请选择员工后再新增考勤记录"));
      return;
    }
    if (!createForm.type) {
      setError(tAdmin("请选择考勤类型"));
      return;
    }
    const attendanceType: AttendanceRecordUpdatePayload["type"] = createForm.type;

    setSubmitting(true);
    setError("");
    try {
      const response = await createAttendanceRecord({
        employeeId,
        date: createForm.date,
        type: attendanceType,
        inTime: createForm.inTime || null,
        outTime: createForm.outTime || null,
        note: createForm.note
      });
      setIsCreateOpen(false);
      setMaintenanceMessage(response.message || tAdmin("考勤记录已添加，后台正在继续计算"));
      scheduleBackgroundRefresh();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : tAdmin("新增考勤记录失败"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveConfig = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!configForm) {
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const nextConfig = await updateAttendanceConfig(configForm);
      setConfigForm(nextConfig);
      setIsSettingsOpen(false);
      const monthToRecalculate = selectedDate ? selectedDate.slice(0, 7) : (selectedMonth || getDefaultMonth());
      await recalculateMonthlyAttendance(monthToRecalculate, selectedEmployeeId === "all" ? null : selectedEmployeeId);
      await loadData();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : tAdmin("考勤规则配置保存失败"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveHolidaySettings = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!configForm) {
      return;
    }

    const holidayDates = parseHolidayDatesInput(holidayDatesText);
    const invalidHolidayDateInput = holidayDatesText.trim().length > 0 && holidayDates.length === 0;
    if (invalidHolidayDateInput) {
      setError(tAdmin("节假日日期请按 YYYY-MM-DD 格式填写"));
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const nextConfig = await updateAttendanceConfig({
        ...configForm,
        holidayDates
      });
      setConfigForm(nextConfig);
      setHolidayDatesText(formatHolidayDatesInput(nextConfig.holidayDates));
      setIsHolidaySettingsOpen(false);
      const monthToRecalculate = selectedDate ? selectedDate.slice(0, 7) : (selectedMonth || getDefaultMonth());
      const scopedEmployeeId = selectedEmployeeId === "all" ? null : selectedEmployeeId;
      await recalculateMonthlyAttendance(monthToRecalculate, scopedEmployeeId);
      await generateMonthlyPayroll(monthToRecalculate, scopedEmployeeId ? [scopedEmployeeId] : undefined);
      await loadData();
      setMaintenanceMessage(tAdmin("节假日配置已保存，并已重算当月考勤与薪资"));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : tAdmin("节假日配置保存失败"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="h-full min-h-0 flex flex-col gap-6 animate-fade-in">
      <section className="shrink-0 space-y-4">
        {/* 考勤页头部改成紧凑工具栏：去掉标题与表单式 label，保留最小必要的占位符/按钮文案来表达筛选语义。 */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200/80 p-4 flex flex-col gap-3 text-sm">
          <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <div className="w-full sm:w-72">
            {/* 员工筛选改为远程搜索：默认不预取员工列表，只有输入关键词后才请求无分页搜索接口，真正生效的仍是选中的 employeeId。 */}
            <SearchableSelect
              key={filterSelectResetKey}
              value={String(selectedEmployeeId)}
              options={employeeFilterOptions}
              onChange={(nextValue) => {
                if (nextValue === "all") {
                  setSelectedEmployeeId("all");
                  setSelectedFilterEmployee(null);
                  return;
                }
                const employee = mergeUniqueEmployees([selectedFilterEmployee, ...employeeFilterSearchResults])
                  .find((item) => String(item.id) === nextValue) || null;
                setSelectedEmployeeId(Number(nextValue));
                setSelectedFilterEmployee(employee);
              }}
              onQueryChange={(query) => void runEmployeeSearch(query, "filter")}
              loading={employeeFilterLoading}
              placeholder={tAdmin("员工")}
              searchPlaceholder={tAdmin("搜索员工")}
              emptyText={tAdmin("没有匹配的员工")}
              className="w-full sm:w-72"
            />
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <YearMonthPicker
                value={selectedMonth}
                onChange={(value) => {
                  setSelectedMonth(value);
                  if (selectedDate && !selectedDate.startsWith(value)) {
                    setSelectedDate("");
                  }
                }}
                availableMonths={[selectedMonth, getDefaultMonth()]}
                className="w-full"
              />
              <select
                value={selectedDay}
                onChange={(event) => {
                  const nextDay = event.target.value;
                  setSelectedDate(nextDay ? `${selectedMonth}-${nextDay}` : "");
                }}
                aria-label={tAdmin("日期")}
                className="h-[38px] w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-brand-500 sm:max-w-[120px]"
              >
                <option value="">{tAdmin("日期")}</option>
                {selectedMonthDayOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setSelectedDate("")}
                disabled={!selectedDate}
                className="inline-flex h-[34px] items-center justify-center whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 sm:self-stretch"
              >
                {tAdmin("清除")}
              </button>
          </div>

            <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 select-none">
                <input
                  type="checkbox"
                  checked={resignedOnly}
                  onChange={(event) => setResignedOnly(event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                <span>{tAdmin("只看离职人员")}</span>
            </label>
            </div>
              <div className="flex w-full flex-wrap gap-2 xl:justify-end">
                {showRefreshing ? (
                  <span className="inline-flex h-[38px] items-center rounded-lg border border-brand-100 bg-brand-50 px-3 text-xs font-semibold text-brand-700">
                    {tAdmin("刷新中")}
                  </span>
                ) : null}
                {isFiltered ? (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="inline-flex h-[34px] items-center justify-center rounded-lg border border-red-200 bg-red-50 px-3 text-xs font-semibold text-red-600 transition hover:bg-red-100"
                  >
                    {tAdmin("清除")}
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => {
                    setLastLoadedAt(0);
                    void loadData();
                  }}
                  disabled={loading}
                  className="inline-flex h-[34px] items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
                  title={tAdmin("按当前筛选条件刷新列表")}
                >
                  <RefreshCw className="w-4 h-4" />{loading ? tAdmin("刷新中") : tAdmin("刷新")}
                </button>
              </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{tAdmin("当前结果")}</div>
            <div className="mt-2 text-2xl font-bold text-slate-900">{displayedCalculations.length}</div>
            <div className="mt-1 text-xs text-slate-500">{tAdmin("当前页已加载记录")}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{tAdmin("已选记录")}</div>
            <div className="mt-2 text-2xl font-bold text-slate-900">{selectedIds.size}</div>
            <div className="mt-1 text-xs text-slate-500">{tAdmin("用于批量查看与后续操作")}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{tAdmin("筛选月份")}</div>
            <div className="mt-2 text-2xl font-bold text-slate-900">{selectedMonth}</div>
            <div className="mt-1 text-xs text-slate-500">{selectedDate ? tAdmin("已定位到 {{date}}", { date: selectedDate }) : tAdmin("当前查看整月结果")}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{tAdmin("全部记录")}</div>
            <div className="mt-2 text-2xl font-bold text-slate-900">{total}</div>
            <div className="mt-1 text-xs text-slate-500">{isFiltered ? tAdmin("当前处于筛选视图") : tAdmin("当前未启用筛选")}</div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="text-xs text-slate-400">{tAdmin("当前月份：{{month}} · 共 {{total}} 条记录", { month: selectedMonth, total })}</div>
          <div className="flex flex-wrap gap-2 xl:justify-end">
            <button
              type="button"
              onClick={() => setIsMaintenanceConfirmOpen(true)}
              disabled={submitting}
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-60"
              title={tAdmin("结算前一天考勤，并生成今天考勤底稿")}
            >
              <RefreshCw className="w-4 h-4" />{submitting ? tAdmin("更新考勤中...") : tAdmin("更新考勤")}
            </button>
            <button
              type="button"
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-brand-700"
              title={tAdmin("选择日期、员工、上下班时间新增一条考勤记录")}
            >
              <Plus className="w-4 h-4" />{tAdmin("新增考勤")}
            </button>
            <button
              type="button"
              onClick={() => { void handleExportCSV(); }}
              disabled={isExporting}
              className="inline-flex items-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-xs font-semibold text-brand-700 transition hover:bg-brand-100 disabled:cursor-not-allowed disabled:opacity-60"
              title={tAdmin("按当前筛选条件导出全部数据为 CSV 文件")}
            >
              <Download className="w-4 h-4" />{isExporting ? tAdmin("导出中...") : tAdmin("导出")}
            </button>
            <button
              type="button"
              onClick={() => {
                if (!configForm) {
                  return;
                }
                setHolidayDatesText(formatHolidayDatesInput(configForm.holidayDates));
                setIsHolidaySettingsOpen(true);
              }}
              disabled={!configForm}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
            >
              <Settings className="w-4 h-4" />{tAdmin("节假日")}
            </button>
            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              <Settings className="w-4 h-4" />{tAdmin("设置规则")}
            </button>
          </div>
        </div>
      </section>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {maintenanceMessage && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{maintenanceMessage}</div>}

      <div className="glass-panel rounded-xl shadow-sm overflow-hidden min-h-0 flex flex-1 flex-col">
        <div className="p-4 border-b border-slate-100 bg-white flex justify-between items-center">
          <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
            <span>{tAdmin("考勤明细与自动计算")}</span>
            {showRefreshing ? (
              <span className="text-xs bg-brand-50 text-brand-700 px-2 py-0.5 rounded-full font-normal border border-brand-100">{tAdmin("刷新中")}</span>
            ) : null}
            {isFiltered && (
              <span className="text-xs bg-brand-50 text-brand-700 px-2 py-0.5 rounded-full font-normal border border-brand-100 animate-pulse">{tAdmin("已启用筛选")}</span>
            )}
          </h3>
          <div className="text-xs text-slate-400">{tAdmin("明细区只保留列表状态提示，实际操作入口已上移到业务动作层")}</div>
        </div>

        <div className="min-h-0 flex-1 overflow-x-auto overflow-y-auto relative">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-slate-500 text-xs uppercase border-b border-slate-100">
                <th className="sticky top-0 bg-white z-10 px-3 py-3 text-center w-10 border-b border-slate-100">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={(event) => toggleSelectAll(event.target.checked)}
                    className="w-4 h-4 accent-brand-600 cursor-pointer"
                  />
                </th>
                <th className="sticky top-0 bg-white z-10 px-3 py-3 font-medium text-left border-b border-slate-100">{tAdmin("日期")}</th>
                <th className="sticky top-0 bg-white z-10 px-3 py-3 font-medium text-left border-b border-slate-100">{tAdmin("员工")}</th>
                <th className="sticky top-0 bg-white z-10 px-3 py-3 font-medium text-center border-b border-slate-100">{tAdmin("上班状态")}</th>
                <th className="sticky top-0 bg-white z-10 px-3 py-3 font-medium text-center border-b border-slate-100">{tAdmin("上班")}</th>
                <th className="sticky top-0 bg-white z-10 px-3 py-3 font-medium text-center border-b border-slate-100">{tAdmin("下班")}</th>
                <th className="sticky top-0 bg-white z-10 px-3 py-3 font-medium text-center border-b border-slate-100">{tAdmin("有效工时")}</th>
                <th className="sticky top-0 bg-white z-10 px-3 py-3 font-medium text-center text-blue-600 border-b border-slate-100">{tAdmin("加班时长")}</th>
                <th className="sticky top-0 bg-white z-10 px-3 py-3 font-medium text-right text-slate-600 border-b border-slate-100">{tAdmin("上班费用")}</th>
                <th className="sticky top-0 bg-white z-10 px-3 py-3 font-medium text-right text-amber-600 border-b border-slate-100">{tAdmin("餐补费用")}</th>
                <th className="sticky top-0 bg-white z-10 px-3 py-3 font-medium text-right text-green-600 border-b border-slate-100">{tAdmin("加班费用")}</th>
                <th className="sticky top-0 bg-white z-10 px-3 py-3 font-medium text-right text-amber-600 border-b border-slate-100">{tAdmin("服务费")}</th>
                <th className="sticky top-0 bg-white z-10 px-3 py-3 font-medium text-right text-blue-700 border-b border-slate-100">{tAdmin("合计费用")}</th>
                <th className="sticky top-0 bg-white z-10 px-3 py-3 font-medium text-center border-b border-slate-100">{tAdmin("操作")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayedCalculations.length === 0 ? (
                <tr>
                  <td colSpan={14} className="px-6 py-12 text-center text-slate-400 text-sm">{tAdmin("没有找到符合筛选条件的考勤记录")}</td>
                </tr>
              ) : displayedCalculations.map((item) => {
                const statusMeta = getStatusMeta(item);
                const isNonWorkingStatus = ["pending", "absent", "leave", "sick_leave"].includes(item.status);
                const isFixedSalaryEmployee = item.salaryType === "fixed";
                return (
                  <tr
                    key={`${item.employeeId}-${item.date}`}
                    className={cn(
                      "group hover:bg-slate-50 transition-colors border-b border-slate-100 bg-white",
                      selectedIds.has(item.id) && "selected-row"
                    )}
                  >
                    <td className="px-3 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(item.id)}
                        onChange={(event) => toggleSelect(item.id, event.target.checked)}
                        className="w-4 h-4 accent-brand-600 cursor-pointer"
                      />
                    </td>
                    <td className="px-3 py-3 text-sm text-slate-500 font-mono text-left">{item.date}</td>
                    <td className="relative px-3 py-3">
                      {item.employeeStatus === "resigned" ? (
                        <span className="absolute right-3 top-2 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-600 ring-1 ring-rose-100">
                          {tAdmin("离职")}
                        </span>
                      ) : null}
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold overflow-hidden border-2 border-white shadow-sm flex-shrink-0">
                          {item.employeePhoto ? (
                            <img src={item.employeePhoto} className="w-full h-full object-cover" alt="" />
                          ) : (
                            <span style={{ fontSize: "14.4px" }}>{item.employeeName.charAt(0)}</span>
                          )}
                        </div>
                        <div className="min-w-0 max-w-[140px] pr-10">
                          <span className="block font-medium text-slate-900 truncate">{item.employeeName}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className={cn("px-2 py-0.5 rounded text-xs font-medium", statusMeta.className)}>{statusMeta.label}</span>
                    </td>
                    <td className="px-3 py-3 text-sm text-slate-700 text-center font-mono">{isNonWorkingStatus ? "-" : item.rawInTime || "-"}</td>
                    <td className="px-3 py-3 text-sm text-slate-700 text-center font-mono">{isNonWorkingStatus ? "-" : item.rawOutTime || "-"}</td>
                    <td className="px-3 py-3 text-sm text-center">
                      {isNonWorkingStatus ? <span className="text-slate-400">-</span> : <span className="text-slate-700 font-mono">{formatDuration(item.validHours)}</span>}
                    </td>
                    <td className="px-3 py-3 text-sm text-center">
                      {isNonWorkingStatus ? <span className="text-slate-400 font-mono">0.00h</span> : <span className="font-mono font-bold text-blue-600">{formatDuration(item.overtimePayHours)}</span>}
                    </td>
                    <td className={cn("px-3 py-3 text-xs font-mono text-right", isNonWorkingStatus || isFixedSalaryEmployee ? "text-slate-400" : "text-slate-600")}>
                      {isFixedSalaryEmployee ? "-" : formatCurrency(item.workPay, item.currency)}
                    </td>
                    <td className={cn("px-3 py-3 text-xs font-mono text-right font-semibold", item.mealAllowanceAmount > 0 ? "text-amber-600" : "text-slate-400")}>{formatCurrency(item.mealAllowanceAmount, item.currency)}</td>
                    <td className={cn("px-3 py-3 text-xs font-mono text-right font-semibold", isNonWorkingStatus ? "text-slate-400" : "text-green-600")}>{formatCurrency(item.overtimePay, item.currency)}</td>
                    <td className={cn("px-3 py-3 text-xs font-mono text-right font-semibold", isFixedSalaryEmployee || item.serviceFeeAmount <= 0 ? "text-slate-400" : "text-amber-600")}>
                      {isFixedSalaryEmployee ? "-" : formatCurrency(item.serviceFeeAmount, item.currency)}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span className={cn("text-sm font-bold font-mono", isNonWorkingStatus || isFixedSalaryEmployee ? "text-slate-400" : "text-blue-800")}>
                        {isFixedSalaryEmployee ? "-" : formatCurrency(getAttendanceTotalPayWithService(item), item.currency)}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center whitespace-nowrap">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => void handleOpenDetail(item)}
                          className="px-2.5 py-1 bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-800 text-xs font-semibold rounded-lg transition inline-flex items-center gap-1 border border-slate-200"
                          title={tAdmin("查看该员工当天打卡时间、位置和备注")}
                        >
                          <Eye className="w-3 h-3" />
                          <span>{tAdmin("详情")}</span>
                        </button>
                        {item.employeeStatus === "resigned" ? null : (
                          <button
                            type="button"
                            onClick={() => void handleOpenAdjustment(item)}
                            className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 hover:text-indigo-700 text-xs font-semibold rounded-lg transition inline-flex items-center gap-1 border border-indigo-100"
                            title={tAdmin("手动补签/调整该员工当天的考勤记录")}
                          >
                            <Edit className="w-3 h-3" />
                            <span>{tAdmin("调整")}</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="shrink-0 space-y-3 text-sm">
        <Pagination
          page={page}
          pageSize={pageSize}
          total={total}
          itemName={tAdmin("条考勤")}
          disabled={loading}
          onPageChange={setPage}
        />
        {/* 用户要求移除考勤计算底部说明条；这里只保留分页摘要，避免重复占用表格下方空间。 */}
      </div>

      <Modal
        isOpen={isMaintenanceConfirmOpen}
        title={tAdmin("确认更新考勤")}
        onClose={() => {
          if (!submitting) {
            setIsMaintenanceConfirmOpen(false);
          }
        }}
        className="max-w-md"
        footer={(
          <div className="flex justify-end gap-3">
            <button
              type="button"
              disabled={submitting}
              onClick={() => setIsMaintenanceConfirmOpen(false)}
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 disabled:opacity-60"
            >{tAdmin("取消")}</button>
            <button
              type="button"
              disabled={submitting}
              onClick={() => void handleRunDailyMaintenance()}
              className="rounded-lg bg-emerald-600 px-6 py-2 text-sm text-white transition hover:bg-emerald-700 disabled:opacity-60"
            >{submitting ? tAdmin("更新考勤中...") : tAdmin("确认更新")}</button>
          </div>
        )}
      >
        {/* 更新考勤是全局每日维护动作，不读取当前员工/日期筛选；确认文案必须持续说明这一边界，避免用户误操作。 */}
        <div className="space-y-3 text-sm text-slate-600">
          <p>{tAdmin("系统将结算前一天考勤，并生成今天考勤底稿。此操作不受当前筛选条件影响，是否继续？")}</p>
        </div>
      </Modal>

      <Modal
        isOpen={isCreateOpen}
        title={tAdmin("新增考勤记录")}
        onClose={() => setIsCreateOpen(false)}
        footer={(
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setIsCreateOpen(false)} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100">{tAdmin("取消")}</button>
            <button type="submit" form="attendance-create-form" disabled={submitting} className="rounded-lg bg-brand-600 px-6 py-2 text-sm text-white transition hover:bg-brand-700 disabled:opacity-60">
              {submitting ? tAdmin("保存中...") : tAdmin("新增并重算")}
            </button>
          </div>
        )}
      >
        <form id="attendance-create-form" onSubmit={handleSaveCreate} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label={tAdmin("日期")}><input type="date" required max={getDefaultDate()} value={createForm.date} onChange={(event) => setCreateForm((prev) => ({ ...prev, date: event.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500" /></Field>
            <Field label={tAdmin("员工")}>
              <SearchableSelect
                value={createForm.employeeId}
                options={createEmployeeOptions}
                onChange={(nextValue) => {
                  const employee = mergeUniqueEmployees([selectedCreateEmployee, ...createEmployeeSearchResults])
                    .find((item) => String(item.id) === nextValue) || null;
                  setCreateForm((prev) => ({ ...prev, employeeId: nextValue }));
                  setSelectedCreateEmployee(employee);
                }}
                onQueryChange={(query) => void runEmployeeSearch(query, "create")}
                loading={createEmployeeLoading}
                placeholder={tAdmin("请选择员工")}
                searchPlaceholder={tAdmin("输入姓名、昵称、工号后搜索")}
                emptyText={tAdmin("没有匹配的员工")}
              />
            </Field>
            {selectedCreateEmployee ? (
              <div className="md:col-span-2 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border-2 border-white bg-slate-200 shadow-sm flex items-center justify-center text-sm font-bold text-slate-600">
                  {(avatarMap[selectedCreateEmployee.id] ?? selectedCreateEmployee.photo) ? (
                    <img src={avatarMap[selectedCreateEmployee.id] ?? selectedCreateEmployee.photo ?? ""} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span>{selectedCreateEmployee.name.charAt(0)}</span>
                  )}
                </div>
                <div className="min-w-0">
                  {/* 新增补卡时要给用户明确二次确认选中的员工，姓名必须按姓名(昵称)展示，避免同名员工误录考勤。 */}
                  <p className="truncate text-sm font-semibold text-slate-800">{formatEmployeeDisplayName(selectedCreateEmployee)}</p>
                  <p className="truncate text-xs text-slate-500">{selectedCreateEmployee.dept || tAdmin("未分配")} · {selectedCreateEmployee.role || tAdmin("未设置职位")}</p>
                </div>
              </div>
            ) : null}
            <Field label={tAdmin("考勤类型")}>
              <select
                required
                value={createForm.type}
                onChange={(event) => {
                  const nextType = event.target.value as AttendanceRecordUpdatePayload["type"] | "";
                  setCreateForm((prev) => {
                    if (!nextType) {
                      return { ...prev, type: "", inTime: "", outTime: "" };
                    }
                    const defaults = getCreateDefaultTimes();
                    return {
                      ...prev,
                      type: nextType,
                      inTime: defaults.inTime,
                      outTime: defaults.outTime
                    };
                  });
                }}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="">{tAdmin("请选择考勤类型")}</option>
                <option value="normal">{tAdmin("全勤")}</option>
                <option value="late">{tAdmin("迟到")}</option>
                <option value="early">{tAdmin("早退")}</option>
                <option value="absent">{tAdmin("缺勤")}</option>
                <option value="leave">{tAdmin("假期")}</option>
                <option value="sick_leave">{tAdmin("病假")}</option>
                <option value="overtime">{tAdmin("加班")}</option>
              </select>
            </Field>
            <div className="hidden md:block" />
            <Field label={tAdmin("上班时间")}><input type="time" value={createForm.inTime} onChange={(event) => setCreateForm((prev) => ({ ...prev, inTime: event.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500" /></Field>
            <Field label={tAdmin("下班时间")}><input type="time" value={createForm.outTime} onChange={(event) => setCreateForm((prev) => ({ ...prev, outTime: event.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500" /></Field>
          </div>
          <Field label={tAdmin("备注")}><textarea value={createForm.note} onChange={(event) => setCreateForm((prev) => ({ ...prev, note: event.target.value }))} rows={3} className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500" /></Field>
          <div className="rounded-lg border border-brand-100 bg-brand-50 px-4 py-3 text-sm text-brand-700">{tAdmin("新增后会立即按当前全局规则重算该员工当天和所在月份；如果已有同员工同日期记录，会覆盖为本次填写内容。")}</div>
        </form>
      </Modal>

      <Modal
        isOpen={isAdjustmentOpen}
        title={adjustingResult?.attendanceRecordId ? tAdmin("调整原始考勤记录") : tAdmin("新增补卡记录")}
        onClose={() => setIsAdjustmentOpen(false)}
        footer={(
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setIsAdjustmentOpen(false)} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100">{tAdmin("取消")}</button>
            <button type="submit" form="attendance-adjust-form" disabled={submitting || adjustmentLoading} className="rounded-lg bg-brand-600 px-6 py-2 text-sm text-white transition hover:bg-brand-700 disabled:opacity-60">
              {submitting ? tAdmin("保存中...") : tAdmin("保存并重算")}
            </button>
          </div>
        )}
      >
        <form id="attendance-adjust-form" onSubmit={handleSaveAdjustment} className="space-y-4">
          {adjustmentLoading ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
              {tAdmin("请稍候，正在准备弹窗内容")}
            </div>
          ) : null}
          {(() => {
            const isHourlyEmployee = adjustingResult?.salaryType === "hourly";
            const useEmployeeRule = Boolean(adjustForm.employeeOvertimeRuleEnabled ?? configForm?.overtimeRuleEnabled);
            const disableEmployeeOtFeeInput = isHourlyEmployee && useEmployeeRule;
            return (
              <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label={tAdmin("日期")}><input type="date" max={getDefaultDate()} value={adjustForm.date} onChange={(event) => setAdjustForm((prev) => ({ ...prev, date: event.target.value }))} disabled={adjustmentLoading} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400" /></Field>
            <Field label={tAdmin("考勤类型")}>
              <select value={adjustForm.type} onChange={(event) => setAdjustForm((prev) => applyDefaultTimeWhenNormal(prev, event.target.value as AttendanceRecordUpdatePayload["type"] | ""))} disabled={adjustmentLoading} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400">
                <option value="">{tAdmin("请选择考勤类型")}</option>
                <option value="normal">{tAdmin("全勤")}</option>
                <option value="late">{tAdmin("迟到")}</option>
                <option value="early">{tAdmin("早退")}</option>
                <option value="absent">{tAdmin("缺勤")}</option>
                <option value="leave">{tAdmin("假期")}</option>
                <option value="sick_leave">{tAdmin("病假")}</option>
                <option value="overtime">{tAdmin("加班")}</option>
              </select>
            </Field>
            <Field label={tAdmin("上班时间")}><input type="time" value={adjustForm.inTime || ""} onChange={(event) => setAdjustForm((prev) => ({ ...prev, inTime: event.target.value || null }))} disabled={adjustmentLoading} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400" /></Field>
            <Field label={tAdmin("下班时间")}><input type="time" value={adjustForm.outTime || ""} onChange={(event) => setAdjustForm((prev) => ({ ...prev, outTime: event.target.value || null }))} disabled={adjustmentLoading} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400" /></Field>
            <Field label={tAdmin("员工加班费（{{currency}}/小时）", { currency: adjustingResult?.currency || "THB" })}>
              <input
                type="number"
                min="0"
                step="0.01"
                value={adjustForm.employeeOvertimeHourlyFee ?? ""}
                onChange={(event) => setAdjustForm((prev) => ({ ...prev, employeeOvertimeHourlyFee: event.target.value === "" ? "" : Number(event.target.value) }))}
                placeholder={disableEmployeeOtFeeInput ? tAdmin("启用倍率后按时薪自动计算") : tAdmin("留空则使用系统默认")}
                disabled={disableEmployeeOtFeeInput || adjustmentLoading}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
              />
            </Field>
            <Field label={tAdmin("员工是否启用倍率规则")}>
              <div className="flex items-center gap-6 rounded-lg border border-slate-300 bg-white px-3 py-2">
                <label className={cn(
                  "flex items-center gap-2 text-sm transition",
                  !Boolean(adjustForm.employeeOvertimeRuleEnabled ?? configForm?.overtimeRuleEnabled)
                    ? "text-brand-700"
                    : "text-slate-700"
                )}>
                  <input
                    type="radio"
                    name="employeeOvertimeRuleEnabled"
                    checked={!Boolean(adjustForm.employeeOvertimeRuleEnabled ?? configForm?.overtimeRuleEnabled)}
                    onChange={() => setAdjustForm((prev) => ({
                      ...prev,
                      employeeOvertimeRuleEnabled: false
                    }))}
                    disabled={adjustmentLoading}
                    className="h-4 w-4 accent-brand-600"
                  />
                  <span className="leading-tight">{tAdmin("否")}</span>
                </label>
                <label className={cn(
                  "flex items-center gap-2 text-sm transition",
                  Boolean(adjustForm.employeeOvertimeRuleEnabled ?? configForm?.overtimeRuleEnabled)
                    ? "text-brand-700"
                    : "text-slate-700"
                )}>
                  <input
                    type="radio"
                    name="employeeOvertimeRuleEnabled"
                    checked={Boolean(adjustForm.employeeOvertimeRuleEnabled ?? configForm?.overtimeRuleEnabled)}
                    onChange={() => setAdjustForm((prev) => ({
                      ...prev,
                      employeeOvertimeRuleEnabled: true
                    }))}
                    disabled={adjustmentLoading}
                    className="h-4 w-4 accent-brand-600"
                  />
                  <span className="leading-tight">{tAdmin("是")}</span>
                </label>
              </div>
            </Field>
          </div>
          <Field label={tAdmin("调整备注")}><textarea value={adjustForm.note} onChange={(event) => setAdjustForm((prev) => ({ ...prev, note: event.target.value }))} rows={3} disabled={adjustmentLoading} className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400" /></Field>
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {disableEmployeeOtFeeInput
              ? tAdmin("当前员工是时薪制，并且已启用倍率规则，所以加班费会直接按员工时薪计算，不能单独输入。保存后会更新该员工配置，并重算受影响的考勤与薪资。")
              : tAdmin("这里编辑的是这个员工自己的加班配置，不是当前单条考勤的临时值。保存后会更新该员工的加班费和倍率规则，并重算受影响的考勤与薪资。")}
          </div>
              </>
            );
          })()}
        </form>
      </Modal>

      <Modal
        isOpen={isDetailOpen}
        title={tAdmin("考勤详情")}
        onClose={() => setIsDetailOpen(false)}
        className="max-w-2xl"
        footer={(
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setIsDetailOpen(false)} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100">{tAdmin("关闭")}</button>
          </div>
        )}
      >
        {(() => {
          const activeResult = detailResult;
          const activeRecord = detailRecord;
          const inTime = activeRecord?.inTime || activeResult?.rawInTime || null;
          const outTime = activeRecord?.outTime || activeResult?.rawOutTime || null;
          const source = activeRecord?.source || activeResult?.source || null;
          const note = activeRecord?.note || activeResult?.note || "";
          const location = extractAttendanceLocation(note);
          const remark = stripAttendanceLocationNote(note);

          if (!activeResult) {
            return <div className="py-8 text-center text-sm text-slate-500">{tAdmin("暂无可展示的考勤详情")}</div>;
          }

          return (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-semibold text-slate-900">{activeResult.employeeName}</span>
                  <span className="rounded-full bg-white px-2 py-0.5 text-xs text-slate-500 ring-1 ring-slate-200">{activeResult.date}</span>
                  {activeResult.employeeStatus === "resigned" ? (
                    <span className="rounded-full bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-600 ring-1 ring-rose-100">{tAdmin("离职")}</span>
                  ) : null}
                </div>
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  {tAdmin("这里展示的是该员工当天原始打卡记录；如果当天没有独立原始记录，则回退显示当前考勤计算结果里的时间和备注。")}
                </p>
              </div>

              {detailLoading ? (
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                  {tAdmin("请稍候，正在加载考勤详情")}
                </div>
              ) : null}
              {detailError ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  {detailError}
                </div>
              ) : null}

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field label={tAdmin("上班打卡时间")}>
                  <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-mono text-slate-700">{inTime || "-"}</div>
                </Field>
                <Field label={tAdmin("下班打卡时间")}>
                  <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-mono text-slate-700">{outTime || "-"}</div>
                </Field>
                <Field label={tAdmin("打卡来源")}>
                  <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">{source || "-"}</div>
                </Field>
                <Field label={tAdmin("打卡位置")}>
                  <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 break-words">{location || tAdmin("暂无位置记录")}</div>
                </Field>
              </div>

              <Field label={tAdmin("备注")}>
                <div className="min-h-[96px] whitespace-pre-wrap rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm leading-6 text-slate-700">{remark || tAdmin("无")}</div>
              </Field>
            </div>
          );
        })()}
      </Modal>

      <Modal
        isOpen={isSettingsOpen}
        title={tAdmin("考勤与加班规则设置")}
        onClose={() => setIsSettingsOpen(false)}
        footer={(
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setIsSettingsOpen(false)} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100">{tAdmin("取消")}</button>
            <button type="submit" form="attendance-config-form" disabled={submitting || !configForm} className="rounded-lg bg-brand-600 px-6 py-2 text-sm text-white transition hover:bg-brand-700 disabled:opacity-60">
              {submitting ? tAdmin("保存中...") : tAdmin("保存规则")}
            </button>
          </div>
        )}
      >
        {configForm ? (
          <form id="attendance-config-form" onSubmit={handleSaveConfig} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label={tAdmin("上班时间")}><input type="time" value={configForm.startShift} onChange={(event) => setConfigForm((prev) => prev ? { ...prev, startShift: event.target.value } : prev)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500" /></Field>
              <Field label={tAdmin("下班时间")}><input type="time" value={configForm.endShift} onChange={(event) => setConfigForm((prev) => prev ? { ...prev, endShift: event.target.value } : prev)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500" /></Field>
              <Field label={tAdmin("休息开始")}><input type="time" value={configForm.breakStart} onChange={(event) => setConfigForm((prev) => prev ? { ...prev, breakStart: event.target.value } : prev)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500" /></Field>
              <Field label={tAdmin("休息结束")}><input type="time" value={configForm.breakEnd} onChange={(event) => setConfigForm((prev) => prev ? { ...prev, breakEnd: event.target.value } : prev)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500" /></Field>
              <Field label={tAdmin("标准工时")}><input type="number" min="0" step="0.25" value={configForm.standardHours} onChange={(event) => setConfigForm((prev) => prev ? { ...prev, standardHours: Number(event.target.value) } : prev)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500" /></Field>
              <Field label={tAdmin("加班费标准（{{currency}}/小时）", { currency: configForm.currency || "THB" })}><input type="number" min="0" step="0.01" value={configForm.otHourlyFee} onChange={(event) => setConfigForm((prev) => prev ? { ...prev, otHourlyFee: Number(event.target.value) } : prev)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500" /></Field>
              <Field label={tAdmin("是否启用加班规则计算")}>
                <div className="space-y-2">
                  <div className="flex items-center gap-6 rounded-lg border border-slate-300 bg-white px-3 py-2">
                    <label className={cn(
                      "flex items-center gap-2 text-sm transition",
                      !configForm.overtimeRuleEnabled ? "text-brand-700" : "text-slate-700"
                    )}>
                      <input
                        type="radio"
                        name="overtimeRuleEnabled"
                        checked={!configForm.overtimeRuleEnabled}
                        onChange={() => setConfigForm((prev) => prev ? { ...prev, overtimeRuleEnabled: false } : prev)}
                        className="h-4 w-4 accent-brand-600"
                      />
                      <span className="leading-tight">{tAdmin("否")}</span>
                    </label>
                    <label className={cn(
                      "flex items-center gap-2 text-sm transition",
                      configForm.overtimeRuleEnabled ? "text-brand-700" : "text-slate-700"
                    )}>
                      <input
                        type="radio"
                        name="overtimeRuleEnabled"
                        checked={configForm.overtimeRuleEnabled}
                        onChange={() => setConfigForm((prev) => prev ? { ...prev, overtimeRuleEnabled: true } : prev)}
                        className="h-4 w-4 accent-brand-600"
                      />
                      <span className="leading-tight">{tAdmin("是")}</span>
                    </label>
                  </div>
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
                    {tAdmin("提醒：开启后，时薪员工按正常时薪套工作日 1.5 倍、周末 2 倍、节假日 3 倍；固定薪资员工按加班费基数套同样倍率。")}
                  </div>
                </div>
              </Field>
              <Field label={tAdmin("加班费币种")}>
                <select value={configForm.currency || "THB"} onChange={(event) => setConfigForm((prev) => prev ? { ...prev, currency: event.target.value as AppConfig["currency"] } : prev)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500">
                  <option value="THB">{tAdmin("THB - 泰铢")}</option>
                  <option value="USD">{tAdmin("USD - 美元")}</option>
                  <option value="MYR">{tAdmin("MYR - 马币")}</option>
                  <option value="IDR">{tAdmin("IDR - 印尼盾")}</option>
                </select>
              </Field>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              {tAdmin("保存后将自动刷新当前月份的考勤结果。关闭规则时，加班时间统一按你填写的加班费计算；开启规则后，时薪员工按正常时薪的工作日 1.5 倍、周末 2 倍、节假日 3 倍计算，固定薪资员工按上方加班费基数套用同样倍率。")}
            </div>
          </form>
        ) : (
          <div className="py-8 text-center text-sm text-slate-500">{tAdmin("正在加载考勤规则配置...")}</div>
        )}
      </Modal>

      <Modal
        isOpen={isHolidaySettingsOpen}
        title={tAdmin("节假日管理")}
        onClose={() => setIsHolidaySettingsOpen(false)}
        className="max-w-xl"
        footer={(
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setIsHolidaySettingsOpen(false)} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100">{tAdmin("取消")}</button>
            <button type="submit" form="attendance-holiday-form" disabled={submitting} className="rounded-lg bg-brand-600 px-6 py-2 text-sm text-white transition hover:bg-brand-700 disabled:opacity-60">
              {submitting ? tAdmin("保存中...") : tAdmin("保存并重算薪资")}
            </button>
          </div>
        )}
      >
        <form id="attendance-holiday-form" onSubmit={handleSaveHolidaySettings} className="space-y-4">
          <Field label={tAdmin("节假日日期")}>
            <textarea
              value={holidayDatesText}
              onChange={(event) => setHolidayDatesText(event.target.value)}
              rows={8}
              placeholder={"2026-01-01\n2026-04-13"}
              className="w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500"
            />
          </Field>
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {tAdmin("请按每行一个 YYYY-MM-DD 填写。保存后会按当前筛选月份重算考勤，并同步重算薪资结果。")}
          </div>
        </form>
      </Modal>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-slate-500 mb-1 uppercase">{label}</span>
      {children}
    </label>
  );
}
