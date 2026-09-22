import React, { useRef } from "react";
import { Customer } from "../types";
import { ExpressManagerProps } from "./express/types";
import { useExpressReconciliation } from "./express/hooks/useExpressReconciliation";
import { ExpressToolbar } from "./express/components/ExpressToolbar";
import { ExpressImportDrawer } from "./express/components/ExpressImportDrawer";
import { ExpressSurchargeList } from "./express/components/ExpressSurchargeList";
import { ExpressStatsBar } from "./express/components/ExpressStatsBar";
import { ExpressSummaryTab } from "./express/components/ExpressSummaryTab";
import { ExpressDetailsTab } from "./express/components/ExpressDetailsTab";
import { ExpressDiscrepancyTab } from "./express/components/ExpressDiscrepancyTab";
import { ExpressSurchargeModal } from "./express/components/ExpressSurchargeModal";

// Re-export types and utilities for full backwards compatibility
export * from "./express/types";
export { sanitizeWaybillNo, splitCells, resolveHeaderIndexes } from "./express/utils/parsers";

export function ExpressManager({ customers, addToast, lang }: ExpressManagerProps) {
  const tableContainerRef = useRef<HTMLDivElement>(null);

  const recon = useExpressReconciliation({
    customers,
    addToast,
    lang
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
        onLoadDemoData={recon.loadDemoData}
        onExportCsv={recon.handleExportFullCsv}
        onClearData={recon.clearAllData}
        hasData={recon.reconciledData.length > 0}
        summaryCustomerCount={recon.customerSummary.length}
        totalFilteredCount={recon.filteredRecords.length}
        discrepancyCount={recon.discrepancyRecords.length}
        tableContainerRef={tableContainerRef}
      />

      {/* 互斥面板 1: 数据导入抽屉 (默认打开，与客户操作列表互斥) */}
      {recon.activeDrawer === "import" && (
        <ExpressImportDrawer
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
      )}

      {/* 互斥面板 2: 客户操作费设置列表 (与导入区互斥，只能同时打开一个) */}
      {recon.activeDrawer === "surcharge" && (
        <ExpressSurchargeList
          surcharges={recon.surcharges}
          customers={customers}
          onOpenModal={(item) => recon.openSurchargeModalWithData(item)}
          onDeleteSurcharge={recon.handleDeleteSurcharge}
          onClose={() => recon.setActiveDrawer("none")}
        />
      )}

      {/* 6-Metric Financial Stats Bar */}
      {recon.reconciledData.length > 0 && <ExpressStatsBar stats={recon.stats} />}

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
          onLoadDemoData={recon.loadDemoData}
        />
      )}

      {/* Tab 2: Detailed Waybill Grid with Horizontal Scroller */}
      {recon.activeSubTab === "details" && (
        <ExpressDetailsTab
          records={recon.filteredRecords}
          viewMode={recon.viewMode}
          tableContainerRef={tableContainerRef}
          onLoadDemoData={recon.loadDemoData}
        />
      )}

      {/* Tab 3: Discrepancies Review & Diagnosis */}
      {recon.activeSubTab === "discrepancies" && (
        <ExpressDiscrepancyTab
          records={recon.reconciledData}
          systemAltKey={recon.systemAltKey}
          jntAltKey={recon.jntAltKey}
          onExportCsv={recon.handleExportFullCsv}
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
    </div>
  );
}
