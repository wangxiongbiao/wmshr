import { hashPassword } from "../server/auth-v4.js";

const DEFAULT_EMPLOYEE_PASSWORD = "Aa123456";
const EMPLOYEE_COLUMNS = "id, employee_no, name, nickname, gender, warehouse_code, nationality, country, phone, role, dept, join_date, status, attendance_rule_id, salary_type, hourly_rate, fixed_salary, daily_wage, overtime_hourly_fee, overtime_rule_enabled, ot_rule_type, ot_base_rate, ot_multiplier_workday, ot_multiplier_weekend, ot_multiplier_holiday, is_dispatch_personnel, attendance_bonus, social_security, meal_allowance, service_fee_rate, currency, bank_card_number, bank_name, id_card, photo, is_deleted, updated_at";

const normalizeGender = g => (g === "male" || g === "男" ? "male" : "female");

const normalizeStatus = s => {
  if (s === "在职" || s === "active") return "active";
  if (s === "休假" || s === "on_leave") return "on_leave";
  if (s === "离职" || s === "resigned") return "resigned";
  if (s === "probation") return "probation";
  return s || "active";
};

const today = () => new Date().toISOString().slice(0, 10);
const maxJoinDate = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1); // 允许跨时区（如 UTC+7/UTC+8）当天入职，提供 1 天时区冗余
  return d.toISOString().slice(0, 10);
};
const normalizeAmount = value => value === null || value === undefined || value === "" ? null : Number(value);
const nonNegative = value => Number.isFinite(Number(value)) && Number(value) > 0 ? Number(value) : 0;

export function mapEmployeeRow(row) {
  return {
    id: Number(row.id),
    employeeNo: row.employee_no,
    name: row.name,
    nickname: row.nickname || "",
    gender: row.gender,
    warehouseCode: row.warehouse_code || row.country || "TH",
    nationality: row.nationality || row.country || "MM",
    country: row.country || row.nationality || "MM",
    phone: row.phone,
    role: row.role,
    dept: row.dept,
    joinDate: row.join_date,
    status: row.status,
    attendanceRuleId: row.attendance_rule_id == null ? 0 : Number(row.attendance_rule_id),
    attendanceRuleName: row.attendance_rule_name || null,
    salaryType: row.salary_type,
    hourlyRate: row.hourly_rate == null ? null : Number(row.hourly_rate),
    fixedSalary: row.fixed_salary == null ? null : Number(row.fixed_salary),
    dailyWage: row.daily_wage == null ? (row.fixed_salary != null ? Math.round(Number(row.fixed_salary) / 30) : null) : Number(row.daily_wage),
    overtimeHourlyFee: row.overtime_hourly_fee == null ? null : Number(row.overtime_hourly_fee),
    overtimeRuleEnabled: row.overtime_rule_enabled == null ? null : Boolean(row.overtime_rule_enabled),
    otRuleType: row.ot_rule_type || "fixed",
    otFixedRate: row.overtime_hourly_fee == null ? null : Number(row.overtime_hourly_fee),
    otBaseRate: row.ot_base_rate == null ? null : Number(row.ot_base_rate),
    otMultiplierWorkday: row.ot_multiplier_workday == null ? 1.5 : Number(row.ot_multiplier_workday),
    otMultiplierWeekend: row.ot_multiplier_weekend == null ? 2.0 : Number(row.ot_multiplier_weekend),
    otMultiplierHoliday: row.ot_multiplier_holiday == null ? 3.0 : Number(row.ot_multiplier_holiday),
    username: row.account || row.username || row.employee_no,
    isDispatchPersonnel: Boolean(row.is_dispatch_personnel),
    attendanceBonus: row.attendance_bonus == null ? 0 : Number(row.attendance_bonus),
    socialSecurity: row.social_security == null ? 0 : Number(row.social_security),
    mealAllowance: row.meal_allowance == null ? 0 : Number(row.meal_allowance),
    serviceFeeRate: row.service_fee_rate == null ? 0 : Number(row.service_fee_rate),
    currency: row.currency,
    bankCardNumber: row.bank_card_number || "",
    bankName: row.bank_name || "",
    idCard: row.id_card || "",
    photo: row.photo || null,
    isDeleted: row.is_deleted,
    updatedAt: row.updated_at
  };
}

