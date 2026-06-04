/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AppConfig, AttendanceRecord, Employee } from "./types";

export const INITIAL_CONFIG: AppConfig = {
  startShift: "08:30",
  endShift: "17:30",
  breakStart: "12:00",
  breakEnd: "13:00",
  standardHours: 8,
  otHourlyFee: 50,
  overtimeMultiplier: 1.5,
  taxRate: 0.05,
  dailyBreakMinutes: 60,
  currency: 'THB'
};

export const INITIAL_EMPLOYEES: Employee[] = [
  { id: 1, name: 'Thin Thin Aung', gender: 'female', country: 'MM', role: '拣货员', dept: 'A区入库', hourlyRate: 280, baseMonthlyWage: 66000, currency: 'THB', joinDate: '2025-01-10', status: '在职', photo: null },
  { id: 2, name: 'Khin Yu Swe', gender: 'female', country: 'MM', role: '打包员', dept: 'B区出库', hourlyRate: 260, baseMonthlyWage: 60000, currency: 'THB', joinDate: '2025-02-14', status: '在职', photo: null },
  { id: 3, name: 'Khin Yu Wai', gender: 'female', country: 'MM', role: '打包员', dept: 'B区出库', hourlyRate: 260, baseMonthlyWage: 60000, currency: 'THB', joinDate: '2025-03-01', status: '在职', photo: null },
  { id: 4, name: 'Khin Htar Win', gender: 'female', country: 'MM', role: '组长', dept: '全仓', hourlyRate: 350, baseMonthlyWage: 84000, currency: 'THB', joinDate: '2024-11-05', status: '休假', photo: null },
  { id: 5, name: 'Soe Thinzar Nwe', gender: 'female', country: 'MM', role: '质检员', dept: 'D区质检', hourlyRate: 290, baseMonthlyWage: 69000, currency: 'THB', joinDate: '2025-04-20', status: '在职', photo: null },
  { id: 6, name: 'Phyo Lin Aung', gender: 'male', country: 'MM', role: '叉车工', dept: 'C区包装', hourlyRate: 320, baseMonthlyWage: 75000, currency: 'THB', joinDate: '2024-12-15', status: '在职', photo: null },
  { id: 7, name: 'Zin Min Htet', gender: 'male', country: 'MM', role: '拣货员', dept: 'A区入库', hourlyRate: 280, baseMonthlyWage: 66000, currency: 'THB', joinDate: '2025-01-25', status: '在职', photo: null },
  { id: 8, name: 'Aang Myint Than', gender: 'male', country: 'MM', role: '仓管员', dept: '仓库管理', hourlyRate: 300, baseMonthlyWage: 72000, currency: 'THB', joinDate: '2024-06-20', status: '在职', photo: null },
  { id: 9, name: 'Miss onuma', gender: 'female', country: 'TH', role: '打包员', dept: 'E区包装', hourlyRate: 300, baseMonthlyWage: 72000, currency: 'THB', joinDate: '2025-03-10', status: '在职', photo: null },
  { id: 10, name: 'Miss Namphueng', gender: 'female', country: 'TH', role: '拣货员', dept: 'A区入库', hourlyRate: 290, baseMonthlyWage: 69000, currency: 'THB', joinDate: '2025-04-05', status: '休假', photo: null }
];

export const INITIAL_ATTENDANCE: AttendanceRecord[] = [
  { id: 'a1', empId: 1, date: '2026-05-15', inTime: '08:00', outTime: '18:00', type: 'normal', note: '' },
  { id: 'a2', empId: 1, date: '2026-05-16', inTime: '08:00', outTime: '19:30', type: 'overtime', note: '' },
  { id: 'a3', empId: 2, date: '2026-05-15', inTime: '08:30', outTime: '19:00', type: 'normal', note: '' },
  { id: 'a4', empId: 2, date: '2026-05-16', inTime: '08:15', outTime: '20:00', type: 'normal', note: '' },
  { id: 'a5', empId: 3, date: '2026-05-15', inTime: '08:30', outTime: '18:30', type: 'normal', note: '' },
  { id: 'a6', empId: 3, date: '2026-05-16', inTime: '08:30', outTime: '19:30', type: 'normal', note: '' },
  { id: 'a7', empId: 5, date: '2026-05-15', inTime: '08:30', outTime: '17:30', type: 'normal', note: '' },
  { id: 'a8', empId: 5, date: '2026-05-17', inTime: '09:17', outTime: '16:01', type: 'normal', note: '' },
  { id: 'a9', empId: 6, date: '2026-05-15', inTime: '08:30', outTime: '19:30', type: 'normal', note: '' },
  { id: 'a10', empId: 6, date: '2026-05-16', inTime: '08:30', outTime: '17:30', type: 'normal', note: '' },
  { id: 'a11', empId: 7, date: '2026-05-15', inTime: '08:30', outTime: '17:30', type: 'normal', note: '' },
  { id: 'a12', empId: 8, date: '2026-05-15', inTime: '08:30', outTime: '17:30', type: 'normal', note: '' },
  { id: 'a13', empId: 9, date: '2026-05-15', inTime: '08:30', outTime: '18:30', type: 'normal', note: '' }
];
