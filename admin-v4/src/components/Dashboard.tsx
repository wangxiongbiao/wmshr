/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, useEffect } from "react";
import { Users, Zap, AlertCircle, Clock, BarChart2, Loader2, RefreshCw } from "lucide-react";
import { AppConfig, Employee, AttendanceRecord, LeaveRequest, TabId } from "../types";
import { calcAttendanceDetails, cn } from "../lib/utils";

interface DashboardProps {
  employees: Employee[];
  attendance: AttendanceRecord[];
  config: AppConfig;
  leaveRequests?: LeaveRequest[];
  loading?: boolean;
  onOpenSettings?: () => void;
  onNav: (tabId: TabId) => void;
  onRefresh?: () => Promise<void> | void;
  addToast?: (msg: string, kind?: "success" | "error" | "info") => void;
}

const isLeaveRecord = (rec?: AttendanceRecord | null) => {
  if (!rec || !rec.type) return false;
  return rec.type === "leave" || rec.type === "sick_leave" || rec.type.includes("leave");
};

export function Dashboard({ employees, attendance, config, leaveRequests, loading = false, onNav, onRefresh, addToast }: DashboardProps) {
  const [isLocalLoading, setIsLocalLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setIsLocalLoading(true);
    try {
      if (onRefresh) {
        await onRefresh();
      }
      setTimeout(() => {
        setIsLocalLoading(false);
      }, 200);
      addToast?.("看板数据已刷新", "success");
    } catch (err: any) {
      setIsLocalLoading(false);
      addToast?.(err?.message || "看板刷新失败", "error");
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLocalLoading(false);
    }, 250);
    return () => clearTimeout(timer);
  }, []);
  // 1. 系统今日日期（本地当前时区 YYYY-MM-DD）
  const todayDate = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, []);

  // 2. 基础在职员工统计
  const activeEmployees = useMemo(() => {
    return employees.filter(e => e.status === "在职");
  }, [employees]);

  const activeCount = activeEmployees.length;
  const totalEmpCount = employees.length;
  const inactiveCount = totalEmpCount - activeCount;

  // 3. 今日各项实时指标
  const todayStats = useMemo(() => {
    const dayRecords = attendance.filter(r => r.date === todayDate);

    let workHours = 0;
    let otHours = 0;
    let abnormalCount = 0;

    activeEmployees.forEach(emp => {
      const rec = dayRecords.find(r => r.empId === emp.id);

      const isApprovedLeave = isLeaveRecord(rec) || (leaveRequests && leaveRequests.some(l =>
        l.empId === emp.id &&
        l.status === "approved" &&
        todayDate >= l.startDate &&
        todayDate <= l.endDate
      ));

      if (isApprovedLeave) {
        return;
      }

      if (!rec) {
        // 未打卡且非请假即为异常缺勤
        abnormalCount++;
      } else {
        const details = calcAttendanceDetails(rec, config);
        workHours += details.valid;
        otHours += details.ot;

        if (rec.type === "absent" || rec.type === "late" || rec.type === "early" || rec.type === "exception") {
          abnormalCount++;
        }
      }
    });

    const exceptionRate = activeCount > 0 ? (abnormalCount / activeCount) : 0;

    return {
      workHours,
      otHours,
      exceptionRate,
      abnormalCount
    };
  }, [activeEmployees, attendance, todayDate, config, leaveRequests, activeCount]);

  // 4. 企业全量在职员工今日工时与饱和度分析排行
  const employeePerformanceList = useMemo(() => {
    const standardHours = config.standardHours || 8;
    const dayRecords = attendance.filter(r => r.date === todayDate);

    return activeEmployees
      .map(emp => {
        const rec = dayRecords.find(r => r.empId === emp.id);
        const isApprovedLeave = isLeaveRecord(rec) || (leaveRequests && leaveRequests.some(l =>
          l.empId === emp.id &&
          l.status === "approved" &&
          todayDate >= l.startDate &&
          todayDate <= l.endDate
        ));

        let todayValid = 0;
        let todayOt = 0;
        let hasWorked = false;

        if (!isApprovedLeave && rec && rec.type !== "absent") {
          const details = calcAttendanceDetails(rec, config);
          todayValid = details.valid;
          todayOt = details.ot;
          hasWorked = todayValid > 0;
        }

        // 今日饱和度 = 当日实际有效工时 / 每日标准工时
        const satiety = standardHours > 0
          ? Math.round((todayValid / standardHours) * 100)
          : 0;

        return {
          ...emp,
          todayValid,
          todayOt,
          hasWorked,
          isApprovedLeave,
          satiety,
          standardHours
        };
      })
      .sort((a, b) => {
        if (b.todayValid !== a.todayValid) {
          return b.todayValid - a.todayValid;
        }
        if (a.isApprovedLeave !== b.isApprovedLeave) {
          return a.isApprovedLeave ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });
  }, [activeEmployees, attendance, todayDate, config, leaveRequests]);

  // 进度条基准：75% 宽度对应 100% 标准应出勤工时，剩余 25% 空间承载额外加班扩展
  const STANDARD_TRACK_RATIO = 0.75;

  return (
    <div className="space-y-6">

      {/* 简洁看板时间提示与主动刷新 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 px-1 text-xs">
        <div className="flex items-center gap-2 text-slate-600">
          <span>当前看板时间: <strong className="font-bold text-slate-800 font-mono text-sm">{todayDate}</strong></span>
          <span className="text-slate-300">|</span>
          <span className="text-[11px] text-slate-400 font-medium">系统已实时关联今日考勤监控周期</span>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-50 transition flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-60"
          title="刷新数据看板"
        >
          <RefreshCw className={cn("w-3.5 h-3.5 text-slate-500", isRefreshing && "animate-spin")} />
          <span>刷新</span>
        </button>
      </div>

      {/* KPI 卡片组 - 对应: 在职员工数、当日上班总时长、当日加班总时长、今日考勤异常率 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">

        {/* 在职员工数 */}
        <div
          onClick={() => onNav("employees")}
          className="bg-white border border-slate-100 rounded-2xl p-5 hover:shadow-md transition duration-200 flex items-center gap-4.5 relative overflow-hidden group cursor-pointer"
          title="点击前往员工管理列表"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-full translate-x-8 -translate-y-8 opacity-40 group-hover:scale-110 transition-transform duration-300 pointer-events-none" />
          <div className="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 flex-shrink-0 z-10 group-hover:scale-105 transition-transform">
            <Users className="w-5.5 h-5.5" />
          </div>
          <div className="z-10">
            <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">在职员工数</p>
            <p className="text-2xl font-black text-slate-800 tracking-tight">
              {activeCount} <span className="text-sm font-medium text-slate-400">人</span>
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">登记总数: {totalEmpCount}人 (休假/离职 {inactiveCount}人)</p>
          </div>
        </div>

        {/* 当日上班总时长 */}
        <div
          onClick={() => onNav("attendance")}
          className="bg-white border border-slate-100 rounded-2xl p-5 hover:shadow-md transition duration-200 flex items-center gap-4.5 relative overflow-hidden group cursor-pointer"
          title="点击前往考勤核算查看打卡明细"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-full translate-x-8 -translate-y-8 opacity-40 group-hover:scale-110 transition-transform duration-300 pointer-events-none" />
          <div className="w-12 h-12 rounded-xl bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20 flex-shrink-0 z-10 group-hover:scale-105 transition-transform">
            <Clock className="w-5.5 h-5.5" />
          </div>
          <div className="z-10">
            <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">当日上班总时长</p>
            <p className="text-2xl font-black text-slate-800 tracking-tight">
              {todayStats.workHours.toFixed(1)} <span className="text-sm font-medium text-slate-400">h</span>
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              人均考勤时间: {activeCount > 0 ? (todayStats.workHours / activeCount).toFixed(1) : "0.0"}h / 人
            </p>
          </div>
        </div>

        {/* 当日加班总时长 */}
        <div
          onClick={() => onNav("payroll")}
          className="bg-white border border-slate-100 rounded-2xl p-5 hover:shadow-md transition duration-200 flex items-center gap-4.5 relative overflow-hidden group cursor-pointer"
          title="点击前往薪资核算查看费用核算"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50 rounded-full translate-x-8 -translate-y-8 opacity-40 group-hover:scale-110 transition-transform duration-300 pointer-events-none" />
          <div className="w-12 h-12 rounded-xl bg-amber-500 flex items-center justify-center text-white shadow-lg shadow-amber-500/20 flex-shrink-0 z-10 group-hover:scale-105 transition-transform">
            <Zap className="w-5.5 h-5.5" />
          </div>
          <div className="z-10">
            <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">当日加班总时长</p>
            <p className="text-2xl font-black text-slate-800 tracking-tight">
              {todayStats.otHours.toFixed(1)} <span className="text-sm font-medium text-slate-400">h</span>
            </p>
            <span className="text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded mt-1 inline-block">
              加班预估: ฿{(todayStats.otHours * (config.otHourlyFee || 0)).toFixed(0)}
            </span>
          </div>
        </div>

        {/* 今日考勤异常率 */}
        <div
          onClick={() => onNav("attendance")}
          className="bg-white border border-slate-100 rounded-2xl p-5 hover:shadow-md transition duration-200 flex items-center gap-4.5 relative overflow-hidden group cursor-pointer"
          title="点击前往考勤核算排查异常考勤员工"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-50 rounded-full translate-x-8 -translate-y-8 opacity-40 group-hover:scale-110 transition-transform duration-300 pointer-events-none" />
          <div className="w-12 h-12 rounded-xl bg-rose-500 flex items-center justify-center text-white shadow-lg shadow-rose-500/20 flex-shrink-0 z-10 group-hover:scale-105 transition-transform">
            <AlertCircle className="w-5.5 h-5.5" />
          </div>
          <div className="z-10">
            <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">今日考勤异常率</p>
            <p className="text-2xl font-black text-slate-800 tracking-tight">
              {(todayStats.exceptionRate * 100).toFixed(1)}<span className="text-sm font-medium text-slate-400">%</span>
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              本日异常(缺卡或无记录): <span className="text-rose-600 font-bold">{todayStats.abnormalCount} 人</span> / 需关注
            </p>
          </div>
        </div>

      </div>

      {/* 饱和度分析全宽面板 */}
      <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-6">
          <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <BarChart2 className="w-4 h-4" />
          </span>
          <h3 className="text-base font-bold text-slate-800">饱和度分析</h3>
        </div>

        {/* 列表头部 */}
        <div className="bg-slate-50/70 p-3 rounded-xl flex items-center justify-between text-xs text-slate-500 border border-slate-100 mb-2">
          <span className="font-extrabold text-slate-700">员工姓名 (职位 · 部门)</span>
        </div>

        {/* 员工列表 */}
        <div className="divide-y divide-slate-50 space-y-3.5 pt-1">
          {(loading || isLocalLoading) ? (
            <div className="py-16 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
              <span className="text-xs text-slate-500 font-medium">正在实时计算今日考勤与工时监控...</span>
            </div>
          ) : employeePerformanceList.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">暂无员工工时统计</div>
          ) : (
            employeePerformanceList.map((stat) => {
              const totalH = stat.todayValid;
              const standardH = stat.standardHours;
              const regH = Math.min(totalH, standardH);
              const otH = stat.todayOt;

              const regRatio = standardH > 0 ? Math.min(1, totalH / standardH) : 0;
              const otRatio = standardH > 0 ? Math.max(0, otH / standardH) : 0;
              const regPct = regRatio * (STANDARD_TRACK_RATIO * 100);
              const otPct = Math.min(100 - regPct, otRatio * (STANDARD_TRACK_RATIO * 100));

              // 饱和度指标颜色与标签文案
              let satBg = "bg-rose-50 text-slate-700 border-rose-100";
              let badgeText = `${stat.satiety}%`;

              if (stat.isApprovedLeave) {
                satBg = "bg-slate-100 text-slate-600 border-slate-200";
                badgeText = "休假中";
              } else if (!stat.hasWorked) {
                satBg = "bg-slate-100 text-slate-500 border-slate-200";
                badgeText = "未打卡";
              } else if (stat.satiety <= 95) {
                satBg = "bg-blue-50 text-blue-700 border-blue-100";
              } else if (stat.satiety <= 110) {
                satBg = "bg-emerald-50 text-emerald-700 border-emerald-100";
              } else {
                satBg = "bg-purple-50 text-purple-700 border-purple-200";
              }

              return (
                <div
                  key={stat.id}
                  onClick={() => onNav("attendance")}
                  className="flex items-center justify-between pt-3.5 pb-2 first:pt-0 group hover:bg-slate-50/70 rounded-lg px-2 transition cursor-pointer"
                  title="点击前往考勤列表查看该员工考勤明细"
                >
                  {/* 左侧：头像 + 姓名 + 部门职位 */}
                  <div className="flex items-center gap-3 w-[240px] min-w-0">
                    <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center font-bold text-indigo-600 text-sm overflow-hidden flex-shrink-0 group-hover:scale-105 transition-transform">
                      {stat.photo ? (
                        <img src={stat.photo} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                      ) : (
                        <span>{stat.name.charAt(0)}</span>
                      )}
                    </div>
                    <div className="truncate">
                      <h4 className="text-sm font-bold text-slate-800 group-hover:text-indigo-600 transition-colors truncate">
                        {stat.name}
                      </h4>
                      <span className="text-[11px] text-slate-400 font-medium">{stat.dept || "未分配"} · {stat.role || "未设置"}</span>
                    </div>
                  </div>

                  {/* 右侧：进度堆叠条 + 饱和度徽章 */}
                  <div className="flex-1 flex items-center justify-end gap-8">
                    <div className="w-full max-w-[200px] sm:max-w-[260px] flex flex-col gap-1 items-end">
                      <div className="flex text-xs text-slate-500 font-medium gap-2">
                        <span>标准:{standardH.toFixed(0)}h</span>
                        {otH > 0 && <span className="text-amber-500 font-bold">加班:{Math.round(otH)}h</span>}
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden flex">
                        <div className="bg-blue-600 h-full transition-all duration-300" style={{ width: `${regPct}%` }} title={`标准工时: ${regH.toFixed(1)}h`} />
                        {otH > 0 && <div className="bg-amber-400 h-full transition-all duration-300" style={{ width: `${otPct}%` }} title={`加班工时: ${otH.toFixed(1)}h`} />}
                      </div>
                    </div>

                    {/* 饱和度标签与工时 */}
                    <div className="w-20 flex flex-col items-center flex-shrink-0">
                      <span className={cn("text-xs font-semibold px-2.5 py-0.5 rounded-full border", satBg)}>
                        {badgeText}
                      </span>
                      <span className="text-[10px] text-slate-400 mt-0.5">工时: {totalH.toFixed(1)}h</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

    </div>
  );
}
