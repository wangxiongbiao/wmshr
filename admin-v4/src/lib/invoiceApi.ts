import type { Invoice, InvoiceItem } from "../types";
import type { InvoiceStatsData } from "../components/invoice/types";

const token = () => localStorage.getItem("wms_admin_token") || "";

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      Authorization: `Bearer ${token()}`,
      ...init.headers,
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "发票请求失败");
  }
  return data as T;
}

export interface ApiInvoice {
  id: string | number;
  invoice_no: string;
  customer_id: string;
  customer_name: string;
  invoice_type: string;
  copy_text: string;
  currency: string;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  amount: number;
  issue_date: string;
  due_date: string;
  status: "draft" | "pending" | "paid" | "overdue" | "canceled";
  seller_name: string;
  seller_tax_no: string;
  seller_bank_name: string;
  seller_bank_account: string;
  seller_address: string;
  seller_phone: string;
  seller_contact: string;
  seller_logo?: string | null;
  seller_signature?: string | null;
  seller_stamp?: string | null;
  sig_x: number;
  sig_y: number;
  stamp_x: number;
  stamp_y: number;
  buyer_tax_no: string;
  buyer_bank_name: string;
  buyer_bank_account: string;
  buyer_address: string;
  buyer_phone: string;
  buyer_contact: string;
  buyer_logo?: string | null;
  items: Array<{
    id: string;
    description: string;
    qty: number;
    unitPrice?: number;
    unit_price?: number;
    amount: number;
  }>;
  note: string;
  pdf_url?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface InvoicePageResult {
  items: Invoice[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export function fromApiInvoice(dto: ApiInvoice): Invoice {
  return {
    id: String(dto.id),
    invoiceNo: dto.invoice_no,
    customerId: dto.customer_id,
    customerName: dto.customer_name,
    invoiceType: dto.invoice_type,
    copyText: dto.copy_text,
    currency: dto.currency,
    subtotal: Number(dto.subtotal || 0),
    taxRate: Number(dto.tax_rate || 0),
    taxAmount: Number(dto.tax_amount || 0),
    amount: Number(dto.amount || 0),
    issueDate: dto.issue_date,
    dueDate: dto.due_date || "",
    status: dto.status,
    sellerName: dto.seller_name,
    sellerTaxNo: dto.seller_tax_no,
    sellerBankName: dto.seller_bank_name,
    sellerBankAccount: dto.seller_bank_account,
    sellerAddress: dto.seller_address,
    sellerPhone: dto.seller_phone,
    sellerContact: dto.seller_contact,
    sellerLogo: dto.seller_logo || "",
    sellerSignature: dto.seller_signature || "",
    sellerStamp: dto.seller_stamp || "",
    sigX: Number(dto.sig_x || 0),
    sigY: Number(dto.sig_y || 0),
    stampX: Number(dto.stamp_x || 0),
    stampY: Number(dto.stamp_y || 0),
    buyerTaxNo: dto.buyer_tax_no,
    buyerBankName: dto.buyer_bank_name,
    buyerBankAccount: dto.buyer_bank_account,
    buyerAddress: dto.buyer_address,
    buyerPhone: dto.buyer_phone,
    buyerContact: dto.buyer_contact,
    buyerLogo: dto.buyer_logo || "",
    items: (dto.items || []).map((item) => ({
      id: item.id,
      description: item.description,
      qty: Number(item.qty),
      unitPrice: Number(item.unit_price != null ? item.unit_price : item.unitPrice || 0),
      amount: Number(item.amount),
    })),
    note: dto.note || "",
    pdfUrl: dto.pdf_url || "",
  };
}

export function toApiInvoice(vm: Partial<Invoice>): Partial<ApiInvoice> {
  const items = (vm.items || []).map((item) => ({
    id: item.id,
    description: item.description,
    qty: Number(item.qty),
    unit_price: Number(item.unitPrice),
    amount: Number(item.amount),
  }));

  return {
    invoice_no: vm.invoiceNo,
    customer_id: vm.customerId || "",
    customer_name: vm.customerName || "",
    invoice_type: vm.invoiceType || "增值税专用发票",
    copy_text: vm.copyText || "第一联 记账联",
    currency: vm.currency || "CNY",
    subtotal: Number(vm.subtotal || 0),
    tax_rate: Number(vm.taxRate || 0),
    tax_amount: Number(vm.taxAmount || 0),
    amount: Number(vm.amount || 0),
    issue_date: vm.issueDate || new Date().toISOString().split("T")[0],
    due_date: vm.dueDate || "",
    status: vm.status || "draft",
    seller_name: vm.sellerName || "",
    seller_tax_no: vm.sellerTaxNo || "",
    seller_bank_name: vm.sellerBankName || "",
    seller_bank_account: vm.sellerBankAccount || "",
    seller_address: vm.sellerAddress || "",
    seller_phone: vm.sellerPhone || "",
    seller_contact: vm.sellerContact || "",
    seller_logo: vm.sellerLogo || null,
    seller_signature: vm.sellerSignature || null,
    seller_stamp: vm.sellerStamp || null,
    sig_x: Number(vm.sigX || 0),
    sig_y: Number(vm.sigY || 0),
    stamp_x: Number(vm.stampX || 0),
    stamp_y: Number(vm.stampY || 0),
    buyer_tax_no: vm.buyerTaxNo || "",
    buyer_bank_name: vm.buyerBankName || "",
    buyer_bank_account: vm.buyerBankAccount || "",
    buyer_address: vm.buyerAddress || "",
    buyer_phone: vm.buyerPhone || "",
    buyer_contact: vm.buyerContact || "",
    buyer_logo: vm.buyerLogo || null,
    items,
    note: vm.note || "",
    pdf_url: vm.pdfUrl || null,
  };
}

export async function fetchInvoices(params: {
  page?: number;
  pageSize?: number;
  keyword?: string;
  status?: string;
  invoiceType?: string;
  month?: string;
  warehouseCode?: string;
} = {}): Promise<InvoicePageResult> {
  const query = new URLSearchParams();
  if (params.page) query.set("page", String(params.page));
  if (params.pageSize) query.set("pageSize", String(params.pageSize));
  if (params.keyword?.trim()) query.set("keyword", params.keyword.trim());
  if (params.status && params.status !== "all") query.set("status", params.status);
  if (params.invoiceType && params.invoiceType !== "all") query.set("invoice_type", params.invoiceType);
  if (params.month) query.set("month", params.month);
  if (params.warehouseCode && params.warehouseCode !== "ALL") query.set("warehouse_code", params.warehouseCode);

  const res = await request<{ items: ApiInvoice[]; total: number; page: number; pageSize: number; hasMore: boolean }>(
    `/api/v4/admin/invoices?${query.toString()}`
  );
  return {
    ...res,
    items: (res.items || []).map(fromApiInvoice),
  };
}

export async function fetchInvoiceStats(warehouseCode?: string): Promise<InvoiceStatsData> {
  const query = new URLSearchParams();
  if (warehouseCode && warehouseCode !== "ALL") query.set("warehouse_code", warehouseCode);

  const res = await request<{ ok: boolean; stats: InvoiceStatsData }>(
    `/api/v4/admin/invoices/stats?${query.toString()}`
  );
  return res.stats;
}

export async function fetchInvoice(id: string | number): Promise<Invoice> {
  const res = await request<{ invoice: ApiInvoice }>(`/api/v4/admin/invoices/${id}`);
  return fromApiInvoice(res.invoice);
}

export async function createInvoice(invoice: Partial<Invoice>, warehouseCode?: string): Promise<Invoice> {
  const payload = {
    ...toApiInvoice(invoice),
    ...(warehouseCode && warehouseCode !== "ALL" ? { warehouse_code: warehouseCode } : {}),
  };
  const res = await request<{ invoice: ApiInvoice; message: string }>("/api/v4/admin/invoices", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return fromApiInvoice(res.invoice);
}

export async function updateInvoice(
  id: string | number,
  invoice: Partial<Invoice>,
  warehouseCode?: string
): Promise<Invoice> {
  const payload = {
    ...toApiInvoice(invoice),
    ...(warehouseCode && warehouseCode !== "ALL" ? { warehouse_code: warehouseCode } : {}),
  };
  const res = await request<{ invoice: ApiInvoice; message: string }>(`/api/v4/admin/invoices/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  return fromApiInvoice(res.invoice);
}

export async function updateInvoiceStatus(
  id: string | number,
  status: string,
  warehouseCode?: string
): Promise<void> {
  const payload = {
    status,
    ...(warehouseCode && warehouseCode !== "ALL" ? { warehouse_code: warehouseCode } : {}),
  };
  await request<{ ok: boolean }>(`/api/v4/admin/invoices/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteInvoice(id: string | number, warehouseCode?: string): Promise<void> {
  const query = new URLSearchParams();
  if (warehouseCode && warehouseCode !== "ALL") query.set("warehouse_code", warehouseCode);
  await request<{ success: boolean }>(`/api/v4/admin/invoices/${id}?${query.toString()}`, {
    method: "DELETE",
  });
}
