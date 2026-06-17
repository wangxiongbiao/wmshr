/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Settings, Edit, Download } from "lucide-react";
import { AppConfig, AttendanceRecord, Employee } from "../types";
import { cn, calcAttendanceDetails, formatCurrency, formatDuration } from "../lib/utils";
import { useMemo, useState } from "react";

interface AttendanceTableProps {
  employees: Employee[];
  attendance: AttendanceRecord[];
  config: AppConfig;
  selectedIds: Set<string>;
  onSelect: (id: string, checked: boolean) => void;
  onSelectAll: (ids: string[]) => void;
  onOpenSettings: () => void;
  onEditRecord: (id: string | null, empId?: number, date?: string) => void;
}

export function AttendanceTable({
  employees,
  attendance,
  config,
  selectedIds,
  onSelect,
  onSelectAll,
  onOpenSettings,
  onEditRecord
}: AttendanceTableProps) {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | 'all'>('all');
  const [timeFilterType, setTimeFilterType] = useState<'all' | 'day' | 'month'>('all');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>('');

  const handleExportCSV = () => {
    // Generate headers
    const headers = [
      "日期", "员工姓名", "来源国家", "性别", "职位", "所属区域", 
      "时薪", "基本日薪", "上班时间", "下班时间", "有效工时", "加班工时", 
      "今天上班费用", "加班费", "合计费用", "考勤状态", "备注"
    ];

    const rows = flatRows.map(row => {
      const { emp, rec, date } = row;
      let details = { valid: 0, ot: 0 };
      let typeName = "缺勤";

      if (emp.status === '休假') {
        typeName = "假期";
      } else if (rec) {
        details = calcAttendanceDetails(rec, config);
        const typeNames: Record<string, string> = {
          normal: '正常',
          late: '迟到',
          early: '早退',
          absent: '缺勤',
          leave: '假期',
          overtime: '加班'
        };
        typeName = typeNames[rec.type] || '正常';
      }

      const isAbsentOrLeave = emp.status === '休假' || !rec || rec.type === 'absent' || rec.type === 'leave';
      const hasBaseWage = emp.baseMonthlyWage !== undefined && emp.baseMonthlyWage !== null && emp.baseMonthlyWage > 0;
      const shiftPay = isAbsentOrLeave 
        ? 0 
        : (hasBaseWage 
            ? (emp.baseMonthlyWage / 30) 
            : ((details.valid - details.ot) * (emp.hourlyRate ?? 0))
          );
      const otPay = details.ot * config.otHourlyFee;
      const totalPay = shiftPay + otPay;
      const countryNames: Record<string, string> = { MM: '缅甸', TH: '泰国', CN: '中国', VN: '越南', KH: '柬埔寨' };

      const displayHourlyRate = hasBaseWage ? ((emp.baseMonthlyWage / 30) / config.standardHours) : (emp.hourlyRate ?? 0);
      const displayDailyWage = hasBaseWage ? (emp.baseMonthlyWage / 30) : (config.standardHours * (emp.hourlyRate ?? 0));

      return [
        date,
        emp.name,
        countryNames[emp.country] || emp.country,
        emp.gender === 'female' ? '女' : '男',
        emp.role,
        emp.dept,
        displayHourlyRate.toFixed(2) + " " + emp.currency,
        displayDailyWage.toFixed(2) + " " + emp.currency,
        rec?.inTime || '-',
        rec?.outTime || '-',
        details.valid.toFixed(2) + 'h',
        details.ot.toFixed(2) + 'h',
        shiftPay.toFixed(2) + " " + emp.currency,
        otPay.toFixed(2) + " " + emp.currency,
        totalPay.toFixed(2) + " " + emp.currency,
        typeName,
        rec?.note || ''
      ];
    });

    // Create CSV content (UTF-8 with BOM representing Chinese characters properly in Excel)
    const csvContent = "\ufeff" + [
      headers.map(h => `"${h.replace(/"/g, '""')}"`).join(","),
      ...rows.map(r => r.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `海外仓考勤报表_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const allDates = useMemo(() => {
    const dateSet = new Set<string>();
    attendance.forEach(r => dateSet.add(r.date));
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    dateSet.add(today);
    dateSet.add(yesterday);
    return Array.from(dateSet).sort().reverse();
  }, [attendance]);

  const flatRows = useMemo(() => {
    let rows: { emp: Employee; rec: AttendanceRecord | null; date: string }[] = [];
    allDates.forEach(date => {
      employees.forEach(emp => {
        const rec = attendance.find(a => a.empId === emp.id && a.date === date) || null;
        rows.push({ emp, rec, date });
      });
    });

    // Apply Employee filter
    if (selectedEmployeeId !== 'all') {
      rows = rows.filter(r => r.emp.id === selectedEmployeeId);
    }

    // Apply Time filter
    if (timeFilterType === 'day' && selectedDate) {
      rows = rows.filter(r => r.date === selectedDate);
    } else if (timeFilterType === 'month' && selectedMonth) {
      rows = rows.filter(r => r.date.startsWith(selectedMonth));
    }

    return rows.sort((a, b) => {
      if (a.date !== b.date) return b.date.localeCompare(a.date);
      return a.emp.name.localeCompare(b.emp.name);
    });
  }, [allDates, employees, attendance, selectedEmployeeId, timeFilterType, selectedDate, selectedMonth]);

  const visibleAttendanceRecords = useMemo(() => {
    const list: AttendanceRecord[] = [];
    flatRows.forEach(row => {
      if (row.rec) {
        list.push(row.rec);
      }
    });
    return list;
  }, [flatRows]);

  const isAllSelected = useMemo(() => {
    if (visibleAttendanceRecords.length === 0) return false;
    return visibleAttendanceRecords.every(r => selectedIds.has(r.id));
  }, [visibleAttendanceRecords, selectedIds]);

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Dynamic Filter Panel */}
      <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col md:flex-row gap-4 items-end md:items-center text-sm">
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
          {/* Employee Picker */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">筛选员工</label>
            <select
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none bg-white text-slate-700 h-[38px] text-sm cursor-pointer"
            >
              <option value="all">🔍 所有员工 (全部)</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} ({emp.role})
                </option>
              ))}
            </select>
          </div>

          {/* Time Filter Picker */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">时间筛选方式</label>
            <select
              value={timeFilterType}
              onChange={(e) => {
                const val = e.target.value as 'all' | 'day' | 'month';
                setTimeFilterType(val);
                if (val === 'day' && !selectedDate) {
                  // Find latest date from records if possible, otherwise default to today
                  const latest = attendance.length > 0 ? attendance.sort((a,b) => b.date.localeCompare(a.date))[0].date : new Date().toISOString().split('T')[0];
                  setSelectedDate(latest);
                } else if (val === 'month' && !selectedMonth) {
                  const latestMonth = attendance.length > 0 ? attendance.sort((a,b) => b.date.localeCompare(a.date))[0].date.slice(0, 7) : new Date().toISOString().slice(0, 7);
                  setSelectedMonth(latestMonth);
                }
              }}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none bg-white text-slate-700 h-[38px] text-sm cursor-pointer"
            >
              <option value="all">📅 全部时间</option>
              <option value="day">📆 按天筛选</option>
              <option value="month">🗓️ 按月筛选</option>
            </select>
          </div>

          {/* Dynamic Inputs based on type Selection */}
          {timeFilterType === 'day' && (
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">选择具体日期</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-slate-700 h-[38px] text-sm font-mono"
              />
            </div>
          )}

          {timeFilterType === 'month' && (
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">选择目标月份</label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-slate-700 h-[38px] text-sm font-mono"
              />
            </div>
          )}

          {timeFilterType === 'all' && (
            <div className="hidden sm:block"></div>
          )}
        </div>

        <div className="flex gap-2 flex-shrink-0">
          {(selectedEmployeeId !== 'all' || timeFilterType !== 'all') && (
            <button
              onClick={() => {
                setSelectedEmployeeId('all');
                setTimeFilterType('all');
                setSelectedDate('');
                setSelectedMonth('');
              }}
              className="px-3.5 py-2 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition border border-red-200"
            >
              清除筛选条件
            </button>
          )}
        </div>
      </div>

      <div className="glass-panel rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-white flex justify-between items-center">
          <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
            <span>考勤明细与自动计算</span>
            {(selectedEmployeeId !== 'all' || timeFilterType !== 'all') && (
              <span className="text-xs bg-brand-50 text-brand-700 px-2 py-0.5 rounded-full font-normal border border-brand-100 animate-pulse">
                已启用筛选
              </span>
            )}
          </h3>
          <div className="flex gap-2">
            <button
              onClick={handleExportCSV}
              className="bg-brand-50 border border-brand-200 text-brand-700 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-brand-100 transition flex items-center gap-1.5"
              title="导出当前表格显示的数据为 CSV 文件"
            >
              <Download className="w-4 h-4" />
              导出当前数据
            </button>
            <button
              onClick={onOpenSettings}
              className="bg-white border border-slate-300 text-slate-700 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-slate-50 transition flex items-center gap-1.5"
            >
              <Settings className="w-4 h-4" />
              设置规则
            </button>
          </div>
        </div>

        <div className="overflow-x-auto overflow-y-auto max-h-[580px] relative">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-slate-500 text-xs uppercase border-b border-slate-100">
                <th className="sticky top-0 bg-white z-10 px-6 py-3 text-center w-10 border-b border-slate-100">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={(e) => {
                      if (e.target.checked) {
                        onSelectAll(visibleAttendanceRecords.map(r => r.id));
                      } else {
                        onSelectAll([]);
                      }
                    }}
                    className="w-4 h-4 accent-brand-600 cursor-pointer"
                  />
                </th>
                <th className="sticky top-0 bg-white z-10 px-6 py-3 font-medium text-left border-b border-slate-100">日期</th>
                <th className="sticky top-0 bg-white z-10 px-6 py-3 font-medium text-left border-b border-slate-100">员工</th>
                <th className="sticky top-0 bg-white z-10 px-6 py-3 font-medium text-center border-b border-slate-100">上班状态</th>
                <th className="sticky top-0 bg-white z-10 px-6 py-3 font-medium text-center border-b border-slate-100">上班</th>
                <th className="sticky top-0 bg-white z-10 px-6 py-3 font-medium text-center border-b border-slate-100">下班</th>
                <th className="sticky top-0 bg-white z-10 px-6 py-3 font-medium text-center border-b border-slate-100">有效工时</th>
                <th className="sticky top-0 bg-white z-10 px-6 py-3 font-medium text-center text-blue-600 border-b border-slate-100">加班时长</th>
                <th className="sticky top-0 bg-white z-10 px-6 py-3 font-medium text-right text-indigo-600 border-b border-slate-100">上班费用</th>
                <th className="sticky top-0 bg-white z-10 px-6 py-3 font-medium text-right text-green-600 border-b border-slate-100">加班费用</th>
                <th className="sticky top-0 bg-white z-10 px-6 py-3 font-medium text-right text-rose-600 border-b border-slate-100">合计费用</th>
                <th className="sticky top-0 bg-white z-10 px-6 py-3 font-medium text-center border-b border-slate-100">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {flatRows.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-6 py-12 text-center text-slate-400 text-sm">
                    没有找到符合筛选条件的考勤记录
                  </td>
                </tr>
              ) : (
                flatRows.map((row, idx) => {
                  const { emp, rec, date } = row;
                  const isSelected = rec ? selectedIds.has(rec.id) : false;
                  
                  let details = { valid: 0, ot: 0 };
                  let type: string = 'normal';
                  let statusBadge = null;

                  if (emp.status === '休假') {
                    type = 'leave';
                    statusBadge = <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">假期</span>;
                  } else if (!rec) {
                    type = 'absent';
                    statusBadge = <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">缺勤</span>;
                  } else {
                    details = calcAttendanceDetails(rec, config);
                    type = rec.type;
                    const typeNames: Record<string, string> = { normal: '正常', late: '迟到', early: '早退', absent: '缺勤', leave: '假期', overtime: '加班' };
                    const typeCls: Record<string, string> = {
                      normal: 'bg-green-100 text-green-700',
                      late: 'bg-yellow-100 text-yellow-700',
                      early: 'bg-orange-100 text-orange-700',
                      absent: 'bg-red-100 text-red-700',
                      leave: 'bg-blue-100 text-blue-700',
                      overtime: 'bg-purple-100 text-purple-700'
                    };
                    statusBadge = <span className={cn("px-2 py-0.5 rounded text-xs font-medium", typeCls[rec.type])}>{typeNames[rec.type] || '正常'}</span>;
                  }

                  const isAbsentOrLeave = type === 'absent' || type === 'leave';
                  const hasBaseWage = emp.baseMonthlyWage !== undefined && emp.baseMonthlyWage !== null && emp.baseMonthlyWage > 0;
                  const shiftPay = isAbsentOrLeave 
                    ? 0 
                    : (hasBaseWage 
                        ? (emp.baseMonthlyWage / 30) 
                        : ((details.valid - details.ot) * (emp.hourlyRate ?? 0))
                      );
                  const otPay = details.ot * config.otHourlyFee;
                  const totalPay = shiftPay + otPay;

                  return (
                    <tr
                      key={`${emp.id}-${date}`}
                      className={cn(
                        "group hover:bg-slate-50 transition-colors border-b border-slate-100 bg-white",
                        isSelected && "selected-row"
                      )}
                    >
                      <td className="px-6 py-4 text-center">
                        <input
                          type="checkbox"
                          disabled={!rec}
                          checked={isSelected}
                          onChange={(e) => rec && onSelect(rec.id, e.target.checked)}
                          className={cn("w-4 h-4 accent-brand-600 cursor-pointer", !rec && "opacity-30")}
                        />
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500 font-mono text-left">{date}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold overflow-hidden border-2 border-white shadow-sm flex-shrink-0">
                            {emp.photo ? (
                              <img src={emp.photo} className="w-full h-full object-cover" alt="" />
                            ) : (
                              <span style={{ fontSize: '14.4px' }}>{emp.name.charAt(0)}</span>
                            )}
                          </div>
                          <span className="font-medium text-slate-900 truncate max-w-[120px]">{emp.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {statusBadge}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700 text-center font-mono">
                        {isAbsentOrLeave ? '-' : (rec?.inTime || '-')}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700 text-center font-mono">
                        {isAbsentOrLeave ? '-' : (rec?.outTime || '-')}
                      </td>
                      <td className="px-6 py-4 text-sm text-center">
                        {isAbsentOrLeave ? <span className="text-slate-400">-</span> : <span className="text-slate-700 font-mono">{formatDuration(details.valid)}</span>}
                      </td>
                      <td className="px-6 py-4 text-sm text-center">
                        {isAbsentOrLeave ? <span className="text-slate-400 font-mono">0.00h</span> : <span className="font-mono font-bold text-blue-600">{formatDuration(details.ot)}</span>}
                      </td>
                      <td className={cn(
                        "px-6 py-4 text-sm font-mono text-right font-medium",
                        isAbsentOrLeave ? "text-slate-400" : "text-indigo-600"
                      )}>
                        {formatCurrency(shiftPay, emp.currency)}
                      </td>
                      <td className={cn(
                        "px-6 py-4 text-sm font-mono text-right font-medium",
                        isAbsentOrLeave ? "text-slate-400" : "text-green-600"
                      )}>
                        {formatCurrency(otPay, emp.currency)}
                      </td>
                      <td className={cn(
                        "px-6 py-4 text-sm font-mono text-right font-bold",
                        isAbsentOrLeave ? "text-slate-400" : "text-rose-600"
                      )}>
                        {formatCurrency(totalPay, emp.currency)}
                      </td>
                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        <button
                          onClick={() => onEditRecord(rec ? rec.id : null, emp.id, date)}
                          className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 hover:text-indigo-700 text-xs font-semibold rounded-lg transition inline-flex items-center gap-1 border border-indigo-100"
                          title="手动补签/调整该员工当天的考勤记录"
                        >
                          <Edit className="w-3 h-3" />
                          <span>调整</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm">
        <div className="flex items-center gap-4 text-slate-400 flex-wrap">
          <span>共 {flatRows.length} 条已显示考勤</span>
          <span>•</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400"></span> 缺勤 = 当天无打卡记录</span>
          <span>•</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400"></span> 假期 = 员工休假状态</span>
        </div>
      </div>
    </div>
  );
}
