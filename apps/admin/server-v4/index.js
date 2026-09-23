import dotenv from "dotenv";
import express from "express";
import pg from "pg";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { createAuthV4Controller, verifyToken } from "../server/auth-v4.js";
import { createV4IdentityService } from "./identity.js";
import { createEmployeeRouter } from "./employees.js";
import { createAttendanceRouter } from "./attendance.js";
import { createInvoiceRouter } from "./invoices.js";
import { runDailyAttendanceMaintenance, isAuthorizedCronRequest } from "./cron-attendance.js";
import { createMobileRouter } from "./mobile.js";
import { createPayrollRouter } from "./payroll.js";
import { createExpenseRouter } from "./expenses.js";
import { createSopRouter } from "./sop.js";
import { createResourceRouter } from "./resources.js";

dotenv.config();
dotenv.config({ path: fileURLToPath(new URL("../.env", import.meta.url)), override: false });

const PORT = Number(process.env.ADMIN_V4_API_PORT || 8789);
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
const DATABASE_URL = process.env.DATABASE_URL;
const AUTH_SECRET = process.env.ADMIN_AUTH_TOKEN_SECRET || SUPABASE_SERVICE_ROLE_KEY;
const FAST_REGISTRATION_ENABLED = String(process.env.ADMIN_V4_REGISTER_FAST_PATH || "true").trim().toLowerCase() !== "false";
const CRON_SECRET = process.env.CRON_SECRET || "";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !AUTH_SECRET) {
  throw new Error("V4 service requires SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and ADMIN_AUTH_TOKEN_SECRET");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const publicAuthClient = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY || SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const directDbPool = DATABASE_URL ? new pg.Pool({
  connectionString: DATABASE_URL,
  max: 10,
  min: 2,
  idleTimeoutMillis: 300_000,
  connectionTimeoutMillis: 1_500,
  keepAlive: true,
  ssl: DATABASE_URL.includes("supabase.co") ? { rejectUnauthorized: false } : undefined
}) : null;
if (directDbPool) {
  directDbPool.on("error", (err) => {
    console.warn("[admin-v4/service] directDbPool idle error handled:", err.message);
  });
  Promise.all([
    directDbPool.query("SELECT 1"),
    directDbPool.query("SELECT 1")
  ]).catch(err => console.warn("[admin-v4/service] directDbPool warm-up", err.message));
}
const identity = createV4IdentityService({ supabase, directDbPool });
const app = express();

app.disable("x-powered-by");
app.use(express.json({ limit: "5mb" }));
app.use((req, res, next) => { console.log(`[REQ] ${req.method} ${req.originalUrl}`); next(); });
function isAllowedOrigin(origin) {
  if (!origin) return false;
  try {
    const { hostname } = new URL(origin);
    if (["localhost", "127.0.0.1"].includes(hostname)) return true;
    if (hostname.endsWith(".ts.net") || hostname.startsWith("100.")) return true;
    if (origin === "https://admin.dutylix.com" || hostname.endsWith(".dutylix.com") || hostname.endsWith(".vercel.app")) return true;
    if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true;
    if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true;
    if (/^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true;
    return false;
  } catch {
    return false;
  }
}

app.use((req, res, next) => {
  const origin = String(req.headers.origin || "");
  const allowed = isAllowedOrigin(origin);
  if (allowed) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Vary", "Origin");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
    res.header("Access-Control-Allow-Credentials", "true");
  }
  if (req.method === "OPTIONS") return res.sendStatus(allowed ? 204 : 403);
  next();
});

function validateRedirectUrl(redirectTo) {
  if (!redirectTo) return "redirectTo 不能为空";
  let url;
  try { url = new URL(String(redirectTo)); } catch { return "redirectTo 不是有效链接"; }
  if (!isAllowedOrigin(url.origin)) return "redirectTo 不在允许的后台域名范围内";
  return null;
}

function accessToken(req) {
  const value = String(req.headers.authorization || "");
  return value.startsWith("Bearer ") ? value.slice(7).trim() : "";
}

function sessionError(message, statusCode = 401) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

async function requireV4Auth(req, res, next) {
  const payload = verifyToken(accessToken(req), AUTH_SECRET);
  if (!payload || payload.stage !== "authenticated") return res.status(401).json({ error: "未登录或登录已过期" });
  try {
    const context = await identity.resolveSessionContext(payload);
    req.authUser = {
      ...context,
      adminV4CountryCode: context.countryCode || null,
      adminAuthUserId: context.adminAuthUserId,
      adminOwnerUserId: context.adminOwnerUserId
    };
    next();
  } catch (error) {
    const status = Number(error?.statusCode || 500);
    if (status >= 500) console.error("[admin-v4/service] session validation failed", error);
    res.status(status === 401 || status === 403 ? status : 500).json({ error: status >= 500 ? "管理员会话验证失败，请稍后重试" : error.message });
  }
}

const auth = createAuthV4Controller({
  supabase,
  publicAuthClient,
  resolveAdminIdentity: identity.resolveAdminIdentity,
  ensureTenantBootstrap: identity.ensureTenantBootstrap,
  bootstrapNewTenant: identity.bootstrapNewTenant,
  fastRegistrationEnabled: FAST_REGISTRATION_ENABLED,
  resolveWorkspaceAuthContext: identity.resolveWorkspaceAuthContext,
  resolveSessionContext: identity.resolveSessionContext,
  validatePasswordRedirect: validateRedirectUrl,
  authSecret: AUTH_SECRET,
  employeeTable: "workspace_employees"
});

app.get("/api/v4/health", (_req, res) => res.json({ ok: true, service: "admin-v4" }));

// --- Cron Service: 每日夜间考勤自动归档与结算 ---
const handleAttendanceNightlyCron = async (req, res) => {
  try {
    if (!isAuthorizedCronRequest(req, CRON_SECRET)) {
      return res.status(401).json({ error: "未授权的定时任务请求 (Unauthorized Cron Request)" });
    }

    const requestedDate = String(req.query.date || req.query.previousDate || "");
    const result = await runDailyAttendanceMaintenance({
      supabase,
      directDbPool,
      targetDate: /^\d{4}-\d{2}-\d{2}$/.test(requestedDate) ? requestedDate : undefined
    });
    res.json(result);
  } catch (error) {
    console.error("[admin-v4/cron] attendance-nightly error:", error);
    res.status(500).json({ error: error.message || "夜间考勤结算失败" });
  }
};

app.get("/api/cron/attendance-nightly", handleAttendanceNightlyCron);
app.post("/api/cron/attendance-nightly", handleAttendanceNightlyCron);
app.get("/api/v4/cron/attendance-nightly", handleAttendanceNightlyCron);
app.post("/api/v4/cron/attendance-nightly", handleAttendanceNightlyCron);


app.post("/api/v4/admin/auth/login", auth.handleLogin);
app.post("/api/v4/admin/auth/register", auth.handleRegister);
app.post("/api/v4/admin/auth/forgot-password", auth.handleForgotPassword);
app.post("/api/v4/admin/auth/reset-password", auth.handleResetAdminPassword);
app.post("/api/v4/admin/auth/google/complete", auth.handleGoogleComplete);
app.post("/api/v4/admin/auth/select-country", auth.handleSelectCountry);
app.post("/api/v4/admin/auth/switch-country", auth.handleSwitchCountry);
app.get("/api/v4/admin/auth/me", auth.handleMe);

app.get("/api/v4/public/google-auth-url", async (req, res) => {
  try {
    const redirectTo = String(req.query.redirectTo || "");
    const validationError = validateRedirectUrl(redirectTo);
    if (validationError) return res.status(400).json({ error: validationError });
    const { data, error } = await publicAuthClient.auth.signInWithOAuth({ provider: "google", options: { redirectTo, skipBrowserRedirect: true } });
    if (error) throw error;
    if (!data?.url) return res.status(500).json({ error: "未获取到 Google 授权地址" });
    res.json({ url: data.url });
  } catch (error) {
    console.error("[admin-v4/service] Google URL failed", error);
    res.status(500).json({ error: "生成 Google 授权地址失败" });
  }
});

// --- Mobile App Router: 移动端员工门户专有路由 (支持 /api/v4/mobile 和 /api/mobile) ---
const mobileRouter = createMobileRouter({ express, supabase, directDbPool, authSecret: AUTH_SECRET });
app.use("/api/v4/mobile", mobileRouter);
app.use("/api/mobile", mobileRouter);

// --- Admin Management Routers: 管理端路由 (/api/v4/admin 与 /api/admin) ---
const employeeRouter = createEmployeeRouter({ express, supabase, directDbPool, identity });
const attendanceRouter = createAttendanceRouter({ express, supabase });
const invoiceRouter = createInvoiceRouter({ express, directDbPool, supabase });
const payrollRouter = createPayrollRouter({ express, supabase, directDbPool, identity });
const expenseRouter = createExpenseRouter({ express, supabase, directDbPool });
const sopRouter = createSopRouter({ express, supabase, directDbPool });

app.use("/api/v4/admin", requireV4Auth);
app.post("/api/v4/admin/employees/:id/reset-password", auth.handleResetEmployeePassword);
app.use("/api/v4/admin", employeeRouter);
app.use("/api/v4/admin", attendanceRouter);
app.post("/api/v4/admin/attendance-calculations/run-daily-maintenance", handleAttendanceNightlyCron);
app.use("/api/v4/admin", invoiceRouter);
app.use("/api/v4/admin", payrollRouter);
app.use("/api/v4/admin", expenseRouter);
app.use("/api/v4/admin", sopRouter);

app.use("/api/admin", requireV4Auth);
app.post("/api/admin/employees/:id/reset-password", auth.handleResetEmployeePassword);
app.use("/api/admin", employeeRouter);
app.use("/api/admin", attendanceRouter);
app.use("/api/admin", invoiceRouter);
app.use("/api/admin", payrollRouter);
app.use("/api/admin", expenseRouter);
app.use("/api/admin", sopRouter);

// --- Flutter REST Resource & State Client: /api/v4/* 与 /api/* ---
const resourceRouter = createResourceRouter({ express, supabase, directDbPool, authSecret: AUTH_SECRET, identity });
app.use("/api/v4", resourceRouter);
app.use("/api", resourceRouter);

app.use("/api/v4", (_req, res) => res.status(404).json({ error: "V4 API 路径不存在" }));

const isDirectRun = process.argv[1] ? import.meta.url === pathToFileURL(process.argv[1]).href : false;
if (isDirectRun) {
  app.listen(PORT, "0.0.0.0", () => console.log(`wmshr-admin-v4 API running on http://0.0.0.0:${PORT}`));
}

export { app, requireV4Auth };
export default app;
