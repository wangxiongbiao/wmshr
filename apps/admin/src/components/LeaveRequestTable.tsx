/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Calendar, CheckCircle2, Clock3, Eye, RefreshCw, Search, XCircle } from "lucide-react";
import { tAdmin } from "../lib/i18nText";
import type { AdminLeaveRequestItem, Employee, LeaveApprovalStatus, LeaveType } from "../types";
import { approveAdminLeaveRequest, fetchAdminLeaveRequests, rejectAdminLeaveRequest, searchEmployees } from "../lib/api";
import { SearchableSelect } from "./SearchableSelect";
import { Pagination } from "./Pagination";
import { useDialog } from "./DialogProvider";
import { ModalShell } from "./ModalShell";
import { cn, formatDateTime } from "../lib/utils";

interface LeaveRequestTableProps {
  isActive: boolean;
}

const STATUS_CLASS_NAMES: Record<LeaveApprovalStatus, string> = {
  pending: "bg-amber-100 text-amber-700 border border-amber-200",
  approved: "bg-emerald-100 text-emerald-700 border border-emerald-200",
  rejected: "bg-rose-100 text-rose-700 border border-rose-200"
};

function getLeaveStatusLabel(status: LeaveApprovalStatus) {
  switch (status) {
    case "approved":
      return tAdmin("已批准");
    case "rejected":
      return tAdmin("已驳回");
    case "pending":
    default:
      return tAdmin("待审批");
  }
}

function getLeaveTypeLabel(type: LeaveType) {
  switch (type) {
    case "sick":
      return tAdmin("病假");
    case "annual":
      return tAdmin("年假");
    case "special":
      return tAdmin("特殊假");
    case "personal":
    default:
      return tAdmin("事假");
  }
}

function formatEmployeeDisplayName(employee: Pick<Employee, "name" | "nickname">) {
  return employee.nickname ? `${employee.name}(${employee.nickname})` : employee.name;
}

function mergeUniqueEmployees(rows: Array<Employee | null | undefined>) {
  const deduped = new Map<number, Employee>();
  rows.forEach((employee) => {
    if (!employee) {
      return;
    }
    deduped.set(Number(employee.id), employee);
  });
  return Array.from(deduped.values());
}

