import type { AppConfig, AttendanceRecord, Employee, HolidayRecord, LeaveRequest } from "../../types";
import type { AttendanceCalculationRow } from "../../lib/attendanceApi";

export interface AttendanceTableProps {
  employees: Employee[];
  attendance: AttendanceRecord[];
  config: AppConfig;
  selectedIds: Set<string>;
  onSelect: (id: string, checked: boolean) => void;
  onSelectAll: (ids: string[]) => void;
  onEditRecord: (id: string | null, empId?: number, date?: string, rec?: AttendanceRecord | null) => void;
  holidays: HolidayRecord[];
  leaveRequests?: LeaveRequest[];
  onUpdateLeaveRequests?: (newList: LeaveRequest[]) => void;
  hasPermission?: (permId: string) => boolean;
  onRefresh?: () => Promise<void> | void;
  addToast?: (msg: string, kind?: "success" | "error" | "info") => void;
  warehouseCode?: string;
}

export type FlatAttendanceRow =
  | AttendanceCalculationRow
  | {
      emp: Employee;
      rec: AttendanceRecord | null;
      date: string;
      status?: string;
      details?: { valid: number; ot: number };
      shiftPay?: number;
      otPay?: number;
      mealAllowance?: number;
      dailySocialSecurity?: number;
      dailyServiceFee?: number;
      totalPay?: number;
    };

export interface RowMetrics {
  details: { valid: number; ot: number };
  shiftPay: number;
  otPay: number;
  mealAllowance: number;
  dailySocialSecurity: number;
  dailyServiceFee: number;
  totalPay: number;
  typeName: string;
  type: string;
  isAbsentOrLeave: boolean;
}

export interface AttendanceDetailRecord {
  emp: Employee;
  rec: AttendanceRecord | null;
  date: string;
  details: { valid: number; ot: number };
  shiftPay: number;
  otPay: number;
  mealAllowance: number;
  dailySocialSecurity: number;
  dailyServiceFee: number;
  totalPay: number;
}
