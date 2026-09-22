import { Pagination } from "./Pagination";
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Search, Plus, Edit, Trash2, Key, Copy, Check, Eye, EyeOff, RefreshCw, X, Calendar, Trash, Settings, Users, Loader2 } from "lucide-react";
import { Employee, HolidayRecord } from "../types";
import type { EmployeePageResult } from "../lib/employeeApi";
import { INITIAL_HOLIDAYS } from "../constants";
import { cn, formatCurrency, COUNTRY_FLAGS, COUNTRY_NAMES, WAREHOUSE_FLAGS, WAREHOUSE_NAMES } from "../lib/utils";
import { useEffect, useMemo, useRef, useState } from "react";
import { getTranslation, Language } from "../lib/i18n";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Card } from "./ui/card";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "./ui/dialog";
import { Label } from "./ui/label";
import { DatePicker } from "./ui/date-picker";


interface EmployeeListProps {
  employees: Employee[];
  loading?: boolean;
  reloadKey?: number;
  currentWarehouseCode?: string;
  loadEmployees?: (status: "active" | "resigned", keyword: string, page: number, pageSize: number, warehouseCode?: string) => Promise<EmployeePageResult>;
  onRefresh?: () => Promise<void> | void;
  onAddEmployee: () => void;
  onEditEmployee: (emp: Employee) => Promise<void> | void;
  onDeleteEmployee: (emp: Employee) => void;
  onUpdateEmployeePassword?: (empId: number, newPass: string) => Promise<void> | void;
  holidays: HolidayRecord[];
  onUpdateHolidays: (list: HolidayRecord[]) => void;
  onOpenSettings: () => void;
  hasPermission?: (permId: string) => boolean;
  lang?: Language;
  addToast?: (msg: string, type?: "success" | "error" | "info") => void;
}

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
  addToast
}: EmployeeListProps) {
  const [query, setSearchQuery] = useState("");
  const [activeCredsEmployee, setActiveCredsEmployee] = useState<Employee | null>(null);
  const [copiedField, setCopiedField] = useState<"username" | null>(null);
  const [selectedDetailEmployee, setSelectedDetailEmployee] = useState<Employee | null>(null);
  const [isHolidayModalOpen, setIsHolidayModalOpen] = useState(false);
  const [newHolidayDate, setNewHolidayDate] = useState("");
  const [newHolidayName, setNewHolidayName] = useState("");
  const [newHolidayCountry, setNewHolidayCountry] = useState("CN");
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [recentlyResetInfo, setRecentlyResetInfo] = useState<{ empId: number; newPass: string } | null>(null);
  const [copiedPass, setCopiedPass] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [loadingEditId, setLoadingEditId] = useState<number | null>(null);

  const [statusFilter, setStatusFilter] = useState<'active' | 'resigned'>('active');
  const warehouseCode = currentWarehouseCode || "TH";
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [remoteRows, setRemoteRows] = useState<Employee[] | null>(null);
  const [remoteTotal, setRemoteTotal] = useState<number | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [remoteLoading, setRemoteLoading] = useState(false);
  const [remoteError, setRemoteError] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const requestIdRef = useRef(0);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      if (onRefresh) {
        await onRefresh();
      }
      if (loadEmployees) {
        const result = await loadEmployees(statusFilter, query, page, pageSize, warehouseCode);
        setRemoteRows(result.items);
        setRemoteTotal(result.total);
        setHasMore(result.hasMore);
      }
      addToast?.(lang === "zh-CN" ? "员工与考勤数据已刷新" : "Data refreshed", "success");
    } catch (err) {
      console.error("Manual refresh error:", err);
      addToast?.(err instanceof Error ? err.message : "刷新失败", "error");
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  useEffect(() => {
    setPage(1);
    setRemoteRows(null);
    setRemoteTotal(null);
  }, [query, statusFilter, warehouseCode]);

  useEffect(() => {
    if (!loadEmployees) return;
    const requestId = ++requestIdRef.current;
    setRemoteLoading(true);
    const delay = query.trim() ? 150 : 0;
    const timer = window.setTimeout(() => {
      setRemoteError("");
      void loadEmployees(statusFilter, query, page, pageSize, warehouseCode)
        .then(result => {
          if (requestId !== requestIdRef.current) return;
          setRemoteRows(result.items);
          setRemoteTotal(result.total);
          setHasMore(result.hasMore);
        })
        .catch(error => {
          if (requestId === requestIdRef.current) setRemoteError(error instanceof Error ? error.message : "员工列表加载失败");
        })
        .finally(() => {
          if (requestId === requestIdRef.current) setRemoteLoading(false);
        });
    }, delay);
    return () => window.clearTimeout(timer);
  }, [loadEmployees, page, pageSize, query, reloadKey, statusFilter, warehouseCode]);

  const inMemoryFiltered = useMemo(() => employees.filter(emp => {
    const matchesWarehouse = !emp.warehouseCode || emp.warehouseCode === warehouseCode;
    if (!matchesWarehouse) return false;

    const q = query.trim().toLowerCase();
    const matchesQuery = !q ||
      emp.name.toLowerCase().includes(q) ||
      emp.role.toLowerCase().includes(q) ||
      emp.dept.toLowerCase().includes(q) ||
      (emp.employeeNo && emp.employeeNo.toLowerCase().includes(q));

    if (!matchesQuery) return false;

    if (statusFilter === 'active') {
      return emp.status !== '离职' && emp.status !== 'resigned';
    } else if (statusFilter === 'resigned') {
      return emp.status === '离职' || emp.status === 'resigned';
    }
    return true;
  }), [employees, warehouseCode, query, statusFilter]);

  const filteredEmployees = useMemo(() => {
    if (!loadEmployees) {
      return inMemoryFiltered;
    }
    if (remoteRows) {
      const empMap = new Map(employees.map(e => [e.id, e]));
      const updatedRows = remoteRows.map(r => empMap.get(r.id) || r);
      const validRows = updatedRows.filter(emp => {
        if (statusFilter === "active") {
          return emp.status !== "离职" && emp.status !== "resigned";
        } else if (statusFilter === "resigned") {
          return emp.status === "离职" || emp.status === "resigned";
        }
        return true;
      });
      const remoteIds = new Set(remoteRows.map(r => r.id));
      const newlyAdded = inMemoryFiltered.filter(e => !remoteIds.has(e.id));
      return [...newlyAdded, ...validRows];
    }
    return inMemoryFiltered;
  }, [loadEmployees, inMemoryFiltered, remoteRows, employees, statusFilter]);

  const copyToClipboard = async (text: string, field: "username") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand("copy");
        setCopiedField(field);
        setTimeout(() => setCopiedField(null), 2000);
      } catch (e) {
        console.error(e);
      }
      document.body.removeChild(textarea);
    }
  };

  const currentModalEmp = activeCredsEmployee ? (filteredEmployees.find(e => e.id === activeCredsEmployee.id) || activeCredsEmployee) : null;

  return (
    <div className="space-y-6">
      <div className="bg-slate-50/95 border border-slate-200/80 rounded-xl p-3 shadow-2xs flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-6">
        {/* Left: Search & Filter */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto">
          {/* Search Box */}
          <div className="relative w-full sm:w-60">
            <Input
              type="text"
              value={query}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              placeholder={getTranslation("search_placeholder", lang)}
              className="h-8 text-xs pl-8 pr-7 bg-white shadow-xs rounded-lg"
            />
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            {query && (
              <button
                type="button"
                onClick={() => { setSearchQuery(""); setPage(1); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
                title="清空搜索"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status Filter Tabs */}
          <Tabs value={statusFilter} onValueChange={(val) => { setStatusFilter(val as 'active' | 'resigned'); setPage(1); }}>
            <TabsList className="h-8 p-0.5 bg-slate-200/60 border border-slate-200/40 rounded-lg">
              <TabsTrigger value="active" className="h-[26px] px-2.5 text-xs font-medium rounded-md data-[state=active]:font-semibold">
                {getTranslation("active_employees", lang)}
              </TabsTrigger>
              <TabsTrigger value="resigned" className="h-[26px] px-2.5 text-xs font-medium rounded-md data-[state=active]:font-semibold">
                {getTranslation("resigned_employees", lang)}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Right: Actions Grouped Nicely Together */}
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {remoteError ? <div className="col-span-full rounded-xl bg-red-50 p-4 text-center text-sm text-red-600">{remoteError}</div> : null}
        {((loading || remoteLoading) && employees.length === 0 && (!remoteRows || remoteRows.length === 0)) ? (
          Array.from({ length: 8 }).map((_, idx) => (
            <div key={`skeleton-${idx}`} className="rounded-xl border border-slate-200/80 bg-white/70 p-5 shadow-xs animate-pulse space-y-4">
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
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition cursor-pointer"
                  >
                    {getTranslation("clear_search_btn", lang)}
                  </button>
                </div>
              </div>
            ) : statusFilter === 'active' ? (
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
                    <button
                      type="button"
                      onClick={onAddEmployee}
                      className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      {getTranslation("add_employee_btn", lang)}
                    </button>
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
          filteredEmployees.map(emp => (
          <Card 
            key={emp.id} 
            onClick={() => setSelectedDetailEmployee(emp)}
            className="p-5 hover:shadow-md hover:border-slate-300 transition-all duration-300 flex flex-col relative group cursor-pointer border-slate-200"
          >
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
                    setCopiedField(null);
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
                  {loadingEditId === emp.id ? <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" /> : <Edit className="w-3.5 h-3.5" />}
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
                  <span className="text-lg" title={COUNTRY_NAMES[emp.country]}>{COUNTRY_FLAGS[emp.country]}</span>
                  <Badge variant="secondary" className="text-[10px] font-normal">{COUNTRY_NAMES[emp.country] || emp.country}</Badge>
                  {emp.warehouseCode && (
                    <Badge variant="outline" className="text-[10px] font-bold text-blue-700 bg-blue-50 border-blue-200">
                      {WAREHOUSE_FLAGS[emp.warehouseCode] || "🏢"} {WAREHOUSE_NAMES[emp.warehouseCode] || `${emp.warehouseCode} 仓`}
                    </Badge>
                  )}
                  <Badge variant="secondary" className={cn(
                    "text-[10px]",
                    emp.gender === 'female' ? 'text-pink-600 bg-pink-50' : 'text-blue-600 bg-blue-50'
                  )}>
                    {emp.gender === 'female' 
                      ? (lang === 'en' ? 'Female' : lang === 'th' ? 'หญิง' : lang === 'zh-TW' ? '女' : '女') 
                      : (lang === 'en' ? 'Male' : lang === 'th' ? 'ชาย' : lang === 'zh-TW' ? '男' : '男')}
                  </Badge>
                  <Badge variant={emp.status === '在职' ? "success" : (emp.status === '离职' ? "destructive" : "secondary")} className="text-[10px]">
                    {emp.status === '在职' 
                      ? (lang === 'en' ? 'Active' : lang === 'th' ? 'ทำงานอยู่' : lang === 'zh-TW' ? '在職' : '在职')
                      : emp.status === '离职'
                        ? (lang === 'en' ? 'Resigned' : lang === 'th' ? 'ลาออก' : lang === 'zh-TW' ? '離職' : '离职')
                        : (lang === 'en' ? 'On Leave' : lang === 'th' ? 'ลาหยุด' : lang === 'zh-TW' ? '休假' : '休假')
                    }
                  </Badge>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-2 text-sm border-t border-slate-100 pt-3">
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wide">{getTranslation("emp_role", lang)}</p>
                <p className="font-medium text-slate-700 truncate">{emp.role}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wide">{getTranslation("emp_dept", lang)}</p>
                <p className="font-medium text-slate-700 truncate">{emp.dept || '-'}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wide">{getTranslation("emp_hourly_rate", lang)}</p>
                <p className="font-semibold text-slate-700">
                  {emp.baseMonthlyWage !== undefined && emp.baseMonthlyWage > 0 ? (
                    <span title="由基础月工资换算：(月薪/30)/8 小时" className="font-mono">
                      {formatCurrency((emp.baseMonthlyWage / 30) / 8, emp.currency)} <span className="text-[9px] text-slate-400 font-normal">({lang === 'en' ? 'est.' : lang === 'th' ? 'ประมาณ' : '折算'})</span>
                    </span>
                  ) : emp.dailyWage !== undefined && emp.dailyWage > 0 ? (
                    <span title="由固定日薪换算：日薪/8 小时" className="font-mono">
                      {formatCurrency(emp.dailyWage / 8, emp.currency)} <span className="text-[9px] text-slate-400 font-normal">({lang === 'en' ? 'est.' : lang === 'th' ? 'ประมาณ' : '折算'})</span>
                    </span>
                  ) : (
                    emp.hourlyRate !== undefined && emp.hourlyRate > 0 ? formatCurrency(emp.hourlyRate, emp.currency) : '-'
                  )}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wide">{getTranslation("emp_wage_type", lang)}</p>
                <p className="font-semibold text-brand-600 font-mono">
                  {emp.baseMonthlyWage !== undefined && emp.baseMonthlyWage > 0 
                    ? `${formatCurrency(emp.baseMonthlyWage, emp.currency)}/${lang === 'en' ? 'mo' : lang === 'th' ? 'เดือน' : '月'}` 
                    : emp.dailyWage !== undefined && emp.dailyWage > 0 
                      ? `${formatCurrency(emp.dailyWage, emp.currency)}/${lang === 'en' ? 'day' : lang === 'th' ? 'วัน' : '天'}`
                      : emp.hourlyRate !== undefined && emp.hourlyRate > 0 
                        ? `${formatCurrency(emp.hourlyRate, emp.currency)}/${lang === 'en' ? 'hr' : lang === 'th' ? 'ชม.' : '时'}`
                        : '-'
                  }
                </p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wide">{getTranslation("emp_source_type", lang)}</p>
                <p className={cn(
                  "font-bold text-xs truncate",
                  emp.sourceType === '劳务派遣' ? "text-blue-600 animate-pulse-subtle" : "text-emerald-600"
                )}>
                  {emp.sourceType === '劳务派遣' 
                    ? (lang === 'en' ? `Dispatch (${emp.dispatchCommissionRate ?? 0}%)` : lang === 'th' ? `ส่งตัว (${emp.dispatchCommissionRate ?? 0}%)` : `派遣 (佣${emp.dispatchCommissionRate ?? 0}%)`)
                    : getTranslation("emp_source_direct", lang)
                  }
                </p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wide">{getTranslation("emp_join_date", lang)}</p>
                <p className="font-medium text-slate-700 text-xs">{emp.joinDate}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wide">{getTranslation("emp_attendance_bonus", lang)}</p>
                <p className="font-semibold text-emerald-600 font-mono text-xs">
                  {emp.attendanceBonus !== undefined && emp.attendanceBonus > 0 
                    ? formatCurrency(emp.attendanceBonus, emp.currency) 
                    : <span className="text-xs text-slate-400 font-normal">-</span>}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wide">{getTranslation("emp_social_security", lang)}</p>
                <p className="font-semibold text-rose-600 font-mono text-xs">
                  {emp.socialSecurity !== undefined && emp.socialSecurity > 0 
                    ? formatCurrency(emp.socialSecurity, emp.currency) 
                    : <span className="text-xs text-slate-400 font-normal">-</span>}
                </p>
              </div>
            </div>
          </Card>
        )))}
      </div>
      {loadEmployees && (
        <div className="mt-6">
          <Pagination
            page={page}
            pageSize={pageSize}
            total={remoteTotal != null && remoteTotal > 0 ? remoteTotal : filteredEmployees.length}
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

      {/* Credentials Modal Overlay */}
      <Dialog open={!!currentModalEmp} onOpenChange={(open) => {
        if (!open && !isResettingPassword) {
          setActiveCredsEmployee(null);
          setRecentlyResetInfo(null);
          setCopiedPass(false);
        }
      }}>
        {currentModalEmp && (
          <DialogContent className="max-w-lg p-6 sm:rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-slate-800 tracking-tight">
                {lang === 'en' ? "App Access Credentials" : lang === 'th' ? "จัดการบัญชีเข้าสู่ระบบแอป" : lang === 'zh-TW' ? "APP 帳號管理" : "APP 账号管理"}
              </DialogTitle>
              <DialogDescription className="text-sm text-slate-500 font-bold">
                {lang === 'en' ? "Employee: " : lang === 'th' ? "พนักงาน: " : "员工："}{currentModalEmp.name}
              </DialogDescription>
            </DialogHeader>

            {/* Account credentials */}
            <div className="space-y-4">
              {/* Username field */}
              <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-100 space-y-2">
                <div className="flex justify-between items-center text-xs font-bold text-slate-400 uppercase tracking-wide">
                  <span>{lang === 'en' ? "App Login Username" : lang === 'th' ? "ชื่อบัญชีเข้าสู่ระบบแอป" : lang === 'zh-TW' ? "APP 登錄帳號" : "APP 登录账号"}</span>
                  {copiedField === 'username' && (
                    <span className="text-emerald-600 font-bold flex items-center gap-1.5 text-xs">
                      <Check className="w-3.5 h-3.5" /> {lang === 'en' ? "Copied" : lang === 'th' ? "คัดลอกแล้ว" : "已复制"}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between gap-3 mt-1.5">
                  <span className="font-mono text-base md:text-lg font-black text-brand-700 select-all tracking-wide bg-brand-50/70 px-4 py-1.5 rounded-xl border border-brand-100">
                    {currentModalEmp.username || `emp${currentModalEmp.id}`}
                  </span>
                  <button
                    onClick={() => copyToClipboard(currentModalEmp.username || `emp${currentModalEmp.id}`, 'username')}
                    className="p-2 hover:bg-slate-200/60 text-slate-500 hover:text-slate-700 rounded-xl transition cursor-pointer bg-white border border-slate-200 shadow-xs"
                    title={lang === 'en' ? "Copy Username" : lang === 'th' ? "คัดลอกชื่อผู้ใช้" : "复制账号"}
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Newly generated password box */}
              {recentlyResetInfo && recentlyResetInfo.empId === currentModalEmp.id ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 space-y-3 animate-in fade-in zoom-in-95">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-800 uppercase tracking-wide flex items-center gap-1.5">
                      <Check className="w-4 h-4 text-emerald-600" />
                      {lang === 'en' ? "New Password Generated" : lang === 'th' ? "สร้างรหัสผ่านใหม่เรียบร้อยแล้ว" : lang === 'zh-TW' ? "新密碼已成功生成" : "新密码已成功生成"}
                    </span>
                    <span className="text-[10px] font-bold bg-emerald-200/70 text-emerald-900 px-2 py-0.5 rounded-full">
                      {lang === 'en' ? "One-time view" : lang === 'th' ? "แสดงครั้งเดียว" : "仅此一次显示"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3 bg-white p-3 rounded-xl border border-emerald-200">
                    <span className="font-mono text-lg font-black text-emerald-800 select-all tracking-wider">
                      {recentlyResetInfo.newPass}
                    </span>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(recentlyResetInfo.newPass);
                          setCopiedPass(true);
                          setTimeout(() => setCopiedPass(false), 2000);
                        } catch {}
                      }}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                    >
                      {copiedPass ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          {lang === 'en' ? "Copied" : lang === 'th' ? "คัดลอกแล้ว" : "已复制"}
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          {lang === 'en' ? "Copy Password" : lang === 'th' ? "คัดลอกรหัส" : "复制密码"}
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-[11px] text-emerald-700 font-medium leading-relaxed">
                    {lang === 'en' 
                      ? "Please copy and securely deliver this password to the employee now. It is encrypted in the database and will not be displayed again after closing." 
                      : lang === 'th' 
                        ? "กรุณาคัดลอกและส่งมอบรหัสผ่านให้พนักงานทันที ระบบจะไม่แสดงรหัสนี้อีกหลังปิดหน้าต่าง" 
                        : "请立即复制并将新密码安全交付给员工。密码已哈希加密存储，关闭弹窗后无法再次查阅。"}
                  </p>
                </div>
              ) : (
                <p className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 text-xs font-medium text-slate-500">
                  {lang === 'en' 
                    ? "Existing passwords are not stored in plain text and cannot be viewed. Click below to generate a one-time secure password when needed."
                    : lang === 'th'
                      ? "ระบบไม่จัดเก็บรหัสผ่านเดิมเป็นข้อความธรรมดา กดปุ่มด้านล่างเพื่อสร้างรหัสผ่านใหม่แบบครั้งเดียวเมื่อต้องการ"
                      : "系统不保存或展示现有密码。需要时请生成一次性安全新密码。"}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="space-y-2.5 pt-1">
              <Button
                type="button"
                disabled={isResettingPassword}
                onClick={async () => {
                  if (isResettingPassword || !currentModalEmp) return;
                  const bytes = crypto.getRandomValues(new Uint8Array(8));
                  const newPass = `Aa1${Array.from(bytes, byte => (byte % 36).toString(36)).join("")}`;
                  try {
                    setIsResettingPassword(true);
                    if (onUpdateEmployeePassword) {
                      await onUpdateEmployeePassword(currentModalEmp.id, newPass);
                    }
                    setRecentlyResetInfo({ empId: currentModalEmp.id, newPass });
                    setCopiedPass(false);
                  } catch (err) {
                    console.error("Failed to reset password:", err);
                  } finally {
                    setIsResettingPassword(false);
                  }
                }}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 shadow-md"
              >
                {isResettingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                {isResettingPassword 
                  ? (lang === 'en' ? "Resetting..." : lang === 'th' ? "กำลังรีเซ็ต..." : lang === 'zh-TW' ? "重置中..." : "重置中...")
                  : (lang === 'en' ? "Generate New Secure Password" : lang === 'th' ? "สร้างรหัสผ่านใหม่ที่ปลอดภัย" : lang === 'zh-TW' ? "重置並生成安全新密碼" : "重置并生成安全新密码")}
              </Button>
              <p className="text-xs text-slate-400 font-medium text-center leading-relaxed">
                {lang === 'en' 
                  ? "Resetting will immediately invalidate the old password." 
                  : lang === 'th' 
                    ? "การรีเซ็ตจะทำให้รหัสผ่านเดิมใช้การไม่ได้ทันที" 
                    : "重置后旧密码将立即失效，现有密码无法直接查看。"}
              </p>
            </div>

            <DialogFooter className="border-t border-slate-100 pt-3">
              <Button
                variant="outline"
                disabled={isResettingPassword}
                onClick={() => {
                  setActiveCredsEmployee(null);
                  setRecentlyResetInfo(null);
                  setCopiedPass(false);
                }}
                className="px-6 rounded-xl text-xs font-bold text-slate-600"
              >
                {lang === 'en' ? "Close" : lang === 'th' ? "ปิด" : "关闭"}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      {/* 假期设置弹窗 */}
      <Dialog open={isHolidayModalOpen} onOpenChange={(open) => { if (!open) setIsHolidayModalOpen(false); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] p-0 flex flex-col sm:rounded-2xl overflow-hidden">
          <DialogHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4.5 flex flex-row justify-between items-center space-y-0">
            <DialogTitle className="font-bold text-base text-white flex items-center gap-2 tracking-tight">
              <Calendar className="w-5 h-5 text-blue-100" />
              假期设置
            </DialogTitle>
          </DialogHeader>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1 scrollbar-thin">
              <div className="bg-brand-50/40 rounded-xl p-4 border border-brand-100/60 text-xs text-brand-900 leading-relaxed space-y-1">
                <p className="font-bold">⚠️ 加班费计算规则说明：</p>
                <p>1. 在此列表中保存的日期，将被系统判定为<b>「法定节假日」</b>，加班费用按基准时薪的 <b>3.0 倍</b> 计算。</p>
                <p>2. 周六、周日（非节假日）将被自动识别为<b>「周末加班」</b>，加班费用按 <b>2.0 倍</b> 计算。</p>
                <p>3. 普通工作日的加班费用按 <b>1.5 倍</b> 计算。</p>
              </div>

              {/* 快速导入功能 */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wide block">💡 快速导入 2026 预设法定节假日：</span>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      const toImport = INITIAL_HOLIDAYS.filter(h => h.country === 'CN');
                      const merged = [...holidays];
                      toImport.forEach(item => { if (!merged.some(m => m.date === item.date)) merged.push(item); });
                      onUpdateHolidays(merged.sort((a, b) => a.date.localeCompare(b.date)));
                    }}
                    className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-semibold rounded-lg text-slate-700 transition cursor-pointer"
                  >
                    🇨🇳 中国 (CN)
                  </button>
                  <button
                    onClick={() => {
                      const toImport = INITIAL_HOLIDAYS.filter(h => h.country === 'TH');
                      const merged = [...holidays];
                      toImport.forEach(item => { if (!merged.some(m => m.date === item.date)) merged.push(item); });
                      onUpdateHolidays(merged.sort((a, b) => a.date.localeCompare(b.date)));
                    }}
                    className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-semibold rounded-lg text-slate-700 transition cursor-pointer"
                  >
                    🇹🇭 泰国 (TH)
                  </button>
                  <button
                    onClick={() => {
                      const toImport = INITIAL_HOLIDAYS.filter(h => h.country === 'MY');
                      const merged = [...holidays];
                      toImport.forEach(item => { if (!merged.some(m => m.date === item.date)) merged.push(item); });
                      onUpdateHolidays(merged.sort((a, b) => a.date.localeCompare(b.date)));
                    }}
                    className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-semibold rounded-lg text-slate-700 transition cursor-pointer"
                  >
                    🇲🇾 马来西亚 (MY)
                  </button>
                  <button
                    onClick={() => {
                      const toImport = INITIAL_HOLIDAYS.filter(h => h.country === 'ID');
                      const merged = [...holidays];
                      toImport.forEach(item => { if (!merged.some(m => m.date === item.date)) merged.push(item); });
                      onUpdateHolidays(merged.sort((a, b) => a.date.localeCompare(b.date)));
                    }}
                    className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-semibold rounded-lg text-slate-700 transition cursor-pointer"
                  >
                    🇮🇩 印尼 (ID)
                  </button>
                  <button
                    onClick={() => {
                      const toImport = INITIAL_HOLIDAYS.filter(h => h.country === 'SG');
                      const merged = [...holidays];
                      toImport.forEach(item => { if (!merged.some(m => m.date === item.date)) merged.push(item); });
                      onUpdateHolidays(merged.sort((a, b) => a.date.localeCompare(b.date)));
                    }}
                    className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-semibold rounded-lg text-slate-700 transition cursor-pointer"
                  >
                    🇸🇬 新加坡 (SG)
                  </button>
                  <button
                    onClick={() => {
                      const toImport = INITIAL_HOLIDAYS.filter(h => h.country === 'PH');
                      const merged = [...holidays];
                      toImport.forEach(item => { if (!merged.some(m => m.date === item.date)) merged.push(item); });
                      onUpdateHolidays(merged.sort((a, b) => a.date.localeCompare(b.date)));
                    }}
                    className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-semibold rounded-lg text-slate-700 transition cursor-pointer"
                  >
                    🇵🇭 菲律宾 (PH)
                  </button>
                  <button
                    onClick={() => {
                      const toImport = INITIAL_HOLIDAYS.filter(h => h.country === 'KR');
                      const merged = [...holidays];
                      toImport.forEach(item => { if (!merged.some(m => m.date === item.date)) merged.push(item); });
                      onUpdateHolidays(merged.sort((a, b) => a.date.localeCompare(b.date)));
                    }}
                    className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-semibold rounded-lg text-slate-700 transition cursor-pointer"
                  >
                    🇰🇷 韩国 (KR)
                  </button>
                  <button
                    onClick={() => {
                      const toImport = INITIAL_HOLIDAYS.filter(h => h.country === 'JP');
                      const merged = [...holidays];
                      toImport.forEach(item => { if (!merged.some(m => m.date === item.date)) merged.push(item); });
                      onUpdateHolidays(merged.sort((a, b) => a.date.localeCompare(b.date)));
                    }}
                    className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-semibold rounded-lg text-slate-700 transition cursor-pointer"
                  >
                    🇯🇵 日本 (JP)
                  </button>
                  <button
                    onClick={() => {
                      const toImport = INITIAL_HOLIDAYS.filter(h => h.country === 'BN');
                      const merged = [...holidays];
                      toImport.forEach(item => { if (!merged.some(m => m.date === item.date)) merged.push(item); });
                      onUpdateHolidays(merged.sort((a, b) => a.date.localeCompare(b.date)));
                    }}
                    className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-semibold rounded-lg text-slate-700 transition cursor-pointer"
                  >
                    🇧🇳 文莱 (BN)
                  </button>
                  <button
                    onClick={() => {
                      const toImport = INITIAL_HOLIDAYS.filter(h => h.country === 'MM');
                      const merged = [...holidays];
                      toImport.forEach(item => { if (!merged.some(m => m.date === item.date)) merged.push(item); });
                      onUpdateHolidays(merged.sort((a, b) => a.date.localeCompare(b.date)));
                    }}
                    className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-semibold rounded-lg text-slate-700 transition cursor-pointer"
                  >
                    🇲🇲 缅甸 (MM)
                  </button>
                  <button
                    onClick={() => {
                      const toImport = INITIAL_HOLIDAYS.filter(h => h.country === 'VN');
                      const merged = [...holidays];
                      toImport.forEach(item => { if (!merged.some(m => m.date === item.date)) merged.push(item); });
                      onUpdateHolidays(merged.sort((a, b) => a.date.localeCompare(b.date)));
                    }}
                    className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-semibold rounded-lg text-slate-700 transition cursor-pointer"
                  >
                    🇻🇳 越南 (VN)
                  </button>
                  <button
                    onClick={() => {
                      const toImport = INITIAL_HOLIDAYS.filter(h => h.country === 'KH');
                      const merged = [...holidays];
                      toImport.forEach(item => { if (!merged.some(m => m.date === item.date)) merged.push(item); });
                      onUpdateHolidays(merged.sort((a, b) => a.date.localeCompare(b.date)));
                    }}
                    className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-semibold rounded-lg text-slate-700 transition cursor-pointer"
                  >
                    🇰🇭 柬埔寨 (KH)
                  </button>
                </div>
              </div>

              {/* 手动添加假期 */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wide block">➕ 手动新增自定义假期：</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <Label className="block text-[11px] font-bold text-slate-500 mb-1">日期</Label>
                    <DatePicker
                      value={newHolidayDate}
                      onChange={(e) => setNewHolidayDate(e.target.value)}
                      className="w-full text-xs bg-white h-9"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">节日名称</label>
                    <input
                      type="text"
                      placeholder="例如: 春节、国庆节"
                      value={newHolidayName}
                      onChange={(e) => setNewHolidayName(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-brand-500 outline-none bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">所属国家</label>
                    <div className="flex gap-2">
                      <select
                        value={newHolidayCountry}
                        onChange={(e) => setNewHolidayCountry(e.target.value)}
                        className="flex-1 px-2.5 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-brand-500 outline-none bg-white"
                      >
                        <option value="CN">🇨🇳 中国 (CN)</option>
                        <option value="TH">🇹🇭 泰国 (TH)</option>
                        <option value="MY">🇲🇾 马来西亚 (MY)</option>
                        <option value="ID">🇮🇩 印度尼西亚 (ID)</option>
                        <option value="SG">🇸🇬 新加坡 (SG)</option>
                        <option value="PH">🇵🇭 菲律宾 (PH)</option>
                        <option value="KR">🇰🇷 韩国 (KR)</option>
                        <option value="JP">🇯🇵 日本 (JP)</option>
                        <option value="BN">🇧🇳 文莱 (BN)</option>
                        <option value="MM">🇲🇲 缅甸 (MM)</option>
                        <option value="VN">🇻🇳 越南 (VN)</option>
                        <option value="KH">🇰🇭 柬埔寨 (KH)</option>
                        <option value="custom">⚙️ 自定义 (Other)</option>
                      </select>
                      <button
                        onClick={() => {
                          if (!newHolidayDate || !newHolidayName) return;
                          const newRecord: HolidayRecord = {
                            id: `custom-${Date.now()}`,
                            date: newHolidayDate,
                            name: newHolidayName,
                            country: newHolidayCountry
                          };
                          onUpdateHolidays([...holidays, newRecord].sort((a, b) => a.date.localeCompare(b.date)));
                          setNewHolidayDate("");
                          setNewHolidayName("");
                        }}
                        disabled={!newHolidayDate || !newHolidayName}
                        className="px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 text-white font-bold text-xs rounded-lg transition cursor-pointer disabled:cursor-not-allowed"
                      >
                        添加
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* 现有假期列表 */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wide block">📅 已设置假期 ({holidays.length} 天)：</span>
                  {holidays.length > 0 && (
                    <div className="flex items-center gap-2">
                      {showClearConfirm ? (
                        <>
                          <span className="text-[11px] font-bold text-red-600 animate-pulse">您确定要全部清空吗？</span>
                          <button
                            onClick={() => {
                              onUpdateHolidays([]);
                              setShowClearConfirm(false);
                            }}
                            className="text-[11px] font-extrabold text-white bg-red-600 hover:bg-red-700 px-2 py-1 rounded-md transition shadow-xs cursor-pointer"
                          >
                            确定清空
                          </button>
                          <button
                            onClick={() => setShowClearConfirm(false)}
                            className="text-[11px] font-medium text-slate-500 hover:text-slate-700 px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded-md transition cursor-pointer"
                          >
                            取消
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => setShowClearConfirm(true)}
                          className="text-[11px] font-bold text-red-600 hover:text-red-700 transition flex items-center gap-1 cursor-pointer"
                        >
                          <Trash className="w-3.5 h-3.5" /> 清空全部
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {holidays.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                    目前尚未添加任何假期。点击上方按钮可快速一键导入常用假期，或手动添加。
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto divide-y divide-slate-100 bg-white">
                    {holidays.map(h => (
                      <div key={h.date + '-' + h.name} className="px-4 py-2.5 flex items-center justify-between text-xs hover:bg-slate-50/40 transition">
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded border border-brand-100/50">
                            {h.date}
                          </span>
                          <span className="font-medium text-slate-800">{h.name}</span>
                        </div>
                        <div className="flex items-center gap-3.5">
                          <span className="text-slate-500 font-semibold bg-slate-100 px-2 py-0.5 rounded-full text-[10px]">
                            {(() => {
                              switch (h.country) {
                                case 'CN': return '🇨🇳 中国';
                                case 'TH': return '🇹🇭 泰国';
                                case 'MY': return '🇲🇾 马来西亚';
                                case 'ID': return '🇮🇩 印尼';
                                case 'SG': return '🇸🇬 新加坡';
                                case 'PH': return '🇵🇭 菲律宾';
                                case 'KR': return '🇰🇷 韩国';
                                case 'JP': return '🇯🇵 日本';
                                case 'BN': return '🇧🇳 文莱';
                                case 'MM': return '🇲🇲 缅甸';
                                case 'VN': return '🇻🇳 越南';
                                case 'KH': return '🇰🇭 柬埔寨';
                                default: return '⚙️ 自定义';
                              }
                            })()}
                          </span>
                          <button
                            onClick={() => {
                              onUpdateHolidays(holidays.filter(item => item.date !== h.date || item.name !== h.name));
                            }}
                            className="text-slate-400 hover:text-red-500 p-1 rounded-md transition cursor-pointer"
                            title="删除此假期"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <DialogFooter className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
              <span className="text-xs text-slate-500 font-medium">
                如需更多国家，请联系：<span className="text-blue-600 font-semibold">smartbillpro@gamil.com</span>
              </span>
              <Button
                onClick={() => setIsHolidayModalOpen(false)}
                className="px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs self-end sm:self-auto"
              >
                保存并完成
              </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 员工详情弹窗 */}
      <Dialog open={!!selectedDetailEmployee} onOpenChange={(open) => { if (!open) setSelectedDetailEmployee(null); }}>
        {selectedDetailEmployee && (
          <DialogContent className="max-w-2xl max-h-[90vh] p-0 flex flex-col sm:rounded-2xl overflow-hidden">
            <DialogHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-5 flex flex-row justify-between items-center space-y-0">
              <DialogTitle className="font-bold text-base text-white flex items-center gap-3 tracking-tight">
                <Eye className="w-5 h-5 text-blue-100" />
                {lang === 'en' ? "Employee Profile Details" : lang === 'th' ? "รายละเอียดโปรไฟล์พนักงาน" : lang === 'zh-TW' ? "員工檔案詳情" : "员工档案详情"}
              </DialogTitle>
            </DialogHeader>

            {/* Profile Brief Area */}
            <div className="p-6 bg-slate-50/50 border-b border-slate-100 flex flex-col sm:flex-row items-center gap-5">
              <div className="w-20 h-20 rounded-full bg-slate-200 border-4 border-white overflow-hidden shadow-sm flex-shrink-0 flex items-center justify-center">
                {selectedDetailEmployee.photo ? (
                  <img src={selectedDetailEmployee.photo} className="w-full h-full object-cover" alt="" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400 bg-slate-100 text-2xl font-black">
                    {selectedDetailEmployee.name.charAt(0)}
                  </div>
                )}
              </div>
              <div className="text-center sm:text-left space-y-1.5">
                <div className="flex items-center justify-center sm:justify-start gap-2.5 flex-wrap">
                  <h4 className="text-xl font-black text-slate-800 tracking-tight">{selectedDetailEmployee.name}</h4>
                  <span className="text-lg" title={COUNTRY_NAMES[selectedDetailEmployee.country]}>
                    {COUNTRY_FLAGS[selectedDetailEmployee.country]}
                  </span>
                  <span className="text-xs text-slate-500 bg-slate-200/60 px-2 py-0.5 rounded-full font-semibold">
                    {COUNTRY_NAMES[selectedDetailEmployee.country] || selectedDetailEmployee.country}
                  </span>
                  {selectedDetailEmployee.warehouseCode && (
                    <span className="text-xs font-bold text-brand-700 bg-brand-50 border border-brand-200 px-2.5 py-0.5 rounded-full">
                      {WAREHOUSE_FLAGS[selectedDetailEmployee.warehouseCode] || "🏢"} {WAREHOUSE_NAMES[selectedDetailEmployee.warehouseCode] || `${selectedDetailEmployee.warehouseCode} 仓`}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                  <span className={cn(
                    "text-xs px-2.5 py-0.5 rounded-full font-semibold",
                    selectedDetailEmployee.gender === 'female' ? 'text-pink-600 bg-pink-50' : 'text-blue-600 bg-blue-50'
                  )}>
                    {selectedDetailEmployee.gender === 'female' 
                      ? (lang === 'en' ? 'Female' : lang === 'th' ? 'หญิง' : '女') 
                      : (lang === 'en' ? 'Male' : lang === 'th' ? 'ชาย' : '男')}
                  </span>
                  <span className={cn(
                    "text-xs px-2.5 py-0.5 rounded-full font-bold",
                    selectedDetailEmployee.status === '在职' ? 'bg-green-100 text-green-700' : (selectedDetailEmployee.status === '离职' ? 'bg-rose-100 text-rose-700 border border-rose-200' : 'bg-blue-100 text-blue-700')
                  )}>
                    {selectedDetailEmployee.status === '在职' 
                      ? (lang === 'en' ? 'Active' : lang === 'th' ? 'ทำงานอยู่' : '在职')
                      : selectedDetailEmployee.status === '离职'
                        ? (lang === 'en' ? 'Resigned' : lang === 'th' ? 'ลาออก' : '离职')
                        : (lang === 'en' ? 'On Leave' : lang === 'th' ? 'ลาหยุด' : '休假')
                    }
                  </span>
                </div>
              </div>
            </div>

            {/* Main Fields Grid */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 scrollbar-thin">
              {/* 1. Base Information */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-500"></span>
                  {lang === 'en' ? "Basic Information" : lang === 'th' ? "ข้อมูลพื้นฐาน" : "基本信息"}
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 bg-slate-50/30 p-4 rounded-xl border border-slate-100 text-xs">
                  <div>
                    <span className="text-slate-400 font-medium block">{getTranslation("emp_role", lang)}</span>
                    <span className="font-bold text-slate-800 text-sm block mt-1">{selectedDetailEmployee.role}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block">{getTranslation("emp_dept", lang)}</span>
                    <span className="font-bold text-slate-800 text-sm block mt-1">{selectedDetailEmployee.dept || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block">{getTranslation("emp_join_date", lang)}</span>
                    <span className="font-bold text-slate-800 text-sm block mt-1">{selectedDetailEmployee.joinDate}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block">{getTranslation("emp_source_type", lang)}</span>
                    <span className="font-bold text-slate-800 text-sm block mt-1">
                      {selectedDetailEmployee.sourceType === '劳务派遣' 
                        ? (lang === 'en' ? `Dispatch (${selectedDetailEmployee.dispatchCommissionRate ?? 0}%)` : `派遣 (佣${selectedDetailEmployee.dispatchCommissionRate ?? 0}%)`)
                        : getTranslation("emp_source_direct", lang)
                      }
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. Salary & Allowances */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  {lang === 'en' ? "Compensation & Benefits" : lang === 'th' ? "ค่าตอบแทนและสวัสดิการ" : "薪资与福利"}
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 bg-slate-50/30 p-4 rounded-xl border border-slate-100 text-xs">
                  <div>
                    <span className="text-slate-400 font-medium block">{getTranslation("emp_wage_type", lang)}</span>
                    <span className="font-bold text-brand-600 text-sm block mt-1">
                      {selectedDetailEmployee.baseMonthlyWage !== undefined && selectedDetailEmployee.baseMonthlyWage > 0 
                        ? `${formatCurrency(selectedDetailEmployee.baseMonthlyWage, selectedDetailEmployee.currency)}/月` 
                        : selectedDetailEmployee.dailyWage !== undefined && selectedDetailEmployee.dailyWage > 0 
                          ? `${formatCurrency(selectedDetailEmployee.dailyWage, selectedDetailEmployee.currency)}/天`
                          : selectedDetailEmployee.hourlyRate !== undefined && selectedDetailEmployee.hourlyRate > 0 
                            ? `${formatCurrency(selectedDetailEmployee.hourlyRate, selectedDetailEmployee.currency)}/时`
                            : '-'
                      }
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block">{getTranslation("emp_hourly_rate", lang)}</span>
                    <span className="font-bold text-slate-800 text-sm block mt-1 font-mono">
                      {selectedDetailEmployee.baseMonthlyWage !== undefined && selectedDetailEmployee.baseMonthlyWage > 0 ? (
                        <span>{formatCurrency((selectedDetailEmployee.baseMonthlyWage / 30) / 8, selectedDetailEmployee.currency)}</span>
                      ) : selectedDetailEmployee.dailyWage !== undefined && selectedDetailEmployee.dailyWage > 0 ? (
                        <span>{formatCurrency(selectedDetailEmployee.dailyWage / 8, selectedDetailEmployee.currency)}</span>
                      ) : (
                        selectedDetailEmployee.hourlyRate !== undefined && selectedDetailEmployee.hourlyRate > 0 ? formatCurrency(selectedDetailEmployee.hourlyRate, selectedDetailEmployee.currency) : '-'
                      )}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block">{getTranslation("emp_attendance_bonus", lang)}</span>
                    <span className="font-bold text-emerald-600 text-sm block mt-1 font-mono">
                      {selectedDetailEmployee.attendanceBonus !== undefined && selectedDetailEmployee.attendanceBonus > 0 
                        ? formatCurrency(selectedDetailEmployee.attendanceBonus, selectedDetailEmployee.currency) 
                        : '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block">{getTranslation("emp_social_security", lang)}</span>
                    <span className="font-bold text-rose-600 text-sm block mt-1 font-mono">
                      {selectedDetailEmployee.socialSecurity !== undefined && selectedDetailEmployee.socialSecurity > 0 
                        ? formatCurrency(selectedDetailEmployee.socialSecurity, selectedDetailEmployee.currency) 
                        : '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block">
                      {lang === 'en' ? "Meal Allowance (Daily)" : lang === 'th' ? "ค่าอาหารรายวัน" : "每日餐费补贴"}
                    </span>
                    <span className="font-bold text-amber-600 text-sm block mt-1 font-mono">
                      {selectedDetailEmployee.mealAllowanceDaily !== undefined && selectedDetailEmployee.mealAllowanceDaily > 0 
                        ? formatCurrency(selectedDetailEmployee.mealAllowanceDaily, selectedDetailEmployee.currency) 
                        : '-'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 3. Bank & Document Details (The fields hidden from the cards) */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-500"></span>
                  {lang === 'en' ? "Bank & Identification" : lang === 'th' ? "ธนาคารและเอกสารประจำตัว" : "银行与证件信息"}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50/30 p-4 rounded-xl border border-slate-100 text-xs">
                  <div>
                    <span className="text-slate-400 font-medium block">{getTranslation("emp_bank_name", lang)}</span>
                    <span className="font-bold text-slate-800 text-sm block mt-1">
                      {selectedDetailEmployee.bankName || <span className="text-slate-400 font-normal">{getTranslation("emp_unbound", lang)}</span>}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block">{getTranslation("emp_bank_card", lang)}</span>
                    <span className="font-bold text-slate-800 text-sm block mt-1 font-mono">
                      {selectedDetailEmployee.bankCardNumber ? (
                        selectedDetailEmployee.bankCardNumber.replace(/(\d{4})(?=\d)/g, "$1 ")
                      ) : (
                        <span className="text-slate-400 font-normal">{getTranslation("emp_unbound_card", lang)}</span>
                      )}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block">
                      {lang === 'en' ? "IC Card / ID Card" : lang === 'th' ? "หมายเลขบัตรประชาชน / IC Card" : "身份证号 / IC Card"}
                    </span>
                    <span className="font-bold text-slate-800 text-sm block mt-1 font-mono">
                      {selectedDetailEmployee.idCard || <span className="text-slate-400 font-normal">-</span>}
                    </span>
                  </div>
                </div>
              </div>

              {/* 4. Account Detail */}
              {hasPermission("employees_reset_pwd") && <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                  {lang === 'en' ? "App Access Account" : lang === 'th' ? "บัญชีเข้าใช้งานแอป" : "APP 登录账号"}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50/30 p-4 rounded-xl border border-slate-100 text-xs">
                  <div className="flex items-center justify-between gap-3 bg-white p-3 rounded-lg border border-slate-100">
                    <div>
                      <span className="text-slate-400 font-medium block">APP 登录账号</span>
                      <span className="font-mono text-sm font-black text-brand-700 block mt-0.5">
                        {selectedDetailEmployee.username || `emp${selectedDetailEmployee.id}`}
                      </span>
                    </div>
                    <button
                      onClick={() => copyToClipboard(selectedDetailEmployee.username || `emp${selectedDetailEmployee.id}`, 'username')}
                      className="p-1.5 hover:bg-slate-100 text-slate-500 rounded-lg transition cursor-pointer border border-slate-200"
                      title="复制账号"
                    >
                      {copiedField === 'username' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <div className="flex items-center rounded-lg border border-slate-100 bg-white p-3 text-xs font-medium text-slate-500">密码不可查看；请从账号管理入口执行安全重置。</div>
                </div>
              </div>}
            </div>

            {/* Modal Footer */}
            <DialogFooter className="bg-slate-50 px-6 py-4.5 border-t border-slate-100 flex flex-row justify-between items-center sm:justify-between">
              {hasPermission("employees_edit") ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    const emp = selectedDetailEmployee;
                    setSelectedDetailEmployee(null);
                    onEditEmployee(emp);
                  }}
                  className="bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold border-blue-200 flex items-center gap-1.5"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>编辑此员工</span>
                </Button>
              ) : (
                <div />
              )}
              <Button
                variant="outline"
                onClick={() => setSelectedDetailEmployee(null)}
                className="rounded-xl px-6 text-xs font-bold text-slate-700"
              >
                {lang === 'en' ? "Close" : lang === 'th' ? "ปิด" : "关闭"}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
