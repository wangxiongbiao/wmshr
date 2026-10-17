import React from "react";
import { CustomerOrder } from "../../../types";
import { OrderTabStatus } from "../types";
import { Printer, Truck, Trash2, RotateCcw, ChevronLeft, ChevronRight, Loader2, Link2 } from "lucide-react";
import { Button } from "../../ui/button";
import { formatCurrency } from "../../../lib/utils";
import { canApplyAction } from "../services/orderStateMachine";

interface OrderTableProps {
  orders: CustomerOrder[];
  activeTab: OrderTabStatus;
  loading: boolean;
  busy: boolean;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onOpenDetail: (ord: CustomerOrder) => void;
  currentPage: number;
  totalPages: number;
  totalFilteredCount: number;
  onPageChange: (page: number) => void;
  onOpenPrintPreview: (ord: CustomerOrder) => void;
  onCourierShip: (ord: CustomerOrder) => void;
  onOpenException: (ord: CustomerOrder) => void;
  onResolveAnomaly: (ord: CustomerOrder) => void;
  onOpenVoidConfirm: (ord: CustomerOrder) => void;
  onOpenPairing: () => void;
}

export function OrderTable({
  orders,
  activeTab,
  loading,
  busy,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onOpenDetail,
  currentPage,
  totalPages,
  totalFilteredCount,
  onPageChange,
  onOpenPrintPreview,
  onCourierShip,
  onOpenException,
  onResolveAnomaly,
  onOpenVoidConfirm,
  onOpenPairing,
}: OrderTableProps) {
  const colSpan = activeTab === "anomaly" ? 11 : 10;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200/80 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[1000px] text-[13px]">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wider">
              <th className="pl-5 pr-2 py-3.5 w-8">
                <input
                  type="checkbox"
                  aria-label="全选当前页"
                  disabled={orders.length === 0 || busy}
                  checked={orders.length > 0 && orders.every((o) => selectedIds.has(o.id))}
                  onChange={onToggleSelectAll}
                  className="cursor-pointer"
                />
              </th>
              <th className="px-5 py-3.5">交易订单 ID</th>
              <th className="px-5 py-3.5">网店渠道来源</th>
              <th className="px-5 py-3.5">所属商户</th>
              <th className="px-5 py-3.5">商品 SKU • 明细</th>
              <th className="px-5 py-3.5 text-right">订购数量</th>
              <th className="px-5 py-3.5 text-right">结算总额</th>
              <th className="px-5 py-3.5">买家姓名与收件地址</th>
              <th className="px-5 py-3.5">物流承运商 • 快递单号</th>
              {activeTab === "anomaly" && (
                <th className="px-5 py-3.5 text-rose-600">异常原因描述</th>
              )}
              <th className="px-5 py-3.5 text-center">快捷控制台</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {loading && orders.length === 0 ? (
              <tr>
                <td colSpan={colSpan} className="text-center py-14 text-slate-400 font-medium">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                  <span className="text-xs">订单加载中...</span>
                </td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={colSpan} className="text-center py-14 text-slate-400 font-medium">
                  <div className="max-w-md mx-auto space-y-1.5 p-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    <p className="font-bold text-slate-700 text-xs">
                      当前列表暂无过滤订单记录
                    </p>
                    <p className="text-[11px] text-slate-400">
                      请点击右上角【同步店铺订单】拉取 Shopee 订单，配对并锁定库存后会自动流向此列。
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              orders.map((ord) => (
                <tr
                  key={ord.id}
                  className="hover:bg-slate-50/70 transition duration-150"
                >
                  <td className="pl-5 pr-2 py-4">
                    <input
                      type="checkbox"
                      aria-label={`选择订单 ${ord.id}`}
                      disabled={busy}
                      checked={selectedIds.has(ord.id)}
                      onChange={() => onToggleSelect(ord.id)}
                      className="cursor-pointer"
                    />
                  </td>

                  {/* 订单 ID 与平台单号 */}
                  <td className="px-5 py-4 font-mono">
                    <button
                      type="button"
                      onClick={() => onOpenDetail(ord)}
                      className="font-bold text-blue-600 hover:underline text-xs cursor-pointer"
                    >
                      {ord.id}
                    </button>
                    <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                      平台: {ord.orderNo}
                    </div>
                  </td>

                  {/* 网店渠道 */}
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          ord.platform === "TikTok"
                            ? "bg-slate-900 text-white"
                            : "bg-orange-500 text-white"
                        }`}
                      >
                        {ord.platform}
                      </span>
                      <span className="font-semibold text-xs text-slate-800">
                        {ord.shopName}
                      </span>
                    </div>
                  </td>

                  {/* 所属商户 */}
                  <td className="px-5 py-4 font-semibold text-xs text-slate-800">
                    {ord.customerName}
                  </td>

                  {/* 商品明细：已配对显示本仓 SKU，未配对标出平台 SKU */}
                  <td className="px-5 py-4 max-w-xs space-y-1.5">
                    {ord.items.map((item) => (
                      <div key={`${item.platformItemId}:${item.platformModelId}`}>
                        <div className="flex items-center gap-1.5">
                          {item.sku ? (
                            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-bold">
                              {item.sku}
                            </span>
                          ) : (
                            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-violet-50 text-violet-700 font-bold">
                              未配对 {item.platformSku || "无平台SKU"}
                            </span>
                          )}
                          <span className="text-[10px] text-slate-500 font-mono">x{item.qty}</span>
                        </div>
                        <div className="text-xs font-medium text-slate-800 line-clamp-1" title={item.itemName}>
                          {item.productName || item.itemName}
                          {item.modelName && <span className="text-slate-400"> · {item.modelName}</span>}
                        </div>
                      </div>
                    ))}
                  </td>

                  {/* 数量 */}
                  <td className="px-5 py-4 text-right font-mono font-bold text-xs text-slate-900">
                    {ord.items.reduce((sum, item) => sum + item.qty, 0)} 件
                  </td>

                  {/* 总额 */}
                  <td className="px-5 py-4 text-right font-mono">
                    <div className="font-bold text-xs text-slate-900">
                      {formatCurrency(ord.totalAmount, ord.currency)}
                    </div>
                  </td>

                  {/* 买家姓名与地址 */}
                  <td className="px-5 py-4 max-w-xs text-xs">
                    <div className="font-bold text-slate-900">
                      {ord.receiverName}{" "}
                      <span className="text-[10px] font-normal text-slate-400 font-mono">
                        {ord.receiverPhone}
                      </span>
                    </div>
                    <div className="text-slate-500 text-[11px] truncate mt-0.5">
                      {ord.receiverAddress}
                    </div>
                  </td>

                  {/* 物流承运商 */}
                  <td className="px-5 py-4 text-xs">
                    {ord.carrier ? (
                      <div>
                        <p className="font-bold text-slate-800 text-[11px]">
                          {ord.carrier}
                        </p>
                        <p className="font-mono text-slate-500 font-medium text-[10px] underline mt-0.5">
                          {ord.trackingNo}
                        </p>
                      </div>
                    ) : (
                      <span className="text-slate-400 italic text-[11px]">
                        尚未分配面单
                      </span>
                    )}
                  </td>

                  {/* 异常说明 */}
                  {activeTab === "anomaly" && (
                    <td className="px-5 py-4 text-rose-600 bg-rose-50/30 text-xs font-medium">
                      {ord.reason || "拣货员标记异常，未写明描述"}
                    </td>
                  )}

                  {/* 操作控制台 */}
                  <td className="px-5 py-4 text-center">
                    <div className="flex items-center justify-center gap-1.5 flex-wrap">
                      {ord.status === "pending_pair" && (
                        <Button
                          size="sm"
                          disabled={busy}
                          className="h-7 px-2.5 text-[11px] bg-violet-600 hover:bg-violet-700"
                          onClick={onOpenPairing}
                        >
                          <Link2 className="w-3 h-3" />
                          <span>SKU 配对</span>
                        </Button>
                      )}

                      {canApplyAction(ord.status, "print") && (
                        <Button
                          size="sm"
                          disabled={busy}
                          className="h-7 px-2.5 text-[11px] bg-blue-600 hover:bg-blue-700"
                          onClick={() => onOpenPrintPreview(ord)}
                        >
                          <Printer className="w-3 h-3" />
                          <span>打印电子面单</span>
                        </Button>
                      )}

                      {canApplyAction(ord.status, "ship") && (
                        <Button
                          size="sm"
                          disabled={busy}
                          className="h-7 px-2.5 text-[11px] bg-indigo-600 hover:bg-indigo-700"
                          onClick={() => onCourierShip(ord)}
                        >
                          <Truck className="w-3.5 h-3.5" />
                          <span>确认发货</span>
                        </Button>
                      )}

                      {canApplyAction(ord.status, "markAnomaly") && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={busy}
                          className="h-7 px-2 text-[11px] text-rose-600 hover:bg-rose-50 border-rose-200"
                          onClick={() => onOpenException(ord)}
                        >
                          拣货异常
                        </Button>
                      )}

                      {canApplyAction(ord.status, "resolveAnomaly") && (
                        <Button
                          size="sm"
                          disabled={busy}
                          className="h-7 px-2.5 text-[11px] bg-emerald-600 hover:bg-emerald-700"
                          onClick={() => onResolveAnomaly(ord)}
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>异常重新处理</span>
                        </Button>
                      )}

                      {canApplyAction(ord.status, "void") && (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={busy}
                          className="h-7 px-2 text-[11px] text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                          onClick={() => onOpenVoidConfirm(ord)}
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>作废</span>
                        </Button>
                      )}

                      {(ord.status === "shipped" || ord.status === "canceled") && (
                        <span className="text-slate-400 text-[11px] italic">
                          流转已完成
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 分页控制栏 */}
      {totalPages > 1 && (
        <div className="px-5 py-3 border-t border-slate-200/80 bg-slate-50/50 flex items-center justify-between text-xs text-slate-600">
          <div>
            共 <span className="font-bold text-slate-800">{totalFilteredCount}</span> 条记录，当前第{" "}
            <span className="font-bold text-slate-800">{currentPage}</span> /{" "}
            <span>{totalPages}</span> 页
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2"
              disabled={currentPage <= 1}
              onClick={() => onPageChange(currentPage - 1)}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>上一页</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2"
              disabled={currentPage >= totalPages}
              onClick={() => onPageChange(currentPage + 1)}
            >
              <span>下一页</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
