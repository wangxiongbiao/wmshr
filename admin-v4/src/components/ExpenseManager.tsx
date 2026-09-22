import { DatePicker } from "./ui/date-picker";
import { Pagination } from "./Pagination";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Card } from "./ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "./ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Label } from "./ui/label";
import React, { useState, useMemo, useEffect, useRef } from "react";
import { TableHorizontalScroller } from "./TableHorizontalScroller";
import { useStickyMirrorHeader } from "../lib/useStickyMirrorHeader";
import { ExpenseRecord, Employee, AppConfig, AttendanceRecord, HolidayRecord } from "../types";
import { 
  FileText, Plus, Search, Check, X, Eye, Edit, Trash2, CheckCircle, 
  AlertCircle, Calendar, Wallet, CreditCard, ChevronRight, ChevronDown, User, 
  Info, Download, Image as ImageIcon, CheckCircle2, ShieldCheck, RefreshCcw,
  BadgeAlert, BadgeCheck, BadgeHelp, Upload, Settings, RotateCcw,
  FileCheck, FileX, Loader2, RefreshCw
} from "lucide-react";
import { calcAttendanceDetails, calcOvertimePay, formatCurrency, cn } from "../lib/utils";

interface ExpenseManagerProps {
  employees: Employee[];
  addToast: (msg: string, kind?: "success" | "error" | "info") => void;
  attendance?: AttendanceRecord[];
  config?: AppConfig;
  holidays?: HolidayRecord[];
  loading?: boolean;
  onRefresh?: () => Promise<void> | void;
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
    id: "wms1101",
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
    note: "本季度第2个月租金，包含A/B区全部租赁面积和基础物业管理费。",
    purpose: "payout"
  },
  {
    id: "wms1102",
    name: "临时备用金与叉车燃油/电池应急调度采购预支款",
    type: "水电动力费",
    paymentMethod: "微信支付",
    amount: 3240,
    receiptUrl: RECEIPT_PRESETS[1].url,
    receiptName: "WMS_5月库电水缴费清单.png",
    payerId: 5,
    payerName: "Phyo Lin Aung",
    paymentTime: "2026-06-04",
    status: "pending",
    note: "伴随夏季高温，库房紧急预支周转应急资金，用于后备电池及叉车油脂临时保障性采办。",
    purpose: "advance"
  },
  {
    id: "wms1103",
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
    note: "购买了原装3号重载特质齿轮导轨防蚀油脂两桶，以及液压管路配套喉箍4枚。",
    purpose: "payout"
  },
  {
    id: "wms1104",
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
    note: "包含A4打印纸 2箱，包装区域所缺的手撕急件彩色标贴共 30卷。",
    purpose: "payout"
  }
];

const generateUniqueWmsId = (existingExpenses: ExpenseRecord[]): string => {
  let attempts = 0;
  while (attempts < 100) {
    const id = `wms${Math.floor(1000 + Math.random() * 9000)}`;
    if (!existingExpenses.some(e => e.id === id)) {
      return id;
    }
    attempts++;
  }
  return `wms${Math.floor(1000 + Math.random() * 9000)}`;
};

