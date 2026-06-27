/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { type ReactNode, useEffect, useMemo, useState } from "react";
import { tAdmin } from "../lib/i18nText";
import { AlertCircle, BarChart2, Clock, Settings, Users, Zap } from "lucide-react";
import type { DashboardData, DashboardEmployeeStat, TabId } from "../types";
import { fetchDashboardData, fetchEmployeeAvatars } from "../lib/api";
import { cn, formatCurrency, formatLocalDatePart } from "../lib/utils";
import { YearMonthPicker } from "./YearMonthPicker";

interface DashboardProps {
  isActive: boolean;
  onOpenSettings: () => void;
  onNav: (tabId: Extract<TabId, "attendance" | "payroll">) => void;
}

const DASHBOARD_REFRESH_TTL_MS = 1000 * 15;

function getDefaultYearMonth() {
  return formatLocalDatePart().yearMonth;
}

export function Dashboard({ isActive, onOpenSettings, onNav }: DashboardProps) {
  const [data, setData] = useState<DashboardData | null>(null);
  // 看板改为始终先渲染空态指标；首次请求和后续刷新都不再用整页 loading 阻断界面。
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lastLoadedAt, setLastLoadedAt] = useState(0);
  const [yearMonth, setYearMonth] = useState(getDefaultYearMonth());
  const [avatarMap, setAvatarMap] = useState<Record<number, string | null>>({});

  const loadData = async (force = false) => {
    setLoading(true);
    setError("");
    try {
      const nextData = await fetchDashboardData({ force, yearMonth });
      setData(nextData);
      setLastLoadedAt(Date.now());
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : tAdmin("数据看板加载失败"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isActive) {
      return;
    }

    if (data && Date.now() - lastLoadedAt < DASHBOARD_REFRESH_TTL_MS) {
      return;
    }

    // 仪表盘页面被 keep-alive 后不会再因切页卸载；重新激活时仅在本地缓存过期后再刷新，避免短时间切页反复打看板接口。
    void loadData();
  }, [data, isActive, lastLoadedAt, yearMonth]);

  useEffect(() => {
    const employeeIds = (data?.employeeStats || [])
      .map((stat) => stat.employeeId)
      .filter((id) => !(id in avatarMap));
    if (employeeIds.length === 0) {
      return;
    }

    let cancelled = false;
    void fetchEmployeeAvatars(employeeIds).then((result) => {
      if (cancelled) {
        return;
      }
      setAvatarMap((prev) => {
        const next = { ...prev };
        result.items.forEach((item) => {
          next[item.id] = item.photo;
        });
        return next;
      });
    }).catch(() => {
      // 首页头像补图失败不影响 KPI 和员工排行主体展示。
    });

    return () => {
      cancelled = true;
    };
  }, [avatarMap, data?.employeeStats]);

  const employeeStats = useMemo(() => {
    return (data?.employeeStats || []).map((stat) => ({
      ...stat,
      employeePhoto: avatarMap[stat.employeeId] ?? stat.employeePhoto
    }));
  }, [avatarMap, data?.employeeStats]);
  const config = data?.config;
  const activeCount = data?.activeEmployeeCount || 0;
  const maxRegHour = useMemo(
    () => Math.max(10, ...employeeStats.map((stat) => stat.totalValidHours)),
    [employeeStats]
  );
  const currentYearMonth = formatLocalDatePart().yearMonth;

  return (
    <div className="space-y-6" aria-busy={loading}>
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      {/* v2 看板由后端一次性返回最后一次考勤周期、KPI 和员工统计；前端只负责展示与模块跳转。 */}
      <section className="space-y-4">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200/80 p-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <YearMonthPicker
              value={yearMonth}
              onChange={(nextYearMonth) => {
                setYearMonth(nextYearMonth > currentYearMonth ? currentYearMonth : nextYearMonth);
                setLastLoadedAt(0);
              }}
            />
            <button
              type="button"
              onClick={() => void loadData(true)}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:border-indigo-200 hover:text-indigo-600 disabled:opacity-60"
            >
              <Clock className={cn("h-4 w-4", loading && "animate-spin")} />
              <span>{loading ? tAdmin("正在刷新") : tAdmin("刷新")}</span>
            </button>
            <div className="text-xs text-slate-400">{tAdmin("看板时间：{{date}}", { date: data?.dashboardDate || "-" })}</div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <GuideButton icon={<Clock className="w-4 h-4" />} label={tAdmin("进入考勤计算")} onClick={() => onNav("attendance")} />
            <GuideButton icon={<Zap className="w-4 h-4" />} label={tAdmin("生成薪资条")} onClick={() => onNav("payroll")} />
            <button
              onClick={onOpenSettings}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
            >
              <Settings className="w-4 h-4 flex-shrink-0" />
              <span className="whitespace-normal">{tAdmin("调整系统考勤核算规则")}</span>
            </button>
          </div>
        </div>
      </section>

      {/* KPI 区要优先保证多语言文案完整可读；允许标题/辅助说明换行，比为了维持单行而把卡片内容裁掉更稳定。 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 xl:gap-5">
        <KpiCard
          icon={<Users className="w-5 h-5" />}
          tone="blue"
          label={tAdmin("在职员工数")}
          value={`${activeCount}`}
          unit={tAdmin("人")}
          helper={tAdmin("登记总数: {{total}}人 (休假/离职 {{inactive}}人)", { total: data?.totalEmployeeCount || 0, inactive: data?.inactiveEmployeeCount || 0 })}
        />
        <KpiCard
          icon={<Clock className="w-5 h-5" />}
          tone="emerald"
          label={tAdmin("当日上班总时长")}
          value={(data?.todayWorkHours || 0).toFixed(1)}
          unit="h"
          helper={tAdmin("人均考勤时间: {{hours}}h / 人", { hours: (data?.todayAverageWorkHours || 0).toFixed(1) })}
        />
        <KpiCard
          icon={<Zap className="w-5 h-5" />}
          tone="amber"
          label={tAdmin("当日加班总时长")}
          value={(data?.todayOvertimeHours || 0).toFixed(1)}
          unit="h"
          helper={tAdmin("加班预估: {{amount}}", { amount: formatCurrency(data?.todayOvertimeEstimatePay || 0, config?.currency || "THB") })}
          helperBadge
        />
        <KpiCard
          icon={<AlertCircle className="w-5 h-5" />}
          tone="rose"
          label={tAdmin("今日考勤异常率")}
          value={(data?.todayExceptionRate || 0).toFixed(1)}
          unit="%"
          helper={tAdmin("异常人数: {{count}}人 / 需关注", { count: data?.todayExceptionCount || 0 })}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-5 mb-5">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="p-1 rounded-md bg-indigo-50 text-indigo-600 flex-shrink-0">
                  <BarChart2 className="w-4 h-4" />
                </span>
                <h3 className="text-base font-bold leading-tight text-slate-800 break-words">{tAdmin("员工有效工时与多维能效透视")}</h3>
              </div>
            </div>

          </div>

          {/* 用户已取消顶部切换入口和部门诊断卡片；这里固定展示员工统计，避免后续误恢复双 Tab 结构。 */}
          <EmployeePerformanceList stats={employeeStats} maxRegHour={maxRegHour} />
        </div>

        <div className="space-y-6">
          <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
            <h3 className="mb-4 flex items-start gap-1.5 text-sm font-bold text-slate-800">
              <span className="mt-0.5 h-3.5 w-1.5 flex-shrink-0 rounded bg-indigo-600" />
              <span className="leading-tight break-words">{tAdmin("核算规则提示")}</span>
            </h3>
            <div className="space-y-3.5">
              <RuleRow label={tAdmin("每日标准工时")} value={`${config?.standardHours ?? 0} h`} />
              <RuleRow label={tAdmin("午餐休息折抵")} value={`${config?.dailyBreakMinutes ?? 0} min`} />
              <div className="flex flex-col items-start justify-between gap-2 p-3 bg-indigo-50/50 border border-indigo-100 transition rounded-xl text-xs sm:flex-row sm:items-center">
                <span className="font-bold leading-tight text-indigo-600 break-words">{tAdmin("加班计算倍率")}</span>
                <span className="font-extrabold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-lg text-left leading-tight break-words sm:text-right">
                  {config?.overtimeRuleEnabled
                    ? tAdmin("工作日 1.5x / 周末 2x / 节假日 3x")
                    : tAdmin("统一加班费")}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
            <h3 className="mb-3 flex items-start gap-1.5 text-sm font-bold text-slate-800">
              <span className="mt-0.5 h-3.5 w-1.5 flex-shrink-0 rounded bg-indigo-600" />
              <span className="leading-tight break-words">{tAdmin("快捷向导")}</span>
            </h3>
            <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-3 text-xs leading-5 text-slate-500">
              {tAdmin("快捷跳转和规则设置已上移到顶部工具栏，这里保留说明位，避免同一入口在头部与侧栏卡片重复出现。")}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ icon, tone, label, value, unit, helper, helperBadge = false }: {
  icon: ReactNode;
  tone: "blue" | "emerald" | "amber" | "rose";
  label: string;
  value: string;
  unit: string;
  helper: string;
  helperBadge?: boolean;
}) {
  const toneClass = {
    blue: "bg-blue-500 shadow-blue-500/20 bg-blue-50",
    emerald: "bg-emerald-500 shadow-emerald-500/20 bg-emerald-50",
    amber: "bg-amber-500 shadow-amber-500/20 bg-amber-50",
    rose: "bg-rose-500 shadow-rose-500/20 bg-rose-50"
  }[tone];
  const [iconClass, haloClass] = toneClass.split(" ").reduce<[string, string]>((acc, item) => {
    if (item.startsWith("bg-") && item.endsWith("-50")) acc[1] = item;
    else acc[0] += `${item} `;
    return acc;
  }, ["", ""]);

  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-4 xl:p-5 hover:shadow-md transition duration-200 flex items-start gap-3 xl:gap-4 relative overflow-hidden group min-h-[132px]">
      <div className={cn("absolute top-0 right-0 w-24 h-24 rounded-full translate-x-8 -translate-y-8 opacity-40 group-hover:scale-110 transition-transform duration-300", haloClass)} />
      <div className={cn("w-11 h-11 xl:w-12 xl:h-12 rounded-xl flex items-center justify-center text-white shadow-lg flex-shrink-0 z-10", iconClass)}>{icon}</div>
      <div className="z-10 min-w-0 flex-1">
        <p className="mb-1 text-[11px] font-extrabold uppercase tracking-wider text-slate-400 leading-tight break-words">{label}</p>
        <p className="text-2xl font-black text-slate-800 tracking-tight leading-tight break-words">
          {value} <span className="text-sm font-medium text-slate-400">{unit}</span>
        </p>
        <p
          className={cn(
            "mt-1 text-[9px] xl:text-[10px] leading-tight break-words",
            helperBadge
              ? "font-medium text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded inline-block max-w-full"
              : "text-slate-500"
          )}
        >
          {helper}
        </p>
      </div>
    </div>
  );
}

