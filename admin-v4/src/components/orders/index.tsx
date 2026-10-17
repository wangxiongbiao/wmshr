import React, { useEffect, useRef, useState } from "react";
import { Download, ScanLine, Search, ShoppingCart, X } from "lucide-react";
import { CustomerOrder } from "../../types";
import { OrderManagerProps, PairingResult, PlatformFilter, SyncResult } from "./types";
import { ORDER_PAGE_SIZE, ORDER_TABS } from "./constants";
import { useOrderFilters } from "./hooks/useOrderFilters";
import { useOrderList } from "./hooks/useOrderList";
import {
  batchApply,
  listOrders,
  markAnomaly,
  printLabel,
  resolveAnomaly,
  shipByCode,
  shipOrder,
  voidOrder,
} from "./services/orderApi";
import { ApiError } from "../../lib/apiRequest";
import { exportOrdersCsv } from "./utils/exportOrdersCsv";
import { OrderTable } from "./components/OrderTable";
import { ShopSyncModal } from "./components/ShopSyncModal";
import { PairingModal } from "./components/PairingModal";
import { PrintPreviewModal } from "./components/PrintPreviewModal";
import { AnomalyReasonModal } from "./components/AnomalyReasonModal";
import { VoidConfirmDialog } from "./components/VoidConfirmDialog";
import { BatchActionBar } from "./components/BatchActionBar";
import { BatchVoidDialog } from "./components/BatchVoidDialog";
import { OrderDetailModal } from "./components/OrderDetailModal";
import { Button } from "../ui/button";
import { DatePicker } from "../ui/date-picker";

const EMPTY_TAB_COUNTS = { pending_pair: 0, pending_print: 0, printed: 0, shipped: 0, anomaly: 0, canceled: 0 };

const selectClass =
  "w-full sm:w-auto px-3 py-1.5 border border-slate-200 rounded-lg outline-none text-xs font-medium text-slate-700 bg-slate-50 transition";