export function ExpenseManager({ employees, addToast, attendance = [], config, holidays = [], loading = false, onRefresh }: ExpenseManagerProps) {
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

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const handleManualRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      if (onRefresh) await onRefresh();
      const savedExpenses = localStorage.getItem("wms_expense_records");
      if (savedExpenses) setExpenses(JSON.parse(savedExpenses));
      const savedPayouts = localStorage.getItem("payroll_payout_status");
      if (savedPayouts) setPayouts(JSON.parse(savedPayouts));
      const savedSigs = localStorage.getItem("payroll_employee_signatures");
      if (savedSigs) setSignatures(JSON.parse(savedSigs));
      addToast("费用与工资列表已同步刷新", "success");
    } catch (err: any) {
      addToast(err?.message || "刷新失败", "error");
    } finally {
      setIsRefreshing(false);
    }
  };

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [purposeFilter, setPurposeFilter] = useState("all");
    // Payroll sync: read payouts & signatures from localStorage
  const [payouts, setPayouts] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem("payroll_payout_status");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [signatures, setSignatures] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem("payroll_employee_signatures");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    const syncPayrollStorage = () => {
      try {
        const savedPayouts = localStorage.getItem("payroll_payout_status");
        if (savedPayouts) setPayouts(JSON.parse(savedPayouts));
        const savedSigs = localStorage.getItem("payroll_employee_signatures");
        if (savedSigs) setSignatures(JSON.parse(savedSigs));
      } catch (e) {
        console.error("Failed to sync payroll state in ExpenseManager", e);
      }
    };
    syncPayrollStorage();
    window.addEventListener("storage", syncPayrollStorage);
    window.addEventListener("focus", syncPayrollStorage);
    return () => {
      window.removeEventListener("storage", syncPayrollStorage);
      window.removeEventListener("focus", syncPayrollStorage);
    };
  }, []);

  // Helper to push SOP notification for payslip issuance
  const createPayslipNotification = (empId: number, monthStr: string, netAmount: number, curr: string, empName: string) => {
    try {
      const savedSops = localStorage.getItem("wms_sop_documents");
      let currentSops: any[] = [];
      if (savedSops) {
        try {
          currentSops = JSON.parse(savedSops);
        } catch (e) {}
      }

      const parts = monthStr.split("-");
      const monthNum = parts.length >= 2 ? parseInt(parts[1], 10) : 7;
      const title = `${monthNum}月电子工资条已生成`;
      const formattedAmt = formatCurrency(netAmount, (curr || "CNY") as any);
      
      const content = `尊敬的 <b>${empName}</b> (工号: ${empId})，您 <b>${monthStr}</b> 的电子薪资单已核准发放。本月应发净薪资为 <b>${formattedAmt}</b>。`;

      const dupId = `sop-payslip-${empId}-${monthStr}`;
      const filtered = currentSops.filter(s => s.id !== dupId);

      const newNotif: any = {
        id: dupId,
        title,
        content,
        images: [],
        attachments: [],
        targetType: "specific",
        targetEmployeeIds: [empId],
        createdAt: new Date().toISOString().replace("T", " ").slice(0, 16),
        creator: "财务薪资部 · Admin",
        status: "published",
        reads: {},
        category: "training",
        docType: "notification"
      };

      localStorage.setItem("wms_sop_documents", JSON.stringify([newNotif, ...filtered]));
      window.dispatchEvent(new Event("storage"));
    } catch (e) {
      console.error("Failed to create payslip notification", e);
    }
  };

  const createRecallNotification = (empId: number, monthStr: string, empName: string) => {
    try {
      const savedSops = localStorage.getItem("wms_sop_documents");
      let currentSops: any[] = [];
      if (savedSops) {
        try {
          currentSops = JSON.parse(savedSops);
        } catch (e) {}
      }

      const originalNotifId = `sop-payslip-${empId}-${monthStr}`;
      const recallNotifId = `sop-payslip-recall-${empId}-${monthStr}`;
      let filtered = currentSops.filter(s => s.id !== originalNotifId && s.id !== recallNotifId);

      const parts = monthStr.split("-");
      const monthNum = parts.length >= 2 ? parseInt(parts[1], 10) : 7;

      const recallNotif: any = {
        id: recallNotifId,
        title: `⚠️ ${monthNum}月电子工资条已被撤回`,
        content: `尊敬的 <b>${empName}</b> (工号: ${empId})，您 <b>${monthStr}</b> 的电子工资条已被财务部撤回重新核对。当前原工资条已失效，请您知悉。`,
        images: [],
        attachments: [],
        targetType: "specific",
        targetEmployeeIds: [empId],
        createdAt: new Date().toISOString().replace("T", " ").slice(0, 16),
        creator: "财务薪资部 · Admin",
        status: "published",
        reads: {},
        category: "training",
        docType: "notification"
      };

      localStorage.setItem("wms_sop_documents", JSON.stringify([recallNotif, ...filtered]));
      window.dispatchEvent(new Event("storage"));
    } catch (e) {
      console.error("Failed to create recall notification", e);
    }
  };

  const tableContainerRef = useRef<HTMLDivElement | null>(null);

  const [monthFilter, setMonthFilter] = useState(() => {
    const dates = attendance.map(r => r.date?.slice(0, 7)).filter(Boolean);
    const unique = [...new Set(dates)].sort().reverse();
    if (unique.length > 0) return unique[0];
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(() => {
    const d = new Date();
    return d.getFullYear();
  });
  const [selectedStat, setSelectedStat] = useState<string | null>(null);

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
  const [expensePurpose, setExpensePurpose] = useState<'advance' | 'payout' | 'income'>('payout');
  
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

  // Delete confirmation states
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<ExpenseRecord | null>(null);

  // Expense Categories stateful management
  const [categories, setCategories] = useState<string[]>(() => {
    const defaultCats = ["固定月薪", "计时工时", "固定日薪", "场地租金", "水电动力费", "设备维护费", "物耗杂费", "办公差旅", "行政耗杂", "其他物流开支"];
    try {
      const saved = localStorage.getItem("wms_expense_categories");
      if (saved) {
        const parsed = JSON.parse(saved);
        ["固定月薪", "计时工时", "固定日薪"].forEach(wc => {
          if (!parsed.includes(wc)) parsed.unshift(wc);
        });
        return parsed;
      }
      return defaultCats;
    } catch {
      return defaultCats;
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

  // Approval Flow Configuration states
  const [isApprovalFlowOpen, setIsApprovalFlowOpen] = useState(false);
  const [approvalFlowConfig, setApprovalFlowConfig] = useState(() => {
    try {
      const saved = localStorage.getItem("wms_approval_flow_config");
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      payout: {
        enabled: true,
        steps: ["提交申请", "部门主管审批", "财务专员审核", "完成"]
      },
      income: {
        enabled: false,
        steps: ["录入账目", "财务对账", "出纳确认"]
      }
    };
  });

  const saveApprovalFlowConfig = (newConfig: any) => {
    setApprovalFlowConfig(newConfig);
    localStorage.setItem("wms_approval_flow_config", JSON.stringify(newConfig));
  };

  const [newPayoutStepName, setNewPayoutStepName] = useState("");
  const [newIncomeStepName, setNewIncomeStepName] = useState("");
  const [editingStepType, setEditingStepType] = useState<'payout' | 'income' | null>(null);
  const [editingStepIndex, setEditingStepIndex] = useState<number | null>(null);
  const [editingStepValue, setEditingStepValue] = useState("");

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
    setExpensePurpose("payout");
    setIsFormOpen(true);
  };

  // Open Form for Editing existing expense
  const handleOpenEdit = (rec: ExpenseRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    if (rec.id.startsWith("salary-") || rec.salaryDetail) {
      handleOpenDetail(rec);
      addToast("工资条明细由考勤核算自动生成，已为您打开详情查阅", "info");
      return;
    }
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
    setExpensePurpose(rec.purpose || "payout");
    setIsFormOpen(true);
  };

  // Open View Details
  const handleOpenDetail = (rec: ExpenseRecord) => {
    setActiveExpense(rec);
    setIsDetailOpen(true);
  };

  // Open Approval window
  const handleOpenApproval = (rec: ExpenseRecord, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setActiveExpense(rec);
    setApproveStatus("approved");
    setApprovalNote("");
    if (rec.targetApproverId !== undefined && rec.targetApproverId !== -1) {
      setActualApproverId(rec.targetApproverId);
      setActualApproverName(rec.targetApproverName || "");
    } else {
      setActualApproverId(employees[0]?.id || -1);
      setActualApproverName(employees[0]?.name || "财务主管 · Admin");
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
            targetApproverName: finalApproverName,
            purpose: expensePurpose
          } as ExpenseRecord;
        }
        return item;
      });
      saveExpenses(updated);
      addToast("费用核销记录已更新成功");
    } else {
      // Create
      const newRec: ExpenseRecord = {
        id: generateUniqueWmsId(expenses),
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
        status: "pending", // Freshly submitted is pending
        note,
        targetApproverId,
        targetApproverName: finalApproverName,
        purpose: expensePurpose
      };
      saveExpenses([newRec, ...expenses]);
      addToast("新费用核销单提交完成，已进入待审核队列");
    }
    setIsFormOpen(false);
  };

  // Save Approval Decision (Synced with payroll_payout_status & SOP notification)
  const handleSaveApproval = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeExpense) return;

    const selectedActualApprover = employees.find(emp => emp.id === actualApproverId);
    const finalActualApproverName = selectedActualApprover ? selectedActualApprover.name : (actualApproverName || "财务主管 · Admin");
    const isSalary = activeExpense.id.startsWith("salary-") || !!activeExpense.salaryDetail;
    const isApproved = approveStatus === "approved";

    if (isSalary) {
      const empId = activeExpense.payerId || activeExpense.salaryDetail?.emp?.id;
      const targetMonth = activeExpense.salaryDetail?.month || (activeExpense.paymentTime ? activeExpense.paymentTime.slice(0, 7) : monthFilter);
      const key = `${empId}_${targetMonth}`;

      setPayouts(prev => {
        const next = { ...prev, [key]: isApproved };
        localStorage.setItem("payroll_payout_status", JSON.stringify(next));
        return next;
      });

      if (isApproved) {
        createPayslipNotification(
          empId,
          targetMonth,
          activeExpense.amount,
          activeExpense.currency || "CNY",
          activeExpense.salaryDetail?.emp?.name || activeExpense.payerName || ""
        );
        addToast(`工资条审批已批准发放，已向员工发送通知`, "success");
      } else {
        try {
          const savedSigs = localStorage.getItem("payroll_employee_signatures");
          if (savedSigs) {
            const sigs = JSON.parse(savedSigs);
            if (sigs[key]) {
              delete sigs[key];
              localStorage.setItem("payroll_employee_signatures", JSON.stringify(sigs));
            }
          }
        } catch (err) {}
        createRecallNotification(
          empId,
          targetMonth,
          activeExpense.salaryDetail?.emp?.name || activeExpense.payerName || ""
        );
        addToast(`工资条审批已驳回`, "info");
      }
      window.dispatchEvent(new Event("storage"));
    } else {
      const updated = expenses.map(item => {
        if (item.id === activeExpense.id) {
          return {
            ...item,
            status: approveStatus,
            approvedBy: finalActualApproverName,
            approvedTime: new Date().toISOString().replace("T", " ").slice(0, 16),
            approvalNote: approvalNote.trim() || (approveStatus === "approved" ? "审核资料齐全，支出账实相符，准予核销。" : "由于发票不合规或流程越级，被审核人驳回。")
          } as ExpenseRecord;
        }
        return item;
      });

      saveExpenses(updated);
      addToast(approveStatus === "approved" ? `费用核销审批「已批准」，经办人: ${finalActualApproverName}` : `费用核销审批「已驳回」，经办人: ${finalActualApproverName}`);
    }

    setIsApproveOpen(false);
    if (isDetailOpen && activeExpense) {
      setActiveExpense(prev => prev ? {
        ...prev,
        status: approveStatus,
        approvedBy: finalActualApproverName,
        approvedTime: new Date().toISOString().replace("T", " ").slice(0, 16),
        approvalNote: approvalNote.trim() || (approveStatus === "approved" ? "审核资料齐全，准予核销/发放。" : "单据已驳回。")
      } : null);
    }
  };

  // Quick action: Recall approval
  const handleRecallApproval = (rec: ExpenseRecord, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const isSalary = rec.id.startsWith("salary-") || !!rec.salaryDetail;

    if (isSalary) {
      const empId = rec.payerId || rec.salaryDetail?.emp?.id;
      const targetMonth = rec.salaryDetail?.month || (rec.paymentTime ? rec.paymentTime.slice(0, 7) : monthFilter);
      const key = `${empId}_${targetMonth}`;

      setPayouts(prev => {
        const next = { ...prev, [key]: false };
        localStorage.setItem("payroll_payout_status", JSON.stringify(next));
        return next;
      });

      try {
        const savedSigs = localStorage.getItem("payroll_employee_signatures");
        if (savedSigs) {
          const sigs = JSON.parse(savedSigs);
          if (sigs[key]) {
            delete sigs[key];
            localStorage.setItem("payroll_employee_signatures", JSON.stringify(sigs));
          }
        }
      } catch (err) {}

      createRecallNotification(
        empId,
        targetMonth,
        rec.salaryDetail?.emp?.name || rec.payerName || ""
      );
      window.dispatchEvent(new Event("storage"));
      addToast(`员工 ${rec.payerName || ""} 的工资发放状态已撤回为待审批`, "info");
    } else {
      const updated = expenses.map(item => {
        if (item.id === rec.id) {
          return {
            ...item,
            status: "pending" as const,
            approvedBy: undefined,
            approvedTime: undefined,
            approvalNote: "财务已撤回原审批，单据恢复待审核状态。"
          };
        }
        return item;
      });
      saveExpenses(updated);
      addToast(`报销单「${rec.name}」已撤回至待审批状态`);
    }

    if (isDetailOpen && activeExpense?.id === rec.id) {
      setActiveExpense(prev => prev ? {
        ...prev,
        status: "pending",
        approvedBy: undefined,
        approvedTime: undefined,
        approvalNote: undefined
      } : null);
    }
  };

  // Trigger custom delete modal opening
  const handleDeleteExpense = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const item = allExpenses.find(x => x.id === id);
    if (item) {
      if (item.id.startsWith("salary-") || item.salaryDetail) {
        addToast("员工考勤工资条由系统根据出勤自动计算，无法直接删除。如需撤回请执行审批驳回或撤回发放。", "info");
        return;
      }
      setExpenseToDelete(item);
      setIsDeleteConfirmOpen(true);
    }
  };

  // Confirm delete handler
  const confirmDeleteExpense = () => {
    if (!expenseToDelete) return;
    const remaining = expenses.filter(item => item.id !== expenseToDelete.id);
    saveExpenses(remaining);
    addToast(`报销单「${expenseToDelete.name}」已被彻底删除`);
    if (isDetailOpen && activeExpense?.id === expenseToDelete.id) {
      setIsDetailOpen(false);
    }
    setIsDeleteConfirmOpen(false);
    setExpenseToDelete(null);
  };

  // Extract unique months from attendance and expenses list
  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    attendance.forEach(rec => {
      if (rec.date && rec.date.length >= 7) {
        monthsSet.add(rec.date.slice(0, 7));
      }
    });
    expenses.forEach(item => {
      if (item.paymentTime && item.paymentTime.length >= 7) {
        monthsSet.add(item.paymentTime.slice(0, 7));
      }
    });
    const currentMonthStr = new Date().toISOString().slice(0, 7);
    monthsSet.add(currentMonthStr);
    return Array.from(monthsSet).sort((a, b) => b.localeCompare(a));
  }, [expenses, attendance]);

  // Dynamic salary records generated from employees & attendance
  const salaryRecords = useMemo(() => {
    if (!employees || employees.length === 0) return [];

    const monthsToCompute = monthFilter === "all" ? availableMonths.slice(0, 6) : [monthFilter];
    const records: ExpenseRecord[] = [];
    const taxRate = typeof config?.taxRate === "number" && !isNaN(config.taxRate) ? config.taxRate : 0.05;

    monthsToCompute.forEach(targetMonth => {
      if (!targetMonth || targetMonth === "all") return;
      const filteredAtt = attendance.filter(r => r.date && r.date.startsWith(targetMonth));

      employees.forEach(emp => {
        if (emp.joinDate && emp.joinDate.slice(0, 7) > targetMonth) return;
        const empAtt = filteredAtt.filter(r => r.empId === emp.id);
        if (emp.status === "resigned" && empAtt.length === 0) return;

        let valid = 0, ot = 0, otPay = 0, basePay = 0;
        let workingDays = 0;
        let otCount = 0;
        let mealAllowance = 0;

        empAtt.forEach(rec => {
          const d = calcAttendanceDetails(rec, config);
          valid += d.valid;
          ot += d.ot;
          otPay += calcOvertimePay(emp, rec.date, d.ot, config, holidays).amount;

          const isAbsentOrLeave = emp.status === "休假" || rec.type === "absent" || rec.type === "leave";
          if (!isAbsentOrLeave) {
            workingDays += 1;
            mealAllowance += Number(emp.mealAllowanceDaily || 0);

            const hasBaseWage = emp.baseMonthlyWage !== undefined && emp.baseMonthlyWage !== null && emp.baseMonthlyWage > 0;
            const hasDailyWage = emp.dailyWage !== undefined && emp.dailyWage !== null && emp.dailyWage > 0;
            if (hasBaseWage) {
              basePay += emp.baseMonthlyWage / 30;
            } else if (hasDailyWage) {
              basePay += (d.valid - d.ot) * (emp.dailyWage / (config?.standardHours || 8));
            } else {
              basePay += (d.valid - d.ot) * (emp.hourlyRate ?? 0);
            }
          }
        });

        const bonus = workingDays > 0 ? Number(emp.attendanceBonus || 0) : 0;
        const ssSec = workingDays > 0 ? Number(emp.socialSecurity || 0) : 0;
        const gross = Number(basePay || 0) + Number(otPay || 0) + bonus + Number(mealAllowance || 0);
        const tax = (Number(basePay || 0) + Number(otPay || 0) + bonus) * taxRate;
        const net = Math.max(0, gross - tax - ssSec);

        const payoutKey = `${emp.id}_${targetMonth}`;
        const isPaid = !!payouts[payoutKey];
        const sig = signatures[payoutKey];

        const salaryTypeLabel = emp.baseMonthlyWage && emp.baseMonthlyWage > 0
          ? "固定月薪"
          : (emp.dailyWage && emp.dailyWage > 0 ? "固定日薪" : "计时工时");

        const paymentMethod = emp.bankCardNumber ? "银行转账" : "现金";

        records.push({
          id: `salary-${emp.id}-${targetMonth}`,
          name: `${targetMonth} 员工 ${emp.name} 工资条`,
          type: salaryTypeLabel,
          paymentMethod,
          amount: Math.round(net),
          currency: emp.currency || config?.currency || "CNY",
          payerId: emp.id,
          payerName: `${emp.name} (${emp.employeeNo || emp.id})`,
          paymentTime: `${targetMonth}-28`,
          status: isPaid ? "approved" : "pending",
          approvedBy: isPaid ? "财务薪资部 · Admin" : undefined,
          approvedTime: isPaid ? `${targetMonth}-28 17:00` : undefined,
          approvalNote: isPaid ? "已核准薪资并发放电子工资单" : undefined,
          purpose: "payout",
          targetApproverName: "财务部主管",
          note: `出勤${workingDays}天，工时${valid.toFixed(1)}h(加班${ot.toFixed(1)}h)，基本工资${Math.round(basePay)}，加班费${Math.round(otPay)}，实发${Math.round(net)}`,
          receiptName: sig ? `员工电子签名_${emp.name}.png` : undefined,
          receiptUrl: sig || undefined,
          salaryDetail: {
            emp,
            valid,
            ot,
            basePay,
            otPay,
            mealAllowance,
            bonus,
            ssSec,
            tax,
            gross,
            net,
            workingDays,
            otCount,
            isPaid,
            month: targetMonth,
            signature: sig
          }
        });
      });
    });

    return records;
  }, [employees, attendance, config, holidays, monthFilter, availableMonths, payouts, signatures]);

  // Merged records list
  const allExpenses = useMemo(() => {
    const manualOnly = expenses.filter(e => !e.id.startsWith("salary-"));
    return [...salaryRecords, ...manualOnly];
  }, [salaryRecords, expenses]);

  const activeCurrency = useMemo(() => {
    const found = allExpenses.find(e => e.currency)?.currency;
    return found || config?.currency || "THB";
  }, [allExpenses, config]);

  // Statistics calculation matching activeCurrency unit
  const stats = useMemo(() => {
    let totalAmt = 0;
    let pendingAmt = 0;
    let approvedAmt = 0;
    let rejectCount = 0;
    let pendingCount = 0;
    let approvedCount = 0;

    const relevantExpenses = allExpenses.filter(item => {
      return monthFilter === "all" || (item.paymentTime && item.paymentTime.startsWith(monthFilter));
    });

    const targetRate = CURRENCIES.find(c => c.code === activeCurrency)?.rate || 1.0;

    relevantExpenses.forEach(item => {
      const itemCurrency = item.currency || activeCurrency;
      const itemRate = CURRENCIES.find(c => c.code === itemCurrency)?.rate || 1.0;
      const convertedAmt = itemCurrency === activeCurrency
        ? item.amount
        : (item.amount * itemRate) / targetRate;

      totalAmt += convertedAmt;
      if (item.status === "pending") {
        pendingAmt += convertedAmt;
        pendingCount++;
      } else if (item.status === "approved") {
        approvedAmt += convertedAmt;
        approvedCount++;
      } else {
        rejectCount++;
      }
    });

    return { 
      totalAmt, 
      pendingAmt, 
      approvedAmt, 
      rejectCount, 
      pendingCount,
      approvedCount,
      totalCount: relevantExpenses.length
    };
  }, [allExpenses, monthFilter, activeCurrency]);

    // Export current selected or current month payroll to CSV matching requested screenshot
  const handleExportSalaryCSV = () => {
    if (!config) {
      addToast("公司配置数据加载失败，无法导出工资汇总表");
      return;
    }
    const targetMonth = monthFilter === "all" ? new Date().toISOString().slice(0, 7) : monthFilter;

    // Filter attendance
    const filteredAttendance = attendance.filter(rec => rec.date && rec.date.startsWith(targetMonth));

    // Standard headers as requested in screenshot format
    const headers = [
      "Item", "ID Card", "Name", "Startwork", "position", "Salary", "Incentive", 
      "License fee", "Allowances", "OT", "Total Incomes", "SSF", "Tax", 
      "Other Expense", "Leave without Pay", "Total Expenses", "Net Income", "Bank Account"
    ];

    const formatDate = (dateStr?: string) => {
      if (!dateStr) return "";
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        return `${parseInt(parts[2], 10)}/${parseInt(parts[1], 10)}/${parts[0]}`;
      }
      return dateStr;
    };

    let totalSalary = 0;
    let totalIncentive = 0;
    let totalLicenseFee = 0;
    let totalAllowances = 0;
    let totalOT = 0;
    let totalIncomesAll = 0;
    let totalSSF = 0;
    let totalTax = 0;
    let totalOtherExpense = 0;
    let totalLeaveWithoutPay = 0;
    let totalExpensesAll = 0;
    let totalNetIncome = 0;

    const rows = employees.map((emp, idx) => {
      let valid = 0, ot = 0, otPay = 0, basePay = 0;
      let workingDays = 0;
      let mealAllowance = 0;

      filteredAttendance.filter(r => r.empId === emp.id).forEach(rec => {
        const d = calcAttendanceDetails(rec, config);
        valid += d.valid;
        ot += d.ot;
        otPay += calcOvertimePay(emp, rec.date, d.ot, config, holidays).amount;

        const isAbsentOrLeave = emp.status === '休假' || rec.type === 'absent' || rec.type === 'leave';
        if (!isAbsentOrLeave) {
          workingDays += 1;
          const getMealAllowanceVal = (e: Employee) => {
            return e.mealAllowanceDaily !== undefined && e.mealAllowanceDaily !== null ? e.mealAllowanceDaily : 0;
          };
          mealAllowance += getMealAllowanceVal(emp);

          const hasBaseWage = emp.baseMonthlyWage !== undefined && emp.baseMonthlyWage !== null && emp.baseMonthlyWage > 0;
          const hasDailyWage = emp.dailyWage !== undefined && emp.dailyWage !== null && emp.dailyWage > 0;
          if (hasBaseWage) {
            basePay += emp.baseMonthlyWage / 30;
          } else if (hasDailyWage) {
            basePay += (d.valid - d.ot) * (emp.dailyWage / config.standardHours);
          } else {
            basePay += (d.valid - d.ot) * (emp.hourlyRate ?? 0);
          }
        }
      });

      const incentiveVal = emp.attendanceBonus ?? 0;
      const licenseVal = 0;
      const allowancesVal = mealAllowance;
      const otVal = otPay;
      const totalIncomesVal = basePay + incentiveVal + licenseVal + allowancesVal + otVal;

      const ssfVal = Number(emp.socialSecurity || 0);
      const taxRate = typeof config?.taxRate === "number" && !isNaN(config.taxRate) ? config.taxRate : 0.05;
      const taxVal = (basePay + otVal + incentiveVal) * taxRate;
      
      const isDispatch = emp.sourceType === '劳务派遣';
      const commRate = isDispatch ? (emp.dispatchCommissionRate ?? 0) : 0;
      const otherExpenseVal = basePay * (commRate / 100);
      const leaveWithoutPayVal = 0;
      const totalExpensesVal = ssfVal + taxVal + otherExpenseVal + leaveWithoutPayVal;

      const netIncomeVal = totalIncomesVal - totalExpensesVal;

      // Add to running totals
      totalSalary += basePay;
      totalIncentive += incentiveVal;
      totalLicenseFee += licenseVal;
      totalAllowances += allowancesVal;
      totalOT += otVal;
      totalIncomesAll += totalIncomesVal;
      totalSSF += ssfVal;
      totalTax += taxVal;
      totalOtherExpense += otherExpenseVal;
      totalLeaveWithoutPay += leaveWithoutPayVal;
      totalExpensesAll += totalExpensesVal;
      totalNetIncome += netIncomeVal;

      return [
        idx + 1,
        `"${emp.idCard || ''}"`,
        `"${emp.name}"`,
        `"${formatDate(emp.joinDate)}"`,
        `"${emp.role}"`,
        basePay.toFixed(2),
        incentiveVal.toFixed(2),
        licenseVal.toFixed(2),
        allowancesVal.toFixed(2),
        otVal.toFixed(2),
        totalIncomesVal.toFixed(2),
        ssfVal.toFixed(2),
        taxVal.toFixed(2),
        otherExpenseVal.toFixed(2),
        leaveWithoutPayVal.toFixed(2),
        totalExpensesVal.toFixed(2),
        netIncomeVal.toFixed(2),
        `"${emp.bankCardNumber || ''}"`
      ];
    });

    const totalRow = [
      "Total",
      "",
      "",
      "",
      "",
      totalSalary.toFixed(2),
      totalIncentive.toFixed(2),
      totalLicenseFee.toFixed(2),
      totalAllowances.toFixed(2),
      totalOT.toFixed(2),
      totalIncomesAll.toFixed(2),
      totalSSF.toFixed(2),
      totalTax.toFixed(2),
      totalOtherExpense.toFixed(2),
      totalLeaveWithoutPay.toFixed(2),
      totalExpensesAll.toFixed(2),
      totalNetIncome.toFixed(2),
      ""
    ];

    // Build upper metadata rows
    const monthParts = targetMonth.split('-');
    const year = monthParts[0];
    const month = monthParts[1] || "01";
    const companyHeader = `( SHUOMAX Co. LTD. ),,,,,,,,,,,,,,,,,`;
    const reportHeader = `Payroll Summary Report of ( ${month}月${year}年 ),,,,,,,,,,,,,,,,,`;
    const dateHeader = `Value Date : ${month}/${year},,,,,,,,,,,,,,,,,`;
    const emptyHeader = `,,,,,,,,,,,,,,,,,`;
    const categoryHeader = `,,,,,Incomes,,,,,Expense,,`;

    const csvLines = [
      companyHeader,
      reportHeader,
      dateHeader,
      emptyHeader,
      categoryHeader,
      headers.join(","),
      ...rows.map(r => r.join(",")),
      totalRow.join(","),
      emptyHeader,
      `Approved by...............ZHANYINGLONG.........................,,,,,,,,,,,,,,,,,`,
      `Date.............${new Date().getDate()}/${new Date().getMonth() + 1}/${new Date().getFullYear()}.........................,,,,,,,,,,,,,,,,,`
    ];

    const csvContent = "\uFEFF" + csvLines.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Payroll_Summary_${targetMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast(`工资列表报表已成功导出 (${targetMonth})`);
  };

  // Filtered list
  const filteredExpenses = useMemo(() => {
    const list = allExpenses.filter(item => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q ||
        item.name.toLowerCase().includes(q) ||
        item.payerName?.toLowerCase().includes(q) ||
        item.id.toLowerCase().includes(q) ||
        item.type.toLowerCase().includes(q) ||
        (item.note && item.note.toLowerCase().includes(q)) ||
        (item.salaryDetail?.emp?.name && item.salaryDetail.emp.name.toLowerCase().includes(q)) ||
        (item.salaryDetail?.emp?.dept && item.salaryDetail.emp.dept.toLowerCase().includes(q)) ||
        (item.salaryDetail?.emp?.role && item.salaryDetail.emp.role.toLowerCase().includes(q)) ||
        (item.salaryDetail?.emp?.employeeNo && item.salaryDetail.emp.employeeNo.toLowerCase().includes(q));

      const matchesType = typeFilter === "all" || item.type === typeFilter;
      const matchesMethod = methodFilter === "all" || item.paymentMethod === methodFilter;
      const matchesStatus = statusFilter === "all" || item.status === statusFilter;
      const matchesPurpose = purposeFilter === "all" || item.purpose === purposeFilter;
      const matchesMonth = monthFilter === "all" || (item.paymentTime && item.paymentTime.startsWith(monthFilter));

      return matchesSearch && matchesType && matchesMethod && matchesStatus && matchesPurpose && matchesMonth;
    });

    // Sort by paymentTime descending (latest first)
    return [...list].sort((a, b) => {
      const timeA = a.paymentTime || "";
      const timeB = b.paymentTime || "";
      if (timeA !== timeB) {
        return timeB.localeCompare(timeA);
      }
      return b.id.localeCompare(a.id);
    });
  }, [allExpenses, searchQuery, typeFilter, methodFilter, statusFilter, purposeFilter, monthFilter]);

  // Sliced list for pagination
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, typeFilter, methodFilter, statusFilter, purposeFilter, monthFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredExpenses.length / pageSize));
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  const pagedExpenses = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredExpenses.slice(start, start + pageSize);
  }, [filteredExpenses, currentPage, pageSize]);

  const {
    mirrorHeaderRef,
    realTableRef,
    realTheadRef,
    tableHeadSentinelRef,
    actionBarRef,
    isMirrorHeaderVisible,
    colWidths,
    realTableWidth,
    handleTableScroll,
  } = useStickyMirrorHeader({
    tableContainerRef,
    deps: [filteredExpenses, currentPage, pageSize, loading, isRefreshing],
  });

  // Helpers to manage payout/income approval steps
  const handleAddStep = (type: 'payout' | 'income') => {
    const stepName = type === 'payout' ? newPayoutStepName.trim() : newIncomeStepName.trim();
    if (!stepName) {
      addToast("步骤名称不能为空");
      return;
    }
    const currentSteps = [...approvalFlowConfig[type].steps];
    if (currentSteps.includes(stepName)) {
      addToast("该审批步骤名称已存在");
      return;
    }
    
    // Insert step before the last step "完成" if "完成" is the last element
    let updatedSteps = [...currentSteps];
    const finishIndex = updatedSteps.indexOf("完成");
    if (finishIndex > -1) {
      updatedSteps.splice(finishIndex, 0, stepName);
    } else {
      updatedSteps.push(stepName);
    }

    const newConfig = {
      ...approvalFlowConfig,
      [type]: {
        ...approvalFlowConfig[type],
        steps: updatedSteps
      }
    };
    saveApprovalFlowConfig(newConfig);
    if (type === 'payout') setNewPayoutStepName("");
    else setNewIncomeStepName("");
    addToast(`已添加审批环节: ${stepName}`);
  };

  const handleDeleteStep = (type: 'payout' | 'income', index: number) => {
    const currentSteps = [...approvalFlowConfig[type].steps];
    if (currentSteps.length <= 1) {
      addToast("最少必须保留一个审批环节");
      return;
    }
    const removedName = currentSteps[index];
    currentSteps.splice(index, 1);
    const newConfig = {
      ...approvalFlowConfig,
      [type]: {
        ...approvalFlowConfig[type],
        steps: currentSteps
      }
    };
    saveApprovalFlowConfig(newConfig);
    addToast(`已删除环节: ${removedName}`);
  };

  const handleMoveStep = (type: 'payout' | 'income', index: number, direction: 'up' | 'down') => {
    const currentSteps = [...approvalFlowConfig[type].steps];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= currentSteps.length) return;
    
    // Swap steps
    const temp = currentSteps[index];
    currentSteps[index] = currentSteps[targetIndex];
    currentSteps[targetIndex] = temp;

    const newConfig = {
      ...approvalFlowConfig,
      [type]: {
        ...approvalFlowConfig[type],
        steps: currentSteps
      }
    };
    saveApprovalFlowConfig(newConfig);
  };

  const handleStartEditStep = (type: 'payout' | 'income', index: number, value: string) => {
    setEditingStepType(type);
    setEditingStepIndex(index);
    setEditingStepValue(value);
  };

  const handleSaveEditStep = () => {
    if (!editingStepType || editingStepIndex === null) return;
    const trimmed = editingStepValue.trim();
    if (!trimmed) {
      addToast("步骤名称不能为空");
      return;
    }
    const currentSteps = [...approvalFlowConfig[editingStepType].steps];
    currentSteps[editingStepIndex] = trimmed;
    
    const newConfig = {
      ...approvalFlowConfig,
      [editingStepType]: {
        ...approvalFlowConfig[editingStepType],
        steps: currentSteps
      }
    };
    saveApprovalFlowConfig(newConfig);
    setEditingStepType(null);
    setEditingStepIndex(null);
    setEditingStepValue("");
    addToast("审批环节重命名成功");
  };

  const handleToggleFlow = (type: 'payout' | 'income') => {
    const newConfig = {
      ...approvalFlowConfig,
      [type]: {
        ...approvalFlowConfig[type],
        enabled: !approvalFlowConfig[type].enabled
      }
    };
    saveApprovalFlowConfig(newConfig);
    addToast(`${type === 'payout' ? '支出' : '收入'}审批流程已${newConfig[type].enabled ? '开启' : '关闭'}`);
  };

  return (
    <div className="space-y-6">
      
      {/* 顶部指标统计 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in duration-300">
        <Card 
          onClick={() => { setStatusFilter("all"); setSelectedStat("all"); }}
          className={cn(
            "p-4.5 flex items-center gap-4 transition duration-200 cursor-pointer select-none",
            selectedStat === "all" 
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
          onClick={() => { setStatusFilter("pending"); setSelectedStat("pending"); }}
          className={cn(
            "p-4.5 flex items-center gap-4 transition duration-200 cursor-pointer select-none",
            selectedStat === "pending" 
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
          onClick={() => { setStatusFilter("approved"); setSelectedStat("approved"); }}
          className={cn(
            "p-4.5 flex items-center gap-4 transition duration-200 cursor-pointer select-none",
            selectedStat === "approved" 
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
          onClick={() => { setStatusFilter("rejected"); setSelectedStat("rejected"); }}
          className={cn(
            "p-4.5 flex items-center gap-4 transition duration-200 cursor-pointer select-none",
            selectedStat === "rejected" 
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

      {/* 条件过滤与操作主区 */}
      <Card className="bg-white rounded-xl border border-slate-200/80 shadow-3xs">
        
        {/* 操作主区：第一行 搜索查询与业务操作 */}
        <div className="p-4 px-5 border-b border-slate-100 flex flex-wrap gap-3 items-center justify-between bg-white">
          {/* 左侧：月份选择 + 关键字搜索框 */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5">
            {/* Custom Month Picker Dropdown */}
            <div className="relative shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsMonthPickerOpen(!isMonthPickerOpen)}
                className="h-9 px-3 gap-1.5 text-xs font-semibold text-slate-700 bg-white border-slate-200 hover:border-slate-300 shadow-2xs cursor-pointer"
              >
                <Calendar className="w-3.5 h-3.5 text-brand-500" />
                <span>
                  {monthFilter === "all" 
                    ? "全部月份" 
                    : `${monthFilter.split("-")[0]}年${monthFilter.split("-")[1]}月`
                  }
                </span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </Button>

              {isMonthPickerOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-10 cursor-default" 
                    onClick={() => setIsMonthPickerOpen(false)}
                  />
                  
                  <div className="absolute left-0 mt-1.5 w-60 bg-white border border-slate-200 rounded-xl shadow-xl p-3 z-20 animate-fade-in text-slate-800">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setPickerYear(prev => prev - 1)}
                        className="h-7 w-7 p-0 text-slate-500 hover:text-slate-800 font-bold text-xs cursor-pointer"
                      >
                        ◀
                      </Button>
                      <span className="text-xs font-black text-slate-700">
                        {pickerYear} 年
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setPickerYear(prev => prev + 1)}
                        className="h-7 w-7 p-0 text-slate-500 hover:text-slate-800 font-bold text-xs cursor-pointer"
                      >
                        ▶
                      </Button>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5 text-center">
                      {Array.from({ length: 12 }, (_, i) => {
                        const monthNum = i + 1;
                        const monthStr = String(monthNum).padStart(2, "0");
                        const targetVal = `${pickerYear}-${monthStr}`;
                        const isSelected = monthFilter === targetVal;
                        
                        return (
                          <Button
                            key={monthNum}
                            type="button"
                            variant={isSelected ? "default" : "ghost"}
                            size="sm"
                            onClick={() => {
                              setMonthFilter(targetVal);
                              setIsMonthPickerOpen(false);
                            }}
                            className={cn(
                              "h-8 py-2 text-xs font-semibold rounded-lg cursor-pointer",
                              isSelected 
                                ? "bg-brand-600 text-white font-extrabold shadow-xs"
                                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                            )}
                          >
                            {monthNum} 月
                          </Button>
                        );
                      })}
                    </div>

                    <div className="border-t border-slate-100 mt-2 pt-2 flex gap-1.5">
                      <Button
                        type="button"
                        variant={monthFilter === "all" ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          setMonthFilter("all");
                          setIsMonthPickerOpen(false);
                        }}
                        className={cn(
                          "flex-1 h-7 text-[11px] font-bold text-center cursor-pointer",
                          monthFilter === "all"
                            ? "bg-brand-600 text-white font-black"
                            : "bg-white text-slate-700 hover:bg-slate-50"
                        )}
                      >
                        全部月份
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const now = new Date();
                          const curr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
                          setPickerYear(now.getFullYear());
                          setMonthFilter(curr);
                          setIsMonthPickerOpen(false);
                        }}
                        className="flex-1 h-7 text-[11px] font-bold text-slate-600 bg-white hover:bg-slate-50 cursor-pointer"
                      >
                        回到本月
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* 搜索框 */}
            <div className="relative w-64 sm:w-72">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3 pointer-events-none z-10" />
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索员工姓名、工号、单号..."
                className="h-9 w-full pl-8.5 pr-8 text-xs bg-white font-medium border-slate-200 focus:border-brand-500"
              />
              {searchQuery && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-1 top-1 h-7 w-7 text-slate-400 hover:text-slate-600 p-0 cursor-pointer"
                  title="清空检索"
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </div>

          {/* 右侧：操作与配置功能按钮组 */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={handleManualRefresh}
              disabled={isRefreshing || loading}
              id="btn-refresh-expenses"
              type="button"
              variant="outline"
              size="sm"
              className="h-9 px-2.5 gap-1.5 bg-white hover:bg-slate-50 text-slate-700 border-slate-200 hover:text-brand-600 hover:border-brand-200 shadow-2xs text-xs font-semibold shrink-0 cursor-pointer"
              title="重新同步拉取最新员工与考勤数据"
            >
              <RefreshCw className={cn("w-3.5 h-3.5 text-slate-400", isRefreshing && "animate-spin text-brand-600")} />
              <span>刷新</span>
            </Button>
            <Button
              onClick={() => setIsApprovalFlowOpen(true)}
              id="btn-configure-approval-flow"
              type="button"
              variant="outline"
              size="sm"
              className="h-9 px-2.5 gap-1.5 bg-white hover:bg-slate-50 text-slate-700 border-slate-200 hover:text-brand-600 hover:border-brand-200 shadow-2xs text-xs font-semibold shrink-0 cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
              <span>流程配置</span>
            </Button>
            <Button
              onClick={() => setIsConfigOpen(true)}
              id="btn-configure-expense-categories"
              type="button"
              variant="outline"
              size="sm"
              className="h-9 px-2.5 gap-1.5 bg-white hover:bg-slate-50 text-slate-700 border-slate-200 hover:text-brand-600 hover:border-brand-200 shadow-2xs text-xs font-semibold shrink-0 cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5 text-slate-400" />
              <span>类型配置</span>
            </Button>
            <Button
              onClick={handleExportSalaryCSV}
              id="btn-export-payroll-csv"
              type="button"
              variant="outline"
              size="sm"
              className="h-9 px-3 gap-1.5 bg-white hover:bg-emerald-50 text-emerald-700 border-emerald-200 hover:border-emerald-300 shadow-2xs text-xs font-bold shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>导出工资表</span>
            </Button>
            <Button
              onClick={handleOpenCreate}
              id="btn-create-expense"
              type="button"
              variant="default"
              size="sm"
              className="h-9 px-3.5 gap-1.5 bg-brand-600 hover:bg-brand-700 active:scale-95 text-white text-xs font-bold shadow-xs hover:shadow-sm shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>新建报销单</span>
            </Button>
          </div>
        </div>

        {/* 操作主区：第二行 状态快捷Tab与筛选过滤条 */}
        <div className="sticky top-0 z-20 bg-slate-50/95 backdrop-blur-xs border-b border-slate-200/80 shadow-2xs">
          <div ref={actionBarRef} className="px-5 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* 状态快捷分段Tab */}
            <div className="inline-flex p-0.5 bg-slate-200/70 rounded-lg text-slate-600 text-xs font-semibold">
              {[
                { key: "all", label: "全部", count: stats.totalCount },
                { key: "pending", label: "待审批", count: stats.pendingCount, alert: stats.pendingCount > 0 },
                { key: "approved", label: "已批准", count: stats.approvedCount },
                { key: "rejected", label: "已驳回", count: stats.rejectCount },
              ].map(tab => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => {
                    setStatusFilter(tab.key);
                    setSelectedStat(tab.key);
                  }}
                  className={cn(
                    "px-2.5 py-1 rounded-md transition-all flex items-center gap-1.5 cursor-pointer text-xs",
                    statusFilter === tab.key
                      ? "bg-white text-brand-600 shadow-2xs font-bold"
                      : "text-slate-600 hover:text-slate-900"
                  )}
                >
                  <span>{tab.label}</span>
                  <span className={cn(
                    "px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold leading-tight",
                    statusFilter === tab.key 
                      ? (tab.alert ? "bg-amber-100 text-amber-800" : "bg-brand-50 text-brand-600")
                      : "bg-slate-200 text-slate-500"
                  )}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            <div className="h-4 w-px bg-slate-200 mx-0.5 shrink-0" />

            {/* 费用类型过滤 */}
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-8 text-xs font-medium text-slate-700 bg-white border-slate-200 w-auto min-w-[110px] shadow-2xs">
                <SelectValue placeholder="费用类型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部类型</SelectItem>
                {CATEGORIES.filter(Boolean).map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* 支付/支持方式过滤 */}
            <Select value={methodFilter} onValueChange={setMethodFilter}>
              <SelectTrigger className="h-8 text-xs font-medium text-slate-700 bg-white border-slate-200 w-auto min-w-[110px] shadow-2xs">
                <SelectValue placeholder="支付方式" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部方式</SelectItem>
                {METHODS.map(m => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* 费用用途过滤 */}
            <Select value={purposeFilter} onValueChange={setPurposeFilter}>
              <SelectTrigger className="h-8 text-xs font-medium text-slate-700 bg-white border-slate-200 w-auto min-w-[100px] shadow-2xs">
                <SelectValue placeholder="费用用途" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部用途</SelectItem>
                <SelectItem value="payout">支出</SelectItem>
                <SelectItem value="income">收入</SelectItem>
                <SelectItem value="advance">预支</SelectItem>
              </SelectContent>
            </Select>

            {/* 快速重置按钮 */}
            {(typeFilter !== "all" || methodFilter !== "all" || purposeFilter !== "all" || statusFilter !== "all" || searchQuery) && (
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setTypeFilter("all");
                  setMethodFilter("all");
                  setPurposeFilter("all");
                  setStatusFilter("all");
                  setSelectedStat(null);
                }}
                className="h-8 px-2 text-[11px] text-slate-500 hover:text-rose-600 font-bold gap-1 cursor-pointer"
                title="重置所有搜索和筛选条件"
              >
                <RotateCcw className="w-3 h-3" />
                <span>重置</span>
              </Button>
            )}
          </div>

          {/* 右侧：左右滑动表格按钮 */}
            <TableHorizontalScroller targetRef={tableContainerRef} alwaysShow={true} />
          </div>

          {/* 悬浮镜像表头 (Sticky Mirror Header - 方案二) */}
          {isMirrorHeaderVisible && (
            <div
              ref={mirrorHeaderRef}
              className="overflow-x-hidden border-t border-slate-200/80 bg-slate-50/95 backdrop-blur-xs shadow-xs transition-opacity duration-150"
            >
              <table
                style={{ width: realTableWidth ? `${realTableWidth}px` : "100%", minWidth: "1000px" }}
                className="text-left border-collapse table-fixed text-[13px]"
              >
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200/80 text-slate-600 font-bold text-xs uppercase tracking-wider select-none">
                    <th style={{ width: colWidths[0] ? `${colWidths[0]}px` : undefined }} className="px-4 py-3.5 w-28 whitespace-nowrap">支付时间</th>
                    <th style={{ width: colWidths[1] ? `${colWidths[1]}px` : undefined }} className="px-4 py-3.5 min-w-[240px]">费用名称</th>
                    <th style={{ width: colWidths[2] ? `${colWidths[2]}px` : undefined }} className="px-3 py-3.5 w-16 text-center whitespace-nowrap">用途</th>
                    <th style={{ width: colWidths[3] ? `${colWidths[3]}px` : undefined }} className="px-3 py-3.5 w-24 text-center whitespace-nowrap">类型</th>
                    <th style={{ width: colWidths[4] ? `${colWidths[4]}px` : undefined }} className="px-3 py-3.5 w-24 text-center whitespace-nowrap">支付方式</th>
                    <th style={{ width: colWidths[5] ? `${colWidths[5]}px` : undefined }} className="px-4 py-3.5 w-28 text-right whitespace-nowrap">支付金额</th>
                    <th style={{ width: colWidths[6] ? `${colWidths[6]}px` : undefined }} className="px-4 py-3.5 w-36 whitespace-nowrap">支付人</th>
                    <th style={{ width: colWidths[7] ? `${colWidths[7]}px` : undefined }} className="px-3 py-3.5 w-22 text-center whitespace-nowrap">状态</th>
                    <th style={{ width: colWidths[8] ? `${colWidths[8]}px` : undefined }} className="px-4 py-3.5 w-36 text-right whitespace-nowrap pr-5">操作</th>
                  </tr>
                </thead>
              </table>
            </div>
          )}
        </div>
        
        <div ref={tableHeadSentinelRef} className="h-0 w-full" />
        {/* 报销列表 */}
        <div ref={tableContainerRef} onScroll={handleTableScroll} className="overflow-x-auto relative rounded-b-xl">
          <table ref={realTableRef} className="w-full text-left border-collapse min-w-[1000px] text-[13px]">
            <thead ref={realTheadRef}>
              <tr className="bg-slate-50 border-b border-slate-200/80 text-slate-600 font-bold text-xs uppercase tracking-wider select-none">
                <th className="px-4 py-3.5 w-28 whitespace-nowrap">支付时间</th>
                <th className="px-4 py-3.5 min-w-[240px]">费用名称</th>
                <th className="px-3 py-3.5 w-16 text-center whitespace-nowrap">用途</th>
                <th className="px-3 py-3.5 w-24 text-center whitespace-nowrap">类型</th>
                <th className="px-3 py-3.5 w-24 text-center whitespace-nowrap">支付方式</th>
                <th className="px-4 py-3.5 w-28 text-right whitespace-nowrap">支付金额</th>
                <th className="px-4 py-3.5 w-36 whitespace-nowrap">支付人</th>
                <th className="px-3 py-3.5 w-22 text-center whitespace-nowrap">状态</th>
                <th className="px-4 py-3.5 w-36 text-right whitespace-nowrap pr-5">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-slate-400 font-medium">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
                      <p className="text-xs font-medium text-slate-500">正在同步费用与工资核销数据...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 font-medium">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <FileText className="w-10 h-10 text-slate-300" />
                      <p>未检索到相符的费用核销记录</p>
                      {(searchQuery || typeFilter !== "all" || methodFilter !== "all" || statusFilter !== "all" || purposeFilter !== "all" || monthFilter !== "all") && (
                        <Button 
                          variant="link"
                          size="sm"
                          onClick={() => { 
                            setSearchQuery(""); 
                            setTypeFilter("all"); 
                            setMethodFilter("all"); 
                            setStatusFilter("all"); 
                            setPurposeFilter("all"); 
                            setMonthFilter("all");
                            setSelectedStat(null);
                          }} 
                          className="text-[11px] text-brand-600 font-bold hover:underline mt-1 flex items-center gap-1 cursor-pointer h-auto p-0"
                        >
                          <RefreshCcw className="w-3 h-3" /> 重置所有搜索过滤
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                pagedExpenses.map((rec) => {
                  const hasReceipt = Boolean(rec.receiptUrl || (rec.receiptUrls && rec.receiptUrls.length > 0) || rec.receiptName);
                  return (
                    <tr 
                      key={rec.id}
                      onClick={() => handleOpenDetail(rec)}
                      className="hover:bg-slate-50/70 transition cursor-pointer group"
                    >
                      {/* 1. 支付时间 */}
                      <td className="px-4 py-3.5 font-mono text-xs text-slate-500 whitespace-nowrap">
                        {rec.paymentTime}
                      </td>

                      {/* 2. 费用名称与凭证 */}
                      <td className="px-4 py-3.5 min-w-[240px]">
                        <div className="flex flex-col gap-1">
                          <span className="font-semibold text-slate-800 group-hover:text-brand-600 transition leading-snug" title={rec.name}>
                            {rec.name}
                          </span>
                          <div className="flex items-center gap-2 flex-wrap select-none text-[11px]">
                            {hasReceipt ? (
                              <span
                                onClick={(e) => {
                                  if (rec.receiptUrl) {
                                    e.stopPropagation();
                                    setPreviewImageUrl(rec.receiptUrl);
                                  }
                                }}
                                className={cn(
                                  "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-emerald-700 bg-emerald-50 border border-emerald-200/80 font-medium",
                                  rec.receiptUrl && "cursor-pointer hover:bg-emerald-100"
                                )}
                                title={rec.receiptName || (rec.receiptUrl ? "点击查看凭证图片" : "已附凭证")}
                              >
                                <FileCheck className="w-3 h-3 text-emerald-600" /> 有凭证
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-0.5 text-slate-400 font-normal">
                                <FileX className="w-3 h-3 text-slate-400" /> 无凭证
                              </span>
                            )}
                            {rec.targetApproverName && rec.targetApproverId !== -1 && (
                              <span className="inline-flex items-center gap-1 text-slate-400 font-normal" title={`指定审批主管：${rec.targetApproverName}`}>
                                <User className="w-3 h-3 text-slate-400" /> {rec.targetApproverName}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 3. 费用用途 */}
                      <td className="px-3 py-3.5 w-16 text-center whitespace-nowrap">
                        {rec.purpose === 'advance' ? (
                          <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium text-purple-700 bg-purple-50 border border-purple-200">
                            预支
                          </span>
                        ) : rec.purpose === 'income' ? (
                          <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200">
                            收入
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium text-slate-600 bg-slate-100 border border-slate-200">
                            支出
                          </span>
                        )}
                      </td>

                      {/* 4. 费用类型 */}
                      <td className="px-3 py-3.5 w-24 text-center whitespace-nowrap">
                        <span className="inline-block px-2 py-0.5 rounded text-xs font-medium text-brand-700 bg-brand-50 border border-brand-200/60">
                          {rec.type}
                        </span>
                      </td>

                      {/* 5. 支付方式 */}
                      <td className="px-3 py-3.5 w-24 text-center whitespace-nowrap text-xs text-slate-600">
                        <span className="inline-flex items-center gap-1 font-medium">
                          <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                          <span>{rec.paymentMethod}</span>
                        </span>
                      </td>

                      {/* 6. 金额 */}
                      <td className="px-4 py-3.5 w-28 text-right font-mono text-[13.5px] font-bold text-slate-900 whitespace-nowrap">
                        {formatExpenseAmount(rec.amount, rec.currency)}
                      </td>

                      {/* 7. 支付人 */}
                      <td className="px-4 py-3.5 w-36 text-slate-600 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 max-w-[140px]">
                          <div className="w-5.5 h-5.5 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 text-[10px] font-bold select-none shrink-0">
                            {rec.payerName?.slice(0, 1) || "P"}
                          </div>
                          <span className="truncate text-xs font-medium text-slate-700" title={rec.payerName}>{rec.payerName}</span>
                        </div>
                      </td>

                      {/* 8. 报销状态 */}
                      <td className="px-3 py-3.5 w-22 text-center whitespace-nowrap">
                        {rec.status === 'pending' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            待审批
                          </span>
                        )}
                        {rec.status === 'approved' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            已批准
                          </span>
                        )}
                        {rec.status === 'rejected' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-xs font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                            已驳回
                          </span>
                        )}
                      </td>

                      {/* 9. 操作按钮组 */}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap pr-5" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end items-center gap-2.5 whitespace-nowrap text-xs font-semibold">
                          <button
                            type="button"
                            onClick={() => handleOpenDetail(rec)}
                            className="text-brand-600 hover:text-brand-800 cursor-pointer transition-colors"
                            title="查看完整明细"
                          >
                            查看
                          </button>

                          <button
                            type="button"
                            onClick={(e) => handleOpenEdit(rec, e)}
                            className="text-slate-600 hover:text-slate-900 cursor-pointer transition-colors"
                            title={rec.salaryDetail ? "查看工资条核算详情" : "编辑费用内容"}
                          >
                            {rec.salaryDetail ? "明细" : "编辑"}
                          </button>

                          {rec.status === 'pending' && (
                            <button
                              type="button"
                              onClick={(e) => handleOpenApproval(rec, e)}
                              className="text-indigo-600 hover:text-indigo-800 font-bold cursor-pointer transition-colors"
                              title="执行批准发放或驳回审核"
                            >
                              审批
                            </button>
                          )}

                          {rec.status === 'approved' && (
                            <button
                              type="button"
                              onClick={(e) => handleRecallApproval(rec, e)}
                              className="text-amber-600 hover:text-amber-800 flex items-center gap-0.5 cursor-pointer transition-colors font-medium"
                              title="撤回已发放/已审批状态"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>撤回</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={(e) => handleDeleteExpense(rec.id, e)}
                            className="text-slate-400 hover:text-rose-600 p-0.5 cursor-pointer transition-colors"
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

        {/* 分页组件 */}
        {filteredExpenses.length > 0 && (
          <div className="p-4 bg-slate-50 border-t border-slate-100">
            <Pagination
              page={currentPage}
              pageSize={pageSize}
              total={filteredExpenses.length}
              itemName="笔"
              pageSizeOptions={[10, 20, 50]}
              onPageChange={setCurrentPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setCurrentPage(1);
              }}
            />
          </div>
        )}
      </Card>

      {/* 1. 查看核销单明细弹窗 */}
      <Dialog open={isDetailOpen && !!activeExpense} onOpenChange={(open) => { if (!open) setIsDetailOpen(false); }}>
        {activeExpense && (
          <DialogContent className="max-w-2xl max-h-[90vh] p-0 flex flex-col sm:rounded-2xl overflow-hidden [&>button]:text-white [&>button]:hover:text-white [&>button]:top-4 [&>button]:right-5">
            {/* Header */}
            <DialogHeader className="bg-brand-600 text-white px-6 py-4 flex flex-row items-center justify-between space-y-0">
              <DialogTitle className="font-bold text-[14px] text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-brand-100" />
                <span>查看报销单</span>
              </DialogTitle>
              <DialogDescription className="sr-only">查看报销单核算明细与流程</DialogDescription>
            </DialogHeader>

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
                    {(activeExpense.status === 'approved' || activeExpense.status === 'rejected') && (
                      <p className="text-[11px] text-slate-500 mt-1">
                        {activeExpense.status === 'approved' ? `经办审批人：${activeExpense.approvedBy || "WMS管理员"} (${activeExpense.approvedTime})` :
                         `经办理领班：${activeExpense.approvedBy || "WMS管理审核"} (${activeExpense.approvedTime})`}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-mono text-lg font-black text-slate-800">{formatExpenseAmount(activeExpense.amount, activeExpense.currency)}</span>
                </div>
              </div>

              {/* VISUAL TIMELINE SECTION */}
              {(() => {
                const isIncome = activeExpense.purpose === 'income';
                const flowConfig = isIncome ? approvalFlowConfig.income : approvalFlowConfig.payout;
                const steps = flowConfig?.enabled ? flowConfig.steps : ["提交申请", "部门主管审批", "财务专员审核", "完成"];
                
                // Determine current status step index
                let currentStepIndex = 1; // Default to second step (主管审批) being active for pending
                if (activeExpense.status === 'approved') {
                  currentStepIndex = steps.length; // All steps completed
                } else if (activeExpense.status === 'recalled') {
                  currentStepIndex = 0; // Recalled at submission
                } else if (activeExpense.status === 'rejected') {
                  currentStepIndex = 1; // Rejected at approval stage
                }

                return (
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-3">
                    <div className="text-[11px] text-slate-500 font-extrabold uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b border-slate-200/40">
                      <span className="w-1.5 h-3 bg-brand-500 rounded-full"></span>
                      <span>审批流程进度</span>
                    </div>
                    <div className="relative pl-4 border-l border-slate-200 space-y-4 ml-1">
                      {steps.map((step, sIdx) => {
                        // Determine step state
                        let stepState: 'completed' | 'active' | 'rejected' | 'recalled' | 'waiting' = 'waiting';
                        
                        if (activeExpense.status === 'approved') {
                          stepState = 'completed';
                        } else if (activeExpense.status === 'recalled') {
                          if (sIdx === 0) stepState = 'recalled';
                          else stepState = 'waiting';
                        } else if (activeExpense.status === 'rejected') {
                          if (sIdx < 1) stepState = 'completed';
                          else if (sIdx === 1) stepState = 'rejected';
                          else stepState = 'waiting';
                        } else { // pending
                          if (sIdx < currentStepIndex) stepState = 'completed';
                          else if (sIdx === currentStepIndex) stepState = 'active';
                          else stepState = 'waiting';
                        }

                        return (
                          <div key={sIdx} className="relative">
                            {/* Step Node Marker Indicator */}
                            <div className={`absolute -left-[22.5px] top-0.5 w-3 h-3 rounded-full flex items-center justify-center border bg-white z-10
                              ${stepState === 'completed' ? 'border-emerald-500 bg-emerald-500 text-white' : ''}
                              ${stepState === 'active' ? 'border-amber-500 bg-white' : ''}
                              ${stepState === 'rejected' ? 'border-rose-500 bg-rose-500 text-white' : ''}
                              ${stepState === 'recalled' ? 'border-slate-400 bg-slate-400 text-white' : ''}
                              ${stepState === 'waiting' ? 'border-slate-200 bg-white' : ''}
                            `}>
                              {stepState === 'completed' && <span className="block w-1 h-1 bg-white rounded-full"></span>}
                              {stepState === 'active' && <span className="block w-1.5 h-1.5 bg-amber-500 rounded-full animate-ping"></span>}
                              {stepState === 'rejected' && <span className="text-[7px] font-black leading-none">×</span>}
                              {stepState === 'recalled' && <span className="text-[7px] font-black leading-none">↩</span>}
                              {stepState === 'waiting' && <span className="block w-1 h-1 bg-slate-200 rounded-full"></span>}
                            </div>

                            {/* Step Info Content */}
                            <div className="flex flex-col gap-0.5 text-xs">
                              <div className="flex justify-between items-center gap-2">
                                <span className={`font-bold text-[11.5px]
                                  ${stepState === 'completed' ? 'text-emerald-700 font-extrabold' : ''}
                                  ${stepState === 'active' ? 'text-amber-700 font-extrabold' : ''}
                                  ${stepState === 'rejected' ? 'text-rose-700 font-extrabold' : ''}
                                  ${stepState === 'recalled' ? 'text-slate-500' : ''}
                                  ${stepState === 'waiting' ? 'text-slate-400 font-medium' : ''}
                                `}>
                                  {step}
                                </span>
                                
                                {/* Timestamp or Actor */}
                                {sIdx === 0 && (
                                  <span className="text-[10px] text-slate-400 font-mono font-medium">
                                    {activeExpense.paymentTime}
                                  </span>
                                )}
                                {sIdx === steps.length - 1 && activeExpense.status === 'approved' && (
                                  <span className="text-[10px] text-slate-400 font-mono font-medium">
                                    {activeExpense.approvedTime || activeExpense.paymentTime}
                                  </span>
                                )}
                              </div>

                              {/* Explanatory subtexts */}
                              {stepState === 'active' && (
                                <p className="text-[10px] text-amber-600 font-semibold leading-relaxed">
                                  正在等待 {activeExpense.targetApproverName || "部门主管或财务主管"} 进行审核评估...
                                </p>
                              )}
                              {stepState === 'rejected' && (
                                <div className="bg-rose-50/50 p-2 border border-rose-100 rounded-lg mt-1 space-y-0.5">
                                  <p className="text-[10px] text-rose-700 font-bold">审批驳回意见</p>
                                  <p className="text-[10px] text-rose-650 font-semibold">
                                    审批人：{activeExpense.approvedBy || "系统管理员"}
                                  </p>
                                  <p className="text-[10px] text-rose-500 italic leading-relaxed">
                                    “{activeExpense.approvalNote || "由于发票不合规或流程越级，被审核人驳回。"}”
                                  </p>
                                </div>
                              )}
                              {stepState === 'completed' && sIdx === steps.length - 1 && (
                                <div className="bg-emerald-50/50 p-2 border border-emerald-100 rounded-lg mt-1 space-y-0.5">
                                  <p className="text-[10px] text-emerald-700 font-bold">审批通过意见</p>
                                  <p className="text-[10px] text-emerald-650 font-semibold">
                                    审批人：{activeExpense.approvedBy || "系统管理员"}
                                  </p>
                                  {activeExpense.approvalNote && (
                                    <p className="text-[10px] text-emerald-500 italic leading-relaxed">
                                      “{activeExpense.approvalNote}”
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* SALARY LINKED DETAILS */}
              {activeExpense.salaryDetail && (
                <div className="bg-gradient-to-br from-slate-50 to-brand-50/20 p-4 rounded-xl border border-brand-200/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Wallet className="w-4 h-4 text-brand-600" />
                      <span className="text-xs font-bold text-slate-800">
                        考勤薪资核算明细 ({activeExpense.salaryDetail.month})
                      </span>
                    </div>
                    <span className="text-[11px] font-bold text-brand-700 bg-brand-100/60 px-2 py-0.5 rounded-full">
                      {activeExpense.type}
                    </span>
                  </div>

                  {/* Staff & Bank Info */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11.5px] bg-white/80 p-3 rounded-lg border border-slate-100">
                    <div>
                      <span className="text-slate-400 block text-[10px]">员工姓名/工号</span>
                      <span className="font-bold text-slate-800">
                        {activeExpense.salaryDetail.emp.name} ({activeExpense.salaryDetail.emp.employeeNo || activeExpense.salaryDetail.emp.id})
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">所属部门/职位</span>
                      <span className="text-slate-700">
                        {activeExpense.salaryDetail.emp.dept || "未分配"} · {activeExpense.salaryDetail.emp.role || "普通员工"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">开户银行</span>
                      <span className="text-slate-700 font-medium">
                        {activeExpense.salaryDetail.emp.bankName || "现金发放 (无卡号)"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">银行账号</span>
                      <span className="font-mono text-slate-800 font-semibold">
                        {activeExpense.salaryDetail.emp.bankCardNumber || "-"}
                      </span>
                    </div>
                  </div>

                  {/* Attendance & Calculation breakdown */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11.5px]">
                    <div className="bg-white p-2.5 rounded-lg border border-slate-100">
                      <span className="text-slate-400 block text-[10px]">出勤天数 / 有效工时</span>
                      <span className="font-bold text-slate-700">
                        {activeExpense.salaryDetail.workingDays} 天 / {activeExpense.salaryDetail.valid.toFixed(1)} h
                      </span>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-slate-100">
                      <span className="text-slate-400 block text-[10px]">加班工时 / 加班费</span>
                      <span className="font-bold text-amber-600">
                        {activeExpense.salaryDetail.ot.toFixed(1)} h (฿{Math.round(activeExpense.salaryDetail.otPay).toLocaleString()})
                      </span>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-slate-100">
                      <span className="text-slate-400 block text-[10px]">基本工资 / 补贴</span>
                      <span className="font-bold text-slate-700">
                        ฿{Math.round(activeExpense.salaryDetail.basePay).toLocaleString()} + ฿{Math.round(activeExpense.salaryDetail.mealAllowance + activeExpense.salaryDetail.bonus).toLocaleString()}
                      </span>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-emerald-200 bg-emerald-50/20">
                      <span className="text-slate-400 block text-[10px]">税后实发净额</span>
                      <span className="font-bold text-emerald-700 font-mono text-sm">
                        {formatExpenseAmount(activeExpense.amount, activeExpense.currency)}
                      </span>
                    </div>
                  </div>

                  {/* Signature feedback */}
                  <div className="flex items-center justify-between text-[11px] pt-1 px-1">
                    <span className="text-slate-500">员工签收确认状态：</span>
                    {activeExpense.salaryDetail.signature ? (
                      <span className="text-emerald-700 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        员工已在线签署确认 ({activeExpense.salaryDetail.signature})
                      </span>
                    ) : (
                      <span className="text-slate-400 font-medium">
                        等待员工在移动端签收
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* CORE FIELDS GRID */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 block mb-0.5">费用名称</span>
                  <p className="font-medium text-slate-800 text-xs">{activeExpense.name}</p>
                </div>
                <div>
                  <span className="text-slate-405 block mb-0.5">费用类别</span>
                  <p className="font-medium text-brand-700 bg-brand-50 border border-brand-200 px-2 py-0.5 rounded-md inline-block">
                    {activeExpense.type}
                  </p>
                </div>
                <div>
                  <span className="text-slate-450 block mb-0.5">费用用途</span>
                  <p className="font-medium">
                    {activeExpense.purpose === 'advance' ? (
                      <span className="text-purple-700 bg-purple-50 border border-purple-200/60 px-2 py-0.5 rounded-md inline-block">
                        预支
                      </span>
                    ) : activeExpense.purpose === 'income' ? (
                      <span className="text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-md inline-block">
                        收入
                      </span>
                    ) : (
                      <span className="text-indigo-750 bg-indigo-50 border border-indigo-200/50 px-2 py-0.5 rounded-md inline-block">
                        支出
                      </span>
                    )}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">报销款额支付支持方式</span>
                  <p className="text-slate-750">{activeExpense.paymentMethod}</p>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">支付时间</span>
                  <p className="font-mono text-slate-750">{activeExpense.paymentTime}</p>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">报垫支付人 (Payer)</span>
                  <p className="text-slate-750">{activeExpense.payerName || "默认管理员"}</p>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">指定对账审批人</span>
                  <p className="font-medium text-brand-700">
                    {activeExpense.targetApproverName && activeExpense.targetApproverId !== -1 ? activeExpense.targetApproverName : "由任意管理层审批"}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">本单申报单号</span>
                  <p className="font-mono text-slate-450">{activeExpense.id}</p>
                </div>
                {activeExpense.status !== 'pending' && (
                  <div>
                    <span className="text-slate-400 block mb-0.5">实际裁核审批人</span>
                    <p className={`font-medium ${activeExpense.status === 'approved' ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {activeExpense.approvedBy || "系统管理员"}
                    </p>
                  </div>
                )}
              </div>

              {/* DESC AND APPROVAL COMMENT */}
              {activeExpense.note && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs leading-relaxed text-slate-600">
                  <span className="text-slate-500 block mb-1 font-medium">明细备注说明：</span>
                  {activeExpense.note}
                </div>
              )}

              {activeExpense.approvalNote && (
                <div className={`p-3 border rounded-lg text-xs leading-relaxed ${
                  activeExpense.status === 'approved' ? 'bg-emerald-50/10 border-emerald-200 text-emerald-900' :
                  'bg-rose-50/10 border-rose-200 text-rose-900'
                }`}>
                  <span className="block mb-1 font-medium text-slate-750">核销财务审批意见栏：</span>
                  <i>"{activeExpense.approvalNote}"</i>
                </div>
              )}

              {/* RECEIPT ATTACHMENT DISPLAY (READ-ONLY PREVIEW) */}
              {!activeExpense.receiptUrl && (
                <div className="bg-slate-50/60 p-3.5 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-400 flex items-center justify-center gap-1.5 select-none">
                  <FileX className="w-4 h-4 text-slate-300" />
                  <span>本记录暂未附带电子票据凭证或员工签名凭照</span>
                </div>
              )}
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
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => setPreviewImageUrl(activeExpense.receiptUrl || "")}
                        className="h-7 px-2 text-[10.5px] bg-white text-slate-800 rounded shadow-sm hover:bg-slate-100 font-semibold gap-1"
                      >
                        <Eye className="w-3 h-3" />
                        <span>放大预览</span>
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                          const link = document.createElement("a");
                          link.href = activeExpense.receiptUrl || "";
                          link.download = activeExpense.receiptName || `receipt_${activeExpense.id}.png`;
                          link.target = "_blank";
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                        }}
                        className="h-7 px-2 text-[10.5px] bg-brand-600 text-white rounded shadow-sm hover:bg-brand-700 font-semibold gap-1"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>下载凭证</span>
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer buttons */}
            <DialogFooter className="bg-slate-50 border-t border-slate-200 p-4 flex flex-row justify-between items-center flex-shrink-0">
              <div className="flex gap-2">
                {activeExpense.status === 'pending' && (
                  <Button
                    type="button"
                    size="sm"
                    onClick={(e) => { handleOpenApproval(activeExpense, e); }}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs gap-1.5 shadow-xs cursor-pointer"
                  >
                    <ShieldCheck className="w-4 h-4 text-white" />
                    <span>去执行审批</span>
                  </Button>
                )}
                {activeExpense.status === 'approved' && (
                  <Button
                    type="button"
                    size="sm"
                    onClick={(e) => { handleRecallApproval(activeExpense, e); }}
                    className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs gap-1"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    撤回发放状态
                  </Button>
                )}
              </div>
              <Button
                type="button"
                size="sm"
                onClick={() => setIsDetailOpen(false)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs"
              >
                确定
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      {/* 2. 新建/编辑核销费用单弹窗 */}
      <Dialog open={isFormOpen} onOpenChange={(open) => { if (!open) setIsFormOpen(false); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] p-0 flex flex-col sm:rounded-2xl overflow-hidden [&>button]:text-white [&>button]:hover:text-white [&>button]:top-4 [&>button]:right-5">
          {/* Header */}
          <DialogHeader className="bg-brand-600 text-white px-6 py-4 flex flex-row items-center justify-between space-y-0">
            <DialogTitle className="font-bold text-base text-white flex items-center gap-2">
              <Wallet className="w-5.5 h-5.5 text-brand-100" />
              <span>{editingExpense ? `编辑费用核销单 (${editingExpense.id})` : "新建费用核销报销单"}</span>
            </DialogTitle>
            <DialogDescription className="sr-only">填写费用报销单详情并保存</DialogDescription>
          </DialogHeader>
 
             {/* Form */}
             <form onSubmit={handleSaveExpense} className="flex-1 overflow-y-auto bg-white flex flex-col">
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
                     <Select value={expensePurpose} onValueChange={(val) => setExpensePurpose(val as advance | payout | income)}>
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
                     <Select value={expenseType || (CATEGORIES[0] || "其他")} onValueChange={setExpenseType}>
                       <SelectTrigger className="w-full bg-white font-normal text-slate-750 text-sm">
                         <SelectValue />
                       </SelectTrigger>
                       <SelectContent>
                         {CATEGORIES.filter(Boolean).map(c => (
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
                   {/* 经报支付人（员工匹配） */}
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
                     <p className="text-slate-700 font-medium text-xs mt-3">
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
                           <p className="text-slate-700 font-medium truncate">{receiptName}</p>
                           <p className="text-slate-400 text-[11px] mt-0.5">已加载</p>
                         </div>
                       </div>
                       <Button 
                         type="button"
                         variant="ghost"
                         size="icon"
                         onClick={() => { setReceiptUrl(""); setReceiptName(""); }}
                         className="h-7 w-7 text-rose-500 hover:bg-slate-100 p-0"
                         title="清出该凭证"
                       >
                         <X className="w-4 h-4" />
                       </Button>
                     </div>
                   )}
                 </div>
               </div>

               {/* Action buttons */}
               <DialogFooter className="bg-slate-50 border-t border-slate-200 p-4 flex flex-row justify-end gap-2.5 flex-shrink-0">
                 <Button
                   type="button"
                   variant="outline"
                   onClick={() => setIsFormOpen(false)}
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

      {/* 3. 审批费用控制弹窗 */}
      <Dialog open={isApproveOpen && !!activeExpense} onOpenChange={(open) => { if (!open) setIsApproveOpen(false); }}>
        {activeExpense && (
          <DialogContent className="max-w-lg p-0 flex flex-col sm:rounded-2xl overflow-hidden [&>button]:text-white [&>button]:hover:text-white [&>button]:top-4 [&>button]:right-5">
            {/* Header */}
            <DialogHeader className="bg-brand-600 text-white px-6 py-4 flex flex-row items-center justify-between space-y-0">
              <DialogTitle className="font-bold text-sm tracking-wide text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-brand-200" />
                <span>审批报销单</span>
              </DialogTitle>
              <DialogDescription className="sr-only">审核该报销单据并提交审批结果</DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSaveApproval} className="p-6 space-y-4.5 text-xs">
              {/* Brief Display */}
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">待审批单据</span>
                  <h5 className="text-sm font-bold text-slate-800 line-clamp-1">{activeExpense.name}</h5>
                  <p className="text-[11px] text-slate-500 flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>申请人：{activeExpense.payerName}</span>
                  </p>
                </div>
                <div className="text-right">
                  <span className="font-mono text-base font-black text-brand-600 bg-brand-50 border border-brand-100 px-3 py-1 rounded-lg">
                    {formatExpenseAmount(activeExpense.amount, activeExpense.currency)}
                  </span>
                </div>
              </div>

              {/* YES / NO Radio Options */}
              <div className="space-y-1.5">
                <Label className="block text-slate-500 font-bold text-[11px]">审批结果 <span className="text-rose-500">*</span></Label>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setApproveStatus('approved')}
                    className={cn(
                      "h-10 p-2.5 flex items-center justify-center gap-1.5 cursor-pointer transition",
                      approveStatus === 'approved' 
                        ? "border-emerald-500 bg-emerald-50/10 ring-2 ring-emerald-500/10 font-bold text-emerald-800 hover:bg-emerald-50/20 hover:text-emerald-900" 
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    <span>同意</span>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setApproveStatus('rejected')}
                    className={cn(
                      "h-10 p-2.5 flex items-center justify-center gap-1.5 cursor-pointer transition",
                      approveStatus === 'rejected' 
                        ? "border-rose-500 bg-rose-50/10 ring-2 ring-rose-500/10 font-bold text-rose-800 hover:bg-rose-50/20 hover:text-rose-900" 
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    <X className="w-4 h-4 text-rose-600" />
                    <span>驳回</span>
                  </Button>
                </div>
              </div>

              {/* Input for disapproval/approval note */}
              <div className="space-y-1.5">
                <Label className="block text-slate-500 font-bold text-[11px]">审批意见</Label>
                <textarea
                  rows={2}
                  value={approvalNote}
                  onChange={(e) => setApprovalNote(e.target.value)}
                  placeholder={approveStatus === 'approved' ? "请输入审批意见（选填，默认：同意）" : "请输入驳回原因（必填）"}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition text-xs"
                />
              </div>

              {/* Current Approver (Locked info) */}
              <div className="flex items-center justify-between text-[11px] text-slate-500 bg-slate-50 px-3.5 py-2.5 rounded-lg border border-slate-200">
                <span className="flex items-center gap-1.5 font-medium text-slate-600">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>当前审批人：</span>
                  {activeExpense.targetApproverName && activeExpense.targetApproverId !== -1 ? (
                    <span className="text-slate-850 font-bold">{activeExpense.targetApproverName}</span>
                  ) : (
                    <span className="text-slate-850 font-bold">默认系统管理员</span>
                  )}
                </span>
                <span className="text-[10px] text-slate-400 font-semibold uppercase">
                  已绑定
                </span>
              </div>

              {/* Footer row */}
              <DialogFooter className="flex flex-row justify-end gap-2 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsApproveOpen(false)}
                  className="px-4 py-1.5 border border-slate-200 text-slate-600 hover:text-slate-800 rounded-lg font-bold text-xs"
                >
                  取消
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className={cn(
                    "px-5 py-1.5 text-white font-black rounded-lg transition active:scale-95 text-xs shadow-3xs",
                    approveStatus === 'approved' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                  )}
                >
                  提交审批
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        )}
      </Dialog>


      {/* 3.1. 确认删除报销单弹窗 */}
      <Dialog open={isDeleteConfirmOpen && !!expenseToDelete} onOpenChange={(open) => { if (!open) setIsDeleteConfirmOpen(false); }}>
        {expenseToDelete && (
          <DialogContent className="max-w-md p-0 flex flex-col sm:rounded-2xl overflow-hidden [&>button]:text-white [&>button]:hover:text-white [&>button]:top-4 [&>button]:right-5">
            {/* Header */}
            <DialogHeader className="bg-brand-600 text-white px-6 py-4 flex flex-row items-center justify-between space-y-0">
              <DialogTitle className="font-bold text-sm tracking-wide text-white flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-brand-100" />
                <span>确认删除报销单</span>
              </DialogTitle>
              <DialogDescription className="sr-only">确认删除选中的报销单记录</DialogDescription>
            </DialogHeader>
            
            {/* Content */}
            <div className="p-6 space-y-4">
              <div className="p-4.5 bg-brand-50/50 rounded-xl border border-brand-100 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-brand-600 shrink-0 mt-0.5" />
                <div className="text-xs text-brand-950 space-y-1">
                  <p className="font-bold">此操作不可恢复！</p>
                  <ul className="list-disc pl-4 space-y-0.5 mt-1 font-medium">
                    <li>系统账目和财务统计中将不再计入此笔款项；</li>
                    <li>对应的申报员工在 APP 手机端的报销记录中也将<strong>不再显示</strong>该记录。</li>
                  </ul>
                </div>
              </div>
              
              <div className="text-xs text-slate-600 space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="flex justify-between">
                  <span className="text-slate-400">报销单号：</span>
                  <span className="font-mono font-bold text-slate-800">{expenseToDelete.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">费用名称：</span>
                  <span className="font-semibold text-slate-800 text-right max-w-[70%] truncate">{expenseToDelete.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">申报员工：</span>
                  <span className="font-semibold text-slate-800">{expenseToDelete.payerName || "系统/员工录入"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">报销金额：</span>
                  <span className="font-mono font-extrabold text-brand-600 text-sm">
                    {expenseToDelete.currency === "USD" ? "$" : expenseToDelete.currency === "THB" ? "฿" : "¥"}{expenseToDelete.amount}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Footer */}
            <DialogFooter className="bg-slate-50 border-t border-slate-200 p-4 flex flex-row justify-end gap-2.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsDeleteConfirmOpen(false)}
                className="px-4 py-1.5 border-slate-200 text-slate-600 hover:text-slate-800 font-bold text-xs"
              >
                取消
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={confirmDeleteExpense}
                className="px-4.5 py-1.5 font-extrabold text-xs gap-1 shadow-3xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>确认删除</span>
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>


      {/* 4. 费用类型配置弹窗 */}
      <Dialog open={isConfigOpen} onOpenChange={(open) => { if (!open) { setIsConfigOpen(false); setEditingCatIndex(null); } }}>
        <DialogContent className="max-w-3xl max-h-[90vh] p-0 flex flex-col sm:rounded-2xl overflow-hidden [&>button]:text-white [&>button]:hover:text-white [&>button]:top-4 [&>button]:right-5">
          {/* Header */}
          <DialogHeader className="bg-brand-600 text-white px-6 py-4 flex flex-row items-center justify-between space-y-0">
            <DialogTitle className="font-bold text-sm tracking-wide text-white flex items-center gap-2">
              <Settings className="w-5 h-5 text-brand-100" />
              <span>费用类型配置</span>
            </DialogTitle>
            <DialogDescription className="sr-only">管理和自定义系统费用类别</DialogDescription>
          </DialogHeader>

            {/* List and form */}
            <div className="p-6 flex-1 overflow-y-auto space-y-5">
              
              {/* Add category form */}
              <form onSubmit={handleAddCategory} className="bg-slate-50 border border-slate-200/60 rounded-xl p-4">
                <Label className="block text-slate-600 font-medium mb-2 text-xs">新增费用核销类型</Label>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="如：仓储代办、物化清退、加急配货费"
                    className="flex-1 bg-white text-xs font-normal"
                  />
                  <Button
                    type="submit"
                    size="sm"
                    className="px-4 py-1.5 bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs gap-1 shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>添加</span>
                  </Button>
                </div>
              </form>

              {/* Category List */}
              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-widest">当前可用类别 ({categories.length} 个)</span>
                  <span className="text-[10px] text-slate-400">修改文本以直接重命名</span>
                </div>
                <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 bg-white shadow-3xs max-h-[350px] overflow-y-auto select-none">
                  {categories.map((cat, idx) => {
                    const count = expenses.filter(exp => exp.type === cat).length;
                    const isEditing = editingCatIndex === idx;

                    return (
                      <div key={idx} className="flex items-center justify-between p-3 hover:bg-slate-50/50 transition">
                        <div className="flex-1 mr-3">
                          {isEditing ? (
                            <div className="flex items-center gap-2">
                              <Input
                                type="text"
                                value={editingCatName}
                                onChange={(e) => setEditingCatName(e.target.value)}
                                className="flex-1 h-8 text-xs font-medium"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleUpdateCategory(idx);
                                  if (e.key === 'Escape') setEditingCatIndex(null);
                                }}
                              />
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                onClick={() => handleUpdateCategory(idx)}
                                className="h-7 w-7 p-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg"
                                title="保存"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                onClick={() => setEditingCatIndex(null)}
                                className="h-7 w-7 p-1 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded-lg"
                                title="取消"
                              >
                                <X className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          ) : (
                            <div 
                              onClick={() => {
                                setEditingCatIndex(idx);
                                setEditingCatName(cat);
                              }}
                              className="font-medium text-xs text-slate-700 hover:text-brand-600 transition cursor-pointer flex items-center gap-1.5 group py-1"
                              title="点击进行编辑修改"
                            >
                              <span>{cat}</span>
                              <Edit className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                            {count} 笔记录
                          </span>
                          {!isEditing && (
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              onClick={() => handleDeleteCategory(idx)}
                              className="h-7 w-7 p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-500 rounded-lg"
                              title="删除此类型"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* Footer */}
            <DialogFooter className="bg-slate-50 border-t border-slate-200 p-4 flex flex-row justify-end">
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={() => {
                  setIsConfigOpen(false);
                  setEditingCatIndex(null);
                }}
                className="px-5 py-1.5 bg-slate-800 hover:bg-slate-900 font-extrabold text-white text-xs shadow-3xs"
              >
                保存
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      {/* 图片放大查看灯箱 Modal */}
      <Dialog open={!!previewImageUrl} onOpenChange={(open) => { if (!open) setPreviewImageUrl(null); }}>
        <DialogContent className="max-w-4xl p-4 bg-slate-950/90 border-0 flex flex-col items-center justify-center text-center [&>button]:text-white [&>button]:hover:text-white [&>button]:top-4 [&>button]:right-5">
          <DialogTitle className="sr-only">凭证发票原图放大预览</DialogTitle>
          <DialogDescription className="sr-only">原图放大查看</DialogDescription>
          <img 
            src={previewImageUrl || ""} 
            alt="receipt magnified lightbox" 
            className="max-w-full max-h-[85vh] rounded-lg shadow-2xl object-contain mx-auto border-3 border-white/20 select-none animate-in zoom-in-95 duration-200"
            referrerPolicy="no-referrer"
          />
          <p className="text-white text-xs font-medium tracking-wide mt-3 select-none text-slate-200 flex items-center justify-center gap-1">
            <span>单击右上角关闭</span>
            <span className="w-1 h-1 rounded-full bg-slate-400"></span>
            <span>或按下 Esc 退出大图查看</span>
          </p>
        </DialogContent>
      </Dialog>

      {/* 审核流程配置 Modal */}
      <Dialog open={isApprovalFlowOpen} onOpenChange={(open) => { if (!open) { setIsApprovalFlowOpen(false); setEditingStepType(null); setEditingStepIndex(null); } }}>
        <DialogContent className="max-w-3xl max-h-[90vh] p-0 flex flex-col sm:rounded-2xl overflow-hidden [&>button]:text-white [&>button]:hover:text-white [&>button]:top-4 [&>button]:right-5">
          {/* Header */}
          <DialogHeader className="bg-brand-600 text-white px-6 py-4 flex flex-row items-center justify-between space-y-0">
            <DialogTitle className="font-bold text-sm tracking-wide text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-brand-100" />
              <span>审核流程配置中心</span>
            </DialogTitle>
            <DialogDescription className="sr-only">配置支出与收入审批流程节点</DialogDescription>
          </DialogHeader>

            {/* Content Body */}
            <div className="p-6 flex-1 overflow-y-auto space-y-6">
              <p className="text-xs text-slate-500 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100 animate-fade-in">
                💡 在这里可以分别为<b>「支出流程」</b>和<b>「收入流程」</b>定制专属的多级审批节点。还可以全局开启或关闭审批功能。
                审批节点更新后，员工手机端在查看报销单时，即可实时拉取对应的审批链条与到账进度。
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* 1. 支出核销审批链条 */}
                <div className="border border-slate-200 rounded-xl p-4.5 space-y-4 bg-white shadow-3xs flex flex-col">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                      <h4 className="text-xs font-black text-slate-800">支出审核流程</h4>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleFlow('payout')}
                      className={cn(
                        "h-6 px-2.5 py-1 rounded-md text-[10px] font-black tracking-wide cursor-pointer",
                        approvalFlowConfig.payout.enabled 
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100" 
                          : "bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200"
                      )}
                    >
                      {approvalFlowConfig.payout.enabled ? "● 已开启" : "○ 已关闭"}
                    </Button>
                  </div>

                  {approvalFlowConfig.payout.enabled ? (
                    <div className="space-y-3 flex-1 flex flex-col">
                      {/* Step List */}
                      <div className="border border-slate-100 rounded-lg divide-y divide-slate-50 overflow-hidden max-h-[220px] overflow-y-auto bg-slate-50/50 flex-1">
                        {approvalFlowConfig.payout.steps.map((step: string, idx: number) => {
                          const isEditing = editingStepType === 'payout' && editingStepIndex === idx;
                          return (
                            <div key={idx} className="flex items-center justify-between p-2.5 bg-white hover:bg-slate-50 transition text-xs">
                              {isEditing ? (
                                <div className="flex items-center gap-1.5 w-full">
                                  <Input
                                    type="text"
                                    value={editingStepValue}
                                    onChange={(e) => setEditingStepValue(e.target.value)}
                                    className="flex-1 h-7 px-2 py-1 text-[11px] font-bold text-slate-800"
                                    autoFocus
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleSaveEditStep();
                                      if (e.key === 'Escape') {
                                        setEditingStepType(null);
                                        setEditingStepIndex(null);
                                      }
                                    }}
                                  />
                                  <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                    onClick={handleSaveEditStep}
                                    className="h-6 w-6 p-1 bg-emerald-500 text-white rounded hover:bg-emerald-600"
                                  >
                                    <Check className="w-3 h-3" />
                                  </Button>
                                  <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => {
                                      setEditingStepType(null);
                                      setEditingStepIndex(null);
                                    }}
                                    className="h-6 w-6 p-1 bg-slate-200 text-slate-600 rounded hover:bg-slate-300"
                                  >
                                    <X className="w-3 h-3" />
                                  </Button>
                                </div>
                              ) : (
                                <>
                                  <div className="flex items-center gap-2">
                                    <span className="w-4 h-4 bg-slate-100 text-slate-500 text-[10px] rounded-full flex items-center justify-center font-bold">
                                      {idx + 1}
                                    </span>
                                    <span className="font-extrabold text-slate-700">{step}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <Button
                                      type="button"
                                      size="icon"
                                      variant="ghost"
                                      disabled={idx === 0}
                                      onClick={() => handleMoveStep('payout', idx, 'up')}
                                      className="h-6 w-6 p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded"
                                      title="上移"
                                    >
                                      ▲
                                    </Button>
                                    <Button
                                      type="button"
                                      size="icon"
                                      variant="ghost"
                                      disabled={idx === approvalFlowConfig.payout.steps.length - 1}
                                      onClick={() => handleMoveStep('payout', idx, 'down')}
                                      className="h-6 w-6 p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded"
                                      title="下移"
                                    >
                                      ▼
                                    </Button>
                                    <Button
                                      type="button"
                                      size="icon"
                                      variant="ghost"
                                      onClick={() => handleStartEditStep('payout', idx, step)}
                                      className="h-6 w-6 p-1 text-slate-400 hover:text-brand-600 rounded"
                                      title="重命名"
                                    >
                                      <Edit className="w-3.5 h-3.5" />
                                    </Button>
                                    <Button
                                      type="button"
                                      size="icon"
                                      variant="ghost"
                                      onClick={() => handleDeleteStep('payout', idx)}
                                      className="h-6 w-6 p-1 text-slate-400 hover:text-rose-550 rounded hover:bg-rose-50"
                                      title="删除"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                  </div>
                                </>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Add Step Form */}
                      <div className="flex gap-1.5 pt-2">
                        <Input
                          type="text"
                          value={newPayoutStepName}
                          onChange={(e) => setNewPayoutStepName(e.target.value)}
                          placeholder="新审核步骤：如 财务经理初审"
                          className="flex-1 h-8 px-2.5 py-1 text-xs font-semibold text-slate-800 bg-white"
                        />
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => handleAddStep('payout')}
                          className="h-8 px-3 py-1 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-xs font-extrabold gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>增加</span>
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 py-12 flex flex-col items-center justify-center border border-dashed border-slate-200 rounded-lg bg-slate-50/50 text-slate-400 text-xs">
                      <p className="font-bold">支出审批流程已关闭</p>
                      <p className="text-[10px] mt-1 text-slate-400/80">关闭后，支出报销将自动跳过人工审批环节</p>
                    </div>
                  )}
                </div>

                {/* 2. 收入核销审批链条 */}
                <div className="border border-slate-200 rounded-xl p-4.5 space-y-4 bg-white shadow-3xs flex flex-col">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      <h4 className="text-xs font-black text-slate-800">收入审核流程</h4>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleFlow('income')}
                      className={cn(
                        "h-6 px-2.5 py-1 rounded-md text-[10px] font-black tracking-wide cursor-pointer",
                        approvalFlowConfig.income.enabled 
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100" 
                          : "bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200"
                      )}
                    >
                      {approvalFlowConfig.income.enabled ? "● 已开启" : "○ 已关闭"}
                    </Button>
                  </div>

                  {approvalFlowConfig.income.enabled ? (
                    <div className="space-y-3 flex-1 flex flex-col">
                      {/* Step List */}
                      <div className="border border-slate-100 rounded-lg divide-y divide-slate-50 overflow-hidden max-h-[220px] overflow-y-auto bg-slate-50/50 flex-1">
                        {approvalFlowConfig.income.steps.map((step: string, idx: number) => {
                          const isEditing = editingStepType === 'income' && editingStepIndex === idx;
                          return (
                            <div key={idx} className="flex items-center justify-between p-2.5 bg-white hover:bg-slate-50 transition text-xs">
                              {isEditing ? (
                                <div className="flex items-center gap-1.5 w-full">
                                  <Input
                                    type="text"
                                    value={editingStepValue}
                                    onChange={(e) => setEditingStepValue(e.target.value)}
                                    className="flex-1 h-7 px-2 py-1 text-[11px] font-bold text-slate-800"
                                    autoFocus
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleSaveEditStep();
                                      if (e.key === 'Escape') {
                                        setEditingStepType(null);
                                        setEditingStepIndex(null);
                                      }
                                    }}
                                  />
                                  <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                    onClick={handleSaveEditStep}
                                    className="h-6 w-6 p-1 bg-emerald-500 text-white rounded hover:bg-emerald-600"
                                  >
                                    <Check className="w-3 h-3" />
                                  </Button>
                                  <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => {
                                      setEditingStepType(null);
                                      setEditingStepIndex(null);
                                    }}
                                    className="h-6 w-6 p-1 bg-slate-200 text-slate-600 rounded hover:bg-slate-300"
                                  >
                                    <X className="w-3 h-3" />
                                  </Button>
                                </div>
                              ) : (
                                <>
                                  <div className="flex items-center gap-2">
                                    <span className="w-4 h-4 bg-slate-100 text-slate-500 text-[10px] rounded-full flex items-center justify-center font-bold">
                                      {idx + 1}
                                    </span>
                                    <span className="font-extrabold text-slate-700">{step}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <Button
                                      type="button"
                                      size="icon"
                                      variant="ghost"
                                      disabled={idx === 0}
                                      onClick={() => handleMoveStep('income', idx, 'up')}
                                      className="h-6 w-6 p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded"
                                      title="上移"
                                    >
                                      ▲
                                    </Button>
                                    <Button
                                      type="button"
                                      size="icon"
                                      variant="ghost"
                                      disabled={idx === approvalFlowConfig.income.steps.length - 1}
                                      onClick={() => handleMoveStep('income', idx, 'down')}
                                      className="h-6 w-6 p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded"
                                      title="下移"
                                    >
                                      ▼
                                    </Button>
                                    <Button
                                      type="button"
                                      size="icon"
                                      variant="ghost"
                                      onClick={() => handleStartEditStep('income', idx, step)}
                                      className="h-6 w-6 p-1 text-slate-400 hover:text-brand-600 rounded"
                                      title="重命名"
                                    >
                                      <Edit className="w-3.5 h-3.5" />
                                    </Button>
                                    <Button
                                      type="button"
                                      size="icon"
                                      variant="ghost"
                                      onClick={() => handleDeleteStep('income', idx)}
                                      className="h-6 w-6 p-1 text-slate-400 hover:text-rose-555 rounded hover:bg-rose-50"
                                      title="删除"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                  </div>
                                </>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Add Step Form */}
                      <div className="flex gap-1.5 pt-2">
                        <Input
                          type="text"
                          value={newIncomeStepName}
                          onChange={(e) => setNewIncomeStepName(e.target.value)}
                          placeholder="新对账步骤：如 仓储财务二审"
                          className="flex-1 h-8 px-2.5 py-1 text-xs font-semibold text-slate-800 bg-white"
                        />
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => handleAddStep('income')}
                          className="h-8 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-extrabold gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>增加</span>
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 py-12 flex flex-col items-center justify-center border border-dashed border-slate-200 rounded-lg bg-slate-50/50 text-slate-400 text-xs">
                      <p className="font-bold">收入审批流程已关闭</p>
                      <p className="text-[10px] mt-1 text-slate-400/80">关闭后，收入回账记录将自动标识为免审通过</p>
                    </div>
                  )}
                </div>

              </div>
            </div>

            {/* Footer */}
            <DialogFooter className="bg-slate-50 border-t border-slate-200 p-4 flex flex-row justify-end">
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={() => {
                  setIsApprovalFlowOpen(false);
                  setEditingStepType(null);
                  setEditingStepIndex(null);
                }}
                className="px-5 py-1.5 bg-slate-800 hover:bg-slate-900 font-extrabold text-white text-xs shadow-3xs"
              >
                保存
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

    </div>
  );
}
