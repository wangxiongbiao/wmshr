import { CustomerOrder } from "../../../types";
import { apiRequest } from "../../../lib/apiRequest";
import {
  BatchResult,
  OrderAction,
  OrderListResult,
  OrderLog,
  OrderQuery,
  PairingResult,
  PendingPairItem,
  SyncResult,
} from "../types";

type OrderResponse = { order: CustomerOrder };

const runAction = async (orderId: string, action: OrderAction, body: Record<string, string> = {}) =>
  (await apiRequest<OrderResponse>(`/orders/${orderId}/actions/${action}`, { method: "POST", body })).order;

export function listOrders(query: OrderQuery): Promise<OrderListResult> {
  const params = new URLSearchParams(Object.entries(query).map(([key, value]) => [key, String(value)]));
  return apiRequest<OrderListResult>(`/orders?${params}`);
}

export const getOrderLogs = async (orderId: string): Promise<OrderLog[]> =>
  (await apiRequest<{ logs: OrderLog[] }>(`/orders/${orderId}/logs`)).logs;

export const syncShopOrders = (shopRecordId: string) =>
  apiRequest<SyncResult>(`/shops/${shopRecordId}/sync`, { method: "POST" });

export const printLabel = (orderId: string, input: { carrier: string; trackingNo: string }) => runAction(orderId, "print", input);
export const shipOrder = (orderId: string) => runAction(orderId, "ship");
export const markAnomaly = (orderId: string, reason: string) => runAction(orderId, "markAnomaly", { reason });
export const resolveAnomaly = (orderId: string) => runAction(orderId, "resolveAnomaly");
export const voidOrder = (orderId: string) => runAction(orderId, "void");

export const shipByCode = async (code: string) =>
  (await apiRequest<OrderResponse>("/orders/ship-by-code", { method: "POST", body: { code } })).order;

export const batchApply = (action: "print" | "ship" | "void", orderIds: string[]) =>
  apiRequest<BatchResult>("/orders/batch", { method: "POST", body: { action, orderIds } });

export const listPendingPairs = async () =>
  (await apiRequest<{ items: PendingPairItem[] }>("/pairings/pending")).items;

export const createPairing = (item: PendingPairItem, productRecordId: string, qty: number) =>
  apiRequest<PairingResult>("/pairings", {
    method: "POST",
    body: {
      shopRecordId: item.shopRecordId,
      platformItemId: item.platformItemId,
      platformModelId: item.platformModelId,
      itemName: item.itemName,
      modelName: item.modelName,
      productRecordId,
      qty,
    },
  });
