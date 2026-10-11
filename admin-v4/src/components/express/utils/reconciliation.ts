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
import { getCustomerCurrency, convertCurrency, getCurrencyInfo } from "../constants";

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

export function findCustomerSurcharge(
  name: string | undefined | null,
  surcharges: Record<string, CustomerSurcharge>
): CustomerSurcharge | undefined {
  if (!name) return undefined;
  const direct = surcharges[name];
  if (direct) return direct;
  const trimmed = name.trim().toLowerCase();
  const foundKey = Object.keys(surcharges).find(
    (k) => k.trim().toLowerCase() === trimmed
  );
  return foundKey ? surcharges[foundKey] : undefined;
}

export function reconcileExpressRecords(params: {
  systemRecords: ShipmentRecord[];
  jntRecords: JntRecord[];
  surcharges: Record<string, CustomerSurcharge>;
  matchKeyOption: MatchKeyOption;
  systemAltKey: string;
  jntAltKey: string;
  customers?: Customer[];
  targetCurrency?: string;
}): ReconciledItem[] {
  const {
    systemRecords,
    jntRecords,
    surcharges,
    matchKeyOption,
    systemAltKey,
    jntAltKey,
    customers,
    targetCurrency = "THB"
  } = params;
  const items: ReconciledItem[] = [];

  const matchedJntIndices = new Set<number>();
  const matchedSysIndices = new Set<number>();

  // Pass 1: 构建 JNT 运单号索引池（支持同一个单号有多条扣费记录的情况）
  const jntWaybillIndexMap = new Map<string, number[]>();
  jntRecords.forEach((r, idx) => {
    const sanitized = sanitizeWaybillNo(r.waybillNo);
    if (sanitized) {
      const list = jntWaybillIndexMap.get(sanitized) || [];
      list.push(idx);
      jntWaybillIndexMap.set(sanitized, list);
    }
  });

  // 用于汇总一个或多个 JNT 记录的费用
  const mergeJntRecords = (indices: number[]): JntRecord => {
    const primary = jntRecords[indices[0]];
    if (indices.length === 1) return primary;

    let totalJntFee = 0;
    let baseFee = 0;
    let remoteFee = 0;
    let insuranceFee = 0;
    let packageFee = 0;
    let maxWeight = 0;

    indices.forEach((i) => {
      const rec = jntRecords[i];
      totalJntFee += rec.jntFee || 0;
      baseFee += rec.baseFee || 0;
      remoteFee += rec.remoteFee || 0;
      insuranceFee += rec.insuranceFee || 0;
      packageFee += rec.packageFee || 0;
      if (rec.weight > maxWeight) maxWeight = rec.weight;
    });

    return {
      ...primary,
      jntFee: totalJntFee,
      baseFee,
      remoteFee,
      insuranceFee,
      packageFee,
      weight: maxWeight
    };
  };

  const finalMatchedPairs: { sys: ShipmentRecord; jnt: JntRecord; matchMethod: "waybill" | "alt_key" }[] = [];
  const unmatchedSystemIndices: number[] = [];

  systemRecords.forEach((sys, sysIdx) => {
    const sanitizedWaybill = sanitizeWaybillNo(sys.waybillNo);
    const jntIndices = jntWaybillIndexMap.get(sanitizedWaybill);
    if (jntIndices && jntIndices.length > 0) {
      // 聚合该单号名下所有的 JNT 账单扣费，确保费用绝不漏算
      const mergedJnt = mergeJntRecords(jntIndices);
      finalMatchedPairs.push({ sys, jnt: mergedJnt, matchMethod: "waybill" });
      jntIndices.forEach((i) => matchedJntIndices.add(i));
      matchedSysIndices.add(sysIdx);
    } else {
      unmatchedSystemIndices.push(sysIdx);
    }
  });

  // Pass 2: 备用字段匹配（对系统未匹配的记录通过订单号等二次对齐）
  const finalUnmatchedSystemRecords: ShipmentRecord[] = [];

  if (matchKeyOption === "waybill_and_alt" && systemAltKey && jntAltKey) {
    const remainingJntByAltMap = new Map<string, number>();
    jntRecords.forEach((jnt, idx) => {
      if (!matchedJntIndices.has(idx)) {
        const altValue = jnt.rawValues?.[jntAltKey]?.trim() || "";
        if (altValue) {
          remainingJntByAltMap.set(altValue.toLowerCase(), idx);
        }
      }
    });

    unmatchedSystemIndices.forEach((sysIdx) => {
      const sys = systemRecords[sysIdx];
      const altValue = sys.rawValues?.[systemAltKey]?.trim() || "";
      const matchedJntIdx = altValue ? remainingJntByAltMap.get(altValue.toLowerCase()) : undefined;

      if (matchedJntIdx !== undefined) {
        finalMatchedPairs.push({ sys, jnt: jntRecords[matchedJntIdx], matchMethod: "alt_key" });
        matchedJntIndices.add(matchedJntIdx);
        matchedSysIndices.add(sysIdx);
      } else {
        finalUnmatchedSystemRecords.push(sys);
      }
    });
  } else {
    unmatchedSystemIndices.forEach((sysIdx) => {
      finalUnmatchedSystemRecords.push(systemRecords[sysIdx]);
    });
  }

  // 1. Process all matched pairs
  finalMatchedPairs.forEach(({ sys, jnt, matchMethod }) => {
    const surchargeConfig = findCustomerSurcharge(sys.customerName, surcharges);
    let surcharge = 0;

    if (surchargeConfig && surchargeConfig.type === "piece") {
      surcharge = surchargeConfig.amount;
    }

    const custCur = getCustomerCurrency(sys.customerName, customers).code;
    const convertedJntFee = convertCurrency(jnt.jntFee, "THB", targetCurrency);
    const convertedSurcharge = convertCurrency(surcharge, custCur, targetCurrency);
    const convertedTotalFee = convertedJntFee + convertedSurcharge;

    items.push({
      waybillNo: sys.waybillNo,
      customerName: sys.customerName,
      customerCode: sys.customerCode || jnt.customerCode,
      recipientName: sys.recipientName,
      recipientPhone: sys.recipientPhone || "",
      jntFee: convertedJntFee,
      rawJntFee: jnt.jntFee,
      weight: jnt.weight || sys.weight || 0,
      systemWeight: sys.weight,
      orderNo: sys.orderNo,
      surcharge: convertedSurcharge,
      rawSurcharge: surcharge,
      totalFee: convertedTotalFee,
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
      baseFee: jnt.baseFee !== undefined ? convertCurrency(jnt.baseFee, "THB", targetCurrency) : undefined,
      remoteFee: jnt.remoteFee !== undefined ? convertCurrency(jnt.remoteFee, "THB", targetCurrency) : undefined,
      insuranceFee: jnt.insuranceFee !== undefined ? convertCurrency(jnt.insuranceFee, "THB", targetCurrency) : undefined,
      packageFee: jnt.packageFee !== undefined ? convertCurrency(jnt.packageFee, "THB", targetCurrency) : undefined,
      matchMethod,
      sysRawValues: sys.rawValues,
      jntRawValues: jnt.rawValues
    });
  });

  // 2. Process all final unmatched system records (system_only)
  finalUnmatchedSystemRecords.forEach((sys) => {
    const surchargeConfig = findCustomerSurcharge(sys.customerName, surcharges);
    let surcharge = 0;

    if (surchargeConfig && surchargeConfig.type === "piece") {
      surcharge = surchargeConfig.amount;
    }

    const custCur = getCustomerCurrency(sys.customerName, customers).code;
    const convertedSurcharge = convertCurrency(surcharge, custCur, targetCurrency);

    items.push({
      waybillNo: sys.waybillNo,
      customerName: sys.customerName,
      customerCode: sys.customerCode,
      recipientName: sys.recipientName,
      recipientPhone: sys.recipientPhone || "",
      jntFee: 0,
      rawJntFee: 0,
      weight: sys.weight || 0,
      systemWeight: sys.weight,
      orderNo: sys.orderNo,
      surcharge: convertedSurcharge,
      rawSurcharge: surcharge,
      totalFee: convertedSurcharge,
      status: "system_only",
      sysRawValues: sys.rawValues
    });
  });

  // 3. Process remaining JNT records which are missing in the system (jnt_only)
  jntRecords.forEach((jnt, idx) => {
    if (!matchedJntIndices.has(idx)) {
      const convertedJntFee = convertCurrency(jnt.jntFee, "THB", targetCurrency);

      items.push({
        waybillNo: jnt.waybillNo,
        customerName: jnt.customerName || "未关联发货商 (系统无单)",
        recipientName: "-",
        recipientPhone: "",
        jntFee: convertedJntFee,
        rawJntFee: jnt.jntFee,
        weight: jnt.weight || 0,
        surcharge: 0,
        rawSurcharge: 0,
        totalFee: convertedJntFee,
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
        baseFee: jnt.baseFee !== undefined ? convertCurrency(jnt.baseFee, "THB", targetCurrency) : undefined,
        remoteFee: jnt.remoteFee !== undefined ? convertCurrency(jnt.remoteFee, "THB", targetCurrency) : undefined,
        insuranceFee: jnt.insuranceFee !== undefined ? convertCurrency(jnt.insuranceFee, "THB", targetCurrency) : undefined,
        packageFee: jnt.packageFee !== undefined ? convertCurrency(jnt.packageFee, "THB", targetCurrency) : undefined,
        jntRawValues: jnt.rawValues
      });
    }
  });

  return items;
}

