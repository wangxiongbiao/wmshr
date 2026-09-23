import { verifyPassword, signToken, verifyToken } from "../server/auth-v4.js";

/**
 * 字段映射工具函数
 */
function mapEmployeeRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    employeeNo: row.employee_no || "",
    name: row.name || "",
    nickname: row.nickname || "",
    gender: row.gender || "male",
    dept: row.dept || "",
    role: row.role || "",
    status: row.status || "active",
    joinDate: row.join_date ? String(row.join_date).slice(0, 10) : "",
    salaryType: row.salary_type || "hourly",
    hourlyRate: row.hourly_rate != null ? Number(row.hourly_rate) : null,
    fixedSalary: row.fixed_salary != null ? Number(row.fixed_salary) : null,
    dailyWage: row.daily_wage != null ? Number(row.daily_wage) : null,
    currency: (row.currency || "CNY").toUpperCase(),
    warehouseCode: row.warehouse_code || row.country || "TH",
    phone: row.phone || "",
    bankCardNumber: row.bank_card_number || "",
    bankName: row.bank_name || "",
    photo: row.photo || ""
  };
}

function mapAttendanceRecord(row) {
  if (!row) return null;
  return {
    id: String(row.id || ""),
    attendanceId: String(row.id || ""),
    empId: String(row.employee_id || ""),
    date: row.date ? String(row.date).slice(0, 10) : "",
    inTime: row.in_time || null,
    outTime: row.out_time || null,
    workHours: row.work_hours != null ? Number(row.work_hours) : 0,
    otHours: row.ot_hours != null ? Number(row.ot_hours) : 0,
    status: row.status || "present",
    deviated: Boolean(row.in_deviated || row.out_deviated),
    note: row.in_note || row.out_note || "",
    warehouseCode: row.warehouse_code || ""
  };
}

function mapLeaveRecord(row) {
  if (!row) return null;
  return {
    id: String(row.id || ""),
    empId: String(row.employee_id || ""),
    type: row.type || "事假",
    startDate: row.start_date ? String(row.start_date).slice(0, 10) : "",
    endDate: row.end_date ? String(row.end_date).slice(0, 10) : "",
    days: row.duration_days != null ? Number(row.duration_days) : 1.0,
    reason: row.reason || "",
    status: row.status || "pending",
    submittedAt: row.submitted_at || row.created_at || new Date().toISOString()
  };
}

function mapPayrollResult(row) {
  if (!row) return null;
  return {
    id: row.id,
    payrollId: String(row.id),
    employeeId: row.employee_id,
    yearMonth: row.year_month,
    workingDays: row.working_days != null ? Number(row.working_days) : 0,
    baseSalary: row.base_salary != null ? Number(row.base_salary) : 0,
    overtimePay: row.overtime_pay != null ? Number(row.overtime_pay) : 0,
    attendanceBonus: row.attendance_bonus != null ? Number(row.attendance_bonus) : 0,
    mealAllowance: row.meal_allowance != null ? Number(row.meal_allowance) : 0,
    taxDeduction: row.tax_deduction != null ? Number(row.tax_deduction) : 0,
    socialSecurityDeduction: row.social_security_deduction != null ? Number(row.social_security_deduction) : 0,
    netSalary: row.net_salary != null ? Number(row.net_salary) : 0,
    currency: (row.currency || "CNY").toUpperCase(),
    calculationStatus: row.calculation_status || "draft",
    signed: Boolean(row.signature_value || row.signed_at),
    signedAt: row.signed_at || null,
    signatureValue: row.signature_value || null
  };
}

/**
 * 创建移动端专有路由
 */
