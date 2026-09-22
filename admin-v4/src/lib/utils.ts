/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { AppConfig, AttendanceDetails, AttendanceRecord, CurrencyCode, Employee, HolidayRecord } from "../types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  THB: '฿',
  USD: '$',
  MYR: 'RM',
  IDR: 'Rp',
  CNY: '￥',
  PHP: '₱',
  VND: '₫',
  KRW: '₩',
  JPY: '¥',
  HKD: 'HK$',
  MOP: 'MOP$',
  SGD: 'S$',
  BND: 'B$',
  GBP: '£',
  EUR: '€',
  EGP: 'E£',
  OMR: 'OMR',
  AED: 'AED',
  MMK: 'Ks'
};

export const COUNTRY_NAMES: Record<string, string> = {
  MM: '缅甸',
  TH: '泰国',
  CN: '中国',
  VN: '越南',
  KH: '柬埔寨'
};

export const COUNTRY_FLAGS: Record<string, string> = {
  MM: '🇲🇲',
  TH: '🇹🇭',
  CN: '🇨🇳',
  VN: '🇻🇳',
  KH: '🇰🇭'
};


export const WAREHOUSE_NAMES: Record<string, string> = {
  TH: "泰国仓",
  VN: "越南仓",
  MY: "马来西亚仓",
  ID: "印尼仓",
  PH: "菲律宾仓",
  SG: "新加坡仓",
  CN: "中国仓",
  US: "美国仓",
  GB: "英国仓",
  KR: "韩国仓",
  JP: "日本仓"
};

export const WAREHOUSE_FLAGS: Record<string, string> = {
  TH: "🇹🇭",
  VN: "🇻🇳",
  MY: "🇲🇾",
  ID: "🇮🇩",
  PH: "🇵🇭",
  SG: "🇸🇬",
  CN: "🇨🇳",
  US: "🇺🇸",
  GB: "🇬🇧",
  KR: "🇰🇷",
  JP: "🇯🇵"
};

export function getCurrencyForCountry(countryStr: string): CurrencyCode {
  if (!countryStr) return "USD";
  const s = countryStr.toLowerCase();
  if (s.includes("泰国") || s.includes("thailand") || s.includes("th")) return "THB";
  if (s.includes("缅甸") || s.includes("myanmar") || s.includes("mm")) return "MMK";
  if (s.includes("马来西亚") || s.includes("malaysia") || s.includes("my")) return "MYR";
  if (s.includes("印度尼西亚") || s.includes("indonesia") || s.includes("id")) return "IDR";
  if (s.includes("菲律宾") || s.includes("philippines") || s.includes("ph")) return "PHP";
  if (s.includes("越南") || s.includes("vietnam") || s.includes("vn")) return "VND";
  if (s.includes("韩国") || s.includes("south korea") || s.includes("kr")) return "KRW";
  if (s.includes("日本") || s.includes("japan") || s.includes("jp")) return "JPY";
  if (s.includes("新加坡") || s.includes("singapore") || s.includes("sg")) return "SGD";
  if (s.includes("文莱") || s.includes("brunei") || s.includes("bn")) return "BND";
  if (s.includes("英国") || s.includes("united kingdom") || s.includes("gb")) return "GBP";
  if (s.includes("法国") || s.includes("france") || s.includes("fr") || s.includes("德国") || s.includes("germany") || s.includes("de")) return "EUR";
  if (s.includes("美国") || s.includes("united states") || s.includes("us")) return "USD";
  if (s.includes("埃及") || s.includes("egypt") || s.includes("eg")) return "EGP";
  if (s.includes("阿曼") || s.includes("oman") || s.includes("om")) return "OMR";
  if (s.includes("迪拜") || s.includes("dubai") || s.includes("ae") || s.includes("阿联酋")) return "AED";
  if (s.includes("中国") || s.includes("china") || s.includes("cn") || s.includes("澳门") || s.includes("macau") || s.includes("mo") || s.includes("香港") || s.includes("hong kong") || s.includes("hk")) {
    if (s.includes("香港") || s.includes("hong kong") || s.includes("hk")) return "HKD";
    if (s.includes("澳门") || s.includes("macau") || s.includes("mo")) return "MOP";
    return "CNY";
  }
  return "USD";
}

export function parseTimeToHours(str: string): number {
  if (!str) return 0;
  const parts = str.split(':');
  return parseInt(parts[0], 10) + parseInt(parts[1], 10) / 60;
}

