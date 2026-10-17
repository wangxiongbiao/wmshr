import React from "react";
import { Printer, Truck, Trash2, X } from "lucide-react";
import { Button } from "../../ui/button";
import { OrderTabStatus } from "../types";
import { canApplyAction } from "../services/orderStateMachine";

interface BatchActionBarProps {
  activeTab: OrderTabStatus;
  selectedCount: number;
  busy: boolean;
  onPrint: () => void;
  onShip: () => void;
  onVoid: () => void;
  onClear: () => void;
}

export function BatchActionBar({ activeTab, selectedCount, busy, onPrint, onShip, onVoid, onClear }: BatchActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5 flex flex-wrap items-center gap-2.5 text-xs">
      <span className="font-bold text-blue-800">已选 {selectedCount} 单</span>

      {canApplyAction(activeTab, "print") && (
        <Button size="sm" disabled={busy} onClick={onPrint} className="gap-1.5" title="使用各订单平台指定的承运商">
          <Printer className="w-3.5 h-3.5" />
          <span>批量打印面单</span>
        </Button>
      )}

      {canApplyAction(activeTab, "ship") && (
        <Button size="sm" disabled={busy} onClick={onShip} className="gap-1.5 bg-indigo-600 hover:bg-indigo-700">
          <Truck className="w-3.5 h-3.5" />
          <span>批量发货</span>
        </Button>
      )}

      {canApplyAction(activeTab, "void") && (
        <Button variant="destructive" size="sm" disabled={busy} onClick={onVoid} className="gap-1.5">
          <Trash2 className="w-3.5 h-3.5" />
          <span>批量作废</span>
        </Button>
      )}

      <Button variant="ghost" size="sm" disabled={busy} onClick={onClear} className="gap-1 ml-auto">
        <X className="w-3.5 h-3.5" />
        <span>取消选择</span>
      </Button>
    </div>
  );
}
