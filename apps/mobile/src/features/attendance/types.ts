export type AttendanceStatus = 'not_checked_in' | 'checked_in' | 'checked_out';

export interface TodayAttendanceStatus {
  date: string;
  status: AttendanceStatus;
  checkInTime: string | null;
  checkOutTime: string | null;
  locationName: string | null;
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

export interface AttendanceRecord {
  id: string;
  date: string;
  checkInTime: string;
  checkOutTime: string;
  type: 'normal' | 'overtime';
  hours: string;
  workedHours?: number | null;
}

export interface MobileHomeSummary {
  yearMonth: string;
  monthHours: number;
  attendanceDays: number;
  pendingSopCount: number;
}
