/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { type FormEvent, type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, BadgeCheck, Eye, RefreshCw, Search } from "lucide-react";
import type {
  Employee,
  MonthlyPayrollResult,
  PayrollResultDetail,
  SalaryAdjustmentItem,
  SalaryAdjustmentPayload,
  SalaryAdjustmentType
} from "../types";
import {
  approvePayrollResult,
  confirmPayrollResult,
  createSalaryAdjustmentItem,
  deleteSalaryAdjustmentItem,
  fetchPayrollResultDetail,
  fetchPayrollResults,
  fetchSalaryAdjustmentItems,
  generateMonthlyPayroll,
  recalculateMonthlyPayroll,
  recalculateOnePayroll,
  rejectPayrollResult,
  updateSalaryAdjustmentItem
} from "../lib/api";
import { useDialog } from "./DialogProvider";
import { ModalShell } from "./ModalShell";
import { cn, formatCurrency, formatDateTime, formatDuration, SALARY_TYPE_LABELS } from "../lib/utils";
import { Pagination } from "./Pagination";

interface PayrollTableProps {
  employees: Employee[];
}

const CALCULATION_STATUS_META: Record<string, { label: string; className: string }> = {
  draft: { label: "草稿", className: "bg-slate-100 text-slate-700" },
  calculated: { label: "已计算", className: "bg-blue-100 text-blue-700" },
  blocked: { label: "需重算", className: "bg-red-100 text-red-700" },
  confirmed: { label: "已确认", className: "bg-emerald-100 text-emerald-700" }
};

const REVIEW_STATUS_META: Record<string, { label: string; className: string }> = {
  pending: { label: "待核对", className: "bg-amber-100 text-amber-700" },
  approved: { label: "已通过", className: "bg-emerald-100 text-emerald-700" },
  rejected: { label: "已驳回", className: "bg-rose-100 text-rose-700" }
};

const PAYROLL_PAGE_SIZE = 8;

const ADJUSTMENT_TYPE_META: Record<SalaryAdjustmentType, { label: string; className: string }> = {
  allowance: { label: "补贴", className: "bg-emerald-50 text-emerald-700" },
  deduction: { label: "扣款", className: "bg-rose-50 text-rose-700" },
  other: { label: "其他", className: "bg-sky-50 text-sky-700" }
};

function getDefaultYearMonth() {
  return new Date().toISOString().slice(0, 7);
}

function isSalaryAdjustmentLocked(result: MonthlyPayrollResult | null) {
  return result?.calculationStatus === "confirmed" || result?.reviewStatus === "approved";
}

function getSalaryAdjustmentLockMessage(result: MonthlyPayrollResult | null) {
  if (result?.calculationStatus === "confirmed") {
    return "该薪酬结果已确认，薪资项已锁定";
  }
  if (result?.reviewStatus === "approved") {
    return "该薪酬结果已核对通过，薪资项已锁定";
  }
  return "";
}

function isPayrollRecalculateLocked(result: MonthlyPayrollResult) {
  return result.calculationStatus === "confirmed" || result.reviewStatus === "approved";
}

function getPayrollRecalculateLockMessage(result: MonthlyPayrollResult) {
  if (result.calculationStatus === "confirmed") {
    return "已确认的薪酬结果不能重算";
  }
  if (result.reviewStatus === "approved") {
    return "已核对通过，需先驳回后再重算";
  }
  return "重新计算";
}

function Modal({
  isOpen,
  title,
  onClose,
  children,
  className = "max-w-6xl"
}: {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <ModalShell isOpen={isOpen} onClose={onClose} title={title} className={className} bodyClassName="overflow-y-auto">
      {children}
    </ModalShell>
  );
}

type SalaryAdjustmentFormState = Omit<SalaryAdjustmentPayload, "amount"> & {
  amount: number | "";
};