function EmployeePerformanceList({ stats, maxRegHour }: { stats: DashboardEmployeeStat[]; maxRegHour: number }) {
  if (stats.length === 0) {
    return <EmptyState text={tAdmin("暂无员工考勤统计，请先在考勤计算中生成结果。")} />;
  }

  return (
    <div className="space-y-4">
      <div className="mb-1 rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs text-slate-500">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
          <span className="min-w-0 flex-1 font-extrabold leading-tight text-slate-700 break-words">{tAdmin("员工姓名 (职位 · 部门)")}</span>
          <div className="grid flex-shrink-0 grid-cols-2 gap-3 sm:gap-6 xl:gap-8 lg:min-w-[20rem]">
            <span className="font-extrabold leading-tight text-slate-700 break-words lg:text-right">{tAdmin("工时分配 (正常/加班)")}</span>
            <span className="font-extrabold leading-tight text-slate-700 break-words text-center">{tAdmin("工时饱和率")}</span>
          </div>
        </div>
      </div>

      <div className="divide-y divide-slate-50 max-h-[350px] overflow-y-auto pr-1 space-y-3.5 pt-1">
        {stats.map((stat) => {
          const totalH = stat.totalValidHours;
          const otH = stat.totalOvertimeHours;
          const regH = Math.max(0, totalH - otH);
          const regPct = maxRegHour > 0 ? (regH / maxRegHour) * 100 : 0;
          const otPct = maxRegHour > 0 ? (otH / maxRegHour) * 100 : 0;
          const satBg = stat.satiety > 110
            ? "bg-red-100 text-red-800 animate-pulse border border-red-200"
            : stat.satiety > 95
              ? "bg-emerald-100 text-emerald-800"
              : stat.satiety > 0
                ? "bg-slate-100 text-slate-600"
                : "bg-blue-50 text-blue-700";
          // 数据看板员工名片需要把昵称直接并入主姓名，便于在紧凑列表里识别员工；接口已返回 employeeNickname，不要额外拉员工列表拼装。
          const displayName = stat.employeeNickname ? `${stat.employeeName}(${stat.employeeNickname})` : stat.employeeName;

          return (
            <div key={stat.employeeId} className="flex flex-col gap-3 pt-3.5 pb-2 first:pt-0 group hover:bg-slate-50/50 rounded-lg px-2 transition xl:flex-row xl:items-center xl:justify-between">
              {/* 姓名列必须用剩余空间自然撑开；右侧指标列保持固定宽度，避免长姓名时重新引入固定姓名列导致看板横向拥挤。 */}
              <div className="flex flex-1 items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center font-black text-indigo-600 text-sm overflow-hidden flex-shrink-0">
                  {stat.employeePhoto ? <img src={stat.employeePhoto} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" /> : <span>{displayName.charAt(0)}</span>}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-bold leading-tight text-slate-800 break-words">{displayName}</h4>
                  <span className="text-[10px] font-medium leading-tight text-slate-400 break-words">{stat.employeeDept || tAdmin("未分配")} · {stat.employeeRole || tAdmin("未设置职位")}</span>
                </div>
              </div>

              <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-start sm:justify-between xl:w-auto xl:flex-shrink-0 xl:items-center xl:justify-end xl:gap-6">
                <div className="flex min-w-0 flex-1 flex-col gap-1 sm:max-w-[260px] xl:w-[220px] xl:flex-shrink-0 xl:items-end">
                  <div className="flex flex-wrap justify-end gap-x-2 gap-y-1 text-[10px] font-semibold text-slate-500">
                    <span>{tAdmin("标准:{{hours}}h", { hours: regH.toFixed(0) })}</span>
                    {otH > 0 && <span className="text-amber-600 font-bold">{tAdmin("加班:{{hours}}h", { hours: otH.toFixed(0) })}</span>}
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden flex">
                    <div className="bg-blue-500 h-full" style={{ width: `${Math.max(5, regPct)}%` }} title={tAdmin("正常应出勤时长")} />
                    {otH > 0 && <div className="bg-amber-400 h-full" style={{ width: `${otPct}%` }} title={tAdmin("累计额外加班时长")} />}
                  </div>
                </div>

                <div className="flex w-full flex-col items-start sm:w-24 sm:items-center flex-shrink-0">
                  <span className={cn("text-[10px] font-black px-2 py-0.5 rounded-full text-center leading-tight break-words", satBg)}>{stat.satiety > 0 ? `${stat.satiety}%` : tAdmin("休假中")}</span>
                  <span className="mt-0.5 text-[9px] leading-tight text-slate-400 sm:text-center">{tAdmin("工时: {{hours}}h", { hours: totalH.toFixed(1) })}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RuleRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col justify-between gap-1.5 rounded-xl bg-slate-50 p-3 text-xs transition hover:bg-slate-100 sm:flex-row sm:items-center">
      <span className="font-medium leading-tight text-slate-500 break-words">{label}</span>
      <span className="font-bold leading-tight text-slate-800 break-words sm:text-right">{value}</span>
    </div>
  );
}

function GuideButton({ icon, label, onClick }: { icon: ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex min-h-[84px] cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-3 text-center text-xs font-bold text-slate-600 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 hover:shadow"
    >
      {icon}
      <span className="whitespace-normal leading-tight break-words">{label}</span>
    </button>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
      {text}
    </div>
  );
}
