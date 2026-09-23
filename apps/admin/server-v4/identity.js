const DEFAULT_WORKSPACE_NODES = [
  ["Asia", "韩国", "KR", "🇰🇷", "KRW"], ["Asia", "日本", "JP", "🇯🇵", "JPY"],
  ["Asia", "中国香港", "HK", "🇭🇰", "HKD"], ["Asia", "中国澳门", "MO", "🇲🇴", "MOP"],
  ["Asia", "马来西亚", "MY", "🇲🇾", "MYR"], ["Asia", "新加坡", "SG", "🇸🇬", "SGD"],
  ["Asia", "泰国", "TH", "🇹🇭", "THB"], ["Asia", "越南", "VN", "🇻🇳", "VND"],
  ["Asia", "缅甸", "MM", "🇲🇲", "MMK"],
  ["Asia", "文莱", "BN", "🇧🇳", "BND"], ["Asia", "印度尼西亚", "ID", "🇮🇩", "IDR"],
  ["Asia", "菲律宾", "PH", "🇵🇭", "PHP"], ["Europe", "英国", "GB", "🇬🇧", "GBP"],
  ["Europe", "法国", "FR", "🇫🇷", "EUR"], ["Europe", "德国", "DE", "🇩🇪", "EUR"],
  ["Americas", "美国", "US", "🇺🇸", "USD"], ["Africa", "埃及", "EG", "🇪🇬", "EGP"],
  ["Middle East", "阿曼", "OM", "🇴🇲", "OMR"], ["Middle East", "迪拜 (阿联酋)", "AE", "🇦🇪", "AED"]
];

const normalizeEmail = email => String(email || "").trim().toLowerCase();
const providerOf = user => typeof user?.app_metadata?.provider === "string" && user.app_metadata.provider ? user.app_metadata.provider : "email";
const providersOf = user => Array.isArray(user?.app_metadata?.providers) && user.app_metadata.providers.length
  ? user.app_metadata.providers.map(String).filter(Boolean)
  : [providerOf(user)];

function missingLinkTable(error) {
  return error?.code === "42P01" || String(error?.message || "").includes("admin_owner_");
}

function resolvedUser(authUser, ownerUserId) {
  return {
    ...authUser,
    id: ownerUserId,
    adminAuthUserId: authUser.id,
    adminOwnerUserId: ownerUserId,
    adminAuthProvider: providerOf(authUser),
    adminAuthProviders: providersOf(authUser)
  };
}

