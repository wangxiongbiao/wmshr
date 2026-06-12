import crypto from "node:crypto";
import dotenv from "dotenv";
import express from "express";
import pg from "pg";
import { createClient } from "@supabase/supabase-js";
import { fileURLToPath, pathToFileURL } from "node:url";
import { DEFAULT_ATTENDANCE_CONFIG, calculateDailyAttendanceRow as calculateV2DailyAttendanceRow } from "./attendance-v2.js";

// Vercel Node Functions import this file from the repository root, while local
// admin API development runs it from apps/admin. Load both locations without
// override so Vercel dashboard env vars always win and local apps/admin/.env
// still works for root-level import checks.
dotenv.config();
dotenv.config({ path: fileURLToPath(new URL("../.env", import.meta.url)), override: false });

const PORT = Number(process.env.ADMIN_API_PORT || 8788);
const DATABASE_URL = process.env.DATABASE_URL;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
const EMPLOYEE_APP_DEFAULT_PASSWORD = "Aa123456";
const EMPLOYEE_APP_TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 30;
const EMPLOYEE_APP_TOKEN_SECRET = process.env.EMPLOYEE_APP_TOKEN_SECRET || SUPABASE_SERVICE_ROLE_KEY || SUPABASE_PUBLISHABLE_KEY || "wmshr-local-mobile-token-secret";
const MOBILE_ANDROID_RELEASE_PLATFORM = "android";
const ADMIN_AUTH_CACHE_TTL_MS = 1000 * 60 * 3;
const EMPLOYEE_LIST_CACHE_TTL_MS = 1000 * 8;
const EMPLOYEE_COUNT_CACHE_TTL_MS = 1000 * 15;
const EMPLOYEE_AVATAR_CACHE_TTL_MS = 1000 * 30;
const DASHBOARD_CACHE_TTL_MS = 1000 * 15;
const PAYROLL_RESULTS_CACHE_TTL_MS = 1000 * 15;
const ENABLE_EMPLOYEE_DIRECT_DB = false;
const { Pool } = pg;

if (!SUPABASE_URL || (!SUPABASE_SERVICE_ROLE_KEY && !SUPABASE_PUBLISHABLE_KEY)) {
  throw new Error("Missing SUPABASE_URL and a usable Supabase API key in apps/admin/.env or Vercel environment variables");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY || SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

const publicAuthClient = SUPABASE_PUBLISHABLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    })
  : null;

const adminAuthUserCache = new Map();
const employeeListCache = new Map();
const employeeCountCache = new Map();
const employeeAvatarCache = new Map();
const dashboardCache = new Map();
const payrollResultsCache = new Map();
const directDbPool = DATABASE_URL
  ? new Pool({
      connectionString: DATABASE_URL,
      max: 4,
      idleTimeoutMillis: 30_000,
      ssl: DATABASE_URL.includes("supabase.co")
        ? { rejectUnauthorized: false }
        : undefined
    })
  : null;

if (directDbPool) {
  directDbPool.on("error", (error) => {
    console.warn("[admin/db] pg pool error", error);
  });
}

function getAccessToken(req) {
  const authorization = req.headers.authorization;
  if (!authorization || !authorization.startsWith("Bearer ")) {
    return null;
  }

  return authorization.slice("Bearer ".length).trim();
}

async function requireGoogleAuth(req, res, next) {
  const accessToken = getAccessToken(req);
  if (!accessToken) {
    return res.status(401).json({ error: "未登录，请先使用 Google 账号登录" });
  }

  const now = Date.now();
  const cached = adminAuthUserCache.get(accessToken);
  if (cached && cached.expiresAt > now) {
    req.authUser = cached.user;
    return next();
  }

  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error || !data.user) {
    adminAuthUserCache.delete(accessToken);
    return res.status(401).json({ error: "登录状态已失效，请重新登录" });
  }

  const providers = data.user.app_metadata?.providers || [];
  const provider = data.user.app_metadata?.provider;
  const isGoogleUser = provider === "google" || providers.includes("google");

  if (!isGoogleUser) {
    adminAuthUserCache.delete(accessToken);
    return res.status(403).json({ error: "当前后台仅允许 Google 登录用户访问" });
  }

  req.authUser = data.user;
  adminAuthUserCache.set(accessToken, {
    user: data.user,
    expiresAt: now + ADMIN_AUTH_CACHE_TTL_MS
  });
  next();
}

const app = express();
app.use(express.json({ limit: "5mb" }));

function isAllowedCorsOrigin(origin) {
  if (!origin) {
    return false;
  }

  if (origin === "https://admin.dutylix.com") {
    return true;
  }

  try {
    const url = new URL(origin);
    return ["localhost", "127.0.0.1"].includes(url.hostname);
  } catch {
    return false;
  }
}

