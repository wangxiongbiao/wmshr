import React, { useState, useEffect, useMemo } from "react";
import {
  Coins,
  Plus,
  Edit2,
  Trash2,
  Search,
  Check,
  Loader2,
  X,
  ChevronLeft,
  AlertCircle
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "../../ui/dialog";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Badge } from "../../ui/badge";
import { Customer } from "../../../types";
import { CustomerSurcharge } from "../types";
import { getCustomerCurrency, CURRENCY_OPTIONS, getCurrencyInfo, convertCurrency } from "../constants";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "../../ui/select";

interface ExpressSurchargeListProps {
  isOpen: boolean;
  onClose: () => void;
  surcharges: Record<string, CustomerSurcharge>;
  customers: Customer[];
  uniqueCustomerNames?: string[];
  defaultWarehouseCurrency?: string;
  onSaveSurcharge: (item: {
    customerName: string;
    originalCustomerName?: string;
    type: "piece" | "flat";
    amount: number;
    currency?: string;
  }) => Promise<boolean | void> | void;
  onDeleteSurcharge: (name: string) => void;
}

export function ExpressSurchargeList(props: ExpressSurchargeListProps) {
  const {
    isOpen,
    onClose,
    surcharges,
    customers,
    uniqueCustomerNames = [],
    defaultWarehouseCurrency = "THB",
    onSaveSurcharge,
    onDeleteSurcharge
  } = props;

  // View mode within the modal: "list" for rules overview, "form" for adding/editing
  const [viewMode, setViewMode] = useState<"list" | "form">("list");
  const [listSearch, setListSearch] = useState<string>("");

  // Form states
  const [selectedCustomer, setSelectedCustomer] = useState<string>("");
  const [customCustomerInput, setCustomCustomerInput] = useState<string>("");
  const [surchargeType, setSurchargeType] = useState<"piece" | "flat">("piece");
  const [amountStr, setAmountStr] = useState<string>("5");
  const [selectedCurrency, setSelectedCurrency] = useState<string>(defaultWarehouseCurrency);
  const [customerSearch, setCustomerSearch] = useState<string>("");
  const [editingOriginalName, setEditingOriginalName] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [deletingName, setDeletingName] = useState<string | null>(null);

  const surchargeList = useMemo(() => Object.values(surcharges), [surcharges]);

  // Reset states when opening modal
  useEffect(() => {
    if (isOpen) {
      setViewMode("list");
      setListSearch("");
      setDeletingName(null);
    }
  }, [isOpen]);

  // Filtered surcharge list for search in list mode
  const filteredSurchargeList = useMemo(() => {
    if (!listSearch.trim()) return surchargeList;
    const q = listSearch.trim().toLowerCase();
    return surchargeList.filter((item) =>
      item.customerName.toLowerCase().includes(q)
    );
  }, [surchargeList, listSearch]);

  // Filter existing customers in form mode
  const filteredFormCustomers = useMemo(() => {
    if (!customerSearch.trim()) return uniqueCustomerNames;
    const q = customerSearch.trim().toLowerCase();
    return uniqueCustomerNames.filter((c) => c.toLowerCase().includes(q));
  }, [uniqueCustomerNames, customerSearch]);

  const effectiveCustomerName = customCustomerInput.trim() || selectedCustomer;
  const curInfo = getCustomerCurrency(effectiveCustomerName, customers);

  // Switch to Form Mode for adding a new rule
  const handleAddNewRule = () => {
    setEditingOriginalName(null);
    setSelectedCustomer("");
    setCustomCustomerInput("");
    setSurchargeType("piece");
    setAmountStr("5");
    setSelectedCurrency(defaultWarehouseCurrency);
    setCustomerSearch("");
    setViewMode("form");
  };

  // Switch to Form Mode for editing an existing rule
  const handleEditRule = (sur: CustomerSurcharge) => {
    setEditingOriginalName(sur.customerName);
    setSelectedCustomer(sur.customerName);
    setCustomCustomerInput("");
    setSurchargeType(sur.type);
    setAmountStr(String(sur.amount));
    setSelectedCurrency(sur.currency || defaultWarehouseCurrency);
    setCustomerSearch("");
    setViewMode("form");
  };

  // Select customer from list in form mode
  const handleSelectCustomer = (name: string) => {
    setSelectedCustomer(name);
    setCustomCustomerInput("");
    if (surcharges[name]) {
      setSurchargeType(surcharges[name].type);
      setAmountStr(String(surcharges[name].amount));
      setSelectedCurrency(surcharges[name].currency || defaultWarehouseCurrency);
    } else {
      const custDefCur = getCustomerCurrency(name, customers).code || defaultWarehouseCurrency;
      setSelectedCurrency(custDefCur);
    }
  };

  const handleCurrencyChange = (newCur: string) => {
    if (newCur === selectedCurrency) return;
    const currentVal = parseFloat(amountStr);
    if (!isNaN(currentVal) && currentVal > 0) {
      const converted = convertCurrency(currentVal, selectedCurrency, newCur);
      setAmountStr(String(converted));
    }
    setSelectedCurrency(newCur);
  };

  // Handle Form Submit
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!effectiveCustomerName || isSubmitting) return;

    const parsedAmount = parseFloat(amountStr) || 0;
    setIsSubmitting(true);
    try {
      await onSaveSurcharge({
        customerName: effectiveCustomerName,
        originalCustomerName: editingOriginalName || undefined,
        type: surchargeType,
        amount: Math.max(0, parsedAmount),
        currency: selectedCurrency
      });
      // Return back to list view on success
      setViewMode("list");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Delete with Confirmation
  const handleDeleteRule = (customerName: string) => {
    if (deletingName) return;
    if (window.confirm(`确定要删除客户【${customerName}】的操作费规则吗？`)) {
      setDeletingName(customerName);
      try {
        onDeleteSurcharge(customerName);
      } finally {
        setDeletingName(null);
      }
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          if (isSubmitting) return; // Prevent closing while submitting
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-hidden p-0 gap-0 flex flex-col">
        {viewMode === "list" ? (
          // ==========================================
          // View 1: Surcharge Rules List View
          // ==========================================
          <>
            <DialogHeader className="p-4 sm:p-5 pr-12 sm:pr-14 border-b border-slate-100 bg-slate-50/50 shrink-0">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                    <Coins className="w-5 h-5" />
                  </div>
                  <div>
                    <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                      客户操作费设置列表
                      <Badge
                        variant="secondary"
                        className="h-4 px-1.5 text-[10px] font-mono bg-amber-100 text-amber-800 border-none"
                      >
                        已配置 {surchargeList.length} 家
                      </Badge>
                    </DialogTitle>
                    <p className="text-xs text-slate-500 mt-0.5">
                      为客户定制打包或操作费规则，对账时将自动叠加至客户最终应付款
                    </p>
                  </div>
                </div>

                <Button
                  type="button"
                  size="sm"
                  onClick={handleAddNewRule}
                  className="h-8 px-3 text-xs font-medium gap-1.5 cursor-pointer shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>新增操作费规则</span>
                </Button>
              </div>
            </DialogHeader>

            {/* List Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
              {/* Search Bar when items exist */}
              {surchargeList.length > 0 && (
                <div className="relative">
                  <Input
                    type="text"
                    placeholder="按客户名称快速搜索操作费规则..."
                    value={listSearch}
                    onChange={(e) => setListSearch(e.target.value)}
                    className="h-8 text-xs pl-8 pr-7 bg-white"
                  />
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  {listSearch && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setListSearch("")}
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 p-0 cursor-pointer"
                      title="清空搜索"
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              )}

              {/* Grid or Empty State */}
              {surchargeList.length === 0 ? (
                <div className="py-12 text-center bg-slate-50/40 rounded-xl border border-dashed border-slate-200">
                  <AlertCircle className="w-10 h-10 text-slate-300 mx-auto mb-2.5" />
                  <p className="text-sm font-semibold text-slate-600">暂未为任何客户设置专属操作费</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    默认最后应付款 = J&T 官方结算快递费用。如需加收操作费或打包费，请点击下方按钮配置。
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleAddNewRule}
                    className="mt-4 h-8 text-xs gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>立即添加客户操作费</span>
                  </Button>
                </div>
              ) : filteredSurchargeList.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 bg-slate-50/30 rounded-lg border border-slate-100">
                  未找到名称包含「{listSearch}」的客户规则
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredSurchargeList.map((sur) => {
                    const ruleCurInfo = sur.currency ? getCurrencyInfo(sur.currency) : getCustomerCurrency(sur.customerName, customers);
                    const isPiece = sur.type === "piece";

                    return (
                      <div
                        key={sur.customerName}
                        className="p-3 rounded-xl bg-slate-50/70 border border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/90 transition-all flex items-center justify-between gap-3 shadow-2xs"
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
                              className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                                isPiece
                                  ? "bg-blue-50 text-blue-700 border-blue-200"
                                  : "bg-purple-50 text-purple-700 border-purple-200"
                              }`}
                            >
                              {isPiece ? "按单件收费" : "固定打包费"}
                            </span>
                            <span className="text-slate-900 font-mono font-bold text-xs">
                              {ruleCurInfo.symbol}
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
                            onClick={() => handleEditRule(sur)}
                            className="h-7 w-7 text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded-lg cursor-pointer"
                            title="编辑该规则"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            disabled={deletingName === sur.customerName}
                            onClick={() => handleDeleteRule(sur.customerName)}
                            className="h-7 w-7 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                            title="删除该规则"
                          >
                            {deletingName === sur.customerName ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-500" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* List Footer */}
            <DialogFooter className="p-3 sm:p-4 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center sm:justify-between shrink-0">
              <span className="text-xs text-slate-400">
                共 {surchargeList.length} 条客户专属操作规则
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                className="h-8 text-xs cursor-pointer"
              >
                关闭
              </Button>
            </DialogFooter>
          </>
        ) : (
          // ==========================================
          // View 2: Add / Edit Surcharge Rule Form View
          // ==========================================
          <form onSubmit={handleSubmitForm} className="flex flex-col h-full overflow-hidden">
            <DialogHeader className="p-4 sm:p-5 pr-12 sm:pr-14 border-b border-slate-100 bg-slate-50/50 shrink-0">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                    <Coins className="w-5 h-5" />
                  </div>
                  <div>
                    <DialogTitle className="text-base font-bold text-slate-900">
                      {editingOriginalName
                        ? `编辑客户操作费规则：${editingOriginalName}`
                        : "新增客户操作费规则"}
                    </DialogTitle>
                    <p className="text-xs text-slate-500 mt-0.5">
                      为发货客户配置专属操作费（按件收费或固定月度打包费），对账时自动计入应收款
                    </p>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewMode("list")}
                  className="h-8 px-2.5 text-xs text-slate-600 hover:text-slate-900 gap-1 cursor-pointer shrink-0"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>返回列表</span>
                </Button>
              </div>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
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
                  {filteredFormCustomers.length > 0 ? (
                    filteredFormCustomers.map((cust) => {
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

                {effectiveCustomerName && (
                  <div className="text-xs text-slate-600 bg-slate-50 p-2 rounded border border-slate-100 flex items-center gap-2">
                    <span className="text-slate-400">当前已选:</span>
                    <strong className="text-brand-700 font-bold">{effectiveCustomerName}</strong>
                    <span className="text-[11px] text-slate-400 ml-auto font-mono">
                      操作费币种: {selectedCurrency} ({getCurrencyInfo(selectedCurrency).symbol})
                    </span>
                  </div>
                )}
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

              {/* Step 3: Surcharge Currency Selection */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700">
                    3. 操作费结算货币 <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[11px] text-slate-400">
                    切换货币自动按汇率换算金额
                  </span>
                </div>
                <Select value={selectedCurrency} onValueChange={handleCurrencyChange}>
                  <SelectTrigger className="h-9 text-xs bg-white border-slate-200 font-medium">
                    <SelectValue placeholder="选择结算货币" />
                  </SelectTrigger>
                  <SelectContent className="max-h-56">
                    {CURRENCY_OPTIONS.map((c) => (
                      <SelectItem key={c.code} value={c.code} className="text-xs cursor-pointer">
                        <span className="flex items-center gap-2">
                          <span>{c.flag}</span>
                          <span className="font-bold text-slate-800">{c.countryName}</span>
                          <span className="text-slate-400 font-mono">({c.code} - {c.symbol})</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Step 4: Amount */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  4. 加收金额 ({getCurrencyInfo(selectedCurrency).code}) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-xs">
                    {getCurrencyInfo(selectedCurrency).symbol}
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
                    {surchargeType === "piece" ? `${getCurrencyInfo(selectedCurrency).symbol} / 件` : `${getCurrencyInfo(selectedCurrency).symbol} / 月`}
                  </span>
                </div>
              </div>
            </div>

            <DialogFooter className="p-3 sm:p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-2 shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isSubmitting}
                onClick={() => setViewMode("list")}
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
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    保存中...
                  </span>
                ) : (
                  "保存规则"
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
