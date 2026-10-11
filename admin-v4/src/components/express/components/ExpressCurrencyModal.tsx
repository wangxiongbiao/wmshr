import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "../../ui/dialog";
import { Button } from "../../ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "../../ui/select";
import { CURRENCY_OPTIONS, getCurrencyInfo } from "../constants";
import { ArrowRightLeft, Check, Sparkles } from "lucide-react";

interface ExpressCurrencyModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCurrency: string;
  defaultCurrency: string;
  customerName?: string;
  onSaveCurrency: (newCurrency: string, customerName?: string) => void;
}

export function ExpressCurrencyModal({
  isOpen,
  onClose,
  currentCurrency,
  defaultCurrency,
  customerName,
  onSaveCurrency
}: ExpressCurrencyModalProps) {
  const [selectedCurrency, setSelectedCurrency] = useState<string>(
    currentCurrency || defaultCurrency || "THB"
  );

  // 每次打开弹窗时同步当前所选货币
  useEffect(() => {
    if (isOpen) {
      setSelectedCurrency(currentCurrency || defaultCurrency || "THB");
    }
  }, [isOpen, currentCurrency, defaultCurrency]);

  const handleConfirm = () => {
    onSaveCurrency(selectedCurrency, customerName);
    onClose();
  };

  const currentInfo = getCurrencyInfo(selectedCurrency);
  const defaultInfo = getCurrencyInfo(defaultCurrency);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md p-6">
        <DialogHeader className="space-y-1.5 pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-50 border border-brand-100 flex items-center justify-center text-brand-600">
              <ArrowRightLeft className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900">
                {customerName ? `转换结算货币 - ${customerName}` : "转换结算货币"}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 mt-0.5">
                {customerName
                  ? `为客户【${customerName}】设置结算货币（默认统一按仓库国家货币）`
                  : "默认统一转成当前仓库国家货币；亦可设置指定国家货币"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* 弹窗核心区域：默认就只有一个转换货币下拉框 */}
        <div className="py-4 space-y-3">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700">
                转换货币 <span className="text-rose-500">*</span>
              </label>
              {defaultCurrency && (
                <span className="text-[11px] text-slate-400">
                  当前仓库默认: {defaultInfo.flag} {defaultInfo.countryName} ({defaultInfo.code})
                </span>
              )}
            </div>

            <Select
              value={selectedCurrency}
              onValueChange={setSelectedCurrency}
            >
              <SelectTrigger className="w-full h-10 text-xs font-semibold bg-white border-slate-200">
                <SelectValue placeholder="请选择目标货币" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {CURRENCY_OPTIONS.map((opt) => {
                  const isWarehouseDefault = opt.code === defaultCurrency;
                  return (
                    <SelectItem
                      key={opt.code}
                      value={opt.code}
                      className="text-xs py-2 cursor-pointer font-medium"
                    >
                      <div className="flex items-center justify-between w-full gap-3">
                        <span className="flex items-center gap-2">
                          <span className="text-sm">{opt.flag}</span>
                          <span className="text-slate-800 font-bold">{opt.countryName}</span>
                          <span className="text-slate-400 font-mono">
                            ({opt.code} - {opt.symbol})
                          </span>
                        </span>
                        {isWarehouseDefault && (
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono font-medium">
                            仓库默认
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* 实时换算提示卡片 */}
          <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-brand-600 shrink-0" />
              <span>当前选定结算货币:</span>
            </span>
            <span className="font-bold text-brand-700 font-mono flex items-center gap-1">
              <span>{currentInfo.flag}</span>
              <span>{currentInfo.countryName}</span>
              <span className="text-slate-800">
                {currentInfo.code} ({currentInfo.symbol})
              </span>
            </span>
          </div>
        </div>

        <DialogFooter className="pt-2 border-t border-slate-100 gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="h-8 text-xs font-semibold border-slate-200 text-slate-600"
          >
            取消
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleConfirm}
            className="h-8 text-xs font-bold bg-brand-600 hover:bg-brand-700 text-white shadow-xs"
          >
            <Check className="w-3.5 h-3.5 mr-1" />
            确认转换
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
