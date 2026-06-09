/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { tAdmin } from "../lib/i18nText";
import { Edit, KeyRound, Plus, Search, Trash2 } from "lucide-react";
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
  if (employee.status === "disabled") return tAdmin("停用");
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
    // 搜索条件变化后必须回到第一页；真实后端分页下，旧页码继续请求会直接跳到深页，和用户当前筛选意图不一致。
    setPage(1);
  }, [query]);

  useEffect(() => {
    const requestId = ++loadRequestIdRef.current;
    setPageLoading(true);
    setError("");

    void fetchEmployeesPage({
      keyword: query,
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
  }, [page, pageSize, query, reloadKey]);

  useEffect(() => {
    let cancelled = false;
    setTotal(0);
    setTotalResolved(false);

    void fetchEmployeesCount({
      keyword: query
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
  }, [query, reloadKey]);

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
  const displayTotal = totalResolved
    ? total
    : Math.max(total, (page - 1) * pageSize + rows.length + (hasMore ? 1 : 0));

  return (
    <div className="h-full min-h-0 flex flex-col">
      <div className="shrink-0 pb-4 space-y-3">
        {/* 员工列表按 Header / Content 分层：筛选和新增按钮固定在顶部，只有下面的卡片区域滚动，避免长列表把操作入口顶出视口。 */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="relative w-full sm:w-72">
          <input
            type="text"
            value={query}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={tAdmin("搜索姓名、昵称、职位或区域...")}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none text-sm bg-white"
          />
          <Search className="w-5 h-5 absolute left-3 top-2.5 text-slate-400" />
        </div>
        <button
          onClick={onAddEmployee}
          className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-md transition flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />{tAdmin("新增员工")}</button>
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

            return (
              <div key={emp.id} className="glass-panel rounded-xl p-5 hover:shadow-md transition-all duration-300 flex flex-col relative group">
                <div className="absolute top-4 right-4 flex gap-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
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
                    className="p-1.5 bg-white rounded-lg shadow-sm border border-red-200 hover:bg-red-50 text-red-500"
                    title={tAdmin("删除")}
                  >
                    <Trash2 className="w-4 h-4" />
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
                  <div className="flex-1 min-w-0 pr-8">
                    <h3 className="text-base font-bold text-slate-800 truncate">{emp.name}</h3>
                    {emp.nickname ? (
                      <p className="text-xs text-slate-400 truncate mt-0.5">{emp.nickname}</p>
                    ) : null}
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-lg" title={getCountryName(emp.country)}>{COUNTRY_FLAGS[emp.country]}</span>
                      <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{getCountryName(emp.country)}</span>
                      <span className={cn(
                        "text-[10px] px-2 py-0.5 rounded-full",
                        emp.gender === "female" ? "text-pink-600 bg-pink-50" : "text-blue-600 bg-blue-50"
                      )}>
                        {emp.gender === "female" ? tAdmin("女") : tAdmin("男")}
                      </span>
                      <span className={cn(
                        "text-[10px] px-2 py-0.5 rounded-full",
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
                    <p className="font-medium text-slate-700 truncate">{emp.role}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wide">{tAdmin("区域")}</p>
                    <p className="font-medium text-slate-700 truncate">{emp.dept || "-"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wide">{tAdmin("时薪")}</p>
                    <p className="font-semibold text-slate-700">
                      {hourlyRate !== null && hourlyRate > 0 ? (
                        <span title={emp.salaryType === "fixed" ? tAdmin("由基础月工资换算：(月薪/30)/8 小时") : undefined}>
                          {formatCurrency(hourlyRate, emp.currency)} {emp.salaryType === "fixed" ? <span className="text-[9px] text-slate-400 font-normal">{tAdmin("(折算)")}</span> : null}
                        </span>
                      ) : "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wide">{tAdmin("基础工资 (月薪)")}</p>
                    <p className="font-semibold text-brand-600 font-mono">
                      {monthlyWage !== null && monthlyWage > 0
                        ? formatCurrency(monthlyWage, emp.currency)
                        : <span className="text-xs text-slate-400 font-normal">{tAdmin("无 (按时薪计算)")}</span>}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wide">{tAdmin("餐补费用")}</p>
                    <p className="font-semibold text-slate-700 font-mono">{formatCurrency(emp.mealAllowance, emp.currency)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wide">{tAdmin("服务费比例")}</p>
                    <p className="font-semibold text-slate-700 font-mono">{emp.serviceFeeRate.toFixed(2)}%</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wide">{tAdmin("币种")}</p>
                    <p className="font-medium text-slate-700">{emp.currency}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wide">{tAdmin("入职")}</p>
                    <p className="font-medium text-slate-700">{emp.joinDate}</p>
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
          {totalResolved
            ? tAdmin("共 {{count}} 名员工", { count: total })
            : tAdmin("员工总数统计中，当前先显示已加载列表")}
        </div>
      </div>
    </div>
  );
}
