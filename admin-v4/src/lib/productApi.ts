import type { Product } from "../types";
import { apiRequest } from "./apiRequest";

export type ProductInput = Omit<Product, "recordId" | "customerName" | "volume" | "lastStocktakeTime" | "lastStocktakeQty">;

export interface InboundImportEntry {
  entryNo: string;
  customerName: string;
  shippingMark?: string;
  goodsName?: string;
  skus: Array<{ sku: string; desc?: string; qty: number }>;
}

export interface InboundImportResult {
  created: number;
  updated: number;
  alreadyImported: string[];
  unmatchedCustomers: string[];
}

type ProductResponse = { product: Product };

export const productApi = {
  list: async () => (await apiRequest<{ products: Product[] }>("/products")).products,

  create: async (input: ProductInput) =>
    (await apiRequest<ProductResponse>("/products", { method: "POST", body: input })).product,

  update: async (recordId: string, input: ProductInput) =>
    (await apiRequest<ProductResponse>(`/products/${recordId}`, { method: "PUT", body: input })).product,

  setLocation: async (recordId: string, shelfLocation: string) =>
    (await apiRequest<ProductResponse>(`/products/${recordId}/location`, { method: "PATCH", body: { shelfLocation } })).product,

  stocktake: async (recordId: string, input: { qty: number; shelfLocation: string; note: string }) =>
    (await apiRequest<ProductResponse>(`/products/${recordId}/stocktake`, { method: "POST", body: input })).product,

  remove: (recordId: string) => apiRequest<void>(`/products/${recordId}`, { method: "DELETE" }),

  importInbound: (entries: InboundImportEntry[]) =>
    apiRequest<InboundImportResult>("/products/inbound-imports", { method: "POST", body: { entries } }),
};
