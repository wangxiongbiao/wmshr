export type AttendanceStatus = 'not_checked_in' | 'checked_in' | 'checked_out';
export type LocalizedLocationName = Partial<Record<'zh' | 'en' | 'zht' | 'th' | 'id' | 'ms' | 'es' | 'pt', string>> & {
  default?: string;
  name?: string;
  label?: string;
};

export type LeaveType = 'personal' | 'sick' | 'annual' | 'special';
export type LeaveApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface TodayAttendanceStatus {
  date: string;
  status: AttendanceStatus;
  checkInTime: string | null;
  checkOutTime: string | null;
  locationName: string | LocalizedLocationName | null;
  locationAccuracy: number | null;
  canCheckIn: boolean;
  canCheckOut: boolean;
  requiresDescriptionInWorkTime?: boolean;
  warning?: string;
}

export interface CheckInPayload {
  type: 'check_in' | 'check_out';
  latitude: number;
  longitude: number;
  accuracy: number;
  locationName?: string;
  description?: string;
  deviceId?: string;
  clientTime: string;
  timeZone?: string;
  timezoneOffsetMinutes?: number;
}

export interface AttendanceLocationSyncPayload {
  locationName: string;
}

export interface AttendanceRecord {
  id: string;
  date: string;
  checkInTime: string;
  checkOutTime: string;
  type: 'normal' | 'overtime';
  hours: string;
  workedHours?: number | null;
}

export interface LeaveSummary {
  monthUsedDays: number;
  pendingCount: number;
}

export interface LeaveRecord {
  id: string;
  type: LeaveType;
  durationDays: number;
  startDate: string;
  endDate: string;
  reason: string;
  status: LeaveApprovalStatus;
}

export interface LeaveRequestPayload {
  type: LeaveType;
  startDate: string;
  endDate: string;
  reason: string;
}

export interface EmployeeNotification {
  id: number;
  type: 'payroll_confirmed';
  title: string;
  content: string;
  bizId: number | null;
  bizMonth: string | null;
  readAt: string | null;
  createdAt: string | null;
}

export interface EmployeeNotificationListResult {
  items: EmployeeNotification[];
  total: number;
  limit: number;
  offset: number;
}

export interface MobileHomeSummary {
  yearMonth: string;
  monthHours: number;
  attendanceDays: number;
  pendingSopCount: number;
  unreadNotificationCount: number;
  notifications: EmployeeNotification[];
}