app.use((req, res, next) => {
  const origin = String(req.headers.origin || "");
  if (isAllowedCorsOrigin(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Vary", "Origin");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
    res.header("Access-Control-Allow-Credentials", "true");
  }

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

function normalizeLeadRequestPayload(body = {}) {
  return {
    name: String(body.name || "").trim(),
    email: String(body.email || "").trim().toLowerCase(),
    company_name: String(body.companyName || "").trim() || null,
    subject: String(body.subject || "").trim() || null,
    message: String(body.message || "").trim(),
    source: String(body.source || "home_contact_form").trim() || "home_contact_form",
    locale: String(body.locale || "").trim() || null,
    updated_at: new Date().toISOString()
  };
}

function validateLeadRequestPayload(payload) {
  if (!payload.name) {
    return "姓名不能为空";
  }

  if (!payload.email) {
    return "邮箱不能为空";
  }

  if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(payload.email)) {
    return "请输入正确的邮箱";
  }

  if (!payload.message) {
    return "需求内容不能为空";
  }

  return null;
}

function validateGoogleAuthRedirectUrl(redirectTo) {
  if (!redirectTo) {
    return "redirectTo 不能为空";
  }

  let url;
  try {
    url = new URL(String(redirectTo));
  } catch {
    return "redirectTo 不是有效链接";
  }

  const allowedOrigins = new Set([
    "http://localhost:3000",
    "https://admin.dutylix.com"
  ]);

  if (!allowedOrigins.has(url.origin)) {
    return "redirectTo 不在允许的后台域名范围内";
  }

  return null;
}

async function getMobileAndroidUpdatePayload() {
  const { data, error } = await supabase
    .from("mobile_app_releases")
    .select("version, content, url")
    .eq("platform", MOBILE_ANDROID_RELEASE_PLATFORM)
    .maybeSingle();

  if (error) {
    throw error;
  }

  // 门户下载区和 App 在线更新都共用这条 Android 最新包记录；这里必须强制三元组完整，避免页面拿到半截数据后出现“按钮能点但包失效”。
  if (!data?.version || !data?.content || !data?.url) {
    throw new Error("Android 更新信息未配置完整");
  }

  return {
    version: String(data.version).trim(),
    content: String(data.content).trim(),
    url: String(data.url).trim(),
  };
}

async function fetchWorkspaceBootstrapState(ownerUserId) {
  const { data, error } = await supabase
    .from("workspace_bootstrap_states")
    .select("*")
    .eq("owner_user_id", ownerUserId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

async function upsertWorkspaceBootstrapState(ownerUserId, authUser, payload) {
  const { error } = await supabase
    .from("workspace_bootstrap_states")
    .upsert({
      owner_user_id: ownerUserId,
      bootstrap_mode: "demo_seed",
      bootstrap_source: payload.bootstrapSource,
      created_demo_data: Boolean(payload.createdDemoData),
      bootstrapped_by_email: authUser.email || null,
      updated_at: new Date().toISOString()
    }, {
      onConflict: "owner_user_id"
    });

  if (error) {
    throw error;
  }
}

async function fetchWorkspaceDataCounts(ownerUserId) {
  // 初始化状态表只代表“检查/初始化流程跑过”，不能单独证明员工和规则真实存在；
  // 一键初始化前必须核对真实业务表，避免状态残留但后台为空时继续被误判为已初始化。
  const [employeesResult, rulesResult] = await Promise.all([
    supabase
      .from("employees")
      .select("id", { count: "exact", head: true })
      .eq("owner_user_id", ownerUserId),
    supabase
      .from("attendance_rules")
      .select("id", { count: "exact", head: true })
      .eq("owner_user_id", ownerUserId)
  ]);

  if (employeesResult.error) {
    throw employeesResult.error;
  }
  if (rulesResult.error) {
    throw rulesResult.error;
  }

  return {
    employeesCount: employeesResult.count || 0,
    rulesCount: rulesResult.count || 0
  };
}

async function fetchWorkspaceDataPresence(ownerUserId) {
  const [employeeResult, ruleResult] = await Promise.all([
    supabase
      .from("employees")
      .select("id")
      .eq("owner_user_id", ownerUserId)
      .limit(1),
    supabase
      .from("attendance_rules")
      .select("id")
      .eq("owner_user_id", ownerUserId)
      .limit(1)
  ]);

  if (employeeResult.error) {
    throw employeeResult.error;
  }
  if (ruleResult.error) {
    throw ruleResult.error;
  }

  return {
    hasEmployees: (employeeResult.data || []).length > 0,
    hasRules: (ruleResult.data || []).length > 0
  };
}

function hasWorkspaceData(counts) {
  // 员工或考勤规则任一存在即视为已有业务数据，防止初始化重复写入初始化数据。
  return counts.employeesCount > 0 || counts.rulesCount > 0;
}

function mapEmployeeRow(row, ruleMap = new Map()) {
  return {
    id: Number(row.id),
    employeeNo: row.employee_no,
    name: row.name,
    nickname: row.nickname || "",
    gender: row.gender,
    country: row.country,
    phone: row.phone,
    role: row.role,
    dept: row.dept,
    joinDate: row.join_date,
    status: row.status,
    attendanceRuleId: row.attendance_rule_id === null || row.attendance_rule_id === undefined ? 0 : Number(row.attendance_rule_id),
    attendanceRuleName: row.attendance_rule_name || ruleMap.get(Number(row.attendance_rule_id)) || null,
    salaryType: row.salary_type,
    hourlyRate: row.hourly_rate === null ? null : Number(row.hourly_rate),
    fixedSalary: row.fixed_salary === null ? null : Number(row.fixed_salary),
    overtimeHourlyFee: row.overtime_hourly_fee === null || row.overtime_hourly_fee === undefined ? null : Number(row.overtime_hourly_fee),
    overtimeRuleEnabled: row.overtime_rule_enabled === null || row.overtime_rule_enabled === undefined ? null : Boolean(row.overtime_rule_enabled),
    isDispatchPersonnel: Boolean(row.is_dispatch_personnel),
    attendanceBonus: row.attendance_bonus === null || row.attendance_bonus === undefined ? 0 : Number(row.attendance_bonus),
    socialSecurity: row.social_security === null || row.social_security === undefined ? 0 : Number(row.social_security),
    mealAllowance: row.meal_allowance === null || row.meal_allowance === undefined ? 0 : Number(row.meal_allowance),
    serviceFeeRate: row.service_fee_rate === null || row.service_fee_rate === undefined ? 0 : Number(row.service_fee_rate),
    currency: row.currency,
    photo: row.photo,
    isDeleted: row.is_deleted
  };
}

function didEmployeePayrollFieldsChange(existingEmployee, payload) {
  return (
    String(existingEmployee.join_date || "") !== String(payload.joinDate || "") ||
    String(existingEmployee.salary_type || "") !== String(payload.salaryType || "") ||
    normalizeSalaryAmount(existingEmployee.hourly_rate) !== normalizeSalaryAmount(payload.hourlyRate) ||
    normalizeSalaryAmount(existingEmployee.fixed_salary) !== normalizeSalaryAmount(payload.fixedSalary) ||
    getNonNegativePayrollAmount(existingEmployee.service_fee_rate) !== getNonNegativePayrollAmount(payload.serviceFeeRate) ||
    String(existingEmployee.currency || "") !== String(payload.currency || "")
  );
}

function mapEmployeeAppAccountRow(row) {
  return {
    id: Number(row.id),
    employeeId: Number(row.employee_id),
    employeeName: row.employee_name || "",
    account: row.account,
    status: row.status,
    lastLoginAt: row.last_login_at,
    passwordUpdatedAt: row.password_updated_at,
    updatedAt: row.updated_at
  };
}

function hashEmployeeAppPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  // 员工 App 密码不接 Supabase Auth；第一版由后端自管 hash，避免后台 Google 管理员账号和员工账号混用。
  const derived = crypto.pbkdf2Sync(String(password), salt, 120000, 32, "sha256").toString("hex");
  return `pbkdf2_sha256$120000$${salt}$${derived}`;
}

function verifyEmployeeAppPassword(password, storedHash) {
  const [algorithm, iterations, salt, expected] = String(storedHash || "").split("$");
  const iterationCount = Number(iterations);
  // 数据库 hash 可能来自旧数据或手动导入；先校验格式和长度，避免 timingSafeEqual 因 Buffer 长度不一致抛异常并泄露实现细节。
  if (algorithm !== "pbkdf2_sha256" || !Number.isFinite(iterationCount) || !salt || !/^[a-f0-9]{64}$/i.test(expected || "")) {
    return false;
  }

  const actual = crypto.pbkdf2Sync(String(password), salt, iterationCount, 32, "sha256").toString("hex");
  return crypto.timingSafeEqual(Buffer.from(actual, "hex"), Buffer.from(expected, "hex"));
}

function signEmployeeAppToken(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", EMPLOYEE_APP_TOKEN_SECRET).update(body).digest("base64url");
  return `${body}.${signature}`;
}

function verifyEmployeeAppToken(token) {
  const [body, signature] = String(token || "").split(".");
  if (!body || !signature) {
    throw new Error("员工端登录状态无效，请重新登录");
  }

  const expectedSignature = crypto.createHmac("sha256", EMPLOYEE_APP_TOKEN_SECRET).update(body).digest("base64url");
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);
  // token 签名校验必须使用 timingSafeEqual，并先判断长度；否则恶意 token 可通过异常差异探测签名实现细节。
  if (actualBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(actualBuffer, expectedBuffer)) {
    throw new Error("员工端登录状态无效，请重新登录");
  }

  let payload;
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    throw new Error("员工端登录状态无效，请重新登录");
  }

  const expiresAt = Number(payload?.expiresAt);
  // 过期时间必须是有限数值；缺失或被篡改成 NaN 时不能被当成未过期 token 放行。
  if (!payload?.accountId || !payload?.ownerUserId || !payload?.employeeId || !Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
    throw new Error("员工端登录已过期，请重新登录");
  }

  return payload;
}

async function requireEmployeeAppAuth(req, res, next) {
  try {
    const token = getAccessToken(req);
    if (!token) {
      return res.status(401).json({ error: "请先登录员工端" });
    }

    const payload = verifyEmployeeAppToken(token);
    const { data: accountRow, error } = await supabase
      .from("employee_app_accounts")
      .select("*, employees(*)")
      .eq("id", Number(payload.accountId))
      .eq("owner_user_id", payload.ownerUserId)
      .eq("employee_id", Number(payload.employeeId))
      .maybeSingle();

    if (error) {
      throw error;
    }
    if (!accountRow || accountRow.status !== "active" || ["disabled", "resigned"].includes(accountRow.employees?.status)) {
      return res.status(401).json({ error: "员工端账号已失效，请重新登录" });
    }

    // 移动端业务接口统一从 req.employeeApp 取 owner/employee，禁止相信请求体里的员工 ID，避免越权读取 SOP 或代打卡。
    req.employeeApp = {
      accountId: Number(accountRow.id),
      ownerUserId: accountRow.owner_user_id,
      employeeId: Number(accountRow.employee_id),
      employee: accountRow.employees
    };
    next();
  } catch (error) {
    res.status(401).json({ error: error.message || "员工端登录状态校验失败" });
  }
}

function generateEmployeeAppToken(accountRow) {
  const expiresAt = Date.now() + EMPLOYEE_APP_TOKEN_TTL_MS;
  // token 只承载员工账号定位字段；所有敏感状态仍以后端数据库为准，后续需要鉴权接口时必须复查 account status。
  return {
    token: signEmployeeAppToken({
      accountId: Number(accountRow.id),
      ownerUserId: accountRow.owner_user_id,
      employeeId: Number(accountRow.employee_id),
      expiresAt
    }),
    expiresAt: new Date(expiresAt).toISOString()
  };
}

async function buildNextEmployeeAppAccountName() {
  // 员工端登录入口没有先选择租户，因此账号本身必须全局唯一；继续使用 wms0001 这种短编号，隔离仍由 token 和 owner_user_id 绑定保护。
  const { data, error } = await supabase
    .from("employee_app_accounts")
    .select("account")
    .like("account", "wms%")
    .order("account", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  const lastNumber = Number(String(data?.account || "").match(/^wms(\d+)$/i)?.[1] || 0);
  return `wms${String(lastNumber + 1).padStart(4, "0")}`;
}

async function ensureEmployeeAppAccount(employeeRow, ownerUserId) {
  const now = new Date().toISOString();
  const account = await buildNextEmployeeAppAccountName();
  const { data, error } = await supabase
    .from("employee_app_accounts")
    .upsert({
      owner_user_id: ownerUserId,
      employee_id: Number(employeeRow.id),
      account,
      password_hash: hashEmployeeAppPassword(EMPLOYEE_APP_DEFAULT_PASSWORD),
      status: employeeRow.status === "disabled" || employeeRow.status === "resigned" ? "disabled" : "active",
      password_updated_at: now,
      updated_at: now
    }, {
      onConflict: "owner_user_id,employee_id",
      ignoreDuplicates: true
    })
    .select("*, employees(name)")
    .single();

  if (error && error.code !== "PGRST116") {
    throw error;
  }

  return data ? mapEmployeeAppAccountRow({ ...data, employee_name: data.employees?.name }) : null;
}

async function fetchEmployeeAppAccount(employeeId, ownerUserId) {
  const { data: employeeRow, error: employeeError } = await supabase
    .from("employees")
    .select("id, employee_no, name, status")
    .eq("owner_user_id", ownerUserId)
    .eq("id", employeeId)
    .single();

  if (employeeError) {
    throw employeeError;
  }

  const { data: accountRow, error: accountError } = await supabase
    .from("employee_app_accounts")
    .select("*, employees(name)")
    .eq("owner_user_id", ownerUserId)
    .eq("employee_id", employeeId)
    .maybeSingle();

  if (accountError) {
    throw accountError;
  }

  if (accountRow) {
    return mapEmployeeAppAccountRow({ ...accountRow, employee_name: accountRow.employees?.name });
  }

  return await ensureEmployeeAppAccount(employeeRow, ownerUserId);
}

async function resetEmployeeAppPassword(employeeId, ownerUserId) {
  await fetchEmployeeAppAccount(employeeId, ownerUserId);
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("employee_app_accounts")
    .update({
      password_hash: hashEmployeeAppPassword(EMPLOYEE_APP_DEFAULT_PASSWORD),
      password_updated_at: now,
      updated_at: now
    })
    .eq("owner_user_id", ownerUserId)
    .eq("employee_id", employeeId)
    .select("*, employees(name)")
    .single();

  if (error) {
    throw error;
  }

  return {
    account: mapEmployeeAppAccountRow({ ...data, employee_name: data.employees?.name }),
    defaultPassword: EMPLOYEE_APP_DEFAULT_PASSWORD
  };
}

async function setEmployeeAppAccountStatus(employeeId, ownerUserId, status) {
  if (!["active", "disabled"].includes(status)) {
    throw new Error("员工 App 账号状态不合法");
  }

  await fetchEmployeeAppAccount(employeeId, ownerUserId);
  const { data, error } = await supabase
    .from("employee_app_accounts")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("owner_user_id", ownerUserId)
    .eq("employee_id", employeeId)
    .select("*, employees(name)")
    .single();

  if (error) {
    throw error;
  }

  return mapEmployeeAppAccountRow({ ...data, employee_name: data.employees?.name });
}

async function authenticateEmployeeAppAccount(account, password) {
  const normalizedAccount = String(account || "").trim();
  const { data: rows, error } = await supabase
    .from("employee_app_accounts")
    .select("*, employees(*)")
    .eq("account", normalizedAccount);

  if (error) {
    throw error;
  }

  if (!rows || rows.length === 0) {
    throw new Error("账号或密码错误");
  }
  if (rows.length > 1) {
    throw new Error("App 账号重复，请联系后台管理员处理");
  }

  const row = rows[0];
  if (row.status !== "active" || ["disabled", "resigned"].includes(row.employees?.status)) {
    throw new Error("账号已停用，请联系管理员");
  }
  if (!verifyEmployeeAppPassword(password, row.password_hash)) {
    throw new Error("账号或密码错误");
  }

  const { error: updateError } = await supabase
    .from("employee_app_accounts")
    .update({ last_login_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", row.id);

  if (updateError) {
    throw updateError;
  }

  const token = generateEmployeeAppToken(row);
  return {
    ...token,
    employee: mapEmployeeRow(row.employees)
  };
}

function escapeLikeKeyword(value) {
  return value.replace(/[%_,]/g, (char) => `\\${char}`);
}

function readCache(cache, key) {
  const cached = cache.get(key);
  if (!cached) {
    return null;
  }

  if (cached.expiresAt <= Date.now()) {
    cache.delete(key);
    return null;
  }

  return cached.value;
}

function writeCache(cache, key, value, ttlMs) {
  cache.set(key, {
    value,
    expiresAt: Date.now() + ttlMs
  });
}

function buildEmployeeListCacheKey(params) {
  return JSON.stringify(params);
}

function clearEmployeeCaches() {
  employeeListCache.clear();
  employeeCountCache.clear();
  employeeAvatarCache.clear();
}

function clearDashboardCache(ownerUserId) {
  if (ownerUserId) {
    const cacheKeyPrefix = `${ownerUserId}:`;
    Array.from(dashboardCache.keys()).forEach((key) => {
      if (String(key).startsWith(cacheKeyPrefix)) {
        dashboardCache.delete(key);
      }
    });
    return;
  }
  dashboardCache.clear();
}

function clearPayrollResultsCache(ownerUserId) {
  if (ownerUserId) {
    const cacheKeyPrefix = `${ownerUserId}:`;
    Array.from(payrollResultsCache.keys()).forEach((key) => {
      if (String(key).startsWith(cacheKeyPrefix)) {
        payrollResultsCache.delete(key);
      }
    });
    return;
  }
  payrollResultsCache.clear();
}

function buildEmployeeListSqlFilters({
  ownerUserId,
  includeInactive,
  keyword,
  status,
  country,
  salaryType,
  role
}) {
  const whereClauses = ["owner_user_id = $1"];
  const values = [ownerUserId];

  if (!includeInactive && status === "all") {
    whereClauses.push(`status = ANY($${values.length + 1}::text[])`);
    values.push(["active", "on_leave", "probation"]);
  }

  if (status !== "all") {
    whereClauses.push(`status = $${values.length + 1}`);
    values.push(status);
  }

  if (country !== "all") {
    whereClauses.push(`country = $${values.length + 1}`);
    values.push(country);
  }

  if (salaryType !== "all") {
    whereClauses.push(`salary_type = $${values.length + 1}`);
    values.push(salaryType);
  }

  if (role !== "all") {
    whereClauses.push(`role = $${values.length + 1}`);
    values.push(role);
  }

  if (keyword) {
    const pattern = `%${escapeLikeKeyword(keyword)}%`;
    const placeholder = `$${values.length + 1}`;
    whereClauses.push(`(
      name ILIKE ${placeholder} ESCAPE '\\'
      OR nickname ILIKE ${placeholder} ESCAPE '\\'
      OR employee_no ILIKE ${placeholder} ESCAPE '\\'
      OR phone ILIKE ${placeholder} ESCAPE '\\'
      OR role ILIKE ${placeholder} ESCAPE '\\'
      OR dept ILIKE ${placeholder} ESCAPE '\\'
    )`);
    values.push(pattern);
  }

  return {
    whereSql: whereClauses.join(" AND "),
    values
  };
}

async function queryDirectDb(text, values) {
  if (!directDbPool) {
    throw new Error("DATABASE_URL is not configured");
  }

  return directDbPool.query(text, values);
}

async function fetchEmployeesViaDirectDb(params) {
  const {
    ownerUserId,
    includeInactive,
    keyword,
    status,
    country,
    salaryType,
    role,
    usePagination,
    skipTotal,
    offset,
    pageSize
  } = params;
  const { whereSql, values } = buildEmployeeListSqlFilters({
    ownerUserId,
    includeInactive,
    keyword,
    status,
    country,
    salaryType,
    role
  });
  const pageLimit = usePagination ? pageSize + (skipTotal ? 1 : 0) : null;
  const listSql = `
    SELECT
      id,
      employee_no,
      name,
      nickname,
      gender,
      country,
      phone,
      role,
      dept,
      join_date,
      status,
      attendance_rule_id,
      salary_type,
      hourly_rate,
      fixed_salary,
      attendance_bonus,
      social_security,
      meal_allowance,
      service_fee_rate,
      currency,
      is_deleted
    FROM employees
    WHERE ${whereSql}
    ORDER BY id ASC
    ${usePagination ? `LIMIT $${values.length + 1} OFFSET $${values.length + 2}` : ""}
  `;
  const listValues = usePagination ? [...values, pageLimit, offset] : values;
  const employeeQueryStartedAt = Date.now();
  const employeePromise = queryDirectDb(listSql, listValues).then((result) => ({
    rows: result.rows,
    durationMs: Date.now() - employeeQueryStartedAt
  }));
  const countQueryStartedAt = Date.now();
  const countPromise = usePagination && !skipTotal
    ? queryDirectDb(`SELECT COUNT(*)::bigint AS total FROM employees WHERE ${whereSql}`, values).then((result) => ({
        total: Number(result.rows[0]?.total || 0),
        durationMs: Date.now() - countQueryStartedAt
      }))
    : Promise.resolve({
        total: null,
        durationMs: 0
      });
  const [employeeMeta, countMeta] = await Promise.all([employeePromise, countPromise]);
  const rows = usePagination && skipTotal && employeeMeta.rows.length > pageSize
    ? employeeMeta.rows.slice(0, pageSize)
    : employeeMeta.rows;
  const hasMore = usePagination
    ? (skipTotal
        ? employeeMeta.rows.length > pageSize
        : offset + rows.length < Number(countMeta.total || 0))
    : false;

  return {
    rows,
    total: countMeta.total,
    hasMore,
    employeeQueryDurationMs: employeeMeta.durationMs,
    countQueryDurationMs: countMeta.durationMs
  };
}

async function fetchEmployeeCountViaDirectDb(params) {
  const {
    ownerUserId,
    includeInactive,
    keyword,
    status,
    country,
    salaryType,
    role
  } = params;
  const { whereSql, values } = buildEmployeeListSqlFilters({
    ownerUserId,
    includeInactive,
    keyword,
    status,
    country,
    salaryType,
    role
  });
  const result = await queryDirectDb(
    `SELECT COUNT(*)::bigint AS total FROM employees WHERE ${whereSql}`,
    values
  );
  return Number(result.rows[0]?.total || 0);
}

async function fetchEmployeeAvatarsViaDirectDb(ownerUserId, ids) {
  const result = await queryDirectDb(
    `
      SELECT id, photo
      FROM employees
      WHERE owner_user_id = $1
        AND id = ANY($2::int[])
    `,
    [ownerUserId, ids]
  );

  return result.rows.map((row) => ({
    id: Number(row.id),
    photo: row.photo || null
  }));
}

function mapHistoryRow(row, ruleMap = new Map()) {
  return {
    id: Number(row.id),
    employeeId: Number(row.employee_id),
    attendanceRuleId: row.attendance_rule_id === null || row.attendance_rule_id === undefined ? 0 : Number(row.attendance_rule_id),
    attendanceRuleName: row.attendance_rule_name || ruleMap.get(Number(row.attendance_rule_id)) || null,
    effectiveStartDate: row.effective_start_date,
    effectiveEndDate: row.effective_end_date,
    createdAt: row.created_at,
    createdBy: row.created_by
  };
}

function mapAttendanceRuleRow(row, relatedEmployeeCount = 0) {
  return {
    id: Number(row.id),
    name: row.name,
    isActive: row.is_active,
    effectiveStartDate: row.effective_start_date,
    effectiveEndDate: row.effective_end_date,
    startShift: row.start_shift,
    endShift: row.end_shift,
    breakStart: row.break_start,
    breakEnd: row.break_end,
    standardHours: Number(row.standard_hours),
    overtimeEnabled: row.overtime_enabled,
    otHourlyFee: Number(row.ot_hourly_fee),
    overtimeMinUnitHours: Number(row.overtime_min_unit_hours),
    overtimeRounding: row.overtime_rounding,
    relatedEmployeeCount,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function normalizeAttendanceRulePayload(body) {
  return {
    name: String(body.name || "").trim(),
    is_active: Boolean(body.isActive),
    effective_start_date: body.effectiveStartDate,
    effective_end_date: body.effectiveEndDate || null,
    start_shift: body.startShift,
    end_shift: body.endShift,
    break_start: body.breakStart,
    break_end: body.breakEnd,
    standard_hours: Number(body.standardHours),
    overtime_enabled: Boolean(body.overtimeEnabled),
    ot_hourly_fee: body.otHourlyFee === null || body.otHourlyFee === "" ? 0 : Number(body.otHourlyFee),
    overtime_min_unit_hours: 0.5,
    overtime_rounding: "floor_to_half_hour",
    updated_at: new Date().toISOString()
  };
}

function validateAttendanceRulePayload(payload) {
  if (!payload.name) {
    return "规则名称不能为空";
  }

  if (!payload.effective_start_date) {
    return "生效开始日期不能为空";
  }

  if (isFutureDateKey(payload.effective_start_date)) {
    return "生效开始日期不能晚于今天";
  }

  if (payload.effective_end_date && payload.effective_end_date < payload.effective_start_date) {
    return "生效结束日期不能早于生效开始日期";
  }

  if (payload.effective_end_date && isFutureDateKey(payload.effective_end_date)) {
    return "生效结束日期不能晚于今天";
  }

  if (!payload.start_shift || !payload.end_shift || !payload.break_start || !payload.break_end) {
    return "请完整填写班次和休息时间";
  }

  if (!Number.isFinite(payload.standard_hours) || payload.standard_hours <= 0) {
    return "标准工时必须大于 0";
  }

  if (!Number.isFinite(payload.ot_hourly_fee) || payload.ot_hourly_fee < 0) {
    return "加班费标准必须大于等于 0";
  }

  return null;
}

function addOwnerPayload(payload, ownerUserId) {
  return {
    ...payload,
    owner_user_id: ownerUserId
  };
}

function getPreviousDate(date) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() - 1);
  return value.toISOString().slice(0, 10);
}

function generateEmployeeNo() {
  return `EMP${Date.now().toString().slice(-8)}${String(Math.floor(Math.random() * 90) + 10)}`;
}

async function getEmployeeCompatibilityAttendanceRuleId(ownerUserId) {
  // 员工 v2 界面已经不展示/编辑多考勤规则；这里仅为旧 employees.attendance_rule_id 字段提供后端兼容值，
  // 避免前端重新暴露旧规则历史模型。若后续数据库删除该字段，应先同步检查 create/update 员工接口。
  const { data: existingRule, error: existingError } = await supabase
    .from("attendance_rules")
    .select("id")
    .eq("owner_user_id", ownerUserId)
    .order("id", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  if (existingRule?.id) {
    return Number(existingRule.id);
  }

  const today = getTodayDateKey();
  const { data: createdRule, error: createError } = await supabase
    .from("attendance_rules")
    .insert(addOwnerPayload({
      name: "默认考勤规则",
      is_active: true,
      effective_start_date: today,
      effective_end_date: null,
      start_shift: "08:30",
      end_shift: "17:30",
      break_start: "12:00",
      break_end: "13:00",
      standard_hours: 8,
      overtime_enabled: true,
      ot_hourly_fee: 0,
      overtime_min_unit_hours: 0.5,
      overtime_rounding: "floor_to_half_hour",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }, ownerUserId))
    .select("id")
    .single();

  if (createError) {
    throw createError;
  }

  return Number(createdRule.id);
}

async function fetchRuleMap(ids, ownerUserId) {
  if (!ids.length) {
    return new Map();
  }

  const { data, error } = await supabase
    .from("attendance_rules")
    .select("id, name")
    .eq("owner_user_id", ownerUserId)
    .in("id", ids);

  if (error) {
    throw error;
  }

  return new Map(data.map((rule) => [Number(rule.id), rule.name]));
}

async function fetchAttendanceRuleCounts(ownerUserId) {
  const [historyResult, employeeResult] = await Promise.all([
    supabase
      .from("employee_attendance_rule_history")
      .select("attendance_rule_id, employee_id")
      .eq("owner_user_id", ownerUserId),
    supabase
      .from("employees")
      .select("attendance_rule_id, id")
      .eq("owner_user_id", ownerUserId)
  ]);

  if (historyResult.error) {
    throw historyResult.error;
  }

  if (employeeResult.error) {
    throw employeeResult.error;
  }

  const countMap = new Map();

  for (const row of historyResult.data) {
    const ruleId = Number(row.attendance_rule_id);
    const employeeId = Number(row.employee_id);
    if (!countMap.has(ruleId)) {
      countMap.set(ruleId, new Set());
    }
    countMap.get(ruleId).add(employeeId);
  }

  for (const row of employeeResult.data) {
    const ruleId = Number(row.attendance_rule_id);
    const employeeId = Number(row.id);
    if (!countMap.has(ruleId)) {
      countMap.set(ruleId, new Set());
    }
    countMap.get(ruleId).add(employeeId);
  }

  return new Map(Array.from(countMap.entries()).map(([ruleId, employeeIds]) => [ruleId, employeeIds.size]));
}

async function fetchAttendanceRuleDetail(ruleId, ownerUserId) {
  const [{ data: row, error }, counts] = await Promise.all([
    supabase
      .from("attendance_rules")
      .select("*")
      .eq("owner_user_id", ownerUserId)
      .eq("id", ruleId)
      .single(),
    fetchAttendanceRuleCounts(ownerUserId)
  ]);

  if (error) {
    throw error;
  }

  return {
    rule: mapAttendanceRuleRow(row, counts.get(Number(row.id)) || 0)
  };
}

async function fetchEmployeeDetail(employeeId, ownerUserId) {
  const { data: employeeRow, error: employeeError } = await supabase
    .from("employees")
    .select("*")
    .eq("owner_user_id", ownerUserId)
    .eq("id", employeeId)
    .single();

  if (employeeError) {
    throw employeeError;
  }

  // 员工 v2 弹窗只编辑员工档案和薪资口径，不再展示旧规则历史；保留空数组返回以兼容前端 EmployeeDetail 类型。
  return {
    employee: mapEmployeeRow(employeeRow),
    ruleHistory: []
  };
}

function toDateKey(value) {
  return typeof value === "string" ? value.slice(0, 10) : value;
}


function roundToTwo(value) {
  return Math.round(value * 100) / 100;
}

function enumerateMonthDates(yearMonth) {
  const [year, month] = yearMonth.split("-").map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const dates = [];
  for (let day = 1; day <= daysInMonth; day += 1) {
    dates.push(`${yearMonth}-${String(day).padStart(2, "0")}`);
  }
  return dates;
}

function getMonthRange(yearMonth) {
  const dates = enumerateMonthDates(yearMonth);
  return {
    periodStartDate: dates[0],
    periodEndDate: dates[dates.length - 1]
  };
}

function mapAttendanceRecordRow(row) {
  return {
    id: Number(row.id),
    employeeId: Number(row.employee_id),
    date: row.date,
    inTime: row.in_time ? row.in_time.slice(0, 5) : null,
    outTime: row.out_time ? row.out_time.slice(0, 5) : null,
    type: row.type,
    note: row.note || "",
    source: row.source,
    manualOvertimeHourlyFee: row.manual_overtime_hourly_fee === null || row.manual_overtime_hourly_fee === undefined ? null : Number(row.manual_overtime_hourly_fee),
    manualOvertimeUseRule: row.manual_overtime_use_rule === null || row.manual_overtime_use_rule === undefined ? null : Boolean(row.manual_overtime_use_rule)
  };
}

function mapAttendanceConfigRow(row) {
  return {
    startShift: row.start_shift ? row.start_shift.slice(0, 5) : DEFAULT_ATTENDANCE_CONFIG.start_shift,
    endShift: row.end_shift ? row.end_shift.slice(0, 5) : DEFAULT_ATTENDANCE_CONFIG.end_shift,
    breakStart: row.break_start ? row.break_start.slice(0, 5) : DEFAULT_ATTENDANCE_CONFIG.break_start,
    breakEnd: row.break_end ? row.break_end.slice(0, 5) : DEFAULT_ATTENDANCE_CONFIG.break_end,
    standardHours: Number(row.standard_hours ?? DEFAULT_ATTENDANCE_CONFIG.standard_hours),
    otHourlyFee: Number(row.ot_hourly_fee ?? DEFAULT_ATTENDANCE_CONFIG.ot_hourly_fee),
    overtimeRuleEnabled: Boolean(row.overtime_rule_enabled ?? DEFAULT_ATTENDANCE_CONFIG.overtime_rule_enabled),
    holidayDates: Array.isArray(row.holiday_dates)
      ? row.holiday_dates.map((value) => String(value).slice(0, 10))
      : DEFAULT_ATTENDANCE_CONFIG.holiday_dates,
    currency: row.currency || DEFAULT_ATTENDANCE_CONFIG.currency
  };
}

function normalizeAttendanceConfigPayload(body = {}) {
  // 前端 v2 设置弹窗只提交全局考勤配置字段；owner_user_id/时间戳由服务端控制，防止跨账号写入。
  return {
    start_shift: String(body.startShift || DEFAULT_ATTENDANCE_CONFIG.start_shift).slice(0, 5),
    end_shift: String(body.endShift || DEFAULT_ATTENDANCE_CONFIG.end_shift).slice(0, 5),
    break_start: String(body.breakStart || DEFAULT_ATTENDANCE_CONFIG.break_start).slice(0, 5),
    break_end: String(body.breakEnd || DEFAULT_ATTENDANCE_CONFIG.break_end).slice(0, 5),
    standard_hours: Number(body.standardHours ?? DEFAULT_ATTENDANCE_CONFIG.standard_hours),
    ot_hourly_fee: Number(body.otHourlyFee ?? DEFAULT_ATTENDANCE_CONFIG.ot_hourly_fee),
    overtime_rule_enabled: Boolean(body.overtimeRuleEnabled ?? DEFAULT_ATTENDANCE_CONFIG.overtime_rule_enabled),
    holiday_dates: Array.isArray(body.holidayDates)
      ? body.holidayDates
        .map((value) => String(value || "").trim().slice(0, 10))
        .filter((value) => /^\d{4}-\d{2}-\d{2}$/.test(value))
      : DEFAULT_ATTENDANCE_CONFIG.holiday_dates,
    currency: ["THB", "USD", "MYR", "IDR"].includes(body.currency) ? body.currency : DEFAULT_ATTENDANCE_CONFIG.currency,
    updated_at: new Date().toISOString()
  };
}

function getV2AttendanceStatusLabel(row) {
  const statusLabelMap = {
    normal: "正常",
    pending: "待打卡",
    checked_in: "已上班",
    leave: "假期",
    sick_leave: "病假",
    absent: "缺勤",
    manual_adjusted: "人工调整",
    exception: "异常"
  };
  return statusLabelMap[row.status] || row.status || "正常";
}

function mapAttendanceCalculationRow(row, employeeMap = new Map()) {
  const employee = employeeMap.get(Number(row.employee_id));
  const overtimePayHours = Number(row.overtime_pay_hours);
  const workPay = Number(row.work_pay || 0);
  const serviceFeeRate = getNonNegativePayrollAmount(employee?.service_fee_rate);
  // attendance_calculation_results 暂无独立服务费列；考勤列表按员工当前服务费比例从本日上班费用派生展示，避免改动沉淀表结构和历史结算写入路径。
  const serviceFeeAmount = roundToTwo(workPay * serviceFeeRate / 100);
  // v2 考勤表格需要一次接口拿齐员工展示字段和费用字段；前端后续只负责筛选、展示、导出，不能再回到旧规则或本地重算。
  return {
    id: Number(row.id),
    employeeId: Number(row.employee_id),
    employeeNo: employee?.employee_no || undefined,
    employeeName: employee?.name || `员工 #${row.employee_id}`,
    employeeGender: employee?.gender || null,
    employeeCountry: employee?.country || null,
    employeeRole: employee?.role || "",
    employeeDept: employee?.dept || "",
    employeeStatus: employee?.status || null,
    employeePhoto: employee?.photo || null,
    salaryType: employee?.salary_type || null,
    hourlyRate: employee?.hourly_rate === null || employee?.hourly_rate === undefined ? null : Number(employee.hourly_rate),
    fixedSalary: employee?.fixed_salary === null || employee?.fixed_salary === undefined ? null : Number(employee.fixed_salary),
    serviceFeeRate,
    currency: employee?.currency || "THB",
    attendanceRecordId: row.attendance_record_id === null ? null : Number(row.attendance_record_id),
    date: row.date,
    rawInTime: row.raw_in_time ? row.raw_in_time.slice(0, 5) : null,
    rawOutTime: row.raw_out_time ? row.raw_out_time.slice(0, 5) : null,
    rawHours: Number(row.raw_hours),
    breakDeductionHours: Number(row.break_deduction_hours),
    validHours: Number(row.valid_hours),
    standardHours: Number(row.standard_hours),
    overtimeRawHours: Number(row.overtime_raw_hours),
    overtimePayHours,
    workPay,
    mealAllowanceAmount: row.meal_allowance_amount === null || row.meal_allowance_amount === undefined ? 0 : Number(row.meal_allowance_amount),
    overtimePay: Number(row.overtime_pay || 0),
    serviceFeeAmount,
    totalPay: Number(row.total_pay || 0),
    status: row.status,
    statusLabel: getV2AttendanceStatusLabel(row),
    isOvertime: overtimePayHours > 0,
    hasException: row.has_exception,
    exceptionReason: row.exception_reason,
    note: row.note || "",
    source: row.source || null,
    calculatedAt: row.calculated_at
  };
}

function mapAttendanceSummaryRow(row, employeeMap = new Map()) {
  const employee = employeeMap.get(Number(row.employee_id));
  return {
    id: Number(row.id),
    employeeId: Number(row.employee_id),
    employeeNo: employee?.employee_no || undefined,
    employeeName: employee?.name || `员工 #${row.employee_id}`,
    employeeStatus: employee?.status || null,
    // 薪资 v2 员工详情列需要稳定显示“部门 · 职位”和头像；这里随薪资结果一起返回，前端不要再用旧员工列表 fallback。
    employeeDept: employee?.dept || "未分配",
    employeeRole: employee?.role || "未设置职位",
    employeePhoto: employee?.photo || null,
    yearMonth: row.year_month,
    periodStartDate: row.period_start_date,
    periodEndDate: row.period_end_date,
    totalRawHours: Number(row.total_raw_hours),
    totalBreakDeductionHours: Number(row.total_break_deduction_hours),
    totalValidHours: Number(row.total_valid_hours),
    totalStandardHours: Number(row.total_standard_hours),
    totalOvertimeRawHours: Number(row.total_overtime_raw_hours),
    totalOvertimePayHours: Number(row.total_overtime_pay_hours),
    recordCount: Number(row.record_count),
    exceptionCount: Number(row.exception_count),
    absentCount: Number(row.absent_count),
    leaveCount: Number(row.leave_count),
    manualAdjustedCount: Number(row.manual_adjusted_count),
    canGeneratePayroll: row.can_generate_payroll,
    blockedReason: row.blocked_reason,
    calculatedAt: row.calculated_at
  };
}

function mapSalaryProfileRow(row) {
  return {
    id: Number(row.id),
    employeeId: Number(row.employee_id),
    salaryType: row.salary_type,
    fixedSalary: row.fixed_salary === null ? null : Number(row.fixed_salary),
    hourlyRate: row.hourly_rate === null ? null : Number(row.hourly_rate),
    // 服务费比例现在随薪资档案一起返回：工资条说明要展示本次核算使用的比例，而不是员工当前档案的可能新值。
    serviceFeeRate: row.service_fee_rate === null || row.service_fee_rate === undefined ? 0 : Number(row.service_fee_rate),
    currency: row.currency,
    isActive: row.is_active,
    effectiveStartDate: row.effective_start_date,
    effectiveEndDate: row.effective_end_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapSalaryAdjustmentItemRow(row) {
  return {
    id: Number(row.id),
    employeeId: Number(row.employee_id),
    yearMonth: row.year_month,
    type: row.type,
    name: row.name,
    amount: Number(row.amount),
    note: row.note || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

const PAYROLL_EXCEPTION_REASON_LABELS = {
  IN_TIME_MISSING: "上班未打卡",
  OUT_TIME_MISSING: "下班未打卡",
  TIME_FORMAT_INVALID: "打卡时间格式异常"
};

function getPayrollExceptionReason(row) {
  const rawReason = row.exception_reason || row.note || "";
  // 日考勤计算结果里沉淀的是稳定机器码；薪资异常明细是业务页面，必须在服务端统一转成可读原因，避免前端和导出继续暴露 OUT_TIME_MISSING 这类 key。
  return PAYROLL_EXCEPTION_REASON_LABELS[rawReason] || rawReason || "异常考勤";
}

function buildPayrollExceptionDetails(dailyCalculations = []) {
  return dailyCalculations
    .filter((row) => row.has_exception)
    .sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")))
    .map((row) => ({
      date: row.date,
      status: row.status || "exception",
      statusLabel: getV2AttendanceStatusLabel(row),
      reason: getPayrollExceptionReason(row),
      note: row.note || ""
    }));
}

const PAYROLL_LIST_EMPLOYEE_COLUMNS = [
  "id",
  "employee_no",
  "name",
  "nickname",
  "gender",
  "country",
  "role",
  "dept",
  "status",
  "is_deleted",
  "salary_type",
  "hourly_rate",
  "fixed_salary",
  "is_dispatch_personnel",
  "currency",
  "join_date",
  "attendance_bonus",
  "social_security",
  "service_fee_rate"
].join(", ");

function groupRowsByEmployeeId(rows = []) {
  return rows.reduce((map, row) => {
    const employeeId = Number(row.employee_id);
    if (!map.has(employeeId)) {
      map.set(employeeId, []);
    }
    map.get(employeeId).push(row);
    return map;
  }, new Map());
}

function pickSalaryProfileForMonth(profiles = [], yearMonth) {
  const monthStartDate = getMonthStartDate(yearMonth);
  const monthEndDate = getMonthEndDate(yearMonth);
  return profiles
    .filter((profile) => toDateKey(profile.effective_start_date) <= monthEndDate && (!profile.effective_end_date || toDateKey(profile.effective_end_date) >= monthStartDate))
    .sort((a, b) => String(b.effective_start_date || "").localeCompare(String(a.effective_start_date || "")) || Number(b.id || 0) - Number(a.id || 0))[0] || null;
}

function buildPayrollSourceContextFromBatch(employee, yearMonth, ownerUserId, batch) {
  const employeeId = Number(employee.id);
  return {
    employee,
    salaryProfile: pickSalaryProfileForMonth(batch.salaryProfilesByEmployeeId.get(employeeId) || [], yearMonth),
    attendanceSummary: (batch.summariesByEmployeeId.get(employeeId) || [])[0] || null,
    adjustmentItems: batch.adjustmentItemsByEmployeeId.get(employeeId) || [],
    dailyCalculations: batch.dailyCalculationsByEmployeeId.get(employeeId) || [],
    existingPayrollResult: (batch.payrollResultsByEmployeeId.get(employeeId) || [])[0] || null
  };
}

function mapPayrollResultRow(row, employeeMap = new Map()) {
  const employee = employeeMap.get(Number(row.employee_id));
  return {
    id: Number(row.id),
    employeeId: Number(row.employee_id),
    employeeNo: employee?.employee_no || undefined,
    employeeName: employee?.name || `员工 #${row.employee_id}`,
    employeeStatus: employee?.status || null,
    // 薪资 v2 员工详情列需要稳定显示“部门 · 职位”和头像；这里随薪资结果一起返回，前端不要再用旧员工列表 fallback。
    employeeDept: employee?.dept || "未分配",
    employeeRole: employee?.role || "未设置职位",
    employeePhoto: employee?.photo || null,
    yearMonth: row.year_month,
    salaryType: row.salary_type,
    fixedSalary: row.fixed_salary === null ? null : Number(row.fixed_salary),
    hourlyRate: row.hourly_rate === null ? null : Number(row.hourly_rate),
    currency: row.currency,
    // “有效出勤天数”必须由后端按日考勤结果明确给出；前端不能再用月工时/标准工时反推，否则会把整月工时占比误显示成 0/1 天。
    effectiveAttendanceDays: Number(row.effective_attendance_days || 0),
    mealAllowanceDayUnits: Number(row.meal_allowance_day_units || 0),
    mealAllowanceTotal: Number(row.meal_allowance_total || 0),
    attendanceBonusAmount: Number(row.attendance_bonus_amount || 0),
    validHours: Number(row.valid_hours),
    standardHours: Number(row.standard_hours),
    hourlyPay: Number(row.hourly_pay),
    overtimePayHours: Number(row.overtime_pay_hours),
    overtimePay: Number(row.overtime_pay),
    allowanceTotal: Number(row.allowance_total),
    deductionTotal: Number(row.deduction_total),
    otherTotal: Number(row.other_total),
    socialSecurityAmount: row.social_security_amount === null || row.social_security_amount === undefined ? 0 : Number(row.social_security_amount),
    serviceFeeAmount: row.service_fee_amount === null || row.service_fee_amount === undefined ? 0 : Number(row.service_fee_amount),
    grossPay: Number(row.gross_pay),
    totalDeduction: Number(row.total_deduction),
    netPay: Number(row.net_pay),
    calculationStatus: row.calculation_status,
    reviewStatus: row.review_status,
    blockedReason: row.blocked_reason,
    calculatedAt: row.calculated_at,
    confirmedAt: row.confirmed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function buildPayrollPreviewRow(payload) {
  // 薪资主列表以“当前在职员工 + 当月考勤汇总”为主；未生成工资条时没有 monthly_payroll_results.id。
  // 预览行使用稳定负数 id：前端表格 key 不会重复，同时仍可用 id > 0 判断是否是真实工资结果主键。
  return {
    ...payload,
    id: -Number(payload.employee_id),
    created_at: payload.calculated_at,
    updated_at: payload.calculated_at,
    confirmed_at: null
  };
}

function buildLivePayrollListRow(payload, existingPayrollResult = null) {
  if (!existingPayrollResult) {
    return buildPayrollPreviewRow(payload);
  }

  return {
    ...payload,
    // 列表金额必须始终按当前考勤、补扣项和薪资档案实时重算；
    // 但若库里已有工资结果，仍要借用真实主键和锁定状态，避免前端动作入口丢失目标记录。
    id: Number(existingPayrollResult.id),
    created_at: existingPayrollResult.created_at,
    updated_at: existingPayrollResult.updated_at,
    confirmed_at: existingPayrollResult.confirmed_at,
    calculation_status: existingPayrollResult.calculation_status,
    review_status: existingPayrollResult.review_status
  };
}

function getMonthEndDate(yearMonth) {
  return getMonthRange(yearMonth).periodEndDate;
}

function getMonthStartDate(yearMonth) {
  return getMonthRange(yearMonth).periodStartDate;
}

function sumBy(rows, predicate) {
  return roundToTwo(rows.filter(predicate).reduce((sum, row) => sum + Number(row.amount), 0));
}

function countEffectiveAttendanceDays(dailyCalculations = []) {
  // 有效出勤天数按“当日有效工时 > 0”统计；这与工资条的人类理解一致，也避免请假/缺勤/零工时异常日被误算成已出勤。
  return dailyCalculations.filter((row) => Number(row.valid_hours || 0) > 0).length;
}

function calculateMealAllowanceDayUnits(dailyCalculations = []) {
  // 餐补按单日工时占比折算：整天算 1 天，半天算 0.5 天，超出标准工时也最多按 1 天记。
  return roundToTwo(dailyCalculations.reduce((sum, row) => {
    const standardHours = Number(row.standard_hours || 0);
    const validHours = Number(row.valid_hours || 0);
    if (standardHours <= 0 || validHours <= 0) {
      return sum;
    }
    return sum + Math.min(validHours / standardHours, 1);
  }, 0));
}

function shouldGrantAttendanceBonus(dailyCalculations = [], yearMonth) {
  const currentYearMonth = getBangkokDateKey().slice(0, 7);
  if (!yearMonth || String(yearMonth) >= currentYearMonth) {
    // 全勤奖要求“整个月每天完整上班”；当月未结束时不能提前发放。
    return false;
  }
  if (!dailyCalculations.length) {
    return false;
  }
  return dailyCalculations.every((row) => {
    const status = String(row.status || "");
    const standardHours = Number(row.standard_hours || 0);
    const validHours = Number(row.valid_hours || 0);
    return ["normal", "manual_adjusted"].includes(status)
      && !row.has_exception
      && standardHours > 0
      && validHours >= standardHours;
  });
}

function normalizeSalaryAdjustmentPayload(body) {
  return {
    employee_id: Number(body.employeeId),
    year_month: String(body.yearMonth || ""),
    type: String(body.type || ""),
    name: String(body.name || "").trim(),
    amount: Number(body.amount),
    note: String(body.note || "").trim()
  };
}

function validateSalaryAdjustmentPayload(payload) {
  if (!payload.employee_id) {
    return "employeeId 必填";
  }
  if (!/^\d{4}-\d{2}$/.test(payload.year_month)) {
    return "yearMonth 必须为 YYYY-MM";
  }
  if (!["allowance", "deduction", "other"].includes(payload.type)) {
    return "type 必须为 allowance、deduction 或 other";
  }
  if (!payload.name) {
    return "名称不能为空";
  }
  if (Number.isNaN(payload.amount) || payload.amount < 0) {
    return "金额必须大于等于 0";
  }
  return null;
}

async function getSalaryAdjustmentLockError(ownerUserId, employeeId, yearMonth) {
  const { data, error } = await supabase
    .from("monthly_payroll_results")
    .select("id, calculation_status, review_status")
    .eq("owner_user_id", ownerUserId)
    .eq("employee_id", Number(employeeId))
    .eq("year_month", yearMonth)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  if (data.calculation_status === "confirmed") {
    return "该薪酬结果已确认，不能修改一次性薪资项";
  }

  if (data.review_status === "approved") {
    return "该薪酬结果已核对通过，不能修改一次性薪资项";
  }

  return null;
}

function getPayrollResultLockError(result) {
  if (!result) {
    return null;
  }

  if (result.calculation_status === "confirmed") {
    return "已确认的薪酬结果不允许重新计算";
  }

  if (result.review_status === "approved") {
    return "已核对通过的薪酬结果不允许重新计算，请先驳回后再重算";
  }

  return null;
}

function getTodayDateKey() {
  return new Date().toISOString().slice(0, 10);
}

function isFutureDateKey(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || "")) && String(value) > getTodayDateKey();
}

function getBangkokDateKey(now = new Date()) {
  // 考勤自动任务按业务地（泰国/缅甸）日期运行；不要用服务器 UTC 日期，否则 Vercel 17:00 UTC 触发时会落错业务日。
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(now);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  return `${year}-${month}-${day}`;
}

function getBangkokTimeKey(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Bangkok",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).formatToParts(now);
  const hour = parts.find((part) => part.type === "hour")?.value;
  const minute = parts.find((part) => part.type === "minute")?.value;
  return `${hour}:${minute}`;
}

function addDaysToDateKey(dateKey, dayDelta) {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + dayDelta);
  return date.toISOString().slice(0, 10);
}

function getAttendanceCronDates(now = new Date()) {
  const todayDate = getBangkokDateKey(now);
  return {
    todayDate,
    previousDate: addDaysToDateKey(todayDate, -1)
  };
}

function getPayrollCronYearMonth(now = new Date()) {
  // Vercel Cron 只能按 UTC 调度；生产配置用 17:00 UTC 触发，对应泰国/缅甸 00:00。
  // 这里减 1 分钟取“刚结束那一天”的月份：例如 7/1 00:00 会结算 6 月，避免月初零点误切到新月份。
  const payrollDate = new Date(now.getTime() - 60 * 1000);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit"
  }).formatToParts(payrollDate);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  return `${year}-${month}`;
}

function isAuthorizedCronRequest(req) {
  const expectedSecret = process.env.CRON_SECRET;
  const authorization = req.headers.authorization || "";
  // Vercel Cron 在配置 CRON_SECRET 后会带 Bearer token；没有密钥时拒绝执行，防止公开 API 被手动刷薪资重算。
  return Boolean(expectedSecret) && authorization === `Bearer ${expectedSecret}`;
}

async function runNightlyPayrollCalculation(yearMonth, ownerUserId = null) {
  let employeesQuery = supabase
    .from("employees")
    .select("*")
    .eq("is_deleted", false);

  if (ownerUserId) {
    employeesQuery = employeesQuery.eq("owner_user_id", ownerUserId);
  }

  const employeesResult = await employeesQuery
    .order("owner_user_id", { ascending: true })
    .order("id", { ascending: true });

  if (employeesResult.error) {
    throw employeesResult.error;
  }

  const targetEmployees = (employeesResult.data || []).filter(isEmployeeAvailableForAttendanceAndPayroll);
  const ownerIds = new Set(targetEmployees.map((employee) => employee.owner_user_id));
  const failures = [];
  let successCount = 0;

  for (const employee of targetEmployees) {
    try {
      // 夜间任务使用 forceRecalculate，让月内每天新增/修改的考勤自动反映到工资；已确认/已核对通过的工资仍会被锁保护。
      await calculateMonthlyPayroll(Number(employee.id), yearMonth, employee.owner_user_id, { forceRecalculate: true });
      successCount += 1;
    } catch (error) {
      failures.push({
        ownerUserId: employee.owner_user_id,
        employeeId: Number(employee.id),
        error: error.message || "夜间薪资计算失败"
      });
    }
  }

  return {
    yearMonth,
    ownerCount: ownerIds.size,
    targetEmployeeCount: targetEmployees.length,
    successCount,
    failureCount: failures.length,
    failures
  };
}

async function resolveAttendanceConfig(ownerUserId) {
  const { data, error } = await supabase
    .from("attendance_config")
    .select("*")
    .eq("owner_user_id", ownerUserId)
    .maybeSingle();

  if (error) {
    throw error;
  }
  if (data) {
    return data;
  }

  // v2 要求每个账号只有一条全局配置；首次计算时自动创建默认值，避免新账号进入考勤页就因缺配置中断。
  // 默认值必须与 docs/wmshr-后台考勤底层彻底调整为v2逻辑方案.md 的 attendance_config 表结构保持一致。
  const { data: created, error: createError } = await supabase
    .from("attendance_config")
    .insert({
      owner_user_id: ownerUserId,
      ...DEFAULT_ATTENDANCE_CONFIG,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select("*")
    .single();

  if (createError) {
    throw createError;
  }

  return created;
}

function isInactiveEmployeeStatus(status) {
  return status === "disabled" || status === "resigned";
}

function isEmployeeAvailableForAttendanceAndPayroll(employee) {
  // “删除员工”在当前业务里是离职/禁用或软删除，不物理清历史记录；
  // 考勤展示与薪资计算必须统一用这个判断过滤，避免历史员工继续出现在当期业务流里。
  return Boolean(employee) && employee.is_deleted !== true && !isInactiveEmployeeStatus(employee.status);
}

async function assertEmployeeAvailableForAttendanceAndPayroll(employeeId, ownerUserId) {
  const { data, error } = await supabase
    .from("employees")
    .select("id, status, is_deleted")
    .eq("owner_user_id", ownerUserId)
    .eq("id", Number(employeeId))
    .maybeSingle();

  if (error) {
    throw error;
  }
  if (!data) {
    throw new Error("EMPLOYEE_NOT_FOUND");
  }
  if (!isEmployeeAvailableForAttendanceAndPayroll(data)) {
    throw new Error("员工已离职，不参与考勤与薪资计算");
  }
}

function shouldCalculateEmployeeDate(employee, date, maxDate = getBangkokDateKey()) {
  const joinDate = employee?.join_date ? toDateKey(employee.join_date) : null;

  if (joinDate && date < joinDate) {
    return false;
  }

  if (date > maxDate) {
    return false;
  }

  return true;
}

function getAttendanceDateBeforeJoinError(employee, date) {
  const joinDate = employee?.join_date ? toDateKey(employee.join_date) : null;
  if (!joinDate || !date) {
    return null;
  }
  if (date < joinDate) {
    return `考勤日期 ${date} 早于员工入职日期 ${joinDate}，不能新增或修改该记录`;
  }
  return null;
}

function normalizeManualOvertimePayload(body = {}, type = "normal") {
  if (type !== "overtime") {
    return {
      manual_overtime_hourly_fee: null,
      manual_overtime_use_rule: null
    };
  }

  const rawFee = body.manualOvertimeHourlyFee;
  const manualFee = rawFee === "" || rawFee === null || rawFee === undefined ? null : Number(rawFee);
  const manualUseRule = body.manualOvertimeUseRule === null || body.manualOvertimeUseRule === undefined
    ? null
    : Boolean(body.manualOvertimeUseRule);

  if (manualFee !== null && (!Number.isFinite(manualFee) || manualFee < 0)) {
    throw new Error("MANUAL_OVERTIME_HOURLY_FEE_INVALID");
  }

  return {
    manual_overtime_hourly_fee: manualFee,
    manual_overtime_use_rule: manualUseRule
  };
}

function normalizeEmployeeOvertimeSettingsPayload(body = {}) {
  const rawFee = body.employeeOvertimeHourlyFee;
  const overtimeHourlyFee = rawFee === "" || rawFee === null || rawFee === undefined ? null : Number(rawFee);
  const overtimeRuleEnabled = body.employeeOvertimeRuleEnabled === null || body.employeeOvertimeRuleEnabled === undefined
    ? null
    : Boolean(body.employeeOvertimeRuleEnabled);

  if (overtimeHourlyFee !== null && (!Number.isFinite(overtimeHourlyFee) || overtimeHourlyFee < 0)) {
    throw new Error("EMPLOYEE_OVERTIME_HOURLY_FEE_INVALID");
  }

  return {
    overtime_hourly_fee: overtimeHourlyFee,
    overtime_rule_enabled: overtimeRuleEnabled
  };
}

function isMissingEmployeeOvertimeSettingsSchemaError(error) {
  const message = String(error?.message || error || "");
  return (
    message.includes("overtime_hourly_fee")
    || message.includes("overtime_rule_enabled")
  );
}

async function fetchCalculationContext(yearMonth, ownerUserId) {
  const { periodStartDate, periodEndDate } = getMonthRange(yearMonth);
  const [employeesResult, recordsResult, calculationsResult, summariesResult, attendanceConfig] = await Promise.all([
    supabase.from("employees").select("*").eq("owner_user_id", ownerUserId).order("id", { ascending: true }),
    supabase.from("attendance_records").select("*").eq("owner_user_id", ownerUserId).gte("date", periodStartDate).lte("date", periodEndDate),
    supabase.from("attendance_calculation_results").select("*").eq("owner_user_id", ownerUserId).gte("date", periodStartDate).lte("date", periodEndDate),
    supabase.from("monthly_attendance_summaries").select("*").eq("owner_user_id", ownerUserId).eq("year_month", yearMonth),
    resolveAttendanceConfig(ownerUserId)
  ]);

  for (const result of [employeesResult, recordsResult, calculationsResult, summariesResult]) {
    if (result.error) {
      throw result.error;
    }
  }

  const employees = employeesResult.data;
  const employeeMap = new Map(employees.map((row) => [Number(row.id), row]));
  const recordMap = new Map(recordsResult.data.map((row) => [`${row.employee_id}:${toDateKey(row.date)}`, row]));
  const calculationMap = new Map(calculationsResult.data.map((row) => [`${row.employee_id}:${toDateKey(row.date)}`, row]));
  const summaryMap = new Map(summariesResult.data.map((row) => [Number(row.employee_id), row]));

  return {
    employees,
    employeeMap,
    recordMap,
    attendanceConfig,
    calculationMap,
    summaryMap
  };
}


function omitUnsupportedAttendanceMetadataForLegacySchema(payload) {
  const { meal_allowance_amount, calculation_phase, generated_by, settled_at, ...legacyPayload } = payload;
  return legacyPayload;
}

function isMissingAttendanceMetadataSchemaError(error) {
  const message = String(error?.message || error || "");
  return ["meal_allowance_amount", "calculation_phase", "generated_by", "settled_at"].some((column) => message.includes(column));
}

async function upsertAttendanceCalculation(payload) {
  const existing = await supabase
    .from("attendance_calculation_results")
    .select("id")
    .eq("owner_user_id", payload.owner_user_id)
    .eq("employee_id", payload.employee_id)
    .eq("date", payload.date)
    .maybeSingle();

  if (existing.error) {
    throw existing.error;
  }

  async function writeCalculation(writePayload) {
    if (existing.data?.id) {
      return supabase
        .from("attendance_calculation_results")
        .update(writePayload)
        .eq("id", existing.data.id)
        .select("*")
        .single();
    }

    return supabase
      .from("attendance_calculation_results")
      .insert({
        ...writePayload,
        created_at: new Date().toISOString()
      })
      .select("*")
      .single();
  }

  let { data, error } = await writeCalculation(payload);

  if (error && isMissingAttendanceMetadataSchemaError(error)) {
    // 当前测试库可能尚未应用最新考勤元数据迁移；这里仅降级写入旧表已有字段，保证打卡/重算不中断。
    // 迁移落库后会自动写入 draft/settled 元数据，不要长期依赖这个兼容分支。
    ({ data, error } = await writeCalculation(omitUnsupportedAttendanceMetadataForLegacySchema(payload)));
  }

  if (error) {
    throw error;
  }

  return data;
}

async function upsertMonthlySummary(payload) {
  const existing = await supabase
    .from("monthly_attendance_summaries")
    .select("id")
    .eq("owner_user_id", payload.owner_user_id)
    .eq("employee_id", payload.employee_id)
    .eq("year_month", payload.year_month)
    .maybeSingle();

  if (existing.error) {
    throw existing.error;
  }

  if (existing.data?.id) {
    const { data, error } = await supabase
      .from("monthly_attendance_summaries")
      .update(payload)
      .eq("id", existing.data.id)
      .select("*")
      .single();
    if (error) {
      throw error;
    }
    return data;
  }

  const { data, error } = await supabase
    .from("monthly_attendance_summaries")
    .insert({
      ...payload,
      created_at: new Date().toISOString()
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

async function recalculateDailyAttendance(employeeId, date, ownerUserId, context = null, options = {}) {
  const effectiveContext = context || await fetchCalculationContext(date.slice(0, 7), ownerUserId);
  const employee = effectiveContext.employeeMap.get(Number(employeeId));

  if (!employee) {
    throw new Error("EMPLOYEE_NOT_FOUND");
  }

  const record = effectiveContext.recordMap.get(`${employeeId}:${date}`) || null;
  // v2 日计算只依赖当前账号唯一 attendance_config，不再读取员工规则历史或多条 attendance_rules。
  // 这是考勤计算模块的唯一入口；不要为兼容旧规则模型在这里恢复规则匹配逻辑。
  const payload = calculateV2DailyAttendanceRow(employee, record, effectiveContext.attendanceConfig, date, ownerUserId, options);
  const isDraftPhase = payload.status === "pending" || payload.status === "checked_in";
  // 底稿/结算元数据在服务边界统一补齐，避免纯计算函数为了不同调用方分叉出多套 payload 结构。
  payload.calculation_phase = isDraftPhase ? "draft" : "settled";
  payload.generated_by = options.generatedBy || (isDraftPhase ? "draft_job" : "calculation");
  payload.settled_at = isDraftPhase ? null : new Date().toISOString();

  const row = await upsertAttendanceCalculation(payload);
  effectiveContext.calculationMap.set(`${employeeId}:${date}`, row);
  return mapAttendanceCalculationRow(row, effectiveContext.employeeMap);
}

async function recalculateMonthlyAttendance(yearMonth, ownerUserId, targetEmployeeId = null) {
  const context = await fetchCalculationContext(yearMonth, ownerUserId);
  // 指定员工重算也不能绕过离职/禁用过滤；删除员工后只保留历史数据，不再进入当期考勤刷新。
  const employees = targetEmployeeId
    ? context.employees.filter((row) => Number(row.id) === Number(targetEmployeeId) && isEmployeeAvailableForAttendanceAndPayroll(row))
    : context.employees.filter(isEmployeeAvailableForAttendanceAndPayroll);
  const dates = enumerateMonthDates(yearMonth);

  for (const employee of employees) {
    const applicableDates = dates.filter((date) => shouldCalculateEmployeeDate(employee, date));
    const skippedDates = dates.filter((date) => !shouldCalculateEmployeeDate(employee, date));

    if (skippedDates.length > 0) {
      const { error: deleteError } = await supabase
        .from("attendance_calculation_results")
        .delete()
        .eq("owner_user_id", ownerUserId)
        .eq("employee_id", Number(employee.id))
        .in("date", skippedDates);

      if (deleteError) {
        throw deleteError;
      }

      skippedDates.forEach((date) => {
        context.calculationMap.delete(`${employee.id}:${date}`);
      });
    }

    for (const date of applicableDates) {
      await recalculateDailyAttendance(Number(employee.id), date, ownerUserId, context, {
        // 月度刷新也服务考勤页当天过程跟踪；业务地今天没有打卡记录时保持 pending，昨天及以前才正式落为 absent。
        // 薪资和月汇总只读取沉淀结果，不应在前端再把 pending 二次推导成缺勤。
        pendingIfNoRecord: date === getBangkokDateKey(),
        inProgressIfMissingOut: date === getBangkokDateKey(),
        generatedBy: date === getBangkokDateKey() ? "draft_job" : "manual_recalculate"
      });
    }
  }

  const summaries = [];
  const { periodStartDate, periodEndDate } = getMonthRange(yearMonth);
  for (const employee of employees) {
    const employeeId = Number(employee.id);
    const rows = dates
      .filter((date) => shouldCalculateEmployeeDate(employee, date))
      .map((date) => context.calculationMap.get(`${employeeId}:${date}`))
      .filter(Boolean)
      // pending/checked_in 是当天过程态，只服务考勤列表跟踪；月汇总和薪资输入必须排除，避免把未结算底稿当成可发薪结果。
      .filter((row) => row.status !== "pending" && row.status !== "checked_in");

    const summaryPayload = {
      owner_user_id: ownerUserId,
      employee_id: employeeId,
      year_month: yearMonth,
      period_start_date: periodStartDate,
      period_end_date: periodEndDate,
      total_raw_hours: roundToTwo(rows.reduce((sum, row) => sum + Number(row.raw_hours), 0)),
      total_break_deduction_hours: roundToTwo(rows.reduce((sum, row) => sum + Number(row.break_deduction_hours), 0)),
      total_valid_hours: roundToTwo(rows.reduce((sum, row) => sum + Number(row.valid_hours), 0)),
      total_standard_hours: roundToTwo(rows.reduce((sum, row) => sum + Number(row.standard_hours), 0)),
      total_overtime_raw_hours: roundToTwo(rows.reduce((sum, row) => sum + Number(row.overtime_raw_hours), 0)),
      total_overtime_pay_hours: roundToTwo(rows.reduce((sum, row) => sum + Number(row.overtime_pay_hours), 0)),
      record_count: rows.filter((row) => row.attendance_record_id !== null).length,
      exception_count: rows.filter((row) => row.has_exception).length,
      absent_count: rows.filter((row) => row.status === "absent").length,
      // 病假不计工时，但月汇总仍归入请假类计数；若后续要单独统计病假，应先给 monthly_attendance_summaries 增加独立字段。
      leave_count: rows.filter((row) => row.status === "leave" || row.status === "sick_leave").length,
      manual_adjusted_count: rows.filter((row) => row.status === "manual_adjusted").length,
      // 异常考勤本身已经在日计算行里按 0 工时/0 费用沉淀，薪资核算不再因此阻断；但月汇总保留说明给薪资列表提示。
      can_generate_payroll: true,
      blocked_reason: rows.some((row) => row.has_exception) ? `异常考勤 ${rows.filter((row) => row.has_exception).length} 条，已按 0 工时/0 费用计入薪资` : null,
      calculated_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const summaryRow = await upsertMonthlySummary(summaryPayload);
    context.summaryMap.set(employeeId, summaryRow);
    summaries.push(mapAttendanceSummaryRow(summaryRow, context.employeeMap));
  }

  return summaries;
}

function scheduleAttendanceRecalculation(ownerUserId, employeeId, date) {
  void (async () => {
    try {
      await recalculateDailyAttendance(employeeId, date, ownerUserId);
      await recalculateMonthlyAttendance(date.slice(0, 7), ownerUserId, employeeId);
    } catch (error) {
      console.error("[admin/attendance-records] async recalculate failed", {
        ownerUserId,
        employeeId,
        date,
        message: error?.message || String(error)
      });
    }
  })();
}

async function fetchAttendanceTargetEmployees(ownerUserId = null) {
  let query = supabase
    .from("employees")
    .select("*")
    .eq("is_deleted", false)
    // 历史 demo 数据可能没有 owner_user_id；跨账号 cron 只能处理已绑定账号的数据，避免 null 被传入账号级配置查询导致整批任务中断。
    .not("owner_user_id", "is", null)
    .order("owner_user_id", { ascending: true })
    .order("id", { ascending: true });

  if (ownerUserId) {
    query = query.eq("owner_user_id", ownerUserId);
  }

  const { data, error } = await query;
  if (error) {
    throw error;
  }

  return (data || []).filter(isEmployeeAvailableForAttendanceAndPayroll);
}

async function generateAttendanceDraftsForDate(date, ownerUserId = null) {
  const employees = (await fetchAttendanceTargetEmployees(ownerUserId))
    .filter((employee) => shouldCalculateEmployeeDate(employee, date, date));
  const ownerIds = [...new Set(employees.map((employee) => employee.owner_user_id))];
  const failures = [];
  let successCount = 0;

  for (const ownerId of ownerIds) {
    const context = await fetchCalculationContext(date.slice(0, 7), ownerId);
    for (const employee of employees.filter((row) => row.owner_user_id === ownerId)) {
      try {
        // 当天底稿通过同一个日计算入口生成，保证后续打卡/结算不会出现另一套隐藏口径；只传 pending 选项表示过程态。
        await recalculateDailyAttendance(Number(employee.id), date, ownerId, context, {
          pendingIfNoRecord: true,
          inProgressIfMissingOut: true,
          generatedBy: "draft_job"
        });
        successCount += 1;
      } catch (error) {
        failures.push({ ownerUserId: ownerId, employeeId: Number(employee.id), date, error: error.message || "底稿生成失败" });
      }
    }
  }

  return {
    date,
    ownerCount: ownerIds.length,
    targetEmployeeCount: employees.length,
    successCount,
    failureCount: failures.length,
    failures
  };
}

async function settleAttendanceForDate(date, ownerUserId = null) {
  const employees = (await fetchAttendanceTargetEmployees(ownerUserId))
    .filter((employee) => shouldCalculateEmployeeDate(employee, date, date));
  const ownerIds = [...new Set(employees.map((employee) => employee.owner_user_id))];
  const failures = [];
  let successCount = 0;

  for (const ownerId of ownerIds) {
    const context = await fetchCalculationContext(date.slice(0, 7), ownerId);
    for (const employee of employees.filter((row) => row.owner_user_id === ownerId)) {
      try {
        // 正式结算不传 pending/checked_in 过程态选项：无打卡会落缺勤，缺下班会落异常，人工记录仍按 source/manual 保护。
        await recalculateDailyAttendance(Number(employee.id), date, ownerId, context, {
          generatedBy: "settlement_job"
        });
        successCount += 1;
      } catch (error) {
        failures.push({ ownerUserId: ownerId, employeeId: Number(employee.id), date, error: error.message || "前日结算失败" });
      }
    }

    try {
      await recalculateMonthlyAttendance(date.slice(0, 7), ownerId);
    } catch (error) {
      failures.push({ ownerUserId: ownerId, date, error: error.message || "月度汇总刷新失败" });
    }
  }

  return {
    date,
    ownerCount: ownerIds.length,
    targetEmployeeCount: employees.length,
    successCount,
    failureCount: failures.length,
    failures
  };
}

async function runDailyAttendanceMaintenance({ previousDate, todayDate, ownerUserId = null } = {}) {
  const cronDates = getAttendanceCronDates();
  const targetPreviousDate = previousDate || cronDates.previousDate;
  const targetTodayDate = todayDate || cronDates.todayDate;
  // 每日任务顺序固定为先结算昨天、再生成今天底稿；不要反过来，否则月初零点补跑时可能把过程态误带入历史汇总。
  const settlement = await settleAttendanceForDate(targetPreviousDate, ownerUserId);
  const draft = await generateAttendanceDraftsForDate(targetTodayDate, ownerUserId);
  return {
    previousDate: targetPreviousDate,
    todayDate: targetTodayDate,
    settlement,
    draft
  };
}

function normalizeSalaryAmount(value) {
  return value === null || value === undefined || value === "" ? null : Number(value);
}

function buildSalaryProfilePayload(employee, ownerUserId, effectiveStartDate) {
  return {
    owner_user_id: ownerUserId,
    employee_id: Number(employee.id),
    salary_type: employee.salary_type,
    fixed_salary: normalizeSalaryAmount(employee.fixed_salary),
    hourly_rate: normalizeSalaryAmount(employee.hourly_rate),
    // 服务费比例会影响工资结果，必须进入 effective-dated salary_profiles；否则编辑员工比例后，历史/当月核算无法说明本次使用的比例。
    service_fee_rate: getNonNegativePayrollAmount(employee.service_fee_rate),
    currency: employee.currency,
    is_active: true,
    effective_start_date: effectiveStartDate,
    effective_end_date: null,
    updated_at: new Date().toISOString()
  };
}

function isSameSalaryProfile(profile, payload) {
  return (
    profile.salary_type === payload.salary_type &&
    normalizeSalaryAmount(profile.fixed_salary) === normalizeSalaryAmount(payload.fixed_salary) &&
    normalizeSalaryAmount(profile.hourly_rate) === normalizeSalaryAmount(payload.hourly_rate) &&
    // 服务费比例属于计薪口径的一部分；不比较会导致只改比例时薪资档案不更新，后续工资条无法追溯比例来源。
    getNonNegativePayrollAmount(profile.service_fee_rate) === getNonNegativePayrollAmount(payload.service_fee_rate) &&
    profile.currency === payload.currency
  );
}

async function fetchSalaryProfileForMonth(employeeId, yearMonth, ownerUserId) {
  const monthStartDate = getMonthStartDate(yearMonth);
  const monthEndDate = getMonthEndDate(yearMonth);
  const { data, error } = await supabase
    .from("salary_profiles")
    .select("*")
    .eq("owner_user_id", ownerUserId)
    .eq("employee_id", Number(employeeId))
    .lte("effective_start_date", monthEndDate)
    .order("effective_start_date", { ascending: false })
    .order("id", { ascending: false });

  if (error) {
    throw error;
  }

  return (data || []).find((profile) => !profile.effective_end_date || toDateKey(profile.effective_end_date) >= monthStartDate) || null;
}

async function ensureSalaryProfileForEmployee(employee, ownerUserId, requestedEffectiveStartDate = null) {
  const effectiveStartDate = requestedEffectiveStartDate || employee.join_date || getTodayDateKey();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(effectiveStartDate)) {
    throw new Error("薪资生效日期格式必须为 YYYY-MM-DD");
  }

  const payload = buildSalaryProfilePayload(employee, ownerUserId, effectiveStartDate);

  const existing = await supabase
    .from("salary_profiles")
    .select("*")
    .eq("owner_user_id", ownerUserId)
    .eq("employee_id", Number(employee.id))
    .eq("is_active", true)
    .is("effective_end_date", null)
    .order("effective_start_date", { ascending: false })
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing.error) {
    throw existing.error;
  }

  const activeProfile = existing.data || null;
  if (!activeProfile) {
    const { data, error } = await supabase
      .from("salary_profiles")
      .insert({
        ...payload,
        created_at: new Date().toISOString()
      })
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  if (isSameSalaryProfile(activeProfile, payload)) {
    return activeProfile;
  }

  const activeStartDate = activeProfile.effective_start_date ? toDateKey(activeProfile.effective_start_date) : null;
  if (activeStartDate && effectiveStartDate < activeStartDate) {
    throw new Error("薪资生效日期不能早于当前薪资档案开始日期");
  }

  if (activeStartDate === effectiveStartDate) {
    const { data, error } = await supabase
      .from("salary_profiles")
      .update(payload)
      .eq("owner_user_id", ownerUserId)
      .eq("id", Number(activeProfile.id))
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  const previousEndDate = getPreviousDate(effectiveStartDate);
  const { error: closeError } = await supabase
    .from("salary_profiles")
    .update({
      is_active: false,
      effective_end_date: previousEndDate,
      updated_at: new Date().toISOString()
    })
    .eq("owner_user_id", ownerUserId)
    .eq("employee_id", Number(employee.id))
    .eq("is_active", true)
    .is("effective_end_date", null);

  if (closeError) {
    throw closeError;
  }

  const { data, error } = await supabase
    .from("salary_profiles")
    .insert({
      ...payload,
      created_at: new Date().toISOString()
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

function getNonNegativePayrollAmount(value) {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
}

function calculateEmployeeSocialSecurity(employee, dailyCalculations) {
  if (employee.is_dispatch_personnel) {
    // 派遣人员社保按“员工档案里输入的每日社保金额 × 当月有效出勤天数”扣除。
    // 薪资生成前已刷新 dailyCalculations，所以这里用 valid_hours > 0 作为计天口径。
    const workedDays = dailyCalculations.filter((row) => Number(row.valid_hours || 0) > 0).length;
    return roundToTwo(workedDays * getNonNegativePayrollAmount(employee.social_security));
  }

  // 非派遣人员按员工档案的月固定社保金额扣除。
  return getNonNegativePayrollAmount(employee.social_security);
}

function buildPayrollSalaryConfig(employee, salaryProfile) {
  const salaryType = (salaryProfile?.salary_type || employee.salary_type) === "fixed" ? "fixed" : "hourly";
  const fixedSalary = salaryType === "fixed"
    ? getNonNegativePayrollAmount(salaryProfile?.fixed_salary ?? employee.fixed_salary)
    : null;
  const hourlyRate = salaryType === "hourly"
    ? getNonNegativePayrollAmount(salaryProfile?.hourly_rate ?? employee.hourly_rate)
    : null;
  // 服务费比例优先读取当月薪资档案，保证工资结果按生效档案快照计算；老库/旧档案没有该列时再回退员工档案，避免线上迁移前后断算。
  const serviceFeeRate = getNonNegativePayrollAmount(salaryProfile?.service_fee_rate ?? employee.service_fee_rate);

  return {
    salaryType,
    fixedSalary,
    hourlyRate,
    serviceFeeRate,
    currency: salaryProfile?.currency || employee.currency || "THB"
  };
}

async function getPayrollSourceContext(employeeId, yearMonth, ownerUserId, options = {}) {
  const monthStartDate = getMonthStartDate(yearMonth);
  const monthEndDate = getMonthEndDate(yearMonth);
  const existingPayrollResult = options.existingPayrollResult || null;
  const allowProfileCreate = options.allowProfileCreate ?? false;

  const baseQueries = [
    supabase.from("employees").select("*").eq("owner_user_id", ownerUserId).eq("id", Number(employeeId)).maybeSingle(),
    supabase.from("monthly_attendance_summaries").select("*").eq("owner_user_id", ownerUserId).eq("employee_id", Number(employeeId)).eq("year_month", yearMonth).limit(1),
    supabase.from("salary_adjustment_items").select("*").eq("owner_user_id", ownerUserId).eq("employee_id", Number(employeeId)).eq("year_month", yearMonth).order("created_at", { ascending: false }),
    supabase.from("attendance_calculation_results").select("date, status, valid_hours, overtime_pay_hours, overtime_pay, has_exception, exception_reason, note").eq("owner_user_id", ownerUserId).eq("employee_id", Number(employeeId)).gte("date", `${yearMonth}-01`).lte("date", monthEndDate),
    supabase.from("salary_profiles").select("*").eq("owner_user_id", ownerUserId).eq("employee_id", Number(employeeId)).lte("effective_start_date", monthEndDate).order("effective_start_date", { ascending: false }).order("id", { ascending: false })
  ];
  if (!existingPayrollResult) {
    baseQueries.push(
      supabase.from("monthly_payroll_results").select("*").eq("owner_user_id", ownerUserId).eq("employee_id", Number(employeeId)).eq("year_month", yearMonth).maybeSingle()
    );
  }

  const [employeeResult, summaryRowsResult, adjustmentItemsResult, dailyCalculationsResult, salaryProfilesResult, existingResult] = await Promise.all(baseQueries);

  for (const result of [employeeResult, summaryRowsResult, adjustmentItemsResult, dailyCalculationsResult, salaryProfilesResult, existingResult].filter(Boolean)) {
    if (result.error) {
      throw result.error;
    }
  }

  if (!employeeResult.data) {
    throw new Error("EMPLOYEE_NOT_FOUND");
  }

  const employee = employeeResult.data;
  let salaryProfile = (salaryProfilesResult.data || []).find((profile) => !profile.effective_end_date || toDateKey(profile.effective_end_date) >= monthStartDate) || null;
  if (!salaryProfile && allowProfileCreate) {
    const ensuredProfile = await ensureSalaryProfileForEmployee(employee, ownerUserId, employee.join_date || getTodayDateKey());
    const monthEndDateForProfile = getMonthEndDate(yearMonth);
    const profileStartDate = ensuredProfile.effective_start_date ? toDateKey(ensuredProfile.effective_start_date) : null;
    const profileEndDate = ensuredProfile.effective_end_date ? toDateKey(ensuredProfile.effective_end_date) : null;
    salaryProfile = profileStartDate && profileStartDate <= monthEndDateForProfile && (!profileEndDate || profileEndDate >= monthStartDate)
      ? ensuredProfile
      : null;
  }
  const attendanceSummary = summaryRowsResult.data?.[0] || null;
  const adjustmentItems = adjustmentItemsResult.data || [];
  const resolvedExistingPayrollResult = existingPayrollResult || existingResult?.data || null;

  return {
    employee,
    salaryProfile,
    attendanceSummary,
    adjustmentItems,
    dailyCalculations: dailyCalculationsResult.data || [],
    existingPayrollResult: resolvedExistingPayrollResult
  };
}

async function upsertMonthlyPayrollResult(payload) {
  const existing = await supabase
    .from("monthly_payroll_results")
    .select("id")
    .eq("owner_user_id", payload.owner_user_id)
    .eq("employee_id", payload.employee_id)
    .eq("year_month", payload.year_month)
    .maybeSingle();

  if (existing.error) {
    throw existing.error;
  }

  if (existing.data?.id) {
    const { data, error } = await supabase
      .from("monthly_payroll_results")
      .update(payload)
      .eq("id", Number(existing.data.id))
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  const { data, error } = await supabase
    .from("monthly_payroll_results")
    .insert({
      ...payload,
      created_at: new Date().toISOString()
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

function buildMonthlyPayrollPayloadFromContext(context, yearMonth, ownerUserId, { forceRecalculate = false, previewOnly = false } = {}) {
  const { employee, salaryProfile, attendanceSummary, adjustmentItems, dailyCalculations, existingPayrollResult } = context;
  const salaryConfig = buildPayrollSalaryConfig(employee, salaryProfile);
  const allowanceTotal = sumBy(adjustmentItems, (item) => item.type === "allowance");
  const deductionTotal = sumBy(adjustmentItems, (item) => item.type === "deduction");
  const otherTotal = sumBy(adjustmentItems, (item) => item.type === "other");
  // 全勤奖只在“该月每个应计算日都完整上班”时发放；请假、缺勤、异常、半天班都会清空。
  const attendanceBonus = shouldGrantAttendanceBonus(dailyCalculations, yearMonth)
    ? getNonNegativePayrollAmount(employee.attendance_bonus)
    : 0;
  const socialSecurity = calculateEmployeeSocialSecurity(employee, dailyCalculations);
  const validHours = Number(attendanceSummary?.total_valid_hours || 0);
  const standardHours = Number(attendanceSummary?.total_standard_hours || 0);
  const overtimePayHours = Number(attendanceSummary?.total_overtime_pay_hours || 0);
  const hourlyRate = salaryConfig.hourlyRate;
  const fixedSalary = salaryConfig.fixedSalary;
  const standardPaidHours = Math.max(0, validHours - overtimePayHours);
  const hourlyPay = salaryConfig.salaryType === "hourly" ? roundToTwo(standardPaidHours * Number(hourlyRate || 0)) : 0;
  const basePay = salaryConfig.salaryType === "fixed" ? Number(fixedSalary || 0) : hourlyPay;
  // 服务费比例使用当月薪资档案快照；生成结果沉淀金额，列表/工资条都读 service_fee_amount，避免员工后续改比例影响历史工资。
  const serviceFeeAmount = roundToTwo(basePay * salaryConfig.serviceFeeRate / 100);
  const overtimePay = attendanceSummary
    ? roundToTwo(dailyCalculations.reduce((sum, row) => sum + Number(row.overtime_pay || 0), 0))
    : 0;
  const effectiveAttendanceDays = countEffectiveAttendanceDays(dailyCalculations);
  const mealAllowanceDayUnits = calculateMealAllowanceDayUnits(dailyCalculations);
  // 餐补按“单日餐补 × 折算出勤天数”进入月薪；满勤一天算 1，半天算 0.5，请假/缺勤/异常仍为 0。
  const mealAllowanceTotal = roundToTwo(getNonNegativePayrollAmount(employee.meal_allowance) * mealAllowanceDayUnits);
  const grossPay = roundToTwo(basePay + serviceFeeAmount + overtimePay + attendanceBonus + mealAllowanceTotal + allowanceTotal + otherTotal);
  const totalDeduction = roundToTwo(socialSecurity + deductionTotal);
  const netPay = roundToTwo(grossPay - totalDeduction);
  const exceptionCount = Number(attendanceSummary?.exception_count || 0);
  const payrollExceptionNote = exceptionCount > 0
    ? (attendanceSummary?.blocked_reason || `异常考勤 ${exceptionCount} 条，已按 0 工时/0 费用计入薪资`)
    : null;

  return {
    employee_id: Number(employee.id),
    owner_user_id: ownerUserId,
    year_month: yearMonth,
    salary_type: salaryConfig.salaryType,
    fixed_salary: fixedSalary,
    hourly_rate: hourlyRate,
    currency: salaryConfig.currency,
    // 这些字段仅作为接口响应的展示补充，不入库；写库仍只使用 monthly_payroll_results 已存在列，避免为一个展示修正扩大数据库变更范围。
    effective_attendance_days: effectiveAttendanceDays,
    meal_allowance_day_units: mealAllowanceDayUnits,
    meal_allowance_total: mealAllowanceTotal,
    attendance_bonus_amount: attendanceBonus,
    valid_hours: roundToTwo(validHours),
    standard_hours: roundToTwo(standardHours),
    hourly_pay: roundToTwo(hourlyPay),
    overtime_pay_hours: roundToTwo(overtimePayHours),
    overtime_pay: overtimePay,
    allowance_total: allowanceTotal,
    deduction_total: deductionTotal,
    other_total: otherTotal,
    social_security_amount: socialSecurity,
    service_fee_amount: serviceFeeAmount,
    gross_pay: grossPay,
    total_deduction: totalDeduction,
    net_pay: netPay,
    // 异常考勤不再阻断薪资：异常日的日计算行已经是 0 工时/0 费用，这里只把说明沉淀给列表和工资条追溯。
    calculation_status: previewOnly ? "draft" : "calculated",
    review_status: forceRecalculate || existingPayrollResult ? "pending" : (existingPayrollResult?.review_status || "pending"),
    blocked_reason: payrollExceptionNote,
    calculated_at: previewOnly ? null : new Date().toISOString(),
    confirmed_at: existingPayrollResult?.calculation_status === "confirmed" ? existingPayrollResult.confirmed_at : null,
    updated_at: new Date().toISOString()
  };
}

async function calculateMonthlyPayroll(employeeId, yearMonth, ownerUserId, { skipExisting = false, forceRecalculate = false } = {}) {
  // 薪资生成入口先校验员工状态，防止前端或历史按钮显式传 employeeId 时绕过批量接口过滤。
  await assertEmployeeAvailableForAttendanceAndPayroll(employeeId, ownerUserId);
  await recalculateMonthlyAttendance(yearMonth, ownerUserId, Number(employeeId));

  const context = await getPayrollSourceContext(employeeId, yearMonth, ownerUserId, { allowProfileCreate: true });
  const { employee, attendanceSummary, existingPayrollResult } = context;

  if (skipExisting && existingPayrollResult) {
    return {
      row: existingPayrollResult,
      skipped: true
    };
  }

  // 异常考勤已经由日计算行按 0 工时/0 费用进入汇总；薪资重算只保留说明，不再把异常作为生成阻断条件。
  const lockError = getPayrollResultLockError(existingPayrollResult);
  if (lockError) {
    throw new Error(lockError);
  }

  const employeeMap = new Map([[Number(employee.id), employee]]);
  const payload = buildMonthlyPayrollPayloadFromContext(context, yearMonth, ownerUserId, { forceRecalculate });
  const {
    effective_attendance_days,
    meal_allowance_day_units,
    meal_allowance_total,
    attendance_bonus_amount,
    ...dbPayload
  } = payload;
  const row = await upsertMonthlyPayrollResult(dbPayload);

  return {
    row,
    mapped: mapPayrollResultRow({ ...row, effective_attendance_days, meal_allowance_day_units, meal_allowance_total, attendance_bonus_amount }, employeeMap),
    skipped: false
  };
}

async function fetchPayrollResultDetail(resultId, ownerUserId) {
  const requestStartedAt = Date.now();
  const { data: row, error } = await supabase
    .from("monthly_payroll_results")
    .select("*")
    .eq("owner_user_id", ownerUserId)
    .eq("id", Number(resultId))
    .single();

  if (error) {
    throw error;
  }

  const contextStartedAt = Date.now();
  const [context, attendanceConfig] = await Promise.all([
    getPayrollSourceContext(Number(row.employee_id), row.year_month, ownerUserId, { existingPayrollResult: row }),
    resolveAttendanceConfig(ownerUserId)
  ]);
  const contextDurationMs = Date.now() - contextStartedAt;
  const employeeMap = new Map([[Number(context.employee.id), context.employee]]);
  const liveResultRow = buildLivePayrollListRow(
    // 详情和列表需要保持同一实时计算口径；详情页不能再直接回显历史沉淀金额，否则用户会看到列表与工资条不一致。
    buildMonthlyPayrollPayloadFromContext(context, row.year_month, ownerUserId, { previewOnly: true }),
    row
  );

  const payload = {
    result: mapPayrollResultRow(liveResultRow, employeeMap),
    employee: mapEmployeeRow(context.employee),
    salaryProfile: context.salaryProfile ? mapSalaryProfileRow(context.salaryProfile) : null,
    attendanceSummary: context.attendanceSummary ? mapAttendanceSummaryRow(context.attendanceSummary, employeeMap) : null,
    dailyStandardHours: Number(attendanceConfig?.standard_hours ?? DEFAULT_ATTENDANCE_CONFIG.standard_hours),
    adjustmentItems: context.adjustmentItems.map(mapSalaryAdjustmentItemRow)
  };
  const totalDurationMs = Date.now() - requestStartedAt;
  if (totalDurationMs >= 400) {
    console.info("[admin/payroll-result-detail] slow request", {
      ownerUserId,
      resultId,
      employeeId: Number(row.employee_id),
      yearMonth: row.year_month,
      dailyCalculationCount: context.dailyCalculations.length,
      adjustmentItemCount: context.adjustmentItems.length,
      contextDurationMs,
      totalDurationMs
    });
  }

  return payload;
}

function normalizeEmployeePayload(body, authUser) {
  return {
    name: body.name,
    nickname: String(body.nickname || "").trim(),
    gender: body.gender,
    country: body.country,
    phone: body.phone,
    role: body.role,
    dept: body.dept,
    joinDate: body.joinDate,
    status: body.status,
    salaryType: body.salaryType,
    hourlyRate: body.hourlyRate === null || body.hourlyRate === "" ? null : Number(body.hourlyRate),
    fixedSalary: body.fixedSalary === null || body.fixedSalary === "" ? null : Number(body.fixedSalary),
    isDispatchPersonnel: Boolean(body.isDispatchPersonnel),
    attendanceBonus: body.attendanceBonus === null || body.attendanceBonus === "" || body.attendanceBonus === undefined ? 0 : Number(body.attendanceBonus),
    socialSecurity: body.socialSecurity === null || body.socialSecurity === "" || body.socialSecurity === undefined ? 0 : Number(body.socialSecurity),
    mealAllowance: body.mealAllowance === null || body.mealAllowance === "" || body.mealAllowance === undefined ? 0 : Number(body.mealAllowance),
    serviceFeeRate: body.serviceFeeRate === null || body.serviceFeeRate === "" || body.serviceFeeRate === undefined ? 0 : Number(body.serviceFeeRate),
    salaryEffectiveStartDate: body.salaryEffectiveStartDate || body.joinDate,
    currency: body.currency,
    photo: Object.prototype.hasOwnProperty.call(body || {}, "photo") ? (body.photo || null) : undefined,
    createdBy: authUser?.email || null
  };
}

function isSupportedEmployeeStatus(status) {
  return ["active", "on_leave", "probation", "resigned"].includes(String(status));
}

function validateEmployeeAmountPayload(payload) {
  // v2 员工弹窗只要求金额不小于 0、不设最大值；后端同步校验，避免绕过前端时触发数据库约束错误。
  const amounts = [payload.hourlyRate, payload.fixedSalary, payload.attendanceBonus, payload.socialSecurity, payload.mealAllowance, payload.serviceFeeRate];
  if (amounts.some((amount) => amount !== null && (Number.isNaN(Number(amount)) || Number(amount) < 0))) {
    return "金额必须大于等于 0";
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(payload.joinDate || ""))) {
    return "入职日期格式不正确";
  }
  if (isFutureDateKey(payload.joinDate)) {
    return "入职日期不能晚于今天";
  }
  if (payload.salaryEffectiveStartDate) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(payload.salaryEffectiveStartDate || ""))) {
      return "薪资生效日期格式不正确";
    }
    if (isFutureDateKey(payload.salaryEffectiveStartDate)) {
      return "薪资生效日期不能晚于今天";
    }
  }
  if (!isSupportedEmployeeStatus(payload.status)) {
    return "员工状态不合法";
  }
  return null;
}

async function createEmployeeRecord(payload, authUser) {
  const ownerUserId = authUser.id;
  const compatibilityRuleId = payload.attendanceRuleId || await getEmployeeCompatibilityAttendanceRuleId(ownerUserId);
  const employeeInsert = {
    owner_user_id: ownerUserId,
    employee_no: generateEmployeeNo(),
    name: payload.name,
    nickname: payload.nickname,
    gender: payload.gender,
    country: payload.country,
    phone: payload.phone,
    role: payload.role,
    dept: payload.dept,
    join_date: payload.joinDate,
    status: payload.status,
    // 初始化和旧接口仍依赖 employees.attendance_rule_id 作为考勤计算入口；
    // 即使员工 v2 前端不再编辑规则，也必须在创建时写入后端兼容规则，避免初始化员工无规则导致考勤/薪资为空。
    attendance_rule_id: compatibilityRuleId,
    salary_type: payload.salaryType,
    hourly_rate: payload.hourlyRate,
    fixed_salary: payload.fixedSalary,
    is_dispatch_personnel: payload.isDispatchPersonnel,
    attendance_bonus: payload.attendanceBonus,
    social_security: payload.socialSecurity,
    meal_allowance: payload.mealAllowance,
    service_fee_rate: payload.serviceFeeRate,
    currency: payload.currency,
    photo: payload.photo,
    is_deleted: false
  };

  const { data: employeeRow, error: employeeError } = await supabase
    .from("employees")
    .insert(employeeInsert)
    .select("*")
    .single();

  if (employeeError) {
    throw employeeError;
  }


  await ensureSalaryProfileForEmployee(employeeRow, ownerUserId, payload.salaryEffectiveStartDate || payload.joinDate);
  // 每次新增员工必须同步初始化一个员工端 App 账号；账号默认取员工编号，密码统一为 Aa123456，确保 Admin 创建员工后可立即复制给员工登录。
  await ensureEmployeeAppAccount(employeeRow, ownerUserId);
  clearEmployeeCaches();
  clearDashboardCache(ownerUserId);
  clearPayrollResultsCache(ownerUserId);
  return employeeRow;
}

async function updateEmployeeRecord(employeeId, payload, authUser) {
  const ownerUserId = authUser.id;
  const requestStartedAt = Date.now();
  const { data: existingEmployee, error: existingError } = await supabase
    .from("employees")
    .select("id, owner_user_id, attendance_rule_id, join_date, salary_type, hourly_rate, fixed_salary, service_fee_rate, currency, is_dispatch_personnel")
    .eq("owner_user_id", ownerUserId)
    .eq("id", employeeId)
    .single();

  if (existingError) {
    throw existingError;
  }

  // 员工 v2 不再编辑考勤规则；编辑保存时沿用已有兼容规则，避免重新暴露旧规则模型，同时修复保存 payload 引用未定义规则 ID 的问题。
  const compatibilityRuleId = existingEmployee.attendance_rule_id || await getEmployeeCompatibilityAttendanceRuleId(ownerUserId);
  const shouldRefreshSalaryProfile = didEmployeePayrollFieldsChange(existingEmployee, payload);

  const updatePayload = {
    name: payload.name,
    nickname: payload.nickname,
    gender: payload.gender,
    country: payload.country,
    phone: payload.phone,
    role: payload.role,
    dept: payload.dept,
    join_date: payload.joinDate,
    status: payload.status,
    attendance_rule_id: compatibilityRuleId,
    salary_type: payload.salaryType,
    hourly_rate: payload.hourlyRate,
    fixed_salary: payload.fixedSalary,
    is_dispatch_personnel: payload.isDispatchPersonnel,
    attendance_bonus: payload.attendanceBonus,
    social_security: payload.socialSecurity,
    meal_allowance: payload.mealAllowance,
    service_fee_rate: payload.serviceFeeRate,
    currency: payload.currency
  };
  if (payload.photo !== undefined) {
    updatePayload.photo = payload.photo;
  }

  const { data: employeeRow, error: updateError } = await supabase
    .from("employees")
    .update(updatePayload)
    .eq("owner_user_id", ownerUserId)
    .eq("id", employeeId)
    .select("id, employee_no, name, nickname, gender, country, phone, role, dept, join_date, status, attendance_rule_id, salary_type, hourly_rate, fixed_salary, is_dispatch_personnel, attendance_bonus, social_security, meal_allowance, service_fee_rate, currency, photo, is_deleted")
    .single();

  if (updateError) {
    throw updateError;
  }

  // 员工 v2 保存不再改变考勤规则关系；旧 attendance_rule_id 仅由创建时的后端兼容值维护。
  if (shouldRefreshSalaryProfile) {
    await ensureSalaryProfileForEmployee(employeeRow, ownerUserId, payload.salaryEffectiveStartDate || payload.joinDate);
  }
  clearEmployeeCaches();
  clearDashboardCache(ownerUserId);
  clearPayrollResultsCache(ownerUserId);
  const totalDurationMs = Date.now() - requestStartedAt;
  if (totalDurationMs >= 300) {
    console.info("[admin/employees/update] slow request", {
      ownerUserId,
      employeeId: Number(employeeId),
      shouldRefreshSalaryProfile,
      hasPhoto: Boolean(payload.photo),
      totalDurationMs
    });
  }
  return employeeRow;
}

async function setEmployeeStatusRecord(employeeId, targetStatus, ownerUserId) {
  const { data, error } = await supabase
    .from("employees")
    .update({
      status: targetStatus,
      is_deleted: false
    })
    .eq("owner_user_id", ownerUserId)
    .eq("id", employeeId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  clearEmployeeCaches();
  clearDashboardCache(ownerUserId);
  clearPayrollResultsCache(ownerUserId);
  return data;
}

async function bootstrapWorkspaceData(ownerUserId, authUser) {
  const [bootstrapState, workspaceCounts] = await Promise.all([
    fetchWorkspaceBootstrapState(ownerUserId),
    fetchWorkspaceDataCounts(ownerUserId)
  ]);

  if (bootstrapState && hasWorkspaceData(workspaceCounts)) {
    return {
      created: false,
      yearMonth: getTodayDateKey().slice(0, 7),
      employeesCreated: 0,
      rulesCreated: 0,
      message: bootstrapState.created_demo_data
        ? "当前 Google 账号的业务数据已初始化过"
        : "当前 Google 账号已有后台数据，已跳过初始化"
    };
  }

  if (!bootstrapState && hasWorkspaceData(workspaceCounts)) {
    await upsertWorkspaceBootstrapState(ownerUserId, authUser, {
      bootstrapSource: "existing_data",
      createdDemoData: false
    });
    return {
      created: false,
      yearMonth: getTodayDateKey().slice(0, 7),
      employeesCreated: 0,
      rulesCreated: 0,
      message: "当前账号已有后台数据，已跳过初始化"
    };
  }

  // 如果状态表已有记录但员工和规则都为空，说明之前只写入了初始化状态或数据被清空；
  // 此时继续创建初始化数据，保证“一键初始化”以真实业务表是否为空作为最终判定。

  const yearMonth = getTodayDateKey().slice(0, 7);
  const dates = enumerateMonthDates(yearMonth).filter((date) => date <= getTodayDateKey()).slice(0, 3);

  const { data: rules, error: ruleError } = await supabase
    .from("attendance_rules")
    .insert([
      addOwnerPayload({
        name: "白班仓储规则",
        is_active: true,
        effective_start_date: `${yearMonth}-01`,
        effective_end_date: null,
        start_shift: "08:30",
        end_shift: "17:30",
        break_start: "12:00",
        break_end: "13:00",
        standard_hours: 8,
        overtime_enabled: true,
        ot_hourly_fee: 75,
        overtime_min_unit_hours: 0.5,
        overtime_rounding: "floor_to_half_hour",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, ownerUserId),
      addOwnerPayload({
        name: "晚班拣货规则",
        is_active: true,
        effective_start_date: `${yearMonth}-01`,
        effective_end_date: null,
        start_shift: "13:00",
        end_shift: "22:00",
        break_start: "18:00",
        break_end: "19:00",
        standard_hours: 8,
        overtime_enabled: true,
        ot_hourly_fee: 90,
        overtime_min_unit_hours: 0.5,
        overtime_rounding: "floor_to_half_hour",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, ownerUserId)
    ])
    .select("*");

  if (ruleError) {
    throw ruleError;
  }

  const [dayRule, nightRule] = rules;
  const employeePayloads = [
    {
      name: "员工 A",
      gender: "female",
      country: "TH",
      phone: "0800000001",
      role: "拣货员",
      dept: "A 区",
      joinDate: `${yearMonth}-01`,
      status: "active",
      attendanceRuleId: Number(dayRule.id),
      ruleEffectiveStartDate: `${yearMonth}-01`,
      salaryType: "hourly",
      hourlyRate: 320,
      fixedSalary: null,
      attendanceBonus: 0,
      socialSecurity: 0,
      currency: "THB",
      photo: null,
      createdBy: authUser.email || null
    },
    {
      name: "员工 B",
      gender: "male",
      country: "MM",
      phone: "0800000002",
      role: "组长",
      dept: "B 区",
      joinDate: `${yearMonth}-01`,
      status: "active",
      attendanceRuleId: Number(nightRule.id),
      ruleEffectiveStartDate: `${yearMonth}-01`,
      salaryType: "fixed",
      hourlyRate: null,
      fixedSalary: 18500,
      attendanceBonus: 0,
      socialSecurity: 0,
      currency: "THB",
      photo: null,
      createdBy: authUser.email || null
    }
  ];

  const employeeIds = [];
  for (const payload of employeePayloads) {
    const employeeId = await createEmployeeRecord(payload, authUser);
    employeeIds.push(employeeId);
  }

  const [employeeAId, employeeBId] = employeeIds;
  const attendanceSeed = [];
  if (dates[0]) {
    attendanceSeed.push(
      addOwnerPayload({
        employee_id: employeeAId,
        date: dates[0],
        in_time: "08:25",
        out_time: "18:10",
        type: "normal",
        source: "device",
        // 初始化数据会直接进入考勤和工资单详情；备注必须使用业务含义，不能暴露“初始化/示例”等开发过程文案。
        note: "正常加班",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, ownerUserId),
      addOwnerPayload({
        employee_id: employeeBId,
        date: dates[0],
        in_time: "13:00",
        out_time: "22:00",
        type: "normal",
        source: "device",
        // 初始化数据会直接进入考勤和工资单详情；备注必须使用业务含义，不能暴露“初始化/示例”等开发过程文案。
        note: "正常班次",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, ownerUserId)
    );
  }
  if (dates[1]) {
    attendanceSeed.push(
      addOwnerPayload({
        employee_id: employeeAId,
        date: dates[1],
        in_time: "08:40",
        out_time: null,
        type: "normal",
        source: "device",
        // 初始化数据会直接进入考勤和工资单详情；备注必须使用业务含义，不能暴露“初始化/示例”等开发过程文案。
        note: "缺下班卡",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, ownerUserId),
      addOwnerPayload({
        employee_id: employeeBId,
        date: dates[1],
        in_time: null,
        out_time: null,
        type: "leave",
        source: "manual",
        // 初始化数据会直接进入考勤和工资单详情；备注必须使用业务含义，不能暴露“初始化/示例”等开发过程文案。
        note: "请假",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, ownerUserId)
    );
  }
  if (dates[2]) {
    attendanceSeed.push(
      addOwnerPayload({
        employee_id: employeeAId,
        date: dates[2],
        in_time: "08:30",
        out_time: "17:35",
        type: "normal",
        source: "device",
        // 初始化数据会直接进入考勤和工资单详情；备注必须使用业务含义，不能暴露“初始化/示例”等开发过程文案。
        note: "标准工时",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, ownerUserId)
    );
  }

  if (attendanceSeed.length > 0) {
    const { error: attendanceError } = await supabase
      .from("attendance_records")
      .insert(attendanceSeed);

    if (attendanceError) {
      throw attendanceError;
    }
  }

  const { error: adjustmentError } = await supabase
    .from("salary_adjustment_items")
    .insert([
      addOwnerPayload({
        employee_id: employeeAId,
        year_month: yearMonth,
        type: "allowance",
        name: "餐补",
        amount: 350,
        // 工资条会展示一次性薪资项备注；默认薪资项不写初始化备注，避免业务页面出现开发/种子数据文案。
        note: "",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, ownerUserId),
      addOwnerPayload({
        employee_id: employeeBId,
        year_month: yearMonth,
        type: "other",
        name: "绩效奖金",
        amount: 500,
        // 工资条会展示一次性薪资项备注；默认薪资项不写初始化备注，避免业务页面出现开发/种子数据文案。
        note: "",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, ownerUserId)
    ]);

  if (adjustmentError) {
    throw adjustmentError;
  }

  await recalculateMonthlyAttendance(yearMonth, ownerUserId);
  for (const employeeId of employeeIds) {
    await calculateMonthlyPayroll(employeeId, yearMonth, ownerUserId, { forceRecalculate: true });
  }

  await upsertWorkspaceBootstrapState(ownerUserId, authUser, {
    bootstrapSource: "auto",
    createdDemoData: true
  });

  return {
    created: true,
    yearMonth,
    employeesCreated: employeeIds.length,
    rulesCreated: rules.length,
    message: "已为当前账号创建默认规则、员工、考勤和薪酬数据"
  };
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/cron/payroll-nightly", async (req, res) => {
  try {
    if (!isAuthorizedCronRequest(req)) {
      return res.status(401).json({ error: "未授权的定时任务请求" });
    }

    const requestedYearMonth = String(req.query.yearMonth || "");
    const yearMonth = /^\d{4}-\d{2}$/.test(requestedYearMonth) ? requestedYearMonth : getPayrollCronYearMonth();
    const result = await runNightlyPayrollCalculation(yearMonth);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message || "夜间薪资计算失败" });
  }
});

app.get("/api/cron/attendance-nightly", async (req, res) => {
  try {
    if (!isAuthorizedCronRequest(req)) {
      return res.status(401).json({ error: "未授权的定时任务请求" });
    }

    const requestedPreviousDate = String(req.query.previousDate || "");
    const requestedTodayDate = String(req.query.todayDate || "");
    const result = await runDailyAttendanceMaintenance({
      previousDate: /^\d{4}-\d{2}-\d{2}$/.test(requestedPreviousDate) ? requestedPreviousDate : undefined,
      todayDate: /^\d{4}-\d{2}-\d{2}$/.test(requestedTodayDate) ? requestedTodayDate : undefined
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message || "夜间考勤结算失败" });
  }
});

app.post("/api/public/lead-requests", async (req, res) => {
  try {
    const payload = normalizeLeadRequestPayload(req.body);
    const validationError = validateLeadRequestPayload(payload);

    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const { error } = await supabase
      .from("lead_requests")
      .insert({
        ...payload,
        created_at: new Date().toISOString()
      });

    if (error) {
      throw error;
    }

    res.status(201).json({
      success: true,
      message: "线索已提交，我们会尽快联系你"
    });
  } catch (error) {
    console.error("Create lead request failed", error);
    res.status(500).json({ error: error.message || "提交咨询失败" });
  }
});

app.get("/api/public/google-auth-url", async (req, res) => {
  try {
    if (!publicAuthClient) {
      return res.status(500).json({ error: "Supabase publishable key 未配置" });
    }

    const redirectTo = String(req.query.redirectTo || "");
    const validationError = validateGoogleAuthRedirectUrl(redirectTo);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const { data, error } = await publicAuthClient.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        skipBrowserRedirect: true
      }
    });

    if (error) {
      throw error;
    }

    if (!data?.url) {
      return res.status(500).json({ error: "未获取到 Google 授权地址" });
    }

    res.json({ url: data.url });
  } catch (error) {
    console.error("Create google auth url failed", error);
    res.status(500).json({ error: error.message || "生成 Google 授权地址失败" });
  }
});

app.post("/api/mobile/auth/login", async (req, res) => {
  try {
    const account = String(req.body?.account || "").trim();
    const password = String(req.body?.password || "");

    if (!account || !password) {
      return res.status(400).json({ error: "请输入 App 账号和密码" });
    }

    const result = await authenticateEmployeeAppAccount(account, password);
    res.json(result);
  } catch (error) {
    res.status(401).json({ error: error.message || "员工端登录失败" });
  }
});

app.get("/api/mobile/auth/me", requireEmployeeAppAuth, async (req, res) => {
  // 员工端后续 SOP/打卡接口都依赖同一套 req.employeeApp 鉴权上下文；先提供 me 接口作为 token 校验的可观察验收点。
  res.json({
    employee: mapEmployeeRow(req.employeeApp.employee),
    account: {
      id: req.employeeApp.accountId,
      employeeId: req.employeeApp.employeeId,
      ownerUserId: req.employeeApp.ownerUserId
    }
  });
});

app.get("/api/public/mobile-app-update", async (_req, res) => {
  try {
    // 门户下载区和移动端更新弹窗都走同一个无鉴权公开接口，避免两个入口各自维护不同路径或返回结构。
    // 这里继续只返回当前唯一最新对象，不扩成历史列表或灰度策略；如后续要做多平台，再先统一数据模型和调用方。
    res.json(await getMobileAndroidUpdatePayload());
  } catch (error) {
    res.status(500).json({ error: error.message || "Android 更新信息加载失败" });
  }
});

app.get("/api/mobile/app-update", async (_req, res) => {
  try {
    // 兼容已经发出的移动端版本；新代码统一改走 `/api/public/mobile-app-update`，避免继续把公开接口挂在非 public 路径下。
    res.json(await getMobileAndroidUpdatePayload());
  } catch (error) {
    res.status(500).json({ error: error.message || "Android 更新信息加载失败" });
  }
});

function normalizeMobileDate(value, fallbackDate = getBangkokDateKey()) {
  const raw = String(value || "").slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : fallbackDate;
}

function normalizeMobileTime(value, fallbackTime = getBangkokTimeKey()) {
  const candidate = String(value || "").slice(11, 16);
  return /^\d{2}:\d{2}$/.test(candidate) ? candidate : fallbackTime;
}

function buildMobileAttendanceNote({ action, locationName, latitude, longitude, accuracy, description, clientTime, clientTimeZone, clientTimezoneOffsetMinutes, serverTime }) {
  const parts = [
    `员工端${action === "check_in" ? "上班" : "下班"}打卡`,
    locationName ? `位置：${locationName}` : null,
    Number.isFinite(latitude) && Number.isFinite(longitude) ? `坐标：${latitude},${longitude}` : null,
    Number.isFinite(accuracy) ? `精度：${accuracy}m` : null,
    description ? `说明：${description}` : null,
    clientTime ? `客户端时间：${clientTime}` : null,
    clientTimeZone ? `客户端时区：${clientTimeZone}` : null,
    Number.isFinite(clientTimezoneOffsetMinutes) ? `客户端时区偏移：${clientTimezoneOffsetMinutes}` : null,
    serverTime ? `服务端入账时间：${serverTime}` : null
  ].filter(Boolean);
  // 当前 attendance_records 表没有独立定位/时区列；移动端定位、客户端时区和服务端入账时间先写入 note，保持 Admin 现有考勤计算和展示链路不被破坏。
  return parts.join("；");
}

function extractMobileAttendanceLocationName(note) {
  const rawNote = String(note || "").trim();
  if (!rawNote) {
    return null;
  }

  const matchedLocation = rawNote.match(/(?:^|；)位置：([^；]+)/);
  if (matchedLocation?.[1]) {
    return matchedLocation[1].trim();
  }

  return rawNote;
}

function mapMobileAttendanceStatus(record, config, date) {
  const checkInTime = record?.in_time ? String(record.in_time).slice(0, 5) : null;
  const checkOutTime = record?.out_time ? String(record.out_time).slice(0, 5) : null;
  const status = checkInTime && checkOutTime ? "checked_out" : checkInTime ? "checked_in" : "not_checked_in";
  return {
    date,
    status,
    checkInTime,
    checkOutTime,
    locationName: extractMobileAttendanceLocationName(record?.note),
    locationAccuracy: null,
    canCheckIn: status === "not_checked_in",
    canCheckOut: status === "checked_in",
    requiresDescriptionInWorkTime: false,
    rule: {
      startShift: String(config.start_shift || DEFAULT_ATTENDANCE_CONFIG.start_shift).slice(0, 5),
      endShift: String(config.end_shift || DEFAULT_ATTENDANCE_CONFIG.end_shift).slice(0, 5)
    }
  };
}

async function fetchMobileAttendanceRecord(ownerUserId, employeeId, date) {
  const { data, error } = await supabase
    .from("attendance_records")
    .select("*")
    .eq("owner_user_id", ownerUserId)
    .eq("employee_id", Number(employeeId))
    .eq("date", date)
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

async function fetchMobileAttendanceStatus(ownerUserId, employeeId, date) {
  const [record, config] = await Promise.all([
    fetchMobileAttendanceRecord(ownerUserId, employeeId, date),
    resolveAttendanceConfig(ownerUserId)
  ]);
  return mapMobileAttendanceStatus(record, config, date);
}

async function upsertMobileAttendancePunch({ ownerUserId, employeeId, action, body }) {
  const now = new Date();
  const clientTime = String(body.clientTime || "").trim();
  const clientTimeZone = String(body.timeZone || "").trim();
  const clientTimezoneOffsetMinutes = Number(body.timezoneOffsetMinutes);
  // 员工端打卡的“业务日期/业务时间”必须统一由后端当前时刻推导，不能再信任设备本地时区或客户端改过的系统时间。
  // 否则海外用户会看到一个“今天”，后端却按另一天或另一班次判定，最终误报“当前状态不允许打卡”。
  const date = getBangkokDateKey(now);
  const time = getBangkokTimeKey(now);
  const config = await resolveAttendanceConfig(ownerUserId);
  const existingRecord = await fetchMobileAttendanceRecord(ownerUserId, employeeId, date);
  const currentStatus = mapMobileAttendanceStatus(existingRecord, config, date);

  if (action === "check_in" && currentStatus.status !== "not_checked_in") {
    throw new Error("当前状态不允许上班打卡");
  }
  if (action === "check_out" && currentStatus.status !== "checked_in") {
    throw new Error("当前状态不允许下班打卡");
  }

  const latitude = Number(body.latitude);
  const longitude = Number(body.longitude);
  const accuracy = Number(body.accuracy);
  const locationName = String(body.locationName || "").trim();
  const description = String(body.description || "").trim();

  const payload = {
    owner_user_id: ownerUserId,
    employee_id: Number(employeeId),
    date,
    type: "normal",
    in_time: action === "check_in" ? time : existingRecord?.in_time || null,
    out_time: action === "check_out" ? time : existingRecord?.out_time || null,
    note: buildMobileAttendanceNote({ action, locationName, latitude, longitude, accuracy, description, clientTime, clientTimeZone, clientTimezoneOffsetMinutes, serverTime: now.toISOString() }),
    // 员工端打卡写入 mobile 来源，后台人工补卡仍写 manual；计算层据此避免把移动端真实打卡误标为“人工调整”。
    // 若数据库还未应用 20260606035000 迁移，接口会明确报约束错误，不能再静默伪装成 manual。
    source: "mobile",
    updated_at: new Date().toISOString()
  };

  if (existingRecord) {
    const { error } = await supabase
      .from("attendance_records")
      .update(payload)
      .eq("owner_user_id", ownerUserId)
      .eq("id", Number(existingRecord.id));
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("attendance_records")
      .insert({ ...payload, created_at: new Date().toISOString() });
    if (error) throw error;
  }

  await recalculateDailyAttendance(Number(employeeId), date, ownerUserId, null, {
    // 员工端上班打卡后当天仍是过程态；下班前展示 checked_in，不能按历史结算口径标成缺下班异常。
    pendingIfNoRecord: date === getBangkokDateKey(),
    inProgressIfMissingOut: date === getBangkokDateKey(),
    generatedBy: "draft_job"
  });
  await recalculateMonthlyAttendance(date.slice(0, 7), ownerUserId, Number(employeeId));
  return fetchMobileAttendanceStatus(ownerUserId, employeeId, date);
}

function mapMobileAttendanceRecord(row) {
  const inTime = row.in_time ? String(row.in_time).slice(0, 5) : "--:--";
  const outTime = row.out_time ? String(row.out_time).slice(0, 5) : "--:--";
  return {
    id: String(row.id),
    date: toDateKey(row.date),
    checkInTime: inTime,
    checkOutTime: outTime,
    type: row.type === "overtime" ? "overtime" : "normal",
    hours: "0.0",
  };
}

function mapMobileAttendanceRecordWithCalculation(row, calculationRow) {
  const baseRecord = mapMobileAttendanceRecord(row);
  const validHours = Number(calculationRow?.valid_hours || 0);
  const overtimePayHours = Number(calculationRow?.overtime_pay_hours || 0);
  const hasCompletePunch = baseRecord.checkInTime !== "--:--" && baseRecord.checkOutTime !== "--:--";

  return {
    ...baseRecord,
    type: overtimePayHours > 0 ? "overtime" : baseRecord.type,
    hours: hasCompletePunch ? String(roundToTwo(validHours).toFixed(1)) : "未完整",
    workedHours: hasCompletePunch ? roundToTwo(validHours) : null,
  };
}

async function fetchMobileHomeSummary(ownerUserId, employeeId) {
  const yearMonth = getBangkokDateKey().slice(0, 7);
  const monthDates = enumerateMonthDates(yearMonth);
  const periodStartDate = monthDates[0];
  const periodEndDate = monthDates[monthDates.length - 1];

  const [calculationsResult, visibleSops] = await Promise.all([
    supabase
      .from("attendance_calculation_results")
      .select("date, valid_hours")
      .eq("owner_user_id", ownerUserId)
      .eq("employee_id", Number(employeeId))
      .gte("date", periodStartDate)
      .lte("date", periodEndDate),
    fetchSopDocuments(ownerUserId, { publishedOnly: true, employeeId: Number(employeeId) })
  ]);

  if (calculationsResult.error) {
    throw calculationsResult.error;
  }

  const calculations = calculationsResult.data || [];
  const monthHours = roundToTwo(calculations.reduce((sum, row) => sum + Number(row.valid_hours || 0), 0));
  const attendanceDays = calculations.filter((row) => Number(row.valid_hours || 0) > 0).length;
  const pendingSopCount = visibleSops.filter((row) => {
    const readAt = row.reads?.[Number(employeeId)] || null;
    return !readAt;
  }).length;

  return {
    yearMonth,
    monthHours,
    attendanceDays,
    pendingSopCount,
  };
}

function mapMobileSopDocument(row, employeeId) {
  const readAt = row.reads?.[Number(employeeId)] || null;
  return {
    id: row.id,
    title: row.title,
    version: row.createdAt ? `V${row.id}` : "V1",
    updatedAt: row.createdAt || "",
    readStatus: readAt ? "read" : "unread",
    readAt,
    content: row.content,
    images: row.images || [],
    attachments: row.attachments || []
  };
}

app.get("/api/mobile/attendance/today", requireEmployeeAppAuth, async (req, res) => {
  try {
    // 员工端“今日状态”必须和提交打卡共用同一业务日口径；否则海外时区会出现页面展示与提交判定不是同一天的错位。
    const date = normalizeMobileDate(req.query.date, getBangkokDateKey());
    const result = await fetchMobileAttendanceStatus(req.employeeApp.ownerUserId, req.employeeApp.employeeId, date);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message || "员工端今日考勤加载失败" });
  }
});

app.get("/api/mobile/attendance/records", requireEmployeeAppAuth, async (req, res) => {
  try {
    const limit = Math.min(31, Math.max(1, Number(req.query.limit || 7)));
    const offset = Math.max(0, Number(req.query.offset || 0));
    const end = offset + limit - 1;
    const { data, error } = await supabase
      .from("attendance_records")
      .select("*")
      .eq("owner_user_id", req.employeeApp.ownerUserId)
      .eq("employee_id", req.employeeApp.employeeId)
      .order("date", { ascending: false })
      .order("id", { ascending: false })
      // 员工端改为分页加载后，服务端必须按 offset/limit 返回稳定窗口；否则前端“加载更多”会不断重复首批数据。
      .range(offset, end);
    if (error) throw error;
    const records = data || [];
    const recordIds = records.map((row) => Number(row.id)).filter(Number.isFinite);
    const { data: calculations, error: calculationsError } = recordIds.length === 0
      ? { data: [], error: null }
      : await supabase
        .from("attendance_calculation_results")
        .select("attendance_record_id, valid_hours, overtime_pay_hours")
        .eq("owner_user_id", req.employeeApp.ownerUserId)
        .eq("employee_id", req.employeeApp.employeeId)
        .in("attendance_record_id", recordIds);
    if (calculationsError) throw calculationsError;

    const calculationMap = new Map((calculations || []).map((row) => [Number(row.attendance_record_id), row]));
    res.json(records.map((row) => mapMobileAttendanceRecordWithCalculation(row, calculationMap.get(Number(row.id)))));
  } catch (error) {
    res.status(500).json({ error: error.message || "员工端考勤记录加载失败" });
  }
});

app.get("/api/mobile/home/summary", requireEmployeeAppAuth, async (req, res) => {
  try {
    const result = await fetchMobileHomeSummary(req.employeeApp.ownerUserId, req.employeeApp.employeeId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message || "员工端首页汇总加载失败" });
  }
});

app.post("/api/mobile/attendance/check-in", requireEmployeeAppAuth, async (req, res) => {
  try {
    const result = await upsertMobileAttendancePunch({ ownerUserId: req.employeeApp.ownerUserId, employeeId: req.employeeApp.employeeId, action: "check_in", body: req.body || {} });
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message || "上班打卡失败" });
  }
});

app.post("/api/mobile/attendance/check-out", requireEmployeeAppAuth, async (req, res) => {
  try {
    const result = await upsertMobileAttendancePunch({ ownerUserId: req.employeeApp.ownerUserId, employeeId: req.employeeApp.employeeId, action: "check_out", body: req.body || {} });
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message || "下班打卡失败" });
  }
});

app.get("/api/mobile/sops", requireEmployeeAppAuth, async (req, res) => {
  try {
    const keyword = String(req.query.keyword || "").trim();
    const limit = Math.min(50, Math.max(1, Number(req.query.limit || 10)));
    const offset = Math.max(0, Number(req.query.offset || 0));
    const rows = await fetchSopDocuments(req.employeeApp.ownerUserId, {
      keyword,
      publishedOnly: true,
      employeeId: req.employeeApp.employeeId,
      limit,
      offset
    });
    res.json(rows.map((row) => mapMobileSopDocument(row, req.employeeApp.employeeId)));
  } catch (error) {
    res.status(500).json({ error: error.message || "员工端SOP列表加载失败" });
  }
});

app.get("/api/mobile/sops/:id", requireEmployeeAppAuth, async (req, res) => {
  try {
    const rows = await fetchSopDocuments(req.employeeApp.ownerUserId, { publishedOnly: true, employeeId: req.employeeApp.employeeId });
    const detail = rows.find((row) => row.id === String(req.params.id));
    if (!detail) {
      return res.status(404).json({ error: "SOP不存在或不可见" });
    }
    res.json(mapMobileSopDocument(detail, req.employeeApp.employeeId));
  } catch (error) {
    res.status(500).json({ error: error.message || "员工端SOP详情加载失败" });
  }
});

app.post("/api/mobile/sops/:id/read", requireEmployeeAppAuth, async (req, res) => {
  try {
    const rows = await fetchSopDocuments(req.employeeApp.ownerUserId, { publishedOnly: true, employeeId: req.employeeApp.employeeId });
    const detail = rows.find((row) => row.id === String(req.params.id));
    if (!detail) {
      return res.status(404).json({ error: "SOP不存在或不可见" });
    }

    const { error } = await supabase
      .from("sop_reads")
      .upsert({
        owner_user_id: req.employeeApp.ownerUserId,
        sop_id: Number(req.params.id),
        employee_id: req.employeeApp.employeeId,
        read_at: new Date().toISOString()
      }, {
        onConflict: "owner_user_id,sop_id,employee_id"
      });
    if (error) throw error;

    const refreshedRows = await fetchSopDocuments(req.employeeApp.ownerUserId, { publishedOnly: true, employeeId: req.employeeApp.employeeId });
    const refreshed = refreshedRows.find((row) => row.id === String(req.params.id));
    res.json(mapMobileSopDocument(refreshed || detail, req.employeeApp.employeeId));
  } catch (error) {
    res.status(500).json({ error: error.message || "员工端SOP阅读确认失败" });
  }
});

app.use("/api/admin", requireGoogleAuth);

app.get("/api/admin/workspace/bootstrap-status", async (req, res) => {
  try {
    const [bootstrapState, workspacePresence] = await Promise.all([
      fetchWorkspaceBootstrapState(req.authUser.id),
      fetchWorkspaceDataPresence(req.authUser.id)
    ]);
    const hasData = workspacePresence.hasEmployees || workspacePresence.hasRules;

    res.json({
      ready: Boolean(bootstrapState) || hasData,
      hasData,
      hasBootstrapState: Boolean(bootstrapState),
      createdDemoData: Boolean(bootstrapState?.created_demo_data)
    });
  } catch (error) {
    console.error("Fetch workspace bootstrap status failed", error);
    res.status(500).json({ error: error.message || "后台初始化状态检查失败" });
  }
});

app.post("/api/admin/workspace/ensure-bootstrap", async (req, res) => {
  try {
    const result = await bootstrapWorkspaceData(req.authUser.id, req.authUser);
    res.json(result);
  } catch (error) {
    console.error("Ensure bootstrap workspace failed", error);
    res.status(500).json({ error: error.message || "初始化后台失败" });
  }
});

app.post("/api/admin/workspace/bootstrap", async (req, res) => {
  try {
    // 手动“一键初始化”必须交给 bootstrapWorkspaceData 做真实数据数量核对；
    // 不要在路由层仅凭状态表提前返回，否则状态残留会导致员工/规则为空时永远无法补种数据。
    const result = await bootstrapWorkspaceData(req.authUser.id, req.authUser);
    if (result.created) {
      await upsertWorkspaceBootstrapState(req.authUser.id, req.authUser, {
        bootstrapSource: "manual",
        createdDemoData: true
      });
    }
    res.json(result);
  } catch (error) {
    console.error("Bootstrap workspace failed", error);
    res.status(500).json({ error: error.message || "初始化后台失败" });
  }
});

app.get("/api/admin/dashboard", async (req, res) => {
  try {
    const requestStartedAt = Date.now();
    const ownerUserId = req.authUser.id;
    const requestedYearMonth = String(req.query.yearMonth || "");
    const yearMonth = /^\d{4}-\d{2}$/.test(requestedYearMonth)
      ? requestedYearMonth
      : getTodayDateKey().slice(0, 7);
    const cacheKey = `${ownerUserId}:${yearMonth}`;
    const cachedPayload = readCache(dashboardCache, cacheKey);
    if (cachedPayload) {
      res.json(cachedPayload);
      return;
    }

    const queriesStartedAt = Date.now();
    const employeesQueryStartedAt = Date.now();
    const employeesPromise = supabase
      .from("employees")
      // 数据看板只需要员工基础展示和统计字段；禁止在这里恢复 select("*")，否则 photo 等大字段会让看板接口重新膨胀到 MB 级。
      // 员工详情页仍由员工接口负责读取完整档案，本接口只保护看板首屏加载速度和现有 DashboardData 契约。
      .select("id, employee_no, name, nickname, dept, role, status, currency")
      .eq("owner_user_id", ownerUserId)
      .then((result) => ({
        result,
        durationMs: Date.now() - employeesQueryStartedAt
      }));
    const configQueryStartedAt = Date.now();
    const configPromise = resolveAttendanceConfig(ownerUserId).then((result) => ({
      result,
      durationMs: Date.now() - configQueryStartedAt
    }));

    const [employeesMeta, attendanceConfigMeta] = await Promise.all([
      employeesPromise,
      configPromise
    ]);
    const employeesResult = employeesMeta.result;
    const attendanceConfig = attendanceConfigMeta.result;
    const employeesQueryDurationMs = employeesMeta.durationMs;
    const configQueryDurationMs = attendanceConfigMeta.durationMs;

    if (employeesResult.error) {
      throw employeesResult.error;
    }

    const employees = employeesResult.data || [];
    const activeStatuses = new Set(["active", "probation"]);
    const activeEmployees = employees.filter((row) => activeStatuses.has(row.status));
    const activeEmployeeIds = new Set(activeEmployees.map((row) => Number(row.id)));
    const activeEmployeeIdList = Array.from(activeEmployeeIds);
    const totalEmployeeCount = employees.length;
    const activeEmployeeCount = activeEmployees.length;
    const inactiveEmployeeCount = Math.max(0, totalEmployeeCount - activeEmployeeCount);
    const config = mapAttendanceConfigRow(attendanceConfig);
    const monthEndDate = getMonthEndDate(yearMonth);

    const calculationsQueryStartedAt = Date.now();
    const calculationsResult = activeEmployeeIdList.length > 0
      ? await supabase
          .from("attendance_calculation_results")
          // 看板统计仅依赖这些考勤结果字段；按需列选择可以降低 Supabase 传输、Vercel JSON 处理和浏览器解析成本。
          // 员工统计和今日 KPI 只面向在职/试用员工，因此直接在查询层收缩 employee_id，避免把停用/离职历史结果整批拉回内存。
          .select("employee_id, date, status, valid_hours, overtime_pay_hours, overtime_pay, has_exception")
          .eq("owner_user_id", ownerUserId)
          .in("employee_id", activeEmployeeIdList)
          .gte("date", `${yearMonth}-01`)
          .lte("date", monthEndDate)
      : { data: [], error: null };
    const calculationsQueryDurationMs = Date.now() - calculationsQueryStartedAt;

    if (calculationsResult.error) {
      throw calculationsResult.error;
    }

    // 员工排行仍保持原有“按员工汇总所有历史计算结果”的契约，只把重复 filter 合并为一次分组，避免 N 员工 × M 结果的重复扫描。
    const calculationsByEmployeeId = new Map();
    const calculations = calculationsResult.data || [];
    calculations.forEach((row) => {
      const employeeId = Number(row.employee_id);
      if (!calculationsByEmployeeId.has(employeeId)) {
        calculationsByEmployeeId.set(employeeId, []);
      }
      calculationsByEmployeeId.get(employeeId).push(row);
    });
    const dashboardDate = calculations.length
      ? calculations.reduce((latest, row) => row.date > latest ? row.date : latest, calculations[0].date)
      : getTodayDateKey();
    const todayCalculations = calculations.filter((row) => row.date === dashboardDate);
    const todayCalculationMap = new Map(todayCalculations.map((row) => [Number(row.employee_id), row]));
    const dailyBreakMinutes = Math.max(0, Math.round((parseTimeToMinutes(config.breakEnd) - parseTimeToMinutes(config.breakStart)) || 0));
    const todayWorkHours = roundToTwo(todayCalculations.reduce((sum, row) => sum + Number(row.valid_hours || 0), 0));
    const todayOvertimeHours = roundToTwo(todayCalculations.reduce((sum, row) => sum + Number(row.overtime_pay_hours || 0), 0));
    const todayOvertimeEstimatePay = roundToTwo(todayCalculations.reduce((sum, row) => {
      const storedPay = Number(row.overtime_pay || 0);
      return sum + (storedPay > 0 ? storedPay : Number(row.overtime_pay_hours || 0) * Number(config.otHourlyFee || 0));
    }, 0));
    const todayExceptionCount = activeEmployees.reduce((count, employee) => {
      const row = todayCalculationMap.get(Number(employee.id));
      if (!row) {
        return count + 1;
      }
      return row.has_exception || row.status === "absent" || row.status === "exception" ? count + 1 : count;
    }, 0);

    const employeeStats = activeEmployees
      .map((employee) => {
        const employeeCalculations = calculationsByEmployeeId.get(Number(employee.id)) || [];
        const workedCalculations = employeeCalculations.filter((row) => row.status !== "absent" && row.status !== "leave" && Number(row.valid_hours || 0) > 0);
        const totalValidHours = roundToTwo(employeeCalculations.reduce((sum, row) => sum + Number(row.valid_hours || 0), 0));
        const totalOvertimeHours = roundToTwo(employeeCalculations.reduce((sum, row) => sum + Number(row.overtime_pay_hours || 0), 0));
        const daysWorked = workedCalculations.length;
        const avgDailyHours = daysWorked > 0 ? roundToTwo(totalValidHours / daysWorked) : 0;
        const satiety = config.standardHours > 0 ? Math.round((avgDailyHours / config.standardHours) * 100) : 0;

        return {
          employeeId: Number(employee.id),
          employeeNo: employee.employee_no || undefined,
          employeeName: employee.name || `员工 #${employee.id}`,
          // 数据看板员工行按业务名片展示“姓名(昵称)”；昵称随接口返回，避免前端额外依赖员工列表接口拼装。
          employeeNickname: employee.nickname || "",
          employeeDept: employee.dept || "未分配",
          employeeRole: employee.role || "",
          // photo 当前可能是 base64 大字段；看板先返回 null 保持字段契约，后续头像迁移到 URL/缩略图后再按需接入。
          employeePhoto: null,
          totalValidHours,
          totalOvertimeHours,
          daysWorked,
          avgDailyHours,
          satiety: satiety || 0
        };
      })
      .sort((a, b) => b.totalValidHours - a.totalValidHours);

    const payload = {
      yearMonth,
      dashboardDate,
      totalEmployeeCount,
      activeEmployeeCount,
      inactiveEmployeeCount,
      todayWorkHours,
      todayAverageWorkHours: activeEmployeeCount > 0 ? roundToTwo(todayWorkHours / activeEmployeeCount) : 0,
      todayOvertimeHours,
      todayOvertimeEstimatePay,
      todayExceptionCount,
      todayExceptionRate: activeEmployeeCount > 0 ? roundToTwo((todayExceptionCount / activeEmployeeCount) * 100) : 0,
      config: {
        standardHours: Number(config.standardHours || DEFAULT_ATTENDANCE_CONFIG.standard_hours),
        dailyBreakMinutes,
        overtimeMultiplier: config.overtimeRuleEnabled ? 1.5 : 1,
        otHourlyFee: Number(config.otHourlyFee || 0),
        overtimeRuleEnabled: Boolean(config.overtimeRuleEnabled),
        holidayDates: Array.isArray(config.holidayDates) ? config.holidayDates : [],
        currency: employees[0]?.currency || "THB"
      },
      employeeStats,
      // 当前 Dashboard UI 不再展示部门诊断卡片；保留空数组契约兼容前端类型，避免白算整套部门统计。
      departmentStats: []
    };
    writeCache(dashboardCache, cacheKey, payload, DASHBOARD_CACHE_TTL_MS);

    const queriesDurationMs = Date.now() - queriesStartedAt;
    const totalDurationMs = Date.now() - requestStartedAt;
    if (totalDurationMs >= 500) {
      console.info("[admin/dashboard] slow request", {
        ownerUserId,
        yearMonth,
        employeeCount: employees.length,
        calculationCount: calculations.length,
        activeEmployeeCount,
        employeesQueryDurationMs,
        calculationsQueryDurationMs,
        configQueryDurationMs,
        queriesDurationMs,
        totalDurationMs
      });
    }

    res.json(payload);
  } catch (error) {
    res.status(500).json({ error: error.message || "数据看板加载失败" });
  }
});

function parseTimeToMinutes(value) {
  if (!value) {
    return 0;
  }
  const match = /^(\d{2}):(\d{2})(?::\d{2})?$/.exec(String(value));
  if (!match) {
    return 0;
  }
  return Number(match[1]) * 60 + Number(match[2]);
}

app.get("/api/admin/attendance-rules/options", async (_req, res) => {
  try {
    const ownerUserId = _req.authUser.id;
    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from("attendance_rules")
      .select("id, name, is_active, effective_start_date, effective_end_date")
      .eq("owner_user_id", ownerUserId)
      .eq("is_active", true)
      .order("effective_start_date", { ascending: true });

    if (error) {
      throw error;
    }

    res.json(data
      .filter((row) => row.effective_start_date <= today && (!row.effective_end_date || row.effective_end_date >= today))
      .map((row) => ({
        id: Number(row.id),
        name: row.name,
        isActive: row.is_active,
        effectiveStartDate: row.effective_start_date,
        effectiveEndDate: row.effective_end_date
      })));
  } catch (error) {
    res.status(500).json({ error: error.message || "考勤规则加载失败" });
  }
});

app.get("/api/admin/attendance-rules", async (_req, res) => {
  try {
    const ownerUserId = _req.authUser.id;
    const [{ data, error }, relatedCounts] = await Promise.all([
      supabase
        .from("attendance_rules")
        .select("*")
        .eq("owner_user_id", ownerUserId)
        .order("id", { ascending: true }),
      fetchAttendanceRuleCounts(ownerUserId)
    ]);

    if (error) {
      throw error;
    }

    res.json(data.map((row) => mapAttendanceRuleRow(row, relatedCounts.get(Number(row.id)) || 0)));
  } catch (error) {
    res.status(500).json({ error: error.message || "考勤规则列表加载失败" });
  }
});

app.get("/api/admin/attendance-rules/:id", async (req, res) => {
  try {
    const detail = await fetchAttendanceRuleDetail(Number(req.params.id), req.authUser.id);
    res.json(detail);
  } catch (error) {
    res.status(500).json({ error: error.message || "考勤规则详情加载失败" });
  }
});

app.post("/api/admin/attendance-rules", async (req, res) => {
  try {
    const ownerUserId = req.authUser.id;
    const payload = normalizeAttendanceRulePayload(req.body);
    const validationError = validateAttendanceRulePayload(payload);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const { data, error } = await supabase
      .from("attendance_rules")
      .insert(addOwnerPayload({
        ...payload,
        created_at: new Date().toISOString()
      }, ownerUserId))
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    res.status(201).json({
      rule: mapAttendanceRuleRow(data, 0)
    });
  } catch (error) {
    res.status(500).json({ error: error.message || "创建考勤规则失败" });
  }
});

app.put("/api/admin/attendance-rules/:id", async (req, res) => {
  try {
    const ownerUserId = req.authUser.id;
    const ruleId = Number(req.params.id);
    const payload = normalizeAttendanceRulePayload(req.body);
    const validationError = validateAttendanceRulePayload(payload);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const { data, error } = await supabase
      .from("attendance_rules")
      .update(payload)
      .eq("owner_user_id", ownerUserId)
      .eq("id", ruleId)
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    const relatedCounts = await fetchAttendanceRuleCounts(ownerUserId);
    res.json({
      rule: mapAttendanceRuleRow(data, relatedCounts.get(ruleId) || 0)
    });
  } catch (error) {
    res.status(500).json({ error: error.message || "更新考勤规则失败" });
  }
});

app.patch("/api/admin/attendance-rules/:id/enable", async (req, res) => {
  try {
    const ownerUserId = req.authUser.id;
    const ruleId = Number(req.params.id);
    const { data, error } = await supabase
      .from("attendance_rules")
      .update({
        is_active: true,
        updated_at: new Date().toISOString()
      })
      .eq("owner_user_id", ownerUserId)
      .eq("id", ruleId)
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    const relatedCounts = await fetchAttendanceRuleCounts(ownerUserId);
    res.json({
      rule: mapAttendanceRuleRow(data, relatedCounts.get(ruleId) || 0)
    });
  } catch (error) {
    res.status(500).json({ error: error.message || "启用考勤规则失败" });
  }
});

app.patch("/api/admin/attendance-rules/:id/disable", async (req, res) => {
  try {
    const ownerUserId = req.authUser.id;
    const ruleId = Number(req.params.id);
    const { data, error } = await supabase
      .from("attendance_rules")
      .update({
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq("owner_user_id", ownerUserId)
      .eq("id", ruleId)
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    const relatedCounts = await fetchAttendanceRuleCounts(ownerUserId);
    res.json({
      rule: mapAttendanceRuleRow(data, relatedCounts.get(ruleId) || 0)
    });
  } catch (error) {
    res.status(500).json({ error: error.message || "停用考勤规则失败" });
  }
});

app.get("/api/admin/attendance-rules/:id/related-employees", async (req, res) => {
  try {
    const ownerUserId = req.authUser.id;
    const ruleId = Number(req.params.id);
    const currentOnly = req.query.currentOnly === "true";

    const [{ data: historyRows, error: historyError }, { data: employeeRows, error: employeeError }] = await Promise.all([
      supabase
        .from("employee_attendance_rule_history")
        .select("*")
        .eq("owner_user_id", ownerUserId)
        .eq("attendance_rule_id", ruleId)
        .order("effective_start_date", { ascending: false }),
      supabase
        .from("employees")
        .select("id, employee_no, name, dept, role, status, attendance_rule_id")
        .eq("owner_user_id", ownerUserId)
    ]);

    if (historyError) {
      throw historyError;
    }

    if (employeeError) {
      throw employeeError;
    }

    const employeeMap = new Map(employeeRows.map((row) => [Number(row.id), row]));
    const relatedRows = historyRows
      .map((row) => {
        const employee = employeeMap.get(Number(row.employee_id));
        if (!employee) {
          return null;
        }

        const isCurrentRelation = row.effective_end_date === null && Number(employee.attendance_rule_id) === ruleId;
        return {
          id: Number(employee.id),
          employeeNo: employee.employee_no,
          name: employee.name,
          dept: employee.dept,
          role: employee.role,
          status: employee.status,
          relationStartDate: row.effective_start_date,
          relationEndDate: row.effective_end_date,
          isCurrentRelation
        };
      })
      .filter(Boolean)
      .filter((row) => (currentOnly ? row.isCurrentRelation : true));

    res.json(relatedRows);
  } catch (error) {
    res.status(500).json({ error: error.message || "关联员工加载失败" });
  }
});

app.get("/api/admin/attendance-config", async (req, res) => {
  try {
    const row = await resolveAttendanceConfig(req.authUser.id);
    res.json(mapAttendanceConfigRow(row));
  } catch (error) {
    res.status(500).json({ error: error.message || "考勤配置加载失败" });
  }
});

app.put("/api/admin/attendance-config", async (req, res) => {
  try {
    const ownerUserId = req.authUser.id;
    const payload = normalizeAttendanceConfigPayload(req.body);
    const { data, error } = await supabase
      .from("attendance_config")
      .upsert({
        owner_user_id: ownerUserId,
        ...payload,
        created_at: new Date().toISOString()
      }, { onConflict: "owner_user_id" })
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    clearDashboardCache(ownerUserId);
    clearPayrollResultsCache(ownerUserId);
    res.json(mapAttendanceConfigRow(data));
  } catch (error) {
    res.status(500).json({ error: error.message || "考勤配置保存失败" });
  }
});

app.get("/api/admin/attendance-calculations", async (req, res) => {
  try {
    const requestStartedAt = Date.now();
    const ownerUserId = req.authUser.id;
    const includeInactive = req.query.includeInactive === "true";
    const usePagination = req.query.page !== undefined || req.query.pageSize !== undefined;
    const page = Math.max(1, Number.parseInt(String(req.query.page || "1"), 10) || 1);
    const pageSize = Math.min(100, Math.max(10, Number.parseInt(String(req.query.pageSize || "20"), 10) || 20));
    const yearMonth = String(req.query.yearMonth || "");
    if (yearMonth && !/^\d{4}-\d{2}$/.test(yearMonth)) {
      return res.status(400).json({ error: "yearMonth 必须为 YYYY-MM" });
    }

    const date = String(req.query.date || "");
    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: "date 必须为 YYYY-MM-DD" });
    }

    const monthRange = yearMonth ? getMonthRange(yearMonth) : null;
    const employeeId = req.query.employeeId ? Number(req.query.employeeId) : null;
    const keyword = String(req.query.keyword || "").trim().toLowerCase();
    const status = String(req.query.status || "all");
    const hasException = String(req.query.hasException || "all");
    // v2 考勤页列表只展示/导出 mapAttendanceCalculationRow 需要的结果字段；不要恢复 select("*")，否则新增列会无边界进入列表接口。
    const calculationListFields = [
      "id",
      "employee_id",
      "attendance_record_id",
      "date",
      "raw_in_time",
      "raw_out_time",
      "raw_hours",
      "break_deduction_hours",
      "valid_hours",
      "standard_hours",
      "overtime_raw_hours",
      "overtime_pay_hours",
      "work_pay",
      "meal_allowance_amount",
      "overtime_pay",
      "total_pay",
      "status",
      "has_exception",
      "exception_reason",
      "note",
      "source",
      "calculated_at"
    ].join(", ");
    // 员工表里 photo 可能是 base64 大字段；考勤列表只需要员工身份/筛选/薪资展示字段，头像保留为 null 由前端首字兜底。
    // 如果未来要显示头像，应先把员工头像迁移为 URL/缩略图字段，再在这里显式接入，避免接口重新膨胀到 MB 级。
    const attendanceEmployeeListFields = [
      "id",
      "employee_no",
      "name",
      "gender",
      "country",
      "role",
      "dept",
      "status",
      "is_deleted",
      "salary_type",
      "hourly_rate",
      "fixed_salary",
      // 服务费列依赖员工档案比例派生金额；这里必须显式选择，不能为了精简列表字段漏掉计费口径。
      "service_fee_rate",
      "currency",
      "join_date"
    ].join(", ");

    const queriesStartedAt = Date.now();
    const employeesQueryStartedAt = Date.now();
    let employeeQuery = supabase
      .from("employees")
      .select(attendanceEmployeeListFields)
      .eq("owner_user_id", ownerUserId);

    if (employeeId) {
      employeeQuery = employeeQuery.eq("id", employeeId);
    }

    const employeesPromise = employeeQuery.then((result) => ({
      result,
      durationMs: Date.now() - employeesQueryStartedAt
    }));

    // v2 考勤页支持“全部时间”；没有 yearMonth/date 时保留全量列表查询，只有按月筛选才加月份范围。
    let calculationQuery = supabase
      .from("attendance_calculation_results")
      .select(calculationListFields)
      .eq("owner_user_id", ownerUserId)
      .order("date", { ascending: false })
      .order("employee_id", { ascending: true });

    if (date) {
      calculationQuery = calculationQuery.eq("date", date);
    } else if (monthRange) {
      calculationQuery = calculationQuery
        .gte("date", monthRange.periodStartDate)
        .lte("date", monthRange.periodEndDate);
    }

    const [employeesMeta] = await Promise.all([employeesPromise]);
    const employeesResult = employeesMeta.result;
    const employeesQueryDurationMs = employeesMeta.durationMs;

    if (employeesResult.error) {
      throw employeesResult.error;
    }

    const employeeRows = employeesResult.data || [];
    const availableEmployeeRows = employeeRows.filter((employee) => (
      includeInactive
        ? Boolean(employee) && employee.is_deleted !== true
        : isEmployeeAvailableForAttendanceAndPayroll(employee)
    ));
    const employeeMap = new Map(availableEmployeeRows.map((row) => [Number(row.id), row]));
    const availableEmployeeIds = availableEmployeeRows
      .map((row) => Number(row.id))
      .filter((id) => Number.isFinite(id));

    if (availableEmployeeIds.length === 0) {
      if (!usePagination) {
        res.json([]);
        return;
      }

      res.json({
        items: [],
        total: 0,
        page,
        pageSize,
        hasMore: false
      });
      return;
    }

    calculationQuery = calculationQuery.in("employee_id", availableEmployeeIds);
    if (status !== "all") {
      calculationQuery = calculationQuery.eq("status", status);
    }
    if (hasException === "true") {
      calculationQuery = calculationQuery.eq("has_exception", true);
    }
    if (hasException === "false") {
      calculationQuery = calculationQuery.eq("has_exception", false);
    }

    const calculationsQueryStartedAt = Date.now();
    const calculationsResult = await calculationQuery;
    const calculationsQueryDurationMs = Date.now() - calculationsQueryStartedAt;

    if (calculationsResult.error) {
      throw calculationsResult.error;
    }

    const rows = calculationsResult.data
      .map((row) => mapAttendanceCalculationRow(row, employeeMap))
      .filter((row) => {
        const employee = employeeMap.get(row.employeeId);
        // 离职/禁用员工保留历史计算表数据，但当前考勤明细不再展示，避免“删除员工”后仍进入业务核对流。
        if (!employee || !shouldCalculateEmployeeDate(employee, row.date)) {
          return false;
        }
        if (keyword) {
          const haystack = [
            row.employeeName,
            row.employeeNo,
            employee.name,
            employee.employee_no || ""
          ].join(" ").toLowerCase();
          if (!haystack.includes(keyword)) {
            return false;
          }
        }
        if (status !== "all" && row.status !== status) {
          return false;
        }
        if (hasException === "true" && !row.hasException) {
          return false;
        }
        if (hasException === "false" && row.hasException) {
          return false;
        }
        return true;
      });

        if (!usePagination) {
      res.json(rows);
      return;
    }

    const offset = (page - 1) * pageSize;
    const items = rows.slice(offset, offset + pageSize);
    const queriesDurationMs = Date.now() - queriesStartedAt;
    const totalDurationMs = Date.now() - requestStartedAt;
    if (totalDurationMs >= 500) {
      console.info("[admin/attendance-calculations] slow request", {
        ownerUserId,
        yearMonth: yearMonth || null,
        date: date || null,
        employeeId: employeeId || null,
        keywordLength: keyword.length,
        status,
        hasException,
        includeInactive,
        employeeCount: availableEmployeeRows.length,
        rawRowCount: (calculationsResult.data || []).length,
        filteredRowCount: rows.length,
        page,
        pageSize,
        employeesQueryDurationMs,
        calculationsQueryDurationMs,
        queriesDurationMs,
        totalDurationMs
      });
    }
    res.json({
      items,
      total: rows.length,
      page,
      pageSize,
      hasMore: offset + items.length < rows.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message || "考勤计算结果加载失败" });
  }
});

app.get("/api/admin/attendance-calculations/:id", async (req, res) => {
  try {
    const ownerUserId = req.authUser.id;
    const { data: row, error } = await supabase
      .from("attendance_calculation_results")
      .select("*")
      .eq("owner_user_id", ownerUserId)
      .eq("id", Number(req.params.id))
      .single();

    if (error) {
      throw error;
    }

    // 考勤计算详情只返回 v2 需要的员工、原始打卡和计算结果；不要再回查或透出旧 attendance_rules。
    const [employeeResult, recordResult] = await Promise.all([
      supabase.from("employees").select("*").eq("owner_user_id", ownerUserId).eq("id", Number(row.employee_id)).maybeSingle(),
      row.attendance_record_id
        ? supabase.from("attendance_records").select("*").eq("owner_user_id", ownerUserId).eq("id", Number(row.attendance_record_id)).maybeSingle()
        : Promise.resolve({ data: null, error: null })
    ]);

    if (employeeResult.error) throw employeeResult.error;
    if (recordResult.error) throw recordResult.error;

    const employeeMap = employeeResult.data ? new Map([[Number(employeeResult.data.id), employeeResult.data]]) : new Map();

    res.json({
      result: mapAttendanceCalculationRow(row, employeeMap),
      employee: employeeResult.data ? mapEmployeeRow(employeeResult.data) : null,
      record: recordResult.data ? mapAttendanceRecordRow(recordResult.data) : null
    });
  } catch (error) {
    res.status(500).json({ error: error.message || "考勤计算详情加载失败" });
  }
});

app.post("/api/admin/attendance-records", async (req, res) => {
  try {
    const ownerUserId = req.authUser.id;
    const employeeId = Number(req.body.employeeId);
    const date = String(req.body.date || "");

    if (!employeeId || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: "employeeId 和 date 必填且格式正确" });
    }
    if (isFutureDateKey(date)) {
      return res.status(400).json({ error: "考勤日期不能晚于今天" });
    }

    const { data: employee, error: employeeError } = await supabase
      .from("employees")
      .select("id, join_date")
      .eq("owner_user_id", ownerUserId)
      .eq("id", employeeId)
      .maybeSingle();

    if (employeeError) {
      throw employeeError;
    }
    if (!employee) {
      return res.status(404).json({ error: "员工不存在" });
    }

    const joinDateError = getAttendanceDateBeforeJoinError(employee, date);
    if (joinDateError) {
      return res.status(400).json({ error: joinDateError });
    }

    const manualOvertimePayload = normalizeManualOvertimePayload(req.body, req.body.type || "normal");
    const employeeOvertimeSettingsPayload = normalizeEmployeeOvertimeSettingsPayload(req.body);
    const payload = {
      owner_user_id: ownerUserId,
      employee_id: employeeId,
      date,
      type: req.body.type || "normal",
      in_time: req.body.inTime || null,
      out_time: req.body.outTime || null,
      note: req.body.note || "",
      source: "manual",
      ...manualOvertimePayload,
      updated_at: new Date().toISOString()
    };

    const { error: employeeSettingsError } = await supabase
      .from("employees")
      .update({
        ...employeeOvertimeSettingsPayload,
        updated_at: new Date().toISOString()
      })
      .eq("owner_user_id", ownerUserId)
      .eq("id", employeeId);

    if (employeeSettingsError) {
      throw employeeSettingsError;
    }

    const { data: existingRecord, error: existingError } = await supabase
      .from("attendance_records")
      .select("*")
      .eq("owner_user_id", ownerUserId)
      .eq("employee_id", employeeId)
      .eq("date", date)
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingError) {
      throw existingError;
    }

    if (existingRecord) {
      const { error: updateError } = await supabase
        .from("attendance_records")
        .update(payload)
        .eq("owner_user_id", ownerUserId)
        .eq("id", Number(existingRecord.id));

      if (updateError) {
        throw updateError;
      }
    } else {
      const { error: insertError } = await supabase
        .from("attendance_records")
        .insert({
          ...payload,
          created_at: new Date().toISOString()
        });

      if (insertError) {
        throw insertError;
      }
    }

    scheduleAttendanceRecalculation(ownerUserId, employeeId, date);
    clearPayrollResultsCache(ownerUserId);
    res.json({
      accepted: true,
      employeeId,
      date,
      message: "考勤记录已添加，后台正在继续计算"
    });
  } catch (error) {
    if (isMissingEmployeeOvertimeSettingsSchemaError(error)) {
      return res.status(500).json({
        error: "员工级加班配置字段还未同步到数据库，请先执行迁移 20260610133000_add_employee_overtime_settings.sql"
      });
    }
    if (error?.message === "EMPLOYEE_OVERTIME_HOURLY_FEE_INVALID") {
      return res.status(400).json({ error: "员工加班费必须大于等于 0" });
    }
    if (error?.message === "MANUAL_OVERTIME_HOURLY_FEE_INVALID") {
      return res.status(400).json({ error: "人工加班费必须大于等于 0" });
    }
    res.status(500).json({ error: error.message || "补卡记录保存失败" });
  }
});

app.put("/api/admin/attendance-records/:id", async (req, res) => {
  try {
    const ownerUserId = req.authUser.id;
    const recordId = Number(req.params.id);
    const { data: existingRecord, error: existingError } = await supabase
      .from("attendance_records")
      .select("*")
      .eq("owner_user_id", ownerUserId)
      .eq("id", recordId)
      .maybeSingle();

    if (existingError) {
      throw existingError;
    }
    if (!existingRecord) {
      return res.status(404).json({ error: "原始考勤记录不存在" });
    }

    const { data: employee, error: employeeError } = await supabase
      .from("employees")
      .select("id, join_date")
      .eq("owner_user_id", ownerUserId)
      .eq("id", Number(existingRecord.employee_id))
      .maybeSingle();

    if (employeeError) {
      throw employeeError;
    }
    if (!employee) {
      return res.status(404).json({ error: "员工不存在" });
    }

    const manualOvertimePayload = normalizeManualOvertimePayload(req.body, req.body.type);
    const employeeOvertimeSettingsPayload = normalizeEmployeeOvertimeSettingsPayload(req.body);
    const previousDate = toDateKey(existingRecord.date);
    const payload = {
      date: req.body.date,
      type: req.body.type,
      in_time: req.body.inTime || null,
      out_time: req.body.outTime || null,
      note: req.body.note || "",
      source: "manual",
      ...manualOvertimePayload,
      updated_at: new Date().toISOString()
    };

    const { error: employeeSettingsError } = await supabase
      .from("employees")
      .update({
        ...employeeOvertimeSettingsPayload,
        updated_at: new Date().toISOString()
      })
      .eq("owner_user_id", ownerUserId)
      .eq("id", Number(existingRecord.employee_id));

    if (employeeSettingsError) {
      throw employeeSettingsError;
    }

    const nextDate = toDateKey(payload.date || previousDate);
    if (isFutureDateKey(nextDate)) {
      return res.status(400).json({ error: "考勤日期不能晚于今天" });
    }
    const joinDateError = getAttendanceDateBeforeJoinError(employee, nextDate);
    if (joinDateError) {
      return res.status(400).json({ error: joinDateError });
    }

    const { data: updatedRecord, error } = await supabase
      .from("attendance_records")
      .update(payload)
      .eq("owner_user_id", ownerUserId)
      .eq("id", recordId)
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    const employeeId = Number(updatedRecord.employee_id);
    const persistedDate = toDateKey(updatedRecord.date);
    const affectedMonths = new Set([previousDate.slice(0, 7), persistedDate.slice(0, 7)]);

    if (previousDate !== persistedDate) {
      await recalculateDailyAttendance(employeeId, previousDate, ownerUserId);
    }
    const result = await recalculateDailyAttendance(employeeId, persistedDate, ownerUserId);

    for (const yearMonth of affectedMonths) {
      await recalculateMonthlyAttendance(yearMonth, ownerUserId, employeeId);
    }

    clearPayrollResultsCache(ownerUserId);
    res.json(result);
  } catch (error) {
    if (isMissingEmployeeOvertimeSettingsSchemaError(error)) {
      return res.status(500).json({
        error: "员工级加班配置字段还未同步到数据库，请先执行迁移 20260610133000_add_employee_overtime_settings.sql"
      });
    }
    if (error?.message === "EMPLOYEE_OVERTIME_HOURLY_FEE_INVALID") {
      return res.status(400).json({ error: "员工加班费必须大于等于 0" });
    }
    if (error?.message === "MANUAL_OVERTIME_HOURLY_FEE_INVALID") {
      return res.status(400).json({ error: "人工加班费必须大于等于 0" });
    }
    res.status(500).json({ error: error.message || "考勤记录调整失败" });
  }
});

app.post("/api/admin/attendance-calculations/recalculate-daily", async (req, res) => {
  try {
    const ownerUserId = req.authUser.id;
    const employeeId = Number(req.body.employeeId);
    const date = String(req.body.date || "");
    if (!employeeId || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: "employeeId 和 date 必填且格式正确" });
    }

    const result = await recalculateDailyAttendance(employeeId, date, ownerUserId);
    await recalculateMonthlyAttendance(date.slice(0, 7), ownerUserId, employeeId);
    clearPayrollResultsCache(ownerUserId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message || "单日重算失败" });
  }
});

app.post("/api/admin/attendance-calculations/recalculate-batch", async (req, res) => {
  try {
    const ownerUserId = req.authUser.id;
    const items = Array.isArray(req.body.items) ? req.body.items : [];
    const failures = [];
    let successCount = 0;

    for (const item of items) {
      try {
        await recalculateDailyAttendance(Number(item.employeeId), String(item.date), ownerUserId);
        await recalculateMonthlyAttendance(String(item.date).slice(0, 7), ownerUserId, Number(item.employeeId));
        successCount += 1;
      } catch (error) {
        failures.push({
          employeeId: Number(item.employeeId),
          date: String(item.date),
          error: error.message || "重算失败"
        });
      }
    }

    res.json({
      successCount,
      failureCount: failures.length,
      failures
    });
  } catch (error) {
    res.status(500).json({ error: error.message || "批量重算失败" });
  }
});

app.post("/api/admin/attendance-calculations/recalculate-monthly", async (req, res) => {
  try {
    const ownerUserId = req.authUser.id;
    const yearMonth = String(req.body.yearMonth || "");
    const employeeId = req.body.employeeId ? Number(req.body.employeeId) : null;
    if (!/^\d{4}-\d{2}$/.test(yearMonth)) {
      return res.status(400).json({ error: "yearMonth 必须为 YYYY-MM" });
    }

    const summaries = await recalculateMonthlyAttendance(yearMonth, ownerUserId, employeeId);
    res.json(summaries);
  } catch (error) {
    res.status(500).json({ error: error.message || "月度重算失败" });
  }
});

app.post("/api/admin/attendance-calculations/run-daily-maintenance", async (req, res) => {
  try {
    const ownerUserId = req.authUser.id;
    const previousDate = String(req.body.previousDate || "");
    const todayDate = String(req.body.todayDate || "");
    if (previousDate && !/^\d{4}-\d{2}-\d{2}$/.test(previousDate)) {
      return res.status(400).json({ error: "previousDate 必须为 YYYY-MM-DD" });
    }
    if (todayDate && !/^\d{4}-\d{2}-\d{2}$/.test(todayDate)) {
      return res.status(400).json({ error: "todayDate 必须为 YYYY-MM-DD" });
    }

    const result = await runDailyAttendanceMaintenance({
      previousDate: previousDate || undefined,
      todayDate: todayDate || undefined,
      ownerUserId
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message || "考勤每日维护补跑失败" });
  }
});

app.post("/api/admin/attendance-calculations/generate-drafts", async (req, res) => {
  try {
    const date = String(req.body.date || getBangkokDateKey());
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: "date 必须为 YYYY-MM-DD" });
    }

    const result = await generateAttendanceDraftsForDate(date, req.authUser.id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message || "考勤底稿生成失败" });
  }
});

app.post("/api/admin/attendance-calculations/settle-date", async (req, res) => {
  try {
    const date = String(req.body.date || "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: "date 必须为 YYYY-MM-DD" });
    }

    const result = await settleAttendanceForDate(date, req.authUser.id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message || "考勤日期结算失败" });
  }
});

app.get("/api/admin/attendance-summaries", async (req, res) => {
  try {
    const ownerUserId = req.authUser.id;
    const yearMonth = String(req.query.yearMonth || "");
    if (!/^\d{4}-\d{2}$/.test(yearMonth)) {
      return res.status(400).json({ error: "yearMonth 必须为 YYYY-MM" });
    }

    const [summaryResult, employeesResult] = await Promise.all([
      supabase
        .from("monthly_attendance_summaries")
        .select("*")
        .eq("owner_user_id", ownerUserId)
        .eq("year_month", yearMonth)
        .order("employee_id", { ascending: true }),
      supabase
        .from("employees")
        .select("*")
        .eq("owner_user_id", ownerUserId)
    ]);

    if (summaryResult.error) {
      throw summaryResult.error;
    }
    if (employeesResult.error) {
      throw employeesResult.error;
    }

    const employeeMap = new Map(employeesResult.data.map((row) => [Number(row.id), row]));
    const summaries = summaryResult.data.map((row) => mapAttendanceSummaryRow(row, employeeMap));
    const employeeId = req.query.employeeId ? Number(req.query.employeeId) : null;
    const keyword = String(req.query.keyword || "").trim().toLowerCase();
    const canGeneratePayroll = String(req.query.canGeneratePayroll || "all");
    const filtered = summaries.filter((row) => {
      if (employeeId && row.employeeId !== employeeId) {
        return false;
      }
      if (keyword) {
        const haystack = [
          row.employeeName,
          row.employeeNo || ""
        ].join(" ").toLowerCase();
        if (!haystack.includes(keyword)) {
          return false;
        }
      }
      if (canGeneratePayroll === "true" && !row.canGeneratePayroll) {
        return false;
      }
      if (canGeneratePayroll === "false" && row.canGeneratePayroll) {
        return false;
      }
      return true;
    });

    res.json(filtered);
  } catch (error) {
    res.status(500).json({ error: error.message || "月度汇总加载失败" });
  }
});

app.get("/api/admin/payroll-results", async (req, res) => {
  try {
    const requestStartedAt = Date.now();
    const ownerUserId = req.authUser.id;
    const includeInactive = req.query.includeInactive === "true";
    const usePagination = req.query.page !== undefined || req.query.pageSize !== undefined;
    const page = Math.max(1, Number.parseInt(String(req.query.page || "1"), 10) || 1);
    const pageSize = Math.min(100, Math.max(10, Number.parseInt(String(req.query.pageSize || "20"), 10) || 20));
    const yearMonth = String(req.query.yearMonth || "");
    if (!/^\d{4}-\d{2}$/.test(yearMonth)) {
      return res.status(400).json({ error: "yearMonth 必须为 YYYY-MM" });
    }

    const employeeId = req.query.employeeId ? Number(req.query.employeeId) : null;
    const keyword = String(req.query.keyword || "").trim().toLowerCase();
    const salaryType = String(req.query.salaryType || "all");
    const calculationStatus = String(req.query.calculationStatus || "all");
    const reviewStatus = String(req.query.reviewStatus || "all");
    const monthEndDate = getMonthEndDate(yearMonth);
    const cacheKey = `${ownerUserId}:${JSON.stringify({
      usePagination,
      page,
      pageSize,
      yearMonth,
      employeeId,
      keyword,
      salaryType,
      calculationStatus,
      reviewStatus,
      includeInactive
    })}`;

    const cachedPayload = readCache(payrollResultsCache, cacheKey);
    if (cachedPayload) {
      return res.json(cachedPayload);
    }

    const queriesStartedAt = Date.now();
    const [employeesResult, payrollResultsResult, summariesResult, adjustmentItemsResult, dailyCalculationsResult, salaryProfilesResult] = await Promise.all([
      supabase
        .from("employees")
        // 薪资列表只需要基础身份和计薪字段；禁止恢复 select("*")，否则 photo 等大字段会让列表接口重新膨胀到 MB 级。
        .select(PAYROLL_LIST_EMPLOYEE_COLUMNS)
        .eq("owner_user_id", ownerUserId)
        .eq("is_deleted", false)
        .order("id", { ascending: true }),
      supabase
        .from("monthly_payroll_results")
        .select("*")
        .eq("owner_user_id", ownerUserId)
        .eq("year_month", yearMonth),
      supabase
        .from("monthly_attendance_summaries")
        .select("*")
        .eq("owner_user_id", ownerUserId)
        .eq("year_month", yearMonth),
      supabase
        .from("salary_adjustment_items")
        .select("*")
        .eq("owner_user_id", ownerUserId)
        .eq("year_month", yearMonth)
        .order("created_at", { ascending: false }),
      supabase
        .from("attendance_calculation_results")
        // 异常详情弹窗依赖日级原因；这里只取薪资公式和异常展示需要的列，避免整月考勤结果宽表拖慢列表。
        .select("employee_id, date, status, valid_hours, overtime_pay_hours, overtime_pay, has_exception, exception_reason, note")
        .eq("owner_user_id", ownerUserId)
        .gte("date", `${yearMonth}-01`)
        .lte("date", monthEndDate),
      supabase
        .from("salary_profiles")
        .select("*")
        .eq("owner_user_id", ownerUserId)
        .lte("effective_start_date", monthEndDate)
    ]);
    const queriesDurationMs = Date.now() - queriesStartedAt;

    for (const result of [employeesResult, payrollResultsResult, summariesResult, adjustmentItemsResult, dailyCalculationsResult, salaryProfilesResult]) {
      if (result.error) {
        throw result.error;
      }
    }

    const targetEmployees = employeesResult.data.filter((employee) => {
      // 薪资核算主列表必须以当前可参与考勤/薪资的员工为准；历史停用/离职员工的工资结果只保留在库里，不进入当期工作流。
      if (!includeInactive && !isEmployeeAvailableForAttendanceAndPayroll(employee)) {
        return false;
      }
      if (employeeId && Number(employee.id) !== employeeId) {
        return false;
      }
      return true;
    });
    const employeeMap = new Map(targetEmployees.map((row) => [Number(row.id), row]));
    const batch = {
      payrollResultsByEmployeeId: groupRowsByEmployeeId(payrollResultsResult.data || []),
      summariesByEmployeeId: groupRowsByEmployeeId(summariesResult.data || []),
      adjustmentItemsByEmployeeId: groupRowsByEmployeeId(adjustmentItemsResult.data || []),
      dailyCalculationsByEmployeeId: groupRowsByEmployeeId(dailyCalculationsResult.data || []),
      salaryProfilesByEmployeeId: groupRowsByEmployeeId(salaryProfilesResult.data || [])
    };

    const rows = targetEmployees.map((employee) => {
      // 旧实现按员工逐个 getPayrollSourceContext，导致 1 + N * 7 次 Supabase 查询；列表页改为月度批量取数后只在内存中组装上下文。
      // 真实生成/重算仍走 calculateMonthlyPayroll，继续保留锁定校验、薪资档案补建和写库逻辑，避免只为列表预览引入 GET 副作用。
      const context = buildPayrollSourceContextFromBatch(employee, yearMonth, ownerUserId, batch);
      const mappedRow = mapPayrollResultRow(
        buildLivePayrollListRow(
          buildMonthlyPayrollPayloadFromContext(context, yearMonth, ownerUserId, { previewOnly: true }),
          context.existingPayrollResult
        ),
        employeeMap
      );
      // 异常图标并入员工详情列后，列表行必须直接携带日级异常明细，弹窗才能展示“哪天异常、原因是什么”。
      return {
        ...mappedRow,
        exceptionDetails: buildPayrollExceptionDetails(context.dailyCalculations)
      };
    });

    const filteredRows = rows.filter((row) => {
      if (keyword) {
        const employee = employeeMap.get(row.employeeId);
        const haystack = [
          row.employeeName,
          row.employeeNo || "",
          employee?.name || "",
          employee?.nickname || "",
          employee?.employee_no || ""
        ].join(" ").toLowerCase();
        if (!haystack.includes(keyword)) {
          return false;
        }
      }
      if (salaryType !== "all" && row.salaryType !== salaryType) {
        return false;
      }
      if (calculationStatus !== "all" && row.calculationStatus !== calculationStatus) {
        return false;
      }
      if (reviewStatus !== "all" && row.reviewStatus !== reviewStatus) {
        return false;
      }
      return true;
    });

    if (!usePagination) {
      writeCache(payrollResultsCache, cacheKey, filteredRows, PAYROLL_RESULTS_CACHE_TTL_MS);
      res.json(filteredRows);
      return;
    }

    const offset = (page - 1) * pageSize;
    const items = filteredRows.slice(offset, offset + pageSize);
    const payload = {
      items,
      total: filteredRows.length,
      page,
      pageSize,
      hasMore: offset + items.length < filteredRows.length
    };
    writeCache(payrollResultsCache, cacheKey, payload, PAYROLL_RESULTS_CACHE_TTL_MS);

    const totalDurationMs = Date.now() - requestStartedAt;
    if (totalDurationMs >= 500) {
      console.warn("[admin/payroll-results] slow request", {
        ownerUserId,
        yearMonth,
        employeeId,
        salaryType,
        calculationStatus,
        reviewStatus,
        includeInactive,
        page,
        pageSize,
        targetEmployeeCount: targetEmployees.length,
        filteredRowCount: filteredRows.length,
        queriesDurationMs,
        totalDurationMs
      });
    }

    res.json(payload);
  } catch (error) {
    res.status(500).json({ error: error.message || "薪酬结果加载失败" });
  }
});

app.post("/api/admin/payroll-results/run-nightly", async (req, res) => {
  try {
    const ownerUserId = req.authUser.id;
    const yearMonth = String(req.body.yearMonth || "");
    if (!/^\d{4}-\d{2}$/.test(yearMonth)) {
      return res.status(400).json({ error: "yearMonth 必须为 YYYY-MM" });
    }

    const result = await runNightlyPayrollCalculation(yearMonth, ownerUserId);
    clearPayrollResultsCache(ownerUserId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message || "手动触发薪资核算失败" });
  }
});

