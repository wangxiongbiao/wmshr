import React from "react";
import { Card } from "../../ui/card";
import { Wallet, AlertCircle, CheckCircle, BadgeAlert } from "lucide-react";
import { formatExpenseAmount } from "../constants";
import { cn } from "../../../lib/utils";

interface ExpenseStatsData {
  totalAmt: number;
  pendingAmt: number;
  approvedAmt: number;
  rejectCount: number;
  pendingCount: number;
  approvedCount: number;
  totalCount: number;
}

interface ExpenseStatsBarProps {
  stats: ExpenseStatsData;
  activeCurrency: string;
  statusFilter: string;
  onSelectStatus: (status: string) => void;
}

export function ExpenseStatsBar({
  stats,
  activeCurrency,
  statusFilter,
  onSelectStatus
}: ExpenseStatsBarProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in duration-300">
      <Card 
        onClick={() => onSelectStatus("all")}
        className={cn(
          "p-4.5 flex items-center gap-4 transition duration-200 cursor-pointer select-none",
          statusFilter === "all" 
            ? "border-brand-500 ring-2 ring-brand-500/20 bg-brand-50/10 shadow-xs" 
            : "border-slate-200/80 bg-white hover:border-slate-300 hover:shadow-xs"
        )}
      >
        <div className="w-11 h-11 rounded-xl bg-brand-50 flex items-center justify-center text-brand-600 flex-shrink-0">
          <Wallet className="w-5.5 h-5.5" />
        </div>
        <div>
          <p className="text-slate-500 font-semibold text-xs tracking-wider uppercase">申报总金额</p>
          <p className="text-xl font-black text-slate-800 font-mono mt-0.5">
            {formatExpenseAmount(stats.totalAmt, activeCurrency)}
          </p>
        </div>
      </Card>

      <Card 
        onClick={() => onSelectStatus("pending")}
        className={cn(
          "p-4.5 flex items-center gap-4 transition duration-200 cursor-pointer select-none",
          statusFilter === "pending" 
            ? "border-amber-500 ring-2 ring-amber-500/20 bg-amber-50/10 shadow-xs" 
            : "border-slate-200/80 bg-white hover:border-slate-300 hover:shadow-xs"
        )}
      >
        <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 flex-shrink-0">
          <AlertCircle className="w-5.5 h-5.5" />
        </div>
        <div>
          <p className="text-slate-500 font-semibold text-xs tracking-wider uppercase">待审核金额</p>
          <p className="text-xl font-black text-slate-800 font-mono mt-0.5">
            {formatExpenseAmount(stats.pendingAmt, activeCurrency)}
          </p>
        </div>
      </Card>

      <Card 
        onClick={() => onSelectStatus("approved")}
        className={cn(
          "p-4.5 flex items-center gap-4 transition duration-200 cursor-pointer select-none",
          statusFilter === "approved" 
            ? "border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/10 shadow-xs" 
            : "border-slate-200/80 bg-white hover:border-slate-300 hover:shadow-xs"
        )}
      >
        <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 flex-shrink-0">
          <CheckCircle className="w-5.5 h-5.5" />
        </div>
        <div>
          <p className="text-slate-500 font-semibold text-xs tracking-wider uppercase">已批准总金额</p>
          <p className="text-xl font-black text-slate-800 font-mono mt-0.5">
            {formatExpenseAmount(stats.approvedAmt, activeCurrency)}
          </p>
        </div>
      </Card>

      <Card 
        onClick={() => onSelectStatus("rejected")}
        className={cn(
          "p-4.5 flex items-center gap-4 transition duration-200 cursor-pointer select-none",
          statusFilter === "rejected" 
            ? "border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/10 shadow-xs" 
            : "border-slate-200/80 bg-white hover:border-slate-300 hover:shadow-xs"
        )}
      >
        <div className="w-11 h-11 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600 flex-shrink-0">
          <BadgeAlert className="w-5.5 h-5.5" />
        </div>
        <div>
          <p className="text-slate-500 font-semibold text-xs tracking-wider uppercase">驳回次数</p>
          <p className="text-xl font-black text-slate-800 font-mono mt-0.5">
            {stats.rejectCount} <span className="text-xs text-slate-500 font-bold ml-0.5">次</span>
          </p>
        </div>
      </Card>
    </div>
  );
}
