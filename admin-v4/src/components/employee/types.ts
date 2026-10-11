import type { Employee, HolidayRecord, SalaryChangeLog, SalaryFieldDiff, AppConfig } from "../../types";
import type { Language } from "../../lib/i18n";
import type { EmployeePageResult } from "../../lib/employeeApi";

export type { Employee, HolidayRecord, SalaryChangeLog, SalaryFieldDiff, Language };

export type EmployeeStatusFilter = "active" | "resigned";

export interface EmployeeListProps {
  employees: Employee[];
  loading?: boolean;
  reloadKey?: number;
  currentWarehouseCode?: string;
  loadEmployees?: (status: "active" | "resigned", keyword: string, page: number, pageSize: number, warehouseCode?: string) => Promise<EmployeePageResult>;
  onRefresh?: () => Promise<void> | void;
  onAddEmployee: () => void;
  onEditEmployee: (emp: Employee) => Promise<void> | void;
  onDeleteEmployee: (emp: Employee) => void;
  onUpdateEmployeePassword?: (empId: number, newPass: string) => Promise<void> | void;
  holidays: HolidayRecord[];
  onUpdateHolidays: (list: HolidayRecord[]) => void;
  onOpenSettings: () => void;
  hasPermission?: (permId: string) => boolean;
  lang?: Language;
  addToast?: (msg: string, type?: "success" | "error" | "info") => void;
}

export interface EmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (emp: Partial<Employee>) => Promise<void> | void;
  employee?: Employee | null;
  canManagePermissions?: boolean;
  isPermissionsLoading?: boolean;
  defaultWarehouseCode?: string;
  lang?: Language;
}

export interface SalaryChangeConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: { effectiveDate: string; changeReason: string }) => Promise<void> | void;
  diffs: SalaryFieldDiff[];
  employeeName: string;
  currency: string;
  lang?: Language;
}

export interface EmployeeCredentialsModalProps {
  employee: Employee | null;
  isOpen: boolean;
  onClose: () => void;
  onResetPassword?: (empId: number, newPass: string) => Promise<void> | void;
  hasResetPermission?: boolean;
  addToast?: (msg: string, type?: "success" | "error" | "info") => void;
  lang?: Language;
}

export interface HolidaySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  holidays: HolidayRecord[];
  onUpdateHolidays: (list: HolidayRecord[]) => void;
  hasEditPermission?: boolean;
  addToast?: (msg: string, type?: "success" | "error" | "info") => void;
  lang?: Language;
}

export interface EmployeeDetailModalProps {
  employee: Employee | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (emp: Employee) => void;
  hasEditPermission?: boolean;
  lang?: Language;
}
