import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import assert from "assert";

console.log("Starting Salary List Payroll Linkage verification...");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const expenseManagerEntry = path.join(__dirname, "src/components/ExpenseManager.tsx");
assert(fs.existsSync(expenseManagerEntry), "ExpenseManager.tsx must exist");

// Check either monolithic ExpenseManager or refactored modular expense bundle
const expenseDir = path.join(__dirname, "src/components/expense");
let content = "";
if (fs.existsSync(expenseDir)) {
  const allExpenseFiles = [
    "index.ts",
    "ExpenseManager.tsx",
    "hooks/useExpenseList.ts",
    "components/ExpenseMainTable.tsx",
    "components/ExpenseDetailModal.tsx",
    "components/ExpenseToolbar.tsx",
    "utils/salaryCalculator.ts"
  ];
  content = allExpenseFiles
    .filter(f => fs.existsSync(path.join(expenseDir, f)))
    .map(f => fs.readFileSync(path.join(expenseDir, f), "utf-8"))
    .join("\n");
} else {
  content = fs.readFileSync(expenseManagerEntry, "utf-8");
}

// 1. Check state & localStorage synchronization with payroll module
assert(content.includes("payroll_payout_status"), "Must synchronize payroll_payout_status with localStorage");
assert(content.includes("payroll_employee_signatures"), "Must synchronize payroll_employee_signatures with localStorage");
assert(content.includes("wms_sop_documents"), "Must push/recall payslip notifications in wms_sop_documents");

// 2. Check dynamic salary computation
assert(content.includes("salaryRecords"), "Must compute salaryRecords from employees and attendance");
assert(content.includes("calcAttendanceDetails"), "Must calculate attendance details");
assert(content.includes("calcOvertimePay"), "Must calculate overtime pay");

// 3. Check merged expenses and stats
assert(content.includes("allExpenses"), "Must merge salaryRecords and manual expenses");
assert(content.includes("handleRecallApproval"), "Must support recalling approved payroll records");

// 4. Check UI fidelity
assert(content.includes("考勤薪资核算明细"), "Must render salary detail breakdown in detail modal");
assert(content.includes("清空检索"), "Must have clear button on search input");
assert(content.includes("RotateCcw"), "Must render recall action button for approved rows");

// 5. Check data protection
assert(content.includes("员工考勤工资条由系统根据出勤自动计算，无法直接删除"), "Must protect salary records from direct deletion");

// 6. Data Loop Audit: 4-state lifecycle, loading boundary, manual refresh & pagination
assert(content.includes("Loader2"), "Must include Loader2 for tbody initial loading state");
assert(content.includes("正在同步费用与工资核销数据"), "Must display dedicated in-table loading copy");
assert(content.includes("RefreshCw"), "Must include RefreshCw icon for manual refresh button");
assert(content.includes("btn-refresh-expenses"), "Must have explicit manual refresh button");
assert(content.includes("handleManualRefresh"), "Must implement handleManualRefresh handler");
assert(content.includes("Pagination"), "Must import and mount Pagination component");
assert(content.includes("pagedExpenses"), "Must slice filteredExpenses into pagedExpenses");
assert(content.includes("pageSizeOptions"), "Must provide page size options");

// 7. Logic Loop Audit: Voucher status & temporal/lifecycle bounds
assert(content.includes("有凭证") && content.includes("无凭证"), "Must clearly differentiate 有凭证 and 无凭证 badges");
assert(content.includes('isResigned && empAtt.length === 0'), "Must exclude resigned employees with 0 attendance in target month");
assert(content.includes("emp.joinDate && emp.joinDate.slice(0, 7) > targetMonth"), "Must respect joinDate temporal lifecycle bounds");

// 8. App.tsx Prop Connection
const appPath = path.join(__dirname, "src/App.tsx");
const appContent = fs.readFileSync(appPath, "utf-8");
assert(appContent.includes("loading={employeesLoading}"), "App.tsx must pass loading={employeesLoading} to ExpenseManager");
assert(appContent.includes("onRefresh={reloadEmployees}"), "App.tsx must pass onRefresh={reloadEmployees} to ExpenseManager");

