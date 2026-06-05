/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type TabId = 'dashboard' | 'employees' | 'attendance' | 'payroll' | 'sop';

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
  nickname: string;
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
  attendanceBonus: number;
  socialSecurity: number;
  currency: CurrencyCode;
  joinDate: string;
  status: EmployeeStatus;
  photo: string | null;
  isDeleted: boolean;
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
  reads: Record<number, string>;
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
  // 员工 v2 界面不再展示规则历史；后端返回空数组以兼容旧调用方。
  ruleHistory: EmployeeAttendanceRuleHistory[];
}

export interface EmployeeListFilters {
  keyword?: string;
  status?: string;
  country?: string;
  salaryType?: string;
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
  nickname: string;
  gender: Gender;
  country: CountryCode;
  phone: string;
  role: string;
  dept: string;
  joinDate: string;
  status: EmployeeStatus;
  salaryType: SalaryType;
  hourlyRate: number | null;
  fixedSalary: number | null;
  attendanceBonus: number;
  socialSecurity: number;
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
  // v2 表格接口一次性返回员工展示字段，避免页面再拼旧员工规则/薪资规则接口或在前端二次推导。
  employeeGender: Gender | null;
  employeeCountry: CountryCode | null;
  employeeRole: string;
  employeeDept: string;
  employeeStatus: EmployeeStatus | null;
  employeePhoto: string | null;
  salaryType: SalaryType | null;
  hourlyRate: number | null;
  fixedSalary: number | null;
  currency: CurrencyCode;
  attendanceRecordId: number | null;
  date: string;
  rawInTime: string | null;
  rawOutTime: string | null;
  rawHours: number;
  breakDeductionHours: number;
  validHours: number;
  standardHours: number;
  overtimeRawHours: number;
  overtimePayHours: number;
  // v2 后端直接返回费用结果，前端只展示/导出，不再二次按旧考勤规则重算。
  workPay: number;
  overtimePay: number;
  totalPay: number;
  status: AttendanceCalculationStatus;
  statusLabel: string;
  isOvertime: boolean;
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
  // 薪资 v2 表格的“员工详情”列必须由薪资结果接口一次返回展示字段，避免回退到旧员工列表或计薪方式造成列内容错乱。
  employeeDept: string;
  employeeRole: string;
  employeePhoto: string | null;
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
  socialSecurityAmount: number;
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

export interface AttendanceRecordCreatePayload extends AttendanceRecordUpdatePayload {
  employeeId: number;
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

export interface DashboardConfig {
  standardHours: number;
  dailyBreakMinutes: number;
  overtimeMultiplier: number;
  otHourlyFee: number;
  currency: CurrencyCode;
}

export interface DashboardEmployeeStat {
  employeeId: number;
  employeeNo?: string;
  employeeName: string;
  employeeNickname: string;
  employeeDept: string;
  employeeRole: string;
  employeePhoto: string | null;
  totalValidHours: number;
  totalOvertimeHours: number;
  daysWorked: number;
  avgDailyHours: number;
  satiety: number;
}

export interface DashboardDepartmentStat {
  deptName: string;
  staffCount: number;
  totalValidHours: number;
  totalOvertimeHours: number;
  totalDays: number;
  avgHours: number;
  otRatio: number;
  loadLabel: string;
  badgeTone: 'emerald' | 'amber' | 'rose';
  actionAdvice: string;
}

export interface DashboardData {
  dashboardDate: string;
  totalEmployeeCount: number;
  activeEmployeeCount: number;
  inactiveEmployeeCount: number;
  todayWorkHours: number;
  todayAverageWorkHours: number;
  todayOvertimeHours: number;
  todayOvertimeEstimatePay: number;
  todayExceptionCount: number;
  todayExceptionRate: number;
  config: DashboardConfig;
  employeeStats: DashboardEmployeeStat[];
  departmentStats: DashboardDepartmentStat[];
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