export function createV4IdentityService({ supabase, directDbPool }) {
  let isPoolHealthy = true;
  async function fetchBootstrapState(ownerUserId) {
    const { data, error } = await supabase.from("workspace_bootstrap_states").select("*").eq("owner_user_id", ownerUserId).maybeSingle();
    if (error) throw error;
    return data;
  }

  async function fetchDataPresence(ownerUserId) {
    const [employees, rules] = await Promise.all([
      supabase.from("workspace_employees").select("id").eq("owner_user_id", ownerUserId).limit(1),
      supabase.from("workspace_attendance_rules").select("id").eq("owner_user_id", ownerUserId).limit(1)
    ]);
    if (employees.error) throw employees.error;
    if (rules.error) throw rules.error;
    return { hasEmployees: Boolean(employees.data?.length), hasRules: Boolean(rules.data?.length) };
  }

  async function listAuthUserIdsByEmail(email) {
    const normalized = normalizeEmail(email);
    if (!normalized) return [];
    if (directDbPool && isPoolHealthy) {
      try {
        const result = await directDbPool.query("select id from auth.users where lower(email) = $1 order by created_at asc, id asc", [normalized]);
        return result.rows.map(row => String(row.id)).filter(Boolean);
      } catch (error) {
        console.warn("[admin-v4/auth] auth.users lookup failed", error.message || error);
      }
    }
    return [];
  }

  async function resolveCanonicalOwner(email, fallbackUserId) {
    const candidates = Array.from(new Set([...(await listAuthUserIdsByEmail(email)), fallbackUserId].filter(Boolean)));
    for (const candidateId of candidates) {
      const [presence, bootstrap] = await Promise.all([fetchDataPresence(candidateId), fetchBootstrapState(candidateId)]);
      if (bootstrap || presence.hasEmployees || presence.hasRules) return candidateId;
    }
    return candidates[0] || fallbackUserId;
  }

  async function ensureOwnerIdentity(authUser, { skipLegacyLookup = false } = {}) {
    const email = normalizeEmail(authUser.email);
    if (!email) return resolvedUser(authUser, authUser.id);
    const now = new Date().toISOString();
    const provider = providerOf(authUser);
    const providers = providersOf(authUser);

    const { data: existing, error: existingError } = await supabase.from("admin_owner_identity_links").select("owner_user_id, email").eq("auth_user_id", authUser.id).maybeSingle();
    if (existingError) {
      if (missingLinkTable(existingError)) return resolvedUser(authUser, authUser.id);
      throw existingError;
    }
    if (existing?.owner_user_id) {
      const { error } = await supabase.from("admin_owner_identity_links").update({ provider, providers, last_seen_at: now, updated_at: now }).eq("auth_user_id", authUser.id);
      if (error) throw error;
      return resolvedUser(authUser, existing.owner_user_id);
    }

    const ownerUserId = skipLegacyLookup ? authUser.id : await resolveCanonicalOwner(email, authUser.id);
    const { error: emailError } = await supabase.from("admin_owner_email_links").upsert({ email, owner_user_id: ownerUserId, created_by_auth_user_id: authUser.id, updated_at: now }, { onConflict: "email", ignoreDuplicates: true });
    if (emailError) {
      if (missingLinkTable(emailError)) return resolvedUser(authUser, authUser.id);
      throw emailError;
    }
    const { data: emailLink, error: emailFetchError } = await supabase.from("admin_owner_email_links").select("owner_user_id").eq("email", email).maybeSingle();
    if (emailFetchError) throw emailFetchError;
    const canonicalOwner = emailLink?.owner_user_id || ownerUserId;
    const { error: linkError } = await supabase.from("admin_owner_identity_links").upsert({ auth_user_id: authUser.id, owner_user_id: canonicalOwner, email, provider, providers, last_seen_at: now, updated_at: now }, { onConflict: "auth_user_id" });
    if (linkError) {
      if (missingLinkTable(linkError)) return resolvedUser(authUser, authUser.id);
      throw linkError;
    }
    return resolvedUser(authUser, canonicalOwner);
  }

  async function resolveAdminIdentity(authUser, intent = "login") {
    const email = normalizeEmail(authUser?.email);
    if (!email) {
      const error = new Error("认证身份缺少有效邮箱");
      error.statusCode = 400;
      throw error;
    }
    const [{ data: identity, error: identityError }, { data: emailLink, error: emailError }] = await Promise.all([
      supabase.from("admin_owner_identity_links").select("owner_user_id").eq("auth_user_id", authUser.id).maybeSingle(),
      supabase.from("admin_owner_email_links").select("owner_user_id").eq("email", email).maybeSingle()
    ]);
    if (identityError && !missingLinkTable(identityError)) throw identityError;
    if (emailError && !missingLinkTable(emailError)) throw emailError;
    const isAutoRegister = intent === "register" || intent === "login_or_register";
    if (!identity && !emailLink && !isAutoRegister) {
      const [presence, bootstrap] = await Promise.all([fetchDataPresence(authUser.id), fetchBootstrapState(authUser.id)]);
      if (!bootstrap && !presence.hasEmployees && !presence.hasRules) {
        const error = new Error("该账号尚未注册，请先创建新企业");
        error.statusCode = 404;
        throw error;
      }
    }
    return ensureOwnerIdentity(authUser, { skipLegacyLookup: intent === "register" });
  }

  async function bootstrapNewTenant(authUser, { registrationMode = "email", name, passwordHash } = {}) {
    const email = normalizeEmail(authUser?.email);
    if (!email || !authUser?.id) {
      const error = new Error("认证身份缺少有效邮箱或用户标识");
      error.statusCode = 400;
      throw error;
    }
    const { data, error } = await supabase.rpc("bootstrap_admin_v4_tenant", {
      p_owner_user_id: authUser.id,
      p_email: email,
      p_display_name: String(name || authUser.user_metadata?.full_name || authUser.user_metadata?.name || email),
      p_registration_mode: registrationMode,
      p_password_hash: passwordHash || null
    });
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    if (!row?.account_id || !row?.owner_user_id) {
      const invalidResult = new Error("租户初始化未返回完整账号上下文");
      invalidResult.statusCode = 500;
      throw invalidResult;
    }
    const member = {
      display_name: row.display_name,
      role_name: row.role_name,
      permissions: Array.isArray(row.permissions) ? row.permissions : [],
      allowed_warehouses: Array.isArray(row.allowed_warehouses) ? row.allowed_warehouses : []
    };
    return {
      ...authUser,
      id: row.owner_user_id,
      ownerUserId: row.owner_user_id,
      adminOwnerUserId: row.owner_user_id,
      adminAuthUserId: authUser.id,
      accountId: row.account_id,
      account: row.account,
      email,
      member,
      permissions: member.permissions,
      allowedWarehouses: member.allowed_warehouses
    };
  }

  async function ensureTenantBootstrap(authUser, { registrationMode = "email", name, passwordHash } = {}) {
    const ownerUserId = authUser.adminOwnerUserId || authUser.id;
    const email = normalizeEmail(authUser.email);
    const now = new Date().toISOString();
    const { data: existing, error: stateError } = await supabase.from("workspace_bootstrap_states").select("status").eq("owner_user_id", ownerUserId).maybeSingle();
    if (stateError) throw stateError;
    if (existing?.status === "complete") return;
    const pending = { owner_user_id: ownerUserId, bootstrap_mode: "tenant_init", bootstrap_source: "auto", status: "pending", registration_mode: registrationMode, bootstrapped_by_email: email, last_error: null, updated_at: now };
    const { error: pendingError } = await supabase.from("workspace_bootstrap_states").upsert(pending, { onConflict: "owner_user_id" });
    if (pendingError) throw pendingError;
    try {
      const { data: account, error: accountError } = await supabase.from("workspace_accounts").upsert({ owner_user_id: ownerUserId, employee_id: null, account: email, password_hash: passwordHash || null, account_type: "superadmin", status: "active", updated_at: now }, { onConflict: "owner_user_id,account" }).select("id").single();
      if (accountError) throw accountError;
      const operations = await Promise.all([
        supabase.from("workspace_members").upsert({ owner_user_id: ownerUserId, account_id: account.id, display_name: String(name || authUser.user_metadata?.full_name || email), role_name: "超级管理员", permissions: ["*"], allowed_warehouses: ["*"], updated_at: now }, { onConflict: "owner_user_id,account_id" }),
        supabase.from("workspace_nodes").upsert(DEFAULT_WORKSPACE_NODES.map(([continent, country_name, country_code, flag_emoji, currency]) => ({ owner_user_id: ownerUserId, continent, country_name, country_code, flag_emoji, currency })), { onConflict: "owner_user_id,country_code" }),
        supabase.from("attendance_config").upsert({ owner_user_id: ownerUserId, currency: "THB", updated_at: now }, { onConflict: "owner_user_id" })
      ]);
      const operationError = operations.find(result => result.error)?.error;
      if (operationError) throw operationError;
      const { error: completeError } = await supabase.from("workspace_bootstrap_states").update({ status: "complete", completed_at: now, last_error: null, updated_at: now }).eq("owner_user_id", ownerUserId);
      if (completeError) throw completeError;
    } catch (error) {
      await supabase.from("workspace_bootstrap_states").update({ status: "failed", last_error: String(error.message || error), updated_at: new Date().toISOString() }).eq("owner_user_id", ownerUserId);
      throw error;
    }
  }

  function sessionError(message, statusCode) {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
  }

  function memberOf(account) {
    return Array.isArray(account?.workspace_members) ? account.workspace_members[0] : account?.workspace_members;
  }

  const sessionCache = new Map();
  const SESSION_CACHE_TTL_MS = 15_000;

  function invalidateSessionCache(ownerUserId) {
    if (!ownerUserId) sessionCache.clear();
    else {
      for (const key of sessionCache.keys()) {
        if (key.startsWith(`${ownerUserId}:`)) sessionCache.delete(key);
      }
    }
  }

  async function resolveSessionContext(session) {
    const ownerUserId = String(session?.ownerUserId || session?.adminOwnerUserId || "");
    if (!ownerUserId) throw sessionError("登录状态已失效，请重新登录", 401);
    const accountIdentifier = String(session.accountId || session.account || session.userId || "");
    const countryCode = String(session.countryCode || "").trim().toUpperCase();
    const cacheKey = `${ownerUserId}:${accountIdentifier}:${countryCode}`;
    const cached = sessionCache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.context;
    }

    if (directDbPool && isPoolHealthy) {
      try {
        let whereClause = "a.owner_user_id = $1";
      const params = [ownerUserId];
      if (session.accountId) {
        whereClause += " AND a.id = $2";
        params.push(String(session.accountId));
      } else if (session.account) {
        whereClause += " AND a.account = $2";
        params.push(normalizeEmail(session.account));
      } else if (session.userId) {
        whereClause += " AND a.id = $2";
        params.push(String(session.userId));
      } else {
        throw sessionError("登录状态缺少账号信息，请重新登录", 401);
      }

      const querySql = `
        SELECT 
          a.id, a.owner_user_id, a.account, a.account_type, a.status, a.employee_id,
          m.id AS member_id, m.display_name, m.role_name, m.permissions, m.allowed_warehouses,
          n.country_code AS active_node
        FROM workspace_accounts a
        JOIN workspace_members m ON m.owner_user_id = a.owner_user_id AND m.account_id = a.id
        LEFT JOIN workspace_nodes n ON n.owner_user_id = a.owner_user_id AND n.country_code = $3 AND n.is_active = true
        WHERE ${whereClause}
        LIMIT 1;
      `;
      const { rows } = await directDbPool.query(querySql, [...params, countryCode || null]);
      const row = rows[0];
      if (!row || row.status !== "active") throw sessionError("账号已停用或登录状态已失效", 401);
      if (countryCode) {
        const allowed = Array.isArray(row.allowed_warehouses) ? row.allowed_warehouses : [];
        if (!allowed.includes("*") && !allowed.includes(countryCode)) throw sessionError("当前账号已失去该海外仓权限，请重新选择", 403);
        if (!row.active_node) throw sessionError("当前海外仓已停用，请重新选择", 403);
      }
      const member = {
        id: row.member_id,
        owner_user_id: row.owner_user_id,
        display_name: row.display_name,
        role_name: row.role_name,
        permissions: Array.isArray(row.permissions) ? row.permissions : [],
        allowed_warehouses: Array.isArray(row.allowed_warehouses) ? row.allowed_warehouses : []
      };
      const context = {
        id: ownerUserId,
        ownerUserId,
        adminOwnerUserId: ownerUserId,
        adminAuthUserId: session.authUserId || session.adminAuthUserId || session.userId || row.id,
        accountId: row.id,
        account: row.account,
        email: session.email || session.account || row.account,
        name: row.display_name,
        role: row.role_name,
        permissions: member.permissions,
        allowedWarehouses: member.allowed_warehouses,
        country: session.country,
        countryCode: countryCode || undefined,
        currency: session.currency,
        member,
        employeeId: row.employee_id
      };
      if (sessionCache.size > 500) sessionCache.clear();
      sessionCache.set(cacheKey, { expiresAt: Date.now() + SESSION_CACHE_TTL_MS, context });
      return context;
    } catch (poolErr) {
      isPoolHealthy = false;
console.warn("[admin-v4/identity] directDbPool unavailable, switched directly to REST:", poolErr.message);
    }
  }

    let query = supabase.from("workspace_accounts").select("id, owner_user_id, account, account_type, status, employee_id, workspace_members!workspace_members_owner_account_fkey(id, owner_user_id, display_name, role_name, permissions, allowed_warehouses)").eq("owner_user_id", ownerUserId);
    if (session.accountId) query = query.eq("id", String(session.accountId));
    else if (session.account) query = query.eq("account", normalizeEmail(session.account));
    else if (session.userId) query = query.eq("id", String(session.userId));
    else throw sessionError("登录状态缺少账号信息，请重新登录", 401);
    const { data: account, error } = await query.maybeSingle();
    if (error) throw error;
    if (!account || account.status !== "active") throw sessionError("账号已停用或登录状态已失效", 401);
    const member = memberOf(account);
    if (!member || member.owner_user_id !== ownerUserId) throw sessionError("账号成员关系无效或已被移除", 403);
    if (countryCode) {
      const allowed = Array.isArray(member.allowed_warehouses) ? member.allowed_warehouses : [];
      if (!allowed.includes("*") && !allowed.includes(countryCode)) throw sessionError("当前账号已失去该海外仓权限，请重新选择", 403);
      const { data: node, error: nodeError } = await supabase.from("workspace_nodes").select("country_code").eq("owner_user_id", ownerUserId).eq("country_code", countryCode).eq("is_active", true).maybeSingle();
      if (nodeError) throw nodeError;
      if (!node) throw sessionError("当前海外仓已停用，请重新选择", 403);
    }
    const context = {
      id: ownerUserId,
      ownerUserId,
      adminOwnerUserId: ownerUserId,
      adminAuthUserId: session.authUserId || session.adminAuthUserId || session.userId || account.id,
      accountId: account.id,
      account: account.account,
      email: session.email || session.account || account.account,
      name: member.display_name,
      role: member.role_name,
      permissions: Array.isArray(member.permissions) ? member.permissions : [],
      allowedWarehouses: Array.isArray(member.allowed_warehouses) ? member.allowed_warehouses : [],
      country: session.country,
      countryCode: countryCode || undefined,
      currency: session.currency,
      member,
      employeeId: account.employee_id
    };

    if (sessionCache.size > 500) sessionCache.clear();
    sessionCache.set(cacheKey, { expiresAt: Date.now() + SESSION_CACHE_TTL_MS, context });
    return context;
  }

  return {
    resolveAdminIdentity,
    bootstrapNewTenant,
    ensureTenantBootstrap,
    resolveSessionContext,
    invalidateSessionCache,
    resolveWorkspaceAuthContext: authUser => resolveSessionContext({ ownerUserId: authUser.adminOwnerUserId || authUser.ownerUserId || authUser.id, authUserId: authUser.adminAuthUserId || authUser.authUserId || authUser.id, account: normalizeEmail(authUser.email || authUser.account), email: normalizeEmail(authUser.email || authUser.account) })
  };
}
