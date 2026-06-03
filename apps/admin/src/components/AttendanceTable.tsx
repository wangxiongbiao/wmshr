/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { type FormEvent, type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, ChevronLeft, ChevronRight, Eye, RefreshCw, Search } from "lucide-react";
import type {
  AttendanceCalculationDetail,
  AttendanceCalculationResult,
  AttendanceRecordUpdatePayload,
  Employee,
  MonthlyAttendanceSummary
} from "../types";
import {
  createAttendanceRecord,
  fetchAttendanceCalculationDetail,
  fetchAttendanceCalculations,
  fetchAttendanceSummaries,
  recalculateBatchAttendance,
  recalculateDailyAttendance,
  recalculateMonthlyAttendance,
  updateAttendanceRecord
} from "../lib/api";
import { useDialog } from "./DialogProvider";
import { ModalShell } from "./ModalShell";
import { cn, formatDuration } from "../lib/utils";
import { Pagination } from "./Pagination";

interface AttendanceTableProps {
  employees: Employee[];
}

const CALCULATION_STATUS_META: Record<string, { label: string; className: string }> = {
  normal: { label: "正常", className: "bg-green-100 text-green-700" },
  leave: { label: "假期", className: "bg-sky-100 text-sky-700" },
  absent: { label: "缺勤", className: "bg-slate-100 text-slate-700" },
  manual_adjusted: { label: "人工调整", className: "bg-amber-100 text-amber-700" },
  exception: { label: "异常", className: "bg-red-100 text-red-700" }
};

const DAILY_PAGE_SIZE = 8;
const SUMMARY_PAGE_SIZE = 8;

function getDefaultYearMonth() {
  return new Date().toISOString().slice(0, 7);
}

function getDefaultDate() {
  return new Date().toISOString().slice(0, 10);
}

function getDefaultDateForYearMonth(yearMonth: string) {
  const today = getDefaultDate();
  return today.startsWith(yearMonth) ? today : `${yearMonth}-01`;
}

function shiftDate(date: string, deltaDays: number) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + deltaDays);
  return value.toISOString().slice(0, 10);
}

function Modal({
  isOpen,
  title,
  onClose,
  children,
  className = "max-w-3xl",
  bodyClassName,
  footer
}: {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  footer?: ReactNode;
}) {
  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      className={className}
      bodyClassName={bodyClassName ?? "overflow-y-auto"}
      footer={footer}
    >
      {children}
    </ModalShell>
  );
}