app.get("/api/admin/payroll-results/:id", async (req, res) => {
  try {
    const detail = await fetchPayrollResultDetail(Number(req.params.id), req.authUser.id);
    res.json(detail);
  } catch (error) {
    res.status(500).json({ error: error.message || "薪酬结果详情加载失败" });
  }
});

app.post("/api/admin/payroll-results/generate-one", async (req, res) => {
  try {
    const ownerUserId = req.authUser.id;
    const employeeId = Number(req.body.employeeId);
    const yearMonth = String(req.body.yearMonth || "");
    if (!employeeId || !/^\d{4}-\d{2}$/.test(yearMonth)) {
      return res.status(400).json({ error: "employeeId 和 yearMonth 必填且格式正确" });
    }

    const result = await calculateMonthlyPayroll(employeeId, yearMonth, ownerUserId);
    clearPayrollResultsCache(ownerUserId);
    const employeeMap = new Map([[Number(result.row.employee_id), { id: result.row.employee_id, employee_no: "", name: `员工 #${result.row.employee_id}` }]]);
    res.json(result.mapped || mapPayrollResultRow(result.row, employeeMap));
  } catch (error) {
    res.status(500).json({ error: error.message || "生成单个员工薪酬失败" });
  }
});

app.post("/api/admin/payroll-results/generate-monthly", async (req, res) => {
  try {
    const ownerUserId = req.authUser.id;
    const yearMonth = String(req.body.yearMonth || "");
    if (!/^\d{4}-\d{2}$/.test(yearMonth)) {
      return res.status(400).json({ error: "yearMonth 必须为 YYYY-MM" });
    }

    const requestedIds = Array.isArray(req.body.employeeIds) ? req.body.employeeIds.map((item) => Number(item)).filter(Boolean) : null;
    const employeesResult = await supabase
      .from("employees")
      .select("*")
      .eq("owner_user_id", ownerUserId)
      .eq("is_deleted", false)
      .order("id", { ascending: true });

    if (employeesResult.error) {
      throw employeesResult.error;
    }

    const targetEmployees = employeesResult.data.filter((row) => {
      // 即使前端显式传 employeeIds，也不能把删除/离职/停用员工重新纳入薪资批量计算。
      if (requestedIds?.length) {
        return requestedIds.includes(Number(row.id)) && isEmployeeAvailableForAttendanceAndPayroll(row);
      }
      return isEmployeeAvailableForAttendanceAndPayroll(row);
    });

    let successCount = 0;
    const failures = [];

    for (const employee of targetEmployees) {
      try {
        // 用户显式触发“生成”时也要刷新已有工资结果，不能因为库里已有旧沉淀结果而跳过。
        await calculateMonthlyPayroll(Number(employee.id), yearMonth, ownerUserId, { forceRecalculate: true });
        successCount += 1;
      } catch (error) {
        failures.push({
          employeeId: Number(employee.id),
          error: error.message || "生成失败"
        });
      }
    }

    clearPayrollResultsCache(ownerUserId);
    res.json({
      successCount,
      skippedCount: 0,
      failureCount: failures.length,
      failures
    });
  } catch (error) {
    res.status(500).json({ error: error.message || "批量生成薪酬失败" });
  }
});

