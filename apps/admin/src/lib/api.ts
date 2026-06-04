import { supabase } from "./supabase";
import {
  AppConfig,
  AttendanceCalculationDetail,
  AttendanceCalculationResult,
  AttendanceRecord,
  AttendanceRecordUpdatePayload,
  AttendanceRule,
  AttendanceRuleDetail,
  AttendanceRuleFormData,
  AttendanceRuleOption,
  AttendanceRuleRelatedEmployee,
  DashboardData,
  Employee,
  EmployeeDetail,
  EmployeeListFilters,
  EmployeeListPage,
  EmployeeStatus,
  MonthlyAttendanceSummary,
  MonthlyPayrollResult,
  PayrollGenerateBatchResponse,
  PayrollResultDetail,
  RecalculateBatchItem,
  RecalculateBatchResponse,
  SalaryAdjustmentItem,
  SalaryAdjustmentPayload,
  WorkspaceBootstrapResponse,
  EmployeeUpsertPayload
} from "../types";

async function request<T>(input: string, init?: RequestInit): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  const response = await fetch(input, {
    headers: {
      "Content-Type": "application/json",
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      ...(init?.headers || {})
    },
    ...init
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.error || "请求失败");
  }

  return payload as T;
}

export async function fetchEmployees(): Promise<Employee[]> {
  return request<Employee[]>("/api/admin/employees");
}

export async function fetchDashboardData(): Promise<DashboardData> {
  // v2 数据看板不再由前端日期筛选驱动；后端按当前账号最后一次考勤结果周期返回完整看板契约。
  return request<DashboardData>("/api/admin/dashboard");
}

export async function fetchEmployeesPage(params: EmployeeListFilters & {
  page: number;
  pageSize: number;
}): Promise<EmployeeListPage> {
  const search = new URLSearchParams({
    page: String(params.page),
    pageSize: String(params.pageSize)
  });

  if (params.keyword?.trim()) {
    search.set("keyword", params.keyword.trim());
  }
  if (params.status && params.status !== "all") {
    search.set("status", params.status);
  }
  if (params.country && params.country !== "all") {
    search.set("country", params.country);
  }
  if (params.salaryType && params.salaryType !== "all") {
    search.set("salaryType", params.salaryType);
  }
  if (params.role && params.role !== "all") {
    search.set("role", params.role);
  }
  if (params.includeInactive) {
    search.set("includeInactive", "true");
  }

  return request<EmployeeListPage>(`/api/admin/employees?${search.toString()}`);
}

export async function fetchEmployeeDetail(employeeId: number): Promise<EmployeeDetail> {
  return request<EmployeeDetail>(`/api/admin/employees/${employeeId}`);
}

export async function fetchAttendanceRuleOptions(): Promise<AttendanceRuleOption[]> {
  return request<AttendanceRuleOption[]>("/api/admin/attendance-rules/options");
}

export async function fetchAttendanceRules(): Promise<AttendanceRule[]> {
  return request<AttendanceRule[]>("/api/admin/attendance-rules");
}

export async function fetchAttendanceRuleDetail(ruleId: number): Promise<AttendanceRuleDetail> {
  return request<AttendanceRuleDetail>(`/api/admin/attendance-rules/${ruleId}`);
}

