import React from "react";
import { ExpenseRecord } from "../types";
import { formatExpenseAmount } from "../constants";
import { Button } from "../../ui/button";
import { Pagination } from "../../Pagination";
import { 
  FileText, Loader2, RefreshCcw, FileCheck, FileX, User, 
  CreditCard, RotateCcw, Trash2 
} from "lucide-react";
import { cn } from "../../../lib/utils";

interface ExpenseMainTableProps {
  loading?: boolean;
  actionLoadingId?: string | null;
  filteredExpenses: ExpenseRecord[];
  pagedExpenses: ExpenseRecord[];
  currentPage: number;
  pageSize: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onResetFilters: () => void;
  // Item actions
  onOpenDetail: (rec: ExpenseRecord) => void;
  onOpenEdit: (rec: ExpenseRecord, e: React.MouseEvent) => void;
  onOpenApproval: (rec: ExpenseRecord, e?: React.MouseEvent) => void;
  onRecallApproval: (rec: ExpenseRecord, e?: React.MouseEvent) => void;
  onDeleteExpense: (id: string, e: React.MouseEvent) => void;
  onPreviewImage: (url: string) => void;
  // Sticky mirror header refs
  isMirrorHeaderVisible: boolean;
  mirrorHeaderRef: React.RefObject<HTMLDivElement | null>;
  tableContainerRef: React.RefObject<HTMLDivElement | null>;
  realTableRef: React.RefObject<HTMLTableElement | null>;
  realTheadRef: React.RefObject<HTMLTableSectionElement | null>;
  tableHeadSentinelRef: React.RefObject<HTMLDivElement | null>;
  colWidths: number[];
  realTableWidth: number;
  handleTableScroll: (e: React.UIEvent<HTMLDivElement>) => void;
}

