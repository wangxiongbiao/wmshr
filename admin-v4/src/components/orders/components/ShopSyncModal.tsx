import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../../ui/dialog";
import { Button } from "../../ui/button";
import { RefreshCw, ShoppingCart, Sparkles } from "lucide-react";
import { Customer } from "../../../types";
import { SyncResult } from "../types";
import { syncShopOrders } from "../services/orderApi";

interface ShopSyncModalProps {
  isOpen: boolean;
  customers: Customer[];
  onClose: () => void;
  onSynced: (result: SyncResult) => void;
  addToast: (msg: string, kind?: "success" | "error" | "info") => void;
}

export function ShopSyncModal({ isOpen, customers, onClose, onSynced, addToast }: ShopSyncModalProps) {
  const [syncingShopId, setSyncingShopId] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<{ shopName: string; result: SyncResult } | null>(null);

  useEffect(() => {
    if (isOpen) setLastResult(null);
  }, [isOpen]);

  const shops = customers.flatMap((customer) =>
    customer.shops
      .filter((shop) => shop.platform === "Shopee")
      .map((shop) => ({ ...shop, customerName: customer.name }))
  );

  const handleSync = async (shopRecordId: string, shopName: string) => {
    setSyncingShopId(shopRecordId);
    try {
      const result = await syncShopOrders(shopRecordId);
      setLastResult({ shopName, result });
      onSynced(result);
    } catch (error) {
      addToast(error instanceof Error ? error.message : "同步订单失败，请稍后重试", "error");
    } finally {
      setSyncingShopId(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !syncingShopId && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 text-blue-600 mb-1">
            <ShoppingCart className="w-5 h-5 shrink-0" />
            <DialogTitle className="text-base text-slate-900">同步 Shopee 店铺订单</DialogTitle>
          </div>
          <DialogDescription className="text-xs text-slate-500">
            拉取店铺近 15 天内有更新的订单：待发货订单入库并锁定库存，平台已取消的订单自动作废并回补库存。
          </DialogDescription>
        </DialogHeader>

        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-2.5 text-xs">
          <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5 leading-relaxed text-slate-600">
            <span className="font-bold text-slate-800">入库规则：</span>
            平台商品已配对（或平台 SKU 与本仓 SKU 一致）且库存充足 → 待打单；库存不足 → 异常单；未配对 → 待配对。同一平台订单不会重复入库。
          </div>
        </div>

        {lastResult && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 space-y-1">
            <p className="font-bold">「{lastResult.shopName}」同步完成：平台返回 {lastResult.result.fetched} 单</p>
            <p>
              新入库 {lastResult.result.imported} 单（待打单 {lastResult.result.pendingPrint}、待配对 {lastResult.result.pendingPair}、
              库存不足 {lastResult.result.outOfStock}），平台取消作废 {lastResult.result.canceled} 单
            </p>
          </div>
        )}

        <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 bg-white">
          {shops.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">
              暂无已授权的 Shopee 店铺，请先到【客户管理】为客户授权绑定店铺。
            </div>
          ) : (
            shops.map((shop) => (
              <div key={shop.id} className="p-3 flex items-center justify-between gap-3 text-xs">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-orange-500 text-white">Shopee</span>
                    <span className="font-bold text-slate-800">{shop.shopName}</span>
                    <span className="text-slate-400 font-mono">#{shop.shopId}</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    所属客户：{shop.customerName} · 上次同步：{shop.lastSyncedAt || "从未同步"}
                  </p>
                </div>
                {shop.status === "enabled" ? (
                  <Button
                    size="sm"
                    disabled={!!syncingShopId}
                    onClick={() => handleSync(shop.id, shop.shopName)}
                    className="gap-1.5 shrink-0"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${syncingShopId === shop.id ? "animate-spin" : ""}`} />
                    <span>{syncingShopId === shop.id ? "同步中..." : "同步订单"}</span>
                  </Button>
                ) : (
                  <span className="text-[11px] text-rose-500 shrink-0">
                    {shop.status === "revoked" ? "授权已失效，请到客户管理重新授权" : "店铺已停用"}
                  </span>
                )}
              </div>
            ))
          )}
        </div>

        <DialogFooter className="pt-2">
          <Button variant="outline" size="sm" onClick={onClose} disabled={!!syncingShopId}>
            关闭
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
