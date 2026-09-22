import { Customer } from "../../../types";
import {
  ShipmentRecord,
  JntRecord,
  ReconciledItem,
  CustomerSurcharge,
  CustomerSummaryItem,
  ReconciliationStats,
  MatchKeyOption
} from "../types";
import { sanitizeWaybillNo } from "./parsers";
import { getCustomerCurrency } from "../constants";

export function getOrderNoFromRecord(
  item: ReconciledItem,
  systemAltKey?: string,
  jntAltKey?: string
): string {
  if (item.orderNo) {
    return item.orderNo;
  }

  if (item.sysRawValues) {
    if (systemAltKey && item.sysRawValues[systemAltKey]) {
      return item.sysRawValues[systemAltKey];
    }
    const keys = Object.keys(item.sysRawValues);
    const orderKey = keys.find(
      (k) =>
        k.includes("平台订单号") ||
        k.includes("订单号") ||
        k.includes("ERP包裹号") ||
        k.includes("包裹号") ||
        k.toLowerCase().includes("order") ||
        k.toLowerCase().includes("ref")
    );
    if (orderKey) return item.sysRawValues[orderKey];
  }

  if (item.jntRawValues) {
    if (jntAltKey && item.jntRawValues[jntAltKey]) {
      return item.jntRawValues[jntAltKey];
    }
    const keys = Object.keys(item.jntRawValues);
    const orderKey = keys.find(
      (k) =>
        k.includes("订单来源") ||
        k.includes("商家编码") ||
        k.includes("客户编码") ||
        k.toLowerCase().includes("order") ||
        k.toLowerCase().includes("ref")
    );
    if (orderKey) return item.jntRawValues[orderKey];
  }

  return "-";
}

