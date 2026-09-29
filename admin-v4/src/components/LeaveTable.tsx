/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type React from 'react';
import { useMemo, useState, useEffect } from 'react';
import { Search, Clock, CheckCircle, XCircle, User, Trash2, Plus, Loader2, RefreshCw, AlertCircle, X } from "lucide-react";
import { Employee, LeaveRequest } from "../types";
import { cn, formatDate, getNowDateStr } from "../lib/utils";
import { useStickyMirrorHeader } from "../lib/useStickyMirrorHeader";
import { Pagination } from "./Pagination";
import {
  updateLeaveRequestStatus,
  createLeaveRequest,
  deleteLeaveRequest
} from "../lib/attendanceApi";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { DatePicker } from "./ui/date-picker";
import { Label } from "./ui/label";

interface LeaveTableProps {
  employees: Employee[];
  leaveRequests: LeaveRequest[];
  onUpdateLeaveRequests: (newList: LeaveRequest[]) => void;
  hasPermission?: (permId: string) => boolean;
  addToast?: (msg: string, kind?: "success" | "error" | "info") => void;
  warehouseCode?: string;
  onRefreshAttendance?: () => void;
  onRefresh?: () => Promise<void> | void;
}

export function LeaveTable({
  employees,
  leaveRequests = [],
  onUpdateLeaveRequests,
  hasPermission = () => true,
  addToast,
  warehouseCode,
  onRefreshAttendance,
  onRefresh
}: LeaveTableProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

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
  const [leaveSearch, setLeaveSearch] = useState('');
  const [leaveStatusFilter, setLeaveStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // 在职员工过滤：代录请假单仅限在职员工
  const activeEmployees = useMemo(() => {
    const activeList = employees.filter(emp => emp.status === '在职' || (emp.status as any) === 'active' || emp.status === '试用' || (emp.status as any) === 'probation');
    if (activeList.length > 0) return activeList;
    return employees.filter(emp => emp.status !== '离职' && (emp.status as any) !== 'resigned');
  }, [employees]);

  // Modal State for Manual Leave Creation - 默认起止日期为当天
  const [showAddModal, setShowAddModal] = useState(false);
  const [addEmpId, setAddEmpId] = useState<string>('');
  const [addType, setAddType] = useState<string>('事假');
  const [addStartDate, setAddStartDate] = useState<string>(getNowDateStr());
  const [addEndDate, setAddEndDate] = useState<string>(getNowDateStr());
  const [addReason, setAddReason] = useState<string>('');
  const [addStatus, setAddStatus] = useState<'approved' | 'pending'>('approved');
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // 保证在职员工列表变动或弹窗准备时，默认选中第一位在职员工
  useEffect(() => {
    if (activeEmployees.length > 0 && (!addEmpId || !activeEmployees.some(e => String(e.id) === String(addEmpId)))) {
      setAddEmpId(String(activeEmployees[0].id));
    }
  }, [activeEmployees, addEmpId]);

  // Reset page when search or status filter changes
  useEffect(() => {
    setPage(1);
  }, [leaveSearch, leaveStatusFilter, employees]);

  const getEmployeeInfo = (empId: number | string) => {
    return employees.find(e => String(e.id) === String(empId));
  };

  const handleApproveLeave = async (id: string, status: 'approved' | 'rejected' | 'pending') => {
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

  const handleDeleteLeave = async (id: string) => {
    const target = leaveRequests.find(l => l.id === id);
    const emp = target ? getEmployeeInfo(target.empId) : null;
    const empName = emp?.name || "此员工";

    if (!confirm(`确定要删除【${empName}】这条请假记录吗？若已审批通过，对应日期的考勤记录也将同步撤销。`)) {
      return;
    }

    setActionLoadingId(id);
    try {
      await deleteLeaveRequest(id);
      const updated = leaveRequests.filter(l => l.id !== id);
      onUpdateLeaveRequests(updated);
      addToast?.("🎉 请假记录已彻底删除，对应考勤已同步清理。", "success");
      onRefreshAttendance?.();
    } catch (err: any) {
      addToast?.(err.message || "删除请假记录失败", "error");
    } finally {
      setActionLoadingId(null);
    }
  };


  const handleCreateLeaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);

    if (!addEmpId) {
      setAddError("请选择请假员工");
      return;
    }

    const selectedEmp = employees.find(e => String(e.id) === String(addEmpId));
    if (!selectedEmp || (selectedEmp.status !== '在职' && (selectedEmp.status as any) !== 'active' && selectedEmp.status !== '试用' && (selectedEmp.status as any) !== 'probation')) {
      setAddError("请假员工必须是在职员工");
      return;
    }
    if (!addStartDate || !addEndDate) {
      setAddError("请选择完整的起止日期");
      return;
    }
    if (addStartDate > addEndDate) {
      setAddError("开始日期不能晚于结束日期");
      return;
    }

    setAddLoading(true);
    try {
      const created = await createLeaveRequest({
        empId: Number(addEmpId),
        type: addType,
        startDate: addStartDate,
        endDate: addEndDate,
        reason: addReason.trim() || "管理员代录",
        status: addStatus
      });

      onUpdateLeaveRequests([created, ...leaveRequests]);
      const emp = getEmployeeInfo(addEmpId);
      addToast?.(`🎉 已成功为【${emp?.name || "员工"}】录入请假申请。`, "success");
      const nowStr = getNowDateStr();
      setShowAddModal(false);
      setAddReason('');
      setAddStartDate(nowStr);
      setAddEndDate(nowStr);
      onRefreshAttendance?.();
    } catch (err: any) {
      setAddError(err.message || "录入请假申请失败");
    } finally {
      setAddLoading(false);
    }
  };

  const currentEmpIds = useMemo(() => new Set(employees.map(e => String(e.id))), [employees]);

  const filteredLeaveRequests = useMemo(() => {
    let list = leaveRequests;
    // 跨仓隔离：仅展示归属于当前所选国家/仓库员工的请假单
    if (employees.length > 0) {
      list = list.filter(l => currentEmpIds.has(String(l.empId)));
    }
    if (leaveStatusFilter !== 'all') {
      list = list.filter(l => l.status === leaveStatusFilter);
    }
    if (leaveSearch.trim()) {
      const q = leaveSearch.trim().toLowerCase();
      list = list.filter(l => {
        const emp = getEmployeeInfo(l.empId);
        const name = emp?.name || "";
        const dept = emp?.dept || "";
        const role = emp?.role || "";
        const type = l.type || "";
        const reason = l.reason || "";
        return (
          name.toLowerCase().includes(q) ||
          dept.toLowerCase().includes(q) ||
          role.toLowerCase().includes(q) ||
          type.toLowerCase().includes(q) ||
          reason.toLowerCase().includes(q)
        );
      });
    }
    return list;
  }, [leaveRequests, leaveStatusFilter, leaveSearch, employees, currentEmpIds]);

  const total = filteredLeaveRequests.length;
  const paginatedRequests = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredLeaveRequests.slice(start, start + pageSize);
  }, [filteredLeaveRequests, page, pageSize]);

  const {
    tableContainerRef,
    mirrorHeaderRef,
    realTableRef,
    realTheadRef,
    tableHeadSentinelRef,
    actionBarRef,
    isMirrorHeaderVisible,
    colWidths,
    realTableWidth,
    handleTableScroll,
  } = useStickyMirrorHeader({
    deps: [paginatedRequests, isRefreshing],
  });

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Compact Filter Panel */}
      <div className="bg-slate-50/95 border border-slate-200/80 rounded-xl p-3 sm:p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-1 items-center gap-2 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            <Input
              type="text"
              value={leaveSearch}
              onChange={(e) => { setLeaveSearch(e.target.value); setPage(1); }}
              placeholder="搜索员工姓名、请假类型、原因..."
              className="h-8 pl-8 pr-8 text-xs bg-white shadow-2xs font-medium border-slate-200 focus-visible:ring-1 focus-visible:ring-brand-500"
            />
            {leaveSearch && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => { setLeaveSearch(""); setPage(1); }}
                className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 text-slate-400 hover:text-slate-600 p-0 rounded-full"
                title="清空搜索"
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">审批状态:</span>
            <div className="flex bg-slate-200/60 p-0.5 rounded-lg border border-slate-200/40">
              {(['all', 'pending', 'approved', 'rejected'] as const).map(status => {
                const labelMap: Record<string, string> = {
                  all: '全部',
                  pending: '待审批',
                  approved: '已同意',
                  rejected: '已拒绝'
                };
                const pendingCount = filteredLeaveRequests.filter(l => l.status === 'pending').length;
                return (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setLeaveStatusFilter(status)}
                    className={cn(
                      "px-3 py-1 text-xs font-medium rounded-md transition-all cursor-pointer inline-flex items-center",
                      leaveStatusFilter === status
                        ? "bg-white text-slate-800 shadow-xs border border-slate-200/30 font-bold"
                        : "text-slate-500 hover:text-slate-700"
                    )}
                  >
                    <span>{labelMap[status]}</span>
                    {status === 'pending' && pendingCount > 0 && (
                      <Badge variant="destructive" className="ml-1 px-1.5 py-0 h-4 text-[9px] font-black rounded-full leading-none">
                        {pendingCount}
                      </Badge>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Leave Table Panel */}
      <div className="glass-panel rounded-xl shadow-sm border border-slate-200/80 bg-white">
        <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-xs rounded-t-xl shadow-2xs border-b border-slate-100">
          <div ref={actionBarRef} className="p-4 flex justify-between items-center flex-wrap gap-2">
            <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
              <span>请假记录列表</span>
              <span className="text-xs font-normal text-slate-400">（共 {total} 条）</span>
              {filteredLeaveRequests.filter(l => l.status === 'pending').length > 0 && (
                <Badge variant="destructive" className="text-xs bg-rose-50 text-rose-700 border-rose-200 font-bold animate-pulse hover:bg-rose-100">
                  有 {filteredLeaveRequests.filter(l => l.status === 'pending').length} 项待处理
                </Badge>
              )}
            </h3>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="h-8 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 gap-1.5 shadow-2xs"
                title="刷新请假记录与考勤关联"
              >
                <RefreshCw className={cn("w-3.5 h-3.5 text-slate-500", isRefreshing && "animate-spin")} />
                <span>刷新</span>
              </Button>
              {hasPermission("leave_approve") && (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    setAddError(null);
                    if (employees.length > 0 && !addEmpId) {
                      setAddEmpId(String(employees[0].id));
                    }
                    setShowAddModal(true);
                  }}
                  className="h-8 text-xs font-bold bg-brand-600 hover:bg-brand-700 text-white gap-1.5 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  代录请假单
                </Button>
              )}
            </div>
          </div>

          {/* 悬浮镜像表头 (Sticky Mirror Header - 方案二) */}
          {isMirrorHeaderVisible && (
            <div
              ref={mirrorHeaderRef}
              className="overflow-x-hidden border-t border-slate-200/80 bg-slate-50/95 backdrop-blur-xs shadow-xs transition-opacity duration-150"
            >
              <table
                style={{ width: realTableWidth ? `${realTableWidth}px` : "100%" }}
                className="text-left border-collapse table-fixed text-xs"
              >
                <thead>
                  <tr className="bg-slate-50/95 text-slate-500 font-bold border-b border-slate-200">
                    <th style={{ width: colWidths[0] ? `${colWidths[0]}px` : undefined }} className="px-5 py-3">申请员工</th>
                    <th style={{ width: colWidths[1] ? `${colWidths[1]}px` : undefined }} className="px-5 py-3">请假类型</th>
                    <th style={{ width: colWidths[2] ? `${colWidths[2]}px` : undefined }} className="px-5 py-3">起止日期</th>
                    <th style={{ width: colWidths[3] ? `${colWidths[3]}px` : undefined }} className="px-5 py-3 text-center">时长 (天)</th>
                    <th style={{ width: colWidths[4] ? `${colWidths[4]}px` : undefined }} className="px-5 py-3">请假原因</th>
                    <th style={{ width: colWidths[5] ? `${colWidths[5]}px` : undefined }} className="px-5 py-3">当前状态</th>
                    <th style={{ width: colWidths[6] ? `${colWidths[6]}px` : undefined }} className="px-5 py-3 text-left">审批操作</th>
                  </tr>
                </thead>
              </table>
            </div>
          )}
        </div>

        <div ref={tableHeadSentinelRef} className="h-0 w-full" />
        <div ref={tableContainerRef} onScroll={handleTableScroll} className="overflow-x-auto relative rounded-b-xl">
          <table ref={realTableRef} className="w-full text-left border-collapse text-xs">
            <thead ref={realTheadRef}>
              <tr className="bg-slate-50/75 text-slate-500 font-bold border-b border-slate-100">
                <th className="px-5 py-3">申请员工</th>
                <th className="px-5 py-3">请假类型</th>
                <th className="px-5 py-3">起止日期</th>
                <th className="px-5 py-3 text-center">时长 (天)</th>
                <th className="px-5 py-3">请假原因</th>
                <th className="px-5 py-3">当前状态</th>
                <th className="px-5 py-3 text-left">审批操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {paginatedRequests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-400 font-bold">
                    {leaveRequests.length === 0 ? "暂无请假申请记录" : "暂无符合条件的请假申请记录"}
                  </td>
                </tr>
              ) : (
                paginatedRequests.map((req) => {
                  const emp = getEmployeeInfo(req.empId);
                  const isActionLoading = actionLoadingId === req.id;

                  const typeBadgeClass =
                    req.type === "病假" || req.type === "sick"
                      ? "bg-rose-50 text-rose-700 border-rose-200"
                      : req.type === "年假" || req.type === "annual"
                      ? "bg-blue-50 text-blue-700 border-blue-200"
                      : "bg-amber-50 text-amber-700 border-amber-200";

                  const typeDisplayName =
                    req.type === "sick"
                      ? "病假"
                      : req.type === "personal"
                      ? "事假"
                      : req.type === "annual"
                      ? "年假"
                      : req.type;

                  return (
                    <tr key={req.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200/80 flex items-center justify-center font-bold text-slate-700 shrink-0 overflow-hidden shadow-3xs">
                            {emp?.photo ? (
                              <img src={emp.photo} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                            ) : (
                              <span className="text-xs">{emp?.name ? emp.name.charAt(0) : <User className="w-4 h-4 text-slate-400" />}</span>
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="font-bold text-slate-800">{emp?.name || '未知员工'}</p>
                              {emp?.status && (
                                <Badge
                                  variant={emp.status === '在职' ? "success" : emp.status === '离职' ? "destructive" : emp.status === '试用' ? "warning" : "secondary"}
                                  className="text-[9px] px-1 py-0 h-3.5 leading-none font-medium"
                                >
                                  {emp.status}
                                </Badge>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              {[emp?.dept, emp?.role].filter(Boolean).join(" · ") || "未分配"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <Badge
                          variant={
                            req.type === "病假" || req.type === "sick"
                              ? "destructive"
                              : req.type === "年假" || req.type === "annual"
                              ? "secondary"
                              : "warning"
                          }
                          className={cn("px-2 py-0.5 rounded text-[11px] font-bold border", typeBadgeClass)}
                        >
                          {typeDisplayName}
                        </Badge>
                      </td>
                      <td className="px-5 py-4 font-mono tabular-nums text-slate-600">
                        <div className="space-y-0.5">
                          <p className="font-semibold text-slate-700">{formatDate(req.startDate)}</p>
                          <p className="text-[10px] text-slate-400">至 {formatDate(req.endDate)}</p>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-center font-bold text-slate-700">
                        {req.days} 天
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-slate-600 max-w-xs break-words italic bg-slate-50 border border-slate-100 p-2 rounded-lg text-[11px]">
                          "{req.reason}"
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        {req.status === 'pending' && (
                          <Badge variant="warning" className="gap-1.5 px-2.5 py-1 text-[11px] font-bold border border-amber-200 animate-pulse">
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            待审批
                          </Badge>
                        )}
                        {req.status === 'approved' && (
                          <Badge variant="success" className="gap-1.5 px-2.5 py-1 text-[11px] font-bold border border-emerald-200">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                            已同意
                          </Badge>
                        )}
                        {req.status === 'rejected' && (
                          <Badge variant="destructive" className="gap-1.5 px-2.5 py-1 text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100">
                            <XCircle className="w-3.5 h-3.5 text-rose-600" />
                            已拒绝
                          </Badge>
                        )}
                      </td>
                      <td className="px-5 py-4 text-left">
                        <div className="inline-flex items-center justify-start gap-1.5">
                          {req.status === 'pending' ? (
                            <>
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => {
                                  if (hasPermission("leave_approve") && !isActionLoading) {
                                    handleApproveLeave(req.id, 'approved');
                                  }
                                }}
                                disabled={!hasPermission("leave_approve") || isActionLoading}
                                className={cn(
                                  "h-7 px-2.5 text-white font-bold text-[11px] gap-1 shadow-xs",
                                  hasPermission("leave_approve") && !isActionLoading
                                    ? "bg-emerald-600 hover:bg-emerald-700 cursor-pointer"
                                    : "bg-slate-300 opacity-60 cursor-not-allowed"
                                )}
                                title={hasPermission("leave_approve") ? "批准请假" : "无权限审批请假单"}
                              >
                                {isActionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                                {!hasPermission("leave_approve") && "🔒"}同意
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="destructive"
                                onClick={() => {
                                  if (hasPermission("leave_approve") && !isActionLoading) {
                                    handleApproveLeave(req.id, 'rejected');
                                  }
                                }}
                                disabled={!hasPermission("leave_approve") || isActionLoading}
                                className={cn(
                                  "h-7 px-2.5 font-bold text-[11px] gap-1 shadow-xs",
                                  hasPermission("leave_approve") && !isActionLoading
                                    ? "bg-rose-600 hover:bg-rose-700 text-white cursor-pointer"
                                    : "bg-slate-300 opacity-60 text-white cursor-not-allowed"
                                )}
                                title={hasPermission("leave_approve") ? "驳回请假" : "无权限审批请假单"}
                              >
                                {isActionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                                {!hasPermission("leave_approve") && "🔒"}拒绝
                              </Button>
                            </>
                          ) : (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                if (hasPermission("leave_approve") && !isActionLoading) {
                                  handleApproveLeave(req.id, 'pending');
                                }
                              }}
                              disabled={!hasPermission("leave_approve") || isActionLoading}
                              className={cn(
                                "h-7 px-2.5 border text-[10px] font-semibold gap-1",
                                hasPermission("leave_approve") && !isActionLoading
                                  ? "border-slate-200 hover:border-slate-300 text-slate-600 hover:text-slate-800 bg-white cursor-pointer hover:bg-slate-50"
                                  : "border-slate-100 text-slate-350 bg-slate-50 cursor-not-allowed"
                              )}
                              title={hasPermission("leave_approve") ? "重置此单审批状态为待处理" : "无权限审批请假单"}
                            >
                              {isActionLoading && <Loader2 className="w-3 h-3 animate-spin" />}
                              {!hasPermission("leave_approve") && "🔒 "}重置审批
                            </Button>
                          )}

                          {hasPermission("leave_approve") && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteLeave(req.id)}
                              disabled={isActionLoading}
                              className="h-7 w-7 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md"
                              title="删除此请假单"
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

        {/* Pagination Section */}
        {total > 0 && (
          <div className="p-4 border-t border-slate-100">
            <Pagination
              page={page}
              pageSize={pageSize}
              total={total}
              pageSizeOptions={[10, 20, 50]}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              itemName="条"
            />
          </div>
        )}
      </div>

      {/* Manual Add Leave Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="sm:max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-800">
              <Plus className="w-4 h-4 text-brand-600" />
              代录请假单
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateLeaveSubmit} className="space-y-4 pt-1">
            {addError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2 font-medium">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{addError}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-700">请假员工 *</Label>
                <span className="text-[10px] text-slate-400">仅限在职员工 ({activeEmployees.length}人)</span>
              </div>
              <Select value={addEmpId} onValueChange={setAddEmpId}>
                <SelectTrigger className="w-full h-9 text-xs bg-white border-slate-300">
                  <SelectValue placeholder={activeEmployees.length > 0 ? "-- 请选择在职员工 --" : "-- 无在职员工 --"} />
                </SelectTrigger>
                <SelectContent>
                  {activeEmployees.map((emp) => (
                    <SelectItem key={emp.id} value={String(emp.id)} className="text-xs">
                      {emp.name} ({emp.dept || "未分配"} · {emp.role || "无岗位"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">请假类型 *</Label>
              <Select value={addType} onValueChange={setAddType}>
                <SelectTrigger className="w-full h-9 text-xs bg-white border-slate-300">
                  <SelectValue placeholder="请选择请假类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="事假" className="text-xs">事假</SelectItem>
                  <SelectItem value="病假" className="text-xs">病假</SelectItem>
                  <SelectItem value="年假" className="text-xs">年假</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">开始日期 *</Label>
                <DatePicker
                  value={addStartDate}
                  onValueChange={setAddStartDate}
                  placeholder="选择开始日期"
                  className="h-9 text-xs border-slate-300 font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">结束日期 *</Label>
                <DatePicker
                  value={addEndDate}
                  onValueChange={setAddEndDate}
                  placeholder="选择结束日期"
                  className="h-9 text-xs border-slate-300 font-mono"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">审批状态</Label>
              <Select value={addStatus} onValueChange={(val) => setAddStatus(val as 'approved' | 'pending')}>
                <SelectTrigger className="w-full h-9 text-xs bg-white border-slate-300">
                  <SelectValue placeholder="请选择审批状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="approved" className="text-xs">直接同意并联动考勤</SelectItem>
                  <SelectItem value="pending" className="text-xs">保持待审批</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">请假原因 / 事由</Label>
              <textarea
                value={addReason}
                onChange={(e) => setAddReason(e.target.value)}
                placeholder="填写请假具体事由..."
                rows={2}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium resize-none shadow-xs"
              />
            </div>

            <DialogFooter className="pt-2 gap-2 sm:justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowAddModal(false)}
                disabled={addLoading}
                className="h-9 px-4 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                取消
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={addLoading}
                className="h-9 px-4 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-xs gap-1.5"
              >
                {addLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                确认录入
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
