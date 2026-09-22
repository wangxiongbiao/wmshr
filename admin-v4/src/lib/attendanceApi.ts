import type { AppConfig, AttendanceRecord, Employee, HolidayRecord, LeaveRequest } from "../types";

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
  if (!response.ok) throw new Error(data.error || "考勤请求失败");
  return data as T;
}

export interface AttendanceCalculationRow {
  date: string;
  emp: Employee;
  rec: AttendanceRecord | null;
  status: string;
  details: {
    valid: number;
    ot: number;
  };
  shiftPay: number;
  otPay: number;
  mealAllowance: number;
  dailySocialSecurity: number;
  dailyServiceFee: number;
  totalPay: number;
}

export interface AttendanceCalculationResponse {
  rows: AttendanceCalculationRow[];
  total: number;
  config: AppConfig;
  month: string;
}

export async function fetchAttendanceConfig(warehouseCode?: string): Promise<AppConfig> {
  const query = warehouseCode && warehouseCode !== "ALL" ? `?warehouse_code=${encodeURIComponent(warehouseCode)}` : "";
  return request<AppConfig>(`/api/v4/admin/attendance-config${query}`);
}

export async function updateAttendanceConfig(config: Partial<AppConfig>, warehouseCode?: string): Promise<AppConfig> {
  const query = warehouseCode && warehouseCode !== "ALL" ? `?warehouse_code=${encodeURIComponent(warehouseCode)}` : "";
  return request<AppConfig>(`/api/v4/admin/attendance-config${query}`, {
    method: "PUT",
    body: JSON.stringify({ ...config, warehouse_code: warehouseCode })
  });
}

export async function fetchHolidays(warehouseCode?: string): Promise<HolidayRecord[]> {
  const query = warehouseCode && warehouseCode !== "ALL" ? `?warehouse_code=${encodeURIComponent(warehouseCode)}` : "";
  return request<HolidayRecord[]>(`/api/v4/admin/holidays${query}`);
}

export async function updateHolidays(holidays: HolidayRecord[], warehouseCode?: string): Promise<HolidayRecord[]> {
  const query = warehouseCode && warehouseCode !== "ALL" ? `?warehouse_code=${encodeURIComponent(warehouseCode)}` : "";
  return request<HolidayRecord[]>(`/api/v4/admin/holidays${query}`, {
    method: "PUT",
    body: JSON.stringify({ holidays, warehouse_code: warehouseCode })
  });
}

export async function fetchAttendanceCalculations(params: {
  month?: string;
  employeeId?: number | "all";
  statusFilter?: "all" | "active" | "inactive";
  warehouseCode?: string;
} = {}): Promise<AttendanceCalculationResponse> {
  const sp = new URLSearchParams();
  if (params.month) sp.set("month", params.month);
  if (params.employeeId && params.employeeId !== "all") sp.set("employee_id", String(params.employeeId));
  if (params.statusFilter && params.statusFilter !== "all") sp.set("status_filter", params.statusFilter);
  if (params.warehouseCode && params.warehouseCode !== "ALL") sp.set("warehouse_code", params.warehouseCode);

  const query = sp.toString() ? `?${sp.toString()}` : "";
  return request<AttendanceCalculationResponse>(`/api/v4/admin/attendance-calculations${query}`);
}

export async function createAttendanceRecord(payload: {
  employeeId: number;
  date: string;
  inTime?: string;
  outTime?: string;
  type?: string;
  note?: string;
  inLat?: number;
  inLng?: number;
  outLat?: number;
  outLng?: number;
  isAdjustment?: boolean;
  allowOverwrite?: boolean;
}): Promise<{ record: any; metrics: any }> {
  return request("/api/v4/admin/attendance-records", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function updateAttendanceRecord(id: number, payload: {
  inTime?: string;
  outTime?: string;
  type?: string;
  note?: string;
  inLat?: number;
  inLng?: number;
  outLat?: number;
  outLng?: number;
}): Promise<{ record: any; metrics: any }> {
  return request(`/api/v4/admin/attendance-records/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export async function deleteAttendanceRecord(id: number): Promise<{ success: boolean; deletedId: number }> {
  return request(`/api/v4/admin/attendance-records/${id}`, {
    method: "DELETE"
  });
}

export async function recalculateAttendanceMonth(params: {
  month?: string;
  warehouseCode?: string;
} = {}): Promise<{ success: boolean; recalculatedCount: number; month: string }> {
  return request("/api/v4/admin/attendance-calculations/recalculate", {
    method: "POST",
    body: JSON.stringify(params)
  });
}

export async function fetchAttendanceRecords(params: {
  month?: string;
  warehouseCode?: string;
} = {}): Promise<AttendanceRecord[]> {
  const sp = new URLSearchParams();
  if (params.month) sp.set("month", params.month);
  if (params.warehouseCode && params.warehouseCode !== "ALL") sp.set("warehouse_code", params.warehouseCode);
  const query = sp.toString() ? `?${sp.toString()}` : "";
  const rows = await request<any[]>(`/api/v4/admin/attendance-records${query}`);
  return (rows || []).map(r => ({
    id: String(r.id),
    empId: Number(r.employee_id),
    date: r.date,
    inTime: r.in_time || "",
    outTime: r.out_time || "",
    type: r.type,
    note: r.note || "",
    inLat: r.in_lat != null ? Number(r.in_lat) : undefined,
    inLng: r.in_lng != null ? Number(r.in_lng) : undefined,
    inDistance: r.in_distance != null ? Number(r.in_distance) : undefined,
    inDeviated: r.in_deviated,
    outLat: r.out_lat != null ? Number(r.out_lat) : undefined,
    outLng: r.out_lng != null ? Number(r.out_lng) : undefined,
    outDistance: r.out_distance != null ? Number(r.out_distance) : undefined,
    outDeviated: r.out_deviated
  }));
}

export async function fetchLeaveRequests(warehouseCode?: string): Promise<LeaveRequest[]> {
  const query = warehouseCode ? `?warehouse_code=${encodeURIComponent(warehouseCode)}` : "";
  return request<LeaveRequest[]>(`/api/v4/admin/leave-requests${query}`);
}

export async function updateLeaveRequestStatus(
  id: string,
  status: "approved" | "rejected" | "pending",
  approvalNote?: string
): Promise<LeaveRequest> {
  return request<LeaveRequest>(`/api/v4/admin/leave-requests/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status, approvalNote })
  });
}

export async function createLeaveRequest(payload: {
  empId: number;
  type: string;
  startDate: string;
  endDate: string;
  reason: string;
  status?: "approved" | "pending";
}): Promise<LeaveRequest> {
  return request<LeaveRequest>("/api/v4/admin/leave-requests", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function deleteLeaveRequest(id: string): Promise<{ success: boolean; deletedId: string }> {
  return request<{ success: boolean; deletedId: string }>(`/api/v4/admin/leave-requests/${id}`, {
    method: "DELETE"
  });
}

