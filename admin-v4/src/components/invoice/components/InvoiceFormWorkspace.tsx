import React, { useRef, useState } from "react";
import {
  ArrowLeft, Check, Download, FileSignature, Plus, Upload, Trash2, Move,
  ChevronDown, Search, X, Loader2
} from "lucide-react";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { DatePicker as UIDatePicker } from "../../ui/date-picker";
import { cn, formatCurrency } from "../../../lib/utils";
import { Invoice, InvoiceItem, Customer, Language } from "../types";
import { getInvoiceTrans, getCurrencyDisplayName } from "../constants";
import { printElement } from "../utils/printInvoice";
import { InvoiceLivePreview } from "./InvoiceLivePreview";
import { InvoiceLanguageSelect, InvoiceDocLanguage } from "./InvoiceLanguageSelect";

interface InvoiceFormWorkspaceProps {
  isFormOpen: boolean;
  setIsFormOpen: (open: boolean) => void;
  editingInvoice: Invoice | null;
  isSaving: boolean;
  handleSaveInvoice: (e: React.FormEvent) => void;
  customers: Customer[];
  lang: Language;
  // Form fields
  formCustomerId: string;
  setFormCustomerId: (v: string) => void;
  formInvoiceNo: string;
  setFormInvoiceNo: (v: string) => void;
  formIssueDate: string;
  setFormIssueDate: (v: string) => void;
  formDueDate: string;
  setFormDueDate: (v: string) => void;
  formInvoiceType: string;
  setFormInvoiceType: (v: string) => void;
  formCopyText: string;
  setFormCopyText: (v: string) => void;
  formTaxRate: number;
  setFormTaxRate: (v: number) => void;
  formCurrency: string;
  setFormCurrency: (v: string) => void;
  formNote: string;
  setFormNote: (v: string) => void;
  formStatus: "draft" | "pending" | "paid" | "overdue" | "canceled";
  setFormStatus: (v: "draft" | "pending" | "paid" | "overdue" | "canceled") => void;
  formItems: InvoiceItem[];
  setFormItems: React.Dispatch<React.SetStateAction<InvoiceItem[]>>;
  itemDesc: string;
  setItemDesc: (v: string) => void;
  itemQty: number | string;
  setItemQty: (v: number | string) => void;
  itemPrice: number | string;
  setItemPrice: (v: number | string) => void;
  // Seller
  formSellerName: string;
  setFormSellerName: (v: string) => void;
  formSellerTaxNo: string;
  setFormSellerTaxNo: (v: string) => void;
  formSellerBankName: string;
  setFormSellerBankName: (v: string) => void;
  formSellerBankAccount: string;
  setFormSellerBankAccount: (v: string) => void;
  formSellerAddress: string;
  setFormSellerAddress: (v: string) => void;
  formSellerContact: string;
  setFormSellerContact: (v: string) => void;
  formSellerPhone: string;
  setFormSellerPhone: (v: string) => void;
  formSellerLogo: string;
  setFormSellerLogo: (v: string) => void;
  formSellerSignature: string;
  setFormSellerSignature: (v: string) => void;
  formSellerStamp: string;
  setFormSellerStamp: (v: string) => void;
  // Buyer
  formBuyerName: string;
  setFormBuyerName: (v: string) => void;
  formBuyerTaxNo: string;
  setFormBuyerTaxNo: (v: string) => void;
  formBuyerBankName: string;
  setFormBuyerBankName: (v: string) => void;
  formBuyerBankAccount: string;
  setFormBuyerBankAccount: (v: string) => void;
  formBuyerAddress: string;
  setFormBuyerAddress: (v: string) => void;
  formBuyerContact: string;
  setFormBuyerContact: (v: string) => void;
  formBuyerPhone: string;
  setFormBuyerPhone: (v: string) => void;
  formBuyerLogo: string;
  setFormBuyerLogo: (v: string) => void;
  // Positions & Dragging
  formSigX: number;
  setFormSigX: (v: number) => void;
  formSigY: number;
  setFormSigY: (v: number) => void;
  formStampX: number;
  setFormStampX: (v: number) => void;
  formStampY: number;
  setFormStampY: (v: number) => void;
  isDraggingSig: boolean;
  isDraggingStamp: boolean;
  handleSigStart: (e: React.MouseEvent | React.TouchEvent) => void;
  handleStampStart: (e: React.MouseEvent | React.TouchEvent) => void;
  // Handlers
  handleGenerateInvoiceNo: () => void;
  handleAddItem: () => void;
  handleRemoveItem: (id: string) => void;
  handleLogoUpload: (e: React.ChangeEvent<HTMLInputElement>, isSeller: boolean) => void;
  handleClearLogo: (isSeller: boolean) => void;
  handleCustomerChange: (customerId: string) => void;
  setIsSigModalOpen: (open: boolean) => void;
  // Calculated totals
  itemSubtotal: number;
  itemTaxAmount: number;
  itemNetSubtotal: number;
  mobileEditorTab: "edit" | "preview";
  setMobileEditorTab: (tab: "edit" | "preview") => void;
}