export function reconcileExpressRecords(params: {
  systemRecords: ShipmentRecord[];
  jntRecords: JntRecord[];
  surcharges: Record<string, CustomerSurcharge>;
  matchKeyOption: MatchKeyOption;
  systemAltKey: string;
  jntAltKey: string;
}): ReconciledItem[] {
  const { systemRecords, jntRecords, surcharges, matchKeyOption, systemAltKey, jntAltKey } = params;
  const items: ReconciledItem[] = [];

  const matchedJntWaybills = new Set<string>();
  const matchedSysWaybills = new Set<string>();

  // Pass 1: Try matching strictly by waybill number
  const jntByWaybillMap = new Map<string, JntRecord>();
  jntRecords.forEach((r) => {
    const sanitized = sanitizeWaybillNo(r.waybillNo);
    if (sanitized) {
      jntByWaybillMap.set(sanitized, r);
    }
  });

  const systemRecordsMatchedByWaybill: { sys: ShipmentRecord; jnt: JntRecord }[] = [];
  const unmatchedSystemRecords: ShipmentRecord[] = [];

  systemRecords.forEach((sys) => {
    const sanitizedWaybill = sanitizeWaybillNo(sys.waybillNo);
    const jnt = jntByWaybillMap.get(sanitizedWaybill);
    if (jnt) {
      systemRecordsMatchedByWaybill.push({ sys, jnt });
      matchedJntWaybills.add(sanitizeWaybillNo(jnt.waybillNo));
      matchedSysWaybills.add(sanitizedWaybill);
    } else {
      unmatchedSystemRecords.push(sys);
    }
  });

  // Pass 2: Try matching remaining unmatched records via alternative unique field if enabled
  const finalMatchedPairs: { sys: ShipmentRecord; jnt: JntRecord; matchMethod: "waybill" | "alt_key" }[] = [];

  systemRecordsMatchedByWaybill.forEach((pair) => {
    finalMatchedPairs.push({ sys: pair.sys, jnt: pair.jnt, matchMethod: "waybill" });
  });

  const finalUnmatchedSystemRecords: ShipmentRecord[] = [];

  if (matchKeyOption === "waybill_and_alt" && systemAltKey && jntAltKey) {
    const remainingJntByAltMap = new Map<string, JntRecord>();
    jntRecords.forEach((jnt) => {
      if (!matchedJntWaybills.has(sanitizeWaybillNo(jnt.waybillNo))) {
        const altValue = jnt.rawValues?.[jntAltKey]?.trim() || "";
        if (altValue) {
          remainingJntByAltMap.set(altValue.toLowerCase(), jnt);
        }
      }
    });

    unmatchedSystemRecords.forEach((sys) => {
      const altValue = sys.rawValues?.[systemAltKey]?.trim() || "";
      const matchedJnt = altValue ? remainingJntByAltMap.get(altValue.toLowerCase()) : undefined;

      if (matchedJnt) {
        finalMatchedPairs.push({ sys, jnt: matchedJnt, matchMethod: "alt_key" });
        matchedJntWaybills.add(sanitizeWaybillNo(matchedJnt.waybillNo));
        matchedSysWaybills.add(sanitizeWaybillNo(sys.waybillNo));
      } else {
        finalUnmatchedSystemRecords.push(sys);
      }
    });
  } else {
    unmatchedSystemRecords.forEach((sys) => {
      finalUnmatchedSystemRecords.push(sys);
    });
  }

  // 1. Process all matched pairs
  finalMatchedPairs.forEach(({ sys, jnt, matchMethod }) => {
    const surchargeConfig = surcharges[sys.customerName];
    let surcharge = 0;

    if (surchargeConfig && surchargeConfig.type === "piece") {
      surcharge = surchargeConfig.amount;
    }

    items.push({
      waybillNo: sys.waybillNo,
      customerName: sys.customerName,
      customerCode: sys.customerCode || jnt.customerCode,
      recipientName: sys.recipientName,
      recipientPhone: sys.recipientPhone || "",
      jntFee: jnt.jntFee,
      weight: jnt.weight || sys.weight || 0,
      systemWeight: sys.weight,
      orderNo: sys.orderNo,
      surcharge,
      totalFee: jnt.jntFee + surcharge,
      status: "matched",
      entryTime: jnt.entryTime,
      signTime: jnt.signTime,
      branchName: jnt.branchName,
      mgmtType: jnt.mgmtType,
      bizMode: jnt.bizMode,
      payCycle: jnt.payCycle,
      productType: jnt.productType,
      shippingMethod: jnt.shippingMethod,
      itemType: jnt.itemType,
      baseFee: jnt.baseFee,
      remoteFee: jnt.remoteFee,
      insuranceFee: jnt.insuranceFee,
      packageFee: jnt.packageFee,
      matchMethod,
      sysRawValues: sys.rawValues,
      jntRawValues: jnt.rawValues
    });
  });

  // 2. Process all final unmatched system records (system_only)
  finalUnmatchedSystemRecords.forEach((sys) => {
    const surchargeConfig = surcharges[sys.customerName];
    let surcharge = 0;

    if (surchargeConfig && surchargeConfig.type === "piece") {
      surcharge = surchargeConfig.amount;
    }

    items.push({
      waybillNo: sys.waybillNo,
      customerName: sys.customerName,
      customerCode: sys.customerCode,
      recipientName: sys.recipientName,
      recipientPhone: sys.recipientPhone || "",
      jntFee: 0,
      weight: sys.weight || 0,
      systemWeight: sys.weight,
      orderNo: sys.orderNo,
      surcharge,
      totalFee: surcharge,
      status: "system_only",
      sysRawValues: sys.rawValues
    });
  });

  // 3. Process remaining JNT records which are missing in the system (jnt_only)
  jntRecords.forEach((jnt) => {
    if (!matchedJntWaybills.has(sanitizeWaybillNo(jnt.waybillNo))) {
      items.push({
        waybillNo: jnt.waybillNo,
        customerName: jnt.customerName || "未关联发货商 (系统无单)",
        recipientName: "-",
        recipientPhone: "",
        jntFee: jnt.jntFee,
        weight: jnt.weight || 0,
        surcharge: 0,
        totalFee: jnt.jntFee,
        status: "jnt_only",
        entryTime: jnt.entryTime,
        signTime: jnt.signTime,
        branchName: jnt.branchName,
        mgmtType: jnt.mgmtType,
        bizMode: jnt.bizMode,
        customerCode: jnt.customerCode,
        payCycle: jnt.payCycle,
        productType: jnt.productType,
        shippingMethod: jnt.shippingMethod,
        itemType: jnt.itemType,
        baseFee: jnt.baseFee,
        remoteFee: jnt.remoteFee,
        insuranceFee: jnt.insuranceFee,
        packageFee: jnt.packageFee,
        jntRawValues: jnt.rawValues
      });
    }
  });

  return items;
}

