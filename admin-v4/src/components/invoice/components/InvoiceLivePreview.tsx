import React from "react";
import { Upload } from "lucide-react";
import { InvoiceItem, Language } from "../types";
import { getInvoiceTrans, getInvoiceTypeLabel } from "../constants";
import { formatCurrency, cn } from "../../../lib/utils";

interface InvoiceLivePreviewProps {
  formInvoiceNo: string;
  formInvoiceType: string;
  formCopyText: string;
  formIssueDate: string;
  formDueDate: string;
  formCurrency: string;
  formTaxRate: number;
  formNote: string;
  formItems: InvoiceItem[];
  itemSubtotal: number;
  itemTaxAmount: number;
  itemNetSubtotal: number;
  formSellerName: string;
  formSellerTaxNo: string;
  formSellerBankName: string;
  formSellerBankAccount: string;
  formSellerAddress: string;
  formSellerContact: string;
  formSellerPhone: string;
  formSellerLogo: string;
  formSellerSignature: string;
  formSellerStamp: string;
  formBuyerName: string;
  formBuyerTaxNo: string;
  formBuyerBankName: string;
  formBuyerBankAccount: string;
  formBuyerAddress: string;
  formBuyerContact: string;
  formBuyerPhone: string;
  formBuyerLogo: string;
  formSigX: number;
  formSigY: number;
  formStampX: number;
  formStampY: number;
  isDraggingSig: boolean;
  isDraggingStamp: boolean;
  handleSigStart: (e: React.MouseEvent | React.TouchEvent) => void;
  handleStampStart: (e: React.MouseEvent | React.TouchEvent) => void;
  lang: Language;
}

export const InvoiceLivePreview: React.FC<InvoiceLivePreviewProps> = ({
  formInvoiceNo,
  formInvoiceType,
  formCopyText,
  formIssueDate,
  formDueDate,
  formCurrency,
  formTaxRate,
  formNote,
  formItems,
  itemSubtotal,
  itemTaxAmount,
  itemNetSubtotal,
  formSellerName,
  formSellerTaxNo,
  formSellerBankName,
  formSellerBankAccount,
  formSellerAddress,
  formSellerContact,
  formSellerPhone,
  formSellerLogo,
  formSellerSignature,
  formSellerStamp,
  formBuyerName,
  formBuyerTaxNo,
  formBuyerBankName,
  formBuyerBankAccount,
  formBuyerAddress,
  formBuyerContact,
  formBuyerPhone,
  formBuyerLogo,
  formSigX,
  formSigY,
  formStampX,
  formStampY,
  isDraggingSig,
  isDraggingStamp,
  handleSigStart,
  handleStampStart,
  lang,
}) => {
  return (
    <div
      className="bg-white p-6 md:p-10 rounded-xl shadow-lg border border-slate-200 border-t-8 border-t-indigo-600 w-full min-h-[1000px] flex flex-col justify-between space-y-8 print-no-shadow print-p-0 relative"
      id="modal-live-preview-pane"
    >
      <div>
        {/* Document Top Row Header */}
        <div className="flex justify-between items-start gap-4 pb-6 border-b-2 border-indigo-100">
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center gap-3 min-w-0">
              {formSellerLogo ? (
                <div
                  className="relative group cursor-pointer shrink-0"
                  onClick={() => document.getElementById("seller-logo-file-input")?.click()}
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
                {formSellerName || "物流供应链有限公司"}
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
                <span className="text-slate-500 font-semibold">{getInvoiceTrans("doc_no_lbl", lang)}:</span>
                <span className="font-mono font-bold text-slate-800">{formInvoiceNo || "WMS-INV-XXXXXX"}</span>
                <span className="text-slate-500 font-semibold">{getInvoiceTrans("date_lbl", lang)}:</span>
                <span className="font-bold text-slate-800">{formIssueDate}</span>
              </div>
            </div>
            {formCopyText && (
              <span className="inline-block text-[9px] font-extrabold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-sm border border-indigo-200 mt-1 uppercase tracking-wider">
                {formCopyText}
              </span>
            )}
          </div>
        </div>

        {/* Bilateral Company details summary block */}
        <div className="grid grid-cols-12 gap-6 pt-6 pb-2">
          {/* Buyer summary on the left - 7-8 cols */}
          <div className="col-span-12 sm:col-span-7 md:col-span-8 border-b sm:border-b-0 sm:border-r border-slate-100 pb-4 sm:pb-0 sm:pr-4 space-y-2">
            {(formBuyerLogo || formBuyerName) && (
              <div className="flex items-center gap-2.5 min-w-0">
                {formBuyerLogo ? (
                  <div
                    className="relative group cursor-pointer shrink-0 animate-fade-in"
                    onClick={() => document.getElementById("buyer-logo-file-input")?.click()}
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
                {getInvoiceTrans("due_date_lbl", lang)}{lang === "zh-CN" || lang === "zh-TW" ? "：" : ": "}
              </div>
              <div className="font-bold text-slate-700 text-left">
                {formDueDate || getInvoiceTrans("unlimited_lbl", lang)}
              </div>
              <div className="text-slate-400 font-medium text-right whitespace-nowrap">
                {getInvoiceTrans("currency_lbl", lang)}{lang === "zh-CN" || lang === "zh-TW" ? "：" : ": "}
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
              <tr className="border-b border-slate-200 text-slate-500 text-[10px] font-bold uppercase bg-slate-50">
                <th className="py-2 px-2 w-10 text-center">#</th>
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
                    {getInvoiceTrans("no_items_lbl", lang)}
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
            {formTaxRate !== 0 && (
              <div className="flex justify-between text-slate-500 px-2">
                <span>{getInvoiceTrans("tax_lbl", lang)} ({formTaxRate}%):</span>
                <span className="font-mono font-semibold text-slate-800">{formatCurrency(itemTaxAmount, formCurrency as any)}</span>
              </div>
            )}
            
            <div className="flex justify-between items-center text-sm font-black text-indigo-950 bg-indigo-50/80 px-3 py-2 rounded-lg border border-indigo-100">
              <span>{getInvoiceTrans("total_lbl", lang)}</span>
              <span className="font-mono text-lg text-indigo-600 font-black">
                {formatCurrency(itemSubtotal, formCurrency as any)}
              </span>
            </div>
          </div>
        </div>


        {/* Footer stamps / notes / signatures */}
        <div className="pt-6 border-t border-slate-100 mt-6 space-y-6">
          <div className="space-y-1.5 text-xs text-slate-500 font-normal">
            <p className="font-bold text-slate-700 text-[10px] uppercase tracking-wider">{getInvoiceTrans("notes_terms_lbl", lang)}</p>
            <p className="leading-relaxed text-[10px] text-slate-400">
              {formNote || getInvoiceTrans("default_notes_desc", lang)}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-24 md:gap-32 pt-4">
            {/* Customer signature */}
            <div className="text-center space-y-6 flex flex-col justify-end items-center">
              <p className="text-[10px] font-bold text-indigo-900 uppercase tracking-wider">{getInvoiceTrans("client_sig_lbl", lang)}</p>
              <div className="w-48 border-b border-slate-300 h-10"></div>
              <div className="text-[10px] text-slate-500 leading-normal">
                <p className="whitespace-nowrap">{getInvoiceTrans("date_prefix_lbl", lang)}{getInvoiceTrans("date_cn_year", lang)}</p>
              </div>
            </div>

            {/* Issuer signature with draggable support */}
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
  );
};
