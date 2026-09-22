import { Customer, Invoice, InvoiceItem } from "../../types";
import { Language } from "../../lib/i18n";

export type { Customer, Invoice, InvoiceItem, Language };

export interface InvoiceManagerProps {
  customers: Customer[];
  addToast: (msg: string, type?: "success" | "error" | "info") => void;
  lang: Language;
  warehouseCode?: string;
}

export type InvoiceStatus = "draft" | "pending" | "paid" | "overdue" | "canceled";

export interface InvoiceStatsData {
  totalInvoices: number;
  totalAmount: number;
  paidCount: number;
  paidAmount: number;
  pendingCount: number;
  pendingAmount: number;
  overdueCount: number;
  overdueAmount: number;
  draftCount?: number;
  draftAmount?: number;
}

export interface DatePickerProps {
  value: string;
  onChange: (date: string) => void;
  lang?: string;
  placeholder?: string;
  className?: string;
}

export interface MonthPickerProps {
  value: string; // "YYYY-MM"
  onChange: (value: string) => void;
  lang: string;
  placeholder?: string;
}

export interface CustomerPreset {
  taxNo: string;
  bankName: string;
  bankAccount: string;
  address: string;
  phone: string;
  contact?: string;
  logo?: string;
}
