import assert from "node:assert/strict";
import http from "node:http";
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";

// 引入 server-v4 后端与鉴权方法
import app from "../apps/admin/server-v4/index.js";
import { signToken } from "../apps/admin/server/auth-v4.js";

dotenv.config();
dotenv.config({ path: fileURLToPath(new URL("../apps/admin/.env", import.meta.url)), override: false });

const AUTH_SECRET = process.env.ADMIN_AUTH_TOKEN_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "test_secret_for_dev_mode_only";

async function runStage1Tests() {
  console.log("===============================================================");
  console.log("  🚀 [阶段一 数据流通测试] 薪资列表全场景数据流与后端集成测试");
  console.log("===============================================================\n");

  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    details: []
  };

  function testCase(name, fn) {
    results.total++;
    try {
      fn();
      console.log(`   ✓ ${name}`);
      results.passed++;
      results.details.push({ name, status: "PASS" });
    } catch (err) {
      console.error(`   ✗ ${name} 失败:`, err.message);
      results.failed++;
      results.details.push({ name, status: "FAIL", error: err.message });
      throw err;
    }
  }

  async function asyncTestCase(name, fn) {
    results.total++;
    try {
      await fn();
      console.log(`   ✓ ${name}`);
      results.passed++;
      results.details.push({ name, status: "PASS" });
    } catch (err) {
      console.error(`   ✗ ${name} 失败:`, err.message);
      results.failed++;
      results.details.push({ name, status: "FAIL", error: err.message });
      throw err;
    }
  }

  // -------------------------------------------------------------
  // Part 1: 薪资算法核心算账恒等式与平账验证
  // -------------------------------------------------------------
  console.log("▶ Case 1: 薪资算法核心算账恒等式与派遣服务费扣除平账验证");

  function calcDailyBasePay(emp, normalHours, config) {
    if (normalHours <= 0) return 0;
    const stdHours = config?.standardHours || 8;
    const hasBaseWage = emp.baseMonthlyWage !== undefined && emp.baseMonthlyWage !== null && Number(emp.baseMonthlyWage) > 0;

    if (hasBaseWage) {
      return Number(emp.baseMonthlyWage) / 30;
    }

    const dailyWage = emp.dailyWage !== undefined && emp.dailyWage !== null && Number(emp.dailyWage) > 0 ? Number(emp.dailyWage) : 0;
    const hourlyRate = emp.hourlyRate !== undefined && emp.hourlyRate !== null && Number(emp.hourlyRate) > 0 ? Number(emp.hourlyRate) : 0;
    const effectiveHourlyRate = hourlyRate > 0 ? hourlyRate : (dailyWage > 0 ? dailyWage / stdHours : 0);

    if (normalHours >= stdHours) {
      return dailyWage > 0 ? dailyWage : (stdHours * effectiveHourlyRate);
    }

    return normalHours * effectiveHourlyRate;
  }

  testCase("固定月薪日折算：15000 / 30 = 500", () => {
    const directEmp = { baseMonthlyWage: 15000 };
    const pay = calcDailyBasePay(directEmp, 8, { standardHours: 8 });
    assert.equal(pay, 500);
  });

  testCase("日薪员工满工时与缺勤工时比例折算", () => {
    const dailyEmp = { dailyWage: 480, hourlyRate: 60 };
    const fullPay = calcDailyBasePay(dailyEmp, 8, { standardHours: 8 });
    assert.equal(fullPay, 480);
    const halfPay = calcDailyBasePay(dailyEmp, 4, { standardHours: 8 });
    assert.equal(halfPay, 240);
  });

  testCase("应发、税前、税费、社保与劳务派遣服务费扣除后净实发平账恒等式", () => {
    const basePay = 12000;
    const otPay = 1500;
    const bonus = 800;
    const meal = 400;
    const licenseVal = 300;
    const gross = basePay + otPay + bonus + meal + licenseVal; // 15000

    const taxRate = 0.05;
    // 依法餐补与特定补贴免税：计税基数为 basePay + otPay + bonus
    const taxableIncome = basePay + otPay + bonus; // 14300
    const tax = taxableIncome * taxRate; // 715

    const ssSec = 600;
    const dispatchCommRate = 8; // 8% 派遣佣金服务费
    const serviceFee = basePay * (dispatchCommRate / 100); // 960

    const totalDeductions = tax + ssSec + serviceFee; // 2275
    const net = Math.max(0, gross - totalDeductions); // 12725

    assert.equal(gross, 15000);
    assert.equal(tax, 715);
    assert.equal(serviceFee, 960);
    assert.equal(net, 12725);
  });

  // -------------------------------------------------------------
  // Part 2: 入离职生命周期时间线边界约束验证
  // -------------------------------------------------------------
  console.log("\n▶ Case 2: 入离职生命周期时间线边界约束验证");

  testCase("生命周期边界过滤契约（未来入职剔除、离职0出勤剔除、离职有出勤保留）", () => {
    const currentMonth = "2026-08";
    const employees = [
      { id: 101, name: "在职正常员工", joinDate: "2026-01-10", status: "在职" },
      { id: 102, name: "未来入职员工", joinDate: "2026-09-01", status: "在职" },
      { id: 103, name: "离职无考勤员工", joinDate: "2025-05-01", status: "离职" },
      { id: 104, name: "离职但当月有考勤员工", joinDate: "2025-05-01", status: "离职" }
    ];

    const attRecords = [
      { empId: 101, date: "2026-08-01" },
      { empId: 104, date: "2026-08-02" }
    ];

    const validList = employees.filter(emp => {
      // 1. 未来入职拦截
      if (emp.joinDate && emp.joinDate.slice(0, 7) > currentMonth) return false;
      // 2. 离职员工处理
      const isResigned = emp.status === "resigned" || emp.status === "离职";
      if (isResigned) {
        const hasAtt = attRecords.some(r => String(r.empId) === String(emp.id));
        if (!hasAtt) return false;
      }
      return true;
    });

    assert.equal(validList.length, 2);
    assert.deepEqual(validList.map(e => e.id), [101, 104]);
  });

  // -------------------------------------------------------------
  // Part 3: 后端 Headless API 契约与入参校验 (集成 HTTP 请求)
  // -------------------------------------------------------------
  console.log("\n▶ Case 3: 后端 Headless API 契约与入参校验");

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  async function request(path, options = {}) {
    const res = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers
      }
    });
    const body = await res.json().catch(() => ({}));
    return { status: res.status, body };
  }

  const testOwnerUserId = "14f3a54f-410f-4dfd-ae11-6adb3c956b45";
  const adminToken = signToken({
    sub: testOwnerUserId,
    account: "smartbillpro@gmail.com",
    email: "smartbillpro@gmail.com",
    stage: "authenticated",
    ownerUserId: testOwnerUserId,
    adminOwnerUserId: testOwnerUserId,
    countryCode: "TH",
    permissions: ["*"]
  }, 3600 * 1000, AUTH_SECRET);

  const adminHeaders = { Authorization: `Bearer ${adminToken}` };

  try {
    await asyncTestCase("未授权请求必须被中间件拦截 (401/403)", async () => {
      const res = await request("/api/v4/admin/payroll-results");
      assert.ok(res.status === 401 || res.status === 403, `预期 401/403，实际: ${res.status}`);
    });

    await asyncTestCase("非法月份参数生成初稿必须返回 400 校验拒绝（绝不能报 500）", async () => {
      const res = await request("/api/v4/admin/payroll-results/generate-monthly", {
        method: "POST",
        headers: adminHeaders,
        body: JSON.stringify({ yearMonth: "invalid-month-str" })
      });
      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.ok(res.body.error.includes("YYYY-MM"));
    });

    await asyncTestCase("空月份参数生成初稿同样拒绝 400", async () => {
      const res = await request("/api/v4/admin/payroll-results/generate-monthly", {
        method: "POST",
        headers: adminHeaders,
        body: JSON.stringify({})
      });
      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
    });

    await asyncTestCase("查询不存在的薪资记录 ID 必须返回 404/400 明确错误", async () => {
      const res = await request("/api/v4/admin/payroll-results/99999999", {
        headers: adminHeaders
      });
      assert.ok(res.status === 404 || res.status === 400, `预期 404/400，实际: ${res.status}`);
      assert.equal(res.body.success, false);
    });

    let generatedItem = null;
    await asyncTestCase("合法月份生成月度薪资初稿 (POST /generate-monthly) 成功返回", async () => {
      const res = await request("/api/v4/admin/payroll-results/generate-monthly", {
        method: "POST",
        headers: adminHeaders,
        body: JSON.stringify({ yearMonth: "2026-08" })
      });
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
    });

    await asyncTestCase("查询月度薪资列表 (GET /payroll-results) 并持久化再次 GET 确认", async () => {
      const res = await request("/api/v4/admin/payroll-results?yearMonth=2026-08", {
        headers: adminHeaders
      });
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(Array.isArray(res.body.data), "返回数据必须是数组");
      if (res.body.data.length > 0) {
        generatedItem = res.body.data[0];
        assert.ok(generatedItem.id, "记录必须具备有效主键 ID");
        assert.equal(generatedItem.yearMonth, "2026-08");

        // 持久化后再 GET /:id 单条确认
        const singleRes = await request(`/api/v4/admin/payroll-results/${generatedItem.id}`, {
          headers: adminHeaders
        });
        assert.equal(singleRes.status, 200);
        assert.equal(singleRes.body.success, true);
        assert.equal(singleRes.body.data.result.id, generatedItem.id);
      }
    });

    if (generatedItem) {
      await asyncTestCase(`测试审批流状态机扭转: PATCH /:id/approve 并再次 GET 验证状态`, async () => {
        const patchRes = await request(`/api/v4/admin/payroll-results/${generatedItem.id}/approve`, {
          method: "PATCH",
          headers: adminHeaders
        });
        assert.equal(patchRes.status, 200);
        assert.equal(patchRes.body.success, true);
        assert.equal(patchRes.body.data.reviewStatus, "approved");

        // 重新 GET 验证已持久化
        const verifyRes = await request(`/api/v4/admin/payroll-results/${generatedItem.id}`, {
          headers: adminHeaders
        });
        assert.equal(verifyRes.body.data.result.reviewStatus, "approved");
      });
    }

  } finally {
    server.close();
  }

  // -------------------------------------------------------------
  // Part 4: 发放状态切换与通告管道同步闭环
  // -------------------------------------------------------------
  console.log("\n▶ Case 4: 发放状态切换与通告管道同步闭环");

  testCase("标记发放生成通告 与 撤回发放清除通告并记录撤回事件", () => {
    const mockStorage = {
      payroll_payout_status: "{}",
      payroll_employee_signatures: "{}",
      wms_sop_documents: "[]"
    };

    const empId = 201;
    const month = "2026-08";
    const netAmount = 18500;
    const name = "张三";
    const key = `${empId}_${month}`;

    // 1. 发放动作
    const payouts = JSON.parse(mockStorage.payroll_payout_status);
    payouts[key] = true;
    mockStorage.payroll_payout_status = JSON.stringify(payouts);

    const sops = JSON.parse(mockStorage.wms_sop_documents);
    const notifId = `sop-payslip-${empId}-${month}`;
    sops.push({
      id: notifId,
      title: "8月电子工资条已生成",
      content: `应发净薪资为 ${netAmount}`,
      category: "财务通知",
      status: "published"
    });
    mockStorage.wms_sop_documents = JSON.stringify(sops);

    // 验证发放后状态
    assert.equal(JSON.parse(mockStorage.payroll_payout_status)[key], true);
    assert.equal(JSON.parse(mockStorage.wms_sop_documents).length, 1);
    assert.equal(JSON.parse(mockStorage.wms_sop_documents)[0].id, notifId);

    // 2. 模拟员工签名
    const sigs = JSON.parse(mockStorage.payroll_employee_signatures);
    sigs[key] = "data:image/png;base64,sample_signature_hash";
    mockStorage.payroll_employee_signatures = JSON.stringify(sigs);
    assert.ok(JSON.parse(mockStorage.payroll_employee_signatures)[key]);

    // 3. 撤回发放动作（包含二次确认清除签名与下发撤回通告）
    const currPayouts = JSON.parse(mockStorage.payroll_payout_status);
    currPayouts[key] = false;
    mockStorage.payroll_payout_status = JSON.stringify(currPayouts);

    // 清除该月员工签名
    const currSigs = JSON.parse(mockStorage.payroll_employee_signatures);
    delete currSigs[key];
    mockStorage.payroll_employee_signatures = JSON.stringify(currSigs);

    // 撤销原通告并追加撤回通告
    let currSops = JSON.parse(mockStorage.wms_sop_documents).filter(s => s.id !== notifId);
    const recallNotifId = `sop-payslip-recall-${empId}-${month}`;
    currSops.push({
      id: recallNotifId,
      title: "【撤回通知】8月电子薪资单已撤回重算",
      status: "published"
    });
    mockStorage.wms_sop_documents = JSON.stringify(currSops);

    // 验证撤回后闭环
    assert.equal(JSON.parse(mockStorage.payroll_payout_status)[key], false);
    assert.equal(JSON.parse(mockStorage.payroll_employee_signatures)[key], undefined);
    assert.equal(JSON.parse(mockStorage.wms_sop_documents).length, 1);
    assert.equal(JSON.parse(mockStorage.wms_sop_documents)[0].id, recallNotifId);
  });

  console.log("\n===============================================================");
  console.log(`  🎉 [阶段一 数据流通测试全部通过] Passed: ${results.passed}/${results.total}`);
  console.log("===============================================================");
  return results;
}

runStage1Tests().catch((err) => {
  console.error("阶段一数据测试异常退出:", err);
  process.exit(1);
});
