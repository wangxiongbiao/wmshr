/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { AlertCircle, Loader2, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../ui/dialog";
import { Button } from "../ui/button";

interface LeaveDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  empName: string;
  loading: boolean;
  onConfirm: () => void;
}

export const LeaveDeleteDialog: React.FC<LeaveDeleteDialogProps> = ({
  open,
  onOpenChange,
  empName,
  loading,
  onConfirm,
}) => {
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
          <DialogTitle className="flex items-center gap-2 text-base font-bold text-rose-600">
            <Trash2 className="w-4 h-4 text-rose-600" />
            删除请假记录确认
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500 pt-2 leading-relaxed">
            确定要删除【<strong className="text-slate-700">{empName}</strong>】这条请假记录吗？
            若该记录已审批通过，对应日期的考勤记录也将同步撤销并重算。此操作不可逆。
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="pt-3 gap-2 sm:justify-end">
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
            type="button"
            variant="destructive"
            size="sm"
            disabled={loading}
            onClick={onConfirm}
            className="gap-1.5 font-bold bg-rose-600 hover:bg-rose-700 text-white"
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            确认删除
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
