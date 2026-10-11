import React, { useState } from "react";
import { ExpenseRecord } from "../types";
import { Button } from "../../ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../../ui/dialog";
import { AlertCircle, Trash2, Loader2 } from "lucide-react";

interface ExpenseDeleteConfirmModalProps {
  open: boolean;
  expenseToDelete: ExpenseRecord | null;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
}

export function ExpenseDeleteConfirmModal({
  open,
  expenseToDelete,
  onClose,
  onConfirm
}: ExpenseDeleteConfirmModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  if (!expenseToDelete) return null;

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      await onConfirm();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen && !isDeleting) onClose(); }}>
      <DialogContent className="max-w-md p-0 flex flex-col sm:rounded-2xl overflow-hidden [&>button]:text-white [&>button]:hover:text-white [&>button]:top-4 [&>button]:right-5">
        <DialogHeader className="bg-brand-600 text-white px-6 py-4 flex flex-row items-center justify-between space-y-0">
          <DialogTitle className="font-bold text-sm tracking-wide text-white flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-brand-100" />
            <span>确认删除报销单</span>
          </DialogTitle>
          <DialogDescription className="sr-only">确认删除选中的报销单记录</DialogDescription>
        </DialogHeader>
        
        <div className="p-6 space-y-4">
          <div className="p-4.5 bg-brand-50/50 rounded-xl border border-brand-100 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-brand-600 shrink-0 mt-0.5" />
            <div className="text-xs text-brand-950 space-y-1">
              <p className="font-bold">此操作不可恢复！</p>
              <ul className="list-disc pl-4 space-y-0.5 mt-1 font-medium">
                <li>系统账目和财务统计中将不再计入此笔款项；</li>
                <li>对应的申报员工在 APP 手机端的报销记录中也将<strong>不再显示</strong>该记录。</li>
              </ul>
            </div>
          </div>
          
          <div className="text-xs text-slate-600 space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="flex justify-between">
              <span className="text-slate-400">报销单号：</span>
              <span className="font-mono font-bold text-slate-800">{expenseToDelete.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">费用名称：</span>
              <span className="font-semibold text-slate-800 text-right max-w-[70%] truncate">{expenseToDelete.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">申报员工：</span>
              <span className="font-semibold text-slate-800">{expenseToDelete.payerName || "系统/员工录入"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">报销金额：</span>
              <span className="font-mono font-extrabold text-brand-600 text-sm">
                {expenseToDelete.currency === "USD" ? "$" : expenseToDelete.currency === "THB" ? "฿" : "¥"}{expenseToDelete.amount}
              </span>
            </div>
          </div>
        </div>
        
        <DialogFooter className="bg-slate-50 border-t border-slate-200 p-4 flex flex-row justify-end gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isDeleting}
            onClick={onClose}
            className="px-4 py-1.5 border-slate-200 text-slate-600 hover:text-slate-800 font-bold text-xs cursor-pointer disabled:opacity-50"
          >
            取消
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={isDeleting}
            onClick={handleConfirm}
            id="btn-confirm-delete-expense" className="px-4.5 py-1.5 font-extrabold text-xs gap-1 shadow-3xs cursor-pointer disabled:opacity-50"
          >
            {isDeleting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Trash2 className="w-3.5 h-3.5" />
            )}
            <span>{isDeleting ? "正在删除..." : "确认删除"}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