export function LeaveRequestTable({ isActive }: LeaveRequestTableProps) {
  const { i18n } = useTranslation("admin");
  const { confirm, prompt } = useDialog();
  // 该页面的大部分文案通过 tAdmin() 动态解析；显式订阅语言状态，确保切语言后筛选项、状态徽标和空态文案同步刷新。
  const translationRenderLanguage = i18n.resolvedLanguage || i18n.language;
  const pageSize = 20;
  const [status, setStatus] = useState<"all" | LeaveApprovalStatus>("all");
  const [page, setPage] = useState(1);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | "all">("all");
  const [selectedFilterEmployee, setSelectedFilterEmployee] = useState<Employee | null>(null);
  const [employeeSearchResults, setEmployeeSearchResults] = useState<Employee[]>([]);
  const [employeeSearchLoading, setEmployeeSearchLoading] = useState(false);
  const [items, setItems] = useState<AdminLeaveRequestItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [submittingRequestId, setSubmittingRequestId] = useState<number | null>(null);
  // 列表主表格只保留筛选、状态和审批动作；原因与审批信息统一收进详情弹窗，避免横向字段过多导致阅读断裂。
  const [detailItem, setDetailItem] = useState<AdminLeaveRequestItem | null>(null);
  const [error, setError] = useState("");
  const hasLoadedOnceRef = useRef(false);
  const lastLoadedKeyRef = useRef("");
  const lastLoadedAtRef = useRef(0);

  const buildFilterKey = (params?: {
    status?: "all" | LeaveApprovalStatus;
    employeeId?: number | "all";
    page?: number;
  }) => JSON.stringify({
    status: params?.status ?? status,
    employeeId: params?.employeeId ?? selectedEmployeeId,
    page: params?.page ?? page
  });

  const loadData = async (nextFilters?: {
    status?: "all" | LeaveApprovalStatus;
    employeeId?: number | "all";
    page?: number;
    force?: boolean;
  }) => {
    const effectiveStatus = nextFilters?.status ?? status;
    const effectiveEmployeeId = nextFilters?.employeeId ?? selectedEmployeeId;
    const effectivePage = nextFilters?.page ?? page;
    const force = nextFilters?.force ?? false;
    const filterKey = buildFilterKey({
      status: effectiveStatus,
      employeeId: effectiveEmployeeId,
      page: effectivePage
    });

    setLoading(true);
    setError("");
    try {
      const nextPage = await fetchAdminLeaveRequests({
        status: effectiveStatus,
        employeeId: effectiveEmployeeId === "all" ? null : effectiveEmployeeId,
        page: effectivePage,
        pageSize
      });
      setItems(nextPage.items);
      setTotal(nextPage.total);
      hasLoadedOnceRef.current = true;
      lastLoadedKeyRef.current = filterKey;
      lastLoadedAtRef.current = Date.now();
      if (!force) {
        setPage(nextPage.page);
      }
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : tAdmin("请假申请加载失败"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isActive) {
      return;
    }

    const currentFilterKey = buildFilterKey();
    const shouldReuseCurrentResults =
      hasLoadedOnceRef.current &&
      lastLoadedKeyRef.current === currentFilterKey &&
      Date.now() - lastLoadedAtRef.current < 1000 * 15;

    if (shouldReuseCurrentResults) {
      return;
    }

    const timer = window.setTimeout(() => {
      void loadData();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [isActive, page, selectedEmployeeId, status]);

  const handleEmployeeQueryChange = async (query: string) => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      setEmployeeSearchResults([]);
      setEmployeeSearchLoading(false);
      return;
    }

    setEmployeeSearchLoading(true);
    try {
      const rows = await searchEmployees(trimmedQuery, { status: "all", includeInactive: true });
      setEmployeeSearchResults(rows);
    } finally {
      setEmployeeSearchLoading(false);
    }
  };

  const employeeFilterOptions = useMemo(() => {
    const optionEmployees = mergeUniqueEmployees([selectedFilterEmployee, ...employeeSearchResults]);
    // 员工筛选统一只显示主文案；员工编号/部门/角色仍保留在 keywords 里参与搜索，不再作为第二行副文案展示。
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
  }, [employeeSearchResults, selectedFilterEmployee, translationRenderLanguage]);

  const summaryCards = useMemo(() => {
    const pendingCount = items.filter((item) => item.status === "pending").length;
    const approvedCount = items.filter((item) => item.status === "approved").length;
    const rejectedCount = items.filter((item) => item.status === "rejected").length;
    return [
      {
        key: "pending",
        label: tAdmin("当前页待审批"),
        value: pendingCount,
        icon: Clock3,
        accent: "text-amber-600 bg-amber-50 border-amber-100"
      },
      {
        key: "approved",
        label: tAdmin("当前页已批准"),
        value: approvedCount,
        icon: CheckCircle2,
        accent: "text-emerald-600 bg-emerald-50 border-emerald-100"
      },
      {
        key: "rejected",
        label: tAdmin("当前页已驳回"),
        value: rejectedCount,
        icon: XCircle,
        accent: "text-rose-600 bg-rose-50 border-rose-100"
      }
    ];
  }, [items, translationRenderLanguage]);

  const handleApprove = async (item: AdminLeaveRequestItem) => {
    const approvalNote = await prompt({
      title: tAdmin("批准请假申请"),
      message: tAdmin("可选填写审批备注，留空则只更新状态。"),
      placeholder: tAdmin("例如：请按时完成工作交接"),
      defaultValue: item.approvalNote || "",
      confirmText: tAdmin("确认批准"),
      cancelText: tAdmin("取消"),
      tone: "default"
    });
    if (approvalNote === null) {
      return;
    }

    const confirmed = await confirm({
      title: tAdmin("确认批准该请假申请"),
      message: tAdmin("批准后会按现有服务端规则同步回写考勤记录，是否继续？"),
      confirmText: tAdmin("确认批准"),
      cancelText: tAdmin("取消"),
      tone: "default"
    });
    if (!confirmed) {
      return;
    }

    setSubmittingRequestId(item.id);
    try {
      await approveAdminLeaveRequest(item.id, { approvalNote });
      await loadData({ force: true });
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : tAdmin("批准请假申请失败"));
    } finally {
      setSubmittingRequestId(null);
    }
  };

  const handleReject = async (item: AdminLeaveRequestItem) => {
    const approvalNote = await prompt({
      title: tAdmin("驳回请假申请"),
      message: tAdmin("可选填写驳回原因，留空则只更新状态。"),
      placeholder: tAdmin("例如：日期冲突，请重新提交"),
      defaultValue: item.approvalNote || "",
      confirmText: tAdmin("确认驳回"),
      cancelText: tAdmin("取消"),
      tone: "warning"
    });
    if (approvalNote === null) {
      return;
    }

    const confirmed = await confirm({
      title: tAdmin("确认驳回该请假申请"),
      message: tAdmin("驳回后该申请会保留在历史记录中，但不会回写考勤。是否继续？"),
      confirmText: tAdmin("确认驳回"),
      cancelText: tAdmin("取消"),
      tone: "warning"
    });
    if (!confirmed) {
      return;
    }

    setSubmittingRequestId(item.id);
    try {
      await rejectAdminLeaveRequest(item.id, { approvalNote });
      await loadData({ force: true });
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : tAdmin("驳回请假申请失败"));
    } finally {
      setSubmittingRequestId(null);
    }
  };

  return (
    <div className="space-y-6 pb-6">
      <section className="space-y-4">
        {/* 员工域统一成“直接进入工具栏”的列表页头部：不再保留说明型标题与字段 label，筛选条件主要依赖占位符和控件默认文案识别。 */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200/80 p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            <div className="min-w-[260px] flex-1 lg:flex-none">
              <SearchableSelect
                value={selectedEmployeeId === "all" ? "all" : String(selectedEmployeeId)}
                options={employeeFilterOptions}
                onChange={(nextValue) => {
                  if (nextValue === "all") {
                    setSelectedEmployeeId("all");
                    setSelectedFilterEmployee(null);
                    setPage(1);
                    return;
                  }
                  const employee = mergeUniqueEmployees([selectedFilterEmployee, ...employeeSearchResults])
                    .find((item) => String(item.id) === nextValue) || null;
                  setSelectedEmployeeId(Number(nextValue));
                  setSelectedFilterEmployee(employee);
                  setPage(1);
                }}
                onQueryChange={(query) => void handleEmployeeQueryChange(query)}
                queryDebounceMs={250}
                placeholder={tAdmin("员工")}
                searchPlaceholder={tAdmin("搜索员工")}
                emptyText={tAdmin("未找到匹配的员工")}
                loading={employeeSearchLoading}
              />
            </div>

            <div className="min-w-[180px] flex-1 lg:flex-none">
              <select
                value={status}
                onChange={(event) => {
                  const nextStatus = event.target.value as "all" | LeaveApprovalStatus;
                  setStatus(nextStatus);
                  setPage(1);
                }}
                className="h-[38px] w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500"
              >
                <option value="all">{tAdmin("审批状态")}</option>
                <option value="pending">{tAdmin("待审批")}</option>
                <option value="approved">{tAdmin("已批准")}</option>
                <option value="rejected">{tAdmin("已驳回")}</option>
              </select>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void loadData({ force: true, page: 1 })}
            disabled={loading || submittingRequestId !== null}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            {tAdmin("刷新")}
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {summaryCards.map((card) => (
            <div key={card.key} className={cn("rounded-2xl border px-4 py-4", card.accent)}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-medium">{card.label}</div>
                  <div className="mt-2 text-3xl font-bold text-slate-900">{card.value}</div>
                </div>
                <card.icon className="mt-0.5 h-5 w-5" />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-4 flex items-center justify-end text-xs text-slate-400">
          {tAdmin("共 {{total}} 条请假申请", { total })}
        </div>

        {error ? (
          <div className="mx-6 mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <div className="overflow-x-auto px-6 py-6">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-[0.14em] text-slate-400">
                <th className="pb-3 pr-4 font-semibold">{tAdmin("员工详情")}</th>
                <th className="pb-3 pr-4 font-semibold">{tAdmin("请假类型")}</th>
                <th className="pb-3 pr-4 font-semibold">{tAdmin("请假日期")}</th>
                <th className="pb-3 pr-4 font-semibold">{tAdmin("天数")}</th>
                <th className="pb-3 pr-4 font-semibold">{tAdmin("状态")}</th>
                <th className="pb-3 font-semibold">{tAdmin("动作")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-sm text-slate-400">
                    {tAdmin("请假申请加载中...")}
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Search className="h-10 w-10 text-slate-300" />
                      <div className="text-sm font-medium">{tAdmin("没有找到符合筛选条件的请假申请")}</div>
                    </div>
                  </td>
                </tr>
              ) : items.map((item) => {
                const isSubmitting = submittingRequestId === item.id;
                return (
                  <tr key={item.id} className="hover:bg-slate-50/70 border-b border-slate-100 bg-white align-top transition-colors">
                    <td className="px-6 py-4 pr-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold overflow-hidden border-2 border-white shadow-sm flex-shrink-0">
                          {item.employeePhoto ? (
                            <img src={item.employeePhoto} className="w-full h-full object-cover" alt="" />
                          ) : (
                            <span style={{ fontSize: "14.4px" }}>{(item.employeeName || `#${item.employeeId}`).charAt(0)}</span>
                          )}
                        </div>
                        <div className="min-w-0 max-w-[180px]">
                          <p className="truncate font-semibold text-slate-900">{item.employeeName || `#${item.employeeId}`}</p>
                          {/* 请假列表的员工列跟薪资核算保持同一视觉层级：主标题显示姓名，次级文案固定为“部门 · 职位”，避免不同模块的员工卡片看起来像两套系统。 */}
                          <p className="mt-0.5 truncate text-[10px] text-slate-400">{[item.employeeDept || tAdmin("未分配"), item.employeeRole || tAdmin("未设置职位")].join(" · ")}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 pr-4">
                      <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                        {getLeaveTypeLabel(item.type)}
                      </span>
                    </td>
                    <td className="py-4 pr-4 text-slate-600">
                      <div>{item.startDate}</div>
                      <div className="mt-1 text-xs text-slate-400">{tAdmin("至")} {item.endDate}</div>
                    </td>
                    <td className="py-4 pr-4 text-slate-600">{tAdmin("{{days}} 天", { days: item.durationDays })}</td>
                    <td className="py-4 pr-4">
                      <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-semibold", STATUS_CLASS_NAMES[item.status])}>
                        {getLeaveStatusLabel(item.status)}
                      </span>
                    </td>
                    <td className="py-4">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setDetailItem(item)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          {tAdmin("详情")}
                        </button>
                        {item.status === "pending" ? (
                          <>
                            <button
                              type="button"
                              onClick={() => void handleApprove(item)}
                              disabled={isSubmitting}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              {tAdmin("批准")}
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleReject(item)}
                              disabled={isSubmitting}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              {tAdmin("驳回")}
                            </button>
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="px-6 pb-6">
          <Pagination
            page={page}
            pageSize={pageSize}
            total={total}
            itemName={tAdmin("条申请")}
            disabled={loading || submittingRequestId !== null}
            onPageChange={(nextPage) => setPage(nextPage)}
          />
        </div>

        <ModalShell
          isOpen={Boolean(detailItem)}
          onClose={() => setDetailItem(null)}
          title={tAdmin("请假申请详情")}
          className="max-w-2xl"
          bodyClassName="max-h-[70vh] overflow-y-auto"
          footer={(
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setDetailItem(null)}
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
              >
                {tAdmin("关闭")}
              </button>
            </div>
          )}
        >
          {detailItem ? (
            <div className="space-y-5 text-sm text-slate-700">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{tAdmin("员工")}</div>
                  <div className="mt-2 font-semibold text-slate-900">{detailItem.employeeName || `#${detailItem.employeeId}`}</div>
                  <div className="mt-1 text-xs text-slate-500">{[detailItem.employeeDept || tAdmin("未分配"), detailItem.employeeRole || tAdmin("未设置职位")].join(" · ")}</div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{tAdmin("申请状态")}</div>
                  <div className="mt-2">
                    <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-semibold", STATUS_CLASS_NAMES[detailItem.status])}>
                      {getLeaveStatusLabel(detailItem.status)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{tAdmin("请假类型")}</div>
                  <div className="mt-2 rounded-xl border border-slate-200 bg-white px-4 py-3">{getLeaveTypeLabel(detailItem.type)}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{tAdmin("请假日期")}</div>
                  <div className="mt-2 rounded-xl border border-slate-200 bg-white px-4 py-3">
                    <div>{detailItem.startDate}</div>
                    <div className="mt-1 text-xs text-slate-500">{tAdmin("至")} {detailItem.endDate} · {tAdmin("{{days}} 天", { days: detailItem.durationDays })}</div>
                  </div>
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{tAdmin("原因")}</div>
                <div className="mt-2 rounded-xl border border-slate-200 bg-white px-4 py-3 whitespace-pre-wrap break-words">{detailItem.reason || "-"}</div>
              </div>

              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{tAdmin("审批信息")}</div>
                <div className="mt-2 rounded-xl border border-slate-200 bg-white px-4 py-3 space-y-2 text-sm text-slate-600">
                  <div>{tAdmin("提交时间")}: {formatDateTime(detailItem.submittedAt)}</div>
                  <div>{tAdmin("审批时间")}: {formatDateTime(detailItem.approvedAt || detailItem.rejectedAt)}</div>
                  <div className="whitespace-pre-wrap break-words">{tAdmin("审批备注")}: {detailItem.approvalNote || "-"}</div>
                </div>
              </div>
            </div>
          ) : null}
        </ModalShell>
      </section>
    </div>
  );
}
