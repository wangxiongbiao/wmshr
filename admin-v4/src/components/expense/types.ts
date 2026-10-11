import { ExpenseRecord, Employee, AppConfig, AttendanceRecord, HolidayRecord, PayrollSummary } from "../../types";

export type { ExpenseRecord, Employee, AppConfig, AttendanceRecord, HolidayRecord, PayrollSummary };

export interface ExpenseManagerProps {
  employees: Employee[];
  addToast: (msg: string, kind?: "success" | "error" | "info") => void;
  attendance?: AttendanceRecord[];
  config?: AppConfig;
  holidays?: HolidayRecord[];
  loading?: boolean;
  onRefresh?: () => Promise<void> | void;
}

export interface ReceiptPreset {
  name: string;
  url: string;
}

export interface CurrencyItem {
  code: string;
  symbol: string;
  rate: number;
  label: string;
}

export interface ApprovalFlowDefinition {
  enabled: boolean;
  steps: string[];
}

export interface ApprovalFlowConfig {
  payout: ApprovalFlowDefinition;
  income: ApprovalFlowDefinition;
}

export type ApprovalFlowType = 'payout' | 'income';

export interface ExpenseFormState {
  name: string;
  type: string;
  paymentMethod: string;
  amount: number;
  currency: string;
  receiptUrl: string;
  receiptName: string;
  payerId: number;
  payerName: string;
  paymentTime: string;
  note: string;
  purpose: 'advance' | 'payout' | 'income';
  targetApproverId: number;
  targetApproverName: string;
}

export interface ExpenseStats {
  totalExpense: number;
  advanceAmount: number;
  pendingCount: number;
  currentMonthAmount: number;
  totalIncome: number;
}
