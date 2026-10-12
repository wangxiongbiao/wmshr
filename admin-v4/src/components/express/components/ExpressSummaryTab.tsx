import React from "react";
import {
  ChevronDown,
  Download,
  Info,
  Search,
  X,
  CheckCircle,
  AlertTriangle,
  FileSpreadsheet,
  Pencil,
  ArrowRightLeft
} from "lucide-react";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Badge } from "../../ui/badge";
import { Customer } from "../../../types";
import { CustomerSummaryItem, ReconciledItem } from "../types";
import { getCustomerCurrency, getCurrencyInfo, STATUS_CONFIG } from "../constants";
import { getOrderNoFromRecord } from "../utils/reconciliation";

interface ExpressSummaryTabProps {
  customerSummary: CustomerSummaryItem[];
  customers: Customer[];
  expandedCustomers: Record<string, boolean>;
  toggleCustomerExpand: (name: string) => void;
  customerDetailsSearch: Record<string, string>;
  setCustomerDetailsSearch: React.Dispatch<
    React.SetStateAction<Record<string, string>>
  >;
  systemAltKey: string;
  jntAltKey: string;
  onExportCustomerBill: (customerName: string) => void;
  onOpenCustomerCurrencyModal?: (customerName: string) => void;
}

export function ExpressSummaryTab(props: ExpressSummaryTabProps) {
  const {
    customerSummary,
    customers,
    expandedCustomers,
    toggleCustomerExpand,
    customerDetailsSearch,
    setCustomerDetailsSearch,
    systemAltKey,
    jntAltKey,
    onExportCustomerBill,
    onOpenCustomerCurrencyModal
  } = props;

  if (customerSummary.length === 0) {
    return (
      <div className="p-12 text-center bg-white rounded-xl border border-slate-200/80 shadow-2xs">
        <FileSpreadsheet className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h4 className="text-sm font-bold text-slate-700">暂无对账数据</h4>
        <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
          请在上方导入系统发货数据和 J&T 官方对账表格，系统将自动核算发货运费与操作费。
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Logic explanation banner */}
      <div className="bg-amber-50/70 border border-amber-200/60 p-3 rounded-xl flex gap-2.5 text-xs text-amber-800 leading-normal">
        <Info className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
        <div>
          <span className="font-bold">对账单自动计算逻辑：</span>
          系统根据每一位客户的运单数量结合操作费规则，累加 J&T
          实际快递账单，默认统一按当前仓库国家的货币结算。点击操作栏的「编辑货币」可单独设置该客户的结算货币，「导出结算单」可生成该客户独立的对账 Excel/CSV 表。
        </div>
      </div>

      {/* Customer Summary Table Card */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/75 text-slate-600 border-b border-slate-200/80 font-bold whitespace-nowrap">
                <th className="py-3 px-3 w-10 text-center"></th>
                <th className="py-3 px-4 font-bold">发货客户名称</th>
                <th className="py-3 px-3 text-center">发货单量</th>
                <th className="py-3 px-3 text-center">核对情况</th>
                <th className="py-3 px-4 text-right">基础运费</th>
                <th className="py-3 px-4 text-right">操作费合计</th>
                <th className="py-3 px-4 text-right font-black">客户最终应付</th>
                <th className="py-3 px-4 text-center w-40">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {customerSummary.map((sum) => {
                const isExpanded = !!expandedCustomers[sum.customerName];
                const curSymbol = sum.currencySymbol || "฿";
                const curCode = sum.currency || "THB";

                const matchPct =
                  sum.totalItems > 0
                    ? Math.round((sum.matchedItems / sum.totalItems) * 100)
                    : 0;

                const query = (
                  customerDetailsSearch[sum.customerName] || ""
                )
                  .trim()
                  .toLowerCase();

                const filteredSubRecords = sum.records.filter((r) => {
                  if (!query) return true;
                  const orderNo = getOrderNoFromRecord(
                    r,
                    systemAltKey,
                    jntAltKey
                  ).toLowerCase();
                  return (
                    r.waybillNo.toLowerCase().includes(query) ||
                    r.recipientName.toLowerCase().includes(query) ||
                    r.recipientPhone.toLowerCase().includes(query) ||
                    orderNo.includes(query)
                  );
                });

                return (
                  <React.Fragment key={sum.customerName}>
                    <tr
                      className={`hover:bg-slate-50/70 transition-colors ${
                        isExpanded ? "bg-slate-50/40" : ""
                      }`}
                    >
                      <td className="py-3.5 px-3 text-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleCustomerExpand(sum.customerName)}
                          className="h-6 w-6 p-0 rounded-md hover:bg-slate-200/60 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                          title={isExpanded ? "收起明细" : "展开明细"}
                        >
                          <ChevronDown
                            className={`w-4 h-4 transition-transform duration-200 ${
                              isExpanded ? "" : "-rotate-90"
                            }`}
                          />
                        </Button>
                      </td>

                      <td
                        className="py-3.5 px-4 font-bold text-slate-900 cursor-pointer select-none"
                        onClick={() => toggleCustomerExpand(sum.customerName)}
                      >
                        <div className="flex items-center gap-1.5">
                          <span>{sum.customerName}</span>
                          {sum.systemOnlyItems > 0 && (
                            <Badge
                              variant="destructive"
                              className="h-4 px-1 text-[10px] bg-amber-50 text-amber-700 border-amber-200"
                            >
                              {sum.systemOnlyItems} 单未对账
                            </Badge>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-3 text-center font-mono font-bold text-slate-700">
                        {sum.totalItems} 单
                      </td>

                      <td className="py-3.5 px-3 text-center">
                        <div className="inline-flex items-center gap-1.5">
                          <div className="w-16 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-emerald-500 h-full rounded-full transition-all"
                              style={{ width: `${matchPct}%` }}
                            />
                          </div>
                          <span className="text-[11px] font-mono font-semibold text-slate-600">
                            {sum.matchedItems}/{sum.totalItems} ({matchPct}%)
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono text-slate-800 font-semibold">
                        {curSymbol}{sum.totalJntFee.toFixed(2)}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="font-mono text-slate-800 font-semibold">
                          {curSymbol}
                          {sum.totalSurcharge.toFixed(2)}
                        </div>
                        <div className="text-[10px] text-slate-400 font-medium">
                          {sum.surchargeType === "piece"
                            ? `按件 ${curSymbol}${sum.surchargeAmount.toFixed(2)}/件`
                            : `固定 ${curSymbol}${sum.surchargeAmount.toFixed(2)}/月`}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="font-mono font-bold text-brand-700 text-sm">
                          {curSymbol}{sum.finalTotalPayable.toFixed(2)}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {curCode}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {onOpenCustomerCurrencyModal && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => onOpenCustomerCurrencyModal(sum.customerName)}
                              className="h-7 px-2 text-[11px] font-medium text-slate-700 hover:text-brand-700 bg-white border-slate-200 gap-1 cursor-pointer"
                              title="编辑该客户结算货币"
                            >
                              <Pencil className="w-3 h-3 text-brand-600" />
                              <span>编辑</span>
                            </Button>
                          )}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => onExportCustomerBill(sum.customerName)}
                            className="h-7 px-2 text-[11px] font-medium text-slate-700 hover:text-brand-700 bg-white border-slate-200 gap-1 cursor-pointer"
                            title="导出该客户对账结算明细 CSV"
                          >
                            <Download className="w-3 h-3 text-emerald-600" />
                            <span>导出结算单</span>
                          </Button>
                        </div>
                      </td>
                    </tr>

                    {/* Subrecords Accordion Drawer */}
                    {isExpanded && (
                      <tr className="bg-slate-50/60">
                        <td colSpan={8} className="p-3 sm:p-4">
                          <div className="bg-white rounded-lg border border-slate-200/80 p-3 shadow-2xs space-y-3">
                            {/* Filter within expanded customer */}
                            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2">
                              <div className="text-xs font-bold text-slate-700 flex items-center gap-2">
                                <span>【{sum.customerName}】发货运单明细</span>
                                <span className="text-slate-400 font-normal">
                                  (共 {sum.records.length} 条，已筛选出{" "}
                                  {filteredSubRecords.length} 条)
                                </span>
                              </div>

                              <div className="relative w-full sm:w-56">
                                <Input
                                  type="text"
                                  placeholder="搜索单号、订单号、收件人..."
                                  value={customerDetailsSearch[sum.customerName] || ""}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setCustomerDetailsSearch((prev) => ({
                                      ...prev,
                                      [sum.customerName]: val
                                    }));
                                  }}
                                  className="h-7 text-xs pl-7 pr-7 bg-slate-50 border-slate-200"
                                />
                                <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                {customerDetailsSearch[sum.customerName] && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() =>
                                      setCustomerDetailsSearch((prev) => ({
                                        ...prev,
                                        [sum.customerName]: ""
                                      }))
                                    }
                                    className="absolute right-1 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 p-0 cursor-pointer"
                                    title="清空搜索"
                                  >
                                    <X className="w-3 h-3" />
                                  </Button>
                                )}
                              </div>
                            </div>

                            {/* Subtable */}
                            <div className="overflow-x-auto max-h-64 rounded-md border border-slate-100">
                              <table className="w-full text-left text-[11px] border-collapse">
                                <thead>
                                  <tr className="bg-slate-50 text-slate-500 border-b border-slate-100 font-semibold sticky top-0">
                                    <th className="py-2 px-2.5 w-10 text-center">#</th>
                                    <th className="py-2 px-3">运单号</th>
                                    <th className="py-2 px-3">对应系统订单号</th>
                                    <th className="py-2 px-3">收件人</th>
                                    <th className="py-2 px-3">电话</th>
                                    <th className="py-2 px-2 text-right">重量(kg)</th>
                                    <th className="py-2 px-3 text-right">J&T运费({curSymbol})</th>
                                    <th className="py-2 px-3 text-right">操作费({curSymbol})</th>
                                    <th className="py-2 px-3 text-right">应付小计({curSymbol})</th>
                                    <th className="py-2 px-3 text-center">对账状态</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-mono">
                                  {filteredSubRecords.map((r, subIdx) => {
                                    const orderNo = getOrderNoFromRecord(
                                      r,
                                      systemAltKey,
                                      jntAltKey
                                    );
                                    const statusCfg = STATUS_CONFIG[r.status];

                                    return (
                                      <tr
                                        key={r.waybillNo + subIdx}
                                        className="hover:bg-slate-50/50"
                                      >
                                        <td className="py-1.5 px-2.5 text-center text-slate-400">
                                          {subIdx + 1}
                                        </td>
                                        <td className="py-1.5 px-3 font-semibold text-slate-900 select-all">
                                          {r.waybillNo}
                                        </td>
                                        <td className="py-1.5 px-3 text-slate-600 font-sans">
                                          {orderNo}
                                        </td>
                                        <td className="py-1.5 px-3 text-slate-700 font-sans">
                                          {r.recipientName}
                                        </td>
                                        <td className="py-1.5 px-3 text-slate-500">
                                          {r.recipientPhone || "-"}
                                        </td>
                                        <td className="py-1.5 px-2 text-right text-slate-600">
                                          {r.weight > 0 ? r.weight.toFixed(2) : "-"}
                                        </td>
                                        <td className="py-1.5 px-3 text-right font-semibold text-slate-800">
                                          {curSymbol}{r.jntFee.toFixed(2)}
                                        </td>
                                        <td className="py-1.5 px-3 text-right text-slate-600">
                                          {r.surcharge > 0
                                            ? `${curSymbol}${r.surcharge.toFixed(2)}`
                                            : "0.00"}
                                        </td>
                                        <td className="py-1.5 px-3 text-right font-bold text-slate-900">
                                          {curSymbol}{r.totalFee.toFixed(2)}
                                        </td>
                                        <td className="py-1.5 px-3 text-center">
                                          <span
                                            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-sans font-medium border ${statusCfg.badgeClass}`}
                                          >
                                            {statusCfg.label}
                                          </span>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
