/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import {
  Plus, Search, Edit, Trash2, Eye, Download, Check, X, FileText,
  Calendar, Coins, Printer, ArrowLeft, AlertCircle, RefreshCw,
  CheckCircle, FileSignature, FileMinus, FileCheck, DollarSign,
  Upload, Image as ImageIcon, Building, UserCheck, ShieldCheck, ArrowRight,
  Move, ChevronDown, RotateCcw, Loader2
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Card } from "./ui/card";
import { DatePicker as UIDatePicker } from "./ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Label } from "./ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "./ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";
import { cn, formatCurrency, formatDate, getNowDateStr } from "../lib/utils";

import { Invoice, InvoiceItem, Customer, InvoiceManagerProps, InvoiceStatsData } from "./invoice/types";
import {
  getInvoiceTrans,
  getCleanInvoiceType,
  getInvoiceTypeLabel,
  getInvoiceTypeColor,
  getStatusTrans,
  getStatusColor,
  CUSTOMER_PRESETS,
  getCurrencyDisplayName,
} from "./invoice/constants";
import { printElement } from "./invoice/utils/printInvoice";
import { MonthPicker } from "./invoice/components/MonthPicker";
import { InvoiceDetailCard } from "./invoice/components/InvoiceDetailCard";
import { InvoiceFormWorkspace } from "./invoice/components/InvoiceFormWorkspace";
import { Pagination } from "./Pagination";
import { fetchInvoices, fetchInvoiceStats, createInvoice as apiCreateInvoice, updateInvoice as apiUpdateInvoice, deleteInvoice as apiDeleteInvoice } from "../lib/invoiceApi";
import { TableHorizontalScroller } from "./TableHorizontalScroller";
import { useStickyMirrorHeader } from "../lib/useStickyMirrorHeader";

interface DatePickerProps {
  value: string;
  onChange: (date: string) => void;
  lang?: string;
  placeholder?: string;
  className?: string;
}

const DatePicker: React.FC<DatePickerProps> = ({ value, onChange, placeholder, className }) => {
  return (
    <UIDatePicker
      value={value}
      onValueChange={onChange}
      placeholder={placeholder}
      className={className}
    />
  );
};

