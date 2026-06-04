/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { AppConfig, AttendanceDetails, AttendanceRecord, CurrencyCode } from "../types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  THB: '฿',
  USD: '$',
  MYR: 'RM',
  IDR: 'Rp'
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

export function parseTimeToHours(str: string): number {
  if (!str) return 0;
  const parts = str.split(':');
  return parseInt(parts[0], 10) + parseInt(parts[1], 10) / 60;
}

export function calcAttendanceDetails(rec: AttendanceRecord, config: AppConfig): AttendanceDetails {
  if (!rec.inTime || !rec.outTime || rec.type === 'absent' || rec.type === 'leave') {
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

export function formatDuration(hours: number): string {
  return hours.toFixed(2) + 'h';
}

export function formatCurrency(amount: number, code: CurrencyCode): string {
  const symbol = CURRENCY_SYMBOLS[code] || '฿';
  const decimal = code === 'IDR' ? 0 : 2;
  return symbol + amount.toLocaleString(undefined, {
    minimumFractionDigits: decimal,
    maximumFractionDigits: decimal
  });
}
