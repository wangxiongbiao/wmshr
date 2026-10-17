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

interface BatchVoidDialogProps {
  isOpen: boolean;
  orders: CustomerOrder[];
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function BatchVoidDialog({ isOpen, orders, busy, onClose, onConfirm }: BatchVoidDialogProps) {
  const totalQty = orders
    .filter((o) => o.inventoryLocked)
    .reduce((sum, o) => sum + o.items.reduce((acc, item) => acc + (item.deductQty ?? 0), 0), 0);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !busy && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 text-rose-600 mb-1">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <DialogTitle className="text-base text-slate-900">确认批量作废订单</DialogTitle>
          </div>
          <DialogDescription className="text-xs text-slate-500">
            作废后被预占的仓库实物库存将直接释放并退回给商户，请谨慎确认。
          </DialogDescription>
        </DialogHeader>

        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2 text-xs">
          <div className="flex justify-between items-center">
            <span className="text-slate-500">作废订单数:</span>
            <span className="font-bold text-slate-800">{orders.length} 单</span>
          </div>
          <div className="flex justify-between items-center pt-1 border-t border-slate-200">
            <span className="text-slate-500">退回库存总数量:</span>
            <span className="font-bold text-emerald-600 font-mono">+{totalQty} 件</span>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" size="sm" onClick={onClose} disabled={busy}>
            取消
          </Button>
          <Button variant="destructive" size="sm" onClick={onConfirm} disabled={busy}>
            确认批量作废
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
