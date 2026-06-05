import {AttendanceRecord, CheckInPayload, TodayAttendanceStatus} from '../types';

let todayStatus: TodayAttendanceStatus = {
  date: new Date().toISOString().slice(0, 10),
  status: 'not_checked_in',
  checkInTime: null,
  checkOutTime: null,
  locationName: '曼谷 Warehouse A',
  locationAccuracy: 3.2,
  canCheckIn: true,
  canCheckOut: false,
};

const attendanceRecords: AttendanceRecord[] = [
  {id: '2026-05-17', date: '2026-05-17', checkInTime: '08:30', checkOutTime: '17:35', type: 'normal', hours: '8.1h'},
  {id: '2026-05-16', date: '2026-05-16', checkInTime: '08:45', checkOutTime: '19:20', type: 'overtime', hours: '9.6h'},
  {id: '2026-05-15', date: '2026-05-15', checkInTime: '08:32', checkOutTime: '17:40', type: 'normal', hours: '8.1h'},
  {id: '2026-05-14', date: '2026-05-14', checkInTime: '08:28', checkOutTime: '17:30', type: 'normal', hours: '8.0h'},
];

export async function fetchTodayAttendanceStatus(): Promise<TodayAttendanceStatus> {
  return todayStatus;
}

export async function submitAttendanceCheckIn(payload: CheckInPayload): Promise<TodayAttendanceStatus> {
  // mock 仍严格模拟生产顺序：未打卡只能上班打卡，在勤中只能下班打卡；演示重置不再放进 service。
  const minute = new Date(payload.clientTime).toLocaleTimeString('zh-CN', {hour: '2-digit', minute: '2-digit', hour12: false});

  if (payload.type === 'check_in') {
    if (todayStatus.status !== 'not_checked_in') {
      throw new Error('当前状态不允许上班打卡');
    }
    todayStatus = {...todayStatus, status: 'checked_in', checkInTime: minute, canCheckIn: false, canCheckOut: true};
  } else {
    if (todayStatus.status !== 'checked_in') {
      throw new Error('当前状态不允许下班打卡');
    }
    todayStatus = {...todayStatus, status: 'checked_out', checkOutTime: minute, canCheckIn: false, canCheckOut: false};
  }

  return todayStatus;
}

export async function resetMockTodayAttendanceStatus(): Promise<TodayAttendanceStatus> {
  // 仅供当前原型阶段复位演示；接真实后端时应删除调用点，避免生产环境出现重置考勤入口。
  todayStatus = {...todayStatus, status: 'not_checked_in', checkInTime: null, checkOutTime: null, canCheckIn: true, canCheckOut: false};
  return todayStatus;
}

export async function fetchAttendanceRecords(): Promise<AttendanceRecord[]> {
  return attendanceRecords;
}
