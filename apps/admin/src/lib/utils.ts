/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { AppConfig, AttendanceDetails, AttendanceRecord, AttendanceRule, CurrencyCode, Employee, EmployeeStatus, SalaryType } from "../types";

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

export const EMPLOYEE_STATUS_META: Record<EmployeeStatus, { label: string; className: string }> = {
  active: { label: '在职', className: 'bg-green-100 text-green-700' },
  on_leave: { label: '休假', className: 'bg-sky-100 text-sky-700' },
  probation: { label: '试用', className: 'bg-blue-100 text-blue-700' },
  disabled: { label: '停用', className: 'bg-slate-100 text-slate-700' },
  resigned: { label: '离职', className: 'bg-slate-200 text-slate-700' }
};

export const SALARY_TYPE_LABELS: Record<SalaryType, string> = {
  fixed: '固定工资',
  hourly: '时薪'
};

export function parseTimeToHours(str: string): number {
  if (!str) return 0;
  const parts = str.split(':');
  return parseInt(parts[0], 10) + parseInt(parts[1], 10) / 60;
}

export function calculateShiftStandardHours({
  startShift,
  endShift,
  breakStart,
  breakEnd
}: {
  startShift: string;
  endShift: string;
  breakStart: string;
  breakEnd: string;
}) {
  if (!startShift || !endShift) {
    return 0;
  }

  let start = parseTimeToHours(startShift);
  let end = parseTimeToHours(endShift);
  if (end <= start) {
    end += 24;
  }

  const rawHours = Math.max(0, end - start);

  if (!breakStart || !breakEnd) {
    return rawHours;
  }

  let normalizedBreakStart = parseTimeToHours(breakStart);
  let normalizedBreakEnd = parseTimeToHours(breakEnd);

  if (normalizedBreakStart < start) {
    normalizedBreakStart += 24;
  }
  if (normalizedBreakEnd <= normalizedBreakStart) {
    normalizedBreakEnd += 24;
  }

  const overlapStart = Math.max(start, normalizedBreakStart);
  const overlapEnd = Math.min(end, normalizedBreakEnd);
  const breakHours = overlapEnd > overlapStart ? overlapEnd - overlapStart : 0;

  return Math.max(0, rawHours - breakHours);
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

export function formatCompensation(employee: Pick<Employee, "salaryType" | "hourlyRate" | "fixedSalary" | "currency">): string {
  if (employee.salaryType === 'fixed') {
    return `${formatCurrency(employee.fixedSalary || 0, employee.currency)} / 月`;
  }

  return `${formatCurrency(employee.hourlyRate || 0, employee.currency)} / 小时`;
}

export function getAttendanceRuleEffectiveStatus(rule: Pick<AttendanceRule, "effectiveStartDate" | "effectiveEndDate">) {
  const today = new Date().toISOString().slice(0, 10);

  if (today < rule.effectiveStartDate) {
    return {
      label: "未开始",
      className: "bg-blue-50 text-blue-700 border border-blue-100"
    };
  }

  if (rule.effectiveEndDate && today > rule.effectiveEndDate) {
    return {
      label: "已过期",
      className: "bg-slate-100 text-slate-700 border border-slate-200"
    };
  }

  return {
    label: "生效中",
    className: "bg-emerald-50 text-emerald-700 border border-emerald-100"
  };
}

export function formatDateRange(startDate: string, endDate: string | null) {
  return `${startDate} 至 ${endDate || "长期有效"}`;
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const pad = (part: number) => String(part).padStart(2, "0");
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}