function employeePayload(body = {}, authUser = {}) {
  const rawWarehouseCode = String(body.warehouseCode || body.warehouse || "").trim().toUpperCase();
  const isInvalidWarehouse = !rawWarehouseCode || rawWarehouseCode === "MM" || rawWarehouseCode === "KH";
  const warehouseCode = isInvalidWarehouse ? (authUser?.adminV4CountryCode || "TH") : rawWarehouseCode;
  const nationality = String(body.nationality || body.country || "MM").trim();
  return {
    name: String(body.name || "").trim(),
    nickname: String(body.nickname || "").trim(),
    gender: normalizeGender(body.gender),
    warehouseCode,
    nationality,
    country: nationality,
    phone: String(body.phone || "").trim(),
    role: String(body.role || "").trim(),
    dept: String(body.dept || "").trim(),
    joinDate: String(body.joinDate || ""),
    status: normalizeStatus(body.status),
    ...(() => {
      let hourlyRate = normalizeAmount(body.hourlyRate);
      let fixedSalary = normalizeAmount(body.fixedSalary !== undefined ? body.fixedSalary : body.baseMonthlyWage);
      let dailyWage = normalizeAmount(body.dailyWage);

      if (fixedSalary === null && dailyWage !== null) {
        fixedSalary = Math.round(dailyWage * 30);
      } else if (dailyWage === null && fixedSalary !== null) {
        dailyWage = Math.round(fixedSalary / 30);
      }

      let salaryType = body.salaryType;
      if (salaryType !== "hourly" && salaryType !== "fixed") {
        salaryType = (hourlyRate !== null && fixedSalary === null) ? "hourly" : "fixed";
      }
      if (salaryType === "fixed" && fixedSalary === null) {
        fixedSalary = hourlyRate !== null ? Math.round(hourlyRate * 8 * 30) : 0;
      }
      if (salaryType === "hourly" && hourlyRate === null) {
        hourlyRate = fixedSalary !== null ? Math.round(fixedSalary / 240) : 0;
      }

      const otRuleType = body.otRuleType === "multiplier" ? "multiplier" : "fixed";
      const otFixedRate = normalizeAmount(body.otFixedRate !== undefined ? body.otFixedRate : (body.overtimeHourlyFee !== undefined ? body.overtimeHourlyFee : undefined));
      const otBaseRate = normalizeAmount(body.otBaseRate);
      const otMultiplierWorkday = normalizeAmount(body.otMultiplierWorkday) ?? 1.5;
      const otMultiplierWeekend = normalizeAmount(body.otMultiplierWeekend) ?? 2.0;
      const otMultiplierHoliday = normalizeAmount(body.otMultiplierHoliday) ?? 3.0;

      return {
        salaryType,
        hourlyRate,
        fixedSalary,
        dailyWage,
        overtimeHourlyFee: otFixedRate,
        otRuleType,
        otBaseRate,
        otMultiplierWorkday,
        otMultiplierWeekend,
        otMultiplierHoliday,
        username: body.username ? String(body.username).trim() : null,
        password: body.password ? String(body.password).trim() : null
      };
    })(),
    isDispatchPersonnel: Boolean(body.isDispatchPersonnel),
    attendanceBonus: nonNegative(body.attendanceBonus),
    socialSecurity: nonNegative(body.socialSecurity),
    mealAllowance: nonNegative(body.mealAllowance),
    serviceFeeRate: nonNegative(body.serviceFeeRate),
    salaryEffectiveStartDate: String(body.salaryEffectiveStartDate || body.joinDate || ""),
    currency: String(body.currency || "THB"),
    bankCardNumber: body.bankCardNumber ? String(body.bankCardNumber).trim() : null,
    bankName: body.bankName ? String(body.bankName).trim() : null,
    idCard: body.idCard ? String(body.idCard).trim() : null,
    permissions: Array.isArray(body.permissions)
      ? [...new Set(body.permissions.filter(p => typeof p === "string" && p.length <= 80))]
      : undefined,
    photo: Object.prototype.hasOwnProperty.call(body, "photo") ? (body.photo || null) : undefined,
    updatedAt: body.updatedAt || null
  };
}

function validatePayload(payload) {
  if (payload.permissions && payload.permissions.length > 100) return "权限数量不合法";
  if (!payload.name) return "员工姓名不能为空";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(payload.joinDate)) return "入职日期格式不正确";
  if (payload.joinDate > maxJoinDate()) return "入职日期不能晚于今天";
  if (!/^(active|on_leave|probation|resigned)$/.test(payload.status)) return "员工状态不合法";
  if (payload.hourlyRate === null && payload.fixedSalary === null && payload.dailyWage === null) return "请至少输入时薪、固定日薪或基础月薪中的一项";
  const amounts = [payload.hourlyRate, payload.fixedSalary, payload.dailyWage, payload.attendanceBonus, payload.socialSecurity, payload.mealAllowance, payload.serviceFeeRate, payload.overtimeHourlyFee, payload.otBaseRate];
  if (amounts.some(value => value !== null && (!Number.isFinite(Number(value)) || Number(value) < 0))) return "金额必须大于等于 0";
  return null;
}

function employeeNo() {
  return `EMP${Date.now().toString().slice(-8)}${String(Math.floor(Math.random() * 90) + 10)}`;
}

async function compatibilityRuleId(supabase, ownerUserId, warehouseCode = "TH") {
  const { data, error } = await supabase.from("workspace_attendance_rules")
    .select("id")
    .eq("owner_user_id", ownerUserId)
    .eq("warehouse_code", warehouseCode)
    .order("id", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (data?.id) return Number(data.id);
  const { data: created, error: createError } = await supabase.from("workspace_attendance_rules").insert({
    owner_user_id: ownerUserId,
    warehouse_code: warehouseCode,
    name: "默认考勤规则",
    is_active: true,
    effective_start_date: today(),
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
  }).select("id").single();
  if (createError) throw createError;
  return Number(created.id);
}

async function ensureSalaryProfile(supabase, employee, ownerUserId, effectiveStartDate) {
  const payload = {
    owner_user_id: ownerUserId,
    employee_id: Number(employee.id),
    effective_start_date: effectiveStartDate || employee.join_date || today(),
    salary_type: employee.salary_type,
    hourly_rate: employee.hourly_rate,
    fixed_salary: employee.fixed_salary,
    attendance_bonus: employee.attendance_bonus || 0,
    social_security: employee.social_security || 0,
    meal_allowance: employee.meal_allowance || 0,
    service_fee_rate: employee.service_fee_rate || 0,
    currency: employee.currency || "THB"
  };
  const existing = await supabase.from("workspace_salary_profiles")
    .select("id")
    .eq("owner_user_id", ownerUserId)
    .eq("employee_id", Number(employee.id))
    .eq("effective_start_date", payload.effective_start_date)
    .maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data) return existing.data;
  const result = await supabase.from("workspace_salary_profiles")
    .insert({ ...payload, created_at: new Date().toISOString() })
    .select("*")
    .single();
  if (result.error) throw result.error;
  return result.data;
}

