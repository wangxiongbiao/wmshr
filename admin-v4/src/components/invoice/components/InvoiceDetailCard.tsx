import React from "react";
import { Invoice, Language } from "../types";
import { getInvoiceTrans, getInvoiceTypeLabel } from "../constants";
import { formatCurrency, cn } from "../../../lib/utils";

interface InvoiceDetailCardProps {
  invoice: Invoice;
  lang: Language;
}

export const InvoiceDetailCard: React.FC<InvoiceDetailCardProps> = ({ invoice, lang }) => {
  return (
    <div
      id="invoice-view-card"
      className="bg-white p-6 md:p-10 rounded-xl shadow-lg border border-slate-200 border-t-8 border-t-indigo-600 w-full flex flex-col justify-between space-y-8 print-no-shadow print-p-0 relative"
    >
      {/* Visual Header */}
      <div className="flex justify-between items-start gap-4 pb-6 border-b-2 border-indigo-100">
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-3 min-w-0">
            {invoice.sellerLogo ? (
              <div className="rounded-lg border border-slate-200 p-1 bg-white shrink-0">
                <img
                  src={invoice.sellerLogo}
                  alt="Seller Logo"
                  className="h-9 sm:h-10 w-auto object-contain max-w-[140px] sm:max-w-[160px] rounded"
                  referrerPolicy="no-referrer"
                />
              </div>
            ) : null}
            <h2 className="text-sm sm:text-base font-extrabold text-indigo-950 tracking-tight leading-tight truncate">
              {invoice.sellerName || "物流供应链有限公司"}
            </h2>
          </div>
          <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 text-[11px] text-slate-700 leading-snug">
            {invoice.sellerAddress && (
              <>
                <span className="text-slate-400 font-medium whitespace-nowrap shrink-0">{getInvoiceTrans("address_lbl", lang)}:</span>
                <span className="text-slate-700 font-medium break-all min-w-0">{invoice.sellerAddress}</span>
              </>
            )}
            {invoice.sellerContact && (
              <>
                <span className="text-slate-400 font-medium whitespace-nowrap shrink-0">{getInvoiceTrans("contact_lbl", lang)}:</span>
                <span className="text-slate-700 font-medium break-all min-w-0">{invoice.sellerContact}</span>
              </>
            )}
            {invoice.sellerPhone && (
              <>
                <span className="text-slate-400 font-medium whitespace-nowrap shrink-0">{getInvoiceTrans("phone_lbl", lang)}:</span>
                <span className="text-slate-700 font-medium break-all min-w-0">{invoice.sellerPhone}</span>
              </>
            )}
            {invoice.sellerTaxNo && (
              <>
                <span className="text-slate-400 font-medium whitespace-nowrap shrink-0">{getInvoiceTrans("tax_no_lbl", lang)}:</span>
                <span className="text-slate-700 font-mono font-medium break-all min-w-0">{invoice.sellerTaxNo}</span>
              </>
            )}
            {invoice.sellerBankName && (
              <>
                <span className="text-slate-400 font-medium whitespace-nowrap shrink-0">{getInvoiceTrans("seller_bank_input", lang)}:</span>
                <span className="text-slate-700 font-medium break-all min-w-0">{invoice.sellerBankName}</span>
              </>
            )}
            {invoice.sellerBankAccount && (
              <>
                <span className="text-slate-400 font-medium whitespace-nowrap shrink-0">{getInvoiceTrans("seller_account_input", lang)}:</span>
                <span className="text-slate-700 font-mono font-medium break-all min-w-0">{invoice.sellerBankAccount}</span>
              </>
            )}
          </div>
        </div>

        <div className="text-right space-y-1 flex flex-col items-end flex-shrink-0">
          <h1 className="text-lg md:text-xl font-extrabold text-indigo-950 tracking-tight font-sans">
            {getInvoiceTypeLabel(invoice.invoiceType, lang)}
          </h1>
          <div className="text-[11px] mt-0.5 pt-1 border-t border-indigo-100 w-full flex flex-col items-end">
            <div className="grid grid-cols-[auto_auto] gap-x-1.5 gap-y-0.5 text-left leading-snug">
              <span className="text-slate-500 font-semibold">{getInvoiceTrans("doc_no_lbl", lang)}</span>
              <div className="text-slate-500 flex items-center">
                <span className="mr-1.5 font-semibold text-slate-500">:</span>
                <span className="font-mono font-medium text-slate-700">{invoice.invoiceNo}</span>
              </div>
              <span className="text-slate-500 font-semibold">{getInvoiceTrans("date_lbl", lang)}</span>
              <div className="text-slate-500 flex items-center">
                <span className="mr-1.5 font-semibold text-slate-500">:</span>
                <span className="font-medium text-slate-700">{invoice.issueDate}</span>
              </div>
            </div>
          </div>
          {invoice.copyText && (
            <span className="inline-block text-[9px] font-extrabold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-sm border border-indigo-200 mt-1 uppercase tracking-wider">
              {invoice.copyText}
            </span>
          )}
        </div>
      </div>

      {/* Bilateral Company details summary block (Left = Buyer, Right = Details) */}
      <div className="grid grid-cols-12 gap-6 pt-6 pb-2">
        {/* Buyer summary on the left - 7-8 cols */}
        <div className="col-span-12 sm:col-span-7 md:col-span-8 border-b sm:border-b-0 sm:border-r border-slate-100 pb-4 sm:pb-0 sm:pr-4 space-y-2">
          {(invoice.buyerLogo || invoice.customerName) && (
            <div className="flex items-center gap-2.5 min-w-0">
              {invoice.buyerLogo ? (
                <div className="shrink-0 animate-fade-in">
                  <img
                    src={invoice.buyerLogo}
                    alt="Buyer Logo"
                    className="h-8 sm:h-9 w-auto object-contain max-w-[120px] rounded border border-slate-200 p-0.5 bg-white"
                    referrerPolicy="no-referrer"
                  />
                </div>
              ) : null}
              {invoice.customerName && (
                <p className="font-extrabold text-slate-900 text-sm tracking-tight leading-tight truncate">
                  {invoice.customerName}
                </p>
              )}
            </div>
          )}

          {(invoice.buyerTaxNo || invoice.buyerBankName || invoice.buyerBankAccount || invoice.buyerAddress || invoice.buyerContact || invoice.buyerPhone) ? (
            <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 text-[11px] text-slate-700 leading-snug">
              {invoice.buyerAddress && (
                <>
                  <span className="text-slate-400 font-medium whitespace-nowrap shrink-0">{getInvoiceTrans("buyer_address_input", lang)}:</span>
                  <span className="text-slate-700 font-medium break-all min-w-0">{invoice.buyerAddress}</span>
                </>
              )}
              {invoice.buyerContact && (
                <>
                  <span className="text-slate-400 font-medium whitespace-nowrap shrink-0">{getInvoiceTrans("buyer_contact_input", lang)}:</span>
                  <span className="text-slate-700 font-medium break-all min-w-0">{invoice.buyerContact}</span>
                </>
              )}
              {invoice.buyerPhone && (
                <>
                  <span className="text-slate-400 font-medium whitespace-nowrap shrink-0">{getInvoiceTrans("buyer_phone_input", lang)}:</span>
                  <span className="text-slate-700 font-medium break-all min-w-0">{invoice.buyerPhone}</span>
                </>
              )}
              {invoice.buyerTaxNo && (
                <>
                  <span className="text-slate-400 font-medium whitespace-nowrap shrink-0">{getInvoiceTrans("buyer_tax_input", lang)}:</span>
                  <span className="text-slate-700 font-mono font-medium break-all min-w-0">{invoice.buyerTaxNo}</span>
                </>
              )}
              {invoice.buyerBankAccount && (
                <>
                  <span className="text-slate-400 font-medium whitespace-nowrap shrink-0">{getInvoiceTrans("buyer_account_input", lang)}:</span>
                  <span className="text-slate-700 font-mono font-medium break-all min-w-0">{invoice.buyerBankAccount}</span>
                </>
              )}
              {invoice.buyerBankName && (
                <>
                  <span className="text-slate-400 font-medium whitespace-nowrap shrink-0">{getInvoiceTrans("buyer_bank_input", lang)}:</span>
                  <span className="text-slate-700 font-medium break-all min-w-0">{invoice.buyerBankName}</span>
                </>
              )}
            </div>
          ) : null}
        </div>

        {/* Invoice metadata columns on the right - 5 cols */}
        <div className={`col-span-5 flex justify-end items-start ${invoice.customerName ? "pt-[28px]" : "pt-1.5"}`}>
          <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-[11px] leading-snug">
            <div className="text-slate-400 font-medium text-right whitespace-nowrap">
              {getInvoiceTrans("due_date_lbl", lang)}{lang === "zh-CN" || lang === "zh-TW" ? "：" : ": "}
            </div>
            <div className="font-bold text-slate-700 text-left">
              {invoice.dueDate || getInvoiceTrans("unlimited_lbl", lang)}
            </div>
            <div className="text-slate-400 font-medium text-right whitespace-nowrap">
              {getInvoiceTrans("currency_lbl", lang)}{lang === "zh-CN" || lang === "zh-TW" ? "：" : ": "}
            </div>
            <div className="font-bold text-slate-700 font-mono text-left">
              {invoice.currency}
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
            {invoice.items?.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-slate-400 text-xs font-bold">
                  {getInvoiceTrans("no_items_lbl", lang)}
                </td>
              </tr>
            ) : (
              invoice.items?.map((item, index) => (
                <tr key={item.id} className="hover:bg-slate-50/30">
                  <td className="py-2.5 px-2 text-center text-slate-400 font-mono">{index + 1}</td>
                  <td className="py-2.5 px-2 font-medium text-slate-900 whitespace-pre-wrap">{item.description}</td>
                  <td className="py-2.5 px-2 text-right font-mono text-slate-600">{item.qty}</td>
                  <td className="py-2.5 px-2 text-right font-mono text-slate-600">{formatCurrency(item.unitPrice, invoice.currency as any)}</td>
                  <td className="py-2.5 px-2 text-right font-bold font-mono text-slate-900">
                    {formatCurrency(item.amount, invoice.currency as any)}
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
            <span className="font-mono font-semibold text-slate-800">{formatCurrency(invoice.subtotal ?? invoice.amount, invoice.currency as any)}</span>
          </div>
          {invoice.taxRate !== 0 && (
            <div className="flex justify-between text-slate-500 px-2">
              <span>{getInvoiceTrans("tax_lbl", lang)} ({invoice.taxRate}%):</span>
              <span className="font-mono font-semibold text-slate-800">{formatCurrency(invoice.taxAmount ?? 0, invoice.currency as any)}</span>
            </div>
          )}
          
          {/* Highlighted Grand Total row */}
          <div className="flex justify-between items-center text-sm font-black text-indigo-950 bg-indigo-50/80 px-3 py-2 rounded-lg border border-indigo-100">
            <span>{getInvoiceTrans("total_lbl", lang)}</span>
            <span className="font-mono text-lg text-indigo-600 font-black">
              {formatCurrency(invoice.amount, invoice.currency as any)}
            </span>
          </div>
        </div>
      </div>


      {/* Footer stamps / notes / signatures */}
      <div className="pt-6 border-t border-slate-100 mt-6 space-y-6">
        {/* Note info */}
        <div className="space-y-1.5 text-xs text-slate-500 font-normal">
          <p className="font-bold text-slate-700 text-[10px] uppercase tracking-wider">{getInvoiceTrans("notes_terms_lbl", lang)}</p>
          <p className="leading-relaxed text-[10px] text-slate-400">
            {invoice.note || getInvoiceTrans("default_notes_desc", lang)}
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
          <div className="text-center space-y-6 flex flex-col justify-end items-center relative min-h-[90px]">
            {invoice.sellerSignature && (
              <div 
                className="absolute top-0 h-16 w-32 flex items-center justify-center z-10"
                style={{ transform: `translate(${invoice.sigX ?? 0}px, ${invoice.sigY ?? 0}px)` }}
              >
                <img src={invoice.sellerSignature} className="max-h-full max-w-full object-contain pointer-events-none" alt="signature" referrerPolicy="no-referrer" />
              </div>
            )}

            {invoice.sellerStamp && (
              <div 
                className="absolute -top-4 -right-2 h-24 w-24 flex items-center justify-center opacity-85 z-20 pointer-events-none"
                style={{ transform: `rotate(6deg) translate(${invoice.stampX ?? 0}px, ${invoice.stampY ?? 0}px)` }}
              >
                <img src={invoice.sellerStamp} className="max-h-full max-w-full object-contain" alt="stamp" referrerPolicy="no-referrer" />
              </div>
            )}

            <p className="text-[10px] font-bold text-indigo-900 uppercase tracking-wider">{getInvoiceTrans("auth_sig_lbl", lang)}</p>
            <div className="w-48 border-b border-slate-300 h-10"></div>
            <div className="text-[10px] text-slate-500 leading-normal">
              <p>{getInvoiceTrans("date_prefix_lbl", lang)}{invoice.issueDate}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
