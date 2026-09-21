import {
  calculateDailyMetrics,
  normalizeDbConfig,
  DEFAULT_CONFIG,
  decodeHoliday
} from "./attendance.js";

/**
 * 考勤时区工具：以业务地（泰国/东南亚 Asia/Bangkok）时区计算当前日期与昨日结算日期
 */
export function getBangkokDateKey(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(now);
  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;
  return `${year}-${month}-${day}`;
}

export function addDaysToDateKey(dateKey, dayDelta) {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + dayDelta);
  return date.toISOString().slice(0, 10);
}

export function getAttendanceCronDates(now = new Date()) {
  const todayDate = getBangkokDateKey(now);
  return {
    todayDate,
    previousDate: addDaysToDateKey(todayDate, -1)
  };
}

/**
 * 定时任务权限验证：支持 Vercel Bearer 密钥、x-cron-secret 头或已登录管理员
 */
export function isAuthorizedCronRequest(req, expectedSecret) {
  const authHeader = String(req.headers.authorization || "").trim();
  const customHeader = String(req.headers["x-cron-secret"] || "").trim();

  // 1. 匹配官方 CRON_SECRET
  if (expectedSecret) {
    if (authHeader === `Bearer ${expectedSecret}` || customHeader === expectedSecret) {
      return true;
    }
  }

  // 2. 允许管理后台已通过身份验证的管理员手动触发
  if (req.authUser && req.authUser.adminAuthUserId) {
    return true;
  }

  // 3. 本地开发环境未配置密钥时，允许安全测试
  if (!expectedSecret && process.env.NODE_ENV !== "production") {
    return true;
  }

  return false;
}

/**
 * 每日夜间考勤自动归档与结算核心服务
 */