const DEFAULT_ADJUSTMENT_FORM: SalaryAdjustmentFormState = {
  employeeId: 0,
  yearMonth: "",
  type: "allowance",
  name: "",
  amount: 0,
  note: ""
};

export function PayrollTable({ employees }: PayrollTableProps) {
  const { confirm, prompt } = useDialog();
  const [keyword, setKeyword] = useState("");
  const [yearMonth, setYearMonth] = useState(getDefaultYearMonth());
  const [salaryType, setSalaryType] = useState("all");
  const [calculationStatus, setCalculationStatus] = useState("all");
  const [reviewStatus, setReviewStatus] = useState("all");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState<MonthlyPayrollResult[]>([]);
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [detail, setDetail] = useState<PayrollResultDetail | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [adjustmentItems, setAdjustmentItems] = useState<SalaryAdjustmentItem[]>([]);
  const [isAdjustmentListOpen, setIsAdjustmentListOpen] = useState(false);
  const [adjustmentTarget, setAdjustmentTarget] = useState<MonthlyPayrollResult | null>(null);
  const [editingAdjustment, setEditingAdjustment] = useState<SalaryAdjustmentItem | null>(null);
  const [isAdjustmentFormOpen, setIsAdjustmentFormOpen] = useState(false);
  const [adjustmentForm, setAdjustmentForm] = useState<SalaryAdjustmentFormState>(DEFAULT_ADJUSTMENT_FORM);
  const [adjustmentFormError, setAdjustmentFormError] = useState("");
  const [hasLoadedResultsOnce, setHasLoadedResultsOnce] = useState(false);
  const [hasPromptedAutoGenerate, setHasPromptedAutoGenerate] = useState(false);
  const autoGeneratePromptingRef = useRef(false);

  const loadData = async (nextFilters?: {
    keyword?: string;
    yearMonth?: string;
    salaryType?: string;
    calculationStatus?: string;
    reviewStatus?: string;
  }) => {
    const effectiveKeyword = nextFilters?.keyword ?? keyword;
    const effectiveYearMonth = nextFilters?.yearMonth ?? yearMonth;
    const effectiveSalaryType = nextFilters?.salaryType ?? salaryType;
    const effectiveCalculationStatus = nextFilters?.calculationStatus ?? calculationStatus;
    const effectiveReviewStatus = nextFilters?.reviewStatus ?? reviewStatus;

    setLoading(true);
    setError("");
    try {
      const nextResults = await fetchPayrollResults({
        keyword: effectiveKeyword,
        yearMonth: effectiveYearMonth,
        salaryType: effectiveSalaryType,
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
  }, [calculationStatus, keyword, reviewStatus, salaryType, yearMonth]);

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
      salaryType === "all" &&
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
  }, [calculationStatus, confirm, employees.length, error, hasLoadedResultsOnce, hasPromptedAutoGenerate, keyword, loading, results.length, reviewStatus, salaryType, submitting, yearMonth]);

  const openDetail = async (resultId: number) => {
    setSubmitting(true);
    try {
      const nextDetail = await fetchPayrollResultDetail(resultId);
      setDetail(nextDetail);
      setIsDetailOpen(true);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "薪酬详情加载失败");
    } finally {
      setSubmitting(false);
    }
  };

  const openAdjustmentList = async (result: MonthlyPayrollResult) => {
    setSubmitting(true);
    try {
      const items = await fetchSalaryAdjustmentItems({ employeeId: result.employeeId, yearMonth: result.yearMonth });
      setAdjustmentTarget(result);
      setAdjustmentItems(items);
      setIsAdjustmentListOpen(true);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "一次性薪资项加载失败");
    } finally {
      setSubmitting(false);
    }
  };

  const reloadAdjustments = async (target = adjustmentTarget) => {
    if (!target) {
      return;
    }
    const items = await fetchSalaryAdjustmentItems({ employeeId: target.employeeId, yearMonth: target.yearMonth });
    setAdjustmentItems(items);
  };

  const openCreateAdjustment = () => {
    if (!adjustmentTarget) {
      return;
    }
    if (isSalaryAdjustmentLocked(adjustmentTarget)) {
      setError(getSalaryAdjustmentLockMessage(adjustmentTarget));
      return;
    }
    setAdjustmentFormError("");
    setEditingAdjustment(null);
    setAdjustmentForm({
      employeeId: adjustmentTarget.employeeId,
      yearMonth: adjustmentTarget.yearMonth,
      type: "allowance",
      name: "",
      amount: "",
      note: ""
    });
    setIsAdjustmentFormOpen(true);
  };

  const openEditAdjustment = (item: SalaryAdjustmentItem) => {
    if (isSalaryAdjustmentLocked(adjustmentTarget)) {
      setError(getSalaryAdjustmentLockMessage(adjustmentTarget));
      return;
    }
    setAdjustmentFormError("");
    setEditingAdjustment(item);
    setAdjustmentForm({
      employeeId: item.employeeId,
      yearMonth: item.yearMonth,
      type: item.type,
      name: item.name,
      amount: item.amount,
      note: item.note
    });
    setIsAdjustmentFormOpen(true);
  };

  const handleSaveAdjustment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSalaryAdjustmentLocked(adjustmentTarget)) {
      setError(getSalaryAdjustmentLockMessage(adjustmentTarget));
      return;
    }

    setAdjustmentFormError("");
    const amount = adjustmentForm.amount === "" ? Number.NaN : Number(adjustmentForm.amount);
    if (Number.isNaN(amount) || amount < 0) {
      setAdjustmentFormError("请填写大于等于 0 的薪资项金额");
      return;
    }

    setSubmitting(true);
    try {
      const payload: SalaryAdjustmentPayload = {
        ...adjustmentForm,
        amount
      };

      if (editingAdjustment) {
        await updateSalaryAdjustmentItem(editingAdjustment.id, payload);
      } else {
        await createSalaryAdjustmentItem(payload);
      }
      setIsAdjustmentFormOpen(false);
      setAdjustmentFormError("");
      await reloadAdjustments();
      await loadData();
    } catch (nextError) {
      setAdjustmentFormError(nextError instanceof Error ? nextError.message : "一次性薪资项保存失败");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAdjustment = async (item: SalaryAdjustmentItem) => {
    if (isSalaryAdjustmentLocked(adjustmentTarget)) {
      setError(getSalaryAdjustmentLockMessage(adjustmentTarget));
      return;
    }

    const confirmed = await confirm({
      title: "确认删除一次性薪资项",
      message: "删除后该项目将不再计入当前自然月薪酬。是否确认删除？",
      confirmText: "确认删除",
      cancelText: "保留项目",
      tone: "danger"
    });
    if (!confirmed) {
      return;
    }

    setSubmitting(true);
    try {
      await deleteSalaryAdjustmentItem(item.id);
      await reloadAdjustments();
      await loadData();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "一次性薪资项删除失败");
    } finally {
      setSubmitting(false);
    }
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

  const handleRecalculateMonthly = async () => {
    const confirmed = await confirm({
      title: "确认重算月度薪酬",
      message: "将重新计算当前筛选月份的薪酬结果。若薪资配置、考勤汇总或一次性薪资项已变化，结果金额可能变化。是否继续？",
      confirmText: "重算本月",
      cancelText: "取消",
      tone: "warning"
    });
    if (!confirmed) {
      return;
    }

    setSubmitting(true);
    try {
      const response = await recalculateMonthlyPayroll(yearMonth);
      await loadData();
      if (response.failureCount > 0) {
        const firstFailure = response.failures[0];
        setError(`本月薪酬重算完成 ${response.successCount} 条，失败 ${response.failureCount} 条。${firstFailure ? `首个失败原因：${firstFailure.error}` : ""}`);
      }
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "批量重算薪酬失败");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecalculateOne = async (result: MonthlyPayrollResult) => {
    if (isPayrollRecalculateLocked(result)) {
      setError(getPayrollRecalculateLockMessage(result));
      return;
    }

    const confirmed = await confirm({
      title: "确认重算当前员工薪酬",
      message: "将根据当前薪资配置、自然月考勤汇总和一次性薪资项重新计算该员工薪酬。是否继续？",
      confirmText: "确认重算",
      cancelText: "取消",
      tone: "warning"
    });
    if (!confirmed) {
      return;
    }

    setSubmitting(true);
    try {
      await recalculateOnePayroll(result.employeeId, result.yearMonth);
      await loadData();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "单个员工薪酬重算失败");
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (resultId: number) => {
    setSubmitting(true);
    try {
      await approvePayrollResult(resultId);
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
      await rejectPayrollResult(resultId, reason || "");
      await loadData();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "驳回薪酬结果失败");
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirm = async (result: MonthlyPayrollResult) => {
    const confirmed = await confirm({
      title: "确认本月最终薪酬",
      message: "确认后该薪酬结果将作为本月最终核算结果。是否确认？",
      confirmText: "确认生效",
      cancelText: "取消",
      tone: "danger"
    });
    if (!confirmed) {
      return;
    }

    setSubmitting(true);
    try {
      await confirmPayrollResult(result.id);
      await loadData();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "确认薪酬结果失败");
    } finally {
      setSubmitting(false);
    }
  };

  const resetFilters = () => {
    const next = {
      keyword: "",
      yearMonth: getDefaultYearMonth(),
      salaryType: "all",
      calculationStatus: "all",
      reviewStatus: "all"
    };
    setKeyword(next.keyword);
    setYearMonth(next.yearMonth);
    setSalaryType(next.salaryType);
    setCalculationStatus(next.calculationStatus);
    setReviewStatus(next.reviewStatus);
    setPage(1);
    void loadData(next);
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
  const adjustmentLocked = isSalaryAdjustmentLocked(adjustmentTarget);
  const adjustmentLockMessage = getSalaryAdjustmentLockMessage(adjustmentTarget);
  const totalPages = Math.max(1, Math.ceil(results.length / PAYROLL_PAGE_SIZE));
  const paginatedResults = useMemo(() => {
    const start = (page - 1) * PAYROLL_PAGE_SIZE;
    return results.slice(start, start + PAYROLL_PAGE_SIZE);
  }, [page, results]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  return (
    <div className="space-y-6">
      <div className="glass-panel rounded-xl p-5">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[minmax(260px,1.5fr)_160px_160px_160px_160px_120px]">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1 uppercase">搜索</label>
              <div className="relative">
                <input
                  type="text"
                  value={keyword}
                  onChange={(event) => {
                    setKeyword(event.target.value);
                    setPage(1);
                  }}
                  placeholder="搜索员工姓名、员工编号..."
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg bg-white text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                />
                <Search className="w-5 h-5 absolute left-3 top-2.5 text-slate-400" />
              </div>
            </div>
            <Field label="年月">
              <input
                type="month"
                value={yearMonth}
                onChange={(event) => {
                  setYearMonth(event.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg bg-white text-sm focus:ring-2 focus:ring-brand-500 outline-none"
              />
            </Field>
            <Field label="计薪方式">
              <select
                value={salaryType}
                onChange={(event) => {
                  setSalaryType(event.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg bg-white text-sm focus:ring-2 focus:ring-brand-500 outline-none"
              >
                <option value="all">全部方式</option>
                <option value="fixed">固定工资</option>
                <option value="hourly">时薪</option>
              </select>
            </Field>
            <Field label="计算状态">
              <select
                value={calculationStatus}
                onChange={(event) => {
                  setCalculationStatus(event.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg bg-white text-sm focus:ring-2 focus:ring-brand-500 outline-none"
              >
                <option value="all">全部状态</option>
                <option value="calculated">已计算</option>
                <option value="confirmed">已确认</option>
              </select>
            </Field>
            <Field label="核对状态">
              <select
                value={reviewStatus}
                onChange={(event) => {
                  setReviewStatus(event.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg bg-white text-sm focus:ring-2 focus:ring-brand-500 outline-none"
              >
                <option value="all">全部状态</option>
                <option value="pending">待核对</option>
                <option value="approved">已通过</option>
                <option value="rejected">已驳回</option>
              </select>
            </Field>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1 uppercase">操作</label>
              <button onClick={resetFilters} className="w-full px-3 py-2.5 rounded-lg border border-slate-300 bg-white text-sm text-slate-700 hover:bg-slate-50">
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
        <SummaryCard label="应发总额" value={formatCurrency(totals.gross, displayCurrency)} />
        <SummaryCard label="扣款总额" value={formatCurrency(totals.deduction, displayCurrency)} tone={totals.deduction > 0 ? "danger" : "neutral"} />
        <SummaryCard label="实发总额" value={formatCurrency(totals.net, displayCurrency)} />
      </div>

      <div className="glass-panel rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 bg-white">
          <h3 className="text-sm font-semibold text-slate-800">月度薪酬结果</h3>
          <p className="text-xs text-slate-400 mt-1">正式结果以后端月度薪酬为准，不再直接遍历原始考勤记录计算</p>
        </div>

        {loading ? (
          <div className="px-6 py-10 text-center text-sm text-slate-500">正在加载薪酬结果...</div>
        ) : results.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <div className="flex flex-col items-center gap-3">
              <p className="text-sm text-slate-500">当前条件下还没有薪酬结果</p>
              <button
                onClick={() => void handleGenerateMonthly()}
                disabled={submitting}
                className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm hover:bg-brand-700 disabled:opacity-60"
              >
                立即生成本月薪酬
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="grid grid-cols-1 gap-4 p-5 xl:grid-cols-2">
              {paginatedResults.map((item) => {
                const baseSalary = item.salaryType === "fixed"
                  ? formatCurrency(item.fixedSalary || 0, item.currency)
                  : formatCurrency(item.hourlyPay, item.currency);

                return (
                  <div key={item.id} className={cn("rounded-xl border border-slate-200 bg-white p-4 transition hover:shadow-md", item.calculationStatus === "blocked" && "border-red-200 bg-red-50/30")}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-bold text-slate-800">{item.employeeName}</h3>
                          <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">{item.yearMonth}</span>
                          <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">{SALARY_TYPE_LABELS[item.salaryType]}</span>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span className={cn("rounded-full px-2 py-1 text-xs font-medium", CALCULATION_STATUS_META[item.calculationStatus]?.className || "bg-slate-100 text-slate-700")}>
                            {CALCULATION_STATUS_META[item.calculationStatus]?.label || item.calculationStatus}
                          </span>
                          <span className={cn("rounded-full px-2 py-1 text-xs font-medium", REVIEW_STATUS_META[item.reviewStatus]?.className || "bg-slate-100 text-slate-700")}>
                            {REVIEW_STATUS_META[item.reviewStatus]?.label || item.reviewStatus}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <TooltipButton label="查看详情" onClick={() => void openDetail(item.id)} className="p-2 text-slate-500">
                          <Eye className="w-4 h-4" />
                        </TooltipButton>
                        <TooltipButton
                          label={isSalaryAdjustmentLocked(item) ? "查看一次性薪资项（已锁定）" : "管理一次性薪资项"}
                          onClick={() => void openAdjustmentList(item)}
                          className="px-3 py-2 text-xs text-slate-600"
                        >
                          薪资项
                        </TooltipButton>
                        <TooltipButton label={getPayrollRecalculateLockMessage(item)} onClick={() => void handleRecalculateOne(item)} disabled={isPayrollRecalculateLocked(item)} className="p-2 text-slate-500">
                          <RefreshCw className="w-4 h-4" />
                        </TooltipButton>
                        <TooltipButton label="核对通过" onClick={() => void handleApprove(item.id)} disabled={item.calculationStatus === "blocked" || item.calculationStatus === "confirmed" || item.reviewStatus === "approved"} className="p-2 text-emerald-600">
                          <BadgeCheck className="w-4 h-4" />
                        </TooltipButton>
                        <TooltipButton label="驳回薪资结果" onClick={() => void handleReject(item.id)} disabled={item.calculationStatus === "confirmed"} className="px-3 py-2 text-xs text-rose-600">
                          驳回
                        </TooltipButton>
                        <TooltipButton label="确认最终薪酬" onClick={() => void handleConfirm(item)} disabled={item.calculationStatus !== "calculated" || item.reviewStatus !== "approved"} className="px-3 py-2 text-xs text-white bg-slate-900 hover:bg-slate-800">
                          确认
                        </TooltipButton>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                      <PayrollInfo label="有效工时" value={formatDuration(item.validHours)} mono />
                      <PayrollInfo label="时薪" value={item.hourlyRate === null ? "-" : formatCurrency(item.hourlyRate, item.currency)} mono />
                      <PayrollInfo label="薪资" value={baseSalary} mono />
                      <PayrollInfo label="加班时间" value={formatDuration(item.overtimePayHours)} mono highlight />
                      <PayrollInfo label="加班费" value={formatCurrency(item.overtimePay, item.currency)} mono highlight />
                      <PayrollInfo label="补贴 / 扣款" value={`${formatCurrency(item.allowanceTotal, item.currency)} / -${formatCurrency(item.totalDeduction, item.currency)}`} mono />
                      <PayrollInfo label="应发" value={formatCurrency(item.grossPay, item.currency)} mono strong />
                    </div>
                  </div>
                );
              })}
            </div>

            <Pagination
              page={page}
              pageSize={PAYROLL_PAGE_SIZE}
              total={results.length}
              itemName="条薪酬结果"
              className="mx-5 mb-5"
              onPageChange={setPage}
            />
          </div>
        )}
      </div>

      <Modal isOpen={isDetailOpen} title="薪酬结果详情" onClose={() => setIsDetailOpen(false)}>
        {detail ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 text-sm">
              <DetailItem label="员工">{detail.result.employeeName}</DetailItem>
              <DetailItem label="员工编号">{detail.result.employeeNo || "-"}</DetailItem>
              <DetailItem label="年月">{detail.result.yearMonth}</DetailItem>
              <DetailItem label="计薪方式">{SALARY_TYPE_LABELS[detail.result.salaryType]}</DetailItem>
              <DetailItem label="固定工资">{detail.result.fixedSalary === null ? "-" : formatCurrency(detail.result.fixedSalary, detail.result.currency)}</DetailItem>
              <DetailItem label="时薪">{detail.result.hourlyRate === null ? "-" : formatCurrency(detail.result.hourlyRate, detail.result.currency)}</DetailItem>
              <DetailItem label="计算状态">{CALCULATION_STATUS_META[detail.result.calculationStatus]?.label || detail.result.calculationStatus}</DetailItem>
              <DetailItem label="核对状态">{REVIEW_STATUS_META[detail.result.reviewStatus]?.label || detail.result.reviewStatus}</DetailItem>
            </div>

            <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <h4 className="text-sm font-semibold text-slate-800 mb-3">考勤汇总输入</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <DetailItem label="有效工时">{formatDuration(detail.result.validHours)}</DetailItem>
                <DetailItem label="标准工时">{formatDuration(detail.result.standardHours)}</DetailItem>
                <DetailItem label="加班计薪">{formatDuration(detail.result.overtimePayHours)}</DetailItem>
                <DetailItem label="加班费">{formatCurrency(detail.result.overtimePay, detail.result.currency)}</DetailItem>
              </div>
            </section>

            <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <h4 className="text-sm font-semibold text-slate-800 mb-3">金额构成</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <DetailItem label="时薪工资">{formatCurrency(detail.result.hourlyPay, detail.result.currency)}</DetailItem>
                <DetailItem label="补贴合计">{formatCurrency(detail.result.allowanceTotal, detail.result.currency)}</DetailItem>
                <DetailItem label="扣款合计">{formatCurrency(detail.result.totalDeduction, detail.result.currency)}</DetailItem>
                <DetailItem label="其他合计">{formatCurrency(detail.result.otherTotal, detail.result.currency)}</DetailItem>
                <DetailItem label="应发金额">{formatCurrency(detail.result.grossPay, detail.result.currency)}</DetailItem>
                <DetailItem label="实发金额">{formatCurrency(detail.result.netPay, detail.result.currency)}</DetailItem>
                <DetailItem label="计算时间">{detail.result.calculatedAt || "-"}</DetailItem>
                <DetailItem label="确认时间">{detail.result.confirmedAt || "-"}</DetailItem>
              </div>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-4">
              <h4 className="text-sm font-semibold text-slate-800 mb-3">一次性薪资项</h4>
              <div className="space-y-2">
                {detail.adjustmentItems.length === 0 ? (
                  <p className="text-sm text-slate-500">当前月份没有一次性薪资项</p>
                ) : detail.adjustmentItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className={cn("px-2 py-1 rounded-full text-xs font-medium", ADJUSTMENT_TYPE_META[item.type].className)}>
                        {ADJUSTMENT_TYPE_META[item.type].label}
                      </span>
                      <span className="text-slate-700">{item.name}</span>
                      {item.note ? <span className="text-slate-400">· {item.note}</span> : null}
                    </div>
                    <span className="font-mono text-slate-700">{formatCurrency(item.amount, detail.result.currency)}</span>
                  </div>
                ))}
              </div>
            </section>

            {detail.result.blockedReason && (
              <section className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                <div className="flex items-center gap-2 font-semibold mb-2">
                  <AlertCircle className="w-4 h-4" />
                  历史异常原因
                </div>
                <p>{detail.result.blockedReason}</p>
              </section>
            )}
          </div>
        ) : null}
      </Modal>

      <Modal isOpen={isAdjustmentListOpen} title="一次性薪资项管理" onClose={() => setIsAdjustmentListOpen(false)} className="max-w-4xl">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-slate-500">
                {adjustmentTarget ? `${adjustmentTarget.employeeName} · ${adjustmentTarget.yearMonth}` : ""}
              </div>
              {adjustmentLocked ? (
                <div className="mt-2 inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                  {adjustmentLockMessage}
                </div>
              ) : null}
            </div>
            <button
              type="button"
              onClick={openCreateAdjustment}
              disabled={adjustmentLocked}
              className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
              title={adjustmentLocked ? adjustmentLockMessage : "新增薪资项"}
            >
              新增薪资项
            </button>
          </div>

          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase border-b border-slate-100">
                  <th className="px-4 py-3">类型</th>
                  <th className="px-4 py-3">名称</th>
                  <th className="px-4 py-3 text-right">金额</th>
                  <th className="px-4 py-3">备注</th>
                  <th className="px-4 py-3">创建时间</th>
                  <th className="px-4 py-3 text-center">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {adjustmentItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">当前没有一次性薪资项</td>
                  </tr>
                ) : adjustmentItems.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-4">
                      <span className={cn("px-2 py-1 rounded-full text-xs font-medium", ADJUSTMENT_TYPE_META[item.type].className)}>
                        {ADJUSTMENT_TYPE_META[item.type].label}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-700">{item.name}</td>
                    <td className="px-4 py-4 text-sm text-right font-mono text-slate-700">{formatCurrency(item.amount, adjustmentTarget?.currency || "THB")}</td>
                    <td className="px-4 py-4 text-sm text-slate-500">{item.note || "-"}</td>
                    <td className="px-4 py-4 text-sm text-slate-500 font-mono">{formatDateTime(item.createdAt)}</td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEditAdjustment(item)}
                          disabled={adjustmentLocked}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                          title={adjustmentLocked ? adjustmentLockMessage : "编辑薪资项"}
                        >
                          编辑
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDeleteAdjustment(item)}
                          disabled={adjustmentLocked}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-rose-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                          title={adjustmentLocked ? adjustmentLockMessage : "删除薪资项"}
                        >
                          删除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            {adjustmentTarget?.calculationStatus === "confirmed"
              ? "薪酬结果已确认，薪资项仅允许查看，不能再调整。"
              : adjustmentLocked
                ? "薪酬结果核对通过后，薪资项仅允许查看；如需修改，请先驳回后再调整。"
              : "保存一次性薪资项后，列表会刷新；若要让金额重新计入薪酬结果，请执行单个或批量重算。"}
          </div>
        </div>
      </Modal>

      <Modal isOpen={isAdjustmentFormOpen} title={editingAdjustment ? "编辑一次性薪资项" : "新增一次性薪资项"} onClose={() => setIsAdjustmentFormOpen(false)} className="max-w-2xl">
        <form onSubmit={handleSaveAdjustment} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="项目类型">
              <select value={adjustmentForm.type} onChange={(event) => setAdjustmentForm((prev) => ({ ...prev, type: event.target.value as SalaryAdjustmentType }))} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-brand-500 outline-none">
                <option value="allowance">补贴</option>
                <option value="deduction">扣款</option>
                <option value="other">其他</option>
              </select>
            </Field>
            <Field label="金额">
              <input
                type="number"
                min="0"
                step="0.01"
                value={adjustmentForm.amount}
                onChange={(event) => setAdjustmentForm((prev) => ({ ...prev, amount: event.target.value === "" ? "" : Number(event.target.value) }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none"
              />
            </Field>
          </div>
          <Field label="项目名称">
            <input type="text" value={adjustmentForm.name} onChange={(event) => setAdjustmentForm((prev) => ({ ...prev, name: event.target.value }))} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 outline-none" />
          </Field>
          <Field label="备注">
            <textarea value={adjustmentForm.note} onChange={(event) => setAdjustmentForm((prev) => ({ ...prev, note: event.target.value }))} rows={3} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-brand-500 outline-none" />
          </Field>
          {adjustmentFormError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{adjustmentFormError}</div>
          ) : null}
          <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
            <button type="button" onClick={() => setIsAdjustmentFormOpen(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">
              取消
            </button>
            <button type="submit" disabled={submitting} className="px-6 py-2 text-sm text-white bg-brand-600 hover:bg-brand-700 rounded-lg disabled:opacity-60">
              {submitting ? "保存中..." : "保存"}
            </button>
          </div>
        </form>
      </Modal>
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

function PayrollInfo({
  label,
  value,
  mono = false,
  highlight = false,
  strong = false
}: {
  label: string;
  value: string;
  mono?: boolean;
  highlight?: boolean;
  strong?: boolean;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-slate-400">{label}</p>
      <p className={cn("mt-1 text-sm font-semibold text-slate-800", mono && "font-mono", highlight && "text-blue-600", strong && "text-slate-900")}>{value}</p>
    </div>
  );
}

function TooltipButton({
  label,
  onClick,
  disabled = false,
  className,
  children
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span className="group relative inline-flex">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        className={cn(
          "rounded-lg border border-slate-200 bg-white transition hover:bg-slate-50 disabled:opacity-40",
          className
        )}
      >
        {children}
      </button>
      <span className="pointer-events-none absolute -top-9 left-1/2 z-20 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-xs font-medium text-white shadow-lg group-hover:block">
        {label}
      </span>
    </span>
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