app.post("/api/admin/payroll-results/recalculate-one", async (req, res) => {
  try {
    const ownerUserId = req.authUser.id;
    const employeeId = Number(req.body.employeeId);
    const yearMonth = String(req.body.yearMonth || "");
    if (!employeeId || !/^\d{4}-\d{2}$/.test(yearMonth)) {
      return res.status(400).json({ error: "employeeId 和 yearMonth 必填且格式正确" });
    }

    const result = await calculateMonthlyPayroll(employeeId, yearMonth, ownerUserId, { forceRecalculate: true });
    clearPayrollResultsCache(ownerUserId);
    const employeeMap = new Map([[Number(result.row.employee_id), { id: result.row.employee_id, employee_no: "", name: `员工 #${result.row.employee_id}` }]]);
    res.json(result.mapped || mapPayrollResultRow(result.row, employeeMap));
  } catch (error) {
    res.status(500).json({ error: error.message || "重新计算单个员工薪酬失败" });
  }
});

app.post("/api/admin/payroll-results/recalculate-monthly", async (req, res) => {
  try {
    const ownerUserId = req.authUser.id;
    const yearMonth = String(req.body.yearMonth || "");
    if (!/^\d{4}-\d{2}$/.test(yearMonth)) {
      return res.status(400).json({ error: "yearMonth 必须为 YYYY-MM" });
    }

    const requestedIds = Array.isArray(req.body.employeeIds) ? req.body.employeeIds.map((item) => Number(item)).filter(Boolean) : null;
    const employeesResult = await supabase
      .from("employees")
      .select("*")
      .eq("owner_user_id", ownerUserId)
      .eq("is_deleted", false)
      .order("id", { ascending: true });

    if (employeesResult.error) {
      throw employeesResult.error;
    }

    const targetEmployees = employeesResult.data.filter((row) => {
      // 即使前端显式传 employeeIds，也不能把删除/离职/停用员工重新纳入薪资批量计算。
      if (requestedIds?.length) {
        return requestedIds.includes(Number(row.id)) && isEmployeeAvailableForAttendanceAndPayroll(row);
      }
      return isEmployeeAvailableForAttendanceAndPayroll(row);
    });

    let successCount = 0;
    const failures = [];

    for (const employee of targetEmployees) {
      try {
        await calculateMonthlyPayroll(Number(employee.id), yearMonth, ownerUserId, { forceRecalculate: true });
        successCount += 1;
      } catch (error) {
        failures.push({
          employeeId: Number(employee.id),
          error: error.message || "重算失败"
        });
      }
    }

    clearPayrollResultsCache(ownerUserId);
    res.json({
      successCount,
      skippedCount: 0,
      failureCount: failures.length,
      failures
    });
  } catch (error) {
    res.status(500).json({ error: error.message || "批量重算薪酬失败" });
  }
});

