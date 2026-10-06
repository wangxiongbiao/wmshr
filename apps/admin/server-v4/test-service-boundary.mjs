import assert from "node:assert/strict";
import fs from "node:fs";
import { mapEmployeeRow } from "./employees.js";

const root = new URL("../../../", import.meta.url);
const read = relative => fs.readFileSync(new URL(relative, root), "utf8");

const service = read("apps/admin/server-v4/index.js");
const identity = read("apps/admin/server-v4/identity.js");
const employees = read("apps/admin/server-v4/employees.js");
const app = read("admin-v4/src/App.tsx");
const login = read("admin-v4/src/components/Login.tsx");
const employeeApi = read("admin-v4/src/lib/employeeApi.ts");
const vite = read("admin-v4/vite.config.ts");
const vercel = read("api/v4/[...path].js");

assert.doesNotMatch(service, /apps\/admin\/server\/index\.js/);
assert.doesNotMatch(service, /from ["']\.\.\/server\/index/);
assert.match(service, /\/api\/v4\/health/);
assert.match(service, /\/api\/v4\/admin\/auth\/login/);
assert.match(service, /\/api\/v4\/admin\/employees/);
assert.match(service, /createV4IdentityService/);
assert.match(service, /createAuthV4Controller/);
assert.match(service, /ADMIN_V4_API_PORT/);
assert.match(identity, /workspace_members!workspace_members_owner_account_fkey/);
assert.match(identity, /ownerUserId,\r?\n\s*adminOwnerUserId/);
assert.match(identity, /workspace_employees/);
assert.match(employees, /employee_permission_audits/);
assert.match(employees, /workspace_employees/);
assert.match(employees, /workspace_attendance_rules/);
assert.match(employees, /workspace_salary_profiles/);
assert.doesNotMatch(employees, /\.from\(["']employees["']\)/);
assert.doesNotMatch(employees, /\.from\(["']attendance_rules["']\)/);
assert.doesNotMatch(employees, /\.from\(["']salary_profiles["']\)/);
assert.doesNotMatch(app, /\/api\/admin\//);
assert.doesNotMatch(login, /\/api\/admin\//);
assert.doesNotMatch(employeeApi, /\/api\/admin\//);
assert.match(app, /\/api\/v4\//);
assert.match(login, /\/api\/v4\//);
assert.match(employeeApi, /\/api\/v4\//);
assert.match(vite, /\/api\/v4/);
assert.match(vite, /127\.0\.0\.1:8789/);
assert.match(vercel, /server-v4\/index\.js/);


const attendance = read("apps/admin/server-v4/attendance.js");
assert.match(service, /createAttendanceRouter/);
assert.match(attendance, /workspace_employees/);
assert.match(attendance, /workspace_attendance_records/);
assert.match(attendance, /workspace_attendance_calculation_results/);
assert.match(attendance, /workspace_attendance_config/);
assert.doesNotMatch(attendance, /\.from\(["']employees["']\)/);
assert.doesNotMatch(attendance, /\.from\(["']attendance_records["']\)/);
assert.doesNotMatch(attendance, /\.from\(["']attendance_calculation_results["']\)/);

// 验证员工空金额/0金额在映射层归一化为 null，防止前端被 0 填充
const emptyRowMapped = mapEmployeeRow({
  id: 101,
  employee_no: "EMP101",
  name: "Test Employee",
  hourly_rate: 0,
  fixed_salary: 0,
  daily_wage: 0,
  overtime_hourly_fee: 0,
  ot_base_rate: 0,
  attendance_bonus: 0,
  social_security: 0,
  meal_allowance: 0,
  license_fee: 0,
  service_fee_rate: 0,
  currency: "THB"
});
assert.equal(emptyRowMapped.hourlyRate, null);
assert.equal(emptyRowMapped.fixedSalary, null);
assert.equal(emptyRowMapped.dailyWage, null);
assert.equal(emptyRowMapped.overtimeHourlyFee, null);
assert.equal(emptyRowMapped.otFixedRate, null);
assert.equal(emptyRowMapped.otBaseRate, null);
assert.equal(emptyRowMapped.attendanceBonus, null);
assert.equal(emptyRowMapped.socialSecurity, null);
assert.equal(emptyRowMapped.mealAllowance, null);
assert.equal(emptyRowMapped.licenseFee, null);
assert.equal(emptyRowMapped.serviceFeeRate, null);

console.log("admin-v4 service boundary self-check passed");
