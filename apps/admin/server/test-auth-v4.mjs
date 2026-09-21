import assert from "node:assert/strict";
import fs from "node:fs";
import { createAuthV4Controller, hashPassword, signToken, verifyPassword, verifyToken } from "./auth-v4.js";

const SECRET = "test-secret-that-is-not-used-in-production";

function response() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
  };
}

function query(result) {
  const filters = {};
  const builder = {
    filters,
    select() { return this; },
    ilike(key, value) { filters[key] = value; return this; },
    eq(key, value) { filters[key] = value; return this; },
    update() { return this; },
    maybeSingle() { return Promise.resolve(typeof result === "function" ? result(filters) : result); }
  };
  builder.then = (resolve, reject) => builder.maybeSingle().then(resolve, reject);
  return builder;
}

async function call(handler, req) {
  const res = response();
  await handler({ headers: {}, body: {}, params: {}, ...req }, res);
  return res;
}

async function withoutExpectedErrorLog(operation) {
  const original = console.error;
  console.error = () => {};
  try { return await operation(); }
  finally { console.error = original; }
}

async function main() {
  const passwordHash = hashPassword("Secure123");
  assert.equal(verifyPassword("Secure123", passwordHash), true);
  assert.equal(verifyPassword("wrong", passwordHash), false);
  assert.equal(verifyPassword("Secure123", "Secure123"), false);

  const pending = signToken({ stage: "pending_country", ownerUserId: "owner-a" }, 1000, SECRET);
  assert.equal(verifyToken(pending, SECRET)?.stage, "pending_country");
  assert.equal(verifyToken(`${pending}x`, SECRET), null);
  assert.equal(verifyToken(signToken({ stage: "pending_country" }, -1, SECRET), SECRET), null);
  assert.ok(verifyToken(signToken({ stage: "authenticated" }, -1, SECRET), SECRET), "Authenticated token should never expire");

  const users = new Map();
  const tenants = new Map();
  const updates = [];
  let bootstrapCalls = 0;
  let recoveryEmails = 0;
  let adminPasswordUpdates = 0;
  let currentPermissions = ["*"];
  let accountActive = true;

  const auth = {
    async signUp({ email, options }) {
      const user = { id: "owner-a", email, user_metadata: options.data };
      users.set(email, user);
      return { data: { user, session: { access_token: "provider-token" } }, error: null };
    },
    async signInWithPassword({ email }) {
      return { data: { user: users.get(email) }, error: users.has(email) ? null : new Error("invalid") };
    },
    async resetPasswordForEmail() {
      recoveryEmails += 1;
      return { data: {}, error: null };
    }
  };

  const supabase = {
    auth: {
      async getUser(token) {
        return { data: { user: token === "provider-token" ? users.get("owner@example.com") : null }, error: null };
      },
      admin: {
        async updateUserById() {
          adminPasswordUpdates += 1;
          return { data: {}, error: null };
        }
      }
    },
    from(table) {
      if (table === "employees") {
        return query(filters => ({ data: filters.owner_user_id === "owner-a" && filters.id === 1 ? { id: 1, country: "CN" } : null, error: null }));
      }
      if (table === "workspace_accounts") {
        let updatePayload = null;
        const builder = query(filters => ({ data: updatePayload ? { id: filters.id || "account-owner" } : null, error: null }));
        builder.update = payload => {
          updatePayload = payload;
          updates.push({ table, payload, filters: builder.filters });
          return builder;
        };
        return builder;
      }
      if (table === "workspace_nodes") return query({ data: { country_code: "TH" }, error: null });
      return query({ data: null, error: null });
    }
  };

  async function resolve(user, intent) {
    if (!tenants.has(user.id) && intent !== "register") {
      const error = new Error("not registered");
      error.statusCode = 404;
      throw error;
    }
    return { ...user, adminOwnerUserId: user.id, adminAuthUserId: user.id };
  }

  async function bootstrap(user) {
    bootstrapCalls += 1;
    tenants.set(user.id, true);
  }

  async function resolveWorkspace(user) {
    if (!accountActive) {
      const error = new Error("账号已停用");
      error.statusCode = 401;
      throw error;
    }
    return {
      ...user,
      id: "owner-a",
      ownerUserId: "owner-a",
      adminOwnerUserId: "owner-a",
      adminAuthUserId: user.adminAuthUserId || user.id,
      accountId: "account-owner",
      account: user.email,
      email: user.email,
      member: {
        display_name: "Owner",
        role_name: "超级管理员",
        permissions: currentPermissions,
        allowed_warehouses: ["*"]
      }
    };
  }

  async function resolveSession(payload) {
    if (!accountActive) {
      const error = new Error("账号已停用");
      error.statusCode = 401;
      throw error;
    }
    const accountId = payload.accountId || payload.userId || "account-owner";
    const restricted = accountId === "staff-a";
    return {
      id: "owner-a",
      ownerUserId: "owner-a",
      adminOwnerUserId: "owner-a",
      adminAuthUserId: payload.userId || accountId,
      accountId,
      account: payload.account || "owner@example.com",
      email: payload.account || "owner@example.com",
      name: restricted ? "Staff" : "Owner",
      role: restricted ? "普通员工" : "超级管理员",
      permissions: restricted ? ["employees_view"] : currentPermissions,
      allowedWarehouses: ["*"],
      country: payload.country,
      countryCode: payload.countryCode,
      currency: payload.currency
    };
  }

  const dependencies = {
    supabase,
    publicAuthClient: { auth },
    resolveAdminIdentity: resolve,
    ensureTenantBootstrap: bootstrap,
    resolveWorkspaceAuthContext: resolveWorkspace,
    resolveSessionContext: resolveSession,
    validatePasswordRedirect: redirectTo => redirectTo.startsWith("http://localhost") ? null : "重置地址不合法",
    authSecret: SECRET
  };
  const controller = createAuthV4Controller(dependencies);

  const registration = await call(controller.handleRegister, { body: { email: "owner@example.com", password: "Secure123", name: "Owner" } });
  assert.equal(registration.statusCode, 201);
  assert.equal(registration.body.user.id, "account-owner");
  assert.deepEqual(registration.body.user.permissions, ["*"]);
  assert.equal(bootstrapCalls, 1);

  let fastBootstrapCalls = 0;
  const fastController = createAuthV4Controller({
    ...dependencies,
    fastRegistrationEnabled: true,
    resolveAdminIdentity: async () => { throw new Error("fast registration must not resolve legacy identity"); },
    ensureTenantBootstrap: async () => { throw new Error("fast registration must not use legacy bootstrap"); },
    bootstrapNewTenant: async (authUser, details) => {
      fastBootstrapCalls += 1;
      assert.equal(authUser.id, "owner-a");
      assert.equal(details.registrationMode, "email");
      assert.equal(details.name, "Owner");
      return resolveWorkspace({ ...authUser, adminOwnerUserId: authUser.id, adminAuthUserId: authUser.id });
    }
  });
  const fastRegistration = await call(fastController.handleRegister, { body: { email: "owner@example.com", password: "Secure123", name: "Owner" } });
  assert.equal(fastRegistration.statusCode, 201);
  assert.equal(fastBootstrapCalls, 1);

  const login = await call(controller.handleLogin, { body: { account: "owner@example.com", password: "Secure123" } });
  assert.equal(login.statusCode, 200);
  assert.equal(tenants.size, 1);
  assert.equal(bootstrapCalls, 2);

  let failedOnce = false;
  const retryController = createAuthV4Controller({
    ...dependencies,
    ensureTenantBootstrap: async user => {
      if (!failedOnce) { failedOnce = true; throw new Error("bootstrap failed"); }
      tenants.set(user.id, true);
    }
  });
  tenants.delete("owner-a");
  const failedRegistration = await withoutExpectedErrorLog(() => call(retryController.handleRegister, { body: { email: "owner@example.com", password: "Secure123", name: "Owner" } }));
  assert.equal(failedRegistration.statusCode, 500);
  assert.equal(failedRegistration.body.error, "注册初始化失败，请稍后登录重试");
  assert.doesNotMatch(failedRegistration.body.error, /bootstrap failed/);
  assert.equal((await call(retryController.handleRegister, { body: { email: "owner@example.com", password: "Secure123", name: "Owner" } })).statusCode, 201);
  assert.equal(tenants.get("owner-a"), true);

  const forgot = await call(controller.handleForgotPassword, { body: { email: "owner@example.com", redirectTo: "http://localhost:3004/zh-CN/login?step=reset-password" } });
  assert.equal(forgot.statusCode, 200);
  assert.equal(recoveryEmails, 1);
  const reset = await call(controller.handleResetAdminPassword, { body: { accessToken: "provider-token", password: "Changed123" } });
  assert.equal(reset.statusCode, 200);
  assert.equal(adminPasswordUpdates, 1);

  const accessToken = signToken({ stage: "authenticated", userId: "owner-a", accountId: "account-owner", ownerUserId: "owner-a", permissions: ["*"] }, 1000, SECRET);
  const crossTenantReset = await call(controller.handleResetEmployeePassword, { headers: { authorization: `Bearer ${accessToken}` }, params: { id: "2" }, body: { newPassword: "Changed123" } });
  assert.equal(crossTenantReset.statusCode, 404);
  assert.equal(updates.length, 0);

  const restrictedToken = signToken({ stage: "authenticated", userId: "staff-a", accountId: "staff-a", ownerUserId: "owner-a", permissions: ["*"] }, 1000, SECRET);
  assert.equal((await call(controller.handleResetEmployeePassword, { headers: { authorization: `Bearer ${restrictedToken}` }, params: { id: "1" }, body: { newPassword: "Changed123" } })).statusCode, 403);

  const wrongCountryToken = signToken({ stage: "authenticated", userId: "owner-a", accountId: "account-owner", ownerUserId: "owner-a", countryCode: "TH", permissions: ["*"] }, 1000, SECRET);
  assert.equal((await call(controller.handleResetEmployeePassword, { headers: { authorization: `Bearer ${wrongCountryToken}` }, params: { id: "1" }, body: { newPassword: "Changed123" } })).statusCode, 404);
  assert.equal(updates.length, 0);

  currentPermissions = ["employees_view"];
  assert.equal((await call(controller.handleResetEmployeePassword, { headers: { authorization: `Bearer ${accessToken}` }, params: { id: "1" }, body: { newPassword: "Changed123" } })).statusCode, 403);
  currentPermissions = ["*"];
  assert.equal((await call(controller.handleResetEmployeePassword, { headers: { authorization: `Bearer ${accessToken}` }, params: { id: "1" }, body: { newPassword: "Changed123" } })).statusCode, 200);
  assert.equal(updates[0].table, "workspace_accounts");

  const pendingCountry = signToken({ stage: "pending_country", userId: "owner-a", accountId: "account-owner", ownerUserId: "owner-a", allowedWarehouses: ["*"] }, 1000, SECRET);
  const selected = await call(controller.handleSelectCountry, { headers: { authorization: `Bearer ${pendingCountry}` }, body: { countryCode: "TH", countryName: "🇹🇭 泰国", currency: "THB", ownerUserId: "owner-b" } });
  assert.equal(selected.statusCode, 200);
  assert.equal(selected.body.user.country, "🇹🇭 泰国");
  assert.equal(selected.body.user.countryCode, "TH");
  assert.equal(selected.body.user.currency, "THB");
  const selectionUpdate = updates.find(update => update.payload.last_selected_country);
  assert.equal(selectionUpdate.filters.owner_user_id, "owner-a");
  assert.equal(selectionUpdate.filters.id, "account-owner");

  const selectedToken = selected.body.accessToken;
  currentPermissions = ["dashboard_view"];
  const me = await call(controller.handleMe, { headers: { authorization: `Bearer ${selectedToken}` } });
  assert.equal(me.statusCode, 200);
  assert.deepEqual(me.body.user.permissions, ["dashboard_view"]);
  assert.equal(me.body.user.countryCode, "TH");
  currentPermissions = ["*"];

  accountActive = false;
  assert.equal((await call(controller.handleMe, { headers: { authorization: `Bearer ${selectedToken}` } })).statusCode, 401);
  accountActive = true;

  const internalFailureController = createAuthV4Controller({
    ...dependencies,
    resolveSessionContext: async () => { throw new Error("permission denied for table workspace_accounts"); }
  });
  const internalFailure = await withoutExpectedErrorLog(() => call(internalFailureController.handleMe, { headers: { authorization: `Bearer ${selectedToken}` } }));
  assert.equal(internalFailure.statusCode, 500);
  assert.equal(internalFailure.body.error, "会话验证失败");
  assert.doesNotMatch(internalFailure.body.error, /workspace_accounts/);

  const source = fs.readFileSync(new URL("./auth-v4.js", import.meta.url), "utf8");
  const serverSource = fs.readFileSync(new URL("./index.js", import.meta.url), "utf8");
  const loginSource = fs.readFileSync(new URL("../../../admin-v4/src/components/Login.tsx", import.meta.url), "utf8");
  const appSource = fs.readFileSync(new URL("../../../admin-v4/src/App.tsx", import.meta.url), "utf8");
  const headerSource = fs.readFileSync(new URL("../../../admin-v4/src/components/Header.tsx", import.meta.url), "utf8");
  const importSource = fs.readFileSync(new URL("../../../scripts/import-june-2026-attendance.mjs", import.meta.url), "utf8");

  assert.doesNotMatch(source, /PRESET_ACCOUNTS|wmshr-auth-v4-secret-key|storedHash === password/);
  assert.doesNotMatch(`${source}\n${serverSource}\n${importSource}`, /employee_app_accounts/);
  assert.match(serverSource, /await resolveAdminV4SessionContext\(v4Session\)/);
  assert.match(serverSource, /workspace_members!workspace_members_owner_account_fkey\(id, owner_user_id, display_name, role_name, permissions, allowed_warehouses\)/);
  assert.match(serverSource, /skipLegacyLookup: intent === "register"/);
  assert.match(serverSource, /skipLegacyLookup\s*\? authUser\.id\s*:\s*await resolveCanonicalOwnerUserIdForEmail/);
  assert.match(source, /accountId: safe\.accountId/);
  assert.match(source, /countryCode: user\.countryCode/);
  assert.match(source, /handleForgotPassword/);
  assert.match(source, /handleResetAdminPassword/);
  assert.match(source, /fastRegistrationEnabled && bootstrapNewTenant/);
  assert.match(source, /\[auth-v4\/register\] auth_signup_ms=/);
  assert.match(source, /临时认证凭据缺少租户信息，请重新登录/);
  assert.match(source, /登录状态缺少租户账号信息，请重新登录/);
  assert.match(loginSource, /visibleContinents/);
  assert.match(loginSource, /clearPreAuth/);
  assert.match(loginSource, /disabled=\{isLoading\}/);
  assert.match(loginSource, /请求超时，请检查网络后重试/);
  assert.match(appSource, /api\/v4\/admin\/auth\/switch-country/);
  assert.match(appSource, /正在验证登录状态/);
  assert.match(appSource, /toastViewport/);
  assert.match(headerSource, /await onSelectCountry\(c\)/);
  assert.match(serverSource, /\.eq\("updated_at", payload\.updatedAt\)/);
  assert.match(serverSource, /conflict\.statusCode = 409/);
  assert.match(serverSource, /existingEmployee\.status !== "resigned"/);
  assert.match(serverSource, /不能授予超出自身范围的权限/);
  assert.match(serverSource, /employee_permission_audits/);

  const migration = fs.readFileSync(new URL("../../../supabase/migrations/20260908100000_tenant_bootstrap_hardening.sql", import.meta.url), "utf8");
  assert.match(migration, /foreign key \(owner_user_id, account_id\)/);
  const accountMigration = fs.readFileSync(new URL("../../../supabase/migrations/20260908120000_unify_employee_accounts.sql", import.meta.url), "utf8");
  assert.match(accountMigration, /from public\.employee_app_accounts/);
  assert.match(accountMigration, /on conflict do nothing/);
  console.log("auth-v4 self-check passed");
}

await main();
