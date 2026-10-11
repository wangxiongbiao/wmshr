/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Key,
  Eye,
  RefreshCw,
  X,
  Calendar,
  Settings,
  Users,
  Loader2,
} from "lucide-react";
import { Employee } from "../../../types";
import {
  cn,
  formatCurrency,
  formatDate,
  COUNTRY_FLAGS,
  COUNTRY_NAMES,
  WAREHOUSE_FLAGS,
  WAREHOUSE_NAMES,
} from "../../../lib/utils";
import { getTranslation } from "../../../lib/i18n";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Badge } from "../../ui/badge";
import { Card } from "../../ui/card";
import { Tabs, TabsList, TabsTrigger } from "../../ui/tabs";
import { Pagination } from "../../Pagination";
import { useEmployeeList } from "../hooks/useEmployeeList";
import { EmployeeCredentialsModal } from "./EmployeeCredentialsModal";
import { HolidaySettingsModal } from "./HolidaySettingsModal";
import { EmployeeDetailModal } from "./EmployeeDetailModal";
import type { EmployeeListProps } from "../types";

export function EmployeeList({
  employees,
  loading = false,
  reloadKey = 0,
  currentWarehouseCode = "TH",
  loadEmployees,
  onRefresh,
  onAddEmployee,
  onEditEmployee,
  onDeleteEmployee,
  onUpdateEmployeePassword,
  holidays,
  onUpdateHolidays,
  onOpenSettings,
  hasPermission = () => true,
  lang = "zh-CN",
  addToast,
}: EmployeeListProps) {
  const warehouseCode = currentWarehouseCode || "TH";

  const {
    query,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    page,
    setPage,
    pageSize,
    setPageSize,
    remoteRows,
    remoteTotal,
    remoteLoading,
    remoteError,
    isRefreshing,
    handleManualRefresh,
    filteredEmployees,
    totalEmployees,
  } = useEmployeeList({
    employees,
    loadEmployees,
    onRefresh,
    warehouseCode,
    reloadKey,
    addToast,
    lang,
  });

  const [activeCredsEmployee, setActiveCredsEmployee] = useState<Employee | null>(null);
  const [selectedDetailEmployee, setSelectedDetailEmployee] = useState<Employee | null>(null);
  const [isHolidayModalOpen, setIsHolidayModalOpen] = useState(false);
  const [loadingEditId, setLoadingEditId] = useState<number | null>(null);

  // Sync selectedDetailEmployee when employee array updates
  const activeDetailEmp = selectedDetailEmployee
    ? employees.find((e) => e.id === selectedDetailEmployee.id) || selectedDetailEmployee
    : null;

  return (
    <div className="space-y-6">
      {/* Search & Action Toolbar */}
      <div className="bg-slate-50/95 border border-slate-200/80 rounded-xl p-3 shadow-2xs flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-6">
        {/* Left: Search & Filter */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto">
          {/* Search Box */}
          <div className="relative w-full sm:w-60">
            <Input
              type="text"
              value={query}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              placeholder={getTranslation("search_placeholder", lang)}
              className="h-8 text-xs pl-8 pr-7 bg-white shadow-xs rounded-lg"
            />
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            {query && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => {
                  setSearchQuery("");
                  setPage(1);
                }}
                className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 p-0 cursor-pointer"
                title="清空搜索"
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>

          {/* Status Filter Tabs */}
          <Tabs
            value={statusFilter}
            onValueChange={(val) => {
              setStatusFilter(val as "active" | "resigned");
              setPage(1);
            }}
          >
            <TabsList className="h-8 p-0.5 bg-slate-200/60 border border-slate-200/40 rounded-lg">
              <TabsTrigger
                value="active"
                className="h-[26px] px-2.5 text-xs font-medium rounded-md data-[state=active]:font-semibold"
              >
                {getTranslation("active_employees", lang)}
              </TabsTrigger>
              <TabsTrigger
                value="resigned"
                className="h-[26px] px-2.5 text-xs font-medium rounded-md data-[state=active]:font-semibold"
              >
                {getTranslation("resigned_employees", lang)}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-start md:justify-end flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (hasPermission("attendance_edit")) {
                setIsHolidayModalOpen(true);
              }
            }}
            disabled={!hasPermission("attendance_edit")}
            className="h-8 text-xs font-medium shadow-xs flex items-center justify-center gap-1.5 px-3"
            title={hasPermission("attendance_edit") ? getTranslation("holiday_settings_btn", lang) : "无权限配置假期"}
          >
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            {!hasPermission("attendance_edit") && "🔒"} {getTranslation("holiday_settings_btn", lang)}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (hasPermission("attendance_edit")) {
                onOpenSettings();
              }
            }}
            disabled={!hasPermission("attendance_edit")}
            className="h-8 text-xs font-medium shadow-xs flex items-center justify-center gap-1.5 px-3"
            title={hasPermission("attendance_edit") ? getTranslation("attendance_settings_btn", lang) : "无权限配置考勤"}
          >
            <Settings className="w-3.5 h-3.5 text-slate-500" />
            {!hasPermission("attendance_edit") && "🔒"} {getTranslation("attendance_settings_btn", lang)}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="h-8 text-xs font-medium shadow-xs flex items-center justify-center gap-1.5 px-3 cursor-pointer"
            title="刷新员工数据"
          >
            <RefreshCw className={cn("w-3.5 h-3.5 text-slate-500", isRefreshing && "animate-spin")} />
            刷新
          </Button>
          <Button
            size="sm"
            onClick={() => {
              if (hasPermission("employees_edit")) {
                onAddEmployee();
              }
            }}
            disabled={!hasPermission("employees_edit")}
            className="h-8 text-xs font-medium shadow-xs flex items-center justify-center gap-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
            title={hasPermission("employees_edit") ? getTranslation("add_employee_btn", lang) : "无权限新增员工"}
          >
            <Plus className="w-3.5 h-3.5" />
            {!hasPermission("employees_edit") && "🔒"} {getTranslation("add_employee_btn", lang)}
          </Button>
        </div>
      </div>

      {/* Grid of Employee Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {remoteError ? (
          <div className="col-span-full rounded-xl bg-red-50 p-4 text-center text-sm text-red-600">
            {remoteError}
          </div>
        ) : null}

        {(loading || remoteLoading) && employees.length === 0 && (!remoteRows || remoteRows.length === 0) ? (
          Array.from({ length: 8 }).map((_, idx) => (
            <div
              key={`skeleton-${idx}`}
              className="rounded-xl border border-slate-200/80 bg-white/70 p-5 shadow-xs animate-pulse space-y-4"
            >
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-slate-200/80 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-200 rounded w-2/3" />
                  <div className="flex gap-2">
                    <div className="h-3 bg-slate-100 rounded-full w-12" />
                    <div className="h-3 bg-slate-100 rounded-full w-14" />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100">
                <div className="space-y-1">
                  <div className="h-2 bg-slate-100 rounded w-10" />
                  <div className="h-3.5 bg-slate-200/70 rounded w-16" />
                </div>
                <div className="space-y-1">
                  <div className="h-2 bg-slate-100 rounded w-10" />
                  <div className="h-3.5 bg-slate-200/70 rounded w-16" />
                </div>
                <div className="space-y-1">
                  <div className="h-2 bg-slate-100 rounded w-10" />
                  <div className="h-3.5 bg-slate-200/70 rounded w-20" />
                </div>
                <div className="space-y-1">
                  <div className="h-2 bg-slate-100 rounded w-10" />
                  <div className="h-3.5 bg-slate-200/70 rounded w-20" />
                </div>
              </div>
            </div>
          ))
        ) : filteredEmployees.length === 0 ? (
          <div className="col-span-full py-16 px-4 flex flex-col items-center justify-center text-center bg-white/60 border border-dashed border-slate-200 rounded-2xl">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-4 shadow-3xs">
              <Users className="w-8 h-8 text-slate-300" />
            </div>
            {query.trim() ? (
              <div className="max-w-md space-y-2">
                <h4 className="text-base font-bold text-slate-800">
                  {getTranslation("empty_search_title", lang)}
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {getTranslation("empty_search_desc", lang)}
                </p>
                <div className="pt-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setSearchQuery("")}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition cursor-pointer"
                  >
                    {getTranslation("clear_search_btn", lang)}
                  </Button>
                </div>
              </div>
            ) : statusFilter === "active" ? (
              <div className="max-w-md space-y-2">
                <h4 className="text-base font-bold text-slate-800">
                  {warehouseCode
                    ? `当前【${WAREHOUSE_NAMES[warehouseCode] || `${warehouseCode}仓`}】暂无在职员工`
                    : getTranslation("empty_active_title", lang)}
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {warehouseCode
                    ? "当前海外仓暂无在职员工档案，立即添加第一位员工开始排班与算薪。"
                    : getTranslation("empty_active_desc", lang)}
                </p>
                <div className="pt-2 flex items-center justify-center gap-2">
                  {hasPermission("employees_edit") && (
                    <Button
                      type="button"
                      size="sm"
                      onClick={onAddEmployee}
                      className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      {getTranslation("add_employee_btn", lang)}
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="max-w-md space-y-2">
                <h4 className="text-base font-bold text-slate-800">
                  {getTranslation("empty_resigned_title", lang)}
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {getTranslation("empty_resigned_desc", lang)}
                </p>
              </div>
            )}
          </div>
        ) : (
          filteredEmployees.map((emp) => (
            <Card
              key={emp.id}
              onClick={() => setSelectedDetailEmployee(emp)}
              className="p-5 hover:shadow-md hover:border-slate-300 transition-all duration-300 flex flex-col relative group cursor-pointer border-slate-200"
            >
              {/* Quick Action Overlay */}
              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1.5 z-10">
                <Button
                  size="icon"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedDetailEmployee(emp);
                  }}
                  className="h-7 w-7 bg-white rounded-lg shadow-xs border border-blue-200 hover:bg-blue-50 text-blue-600"
                  title="查看详情"
                >
                  <Eye className="w-3.5 h-3.5" />
                </Button>
                {hasPermission("employees_reset_pwd") && (
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveCredsEmployee(emp);
                    }}
                    className="h-7 w-7 bg-white rounded-lg shadow-xs border border-blue-200 hover:bg-blue-50 text-blue-600"
                    title="管理 APP 账号"
                  >
                    <Key className="w-3.5 h-3.5" />
                  </Button>
                )}
                {hasPermission("employees_edit") && (
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (loadingEditId) return;
                      try {
                        setLoadingEditId(emp.id);
                        await onEditEmployee(emp);
                      } finally {
                        setLoadingEditId(null);
                      }
                    }}
                    disabled={loadingEditId === emp.id}
                    className="h-7 w-7 bg-white rounded-lg shadow-xs border border-slate-200 hover:bg-slate-50 text-slate-600 disabled:opacity-50"
                    title="编辑"
                  >
                    {loadingEditId === emp.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                    ) : (
                      <Edit className="w-3.5 h-3.5" />
                    )}
                  </Button>
                )}
                {hasPermission("employees_delete") && (
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteEmployee(emp);
                    }}
                    className="h-7 w-7 bg-white rounded-lg shadow-xs border border-red-200 hover:bg-red-50 text-red-500"
                    title="删除"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>

              {/* Avatar & Header */}
              <div className="flex items-start gap-4 mb-4">
                <div className="w-16 h-16 rounded-full bg-slate-100 border-2 border-slate-200 overflow-hidden flex-shrink-0 flex items-center justify-center">
                  {emp.photo ? (
                    <img src={emp.photo} className="w-full h-full object-cover" alt={emp.name} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400 bg-slate-50 text-lg font-bold">
                      {emp.name.charAt(0)}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0 pr-8">
                  <h3 className="text-base font-bold text-slate-800 truncate">{emp.name}</h3>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-lg" title={COUNTRY_NAMES[emp.country]}>
                      {COUNTRY_FLAGS[emp.country]}
                    </span>
                    <Badge variant="secondary" className="text-[10px] font-normal">
                      {COUNTRY_NAMES[emp.country] || emp.country}
                    </Badge>
                    {emp.warehouseCode && (
                      <Badge variant="outline" className="text-[10px] font-bold text-blue-700 bg-blue-50 border-blue-200">
                        {WAREHOUSE_FLAGS[emp.warehouseCode] || "🏢"} {WAREHOUSE_NAMES[emp.warehouseCode] || `${emp.warehouseCode} 仓`}
                      </Badge>
                    )}
                    <Badge
                      variant="secondary"
                      className={cn(
                        "text-[10px]",
                        emp.gender === "female" ? "text-pink-600 bg-pink-50" : "text-blue-600 bg-blue-50"
                      )}
                    >
                      {emp.gender === "female"
                        ? (lang === "en" ? "Female" : lang === "th" ? "หญิง" : lang === "zh-TW" ? "女" : "女")
                        : (lang === "en" ? "Male" : lang === "th" ? "ชาย" : lang === "zh-TW" ? "男" : "男")}
                    </Badge>
                    <Badge
                      variant={
                        emp.status === "在职"
                          ? "success"
                          : emp.status === "离职"
                            ? "destructive"
                            : emp.status === "试用"
                              ? "warning"
                              : "secondary"
                      }
                      className="text-[10px]"
                    >
                      {emp.status === "在职"
                        ? (lang === "en" ? "Active" : lang === "th" ? "ทำงานอยู่" : lang === "zh-TW" ? "在職" : "在职")
                        : emp.status === "离职"
                          ? (lang === "en" ? "Resigned" : lang === "th" ? "ลาออก" : lang === "zh-TW" ? "離職" : "离职")
                          : emp.status === "试用"
                            ? (lang === "en" ? "Probation" : lang === "th" ? "ทดลองงาน" : lang === "zh-TW" ? "試用" : "试用")
                            : (lang === "en" ? "On Leave" : lang === "th" ? "ลาหยุด" : lang === "zh-TW" ? "休假" : "休假")}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Card Meta Grid */}
              <div className="grid grid-cols-2 gap-3 mb-2 text-sm border-t border-slate-100 pt-3">
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wide flex items-center justify-between">
                    <span>{getTranslation("emp_role", lang)}</span>
                    {emp.requiresAttendance === false && (
                      <span className="text-[9px] font-semibold text-amber-600 bg-amber-50 px-1 rounded border border-amber-200/50">
                        {lang === "en" ? "Exempt" : "免打卡"}
                      </span>
                    )}
                  </p>
                  <p className="font-medium text-slate-700 truncate">{emp.role}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wide">{getTranslation("emp_dept", lang)}</p>
                  <p className="font-medium text-slate-700 truncate">{emp.dept || "-"}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wide">{getTranslation("emp_hourly_rate", lang)}</p>
                  <p className="font-semibold text-slate-700">
                    {emp.baseMonthlyWage !== undefined && emp.baseMonthlyWage > 0 ? (
                      <span title="由基础月工资换算：(月薪/30)/8 小时" className="font-mono">
                        {formatCurrency((emp.baseMonthlyWage / 30) / 8, emp.currency)}{" "}
                        <span className="text-[9px] text-slate-400 font-normal">
                          ({lang === "en" ? "est." : lang === "th" ? "ประมาณ" : "折算"})
                        </span>
                      </span>
                    ) : emp.hourlyRate !== undefined && emp.hourlyRate > 0 ? (
                      <span className="font-mono">{formatCurrency(emp.hourlyRate, emp.currency)}</span>
                    ) : emp.dailyWage !== undefined && emp.dailyWage > 0 ? (
                      <span title="由固定日薪换算：日薪/8 小时" className="font-mono">
                        {formatCurrency(emp.dailyWage / 8, emp.currency)}{" "}
                        <span className="text-[9px] text-slate-400 font-normal">
                          ({lang === "en" ? "est." : lang === "th" ? "ประมาณ" : "折算"})
                        </span>
                      </span>
                    ) : (
                      "-"
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wide">{getTranslation("emp_wage_type", lang)}</p>
                  <p className="font-semibold text-brand-600 font-mono">
                    {emp.baseMonthlyWage !== undefined && emp.baseMonthlyWage > 0
                      ? `${formatCurrency(emp.baseMonthlyWage, emp.currency)}/${lang === "en" ? "mo" : lang === "th" ? "เดือน" : "月"}`
                      : emp.dailyWage !== undefined && emp.dailyWage > 0 && emp.hourlyRate !== undefined && emp.hourlyRate > 0
                        ? `${formatCurrency(emp.dailyWage, emp.currency)}/${lang === "en" ? "day" : lang === "th" ? "วัน" : "天"} (${formatCurrency(emp.hourlyRate, emp.currency)}/${lang === "en" ? "hr" : lang === "th" ? "ชม." : "时"})`
                        : emp.dailyWage !== undefined && emp.dailyWage > 0
                          ? `${formatCurrency(emp.dailyWage, emp.currency)}/${lang === "en" ? "day" : lang === "th" ? "วัน" : "天"}`
                          : emp.hourlyRate !== undefined && emp.hourlyRate > 0
                            ? `${formatCurrency(emp.hourlyRate, emp.currency)}/${lang === "en" ? "hr" : lang === "th" ? "ชม." : "时"}`
                            : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wide">{getTranslation("emp_source_type", lang)}</p>
                  <p
                    className={cn(
                      "font-bold text-xs truncate",
                      emp.sourceType === "劳务派遣" ? "text-blue-600 animate-pulse-subtle" : "text-emerald-600"
                    )}
                  >
                    {emp.sourceType === "劳务派遣"
                      ? (emp.dispatchCommissionRate !== undefined && emp.dispatchCommissionRate > 0
                          ? (lang === "en" ? `Dispatch (${emp.dispatchCommissionRate}%)` : lang === "th" ? `ส่งตัว (${emp.dispatchCommissionRate}%)` : `派遣 (佣${emp.dispatchCommissionRate}%)`)
                          : (lang === "en" ? "Dispatch" : lang === "th" ? "ส่งตัว" : "劳务派遣")
                        )
                      : getTranslation("emp_source_direct", lang)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wide">{getTranslation("emp_join_date", lang)}</p>
                  <p className="font-medium text-slate-700 text-xs font-mono tabular-nums">{formatDate(emp.joinDate)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wide">{getTranslation("emp_attendance_bonus", lang)}</p>
                  <p className="font-semibold text-emerald-600 font-mono text-xs">
                    {emp.attendanceBonus !== undefined && emp.attendanceBonus > 0 ? (
                      formatCurrency(emp.attendanceBonus, emp.currency)
                    ) : (
                      <span className="text-xs text-slate-400 font-normal">-</span>
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wide">{getTranslation("emp_social_security", lang)}</p>
                  <p className="font-semibold text-rose-600 font-mono text-xs">
                    {emp.socialSecurity !== undefined && emp.socialSecurity > 0 ? (
                      formatCurrency(emp.socialSecurity, emp.currency)
                    ) : (
                      <span className="text-xs text-slate-400 font-normal">-</span>
                    )}
                  </p>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Pagination */}
      {loadEmployees && (
        <div className="mt-6">
          <Pagination
            page={page}
            pageSize={pageSize}
            total={totalEmployees}
            pageSizeOptions={[10, 20, 50, 100]}
            onPageChange={setPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setPage(1);
            }}
            disabled={remoteLoading}
            itemName="条"
          />
        </div>
      )}

      {/* Extracted Sub-Modals */}
      <EmployeeCredentialsModal
        employee={activeCredsEmployee}
        isOpen={!!activeCredsEmployee}
        onClose={() => setActiveCredsEmployee(null)}
        onUpdateEmployeePassword={onUpdateEmployeePassword}
        lang={lang}
      />

      <HolidaySettingsModal
        isOpen={isHolidayModalOpen}
        onClose={() => setIsHolidayModalOpen(false)}
        holidays={holidays}
        onUpdateHolidays={onUpdateHolidays}
        lang={lang}
      />

      <EmployeeDetailModal
        employee={activeDetailEmp}
        isOpen={!!selectedDetailEmployee}
        onClose={() => setSelectedDetailEmployee(null)}
        onEditEmployee={onEditEmployee}
        hasPermission={hasPermission}
        reloadKey={reloadKey}
        lang={lang}
      />
    </div>
  );
}
