import { useState, useMemo, useEffect, useCallback } from "react";
import { Customer, Invoice, InvoiceItem, InvoiceStatus } from "../types";
import { CUSTOMER_PRESETS } from "../constants";

interface UseInvoiceFormOptions {
  customers: Customer[];
  invoices: Invoice[];
  setInvoices: React.Dispatch<React.SetStateAction<Invoice[]>>;
  addToast: (msg: string, type?: "success" | "error" | "info") => void;
}

export function useInvoiceForm({
  customers,
  invoices,
  setInvoices,
  addToast,
}: UseInvoiceFormOptions) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [mobileEditorTab, setMobileEditorTab] = useState<"edit" | "preview">("edit");

  // Form Field States
  const [formCustomerId, setFormCustomerId] = useState("");
  const [formInvoiceNo, setFormInvoiceNo] = useState("");
  const [formIssueDate, setFormIssueDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [formDueDate, setFormDueDate] = useState("");
  const [formInvoiceType, setFormInvoiceType] = useState<string>("增值税专用发票");
  const [formCopyText, setFormCopyText] = useState<string>("ต้นฉบับ / ORIGINAL");
  const [formTaxRate, setFormTaxRate] = useState<number>(6);
  const [formCurrency, setFormCurrency] = useState("CNY");
  const [formNote, setFormNote] = useState("");
  const [formStatus, setFormStatus] = useState<InvoiceStatus>("draft");
  const [formItems, setFormItems] = useState<InvoiceItem[]>([]);

  // Item Inputs
  const [itemDesc, setItemDesc] = useState("");
  const [itemQty, setItemQty] = useState<number | string>("");
  const [itemPrice, setItemPrice] = useState<number | string>("");

  // Seller Details
  const [formSellerName, setFormSellerName] = useState(() => localStorage.getItem("last_formSellerName") ?? "WMS HR Overseas Logistics Group Ltd.");
  const [formSellerTaxNo, setFormSellerTaxNo] = useState(() => localStorage.getItem("last_formSellerTaxNo") ?? "91310115MA1H7XW5XT");
  const [formSellerBankName, setFormSellerBankName] = useState(() => localStorage.getItem("last_formSellerBankName") ?? "中国建设银行上海浦东分行");
  const [formSellerBankAccount, setFormSellerBankAccount] = useState(() => localStorage.getItem("last_formSellerBankAccount") ?? "6217 0021 3004 5589 101");
  const [formSellerAddress, setFormSellerAddress] = useState(() => localStorage.getItem("last_formSellerAddress") ?? "上海市浦东新区张江高科园区博雅路455号");
  const [formSellerContact, setFormSellerContact] = useState(() => localStorage.getItem("last_formSellerContact") ?? "张经理");
  const [formSellerPhone, setFormSellerPhone] = useState(() => localStorage.getItem("last_formSellerPhone") ?? "+66 2 123 4567");
  const [formSellerLogo, setFormSellerLogo] = useState(() => localStorage.getItem("last_formSellerLogo") ?? "");
  const [formSellerSignature, setFormSellerSignature] = useState(() => localStorage.getItem("last_formSellerSignature") ?? "");
  const [formSellerStamp, setFormSellerStamp] = useState(() => localStorage.getItem("last_formSellerStamp") ?? "");

  // Buyer Details
  const [formBuyerName, setFormBuyerName] = useState("");
  const [formBuyerTaxNo, setFormBuyerTaxNo] = useState("");
  const [formBuyerBankName, setFormBuyerBankName] = useState("");
  const [formBuyerBankAccount, setFormBuyerBankAccount] = useState("");
  const [formBuyerAddress, setFormBuyerAddress] = useState("");
  const [formBuyerContact, setFormBuyerContact] = useState("");
  const [formBuyerPhone, setFormBuyerPhone] = useState("");
  const [formBuyerLogo, setFormBuyerLogo] = useState("");

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
      y: clientY - formSigY,
    });
  };

  const handleStampStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    setIsDraggingStamp(true);
    setStampDragStart({
      x: clientX - formStampX,
      y: clientY - formStampY,
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
  }, [isDraggingSig, isDraggingStamp, sigDragStart, stampDragStart]);

  // Generate unique invoice number
  const handleGenerateInvoiceNo = useCallback(() => {
    const prefix = "INV-";
    const dateStr = new Date().toISOString().split("T")[0].replace(/-/g, "");
    const random = Math.floor(1000 + Math.random() * 9000);
    setFormInvoiceNo(`${prefix}${dateStr}${random}`);
  }, []);

  // Sync invoiceNo when opening form to create
  useEffect(() => {
    if (isFormOpen && !editingInvoice && !formInvoiceNo) {
      handleGenerateInvoiceNo();
    }
  }, [isFormOpen, editingInvoice, formInvoiceNo, handleGenerateInvoiceNo]);

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
      addToast("❌ 请填写项目描述", "error");
      return;
    }
    if (!itemQty || Number(itemQty) <= 0) {
      addToast("❌ 请填写有效的数量", "error");
      return;
    }
    if (!itemPrice || Number(itemPrice) <= 0) {
      addToast("❌ 请填写有效的单价", "error");
      return;
    }

    const newItem: InvoiceItem = {
      id: `item-${Date.now()}`,
      description: itemDesc.trim(),
      qty: Number(itemQty),
      unitPrice: Number(itemPrice),
      amount: Number((Number(itemQty) * Number(itemPrice)).toFixed(2))
    };

    setFormItems(prev => [...prev, newItem]);
    setItemDesc("");
    setItemQty("");
    setItemPrice("");
    addToast("✅ 服务明细已添加", "success");
  };

  // Remove item
  const handleRemoveItem = (id: string) => {
    setFormItems(prev => prev.filter(item => item.id !== id));
  };

  // Logo file uploads handling (Read as Base64 to save offline in localStorage)
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>, isSeller: boolean) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2.5 * 1024 * 1024) {
        addToast("❌ 上传的文件过大！请选择小于 2.5MB 的 Logo 图片", "error");
        e.target.value = "";
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
        addToast(`✅ ${isSeller ? "开票方" : "购买方"} Logo 上传成功！`, "success");
        e.target.value = "";
      };
      reader.onerror = () => {
        addToast("❌ 文件读取失败，请重试", "error");
        e.target.value = "";
      };
      reader.readAsDataURL(file);
    }
  };

  // Clear logo strings
  const handleClearLogo = (isSeller: boolean) => {
    if (isSeller) {
      setFormSellerLogo("");
      const fileInput = document.getElementById("seller-logo-file-input") as HTMLInputElement | null;
      if (fileInput) fileInput.value = "";
    } else {
      setFormBuyerLogo("");
      const fileInput = document.getElementById("buyer-logo-file-input") as HTMLInputElement | null;
      if (fileInput) fileInput.value = "";
    }
    addToast(`ℹ️ 已清除${isSeller ? "开票方" : "购买方"} Logo`, "info");
  };

  // Handle Customer Selection Sync
  const handleCustomerChange = (customerId: string) => {
    setFormCustomerId(customerId);
    const selectedCustomer = customers.find(c => c.id === customerId);
    
    if (selectedCustomer) {
      setFormCurrency(selectedCustomer.currency || "CNY");
      setFormBuyerName(selectedCustomer.name);
      
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
        setFormBuyerTaxNo("");
        setFormBuyerBankName("");
        setFormBuyerBankAccount("");
        setFormBuyerAddress("");
        setFormBuyerContact("");
        setFormBuyerPhone("");
        setFormBuyerLogo("");
      }
      addToast(`🤝 已同步关联客户: ${selectedCustomer.name}`, "info");
    } else if (customerId === "custom") {
      setFormBuyerName("");
      setFormBuyerTaxNo("");
      setFormBuyerBankName("");
      setFormBuyerBankAccount("");
      setFormBuyerAddress("");
      setFormBuyerContact("");
      setFormBuyerPhone("");
      setFormBuyerLogo("");
      addToast("✍️ 已切换为：手动自定义客户信息", "info");
    }
  };

  // Reset Form
  const resetForm = () => {
    setEditingInvoice(null);
    setFormCustomerId("");
    setFormInvoiceNo("");
    setFormIssueDate(new Date().toISOString().split("T")[0]);
    setFormDueDate("");
    setFormInvoiceType("增值税专用发票");
    setFormCopyText("ต้นฉบับ / ORIGINAL");
    setFormTaxRate(6);
    setFormCurrency("CNY");
    setFormNote("");
    setFormStatus("draft");
    setFormItems([]);
    
    // Reset Seller Details to last filled from localStorage
    setFormSellerName(localStorage.getItem("last_formSellerName") ?? "WMS HR Overseas Logistics Group Ltd.");
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
    setFormSellerName(inv.sellerName ?? "WMS HR Overseas Logistics Group Ltd.");
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
  const handleSaveInvoice = (e: React.FormEvent) => {
    e.preventDefault();

    let invoiceNoToSave = formInvoiceNo.trim();
    if (!invoiceNoToSave) {
      const prefix = "INV-";
      const dateStr = new Date().toISOString().split("T")[0].replace(/-/g, "");
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

    if (editingInvoice) {
      setInvoices(prev => prev.map(inv => inv.id === editingInvoice.id ? invoiceData : inv));
      addToast(`🎉 发票 ${invoiceData.invoiceNo} 更新成功！`, "success");
    } else {
      setInvoices(prev => [invoiceData, ...prev]);
      addToast(`🎉 新增发票 ${invoiceData.invoiceNo} 成功并登记入账！`, "success");
    }

    setIsFormOpen(false);
    resetForm();
  };

  return {
    isFormOpen,
    setIsFormOpen,
    editingInvoice,
    mobileEditorTab,
    setMobileEditorTab,
    formCustomerId,
    setFormCustomerId,
    formInvoiceNo,
    setFormInvoiceNo,
    formIssueDate,
    setFormIssueDate,
    formDueDate,
    setFormDueDate,
    formInvoiceType,
    setFormInvoiceType,
    formCopyText,
    setFormCopyText,
    formTaxRate,
    setFormTaxRate,
    formCurrency,
    setFormCurrency,
    formNote,
    setFormNote,
    formStatus,
    setFormStatus,
    formItems,
    setFormItems,
    itemDesc,
    setItemDesc,
    itemQty,
    setItemQty,
    itemPrice,
    setItemPrice,
    formSellerName,
    setFormSellerName,
    formSellerTaxNo,
    setFormSellerTaxNo,
    formSellerBankName,
    setFormSellerBankName,
    formSellerBankAccount,
    setFormSellerBankAccount,
    formSellerAddress,
    setFormSellerAddress,
    formSellerContact,
    setFormSellerContact,
    formSellerPhone,
    setFormSellerPhone,
    formSellerLogo,
    setFormSellerLogo,
    formSellerSignature,
    setFormSellerSignature,
    formSellerStamp,
    setFormSellerStamp,
    formBuyerName,
    setFormBuyerName,
    formBuyerTaxNo,
    setFormBuyerTaxNo,
    formBuyerBankName,
    setFormBuyerBankName,
    formBuyerBankAccount,
    setFormBuyerBankAccount,
    formBuyerAddress,
    setFormBuyerAddress,
    formBuyerContact,
    setFormBuyerContact,
    formBuyerPhone,
    setFormBuyerPhone,
    formBuyerLogo,
    setFormBuyerLogo,
    formSigX,
    setFormSigX,
    formSigY,
    setFormSigY,
    formStampX,
    setFormStampX,
    formStampY,
    setFormStampY,
    handleSigStart,
    handleStampStart,
    itemSubtotal,
    itemTaxAmount,
    itemNetSubtotal,
    handleAddItem,
    handleRemoveItem,
    handleLogoUpload,
    handleClearLogo,
    handleCustomerChange,
    resetForm,
    handleOpenCreate,
    handleOpenEdit,
    handleGenerateInvoiceNo,
    handleSaveInvoice,
  };
}
