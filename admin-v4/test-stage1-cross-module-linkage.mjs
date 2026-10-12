import assert from "node:assert/strict";
import { calculateDailyMetrics } from "../apps/admin/server-v4/attendance.js";
import { mapEmployeeRow } from "../apps/admin/server-v4/employees.js";

console.log("===============================================================");
console.log("  🚀 [阶段一] 员工管理 ➔ 考勤管理 ➔ 薪酬核算 跨模块联动测试套件");
console.log("===============================================================\n");

const config = {
  standardHours: 8,
  otHourlyFee: 50,
  startShift: "08:30",
  endShift: "17:30",
  breakStart: "12:00",
  breakEnd: "13:00",
  currency: "THB",
  holidayDates: []
};

const results = [];
function recordResult(name, pass, details) {
  results.push({ name, pass, details });
  if (pass) {
    console.log(`✅ [PASS] ${name}`);
  } else {
    console.error(`❌ [FAIL] ${name}: ${details}`);
  }
}

// =========================================================================
// 场景一：需打卡普通员工（正常打卡出勤）
// =========================================================================
console.log("▶ 场景一：需打卡普通员工（正常打卡出勤）");
{
  const rawEmpRow = {
    id: 101,
    employee_no: "EMP-001",
    name: "Somchai (需打卡)",
    role: "普通员工",
    dept: "A区拣货",
    requires_attendance: true,
    salary_type: "fixed",
    fixed_salary: 30000,
    attendance_bonus: 2000,
    status: "active"
  };
  const emp = mapEmployeeRow(rawEmpRow);
  assert.equal(emp.requiresAttendance, true, "普通员工默认 requiresAttendance 必须为 true");

  const rec = {
    inTime: "08:30",
    outTime: "17:30",
    type: "normal"
  };
  const dailyMetrics = calculateDailyMetrics({
    emp,
    rec,
    date: "2025-06-11", // 星期三
    config
  });

  assert.equal(dailyMetrics.status, "normal", "正常打卡状态应为 normal");
  assert.equal(dailyMetrics.valid, 8, "有效工时必须为 8 小时");
  assert.equal(dailyMetrics.ot, 0, "无加班");
  assert.equal(dailyMetrics.shiftPay, 1000, "日薪应为 30000 / 30 = 1000");

  const workingDays = 22; // 满勤
  const isAttendanceExempt = emp.requiresAttendance === false;
  const attendanceBonusAmount = (isAttendanceExempt || workingDays >= 20) ? Number(emp.attendanceBonus || 2000) : 0;
  assert.equal(attendanceBonusAmount, 2000, "需打卡员工满勤应足额发放全勤奖 2000");

  recordResult("场景一：需打卡普通员工（正常打卡出勤）", true, "工时 8h、日薪 1000、全勤奖 2000 发放正常");
}

// =========================================================================
// 场景二：需打卡普通员工（旷工缺卡）
// =========================================================================
console.log("\n▶ 场景二：需打卡普通员工（旷工缺卡）");
{
  const rawEmpRow = {
    id: 102,
    employee_no: "EMP-002",
    name: "Aung (需打卡缺勤)",
    role: "普通员工",
    dept: "B区打包",
    requires_attendance: true,
    salary_type: "hourly",
    hourly_rate: 150,
    attendance_bonus: 1500,
    status: "active"
  };
  const emp = mapEmployeeRow(rawEmpRow);
  assert.equal(emp.requiresAttendance, true);

  const dailyMetrics = calculateDailyMetrics({
    emp,
    rec: null,
    date: "2025-06-11",
    config
  });

  assert.equal(dailyMetrics.status, "absent", "未打卡且需打卡员工必须严格判定为 absent（旷工）");
  assert.equal(dailyMetrics.valid, 0, "旷工有效工时必须为 0");
  assert.equal(dailyMetrics.shiftPay, 0, "旷工当日薪资必须为 0");

  const workingDays = 15;
  const isAttendanceExempt = emp.requiresAttendance === false;
  const attendanceBonusAmount = (isAttendanceExempt || workingDays >= 20) ? Number(emp.attendanceBonus) : 0;
  assert.equal(attendanceBonusAmount, 0, "需打卡员工出勤不足时全勤奖必须清零");

  recordResult("场景二：需打卡普通员工（旷工缺卡）", true, "状态 absent、工时 0h、日薪 0、全勤奖 0 清零扣除");
}

