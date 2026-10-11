import { Employee, AttendanceRecord, AppConfig, HolidayRecord, ExpenseRecord } from "../types";
import { 
  calcAttendanceDetails, 
  calcOvertimePay, 
  calcDailyBasePay, 
  getEmployeeTaxRate, 
  formatCurrency, 
  getNowDateTimeStr 
} from "../../../lib/utils";

interface ComputeSalaryOptions {
  employees: Employee[];
  attendance: AttendanceRecord[];
  config?: AppConfig;
  holidays?: HolidayRecord[];
  monthsToCompute: string[];
  payouts: Record<string, boolean>;
  signatures: Record<string, string>;
}

export function computeSalaryExpenseRecords({
  employees,
  attendance,
  config,
  holidays = [],
  monthsToCompute,
  payouts,
  signatures
}: ComputeSalaryOptions): ExpenseRecord[] {
  if (!employees || employees.length === 0) return [];

  const records: ExpenseRecord[] = [];

  monthsToCompute.forEach(targetMonth => {
    if (!targetMonth || targetMonth === "all") return;
    const filteredAtt = attendance.filter(r => r.date && r.date.startsWith(targetMonth));

    employees.forEach(emp => {
      if (emp.joinDate && emp.joinDate.slice(0, 7) > targetMonth) return;
      const empAtt = filteredAtt.filter(r => r.empId === emp.id);
      const isResigned = (emp.status as any) === "resigned" || emp.status === "离职";
      if (isResigned && empAtt.length === 0) return;

      let valid = 0;
      let ot = 0;
      let otPay = 0;
      let basePay = 0;
      let workingDays = 0;
      let otCount = 0;
      let mealAllowance = 0;

      empAtt.forEach(rec => {
        const d = calcAttendanceDetails(rec, config);
        valid += d.valid;
        ot += d.ot;
        otPay += calcOvertimePay(emp, rec.date, d.ot, config, holidays).amount;

        const isAbsentOrLeave = emp.status === "休假" || rec.type === "absent" || rec.type === "leave";
        if (!isAbsentOrLeave) {
          workingDays += 1;
          mealAllowance += Number(emp.mealAllowanceDaily || 0);

          const normalHours = Math.max(0, d.valid - d.ot);
          basePay += calcDailyBasePay(emp, normalHours, config);
        }
      });

      const bonus = workingDays > 0 ? Number(emp.attendanceBonus || 0) : 0;
      const ssSec = workingDays > 0 ? Number(emp.socialSecurity || 0) : 0;
      const gross = Number(basePay || 0) + Number(otPay || 0) + bonus + Number(mealAllowance || 0);
      const empTaxRate = getEmployeeTaxRate(emp, config);
      const tax = (Number(basePay || 0) + Number(otPay || 0) + bonus) * empTaxRate;
      const net = Math.max(0, gross - tax - ssSec);

      const payoutKey = `${emp.id}_${targetMonth}`;
      const isPaid = !!payouts[payoutKey];
      const sig = signatures[payoutKey];

      const salaryTypeLabel = emp.baseMonthlyWage && emp.baseMonthlyWage > 0
        ? "固定月薪"
        : (emp.dailyWage && emp.dailyWage > 0 ? "固定日薪" : "计时工时");

      const paymentMethod = emp.bankCardNumber ? "银行转账" : "现金";

      records.push({
        id: `salary-${emp.id}-${targetMonth}`,
        name: `${targetMonth} 员工 ${emp.name} 工资条`,
        type: salaryTypeLabel,
        paymentMethod,
        amount: Math.round(net),
        currency: emp.currency || config?.currency || "CNY",
        payerId: emp.id,
        payerName: `${emp.name} (${emp.employeeNo || emp.id})`,
        paymentTime: `${targetMonth}-28`,
        status: isPaid ? "approved" : "pending",
        approvedBy: isPaid ? "财务薪资部 · Admin" : undefined,
        approvedTime: isPaid ? `${targetMonth}-28 17:00` : undefined,
        approvalNote: isPaid ? "已核准薪资并发放电子工资单" : undefined,
        purpose: "payout",
        targetApproverName: "财务部主管",
        note: `出勤${workingDays}天，工时${valid.toFixed(1)}h(加班${ot.toFixed(1)}h)，基本工资${Math.round(basePay)}，加班费${Math.round(otPay)}，实发${Math.round(net)}`,
        receiptName: sig ? `员工电子签名_${emp.name}.png` : undefined,
        receiptUrl: sig || undefined,
        salaryDetail: {
          emp,
          valid,
          ot,
          basePay,
          otPay,
          mealAllowance,
          bonus,
          ssSec,
          tax,
          gross,
          net,
          workingDays,
          otCount,
          isPaid,
          month: targetMonth,
          signature: sig
        }
      });
    });
  });

  return records;
}

