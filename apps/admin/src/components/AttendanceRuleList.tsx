/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { type ReactNode, useEffect, useMemo, useState } from "react";
import { tAdmin } from "../lib/i18nText";
import { Clock3, Plus, Power, Search, Users } from "lucide-react";
import { AttendanceRule } from "../types";
import { cn, formatDateRange, formatDuration, formatCurrency, getAttendanceRuleEffectiveStatus } from "../lib/utils";
import { Pagination } from "./Pagination";

interface AttendanceRuleListProps {
  rules: AttendanceRule[];
  loading?: boolean;
  onAddRule: () => void;
  onEditRule: (rule: AttendanceRule) => void;
  onToggleRule: (rule: AttendanceRule) => void;
  onViewRelatedEmployees: (rule: AttendanceRule) => void;
}

export function AttendanceRuleList({
  rules,
  loading = false,
  onAddRule,
  onEditRule,
  onToggleRule,
  onViewRelatedEmployees
}: AttendanceRuleListProps) {
  const [keyword, setKeyword] = useState("");
  const [isActive, setIsActive] = useState("all");
  const [effectiveStatus, setEffectiveStatus] = useState("all");
  const [page, setPage] = useState(1);
  const pageSize = 6;

  const filteredRules = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();

    return rules.filter((rule) => {
      const effective = getAttendanceRuleEffectiveStatus(rule);

      if (isActive !== "all" && String(rule.isActive) !== isActive) {
        return false;
      }

      if (effectiveStatus !== "all") {
        const effectiveKey =
          effective.label === tAdmin("未开始") ? "upcoming" : effective.label === tAdmin("已过期") ? "expired" : "active";
        if (effectiveKey !== effectiveStatus) {
          return false;
        }
      }

      if (!normalizedKeyword) {
        return true;
      }

      return [
        rule.name,
        rule.startShift,
        rule.endShift,
        rule.breakStart,
        rule.breakEnd
      ].some((field) => field.toLowerCase().includes(normalizedKeyword));
    });
  }, [effectiveStatus, isActive, keyword, rules]);

  const totalPages = Math.max(1, Math.ceil(filteredRules.length / pageSize));
  const paginatedRules = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRules.slice(start, start + pageSize);
  }, [filteredRules, page]);

  const activeFilterCount = useMemo(() => {
    return [
      keyword.trim() !== "",
      isActive !== "all",
      effectiveStatus !== "all"
    ].filter(Boolean).length;
  }, [effectiveStatus, isActive, keyword]);

  const resetFilters = () => {
    setKeyword("");
    setIsActive("all");
    setEffectiveStatus("all");
    setPage(1);
  };

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  return (
    <div className="h-full min-h-0 flex flex-col">
      <div className="shrink-0 pb-4">
        {/* 考勤规则列表使用固定 Header + 滚动 Content：搜索/筛选和新增入口保留在顶部，规则卡片在下方独立滚动。 */}
        <div className="glass-panel rounded-xl p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="grid flex-1 grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[minmax(320px,1.4fr)_180px_180px]">
            <div>
              <label className="mb-1 block text-xs font-medium uppercase text-slate-500">{tAdmin("搜索规则")}</label>
              <div className="relative">
                <input
                  type="text"
                  value={keyword}
                  onChange={(event) => {
                    setKeyword(event.target.value);
                    setPage(1);
                  }}
                  placeholder={tAdmin("搜索规则名称或班次时间...")}
                  className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-transparent focus:ring-2 focus:ring-brand-500"
                />
                <Search className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium uppercase text-slate-500">{tAdmin("启用状态")}</label>
              <select
                value={isActive}
                onChange={(event) => {
                  setIsActive(event.target.value);
                  setPage(1);
                }}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="all">{tAdmin("全部状态")}</option>
                <option value="true">{tAdmin("启用")}</option>
                <option value="false">{tAdmin("停用")}</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium uppercase text-slate-500">{tAdmin("有效期状态")}</label>
              <select
                value={effectiveStatus}
                onChange={(event) => {
                  setEffectiveStatus(event.target.value);
                  setPage(1);
                }}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="all">{tAdmin("全部有效期")}</option>
                <option value="active">{tAdmin("生效中")}</option>
                <option value="upcoming">{tAdmin("未开始")}</option>
                <option value="expired">{tAdmin("已过期")}</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-2 xl:w-[220px] xl:flex-shrink-0">
            <label className="mb-1 block text-xs font-medium uppercase text-slate-500">{tAdmin("操作")}</label>
            {activeFilterCount > 0 ? (
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">{tAdmin("筛选中 {{count}}", { count: activeFilterCount })}</span>
              </div>
            ) : null}
            <div className="flex gap-3 xl:grid xl:grid-cols-2">
              <button
                onClick={resetFilters}
                className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
              >{tAdmin("重置")}</button>
              <button
                onClick={onAddRule}
                className="flex-1 items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white shadow-md transition hover:bg-brand-700 xl:flex"
              >
                <Plus className="hidden h-4 w-4 xl:block" />{tAdmin("新增")}</button>
            </div>
          </div>
        </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
      {loading ? (
        <div className="glass-panel rounded-xl p-10 text-center text-sm text-slate-500">{tAdmin("正在加载考勤规则...")}</div>
      ) : filteredRules.length === 0 ? (
        <div className="glass-panel rounded-xl p-10 text-center text-sm text-slate-500">{tAdmin("当前筛选条件下没有考勤规则")}</div>
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {paginatedRules.map((rule) => {
            const effectiveMeta = getAttendanceRuleEffectiveStatus(rule);

            return (
              <div key={rule.id} className="glass-panel rounded-xl p-5 hover:shadow-md transition-all duration-300">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-lg font-bold text-slate-800 truncate">{rule.name}</h3>
                      <span className={cn(
                        "text-[10px] px-2 py-0.5 rounded-full",
                        rule.isActive ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-700"
                      )}>
                        {rule.isActive ? tAdmin("启用") : tAdmin("停用")}
                      </span>
                      <span className={cn("text-[10px] px-2 py-0.5 rounded-full", effectiveMeta.className)}>
                        {effectiveMeta.label}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-slate-500">{formatDateRange(rule.effectiveStartDate, rule.effectiveEndDate)}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onViewRelatedEmployees(rule)}
                      className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
                      title={tAdmin("查看关联员工")}
                    >
                      <Users className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onEditRule(rule)}
                      className="px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50"
                    >{tAdmin("编辑")}</button>
                    <button
                      onClick={() => onToggleRule(rule)}
                      className={cn(
                        "px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2",
                        rule.isActive
                          ? "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
                          : "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                      )}
                    >
                      <Power className="w-4 h-4" />
                      {rule.isActive ? tAdmin("停用") : tAdmin("启用")}
                    </button>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-3">
                  <RuleStatCard label={tAdmin("班次时间")} value={`${rule.startShift} - ${rule.endShift}`} />
                  <RuleStatCard label={tAdmin("休息时间")} value={`${rule.breakStart} - ${rule.breakEnd}`} />
                  <RuleStatCard label={tAdmin("标准工时")} value={formatDuration(rule.standardHours)} />
                  <RuleStatCard
                    label={tAdmin("关联员工")}
                    value={tAdmin("{{count}} 人", { count: rule.relatedEmployeeCount })}
                    icon={<Users className="w-4 h-4 text-slate-400" />}
                  />
                </div>

                <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase text-slate-400 mb-1">{tAdmin("加班规则")}</p>
                      <div className="text-sm font-medium text-slate-700 flex items-center gap-2">
                        <Clock3 className="w-4 h-4 text-slate-400" />
                        {rule.overtimeEnabled ? tAdmin("启用加班计算") : tAdmin("关闭加班计算")}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs uppercase text-slate-400 mb-1">{tAdmin("加班费标准")}</p>
                      <p className="text-sm font-semibold text-slate-800">
                        {rule.overtimeEnabled ? formatCurrency(rule.otHourlyFee, "THB") : tAdmin("不计加班费")}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 text-xs text-slate-500 rounded-lg bg-slate-50 px-3 py-2">{tAdmin("加班计量说明：按 {{hours}} 小时为最小单位，向下取整。", { hours: rule.overtimeMinUnitHours })}</div>
                </div>
              </div>
            );
          })}
          </div>

          <Pagination
            page={page}
            pageSize={pageSize}
            total={filteredRules.length}
            itemName={tAdmin("条规则")}
            onPageChange={setPage}
          />
        </div>
      )}
      </div>
    </div>
  );
}

function RuleStatCard({
  label,
  value,
  icon
}: {
  label: string;
  value: string;
  icon?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] text-slate-400 uppercase tracking-wide">{label}</p>
        {icon}
      </div>
      <p className="mt-2 text-sm font-semibold text-slate-800">{value}</p>
    </div>
  );
}