export function AttendanceTable({ employees: _employees }: AttendanceTableProps) {
  const { confirm } = useDialog();
  const [keyword, setKeyword] = useState("");
  const [yearMonth, setYearMonth] = useState(getDefaultYearMonth());
  const [selectedDate, setSelectedDate] = useState(getDefaultDate());
  const [status, setStatus] = useState("all");
  const [hasException, setHasException] = useState("all");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [calculations, setCalculations] = useState<AttendanceCalculationResult[]>([]);
  const [summaries, setSummaries] = useState<MonthlyAttendanceSummary[]>([]);
  const [summaryPage, setSummaryPage] = useState(1);
  const [dailyPage, setDailyPage] = useState(1);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");
  const [modalLoadingMessage, setModalLoadingMessage] = useState("");
  const [detail, setDetail] = useState<AttendanceCalculationDetail | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isAdjustmentOpen, setIsAdjustmentOpen] = useState(false);
  const [adjustingResult, setAdjustingResult] = useState<AttendanceCalculationResult | null>(null);
  const loadRequestIdRef = useRef(0);
  const [adjustForm, setAdjustForm] = useState<AttendanceRecordUpdatePayload>({
    date: "",
    type: "normal",
    inTime: null,
    outTime: null,
    note: ""
  });

  const selectedCount = selectedKeys.size;

  const loadData = async (nextFilters?: {
    keyword?: string;
    yearMonth?: string;
    selectedDate?: string;
    status?: string;
    hasException?: string;
  }) => {
    const effectiveKeyword = nextFilters?.keyword ?? keyword;
    const effectiveYearMonth = nextFilters?.yearMonth ?? yearMonth;
    const effectiveSelectedDate = nextFilters?.selectedDate ?? selectedDate;
    const effectiveStatus = nextFilters?.status ?? status;
    const effectiveHasException = nextFilters?.hasException ?? hasException;
    const requestId = ++loadRequestIdRef.current;

    setLoading(true);
    setError("");
    try {
      const [nextCalculations, nextSummaries] = await Promise.all([
        fetchAttendanceCalculations({
          keyword: effectiveKeyword,
          yearMonth: effectiveYearMonth,
          date: effectiveSelectedDate,
          status: effectiveStatus,
          hasException: effectiveHasException
        }),
        fetchAttendanceSummaries({
          keyword: effectiveKeyword,
          yearMonth: effectiveYearMonth
        })
      ]);

      if (requestId !== loadRequestIdRef.current) {
        return;
      }

      setCalculations(nextCalculations);
      setSummaries(nextSummaries);
      setSummaryPage(1);
      setDailyPage(1);
      setSelectedKeys(new Set());
    } catch (nextError) {
      if (requestId !== loadRequestIdRef.current) {
        return;
      }
      setError(nextError instanceof Error ? nextError.message : "考勤计算数据加载失败");
    } finally {
      if (requestId !== loadRequestIdRef.current) {
        return;
      }
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadData();
    }, keyword.trim() ? 350 : 0);

    return () => window.clearTimeout(timer);
  }, [hasException, keyword, selectedDate, status, yearMonth]);

  const handleYearMonthChange = (nextYearMonth: string) => {
    if (!/^\d{4}-\d{2}$/.test(nextYearMonth)) {
      return;
    }
    setYearMonth(nextYearMonth);
    setSelectedDate(getDefaultDateForYearMonth(nextYearMonth));
  };

  const handleSelectedDateChange = (nextDate: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(nextDate)) {
      return;
    }
    setSelectedDate(nextDate);
    setYearMonth(nextDate.slice(0, 7));
  };

  const jumpSelectedDate = (deltaDays: number) => {
    handleSelectedDateChange(shiftDate(selectedDate, deltaDays));
  };

  const toggleSelectAll = (checked: boolean) => {
    if (!checked) {
      setSelectedKeys(new Set());
      return;
    }
    setSelectedKeys(new Set(calculations.map((item) => `${item.employeeId}:${item.date}`)));
  };

  const handleViewDetail = async (resultId: number) => {
    setModalLoadingMessage("正在加载考勤计算详情...");
    try {
      const nextDetail = await fetchAttendanceCalculationDetail(resultId);
      setDetail(nextDetail);
      setIsDetailOpen(true);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "考勤详情加载失败");
    } finally {
      setModalLoadingMessage("");
    }
  };

  const handleOpenAdjustment = async (result: AttendanceCalculationResult) => {
    setModalLoadingMessage("正在加载原始考勤记录...");
    try {
      const nextDetail = result.attendanceRecordId ? await fetchAttendanceCalculationDetail(result.id) : null;
      setDetail(nextDetail);
      setAdjustingResult(result);
      setAdjustForm({
        date: nextDetail?.record?.date || result.date,
        type: nextDetail?.record?.type || "normal",
        inTime: nextDetail?.record?.inTime || result.rawInTime || null,
        outTime: nextDetail?.record?.outTime || result.rawOutTime || null,
        note: nextDetail?.record?.note || result.exceptionReason || ""
      });
      setIsAdjustmentOpen(true);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "考勤记录加载失败");
    } finally {
      setModalLoadingMessage("");
    }
  };

  const handleSaveAdjustment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!adjustingResult) {
      return;
    }

    setSubmitting(true);
    try {
      if (adjustingResult.attendanceRecordId) {
        await updateAttendanceRecord(adjustingResult.attendanceRecordId, adjustForm);
      } else {
        await createAttendanceRecord(adjustingResult.employeeId, adjustForm);
      }
      const nextSelectedDate = adjustForm.date || selectedDate;
      const nextYearMonth = nextSelectedDate.slice(0, 7);
      setSelectedDate(nextSelectedDate);
      setYearMonth(nextYearMonth);
      setIsAdjustmentOpen(false);
      await loadData({ yearMonth: nextYearMonth, selectedDate: nextSelectedDate });
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "考勤调整失败");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecalculateDaily = async (result: AttendanceCalculationResult) => {
    const confirmed = await confirm({
      title: "确认重算单日考勤",
      message: "将重新计算该员工该日期的考勤结果，已有计算结果会被刷新。是否继续？",
      confirmText: "立即重算",
      cancelText: "取消",
      tone: "warning"
    });
    if (!confirmed) {
      return;
    }

    setSubmitting(true);
    try {
      await recalculateDailyAttendance(result.employeeId, result.date);
      await loadData();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "单日重算失败");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecalculateSelected = async () => {
    const items = calculations
      .filter((item) => selectedKeys.has(`${item.employeeId}:${item.date}`))
      .map((item) => ({ employeeId: item.employeeId, date: item.date }));

    if (!items.length) {
      setError("请先选择要重算的考勤结果。");
      return;
    }

    const confirmed = await confirm({
      title: "确认批量重算",
      message: "将重新计算选中的考勤结果，已有计算结果会被刷新。是否继续？",
      confirmText: "批量重算",
      cancelText: "取消",
      tone: "warning"
    });
    if (!confirmed) {
      return;
    }

    setSubmitting(true);
    try {
      await recalculateBatchAttendance(items);
      await loadData();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "批量重算失败");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecalculateMonthly = async () => {
    const confirmed = await confirm({
      title: "确认重算月度考勤",
      message: "将重新计算当前筛选月份的考勤结果。若考勤规则已被修改，历史结果可能发生变化。是否继续？",
      confirmText: "重算本月",
      cancelText: "取消",
      tone: "warning"
    });
    if (!confirmed) {
      return;
    }

    setSubmitting(true);
    try {
      await recalculateMonthlyAttendance(yearMonth, null);
      await loadData();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "月度重算失败");
    } finally {
      setSubmitting(false);
    }
  };

  const resetFilters = () => {
    const next = {
      keyword: "",
      yearMonth: getDefaultYearMonth(),
      selectedDate: getDefaultDate(),
      status: "all",
      hasException: "all"
    };
    setKeyword(next.keyword);
    setYearMonth(next.yearMonth);
    setSelectedDate(next.selectedDate);
    setStatus(next.status);
    setHasException(next.hasException);
    void loadData(next);
  };

  const isAllSelected = calculations.length > 0 && selectedKeys.size === calculations.length;

  const summaryTotals = useMemo(() => {
    return summaries.reduce(
      (acc, summary) => {
        acc.valid += summary.totalValidHours;
        acc.ot += summary.totalOvertimePayHours;
        acc.exceptions += summary.exceptionCount;
        return acc;
      },
      { valid: 0, ot: 0, exceptions: 0 }
    );
  }, [summaries]);

  const dailyTotalPages = Math.max(1, Math.ceil(calculations.length / DAILY_PAGE_SIZE));
  const summaryTotalPages = Math.max(1, Math.ceil(summaries.length / SUMMARY_PAGE_SIZE));
  const paginatedSummaries = useMemo(() => {
    const start = (summaryPage - 1) * SUMMARY_PAGE_SIZE;
    return summaries.slice(start, start + SUMMARY_PAGE_SIZE);
  }, [summaries, summaryPage]);

  const paginatedCalculations = useMemo(() => {
    const start = (dailyPage - 1) * DAILY_PAGE_SIZE;
    return calculations.slice(start, start + DAILY_PAGE_SIZE);
  }, [calculations, dailyPage]);

  useEffect(() => {
    if (summaryPage > summaryTotalPages) {
      setSummaryPage(summaryTotalPages);
    }
  }, [summaryPage, summaryTotalPages]);

  useEffect(() => {
    if (dailyPage > dailyTotalPages) {
      setDailyPage(dailyTotalPages);
    }
  }, [dailyPage, dailyTotalPages]);

  return (
    <div className="space-y-6">
      <div className="glass-panel rounded-xl p-5">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_180px]">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[minmax(260px,1.3fr)_180px_180px_180px]">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1 uppercase">搜索</label>
                <div className="relative">
                  <input
                    type="text"
                    value={keyword}
                    onChange={(event) => setKeyword(event.target.value)}
                    placeholder="搜索员工姓名、考勤规则..."
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg bg-white text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                  />
                  <Search className="w-5 h-5 absolute left-3 top-2.5 text-slate-400" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1 uppercase">年月</label>
                <input
                  type="month"
                  value={yearMonth}
                  onChange={(event) => handleYearMonthChange(event.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg bg-white text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1 uppercase">考勤状态</label>
                <select
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg bg-white text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                >
                  <option value="all">全部状态</option>
                  <option value="normal">正常</option>
                  <option value="manual_adjusted">人工调整</option>
                  <option value="absent">缺勤</option>
                  <option value="leave">假期</option>
                  <option value="exception">异常</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1 uppercase">是否异常</label>
                <select
                  value={hasException}
                  onChange={(event) => setHasException(event.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg bg-white text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                >
                  <option value="all">全部</option>
                  <option value="true">仅异常</option>
                  <option value="false">仅正常</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1 uppercase">操作</label>
              <button
                onClick={resetFilters}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-300 bg-white text-sm text-slate-700 hover:bg-slate-50"
              >
                重置
              </button>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SummaryCard label="总有效工时" value={formatDuration(summaryTotals.valid)} />
        <SummaryCard label="总加班计薪时长" value={formatDuration(summaryTotals.ot)} />
        <SummaryCard label="异常记录数" value={`${summaryTotals.exceptions} 条`} tone={summaryTotals.exceptions > 0 ? "danger" : "neutral"} />
      </div>

      <div className="glass-panel rounded-xl overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-100 bg-white px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">月度考勤汇总</h3>
            <p className="text-xs text-slate-400 mt-1">薪资核算模块将基于此汇总，不再直接遍历原始考勤记录</p>
          </div>
          <button
            type="button"
            onClick={() => void handleRecalculateMonthly()}
            disabled={submitting}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className="h-4 w-4" />
            {submitting ? "重算中..." : "重算本月"}
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white text-slate-500 text-xs uppercase border-b border-slate-100">
                <th className="px-4 py-3">员工编号</th>
                <th className="px-4 py-3">员工姓名</th>
                <th className="px-4 py-3 text-center">总有效工时</th>
                <th className="px-4 py-3 text-center">总标准工时</th>
                <th className="px-4 py-3 text-center">总加班计薪</th>
                <th className="px-4 py-3 text-center">异常数</th>
                <th className="px-4 py-3 text-center">缺勤天数</th>
                <th className="px-4 py-3 text-center">假期天数</th>
                <th className="px-4 py-3 text-center">人工调整</th>
                <th className="px-4 py-3">薪资核算状态</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {summaries.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-8 text-center text-sm text-slate-500">当前没有月度汇总结果</td>
                </tr>
              ) : paginatedSummaries.map((summary) => (
                <tr key={summary.id}>
                  <td className="px-4 py-4 text-sm text-slate-500">{summary.employeeNo || "-"}</td>
                  <td className="px-4 py-4 text-sm font-medium text-slate-800">{summary.employeeName}</td>
                  <td className="px-4 py-4 text-sm text-center font-mono">{formatDuration(summary.totalValidHours)}</td>
                  <td className="px-4 py-4 text-sm text-center font-mono">{formatDuration(summary.totalStandardHours)}</td>
                  <td className="px-4 py-4 text-sm text-center font-mono text-blue-600">{formatDuration(summary.totalOvertimePayHours)}</td>
                  <td className="px-4 py-4 text-sm text-center">{summary.exceptionCount}</td>
                  <td className="px-4 py-4 text-sm text-center">{summary.absentCount}</td>
                  <td className="px-4 py-4 text-sm text-center">{summary.leaveCount}</td>
                  <td className="px-4 py-4 text-sm text-center">{summary.manualAdjustedCount}</td>
                  <td className="px-4 py-4 text-sm">
                    {summary.canGeneratePayroll ? (
                      <span className="text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-full text-xs font-medium">可进入薪资核算</span>
                    ) : (
                      <span className="text-red-700 bg-red-50 border border-red-100 px-2 py-1 rounded-full text-xs font-medium">
                        不可进入薪资核算：{summary.blockedReason || "存在异常"}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {summaries.length > 0 ? (
          <Pagination
            page={summaryPage}
            pageSize={SUMMARY_PAGE_SIZE}
            total={summaries.length}
            itemName="条月度汇总"
            className="mx-5 mb-5"
            onPageChange={setSummaryPage}
          />
        ) : null}
      </div>

      <div className="glass-panel rounded-xl overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-100 bg-white px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">当日考勤计算</h3>
            <p className="text-xs text-slate-400 mt-1">仅展示所选日期的考勤计算结果，支持补卡、人工调整和单日重算</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div>
              <label className="mb-1 block text-xs font-medium uppercase text-slate-500">考勤日期</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(event) => handleSelectedDateChange(event.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500 sm:w-[168px]"
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => jumpSelectedDate(-1)}
                className="inline-flex items-center justify-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                <ChevronLeft className="h-4 w-4" />
                前一天
              </button>
              <button
                type="button"
                onClick={() => handleSelectedDateChange(getDefaultDate())}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                今天
              </button>
              <button
                type="button"
                onClick={() => jumpSelectedDate(1)}
                className="inline-flex items-center justify-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                后一天
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="px-6 py-10 text-center text-sm text-slate-500">正在加载当日考勤计算结果...</div>
        ) : calculations.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-slate-500">当前日期没有考勤计算结果</div>
        ) : (
          <div>
            <div className="grid grid-cols-1 gap-4 p-5 xl:grid-cols-2">
              {paginatedCalculations.map((item) => (
                <div
                  key={`${item.employeeId}-${item.date}`}
                  className={cn(
                    "rounded-xl border border-slate-200 bg-white p-4 transition hover:shadow-md",
                    item.hasException && "border-red-200 bg-red-50/30"
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-bold text-slate-800">{item.employeeName}</h3>
                        <span className={cn("rounded-full px-2 py-1 text-xs font-medium", CALCULATION_STATUS_META[item.status]?.className || "bg-slate-100 text-slate-700")}>
                          {CALCULATION_STATUS_META[item.status]?.label || item.status}
                        </span>
                      </div>
                      <div className="mt-2 text-sm font-mono text-slate-500">{item.date}</div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button onClick={() => void handleViewDetail(item.id)} className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50" title="查看详情">
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => void handleOpenAdjustment(item)}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-600 hover:bg-slate-50"
                      >
                        {item.attendanceRecordId ? "调整" : "补卡"}
                      </button>
                      <button onClick={() => void handleRecalculateDaily(item)} className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50" title="重算单日">
                        <RefreshCw className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
                    <AttendanceInfo label="使用规则" value={item.attendanceRuleName || "未匹配规则"} />
                    <AttendanceInfo label="上班 / 下班" value={`${item.rawInTime || "-"} / ${item.rawOutTime || "-"}`} mono />
                    <AttendanceInfo label="有效工时" value={formatDuration(item.validHours)} mono />
                    <AttendanceInfo label="加班计薪" value={formatDuration(item.overtimePayHours)} mono highlight />
                  </div>
                </div>
              ))}
            </div>

            <Pagination
              page={dailyPage}
              pageSize={DAILY_PAGE_SIZE}
              total={calculations.length}
              itemName="条当日结果"
              className="mx-5 mb-5"
              onPageChange={setDailyPage}
            />
          </div>
        )}
      </div>

      <Modal
        isOpen={isDetailOpen}
        title="考勤计算详情"
        onClose={() => setIsDetailOpen(false)}
        className="max-w-4xl"
        bodyClassName="max-h-[calc(90vh-162px)] overflow-y-auto"
        footer={(
          <div className="flex justify-end">
            <button onClick={() => setIsDetailOpen(false)} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
              关闭
            </button>
          </div>
        )}
      >
        {detail ? (
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <DetailItem label="员工">{detail.result.employeeName}</DetailItem>
              <DetailItem label="员工编号">{detail.result.employeeNo || "-"}</DetailItem>
              <DetailItem label="考勤日期">{detail.result.date}</DetailItem>
              <DetailItem label="考勤来源">{detail.record?.source || "-"}</DetailItem>
              <DetailItem label="使用规则">{detail.result.attendanceRuleName || "未匹配规则"}</DetailItem>
              <DetailItem label="计算时间">{detail.result.calculatedAt}</DetailItem>
            </div>

            <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <h4 className="text-sm font-semibold text-slate-800 mb-3">计算过程</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                <DetailItem label="原始工时">{formatDuration(detail.result.rawHours)}</DetailItem>
                <DetailItem label="休息扣除">{formatDuration(detail.result.breakDeductionHours)}</DetailItem>
                <DetailItem label="有效工时">{formatDuration(detail.result.validHours)}</DetailItem>
                <DetailItem label="标准工时">{formatDuration(detail.result.standardHours)}</DetailItem>
                <DetailItem label="加班原始时长">{formatDuration(detail.result.overtimeRawHours)}</DetailItem>
                <DetailItem label="加班计薪时长">{formatDuration(detail.result.overtimePayHours)}</DetailItem>
              </div>
            </section>

            {detail.result.hasException && (
              <section className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                <div className="flex items-center gap-2 font-semibold mb-2">
                  <AlertCircle className="w-4 h-4" />
                  异常信息
                </div>
                <p>{detail.result.exceptionReason || "异常原因未返回"}</p>
              </section>
            )}
          </div>
        ) : null}
      </Modal>

      <Modal
        isOpen={isAdjustmentOpen}
        title={adjustingResult?.attendanceRecordId ? "调整原始考勤记录" : "新增补卡记录"}
        onClose={() => setIsAdjustmentOpen(false)}
        className="max-w-2xl"
        bodyClassName="p-0"
        footer={(
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setIsAdjustmentOpen(false)} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100">
              取消
            </button>
            <button type="submit" form="attendance-adjust-form" disabled={submitting} className="rounded-lg bg-brand-600 px-6 py-2 text-sm text-white transition hover:bg-brand-700 disabled:opacity-60">
              {submitting ? "保存中..." : "保存并重算"}
            </button>
          </div>
        )}
      >
        <form id="attendance-adjust-form" onSubmit={handleSaveAdjustment} className="flex max-h-[calc(90vh-162px)] min-h-0 flex-col">
          <div className="flex-1 overflow-y-auto px-6 py-6">
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field label="日期">
                  <input type="date" value={adjustForm.date} onChange={(event) => setAdjustForm((prev) => ({ ...prev, date: event.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500" />
                </Field>
                <Field label="考勤类型">
                  <select value={adjustForm.type} onChange={(event) => setAdjustForm((prev) => ({ ...prev, type: event.target.value as AttendanceRecordUpdatePayload["type"] }))} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500">
                    <option value="normal">正常</option>
                    <option value="late">迟到</option>
                    <option value="early">早退</option>
                    <option value="absent">缺勤</option>
                    <option value="leave">假期</option>
                    <option value="overtime">加班</option>
                  </select>
                </Field>
                <Field label="上班时间">
                  <input type="time" value={adjustForm.inTime || ""} onChange={(event) => setAdjustForm((prev) => ({ ...prev, inTime: event.target.value || null }))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500" />
                </Field>
                <Field label="下班时间">
                  <input type="time" value={adjustForm.outTime || ""} onChange={(event) => setAdjustForm((prev) => ({ ...prev, outTime: event.target.value || null }))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500" />
                </Field>
              </div>
              <Field label="调整备注">
                <textarea value={adjustForm.note} onChange={(event) => setAdjustForm((prev) => ({ ...prev, note: event.target.value }))} rows={3} className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500" />
              </Field>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                {adjustingResult?.attendanceRecordId ? "保存后会将该原始考勤记录标记为 `manual`，并自动触发单日重算与月度汇总刷新。" : "保存后会创建一条 `manual` 补卡记录，并自动触发单日重算与月度汇总刷新。"}
              </div>
            </div>
          </div>
        </form>
      </Modal>

      {modalLoadingMessage ? (
        <div className="fixed inset-0 z-[75] flex items-center justify-center bg-slate-950/35 backdrop-blur-sm">
          <div className="rounded-3xl border border-white/70 bg-white px-8 py-6 shadow-[0_24px_80px_rgba(15,23,42,0.18)]">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-brand-600" />
              <div>
                <div className="text-sm font-semibold text-slate-800">{modalLoadingMessage}</div>
                <div className="mt-1 text-xs text-slate-500">请稍候，正在准备弹窗内容</div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SummaryCard({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "neutral" | "danger" }) {
  return (
    <div className="glass-panel rounded-xl p-5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={cn("mt-2 text-2xl font-bold", tone === "danger" ? "text-red-600" : "text-slate-800")}>{value}</p>
    </div>
  );
}

function AttendanceInfo({
  label,
  value,
  mono = false,
  highlight = false
}: {
  label: string;
  value: string;
  mono?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-slate-400">{label}</p>
      <p className={cn("mt-1 text-sm font-semibold text-slate-800", mono && "font-mono", highlight && "text-blue-600")}>{value}</p>
    </div>
  );
}

function DetailItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-xs uppercase text-slate-400 mb-1">{label}</p>
      <div className="text-sm text-slate-700">{children}</div>
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
