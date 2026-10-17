import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../../ui/dialog";
import { Button } from "../../ui/button";
import { AlertTriangle } from "lucide-react";
import { CustomerOrder } from "../../../types";

interface VoidConfirmDialogProps {
  isOpen: boolean;
  order: CustomerOrder | null;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function VoidConfirmDialog({
  isOpen,
  order,
  busy,
  onClose,
  onConfirm,
}: VoidConfirmDialogProps) {
  if (!order) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 text-rose-600 mb-1">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <DialogTitle className="text-base text-slate-900">
              确认作废订单
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-slate-500">
            作废后被预占的仓库实物库存将直接释放并退回给商户，请谨慎确认。
          </DialogDescription>
        </DialogHeader>

        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2 text-xs">
          <div className="flex justify-between items-center">
            <span className="text-slate-500">订单流水号:</span>
            <span className="font-mono font-bold text-slate-800">{order.id}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500">平台单号:</span>
            <span className="font-mono text-slate-700">{order.orderNo}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500">所属商户:</span>
            <span className="font-medium text-slate-800">{order.customerName}</span>
          </div>
          {order.inventoryLocked ? (
            order.items.map((item) => (
              <div key={`${item.platformItemId}:${item.platformModelId}`} className="flex justify-between items-center pt-1 border-t border-slate-200">
                <span className="font-mono font-semibold text-brand-600">{item.sku}</span>
                <span className="font-bold text-emerald-600 font-mono">+{item.deductQty} 件</span>
              </div>
            ))
          ) : (
            <div className="pt-1 border-t border-slate-200 text-slate-500">该订单尚未锁定库存，作废不涉及库存回补。</div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" size="sm" onClick={onClose} disabled={busy}>
            取消
          </Button>
          <Button variant="destructive" size="sm" onClick={onConfirm} disabled={busy}>
            确认手动作废
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
