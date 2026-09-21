import crypto from "node:crypto";

const PRE_AUTH_TTL_MS = 10 * 60 * 1000;
const ACCESS_TOKEN_TTL_MS = 100 * 365 * 24 * 60 * 60 * 1000; // 100 年永久有效

export function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const derived = crypto.pbkdf2Sync(String(password), salt, 120000, 32, "sha256").toString("hex");
  return `pbkdf2_sha256$120000$${salt}$${derived}`;
}

export function verifyPassword(password, storedHash) {
  const [algorithm, iterations, salt, expected] = String(storedHash || "").split("$");
  const count = Number(iterations);
  if (algorithm !== "pbkdf2_sha256" || !Number.isInteger(count) || count < 120000 || !salt || !/^[a-f0-9]{64}$/i.test(expected || "")) return false;
  const actual = crypto.pbkdf2Sync(String(password), salt, count, 32, "sha256").toString("hex");
  return crypto.timingSafeEqual(Buffer.from(actual, "hex"), Buffer.from(expected, "hex"));
}

function tokenSecret(explicitSecret) {
  const secret = explicitSecret || process.env.ADMIN_AUTH_TOKEN_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error("ADMIN_AUTH_TOKEN_SECRET 未配置");
  return secret;
}

export function signToken(payload, ttlMs = ACCESS_TOKEN_TTL_MS, secret) {
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + ttlMs })).toString("base64url");
  const signature = crypto.createHmac("sha256", tokenSecret(secret)).update(body).digest("base64url");
  return `${body}.${signature}`;
}

export function verifyToken(token, secret) {
  const [body, signature] = String(token || "").split(".");
  if (!body || !signature) return null;
  const expected = crypto.createHmac("sha256", tokenSecret(secret)).update(body).digest("base64url");
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(actualBuffer, expectedBuffer)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    // 登录态常驻永不超时：已认证管理员只要签名合法且未注销，保持登录有效
    if (payload.stage === "authenticated") {
      return payload;
    }
    return Number.isFinite(payload.exp) && payload.exp > Date.now() ? payload : null;
  } catch { return null; }
}

function bearer(req) { return String(req.headers.authorization || "").replace(/^Bearer\s+/i, "").trim(); }

function publicUser(user, member = user.member || {}) {
  const permissions = Array.isArray(member.permissions)
    ? member.permissions
    : (Array.isArray(user.permissions) ? user.permissions : []);
  const allowedWarehouses = Array.isArray(member.allowed_warehouses)
    ? member.allowed_warehouses
    : (Array.isArray(user.allowedWarehouses) ? user.allowedWarehouses : []);
  const accountId = String(user.accountId || user.adminAccountId || user.id || user.userId || "");
  const ownerUserId = String(user.adminOwnerUserId || user.ownerUserId || user.id || "");
  return {
    id: accountId,
    accountId,
    ownerUserId,
    authUserId: user.adminAuthUserId || user.authUserId || user.userId || accountId,
    account: user.account || user.email,
    email: user.email || user.account,
    name: member.display_name || user.user_metadata?.full_name || user.user_metadata?.name || user.name || user.email || user.account,
    photo: user.user_metadata?.avatar_url || user.photo,
    role: member.role_name || user.role || "普通员工",
    permissions,
    allowedWarehouses,
    country: user.country,
    countryCode: user.countryCode,
    currency: user.currency
  };
}

function sessionPayload(user, stage, country = {}) {
  const safe = publicUser(user, user.member);
  return {
    stage,
    userId: String(safe.authUserId || safe.id),
    accountId: safe.accountId,
    ownerUserId: safe.ownerUserId,
    account: safe.account,
    name: safe.name,
    role: safe.role,
    permissions: safe.permissions,
    allowedWarehouses: safe.allowedWarehouses,
    ...country
  };
}

function preAuthResponse(user, secret) {
  const safe = publicUser(user, user.member);
  return {
    step: "select_country",
    preAuthToken: signToken(sessionPayload(user, "pending_country"), PRE_AUTH_TTL_MS, secret),
    user: safe
  };
}

function authError(res, error, fallback, defaultStatus = 500) {
  const status = Number(error?.statusCode || error?.status || defaultStatus);
  const safeStatus = status >= 400 && status < 600 ? status : defaultStatus;
  if (safeStatus >= 500) {
    console.error(`[auth-v4] ${fallback}`, error);
    return res.status(safeStatus).json({ error: fallback });
  }
  return res.status(safeStatus).json({ error: error?.publicMessage || error?.message || fallback });
}