export function computeCustomerSummary(
  reconciledData: ReconciledItem[],
  surcharges: Record<string, CustomerSurcharge>,
  customers?: Customer[]
): CustomerSummaryItem[] {
  const summaryMap = new Map<
    string,
    {
      customerName: string;
      totalItems: number;
      matchedItems: number;
      systemOnlyItems: number;
      totalWeight: number;
      totalJntFee: number;
      records: ReconciledItem[];
    }
  >();

  reconciledData.forEach((item) => {
    const name = item.customerName;
    if (!summaryMap.has(name)) {
      summaryMap.set(name, {
        customerName: name,
        totalItems: 0,
        matchedItems: 0,
        systemOnlyItems: 0,
        totalWeight: 0,
        totalJntFee: 0,
        records: []
      });
    }

    const sum = summaryMap.get(name)!;
    sum.records.push(item);
    sum.totalItems += 1;
    sum.totalWeight += item.weight || 0;

    if (item.status === "matched") {
      sum.matchedItems += 1;
      sum.totalJntFee += item.jntFee;
    } else if (item.status === "system_only") {
      sum.systemOnlyItems += 1;
    } else if (item.status === "jnt_only") {
      sum.totalJntFee += item.jntFee;
    }
  });

  const result: CustomerSummaryItem[] = [];

  summaryMap.forEach((sum, name) => {
    const surchargeConfig = surcharges[name];
    let finalSurcharge = 0;
    const surchargeType: "piece" | "flat" = surchargeConfig?.type || "piece";
    const surchargeAmount = surchargeConfig?.amount || 0;

    if (surchargeConfig) {
      if (surchargeConfig.type === "piece") {
        finalSurcharge = sum.totalItems * surchargeConfig.amount;
      } else {
        finalSurcharge = surchargeConfig.amount;
      }
    }

    // Overwrite each item's surcharge in the subrecords for consistency
    sum.records.forEach((rec) => {
      if (surchargeConfig) {
        if (surchargeConfig.type === "piece") {
          rec.surcharge = surchargeConfig.amount;
          rec.totalFee = rec.jntFee + rec.surcharge;
        } else {
          rec.surcharge = 0;
          rec.totalFee = rec.jntFee;
        }
      }
    });

    result.push({
      customerName: name,
      totalItems: sum.totalItems,
      matchedItems: sum.matchedItems,
      systemOnlyItems: sum.systemOnlyItems,
      totalWeight: sum.totalWeight,
      totalJntFee: sum.totalJntFee,
      surchargeAmount,
      surchargeType,
      totalSurcharge: finalSurcharge,
      finalTotalPayable: sum.totalJntFee + finalSurcharge,
      records: sum.records
    });
  });

  return result;
}

export function computeReconciliationStats(params: {
  systemCount: number;
  jntCount: number;
  reconciledData: ReconciledItem[];
  customerSummary: CustomerSummaryItem[];
}): ReconciliationStats {
  const { systemCount, jntCount, reconciledData, customerSummary } = params;
  let totalExpressFee = 0;
  let matchedCount = 0;
  let systemOnlyCount = 0;
  let jntOnlyCount = 0;

  reconciledData.forEach((item) => {
    if (item.status === "matched") matchedCount++;
    else if (item.status === "system_only") systemOnlyCount++;
    else if (item.status === "jnt_only") jntOnlyCount++;
    totalExpressFee += item.jntFee;
  });

  let totalPayable = 0;
  customerSummary.forEach((c) => {
    totalPayable += c.finalTotalPayable;
  });

  return {
    totalShipments: systemCount,
    totalJntBills: jntCount,
    matchedCount,
    systemOnlyCount,
    jntOnlyCount,
    totalExpressFee,
    totalPayable
  };
}
