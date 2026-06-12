import { supabase } from "./supabase";
import {
  AppConfig,
  AttendanceCalculationDetail,
  AttendanceCalculationPage,
  AttendanceCalculationResult,
  AttendanceDailyMaintenanceResponse,
  AttendanceMaintenanceRunSummary,
  AttendanceRecord,
  AttendanceRecordAsyncResponse,
  AttendanceRecordCreatePayload,
  AttendanceRecordUpdatePayload,
  AttendanceRule,
  AttendanceRuleDetail,
  AttendanceRuleFormData,
  AttendanceRuleOption,
  AttendanceRuleRelatedEmployee,
  DashboardData,
  Employee,
  EmployeeAppAccountResponse,
  EmployeeDetail,
  EmployeeListFilters,
  EmployeeListPage,
  EmployeeAvatarBatchResponse,
  EmployeeStatus,
  MonthlyAttendanceSummary,
  MonthlyPayrollResult,
  PayrollGenerateBatchResponse,
  PayrollNightlyRunResponse,
  PayrollResultDetail,
  PayrollResultPage,
  RecalculateBatchItem,
  RecalculateBatchResponse,
  SalaryAdjustmentItem,
  SalaryAdjustmentPayload,
  SopDocument,
  WorkspaceBootstrapResponse,
  WorkspaceBootstrapStatusResponse,
  EmployeeUpsertPayload
} from "../types";
import { formatLocalDatePart } from "./utils";

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
    throw new Error(payload?.error || "Request failed");
  }

  return payload as T;
}

const employeePageRequestCache = new Map<string, Promise<EmployeeListPage>>();
const employeeCountRequestCache = new Map<string, Promise<number>>();
const attendanceCalculationPageRequestCache = new Map<string, Promise<AttendanceCalculationPage>>();
const PAYROLL_RESULTS_CACHE_TTL_MS = 1000 * 15;
const PAYROLL_RESULT_DETAIL_CACHE_TTL_MS = 1000 * 30;
const payrollResultsCache = new Map<string, { data: PayrollResultPage; expiresAt: number }>();
const payrollResultsRequestInFlight = new Map<string, Promise<PayrollResultPage>>();
const payrollResultDetailCache = new Map<number, { data: PayrollResultDetail; expiresAt: number }>();
const payrollResultDetailRequestInFlight = new Map<number, Promise<PayrollResultDetail>>();
const ATTENDANCE_CONFIG_CACHE_TTL_MS = 1000 * 30;
let attendanceConfigCache: { data: AppConfig; expiresAt: number } | null = null;
let attendanceConfigRequestInFlight: Promise<AppConfig> | null = null;
const DASHBOARD_CACHE_TTL_MS = 1000 * 15;
const dashboardDataCache = new Map<string, { data: DashboardData; expiresAt: number }>();
const dashboardRequestInFlight = new Map<string, Promise<DashboardData>>();

function clearPayrollCaches() {
  payrollResultsCache.clear();
  payrollResultsRequestInFlight.clear();
  payrollResultDetailCache.clear();
  payrollResultDetailRequestInFlight.clear();
}

export async function fetchEmployees(): Promise<Employee[]> {
  return request<Employee[]>("/api/admin/employees");
}

export async function searchEmployees(keyword: string, options: { includeInactive?: boolean } = {}): Promise<Employee[]> {
  const trimmedKeyword = keyword.trim();
  if (!trimmedKeyword) {
    return [];
  }
  const search = new URLSearchParams({ keyword: trimmedKeyword });
  if (options.includeInactive) {
    search.set("includeInactive", "true");
  }
  return request<Employee[]>(`/api/admin/employees?${search.toString()}`);
}

export async function fetchDashboardData(params: { force?: boolean; yearMonth?: string } = {}): Promise<DashboardData> {
  const yearMonth = params.yearMonth?.trim() || formatLocalDatePart().yearMonth;
  const cacheKey = yearMonth;
  const now = Date.now();
  const cached = dashboardDataCache.get(cacheKey);
  if (!params.force && cached && cached.expiresAt > now) {
    return cached.data;
  }
  const inFlight = dashboardRequestInFlight.get(cacheKey);
  if (!params.force && inFlight) {
    return inFlight;
  }

  const search = new URLSearchParams({ yearMonth });
  const requestPromise = request<DashboardData>(`/api/admin/dashboard?${search.toString()}`)
    .then((data) => {
      dashboardDataCache.set(cacheKey, {
        data,
        expiresAt: Date.now() + DASHBOARD_CACHE_TTL_MS
      });
      return data;
    })
    .finally(() => {
      dashboardRequestInFlight.delete(cacheKey);
    });

  if (!params.force) {
    dashboardRequestInFlight.set(cacheKey, requestPromise);
  }

  return requestPromise;
}

