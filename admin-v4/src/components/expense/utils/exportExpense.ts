import { Employee, AttendanceRecord, AppConfig, HolidayRecord, PayrollSummary } from "../types";
import { 
  calcAttendanceDetails, 
  calcOvertimePay, 
  calcDailyBasePay, 
  getEmployeeTaxRate 
} from "../../../lib/utils";
import { exportPayrollExcel } from "../../../lib/exportPayrollExcel";

interface ExportSalaryParams {
  employees: Employee[];
  attendance: AttendanceRecord[];
  config?: AppConfig;
  holidays?: HolidayRecord[];
  monthFilter: string;
  addToast: (msg: string, kind?: "success" | "error" | "info") => void;
}

export async function exportSalaryToExcel({
  employees,
  attendance,
  config,
  holidays = [],
  monthFilter,
  addToast
}: ExportSalaryParams): Promise<void> {
  if (!config) {
    addToast("公司配置数据加载失败，无法导出工资汇总表", "error");
    return;
  }
  const targetMonth = monthFilter === "all" ? new Date().toISOString().slice(0, 7) : monthFilter;
  const filteredAttendance = attendance.filter(rec => rec.date && rec.date.startsWith(targetMonth));

  const payrollRows: PayrollSummary[] = employees.map(emp => {
    let valid = 0;
    let ot = 0;
    let otPay = 0;
    let basePay = 0;
    let workingDays = 0;
    let otCount = 0;
    let mealAllowance = 0;

    filteredAttendance.filter(r => String(r.empId) === String(emp.id)).forEach(rec => {
      const d = calcAttendanceDetails(rec, config);
      valid += d.valid;
      ot += d.ot;
      otPay += calcOvertimePay(emp, rec.date, d.ot, config, holidays).amount;

      const isAbsentOrLeave = emp.status === '休假' || (emp.status as any) === 'on_leave' || rec.type === 'absent' || rec.type === 'leave' || rec.type === 'sick_leave' || rec.type === 'rest' || rec.type === 'holiday';
      if (!isAbsentOrLeave) {
        workingDays += 1;
        mealAllowance += Number(emp.mealAllowanceDaily || 0);

        const normalHours = Math.max(0, d.valid - d.ot);
        basePay += calcDailyBasePay(emp, normalHours, config);
      }
    });

    const bonus = workingDays > 0 ? Number(emp.attendanceBonus || 0) : 0;
    const licenseVal = workingDays > 0 ? Number(emp.licenseFee || 0) : 0;
    const gross = Number(basePay || 0) + Number(otPay || 0) + bonus + Number(mealAllowance || 0) + licenseVal;

    return {
      emp,
      valid,
      ot,
      basePay,
      otPay,
      mealAllowance,
      licenseFee: licenseVal,
      gross,
      net: gross,
      workingDays,
      otCount
    };
  });

  try {
    await exportPayrollExcel({
      monthStr: targetMonth,
      payrollRows,
      config,
      companyName: "( SHUOMAX Co., LTD. )",
      approverName: "ZHANYINGLONG"
    });
    addToast(`工资列表报表 (Excel) 已成功导出 (${targetMonth})`, "success");
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "导出工资表失败";
    console.error("Export Excel error in ExpenseManager:", err);
    addToast(errorMsg, "error");
  }
}

