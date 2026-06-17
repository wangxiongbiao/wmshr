import React, { useState, useMemo } from "react";
import { ExpenseRecord, Employee } from "../types";
import { 
  FileText, Plus, Search, Check, X, Eye, Edit, Trash2, CheckCircle, 
  AlertCircle, Calendar, Wallet, CreditCard, ChevronRight, User, 
  Info, Download, Image as ImageIcon, CheckCircle2, ShieldCheck, RefreshCcw,
  BadgeAlert, BadgeCheck, BadgeHelp, Upload, Settings
} from "lucide-react";

interface ExpenseManagerProps {
  employees: Employee[];
  addToast: (msg: string) => void;
}

// Preset receipt images to make creation extremely fun and visual
const RECEIPT_PRESETS = [
  { name: "仓储物流发票凭证", url: "https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?w=500&auto=format&fit=crop&q=60" },
  { name: "设备维修清算收据", url: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=500&auto=format&fit=crop&q=60" },
  { name: "企业公积服务明细", url: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=500&auto=format&fit=crop&q=60" },
  { name: "日常办公耗材账单", url: "https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=500&auto=format&fit=crop&q=60" }
];

const CURRENCIES = [
  { code: "CNY", symbol: "￥", rate: 1.0, label: "人民币 (CNY)" },
  { code: "USD", symbol: "$", rate: 7.24, label: "美元 (USD)" },
  { code: "MMK", symbol: "K", rate: 0.0034, label: "缅元 (MMK)" },
  { code: "THB", symbol: "฿", rate: 0.20, label: "泰铢 (THB)" },
  { code: "EUR", symbol: "€", rate: 7.82, label: "欧元 (EUR)" }
];

const formatExpenseAmount = (amount: number, currencyCode?: string) => {
  const code = currencyCode || "CNY";
  const found = CURRENCIES.find(c => c.code === code);
  const symbol = found ? found.symbol : "￥";
  return `${symbol}${amount.toLocaleString()}`;
};

// Initial mock records
const INITIAL_EXPENSES: ExpenseRecord[] = [
  {
    id: "exp-101",
    name: "2026年6月份仓库集中场地租金",
    type: "场地租金",
    paymentMethod: "银行转账",
    amount: 15500,
    receiptUrl: RECEIPT_PRESETS[0].url,
    receiptName: "2026-06_仓库场地租金发票.png",
    payerId: 1,
    payerName: "张领班",
    paymentTime: "2026-06-01",
    status: "approved",
    approvedBy: "吴总经理",
    approvedTime: "2026-06-02 10:15",
    approvalNote: "财务审核已对账，款项确认无误，予以准入报销。",
    note: "本季度第2个月租金，包含A/B区全部租赁面积和基础物业管理费。"
  },
  {
    id: "exp-102",
    name: "2026年5月份库房电费与排水排污规费",
    type: "水电动力费",
    paymentMethod: "微信支付",
    amount: 3240,
    receiptUrl: RECEIPT_PRESETS[1].url,
    receiptName: "WMS_5月库电水缴费清单.png",
    payerId: 5,
    payerName: "Phyo Lin Aung",
    paymentTime: "2026-06-04",
    status: "pending",
    note: "伴随夏季高温，库内多台大功率离心防潮抽风机长时间连轴运转，使5月公摊电费有明显增高。"
  },
  {
    id: "exp-103",
    name: "C区高位电动堆垛车液压油常规养护配件款",
    type: "设备维护费",
    paymentMethod: "支付宝",
    amount: 1200,
    receiptUrl: RECEIPT_PRESETS[2].url,
    receiptName: "液压液及润滑脂代购收支凭证.png",
    payerId: 6,
    payerName: "Zin Min Htet",
    paymentTime: "2026-05-28",
    status: "approved",
    approvedBy: "仓库管理员 · HR",
    approvedTime: "2026-05-29 16:40",
    approvalNote: "叉车班报备项，属于正常月度设备折旧保养性耗费，批准核销。",
    note: "购买了原装3号重载特质齿轮导轨防蚀油脂两桶，以及液压管路配套喉箍4枚。"
  },
  {
    id: "exp-104",
    name: "办公室打印纸、碳粉硒鼓及日常包装标签贴纸采购",
    type: "物耗杂费",
    paymentMethod: "企业信用卡",
    amount: 680,
    receiptUrl: RECEIPT_PRESETS[3].url,
    receiptName: "泰邦文具耗材收银总明细.jpg",
    payerId: 8,
    payerName: "Aang Myint Than",
    paymentTime: "2026-06-02",
    status: "rejected",
    approvedBy: "仓库管理员 (财务岗)",
    approvedTime: "2026-06-03 11:20",
    approvalNote: "包装区使用的封箱胶带与静电气泡塑料，应当走'大宗物资统一采办流程'，不应由个人小额代垫报销，故驳回，请转交总采购专员核办。",
    note: "包含A4打印纸 2箱，包装区域所缺的手撕急件彩色标贴共 30卷。"
  }
];

export function ExpenseManager({ employees, addToast }: ExpenseManagerProps) {
  // Expense lists persistent state
  const [expenses, setExpenses] = useState<ExpenseRecord[]>(() => {
    try {
      const saved = localStorage.getItem("wms_expense_records");
      return saved ? JSON.parse(saved) : INITIAL_EXPENSES;
    } catch {
      return INITIAL_EXPENSES;
    }
  });

  const saveExpenses = (newExpenses: ExpenseRecord[]) => {
    setExpenses(newExpenses);
    localStorage.setItem("wms_expense_records", JSON.stringify(newExpenses));
  };

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Interaction Modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isApproveOpen, setIsApproveOpen] = useState(false);
  
  const [editingExpense, setEditingExpense] = useState<ExpenseRecord | null>(null);
  const [activeExpense, setActiveExpense] = useState<ExpenseRecord | null>(null);

  // Form Field states
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
  
  // Designated approver state
  const [targetApproverId, setTargetApproverId] = useState<number>(-1);
  const [targetApproverName, setTargetApproverName] = useState("");

  // Approval Overlay state
  const [approveStatus, setApproveStatus] = useState<'approved' | 'rejected'>('approved');
  const [approvalNote, setApprovalNote] = useState("");
  const [actualApproverId, setActualApproverId] = useState<number>(-1);
  const [actualApproverName, setActualApproverName] = useState("");

  // Lightbox for image magnifying
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  // Expense Categories stateful management
  const [categories, setCategories] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("wms_expense_categories");
      return saved ? JSON.parse(saved) : ["场地租金", "水电动力费", "设备维护费", "物耗杂费", "办公差旅", "行政耗杂", "其他物流开支"];
    } catch {
      return ["场地租金", "水电动力费", "设备维护费", "物耗杂费", "办公差旅", "行政耗杂", "其他物流开支"];
    }
  });

  const saveCategories = (newCats: string[]) => {
    setCategories(newCats);
    localStorage.setItem("wms_expense_categories", JSON.stringify(newCats));
  };

  const CATEGORIES = categories;
  const METHODS = ["银行转账", "微信支付", "支付宝", "现金", "企业信用卡", "支票", "公对公网银"];

  // Configuration Modal states
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingCatIndex, setEditingCatIndex] = useState<number | null>(null);
  const [editingCatName, setEditingCatName] = useState("");

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCategoryName.trim();
    if (!trimmed) {
      addToast("请输入新费用类型名称");
      return;
    }
    if (categories.includes(trimmed)) {
      addToast("该费用类型已存在");
      return;
    }
    const updated = [...categories, trimmed];
    saveCategories(updated);
    setNewCategoryName("");
    addToast(`成功添加费用类型: ${trimmed}`);
  };

  const handleUpdateCategory = (index: number) => {
    const trimmed = editingCatName.trim();
    if (!trimmed) {
      addToast("费用类型名称不能为空");
      return;
    }
    const oldName = categories[index];
    if (oldName === trimmed) {
      setEditingCatIndex(null);
      return;
    }
    if (categories.some((c, idx) => c === trimmed && idx !== index)) {
      addToast("该费用类型名称已存在");
      return;
    }

    // Update categories list
    const updated = [...categories];
    updated[index] = trimmed;
    saveCategories(updated);

    // Sync current state & existing expense records types to maintain historical integrity
    const updatedExpenses = expenses.map(exp => {
      if (exp.type === oldName) {
        return { ...exp, type: trimmed };
      }
      return exp;
    });
    if (JSON.stringify(expenses) !== JSON.stringify(updatedExpenses)) {
      saveExpenses(updatedExpenses);
    }

    setEditingCatIndex(null);
    addToast(`费用类型 "${oldName}" 已成功重命名为 "${trimmed}" 并同步历史记录`);
  };

  const handleDeleteCategory = (index: number) => {
    if (categories.length <= 1) {
      addToast("系统必须保留至少一种费用类别");
      return;
    }

    const nameToDelete = categories[index];
    const recordsCount = expenses.filter(exp => exp.type === nameToDelete).length;

    const confirmMsg = recordsCount > 0 
      ? `此类别当前有 ${recordsCount} 笔核销记录，删除后这些记录的类型仍保留，但新记录将无法选择此类型。确定删除吗？`
      : `确定删除费用类型 "${nameToDelete}" 吗？`;

    if (window.confirm(confirmMsg)) {
      const updated = categories.filter((_, idx) => idx !== index);
      saveCategories(updated);
      addToast(`已成功删除费用类别: ${nameToDelete}`);
    }
  };

  // Open Form for New Expense creation
  const handleOpenCreate = () => {
    setEditingExpense(null);
    setExpenseName("");
    setExpenseType(CATEGORIES[0] || "");
    setPaymentMethod(METHODS[0]);
    setAmount(0);
    setCurrency("CNY");
    setReceiptUrl(RECEIPT_PRESETS[1].url); // Default mock receipt
    setReceiptName(RECEIPT_PRESETS[1].name + ".png");
    setPayerId(employees[0]?.id || -1);
    setPayerName(employees[0]?.name || "");
    setPaymentTime(new Date().toISOString().split('T')[0]);
    setNote("");
    setTargetApproverId(employees[0]?.id || -1);
    setTargetApproverName(employees[0]?.name || "");
    setIsFormOpen(true);
  };

  // Open Form for Editing existing expense
  const handleOpenEdit = (rec: ExpenseRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingExpense(rec);
    setExpenseName(rec.name);
    setExpenseType(rec.type);
    setPaymentMethod(rec.paymentMethod);
    setAmount(rec.amount);
    setCurrency(rec.currency || "CNY");
    setReceiptUrl(rec.receiptUrl || RECEIPT_PRESETS[1].url);
    setReceiptName(rec.receiptName || "receipt.png");
    setPayerId(rec.payerId || -1);
    setPayerName(rec.payerName || "");
    setPaymentTime(rec.paymentTime);
    setNote(rec.note || "");
    setTargetApproverId(rec.targetApproverId !== undefined ? rec.targetApproverId : -1);
    setTargetApproverName(rec.targetApproverName || "");
    setIsFormOpen(true);
  };

  // Open View Details
  const handleOpenDetail = (rec: ExpenseRecord) => {
    setActiveExpense(rec);
    setIsDetailOpen(true);
  };

  // Open Approval window
  const handleOpenApproval = (rec: ExpenseRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveExpense(rec);
    setApproveStatus('approved');
    setApprovalNote("");
    if (rec.targetApproverId !== undefined && rec.targetApproverId !== -1) {
      setActualApproverId(rec.targetApproverId);
      setActualApproverName(rec.targetApproverName || "");
    } else {
      setActualApproverId(employees[0]?.id || -1);
      setActualApproverName(employees[0]?.name || "");
    }
    setIsApproveOpen(true);
  };

  // Save Expense (Create or Edit)
  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseName.trim()) {
      addToast("请输入合规的费用核销名称");
      return;
    }
    if (amount <= 0) {
      addToast("费用核销金额必须大于 0 元");
      return;
    }

    const selectedEmp = employees.find(emp => emp.id === payerId);
    const finalPayerName = selectedEmp ? selectedEmp.name : payerName;

    const selectedApprover = employees.find(emp => emp.id === targetApproverId);
    const finalApproverName = selectedApprover ? selectedApprover.name : (targetApproverId === -1 ? "无指定 / 任意管理员" : targetApproverName);

    if (editingExpense) {
      // Edit
      const updated = expenses.map(item => {
        if (item.id === editingExpense.id) {
          return {
            ...item,
            name: expenseName,
            type: expenseType,
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
            targetApproverName: finalApproverName
          } as ExpenseRecord;
        }
        return item;
      });
      saveExpenses(updated);
      addToast("费用核销记录已更新成功");
    } else {
      // Create
      const newRec: ExpenseRecord = {
        id: `exp-${Date.now().toString().slice(-4)}`,
        name: expenseName,
        type: expenseType,
        paymentMethod,
        amount: Number(amount),
        currency,
        receiptUrl,
        receiptName,
        payerId,
        payerName: finalPayerName,
        paymentTime,
        status: 'pending', // Freshly submitted is pending
        note,
        targetApproverId,
        targetApproverName: finalApproverName
      };
      saveExpenses([newRec, ...expenses]);
      addToast("新费用核销单提交完成，已进入待审核队列");
    }
    setIsFormOpen(false);
  };

  // Save Approval Decision
  const handleSaveApproval = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeExpense) return;

    const selectedActualApprover = employees.find(emp => emp.id === actualApproverId);
    const finalActualApproverName = selectedActualApprover ? selectedActualApprover.name : (actualApproverName || "系统管理员");

    const updated = expenses.map(item => {
      if (item.id === activeExpense.id) {
        return {
          ...item,
          status: approveStatus,
          approvedBy: finalActualApproverName,
          approvedTime: new Date().toISOString().replace('T', ' ').slice(0, 16),
          approvalNote: approvalNote.trim() || (approveStatus === 'approved' ? "审核资料齐全，支出账实相符，准予核销。" : "由于发票不合规或流程越级，被审核人驳回。")
        } as ExpenseRecord;
      }
      return item;
    });

    saveExpenses(updated);
    addToast(approveStatus === 'approved' ? `费用核销审批「已批准」，经办人: ${finalActualApproverName}` : `费用核销审批「已驳回」，经办人: ${finalActualApproverName}`);
    setIsApproveOpen(false);
    if (isDetailOpen && activeExpense.id === activeExpense.id) {
      const updatedItem = updated.find(x => x.id === activeExpense.id);
      if (updatedItem) setActiveExpense(updatedItem);
    }
  };

  // Delete Expense
  const handleDeleteExpense = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("费用核销单删除后不可恢复，确定要删除此条记录吗？")) {
      const remaining = expenses.filter(item => item.id !== id);
      saveExpenses(remaining);
      addToast("费用核销记录已彻底移除");
      if (isDetailOpen && activeExpense?.id === id) {
        setIsDetailOpen(false);
      }
    }
  };

  // Statistics calculation
  const stats = useMemo(() => {
    let totalAmt = 0;
    let pendingAmt = 0;
    let approvedAmt = 0;
    let rejectCount = 0;
    let pendingCount = 0;

    expenses.forEach(item => {
      const rate = CURRENCIES.find(c => c.code === (item.currency || "CNY"))?.rate || 1.0;
      const amountInCNY = item.amount * rate;

      totalAmt += amountInCNY;
      if (item.status === 'pending') {
        pendingAmt += amountInCNY;
        pendingCount++;
      } else if (item.status === 'approved') {
        approvedAmt += amountInCNY;
      } else {
        rejectCount++;
      }
    });

    return { totalAmt, pendingAmt, approvedAmt, rejectCount, pendingCount };
  }, [expenses]);

  // Filtered list
  const filteredExpenses = useMemo(() => {
    return expenses.filter(item => {
      const matchesSearch = 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.payerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.id.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesType = typeFilter === "all" || item.type === typeFilter;
      const matchesMethod = methodFilter === "all" || item.paymentMethod === methodFilter;
      const matchesStatus = statusFilter === "all" || item.status === statusFilter;

      return matchesSearch && matchesType && matchesMethod && matchesStatus;
    });
  }, [expenses, searchQuery, typeFilter, methodFilter, statusFilter]);

  return (
    <div className="space-y-6">
      
      {/* 顶部指标统计 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-in fade-in duration-300">
        <div className="bg-white p-4.5 rounded-xl border border-slate-200/80 shadow-3xs flex items-center gap-4 hover:shadow-xs transition duration-200">
          <div className="w-11 h-11 rounded-lg bg-brand-50 flex items-center justify-center text-brand-650 flex-shrink-0">
            <Wallet className="w-5.5 h-5.5" />
          </div>
          <div>
            <p className="text-slate-500 font-bold text-[11px] tracking-wider uppercase">申报总费用明细 (等值)</p>
            <p className="text-xl font-extrabold text-slate-800 font-mono mt-0.5">
              ￥{Math.round(stats.totalAmt).toLocaleString()}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              共 {expenses.length} 笔 (汇率折算为人民币)
            </p>
          </div>
        </div>

        <div className="bg-white p-4.5 rounded-xl border border-amber-250 bg-amber-50/15 shadow-3xs flex items-center gap-4 hover:shadow-xs transition duration-200">
          <div className="w-11 h-11 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600 flex-shrink-0">
            <AlertCircle className="w-5.5 h-5.5" />
          </div>
          <div>
            <p className="text-amber-750 font-bold text-[11px] tracking-wider uppercase">待审核核销额 (等值)</p>
            <p className="text-xl font-extrabold text-amber-700 font-mono mt-0.5">
              ￥{Math.round(stats.pendingAmt).toLocaleString()}
            </p>
            <p className="text-[10px] text-amber-650 font-medium mt-0.5">
              {stats.pendingCount} 份报销申请审核中
            </p>
          </div>
        </div>

        <div className="bg-white p-4.5 rounded-xl border border-emerald-250 bg-emerald-50/10 shadow-3xs flex items-center gap-4 hover:shadow-xs transition duration-200">
          <div className="w-11 h-11 rounded-lg bg-emerald-55 flex items-center justify-center text-emerald-600 flex-shrink-0">
            <CheckCircle className="w-5.5 h-5.5" />
          </div>
          <div>
            <p className="text-emerald-750 font-bold text-[11px] tracking-wider uppercase">已批准记账金额 (等值)</p>
            <p className="text-xl font-extrabold text-emerald-700 font-mono mt-0.5">
              ￥{Math.round(stats.approvedAmt).toLocaleString()}
            </p>
            <p className="text-[10px] text-emerald-600 mt-0.5">
              本月实供记账对账凭核
            </p>
          </div>
        </div>

        <div className="bg-white p-4.5 rounded-xl border border-rose-200 bg-rose-50/10 shadow-3xs flex items-center gap-4 hover:shadow-xs transition duration-200">
          <div className="w-11 h-11 rounded-lg bg-rose-50 flex items-center justify-center text-rose-650 flex-shrink-0">
            <BadgeAlert className="w-5.5 h-5.5" />
          </div>
          <div>
            <p className="text-rose-750 font-bold text-[11px] tracking-wider uppercase">退回报销单数</p>
            <p className="text-xl font-extrabold text-rose-700 font-mono mt-0.5">
              {stats.rejectCount} <span className="text-xs text-rose-500 font-bold ml-0.5">份</span>
            </p>
            <p className="text-[10px] text-rose-500 mt-0.5">
              资料不全、大宗采购未通过
            </p>
          </div>
        </div>
      </div>

      {/* 条件过滤与操作主区 */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-3xs overflow-hidden">
        
        {/* 操作首栏：查询及新建 */}
        <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row gap-4 items-center justify-between bg-slate-50/40">
          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="检索费用名称、核销单号、支付人..."
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 bg-white transition font-medium"
              />
            </div>
            
            {/* 费用类型过滤 */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="text-xs font-semibold text-slate-650 bg-white border border-slate-200 rounded-lg px-3 py-2 cursor-pointer outline-none focus:border-brand-500 hover:bg-slate-50 transition"
            >
              <option value="all">📊 所有费用类型</option>
              {CATEGORIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            {/* 支付/支持方式过滤 */}
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="text-xs font-semibold text-slate-650 bg-white border border-slate-200 rounded-lg px-3 py-2 cursor-pointer outline-none focus:border-brand-500 hover:bg-slate-50 transition"
            >
              <option value="all">💳 所有支持方式</option>
              {METHODS.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>

            {/* 审批状态过滤 */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs font-semibold text-slate-650 bg-white border border-slate-200 rounded-lg px-3 py-2 cursor-pointer outline-none focus:border-brand-500 hover:bg-slate-50 transition"
            >
              <option value="all">🔍 所有审批状态</option>
              <option value="pending">⏳ 待审批</option>
              <option value="approved">✅ 已批准</option>
              <option value="rejected">❌ 已驳回</option>
            </select>
          </div>

          <div className="flex flex-wrap md:flex-nowrap items-center gap-2 w-full md:w-auto shrink-0">
            <button
              onClick={() => setIsConfigOpen(true)}
              id="btn-configure-expense-categories"
              type="button"
              className="w-full md:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 hover:text-brand-600 hover:border-brand-200 active:scale-95 text-xs font-bold rounded-lg cursor-pointer transition shadow-3xs"
            >
              <Settings className="w-3.5 h-3.5 text-slate-400" />
              <span>费用类型配置</span>
            </button>
            <button
              onClick={handleOpenCreate}
              id="btn-create-expense"
              className="w-full md:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 active:scale-95 text-white text-xs font-bold rounded-lg cursor-pointer transition shadow-xs hover:shadow-sm font-extrabold"
            >
              <Plus className="w-4 h-4" />
              <span>新建费用核销</span>
            </button>
          </div>
        </div>

        {/* 报销列表 */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-150 text-[10.5px] font-bold text-slate-450 uppercase tracking-wider select-none leading-none">
                <th className="px-5 py-3 w-28">费用单号</th>
                <th className="px-5 py-3">费用名称 / 类型</th>
                <th className="px-5 py-3 w-32">支付人</th>
                <th className="px-5 py-3 w-32">支付时间</th>
                <th className="px-5 py-3 w-36 text-center">报销支持方式</th>
                <th className="px-5 py-3 w-28 text-right">核销金额</th>
                <th className="px-5 py-3 w-24 text-center">报销状态</th>
                <th className="px-5 py-3 w-52 text-center">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 font-medium">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <FileText className="w-10 h-10 text-slate-300" />
                      <p>未检索到相符的费用核销记录</p>
                      {(searchQuery || typeFilter !== "all" || methodFilter !== "all" || statusFilter !== "all") && (
                        <button 
                          onClick={() => { setSearchQuery(""); setTypeFilter("all"); setMethodFilter("all"); setStatusFilter("all"); }} 
                          className="text-[11px] text-brand-600 font-bold hover:underline mt-1 flex items-center gap-1 cursor-pointer"
                        >
                          <RefreshCcw className="w-3 h-3" /> 重置所有搜索过滤
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((rec) => {
                  return (
                    <tr 
                      key={rec.id}
                      onClick={() => handleOpenDetail(rec)}
                      className="hover:bg-slate-50/50 transition cursor-pointer group"
                    >
                      {/* 费用单号 */}
                      <td className="px-5 py-4 w-28 font-mono text-[11px] font-bold text-slate-450">
                        {rec.id}
                      </td>

                      {/* 费用名称与类型 */}
                      <td className="px-5 py-4">
                        <div>
                          <div className="font-semibold text-slate-800 line-clamp-1 group-hover:text-brand-700 transition">
                            {rec.name}
                          </div>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="text-[9.5px] font-bold text-brand-700 bg-brand-50 px-1.5 py-0.5 rounded">
                              {rec.type}
                            </span>
                            {rec.receiptUrl && (
                              <span className="text-[9px] font-semibold text-slate-400 flex items-center gap-0.5" title="附带支付凭证发票明细">
                                <ImageIcon className="w-2.5 h-2.5" /> 有凭证
                              </span>
                            )}
                            {rec.targetApproverName && rec.targetApproverId !== -1 && (
                              <span className="text-[9.5px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded flex items-center gap-0.5" title={`指定审批主管：${rec.targetApproverName}`}>
                                <User className="w-2.5 h-2.5 text-indigo-500" /> 审批: {rec.targetApproverName}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 支付人 */}
                      <td className="px-5 py-4 text-slate-650 font-bold">
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-[10px]">
                            {rec.payerName?.slice(0, 1) || "P"}
                          </div>
                          <span className="truncate">{rec.payerName}</span>
                        </div>
                      </td>

                      {/* 支付时间 */}
                      <td className="px-5 py-4 font-mono text-[11px] text-slate-500">
                        {rec.paymentTime}
                      </td>

                      {/* 支持方式 */}
                      <td className="px-5 py-4 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[10.5px] font-extrabold text-slate-700 bg-slate-105 border border-slate-200 rounded-md">
                          <CreditCard className="w-3 h-3 text-slate-400" />
                          {rec.paymentMethod}
                        </span>
                      </td>

                      {/* 金额 */}
                      <td className="px-5 py-4 text-right font-mono text-[13px] font-extrabold text-slate-800">
                        {formatExpenseAmount(rec.amount, rec.currency)}
                      </td>

                      {/* 报销状态 */}
                      <td className="px-5 py-4 text-center">
                        {rec.status === 'pending' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded text-[10px] font-bold">
                            待审批
                          </span>
                        )}
                        {rec.status === 'approved' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-250 rounded text-[10px] font-bold">
                            已批准
                          </span>
                        )}
                        {rec.status === 'rejected' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded text-[10px] font-bold">
                            已驳回
                          </span>
                        )}
                      </td>

                      {/* 操作按钮组 */}
                      <td className="px-5 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-center items-center gap-1 w-full">
                          
                          <button
                            onClick={() => handleOpenDetail(rec)}
                            className="bg-slate-50 text-slate-700 hover:text-white hover:bg-slate-700 border border-slate-200 font-bold px-2.5 py-1 rounded-md text-[11px] transition duration-150 cursor-pointer flex items-center gap-1 active:scale-95"
                            title="查看完整明细与签章印记"
                          >
                            <Eye className="w-3 h-3" />
                            <span>查看</span>
                          </button>

                          <button
                            onClick={(e) => handleOpenEdit(rec, e)}
                            className="bg-slate-50 text-slate-650 hover:text-white hover:bg-brand-650 border border-slate-200 font-bold px-2.5 py-1 rounded-md text-[11px] transition duration-150 cursor-pointer flex items-center gap-1 active:scale-95"
                            title="编辑费用内容"
                          >
                            <Edit className="w-3 h-3" />
                            <span>编辑</span>
                          </button>

                          {rec.status === 'pending' && (
                            <button
                              onClick={(e) => handleOpenApproval(rec, e)}
                              className="bg-indigo-50 text-indigo-755 hover:text-white hover:bg-indigo-600 border border-indigo-150 font-bold px-2.5 py-1 rounded-md text-[11px] transition duration-150 cursor-pointer flex items-center gap-1 active:scale-95"
                              title="对本单执行批准或拒绝审核"
                            >
                              <ShieldCheck className="w-3 h-3" />
                              <span>审批</span>
                            </button>
                          )}

                          <button
                            onClick={(e) => handleDeleteExpense(rec.id, e)}
                            className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-1.5 rounded transition duration-150 cursor-pointer active:scale-90"
                            title="报销撤销删除"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* 1. 查看核销单明细弹窗 */}
      {isDetailOpen && activeExpense && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-250 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-slate-900 text-white px-6 py-4.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-slate-300" />
                <h3 className="font-bold text-[14px]">
                  费用报销单据详情 <span className="font-mono text-slate-400">({activeExpense.id})</span>
                </h3>
              </div>
              <button 
                onClick={() => setIsDetailOpen(false)}
                className="text-slate-450 hover:text-white text-xs px-2 py-1 rounded"
              >
                ✕ 关闭
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              {/* STATUS INDICATOR CARD */}
              <div className={`p-4 rounded-xl flex items-center justify-between border ${
                activeExpense.status === 'approved' ? 'bg-emerald-50/40 border-emerald-200 text-emerald-950' :
                activeExpense.status === 'rejected' ? 'bg-rose-50/40 border-rose-200 text-rose-955' :
                'bg-amber-50/30 border-amber-200 text-amber-900'
              }`}>
                <div className="flex items-center gap-3">
                  {activeExpense.status === 'approved' ? <BadgeCheck className="w-10 h-10 text-emerald-600" /> :
                   activeExpense.status === 'rejected' ? <BadgeAlert className="w-10 h-10 text-rose-600" /> :
                   <BadgeHelp className="w-10 h-10 text-amber-600" />}
                  <div>
                    <h4 className="font-bold text-xs uppercase tracking-wider">
                      审批状态: {activeExpense.status === 'approved' ? '已通过审查' : activeExpense.status === 'rejected' ? '已被驳回' : '财务部门待审批'}
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-1">
                      {activeExpense.status === 'approved' ? `经办审批人：${activeExpense.approvedBy || "WMS管理员"} (${activeExpense.approvedTime})` :
                       activeExpense.status === 'rejected' ? `经办理领班：${activeExpense.approvedBy || "WMS管理审核"} (${activeExpense.approvedTime})` :
                       "该项目正在排队等候财务主管审批。"}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-450 font-semibold block uppercase">核销净额值</span>
                  <span className="font-mono text-lg font-black text-slate-800">{formatExpenseAmount(activeExpense.amount, activeExpense.currency)}</span>
                </div>
              </div>

              {/* CORE FIELDS GRID */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 block mb-0.5">费用名称</span>
                  <p className="font-bold text-slate-800 text-xs">{activeExpense.name}</p>
                </div>
                <div>
                  <span className="text-slate-405 block mb-0.5">费用类型类别</span>
                  <p className="font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md inline-block">
                    {activeExpense.type}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">报销款额支付支持方式</span>
                  <p className="font-bold text-slate-750">{activeExpense.paymentMethod}</p>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">支付时间</span>
                  <p className="font-mono font-bold text-slate-750">{activeExpense.paymentTime}</p>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">报垫支付人 (Payer)</span>
                  <p className="font-bold text-slate-750">{activeExpense.payerName || "默认管理员"}</p>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">指定对账审批人</span>
                  <p className="font-bold text-brand-700">
                    {activeExpense.targetApproverName && activeExpense.targetApproverId !== -1 ? activeExpense.targetApproverName : "由任意管理层审批"}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">本单申报单号</span>
                  <p className="font-mono font-bold text-slate-450">{activeExpense.id}</p>
                </div>
                {activeExpense.status !== 'pending' && (
                  <div>
                    <span className="text-slate-400 block mb-0.5">实际裁核审批人</span>
                    <p className={`font-bold ${activeExpense.status === 'approved' ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {activeExpense.approvedBy || "系统管理员"}
                    </p>
                  </div>
                )}
              </div>

              {/* DESC AND APPROVAL COMMENT */}
              {activeExpense.note && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs leading-relaxed text-slate-600">
                  <b className="text-slate-800 block mb-1">明细备注说明：</b>
                  {activeExpense.note}
                </div>
              )}

              {activeExpense.approvalNote && (
                <div className={`p-3 border rounded-lg text-xs leading-relaxed ${
                  activeExpense.status === 'approved' ? 'bg-emerald-50/10 border-emerald-150 text-emerald-900' :
                  'bg-rose-50/10 border-rose-150 text-rose-900'
                }`}>
                  <b className="block mb-1">核销财务审批意见栏：</b>
                  <i>"{activeExpense.approvalNote}"</i>
                </div>
              )}

              {/* RECEIPT ATTACHMENT DISPLAY (READ-ONLY PREVIEW) */}
              {activeExpense.receiptUrl && (
                <div className="bg-slate-50 p-4.5 rounded-xl border border-slate-200">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-slate-600 flex items-center gap-1">
                      <ImageIcon className="w-3.5 h-3.5 text-brand-600" />
                      上传支付凭证凭照 (只读)
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 truncate max-w-[200px]" title={activeExpense.receiptName}>
                      {activeExpense.receiptName || "receipt.png"}
                    </span>
                  </div>
                  
                  <div className="relative group rounded-lg overflow-hidden border border-slate-200 bg-white aspect-[4/3] max-h-[180px] flex items-center justify-center">
                    <img
                      src={activeExpense.receiptUrl}
                      alt={activeExpense.receiptName}
                      className="w-full h-full object-cover group-hover:scale-102 transition duration-200"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition duration-150 flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => setPreviewImageUrl(activeExpense.receiptUrl || "")}
                        className="p-1 px-2 text-[10.5px] bg-white text-slate-805 rounded shadow-sm hover:bg-slate-100 transition cursor-pointer font-semibold flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3" />
                        <span>放大预览</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const link = document.createElement("a");
                          link.href = activeExpense.receiptUrl || "";
                          link.download = activeExpense.receiptName || `receipt_${activeExpense.id}.png`;
                          link.target = "_blank";
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                        }}
                        className="p-1 px-2 text-[10.5px] bg-brand-600 text-white rounded shadow-sm hover:bg-brand-700 transition cursor-pointer font-semibold flex items-center gap-1"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>下载凭证</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer buttons */}
            <div className="bg-slate-50 border-t border-slate-150 p-4 flex justify-between items-center flex-shrink-0">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={(e) => { setIsDetailOpen(false); handleOpenEdit(activeExpense, e); }}
                  className="px-4 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 hover:text-slate-800 text-slate-650 font-bold rounded-lg text-xs transition cursor-pointer flex items-center gap-1"
                >
                  <Edit className="w-3.5 h-3.5" />
                  修改凭证信息
                </button>
                {activeExpense.status === 'pending' && (
                  <button
                    type="button"
                    onClick={(e) => { handleOpenApproval(activeExpense, e); }}
                    className="px-4 py-1.5 bg-indigo-650 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs transition cursor-pointer flex items-center gap-1"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    去执行审批
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => setIsDetailOpen(false)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg text-xs transition cursor-pointer"
              >
                确定
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. 新建/编辑核销费用单弹窗 */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="bg-brand-600 text-white px-6 py-4.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet className="w-5.5 h-5.5 text-brand-100" />
                <h3 className="font-bold text-base">
                  {editingExpense ? `编辑费用核销单 (${editingExpense.id})` : "新建费用核销报销单"}
                </h3>
               </div>
               <button 
                 type="button"
                 onClick={() => setIsFormOpen(false)}
                 className="text-brand-200 hover:text-white text-sm px-3 py-1 bg-brand-700/50 hover:bg-brand-800/50 rounded-lg transition"
               >
                 ✕ 取消
               </button>
             </div>
 
             {/* Form */}
             <form onSubmit={handleSaveExpense} className="flex-1 overflow-y-auto bg-white flex flex-col">
               <div className="p-6 space-y-5 text-sm flex-1">
                 
                 {/* 费用名称 */}
                 <div>
                   <label className="block text-slate-550 font-bold mb-1.5 uppercase tracking-wide text-xs">费用核销名称 <span className="text-rose-500">*</span></label>
                   <input
                     type="text"
                     required
                     placeholder="请输入账单报销业务名称，如: 6月包装标签采购、A区空调养护等"
                     value={expenseName}
                     onChange={(e) => setExpenseName(e.target.value)}
                     className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition text-slate-850 font-semibold text-sm"
                   />
                 </div>
 
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                   {/* 费用类别 */}
                   <div>
                     <label className="block text-slate-550 font-bold mb-1.5 uppercase tracking-wide text-xs">费用类别 <span className="text-rose-500">*</span></label>
                     <select
                       value={expenseType}
                       onChange={(e) => setExpenseType(e.target.value)}
                       className="w-full px-4 py-2.5 border border-slate-200 bg-white rounded-xl outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition font-semibold text-slate-750 text-sm"
                     >
                       {CATEGORIES.map(c => (
                         <option key={c} value={c}>{c}</option>
                       ))}
                     </select>
                   </div>
 
                   {/* 支付及支持货币 */}
                   <div>
                     <label className="block text-slate-550 font-bold mb-1.5 uppercase tracking-wide text-xs font-bold text-brand-750">支付货币 (Currency) <span className="text-rose-500">*</span></label>
                     <select
                       value={currency}
                       onChange={(e) => setCurrency(e.target.value)}
                       className="w-full px-4 py-2.5 border border-slate-200 bg-white rounded-xl outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition font-bold text-brand-700 text-sm"
                     >
                       {CURRENCIES.map(c => (
                         <option key={c.code} value={c.code}>{c.label}</option>
                       ))}
                     </select>
                   </div>
 
                   {/* 核销金额 */}
                   <div>
                     <label className="block text-slate-550 font-bold mb-1.5 uppercase tracking-wide text-xs">支付金额 <span className="text-rose-500">*</span></label>
                     <div className="relative">
                       <span className="absolute left-4 top-2.5 text-slate-450 font-mono font-bold text-base select-none">
                         {CURRENCIES.find(c => c.code === currency)?.symbol || "￥"}
                       </span>
                       <input
                         type="number"
                         required
                         min={0.01}
                         step={0.01}
                         placeholder="0.00"
                         value={amount || ""}
                         onChange={(e) => setAmount(Number(e.target.value))}
                         className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition text-slate-850 font-mono font-bold text-sm text-center"
                       />
                     </div>
                   </div>
                 </div>
 
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                   {/* 支持方式 */}
                   <div>
                     <label className="block text-slate-550 font-bold mb-1.5 uppercase tracking-wide text-xs">支付(支持)方式 <span className="text-rose-500">*</span></label>
                     <select
                       value={paymentMethod}
                       onChange={(e) => setPaymentMethod(e.target.value)}
                       className="w-full px-4 py-2.5 border border-slate-200 bg-white rounded-xl outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition font-semibold text-slate-750 text-sm"
                     >
                       {METHODS.map(m => (
                         <option key={m} value={m}>{m}</option>
                       ))}
                     </select>
                   </div>
 
                   {/* 支付日期 */}
                   <div>
                     <label className="block text-slate-550 font-bold mb-1.5 uppercase tracking-wide text-xs">支付款项日期 <span className="text-rose-500">*</span></label>
                     <input
                       type="date"
                       required
                       value={paymentTime}
                       onChange={(e) => setPaymentTime(e.target.value)}
                       className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition text-slate-750 font-bold text-sm"
                     />
                   </div>
                 </div>
 
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                   {/* 经报支付人（员工匹配） */}
                   <div>
                     <label className="block text-slate-550 font-bold mb-1.5 uppercase tracking-wide text-xs">申报支付人 (员工) <span className="text-rose-500">*</span></label>
                     <select
                       value={payerId}
                       onChange={(e) => {
                         const id = Number(e.target.value);
                         setPayerId(id);
                         const emp = employees.find(e => e.id === id);
                         if (emp) setPayerName(emp.name);
                       }}
                       className="w-full px-4 py-2.5 border border-slate-200 bg-white rounded-xl outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition font-semibold text-slate-750 text-sm"
                     >
                       <option value={-1}>外部人员 / 临时手写指定...</option>
                       {employees.map(emp => (
                         <option key={emp.id} value={emp.id}>{emp.name}</option>
                       ))}
                     </select>
                   </div>
 
                   {/* 指定审核审批人 */}
                   <div>
                     <label className="block text-slate-550 font-bold mb-1.5 uppercase tracking-wide text-xs">指定审核审批人 <span className="text-rose-500">*</span></label>
                     <select
                       value={targetApproverId}
                       onChange={(e) => {
                         const id = Number(e.target.value);
                         setTargetApproverId(id);
                         const emp = employees.find(x => x.id === id);
                         if (emp) setTargetApproverName(emp.name);
                       }}
                       className="w-full px-4 py-2.5 border border-slate-200 bg-white rounded-xl outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition font-semibold text-slate-750 text-sm"
                     >
                       <option value={-1}>无指定 / 任意管理员审批</option>
                       {employees.map(emp => (
                         <option key={emp.id} value={emp.id}>{emp.name} ({emp.dept} - {emp.role})</option>
                       ))}
                     </select>
                   </div>
                 </div>
 
                 {/* 如果选择手写支付人 */}
                 {payerId === -1 && (
                   <div>
                     <label className="block text-slate-550 font-bold mb-1.5 uppercase tracking-wide text-xs">手写姓名支付人 <span className="text-rose-500">*</span></label>
                     <input
                       type="text"
                       required
                       placeholder="请输入手垫支出人姓名"
                       value={payerName}
                       onChange={(e) => setPayerName(e.target.value)}
                       className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition text-slate-850 font-semibold text-sm"
                     />
                   </div>
                 )}
 
                 {/* 备注 */}
                 <div>
                   <label className="block text-slate-550 font-bold mb-1.5 uppercase tracking-wide text-xs">申垫对账备注</label>
                   <textarea
                     rows={2}
                     placeholder="请写明报销原委、用途和报销对接网关明细..."
                     value={note}
                     onChange={(e) => setNote(e.target.value)}
                     className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition text-slate-755 text-sm font-semibold"
                   />
                 </div>
 
                 {/* 上传支付凭证 */}
                 <div className="bg-brand-50/20 border border-dashed border-brand-200 p-5 rounded-xl">
                   <span className="block text-xs font-extrabold text-brand-950 uppercase tracking-widest mb-3">
                     上传支付凭证发票收据
                   </span>
 
                   {/* 模拟拖拽上传区 */}
                   <div 
                     onClick={() => {
                       const randomPreset = RECEIPT_PRESETS[Math.floor(Math.random() * RECEIPT_PRESETS.length)];
                       setReceiptUrl(randomPreset.url);
                       setReceiptName(randomPreset.name + "_" + Math.floor(Math.random()*100) + ".jpg");
                       addToast("财务发票凭证导入成功");
                     }}
                     className="border border-dashed border-slate-300 bg-white hover:bg-brand-50/5 hover:border-brand-500 rounded-xl py-8 text-center transition cursor-pointer select-none"
                   >
                     <Upload className="w-9 h-9 text-brand-500 mx-auto" />
                     <p className="text-slate-700 font-bold text-xs mt-3">
                       拖拽多个收据电子单到这里，或 <span className="text-brand-600 hover:underline">点击选择并上传凭证文件</span>
                     </p>
                     <p className="text-slate-400 text-xs mt-1.5">支持 PNG, JPG, JPEG, WEBP 格式图片发票</p>
                   </div>
 
                   {/* 凭据缩略预览 */}
                   {receiptUrl && (
                     <div className="mt-4 flex items-center justify-between bg-white p-2.5 rounded-xl border border-slate-200">
                       <div className="flex items-center gap-3 max-w-[80%]">
                         <img 
                           src={receiptUrl} 
                           alt="voucher receipt preview" 
                           className="w-10 h-10 object-cover rounded-lg border shadow-3xs"
                           referrerPolicy="no-referrer"
                         />
                         <div className="truncate text-xs">
                           <p className="text-slate-700 font-extrabold truncate">{receiptName}</p>
                           <p className="text-slate-400 text-[11px] mt-0.5">已加载</p>
                         </div>
                       </div>
                       <button 
                         type="button"
                         onClick={() => { setReceiptUrl(""); setReceiptName(""); }}
                         className="p-1.5 hover:bg-slate-100 text-rose-500 rounded-lg flex items-center transition"
                         title="清出该凭证"
                       >
                         <X className="w-4 h-4" />
                       </button>
                     </div>
                    )}
                  </div>
                </div>

              {/* Action buttons */}
              <div className="bg-slate-50 border-t border-slate-150 p-4.5 flex justify-end gap-2.5 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-5 py-2 border border-slate-200 bg-white hover:bg-slate-100 font-extrabold rounded-lg text-slate-700 transition text-sm"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-brand-600 hover:bg-brand-700 active:scale-95 font-extrabold text-white rounded-lg transition text-sm"
                >
                  保存记录
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. 审批费用控制弹窗 */}
      {isApproveOpen && activeExpense && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[60] p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-brand-600 text-white px-6 py-4.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-brand-200 animate-pulse" />
                <h4 className="font-bold text-sm tracking-wide">WMS 费用核销综合审批核办</h4>
              </div>
              <button 
                type="button" 
                onClick={() => setIsApproveOpen(false)}
                className="text-brand-200 hover:text-white text-sm p-1 hover:bg-brand-700/50 rounded-lg transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveApproval} className="p-6 space-y-5 text-xs">
              {/* Brief Display */}
              <div className="bg-brand-50/30 border border-brand-100 p-4 rounded-xl select-none">
                <p className="text-[10px] text-brand-700 uppercase tracking-widest font-extrabold">待审报销本单</p>
                <b className="text-slate-850 text-sm line-clamp-2 mt-1 block font-extrabold">{activeExpense.name}</b>
                <div className="flex justify-between items-center mt-3 pt-3 border-t border-brand-100/60">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                    <span className="text-[11px] font-bold text-slate-650">申报支付人：{activeExpense.payerName}</span>
                  </div>
                  <span className="font-mono text-base font-black text-brand-700 bg-brand-50 border border-brand-200/50 px-2.5 py-0.5 rounded-lg select-all">
                    {formatExpenseAmount(activeExpense.amount, activeExpense.currency)}
                  </span>
                </div>
              </div>

              {/* YES / NO Radio Options */}
              <div>
                <label className="block text-slate-500 font-bold mb-1.5 uppercase tracking-wider text-[11px]">审批裁决意见款式 <span className="text-rose-500">*</span></label>
                <div className="grid grid-cols-2 gap-3.5">
                  <label className={`border rounded-lg p-2.5 flex items-center justify-center gap-1.5 cursor-pointer hover:bg-slate-50 transition ${
                    approveStatus === 'approved' ? 'border-emerald-500 bg-emerald-50/15 ring-2 ring-emerald-500/10 font-bold text-emerald-900' : 'border-slate-200 text-slate-650'
                  }`}>
                    <input 
                      type="radio" 
                      name="approve-status" 
                      className="accent-emerald-600 cursor-pointer hidden"
                      checked={approveStatus === 'approved'} 
                      onChange={() => setApproveStatus('approved')} 
                    />
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    <span>批准放款</span>
                  </label>

                  <label className={`border rounded-lg p-2.5 flex items-center justify-center gap-1.5 cursor-pointer hover:bg-slate-50 transition ${
                    approveStatus === 'rejected' ? 'border-rose-500 bg-rose-50/15 ring-2 ring-rose-500/10 font-bold text-rose-900' : 'border-slate-200 text-slate-655'
                  }`}>
                    <input 
                      type="radio" 
                      name="approve-status" 
                      className="accent-rose-600 cursor-pointer hidden"
                      checked={approveStatus === 'rejected'} 
                      onChange={() => setApproveStatus('rejected')} 
                    />
                    <X className="w-4 h-4 text-rose-600" />
                    <span>驳回退回</span>
                  </label>
                </div>
              </div>

              {/* Input for disapproval/approval note */}
              <div>
                <label className="block text-slate-500 font-bold mb-1.5 uppercase tracking-wider text-[11px]">审批意见 / 批示备注说明</label>
                <textarea
                  rows={2}
                  value={approvalNote}
                  onChange={(e) => setApprovalNote(e.target.value)}
                  placeholder={approveStatus === 'approved' ? "审核手续合规完备，账款相符，予以批准报销记账。" : "请在此说明驳回退回具体原委，例如：需提供大宗物资集中采购请购单，或发票联不清等。"}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition"
                />
              </div>

              {/* 经审批人 (锁定显示，不可更改) */}
              <div>
                <label className="block text-slate-500 font-bold mb-1.5 uppercase tracking-wider text-[11px]">本单批复经办审核人</label>
                <div className="w-full px-3.5 py-2.5 bg-brand-50/10 border border-brand-100 rounded-lg text-slate-700 font-semibold flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <User className="w-4 h-4 text-brand-600" />
                    {activeExpense.targetApproverName && activeExpense.targetApproverId !== -1 ? (
                      <span className="text-brand-950 font-bold text-[12px]">{activeExpense.targetApproverName}</span>
                    ) : (
                      <span className="text-slate-600 font-bold text-[12px]">默认系统管理员 (任意管理员审批)</span>
                    )}
                  </span>
                  <span className="text-[9.5px] bg-brand-600 text-white px-2.5 py-0.5 rounded font-extrabold uppercase select-none tracking-wider">
                    审批人已绑定
                  </span>
                </div>
                <p className="mt-1.5 text-[10px] text-slate-450 select-none">
                  * 审核人机制：已锁定为创建时指定的审批人，不可更换，确保流程溯源严肃一致。
                </p>
              </div>

              {/* Warning warning prompt */}
              <div className="text-[10px] text-slate-400 bg-slate-50 p-2.5 rounded-lg border border-slate-150 flex items-start gap-1.5 leading-normal">
                <Info className="w-3.5 h-3.5 text-slate-450 mt-0.5 flex-shrink-0" />
                <span>审批确认后将立刻记入对应核发账本列表，经由出纳或HR同步对账。</span>
              </div>

              {/* Footer row */}
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsApproveOpen(false)}
                  className="px-3 py-1.5 border border-slate-200 hover:text-slate-800 rounded-md font-bold transition"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className={`px-4.5 py-1.5 text-white font-bold rounded-md transition hover:scale-102 ${
                    approveStatus === 'approved' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  确定审批批示
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. 费用类型配置弹窗 */}
      {isConfigOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[60] p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-brand-600 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-brand-100" />
                <h3 className="font-bold text-sm tracking-wide">费用核销类型配置管理</h3>
              </div>
              <button 
                type="button" 
                onClick={() => {
                  setIsConfigOpen(false);
                  setEditingCatIndex(null);
                }}
                className="text-brand-200 hover:text-white text-sm p-1 hover:bg-brand-700/50 rounded-lg transition"
              >
                ✕
              </button>
            </div>

            {/* List and form */}
            <div className="p-6 flex-1 overflow-y-auto space-y-5">
              
              {/* Add category form */}
              <form onSubmit={handleAddCategory} className="bg-slate-50 border border-slate-200/60 rounded-xl p-4">
                <label className="block text-slate-600 font-extrabold mb-2 text-xs">新增费用核销类型</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="如：仓储代办、物化清退、加急配货费"
                    className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white text-xs font-semibold text-slate-800"
                  />
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-lg text-xs transition cursor-pointer flex items-center gap-1 shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>添加</span>
                  </button>
                </div>
              </form>

              {/* Category List */}
              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">当前可用类别 ({categories.length} 个)</span>
                  <span className="text-[10px] text-slate-400">修改文本以直接重命名</span>
                </div>
                <div className="border border-slate-150 rounded-xl overflow-hidden divide-y divide-slate-100 bg-white shadow-3xs max-h-[350px] overflow-y-auto select-none">
                  {categories.map((cat, idx) => {
                    const count = expenses.filter(exp => exp.type === cat).length;
                    const isEditing = editingCatIndex === idx;

                    return (
                      <div key={idx} className="flex items-center justify-between p-3 hover:bg-slate-50/50 transition">
                        <div className="flex-1 mr-3">
                          {isEditing ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={editingCatName}
                                onChange={(e) => setEditingCatName(e.target.value)}
                                className="flex-1 px-2.5 py-1.5 border border-brand-300 rounded-lg outline-none focus:ring-2 focus:ring-brand-500/10 text-xs font-bold text-slate-850"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleUpdateCategory(idx);
                                  if (e.key === 'Escape') setEditingCatIndex(null);
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => handleUpdateCategory(idx)}
                                className="p-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition"
                                title="保存"
                              >
                                <Check className="w-3.5 h-3.5 animate-in zoom-in-50" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingCatIndex(null)}
                                className="p-1.5 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded-lg transition"
                                title="取消"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div 
                              onClick={() => {
                                setEditingCatIndex(idx);
                                setEditingCatName(cat);
                              }}
                              className="font-bold text-xs text-slate-700 hover:text-brand-600 transition cursor-pointer flex items-center gap-1.5 group py-1"
                              title="点击进行编辑修改"
                            >
                              <span>{cat}</span>
                              <Edit className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                            {count} 笔记录
                          </span>
                          {!isEditing && (
                            <button
                              type="button"
                              onClick={() => handleDeleteCategory(idx)}
                              className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-500 rounded-lg transition cursor-pointer"
                              title="删除此类型"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="bg-slate-50 border-t border-slate-150 p-4 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setIsConfigOpen(false);
                  setEditingCatIndex(null);
                }}
                className="px-5 py-1.5 bg-slate-800 hover:bg-slate-900 font-extrabold text-white rounded-lg transition text-xs cursor-pointer shadow-3xs"
              >
                保存关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 图片放大查看灯箱 Modal */}
      {previewImageUrl && (
        <div 
          onClick={() => setPreviewImageUrl(null)}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-[100] cursor-zoom-out p-4 animate-in fade-in duration-200"
        >
          <div className="relative max-w-4xl max-h-[90vh] text-center">
            <img 
              src={previewImageUrl} 
              alt="receipt magnified lightbox" 
              className="max-w-full max-h-[85vh] rounded-lg shadow-2xl object-contain mx-auto border-3 border-white/20 select-none animate-in zoom-in-95 duration-200"
              referrerPolicy="no-referrer"
            />
            <p className="text-white text-xs font-medium tracking-wide mt-3 select-none text-slate-200 flex items-center justify-center gap-1">
              <span>单击任意位置</span>
              <span className="w-1 h-1 rounded-full bg-slate-400"></span>
              <span>或按下 Esc 退出大图查看</span>
            </p>
          </div>
        </div>
      )}

    </div>
  );
}