app.get("/api/admin/salary-adjustment-items", async (req, res) => {
  try {
    const ownerUserId = req.authUser.id;
    const employeeId = Number(req.query.employeeId);
    const yearMonth = String(req.query.yearMonth || "");
    const type = String(req.query.type || "all");
    if (!employeeId || !/^\d{4}-\d{2}$/.test(yearMonth)) {
      return res.status(400).json({ error: "employeeId 和 yearMonth 必填且格式正确" });
    }

    const { data, error } = await supabase
      .from("salary_adjustment_items")
      .select("*")
      .eq("owner_user_id", ownerUserId)
      .eq("employee_id", employeeId)
      .eq("year_month", yearMonth)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    res.json(data
      .filter((row) => type === "all" ? true : row.type === type)
      .map(mapSalaryAdjustmentItemRow));
  } catch (error) {
    res.status(500).json({ error: error.message || "一次性薪资项加载失败" });
  }
});

app.post("/api/admin/salary-adjustment-items", async (req, res) => {
  try {
    const ownerUserId = req.authUser.id;
    const payload = normalizeSalaryAdjustmentPayload(req.body);
    const validationError = validateSalaryAdjustmentPayload(payload);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const lockError = await getSalaryAdjustmentLockError(ownerUserId, payload.employee_id, payload.year_month);
    if (lockError) {
      return res.status(409).json({ error: lockError });
    }

    const { data, error } = await supabase
      .from("salary_adjustment_items")
      .insert({
        owner_user_id: ownerUserId,
        ...payload,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    clearPayrollResultsCache(ownerUserId);
    res.status(201).json(mapSalaryAdjustmentItemRow(data));
  } catch (error) {
    res.status(500).json({ error: error.message || "新增一次性薪资项失败" });
  }
});

app.put("/api/admin/salary-adjustment-items/:id", async (req, res) => {
  try {
    const ownerUserId = req.authUser.id;
    const payload = normalizeSalaryAdjustmentPayload(req.body);
    const validationError = validateSalaryAdjustmentPayload(payload);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const { data: existingItem, error: existingItemError } = await supabase
      .from("salary_adjustment_items")
      .select("*")
      .eq("owner_user_id", ownerUserId)
      .eq("id", Number(req.params.id))
      .maybeSingle();

    if (existingItemError) {
      throw existingItemError;
    }
    if (!existingItem) {
      return res.status(404).json({ error: "一次性薪资项不存在" });
    }

    const currentLockError = await getSalaryAdjustmentLockError(ownerUserId, existingItem.employee_id, existingItem.year_month);
    if (currentLockError) {
      return res.status(409).json({ error: currentLockError });
    }

    const targetLockError = await getSalaryAdjustmentLockError(ownerUserId, payload.employee_id, payload.year_month);
    if (targetLockError) {
      return res.status(409).json({ error: targetLockError });
    }

    const { data, error } = await supabase
      .from("salary_adjustment_items")
      .update({
        ...payload,
        updated_at: new Date().toISOString()
      })
      .eq("owner_user_id", ownerUserId)
      .eq("id", Number(req.params.id))
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    clearPayrollResultsCache(ownerUserId);
    res.json(mapSalaryAdjustmentItemRow(data));
  } catch (error) {
    res.status(500).json({ error: error.message || "更新一次性薪资项失败" });
  }
});

app.delete("/api/admin/salary-adjustment-items/:id", async (req, res) => {
  try {
    const ownerUserId = req.authUser.id;
    const { data: existingItem, error: existingItemError } = await supabase
      .from("salary_adjustment_items")
      .select("*")
      .eq("owner_user_id", ownerUserId)
      .eq("id", Number(req.params.id))
      .maybeSingle();

    if (existingItemError) {
      throw existingItemError;
    }
    if (!existingItem) {
      return res.status(404).json({ error: "一次性薪资项不存在" });
    }

    const lockError = await getSalaryAdjustmentLockError(ownerUserId, existingItem.employee_id, existingItem.year_month);
    if (lockError) {
      return res.status(409).json({ error: lockError });
    }

    const { error } = await supabase
      .from("salary_adjustment_items")
      .delete()
      .eq("owner_user_id", ownerUserId)
      .eq("id", Number(req.params.id));

    if (error) {
      throw error;
    }

    clearPayrollResultsCache(ownerUserId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message || "删除一次性薪资项失败" });
  }
});

app.patch("/api/admin/payroll-results/:id/approve", async (req, res) => {
  try {
    const ownerUserId = req.authUser.id;
    const { data: existing, error: existingError } = await supabase
      .from("monthly_payroll_results")
      .select("*")
      .eq("owner_user_id", ownerUserId)
      .eq("id", Number(req.params.id))
      .single();

    if (existingError) {
      throw existingError;
    }

    if (existing.calculation_status === "blocked") {
      return res.status(400).json({ error: "历史异常薪酬状态，请先重新计算" });
    }
    if (existing.calculation_status === "confirmed") {
      return res.status(400).json({ error: "已确认的薪酬结果不能重复核对" });
    }

    const { data, error } = await supabase
      .from("monthly_payroll_results")
      .update({
        review_status: "approved",
        updated_at: new Date().toISOString()
      })
      .eq("owner_user_id", ownerUserId)
      .eq("id", Number(req.params.id))
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    clearPayrollResultsCache(ownerUserId);
    const employeeResult = await supabase.from("employees").select("*").eq("owner_user_id", ownerUserId).eq("id", Number(data.employee_id)).maybeSingle();
    if (employeeResult.error) throw employeeResult.error;
    const employeeMap = employeeResult.data ? new Map([[Number(employeeResult.data.id), employeeResult.data]]) : new Map();
    res.json(mapPayrollResultRow(data, employeeMap));
  } catch (error) {
    res.status(500).json({ error: error.message || "标记核对通过失败" });
  }
});

app.patch("/api/admin/payroll-results/:id/reject", async (req, res) => {
  try {
    const ownerUserId = req.authUser.id;
    const { data: existing, error: existingError } = await supabase
      .from("monthly_payroll_results")
      .select("*")
      .eq("owner_user_id", ownerUserId)
      .eq("id", Number(req.params.id))
      .single();

    if (existingError) {
      throw existingError;
    }

    if (existing.calculation_status === "confirmed") {
      return res.status(400).json({ error: "已确认的薪酬结果不能驳回" });
    }

    const { data, error } = await supabase
      .from("monthly_payroll_results")
      .update({
        review_status: "rejected",
        updated_at: new Date().toISOString()
      })
      .eq("owner_user_id", ownerUserId)
      .eq("id", Number(req.params.id))
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    clearPayrollResultsCache(ownerUserId);
    const employeeResult = await supabase.from("employees").select("*").eq("owner_user_id", ownerUserId).eq("id", Number(data.employee_id)).maybeSingle();
    if (employeeResult.error) throw employeeResult.error;
    const employeeMap = employeeResult.data ? new Map([[Number(employeeResult.data.id), employeeResult.data]]) : new Map();
    res.json(mapPayrollResultRow(data, employeeMap));
  } catch (error) {
    res.status(500).json({ error: error.message || "驳回薪酬结果失败" });
  }
});

app.patch("/api/admin/payroll-results/:id/confirm", async (req, res) => {
  try {
    const ownerUserId = req.authUser.id;
    const { data: existing, error: existingError } = await supabase
      .from("monthly_payroll_results")
      .select("*")
      .eq("owner_user_id", ownerUserId)
      .eq("id", Number(req.params.id))
      .single();

    if (existingError) {
      throw existingError;
    }

    if (existing.calculation_status === "blocked") {
      return res.status(400).json({ error: "历史异常薪酬状态，请先重新计算" });
    }
    if (existing.calculation_status === "confirmed") {
      return res.status(400).json({ error: "该薪酬结果已确认，无需重复确认" });
    }
    if (existing.review_status !== "approved") {
      return res.status(400).json({ error: "未核对通过的薪酬结果不能确认" });
    }

    const { data, error } = await supabase
      .from("monthly_payroll_results")
      .update({
        calculation_status: "confirmed",
        confirmed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq("owner_user_id", ownerUserId)
      .eq("id", Number(req.params.id))
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    clearPayrollResultsCache(ownerUserId);
    const employeeResult = await supabase.from("employees").select("*").eq("owner_user_id", ownerUserId).eq("id", Number(data.employee_id)).maybeSingle();
    if (employeeResult.error) throw employeeResult.error;
    const employeeMap = employeeResult.data ? new Map([[Number(employeeResult.data.id), employeeResult.data]]) : new Map();
    res.json(mapPayrollResultRow(data, employeeMap));
  } catch (error) {
    res.status(500).json({ error: error.message || "确认薪酬结果失败" });
  }
});

function normalizeSopPayload(body = {}, authUser) {
  const targetType = body.targetType === "specific" ? "specific" : "all";
  const targetEmployeeIds = Array.isArray(body.targetEmployeeIds)
    ? Array.from(new Set(body.targetEmployeeIds.map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0)))
    : [];
  const attachments = Array.isArray(body.attachments) ? body.attachments : [];
  const images = Array.isArray(body.images) ? body.images : [];

  return {
    title: String(body.title || "").trim(),
    contentHtml: String(body.content || body.contentHtml || "").trim(),
    targetType,
    targetEmployeeIds: targetType === "specific" ? targetEmployeeIds : [],
    creator: String(body.creator || authUser.email || "仓库安全处 · Admin Office").trim(),
    status: body.status === "draft" ? "draft" : "published",
    attachments: attachments
      .map((item) => ({
        name: String(item?.name || "").trim(),
        url: String(item?.url || "").trim(),
        size: String(item?.size || item?.sizeLabel || "").trim()
      }))
      .filter((item) => item.name && item.url),
    images: images.map((url) => String(url || "").trim()).filter(Boolean)
  };
}

function validateSopPayload(payload) {
  if (!payload.title) {
    return "SOP标题不能为空";
  }
  if (!payload.contentHtml) {
    return "SOP正文不能为空";
  }
  if (payload.targetType === "specific" && payload.targetEmployeeIds.length === 0) {
    return "指定员工下发时至少选择一名员工";
  }
  return null;
}

function mapSopDocument(row, { targetIds = [], assets = [], reads = [] } = {}) {
  const imageAssets = assets.filter((asset) => asset.kind === "image").sort((a, b) => Number(a.sort_order) - Number(b.sort_order));
  const attachmentAssets = assets.filter((asset) => asset.kind === "attachment").sort((a, b) => Number(a.sort_order) - Number(b.sort_order));
  const readMap = reads.reduce((acc, read) => {
    acc[Number(read.employee_id)] = String(read.read_at || "").replace("T", " ").slice(0, 16);
    return acc;
  }, {});

  return {
    id: String(row.id),
    title: row.title,
    content: row.content_html,
    images: imageAssets.map((asset) => asset.url),
    attachments: attachmentAssets.map((asset) => ({
      name: asset.name,
      url: asset.url,
      size: asset.size_label || ""
    })),
    targetType: row.target_type === "specific" ? "specific" : "all",
    targetEmployeeIds: row.target_type === "specific" ? targetIds.map(Number) : undefined,
    createdAt: String(row.created_at || "").replace("T", " ").slice(0, 16),
    creator: row.creator,
    status: row.status === "draft" ? "draft" : "published",
    reads: readMap
  };
}

async function fetchSopDocuments(ownerUserId, { keyword = "", publishedOnly = false, employeeId = null, limit = null, offset = 0 } = {}) {
  let query = supabase
    .from("sop_documents")
    .select("*")
    .eq("owner_user_id", ownerUserId)
    .order("created_at", { ascending: false });

  if (publishedOnly) {
    query = query.eq("status", "published");
  }
  if (keyword) {
    const escapedKeyword = escapeLikeKeyword(keyword);
    query = query.or([
      `title.ilike.%${escapedKeyword}%`,
      `creator.ilike.%${escapedKeyword}%`,
      `content_html.ilike.%${escapedKeyword}%`
    ].join(","));
  }

  const { data: documents, error } = await query;
  if (error) {
    throw error;
  }

  const ids = (documents || []).map((row) => Number(row.id));
  if (ids.length === 0) {
    return [];
  }

  const [targetsResult, assetsResult, readsResult] = await Promise.all([
    supabase.from("sop_document_targets").select("sop_id, employee_id").eq("owner_user_id", ownerUserId).in("sop_id", ids),
    supabase.from("sop_assets").select("*").eq("owner_user_id", ownerUserId).in("sop_id", ids).order("sort_order", { ascending: true }),
    supabase.from("sop_reads").select("sop_id, employee_id, read_at").eq("owner_user_id", ownerUserId).in("sop_id", ids)
  ]);

  if (targetsResult.error) throw targetsResult.error;
  if (assetsResult.error) throw assetsResult.error;
  if (readsResult.error) throw readsResult.error;

  const targetMap = new Map();
  for (const target of targetsResult.data || []) {
    const sopId = Number(target.sop_id);
    targetMap.set(sopId, [...(targetMap.get(sopId) || []), Number(target.employee_id)]);
  }
  const assetMap = new Map();
  for (const asset of assetsResult.data || []) {
    const sopId = Number(asset.sop_id);
    assetMap.set(sopId, [...(assetMap.get(sopId) || []), asset]);
  }
  const readMap = new Map();
  for (const read of readsResult.data || []) {
    const sopId = Number(read.sop_id);
    readMap.set(sopId, [...(readMap.get(sopId) || []), read]);
  }

  const mappedDocuments = (documents || [])
    .filter((row) => {
      if (!employeeId) return true;
      if (row.target_type !== "specific") return true;
      return (targetMap.get(Number(row.id)) || []).includes(Number(employeeId));
    })
    .map((row) => mapSopDocument(row, {
      targetIds: targetMap.get(Number(row.id)) || [],
      assets: assetMap.get(Number(row.id)) || [],
      reads: readMap.get(Number(row.id)) || []
    }));

  if (limit === null) {
    return mappedDocuments;
  }

  // SOP 可见性依赖 target 过滤，分页必须在过滤后再切片，避免 specific 目标文档被前置全量窗口吞掉后导致前端少页或漏页。
  return mappedDocuments.slice(offset, offset + limit);
}

async function assertSopTargetEmployeesBelongToOwner(ownerUserId, targetEmployeeIds) {
  if (targetEmployeeIds.length === 0) {
    return;
  }

  const { data, error } = await supabase
    .from("employees")
    .select("id")
    .eq("owner_user_id", ownerUserId)
    .in("id", targetEmployeeIds);
  if (error) {
    throw error;
  }

  // SOP 受众只能选择当前账号员工；服务端使用 service role，必须显式校验 owner_user_id，不能只依赖 employee_id 外键。
  const validIds = new Set((data || []).map((row) => Number(row.id)));
  const missingIds = targetEmployeeIds.filter((employeeId) => !validIds.has(Number(employeeId)));
  if (missingIds.length > 0) {
    throw new Error("SOP指定员工不属于当前后台账号");
  }
}

async function fetchSopDocumentById(ownerUserId, sopId) {
  const rows = await fetchSopDocuments(ownerUserId);
  return rows.find((row) => row.id === String(sopId)) || null;
}

async function replaceSopRelations(ownerUserId, sopId, payload) {
  // SOP 正文保存是“整份发布物”的替换语义：受众、图片、附件必须跟文档版本同步，避免旧附件或旧指定员工残留。
  await assertSopTargetEmployeesBelongToOwner(ownerUserId, payload.targetEmployeeIds);
  const [deleteTargets, deleteAssets] = await Promise.all([
    supabase.from("sop_document_targets").delete().eq("owner_user_id", ownerUserId).eq("sop_id", sopId),
    supabase.from("sop_assets").delete().eq("owner_user_id", ownerUserId).eq("sop_id", sopId)
  ]);
  if (deleteTargets.error) throw deleteTargets.error;
  if (deleteAssets.error) throw deleteAssets.error;

  const targetRows = payload.targetEmployeeIds.map((employeeId) => ({
    owner_user_id: ownerUserId,
    sop_id: sopId,
    employee_id: employeeId
  }));
  if (targetRows.length > 0) {
    const { error } = await supabase.from("sop_document_targets").insert(targetRows);
    if (error) throw error;
  }

  const assetRows = [
    ...payload.images.map((url, index) => ({
      owner_user_id: ownerUserId,
      sop_id: sopId,
      kind: "image",
      name: `SOP插图 ${index + 1}`,
      url,
      size_label: "",
      sort_order: index
    })),
    ...payload.attachments.map((item, index) => ({
      owner_user_id: ownerUserId,
      sop_id: sopId,
      kind: "attachment",
      name: item.name,
      url: item.url,
      size_label: item.size,
      sort_order: index
    }))
  ];
  if (assetRows.length > 0) {
    const { error } = await supabase.from("sop_assets").insert(assetRows);
    if (error) throw error;
  }
}

app.get("/api/admin/sops", async (req, res) => {
  try {
    const keyword = String(req.query.keyword || "").trim();
    const employeeId = req.query.employeeId ? Number(req.query.employeeId) : null;
    const publishedOnly = req.query.publishedOnly === "true" || Boolean(employeeId);
    const rows = await fetchSopDocuments(req.authUser.id, { keyword, publishedOnly, employeeId });
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message || "SOP列表加载失败" });
  }
});