export function exportSalaryToCsv({
  employees,
  attendance,
  config,
  holidays = [],
  monthFilter,
  addToast
}: ExportSalaryParams): void {
  if (!config) {
    addToast("公司配置数据加载失败，无法导出工资汇总表", "error");
    return;
  }
  const targetMonth = monthFilter === "all" ? new Date().toISOString().slice(0, 7) : monthFilter;
  const filteredAttendance = attendance.filter(rec => rec.date && rec.date.startsWith(targetMonth));

  const headers = [
    "Item", "ID Card", "Name", "Startwork", "position", "Salary", "Incentive", 
    "License fee", "Allowances", "OT", "Total Incomes", "SSF", "Tax", 
    "Other Expense", "Leave without Pay", "Total Expenses", "Net Income", "Bank Account"
  ];

  const formatDateLabel = (dateStr?: string) => {
    if (!dateStr) return "";
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parseInt(parts[2], 10)}/${parseInt(parts[1], 10)}/${parts[0]}`;
    }
    return dateStr;
  };

  let totalSalary = 0;
  let totalIncentive = 0;
  let totalLicenseFee = 0;
  let totalAllowances = 0;
  let totalOT = 0;
  let totalIncomesAll = 0;
  let totalSSF = 0;
  let totalTax = 0;
  let totalOtherExpense = 0;
  let totalLeaveWithoutPay = 0;
  let totalExpensesAll = 0;
  let totalNetIncome = 0;

  const rows = employees.map((emp, idx) => {
    let valid = 0;
    let ot = 0;
    let otPay = 0;
    let basePay = 0;
    let workingDays = 0;
    let mealAllowance = 0;

    filteredAttendance.filter(r => r.empId === emp.id).forEach(rec => {
      const d = calcAttendanceDetails(rec, config);
      valid += d.valid;
      ot += d.ot;
      otPay += calcOvertimePay(emp, rec.date, d.ot, config, holidays).amount;

      const isAbsentOrLeave = emp.status === '休假' || (emp.status as any) === 'on_leave' || rec.type === 'absent' || rec.type === 'leave' || rec.type === 'sick_leave' || rec.type === 'rest' || rec.type === 'holiday';
      if (!isAbsentOrLeave) {
        workingDays += 1;
        const mealVal = emp.mealAllowanceDaily !== undefined && emp.mealAllowanceDaily !== null ? Number(emp.mealAllowanceDaily) : 0;
        mealAllowance += mealVal;

        const normalHours = Math.max(0, d.valid - d.ot);
        basePay += calcDailyBasePay(emp, normalHours, config);
      }
    });

    const incentiveVal = emp.attendanceBonus ?? 0;
    const licenseVal = workingDays > 0 ? Number(emp.licenseFee || 0) : 0;
    const allowancesVal = mealAllowance;
    const otVal = otPay;
    const totalIncomesVal = basePay + incentiveVal + licenseVal + allowancesVal + otVal;

    const ssfVal = Number(emp.socialSecurity || 0);
    const empTaxRate = getEmployeeTaxRate(emp, config);
    const taxVal = (basePay + otVal + incentiveVal) * empTaxRate;
    
    const isDispatch = emp.sourceType === '劳务派遣';
    const commRate = isDispatch ? (emp.dispatchCommissionRate ?? 0) : 0;
    const otherExpenseVal = basePay * (commRate / 100);
    const leaveWithoutPayVal = 0;
    const totalExpensesVal = ssfVal + taxVal + otherExpenseVal + leaveWithoutPayVal;

    const netIncomeVal = totalIncomesVal - totalExpensesVal;

    totalSalary += basePay;
    totalIncentive += incentiveVal;
    totalLicenseFee += licenseVal;
    totalAllowances += allowancesVal;
    totalOT += otVal;
    totalIncomesAll += totalIncomesVal;
    totalSSF += ssfVal;
    totalTax += taxVal;
    totalOtherExpense += otherExpenseVal;
    totalLeaveWithoutPay += leaveWithoutPayVal;
    totalExpensesAll += totalExpensesVal;
    totalNetIncome += netIncomeVal;

    return [
      idx + 1,
      `"${emp.idCard || ''}"`,
      `"${emp.name}"`,
      `"${formatDateLabel(emp.joinDate)}"`,
      `"${emp.role}"`,
      basePay.toFixed(2),
      incentiveVal.toFixed(2),
      licenseVal.toFixed(2),
      allowancesVal.toFixed(2),
      otVal.toFixed(2),
      totalIncomesVal.toFixed(2),
      ssfVal.toFixed(2),
      taxVal.toFixed(2),
      otherExpenseVal.toFixed(2),
      leaveWithoutPayVal.toFixed(2),
      totalExpensesVal.toFixed(2),
      netIncomeVal.toFixed(2),
      `"${emp.bankCardNumber || ''}"`
    ];
  });

  const totalRow = [
    "Total",
    "",
    "",
    "",
    "",
    totalSalary.toFixed(2),
    totalIncentive.toFixed(2),
    totalLicenseFee.toFixed(2),
    totalAllowances.toFixed(2),
    totalOT.toFixed(2),
    totalIncomesAll.toFixed(2),
    totalSSF.toFixed(2),
    totalTax.toFixed(2),
    totalOtherExpense.toFixed(2),
    totalLeaveWithoutPay.toFixed(2),
    totalExpensesAll.toFixed(2),
    totalNetIncome.toFixed(2),
    ""
  ];

  const monthParts = targetMonth.split('-');
  const year = monthParts[0];
  const month = monthParts[1] || "01";
  const companyHeader = `( SHUOMAX Co. LTD. ),,,,,,,,,,,,,,,,,`;
  const reportHeader = `Payroll Summary Report of ( ${month}月${year}年 ),,,,,,,,,,,,,,,,,`;
  const dateHeader = `Value Date : ${month}/${year},,,,,,,,,,,,,,,,,`;
  const emptyHeader = `,,,,,,,,,,,,,,,,,`;
  const categoryHeader = `,,,,,Incomes,,,,,Expense,,`;

  const csvLines = [
    companyHeader,
    reportHeader,
    dateHeader,
    emptyHeader,
    categoryHeader,
    headers.join(","),
    ...rows.map(r => r.join(",")),
    totalRow.join(","),
    emptyHeader,
    `Approved by...............ZHANYINGLONG.........................,,,,,,,,,,,,,,,,,`,
    `Date.............${new Date().getDate()}/${new Date().getMonth() + 1}/${new Date().getFullYear()}.........................,,,,,,,,,,,,,,,,,`
  ];

  const csvContent = "\uFEFF" + csvLines.join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", `Payroll_Summary_${targetMonth}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  addToast(`报销列表报表已成功导出 (${targetMonth})`, "success");
}
