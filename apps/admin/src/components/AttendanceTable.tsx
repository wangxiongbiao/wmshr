/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { type FormEvent, type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { tAdmin } from "../lib/i18nText";
import { Download, Edit, Plus, RefreshCw, Settings } from "lucide-react";
import type {
  AppConfig,
  AttendanceCalculationResult,
  AttendanceRecordUpdatePayload,
  Employee
} from "../types";
import {
  createAttendanceRecord,
  fetchAttendanceCalculationDetail,
  fetchAttendanceCalculations,
  fetchAttendanceConfig,
  recalculateMonthlyAttendance,
  runAttendanceDailyMaintenance,
  updateAttendanceConfig,
  updateAttendanceRecord
} from "../lib/api";
import { ModalShell } from "./ModalShell";
import { cn, formatCurrency as formatPayrollCurrency, formatDuration } from "../lib/utils";
import { Pagination } from "./Pagination";
import { SearchableSelect } from "./SearchableSelect";

interface AttendanceTableProps {
  employees: Employee[];
  isActive: boolean;
}

type CreateAttendanceForm = Omit<AttendanceRecordUpdatePayload, "type"> & {
  employeeId: string;
  // 新增考勤记录要求操作员主动选择类型；空值只存在于表单层，提交前必须校验并收窄为后端 AttendanceType。
  type: AttendanceRecordUpdatePayload["type"] | "";
};

const DEFAULT_CREATE_IN_TIME = "08:30";
const DEFAULT_CREATE_OUT_TIME = "17:30";

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
  return new Date().toISOString().slice(0, 10);
}

