import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { signToken } from "./apps/admin/server/auth-v4.js";

// 解析 apps/admin/.env
const envPath = path.resolve("./apps/admin/.env");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const match = line.trim().match(/^([^=]+)=(.*)$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].trim();
    }
  }
}

const AUTH_SECRET = process.env.ADMIN_AUTH_TOKEN_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "wmshr-super-secret-key-production-2026";
const BASE_URL = "http://127.0.0.1:8789";

console.log("==================================================================");
console.log("🚀 [Stage 1] 报销列表接口数据流通与状态机矩阵测试 (Headless API)");
console.log("==================================================================");

// 核心管理账号 admin@wmshr.com 对应的租户与凭证
const testOwnerUserId = "60af4e3c-2890-42f0-89f6-e0bcae3e43e0";
const testAccountId = "867b9218-a231-4b8c-ae2b-23f922e5ee6f";
const adminToken = signToken({
  sub: testAccountId,
  userId: testAccountId,
  accountId: testAccountId,
  account: "admin@wmshr.com",
  email: "admin@wmshr.com",
  stage: "authenticated",
  ownerUserId: testOwnerUserId,
  adminOwnerUserId: testOwnerUserId,
  countryCode: "TH",
  permissions: ["*"]
}, 3600 * 1000, AUTH_SECRET);

const adminHeaders = {
  "Content-Type": "application/json",
  "Authorization": `Bearer ${adminToken}`
};

async function apiRequest(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      ...adminHeaders,
      ...options.headers
    }
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.statusCode || res.status, body };
}

