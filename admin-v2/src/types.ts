/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type TabId = 'dashboard' | 'employees' | 'attendance' | 'payroll' | 'sop';

export type Gender = 'male' | 'female';

export type CountryCode = 'MM' | 'TH' | 'CN' | 'VN' | 'KH';

export type AttendanceType = 'normal' | 'late' | 'early' | 'absent' | 'leave' | 'overtime';

export type EmployeeStatus = '在职' | '休假';

export type CurrencyCode = 'THB' | 'USD' | 'MYR' | 'IDR';

export interface AppConfig {
  startShift: string;
  endShift: string;
  breakStart: string;
  breakEnd: string;
  standardHours: number;
  otHourlyFee: number;
  overtimeMultiplier: number;
  taxRate: number;
  dailyBreakMinutes: number;
  currency: CurrencyCode;
}

export interface Employee {
  id: number;
  name: string;
  gender: Gender;
  country: CountryCode;
  role: string;
  dept: string;
  hourlyRate?: number;
  baseMonthlyWage?: number;
  currency: CurrencyCode;
  joinDate: string;
  status: EmployeeStatus;
  photo: string | null;
}

export interface AttendanceRecord {
  id: string;
  empId: number;
  date: string;
  inTime: string;
  outTime: string;
  type: AttendanceType;
  note: string;
}

export interface AttendanceDetails {
  raw: number;
  valid: number;
  standard: number;
  ot: number;
}

export interface EmployeeStats {
  valid: number;
  ot: number;
  otPay: number;
  currency: CurrencyCode;
}

export interface PayrollSummary {
  emp: Employee;
  valid: number;
  ot: number;
  basePay: number;
  otPay: number;
  gross: number;
  net: number;
  workingDays: number;
  otCount: number;
}

export interface SopAttachment {
  name: string;
  url: string;
  size: string;
}

export interface SopDocument {
  id: string;
  title: string;
  content: string;
  images: string[];
  attachments: SopAttachment[];
  targetType: 'all' | 'specific';
  targetEmployeeIds?: number[];
  createdAt: string;
  creator: string;
  status: 'draft' | 'published';
  reads: Record<number, string>; // maps employeeId to readAt ISO string
}