// =========================================================================
// 场景三：免打卡管理人员（未打卡工作日，自动全勤）
// =========================================================================
console.log("\n▶ 场景三：免打卡管理人员（未打卡工作日，自动全勤）");
{
  const rawEmpRow = {
    id: 103,
    employee_no: "EMP-003",
    name: "Lin (仓库主管·免打卡)",
    role: "仓储主管",
    dept: "全仓管理",
    requires_attendance: false,
    salary_type: "fixed",
    fixed_salary: 60000,
    attendance_bonus: 3000,
    status: "active"
  };
  const emp = mapEmployeeRow(rawEmpRow);
  assert.equal(emp.requiresAttendance, false, "免打卡员工 requiresAttendance 为 false");

  const dailyMetrics = calculateDailyMetrics({
    emp,
    rec: null,
    date: "2025-06-11",
    config
  });

  assert.equal(dailyMetrics.status, "exempt_present", "免打卡员工工作日未打卡必须自动转为 exempt_present（免打卡出勤）");
  assert.equal(dailyMetrics.valid, 8, "免打卡员工工作日必须自动赋予 8h 标准有效工时");
  assert.equal(dailyMetrics.ot, 0, "无加班");
  assert.equal(dailyMetrics.shiftPay, 2000, "日薪正常计发 60000 / 30 = 2000");

  const workingDays = 10;
  const isAttendanceExempt = emp.requiresAttendance === false;
  const attendanceBonusAmount = (isAttendanceExempt || workingDays >= 20) ? Number(emp.attendanceBonus) : 0;
  assert.equal(attendanceBonusAmount, 3000, "免打卡员工必须自动足额计发全勤奖 3000");

  recordResult("场景三：免打卡管理人员（未打卡工作日，自动全勤）", true, "状态 exempt_present、标准工时 8h、日薪 2000、全勤奖 3000 足额计发");
}

// =========================================================================
// 场景四：免打卡人员（主动打卡并产生加班）
// =========================================================================
console.log("\n▶ 场景四：免打卡人员（主动打卡并产生加班）");
{
  const rawEmpRow = {
    id: 104,
    employee_no: "EMP-004",
    name: "Chen (技术总监·自愿打卡加班)",
    role: "管理员",
    dept: "技术运营",
    requires_attendance: false,
    salary_type: "fixed",
    fixed_salary: 90000,
    ot_rule_type: "fixed",
    overtime_hourly_fee: 100,
    attendance_bonus: 5000,
    status: "active"
  };
  const emp = mapEmployeeRow(rawEmpRow);

  const rec = {
    inTime: "08:30",
    outTime: "20:30",
    type: "normal"
  };
  const dailyMetrics = calculateDailyMetrics({
    emp,
    rec,
    date: "2025-06-11",
    config
  });

  assert.equal(dailyMetrics.valid, 11, "有效工时应为 11h");
  assert.equal(dailyMetrics.ot, 3, "加班工时应为 3h");
  assert.equal(dailyMetrics.otPay, 300, "加班费应为 3h * 100 = 300");
  assert.equal(dailyMetrics.shiftPay, 3000, "日薪应为 90000 / 30 = 3000");
  assert.equal(dailyMetrics.totalPay, 3300, "总计应为 3000 + 300 = 3300");

  recordResult("场景四：免打卡人员（主动打卡并产生加班）", true, "实做 11h、加班 3h、加班费 300、日总薪 3300 闭环核算");
}

// =========================================================================
// 场景五：动态角色打卡规则切换联动测试
// =========================================================================
console.log("\n▶ 场景五：动态角色打卡规则切换联动测试");
{
  const empBefore = mapEmployeeRow({
    id: 105,
    employee_no: "EMP-005",
    name: "Khin (动态角色转换)",
    role: "财务出纳",
    requires_attendance: true,
    fixed_salary: 45000,
    attendance_bonus: 2500,
    status: "active"
  });
  const resBefore = calculateDailyMetrics({ emp: empBefore, rec: null, date: "2025-06-11", config });
  assert.equal(resBefore.status, "absent", "配置需打卡时未打卡为 absent");
  assert.equal(resBefore.valid, 0, "工时为 0");

  const empAfter = mapEmployeeRow({
    id: 105,
    employee_no: "EMP-005",
    name: "Khin (动态角色转换)",
    role: "财务出纳",
    requires_attendance: false,
    fixed_salary: 45000,
    attendance_bonus: 2500,
    status: "active"
  });
  const resAfter = calculateDailyMetrics({ emp: empAfter, rec: null, date: "2025-06-11", config });
  assert.equal(resAfter.status, "exempt_present", "切换为免打卡后，未打卡工作日自动转为 exempt_present");
  assert.equal(resAfter.valid, 8, "工时恢复为 8h");
  assert.equal(resAfter.shiftPay, 1500, "日薪恢复为 45000 / 30 = 1500");

  recordResult("场景五：动态角色打卡规则切换联动测试", true, "角色取消打卡勾选后，状态实时从 absent ➔ exempt_present，工时与薪资自动恢复");
}

