import type { Employee } from "../types";
import { formatDate } from "./utils";

const token = () => localStorage.getItem("wms_admin_token") || "";

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      Authorization: `Bearer ${token()}`,
      ...init.headers
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "员工请求失败");
  return data as T;
}

type ApiEmployee = {
  id: number;
  employeeNo: string;
  name: string;
  nickname?: string;
  gender: Employee["gender"];
  warehouseCode?: string;
  nationality?: string | null;
  country: Employee["country"];
  phone?: string;
  role: string;
  dept: string;
  joinDate: string;
  status: "active" | "on_leave" | "probation" | "resigned";
  salaryType: "fixed" | "hourly";
  hourlyRate: number | null;
  fixedSalary: number | null;
  dailyWage?: number | null;
  isDispatchPersonnel?: boolean;
  attendanceBonus?: number;
  socialSecurity?: number;
  mealAllowance?: number;
  licenseFee?: number | null;
  serviceFeeRate?: number;
  currency: Employee["currency"];
  bankCardNumber?: string | null;
  bankName?: string | null;
  idCard?: string | null;
  overtimeHourlyFee?: number | null;
  otRuleType?: "fixed" | "multiplier";
  otFixedRate?: number | null;
  otBaseRate?: number | null;
  otMultiplierWorkday?: number | null;
  otMultiplierWeekend?: number | null;
  otMultiplierHoliday?: number | null;
  taxRate?: number | null;
  username?: string;
  permissions?: string[];
  photo: string | null;
  updatedAt?: string;
};

type EmployeePage = { items: ApiEmployee[]; total: number | null; page: number; pageSize: number; hasMore: boolean };
export type EmployeePageResult = { items: Employee[]; total: number | null; page: number; pageSize: number; hasMore: boolean };
type EmployeeDetail = { employee: ApiEmployee };
export type EmployeeAccount = { account: string; status: string; lastLoginAt?: string | null; passwordUpdatedAt?: string | null };

const statusFromApi = (status: ApiEmployee["status"]): Employee["status"] =>
  status === "resigned" ? "离职" : status === "on_leave" ? "休假" : status === "probation" ? "试用" : "在职";

const statusToApi = (status: Employee["status"]): ApiEmployee["status"] =>
  status === "离职" ? "resigned" : status === "休假" ? "on_leave" : status === "试用" ? "probation" : "active";

export function fromApiEmployee(employee: ApiEmployee): Employee {
  const isFixed = employee.salaryType === "fixed" || (employee.fixedSalary != null && Number(employee.fixedSalary) > 0);
  return {
    id: employee.id,
    employeeNo: employee.employeeNo,
    name: employee.name,
    nickname: employee.nickname,
    gender: employee.gender,
    warehouseCode: employee.warehouseCode || "TH",
    nationality: employee.nationality || (employee.country as string) || "MM",
    country: ((employee.nationality || employee.country || "MM") as Employee["country"]),
    phone: employee.phone,
    role: employee.role,
    dept: employee.dept,
    salaryType: isFixed ? "fixed" : "hourly",
    hourlyRate: isFixed ? undefined : (employee.hourlyRate != null ? Number(employee.hourlyRate) : undefined),
    baseMonthlyWage: isFixed ? Number(employee.fixedSalary) : undefined,
    dailyWage: isFixed ? undefined : (employee.dailyWage != null ? Number(employee.dailyWage) : undefined),
    attendanceBonus: employee.attendanceBonus != null && Number(employee.attendanceBonus) > 0 ? Number(employee.attendanceBonus) : undefined,
    socialSecurity: employee.socialSecurity != null && Number(employee.socialSecurity) > 0 ? Number(employee.socialSecurity) : undefined,
    mealAllowanceDaily: employee.mealAllowance != null && Number(employee.mealAllowance) > 0 ? Number(employee.mealAllowance) : undefined,
    licenseFee: employee.licenseFee != null && Number(employee.licenseFee) > 0 ? Number(employee.licenseFee) : undefined,
    currency: (employee.currency || "THB") as Employee["currency"],
    joinDate: formatDate(employee.joinDate, ""),
    status: statusFromApi(employee.status),
    photo: employee.photo,
    username: employee.username || employee.employeeNo,
    sourceType: employee.isDispatchPersonnel ? "劳务派遣" : "自招",
    dispatchCommissionRate: employee.serviceFeeRate != null && Number(employee.serviceFeeRate) > 0 ? Number(employee.serviceFeeRate) : undefined,
    bankCardNumber: employee.bankCardNumber || undefined,
    bankName: employee.bankName || undefined,
    idCard: employee.idCard || undefined,
    permissions: employee.permissions || [],
    otRuleType: employee.otRuleType || "fixed",
    // 后端用 overtime_hourly_fee 列同时存储旧版加班费和新版固定加班率，两字段指向同一列，取其一即可
    otFixedRate: employee.otFixedRate != null && Number(employee.otFixedRate) > 0
      ? Number(employee.otFixedRate)
      : (employee.overtimeHourlyFee != null && Number(employee.overtimeHourlyFee) > 0 ? Number(employee.overtimeHourlyFee) : undefined),
    otBaseRate: employee.otBaseRate != null && Number(employee.otBaseRate) > 0 ? Number(employee.otBaseRate) : undefined,
    otMultiplierWorkday: employee.otMultiplierWorkday != null ? Number(employee.otMultiplierWorkday) : 1.5,
    otMultiplierWeekend: employee.otMultiplierWeekend != null ? Number(employee.otMultiplierWeekend) : 2.0,
    otMultiplierHoliday: employee.otMultiplierHoliday != null ? Number(employee.otMultiplierHoliday) : 3.0,
    taxRate: employee.taxRate != null ? Number(employee.taxRate) : 5,
    updatedAt: employee.updatedAt
  };
}

