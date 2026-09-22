import { useState, useMemo, useEffect, useCallback } from "react";
import { Customer } from "../../../types";
import {
  ShipmentRecord,
  JntRecord,
  CustomerSurcharge,
  ExpressSubTab,
  ExpressViewMode,
  MatchKeyOption,
  ExpressStatusFilter,
  ExpressActiveDrawer
} from "../types";
import {
  DEFAULT_SURCHARGES,
  DEMO_SYSTEM_DATA,
  DEMO_JNT_DATA,
  COMMON_CUSTOMER_NAMES
} from "../constants";
import {
  parseSystemDataText,
  parseJntDataText,
  parseUploadedFile,
  readUploadedFileAsText
} from "../utils/parsers";
import {
  reconcileExpressRecords,
  computeCustomerSummary,
  computeReconciliationStats,
  getOrderNoFromRecord
} from "../utils/reconciliation";
import { exportFullCsv, exportCustomerBillCsv } from "../utils/exportCsv";

export function useExpressReconciliation(params: {
  customers: Customer[];
  addToast: (msg: string, kind?: "success" | "error" | "info") => void;
  lang: string;
}) {
  const { customers, addToast } = params;

  // ==========================================
  // 1. ALL useState Declarations (Strictly First)
  // ==========================================
  const [systemPastedText, setSystemPastedText] = useState<string>("");
  const [jntPastedText, setJntPastedText] = useState<string>("");

  const [systemRecords, setSystemRecords] = useState<ShipmentRecord[]>([]);
  const [jntRecords, setJntRecords] = useState<JntRecord[]>([]);
  const [systemHeaders, setSystemHeaders] = useState<string[]>([]);
  const [jntHeaders, setJntHeaders] = useState<string[]>([]);

  const [matchKeyOption, setMatchKeyOption] = useState<MatchKeyOption>("waybill_and_alt");
  const [systemAltKey, setSystemAltKey] = useState<string>("");
  const [jntAltKey, setJntAltKey] = useState<string>("");

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<ExpressStatusFilter>("all");
  const [customerFilter, setCustomerFilter] = useState<string>("all");

  const [activeSubTab, setActiveSubTab] = useState<ExpressSubTab>("summary");
  const [viewMode, setViewMode] = useState<ExpressViewMode>("jnt");
  const [activeDrawer, setActiveDrawer] = useState<ExpressActiveDrawer>("import");

  const [surcharges, setSurcharges] = useState<Record<string, CustomerSurcharge>>(() => {
    try {
      const saved = localStorage.getItem("wms_express_surcharges");
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error("Failed to load express surcharges:", e);
    }
    return DEFAULT_SURCHARGES;
  });

  const [isSurchargeModalOpen, setIsSurchargeModalOpen] = useState(false);
  const [editingSurcharge, setEditingSurcharge] = useState<{
    customerName: string;
    type: "piece" | "flat";
    amount: number;
  }>({ customerName: "", type: "piece", amount: 0 });

  const [expandedCustomers, setExpandedCustomers] = useState<Record<string, boolean>>({});
  const [customerDetailsSearch, setCustomerDetailsSearch] = useState<Record<string, string>>({});

  // ==========================================
  // 2. ALL useEffect Hooks (Strictly Second)
  // ==========================================
  useEffect(() => {
    try {
      localStorage.setItem("wms_express_surcharges", JSON.stringify(surcharges));
    } catch (e) {
      console.error("Failed to save express surcharges:", e);
    }
  }, [surcharges]);

  useEffect(() => {
    if (systemHeaders.length > 0 && !systemAltKey) {
      const found = systemHeaders.find(
        (h) =>
          h.includes("平台订单号") ||
          h.includes("订单号") ||
          h.includes("ERP包裹号") ||
          h.includes("包裹号") ||
          h.toLowerCase().includes("order") ||
          h.toLowerCase().includes("ref")
      );
      if (found) {
        setSystemAltKey(found);
      } else {
        const notWaybill = systemHeaders.find((h) => !h.includes("运单号") && !h.includes("运单"));
        setSystemAltKey(notWaybill || systemHeaders[0]);
      }
    }
  }, [systemHeaders, systemAltKey]);

  useEffect(() => {
    if (jntHeaders.length > 0 && !jntAltKey) {
      const found = jntHeaders.find(
        (h) =>
          h.includes("订单来源") ||
          h.includes("商家编码") ||
          h.includes("客户编码") ||
          h.toLowerCase().includes("order") ||
          h.toLowerCase().includes("ref")
      );
      if (found) {
        setJntAltKey(found);
      } else {
        const notWaybill = jntHeaders.find((h) => !h.includes("运单编号") && !h.includes("运单号"));
        setJntAltKey(notWaybill || jntHeaders[0]);
      }
    }
  }, [jntHeaders, jntAltKey]);

  // ==========================================
  // 3. ALL useCallback Hooks (Actions & Callbacks)
  // ==========================================
  const toggleImportDrawer = useCallback(() => {
    setActiveDrawer((prev) => (prev === "import" ? "none" : "import"));
  }, []);

  const toggleSurchargeDrawer = useCallback(() => {
    setActiveDrawer((prev) => (prev === "surcharge" ? "none" : "surcharge"));
  }, []);

  const openSurchargeModalWithData = useCallback((initialData?: CustomerSurcharge) => {
    if (initialData) {
      setEditingSurcharge({
        customerName: initialData.customerName,
        type: initialData.type,
        amount: initialData.amount
      });
    } else {
      setEditingSurcharge({ customerName: "", type: "piece", amount: 5 });
    }
    setIsSurchargeModalOpen(true);
  }, []);

  const handleSaveSurcharge = useCallback(
    (item: { customerName: string; type: "piece" | "flat"; amount: number }) => {
      if (!item.customerName.trim()) {
        addToast("客户名称不能为空", "error");
        return;
      }
      setSurcharges((prev) => ({
        ...prev,
        [item.customerName]: {
          customerName: item.customerName,
          type: item.type,
          amount: item.amount
        }
      }));
      setIsSurchargeModalOpen(false);
      addToast(`已成功保存客户【${item.customerName}】的操作费规则！`, "success");
    },
    [addToast]
  );

  const handleDeleteSurcharge = useCallback(
    (name: string) => {
      setSurcharges((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
      addToast(`已删除客户【${name}】的操作费设置`, "info");
    },
    [addToast]
  );

  const parseSystemData = useCallback(
    (text: string, silent = false) => {
      const { records, headers } = parseSystemDataText(text);
      setSystemRecords(records);
      if (headers.length > 0) {
        setSystemHeaders(headers);
      }
      if (!silent) {
        addToast(`成功导入并解析了 ${records.length} 条系统发货记录！`, "success");
      }
    },
    [addToast]
  );

  const parseJntData = useCallback(
    (text: string, silent = false) => {
      const { records, headers } = parseJntDataText(text);
      setJntRecords(records);
      if (headers.length > 0) {
        setJntHeaders(headers);
      }
      if (!silent) {
        addToast(`成功导入并解析了 ${records.length} 条J&T官方对账记录！`, "success");
      }
    },
    [addToast]
  );

  const handleFileUpload = useCallback(
    async (file: File, target: "system" | "jnt") => {
      try {
        const result = await parseUploadedFile(file, target);
        if (target === "system") {
          setSystemPastedText(result.previewText);
          setSystemRecords(result.records);
          if (result.headers.length > 0) {
            setSystemHeaders(result.headers);
          }
          addToast(`成功导入并解析了 ${result.records.length} 条系统发货记录！`, "success");
        } else {
          setJntPastedText(result.previewText);
          setJntRecords(result.records);
          if (result.headers.length > 0) {
            setJntHeaders(result.headers);
          }
          addToast(`成功导入并解析了 ${result.records.length} 条J&T官方对账记录！`, "success");
        }
      } catch (err: any) {
        console.error("File upload error:", err);
        addToast(`解析文件失败: ${err?.message || "请检查文件格式是否有效"}`, "error");
      }
    },
    [addToast]
  );

  const loadDemoData = useCallback(() => {
    setSystemPastedText(DEMO_SYSTEM_DATA);
    setJntPastedText(DEMO_JNT_DATA);
    parseSystemData(DEMO_SYSTEM_DATA, true);
    parseJntData(DEMO_JNT_DATA, true);
    addToast("已成功加载演示对账数据集！", "success");
  }, [parseSystemData, parseJntData, addToast]);

  const clearAllData = useCallback(() => {
    setSystemPastedText("");
    setJntPastedText("");
    setSystemRecords([]);
    setJntRecords([]);
    setSystemHeaders([]);
    setJntHeaders([]);
    setSystemAltKey("");
    setJntAltKey("");
    setExpandedCustomers({});
    setActiveDrawer("import");
    addToast("已成功清空所有导入的运单与账单数据", "info");
  }, [addToast]);

  const toggleCustomerExpand = useCallback((customerName: string) => {
    setExpandedCustomers((prev) => ({
      ...prev,
      [customerName]: !prev[customerName]
    }));
  }, []);

  const handleCustomerDetailSearch = useCallback((customerName: string, query: string) => {
    setCustomerDetailsSearch((prev) => ({
      ...prev,
      [customerName]: query
    }));
  }, []);

  // ==========================================
  // 4. ALL useMemo Hooks (Strictly Fourth)
  // ==========================================
  const reconciledData = useMemo(() => {
    return reconcileExpressRecords({
      systemRecords,
      jntRecords,
      surcharges,
      matchKeyOption,
      systemAltKey,
      jntAltKey
    });
  }, [systemRecords, jntRecords, surcharges, matchKeyOption, systemAltKey, jntAltKey]);

  const customerSummary = useMemo(() => {
    return computeCustomerSummary(reconciledData, surcharges, customers);
  }, [reconciledData, surcharges, customers]);

  const stats = useMemo(() => {
    return computeReconciliationStats({
      systemCount: systemRecords.length,
      jntCount: jntRecords.length,
      reconciledData,
      customerSummary
    });
  }, [systemRecords.length, jntRecords.length, reconciledData, customerSummary]);

  const discrepancyRecords = useMemo(() => {
    return reconciledData.filter((r) => r.status !== "matched");
  }, [reconciledData]);

  const filteredRecords = useMemo(() => {
    return reconciledData.filter((rec) => {
      if (statusFilter !== "all" && rec.status !== statusFilter) return false;
      if (customerFilter !== "all" && rec.customerName !== customerFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const orderNo = getOrderNoFromRecord(rec, systemAltKey, jntAltKey).toLowerCase();
        const waybill = rec.waybillNo.toLowerCase();
        const cust = rec.customerName.toLowerCase();
        const recipient = rec.recipientName.toLowerCase();
        const phone = rec.recipientPhone.toLowerCase();

        return (
          waybill.includes(q) ||
          cust.includes(q) ||
          recipient.includes(q) ||
          phone.includes(q) ||
          orderNo.includes(q)
        );
      }
      return true;
    });
  }, [reconciledData, statusFilter, customerFilter, searchQuery, systemAltKey, jntAltKey]);

  const uniqueCustomerNames = useMemo(() => {
    const set = new Set<string>();
    customers.forEach((c) => set.add(c.name));
    COMMON_CUSTOMER_NAMES.forEach((name) => set.add(name));
    reconciledData.forEach((r) => set.add(r.customerName));
    return Array.from(set).filter(Boolean);
  }, [customers, reconciledData]);

  const handleExportFullCsv = useCallback(() => {
    exportFullCsv(reconciledData, addToast);
  }, [reconciledData, addToast]);

  const handleExportCustomerBillCsv = useCallback(
    (customerName: string) => {
      exportCustomerBillCsv({ customerName, customerSummary, customers, addToast });
    },
    [customerSummary, customers, addToast]
  );

  return {
    // States
    systemPastedText,
    setSystemPastedText,
    jntPastedText,
    setJntPastedText,
    systemRecords,
    jntRecords,
    systemHeaders,
    jntHeaders,
    matchKeyOption,
    setMatchKeyOption,
    systemAltKey,
    setSystemAltKey,
    jntAltKey,
    setJntAltKey,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    customerFilter,
    setCustomerFilter,
    activeSubTab,
    setActiveSubTab,
    viewMode,
    setViewMode,
    activeDrawer,
    setActiveDrawer,
    surcharges,
    isSurchargeModalOpen,
    setIsSurchargeModalOpen,
    editingSurcharge,
    expandedCustomers,
    customerDetailsSearch,
    setCustomerDetailsSearch,

    // Computed
    reconciledData,
    customerSummary,
    stats,
    discrepancyRecords,
    filteredRecords,
    uniqueCustomerNames,

    // Actions
    toggleImportDrawer,
    toggleSurchargeDrawer,
    openSurchargeModalWithData,
    parseSystemData,
    parseJntData,
    handleFileUpload,
    loadDemoData,
    clearAllData,
    handleSaveSurcharge,
    handleDeleteSurcharge,
    handleExportFullCsv,
    handleExportCustomerBillCsv,
    toggleCustomerExpand,
    handleCustomerDetailSearch
  };
}