export function calcAttendanceDetails(rec: AttendanceRecord, config: AppConfig): AttendanceDetails {
  if (!rec.inTime || !rec.outTime || rec.type === 'absent' || rec.type === 'leave' || rec.type === 'sick_leave') {
    return { raw: 0, valid: 0, standard: config.standardHours, ot: 0 };
  }

  let start = parseTimeToHours(rec.inTime);
  let end = parseTimeToHours(rec.outTime);
  
  if (end < start) end += 24;
  
  const raw = end - start;
  const bStart = parseTimeToHours(config.breakStart);
  const bEnd = parseTimeToHours(config.breakEnd);
  
  let breakDeduction = 0;
  const overlapStart = Math.max(start, bStart);
  let overlapEnd = Math.min(end, bEnd);
  
  if (bEnd < bStart) overlapEnd = Math.min(end, bEnd + 24);
  
  if (overlapStart < overlapEnd) {
    breakDeduction = overlapEnd - overlapStart;
  }
  
  const valid = Math.max(0, raw - breakDeduction);
  const ot = Math.max(0, valid - config.standardHours);
  
  return { raw, valid, standard: config.standardHours, ot };
}

export function formatDuration(hours: number | null | undefined): string {
  const val = typeof hours === "number" && !isNaN(hours) ? hours : 0;
  return val.toFixed(2) + "h";
}

export function formatCurrency(amount: number | null | undefined, code?: CurrencyCode | string): string {
  const val = typeof amount === "number" && !isNaN(amount) ? amount : (amount ? Number(amount) || 0 : 0);
  const symbol = (code && (CURRENCY_SYMBOLS as any)[code]) || "฿";
  const decimal = (code === "IDR" || code === "JPY" || code === "KRW" || code === "VND") ? 0 : 2;
  return symbol + val.toLocaleString(undefined, {
    minimumFractionDigits: decimal,
    maximumFractionDigits: decimal
  });
}

export function calcOvertimePay(
  emp: Employee,
  dateStr: string,
  otHours: number,
  config: AppConfig,
  holidays: HolidayRecord[] = []
): { amount: number; multiplier: number; label: string } {
  if (otHours <= 0) {
    return { amount: 0, multiplier: 1, label: "" };
  }

  // 1. If employee rule type is fixed
  const isFixed = !emp.otRuleType || emp.otRuleType === "fixed";
  if (isFixed) {
    const rate = emp.otFixedRate !== undefined && emp.otFixedRate !== null 
      ? emp.otFixedRate 
      : ((emp as any).overtimeHourlyFee !== undefined && (emp as any).overtimeHourlyFee !== null
          ? (emp as any).overtimeHourlyFee
          : (config.otHourlyFee || 0));
    return { amount: otHours * rate, multiplier: 1, label: "固定单价" };
  }

  // 2. If employee rule type is multiplier
  // Determine standard base hourly rate
  const hasBaseWage = emp.baseMonthlyWage !== undefined && emp.baseMonthlyWage !== null && emp.baseMonthlyWage > 0;
  const hasDailyWage = emp.dailyWage !== undefined && emp.dailyWage !== null && emp.dailyWage > 0;
  
  const baseHourlyRate = emp.otBaseRate !== undefined && emp.otBaseRate !== null && emp.otBaseRate > 0
    ? emp.otBaseRate
    : (hasBaseWage 
        ? ((emp.baseMonthlyWage / 30) / config.standardHours) 
        : (hasDailyWage 
            ? (emp.dailyWage / config.standardHours)
            : (emp.hourlyRate ?? 0)
          )
      );

  // Check if dateStr is in holidays list
  const holidayDateSet = new Set([
    ...(config.holidayDates || []).map(h => typeof h === "string" ? h.split("::")[0].trim() : (h as any)?.date),
    ...(holidays || []).map(h => typeof h === "string" ? h.split("::")[0].trim() : h?.date)
  ].filter(Boolean));
  const isHoliday = holidayDateSet.has(dateStr);
  
  // Check if dateStr is Saturday or Sunday
  let isWeekend = false;
  try {
    const parsedDate = new Date(dateStr + "T00:00:00Z");
    const dayOfWeek = parsedDate.getUTCDay();
    isWeekend = (dayOfWeek === 0 || dayOfWeek === 6); // 0 = Sunday, 6 = Saturday
  } catch (err) {
    console.error("Error parsing date: ", dateStr, err);
  }

  const wMult = emp.otMultiplierWorkday !== undefined && emp.otMultiplierWorkday !== null ? emp.otMultiplierWorkday : 1.5;
  const weMult = emp.otMultiplierWeekend !== undefined && emp.otMultiplierWeekend !== null ? emp.otMultiplierWeekend : 2.0;
  const hMult = emp.otMultiplierHoliday !== undefined && emp.otMultiplierHoliday !== null ? emp.otMultiplierHoliday : 3.0;

  let multiplier = wMult;
  let label = `工作日 ${wMult}x`;
  
  if (isHoliday) {
    multiplier = hMult;
    label = `假期 ${hMult}x`;
  } else if (isWeekend) {
    multiplier = weMult;
    label = `周末 ${weMult}x`;
  }

  const amount = otHours * baseHourlyRate * multiplier;
  return { amount, multiplier, label };
}
