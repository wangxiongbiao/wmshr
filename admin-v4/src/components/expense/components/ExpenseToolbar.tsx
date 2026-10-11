import React, { useState } from "react";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";
import { 
  Calendar, ChevronDown, Search, X, RefreshCw, ShieldCheck, 
  Settings, Download, Plus, RotateCcw 
} from "lucide-react";
import { TableHorizontalScroller } from "../../TableHorizontalScroller";
import { METHODS } from "../constants";
import { cn } from "../../../lib/utils";

interface ExpenseToolbarProps {
  // Month filter
  monthFilter: string;
  setMonthFilter: (m: string) => void;
  // Search
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  // Filters
  statusFilter: string;
  setStatusFilter: (s: string) => void;
  typeFilter: string;
  setTypeFilter: (t: string) => void;
  methodFilter: string;
  setMethodFilter: (m: string) => void;
  purposeFilter: string;
  setPurposeFilter: (p: string) => void;
  categories: string[];
  // Stats for badge
  stats: {
    totalCount: number;
    pendingCount: number;
    approvedCount: number;
    rejectCount: number;
  };
  // Actions
  loading?: boolean;
  isRefreshing: boolean;
  onRefresh: () => void;
  onOpenFlowConfig: () => void;
  onOpenCategoryConfig: () => void;
  onExportExcel: () => void;
  onOpenCreate: () => void;
  onResetFilters: () => void;
  // Scroll target ref & action bar ref
  tableContainerRef: React.RefObject<HTMLDivElement | null>;
  actionBarRef: React.RefObject<HTMLDivElement | null>;
}

