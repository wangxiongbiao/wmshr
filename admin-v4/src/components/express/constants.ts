import { Customer } from "../../types";
import { CustomerSurcharge } from "./types";
import { getCurrencyForCountry } from "../../lib/utils";

export const DEFAULT_SURCHARGES: Record<string, CustomerSurcharge> = {};

export const COMMON_CUSTOMER_NAMES: string[] = [];

// 标准基础汇率字典 (以 1 USD 为基准锚点)
export const EXCHANGE_RATES: Record<string, number> = {
  USD: 1,
  CNY: 7.25,
  RMB: 7.25,
  THB: 36.5,
  MYR: 4.70,
  SGD: 1.35,
  IDR: 16300,
  PHP: 58.5,
  VND: 25400,
  KRW: 1380,
  JPY: 155,
  GBP: 0.79,
  EUR: 0.92,
  MMK: 2100,
  HKD: 7.82,
  MOP: 8.05
};

export interface CurrencyOption {
  code: string;
  symbol: string;
  countryName: string;
  flag: string;
}

export const CURRENCY_OPTIONS: CurrencyOption[] = [
  { code: "THB", symbol: "฿", countryName: "泰国", flag: "🇹🇭" },
  { code: "CNY", symbol: "¥", countryName: "中国", flag: "🇨🇳" },
  { code: "USD", symbol: "$", countryName: "美国", flag: "🇺🇸" },
  { code: "MYR", symbol: "RM", countryName: "马来西亚", flag: "🇲🇾" },
  { code: "SGD", symbol: "S$", countryName: "新加坡", flag: "🇸🇬" },
  { code: "PHP", symbol: "₱", countryName: "菲律宾", flag: "🇵🇭" },
  { code: "IDR", symbol: "Rp", countryName: "印度尼西亚", flag: "🇮🇩" },
  { code: "VND", symbol: "₫", countryName: "越南", flag: "🇻🇳" },
  { code: "JPY", symbol: "¥", countryName: "日本", flag: "🇯🇵" },
  { code: "KRW", symbol: "₩", countryName: "韩国", flag: "🇰🇷" },
  { code: "HKD", symbol: "HK$", countryName: "中国香港", flag: "🇭🇰" },
  { code: "GBP", symbol: "£", countryName: "英国", flag: "🇬🇧" },
  { code: "EUR", symbol: "€", countryName: "欧洲", flag: "🇪🇺" }
];

export function getCurrencyInfo(code: string): CurrencyOption {
  const upper = (code || "THB").toUpperCase();
  const found = CURRENCY_OPTIONS.find((c) => c.code === upper);
  if (found) return found;
  return {
    code: upper,
    symbol: upper === "THB" ? "฿" : upper === "CNY" ? "¥" : upper === "USD" ? "$" : upper,
    countryName: upper,
    flag: "🌐"
  };
}

export function getDefaultWarehouseCurrency(warehouseCode?: string): string {
  if (!warehouseCode) return "THB";
  return getCurrencyForCountry(warehouseCode);
}

export function convertCurrency(
  amount: number,
  fromCurrency: string = "THB",
  toCurrency: string = "THB"
): number {
  if (!amount || isNaN(amount)) return 0;
  const from = (fromCurrency || "THB").toUpperCase();
  const to = (toCurrency || "THB").toUpperCase();
  if (from === to) return Math.round(amount * 100) / 100;

  const fromRate = EXCHANGE_RATES[from] || 1;
  const toRate = EXCHANGE_RATES[to] || 1;
  const inUSD = amount / fromRate;
  const converted = inUSD * toRate;
  return Math.round(converted * 100) / 100;
}

export function getCustomerCurrency(custName: string, customers?: Customer[]): { symbol: string; code: string } {
  if (!custName) return { symbol: "฿", code: "THB" };
  const found = customers?.find((c) => c.name === custName);
  if (found && found.currency) {
    const cur = found.currency.toUpperCase();
    if (cur === "CNY" || cur === "RMB" || cur === "元") {
      return { symbol: "¥", code: "CNY" };
    } else if (cur === "USD") {
      return { symbol: "$", code: "USD" };
    } else {
      return { symbol: cur === "THB" ? "฿" : cur, code: cur };
    }
  }
  return { symbol: "฿", code: "THB" };
}

export const STATUS_CONFIG: Record<
  "matched" | "system_only" | "jnt_only",
  { label: string; badgeClass: string; dotClass: string }
> = {
  matched: {
    label: "匹配成功",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dotClass: "bg-emerald-500"
  },
  system_only: {
    label: "仅系统有单（JNT未结算）",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
    dotClass: "bg-blue-500"
  },
  jnt_only: {
    label: "仅JNT账单有单（系统无单）",
    badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
    dotClass: "bg-rose-500"
  }
};