export function InvoiceManager({ customers, addToast, lang, warehouseCode = "TH" }: InvoiceManagerProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [stats, setStats] = useState<InvoiceStatsData | null>(null);

  // 统计指标数据加载
  const loadStats = useCallback(async () => {
    try {
      const data = await fetchInvoiceStats(warehouseCode);
      if (data) {
        setStats(data);
      }
    } catch (err: any) {
      console.error("Failed to load invoice stats:", err);
    }
  }, [warehouseCode]);

  // Invoices list state (默认初始为空列表，通过云端接口拉取当前租户真实发票数据)
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedKeyword, setDebouncedKeyword] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState("");

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Debounce search query (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedKeyword(searchQuery.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Dialog & Active view states
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // 真实云端数据拉取 (服务端真分页与防抖竞态防护)
  const abortControllerRef = useRef<AbortController | null>(null);

  const loadInvoices = useCallback(async (isManual = false) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);
    if (isManual) setIsRefreshing(true);
    try {
      const res = await fetchInvoices({
        page,
        pageSize,
        warehouseCode,
        status: statusFilter !== "all" ? statusFilter : undefined,
        invoiceType: typeFilter !== "all" ? typeFilter : undefined,
        keyword: debouncedKeyword || undefined,
        month: dateFilter || undefined,
        signal: controller.signal,
      });
      if (Array.isArray(res.items)) {
        setInvoices(res.items);
        setTotalCount(res.total ?? res.items.length);
      }
      if (isManual) {
        addToast(lang === "en" ? "Refreshed invoices list from cloud" : "发票列表已从云端实时刷新", "success");
      }
    } catch (err: any) {
      if (err.name === "AbortError") {
        return;
      }
      console.error("Failed to load invoices from API:", err);
      if (isManual) {
        addToast(err.message || "获取发票列表失败", "error");
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [page, pageSize, warehouseCode, statusFilter, typeFilter, debouncedKeyword, dateFilter, lang, addToast]);

  // 挂载及仓库切换时自动请求云端接口
  useEffect(() => {
    loadInvoices();
    loadStats();
  }, [loadInvoices, loadStats]);

  const handleManualRefresh = async () => {
    await Promise.all([loadInvoices(true), loadStats()]);
  };

  const handleDeleteInvoice = async (id: string) => {
    setDeletingId(id);
    try {
      await apiDeleteInvoice(id, warehouseCode);
      setInvoices((prev) => prev.filter((inv) => inv.id !== id));
      setTotalCount((prev) => Math.max(0, prev - 1));
      setDeleteConfirmId(null);
      addToast(getInvoiceTrans("toast_deleted", lang), "success");
      loadInvoices();
      loadStats();
    } catch (err: any) {
      console.error("Delete invoice failed:", err);
      addToast(err.message || "删除发票失败", "error");
    } finally {
      setDeletingId(null);
    }
  };

  // 状态统计与 Badge 计数
  const statusCounts = useMemo(() => {
    if (stats) {
      return {
        all: stats.totalInvoices ?? 0,
        pending: stats.pendingCount ?? 0,
        paid: stats.paidCount ?? 0,
        overdue: stats.overdueCount ?? 0,
        draft: stats.draftCount ?? 0,
      };
    }
    const counts = { all: invoices.length, pending: 0, paid: 0, overdue: 0, draft: 0 };
    for (const inv of invoices) {
      if (inv.status === "pending") counts.pending++;
      else if (inv.status === "paid") counts.paid++;
      else if (inv.status === "overdue") counts.overdue++;
      else if (inv.status === "draft") counts.draft++;
    }
    return counts;
  }, [stats, invoices]);

  // Reset page to 1 on filter changes
  useEffect(() => {
    setPage(1);
  }, [typeFilter, statusFilter, dateFilter]);

  // Table horizontal scroller ref
  const tableContainerRef = useRef<HTMLDivElement>(null);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  useEffect(() => {
    if (page > totalPages) {
      setPage(1);
    }
  }, [totalPages, page]);

  const {
    mirrorHeaderRef,
    realTableRef,
    realTheadRef,
    tableHeadSentinelRef,
    actionBarRef,
    isMirrorHeaderVisible,
    colWidths,
    realTableWidth,
    handleTableScroll,
  } = useStickyMirrorHeader({
    tableContainerRef,
    deps: [invoices, isRefreshing],
  });

  const handlePrintView = () => {
    printElement("invoice-view-card", `Invoice - ${viewInvoice?.invoiceNo || "PDF"}`);
  };

  // --- RESTORED INVOICE CREATE & EDIT MODULE STATE & LOGIC FROM ORIGINAL ---
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);

  // Form Field States
  const [formCustomerId, setFormCustomerId] = useState("");
  const [formInvoiceNo, setFormInvoiceNo] = useState("");
  const [formIssueDate, setFormIssueDate] = useState(() => getNowDateStr());
  const [formDueDate, setFormDueDate] = useState("");
  const [formInvoiceType, setFormInvoiceType] = useState<string>("增值税专用发票");
  const [formCopyText, setFormCopyText] = useState<string>("ต้นฉบับ / ORIGINAL");
  const [formTaxRate, setFormTaxRate] = useState<number>(6);
  const [formCurrency, setFormCurrency] = useState("CNY");
  const [formNote, setFormNote] = useState("");
  const [formStatus, setFormStatus] = useState<"draft" | "pending" | "paid" | "overdue" | "canceled">("draft");
  const [formItems, setFormItems] = useState<InvoiceItem[]>([]);

  // NEW Seller Form Fields
  const [formSellerName, setFormSellerName] = useState(() => localStorage.getItem("last_formSellerName") ?? "\u7269\u6d41\u4f9b\u5e94\u94fe\u6709\u9650\u516c\u53f8");
  const [formSellerTaxNo, setFormSellerTaxNo] = useState(() => localStorage.getItem("last_formSellerTaxNo") ?? "91310115MA1H7XW5XT");
  const [formSellerBankName, setFormSellerBankName] = useState(() => localStorage.getItem("last_formSellerBankName") ?? "中国建设银行上海浦东分行");
  const [formSellerBankAccount, setFormSellerBankAccount] = useState(() => localStorage.getItem("last_formSellerBankAccount") ?? "6217 0021 3004 5589 101");
  const [formSellerAddress, setFormSellerAddress] = useState(() => localStorage.getItem("last_formSellerAddress") ?? "上海市浦东新区张江高科园区博雅路455号");
  const [formSellerContact, setFormSellerContact] = useState(() => localStorage.getItem("last_formSellerContact") ?? "张经理");
  const [formSellerPhone, setFormSellerPhone] = useState(() => localStorage.getItem("last_formSellerPhone") ?? "+66 2 123 4567");
  const [formSellerLogo, setFormSellerLogo] = useState(() => localStorage.getItem("last_formSellerLogo") ?? "");
  const [formSellerSignature, setFormSellerSignature] = useState(() => localStorage.getItem("last_formSellerSignature") ?? "");
  const [formSellerStamp, setFormSellerStamp] = useState(() => localStorage.getItem("last_formSellerStamp") ?? "");

  // Signature and Stamp real-time preview drag coordinates
  const [formSigX, setFormSigX] = useState<number>(() => Number(localStorage.getItem("last_formSigX") ?? "0"));
  const [formSigY, setFormSigY] = useState<number>(() => Number(localStorage.getItem("last_formSigY") ?? "0"));
  const [formStampX, setFormStampX] = useState<number>(() => Number(localStorage.getItem("last_formStampX") ?? "0"));
  const [formStampY, setFormStampY] = useState<number>(() => Number(localStorage.getItem("last_formStampY") ?? "0"));

  const [isDraggingSig, setIsDraggingSig] = useState(false);
  const [isDraggingStamp, setIsDraggingStamp] = useState(false);
  const [sigDragStart, setSigDragStart] = useState({ x: 0, y: 0 });
  const [stampDragStart, setStampDragStart] = useState({ x: 0, y: 0 });

  const handleSigStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    setIsDraggingSig(true);
    setSigDragStart({
      x: clientX - formSigX,
      y: clientY - formSigY
    });
  };

  const handleStampStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    setIsDraggingStamp(true);
    setStampDragStart({
      x: clientX - formStampX,
      y: clientY - formStampY
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingSig) {
        const deltaX = e.clientX - sigDragStart.x;
        const deltaY = e.clientY - sigDragStart.y;
        setFormSigX(deltaX);
        setFormSigY(deltaY);
      } else if (isDraggingStamp) {
        const deltaX = e.clientX - stampDragStart.x;
        const deltaY = e.clientY - stampDragStart.y;
        setFormStampX(deltaX);
        setFormStampY(deltaY);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 0) return;
      const touch = e.touches[0];
      if (isDraggingSig) {
        const deltaX = touch.clientX - sigDragStart.x;
        const deltaY = touch.clientY - sigDragStart.y;
        setFormSigX(deltaX);
        setFormSigY(deltaY);
      } else if (isDraggingStamp) {
        const deltaX = touch.clientX - stampDragStart.x;
        const deltaY = touch.clientY - stampDragStart.y;
        setFormStampX(deltaX);
        setFormStampY(deltaY);
      }
    };

    const handleMouseUp = () => {
      setIsDraggingSig(false);
      setIsDraggingStamp(false);
    };

    if (isDraggingSig || isDraggingStamp) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.addEventListener("touchmove", handleTouchMove, { passive: false });
      document.addEventListener("touchend", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleMouseUp);
    };
  }, [isDraggingSig, isDraggingStamp, sigDragStart, stampDragStart, formSigX, formSigY, formStampX, formStampY]);

  // Modal Signature drawing states
  const [isSigModalOpen, setIsSigModalOpen] = useState(false);
  const [modalSigColor, setModalSigColor] = useState("#1e3a8a");
  const [isModalDrawing, setIsModalDrawing] = useState(false);
  const modalCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Custom Customer Dropdown States
  const custDropdownRef = useRef<HTMLDivElement>(null);
  const [isCustDropdownOpen, setIsCustDropdownOpen] = useState(false);
  const [custSearchQuery, setCustSearchQuery] = useState("");

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (custDropdownRef.current && !custDropdownRef.current.contains(event.target as Node)) {
        setIsCustDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const startModalDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = modalCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    if ("touches" in e) {
      if (e.touches.length === 0) return;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = ((clientX - rect.left) / rect.width) * canvas.width;
    const y = ((clientY - rect.top) / rect.height) * canvas.height;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsModalDrawing(true);
  };

  const drawModal = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isModalDrawing) return;
    const canvas = modalCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    if ("touches" in e) {
      if (e.touches.length === 0) return;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = ((clientX - rect.left) / rect.width) * canvas.width;
    const y = ((clientY - rect.top) / rect.height) * canvas.height;

    ctx.strokeStyle = modalSigColor;
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopModalDrawing = () => {
    setIsModalDrawing(false);
  };

  const clearModalCanvas = () => {
    const canvas = modalCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const saveModalSignature = () => {
    const canvas = modalCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const buffer = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = buffer.data;
    let hasContent = false;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] > 0) {
        hasContent = true;
        break;
      }
    }

    if (hasContent) {
      const dataUrl = canvas.toDataURL("image/png");
      setFormSellerSignature(dataUrl);
    } else {
      setFormSellerSignature("");
    }
    setIsSigModalOpen(false);
  };

  // Pre-load current signature onto modal canvas when opened
  useEffect(() => {
    if (isSigModalOpen && formSellerSignature) {
      setTimeout(() => {
        const canvas = modalCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        const img = new Image();
        img.onload = () => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        };
        img.src = formSellerSignature;
      }, 100);
    }
  }, [isSigModalOpen, formSellerSignature]);

  const [sigColor, setSigColor] = useState("#1e3a8a");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    if ("touches" in e) {
      if (e.touches.length === 0) return;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    if ("touches" in e) {
      if (e.touches.length === 0) return;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.strokeStyle = sigColor;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    saveCanvasToSignature();
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setFormSellerSignature("");
  };

  const saveCanvasToSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const buffer = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = buffer.data;
    let hasContent = false;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] > 0) {
        hasContent = true;
        break;
      }
    }
    if (hasContent) {
      const dataUrl = canvas.toDataURL("image/png");
      setFormSellerSignature(dataUrl);
    }
  };

  // NEW Buyer Custom Form Fields
  const [formBuyerName, setFormBuyerName] = useState("");
  const [formBuyerTaxNo, setFormBuyerTaxNo] = useState("");
  const [formBuyerBankName, setFormBuyerBankName] = useState("");
  const [formBuyerBankAccount, setFormBuyerBankAccount] = useState("");
  const [formBuyerAddress, setFormBuyerAddress] = useState("");
  const [formBuyerContact, setFormBuyerContact] = useState("");
  const [formBuyerPhone, setFormBuyerPhone] = useState("");
  const [formBuyerLogo, setFormBuyerLogo] = useState("");

  // Mobile View Mode inside Editor ("edit" | "preview")
  const [mobileEditorTab, setMobileEditorTab] = useState<"edit" | "preview">("edit");

  // Item form state
  const [itemDesc, setItemDesc] = useState("");
  const [itemQty, setItemQty] = useState<number | "">("");
  const [itemPrice, setItemPrice] = useState<number | "">("");

  // Detail Modal State
  // viewInvoice declared in outer

  // Delete Confirm State
  // deleteConfirmId declared in outer

  // Generate unique invoice number
  const handleGenerateInvoiceNo = () => {
    const prefix = "INV-";
    const dateStr = getNowDateStr().replace(/-/g, "");
    const random = Math.floor(1000 + Math.random() * 9000);
    setFormInvoiceNo(`${prefix}${dateStr}${random}`);
  };

  // Sync invoiceNo when opening form to create
  useEffect(() => {
    if (isFormOpen && !editingInvoice && !formInvoiceNo) {
      handleGenerateInvoiceNo();
    }
  }, [isFormOpen, editingInvoice]);

  // Calculate dynamic line amounts inside items editor
  const itemSubtotal = useMemo(() => {
    return formItems.reduce((acc, curr) => acc + curr.amount, 0);
  }, [formItems]);

  const itemTaxAmount = useMemo(() => {
    const isProforma = formInvoiceType === "proforma" || formInvoiceType?.toLowerCase().includes("形式") || formInvoiceType?.toLowerCase().includes("proforma");
    if (isProforma) return 0;
    const net = itemSubtotal / (1 + formTaxRate / 100);
    return parseFloat((itemSubtotal - net).toFixed(2));
  }, [itemSubtotal, formTaxRate, formInvoiceType]);

  const itemNetSubtotal = useMemo(() => {
    return parseFloat((itemSubtotal - itemTaxAmount).toFixed(2));
  }, [itemSubtotal, itemTaxAmount]);

  // Handle adding an item to the list
  const handleAddItem = () => {
    if (!itemDesc.trim()) {
      addToast("❌ 请填写项目描述");
      return;
    }
    if (!itemQty || itemQty <= 0) {
      addToast("❌ 请填写有效的数量");
      return;
    }
    if (!itemPrice || itemPrice <= 0) {
      addToast("❌ 请填写有效的单价");
      return;
    }

    const newItem: InvoiceItem = {
      id: `item-${Date.now()}`,
      description: itemDesc.trim(),
      qty: Number(itemQty),
      unitPrice: Number(itemPrice),
      amount: Number((Number(itemQty) * Number(itemPrice)).toFixed(2))
    };

    setFormItems([...formItems, newItem]);
    setItemDesc("");
    setItemQty("");
    setItemPrice("");
    addToast("✅ 服务明细已添加");
  };

  // Remove item
  const handleRemoveItem = (id: string) => {
    setFormItems(formItems.filter(item => item.id !== id));
  };

  // Logo file uploads handling (Read as Base64 to save offline in localStorage)
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>, isSeller: boolean) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2.5 * 1024 * 1024) {
        addToast("❌ 上传的文件过大！请选择小于 2.5MB 的 Logo 图片");
        e.target.value = ""; // Reset value on error
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        if (isSeller) {
          setFormSellerLogo(base64String);
        } else {
          setFormBuyerLogo(base64String);
        }
        addToast(`✅ ${isSeller ? '开票方' : '购买方'} Logo 上传成功！`);
        e.target.value = ""; // Reset value so same file can be re-uploaded
      };
      reader.onerror = () => {
        addToast("❌ 文件读取失败，请重试");
        e.target.value = ""; // Reset value on error
      };
      reader.readAsDataURL(file);
    }
  };

  // Clear logo strings
  const handleClearLogo = (isSeller: boolean) => {
    if (isSeller) {
      setFormSellerLogo("");
      const fileInput = document.getElementById('seller-logo-file-input') as HTMLInputElement | null;
      if (fileInput) {
        fileInput.value = "";
      }
    } else {
      setFormBuyerLogo("");
      const fileInput = document.getElementById('buyer-logo-file-input') as HTMLInputElement | null;
      if (fileInput) {
        fileInput.value = "";
      }
    }
    addToast("🗑️ Logo 已重置为默认文字徽标");
  };

  // Handle Customer Selection Sync
  const handleCustomerChange = (customerId: string) => {
    setFormCustomerId(customerId);
    const selectedCustomer = customers.find(c => c.id === customerId);
    
    if (selectedCustomer) {
      setFormCurrency(selectedCustomer.currency || "CNY");
      setFormBuyerName(selectedCustomer.name);
      
      // Look up if there are presets for this customer
      const preset = CUSTOMER_PRESETS[customerId];
      if (preset) {
        setFormBuyerTaxNo(preset.taxNo);
        setFormBuyerBankName(preset.bankName);
        setFormBuyerBankAccount(preset.bankAccount);
        setFormBuyerAddress(preset.address);
        setFormBuyerContact(preset.contact || "");
        setFormBuyerPhone(preset.phone);
        setFormBuyerLogo(preset.logo || "");
      } else {
        // Fallbacks
        setFormBuyerTaxNo("");
        setFormBuyerBankName("");
        setFormBuyerBankAccount("");
        setFormBuyerAddress("");
        setFormBuyerContact("");
        setFormBuyerPhone("");
        setFormBuyerLogo("");
      }
      addToast(`🤝 已同步关联客户: ${selectedCustomer.name}`);
    } else if (customerId === "custom") {
      // Clear for full manual custom input
      setFormBuyerName("");
      setFormBuyerTaxNo("");
      setFormBuyerBankName("");
      setFormBuyerBankAccount("");
      setFormBuyerAddress("");
      setFormBuyerContact("");
      setFormBuyerPhone("");
      setFormBuyerLogo("");
      addToast("✍️ 已切换为：手动自定义客户信息");
    }
  };

  // Reset Form
  const resetForm = () => {
    setEditingInvoice(null);
    setFormCustomerId("");
    setFormInvoiceNo("");
    setFormIssueDate(getNowDateStr());
    setFormDueDate("");
    setFormInvoiceType("增值税专用发票");
    setFormCopyText("ต้นฉบับ / ORIGINAL");
    setFormTaxRate(6);
    setFormCurrency("CNY");
    setFormNote("");
    setFormStatus("draft");
    setFormItems([]);
    
    // Reset Seller Details to last filled from localStorage
    setFormSellerName(localStorage.getItem("last_formSellerName") ?? "\u7269\u6d41\u4f9b\u5e94\u94fe\u6709\u9650\u516c\u53f8");
    setFormSellerTaxNo(localStorage.getItem("last_formSellerTaxNo") ?? "91310115MA1H7XW5XT");
    setFormSellerBankName(localStorage.getItem("last_formSellerBankName") ?? "中国建设银行上海浦东分行");
    setFormSellerBankAccount(localStorage.getItem("last_formSellerBankAccount") ?? "6217 0021 3004 5589 101");
    setFormSellerAddress(localStorage.getItem("last_formSellerAddress") ?? "上海市浦东新区张江高科园区博雅路455号");
    setFormSellerContact(localStorage.getItem("last_formSellerContact") ?? "张经理");
    setFormSellerPhone(localStorage.getItem("last_formSellerPhone") ?? "+66 2 123 4567");
    setFormSellerLogo(localStorage.getItem("last_formSellerLogo") ?? "");
    setFormSellerSignature(localStorage.getItem("last_formSellerSignature") ?? "");
    setFormSellerStamp(localStorage.getItem("last_formSellerStamp") ?? "");
    setFormSigX(0);
    setFormSigY(0);
    setFormStampX(0);
    setFormStampY(0);

    // Reset Buyer Details
    setFormBuyerName("");
    setFormBuyerTaxNo("");
    setFormBuyerBankName("");
    setFormBuyerBankAccount("");
    setFormBuyerAddress("");
    setFormBuyerContact("");
    setFormBuyerPhone("");
    setFormBuyerLogo("");
    
    setMobileEditorTab("edit");
    setItemDesc("");
    setItemQty("");
    setItemPrice("");
  };

  // Open Form for Create
  const handleOpenCreate = () => {
    resetForm();
    setIsFormOpen(true);
  };

  // Open Form for Edit
  const handleOpenEdit = (inv: Invoice) => {
    setEditingInvoice(inv);
    setFormCustomerId(inv.customerId);
    setFormInvoiceNo(inv.invoiceNo);
    setFormIssueDate(inv.issueDate);
    setFormDueDate(inv.dueDate);
    setFormInvoiceType(inv.invoiceType);
    setFormCopyText(inv.copyText ?? "");
    setFormTaxRate(inv.taxRate ?? 6);
    setFormCurrency(inv.currency);
    setFormNote(inv.note ?? "");
    setFormStatus(inv.status);
    setFormItems(inv.items ?? []);

    // Set Seller details from invoice (or fallback to defaults)
    setFormSellerName(inv.sellerName ?? "\u7269\u6d41\u4f9b\u5e94\u94fe\u6709\u9650\u516c\u53f8");
    setFormSellerTaxNo(inv.sellerTaxNo ?? "91310115MA1H7XW5XT");
    setFormSellerBankName(inv.sellerBankName ?? "中国建设银行上海浦东分行");
    setFormSellerBankAccount(inv.sellerBankAccount ?? "6217 0021 3004 5589 101");
    setFormSellerAddress(inv.sellerAddress ?? "上海市浦东新区张江高科园区博雅路455号");
    setFormSellerContact(inv.sellerContact ?? "");
    setFormSellerPhone(inv.sellerPhone ?? "+66 2 123 4567");
    setFormSellerLogo(inv.sellerLogo ?? "");
    setFormSellerSignature(inv.sellerSignature ?? "");
    setFormSellerStamp(inv.sellerStamp ?? "");
    setFormSigX(inv.sigX ?? 0);
    setFormSigY(inv.sigY ?? 0);
    setFormStampX(inv.stampX ?? 0);
    setFormStampY(inv.stampY ?? 0);

    // Set Buyer details from invoice
    setFormBuyerName(inv.customerName);
    setFormBuyerTaxNo(inv.buyerTaxNo ?? "");
    setFormBuyerBankName(inv.buyerBankName ?? "");
    setFormBuyerBankAccount(inv.buyerBankAccount ?? "");
    setFormBuyerAddress(inv.buyerAddress ?? "");
    setFormBuyerContact(inv.buyerContact ?? "");
    setFormBuyerPhone(inv.buyerPhone ?? "");
    setFormBuyerLogo(inv.buyerLogo ?? "");

    setMobileEditorTab("edit");
    setIsFormOpen(true);
  };

  // Save Form
  const handleSaveInvoice = async (e: React.FormEvent) => {
    e.preventDefault();

    let invoiceNoToSave = formInvoiceNo.trim();
    if (!invoiceNoToSave) {
      const prefix = "INV-";
      const dateStr = getNowDateStr().replace(/-/g, "");
      const random = Math.floor(1000 + Math.random() * 9000);
      invoiceNoToSave = `${prefix}${dateStr}${random}`;
    }

    const finalCustomerId = formCustomerId || "custom";

    const invoiceData: Invoice = {
      id: editingInvoice ? editingInvoice.id : `INV-${Date.now()}`,
      invoiceNo: invoiceNoToSave,
      customerId: finalCustomerId,
      customerName: formBuyerName.trim(),
      amount: itemSubtotal,
      currency: formCurrency,
      issueDate: formIssueDate,
      dueDate: formDueDate || new Date(new Date(formIssueDate).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      status: formStatus,
      taxRate: formInvoiceType === "proforma" ? 0 : formTaxRate,
      taxAmount: itemTaxAmount,
      subtotal: itemNetSubtotal,
      invoiceType: formInvoiceType,
      note: formNote.trim(),
      items: formItems,
      copyText: formCopyText.trim(),
      // Custom Seller Saved Info
      sellerName: formSellerName.trim(),
      sellerTaxNo: formSellerTaxNo.trim(),
      sellerBankName: formSellerBankName.trim(),
      sellerBankAccount: formSellerBankAccount.trim(),
      sellerAddress: formSellerAddress.trim(),
      sellerContact: formSellerContact.trim(),
      sellerPhone: formSellerPhone.trim(),
      sellerLogo: formSellerLogo,
      sellerSignature: formSellerSignature,
      sellerStamp: formSellerStamp,
      sigX: formSigX,
      sigY: formSigY,
      stampX: formStampX,
      stampY: formStampY,
      // Custom Buyer Saved Info
      buyerTaxNo: formBuyerTaxNo.trim(),
      buyerBankName: formBuyerBankName.trim(),
      buyerBankAccount: formBuyerBankAccount.trim(),
      buyerAddress: formBuyerAddress.trim(),
      buyerContact: formBuyerContact.trim(),
      buyerPhone: formBuyerPhone.trim(),
      buyerLogo: formBuyerLogo
    };

    // Save Seller details to localStorage for remembering
    localStorage.setItem("last_formSellerName", formSellerName.trim());
    localStorage.setItem("last_formSellerTaxNo", formSellerTaxNo.trim());
    localStorage.setItem("last_formSellerBankName", formSellerBankName.trim());
    localStorage.setItem("last_formSellerBankAccount", formSellerBankAccount.trim());
    localStorage.setItem("last_formSellerAddress", formSellerAddress.trim());
    localStorage.setItem("last_formSellerContact", formSellerContact.trim());
    localStorage.setItem("last_formSellerPhone", formSellerPhone.trim());
    localStorage.setItem("last_formSellerLogo", formSellerLogo);
    localStorage.setItem("last_formSellerSignature", formSellerSignature);
    localStorage.setItem("last_formSellerStamp", formSellerStamp);
    localStorage.setItem("last_formSigX", String(formSigX));
    localStorage.setItem("last_formSigY", String(formSigY));
    localStorage.setItem("last_formStampX", String(formStampX));
    localStorage.setItem("last_formStampY", String(formStampY));

    setIsSaving(true);
    try {
      if (editingInvoice) {
        const saved = await apiUpdateInvoice(editingInvoice.id, invoiceData, warehouseCode);
        setInvoices(prev => prev.map(inv => inv.id === editingInvoice.id ? saved : inv));
        addToast(`🎉 发票 ${saved.invoiceNo} 云端更新成功！`, "success");
      } else {
        const created = await apiCreateInvoice(invoiceData, warehouseCode);
        setInvoices(prev => [created, ...prev]);
        addToast(`🎉 发票 ${created.invoiceNo} 创建成功并登记入库！`, "success");
      }
      setIsFormOpen(false);
      resetForm();
      loadInvoices();
      loadStats();
    } catch (err: any) {
      console.error("Save invoice API error:", err);
      addToast(err.message || "保存发票失败，请检查网络或权限", "error");
    } finally {
      setIsSaving(false);
    }
  };

  


  return (
    <div className="space-y-6">
      {!isFormOpen && (
        <>
          {/* Top Control Toolbar: Two Rows */}
          <div className="bg-slate-50/95 border border-slate-200/80 rounded-xl p-3 shadow-2xs space-y-2.5">
            {/* Row 1: MonthPicker, Search, and Action Buttons */}
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2.5">
              {/* Left: MonthPicker & Search */}
              <div className="flex flex-wrap items-center gap-2.5 flex-1">
                <MonthPicker
                  value={dateFilter}
                  onChange={setDateFilter}
                  lang={lang}
                  className="w-32 sm:w-36 shrink-0"
                  placeholder={lang === "zh-CN" || lang === "zh-TW" ? "全部月份" : lang === "th" ? "ทุกเดือน" : "All Months"}
                />
                <div className="relative w-full sm:w-64">
                  <Input
                    type="text"
                    placeholder={getInvoiceTrans("search_placeholder", lang)}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-8 text-xs pl-8 pr-7 bg-white shadow-xs rounded-lg border-slate-200"
                  />
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  {searchQuery && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 p-0 cursor-pointer"
                      title={lang === "en" ? "Clear" : "清空"}
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Right: Actions */}
              <div className="flex items-center gap-2 justify-end shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isRefreshing}
                  onClick={handleManualRefresh}
                  className="h-8 text-xs font-medium shadow-xs flex items-center justify-center gap-1.5 px-3 bg-white border-slate-200 hover:bg-slate-50 text-slate-700 cursor-pointer"
                  title={lang === "en" ? "Refresh Invoice Data" : lang === "th" ? "รีเฟรชข้อมูลใบแจ้งหนี้" : "刷新发票数据"}
                >
                  <RefreshCw className={cn("w-3.5 h-3.5 text-slate-500", isRefreshing && "animate-spin")} />
                  <span>{lang === "en" ? "Refresh" : lang === "th" ? "รีเฟรช" : "刷新"}</span>
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleOpenCreate}
                  className="h-8 text-xs font-medium shadow-xs flex items-center justify-center gap-1.5 px-3 bg-brand-600 hover:bg-brand-700 text-white cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{getInvoiceTrans("new_invoice", lang)}</span>
                </Button>
              </div>
            </div>

            {/* Row 2: Status Tabs, Type Select, Reset, and Horizontal Table Scroller */}
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2.5 pt-2.5 border-t border-slate-200/70">
              {/* Left: Filters */}
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Status Segmented Tabs */}
                <Tabs value={statusFilter} onValueChange={setStatusFilter}>
                  <TabsList className="h-8 p-0.5 bg-slate-200/60 border border-slate-200/40 rounded-lg">
                    <TabsTrigger
                      value="all"
                      className="h-[26px] px-2.5 text-xs font-medium rounded-md data-[state=active]:font-semibold"
                    >
                      {lang === "en" ? "All" : lang === "th" ? "ทั้งหมด" : "全部"}
                      <span className="ml-1 text-[10px] opacity-75 font-mono">({statusCounts.all})</span>
                    </TabsTrigger>
                    <TabsTrigger
                      value="pending"
                      className="h-[26px] px-2.5 text-xs font-medium rounded-md data-[state=active]:font-semibold data-[state=active]:text-orange-700"
                    >
                      {getStatusTrans("pending", lang)}
                      <span className="ml-1 text-[10px] opacity-75 font-mono">({statusCounts.pending})</span>
                    </TabsTrigger>
                    <TabsTrigger
                      value="paid"
                      className="h-[26px] px-2.5 text-xs font-medium rounded-md data-[state=active]:font-semibold data-[state=active]:text-emerald-700"
                    >
                      {getStatusTrans("paid", lang)}
                      <span className="ml-1 text-[10px] opacity-75 font-mono">({statusCounts.paid})</span>
                    </TabsTrigger>
                    <TabsTrigger
                      value="overdue"
                      className="h-[26px] px-2.5 text-xs font-medium rounded-md data-[state=active]:font-semibold data-[state=active]:text-rose-700"
                    >
                      {getStatusTrans("overdue", lang)}
                      <span className="ml-1 text-[10px] opacity-75 font-mono">({statusCounts.overdue})</span>
                    </TabsTrigger>
                  </TabsList>
                </Tabs>

                {/* Type Filter */}
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="h-8 text-xs font-medium text-slate-700 bg-white border-slate-200 w-auto min-w-[110px] shadow-xs rounded-lg">
                    <SelectValue placeholder={getInvoiceTrans("type_all", lang)} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{getInvoiceTrans("type_all", lang)}</SelectItem>
                    <SelectItem value="vat">{getInvoiceTypeLabel("vat", lang)}</SelectItem>
                    <SelectItem value="ordinary">{getInvoiceTypeLabel("ordinary", lang)}</SelectItem>
                    <SelectItem value="proforma">{getInvoiceTypeLabel("proforma", lang)}</SelectItem>
                  </SelectContent>
                </Select>

                {/* Reset Filter Button */}
                {(searchQuery || typeFilter !== "all" || statusFilter !== "all" || dateFilter) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setTypeFilter("all");
                      setStatusFilter("all");
                      setDateFilter("");
                    }}
                    className="h-8 px-2 text-[11px] text-slate-500 hover:text-rose-600 font-bold gap-1 cursor-pointer"
                    title={lang === "en" ? "Reset All Filters" : lang === "th" ? "รีเซ็ตตัวกรองทั้งหมด" : "重置所有筛选"}
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>{lang === "en" ? "Reset" : "重置"}</span>
                  </Button>
                )}
              </div>

              {/* Right: Table Horizontal Scroller */}
              <div className="flex items-center justify-end shrink-0">
                <TableHorizontalScroller targetRef={tableContainerRef} alwaysShow={true} />
              </div>
            </div>
          </div>

          {/* Invoices List Table Panel */}
          <div className="glass-panel rounded-xl shadow-sm border border-slate-200/80 bg-white">
            <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-xs rounded-t-xl shadow-2xs border-b border-slate-100">
              <div ref={actionBarRef} className="px-4 py-3 flex justify-between items-center">
                <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                  <span>{lang === "en" ? "Invoice List" : lang === "th" ? "รายการใบแจ้งหนี้" : "发票列表"}</span>
                  <span className="text-xs font-normal text-slate-400">（共 {totalCount} 条）</span>
                </h3>
                <div className="flex items-center gap-2">
                  <TableHorizontalScroller targetRef={tableContainerRef} alwaysShow={true} />
                </div>
              </div>

              {/* 悬浮镜像表头 (Sticky Mirror Header - 方案二) */}
              {isMirrorHeaderVisible && (
                <div
                  ref={mirrorHeaderRef}
                  className="overflow-x-hidden border-t border-slate-200/80 bg-slate-50/95 backdrop-blur-xs shadow-xs transition-opacity duration-150"
                >
                  <table
                    style={{ width: realTableWidth ? `${realTableWidth}px` : "100%" }}
                    className="text-left border-collapse table-fixed text-xs"
                  >
                    <thead>
                      <tr className="bg-slate-50/95 text-slate-500 font-semibold uppercase border-b border-slate-200/80 whitespace-nowrap">
                        <th style={{ width: colWidths[0] ? `${colWidths[0]}px` : undefined }} className="px-3.5 py-3 font-semibold">{getInvoiceTrans("col_invoice_no", lang)}</th>
                        <th style={{ width: colWidths[1] ? `${colWidths[1]}px` : undefined }} className="px-3 py-3 font-semibold">{getInvoiceTrans("col_seller", lang)}</th>
                        <th style={{ width: colWidths[2] ? `${colWidths[2]}px` : undefined }} className="px-3 py-3 font-semibold">{getInvoiceTrans("col_buyer", lang)}</th>
                        <th style={{ width: colWidths[3] ? `${colWidths[3]}px` : undefined }} className="px-2 py-3 font-semibold text-center">{getInvoiceTrans("col_type", lang)}</th>
                        <th style={{ width: colWidths[4] ? `${colWidths[4]}px` : undefined }} className="px-2 py-3 font-semibold text-center">{lang === "en" ? "Status" : lang === "th" ? "สถานะ" : "状态"}</th>
                        <th style={{ width: colWidths[5] ? `${colWidths[5]}px` : undefined }} className="px-2.5 py-3 font-semibold">{getInvoiceTrans("col_dates", lang)}</th>
                        <th style={{ width: colWidths[6] ? `${colWidths[6]}px` : undefined }} className="px-3 py-3 font-semibold text-right">{getInvoiceTrans("col_amount", lang)}</th>
                        <th style={{ width: colWidths[7] ? `${colWidths[7]}px` : undefined }} className="px-3 py-3 font-semibold text-center">{getInvoiceTrans("col_actions", lang)}</th>
                      </tr>
                    </thead>
                  </table>
                </div>
              )}
            </div>

            <div ref={tableHeadSentinelRef} className="h-0 w-full" />
            <div ref={tableContainerRef} onScroll={handleTableScroll} className="overflow-x-auto relative rounded-b-xl">
              <table ref={realTableRef} className="w-full text-left border-collapse">
                <thead ref={realTheadRef}>
                  <tr className="bg-slate-50/75 text-slate-500 text-xs font-semibold uppercase border-b border-slate-200/80 whitespace-nowrap">
                    <th className="px-3.5 py-3 font-semibold w-[130px]">{getInvoiceTrans("col_invoice_no", lang)}</th>
                    <th className="px-3 py-3 font-semibold min-w-[130px]">{getInvoiceTrans("col_seller", lang)}</th>
                    <th className="px-3 py-3 font-semibold min-w-[140px]">{getInvoiceTrans("col_buyer", lang)}</th>
                    <th className="px-2 py-3 font-semibold text-center w-[95px]">{getInvoiceTrans("col_type", lang)}</th>
                    <th className="px-2 py-3 font-semibold text-center w-[90px]">{lang === "en" ? "Status" : lang === "th" ? "สถานะ" : "状态"}</th>
                    <th className="px-2.5 py-3 font-semibold w-[105px]">{getInvoiceTrans("col_dates", lang)}</th>
                    <th className="px-3 py-3 font-semibold text-right w-[115px]">{getInvoiceTrans("col_amount", lang)}</th>
                    <th className="px-3 py-3 font-semibold text-center w-[160px] min-w-[155px]">{getInvoiceTrans("col_actions", lang)}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {isLoading || isRefreshing ? (
                    <tr>
                      <td colSpan={8} className="py-16 text-center text-slate-400 font-medium">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
                          <p className="text-xs font-medium text-slate-500">
                            {lang === "en" ? "Synchronizing invoice records..." : lang === "th" ? "\u0e01\u0e33\u0e25\u0e31\u0e07\u0e0b\u0e34\u0e07\u0e42\u0e04\u0e23\u0e44\u0e19\u0e0b\u0e4c\u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25\u0e43\u0e1a\u0e41\u0e08\u0e49\u0e07\u0e2b\u0e19\u0e35\u0e49..." : "\u6b63\u5728\u540c\u6b65\u53d1\u7968\u8d26\u5355\u6570\u636e..."}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : invoices.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400 font-bold">
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <FileMinus className="w-8 h-8 text-slate-400" />
                          <p>{getInvoiceTrans("no_records", lang)}</p>
                          {(searchQuery || typeFilter !== "all" || statusFilter !== "all" || dateFilter) && (
                            <Button
                              variant="link"
                              size="sm"
                              onClick={() => {
                                setSearchQuery("");
                                setTypeFilter("all");
                                setStatusFilter("all");
                                setDateFilter("");
                              }}
                              className="text-[11px] text-brand-600 font-bold hover:underline mt-1 flex items-center gap-1 cursor-pointer h-auto p-0"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>{lang === "en" ? "Reset all filters" : lang === "th" ? "\u0e23\u0e35\u0e40\u0e0b\u0e47\u0e15\u0e15\u0e31\u0e27\u0e01\u0e23\u0e2d\u0e07\u0e17\u0e31\u0e49\u0e07\u0e2b\u0e21\u0e14" : "\u91cd\u7f6e\u6240\u6709\u7b5b\u9009"}</span>
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    invoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-50/60 transition">
                        <td className="px-3.5 py-3 font-mono font-bold text-slate-900">{inv.invoiceNo}</td>
                        <td className="px-3 py-3 font-medium text-slate-800 truncate max-w-[180px]" title={inv.sellerName}>{inv.sellerName}</td>
                        <td className="px-3 py-3 font-medium text-slate-800 truncate max-w-[180px]" title={inv.customerName}>{inv.customerName || (lang === "en" ? "Unnamed Buyer" : "未命名客户")}</td>
                        <td className="px-2 py-3 text-center">
                          <span className={cn("px-2 py-0.5 rounded text-[11px] font-semibold", getInvoiceTypeColor(inv.invoiceType))}>
                            {getInvoiceTypeLabel(inv.invoiceType, lang)}
                          </span>
                        </td>
                        <td className="px-2 py-3 text-center">
                          <span className={cn("px-2 py-0.5 rounded text-[11px] font-semibold", getStatusColor(inv.status))}>
                            {getStatusTrans(inv.status, lang)}
                          </span>
                        </td>
                        <td className="px-2.5 py-3 text-slate-500 font-mono text-[11px]">
                          <div>{formatDate(inv.issueDate)}</div>
                          {inv.dueDate && <div className="text-[10px] text-slate-400">{getInvoiceTrans("due_date_lbl", lang)}: {formatDate(inv.dueDate)}</div>}
                        </td>
                        <td className="px-3 py-3 text-right font-mono font-bold text-slate-900">
                          {formatCurrency(inv.amount, inv.currency as any)}
                        </td>
                        <td className="px-3 py-3 text-center whitespace-nowrap min-w-[155px]">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setViewInvoice(inv)}
                              className="h-7 px-2 text-[11px] font-medium gap-1 text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50"
                              title={getInvoiceTrans("tooltip_view", lang)}
                            >
                              <Eye className="w-3.5 h-3.5 text-slate-500" />
                              <span>{getInvoiceTrans("btn_view", lang)}</span>
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenEdit(inv)}
                              className="h-7 px-2 text-[11px] font-medium gap-1 text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50"
                              title={getInvoiceTrans("tooltip_edit", lang)}
                            >
                              <Edit className="w-3.5 h-3.5 text-slate-500" />
                              <span>{getInvoiceTrans("btn_edit", lang)}</span>
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              disabled={deletingId === inv.id}
                              onClick={() => setDeleteConfirmId(inv.id)}
                              className="h-7 w-7 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                              title={getInvoiceTrans("btn_delete", lang)}
                            >
                              {deletingId === inv.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-500" />
                              ) : (
                                <Trash2 className="w-3.5 h-3.5" />
                              )}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="px-4 py-3 border-t border-slate-200/80 bg-slate-50/50 flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  {lang === "en"
                    ? `Showing ${(page - 1) * pageSize + 1} to ${Math.min(page * pageSize, totalCount)} of ${totalCount} invoices`
                    : `显示第 ${(page - 1) * pageSize + 1} 至 ${Math.min(page * pageSize, totalCount)} 条，共 ${totalCount} 条发票`}
                </span>
                <Pagination
                  page={page}
                  pageSize={pageSize}
                  total={totalCount}
                  onPageChange={setPage}
                />
              </div>
            )}
          </div>

          {/* View Invoice Dialog */}
          <Dialog open={!!viewInvoice} onOpenChange={(open) => { if (!open) setViewInvoice(null); }}>
            <DialogContent className="max-w-4xl max-h-[92vh] w-full p-0 overflow-hidden flex flex-col sm:rounded-2xl border border-slate-200 shadow-2xl [&>button]:hidden no-print-backdrop gap-0 bg-slate-100">
              {viewInvoice && (
                <>
                  <DialogHeader className="bg-white px-6 py-3.5 border-b border-slate-200 flex flex-row items-center justify-between no-print space-y-0 shrink-0">
                    <DialogTitle className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                      <FileText className="w-4 h-4 text-brand-600" />
                      <span>{getInvoiceTrans("invoice_details_preview", lang)}</span>
                      <span className="font-mono text-xs text-slate-400 font-normal">({viewInvoice.invoiceNo})</span>
                    </DialogTitle>
                    <DialogDescription className="sr-only">{getInvoiceTrans("invoice_details_preview", lang)}</DialogDescription>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        onClick={handlePrintView}
                        size="sm"
                        className="bg-brand-600 hover:bg-brand-700 text-white font-bold gap-1.5 shadow-xs h-8 text-xs cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        {getInvoiceTrans("btn_print_pdf", lang)}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setViewInvoice(null)}
                        className="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </DialogHeader>

                  <div className="p-4 md:p-8 overflow-y-auto flex-1 bg-slate-100 flex justify-center items-start">
                    <div className="w-full max-w-3xl space-y-3">
                      <div className="flex items-center justify-between no-print px-1 text-slate-500 text-[10px] font-extrabold uppercase tracking-wider">
                        <span>{getInvoiceTrans("preview_title_live", lang)}</span>
                        <span className="text-emerald-600 flex items-center gap-1 font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
                          {viewInvoice.status === "paid" ? (lang === "en" ? "Settled & Archived" : "已结清归档") : viewInvoice.status === "pending" ? (lang === "en" ? "Pending Payment" : "待客户付款") : (lang === "en" ? "Official Invoice" : "正式账单凭证")}
                        </span>
                      </div>
                      <InvoiceDetailCard invoice={viewInvoice} lang={lang} />
                    </div>
                  </div>
                </>
              )}
            </DialogContent>
          </Dialog>

          {/* Delete Confirm Dialog */}
          <Dialog open={!!deleteConfirmId} onOpenChange={(open) => { if (!open) setDeleteConfirmId(null); }}>
            <DialogContent className="max-w-sm p-6 text-center sm:rounded-3xl border border-slate-100 shadow-2xl [&>button]:hidden">
              <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-brand-50 flex items-center justify-center border-4 border-brand-100/40 text-brand-600 shadow-inner">
                <AlertCircle className="w-5 h-5 animate-pulse" />
              </div>
              <DialogTitle className="text-base font-black text-slate-900 tracking-tight leading-6">
                {lang === "en" ? "Delete Invoice" : lang === "th" ? "ลบใบแจ้งหนี้" : "确认删除发票账单"}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 mt-2 leading-relaxed px-1">
                {lang === "en"
                  ? "Are you sure you want to permanently delete this invoice? This action cannot be undone."
                  : lang === "th"
                  ? "คุณแน่ใจหรือไม่ว่าต้องการลบใบแจ้งหนี้รายการนี้? การดำเนินการนี้เป็นแบบถาวรและไม่สามารถย้อนกลับได้"
                  : "您确定要永久删除该发票账单吗？该操作不可逆，删除后数据将无法找回。"}
              </DialogDescription>
              <DialogFooter className="mt-6 grid grid-cols-2 gap-3 sm:space-x-0">
                <Button
                  type="button"
                  variant="outline"
                  disabled={Boolean(deletingId)}
                  onClick={() => setDeleteConfirmId(null)}
                  className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-extrabold"
                >
                  {lang === "en" ? "Cancel" : lang === "th" ? "ยกเลิก" : "取消"}
                </Button>
                <Button
                  type="button"
                  disabled={Boolean(deletingId)}
                  onClick={() => {
                    if (deleteConfirmId) {
                      handleDeleteInvoice(deleteConfirmId);
                    }
                  }}
                  className="py-2.5 px-4 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-extrabold shadow-md shadow-brand-500/15 flex items-center justify-center gap-1.5"
                >
                  {deletingId && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{lang === "en" ? "Confirm" : lang === "th" ? "ยืนยันการลบ" : "确认删除"}</span>
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}

      {/* CREATE & EDIT WORKSPACE (Double Column Split Screen with Live Real-time Preview) */}
      {isFormOpen && (
        <InvoiceFormWorkspace
          isFormOpen={isFormOpen}
          setIsFormOpen={setIsFormOpen}
          editingInvoice={editingInvoice}
          isSaving={isSaving}
          handleSaveInvoice={handleSaveInvoice}
          customers={customers}
          lang={lang}
          formCustomerId={formCustomerId}
          setFormCustomerId={setFormCustomerId}
          formInvoiceNo={formInvoiceNo}
          setFormInvoiceNo={setFormInvoiceNo}
          formIssueDate={formIssueDate}
          setFormIssueDate={setFormIssueDate}
          formDueDate={formDueDate}
          setFormDueDate={setFormDueDate}
          formInvoiceType={formInvoiceType}
          setFormInvoiceType={setFormInvoiceType}
          formCopyText={formCopyText}
          setFormCopyText={setFormCopyText}
          formTaxRate={formTaxRate}
          setFormTaxRate={setFormTaxRate}
          formCurrency={formCurrency}
          setFormCurrency={setFormCurrency}
          formNote={formNote}
          setFormNote={setFormNote}
          formStatus={formStatus}
          setFormStatus={setFormStatus}
          formItems={formItems}
          setFormItems={setFormItems}
          itemDesc={itemDesc}
          setItemDesc={setItemDesc}
          itemQty={itemQty}
          setItemQty={setItemQty}
          itemPrice={itemPrice}
          setItemPrice={setItemPrice}
          formSellerName={formSellerName}
          setFormSellerName={setFormSellerName}
          formSellerTaxNo={formSellerTaxNo}
          setFormSellerTaxNo={setFormSellerTaxNo}
          formSellerBankName={formSellerBankName}
          setFormSellerBankName={setFormSellerBankName}
          formSellerBankAccount={formSellerBankAccount}
          setFormSellerBankAccount={setFormSellerBankAccount}
          formSellerAddress={formSellerAddress}
          setFormSellerAddress={setFormSellerAddress}
          formSellerContact={formSellerContact}
          setFormSellerContact={setFormSellerContact}
          formSellerPhone={formSellerPhone}
          setFormSellerPhone={setFormSellerPhone}
          formSellerLogo={formSellerLogo}
          setFormSellerLogo={setFormSellerLogo}
          formSellerSignature={formSellerSignature}
          setFormSellerSignature={setFormSellerSignature}
          formSellerStamp={formSellerStamp}
          setFormSellerStamp={setFormSellerStamp}
          formBuyerName={formBuyerName}
          setFormBuyerName={setFormBuyerName}
          formBuyerTaxNo={formBuyerTaxNo}
          setFormBuyerTaxNo={setFormBuyerTaxNo}
          formBuyerBankName={formBuyerBankName}
          setFormBuyerBankName={setFormBuyerBankName}
          formBuyerBankAccount={formBuyerBankAccount}
          setFormBuyerBankAccount={setFormBuyerBankAccount}
          formBuyerAddress={formBuyerAddress}
          setFormBuyerAddress={setFormBuyerAddress}
          formBuyerContact={formBuyerContact}
          setFormBuyerContact={setFormBuyerContact}
          formBuyerPhone={formBuyerPhone}
          setFormBuyerPhone={setFormBuyerPhone}
          formBuyerLogo={formBuyerLogo}
          setFormBuyerLogo={setFormBuyerLogo}
          formSigX={formSigX}
          setFormSigX={setFormSigX}
          formSigY={formSigY}
          setFormSigY={setFormSigY}
          formStampX={formStampX}
          setFormStampX={setFormStampX}
          formStampY={formStampY}
          setFormStampY={setFormStampY}
          isDraggingSig={isDraggingSig}
          isDraggingStamp={isDraggingStamp}
          handleSigStart={handleSigStart}
          handleStampStart={handleStampStart}
          handleGenerateInvoiceNo={handleGenerateInvoiceNo}
          handleAddItem={handleAddItem}
          handleRemoveItem={handleRemoveItem}
          handleLogoUpload={handleLogoUpload}
          handleClearLogo={handleClearLogo}
          handleCustomerChange={handleCustomerChange}
          setIsSigModalOpen={setIsSigModalOpen}
          itemSubtotal={itemSubtotal}
          itemTaxAmount={itemTaxAmount}
          itemNetSubtotal={itemNetSubtotal}
          mobileEditorTab={mobileEditorTab}
          setMobileEditorTab={setMobileEditorTab}
        />
      )}


            {/* Signature drawing board Modal */}
      <Dialog open={isSigModalOpen} onOpenChange={setIsSigModalOpen}>
        <DialogContent className="max-w-xl p-0 overflow-hidden rounded-2xl border border-slate-100 shadow-2xl [&>button]:hidden">
          <DialogHeader className="px-5 py-4 border-b border-slate-100 flex flex-row items-center justify-between bg-slate-50/50 space-y-0">
            <div className="flex items-center gap-2">
              <FileSignature className="w-5 h-5 text-brand-600" />
              <div>
                <DialogTitle className="font-extrabold text-slate-800 text-sm">
                  {lang === "zh-CN" || lang === "zh-TW" ? "在线手写签名" : "Online Hand-writing Signature"}
                </DialogTitle>
                <DialogDescription className="text-[10px] text-slate-400 font-bold">
                  {lang === "zh-CN" || lang === "zh-TW" ? "请在下方白色画布上使用鼠标或触屏手写您的姓名" : "Please use your mouse or touch screen finger to write below"}
                </DialogDescription>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSigModalOpen(false)}
              className="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </Button>
          </DialogHeader>

          {/* Canvas Body */}
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500">{lang === "zh-CN" || lang === "zh-TW" ? "笔触颜色：" : "Ink Color:"}</span>
                <div className="flex items-center gap-1.5">
                  <div
                    onClick={() => setModalSigColor("#1e3a8a")}
                    className={cn(
                      "w-5 h-5 rounded-full bg-blue-900 border cursor-pointer transition-all",
                      modalSigColor === "#1e3a8a" ? "ring-2 ring-brand-500 scale-110" : "opacity-75"
                    )}
                    title={lang === "zh-CN" || lang === "zh-TW" ? "蓝色" : "Blue"}
                  />
                  <div
                    onClick={() => setModalSigColor("#ef4444")}
                    className={cn(
                      "w-5 h-5 rounded-full bg-red-500 border cursor-pointer transition-all",
                      modalSigColor === "#ef4444" ? "ring-2 ring-brand-500 scale-110" : "opacity-75"
                    )}
                    title={lang === "zh-CN" || lang === "zh-TW" ? "红色" : "Red"}
                  />
                  <div
                    onClick={() => setModalSigColor("#000000")}
                    className={cn(
                      "w-5 h-5 rounded-full bg-black border cursor-pointer transition-all",
                      modalSigColor === "#000000" ? "ring-2 ring-brand-500 scale-110" : "opacity-75"
                    )}
                    title={lang === "zh-CN" || lang === "zh-TW" ? "黑色" : "Black"}
                  />
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={clearModalCanvas}
                className="text-[11px] font-bold text-rose-500 hover:bg-rose-50 hover:text-rose-600 border-rose-100 flex items-center gap-1 h-7"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                {lang === "zh-CN" || lang === "zh-TW" ? "清除重写" : "Reset Canvas"}
              </Button>
            </div>

            {/* Large Canvas area */}
            <div className="relative bg-white border-2 border-dashed border-slate-200 rounded-xl overflow-hidden h-64 shadow-inner">
              <canvas
                ref={modalCanvasRef}
                width={560}
                height={256}
                onMouseDown={startModalDrawing}
                onMouseMove={drawModal}
                onMouseUp={stopModalDrawing}
                onMouseLeave={stopModalDrawing}
                onTouchStart={startModalDrawing}
                onTouchMove={drawModal}
                onTouchEnd={stopModalDrawing}
                className="absolute inset-0 w-full h-full cursor-crosshair touch-none bg-white"
              />
            </div>
          </div>

          {/* Footer buttons */}
          <DialogFooter className="px-5 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-3 sm:space-x-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsSigModalOpen(false)}
              className="text-xs font-bold text-slate-500"
            >
              {lang === "zh-CN" || lang === "zh-TW" ? "取消" : "Cancel"}
            </Button>
            <Button
              size="sm"
              onClick={saveModalSignature}
              className="text-xs font-bold bg-brand-600 hover:bg-brand-700 text-white flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>{lang === "zh-CN" || lang === "zh-TW" ? "确认并应用" : "Save & Apply"}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default InvoiceManager;