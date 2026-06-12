import {httpClient} from '../../../shared/api/httpClient';
import {AttendanceRecord, CheckInPayload, MobileHomeSummary, TodayAttendanceStatus} from '../types';

function authHeaders(accessToken: string) {
  // 员工端业务接口只接受后端签发 token；页面必须显式传入当前 session，避免 service 层偷偷读取全局状态造成登出后串号。
  return {Authorization: `Bearer ${accessToken}`};
}

export async function fetchTodayAttendanceStatus(accessToken: string): Promise<TodayAttendanceStatus> {
  return httpClient<TodayAttendanceStatus>('/api/mobile/attendance/today', {
    headers: authHeaders(accessToken),
  });
}

export async function submitAttendanceCheckIn(accessToken: string, payload: CheckInPayload): Promise<TodayAttendanceStatus> {
  const endpoint = payload.type === 'check_in' ? '/api/mobile/attendance/check-in' : '/api/mobile/attendance/check-out';
  return httpClient<TodayAttendanceStatus>(endpoint, {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify(payload),
  });
}

export async function fetchAttendanceRecords(accessToken: string, {limit = 7, offset = 0}: {limit?: number; offset?: number} = {}): Promise<AttendanceRecord[]> {
  const query = `?limit=${encodeURIComponent(String(limit))}&offset=${encodeURIComponent(String(offset))}`;
  return httpClient<AttendanceRecord[]>(`/api/mobile/attendance/records${query}`, {
    headers: authHeaders(accessToken),
  });
}

export async function fetchMobileHomeSummary(accessToken: string): Promise<MobileHomeSummary> {
  return httpClient<MobileHomeSummary>('/api/mobile/home/summary', {
    headers: authHeaders(accessToken),
  });
}