app.get("/api/admin/sops/:id", async (req, res) => {
  try {
    const detail = await fetchSopDocumentById(req.authUser.id, Number(req.params.id));
    if (!detail) {
      return res.status(404).json({ error: "SOP不存在" });
    }
    res.json(detail);
  } catch (error) {
    res.status(500).json({ error: error.message || "SOP详情加载失败" });
  }
});

app.post("/api/admin/sops", async (req, res) => {
  try {
    const payload = normalizeSopPayload(req.body, req.authUser);
    const validationError = validateSopPayload(payload);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const { data, error } = await supabase
      .from("sop_documents")
      .insert({
        owner_user_id: req.authUser.id,
        title: payload.title,
        content_html: payload.contentHtml,
        target_type: payload.targetType,
        creator: payload.creator,
        status: payload.status,
        updated_at: new Date().toISOString()
      })
      .select("*")
      .single();
    if (error) throw error;

    await replaceSopRelations(req.authUser.id, Number(data.id), payload);
    const detail = await fetchSopDocumentById(req.authUser.id, Number(data.id));
    res.status(201).json(detail || mapSopDocument(data));
  } catch (error) {
    res.status(500).json({ error: error.message || "SOP创建失败" });
  }
});

app.put("/api/admin/sops/:id", async (req, res) => {
  try {
    const sopId = Number(req.params.id);
    const payload = normalizeSopPayload(req.body, req.authUser);
    const validationError = validateSopPayload(payload);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const { data, error } = await supabase
      .from("sop_documents")
      .update({
        title: payload.title,
        content_html: payload.contentHtml,
        target_type: payload.targetType,
        creator: payload.creator,
        status: payload.status,
        updated_at: new Date().toISOString()
      })
      .eq("owner_user_id", req.authUser.id)
      .eq("id", sopId)
      .select("*")
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      return res.status(404).json({ error: "SOP不存在" });
    }

    await replaceSopRelations(req.authUser.id, sopId, payload);
    const detail = await fetchSopDocumentById(req.authUser.id, sopId);
    res.json(detail || mapSopDocument(data));
  } catch (error) {
    res.status(500).json({ error: error.message || "SOP更新失败" });
  }
});

