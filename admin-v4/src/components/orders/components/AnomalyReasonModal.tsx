import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../../ui/dialog";
import { Button } from "../../ui/button";
import { AlertTriangle, ShieldAlert } from "lucide-react";
import { CustomerOrder } from "../../../types";

interface AnomalyReasonModalProps {
  isOpen: boolean;
  order: CustomerOrder | null;
  busy: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}

export function AnomalyReasonModal({
  isOpen,
  order,
  busy,
  onClose,
  onConfirm,
}: AnomalyReasonModalProps) {
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (isOpen) {
      setReason("货架缺件找不到了，需要通知买家补款或理货重新核准库位");
    }
  }, [isOpen]);

  if (!order) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;
    onConfirm(reason.trim());
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2 text-rose-600 mb-1">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <DialogTitle className="text-base text-slate-900">
              标记拣货异常单 (货架缺货报错/损纸)
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-slate-500">
            当拣散货架发现货物丢失、商品破损漏液导致无法核销出单时，在此填写问题原因。
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="p-3 bg-amber-50 border border-amber-200/80 rounded-xl text-amber-800 leading-relaxed">
            <div className="font-bold flex items-center gap-1.5 mb-1 text-amber-900">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>拣货员标记说明</span>
            </div>
            填写问题原因后将立即将订单移入异常队列，并通知相关责任人进行复核或重新排位。
          </div>

          <div className="space-y-1">
            <label className="block font-bold text-slate-500 uppercase tracking-wider text-[11px]">
              原本配货订单 ID (流水)
            </label>
            <div className="px-3.5 py-2 bg-slate-100 font-mono text-slate-700 border border-slate-200 rounded-lg text-xs">
              {order.id} (SKU: {order.items.map((item) => item.sku ?? item.platformSku).join(", ")})
            </div>
          </div>

          <div className="space-y-1">
            <label className="block font-bold text-slate-500 uppercase tracking-wider text-[11px]">
              实测异常反馈原因描述 <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="如：货架 A-02-05 标记有 5 件，但实际纸盒只剩 1 件，且有挤压破损漏液情况！缺少可用数量配货。"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none text-xs focus:ring-1 focus:ring-blue-500 text-slate-800 font-medium h-24 resize-none"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={busy}>
              取消
            </Button>
            <Button
              type="submit"
              variant="destructive"
              size="sm"
              disabled={busy || !reason.trim()}
            >
              确认登记为异常单
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