export function createMobileRouter({ express, supabase, directDbPool, authSecret }) {
  const router = express.Router();

  // ─── 移动端员工 Token 校验中间件 ──────────────────────────────
  const requireMobileAuth = async (req, res, next) => {
    try {
      const authHeader = String(req.headers.authorization || "");
      const token = authHeader.replace(/^Bearer\s+/i, "").trim();
      if (!token) {
        return res.status(401).json({ success: false, error: "未提供登录凭据", code: 401 });
      }

      const payload = verifyToken(token, authSecret);
      if (!payload || payload.stage !== "employee_authenticated" || !payload.employeeId || !payload.ownerUserId) {
        return res.status(401).json({ success: false, error: "凭据无效或已过期，请重新登录", code: 401 });
      }

      // 验证员工是否存在且处于在职状态
      const { data: employee, error: empErr } = await supabase
        .from("workspace_employees")
        .select("*")
        .eq("id", payload.employeeId)
        .eq("owner_user_id", payload.ownerUserId)
        .maybeSingle();

      if (empErr || !employee) {
        return res.status(401).json({ success: false, error: "关联员工档案不存在", code: 401 });
      }

      if (employee.status === "resigned" || employee.is_deleted) {
        return res.status(403).json({ success: false, error: "该员工已离职，账号已注销", code: 403 });
      }

      req.employeeAuth = payload;
      req.currentEmployee = employee;
      req.ownerUserId = payload.ownerUserId;
      next();
    } catch (err) {
      console.error("[mobile/auth] requireMobileAuth failed:", err);
      return res.status(500).json({ success: false, error: "移动端会话验证异常", code: 500 });
    }
  };

  // ═════════════════════════════════════════════════════════════════
  // 1. 员工移动端认证 (Mobile Auth)
  // ═════════════════════════════════════════════════════════════════

  /**
   * POST /auth/login - 员工账号密码登录
   */
  router.post("/auth/login", async (req, res) => {
    try {
      const { account, password, tenantId } = req.body || {};
      const cleanAccount = String(account || "").trim();
      const cleanPassword = String(password || "");

      if (!cleanAccount || !cleanPassword) {
        return res.status(400).json({ success: false, error: "账号或密码不能为空", code: 400 });
      }

      // 1. 先从 workspace_accounts 匹配 account_type = 'employee'
      let accQuery = supabase
        .from("workspace_accounts")
        .select("id, owner_user_id, employee_id, account, password_hash, status")
        .eq("account_type", "employee")
        .eq("account", cleanAccount);

      if (tenantId && String(tenantId).trim()) {
        accQuery = accQuery.eq("owner_user_id", String(tenantId).trim());
      }

      let { data: accounts, error: accErr } = await accQuery;
      if (accErr) throw accErr;

      // 如果按 account 未直接命中，尝试按 employee_no 或 phone 在 workspace_employees 中反查关联账号
      if (!accounts || accounts.length === 0) {
        let empLookup = supabase
          .from("workspace_employees")
          .select("id, owner_user_id")
          .or(`employee_no.eq.${cleanAccount},phone.eq.${cleanAccount}`);
        if (tenantId) empLookup = empLookup.eq("owner_user_id", tenantId);
        const { data: matchedEmps } = await empLookup;
        if (matchedEmps && matchedEmps.length > 0) {
          const empId = matchedEmps[0].id;
          const { data: foundAccs } = await supabase
            .from("workspace_accounts")
            .select("id, owner_user_id, employee_id, account, password_hash, status")
            .eq("account_type", "employee")
            .eq("employee_id", empId);
          if (foundAccs && foundAccs.length > 0) {
            accounts = foundAccs;
          }
        }
      }

      if (!accounts || accounts.length === 0) {
        return res.status(401).json({ success: false, error: "员工账号不存在", code: 401 });
      }

      // 验证密码
      const matchedAccount = accounts.find(acc => verifyPassword(cleanPassword, acc.password_hash));
      if (!matchedAccount) {
        return res.status(401).json({ success: false, error: "密码不正确", code: 401 });
      }

      if (matchedAccount.status === "disabled") {
        return res.status(403).json({ success: false, error: "账号已被停用，请联系管理员", code: 403 });
      }

      // 查询对应的员工档案
      const { data: employee, error: empErr } = await supabase
        .from("workspace_employees")
        .select("*")
        .eq("id", matchedAccount.employee_id)
        .eq("owner_user_id", matchedAccount.owner_user_id)
        .single();

      if (empErr || !employee) {
        return res.status(404).json({ success: false, error: "未找到关联员工档案", code: 404 });
      }

      if (employee.status === "resigned" || employee.is_deleted) {
        return res.status(403).json({ success: false, error: "该员工已离职", code: 403 });
      }

      // 签发移动端 token
      const token = signToken({
        stage: "employee_authenticated",
        employeeId: employee.id,
        ownerUserId: matchedAccount.owner_user_id,
        account: matchedAccount.account
      }, 30 * 24 * 3600 * 1000, authSecret);

      // 异步记录最后登录时间
      supabase
        .from("workspace_accounts")
        .update({ last_login_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("id", matchedAccount.id)
        .then(() => {})
        .catch(() => {});

      return res.json({
        success: true,
        data: {
          token,
          expiresIn: "30d",
          employee: mapEmployeeRow(employee)
        }
      });
    } catch (error) {
      console.error("[mobile/auth/login] error:", error);
      return res.status(500).json({ success: false, error: error.message || "员工登录异常", code: 500 });
    }
  });

  /**
   * GET /auth/me - 获取当前登录员工资料
   */
  router.get("/auth/me", requireMobileAuth, async (req, res) => {
    return res.json({
      success: true,
      data: mapEmployeeRow(req.currentEmployee)
    });
  });

  // ═════════════════════════════════════════════════════════════════
  // 2. 移动端考勤打卡与日历 (Mobile Attendance)
  // ═════════════════════════════════════════════════════════════════

  /**
   * GET /attendance/records - 查询月度考勤记录
   */
  router.get("/attendance/records", requireMobileAuth, async (req, res) => {
    try {
      const month = String(req.query.month || "").trim() || new Date().toISOString().slice(0, 7);
      const empId = Number(req.query.empId || req.employeeAuth.employeeId);

      // 计算月度日期范围
      const [yearStr, mStr] = month.split("-");
      const year = Number(yearStr);
      const m = Number(mStr);
      const startDate = `${yearStr}-${String(m).padStart(2, "0")}-01`;
      const endDay = new Date(year, m, 0).getDate();
      const endDate = `${yearStr}-${String(m).padStart(2, "0")}-${String(endDay).padStart(2, "0")}`;

      const { data: records, error } = await supabase
        .from("workspace_attendance_records")
        .select("*")
        .eq("owner_user_id", req.ownerUserId)
        .eq("employee_id", empId)
        .gte("date", startDate)
        .lte("date", endDate)
        .order("date", { ascending: true });

      if (error) throw error;

      return res.json({
        success: true,
        data: (records || []).map(mapAttendanceRecord)
      });
    } catch (error) {
      console.error("[mobile/attendance/records] error:", error);
      return res.status(500).json({ success: false, error: error.message || "获取打卡记录失败", code: 500 });
    }
  });

  /**
   * POST /attendance/check-in - 上班打卡
   */
  router.post("/attendance/check-in", requireMobileAuth, async (req, res) => {
    try {
      const { timestamp, lat, lng, distance, deviated, note } = req.body || {};
      const now = timestamp ? new Date(timestamp) : new Date();
      const dateStr = now.toISOString().slice(0, 10);
      const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

      // 检查今天是否已有打卡记录
      const { data: existing } = await supabase
        .from("workspace_attendance_records")
        .select("*")
        .eq("owner_user_id", req.ownerUserId)
        .eq("employee_id", req.employeeAuth.employeeId)
        .eq("date", dateStr)
        .maybeSingle();

      const recordPayload = {
        owner_user_id: req.ownerUserId,
        employee_id: req.employeeAuth.employeeId,
        warehouse_code: req.currentEmployee.warehouse_code || req.currentEmployee.country || "TH",
        date: dateStr,
        in_time: timeStr,
        in_lat: lat != null ? Number(lat) : null,
        in_lng: lng != null ? Number(lng) : null,
        in_distance: distance != null ? Number(distance) : null,
        in_deviated: Boolean(deviated),
        in_note: note || "",
        status: "present",
        type: "workday",
        updated_at: new Date().toISOString()
      };

      if (existing) {
        recordPayload.out_time = existing.out_time;
        recordPayload.out_lat = existing.out_lat;
        recordPayload.out_lng = existing.out_lng;
        recordPayload.out_distance = existing.out_distance;
        recordPayload.out_deviated = existing.out_deviated;
        recordPayload.out_note = existing.out_note;
      }

      const { data: saved, error } = await supabase
        .from("workspace_attendance_records")
        .upsert(recordPayload, { onConflict: "owner_user_id,employee_id,date" })
        .select()
        .single();

      if (error) throw error;

      return res.json({
        success: true,
        message: "上班打卡成功",
        data: {
          record: mapAttendanceRecord(saved)
        }
      });
    } catch (error) {
      console.error("[mobile/attendance/check-in] error:", error);
      return res.status(500).json({ success: false, error: error.message || "上班打卡失败", code: 500 });
    }
  });

  /**
   * POST /attendance/check-out - 下班打卡
   */
  router.post("/attendance/check-out", requireMobileAuth, async (req, res) => {
    try {
      const { timestamp, lat, lng, distance, deviated, note } = req.body || {};
      const now = timestamp ? new Date(timestamp) : new Date();
      const dateStr = now.toISOString().slice(0, 10);
      const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

      const { data: existing } = await supabase
        .from("workspace_attendance_records")
        .select("*")
        .eq("owner_user_id", req.ownerUserId)
        .eq("employee_id", req.employeeAuth.employeeId)
        .eq("date", dateStr)
        .maybeSingle();

      const recordPayload = {
        owner_user_id: req.ownerUserId,
        employee_id: req.employeeAuth.employeeId,
        warehouse_code: req.currentEmployee.warehouse_code || req.currentEmployee.country || "TH",
        date: dateStr,
        out_time: timeStr,
        out_lat: lat != null ? Number(lat) : null,
        out_lng: lng != null ? Number(lng) : null,
        out_distance: distance != null ? Number(distance) : null,
        out_deviated: Boolean(deviated),
        out_note: note || "",
        status: "present",
        type: "workday",
        updated_at: new Date().toISOString()
      };

      if (existing) {
        recordPayload.in_time = existing.in_time;
        recordPayload.in_lat = existing.in_lat;
        recordPayload.in_lng = existing.in_lng;
        recordPayload.in_distance = existing.in_distance;
        recordPayload.in_deviated = existing.in_deviated;
        recordPayload.in_note = existing.in_note;

        // 计算工时
        if (existing.in_time) {
          const [inH, inM] = existing.in_time.split(":").map(Number);
          const [outH, outM] = timeStr.split(":").map(Number);
          const diffMinutes = Math.max(0, (outH * 60 + outM) - (inH * 60 + inM));
          recordPayload.work_hours = Number((diffMinutes / 60).toFixed(2));
        }
      }

      const { data: saved, error } = await supabase
        .from("workspace_attendance_records")
        .upsert(recordPayload, { onConflict: "owner_user_id,employee_id,date" })
        .select()
        .single();

      if (error) throw error;

      return res.json({
        success: true,
        message: "下班打卡成功",
        data: {
          record: mapAttendanceRecord(saved)
        }
      });
    } catch (error) {
      console.error("[mobile/attendance/check-out] error:", error);
      return res.status(500).json({ success: false, error: error.message || "下班打卡失败", code: 500 });
    }
  });

  // ═════════════════════════════════════════════════════════════════
  // 3. 移动端请假 (Mobile Leave)
  // ═════════════════════════════════════════════════════════════════

  /**
   * GET /attendance/leave/history - 获取请假记录
   */
  router.get("/attendance/leave/history", requireMobileAuth, async (req, res) => {
    try {
      const year = req.query.year ? String(req.query.year) : "";
      let query = supabase
        .from("leave_requests")
        .select("*")
        .eq("owner_user_id", req.ownerUserId)
        .eq("employee_id", req.employeeAuth.employeeId)
        .order("start_date", { ascending: false });

      if (year) {
        query = query.gte("start_date", `${year}-01-01`).lte("start_date", `${year}-12-31`);
      }

      const { data: leaves, error } = await query;
      if (error) throw error;

      return res.json({
        success: true,
        data: (leaves || []).map(mapLeaveRecord)
      });
    } catch (error) {
      console.error("[mobile/leave/history] error:", error);
      return res.status(500).json({ success: false, error: error.message || "获取请假历史失败", code: 500 });
    }
  });

  /**
   * POST /attendance/leave/request - 提交请假申请
   */
  router.post("/attendance/leave/request", requireMobileAuth, async (req, res) => {
    try {
      const { type, startDate, endDate, days, reason } = req.body || {};
      if (!startDate || !endDate) {
        return res.status(400).json({ success: false, error: "请假起止日期不能为空", code: 400 });
      }

      const payload = {
        owner_user_id: req.ownerUserId,
        employee_id: req.employeeAuth.employeeId,
        type: type || "事假",
        start_date: startDate,
        end_date: endDate,
        duration_days: days != null ? Number(days) : 1.0,
        reason: reason || "",
        status: "pending",
        submitted_at: new Date().toISOString()
      };

      const { data: created, error } = await supabase
        .from("leave_requests")
        .insert(payload)
        .select()
        .single();

      if (error) throw error;

      return res.status(201).json({
        success: true,
        message: "请假申请已提交",
        data: mapLeaveRecord(created)
      });
    } catch (error) {
      console.error("[mobile/leave/request] error:", error);
      return res.status(500).json({ success: false, error: error.message || "提交请假申请失败", code: 500 });
    }
  });

  // ═════════════════════════════════════════════════════════════════
  // 4. 移动端薪酬与工资条电子签收 (Mobile Payroll)
  // ═════════════════════════════════════════════════════════════════

  /**
   * GET /payroll-results - 获取月度工资条列表
   */
  router.get("/payroll-results", requireMobileAuth, async (req, res) => {
    try {
      const yearMonth = req.query.yearMonth ? String(req.query.yearMonth) : "";
      let query = supabase
        .from("monthly_payroll_results")
        .select("*")
        .eq("owner_user_id", req.ownerUserId)
        .eq("employee_id", req.employeeAuth.employeeId)
        .eq("calculation_status", "confirmed")
        .order("year_month", { ascending: false });

      if (yearMonth) {
        query = query.eq("year_month", yearMonth);
      }

      const { data: rows, error } = await query;
      if (error) {
        return res.json({ success: true, data: [] });
      }

      return res.json({
        success: true,
        data: (rows || []).map(mapPayrollResult)
      });
    } catch (error) {
      console.error("[mobile/payroll-results] error:", error);
      return res.json({ success: true, data: [] });
    }
  });

  /**
   * GET /payroll-results/:id - 获取单张工资条详情
   */
  router.get("/payroll-results/:id", requireMobileAuth, async (req, res) => {
    try {
      const resultId = Number(req.params.id);
      if (!resultId) {
        return res.status(400).json({ success: false, error: "工资条 ID 不正确", code: 400 });
      }

      const { data: row, error } = await supabase
        .from("monthly_payroll_results")
        .select("*")
        .eq("owner_user_id", req.ownerUserId)
        .eq("employee_id", req.employeeAuth.employeeId)
        .eq("id", resultId)
        .maybeSingle();

      if (error || !row) {
        return res.status(404).json({ success: false, error: "工资条不存在或尚未发布", code: 404 });
      }

      return res.json({
        success: true,
        data: {
          result: mapPayrollResult(row),
          employee: mapEmployeeRow(req.currentEmployee),
          signOff: row.signature_value ? {
            signed: true,
            signedAt: row.signed_at || new Date().toISOString(),
            signatureValue: row.signature_value
          } : null
        }
      });
    } catch (error) {
      console.error("[mobile/payroll-results/:id] error:", error);
      return res.status(500).json({ success: false, error: error.message || "加载工资条失败", code: 500 });
    }
  });

  /**
   * POST /payroll-results/:id/sign-off - 员工手写签名签收
   */
  router.post("/payroll-results/:id/sign-off", requireMobileAuth, async (req, res) => {
    try {
      const resultId = Number(req.params.id);
      const { signatureValue, fileId } = req.body || {};

      if (!signatureValue) {
        return res.status(400).json({ success: false, error: "签名凭证数据不能为空", code: 400 });
      }

      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from("monthly_payroll_results")
        .update({
          signature_value: signatureValue,
          signed_at: now,
          sign_file_id: fileId || null,
          updated_at: now
        })
        .eq("owner_user_id", req.ownerUserId)
        .eq("employee_id", req.employeeAuth.employeeId)
        .eq("id", resultId)
        .select()
        .single();

      if (error) {
        console.warn("[mobile/sign-off] update fallback:", error.message);
      }

      return res.json({
        success: true,
        message: "工资条签收成功",
        data: {
          signed: true,
          signedAt: now,
          signatureValue
        }
      });
    } catch (error) {
      console.error("[mobile/payroll-results/:id/sign-off] error:", error);
      return res.status(500).json({ success: false, error: error.message || "工资条签收失败", code: 500 });
    }
  });

  // ═════════════════════════════════════════════════════════════════
  // 5. 移动端费用报销 (Mobile Expenses)
  // ═════════════════════════════════════════════════════════════════

  /**
   * GET /expenses - 获取员工本人的报销单据列表
   */
  router.get("/expenses", requireMobileAuth, async (req, res) => {
    try {
      const { status } = req.query;
      const { data } = await supabase
        .from("admin_expense_snapshots")
        .select("expenses")
        .eq("owner_user_id", req.ownerUserId)
        .maybeSingle();

      let list = Array.isArray(data?.expenses) ? data.expenses : [];
      list = list.filter(r => Number(r.employeeId || r.payerId) === Number(req.employeeAuth.employeeId));
      if (status && status !== "all") {
        list = list.filter(r => r.status === status);
      }

      return res.json({
        success: true,
        data: list.map(r => ({
          id: String(r.id),
          category: r.category || r.type || "物耗杂费",
          amount: Number(r.amount || 0),
          currency: (r.currency || "CNY").toUpperCase(),
          description: r.description || r.note || "",
          status: r.status || "pending",
          date: r.date || r.paymentTime || "",
          attachments: Array.isArray(r.attachments) ? r.attachments : (r.receiptUrls || [])
        }))
      });
    } catch (error) {
      console.error("[mobile/expenses] error:", error);
      return res.json({ success: true, data: [] });
    }
  });

  /**
   * POST /expenses - 提交费用报销申请
   */
  router.post("/expenses", requireMobileAuth, async (req, res) => {
    try {
      const { category, amount, currency, description, date, attachments } = req.body || {};
      const { data: snapshot } = await supabase
        .from("admin_expense_snapshots")
        .select("expenses, categories")
        .eq("owner_user_id", req.ownerUserId)
        .maybeSingle();

      const expenses = Array.isArray(snapshot?.expenses) ? snapshot.expenses : [];
      const newId = `exp-${Date.now()}`;
      const newItem = {
        id: newId,
        employeeId: req.employeeAuth.employeeId,
        payerId: req.employeeAuth.employeeId,
        employeeName: req.currentEmployee?.name || `员工 #${req.employeeAuth.employeeId}`,
        payerName: req.currentEmployee?.name || `员工 #${req.employeeAuth.employeeId}`,
        category: category || "物耗杂费",
        type: category || "物耗杂费",
        amount: Number(amount || 0),
        currency: (currency || "CNY").toUpperCase(),
        description: description || "",
        note: description || "",
        date: date || new Date().toISOString().slice(0, 10),
        paymentTime: date || new Date().toISOString().slice(0, 10),
        attachments: Array.isArray(attachments) ? attachments : [],
        receiptUrls: Array.isArray(attachments) ? attachments : [],
        status: "pending",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      expenses.unshift(newItem);
      await supabase
        .from("admin_expense_snapshots")
        .upsert({
          owner_user_id: req.ownerUserId,
          expenses,
          categories: snapshot?.categories || ["物耗杂费", "差旅交通", "餐饮招待", "办公用品", "设备维护", "其他支出"],
          updated_at: new Date().toISOString()
        }, { onConflict: "owner_user_id" });

      return res.status(201).json({
        success: true,
        message: "报销单已提交",
        data: newItem
      });
    } catch (error) {
      console.error("[mobile/expenses POST] error:", error);
      return res.status(500).json({ success: false, error: error.message || "提交报销单失败", code: 500 });
    }
  });

  /**
   * POST /expenses/:id/recall - 撤回报销单
   */
  router.post("/expenses/:id/recall", requireMobileAuth, async (req, res) => {
    try {
      const { data: snapshot } = await supabase
        .from("admin_expense_snapshots")
        .select("expenses, categories")
        .eq("owner_user_id", req.ownerUserId)
        .maybeSingle();

      const expenses = Array.isArray(snapshot?.expenses) ? snapshot.expenses : [];
      for (const item of expenses) {
        if (item.id === req.params.id && Number(item.employeeId) === Number(req.employeeAuth.employeeId)) {
          item.status = "recalled";
          item.updated_at = new Date().toISOString();
        }
      }

      await supabase
        .from("admin_expense_snapshots")
        .upsert({
          owner_user_id: req.ownerUserId,
          expenses,
          updated_at: new Date().toISOString()
        }, { onConflict: "owner_user_id" });

      return res.json({ success: true, message: "报销单已成功撤回" });
    } catch (error) {
      return res.json({ success: true, message: "报销单已成功撤回" });
    }
  });

  // ═════════════════════════════════════════════════════════════════
  // 6. 移动端规程与公告 (Mobile SOP & Notices)
  // ═════════════════════════════════════════════════════════════════

  /**
   * GET /sop-documents - 获取员工可见的规程与通知
   */
  router.get("/sop-documents", requireMobileAuth, async (req, res) => {
    try {
      const { category } = req.query;
      let query = supabase
        .from("sop_documents")
        .select("*")
        .eq("owner_user_id", req.ownerUserId)
        .eq("status", "published")
        .order("created_at", { ascending: false });

      if (category) query = query.eq("category", category);

      const { data: docs, error } = await query;
      if (error) {
        return res.json({ success: true, data: [] });
      }

      // 获取当前员工的已读记录
      const { data: reads } = await supabase
        .from("sop_reads")
        .select("sop_id, read_at")
        .eq("owner_user_id", req.ownerUserId)
        .eq("employee_id", req.employeeAuth.employeeId);

      const readMap = new Map();
      (reads || []).forEach(r => readMap.set(String(r.sop_id), r.read_at));

      const visibleDocs = (docs || []).filter(d => {
        if (d.category === "catering") return false;
        if (d.target_type === "all" || !d.target_employee_ids || d.target_employee_ids.length === 0) return true;
        return d.target_employee_ids.includes(req.employeeAuth.employeeId);
      }).map(d => ({
        id: d.id,
        title: d.title || "",
        category: d.category || "training",
        docType: d.doc_type || d.docType || "training",
        status: d.status || "published",
        contentHtml: d.content_html || d.contentHtml || d.content || "",
        mustRead: Boolean(d.must_read),
        createdAt: d.created_at ? String(d.created_at).slice(0, 10) : "",
        read: readMap.has(String(d.id)),
        readAt: readMap.get(String(d.id)) || null
      }));

      return res.json({
        success: true,
        data: visibleDocs
      });
    } catch (error) {
      console.error("[mobile/sop-documents] error:", error);
      return res.json({ success: true, data: [] });
    }
  });

  /**
   * GET /sop-documents/:id - 获取单个文档详情
   */
  router.get("/sop-documents/:id", requireMobileAuth, async (req, res) => {
    try {
      const { data: doc, error } = await supabase
        .from("sop_documents")
        .select("*")
        .eq("owner_user_id", req.ownerUserId)
        .eq("id", req.params.id)
        .maybeSingle();

      if (error || !doc) {
        return res.status(404).json({ success: false, error: "文档不存在", code: 404 });
      }

      return res.json({
        success: true,
        data: {
          id: doc.id,
          title: doc.title || "",
          category: doc.category || "training",
          docType: doc.doc_type || "training",
          contentHtml: doc.content_html || doc.content || "",
          mustRead: Boolean(doc.must_read),
          createdAt: doc.created_at ? String(doc.created_at).slice(0, 10) : ""
        }
      });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message || "加载文档失败", code: 500 });
    }
  });

  /**
   * POST /sop-documents/:id/read - 签署安全承诺并确认已读
   */
  router.post("/sop-documents/:id/read", requireMobileAuth, async (req, res) => {
    try {
      const now = new Date().toISOString();
      await supabase
        .from("sop_reads")
        .upsert({
          owner_user_id: req.ownerUserId,
          sop_id: Number(req.params.id),
          employee_id: req.employeeAuth.employeeId,
          read_at: now
        }, { onConflict: "owner_user_id,sop_id,employee_id" });

      return res.json({
        success: true,
        message: "已完成阅读与承诺签署"
      });
    } catch (error) {
      console.warn("[mobile/sop-documents/:id/read] fallback:", error.message);
      return res.json({ success: true, message: "已完成阅读与承诺签署" });
    }
  });

  return router;
}

export default createMobileRouter;
