import type { AppConfig, HolidayRecord, LeaveRequest } from "../../../types";
import { COUNTRY_NAMES } from "../constants";
import type { FlatAttendanceRow } from "../types";
import { getRowMetrics } from "./rowMetrics";

export function exportAttendanceRowsToCSV(
  rowsToExport: FlatAttendanceRow[],
  filename: string,
  config: AppConfig,
  holidays: HolidayRecord[],
  leaveRequests: LeaveRequest[] = []
): void {
  const headers = [
    "日期", "员工姓名", "来源国家", "性别", "职位", "所属区域", 
    "时薪", "基本日薪", "上班时间", "下班时间", "有效工时", "加班工时", 
    "今天上班费用", "餐补费用", "加班费", "服务费", "合计费用", "考勤状态", "备注"
  ];

  const totals = {
    validHours: 0,
    overtimeHours: 0,
    workPay: 0,
    mealAllowance: 0,
    overtimePay: 0,
    serviceFee: 0,
    totalPay: 0
  };

  const rows = rowsToExport.map(row => {
    const { emp, rec, date } = row;
    const { details, shiftPay, otPay, mealAllowance, dailyServiceFee, totalPay, typeName } = getRowMetrics(row, config, holidays, leaveRequests);
    const hasBaseWage = emp.baseMonthlyWage !== undefined && emp.baseMonthlyWage !== null && emp.baseMonthlyWage > 0;
    const hasDailyWage = emp.dailyWage !== undefined && emp.dailyWage !== null && emp.dailyWage > 0;

    const baseDailyWage = hasBaseWage 
      ? (emp.baseMonthlyWage / 30) 
      : (hasDailyWage
          ? emp.dailyWage
          : (config.standardHours * (emp.hourlyRate ?? 0))
        );

    const displayHourlyRate = hasBaseWage 
      ? (baseDailyWage / config.standardHours) 
      : (hasDailyWage 
          ? (emp.dailyWage / config.standardHours)
          : (emp.hourlyRate ?? 0)
        );

    const isFixedSalaryEmployee = hasBaseWage;

    totals.validHours += Number(details.valid || 0);
    totals.overtimeHours += Number(details.ot || 0);
    totals.workPay += isFixedSalaryEmployee ? 0 : Number(shiftPay || 0);
    totals.mealAllowance += Number(mealAllowance || 0);
    totals.overtimePay += Number(otPay || 0);
    totals.serviceFee += isFixedSalaryEmployee ? 0 : Number(dailyServiceFee || 0);
    totals.totalPay += isFixedSalaryEmployee ? 0 : Number(totalPay || 0);

    return [
      date,
      emp.name,
      COUNTRY_NAMES[emp.country] || emp.country || "-",
      emp.gender === "female" ? "女" : (emp.gender === "male" ? "男" : "-"),
      emp.role || "-",
      emp.dept || "-",
      Number(displayHourlyRate || 0).toFixed(2),
      Number(baseDailyWage || 0).toFixed(2),
      rec?.inTime || "-",
      rec?.outTime || "-",
      `${Number(details.valid || 0).toFixed(2)}h`,
      `${Number(details.ot || 0).toFixed(2)}h`,
      isFixedSalaryEmployee ? "-" : Number(shiftPay || 0).toFixed(2),
      Number(mealAllowance || 0).toFixed(2),
      Number(otPay || 0).toFixed(2),
      isFixedSalaryEmployee ? "-" : Number(dailyServiceFee || 0).toFixed(2),
      isFixedSalaryEmployee ? "-" : Number(totalPay || 0).toFixed(2),
      typeName,
      rec?.note || ""
    ];
  });

  const summaryRow = [
    "合计",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    `${totals.validHours.toFixed(2)}h`,
    `${totals.overtimeHours.toFixed(2)}h`,
    totals.workPay.toFixed(2),
    totals.mealAllowance.toFixed(2),
    totals.overtimePay.toFixed(2),
    totals.serviceFee.toFixed(2),
    totals.totalPay.toFixed(2),
    "",
    ""
  ];

  const csvContent = "\ufeff" + [headers, ...rows, summaryRow]
    .map(r => r.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
