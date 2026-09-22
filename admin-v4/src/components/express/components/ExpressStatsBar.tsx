import React from "react";
import {
  PackageCheck,
  ReceiptText,
  CheckCircle2,
  AlertTriangle,
  Coins,
  Wallet
} from "lucide-react";
import { ReconciliationStats } from "../types";

interface ExpressStatsBarProps {
  stats: ReconciliationStats;
}

export function ExpressStatsBar({ stats }: ExpressStatsBarProps) {
  const matchPct =
    stats.totalShipments > 0
      ? Math.round((stats.matchedCount / stats.totalShipments) * 100)
      : 0;
  const anomalyCount = stats.systemOnlyCount + stats.jntOnlyCount;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {/* 1. System Shipments */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs p-3 flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400">
          <span className="text-[11px] font-medium">系统发货单数</span>
          <PackageCheck className="w-3.5 h-3.5 text-blue-500" />
        </div>
        <div className="mt-2 flex items-baseline gap-1">
          <span className="text-xl font-black text-slate-800 font-mono">
            {stats.totalShipments}
          </span>
          <span className="text-xs text-slate-400">单</span>
        </div>
      </div>

      {/* 2. JNT Bills */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs p-3 flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400">
          <span className="text-[11px] font-medium">J&T 账单行数</span>
          <ReceiptText className="w-3.5 h-3.5 text-orange-500" />
        </div>
        <div className="mt-2 flex items-baseline gap-1">
          <span className="text-xl font-black text-slate-800 font-mono">
            {stats.totalJntBills}
          </span>
          <span className="text-xs text-slate-400">单</span>
        </div>
      </div>

      {/* 3. Matched Count */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs p-3 flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400">
          <span className="text-[11px] font-medium">成功对账匹配</span>
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
        </div>
        <div className="mt-2 flex items-baseline gap-1">
          <span className="text-xl font-black text-emerald-600 font-mono">
            {stats.matchedCount}
          </span>
          <span className="text-xs text-slate-400 font-medium">
            单 ({matchPct}%)
          </span>
        </div>
      </div>

      {/* 4. Anomalies */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs p-3 flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400">
          <span className="text-[11px] font-medium">财务不一致异常</span>
          <AlertTriangle
            className={`w-3.5 h-3.5 ${anomalyCount > 0 ? "text-amber-500" : "text-slate-400"}`}
          />
        </div>
        <div className="mt-2 flex items-baseline gap-1">
          <span
            className={`text-xl font-black font-mono ${
              anomalyCount > 0 ? "text-amber-600" : "text-slate-800"
            }`}
          >
            {anomalyCount}
          </span>
          <span className="text-xs text-slate-400">单</span>
        </div>
      </div>

      {/* 5. JNT Express Fee */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs p-3 flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400">
          <span className="text-[11px] font-medium">J&T结算运费</span>
          <Coins className="w-3.5 h-3.5 text-blue-500" />
        </div>
        <div className="mt-2">
          <span className="text-lg font-black text-slate-800 font-mono">
            ฿{stats.totalExpressFee.toLocaleString("zh-CN", { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* 6. Total Payable */}
      <div className="bg-white rounded-xl border border-brand-200/80 shadow-2xs p-3 flex flex-col justify-between bg-gradient-to-br from-white to-brand-50/20">
        <div className="flex items-center justify-between text-brand-600">
          <span className="text-[11px] font-bold">客户最终应付总计</span>
          <Wallet className="w-3.5 h-3.5 text-brand-600" />
        </div>
        <div className="mt-2">
          <span className="text-lg font-black text-brand-700 font-mono">
            ฿{stats.totalPayable.toLocaleString("zh-CN", { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>
    </div>
  );
}
