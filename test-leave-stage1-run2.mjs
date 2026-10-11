import http from "node:http";
import assert from "node:assert/strict";
import fs from "node:fs";

const ADMIN_URL_PREFIX = "http://127.0.0.1:8789/api/v4/admin";
const MOBILE_URL_PREFIX = "http://127.0.0.1:8789/api/v4/mobile";
const HEALTH_URL = "http://127.0.0.1:8789/api/v4/health";

const envContent = fs.readFileSync("apps/admin/.env", "utf-8");
const SUPABASE_SERVICE_ROLE_KEY = envContent.split("\n").find(line => line.startsWith("SUPABASE_SERVICE_ROLE_KEY="))?.split("=")[1]?.trim();

import { signToken } from "./apps/admin/server/auth-v4.js";

const ADMIN_TOKEN = signToken({
  stage: "authenticated",
  userId: "867b9218-a231-4b8c-ae2b-23f922e5ee6f",
  accountId: "867b9218-a231-4b8c-ae2b-23f922e5ee6f",
  ownerUserId: "60af4e3c-2890-42f0-89f6-e0bcae3e43e0",
  adminOwnerUserId: "60af4e3c-2890-42f0-89f6-e0bcae3e43e0",
  account: "admin@wmshr.com",
  countryCode: "TH",
  permissions: ["*"]
}, 86400000, SUPABASE_SERVICE_ROLE_KEY);

const ADMIN_HEADERS = {
  "Content-Type": "application/json",
  "X-User-Email": "admin@wmshr.com",
  "Authorization": `Bearer ${ADMIN_TOKEN}`
};

const LOG = (msg) => console.log(`[Leave-Stage1] ${msg}`);
const ERROR = (msg) => console.error(`[Leave-Stage1] ERROR: ${msg}`);

async function request(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const reqOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || "GET",
      headers: options.headers || {}
    };

    const req = http.request(reqOptions, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        try {
          if (!data) return resolve({ status: res.statusCode, body: null });
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on("error", (e) => reject(e));
    if (options.body) req.write(options.body);
    req.end();
  });
}