export async function createAttendanceRule(payload: AttendanceRuleFormData): Promise<AttendanceRuleDetail> {
  return request<AttendanceRuleDetail>("/api/admin/attendance-rules", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function updateAttendanceRule(ruleId: number, payload: AttendanceRuleFormData): Promise<AttendanceRuleDetail> {
  return request<AttendanceRuleDetail>(`/api/admin/attendance-rules/${ruleId}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export async function enableAttendanceRule(ruleId: number): Promise<AttendanceRuleDetail> {
  return request<AttendanceRuleDetail>(`/api/admin/attendance-rules/${ruleId}/enable`, {
    method: "PATCH"
  });
}

export async function disableAttendanceRule(ruleId: number): Promise<AttendanceRuleDetail> {
  return request<AttendanceRuleDetail>(`/api/admin/attendance-rules/${ruleId}/disable`, {
    method: "PATCH"
  });
}

export async function fetchAttendanceRuleRelatedEmployees(ruleId: number, currentOnly = false): Promise<AttendanceRuleRelatedEmployee[]> {
  const query = currentOnly ? "?currentOnly=true" : "";
  return request<AttendanceRuleRelatedEmployee[]>(`/api/admin/attendance-rules/${ruleId}/related-employees${query}`);
}

export async function fetchAttendanceConfig(): Promise<AppConfig> {
  return request<AppConfig>("/api/admin/attendance-config");
}

export async function updateAttendanceConfig(payload: AppConfig): Promise<AppConfig> {
  // v2 考勤页只维护账号级全局配置；保存后由后端重算接口统一消费，前端不再保存多规则关系。
  return request<AppConfig>("/api/admin/attendance-config", {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export async function fetchAttendanceCalculations(params: {
  keyword?: string;
  yearMonth?: string;
  date?: string;
  employeeId?: number | null;
  status?: string;
  hasException?: string;
}): Promise<AttendanceCalculationResult[]> {
  // v2 原型有“全部时间/按天/按月”三种筛选；yearMonth 只在按月或按天辅助查询时传，全部时间不能被前端硬塞当前月份。
  const search = new URLSearchParams();
  if (params.yearMonth) {
    search.set("yearMonth", params.yearMonth);
  }
  if (params.date) {
    search.set("date", params.date);
  }
  if (params.keyword?.trim()) {
    search.set("keyword", params.keyword.trim());
  }
  if (params.employeeId) {
    search.set("employeeId", String(params.employeeId));
  }
  if (params.status && params.status !== "all") {
    search.set("status", params.status);
  }
  if (params.hasException && params.hasException !== "all") {
    search.set("hasException", params.hasException);
  }

  return request<AttendanceCalculationResult[]>(`/api/admin/attendance-calculations?${search.toString()}`);
}

export async function fetchAttendanceCalculationDetail(resultId: number): Promise<AttendanceCalculationDetail> {
  return request<AttendanceCalculationDetail>(`/api/admin/attendance-calculations/${resultId}`);
}

export async function fetchAttendanceSummaries(params: {
  keyword?: string;
  yearMonth: string;
  employeeId?: number | null;
  canGeneratePayroll?: string;
}): Promise<MonthlyAttendanceSummary[]> {
  const search = new URLSearchParams({ yearMonth: params.yearMonth });
  if (params.keyword?.trim()) {
    search.set("keyword", params.keyword.trim());
  }
  if (params.employeeId) {
    search.set("employeeId", String(params.employeeId));
  }
  if (params.canGeneratePayroll && params.canGeneratePayroll !== "all") {
    search.set("canGeneratePayroll", params.canGeneratePayroll);
  }

  return request<MonthlyAttendanceSummary[]>(`/api/admin/attendance-summaries?${search.toString()}`);
}

export async function fetchPayrollResults(params: {
  keyword?: string;
  yearMonth: string;
  employeeId?: number | null;
  salaryType?: string;
  calculationStatus?: string;
  reviewStatus?: string;
}): Promise<MonthlyPayrollResult[]> {
  const search = new URLSearchParams({ yearMonth: params.yearMonth });
  if (params.keyword?.trim()) {
    search.set("keyword", params.keyword.trim());
  }
  if (params.employeeId) {
    search.set("employeeId", String(params.employeeId));
  }
  if (params.salaryType && params.salaryType !== "all") {
    search.set("salaryType", params.salaryType);
  }
  if (params.calculationStatus && params.calculationStatus !== "all") {
    search.set("calculationStatus", params.calculationStatus);
  }
  if (params.reviewStatus && params.reviewStatus !== "all") {
    search.set("reviewStatus", params.reviewStatus);
  }

  return request<MonthlyPayrollResult[]>(`/api/admin/payroll-results?${search.toString()}`);
}

export async function fetchPayrollResultDetail(resultId: number): Promise<PayrollResultDetail> {
  return request<PayrollResultDetail>(`/api/admin/payroll-results/${resultId}`);
}

export async function generateMonthlyPayroll(yearMonth: string, employeeIds?: number[]): Promise<PayrollGenerateBatchResponse> {
  return request<PayrollGenerateBatchResponse>("/api/admin/payroll-results/generate-monthly", {
    method: "POST",
    body: JSON.stringify({ yearMonth, employeeIds: employeeIds?.length ? employeeIds : null })
  });
}

export async function generateOnePayroll(employeeId: number, yearMonth: string): Promise<MonthlyPayrollResult> {
  return request<MonthlyPayrollResult>("/api/admin/payroll-results/generate-one", {
    method: "POST",
    body: JSON.stringify({ employeeId, yearMonth })
  });
}

export async function recalculateOnePayroll(employeeId: number, yearMonth: string): Promise<MonthlyPayrollResult> {
  return request<MonthlyPayrollResult>("/api/admin/payroll-results/recalculate-one", {
    method: "POST",
    body: JSON.stringify({ employeeId, yearMonth })
  });
}

export async function recalculateMonthlyPayroll(yearMonth: string, employeeIds?: number[]): Promise<PayrollGenerateBatchResponse> {
  return request<PayrollGenerateBatchResponse>("/api/admin/payroll-results/recalculate-monthly", {
    method: "POST",
    body: JSON.stringify({ yearMonth, employeeIds: employeeIds?.length ? employeeIds : null })
  });
}

export async function approvePayrollResult(resultId: number): Promise<MonthlyPayrollResult> {
  return request<MonthlyPayrollResult>(`/api/admin/payroll-results/${resultId}/approve`, {
    method: "PATCH"
  });
}

export async function rejectPayrollResult(resultId: number, reason?: string): Promise<MonthlyPayrollResult> {
  return request<MonthlyPayrollResult>(`/api/admin/payroll-results/${resultId}/reject`, {
    method: "PATCH",
    body: JSON.stringify({ reason: reason || "" })
  });
}

export async function confirmPayrollResult(resultId: number): Promise<MonthlyPayrollResult> {
  return request<MonthlyPayrollResult>(`/api/admin/payroll-results/${resultId}/confirm`, {
    method: "PATCH"
  });
}

export async function fetchSalaryAdjustmentItems(params: {
  employeeId: number;
  yearMonth: string;
  type?: string;
}): Promise<SalaryAdjustmentItem[]> {
  const search = new URLSearchParams({
    employeeId: String(params.employeeId),
    yearMonth: params.yearMonth
  });
  if (params.type && params.type !== "all") {
    search.set("type", params.type);
  }

  return request<SalaryAdjustmentItem[]>(`/api/admin/salary-adjustment-items?${search.toString()}`);
}

export async function createSalaryAdjustmentItem(payload: SalaryAdjustmentPayload): Promise<SalaryAdjustmentItem> {
  return request<SalaryAdjustmentItem>("/api/admin/salary-adjustment-items", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function updateSalaryAdjustmentItem(itemId: number, payload: SalaryAdjustmentPayload): Promise<SalaryAdjustmentItem> {
  return request<SalaryAdjustmentItem>(`/api/admin/salary-adjustment-items/${itemId}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export async function deleteSalaryAdjustmentItem(itemId: number): Promise<{ success: true }> {
  return request<{ success: true }>(`/api/admin/salary-adjustment-items/${itemId}`, {
    method: "DELETE"
  });
}

export async function initializeWorkspace(): Promise<WorkspaceBootstrapResponse> {
  return request<WorkspaceBootstrapResponse>("/api/admin/workspace/bootstrap", {
    method: "POST"
  });
}

export async function ensureWorkspaceBootstrap(): Promise<WorkspaceBootstrapResponse> {
  return request<WorkspaceBootstrapResponse>("/api/admin/workspace/ensure-bootstrap", {
    method: "POST"
  });
}

export async function updateAttendanceRecord(recordId: number, payload: AttendanceRecordUpdatePayload): Promise<AttendanceCalculationResult> {
  return request<AttendanceCalculationResult>(`/api/admin/attendance-records/${recordId}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export async function createAttendanceRecord(employeeId: number, payload: AttendanceRecordUpdatePayload): Promise<AttendanceCalculationResult> {
  return request<AttendanceCalculationResult>("/api/admin/attendance-records", {
    method: "POST",
    body: JSON.stringify({ employeeId, ...payload })
  });
}

export async function recalculateDailyAttendance(employeeId: number, date: string): Promise<AttendanceCalculationResult> {
  return request<AttendanceCalculationResult>("/api/admin/attendance-calculations/recalculate-daily", {
    method: "POST",
    body: JSON.stringify({ employeeId, date })
  });
}

export async function recalculateBatchAttendance(items: RecalculateBatchItem[]): Promise<RecalculateBatchResponse> {
  return request<RecalculateBatchResponse>("/api/admin/attendance-calculations/recalculate-batch", {
    method: "POST",
    body: JSON.stringify({ items })
  });
}

export async function recalculateMonthlyAttendance(yearMonth: string, employeeId?: number | null): Promise<MonthlyAttendanceSummary[]> {
  return request<MonthlyAttendanceSummary[]>("/api/admin/attendance-calculations/recalculate-monthly", {
    method: "POST",
    body: JSON.stringify({ yearMonth, employeeId: employeeId || null })
  });
}

export async function createEmployee(payload: EmployeeUpsertPayload): Promise<EmployeeDetail> {
  return request<EmployeeDetail>("/api/admin/employees", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function updateEmployee(employeeId: number, payload: EmployeeUpsertPayload): Promise<EmployeeDetail> {
  return request<EmployeeDetail>(`/api/admin/employees/${employeeId}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export async function updateEmployeeStatus(employeeId: number, targetStatus: Extract<EmployeeStatus, "disabled" | "resigned">, reason?: string): Promise<EmployeeDetail> {
  return request<EmployeeDetail>(`/api/admin/employees/${employeeId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ targetStatus, reason: reason || null })
  });
}
