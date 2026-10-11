import React, { useState, useEffect, useRef } from "react";
import { ExpenseRecord, Employee } from "../types";
import { CURRENCIES, METHODS } from "../constants";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { DatePicker } from "../../ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../../ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";
import { Wallet, Upload, X } from "lucide-react";
import { getNowDateStr } from "../../../lib/utils";

interface ExpenseFormModalProps {
  open: boolean;
  editingExpense: ExpenseRecord | null;
  employees: Employee[];
  categories: string[];
  onClose: () => void;
  onSave: (recordData: Partial<ExpenseRecord>) => void;
  addToast: (msg: string, kind?: "success" | "error" | "info") => void;
}

export function ExpenseFormModal({
  open,
  editingExpense,
  employees,
  categories,
  onClose,
  onSave,
  addToast
}: ExpenseFormModalProps) {
  const [expenseName, setExpenseName] = useState("");
  const [expenseType, setExpenseType] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("银行转账");
  const [amount, setAmount] = useState<number>(0);
  const [currency, setCurrency] = useState("CNY");
  const [receiptUrl, setReceiptUrl] = useState("");
  const [receiptName, setReceiptName] = useState("");
  const [payerId, setPayerId] = useState<number>(-1);
  const [payerName, setPayerName] = useState("");
  const [paymentTime, setPaymentTime] = useState("");
  const [note, setNote] = useState("");
  const [expensePurpose, setExpensePurpose] = useState<'advance' | 'payout' | 'income'>('payout');
  const [targetApproverId, setTargetApproverId] = useState<number>(-1);
  const [targetApproverName, setTargetApproverName] = useState("");

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      if (editingExpense) {
        setExpenseName(editingExpense.name);
        setExpenseType(editingExpense.type);
        setPaymentMethod(editingExpense.paymentMethod);
        setAmount(editingExpense.amount);
        setCurrency(editingExpense.currency || "CNY");
        setReceiptUrl(editingExpense.receiptUrl || "");
        setReceiptName(editingExpense.receiptName || "");
        setPayerId(editingExpense.payerId !== undefined ? editingExpense.payerId : -1);
        setPayerName(editingExpense.payerName || "");
        setPaymentTime(editingExpense.paymentTime);
        setNote(editingExpense.note || "");
        setTargetApproverId(editingExpense.targetApproverId !== undefined ? editingExpense.targetApproverId : -1);
        setTargetApproverName(editingExpense.targetApproverName || "");
        setExpensePurpose(editingExpense.purpose || "payout");
      } else {
        setExpenseName("");
        setExpenseType(categories[0] || "");
        setPaymentMethod(METHODS[0]);
        setAmount(0);
        setCurrency("CNY");
        setReceiptUrl("");
        setReceiptName("");
        setPayerId(employees[0]?.id || -1);
        setPayerName(employees[0]?.name || "");
        setPaymentTime(getNowDateStr());
        setNote("");
        setTargetApproverId(employees[0]?.id || -1);
        setTargetApproverName(employees[0]?.name || "");
        setExpensePurpose("payout");
      }
    }
  }, [open, editingExpense, categories, employees]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      addToast("请上传有效的图片文件 (PNG, JPG, WEBP)", "error");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      addToast("发票凭证图片不能超过 10MB", "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (base64) {
        setReceiptUrl(base64);
        setReceiptName(file.name);
        addToast(`发票凭证「${file.name}」已成功读取加载`, "success");
      }
    };
    reader.onerror = () => {
      addToast("读取图片文件失败，请重试", "error");
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseName.trim()) {
      addToast("请输入合规的费用核销名称", "error");
      return;
    }
    if (amount <= 0) {
      addToast("费用核销金额必须大于 0 元", "error");
      return;
    }

    const selectedEmp = employees.find(emp => emp.id === payerId);
    const finalPayerName = selectedEmp ? selectedEmp.name : payerName;

    const selectedApprover = employees.find(emp => emp.id === targetApproverId);
    const finalApproverName = selectedApprover ? selectedApprover.name : (targetApproverId === -1 ? "无指定 / 任意管理员" : targetApproverName);

    onSave({
      name: expenseName,
      type: expenseType || categories[0] || "其他",
      paymentMethod,
      amount: Number(amount),
      currency,
      receiptUrl,
      receiptName,
      payerId,
      payerName: finalPayerName,
      paymentTime,
      note,
      targetApproverId,
      targetApproverName: finalApproverName,
      purpose: expensePurpose
    });
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0 flex flex-col sm:rounded-2xl overflow-hidden [&>button]:text-white [&>button]:hover:text-white [&>button]:top-4 [&>button]:right-5">
        <DialogHeader className="bg-brand-600 text-white px-6 py-4 flex flex-row items-center justify-between space-y-0">
          <DialogTitle className="font-bold text-base text-white flex items-center gap-2">
            <Wallet className="w-5.5 h-5.5 text-brand-100" />
            <span>{editingExpense ? `编辑费用核销单 (${editingExpense.id})` : "新建费用核销报销单"}</span>
          </DialogTitle>
          <DialogDescription className="sr-only">填写费用报销单详情并保存</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto bg-white flex flex-col">
          <div className="p-6 space-y-5 text-sm flex-1">
            {/* 费用名称 */}
            <div>
              <Label className="block text-slate-550 font-medium mb-1.5 uppercase tracking-wide text-xs">费用核销名称 <span className="text-rose-500">*</span></Label>
              <Input
                type="text"
                required
                placeholder="请输入账单报销业务名称，如: 6月包装标签采购、A区空调养护等"
                value={expenseName}
                onChange={(e) => setExpenseName(e.target.value)}
                className="w-full text-slate-850 font-normal text-sm"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 费用用途 */}
              <div>
                <Label className="block text-slate-550 font-medium mb-1.5 uppercase tracking-wide text-xs text-brand-750">费用用途 <span className="text-rose-500">*</span></Label>
                <Select value={expensePurpose} onValueChange={(val) => setExpensePurpose(val as 'advance' | 'payout' | 'income')}>
                  <SelectTrigger className="w-full bg-white font-normal text-slate-750 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="payout">支出</SelectItem>
                    <SelectItem value="income">收入</SelectItem>
                    <SelectItem value="advance">预支</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 费用类别 */}
              <div>
                <Label className="block text-slate-550 font-medium mb-1.5 uppercase tracking-wide text-xs">费用类别 <span className="text-rose-500">*</span></Label>
                <Select value={expenseType || (categories[0] || "其他")} onValueChange={setExpenseType}>
                  <SelectTrigger className="w-full bg-white font-normal text-slate-750 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.filter(Boolean).map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 支付及支持货币 */}
              <div>
                <Label className="block text-slate-550 font-medium mb-1.5 uppercase tracking-wide text-xs text-brand-750">支付货币 (Currency) <span className="text-rose-500">*</span></Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger className="w-full bg-white font-normal text-brand-700 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map(c => (
                      <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 核销金额 */}
              <div>
                <Label className="block text-slate-550 font-medium mb-1.5 uppercase tracking-wide text-xs">支付金额 <span className="text-rose-500">*</span></Label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2 text-slate-450 font-mono font-medium text-base select-none z-10 pointer-events-none">
                    {CURRENCIES.find(c => c.code === currency)?.symbol || "￥"}
                  </span>
                  <Input
                    type="number"
                    required
                    min={0.01}
                    step={0.01}
                    placeholder="0.00"
                    value={amount || ""}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-full pl-9 pr-4 text-center font-mono font-bold text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* 支持方式 */}
              <div>
                <Label className="block text-slate-550 font-medium mb-1.5 uppercase tracking-wide text-xs">支付(支持)方式 <span className="text-rose-500">*</span></Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger className="w-full bg-white font-normal text-slate-750 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {METHODS.map(m => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 支付日期 */}
              <div>
                <Label className="block text-slate-550 font-medium mb-1.5 uppercase tracking-wide text-xs">支付款项日期 <span className="text-rose-500">*</span></Label>
                <DatePicker required value={paymentTime} onChange={(e) => setPaymentTime(e.target.value)} className="w-full text-slate-750 font-normal text-sm" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* 申报支付人 (员工) */}
              <div>
                <Label className="block text-slate-550 font-medium mb-1.5 uppercase tracking-wide text-xs">申报支付人 (员工) <span className="text-rose-500">*</span></Label>
                <Select
                  value={String(payerId)}
                  onValueChange={(val) => {
                    const id = Number(val);
                    setPayerId(id);
                    const emp = employees.find(e => e.id === id);
                    if (emp) setPayerName(emp.name);
                  }}
                >
                  <SelectTrigger className="w-full bg-white font-normal text-slate-750 text-sm">
                    <SelectValue placeholder="外部人员 / 临时手写指定..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="-1">外部人员 / 临时手写指定...</SelectItem>
                    {employees.map(emp => (
                      <SelectItem key={emp.id} value={String(emp.id)}>{emp.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 指定审核审批人 */}
              <div>
                <Label className="block text-slate-550 font-medium mb-1.5 uppercase tracking-wide text-xs">指定审核审批人 <span className="text-rose-500">*</span></Label>
                <Select
                  value={String(targetApproverId)}
                  onValueChange={(val) => {
                    const id = Number(val);
                    setTargetApproverId(id);
                    const emp = employees.find(x => x.id === id);
                    if (emp) setTargetApproverName(emp.name);
                  }}
                >
                  <SelectTrigger className="w-full bg-white font-normal text-slate-750 text-sm">
                    <SelectValue placeholder="无指定 / 任意管理员审批" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="-1">无指定 / 任意管理员审批</SelectItem>
                    {employees.map(emp => (
                      <SelectItem key={emp.id} value={String(emp.id)}>{emp.name} ({emp.dept} - {emp.role})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 如果选择手写支付人 */}
            {payerId === -1 && (
              <div>
                <Label className="block text-slate-550 font-medium mb-1.5 uppercase tracking-wide text-xs">手写姓名支付人 <span className="text-rose-500">*</span></Label>
                <Input
                  type="text"
                  required
                  placeholder="请输入手垫支出人姓名"
                  value={payerName}
                  onChange={(e) => setPayerName(e.target.value)}
                  className="w-full bg-white text-slate-850 font-normal text-sm"
                />
              </div>
            )}

            {/* 备注 */}
            <div>
              <Label className="block text-slate-550 font-medium mb-1.5 uppercase tracking-wide text-xs">申垫对账备注</Label>
              <textarea
                rows={2}
                placeholder="请写明报销原委、用途和报销对接网关明细..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition text-slate-755 text-sm font-normal"
              />
            </div>

            {/* 上传支付凭证 */}
            <div className="bg-brand-50/20 border border-dashed border-brand-200 p-5 rounded-xl">
              <span className="block text-xs font-medium text-brand-950 uppercase tracking-widest mb-3">
                上传支付凭证发票收据
              </span>

              {/* 真实原生文件选择器 */}
              <input 
                type="file" 
                ref={fileInputRef}
                accept="image/png,image/jpeg,image/jpg,image/webp" 
                className="hidden" 
                onChange={handleFileChange}
              />

              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border border-dashed border-slate-300 bg-white hover:bg-brand-50/5 hover:border-brand-500 rounded-xl py-8 text-center transition cursor-pointer select-none"
              >
                <Upload className="w-9 h-9 text-brand-500 mx-auto" />
                <p className="text-slate-700 font-medium text-xs mt-3">
                  点击选择并上传本地真实发票凭证，或 <span className="text-brand-600 hover:underline">浏览电脑文件</span>
                </p>
                <p className="text-slate-400 text-xs mt-1.5">支持 PNG, JPG, JPEG, WEBP 格式图片发票（最大 10MB）</p>
              </div>

              {receiptUrl && (
                <div className="mt-4 flex items-center justify-between bg-white p-2.5 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-3 max-w-[80%]">
                    <img 
                      src={receiptUrl} 
                      alt="voucher receipt preview" 
                      className="w-10 h-10 object-cover rounded-lg border shadow-3xs"
                    />
                    <div className="truncate text-xs">
                      <p className="text-slate-700 font-medium truncate">{receiptName}</p>
                      <p className="text-emerald-600 text-[11px] font-semibold mt-0.5">已成功加载真实发票数据</p>
                    </div>
                  </div>
                  <Button 
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => { 
                      setReceiptUrl(""); 
                      setReceiptName(""); 
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    className="h-7 w-7 text-rose-500 hover:bg-slate-100 p-0 cursor-pointer"
                    title="清出该凭证"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="bg-slate-50 border-t border-slate-200 p-4 flex flex-row justify-end gap-2.5 flex-shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="px-5 py-2 font-extrabold text-slate-700 text-sm"
            >
              取消
            </Button>
            <Button
              type="submit"
              variant="default"
              className="px-6 py-2 bg-brand-600 hover:bg-brand-700 active:scale-95 font-extrabold text-white text-sm"
            >
              保存记录
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
