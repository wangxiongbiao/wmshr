import assert from "node:assert/strict";
import express from "express";
import { createClient } from "@supabase/supabase-js";
import { createAttendanceRouter } from "./attendance.js";

const SUPABASE_URL = "https://ptsmigtxbtruohvchskf.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB0c21pZ3R4YnRydW9odmNoc2tmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDExOTY2MywiZXhwIjoyMDk5Njk1NjYzfQ.x2WRKuOEoNUg4lob1J1iFMflgMjLYphf63aS2FoDXWw";
const OWNER_USER_ID = "14f3a54f-410f-4dfd-ae11-6adb3c956b45";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const app = express();
app.use(express.json());

app.use((req, res, next) => {
  req.authUser = {
    id: OWNER_USER_ID,
    adminOwnerUserId: OWNER_USER_ID,
    email: "smartbillpro@gmail.com",
    role: "超级管理员",
    permissions: ["*"],
    allowedWarehouses: ["*"],
    adminV4CountryCode: req.query.warehouse_code || "TH"
  };
  next();
});

const router = createAttendanceRouter({ express, supabase });
app.use("/api/v4/admin", router);

const server = app.listen(0, async () => {
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api/v4/admin`;

  try {
    console.log("Testing GET /attendance-records?warehouse_code=TH...");
    const resTh = await fetch(`${baseUrl}/attendance-records?warehouse_code=TH`);
    assert.equal(resTh.status, 200);
    const dataTh = await resTh.json();
    assert.equal(dataTh.length, 703, `Expected 703 records in TH, got ${dataTh.length}`);
    console.log(`✓ TH attendance-records returned ${dataTh.length} records.`);

    console.log("Testing GET /attendance-records?warehouse_code=MM...");
    const resMm = await fetch(`${baseUrl}/attendance-records?warehouse_code=MM`);
    assert.equal(resMm.status, 200);
    const dataMm = await resMm.json();
    assert.equal(dataMm.length, 0, `Expected 0 records in MM, got ${dataMm.length}`);
    console.log(`✓ MM attendance-records returned ${dataMm.length} records (clean).`);

    console.log("Testing GET /leave-requests...");
    const resLeaves = await fetch(`${baseUrl}/leave-requests`);
    assert.equal(resLeaves.status, 200);
    const dataLeaves = await resLeaves.json();
    assert.equal(dataLeaves.length, 106, `Expected 106 leaves, got ${dataLeaves.length}`);
    console.log(`✓ leave-requests returned ${dataLeaves.length} records.`);

    console.log("Testing GET /attendance-calculations?month=2026-06&warehouse_code=TH...");
    const resCalc = await fetch(`${baseUrl}/attendance-calculations?month=2026-06&warehouse_code=TH`);
    assert.equal(resCalc.status, 200);
    const dataCalc = await resCalc.json();
    assert.ok(Array.isArray(dataCalc.rows) && dataCalc.rows.length > 0, "Expected calculation rows");
    console.log(`✓ attendance-calculations returned ${dataCalc.rows.length} rows for TH 2026-06.`);

    console.log("ALL API ROUTE INTEGRATION CHECKS PASSED!");
  } finally {
    server.close();
  }
});