export function computeCustomerSummary(
  reconciledData: ReconciledItem[],
  surcharges: Record<string, CustomerSurcharge>,
  customers?: Customer[],
  customerCurrencies?: Record<string, string>,
  defaultWarehouseCurrency: string = "THB"
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
    const surchargeConfig = findCustomerSurcharge(name, surcharges);
    let finalSurcharge = 0;
    const surchargeType: "piece" | "flat" = surchargeConfig?.type || "piece";
    const surchargeAmount = surchargeConfig?.amount || 0;

    const effectiveCur = (customerCurrencies && name && customerCurrencies[name])
      ? customerCurrencies[name]
      : (defaultWarehouseCurrency || "THB");
    const curInfo = getCurrencyInfo(effectiveCur);

    const custCur = getCustomerCurrency(name, customers).code;
    const convertedAmount = convertCurrency(surchargeAmount, custCur, effectiveCur);

    if (surchargeConfig) {
      if (surchargeConfig.type === "piece") {
        finalSurcharge = sum.totalItems * convertedAmount;
      } else {
        finalSurcharge = convertedAmount;
      }
    }

    // Overwrite each item's surcharge in the subrecords for consistency
    sum.records.forEach((rec) => {
      if (surchargeConfig) {
        if (surchargeConfig.type === "piece") {
          rec.surcharge = convertedAmount;
          rec.totalFee = Math.round((rec.jntFee + rec.surcharge) * 100) / 100;
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
      surchargeAmount: convertedAmount,
      surchargeType,
      totalSurcharge: finalSurcharge,
      finalTotalPayable: Math.round((sum.totalJntFee + finalSurcharge) * 100) / 100,
      records: sum.records,
      currency: effectiveCur,
      currencySymbol: curInfo.symbol
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

/**
 * 单项对账记录货币动态折算函数：无论原数据来自实时对账还是历史快照，均从原始基准币按汇率准确折算为目标货币
 */
export function transformReconciledItemCurrency(
  item: ReconciledItem,
  customers: Customer[] | undefined,
  targetCurrency: string = "THB"
): ReconciledItem {
  // 原币运费：以 rawJntFee 为准，若无则以 jntFee 为原币
  const rawJnt = item.rawJntFee !== undefined ? item.rawJntFee : item.jntFee;
  // 客户操作费原币代码
  const custCur = getCustomerCurrency(item.customerName, customers).code;
  const rawSur = item.rawSurcharge !== undefined ? item.rawSurcharge : item.surcharge;

  const convertedJntFee = convertCurrency(rawJnt, "THB", targetCurrency);
  const convertedSurcharge = convertCurrency(rawSur, custCur, targetCurrency);
  const convertedTotalFee = Math.round((convertedJntFee + convertedSurcharge) * 100) / 100;

  return {
    ...item,
    rawJntFee: rawJnt,
    rawSurcharge: rawSur,
    jntFee: convertedJntFee,
    surcharge: convertedSurcharge,
    totalFee: convertedTotalFee,
    baseFee: item.baseFee !== undefined ? convertCurrency(item.baseFee, "THB", targetCurrency) : undefined,
    remoteFee: item.remoteFee !== undefined ? convertCurrency(item.remoteFee, "THB", targetCurrency) : undefined,
    insuranceFee: item.insuranceFee !== undefined ? convertCurrency(item.insuranceFee, "THB", targetCurrency) : undefined,
    packageFee: item.packageFee !== undefined ? convertCurrency(item.packageFee, "THB", targetCurrency) : undefined
  };
}

/**
 * 批量对账数据货币折算 (按客户各自配置的目标货币分别折算，未配置则默认当前仓库国家货币)
 */
export function transformReconciledItems(
  items: ReconciledItem[],
  customers: Customer[] | undefined,
  customerCurrencies?: Record<string, string>,
  defaultWarehouseCurrency: string = "THB"
): ReconciledItem[] {
  if (!items || items.length === 0) return [];
  return items.map((it) => {
    const effectiveCur = (customerCurrencies && it.customerName && customerCurrencies[it.customerName])
      ? customerCurrencies[it.customerName]
      : (defaultWarehouseCurrency || "THB");
    return transformReconciledItemCurrency(it, customers, effectiveCur);
  });
}
