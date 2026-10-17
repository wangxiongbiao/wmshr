import { CustomerOrder, Customer, Product } from "../../types";

export type OrderTabStatus = CustomerOrder['status'];

export type OrderAction = 'print' | 'ship' | 'markAnomaly' | 'resolveAnomaly' | 'void';

export type PlatformFilter = 'all' | CustomerOrder['platform'];

export interface OrderQuery {
  status: OrderTabStatus;
  keyword: string;
  customerId: string;
  shopId: string;
  platform: PlatformFilter;
  dateFrom: string;
  dateTo: string;
  page: number;
  pageSize: number;
}

export interface OrderListResult {
  items: CustomerOrder[];
  total: number;
  tabCounts: Record<OrderTabStatus, number>;
}

export interface OrderLog {
  id: string;
  orderId: string;
  action: OrderAction | 'pull' | 'lock' | 'pair';
  fromStatus?: CustomerOrder['status'];
  toStatus: CustomerOrder['status'];
  operator: string;
  note?: string;
  createdAt: string;
}

export interface BatchResult {
  succeeded: string[];
  failed: Array<{ orderId: string; reason: string }>;
}

export interface SyncResult {
  fetched: number;
  imported: number;
  pendingPrint: number;
  pendingPair: number;
  outOfStock: number;
  canceled: number;
}

/** 待配对的平台商品规格（按店铺聚合） */
export interface PendingPairItem {
  shopRecordId: string;
  shopName: string;
  platform: CustomerOrder['platform'];
  customerId: string;
  customerName: string;
  platformItemId: string;
  platformModelId: string;
  platformSku: string;
  itemName: string;
  modelName: string;
  imageUrl: string;
  orderCount: number;
  totalQty: number;
}

export interface PairingResult {
  pendingPrint: number;
  outOfStock: number;
  stillPending: number;
}

export interface OrderManagerProps {
  customers: Customer[];
  products: Product[];
  addToast: (msg: string, kind?: 'success' | 'error' | 'info') => void;
  onInventoryChanged: () => void;
}