async function ensureEmployeeAccount(supabase, employee, ownerUserId, customAccount, customPassword, customPermissions) {
  const existing = await supabase.from("workspace_accounts").select("id, employee_id, account, status, last_login_at, password_updated_at, updated_at").eq("owner_user_id", ownerUserId).eq("employee_id", Number(employee.id)).eq("account_type", "employee").maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data) {
    const updatePayload = {};
    if (customAccount && customAccount !== existing.data.account) {
      updatePayload.account = customAccount;
    }
    if (customPassword && typeof customPassword === "string" && customPassword.trim().length >= 6) {
      updatePayload.password_hash = await hashPassword(customPassword.trim());
      updatePayload.password_updated_at = new Date().toISOString();
    }
    const memberUpdate = {
      display_name: employee.name,
      allowed_warehouses: [employee.warehouse_code || employee.country || "TH"],
      updated_at: new Date().toISOString()
    };
    if (Array.isArray(customPermissions)) {
      memberUpdate.permissions = customPermissions;
    }
    await supabase.from("workspace_members").update(memberUpdate).eq("owner_user_id", ownerUserId).eq("account_id", existing.data.id);
    if (Object.keys(updatePayload).length > 0) {
      updatePayload.updated_at = new Date().toISOString();
      const { data: updated, error: updateError } = await supabase.from("workspace_accounts").update(updatePayload).eq("id", existing.data.id).select("id, employee_id, account, status, last_login_at, password_updated_at, updated_at").single();
      if (updateError) {
        if (updateError.code === "23505") {
          const err = new Error("该 APP 登录账号已被其他员工使用，请使用其他账号");
          err.statusCode = 400;
          throw err;
        }
        throw updateError;
      }
      return updated;
    }
    return existing.data;
  }
  const accountToUse = customAccount || employee.employee_no;
  const passwordToUse = (customPassword && typeof customPassword === "string" && customPassword.trim().length >= 6) ? customPassword.trim() : DEFAULT_EMPLOYEE_PASSWORD;
  const result = await supabase.from("workspace_accounts").insert({
    owner_user_id: ownerUserId, employee_id: Number(employee.id), account: accountToUse,
    password_hash: await hashPassword(passwordToUse), account_type: "employee", status: "active",
    password_updated_at: new Date().toISOString(), created_at: new Date().toISOString(), updated_at: new Date().toISOString()
  }).select("id, employee_id, account, status, last_login_at, password_updated_at, updated_at").single();
  if (result.error) {
    if (result.error.code === "23505") {
      const err = new Error("该 APP 登录账号已被其他员工使用，请使用其他账号");
      err.statusCode = 400;
      throw err;
    }
    throw result.error;
  }
  await supabase.from("workspace_members").upsert({
    owner_user_id: ownerUserId, account_id: result.data.id, display_name: employee.name, role_name: "普通员工",
    permissions: Array.isArray(customPermissions) ? customPermissions : ["dashboard_view", "sop_view"], allowed_warehouses: [employee.warehouse_code || employee.country || "TH"], updated_at: new Date().toISOString()
  }, { onConflict: "owner_user_id,account_id" });
  return result.data;
}


async function compatibilityRuleIdDirect(client, ownerUserId, warehouseCode = "TH") {
  const { rows } = await client.query(
    "SELECT id FROM workspace_attendance_rules WHERE owner_user_id = $1 AND warehouse_code = $2 ORDER BY id ASC LIMIT 1",
    [ownerUserId, warehouseCode]
  );
  if (rows.length > 0) return Number(rows[0].id);
  const created = await client.query(`
    INSERT INTO workspace_attendance_rules (
      owner_user_id, warehouse_code, name, is_active, effective_start_date,
      start_shift, end_shift, break_start, break_end, standard_hours,
      overtime_enabled, ot_hourly_fee, overtime_min_unit_hours, overtime_rounding,
      created_at, updated_at
    ) VALUES (
      $1, $2, '默认考勤规则', true, CURRENT_DATE,
      '08:30', '17:30', '12:00', '13:00', 8,
      true, 0, 0.5, 'floor_to_half_hour',
      NOW(), NOW()
    ) RETURNING id;
  `, [ownerUserId, warehouseCode]);
  return Number(created.rows[0].id);
}

async function ensureSalaryProfileDirect(client, employee, ownerUserId, effectiveStartDate) {
  const startDate = effectiveStartDate || employee.join_date || today();
  const existing = await client.query(
    "SELECT id FROM workspace_salary_profiles WHERE owner_user_id = $1 AND employee_id = $2 AND effective_start_date = $3 LIMIT 1",
    [ownerUserId, Number(employee.id), startDate]
  );
  if (existing.rows.length > 0) return existing.rows[0];
  const created = await client.query(`
    INSERT INTO workspace_salary_profiles (
      owner_user_id, employee_id, effective_start_date, salary_type,
      hourly_rate, fixed_salary, attendance_bonus, social_security,
      meal_allowance, service_fee_rate, currency, created_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW()
    ) RETURNING *;
  `, [
    ownerUserId,
    Number(employee.id),
    startDate,
    employee.salary_type,
    employee.hourly_rate,
    employee.fixed_salary,
    employee.attendance_bonus || 0,
    employee.social_security || 0,
    employee.meal_allowance || 0,
    employee.service_fee_rate || 0,
    employee.currency || "THB"
  ]);
  return created.rows[0];
}

