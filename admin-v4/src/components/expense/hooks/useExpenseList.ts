import React, { useState, useMemo, useEffect, useCallback } from "react";
import { ExpenseRecord, Employee, AttendanceRecord, AppConfig, HolidayRecord } from "../types";
import { DEFAULT_CATEGORIES, CURRENCIES, generateUniqueWmsId } from "../constants";
import { loadStoredExpenses, saveStoredExpenses, fetchExpenseRecords } from "../utils/expenseApi";
import { computeSalaryExpenseRecords, createPayslipNotification, createRecallNotification } from "../utils/salaryCalculator";
import { getNowDateTimeStr } from "../../../lib/utils";

interface UseExpenseListProps {
  employees: Employee[];
  attendance?: AttendanceRecord[];
  config?: AppConfig;
  holidays?: HolidayRecord[];
  addToast: (msg: string, kind?: "success" | "error" | "info") => void;
  onRefresh?: () => Promise<void> | void;
}

export function useExpenseList({
  employees,
  attendance = [],
  config,
  holidays = [],
  addToast,
  onRefresh
}: UseExpenseListProps) {
  const [expenses, setExpenses] = useState<ExpenseRecord[]>(() => loadStoredExpenses());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [purposeFilter, setPurposeFilter] = useState("all");

  const [monthFilter, setMonthFilter] = useState(() => {
    try {
      const ym = new Date().toISOString().slice(0, 7);
      return ym;
    } catch {
      return "all";
    }
  });

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

  const [categories, setCategories] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("wms_expense_categories");
      if (saved) {
        const parsed = JSON.parse(saved);
        ["固定月薪", "计时工时", "固定日薪"].forEach(wc => {
          if (!parsed.includes(wc)) parsed.unshift(wc);
        });
        return parsed;
      }
      return DEFAULT_CATEGORIES;
    } catch {
      return DEFAULT_CATEGORIES;
    }
  });

  // Modal context states
  const [editingExpense, setEditingExpense] = useState<ExpenseRecord | null>(null);
  const [activeExpense, setActiveExpense] = useState<ExpenseRecord | null>(null);
  const [expenseToDelete, setExpenseToDelete] = useState<ExpenseRecord | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isApproveOpen, setIsApproveOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const saveExpenses = useCallback((newExpenses: ExpenseRecord[]) => {
    setExpenses(newExpenses);
    saveStoredExpenses(newExpenses);
  }, []);

  const saveCategories = useCallback((newCats: string[]) => {
    setCategories(newCats);
    try {
      localStorage.setItem("wms_expense_categories", JSON.stringify(newCats));
    } catch (e) {
      console.error("Failed to save categories", e);
    }
  }, []);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      if (onRefresh) {
        await onRefresh();
      }
      const records = await fetchExpenseRecords();
      setExpenses(records);
      addToast("费用与报销列表已同步刷新", "success");
    } catch (e) {
      console.error(e);
      addToast("刷新失败", "error");
    } finally {
      setIsRefreshing(false);
    }
  };

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

  const salaryRecords = useMemo(() => {
    const monthsToCompute = monthFilter === "all" ? availableMonths.slice(0, 6) : [monthFilter];
    return computeSalaryExpenseRecords({
      employees,
      attendance,
      config,
      holidays,
      monthsToCompute,
      payouts,
      signatures
    });
  }, [employees, attendance, config, holidays, monthFilter, availableMonths, payouts, signatures]);

  const allExpenses = useMemo(() => {
    const manualOnly = expenses.filter(e => !e.id.startsWith("salary-"));
    return [...salaryRecords, ...manualOnly];
  }, [salaryRecords, expenses]);

  const activeCurrency = useMemo(() => {
    const found = allExpenses.find(e => e.currency)?.currency;
    return found || config?.currency || "THB";
  }, [allExpenses, config]);

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

    return [...list].sort((a, b) => {
      const timeA = a.paymentTime || "";
      const timeB = b.paymentTime || "";
      if (timeA !== timeB) {
        return timeB.localeCompare(timeA);
      }
      return b.id.localeCompare(a.id);
    });
  }, [allExpenses, searchQuery, typeFilter, methodFilter, statusFilter, purposeFilter, monthFilter]);

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

  // Actions
  const handleOpenDetail = (rec: ExpenseRecord) => {
    setActiveExpense(rec);
    setIsDetailOpen(true);
  };

  const handleOpenCreate = () => {
    setEditingExpense(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (rec: ExpenseRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    if (rec.id.startsWith("salary-") || rec.salaryDetail) {
      handleOpenDetail(rec);
      addToast("工资条明细由考勤核算自动生成，已为您打开详情查阅", "info");
      return;
    }
    setEditingExpense(rec);
    setIsFormOpen(true);
  };

  const handleOpenApproval = (rec: ExpenseRecord, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setActiveExpense(rec);
    setIsApproveOpen(true);
  };

  const handleSaveExpense = (recordData: Partial<ExpenseRecord>) => {
    if (editingExpense) {
      const updated = expenses.map(item => {
        if (item.id === editingExpense.id) {
          return {
            ...item,
            ...recordData
          } as ExpenseRecord;
        }
        return item;
      });
      saveExpenses(updated);
      addToast("费用核销记录已更新成功", "success");
    } else {
      const newRec: ExpenseRecord = {
        id: generateUniqueWmsId(expenses),
        name: recordData.name || "",
        type: recordData.type || categories[0] || "",
        paymentMethod: recordData.paymentMethod || "银行转账",
        amount: Number(recordData.amount) || 0,
        currency: recordData.currency || "CNY",
        receiptUrl: recordData.receiptUrl,
        receiptName: recordData.receiptName,
        payerId: recordData.payerId,
        payerName: recordData.payerName,
        paymentTime: recordData.paymentTime || new Date().toISOString().slice(0, 10),
        status: "pending",
        note: recordData.note,
        targetApproverId: recordData.targetApproverId,
        targetApproverName: recordData.targetApproverName,
        purpose: recordData.purpose || "payout"
      };
      saveExpenses([newRec, ...expenses]);
      addToast("新费用核销单提交完成，已进入待审核队列", "success");
    }
    setIsFormOpen(false);
  };

  const handleSaveApproval = (
    approveStatus: 'approved' | 'rejected',
    approvalNote: string,
    actualApproverName: string
  ) => {
    if (!activeExpense) return;

    const isSalary = activeExpense.id.startsWith("salary-") || !!activeExpense.salaryDetail;
    const isApproved = approveStatus === "approved";

    if (isSalary) {
      const empId = activeExpense.payerId || activeExpense.salaryDetail?.emp?.id;
      const targetMonth = activeExpense.salaryDetail?.month || (activeExpense.paymentTime ? activeExpense.paymentTime.slice(0, 7) : monthFilter);
      const key = `${empId}_${targetMonth}`;

      setPayouts(prev => {
        const next = { ...prev, [key]: isApproved };
        try {
          localStorage.setItem("payroll_payout_status", JSON.stringify(next));
        } catch {}
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
        } catch {}
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
            approvedBy: actualApproverName,
            approvedTime: getNowDateTimeStr(),
            approvalNote: approvalNote.trim() || (approveStatus === "approved" ? "审核资料齐全，支出账实相符，准予核销。" : "由于发票不合规或流程越级，被审核人驳回。")
          } as ExpenseRecord;
        }
        return item;
      });

      saveExpenses(updated);
      addToast(approveStatus === "approved" ? `费用核销审批「已批准」，经办人: ${actualApproverName}` : `费用核销审批「已驳回」，经办人: ${actualApproverName}`, "success");
    }

    setIsApproveOpen(false);
    if (isDetailOpen && activeExpense) {
      setActiveExpense(prev => prev ? {
        ...prev,
        status: approveStatus,
        approvedBy: actualApproverName,
        approvedTime: getNowDateTimeStr(),
        approvalNote: approvalNote.trim() || (approveStatus === "approved" ? "审核资料齐全，准予核销/发放。" : "单据已驳回。")
      } : null);
    }
  };

  const handleRecallApproval = async (rec: ExpenseRecord, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setActionLoadingId(rec.id);
    try {
      const isSalary = rec.id.startsWith("salary-") || !!rec.salaryDetail;

      if (isSalary) {
        const empId = rec.payerId || rec.salaryDetail?.emp?.id;
        const targetMonth = rec.salaryDetail?.month || (rec.paymentTime ? rec.paymentTime.slice(0, 7) : monthFilter);
        const key = `${empId}_${targetMonth}`;

        setPayouts(prev => {
          const next = { ...prev, [key]: false };
          try {
            localStorage.setItem("payroll_payout_status", JSON.stringify(next));
          } catch {}
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
        } catch {}

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
        addToast(`报销单「${rec.name}」已撤回至待审批状态`, "info");
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
    } finally {
      setTimeout(() => setActionLoadingId(null), 150);
    }
  };

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

  const confirmDeleteExpense = () => {
    if (!expenseToDelete) return;
    const remaining = expenses.filter(item => item.id !== expenseToDelete.id);
    saveExpenses(remaining);
    addToast(`报销单「${expenseToDelete.name}」已被彻底删除`, "success");
    if (isDetailOpen && activeExpense?.id === expenseToDelete.id) {
      setIsDetailOpen(false);
    }
    setIsDeleteConfirmOpen(false);
    setExpenseToDelete(null);
  };

  const handleAddCategory = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) {
      addToast("请输入新费用类型名称", "error");
      return;
    }
    if (categories.includes(trimmed)) {
      addToast("该费用类型已存在", "info");
      return;
    }
    const updated = [...categories, trimmed];
    saveCategories(updated);
    addToast(`成功添加费用类型: ${trimmed}`, "success");
  };

  const handleUpdateCategory = (index: number, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) {
      addToast("费用类型名称不能为空", "error");
      return;
    }
    const oldName = categories[index];
    if (oldName === trimmed) return;

    if (categories.some((c, idx) => c === trimmed && idx !== index)) {
      addToast("该费用类型名称已存在", "info");
      return;
    }

    const updated = [...categories];
    updated[index] = trimmed;
    saveCategories(updated);

    const updatedExpenses = expenses.map(exp => {
      if (exp.type === oldName) {
        return { ...exp, type: trimmed };
      }
      return exp;
    });
    if (JSON.stringify(expenses) !== JSON.stringify(updatedExpenses)) {
      saveExpenses(updatedExpenses);
    }

    addToast(`费用类型 "${oldName}" 已成功重命名为 "${trimmed}" 并同步历史记录`, "success");
  };

  const handleDeleteCategory = (index: number) => {
    if (categories.length <= 1) {
      addToast("系统必须保留至少一种费用类别", "error");
      return;
    }

    const nameToDelete = categories[index];
    const updated = categories.filter((_, idx) => idx !== index);
    saveCategories(updated);
    addToast(`已成功删除费用类别: ${nameToDelete}`, "success");
  };

  return {
    expenses,
    allExpenses,
    filteredExpenses,
    pagedExpenses,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    totalPages,
    isRefreshing,
    handleManualRefresh,
    searchQuery,
    setSearchQuery,
    typeFilter,
    setTypeFilter,
    methodFilter,
    setMethodFilter,
    statusFilter,
    setStatusFilter,
    purposeFilter,
    setPurposeFilter,
    monthFilter,
    setMonthFilter,
    availableMonths,
    activeCurrency,
    stats,
    categories,
    // Modals visibility & data
    isFormOpen,
    setIsFormOpen,
    isDetailOpen,
    setIsDetailOpen,
    isApproveOpen,
    setIsApproveOpen,
    isDeleteConfirmOpen,
    setIsDeleteConfirmOpen,
    isConfigOpen,
    setIsConfigOpen,
    previewImageUrl,
    setPreviewImageUrl,
    editingExpense,
    activeExpense,
    expenseToDelete,
    actionLoadingId,
    // Operations
    handleOpenCreate,
    handleOpenEdit,
    handleOpenDetail,
    handleOpenApproval,
    handleSaveExpense,
    handleSaveApproval,
    handleRecallApproval,
    handleDeleteExpense,
    confirmDeleteExpense,
    handleAddCategory,
    handleUpdateCategory,
    handleDeleteCategory
  };
}
