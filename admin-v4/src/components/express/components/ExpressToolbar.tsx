import React from "react";
import {
  Search,
  X,
  Database,
  Upload,
  Coins,
  Download,
  RotateCcw,
  SlidersHorizontal,
  Table as TableIcon,
  History,
  RefreshCw,
  Loader2
} from "lucide-react";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "../../ui/select";
import { Badge } from "../../ui/badge";
import { TableHorizontalScroller } from "../../TableHorizontalScroller";
import { ExpressSubTab, ExpressViewMode, ExpressStatusFilter, ExpressActiveDrawer } from "../types";

interface ExpressToolbarProps {
  searchQuery: string;
  onSearchChange: (val: string) => void;
  activeSubTab: ExpressSubTab;
  onSubTabChange: (tab: ExpressSubTab) => void;
  statusFilter: ExpressStatusFilter;
  onStatusFilterChange: (status: ExpressStatusFilter) => void;
  customerFilter: string;
  onCustomerFilterChange: (customer: string) => void;
  uniqueCustomers: string[];
  viewMode: ExpressViewMode;
  onViewModeChange: (mode: ExpressViewMode) => void;
  activeDrawer: ExpressActiveDrawer;
  onToggleImport: () => void;
  onToggleSurcharge: () => void;
  surchargeCount: number;
  onOpenImportLogs: () => void;
  importLogsCount: number;
  onExportCsv: () => void;
  onClearData?: () => void;
  hasData: boolean;
  onRefresh?: () => void;
  summaryCustomerCount: number;
  totalFilteredCount: number;
  discrepancyCount: number;
  tableContainerRef: React.RefObject<HTMLDivElement | null>;
}

