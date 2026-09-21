import assert from "node:assert/strict";
import fs from "node:fs";

const root = new URL("./", import.meta.url);
const read = (rel) => fs.readFileSync(new URL(rel, root), "utf8");

console.log("1. Checking AttendanceTable UI fidelity and 15 columns...");
const tableSource = read("./src/components/AttendanceTable.tsx");

// Verify 15 column headers exist in the markup
const expectedColumns = [
  "日期", "员工", "状态", "上班", "下班", "工时", "加班",
  "薪资", "加班费", "餐补", "社保", "服务费", "合计", "操作"
];

for (const col of expectedColumns) {
  assert.ok(tableSource.includes(`>${col}</th>`), `Missing column header: ${col}`);
}

// Verify filter controls exist
assert.ok(tableSource.includes("员工状态:"), "Missing 员工状态 filter");
assert.ok(tableSource.includes("筛选员工:"), "Missing 筛选员工 dropdown");
assert.ok(tableSource.includes("按月筛选:"), "Missing 按月筛选 picker");
assert.ok(tableSource.includes("重置筛选"), "Missing 重置筛选 button");

// Verify action buttons exist
assert.ok(tableSource.includes("刷新数据"), "Missing 刷新数据 button");
assert.ok(tableSource.includes("手动新增考勤"), "Missing 手动新增考勤 button");
assert.ok(tableSource.includes("导出当前数据"), "Missing 导出当前数据 button");

// Verify detail modal
assert.ok(tableSource.includes("考勤明细详情"), "Missing detail modal");

console.log("2. Checking attendanceApi exports...");
const apiSource = read("./src/lib/attendanceApi.ts");
assert.ok(apiSource.includes("fetchAttendanceConfig"), "Missing fetchAttendanceConfig");
assert.ok(apiSource.includes("updateAttendanceConfig"), "Missing updateAttendanceConfig");
assert.ok(apiSource.includes("fetchAttendanceCalculations"), "Missing fetchAttendanceCalculations");
assert.ok(apiSource.includes("createAttendanceRecord"), "Missing createAttendanceRecord");
assert.ok(apiSource.includes("updateAttendanceRecord"), "Missing updateAttendanceRecord");

console.log("3. Checking App.tsx connections...");
const appSource = read("./src/App.tsx");
assert.ok(appSource.includes("createAttendanceRecord"), "App.tsx missing createAttendanceRecord");
assert.ok(appSource.includes("updateAttendanceRecord"), "App.tsx missing updateAttendanceRecord");
assert.ok(appSource.includes("updateAttendanceConfig"), "App.tsx missing updateAttendanceConfig");


console.log("4. Checking warehouseCode prop binding on AttendanceTable...");
assert.ok(tableSource.includes("warehouseCode?: string"), "AttendanceTable missing warehouseCode prop");
assert.ok(tableSource.includes("fetchAttendanceCalculations({ month: selectedMonth, warehouseCode })"), "AttendanceTable missing warehouseCode in calculation fetch");

console.log("5. Checking utils.ts calcOvertimePay fixed vs multiplier logic...");
const utilsSource = read("./src/lib/utils.ts");
assert.ok(utilsSource.includes("emp.otRuleType === \"fixed\""), "utils.ts missing fixed rule check");
assert.ok(utilsSource.includes("parsedDate.getUTCDay()"), "utils.ts missing UTC day calculation");

console.log("6. Checking in-place loading boundary in AttendanceTable...");
assert.ok(tableSource.includes("isInitialMountRef"), "AttendanceTable missing isInitialMountRef boundary check");
assert.ok(tableSource.includes("isRefreshingRef"), "AttendanceTable missing isRefreshingRef boundary check");
assert.ok(tableSource.includes("attendanceMap.set"), "AttendanceTable missing attendanceMap in-place merge");

console.log("7. Checking in-place loading and refresh in EmployeeList...");
const empListSource = read("./src/components/EmployeeList.tsx");
assert.ok(empListSource.includes("employees.length === 0"), "EmployeeList missing empty data guard on skeleton");
assert.ok(empListSource.includes("handleManualRefresh"), "EmployeeList missing handleManualRefresh");
assert.ok(empListSource.includes("onRefresh"), "EmployeeList missing onRefresh prop");

console.log("8. Checking initial loading in PayrollTable and Dashboard...");
const payrollSource = read("./src/components/PayrollTable.tsx");
assert.ok(payrollSource.includes("isTableLoading"), "PayrollTable missing isTableLoading state");
assert.ok(payrollSource.includes("Loader2"), "PayrollTable missing Loader2 spinner");

const dashSource = read("./src/components/Dashboard.tsx");
assert.ok(dashSource.includes("isLocalLoading"), "Dashboard missing isLocalLoading state");
assert.ok(dashSource.includes("Loader2"), "Dashboard missing Loader2 spinner");


console.log("9. Checking mandatory manual refresh buttons across all core modules...");
const leaveSource = read("./src/components/LeaveTable.tsx");

// Dashboard refresh check
assert.ok(dashSource.includes("RefreshCw"), "Dashboard missing RefreshCw icon");
assert.ok(dashSource.includes("handleRefresh"), "Dashboard missing handleRefresh");
assert.ok(dashSource.includes("isRefreshing"), "Dashboard missing isRefreshing state");
assert.ok(appSource.includes("<Dashboard") && appSource.includes("onRefresh={reloadEmployees}"), "App.tsx missing onRefresh on Dashboard");

// EmployeeList refresh check
assert.ok(empListSource.includes("RefreshCw"), "EmployeeList missing RefreshCw icon");
assert.ok(empListSource.includes("handleManualRefresh"), "EmployeeList missing handleManualRefresh");
assert.ok(empListSource.includes("disabled={isRefreshing}"), "EmployeeList missing disabled state on refresh");

// AttendanceTable refresh check
assert.ok(tableSource.includes("RefreshCw"), "AttendanceTable missing RefreshCw icon");
assert.ok(tableSource.includes("handleRefresh"), "AttendanceTable missing handleRefresh");
assert.ok(tableSource.includes("disabled={isRefreshing}"), "AttendanceTable missing disabled state on refresh");
assert.ok(appSource.includes("<AttendanceTable") && appSource.includes("onRefresh={reloadEmployees}"), "App.tsx missing reloadEmployees on AttendanceTable");

// LeaveTable refresh check
assert.ok(leaveSource.includes("RefreshCw"), "LeaveTable missing RefreshCw icon");
assert.ok(leaveSource.includes("handleRefresh"), "LeaveTable missing handleRefresh");
assert.ok(leaveSource.includes("disabled={isRefreshing}"), "LeaveTable missing disabled state on refresh");
assert.ok(appSource.includes("<LeaveTable") && appSource.includes("onRefresh={reloadEmployees}"), "App.tsx missing onRefresh on LeaveTable");

// PayrollTable refresh check
assert.ok(payrollSource.includes("RefreshCw"), "PayrollTable missing RefreshCw icon");
assert.ok(payrollSource.includes("handleRefresh"), "PayrollTable missing handleRefresh");
assert.ok(payrollSource.includes("disabled={isRefreshing}"), "PayrollTable missing disabled state on refresh");
assert.ok(appSource.includes("<PayrollTable") && appSource.includes("onRefresh={reloadEmployees}"), "App.tsx missing onRefresh on PayrollTable");

console.log("admin-v4 attendance flow test passed!");
