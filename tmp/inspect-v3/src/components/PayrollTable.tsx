/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AppConfig, AttendanceRecord, Employee, PayrollSummary } from "../types";
import { calcAttendanceDetails, formatCurrency, formatDuration } from "../lib/utils";
import { useMemo, useState, useEffect } from "react";
import { Calendar, DollarSign, CheckCircle2, AlertCircle, TrendingUp, Download, Receipt, Check, RotateCcw, Search, Filter, Clock } from "lucide-react";

interface PayrollTableProps {
  employees: Employee[];
  attendance: AttendanceRecord[];
  config: AppConfig;
}

export function PayrollTable({ employees, attendance, config }: PayrollTableProps) {
  // Extract all distinct months available in attendance log
  const availableMonths = useMemo(() => {
    const list = attendance.map(r => r.date.slice(0, 7)).filter(Boolean);
    const unique = [...new Set(list)];
    
    // Ensure current month is always present as a safety choice
    const currentMonthStr = new Date().toISOString().slice(0, 7);
    if (!unique.includes(currentMonthStr)) {
      unique.push(currentMonthStr);
    }
    
    return unique.sort().reverse(); // Show newest month first
  }, [attendance]);

  // Selected Month State (defaults to the newest available month with records)
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const dates = attendance.map(r => r.date.slice(0, 7)).filter(Boolean);
    const unique = [...new Set(dates)].sort().reverse();
    return unique.length > 0 ? unique[0] : new Date().toISOString().slice(0, 7);
  });

  // UI Filter and Search State
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending'>('all');

  // Payout dictionary stored in localStorage: { "${empId}_${YYYY-MM}": true/false }
  const [payouts, setPayouts] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem("payroll_payout_status");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Save payouts to localStorage
  useEffect(() => {
    localStorage.setItem("payroll_payout_status", JSON.stringify(payouts));
  }, [payouts]);

  // Payslip Modal State
  const [selectedPayslipEmp, setSelectedPayslipEmp] = useState<PayrollSummary | null>(null);
  const [showSlipModal, setShowSlipModal] = useState(false);
  const [signName, setSignName] = useState("");
  const [isCashPaid, setIsCashPaid] = useState(false);

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

      // Calculate details for this employee based on filtered month attendance
      filteredAttendance.filter(r => r.empId === emp.id).forEach(rec => {
        const d = calcAttendanceDetails(rec, config);
        valid += d.valid;
        ot += d.ot;
        otPay += d.ot * config.otHourlyFee;

        if (d.ot > 0) {
          otCount += 1;
        }

        const isAbsentOrLeave = emp.status === '休假' || rec.type === 'absent' || rec.type === 'leave';
        if (!isAbsentOrLeave) {
          workingDays += 1;
          const hasBaseWage = emp.baseMonthlyWage !== undefined && emp.baseMonthlyWage !== null && emp.baseMonthlyWage > 0;
          if (hasBaseWage) {
            basePay += emp.baseMonthlyWage / 30; // Daily converted wage from base monthly salary
          } else {
            basePay += (d.valid - d.ot) * (emp.hourlyRate ?? 0); // Normal working hours * hourly rate
          }
        }
      });
      
      const bonus = emp.attendanceBonus ?? 0;
      const ssSec = emp.socialSecurity ?? 0;
      const gross = basePay + otPay + bonus;
      const tax = gross * config.taxRate;
      const net = Math.max(0, gross - tax - ssSec);
      
      return { 
        emp, 
        valid, 
        ot, 
        basePay, 
        otPay, 
        gross, 
        net,
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

  // Quick Action: Payout or Retract
  const handleTogglePayout = (empId: number) => {
    const key = `${empId}_${selectedMonth}`;
    setPayouts(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Quick Action: Mark All as Paid for this Selected Month
  const handleMarkAllPaid = () => {
    if (window.confirm(`确定要将当前选择月份 (${selectedMonth}) 的所有在职员工都标记为“已发放”吗？`)) {
      const updated = { ...payouts };
      employees.forEach(emp => {
        updated[`${emp.id}_${selectedMonth}`] = true;
      });
      setPayouts(updated);
    }
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
    setShowSlipModal(false);
    setSelectedPayslipEmp(null);
  };

  // Export current month payroll to CSV
  const handleExportCSV = () => {
    const headers = [
      "员工工号", "姓名", "国籍", "所属部门", "职位", "正常薪资标准/时", "底薪折算/天", 
      "上班天数", "有效总工时", "加班次数", "加班总时长", "基础应发薪资", "加班实发薪资", 
      "所得税率", "税后实发工资", "币种", "发放状态"
    ];

    const rows = payrollSummary.map(row => {
      const payoutKey = `${row.emp.id}_${selectedMonth}`;
      const isPaid = payouts[payoutKey] ? "已发放" : "待发放";
      const hasBaseWage = row.emp.baseMonthlyWage !== undefined && row.emp.baseMonthlyWage !== null && row.emp.baseMonthlyWage > 0;
      
      const hourlyRateStr = hasBaseWage ? ((row.emp.baseMonthlyWage! / 30) / config.standardHours).toFixed(2) : (row.emp.hourlyRate ?? 0).toString();
      const dailyWageStr = hasBaseWage ? (row.emp.baseMonthlyWage! / 30).toFixed(2) : (config.standardHours * (row.emp.hourlyRate ?? 0)).toFixed(2);

      return [
        row.emp.id,
        `"${row.emp.name}"`,
        row.emp.country === "MM" ? "缅甸" : "泰国",
        `"${row.emp.dept || "-"}"`,
        `"${row.emp.role}"`,
        hourlyRateStr,
        dailyWageStr,
        row.workingDays,
        row.valid.toFixed(2),
        row.otCount,
        row.ot.toFixed(2),
        row.basePay.toFixed(2),
        row.otPay.toFixed(2),
        `${(config.taxRate * 100).toFixed(0)}%`,
        row.net.toFixed(2),
        row.emp.currency,
        isPaid
      ];
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `员工薪资报表_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      
      {/* Dynamic Month Selector Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
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
          {/* Quick Select Month */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">快捷月份:</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-mono text-sm focus:ring-2 focus:ring-brand-500 outline-none cursor-pointer"
            >
              {availableMonths.map(m => (
                <option key={m} value={m}>{m}月</option>
              ))}
            </select>
          </div>

          {/* Native picker support for any other custom months */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">自定义:</span>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => {
                if (e.target.value) setSelectedMonth(e.target.value);
              }}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-mono text-sm focus:ring-2 focus:ring-brand-500 outline-none cursor-pointer"
            />
          </div>

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
          <p className="text-2xl font-bold font-mono text-slate-800 mt-1">{formatCurrency(metrics.totalExpected, 'THB')}</p>
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
          <p className="text-2xl font-bold font-mono text-emerald-600 mt-1">{formatCurrency(metrics.totalPaid, 'THB')}</p>
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
          <p className="text-2xl font-bold font-mono text-amber-600 mt-1">{formatCurrency(metrics.totalPending, 'THB')}</p>
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
      <div className="glass-panel rounded-xl shadow-sm overflow-hidden border border-slate-100 bg-white">
        
        {/* Table Filters and Search Bar */}
        <div className="p-4 bg-slate-50 border-b border-slate-100 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
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
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-64 pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-brand-500"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            </div>

            {/* Quick action: sign all */}
            <button
              onClick={handleMarkAllPaid}
              disabled={metrics.paidCount === metrics.totalCount}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1 transition ${
                metrics.paidCount === metrics.totalCount 
                  ? 'bg-slate-100 text-slate-300 border border-slate-200' 
                  : 'bg-indigo-50 border border-indigo-100 text-indigo-700 hover:bg-indigo-100'
              }`}
            >
              <Check className="w-3.5 h-3.5" />
              <span>本月全员核销发放</span>
            </button>
          </div>
        </div>

        {/* Salaries Table Grid */}
        <div className="overflow-x-auto">
          {tableRows.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <Receipt className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <p className="text-sm">没有找到符合筛选条件的员工薪资数据</p>
              <p className="text-xs text-slate-300 mt-1">请核对是否已为该月份 "{selectedMonth}" 录入过任何员工的出勤卡</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 text-slate-500 text-xs uppercase border-b border-slate-100">
                  <th className="px-6 py-3.5 font-semibold">员工详情</th>
                  <th className="px-4 py-3.5 font-semibold text-center">上班天数</th>
                  <th className="px-4 py-3.5 font-semibold text-center">有效工时</th>
                  <th className="px-4 py-3.5 font-semibold text-center text-blue-500">加班</th>
                  <th className="px-4 py-3.5 font-semibold text-center text-blue-600">总加班时长</th>
                  <th className="px-6 py-3.5 font-semibold text-right">计算基薪 (应发)</th>
                  <th className="px-6 py-3.5 font-semibold text-right text-green-600">加班费</th>
                  <th className="px-6 py-3.5 font-semibold text-right text-emerald-600">全勤奖</th>
                  <th className="px-6 py-3.5 font-semibold text-right text-rose-600">社保</th>
                  <th className="px-6 py-3.5 font-semibold text-right text-blue-700">税后实发 (总额)</th>
                  <th className="px-6 py-3.5 font-semibold text-center">发放状态 / 动作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tableRows.map((row) => {
                  const { emp, valid, ot, basePay, otPay, net, workingDays, otCount } = row;
                  const payoutKey = `${emp.id}_${selectedMonth}`;
                  const isPaid = !!payouts[payoutKey];

                  return (
                    <tr key={emp.id} className="hover:bg-slate-50/70 border-b border-slate-100 bg-white transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold overflow-hidden border-2 border-white shadow-sm flex-shrink-0">
                            {emp.photo ? (
                              <img src={emp.photo} className="w-full h-full object-cover" alt="" />
                            ) : (
                              <span style={{ fontSize: '14.4px' }}>{emp.name.charAt(0)}</span>
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 truncate max-w-[150px]">{emp.name}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">{emp.dept || "未分配"} · {emp.role}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold font-mono text-xs">
                          {workingDays} 天
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center text-xs font-mono text-slate-600">
                        {formatDuration(valid)}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 font-semibold font-mono text-xs">
                          {otCount} 次
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center text-xs font-mono text-blue-600 font-bold">
                        {formatDuration(ot)}
                      </td>
                      <td className="px-6 py-4 text-right text-xs font-mono text-slate-600">
                        {formatCurrency(basePay, emp.currency)}
                      </td>
                      <td className="px-6 py-4 text-right text-xs font-mono text-green-600 font-semibold">
                        {formatCurrency(otPay, emp.currency)}
                      </td>
                      <td className="px-6 py-4 text-right text-xs font-mono text-emerald-600 font-semibold">
                        {emp.attendanceBonus !== undefined && emp.attendanceBonus > 0 
                          ? formatCurrency(emp.attendanceBonus, emp.currency) 
                          : '-'}
                      </td>
                      <td className="px-6 py-4 text-right text-xs font-mono text-rose-600 font-semibold">
                        {emp.socialSecurity !== undefined && emp.socialSecurity > 0 
                          ? formatCurrency(emp.socialSecurity, emp.currency) 
                          : '-'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-sm font-bold font-mono text-blue-800">
                          {formatCurrency(net, emp.currency)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {isPaid ? (
                            <div className="flex items-center gap-1.5">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 rounded-lg border border-emerald-100">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                                已发放
                              </span>
                              <button
                                onClick={() => handleTogglePayout(emp.id)}
                                title="取消发放状态"
                                className="p-1 hover:bg-slate-100 text-slate-400 hover:text-red-500 rounded transition"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-amber-700 bg-amber-50 rounded-lg border border-amber-100">
                                待发放
                              </span>
                              <button
                                onClick={() => handleOpenPayslip(row)}
                                className="px-2.5 py-1 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-sm hover:shadow transition flex items-center gap-1"
                              >
                                <Receipt className="w-3 h-3" />
                                <span>生成工资条</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Bottom Total Summary of filtering */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center text-xs text-slate-500">
          <div>
            当前列表共显示 <span className="font-bold text-slate-700">{tableRows.length}</span> 名员工的计算记录
          </div>
          <div>
            薪资发放由人事及仓库管理员校对后，可通过<span className="font-bold text-slate-700">【生成工资条】</span>开启独立签收单，一键核对实缴
          </div>
        </div>
      </div>

      {/* Interactive Beautiful Payslip Modal (工资单) */}
      {showSlipModal && selectedPayslipEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100 transform scale-100 transition-all flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="bg-brand-600 text-white p-5 flex justify-between items-start">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider bg-brand-500/50 text-brand-100 px-2 py-0.5 rounded-full">
                  MONTHLY SALARY RECEIPT
                </span>
                <h3 className="text-lg font-bold mt-1">员工工资发放明细单</h3>
                <p className="text-xs text-brand-200 mt-0.5">月份：{selectedMonth} · 核对及现场发放核销</p>
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
                  <p className="text-xs text-slate-500">{selectedPayslipEmp.emp.dept || "全区"} · {selectedPayslipEmp.emp.role}</p>
                </div>
                <div className="ml-auto text-right">
                  <span className="text-xs text-slate-400 block font-mono">ID: #{selectedPayslipEmp.emp.id}</span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 mt-1 inline-block">
                    {selectedPayslipEmp.emp.country === "MM" ? "🇲🇲 缅甸籍" : "🇹🇭 泰国籍"}
                  </span>
                </div>
              </div>

              {/* Data breakdowns */}
              <div className="space-y-2 border-t border-b border-dashed border-slate-200 py-3.5 font-mono text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">标准计薪时限 (每日):</span>
                  <span className="font-semibold text-slate-800">{config.standardHours} 小时/天</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">本月有效上班天数:</span>
                  <span className="font-bold text-slate-800">{selectedPayslipEmp.workingDays} 天</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">本月累计上班工时:</span>
                  <span className="font-semibold text-slate-800">{formatDuration(selectedPayslipEmp.valid)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">本月有效加班工时:</span>
                  <span className="font-bold text-blue-600">{formatDuration(selectedPayslipEmp.ot)} ({selectedPayslipEmp.otCount}次)</span>
                </div>
              </div>

              {/* Wage details */}
              <div className="space-y-2 text-xs">
                <p className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">应纳发计算说明</p>
                <div className="p-3 bg-slate-50 rounded-lg space-y-2 font-mono">
                  
                  {selectedPayslipEmp.emp.baseMonthlyWage !== undefined && selectedPayslipEmp.emp.baseMonthlyWage > 0 ? (
                    <div className="flex justify-between border-b border-slate-100 pb-1.5">
                      <span className="text-slate-500">基础工资 (月薪计):</span>
                      <span className="text-slate-800">
                        {formatCurrency(selectedPayslipEmp.emp.baseMonthlyWage, selectedPayslipEmp.emp.currency)} /月
                      </span>
                    </div>
                  ) : null}

                  <div className="flex justify-between">
                    <span className="text-slate-500">核算天数工资 (底薪/30 × {selectedPayslipEmp.workingDays}天):</span>
                    <span className="font-bold text-slate-800 text-right">
                      {formatCurrency(selectedPayslipEmp.basePay, selectedPayslipEmp.emp.currency)}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-500">加班应得 (时薪 × {selectedPayslipEmp.ot.toFixed(1)}h):</span>
                    <span className="font-bold text-green-600 text-right">
                      + {formatCurrency(selectedPayslipEmp.otPay, selectedPayslipEmp.emp.currency)}
                    </span>
                  </div>

                  {selectedPayslipEmp.emp.attendanceBonus !== undefined && selectedPayslipEmp.emp.attendanceBonus > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">全勤奖 (津贴):</span>
                      <span className="font-bold text-emerald-600 text-right">
                        + {formatCurrency(selectedPayslipEmp.emp.attendanceBonus, selectedPayslipEmp.emp.currency)}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between">
                    <span className="text-slate-500">所得税代扣 ({config.taxRate * 100}%):</span>
                    <span className="text-red-500 text-right">
                      - {formatCurrency((selectedPayslipEmp.basePay + selectedPayslipEmp.otPay + (selectedPayslipEmp.emp.attendanceBonus ?? 0)) * config.taxRate, selectedPayslipEmp.emp.currency)}
                    </span>
                  </div>

                  {selectedPayslipEmp.emp.socialSecurity !== undefined && selectedPayslipEmp.emp.socialSecurity > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">社保扣款:</span>
                      <span className="font-bold text-rose-600 text-right">
                        - {formatCurrency(selectedPayslipEmp.emp.socialSecurity, selectedPayslipEmp.emp.currency)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* NET SALARY TO PAY */}
              <div className="bg-brand-50 p-4 rounded-xl border border-brand-100 text-center space-y-1">
                <span className="text-xs text-brand-600 font-bold block">本月实际应发放 (税后净得)</span>
                <p className="text-3xl font-extrabold text-brand-800 font-mono">
                  {formatCurrency(selectedPayslipEmp.net, selectedPayslipEmp.emp.currency)}
                </p>
                <span className="text-[10px] text-brand-500 block">发放币种：{selectedPayslipEmp.emp.currency === 'THB' ? '泰铢 (THB)' : selectedPayslipEmp.emp.currency}</span>
              </div>

              {/* Handover physical action signature (used for pay out) */}
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
                    确认企业款项已足额支付（现金发放或网银已转账）
                  </label>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">员工电子签名/HR 签章核销:</label>
                  <input
                    type="text"
                    placeholder="输入经办人或员工签名 (如: Thin Thin / HR)"
                    value={signName}
                    onChange={(e) => setSignName(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs placeholder-slate-400 outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent font-sans"
                  />
                </div>
              </div>

            </div>

            {/* Modal Actions */}
            <div className="bg-slate-50 p-4 border-t border-slate-100 flex gap-3">
              <button
                type="button"
                onClick={() => { setShowSlipModal(false); setSelectedPayslipEmp(null); }}
                className="flex-1 py-2 border border-slate-200 text-slate-500 font-medium rounded-lg text-sm bg-white hover:bg-slate-50 transition"
              >
                取消
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
                <span>核销并确认已发放</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

