/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { tAdmin } from "../lib/i18nText";
import { Edit, KeyRound, Plus, Search, Trash2, UserRoundMinus } from "lucide-react";
import { Employee } from "../types";
import { fetchEmployeeAvatars, fetchEmployeesCount, fetchEmployeesPage } from "../lib/api";
import { cn, COUNTRY_FLAGS, formatCurrency, getCountryName } from "../lib/utils";
import { Pagination } from "./Pagination";

interface EmployeeListProps {
  loading?: boolean;
  reloadKey?: number;
  onAddEmployee: () => void;
  onEditEmployee: (emp: Employee) => void;
  onManageAppAccount: (emp: Employee) => void;
  onDeleteEmployee: (emp: Employee) => void;
}

function getV2StatusLabel(employee: Employee) {
  if (employee.status === "on_leave") return tAdmin("休假");
  if (employee.status === "probation") return tAdmin("试用");
  if (employee.status === "resigned") return tAdmin("离职");
  return tAdmin("在职");
}

function getV2MonthlyWage(employee: Employee) {
  return employee.salaryType === "fixed" ? employee.fixedSalary : null;
}

function getV2HourlyRate(employee: Employee) {
  if (employee.salaryType === "hourly") {
    return employee.hourlyRate;
  }

  const monthlyWage = getV2MonthlyWage(employee);
  return monthlyWage !== null && monthlyWage > 0 ? (monthlyWage / 30) / 8 : null;
}

