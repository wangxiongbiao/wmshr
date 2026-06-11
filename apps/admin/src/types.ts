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

export type AttendanceType = 'normal' | 'late' | 'early' | 'absent' | 'leave' | 'sick_leave' | 'overtime';

export type AttendanceSource = 'manual' | 'device' | 'import' | 'system' | 'mobile';

export type AttendanceCalculationStatus = 'pending' | 'checked_in' | 'normal' | 'leave' | 'sick_leave' | 'absent' | 'manual_adjusted' | 'exception';

export type EmployeeStatus = 'active' | 'on_leave' | 'probation' | 'resigned';

export type CurrencyCode = 'THB' | 'USD' | 'MYR' | 'IDR';

export interface AppConfig {
  startShift: string;
  endShift: string;
  breakStart: string;
  breakEnd: string;
  standardHours: number;
  otHourlyFee: number;
  overtimeRuleEnabled: boolean;
  holidayDates: string[];
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
  overtimeHourlyFee?: number | null;
  overtimeRuleEnabled?: boolean | null;
  attendanceBonus: number;
  socialSecurity: number;
  mealAllowance: number;
  serviceFeeRate: number;
  currency: CurrencyCode;
  joinDate: string;
  status: EmployeeStatus;
  photo: string | null;
  isDeleted: boolean;
}

export interface EmployeeAppAccount {
  id: number;
  employeeId: number;
  employeeName: string;
  account: string;
  status: 'active' | 'disabled';
  lastLoginAt: string | null;
  passwordUpdatedAt: string;
  updatedAt: string;
}

export interface EmployeeAppAccountResponse {
  account: EmployeeAppAccount;
  // 第一版 Admin 只展示固定初始/重置密码，后端不保存明文；复制时以该字段作为交付给员工的密码。
  defaultPassword: string;
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
  total: number | null;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface EmployeeAvatarBatchResponse {
  items: Array<{
    id: number;
    photo: string | null;
  }>;
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
  mealAllowance: number;
  serviceFeeRate: number;
  salaryEffectiveStartDate: string;
  currency: CurrencyCode;
  photo?: string | null;
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
  manualOvertimeHourlyFee?: number | null;
  manualOvertimeUseRule?: boolean | null;
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
  mealAllowance: number;
  serviceFeeRate: number;
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
  mealAllowanceAmount: number;
  workPay: number;
  overtimePay: number;
  // 考勤列表的服务费按员工档案比例基于本日上班费用展示；合计列需要把该金额计入，但不改变后端沉淀的旧 total_pay 字段。
  serviceFeeAmount: number;
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

export interface AttendanceRecordAsyncResponse {
  accepted: true;
  employeeId: number;
  date: string;
  message: string;
}

export interface AttendanceCalculationPage {
  items: AttendanceCalculationResult[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface AttendanceMaintenanceRunSummary {
  date: string;
  ownerCount: number;
  targetEmployeeCount: number;
  successCount: number;
  failureCount: number;
  failures: Array<{ ownerUserId?: string; employeeId?: number; date: string; error: string }>;
}

export interface AttendanceDailyMaintenanceResponse {
  previousDate: string;
  todayDate: string;
  settlement: AttendanceMaintenanceRunSummary;
  draft: AttendanceMaintenanceRunSummary;
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
  // 服务费比例随薪资档案快照返回，工资条用它解释本次服务费金额，不能回读员工当前比例。
  serviceFeeRate: number;
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

export interface PayrollExceptionDetail {
  date: string;
  status: string;
  statusLabel: string;
  reason: string;
  note: string;
}

export interface MonthlyPayrollResult {
  id: number;
  employeeId: number;
  employeeNo?: string;
  employeeName: string;
  employeeStatus?: EmployeeStatus | null;
  // 薪资 v2 表格的“员工详情”列必须由薪资结果接口一次返回展示字段，避免回退到旧员工列表或计薪方式造成列内容错乱。
  employeeDept: string;
  employeeRole: string;
  employeePhoto: string | null;
  yearMonth: string;
  salaryType: SalaryType;
  fixedSalary: number | null;
  hourlyRate: number | null;
  currency: CurrencyCode;
  // 工资条里的“有效出勤天数”必须直接来自后端明确定义，不能由前端用工时占比反推。
  effectiveAttendanceDays: number;
  // 餐补折算天数允许出现 0.5、0.75 这类小数；工资条说明必须直接使用后端折算结果，不能由前端自行再推。
  mealAllowanceDayUnits: number;
  mealAllowanceTotal: number;
  attendanceBonusAmount: number;
  validHours: number;
  standardHours: number;
  hourlyPay: number;
  overtimePayHours: number;
  overtimePay: number;
  allowanceTotal: number;
  deductionTotal: number;
  otherTotal: number;
  socialSecurityAmount: number;
  serviceFeeAmount: number;
  grossPay: number;
  totalDeduction: number;
  netPay: number;
  calculationStatus: PayrollCalculationStatus;
  reviewStatus: PayrollReviewStatus;
  blockedReason: string | null;
  // 薪资列表的异常入口需要展示具体异常日期和原因；该字段由月度薪资接口从日考勤计算结果聚合，避免前端再发额外请求或只显示笼统 blockedReason。
  exceptionDetails?: PayrollExceptionDetail[];
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
  dailyStandardHours: number;
  adjustmentItems: SalaryAdjustmentItem[];
  exceptionDetails: PayrollExceptionDetail[];
}

export interface PayrollResultPage {
  items: MonthlyPayrollResult[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
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

export interface PayrollNightlyRunResponse {
  yearMonth: string;
  ownerCount: number;
  targetEmployeeCount: number;
  successCount: number;
  failureCount: number;
  failures: Array<{
    ownerUserId: string;
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

export interface WorkspaceBootstrapStatusResponse {
  ready: boolean;
  hasData: boolean;
  hasBootstrapState: boolean;
  createdDemoData: boolean;
}

export interface AttendanceRecordUpdatePayload {
  date: string;
  type: AttendanceType;
  inTime: string | null;
  outTime: string | null;
  note: string;
  employeeOvertimeHourlyFee?: number | null;
  employeeOvertimeRuleEnabled?: boolean | null;
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
  overtimeRuleEnabled?: boolean;
  holidayDates?: string[];
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
  yearMonth: string;
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
