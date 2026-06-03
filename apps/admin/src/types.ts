/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type TabId = 'dashboard' | 'employees' | 'attendanceRules' | 'attendance' | 'payroll';

export type Gender = 'male' | 'female';

export type CountryCode = 'MM' | 'TH' | 'CN' | 'VN' | 'KH';

export type SalaryType = 'fixed' | 'hourly';
export type SalaryAdjustmentType = 'allowance' | 'deduction' | 'other';
export type PayrollCalculationStatus = 'draft' | 'calculated' | 'blocked' | 'confirmed';
export type PayrollReviewStatus = 'pending' | 'approved' | 'rejected';

export type AttendanceType = 'normal' | 'late' | 'early' | 'absent' | 'leave' | 'overtime';

export type AttendanceSource = 'manual' | 'device' | 'import' | 'system';

export type AttendanceCalculationStatus = 'normal' | 'leave' | 'absent' | 'manual_adjusted' | 'exception';

export type EmployeeStatus = 'active' | 'on_leave' | 'probation' | 'disabled' | 'resigned';

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
  employeeNo: string;
  name: string;
  gender: Gender;
  country: CountryCode;
  phone: string;
  role: string;
  dept: string;
  attendanceRuleId: number;
  attendanceRuleName?: string;
  salaryType: SalaryType;
  hourlyRate: number | null;
  fixedSalary: number | null;
  currency: CurrencyCode;
  joinDate: string;
  status: EmployeeStatus;
  photo: string | null;
  isDeleted: boolean;
}

export interface AttendanceRuleOption {
  id: number;
  name: string;
  isActive: boolean;
  effectiveStartDate: string;
  effectiveEndDate: string | null;
}

export type OvertimeRounding = 'floor_to_half_hour';

