import type { Customer } from "../types";
import { apiRequest } from "./apiRequest";

export type CustomerInput = Omit<Customer, "shops" | "creditLogs" | "status">;

const path = (code: string) => `/customers/${encodeURIComponent(code)}`;
type CustomerResponse = { customer: Customer };

export const customerApi = {
  list: async () => (await apiRequest<{ customers: Customer[] }>("/customers")).customers,

  create: async (input: CustomerInput) =>
    (await apiRequest<CustomerResponse>("/customers", { method: "POST", body: input })).customer,

  update: async (code: string, input: Omit<CustomerInput, "id">) =>
    (await apiRequest<CustomerResponse>(path(code), { method: "PUT", body: input })).customer,

  setStatus: async (code: string, status: Customer["status"]) =>
    (await apiRequest<CustomerResponse>(`${path(code)}/status`, { method: "PATCH", body: { status } })).customer,

  remove: (code: string) => apiRequest<void>(path(code), { method: "DELETE" }),

  addCreditLog: async (code: string, entry: { type: "recharge" | "consumption"; amount: number; note: string; operator: string }) =>
    (await apiRequest<CustomerResponse>(`${path(code)}/credit-logs`, { method: "POST", body: entry })).customer,

  shopeeAuthUrl: async (code: string) =>
    (await apiRequest<{ url: string }>(`${path(code)}/shopee/auth-url`, { method: "POST" })).url,

  setShopStatus: async (shopRecordId: string, status: "enabled" | "disabled") =>
    (await apiRequest<CustomerResponse>(`/shops/${shopRecordId}/status`, { method: "PATCH", body: { status } })).customer,

  unbindShop: async (shopRecordId: string) =>
    (await apiRequest<CustomerResponse>(`/shops/${shopRecordId}`, { method: "DELETE" })).customer,
};
