import { roundToTwo, parseTimeToHours, calculateOverlapHours } from "../server/attendance-v2.js";

export const DEFAULT_CONFIG = {
  startShift: "08:30",
  endShift: "17:30",
  breakStart: "12:00",
  breakEnd: "13:00",
  standardHours: 8,
  otHourlyFee: 50,
  overtimeRuleEnabled: false,
  holidayDates: [],
  currency: "THB",
  companyAddress: "",
  companyLat: 0,
  companyLng: 0,
  taxRate: 0.05,
  overtimeMultiplier: 1.5,
  dailyBreakMinutes: 60
};

export function getMonthDateRange(monthStr) {
  if (!monthStr || typeof monthStr !== "string") {
    const now = new Date().toISOString().slice(0, 7);
    monthStr = now;
  }
  const [year, month] = monthStr.slice(0, 7).split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return {
    startDate: `${monthStr.slice(0, 7)}-01`,
    endDate: `${monthStr.slice(0, 7)}-${String(lastDay).padStart(2, "0")}`
  };
}

export function encodeHoliday(h) {
  if (!h) return null;
  if (typeof h === "string") return h.trim();
  const date = String(h.date || "").trim();
  if (!date) return null;
  const name = String(h.name || "节假日").trim();
  const country = String(h.country || "").trim();
  return `${date}::${name}::${country}`;
}

export function decodeHoliday(str) {
  if (!str) return null;
  if (typeof str === "object") {
    return {
      id: str.id || `h-${str.date}-${str.name || ""}`,
      date: str.date,
      name: str.name || "节假日",
      country: str.country || ""
    };
  }
  const parts = String(str).split("::");
  const date = parts[0]?.trim() || "";
  if (!date) return null;
  const name = parts[1]?.trim() || "节假日";
  const country = parts[2]?.trim() || "";
  return {
    id: `h-${date}-${name}`,
    date,
    name,
    country
  };
}

export function enumerateDateRange(startDate, endDate) {
  const dates = [];
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  const curr = new Date(start);
  while (curr <= end) {
    dates.push(curr.toISOString().slice(0, 10));
    curr.setUTCDate(curr.getUTCDate() + 1);
  }
  return dates;
}

export function isWarehouseAllowed(authUser, warehouseCode) {
  const activeWarehouse = authUser?.adminV4CountryCode || authUser?.countryCode;
  if (activeWarehouse && warehouseCode && warehouseCode !== activeWarehouse) {
    return false;
  }
  const allowed = Array.isArray(authUser?.allowedWarehouses) ? authUser.allowedWarehouses : [];
  if (allowed.includes("*") || allowed.includes("all")) return true;
  if (!warehouseCode) return true;
  return allowed.includes(warehouseCode);
}

// Calculate Haversine distance in meters
function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371e3; // metres
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

export function normalizeDbConfig(row) {
  if (!row) return { ...DEFAULT_CONFIG };
  return {
    id: Number(row.id),
    warehouseCode: row.warehouse_code,
    startShift: row.start_shift || DEFAULT_CONFIG.startShift,
    endShift: row.end_shift || DEFAULT_CONFIG.endShift,
    breakStart: row.break_start || DEFAULT_CONFIG.breakStart,
    breakEnd: row.break_end || DEFAULT_CONFIG.breakEnd,
    standardHours: Number(row.standard_hours ?? DEFAULT_CONFIG.standardHours),
    otHourlyFee: Number(row.ot_hourly_fee ?? DEFAULT_CONFIG.otHourlyFee),
    overtimeMultiplier: Number(row.overtime_multiplier ?? DEFAULT_CONFIG.overtimeMultiplier),
    taxRate: Number(row.tax_rate ?? DEFAULT_CONFIG.taxRate),
    dailyBreakMinutes: Number(row.daily_break_minutes ?? DEFAULT_CONFIG.dailyBreakMinutes),
    overtimeRuleEnabled: Boolean(row.overtime_rule_enabled),
    holidayDates: Array.isArray(row.holiday_dates) ? row.holiday_dates : [],
    currency: row.currency || DEFAULT_CONFIG.currency,
    companyAddress: row.company_address || "",
    companyLat: Number(row.company_lat || 0),
    companyLng: Number(row.company_lng || 0)
  };
}

