import type { Employee } from "../types";

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
  status === "resigned" ? "离职" : status === "on_leave" ? "休假" : "在职";

const statusToApi = (status: Employee["status"]): ApiEmployee["status"] =>
  status === "离职" ? "resigned" : status === "休假" ? "on_leave" : "active";

export function fromApiEmployee(employee: ApiEmployee): Employee {
  const isHourly = employee.salaryType === "hourly" || (!employee.fixedSalary && Boolean(employee.hourlyRate));
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
    salaryType: isHourly ? "hourly" : "fixed",
    hourlyRate: employee.hourlyRate != null ? Number(employee.hourlyRate) : (employee.fixedSalary ? Math.round(Number(employee.fixedSalary) / 240) : undefined),
    baseMonthlyWage: employee.fixedSalary != null ? Number(employee.fixedSalary) : (employee.hourlyRate ? Math.round(Number(employee.hourlyRate) * 240) : undefined),
    dailyWage: employee.dailyWage != null ? Number(employee.dailyWage) : (employee.fixedSalary ? Math.round(Number(employee.fixedSalary) / 30) : (employee.hourlyRate ? Math.round(Number(employee.hourlyRate) * 8) : undefined)),
    attendanceBonus: employee.attendanceBonus,
    socialSecurity: employee.socialSecurity,
    mealAllowanceDaily: employee.mealAllowance,
    currency: employee.currency,
    joinDate: employee.joinDate,
    status: statusFromApi(employee.status),
    photo: employee.photo,
    username: employee.username || employee.employeeNo,
    sourceType: employee.isDispatchPersonnel ? "劳务派遣" : "自招",
    dispatchCommissionRate: employee.serviceFeeRate,
    bankCardNumber: employee.bankCardNumber || undefined,
    bankName: employee.bankName || undefined,
    idCard: employee.idCard || undefined,
    permissions: employee.permissions || [],
    otRuleType: employee.otRuleType || "fixed",
    otFixedRate: employee.otFixedRate != null ? Number(employee.otFixedRate) : (employee.overtimeHourlyFee != null ? Number(employee.overtimeHourlyFee) : undefined),
    otBaseRate: employee.otBaseRate != null ? Number(employee.otBaseRate) : undefined,
    otMultiplierWorkday: employee.otMultiplierWorkday != null ? Number(employee.otMultiplierWorkday) : 1.5,
    otMultiplierWeekend: employee.otMultiplierWeekend != null ? Number(employee.otMultiplierWeekend) : 2.0,
    otMultiplierHoliday: employee.otMultiplierHoliday != null ? Number(employee.otMultiplierHoliday) : 3.0,
    updatedAt: employee.updatedAt
  };
}

function toApiEmployee(employee: Partial<Employee>) {
  const hourlyRate = employee.hourlyRate != null && (employee.hourlyRate as any) !== "" ? Number(employee.hourlyRate) : null;
  const baseMonthlyWage = employee.baseMonthlyWage != null && (employee.baseMonthlyWage as any) !== "" ? Number(employee.baseMonthlyWage) : null;
  const dailyWage = employee.dailyWage != null && (employee.dailyWage as any) !== "" ? Number(employee.dailyWage) : null;
  const fixedSalary = baseMonthlyWage != null ? baseMonthlyWage : (dailyWage != null ? dailyWage * 30 : null);
  const salaryType = employee.salaryType || (hourlyRate !== null && fixedSalary === null ? "hourly" : "fixed");

  const otRuleType = employee.otRuleType === "multiplier" ? "multiplier" : "fixed";
  const otFixedRate = employee.otFixedRate != null && !isNaN(Number(employee.otFixedRate)) ? Number(employee.otFixedRate) : null;
  const otBaseRate = employee.otBaseRate != null && !isNaN(Number(employee.otBaseRate)) ? Number(employee.otBaseRate) : null;
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
    joinDate: employee.joinDate,
    status: statusToApi(employee.status || "在职"),
    salaryType,
    hourlyRate,
    fixedSalary,
    dailyWage,
    isDispatchPersonnel: employee.sourceType === "劳务派遣",
    attendanceBonus: Number(employee.attendanceBonus || 0),
    socialSecurity: Number(employee.socialSecurity || 0),
    mealAllowance: Number(employee.mealAllowanceDaily || 0),
    serviceFeeRate: Number(employee.dispatchCommissionRate || 0),
    currency: employee.currency,
    bankCardNumber: employee.bankCardNumber || null,
    bankName: employee.bankName || null,
    idCard: employee.idCard || null,
    overtimeHourlyFee: otFixedRate,
    otRuleType,
    otFixedRate,
    otBaseRate,
    otMultiplierWorkday,
    otMultiplierWeekend,
    otMultiplierHoliday,
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

export async function fetchEmployeeAccount(id: number) {
  return request<EmployeeAccount>(`/api/v4/admin/employees/${id}/app-account`);
}

export async function resetEmployeePassword(id: number, newPassword: string) {
  await request(`/api/v4/admin/employees/${id}/reset-password`, { method: "POST", body: JSON.stringify({ newPassword }) });
}
