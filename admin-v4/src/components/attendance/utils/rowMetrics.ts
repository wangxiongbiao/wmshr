import type { AppConfig, Employee, HolidayRecord, LeaveRequest } from "../../../types";
import { calcAttendanceDetails, calcOvertimePay } from "../../../lib/utils";
import { ATTENDANCE_TYPE_NAMES, isNonWorkingAttendanceType } from "../constants";
import type { FlatAttendanceRow, RowMetrics } from "../types";

export function getRowMetrics(
  row: FlatAttendanceRow,
  config: AppConfig,
  holidays: HolidayRecord[],
  leaveRequests: LeaveRequest[] = []
): RowMetrics {
  if (row && "details" in row && row.details && typeof row.shiftPay === "number" && typeof row.totalPay === "number") {
    const type = row.status || (row.rec ? row.rec.type : "absent");
    const isExempt = row.emp?.requiresAttendance === false;
    const isAbsentOrLeave = isNonWorkingAttendanceType(type) || (!row.rec && !isExempt);
    return {
      details: row.details || { valid: 0, ot: 0 },
      shiftPay: Number(row.shiftPay) || 0,
      otPay: Number(row.otPay) || 0,
      mealAllowance: Number(row.mealAllowance) || 0,
      dailySocialSecurity: Number(row.dailySocialSecurity) || 0,
      dailyServiceFee: Number(row.dailyServiceFee) || 0,
      totalPay: Number(row.totalPay) || 0,
      typeName: (type === "exempt_present" || (isExempt && !row.rec)) ? "免打卡" : (ATTENDANCE_TYPE_NAMES[type] || type || "正常"),
      type,
      isAbsentOrLeave
    };
  }

  const { emp, rec, date } = row;
  let details = { valid: 0, ot: 0 };
  let typeName = "缺勤";
  const isExempt = emp.requiresAttendance === false;

  const hasApprovedLeave = leaveRequests.some(l => {
    if (String(l.empId) !== String(emp.id) || l.status !== "approved") return false;
    return date >= l.startDate && date <= l.endDate;
  });

  if (emp.status === "休假") {
    typeName = "假期";
  } else if (hasApprovedLeave) {
    typeName = "请假";
  } else if (rec) {
    details = calcAttendanceDetails(rec, config);
    typeName = ATTENDANCE_TYPE_NAMES[rec.type] || "正常";
  } else if (isExempt) {
    const stdH = Number(config.standardHours || 8);
    details = { valid: stdH, ot: 0 };
    typeName = "免打卡";
  }

  const isAbsentOrLeave = emp.status === "休假" || hasApprovedLeave || (!rec && !isExempt) || (rec && isNonWorkingAttendanceType(rec.type));
  const hasBaseWage = emp.baseMonthlyWage !== undefined && emp.baseMonthlyWage !== null && emp.baseMonthlyWage > 0;
  const hasDailyWage = emp.dailyWage !== undefined && emp.dailyWage !== null && emp.dailyWage > 0;

  const shiftPay = isAbsentOrLeave
    ? 0
    : (emp.salaryType === "hourly"
        ? ((details.valid - details.ot) * (emp.hourlyRate ?? 0))
        : (hasBaseWage
            ? (emp.baseMonthlyWage / 30)
            : (hasDailyWage
                ? ((details.valid - details.ot) * (emp.dailyWage / config.standardHours))
                : ((details.valid - details.ot) * (emp.hourlyRate ?? 0))
              )
          )
      );
  const otPay = calcOvertimePay(emp, date, details.ot, config, holidays).amount;

  const getMealAllowanceVal = (e: Employee, isLeaveOrAbsent: boolean) => {
    if (isLeaveOrAbsent) return 0;
    return e.mealAllowanceDaily !== undefined && e.mealAllowanceDaily !== null ? e.mealAllowanceDaily : 0;
  };
  const mealAllowance = getMealAllowanceVal(emp, isAbsentOrLeave);
  const dailySocialSecurity = isAbsentOrLeave ? 0 : (emp.socialSecurity ? (emp.socialSecurity / 30) : 0);

  const isDispatch = emp.sourceType === "劳务派遣";
  const commRate = isDispatch ? (emp.dispatchCommissionRate ?? 0) : 0;
  const dailyServiceFee = isAbsentOrLeave ? 0 : shiftPay * (commRate / 100);

  const totalPay = shiftPay + otPay + mealAllowance - dailySocialSecurity + dailyServiceFee;
  const type = rec?.type || (isAbsentOrLeave ? "absent" : "normal");

  return {
    details,
    shiftPay,
    otPay,
    mealAllowance,
    dailySocialSecurity,
    dailyServiceFee,
    totalPay,
    typeName,
    type,
    isAbsentOrLeave
  };
}
