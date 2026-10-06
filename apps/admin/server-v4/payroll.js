import express from "express";

export function createPayrollRouter({ express, supabase, directDbPool, identity }) {
  const router = express.Router();

  // 幂等自愈：确保 monthly_payroll_results 存在 tax_deduction 字段
  if (directDbPool?.query) {
    directDbPool.query(`
      ALTER TABLE public.monthly_payroll_results
        ADD COLUMN IF NOT EXISTS tax_deduction NUMERIC(12,2) NOT NULL DEFAULT 0;
    `).catch(err => {
      console.warn("[admin-v4/payroll] ensure tax_deduction column note:", err.message);
    });
  }

  function roundToTwo(num) {
    return Math.round((Number(num || 0) + Number.EPSILON) * 100) / 100;
  }

  function getNonNegativeAmount(value) {
    const num = Number(value);
    return Number.isFinite(num) && num > 0 ? num : 0;
  }

  function mapPayrollRow(row, employee = null) {
    if (!row) return null;
    const emp = employee || {};
    const effectiveDays = Number(row.effective_attendance_days || row.working_days || 0);
    const validHours = Number(row.valid_hours || 0);
    const standardHours = Number(row.standard_hours || 0);
    const hourlyPay = Number(row.hourly_pay || 0);
    const overtimePayHours = Number(row.overtime_pay_hours || 0);
    const overtimePay = Number(row.overtime_pay || 0);
    const allowanceTotal = Number(row.allowance_total || 0);
    const taxDeduction = Number(row.tax_deduction || 0);
    const socialSecurity = Number(row.social_security_amount || row.social_security_deduction || 0);
    const deductionTotal = Number(row.deduction_total || (taxDeduction + socialSecurity));
    const otherTotal = Number(row.other_total || 0);
    const serviceFee = Number(row.service_fee_amount || 0);
    const grossPay = Number(row.gross_pay || (Number(row.base_salary || 0) + overtimePay + Number(row.meal_allowance || 0) + Number(row.attendance_bonus || 0)));
    const totalDeduction = Number(row.total_deduction || (deductionTotal + socialSecurity));
    const netPay = Number(row.net_pay || row.net_salary || (grossPay - totalDeduction));

    return {
      id: Number(row.id),
      payrollId: String(row.id),
      employeeId: Number(row.employee_id),
      employeeNo: emp.employee_no || row.employee_no || "",
      employeeName: emp.name || row.employee_name || `员工 #${row.employee_id}`,
      employeeDept: emp.dept || row.dept || "未分配",
      employeeRole: emp.role || row.role || "员工",
      employeePhoto: emp.photo || null,
      employeeStatus: emp.status || "active",
      taxRate: emp.tax_rate != null ? Number(emp.tax_rate) : 5,
      yearMonth: row.year_month,
      salaryType: row.salary_type || emp.salary_type || "fixed",
      fixedSalary: row.fixed_salary != null ? Number(row.fixed_salary) : (emp.fixed_salary != null ? Number(emp.fixed_salary) : null),
      hourlyRate: row.hourly_rate != null ? Number(row.hourly_rate) : (emp.hourly_rate != null ? Number(emp.hourly_rate) : null),
      currency: (row.currency || emp.currency || "THB").toUpperCase(),
      effectiveAttendanceDays: effectiveDays,
      workingDays: effectiveDays,
      mealAllowanceTotal: Number(row.meal_allowance_total || row.meal_allowance || 0),
      mealAllowance: Number(row.meal_allowance_total || row.meal_allowance || 0),
      attendanceBonusAmount: Number(row.attendance_bonus_amount || row.attendance_bonus || 0),
      attendanceBonus: Number(row.attendance_bonus_amount || row.attendance_bonus || 0),
      validHours,
      standardHours,
      hourlyPay,
      overtimePayHours,
      overtimePay,
      baseSalary: Number(row.base_salary || (row.salary_type === "hourly" ? hourlyPay : (row.fixed_salary || emp.fixed_salary || 0))),
      allowanceTotal,
      deductionTotal,
      taxDeduction,
      otherTotal,
      socialSecurityAmount: socialSecurity,
      socialSecurityDeduction: socialSecurity,
      serviceFeeAmount: serviceFee,
      grossPay: roundToTwo(grossPay),
      totalDeduction: roundToTwo(totalDeduction),
      netPay: roundToTwo(netPay),
      netSalary: roundToTwo(netPay),
      calculationStatus: row.calculation_status || "draft",
      reviewStatus: row.review_status || "pending",
      blockedReason: row.blocked_reason || null,
      calculatedAt: row.calculated_at || row.created_at || null,
      confirmedAt: row.confirmed_at || null,
      signed: Boolean(row.signature_value || row.signed_at),
      signedAt: row.signed_at || null,
      signatureValue: row.signature_value || null,
      createdAt: row.created_at || null,
      updatedAt: row.updated_at || null
    };
  }

  /**
   * GET /payroll-results - 获取月度薪资核算结果列表（大盘）
   */
  router.get("/payroll-results", async (req, res) => {
    try {
      const ownerUserId = req.authUser.id;
      const yearMonth = req.query.yearMonth ? String(req.query.yearMonth).trim() : null;
      const employeeId = req.query.employeeId ? Number(req.query.employeeId) : null;
      const salaryType = req.query.salaryType ? String(req.query.salaryType).trim() : "all";
      const calculationStatus = req.query.calculationStatus ? String(req.query.calculationStatus).trim() : "all";
      const reviewStatus = req.query.reviewStatus ? String(req.query.reviewStatus).trim() : "all";
      const keyword = req.query.keyword ? String(req.query.keyword).trim().toLowerCase() : "";
      const page = Math.max(1, Number(req.query.page) || 1);
      const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 50));
      const usePagination = req.query.page !== undefined || req.query.pageSize !== undefined;

      // 1. 查询员工档案以便信息补全与搜索
      let empQuery = supabase
        .from("workspace_employees")
        .select("*")
        .eq("owner_user_id", ownerUserId);
      if (req.authUser.adminV4CountryCode && req.authUser.adminV4CountryCode !== "all") {
        empQuery = empQuery.eq("country", req.authUser.adminV4CountryCode);
      }
      const { data: employees } = await empQuery;
      const employeeMap = new Map((employees || []).map(e => [Number(e.id), e]));

      // 2. 查询月度薪资记录
      let payrollQuery = supabase
        .from("monthly_payroll_results")
        .select("*")
        .eq("owner_user_id", ownerUserId)
        .order("year_month", { ascending: false })
        .order("id", { ascending: true });

      if (yearMonth) payrollQuery = payrollQuery.eq("year_month", yearMonth);
      if (employeeId) payrollQuery = payrollQuery.eq("employee_id", employeeId);
      if (salaryType !== "all") payrollQuery = payrollQuery.eq("salary_type", salaryType);
      if (calculationStatus !== "all") payrollQuery = payrollQuery.eq("calculation_status", calculationStatus);
      if (reviewStatus !== "all") payrollQuery = payrollQuery.eq("review_status", reviewStatus);

      const { data: rows, error } = await payrollQuery;
      if (error) {
        console.warn("[admin-v4/payroll-results] query fallback:", error.message);
      }

      let list = (rows || []).map(r => mapPayrollRow(r, employeeMap.get(Number(r.employee_id))));

      // 3. 关键字过滤（姓名、工号）
      if (keyword) {
        list = list.filter(item =>
          item.employeeName.toLowerCase().includes(keyword) ||
          item.employeeNo.toLowerCase().includes(keyword)
        );
      }

      if (!usePagination) {
        return res.json({ success: true, data: list });
      }

      const total = list.length;
      const offset = (page - 1) * pageSize;
      const items = list.slice(offset, offset + pageSize);

      return res.json({
        success: true,
        data: {
          items,
          total,
          page,
          pageSize,
          hasMore: offset + items.length < total
        }
      });
    } catch (error) {
      console.error("[admin-v4/payroll-results] error:", error);
      res.status(500).json({ success: false, error: error.message || "加载薪资结果失败" });
    }
  });

  /**
   * GET /payroll-results/:id - 获取单条月度薪资明细
   */
  router.get("/payroll-results/:id", async (req, res) => {
    try {
      const ownerUserId = req.authUser.id;
      const resultId = Number(req.params.id);
      if (!resultId) {
        return res.status(400).json({ success: false, error: "无效的薪资记录ID" });
      }

      const { data: row, error } = await supabase
        .from("monthly_payroll_results")
        .select("*")
        .eq("owner_user_id", ownerUserId)
        .eq("id", resultId)
        .maybeSingle();

      if (error || !row) {
        return res.status(404).json({ success: false, error: "薪酬结果不存在" });
      }

      // 获取员工信息
      const { data: employee } = await supabase
        .from("workspace_employees")
        .select("*")
        .eq("owner_user_id", ownerUserId)
        .eq("id", Number(row.employee_id))
        .maybeSingle();

      const mapped = mapPayrollRow(row, employee);

      return res.json({
        success: true,
        data: {
          result: mapped,
          employee: employee || null,
          signOff: mapped.signed ? {
            signed: true,
            signedAt: mapped.signedAt,
            signatureValue: mapped.signatureValue
          } : null
        }
      });
    } catch (error) {
      console.error("[admin-v4/payroll-results/:id] error:", error);
      res.status(500).json({ success: false, error: error.message || "加载薪资详情失败" });
    }
  });

  /**
   * POST /payroll-results/generate-monthly - 批量按月生成薪资初稿
   */
  router.post("/payroll-results/generate-monthly", async (req, res) => {
    try {
      const ownerUserId = req.authUser.id;
      const yearMonth = String(req.body.yearMonth || "").trim();
      if (!/^\d{4}-\d{2}$/.test(yearMonth)) {
        return res.status(400).json({ success: false, error: "yearMonth 必须为 YYYY-MM 格式" });
      }

      // 1. 查询在职员工列表
      let empQuery = supabase
        .from("workspace_employees")
        .select("*")
        .eq("owner_user_id", ownerUserId)
        .eq("status", "active");

      if (req.authUser.adminV4CountryCode && req.authUser.adminV4CountryCode !== "all") {
        empQuery = empQuery.eq("country", req.authUser.adminV4CountryCode);
      }
      const { data: employees, error: empErr } = await empQuery;
      if (empErr) throw empErr;

      if (!employees || employees.length === 0) {
        return res.json({
          success: true,
          message: "未找到在职员工",
          data: { generatedCount: 0, yearMonth }
        });
      }

      // 2. 查询当月所有打卡记录
      const startDate = `${yearMonth}-01`;
      const endDate = `${yearMonth}-31`;
      const { data: attendances } = await supabase
        .from("workspace_attendance_records")
        .select("*")
        .eq("owner_user_id", ownerUserId)
        .gte("date", startDate)
        .lte("date", endDate);

      const attendanceByEmp = new Map();
      for (const rec of (attendances || [])) {
        const empId = Number(rec.emp_id || rec.employee_id);
        if (!attendanceByEmp.has(empId)) attendanceByEmp.set(empId, []);
        attendanceByEmp.get(empId).push(rec);
      }

      let generatedCount = 0;
      const now = new Date().toISOString();

      for (const emp of employees) {
        const empId = Number(emp.id);
        const empRecs = attendanceByEmp.get(empId) || [];

        // 统计当月工时与天数
        let totalValidHours = 0;
        let totalOtHours = 0;
        let workingDays = 0;

        const fixedSalary = Number(emp.fixed_salary || 0);
        const dailyWage = Number(emp.daily_wage || 0);
        const hourlyRate = Number(emp.hourly_rate || 0);
        const isFixedMonthly = emp.salary_type === "fixed" || fixedSalary > 0;
        const effectiveHourlyRate = hourlyRate > 0 ? hourlyRate : (dailyWage > 0 ? dailyWage / 8 : 0);

        let calculatedBasePay = 0;

        for (const r of empRecs) {
          const wHours = Number(r.work_hours || 0);
          const oHours = Number(r.ot_hours || 0);
          if (wHours > 0) {
            workingDays += 1;
            totalValidHours += wHours;
            if (!isFixedMonthly) {
              if (wHours >= 8) {
                // 满一日的8小时按日薪算 (无日薪则按 8 * effectiveHourlyRate)
                calculatedBasePay += dailyWage > 0 ? dailyWage : (8 * effectiveHourlyRate);
              } else {
                // 不满一日的就按时薪算，有输入时薪就使用输入的时薪，没有时薪就按日薪除以8分配
                calculatedBasePay += wHours * effectiveHourlyRate;
              }
            }
          }
          if (oHours > 0) {
            totalOtHours += oHours;
          }
        }

        const isHourly = !isFixedMonthly;
        const basePay = isFixedMonthly ? fixedSalary : roundToTwo(calculatedBasePay);
        const overtimePay = roundToTwo(totalOtHours * (emp.overtime_hourly_fee ? Number(emp.overtime_hourly_fee) : (effectiveHourlyRate * 1.5)));
        const mealAllowanceTotal = roundToTwo(workingDays * getNonNegativeAmount(emp.meal_allowance));
        const attendanceBonusAmount = workingDays >= 20 ? getNonNegativeAmount(emp.attendance_bonus) : 0;
        const socialSecurity = getNonNegativeAmount(emp.social_security);
        const grossPay = roundToTwo(basePay + overtimePay + mealAllowanceTotal + attendanceBonusAmount);

        // 个人所得税扣缴：按员工档案设定的税率 (百分比数值，默认 5 代表 5%) 计算
        const rawTaxRate = emp.tax_rate != null ? Number(emp.tax_rate) : 5;
        const taxRate = rawTaxRate > 1 ? rawTaxRate / 100 : (rawTaxRate < 0 ? 0.05 : (rawTaxRate === 0 ? 0 : (rawTaxRate <= 0.2 ? rawTaxRate : rawTaxRate / 100)));
        const taxableGross = basePay + overtimePay + attendanceBonusAmount;
        const taxDeduction = roundToTwo(taxableGross * taxRate);
        const totalDeduction = roundToTwo(socialSecurity + taxDeduction);
        const netPay = Math.max(0, roundToTwo(grossPay - totalDeduction));

        const payload = {
          owner_user_id: ownerUserId,
          employee_id: empId,
          year_month: yearMonth,
          salary_type: isFixedMonthly ? "fixed" : "hourly",
          fixed_salary: isFixedMonthly ? fixedSalary : null,
          hourly_rate: hourlyRate > 0 ? hourlyRate : (dailyWage > 0 ? Math.round((dailyWage / 8) * 100) / 100 : null),
          currency: (emp.currency || "THB").toUpperCase(),
          working_days: workingDays,
          effective_attendance_days: workingDays,
          valid_hours: totalValidHours,
          standard_hours: workingDays * 8,
          base_salary: basePay,
          hourly_pay: isHourly ? basePay : 0,
          overtime_pay_hours: totalOtHours,
          overtime_pay: overtimePay,
          meal_allowance: mealAllowanceTotal,
          meal_allowance_total: mealAllowanceTotal,
          attendance_bonus: attendanceBonusAmount,
          attendance_bonus_amount: attendanceBonusAmount,
          social_security_deduction: socialSecurity,
          social_security_amount: socialSecurity,
          tax_deduction: taxDeduction,
          allowance_total: mealAllowanceTotal + attendanceBonusAmount,
          deduction_total: totalDeduction,
          other_total: 0,
          gross_pay: grossPay,
          total_deduction: totalDeduction,
          net_pay: netPay,
          net_salary: netPay,
          calculation_status: "calculated",
          review_status: "pending",
          calculated_at: now,
          updated_at: now
        };

        // 查找或更新现有记录
        const { data: existing } = await supabase
          .from("monthly_payroll_results")
          .select("id, calculation_status")
          .eq("owner_user_id", ownerUserId)
          .eq("employee_id", empId)
          .eq("year_month", yearMonth)
          .maybeSingle();

        if (existing?.id) {
          // 如果未确认发放，则允许更新
          if (existing.calculation_status !== "confirmed") {
            await supabase
              .from("monthly_payroll_results")
              .update(payload)
              .eq("id", existing.id);
            generatedCount += 1;
          }
        } else {
          await supabase
            .from("monthly_payroll_results")
            .insert({ ...payload, created_at: now });
          generatedCount += 1;
        }
      }

      return res.json({
        success: true,
        message: `成功为 ${generatedCount} 名员工生成 ${yearMonth} 薪资核算初稿`,
        data: { generatedCount, yearMonth }
      });
    } catch (error) {
      console.error("[admin-v4/payroll-results/generate-monthly] error:", error);
      res.status(500).json({ success: false, error: error.message || "生成月度薪资失败" });
    }
  });

  /**
   * POST /payroll-results/recalculate-monthly - 批量重算当月薪资
   */
  router.post("/payroll-results/recalculate-monthly", async (req, res) => {
    // 逻辑与生成一致，重新读取最新的考勤并重算初稿
    return router.handle({ ...req, url: "/payroll-results/generate-monthly" }, res);
  });

  /**
   * PATCH /payroll-results/:id/approve - 管理员审核通过
   */
  router.patch("/payroll-results/:id/approve", async (req, res) => {
    try {
      const ownerUserId = req.authUser.id;
      const resultId = Number(req.params.id);
      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from("monthly_payroll_results")
        .update({
          review_status: "approved",
          updated_at: now
        })
        .eq("owner_user_id", ownerUserId)
        .eq("id", resultId)
        .select()
        .single();

      if (error) throw error;
      return res.json({ success: true, message: "薪酬核对已通过", data: mapPayrollRow(data) });
    } catch (error) {
      console.error("[admin-v4/payroll-results/:id/approve] error:", error);
      res.status(500).json({ success: false, error: error.message || "审批失败" });
    }
  });

  /**
   * PATCH /payroll-results/:id/reject - 管理员驳回
   */
  router.patch("/payroll-results/:id/reject", async (req, res) => {
    try {
      const ownerUserId = req.authUser.id;
      const resultId = Number(req.params.id);
      const { reason } = req.body || {};
      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from("monthly_payroll_results")
        .update({
          review_status: "rejected",
          blocked_reason: reason || "管理员审核驳回",
          updated_at: now
        })
        .eq("owner_user_id", ownerUserId)
        .eq("id", resultId)
        .select()
        .single();

      if (error) throw error;
      return res.json({ success: true, message: "薪酬核对已驳回", data: mapPayrollRow(data) });
    } catch (error) {
      console.error("[admin-v4/payroll-results/:id/reject] error:", error);
      res.status(500).json({ success: false, error: error.message || "驳回失败" });
    }
  });

  /**
   * PATCH /payroll-results/:id/confirm - 确认发放（核心：解锁移动端员工查看！）
   */
  router.patch("/payroll-results/:id/confirm", async (req, res) => {
    try {
      const ownerUserId = req.authUser.id;
      const resultId = Number(req.params.id);
      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from("monthly_payroll_results")
        .update({
          calculation_status: "confirmed",
          confirmed_at: now,
          updated_at: now
        })
        .eq("owner_user_id", ownerUserId)
        .eq("id", resultId)
        .select()
        .single();

      if (error) throw error;
      return res.json({
        success: true,
        message: "工资条已确认发放，移动端员工现已可查收与签名",
        data: mapPayrollRow(data)
      });
    } catch (error) {
      console.error("[admin-v4/payroll-results/:id/confirm] error:", error);
      res.status(500).json({ success: false, error: error.message || "确认发放失败" });
    }
  });

  return router;
}

export default createPayrollRouter;
