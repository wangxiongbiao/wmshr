import React, { useState, useEffect, useMemo } from "react";
import { Coins, Plus, Trash2, Search, Check, Loader2, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "../../ui/dialog";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Customer } from "../../../types";
import { CustomerSurcharge } from "../types";
import { getCustomerCurrency } from "../constants";

interface ExpressSurchargeModalProps {
  isOpen: boolean;
  onClose: () => void;
  surcharges: Record<string, CustomerSurcharge>;
  editingSurcharge?: { customerName: string; type: "piece" | "flat"; amount: number };
  onSaveSurcharge: (item: {
    customerName: string;
    originalCustomerName?: string;
    type: "piece" | "flat";
    amount: number;
  }) => void;
  onDeleteSurcharge: (customerName: string) => void;
  customers: Customer[];
  uniqueCustomerNames: string[];
}

export function ExpressSurchargeModal(props: ExpressSurchargeModalProps) {
  const {
    isOpen,
    onClose,
    surcharges,
    editingSurcharge,
    onSaveSurcharge,
    onDeleteSurcharge,
    customers,
    uniqueCustomerNames
  } = props;

  const [selectedCustomer, setSelectedCustomer] = useState<string>("");
  const [customCustomerInput, setCustomCustomerInput] = useState<string>("");
  const [surchargeType, setSurchargeType] = useState<"piece" | "flat">("piece");
  const [amountStr, setAmountStr] = useState<string>("5");
  const [customerSearch, setCustomerSearch] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const effectiveCustomerName = customCustomerInput.trim() || selectedCustomer;
  const curInfo = getCustomerCurrency(effectiveCustomerName, customers);

  // Filter existing customers by search
  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return uniqueCustomerNames;
    const q = customerSearch.trim().toLowerCase();
    return uniqueCustomerNames.filter((c) => c.toLowerCase().includes(q));
  }, [uniqueCustomerNames, customerSearch]);

  // When opening or selecting a customer, load existing config if any
  const handleSelectCustomer = (name: string) => {
    setSelectedCustomer(name);
    setCustomCustomerInput("");
    if (surcharges[name]) {
      setSurchargeType(surcharges[name].type);
      setAmountStr(String(surcharges[name].amount));
    } else {
      setSurchargeType("piece");
      setAmountStr("5");
    }
  };

  useEffect(() => {
    if (isOpen) {
      if (editingSurcharge?.customerName) {
        // 编辑模式：精准回显当前正在编辑的客户
        setSelectedCustomer(editingSurcharge.customerName);
        setCustomCustomerInput("");
        setSurchargeType(editingSurcharge.type);
        setAmountStr(String(editingSurcharge.amount));
      } else {
        // 新增模式：保持干净状态，绝不自动预选任何客户
        setSelectedCustomer("");
        setCustomCustomerInput("");
        setSurchargeType("piece");
        setAmountStr("5");
        setCustomerSearch("");
      }
    }
  }, [isOpen, editingSurcharge]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!effectiveCustomerName || isSubmitting) return;
    const parsedAmount = parseFloat(amountStr) || 0;
    setIsSubmitting(true);
    try {
      await onSaveSurcharge({
        customerName: effectiveCustomerName,
        originalCustomerName: editingSurcharge?.customerName,
        type: surchargeType,
        amount: Math.max(0, parsedAmount)
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          if (isSubmitting) return; // 提交期间锁定遮罩与 Esc，防止误触导致请求悬空
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto p-0 gap-0">
        <DialogHeader className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900">
                设置客户操作费规则
              </DialogTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                为发货客户配置专属操作费（按件收费或固定月度打包费），对账时自动计入应收款
              </p>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4">
          {/* Step 1: Customer Selection */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              1. 选择发货客户 <span className="text-rose-500">*</span>
            </label>

            {/* Search Filter for Customers */}
            <div className="relative mb-2">
              <Input
                type="text"
                placeholder="搜索已有客户列表..."
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                className="h-8 text-xs pl-7 pr-7 bg-white"
              />
              <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              {customerSearch && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setCustomerSearch("")}
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 p-0 cursor-pointer"
                  title="清空"
                >
                  <X className="w-3 h-3" />
                </Button>
              )}
            </div>

            {/* Customer Pills / List */}
            <div className="max-h-32 overflow-y-auto border border-slate-200 rounded-lg p-1.5 space-y-1 bg-slate-50/30">
              {filteredCustomers.length > 0 ? (
                filteredCustomers.map((cust) => {
                  const isSelected = selectedCustomer === cust && !customCustomerInput;
                  const hasRule = !!surcharges[cust];

                  return (
                    <div
                      key={cust}
                      onClick={() => handleSelectCustomer(cust)}
                      className={`flex items-center justify-between p-2 rounded-md text-xs cursor-pointer transition-colors ${
                        isSelected
                          ? "bg-brand-50 text-brand-800 font-bold border border-brand-200"
                          : "hover:bg-slate-100 text-slate-700"
                      }`}
                    >
                      <span className="truncate">{cust}</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {hasRule && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-mono">
                            已设 {surcharges[cust].type === "piece" ? `${surcharges[cust].amount}฿/件` : `${surcharges[cust].amount}฿/月`}
                          </span>
                        )}
                        {isSelected && <Check className="w-3.5 h-3.5 text-brand-600" />}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-3 text-center text-xs text-slate-400">
                  {uniqueCustomerNames.length === 0
                    ? "当前暂无发货客户数据，请在下方直接输入客户名称"
                    : "未找到匹配客户"}
                </div>
              )}
            </div>

            {/* Custom customer name manual input */}
            <div className="pt-1">
              <span className="text-[11px] text-slate-400">或手动输入新客户名称：</span>
              <Input
                type="text"
                placeholder="输入新客户名称..."
                value={customCustomerInput}
                onChange={(e) => {
                  setCustomCustomerInput(e.target.value);
                  setSelectedCustomer("");
                }}
                className="h-8 text-xs mt-1 bg-white"
              />
            </div>
          </div>

          {/* Step 2: Surcharge Type */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              2. 加收额外操作费方式 <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSurchargeType("piece")}
                className={`h-auto p-3 rounded-lg border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                  surchargeType === "piece"
                    ? "border-brand-600 bg-brand-50/70 text-brand-800 font-bold shadow-2xs hover:bg-brand-50"
                    : "border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-medium"
                }`}
              >
                <div className="text-xs">按发货件数收取</div>
                <div className="text-[10px] text-slate-400 font-normal">
                  每发 1 单加收固定操作费
                </div>
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => setSurchargeType("flat")}
                className={`h-auto p-3 rounded-lg border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                  surchargeType === "flat"
                    ? "border-brand-600 bg-brand-50/70 text-brand-800 font-bold shadow-2xs hover:bg-brand-50"
                    : "border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-medium"
                }`}
              >
                <div className="text-xs">固定打包金额</div>
                <div className="text-[10px] text-slate-400 font-normal">
                  按月统一加收一笔操作费
                </div>
              </Button>
            </div>
          </div>

          {/* Step 3: Amount */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              3. 加收金额 ({curInfo.code}) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-xs">
                {curInfo.symbol}
              </span>
              <Input
                type="number"
                min="0"
                step="0.01"
                required
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                className="h-9 text-xs pl-7 pr-20 bg-white font-mono font-bold"
                placeholder={surchargeType === "piece" ? "5.00" : "100.00"}
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-mono">
                {surchargeType === "piece" ? `${curInfo.symbol} / 件` : `${curInfo.symbol} / 月`}
              </span>
            </div>
          </div>

          {/* Existing Rules List */}
          {Object.keys(surcharges).length > 0 && (
            <div className="pt-2 border-t border-slate-100">
              <span className="text-[11px] font-bold text-slate-500 block mb-1.5">
                当前已配置的客户操作费列表：
              </span>
              <div className="max-h-24 overflow-y-auto space-y-1">
                {Object.values(surcharges).map((sur) => (
                  <div
                    key={sur.customerName}
                    className="flex items-center justify-between p-1.5 px-2 bg-slate-50 rounded border border-slate-100 text-xs"
                  >
                    <span className="font-medium text-slate-700 truncate max-w-[240px]">
                      {sur.customerName}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-brand-700 font-semibold text-[11px]">
                        {sur.type === "piece" ? `${sur.amount}฿/件` : `${sur.amount}฿/月`}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => onDeleteSurcharge(sur.customerName)}
                        className="h-5 w-5 text-slate-400 hover:text-rose-600 p-0 cursor-pointer"
                        title="删除该规则"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <DialogFooter className="pt-3 border-t border-slate-100 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isSubmitting}
              onClick={onClose}
              className="text-xs cursor-pointer"
            >
              取消
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={!effectiveCustomerName || isSubmitting}
              className="text-xs cursor-pointer min-w-[80px]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                  <span>保存中...</span>
                </>
              ) : (
                <span>保存配置</span>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
