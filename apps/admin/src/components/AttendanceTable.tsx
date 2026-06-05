/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { type FormEvent, type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { Download, Edit, Plus, Settings } from "lucide-react";
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
  updateAttendanceConfig,
  updateAttendanceRecord
} from "../lib/api";
import { ModalShell } from "./ModalShell";
import { cn, formatDuration } from "../lib/utils";

interface AttendanceTableProps {
  employees: Employee[];
}

const DEFAULT_CREATE_IN_TIME = "08:30";
const DEFAULT_CREATE_OUT_TIME = "17:30";

const STATUS_META: Record<string, { label: string; className: string }> = {
  normal: { label: "正常", className: "bg-green-100 text-green-700" },
  late: { label: "迟到", className: "bg-yellow-100 text-yellow-700" },
  early: { label: "早退", className: "bg-orange-100 text-orange-700" },
  absent: { label: "缺勤", className: "bg-red-100 text-red-700" },
  leave: { label: "假期", className: "bg-blue-100 text-blue-700" },
  sick_leave: { label: "病假", className: "bg-cyan-100 text-cyan-700" },
  overtime: { label: "加班", className: "bg-purple-100 text-purple-700" },
  manual_adjusted: { label: "人工调整", className: "bg-amber-100 text-amber-700" },
  exception: { label: "异常", className: "bg-red-100 text-red-700" }
};

function getDefaultDate() {
  return new Date().toISOString().slice(0, 10);
}

function getDefaultMonth() {
  return new Date().toISOString().slice(0, 7);
}

function formatCurrency(value: number, currency: string) {
  return `${Number(value || 0).toFixed(2)} ${currency || "THB"}`;
}

function formatEmployeeDisplayName(employee: Pick<Employee, "name" | "nickname">) {
  return employee.nickname ? `${employee.name}(${employee.nickname})` : employee.name;
}

