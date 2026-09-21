import assert from "node:assert/strict";
import express from "express";
import { createAttendanceRouter } from "./attendance.js";

console.log("1. Testing that /attendance-calculations excludes pre-join dates (nono2 bug fix)...");

const mockEmployees = [
  {
    id: 9,
    employee_no: "EMP-009",
    name: "nono2",
    warehouse_code: "KR",
    join_date: "2026-09-10",
    status: "active",
    salary_type: "fixed",
    fixed_salary: 30000,
    hourly_rate: null,
    daily_wage: 1000
  },
  {
    id: 10,
    employee_no: "EMP-010",
    name: "worker1",
    warehouse_code: "KR",
    join_date: "2026-09-01",
    status: "active",
    salary_type: "fixed",
    fixed_salary: 30000,
    hourly_rate: null,
    daily_wage: 1000
  }
];

const mockRecords = [
  // worker1 has a record on 2026-09-09
  {
    id: 101,
    employee_id: 10,
    warehouse_code: "KR",
    date: "2026-09-09",
    in_time: "08:30",
    out_time: "17:30",
    type: "normal"
  },
  // nono2 has a record on 2026-09-10
  {
    id: 15,
    employee_id: 9,
    warehouse_code: "KR",
    date: "2026-09-10",
    in_time: "08:30",
    out_time: "17:30",
    type: "normal"
  }
];

function createChain(resolveValue) {
  const obj = {
    eq: () => obj,
    neq: () => obj,
    gte: () => obj,
    lte: () => obj,
    order: () => Promise.resolve({ data: resolveValue, error: null }),
    maybeSingle: () => Promise.resolve({ data: resolveValue, error: null }),
    then: (resolve, reject) => Promise.resolve({ data: resolveValue, error: null }).then(resolve, reject)
  };
  return obj;
}

const mockSupabase = {
  from: (table) => {
    if (table === "workspace_attendance_config") {
      return {
        select: () => createChain({
          warehouse_code: "KR",
          start_shift: "08:30",
          end_shift: "17:30",
          standard_hours: 8
        })
      };
    }
    if (table === "workspace_employees") {
      return {
        select: () => createChain(mockEmployees)
      };
    }
    if (table === "workspace_attendance_records") {
      return {
        select: () => createChain(mockRecords)
      };
    }
    if (table === "workspace_attendance_calculation_results") {
      return {
        select: () => createChain([])
      };
    }
    return {
      select: () => createChain(null)
    };
  }
};

const app = express();
app.use((req, res, next) => {
  req.authUser = {
    id: "user-1",
    role: "超级管理员",
    permissions: ["*"],
    warehouse_code: "KR",
    country_code: "KR",
    countryCode: "KR", allowedWarehouses: ["*"]
  };
  next();
});

const router = createAttendanceRouter({ express, supabase: mockSupabase });
app.use(router);

let capturedJson = null;
let capturedStatus = 200;

await new Promise((resolve) => {
  const req = {
    method: "GET",
    url: "/attendance-calculations?month=2026-09&warehouse_code=KR",
    query: { month: "2026-09", warehouse_code: "KR" }
  };
  const res = {
    statusCode: 200,
    setHeader() {},
    status(c) { capturedStatus = c; return this; },
    json(data) {
      capturedJson = data;
      resolve();
      return this;
    }
  };
  app.handle(req, res, (err) => {
    if (err) console.error("Router error:", err);
    resolve();
  });
});

assert.equal(capturedStatus, 200, `Expected status 200, got ${capturedStatus}`);
assert.ok(capturedJson && Array.isArray(capturedJson.rows), "Expected calculation rows");

// 1. Verify nono2 (join_date: 2026-09-10) DOES NOT have an absent row on 2026-09-09
const nono2Sep09Row = capturedJson.rows.find(r => r.emp.id === 9 && r.date === "2026-09-09");
assert.equal(nono2Sep09Row, undefined, "nono2 MUST NOT have an attendance row for 2026-09-09 prior to join_date 2026-09-10");

// 2. Verify nono2 DOES have a row on 2026-09-10
const nono2Sep10Row = capturedJson.rows.find(r => r.emp.id === 9 && r.date === "2026-09-10");
assert.ok(nono2Sep10Row, "nono2 should have an attendance row on 2026-09-10");
assert.equal(nono2Sep10Row.rec?.id, "15");

// 3. Verify worker1 (join_date: 2026-09-01) DOES have a row on 2026-09-09
const worker1Sep09Row = capturedJson.rows.find(r => r.emp.id === 10 && r.date === "2026-09-09");
assert.ok(worker1Sep09Row, "worker1 should have an attendance row on 2026-09-09");
assert.equal(worker1Sep09Row.rec?.id, "101");

console.log("Pre-join lifecycle boundary verified: nono2 phantom row on 2026-09-09 correctly eliminated!");
console.log("All lifecycle & echo tests passed!");
