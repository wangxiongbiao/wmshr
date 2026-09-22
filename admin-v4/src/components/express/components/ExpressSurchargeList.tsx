import React from "react";
import { Coins, Plus, Edit2, Trash2, X, AlertCircle } from "lucide-react";
import { Button } from "../../ui/button";
import { Badge } from "../../ui/badge";
import { Customer } from "../../../types";
import { CustomerSurcharge } from "../types";
import { getCustomerCurrency } from "../constants";

interface ExpressSurchargeListProps {
  surcharges: Record<string, CustomerSurcharge>;
  customers: Customer[];
  onOpenModal: (item?: CustomerSurcharge) => void;
  onDeleteSurcharge: (name: string) => void;
  onClose: () => void;
}

export function ExpressSurchargeList(props: ExpressSurchargeListProps) {
  const { surcharges, customers, onOpenModal, onDeleteSurcharge, onClose } = props;
  const surchargeList = Object.values(surcharges);

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden animate-in fade-in-50 duration-200">
      {/* Header */}
      <div className="px-4 py-3 bg-slate-50/70 border-b border-slate-200/80 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-amber-100/70 text-amber-700 rounded-md">
            <Coins className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-xs flex items-center gap-2">
              客户操作费设置列表
              <Badge
                variant="secondary"
                className="h-4 px-1.5 text-[10px] font-mono bg-amber-100 text-amber-800 border-none"
              >
                已配置 {surchargeList.length} 家
              </Badge>
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              为客户定制打包或操作费规则，对账时将自动叠加至客户最终应付款
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            onClick={() => onOpenModal()}
            className="h-7 px-2.5 text-xs font-medium gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>新增操作费规则</span>
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-7 w-7 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
            title="收起客户操作费列表"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Content Grid */}
      <div className="p-4">
        {surchargeList.length === 0 ? (
          <div className="py-8 text-center bg-slate-50/40 rounded-lg border border-dashed border-slate-200">
            <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs text-slate-500 font-medium">暂未为任何客户设置专属操作费</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              默认最后应付款 = J&T 官方结算快递费用
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenModal()}
              className="mt-3 h-7 text-xs gap-1 cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              <span>立即添加客户操作费</span>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {surchargeList.map((sur) => {
              const curInfo = getCustomerCurrency(sur.customerName, customers);
              const isPiece = sur.type === "piece";

              return (
                <div
                  key={sur.customerName}
                  className="p-3 rounded-lg bg-slate-50/60 border border-slate-200/70 hover:border-slate-300 transition-colors flex items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <h4
                      className="font-bold text-slate-800 text-xs truncate"
                      title={sur.customerName}
                    >
                      {sur.customerName}
                    </h4>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <span
                        className={`px-1.5 py-0.2 rounded text-[10px] font-medium border ${
                          isPiece
                            ? "bg-blue-50 text-blue-700 border-blue-200"
                            : "bg-purple-50 text-purple-700 border-purple-200"
                        }`}
                      >
                        {isPiece ? "按单件收费" : "固定打包费"}
                      </span>
                      <span className="text-slate-900 font-mono font-bold text-xs">
                        {curInfo.symbol}
                        {sur.amount.toFixed(2)}
                        <span className="text-[10px] text-slate-400 font-normal ml-0.5">
                          {isPiece ? "/件" : "/月"}
                        </span>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => onOpenModal(sur)}
                      className="h-7 w-7 text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded-md cursor-pointer"
                      title="编辑该规则"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => onDeleteSurcharge(sur.customerName)}
                      className="h-7 w-7 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md cursor-pointer"
                      title="删除该规则"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