app.delete("/api/admin/sops/:id", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("sop_documents")
      .delete()
      .eq("owner_user_id", req.authUser.id)
      .eq("id", Number(req.params.id))
      .select("id")
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      return res.status(404).json({ error: "SOP不存在" });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message || "SOP删除失败" });
  }
});

app.post("/api/admin/sops/:id/read", async (req, res) => {
  try {
    const employeeId = Number(req.body.employeeId);
    if (!Number.isFinite(employeeId) || employeeId <= 0) {
      return res.status(400).json({ error: "请选择员工" });
    }

    const visibleSops = await fetchSopDocuments(req.authUser.id, { publishedOnly: true, employeeId });
    if (!visibleSops.some((row) => row.id === String(req.params.id))) {
      return res.status(404).json({ error: "该员工不可见此SOP" });
    }

    const { error } = await supabase
      .from("sop_reads")
      .upsert({
        owner_user_id: req.authUser.id,
        sop_id: Number(req.params.id),
        employee_id: employeeId,
        read_at: new Date().toISOString()
      }, {
        onConflict: "owner_user_id,sop_id,employee_id"
      });
    if (error) throw error;

    const detail = await fetchSopDocumentById(req.authUser.id, Number(req.params.id));
    res.json(detail);
  } catch (error) {
    res.status(500).json({ error: error.message || "SOP签收失败" });
  }
});