export interface AttendanceRule {
  id: number;
  name: string;
  isActive: boolean;
  effectiveStartDate: string;
  effectiveEndDate: string | null;
  startShift: string;
  endShift: string;
  breakStart: string;
  breakEnd: string;
  standardHours: number;
  overtimeEnabled: boolean;
  otHourlyFee: number;
  overtimeMinUnitHours: 0.5;
  overtimeRounding: OvertimeRounding;
  relatedEmployeeCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceRuleFormData {
  name: string;
  isActive: boolean;
  effectiveStartDate: string;
  effectiveEndDate: string | null;
  startShift: string;
  endShift: string;
  breakStart: string;
  breakEnd: string;
  standardHours: number;
  overtimeEnabled: boolean;
  otHourlyFee: number;
}

export interface AttendanceRuleDetail {
  rule: AttendanceRule;
}

export interface AttendanceRuleRelatedEmployee {
  id: number;
  employeeNo: string;
  name: string;
  dept: string;
  role: string;
  status: EmployeeStatus;
  relationStartDate: string;
  relationEndDate: string | null;
  isCurrentRelation: boolean;
}

export interface EmployeeAttendanceRuleHistory {
  id: number;
  employeeId: number;
  attendanceRuleId: number;
  attendanceRuleName?: string;
  effectiveStartDate: string;
  effectiveEndDate: string | null;
  createdAt: string;
  createdBy?: string | null;
}

export interface EmployeeDetail {
  employee: Employee;
  ruleHistory: EmployeeAttendanceRuleHistory[];
}

export interface EmployeeListFilters {
  keyword?: string;
  status?: string;
  country?: string;
  salaryType?: string;
  attendanceRuleId?: string;
  role?: string;
  includeInactive?: boolean;
}

export interface EmployeeListPage {
  items: Employee[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  roleOptions: string[];
}

export interface EmployeeUpsertPayload {
  name: string;
  gender: Gender;
  country: CountryCode;
  phone: string;
  role: string;
  dept: string;
  joinDate: string;
  status: EmployeeStatus;
  attendanceRuleId: number;
  ruleEffectiveStartDate: string;
  salaryType: SalaryType;
  hourlyRate: number | null;
  fixedSalary: number | null;
  salaryEffectiveStartDate: string;
  currency: CurrencyCode;
  photo: string | null;
}

export interface AttendanceRecord {
  id: number;
  employeeId: number;
  date: string;
  inTime: string | null;
  outTime: string | null;
  type: AttendanceType;
  note: string;
  source: AttendanceSource;
}

export interface AttendanceCalculationResult {
  id: number;
  employeeId: number;
  employeeNo?: string;
  employeeName: string;
  attendanceRecordId: number | null;
  date: string;
  attendanceRuleId: number | null;
  attendanceRuleName?: string;
  rawInTime: string | null;
  rawOutTime: string | null;
  rawHours: number;
  breakDeductionHours: number;
  validHours: number;
  standardHours: number;
  overtimeRawHours: number;
  overtimePayHours: number;
  status: AttendanceCalculationStatus;
  hasException: boolean;
  exceptionReason: string | null;
  note: string;
  source: AttendanceSource | null;
  calculatedAt: string;
}

export interface AttendanceCalculationDetail {
  result: AttendanceCalculationResult;
  employee: Employee | null;
  record: AttendanceRecord | null;
  rule: AttendanceRule | null;
}

export interface MonthlyAttendanceSummary {
  id: number;
  employeeId: number;
  employeeNo?: string;
  employeeName: string;
  yearMonth: string;
  periodStartDate: string;
  periodEndDate: string;
  totalRawHours: number;
  totalBreakDeductionHours: number;
  totalValidHours: number;
  totalStandardHours: number;
  totalOvertimeRawHours: number;
  totalOvertimePayHours: number;
  recordCount: number;
  exceptionCount: number;
  absentCount: number;
  leaveCount: number;
  manualAdjustedCount: number;
  canGeneratePayroll: boolean;
  blockedReason: string | null;
  calculatedAt: string;
}

export interface SalaryProfile {
  id: number;
  employeeId: number;
  salaryType: SalaryType;
  fixedSalary: number | null;
  hourlyRate: number | null;
  currency: CurrencyCode;
  isActive: boolean;
  effectiveStartDate: string | null;
  effectiveEndDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SalaryAdjustmentItem {
  id: number;
  employeeId: number;
  yearMonth: string;
  type: SalaryAdjustmentType;
  name: string;
  amount: number;
  note: string;
  createdAt: string;
  updatedAt: string;
}

export interface SalaryAdjustmentPayload {
  employeeId: number;
  yearMonth: string;
  type: SalaryAdjustmentType;
  name: string;
  amount: number;
  note: string;
}

export interface MonthlyPayrollResult {
  id: number;
  employeeId: number;
  employeeNo?: string;
  employeeName: string;
  yearMonth: string;
  salaryType: SalaryType;
  fixedSalary: number | null;
  hourlyRate: number | null;
  currency: CurrencyCode;
  validHours: number;
  standardHours: number;
  hourlyPay: number;
  overtimePayHours: number;
  overtimePay: number;
  allowanceTotal: number;
  deductionTotal: number;
  otherTotal: number;
  grossPay: number;
  totalDeduction: number;
  netPay: number;
  calculationStatus: PayrollCalculationStatus;
  reviewStatus: PayrollReviewStatus;
  blockedReason: string | null;
  calculatedAt: string | null;
  confirmedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PayrollResultDetail {
  result: MonthlyPayrollResult;
  employee: Employee | null;
  salaryProfile: SalaryProfile | null;
  attendanceSummary: MonthlyAttendanceSummary | null;
  adjustmentItems: SalaryAdjustmentItem[];
}

export interface PayrollGenerateBatchResponse {
  successCount: number;
  skippedCount: number;
  failureCount: number;
  failures: Array<{
    employeeId: number;
    error: string;
  }>;
}

export interface WorkspaceBootstrapResponse {
  created: boolean;
  yearMonth: string;
  employeesCreated: number;
  rulesCreated: number;
  message: string;
}

export interface AttendanceRecordUpdatePayload {
  date: string;
  type: AttendanceType;
  inTime: string | null;
  outTime: string | null;
  note: string;
}

export interface RecalculateBatchItem {
  employeeId: number;
  date: string;
}

export interface RecalculateBatchResponse {
  successCount: number;
  failureCount: number;
  failures: Array<{
    employeeId: number;
    date: string;
    error: string;
  }>;
}

export interface AttendanceDetails {
  raw: number;
  valid: number;
  standard: number;
  ot: number;
}

export interface DashboardEmployeeStat {
  employeeId: number;
  employeeNo?: string;
  employeeName: string;
  validHours: number;
  overtimePayHours: number;
  exceptionCount: number;
}

export interface DashboardData {
  date: string;
  yearMonth: string;
  activeEmployeeCount: number;
  activeRuleCount: number;
  todayOvertimePay: number;
  todayRecordCount: number;
  todayExceptionCount: number;
  todayExceptionRate: number;
  monthlyPayrollGrossPay: number;
  monthlyPayrollDeduction: number;
  monthlyPayrollNetPay: number;
  monthlyValidHours: number;
  monthlyOvertimePayHours: number;
  monthlyExceptionCount: number;
  currency: CurrencyCode;
  employeeStats: DashboardEmployeeStat[];
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
}
