/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from "react";
import { Plus, AlertCircle, Loader2 } from "lucide-react";
import { Employee, LeaveRequest } from "../../types";
import { formatDate, getNowDateStr } from "../../lib/utils";
import { createLeaveRequest } from "../../lib/attendanceApi";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { DatePicker } from "../ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

interface LeaveCreateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employees: Employee[];
  leaveRequests: LeaveRequest[];
  onCreated: (newRecord: LeaveRequest) => void;
  onRefreshAttendance?: () => void;
  addToast?: (msg: string, kind?: "success" | "error" | "info") => void;
}

export const LeaveCreateModal: React.FC<LeaveCreateModalProps> = ({
  open,
  onOpenChange,
  employees,
  leaveRequests,
  onCreated,
  onRefreshAttendance,
  addToast
}) => {
  const activeEmployees = useMemo(() => {
    const activeList = employees.filter(
      emp => emp.status === "在职" || (emp.status as any) === "active" || emp.status === "试用" || (emp.status as any) === "probation"
    );
    if (activeList.length > 0) return activeList;
    return employees.filter(emp => emp.status !== "离职" && (emp.status as any) !== "resigned");
  }, [employees]);

  const [addEmpId, setAddEmpId] = useState<string>("");
  const [addType, setAddType] = useState<string>("事假");
  const [addStartDate, setAddStartDate] = useState<string>(getNowDateStr());
  const [addEndDate, setAddEndDate] = useState<string>(getNowDateStr());
  const [addReason, setAddReason] = useState<string>("");
  const [addStatus, setAddStatus] = useState<"approved" | "pending">("approved");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (activeEmployees.length > 0 && (!addEmpId || !activeEmployees.some(e => String(e.id) === String(addEmpId)))) {
      setAddEmpId(String(activeEmployees[0].id));
    }
  }, [activeEmployees, addEmpId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!addEmpId) {
      setError("请选择请假员工");
      return;
    }

    const selectedEmp = employees.find(e => String(e.id) === String(addEmpId));
    if (
      !selectedEmp ||
      (selectedEmp.status !== "在职" &&
        (selectedEmp.status as any) !== "active" &&
        selectedEmp.status !== "试用" &&
        (selectedEmp.status as any) !== "probation")
    ) {
      setError("请假员工必须是在职员工");
      return;
    }

    const sDate = formatDate(addStartDate, "");
    const eDate = formatDate(addEndDate, "");
    if (!sDate || !eDate) {
      setError("请选择完整的起止日期");
      return;
    }
    if (sDate > eDate) {
      setError("开始日期不能晚于结束日期");
      return;
    }

    setLoading(true);
    try {
      const created = await createLeaveRequest({
        empId: Number(addEmpId),
        type: addType,
        startDate: sDate,
        endDate: eDate,
        reason: addReason.trim() || "管理员代录",
        status: addStatus
      });

      onCreated(created);
      addToast?.(`🎉 已成功为【${selectedEmp.name}】录入请假申请。`, "success");
      const nowStr = getNowDateStr();
      setAddReason("");
      setAddStartDate(nowStr);
      setAddEndDate(nowStr);
      onOpenChange(false);
      onRefreshAttendance?.();
    } catch (err: any) {
      setError(err.message || "录入请假申请失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!loading) {
          onOpenChange(nextOpen);
        }
      }}
    >
      <DialogContent
        className="sm:max-w-md p-6"
        onPointerDownOutside={(e) => {
          if (loading) e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          if (loading) e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-800">
            <Plus className="w-4 h-4 text-brand-600" />
            代录请假单
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-rose-700 text-xs font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">请假员工 *</Label>
            <Select value={addEmpId} onValueChange={setAddEmpId}>
              <SelectTrigger className="w-full h-9 bg-white">
                <SelectValue placeholder="选择在职员工..." />
              </SelectTrigger>
              <SelectContent className="max-h-56">
                {activeEmployees.map(emp => (
                  <SelectItem key={emp.id} value={String(emp.id)}>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{emp.name}</span>
                      <span className="text-xs text-slate-400">({emp.workId || `EMP-${emp.id}`})</span>
                      <span className="text-xs text-slate-500 font-normal">· {emp.dept || "未分配"}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">请假类型 *</Label>
              <Select value={addType} onValueChange={setAddType}>
                <SelectTrigger className="w-full h-9 bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="事假">事假</SelectItem>
                  <SelectItem value="病假">病假</SelectItem>
                  <SelectItem value="年假">年假</SelectItem>
                  <SelectItem value="调休">调休</SelectItem>
                  <SelectItem value="婚产假">婚产假</SelectItem>
                  <SelectItem value="丧假">丧假</SelectItem>
                  <SelectItem value="其他">其他</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">初始状态 *</Label>
              <Select value={addStatus} onValueChange={(val: any) => setAddStatus(val)}>
                <SelectTrigger className="w-full h-9 bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="approved">直接批准 (录入正式考勤)</SelectItem>
                  <SelectItem value="pending">待审批 (草稿待确认)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">开始日期 *</Label>
              <DatePicker
                date={addStartDate ? new Date(addStartDate) : undefined}
                setDate={(d) => setAddStartDate(d ? d.toISOString().slice(0, 10) : "")}
                placeholder="请选择开始日期"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">结束日期 *</Label>
              <DatePicker
                date={addEndDate ? new Date(addEndDate) : undefined}
                setDate={(d) => setAddEndDate(d ? d.toISOString().slice(0, 10) : "")}
                placeholder="请选择结束日期"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">请假事由说明</Label>
            <Input
              value={addReason}
              onChange={(e) => setAddReason(e.target.value)}
              placeholder="请输入请假具体原因（选填）"
              className="h-9"
            />
          </div>

          <DialogFooter className="pt-2 gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={loading}
              onClick={() => onOpenChange(false)}
            >
              取消
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={loading}
              className="bg-brand-600 hover:bg-brand-700 text-white gap-1.5 font-bold"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              确认录入
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