async function getMobileToken(account, password) {
  const res = await request(`${MOBILE_URL_PREFIX}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ account, password })
  });
  if (res.status !== 200) throw new Error(`Mobile login failed for ${account}: ${JSON.stringify(res.body)}`);
  return res.body.data.token;
}

async function runTests() {
  LOG("Starting Leave Data Flow Test (Stage 1)...");
  const testEmpName = "L_TEST_" + Math.floor(Math.random() * 100000);
  const tempEmpData = {
    employeeNo: testEmpName,
    username: testEmpName,
    name: "Leave Tester",
    phone: "13800000000",
    password: "Aa123456",
    status: "active",
    dept: "Test",
    salaryType: "daily",
    dailyWage: 200,
    joinDate: new Date().toISOString().split("T")[0]
  };

  const createEmp = await request(`${ADMIN_URL_PREFIX}/employees`, {
    method: "POST",
    headers: ADMIN_HEADERS,
    body: JSON.stringify(tempEmpData)
  });
  
  let targetEmpId = createEmp.body?.employee?.id || createEmp.body?.data?.id || createEmp.body?.id;
  LOG(`✅ Temp employee created: ${targetEmpId}`);

  const mobileToken = await getMobileToken(testEmpName, "Aa123456");
  const MOBILE_HEADERS = { "Content-Type": "application/json", "Authorization": `Bearer ${mobileToken}` };

  LOG("\n--- Scenario 1: Mobile Request -> Admin Approve -> Cascade ---");
  const today = new Date().toISOString().split("T")[0];
  const mobileReqRes = await request(`${MOBILE_URL_PREFIX}/attendance/leave/request`, {
    method: "POST", headers: MOBILE_HEADERS,
    body: JSON.stringify({ type: "personal", startDate: today, endDate: today, reason: "Mobile test leave" })
  });
  const mobileLeaveId = mobileReqRes.body.data.id;
  LOG(`✅ Mobile leave request created: ${mobileLeaveId}`);

  await request(`${ADMIN_URL_PREFIX}/leave-requests/${mobileLeaveId}/status`, {
    method: "PATCH", headers: ADMIN_HEADERS, body: JSON.stringify({ status: "approved" })
  });
  LOG("✅ Admin approved leave request.");

  const attRes1 = await request(`${ADMIN_URL_PREFIX}/attendance-records?date=${today}&employee_id=${targetEmpId}`, { headers: ADMIN_HEADERS });
  const attRes1Body = attRes1.body;
  assert.ok(Array.isArray(attRes1Body) && attRes1Body.length > 0, "Attendance record not generated");
  LOG(`✅ Cascaded attendance record verified (Type: ${attRes1Body[0].type})`);

  LOG("\n--- Scenario 2: Admin Direct Create -> Cascade ---");
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];
  const adminCreateRes = await request(`${ADMIN_URL_PREFIX}/leave-requests`, {
    method: "POST", headers: ADMIN_HEADERS,
    body: JSON.stringify({ empId: targetEmpId, type: "sick", startDate: tomorrow, endDate: tomorrow, reason: "Admin created sick leave", status: "approved" })
  });
  const adminLeaveId = adminCreateRes.body.id || adminCreateRes.body.data?.id;
  LOG(`✅ Admin leave request created directly: ${adminLeaveId}`);

  const attRes2 = await request(`${ADMIN_URL_PREFIX}/attendance-records?date=${tomorrow}&employee_id=${targetEmpId}`, { headers: ADMIN_HEADERS });
  const attRes2Body = attRes2.body;
  assert.ok(Array.isArray(attRes2Body) && attRes2Body.length > 0, "Attendance record for admin-created leave not generated");
  LOG(`✅ Cascaded attendance record verified (Type: ${attRes2Body[0].type})`);

  LOG("\n--- Scenario 3: Admin Delete -> Rollback Cascade ---");
  await request(`${ADMIN_URL_PREFIX}/leave-requests/${mobileLeaveId}`, { method: "DELETE", headers: ADMIN_HEADERS });
  LOG("✅ Admin deleted mobile leave request.");

  const attRes3 = await request(`${ADMIN_URL_PREFIX}/attendance-records?date=${today}&employee_id=${targetEmpId}`, { headers: ADMIN_HEADERS });
  const attRes3Body = attRes3.body;
  const isRolledBack = !Array.isArray(attRes3Body) || attRes3Body.length === 0 || (attRes3Body[0] && attRes3Body[0].type !== "leave");
  assert.ok(isRolledBack, "Attendance record not rolled back");
  LOG("✅ Cascaded attendance record rolled back successfully.");

  LOG("\n--- Scenario 4: Payroll Calculation Impact ---");
  await request(`${ADMIN_URL_PREFIX}/attendance-calculations/recalculate`, {
    method: "POST", headers: ADMIN_HEADERS, body: JSON.stringify({ employee_id: targetEmpId, date: tomorrow })
  });
  
  const calcGetRes = await request(`${ADMIN_URL_PREFIX}/attendance-calculations?employee_id=${targetEmpId}`, { headers: ADMIN_HEADERS });
  const calcBody = calcGetRes.body?.rows || calcGetRes.body?.data || calcGetRes.body;
  assert.ok(Array.isArray(calcBody) && calcBody.length > 0, "No calculation found");
  const calcRow = calcBody.find(r => r.date === tomorrow) || calcBody[0];
  assert.equal(calcRow.status, "sick_leave", "Calculation status should be sick_leave");
  assert.equal(Number(calcRow.mealAllowance) || 0, 0, "Meal allowance should be 0 during sick_leave");
  LOG(`✅ Payroll deduction linked successfully (Meal: 0, Status: ${calcRow.status}).`);

  LOG("\n--- Cleanup ---");
  await request(`${ADMIN_URL_PREFIX}/leave-requests/${adminLeaveId}`, { method: "DELETE", headers: ADMIN_HEADERS });
  await request(`${ADMIN_URL_PREFIX}/employees/${targetEmpId}`, { method: "DELETE", headers: ADMIN_HEADERS });
  LOG("✅ Cleanup done.");

  LOG("\n🎉 [Phase 1: Leave Data Flow] All tests passed successfully!");
}

runTests().catch(err => {
  ERROR(err.message);
  console.error(err.stack);
  process.exit(1);
});
