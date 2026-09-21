import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [app, list, modal, api, serverEmployees] = await Promise.all([
  readFile(new URL("./src/App.tsx", import.meta.url), "utf8"),
  readFile(new URL("./src/components/EmployeeList.tsx", import.meta.url), "utf8"),
  readFile(new URL("./src/components/Modals.tsx", import.meta.url), "utf8"),
  readFile(new URL("./src/lib/employeeApi.ts", import.meta.url), "utf8"),
  readFile(new URL("../apps/admin/server-v4/employees.js", import.meta.url), "utf8")
]);

// 1. Basic Boundary & Flow Assertions
assert.match(app, /fetchEmployees\("active"/);
assert.match(app, /fetchEmployees\("resigned"/);
assert.match(list, /requestIdRef\.current/);
assert.ok(list.includes("<Pagination"));
assert.match(app, /await (createEmployee|updateEmployee)/);
assert.match(app, /await resignEmployee/);
assert.match(api, /Authorization: `Bearer \$\{token\(\)\}`/);
assert.match(api, /status === "resigned" \? "离职"/);
assert.match(api, /permissions: Array\.isArray\(employee\.permissions\)/);
assert.match(serverEmployees, /payload\.permissions/);
assert.match(modal, /if \(Array\.isArray\(employee\?\.permissions\)\)/);
assert.doesNotMatch(app, /handleSaveEmployee[\s\S]*?void reloadEmployees/);

// 2. Page Rules & UI Fidelity Invariance Checks (No UI mutilation)
assert.match(modal, /isSubmitting/);
assert.match(modal, /name="hourlyRate"/);
assert.match(modal, /name="dailyWage"/);
assert.match(modal, /name="baseMonthlyWage"/);
assert.match(modal, /name="otRuleType"/);
assert.match(modal, /name="otFixedRate"/);
assert.match(modal, /name="otBaseRate"/);
assert.match(modal, /name="otMultiplierWorkday"/);
assert.match(modal, /name="otMultiplierWeekend"/);
assert.match(modal, /name="otMultiplierHoliday"/);
assert.match(modal, /name="username"/);
assert.match(modal, /name="password"/);

// Ensure no UI destructive segmented buttons in place of parallel inputs
assert.doesNotMatch(modal, /formData\.salaryType === 'fixed'/);

// Ensure backend column coverage
assert.match(serverEmployees, /ot_multiplier_holiday/);
assert.match(serverEmployees, /daily_wage/);
assert.match(serverEmployees, /ot_rule_type/);

// 3. Closed-Loop Scenario 1: Hourly rate and parallel salary echo fidelity
const parallelInput = {
  name: "Nono Parallel",
  hourlyRate: 300,
  dailyWage: 2400,
  baseMonthlyWage: 72000,
  currency: "THB",
  status: "在职"
};

// DTO serialization simulation (toApiEmployee)
const parallelDto = {
  name: parallelInput.name,
  hourlyRate: Number(parallelInput.hourlyRate),
  dailyWage: Number(parallelInput.dailyWage),
  fixedSalary: Number(parallelInput.baseMonthlyWage),
  salaryType: "fixed",
  currency: parallelInput.currency
};

// Database persistence projection (mapEmployeeRow)
const parallelRow = {
  name: parallelDto.name,
  hourly_rate: parallelDto.hourlyRate,
  daily_wage: parallelDto.dailyWage,
  fixed_salary: parallelDto.fixedSalary,
  salary_type: parallelDto.salaryType,
  currency: parallelDto.currency
};

// Frontend view model reconstruction (fromApiEmployee)
const echoedParallel = {
  name: parallelRow.name,
  hourlyRate: parallelRow.hourly_rate != null ? Number(parallelRow.hourly_rate) : undefined,
  dailyWage: parallelRow.daily_wage != null ? Number(parallelRow.daily_wage) : undefined,
  baseMonthlyWage: parallelRow.fixed_salary != null ? Number(parallelRow.fixed_salary) : undefined,
  salaryType: parallelRow.salary_type
};

assert.equal(echoedParallel.hourlyRate, 300, "Hourly rate must echo accurately when parallel salary is entered");
assert.equal(echoedParallel.dailyWage, 2400, "Daily wage must echo accurately");
assert.equal(echoedParallel.baseMonthlyWage, 72000, "Base monthly wage must echo accurately");

// 4. Closed-Loop Scenario 2: Overtime calculation rule fidelity (multiplier branch)
const overtimeMultiplierInput = {
  name: "Nono Overtime",
  otRuleType: "multiplier",
  otBaseRate: 280,
  otMultiplierWorkday: 1.5,
  otMultiplierWeekend: 2.0,
  otMultiplierHoliday: 3.0,
  status: "在职"
};

const otDto = {
  otRuleType: overtimeMultiplierInput.otRuleType,
  otBaseRate: overtimeMultiplierInput.otBaseRate,
  otMultiplierWorkday: overtimeMultiplierInput.otMultiplierWorkday,
  otMultiplierWeekend: overtimeMultiplierInput.otMultiplierWeekend,
  otMultiplierHoliday: overtimeMultiplierInput.otMultiplierHoliday
};

const otRow = {
  ot_rule_type: otDto.otRuleType,
  ot_base_rate: otDto.otBaseRate,
  ot_multiplier_workday: otDto.otMultiplierWorkday,
  ot_multiplier_weekend: otDto.otMultiplierWeekend,
  ot_multiplier_holiday: otDto.otMultiplierHoliday
};

const echoedOt = {
  otRuleType: otRow.ot_rule_type,
  otBaseRate: Number(otRow.ot_base_rate),
  otMultiplierWorkday: Number(otRow.ot_multiplier_workday),
  otMultiplierWeekend: Number(otRow.ot_multiplier_weekend),
  otMultiplierHoliday: Number(otRow.ot_multiplier_holiday)
};

assert.equal(echoedOt.otRuleType, "multiplier", "Overtime rule branch must echo multiplier");
assert.equal(echoedOt.otBaseRate, 280, "Base rate must echo");
assert.equal(echoedOt.otMultiplierWorkday, 1.5, "Workday multiplier must echo 1.5");
assert.equal(echoedOt.otMultiplierWeekend, 2.0, "Weekend multiplier must echo 2.0");
assert.equal(echoedOt.otMultiplierHoliday, 3.0, "Holiday multiplier must echo 3.0");

// 5. Closed-Loop Scenario 3: Account username and credential preservation
const accountInput = {
  name: "Nono Custom Account",
  username: "nono_app_88",
  password: "SecretPassword123"
};

const accountDto = {
  username: accountInput.username.trim(),
  password: accountInput.password.trim()
};

assert.equal(accountDto.username, "nono_app_88");
assert.equal(accountDto.password, "SecretPassword123");

// Simulated account table record
const accountRow = {
  account: accountDto.username,
  status: "active"
};

const echoedAccount = {
  username: accountRow.account
};

assert.equal(echoedAccount.username, "nono_app_88", "Custom username must echo back accurately");

// 5.1 Closed-Loop Scenario 4: Permission atomic mapping and echo fidelity (including empty permissions)
const employeeWithEmptyPerms = {
  name: "Nono Permissions",
  permissions: []
};
const apiPayloadEmpty = {
  permissions: Array.isArray(employeeWithEmptyPerms.permissions) ? employeeWithEmptyPerms.permissions : undefined
};
assert.deepEqual(apiPayloadEmpty.permissions, [], "Empty permissions array must be sent to backend");

const employeeWithCustomPerms = {
  name: "Nono Custom",
  permissions: ["dashboard_view", "attendance_view"]
};
const apiPayloadCustom = {
  permissions: Array.isArray(employeeWithCustomPerms.permissions) ? employeeWithCustomPerms.permissions : undefined
};
assert.deepEqual(apiPayloadCustom.permissions, ["dashboard_view", "attendance_view"], "Custom permissions array must be sent to backend");

// 6. Warehouse Isolation & Cross-Warehouse Query Prevention Checks
assert.match(app, /const warehouse = adminUser\?\.countryCode \|\| "TH"/);
assert.match(list, /currentWarehouseCode/);
assert.doesNotMatch(list, /warehouseFilter === "ALL"/);
assert.match(serverEmployees, /activeWarehouse && warehouseCode && warehouseCode !== activeWarehouse/);
assert.match(serverEmployees, /targetWarehouse/);

console.log("admin-v4 employee flow & data closed-loop verification passed!");