function getStatusMeta(item: AttendanceCalculationResult) {
  if (item.isOvertime && item.status === "normal") {
    return STATUS_META.overtime;
  }
  return STATUS_META[item.status] || { label: item.statusLabel || item.status || "正常", className: "bg-slate-100 text-slate-700" };
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

export function AttendanceTable({ employees }: AttendanceTableProps) {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | "all">("all");
  const [timeFilterType, setTimeFilterType] = useState<"all" | "day" | "month">("all");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [calculations, setCalculations] = useState<AttendanceCalculationResult[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [configForm, setConfigForm] = useState<AppConfig | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAdjustmentOpen, setIsAdjustmentOpen] = useState(false);
  const [adjustingResult, setAdjustingResult] = useState<AttendanceCalculationResult | null>(null);
  const [createForm, setCreateForm] = useState({
    employeeId: "",
    date: getDefaultDate(),
    type: "normal" as AttendanceRecordUpdatePayload["type"],
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
  const [error, setError] = useState("");
  const loadRequestIdRef = useRef(0);

  const isFiltered = selectedEmployeeId !== "all" || timeFilterType !== "all";
  const selectedCreateEmployee = useMemo(() => {
    const employeeId = Number(createForm.employeeId);
    return employees.find((employee) => Number(employee.id) === employeeId) || null;
  }, [createForm.employeeId, employees]);

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
      setError(nextError instanceof Error ? nextError.message : "考勤计算数据加载失败");
    } finally {
      if (requestId === loadRequestIdRef.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    void loadData();
  }, [selectedDate, selectedEmployeeId, selectedMonth, timeFilterType]);

  useEffect(() => {
    void fetchAttendanceConfig()
      .then((nextConfig) => {
        setConfigForm(nextConfig);
      })
      .catch((nextError) => setError(nextError instanceof Error ? nextError.message : "考勤规则配置加载失败"));
  }, []);

  const sortedRows = useMemo(() => {
    return [...calculations].sort((a, b) => {
      if (a.date !== b.date) return b.date.localeCompare(a.date);
      return a.employeeName.localeCompare(b.employeeName);
    });
  }, [calculations]);

  const isAllSelected = sortedRows.length > 0 && sortedRows.every((row) => selectedIds.has(row.id));

  const toggleSelectAll = (checked: boolean) => {
    setSelectedIds(checked ? new Set(sortedRows.map((row) => row.id)) : new Set());
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

  const applyDefaultTimeWhenNormal = <T extends { type: AttendanceRecordUpdatePayload["type"]; inTime: string | null; outTime: string | null }>(
    prev: T,
    nextType: AttendanceRecordUpdatePayload["type"]
  ): T => ({
    ...prev,
    type: nextType,
    // 只在切回“正常”时恢复业务默认上下班时间；其他考勤类型保留用户已填时间，避免病假/缺勤等记录被强塞默认时间。
    inTime: nextType === "normal" ? DEFAULT_CREATE_IN_TIME : prev.inTime,
    outTime: nextType === "normal" ? DEFAULT_CREATE_OUT_TIME : prev.outTime
  });

  const handleExportCSV = () => {
    const headers = [
      "日期", "员工姓名", "来源国家", "性别", "职位", "所属区域",
      "时薪", "基本日薪", "上班时间", "下班时间", "有效工时", "加班工时",
      "今天上班费用", "加班费", "合计费用", "考勤状态", "备注"
    ];
    const countryNames: Record<string, string> = { MM: "缅甸", TH: "泰国", CN: "中国", VN: "越南", KH: "柬埔寨" };
    const rows = sortedRows.map((item) => {
      const baseDailyWage = item.fixedSalary && item.fixedSalary > 0 ? item.fixedSalary / 30 : item.standardHours * (item.hourlyRate || 0);
      const displayHourlyRate = item.fixedSalary && item.fixedSalary > 0 ? baseDailyWage / Math.max(1, item.standardHours) : item.hourlyRate || 0;
      return [
        item.date,
        item.employeeName,
        countryNames[item.employeeCountry || ""] || item.employeeCountry || "-",
        item.employeeGender === "female" ? "女" : item.employeeGender === "male" ? "男" : "-",
        item.employeeRole || "-",
        item.employeeDept || "-",
        `${displayHourlyRate.toFixed(2)} ${item.currency}`,
        `${baseDailyWage.toFixed(2)} ${item.currency}`,
        item.rawInTime || "-",
        item.rawOutTime || "-",
        `${item.validHours.toFixed(2)}h`,
        `${item.overtimePayHours.toFixed(2)}h`,
        `${item.workPay.toFixed(2)} ${item.currency}`,
        `${item.overtimePay.toFixed(2)} ${item.currency}`,
        `${item.totalPay.toFixed(2)} ${item.currency}`,
        getStatusMeta(item).label,
        item.note || ""
      ];
    });
    // v2 导出严格使用当前表格接口返回值；这里只做 CSV 转义和 BOM，不再按旧规则在浏览器重算费用。
    const csvContent = "\ufeff" + [headers, ...rows]
      .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csvContent], { type: "text/csv;charset=utf-8;" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `海外仓考勤报表_${getDefaultDate()}.csv`;
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
      setError(nextError instanceof Error ? nextError.message : "考勤记录加载失败");
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
      setError(nextError instanceof Error ? nextError.message : "考勤调整失败");
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
      inTime: DEFAULT_CREATE_IN_TIME,
      outTime: DEFAULT_CREATE_OUT_TIME
    }));
    setIsCreateOpen(true);
  };

  const handleSaveCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const employeeId = Number(createForm.employeeId);
    if (!employeeId) {
      setError("请选择员工后再新增考勤记录");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      // 新增考勤记录使用后端 upsert + 重算流程，保证列表、月汇总和薪资前置数据同步更新。
      await createAttendanceRecord({
        employeeId,
        date: createForm.date,
        type: createForm.type,
        inTime: createForm.inTime || null,
        outTime: createForm.outTime || null,
        note: createForm.note
      });
      setIsCreateOpen(false);
      await loadData();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "新增考勤记录失败");
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
      setError(nextError instanceof Error ? nextError.message : "考勤规则配置保存失败");
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
            <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">筛选员工</label>
            <select
              value={selectedEmployeeId}
              onChange={(event) => setSelectedEmployeeId(event.target.value === "all" ? "all" : Number(event.target.value))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none bg-white text-slate-700 h-[38px] text-sm cursor-pointer"
            >
              <option value="all">🔍 所有员工 (全部)</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>{employee.name} ({employee.role})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">时间筛选方式</label>
            <select
              value={timeFilterType}
              onChange={(event) => handleTimeFilterChange(event.target.value as "all" | "day" | "month")}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none bg-white text-slate-700 h-[38px] text-sm cursor-pointer"
            >
              <option value="all">📅 全部时间</option>
              <option value="day">📆 按天筛选</option>
              <option value="month">🗓️ 按月筛选</option>
            </select>
          </div>

          {timeFilterType === "day" && (
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">选择具体日期</label>
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
              <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">选择目标月份</label>
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
            >
              清除筛选条件
            </button>
          )}
        </div>
        </div>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="glass-panel rounded-xl shadow-sm overflow-hidden min-h-0 flex flex-1 flex-col">
        <div className="p-4 border-b border-slate-100 bg-white flex justify-between items-center">
          <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
            <span>考勤明细与自动计算</span>
            {isFiltered && (
              <span className="text-xs bg-brand-50 text-brand-700 px-2 py-0.5 rounded-full font-normal border border-brand-100 animate-pulse">
                已启用筛选
              </span>
            )}
          </h3>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleOpenCreate}
              className="bg-brand-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-brand-700 transition flex items-center gap-1.5"
              title="选择日期、员工、上下班时间新增一条考勤记录"
            >
              <Plus className="w-4 h-4" />
              新增考勤记录
            </button>
            <button
              type="button"
              onClick={handleExportCSV}
              className="bg-brand-50 border border-brand-200 text-brand-700 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-brand-100 transition flex items-center gap-1.5"
              title="导出当前表格显示的数据为 CSV 文件"
            >
              <Download className="w-4 h-4" />
              导出当前数据
            </button>
            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              className="bg-white border border-slate-300 text-slate-700 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-slate-50 transition flex items-center gap-1.5"
            >
              <Settings className="w-4 h-4" />
              设置规则
            </button>
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
                <th className="sticky top-0 bg-white z-10 px-3 py-3 font-medium text-left border-b border-slate-100">日期</th>
                <th className="sticky top-0 bg-white z-10 px-3 py-3 font-medium text-left border-b border-slate-100">员工</th>
                <th className="sticky top-0 bg-white z-10 px-3 py-3 font-medium text-center border-b border-slate-100">上班状态</th>
                <th className="sticky top-0 bg-white z-10 px-3 py-3 font-medium text-center border-b border-slate-100">上班</th>
                <th className="sticky top-0 bg-white z-10 px-3 py-3 font-medium text-center border-b border-slate-100">下班</th>
                <th className="sticky top-0 bg-white z-10 px-3 py-3 font-medium text-center border-b border-slate-100">有效工时</th>
                <th className="sticky top-0 bg-white z-10 px-3 py-3 font-medium text-center text-blue-600 border-b border-slate-100">加班时长</th>
                <th className="sticky top-0 bg-white z-10 px-3 py-3 font-medium text-right text-indigo-600 border-b border-slate-100">上班费用</th>
                <th className="sticky top-0 bg-white z-10 px-3 py-3 font-medium text-right text-green-600 border-b border-slate-100">加班费用</th>
                <th className="sticky top-0 bg-white z-10 px-3 py-3 font-medium text-right text-rose-600 border-b border-slate-100">合计费用</th>
                <th className="sticky top-0 bg-white z-10 px-3 py-3 font-medium text-center border-b border-slate-100">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={12} className="px-6 py-12 text-center text-slate-400 text-sm">正在加载考勤记录...</td>
                </tr>
              ) : sortedRows.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-6 py-12 text-center text-slate-400 text-sm">没有找到符合筛选条件的考勤记录</td>
                </tr>
              ) : sortedRows.map((item) => {
                const statusMeta = getStatusMeta(item);
                const isAbsentOrLeave = item.status === "absent" || item.status === "leave";
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
                    <td className="px-3 py-3 text-sm text-slate-700 text-center font-mono">{isAbsentOrLeave ? "-" : item.rawInTime || "-"}</td>
                    <td className="px-3 py-3 text-sm text-slate-700 text-center font-mono">{isAbsentOrLeave ? "-" : item.rawOutTime || "-"}</td>
                    <td className="px-3 py-3 text-sm text-center">
                      {isAbsentOrLeave ? <span className="text-slate-400">-</span> : <span className="text-slate-700 font-mono">{formatDuration(item.validHours)}</span>}
                    </td>
                    <td className="px-3 py-3 text-sm text-center">
                      {isAbsentOrLeave ? <span className="text-slate-400 font-mono">0.00h</span> : <span className="font-mono font-bold text-blue-600">{formatDuration(item.overtimePayHours)}</span>}
                    </td>
                    <td className={cn("px-3 py-3 text-sm font-mono text-right font-medium", isAbsentOrLeave ? "text-slate-400" : "text-indigo-600")}>{formatCurrency(item.workPay, item.currency)}</td>
                    <td className={cn("px-3 py-3 text-sm font-mono text-right font-medium", isAbsentOrLeave ? "text-slate-400" : "text-green-600")}>{formatCurrency(item.overtimePay, item.currency)}</td>
                    <td className={cn("px-3 py-3 text-sm font-mono text-right font-bold", isAbsentOrLeave ? "text-slate-400" : "text-rose-600")}>{formatCurrency(item.totalPay, item.currency)}</td>
                    <td className="px-3 py-3 text-center whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => void handleOpenAdjustment(item)}
                        className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 hover:text-indigo-700 text-xs font-semibold rounded-lg transition inline-flex items-center gap-1 border border-indigo-100"
                        title="手动补签/调整该员工当天的考勤记录"
                      >
                        <Edit className="w-3 h-3" />
                        <span>调整</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="shrink-0 flex items-center justify-between text-sm">
        <div className="flex items-center gap-4 text-slate-400 flex-wrap">
          <span>共 {sortedRows.length} 条已显示考勤</span>
          <span>•</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400" /> 缺勤 = 当天无打卡记录</span>
          <span>•</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400" /> 假期 = 员工休假状态</span>
        </div>
      </div>

      <Modal
        isOpen={isCreateOpen}
        title="新增考勤记录"
        onClose={() => setIsCreateOpen(false)}
        footer={(
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setIsCreateOpen(false)} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100">取消</button>
            <button type="submit" form="attendance-create-form" disabled={submitting} className="rounded-lg bg-brand-600 px-6 py-2 text-sm text-white transition hover:bg-brand-700 disabled:opacity-60">
              {submitting ? "保存中..." : "新增并重算"}
            </button>
          </div>
        )}
      >
        <form id="attendance-create-form" onSubmit={handleSaveCreate} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="日期"><input type="date" required value={createForm.date} onChange={(event) => setCreateForm((prev) => ({ ...prev, date: event.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500" /></Field>
            <Field label="员工">
              <select required value={createForm.employeeId} onChange={(event) => setCreateForm((prev) => ({ ...prev, employeeId: event.target.value }))} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500">
                <option value="">请选择员工</option>
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
                  <p className="truncate text-xs text-slate-500">{selectedCreateEmployee.dept || "未分配"} · {selectedCreateEmployee.role || "未设置职位"}</p>
                </div>
              </div>
            ) : null}
            <Field label="考勤类型">
              <select value={createForm.type} onChange={(event) => setCreateForm((prev) => applyDefaultTimeWhenNormal(prev, event.target.value as AttendanceRecordUpdatePayload["type"]))} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500">
                <option value="normal">正常</option>
                <option value="late">迟到</option>
                <option value="early">早退</option>
                <option value="absent">缺勤</option>
                <option value="leave">假期</option>
                <option value="sick_leave">病假</option>
                <option value="overtime">加班</option>
              </select>
            </Field>
            <div className="hidden md:block" />
            <Field label="上班时间"><input type="time" value={createForm.inTime} onChange={(event) => setCreateForm((prev) => ({ ...prev, inTime: event.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500" /></Field>
            <Field label="下班时间"><input type="time" value={createForm.outTime} onChange={(event) => setCreateForm((prev) => ({ ...prev, outTime: event.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500" /></Field>
          </div>
          <Field label="备注"><textarea value={createForm.note} onChange={(event) => setCreateForm((prev) => ({ ...prev, note: event.target.value }))} rows={3} className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500" /></Field>
          <div className="rounded-lg border border-brand-100 bg-brand-50 px-4 py-3 text-sm text-brand-700">
            新增后会立即按当前全局规则重算该员工当天和所在月份；如果已有同员工同日期记录，会覆盖为本次填写内容。
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isAdjustmentOpen}
        title={adjustingResult?.attendanceRecordId ? "调整原始考勤记录" : "新增补卡记录"}
        onClose={() => setIsAdjustmentOpen(false)}
        footer={(
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setIsAdjustmentOpen(false)} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100">取消</button>
            <button type="submit" form="attendance-adjust-form" disabled={submitting} className="rounded-lg bg-brand-600 px-6 py-2 text-sm text-white transition hover:bg-brand-700 disabled:opacity-60">
              {submitting ? "保存中..." : "保存并重算"}
            </button>
          </div>
        )}
      >
        <form id="attendance-adjust-form" onSubmit={handleSaveAdjustment} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="日期"><input type="date" value={adjustForm.date} onChange={(event) => setAdjustForm((prev) => ({ ...prev, date: event.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500" /></Field>
            <Field label="考勤类型">
              <select value={adjustForm.type} onChange={(event) => setAdjustForm((prev) => applyDefaultTimeWhenNormal(prev, event.target.value as AttendanceRecordUpdatePayload["type"]))} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500">
                <option value="normal">正常</option>
                <option value="late">迟到</option>
                <option value="early">早退</option>
                <option value="absent">缺勤</option>
                <option value="leave">假期</option>
                <option value="sick_leave">病假</option>
                <option value="overtime">加班</option>
              </select>
            </Field>
            <Field label="上班时间"><input type="time" value={adjustForm.inTime || ""} onChange={(event) => setAdjustForm((prev) => ({ ...prev, inTime: event.target.value || null }))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500" /></Field>
            <Field label="下班时间"><input type="time" value={adjustForm.outTime || ""} onChange={(event) => setAdjustForm((prev) => ({ ...prev, outTime: event.target.value || null }))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500" /></Field>
          </div>
          <Field label="调整备注"><textarea value={adjustForm.note} onChange={(event) => setAdjustForm((prev) => ({ ...prev, note: event.target.value }))} rows={3} className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500" /></Field>
        </form>
      </Modal>

      <Modal
        isOpen={isSettingsOpen}
        title="考勤与加班规则设置"
        onClose={() => setIsSettingsOpen(false)}
        footer={(
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setIsSettingsOpen(false)} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100">取消</button>
            <button type="submit" form="attendance-config-form" disabled={submitting || !configForm} className="rounded-lg bg-brand-600 px-6 py-2 text-sm text-white transition hover:bg-brand-700 disabled:opacity-60">
              {submitting ? "保存中..." : "保存规则"}
            </button>
          </div>
        )}
      >
        {configForm ? (
          <form id="attendance-config-form" onSubmit={handleSaveConfig} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="上班时间"><input type="time" value={configForm.startShift} onChange={(event) => setConfigForm((prev) => prev ? { ...prev, startShift: event.target.value } : prev)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500" /></Field>
              <Field label="下班时间"><input type="time" value={configForm.endShift} onChange={(event) => setConfigForm((prev) => prev ? { ...prev, endShift: event.target.value } : prev)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500" /></Field>
              <Field label="休息开始"><input type="time" value={configForm.breakStart} onChange={(event) => setConfigForm((prev) => prev ? { ...prev, breakStart: event.target.value } : prev)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500" /></Field>
              <Field label="休息结束"><input type="time" value={configForm.breakEnd} onChange={(event) => setConfigForm((prev) => prev ? { ...prev, breakEnd: event.target.value } : prev)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500" /></Field>
              <Field label="标准工时"><input type="number" min="0" step="0.25" value={configForm.standardHours} onChange={(event) => setConfigForm((prev) => prev ? { ...prev, standardHours: Number(event.target.value) } : prev)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500" /></Field>
              <Field label={`加班费标准（${configForm.currency || "THB"}/小时）`}><input type="number" min="0" step="0.01" value={configForm.otHourlyFee} onChange={(event) => setConfigForm((prev) => prev ? { ...prev, otHourlyFee: Number(event.target.value) } : prev)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500" /></Field>
              <Field label="加班费币种">
                <select value={configForm.currency || "THB"} onChange={(event) => setConfigForm((prev) => prev ? { ...prev, currency: event.target.value as AppConfig["currency"] } : prev)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500">
                  <option value="THB">THB - 泰铢</option>
                  <option value="USD">USD - 美元</option>
                  <option value="MYR">MYR - 马币</option>
                  <option value="IDR">IDR - 印尼盾</option>
                </select>
              </Field>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              保存后将自动刷新当前月份的考勤结果。加班费默认使用 THB；个人考勤行会按员工薪资币种展示，服务端会把全局规则币种转换到员工币种后再计算。
            </div>
          </form>
        ) : (
          <div className="py-8 text-center text-sm text-slate-500">正在加载考勤规则配置...</div>
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
