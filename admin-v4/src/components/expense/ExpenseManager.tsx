import React, { useRef } from "react";
import { Card } from "../ui/card";
import { ExpenseManagerProps } from "./types";
import { useExpenseList } from "./hooks/useExpenseList";
import { useApprovalFlowConfig } from "./hooks/useApprovalFlowConfig";
import { useStickyMirrorHeader } from "../../lib/useStickyMirrorHeader";
import { exportSalaryToExcel } from "./utils/exportExpense";

// Subcomponents
import { ExpenseStatsBar } from "./components/ExpenseStatsBar";
import { ExpenseToolbar } from "./components/ExpenseToolbar";
import { ExpenseMainTable } from "./components/ExpenseMainTable";
import { ExpenseDetailModal } from "./components/ExpenseDetailModal";
import { ExpenseFormModal } from "./components/ExpenseFormModal";
import { ExpenseApproveModal } from "./components/ExpenseApproveModal";
import { ExpenseDeleteConfirmModal } from "./components/ExpenseDeleteConfirmModal";
import { ExpenseCategoryModal } from "./components/ExpenseCategoryModal";
import { ExpenseReceiptPreviewModal } from "./components/ExpenseReceiptPreviewModal";
import { ApprovalFlowConfigModal } from "./components/ApprovalFlowConfigModal";

