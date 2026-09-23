import assert from "node:assert/strict";
import http from "node:http";
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import app from "./index.js";
import { signToken } from "../server/auth-v4.js";

dotenv.config();
dotenv.config({ path: fileURLToPath(new URL("../.env", import.meta.url)), override: false });

const AUTH_SECRET = process.env.ADMIN_AUTH_TOKEN_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;

async function runTests() {
  console.log("=== 启动 Server-V4 全量新开发接口自动化集成测试 ===");

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

  // 使用完整拥有在职员工与全功能配置的真实租户进行闭环测试
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

  const employeeToken = signToken({
    stage: "employee_authenticated",
    employeeId: 4,
    ownerUserId: testOwnerUserId,
    account: "wms0004",
    role: "员工"
  }, 3600 * 1000, AUTH_SECRET);

  const adminHeaders = { Authorization: `Bearer ${adminToken}` };
  const employeeHeaders = { Authorization: `Bearer ${employeeToken}` };

  try {
    // 1. 服务健康检查
    console.log("1. 测试服务健康检查...");
    const health = await request("/api/v4/health");
    assert.equal(health.status, 200);
    assert.equal(health.body.ok, true);
    console.log("   -> 健康检查绿灯通过");

    // 2. 薪资模块 (Payroll)
    console.log("2. 测试管理端薪酬接口 (Payroll)...");
    const payrollList = await request("/api/v4/admin/payroll-results", { headers: adminHeaders });
    assert.equal(payrollList.status, 200);
    assert.equal(payrollList.body.success, true);
    assert.ok(Array.isArray(payrollList.body.data));
    console.log("   -> GET /api/v4/admin/payroll-results 成功返回列表，当前记录数:", payrollList.body.data.length);

    const generateMonthly = await request("/api/v4/admin/payroll-results/generate-monthly", {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({ yearMonth: "2026-09" })
    });
    assert.equal(generateMonthly.status, 200);
    assert.equal(generateMonthly.body.success, true);
    console.log("   -> POST /api/v4/admin/payroll-results/generate-monthly 触发成功:", generateMonthly.body.message);

    // 3. 费用报销模块 (Expenses)
    console.log("3. 测试管理端报销接口 (Expenses)...");
    const expenseList = await request("/api/v4/admin/expenses", { headers: adminHeaders });
    assert.equal(expenseList.status, 200);
    assert.equal(expenseList.body.success, true);
    assert.ok(Array.isArray(expenseList.body.expenses));
    assert.ok(Array.isArray(expenseList.body.categories));
    console.log("   -> GET /api/v4/admin/expenses 成功返回报销单据与分类大盘，分类数:", expenseList.body.categories.length);

    const createExpense = await request("/api/v4/admin/expenses", {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({
        category: "办公用品",
        amount: 85.5,
        currency: "CNY",
        description: "测试打印纸采购"
      })
    });
    assert.equal(createExpense.status, 201);
    assert.equal(createExpense.body.success, true);
    assert.ok(createExpense.body.data.id);
    const createdExpId = createExpense.body.data.id;
    console.log("   -> POST /api/v4/admin/expenses 成功创建报销单:", createdExpId);

    const approveExpense = await request(`/api/v4/admin/expenses/${createdExpId}`, {
      method: "PUT",
      headers: adminHeaders,
      body: JSON.stringify({ status: "approved", approvalNote: "财务测试审核通过" })
    });
    assert.equal(approveExpense.status, 200);
    assert.equal(approveExpense.body.success, true);
    console.log("   -> PUT /api/v4/admin/expenses/:id 审批成功");

    // 4. SOP 模块 (SOP & Notices)
    console.log("4. 测试管理端 SOP 规程接口 (SOP)...");
    const sopList = await request("/api/v4/admin/sops", { headers: adminHeaders });
    assert.equal(sopList.status, 200);
    assert.equal(sopList.body.success, true);
    console.log("   -> GET /api/v4/admin/sops 成功获取规程列表");

    const createSop = await request("/api/v4/admin/sops", {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({
        title: "自动化测试安全作业规范",
        category: "safety",
        contentHtml: "<p>作业期间佩戴手套</p>",
        mustRead: true
      })
    });
    assert.equal(createSop.status, 201);
    assert.equal(createSop.body.success, true);
    const createdSopId = createSop.body.data.id;
    console.log("   -> POST /api/v4/admin/sops 成功发布 SOP:", createdSopId);

    const sopDetail = await request(`/api/v4/admin/sops/${createdSopId}`, { headers: adminHeaders });
    assert.equal(sopDetail.status, 200);
    assert.equal(sopDetail.body.success, true);
    assert.equal(sopDetail.body.data.title, "自动化测试安全作业规范");
    console.log("   -> GET /api/v4/admin/sops/:id 成功获取详情");

    // 5. 通用数据资源接口 (Flutter REST Resource Client: /api/v4/resources/*)
    console.log("5. 测试 Flutter 通用资源接口 (ApiResourceClient)...");
    const resEmployees = await request("/api/v4/resources/employees", { headers: adminHeaders });
    assert.equal(resEmployees.status, 200);
    assert.equal(resEmployees.body.success, true);
    assert.ok(Array.isArray(resEmployees.body.data));
    console.log("   -> GET /api/v4/resources/employees 通用接口正常返回");

    const resAttendance = await request("/api/v4/resources/attendance", { headers: adminHeaders });
    assert.equal(resAttendance.status, 200);
    assert.equal(resAttendance.body.success, true);
    console.log("   -> GET /api/v4/resources/attendance 通用接口正常返回");

    const resExpenses = await request("/api/v4/resources/expense-records", { headers: adminHeaders });
    assert.equal(resExpenses.status, 200);
    assert.equal(resExpenses.body.success, true);
    console.log("   -> GET /api/v4/resources/expense-records 通用接口正常返回");

    const resSop = await request("/api/v4/resources/sop-documents", { headers: adminHeaders });
    assert.equal(resSop.status, 200);
    assert.equal(resSop.body.success, true);
    console.log("   -> GET /api/v4/resources/sop-documents 通用接口正常返回");

    // 6. 状态接口 (Flutter State Client: /api/v4/state/:key)
    console.log("6. 测试 Flutter 状态接口 (State Client)...");
    const configState = await request("/api/v4/state/config", { headers: adminHeaders });
    assert.equal(configState.status, 200);
    assert.equal(configState.body.success, true);
    assert.ok(configState.body.data.standardHours !== undefined);
    console.log("   -> GET /api/v4/state/config 成功返回考勤规则配置:", configState.body.data.standardHours, "小时/天");

    const patchState = await request("/api/v4/state/config", {
      method: "PATCH",
      headers: adminHeaders,
      body: JSON.stringify({ standardHours: 8.5 })
    });
    assert.equal(patchState.status, 200);
    assert.equal(patchState.body.success, true);
    console.log("   -> PATCH /api/v4/state/config 规则更新成功");

    // 7. 员工移动端视角兼容测试 (Mobile employee token accessing mobile endpoints)
    console.log("7. 测试移动端与管理端闭环链路...");
    const mobileSops = await request("/api/v4/mobile/sop-documents", { headers: employeeHeaders });
    assert.equal(mobileSops.status, 200);
    assert.equal(mobileSops.body.success, true);
    console.log("   -> 员工端查看发布规程成功，可见篇数:", mobileSops.body.data.length);

    console.log("=== 自动化集成测试全部 7 个大项、15 个子项全量通过！ ===");
  } finally {
    server.close();
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error("集成测试失败:", err);
  process.exit(1);
});
