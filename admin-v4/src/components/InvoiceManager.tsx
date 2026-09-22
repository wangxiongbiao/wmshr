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
} from "./invoice/constants";
import { printElement } from "./invoice/utils/printInvoice";
import { MonthPicker } from "./invoice/components/MonthPicker";
import { InvoiceDetailCard } from "./invoice/components/InvoiceDetailCard";
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
  const [isDeleting, setIsDeleting] = useState(false);
  const [stats, setStats] = useState<InvoiceStatsData | null>(null);

  // ????????????????????????
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

  // Invoices list state (先从本地恢复缓存，并立即通过云端接口拉取真实数据)
  // Invoices list state (默认初始为空列表，通过云端接口拉取当前租户真实发票数据)
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  // 清理旧版本残留的未隔离的本地发票缓存
  useEffect(() => {
    try {
      localStorage.removeItem("wms_invoices");
    } catch (e) {
      console.error("Failed to clear legacy invoice cache:", e);
    }
  }, []);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState("");

  // Dialog & Active view states
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // 真实云端数据拉取
  const loadInvoices = useCallback(async (isManual = false) => {
    setIsLoading(true);
    if (isManual) setIsRefreshing(true);
    try {
      const res = await fetchInvoices({
        page: 1,
        pageSize: 200,
        warehouseCode,
        status: statusFilter !== "all" ? statusFilter : undefined,
        invoiceType: typeFilter !== "all" ? typeFilter : undefined,
        keyword: searchQuery.trim() || undefined,
        month: dateFilter || undefined
      });
      if (Array.isArray(res.items)) {
        setInvoices(res.items);
      }
      if (isManual) {
        addToast(lang === "en" ? "Refreshed invoices list from cloud" : "发票列表已从云端实时刷新", "success");
      }
    } catch (err: any) {
      console.error("Failed to load invoices from API:", err);
      if (isManual) {
        addToast(err.message || "获取发票列表失败", "error");
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [warehouseCode, statusFilter, typeFilter, searchQuery, dateFilter, lang, addToast]);

  // 挂载及仓库切换时自动请求云端接口
  useEffect(() => {
    loadInvoices();
    loadStats();
  }, [loadInvoices, loadStats]);

  const handleManualRefresh = async () => {
    await Promise.all([loadInvoices(true), loadStats()]);
  };

  const handleDeleteInvoice = async (id: string) => {
    setIsDeleting(true);
    try {
      await apiDeleteInvoice(id, warehouseCode);
      setInvoices((prev) => prev.filter((inv) => inv.id !== id));
      setDeleteConfirmId(null);
      addToast(getInvoiceTrans("toast_deleted", lang), "success");
      loadInvoices();
      loadStats();
    } catch (err: any) {
      console.error("Delete invoice failed:", err);
      addToast(err.message || "删除发票失败", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  // Status statistics for Tabs badge counts (???????????????????/????????)
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

  // Filtered invoices list
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const searchStr = searchQuery.toLowerCase();
      const matchSearch =
        inv.invoiceNo.toLowerCase().includes(searchStr) ||
        inv.customerName.toLowerCase().includes(searchStr) ||
        inv.id.toLowerCase().includes(searchStr);

      const matchType = typeFilter === "all" || inv.invoiceType === typeFilter;
      const matchStatus = statusFilter === "all" || inv.status === statusFilter;
      const matchDate = !dateFilter || inv.issueDate.startsWith(dateFilter);

      return matchSearch && matchType && matchStatus && matchDate;
    });
  }, [invoices, searchQuery, typeFilter, statusFilter, dateFilter]);

  // Table horizontal scroller ref
  const tableContainerRef = useRef<HTMLDivElement>(null);

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Reset page to 1 on filter or search changes
  useEffect(() => {
    setPage(1);
  }, [searchQuery, typeFilter, statusFilter, dateFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredInvoices.length / pageSize));
  useEffect(() => {
    if (page > totalPages) {
      setPage(1);
    }
  }, [totalPages, page]);

  // Paginated invoices slice
  const pagedInvoices = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredInvoices.slice(start, start + pageSize);
  }, [filteredInvoices, page, pageSize]);

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
    deps: [pagedInvoices, isRefreshing],
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
                  <span className="text-xs font-normal text-slate-400">（共 {filteredInvoices.length} 条）</span>
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
                  {isRefreshing ? (
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
                  ) : filteredInvoices.length === 0 ? (
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
                    pagedInvoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-50/60 transition">
                        <td className="px-3.5 py-3 font-mono font-bold text-slate-900">{inv.invoiceNo}</td>
                        <td className="px-3 py-3 font-medium text-slate-800 truncate max-w-[180px]" title={inv.sellerName}>{inv.sellerName}</td>
                        <td className="px-3 py-3 font-medium text-slate-800 truncate max-w-[180px]" title={inv.customerName}>{inv.customerName || (lang === "en" ? "Unnamed Buyer" : "未命名客户")}</td>
                        <td className="px-2 py-3 text-center">
                          <span className={cn("px-2 py-0.5 rounded text-[11px] font-semibold", getInvoiceTypeColor(inv.invoiceType))}>
                            {getInvoiceTypeLabel(getCleanInvoiceType(inv.invoiceType), lang)}
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
                              onClick={() => setDeleteConfirmId(inv.id)}
                              className="h-7 w-7 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                              title={getInvoiceTrans("btn_delete", lang)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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
                    ? `Showing ${(page - 1) * pageSize + 1} to ${Math.min(page * pageSize, filteredInvoices.length)} of ${filteredInvoices.length} invoices`
                    : `显示第 ${(page - 1) * pageSize + 1} 至 ${Math.min(page * pageSize, filteredInvoices.length)} 条，共 ${filteredInvoices.length} 条发票`}
                </span>
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                  lang={lang}
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
                  onClick={() => setDeleteConfirmId(null)}
                  className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-extrabold"
                >
                  {lang === "en" ? "Cancel" : lang === "th" ? "ยกเลิก" : "取消"}
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    if (deleteConfirmId) {
                      handleDeleteInvoice(deleteConfirmId);
                    }
                  }}
                  className="py-2.5 px-4 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-extrabold shadow-md shadow-brand-500/15"
                >
                  {lang === "en" ? "Confirm" : lang === "th" ? "ยืนยันการลบ" : "确认删除"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}

      {/* CREATE & EDIT WORKSPACE (Double Column Split Screen with Live Real-time Preview) */}
      {isFormOpen && (
        <div className="bg-white w-full rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden h-[calc(100vh-8.5rem)] min-h-[650px]">
            
            {/* Split Screen Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/80">
              <div className="flex items-center gap-3.5">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-600 hover:text-slate-950 hover:bg-slate-100 border border-slate-200 rounded-xl transition cursor-pointer shadow-3xs"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  {getInvoiceTrans("back_to_list", lang)}
                </button>
                <div className="h-6 w-[1px] bg-slate-200 hidden sm:block" />
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                    {editingInvoice ? (
                      <>
                        <FileSignature className="w-5 h-5 text-brand-600" />
                        {getInvoiceTrans("workspace_title_edit", lang)}
                      </>
                    ) : (
                      <>
                        <Plus className="w-5 h-5 text-brand-600" />
                        {getInvoiceTrans("workspace_title_create", lang)}
                      </>
                    )}
                  </h3>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={isSaving} onClick={handleSaveInvoice}
                  className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-xl text-xs font-black shadow-xs hover:shadow-md transition duration-200 cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  {getInvoiceTrans("save_and_ledger", lang)}
                </button>

                {/* Print from preview inside modal */}
                <button
                  type="button"
                  onClick={() => {
                    printElement("modal-live-preview-pane", `Invoice - ${formInvoiceNo || "PDF"}`);
                  }}
                  className="hidden md:flex bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl text-xs font-bold transition items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  {getInvoiceTrans("print_current", lang)}
                </button>
              </div>
            </div>

            {/* Mobile View Toggle Tabs */}
            <div className="flex md:hidden border-b border-slate-100 bg-slate-50 text-xs font-bold text-center">
              <button
                type="button"
                onClick={() => setMobileEditorTab("edit")}
                className={cn(
                  "flex-1 py-3 border-b-2 transition",
                  mobileEditorTab === "edit" ? "border-brand-500 text-brand-600 bg-white" : "border-transparent text-slate-500"
                )}
              >
                {getInvoiceTrans("form_tab_edit", lang)}
              </button>
              <button
                type="button"
                onClick={() => setMobileEditorTab("preview")}
                className={cn(
                  "flex-1 py-3 border-b-2 transition",
                  mobileEditorTab === "preview" ? "border-brand-500 text-brand-600 bg-white" : "border-transparent text-slate-500"
                )}
              >
                {getInvoiceTrans("form_tab_preview", lang)}
              </button>
            </div>

            {/* Main Split Screen Container */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden bg-slate-100/50">
              
              {/* LEFT COLUMN: Inputs Editor (Scrollable) */}
              <div className={cn(
                "col-span-12 md:col-span-6 lg:col-span-5 h-full overflow-y-auto p-6 space-y-6 bg-white border-r border-slate-200",
                mobileEditorTab === "edit" ? "block" : "hidden md:block"
              )}>
                


                {/* Panel Section 1: Basis Settings */}
                <div className="space-y-4">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider border-l-3 border-brand-500 pl-2">
                    {getInvoiceTrans("sec_meta", lang)}
                  </h4>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Invoice No */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500 flex items-center justify-between">
                        <span>{getInvoiceTrans("invoice_num_lbl", lang)}</span>
                        <button
                          type="button"
                          onClick={handleGenerateInvoiceNo}
                          className="text-[9px] text-brand-600 hover:text-brand-700 font-bold cursor-pointer"
                        >
                          {getInvoiceTrans("random_btn", lang)}
                        </button>
                      </label>
                      <input
                        type="text"
                        value={formInvoiceNo}
                        onChange={(e) => setFormInvoiceNo(e.target.value)}
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 outline-none focus:bg-white focus:border-brand-500 transition"
                      />
                    </div>

                    {/* Invoice Type */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500">{getInvoiceTrans("invoice_type_lbl", lang)}</label>
                      <input
                        type="text"
                        value={formInvoiceType}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFormInvoiceType(val);
                          if (val.toLowerCase().includes("形式") || val.toLowerCase().includes("proforma")) {
                            setFormTaxRate(0);
                          }
                        }}
                        placeholder={getInvoiceTrans("invoice_type_placeholder", lang)}
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 outline-none focus:bg-white focus:border-brand-500 transition"
                      />
                    </div>

                    {/* Issue Date */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500">{getInvoiceTrans("issue_due_dates_lbl", lang)}</label>
                      <DatePicker
                        value={formIssueDate}
                        onChange={(val) => setFormIssueDate(val)}
                        lang={lang}
                        placeholder={lang === 'en' ? 'YYYY/MM/DD' : '年 / 月 / 日'}
                      />
                    </div>

                    {/* Due Date */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500">{getInvoiceTrans("due_date_lbl_form", lang)}</label>
                      <DatePicker
                        value={formDueDate}
                        onChange={(val) => setFormDueDate(val)}
                        lang={lang}
                        placeholder={lang === 'en' ? 'YYYY/MM/DD' : '年 / 月 / 日'}
                      />
                    </div>

                    {/* Tax Rate */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500">
                        {getInvoiceTrans("tax_rate_lbl", lang)} {(formInvoiceType === "proforma" || formInvoiceType?.toLowerCase().includes("形式") || formInvoiceType?.toLowerCase().includes("proforma")) && getInvoiceTrans("tax_free_proforma", lang)}
                      </label>
                      <input
                        type="number"
                        disabled={formInvoiceType === "proforma" || formInvoiceType?.toLowerCase().includes("形式") || formInvoiceType?.toLowerCase().includes("proforma")}
                        value={formTaxRate}
                        onChange={(e) => setFormTaxRate(Number(e.target.value))}
                        min={0}
                        max={100}
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 outline-none focus:bg-white focus:border-brand-500 disabled:opacity-50 transition"
                      />
                    </div>

                    {/* Settlement Currency */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500">{getInvoiceTrans("currency_settle_lbl", lang)}</label>
                      <select
                        value={formCurrency}
                        onChange={(e) => setFormCurrency(e.target.value)}
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 outline-none focus:bg-white focus:border-brand-500 transition"
                      >
                        <option value="CNY">{getInvoiceTrans("cur_option_cny", lang)}</option>
                        <option value="THB">{getInvoiceTrans("cur_option_thb", lang)}</option>
                        <option value="USD">{getInvoiceTrans("cur_option_usd", lang)}</option>
                        <option value="EUR">{getInvoiceTrans("cur_option_eur", lang)}</option>
                      </select>
                    </div>

                  </div>
                </div>

                {/* Panel Section 2: Seller Custom Block */}
                <div className="space-y-4 border-t border-slate-100 pt-5">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider border-l-3 border-emerald-500 pl-2">
                    {getInvoiceTrans("sec_seller", lang)}
                  </h4>

                  {/* Seller Logo Uploading */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-500">{getInvoiceTrans("logo_seller_lbl", lang)}</label>
                    <div className="flex items-center gap-3 flex-wrap">
                      <button
                        type="button"
                        onClick={() => document.getElementById('seller-logo-file-input')?.click()}
                        className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-3xs h-8"
                      >
                        <Upload className="w-3.5 h-3.5 text-slate-500" />
                        <span>{getInvoiceTrans("select_file_btn", lang)}</span>
                      </button>
                      <input
                        type="file"
                        id="seller-logo-file-input"
                        className="hidden"
                        accept="image/*"
                        onChange={(e) => handleLogoUpload(e, true)}
                      />
                      {formSellerLogo && (
                        <div className="flex items-center gap-2">
                          <div className="relative h-8 w-12 border border-slate-200 rounded-md overflow-hidden bg-white">
                            <img src={formSellerLogo} className="h-full w-full object-contain" referrerPolicy="no-referrer" />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleClearLogo(true)}
                            className="text-xs font-bold text-rose-500 hover:text-rose-600 hover:bg-rose-50 px-2 py-1 rounded-md transition cursor-pointer"
                          >
                            {lang === "zh-CN" || lang === "zh-TW" ? "删除" : "Remove"}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Seller fields inputs */}
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500">{getInvoiceTrans("seller_name_input", lang)}</label>
                      <input
                        type="text"
                        value={formSellerName}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFormSellerName(val);
                          localStorage.setItem("last_formSellerName", val);
                        }}
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 outline-none focus:bg-white focus:border-brand-500 transition"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-500">{getInvoiceTrans("seller_tax_input", lang)}</label>
                        <input
                          type="text"
                          value={formSellerTaxNo}
                          onChange={(e) => {
                            const val = e.target.value;
                            setFormSellerTaxNo(val);
                            localStorage.setItem("last_formSellerTaxNo", val);
                          }}
                          className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 outline-none focus:bg-white focus:border-brand-500 transition"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-500">{getInvoiceTrans("seller_contact_input", lang)}</label>
                        <input
                          type="text"
                          value={formSellerContact}
                          onChange={(e) => {
                            const val = e.target.value;
                            setFormSellerContact(val);
                            localStorage.setItem("last_formSellerContact", val);
                          }}
                          className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 outline-none focus:bg-white focus:border-brand-500 transition"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-500">{getInvoiceTrans("seller_address_input", lang)}</label>
                        <input
                          type="text"
                          value={formSellerAddress}
                          onChange={(e) => {
                            const val = e.target.value;
                            setFormSellerAddress(val);
                            localStorage.setItem("last_formSellerAddress", val);
                          }}
                          className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 outline-none focus:bg-white focus:border-brand-500 transition"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-500">{getInvoiceTrans("seller_phone_input", lang)}</label>
                        <input
                          type="text"
                          value={formSellerPhone}
                          onChange={(e) => {
                            const val = e.target.value;
                            setFormSellerPhone(val);
                            localStorage.setItem("last_formSellerPhone", val);
                          }}
                          className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 outline-none focus:bg-white focus:border-brand-500 transition"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-500">{getInvoiceTrans("seller_bank_input", lang)}</label>
                        <input
                          type="text"
                          value={formSellerBankName}
                          onChange={(e) => {
                            const val = e.target.value;
                            setFormSellerBankName(val);
                            localStorage.setItem("last_formSellerBankName", val);
                          }}
                          className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 outline-none focus:bg-white focus:border-brand-500 transition"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-500">{getInvoiceTrans("seller_account_input", lang)}</label>
                        <input
                          type="text"
                          value={formSellerBankAccount}
                          onChange={(e) => {
                            const val = e.target.value;
                            setFormSellerBankAccount(val);
                            localStorage.setItem("last_formSellerBankAccount", val);
                          }}
                          className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 outline-none focus:bg-white focus:border-brand-500 transition"
                        />
                      </div>
                    </div>

                    {/* Seller Signature & Stamp Section */}
                    <div className="space-y-2 border-t border-slate-100 pt-4">
                      <label className="text-[11px] font-bold text-slate-500 block">
                        {lang === "zh-CN" || lang === "zh-TW" ? "开票人签名与印章" : "Seller Signature & Stamp"}
                      </label>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Digital Signature Pad */}
                        <div className="space-y-2 p-3 bg-slate-50/50 rounded-xl border border-slate-200 flex flex-col justify-between">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-extrabold text-slate-700 flex items-center gap-1">
                              <FileSignature className="w-3.5 h-3.5 text-brand-600" />
                              {lang === "zh-CN" || lang === "zh-TW" ? "在线手写签名" : "Draw Digital Signature"}
                            </span>
                          </div>

                          {formSellerSignature ? (
                            <div className="space-y-2">
                              <div 
                                onClick={() => setIsSigModalOpen(true)}
                                className="relative bg-white border border-slate-200 rounded-lg overflow-hidden h-28 flex items-center justify-center cursor-pointer hover:border-brand-400 group transition shadow-3xs"
                                title={lang === "zh-CN" || lang === "zh-TW" ? "点击重新手写签名" : "Click to redraw signature"}
                              >
                                <img src={formSellerSignature} className="max-h-24 max-w-full object-contain p-2 transition-transform group-hover:scale-105" alt="Current Signature" referrerPolicy="no-referrer" />
                                <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition text-white text-[10px] font-bold gap-1">
                                  <FileSignature className="w-3.5 h-3.5" />
                                  <span>{lang === "zh-CN" || lang === "zh-TW" ? "点击重新手写" : "Click to redraw"}</span>
                                </div>
                              </div>

                              <div className="flex items-center justify-end gap-2">
                                {(formSigX !== 0 || formSigY !== 0) && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setFormSigX(0);
                                      setFormSigY(0);
                                    }}
                                    className="px-2 py-1 text-[10px] font-extrabold text-indigo-600 hover:bg-indigo-50 rounded-md border border-indigo-200 transition cursor-pointer flex items-center gap-1"
                                    title={lang === "zh-CN" || lang === "zh-TW" ? "重置签名在预览中的拖拽位置" : "Reset drag position"}
                                  >
                                    <Move className="w-3 h-3" />
                                    {lang === "zh-CN" || lang === "zh-TW" ? "重置位置" : "Reset Pos"}
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => document.getElementById('prewritten-signature-upload-input')?.click()}
                                  className="px-2 py-1 text-[10px] font-extrabold text-brand-700 hover:bg-brand-50 rounded-md border border-brand-200 transition cursor-pointer flex items-center gap-1"
                                >
                                  <Upload className="w-3 h-3" />
                                  {lang === "zh-CN" || lang === "zh-TW" ? "重新上传图片" : "Upload File"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setFormSellerSignature("")}
                                  className="px-2 py-1 text-[10px] font-extrabold text-rose-500 hover:bg-rose-50 rounded-md border border-rose-200 transition cursor-pointer flex items-center gap-1"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  {lang === "zh-CN" || lang === "zh-TW" ? "清除" : "Clear"}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {/* Large Clickable Area */}
                              <div 
                                onClick={() => setIsSigModalOpen(true)}
                                className="border-2 border-dashed border-slate-200 hover:border-brand-500 bg-white rounded-lg h-28 flex flex-col items-center justify-center gap-1 text-center cursor-pointer transition p-3 hover:bg-brand-50/10 group shadow-3xs"
                              >
                                <div className="p-2 rounded-full bg-brand-50 text-brand-600 group-hover:bg-brand-100 transition">
                                  <FileSignature className="w-5 h-5 animate-pulse" />
                                </div>
                                <span className="text-[11px] font-black text-slate-700">
                                  {lang === "zh-CN" || lang === "zh-TW" ? "点击此处开始在线手写签名" : "Click here to draw signature"}
                                </span>
                                <span className="text-[9px] text-slate-400 font-bold">
                                  {lang === "zh-CN" || lang === "zh-TW" ? "(弹窗放大，支持鼠标/移动触屏书写)" : "(Pops up enlarged drawing window)"}
                                </span>
                              </div>

                              <div className="flex justify-center">
                                <button
                                  type="button"
                                  onClick={() => document.getElementById('prewritten-signature-upload-input')?.click()}
                                  className="px-3 py-1 text-[10px] font-bold text-slate-650 hover:text-slate-800 bg-white hover:bg-slate-100 rounded-lg border border-slate-200 transition cursor-pointer flex items-center gap-1.5 shadow-3xs"
                                >
                                  <Upload className="w-3.5 h-3.5 text-brand-600" />
                                  <span>{lang === "zh-CN" || lang === "zh-TW" ? "直接上传提前写好的签名图片" : "Upload Pre-written Signature Image"}</span>
                                </button>
                              </div>
                            </div>
                          )}

                          <input
                            type="file"
                            id="prewritten-signature-upload-input"
                            className="hidden"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onload = (event) => {
                                  if (event.target?.result) {
                                    setFormSellerSignature(event.target.result as string);
                                  }
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                        </div>

                        {/* Stamp/Seal Image Upload */}
                        <div className="space-y-2 p-3 bg-slate-50/50 rounded-xl border border-slate-200 flex flex-col justify-between">
                          <div className="space-y-2">
                            <span className="text-[11px] font-extrabold text-slate-700 flex items-center gap-1">
                              <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />
                              {lang === "zh-CN" || lang === "zh-TW" ? "上传印章/盖章图片" : "Upload Seal / Stamp Image"}
                            </span>
                            
                            <p className="text-[10px] font-bold text-slate-400">
                              {lang === "zh-CN" || lang === "zh-TW" ? "推荐上传透明背景的 PNG 格式图片" : "Transparent PNG stamps recommended."}
                            </p>

                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                onClick={() => document.getElementById('seller-sig-file-input')?.click()}
                                className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-lg text-[10px] font-bold transition flex items-center gap-1.5 cursor-pointer shadow-3xs"
                              >
                                <Upload className="w-3.5 h-3.5 text-slate-500" />
                                <span>{lang === "zh-CN" || lang === "zh-TW" ? "选择印章图片" : "Select Image"}</span>
                              </button>
                              <input
                                type="file"
                                id="seller-sig-file-input"
                                className="hidden"
                                accept="image/*"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    const reader = new FileReader();
                                    reader.onload = (event) => {
                                      if (event.target?.result) {
                                        setFormSellerStamp(event.target.result as string);
                                      }
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                }}
                              />
                            </div>
                          </div>

                          {formSellerStamp && (
                            <div className="bg-white border border-slate-200 rounded-lg p-2 flex items-center justify-between gap-3 mt-1 shadow-3xs">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-slate-400">{lang === "zh-CN" || lang === "zh-TW" ? "预览:" : "Preview:"}</span>
                                <div className="h-10 w-20 border border-slate-100 rounded bg-slate-50 flex items-center justify-center overflow-hidden">
                                  <img src={formSellerStamp} className="max-h-full max-w-full object-contain" alt="Current Stamp" referrerPolicy="no-referrer" />
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5">
                                {(formStampX !== 0 || formStampY !== 0) && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setFormStampX(0);
                                      setFormStampY(0);
                                    }}
                                    className="text-[10px] font-black text-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 px-2 py-1 rounded transition cursor-pointer border border-indigo-100"
                                  >
                                    {lang === "zh-CN" || lang === "zh-TW" ? "重置位置" : "Reset Pos"}
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => setFormSellerStamp("")}
                                  className="text-[10px] font-black text-rose-500 hover:text-rose-600 hover:bg-rose-50 px-2 py-1 rounded transition cursor-pointer border border-rose-100"
                                >
                                  {lang === "zh-CN" || lang === "zh-TW" ? "删除印章" : "Delete Stamp"}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Panel Section 3: Buyer/Customer Custom Block */}
                <div className="space-y-4 border-t border-slate-100 pt-5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider border-l-3 border-amber-500 pl-2">
                      {getInvoiceTrans("sec_buyer", lang)}
                    </h4>
                    <span className="text-[10px] text-slate-400 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">{getInvoiceTrans("crm_tip", lang)}</span>
                  </div>

                  {/* Dropdown choosing to select existing Customer or Custom manual with search/filter */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500">
                      {getInvoiceTrans("crm_link_lbl", lang)}
                    </label>
                    <div className="relative" ref={custDropdownRef}>
                      <button
                        type="button"
                        onClick={() => {
                          setIsCustDropdownOpen(!isCustDropdownOpen);
                          setCustSearchQuery("");
                        }}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 outline-none hover:bg-white hover:border-brand-300 focus:border-brand-500 transition flex items-center justify-between cursor-pointer"
                      >
                        <span className="truncate">
                          {formCustomerId && formCustomerId !== "custom" ? (
                            (() => {
                              const c = customers.find(x => x.id === formCustomerId);
                              return c ? `[${c.id}] ${c.name} (${getInvoiceTrans("currency_lbl", lang)}: ${c.currency})` : getInvoiceTrans("crm_custom_opt", lang);
                            })()
                          ) : (
                            getInvoiceTrans("crm_custom_opt", lang)
                          )}
                        </span>
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1.5 shrink-0" />
                      </button>

                      {isCustDropdownOpen && (
                        <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 p-2 space-y-2 max-h-64 overflow-hidden flex flex-col">
                          {/* Search Input Box */}
                          <div className="relative flex items-center shrink-0">
                            <Search className="absolute left-2.5 w-3.5 h-3.5 text-slate-400" />
                            <input
                              type="text"
                              value={custSearchQuery}
                              onChange={(e) => setCustSearchQuery(e.target.value)}
                              placeholder={lang === "en" ? "Search ID or name..." : "搜索客户姓名或ID..."}
                              className="w-full pl-8 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 outline-none focus:bg-white focus:border-brand-500"
                              autoFocus
                            />
                            {custSearchQuery && (
                              <button
                                type="button"
                                onClick={() => setCustSearchQuery("")}
                                className="absolute right-2.5 p-0.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>

                          {/* Options List with Scroll */}
                          <div className="overflow-y-auto divide-y divide-slate-50 flex-1 max-h-48 pr-1">
                            {/* Manual entry option */}
                            <button
                              type="button"
                              onClick={() => {
                                handleCustomerChange("custom");
                                setIsCustDropdownOpen(false);
                              }}
                              className={cn(
                                "w-full text-left px-2.5 py-2 text-xs font-medium rounded-md transition duration-150 flex items-center justify-between hover:bg-slate-50 cursor-pointer",
                                (!formCustomerId || formCustomerId === "custom") ? "bg-brand-50/40 text-brand-700 font-bold" : "text-slate-600"
                              )}
                            >
                              <span>{getInvoiceTrans("crm_custom_opt", lang)}</span>
                              {(!formCustomerId || formCustomerId === "custom") && <Check className="w-3.5 h-3.5 text-brand-600" />}
                            </button>

                            {/* Dynamically Filtered Partners list */}
                            {(() => {
                              const filtered = customers.filter(c => {
                                const q = custSearchQuery.trim().toLowerCase();
                                if (!q) return true;
                                const nameMatch = c.name.toLowerCase().includes(q);
                                const cleanId = c.id.toLowerCase().replace(/^cust-?/i, '');
                                const idMatch = c.id.toLowerCase().startsWith(q) || cleanId.includes(q);
                                const contactMatch = c.contact?.toLowerCase().includes(q) || false;
                                return nameMatch || idMatch || contactMatch;
                              });

                              if (filtered.length === 0) {
                                return (
                                  <div className="px-2.5 py-4 text-center text-xs text-slate-400 font-medium">
                                    {lang === "en" ? "No matching customers" : "未找到匹配的客户"}
                                  </div>
                                );
                              }

                              return filtered.map(c => {
                                const isSelected = formCustomerId === c.id;
                                return (
                                  <button
                                    key={c.id}
                                    type="button"
                                    onClick={() => {
                                      handleCustomerChange(c.id);
                                      setIsCustDropdownOpen(false);
                                    }}
                                    className={cn(
                                      "w-full text-left px-2.5 py-2 text-xs font-medium rounded-md transition duration-150 flex items-center justify-between hover:bg-slate-50 cursor-pointer",
                                      isSelected ? "bg-brand-50/40 text-brand-700 font-bold" : "text-slate-600"
                                    )}
                                  >
                                    <div className="flex flex-col min-w-0 pr-2">
                                      <span className="font-bold truncate">[{c.id}] {c.name}</span>
                                      <span className="text-[10px] text-slate-400 mt-0.5 truncate">
                                        {getInvoiceTrans("currency_lbl", lang)}: {c.currency} {c.contact ? `| ${c.contact}` : ""}
                                      </span>
                                    </div>
                                    {isSelected && <Check className="w-3.5 h-3.5 text-brand-600 shrink-0" />}
                                  </button>
                                );
                              });
                            })()}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Buyer Logo Uploading */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-500">{getInvoiceTrans("logo_buyer_lbl", lang)}</label>
                    <div className="flex items-center gap-3 flex-wrap">
                      <button
                        type="button"
                        onClick={() => document.getElementById('buyer-logo-file-input')?.click()}
                        className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-3xs h-8"
                      >
                        <Upload className="w-3.5 h-3.5 text-slate-500" />
                        <span>{getInvoiceTrans("select_file_btn", lang)}</span>
                      </button>
                      <input
                        type="file"
                        id="buyer-logo-file-input"
                        className="hidden"
                        accept="image/*"
                        onChange={(e) => handleLogoUpload(e, false)}
                      />
                      {formBuyerLogo && (
                        <div className="flex items-center gap-2">
                          <div className="relative h-8 w-12 border border-slate-200 rounded-md overflow-hidden bg-white">
                            <img src={formBuyerLogo} className="h-full w-full object-contain" referrerPolicy="no-referrer" />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleClearLogo(false)}
                            className="text-xs font-bold text-rose-500 hover:text-rose-600 hover:bg-rose-50 px-2 py-1 rounded-md transition cursor-pointer"
                          >
                            {lang === "zh-CN" || lang === "zh-TW" ? "删除" : "Remove"}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Buyer fields inputs */}
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500">{getInvoiceTrans("buyer_name_input", lang)}</label>
                      <input
                        type="text"
                        value={formBuyerName}
                        onChange={(e) => setFormBuyerName(e.target.value)}
                        placeholder={getInvoiceTrans("buyer_name_placeholder", lang)}
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 outline-none focus:bg-white focus:border-brand-500 transition"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-500">{getInvoiceTrans("buyer_tax_input", lang)}</label>
                        <input
                          type="text"
                          value={formBuyerTaxNo}
                          onChange={(e) => setFormBuyerTaxNo(e.target.value)}
                          placeholder={lang === 'en' ? 'Optional' : lang === 'th' ? 'เลือกได้' : '可空'}
                          className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 outline-none focus:bg-white focus:border-brand-500 transition"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-500">{getInvoiceTrans("buyer_contact_input", lang)}</label>
                        <input
                          type="text"
                          value={formBuyerContact}
                          onChange={(e) => setFormBuyerContact(e.target.value)}
                          placeholder={lang === 'en' ? 'Optional' : lang === 'th' ? 'เลือกได้' : '可空'}
                          className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 outline-none focus:bg-white focus:border-brand-500 transition"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-500">{getInvoiceTrans("buyer_address_input", lang)}</label>
                        <input
                          type="text"
                          value={formBuyerAddress}
                          onChange={(e) => setFormBuyerAddress(e.target.value)}
                          placeholder={lang === 'en' ? 'Optional' : lang === 'th' ? 'เลือกได้' : '可空'}
                          className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 outline-none focus:bg-white focus:border-brand-500 transition"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-500">{getInvoiceTrans("buyer_phone_input", lang)}</label>
                        <input
                          type="text"
                          value={formBuyerPhone}
                          onChange={(e) => setFormBuyerPhone(e.target.value)}
                          placeholder={lang === 'en' ? 'Optional' : lang === 'th' ? 'เลือกได้' : '可空'}
                          className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 outline-none focus:bg-white focus:border-brand-500 transition"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-500">{getInvoiceTrans("buyer_account_input", lang)}</label>
                        <input
                          type="text"
                          value={formBuyerBankAccount}
                          onChange={(e) => setFormBuyerBankAccount(e.target.value)}
                          placeholder={lang === 'en' ? 'Optional' : lang === 'th' ? 'เลือกได้' : '可空'}
                          className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 outline-none focus:bg-white focus:border-brand-500 transition"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-500">{getInvoiceTrans("buyer_bank_input", lang)}</label>
                        <input
                          type="text"
                          value={formBuyerBankName}
                          onChange={(e) => setFormBuyerBankName(e.target.value)}
                          placeholder={lang === 'en' ? 'Optional' : lang === 'th' ? 'เลือกได้' : '可空'}
                          className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 outline-none focus:bg-white focus:border-brand-500 transition"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Panel Section 4: Line Items Editor Grid */}
                <div className="space-y-4 border-t border-slate-100 pt-5">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider border-l-3 border-brand-500 pl-2">
                    {getInvoiceTrans("sec_items", lang)}
                  </h4>

                  {/* Add Row Form Container */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 shadow-3xs">
                    <p className="text-[10px] font-black text-slate-500">{getInvoiceTrans("add_item_sec", lang)}</p>
                    
                    <div className="space-y-2">
                      <textarea
                        placeholder={getInvoiceTrans("item_desc_placeholder", lang)}
                        value={itemDesc}
                        onChange={(e) => setItemDesc(e.target.value)}
                        rows={2}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 outline-none focus:border-brand-500 transition resize-y min-h-[50px]"
                      />
                      
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <input
                            type="number"
                            placeholder={getInvoiceTrans("item_qty_placeholder", lang)}
                            value={itemQty}
                            onChange={(e) => setItemQty(e.target.value ? Number(e.target.value) : "")}
                            min={1}
                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 outline-none focus:border-brand-500 transition"
                          />
                        </div>
                        <div>
                          <input
                            type="number"
                            step="0.01"
                            placeholder={getInvoiceTrans("item_price_placeholder", lang)}
                            value={itemPrice}
                            onChange={(e) => setItemPrice(e.target.value ? Number(e.target.value) : "")}
                            min={0.01}
                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 outline-none focus:border-brand-500 transition"
                          />
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleAddItem}
                      className="w-full bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-200 py-1.5 rounded-lg text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      {getInvoiceTrans("item_add_btn_text", lang)}
                    </button>
                  </div>

                  {/* Added Items table listing */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                    <div className="bg-slate-50/70 p-2 border-b border-slate-200 text-[10px] font-extrabold text-slate-400 uppercase">
                      {getInvoiceTrans("added_items_title", lang)} ({formItems.length} {getInvoiceTrans("num_items_count", lang)})
                    </div>
                    {formItems.length === 0 ? (
                      <div className="p-6 text-center text-slate-400 text-xs font-bold flex flex-col items-center gap-1">
                        <AlertCircle className="w-5 h-5 text-slate-300" />
                        <span>{getInvoiceTrans("form_no_items_tip_text", lang)}</span>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100 text-xs font-semibold">
                        {formItems.map((item, index) => (
                          <div key={item.id} className="p-3 flex items-start justify-between gap-2 hover:bg-slate-50/30">
                            <div className="space-y-0.5">
                              <p className="font-extrabold text-slate-800 whitespace-pre-wrap">{index + 1}. {item.description}</p>
                              <p className="text-[10px] text-slate-400 font-bold">
                                {item.qty} {lang === 'en' ? 'Pcs' : lang === 'th' ? 'ชิ้น' : '件/次'} × {formatCurrency(item.unitPrice, formCurrency as any)}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 font-mono">
                                {formatCurrency(item.amount, formCurrency as any)}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(item.id)}
                                className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}

                        {/* Math Summary Box inside inputs */}
                        <div className="p-3 bg-slate-50 border-t border-slate-200 space-y-1.5 text-right font-semibold">
                          <p className="text-[11px] text-slate-500">
                            {getInvoiceTrans("subtotal_lbl", lang)} <span className="text-slate-800 font-mono">{formatCurrency(itemNetSubtotal, formCurrency as any)}</span>
                          </p>
                          {formInvoiceType !== "proforma" && (
                            <p className="text-[11px] text-slate-500">
                              {getInvoiceTrans("tax_lbl", lang)} ({formTaxRate}%): <span className="text-slate-800 font-mono">{formatCurrency(itemTaxAmount, formCurrency as any)}</span>
                            </p>
                          )}
                          <p className="text-xs font-extrabold text-slate-900">
                            {getInvoiceTrans("total_lbl", lang)} <span className="text-brand-600 font-black text-sm font-mono">{formatCurrency(itemSubtotal, formCurrency as any)}</span>
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Panel Section 5: Note Terms */}
                <div className="space-y-3 border-t border-slate-100 pt-5">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider border-l-3 border-slate-400 pl-2">
                    {getInvoiceTrans("sec_notes", lang)}
                  </h4>
                  <textarea
                    rows={3}
                    value={formNote}
                    onChange={(e) => setFormNote(e.target.value)}
                    placeholder={getInvoiceTrans("notes_placeholder", lang)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 outline-none focus:bg-white focus:border-brand-500 transition resize-none"
                  />
                </div>

                {/* Final bottom action */}
                <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    {getInvoiceTrans("btn_cancel_short", lang)}
                  </button>
                  <button
                    type="button"
                    disabled={isSaving} onClick={handleSaveInvoice}
                    className="bg-brand-600 hover:bg-brand-700 text-white px-5 py-2.5 rounded-xl text-xs font-black shadow-xs hover:shadow-md transition duration-200 cursor-pointer flex items-center gap-1"
                  >
                    <Check className="w-4 h-4" />
                    {getInvoiceTrans("save_and_ledger", lang)}
                  </button>
                </div>
              </div>

              {/* RIGHT COLUMN: Real-Time A4 Live Invoice Preview Panel (Scrollable) */}
              <div className={cn(
                "col-span-12 md:col-span-6 lg:col-span-7 h-full overflow-y-auto p-4 md:p-8 flex justify-center items-start bg-slate-100",
                mobileEditorTab === "preview" ? "block" : "hidden md:block"
              )}>
                {/* Scroll Sticky Helper wrapper to contain the paper nicely */}
                <div className="w-full max-w-3xl space-y-4 sticky top-0">
                  
                  <div className="flex items-center justify-between no-print px-1 text-slate-500 text-[10px] font-extrabold uppercase tracking-wider">
                    <span>{getInvoiceTrans("preview_title_live", lang)}</span>
                    <span className="text-emerald-600 animate-pulse flex items-center gap-1">{getInvoiceTrans("preview_sync_tip", lang)}</span>
                  </div>

                  {/* Standard Paper Document container */}
                  <div className="bg-white p-6 md:p-10 rounded-xl shadow-lg border border-slate-200 border-t-8 border-t-indigo-600 w-full min-h-[1000px] flex flex-col justify-between space-y-8 print-no-shadow print-p-0 relative" id="modal-live-preview-pane">
                    <div>
                      {/* Document Top Row Header */}
                      <div className="flex justify-between items-start gap-4 pb-6 border-b-2 border-indigo-100">
                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="flex items-center gap-3 min-w-0">
                            {formSellerLogo ? (
                              <div 
                                className="relative group cursor-pointer shrink-0"
                                onClick={() => document.getElementById('seller-logo-file-input')?.click()}
                                title={getInvoiceTrans("click_to_upload", lang)}
                              >
                                <div className="relative rounded-lg overflow-hidden border border-slate-200 p-1 bg-white hover:border-brand-500 hover:shadow-xs transition duration-200">
                                  <img 
                                    src={formSellerLogo} 
                                    alt="Live Seller Logo" 
                                    className="h-9 sm:h-10 w-auto object-contain max-w-[140px] sm:max-w-[160px] rounded" 
                                    referrerPolicy="no-referrer"
                                  />
                                  <div className="absolute inset-0 bg-indigo-950/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition duration-200 gap-0.5 rounded">
                                    <Upload className="w-3 h-3 text-white animate-bounce" />
                                    <span className="text-[7px] font-black uppercase tracking-wider">{getInvoiceTrans("click_to_upload", lang)}</span>
                                  </div>
                                </div>
                              </div>
                            ) : null}

                            <h2 className="text-sm sm:text-base font-extrabold text-indigo-950 tracking-tight leading-tight truncate">
                              {formSellerName || "WMS HR Logistics"}
                            </h2>
                          </div>

                          <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 text-[11px] text-slate-700 leading-snug">
                            {formSellerAddress && (
                              <>
                                <span className="text-slate-400 font-medium whitespace-nowrap shrink-0">{getInvoiceTrans("address_lbl", lang)}:</span>
                                <span className="text-slate-700 font-medium break-all min-w-0">{formSellerAddress}</span>
                              </>
                            )}
                            {formSellerContact && (
                              <>
                                <span className="text-slate-400 font-medium whitespace-nowrap shrink-0">{getInvoiceTrans("contact_lbl", lang)}:</span>
                                <span className="text-slate-700 font-medium break-all min-w-0">{formSellerContact}</span>
                              </>
                            )}
                            {formSellerPhone && (
                              <>
                                <span className="text-slate-400 font-medium whitespace-nowrap shrink-0">{getInvoiceTrans("phone_lbl", lang)}:</span>
                                <span className="text-slate-700 font-medium break-all min-w-0">{formSellerPhone}</span>
                              </>
                            )}
                            {formSellerTaxNo && (
                              <>
                                <span className="text-slate-400 font-medium whitespace-nowrap shrink-0">{getInvoiceTrans("tax_no_lbl", lang)}:</span>
                                <span className="text-slate-700 font-mono font-medium break-all min-w-0">{formSellerTaxNo}</span>
                              </>
                            )}
                            {formSellerBankName && (
                              <>
                                <span className="text-slate-400 font-medium whitespace-nowrap shrink-0">{getInvoiceTrans("seller_bank_input", lang)}:</span>
                                <span className="text-slate-700 font-medium break-all min-w-0">{formSellerBankName}</span>
                              </>
                            )}
                            {formSellerBankAccount && (
                              <>
                                <span className="text-slate-400 font-medium whitespace-nowrap shrink-0">{getInvoiceTrans("seller_account_input", lang)}:</span>
                                <span className="text-slate-700 font-mono font-medium break-all min-w-0">{formSellerBankAccount}</span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="text-right space-y-1 flex flex-col items-end flex-shrink-0">
                          <h1 className="text-lg md:text-xl font-extrabold text-indigo-950 tracking-tight font-sans">
                            {getInvoiceTypeLabel(formInvoiceType, lang)}
                          </h1>
                          <div className="text-[11px] mt-0.5 pt-1 border-t border-indigo-100 w-full flex flex-col items-end">
                            <div className="grid grid-cols-[auto_auto] gap-x-1.5 gap-y-0.5 text-left leading-snug">
                              <span className="text-slate-500 font-semibold">{getInvoiceTrans("doc_no_lbl", lang)}</span>
                              <div className="text-slate-500 flex items-center">
                                <span className="mr-1.5 font-semibold text-slate-500">:</span>
                                <span className="font-mono font-medium text-slate-500">{formInvoiceNo || "INV-PENDING"}</span>
                              </div>
                              <span className="text-slate-500 font-semibold">{getInvoiceTrans("date_lbl", lang)}</span>
                              <div className="text-slate-500 flex items-center">
                                <span className="mr-1.5 font-semibold text-slate-500">:</span>
                                <span className="font-medium text-slate-500">{formIssueDate || "2026-07-08"}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Bilateral Company details summary block (Left = Buyer, Right = Details) */}
                      <div className="grid grid-cols-12 gap-6 pt-6 pb-2">
                        {/* Buyer summary on the left - 7-8 cols */}
                        <div className="col-span-12 sm:col-span-7 md:col-span-8 border-b sm:border-b-0 sm:border-r border-slate-100 pb-4 sm:pb-0 sm:pr-4 space-y-2">
                          {(formBuyerLogo || formBuyerName) && (
                            <div className="flex items-center gap-2.5 min-w-0">
                              {formBuyerLogo ? (
                                <div 
                                  className="relative group cursor-pointer shrink-0 animate-fade-in"
                                  onClick={() => document.getElementById('buyer-logo-file-input')?.click()}
                                  title={getInvoiceTrans("click_to_upload", lang)}
                                >
                                  <div className="relative rounded-lg overflow-hidden border border-slate-200 p-0.5 bg-white hover:border-brand-500 hover:shadow-xs transition duration-200">
                                    <img 
                                      src={formBuyerLogo} 
                                      alt="Live Buyer Logo" 
                                      className="h-8 sm:h-9 w-auto object-contain max-w-[120px] rounded" 
                                      referrerPolicy="no-referrer"
                                    />
                                    <div className="absolute inset-0 bg-indigo-950/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition duration-200 gap-0.5 rounded">
                                      <Upload className="w-3 h-3 text-white animate-bounce" />
                                      <span className="text-[7px] font-black uppercase tracking-wider">{getInvoiceTrans("click_to_upload", lang)}</span>
                                    </div>
                                  </div>
                                </div>
                              ) : null}
                              {formBuyerName && (
                                <p className="font-extrabold text-slate-900 text-sm tracking-tight leading-tight truncate">
                                  {formBuyerName}
                                </p>
                              )}
                            </div>
                          )}

                          {(formBuyerTaxNo || formBuyerBankName || formBuyerBankAccount || formBuyerAddress || formBuyerContact || formBuyerPhone) ? (
                            <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 text-[11px] text-slate-700 leading-snug">
                              {formBuyerAddress && (
                                <>
                                  <span className="text-slate-400 font-medium whitespace-nowrap shrink-0">{getInvoiceTrans("buyer_address_input", lang)}:</span>
                                  <span className="text-slate-700 font-medium break-all min-w-0">{formBuyerAddress}</span>
                                </>
                              )}
                              {formBuyerContact && (
                                <>
                                  <span className="text-slate-400 font-medium whitespace-nowrap shrink-0">{getInvoiceTrans("buyer_contact_input", lang)}:</span>
                                  <span className="text-slate-700 font-medium break-all min-w-0">{formBuyerContact}</span>
                                </>
                              )}
                              {formBuyerPhone && (
                                <>
                                  <span className="text-slate-400 font-medium whitespace-nowrap shrink-0">{getInvoiceTrans("buyer_phone_input", lang)}:</span>
                                  <span className="text-slate-700 font-medium break-all min-w-0">{formBuyerPhone}</span>
                                </>
                              )}
                              {formBuyerTaxNo && (
                                <>
                                  <span className="text-slate-400 font-medium whitespace-nowrap shrink-0">{getInvoiceTrans("buyer_tax_input", lang)}:</span>
                                  <span className="text-slate-700 font-mono font-medium break-all min-w-0">{formBuyerTaxNo}</span>
                                </>
                              )}
                              {formBuyerBankAccount && (
                                <>
                                  <span className="text-slate-400 font-medium whitespace-nowrap shrink-0">{getInvoiceTrans("buyer_account_input", lang)}:</span>
                                  <span className="text-slate-700 font-mono font-medium break-all min-w-0">{formBuyerBankAccount}</span>
                                </>
                              )}
                              {formBuyerBankName && (
                                <>
                                  <span className="text-slate-400 font-medium whitespace-nowrap shrink-0">{getInvoiceTrans("buyer_bank_input", lang)}:</span>
                                  <span className="text-slate-700 font-medium break-all min-w-0">{formBuyerBankName}</span>
                                </>
                              )}
                            </div>
                          ) : null}
                        </div>

                        {/* Invoice metadata columns on the right - 5 cols */}
                        <div className={`col-span-5 flex justify-end items-start ${formBuyerName ? "pt-[28px]" : "pt-1.5"}`}>
                          <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-[11px] leading-snug">
                            <div className="text-slate-400 font-medium text-right whitespace-nowrap">
                              {getInvoiceTrans("due_date_lbl", lang)}{lang === 'zh-CN' || lang === 'zh-TW' ? '：' : ': '}
                            </div>
                            <div className="font-bold text-slate-700 text-left">
                              {formDueDate || getInvoiceTrans("unlimited_lbl", lang)}
                            </div>
                            <div className="text-slate-400 font-medium text-right whitespace-nowrap">
                              {getInvoiceTrans("currency_lbl", lang)}{lang === 'zh-CN' || lang === 'zh-TW' ? '：' : ': '}
                            </div>
                            <div className="font-bold text-slate-700 font-mono text-left">
                              {formCurrency}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Items Listing Table inside Preview */}
                      <div className="space-y-2 mt-6">
                        <div className="bg-indigo-50/70 text-indigo-950 text-xs font-black px-2 py-1.5 rounded-t-lg border-b border-indigo-100 uppercase tracking-wider">
                          {getInvoiceTrans("items_sec_lbl", lang)}
                        </div>
                        <table className="w-full text-left border-collapse text-xs text-slate-700">
                          <thead>
                            <tr className="border-b border-slate-200 text-slate-400 text-[10px] font-bold uppercase bg-slate-50">
                              <th className="py-2 px-2 w-10 text-center">{getInvoiceTrans("th_hash", lang)}</th>
                              <th className="py-2 px-2">{getInvoiceTrans("th_description", lang)}</th>
                              <th className="py-2 px-2 text-right w-20">{getInvoiceTrans("th_qty", lang)}</th>
                              <th className="py-2 px-2 text-right w-28">{getInvoiceTrans("th_price", lang)}</th>
                              <th className="py-2 px-2 text-right w-32">{getInvoiceTrans("th_amount", lang)}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {formItems.length === 0 ? (
                              <tr>
                                <td colSpan={5} className="py-8 text-center text-slate-400 text-xs font-bold">
                                  {getInvoiceTrans("form_no_items_tip", lang)}
                                </td>
                              </tr>
                            ) : (
                              formItems.map((item, index) => (
                                <tr key={item.id} className="hover:bg-slate-50/30">
                                  <td className="py-2.5 px-2 text-center text-slate-400 font-mono">{index + 1}</td>
                                  <td className="py-2.5 px-2 font-medium text-slate-900 whitespace-pre-wrap">{item.description}</td>
                                  <td className="py-2.5 px-2 text-right font-mono text-slate-600">{item.qty}</td>
                                  <td className="py-2.5 px-2 text-right font-mono text-slate-600">{formatCurrency(item.unitPrice, formCurrency as any)}</td>
                                  <td className="py-2.5 px-2 text-right font-bold font-mono text-slate-900">
                                    {formatCurrency(item.amount, formCurrency as any)}
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* Totals Summary */}
                      <div className="flex justify-end pt-4 border-t border-slate-200 mt-4">
                        <div className="w-80 space-y-2 text-xs">
                          <div className="flex justify-between text-slate-500 px-2">
                            <span>{getInvoiceTrans("subtotal_lbl", lang)}</span>
                            <span className="font-mono font-semibold text-slate-800">{formatCurrency(itemNetSubtotal, formCurrency as any)}</span>
                          </div>
                          {formInvoiceType !== "proforma" && (
                            <div className="flex justify-between text-slate-500 px-2">
                              <span>{getInvoiceTrans("tax_lbl", lang)} ({formTaxRate}%):</span>
                              <span className="font-mono font-semibold text-slate-800">{formatCurrency(itemTaxAmount, formCurrency as any)}</span>
                            </div>
                          )}
                          
                          {/* Highlighted Grand Total row */}
                          <div className="flex justify-between items-center text-sm font-black text-indigo-950 bg-indigo-50/80 px-3 py-2 rounded-lg border border-indigo-100">
                            <span>{getInvoiceTrans("total_lbl", lang)}</span>
                            <span className="font-mono text-lg text-indigo-600 font-black">
                              {formatCurrency(itemSubtotal, formCurrency as any)}
                            </span>
                          </div>
                        </div>
                      </div>



                    </div>

                    {/* Footer stamps / notes / signatures */}
                    <div className="pt-6 border-t border-slate-100 mt-6 space-y-6">
                      {/* Note info */}
                      <div className="space-y-1.5 text-xs text-slate-500 font-normal">
                        <p className="font-bold text-slate-700 text-[10px] uppercase tracking-wider">{getInvoiceTrans("notes_terms_lbl", lang)}</p>
                        <p className="leading-relaxed text-[10px] text-slate-400">
                          {formNote || getInvoiceTrans("default_notes_desc", lang)}
                        </p>
                      </div>

                      {/* Double Signatures block */}
                      <div className="grid grid-cols-2 gap-24 md:gap-32 pt-4">
                        {/* Customer signature */}
                        <div className="text-center space-y-6 flex flex-col justify-end items-center">
                          <p className="text-[10px] font-bold text-indigo-900 uppercase tracking-wider">{getInvoiceTrans("client_sig_lbl", lang)}</p>
                          <div className="w-48 border-b border-slate-300 h-10"></div>
                          <div className="text-[10px] text-slate-500 leading-normal">
                            <p className="whitespace-nowrap">{getInvoiceTrans("date_prefix_lbl", lang)}{getInvoiceTrans("date_cn_year", lang)}</p>
                          </div>
                        </div>

                        {/* Issuer signature */}
                        <div className="text-center space-y-6 flex flex-col justify-end items-center relative min-h-[90px] border border-dashed border-slate-100 hover:border-indigo-200 rounded-lg p-1 transition select-none">
                          {formSellerSignature && (
                            <div 
                              className={cn(
                                "absolute top-0 h-16 w-32 flex items-center justify-center z-10 cursor-grab active:cursor-grabbing hover:bg-brand-50/10 rounded-md border border-transparent hover:border-brand-300 hover:shadow-xs transition-shadow group/sig select-none touch-none",
                                isDraggingSig && "cursor-grabbing border-brand-500 bg-brand-50/20 shadow-sm"
                              )}
                              style={{ transform: `translate(${formSigX}px, ${formSigY}px)` }}
                              onMouseDown={handleSigStart}
                              onTouchStart={handleSigStart}
                              title={lang === "zh-CN" || lang === "zh-TW" ? "鼠标/触屏拖拽移动签名位置" : "Drag to move signature position"}
                            >
                              <img src={formSellerSignature} className="max-h-full max-w-full object-contain pointer-events-none select-none" alt="signature" referrerPolicy="no-referrer" />
                              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-indigo-600 text-[8px] font-black text-white px-1 rounded-sm opacity-0 group-hover/sig:opacity-100 transition whitespace-nowrap shadow-3xs">
                                {lang === "zh-CN" || lang === "zh-TW" ? "拖拽移动" : "Drag to move"}
                              </div>
                            </div>
                          )}

                          {formSellerStamp && (
                            <div 
                              className={cn(
                                "absolute -top-4 -right-2 h-24 w-24 flex items-center justify-center opacity-85 z-20 cursor-grab active:cursor-grabbing hover:bg-brand-50/10 rounded-full border border-transparent hover:border-brand-300 transition-shadow group/stamp select-none touch-none",
                                isDraggingStamp && "cursor-grabbing border-brand-500 bg-brand-50/20 shadow-sm"
                              )}
                              style={{ transform: `rotate(6deg) translate(${formStampX}px, ${formStampY}px)` }}
                              onMouseDown={handleStampStart}
                              onTouchStart={handleStampStart}
                              title={lang === "zh-CN" || lang === "zh-TW" ? "鼠标/触屏拖拽移动印章位置" : "Drag to move stamp position"}
                            >
                              <img src={formSellerStamp} className="max-h-full max-w-full object-contain pointer-events-none select-none" alt="stamp" referrerPolicy="no-referrer" />
                              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-amber-600 text-[8px] font-black text-white px-1 rounded-sm opacity-0 group-hover/stamp:opacity-100 transition whitespace-nowrap shadow-3xs">
                                {lang === "zh-CN" || lang === "zh-TW" ? "拖拽移动" : "Drag to move"}
                              </div>
                            </div>
                          )}

                          <p className="text-[10px] font-bold text-indigo-900 uppercase tracking-wider">{getInvoiceTrans("auth_sig_lbl", lang)}</p>
                          <div className="w-48 border-b border-slate-300 h-10"></div>
                          <div className="text-[10px] text-slate-500 leading-normal">
                            <p>{getInvoiceTrans("date_prefix_lbl", lang)}{formIssueDate || "2026-07-08"}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              </div>

          </div>
        </div>
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