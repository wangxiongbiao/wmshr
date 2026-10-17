import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../../ui/dialog";
import { Button } from "../../ui/button";
import { Printer } from "lucide-react";
import { CustomerOrder } from "../../../types";

interface PrintPreviewModalProps {
  isOpen: boolean;
  order: CustomerOrder | null;
  busy: boolean;
  onClose: () => void;
  onConfirmPrint: (input: { carrier: string; trackingNo: string }) => void;
}

const inputClass =
  "w-full px-3 py-2 border border-slate-200 rounded-lg outline-none text-xs focus:ring-1 focus:ring-blue-500 font-medium bg-white text-slate-800";

export function PrintPreviewModal({ isOpen, order, busy, onClose, onConfirmPrint }: PrintPreviewModalProps) {
  const [carrier, setCarrier] = useState("");
  const [trackingNo, setTrackingNo] = useState("");

  useEffect(() => {
    if (!isOpen || !order) return;
    setCarrier(order.carrier ?? "");
    setTrackingNo(order.trackingNo ?? "");
  }, [isOpen, order]);

  if (!order) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !busy && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 text-blue-600 mb-1">
            <Printer className="w-5 h-5 shrink-0" />
            <DialogTitle className="text-base text-slate-900">打印面单并确认出库标签</DialogTitle>
          </div>
          <DialogDescription className="text-xs text-slate-500">
            确认后订单流转至【已打单】，等待快递揽件扫码。承运商默认取平台指定的物流渠道。
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="space-y-1">
            <label className="block font-bold text-slate-600 text-[11px]">物流承运商 *</label>
            <input value={carrier} disabled={busy} onChange={(e) => setCarrier(e.target.value)} className={inputClass} />
          </div>
          <div className="space-y-1">
            <label className="block font-bold text-slate-600 text-[11px]">快递单号（可选，用于扫码发货）</label>
            <input
              value={trackingNo}
              disabled={busy}
              onChange={(e) => setTrackingNo(e.target.value)}
              placeholder="未填写时可用平台单号扫码发货"
              className={`${inputClass} font-mono`}
            />
          </div>
        </div>

        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 text-xs">
          <div className="flex justify-between items-start border-b border-slate-200 pb-3">
            <div>
              <span className="font-extrabold text-base text-slate-900 tracking-wider">{carrier || "未指定承运商"}</span>
              <p className="text-[11px] text-slate-400 mt-0.5">
                渠道来源: {order.platform} 网店【{order.shopName}】
              </p>
            </div>
            <div className="text-right font-mono">
              <span className="text-[10px] text-slate-400 block">平台单号: {order.orderNo}</span>
              <span className="text-xs font-bold text-slate-700">WMS-{order.id}</span>
            </div>
          </div>

          <div className="space-y-1">
            <span className="inline-block px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-white font-bold">收件人</span>
            <p className="font-bold text-slate-900 text-sm">{order.receiverName}</p>
            <p className="font-mono text-slate-700">{order.receiverPhone}</p>
            <p className="text-slate-500 text-[11px] leading-relaxed">{order.receiverAddress}</p>
          </div>

          <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1.5">
            <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              配货明细 (PACKING DETAIL)
            </span>
            {order.items.map((item) => (
              <div key={`${item.platformItemId}:${item.platformModelId}`} className="flex justify-between items-center text-slate-900">
                <div className="min-w-0">
                  <p className="font-mono font-bold text-xs text-blue-600">[SKU] {item.sku}</p>
                  <p className="text-xs text-slate-700 font-medium mt-0.5 line-clamp-1">
                    {item.productName || item.itemName}
                    {item.modelName && <span className="text-slate-400"> · {item.modelName}</span>}
                  </p>
                </div>
                <p className="text-base font-bold font-mono text-blue-600 shrink-0">
                  x{item.deductQty ?? item.qty} <span className="text-xs font-normal">件</span>
                </p>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2">
          <Button variant="outline" size="sm" onClick={onClose} disabled={busy}>
            取消打印
          </Button>
          <Button
            size="sm"
            onClick={() => onConfirmPrint({ carrier: carrier.trim(), trackingNo: trackingNo.trim() })}
            disabled={busy || !carrier.trim()}
            className="gap-1.5"
          >
            <Printer className="w-4 h-4" />
            <span>完成纸质标签出库打印</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
