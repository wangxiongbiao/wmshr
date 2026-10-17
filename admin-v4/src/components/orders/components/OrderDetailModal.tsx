import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../../ui/dialog";
import { FileText } from "lucide-react";
import { CustomerOrder } from "../../../types";
import { formatCurrency } from "../../../lib/utils";
import { OrderLog } from "../types";
import { ACTION_LABELS, STATUS_LABELS } from "../constants";
import { getOrderLogs } from "../services/orderApi";

interface OrderDetailModalProps {
  order: CustomerOrder | null;
  onClose: () => void;
}

export function OrderDetailModal({ order, onClose }: OrderDetailModalProps) {
  const [logs, setLogs] = useState<OrderLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const orderId = order?.id;
  const orderStatus = order?.status;

  useEffect(() => {
    if (!orderId) return;
    let stale = false;
    setLoading(true);
    setError(null);
    getOrderLogs(orderId)
      .then((result) => {
        if (!stale) setLogs(result);
      })
      .catch((err) => {
        if (!stale) setError(err instanceof Error ? err.message : "操作日志加载失败");
      })
      .finally(() => {
        if (!stale) setLoading(false);
      });
    return () => {
      stale = true;
    };
  }, [orderId, orderStatus]);

  if (!order) return null;

  const fields: Array<[string, string]> = [
    ["平台单号", order.orderNo],
    ["渠道店铺", `${order.platform} · ${order.shopName}`],
    ["所属商户", order.customerName],
    ...order.items.map((item): [string, string] => [
      "商品",
      `${item.sku ?? `未配对（平台SKU ${item.platformSku || "无"}）`} · ${item.itemName}${item.modelName ? ` / ${item.modelName}` : ""} x${item.qty}`,
    ]),
    ["订单总额", formatCurrency(order.totalAmount, order.currency)],
    ["收件人", `${order.receiverName} ${order.receiverPhone}`],
    ["收件地址", order.receiverAddress],
    ["承运商 / 单号", [order.carrier, order.trackingNo].filter(Boolean).join(" / ") || "尚未分配"],
    ["平台状态", order.platformStatus || "-"],
    ["下单时间", order.createdAt],
  ];

  return (
    <Dialog open={!!order} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 text-blue-600 mb-1">
            <FileText className="w-5 h-5 shrink-0" />
            <DialogTitle className="text-base text-slate-900 font-mono">{order.id}</DialogTitle>
          </div>
          <DialogDescription className="text-xs text-slate-500">
            当前状态：{STATUS_LABELS[order.status] ?? order.status}
            {order.reason ? `（${order.reason}）` : ""}
          </DialogDescription>
        </DialogHeader>

        <dl className="grid grid-cols-[88px_1fr] gap-x-3 gap-y-1.5 text-xs">
          {fields.map(([label, value], index) => (
            <React.Fragment key={`${label}-${index}`}>
              <dt className="text-slate-500">{label}</dt>
              <dd className="text-slate-800 font-medium break-all">{value}</dd>
            </React.Fragment>
          ))}
        </dl>

        <div className="space-y-2 pt-2 border-t border-slate-200">
          <h4 className="text-xs font-bold text-slate-700">操作日志</h4>
          {loading ? (
            <p className="text-xs text-slate-400">日志加载中...</p>
          ) : error ? (
            <p className="text-xs text-rose-600">{error}</p>
          ) : logs.length === 0 ? (
            <p className="text-xs text-slate-400">暂无操作记录</p>
          ) : (
            <ol className="space-y-2">
              {logs.map((log) => (
                <li key={log.id} className="text-xs border-l-2 border-blue-200 pl-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-800">
                      {ACTION_LABELS[log.action]}
                      <span className="font-normal text-slate-400">
                        {" "}
                        → {STATUS_LABELS[log.toStatus] ?? log.toStatus}
                      </span>
                    </span>
                    <span className="font-mono text-[10px] text-slate-400">{log.createdAt}</span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    操作人：{log.operator}
                    {log.note ? ` · ${log.note}` : ""}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