export function ExpenseManager({
  employees,
  addToast,
  attendance = [],
  config,
  holidays = [],
  loading = false,
  onRefresh
}: ExpenseManagerProps) {
  const tableContainerRef = useRef<HTMLDivElement | null>(null);

  // Core expenses state machine
  const {
    expenses,
    filteredExpenses,
    pagedExpenses,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    totalPages,
    isRefreshing,
    handleManualRefresh,
    searchQuery,
    setSearchQuery,
    typeFilter,
    setTypeFilter,
    methodFilter,
    setMethodFilter,
    statusFilter,
    setStatusFilter,
    purposeFilter,
    setPurposeFilter,
    monthFilter,
    setMonthFilter,
    activeCurrency,
    stats,
    categories,
    // Modals visibility & payload
    isFormOpen,
    setIsFormOpen,
    isDetailOpen,
    setIsDetailOpen,
    isApproveOpen,
    setIsApproveOpen,
    isDeleteConfirmOpen,
    setIsDeleteConfirmOpen,
    isConfigOpen,
    setIsConfigOpen,
    previewImageUrl,
    setPreviewImageUrl,
    editingExpense,
    activeExpense,
    expenseToDelete,
    actionLoadingId,
    // Actions
    handleOpenCreate,
    handleOpenEdit,
    handleOpenDetail,
    handleOpenApproval,
    handleSaveExpense,
    handleSaveApproval,
    handleRecallApproval,
    handleDeleteExpense,
    confirmDeleteExpense,
    handleAddCategory,
    handleUpdateCategory,
    handleDeleteCategory
  } = useExpenseList({
    employees,
    attendance,
    config,
    holidays,
    addToast,
    onRefresh
  });

  // Approval flow state machine
  const {
    isApprovalFlowOpen,
    setIsApprovalFlowOpen,
    approvalFlowConfig,
    newPayoutStepName,
    setNewPayoutStepName,
    newIncomeStepName,
    setNewIncomeStepName,
    editingStepType,
    editingStepIndex,
    editingStepValue,
    setEditingStepValue,
    handleAddStep,
    handleDeleteStep,
    handleMoveStep,
    handleStartEditStep,
    handleSaveEditStep,
    handleToggleFlow
  } = useApprovalFlowConfig(addToast);

  // Sticky Mirror Header
  const {
    mirrorHeaderRef,
    realTableRef,
    realTheadRef,
    tableHeadSentinelRef,
    actionBarRef,
    isMirrorHeaderVisible,
    colWidths,
    realTableWidth,
    handleTableScroll
  } = useStickyMirrorHeader({
    tableContainerRef,
    deps: [filteredExpenses, currentPage, pageSize, loading, isRefreshing]
  });

  const handleResetFilters = () => {
    setSearchQuery("");
    setTypeFilter("all");
    setMethodFilter("all");
    setPurposeFilter("all");
    setStatusFilter("all");
  };

  const handleExportSalary = () => {
    exportSalaryToExcel({
      employees,
      attendance,
      config,
      holidays,
      monthFilter,
      addToast
    });
  };

  return (
    <div className="space-y-6">
      {/* 顶部指标统计 */}
      <ExpenseStatsBar
        stats={stats}
        activeCurrency={activeCurrency}
        statusFilter={statusFilter}
        onSelectStatus={setStatusFilter}
      />

      {/* 条件过滤与操作主区表格 */}
      <Card className="bg-white rounded-xl border border-slate-200/80 shadow-3xs">
        <ExpenseToolbar
          monthFilter={monthFilter}
          setMonthFilter={setMonthFilter}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          typeFilter={typeFilter}
          setTypeFilter={setTypeFilter}
          methodFilter={methodFilter}
          setMethodFilter={setMethodFilter}
          purposeFilter={purposeFilter}
          setPurposeFilter={setPurposeFilter}
          categories={categories}
          stats={stats}
          loading={loading}
          isRefreshing={isRefreshing}
          onRefresh={handleManualRefresh}
          onOpenFlowConfig={() => setIsApprovalFlowOpen(true)}
          onOpenCategoryConfig={() => setIsConfigOpen(true)}
          onExportExcel={handleExportSalary}
          onOpenCreate={handleOpenCreate}
          onResetFilters={handleResetFilters}
          tableContainerRef={tableContainerRef}
          actionBarRef={actionBarRef}
        />

        <ExpenseMainTable
          loading={loading}
          actionLoadingId={actionLoadingId}
          filteredExpenses={filteredExpenses}
          pagedExpenses={pagedExpenses}
          currentPage={currentPage}
          pageSize={pageSize}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setCurrentPage(1);
          }}
          onResetFilters={handleResetFilters}
          onOpenDetail={handleOpenDetail}
          onOpenEdit={handleOpenEdit}
          onOpenApproval={handleOpenApproval}
          onRecallApproval={handleRecallApproval}
          onDeleteExpense={handleDeleteExpense}
          onPreviewImage={setPreviewImageUrl}
          isMirrorHeaderVisible={isMirrorHeaderVisible}
          mirrorHeaderRef={mirrorHeaderRef}
          tableContainerRef={tableContainerRef}
          realTableRef={realTableRef}
          realTheadRef={realTheadRef}
          tableHeadSentinelRef={tableHeadSentinelRef}
          colWidths={colWidths}
          realTableWidth={realTableWidth}
          handleTableScroll={handleTableScroll}
        />
      </Card>

      {/* 1. 查看核销单明细弹窗 */}
      <ExpenseDetailModal
        open={isDetailOpen && !!activeExpense}
        activeExpense={activeExpense}
        approvalFlowConfig={approvalFlowConfig}
        onClose={() => setIsDetailOpen(false)}
        onOpenApproval={handleOpenApproval}
        onRecallApproval={handleRecallApproval}
        onPreviewImage={setPreviewImageUrl}
      />

      {/* 2. 新建/编辑费用核销单弹窗 */}
      <ExpenseFormModal
        open={isFormOpen}
        editingExpense={editingExpense}
        employees={employees}
        categories={categories}
        onClose={() => setIsFormOpen(false)}
        onSave={handleSaveExpense}
        addToast={addToast}
      />

      {/* 3. 审批费用控制弹窗 */}
      <ExpenseApproveModal
        open={isApproveOpen && !!activeExpense}
        activeExpense={activeExpense}
        employees={employees}
        onClose={() => setIsApproveOpen(false)}
        onConfirm={handleSaveApproval}
      />

      {/* 4. 确认删除报销单二次确认弹窗 */}
      <ExpenseDeleteConfirmModal
        open={isDeleteConfirmOpen && !!expenseToDelete}
        expenseToDelete={expenseToDelete}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={confirmDeleteExpense}
      />

      {/* 5. 费用类型配置弹窗 */}
      <ExpenseCategoryModal
        open={isConfigOpen}
        categories={categories}
        expenses={expenses}
        onClose={() => setIsConfigOpen(false)}
        onAddCategory={handleAddCategory}
        onUpdateCategory={handleUpdateCategory}
        onDeleteCategory={handleDeleteCategory}
      />

      {/* 6. 图片放大查看灯箱 Modal */}
      <ExpenseReceiptPreviewModal
        previewImageUrl={previewImageUrl}
        onClose={() => setPreviewImageUrl(null)}
      />

      {/* 7. 审核流程配置 Modal */}
      <ApprovalFlowConfigModal
        open={isApprovalFlowOpen}
        approvalFlowConfig={approvalFlowConfig}
        newPayoutStepName={newPayoutStepName}
        setNewPayoutStepName={setNewPayoutStepName}
        newIncomeStepName={newIncomeStepName}
        setNewIncomeStepName={setNewIncomeStepName}
        editingStepType={editingStepType}
        editingStepIndex={editingStepIndex}
        editingStepValue={editingStepValue}
        setEditingStepValue={setEditingStepValue}
        onClose={() => setIsApprovalFlowOpen(false)}
        onAddStep={handleAddStep}
        onDeleteStep={handleDeleteStep}
        onMoveStep={handleMoveStep}
        onStartEditStep={handleStartEditStep}
        onSaveEditStep={handleSaveEditStep}
        onToggleFlow={handleToggleFlow}
      />
    </div>
  );
}
export default ExpenseManager;
