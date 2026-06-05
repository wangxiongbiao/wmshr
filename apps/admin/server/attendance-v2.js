export const DEFAULT_ATTENDANCE_CONFIG = {
  start_shift: "08:30",
  end_shift: "17:30",
  break_start: "12:00",
  break_end: "13:00",
  standard_hours: 8,
  ot_hourly_fee: 50,
  currency: "THB"
};

const CURRENCY_TO_THB_RATE = {
  THB: 1,
  USD: 36,
  MYR: 7.7,
  IDR: 0.0023
};

export function convertAttendanceRuleAmount(amount, fromCurrency = "THB", toCurrency = "THB") {
  // 考勤全局规则的加班费可以用不同币种维护；结果必须落到员工薪资币种，避免个人调整后同一行出现混合币种金额。
  // 当前项目没有独立汇率表，先使用稳定服务端汇率表；如果后续要改为实时/可配置汇率，应先替换这里并同步设置弹窗说明。
  const sourceRate = CURRENCY_TO_THB_RATE[fromCurrency] || CURRENCY_TO_THB_RATE.THB;
  const targetRate = CURRENCY_TO_THB_RATE[toCurrency] || CURRENCY_TO_THB_RATE.THB;
  return roundToTwo((Number(amount || 0) * sourceRate) / targetRate);
}

export function roundToTwo(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

export function parseTimeToHours(value) {
  if (!value || typeof value !== "string") {
    return null;
  }
  const [hourText, minuteText] = value.slice(0, 5).split(":");
  const hours = Number(hourText);
  const minutes = Number(minuteText);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return null;
  }
  return hours + minutes / 60;
}

export function calculateOverlapHours(start, end, breakStart, breakEnd) {
  let adjustedEnd = end;
  if (adjustedEnd < start) {
    adjustedEnd += 24;
  }

  let adjustedBreakEnd = breakEnd;
  if (adjustedBreakEnd < breakStart) {
    adjustedBreakEnd += 24;
  }

  let overlapStart = Math.max(start, breakStart);
  let overlapEnd = Math.min(adjustedEnd, adjustedBreakEnd);
  if (overlapStart < overlapEnd) {
    return overlapEnd - overlapStart;
  }

  overlapStart = Math.max(start, breakStart + 24);
  overlapEnd = Math.min(adjustedEnd + 24, adjustedBreakEnd + 24);
  if (overlapStart < overlapEnd) {
    return overlapEnd - overlapStart;
  }

  return 0;
}

function normalizeConfig(config = {}) {
  return {
    ...DEFAULT_ATTENDANCE_CONFIG,
    ...config,
    standard_hours: Number(config.standard_hours ?? DEFAULT_ATTENDANCE_CONFIG.standard_hours),
    ot_hourly_fee: Number(config.ot_hourly_fee ?? DEFAULT_ATTENDANCE_CONFIG.ot_hourly_fee),
    currency: config.currency || DEFAULT_ATTENDANCE_CONFIG.currency
  };
}

