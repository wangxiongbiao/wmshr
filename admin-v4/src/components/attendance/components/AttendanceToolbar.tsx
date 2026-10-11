import { useState, useMemo, type RefObject } from "react";
import { User, SlidersHorizontal, RefreshCw, Clock, Download, X, Calendar } from "lucide-react";
import type { Employee } from "../../../types";
import { cn } from "../../../lib/utils";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { TableHorizontalScroller } from "../../TableHorizontalScroller";
import { AttendanceMonthPicker } from "./AttendanceMonthPicker";

interface AttendanceToolbarProps {
  employees: Employee[];
  selectedEmployeeId: number | "all";
  onSelectEmployeeId: (id: number | "all") => void;
  statusFilter: "all" | "active" | "inactive";
  onStatusFilterChange: (status: "all" | "active" | "inactive") => void;
  selectedMonth: string;
  defaultMonth: string;
  onSelectMonth: (month: string) => void;
  onResetFilters: () => void;
  isRefreshing: boolean;
  onRefresh: () => void;
  hasPermission?: (permId: string) => boolean;
  onAddRecord: () => void;
  onExportCSV: () => void;
  tableContainerRef: RefObject<HTMLDivElement | null>;
  actionBarRef: RefObject<HTMLDivElement | null>;
}

export function AttendanceToolbar({
  employees,
  selectedEmployeeId,
  onSelectEmployeeId,
  statusFilter,
  onStatusFilterChange,
  selectedMonth,
  defaultMonth,
  onSelectMonth,
  onResetFilters,
  isRefreshing,
  onRefresh,
  hasPermission = () => true,
  onAddRecord,
  onExportCSV,
  tableContainerRef,
  actionBarRef
}: AttendanceToolbarProps) {
  const [isEmployeeDropdownOpen, setIsEmployeeDropdownOpen] = useState(false);
  const [employeeSearchQuery, setEmployeeSearchQuery] = useState("");

  const filteredEmployeesForDropdown = useMemo(() => {
    if (statusFilter === "active") {
      return employees.filter(e => e.status !== "离职");
    } else if (statusFilter === "inactive") {
      return employees.filter(e => e.status === "离职");
    }
    return employees;
  }, [employees, statusFilter]);

  const searchedEmployees = useMemo(() => {
    let list = filteredEmployeesForDropdown;
    if (employeeSearchQuery.trim()) {
      const q = employeeSearchQuery.toLowerCase();
      list = list.filter(emp =>
        emp.name.toLowerCase().includes(q) ||
        (emp.role && emp.role.toLowerCase().includes(q)) ||
        (emp.dept && emp.dept.toLowerCase().includes(q))
      );
    }
    return list;
  }, [filteredEmployeesForDropdown, employeeSearchQuery]);

  const isFiltered = selectedEmployeeId !== "all" || statusFilter !== "all" || selectedMonth !== defaultMonth;

  return (
    <>
      {/* Compact Filter Panel */}
      <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs mb-3 space-y-2.5">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* 1. 员工状态筛选 (在职/离职) */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
              员工状态:
            </span>
            <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200/50">
              <button
                type="button"
                onClick={() => {
                  onStatusFilterChange("all");
                  onSelectEmployeeId("all");
                }}
                className={cn(
                  "px-3 py-1 text-xs font-medium rounded-md transition-all cursor-pointer",
                  statusFilter === "all"
                    ? "bg-white text-slate-800 shadow-xs"
                    : "text-slate-600 hover:text-slate-800"
                )}
              >
                全部
              </button>
              <button
                type="button"
                onClick={() => {
                  onStatusFilterChange("active");
                  onSelectEmployeeId("all");
                }}
                className={cn(
                  "px-3 py-1 text-xs font-medium rounded-md transition-all cursor-pointer",
                  statusFilter === "active"
                    ? "bg-brand-500 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-800"
                )}
              >
                在职员工
              </button>
              <button
                type="button"
                onClick={() => {
                  onStatusFilterChange("inactive");
                  onSelectEmployeeId("all");
                }}
                className={cn(
                  "px-3 py-1 text-xs font-medium rounded-md transition-all cursor-pointer",
                  statusFilter === "inactive"
                    ? "bg-rose-500 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-800"
                )}
              >
                离职员工
              </button>
            </div>
          </div>

          {/* 2. 筛选员工 (Searchable Dropdown) */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-slate-400" />
              筛选员工:
            </span>
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsEmployeeDropdownOpen(!isEmployeeDropdownOpen)}
                className="px-3 py-1 border border-slate-200 rounded-lg bg-white text-slate-700 text-xs font-medium flex items-center gap-1.5 h-[32px] hover:border-slate-300 transition-colors cursor-pointer min-w-[120px] justify-between shadow-xs"
              >
                <span>
                  {selectedEmployeeId === "all"
                    ? "🔍 所有员工"
                    : (employees.find(e => e.id === selectedEmployeeId)?.name || "未知员工")
                  }
                </span>
                <span className="text-[10px] text-slate-400">▼</span>
              </button>

              {isEmployeeDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsEmployeeDropdownOpen(false)} />
                  <div className="absolute left-0 mt-1 w-64 bg-white border border-slate-200 rounded-lg shadow-lg z-50 p-2 animate-fade-in">
                    <div className="relative mb-1.5">
                      <Input
                        type="text"
                        placeholder="搜索姓名、职位、部门..."
                        value={employeeSearchQuery}
                        onChange={(e) => setEmployeeSearchQuery(e.target.value)}
                        className="h-8 pr-7 text-xs border-slate-200"
                        autoFocus
                      />
                      {employeeSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setEmployeeSearchQuery("")}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
                          title="清空搜索"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <div className="max-h-48 overflow-y-auto space-y-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          onSelectEmployeeId("all");
                          setIsEmployeeDropdownOpen(false);
                          setEmployeeSearchQuery("");
                        }}
                        className={cn(
                          "w-full text-left px-2 py-1.5 text-xs rounded-md transition-colors cursor-pointer",
                          selectedEmployeeId === "all" ? "bg-brand-50 text-brand-700 font-medium" : "text-slate-600 hover:bg-slate-50"
                        )}
                      >
                        🔍 所有员工
                      </button>
                      {searchedEmployees.length === 0 ? (
                        <div className="text-center text-slate-400 py-3 text-xs">无匹配员工</div>
                      ) : (
                        searchedEmployees.map(emp => (
                          <button
                            key={emp.id}
                            type="button"
                            onClick={() => {
                              onSelectEmployeeId(emp.id);
                              setIsEmployeeDropdownOpen(false);
                              setEmployeeSearchQuery("");
                            }}
                            className={cn(
                              "w-full text-left px-2 py-1.5 text-xs rounded-md transition-colors flex items-center justify-between cursor-pointer",
                              selectedEmployeeId === emp.id ? "bg-brand-50 text-brand-700 font-medium" : "text-slate-600 hover:bg-slate-50"
                            )}
                          >
                            <span className="truncate max-w-[150px]" title={emp.name}>
                              {emp.name} <span className="text-slate-400 text-[10px]">({emp.role})</span>
                            </span>
                            {emp.status === "离职" && <span className="text-[10px] text-red-500 bg-red-50 px-1 rounded shrink-0">离职</span>}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* 3. 时间筛选 */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              按月筛选:
            </span>
            <AttendanceMonthPicker
              selectedMonth={selectedMonth}
              defaultMonth={defaultMonth}
              onSelectMonth={onSelectMonth}
            />
          </div>

          {/* Reset button inside the list */}
          {isFiltered && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                onResetFilters();
                setEmployeeSearchQuery("");
              }}
              className="text-xs font-medium text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-2.5 rounded-lg border-rose-100 h-[32px] shadow-xs"
            >
              <X className="w-3.5 h-3.5" /> 重置筛选
            </Button>
          )}
        </div>
      </div>

      {/* Action Bar Header */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-xs rounded-t-xl shadow-2xs border-b border-slate-100">
        <div ref={actionBarRef} className="px-4 py-3 flex justify-between items-center">
          <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
            <span>考勤列表</span>
            {isFiltered && (
              <span className="text-xs bg-brand-50 text-brand-700 px-2 py-0.5 rounded-full font-normal border border-brand-100 animate-pulse">
                已启用筛选
              </span>
            )}
          </h3>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="bg-white border-slate-200 text-slate-700 h-8 px-3 text-sm font-medium hover:bg-slate-50 shadow-2xs"
              title="刷新考勤数据并重置筛选条件"
            >
              <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
              刷新数据
            </Button>
            {hasPermission("attendance_edit") && (
              <Button
                type="button"
                size="sm"
                onClick={onAddRecord}
                className="bg-brand-600 hover:bg-brand-700 text-white h-8 px-3 text-sm font-medium shadow-xs"
              >
                <Clock className="w-4 h-4" />
                手动新增考勤
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onExportCSV}
              className="bg-brand-50 border-brand-200 text-brand-700 h-8 px-3 text-sm font-medium hover:bg-brand-100 shadow-2xs"
              title="导出当前表格显示的数据为 CSV 文件"
            >
              <Download className="w-4 h-4" />
              导出当前数据
            </Button>

            <div className="w-px h-5 bg-slate-200 mx-0.5 hidden sm:block" />
            <TableHorizontalScroller targetRef={tableContainerRef} />
          </div>
        </div>
      </div>
    </>
  );
}
