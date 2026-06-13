export type MobilePayrollCalculationStatus = 'draft' | 'calculated' | 'blocked' | 'confirmed';
export type MobilePayrollReviewStatus = 'pending' | 'approved' | 'rejected';
export type MobileSalaryAdjustmentType = 'allowance' | 'deduction' | 'other';
export type MobilePayrollReasonCode =
  | 'attendance_exception_summary'
  | 'attendance_exception_zeroed'
  | 'attendance_exception'
  | 'late'
  | 'early'
  | 'missing_punch'
  | 'missing_check_in'
  | 'missing_check_out'
  | 'missing_check_in_out';

export interface MobilePayrollReasonData {
  count?: number;
  hours?: number | string;
  fee?: number | string;
}

export interface MobilePayrollResult {
  id: number;
  employeeId: number;
  employeeNo?: string;
  employeeName: string;
  employeeDept: string;
  employeeRole: string;
  yearMonth: string;
  salaryType: 'fixed' | 'hourly';
  fixedSalary: number | null;
  hourlyRate: number | null;
  currency: string;
  effectiveAttendanceDays: number;
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
  calculationStatus: MobilePayrollCalculationStatus;
  reviewStatus: MobilePayrollReviewStatus;
  blockedReason: string | null;
  blockedReasonCode?: MobilePayrollReasonCode | null;
  blockedReasonData?: MobilePayrollReasonData | null;
  calculatedAt: string | null;
  confirmedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MobilePayrollEmployee {
  id: number;
  employeeNo: string;
  name: string;
  role: string;
  dept: string;
  salaryType: 'fixed' | 'hourly';
  hourlyRate: number | null;
  fixedSalary: number | null;
  attendanceBonus: number;
  socialSecurity: number;
  mealAllowance: number;
  serviceFeeRate: number;
  currency: string;
  photo: string | null;
}

export interface MobileSalaryProfile {
  id: number;
  employeeId: number;
  salaryType: 'fixed' | 'hourly';
  fixedSalary: number | null;
  hourlyRate: number | null;
  serviceFeeRate: number;
  currency: string;
  effectiveStartDate: string | null;
  effectiveEndDate: string | null;
}

export interface MobileAttendanceSummary {
  yearMonth: string;
  totalValidHours: number;
  totalStandardHours: number;
  totalOvertimePayHours: number;
  exceptionCount: number;
  blockedReason: string | null;
  blockedReasonCode?: MobilePayrollReasonCode | null;
  blockedReasonData?: MobilePayrollReasonData | null;
}

export interface MobileSalaryAdjustmentItem {
  id: number;
  employeeId: number;
  yearMonth: string;
  type: MobileSalaryAdjustmentType;
  name: string;
  amount: number;
  note: string;
}

export interface MobilePayrollExceptionDetail {
  date: string;
  status: string;
  statusLabel: string;
  statusCode?: MobilePayrollReasonCode | null;
  reason: string;
  reasonCode?: MobilePayrollReasonCode | null;
  reasonData?: MobilePayrollReasonData | null;
  note: string;
}

export interface MobilePayrollResultDetail {
  result: MobilePayrollResult;
  employee: MobilePayrollEmployee | null;
  salaryProfile: MobileSalaryProfile | null;
  attendanceSummary: MobileAttendanceSummary | null;
  dailyStandardHours: number;
  adjustmentItems: MobileSalaryAdjustmentItem[];
  exceptionDetails: MobilePayrollExceptionDetail[];
}
