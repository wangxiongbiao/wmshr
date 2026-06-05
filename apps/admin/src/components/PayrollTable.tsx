/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, Calendar, Check, CheckCircle2, Clock, DollarSign, Download, Receipt, Search, TrendingUp } from "lucide-react";
import type {
  Employee,
  MonthlyPayrollResult,
  PayrollResultDetail,
} from "../types";
import {
  approvePayrollResult,
  confirmPayrollResult,
  fetchPayrollResultDetail,
  fetchPayrollResults,
  generateMonthlyPayroll,
  rejectPayrollResult,
} from "../lib/api";
import { useDialog } from "./DialogProvider";
import { ModalShell } from "./ModalShell";
import { cn, formatCurrency, formatDuration, SALARY_TYPE_LABELS } from "../lib/utils";

interface PayrollTableProps {
  employees: Employee[];
}

const REVIEW_STATUS_META: Record<string, { label: string; className: string }> = {
  pending: { label: "待核对", className: "bg-amber-100 text-amber-700" },
  approved: { label: "已通过", className: "bg-emerald-100 text-emerald-700" },
  rejected: { label: "已驳回", className: "bg-rose-100 text-rose-700" }
};

function getDefaultYearMonth() {
  return new Date().toISOString().slice(0, 7);
}

function Modal({
  isOpen,
  title,
  onClose,
  children,
  className = "max-w-6xl",
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

export function PayrollTable({ employees }: PayrollTableProps) {
  const { confirm, prompt } = useDialog();
  const [keyword, setKeyword] = useState("");
  const [yearMonth, setYearMonth] = useState(getDefaultYearMonth());
  const [calculationStatus, setCalculationStatus] = useState("all");
  const [reviewStatus, setReviewStatus] = useState("all");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState<MonthlyPayrollResult[]>([]);
  const [error, setError] = useState("");
  const [payslipDetail, setPayslipDetail] = useState<PayrollResultDetail | null>(null);
  const [isPayslipOpen, setIsPayslipOpen] = useState(false);
  const [signName, setSignName] = useState("");
  const [isCashPaid, setIsCashPaid] = useState(false);
  const [hasLoadedResultsOnce, setHasLoadedResultsOnce] = useState(false);
  const [hasPromptedAutoGenerate, setHasPromptedAutoGenerate] = useState(false);
  const autoGeneratePromptingRef = useRef(false);

  const loadData = async (nextFilters?: {
    keyword?: string;
    yearMonth?: string;
    calculationStatus?: string;
    reviewStatus?: string;
  }) => {
    const effectiveKeyword = nextFilters?.keyword ?? keyword;
    const effectiveYearMonth = nextFilters?.yearMonth ?? yearMonth;
    const effectiveCalculationStatus = nextFilters?.calculationStatus ?? calculationStatus;
    const effectiveReviewStatus = nextFilters?.reviewStatus ?? reviewStatus;

    setLoading(true);
    setError("");
    try {
      const nextResults = await fetchPayrollResults({
        keyword: effectiveKeyword,
        yearMonth: effectiveYearMonth,
        calculationStatus: effectiveCalculationStatus,
        reviewStatus: effectiveReviewStatus
      });
      setResults(nextResults);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "薪酬结果加载失败");
    } finally {
      setLoading(false);
      setHasLoadedResultsOnce(true);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadData();
    }, keyword.trim() ? 350 : 0);

    return () => window.clearTimeout(timer);
  }, [calculationStatus, keyword, reviewStatus, yearMonth]);

  useEffect(() => {
    setHasPromptedAutoGenerate(false);
    setHasLoadedResultsOnce(false);
  }, [yearMonth]);

  const runGenerateMonthly = async (employeeIds?: number[]) => {
    setSubmitting(true);
    try {
      await generateMonthlyPayroll(yearMonth, employeeIds);
      await loadData();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "批量生成薪酬失败");
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    const shouldPrompt =
      hasLoadedResultsOnce &&
      !loading &&
      !submitting &&
      !error &&
      !hasPromptedAutoGenerate &&
      results.length === 0 &&
      employees.length > 0 &&
      keyword.trim() === "" &&
      calculationStatus === "all" &&
      reviewStatus === "all";

    if (!shouldPrompt) {
      return;
    }

    if (autoGeneratePromptingRef.current) {
      return;
    }

    autoGeneratePromptingRef.current = true;
    setHasPromptedAutoGenerate(true);
    void (async () => {
      const confirmed = await confirm({
        title: "当前月份还没有薪酬结果",
        message: "是否现在为本月员工自动生成一次薪酬核算结果？",
        confirmText: "立即生成",
        cancelText: "稍后再说",
        tone: "default"
      });
      autoGeneratePromptingRef.current = false;
      if (!confirmed) {
        return;
      }

      await runGenerateMonthly();
    })();
  }, [calculationStatus, confirm, employees.length, error, hasLoadedResultsOnce, hasPromptedAutoGenerate, keyword, loading, results.length, reviewStatus, submitting, yearMonth]);

  const openPayslip = async (result: MonthlyPayrollResult) => {
    setSubmitting(true);
    try {
      const nextDetail = await fetchPayrollResultDetail(result.id);
      // v2 工资条是发放签收入口，必须用详情接口拿到员工、薪资项和汇总，不能用列表行直接确认。
      setPayslipDetail(nextDetail);
      setSignName("");
      setIsCashPaid(result.calculationStatus === "confirmed");
      setIsPayslipOpen(true);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "工资条加载失败");
    } finally {
      setSubmitting(false);
    }
  };

  const closePayslip = () => {
    setIsPayslipOpen(false);
    setPayslipDetail(null);
    setSignName("");
    setIsCashPaid(false);
  };

  const handleGenerateMonthly = async () => {
    const confirmed = await confirm({
      title: "确认生成薪酬结果",
      message: "将为当前筛选月份生成员工薪酬结果。已存在结果的员工不会重复生成，是否继续？",
      confirmText: "开始生成",
      cancelText: "取消",
      tone: "default"
    });
    if (!confirmed) {
      return;
    }

    await runGenerateMonthly();
  };

  const handleApprove = async (resultId: number) => {
    setSubmitting(true);
    try {
      const approvedResult = await approvePayrollResult(resultId);
      // 工资条弹窗内核对通过后要同步本地详情状态，避免用户必须关闭重开才能继续签收确认。
      setPayslipDetail((prev) => prev && prev.result.id === resultId ? { ...prev, result: approvedResult } : prev);
      await loadData();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "标记核对通过失败");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async (resultId: number) => {
    const reason = await prompt({
      title: "填写驳回原因",
      message: "可选填写驳回原因，留空则只更新状态。",
      confirmText: "提交驳回",
      cancelText: "取消",
      placeholder: "例如：请先校对餐补和扣款项",
      defaultValue: "",
      tone: "warning"
    });
    if (reason === null) {
      return;
    }

    setSubmitting(true);
    try {
      const rejectedResult = await rejectPayrollResult(resultId, reason || "");
      // 保持工资条弹窗和列表的同一条业务状态一致；驳回后用户仍可在弹窗查看原因上下文。
      setPayslipDetail((prev) => prev && prev.result.id === resultId ? { ...prev, result: rejectedResult } : prev);
      await loadData();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "驳回薪酬结果失败");
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirm = async (result: MonthlyPayrollResult) => {
    if (!isCashPaid || !signName.trim()) {
      setError("请先确认企业款项已足额支付，并填写员工或经办人签名");
      return;
    }

    const confirmed = await confirm({
      title: "确认工资条已签收发放",
      message: "确认后该员工本月薪酬将标记为已发放，薪资项和重算入口会锁定。是否确认？",
      confirmText: "核销并确认已发放",
      cancelText: "取消",
      tone: "danger"
    });
    if (!confirmed) {
      return;
    }

    setSubmitting(true);
    try {
      const confirmedResult = await confirmPayrollResult(result.id);
      setPayslipDetail((prev) => prev && prev.result.id === result.id ? { ...prev, result: confirmedResult } : prev);
      await loadData();
      closePayslip();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "确认薪酬结果失败");
    } finally {
      setSubmitting(false);
    }
  };

  const applyPayoutStatusFilter = (status: "all" | "pending" | "paid") => {
    // v2 薪资页按“待发放/已发放”理解状态；后端仍用 review/calculation 状态表达，前端只做映射，不把旧状态筛选暴露成主入口。
    const nextCalculationStatus = status === "paid" ? "confirmed" : "all";
    const nextReviewStatus = status === "pending" ? "pending" : "all";
    setCalculationStatus(nextCalculationStatus);
    setReviewStatus(nextReviewStatus);
    void loadData({ calculationStatus: nextCalculationStatus, reviewStatus: nextReviewStatus });
  };

  const handleExportCSV = () => {
    const headers = ["年月", "员工", "员工编号", "所属部门", "职位", "计薪方式", "有效工时", "加班时长", "加班费", "应发", "社保扣款", "扣款", "实发", "发放状态", "币种"];
    const rows = results.map((item) => [
      item.yearMonth,
      `"${item.employeeName}"`,
      item.employeeNo || "-",
      `"${item.employeeDept || "未分配"}"`,
      `"${item.employeeRole || "未设置职位"}"`,
      SALARY_TYPE_LABELS[item.salaryType],
      item.validHours.toFixed(2),
      item.overtimePayHours.toFixed(2),
      item.overtimePay.toFixed(2),
      item.grossPay.toFixed(2),
      item.socialSecurityAmount.toFixed(2),
      item.totalDeduction.toFixed(2),
      item.netPay.toFixed(2),
      item.calculationStatus === "confirmed" ? "已发放" : "待发放",
      item.currency
    ]);
    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `员工薪资报表_${yearMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const totals = useMemo(() => {
    return results.reduce(
      (acc, item) => {
        acc.gross += item.grossPay;
        acc.deduction += item.totalDeduction;
        acc.net += item.netPay;
        return acc;
      },
      { gross: 0, deduction: 0, net: 0 }
    );
  }, [results]);

  const displayCurrency = results[0]?.currency || employees[0]?.currency || "THB";
  const availableMonths = useMemo(() => {
    // v2 原型有“快捷月份 + 自定义月份”；这里基于当前月份和已加载结果生成快捷项，避免额外引入旧后台筛选字段。
    const monthSet = new Set<string>([yearMonth, getDefaultYearMonth(), ...results.map((item) => item.yearMonth)]);
    return Array.from(monthSet).sort((a, b) => b.localeCompare(a));
  }, [results, yearMonth]);
  const payrollMetrics = useMemo(() => {
    const confirmedCount = results.filter((item) => item.calculationStatus === "confirmed").length;
    const pendingCount = Math.max(0, results.length - confirmedCount);
    const totalHours = results.reduce((sum, item) => sum + item.validHours, 0);
    const totalOtHours = results.reduce((sum, item) => sum + item.overtimePayHours, 0);

    return {
      confirmedCount,
      pendingCount,
      totalHours,
      totalOtHours,
      progressPct: results.length > 0 ? (confirmedCount / results.length) * 100 : 0
    };
  }, [results]);
  const payoutFilter = calculationStatus === "confirmed" ? "paid" : reviewStatus === "pending" ? "pending" : "all";
  const payslipResult = payslipDetail?.result || null;
  const payslipEmployee = payslipDetail?.employee || null;
  const payslipWorkingDays = payslipResult && payslipResult.standardHours > 0 ? Math.round(payslipResult.validHours / payslipResult.standardHours) : 0;
  const payslipTaxOrDeduction = payslipResult ? Math.max(0, payslipResult.totalDeduction - payslipResult.socialSecurityAmount) : 0;


  return (
    <div className="h-full min-h-0 flex flex-col gap-6">
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-green-50 text-green-600 flex items-center justify-center font-bold shadow-inner">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-slate-800 text-base flex items-center gap-2">
              月份工资发放与核算
              <span className="px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 text-xs font-mono font-bold">
                {yearMonth}
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">以后端月度薪酬结果为准，按月份查看核算、核对与最终确认</p>
          </div>
        </div>

        <div className="w-full sm:w-auto flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">快捷月份:</span>
            <select
              value={yearMonth}
              onChange={(event) => {
                setYearMonth(event.target.value);
              }}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-mono text-sm focus:ring-2 focus:ring-brand-500 outline-none cursor-pointer"
            >
              {availableMonths.map((month) => (
                <option key={month} value={month}>{month}月</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">自定义:</span>
            <input
              type="month"
              value={yearMonth}
              onChange={(event) => {
                if (event.target.value) {
                  setYearMonth(event.target.value);
                }
              }}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-mono text-sm focus:ring-2 focus:ring-brand-500 outline-none cursor-pointer"
            />
          </div>

          <button
            onClick={handleExportCSV}
            disabled={results.length === 0}
            className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 transition flex items-center gap-1.5 shadow-sm ml-auto sm:ml-0 disabled:opacity-50"
          >
            <Download className="w-4 h-4 text-emerald-500" />
            <span>导出CSV表</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 relative overflow-hidden group hover:shadow-md transition">
          <div className="absolute top-0 right-0 p-3 text-brand-100 group-hover:text-brand-200 transition">
            <DollarSign className="w-14 h-14" />
          </div>
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">应发工资总额</p>
          <p className="text-2xl font-bold font-mono text-slate-800 mt-1">{formatCurrency(totals.gross, displayCurrency)}</p>
          <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-2">
            <TrendingUp className="w-3.5 h-3.5 text-blue-500" />
            <span>基于 {payrollMetrics.totalHours.toFixed(1)}h 正常工时核算</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 relative overflow-hidden group hover:shadow-md transition">
          <div className="absolute top-0 right-0 p-3 text-emerald-100 group-hover:text-emerald-200 transition">
            <CheckCircle2 className="w-14 h-14" />
          </div>
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">已完成发放（确认）</p>
          <p className="text-2xl font-bold font-mono text-emerald-600 mt-1">{formatCurrency(results.filter((item) => item.calculationStatus === "confirmed").reduce((sum, item) => sum + item.netPay, 0), displayCurrency)}</p>
          <div className="flex items-center gap-1 text-[10px] text-emerald-600/80 mt-2 font-medium">
            <Check className="w-3.5 h-3.5" />
            <span>包含 {payrollMetrics.confirmedCount} 名已确认员工</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 relative overflow-hidden group hover:shadow-md transition">
          <div className="absolute top-0 right-0 p-3 text-amber-100 group-hover:text-amber-200 transition">
            <AlertCircle className="w-14 h-14" />
          </div>
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">未发放（待结）总额</p>
          <p className="text-2xl font-bold font-mono text-amber-600 mt-1">{formatCurrency(Math.max(0, totals.net - results.filter((item) => item.calculationStatus === "confirmed").reduce((sum, item) => sum + item.netPay, 0)), displayCurrency)}</p>
          <div className="flex items-center gap-1 text-[10px] text-amber-600 mt-2 font-medium">
            <Clock className="w-3.5 h-3.5" />
            <span>还有 {payrollMetrics.pendingCount} 人待支付</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 relative overflow-hidden group hover:shadow-md transition">
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">工资发放核销进度</p>
          <div className="flex items-center justify-between mt-1">
            <p className="text-2xl font-bold text-slate-800">{payrollMetrics.progressPct.toFixed(0)}%</p>
            <span className="text-xs bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-full font-mono">
              {payrollMetrics.confirmedCount} / {results.length} 人
            </span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-brand-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${payrollMetrics.progressPct}%` }}
            />
          </div>
        </div>
      </div>

      <div className="glass-panel rounded-xl overflow-hidden min-h-0 flex flex-1 flex-col">
        {/* 薪资列表同样按 Header / Content 分层：筛选搜索条固定，长表格只在内容区滚动，避免搜索入口被表格行顶走。 */}
        <div className="p-4 bg-slate-50 border-b border-slate-100 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => applyPayoutStatusFilter("all")}
              className={cn("px-3 py-1.5 text-xs font-semibold rounded-lg transition-all", payoutFilter === "all" ? "bg-brand-600 text-white shadow-sm" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100")}
            >
              全部员工 ({results.length})
            </button>
            <button
              onClick={() => applyPayoutStatusFilter("pending")}
              className={cn("px-3 py-1.5 text-xs font-semibold rounded-lg transition-all", payoutFilter === "pending" ? "bg-amber-500 text-white shadow-sm" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100")}
            >
              ⏳ 待发放 ({payrollMetrics.pendingCount})
            </button>
            <button
              onClick={() => applyPayoutStatusFilter("paid")}
              className={cn("px-3 py-1.5 text-xs font-semibold rounded-lg transition-all", payoutFilter === "paid" ? "bg-emerald-600 text-white shadow-sm" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100")}
            >
              ✅ 已发放 ({payrollMetrics.confirmedCount})
            </button>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative">
              <input
                type="text"
                value={keyword}
                onChange={(event) => {
                  setKeyword(event.target.value);
                }}
                placeholder="搜索员工、编号..."
                className="w-full sm:w-64 pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-brand-500"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
        {loading ? (
          <div className="px-6 py-10 text-center text-sm text-slate-500">正在加载薪酬结果...</div>
        ) : results.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Receipt className="w-12 h-12 text-slate-200 mx-auto mb-3" />
            <p className="text-sm">没有找到符合筛选条件的员工薪资数据</p>
            <p className="text-xs text-slate-300 mt-1">请核对是否已为该月份 "{yearMonth}" 录入过任何员工的出勤卡</p>
          </div>
        ) : (
          <div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 text-slate-500 text-xs uppercase border-b border-slate-100">
                    <th className="px-6 py-3.5 font-semibold">员工详情</th>
                    <th className="px-4 py-3.5 font-semibold text-center">上班天数</th>
                    <th className="px-4 py-3.5 font-semibold text-center">有效工时</th>
                    <th className="px-4 py-3.5 font-semibold text-center text-blue-500">加班</th>
                    <th className="px-4 py-3.5 font-semibold text-center text-blue-600">总加班时长</th>
                    <th className="px-6 py-3.5 font-semibold text-right">计算基薪 (应发)</th>
                    <th className="px-6 py-3.5 font-semibold text-right text-green-600">加班费</th>
                    <th className="px-6 py-3.5 font-semibold text-right text-blue-700">税后实发 (总额)</th>
                    <th className="px-6 py-3.5 font-semibold text-center">发放状态 / 动作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {results.map((item) => {
                    // v2 原型展示“上班天数”；正式接口当前给的是月度汇总工时，因此按标准工时折算天数，后续接口若返回天数再直接替换这里。
                    const workingDays = item.standardHours > 0 ? Math.round(item.validHours / item.standardHours) : 0;
                    const isPaid = item.calculationStatus === "confirmed";
                    const baseSalary = item.salaryType === "fixed"
                      ? formatCurrency(item.fixedSalary || 0, item.currency)
                      : formatCurrency(item.hourlyPay, item.currency);

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/70 border-b border-slate-100 bg-white transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold overflow-hidden border-2 border-white shadow-sm flex-shrink-0">
                              {item.employeePhoto ? (
                                <img src={item.employeePhoto} className="w-full h-full object-cover" alt="" />
                              ) : (
                                <span style={{ fontSize: "14.4px" }}>{item.employeeName.charAt(0)}</span>
                              )}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900 truncate max-w-[150px]">{item.employeeName}</p>
                              <p className="text-[10px] text-slate-400 mt-0.5">{item.employeeDept || "未分配"} · {item.employeeRole || "未设置职位"}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold font-mono text-xs">
                            {workingDays} 天
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center text-xs font-mono text-slate-600">
                          {formatDuration(item.validHours)}
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 font-semibold font-mono text-xs">
                            {item.overtimePayHours > 0 ? "1" : "0"} 次
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center text-xs font-mono text-blue-600 font-bold">
                          {formatDuration(item.overtimePayHours)}
                        </td>
                        <td className="px-6 py-4 text-right text-xs font-mono text-slate-600">
                          {baseSalary}
                        </td>
                        <td className="px-6 py-4 text-right text-xs font-mono text-green-600 font-semibold">
                          {formatCurrency(item.overtimePay, item.currency)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-sm font-bold font-mono text-blue-800">
                            {formatCurrency(item.netPay, item.currency)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <div className="flex items-center justify-center gap-1.5">
                              <span className={cn(
                                "inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-lg border",
                                isPaid ? "text-emerald-700 bg-emerald-50 border-emerald-100" : "text-amber-700 bg-amber-50 border-amber-100"
                              )}>
                                {isPaid ? <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" /> : null}
                                {isPaid ? "已发放" : "待发放"}
                              </span>
                              <button
                                onClick={() => void openPayslip(item)}
                                disabled={submitting}
                                className={cn(
                                  "px-2.5 py-1 text-xs font-semibold rounded-lg transition flex items-center gap-1 disabled:opacity-50",
                                  isPaid
                                    ? "text-brand-700 bg-brand-50 border border-brand-100 hover:bg-brand-100"
                                    : "text-white bg-brand-600 hover:bg-brand-700 shadow-sm hover:shadow"
                                )}
                              >
                                <Receipt className="w-3 h-3" />
                                <span>{isPaid ? "查看工资条" : "生成工资条"}</span>
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center text-xs text-slate-500">
              <div>
                当前列表共显示 <span className="font-bold text-slate-700">{results.length}</span> 名员工的计算记录
              </div>
              <div>
                薪资发放由人事及仓库管理员校对后，可通过<span className="font-bold text-slate-700">【生成工资条】</span>开启独立签收单，一键核对实缴
              </div>
            </div>
          </div>
        )}
        </div>
      </div>


      <Modal
        isOpen={isPayslipOpen}
        title="员工工资发放明细单"
        onClose={closePayslip}
        className="max-w-lg"
        footer={payslipResult ? (
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button type="button" onClick={closePayslip} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">
              取消
            </button>
            <div className="flex flex-wrap justify-end gap-2">
              {payslipResult.calculationStatus !== "confirmed" ? (
                <button
                  type="button"
                  onClick={() => void handleReject(payslipResult.id)}
                  disabled={submitting || payslipResult.calculationStatus === "blocked"}
                  className="px-4 py-2 rounded-lg border border-rose-200 bg-white text-sm text-rose-600 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  驳回
                </button>
              ) : null}
              {payslipResult.calculationStatus !== "confirmed" && payslipResult.reviewStatus !== "approved" ? (
                <button
                  type="button"
                  onClick={() => void handleApprove(payslipResult.id)}
                  disabled={submitting || payslipResult.calculationStatus === "blocked"}
                  className="px-4 py-2 rounded-lg border border-emerald-200 bg-emerald-50 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  核对通过
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => void handleConfirm(payslipResult)}
                disabled={submitting || payslipResult.calculationStatus === "confirmed" || payslipResult.reviewStatus !== "approved" || !isCashPaid || !signName.trim()}
                className="px-4 py-2 rounded-lg bg-brand-600 text-sm font-bold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {payslipResult.calculationStatus === "confirmed" ? "已确认发放" : "核销并确认已发放"}
              </button>
            </div>
          </div>
        ) : null}
      >
        {payslipResult ? (
          <div className="space-y-5 text-sm text-slate-700">
            <div className="rounded-xl bg-brand-600 p-4 text-white">
              <span className="rounded-full bg-brand-500/50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-100">
                MONTHLY SALARY RECEIPT
              </span>
              <h3 className="mt-1 text-lg font-bold">员工工资发放明细单</h3>
              <p className="mt-0.5 text-xs text-brand-100">月份：{payslipResult.yearMonth} · 核对及现场发放核销</p>
            </div>

            <div className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3">
              <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold overflow-hidden border">
                {payslipEmployee?.photo ? (
                  <img src={payslipEmployee.photo} className="w-full h-full object-cover" alt="" />
                ) : (
                  <span>{payslipResult.employeeName.charAt(0)}</span>
                )}
              </div>
              <div>
                <p className="text-base font-bold text-slate-800">{payslipResult.employeeName}</p>
                <p className="text-xs text-slate-500">{payslipEmployee?.dept || "全区"} · {payslipEmployee?.role || SALARY_TYPE_LABELS[payslipResult.salaryType]}</p>
              </div>
              <div className="ml-auto text-right">
                <span className="block font-mono text-xs text-slate-400">ID: {payslipResult.employeeNo || `#${payslipResult.employeeId}`}</span>
                <span className={cn("mt-1 inline-block rounded px-2 py-0.5 text-xs font-semibold", REVIEW_STATUS_META[payslipResult.reviewStatus]?.className)}>
                  {REVIEW_STATUS_META[payslipResult.reviewStatus]?.label || payslipResult.reviewStatus}
                </span>
              </div>
            </div>

            <div className="space-y-2 border-y border-dashed border-slate-200 py-3.5 font-mono text-xs">
              <div className="flex justify-between"><span className="text-slate-500">标准计薪时限 (每日):</span><span className="font-semibold text-slate-800">{formatDuration(payslipResult.standardHours)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">本月有效上班天数:</span><span className="font-bold text-slate-800">{payslipWorkingDays} 天</span></div>
              <div className="flex justify-between"><span className="text-slate-500">本月累计上班工时:</span><span className="font-semibold text-slate-800">{formatDuration(payslipResult.validHours)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">本月有效加班工时:</span><span className="font-bold text-blue-600">{formatDuration(payslipResult.overtimePayHours)}</span></div>
            </div>

            <div className="space-y-2 text-xs">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">应纳发计算说明</p>
              <div className="space-y-2 rounded-lg bg-slate-50 p-3 font-mono">
                <div className="flex justify-between"><span className="text-slate-500">计算基薪:</span><span className="font-bold text-slate-800 text-right">{formatCurrency(payslipResult.hourlyPay, payslipResult.currency)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">加班应得:</span><span className="font-bold text-green-600 text-right">+ {formatCurrency(payslipResult.overtimePay, payslipResult.currency)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">补贴/其他:</span><span className="font-bold text-slate-800 text-right">+ {formatCurrency(payslipResult.allowanceTotal + payslipResult.otherTotal, payslipResult.currency)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">社保扣款:</span><span className="text-red-500 text-right">- {formatCurrency(payslipResult.socialSecurityAmount, payslipResult.currency)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">其他扣款:</span><span className="text-red-500 text-right">- {formatCurrency(payslipTaxOrDeduction, payslipResult.currency)}</span></div>
              </div>
            </div>

            <div className="rounded-xl border border-brand-100 bg-brand-50 p-4 text-center">
              <span className="block text-xs font-bold text-brand-600">本月实际应发放</span>
              <p className="font-mono text-3xl font-extrabold text-brand-800">{formatCurrency(payslipResult.netPay, payslipResult.currency)}</p>
              <span className="block text-[10px] text-brand-500">发放币种：{payslipResult.currency}</span>
            </div>

            <div className="space-y-3 rounded-lg border border-slate-200/60 bg-slate-50 p-3.5">
              <div className="flex items-start gap-2.5">
                <input
                  type="checkbox"
                  id="isCashPaidCheckbox"
                  checked={isCashPaid}
                  onChange={(event) => setIsCashPaid(event.target.checked)}
                  disabled={payslipResult.calculationStatus === "confirmed"}
                  className="mt-0.5 h-4 w-4 cursor-pointer rounded border-slate-300 text-brand-600 focus:ring-brand-500 disabled:cursor-not-allowed"
                />
                <label htmlFor="isCashPaidCheckbox" className="cursor-pointer select-none text-xs font-semibold text-slate-600">
                  确认企业款项已足额支付（现金发放或网银已转账）
                </label>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500">员工电子签名/HR 签章核销:</label>
                <input
                  type="text"
                  placeholder="输入经办人或员工签名 (如: Thin Thin / HR)"
                  value={signName}
                  onChange={(event) => setSignName(event.target.value)}
                  disabled={payslipResult.calculationStatus === "confirmed"}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs outline-none placeholder-slate-400 focus:border-transparent focus:ring-2 focus:ring-brand-500 disabled:bg-slate-100"
                />
              </div>
              {payslipResult.reviewStatus !== "approved" && payslipResult.calculationStatus !== "confirmed" ? (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                  需要先核对通过，才能完成签收发放确认。
                </p>
              ) : null}
            </div>
          </div>
        ) : null}
      </Modal>

    </div>
  );
}
