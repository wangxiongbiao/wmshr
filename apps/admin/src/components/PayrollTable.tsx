/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { tAdmin } from "../lib/i18nText";
import { AlertCircle, Calendar, Check, CheckCircle2, Clock, DollarSign, Download, Receipt, RefreshCw, TrendingUp } from "lucide-react";
import type {
  Employee,
  MonthlyPayrollResult,
  PayrollResultDetail,
} from "../types";
import {
  approvePayrollResult,
  confirmPayrollResult,
  fetchEmployeeAvatars,
  fetchPayrollResultDetail,
  fetchPayrollResults,
  generateMonthlyPayroll,
  rejectPayrollResult,
  runNightlyPayrollNow,
  searchEmployees,
} from "../lib/api";
import { useDialog } from "./DialogProvider";
import { ModalShell } from "./ModalShell";
import { cn, formatCurrency, formatDuration, getSalaryTypeLabel } from "../lib/utils";
import { Pagination } from "./Pagination";
import { SearchableSelect } from "./SearchableSelect";
import { YearMonthPicker } from "./YearMonthPicker";

interface PayrollTableProps {
  isActive: boolean;
}

const REVIEW_STATUS_CLASS_NAMES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-rose-100 text-rose-700"
};

function getReviewStatusLabel(status: string) {
  // 复核状态文案必须在渲染期翻译，避免语言切换后继续显示模块载入时的旧语言。
  switch (status) {
    case "approved": return tAdmin("已通过");
    case "rejected": return tAdmin("已驳回");
    case "pending":
    default: return tAdmin("待核对");
  }
}

function getDefaultYearMonth() {
  return new Date().toISOString().slice(0, 7);
}

function formatEmployeeDisplayName(employee: Pick<Employee, "name" | "nickname">) {
  return employee.nickname ? `${employee.name}(${employee.nickname})` : employee.name;
}

const PAYROLL_REFRESH_TTL_MS = 1000 * 15;