function toApiEmployee(employee: Partial<Employee>) {
  const hasBaseMonthlyWage = employee.baseMonthlyWage !== undefined && employee.baseMonthlyWage !== null && (employee.baseMonthlyWage as any) !== "" && Number(employee.baseMonthlyWage) > 0;

  let salaryType: "fixed" | "hourly" = "hourly";
  let finalFixedSalary: number | null = null;
  let finalHourlyRate: number | null = null;
  let finalDailyWage: number | null = null;

  if (hasBaseMonthlyWage) {
    salaryType = "fixed";
    finalFixedSalary = Number(employee.baseMonthlyWage);
    finalHourlyRate = null;
    finalDailyWage = null;
  } else {
    salaryType = "hourly";
    finalFixedSalary = null;
    finalDailyWage = employee.dailyWage != null && (employee.dailyWage as any) !== "" && Number(employee.dailyWage) > 0 ? Number(employee.dailyWage) : null;
    if (employee.hourlyRate != null && (employee.hourlyRate as any) !== "" && Number(employee.hourlyRate) > 0) {
      finalHourlyRate = Number(employee.hourlyRate);
    } else if (finalDailyWage !== null) {
      finalHourlyRate = Math.round((finalDailyWage / 8) * 100) / 100;
    } else {
      finalHourlyRate = null;
    }
  }

  const otRuleType = employee.otRuleType === "multiplier" ? "multiplier" : "fixed";
  const otFixedRate = employee.otFixedRate != null && !isNaN(Number(employee.otFixedRate)) && Number(employee.otFixedRate) > 0 ? Number(employee.otFixedRate) : null;
  const otBaseRate = employee.otBaseRate != null && !isNaN(Number(employee.otBaseRate)) && Number(employee.otBaseRate) > 0 ? Number(employee.otBaseRate) : null;
  const otMultiplierWorkday = employee.otMultiplierWorkday != null && !isNaN(Number(employee.otMultiplierWorkday)) ? Number(employee.otMultiplierWorkday) : 1.5;
  const otMultiplierWeekend = employee.otMultiplierWeekend != null && !isNaN(Number(employee.otMultiplierWeekend)) ? Number(employee.otMultiplierWeekend) : 2.0;
  const otMultiplierHoliday = employee.otMultiplierHoliday != null && !isNaN(Number(employee.otMultiplierHoliday)) ? Number(employee.otMultiplierHoliday) : 3.0;

  return {
    name: employee.name,
    nickname: employee.nickname || "",
    gender: employee.gender,
    warehouseCode: employee.warehouseCode || undefined,
    nationality: employee.nationality || employee.country || "MM",
    country: employee.nationality || employee.country || "MM",
    phone: employee.phone || "",
    role: employee.role,
    dept: employee.dept,
    joinDate: formatDate(employee.joinDate, ""),
    status: statusToApi(employee.status || "在职"),
    salaryType,
    hourlyRate: finalHourlyRate,
    fixedSalary: finalFixedSalary,
    dailyWage: finalDailyWage,
    isDispatchPersonnel: employee.sourceType === "劳务派遣",
    attendanceBonus: employee.attendanceBonus != null && Number(employee.attendanceBonus) > 0 ? Number(employee.attendanceBonus) : null,
    socialSecurity: employee.socialSecurity != null && Number(employee.socialSecurity) > 0 ? Number(employee.socialSecurity) : null,
    mealAllowance: employee.mealAllowanceDaily != null && Number(employee.mealAllowanceDaily) > 0 ? Number(employee.mealAllowanceDaily) : null,
    licenseFee: employee.licenseFee != null && Number(employee.licenseFee) > 0 ? Number(employee.licenseFee) : null,
    serviceFeeRate: employee.dispatchCommissionRate != null && Number(employee.dispatchCommissionRate) > 0 ? Number(employee.dispatchCommissionRate) : null,
    currency: employee.currency || "THB", // 避免传 undefined 导致后端 fallback 覆盖用户选择
    bankCardNumber: employee.bankCardNumber || null,
    bankName: employee.bankName || null,
    idCard: employee.idCard || null,
    overtimeHourlyFee: otFixedRate, // 向后兼容旧版字段名，与 otFixedRate 指向同一列
    otRuleType,
    otFixedRate,
    otBaseRate,
    otMultiplierWorkday,
    otMultiplierWeekend,
    otMultiplierHoliday,
    taxRate: employee.taxRate != null && !isNaN(Number(employee.taxRate)) ? Number(employee.taxRate) : 5,
    username: employee.username ? employee.username.trim() : undefined,
    password: employee.password ? employee.password.trim() : undefined,
    permissions: Array.isArray(employee.permissions) ? employee.permissions : undefined,
    photo: employee.photo ?? null,
    updatedAt: employee.updatedAt
  };
}