export async function runDailyAttendanceMaintenance({
  supabase,
  directDbPool,
  targetDate,
  ownerUserId = null
}) {
  const startTime = Date.now();
  const cronDates = getAttendanceCronDates();
  const dateKey = targetDate || cronDates.previousDate;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    throw new Error(`结算日期格式无效: ${dateKey}，要求 YYYY-MM-DD`);
  }

  // 1. 获取所有需要结算的租户列表 (owner_user_id)
  let ownerIds = [];
  if (ownerUserId) {
    ownerIds = [ownerUserId];
  } else {
    const { data: owners, error: ownerErr } = await supabase
      .from("workspace_employees")
      .select("owner_user_id")
      .eq("is_deleted", false);

    if (ownerErr) throw ownerErr;
    ownerIds = Array.from(
      new Set((owners || []).map((o) => o.owner_user_id).filter(Boolean))
    );
  }

  let totalEmployees = 0;
  let settledCount = 0;
  let skippedCount = 0;
  const failures = [];

  for (const ownerId of ownerIds) {
    try {
      // 2. 获取该租户在目标日期的在职员工 (排除已离职或入职日期在结算日之后的员工)
      const { data: emps, error: empErr } = await supabase
        .from("workspace_employees")
        .select("*")
        .eq("owner_user_id", ownerId)
        .eq("is_deleted", false)
        .neq("status", "resigned")
        .or(`join_date.is.null,join_date.lte.${dateKey}`);

      if (empErr) {
        failures.push({ ownerUserId: ownerId, stage: "fetch_employees", error: empErr.message });
        continue;
      }

      const activeEmployees = emps || [];
      if (activeEmployees.length === 0) continue;
      totalEmployees += activeEmployees.length;

      // 3. 获取该租户的考勤配置列表 (按 warehouse_code 映射)
      const { data: configs, error: cfgErr } = await supabase
        .from("workspace_attendance_config")
        .select("*")
        .eq("owner_user_id", ownerId);

      if (cfgErr) {
        failures.push({ ownerUserId: ownerId, stage: "fetch_configs", error: cfgErr.message });
        continue;
      }

      const configMap = new Map();
      (configs || []).forEach((c) => {
        configMap.set(c.warehouse_code, normalizeDbConfig(c));
      });
      const defaultConfig = configMap.get("TH") || normalizeDbConfig(configs?.[0]) || { ...DEFAULT_CONFIG };

      // 4. 获取当天的打卡记录
      const { data: records, error: recErr } = await supabase
        .from("workspace_attendance_records")
        .select("*")
        .eq("owner_user_id", ownerId)
        .eq("date", dateKey);

      if (recErr) {
        failures.push({ ownerUserId: ownerId, stage: "fetch_records", error: recErr.message });
        continue;
      }

      const recordMap = new Map();
      (records || []).forEach((r) => {
        recordMap.set(Number(r.employee_id), r);
      });

      // 5. 获取当天的请假批准记录
      const { data: leaves } = await supabase
        .from("workspace_attendance_records")
        .select("*")
        .eq("owner_user_id", ownerId)
        .eq("date", dateKey)
        .eq("type", "leave");

      const leaveMap = new Map();
      (leaves || []).forEach((l) => {
        leaveMap.set(Number(l.employee_id), l);
      });

      // 6. 逐一员工执行结算与工时费用核算
      for (const empRow of activeEmployees) {
        try {
          const warehouseCode = empRow.warehouse_code || "TH";
          const config = configMap.get(warehouseCode) || defaultConfig;
          const rec = recordMap.get(Number(empRow.id)) || null;
          const leaveRec = leaveMap.get(Number(empRow.id)) || null;

          // 员工薪资与规则参数归一化
          const empParam = {
            id: empRow.id,
            name: empRow.name,
            status: leaveRec ? "休假" : empRow.status,
            salaryType: empRow.salary_type || "fixed",
            baseMonthlyWage: empRow.fixed_salary,
            dailyWage:
              empRow.daily_wage == null
                ? empRow.fixed_salary != null
                  ? Math.round(Number(empRow.fixed_salary) / 30)
                  : null
                : Number(empRow.daily_wage),
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
            currency: empRow.currency || config.currency || "THB"
          };

          const holidays = (config.holidayDates || []).map(decodeHoliday).filter(Boolean);

          const metrics = calculateDailyMetrics({
            emp: empParam,
            rec: rec
              ? {
                  id: String(rec.id),
                  inTime: rec.in_time,
                  outTime: rec.out_time,
                  type: rec.type || "normal"
                }
              : null,
            date: dateKey,
            config,
            holidays
          });

          const calcPayload = {
            owner_user_id: ownerId,
            employee_id: empRow.id,
            warehouse_code: warehouseCode,
            attendance_record_id: rec ? rec.id : null,
            date: dateKey,
            raw_in_time: rec ? rec.in_time : null,
            raw_out_time: rec ? rec.out_time : null,
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

          const { error: upsertErr } = await supabase
            .from("workspace_attendance_calculation_results")
            .upsert(calcPayload, { onConflict: "owner_user_id,employee_id,date" });

          if (upsertErr) {
            failures.push({
              ownerUserId: ownerId,
              employeeId: empRow.id,
              date: dateKey,
              error: upsertErr.message
            });
          } else {
            settledCount++;
          }
        } catch (itemErr) {
          failures.push({
            ownerUserId: ownerId,
            employeeId: empRow.id,
            date: dateKey,
            error: itemErr.message
          });
        }
      }
    } catch (ownerLoopErr) {
      failures.push({ ownerUserId: ownerId, date: dateKey, error: ownerLoopErr.message });
    }
  }

  const durationMs = Date.now() - startTime;
  return {
    ok: failures.length === 0,
    service: "admin-v4-cron",
    job: "attendance-nightly",
    settledDate: dateKey,
    totalOwners: ownerIds.length,
    totalEmployees,
    settledCount,
    skippedCount,
    failuresCount: failures.length,
    durationMs,
    failures: failures.slice(0, 20)
  };
}
