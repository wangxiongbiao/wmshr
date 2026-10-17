import { CustomerOrder } from "../../../types";
import { STATUS_LABELS } from "../constants";

const HEADERS = [
  "订单流水", "平台单号", "平台", "店铺", "所属客户", "平台SKU", "本仓SKU", "商品名称", "规格", "数量", "单价",
  "订单总额", "币种", "收件人", "电话", "地址", "状态", "承运商", "快递单号", "异常/作废原因", "下单时间",
];

const cell = (value: string | number | undefined) => `"${String(value ?? "").replace(/"/g, '""')}"`;

/** 每个订单商品一行，订单级字段在各行重复，便于按商品汇总 */
export function exportOrdersCsv(orders: CustomerOrder[]): void {
  const rows = orders.flatMap((o) =>
    o.items.map((item) =>
      [
        o.id, o.orderNo, o.platform, o.shopName, o.customerName, item.platformSku, item.sku, item.itemName, item.modelName,
        item.qty, item.unitPrice, o.totalAmount, o.currency, o.receiverName, o.receiverPhone, o.receiverAddress,
        STATUS_LABELS[o.status], o.carrier, o.trackingNo, o.reason, o.createdAt,
      ].map(cell).join(",")
    )
  );
  const csv = "\uFEFF" + [HEADERS.map(cell).join(","), ...rows].join("\n");

  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `订单明细_${new Date().toISOString().split("T")[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
