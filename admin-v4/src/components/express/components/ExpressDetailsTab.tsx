import React from "react";
import { CheckCircle, AlertTriangle, AlertCircle, FileSpreadsheet } from "lucide-react";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import { TableHorizontalScroller } from "../../TableHorizontalScroller";
import { useStickyMirrorHeader } from "../../../lib/useStickyMirrorHeader";
import { ReconciledItem, ExpressViewMode } from "../types";
import { STATUS_CONFIG } from "../constants";

interface ExpressDetailsTabProps {
  records: ReconciledItem[];
  viewMode: ExpressViewMode;
  tableContainerRef: React.RefObject<HTMLDivElement | null>;
  onLoadDemoData: () => void;
}

export function ExpressDetailsTab(props: ExpressDetailsTabProps) {
  const { records, viewMode, tableContainerRef, onLoadDemoData } = props;

  const {
    mirrorHeaderRef,
    realTableRef,
    realTheadRef,
    tableHeadSentinelRef,
    actionBarRef,
    isMirrorHeaderVisible,
    colWidths,
    realTableWidth,
    handleTableScroll,
  } = useStickyMirrorHeader({
    tableContainerRef,
    deps: [records, viewMode],
  });

  if (records.length === 0) {
    return (
      <div className="p-12 text-center bg-white rounded-xl border border-slate-200/80 shadow-2xs">
        <FileSpreadsheet className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h4 className="text-sm font-bold text-slate-700">没有符合筛选条件的明细记录</h4>
        <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
          请尝试调整上方搜索关键词、状态筛选或客户筛选条件。
        </p>
        <div className="mt-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onLoadDemoData}
            className="text-xs gap-1.5 cursor-pointer"
          >
            加载演示对账数据
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-panel rounded-xl shadow-sm border border-slate-200/80 bg-white">
      {/* 顶部粘性操作栏 (Sticky Action Bar) + 悬浮镜像表头 (Sticky Mirror Header - 方案二) */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-xs rounded-t-xl shadow-2xs border-b border-slate-100">
        <div ref={actionBarRef} className="px-4 py-3 flex justify-between items-center">
          <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
            <span>快递比对明细</span>
            <span className="text-xs font-normal text-slate-400">（共 {records.length} 条）</span>
          </h3>
          <div className="flex items-center gap-2">
            <TableHorizontalScroller targetRef={tableContainerRef} alwaysShow={true} />
          </div>
        </div>

        {/* 悬浮镜像表头 */}
        {isMirrorHeaderVisible && (
          <div
            ref={mirrorHeaderRef}
            className="overflow-x-hidden border-t border-slate-200/80 bg-slate-50/95 backdrop-blur-xs shadow-xs transition-opacity duration-150"
          >
            {viewMode === "standard" ? (
              <table
                style={{ width: realTableWidth ? `${realTableWidth}px` : "100%" }}
                className="text-left border-collapse table-fixed text-xs"
              >
                <thead>
                  <tr className="bg-slate-50/95 text-slate-600 border-b border-slate-200/80 font-bold whitespace-nowrap">
                    <th style={{ width: colWidths[0] ? `${colWidths[0]}px` : undefined }} className="py-2.5 px-3 text-center">#</th>
                    <th style={{ width: colWidths[1] ? `${colWidths[1]}px` : undefined }} className="py-2.5 px-3.5 font-bold">运单号</th>
                    <th style={{ width: colWidths[2] ? `${colWidths[2]}px` : undefined }} className="py-2.5 px-3.5 font-bold">发货客户</th>
                    <th style={{ width: colWidths[3] ? `${colWidths[3]}px` : undefined }} className="py-2.5 px-3.5">收件人信息</th>
                    <th style={{ width: colWidths[4] ? `${colWidths[4]}px` : undefined }} className="py-2.5 px-3 text-center">重量</th>
                    <th style={{ width: colWidths[5] ? `${colWidths[5]}px` : undefined }} className="py-2.5 px-3.5 text-right">J&T运费</th>
                    <th style={{ width: colWidths[6] ? `${colWidths[6]}px` : undefined }} className="py-2.5 px-3.5 text-right">操作费加成</th>
                    <th style={{ width: colWidths[7] ? `${colWidths[7]}px` : undefined }} className="py-2.5 px-3.5 text-right font-black">最终应付</th>
                    <th style={{ width: colWidths[8] ? `${colWidths[8]}px` : undefined }} className="py-2.5 px-3.5 text-center">对账状态</th>
                  </tr>
                </thead>
              </table>
            ) : (
              <table
                style={{ width: realTableWidth ? `${realTableWidth}px` : "100%" }}
                className="text-left border-collapse table-fixed text-xs font-sans whitespace-nowrap"
              >
                <thead>
                  <tr className="bg-slate-50/95 text-slate-600 font-bold border-b border-slate-200 text-center">
                    <th style={{ width: colWidths[0] ? `${colWidths[0]}px` : undefined }} className="py-2.5 px-2 border-r border-slate-200">#</th>
                    <th style={{ width: colWidths[1] ? `${colWidths[1]}px` : undefined }} className="py-2.5 px-3 border-r border-slate-200 text-left">运单号</th>
                    <th style={{ width: colWidths[2] ? `${colWidths[2]}px` : undefined }} className="py-2.5 px-3 border-r border-slate-200">录入时间</th>
                    <th style={{ width: colWidths[3] ? `${colWidths[3]}px` : undefined }} className="py-2.5 px-3 border-r border-slate-200">签收时间</th>
                    <th style={{ width: colWidths[4] ? `${colWidths[4]}px` : undefined }} className="py-2.5 px-2.5 border-r border-slate-200">所属网点</th>
                    <th style={{ width: colWidths[5] ? `${colWidths[5]}px` : undefined }} className="py-2.5 px-2 border-r border-slate-200">管理方式</th>
                    <th style={{ width: colWidths[6] ? `${colWidths[6]}px` : undefined }} className="py-2.5 px-2 border-r border-slate-200">经营模式</th>
                    <th style={{ width: colWidths[7] ? `${colWidths[7]}px` : undefined }} className="py-2.5 px-3 border-r border-slate-200">客户编码</th>
                    <th style={{ width: colWidths[8] ? `${colWidths[8]}px` : undefined }} className="py-2.5 px-3 border-r border-slate-200 text-left">客户名称</th>
                    <th style={{ width: colWidths[9] ? `${colWidths[9]}px` : undefined }} className="py-2.5 px-2 border-r border-slate-200">付款周期</th>
                    <th style={{ width: colWidths[10] ? `${colWidths[10]}px` : undefined }} className="py-2.5 px-2 border-r border-slate-200">产品类型</th>
                    <th style={{ width: colWidths[11] ? `${colWidths[11]}px` : undefined }} className="py-2.5 px-2 border-r border-slate-200">寄件方式</th>
                    <th style={{ width: colWidths[12] ? `${colWidths[12]}px` : undefined }} className="py-2.5 px-2 border-r border-slate-200">品名类型</th>
                    <th style={{ width: colWidths[13] ? `${colWidths[13]}px` : undefined }} className="py-2.5 px-2 border-r border-slate-200 text-right">计费重量</th>
                    <th style={{ width: colWidths[14] ? `${colWidths[14]}px` : undefined }} className="py-2.5 px-2.5 border-r border-slate-200 text-right bg-amber-50/30">总运费(฿)</th>
                    <th style={{ width: colWidths[15] ? `${colWidths[15]}px` : undefined }} className="py-2.5 px-2 border-r border-slate-200 text-right">基础运费</th>
                    <th style={{ width: colWidths[16] ? `${colWidths[16]}px` : undefined }} className="py-2.5 px-2 border-r border-slate-200 text-right">偏远费</th>
                    <th style={{ width: colWidths[17] ? `${colWidths[17]}px` : undefined }} className="py-2.5 px-2 border-r border-slate-200 text-right">保价费</th>
                    <th style={{ width: colWidths[18] ? `${colWidths[18]}px` : undefined }} className="py-2.5 px-2 border-r border-slate-200 text-right">包材费</th>
                    <th style={{ width: colWidths[19] ? `${colWidths[19]}px` : undefined }} className="py-2.5 px-2.5 border-r border-slate-200 text-right text-brand-700 bg-brand-50/20">操作费</th>
                    <th style={{ width: colWidths[20] ? `${colWidths[20]}px` : undefined }} className="py-2.5 px-3 border-r border-slate-200 text-right text-brand-900 bg-brand-50/40 font-black">最终应付</th>
                    <th style={{ width: colWidths[21] ? `${colWidths[21]}px` : undefined }} className="py-2.5 px-3 text-center">对账状态</th>
                  </tr>
                </thead>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Sentinel for detecting vertical scroll position */}
      <div ref={tableHeadSentinelRef} className="h-0 w-full" />
      <div ref={tableContainerRef} onScroll={handleTableScroll} className="overflow-x-auto relative rounded-b-xl">
        {viewMode === "standard" ? (
          /* Standard Concise View */
          <table ref={realTableRef} className="w-full text-left text-xs border-collapse">
            <thead ref={realTheadRef}>
              <tr className="bg-slate-50/75 text-slate-600 border-b border-slate-200/80 font-bold whitespace-nowrap">
                <th className="py-2.5 px-3 w-12 text-center">#</th>
                <th className="py-2.5 px-3.5 font-bold">运单号</th>
                <th className="py-2.5 px-3.5 font-bold">发货客户</th>
                <th className="py-2.5 px-3.5">收件人信息</th>
                <th className="py-2.5 px-3 text-center">重量</th>
                <th className="py-2.5 px-3.5 text-right">J&T运费</th>
                <th className="py-2.5 px-3.5 text-right">操作费加成</th>
                <th className="py-2.5 px-3.5 text-right font-black">最终应付</th>
                <th className="py-2.5 px-3.5 text-center">对账状态</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {records.map((rec, idx) => {
                const statusCfg = STATUS_CONFIG[rec.status];

                return (
                  <tr
                    key={`${rec.waybillNo}-${idx}`}
                    className="hover:bg-slate-50/70 transition-colors"
                  >
                    <td className="py-3 px-3 text-center text-slate-400 font-mono text-[11px]">
                      {idx + 1}
                    </td>
                    <td className="py-3 px-3.5 select-all">
                      <div className="font-mono font-bold text-slate-900">{rec.waybillNo}</div>
                      {rec.orderNo && (
                        <div className="text-[10px] text-slate-400 font-mono">订单: {rec.orderNo}</div>
                      )}
                    </td>
                    <td className="py-3 px-3.5">
                      <div className="font-semibold text-slate-700">{rec.customerName}</div>
                      {rec.customerCode && (
                        <div className="text-[10px] text-slate-400 font-mono">{rec.customerCode}</div>
                      )}
                    </td>
                    <td className="py-3 px-3.5 text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-slate-800">
                          {rec.recipientName}
                        </span>
                        {rec.recipientPhone && (
                          <span className="text-slate-400 font-mono text-[11px]">
                            ({rec.recipientPhone})
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center font-mono text-slate-600">
                      {rec.weight > 0 ? `${rec.weight.toFixed(2)} kg` : "-"}
                    </td>
                    <td className="py-3 px-3.5 text-right font-mono font-bold text-slate-800">
                      ฿{rec.jntFee.toFixed(2)}
                    </td>
                    <td className="py-3 px-3.5 text-right font-mono text-brand-600 font-medium">
                      ฿{rec.surcharge.toFixed(2)}
                    </td>
                    <td className="py-3 px-3.5 text-right font-mono font-black text-slate-900 text-sm">
                      ฿{rec.totalFee.toFixed(2)}
                    </td>
                    <td className="py-3 px-3.5 text-center">
                      <div className="inline-flex flex-col items-center gap-1">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${statusCfg.badgeClass}`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${statusCfg.dotClass}`}
                          />
                          {statusCfg.label}
                        </span>
                        {rec.matchMethod === "alt_key" && (
                          <span className="text-[10px] font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.2 rounded">
                            双重穿透匹配
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          /* J&T Full Format View */
          <table ref={realTableRef} className="w-full text-left text-xs border-collapse font-sans whitespace-nowrap">
            <thead ref={realTheadRef}>
              <tr className="bg-slate-50/90 text-slate-600 font-bold border-b border-slate-200 text-center">
                <th className="py-2.5 px-2 border-r border-slate-200 min-w-[36px]">#</th>
                <th className="py-2.5 px-3 border-r border-slate-200 min-w-[120px] text-left">
                  运单号
                </th>
                <th className="py-2.5 px-3 border-r border-slate-200 min-w-[130px]">
                  录入时间
                </th>
                <th className="py-2.5 px-3 border-r border-slate-200 min-w-[130px]">
                  签收时间
                </th>
                <th className="py-2.5 px-2.5 border-r border-slate-200 min-w-[100px]">
                  所属网点
                </th>
                <th className="py-2.5 px-2 border-r border-slate-200 min-w-[70px]">
                  管理方式
                </th>
                <th className="py-2.5 px-2 border-r border-slate-200 min-w-[70px]">
                  经营模式
                </th>
                <th className="py-2.5 px-3 border-r border-slate-200 min-w-[90px]">
                  客户编码
                </th>
                <th className="py-2.5 px-3 border-r border-slate-200 min-w-[140px] text-left">
                  客户名称
                </th>
                <th className="py-2.5 px-2 border-r border-slate-200 min-w-[60px]">
                  付款周期
                </th>
                <th className="py-2.5 px-2 border-r border-slate-200 min-w-[60px]">
                  产品类型
                </th>
                <th className="py-2.5 px-2 border-r border-slate-200 min-w-[60px]">
                  寄件方式
                </th>
                <th className="py-2.5 px-2 border-r border-slate-200 min-w-[60px]">
                  品名类型
                </th>
                <th className="py-2.5 px-2 border-r border-slate-200 min-w-[65px] text-right">
                  计费重量
                </th>
                <th className="py-2.5 px-2.5 border-r border-slate-200 min-w-[75px] text-right bg-amber-50/30">
                  总运费(฿)
                </th>
                <th className="py-2.5 px-2 border-r border-slate-200 min-w-[65px] text-right">
                  基础运费
                </th>
                <th className="py-2.5 px-2 border-r border-slate-200 min-w-[65px] text-right">
                  偏远费
                </th>
                <th className="py-2.5 px-2 border-r border-slate-200 min-w-[65px] text-right">
                  保价费
                </th>
                <th className="py-2.5 px-2 border-r border-slate-200 min-w-[65px] text-right">
                  包材费
                </th>
                <th className="py-2.5 px-2.5 border-r border-slate-200 min-w-[75px] text-right text-brand-700 bg-brand-50/20">
                  操作费
                </th>
                <th className="py-2.5 px-3 border-r border-slate-200 min-w-[85px] text-right text-brand-900 bg-brand-50/40 font-black">
                  最终应付
                </th>
                <th className="py-2.5 px-3 min-w-[100px] text-center">对账状态</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-center">
              {records.map((rec, idx) => {
                const statusCfg = STATUS_CONFIG[rec.status];

                return (
                  <tr
                    key={`${rec.waybillNo}-${idx}`}
                    className="hover:bg-slate-50/80 transition-colors h-9 text-slate-800"
                  >
                    <td className="py-1 px-2 border-r border-slate-100 text-slate-400 text-[11px] font-mono">
                      {idx + 1}
                    </td>
                    <td className="py-1 px-3 border-r border-slate-100 font-mono font-bold text-slate-900 text-left select-all">
                      {rec.waybillNo}
                    </td>
                    <td className="py-1 px-3 border-r border-slate-100 text-slate-500 font-mono text-[11px]">
                      {rec.entryTime || "-"}
                    </td>
                    <td className="py-1 px-3 border-r border-slate-100 text-slate-500 font-mono text-[11px]">
                      {rec.signTime || "-"}
                    </td>
                    <td className="py-1 px-2.5 border-r border-slate-100 text-slate-600 font-medium">
                      {rec.branchName || "-"}
                    </td>
                    <td className="py-1 px-2 border-r border-slate-100 text-slate-600 text-xs">
                      {rec.mgmtType || "-"}
                    </td>
                    <td className="py-1 px-2 border-r border-slate-100 text-slate-600 text-xs">
                      {rec.bizMode || "-"}
                    </td>
                    <td className="py-1 px-3 border-r border-slate-100 text-slate-500 font-mono text-[11px]">
                      {rec.customerCode || "-"}
                    </td>
                    <td
                      className="py-1 px-3 border-r border-slate-100 font-semibold text-slate-900 text-left truncate max-w-[150px]"
                      title={rec.customerName}
                    >
                      {rec.customerName}
                    </td>
                    <td className="py-1 px-2 border-r border-slate-100 text-slate-500 font-mono text-[11px]">
                      {rec.payCycle || "-"}
                    </td>
                    <td className="py-1 px-2 border-r border-slate-100 text-slate-500 font-mono text-[11px]">
                      {rec.productType || "-"}
                    </td>
                    <td className="py-1 px-2 border-r border-slate-100 text-slate-500 font-mono text-[11px]">
                      {rec.shippingMethod || "-"}
                    </td>
                    <td className="py-1 px-2 border-r border-slate-100 text-slate-500 font-mono text-[11px]">
                      {rec.itemType || "-"}
                    </td>
                    <td className="py-1 px-2 border-r border-slate-100 font-mono text-slate-700 text-right">
                      {rec.weight > 0 ? rec.weight.toFixed(2) : "0.00"}
                    </td>
                    <td className="py-1 px-2.5 border-r border-slate-100 font-mono font-bold text-slate-900 text-right bg-amber-50/20">
                      ฿{rec.jntFee.toFixed(2)}
                    </td>
                    <td className="py-1 px-2 border-r border-slate-100 font-mono text-slate-600 text-right">
                      ฿{(rec.baseFee !== undefined ? rec.baseFee : rec.jntFee).toFixed(2)}
                    </td>
                    <td className="py-1 px-2 border-r border-slate-100 font-mono text-slate-500 text-right">
                      ฿{(rec.remoteFee || 0).toFixed(2)}
                    </td>
                    <td className="py-1 px-2 border-r border-slate-100 font-mono text-slate-500 text-right">
                      ฿{(rec.insuranceFee || 0).toFixed(2)}
                    </td>
                    <td className="py-1 px-2 border-r border-slate-100 font-mono text-slate-500 text-right">
                      ฿{(rec.packageFee || 0).toFixed(2)}
                    </td>
                    <td className="py-1 px-2.5 border-r border-slate-100 font-mono text-brand-600 font-semibold text-right bg-brand-50/20">
                      ฿{rec.surcharge.toFixed(2)}
                    </td>
                    <td className="py-1 px-3 border-r border-slate-100 font-mono font-black text-slate-950 text-right bg-brand-50/40">
                      ฿{rec.totalFee.toFixed(2)}
                    </td>
                    <td className="py-1 px-3 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${statusCfg.badgeClass}`}
                      >
                        {statusCfg.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}