export function calculateDailyMetrics({ emp, rec, date, config, holidays = [] }) {
  let details = { valid: 0, ot: 0, raw: 0, breakDeduction: 0 };
  let type = "absent";

  const isEmpLeave = emp.status === "休假" || emp.status === "on_leave";

  if (isEmpLeave) {
    type = "leave";
  } else if (!rec) {
    type = "absent";
  } else {
    type = rec.type || "normal";
    if (rec.inTime && rec.outTime) {
      const inH = parseTimeToHours(rec.inTime);
      const outH = parseTimeToHours(rec.outTime);
      const breakStartH = parseTimeToHours(config.breakStart || "12:00");
      const breakEndH = parseTimeToHours(config.breakEnd || "13:00");

      if (inH !== null && outH !== null) {
        let diff = outH - inH;
        if (diff < 0) diff += 24;
        let breakDeduction = 0;
        if (breakStartH !== null && breakEndH !== null) {
          breakDeduction = calculateOverlapHours(inH, outH < inH ? outH + 24 : outH, breakStartH, breakEndH);
        }
        const valid = Math.max(0, diff - breakDeduction);
        const standardHours = Number(config.standardHours || 8);
        const ot = Math.max(0, valid - standardHours);
        details = {
          valid: roundToTwo(valid),
          ot: roundToTwo(ot),
          raw: roundToTwo(diff),
          breakDeduction: roundToTwo(breakDeduction)
        };
      }
    }
  }

  const isAbsentOrLeave = isEmpLeave || !rec || type === "absent" || type === "leave" || type === "sick_leave";
  if (isAbsentOrLeave) {
    details.valid = 0;
    details.ot = 0;
  }
  const salaryType = emp.salaryType || emp.salary_type || "fixed";
  const baseMonthlyWage = Number(emp.baseMonthlyWage ?? emp.fixed_salary ?? 0);
  const dailyWage = Number(emp.dailyWage ?? emp.daily_wage ?? 0);
  const hourlyRate = Number(emp.hourlyRate ?? emp.hourly_rate ?? 0);
  const standardHours = Number(config.standardHours || 8);

  let shiftPay = 0;
  if (!isAbsentOrLeave) {
    if (salaryType === "hourly") {
      shiftPay = (details.valid - details.ot) * hourlyRate;
    } else if (baseMonthlyWage > 0) {
      shiftPay = baseMonthlyWage / 30;
    } else if (dailyWage > 0) {
      shiftPay = (details.valid - details.ot) * (dailyWage / standardHours);
    } else {
      shiftPay = (details.valid - details.ot) * hourlyRate;
    }
  }

  // Overtime pay calculation
  const otHours = details.ot;
  let otPay = 0;

  if (!isAbsentOrLeave && otHours > 0) {
    const otRuleType = emp.otRuleType ?? emp.ot_rule_type ?? "fixed";
    if (otRuleType === "fixed") {
      const otFixedRate = Number(
        emp.otFixedRate ??
        emp.overtimeHourlyFee ??
        emp.overtime_hourly_fee ??
        config.otHourlyFee ??
        0
      );
      otPay = otHours * otFixedRate;
    } else {
      // otRuleType === "multiplier"
      const hasBaseWage = baseMonthlyWage > 0;
      const hasDailyWage = dailyWage > 0;
      const otBaseRate = Number(emp.otBaseRate ?? emp.ot_base_rate ?? 0);
      const baseHourlyRate = otBaseRate > 0
        ? otBaseRate
        : (hasBaseWage
            ? ((baseMonthlyWage / 30) / standardHours)
            : (hasDailyWage
                ? (dailyWage / standardHours)
                : hourlyRate
              )
          );

      const dayOfWeek = new Date(`${date}T00:00:00Z`).getUTCDay();
      const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);
      const rawHolidayList = Array.isArray(config.holidayDates) && config.holidayDates.length > 0
        ? config.holidayDates
        : (Array.isArray(holidays) ? holidays : []);
      const holidayDatesSet = new Set(
        rawHolidayList
          .map(h => {
            if (typeof h === "string") return h.split("::")[0].trim();
            return h?.date;
          })
          .filter(Boolean)
      );
      const isHoliday = holidayDatesSet.has(date);

      const wMult = Number(emp.otMultiplierWorkday ?? emp.ot_multiplier_workday ?? 1.5);
      const weMult = Number(emp.otMultiplierWeekend ?? emp.ot_multiplier_weekend ?? 2.0);
      const hMult = Number(emp.otMultiplierHoliday ?? emp.ot_multiplier_holiday ?? 3.0);

      let multiplier = wMult;
      if (isHoliday) {
        multiplier = hMult;
      } else if (isWeekend) {
        multiplier = weMult;
      }

      otPay = otHours * baseHourlyRate * multiplier;
    }
  }

  const mealAllowanceDaily = Number(emp.mealAllowanceDaily ?? emp.meal_allowance ?? 0);
  const mealAllowance = isAbsentOrLeave ? 0 : mealAllowanceDaily;

  const socialSecurityMonthly = Number(emp.socialSecurity ?? emp.social_security ?? 0);
  const dailySocialSecurity = isAbsentOrLeave ? 0 : (socialSecurityMonthly ? socialSecurityMonthly / 30 : 0);

  const isDispatch = emp.sourceType === "劳务派遣" || Boolean(emp.is_dispatch_personnel);
  const commRate = Number(emp.dispatchCommissionRate ?? emp.service_fee_rate ?? 0);
  const dailyServiceFee = (isAbsentOrLeave || !isDispatch) ? 0 : (shiftPay * (commRate / 100));

  const totalPay = shiftPay + otPay + mealAllowance - dailySocialSecurity + dailyServiceFee;

  return {
    valid: roundToTwo(details.valid),
    ot: roundToTwo(details.ot),
    raw: roundToTwo(details.raw || (details.valid + (details.breakDeduction || 0))),
    breakDeduction: roundToTwo(details.breakDeduction || 0),
    status: type,
    shiftPay: roundToTwo(shiftPay),
    otPay: roundToTwo(otPay),
    mealAllowance: roundToTwo(mealAllowance),
    dailySocialSecurity: roundToTwo(dailySocialSecurity),
    dailyServiceFee: roundToTwo(dailyServiceFee),
    totalPay: roundToTwo(totalPay)
  };
}

