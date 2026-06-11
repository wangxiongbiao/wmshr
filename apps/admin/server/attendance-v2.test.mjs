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

// v2 月薪员工的基础工资在月薪模块整月核算；日考勤这里只保留加班等过程金额。
{
  const row = calculateDailyAttendanceRow(baseEmployee({ fixed_salary: 9000, hourly_rate: 80 }), normalRecord({ out_time: "18:30" }), DEFAULT_ATTENDANCE_CONFIG, date, ownerUserId);
  assert.equal(row.valid_hours, 9);
  assert.equal(row.overtime_pay_hours, 1);
  assert.equal(row.work_pay, 0);
  assert.equal(row.overtime_pay, 50);
  assert.equal(row.total_pay, 50);
}

// 餐补按有效工时占标准工时比例折算：上一整天拿整额，半天只拿一半。
{
  const row = calculateDailyAttendanceRow(
    baseEmployee({ meal_allowance: 100 }),
    normalRecord({ in_time: "08:30", out_time: "13:30" }),
    DEFAULT_ATTENDANCE_CONFIG,
    date,
    ownerUserId
  );
  assert.equal(row.valid_hours, 4);
  assert.equal(row.meal_allowance_amount, 50);
}

// 全局规则币种可以不是员工币种；服务端必须先换算到员工薪资币种，再计算个人考勤行金额。
{
  const config = { ...DEFAULT_ATTENDANCE_CONFIG, ot_hourly_fee: 2, currency: "USD" };
  const row = calculateDailyAttendanceRow(baseEmployee({ hourly_rate: 80, currency: "THB" }), normalRecord({ out_time: "18:30" }), config, date, ownerUserId);
  assert.equal(row.overtime_pay_hours, 1);
  assert.equal(row.overtime_pay, 72);
  assert.equal(row.total_pay, 712);
}

// 启用新倍率规则后，时薪员工的加班单价应直接取员工正常时薪并按工作日倍率放大。
{
  const config = { ...DEFAULT_ATTENDANCE_CONFIG, overtime_rule_enabled: true, ot_hourly_fee: 50 };
  const row = calculateDailyAttendanceRow(baseEmployee({ hourly_rate: 80, currency: "THB" }), normalRecord({ out_time: "18:30" }), config, date, ownerUserId);
  assert.equal(row.overtime_pay_hours, 1);
  assert.equal(row.overtime_pay, 120);
  assert.equal(row.total_pay, 760);
}

// 启用新倍率规则后，固定薪资员工仍按配置里的加班费基数套用工作日/周末/节假日倍率。
{
  const weekdayConfig = { ...DEFAULT_ATTENDANCE_CONFIG, overtime_rule_enabled: true, ot_hourly_fee: 50 };
  const weekdayRow = calculateDailyAttendanceRow(baseEmployee({ fixed_salary: 9000, hourly_rate: 80, currency: "THB" }), normalRecord({ out_time: "18:30" }), weekdayConfig, date, ownerUserId);
  assert.equal(weekdayRow.overtime_pay, 75);

  const weekendRow = calculateDailyAttendanceRow(baseEmployee({ fixed_salary: 9000, currency: "THB" }), normalRecord({ out_time: "18:30" }), weekdayConfig, "2026-06-06", ownerUserId);
  assert.equal(weekendRow.overtime_pay, 100);

  const holidayConfig = { ...weekdayConfig, holiday_dates: ["2026-06-03"] };
  const holidayRow = calculateDailyAttendanceRow(baseEmployee({ fixed_salary: 9000, currency: "THB" }), normalRecord({ out_time: "18:30" }), holidayConfig, date, ownerUserId);
  assert.equal(holidayRow.overtime_pay, 150);
}

// 员工级加班费配置可以覆盖系统默认；关闭倍率时直接按员工自己的加班费结算。
{
  const row = calculateDailyAttendanceRow(
    baseEmployee({ hourly_rate: 80, currency: "THB", overtime_hourly_fee: 88, overtime_rule_enabled: false }),
    normalRecord({ out_time: "18:30" }),
    { ...DEFAULT_ATTENDANCE_CONFIG, overtime_rule_enabled: true, ot_hourly_fee: 50 },
    date,
    ownerUserId
  );
  assert.equal(row.overtime_pay, 88);
}

// 员工级“是否走倍率规则”可以覆盖系统全局开关；开启后按员工自己的加班费乘对应倍率。
{
  const row = calculateDailyAttendanceRow(
    baseEmployee({ fixed_salary: 9000, currency: "THB", overtime_hourly_fee: 60, overtime_rule_enabled: true }),
    normalRecord({ out_time: "18:30" }),
    { ...DEFAULT_ATTENDANCE_CONFIG, overtime_rule_enabled: false, ot_hourly_fee: 50 },
    date,
    ownerUserId
  );
  assert.equal(row.overtime_pay, 90);
}

// 当天底稿没有打卡时必须保留 pending 过程态，避免零点刚生成就把员工误判为缺勤。
{
  const row = calculateDailyAttendanceRow(baseEmployee(), null, DEFAULT_ATTENDANCE_CONFIG, date, ownerUserId, { pendingIfNoRecord: true });
  assert.equal(row.status, "pending");
  assert.equal(row.calculation_phase, "draft");
  assert.equal(row.settled_at, null);
  assert.equal(row.has_exception, false);
}

// 当天只有上班打卡但没有下班打卡时展示 checked_in；正式结算不传该选项时仍会转异常。
{
  const draftRow = calculateDailyAttendanceRow(baseEmployee(), normalRecord({ out_time: null, source: "mobile" }), DEFAULT_ATTENDANCE_CONFIG, date, ownerUserId, { inProgressIfMissingOut: true });
  assert.equal(draftRow.status, "checked_in");
  assert.equal(draftRow.calculation_phase, "draft");
  assert.equal(draftRow.has_exception, false);

  const settledRow = calculateDailyAttendanceRow(baseEmployee(), normalRecord({ out_time: null, source: "mobile" }), DEFAULT_ATTENDANCE_CONFIG, date, ownerUserId);
  assert.equal(settledRow.status, "exception");
  assert.equal(settledRow.exception_reason, "OUT_TIME_MISSING");
}