export function ExpressToolbar(props: ExpressToolbarProps) {
  const {
    searchQuery,
    onSearchChange,
    activeSubTab,
    onSubTabChange,
    statusFilter,
    onStatusFilterChange,
    customerFilter,
    onCustomerFilterChange,
    uniqueCustomers,
    viewMode,
    onViewModeChange,
    activeDrawer,
    onToggleImport,
    onToggleSurcharge,
    surchargeCount,
    onOpenImportLogs,
    importLogsCount,
    onExportCsv,
    onClearData,
    hasData,
    onRefresh,
    summaryCustomerCount,
    totalFilteredCount,
    discrepancyCount,
    tableContainerRef
  } = props;

  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [isExporting, setIsExporting] = React.useState(false);

  const hasFilterActive =
    Boolean(searchQuery.trim()) ||
    statusFilter !== "all" ||
    customerFilter !== "all";

  const handleResetFilters = () => {
    onSearchChange("");
    onStatusFilterChange("all");
    onCustomerFilterChange("all");
  };

  const handleManualRefresh = () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    setTimeout(() => {
      onRefresh?.();
      setIsRefreshing(false);
    }, 600);
  };

  const handleExportWithDebounce = () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      onExportCsv();
    } finally {
      setTimeout(() => setIsExporting(false), 800);
    }
  };

  return (
    <div className="bg-slate-50/95 border border-slate-200/80 rounded-xl p-3 shadow-2xs space-y-2.5">
      {/* Row 1: Search & Action Buttons */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2.5">
        {/* Left: Quick Search */}
        <div className="flex items-center gap-2.5 flex-1 max-w-md">
          <div className="relative w-full">
            <Input
              type="text"
              placeholder="搜索运单号、客户名称、收件人、订单号..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="h-8 text-xs pl-8 pr-7 bg-white shadow-xs rounded-lg border-slate-200"
            />
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            {searchQuery && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => onSearchChange("")}
                className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 p-0 cursor-pointer"
                title="清空搜索"
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 justify-end shrink-0 flex-wrap">
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={onToggleImport}
            className="h-8 text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5 px-3 bg-brand-600 hover:bg-brand-700 text-white cursor-pointer"
            title="打开数据导入弹窗，支持 Excel 文件上传与剪贴板文本粘贴"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>导入数据</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onToggleSurcharge}
            className="h-8 text-xs font-medium shadow-xs flex items-center justify-center gap-1.5 px-2.5 bg-white border-slate-200 hover:bg-slate-50 text-slate-700 cursor-pointer"
            title="查看与配置客户操作费规则列表"
          >
            <Coins className="w-3.5 h-3.5 text-amber-500" />
            <span>客户操作列表</span>
            <Badge
              variant="secondary"
              className="h-4 px-1 text-[10px] font-mono border-none bg-amber-100 text-amber-800"
            >
              {surchargeCount}
            </Badge>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onOpenImportLogs}
            className="h-8 text-xs font-medium shadow-xs flex items-center justify-center gap-1.5 px-2.5 bg-white border-slate-200 hover:bg-slate-50 text-slate-700 cursor-pointer"
            title="查看历史导入批次记录与一键回载"
          >
            <History className="w-3.5 h-3.5 text-blue-500" />
            <span>导入记录</span>
            {importLogsCount > 0 && (
              <Badge
                variant="secondary"
                className="h-4 px-1 text-[10px] font-mono border-none bg-blue-100 text-blue-800"
              >
                {importLogsCount}
              </Badge>
            )}
          </Button>

          {hasData && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isRefreshing}
              onClick={handleManualRefresh}
              className="h-8 text-xs font-medium shadow-xs flex items-center justify-center gap-1.5 px-2.5 bg-white border-slate-200 hover:bg-slate-50 text-slate-700 cursor-pointer"
              title="重新计算与手动刷新对账结果"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isRefreshing ? "animate-spin text-brand-600" : ""}`} />
              <span>{isRefreshing ? "核算中..." : "重新核对"}</span>
            </Button>
          )}

          {hasData && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isExporting}
              onClick={handleExportWithDebounce}
              className="h-8 text-xs font-medium shadow-xs flex items-center justify-center gap-1.5 px-2.5 bg-white border-slate-200 hover:bg-slate-50 text-emerald-700 cursor-pointer"
            >
              {isExporting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
              ) : (
                <Download className="w-3.5 h-3.5 text-emerald-600" />
              )}
              <span>{isExporting ? "导出中..." : "导出比对明细"}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Row 2: SubTabs, Filters & Table Horizontal Scroller */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1.5 border-t border-slate-200/50">
        {/* Left: View Tabs and Select Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* SubTab Buttons with Badges */}
          <div className="flex items-center bg-slate-200/60 p-0.5 rounded-lg border border-slate-200/40">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onSubTabChange("summary")}
              className={`h-[26px] px-2.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                activeSubTab === "summary"
                  ? "bg-white text-slate-900 shadow-xs font-semibold hover:bg-white"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
              }`}
            >
              <span>客户账单汇总</span>
              <Badge
                variant="secondary"
                className="h-4 px-1 text-[10px] font-mono bg-slate-100 text-slate-600 border-none"
              >
                {summaryCustomerCount}
              </Badge>
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onSubTabChange("details")}
              className={`h-[26px] px-2.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                activeSubTab === "details"
                  ? "bg-white text-slate-900 shadow-xs font-semibold hover:bg-white"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
              }`}
            >
              <span>比对明细</span>
              <Badge
                variant="secondary"
                className="h-4 px-1 text-[10px] font-mono bg-slate-100 text-slate-600 border-none"
              >
                {totalFilteredCount}
              </Badge>
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onSubTabChange("discrepancies")}
              className={`h-[26px] px-2.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                activeSubTab === "discrepancies"
                  ? "bg-white text-slate-900 shadow-xs font-semibold hover:bg-white"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
              }`}
            >
              <span>异常核对</span>
              {discrepancyCount > 0 && (
                <Badge
                  variant="destructive"
                  className="h-4 px-1 text-[10px] font-mono bg-amber-500 text-white hover:bg-amber-600 border-none"
                >
                  {discrepancyCount}
                </Badge>
              )}
            </Button>
          </div>

          {/* Details tab specific filters */}
          {activeSubTab === "details" && (
            <>
              {/* Status Filter */}
              <div className="w-32">
                <Select
                  value={statusFilter}
                  onValueChange={(val) => onStatusFilterChange(val as ExpressStatusFilter)}
                >
                  <SelectTrigger className="h-8 text-xs bg-white border-slate-200 shadow-xs">
                    <SelectValue placeholder="状态: 全部" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">状态: 全部</SelectItem>
                    <SelectItem value="matched">匹配成功</SelectItem>
                    <SelectItem value="system_only">仅系统有单</SelectItem>
                    <SelectItem value="jnt_only">仅JNT账单有单</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Customer Filter */}
              <div className="w-36">
                <Select value={customerFilter} onValueChange={onCustomerFilterChange}>
                  <SelectTrigger className="h-8 text-xs bg-white border-slate-200 shadow-xs">
                    <SelectValue placeholder="发货客户: 全部" />
                  </SelectTrigger>
                  <SelectContent className="max-h-56">
                    <SelectItem value="all">客户: 全部</SelectItem>
                    {uniqueCustomers.map((cust) => (
                      <SelectItem key={cust} value={cust}>
                        {cust}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* View Mode Toggle: standard vs jnt */}
              <div className="flex items-center bg-slate-200/60 p-0.5 rounded-lg border border-slate-200/40">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onViewModeChange("standard")}
                  className={`h-[26px] px-2 text-[11px] font-medium rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                    viewMode === "standard"
                      ? "bg-white text-slate-900 shadow-xs font-semibold hover:bg-white"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
                  }`}
                  title="简洁模式：单号、客户、收件人、运费、操作费、状态"
                >
                  <TableIcon className="w-3 h-3" />
                  <span>简洁视图</span>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onViewModeChange("jnt")}
                  className={`h-[26px] px-2 text-[11px] font-medium rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                    viewMode === "jnt"
                      ? "bg-brand-600 text-white shadow-xs font-semibold hover:bg-brand-600"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
                  }`}
                  title="J&T对账单完整格式：包含网点、管理方式、经营模式、付款周期、产品类型等全部字段"
                >
                  <SlidersHorizontal className="w-3 h-3" />
                  <span>J&T完整模式</span>
                </Button>
              </div>
            </>
          )}

          {/* Reset Filters button */}
          {hasFilterActive && (
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={handleResetFilters}
              className="h-8 px-2 text-xs text-slate-500 hover:text-rose-600 font-medium gap-1 cursor-pointer"
              title="重置所有筛选"
            >
              <RotateCcw className="w-3 h-3" />
              <span>重置</span>
            </Button>
          )}
        </div>

        {/* Right: Table Horizontal Scroller */}
        <div className="flex items-center justify-end shrink-0">
          <TableHorizontalScroller targetRef={tableContainerRef} alwaysShow={true} />
        </div>
      </div>
    </div>
  );
}