async function ensureEmployeeAccountDirect(client, employee, ownerUserId, customAccount, customPassword, customPermissions) {
  const existing = await client.query(
    "SELECT id, employee_id, account, status, last_login_at, password_updated_at, updated_at FROM workspace_accounts WHERE owner_user_id = $1 AND employee_id = $2 AND account_type = 'employee' LIMIT 1",
    [ownerUserId, Number(employee.id)]
  );
  if (existing.rows.length > 0) {
    const acc = existing.rows[0];
    let newAccount = acc.account;
    let newPasswordHash = null;
    if (customAccount && customAccount !== acc.account) {
      newAccount = customAccount;
    }
    if (customPassword && typeof customPassword === "string" && customPassword.trim().length >= 6) {
      newPasswordHash = await hashPassword(customPassword.trim());
    }
    if (Array.isArray(customPermissions)) {
      await client.query(`
        UPDATE workspace_members
        SET display_name = $1, allowed_warehouses = $2, permissions = $5::jsonb, updated_at = NOW()
        WHERE owner_user_id = $3 AND account_id = $4
      `, [
        employee.name,
        [employee.warehouse_code || employee.country || "TH"],
        ownerUserId,
        acc.id,
        JSON.stringify(customPermissions)
      ]);
    } else {
      await client.query(`
        UPDATE workspace_members
        SET display_name = $1, allowed_warehouses = $2, updated_at = NOW()
        WHERE owner_user_id = $3 AND account_id = $4
      `, [
        employee.name,
        [employee.warehouse_code || employee.country || "TH"],
        ownerUserId,
        acc.id
      ]);
    }
    if (newAccount !== acc.account || newPasswordHash) {
      try {
        const updateRes = await client.query(`
          UPDATE workspace_accounts
          SET account = $1,
              password_hash = COALESCE($2, password_hash),
              password_updated_at = CASE WHEN $2 IS NOT NULL THEN NOW() ELSE password_updated_at END,
              updated_at = NOW()
          WHERE id = $3
          RETURNING id, employee_id, account, status, last_login_at, password_updated_at, updated_at;
        `, [newAccount, newPasswordHash, acc.id]);
        return updateRes.rows[0];
      } catch (updateErr) {
        if (updateErr.code === "23505") {
          const err = new Error("该 APP 登录账号已被其他员工使用，请使用其他账号");
          err.statusCode = 400;
          throw err;
        }
        throw updateErr;
      }
    }
    return acc;
  }

  const accountToUse = customAccount || employee.employee_no;
  const passwordToUse = (customPassword && typeof customPassword === "string" && customPassword.trim().length >= 6) ? customPassword.trim() : DEFAULT_EMPLOYEE_PASSWORD;
  const passwordHash = await hashPassword(passwordToUse);
  let createdAccount;
  try {
    const accRes = await client.query(`
      INSERT INTO workspace_accounts (
        owner_user_id, employee_id, account, password_hash, account_type, status,
        password_updated_at, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, 'employee', 'active', NOW(), NOW(), NOW()
      ) RETURNING id, employee_id, account, status, last_login_at, password_updated_at, updated_at;
    `, [ownerUserId, Number(employee.id), accountToUse, passwordHash]);
    createdAccount = accRes.rows[0];
  } catch (err) {
    if (err.code === "23505") {
      const e = new Error("该 APP 登录账号已被其他员工使用，请使用其他账号");
      e.statusCode = 400;
      throw e;
    }
    throw err;
  }

  const permissionsToUse = Array.isArray(customPermissions) ? customPermissions : ["dashboard_view", "sop_view"];
  await client.query(`
    INSERT INTO workspace_members (
      owner_user_id, account_id, display_name, role_name, permissions, allowed_warehouses, updated_at
    ) VALUES (
      $1, $2, $3, '普通员工', $5::jsonb, $4, NOW()
    ) ON CONFLICT (owner_user_id, account_id) DO UPDATE SET
      display_name = EXCLUDED.display_name,
      allowed_warehouses = EXCLUDED.allowed_warehouses,
      permissions = EXCLUDED.permissions,
      updated_at = NOW();
  `, [
    ownerUserId,
    createdAccount.id,
    employee.name,
    [employee.warehouse_code || employee.country || "TH"],
    JSON.stringify(permissionsToUse)
  ]);

  return createdAccount;
}

function accountDto(account, employee) {
  return {
    id: account.id, employeeId: Number(employee.id), account: account.account, status: account.status,
    lastLoginAt: account.last_login_at, passwordUpdatedAt: account.password_updated_at, defaultPasswordHint: DEFAULT_EMPLOYEE_PASSWORD
  };
}

function permissionAllowed(req, ...permissions) {
  const current = req.authUser?.permissions || [];
  if (current.includes("*") || current.includes("all")) return true;
  return permissions.some(permission => current.includes(permission));
}

function isWarehouseAllowed(authUser, warehouseCode) {
  const activeWarehouse = authUser?.adminV4CountryCode || authUser?.countryCode;
  if (activeWarehouse && warehouseCode && warehouseCode !== activeWarehouse) {
    return false;
  }
  const allowed = Array.isArray(authUser?.allowedWarehouses) ? authUser.allowedWarehouses : [];
  if (allowed.includes("*") || allowed.includes("all")) return true;
  if (!warehouseCode) return true;
  return allowed.includes(warehouseCode);
}

async function employeeScope(supabase, req, res, employeeId) {
  const { data, error } = await supabase.from("workspace_employees")
    .select("id, warehouse_code")
    .eq("owner_user_id", req.authUser.id)
    .eq("id", Number(employeeId))
    .eq("is_deleted", false)
    .maybeSingle();
  if (error) throw error;
  if (!data || !isWarehouseAllowed(req.authUser, data.warehouse_code)) {
    res.status(404).json({ error: "员工不存在或不属于当前仓库" });
    return false;
  }
  return true;
}

