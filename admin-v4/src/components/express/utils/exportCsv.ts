import { Customer } from "../../../types";
import { ReconciledItem, CustomerSummaryItem } from "../types";
import { getOrderNoFromRecord } from "./reconciliation";
import { getCustomerCurrency } from "../constants";

export function exportFullCsv(
  reconciledData: ReconciledItem[],
  addToast?: (msg: string, kind?: "success" | "error" | "info") => void
): void {
  if (!reconciledData || reconciledData.length === 0) {
    addToast?.("暂无核算数据可导出", "error");
    return;
  }

  let csvContent = "\uFEFF"; // UTF-8 BOM
  csvContent += "快递单号,客户名称,收件人,收件人电话,JNT结算快递费(฿),客户额外操作费(฿),客户最终应付(฿),核对状态\n";

  reconciledData.forEach((r) => {
    const statusText =
      r.status === "matched" ? "匹配成功" : r.status === "system_only" ? "系统单JNT未对账" : "JNT有账系统无单";
    csvContent += `"${r.waybillNo}","${r.customerName}","${r.recipientName}","${r.recipientPhone}",${r.jntFee.toFixed(
      2
    )},${r.surcharge.toFixed(2)},${r.totalFee.toFixed(2)},"${statusText}"\n`;
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

export function exportCustomerBillCsv(params: {
  customerName: string;
  customerSummary: CustomerSummaryItem[];
  customers: Customer[];
  addToast?: (msg: string, kind?: "success" | "error" | "info") => void;
}): void {
  const { customerName, customerSummary, customers, addToast } = params;
  const custSum = customerSummary.find((c) => c.customerName === customerName);
  if (!custSum) {
    addToast?.("找不到该客户的对账单数据", "error");
    return;
  }

  let csvContent = "\uFEFF"; // UTF-8 BOM

  const curInfo = getCustomerCurrency(customerName, customers);
  const curSymbol = curInfo.symbol;
  const ruleText =
    custSum.surchargeType === "piece"
      ? `按件 ${curSymbol}${custSum.surchargeAmount.toFixed(2)} / 件`
      : `固定 ${curSymbol}${custSum.surchargeAmount.toFixed(2)} / 月`;

  csvContent += `客户对账结算清单,${customerName}\n`;
  csvContent += `导出时间,${new Date().toLocaleString()}\n`;
  csvContent += `发货总件数,${custSum.totalItems} 件\n`;
  csvContent += `已核对件数,${custSum.matchedItems} 件\n`;
  csvContent += `基础快递运费,฿${custSum.totalJntFee.toFixed(2)}\n`;
  csvContent += `额外操作费,${curSymbol}${custSum.totalSurcharge.toFixed(2)} (${ruleText})\n`;

  const finalPayableText =
    curSymbol === "฿"
      ? `฿${custSum.finalTotalPayable.toFixed(2)}`
      : `฿${custSum.totalJntFee.toFixed(2)} + ¥${custSum.totalSurcharge.toFixed(2)}`;
  csvContent += `最终应付总额,${finalPayableText}\n\n`;

  csvContent += "序号,运单号,对应系统订单号,收件人,电话,重量(kg),JNT快递运费(฿),操作费,最终应付,对账状态\n";

  custSum.records.forEach((r, idx) => {
    const orderNo = getOrderNoFromRecord(r);
    const statusText = r.status === "matched" ? "对账成功" : r.status === "system_only" ? "系统有/邮局无" : "邮局有/系统无";
    const totalFeeText =
      curSymbol === "฿" ? `฿${r.totalFee.toFixed(2)}` : `฿${r.jntFee.toFixed(2)} + ¥${r.surcharge.toFixed(2)}`;

    const surchargeText = r.surcharge > 0 ? `${curSymbol}${r.surcharge.toFixed(2)}` : "0.00";

    csvContent += `${idx + 1},"${r.waybillNo}","${orderNo}","${r.recipientName}","${r.recipientPhone}",${
      r.weight > 0 ? r.weight.toFixed(2) : "-"
    },${r.jntFee.toFixed(2)},"${surchargeText}","${totalFeeText}","${statusText}"\n`;
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
