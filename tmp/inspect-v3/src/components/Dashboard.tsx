/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo } from "react";
import { Users, Zap, AlertCircle, Settings, Clock, TrendingUp, Award, Activity, BarChart2, CheckCircle } from "lucide-react";
import { AppConfig, Employee, AttendanceRecord } from "../types";
import { calcAttendanceDetails, formatCurrency } from "../lib/utils";
import { motion } from "motion/react";

interface DashboardProps {
  employees: Employee[];
  attendance: AttendanceRecord[];
  config: AppConfig;
  onOpenSettings: () => void;
  onNav: (tabId: 'attendance' | 'payroll') => void;
}

export function Dashboard({ employees, attendance, config, onOpenSettings, onNav }: DashboardProps) {
  const [chartTab, setChartTab] = useState<'employees' | 'departments'>('employees');

  // 1. 查找最新的有考勤记录的基准日期，做为"今日/当日" statistics day, 让考勤统计在静态页面和实时新增下都能完美契合
  const latestActiveDate = useMemo(() => {
    if (attendance.length === 0) return new Date().toISOString().split('T')[0];
    const dates = attendance.map(r => r.date);
    const sortedDates = [...dates].sort();
    return sortedDates[sortedDates.length - 1]; // e.g. "2026-05-17" or "2026-06-03"
  }, [attendance]);

  // 2. 基础在职员工总数 (状态为 '在职' 的人数)
  const activeEmployees = useMemo(() => {
    return employees.filter(e => e.status === '在职');
  }, [employees]);
  
  const activeCount = activeEmployees.length;
  const totalEmpCount = employees.length;

  // 3. 计算最新统计当日各项实时指标
  const todayStats = useMemo(() => {
    const dayRecords = attendance.filter(r => r.date === latestActiveDate);
    
    let workHours = 0;
    let otHours = 0;
    let abnormalCount = 0;
    
    activeEmployees.forEach(emp => {
      const rec = dayRecords.find(r => r.empId === emp.id);
      if (!rec) {
        // 未打卡即为缺勤异常
        abnormalCount++;
      } else {
        const details = calcAttendanceDetails(rec, config);
        workHours += details.valid;
        otHours += details.ot;
        
        if (rec.type === 'absent' || rec.type === 'late' || rec.type === 'early') {
          abnormalCount++;
        }
      }
    });

    const exceptionRate = activeEmployees.length > 0 ? (abnormalCount / activeEmployees.length) : 0;

    return {
      workHours,
      otHours,
      exceptionRate,
      abnormalCount
    };
  }, [activeEmployees, attendance, latestActiveDate, config]);

  // 4. 企业全量各员工长期(历史累积)工时与效能指标排行 (给老板看的决策分析)
  const employeePerformanceList = useMemo(() => {
    return activeEmployees
      .map(emp => {
        const empRecs = attendance.filter(r => r.empId === emp.id);
        let totalValid = 0;
        let totalOt = 0;
        let daysWorked = 0;

        empRecs.forEach(rec => {
          if (rec.type !== 'absent' && rec.type !== 'leave') {
            const details = calcAttendanceDetails(rec, config);
            totalValid += details.valid;
            totalOt += details.ot;
            daysWorked++;
          }
        });

        // 日均有效工时
        const avgDaily = daysWorked > 0 ? totalValid / daysWorked : 0;
        
        // 饱和饱合度 (日均时长 vs 标准标准 8 小时时长，转换为百分比)
        const satiety = config.standardHours > 0 ? (avgDaily / config.standardHours) * 100 : 0;

        return {
          ...emp,
          totalValid,
          totalOt,
          daysWorked,
          avgDaily,
          satiety: Math.round(satiety) || 0,
        };
      })
      .sort((a, b) => b.totalValid - a.totalValid); // 按累计总工时排行
  }, [activeEmployees, attendance, config]);

  // 5. 部门能效与过载状态穿透分析 (给老板的部门优化、增配人手指南)
  const departmentPerformanceList = useMemo(() => {
    const listMap: Record<string, {
      deptName: string;
      staffCount: number;
      totalValid: number;
      totalOt: number;
      totalDays: number;
    }> = {};

    // 汇总部门结构
    activeEmployees.forEach(emp => {
      const dept = emp.dept || '未分配';
      if (!listMap[dept]) {
        listMap[dept] = { deptName: dept, staffCount: 0, totalValid: 0, totalOt: 0, totalDays: 0 };
      }
      listMap[dept].staffCount++;
    });

    // 累加工作时间
    attendance.forEach(rec => {
      const emp = employees.find(e => e.id === rec.empId);
      if (emp && emp.status === '在职' && rec.type !== 'absent' && rec.type !== 'leave') {
        const dept = emp.dept || '未分配';
        const details = calcAttendanceDetails(rec, config);
        if (listMap[dept]) {
          listMap[dept].totalValid += details.valid;
          listMap[dept].totalOt += details.ot;
          listMap[dept].totalDays++;
        }
      }
    });

    return Object.values(listMap).map(item => {
      // 部门日均有效时长
      const realAvgHours = item.totalDays > 0 ? item.totalValid / item.totalDays : 0;
      // 部门总体加班占比 (加班工时占总有效工时)
      const otRatio = item.totalValid > 0 ? (item.totalOt / item.totalValid) * 100 : 0;

      // 智能负荷程度诊断与建议
      let loadLabel = "普通负荷";
      let badgeColor = "text-emerald-700 bg-emerald-50 border-emerald-150";
      let actionAdvice = "部门编制与单量供给契合良好，可维持现状。";
      
      if (otRatio > 20 || realAvgHours > 8.8) {
        loadLabel = "重度过载 🔥";
        badgeColor = "text-rose-700 bg-rose-50 border-rose-150 animate-pulse";
        actionAdvice = "该组生产力持续满载，极易积压。建议在此配置下增设 1-2 名额外助理。";
      } else if (otRatio > 10 || realAvgHours > 8.2) {
        loadLabel = "适度饱和 ⚡";
        badgeColor = "text-amber-700 bg-amber-50 border-amber-150";
        actionAdvice = "生产任务饱和情况较好，应留意仓位订单波动。";
      }

      return {
        ...item,
        avgHours: realAvgHours || 8.0,
        otRatio: Math.round(otRatio) || 0,
        loadLabel,
        badgeColor,
        actionAdvice
      };
    }).sort((a, b) => b.totalValid - a.totalValid);
  }, [activeEmployees, employees, attendance, config]);

  // 计算最高工时，用作图表比例基准
  const maxRegHour = Math.max(10, ...employeePerformanceList.map(s => s.totalValid));

  return (
    <div className="space-y-6">
      
      {/* 简洁看板时间提示 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 px-1 text-xs">
        <div className="flex items-center gap-2 text-slate-600">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-550 animate-pulse"></span>
          <span>当前看板时间：<span className="font-bold text-slate-800 font-mono text-sm">{latestActiveDate}</span></span>
        </div>
        <span className="text-[10px] text-slate-400 font-medium">系统已实时关联数据集内最后一次考勤记录周期</span>
      </div>

      {/* KPI 卡片组 - 对应: 在职员工数量，今日上班总时长，今日加班总时长，考勤异常率 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* 在职员工数量 */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 hover:shadow-md transition duration-200 flex items-center gap-4.5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-full translate-x-8 -translate-y-8 opacity-40 group-hover:scale-110 transition-transform duration-300"></div>
          <div className="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 flex-shrink-0 z-10">
            <Users className="w-5.5 h-5.5" />
          </div>
          <div className="z-10">
            <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">在职员工数</p>
            <p className="text-2xl font-black text-slate-800 tracking-tight">
              {activeCount} <span className="text-sm font-medium text-slate-400">人</span>
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">登记总数: {totalEmpCount}人 (休假/离职 {(totalEmpCount - activeCount)}人)</p>
          </div>
        </div>

        {/* 今日上班总时长 */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 hover:shadow-md transition duration-200 flex items-center gap-4.5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-full translate-x-8 -translate-y-8 opacity-40 group-hover:scale-110 transition-transform duration-300"></div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20 flex-shrink-0 z-10">
            <Clock className="w-5.5 h-5.5" />
          </div>
          <div className="z-10">
            <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">当日上班总时长</p>
            <p className="text-2xl font-black text-slate-800 tracking-tight">
              {todayStats.workHours.toFixed(1)} <span className="text-sm font-medium text-slate-400">h</span>
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              人均考勤时间: {activeCount > 0 ? (todayStats.workHours / activeCount).toFixed(1) : 0}h / 人
            </p>
          </div>
        </div>

        {/* 今日加班总时长 */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 hover:shadow-md transition duration-200 flex items-center gap-4.5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50 rounded-full translate-x-8 -translate-y-8 opacity-40 group-hover:scale-110 transition-transform duration-300"></div>
          <div className="w-12 h-12 rounded-xl bg-amber-500 flex items-center justify-center text-white shadow-lg shadow-amber-500/20 flex-shrink-0 z-10">
            <Zap className="w-5.5 h-5.5" />
          </div>
          <div className="z-10">
            <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">当日加班总时长</p>
            <p className="text-2xl font-black text-slate-800 tracking-tight">
              {todayStats.otHours.toFixed(1)} <span className="text-sm font-medium text-slate-400">h</span>
            </p>
            <span className="text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded mt-1 inline-block">
              加班预估: ฿{(todayStats.otHours * config.otHourlyFee).toFixed(0)}
            </span>
          </div>
        </div>

        {/* 考勤异常率 */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 hover:shadow-md transition duration-200 flex items-center gap-4.5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-50 rounded-full translate-x-8 -translate-y-8 opacity-40 group-hover:scale-110 transition-transform duration-300"></div>
          <div className="w-12 h-12 rounded-xl bg-rose-500 flex items-center justify-center text-white shadow-lg shadow-rose-500/20 flex-shrink-0 z-10">
            <AlertCircle className="w-5.5 h-5.5" />
          </div>
          <div className="z-10">
            <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">今日考勤异常率</p>
            <p className="text-2xl font-black text-slate-800 tracking-tight">
              {(todayStats.exceptionRate * 100).toFixed(1)}<span className="text-sm font-medium text-slate-400">%</span>
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              本日异常(缺打卡或无记录): <span className="text-rose-600 font-bold">{todayStats.abnormalCount}人</span> / 需关注
            </p>
          </div>
        </div>

      </div>

      {/* 主布局：工时效能统计 + 核算规则及快捷操作 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* 老板需要的有效决策高维看板，重新定制内容 */}
        <div className="lg:col-span-2 bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-5 mb-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1 rounded-md bg-indigo-50 text-indigo-600">
                  <BarChart2 className="w-4 h-4" />
                </span>
                <h3 className="text-base font-bold text-slate-800">员工有效工时与多维能效透视</h3>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                统计分析系统，通过工时饱和、日均平均及能动比等高阶指标，辅助管理决策。
              </p>
            </div>
            
            {/* 统计维度切换：员工排行/部门过载 */}
            <div className="flex bg-slate-105 p-1 rounded-xl self-end sm:self-auto border border-slate-100">
              <button
                onClick={() => setChartTab('employees')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  chartTab === 'employees'
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Award className="w-3.5 h-3.5" />
                <span>工时饱和排行 (Top)</span>
              </button>
              <button
                onClick={() => setChartTab('departments')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  chartTab === 'departments'
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>部门负荷诊断</span>
              </button>
            </div>
          </div>

          <div>
            {chartTab === 'employees' ? (
              /* 1. 员工排行与饱和度分析 */
              <div className="space-y-4">
                <div className="bg-slate-50 p-3 rounded-xl flex items-center justify-between text-xs text-slate-500 border border-slate-100 mb-1">
                  <span className="font-extrabold text-slate-700">员工姓名 (职位 · 部门)</span>
                  <div className="flex gap-8">
                    <span className="font-extrabold text-slate-700 w-24 text-right">工时分配 (正常/加班)</span>
                    <span className="font-extrabold text-slate-700 w-20 text-center">工时饱和率</span>
                  </div>
                </div>

                <div className="divide-y divide-slate-50 max-h-[350px] overflow-y-auto pr-1 space-y-3.5 pt-1">
                  {employeePerformanceList.map((stat) => {
                    const totalH = stat.totalValid;
                    const otH = stat.totalOt;
                    const regH = totalH - otH;
                    
                    const regPct = maxRegHour > 0 ? (regH / maxRegHour) * 100 : 0;
                    const otPct = maxRegHour > 0 ? (otH / maxRegHour) * 100 : 0;
                    
                    // 饱合度指标颜色
                    let satBg = "bg-blue-100 text-blue-800";
                    if (stat.satiety > 110) satBg = "bg-red-100 text-red-850 animate-pulse border border-red-200";
                    else if (stat.satiety > 95) satBg = "bg-emerald-100 text-emerald-800";
                    else if (stat.satiety > 0) satBg = "bg-slate-100 text-slate-600";

                    return (
                      <div key={stat.id} className="flex items-center justify-between pt-3.5 pb-2 first:pt-0 group hover:bg-slate-50/50 rounded-lg px-2 transition">
                        <div className="flex items-center gap-3 w-[220px] min-w-0">
                          <div className="w-9 h-9 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center font-black text-indigo-600 text-sm overflow-hidden flex-shrink-0">
                            {stat.photo ? (
                              <img src={stat.photo} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                            ) : (
                              <span>{stat.name.charAt(0)}</span>
                            )}
                          </div>
                          <div className="truncate">
                            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 truncate">
                              {stat.name}
                            </h4>
                            <span className="text-[10px] text-slate-400 font-medium">{stat.dept} · {stat.role}</span>
                          </div>
                        </div>

                        {/* 进度堆叠条 */}
                        <div className="flex-1 flex items-center justify-end gap-8">
                          <div className="w-full max-w-[170px] flex flex-col gap-1 items-end">
                            <div className="flex text-[10px] text-slate-500 font-semibold gap-2">
                              <span>标准:{regH.toFixed(0)}h</span>
                              {otH > 0 && <span className="text-amber-600 font-bold">加班:{otH.toFixed(0)}h</span>}
                            </div>
                            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden flex">
                              <div className="bg-blue-500 h-full" style={{ width: `${Math.max(5, regPct)}%` }} title="正常应出勤时长" />
                              {otH > 0 && <div className="bg-amber-400 h-full" style={{ width: `${otPct}%` }} title="累计额外加班时长" />}
                            </div>
                          </div>

                          {/* 效能标签 */}
                          <div className="w-20 flex flex-col items-center flex-shrink-0">
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${satBg}`}>
                              {stat.satiety > 0 ? `${stat.satiety}%` : '休假中'}
                            </span>
                            <span className="text-[9px] text-slate-400 mt-0.5">工时: {totalH.toFixed(1)}h</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* 2. 部门整体产能负载比较与管理建议 */
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {departmentPerformanceList.map((item) => (
                    <div key={item.deptName} className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex flex-col justify-between hover:shadow-sm transition">
                      <div>
                        {/* 顶部标题与状态标签 */}
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="text-sm font-bold text-slate-800">{item.deptName}</h4>
                            <p className="text-[10px] text-slate-400 font-medium">在职编制: {item.staffCount} 人</p>
                          </div>
                          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded border ${item.badgeColor}`}>
                            {item.loadLabel}
                          </span>
                        </div>

                        {/* 数据占比条 */}
                        <div className="my-3 space-y-1">
                          <div className="flex justify-between text-xs text-slate-600 font-medium">
                            <span>加班比例</span>
                            <span className="font-bold text-slate-700">{item.otRatio}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                            <div className="bg-amber-550 h-full" style={{ width: `${Math.min(100, item.otRatio)}%` }} />
                          </div>
                        </div>

                        {/* 人均时长 */}
                        <div className="grid grid-cols-2 gap-2 bg-white/60 p-2 rounded-lg text-xs border border-slate-100">
                          <div>
                            <p className="text-[10px] text-slate-400">累计工时</p>
                            <p className="font-extrabold text-slate-700">{item.totalValid.toFixed(1)}h</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-400">人均单日工时</p>
                            <span className="font-extrabold text-slate-700">{item.avgHours.toFixed(1)}h</span>
                          </div>
                        </div>
                      </div>

                      {/* 诊断与系统智能建议 */}
                      <div className="mt-3.5 border-t border-slate-100 pt-2.5">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">💡 优化建议:</p>
                        <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed bg-white/40 p-1.5 rounded-lg border border-slate-100/50">
                          {item.actionAdvice}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 规则和核算配置提示块 */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-1.5">
              <span className="w-1.5 h-3.5 bg-indigo-600 rounded"></span>
              核算规则提示
            </h3>
            <div className="space-y-3.5">
              <div className="flex justify-between items-center p-3 bg-slate-50 hover:bg-slate-100 transition rounded-xl text-xs">
                <span className="text-slate-500 font-medium">每日标准工时</span>
                <span className="font-bold text-slate-800">{config.standardHours} h</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-slate-50 hover:bg-slate-100 transition rounded-xl text-xs">
                <span className="text-slate-500 font-medium">午餐休息折抵</span>
                <span className="font-bold text-slate-800">{config.dailyBreakMinutes} min</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-indigo-50/50 border border-indigo-100 transition rounded-xl text-xs">
                <span className="text-indigo-650 font-bold">加班计算倍率</span>
                <span className="font-extrabold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-lg">{config.overtimeMultiplier}x</span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-1.5">
              <span className="w-1.5 h-3.5 bg-indigo-600 rounded"></span>
              快捷向导
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => onNav('attendance')} 
                className="p-3 rounded-xl bg-slate-50 hover:bg-indigo-50 border border-slate-205 hover:border-indigo-200 text-xs text-slate-650 hover:text-indigo-700 font-bold transition text-center shadow-sm hover:shadow truncate cursor-pointer flex flex-col items-center justify-center gap-1"
              >
                <Clock className="w-4 h-4" />
                <span>进入考勤计算</span>
              </button>
              <button 
                onClick={() => onNav('payroll')} 
                className="p-3 rounded-xl bg-slate-50 hover:bg-indigo-50 border border-slate-205 hover:border-indigo-200 text-xs text-slate-650 hover:text-indigo-700 font-bold transition text-center shadow-sm hover:shadow truncate cursor-pointer flex flex-col items-center justify-center gap-1"
              >
                <Zap className="w-4 h-4" />
                <span>生成薪资条</span>
              </button>
            </div>
          </div>

          <button 
            onClick={onOpenSettings} 
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold shadow-md shadow-indigo-600/10 hover:shadow-indigo-650/20 transition flex items-center justify-center gap-2 cursor-pointer border border-indigo-750"
          >
            <Settings className="w-4 h-4" /> 调整系统考勤核算规则
          </button>
        </div>

      </div>
    </div>
  );
}