export function createEmployeeRouter({ express, supabase, directDbPool, identity }) {
  const router = express.Router();
  const safeFailure = (res, error, message) => {
    console.error(`[admin-v4/employees] ${message}`, error);
    res.status(error?.statusCode || 500).json({ error: error?.statusCode ? error.message : message });
  };

  router.get("/employees", async (req, res) => {
    try {
      if (!permissionAllowed(req, "employees_view", "employees_manage")) return res.status(403).json({ error: "无权查看员工" });
      const ownerUserId = req.authUser.id;
      const page = Math.max(1, Number.parseInt(String(req.query.page || "1"), 10) || 1);
      const pageSize = Math.min(50, Math.max(10, Number.parseInt(String(req.query.pageSize || "24"), 10) || 24));
      const status = String(req.query.status || "all");
      const keyword = String(req.query.keyword || "").trim();
      let query = supabase.from("workspace_employees").select(EMPLOYEE_COLUMNS, { count: "exact" }).eq("owner_user_id", ownerUserId).eq("is_deleted", false).order("id", { ascending: true });
      if (status === "resigned") query = query.eq("status", "resigned");
      else if (status === "all" || status === "active") query = query.in("status", ["active", "on_leave", "probation"]);
      else query = query.eq("status", normalizeStatus(status));
      
      const allowedWarehouses = Array.isArray(req.authUser.allowedWarehouses) ? req.authUser.allowedWarehouses : [];
      const hasWildcardWarehouse = allowedWarehouses.includes("*") || allowedWarehouses.includes("all");
      const activeWarehouse = req.authUser.adminV4CountryCode || req.authUser.countryCode || null;
      const requestedWarehouse = String(req.query.warehouse_code || req.query.warehouse || "").trim().toUpperCase();

      const targetWarehouse = (requestedWarehouse && requestedWarehouse !== "ALL")
        ? requestedWarehouse
        : activeWarehouse;

      if (targetWarehouse) {
        if (!isWarehouseAllowed(req.authUser, targetWarehouse)) {
          return res.status(403).json({ error: "无权访问该海外仓员工" });
        }
        query = query.eq("warehouse_code", targetWarehouse);
      } else if (!hasWildcardWarehouse) {
        if (allowedWarehouses.length > 0) {
          query = query.in("warehouse_code", allowedWarehouses);
        } else {
          query = query.eq("warehouse_code", "TH");
        }
      }

      if (keyword) query = query.or(`name.ilike.%${keyword}%,nickname.ilike.%${keyword}%,employee_no.ilike.%${keyword}%,phone.ilike.%${keyword}%,role.ilike.%${keyword}%,dept.ilike.%${keyword}%`);
      const { data, count, error } = await query.range((page - 1) * pageSize, page * pageSize - 1);
      if (error) throw error;
      const items = (data || []).map(mapEmployeeRow);
      if (items.length > 0) {
        const employeeIds = items.map(it => it.id);
        const { data: accounts } = await supabase.from("workspace_accounts")
          .select("employee_id, account")
          .eq("owner_user_id", ownerUserId)
          .in("employee_id", employeeIds)
          .eq("account_type", "employee");
        if (accounts?.length) {
          const accountMap = new Map(accounts.map(a => [Number(a.employee_id), a.account]));
          for (const item of items) {
            if (accountMap.has(item.id)) {
              item.username = accountMap.get(item.id);
            }
          }
        }
      }
      res.json({ items, total: count ?? null, page, pageSize, hasMore: (page - 1) * pageSize + items.length < Number(count || 0) });
    } catch (error) { safeFailure(res, error, "员工列表加载失败"); }
  });

  router.get("/employees/:id", async (req, res) => {
    try {
      if (!permissionAllowed(req, "employees_view", "employees_manage")) return res.status(403).json({ error: "无权查看员工" });
      if (!await employeeScope(supabase, req, res, req.params.id)) return;
      const { data, error } = await supabase.from("workspace_employees").select("*").eq("owner_user_id", req.authUser.id).eq("id", Number(req.params.id)).eq("is_deleted", false).single();
      if (error) throw error;
      const { data: account } = await supabase.from("workspace_accounts")
        .select("account")
        .eq("owner_user_id", req.authUser.id)
        .eq("employee_id", Number(req.params.id))
        .eq("account_type", "employee")
        .maybeSingle();
      const empDto = mapEmployeeRow(data);
      if (account?.account) empDto.username = account.account;
      res.json({ employee: empDto });
    } catch (error) { safeFailure(res, error, "员工详情加载失败"); }
  });

  router.get("/employees/:id/permissions", async (req, res) => {
    try {
      if (!permissionAllowed(req, "employees_permissions")) return res.status(403).json({ error: "无权管理员工权限" });
      const employeeId = Number(req.params.id);
      if (!employeeId || Number.isNaN(employeeId)) return res.status(400).json({ error: "无效的员工 ID" });

      if (directDbPool) {
        const { rows } = await directDbPool.query(`
          SELECT 
            e.id, e.warehouse_code,
            a.id AS account_id,
            m.permissions
          FROM workspace_employees e
          LEFT JOIN workspace_accounts a 
            ON a.owner_user_id = e.owner_user_id 
            AND a.employee_id = e.id 
            AND a.account_type = 'employee'
          LEFT JOIN workspace_members m 
            ON m.owner_user_id = a.owner_user_id 
            AND m.account_id = a.id
          WHERE e.owner_user_id = $1 AND e.id = $2 AND e.is_deleted = false
          LIMIT 1;
        `, [req.authUser.id, employeeId]);

        const row = rows[0];
        if (!row || !isWarehouseAllowed(req.authUser, row.warehouse_code)) {
          return res.status(404).json({ error: "员工不存在或不属于当前仓库" });
        }

        return res.json({
          permissions: Array.isArray(row.permissions) ? row.permissions : [],
          assignable: Boolean(row.account_id)
        });
      }

      const [empRes, accRes] = await Promise.all([
        supabase.from("workspace_employees").select("id, warehouse_code").eq("owner_user_id", req.authUser.id).eq("id", employeeId).eq("is_deleted", false).maybeSingle(),
        supabase.from("workspace_accounts").select("id, workspace_members!workspace_members_owner_account_fkey(id, permissions)").eq("owner_user_id", req.authUser.id).eq("employee_id", employeeId).eq("account_type", "employee").maybeSingle()
      ]);

      if (empRes.error) throw empRes.error;
      const empData = empRes.data;
      if (!empData || !isWarehouseAllowed(req.authUser, empData.warehouse_code)) {
        return res.status(404).json({ error: "员工不存在或不属于当前仓库" });
      }

      if (accRes.error) throw accRes.error;
      const member = Array.isArray(accRes.data?.workspace_members) ? accRes.data.workspace_members[0] : accRes.data?.workspace_members;
      return res.json({ permissions: member?.permissions || [], assignable: Boolean(accRes.data) });
    } catch (error) { safeFailure(res, error, "员工权限加载失败"); }
  });

  router.put("/employees/:id/permissions", async (req, res) => {
    try {
      if (!permissionAllowed(req, "employees_permissions")) return res.status(403).json({ error: "无权管理员工权限" });
      if (!await employeeScope(supabase, req, res, req.params.id)) return;
      const permissions = [...new Set((Array.isArray(req.body?.permissions) ? req.body.permissions : []).filter(item => typeof item === "string" && item.length <= 80))];
      if (permissions.length > 100) return res.status(400).json({ error: "权限数量不合法" });
      if (!req.authUser.permissions.includes("*") && permissions.some(permission => !req.authUser.permissions.includes(permission))) return res.status(403).json({ error: "不能授予超出自身范围的权限" });
      const { data: account, error: accountError } = await supabase.from("workspace_accounts").select("id, workspace_members!workspace_members_owner_account_fkey(id, permissions)").eq("owner_user_id", req.authUser.id).eq("employee_id", Number(req.params.id)).eq("account_type", "employee").maybeSingle();
      if (accountError) throw accountError;
      const member = Array.isArray(account?.workspace_members) ? account.workspace_members[0] : account?.workspace_members;
      if (!member) return res.status(404).json({ error: "该员工尚未绑定管理端账号" });
      const update = await supabase.from("workspace_members").update({ permissions, updated_at: new Date().toISOString() }).eq("owner_user_id", req.authUser.id).eq("id", member.id);
      if (update.error) throw update.error;
      const audit = await supabase.from("employee_permission_audits").insert({ owner_user_id: req.authUser.id, actor_id: String(req.authUser.adminAuthUserId || req.authUser.id), target_employee_id: Number(req.params.id), previous_permissions: member.permissions || [], next_permissions: permissions, metadata: { source: "admin-v4-service" } });
      if (audit.error) throw audit.error;
      identity?.invalidateSessionCache?.(req.authUser.id);
      res.json({ permissions, assignable: true });
    } catch (error) { safeFailure(res, error, "员工权限更新失败"); }
  });

  router.get("/employees/:id/app-account", async (req, res) => {
    try {
      if (!permissionAllowed(req, "employees_reset_pwd", "employees_manage")) return res.status(403).json({ error: "无权管理 App 账号" });
      const employeeId = Number(req.params.id);
      if (!employeeId || Number.isNaN(employeeId)) return res.status(400).json({ error: "无效的员工 ID" });

      if (directDbPool) {
        const { rows: empRows } = await directDbPool.query(
          "SELECT id, name, employee_no, status, warehouse_code, country FROM workspace_employees WHERE owner_user_id = $1 AND id = $2 AND is_deleted = false LIMIT 1",
          [req.authUser.id, employeeId]
        );
        const employee = empRows[0];
        if (!employee || !isWarehouseAllowed(req.authUser, employee.warehouse_code)) {
          return res.status(404).json({ error: "员工不存在或不属于当前仓库" });
        }
        const account = await ensureEmployeeAccountDirect(directDbPool, employee, req.authUser.id);
        return res.json({ account: accountDto(account, employee) });
      }

      const { data: employee, error: employeeError } = await supabase.from("workspace_employees")
        .select("id, name, employee_no, status, warehouse_code, country")
        .eq("owner_user_id", req.authUser.id)
        .eq("id", employeeId)
        .eq("is_deleted", false)
        .maybeSingle();

      if (employeeError) throw employeeError;
      if (!employee || !isWarehouseAllowed(req.authUser, employee.warehouse_code)) {
        return res.status(404).json({ error: "员工不存在或不属于当前仓库" });
      }

      const account = await ensureEmployeeAccount(supabase, employee, req.authUser.id);
      res.json({ account: accountDto(account, employee) });
    } catch (error) { safeFailure(res, error, "员工 App 账号加载失败"); }
  });

  router.post("/employees", async (req, res) => {
    try {
      if (!permissionAllowed(req, "employees_edit", "employees_manage")) return res.status(403).json({ error: "无权新增员工" });
      const payload = employeePayload(req.body, req.authUser);
      if (!payload.warehouseCode && req.authUser.adminV4CountryCode) payload.warehouseCode = req.authUser.adminV4CountryCode;
      const validation = validatePayload(payload);
      if (validation) return res.status(400).json({ error: validation });
      if (!isWarehouseAllowed(req.authUser, payload.warehouseCode)) {
        return res.status(403).json({ error: "无权向该海外仓添加员工" });
      }
      if (Array.isArray(payload.permissions)) {
        const userPerms = req.authUser?.permissions || [];
        if (!userPerms.includes("*") && !userPerms.includes("all")) {
          if (payload.permissions.some(permission => !userPerms.includes(permission))) {
            return res.status(403).json({ error: "不能授予超出自身范围的权限" });
          }
        }
      }

      if (directDbPool) {
        const client = await directDbPool.connect();
        try {
          await client.query("BEGIN");
          const ruleId = await compatibilityRuleIdDirect(client, req.authUser.id, payload.warehouseCode);
          const empNo = employeeNo();
          const insertRes = await client.query(`
            INSERT INTO workspace_employees (
              owner_user_id, warehouse_code, employee_no, name, nickname, gender,
              nationality, country, phone, role, dept, join_date, status,
              attendance_rule_id, salary_type, hourly_rate, fixed_salary, daily_wage,
              overtime_hourly_fee, ot_rule_type, ot_base_rate, ot_multiplier_workday,
              ot_multiplier_weekend, ot_multiplier_holiday, is_dispatch_personnel,
              attendance_bonus, social_security, meal_allowance, service_fee_rate,
              currency, bank_card_number, bank_name, id_card, photo, is_deleted,
              created_at, updated_at
            ) VALUES (
              $1, $2, $3, $4, $5, $6,
              $7, $8, $9, $10, $11, $12, $13,
              $14, $15, $16, $17, $18,
              $19, $20, $21, $22,
              $23, $24, $25,
              $26, $27, $28, $29,
              $30, $31, $32, $33, $34, false,
              NOW(), NOW()
            ) RETURNING *;
          `, [
            req.authUser.id, payload.warehouseCode, empNo, payload.name, payload.nickname, payload.gender,
            payload.nationality, payload.country, payload.phone, payload.role, payload.dept, payload.joinDate, payload.status,
            ruleId, payload.salaryType, payload.hourlyRate, payload.fixedSalary, payload.dailyWage,
            payload.overtimeHourlyFee, payload.otRuleType, payload.otBaseRate, payload.otMultiplierWorkday,
            payload.otMultiplierWeekend, payload.otMultiplierHoliday, payload.isDispatchPersonnel,
            payload.attendanceBonus, payload.socialSecurity, payload.mealAllowance, payload.serviceFeeRate,
            payload.currency, payload.bankCardNumber, payload.bankName, payload.idCard, payload.photo
          ]);
          const data = insertRes.rows[0];
          await ensureSalaryProfileDirect(client, data, req.authUser.id, payload.salaryEffectiveStartDate);
          const appAccount = await ensureEmployeeAccountDirect(client, data, req.authUser.id, payload.username, payload.password, payload.permissions);
          await client.query("COMMIT");
          const empDto = mapEmployeeRow(data);
          if (appAccount?.account) empDto.username = appAccount.account;
          if (Array.isArray(payload.permissions)) empDto.permissions = payload.permissions;
          return res.status(201).json({ employee: empDto, ruleHistory: [] });
        } catch (err) {
          await client.query("ROLLBACK");
          throw err;
        } finally {
          client.release();
        }
      }

      const ruleId = await compatibilityRuleId(supabase, req.authUser.id, payload.warehouseCode);
      const { data, error } = await supabase.from("workspace_employees").insert({
        owner_user_id: req.authUser.id,
        warehouse_code: payload.warehouseCode,
        employee_no: employeeNo(),
        name: payload.name,
        nickname: payload.nickname,
        gender: payload.gender,
        nationality: payload.nationality,
        country: payload.country,
        phone: payload.phone,
        role: payload.role,
        dept: payload.dept,
        join_date: payload.joinDate,
        status: payload.status,
        attendance_rule_id: ruleId,
        salary_type: payload.salaryType,
        hourly_rate: payload.hourlyRate,
        fixed_salary: payload.fixedSalary,
        daily_wage: payload.dailyWage,
        overtime_hourly_fee: payload.overtimeHourlyFee,
        ot_rule_type: payload.otRuleType,
        ot_base_rate: payload.otBaseRate,
        ot_multiplier_workday: payload.otMultiplierWorkday,
        ot_multiplier_weekend: payload.otMultiplierWeekend,
        ot_multiplier_holiday: payload.otMultiplierHoliday,
        is_dispatch_personnel: payload.isDispatchPersonnel,
        attendance_bonus: payload.attendanceBonus,
        social_security: payload.socialSecurity,
        meal_allowance: payload.mealAllowance,
        service_fee_rate: payload.serviceFeeRate,
        currency: payload.currency,
        bank_card_number: payload.bankCardNumber,
        bank_name: payload.bankName,
        id_card: payload.idCard,
        photo: payload.photo,
        is_deleted: false
      }).select("*").single();
      if (error) throw error;
      const [, appAccount] = await Promise.all([
        ensureSalaryProfile(supabase, data, req.authUser.id, payload.salaryEffectiveStartDate),
        ensureEmployeeAccount(supabase, data, req.authUser.id, payload.username, payload.password, payload.permissions)
      ]);
      const empDto = mapEmployeeRow(data);
      if (appAccount?.account) empDto.username = appAccount.account;
      if (Array.isArray(payload.permissions)) empDto.permissions = payload.permissions;
      res.status(201).json({ employee: empDto, ruleHistory: [] });
    } catch (error) { safeFailure(res, error, "新增员工失败"); }
  });

  router.put("/employees/:id", async (req, res) => {
    try {
      if (!permissionAllowed(req, "employees_edit", "employees_manage")) return res.status(403).json({ error: "无权编辑员工" });
      const employeeId = Number(req.params.id);
      if (!employeeId || Number.isNaN(employeeId)) return res.status(400).json({ error: "无效的员工 ID" });

      const payload = employeePayload(req.body, req.authUser);
      const validation = validatePayload(payload);
      if (validation) return res.status(400).json({ error: validation });
      if (Array.isArray(payload.permissions)) {
        const userPerms = req.authUser?.permissions || [];
        if (!userPerms.includes("*") && !userPerms.includes("all")) {
          if (payload.permissions.some(permission => !userPerms.includes(permission))) {
            return res.status(403).json({ error: "不能授予超出自身范围的权限" });
          }
        }
      }

      if (directDbPool) {
        const client = await directDbPool.connect();
        try {
          await client.query("BEGIN");
          const scopeRes = await client.query(`
            SELECT id, warehouse_code, updated_at
            FROM workspace_employees
            WHERE owner_user_id = $1 AND id = $2 AND is_deleted = false
            FOR UPDATE
          `, [req.authUser.id, employeeId]);

          if (scopeRes.rows.length === 0 || !isWarehouseAllowed(req.authUser, scopeRes.rows[0].warehouse_code)) {
            await client.query("ROLLBACK");
            return res.status(404).json({ error: "员工不存在或不属于当前仓库" });
          }

          if (payload.updatedAt && new Date(scopeRes.rows[0].updated_at).toISOString() !== new Date(payload.updatedAt).toISOString()) {
            await client.query("ROLLBACK");
            const conflict = new Error("员工档案已被其他用户修改，请刷新后重试");
            conflict.statusCode = 409;
            throw conflict;
          }

          const hasPhoto = payload.photo !== undefined;
          const photoVal = payload.photo ?? null;

          const updateRes = await client.query(`
            UPDATE workspace_employees SET
              name = $1, nickname = $2, gender = $3, nationality = $4, country = $5,
              phone = $6, role = $7, dept = $8, join_date = $9, status = $10,
              salary_type = $11, hourly_rate = $12, fixed_salary = $13, daily_wage = $14,
              overtime_hourly_fee = $15, ot_rule_type = $16, ot_base_rate = $17,
              ot_multiplier_workday = $18, ot_multiplier_weekend = $19, ot_multiplier_holiday = $20,
              is_dispatch_personnel = $21, attendance_bonus = $22, social_security = $23,
              meal_allowance = $24, service_fee_rate = $25, currency = $26,
              bank_card_number = $27, bank_name = $28, id_card = $29,
              warehouse_code = COALESCE($30, warehouse_code),
              photo = CASE WHEN $31::boolean THEN $32 ELSE photo END,
              updated_at = NOW()
            WHERE owner_user_id = $33 AND id = $34
            RETURNING *;
          `, [
            payload.name, payload.nickname, payload.gender, payload.nationality, payload.country,
            payload.phone, payload.role, payload.dept, payload.joinDate, payload.status,
            payload.salaryType, payload.hourlyRate, payload.fixedSalary, payload.dailyWage,
            payload.overtimeHourlyFee, payload.otRuleType, payload.otBaseRate,
            payload.otMultiplierWorkday, payload.otMultiplierWeekend, payload.otMultiplierHoliday,
            payload.isDispatchPersonnel, payload.attendanceBonus, payload.socialSecurity,
            payload.mealAllowance, payload.serviceFeeRate, payload.currency,
            payload.bankCardNumber, payload.bankName, payload.idCard,
            payload.warehouseCode || null,
            hasPhoto, photoVal,
            req.authUser.id, employeeId
          ]);

          const data = updateRes.rows[0];
          await ensureSalaryProfileDirect(client, data, req.authUser.id, payload.salaryEffectiveStartDate);
          const appAccount = await ensureEmployeeAccountDirect(client, data, req.authUser.id, payload.username, payload.password, payload.permissions);
          await client.query("COMMIT");
          const empDto = mapEmployeeRow(data);
          if (appAccount?.account) empDto.username = appAccount.account;
          if (Array.isArray(payload.permissions)) {
            empDto.permissions = payload.permissions;
            identity?.invalidateSessionCache?.(req.authUser.id);
          }
          return res.json({ employee: empDto, ruleHistory: [] });
        } catch (err) {
          await client.query("ROLLBACK");
          throw err;
        } finally {
          client.release();
        }
      }

      if (!await employeeScope(supabase, req, res, req.params.id)) return;
      const updateFields = {
        name: payload.name,
        nickname: payload.nickname,
        gender: payload.gender,
        nationality: payload.nationality,
        country: payload.country,
        phone: payload.phone,
        role: payload.role,
        dept: payload.dept,
        join_date: payload.joinDate,
        status: payload.status,
        salary_type: payload.salaryType,
        hourly_rate: payload.hourlyRate,
        fixed_salary: payload.fixedSalary,
        daily_wage: payload.dailyWage,
        overtime_hourly_fee: payload.overtimeHourlyFee,
        ot_rule_type: payload.otRuleType,
        ot_base_rate: payload.otBaseRate,
        ot_multiplier_workday: payload.otMultiplierWorkday,
        ot_multiplier_weekend: payload.otMultiplierWeekend,
        ot_multiplier_holiday: payload.otMultiplierHoliday,
        is_dispatch_personnel: payload.isDispatchPersonnel,
        attendance_bonus: payload.attendanceBonus,
        social_security: payload.socialSecurity,
        meal_allowance: payload.mealAllowance,
        service_fee_rate: payload.serviceFeeRate,
        currency: payload.currency,
        bank_card_number: payload.bankCardNumber,
        bank_name: payload.bankName,
        id_card: payload.idCard,
        updated_at: new Date().toISOString(),
        ...(payload.photo !== undefined ? { photo: payload.photo } : {})
      };
      if (payload.warehouseCode) {
        updateFields.warehouse_code = payload.warehouseCode;
      }

      let query = supabase.from("workspace_employees").update(updateFields).eq("owner_user_id", req.authUser.id).eq("id", Number(req.params.id));
      if (payload.updatedAt) query = query.eq("updated_at", payload.updatedAt);
      const { data, error } = await query.select("*").maybeSingle();
      if (error) throw error;
      if (!data) { const conflict = new Error("员工档案已被其他用户修改，请刷新后重试"); conflict.statusCode = 409; throw conflict; }
      const [, appAccount] = await Promise.all([
        ensureSalaryProfile(supabase, data, req.authUser.id, payload.salaryEffectiveStartDate),
        ensureEmployeeAccount(supabase, data, req.authUser.id, payload.username, payload.password, payload.permissions)
      ]);
      const empDto = mapEmployeeRow(data);
      if (appAccount?.account) empDto.username = appAccount.account;
      if (Array.isArray(payload.permissions)) {
        empDto.permissions = payload.permissions;
        identity?.invalidateSessionCache?.(req.authUser.id);
      }
      res.json({ employee: empDto, ruleHistory: [] });
    } catch (error) { safeFailure(res, error, "更新员工失败"); }
  });

  router.patch("/employees/:id/status", async (req, res) => {
    try {
      if (!permissionAllowed(req, "employees_delete", "employees_manage")) return res.status(403).json({ error: "无权更新员工状态" });
      const employeeId = Number(req.params.id);
      if (!employeeId || Number.isNaN(employeeId)) return res.status(400).json({ error: "无效的员工 ID" });
      const targetStatus = normalizeStatus(req.body?.targetStatus);
      if (targetStatus !== "resigned") return res.status(400).json({ error: "员工状态不合法" });

      if (directDbPool) {
        const client = await directDbPool.connect();
        try {
          await client.query("BEGIN");
          const scopeRes = await client.query(
            "SELECT id, warehouse_code FROM workspace_employees WHERE owner_user_id = $1 AND id = $2 AND is_deleted = false FOR UPDATE",
            [req.authUser.id, employeeId]
          );
          if (scopeRes.rows.length === 0 || !isWarehouseAllowed(req.authUser, scopeRes.rows[0].warehouse_code)) {
            await client.query("ROLLBACK");
            return res.status(404).json({ error: "员工不存在或不属于当前仓库" });
          }
          const { rows } = await client.query(`
            UPDATE workspace_employees
            SET status = 'resigned', is_deleted = false, updated_at = NOW()
            WHERE owner_user_id = $1 AND id = $2
            RETURNING *;
          `, [req.authUser.id, employeeId]);
          await client.query(`
            UPDATE workspace_accounts
            SET status = 'disabled', updated_at = NOW()
            WHERE owner_user_id = $1 AND employee_id = $2;
          `, [req.authUser.id, employeeId]);
          await client.query("COMMIT");
          return res.json({ employee: mapEmployeeRow(rows[0]), ruleHistory: [] });
        } catch (err) {
          await client.query("ROLLBACK");
          throw err;
        } finally {
          client.release();
        }
      }

      if (!await employeeScope(supabase, req, res, req.params.id)) return;
      const { data, error } = await supabase.from("workspace_employees").update({ status: "resigned", is_deleted: false, updated_at: new Date().toISOString() }).eq("owner_user_id", req.authUser.id).eq("id", Number(req.params.id)).select("*").single();
      if (error) throw error;
      await supabase.from("workspace_accounts").update({ status: "disabled", updated_at: new Date().toISOString() }).eq("owner_user_id", req.authUser.id).eq("employee_id", Number(req.params.id));
      res.json({ employee: mapEmployeeRow(data), ruleHistory: [] });
    } catch (error) { safeFailure(res, error, "更新员工状态失败"); }
  });

  return router;
}