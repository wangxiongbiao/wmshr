import { CustomerOrder } from "../../../types";
import { OrderAction } from "../types";

/** 与后端 order-core.js 的 ACTION_RULES 保持一致；仅用于界面按钮显隐，状态合法性以服务端校验为准 */
const ACTION_FROM: Record<OrderAction, CustomerOrder["status"][]> = {
  print: ["pending_print"],
  ship: ["printed"],
  markAnomaly: ["pending_print", "printed"],
  resolveAnomaly: ["anomaly"],
  void: ["pending_pair", "pending_print", "printed", "anomaly"],
};

export function canApplyAction(status: CustomerOrder["status"], action: OrderAction): boolean {
  return ACTION_FROM[action].includes(status);
}