function getDefaultMonth() {
  return new Date().toISOString().slice(0, 7);
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

export function AttendanceTable({ employees, isActive }: AttendanceTableProps) {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | "all">("all");
  const [timeFilterType, setTimeFilterType] = useState<"all" | "day" | "month">("all");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [calculations, setCalculations] = useState<AttendanceCalculationResult[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [configForm, setConfigForm] = useState<AppConfig | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAdjustmentOpen, setIsAdjustmentOpen] = useState(false);
  const [isMaintenanceConfirmOpen, setIsMaintenanceConfirmOpen] = useState(false);
  const [adjustingResult, setAdjustingResult] = useState<AttendanceCalculationResult | null>(null);
  const [createForm, setCreateForm] = useState<CreateAttendanceForm>({
    employeeId: "",
    date: getDefaultDate(),
    type: "",
    inTime: DEFAULT_CREATE_IN_TIME,
    outTime: DEFAULT_CREATE_OUT_TIME,
    note: ""
  });
  const [adjustForm, setAdjustForm] = useState<AttendanceRecordUpdatePayload>({
    date: "",
    type: "normal",
    inTime: null,
    outTime: null,
    note: ""
  });
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState("");
  const [error, setError] = useState("");
  const loadRequestIdRef = useRef(0);

  const isFiltered = selectedEmployeeId !== "all" || timeFilterType !== "all";
  const selectedCreateEmployee = useMemo(() => {
    const employeeId = Number(createForm.employeeId);
    return employees.find((employee) => Number(employee.id) === employeeId) || null;
  }, [createForm.employeeId, employees]);
  const employeeFilterOptions = useMemo(() => {
    return [
      {
        value: "all",
        label: tAdmin("所有员工 (全部)"),
        description: tAdmin("不过滤员工")
      },
      ...employees.map((employee) => ({
        value: String(employee.id),
        label: formatEmployeeDisplayName(employee),
        description: [employee.employeeNo, employee.role].filter(Boolean).join(" · "),
        keywords: [employee.name, employee.nickname, employee.employeeNo, employee.role, employee.dept]
      }))
    ];
  }, [employees]);

  const loadData = async () => {
    const requestId = ++loadRequestIdRef.current;
    const effectiveDate = timeFilterType === "day" ? selectedDate : undefined;
    const effectiveMonth = timeFilterType === "month" ? selectedMonth : effectiveDate?.slice(0, 7);

    setLoading(true);
    setError("");
    try {
      const nextRows = await fetchAttendanceCalculations({
        yearMonth: effectiveMonth,
        date: effectiveDate,
        employeeId: selectedEmployeeId === "all" ? null : selectedEmployeeId
      });
      if (requestId !== loadRequestIdRef.current) {
        return;
      }
      setCalculations(nextRows);
      setSelectedIds(new Set());
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

    // 考勤页被缓存后切回来时需要按当前筛选条件后台重拉数据，但不能先清空表格主体。
    void loadData();
  }, [isActive, selectedDate, selectedEmployeeId, selectedMonth, timeFilterType]);

  useEffect(() => {
    void fetchAttendanceConfig()
      .then((nextConfig) => {
        setConfigForm(nextConfig);
      })
      .catch((nextError) => setError(nextError instanceof Error ? nextError.message : tAdmin("考勤规则配置加载失败")));
  }, []);

  const sortedRows = useMemo(() => {
    return [...calculations].sort((a, b) => {
      if (a.date !== b.date) return b.date.localeCompare(a.date);
      return a.employeeName.localeCompare(b.employeeName);
    });
  }, [calculations]);

  useEffect(() => {
    // 后端筛选条件变化会刷新 calculations；分页回到第一页，避免旧页码切到空白表格。
    setPage(1);
  }, [calculations]);

  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedRows.slice(start, start + pageSize);
  }, [page, sortedRows]);
  const showRefreshing = loading && calculations.length > 0;

  const isAllSelected = paginatedRows.length > 0 && paginatedRows.every((row) => selectedIds.has(row.id));

  const toggleSelectAll = (checked: boolean) => {
    setSelectedIds(checked ? new Set(paginatedRows.map((row) => row.id)) : new Set());
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
    setTimeFilterType("all");
    setSelectedDate("");
    setSelectedMonth("");
  };

  const handleTimeFilterChange = (nextType: "all" | "day" | "month") => {
    setTimeFilterType(nextType);
    if (nextType === "day" && !selectedDate) {
      setSelectedDate(sortedRows[0]?.date || getDefaultDate());
    }
    if (nextType === "month" && !selectedMonth) {
      setSelectedMonth(sortedRows[0]?.date.slice(0, 7) || getDefaultMonth());
    }
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

  const handleExportCSV = () => {
    const headers = [
      tAdmin("日期"), tAdmin("员工姓名"), tAdmin("来源国家"), tAdmin("性别"), tAdmin("职位"), tAdmin("所属区域"),
      tAdmin("时薪"), tAdmin("基本日薪"), tAdmin("上班时间"), tAdmin("下班时间"), tAdmin("有效工时"), tAdmin("加班工时"),
      tAdmin("今天上班费用"), tAdmin("餐补费用"), tAdmin("加班费"), tAdmin("服务费"), tAdmin("合计费用"), tAdmin("考勤状态"), tAdmin("备注")
    ];
    const countryNames: Record<string, string> = { MM: tAdmin("缅甸"), TH: tAdmin("泰国"), CN: tAdmin("中国"), VN: tAdmin("越南"), KH: tAdmin("柬埔寨") };
    const totals = sortedRows.reduce(
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
    const rows = sortedRows.map((item) => {
      const baseDailyWage = item.fixedSalary && item.fixedSalary > 0 ? item.fixedSalary / 30 : item.standardHours * (item.hourlyRate || 0);
      const displayHourlyRate = item.fixedSalary && item.fixedSalary > 0 ? baseDailyWage / Math.max(1, item.standardHours) : item.hourlyRate || 0;
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
        formatMoneyNumber(item.workPay),
        formatMoneyNumber(item.mealAllowanceAmount),
        formatMoneyNumber(item.overtimePay),
        formatMoneyNumber(item.serviceFeeAmount),
        formatCurrency(getAttendanceTotalPayWithService(item), item.currency),
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
    // v2 导出严格使用当前表格接口返回值；这里只做 CSV 转义和 BOM，不再按旧规则在浏览器重算费用。
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
  };

  const handleOpenAdjustment = async (result: AttendanceCalculationResult) => {
    setSubmitting(true);
    setError("");
    try {
      const detail = result.attendanceRecordId ? await fetchAttendanceCalculationDetail(result.id) : null;
      setAdjustingResult(result);
      setAdjustForm({
        date: detail?.record?.date || result.date,
        type: detail?.record?.type || "normal",
        inTime: detail?.record?.inTime || result.rawInTime || null,
        outTime: detail?.record?.outTime || result.rawOutTime || null,
        note: detail?.record?.note || result.note || ""
      });
      setIsAdjustmentOpen(true);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : tAdmin("考勤记录加载失败"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveAdjustment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!adjustingResult) {
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      if (adjustingResult.attendanceRecordId) {
        await updateAttendanceRecord(adjustingResult.attendanceRecordId, adjustForm);
      } else {
        await createAttendanceRecord({ employeeId: adjustingResult.employeeId, ...adjustForm });
      }
      setIsAdjustmentOpen(false);
      await loadData();
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
      date: timeFilterType === "day" && selectedDate ? selectedDate : prev.date || getDefaultDate(),
      // 每次打开新增弹窗都清空考勤类型，要求操作员主动确认本次记录类型，避免沿用上一条补卡选择。
      type: "",
      inTime: DEFAULT_CREATE_IN_TIME,
      outTime: DEFAULT_CREATE_OUT_TIME
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
      // 新增考勤记录使用后端 upsert + 重算流程，保证列表、月汇总和薪资前置数据同步更新。
      await createAttendanceRecord({
        employeeId,
        date: createForm.date,
        type: attendanceType,
        inTime: createForm.inTime || null,
        outTime: createForm.outTime || null,
        note: createForm.note
      });
      setIsCreateOpen(false);
      await loadData();
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
      const monthToRecalculate = selectedMonth || selectedDate.slice(0, 7) || getDefaultMonth();
      await recalculateMonthlyAttendance(monthToRecalculate, selectedEmployeeId === "all" ? null : selectedEmployeeId);
      await loadData();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : tAdmin("考勤规则配置保存失败"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="h-full min-h-0 flex flex-col gap-4 animate-fade-in">
      <div className="shrink-0">
        {/* 考勤明细按固定 Header + 滚动 Content 组织：员工/时间筛选不随长表格滚走，表格区域独立滚动。 */}
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col md:flex-row gap-4 items-end md:items-center text-sm">
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">{tAdmin("筛选员工")}</label>
            {/* 员工筛选改为本地下拉搜索，只过滤候选项展示；真正的表格筛选仍然提交 employeeId，避免把模糊输入误当成生效条件。 */}
            <SearchableSelect
              value={String(selectedEmployeeId)}
              options={employeeFilterOptions}
              onChange={(nextValue) => setSelectedEmployeeId(nextValue === "all" ? "all" : Number(nextValue))}
              placeholder={tAdmin("请选择员工")}
              searchPlaceholder={tAdmin("输入姓名、昵称、工号、职位过滤")}
              emptyText={tAdmin("没有匹配的员工")}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">{tAdmin("时间筛选方式")}</label>
            <select
              value={timeFilterType}
              onChange={(event) => handleTimeFilterChange(event.target.value as "all" | "day" | "month")}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none bg-white text-slate-700 h-[38px] text-sm cursor-pointer"
            >
              <option value="all">{tAdmin("📅 全部时间")}</option>
              <option value="day">{tAdmin("📆 按天筛选")}</option>
              <option value="month">{tAdmin("🗓️ 按月筛选")}</option>
            </select>
          </div>

          {timeFilterType === "day" && (
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">{tAdmin("选择具体日期")}</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-slate-700 h-[38px] text-sm font-mono"
              />
            </div>
          )}

          {timeFilterType === "month" && (
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">{tAdmin("选择目标月份")}</label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(event) => setSelectedMonth(event.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-slate-700 h-[38px] text-sm font-mono"
              />
            </div>
          )}

          {timeFilterType === "all" && <div className="hidden sm:block" />}
        </div>

        <div className="flex gap-2 flex-shrink-0">
          {isFiltered && (
            <button
              type="button"
              onClick={resetFilters}
              className="px-3.5 py-2 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition border border-red-200"
            >{tAdmin("清除筛选条件")}</button>
          )}
        </div>
        </div>
      </div>

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
          <div className="flex gap-2 flex-wrap justify-end">
            {/* 后台只保留一个业务化维护入口；先确认再执行，避免管理员在筛选状态下误以为只会更新当前筛选范围。 */}
            <button
              type="button"
              onClick={() => setIsMaintenanceConfirmOpen(true)}
              disabled={submitting}
              className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-emerald-100 transition disabled:opacity-60 flex items-center gap-1.5"
              title={tAdmin("结算前一天考勤，并生成今天考勤底稿")}
            >
              <RefreshCw className="w-4 h-4" />{submitting ? tAdmin("更新考勤中...") : tAdmin("更新考勤")}</button>
            <button
              type="button"
              onClick={handleOpenCreate}
              className="bg-brand-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-brand-700 transition flex items-center gap-1.5"
              title={tAdmin("选择日期、员工、上下班时间新增一条考勤记录")}
            >
              <Plus className="w-4 h-4" />{tAdmin("新增考勤记录")}</button>
            <button
              type="button"
              onClick={handleExportCSV}
              className="bg-brand-50 border border-brand-200 text-brand-700 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-brand-100 transition flex items-center gap-1.5"
              title={tAdmin("导出当前表格显示的数据为 CSV 文件")}
            >
              <Download className="w-4 h-4" />{tAdmin("导出当前数据")}</button>
            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              className="bg-white border border-slate-300 text-slate-700 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-slate-50 transition flex items-center gap-1.5"
            >
              <Settings className="w-4 h-4" />{tAdmin("设置规则")}</button>
          </div>
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
              {sortedRows.length === 0 ? (
                <tr>
                  <td colSpan={14} className="px-6 py-12 text-center text-slate-400 text-sm">{tAdmin("没有找到符合筛选条件的考勤记录")}</td>
                </tr>
              ) : paginatedRows.map((item) => {
                const statusMeta = getStatusMeta(item);
                const isNonWorkingStatus = ["pending", "absent", "leave", "sick_leave"].includes(item.status);
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
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold overflow-hidden border-2 border-white shadow-sm flex-shrink-0">
                          {item.employeePhoto ? (
                            <img src={item.employeePhoto} className="w-full h-full object-cover" alt="" />
                          ) : (
                            <span style={{ fontSize: "14.4px" }}>{item.employeeName.charAt(0)}</span>
                          )}
                        </div>
                        <span className="font-medium text-slate-900 truncate max-w-[120px]">{item.employeeName}</span>
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
                    <td className={cn("px-3 py-3 text-xs font-mono text-right", isNonWorkingStatus ? "text-slate-400" : "text-slate-600")}>{formatCurrency(item.workPay, item.currency)}</td>
                    <td className={cn("px-3 py-3 text-xs font-mono text-right font-semibold", item.mealAllowanceAmount > 0 ? "text-amber-600" : "text-slate-400")}>{formatCurrency(item.mealAllowanceAmount, item.currency)}</td>
                    <td className={cn("px-3 py-3 text-xs font-mono text-right font-semibold", isNonWorkingStatus ? "text-slate-400" : "text-green-600")}>{formatCurrency(item.overtimePay, item.currency)}</td>
                    <td className={cn("px-3 py-3 text-xs font-mono text-right font-semibold", item.serviceFeeAmount > 0 ? "text-amber-600" : "text-slate-400")}>{formatCurrency(item.serviceFeeAmount, item.currency)}</td>
                    <td className="px-3 py-3 text-right"><span className={cn("text-sm font-bold font-mono", isNonWorkingStatus ? "text-slate-400" : "text-blue-800")}>{formatCurrency(getAttendanceTotalPayWithService(item), item.currency)}</span></td>
                    <td className="px-3 py-3 text-center whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => void handleOpenAdjustment(item)}
                        className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 hover:text-indigo-700 text-xs font-semibold rounded-lg transition inline-flex items-center gap-1 border border-indigo-100"
                        title={tAdmin("手动补签/调整该员工当天的考勤记录")}
                      >
                        <Edit className="w-3 h-3" />
                        <span>{tAdmin("调整")}</span>
                      </button>
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
          total={sortedRows.length}
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
            <Field label={tAdmin("日期")}><input type="date" required value={createForm.date} onChange={(event) => setCreateForm((prev) => ({ ...prev, date: event.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500" /></Field>
            <Field label={tAdmin("员工")}>
              <select required value={createForm.employeeId} onChange={(event) => setCreateForm((prev) => ({ ...prev, employeeId: event.target.value }))} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500">
                <option value="">{tAdmin("请选择员工")}</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>{formatEmployeeDisplayName(employee)} ({employee.role})</option>
                ))}
              </select>
            </Field>
            {selectedCreateEmployee ? (
              <div className="md:col-span-2 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border-2 border-white bg-slate-200 shadow-sm flex items-center justify-center text-sm font-bold text-slate-600">
                  {selectedCreateEmployee.photo ? (
                    <img src={selectedCreateEmployee.photo} alt="" className="h-full w-full object-cover" />
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
              <select required value={createForm.type} onChange={(event) => setCreateForm((prev) => applyDefaultTimeWhenNormal(prev, event.target.value as AttendanceRecordUpdatePayload["type"] | ""))} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500">
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
            <button type="submit" form="attendance-adjust-form" disabled={submitting} className="rounded-lg bg-brand-600 px-6 py-2 text-sm text-white transition hover:bg-brand-700 disabled:opacity-60">
              {submitting ? tAdmin("保存中...") : tAdmin("保存并重算")}
            </button>
          </div>
        )}
      >
        <form id="attendance-adjust-form" onSubmit={handleSaveAdjustment} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label={tAdmin("日期")}><input type="date" value={adjustForm.date} onChange={(event) => setAdjustForm((prev) => ({ ...prev, date: event.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500" /></Field>
            <Field label={tAdmin("考勤类型")}>
              <select value={adjustForm.type} onChange={(event) => setAdjustForm((prev) => applyDefaultTimeWhenNormal(prev, event.target.value as AttendanceRecordUpdatePayload["type"]))} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500">
                <option value="normal">{tAdmin("全勤")}</option>
                <option value="late">{tAdmin("迟到")}</option>
                <option value="early">{tAdmin("早退")}</option>
                <option value="absent">{tAdmin("缺勤")}</option>
                <option value="leave">{tAdmin("假期")}</option>
                <option value="sick_leave">{tAdmin("病假")}</option>
                <option value="overtime">{tAdmin("加班")}</option>
              </select>
            </Field>
            <Field label={tAdmin("上班时间")}><input type="time" value={adjustForm.inTime || ""} onChange={(event) => setAdjustForm((prev) => ({ ...prev, inTime: event.target.value || null }))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500" /></Field>
            <Field label={tAdmin("下班时间")}><input type="time" value={adjustForm.outTime || ""} onChange={(event) => setAdjustForm((prev) => ({ ...prev, outTime: event.target.value || null }))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500" /></Field>
          </div>
          <Field label={tAdmin("调整备注")}><textarea value={adjustForm.note} onChange={(event) => setAdjustForm((prev) => ({ ...prev, note: event.target.value }))} rows={3} className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500" /></Field>
        </form>
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
              <Field label={tAdmin("加班费币种")}>
                <select value={configForm.currency || "THB"} onChange={(event) => setConfigForm((prev) => prev ? { ...prev, currency: event.target.value as AppConfig["currency"] } : prev)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500">
                  <option value="THB">{tAdmin("THB - 泰铢")}</option>
                  <option value="USD">{tAdmin("USD - 美元")}</option>
                  <option value="MYR">{tAdmin("MYR - 马币")}</option>
                  <option value="IDR">{tAdmin("IDR - 印尼盾")}</option>
                </select>
              </Field>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">{tAdmin("保存后将自动刷新当前月份的考勤结果。加班费默认使用 THB；个人考勤行会按员工薪资币种展示，服务端会把全局规则币种转换到员工币种后再计算。")}</div>
          </form>
        ) : (
          <div className="py-8 text-center text-sm text-slate-500">{tAdmin("正在加载考勤规则配置...")}</div>
        )}
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