function buildPayslipPreviewDetail(result: MonthlyPayrollResult): PayrollResultDetail {
  return {
    result,
    employee: {
      id: result.employeeId,
      employeeNo: result.employeeNo || "",
      name: result.employeeName,
      nickname: "",
      gender: "male",
      country: "TH",
      phone: "",
      role: result.employeeRole,
      dept: result.employeeDept,
      attendanceRuleId: 0,
      attendanceRuleName: undefined,
      salaryType: result.salaryType,
      hourlyRate: result.hourlyRate,
      fixedSalary: result.fixedSalary,
      attendanceBonus: 0,
      socialSecurity: result.socialSecurityAmount,
      mealAllowance: 0,
      serviceFeeRate: 0,
      currency: result.currency,
      joinDate: "",
      status: "active",
      photo: result.employeePhoto,
      isDeleted: false
    },
    salaryProfile: null,
    attendanceSummary: null,
    dailyStandardHours: 0,
    adjustmentItems: [],
    exceptionDetails: result.exceptionDetails || []
  };
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

export function PayrollTable({ isActive }: PayrollTableProps) {
  const { confirm, prompt } = useDialog();
  const { i18n } = useTranslation("admin");
  // PayrollTable 的可见文案仍集中通过 tAdmin() 渲染；这里显式订阅 react-i18next 语言状态，保证 Header 切换语言后整块薪资核算 UI 会重新渲染，而不是继续显示旧语言。
  const translationRenderLanguage = i18n.resolvedLanguage || i18n.language;
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | "all">("all");
  const [includeInactive, setIncludeInactive] = useState(false);
  const [yearMonth, setYearMonth] = useState(getDefaultYearMonth());
  const [calculationStatus, setCalculationStatus] = useState("all");
  const [reviewStatus, setReviewStatus] = useState("all");
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  // 打开工资条详情只是只读加载，不能复用“手动核算/审批提交”的提交态，否则顶部核算按钮会误显示为正在执行。
  const [isOpeningPayslip, setIsOpeningPayslip] = useState(false);
  const [results, setResults] = useState<MonthlyPayrollResult[]>([]);
  const [total, setTotal] = useState(0);
  const [selectedFilterEmployee, setSelectedFilterEmployee] = useState<Employee | null>(null);
  const [employeeSearchResults, setEmployeeSearchResults] = useState<Employee[]>([]);
  const [employeeSearchLoading, setEmployeeSearchLoading] = useState(false);
  const [avatarMap, setAvatarMap] = useState<Record<number, string | null>>({});
  const [error, setError] = useState("");
  const [payslipDetail, setPayslipDetail] = useState<PayrollResultDetail | null>(null);
  const [isPayslipOpen, setIsPayslipOpen] = useState(false);
  const [signName, setSignName] = useState("");
  const [isCashPaid, setIsCashPaid] = useState(false);
  const [exceptionResult, setExceptionResult] = useState<MonthlyPayrollResult | null>(null);
  const [hasLoadedResultsOnce, setHasLoadedResultsOnce] = useState(false);
  const [hasPromptedAutoGenerate, setHasPromptedAutoGenerate] = useState(false);
  const autoGeneratePromptingRef = useRef(false);
  const lastLoadedAtRef = useRef(0);
  const lastLoadedKeyRef = useRef("");

  const buildFilterKey = (params?: {
    yearMonth?: string;
    calculationStatus?: string;
    reviewStatus?: string;
    employeeId?: number | "all";
    includeInactive?: boolean;
    page?: number;
  }) => JSON.stringify({
    yearMonth: params?.yearMonth ?? yearMonth,
    calculationStatus: params?.calculationStatus ?? calculationStatus,
    reviewStatus: params?.reviewStatus ?? reviewStatus,
    employeeId: params?.employeeId ?? selectedEmployeeId,
    includeInactive: params?.includeInactive ?? includeInactive,
    page: params?.page ?? page
  });

  const loadData = async (nextFilters?: {
    yearMonth?: string;
    calculationStatus?: string;
    reviewStatus?: string;
    employeeId?: number | "all";
    includeInactive?: boolean;
    page?: number;
    force?: boolean;
  }) => {
    const effectiveYearMonth = nextFilters?.yearMonth ?? yearMonth;
    const effectiveCalculationStatus = nextFilters?.calculationStatus ?? calculationStatus;
    const effectiveReviewStatus = nextFilters?.reviewStatus ?? reviewStatus;
    const effectiveEmployeeId = nextFilters?.employeeId ?? selectedEmployeeId;
    const effectiveIncludeInactive = nextFilters?.includeInactive ?? includeInactive;
    const effectivePage = nextFilters?.page ?? page;
    const force = nextFilters?.force ?? false;
    const filterKey = buildFilterKey({
      yearMonth: effectiveYearMonth,
      calculationStatus: effectiveCalculationStatus,
      reviewStatus: effectiveReviewStatus,
      employeeId: effectiveEmployeeId,
      includeInactive: effectiveIncludeInactive,
      page: effectivePage
    });

    setLoading(true);
    setError("");
    try {
      const nextPage = await fetchPayrollResults({
        yearMonth: effectiveYearMonth,
        employeeId: effectiveEmployeeId === "all" ? null : effectiveEmployeeId,
        calculationStatus: effectiveCalculationStatus,
        reviewStatus: effectiveReviewStatus,
        includeInactive: effectiveIncludeInactive,
        page: effectivePage,
        pageSize,
        force
      });
      setResults(nextPage.items);
      setTotal(nextPage.total);
      lastLoadedAtRef.current = Date.now();
      lastLoadedKeyRef.current = filterKey;
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : tAdmin("薪酬结果加载失败"));
    } finally {
      setLoading(false);
      setHasLoadedResultsOnce(true);
    }
  };

  useEffect(() => {
    if (!isActive) {
      return;
    }

    const currentFilterKey = buildFilterKey();
    const shouldReuseCurrentResults =
      hasLoadedResultsOnce &&
      results.length > 0 &&
      lastLoadedKeyRef.current === currentFilterKey &&
      Date.now() - lastLoadedAtRef.current < PAYROLL_REFRESH_TTL_MS;

    if (shouldReuseCurrentResults) {
      return;
    }

    const timer = window.setTimeout(() => {
      // 薪资页缓存后再次激活时，继续沿用当前筛选条件后台刷新，但保留已生成的结果表先可见。
      void loadData();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [calculationStatus, hasLoadedResultsOnce, includeInactive, isActive, page, results.length, reviewStatus, selectedEmployeeId, yearMonth]);

  useEffect(() => {
    setHasPromptedAutoGenerate(false);
    setHasLoadedResultsOnce(false);
  }, [yearMonth]);

  const runGenerateMonthly = async (employeeIds?: number[]) => {
    setSubmitting(true);
    try {
      await generateMonthlyPayroll(yearMonth, employeeIds);
      await loadData({ force: true });
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : tAdmin("批量生成薪酬失败"));
    } finally {
      setSubmitting(false);
    }
  };

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
    const optionEmployees = mergeUniqueEmployees([selectedFilterEmployee, ...employeeSearchResults]);
    return [
      {
        value: "all",
        label: tAdmin("所有员工 (全部)"),
        description: tAdmin("不过滤员工")
      },
      ...optionEmployees.map((employee) => ({
        value: String(employee.id),
        label: formatEmployeeDisplayName(employee),
        description: [employee.employeeNo, employee.role].filter(Boolean).join(" · "),
        keywords: [employee.name, employee.nickname, employee.employeeNo, employee.role, employee.dept]
      }))
    ];
  }, [employeeSearchResults, selectedFilterEmployee, translationRenderLanguage]);

  useEffect(() => {
    const employeeIds = results
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
      // 薪资列表头像补图失败不影响主列表展示。
    });

    return () => {
      cancelled = true;
    };
  }, [avatarMap, results]);

  const displayedResults = useMemo(
    () => results.map((item) => ({
      ...item,
      employeePhoto: avatarMap[item.employeeId] ?? item.employeePhoto
    })),
    [avatarMap, results]
  );

  const handleEmployeeQueryChange = async (query: string) => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      setEmployeeSearchResults([]);
      setEmployeeSearchLoading(false);
      return;
    }

    setEmployeeSearchLoading(true);
    try {
      const rows = await searchEmployees(trimmedQuery, { includeInactive });
      setEmployeeSearchResults(rows);
    } finally {
      setEmployeeSearchLoading(false);
    }
  };

  useEffect(() => {
    const shouldPrompt =
      isActive &&
      hasLoadedResultsOnce &&
      !loading &&
      !submitting &&
      !error &&
      !hasPromptedAutoGenerate &&
      results.length === 0 &&
      selectedEmployeeId === "all" &&
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
        title: tAdmin("当前月份还没有薪酬结果"),
        message: tAdmin("是否现在为本月员工自动生成一次薪酬核算结果？"),
        confirmText: tAdmin("立即生成"),
        cancelText: tAdmin("稍后再说"),
        tone: "default"
      });
      autoGeneratePromptingRef.current = false;
      if (!confirmed) {
        return;
      }

      await runGenerateMonthly();
    })();
  }, [calculationStatus, confirm, error, hasLoadedResultsOnce, hasPromptedAutoGenerate, includeInactive, loading, results.length, reviewStatus, selectedEmployeeId, submitting, yearMonth]);

  const openPayslip = async (result: MonthlyPayrollResult) => {
    setIsPayslipOpen(true);
    setPayslipDetail(buildPayslipPreviewDetail(result));
    setSignName("");
    setIsCashPaid(result.calculationStatus === "confirmed");
    if (result.id <= 0) {
      // 预览行没有真实 monthly_payroll_results 主键；允许直接查看工资条预览，但不能再请求详情接口。
      setIsOpeningPayslip(false);
      return;
    }
    setIsOpeningPayslip(true);
    try {
      // 异常薪资不再在动作列硬拦截；异常说明统一放到员工列左侧入口和异常详情弹窗，工资条生成/查看仍按正常发放流程走。
      // 薪资结果只允许由夜间定时任务或“立即核算薪资”按钮更新；打开工资条只读当前结果详情，避免查看动作隐式改写薪资数据。
      const nextDetail = await fetchPayrollResultDetail(result.id);
      // v2 工资条是发放签收入口，必须用详情接口拿到员工、薪资项和汇总，不能用列表行直接确认。
      setPayslipDetail(nextDetail);
      setSignName("");
      setIsCashPaid(result.calculationStatus === "confirmed");
      // 点击工资条必须保持纯查看/签收语义；这里禁止顺手刷新列表，避免前端再次触发薪资列表后台计算口径链路。
    } catch (nextError) {
      setIsPayslipOpen(false);
      setPayslipDetail(null);
      setError(nextError instanceof Error ? nextError.message : tAdmin("工资条加载失败"));
    } finally {
      setIsOpeningPayslip(false);
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
      title: tAdmin("确认生成薪酬结果"),
      message: tAdmin("将按当前考勤、补扣项和薪资档案刷新当前筛选月份员工薪酬结果，是否继续？"),
      confirmText: tAdmin("开始生成"),
      cancelText: tAdmin("取消"),
      tone: "default"
    });
    if (!confirmed) {
      return;
    }

    await runGenerateMonthly();
  };

  const handleRunNightlyPayrollNow = async () => {
    const confirmed = await confirm({
      title: tAdmin("确认手动触发薪资核算"),
      message: tAdmin("将按夜间定时任务逻辑立即重算 {{yearMonth}} 月薪资。已确认发放或已核对通过的结果仍会保持锁定，是否继续？", { yearMonth }),
      confirmText: tAdmin("立即核算"),
      cancelText: tAdmin("取消"),
      tone: "default"
    });
    if (!confirmed) {
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      // 手动按钮复用夜间定时任务的核算规则，但后端限定为当前登录账号，避免误触发其他租户数据。
      const result = await runNightlyPayrollNow(yearMonth);
      if (result.failureCount > 0) {
        setError(tAdmin("已完成 {{successCount}} 人核算，{{failureCount}} 人失败，请检查异常考勤或已锁定工资。", { successCount: result.successCount, failureCount: result.failureCount }));
      }
      await loadData({ force: true });
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : tAdmin("手动触发薪资核算失败"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (resultId: number) => {
    setSubmitting(true);
    try {
      const approvedResult = await approvePayrollResult(resultId);
      // 工资条弹窗内核对通过后要同步本地详情状态，避免用户必须关闭重开才能继续签收确认。
      setPayslipDetail((prev) => prev && prev.result.id === resultId ? { ...prev, result: approvedResult } : prev);
      await loadData({ force: true });
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : tAdmin("标记核对通过失败"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async (resultId: number) => {
    const reason = await prompt({
      title: tAdmin("填写驳回原因"),
      message: tAdmin("可选填写驳回原因，留空则只更新状态。"),
      confirmText: tAdmin("提交驳回"),
      cancelText: tAdmin("取消"),
      placeholder: tAdmin("例如：请先校对餐补和扣款项"),
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
      await loadData({ force: true });
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : tAdmin("驳回薪酬结果失败"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirm = async (result: MonthlyPayrollResult) => {
    if (!isCashPaid || !signName.trim()) {
      setError(tAdmin("请先确认企业款项已足额支付，并填写员工或经办人签名"));
      return;
    }

    const confirmed = await confirm({
      title: tAdmin("确认工资条已签收发放"),
      message: tAdmin("确认后该员工本月薪酬将标记为已发放，薪资项和重算入口会锁定。是否确认？"),
      confirmText: tAdmin("核销并确认已发放"),
      cancelText: tAdmin("取消"),
      tone: "danger"
    });
    if (!confirmed) {
      return;
    }

    setSubmitting(true);
    try {
      const confirmedResult = await confirmPayrollResult(result.id);
      setPayslipDetail((prev) => prev && prev.result.id === result.id ? { ...prev, result: confirmedResult } : prev);
      await loadData({ force: true });
      closePayslip();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : tAdmin("确认薪酬结果失败"));
    } finally {
      setSubmitting(false);
    }
  };

  const applyPayoutStatusFilter = (status: "all" | "pending" | "paid") => {
    // v2 薪资页按“待发/已发”理解发放状态；这里只更新筛选状态，统一交给 useEffect 加载，避免按钮点击时手动 loadData 和状态变化各触发一次请求。
    const nextCalculationStatus = status === "paid" ? "confirmed" : "all";
    const nextReviewStatus = status === "pending" ? "pending" : "all";
    setCalculationStatus(nextCalculationStatus);
    setReviewStatus(nextReviewStatus);
  };

  const handleExportCSV = () => {
    const headers = [tAdmin("年月"), tAdmin("员工"), tAdmin("员工编号"), tAdmin("所属部门"), tAdmin("职位"), tAdmin("计薪方式"), tAdmin("有效工时"), tAdmin("加班时长"), tAdmin("加班费"), tAdmin("服务费"), tAdmin("应发"), tAdmin("社保扣款"), tAdmin("扣款"), tAdmin("实发"), tAdmin("发放状态"), tAdmin("币种")];
    const totals = displayedResults.reduce(
      (acc, item) => {
        acc.validHours += Number(item.validHours || 0);
        acc.overtimeHours += Number(item.overtimePayHours || 0);
        acc.overtimePay += Number(item.overtimePay || 0);
        acc.serviceFee += Number(item.serviceFeeAmount || 0);
        acc.grossPay += Number(item.grossPay || 0);
        acc.socialSecurity += Number(item.socialSecurityAmount || 0);
        acc.deduction += Number(item.totalDeduction || 0);
        acc.netPay += Number(item.netPay || 0);
        return acc;
      },
      { validHours: 0, overtimeHours: 0, overtimePay: 0, serviceFee: 0, grossPay: 0, socialSecurity: 0, deduction: 0, netPay: 0 }
    );
    const rows = displayedResults.map((item) => [
      item.yearMonth,
      `"${item.employeeName}"`,
      item.employeeNo || "-",
      `"${item.employeeDept || tAdmin("未分配")}"`,
      `"${item.employeeRole || tAdmin("未设置职位")}"`,
      getSalaryTypeLabel(item.salaryType),
      item.validHours.toFixed(2),
      item.overtimePayHours.toFixed(2),
      item.overtimePay.toFixed(2),
      item.serviceFeeAmount.toFixed(2),
      item.grossPay.toFixed(2),
      item.socialSecurityAmount.toFixed(2),
      item.totalDeduction.toFixed(2),
      item.netPay.toFixed(2),
      item.calculationStatus === "confirmed" ? tAdmin("已发") : tAdmin("待发"),
      item.currency
    ]);
    // 薪资导出底部合计跟随当前筛选结果，只汇总工时与金额列，避免把员工维度字段误写成伪值。
    const summaryRow = [
      tAdmin("合计"),
      "",
      "",
      "",
      "",
      "",
      totals.validHours.toFixed(2),
      totals.overtimeHours.toFixed(2),
      totals.overtimePay.toFixed(2),
      totals.serviceFee.toFixed(2),
      totals.grossPay.toFixed(2),
      totals.socialSecurity.toFixed(2),
      totals.deduction.toFixed(2),
      totals.netPay.toFixed(2),
      "",
      displayedResults[0]?.currency || selectedFilterEmployee?.currency || "THB"
    ];
    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((row) => row.join(",")), summaryRow.join(",")].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", tAdmin("员工薪资报表_{{yearMonth}}.csv", { yearMonth }));
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const totals = useMemo(() => {
    return displayedResults.reduce(
      (acc, item) => {
        acc.gross += item.grossPay;
        acc.deduction += item.totalDeduction;
        acc.net += item.netPay;
        return acc;
      },
      { gross: 0, deduction: 0, net: 0 }
    );
  }, [displayedResults]);

  const displayCurrency = displayedResults[0]?.currency || selectedFilterEmployee?.currency || "THB";
  const availableMonths = useMemo(() => {
    // v2 原型有“快捷月份 + 自定义月份”；这里基于当前月份和已加载结果生成快捷项，避免额外引入旧后台筛选字段。
    const monthSet = new Set<string>([yearMonth, getDefaultYearMonth(), ...displayedResults.map((item) => item.yearMonth)]);
    return Array.from(monthSet).sort((a, b) => b.localeCompare(a));
  }, [displayedResults, yearMonth]);
  const payrollMetrics = useMemo(() => {
    const confirmedCount = displayedResults.filter((item) => item.calculationStatus === "confirmed").length;
    const pendingCount = Math.max(0, displayedResults.length - confirmedCount);
    const totalHours = displayedResults.reduce((sum, item) => sum + item.validHours, 0);
    const totalOtHours = displayedResults.reduce((sum, item) => sum + item.overtimePayHours, 0);

    return {
      confirmedCount,
      pendingCount,
      totalHours,
      totalOtHours,
      progressPct: displayedResults.length > 0 ? (confirmedCount / displayedResults.length) * 100 : 0
    };
  }, [displayedResults]);
  useEffect(() => {
    // 只有筛选条件变化时才回到第一页；真实后端分页下，翻页本身会触发 loadData，不能再被返回结果重置。
    setPage(1);
  }, [calculationStatus, includeInactive, reviewStatus, selectedEmployeeId, yearMonth]);

  const showRefreshing = loading && results.length > 0;
  const payoutFilter = calculationStatus === "confirmed" ? "paid" : reviewStatus === "pending" ? "pending" : "all";
  const payslipResult = payslipDetail?.result || null;
  const isPreviewPayslip = Boolean(payslipResult && payslipResult.id <= 0);
  const payslipEmployee = payslipDetail?.employee || null;
  const isDispatchPayslipEmployee = Boolean(payslipEmployee?.isDispatchPersonnel);
  const payslipEffectiveAttendanceDays = payslipResult?.effectiveAttendanceDays || 0;
  const payslipMealAllowanceDayUnits = payslipResult?.mealAllowanceDayUnits || 0;
  const payslipTaxOrDeduction = payslipResult ? Math.max(0, payslipResult.totalDeduction - payslipResult.socialSecurityAmount) : 0;
  const payslipBaseSalary = payslipResult
    ? (payslipResult.salaryType === "fixed" ? payslipResult.fixedSalary || 0 : payslipResult.hourlyPay)
    : 0;
  const payslipServiceFeeRate = payslipDetail?.salaryProfile?.serviceFeeRate ?? payslipEmployee?.serviceFeeRate ?? 0;
  const payslipAllowanceItems = payslipDetail?.adjustmentItems.filter((item) => item.type === "allowance") || [];
  const payslipOtherItems = payslipDetail?.adjustmentItems.filter((item) => item.type === "other") || [];
  const payslipDeductionItems = payslipDetail?.adjustmentItems.filter((item) => item.type === "deduction") || [];
  const payslipIncomeAdjustmentItems = payslipAllowanceItems.concat(payslipOtherItems);
  const payslipStandardPaidHours = payslipResult ? Math.max(0, payslipResult.validHours - payslipResult.overtimePayHours) : 0;
  const payslipMealAllowancePerDay = payslipEmployee?.mealAllowance || 0;

  return (
    <div className="h-full min-h-0 flex flex-col gap-6" data-i18n-language={translationRenderLanguage}>
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-green-50 text-green-600 flex items-center justify-center font-bold shadow-inner">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-slate-800 text-base flex items-center gap-2">{tAdmin("月份工资发放与核算")}<span className="px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 text-xs font-mono font-bold">
                {yearMonth}
              </span>
            </h2>
          </div>
        </div>

        <div className="w-full sm:w-auto flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">{tAdmin("核算年月:")}</span>
            <YearMonthPicker
              value={yearMonth}
              onChange={setYearMonth}
              availableMonths={availableMonths}
            />
          </div>

          <button
            type="button"
            onClick={() => void loadData({ force: true })}
            disabled={loading || submitting}
            className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 transition flex items-center gap-1.5 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            <span>{tAdmin("刷新")}</span>
          </button>

          <button
            onClick={handleRunNightlyPayrollNow}
            disabled={submitting}
            className="px-3 py-1.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition flex items-center gap-1.5 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={cn("w-4 h-4", submitting && "animate-spin")} />
            <span>{tAdmin("立即核算薪资")}</span>
          </button>

          <button
            onClick={handleExportCSV}
            disabled={displayedResults.length === 0}
            className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 transition flex items-center gap-1.5 shadow-sm ml-auto sm:ml-0 disabled:opacity-50"
          >
            <Download className="w-4 h-4 text-emerald-500" />
            <span>{tAdmin("导出CSV表")}</span>
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
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">{tAdmin("应发工资总额")}</p>
          <p className="text-2xl font-bold font-mono text-slate-800 mt-1">{formatCurrency(totals.gross, displayCurrency)}</p>
          <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-2">
            <TrendingUp className="w-3.5 h-3.5 text-blue-500" />
            <span>{tAdmin("基于 {{hours}}h 正常工时核算", { hours: payrollMetrics.totalHours.toFixed(1) })}</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 relative overflow-hidden group hover:shadow-md transition">
          <div className="absolute top-0 right-0 p-3 text-emerald-100 group-hover:text-emerald-200 transition">
            <CheckCircle2 className="w-14 h-14" />
          </div>
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">{tAdmin("已完成发放（确认）")}</p>
          <p className="text-2xl font-bold font-mono text-emerald-600 mt-1">{formatCurrency(displayedResults.filter((item) => item.calculationStatus === "confirmed").reduce((sum, item) => sum + item.netPay, 0), displayCurrency)}</p>
          <div className="flex items-center gap-1 text-[10px] text-emerald-600/80 mt-2 font-medium">
            <Check className="w-3.5 h-3.5" />
            <span>{tAdmin("包含 {{count}} 名已确认员工", { count: payrollMetrics.confirmedCount })}</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 relative overflow-hidden group hover:shadow-md transition">
          <div className="absolute top-0 right-0 p-3 text-amber-100 group-hover:text-amber-200 transition">
            <AlertCircle className="w-14 h-14" />
          </div>
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">{tAdmin("未发放（待结）总额")}</p>
          <p className="text-2xl font-bold font-mono text-amber-600 mt-1">{formatCurrency(Math.max(0, totals.net - displayedResults.filter((item) => item.calculationStatus === "confirmed").reduce((sum, item) => sum + item.netPay, 0)), displayCurrency)}</p>
          <div className="flex items-center gap-1 text-[10px] text-amber-600 mt-2 font-medium">
            <Clock className="w-3.5 h-3.5" />
            <span>{tAdmin("还有 {{count}} 人待支付", { count: payrollMetrics.pendingCount })}</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 relative overflow-hidden group hover:shadow-md transition">
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">{tAdmin("工资发放核销进度")}</p>
          <div className="flex items-center justify-between mt-1">
            <p className="text-2xl font-bold text-slate-800">{payrollMetrics.progressPct.toFixed(0)}%</p>
            <span className="text-xs bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-full font-mono">{tAdmin("{{confirmed}} / {{total}} 人", { confirmed: payrollMetrics.confirmedCount, total: displayedResults.length })}</span>
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
            {showRefreshing ? (
              <span className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-brand-50 border border-brand-100 text-brand-700">{tAdmin("刷新中")}</span>
            ) : null}
            <button
              onClick={() => applyPayoutStatusFilter("all")}
              className={cn("px-3 py-1.5 text-xs font-semibold rounded-lg transition-all", payoutFilter === "all" ? "bg-brand-600 text-white shadow-sm" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100")}
            >
              {tAdmin("全部员工 ({{count}})", { count: displayedResults.length })}
            </button>
            <button
              onClick={() => applyPayoutStatusFilter("pending")}
              className={cn("px-3 py-1.5 text-xs font-semibold rounded-lg transition-all", payoutFilter === "pending" ? "bg-amber-500 text-white shadow-sm" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100")}
            >
              ⏳ {tAdmin("待发")} ({payrollMetrics.pendingCount})
            </button>
            <button
              onClick={() => applyPayoutStatusFilter("paid")}
              className={cn("px-3 py-1.5 text-xs font-semibold rounded-lg transition-all", payoutFilter === "paid" ? "bg-emerald-600 text-white shadow-sm" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100")}
            >
              ✅ {tAdmin("已发")} ({payrollMetrics.confirmedCount})
            </button>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
            {/* 薪资核算的员工筛选改为远程搜索：默认不预取员工列表，只有输入关键词后才请求无分页搜索接口，真正生效的仍是选中的 employeeId。 */}
            <div className="w-full sm:w-72">
              <SearchableSelect
                value={String(selectedEmployeeId)}
                options={employeeFilterOptions}
                onChange={(nextValue) => {
                  if (nextValue === "all") {
                    setSelectedEmployeeId("all");
                    setSelectedFilterEmployee(null);
                    return;
                  }
                  const employee = mergeUniqueEmployees([selectedFilterEmployee, ...employeeSearchResults])
                    .find((item) => String(item.id) === nextValue) || null;
                  setSelectedEmployeeId(Number(nextValue));
                  setSelectedFilterEmployee(employee);
                }}
                onQueryChange={(query) => void handleEmployeeQueryChange(query)}
                loading={employeeSearchLoading}
                placeholder={tAdmin("请选择员工")}
                searchPlaceholder={tAdmin("输入姓名、昵称、工号后搜索")}
                emptyText={tAdmin("没有匹配的员工")}
              />
            </div>
            <label className="inline-flex items-center gap-2 text-xs text-slate-600 select-none">
              <input
                type="checkbox"
                checked={includeInactive}
                onChange={(event) => setIncludeInactive(event.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
              <span>{tAdmin("展示离职人员")}</span>
            </label>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
        {displayedResults.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Receipt className="w-12 h-12 text-slate-200 mx-auto mb-3" />
            <p className="text-sm">{tAdmin("没有找到符合筛选条件的员工薪资数据")}</p>
            <p className="text-xs text-slate-300 mt-1">{tAdmin('请核对是否已为该月份 "{{yearMonth}}" 录入过任何员工的出勤卡', { yearMonth })}</p>
          </div>
        ) : (
          <div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 text-slate-500 text-xs uppercase border-b border-slate-100">
                    <th className="px-6 py-3.5 font-semibold">{tAdmin("员工详情")}</th>
                    <th className="px-4 py-3.5 font-semibold text-center">{tAdmin("年月")}</th>
                    <th className="px-4 py-3.5 font-semibold text-center">{tAdmin("有效出勤天数")}</th>
                    <th className="px-4 py-3.5 font-semibold text-center">{tAdmin("有效工时")}</th>
                    <th className="px-4 py-3.5 font-semibold text-center text-blue-500">{tAdmin("加班")}</th>
                    <th className="px-4 py-3.5 font-semibold text-center text-blue-600">{tAdmin("总加班时长")}</th>
                    <th className="px-6 py-3.5 font-semibold text-right">{tAdmin("计算基薪 (应发)")}</th>
                    <th className="px-6 py-3.5 font-semibold text-right text-green-600">{tAdmin("加班费")}</th>
                    <th className="px-6 py-3.5 font-semibold text-right text-amber-600">{tAdmin("服务费")}</th>
                    <th className="px-6 py-3.5 font-semibold text-right text-blue-700">{tAdmin("税后实发 (总额)")}</th>
                    <th className="px-3 py-3.5 font-semibold text-center">{tAdmin("状态")}</th>
                    <th className="px-4 py-3.5 font-semibold text-center">{tAdmin("动作")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayedResults.map((item) => {
                    // 薪资结果现在直接返回“有效出勤天数”，列表和工资条都必须复用同一字段，避免再次回退到工时反推天数的旧错误口径。
                    const effectiveAttendanceDays = item.effectiveAttendanceDays || 0;
                    const isPaid = item.calculationStatus === "confirmed";
                    const hasException = Boolean(item.blockedReason || item.exceptionDetails?.length);
                    const baseSalary = item.salaryType === "fixed"
                      ? formatCurrency(item.fixedSalary || 0, item.currency)
                      : formatCurrency(item.hourlyPay, item.currency);

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/70 border-b border-slate-100 bg-white transition-colors">
                        <td className="relative px-6 py-4">
                          {hasException ? (
                            <button
                              type="button"
                              onClick={() => setExceptionResult(item)}
                              title={tAdmin("查看异常详情")}
                              aria-label={tAdmin("查看异常详情")}
                              className="absolute left-1.5 top-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-50 text-amber-700 ring-1 ring-amber-200 transition hover:bg-amber-100 hover:text-amber-800"
                            >
                              {/* 异常入口固定在员工单元格左上角，只保留图标，避免占用员工信息横向宽度；点击仍统一打开异常详情弹窗。 */}
                              <AlertCircle className="h-3.5 w-3.5" />
                            </button>
                          ) : null}
                          {item.employeeStatus === "resigned" ? (
                            <span className="absolute right-4 top-2 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-600 ring-1 ring-rose-100">
                              {tAdmin("离职")}
                            </span>
                          ) : null}
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold overflow-hidden border-2 border-white shadow-sm flex-shrink-0">
                              {item.employeePhoto ? (
                                <img src={item.employeePhoto} className="w-full h-full object-cover" alt="" />
                              ) : (
                                <span style={{ fontSize: "14.4px" }}>{item.employeeName.charAt(0)}</span>
                              )}
                            </div>
                            <div className="min-w-0 max-w-[180px] pr-10">
                              <p className="font-semibold text-slate-900 truncate">{item.employeeName}</p>
                              <p className="text-[10px] text-slate-400 mt-0.5">{item.employeeDept || tAdmin("未分配")} · {item.employeeRole || tAdmin("未设置职位")}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center text-xs font-mono font-semibold text-slate-700">
                          {item.yearMonth}
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold font-mono text-xs">{tAdmin("{{days}} 天", { days: effectiveAttendanceDays })}</span>
                        </td>
                        <td className="px-4 py-4 text-center text-xs font-mono text-slate-600">
                          {formatDuration(item.validHours)}
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 font-semibold font-mono text-xs">
                            {tAdmin("{{count}} 次", { count: item.overtimePayHours > 0 ? "1" : "0" })}
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
                        <td className="px-6 py-4 text-right text-xs font-mono text-amber-600 font-semibold">
                          {formatCurrency(item.serviceFeeAmount, item.currency)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-sm font-bold font-mono text-blue-800">
                            {formatCurrency(item.netPay, item.currency)}
                          </span>
                        </td>
                        <td className="px-3 py-4 text-center">
                          <span className={cn(
                            "inline-flex items-center justify-center gap-1 rounded-lg border px-2 py-1 text-xs font-semibold whitespace-nowrap",
                            isPaid
                              ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                              : "border-amber-100 bg-amber-50 text-amber-700"
                          )}>
                            {isPaid ? <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" /> : null}
                            {isPaid ? tAdmin("已发") : tAdmin("待发")}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => void openPayslip(item)}
                                disabled={submitting || isOpeningPayslip}
                                className={cn(
                                  "px-2.5 py-1 text-xs font-semibold rounded-lg transition disabled:opacity-50",
                                  isPaid
                                    ? "text-brand-700 bg-brand-50 border border-brand-100 hover:bg-brand-100"
                                    : "text-white bg-brand-600 hover:bg-brand-700 shadow-sm hover:shadow"
                                )}
                              >
                                <span>{tAdmin("工资条")}</span>
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

            <div className="space-y-4 border-t border-slate-100 bg-slate-50 p-4">
              <Pagination
                page={page}
                pageSize={pageSize}
                total={total}
                itemName={tAdmin("名员工")}
                disabled={loading || submitting}
                onPageChange={setPage}
              />
              <div className="text-xs text-slate-500">
                {tAdmin("当前筛选共显示")}<span className="font-bold text-slate-700">{total}</span>{tAdmin("名员工的计算记录")}
              </div>
            </div>
          </div>
        )}
        </div>
      </div>

      <Modal
        isOpen={Boolean(exceptionResult)}
        title={tAdmin("异常详情")}
        onClose={() => setExceptionResult(null)}
        className="max-w-md"
        footer={(
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setExceptionResult(null)}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
            >
              {tAdmin("知道了")}
            </button>
          </div>
        )}
      >
        {exceptionResult ? (
          <div className="space-y-4 text-sm text-slate-700">
            <div className="rounded-xl border border-amber-100 bg-amber-50 p-4 text-amber-800">
              <div className="mb-2 flex items-center gap-2 font-bold">
                <AlertCircle className="h-4 w-4" />
                <span>{tAdmin("该薪资数据有异常")}</span>
              </div>
              <p className="leading-6">{exceptionResult.blockedReason || tAdmin("存在异常考勤数据，已按当前薪资规则参与核算。")}</p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-white p-4 text-xs">
              <p className="mb-3 font-bold text-slate-700">{tAdmin("异常考勤明细")}</p>
              {exceptionResult.exceptionDetails?.length ? (
                <div className="space-y-2">
                  {exceptionResult.exceptionDetails.map((detail) => (
                    <div key={`${detail.date}-${detail.reason}`} className="rounded-lg border border-amber-100 bg-amber-50/60 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-mono font-bold text-slate-800">{detail.date}</span>
                        <span className="rounded-full bg-white px-2 py-0.5 font-semibold text-amber-700 ring-1 ring-amber-100">{detail.statusLabel}</span>
                      </div>
                      <p className="mt-2 leading-5 text-slate-700">{detail.reason}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="leading-5 text-slate-500">{exceptionResult.blockedReason || tAdmin("暂无具体异常明细，请先重新结算当月考勤。")}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3 rounded-xl border border-slate-100 bg-white p-4 text-xs">
              <div>
                <p className="text-slate-400">{tAdmin("员工")}</p>
                <p className="mt-1 font-semibold text-slate-800">{exceptionResult.employeeName}</p>
              </div>
              <div>
                <p className="text-slate-400">{tAdmin("月份")}</p>
                <p className="mt-1 font-mono font-semibold text-slate-800">{exceptionResult.yearMonth}</p>
              </div>
              <div>
                <p className="text-slate-400">{tAdmin("状态")}</p>
                <p className="mt-1 font-semibold text-slate-800">{exceptionResult.calculationStatus === "confirmed" ? tAdmin("已发") : tAdmin("待发")}</p>
              </div>
              <div>
                <p className="text-slate-400">{tAdmin("实发")}</p>
                <p className="mt-1 font-mono font-semibold text-slate-800">{formatCurrency(exceptionResult.netPay, exceptionResult.currency)}</p>
              </div>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        isOpen={isPayslipOpen}
        title={tAdmin("员工工资发放明细单")}
        onClose={closePayslip}
        className="max-w-lg"
        footer={payslipResult ? (
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button type="button" onClick={closePayslip} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">{tAdmin("取消")}</button>
            <div className="flex flex-wrap justify-end gap-2">
              {isPreviewPayslip ? null : (
                <>
              {payslipResult.calculationStatus !== "confirmed" ? (
                <button
                  type="button"
                  onClick={() => void handleReject(payslipResult.id)}
                  disabled={submitting || payslipResult.calculationStatus === "blocked"}
                  className="px-4 py-2 rounded-lg border border-rose-200 bg-white text-sm text-rose-600 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40"
                >{tAdmin("驳回")}</button>
              ) : null}
              {payslipResult.calculationStatus !== "confirmed" && payslipResult.reviewStatus !== "approved" ? (
                <button
                  type="button"
                  onClick={() => void handleApprove(payslipResult.id)}
                  disabled={submitting || payslipResult.calculationStatus === "blocked"}
                  className="px-4 py-2 rounded-lg border border-emerald-200 bg-emerald-50 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-40"
                >{tAdmin("核对通过")}</button>
              ) : null}
              <button
                type="button"
                onClick={() => void handleConfirm(payslipResult)}
                disabled={submitting || payslipResult.calculationStatus === "confirmed" || payslipResult.reviewStatus !== "approved" || !isCashPaid || !signName.trim()}
                className="px-4 py-2 rounded-lg bg-brand-600 text-sm font-bold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {payslipResult.calculationStatus === "confirmed" ? tAdmin("已确认发放") : tAdmin("核销并确认已发放")}
              </button>
                </>
              )}
            </div>
          </div>
        ) : null}
      >
        {isOpeningPayslip && !payslipResult ? (
          <div className="space-y-4 py-8 text-center text-sm text-slate-500">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-brand-500" />
            <p>{tAdmin("正在加载工资条详情")}</p>
          </div>
        ) : payslipResult ? (
          <div className="space-y-5 text-sm text-slate-700">
            {isPreviewPayslip ? (
              <div className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                {tAdmin("当前为工资条预览，离职员工可查看，但不能在这里继续审批或发放。")}
              </div>
            ) : null}
            {isOpeningPayslip ? (
              <div className="rounded-lg border border-brand-100 bg-brand-50 px-3 py-2 text-xs text-brand-700">
                {tAdmin("正在补充工资条详细数据")}
              </div>
            ) : null}
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
                <p className="text-xs text-slate-500">{payslipEmployee?.dept || tAdmin("全区")} · {payslipEmployee?.role || getSalaryTypeLabel(payslipResult.salaryType)}</p>
              </div>
              <div className="ml-auto text-right">
                <span className="block font-mono text-xs text-slate-400">ID: {payslipResult.employeeNo || `#${payslipResult.employeeId}`}</span>
                <span className={cn("mt-1 inline-block rounded px-2 py-0.5 text-xs font-semibold", REVIEW_STATUS_CLASS_NAMES[payslipResult.reviewStatus])}>
                  {REVIEW_STATUS_CLASS_NAMES[payslipResult.reviewStatus] ? getReviewStatusLabel(payslipResult.reviewStatus) : payslipResult.reviewStatus}
                </span>
              </div>
            </div>

            <div className="space-y-2 border-y border-dashed border-slate-200 py-3.5 font-mono text-xs">
              {/* Payslip hour labels keep defaultValue deliberately: employee-facing payroll checks must show a readable label even if a locale resource is temporarily empty. */}
              <div className="grid grid-cols-[minmax(180px,1fr)_auto] items-center gap-3"><span className="min-w-0 whitespace-nowrap font-medium text-slate-600">{tAdmin("每天需要上班的工时:", { defaultValue: "每天需要上班的工时:" })}</span><span className="font-semibold text-slate-800">{formatDuration(payslipDetail?.dailyStandardHours || 0)}</span></div>
              <div className="grid grid-cols-[minmax(180px,1fr)_auto] items-center gap-3"><span className="min-w-0 whitespace-nowrap font-medium text-slate-600">{tAdmin("本月有效出勤天数:", { defaultValue: "本月有效出勤天数:" })}</span><span className="font-bold text-slate-800">{tAdmin("{{days}} 天", { days: payslipEffectiveAttendanceDays })}</span></div>
              <div className="grid grid-cols-[minmax(180px,1fr)_auto] items-center gap-3"><span className="min-w-0 whitespace-nowrap font-medium text-slate-600">{tAdmin("本月累计上班工时:", { defaultValue: "本月累计上班工时:" })}</span><span className="font-semibold text-slate-800">{formatDuration(payslipResult.validHours)}</span></div>
              <div className="grid grid-cols-[minmax(180px,1fr)_auto] items-center gap-3"><span className="min-w-0 whitespace-nowrap font-medium text-slate-600">{tAdmin("本月有效加班工时:", { defaultValue: "本月有效加班工时:" })}</span><span className="font-bold text-blue-600">{formatDuration(payslipResult.overtimePayHours)}</span></div>
            </div>

            <div className="space-y-2 text-xs">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{tAdmin("应纳发计算说明")}</p>
              <div className="space-y-2 rounded-lg bg-slate-50 p-3 font-mono">
                {/* 工资条金额说明必须逐行显示“项目名称 + 金额”，让员工能直接核对每个金额来源；不要只展示汇总数字。 */}
                <div className="flex justify-between gap-3 rounded-md bg-white/70 px-2 py-1.5">
                  <span className="min-w-0 text-slate-500">
                    {payslipResult.salaryType === "fixed"
                      ? tAdmin("固定月薪")
                      : tAdmin("标准工时工资")}
                    <span className="ml-1 text-[10px] text-slate-400">
                      {payslipResult.salaryType === "hourly"
                        ? tAdmin("{{hours}} × {{rate}}", { hours: formatDuration(payslipStandardPaidHours), rate: formatCurrency(payslipResult.hourlyRate || 0, payslipResult.currency) })
                        : payslipResult.yearMonth}
                    </span>
                  </span>
                  <span className="shrink-0 font-bold text-slate-800 text-right">{formatCurrency(payslipBaseSalary, payslipResult.currency)}</span>
                </div>
                <div className="flex justify-between gap-3 rounded-md bg-white/70 px-2 py-1.5">
                  <span className="min-w-0 text-slate-500">{tAdmin("加班应得")} <span className="text-[10px] text-slate-400">{formatDuration(payslipResult.overtimePayHours)}</span></span>
                  <span className="shrink-0 font-bold text-green-600 text-right">+ {formatCurrency(payslipResult.overtimePay, payslipResult.currency)}</span>
                </div>
                <div className="flex justify-between gap-3 rounded-md bg-white/70 px-2 py-1.5">
                  <span className="min-w-0 text-slate-500">{tAdmin("餐补")} <span className="text-[10px] text-slate-400">{tAdmin("折算 {{days}} 天 × {{amount}}", { days: payslipMealAllowanceDayUnits, amount: formatCurrency(payslipMealAllowancePerDay, payslipResult.currency) })}</span></span>
                  <span className="shrink-0 font-bold text-slate-800 text-right">+ {formatCurrency(payslipResult.mealAllowanceTotal, payslipResult.currency)}</span>
                </div>
                <div className="flex justify-between gap-3 rounded-md bg-white/70 px-2 py-1.5">
                  <span className="min-w-0 text-slate-500">{tAdmin("全勤奖")}</span>
                  <span className="shrink-0 font-bold text-slate-800 text-right">+ {formatCurrency(payslipResult.attendanceBonusAmount, payslipResult.currency)}</span>
                </div>
                {/* 服务费必须显示本次工资结果使用的比例和金额；比例来自 salary_profiles 快照，金额来自 monthly_payroll_results 沉淀值。 */}
                <div className="flex justify-between gap-3 rounded-md bg-amber-50 px-2 py-1.5">
                  <span className="min-w-0 text-amber-700">{tAdmin("服务费")} <span className="text-[10px]">{tAdmin("{{rate}}%", { rate: payslipServiceFeeRate.toFixed(2) })}</span></span>
                  <span className="shrink-0 font-bold text-amber-600 text-right">+ {formatCurrency(payslipResult.serviceFeeAmount, payslipResult.currency)}</span>
                </div>
                {payslipIncomeAdjustmentItems.map((item) => (
                  <div key={item.id} className="flex justify-between gap-3 rounded-md bg-white/70 px-2 py-1.5 text-[11px] text-slate-500">
                    <span className="min-w-0 truncate">+ {item.name}{item.note ? ` · ${item.note}` : ""}</span>
                    <span className="shrink-0 font-semibold text-slate-700">{formatCurrency(item.amount, payslipResult.currency)}</span>
                  </div>
                ))}
                <div className="flex justify-between gap-3 rounded-md bg-white/70 px-2 py-1.5">
                  <span className="min-w-0 text-slate-500">{tAdmin("社保扣款")}</span>
                  <span className="shrink-0 text-red-500 text-right">- {formatCurrency(payslipResult.socialSecurityAmount, payslipResult.currency)}</span>
                </div>
                {isDispatchPayslipEmployee ? (
                  <div className="rounded-md border border-amber-100 bg-amber-50 px-2 py-1.5 text-[11px] leading-5 text-amber-700">
                    {tAdmin("派遣人员社保按本月有效出勤天数计算，员工档案中的社保金按每日金额使用。")}
                  </div>
                ) : null}
                {payslipDeductionItems.map((item) => (
                  <div key={item.id} className="flex justify-between gap-3 rounded-md bg-red-50 px-2 py-1.5 text-[11px] text-red-500/80">
                    <span className="min-w-0 truncate">- {item.name}{item.note ? ` · ${item.note}` : ""}</span>
                    <span className="shrink-0 font-semibold">{formatCurrency(item.amount, payslipResult.currency)}</span>
                  </div>
                ))}
                {payslipTaxOrDeduction > 0 && payslipDeductionItems.length === 0 ? (
                  <div className="flex justify-between gap-3 rounded-md bg-red-50 px-2 py-1.5">
                    <span className="min-w-0 text-red-500">{tAdmin("其他扣款")}</span>
                    <span className="shrink-0 text-red-500 text-right">- {formatCurrency(payslipTaxOrDeduction, payslipResult.currency)}</span>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="rounded-xl border border-brand-100 bg-brand-50 p-4 text-center">
              <span className="block text-xs font-bold text-brand-600">{tAdmin("本月实际应发放")}</span>
              <p className="font-mono text-3xl font-extrabold text-brand-800">{formatCurrency(payslipResult.netPay, payslipResult.currency)}</p>
              <span className="block text-[10px] text-brand-500">{tAdmin("发放币种：{{currency}}", { currency: payslipResult.currency })}</span>
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
                <label htmlFor="isCashPaidCheckbox" className="cursor-pointer select-none text-xs font-semibold text-slate-600">{tAdmin("确认企业款项已足额支付（现金发放或网银已转账）")}</label>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500">{tAdmin("员工电子签名/HR 签章核销:")}</label>
                <input
                  type="text"
                  placeholder={tAdmin("输入经办人或员工签名 (如: Thin Thin / HR)")}
                  value={signName}
                  onChange={(event) => setSignName(event.target.value)}
                  disabled={payslipResult.calculationStatus === "confirmed"}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs outline-none placeholder-slate-400 focus:border-transparent focus:ring-2 focus:ring-brand-500 disabled:bg-slate-100"
                />
              </div>
              {payslipResult.reviewStatus !== "approved" && payslipResult.calculationStatus !== "confirmed" ? (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">{tAdmin("需要先核对通过，才能完成签收发放确认。")}</p>
              ) : null}
            </div>
          </div>
        ) : null}
      </Modal>

    </div>
  );
}
