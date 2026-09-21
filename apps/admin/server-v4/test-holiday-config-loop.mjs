import assert from "node:assert/strict";
import express from "express";
import { createClient } from "@supabase/supabase-js";
import { createAttendanceRouter, encodeHoliday, decodeHoliday } from "./attendance.js";

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
    adminV4CountryCode: req.query.warehouse_code || req.body?.warehouse_code || "TH"
  };
  next();
});

const router = createAttendanceRouter({ express, supabase });
app.use("/api/v4/admin", router);

const server = app.listen(0, async () => {
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api/v4/admin`;

  try {
    console.log("1. Testing GET /attendance-config?warehouse_code=TH...");
    const resGet = await fetch(`${baseUrl}/attendance-config?warehouse_code=TH`);
    assert.equal(resGet.status, 200);
    const cfg = await resGet.json();
    assert.ok(cfg.startShift, "Missing startShift");
    console.log("✓ GET /attendance-config returned:", cfg.startShift, cfg.endShift, cfg.currency);

    console.log("2. Testing PUT /holidays to save holidays to cloud...");
    const holidaysToSave = [
      { date: "2026-09-15", name: "中秋节", country: "CN" },
      { date: "2026-10-01", name: "国庆节", country: "CN" }
    ];
    const resPutHolidays = await fetch(`${baseUrl}/holidays`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ holidays: holidaysToSave, warehouse_code: "TH" })
    });
    assert.equal(resPutHolidays.status, 200);
    const savedHolidays = await resPutHolidays.json();
    assert.equal(savedHolidays.length, 2);
    assert.equal(savedHolidays[0].date, "2026-09-15");
    assert.equal(savedHolidays[0].name, "中秋节");
    console.log("✓ PUT /holidays successfully saved 2 holidays.");

    console.log("3. Testing GET /holidays?warehouse_code=TH...");
    const resGetHolidays = await fetch(`${baseUrl}/holidays?warehouse_code=TH`);
    assert.equal(resGetHolidays.status, 200);
    const fetchedHolidays = await resGetHolidays.json();
    assert.equal(fetchedHolidays.length, 2);
    assert.equal(fetchedHolidays[0].date, "2026-09-15");
    assert.equal(fetchedHolidays[0].name, "中秋节");
    console.log("✓ GET /holidays returned decoded holidays.");

    console.log("4. Testing PUT /attendance-config preserves holidays when holidayDates is omitted...");
    const resPutConfig = await fetch(`${baseUrl}/attendance-config`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        startShift: "08:30",
        endShift: "17:30",
        standardHours: 8,
        otHourlyFee: 65,
        currency: "THB",
        warehouse_code: "TH"
      })
    });
    assert.equal(resPutConfig.status, 200);
    const updatedCfg = await resPutConfig.json();
    assert.equal(updatedCfg.otHourlyFee, 65);
    assert.equal(updatedCfg.holidayDates.length, 2, "holidayDates should not be wiped out by config update");
    console.log("✓ PUT /attendance-config updated without wiping holidays.");

    console.log("5. Testing POST /attendance-config compatibility...");
    const resPostConfig = await fetch(`${baseUrl}/attendance-config`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        startShift: "08:30",
        endShift: "17:30",
        standardHours: 8,
        otHourlyFee: 50,
        currency: "THB",
        warehouse_code: "TH"
      })
    });
    assert.equal(resPostConfig.status, 200);
    const postUpdatedCfg = await resPostConfig.json();
    assert.equal(postUpdatedCfg.otHourlyFee, 50);
    console.log("✓ POST /attendance-config succeeded.");

    console.log("All holiday and config closed-loop tests passed!");
  } finally {
    server.close();
  }
});
