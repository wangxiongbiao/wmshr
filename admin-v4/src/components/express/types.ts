import { Customer } from "../../types";

export interface ExpressManagerProps {
  customers: Customer[];
  addToast: (msg: string, kind?: "success" | "error" | "info") => void;
  lang: string;
}

export interface ShipmentRecord {
  waybillNo: string;
  customerName: string;
  recipientName: string;
  recipientPhone?: string;
  weight?: number;
  orderNo?: string;
  packageNo?: string;
  customerCode?: string;
  sourceText?: string;
  rawValues?: Record<string, string>;
}

export interface JntRecord {
  waybillNo: string;
  jntFee: number;
  weight?: number;
  entryTime?: string;
  signTime?: string;
  branchName?: string;
  mgmtType?: string;
  bizMode?: string;
  customerCode?: string;
  customerName?: string;
  payCycle?: string;
  productType?: string;
  shippingMethod?: string;
  itemType?: string;
  baseFee?: number;
  remoteFee?: number;
  insuranceFee?: number;
  packageFee?: number;
  sourceText?: string;
  rawValues?: Record<string, string>;
}

export interface ReconciledItem {
  waybillNo: string;
  customerName: string;
  recipientName: string;
  recipientPhone: string;
  jntFee: number;
  weight: number;
  surcharge: number;
  totalFee: number;
  status: "matched" | "system_only" | "jnt_only";
  entryTime?: string;
  signTime?: string;
  branchName?: string;
  mgmtType?: string;
  bizMode?: string;
  customerCode?: string;
  payCycle?: string;
  productType?: string;
  shippingMethod?: string;
  itemType?: string;
  baseFee?: number;
  remoteFee?: number;
  insuranceFee?: number;
  packageFee?: number;
  systemWeight?: number;
  orderNo?: string;
  matchMethod?: "waybill" | "alt_key";
  sysRawValues?: Record<string, string>;
  jntRawValues?: Record<string, string>;
}

export interface CustomerSurcharge {
  customerName: string;
  type: "piece" | "flat"; // piece: 按单件收费, flat: 固定打包费
  amount: number;
}

export interface CustomerSummaryItem {
  customerName: string;
  totalItems: number;
  matchedItems: number;
  systemOnlyItems: number;
  totalWeight: number;
  totalJntFee: number;
  surchargeAmount: number;
  surchargeType: "piece" | "flat";
  totalSurcharge: number;
  finalTotalPayable: number;
  records: ReconciledItem[];
}

export interface ReconciliationStats {
  totalShipments: number;
  totalJntBills: number;
  matchedCount: number;
  systemOnlyCount: number;
  jntOnlyCount: number;
  totalExpressFee: number;
  totalPayable: number;
}

export type ExpressSubTab = "summary" | "details" | "discrepancies";
export type ExpressViewMode = "standard" | "jnt";
export type MatchKeyOption = "waybill_only" | "waybill_and_alt";
export type ExpressStatusFilter = "all" | "matched" | "system_only" | "jnt_only";

export type ExpressActiveDrawer = "none" | "import" | "surcharge";