function buildAttendanceResultPayload({
  ownerUserId,
  employeeId,
  date,
  record = null,
  config,
  status,
  hasException,
  exceptionReason,
  rawHours = 0,
  breakDeductionHours = 0,
  validHours = 0,
  standardHours = 0,
  overtimeRawHours = 0,
  overtimePayHours = 0,
  workPay = 0,
  overtimePay = 0,
  totalPay = 0
}) {
  // v2 计算结果只认账号级 attendance_config；旧规则列仅作为现有表结构的物理残留被清空。
  // 不要再写入“全局规则名”或规则 ID，否则前端/接口会重新形成旧多规则兼容语义。
  return {
    owner_user_id: ownerUserId,
    employee_id: employeeId,
    attendance_record_id: record ? Number(record.id) : null,
    date,
    attendance_rule_id: null,
    attendance_rule_name: null,
    raw_in_time: record?.in_time || null,
    raw_out_time: record?.out_time || null,
    raw_hours: roundToTwo(rawHours),
    break_deduction_hours: roundToTwo(breakDeductionHours),
    valid_hours: roundToTwo(validHours),
    standard_hours: roundToTwo(standardHours),
    overtime_raw_hours: roundToTwo(overtimeRawHours),
    overtime_pay_hours: roundToTwo(overtimePayHours),
    work_pay: roundToTwo(workPay),
    overtime_pay: roundToTwo(overtimePay),
    total_pay: roundToTwo(totalPay),
    status,
    has_exception: hasException,
    exception_reason: exceptionReason,
    note: record?.note || "",
    source: record?.source || null,
    calculated_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

function isEmployeeOnLeave(employee) {
  return employee?.status === "on_leave";
}

export function calculateDailyAttendanceRow(employee, record, config, date, ownerUserId) {
  const normalizedConfig = normalizeConfig(config);
  const employeeId = Number(employee.id);
  const standardHours = Number(normalizedConfig.standard_hours);

  // 员工休假状态是 v2 的最高优先级，避免已有打卡误生成工资；此处必须早于 record.type 判断。
  if (isEmployeeOnLeave(employee)) {
    return buildAttendanceResultPayload({
      ownerUserId,
      employeeId,
      date,
      record,
      config: normalizedConfig,
      status: "leave",
      hasException: false,
      exceptionReason: null
    });
  }

  if (!record) {
    return buildAttendanceResultPayload({
      ownerUserId,
      employeeId,
      date,
      record: null,
      config: normalizedConfig,
      status: "absent",
      hasException: false,
      exceptionReason: null
    });
  }

  if (record.type === "leave" || record.type === "sick_leave" || record.type === "absent") {
    return buildAttendanceResultPayload({
      ownerUserId,
      employeeId,
      date,
      record,
      config: normalizedConfig,
      // 病假和普通假期一样不参与工时/费用计算，但保留独立状态给后台列表展示，避免被混成“假期”。
      status: record.type,
      hasException: false,
      exceptionReason: null
    });
  }

  if (!record.in_time) {
    return buildAttendanceResultPayload({
      ownerUserId,
      employeeId,
      date,
      record,
      config: normalizedConfig,
      status: "exception",
      hasException: true,
      exceptionReason: "IN_TIME_MISSING",
      standardHours
    });
  }

  if (!record.out_time) {
    return buildAttendanceResultPayload({
      ownerUserId,
      employeeId,
      date,
      record,
      config: normalizedConfig,
      status: "exception",
      hasException: true,
      exceptionReason: "OUT_TIME_MISSING",
      standardHours
    });
  }

  const inHours = parseTimeToHours(record.in_time);
  const outHours = parseTimeToHours(record.out_time);
  const breakStart = parseTimeToHours(normalizedConfig.break_start);
  const breakEnd = parseTimeToHours(normalizedConfig.break_end);

  if (inHours === null || outHours === null || breakStart === null || breakEnd === null) {
    return buildAttendanceResultPayload({
      ownerUserId,
      employeeId,
      date,
      record,
      config: normalizedConfig,
      status: "exception",
      hasException: true,
      exceptionReason: "TIME_FORMAT_INVALID",
      standardHours
    });
  }

  let adjustedOutHours = outHours;
  if (adjustedOutHours < inHours) {
    adjustedOutHours += 24;
  }

  const rawHours = adjustedOutHours - inHours;
  const breakDeductionHours = calculateOverlapHours(inHours, adjustedOutHours, breakStart, breakEnd);
  const validHours = Math.max(0, rawHours - breakDeductionHours);
  const overtimeRawHours = Math.max(0, validHours - standardHours);
  // v2 明确取消旧规则的 0.5 小时取整，费用和展示都直接使用真实超出时长。
  const overtimePayHours = overtimeRawHours;
  const hasFixedSalary = Number(employee.fixed_salary || 0) > 0;
  const hourlyRate = Number(employee.hourly_rate || 0);
  const overtimeFeeInEmployeeCurrency = convertAttendanceRuleAmount(
    normalizedConfig.ot_hourly_fee,
    normalizedConfig.currency,
    employee.currency || "THB"
  );
  const workPay = hasFixedSalary
    ? Number(employee.fixed_salary) / 30
    : Math.max(0, validHours - overtimePayHours) * hourlyRate;
  const overtimePay = overtimePayHours * overtimeFeeInEmployeeCurrency;

  return buildAttendanceResultPayload({
    ownerUserId,
    employeeId,
    date,
    record,
    config: normalizedConfig,
    status: record.source === "manual" ? "manual_adjusted" : "normal",
    hasException: false,
    exceptionReason: null,
    rawHours,
    breakDeductionHours,
    validHours,
    standardHours,
    overtimeRawHours,
    overtimePayHours,
    workPay,
    overtimePay,
    totalPay: workPay + overtimePay
  });
}
