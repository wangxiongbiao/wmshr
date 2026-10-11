import { Customer } from "../../../types";
import { ReconciledItem, CustomerSummaryItem } from "../types";
import { getOrderNoFromRecord } from "./reconciliation";
import { getCustomerCurrency, getCurrencyInfo } from "../constants";

/**
 * 格式化最终应付文案：同币种合并，异币种清晰分列
 */
export function formatFeeWithCurrency(
  jntFee: number,
  surcharge: number,
  curSymbol: string
): string {
  if (curSymbol === "฿") {
    return `฿${(jntFee + surcharge).toFixed(2)}`;
  }
  if (surcharge === 0) {
    return `฿${jntFee.toFixed(2)}`;
  }
  if (jntFee === 0) {
    return `${curSymbol}${surcharge.toFixed(2)}`;
  }
  return `฿${jntFee.toFixed(2)} + ${curSymbol}${surcharge.toFixed(2)}`;
}

/**
 * 导出全量对账明细 CSV
 */
export function exportFullCsv(
  reconciledData: ReconciledItem[],
  customers?: Customer[],
  addToast?: (msg: string, kind?: "success" | "error" | "info") => void,
  targetCurrency: string = "THB"
): void {
  if (!reconciledData || reconciledData.length === 0) {
    addToast?.("暂无核算数据可导出", "error");
    return;
  }

  const curInfo = getCurrencyInfo(targetCurrency);
  const curSymbol = curInfo.symbol;

  let csvContent = "\uFEFF"; // UTF-8 BOM
  csvContent += `快递单号,客户名称,收件人,收件人电话,重量(kg),JNT快递运费(${curSymbol}),客户额外操作费(${curSymbol}),客户最终应付(${curSymbol}),核对状态\n`;

  reconciledData.forEach((r) => {
    const statusText =
      r.status === "matched" ? "匹配成功" : r.status === "system_only" ? "系统单JNT未对账" : "JNT有账系统无单";
    const surchargeText = r.surcharge > 0 ? `${curSymbol}${r.surcharge.toFixed(2)}` : "0.00";
    const totalFeeText = `${curSymbol}${r.totalFee.toFixed(2)}`;

    csvContent += `"${r.waybillNo}","${r.customerName}","${r.recipientName}","${r.recipientPhone}",${
      r.weight > 0 ? r.weight.toFixed(2) : "-"
    },${r.jntFee.toFixed(2)},"${surchargeText}","${totalFeeText}","${statusText}"\n`;
  });

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `快递运费核对明细_${new Date().toISOString().split("T")[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  addToast?.("运费核算明细表格已成功导出到本地！", "success");
}

/**
 * 导出仅异常/差异运单清单 CSV（差异核对 Tab 专用）
 */
export function exportDiscrepancyCsv(
  discrepancyRecords: ReconciledItem[],
  customers?: Customer[],
  addToast?: (msg: string, kind?: "success" | "error" | "info") => void,
  targetCurrency: string = "THB"
): void {
  if (!discrepancyRecords || discrepancyRecords.length === 0) {
    addToast?.("当前无任何对账异常数据", "info");
    return;
  }

  const curInfo = getCurrencyInfo(targetCurrency);
  const curSymbol = curInfo.symbol;

  let csvContent = "\uFEFF"; // UTF-8 BOM
  csvContent += `差异类型,快递单号,客户名称,收件人,电话,重量(kg),JNT快递运费(${curSymbol}),操作费(${curSymbol}),核查建议\n`;

  discrepancyRecords.forEach((r) => {
    const diffType = r.status === "system_only" ? "系统有单/JNT无账" : "JNT扣费/系统无单";
    const advice =
      r.status === "system_only"
        ? "包裹可能尚未揽收或跨月结算，建议核实物理包裹轨迹"
        : "外部扣款，系统未见匹配出库单，建议核实是否为线下补扣或错绑客户代码";

    const surchargeText = r.surcharge > 0 ? `${curSymbol}${r.surcharge.toFixed(2)}` : "0.00";

    csvContent += `"${diffType}","${r.waybillNo}","${r.customerName}","${r.recipientName}","${
      r.recipientPhone || "-"
    }",${r.weight > 0 ? r.weight.toFixed(2) : "-"},${r.jntFee.toFixed(2)},"${surchargeText}","${advice}"\n`;
  });

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `快递对账异常清单_${new Date().toISOString().split("T")[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  addToast?.(`已成功导出 ${discrepancyRecords.length} 笔财务差异清单！`, "success");
}

/**
 * 导出单个客户专属结算对账清单 CSV
 */
export function exportCustomerBillCsv(params: {
  customerName: string;
  customerSummary: CustomerSummaryItem[];
  customers: Customer[];
  addToast?: (msg: string, kind?: "success" | "error" | "info") => void;
  targetCurrency?: string;
}): void {
  const { customerName, customerSummary, customers, addToast, targetCurrency = "THB" } = params;
  const custSum = customerSummary.find((c) => c.customerName === customerName);
  if (!custSum) {
    addToast?.("找不到该客户的对账单数据", "error");
    return;
  }

  let csvContent = "\uFEFF"; // UTF-8 BOM

  const curInfo = getCurrencyInfo(targetCurrency);
  const curSymbol = curInfo.symbol;
  const isFlat = custSum.surchargeType === "flat";
  const ruleText = isFlat
    ? `固定 ${curSymbol}${custSum.surchargeAmount.toFixed(2)} / 月`
    : `按件 ${curSymbol}${custSum.surchargeAmount.toFixed(2)} / 件`;

  csvContent += `客户对账结算清单,${customerName}\n`;
  csvContent += `导出时间,${new Date().toLocaleString()}\n`;
  csvContent += `结算货币,${curInfo.countryName} (${curInfo.code} - ${curSymbol})\n`;
  csvContent += `发货总件数,${custSum.totalItems} 件\n`;
  csvContent += `已核对件数,${custSum.matchedItems} 件\n`;
  csvContent += `基础快递运费,${curSymbol}${custSum.totalJntFee.toFixed(2)}\n`;
  csvContent += `额外操作费,${curSymbol}${custSum.totalSurcharge.toFixed(2)} (${ruleText})\n`;
  csvContent += `最终应付总额,${curSymbol}${custSum.finalTotalPayable.toFixed(2)}\n\n`;

  csvContent += `序号,运单号,对应系统订单号,收件人,电话,重量(kg),JNT快递运费(${curSymbol}),操作费(${curSymbol}),单项小计(${curSymbol}),对账状态\n`;

  custSum.records.forEach((r, idx) => {
    const orderNo = getOrderNoFromRecord(r);
    const statusText =
      r.status === "matched" ? "对账成功" : r.status === "system_only" ? "系统有/邮局无" : "邮局有/系统无";
    
    const surchargeText = isFlat
      ? `月度打包费 (${ruleText})`
      : r.surcharge > 0
      ? `${curSymbol}${r.surcharge.toFixed(2)}`
      : "0.00";

    const lineTotalText = `${curSymbol}${r.totalFee.toFixed(2)}`;

    csvContent += `${idx + 1},"${r.waybillNo}","${orderNo}","${r.recipientName}","${r.recipientPhone}",${
      r.weight > 0 ? r.weight.toFixed(2) : "-"
    },${r.jntFee.toFixed(2)},"${surchargeText}","${lineTotalText}","${statusText}"\n`;
  });

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${customerName}_快递对账结算清单_${new Date().toISOString().split("T")[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  addToast?.(`客户【${customerName}】的对账结算明细表格已成功导出！`, "success");
}