async function runStage1Tests() {
  const reportLog = [];
  const recordLog = (item) => {
    reportLog.push(item);
    console.log(item);
  };

  // 0. 健康检查
  recordLog("0. 执行服务健康检查 (GET /api/v4/health)...");
  const healthRes = await apiRequest("/api/v4/health");
  assert.equal(healthRes.status, 200, "API 健康检查未通过");
  assert.equal(healthRes.body.ok, true, "健康检查返回 ok 必须为 true");
  recordLog("   -> 🟢 健康检查通过，服务就绪");

  const timestamp = Date.now();
  let createdExpenseId1 = null;
  let createdExpenseId2 = null;

  try {
    // -------------------------------------------------------------
    // TC-DATA-01: 单据创建 (全字段与 Base64 凭证持久化)
    // -------------------------------------------------------------
    recordLog("\n[TC-DATA-01] 测试报销单全字段创建与规范化持久化 (POST /api/v4/admin/expenses)...");
    const payload1 = {
      description: `E2E测试-仓储包装耗材采办-${timestamp}`,
      category: "办公用品",
      amount: 680.50,
      currency: "CNY",
      date: new Date().toISOString().slice(0, 10),
      payerName: "Somchai (测试专员)",
      employeeId: 4,
      note: "用于五号仓打包耗材紧急补充，附带增值税专用发票",
      attachments: [
        "https://cdn.wmshr.com/receipts/202606-inv-01.png",
        "https://cdn.wmshr.com/receipts/202606-inv-02.png"
      ]
    };

    const createRes1 = await apiRequest("/api/v4/admin/expenses", {
      method: "POST",
      body: JSON.stringify(payload1)
    });

    assert.equal(createRes1.status, 201, `创建报销单失败: ${JSON.stringify(createRes1.body)}`);
    assert.equal(createRes1.body.success, true);
    assert.ok(createRes1.body.data?.id, "创建响应中必须包含单据 ID");
    createdExpenseId1 = createRes1.body.data.id;
    recordLog(`   -> 🟢 成功创建报销单 1, ID: ${createdExpenseId1}`);

    // 持久化后再 GET 一次确认对称性
    const verifyGet1 = await apiRequest("/api/v4/admin/expenses");
    assert.equal(verifyGet1.status, 200);
    assert.equal(verifyGet1.body.success, true);
    const found1 = verifyGet1.body.expenses.find(x => x.id === createdExpenseId1);
    assert.ok(found1, "持久化确认失败：在 GET /expenses 列表中未找到刚刚创建的单据");
    assert.equal(found1.amount, 680.50, "金额精度断言失败");
    assert.equal(found1.currency, "CNY", "币种断言失败");
    assert.equal(found1.category, "办公用品", "类别断言失败");
    assert.equal(found1.status, "approved", "管理员代录单据默认状态断言");
    assert.equal(found1.receiptUrls?.length, 2, "附件凭证数组长度断言失败");
    recordLog("   -> 🟢 持久化对称性校验 100% 吻合 (TC-DATA-01 PASS)");

    // -------------------------------------------------------------
    // TC-DATA-02: 多维条件检索与过滤校验
    // -------------------------------------------------------------
    recordLog("\n[TC-DATA-02] 测试多维条件检索与过滤 (GET /api/v4/admin/expenses?keyword=...&category=...)...");
    
    // 2.1 关键词检索
    const kwRes = await apiRequest(`/api/v4/admin/expenses?keyword=${encodeURIComponent(`采办-${timestamp}`)}`);
    assert.equal(kwRes.status, 200);
    assert.ok(kwRes.body.expenses.some(x => x.id === createdExpenseId1), "关键词搜索未能命中刚创建的单据");
    recordLog("   -> 🟢 关键词模糊搜索准确命中");

    // 2.2 类别筛选
    const catRes = await apiRequest(`/api/v4/admin/expenses?category=${encodeURIComponent("办公用品")}`);
    assert.equal(catRes.status, 200);
    assert.ok(catRes.body.expenses.every(x => x.category === "办公用品" || x.type === "办公用品"), "类别过滤返回了非目标类别单据");
    recordLog("   -> 🟢 类别精准过滤校验通过 (TC-DATA-02 PASS)");

    // -------------------------------------------------------------
    // TC-DATA-03: 审批状态机流转 (PUT /api/v4/admin/expenses/:id)
    // -------------------------------------------------------------
    recordLog("\n[TC-DATA-03] 测试审批状态机流转与批注持久化 (PUT /api/v4/admin/expenses/:id)...");
    const approvePayload = {
      status: "paid",
      approvalNote: "财务出纳已完成网银转账对公支付，流水号 #TX889021",
      note: "单据已归档入账"
    };

    const approveRes = await apiRequest(`/api/v4/admin/expenses/${createdExpenseId1}`, {
      method: "PUT",
      body: JSON.stringify(approvePayload)
    });
    assert.equal(approveRes.status, 200, `审批操作失败: ${JSON.stringify(approveRes.body)}`);
    assert.equal(approveRes.body.success, true);
    recordLog("   -> 🟢 单据流转为已打款 (paid) 响应成功");

    // 再次 GET 验证审批状态与批注
    const verifyGetApprove = await apiRequest("/api/v4/admin/expenses");
    const approvedItem = verifyGetApprove.body.expenses.find(x => x.id === createdExpenseId1);
    assert.ok(approvedItem, "审批后无法找到单据");
    assert.equal(approvedItem.status, "paid", "状态未正确持久化为 paid");
    assert.equal(approvedItem.approvalNote, approvePayload.approvalNote, "审批批注未正确持久化");
    assert.ok(approvedItem.approvedTime, "审批时间戳未记录");
    recordLog("   -> 🟢 审批人、批注与时间戳持久化断言通过 (TC-DATA-03 PASS)");

    // -------------------------------------------------------------
    // TC-DATA-04: 驳回分支与待审批单据流转
    // -------------------------------------------------------------
    recordLog("\n[TC-DATA-04] 测试待审批单据创建与驳回分支 (rejected)...");
    const payload2 = {
      description: `E2E测试-差旅餐饮超标单-${timestamp}`,
      category: "餐饮招待",
      amount: 1980.00,
      currency: "CNY",
      status: "pending",
      payerName: "Wang (业务部)",
      employeeId: 4,
      note: "客户宴请招待费用"
    };

    const createRes2 = await apiRequest("/api/v4/admin/expenses", {
      method: "POST",
      body: JSON.stringify(payload2)
    });
    assert.equal(createRes2.status, 201);
    createdExpenseId2 = createRes2.body.data.id;
    recordLog(`   -> 🟢 创建第二张待审批单据 2, ID: ${createdExpenseId2}`);

    // 执行驳回操作
    const rejectRes = await apiRequest(`/api/v4/admin/expenses/${createdExpenseId2}`, {
      method: "PUT",
      body: JSON.stringify({
        status: "rejected",
        approvalNote: "超出单人餐标限额，请重新拆单或附上总经理特别审批单"
      })
    });
    assert.equal(rejectRes.status, 200);

    // 持久化校验
    const verifyGetReject = await apiRequest("/api/v4/admin/expenses");
    const rejectedItem = verifyGetReject.body.expenses.find(x => x.id === createdExpenseId2);
    assert.equal(rejectedItem.status, "rejected", "驳回状态未正确持久化");
    assert.ok(rejectedItem.approvalNote.includes("超出单人餐标限额"), "驳回原因批注断言失败");
    recordLog("   -> 🟢 驳回分支与审批意见持久化校验通过 (TC-DATA-04 PASS)");

    // -------------------------------------------------------------
    // TC-DATA-05: 物理删除与脏数据清理 (Teardown)
    // -------------------------------------------------------------
    recordLog("\n[TC-DATA-05] 执行单据删除与测试脏数据物理清理 (DELETE /api/v4/admin/expenses/:id)...");
    
    // 删除单据 1
    const delRes1 = await apiRequest(`/api/v4/admin/expenses/${createdExpenseId1}`, {
      method: "DELETE"
    });
    assert.equal(delRes1.status, 200);

    // 删除单据 2
    const delRes2 = await apiRequest(`/api/v4/admin/expenses/${createdExpenseId2}`, {
      method: "DELETE"
    });
    assert.equal(delRes2.status, 200);

    // 重新拉取列表确认已彻底清除
    const finalGet = await apiRequest("/api/v4/admin/expenses");
    const exist1 = finalGet.body.expenses.some(x => x.id === createdExpenseId1);
    const exist2 = finalGet.body.expenses.some(x => x.id === createdExpenseId2);
    assert.equal(exist1, false, "清理失败：单据 1 仍存在于快照中");
    assert.equal(exist2, false, "清理失败：单据 2 仍存在于快照中");
    recordLog("   -> 🟢 两个测试单据均已彻底删除，快照恢复原状，零脏数据残留 (TC-DATA-05 PASS)");

    recordLog("\n==================================================================");
    recordLog("🎉 【阶段一：数据流通测试全部 PASS】所有断言 100% 命中且无瑕疵！");
    recordLog("==================================================================");

  } catch (err) {
    recordLog(`\n❌ 测试执行失败: ${err.message}`);
    // 尝试清理
    if (createdExpenseId1) {
      await apiRequest(`/api/v4/admin/expenses/${createdExpenseId1}`, { method: "DELETE" }).catch(() => {});
    }
    if (createdExpenseId2) {
      await apiRequest(`/api/v4/admin/expenses/${createdExpenseId2}`, { method: "DELETE" }).catch(() => {});
    }
    process.exit(1);
  }
}

runStage1Tests();
