/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Search, Plus, RefreshCw, CheckCircle, XCircle, Trash2, Loader2, X, User } from "lucide-react";
import { LeaveRequest } from "../../types";
import { cn } from "../../lib/utils";
import { useStickyMirrorHeader } from "../../lib/useStickyMirrorHeader";
import { Pagination } from "../Pagination";
import { updateLeaveRequestStatus, deleteLeaveRequest } from "../../lib/attendanceApi";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { LeaveTableProps, LeaveStatusFilter } from "./types";
import { LeaveStatusBadge, LeaveTypeTag } from "./LeaveStatusBadge";
import { LeaveCreateModal } from "./LeaveCreateModal";
import { LeaveDeleteDialog } from "./LeaveDeleteDialog";
import { useLeaveTableFilter } from "./useLeaveTableFilter";

export function LeaveTable({
  employees,
  leaveRequests = [],
  onUpdateLeaveRequests,
  hasPermission = () => true,
  addToast,
  onRefreshAttendance,
  onRefresh
}: LeaveTableProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<LeaveRequest | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const {
    leaveSearch,
    setLeaveSearch,
    leaveStatusFilter,
    setLeaveStatusFilter,
    page,
    setPage,
    pageSize,
    setPageSize,
    filteredLeaveRequests,
    paginatedLeaveRequests,
    totalPages,
    getEmployeeInfo
  } = useLeaveTableFilter({ employees, leaveRequests });

  const {
    tableContainerRef,
    realTableRef,
    mirrorHeaderRef,
    realTheadRef,
    tableHeadSentinelRef,
    isMirrorHeaderVisible,
    realTableWidth,
    handleTableScroll
  } = useStickyMirrorHeader();

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      if (onRefresh) {
        await onRefresh();
      } else if (onRefreshAttendance) {
        await onRefreshAttendance();
      }
      addToast?.("请假记录已刷新", "success");
    } catch (err: any) {
      addToast?.(err.message || "刷新失败", "error");
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleApproveLeave = async (id: string, status: "approved" | "rejected" | "pending") => {
    const target = leaveRequests.find(l => l.id === id);
    const emp = target ? getEmployeeInfo(target.empId) : null;
    const empName = emp?.name || "员工";

    setActionLoadingId(id);
    try {
      const updatedReq = await updateLeaveRequestStatus(id, status);
      const updated = leaveRequests.map(l => (l.id === id ? { ...l, status: updatedReq.status } : l));
      onUpdateLeaveRequests(updated);

      const msgMap: Record<string, string> = {
        approved: `🎉 已批准【${empName}】的请假申请，考勤已同步联动。`,
        rejected: `已驳回【${empName}】的请假申请。`,
        pending: `已重置【${empName}】的请假申请为待审批状态。`
      };
      addToast?.(msgMap[status] || "审批状态已更新", status === "rejected" ? "info" : "success");
      onRefreshAttendance?.();
    } catch (err: any) {
      addToast?.(err.message || "审批操作失败", "error");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteLeaveRequest(deleteTarget.id);
      const updated = leaveRequests.filter(l => l.id !== deleteTarget.id);
      onUpdateLeaveRequests(updated);
      addToast?.("🎉 请假记录已彻底删除，对应考勤已同步清理。", "success");
      onRefreshAttendance?.();
      setDeleteTarget(null);
    } catch (err: any) {
      addToast?.(err.message || "删除请假记录失败", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const pendingCount = leaveRequests.filter(l => l.status === "pending").length;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* 顶部搜索与过滤面板 */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={leaveSearch}
              onChange={(e) => setLeaveSearch(e.target.value)}
              placeholder="搜索员工姓名、工号、部门、事由..."
              className="pl-9 pr-8 h-9 text-xs"
            />
            {leaveSearch && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setLeaveSearch("")}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 h-6 w-6 text-slate-400 hover:text-slate-600 rounded-full"
                title="清空搜索"
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>

          <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-lg border border-slate-200/60">
            {(["all", "pending", "approved", "rejected"] as const).map((status) => {
              const labels: Record<LeaveStatusFilter, string> = {
                all: "全部",
                pending: "待审批",
                approved: "已批准",
                rejected: "已驳回"
              };
              const isSelected = leaveStatusFilter === status;
              return (
                <Button
                  key={status}
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setLeaveStatusFilter(status)}
                  className={cn(
                    "h-7 px-3 text-xs font-bold rounded-md transition-all flex items-center gap-1.5",
                    isSelected
                      ? "bg-white text-slate-900 shadow-xs hover:bg-white"
                      : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                  )}
                >
                  <span>{labels[status]}</span>
                  {status === "pending" && pendingCount > 0 && (
                    <span className="px-1.5 py-0.5 bg-amber-500 text-white rounded-full text-[10px] font-black leading-none">
                      {pendingCount}
                    </span>
                  )}
                </Button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isRefreshing}
            onClick={handleRefresh}
            className="h-9 gap-1.5 text-xs font-semibold"
          >
            <RefreshCw className={cn("w-3.5 h-3.5 text-slate-500", isRefreshing && "animate-spin")} />
            <span>刷新</span>
          </Button>

          {hasPermission("leave_approve") && (
            <Button
              type="button"
              size="sm"
              onClick={() => setShowAddModal(true)}
              className="h-9 gap-1.5 text-xs font-bold bg-brand-600 hover:bg-brand-700 text-white shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>代录请假单</span>
            </Button>
          )}
        </div>
      </div>

      {/* 吸顶镜像表头 */}
      {isMirrorHeaderVisible && (
        <div
          ref={mirrorHeaderRef}
          className="fixed z-20 left-0 right-0 top-16 max-w-7xl mx-auto px-4 pointer-events-none"
        >
          <div className="overflow-x-hidden border-t border-slate-200/80 bg-slate-50/95 backdrop-blur-xs shadow-xs">
            <table
              style={{ width: realTableWidth ? `${realTableWidth}px` : "100%" }}
              className="text-left border-collapse table-fixed text-xs"
            >
              <thead>
                <tr className="text-slate-500 font-bold border-b border-slate-200/80">
                  <th className="px-5 py-3.5 w-[22%]">员工信息</th>
                  <th className="px-5 py-3.5 w-[12%] whitespace-nowrap">请假类型</th>
                  <th className="px-5 py-3.5 w-[20%] whitespace-nowrap">起止日期 & 天数</th>
                  <th className="px-5 py-3.5 w-[24%]">事由说明</th>
                  <th className="px-5 py-3.5 w-[11%] min-w-[100px] whitespace-nowrap">状态</th>
                  <th className="px-5 py-3.5 text-right w-[11%] min-w-[130px] whitespace-nowrap">操作</th>
                </tr>
              </thead>
            </table>
          </div>
        </div>
      )}

      {/* 表格容器 */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div ref={tableHeadSentinelRef} className="h-0 w-full" />
        <div ref={tableContainerRef} onScroll={handleTableScroll} className="overflow-x-auto relative rounded-b-xl">
          <table ref={realTableRef} className="w-full text-left border-collapse text-xs">
            <thead ref={realTheadRef}>
              <tr className="bg-slate-50/75 text-slate-500 font-bold border-b border-slate-100">
                <th className="px-5 py-3.5 w-[22%]">员工信息</th>
                <th className="px-5 py-3.5 w-[12%] whitespace-nowrap">请假类型</th>
                <th className="px-5 py-3.5 w-[20%] whitespace-nowrap">起止日期 & 天数</th>
                <th className="px-5 py-3.5 w-[24%]">事由说明</th>
                <th className="px-5 py-3.5 w-[11%] min-w-[100px] whitespace-nowrap">状态</th>
                <th className="px-5 py-3.5 text-right w-[11%] min-w-[130px] whitespace-nowrap">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedLeaveRequests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-400">
                    <User className="w-8 h-8 mx-auto mb-2 text-slate-300 opacity-60" />
                    <p className="text-sm font-semibold">暂无符合条件的请假记录</p>
                  </td>
                </tr>
              ) : (
                paginatedLeaveRequests.map((req) => {
                  const emp = getEmployeeInfo(req.empId);
                  const isActionLoading = actionLoadingId === req.id;
                  const isPending = req.status === "pending";

                  return (
                    <tr key={req.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-4 w-[22%]">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600 shrink-0">
                            {emp?.name?.slice(0, 1) || "员"}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-slate-800 flex items-center gap-1.5 truncate max-w-[150px]" title={emp?.name || "未知员工"}>
                              <span className="truncate">{emp?.name || "未知员工"}</span>
                              <span className="text-[10px] text-slate-400 font-mono font-normal shrink-0">
                                ({emp?.workId || `EMP-${req.empId}`})
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 truncate max-w-[160px]" title={`${emp?.dept || "未分配"} · ${emp?.role || "员工"}`}>
                              {emp?.dept || "未分配"} · {emp?.role || "员工"}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4 w-[12%]">
                        <LeaveTypeTag type={req.type} />
                      </td>

                      <td className="px-5 py-4 w-[20%] whitespace-nowrap">
                        <div className="space-y-0.5">
                          <div className="font-semibold text-slate-700">
                            {req.startDate} ~ {req.endDate}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            共计 <span className="font-bold text-slate-700">{req.days || 1}</span> 天
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4 w-[24%] max-w-xs">
                        <p className="text-slate-600 line-clamp-2 leading-relaxed" title={req.reason}>
                          {req.reason || "-"}
                        </p>
                      </td>

                      <td className="px-5 py-4 w-[11%] min-w-[100px] whitespace-nowrap">
                        <LeaveStatusBadge status={req.status} />
                      </td>

                      <td className="px-5 py-4 w-[11%] min-w-[130px] text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {isPending ? (
                            <>
                              <Button
                                type="button"
                                size="sm"
                                disabled={!hasPermission("leave_approve") || Boolean(actionLoadingId)}
                                onClick={() => handleApproveLeave(req.id, "approved")}
                                className={cn(
                                  "h-7 px-2.5 text-white font-bold text-[11px] gap-1 shadow-xs",
                                  hasPermission("leave_approve") && !actionLoadingId
                                    ? "bg-emerald-600 hover:bg-emerald-700 cursor-pointer"
                                    : "bg-slate-300 opacity-60 cursor-not-allowed"
                                )}
                              >
                                {isActionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                                同意
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="destructive"
                                disabled={!hasPermission("leave_approve") || Boolean(actionLoadingId)}
                                onClick={() => handleApproveLeave(req.id, "rejected")}
                                className={cn(
                                  "h-7 px-2.5 font-bold text-[11px] gap-1 shadow-xs",
                                  hasPermission("leave_approve") && !actionLoadingId
                                    ? "bg-rose-600 hover:bg-rose-700 text-white cursor-pointer"
                                    : "bg-slate-300 opacity-60 text-white cursor-not-allowed"
                                )}
                              >
                                {isActionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                                拒绝
                              </Button>
                            </>
                          ) : (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={!hasPermission("leave_approve") || Boolean(actionLoadingId)}
                              onClick={() => handleApproveLeave(req.id, "pending")}
                              className="h-7 px-2.5 border text-[10px] font-semibold gap-1 border-slate-200 hover:border-slate-300 text-slate-600"
                            >
                              {isActionLoading && <Loader2 className="w-3 h-3 animate-spin" />}
                              重置审批
                            </Button>
                          )}

                          {hasPermission("leave_approve") && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              disabled={Boolean(actionLoadingId) || isDeleting}
                              onClick={() => setDeleteTarget(req)}
                              className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                              title="删除此请假记录"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 分页栏 */}
        {filteredLeaveRequests.length > 0 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between">
            <Pagination
              page={page}
              pageSize={pageSize}
              total={filteredLeaveRequests.length}
              itemName="条请假单"
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          </div>
        )}
      </div>

      {/* 代录请假单弹窗 */}
      <LeaveCreateModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        employees={employees}
        leaveRequests={leaveRequests}
        onCreated={(created) => onUpdateLeaveRequests([created, ...leaveRequests])}
        onRefreshAttendance={onRefreshAttendance}
        addToast={addToast}
      />

      {/* 现代删除确认弹窗（替代原生阻塞式 window.confirm） */}
      <LeaveDeleteDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        empName={deleteTarget ? getEmployeeInfo(deleteTarget.empId)?.name || "此员工" : ""}
        loading={isDeleting}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
