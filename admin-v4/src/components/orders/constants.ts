import { OrderTabStatus } from "./types";
import { Clock, Printer, Truck, AlertTriangle, Trash2, Link2 } from "lucide-react";

export const ORDER_PAGE_SIZE = 15;

export const ORDER_TABS: Array<{
  id: OrderTabStatus;
  label: string;
  icon: typeof Clock;
  countColor: string;
}> = [
  { id: "pending_pair", label: "待配对 (SKU 未匹配)", icon: Link2, countColor: "bg-violet-100 text-violet-700 font-extrabold" },
  { id: "pending_print", label: "待打单 (等候标签)", icon: Clock, countColor: "bg-amber-100 text-amber-700 font-extrabold" },
  { id: "printed", label: "已打单 (等待快递扫描)", icon: Printer, countColor: "bg-blue-100 text-blue-700 font-extrabold" },
  { id: "shipped", label: "已发货 (完成物理揽派)", icon: Truck, countColor: "bg-emerald-100 text-emerald-700 font-extrabold" },
  { id: "anomaly", label: "异常单 (缺货/拣货报错)", icon: AlertTriangle, countColor: "bg-rose-100 text-rose-700 font-extrabold" },
  { id: "canceled", label: "已作废 (注销解压)", icon: Trash2, countColor: "bg-slate-100 text-slate-500 font-extrabold" }
];

export const ACTION_LABELS = {
  pull: "同步入库",
  lock: "锁定库存",
  pair: "完成配对",
  print: "打印面单",
  ship: "发货",
  markAnomaly: "登记异常",
  resolveAnomaly: "异常重新处理",
  void: "作废",
} as const;

export const STATUS_LABELS: Record<OrderTabStatus, string> = {
  pending_pair: "待配对",
  pending_print: "待打单",
  printed: "已打单",
  shipped: "已发货",
  anomaly: "异常",
  canceled: "已作废",
};
