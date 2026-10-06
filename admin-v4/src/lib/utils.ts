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
  KH: '柬埔寨',
  PH: '菲律宾',
  ID: '印度尼西亚',
  LA: '老挝',
  '缅甸籍': '缅甸',
  '泰国籍': '泰国',
  '中国籍': '中国',
  '越南籍': '越南',
  '柬埔寨籍': '柬埔寨',
  '菲律宾籍': '菲律宾',
  '印度尼西亚籍': '印度尼西亚',
  '印尼籍': '印度尼西亚',
  '老挝籍': '老挝'
};

export const COUNTRY_FLAGS: Record<string, string> = {
  MM: '🇲🇲',
  TH: '🇹🇭',
  CN: '🇨🇳',
  VN: '🇻🇳',
  KH: '🇰🇭',
  PH: '🇵🇭',
  ID: '🇮🇩',
  LA: '🇱🇦',
  '缅甸籍': '🇲🇲',
  '泰国籍': '🇹🇭',
  '中国籍': '🇨🇳',
  '越南籍': '🇻🇳',
  '柬埔寨籍': '🇰🇭',
  '菲律宾籍': '🇵🇭',
  '印度尼西亚籍': '🇮🇩',
  '印尼籍': '🇮🇩',
  '老挝籍': '🇱🇦'
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

/**
 * 计算员工单日基本出勤工资
 * 规则：
 * 1. 若配置了固定月薪 (baseMonthlyWage > 0)，走月薪日折算：baseMonthlyWage / 30
 * 2. 若未配置固定月薪，按日薪/时薪混合规则：
 *    - 满一日的 8 小时 (normalHours >= 8)：按日薪算（无日薪则按标准工时 * 有效时薪）
 *    - 不满一日 (< 8 小时)：按时薪算 (normalHours * 有效时薪)
 *    - 有效时薪取值：有输入时薪使用输入的时薪 (hourlyRate)，没有时薪按日薪除以 8 (dailyWage / 8)
 */
export function calcDailyBasePay(
  emp: { baseMonthlyWage?: number | null; dailyWage?: number | null; hourlyRate?: number | null },
  normalHours: number,
  config?: { standardHours?: number | null } | null
): number {
  if (normalHours <= 0) return 0;
  const stdHours = config?.standardHours || 8;
  const hasBaseWage = emp.baseMonthlyWage !== undefined && emp.baseMonthlyWage !== null && Number(emp.baseMonthlyWage) > 0;

  if (hasBaseWage) {
    return Number(emp.baseMonthlyWage) / 30;
  }

  const dailyWage = emp.dailyWage !== undefined && emp.dailyWage !== null && Number(emp.dailyWage) > 0 ? Number(emp.dailyWage) : 0;
  const hourlyRate = emp.hourlyRate !== undefined && emp.hourlyRate !== null && Number(emp.hourlyRate) > 0 ? Number(emp.hourlyRate) : 0;
  const effectiveHourlyRate = hourlyRate > 0 ? hourlyRate : (dailyWage > 0 ? dailyWage / stdHours : 0);

  if (normalHours >= stdHours) {
    // 满一日的8小时按日薪算（无日薪则按标准工时 * 时薪）
    return dailyWage > 0 ? dailyWage : (stdHours * effectiveHourlyRate);
  }

  // 不满一日的就按时薪算，有输入时薪就使用输入的时薪，没有时薪就按日薪除以8分配
  return normalHours * effectiveHourlyRate;
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
  const hasHourlyRate = emp.hourlyRate !== undefined && emp.hourlyRate !== null && emp.hourlyRate > 0;

  const baseHourlyRate = emp.otBaseRate !== undefined && emp.otBaseRate !== null && emp.otBaseRate > 0
    ? emp.otBaseRate
    : (hasBaseWage
        ? ((emp.baseMonthlyWage / 30) / config.standardHours)
        : (hasHourlyRate
            ? emp.hourlyRate!
            : (hasDailyWage ? (emp.dailyWage! / config.standardHours) : 0)
          )
      );

  // Check if dateStr is in holidays list
  const holidayDateSet = new Set([
    ...((config as any)?.holidayDates || []).map((h: any) => typeof h === "string" ? h.split("::")[0].trim() : h?.date),
    ...((holidays as any[]) || []).map((h: any) => typeof h === "string" ? h.split("::")[0].trim() : h?.date)
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

/**
 * 获取员工个人所得税比例（归一化为计算小数，如 5% -> 0.05）
 * 优先级：员工独立档案 taxRate -> 全局设置 config.taxRate -> 默认 0.05 (5%)
 */
export function getEmployeeTaxRate(
  emp?: { taxRate?: number | null } | null,
  config?: { taxRate?: number | null } | null
): number {
  if (emp?.taxRate !== undefined && emp?.taxRate !== null && !isNaN(Number(emp.taxRate))) {
    const val = Number(emp.taxRate);
    if (!Number.isFinite(val) || val < 0) return 0.05;
    if (val === 0) return 0;
    return val > 1 ? val / 100 : (val <= 0.2 ? val : val / 100);
  }
  if (config?.taxRate !== undefined && config?.taxRate !== null && !isNaN(Number(config.taxRate))) {
    const cVal = Number(config.taxRate);
    if (Number.isFinite(cVal) && cVal >= 0) {
      return cVal > 1 ? cVal / 100 : cVal;
    }
  }
  return 0.05;
}

// ==========================================
// Standardized Date & Time Formatting Utilities
// ==========================================

function pad2(num: number): string {
  return String(num).padStart(2, "0");
}

export function getNowDateStr(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = pad2(date.getMonth() + 1);
  const d = pad2(date.getDate());
  return `${y}-${m}-${d}`;
}

export function getNowMonthStr(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = pad2(date.getMonth() + 1);
  return `${y}-${m}`;
}

export function getNowDateTimeStr(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = pad2(date.getMonth() + 1);
  const d = pad2(date.getDate());
  const h = pad2(date.getHours());
  const min = pad2(date.getMinutes());
  return `${y}-${m}-${d} ${h}:${min}`;
}

export function formatDate(value?: string | number | Date | null, fallback = "-"): string {
  if (value === null || value === undefined || value === "") return fallback;
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? fallback : getNowDateStr(value);
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return fallback;
    const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (isoMatch) {
      return `${isoMatch[1]}-${pad2(parseInt(isoMatch[2], 10))}-${pad2(parseInt(isoMatch[3], 10))}`;
    }
    const slashMatch = trimmed.match(/^(\d{4})[/\.年](\d{1,2})[/\.月](\d{1,2})/);
    if (slashMatch) {
      return `${slashMatch[1]}-${pad2(parseInt(slashMatch[2], 10))}-${pad2(parseInt(slashMatch[3], 10))}`;
    }
    const num = Number(trimmed);
    if (!isNaN(num) && num > 1000000000) {
      const d = new Date(num > 10000000000 ? num : num * 1000);
      if (!isNaN(d.getTime())) return getNowDateStr(d);
    }
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) return getNowDateStr(parsed);
    return fallback;
  }
  if (typeof value === "number") {
    if (isNaN(value) || value <= 0) return fallback;
    const d = new Date(value > 10000000000 ? value : value * 1000);
    return isNaN(d.getTime()) ? fallback : getNowDateStr(d);
  }
  const d = new Date(value as any);
  if (isNaN(d.getTime())) return fallback;
  return getNowDateStr(d);
}

export function formatTime(value?: string | Date | null, fallback = "-"): string {
  if (!value) return fallback;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return fallback;
    const match = trimmed.match(/(\d{1,2}):(\d{2})/);
    if (match) {
      return `${pad2(parseInt(match[1], 10))}:${match[2]}`;
    }
  }
  const d = new Date(value);
  if (isNaN(d.getTime())) return fallback;
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

export function formatDateTime(value?: string | number | Date | null, fallback = "-"): string {
  if (!value) return fallback;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return fallback;
    const match = trimmed.match(/^(\d{4}[-/]\d{2}[-/]\d{2})[ T](\d{2}:\d{2})/);
    if (match) {
      return `${match[1].replace(/\//g, "-")} ${match[2]}`;
    }
  }
  const d = new Date(value);
  if (isNaN(d.getTime())) return fallback;
  return getNowDateTimeStr(d);
}

export function formatDateTimeSeconds(value?: string | number | Date | null, fallback = "-"): string {
  if (!value) return fallback;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return fallback;
    const match = trimmed.match(/^(\d{4}[-/]\d{2}[-/]\d{2})[ T](\d{2}:\d{2}:\d{2})/);
    if (match) {
      return `${match[1].replace(/\//g, "-")} ${match[2]}`;
    }
  }
  const d = new Date(value);
  if (isNaN(d.getTime())) return fallback;
  return `${getNowDateStr(d)} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

export function formatTimeRange(start?: string | null, end?: string | null, fallback = "-"): string {
  const s = formatTime(start, "");
  const e = formatTime(end, "");
  if (s && e) return `${s} - ${e}`;
  if (s) return s;
  if (e) return e;
  return fallback;
}

export function formatMonthLabel(yearMonth?: string | null, lang = "zh-CN"): string {
  if (!yearMonth || !/^\d{4}-\d{2}$/.test(yearMonth.trim())) return yearMonth || "-";
  const [yStr, mStr] = yearMonth.trim().split("-");
  const m = parseInt(mStr, 10);
  if (lang === "en") {
    const enMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${enMonths[m - 1] || mStr} ${yStr}`;
  }
  if (lang === "th") {
    const thMonths = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
    return `${thMonths[m - 1] || mStr} ${yStr}`;
  }
  return `${yStr}年${mStr}月`;
}