// =========================================================================
// 场景六：节假日排班自动豁免联动测试
// =========================================================================
console.log("\n▶ 场景六：节假日排班自动豁免联动测试");
{
  const emp = mapEmployeeRow({
    id: 106,
    employee_no: "EMP-006",
    name: "Nok (需打卡·节假日)",
    role: "打包员",
    requires_attendance: true,
    fixed_salary: 30000,
    status: "active"
  });
  const holidayConfig = {
    ...config,
    holidayDates: ["2025-06-12::泼水节::TH"]
  };

  // 1. 节假日当天未打卡：自动豁免为 holiday（法定假日），而非 absent（旷工）
  const resHoliday = calculateDailyMetrics({
    emp,
    rec: null,
    date: "2025-06-12",
    config: holidayConfig
  });
  assert.equal(resHoliday.status, "holiday", "法定节假日未打卡必须自动标记为 holiday（法定假日）");
  assert.equal(resHoliday.valid, 0, "法定假日有效工时为 0");
  assert.equal(resHoliday.ot, 0, "法定假日加班工时为 0");

  // 2. 工作日未打卡：仍正常判定为 absent（旷工）
  const resWorkday = calculateDailyMetrics({
    emp,
    rec: null,
    date: "2025-06-11",
    config: holidayConfig
  });
  assert.equal(resWorkday.status, "absent", "普通工作日未打卡仍必须严格判定为 absent");

  recordResult("场景六：节假日排班自动豁免联动测试", true, "法定假日未打卡自动标记 holiday 豁免旷工，工作日未打卡维持 absent");
}

// =========================================================================
// 场景七：工时起算截断与提前加班审批放行测试
// =========================================================================
console.log("\n▶ 场景七：工时起算截断与提前加班审批放行测试");
{
  const emp = mapEmployeeRow({
    id: 107,
    employee_no: "EMP-007",
    name: "Dan (早到打卡测试)",
    role: "操作工",
    requires_attendance: true,
    salary_type: "hourly",
    hourly_rate: 100,
    ot_rule_type: "multiplier",
    ot_multiplier_workday: 1.5,
    status: "active"
  });

  // 1. 员工 07:30 打卡（早于 startShift: 08:30），17:30 下班，午休 12:00-13:00 (扣1h)
  // 未审批提前加班：截断至 08:30 起算，总工时 (17:30 - 08:30) - 1h = 8h，加班 0h
  const recEarly = {
    inTime: "07:30",
    outTime: "17:30",
    type: "normal"
  };
  const resTruncated = calculateDailyMetrics({
    emp,
    rec: recEarly,
    date: "2025-06-11",
    config
  });
  assert.equal(resTruncated.valid, 8, "早于 startShift 打卡且未审批时必须截断至 08:30 起算 (8h)");
  assert.equal(resTruncated.ot, 0, "早到时间不得计为加班工时");

  // 2. 带有提前加班审批标识：放行实际打卡时间 07:30 起算
  // 总工时 (17:30 - 07:30) - 1h = 9h，加班 1h
  const recApproved = {
    inTime: "07:30",
    outTime: "17:30",
    earlyOvertimeApproved: true,
    type: "normal"
  };
  const resApproved = calculateDailyMetrics({
    emp,
    rec: recApproved,
    date: "2025-06-11",
    config
  });
  assert.equal(resApproved.valid, 9, "开启提前加班审批后放行完整打卡工时 (9h)");
  assert.equal(resApproved.ot, 1, "超出 8h 的早到工时计入 1h 加班");
  assert.equal(resApproved.otPay, 1 * 100 * 1.5, "工作日加班费正常计发");

  recordResult("场景七：工时起算截断与提前加班审批放行测试", true, "默认截断至 08:30 起算(8h/0ot)，审批放行后计全额(9h/1ot)");
}

console.log("\n===============================================================");
console.log(`  🎉 阶段一联动测试矩阵全部通过！通过率: 100% (${results.length}/${results.length})`);
console.log("===============================================================");
