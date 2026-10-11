import React, { useRef } from "react";
import { Button } from "./ui/button";
import { Customer } from "../types";
import { ExpressManagerProps } from "./express/types";
import { useExpressReconciliation } from "./express/hooks/useExpressReconciliation";
import { ExpressToolbar } from "./express/components/ExpressToolbar";
import { ExpressImportModal } from "./express/components/ExpressImportModal";
import { ExpressSurchargeList } from "./express/components/ExpressSurchargeList";
import { ExpressStatsBar } from "./express/components/ExpressStatsBar";
import { ExpressSummaryTab } from "./express/components/ExpressSummaryTab";
import { ExpressDetailsTab } from "./express/components/ExpressDetailsTab";
import { ExpressDiscrepancyTab } from "./express/components/ExpressDiscrepancyTab";
import { ExpressSurchargeModal } from "./express/components/ExpressSurchargeModal";
import { ExpressImportLogsModal } from "./express/components/ExpressImportLogsModal";
import { ExpressCurrencyModal } from "./express/components/ExpressCurrencyModal";

// Re-export types and utilities for full backwards compatibility
export * from "./express/types";
export { sanitizeWaybillNo, splitCells, resolveHeaderIndexes } from "./express/utils/parsers";

export function ExpressManager({
  customers,
  addToast,
  lang,
  warehouseCode,
  warehouseCurrency
}: ExpressManagerProps) {
  const tableContainerRef = useRef<HTMLDivElement>(null);

  const recon = useExpressReconciliation({
    customers,
    addToast,
    lang,
    warehouseCode,
    warehouseCurrency
  });

  return (
    <div className="space-y-4">
      {/* Two-Row Standard Toolbar */}
      <ExpressToolbar
        searchQuery={recon.searchQuery}
        onSearchChange={recon.setSearchQuery}
        activeSubTab={recon.activeSubTab}
        onSubTabChange={recon.setActiveSubTab}
        statusFilter={recon.statusFilter}
        onStatusFilterChange={recon.setStatusFilter}
        customerFilter={recon.customerFilter}
        onCustomerFilterChange={recon.setCustomerFilter}
        uniqueCustomers={recon.uniqueCustomerNames}
        viewMode={recon.viewMode}
        onViewModeChange={recon.setViewMode}
        activeDrawer={recon.activeDrawer}
        onToggleImport={recon.toggleImportDrawer}
        onToggleSurcharge={recon.toggleSurchargeDrawer}
        surchargeCount={Object.keys(recon.surcharges).length}
        onOpenImportLogs={() => recon.setIsImportLogsOpen(true)}
        importLogsCount={recon.importLogs.length}
        onExportCsv={recon.handleExportFullCsv}
        onRefresh={recon.refreshData}
        onClearData={recon.clearAllData}
        hasData={recon.reconciledData.length > 0}
        summaryCustomerCount={recon.customerSummary.length}
        totalFilteredCount={recon.filteredRecords.length}
        discrepancyCount={recon.discrepancyRecords.length}
        tableContainerRef={tableContainerRef}
      />

      {/* 历史核算结果回显横幅 (不污染输入区，纯结果看板呈现) */}
      {recon.activeLogSnapshot && (
        <div className="bg-blue-50/90 border border-blue-200 rounded-xl p-3 px-4 flex items-center justify-between gap-3 text-xs text-blue-900 shadow-2xs animate-in fade-in-50 duration-200">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="p-1 bg-blue-100 text-blue-700 rounded-md font-bold text-[11px]">
              历史批次回显中
            </span>
            <span>
              正在查看历史核算批次：
              <strong className="font-mono text-blue-950 font-bold ml-1">
                {recon.activeLogSnapshot.batchNo}
              </strong>
            </span>
            {recon.activeLogSnapshot.createdAt && (
              <span className="text-blue-500 font-mono text-[11px]">
                ({new Date(recon.activeLogSnapshot.createdAt).toLocaleString()})
              </span>
            )}
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={recon.handleExitSnapshot}
            className="h-6 px-2 text-xs font-semibold text-blue-700 hover:text-blue-900 hover:bg-blue-100/60 cursor-pointer shrink-0"
          >
            退出回显
          </Button>
        </div>
      )}

      {/* 数据导入弹窗 (点击工具栏「导入数据」时弹出，独立完成数据输入) */}
      <ExpressImportModal
        isOpen={recon.isImportModalOpen}
        onClose={() => recon.setIsImportModalOpen(false)}
        systemPastedText={recon.systemPastedText}
        setSystemPastedText={recon.setSystemPastedText}
        jntPastedText={recon.jntPastedText}
        setJntPastedText={recon.setJntPastedText}
        systemCount={recon.systemRecords.length}
        jntCount={recon.jntRecords.length}
        systemHeaders={recon.systemHeaders}
        jntHeaders={recon.jntHeaders}
        matchKeyOption={recon.matchKeyOption}
        setMatchKeyOption={recon.setMatchKeyOption}
        systemAltKey={recon.systemAltKey}
        setSystemAltKey={recon.setSystemAltKey}
        jntAltKey={recon.jntAltKey}
        setJntAltKey={recon.setJntAltKey}
        onParseSystem={(txt) => recon.parseSystemData(txt)}
        onParseJnt={(txt) => recon.parseJntData(txt)}
        onUploadFile={recon.handleFileUpload}
        addToast={addToast}
      />

      {/* 6-Metric Financial Stats Bar */}
      {recon.reconciledData.length > 0 && (
        <ExpressStatsBar stats={recon.stats} targetCurrency={recon.defaultWarehouseCurrency} />
      )}

      {/* Tab 1: Customer Billing Summary */}
      {recon.activeSubTab === "summary" && (
        <ExpressSummaryTab
          customerSummary={recon.customerSummary}
          customers={customers}
          expandedCustomers={recon.expandedCustomers}
          toggleCustomerExpand={recon.toggleCustomerExpand}
          customerDetailsSearch={recon.customerDetailsSearch}
          setCustomerDetailsSearch={recon.setCustomerDetailsSearch}
          systemAltKey={recon.systemAltKey}
          jntAltKey={recon.jntAltKey}
          onExportCustomerBill={recon.handleExportCustomerBillCsv}
          onOpenCustomerCurrencyModal={recon.openCustomerCurrencyModal}
        />
      )}

      {/* Tab 2: Detailed Waybill Grid with Horizontal Scroller */}
      {recon.activeSubTab === "details" && (
        <ExpressDetailsTab
          records={recon.filteredRecords}
          viewMode={recon.viewMode}
          tableContainerRef={tableContainerRef}
        />
      )}

      {/* Tab 3: Discrepancies Review & Diagnosis */}
      {recon.activeSubTab === "discrepancies" && (
        <ExpressDiscrepancyTab
          records={recon.reconciledData}
          systemAltKey={recon.systemAltKey}
          jntAltKey={recon.jntAltKey}
          onExportCsv={recon.handleExportDiscrepancyCsv}
        />
      )}

      {/* Customer Surcharge Setup Modal (Radix UI Dialog) */}
      <ExpressSurchargeModal
        isOpen={recon.isSurchargeModalOpen}
        onClose={() => recon.setIsSurchargeModalOpen(false)}
        surcharges={recon.surcharges}
        editingSurcharge={recon.editingSurcharge}
        onSaveSurcharge={recon.handleSaveSurcharge}
        onDeleteSurcharge={recon.handleDeleteSurcharge}
        customers={customers}
        uniqueCustomerNames={recon.uniqueCustomerNames}
      />

      {/* 客户操作费设置列表弹窗 (Dialog 模态弹窗) */}
      <ExpressSurchargeList
        isOpen={recon.isSurchargeListOpen}
        onClose={() => recon.setIsSurchargeListOpen(false)}
        surcharges={recon.surcharges}
        customers={customers}
        uniqueCustomerNames={recon.uniqueCustomerNames}
        onSaveSurcharge={recon.handleSaveSurcharge}
        onDeleteSurcharge={recon.handleDeleteSurcharge}
      />

      {/* Express Import Logs Modal */}
      <ExpressImportLogsModal
        isOpen={recon.isImportLogsOpen}
        onClose={() => recon.setIsImportLogsOpen(false)}
        logs={recon.importLogs}
        activeLogSnapshotId={recon.activeLogSnapshot?.id}
        onRestore={recon.handleRestoreImportLog}
        onDelete={recon.handleDeleteImportLog}
      />

      {/* 转换客户结算货币弹窗 (列表行级编辑独立折算，未单独指定则默认仓库国家货币) */}
      <ExpressCurrencyModal
        isOpen={recon.isCurrencyModalOpen}
        onClose={() => recon.setIsCurrencyModalOpen(false)}
        customerName={recon.editingCustomerForCurrency || undefined}
        currentCurrency={
          (recon.editingCustomerForCurrency && recon.customerCurrencies[recon.editingCustomerForCurrency]) ||
          recon.defaultWarehouseCurrency
        }
        defaultCurrency={recon.defaultWarehouseCurrency}
        onSaveCurrency={recon.handleSaveCustomerCurrency}
      />
    </div>
  );
}
