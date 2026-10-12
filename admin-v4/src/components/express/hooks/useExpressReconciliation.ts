import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { Customer } from "../../../types";
import {
  ShipmentRecord,
  JntRecord,
  CustomerSurcharge,
  ExpressSubTab,
  ExpressViewMode,
  MatchKeyOption,
  ExpressStatusFilter,
  ExpressActiveDrawer,
  ExpressImportLog,
  ReconciledItem
} from "../types";
import { DEFAULT_SURCHARGES, getDefaultWarehouseCurrency, getCurrencyInfo } from "../constants";
import {
  loadExpressSurcharges,
  saveExpressSurcharges,
  fetchImportLogs,
  createImportLog,
  removeImportLog
} from "../utils/expressApi";
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
  getOrderNoFromRecord,
  transformReconciledItems
} from "../utils/reconciliation";
import {
  exportFullCsv,
  exportCustomerBillCsv,
  exportDiscrepancyCsv
} from "../utils/exportCsv";

export function useExpressReconciliation(params: {
  customers: Customer[];
  addToast: (msg: string, kind?: "success" | "error" | "info") => void;
  lang: string;
  warehouseCode?: string;
  warehouseCurrency?: string;
}) {
  const { customers, addToast, warehouseCode, warehouseCurrency } = params;

  // 默认根据当前仓库国家获取基准货币（例如 TH -> THB, CN -> CNY）
  const defaultWarehouseCurrency = useMemo(() => {
    if (warehouseCurrency) return warehouseCurrency;
    return getDefaultWarehouseCurrency(warehouseCode);
  }, [warehouseCode, warehouseCurrency]);

  // ==========================================
  // 1. ALL useState Declarations (Strictly First)
  // ==========================================
  const [systemPastedText, setSystemPastedText] = useState<string>("");
  const [jntPastedText, setJntPastedText] = useState<string>("");
  const [systemFileName, setSystemFileName] = useState<string>("");
  const [jntFileName, setJntFileName] = useState<string>("");

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
  const [activeDrawer, setActiveDrawer] = useState<ExpressActiveDrawer>("none");
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isSurchargeListOpen, setIsSurchargeListOpen] = useState(false);

  const [surcharges, setSurcharges] = useState<Record<string, CustomerSurcharge>>(() => {
    try {
      const inited = localStorage.getItem("wms_express_surcharges_inited");
      const saved = localStorage.getItem("wms_express_surcharges");
      if (inited && saved !== null) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === "object") {
          // 清理旧的默认 4 家写死假数据
          const legacyKeys = ["บริษัท ชัวแมกซ์ จำกัด", "上海凯信国际贸易商社", "香港盛天数码供应链", "泰国正大商贸分销有限公司"];
          const currentKeys = Object.keys(parsed);
          const isExactLegacyMock =
            currentKeys.length === 4 && currentKeys.every((k) => legacyKeys.includes(k));
          if (isExactLegacyMock) {
            localStorage.setItem("wms_express_surcharges", JSON.stringify({}));
            return {};
          }
          return parsed;
        }
      }
    } catch (e) {
      console.error("Failed to load express surcharges:", e);
    }
    return {};
  });

  const [isSurchargeModalOpen, setIsSurchargeModalOpen] = useState(false);
  const [editingSurcharge, setEditingSurcharge] = useState<{
    customerName: string;
    type: "piece" | "flat";
    amount: number;
  }>({ customerName: "", type: "piece", amount: 0 });

  const [expandedCustomers, setExpandedCustomers] = useState<Record<string, boolean>>({});
  const [customerDetailsSearch, setCustomerDetailsSearch] = useState<Record<string, string>>({});

  const [importLogs, setImportLogs] = useState<ExpressImportLog[]>([]);
  const [isImportLogsOpen, setIsImportLogsOpen] = useState(false);
  const [activeLogSnapshot, setActiveLogSnapshot] = useState<ExpressImportLog | null>(null);

  // 客户级专属结算货币设置映射表 (未单独设置的客户默认当前仓库国家货币)
  const [customerCurrencies, setCustomerCurrencies] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem("wms_express_customer_currencies");
      if (saved) return JSON.parse(saved);
    } catch {}
    return {};
  });
  const [editingCustomerForCurrency, setEditingCustomerForCurrency] = useState<string | null>(null);
  const [isCurrencyModalOpen, setIsCurrencyModalOpen] = useState(false);

  // ==========================================
  // 2. ALL useEffect Hooks (Strictly Second)
  // ==========================================
  const isLoadedFromRemote = useRef(false);

  useEffect(() => {
    let isMounted = true;
    loadExpressSurcharges().then((data) => {
      if (isMounted && data && typeof data === "object") {
        isLoadedFromRemote.current = true;
        setSurcharges(data);
      }
    });

    fetchImportLogs().then((logs) => {
      if (isMounted && Array.isArray(logs)) {
        setImportLogs(logs);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

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
    setIsImportModalOpen((prev) => !prev);
  }, []);

  const toggleSurchargeDrawer = useCallback(() => {
    setIsSurchargeListOpen((prev) => !prev);
  }, []);

  const openSurchargeModalWithData = useCallback((initialData?: CustomerSurcharge | string) => {
    if (typeof initialData === "string") {
      const existing = surcharges[initialData];
      if (existing) {
        setEditingSurcharge({
          customerName: existing.customerName,
          type: existing.type,
          amount: existing.amount,
          currency: existing.currency
        });
      } else {
        setEditingSurcharge({ customerName: initialData, type: "piece", amount: 5 });
      }
    } else if (initialData) {
      setEditingSurcharge({
        customerName: initialData.customerName,
        type: initialData.type,
        amount: initialData.amount,
        currency: initialData.currency
      });
    } else {
      setEditingSurcharge({ customerName: "", type: "piece", amount: 5 });
    }
    setIsSurchargeModalOpen(true);
  }, [surcharges]);

  const handleSaveSurcharge = useCallback(
    (item: {
      customerName: string;
      originalCustomerName?: string;
      type: "piece" | "flat";
      amount: number;
      currency?: string;
    }) => {
      const cleanName = item.customerName.trim();
      if (!cleanName) {
        addToast("客户名称不能为空", "error");
        return;
      }
      setSurcharges((prev) => {
        const next = { ...prev };
        if (item.originalCustomerName && item.originalCustomerName !== cleanName) {
          delete next[item.originalCustomerName];
        }
        next[cleanName] = {
          customerName: cleanName,
          type: item.type,
          amount: Math.max(0, item.amount),
          currency: item.currency || next[cleanName]?.currency
        };
        saveExpressSurcharges(next);
        return next;
      });
      setIsSurchargeModalOpen(false);
      addToast(`已成功保存客户【${cleanName}】的操作费规则！`, "success");
    },
    [addToast]
  );

  const handleDeleteSurcharge = useCallback(
    (name: string) => {
      setSurcharges((prev) => {
        const next = { ...prev };
        delete next[name];
        saveExpressSurcharges(next);
        return next;
      });
      addToast(`已删除客户【${name}】的操作费设置`, "info");
    },
    [addToast]
  );



  const parseSystemData = useCallback(
    (text: string, silent = false, sourceName = "剪贴板发货单") => {
      setActiveLogSnapshot(null);
      const { records, headers } = parseSystemDataText(text);
      setSystemRecords(records);
      setSystemFileName(sourceName);
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
    (text: string, silent = false, sourceName = "剪贴板J&T账单") => {
      setActiveLogSnapshot(null);
      const { records, headers } = parseJntDataText(text);
      setJntRecords(records);
      setJntFileName(sourceName);
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
      setActiveLogSnapshot(null);
      try {
        const result = await parseUploadedFile(file, target);
        if (target === "system") {
          setSystemFileName(file.name);
          setSystemPastedText(result.previewText);
          setSystemRecords(result.records);
          if (result.headers.length > 0) {
            setSystemHeaders(result.headers);
          }
          addToast(`成功导入并解析了 ${result.records.length} 条系统发货记录！`, "success");
        } else {
          setJntFileName(file.name);
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

  // 核心功能：瞬间完整回显双表对账核算结果大屏（包含发货单与J&T账单全部核对指标）
  const handleRestoreImportLog = useCallback(
    (log: ExpressImportLog) => {
      if (!log) {
        addToast("未选定有效对账记录", "error");
        return;
      }

      if (!log.systemRawText && !log.jntRawText) {
        addToast("该批次无有效对账数据可供回显", "error");
        return;
      }

      try {
        let restoredSysRecords: ShipmentRecord[] = [];
        let restoredJntRecords: JntRecord[] = [];

        // 1. 恢复系统发货单数据 (仅恢复数据本身，不污染输入框与文件状态)
        if (Array.isArray(log.systemRecords) && log.systemRecords.length > 0) {
          restoredSysRecords = log.systemRecords;
          setSystemRecords(log.systemRecords);
          if (log.systemHeaders && log.systemHeaders.length > 0) setSystemHeaders(log.systemHeaders);
        } else if (log.systemRawText) {
          const sysResult = parseSystemDataText(log.systemRawText);
          restoredSysRecords = sysResult.records;
          setSystemRecords(sysResult.records);
          setSystemHeaders(log.systemHeaders && log.systemHeaders.length > 0 ? log.systemHeaders : sysResult.headers);
        } else {
          setSystemRecords([]);
          setSystemHeaders([]);
        }

        // 2. 恢复 J&T 官方账单数据 (仅恢复数据本身，不污染输入框与文件状态)
        if (Array.isArray(log.jntRecords) && log.jntRecords.length > 0) {
          restoredJntRecords = log.jntRecords;
          setJntRecords(log.jntRecords);
          if (log.jntHeaders && log.jntHeaders.length > 0) setJntHeaders(log.jntHeaders);
        } else if (log.jntRawText) {
          const jntResult = parseJntDataText(log.jntRawText);
          restoredJntRecords = jntResult.records;
          setJntRecords(jntResult.records);
          setJntHeaders(log.jntHeaders && log.jntHeaders.length > 0 ? log.jntHeaders : jntResult.headers);
        } else {
          setJntRecords([]);
          setJntHeaders([]);
        }

        if (log.matchKeyOption) setMatchKeyOption(log.matchKeyOption);
        if (log.systemAltKey) setSystemAltKey(log.systemAltKey);
        if (log.jntAltKey) setJntAltKey(log.jntAltKey);

        // 锁定防重复归档指纹，避免回显后把同一批次再次归档一次
        const sumFee = restoredJntRecords.reduce((acc, r) => acc + (r.jntFee || 0), 0);
        lastArchivedFingerprint.current = `${restoredSysRecords.length}-${restoredJntRecords.length}-${log.matchedCount}-${sumFee}`;

        // 3. 导入弹窗保持关闭，直达汇总大屏，标记当前回显快照
        setIsImportModalOpen(false);
        setActiveDrawer("none");
        setActiveSubTab("summary");
        setActiveLogSnapshot(log);
        setIsImportLogsOpen(false);
        addToast(`已成功回显批次【${log.batchNo}】的双表对账核算大屏！`, "success");
      } catch (err: any) {
        console.error("回显对账批次异常:", err);
        addToast(`回显对账记录失败: ${err?.message || "数据格式不兼容"}`, "error");
      }
    },
    [addToast]
  );

  // 退出历史结果回显模式并清空当前展示数据
  const handleExitSnapshot = useCallback(() => {
    setActiveLogSnapshot(null);
    setSystemRecords([]);
    setJntRecords([]);
    setSystemHeaders([]);
    setJntHeaders([]);
    setSystemPastedText("");
    setJntPastedText("");
    setSystemFileName("");
    setJntFileName("");
    setExpandedCustomers({});
    setCustomerDetailsSearch({});
    lastArchivedFingerprint.current = "";
    addToast("已退出历史批次回显并清空当前展示数据", "info");
  }, [addToast]);

  // 删除某条导入历史记录
  const handleDeleteImportLog = useCallback(
    async (id: string): Promise<boolean> => {
      const ok = await removeImportLog(id);
      if (ok) {
        setImportLogs((prev) => (id === "clear-all" ? [] : prev.filter((l) => l.id !== id)));
        // 若删除的恰好是当前大屏正在回显的批次，安全退出回显状态，避免引用已失效批次
        setActiveLogSnapshot((curr) => {
          if (!curr) return null;
          if (id === "clear-all" || curr.id === id || curr.batchNo === id) {
            return null;
          }
          return curr;
        });
        addToast(id === "clear-all" ? "已清空所有导入记录" : "已成功删除该条导入记录", "info");
        return true;
      } else {
        addToast("删除记录失败，请检查网络", "error");
        return false;
      }
    },
    [addToast]
  );

  const clearAllData = useCallback(() => {
    setSystemPastedText("");
    setJntPastedText("");
    setSystemFileName("");
    setJntFileName("");
    setSystemRecords([]);
    setJntRecords([]);
    setSystemHeaders([]);
    setJntHeaders([]);
    setSystemAltKey("");
    setJntAltKey("");
    setExpandedCustomers({});
    setActiveLogSnapshot(null);
    lastArchivedFingerprint.current = "";
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

  // 打开某客户的专属货币转换弹窗
  const openCustomerCurrencyModal = useCallback((customerName: string) => {
    setEditingCustomerForCurrency(customerName);
    setIsCurrencyModalOpen(true);
  }, []);

  // 保存某客户的专属结算货币
  const handleSaveCustomerCurrency = useCallback((newCur: string, customerName?: string) => {
    const targetCust = customerName || editingCustomerForCurrency;
    if (!targetCust) return;
    setCustomerCurrencies((prev) => {
      const next = { ...prev, [targetCust]: newCur };
      try {
        localStorage.setItem("wms_express_customer_currencies", JSON.stringify(next));
      } catch {}
      return next;
    });
    const info = getCurrencyInfo(newCur);
    addToast(`已将客户【${targetCust}】的结算货币转换为：${info.flag} ${info.countryName} (${info.code} ${info.symbol})`, "success");
    setIsCurrencyModalOpen(false);
    setEditingCustomerForCurrency(null);
  }, [editingCustomerForCurrency, addToast]);

  // ==========================================
  // 4. ALL useMemo Hooks (Strictly Fourth)
  // ==========================================
  const reconciledData = useMemo(() => {
    let sourceData: ReconciledItem[] = [];
    if (activeLogSnapshot?.reconciledData && activeLogSnapshot.reconciledData.length > 0) {
      sourceData = activeLogSnapshot.reconciledData;
    } else {
      sourceData = reconcileExpressRecords({
        systemRecords,
        jntRecords,
        surcharges,
        matchKeyOption,
        systemAltKey,
        jntAltKey,
        customers,
        targetCurrency: defaultWarehouseCurrency
      });
    }
    // 强制执行按客户维度的汇率折算，未单独指定的客户默认仓库国家货币
    return transformReconciledItems(sourceData, customers, customerCurrencies, defaultWarehouseCurrency);
  }, [activeLogSnapshot, systemRecords, jntRecords, surcharges, matchKeyOption, systemAltKey, jntAltKey, customers, customerCurrencies, defaultWarehouseCurrency]);

  const customerSummary = useMemo(() => {
    return computeCustomerSummary(reconciledData, surcharges, customers, customerCurrencies, defaultWarehouseCurrency);
  }, [reconciledData, surcharges, customers, customerCurrencies, defaultWarehouseCurrency]);

  const stats = useMemo(() => {
    return computeReconciliationStats({
      systemCount: activeLogSnapshot?.systemCount ?? systemRecords.length,
      jntCount: activeLogSnapshot?.jntCount ?? jntRecords.length,
      reconciledData,
      customerSummary
    });
  }, [activeLogSnapshot, systemRecords.length, jntRecords.length, reconciledData, customerSummary]);

  // 核心机制：当双表（发货单 + J&T账单）都已导入并对账计算出结果后，自动沉淀双表核算记录
  const lastArchivedFingerprint = useRef<string>("");

  useEffect(() => {
    if (systemRecords.length > 0 && jntRecords.length > 0 && stats && !activeLogSnapshot) {
      const fingerprint = `${systemRecords.length}-${jntRecords.length}-${stats.matchedCount}-${stats.totalExpressFee}`;
      if (lastArchivedFingerprint.current === fingerprint) return;
      lastArchivedFingerprint.current = fingerprint;

      const id = `REC-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, "0");
      const timeStr = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
      const batchNo = `REC-${timeStr}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;

      const logRecord: ExpressImportLog = {
        id,
        batchNo,
        createdAt: now.toISOString(),
        systemFileName: systemFileName || "系统发货单",
        systemCount: systemRecords.length,
        jntFileName: jntFileName || "J&T官方账单",
        jntCount: jntRecords.length,
        jntTotalFee: stats.totalExpressFee,
        matchedCount: stats.matchedCount,
        discrepancyCount: stats.systemOnlyCount + stats.jntOnlyCount,
        totalSurcharge: customerSummary.reduce((acc, c) => acc + c.totalSurcharge, 0),
        finalTotalPayable: stats.totalPayable,
        systemRawText: systemPastedText,
        jntRawText: jntPastedText,
        systemHeaders,
        jntHeaders,
        matchKeyOption,
        systemAltKey,
        jntAltKey,
        reconciledData,
        customerSummary,
        stats,
        systemRecords,
        jntRecords
      };

      setImportLogs((prev) => [logRecord, ...prev.filter((l) => l.id !== id)].slice(0, 100));
      createImportLog(logRecord).then((saved) => {
        if (saved) {
          setImportLogs((prev) => [saved, ...prev.filter((l) => l.id !== saved.id && l.id !== id)].slice(0, 100));
        }
      });
    }
  }, [
    systemRecords.length,
    jntRecords.length,
    stats,
    activeLogSnapshot,
    systemFileName,
    jntFileName,
    systemPastedText,
    jntPastedText,
    systemHeaders,
    jntHeaders,
    matchKeyOption,
    systemAltKey,
    jntAltKey,
    customerSummary
  ]);

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
    customers.forEach((c) => {
      if (c && c.name && c.name.trim()) set.add(c.name.trim());
    });
    reconciledData.forEach((r) => {
      if (r && r.customerName && r.customerName.trim() && !r.customerName.includes("未关联发货商")) {
        set.add(r.customerName.trim());
      }
    });
    return Array.from(set).filter(Boolean);
  }, [customers, reconciledData]);

  const refreshData = useCallback(() => {
    addToast("已重新核算并刷新对账看板！", "success");
  }, [addToast]);

  const handleExportFullCsv = useCallback(() => {
    exportFullCsv(reconciledData, customers, addToast);
  }, [reconciledData, customers, addToast]);

  const handleExportDiscrepancyCsv = useCallback(() => {
    exportDiscrepancyCsv(discrepancyRecords, customers, addToast, defaultWarehouseCurrency);
  }, [discrepancyRecords, customers, addToast, defaultWarehouseCurrency]);

  const handleExportCustomerBillCsv = useCallback(
    (customerName: string) => {
      const targetSum = customerSummary.find((c) => c.customerName === customerName);
      const surCur = targetSum?.surchargeCurrency || (customerCurrencies && customerCurrencies[customerName]) || defaultWarehouseCurrency;
      exportCustomerBillCsv({ customerName, customerSummary, customers, addToast, surchargeCurrency: surCur });
    },
    [customerSummary, customers, addToast, customerCurrencies, defaultWarehouseCurrency]
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
    isImportModalOpen,
    setIsImportModalOpen,
    isSurchargeListOpen,
    setIsSurchargeListOpen,
    surcharges,
    isSurchargeModalOpen,
    setIsSurchargeModalOpen,
    editingSurcharge,
    expandedCustomers,
    customerDetailsSearch,
    setCustomerDetailsSearch,
    importLogs,
    isImportLogsOpen,
    setIsImportLogsOpen,
    activeLogSnapshot,

    // Customer-Specific Currency Configuration
    customerCurrencies,
    editingCustomerForCurrency,
    defaultWarehouseCurrency,
    isCurrencyModalOpen,
    setIsCurrencyModalOpen,
    openCustomerCurrencyModal,
    handleSaveCustomerCurrency,

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
    clearAllData,
    handleSaveSurcharge,
    handleDeleteSurcharge,
    handleExportFullCsv,
    handleExportDiscrepancyCsv,
    handleExportCustomerBillCsv,
    toggleCustomerExpand,
    handleCustomerDetailSearch,
    handleRestoreImportLog,
    handleDeleteImportLog,
    handleExitSnapshot,
    refreshData
  };
}