export function ExpenseMainTable({
  loading,
  actionLoadingId,
  filteredExpenses,
  pagedExpenses,
  currentPage,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onResetFilters,
  onOpenDetail,
  onOpenEdit,
  onOpenApproval,
  onRecallApproval,
  onDeleteExpense,
  onPreviewImage,
  isMirrorHeaderVisible,
  mirrorHeaderRef,
  tableContainerRef,
  realTableRef,
  realTheadRef,
  tableHeadSentinelRef,
  colWidths,
  realTableWidth,
  handleTableScroll
}: ExpenseMainTableProps) {
  return (
    <>
      {/* 悬浮镜像表头 */}
      {isMirrorHeaderVisible && (
        <div
          ref={mirrorHeaderRef}
          className="overflow-x-hidden border-t border-slate-200/80 bg-slate-50/95 backdrop-blur-xs shadow-xs transition-opacity duration-150"
        >
          <table
            style={{ width: realTableWidth ? `${realTableWidth}px` : "100%", minWidth: "1000px" }}
            className="text-left border-collapse table-fixed text-[13px]"
          >
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200/80 text-slate-600 font-bold text-xs uppercase tracking-wider select-none">
                <th style={{ width: colWidths[0] ? `${colWidths[0]}px` : undefined }} className="px-4 py-3.5 w-28 whitespace-nowrap">支付时间</th>
                <th style={{ width: colWidths[1] ? `${colWidths[1]}px` : undefined }} className="px-4 py-3.5 min-w-[240px]">费用名称</th>
                <th style={{ width: colWidths[2] ? `${colWidths[2]}px` : undefined }} className="px-3 py-3.5 w-16 text-center whitespace-nowrap">用途</th>
                <th style={{ width: colWidths[3] ? `${colWidths[3]}px` : undefined }} className="px-3 py-3.5 w-24 text-center whitespace-nowrap">类型</th>
                <th style={{ width: colWidths[4] ? `${colWidths[4]}px` : undefined }} className="px-3 py-3.5 w-24 text-center whitespace-nowrap">支付方式</th>
                <th style={{ width: colWidths[5] ? `${colWidths[5]}px` : undefined }} className="px-4 py-3.5 w-28 text-right whitespace-nowrap">支付金额</th>
                <th style={{ width: colWidths[6] ? `${colWidths[6]}px` : undefined }} className="px-4 py-3.5 w-36 whitespace-nowrap">支付人</th>
                <th style={{ width: colWidths[7] ? `${colWidths[7]}px` : undefined }} className="px-3 py-3.5 w-22 text-center whitespace-nowrap">状态</th>
                <th style={{ width: colWidths[8] ? `${colWidths[8]}px` : undefined }} className="px-4 py-3.5 w-36 text-right whitespace-nowrap pr-5">操作</th>
              </tr>
            </thead>
          </table>
        </div>
      )}

      <div ref={tableHeadSentinelRef} className="h-0 w-full" />

      {/* 真实报销列表 */}
      <div ref={tableContainerRef} onScroll={handleTableScroll} className="overflow-x-auto relative rounded-b-xl">
        <table ref={realTableRef} className="w-full text-left border-collapse min-w-[1000px] text-[13px]">
          <thead ref={realTheadRef}>
            <tr className="bg-slate-50 border-b border-slate-200/80 text-slate-600 font-bold text-xs uppercase tracking-wider select-none">
              <th className="px-4 py-3.5 w-28 whitespace-nowrap">支付时间</th>
              <th className="px-4 py-3.5 min-w-[240px]">费用名称</th>
              <th className="px-3 py-3.5 w-16 text-center whitespace-nowrap">用途</th>
              <th className="px-3 py-3.5 w-24 text-center whitespace-nowrap">类型</th>
              <th className="px-3 py-3.5 w-24 text-center whitespace-nowrap">支付方式</th>
              <th className="px-4 py-3.5 w-28 text-right whitespace-nowrap">支付金额</th>
              <th className="px-4 py-3.5 w-36 whitespace-nowrap">支付人</th>
              <th className="px-3 py-3.5 w-22 text-center whitespace-nowrap">状态</th>
              <th className="px-4 py-3.5 w-36 text-right whitespace-nowrap pr-5">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {loading ? (
              <tr>
                <td colSpan={9} className="py-16 text-center text-slate-400 font-medium">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
                    <p className="text-xs font-medium text-slate-500">正在同步费用与工资核销数据...</p>
                  </div>
                </td>
              </tr>
            ) : filteredExpenses.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-slate-400 font-medium">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <FileText className="w-10 h-10 text-slate-300" />
                    <p>未检索到相符的费用核销记录</p>
                    <Button 
                      variant="link"
                      size="sm"
                      onClick={onResetFilters}
                      className="text-[11px] text-brand-600 font-bold hover:underline mt-1 flex items-center gap-1 cursor-pointer h-auto p-0"
                    >
                      <RefreshCcw className="w-3 h-3" /> 重置所有搜索过滤
                    </Button>
                  </div>
                </td>
              </tr>
            ) : (
              pagedExpenses.map((rec) => {
                const hasReceipt = Boolean(rec.receiptUrl || (rec.receiptUrls && rec.receiptUrls.length > 0) || rec.receiptName);
                return (
                  <tr 
                    key={rec.id}
                    onClick={() => onOpenDetail(rec)}
                    className="hover:bg-slate-50/70 transition cursor-pointer group"
                  >
                    {/* 1. 支付时间 */}
                    <td className="px-4 py-3.5 font-mono text-xs text-slate-500 whitespace-nowrap">
                      {rec.paymentTime}
                    </td>

                    {/* 2. 费用名称与凭证 */}
                    <td className="px-4 py-3.5 min-w-[240px]">
                      <div className="flex flex-col gap-1">
                        <span className="font-semibold text-slate-800 group-hover:text-brand-600 transition leading-snug" title={rec.name}>
                          {rec.name}
                        </span>
                        <div className="flex items-center gap-2 flex-wrap select-none text-[11px]">
                          {hasReceipt ? (
                            <span
                              onClick={(e) => {
                                if (rec.receiptUrl) {
                                  e.stopPropagation();
                                  onPreviewImage(rec.receiptUrl);
                                }
                              }}
                              className={cn(
                                "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-emerald-700 bg-emerald-50 border border-emerald-200/80 font-medium",
                                rec.receiptUrl && "cursor-pointer hover:bg-emerald-100"
                              )}
                              title={rec.receiptName || (rec.receiptUrl ? "点击查看凭证图片" : "已附凭证")}
                            >
                              <FileCheck className="w-3 h-3 text-emerald-600" /> 有凭证
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-0.5 text-slate-400 font-normal">
                              <FileX className="w-3 h-3 text-slate-400" /> 无凭证
                            </span>
                          )}
                          {rec.targetApproverName && rec.targetApproverId !== -1 && (
                            <span className="inline-flex items-center gap-1 text-slate-400 font-normal" title={`指定审批主管：${rec.targetApproverName}`}>
                              <User className="w-3 h-3 text-slate-400" /> {rec.targetApproverName}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* 3. 费用用途 */}
                    <td className="px-3 py-3.5 w-16 text-center whitespace-nowrap">
                      {rec.purpose === 'advance' ? (
                        <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-medium text-purple-700 bg-purple-50 border border-purple-200 whitespace-nowrap shrink-0">
                          预支
                        </span>
                      ) : rec.purpose === 'income' ? (
                        <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 whitespace-nowrap shrink-0">
                          收入
                        </span>
                      ) : (
                        <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-medium text-slate-600 bg-slate-100 border border-slate-200 whitespace-nowrap shrink-0">
                          支出
                        </span>
                      )}
                    </td>

                    {/* 4. 费用类型 */}
                    <td className="px-3 py-3.5 w-24 text-center whitespace-nowrap">
                      <span className="inline-flex items-center justify-center px-2 py-0.5 rounded text-xs font-medium text-brand-700 bg-brand-50 border border-brand-200/60 whitespace-nowrap shrink-0">
                        {rec.type}
                      </span>
                    </td>

                    {/* 5. 支付方式 */}
                    <td className="px-3 py-3.5 w-24 text-center whitespace-nowrap text-xs text-slate-600">
                      <span className="inline-flex items-center gap-1 font-medium">
                        <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                        <span>{rec.paymentMethod}</span>
                      </span>
                    </td>

                    {/* 6. 金额 */}
                    <td className="px-4 py-3.5 w-28 text-right font-mono text-[13.5px] font-bold text-slate-900 whitespace-nowrap">
                      {formatExpenseAmount(rec.amount, rec.currency)}
                    </td>

                    {/* 7. 支付人 */}
                    <td className="px-4 py-3.5 w-36 text-slate-600 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 max-w-[140px]">
                        <div className="w-5.5 h-5.5 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 text-[10px] font-bold select-none shrink-0">
                          {rec.payerName?.slice(0, 1) || "P"}
                        </div>
                        <span className="truncate text-xs font-medium text-slate-700" title={rec.payerName}>{rec.payerName}</span>
                      </div>
                    </td>

                    {/* 8. 报销状态 */}
                    <td className="px-3 py-3.5 w-22 text-center whitespace-nowrap">
                      {rec.status === 'pending' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-medium whitespace-nowrap shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                          待审批
                        </span>
                      )}
                      {rec.status === 'approved' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-medium whitespace-nowrap shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                          已批准
                        </span>
                      )}
                      {rec.status === 'rejected' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-xs font-medium whitespace-nowrap shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                          已驳回
                        </span>
                      )}
                    </td>

                    {/* 9. 操作按钮组 */}
                    <td className="px-4 py-3.5 text-right whitespace-nowrap pr-5" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end items-center gap-1 whitespace-nowrap text-xs font-semibold">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={actionLoadingId === rec.id}
                          onClick={() => onOpenDetail(rec)}
                          className="h-7 px-2 text-xs font-semibold text-brand-600 hover:text-brand-800 hover:bg-brand-50 cursor-pointer disabled:opacity-40"
                          title="查看完整明细"
                        >
                          查看
                        </Button>

                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={actionLoadingId === rec.id}
                          onClick={(e) => onOpenEdit(rec, e)}
                          className="h-7 px-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 cursor-pointer disabled:opacity-40"
                          title={rec.salaryDetail ? "查看工资条核算详情" : "编辑费用内容"}
                        >
                          {rec.salaryDetail ? "明细" : "编辑"}
                        </Button>

                        {rec.status === 'pending' && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={actionLoadingId === rec.id}
                            onClick={(e) => onOpenApproval(rec, e)}
                            className="h-7 px-2 text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 cursor-pointer disabled:opacity-40"
                            title="执行批准发放或驳回审核"
                          >
                            审批
                          </Button>
                        )}

                        {rec.status === 'approved' && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={actionLoadingId === rec.id}
                            onClick={(e) => onRecallApproval(rec, e)}
                            className="h-7 px-2 text-xs font-medium text-amber-600 hover:text-amber-800 hover:bg-amber-50 gap-0.5 cursor-pointer disabled:opacity-40"
                            title="撤回已发放/已审批状态"
                          >
                            {actionLoadingId === rec.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <RotateCcw className="w-3 h-3" />
                            )}
                            <span>撤回</span>
                          </Button>
                        )}

                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={actionLoadingId === rec.id}
                          onClick={(e) => onDeleteExpense(rec.id, e)}
                          className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer disabled:opacity-40"
                          title="报销撤销删除"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 分页组件 */}
      {filteredExpenses.length > 0 && (
        <div className="p-4 bg-slate-50 border-t border-slate-100">
          <Pagination
            page={currentPage}
            pageSize={pageSize}
            total={filteredExpenses.length}
            itemName="笔"
            pageSizeOptions={[10, 20, 50]}
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
          />
        </div>
      )}
    </>
  );
}
