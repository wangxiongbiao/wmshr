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

export const INITIAL_EMPLOYEES: Employee[] = [];

export const ROLE_OPTIONS = ['拣货员', '打包员', '叉车工', '质检员', '组长', '仓管员'];

export const INITIAL_ATTENDANCE: AttendanceRecord[] = [
  { id: 1, employeeId: 1, date: '2026-05-15', inTime: '08:00', outTime: '18:00', type: 'normal', note: '', source: 'device' },
  { id: 2, employeeId: 1, date: '2026-05-16', inTime: '08:00', outTime: '19:30', type: 'overtime', note: '', source: 'device' }
];