export function EmployeeList({ loading = false, reloadKey = 0, onAddEmployee, onEditEmployee, onManageAppAccount, onDeleteEmployee }: EmployeeListProps) {
  const [query, setSearchQuery] = useState("");
  const [resignedOnly, setResignedOnly] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 12;
  const loadRequestIdRef = useRef(0);
  const [rows, setRows] = useState<Employee[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [totalResolved, setTotalResolved] = useState(false);
  const [pageLoading, setPageLoading] = useState(false);
  const [error, setError] = useState("");
  const [avatarMap, setAvatarMap] = useState<Record<number, string | null>>({});

  useEffect(() => {
    // 搜索词或“只看离职”筛选变化后必须回到第一页；真实后端分页下，旧页码继续请求会直接跳到深页，和用户当前筛选意图不一致。
    setPage(1);
  }, [query, resignedOnly]);

  useEffect(() => {
    const requestId = ++loadRequestIdRef.current;
    setPageLoading(true);
    setError("");

    void fetchEmployeesPage({
      keyword: query,
      status: resignedOnly ? "resigned" : "all",
      page,
      pageSize
    }).then((result) => {
      if (requestId !== loadRequestIdRef.current) {
        return;
      }
      setRows(result.items);
      setHasMore(result.hasMore);
      if (typeof result.total === "number") {
        setTotal(result.total);
        setTotalResolved(true);
      }
    }).catch((nextError) => {
      if (requestId !== loadRequestIdRef.current) {
        return;
      }
      setError(nextError instanceof Error ? nextError.message : tAdmin("员工列表加载失败"));
    }).finally(() => {
      if (requestId === loadRequestIdRef.current) {
        setPageLoading(false);
      }
    });
  // 员工页只依赖自己的分页参数与显式刷新信号；避免父层全量 employees 变更把同一分页请求重复打一遍。
  }, [page, pageSize, query, reloadKey, resignedOnly]);

  useEffect(() => {
    let cancelled = false;
    setTotal(0);
    setTotalResolved(false);

    void fetchEmployeesCount({
      keyword: query,
      status: resignedOnly ? "resigned" : "all"
    }).then((nextTotal) => {
      if (cancelled) {
        return;
      }
      setTotal(nextTotal);
      setTotalResolved(true);
    }).catch(() => {
      if (cancelled) {
        return;
      }
      setTotalResolved(false);
    });

    return () => {
      cancelled = true;
    };
  }, [query, reloadKey, resignedOnly]);

  useEffect(() => {
    const visibleIds = rows.map((row) => row.id).filter((id) => !(id in avatarMap));
    if (visibleIds.length === 0) {
      return;
    }

    let cancelled = false;
    void fetchEmployeeAvatars(visibleIds).then((result) => {
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
      // 头像补图失败不影响员工列表主内容；保持首字兜底即可。
    });

    return () => {
      cancelled = true;
    };
  }, [avatarMap, rows]);

  const showRefreshing = (pageLoading || loading) && rows.length > 0;
  const exactTotalFromPage = hasMore ? null : (page - 1) * pageSize + rows.length;
  const displayTotal = exactTotalFromPage ?? (
    totalResolved
      ? total
      : Math.max(total, (page - 1) * pageSize + rows.length + 1)
  );

  return (
    <div className="h-full min-h-0 flex flex-col">
      <div className="shrink-0 pb-4 space-y-3">
        {/* 员工列表顶部工具栏与客户管理统一为同款卡片式布局：左侧收口搜索/筛选，右侧保留新增入口，避免不同列表页在响应式断点和控件密度上继续分叉。 */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200/80 p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={tAdmin("搜索姓名、昵称、职位或区域...")}
                className="w-full pl-9 pr-4 py-1.5 border border-slate-200 rounded-lg outline-none text-xs focus:ring-1 focus:ring-brand-500 text-slate-700 bg-slate-50 transition placeholder:text-slate-400 font-medium"
              />
            </div>
            <label className="inline-flex min-h-[30px] items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 select-none leading-tight hover:bg-slate-50 transition">
              <input
                type="checkbox"
                checked={resignedOnly}
                onChange={(event) => setResignedOnly(event.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
              <span className="whitespace-nowrap">{tAdmin("只看离职人员")}</span>
            </label>
          </div>
          <button
            onClick={onAddEmployee}
            className="w-full sm:w-auto bg-brand-600 hover:bg-brand-700 text-white px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{tAdmin("新增员工")}</span>
          </button>
        </div>
        {showRefreshing ? (
          <div className="rounded-xl border border-brand-100 bg-brand-50/80 px-4 py-2 text-xs text-brand-700">
            {tAdmin("正在后台刷新员工数据，当前先保留上一次成功加载的列表内容")}
          </div>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        {error ? (
          <div className="glass-panel rounded-xl p-10 text-center text-sm text-red-500">{error}</div>
        ) : displayTotal === 0 ? (
          <div className="glass-panel rounded-xl p-10 text-center text-sm text-slate-500">{tAdmin("当前筛选条件下没有员工数据")}</div>
        ) : (
          // v2 员工卡片包含头像、标签和薪资字段；常规大屏保持三列，避免一行四列时字段被挤压换行。
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5">
            {rows.map((emp) => {
            const monthlyWage = getV2MonthlyWage(emp);
            const hourlyRate = getV2HourlyRate(emp);
            const statusLabel = getV2StatusLabel(emp);
            const employeePhoto = avatarMap[emp.id] ?? null;
            const isResignedEmployee = emp.status === "resigned";
            const statusActionLabel = isResignedEmployee ? tAdmin("删除") : tAdmin("离职");

            return (
              <div key={emp.id} className="glass-panel rounded-xl p-5 hover:shadow-md transition-all duration-300 flex flex-col relative group">
                <div className="absolute top-4 right-4 flex gap-2 z-10 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => onManageAppAccount(emp)}
                    className="p-1.5 bg-white rounded-lg shadow-sm border border-brand-200 hover:bg-brand-50 text-brand-600"
                    title={tAdmin("账号管理")}
                  >
                    <KeyRound className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onEditEmployee(emp)}
                    className="p-1.5 bg-white rounded-lg shadow-sm border border-slate-200 hover:bg-slate-50 text-slate-600"
                    title={tAdmin("编辑")}
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDeleteEmployee(emp)}
                    className={cn(
                      "p-1.5 rounded-lg shadow-sm border bg-white text-red-500",
                      isResignedEmployee
                        ? "border-red-200 hover:bg-red-50"
                        : "border-amber-200 hover:bg-amber-50 text-amber-600"
                    )}
                    title={statusActionLabel}
                  >
                    {isResignedEmployee ? <Trash2 className="w-4 h-4" /> : <UserRoundMinus className="w-4 h-4" />}
                  </button>
                </div>
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-16 h-16 rounded-full bg-slate-100 border-2 border-slate-200 overflow-hidden flex-shrink-0 flex items-center justify-center">
                    {employeePhoto ? (
                      <img src={employeePhoto} className="w-full h-full object-cover" alt={emp.name} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400 bg-slate-50 text-lg font-bold">
                        {emp.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className="relative flex-1 min-w-0 pr-8">
                    {emp.status === "resigned" ? (
                      <span className="absolute right-0 top-0 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-600 ring-1 ring-rose-100 text-center leading-tight break-words max-w-20">
                        {tAdmin("离职")}
                      </span>
                    ) : null}
                    <h3 className="pr-10 text-base font-bold leading-tight text-slate-800 break-words">{emp.name}</h3>
                    {emp.nickname ? (
                      <p className="mt-0.5 text-xs leading-tight text-slate-400 break-words">{emp.nickname}</p>
                    ) : null}
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-lg" title={getCountryName(emp.country)}>{COUNTRY_FLAGS[emp.country]}</span>
                      <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full text-center leading-tight break-words">{getCountryName(emp.country)}</span>
                      <span className={cn(
                        "text-[10px] px-2 py-0.5 rounded-full text-center leading-tight break-words",
                        emp.gender === "female" ? "text-pink-600 bg-pink-50" : "text-blue-600 bg-blue-50"
                      )}>
                        {emp.gender === "female" ? tAdmin("女") : tAdmin("男")}
                      </span>
                      <span className={cn(
                        "text-[10px] px-2 py-0.5 rounded-full text-center leading-tight break-words",
                        statusLabel === tAdmin("在职") ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
                      )}>
                        {statusLabel}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-2 text-sm border-t border-slate-100 pt-3">
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wide">{tAdmin("职位")}</p>
                    <p className="font-medium leading-tight text-slate-700 break-words">{emp.role}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wide">{tAdmin("区域")}</p>
                    <p className="font-medium leading-tight text-slate-700 break-words">{emp.dept || "-"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wide">{tAdmin("时薪")}</p>
                    <p className="font-semibold leading-tight text-slate-700 break-words">
                      {hourlyRate !== null && hourlyRate > 0 ? (
                        <span title={emp.salaryType === "fixed" ? tAdmin("由基础月工资换算：(月薪/30)/8 小时") : undefined}>
                          {formatCurrency(hourlyRate, emp.currency)} {emp.salaryType === "fixed" ? <span className="text-[9px] text-slate-400 font-normal whitespace-normal">{tAdmin("(折算)")}</span> : null}
                        </span>
                      ) : "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wide">{tAdmin("基础工资 (月薪)")}</p>
                    <p className="font-semibold text-brand-600 font-mono leading-tight break-words">
                      {monthlyWage !== null && monthlyWage > 0
                        ? formatCurrency(monthlyWage, emp.currency)
                        : <span className="text-xs text-slate-400 font-normal whitespace-normal">{tAdmin("无 (按时薪计算)")}</span>}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wide">{tAdmin("餐补费用")}</p>
                    <p className="font-semibold text-slate-700 font-mono leading-tight break-words">{formatCurrency(emp.mealAllowance, emp.currency)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wide">{tAdmin("服务费比例")}</p>
                    <p className="font-semibold text-slate-700 font-mono leading-tight break-words">{emp.serviceFeeRate.toFixed(2)}%</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wide">{tAdmin("币种")}</p>
                    <p className="font-medium leading-tight text-slate-700 break-words">{emp.currency}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wide">{tAdmin("入职")}</p>
                    <p className="font-medium leading-tight text-slate-700 break-words">{emp.joinDate}</p>
                  </div>
                </div>
              </div>
            );
            })}
          </div>
        )}
        <Pagination
          page={page}
          pageSize={pageSize}
          total={displayTotal}
          itemName={tAdmin("名员工")}
          disabled={pageLoading || loading}
          className="mt-6"
          onPageChange={setPage}
        />
        <div className="mt-6 text-center text-sm text-slate-400">
          {(exactTotalFromPage !== null || totalResolved)
            ? tAdmin("共 {{count}} 名员工", { count: displayTotal })
            : tAdmin("员工总数统计中，当前先显示已加载列表")}
        </div>
      </div>
    </div>
  );
}