export function createAttendanceRouter({ express, supabase }) {
  const router = express.Router();

  const requirePermission = (...permIds) => (req, res, next) => {
    const user = req.authUser || req.authAdminUser || {};
    const permissions = Array.isArray(user.permissions)
      ? user.permissions
      : (Array.isArray(user.member?.permissions) ? user.member.permissions : []);

    const isSuper = user.role === "超级管理员" || user.account_type === "superadmin" || permissions.includes("*") || permissions.includes("all");
    const has = isSuper || permIds.some(permId => permissions.includes(permId));

    if (!has) {
      return res.status(403).json({ error: `无操作权限: 需要 ${permIds.join(" 或 ")}` });
    }
    next();
  };

  const getScope = (req) => {
    const ownerUserId = req.authUser?.adminOwnerUserId || req.authUser?.ownerUserId || req.authUser?.id;
    const requestedWarehouse = String(req.query?.warehouse_code || req.body?.warehouse_code || "").trim().toUpperCase();
    const activeWarehouse = req.authUser?.adminV4CountryCode || req.authUser?.countryCode || "TH";
    const warehouseCode = (requestedWarehouse && requestedWarehouse !== "ALL") ? requestedWarehouse : activeWarehouse;
    return { ownerUserId, warehouseCode, activeWarehouse };
  };

  // 1. GET attendance-config
  router.get("/attendance-config", requirePermission("attendance_view"), async (req, res) => {
    try {
      const { ownerUserId, warehouseCode } = getScope(req);
      if (!isWarehouseAllowed(req.authUser, warehouseCode)) {
        return res.status(403).json({ error: "无权访问该海外仓考勤配置" });
      }

      const { data, error } = await supabase
        .from("workspace_attendance_config")
        .select("*")
        .eq("owner_user_id", ownerUserId)
        .eq("warehouse_code", warehouseCode)
        .maybeSingle();

      if (error) throw error;
      res.json(normalizeDbConfig(data));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 2. PUT & POST attendance-config
  const handleUpdateAttendanceConfig = async (req, res) => {
    try {
      const { ownerUserId, warehouseCode } = getScope(req);
      if (!isWarehouseAllowed(req.authUser, warehouseCode)) {
        return res.status(403).json({ error: "无权修改该海外仓考勤配置" });
      }

      const body = req.body || {};

      let holidayDates = undefined;
      if (Array.isArray(body.holidayDates)) {
        holidayDates = body.holidayDates.map(encodeHoliday).filter(Boolean);
      } else {
        const { data: existing } = await supabase
          .from("workspace_attendance_config")
          .select("holiday_dates")
          .eq("owner_user_id", ownerUserId)
          .eq("warehouse_code", warehouseCode)
          .maybeSingle();
        holidayDates = Array.isArray(existing?.holiday_dates) ? existing.holiday_dates : [];
      }

      const upsertPayload = {
        owner_user_id: ownerUserId,
        warehouse_code: warehouseCode,
        start_shift: body.startShift || "08:30",
        end_shift: body.endShift || "17:30",
        break_start: body.breakStart || "12:00",
        break_end: body.breakEnd || "13:00",
        standard_hours: Number(body.standardHours ?? 8),
        ot_hourly_fee: Number(body.otHourlyFee ?? 50),
        overtime_rule_enabled: Boolean(body.overtimeRuleEnabled),
        holiday_dates: holidayDates,
        currency: body.currency || "THB",
        company_address: body.companyAddress || "",
        company_lat: Number(body.companyLat || 0),
        company_lng: Number(body.companyLng || 0),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from("workspace_attendance_config")
        .upsert(upsertPayload, { onConflict: "owner_user_id,warehouse_code" })
        .select()
        .single();

      if (error) throw error;

      res.json(normalizeDbConfig(data));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };

  router.put("/attendance-config", requirePermission("attendance_edit"), handleUpdateAttendanceConfig);
  router.post("/attendance-config", requirePermission("attendance_edit"), handleUpdateAttendanceConfig);

  // 2.1 GET /holidays
  router.get("/holidays", requirePermission("attendance_view"), async (req, res) => {
    try {
      const { ownerUserId, warehouseCode } = getScope(req);
      if (!isWarehouseAllowed(req.authUser, warehouseCode)) {
        return res.status(403).json({ error: "无权访问该海外仓假期配置" });
      }

      const { data, error } = await supabase
        .from("workspace_attendance_config")
        .select("holiday_dates")
        .eq("owner_user_id", ownerUserId)
        .eq("warehouse_code", warehouseCode)
        .maybeSingle();

      if (error) throw error;
      const rawList = Array.isArray(data?.holiday_dates) ? data.holiday_dates : [];
      const list = rawList.map(decodeHoliday).filter(Boolean);
      res.json(list);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 2.2 PUT & POST /holidays
  const handleUpdateHolidays = async (req, res) => {
    try {
      const { ownerUserId, warehouseCode } = getScope(req);
      if (!isWarehouseAllowed(req.authUser, warehouseCode)) {
        return res.status(403).json({ error: "无权修改该海外仓假期配置" });
      }

      const body = req.body || {};
      const list = Array.isArray(body.holidays) ? body.holidays : (Array.isArray(body) ? body : []);
      const encoded = list.map(encodeHoliday).filter(Boolean);

      const { data: existing } = await supabase
        .from("workspace_attendance_config")
        .select("id")
        .eq("owner_user_id", ownerUserId)
        .eq("warehouse_code", warehouseCode)
        .maybeSingle();

      let result;
      if (existing) {
        const { data, error } = await supabase
          .from("workspace_attendance_config")
          .update({
            holiday_dates: encoded,
            updated_at: new Date().toISOString()
          })
          .eq("id", existing.id)
          .select("holiday_dates")
          .single();
        if (error) throw error;
        result = data;
      } else {
        const { data, error } = await supabase
          .from("workspace_attendance_config")
          .insert({
            owner_user_id: ownerUserId,
            warehouse_code: warehouseCode,
            start_shift: DEFAULT_CONFIG.startShift,
            end_shift: DEFAULT_CONFIG.endShift,
            break_start: DEFAULT_CONFIG.breakStart,
            break_end: DEFAULT_CONFIG.breakEnd,
            standard_hours: DEFAULT_CONFIG.standardHours,
            ot_hourly_fee: DEFAULT_CONFIG.otHourlyFee,
            holiday_dates: encoded,
            currency: DEFAULT_CONFIG.currency,
            updated_at: new Date().toISOString()
          })
          .select("holiday_dates")
          .single();
        if (error) throw error;
        result = data;
      }

      const rawList = Array.isArray(result?.holiday_dates) ? result.holiday_dates : [];
      res.json(rawList.map(decodeHoliday).filter(Boolean));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };

  router.put("/holidays", requirePermission("attendance_edit"), handleUpdateHolidays);
  router.post("/holidays", requirePermission("attendance_edit"), handleUpdateHolidays);

  // 3. GET attendance-records
  router.get("/attendance-records", requirePermission("attendance_view"), async (req, res) => {
    try {
      const { ownerUserId, warehouseCode } = getScope(req);
      if (!isWarehouseAllowed(req.authUser, warehouseCode)) {
        return res.status(403).json({ error: "无权访问该海外仓考勤数据" });
      }

      const { month, date, employee_id } = req.query;

      let query = supabase
        .from("workspace_attendance_records")
        .select("*")
        .eq("owner_user_id", ownerUserId)
        .eq("warehouse_code", warehouseCode);

      if (date) {
        query = query.eq("date", date);
      } else if (month) {
        const { startDate, endDate } = getMonthDateRange(month);
        query = query.gte("date", startDate).lte("date", endDate);
      }

      if (employee_id && employee_id !== "all") {
        query = query.eq("employee_id", Number(employee_id));
      }

      const { data, error } = await query.order("date", { ascending: false }).limit(5000);
      if (error) throw error;

      res.json(data || []);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });



  // Helper: Persist and compute a single day record (supports pre-fetched context to eliminate duplicate roundtrips)
  async function saveAndRecalculateRecord({
    ownerUserId,
    warehouseCode,
    empId,
    date,
    inTime,
    outTime,
    type,
    note,
    inLat,
    inLng,
    outLat,
    outLng,
    empRow: prefetchedEmp,
    config: prefetchedConfig,
    existingRec: prefetchedExistingRec
  }) {
    // 1. Resolve config (reuse prefetched if provided)
    let config = prefetchedConfig;
    if (!config) {
      const { data: cfgRow } = await supabase
        .from("workspace_attendance_config")
        .select("*")
        .eq("owner_user_id", ownerUserId)
        .eq("warehouse_code", warehouseCode)
        .maybeSingle();
      config = normalizeDbConfig(cfgRow);
    }

    // 2. Resolve existing record (reuse prefetched if provided)
    let existingRec = prefetchedExistingRec;
    if (existingRec === undefined) {
      const { data } = await supabase
        .from("workspace_attendance_records")
        .select("*")
        .eq("owner_user_id", ownerUserId)
        .eq("employee_id", empId)
        .eq("date", date)
        .maybeSingle();
      existingRec = data;
    }

    const finalInLat = inLat !== undefined ? inLat : existingRec?.in_lat ?? null;
    const finalInLng = inLng !== undefined ? inLng : existingRec?.in_lng ?? null;
    const finalOutLat = outLat !== undefined ? outLat : existingRec?.out_lat ?? null;
    const finalOutLng = outLng !== undefined ? outLng : existingRec?.out_lng ?? null;

    let inDistance = null, inDeviated = false;
    let outDistance = null, outDeviated = false;

    if (finalInLat && finalInLng && config.companyLat && config.companyLng) {
      inDistance = calculateDistanceMeters(finalInLat, finalInLng, config.companyLat, config.companyLng);
      inDeviated = inDistance > 800;
    }
    if (finalOutLat && finalOutLng && config.companyLat && config.companyLng) {
      outDistance = calculateDistanceMeters(finalOutLat, finalOutLng, config.companyLat, config.companyLng);
      outDeviated = outDistance > 800;
    }

    const recordPayload = {
      owner_user_id: ownerUserId,
      employee_id: empId,
      warehouse_code: warehouseCode,
      date,
      in_time: inTime || null,
      out_time: outTime || null,
      type: type || "normal",
      note: note || "",
      in_lat: finalInLat,
      in_lng: finalInLng,
      in_distance: inDistance,
      in_deviated: inDeviated,
      out_lat: finalOutLat,
      out_lng: finalOutLng,
      out_distance: outDistance,
      out_deviated: outDeviated,
      updated_at: new Date().toISOString()
    };

    const { data: record, error: recErr } = await supabase
      .from("workspace_attendance_records")
      .upsert(recordPayload, { onConflict: "owner_user_id,employee_id,date" })
      .select()
      .single();

    if (recErr) throw recErr;

    // 3. Resolve employee row for calculation (reuse prefetched if provided)
    let empRow = prefetchedEmp;
    if (!empRow) {
      const { data, error: empErr } = await supabase
        .from("workspace_employees")
        .select("*")
        .eq("owner_user_id", ownerUserId)
        .eq("id", empId)
        .single();
      if (empErr) throw empErr;
      empRow = data;
    }

    const metrics = calculateDailyMetrics({
      emp: {
        id: empRow.id,
        name: empRow.name,
        status: empRow.status,
        salaryType: empRow.salary_type,
        baseMonthlyWage: empRow.fixed_salary,
        dailyWage: empRow.daily_wage == null ? (empRow.fixed_salary != null ? Math.round(Number(empRow.fixed_salary) / 30) : null) : Number(empRow.daily_wage),
        hourlyRate: empRow.hourly_rate,
        mealAllowanceDaily: empRow.meal_allowance,
        socialSecurity: empRow.social_security,
        sourceType: empRow.is_dispatch_personnel ? "劳务派遣" : "自招",
        dispatchCommissionRate: empRow.service_fee_rate,
        overtimeHourlyFee: empRow.overtime_hourly_fee,
        otRuleType: empRow.ot_rule_type,
        otFixedRate: empRow.overtime_hourly_fee,
        otBaseRate: empRow.ot_base_rate,
        otMultiplierWorkday: empRow.ot_multiplier_workday,
        otMultiplierWeekend: empRow.ot_multiplier_weekend,
        otMultiplierHoliday: empRow.ot_multiplier_holiday,
        currency: empRow.currency
      },
      rec: {
        id: String(record.id),
        inTime: record.in_time,
        outTime: record.out_time,
        type: record.type
      },
      date,
      config
    });

    const calcPayload = {
      owner_user_id: ownerUserId,
      employee_id: empId,
      warehouse_code: warehouseCode,
      attendance_record_id: record.id,
      date,
      raw_in_time: record.in_time,
      raw_out_time: record.out_time,
      raw_hours: metrics.raw,
      break_deduction_hours: metrics.breakDeduction,
      valid_hours: metrics.valid,
      standard_hours: config.standardHours,
      overtime_raw_hours: metrics.ot,
      overtime_pay_hours: metrics.ot,
      work_pay: metrics.shiftPay,
      overtime_pay: metrics.otPay,
      meal_allowance_amount: metrics.mealAllowance,
      total_pay: metrics.totalPay,
      status: metrics.status,
      updated_at: new Date().toISOString()
    };

    const { error: calcSaveErr } = await supabase
      .from("workspace_attendance_calculation_results")
      .upsert(calcPayload, { onConflict: "owner_user_id,employee_id,date" });
    if (calcSaveErr) throw calcSaveErr;

    return { record, metrics };
  }

  // --- Leave Requests CRUD & Attendance Cascade ---

  router.get("/leave-requests", requirePermission("leave_view", "attendance_view"), async (req, res) => {
    try {
      const { ownerUserId, warehouseCode } = getScope(req);
      const targetWarehouse = req.query.warehouse_code || null;

      let query = supabase
        .from("leave_requests")
        .select("id, employee_id, type, start_date, end_date, duration_days, reason, status, submitted_at, approved_at, rejected_at")
        .eq("owner_user_id", ownerUserId)
        .order("start_date", { ascending: false })
        .limit(5000);

      if (targetWarehouse) {
        const { data: emps } = await supabase
          .from("workspace_employees")
          .select("id")
          .eq("owner_user_id", ownerUserId)
          .eq("warehouse_code", targetWarehouse);
        const empIds = (emps || []).map(e => e.id);
        if (empIds.length === 0) return res.json([]);
        query = query.in("employee_id", empIds);
      }

      const { data, error } = await query;
      if (error) throw error;

      const mapped = (data || []).map(row => ({
        id: String(row.id),
        empId: Number(row.employee_id),
        type: row.type === "sick" ? "病假" : (row.type === "personal" ? "事假" : (row.type === "annual" ? "年假" : row.type)),
        days: Number(row.duration_days) || 1,
        startDate: typeof row.start_date === "string" ? row.start_date.slice(0, 10) : new Date(row.start_date).toISOString().slice(0, 10),
        endDate: typeof row.end_date === "string" ? row.end_date.slice(0, 10) : new Date(row.end_date).toISOString().slice(0, 10),
        reason: row.reason || "日常请假",
        status: row.status || "approved"
      }));
      res.json(mapped);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.patch("/leave-requests/:id/status", requirePermission("leave_approve"), async (req, res) => {
    try {
      const { ownerUserId } = getScope(req);
      const id = Number(req.params.id);
      const { status, approvalNote } = req.body || {};

      if (!["approved", "rejected", "pending"].includes(status)) {
        return res.status(400).json({ error: "无效的审批状态，支持 approved, rejected, pending" });
      }

      const { data: existing, error: fetchErr } = await supabase
        .from("leave_requests")
        .select("*")
        .eq("owner_user_id", ownerUserId)
        .eq("id", id)
        .single();

      if (fetchErr || !existing) {
        return res.status(404).json({ error: "请假申请不存在" });
      }

      const { data: emp, error: empErr } = await supabase
        .from("workspace_employees")
        .select("*")
        .eq("owner_user_id", ownerUserId)
        .eq("id", existing.employee_id)
        .single();

      if (empErr || !emp) {
        return res.status(404).json({ error: "关联的员工不存在" });
      }

      if (!isWarehouseAllowed(req.authUser, emp.warehouse_code)) {
        return res.status(403).json({ error: "无权操作该仓库员工的请假单" });
      }

      const now = new Date().toISOString();
      const approverId = req.authUser?.id || req.authUser?.adminAuthUserId || null;
      const updatePayload = {
        status,
        updated_at: now
      };

      if (status === "approved") {
        updatePayload.approved_at = now;
        updatePayload.rejected_at = null;
        updatePayload.approver_user_id = approverId;
        updatePayload.approval_note = approvalNote || null;
      } else if (status === "rejected") {
        updatePayload.rejected_at = now;
        updatePayload.approved_at = null;
        updatePayload.approver_user_id = approverId;
        updatePayload.approval_note = approvalNote || null;
      } else if (status === "pending") {
        updatePayload.approved_at = null;
        updatePayload.rejected_at = null;
        updatePayload.approver_user_id = null;
        updatePayload.approval_note = null;
      }

      const { data: updatedRow, error: updateErr } = await supabase
        .from("leave_requests")
        .update(updatePayload)
        .eq("owner_user_id", ownerUserId)
        .eq("id", id)
        .select()
        .single();

      if (updateErr) throw updateErr;

      const startDateStr = typeof existing.start_date === "string" ? existing.start_date.slice(0, 10) : new Date(existing.start_date).toISOString().slice(0, 10);
      const endDateStr = typeof existing.end_date === "string" ? existing.end_date.slice(0, 10) : new Date(existing.end_date).toISOString().slice(0, 10);
      const dates = enumerateDateRange(startDateStr, endDateStr);
      const leaveTypeStr = (existing.type === "sick" || existing.type === "病假") ? "sick_leave" : "leave";

      if (status === "approved") {
        for (const date of dates) {
          await saveAndRecalculateRecord({
            ownerUserId,
            warehouseCode: emp.warehouse_code,
            empId: emp.id,
            date,
            inTime: null,
            outTime: null,
            type: leaveTypeStr,
            note: `请假审批通过：${existing.reason || "日常请假"}`,
            empRow: emp
          });
        }
      } else if (existing.status === "approved" && (status === "rejected" || status === "pending")) {
        for (const date of dates) {
          const { data: rec } = await supabase
            .from("workspace_attendance_records")
            .select("id, in_time, out_time, type")
            .eq("owner_user_id", ownerUserId)
            .eq("employee_id", emp.id)
            .eq("date", date)
            .maybeSingle();

          if (rec && (rec.type === "leave" || rec.type === "sick_leave") && !rec.in_time && !rec.out_time) {
            await supabase
              .from("workspace_attendance_records")
              .delete()
              .eq("id", rec.id);

            await supabase
              .from("workspace_attendance_calculation_results")
              .delete()
              .eq("owner_user_id", ownerUserId)
              .eq("employee_id", emp.id)
              .eq("date", date);
          }
        }
      }

      const mapped = {
        id: String(updatedRow.id),
        empId: Number(updatedRow.employee_id),
        type: updatedRow.type === "sick" ? "病假" : (updatedRow.type === "personal" ? "事假" : (updatedRow.type === "annual" ? "年假" : updatedRow.type)),
        days: Number(updatedRow.duration_days) || 1,
        startDate: typeof updatedRow.start_date === "string" ? updatedRow.start_date.slice(0, 10) : new Date(updatedRow.start_date).toISOString().slice(0, 10),
        endDate: typeof updatedRow.end_date === "string" ? updatedRow.end_date.slice(0, 10) : new Date(updatedRow.end_date).toISOString().slice(0, 10),
        reason: updatedRow.reason || "",
        status: updatedRow.status
      };

      res.json(mapped);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post("/leave-requests", requirePermission("leave_approve", "attendance_edit"), async (req, res) => {
    try {
      const { ownerUserId, warehouseCode } = getScope(req);
      const { empId, type, startDate, endDate, reason, status = "approved" } = req.body || {};

      if (!empId) return res.status(400).json({ error: "请选择员工" });
      if (!startDate || !endDate) return res.status(400).json({ error: "请选择请假起止日期" });
      if (startDate > endDate) return res.status(400).json({ error: "开始日期不能晚于结束日期" });

      const { data: emp, error: empErr } = await supabase
        .from("workspace_employees")
        .select("*")
        .eq("owner_user_id", ownerUserId)
        .eq("id", Number(empId))
        .single();

      if (empErr || !emp) return res.status(404).json({ error: "所选员工不存在" });
      if (!isWarehouseAllowed(req.authUser, emp.warehouse_code)) {
        return res.status(403).json({ error: "无权操作该仓库员工的请假" });
      }

      const { data: conflicts } = await supabase
        .from("leave_requests")
        .select("id, start_date, end_date, status")
        .eq("owner_user_id", ownerUserId)
        .eq("employee_id", Number(empId))
        .in("status", ["pending", "approved"])
        .lte("start_date", endDate)
        .gte("end_date", startDate);

      if (conflicts && conflicts.length > 0) {
        return res.status(409).json({ error: `该员工在所选日期范围已存在请假记录（${conflicts[0].start_date} ~ ${conflicts[0].end_date}）` });
      }

      const dates = enumerateDateRange(startDate, endDate);
      const durationDays = dates.length;
      const now = new Date().toISOString();
      const approverId = req.authUser?.id || req.authUser?.adminAuthUserId || null;

      const normType = (type === "病假" || type === "sick") ? "sick" : (type === "年假" || type === "annual" ? "annual" : "personal");

      const insertPayload = {
        owner_user_id: ownerUserId,
        employee_id: Number(empId),
        type: normType,
        start_date: startDate,
        end_date: endDate,
        duration_days: durationDays,
        reason: reason || "日常请假",
        status: status || "approved",
        submitted_at: now,
        created_at: now,
        updated_at: now
      };

      if (status === "approved") {
        insertPayload.approved_at = now;
        insertPayload.approver_user_id = approverId;
      }

      const { data: createdRow, error: insertErr } = await supabase
        .from("leave_requests")
        .insert(insertPayload)
        .select()
        .single();

      if (insertErr) throw insertErr;

      if (status === "approved") {
        const leaveTypeStr = normType === "sick" ? "sick_leave" : "leave";
        for (const date of dates) {
          await saveAndRecalculateRecord({
            ownerUserId,
            warehouseCode: emp.warehouse_code,
            empId: emp.id,
            date,
            inTime: null,
            outTime: null,
            type: leaveTypeStr,
            note: `请假审批通过：${reason || "日常请假"}`,
            empRow: emp
          });
        }
      }

      const mapped = {
        id: String(createdRow.id),
        empId: Number(createdRow.employee_id),
        type: createdRow.type === "sick" ? "病假" : (createdRow.type === "personal" ? "事假" : (createdRow.type === "annual" ? "年假" : createdRow.type)),
        days: Number(createdRow.duration_days) || 1,
        startDate: typeof createdRow.start_date === "string" ? createdRow.start_date.slice(0, 10) : new Date(createdRow.start_date).toISOString().slice(0, 10),
        endDate: typeof createdRow.end_date === "string" ? createdRow.end_date.slice(0, 10) : new Date(createdRow.end_date).toISOString().slice(0, 10),
        reason: createdRow.reason || "",
        status: createdRow.status
      };

      res.status(201).json(mapped);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.delete("/leave-requests/:id", requirePermission("leave_approve"), async (req, res) => {
    try {
      const { ownerUserId } = getScope(req);
      const id = Number(req.params.id);

      const { data: existing, error: fetchErr } = await supabase
        .from("leave_requests")
        .select("*")
        .eq("owner_user_id", ownerUserId)
        .eq("id", id)
        .single();

      if (fetchErr || !existing) return res.status(404).json({ error: "请假申请不存在" });

      const { data: emp } = await supabase
        .from("workspace_employees")
        .select("id, warehouse_code")
        .eq("owner_user_id", ownerUserId)
        .eq("id", existing.employee_id)
        .single();

      if (emp && !isWarehouseAllowed(req.authUser, emp.warehouse_code)) {
        return res.status(403).json({ error: "无权操作该仓库员工的请假" });
      }

      if (existing.status === "approved" && emp) {
        const startDateStr = typeof existing.start_date === "string" ? existing.start_date.slice(0, 10) : new Date(existing.start_date).toISOString().slice(0, 10);
        const endDateStr = typeof existing.end_date === "string" ? existing.end_date.slice(0, 10) : new Date(existing.end_date).toISOString().slice(0, 10);
        const dates = enumerateDateRange(startDateStr, endDateStr);
        for (const date of dates) {
          const { data: rec } = await supabase
            .from("workspace_attendance_records")
            .select("id, in_time, out_time, type")
            .eq("owner_user_id", ownerUserId)
            .eq("employee_id", emp.id)
            .eq("date", date)
            .maybeSingle();

          if (rec && (rec.type === "leave" || rec.type === "sick_leave") && !rec.in_time && !rec.out_time) {
            await supabase.from("workspace_attendance_records").delete().eq("id", rec.id);
            await supabase.from("workspace_attendance_calculation_results").delete().eq("owner_user_id", ownerUserId).eq("employee_id", emp.id).eq("date", date);
          }
        }
      }

      const { error: delErr } = await supabase
        .from("leave_requests")
        .delete()
        .eq("owner_user_id", ownerUserId)
        .eq("id", id);

      if (delErr) throw delErr;

      res.json({ success: true, deletedId: String(id) });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });


  // 4. POST attendance-records
  router.post("/attendance-records", requirePermission("attendance_edit"), async (req, res) => {
    try {
      const { ownerUserId, warehouseCode } = getScope(req);
      if (!isWarehouseAllowed(req.authUser, warehouseCode)) {
        return res.status(403).json({ error: "无权操作该海外仓考勤记录" });
      }

      const { employeeId, date, inTime, outTime, type = "normal", note, inLat, inLng, outLat, outLng, isAdjustment, allowOverwrite } = req.body || {};

      if (!employeeId || !date) {
        return res.status(400).json({ error: "employeeId and date are required" });
      }

      // 1. Parallel batch fetch: employee (full fields), existing record, and config in 1 network roundtrip
      const [empRes, existingRes, cfgRes] = await Promise.all([
        supabase
          .from("workspace_employees")
          .select("*")
          .eq("owner_user_id", ownerUserId)
          .eq("id", Number(employeeId))
          .eq("is_deleted", false)
          .maybeSingle(),
        supabase
          .from("workspace_attendance_records")
          .select("*")
          .eq("owner_user_id", ownerUserId)
          .eq("employee_id", Number(employeeId))
          .eq("date", date)
          .maybeSingle(),
        supabase
          .from("workspace_attendance_config")
          .select("*")
          .eq("owner_user_id", ownerUserId)
          .eq("warehouse_code", warehouseCode)
          .maybeSingle()
      ]);

      const empCheck = empRes.data;
      if (empRes.error || !empCheck || !isWarehouseAllowed(req.authUser, empCheck.warehouse_code)) {
        return res.status(404).json({ error: "员工不存在或不属于当前仓库" });
      }

      // Lifecycle check: join_date
      if (empCheck.join_date && date < empCheck.join_date) {
        return res.status(400).json({
          error: "考勤日期（" + date + "）早于员工入职日期（" + empCheck.join_date + "），无法录入考勤"
        });
      }

      // Lifecycle check: resigned
      if (empCheck.status === "resigned") {
        return res.status(400).json({ error: "该员工已离职，无法录入新考勤记录" });
      }

      // Temporal check: future date constraint (factual attendance cannot be in the future)
      const todayStr = new Date().toISOString().slice(0, 10);
      if (date > todayStr && type !== "leave") {
        return res.status(400).json({ error: "无法为未来日期录入出勤打卡事实" });
      }

      // 2. Anti-collision check: prevent silent overwrite when record already exists
      const existingRecord = existingRes.data;
      const canUpdate = Boolean(isAdjustment || allowOverwrite);
      if (existingRecord && !canUpdate) {
        return res.status(409).json({
          error: "该员工在 " + date + " 已存在考勤记录（" + (existingRecord.in_time || "未打卡") + " ~ " + (existingRecord.out_time || "未打卡") + "，类型：" + existingRecord.type + "）。无法重复新增，请使用考勤调整功能。",
          code: "ATTENDANCE_ALREADY_EXISTS",
          existingRecordId: existingRecord.id,
          existingRecord
        });
      }

      const config = normalizeDbConfig(cfgRes.data);

      const result = await saveAndRecalculateRecord({
        ownerUserId,
        warehouseCode: empCheck.warehouse_code || warehouseCode,
        empId: Number(employeeId),
        date,
        inTime,
        outTime,
        type,
        note,
        inLat,
        inLng,
        outLat,
        outLng,
        empRow: empCheck,
        config,
        existingRec: existingRecord
      });

      res.status(201).json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 5. PUT attendance-records/:id
  router.put("/attendance-records/:id", requirePermission("attendance_edit"), async (req, res) => {
    try {
      const { ownerUserId, warehouseCode } = getScope(req);
      const id = Number(req.params.id);
      const { inTime, outTime, type, note, inLat, inLng, outLat, outLng } = req.body || {};

      // Fetch existing record to find employee_id and date
      const { data: existing, error: fetchErr } = await supabase
        .from("workspace_attendance_records")
        .select("*")
        .eq("owner_user_id", ownerUserId)
        .eq("id", id)
        .single();

      if (fetchErr || !existing || !isWarehouseAllowed(req.authUser, existing.warehouse_code)) {
        return res.status(404).json({ error: "考勤记录不存在或不属于当前仓库" });
      }

      const todayStr = new Date().toISOString().slice(0, 10);
      const targetType = type !== undefined ? type : existing.type;
      if (existing.date > todayStr && targetType !== "leave") {
        return res.status(400).json({ error: "无法为未来日期录入出勤打卡事实" });
      }

      // Parallel fetch employee and warehouse config in 1 network roundtrip
      const [empRes, cfgRes] = await Promise.all([
        supabase
          .from("workspace_employees")
          .select("*")
          .eq("owner_user_id", ownerUserId)
          .eq("id", existing.employee_id)
          .single(),
        supabase
          .from("workspace_attendance_config")
          .select("*")
          .eq("owner_user_id", ownerUserId)
          .eq("warehouse_code", existing.warehouse_code || warehouseCode)
          .maybeSingle()
      ]);

      const result = await saveAndRecalculateRecord({
        ownerUserId,
        warehouseCode: existing.warehouse_code || warehouseCode,
        empId: existing.employee_id,
        date: existing.date,
        inTime: inTime !== undefined ? inTime : existing.in_time,
        outTime: outTime !== undefined ? outTime : existing.out_time,
        type: targetType,
        note: note !== undefined ? note : existing.note,
        inLat: inLat !== undefined ? inLat : existing.in_lat,
        inLng: inLng !== undefined ? inLng : existing.in_lng,
        outLat: outLat !== undefined ? outLat : existing.out_lat,
        outLng: outLng !== undefined ? outLng : existing.out_lng,
        empRow: empRes.data,
        config: normalizeDbConfig(cfgRes.data),
        existingRec: existing
      });

      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 6. DELETE attendance-records/:id
  router.delete("/attendance-records/:id", requirePermission("attendance_edit"), async (req, res) => {
    try {
      const { ownerUserId, warehouseCode } = getScope(req);
      const id = Number(req.params.id);

      const { data: existing, error: fetchErr } = await supabase
        .from("workspace_attendance_records")
        .select("*")
        .eq("owner_user_id", ownerUserId)
        .eq("id", id)
        .single();

      if (fetchErr || !existing || !isWarehouseAllowed(req.authUser, existing.warehouse_code)) {
        return res.status(404).json({ error: "考勤记录不存在或不属于当前仓库" });
      }

      // Delete the record
      const { error: delRecErr } = await supabase
        .from("workspace_attendance_records")
        .delete()
        .eq("owner_user_id", ownerUserId)
        .eq("id", id);

      if (delRecErr) throw delRecErr;

      // Clean up the calculation result to prevent ghost records
      const { error: delCalcErr } = await supabase
        .from("workspace_attendance_calculation_results")
        .delete()
        .eq("owner_user_id", ownerUserId)
        .eq("employee_id", existing.employee_id)
        .eq("date", existing.date);

      if (delCalcErr) throw delCalcErr;

      res.json({ success: true, deletedId: id });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 7. POST attendance-calculations/recalculate
  router.post("/attendance-calculations/recalculate", requirePermission("attendance_edit"), async (req, res) => {
    try {
      const { ownerUserId, warehouseCode } = getScope(req);
      if (!isWarehouseAllowed(req.authUser, warehouseCode)) {
        return res.status(403).json({ error: "无权操作该海外仓考勤数据" });
      }

      const { month } = req.body || {};
      const targetMonth = month || new Date().toISOString().slice(0, 7);
      const { startDate, endDate } = getMonthDateRange(targetMonth);

      const { data: cfgRow } = await supabase
        .from("workspace_attendance_config")
        .select("*")
        .eq("owner_user_id", ownerUserId)
        .eq("warehouse_code", warehouseCode)
        .maybeSingle();
      const config = normalizeDbConfig(cfgRow);

      let query = supabase
        .from("workspace_attendance_records")
        .select("*")
        .eq("owner_user_id", ownerUserId)
        .gte("date", startDate)
        .lte("date", endDate);
      if (warehouseCode && warehouseCode !== "ALL") {
        query = query.eq("warehouse_code", warehouseCode);
      }
      const { data: records, error: recErr } = await query;
      if (recErr) throw recErr;

      const empIds = Array.from(new Set((records || []).map(r => r.employee_id)));
      if (empIds.length === 0) {
        return res.json({ success: true, recalculatedCount: 0, month: targetMonth });
      }

      const { data: emps, error: empErr } = await supabase
        .from("workspace_employees")
        .select("*")
        .eq("owner_user_id", ownerUserId)
        .in("id", empIds);
      if (empErr) throw empErr;

      const empMap = new Map((emps || []).map(e => [e.id, e]));

      let recalculatedCount = 0;
      for (const rec of (records || [])) {
        const empRow = empMap.get(rec.employee_id);
        if (!empRow) continue;

        const metrics = calculateDailyMetrics({
          emp: {
            id: empRow.id,
            name: empRow.name,
            status: empRow.status,
            salaryType: empRow.salary_type,
            baseMonthlyWage: empRow.fixed_salary,
            dailyWage: empRow.daily_wage == null ? (empRow.fixed_salary != null ? Math.round(Number(empRow.fixed_salary) / 30) : null) : Number(empRow.daily_wage),
            hourlyRate: empRow.hourly_rate,
            mealAllowanceDaily: empRow.meal_allowance,
            socialSecurity: empRow.social_security,
            sourceType: empRow.is_dispatch_personnel ? "劳务派遣" : "自招",
            dispatchCommissionRate: empRow.service_fee_rate,
            overtimeHourlyFee: empRow.overtime_hourly_fee,
            otRuleType: empRow.ot_rule_type,
            otFixedRate: empRow.overtime_hourly_fee,
            otBaseRate: empRow.ot_base_rate,
            otMultiplierWorkday: empRow.ot_multiplier_workday,
            otMultiplierWeekend: empRow.ot_multiplier_weekend,
            otMultiplierHoliday: empRow.ot_multiplier_holiday,
            currency: empRow.currency
          },
          rec: {
            id: String(rec.id),
            inTime: rec.in_time,
            outTime: rec.out_time,
            type: rec.type
          },
          date: rec.date,
          config
        });

        const calcPayload = {
          owner_user_id: ownerUserId,
          employee_id: rec.employee_id,
          warehouse_code: rec.warehouse_code,
          attendance_record_id: rec.id,
          date: rec.date,
          raw_in_time: rec.in_time,
          raw_out_time: rec.out_time,
          raw_hours: metrics.raw,
          break_deduction_hours: metrics.breakDeduction,
          valid_hours: metrics.valid,
          standard_hours: config.standardHours,
          overtime_raw_hours: metrics.ot,
          overtime_pay_hours: metrics.ot,
          work_pay: metrics.shiftPay,
          overtime_pay: metrics.otPay,
          meal_allowance_amount: metrics.mealAllowance,
          total_pay: metrics.totalPay,
          status: metrics.status,
          updated_at: new Date().toISOString()
        };

        const { error: calcSaveErr } = await supabase
          .from("workspace_attendance_calculation_results")
          .upsert(calcPayload, { onConflict: "owner_user_id,employee_id,date" });
        if (calcSaveErr) throw calcSaveErr;
        recalculatedCount++;
      }

      res.json({ success: true, recalculatedCount, month: targetMonth });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 6. GET attendance-calculations: Returns flatRows exactly matching V4 UI expectations
  router.get("/attendance-calculations", requirePermission("attendance_view"), async (req, res) => {
    try {
      const { ownerUserId, warehouseCode } = getScope(req);
      if (!isWarehouseAllowed(req.authUser, warehouseCode)) {
        return res.status(403).json({ error: "无权访问该海外仓考勤数据" });
      }

      const { month, employee_id, status_filter } = req.query;
      const selectedMonth = month || new Date().toISOString().slice(0, 7);
      const { startDate, endDate } = getMonthDateRange(selectedMonth);

      // 1. Fetch Config
      const { data: cfgRow } = await supabase
        .from("workspace_attendance_config")
        .select("*")
        .eq("owner_user_id", ownerUserId)
        .eq("warehouse_code", warehouseCode)
        .maybeSingle();
      const config = normalizeDbConfig(cfgRow);

      // 2. Fetch Employees
      let empQuery = supabase
        .from("workspace_employees")
        .select("*")
        .eq("owner_user_id", ownerUserId)
        .eq("is_deleted", false);

      if (warehouseCode && warehouseCode !== "ALL") {
        empQuery = empQuery.eq("warehouse_code", warehouseCode);
      }

      if (status_filter === "active") {
        empQuery = empQuery.neq("status", "resigned");
      } else if (status_filter === "inactive") {
        empQuery = empQuery.eq("status", "resigned");
      }

      if (employee_id && employee_id !== "all") {
        empQuery = empQuery.eq("id", Number(employee_id));
      }

      const { data: employees, error: empErr } = await empQuery.order("name", { ascending: true });
      if (empErr) throw empErr;

      // 3. Fetch Records for Month scoped to warehouse
      let recQuery = supabase
        .from("workspace_attendance_records")
        .select("*")
        .eq("owner_user_id", ownerUserId)
        .gte("date", startDate)
        .lte("date", endDate);
      if (warehouseCode && warehouseCode !== "ALL") {
        recQuery = recQuery.eq("warehouse_code", warehouseCode);
      }
      const { data: records, error: recErr } = await recQuery;
      if (recErr) throw recErr;

      // 4. Fetch Pre-calculated Results for Month scoped to warehouse
      let calcQuery = supabase
        .from("workspace_attendance_calculation_results")
        .select("*")
        .eq("owner_user_id", ownerUserId)
        .gte("date", startDate)
        .lte("date", endDate);
      if (warehouseCode && warehouseCode !== "ALL") {
        calcQuery = calcQuery.eq("warehouse_code", warehouseCode);
      }
      const { data: calcResults, error: calcErr } = await calcQuery;
      if (calcErr) throw calcErr;

      // Build quick lookup maps
      const recordsByEmpDate = new Map();
      (records || []).forEach(r => {
        recordsByEmpDate.set(`${r.employee_id}_${r.date}`, r);
      });

      const calcsByEmpDate = new Map();
      (calcResults || []).forEach(c => {
        calcsByEmpDate.set(`${c.employee_id}_${c.date}`, c);
      });

      // Distinct dates from records plus today/yesterday in the selected month
      const dateSet = new Set();
      (records || []).forEach(r => dateSet.add(r.date));
      (calcResults || []).forEach(c => dateSet.add(c.date));

      const todayStr = new Date().toISOString().slice(0, 10);
      const yesterdayStr = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      if (todayStr.startsWith(selectedMonth)) dateSet.add(todayStr);
      if (yesterdayStr.startsWith(selectedMonth)) dateSet.add(yesterdayStr);

      const allDates = Array.from(dateSet).sort().reverse();

      // Generate flat rows matching V4 UI
      const rows = [];
      for (const date of allDates) {
        for (const emp of (employees || [])) {
          const key = `${emp.id}_${date}`;
          const recRow = recordsByEmpDate.get(key) || null;

          // Lifecycle boundary: employee has not joined yet or resigned without records on this date
          if (emp.join_date && date < emp.join_date && !recRow) {
            continue;
          }
          if (emp.status === "resigned" && !recRow) {
            continue;
          }

          let calcRow = calcsByEmpDate.get(key) || null;

          // Format emp object matching V4 Employee type with faithful compensation rules
          const empDto = {
            id: Number(emp.id),
            employeeNo: emp.employee_no,
            name: emp.name,
            nickname: emp.nickname || "",
            gender: emp.gender,
            joinDate: emp.join_date || "",
            warehouseCode: emp.warehouse_code,
            country: emp.country || "MM",
            role: emp.role,
            dept: emp.dept,
            salaryType: emp.salary_type || "fixed",
            hourlyRate: emp.hourly_rate == null ? null : Number(emp.hourly_rate),
            baseMonthlyWage: emp.fixed_salary == null ? null : Number(emp.fixed_salary),
            dailyWage: emp.daily_wage == null ? (emp.fixed_salary != null ? Math.round(Number(emp.fixed_salary) / 30) : null) : Number(emp.daily_wage),
            socialSecurity: emp.social_security == null ? 0 : Number(emp.social_security),
            mealAllowanceDaily: emp.meal_allowance == null ? 0 : Number(emp.meal_allowance),
            status: emp.status === "active" ? "在职" : emp.status === "resigned" ? "离职" : "休假",
            photo: emp.photo || null,
            sourceType: emp.is_dispatch_personnel ? "劳务派遣" : "自招",
            dispatchCommissionRate: emp.service_fee_rate == null ? 0 : Number(emp.service_fee_rate),
            otRuleType: emp.ot_rule_type || "fixed",
            otFixedRate: emp.overtime_hourly_fee == null ? null : Number(emp.overtime_hourly_fee),
            otBaseRate: emp.ot_base_rate == null ? null : Number(emp.ot_base_rate),
            otMultiplierWorkday: emp.ot_multiplier_workday == null ? 1.5 : Number(emp.ot_multiplier_workday),
            otMultiplierWeekend: emp.ot_multiplier_weekend == null ? 2.0 : Number(emp.ot_multiplier_weekend),
            otMultiplierHoliday: emp.ot_multiplier_holiday == null ? 3.0 : Number(emp.ot_multiplier_holiday),
            currency: emp.currency || config.currency || "THB"
          };

          const recDto = recRow ? {
            id: String(recRow.id),
            empId: Number(recRow.employee_id),
            date: recRow.date,
            inTime: recRow.in_time,
            outTime: recRow.out_time,
            type: recRow.type,
            note: recRow.note || "",
            inLat: recRow.in_lat == null ? null : Number(recRow.in_lat),
            inLng: recRow.in_lng == null ? null : Number(recRow.in_lng),
            inDistance: recRow.in_distance == null ? null : Number(recRow.in_distance),
            inDeviated: Boolean(recRow.in_deviated),
            outLat: recRow.out_lat == null ? null : Number(recRow.out_lat),
            outLng: recRow.out_lng == null ? null : Number(recRow.out_lng),
            outDistance: recRow.out_distance == null ? null : Number(recRow.out_distance),
            outDeviated: Boolean(recRow.out_deviated)
          } : null;

          let metrics;
          if (calcRow) {
            const shiftPay = Number(calcRow.work_pay || 0);
            const otPay = Number(calcRow.overtime_pay || 0);
            const mealAllowance = Number(calcRow.meal_allowance_amount || 0);
            const isAbsentOrLeave = calcRow.status === "absent" || calcRow.status === "leave" || calcRow.status === "sick_leave";
            const dailySocialSecurity = isAbsentOrLeave ? 0 : (empDto.socialSecurity ? Math.round((empDto.socialSecurity / 30) * 100) / 100 : 0);
            const isDispatch = empDto.sourceType === "劳务派遣";
            const commRate = isDispatch ? (Number(empDto.dispatchCommissionRate) || 0) : 0;
            const dailyServiceFee = isAbsentOrLeave ? 0 : Math.round((shiftPay * (commRate / 100)) * 100) / 100;
            const totalPay = Number(calcRow.total_pay != null ? calcRow.total_pay : (shiftPay + otPay + mealAllowance - dailySocialSecurity + dailyServiceFee));

            metrics = {
              valid: Number(calcRow.valid_hours || 0),
              ot: Number(calcRow.overtime_raw_hours || 0),
              raw: Number(calcRow.raw_hours || (Number(calcRow.valid_hours || 0) + Number(calcRow.break_deduction_hours || 0))),
              breakDeduction: Number(calcRow.break_deduction_hours || 0),
              status: (calcRow.status === "manual_adjusted" && recRow?.type) ? recRow.type : calcRow.status,
              shiftPay,
              otPay,
              mealAllowance,
              dailySocialSecurity,
              dailyServiceFee,
              totalPay
            };
          } else {
            metrics = calculateDailyMetrics({
              emp: empDto,
              rec: recDto,
              date,
              config
            });
          }

          rows.push({
            date,
            emp: empDto,
            rec: recDto,
            status: metrics.status,
            details: {
              valid: metrics.valid,
              ot: metrics.ot
            },
            shiftPay: metrics.shiftPay,
            otPay: metrics.otPay,
            mealAllowance: metrics.mealAllowance,
            dailySocialSecurity: metrics.dailySocialSecurity,
            dailyServiceFee: metrics.dailyServiceFee,
            totalPay: metrics.totalPay
          });
        }
      }

      // Sort by date desc, then name asc
      rows.sort((a, b) => {
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        return a.emp.name.localeCompare(b.emp.name);
      });

      res.json({
        rows,
        total: rows.length,
        config,
        month: selectedMonth
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}