// 9. Employee Optional Amounts Empty-State Check (Zero-value clean normalization)
const employeeApiPath = path.join(__dirname, "src/lib/employeeApi.ts");
const employeeApiContent = fs.readFileSync(employeeApiPath, "utf-8");
assert(employeeApiContent.includes("attendanceBonus: employee.attendanceBonus != null && Number(employee.attendanceBonus) > 0 ? Number(employee.attendanceBonus) : undefined"));
assert(employeeApiContent.includes("socialSecurity: employee.socialSecurity != null && Number(employee.socialSecurity) > 0 ? Number(employee.socialSecurity) : undefined"));
assert(employeeApiContent.includes("mealAllowanceDaily: employee.mealAllowance != null && Number(employee.mealAllowance) > 0 ? Number(employee.mealAllowance) : undefined"));
assert(employeeApiContent.includes("licenseFee: employee.licenseFee != null && Number(employee.licenseFee) > 0 ? Number(employee.licenseFee) : undefined"));

const modalsPath = fs.existsSync(path.join(__dirname, "src/components/employee/components/EmployeeModal.tsx"))
  ? path.join(__dirname, "src/components/employee/components/EmployeeModal.tsx")
  : path.join(__dirname, "src/components/Modals.tsx");
const modalsContent = fs.readFileSync(modalsPath, "utf-8");
assert(modalsContent.includes("formData.attendanceBonus !== undefined && formData.attendanceBonus !== null && Number(formData.attendanceBonus) > 0 ? formData.attendanceBonus : \"\""));
assert(modalsContent.includes("formData.socialSecurity !== undefined && formData.socialSecurity !== null && Number(formData.socialSecurity) > 0 ? formData.socialSecurity : \"\""));
assert(modalsContent.includes("formData.mealAllowanceDaily !== undefined && formData.mealAllowanceDaily !== null && Number(formData.mealAllowanceDaily) > 0 ? formData.mealAllowanceDaily : \"\""));
assert(modalsContent.includes("formData.licenseFee !== undefined && formData.licenseFee !== null && Number(formData.licenseFee) > 0 ? formData.licenseFee : \"\""));

// 10. PayrollTable.tsx Strict Verification
const payrollPath = path.join(__dirname, "src/components/PayrollTable.tsx");
assert(fs.existsSync(payrollPath), "PayrollTable.tsx must exist");
const payrollContent = fs.readFileSync(payrollPath, "utf-8");

// A. Temporal & Resigned Lifecycle bounds filter
assert(payrollContent.includes("emp.joinDate && emp.joinDate.slice(0, 7) > selectedMonth"), "PayrollTable must exclude future joinDate employees");
assert(payrollContent.includes('isResigned'), "PayrollTable must handle resigned employees");

// B. Signature persistence & data sink
assert(payrollContent.includes('localStorage.setItem("payroll_employee_signatures"'), "PayrollTable must persist employee signatures");
assert(payrollContent.includes('setEmpConfirmations'), "PayrollTable must update empConfirmations state");

// C. Dispatch commission deduct consistency
assert(payrollContent.includes('Math.max(0, gross - tax - ssSec - serviceFee)'), "PayrollTable net salary must balance by deducting serviceFee");

// D. ESC Keyboard listener
assert(payrollContent.includes('e.key === "Escape"'), "PayrollTable modals must close on Escape key");

// E. EmployeeNo search support
assert(payrollContent.includes('row.emp.employeeNo'), "PayrollTable search must match employeeNo");

// F. Table Footer totals
assert(payrollContent.includes('<tfoot'), "PayrollTable must render tfoot summary totals row");

console.log("✓ All Salary List Payroll Linkage & Data/Logic Loop Audit checks passed successfully!");