export function ExpenseToolbar({
  monthFilter,
  setMonthFilter,
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  typeFilter,
  setTypeFilter,
  methodFilter,
  setMethodFilter,
  purposeFilter,
  setPurposeFilter,
  categories,
  stats,
  loading,
  isRefreshing,
  onRefresh,
  onOpenFlowConfig,
  onOpenCategoryConfig,
  onExportExcel,
  onOpenCreate,
  onResetFilters,
  tableContainerRef,
  actionBarRef
}: ExpenseToolbarProps) {
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(() => {
    try {
      return parseInt(new Date().toISOString().slice(0, 4), 10);
    } catch {
      return 2026;
    }
  });

  const isFiltered = typeFilter !== "all" || methodFilter !== "all" || purposeFilter !== "all" || statusFilter !== "all" || !!searchQuery;

  return (
    <>
      {/* 操作主区：第一行 搜索查询与业务操作 */}
      <div className="p-4 px-5 border-b border-slate-100 flex flex-wrap gap-3 items-center justify-between bg-white">
        {/* 左侧：月份选择 + 关键字搜索框 */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5">
          <div className="relative shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsMonthPickerOpen(!isMonthPickerOpen)}
              className="h-9 px-3 gap-1.5 text-xs font-semibold text-slate-700 bg-white border-slate-200 hover:border-slate-300 shadow-2xs cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5 text-brand-500" />
              <span>
                {monthFilter === "all" 
                  ? "全部月份" 
                  : `${monthFilter.split("-")[0]}年${monthFilter.split("-")[1]}月`
                }
              </span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </Button>

            {isMonthPickerOpen && (
              <>
                <div 
                  className="fixed inset-0 z-10 cursor-default" 
                  onClick={() => setIsMonthPickerOpen(false)}
                />
                
                <div className="absolute left-0 mt-1.5 w-60 bg-white border border-slate-200 rounded-xl shadow-xl p-3 z-20 animate-fade-in text-slate-800">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setPickerYear(prev => prev - 1)}
                      className="h-7 w-7 p-0 text-slate-500 hover:text-slate-800 font-bold text-xs cursor-pointer"
                    >
                      ◀
                    </Button>
                    <span className="text-xs font-black text-slate-700">
                      {pickerYear} 年
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setPickerYear(prev => prev + 1)}
                      className="h-7 w-7 p-0 text-slate-500 hover:text-slate-800 font-bold text-xs cursor-pointer"
                    >
                      ▶
                    </Button>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 text-center">
                    {Array.from({ length: 12 }, (_, i) => {
                      const monthNum = i + 1;
                      const monthStr = String(monthNum).padStart(2, "0");
                      const targetVal = `${pickerYear}-${monthStr}`;
                      const isSelected = monthFilter === targetVal;
                      
                      return (
                        <Button
                          key={monthNum}
                          type="button"
                          variant={isSelected ? "default" : "ghost"}
                          size="sm"
                          onClick={() => {
                            setMonthFilter(targetVal);
                            setIsMonthPickerOpen(false);
                          }}
                          className={cn(
                            "h-8 py-2 text-xs font-semibold rounded-lg cursor-pointer",
                            isSelected 
                              ? "bg-brand-600 text-white font-extrabold shadow-xs"
                              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                          )}
                        >
                          {monthNum} 月
                        </Button>
                      );
                    })}
                  </div>

                  <div className="border-t border-slate-100 mt-2 pt-2 flex gap-1.5">
                    <Button
                      type="button"
                      variant={monthFilter === "all" ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        setMonthFilter("all");
                        setIsMonthPickerOpen(false);
                      }}
                      className={cn(
                        "flex-1 h-7 text-[11px] font-bold text-center cursor-pointer",
                        monthFilter === "all"
                          ? "bg-brand-600 text-white font-black"
                          : "bg-white text-slate-700 hover:bg-slate-50"
                      )}
                    >
                      全部月份
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const now = new Date();
                        const curr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
                        setPickerYear(now.getFullYear());
                        setMonthFilter(curr);
                        setIsMonthPickerOpen(false);
                      }}
                      className="flex-1 h-7 text-[11px] font-bold text-slate-600 bg-white hover:bg-slate-50 cursor-pointer"
                    >
                      回到本月
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* 搜索框 */}
          <div className="relative w-64 sm:w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3 pointer-events-none z-10" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索员工姓名、工号、单号..."
              className="h-9 w-full pl-8.5 pr-8 text-xs bg-white font-medium border-slate-200 focus:border-brand-500"
            />
            {searchQuery && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setSearchQuery("")}
                className="absolute right-1 top-1 h-7 w-7 text-slate-400 hover:text-slate-600 p-0 cursor-pointer"
                title="清空检索"
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>

        {/* 右侧：操作与配置功能按钮组 */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={onRefresh}
            disabled={isRefreshing || loading}
            id="btn-refresh-expenses"
            type="button"
            variant="outline"
            size="sm"
            className="h-9 px-2.5 gap-1.5 bg-white hover:bg-slate-50 text-slate-700 border-slate-200 hover:text-brand-600 hover:border-brand-200 shadow-2xs text-xs font-semibold shrink-0 cursor-pointer"
            title="重新同步拉取最新员工与考勤数据"
          >
            <RefreshCw className={cn("w-3.5 h-3.5 text-slate-400", isRefreshing && "animate-spin text-brand-600")} />
            <span>刷新</span>
          </Button>
          <Button
            onClick={onOpenFlowConfig}
            id="btn-configure-approval-flow"
            type="button"
            variant="outline"
            size="sm"
            className="h-9 px-2.5 gap-1.5 bg-white hover:bg-slate-50 text-slate-700 border-slate-200 hover:text-brand-600 hover:border-brand-200 shadow-2xs text-xs font-semibold shrink-0 cursor-pointer"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
            <span>流程配置</span>
          </Button>
          <Button
            onClick={onOpenCategoryConfig}
            id="btn-configure-expense-categories"
            type="button"
            variant="outline"
            size="sm"
            className="h-9 px-2.5 gap-1.5 bg-white hover:bg-slate-50 text-slate-700 border-slate-200 hover:text-brand-600 hover:border-brand-200 shadow-2xs text-xs font-semibold shrink-0 cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5 text-slate-400" />
            <span>类型配置</span>
          </Button>
          <Button
            onClick={onExportExcel}
            id="btn-export-payroll-csv"
            type="button"
            variant="outline"
            size="sm"
            className="h-9 px-3 gap-1.5 bg-white hover:bg-emerald-50 text-emerald-700 border-emerald-200 hover:border-emerald-300 shadow-2xs text-xs font-bold shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span>导出工资表</span>
          </Button>
          <Button
            onClick={onOpenCreate}
            id="btn-create-expense"
            type="button"
            variant="default"
            size="sm"
            className="h-9 px-3.5 gap-1.5 bg-brand-600 hover:bg-brand-700 active:scale-95 text-white text-xs font-bold shadow-xs hover:shadow-sm shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>新建报销单</span>
          </Button>
        </div>
      </div>

      {/* 操作主区：第二行 状态快捷Tab与筛选过滤条 */}
      <div className="sticky top-0 z-20 bg-slate-50/95 backdrop-blur-xs border-b border-slate-200/80 shadow-2xs">
        <div ref={actionBarRef} className="px-5 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* 状态快捷分段Tab */}
            <div className="inline-flex p-0.5 bg-slate-200/70 rounded-lg text-slate-600 text-xs font-semibold">
              {[
                { key: "all", label: "全部", count: stats.totalCount, alert: false },
                { key: "pending", label: "待审批", count: stats.pendingCount, alert: stats.pendingCount > 0 },
                { key: "approved", label: "已批准", count: stats.approvedCount, alert: false },
                { key: "rejected", label: "已驳回", count: stats.rejectCount, alert: false },
              ].map(tab => (
                <Button
                  key={tab.key}
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setStatusFilter(tab.key)}
                  className={cn(
                    "h-7 px-2.5 py-1 rounded-md transition-all flex items-center gap-1.5 cursor-pointer text-xs shrink-0 whitespace-nowrap",
                    statusFilter === tab.key
                      ? "bg-white text-brand-600 hover:bg-white hover:text-brand-600 shadow-2xs font-bold"
                      : "text-slate-600 hover:text-slate-900 hover:bg-transparent"
                  )}
                >
                  <span>{tab.label}</span>
                  <span className={cn(
                    "px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold leading-tight shrink-0",
                    statusFilter === tab.key 
                      ? (tab.alert ? "bg-amber-100 text-amber-800" : "bg-brand-50 text-brand-600")
                      : "bg-slate-200 text-slate-500"
                  )}>
                    {tab.count}
                  </span>
                </Button>
              ))}
            </div>

            <div className="h-4 w-px bg-slate-200 mx-0.5 shrink-0" />

            {/* 费用类型过滤 */}
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-8 text-xs font-medium text-slate-700 bg-white border-slate-200 w-auto min-w-[110px] shadow-2xs">
                <SelectValue placeholder="费用类型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部类型</SelectItem>
                {categories.filter(Boolean).map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* 支付/支持方式过滤 */}
            <Select value={methodFilter} onValueChange={setMethodFilter}>
              <SelectTrigger className="h-8 text-xs font-medium text-slate-700 bg-white border-slate-200 w-auto min-w-[110px] shadow-2xs">
                <SelectValue placeholder="支付方式" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部方式</SelectItem>
                {METHODS.map(m => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* 费用用途过滤 */}
            <Select value={purposeFilter} onValueChange={setPurposeFilter}>
              <SelectTrigger className="h-8 text-xs font-medium text-slate-700 bg-white border-slate-200 w-auto min-w-[100px] shadow-2xs">
                <SelectValue placeholder="费用用途" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部用途</SelectItem>
                <SelectItem value="payout">支出</SelectItem>
                <SelectItem value="income">收入</SelectItem>
                <SelectItem value="advance">预支</SelectItem>
              </SelectContent>
            </Select>

            {/* 快速重置按钮 */}
            {isFiltered && (
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={onResetFilters}
                className="h-8 px-2 text-[11px] text-slate-500 hover:text-rose-600 font-bold gap-1 cursor-pointer"
                title="重置所有搜索和筛选条件"
              >
                <RotateCcw className="w-3 h-3" />
                <span>重置</span>
              </Button>
            )}
          </div>

          {/* 右侧：左右滑动表格按钮 */}
          <TableHorizontalScroller targetRef={tableContainerRef} alwaysShow={true} />
        </div>
      </div>
    </>
  );
}
