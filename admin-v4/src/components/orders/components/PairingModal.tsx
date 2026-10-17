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
import { Link2, Loader2 } from "lucide-react";
import { Product } from "../../../types";
import { PairingResult, PendingPairItem } from "../types";
import { createPairing, listPendingPairs } from "../services/orderApi";

interface PairingModalProps {
  isOpen: boolean;
  products: Product[];
  onClose: () => void;
  onPaired: (result: PairingResult) => void;
  addToast: (msg: string, kind?: "success" | "error" | "info") => void;
}

const pairKey = (item: PendingPairItem) => `${item.shopRecordId}:${item.platformItemId}:${item.platformModelId}`;

export function PairingModal({ isOpen, products, onClose, onPaired, addToast }: PairingModalProps) {
  const [items, setItems] = useState<PendingPairItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selection, setSelection] = useState<Record<string, { productRecordId: string; qty: number }>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await listPendingPairs());
    } catch (err) {
      setError(err instanceof Error ? err.message : "待配对商品加载失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    setSelection({});
    void load();
  }, [isOpen]);

  const handlePair = async (item: PendingPairItem) => {
    const key = pairKey(item);
    const choice = selection[key];
    if (!choice?.productRecordId) {
      addToast("请先选择要配对的本仓商品", "error");
      return;
    }
    setSavingKey(key);
    try {
      const result = await createPairing(item, choice.productRecordId, choice.qty);
      setItems((prev) => prev.filter((i) => pairKey(i) !== key));
      onPaired(result);
    } catch (err) {
      addToast(err instanceof Error ? err.message : "配对失败，请稍后重试", "error");
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !savingKey && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 text-violet-600 mb-1">
            <Link2 className="w-5 h-5 shrink-0" />
            <DialogTitle className="text-base text-slate-900">平台商品 SKU 配对</DialogTitle>
          </div>
          <DialogDescription className="text-xs text-slate-500">
            为平台商品规格选择对应的本仓商品。配对会被记住，之后同一商品的订单自动匹配；已在待配对的订单会立即锁定库存进入待打单。
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-10 text-center text-xs text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
            待配对商品加载中...
          </div>
        ) : error ? (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-xs text-rose-700">
            <span>{error}</span>
            <Button variant="outline" size="sm" onClick={() => void load()}>重试</Button>
          </div>
        ) : items.length === 0 ? (
          <div className="py-10 text-center text-xs text-slate-400">当前没有需要配对的平台商品</div>
        ) : (
          <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
            {items.map((item) => {
              const key = pairKey(item);
              const choice = selection[key] ?? { productRecordId: "", qty: 1 };
              const candidates = products.filter((p) => p.customerId === item.customerId);
              return (
                <div key={key} className="p-3 flex flex-col md:flex-row md:items-center gap-3 text-xs">
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    {item.imageUrl && <img src={item.imageUrl} alt="" className="w-10 h-10 rounded object-cover border border-slate-200 shrink-0" />}
                    <div className="min-w-0 space-y-0.5">
                      <p className="font-semibold text-slate-800 line-clamp-1">{item.itemName}</p>
                      <p className="text-[11px] text-slate-500">
                        规格：{item.modelName || "无"} · 平台SKU：{item.platformSku || "未填写"}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {item.shopName} · {item.customerName} · 涉及 {item.orderCount} 单 / {item.totalQty} 件
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <select
                      value={choice.productRecordId}
                      disabled={!!savingKey}
                      onChange={(e) => setSelection((prev) => ({ ...prev, [key]: { ...choice, productRecordId: e.target.value } }))}
                      className="w-56 px-2 py-1.5 border border-slate-200 rounded-lg outline-none text-xs bg-white text-slate-700"
                    >
                      <option value="">选择本仓商品...</option>
                      {candidates.map((p) => (
                        <option key={p.recordId} value={p.recordId}>
                          {p.id} · {p.name}（库存 {p.inventory}）
                        </option>
                      ))}
                    </select>
                    <label className="flex items-center gap-1 text-[11px] text-slate-500">
                      每件对应
                      <input
                        type="number"
                        min={1}
                        value={choice.qty}
                        disabled={!!savingKey}
                        onChange={(e) => setSelection((prev) => ({ ...prev, [key]: { ...choice, qty: Math.max(1, Number(e.target.value) || 1) } }))}
                        className="w-14 px-2 py-1.5 border border-slate-200 rounded-lg outline-none text-xs"
                      />
                      件
                    </label>
                    <Button size="sm" disabled={!!savingKey || !choice.productRecordId} onClick={() => handlePair(item)}>
                      {savingKey === key ? "配对中..." : "确认配对"}
                    </Button>
                  </div>
                  {candidates.length === 0 && (
                    <p className="text-[11px] text-rose-500">该客户还没有商品，请先在商品列表中创建</p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <DialogFooter className="pt-2">
          <Button variant="outline" size="sm" onClick={onClose} disabled={!!savingKey}>关闭</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