export function OrderManager({ customers, products, addToast, onInventoryChanged }: OrderManagerProps) {
  const filters = useOrderFilters();
  const { query } = filters;
  const { data, loading, error, reload } = useOrderList(query);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [scanCode, setScanCode] = useState("");

  const [isSyncOpen, setIsSyncOpen] = useState(false);
  const [isPairingOpen, setIsPairingOpen] = useState(false);
  const [printingOrder, setPrintingOrder] = useState<CustomerOrder | null>(null);
  const [exceptionOrder, setExceptionOrder] = useState<CustomerOrder | null>(null);
  const [voidingOrder, setVoidingOrder] = useState<CustomerOrder | null>(null);
  const [detailOrder, setDetailOrder] = useState<CustomerOrder | null>(null);
  const [isBatchVoidOpen, setIsBatchVoidOpen] = useState(false);

  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / ORDER_PAGE_SIZE));
  const tabCounts = data?.tabCounts ?? EMPTY_TAB_COUNTS;
  const selectedOrders = items.filter((o) => selectedIds.has(o.id));

  useEffect(() => {
    setSelectedIds(new Set());
  }, [query]);

  useEffect(() => {
    if (data && query.page > totalPages) filters.setPage(totalPages);
  }, [data, query.page, totalPages]);

  const shopOptions = customers
    .filter((c) => filters.customerId === "all" || c.id === filters.customerId)
    .flatMap((c) => c.shops ?? []);

  /** 串行执行写操作：防连击、统一错误提示、成功后刷新列表（并按需通知库存变化） */
  const runAction = async (task: () => Promise<string>, affectsInventory = false) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      addToast(await task());
      setSelectedIds(new Set());
      if (affectsInventory) onInventoryChanged();
    } catch (err) {
      addToast(err instanceof ApiError ? err.message : "操作失败，请稍后重试", "error");
      if (!(err instanceof ApiError)) console.error(err);
    } finally {
      busyRef.current = false;
      setBusy(false);
      reload();
    }
  };

  const handleSynced = (result: SyncResult) => {
    onInventoryChanged();
    reload();
    addToast(`同步完成：新入库 ${result.imported} 单，待配对 ${result.pendingPair} 单，库存不足 ${result.outOfStock} 单，平台取消 ${result.canceled} 单`);
  };

  const handlePaired = (result: PairingResult) => {
    onInventoryChanged();
    reload();
    addToast(`配对已保存：${result.pendingPrint} 单进入待打单，${result.outOfStock} 单库存不足转入异常${result.stillPending ? `，${result.stillPending} 单仍有其他商品待配对` : ""}`);
  };

  const handleConfirmPrint = (input: { carrier: string; trackingNo: string }) => {
    if (!printingOrder) return;
    runAction(async () => {
      const order = await printLabel(printingOrder.id, input);
      setPrintingOrder(null);
      return `【面单打印成功】订单 "${order.id}" 已更新为已打单${order.trackingNo ? `，快递单号 ${order.trackingNo}` : ""}。`;
    });
  };

  const handleShip = (ord: CustomerOrder) =>
    runAction(async () => {
      await shipOrder(ord.id);
      return `【快递员扫码出库】面单核销成功，订单 ${ord.id} 已装车发货。`;
    });

  const handleScanShip = (e: React.FormEvent) => {
    e.preventDefault();
    runAction(async () => {
      const order = await shipByCode(scanCode);
      setScanCode("");
      return `【扫码发货成功】订单 ${order.id}（${order.trackingNo || order.orderNo}）已发货。`;
    });
  };

  const handleConfirmException = (reason: string) => {
    if (!exceptionOrder) return;
    runAction(async () => {
      await markAnomaly(exceptionOrder.id, reason);
      setExceptionOrder(null);
      return "订单已被拣货员标记为「拣货异常单」，请及时排查库位！";
    });
  };

  const handleResolveAnomaly = (ord: CustomerOrder) =>
    runAction(async () => {
      await resolveAnomaly(ord.id);
      return `差异重新核准！订单 ${ord.id} 已写回待打单流重新处理。`;
    }, true);

  const handleConfirmVoid = () => {
    if (!voidingOrder) return;
    runAction(async () => {
      await voidOrder(voidingOrder.id);
      setVoidingOrder(null);
      return "已成功手工作废该订单，实物库存已归还到位。";
    }, true);
  };

  const runBatch = (action: "print" | "ship" | "void", label: string) =>
    runAction(async () => {
      const result = await batchApply(action, [...selectedIds]);
      setIsBatchVoidOpen(false);
      const failedPart = result.failed.length
        ? `，失败 ${result.failed.length} 笔（${result.failed[0].reason}${result.failed.length > 1 ? " 等" : ""}）`
        : "";
      return `批量${label}：成功 ${result.succeeded.length} 笔${failedPart}`;
    }, action === "void");

  const handleExport = () => {
    if (total === 0) {
      addToast("当前筛选条件下暂无订单可导出", "info");
      return;
    }
    runAction(async () => {
      const all = await listOrders({ ...query, page: 1, pageSize: total });
      exportOrdersCsv(all.items);
      return `已导出 ${all.items.length} 笔订单明细`;
    });
  };

  const toggleSelect = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  const toggleSelectAll = () =>
    setSelectedIds(
      items.every((o) => selectedIds.has(o.id)) ? new Set() : new Set(items.map((o) => o.id))
    );

  return (
    <div className="space-y-4">
      {/* 搜索与快捷操作顶部栏 */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200/80 p-4 space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={filters.keyword}
                onChange={(e) => filters.setKeyword(e.target.value)}
                placeholder="搜索订单流水、平台单号、快递单号、SKU、收件人..."
                className="w-full pl-9 pr-4 py-1.5 border border-slate-200 rounded-lg outline-none text-xs focus:ring-1 focus:ring-blue-500 text-slate-700 bg-slate-50 transition placeholder:text-slate-400 font-medium"
              />
            </div>

            <select
              value={filters.customerId}
              onChange={(e) => filters.setCustomerId(e.target.value)}
              className={selectClass}
            >
              <option value="all">所有所属客户</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <select
              value={filters.shopId}
              onChange={(e) => filters.setShopId(e.target.value)}
              className={selectClass}
            >
              <option value="all">所有店铺</option>
              {shopOptions.map((s) => (
                <option key={s.id} value={s.shopId}>
                  {s.platform} - {s.shopName}
                </option>
              ))}
            </select>

            <select
              value={filters.platform}
              onChange={(e) => filters.setPlatform(e.target.value as PlatformFilter)}
              className={selectClass}
            >
              <option value="all">所有平台</option>
              <option value="TikTok">TikTok</option>
              <option value="Shopee">Shopee</option>
            </select>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button variant="outline" size="sm" onClick={handleExport} disabled={busy} className="gap-1.5">
              <Download className="w-4 h-4" />
              <span>导出当前筛选</span>
            </Button>
            <Button
              size="sm"
              onClick={() => setIsSyncOpen(true)}
              className="w-full sm:w-auto gap-1.5 bg-blue-600 hover:bg-blue-700 font-bold"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>同步店铺订单 (Shopee)</span>
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span>下单日期</span>
            <div className="w-40">
              <DatePicker
                value={filters.dateFrom}
                max={filters.dateTo || undefined}
                onValueChange={filters.setDateFrom}
                placeholder="起始日期"
                className="h-8 text-xs"
              />
            </div>
            <span>至</span>
            <div className="w-40">
              <DatePicker
                value={filters.dateTo}
                min={filters.dateFrom || undefined}
                onValueChange={filters.setDateTo}
                placeholder="截止日期"
                className="h-8 text-xs"
              />
            </div>
            {filters.hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={filters.resetFilters} className="gap-1">
                <X className="w-3.5 h-3.5" />
                <span>清除筛选</span>
              </Button>
            )}
          </div>

          <form onSubmit={handleScanShip} className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={scanCode}
                disabled={busy}
                onChange={(e) => setScanCode(e.target.value)}
                placeholder="扫码/输入快递单号或平台单号发货"
                className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg outline-none text-xs focus:ring-1 focus:ring-blue-500 text-slate-700 bg-slate-50 font-mono placeholder:font-sans placeholder:text-slate-400"
              />
            </div>
            <Button type="submit" size="sm" disabled={busy || !scanCode.trim()} className="gap-1.5 bg-indigo-600 hover:bg-indigo-700">
              <ScanLine className="w-4 h-4" />
              <span>扫码发货</span>
            </Button>
          </form>
        </div>
      </div>

      {/* 订单流转状态 Tabs */}
      <div className="flex border-b border-slate-200 gap-1 overflow-x-auto select-none bg-white px-2 rounded-t-xl pt-2">
        {ORDER_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = filters.activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => filters.setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold border-b-2 transition whitespace-nowrap cursor-pointer ${
                isActive
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${tab.countColor}`}>
                {tabCounts[tab.id]}
              </span>
            </button>
          );
        })}
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-xs text-rose-700">
          <span>订单加载失败：{error}</span>
          <Button variant="outline" size="sm" onClick={reload}>
            重试
          </Button>
        </div>
      )}

      <BatchActionBar
        activeTab={filters.activeTab}
        selectedCount={selectedIds.size}
        busy={busy}
        onPrint={() => runBatch("print", "打印面单")}
        onShip={() => runBatch("ship", "发货")}
        onVoid={() => setIsBatchVoidOpen(true)}
        onClear={() => setSelectedIds(new Set())}
      />

      {/* 订单主表格与分页 */}
      <OrderTable
        orders={items}
        activeTab={filters.activeTab}
        loading={loading}
        busy={busy}
        selectedIds={selectedIds}
        onToggleSelect={toggleSelect}
        onToggleSelectAll={toggleSelectAll}
        onOpenDetail={setDetailOrder}
        currentPage={query.page}
        totalPages={totalPages}
        totalFilteredCount={total}
        onPageChange={filters.setPage}
        onOpenPrintPreview={setPrintingOrder}
        onCourierShip={handleShip}
        onOpenException={setExceptionOrder}
        onResolveAnomaly={handleResolveAnomaly}
        onOpenVoidConfirm={setVoidingOrder}
        onOpenPairing={() => setIsPairingOpen(true)}
      />

      <ShopSyncModal
        isOpen={isSyncOpen}
        customers={customers}
        onClose={() => setIsSyncOpen(false)}
        onSynced={handleSynced}
        addToast={addToast}
      />

      <PairingModal
        isOpen={isPairingOpen}
        products={products}
        onClose={() => setIsPairingOpen(false)}
        onPaired={handlePaired}
        addToast={addToast}
      />

      <PrintPreviewModal
        isOpen={!!printingOrder}
        order={printingOrder}
        busy={busy}
        onClose={() => setPrintingOrder(null)}
        onConfirmPrint={handleConfirmPrint}
      />

      <AnomalyReasonModal
        isOpen={!!exceptionOrder}
        order={exceptionOrder}
        busy={busy}
        onClose={() => setExceptionOrder(null)}
        onConfirm={handleConfirmException}
      />

      <VoidConfirmDialog
        isOpen={!!voidingOrder}
        order={voidingOrder}
        busy={busy}
        onClose={() => setVoidingOrder(null)}
        onConfirm={handleConfirmVoid}
      />

      <BatchVoidDialog
        isOpen={isBatchVoidOpen}
        orders={selectedOrders}
        busy={busy}
        onClose={() => setIsBatchVoidOpen(false)}
        onConfirm={() => runBatch("void", "作废")}
      />

      <OrderDetailModal order={detailOrder} onClose={() => setDetailOrder(null)} />
    </div>
  );
}

export default OrderManager;