export async function fetchSops(params: { keyword?: string; employeeId?: number | null; publishedOnly?: boolean } = {}): Promise<SopDocument[]> {
  const search = new URLSearchParams();
  if (params.keyword?.trim()) {
    search.set("keyword", params.keyword.trim());
  }
  if (params.employeeId) {
    search.set("employeeId", String(params.employeeId));
  }
  if (params.publishedOnly) {
    search.set("publishedOnly", "true");
  }
  const query = search.toString();
  return request<SopDocument[]>(`/api/admin/sops${query ? `?${query}` : ""}`);
}

export async function createSop(payload: Omit<SopDocument, "id" | "createdAt" | "reads">): Promise<SopDocument> {
  return request<SopDocument>("/api/admin/sops", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function updateSop(sopId: string, payload: Omit<SopDocument, "id" | "createdAt" | "reads">): Promise<SopDocument> {
  return request<SopDocument>(`/api/admin/sops/${sopId}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export async function deleteSop(sopId: string): Promise<{ success: true }> {
  return request<{ success: true }>(`/api/admin/sops/${sopId}`, {
    method: "DELETE"
  });
}

export async function markSopRead(sopId: string, employeeId: number): Promise<SopDocument> {
  return request<SopDocument>(`/api/admin/sops/${sopId}/read`, {
    method: "POST",
    body: JSON.stringify({ employeeId })
  });
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
  search.set("skipTotal", "true");

  const url = `/api/admin/employees?${search.toString()}`;
  const cached = employeePageRequestCache.get(url);
  if (cached) {
    return cached;
  }

  const requestPromise = request<EmployeeListPage>(url).finally(() => {
    employeePageRequestCache.delete(url);
  });
  employeePageRequestCache.set(url, requestPromise);
  return requestPromise;
}

export async function fetchEmployeesCount(params: EmployeeListFilters = {}): Promise<number> {
  const search = new URLSearchParams();

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

  const url = `/api/admin/employees/count${search.toString() ? `?${search.toString()}` : ""}`;
  const cached = employeeCountRequestCache.get(url);
  if (cached) {
    return cached;
  }

  const requestPromise = request<{ total: number }>(url)
    .then((response) => response.total)
    .finally(() => {
      employeeCountRequestCache.delete(url);
    });

  employeeCountRequestCache.set(url, requestPromise);
  return requestPromise;
}

export async function fetchEmployeeDetail(employeeId: number): Promise<EmployeeDetail> {
  return request<EmployeeDetail>(`/api/admin/employees/${employeeId}`);
}

export async function fetchEmployeeAvatars(employeeIds: number[]): Promise<EmployeeAvatarBatchResponse> {
  const ids = employeeIds
    .map((id) => Number(id))
    .filter((id, index, list) => Number.isFinite(id) && id > 0 && list.indexOf(id) === index)
    .slice(0, 50);
  if (ids.length === 0) {
    return { items: [] };
  }

  const search = new URLSearchParams({
    ids: ids.join(",")
  });
  return request<EmployeeAvatarBatchResponse>(`/api/admin/employees/avatars?${search.toString()}`);
}

export async function fetchEmployeeAppAccount(employeeId: number): Promise<EmployeeAppAccountResponse> {
  return request<EmployeeAppAccountResponse>(`/api/admin/employees/${employeeId}/app-account`);
}

export async function resetEmployeeAppPassword(employeeId: number): Promise<EmployeeAppAccountResponse> {
  return request<EmployeeAppAccountResponse>(`/api/admin/employees/${employeeId}/app-account/reset-password`, {
    method: "POST"
  });
}

export async function updateEmployeeAppAccountStatus(employeeId: number, status: "active" | "disabled"): Promise<EmployeeAppAccountResponse> {
  return request<EmployeeAppAccountResponse>(`/api/admin/employees/${employeeId}/app-account/status`, {
    method: "PATCH",
    body: JSON.stringify({ status })
  });
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
  const now = Date.now();
  if (attendanceConfigCache && attendanceConfigCache.expiresAt > now) {
    return attendanceConfigCache.data;
  }
  if (attendanceConfigRequestInFlight) {
    return attendanceConfigRequestInFlight;
  }

  attendanceConfigRequestInFlight = request<AppConfig>("/api/admin/attendance-config")
    .then((data) => {
      attendanceConfigCache = {
        data,
        expiresAt: Date.now() + ATTENDANCE_CONFIG_CACHE_TTL_MS
      };
      return data;
    })
    .finally(() => {
      attendanceConfigRequestInFlight = null;
    });

  return attendanceConfigRequestInFlight;
}

export async function updateAttendanceConfig(payload: AppConfig): Promise<AppConfig> {
  // v2 考勤页只维护账号级全局配置；保存后由后端重算接口统一消费，前端不再保存多规则关系。
  const data = await request<AppConfig>("/api/admin/attendance-config", {
    method: "PUT",
    body: JSON.stringify(payload)
  });
  attendanceConfigCache = {
    data,
    expiresAt: Date.now() + ATTENDANCE_CONFIG_CACHE_TTL_MS
  };
  return data;
}

export async function fetchAttendanceCalculations(params: {
  keyword?: string;
  yearMonth?: string;
  date?: string;
  employeeId?: number | null;
  status?: string;
  hasException?: string;
  includeInactive?: boolean;
  page: number;
  pageSize: number;
}): Promise<AttendanceCalculationPage> {
  // v2 原型有“全部时间/按天/按月”三种筛选；yearMonth 只在按月或按天辅助查询时传，全部时间不能被前端硬塞当前月份。
  const search = new URLSearchParams({
    page: String(params.page),
    pageSize: String(params.pageSize)
  });
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
  if (params.includeInactive) {
    search.set("includeInactive", "true");
  }

  const url = `/api/admin/attendance-calculations?${search.toString()}`;
  const cached = attendanceCalculationPageRequestCache.get(url);
  if (cached) {
    return cached;
  }

  const requestPromise = request<AttendanceCalculationPage>(url).finally(() => {
    attendanceCalculationPageRequestCache.delete(url);
  });
  attendanceCalculationPageRequestCache.set(url, requestPromise);
  return requestPromise;
}

export async function fetchAttendanceCalculationDetail(resultId: number): Promise<AttendanceCalculationDetail> {
  return request<AttendanceCalculationDetail>(`/api/admin/attendance-calculations/${resultId}`);
}

export async function createAttendanceRecord(payload: AttendanceRecordCreatePayload): Promise<AttendanceRecordAsyncResponse> {
  // 新增考勤记录改为快速写入 attendance_records，日/月重算在后台继续执行，避免管理员等待整月刷新。
  return request<AttendanceRecordAsyncResponse>("/api/admin/attendance-records", {
    method: "POST",
    body: JSON.stringify(payload)
  });
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
  includeInactive?: boolean;
  page: number;
  pageSize: number;
  force?: boolean;
}): Promise<PayrollResultPage> {
  const search = new URLSearchParams({
    yearMonth: params.yearMonth,
    page: String(params.page),
    pageSize: String(params.pageSize)
  });
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
  if (params.includeInactive) {
    search.set("includeInactive", "true");
  }

  const requestPath = `/api/admin/payroll-results?${search.toString()}`;
  const now = Date.now();
  const cached = payrollResultsCache.get(requestPath);
  if (!params.force && cached && cached.expiresAt > now) {
    return cached.data;
  }
  const inFlight = payrollResultsRequestInFlight.get(requestPath);
  if (!params.force && inFlight) {
    return inFlight;
  }

  const requestPromise = request<PayrollResultPage>(requestPath)
    .then((data) => {
      payrollResultsCache.set(requestPath, {
        data,
        expiresAt: Date.now() + PAYROLL_RESULTS_CACHE_TTL_MS
      });
      return data;
    })
    .finally(() => {
      payrollResultsRequestInFlight.delete(requestPath);
    });

  if (!params.force) {
    payrollResultsRequestInFlight.set(requestPath, requestPromise);
  }

  return requestPromise;
}

export async function fetchPayrollResultDetail(resultId: number): Promise<PayrollResultDetail> {
  const now = Date.now();
  const cached = payrollResultDetailCache.get(resultId);
  if (cached && cached.expiresAt > now) {
    return cached.data;
  }
  const inFlight = payrollResultDetailRequestInFlight.get(resultId);
  if (inFlight) {
    return inFlight;
  }

  const requestPromise = request<PayrollResultDetail>(`/api/admin/payroll-results/${resultId}`)
    .then((data) => {
      payrollResultDetailCache.set(resultId, {
        data,
        expiresAt: Date.now() + PAYROLL_RESULT_DETAIL_CACHE_TTL_MS
      });
      return data;
    })
    .finally(() => {
      payrollResultDetailRequestInFlight.delete(resultId);
    });

  payrollResultDetailRequestInFlight.set(resultId, requestPromise);
  return requestPromise;
}

export async function generateMonthlyPayroll(yearMonth: string, employeeIds?: number[]): Promise<PayrollGenerateBatchResponse> {
  const data = await request<PayrollGenerateBatchResponse>("/api/admin/payroll-results/generate-monthly", {
    method: "POST",
    body: JSON.stringify({ yearMonth, employeeIds: employeeIds?.length ? employeeIds : null })
  });
  clearPayrollCaches();
  return data;
}

export async function generateOnePayroll(employeeId: number, yearMonth: string): Promise<MonthlyPayrollResult> {
  const data = await request<MonthlyPayrollResult>("/api/admin/payroll-results/generate-one", {
    method: "POST",
    body: JSON.stringify({ employeeId, yearMonth })
  });
  clearPayrollCaches();
  return data;
}

export async function recalculateOnePayroll(employeeId: number, yearMonth: string): Promise<MonthlyPayrollResult> {
  const data = await request<MonthlyPayrollResult>("/api/admin/payroll-results/recalculate-one", {
    method: "POST",
    body: JSON.stringify({ employeeId, yearMonth })
  });
  clearPayrollCaches();
  return data;
}

export async function recalculateMonthlyPayroll(yearMonth: string, employeeIds?: number[]): Promise<PayrollGenerateBatchResponse> {
  const data = await request<PayrollGenerateBatchResponse>("/api/admin/payroll-results/recalculate-monthly", {
    method: "POST",
    body: JSON.stringify({ yearMonth, employeeIds: employeeIds?.length ? employeeIds : null })
  });
  clearPayrollCaches();
  return data;
}

export async function runNightlyPayrollNow(yearMonth: string): Promise<PayrollNightlyRunResponse> {
  const data = await request<PayrollNightlyRunResponse>("/api/admin/payroll-results/run-nightly", {
    method: "POST",
    // 手动按钮走已登录后台接口，服务端只核算当前账号；不要从浏览器调用 cron 专用入口或暴露 CRON_SECRET。
    body: JSON.stringify({ yearMonth })
  });
  clearPayrollCaches();
  return data;
}

export async function approvePayrollResult(resultId: number): Promise<MonthlyPayrollResult> {
  const data = await request<MonthlyPayrollResult>(`/api/admin/payroll-results/${resultId}/approve`, {
    method: "PATCH"
  });
  clearPayrollCaches();
  return data;
}

export async function rejectPayrollResult(resultId: number, reason?: string): Promise<MonthlyPayrollResult> {
  const data = await request<MonthlyPayrollResult>(`/api/admin/payroll-results/${resultId}/reject`, {
    method: "PATCH",
    body: JSON.stringify({ reason: reason || "" })
  });
  clearPayrollCaches();
  return data;
}

export async function confirmPayrollResult(resultId: number): Promise<MonthlyPayrollResult> {
  const data = await request<MonthlyPayrollResult>(`/api/admin/payroll-results/${resultId}/confirm`, {
    method: "PATCH"
  });
  clearPayrollCaches();
  return data;
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
  const data = await request<SalaryAdjustmentItem>("/api/admin/salary-adjustment-items", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  clearPayrollCaches();
  return data;
}

export async function updateSalaryAdjustmentItem(itemId: number, payload: SalaryAdjustmentPayload): Promise<SalaryAdjustmentItem> {
  const data = await request<SalaryAdjustmentItem>(`/api/admin/salary-adjustment-items/${itemId}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
  clearPayrollCaches();
  return data;
}

export async function deleteSalaryAdjustmentItem(itemId: number): Promise<{ success: true }> {
  const data = await request<{ success: true }>(`/api/admin/salary-adjustment-items/${itemId}`, {
    method: "DELETE"
  });
  clearPayrollCaches();
  return data;
}

export async function initializeWorkspace(): Promise<WorkspaceBootstrapResponse> {
  return request<WorkspaceBootstrapResponse>("/api/admin/workspace/bootstrap", {
    method: "POST"
  });
}

export async function fetchWorkspaceBootstrapStatus(): Promise<WorkspaceBootstrapStatusResponse> {
  return request<WorkspaceBootstrapStatusResponse>("/api/admin/workspace/bootstrap-status");
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

export async function runAttendanceDailyMaintenance(params: { previousDate?: string; todayDate?: string } = {}): Promise<AttendanceDailyMaintenanceResponse> {
  return request<AttendanceDailyMaintenanceResponse>("/api/admin/attendance-calculations/run-daily-maintenance", {
    method: "POST",
    // 手动补跑只能走已登录后台接口，并由服务端限定当前账号；不要在浏览器调用 cron 入口或传 CRON_SECRET。
    body: JSON.stringify(params)
  });
}

export async function generateAttendanceDrafts(date: string): Promise<AttendanceMaintenanceRunSummary> {
  return request<AttendanceMaintenanceRunSummary>("/api/admin/attendance-calculations/generate-drafts", {
    method: "POST",
    body: JSON.stringify({ date })
  });
}

export async function settleAttendanceDate(date: string): Promise<AttendanceMaintenanceRunSummary> {
  return request<AttendanceMaintenanceRunSummary>("/api/admin/attendance-calculations/settle-date", {
    method: "POST",
    body: JSON.stringify({ date })
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

export async function updateEmployeeStatus(employeeId: number, targetStatus: Extract<EmployeeStatus, "resigned">, reason?: string): Promise<EmployeeDetail> {
  return request<EmployeeDetail>(`/api/admin/employees/${employeeId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ targetStatus, reason: reason || null })
  });
}
