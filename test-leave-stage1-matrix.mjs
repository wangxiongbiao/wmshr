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

const ADMIN_EMAIL = "admin@wmshr.com";
const ADMIN_HEADERS = {
  "Content-Type": "application/json",
  "X-User-Email": ADMIN_EMAIL,
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
  if (res.status !== 200) {
    throw new Error(`Mobile login failed for ${account}: ${JSON.stringify(res.body)}`);
  }
  return res.body.data.token;
}

async function runTests() {
  LOG("Starting Leave Data Flow Test (Stage 1)...");

  const health = await request(HEALTH_URL);
  assert.equal(health.status, 200, "API is not running. Did you start the server?");
  LOG("✅ Health check passed.");
  
  const tempEmpData = {
    employeeNo: "L_TEST_003",
    username: "L_TEST_003",
    name: "Leave Tester",
    phone: "13800000000",
    password: "Aa123456",
    status: "active",
    dept: "Test",
    salaryType: "daily",
    dailyWage: 200,
    joinDate: new Date().toISOString().split("T")[0]
  };

  LOG("Creating a temporary test employee...");
  const createEmp = await request(`${ADMIN_URL_PREFIX}/employees`, {
    method: "POST",
    headers: ADMIN_HEADERS,
    body: JSON.stringify(tempEmpData)
  });
  
  let targetEmpId = null;
  if (createEmp.status === 201 || createEmp.status === 200) {
    targetEmpId = createEmp.body?.employee?.id || (createEmp.body.data && createEmp.body.data.id) || createEmp.body.id;
    LOG(`✅ Temp employee created: ${targetEmpId}`);
  } else {
    const findEmp = await request(`${ADMIN_URL_PREFIX}/employees?keyword=L_TEST_003`, { headers: ADMIN_HEADERS });
    if (findEmp.status === 200 && findEmp.body && findEmp.body.data && findEmp.body.data.length > 0) {
      targetEmpId = findEmp.body.data[0].id;
      LOG(`✅ Reusing temp employee: ${targetEmpId}`);
    } else {
      throw new Error(`Could not create or find temp employee: ${JSON.stringify(createEmp.body)}`);
    }
  }

  const mobileToken = await getMobileToken("L_TEST_003", "Aa123456");
  const MOBILE_HEADERS = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${mobileToken}`
  };

  LOG("\n--- Scenario 1: Mobile Request -> Admin Approve -> Cascade ---");
  const today = new Date().toISOString().split("T")[0];
  
  const mobileReqRes = await request(`${MOBILE_URL_PREFIX}/attendance/leave/request`, {
    method: "POST",
    headers: MOBILE_HEADERS,
    body: JSON.stringify({
      type: "事假",
      start_date: today,
      end_date: today,
      reason: "Mobile test leave"
    })
  });
  assert.equal(mobileReqRes.status, 201, `Failed to create mobile leave: ${JSON.stringify(mobileReqRes.body)}`);
  const mobileLeaveId = mobileReqRes.body.data.id;
  LOG(`✅ Mobile leave request created: ${mobileLeaveId}`);

  const approveRes = await request(`${ADMIN_URL_PREFIX}/leave-requests/${mobileLeaveId}/status`, {
    method: "PATCH",
    headers: ADMIN_HEADERS,
    body: JSON.stringify({ status: "approved" })
  });
  assert.equal(approveRes.status, 200, `Failed to approve leave: ${JSON.stringify(approveRes.body)}`);
  LOG("✅ Admin approved leave request.");

  const attRes1 = await request(`${ADMIN_URL_PREFIX}/attendance-records?date=${today}&employee_id=${targetEmpId}`, {
    headers: ADMIN_HEADERS
  });
  assert.ok(attRes1.body.data && attRes1.body.data.length > 0, "Attendance record not generated");
  const leaveAtt1 = attRes1.body.data[0];
  assert.equal(leaveAtt1.type, "leave", "Attendance type should be 'leave'");
  LOG(`✅ Cascaded attendance record verified (Type: ${leaveAtt1.type})`);


  LOG("\n--- Scenario 2: Admin Direct Create -> Cascade ---");
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];
  
  const adminCreateRes = await request(`${ADMIN_URL_PREFIX}/leave-requests`, {
    method: "POST",
    headers: ADMIN_HEADERS,
    body: JSON.stringify({
      employee_id: targetEmpId,
      type: "病假",
      start_date: tomorrow,
      end_date: tomorrow,
      reason: "Admin created sick leave",
      status: "approved"
    })
  });
  assert.equal(adminCreateRes.status, 201, `Failed to admin create leave: ${JSON.stringify(adminCreateRes.body)}`);
  const adminLeaveId = adminCreateRes.body.data.id;
  LOG(`✅ Admin leave request created directly: ${adminLeaveId}`);

  const attRes2 = await request(`${ADMIN_URL_PREFIX}/attendance-records?date=${tomorrow}&employee_id=${targetEmpId}`, {
    headers: ADMIN_HEADERS
  });
  assert.ok(attRes2.body.data && attRes2.body.data.length > 0, "Attendance record for admin-created leave not generated");
  const leaveAtt2 = attRes2.body.data[0];
  assert.equal(leaveAtt2.type, "sick_leave", "Attendance type should be 'sick_leave'");
  LOG(`✅ Cascaded attendance record verified (Type: ${leaveAtt2.type})`);


  LOG("\n--- Scenario 3: Admin Delete -> Rollback Cascade ---");
  
  const deleteRes = await request(`${ADMIN_URL_PREFIX}/leave-requests/${mobileLeaveId}`, {
    method: "DELETE",
    headers: ADMIN_HEADERS
  });
  assert.equal(deleteRes.status, 200, `Failed to delete leave request: ${JSON.stringify(deleteRes.body)}`);
  LOG("✅ Admin deleted mobile leave request.");

  const attRes3 = await request(`${ADMIN_URL_PREFIX}/attendance-records?date=${today}&employee_id=${targetEmpId}`, {
    headers: ADMIN_HEADERS
  });
  const isRolledBack = !attRes3.body.data || attRes3.body.data.length === 0 || (attRes3.body.data[0] && attRes3.body.data[0].type !== "leave");
  assert.ok(isRolledBack, "Attendance record not rolled back");
  LOG("✅ Cascaded attendance record rolled back successfully.");


  LOG("\n--- Scenario 4: Payroll Calculation Impact ---");
  const calcRes = await request(`${ADMIN_URL_PREFIX}/attendance-calculations/recalculate`, {
    method: "POST",
    headers: ADMIN_HEADERS,
    body: JSON.stringify({ employee_id: targetEmpId, date: tomorrow })
  });
  assert.equal(calcRes.status, 200, `Failed to recalculate: ${JSON.stringify(calcRes.body)}`);
  
  const calcGetRes = await request(`${ADMIN_URL_PREFIX}/attendance-calculations?date=${tomorrow}&employee_id=${targetEmpId}`, {
    headers: ADMIN_HEADERS
  });
  assert.ok(calcGetRes.body.data && calcGetRes.body.data.length > 0, "No calculation found");
  const calcRow = calcGetRes.body.data[0];
  
  assert.equal(calcRow.status, "sick_leave", "Calculation status should be sick_leave");
  assert.equal(Number(calcRow.meal_allowance) || 0, 0, "Meal allowance should be 0 during sick_leave");
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