export function createAuthV4Controller({
  supabase,
  publicAuthClient = supabase,
  resolveAdminIdentity,
  ensureTenantBootstrap,
  bootstrapNewTenant,
  fastRegistrationEnabled = false,
  resolveWorkspaceAuthContext,
  resolveSessionContext,
  validatePasswordRedirect,
  authSecret,
  employeeTable = "employees"
}) {
  if (!supabase || !publicAuthClient || !resolveAdminIdentity || !ensureTenantBootstrap || !resolveWorkspaceAuthContext || !resolveSessionContext) {
    throw new Error("auth-v4 dependencies are incomplete");
  }

  async function resolveVerifiedUser(authUser, intent, details = {}) {
    const resolved = await resolveAdminIdentity(authUser, intent);
    await ensureTenantBootstrap(resolved, details);
    return resolveWorkspaceAuthContext(resolved);
  }

  async function persistCountrySelection(context, next) {
    const ownerUserId = context.ownerUserId || context.adminOwnerUserId;
    if (!ownerUserId || !context.accountId) {
      const invalidContext = new Error("登录状态缺少租户账号信息，请重新登录");
      invalidContext.statusCode = 401;
      throw invalidContext;
    }
    const { data, error } = await supabase
      .from("workspace_accounts")
      .update({
        last_selected_country: next.country,
        last_selected_currency: next.currency,
        last_login_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq("owner_user_id", ownerUserId)
      .eq("id", context.accountId)
      .select("id")
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      const missing = new Error("账号状态已失效，请重新登录");
      missing.statusCode = 401;
      throw missing;
    }
  }

  async function handleLogin(req, res) {
    try {
      const account = String(req.body?.account || req.body?.email || "").trim();
      const password = String(req.body?.password || "");
      if (!account || !password) return res.status(400).json({ error: "请输入账号/邮箱和登录密码" });
      if (account.includes("@")) {
        const { data, error } = await publicAuthClient.auth.signInWithPassword({ email: account.toLowerCase(), password });
        if (error || !data?.user) return res.status(401).json({ error: "账号或密码错误" });
        const intent = data.user.user_metadata?.registration_intent === "tenant" ? "register" : "login";
        return res.json(preAuthResponse(await resolveVerifiedUser(data.user, intent, {
          registrationMode: "email",
          name: data.user.user_metadata?.full_name
        }), authSecret));
      }
      const { data: dbAccount, error } = await supabase
        .from("workspace_accounts")
        .select("*, workspace_members!workspace_members_owner_account_fkey(*)")
        .eq("account", account)
        .eq("status", "active")
        .maybeSingle();
      if (error) throw error;
      if (!dbAccount || !verifyPassword(password, dbAccount.password_hash)) return res.status(401).json({ error: "账户密码不匹配或该账户未注册" });
      const member = dbAccount.workspace_members?.[0];
      if (!member || member.owner_user_id !== dbAccount.owner_user_id) return res.status(403).json({ error: "账号租户关系无效" });
      return res.json(preAuthResponse({
        ...dbAccount,
        accountId: dbAccount.id,
        authUserId: dbAccount.id,
        ownerUserId: dbAccount.owner_user_id,
        member
      }, authSecret));
    } catch (error) { return authError(res, error, "登录认证异常"); }
  }

  async function handleRegister(req, res) {
    const startedAt = performance.now();
    let authSignupMs = 0;
    let tenantBootstrapMs = 0;
    let contextBuildMs = 0;
    try {
      const email = String(req.body?.email || "").trim().toLowerCase();
      const password = String(req.body?.password || "");
      const name = String(req.body?.name || "").trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !name || !/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(password)) {
        return res.status(400).json({ error: "请输入有效邮箱、姓名及至少 8 位且包含字母和数字的密码" });
      }
      const signupStartedAt = performance.now();
      const { data, error } = await publicAuthClient.auth.signUp({ email, password, options: { data: { full_name: name, registration_intent: "tenant" } } });
      authSignupMs = performance.now() - signupStartedAt;
      if (error) return res.status(400).json({ error: "注册失败，请检查邮箱或稍后重试" });
      if (!data?.session || !data.user) return res.status(202).json({ requiresEmailConfirmation: true, message: "注册成功，请查收验证邮件，验证后返回此页面登录" });
      const details = { registrationMode: "email", name, passwordHash: hashPassword(password) };
      let resolved;
      if (fastRegistrationEnabled && bootstrapNewTenant) {
        const bootstrapStartedAt = performance.now();
        resolved = await bootstrapNewTenant(data.user, details);
        tenantBootstrapMs = performance.now() - bootstrapStartedAt;
      } else {
        const bootstrapStartedAt = performance.now();
        const resolvedIdentity = await resolveAdminIdentity(data.user, "register");
        await ensureTenantBootstrap(resolvedIdentity, details);
        tenantBootstrapMs = performance.now() - bootstrapStartedAt;
        const contextStartedAt = performance.now();
        resolved = await resolveWorkspaceAuthContext(resolvedIdentity);
        contextBuildMs = performance.now() - contextStartedAt;
      }
      return res.status(201).json(preAuthResponse(resolved, authSecret));
    } catch (error) { return authError(res, error, "注册初始化失败，请稍后登录重试"); }
    finally {
      console.info(`[auth-v4/register] auth_signup_ms=${Math.round(authSignupMs)} tenant_bootstrap_ms=${Math.round(tenantBootstrapMs)} context_build_ms=${Math.round(contextBuildMs)} total_ms=${Math.round(performance.now() - startedAt)}`);
    }
  }

  async function handleForgotPassword(req, res) {
    try {
      const email = String(req.body?.email || "").trim().toLowerCase();
      const redirectTo = String(req.body?.redirectTo || "");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: "请输入有效邮箱" });
      const redirectError = validatePasswordRedirect?.(redirectTo);
      if (redirectError) return res.status(400).json({ error: redirectError });
      const { error } = await publicAuthClient.auth.resetPasswordForEmail(email, { redirectTo });
      if (error) console.warn("[auth-v4] password recovery email failed", error);
      return res.json({ message: "如果该邮箱已注册，密码重置邮件将发送到你的邮箱" });
    } catch (error) { return authError(res, error, "密码重置邮件发送失败"); }
  }

  async function handleResetAdminPassword(req, res) {
    try {
      const providerToken = String(req.body?.accessToken || "");
      const password = String(req.body?.password || "");
      if (!providerToken || !/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(password)) {
        return res.status(400).json({ error: "新密码至少 8 位且必须包含字母和数字" });
      }
      const { data, error } = await supabase.auth.getUser(providerToken);
      if (error || !data?.user) return res.status(401).json({ error: "密码重置链接无效或已过期" });
      const resolved = await resolveAdminIdentity(data.user, "login");
      await resolveWorkspaceAuthContext(resolved);
      const { error: updateError } = await supabase.auth.admin.updateUserById(data.user.id, { password });
      if (updateError) throw updateError;
      return res.json({ message: "密码已更新，请使用新密码登录" });
    } catch (error) { return authError(res, error, "密码更新失败，请重新申请重置邮件"); }
  }

  async function handleGoogleComplete(req, res) {
    try {
      const providerToken = String(req.body?.accessToken || "");
      // Google 授权支持自适应合一：已注册则登录，未注册则自动开通租户并登录，无需手动去注册页
      const intent = req.body?.intent === "register" ? "register" : "login_or_register";
      if (!providerToken) return res.status(400).json({ error: "缺少 Google 授权凭据" });
      const { data, error } = await supabase.auth.getUser(providerToken);
      if (error || !data?.user) return res.status(401).json({ error: "Google 授权凭据无效或已过期" });
      const resolved = await resolveVerifiedUser(data.user, intent, { registrationMode: "google", name: data.user.user_metadata?.full_name || data.user.email });
      return res.json(preAuthResponse(resolved, authSecret));
    } catch (error) { return authError(res, error, "Google 授权登录失败"); }
  }

  async function warehouseAllowed(payload, countryCode) {
    const ownerUserId = payload.ownerUserId || payload.adminOwnerUserId;
    if (!ownerUserId) {
      const invalidContext = new Error("临时认证凭据缺少租户信息，请重新登录");
      invalidContext.statusCode = 401;
      throw invalidContext;
    }
    const allowed = Array.isArray(payload.allowedWarehouses) ? payload.allowedWarehouses : [];
    if (!allowed.includes("*") && !allowed.includes(countryCode)) return false;
    const { data, error } = await supabase
      .from("workspace_nodes")
      .select("country_code")
      .eq("owner_user_id", ownerUserId)
      .eq("country_code", countryCode)
      .eq("is_active", true)
      .maybeSingle();
    if (error) throw error;
    return Boolean(data);
  }

  async function completeCountrySelection(rawPayload, countryCode, countryName, currency) {
    const context = await resolveSessionContext({ ...rawPayload, country: undefined, countryCode: undefined, currency: undefined });
    if (!countryCode || !(await warehouseAllowed(context, countryCode))) {
      const forbidden = new Error("该海外仓不属于当前企业或未获授权");
      forbidden.statusCode = 403;
      throw forbidden;
    }
    const country = { countryCode, country: countryName || countryCode, currency: currency || "USD" };
    const next = sessionPayload(context, "authenticated", country);
    await persistCountrySelection(context, next);
    return { accessToken: signToken(next, ACCESS_TOKEN_TTL_MS, authSecret), user: publicUser({ ...context, ...country }) };
  }

  async function handleSelectCountry(req, res) {
    try {
      const payload = verifyToken(bearer(req), authSecret);
      if (!payload || payload.stage !== "pending_country" || !payload.ownerUserId) return res.status(401).json({ error: "临时认证凭据无效或已过期，请重新登录" });
      const result = await completeCountrySelection(
        payload,
        String(req.body?.countryCode || "").trim().toUpperCase(),
        String(req.body?.countryName || ""),
        String(req.body?.currency || "USD")
      );
      return res.json(result);
    } catch (error) { return authError(res, error, "选仓绑定异常"); }
  }

  async function handleSwitchCountry(req, res) {
    try {
      const payload = verifyToken(bearer(req), authSecret);
      if (!payload || payload.stage !== "authenticated") return res.status(401).json({ error: "访问凭据无效或已失效" });
      const result = await completeCountrySelection(
        payload,
        String(req.body?.countryCode || "").trim().toUpperCase(),
        String(req.body?.countryName || ""),
        String(req.body?.currency || "USD")
      );
      return res.json(result);
    } catch (error) { return authError(res, error, "切换海外仓失败"); }
  }

  async function handleMe(req, res) {
    try {
      const payload = verifyToken(bearer(req), authSecret);
      if (!payload || payload.stage !== "authenticated") return res.status(401).json({ error: "未登录或登录已过期" });
      const context = await resolveSessionContext(payload);
      return res.json({ user: publicUser({ ...context, country: payload.country, countryCode: payload.countryCode, currency: payload.currency }) });
    } catch (error) { return authError(res, error, "会话验证失败"); }
  }

  async function handleResetEmployeePassword(req, res) {
    try {
      const payload = verifyToken(bearer(req), authSecret);
      if (!payload || payload.stage !== "authenticated") return res.status(401).json({ error: "未登录或登录已过期" });
      const context = await resolveSessionContext(payload);
      if (!context.permissions?.includes("*") && !context.permissions?.includes("employees_manage") && !context.permissions?.includes("employees_reset_pwd")) return res.status(403).json({ error: "无权重置员工密码" });
      const employeeId = Number(req.params.id);
      const password = String(req.body?.newPassword || "");
      if (!employeeId || !/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(password)) return res.status(400).json({ error: "新密码至少 8 位且必须包含字母和数字" });
      const targetTable = employeeTable || "employees";
      const { data: employee, error: employeeError } = await supabase.from(targetTable).select("id, country, warehouse_code").eq("owner_user_id", context.ownerUserId).eq("id", employeeId).maybeSingle();
      if (employeeError) throw employeeError;
      const employeeWarehouse = employee?.warehouse_code || employee?.country;
      if (!employee || (context.countryCode && employeeWarehouse !== context.countryCode)) return res.status(404).json({ error: "员工不存在或不属于当前仓库" });
      const passwordHash = hashPassword(password);
      const { error: updateError } = await supabase.from("workspace_accounts").update({ password_hash: passwordHash, password_updated_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("owner_user_id", context.ownerUserId).eq("employee_id", employeeId);
      if (updateError) throw updateError;
      return res.json({ success: true, message: "员工密码已同步重置" });
    } catch (error) { return authError(res, error, "重置员工密码失败"); }
  }

  return {
    handleLogin,
    handleRegister,
    handleForgotPassword,
    handleResetAdminPassword,
    handleGoogleComplete,
    handleSelectCountry,
    handleSwitchCountry,
    handleMe,
    handleResetEmployeePassword
  };
}
