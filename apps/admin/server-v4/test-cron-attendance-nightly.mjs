import assert from "node:assert/strict";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import {
  getBangkokDateKey,
  addDaysToDateKey,
  getAttendanceCronDates,
  isAuthorizedCronRequest,
  runDailyAttendanceMaintenance
} from "./cron-attendance.js";

dotenv.config();
dotenv.config({ path: "apps/admin/.env" });

console.log("=== 1. 测试时区与日期计算 ===");
const cronDates = getAttendanceCronDates();
console.log("当前业务时区日期 (todayDate):", cronDates.todayDate);
console.log("昨日结算日期 (previousDate):", cronDates.previousDate);

assert.match(cronDates.todayDate, /^\d{4}-\d{2}-\d{2}$/);
assert.match(cronDates.previousDate, /^\d{4}-\d{2}-\d{2}$/);
assert.equal(addDaysToDateKey("2026-09-20", -1), "2026-09-19");
assert.equal(addDaysToDateKey("2026-03-01", -1), "2026-02-28");
console.log("时区与日期工具测试通过 ✓");

console.log("\n=== 2. 测试定时任务安全鉴权 ===");
const secret = "test-secret-12345";
assert.equal(isAuthorizedCronRequest({ headers: { authorization: "Bearer test-secret-12345" } }, secret), true);
assert.equal(isAuthorizedCronRequest({ headers: { "x-cron-secret": "test-secret-12345" } }, secret), true);
assert.equal(isAuthorizedCronRequest({ headers: { authorization: "Bearer wrong-secret" } }, secret), false);
assert.equal(isAuthorizedCronRequest({ headers: {} }, secret), false);
console.log("Cron 鉴权拦截测试通过 ✓");

console.log("\n=== 3. 运行端到端考勤日结调度测试 ===");
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn("未检测到 SUPABASE 凭证，跳过数据库直连测试");
  process.exit(0);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const result = await runDailyAttendanceMaintenance({
  supabase,
  targetDate: cronDates.previousDate
});

console.log("考勤日结执行结果:", JSON.stringify(result, null, 2));
assert.equal(result.service, "admin-v4-cron");
assert.equal(result.job, "attendance-nightly");
assert.equal(result.ok, true);
console.log("端到端考勤日结服务测试 100% 通过 ✓");
