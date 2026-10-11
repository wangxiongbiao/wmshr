import React, { useState, useEffect } from "react";
import { ExpenseRecord, Employee } from "../types";
import { formatExpenseAmount } from "../constants";
import { Button } from "../../ui/button";
import { Label } from "../../ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../../ui/dialog";
import { ShieldCheck, User, CheckCircle, X } from "lucide-react";
import { cn } from "../../../lib/utils";

interface ExpenseApproveModalProps {
  open: boolean;
  activeExpense: ExpenseRecord | null;
  employees: Employee[];
  onClose: () => void;
  onConfirm: (status: 'approved' | 'rejected', note: string, approverName: string) => void;
}

export function ExpenseApproveModal({
  open,
  activeExpense,
  employees,
  onClose,
  onConfirm
}: ExpenseApproveModalProps) {
  const [approveStatus, setApproveStatus] = useState<'approved' | 'rejected'>('approved');
  const [approvalNote, setApprovalNote] = useState("");

  useEffect(() => {
    if (open) {
      setApproveStatus('approved');
      setApprovalNote("");
    }
  }, [open, activeExpense]);

  if (!activeExpense) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const targetName = (activeExpense.targetApproverName && activeExpense.targetApproverId !== -1)
      ? activeExpense.targetApproverName
      : (employees[0]?.name || "财务主管 · Admin");

    onConfirm(approveStatus, approvalNote, targetName);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="max-w-lg p-0 flex flex-col sm:rounded-2xl overflow-hidden [&>button]:text-white [&>button]:hover:text-white [&>button]:top-4 [&>button]:right-5">
        <DialogHeader className="bg-brand-600 text-white px-6 py-4 flex flex-row items-center justify-between space-y-0">
          <DialogTitle className="font-bold text-sm tracking-wide text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-brand-200" />
            <span>审批报销单</span>
          </DialogTitle>
          <DialogDescription className="sr-only">审核该报销单据并提交审批结果</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-6 space-y-4.5 text-xs">
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">待审批单据</span>
              <h5 className="text-sm font-bold text-slate-800 line-clamp-1">{activeExpense.name}</h5>
              <p className="text-[11px] text-slate-500 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>申请人：{activeExpense.payerName}</span>
              </p>
            </div>
            <div className="text-right">
              <span className="font-mono text-base font-black text-brand-600 bg-brand-50 border border-brand-100 px-3 py-1 rounded-lg">
                {formatExpenseAmount(activeExpense.amount, activeExpense.currency)}
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="block text-slate-500 font-bold text-[11px]">审批结果 <span className="text-rose-500">*</span></Label>
            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setApproveStatus('approved')}
                className={cn(
                  "h-10 p-2.5 flex items-center justify-center gap-1.5 cursor-pointer transition",
                  approveStatus === 'approved' 
                    ? "border-emerald-500 bg-emerald-50/10 ring-2 ring-emerald-500/10 font-bold text-emerald-800 hover:bg-emerald-50/20 hover:text-emerald-900" 
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                )}
              >
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span>同意</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => setApproveStatus('rejected')}
                className={cn(
                  "h-10 p-2.5 flex items-center justify-center gap-1.5 cursor-pointer transition",
                  approveStatus === 'rejected' 
                    ? "border-rose-500 bg-rose-50/10 ring-2 ring-rose-500/10 font-bold text-rose-800 hover:bg-rose-50/20 hover:text-rose-900" 
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                )}
              >
                <X className="w-4 h-4 text-rose-600" />
                <span>驳回</span>
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="block text-slate-500 font-bold text-[11px]">审批意见</Label>
            <textarea
              rows={2}
              value={approvalNote}
              onChange={(e) => setApprovalNote(e.target.value)}
              placeholder={approveStatus === 'approved' ? "请输入审批意见（选填，默认：同意）" : "请输入驳回原因（必填）"}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition text-xs"
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500 bg-slate-50 px-3.5 py-2.5 rounded-lg border border-slate-200">
            <span className="flex items-center gap-1.5 font-medium text-slate-600">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <span>当前审批人：</span>
              {activeExpense.targetApproverName && activeExpense.targetApproverId !== -1 ? (
                <span className="text-slate-850 font-bold">{activeExpense.targetApproverName}</span>
              ) : (
                <span className="text-slate-850 font-bold">默认系统管理员</span>
              )}
            </span>
            <span className="text-[10px] text-slate-400 font-semibold uppercase">
              已绑定
            </span>
          </div>

          <DialogFooter className="flex flex-row justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="px-4 py-1.5 border border-slate-200 text-slate-600 hover:text-slate-800 rounded-lg font-bold text-xs"
            >
              取消
            </Button>
            <Button
              type="submit"
              size="sm"
              className={cn(
                "px-5 py-1.5 text-white font-black rounded-lg transition active:scale-95 text-xs shadow-3xs",
                approveStatus === 'approved' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
              )}
            >
              提交审批
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
