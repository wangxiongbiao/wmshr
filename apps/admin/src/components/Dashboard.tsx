/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { type ReactNode, useEffect, useRef, useState } from "react";
import { AlertCircle, CalendarDays, CircleMinus, Clock3, ReceiptText, RefreshCw, SlidersHorizontal, Users, Wallet, Zap } from "lucide-react";
import type { DashboardData, DashboardEmployeeStat } from "../types";
import { fetchDashboardData } from "../lib/api";
import { cn, formatCurrency, formatDuration } from "../lib/utils";

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

export function Dashboard() {
  const [date, setDate] = useState(getTodayDate());
  const [yearMonth, setYearMonth] = useState(getTodayDate().slice(0, 7));
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const nextData = await fetchDashboardData({ date, yearMonth });
      setData(nextData);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "数据看板加载失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [date, yearMonth]);

  const employeeStats = data?.employeeStats || [];
  const currency = data?.currency || "THB";

  return (
    <div className="space-y-6">
      <div className="glass-panel rounded-xl p-5">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_180px_180px_120px]">
          <div>
            <p className="text-sm font-semibold text-slate-800">数据看板</p>
            <p className="mt-1 text-xs text-slate-400">看板只读取当前后台的员工、考勤、薪资和规则统计，不会自动重算或改写数据。</p>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium uppercase text-slate-500">当日统计日期</label>
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium uppercase text-slate-500">月度统计月份</label>
            <input
              type="month"
              value={yearMonth}
              onChange={(event) => setYearMonth(event.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium uppercase text-slate-500">操作</label>
            <button
              type="button"
              onClick={() => void loadData()}
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              刷新
            </button>
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      {loading && !data ? (
        <div className="glass-panel rounded-xl p-10 text-center text-sm text-slate-500">正在加载数据看板...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard icon={<Users className="h-6 w-6" />} label="在职员工" value={`${data?.activeEmployeeCount || 0}`} tone="blue" />
            <MetricCard icon={<Zap className="h-6 w-6" />} label="今日加班费" value={formatCurrency(data?.todayOvertimePay || 0, currency)} tone="orange" />
            <MetricCard icon={<AlertCircle className="h-6 w-6" />} label="今日异常率" value={`${(data?.todayExceptionRate || 0).toFixed(2)}%`} tone={(data?.todayExceptionCount || 0) > 0 ? "red" : "slate"} />
            <MetricCard icon={<Clock3 className="h-6 w-6" />} label="本月有效工时" value={formatDuration(data?.monthlyValidHours || 0)} tone="emerald" />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <MetricCard icon={<ReceiptText className="h-6 w-6" />} label="本月应发" value={formatCurrency(data?.monthlyPayrollGrossPay || 0, currency)} tone="blue" />
            <MetricCard icon={<CircleMinus className="h-6 w-6" />} label="本月扣款" value={formatCurrency(data?.monthlyPayrollDeduction || 0, currency)} tone="red" />
            <MetricCard icon={<Wallet className="h-6 w-6" />} label="本月实发" value={formatCurrency(data?.monthlyPayrollNetPay || 0, currency)} tone="emerald" />
          </div>

          <div className="glass-panel rounded-xl p-6">
            <div className="mb-6">
              <div>
                <h3 className="text-base font-semibold text-slate-800">员工月度有效工时统计</h3>
                <p className="mt-1 text-xs text-slate-400">数据来源：{yearMonth} 月度考勤汇总，按有效工时排序展示前 6 名。</p>
              </div>
            </div>

            {employeeStats.length === 0 ? (
              <div className="flex h-72 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
                当前月份还没有月度考勤汇总，请先在考勤计算中重算本月。
              </div>
            ) : (
              <EmployeeHoursChart stats={employeeStats} />
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SmallFact icon={<CalendarDays className="h-4 w-4" />} label="当日结果" value={`${data?.date || date} · ${data?.todayRecordCount || 0} 条`} />
            <SmallFact icon={<Clock3 className="h-4 w-4" />} label="本月加班计薪" value={formatDuration(data?.monthlyOvertimePayHours || 0)} />
            <SmallFact icon={<AlertCircle className="h-4 w-4" />} label="本月异常" value={`${data?.monthlyExceptionCount || 0} 条`} />
            <SmallFact icon={<SlidersHorizontal className="h-4 w-4" />} label="启用规则" value={`${data?.activeRuleCount || 0} 条`} />
          </div>
        </>
      )}
    </div>
  );
}

function escapeTooltipText(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function EmployeeHoursChart({ stats }: { stats: DashboardEmployeeStat[] }) {
  const chartRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!chartRef.current) {
      return;
    }

    const chartElement = chartRef.current;
    const names = stats.map((stat) => stat.employeeName);
    const regularHours = stats.map((stat) => Math.max(0, stat.validHours - stat.overtimePayHours));
    const overtimeHours = stats.map((stat) => stat.overtimePayHours);
    let disposed = false;
    let resizeObserver: ResizeObserver | null = null;
    let chart: { setOption: (option: unknown) => void; resize: () => void; dispose: () => void } | null = null;

    void (async () => {
      const [
        echartsCore,
        charts,
        components,
        renderers
      ] = await Promise.all([
        import("echarts/core"),
        import("echarts/charts"),
        import("echarts/components"),
        import("echarts/renderers")
      ]);

      if (disposed) {
        return;
      }

      echartsCore.use([
        charts.BarChart,
        components.GridComponent,
        components.LegendComponent,
        components.TooltipComponent,
        renderers.CanvasRenderer
      ]);

      chart = echartsCore.init(chartElement);
      chart.setOption({
        color: ["#2563eb", "#cbd5e1"],
        tooltip: {
          trigger: "axis",
          axisPointer: { type: "shadow" },
          confine: true,
          borderWidth: 0,
          backgroundColor: "rgba(15, 23, 42, 0.94)",
          padding: [10, 12],
          textStyle: {
            color: "#fff",
            fontSize: 12
          },
          formatter: (params: unknown) => {
            const items = Array.isArray(params)
              ? params as Array<{ dataIndex?: number; marker?: string; seriesName?: string; value?: number | string }>
              : [];
            const stat = stats[items[0]?.dataIndex ?? 0];
            if (!stat) {
              return "";
            }

            const seriesRows = items.map((item) => {
              const value = Number(item.value || 0);
              return `<div style="display:flex;align-items:center;justify-content:space-between;gap:18px;margin-top:6px;">
                <span>${item.marker || ""}${escapeTooltipText(item.seriesName || "")}</span>
                <strong>${formatDuration(value)}</strong>
              </div>`;
            }).join("");

            return `<div>
              <div style="font-weight:700;margin-bottom:8px;">${escapeTooltipText(stat.employeeName)}</div>
              <div style="display:flex;justify-content:space-between;gap:18px;">
                <span>总有效工时</span>
                <strong>${formatDuration(stat.validHours)}</strong>
              </div>
              ${seriesRows}
              <div style="display:flex;justify-content:space-between;gap:18px;margin-top:6px;color:#fecaca;">
                <span>异常记录</span>
                <strong>${stat.exceptionCount} 条</strong>
              </div>
            </div>`;
          }
        },
        legend: {
          top: 0,
          right: 4,
          itemWidth: 10,
          itemHeight: 10,
          icon: "roundRect",
          textStyle: {
            color: "#64748b",
            fontSize: 12
          }
        },
        grid: {
          top: 48,
          left: 8,
          right: 8,
          bottom: 8,
          containLabel: true
        },
        xAxis: {
          type: "category",
          data: names,
          axisTick: { show: false },
          axisLine: { lineStyle: { color: "#cbd5e1" } },
          axisLabel: {
            color: "#475569",
            fontSize: 12,
            interval: 0,
            formatter: (value: string) => value.length > 6 ? `${value.slice(0, 6)}...` : value
          }
        },
        yAxis: {
          type: "value",
          name: "小时",
          nameTextStyle: {
            color: "#94a3b8",
            fontSize: 11
          },
          axisLabel: {
            color: "#64748b",
            formatter: (value: number) => `${value}h`
          },
          splitLine: {
            lineStyle: {
              color: "#e2e8f0",
              type: "dashed"
            }
          }
        },
        series: [
          {
            name: "普通有效工时",
            type: "bar",
            stack: "hours",
            data: regularHours,
            barMaxWidth: 42,
            itemStyle: {
              color: "#2563eb",
              borderRadius: [0, 0, 6, 6]
            },
            emphasis: { focus: "series" }
          },
          {
            name: "加班计薪",
            type: "bar",
            stack: "hours",
            data: overtimeHours,
            barMaxWidth: 42,
            itemStyle: {
              color: "#cbd5e1",
              borderRadius: [6, 6, 0, 0]
            },
            emphasis: { focus: "series" }
          }
        ]
      });

      resizeObserver = new ResizeObserver(() => chart?.resize());
      resizeObserver.observe(chartElement);
    })();

    return () => {
      disposed = true;
      resizeObserver?.disconnect();
      chart?.dispose();
    };
  }, [stats]);

  return <div ref={chartRef} className="h-72 w-full rounded-xl bg-white/40" />;
}

function MetricCard({
  icon,
  label,
  value,
  tone
}: {
  icon: ReactNode;
  label: string;
  value: string;
  tone: "blue" | "orange" | "red" | "emerald" | "slate";
}) {
  const toneClass = {
    blue: "bg-blue-500 shadow-blue-500/30",
    orange: "bg-orange-500 shadow-orange-500/30",
    red: "bg-red-500 shadow-red-500/30",
    emerald: "bg-emerald-500 shadow-emerald-500/30",
    slate: "bg-slate-500 shadow-slate-500/30"
  }[tone];

  return (
    <div className="stat-card flex items-center gap-4 rounded-xl bg-white p-5">
      <div className={cn("flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full text-white shadow-lg", toneClass)}>
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <p className="text-2xl font-bold text-slate-800">{value}</p>
      </div>
    </div>
  );
}

function SmallFact({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="glass-panel flex items-center gap-3 rounded-xl p-4">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-500">{icon}</div>
      <div>
        <p className="text-xs text-slate-400">{label}</p>
        <p className="text-sm font-semibold text-slate-700">{value}</p>
      </div>
    </div>
  );
}
