/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BadgeDollarSign, Building2, Edit, Phone, Plus, Search, UserRoundMinus, UserX } from "lucide-react";
import { AttendanceRuleOption, Employee, EmployeeListFilters } from "../types";
import { fetchEmployeesPage } from "../lib/api";
import { cn, COUNTRY_FLAGS, COUNTRY_NAMES, EMPLOYEE_STATUS_META, SALARY_TYPE_LABELS, formatCompensation } from "../lib/utils";
import { Pagination } from "./Pagination";

interface EmployeeListProps {
  attendanceRules: AttendanceRuleOption[];
  loading?: boolean;
  refreshKey?: number;
  onAddEmployee: () => void;
  onEditEmployee: (emp: Employee) => void;
  onDisableEmployee: (emp: Employee) => void;
  onResignEmployee: (emp: Employee) => void;
}

const PAGE_SIZE = 24;
const DEFAULT_FILTERS: Required<EmployeeListFilters> = {
  keyword: "",
  status: "all",
  country: "all",
  salaryType: "all",
  attendanceRuleId: "all",
  role: "all",
  includeInactive: false
};

export function EmployeeList({
  attendanceRules,
  loading = false,
  refreshKey = 0,
  onAddEmployee,
  onEditEmployee,
  onDisableEmployee,
  onResignEmployee
}: EmployeeListProps) {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [roleOptions, setRoleOptions] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [pageLoading, setPageLoading] = useState(false);
  const [error, setError] = useState("");
  const loadRequestIdRef = useRef(0);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const activeFilterCount = useMemo(() => {
    return [
      filters.keyword.trim() !== "",
      filters.status !== "all",
      filters.country !== "all",
      filters.salaryType !== "all",
      filters.attendanceRuleId !== "all",
      filters.role !== "all",
      filters.includeInactive
    ].filter(Boolean).length;
  }, [filters]);

  const loadPage = useCallback(async (targetPage: number) => {
    const requestId = ++loadRequestIdRef.current;
    const isReplace = targetPage === 1;

    if (isReplace) {
      setInitialLoading(true);
    } else {
      setPageLoading(true);
    }

    setError("");

    try {
      const result = await fetchEmployeesPage({
        ...filters,
        page: targetPage,
        pageSize: PAGE_SIZE
      });

      if (requestId !== loadRequestIdRef.current) {
        return;
      }

      setEmployees(result.items);
      setRoleOptions(result.roleOptions);
      setPage(result.page);
      setTotal(result.total);
      setHasMore(result.hasMore);
    } catch (nextError) {
      if (requestId !== loadRequestIdRef.current) {
        return;
      }
      setError(nextError instanceof Error ? nextError.message : "员工列表加载失败");
      if (isReplace) {
        setEmployees([]);
        setTotal(0);
        setHasMore(false);
      }
    } finally {
      if (requestId !== loadRequestIdRef.current) {
        return;
      }
      setInitialLoading(false);
      setPageLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void loadPage(1);
  }, [filters, refreshKey, loadPage]);

  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS);
  };

  return (
    <div className="space-y-6">
      <div className="glass-panel rounded-xl p-5">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_240px] gap-4">
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                <div className="md:col-span-2 xl:col-span-2">
                  <label className="block text-xs font-medium text-slate-500 mb-1 uppercase">搜索</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={filters.keyword}
                      onChange={(event) => setFilters((prev) => ({ ...prev, keyword: event.target.value }))}
                      placeholder="搜索姓名、员工编号、手机号、岗位、区域..."
                      className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none text-sm bg-white"
                    />
                    <Search className="w-5 h-5 absolute left-3 top-2.5 text-slate-400" />
                  </div>
                </div>
                <FilterSelect
                  label="员工状态"
                  value={filters.status}
                  onChange={(value) => setFilters((prev) => ({ ...prev, status: value }))}
                  options={[
                    { value: "all", label: "全部状态" },
                    { value: "active", label: "在职" },
                    { value: "probation", label: "试用" },
                    { value: "on_leave", label: "休假" },
                    { value: "disabled", label: "停用" },
                    { value: "resigned", label: "离职" }
                  ]}
                />
                <FilterSelect
                  label="国家/地区"
                  value={filters.country}
                  onChange={(value) => setFilters((prev) => ({ ...prev, country: value }))}
                  options={[
                    { value: "all", label: "全部国家" },
                    { value: "MM", label: "缅甸" },
                    { value: "TH", label: "泰国" },
                    { value: "CN", label: "中国" },
                    { value: "VN", label: "越南" },
                    { value: "KH", label: "柬埔寨" }
                  ]}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                <FilterSelect
                  label="计薪方式"
                  value={filters.salaryType}
                  onChange={(value) => setFilters((prev) => ({ ...prev, salaryType: value }))}
                  options={[
                    { value: "all", label: "全部方式" },
                    { value: "hourly", label: "时薪" },
                    { value: "fixed", label: "固定工资" }
                  ]}
                />
                <FilterSelect
                  label="岗位"
                  value={filters.role}
                  onChange={(value) => setFilters((prev) => ({ ...prev, role: value }))}
                  options={[
                    { value: "all", label: "全部岗位" },
                    ...roleOptions.map((role) => ({ value: role, label: role }))
                  ]}
                />
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-slate-500 mb-1 uppercase">当前考勤规则</label>
                  <select
                    value={filters.attendanceRuleId}
                    onChange={(event) => setFilters((prev) => ({ ...prev, attendanceRuleId: event.target.value }))}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg bg-white text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                  >
                    <option value="all">全部规则</option>
                    {attendanceRules.map((rule) => (
                      <option key={rule.id} value={String(rule.id)}>
                        {rule.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 xl:justify-between">
              <div className="pt-1">
                <label className="block text-xs font-medium text-slate-500 mb-1 uppercase">操作</label>
                <label className="inline-flex items-center gap-2 text-sm text-slate-600 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={filters.includeInactive}
                    onChange={(event) => setFilters((prev) => ({ ...prev, includeInactive: event.target.checked }))}
                    className="w-4 h-4 accent-brand-600"
                  />
                  包含停用/离职
                </label>
              </div>
              <div className="flex flex-col gap-3 xl:items-stretch">
                <button
                  onClick={resetFilters}
                  className="px-3 py-2.5 rounded-lg border border-slate-300 bg-white text-sm text-slate-700 hover:bg-slate-50"
                >
                  重置
                </button>
                <button
                  onClick={onAddEmployee}
                  className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium shadow-md transition flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" /> 新增
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {loading || initialLoading ? (
        <div className="glass-panel rounded-xl p-10 text-center text-sm text-slate-500">正在加载员工数据...</div>
      ) : error ? (
        <div className="glass-panel rounded-xl p-10 text-center text-sm text-rose-600">{error}</div>
      ) : employees.length === 0 ? (
        <div className="glass-panel rounded-xl p-10 text-center text-sm text-slate-500">当前筛选条件下没有员工数据</div>
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {employees.map((employee) => {
              const statusMeta = EMPLOYEE_STATUS_META[employee.status];

              return (
                <div key={employee.id} className="glass-panel rounded-xl p-5 hover:shadow-md transition-all duration-300 flex flex-col relative group">
                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2 z-10">
                    <ActionIconButton title="编辑" onClick={() => onEditEmployee(employee)}>
                      <Edit className="w-4 h-4" />
                    </ActionIconButton>
                    {employee.status !== "disabled" ? (
                      <ActionIconButton title="停用" tone="warning" onClick={() => onDisableEmployee(employee)}>
                        <UserX className="w-4 h-4" />
                      </ActionIconButton>
                    ) : null}
                    {employee.status !== "resigned" ? (
                      <ActionIconButton title="标记离职" tone="danger" onClick={() => onResignEmployee(employee)}>
                        <UserRoundMinus className="w-4 h-4" />
                      </ActionIconButton>
                    ) : null}
                  </div>

                  <div className="flex items-start gap-4 mb-5">
                    <div className="w-16 h-16 rounded-full bg-slate-100 border-2 border-slate-200 overflow-hidden flex-shrink-0 flex items-center justify-center">
                      {employee.photo ? (
                        <img src={employee.photo} className="w-full h-full object-cover" alt={employee.name} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400 bg-slate-50 text-lg font-bold">
                          {employee.name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 pr-8">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-bold text-slate-800 truncate">{employee.name}</h3>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{employee.employeeNo}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span className="text-lg" title={COUNTRY_NAMES[employee.country]}>{COUNTRY_FLAGS[employee.country]}</span>
                        <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{COUNTRY_NAMES[employee.country]}</span>
                        <span className={cn(
                          "text-[10px] px-2 py-0.5 rounded-full",
                          employee.gender === "female" ? "text-pink-600 bg-pink-50" : "text-blue-600 bg-blue-50"
                        )}>
                          {employee.gender === "female" ? "女" : "男"}
                        </span>
                        <span className={cn("text-[10px] px-2 py-0.5 rounded-full", statusMeta.className)}>
                          {statusMeta.label}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm border-t border-slate-100 pt-4">
                    <div className="col-span-2 flex items-start gap-2">
                      <Phone className="w-4 h-4 mt-0.5 text-slate-400 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[10px] text-slate-400 uppercase tracking-wide">手机号</p>
                        <p className="font-medium text-slate-700 truncate">{employee.phone}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wide">岗位</p>
                      <p className="font-medium text-slate-700 truncate">{employee.role}</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <Building2 className="w-4 h-4 mt-0.5 text-slate-400 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[10px] text-slate-400 uppercase tracking-wide">部门/区域</p>
                        <p className="font-medium text-slate-700 truncate">{employee.dept}</p>
                      </div>
                    </div>
                    <div className="col-span-2">
                      <p className="text-[10px] text-slate-400 uppercase tracking-wide">当前考勤规则</p>
                      <p className="font-medium text-slate-700 truncate">{employee.attendanceRuleName || "未分配规则"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wide">计薪方式</p>
                      <p className="font-medium text-slate-700">{SALARY_TYPE_LABELS[employee.salaryType]}</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <BadgeDollarSign className="w-4 h-4 mt-0.5 text-slate-400 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[10px] text-slate-400 uppercase tracking-wide">薪资配置</p>
                        <p className="font-medium text-slate-700 truncate">{formatCompensation(employee)}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wide">币种</p>
                      <p className="font-medium text-slate-700">{employee.currency}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wide">入职日期</p>
                      <p className="font-medium text-slate-700">{employee.joinDate}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={total}
            itemName="名员工"
            disabled={pageLoading}
            onPageChange={(nextPage) => void loadPage(nextPage)}
          />
        </div>
      )}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-500 mb-1 uppercase">{label}</label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full px-3 py-2.5 border border-slate-300 rounded-lg bg-white text-sm focus:ring-2 focus:ring-brand-500 outline-none"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function ActionIconButton({
  children,
  onClick,
  title,
  tone = "default"
}: {
  children: ReactNode;
  onClick: () => void;
  title: string;
  tone?: "default" | "warning" | "danger";
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={cn(
        "rounded-xl border bg-white p-2 shadow-sm transition",
        tone === "default" && "border-slate-200 text-slate-600 hover:bg-slate-50",
        tone === "warning" && "border-amber-200 text-amber-600 hover:bg-amber-50",
        tone === "danger" && "border-rose-200 text-rose-600 hover:bg-rose-50"
      )}
    >
      {children}
    </button>
  );
}
