/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AppConfig, AttendanceRecord, Employee, HolidayRecord, PayrollSummary } from "../types";
import { cn, calcAttendanceDetails, formatCurrency, formatDuration, calcOvertimePay, formatMonthLabel, getNowMonthStr, formatDate } from "../lib/utils";
import { useMemo, useState, useEffect, useRef } from "react";
import { Calendar, DollarSign, CheckCircle2, AlertCircle, TrendingUp, Download, Receipt, Check, RotateCcw, RefreshCw, Search, Filter, Clock, ChevronLeft, ChevronRight, X, Loader2 } from "lucide-react";
import { getTranslation, Language } from "../lib/i18n";
import { Pagination } from "./Pagination";
import { TableHorizontalScroller } from "./TableHorizontalScroller";
import { useStickyMirrorHeader } from "../lib/useStickyMirrorHeader";

interface PayrollTableProps {
  employees: Employee[];
  attendance: AttendanceRecord[];
  config: AppConfig;
  holidays: HolidayRecord[];
  loading?: boolean;
  onRefresh?: () => Promise<void> | void;
  addToast?: (msg: string, kind?: "success" | "error" | "info") => void;
  hasPermission?: (permId: string) => boolean;
  lang?: Language;
}

export function PayrollTable({ employees, attendance, config, holidays, loading = false, onRefresh, addToast, hasPermission = () => true, lang = "zh-CN" }: PayrollTableProps) {
  const tableContainerRef = useRef<HTMLDivElement | null>(null);
  // Extract all distinct months available in attendance log
  const availableMonths = useMemo(() => {
    const list = attendance.map(r => r.date.slice(0, 7)).filter(Boolean);
    const unique = [...new Set(list)];
    
    // Ensure current month is always present as a safety choice
    const currentMonthStr = getNowMonthStr();
    if (!unique.includes(currentMonthStr)) {
      unique.push(currentMonthStr);
    }
    
    return unique.sort().reverse(); // Show newest month first
  }, [attendance]);

  // Selected Month State (defaults to the newest available month with records)
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const dates = attendance.map(r => r.date.slice(0, 7)).filter(Boolean);
    const unique = [...new Set(dates)].sort().reverse();
    return unique.length > 0 ? unique[0] : getNowMonthStr();
  });

  const defaultMonth = useMemo(() => getNowMonthStr(), []);

  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState<boolean>(false);
  const [pickerYear, setPickerYear] = useState<number>(() => {
    const y = parseInt(selectedMonth.split('-')[0]);
    return isNaN(y) ? new Date().getFullYear() : y;
  });

  const payslipTitle = useMemo(() => {
    if (!selectedMonth) return getTranslation("payslip_modal_title", lang).replace("{m}", "");
    const parts = selectedMonth.split('-');
    if (parts.length >= 2) {
      const m = parseInt(parts[1], 10);
      if (!isNaN(m)) {
        return getTranslation("payslip_modal_title", lang).replace("{m}", String(m));
      }
    }
    return getTranslation("payslip_modal_title", lang).replace("{m}", selectedMonth);
  }, [selectedMonth, lang]);

  // UI Filter and Search State
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending'>('all');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [isTableLoading, setIsTableLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  useEffect(() => {
    setIsTableLoading(true);
    const timer = setTimeout(() => {
      setIsTableLoading(false);
    }, 250);
    return () => clearTimeout(timer);
  }, [selectedMonth]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setIsTableLoading(true);
    try {
      if (onRefresh) {
        await onRefresh();
      }
      setTimeout(() => {
        setIsTableLoading(false);
      }, 200);
      addToast?.("薪资核算数据已刷新", "success");
    } catch (err: any) {
      setIsTableLoading(false);
      addToast?.(err.message || "刷新失败", "error");
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedMonth, searchTerm, statusFilter]);

  // Payout dictionary stored in localStorage: { "${empId}_${YYYY-MM}": true/false }
  const [payouts, setPayouts] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem("payroll_payout_status");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Employee confirmation/signatures stored in localStorage: { "${empId}_${YYYY-MM}": "SignatureName" }
  const [empConfirmations, setEmpConfirmations] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem("payroll_employee_signatures");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Save payouts to localStorage
  useEffect(() => {
    localStorage.setItem("payroll_payout_status", JSON.stringify(payouts));
  }, [payouts]);

  // Sync payouts and signatures with localStorage from storage and focus events
  useEffect(() => {
    const syncPayoutsAndSignatures = () => {
      try {
        const saved = localStorage.getItem("payroll_payout_status");
        if (saved) {
          setPayouts(JSON.parse(saved));
        }
        const savedSigs = localStorage.getItem("payroll_employee_signatures");
        if (savedSigs) {
          setEmpConfirmations(JSON.parse(savedSigs));
        }
      } catch (e) {
        console.error(e);
      }
    };
    syncPayoutsAndSignatures();

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "payroll_payout_status" && e.newValue) {
        try {
          setPayouts(JSON.parse(e.newValue));
        } catch (err) {
          console.error(err);
        }
      }
      if (e.key === "payroll_employee_signatures" && e.newValue) {
        try {
          setEmpConfirmations(JSON.parse(e.newValue));
        } catch (err) {
          console.error(err);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("focus", syncPayoutsAndSignatures);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("focus", syncPayoutsAndSignatures);
    };
  }, []);

  // Helper to trigger employee notification for payslip release
  const createPayslipNotification = (empId: number, monthStr: string, netAmount: number, currency: string, name: string) => {
    try {
      const savedSops = localStorage.getItem("wms_sop_documents");
      let currentSops: any[] = [];
      if (savedSops) {
        try {
          currentSops = JSON.parse(savedSops);
        } catch (e) {
          console.error(e);
        }
      }

      const parts = monthStr.split("-");
      const monthNum = parts.length >= 2 ? parseInt(parts[1], 10) : 7;
      const title = `${monthNum}月电子工资条已生成`;
      const formattedAmt = formatCurrency(netAmount, currency as any);
      
      const content = `尊敬的 <b>${name}</b> (工号: ${empId})，您 <b>${monthStr}</b> 的电子薪资单已生成发放。本月应发净薪资为 <b>${formattedAmt}</b>。`;

      const dupId = `sop-payslip-${empId}-${monthStr}`;
      const filtered = currentSops.filter(s => s.id !== dupId);

      const newNotif: any = {
        id: dupId,
        title: title,
        content: content,
        images: [],
        attachments: [],
        targetType: 'specific',
        targetEmployeeIds: [empId],
        createdAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
        creator: "财务薪资部 · Admin",
        status: "published",
        reads: {},
        category: 'training',
        docType: 'notification'
      };

      localStorage.setItem("wms_sop_documents", JSON.stringify([newNotif, ...filtered]));
      window.dispatchEvent(new Event("storage"));
    } catch (e) {
      console.error("Failed to create payslip notification", e);
    }
  };

  // Payslip Modal State
  const [selectedPayslipEmp, setSelectedPayslipEmp] = useState<PayrollSummary | null>(null);
  const [showSlipModal, setShowSlipModal] = useState(false);
  const [signName, setSignName] = useState("");
  const [isCashPaid, setIsCashPaid] = useState(false);

  // Custom Confirmation Dialog State
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    confirmText?: string;
    cancelText?: string;
    type?: 'warning' | 'danger' | 'info';
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  // Filter attendance records to ONLY those in the selected month
  const filteredAttendance = useMemo(() => {
    return attendance.filter(rec => rec.date && rec.date.startsWith(selectedMonth));
  }, [attendance, selectedMonth]);

  // Generate salary summaries for current selected month
  const payrollSummary: PayrollSummary[] = useMemo(() => {
    return employees.map(emp => {
      let valid = 0, ot = 0, otPay = 0, basePay = 0;
      let workingDays = 0;
      let otCount = 0;
      let mealAllowance = 0;

      // Calculate details for this employee based on filtered month attendance
      filteredAttendance.filter(r => String(r.empId) === String(emp.id)).forEach(rec => {
        const d = calcAttendanceDetails(rec, config);
        valid += d.valid;
        ot += d.ot;
        otPay += calcOvertimePay(emp, rec.date, d.ot, config, holidays).amount;

        if (d.ot > 0) {
          otCount += 1;
        }

        const isAbsentOrLeave = emp.status === '休假' || (emp.status as any) === 'on_leave' || rec.type === 'absent' || rec.type === 'leave' || rec.type === 'sick_leave';
        if (!isAbsentOrLeave) {
          workingDays += 1;
          
          const getMealAllowanceVal = (e: Employee) => {
            return e.mealAllowanceDaily !== undefined && e.mealAllowanceDaily !== null ? e.mealAllowanceDaily : 0;
          };
          mealAllowance += getMealAllowanceVal(emp);

          const hasBaseWage = emp.baseMonthlyWage !== undefined && emp.baseMonthlyWage !== null && emp.baseMonthlyWage > 0;
          const hasDailyWage = emp.dailyWage !== undefined && emp.dailyWage !== null && emp.dailyWage > 0;
          if (hasBaseWage) {
            basePay += emp.baseMonthlyWage / 30; // Daily converted wage from base monthly salary
          } else if (hasDailyWage) {
            basePay += (d.valid - d.ot) * (emp.dailyWage / config.standardHours); // Proportional daily wage based on actual hours on duty
          } else {
            basePay += (d.valid - d.ot) * (emp.hourlyRate ?? 0); // Normal working hours * hourly rate
          }
        }
      });
      
      const bonus = workingDays > 0 ? Number(emp.attendanceBonus || 0) : 0;
      const ssSec = workingDays > 0 ? Number(emp.socialSecurity || 0) : 0;
      const gross = Number(basePay || 0) + Number(otPay || 0) + bonus + Number(mealAllowance || 0);
      const taxRate = typeof config?.taxRate === "number" && !isNaN(config.taxRate) ? config.taxRate : 0.05;
      const tax = (Number(basePay || 0) + Number(otPay || 0) + bonus) * taxRate;
      
      const isDispatch = emp.sourceType === '劳务派遣';
      const commRate = isDispatch ? Number(emp.dispatchCommissionRate || 0) : 0;
      const serviceFee = Number(basePay || 0) * (commRate / 100);

      const net = Math.max(0, gross - tax - ssSec);
      
      return { 
        emp, 
        valid, 
        ot, 
        basePay, 
        otPay, 
        mealAllowance,
        gross, 
        net,
        serviceFee,
        workingDays,
        otCount
      };
    });
  }, [employees, filteredAttendance, config]);

  // Filtered rows for listing
  const tableRows = useMemo(() => {
    return payrollSummary.filter(row => {
      const matchSearch = row.emp.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (row.emp.dept && row.emp.dept.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          (row.emp.role && row.emp.role.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const payoutKey = `${row.emp.id}_${selectedMonth}`;
      const isPaid = !!payouts[payoutKey];
      
      if (statusFilter === 'paid') return matchSearch && isPaid;
      if (statusFilter === 'pending') return matchSearch && !isPaid;
      return matchSearch;
    });
  }, [payrollSummary, searchTerm, statusFilter, payouts, selectedMonth]);

  const totalPages = Math.max(1, Math.ceil(tableRows.length / pageSize));
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  const pagedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return tableRows.slice(start, start + pageSize);
  }, [tableRows, currentPage, pageSize]);

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
    deps: [pagedRows, loading, isTableLoading],
  });

  // Monthly Overview Cards Metrics
  const metrics = useMemo(() => {
    let totalExpected = 0;
    let totalPaid = 0;
    let paidCount = 0;
    let totalNormalHours = 0;
    let totalOtHours = 0;

    payrollSummary.forEach(row => {
      const payoutKey = `${row.emp.id}_${selectedMonth}`;
      const isPaid = !!payouts[payoutKey];
      
      totalExpected += row.net;
      totalNormalHours += (row.valid - row.ot);
      totalOtHours += row.ot;

      if (isPaid) {
        totalPaid += row.net;
        paidCount += 1;
      }
    });

    return {
      totalExpected,
      totalPaid,
      totalPending: totalExpected - totalPaid,
      paidCount,
      totalCount: payrollSummary.length,
      progressPct: payrollSummary.length > 0 ? (paidCount / payrollSummary.length) * 100 : 0,
      totalHours: totalNormalHours + totalOtHours,
      totalOtHours
    };
  }, [payrollSummary, payouts, selectedMonth]);

  const currentCurrency = config?.currency || employees[0]?.currency || "CNY";

  // Quick Action: Payout or Retract
  const handleTogglePayout = (empId: number) => {
    const key = `${empId}_${selectedMonth}`;
    setPayouts(prev => {
      const isCurrentlyPaid = prev[key];
      const isNewPaid = !isCurrentlyPaid;

      // Handle notifications
      try {
        const savedSops = localStorage.getItem("wms_sop_documents");
        let currentSops: any[] = [];
        if (savedSops) {
          try {
            currentSops = JSON.parse(savedSops);
          } catch (e) {
            console.error(e);
          }
        }

        const originalNotifId = `sop-payslip-${empId}-${selectedMonth}`;
        const recallNotifId = `sop-payslip-recall-${empId}-${selectedMonth}`;

        if (!isNewPaid) {
          // Admin is RETRACTING/RECALLING the payslip
          // Delete original notification and previous recall notifications to avoid duplicates
          let filtered = currentSops.filter(s => s.id !== originalNotifId && s.id !== recallNotifId);

          // Clear employee signature for this month upon retraction
          try {
            const savedSigs = localStorage.getItem("payroll_employee_signatures");
            if (savedSigs) {
              const sigs = JSON.parse(savedSigs);
              const sigKey = `${empId}_${selectedMonth}`;
              if (sigs[sigKey]) {
                delete sigs[sigKey];
                localStorage.setItem("payroll_employee_signatures", JSON.stringify(sigs));
              }
            }
          } catch (e) {
            console.error("Failed to delete employee signature upon retraction", e);
          }

          const parts = selectedMonth.split("-");
          const monthNum = parts.length >= 2 ? parseInt(parts[1], 10) : 7;
          const emp = employees.find(e => e.id === empId);
          const empName = emp ? emp.name : "";

          const recallNotif: any = {
            id: recallNotifId,
            title: `⚠️ ${monthNum}月电子工资条已被撤回`,
            content: `尊敬的 <b>${empName}</b> (工号: ${empId})，您 <b>${selectedMonth}</b> 的电子工资条已被财务部撤回重新核对。当前原工资条已失效，请您知悉。`,
            images: [],
            attachments: [],
            targetType: 'specific',
            targetEmployeeIds: [empId],
            createdAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
            creator: "财务薪资部 · Admin",
            status: "published",
            reads: {},
            category: 'training',
            docType: 'notification'
          };

          localStorage.setItem("wms_sop_documents", JSON.stringify([recallNotif, ...filtered]));
          window.dispatchEvent(new Event("storage"));
        } else {
          // Admin is RE-ISSUING / PAYING the payslip
          // Remove any existing recall notification
          const filtered = currentSops.filter(s => s.id !== recallNotifId);
          localStorage.setItem("wms_sop_documents", JSON.stringify(filtered));
          window.dispatchEvent(new Event("storage"));

          const row = payrollSummary.find(r => r.emp.id === empId);
          if (row) {
            createPayslipNotification(
              empId,
              selectedMonth,
              row.net,
              row.emp.currency,
              row.emp.name
            );
          } else {
            createPayslipNotification(
              empId,
              selectedMonth,
              0,
              employees.find(e => e.id === empId)?.currency || 'THB',
              employees.find(e => e.id === empId)?.name || ''
            );
          }
        }
      } catch (e) {
        console.error("Failed to update notifications for payout toggle", e);
      }

      return {
        ...prev,
        [key]: isNewPaid
      };
    });
  };

  // Quick Action: Mark All as Paid for this Selected Month
  const handleMarkAllPaid = () => {
    setConfirmDialog({
      isOpen: true,
      title: "确认全员核销发放",
      message: `确定要将当前选择月份 (${selectedMonth}) 的所有在职员工都标记为“已发放”吗？该操作将批量更新发放状态。`,
      confirmText: "确定全员发放",
      cancelText: "取消",
      type: "warning",
      onConfirm: () => {
        const updated = { ...payouts };
        employees.forEach(emp => {
          updated[`${emp.id}_${selectedMonth}`] = true;
          // Generate notification for this employee
          const row = payrollSummary.find(r => r.emp.id === emp.id);
          if (row) {
            createPayslipNotification(
              emp.id,
              selectedMonth,
              row.net,
              emp.currency,
              emp.name
            );
          } else {
            createPayslipNotification(
              emp.id,
              selectedMonth,
              0,
              emp.currency,
              emp.name
            );
          }
        });
        setPayouts(updated);
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  // Launch Payslip Modal Detail
  const handleOpenPayslip = (row: PayrollSummary) => {
    setSelectedPayslipEmp(row);
    setSignName("");
    setIsCashPaid(!!payouts[`${row.emp.id}_${selectedMonth}`]);
    setShowSlipModal(true);
  };

  // Confirm payout from inside Modal
  const submitPayslipConfirm = () => {
    if (!selectedPayslipEmp) return;
    const key = `${selectedPayslipEmp.emp.id}_${selectedMonth}`;
    setPayouts(prev => ({
      ...prev,
      [key]: true
    }));

    // Generate notification for this specific employee
    createPayslipNotification(
      selectedPayslipEmp.emp.id,
      selectedMonth,
      selectedPayslipEmp.net,
      selectedPayslipEmp.emp.currency,
      selectedPayslipEmp.emp.name
    );

    setShowSlipModal(false);
    setSelectedPayslipEmp(null);
  };

  // Export current month payroll to CSV
  const handleExportCSV = () => {
    const headers = [
      "年月", "员工", "员工编号", "所属部门", "职位", "计薪方式", 
      "有效工时", "加班时长", "加班费", "服务费", "应发", 
      "社保扣款", "扣款", "实发", "发放状态", "币种"
    ];

    const getSalaryTypeLabel = (emp: Employee) => {
      if (emp.baseMonthlyWage !== undefined && emp.baseMonthlyWage !== null && emp.baseMonthlyWage > 0) return "月薪";
      if (emp.dailyWage !== undefined && emp.dailyWage !== null && emp.dailyWage > 0) return "日薪";
      return "时薪";
    };

    const taxRate = typeof config?.taxRate === "number" && !isNaN(config.taxRate) ? config.taxRate : 0.05;

    const totals = tableRows.reduce(
      (acc, item) => {
        const bonus = Number(item.emp.attendanceBonus || 0);
        const ssf = Number(item.emp.socialSecurity || 0);
        const basePay = Number(item.basePay || 0);
        const otPay = Number(item.otPay || 0);
        const tax = (basePay + otPay + bonus) * taxRate;
        const deduction = ssf + tax;
        const net = Number.isFinite(item.net) ? item.net : Math.max(0, Number(item.gross || 0) - deduction);

        acc.validHours += Number(item.valid || 0);
        acc.overtimeHours += Number(item.ot || 0);
        acc.overtimePay += Number(item.otPay || 0);
        acc.serviceFee += Number(item.serviceFee || 0);
        acc.grossPay += Number(item.gross || 0);
        acc.socialSecurity += ssf;
        acc.deduction += deduction;
        acc.netPay += net;
        return acc;
      },
      { validHours: 0, overtimeHours: 0, overtimePay: 0, serviceFee: 0, grossPay: 0, socialSecurity: 0, deduction: 0, netPay: 0 }
    );

    const rows = tableRows.map((item) => {
      const isPaid = !!payouts[`${item.emp.id}_${selectedMonth}`];
      const bonus = Number(item.emp.attendanceBonus || 0);
      const ssf = Number(item.emp.socialSecurity || 0);
      const basePay = Number(item.basePay || 0);
      const otPay = Number(item.otPay || 0);
      const tax = (basePay + otPay + bonus) * taxRate;
      const deduction = ssf + tax;
      const net = Number.isFinite(item.net) ? item.net : Math.max(0, Number(item.gross || 0) - deduction);

      return [
        selectedMonth,
        `"${item.emp.name}"`,
        item.emp.employeeNo || item.emp.idCard || item.emp.id || "-",
        `"${item.emp.dept || "未分配"}"`,
        `"${item.emp.role || "未设置职位"}"`,
        getSalaryTypeLabel(item.emp),
        Number(item.valid || 0).toFixed(2),
        Number(item.ot || 0).toFixed(2),
        Number(item.otPay || 0).toFixed(2),
        Number(item.serviceFee || 0).toFixed(2),
        Number(item.gross || 0).toFixed(2),
        Number(ssf || 0).toFixed(2),
        Number(deduction || 0).toFixed(2),
        Number(net || 0).toFixed(2),
        isPaid ? "已发" : "待发",
        item.emp.currency || currentCurrency
      ];
    });

    const summaryRow = [
      "合计",
      "",
      "",
      "",
      "",
      "",
      Number(totals.validHours || 0).toFixed(2),
      Number(totals.overtimeHours || 0).toFixed(2),
      Number(totals.overtimePay || 0).toFixed(2),
      Number(totals.serviceFee || 0).toFixed(2),
      Number(totals.grossPay || 0).toFixed(2),
      Number(totals.socialSecurity || 0).toFixed(2),
      Number(totals.deduction || 0).toFixed(2),
      Number(totals.netPay || 0).toFixed(2),
      "",
      tableRows[0]?.emp?.currency || currentCurrency
    ];

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((row) => row.join(",")), summaryRow.join(",")].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `员工薪资报表_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      
      {/* Dynamic Month Selector Bar */}
      <div className="bg-slate-50/95 border border-slate-200/80 rounded-xl p-3 sm:p-3.5 shadow-2xs flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-green-50 text-green-600 flex items-center justify-center font-bold shadow-inner">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-slate-800 text-base flex items-center gap-2">
              月份工资发放与核算
              <span className="px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 text-xs font-mono font-bold">
                {selectedMonth}
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">以月为单位查看出勤及发放明细，提供工资单签收发放</p>
          </div>
        </div>

        <div className="w-full sm:w-auto flex flex-wrap items-center gap-2.5">
          {/* Custom Month Picker */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 whitespace-nowrap flex items-center gap-1">
              按月筛选:
            </span>
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsMonthPickerOpen(!isMonthPickerOpen)}
                className="px-2.5 py-1.5 border border-slate-200 rounded-lg hover:border-slate-300 transition-colors bg-white shadow-xs flex items-center justify-between text-xs font-mono text-slate-700 h-[34px] w-[140px] cursor-pointer focus:ring-1 focus:ring-brand-500 outline-none"
              >
                <span>{selectedMonth ? formatMonthLabel(selectedMonth, lang) : "全部"}</span>
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {isMonthPickerOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40 cursor-default bg-transparent" 
                    onClick={() => setIsMonthPickerOpen(false)}
                  />
                  <div className="absolute right-0 mt-1.5 w-[220px] bg-white border border-slate-100 rounded-xl shadow-lg p-3 z-50 animate-fade-in space-y-2 text-left">
                    {/* Year navigation */}
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <button
                        type="button"
                        onClick={() => setPickerYear(prev => prev - 1)}
                        className="p-1 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-700 cursor-pointer transition-colors"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span className="text-xs font-semibold text-slate-700">{pickerYear}年</span>
                      <button
                        type="button"
                        onClick={() => setPickerYear(prev => prev + 1)}
                        className="p-1 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-700 cursor-pointer transition-colors"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Month Grid */}
                    <div className="grid grid-cols-3 gap-1">
                      {Array.from({ length: 12 }, (_, i) => {
                        const monthNum = i + 1;
                        const monthStr = String(monthNum).padStart(2, '0');
                        const value = `${pickerYear}-${monthStr}`;
                        const isSelected = selectedMonth === value;
                        const isCurrentMonth = (() => {
                          const now = new Date();
                          return now.getFullYear() === pickerYear && (now.getMonth() + 1) === monthNum;
                        })();

                        return (
                          <button
                            key={monthNum}
                            type="button"
                            onClick={() => {
                              setSelectedMonth(value);
                              setIsMonthPickerOpen(false);
                            }}
                            className={cn(
                              "py-1.5 text-xs rounded-lg cursor-pointer transition-all text-center",
                              isSelected
                                ? "bg-brand-500 text-white font-medium shadow-xs"
                                : isCurrentMonth
                                  ? "bg-brand-50 text-brand-700 hover:bg-brand-100 font-medium"
                                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                            )}
                          >
                            {monthNum}月
                          </button>
                        );
                      })}
                    </div>

                    {/* Footer Quick Selection */}
                    <div className="flex justify-between items-center pt-2 border-t border-slate-100 text-[11px]">
                      <button
                        type="button"
                        onClick={() => {
                          const now = new Date();
                          const yyyy = now.getFullYear();
                          const mm = String(now.getMonth() + 1).padStart(2, '0');
                          setSelectedMonth(`${yyyy}-${mm}`);
                          setPickerYear(yyyy);
                          setIsMonthPickerOpen(false);
                        }}
                        className="text-brand-600 hover:text-brand-700 font-medium cursor-pointer"
                      >
                        本月
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedMonth(defaultMonth);
                          const [y] = defaultMonth.split('-');
                          const initY = parseInt(y);
                          setPickerYear(isNaN(initY) ? new Date().getFullYear() : initY);
                          setIsMonthPickerOpen(false);
                        }}
                        className="text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        恢复默认
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition flex items-center gap-1.5 shadow-2xs cursor-pointer ml-auto sm:ml-0"
            title="刷新薪资核算数据"
          >
            <RefreshCw className={cn("w-4 h-4 text-slate-500", isRefreshing && "animate-spin")} />
            <span>刷新</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 transition flex items-center gap-1.5 shadow-sm ml-auto sm:ml-0"
          >
            <Download className="w-4 h-4 text-emerald-500" />
            <span>导出CSV表</span>
          </button>
        </div>
      </div>

      {/* Month Specific Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Expected Outflow */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 relative overflow-hidden group hover:shadow-md transition">
          <div className="absolute top-0 right-0 p-3 text-brand-100 group-hover:text-brand-200 transition">
            <DollarSign className="w-14 h-14" />
          </div>
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">应发工资总额</p>
          <p className="text-2xl font-bold font-mono text-slate-800 mt-1">{formatCurrency(metrics.totalExpected, currentCurrency)}</p>
          <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-2">
            <TrendingUp className="w-3.5 h-3.5 text-blue-500" />
            <span>基于 {metrics.totalHours.toFixed(1)}h 正常工时核算</span>
          </div>
        </div>

        {/* Already Paid amount */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 relative overflow-hidden group hover:shadow-md transition">
          <div className="absolute top-0 right-0 p-3 text-emerald-100 group-hover:text-emerald-200 transition">
            <CheckCircle2 className="w-14 h-14" />
          </div>
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">已完成发放（确认）</p>
          <p className="text-2xl font-bold font-mono text-emerald-600 mt-1">{formatCurrency(metrics.totalPaid, currentCurrency)}</p>
          <div className="flex items-center gap-1 text-[10px] text-emerald-600/80 mt-2 font-medium">
            <Check className="w-3.5 h-3.5" />
            <span>包含 {metrics.paidCount} 名已确认员工</span>
          </div>
        </div>

        {/* Pending Outflow */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 relative overflow-hidden group hover:shadow-md transition">
          <div className="absolute top-0 right-0 p-3 text-amber-100 group-hover:text-amber-200 transition">
            <AlertCircle className="w-14 h-14" />
          </div>
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">未发放（待结）总额</p>
          <p className="text-2xl font-bold font-mono text-amber-600 mt-1">{formatCurrency(metrics.totalPending, currentCurrency)}</p>
          <div className="flex items-center gap-1 text-[10px] text-amber-600 mt-2 font-medium">
            <Clock className="w-3.5 h-3.5" />
            <span>还有 {metrics.totalCount - metrics.paidCount} 人待支付</span>
          </div>
        </div>

        {/* Payout Progress */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 relative overflow-hidden group hover:shadow-md transition">
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">工资发放核销进度</p>
          <div className="flex items-center justify-between mt-1">
            <p className="text-2xl font-bold text-slate-800">{metrics.progressPct.toFixed(0)}%</p>
            <span className="text-xs bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-full font-mono">
              {metrics.paidCount} / {metrics.totalCount} 人
            </span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full mt-3 overflow-hidden">
            <div 
              className="bg-brand-500 h-full rounded-full transition-all duration-500" 
              style={{ width: `${metrics.progressPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Table Panel */}
      <div className="glass-panel rounded-xl shadow-sm border border-slate-100 bg-white">
        
        {/* Table Filters and Search Bar */}
        <div className="sticky top-0 z-20 bg-slate-50/95 backdrop-blur-xs border-b border-slate-100 rounded-t-xl shadow-2xs">
          <div ref={actionBarRef} className="p-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                statusFilter === 'all' 
                  ? 'bg-brand-600 text-white shadow-sm' 
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              全部员工 ({payrollSummary.length})
            </button>
            <button
              onClick={() => setStatusFilter('pending')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                statusFilter === 'pending' 
                  ? 'bg-amber-500 text-white shadow-sm' 
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              ⏳ 待发放 ({payrollSummary.length - metrics.paidCount})
            </button>
            <button
              onClick={() => setStatusFilter('paid')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                statusFilter === 'paid' 
                  ? 'bg-emerald-600 text-white shadow-sm' 
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              ✅ 已发放 ({metrics.paidCount})
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                placeholder="搜索员工、职位或区域..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="w-full sm:w-64 h-8 pl-8 pr-8 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-brand-500 shadow-3xs"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => { setSearchTerm(""); setCurrentPage(1); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
                  title="清空搜索"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Quick action: sign all */}
            <button
              onClick={() => {
                if (hasPermission("payroll_pay")) {
                  handleMarkAllPaid();
                }
              }}
              disabled={metrics.paidCount === metrics.totalCount || !hasPermission("payroll_pay")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1 transition ${
                (metrics.paidCount === metrics.totalCount || !hasPermission("payroll_pay"))
                  ? 'bg-slate-100 text-slate-300 border border-slate-200 cursor-not-allowed' 
                  : 'bg-indigo-50 border border-indigo-100 text-indigo-700 hover:bg-indigo-100 cursor-pointer'
              }`}
              title={hasPermission("payroll_pay") ? "本月全员核销发放" : "无权限核销发放工资"}
            >
              <Check className="w-3.5 h-3.5" />
              <span>{!hasPermission("payroll_pay") && "🔒 "}本月全员核销发放</span>
            </button>

            <div className="w-px h-5 bg-slate-200 mx-0.5 hidden sm:block" />
            <TableHorizontalScroller targetRef={tableContainerRef} />
          </div>
        </div>

        {/* 悬浮镜像表头 (Sticky Mirror Header - 方案二) */}
        {isMirrorHeaderVisible && (
          <div
            ref={mirrorHeaderRef}
            className="overflow-x-hidden border-t border-slate-200/80 bg-slate-50/95 backdrop-blur-xs shadow-xs transition-opacity duration-150"
          >
            <table
              style={{ width: realTableWidth ? `${realTableWidth}px` : "100%", minWidth: "1380px" }}
              className="text-left border-collapse table-fixed"
            >
              <thead>
                <tr className="bg-slate-50/95 text-slate-500 text-xs uppercase border-b border-slate-200 whitespace-nowrap">
                  <th style={{ width: colWidths[0] ? `${colWidths[0]}px` : undefined }} className="px-5 py-3.5 font-bold">员工详情</th>
                  <th style={{ width: colWidths[1] ? `${colWidths[1]}px` : undefined }} className="px-3.5 py-3.5 font-bold text-left">上班数</th>
                  <th style={{ width: colWidths[2] ? `${colWidths[2]}px` : undefined }} className="px-3.5 py-3.5 font-bold text-left">工时</th>
                  <th style={{ width: colWidths[3] ? `${colWidths[3]}px` : undefined }} className="px-3.5 py-3.5 font-bold text-left">加班</th>
                  <th style={{ width: colWidths[4] ? `${colWidths[4]}px` : undefined }} className="px-3.5 py-3.5 font-bold text-left">加班时长</th>
                  <th style={{ width: colWidths[5] ? `${colWidths[5]}px` : undefined }} className="px-3.5 py-3.5 font-bold text-left">薪资</th>
                  <th style={{ width: colWidths[6] ? `${colWidths[6]}px` : undefined }} className="px-3.5 py-3.5 font-bold text-left font-sans">加班费</th>
                  <th style={{ width: colWidths[7] ? `${colWidths[7]}px` : undefined }} className="px-3.5 py-3.5 font-bold text-left font-sans">全勤奖</th>
                  <th style={{ width: colWidths[8] ? `${colWidths[8]}px` : undefined }} className="px-3.5 py-3.5 font-bold text-left font-sans">餐饮费</th>
                  <th style={{ width: colWidths[9] ? `${colWidths[9]}px` : undefined }} className="px-3.5 py-3.5 font-bold text-left font-sans">社保</th>
                  <th style={{ width: colWidths[10] ? `${colWidths[10]}px` : undefined }} className="px-3.5 py-3.5 font-bold text-left font-sans">服务费</th>
                  <th style={{ width: colWidths[11] ? `${colWidths[11]}px` : undefined }} className="px-4 py-3.5 font-bold text-left text-blue-700 font-sans">合计工资</th>
                  <th style={{ width: colWidths[12] ? `${colWidths[12]}px` : undefined }} className="px-4 py-3.5 font-bold text-center font-sans">状态</th>
                  <th style={{ width: colWidths[13] ? `${colWidths[13]}px` : undefined }} className="px-5 py-3.5 font-bold text-center font-sans">操作</th>
                </tr>
              </thead>
            </table>
          </div>
        )}
      </div>

        <div ref={tableHeadSentinelRef} className="h-0 w-full" />
        {/* Salaries Table Grid */}
        <div ref={tableContainerRef} onScroll={handleTableScroll} className="overflow-x-auto relative rounded-b-xl">
          <table ref={realTableRef} className="w-full text-left border-collapse min-w-[1380px]">
            <thead ref={realTheadRef}>
              <tr className="bg-slate-50/75 text-slate-500 text-xs uppercase border-b border-slate-100 whitespace-nowrap">
                <th className="px-5 py-3.5 font-bold min-w-[180px]">员工详情</th>
                <th className="px-3.5 py-3.5 font-bold text-left min-w-[80px]">上班数</th>
                <th className="px-3.5 py-3.5 font-bold text-left min-w-[85px]">工时</th>
                <th className="px-3.5 py-3.5 font-bold text-left min-w-[80px]">加班</th>
                <th className="px-3.5 py-3.5 font-bold text-left min-w-[90px]">加班时长</th>
                <th className="px-3.5 py-3.5 font-bold text-left min-w-[95px]">薪资</th>
                <th className="px-3.5 py-3.5 font-bold text-left font-sans min-w-[95px]">加班费</th>
                <th className="px-3.5 py-3.5 font-bold text-left font-sans min-w-[90px]">全勤奖</th>
                <th className="px-3.5 py-3.5 font-bold text-left font-sans min-w-[90px]">餐饮费</th>
                <th className="px-3.5 py-3.5 font-bold text-left font-sans min-w-[85px]">社保</th>
                <th className="px-3.5 py-3.5 font-bold text-left font-sans min-w-[85px]">服务费</th>
                <th className="px-4 py-3.5 font-bold text-left text-blue-700 font-sans min-w-[110px]">合计工资</th>
                <th className="px-4 py-3.5 font-bold text-center font-sans min-w-[100px]">状态</th>
                <th className="px-5 py-3.5 font-bold text-center font-sans min-w-[160px]">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(loading || isTableLoading) ? (
                <tr>
                  <td colSpan={14} className="py-20 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
                      <span className="text-xs text-slate-500 font-medium">正在核算薪资明细数据...</span>
                    </div>
                  </td>
                </tr>
              ) : tableRows.length === 0 ? (
                <tr>
                  <td colSpan={14} className="py-16 text-center text-slate-400">
                    <Receipt className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                    <p className="text-sm">没有找到符合筛选条件的员工薪资数据</p>
                    <p className="text-xs text-slate-300 mt-1">请核对是否已为该月份 "{selectedMonth}" 录入过任何员工的出勤卡</p>
                  </td>
                </tr>
              ) : (
                pagedRows.map((row) => {
                  const { emp, valid, ot, basePay, otPay, mealAllowance, net, serviceFee, workingDays, otCount } = row;
                  const payoutKey = `${emp.id}_${selectedMonth}`;
                  const isPaid = !!payouts[payoutKey];

                  return (
                    <tr key={emp.id} className="hover:bg-slate-50/70 border-b border-slate-100 bg-white transition-colors whitespace-nowrap">
                      <td className="px-5 py-4 min-w-[180px]">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold overflow-hidden border-2 border-white shadow-sm flex-shrink-0">
                            {emp.photo ? (
                              <img src={emp.photo} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                            ) : (
                              <span style={{ fontSize: '14.4px' }}>{emp.name.charAt(0)}</span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900 truncate max-w-[140px]">{emp.name}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[140px]">
                              {[emp.dept, emp.role].filter(Boolean).join(" · ") || "未分配"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3.5 py-4 text-left">
                        <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold font-mono text-xs">
                          {workingDays} 天
                        </span>
                      </td>
                      <td className="px-3.5 py-4 text-left text-xs font-mono text-slate-600">
                        {formatDuration(valid)}
                      </td>
                      <td className="px-3.5 py-4 text-left">
                        <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold font-mono text-xs">
                          {otCount} 次
                        </span>
                      </td>
                      <td className="px-3.5 py-4 text-left text-xs font-mono text-slate-600">
                        {formatDuration(ot)}
                      </td>
                      <td className="px-3.5 py-4 text-left text-xs font-mono text-slate-600 font-medium">
                        {formatCurrency(basePay, emp.currency)}
                      </td>
                      <td className="px-3.5 py-4 text-left text-xs font-mono text-slate-600 font-medium">
                        {formatCurrency(otPay, emp.currency)}
                      </td>
                      <td className="px-3.5 py-4 text-left text-xs font-mono text-slate-600">
                        {emp.attendanceBonus !== undefined && emp.attendanceBonus > 0 
                          ? formatCurrency(emp.attendanceBonus, emp.currency) 
                          : '-'}
                      </td>
                      <td className="px-3.5 py-4 text-left text-xs font-mono text-slate-600">
                        {mealAllowance !== undefined && mealAllowance > 0 
                          ? formatCurrency(mealAllowance, emp.currency) 
                          : '-'}
                      </td>
                      <td className="px-3.5 py-4 text-left text-xs font-mono text-slate-600">
                        {emp.socialSecurity !== undefined && emp.socialSecurity > 0 
                          ? formatCurrency(emp.socialSecurity, emp.currency) 
                          : '-'}
                      </td>
                      <td className="px-3.5 py-4 text-left text-xs font-mono text-slate-600">
                        {serviceFee !== undefined && serviceFee > 0 
                          ? formatCurrency(serviceFee, emp.currency) 
                          : '-'}
                      </td>
                      <td className="px-4 py-4 text-left">
                        <span className="text-sm font-bold font-mono text-blue-800">
                          {formatCurrency(net, emp.currency)}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        {isPaid ? (
                          <div className="flex flex-col items-center gap-1.5 justify-center">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 rounded-lg border border-emerald-100">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                              已发放
                            </span>
                            {empConfirmations[`${emp.id}_${selectedMonth}`] ? (
                              <div className="flex flex-col items-center gap-1">
                                {empConfirmations[`${emp.id}_${selectedMonth}`]?.startsWith("data:image/") ? (
                                  <div className="relative group cursor-zoom-in">
                                    <img 
                                      src={empConfirmations[`${emp.id}_${selectedMonth}`]} 
                                      alt="Signature" 
                                      className="h-6 max-w-[80px] object-contain border border-slate-200 bg-white rounded px-1 shadow-3xs -rotate-90"
                                      referrerPolicy="no-referrer"
                                    />
                                    {/* Hover overlay for full size view */}
                                    <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 bg-slate-900 text-white rounded-lg p-2 hidden group-hover:block shadow-lg border border-slate-800 z-50 w-48 transition-all duration-200">
                                      <p className="text-[9px] font-bold text-center text-slate-300 pb-1 border-b border-slate-800 mb-1">
                                        手写电子签名 (手迹回执)
                                      </p>
                                      <div className="bg-white p-1 rounded border border-slate-700 flex justify-center items-center h-20">
                                        <img 
                                          src={empConfirmations[`${emp.id}_${selectedMonth}`]} 
                                          alt="Signature Preview" 
                                          className="max-h-full max-w-full object-contain -rotate-90"
                                          referrerPolicy="no-referrer"
                                        />
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-bold text-teal-800 bg-teal-50 rounded border border-teal-200" title={`已于APP端核对并签名: ${empConfirmations[`${emp.id}_${selectedMonth}`]}`}>
                                    ✍️ {empConfirmations[`${emp.id}_${selectedMonth}`]}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 bg-slate-50 rounded border border-slate-200">
                                ⏳ 待核签
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-amber-700 bg-amber-50 rounded-lg border border-amber-100">
                            待发放
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {isPaid ? (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleOpenPayslip(row)}
                                className="px-2.5 py-1 text-xs font-semibold text-slate-700 hover:text-brand-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition flex items-center gap-1 cursor-pointer"
                              >
                                <Receipt className="w-3 h-3" />
                                <span>查看工资条</span>
                              </button>
                              <button
                                onClick={() => {
                                  if (hasPermission("payroll_pay")) {
                                    setConfirmDialog({
                                      isOpen: true,
                                      title: "确认撤回工资条",
                                      message: `确认要撤回员工 ${emp.name} 的工资发放状态吗？撤回后工资条将恢复为“待发放”状态。`,
                                      confirmText: "确认撤回",
                                      cancelText: "取消",
                                      type: "danger",
                                      onConfirm: () => {
                                        handleTogglePayout(emp.id);
                                        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                                      }
                                    });
                                  }
                                }}
                                disabled={!hasPermission("payroll_pay")}
                                className={cn(
                                  "px-2.5 py-1 text-xs font-semibold rounded-lg transition flex items-center gap-1 border",
                                  hasPermission("payroll_pay")
                                    ? "text-red-600 hover:text-white hover:bg-red-600 border-red-200 hover:border-red-600 cursor-pointer"
                                    : "text-slate-400 bg-slate-50 border-slate-200 cursor-not-allowed"
                                )}
                                title={hasPermission("payroll_pay") ? "撤回工资发放状态" : "无权限撤回工资条"}
                              >
                                <RotateCcw className="w-3 h-3" />
                                <span>{!hasPermission("payroll_pay") && "🔒"}撤回</span>
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  if (hasPermission("payroll_pay")) {
                                    handleOpenPayslip(row);
                                  } else {
                                    // Fallback: If no payroll_pay, can they still view it in read-only? 
                                    // Let's allow view, but disable generating. Actually, they cannot generate.
                                    // Let's let them open payslip in read-only mode if we want, or just disable it entirely.
                                    // Let's disable generating entirely if they don't have permission.
                                  }
                                }}
                                disabled={!hasPermission("payroll_pay")}
                                className={cn(
                                  "px-2.5 py-1 text-xs font-semibold rounded-lg shadow-sm transition flex items-center gap-1",
                                  hasPermission("payroll_pay")
                                    ? "text-white bg-brand-600 hover:bg-brand-700 cursor-pointer"
                                    : "text-slate-400 bg-slate-100 border border-slate-200 cursor-not-allowed"
                                )}
                                title={hasPermission("payroll_pay") ? "生成工资条" : "无权限生成工资条"}
                              >
                                <Receipt className="w-3 h-3" />
                                <span>{!hasPermission("payroll_pay") && "🔒"}生成工资条</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
              </tbody>
            </table>
        </div>

        {/* Bottom Total Summary & Pagination */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 space-y-3">
          <Pagination
            page={currentPage}
            pageSize={pageSize}
            total={tableRows.length}
            itemName="条"
            pageSizeOptions={[10, 20, 50]}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
          />
          <div className="flex flex-col sm:flex-row justify-between items-center text-xs text-slate-500">
            <div>
              当前列表共显示 <span className="font-bold text-slate-700">{tableRows.length}</span> 名员工的计算记录
            </div>
            <div>
              薪资发放由人事及仓库管理员校对后，可通过<span className="font-bold text-slate-700">【生成工资条】</span>开启独立签收单，一键核对实缴
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Beautiful Payslip Modal (工资单) */}
      {showSlipModal && selectedPayslipEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100 transform scale-100 transition-all flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="bg-brand-600 text-white p-5 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold">{payslipTitle}</h3>
              </div>
              <button 
                onClick={() => { setShowSlipModal(false); setSelectedPayslipEmp(null); }}
                className="text-white/80 hover:text-white bg-brand-500/30 hover:bg-brand-500/50 p-1.5 rounded-full transition text-sm-semibold font-mono"
              >
                ✕
              </button>
            </div>

            {/* Payslip Content Body (Scrollable if small display) */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1 text-slate-700 text-sm">
              <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
                <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold overflow-hidden border">
                  {selectedPayslipEmp.emp.photo ? (
                    <img src={selectedPayslipEmp.emp.photo} className="w-full h-full object-cover" alt="" />
                  ) : (
                    <span>{selectedPayslipEmp.emp.name.charAt(0)}</span>
                  )}
                </div>
                <div>
                  <p className="font-bold text-slate-800 text-base">{selectedPayslipEmp.emp.name}</p>
                  <p className="text-xs text-slate-500">{selectedPayslipEmp.emp.dept || (lang === 'en' ? "All Zones" : lang === 'th' ? "ทุกโซน" : lang === 'zh-TW' ? "全區" : "全区")} · {selectedPayslipEmp.emp.role}</p>
                </div>
                <div className="ml-auto text-right">
                  <span className="text-xs text-slate-400 block font-mono">ID: #{selectedPayslipEmp.emp.id}</span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 mt-1 inline-block">
                    {(() => {
                      const c = selectedPayslipEmp.emp.country || "TH";
                      const map: Record<string, string> = {
                        MM: lang === "en" ? "🇲🇲 Myanmar" : lang === "th" ? "🇲🇲 เมียนมา" : lang === "zh-TW" ? "🇲🇲 緬甸籍" : "🇲🇲 缅甸籍",
                        TH: lang === "en" ? "🇹🇭 Thai" : lang === "th" ? "🇹🇭 ไทย" : lang === "zh-TW" ? "🇹🇭 泰國籍" : "🇹🇭 泰国籍",
                        CN: lang === "en" ? "🇨🇳 China" : lang === "th" ? "🇨🇳 จีน" : lang === "zh-TW" ? "🇨🇳 中國籍" : "🇨🇳 中国籍",
                        KR: lang === "en" ? "🇰🇷 Korea" : lang === "th" ? "🇰🇷 เกาหลี" : lang === "zh-TW" ? "🇰🇷 韓國籍" : "🇰🇷 韩国籍",
                        VN: lang === "en" ? "🇻🇳 Vietnam" : lang === "th" ? "🇻🇳 เวียดนาม" : lang === "zh-TW" ? "🇻🇳 越南籍" : "🇻🇳 越南籍",
                        KH: lang === "en" ? "🇰🇭 Cambodia" : lang === "th" ? "🇰🇭 กัมพูชา" : lang === "zh-TW" ? "🇰🇭 柬埔寨籍" : "🇰🇭 柬埔寨籍",
                        ID: lang === "en" ? "🇮🇩 Indonesia" : lang === "th" ? "🇮🇩 อินโดนีเซีย" : lang === "zh-TW" ? "🇮🇩 印尼籍" : "🇮🇩 印尼籍"
                      };
                      return map[c] || c;
                    })()}
                  </span>
                </div>
              </div>

              {/* If already paid, display the status banner here */}
              {payouts[`${selectedPayslipEmp.emp.id}_${selectedMonth}`] && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-center relative overflow-hidden flex flex-col items-center justify-center gap-1.5">
                  <div className="absolute -right-3 -bottom-3 text-emerald-200/10 font-mono text-4xl font-black tracking-widest pointer-events-none select-none uppercase rotate-12">
                    PAID
                  </div>
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 animate-pulse" />
                  <span className="text-xs font-bold text-emerald-800">{getTranslation("payslip_status_paid", lang)}</span>
                  <p className="text-[10px] text-emerald-600 leading-relaxed font-medium">
                    {getTranslation("payslip_status_paid_desc", lang)}
                  </p>
                </div>
              )}

              {/* Data breakdowns */}
              <div className="space-y-2 text-xs">
                <p className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">{getTranslation("payslip_attendance_summary", lang)}</p>
                <div className="p-3 bg-slate-50 rounded-lg space-y-2 font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-500">{getTranslation("payslip_standard_hours", lang)}</span>
                    <span className="font-semibold text-slate-800">{config.standardHours} {lang === 'en' ? "hrs/day" : lang === 'th' ? "ชม./วัน" : lang === 'zh-TW' ? "小時/天" : "小时/天"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">{getTranslation("payslip_working_days", lang)}</span>
                    <span className="font-bold text-slate-800">{selectedPayslipEmp.workingDays} {lang === 'en' ? " days" : lang === 'th' ? " วัน" : lang === 'zh-TW' ? " 天" : " 天"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">{getTranslation("payslip_total_hours", lang)}</span>
                    <span className="font-semibold text-slate-800">{formatDuration(selectedPayslipEmp.valid)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">{getTranslation("payslip_ot_hours", lang)}</span>
                    <span className="font-bold text-blue-600">{formatDuration(selectedPayslipEmp.ot)} ({selectedPayslipEmp.otCount}{lang === 'en' ? " times" : lang === 'th' ? " ครั้ง" : lang === 'zh-TW' ? "次" : "次"})</span>
                  </div>
                </div>
              </div>

              {/* Wage details */}
              <div className="space-y-2 text-xs">
                <p className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">{getTranslation("payslip_breakdown_title", lang)}</p>
                <div className="p-3 bg-slate-50 rounded-lg space-y-2 font-mono">
                  
                  {selectedPayslipEmp.emp.baseMonthlyWage !== undefined && selectedPayslipEmp.emp.baseMonthlyWage > 0 ? (
                    <div className="flex justify-between border-b border-slate-100 pb-1.5">
                      <span className="text-slate-500">{getTranslation("payslip_basic_wage_monthly", lang)}</span>
                      <span className="text-slate-800">
                        {formatCurrency(selectedPayslipEmp.emp.baseMonthlyWage, selectedPayslipEmp.emp.currency)} {lang === 'en' ? "/mo" : lang === 'th' ? "/เดือน" : lang === 'zh-TW' ? "/月" : "/月"}
                      </span>
                    </div>
                  ) : null}

                  <div className="flex justify-between">
                    <span className="text-slate-500">
                      {selectedPayslipEmp.emp.baseMonthlyWage !== undefined && selectedPayslipEmp.emp.baseMonthlyWage > 0
                        ? (lang === 'en' ? `Basic Salary (Monthly / 30 × ${selectedPayslipEmp.workingDays} days):` : lang === 'th' ? `ฐานเงินเดือน (คิดรายเดือน / 30 × ${selectedPayslipEmp.workingDays} วัน):` : `基础工资 (月薪折算/30 × ${selectedPayslipEmp.workingDays}天):`)
                        : selectedPayslipEmp.emp.dailyWage !== undefined && selectedPayslipEmp.emp.dailyWage > 0
                          ? (lang === 'en' ? `Basic Salary (Daily × ${selectedPayslipEmp.workingDays} days):` : lang === 'th' ? `ฐานเงินเดือน (รายวัน × ${selectedPayslipEmp.workingDays} วัน):` : `基础工资 (固定日薪 × ${selectedPayslipEmp.workingDays}天):`)
                          : (lang === 'en' ? `Basic Salary (Hourly × ${formatDuration(selectedPayslipEmp.valid - selectedPayslipEmp.ot)}h):` : lang === 'th' ? `ฐานเงินเดือน (รายชั่วโมง × ${formatDuration(selectedPayslipEmp.valid - selectedPayslipEmp.ot)} ชม.):` : `基础工资 (时薪计件 × ${formatDuration(selectedPayslipEmp.valid - selectedPayslipEmp.ot)}h):`)
                      }
                    </span>
                    <span className="font-bold text-slate-800 text-right">
                      {formatCurrency(selectedPayslipEmp.basePay, selectedPayslipEmp.emp.currency)}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-500">
                      {lang === 'en' ? `Overtime (Hourly × ${selectedPayslipEmp.ot.toFixed(1)}h):` : lang === 'th' ? `ค่าล่วงเวลา (รายชั่วโมง × ${selectedPayslipEmp.ot.toFixed(1)} ชม.):` : `加班应得 (时薪 × ${selectedPayslipEmp.ot.toFixed(1)}h):`}
                    </span>
                    <span className="font-bold text-green-600 text-right">
                      + {formatCurrency(selectedPayslipEmp.otPay, selectedPayslipEmp.emp.currency)}
                    </span>
                  </div>

                  {selectedPayslipEmp.emp.attendanceBonus !== undefined && selectedPayslipEmp.emp.attendanceBonus > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">{getTranslation("payslip_attendance_bonus", lang)}</span>
                      <span className="font-bold text-emerald-600 text-right">
                        + {formatCurrency(selectedPayslipEmp.emp.attendanceBonus, selectedPayslipEmp.emp.currency)}
                      </span>
                    </div>
                  )}

                  {selectedPayslipEmp.mealAllowance !== undefined && selectedPayslipEmp.mealAllowance > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">{getTranslation("payslip_meal_allowance", lang)}</span>
                      <span className="font-bold text-amber-600 text-right">
                        + {formatCurrency(selectedPayslipEmp.mealAllowance, selectedPayslipEmp.emp.currency)}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between">
                    <span className="text-slate-500">
                      {lang === 'en' ? `Withholding Tax (${(((config?.taxRate ?? 0.05)) * 100).toFixed(0)}%):` : lang === 'th' ? `หักภาษี ณ ที่จ่าย (${(((config?.taxRate ?? 0.05)) * 100).toFixed(0)}%):` : `所得税代扣 (${((config?.taxRate ?? 0.05)) * 100}%):`}
                    </span>
                    <span className="text-red-500 text-right">
                      - {formatCurrency((Number(selectedPayslipEmp.basePay || 0) + Number(selectedPayslipEmp.otPay || 0) + Number(selectedPayslipEmp.emp.attendanceBonus || 0)) * (config?.taxRate ?? 0.05), selectedPayslipEmp.emp.currency)}
                    </span>
                  </div>

                  {selectedPayslipEmp.emp.socialSecurity !== undefined && selectedPayslipEmp.emp.socialSecurity > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">{getTranslation("payslip_social_security", lang)}</span>
                      <span className="font-bold text-rose-600 text-right">
                        - {formatCurrency(selectedPayslipEmp.emp.socialSecurity, selectedPayslipEmp.emp.currency)}
                      </span>
                    </div>
                  )}

                  {selectedPayslipEmp.emp.sourceType === '劳务派遣' && (
                    <div className="flex justify-between border-t border-dashed border-slate-200 pt-1.5 mt-1.5">
                      <span className="text-teal-600 font-semibold">
                        {lang === 'en' ? `Dispatch Commission (${selectedPayslipEmp.emp.dispatchCommissionRate ?? 0}% - Basic Pay):` : lang === 'th' ? `ค่าธรรมเนียมส่งตัว (${selectedPayslipEmp.emp.dispatchCommissionRate ?? 0}% - ฐานเงินเดือน):` : `派遣抽佣 (${selectedPayslipEmp.emp.dispatchCommissionRate ?? 0}% - 仅限基本薪资):`}
                      </span>
                      <span className="font-bold text-teal-600 text-right">
                        + {formatCurrency(selectedPayslipEmp.serviceFee ?? 0, selectedPayslipEmp.emp.currency)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* NET SALARY TO PAY */}
              <div className="bg-brand-50 p-4 rounded-xl border border-brand-100 text-center space-y-1">
                <span className="text-xs text-brand-600 font-bold block">{getTranslation("payslip_net_salary", lang)}</span>
                <p className="text-3xl font-extrabold text-brand-800 font-mono">
                  {formatCurrency(selectedPayslipEmp.net, selectedPayslipEmp.emp.currency)}
                </p>
                <span className="text-[10px] text-brand-500 block">
                  {getTranslation("payslip_currency_type", lang)}
                  {selectedPayslipEmp.emp.currency === 'THB' 
                    ? (lang === 'en' ? "Thai Baht (THB)" : lang === 'th' ? "บาทไทย (THB)" : lang === 'zh-TW' ? "泰銖 (THB)" : "泰铢 (THB)") 
                    : selectedPayslipEmp.emp.currency}
                </span>
              </div>

              {/* Handover physical action signature (used for pay out) */}
              {!payouts[`${selectedPayslipEmp.emp.id}_${selectedMonth}`] && (
                <div className="bg-slate-50 rounded-lg p-3.5 border border-slate-200/60 space-y-3">
                  <div className="flex items-start gap-2.5">
                    <input
                      type="checkbox"
                      id="isCashPaidCheckbox"
                      checked={isCashPaid}
                      onChange={(e) => setIsCashPaid(e.target.checked)}
                      className="w-4 h-4 mt-0.5 rounded text-brand-600 border-slate-300 focus:ring-brand-500 outline-none cursor-pointer"
                    />
                    <label htmlFor="isCashPaidCheckbox" className="text-xs text-slate-600 select-none cursor-pointer font-semibold">
                      {lang === 'en' ? "Confirm company funds have been paid in full (cash or online bank transfer)" : lang === 'th' ? "ยืนยันการชำระเงินเต็มจำนวนแล้ว (เงินสดหรือโอนผ่านธนาคาร)" : lang === 'zh-TW' ? "確認企業款項已足額支付（現金發放或網銀已轉帳）" : "确认企业款项已足额支付（现金发放或网银已转账）"}
                    </label>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">
                      {lang === 'en' ? "Employee e-signature / HR Stamp to Settle:" : lang === 'th' ? "ลายเซ็นพนักงาน / ผู้ดูแลระบบลงชื่อยืนยัน:" : lang === 'zh-TW' ? "員工電子簽名/HR 簽章核銷:" : "员工电子签名/HR 签章核销:"}
                    </label>
                    <input
                      type="text"
                      placeholder={lang === 'en' ? "Enter handler or employee signature (e.g. Jane / HR)" : lang === 'th' ? "ลงลายเซ็นผู้ทำรายการหรือพนักงาน (เช่น สมชาย / HR)" : lang === 'zh-TW' ? "輸入經辦人或員工簽名 (如: Thin Thin / HR)" : "输入经办人或员工签名 (如: Thin Thin / HR)"}
                      value={signName}
                      onChange={(e) => setSignName(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs placeholder-slate-400 outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent font-sans"
                    />
                  </div>
                </div>
              )}

            </div>

            {/* Modal Actions */}
            <div className="bg-slate-50 p-4 border-t border-slate-100 flex gap-3">
              {payouts[`${selectedPayslipEmp.emp.id}_${selectedMonth}`] ? (
                <button
                  type="button"
                  onClick={() => { setShowSlipModal(false); setSelectedPayslipEmp(null); }}
                  className="flex-1 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-lg text-sm transition shadow-sm hover:shadow text-center cursor-pointer"
                >
                  {lang === 'en' ? "Close Slip" : lang === 'th' ? "ปิดสลิป" : lang === 'zh-TW' ? "關閉工資條" : "关闭工资条"}
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => { setShowSlipModal(false); setSelectedPayslipEmp(null); }}
                    className="flex-1 py-2 border border-slate-200 text-slate-500 font-medium rounded-lg text-sm bg-white hover:bg-slate-50 transition"
                  >
                    {lang === 'en' ? "Cancel" : lang === 'th' ? "ยกเลิก" : lang === 'zh-TW' ? "取消" : "取消"}
                  </button>
                  
                  <button
                    type="button"
                    onClick={submitPayslipConfirm}
                    disabled={!isCashPaid || !signName.trim()}
                    className={`flex-1 py-2 text-white font-bold rounded-lg text-sm transition shadow-sm hover:shadow flex items-center justify-center gap-1 ${
                      isCashPaid && signName.trim()
                        ? 'bg-brand-600 hover:bg-brand-700' 
                        : 'bg-slate-300 cursor-not-allowed'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{lang === 'en' ? "Confirm Payment" : lang === 'th' ? "ยืนยันการจ่ายเงิน" : lang === 'zh-TW' ? "確認發放薪資" : "确认发放薪资"}</span>
                  </button>
                </>
              )}
            </div>

          </div>
        </div>
      )}

      {/* Custom Confirmation Modal */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl border border-slate-100 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className={`p-2.5 rounded-full shrink-0 ${
                  confirmDialog.type === 'danger' 
                    ? 'bg-red-50 text-red-600' 
                    : confirmDialog.type === 'warning' 
                      ? 'bg-amber-50 text-amber-600' 
                      : 'bg-blue-50 text-blue-600'
                }`}>
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div className="space-y-1.5 flex-1 text-left">
                  <h3 className="text-base font-bold text-slate-900">
                    {confirmDialog.title}
                  </h3>
                  <p className="text-sm text-slate-500 leading-relaxed">
                    {confirmDialog.message}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-slate-50 px-6 py-4 flex justify-end gap-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition"
              >
                {confirmDialog.cancelText || "取消"}
              </button>
              <button
                type="button"
                onClick={confirmDialog.onConfirm}
                className={`px-4 py-2 text-sm font-semibold text-white rounded-lg transition shadow-sm hover:shadow ${
                  confirmDialog.type === 'danger'
                    ? 'bg-red-600 hover:bg-red-700'
                    : confirmDialog.type === 'warning'
                      ? 'bg-amber-500 hover:bg-amber-600'
                      : 'bg-brand-600 hover:bg-brand-700'
                }`}
              >
                {confirmDialog.confirmText || "确定"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