export function createPayslipNotification(
  empId: number,
  monthStr: string,
  netAmount: number,
  curr: string,
  empName: string
): void {
  try {
    const savedSops = localStorage.getItem("wms_sop_documents");
    let currentSops: Array<{ id: string; [key: string]: unknown }> = [];
    if (savedSops) {
      try {
        currentSops = JSON.parse(savedSops);
      } catch {
        // ignore parse error
      }
    }

    const parts = monthStr.split("-");
    const monthNum = parts.length >= 2 ? parseInt(parts[1], 10) : 7;
    const title = `${monthNum}月电子工资条已生成`;
    const formattedAmt = formatCurrency(netAmount, (curr || "CNY") as any);
    const content = `尊敬的 <b>${empName}</b> (工号: ${empId})，您 <b>${monthStr}</b> 的电子薪资单已核准发放。本月应发净薪资为 <b>${formattedAmt}</b>。`;

    const dupId = `sop-payslip-${empId}-${monthStr}`;
    const filtered = currentSops.filter(s => s.id !== dupId);

    const newNotif = {
      id: dupId,
      title,
      content,
      images: [],
      attachments: [],
      targetType: "specific",
      targetEmployeeIds: [empId],
      createdAt: getNowDateTimeStr(),
      creator: "财务薪资部 · Admin",
      status: "published",
      reads: {},
      category: "training",
      docType: "notification"
    };

    localStorage.setItem("wms_sop_documents", JSON.stringify([newNotif, ...filtered]));
    window.dispatchEvent(new Event("storage"));
  } catch (e) {
    console.error("Failed to create payslip notification", e);
  }
}

export function createRecallNotification(
  empId: number,
  monthStr: string,
  empName: string
): void {
  try {
    const savedSops = localStorage.getItem("wms_sop_documents");
    let currentSops: Array<{ id: string; [key: string]: unknown }> = [];
    if (savedSops) {
      try {
        currentSops = JSON.parse(savedSops);
      } catch {
        // ignore parse error
      }
    }

    const originalNotifId = `sop-payslip-${empId}-${monthStr}`;
    const recallNotifId = `sop-payslip-recall-${empId}-${monthStr}`;
    const filtered = currentSops.filter(s => s.id !== originalNotifId && s.id !== recallNotifId);

    const parts = monthStr.split("-");
    const monthNum = parts.length >= 2 ? parseInt(parts[1], 10) : 7;

    const recallNotif = {
      id: recallNotifId,
      title: `⚠️ ${monthNum}月电子工资条已被撤回`,
      content: `尊敬的 <b>${empName}</b> (工号: ${empId})，您 <b>${monthStr}</b> 的电子工资条已被财务部撤回重新核对。当前原工资条已失效，请您知悉。`,
      images: [],
      attachments: [],
      targetType: "specific",
      targetEmployeeIds: [empId],
      createdAt: getNowDateTimeStr(),
      creator: "财务薪资部 · Admin",
      status: "published",
      reads: {},
      category: "training",
      docType: "notification"
    };

    localStorage.setItem("wms_sop_documents", JSON.stringify([recallNotif, ...filtered]));
    window.dispatchEvent(new Event("storage"));
  } catch (e) {
    console.error("Failed to create recall notification", e);
  }
}
