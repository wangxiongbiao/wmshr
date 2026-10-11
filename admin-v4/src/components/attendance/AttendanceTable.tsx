import { useState } from "react";
import { Pagination } from "../Pagination";
import type { AttendanceTableProps, AttendanceDetailRecord } from "./types";
import { useAttendanceData } from "./hooks/useAttendanceData";
import { useStickyMirrorHeader } from "./hooks/useStickyMirrorHeader";
import { exportAttendanceRowsToCSV } from "./utils/exportAttendanceCsv";
import { AttendanceBatchBar } from "./components/AttendanceBatchBar";
import { AttendanceToolbar } from "./components/AttendanceToolbar";
import { AttendanceMainTable } from "./components/AttendanceMainTable";
import { AttendanceDetailModal } from "./components/AttendanceDetailModal";

export function AttendanceTable({
  employees,
  attendance,
  config,
  selectedIds,
  onSelect,
  onSelectAll,
  onEditRecord,
  holidays,
  leaveRequests = [],
  onUpdateLeaveRequests,
  hasPermission = () => true,
  onRefresh,
  addToast,
  warehouseCode
}: AttendanceTableProps) {
  const [detailRecord, setDetailRecord] = useState<AttendanceDetailRecord | null>(null);

  const {
    defaultMonth,
    selectedEmployeeId,
    setSelectedEmployeeId,
    statusFilter,
    setStatusFilter,
    selectedMonth,
    setSelectedMonth,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    isTableLoading,
    isRefreshing,
    handleRefresh,
    handleResetFilters,
    flatRows,
    pagedRows,
    totalPages,
    visibleAttendanceRecords,
    isAllSelected,
    isPartiallySelected
  } = useAttendanceData({
    employees,
    attendance,
    selectedIds,
    warehouseCode,
    onRefresh,
    addToast
  });

  const {
    tableContainerRef,
    mirrorHeaderRef,
    realTableRef,
    realTheadRef,
    tableHeadSentinelRef,
    actionBarRef,
    isMirrorHeaderVisible,
    colWidths,
    realTableWidth,
    handleTableScroll
  } = useStickyMirrorHeader([flatRows.length, pageSize, currentPage, isTableLoading]);

  const handleExportCSV = () => {
    if (flatRows.length === 0) {
      addToast?.("当前无考勤数据可导出", "info");
      return;
    }
    try {
      exportAttendanceRowsToCSV(
        flatRows,
        `海外仓考勤报表_${new Date().toISOString().split("T")[0]}.csv`,
        config,
        holidays,
        leaveRequests
      );
      addToast?.(`已成功导出 ${flatRows.length} 条考勤数据`, "success");
    } catch (err: any) {
      addToast?.(err?.message || "导出考勤报表失败", "error");
    }
  };

  const handleExportSelectedCSV = () => {
    if (selectedIds.size === 0) {
      addToast?.("请先勾选需要导出的打卡记录", "info");
      return;
    }
    const selectedRows = flatRows.filter(r => r.rec && selectedIds.has(r.rec.id));
    if (selectedRows.length === 0) {
      addToast?.("选中的行中无有效考勤记录可导出", "info");
      return;
    }
    try {
      exportAttendanceRowsToCSV(
        selectedRows,
        `海外仓选中考勤报表_${selectedMonth}_${selectedRows.length}条.csv`,
        config,
        holidays,
        leaveRequests
      );
      addToast?.(`已成功导出 ${selectedRows.length} 条选中的考勤记录`, "success");
    } catch (err: any) {
      addToast?.(err?.message || "导出选中记录失败", "error");
    }
  };

  const isFiltered = selectedEmployeeId !== "all" || statusFilter !== "all" || selectedMonth !== defaultMonth;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* 批量操作浮动栏 */}
      <AttendanceBatchBar
        selectedCount={selectedIds.size}
        onExportSelected={handleExportSelectedCSV}
        onClearSelection={() => onSelectAll([])}
      />

      {/* 顶部筛选工具栏 & 列表操作栏 */}
      <AttendanceToolbar
        employees={employees}
        selectedEmployeeId={selectedEmployeeId}
        onSelectEmployeeId={setSelectedEmployeeId}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        selectedMonth={selectedMonth}
        defaultMonth={defaultMonth}
        onSelectMonth={setSelectedMonth}
        onResetFilters={handleResetFilters}
        isRefreshing={isRefreshing}
        onRefresh={handleRefresh}
        hasPermission={hasPermission}
        onAddRecord={() => onEditRecord(null, 0, "", null)}
        onExportCSV={handleExportCSV}
        tableContainerRef={tableContainerRef}
        actionBarRef={actionBarRef}
      />

      {/* 考勤数据主表格 (含悬浮镜像表头) */}
      <div className="glass-panel rounded-xl shadow-sm border border-slate-200/80 bg-white">
        <AttendanceMainTable
          tableContainerRef={tableContainerRef}
          mirrorHeaderRef={mirrorHeaderRef}
          realTableRef={realTableRef}
          realTheadRef={realTheadRef}
          tableHeadSentinelRef={tableHeadSentinelRef}
          isMirrorHeaderVisible={isMirrorHeaderVisible}
          colWidths={colWidths}
          realTableWidth={realTableWidth}
          handleTableScroll={handleTableScroll}
          flatRows={flatRows}
          pagedRows={pagedRows}
          isTableLoading={isTableLoading}
          selectedIds={selectedIds}
          onSelect={onSelect}
          onSelectAll={onSelectAll}
          visibleAttendanceRecords={visibleAttendanceRecords}
          isAllSelected={isAllSelected}
          isPartiallySelected={isPartiallySelected}
          config={config}
          holidays={holidays}
          leaveRequests={leaveRequests}
          hasPermission={hasPermission}
          onViewDetail={setDetailRecord}
          onEditRecord={onEditRecord}
          onResetFilters={handleResetFilters}
          isFiltered={isFiltered}
        />
      </div>

      {/* 分页控制栏 */}
      <div className="mt-4">
        <Pagination
          page={currentPage}
          pageSize={pageSize}
          total={flatRows.length}
          itemName="条"
          pageSizeOptions={[20, 50, 100]}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      </div>

      {/* 考勤明细查看弹窗 */}
      <AttendanceDetailModal
        detailRecord={detailRecord}
        config={config}
        onClose={() => setDetailRecord(null)}
      />
    </div>
  );
}
