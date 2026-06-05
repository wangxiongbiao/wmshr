import assert from "node:assert/strict";
import { calculateDailyAttendanceRow, DEFAULT_ATTENDANCE_CONFIG } from "./attendance-v2.js";

const ownerUserId = "00000000-0000-0000-0000-000000000001";
const date = "2026-06-03";

function baseEmployee(overrides = {}) {
  return {
    id: 1,
    status: "active",
    fixed_salary: null,
    hourly_rate: 100,
    ...overrides
  };
}

function normalRecord(overrides = {}) {
  return {
    id: 10,
    in_time: "08:30",
    out_time: "19:45",
    type: "normal",
    source: "device",
    note: "",
    ...overrides
  };
}

// v2 考勤以员工状态作为优先级最高的业务事实：休假员工即使有打卡记录，也不能产生工时和费用。
{
  const row = calculateDailyAttendanceRow(baseEmployee({ status: "on_leave" }), normalRecord(), DEFAULT_ATTENDANCE_CONFIG, date, ownerUserId);
  assert.equal(row.status, "leave");
  assert.equal(row.valid_hours, 0);
  assert.equal(row.work_pay, 0);
  assert.equal(row.overtime_pay, 0);
  assert.equal(row.total_pay, 0);
}

// 病假属于非出勤类考勤：不产生工时和费用，但必须保留 sick_leave 状态供后台列表区分普通假期。
{
  const row = calculateDailyAttendanceRow(baseEmployee(), normalRecord({ type: "sick_leave", in_time: "08:30", out_time: "17:30", source: "manual" }), DEFAULT_ATTENDANCE_CONFIG, date, ownerUserId);
  assert.equal(row.status, "sick_leave");
  assert.equal(row.valid_hours, 0);
  assert.equal(row.work_pay, 0);
  assert.equal(row.overtime_pay, 0);
  assert.equal(row.total_pay, 0);
}

// v2 加班直接使用原始超出标准工时，不再沿用旧规则里的 0.5 小时向下取整。
{
  const row = calculateDailyAttendanceRow(baseEmployee({ hourly_rate: 80 }), normalRecord({ out_time: "18:45" }), DEFAULT_ATTENDANCE_CONFIG, date, ownerUserId);
  assert.equal(row.valid_hours, 9.25);
  assert.equal(row.overtime_raw_hours, 1.25);
  assert.equal(row.overtime_pay_hours, 1.25);
  assert.equal(row.work_pay, 640);
  assert.equal(row.overtime_pay, 62.5);
  assert.equal(row.total_pay, 702.5);
}

// v2 月薪员工按 fixedSalary / 30 生成上班费用，并叠加全局配置的加班费。
{
  const row = calculateDailyAttendanceRow(baseEmployee({ fixed_salary: 9000, hourly_rate: 80 }), normalRecord({ out_time: "18:30" }), DEFAULT_ATTENDANCE_CONFIG, date, ownerUserId);
  assert.equal(row.valid_hours, 9);
  assert.equal(row.overtime_pay_hours, 1);
  assert.equal(row.work_pay, 300);
  assert.equal(row.overtime_pay, 50);
  assert.equal(row.total_pay, 350);
}

// 全局规则币种可以不是员工币种；服务端必须先换算到员工薪资币种，再计算个人考勤行金额。
{
  const config = { ...DEFAULT_ATTENDANCE_CONFIG, ot_hourly_fee: 2, currency: "USD" };
  const row = calculateDailyAttendanceRow(baseEmployee({ hourly_rate: 80, currency: "THB" }), normalRecord({ out_time: "18:30" }), config, date, ownerUserId);
  assert.equal(row.overtime_pay_hours, 1);
  assert.equal(row.overtime_pay, 72);
  assert.equal(row.total_pay, 712);
}