export const InvoiceFormWorkspace: React.FC<InvoiceFormWorkspaceProps> = ({
  setIsFormOpen,
  editingInvoice,
  isSaving,
  handleSaveInvoice,
  customers,
  lang,
  formCustomerId,
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
  formSigX,
  setFormSigX,
  formSigY,
  setFormSigY,
  formStampX,
  setFormStampX,
  formStampY,
  setFormStampY,
  isDraggingSig,
  isDraggingStamp,
  handleSigStart,
  handleStampStart,
  handleGenerateInvoiceNo,
  handleAddItem,
  handleRemoveItem,
  handleLogoUpload,
  handleClearLogo,
  handleCustomerChange,
  setIsSigModalOpen,
  itemSubtotal,
  itemTaxAmount,
  itemNetSubtotal,
  mobileEditorTab,
  setMobileEditorTab,
}) => {
  const custDropdownRef = useRef<HTMLDivElement>(null);
  // Document language for live preview & print export (independent from system UI lang)
  const [docLang, setDocLang] = useState<InvoiceDocLanguage>(() => (lang === "en" ? "en" : "zh-CN"));
  const [isCustDropdownOpen, setIsCustDropdownOpen] = React.useState(false);
  const [custSearchQuery, setCustSearchQuery] = React.useState("");

  React.useEffect(() => {
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

  return (
    <div className="bg-white w-full rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden h-[calc(100vh-8.5rem)] min-h-[650px]">
      {/* Split Screen Header */}
      <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/80">
        <div className="flex items-center gap-3.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsFormOpen(false)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-600 hover:text-slate-950 hover:bg-slate-100 border border-slate-200 rounded-xl transition cursor-pointer shadow-3xs h-auto"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            {getInvoiceTrans("back_to_list", lang)}
          </Button>
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
          <Button
            type="button"
            disabled={isSaving}
            onClick={handleSaveInvoice}
            className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-xl text-xs font-black shadow-xs hover:shadow-md transition duration-200 cursor-pointer flex items-center gap-1.5 h-auto"
          >
            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            <span>{getInvoiceTrans("save_and_ledger", lang)}</span>
          </Button>

          {/* Invoice Document Language Switcher (Desktop) */}
          <div className="hidden md:flex items-center">
            <InvoiceLanguageSelect
              value={docLang}
              onChange={setDocLang}
              uiLang={lang}
            />
          </div>

          {/* Print from preview inside modal */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              printElement("modal-live-preview-pane", `Invoice - ${formInvoiceNo || "PDF"}`);
            }}
            className="hidden md:flex bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl text-xs font-bold transition items-center gap-1.5 cursor-pointer border-0 h-auto"
          >
            <Download className="w-3.5 h-3.5" />
            {getInvoiceTrans("print_current", lang)}
          </Button>
        </div>
      </div>

      {/* Mobile View Toggle Tabs */}
      <div className="flex md:hidden border-b border-slate-100 bg-slate-50 text-xs font-bold text-center">
        <Button
          type="button"
          variant="ghost"
          onClick={() => setMobileEditorTab("edit")}
          className={cn(
            "flex-1 py-3 rounded-none border-b-2 transition h-auto",
            mobileEditorTab === "edit" ? "border-brand-500 text-brand-600 bg-white" : "border-transparent text-slate-500"
          )}
        >
          {getInvoiceTrans("form_tab_edit", lang)}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => setMobileEditorTab("preview")}
          className={cn(
            "flex-1 py-3 rounded-none border-b-2 transition h-auto",
            mobileEditorTab === "preview" ? "border-brand-500 text-brand-600 bg-white" : "border-transparent text-slate-500"
          )}
        >
          {getInvoiceTrans("form_tab_preview", lang)}
        </Button>
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
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    onClick={handleGenerateInvoiceNo}
                    className="text-[9px] text-brand-600 hover:text-brand-700 font-bold cursor-pointer p-0 h-auto"
                  >
                    {getInvoiceTrans("random_btn", lang)}
                  </Button>
                </label>
                <Input
                  type="text"
                  value={formInvoiceNo}
                  onChange={(e) => setFormInvoiceNo(e.target.value)}
                  className="h-8 text-xs font-semibold text-slate-700 bg-slate-50 focus:bg-white"
                />
              </div>

              {/* Invoice Type */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500">{getInvoiceTrans("invoice_type_lbl", lang)}</label>
                <Input
                  type="text"
                  value={formInvoiceType}
                  onChange={(e) => setFormInvoiceType(e.target.value)}
                  placeholder={getInvoiceTrans("invoice_type_placeholder", lang)}
                  className="h-8 text-xs font-semibold text-slate-700 bg-slate-50 focus:bg-white"
                />
              </div>

              {/* Issue Date */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500">{getInvoiceTrans("issue_date_lbl", lang)}</label>
                <UIDatePicker
                  value={formIssueDate}
                  onValueChange={setFormIssueDate}
                  placeholder={getInvoiceTrans("issue_date_lbl", lang)}
                  className="h-8 text-xs"
                />
              </div>

              {/* Due Date */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500">{getInvoiceTrans("due_date_lbl", lang)}</label>
                <UIDatePicker
                  value={formDueDate}
                  onValueChange={setFormDueDate}
                  placeholder={getInvoiceTrans("due_date_lbl", lang)}
                  className="h-8 text-xs"
                />
              </div>

              {/* Copy / Version Tag */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500">{getInvoiceTrans("copy_text_lbl", lang)}</label>
                <Input
                  type="text"
                  value={formCopyText}
                  onChange={(e) => setFormCopyText(e.target.value)}
                  placeholder="e.g. ต้นฉบับ / ORIGINAL"
                  className="h-8 text-xs font-semibold text-slate-700 bg-slate-50 focus:bg-white"
                />
              </div>

              {/* Status */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500">{getInvoiceTrans("status_lbl", lang)}</label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as any)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 outline-none focus:bg-white focus:border-brand-500 transition h-8"
                >
                  <option value="draft">{getInvoiceTrans("opt_draft", lang)}</option>
                  <option value="pending">{getInvoiceTrans("opt_pending", lang)}</option>
                  <option value="paid">{getInvoiceTrans("opt_paid", lang)}</option>
                  <option value="overdue">{getInvoiceTrans("opt_overdue", lang)}</option>
                </select>
              </div>

              {/* Tax Rate */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500">
                  {getInvoiceTrans("tax_rate_lbl", lang)} {formInvoiceType === "proforma" && <span className="text-[10px] text-amber-600 font-bold">{getInvoiceTrans("tax_free_proforma", lang)}</span>}
                </label>
                <div className="flex items-center gap-1.5">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    disabled={formInvoiceType === "proforma"}
                    value={formInvoiceType === "proforma" ? 0 : formTaxRate}
                    onChange={(e) => setFormTaxRate(Number(e.target.value))}
                    className="h-8 text-xs font-semibold text-slate-700 bg-slate-50 focus:bg-white"
                  />
                  <span className="text-xs text-slate-400 font-bold">%</span>
                </div>
              </div>

              {/* Currency */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500">{getInvoiceTrans("currency_lbl", lang)}</label>
                <select
                  value={formCurrency}
                  onChange={(e) => setFormCurrency(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 outline-none focus:bg-white focus:border-brand-500 transition h-8"
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
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById('seller-logo-file-input')?.click()}
                  className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-3xs h-8"
                >
                  <Upload className="w-3.5 h-3.5 text-slate-500" />
                  <span>{getInvoiceTrans("select_file_btn", lang)}</span>
                </Button>
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
                      <img src={formSellerLogo} className="h-full w-full object-contain" referrerPolicy="no-referrer" alt="Seller logo" />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleClearLogo(true)}
                      className="text-xs font-bold text-rose-500 hover:text-rose-600 hover:bg-rose-50 px-2 py-1 rounded-md transition cursor-pointer h-auto"
                    >
                      {lang === "zh-CN" || lang === "zh-TW" ? "删除" : "Remove"}
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Seller fields inputs */}
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500">{getInvoiceTrans("seller_name_input", lang)}</label>
                <Input
                  type="text"
                  value={formSellerName}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormSellerName(val);
                    localStorage.setItem("last_formSellerName", val);
                  }}
                  className="h-8 text-xs font-semibold text-slate-700 bg-slate-50 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500">{getInvoiceTrans("tax_no_lbl", lang)}</label>
                  <Input
                    type="text"
                    value={formSellerTaxNo}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormSellerTaxNo(val);
                      localStorage.setItem("last_formSellerTaxNo", val);
                    }}
                    className="h-8 text-xs font-semibold text-slate-700 bg-slate-50 focus:bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500">{getInvoiceTrans("phone_lbl", lang)}</label>
                  <Input
                    type="text"
                    value={formSellerPhone}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormSellerPhone(val);
                      localStorage.setItem("last_formSellerPhone", val);
                    }}
                    className="h-8 text-xs font-semibold text-slate-700 bg-slate-50 focus:bg-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500">{getInvoiceTrans("address_lbl", lang)}</label>
                <Input
                  type="text"
                  value={formSellerAddress}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormSellerAddress(val);
                    localStorage.setItem("last_formSellerAddress", val);
                  }}
                  className="h-8 text-xs font-semibold text-slate-700 bg-slate-50 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500">{getInvoiceTrans("contact_lbl", lang)}</label>
                  <Input
                    type="text"
                    value={formSellerContact}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormSellerContact(val);
                      localStorage.setItem("last_formSellerContact", val);
                    }}
                    className="h-8 text-xs font-semibold text-slate-700 bg-slate-50 focus:bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500">{getInvoiceTrans("seller_bank_input", lang)}</label>
                  <Input
                    type="text"
                    value={formSellerBankName}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormSellerBankName(val);
                      localStorage.setItem("last_formSellerBankName", val);
                    }}
                    className="h-8 text-xs font-semibold text-slate-700 bg-slate-50 focus:bg-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500">{getInvoiceTrans("seller_account_input", lang)}</label>
                <Input
                  type="text"
                  value={formSellerBankAccount}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormSellerBankAccount(val);
                    localStorage.setItem("last_formSellerBankAccount", val);
                  }}
                  className="h-8 text-xs font-semibold text-slate-700 bg-slate-50 focus:bg-white font-mono"
                />
              </div>

              {/* Official Seal and Signature Sub-grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {/* Official Signature Canvas Block */}
                <div className="space-y-2 p-3 bg-slate-50/50 rounded-xl border border-slate-200 flex flex-col justify-between">
                  <div className="space-y-2">
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
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setFormSigX(0);
                                setFormSigY(0);
                              }}
                              className="px-2 py-1 text-[10px] font-extrabold text-indigo-600 hover:bg-indigo-50 rounded-md border border-indigo-200 transition cursor-pointer flex items-center gap-1 h-auto"
                              title={lang === "zh-CN" || lang === "zh-TW" ? "重置签名在预览中的拖拽位置" : "Reset drag position"}
                            >
                              <Move className="w-3 h-3" />
                              {lang === "zh-CN" || lang === "zh-TW" ? "重置位置" : "Reset Pos"}
                            </Button>
                          )}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => document.getElementById('prewritten-signature-upload-input')?.click()}
                            className="px-2 py-1 text-[10px] font-extrabold text-brand-700 hover:bg-brand-50 rounded-md border border-brand-200 transition cursor-pointer flex items-center gap-1 h-auto"
                          >
                            <Upload className="w-3 h-3" />
                            {lang === "zh-CN" || lang === "zh-TW" ? "重新上传图片" : "Upload File"}
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setFormSellerSignature("")}
                            className="px-2 py-1 text-[10px] font-extrabold text-rose-500 hover:bg-rose-50 rounded-md border border-rose-200 transition cursor-pointer flex items-center gap-1 h-auto"
                          >
                            <Trash2 className="w-3 h-3" />
                            {lang === "zh-CN" || lang === "zh-TW" ? "清除" : "Clear"}
                          </Button>
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
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => document.getElementById('prewritten-signature-upload-input')?.click()}
                            className="px-3 py-1 text-[10px] font-bold text-slate-650 hover:text-slate-800 bg-white hover:bg-slate-100 rounded-lg border border-slate-200 transition cursor-pointer flex items-center gap-1.5 shadow-3xs h-auto"
                          >
                            <Upload className="w-3.5 h-3.5 text-brand-600" />
                            <span>{lang === "zh-CN" || lang === "zh-TW" ? "直接上传提前写好的签名图片" : "Upload Pre-written Signature Image"}</span>
                          </Button>
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
                </div>

                {/* Stamp/Seal Image Upload */}
                <div className="space-y-2 p-3 bg-slate-50/50 rounded-xl border border-slate-200 flex flex-col justify-between">
                  <div className="space-y-2">
                    <span className="text-[11px] font-extrabold text-slate-700 flex items-center gap-1">
                      <FileSignature className="w-3.5 h-3.5 text-emerald-600" />
                      {lang === "zh-CN" || lang === "zh-TW" ? "上传印章/盖章图片" : "Upload Seal / Stamp Image"}
                    </span>
                    
                    <p className="text-[10px] font-bold text-slate-400">
                      {lang === "zh-CN" || lang === "zh-TW" ? "推荐上传透明背景的 PNG 格式图片" : "Transparent PNG stamps recommended."}
                    </p>

                    <div className="flex items-center gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => document.getElementById('seller-sig-file-input')?.click()}
                        className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-lg text-[10px] font-bold transition flex items-center gap-1.5 cursor-pointer shadow-3xs h-8"
                      >
                        <Upload className="w-3.5 h-3.5 text-slate-500" />
                        <span>{lang === "zh-CN" || lang === "zh-TW" ? "选择印章图片" : "Select Image"}</span>
                      </Button>
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
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setFormStampX(0);
                              setFormStampY(0);
                            }}
                            className="text-[10px] font-black text-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 px-2 py-1 rounded transition cursor-pointer border border-indigo-100 h-auto"
                          >
                            {lang === "zh-CN" || lang === "zh-TW" ? "重置位置" : "Reset Pos"}
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setFormSellerStamp("")}
                          className="text-[10px] font-black text-rose-500 hover:text-rose-600 hover:bg-rose-50 px-2 py-1 rounded transition cursor-pointer border border-rose-100 h-auto"
                        >
                          {lang === "zh-CN" || lang === "zh-TW" ? "删除印章" : "Delete Stamp"}
                        </Button>
                      </div>
                    </div>
                  )}
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
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsCustDropdownOpen(!isCustDropdownOpen);
                    setCustSearchQuery("");
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 outline-none hover:bg-white hover:border-brand-300 focus:border-brand-500 transition flex items-center justify-between cursor-pointer h-auto"
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
                </Button>

                {isCustDropdownOpen && (
                  <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 p-2 space-y-2 max-h-64 overflow-hidden flex flex-col">
                    {/* Search Input Box */}
                    <div className="relative flex items-center shrink-0">
                      <Search className="absolute left-2.5 w-3.5 h-3.5 text-slate-400" />
                      <Input
                        type="text"
                        value={custSearchQuery}
                        onChange={(e) => setCustSearchQuery(e.target.value)}
                        placeholder={lang === "en" ? "Search ID or name..." : "搜索客户姓名或ID..."}
                        className="w-full pl-8 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 outline-none focus:bg-white focus:border-brand-500 h-8"
                        autoFocus
                      />
                      {custSearchQuery && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => setCustSearchQuery("")}
                          className="absolute right-2.5 h-5 w-5 p-0 text-slate-400 hover:text-slate-600"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      )}
                    </div>

                    {/* Dropdown Options List */}
                    <div className="overflow-y-auto space-y-1 pr-1 flex-1">
                      {/* Custom input option */}
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          handleCustomerChange("custom");
                          setIsCustDropdownOpen(false);
                        }}
                        className={cn(
                          "w-full text-left px-2.5 py-2 text-xs font-medium rounded-md transition duration-150 flex items-center justify-between hover:bg-slate-50 cursor-pointer h-auto",
                          (!formCustomerId || formCustomerId === "custom") ? "bg-brand-50/40 text-brand-700 font-bold" : "text-slate-600"
                        )}
                      >
                        <span>{getInvoiceTrans("crm_custom_opt", lang)}</span>
                        {(!formCustomerId || formCustomerId === "custom") && <Check className="w-3.5 h-3.5 text-brand-600" />}
                      </Button>

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
                            <Button
                              key={c.id}
                              type="button"
                              variant="ghost"
                              onClick={() => {
                                handleCustomerChange(c.id);
                                setIsCustDropdownOpen(false);
                              }}
                              className={cn(
                                "w-full text-left px-2.5 py-2 text-xs font-medium rounded-md transition duration-150 flex items-center justify-between hover:bg-slate-50 cursor-pointer h-auto",
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
                            </Button>
                          );
                        });
                      })()}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Buyer Logo Upload */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500">{getInvoiceTrans("logo_buyer_lbl", lang)}</label>
              <div className="flex items-center gap-3 flex-wrap">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById('buyer-logo-file-input')?.click()}
                  className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-3xs h-8"
                >
                  <Upload className="w-3.5 h-3.5 text-slate-500" />
                  <span>{getInvoiceTrans("select_file_btn", lang)}</span>
                </Button>
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
                      <img src={formBuyerLogo} className="h-full w-full object-contain" referrerPolicy="no-referrer" alt="Buyer logo" />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleClearLogo(false)}
                      className="text-xs font-bold text-rose-500 hover:text-rose-600 hover:bg-rose-50 px-2 py-1 rounded-md transition cursor-pointer h-auto"
                    >
                      {lang === "zh-CN" || lang === "zh-TW" ? "删除" : "Remove"}
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Buyer fields inputs */}
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500">{getInvoiceTrans("buyer_name_input", lang)}</label>
                <Input
                  type="text"
                  value={formBuyerName}
                  onChange={(e) => setFormBuyerName(e.target.value)}
                  className="h-8 text-xs font-semibold text-slate-700 bg-slate-50 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500">{getInvoiceTrans("buyer_tax_input", lang)}</label>
                  <Input
                    type="text"
                    value={formBuyerTaxNo}
                    onChange={(e) => setFormBuyerTaxNo(e.target.value)}
                    className="h-8 text-xs font-semibold text-slate-700 bg-slate-50 focus:bg-white font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500">{getInvoiceTrans("buyer_phone_input", lang)}</label>
                  <Input
                    type="text"
                    value={formBuyerPhone}
                    onChange={(e) => setFormBuyerPhone(e.target.value)}
                    className="h-8 text-xs font-semibold text-slate-700 bg-slate-50 focus:bg-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500">{getInvoiceTrans("buyer_address_input", lang)}</label>
                <Input
                  type="text"
                  value={formBuyerAddress}
                  onChange={(e) => setFormBuyerAddress(e.target.value)}
                  className="h-8 text-xs font-semibold text-slate-700 bg-slate-50 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500">{getInvoiceTrans("buyer_contact_input", lang)}</label>
                  <Input
                    type="text"
                    value={formBuyerContact}
                    onChange={(e) => setFormBuyerContact(e.target.value)}
                    className="h-8 text-xs font-semibold text-slate-700 bg-slate-50 focus:bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500">{getInvoiceTrans("buyer_bank_input", lang)}</label>
                  <Input
                    type="text"
                    value={formBuyerBankName}
                    onChange={(e) => setFormBuyerBankName(e.target.value)}
                    className="h-8 text-xs font-semibold text-slate-700 bg-slate-50 focus:bg-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500">{getInvoiceTrans("buyer_account_input", lang)}</label>
                <Input
                  type="text"
                  value={formBuyerBankAccount}
                  onChange={(e) => setFormBuyerBankAccount(e.target.value)}
                  className="h-8 text-xs font-semibold text-slate-700 bg-slate-50 focus:bg-white font-mono"
                />
              </div>
            </div>
          </div>

          {/* Panel Section 4: Line Items */}
          <div className="space-y-4 border-t border-slate-100 pt-5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider border-l-3 border-indigo-500 pl-2">
                {getInvoiceTrans("sec_items", lang)}
              </h4>
              <span className="text-[10px] text-slate-400 font-bold">{getInvoiceTrans("items_count_lbl", lang)}: {formItems.length}</span>
            </div>

            {/* Quick Add item inline bar */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="grid grid-cols-12 gap-2">
                <div className="col-span-12 sm:col-span-6 space-y-0.5">
                  <label className="text-[10px] font-bold text-slate-400">{getInvoiceTrans("desc_lbl", lang)}</label>
                  <Input
                    type="text"
                    placeholder={getInvoiceTrans("desc_placeholder", lang)}
                    value={itemDesc}
                    onChange={(e) => setItemDesc(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="col-span-6 sm:col-span-3 space-y-0.5">
                  <label className="text-[10px] font-bold text-slate-400">{getInvoiceTrans("qty_lbl", lang)}</label>
                  <Input
                    type="number"
                    min="1"
                    placeholder="1"
                    value={itemQty}
                    onChange={(e) => setItemQty(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="col-span-6 sm:col-span-3 space-y-0.5">
                  <label className="text-[10px] font-bold text-slate-400">{getInvoiceTrans("unit_price_lbl", lang)}</label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={itemPrice}
                    onChange={(e) => setItemPrice(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              </div>
              <div className="flex justify-end pt-1">
                <Button
                  type="button"
                  size="sm"
                  onClick={handleAddItem}
                  className="px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-black shadow-xs flex items-center gap-1 cursor-pointer h-auto"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{getInvoiceTrans("add_item_btn", lang)}</span>
                </Button>
              </div>
            </div>

            {/* List of current line items */}
            <div className="space-y-1.5">
              {formItems.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
                  {getInvoiceTrans("no_items_desc", lang)}
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                  {formItems.map((item, index) => (
                    <div key={item.id} className="p-3 bg-white hover:bg-slate-50 transition flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="w-4 text-[10px] font-bold text-slate-400 shrink-0">{index + 1}.</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-800 truncate">{item.description}</p>
                          <p className="text-[10px] text-slate-400">
                            {item.qty} × {formatCurrency(item.unitPrice, formCurrency as any)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-mono font-bold text-slate-800">{formatCurrency(item.amount, formCurrency as any)}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveItem(item.id)}
                          className="p-1 h-7 w-7 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
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
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsFormOpen(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer h-auto"
            >
              {getInvoiceTrans("btn_cancel_short", lang)}
            </Button>
            <Button
              type="button"
              disabled={isSaving}
              onClick={handleSaveInvoice}
              className="bg-brand-600 hover:bg-brand-700 text-white px-5 py-2.5 rounded-xl text-xs font-black shadow-xs hover:shadow-md transition duration-200 cursor-pointer flex items-center gap-1 h-auto"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              <span>{getInvoiceTrans("save_and_ledger", lang)}</span>
            </Button>
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
              <div className="flex items-center gap-2">
                <span>{getInvoiceTrans("preview_title_live", docLang)}</span>
                <div className="md:hidden">
                  <InvoiceLanguageSelect
                    value={docLang}
                    onChange={setDocLang}
                    uiLang={lang}
                  />
                </div>
              </div>
              <span className="text-emerald-600 animate-pulse flex items-center gap-1">{getInvoiceTrans("preview_sync_tip", lang)}</span>
            </div>

            <InvoiceLivePreview
              formInvoiceNo={formInvoiceNo}
              formInvoiceType={formInvoiceType}
              formCopyText={formCopyText}
              formIssueDate={formIssueDate}
              formDueDate={formDueDate}
              formCurrency={formCurrency}
              formTaxRate={formInvoiceType === "proforma" ? 0 : formTaxRate}
              formNote={formNote}
              formItems={formItems}
              itemSubtotal={itemSubtotal}
              itemTaxAmount={itemTaxAmount}
              itemNetSubtotal={itemNetSubtotal}
              formSellerName={formSellerName}
              formSellerTaxNo={formSellerTaxNo}
              formSellerBankName={formSellerBankName}
              formSellerBankAccount={formSellerBankAccount}
              formSellerAddress={formSellerAddress}
              formSellerContact={formSellerContact}
              formSellerPhone={formSellerPhone}
              formSellerLogo={formSellerLogo}
              formSellerSignature={formSellerSignature}
              formSellerStamp={formSellerStamp}
              formBuyerName={formBuyerName}
              formBuyerTaxNo={formBuyerTaxNo}
              formBuyerBankName={formBuyerBankName}
              formBuyerBankAccount={formBuyerBankAccount}
              formBuyerAddress={formBuyerAddress}
              formBuyerContact={formBuyerContact}
              formBuyerPhone={formBuyerPhone}
              formBuyerLogo={formBuyerLogo}
              formSigX={formSigX}
              formSigY={formSigY}
              formStampX={formStampX}
              formStampY={formStampY}
              isDraggingSig={isDraggingSig}
              isDraggingStamp={isDraggingStamp}
              handleSigStart={handleSigStart}
              handleStampStart={handleStampStart}
              lang={docLang}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
