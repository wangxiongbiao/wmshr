import React from "react";
import {
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Clock,
  Ban,
  Download
} from "lucide-react";
import { Button } from "../../ui/button";
import { Badge } from "../../ui/badge";
import { ReconciledItem } from "../types";
import { getOrderNoFromRecord } from "../utils/reconciliation";

interface ExpressDiscrepancyTabProps {
  records: ReconciledItem[];
  systemAltKey: string;
  jntAltKey: string;
  onExportCsv: () => void;
}

export function ExpressDiscrepancyTab(props: ExpressDiscrepancyTabProps) {
  const { records, systemAltKey, jntAltKey, onExportCsv } = props;

  const systemOnlyList = records.filter((r) => r.status === "system_only");
  const jntOnlyList = records.filter((r) => r.status === "jnt_only");
  const totalAnomalies = systemOnlyList.length + jntOnlyList.length;

  if (totalAnomalies === 0) {
    return (
      <div className="p-12 text-center bg-white rounded-xl border border-slate-200/80 shadow-2xs">
        <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
        <h4 className="text-base font-bold text-slate-800">未发现任何对账差异！</h4>
        <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
          系统发货单与 J&T 官方账单所有运单均已 100% 成功核对，金额与单号完全吻合。
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Alert Header */}
      <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <h4 className="text-xs font-bold text-amber-900">
              共检出 {totalAnomalies} 笔财务账单与系统出库不一致异常
            </h4>
            <p className="text-[11px] text-amber-700/90 mt-0.5">
              建议核实以下未入账运单或不明扣款，核实完毕后可在表格导出清单进行财务沟通。
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onExportCsv}
          className="h-7 text-xs font-medium bg-white border-amber-300 text-amber-900 hover:bg-amber-100/50 gap-1 shrink-0 cursor-pointer"
        >
          <Download className="w-3 h-3 text-amber-700" />
          <span>导出异常清单</span>
        </Button>
      </div>

      {/* Discrepancy Dual Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Section 1: System has record, JNT missing */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden flex flex-col">
          <div className="p-3.5 bg-blue-50/50 border-b border-slate-200/80 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <div>
                <h4 className="text-xs font-bold text-slate-900">
                  系统已发货，J&T官方漏记（{systemOnlyList.length} 单）
                </h4>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  已从仓库发货，但官方结算表未收录，可能仍在运输中或官方延迟出账
                </p>
              </div>
            </div>
            <Badge
              variant="secondary"
              className="bg-blue-100 text-blue-800 text-[10px] font-mono"
            >
              {systemOnlyList.length} 单
            </Badge>
          </div>

          <div className="p-0 flex-1 overflow-x-auto max-h-[420px]">
            {systemOnlyList.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                暂无系统单遗漏问题
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/70 text-slate-600 border-b border-slate-100 font-bold sticky top-0">
                    <th className="py-2.5 px-3 w-10 text-center">#</th>
                    <th className="py-2.5 px-3">运单号</th>
                    <th className="py-2.5 px-3">客户名称</th>
                    <th className="py-2.5 px-3">收件人</th>
                    <th className="py-2.5 px-3">对应订单号</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {systemOnlyList.map((item, idx) => (
                    <tr key={item.waybillNo + idx} className="hover:bg-slate-50/60">
                      <td className="py-2 px-3 text-center text-slate-400 text-[11px]">
                        {idx + 1}
                      </td>
                      <td className="py-2 px-3 font-bold text-slate-900 select-all">
                        {item.waybillNo}
                      </td>
                      <td className="py-2 px-3 font-semibold text-slate-700 font-sans">
                        {item.customerName}
                      </td>
                      <td className="py-2 px-3 text-slate-600 font-sans">
                        {item.recipientName}
                      </td>
                      <td className="py-2 px-3 text-slate-500 font-sans">
                        {getOrderNoFromRecord(item, systemAltKey, jntAltKey)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Section 2: JNT billed, System missing */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden flex flex-col">
          <div className="p-3.5 bg-rose-50/50 border-b border-slate-200/80 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Ban className="w-4 h-4 text-rose-600" />
              <div>
                <h4 className="text-xs font-bold text-slate-900">
                  J&T已产生运费，系统无此单（{jntOnlyList.length} 单）
                </h4>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  账单有扣款但在系统查无发货，需防范线下漏报单或误扣费
                </p>
              </div>
            </div>
            <Badge
              variant="destructive"
              className="bg-rose-100 text-rose-800 text-[10px] font-mono"
            >
              {jntOnlyList.length} 单
            </Badge>
          </div>

          <div className="p-0 flex-1 overflow-x-auto max-h-[420px]">
            {jntOnlyList.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                暂无官方账单多扣异常
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/70 text-slate-600 border-b border-slate-100 font-bold sticky top-0">
                    <th className="py-2.5 px-3 w-10 text-center">#</th>
                    <th className="py-2.5 px-3">运单编号</th>
                    <th className="py-2.5 px-3 text-right">结算运费</th>
                    <th className="py-2.5 px-3">所属网点</th>
                    <th className="py-2.5 px-3">录入时间</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {jntOnlyList.map((item, idx) => (
                    <tr key={item.waybillNo + idx} className="hover:bg-slate-50/60">
                      <td className="py-2 px-3 text-center text-slate-400 text-[11px]">
                        {idx + 1}
                      </td>
                      <td className="py-2 px-3 font-bold text-slate-900 select-all">
                        {item.waybillNo}
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-rose-600">
                        ฿{item.jntFee.toFixed(2)}
                      </td>
                      <td className="py-2 px-3 text-slate-600 font-sans">
                        {item.branchName || "-"}
                      </td>
                      <td className="py-2 px-3 text-slate-500 text-[11px]">
                        {item.entryTime || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