export async function fetchEmployees(status: "active" | "resigned" = "active", keyword = "", page = 1, pageSize = 24, warehouseCode?: string): Promise<EmployeePageResult> {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize), status: status === "resigned" ? "resigned" : "all" });
  if (keyword.trim()) params.set("keyword", keyword.trim());
  if (warehouseCode && warehouseCode !== "ALL") params.set("warehouse_code", warehouseCode);
  const result = await request<EmployeePage>(`/api/v4/admin/employees?${params}`);
  return { ...result, items: result.items.map(fromApiEmployee) };
}

export async function fetchEmployee(id: number) {
  return fromApiEmployee((await request<EmployeeDetail>(`/api/v4/admin/employees/${id}`)).employee);
}

export function fetchEmployeePermissions(id: number) {
  return request<{ permissions: string[]; assignable: boolean }>(`/api/v4/admin/employees/${id}/permissions`);
}

export function updateEmployeePermissions(id: number, permissions: string[]) {
  return request<{ permissions: string[]; assignable: boolean }>(`/api/v4/admin/employees/${id}/permissions`, { method: "PUT", body: JSON.stringify({ permissions }) });
}

export async function createEmployee(employee: Partial<Employee>) {
  return fromApiEmployee((await request<EmployeeDetail>("/api/v4/admin/employees", { method: "POST", body: JSON.stringify(toApiEmployee(employee)) })).employee);
}

export async function updateEmployee(employee: Partial<Employee> & Pick<Employee, "id">) {
  return fromApiEmployee((await request<EmployeeDetail>(`/api/v4/admin/employees/${employee.id}`, { method: "PUT", body: JSON.stringify(toApiEmployee(employee)) })).employee);
}

export async function resignEmployee(id: number) {
  return fromApiEmployee((await request<EmployeeDetail>(`/api/v4/admin/employees/${id}/status`, { method: "PATCH", body: JSON.stringify({ targetStatus: "resigned" }) })).employee);
}

export async function deleteEmployee(id: number) {
  return request<{ success: boolean; employee: ApiEmployee }>(`/api/v4/admin/employees/${id}`, { method: "DELETE" });
}

export async function fetchEmployeeAccount(id: number) {
  return request<EmployeeAccount>(`/api/v4/admin/employees/${id}/app-account`);
}

export async function resetEmployeePassword(id: number, newPassword: string) {
  await request(`/api/v4/admin/employees/${id}/reset-password`, { method: "POST", body: JSON.stringify({ newPassword }) });
}