app.get("/api/admin/employees", async (req, res) => {
  try {
    const requestStartedAt = Date.now();
    const ownerUserId = req.authUser.id;
    const includeInactive = req.query.includeInactive === "true";
    const keyword = String(req.query.keyword || "").trim().toLowerCase();
    const status = String(req.query.status || "all");
    const country = String(req.query.country || "all");
    const salaryType = String(req.query.salaryType || "all");
    const role = String(req.query.role || "all");
    const usePagination = req.query.page !== undefined || req.query.pageSize !== undefined;
    const skipTotal = req.query.skipTotal === "true";
    const page = Math.max(1, Number.parseInt(String(req.query.page || "1"), 10) || 1);
    const pageSize = Math.min(50, Math.max(10, Number.parseInt(String(req.query.pageSize || "24"), 10) || 24));
    const offset = (page - 1) * pageSize;
    const useDirectDb = ENABLE_EMPLOYEE_DIRECT_DB && Boolean(directDbPool);
    const cacheKey = buildEmployeeListCacheKey({
      ownerUserId,
      includeInactive,
      keyword,
      status,
      country,
      salaryType,
      role,
      usePagination,
      skipTotal,
      page,
      pageSize
    });

    const cachedPayload = readCache(employeeListCache, cacheKey);
    if (cachedPayload) {
      res.json(cachedPayload);
      return;
    }

    if (useDirectDb) {
      try {
        const queriesStartedAt = Date.now();
        const {
          rows,
          total,
          hasMore,
          employeeQueryDurationMs,
          countQueryDurationMs
        } = await fetchEmployeesViaDirectDb({
          ownerUserId,
          includeInactive,
          keyword,
          status,
          country,
          salaryType,
          role,
          usePagination,
          skipTotal,
          offset,
          pageSize
        });
        const queriesDurationMs = Date.now() - queriesStartedAt;

        if (!usePagination) {
          res.json(rows.map((row) => mapEmployeeRow(row)));
          return;
        }

        const safeTotal = total === null || total === undefined ? null : total;
        const totalDurationMs = Date.now() - requestStartedAt;
        if (totalDurationMs >= 300) {
          console.info("[admin/employees] direct-db request", {
            ownerUserId,
            page,
            pageSize,
            offset,
            keywordLength: keyword.length,
            status,
            country,
            salaryType,
            role,
            rowCount: rows.length,
            total: safeTotal,
            skipTotal,
            hasMore,
            employeeQueryDurationMs,
            countQueryDurationMs,
            queriesDurationMs,
            totalDurationMs
          });
        }

        const payload = {
          items: rows.map((row) => mapEmployeeRow(row)),
          total: safeTotal,
          page,
          pageSize,
          hasMore
        };
        writeCache(employeeListCache, cacheKey, payload, EMPLOYEE_LIST_CACHE_TTL_MS);
        res.json(payload);
        return;
      } catch (error) {
        console.warn("[admin/employees] direct-db failed, falling back to supabase", {
          message: error.message || String(error)
        });
      }
    }

    const employeeListSelect = [
      "id",
      "employee_no",
      "name",
      "nickname",
      "gender",
      "country",
      "phone",
      "role",
      "dept",
      "join_date",
      "status",
      "attendance_rule_id",
      "salary_type",
      "hourly_rate",
      "fixed_salary",
      "is_dispatch_personnel",
      "attendance_bonus",
      "social_security",
      "meal_allowance",
      "service_fee_rate",
      "currency",
      "is_deleted"
    ].join(",");

    const applyEmployeeListFilters = (query) => {
      let nextQuery = query.eq("owner_user_id", ownerUserId);

      if (!includeInactive && status === "all") {
        // 默认员工列表只展示可运营状态；显式 IN 比 NOT IN 更容易命中 owner_user_id + status + id 这类复合索引。
        nextQuery = nextQuery.in("status", ["active", "on_leave", "probation"]);
      }

      if (status !== "all") {
        nextQuery = nextQuery.eq("status", status);
      }

      if (country !== "all") {
        nextQuery = nextQuery.eq("country", country);
      }

      if (salaryType !== "all") {
        nextQuery = nextQuery.eq("salary_type", salaryType);
      }

      if (role !== "all") {
        nextQuery = nextQuery.eq("role", role);
      }

      if (keyword) {
        const escapedKeyword = escapeLikeKeyword(keyword);
        nextQuery = nextQuery.or([
          `name.ilike.%${escapedKeyword}%`,
          `nickname.ilike.%${escapedKeyword}%`,
          `employee_no.ilike.%${escapedKeyword}%`,
          `phone.ilike.%${escapedKeyword}%`,
          `role.ilike.%${escapedKeyword}%`,
          `dept.ilike.%${escapedKeyword}%`
        ].join(","));
      }

      return nextQuery;
    };

    const dataQuery = applyEmployeeListFilters(
      supabase
        .from("employees")
        .select(employeeListSelect)
        .order("id", { ascending: true })
    );
    const queriesStartedAt = Date.now();
    const employeeQueryStartedAt = Date.now();
    const employeePromise = (usePagination
      ? dataQuery.range(offset, offset + pageSize - (skipTotal ? 0 : 1))
      : dataQuery
    ).then((result) => ({
      result,
      durationMs: Date.now() - employeeQueryStartedAt
    }));
    const countQueryStartedAt = Date.now();
    const countPromise = (usePagination && !skipTotal
      ? applyEmployeeListFilters(
          supabase
            .from("employees")
            // 分页总数只用于分页条和“共 N 名员工”展示；这里优先返回更快的 planned count，避免精确计数拖慢首屏。
            .select("id", { count: "planned", head: true })
        )
      : Promise.resolve({ count: null, error: null })
    ).then((result) => ({
      result,
      durationMs: Date.now() - countQueryStartedAt
    }));

    const [employeeQueryMeta, countQueryMeta] = await Promise.all([employeePromise, countPromise]);
    const { result: employeeResult, durationMs: employeeQueryDurationMs } = employeeQueryMeta;
    const { result: countResult, durationMs: countQueryDurationMs } = countQueryMeta;
    const queriesDurationMs = Date.now() - queriesStartedAt;

    if (employeeResult.error) {
      throw employeeResult.error;
    }
    if (countResult.error) {
      throw countResult.error;
    }

    const rawRows = employeeResult.data || [];
    const rows = usePagination && skipTotal && rawRows.length > pageSize
      ? rawRows.slice(0, pageSize)
      : rawRows;

    if (!usePagination) {
      const payload = rows.map((row) => mapEmployeeRow(row));
      writeCache(employeeListCache, cacheKey, payload, EMPLOYEE_LIST_CACHE_TTL_MS);
      res.json(payload);
      return;
    }

    const total = skipTotal ? null : (countResult.count || 0);
    const hasMore = skipTotal
      ? rawRows.length > pageSize
      : offset + rows.length < Number(total || 0);
    const totalDurationMs = Date.now() - requestStartedAt;
    if (totalDurationMs >= 500) {
      console.info("[admin/employees] slow request", {
        ownerUserId,
        page,
        pageSize,
        offset,
        keywordLength: keyword.length,
        status,
        country,
        salaryType,
        role,
        rowCount: rows.length,
        total,
        skipTotal,
        hasMore,
        employeeQueryDurationMs,
        countQueryDurationMs,
        queriesDurationMs,
        totalDurationMs
      });
    }

    const payload = {
      items: rows.map((row) => mapEmployeeRow(row)),
      total,
      page,
      pageSize,
      hasMore
    };
    writeCache(employeeListCache, cacheKey, payload, EMPLOYEE_LIST_CACHE_TTL_MS);
    res.json(payload);
  } catch (error) {
    res.status(500).json({ error: error.message || "员工列表加载失败" });
  }
});

app.get("/api/admin/employees/count", async (req, res) => {
  try {
    const ownerUserId = req.authUser.id;
    const includeInactive = req.query.includeInactive === "true";
    const keyword = String(req.query.keyword || "").trim().toLowerCase();
    const status = String(req.query.status || "all");
    const country = String(req.query.country || "all");
    const salaryType = String(req.query.salaryType || "all");
    const role = String(req.query.role || "all");
    const cacheKey = buildEmployeeListCacheKey({
      ownerUserId,
      includeInactive,
      keyword,
      status,
      country,
      salaryType,
      role
    });
    const cachedTotal = readCache(employeeCountCache, cacheKey);
    if (cachedTotal !== null) {
      res.json({ total: cachedTotal });
      return;
    }

    if (ENABLE_EMPLOYEE_DIRECT_DB && directDbPool) {
      try {
        const total = await fetchEmployeeCountViaDirectDb({
          ownerUserId,
          includeInactive,
          keyword,
          status,
          country,
          salaryType,
          role
        });
        writeCache(employeeCountCache, cacheKey, total, EMPLOYEE_COUNT_CACHE_TTL_MS);
        res.json({ total });
        return;
      } catch (error) {
        console.warn("[admin/employees/count] direct-db failed, falling back to supabase", {
          message: error.message || String(error)
        });
      }
    }

    let query = supabase
      .from("employees")
      .select("id", { count: "planned", head: true })
      .eq("owner_user_id", ownerUserId);

    if (!includeInactive && status === "all") {
      query = query.in("status", ["active", "on_leave", "probation"]);
    }
    if (status !== "all") {
      query = query.eq("status", status);
    }
    if (country !== "all") {
      query = query.eq("country", country);
    }
    if (salaryType !== "all") {
      query = query.eq("salary_type", salaryType);
    }
    if (role !== "all") {
      query = query.eq("role", role);
    }
    if (keyword) {
      const escapedKeyword = escapeLikeKeyword(keyword);
      query = query.or([
        `name.ilike.%${escapedKeyword}%`,
        `nickname.ilike.%${escapedKeyword}%`,
        `employee_no.ilike.%${escapedKeyword}%`,
        `phone.ilike.%${escapedKeyword}%`,
        `role.ilike.%${escapedKeyword}%`,
        `dept.ilike.%${escapedKeyword}%`
      ].join(","));
    }

    const { count, error } = await query;
    if (error) {
      throw error;
    }

    const total = count || 0;
    writeCache(employeeCountCache, cacheKey, total, EMPLOYEE_COUNT_CACHE_TTL_MS);
    res.json({ total });
  } catch (error) {
    res.status(500).json({ error: error.message || "员工总数加载失败" });
  }
});

app.get("/api/admin/employees/avatars", async (req, res) => {
  try {
    const ownerUserId = req.authUser.id;
    const ids = String(req.query.ids || "")
      .split(",")
      .map((value) => Number.parseInt(value.trim(), 10))
      .filter((value, index, list) => Number.isFinite(value) && value > 0 && list.indexOf(value) === index)
      .slice(0, 50);

    if (ids.length === 0) {
      return res.json({ items: [] });
    }

    const cacheKey = buildEmployeeListCacheKey({
      ownerUserId,
      ids
    });
    const cachedItems = readCache(employeeAvatarCache, cacheKey);
    if (cachedItems) {
      res.json({ items: cachedItems });
      return;
    }

    if (ENABLE_EMPLOYEE_DIRECT_DB && directDbPool) {
      try {
        const items = await fetchEmployeeAvatarsViaDirectDb(ownerUserId, ids);
        writeCache(employeeAvatarCache, cacheKey, items, EMPLOYEE_AVATAR_CACHE_TTL_MS);
        res.json({ items });
        return;
      } catch (error) {
        console.warn("[admin/employees/avatars] direct-db failed, falling back to supabase", {
          message: error.message || String(error)
        });
      }
    }

    const { data, error } = await supabase
      .from("employees")
      .select("id, photo")
      .eq("owner_user_id", ownerUserId)
      .in("id", ids);

    if (error) {
      throw error;
    }

    const items = (data || []).map((row) => ({
        id: Number(row.id),
        photo: row.photo || null
      }));
    writeCache(employeeAvatarCache, cacheKey, items, EMPLOYEE_AVATAR_CACHE_TTL_MS);
    res.json({ items });
  } catch (error) {
    res.status(500).json({ error: error.message || "员工头像加载失败" });
  }
});

app.get("/api/admin/employees/:id", async (req, res) => {
  try {
    const detail = await fetchEmployeeDetail(Number(req.params.id), req.authUser.id);
    res.json(detail);
  } catch (error) {
    res.status(500).json({ error: error.message || "员工详情加载失败" });
  }
});

app.get("/api/admin/employees/:id/app-account", async (req, res) => {
  try {
    const account = await fetchEmployeeAppAccount(Number(req.params.id), req.authUser.id);
    res.json({ account, defaultPassword: EMPLOYEE_APP_DEFAULT_PASSWORD });
  } catch (error) {
    res.status(500).json({ error: error.message || "员工 App 账号加载失败" });
  }
});

app.post("/api/admin/employees/:id/app-account/reset-password", async (req, res) => {
  try {
    // 重置密码固定回到第一版初始密码，方便 Admin 在弹窗里一键复制账号密码给员工。
    const result = await resetEmployeeAppPassword(Number(req.params.id), req.authUser.id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message || "重置员工 App 密码失败" });
  }
});

app.patch("/api/admin/employees/:id/app-account/status", async (req, res) => {
  try {
    const account = await setEmployeeAppAccountStatus(Number(req.params.id), req.authUser.id, req.body?.status);
    res.json({ account, defaultPassword: EMPLOYEE_APP_DEFAULT_PASSWORD });
  } catch (error) {
    res.status(500).json({ error: error.message || "更新员工 App 账号状态失败" });
  }
});

app.post("/api/admin/employees", async (req, res) => {
  try {
    const payload = normalizeEmployeePayload(req.body, req.authUser);
    const validationError = validateEmployeeAmountPayload(payload);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }
    const employeeRow = await createEmployeeRecord(payload, req.authUser);
    res.status(201).json({
      employee: mapEmployeeRow(employeeRow),
      ruleHistory: []
    });
  } catch (error) {
    res.status(500).json({ error: error.message || "新增员工失败" });
  }
});

app.put("/api/admin/employees/:id", async (req, res) => {
  try {
    const payload = normalizeEmployeePayload(req.body, req.authUser);
    const validationError = validateEmployeeAmountPayload(payload);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }
    const employeeRow = await updateEmployeeRecord(Number(req.params.id), payload, req.authUser);
    res.json({
      employee: mapEmployeeRow(employeeRow),
      ruleHistory: []
    });
  } catch (error) {
    res.status(500).json({ error: error.message || "更新员工失败" });
  }
});

app.patch("/api/admin/employees/:id/status", async (req, res) => {
  try {
    const { targetStatus } = req.body;
    if (targetStatus !== "resigned") {
      return res.status(400).json({ error: "员工状态不合法" });
    }
    const employeeRow = await setEmployeeStatusRecord(Number(req.params.id), targetStatus, req.authUser.id);
    res.json({
      employee: mapEmployeeRow(employeeRow),
      ruleHistory: []
    });
  } catch (error) {
    res.status(500).json({ error: error.message || "更新员工状态失败" });
  }
});

const isDirectRun = process.argv[1]
  ? import.meta.url === pathToFileURL(process.argv[1]).href
  : false;

// Vercel 的 Node Function 和根目录验证脚本都会 import 这个文件；只有直接
// 执行 `node server/index.js` 时才启动监听，避免 serverless 入口被本地
// app.listen 长连接卡住。若部署入口调整，请同时检查根目录 `api/[...path].js` 和 `vercel.json`。
if (isDirectRun) {
  app.listen(PORT, () => {
    console.log(`wmshr-admin API running on http://127.0.0.1:${PORT}`);
  });
}

export default app;
