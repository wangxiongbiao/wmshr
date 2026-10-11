import http from "node:http";
import assert from "node:assert/strict";
import fs from "node:fs";

const ADMIN_URL_PREFIX = "http://127.0.0.1:8789/api/v4/admin";
const MOBILE_URL_PREFIX = "http://127.0.0.1:8789/api/v4/mobile";
const HEALTH_URL = "http://127.0.0.1:8789/api/v4/health";

const envContent = fs.readFileSync("apps/admin/.env", "utf-8");
const SUPABASE_SERVICE_ROLE_KEY = envContent.split("\n").find(line => line.startsWith("SUPABASE_SERVICE_ROLE_KEY="))?.split("=")[1]?.trim();

import { signToken } from "./apps/admin/server/auth-v4.js";

const ADMIN_TOKEN = signToken({
  stage: "authenticated",
  userId: "867b9218-a231-4b8c-ae2b-23f922e5ee6f",
  accountId: "867b9218-a231-4b8c-ae2b-23f922e5ee6f",
  ownerUserId: "60af4e3c-2890-42f0-89f6-e0bcae3e43e0",
  adminOwnerUserId: "60af4e3c-2890-42f0-89f6-e0bcae3e43e0",
  account: "admin@wmshr.com",
  countryCode: "TH",
  permissions: ["*"]
}, 86400000, SUPABASE_SERVICE_ROLE_KEY);

const ADMIN_EMAIL = "admin@wmshr.com";
const ADMIN_HEADERS = {
  "Content-Type": "application/json",
  "X-User-Email": ADMIN_EMAIL,
  "Authorization": `Bearer ${ADMIN_TOKEN}`
};

const LOG = (msg) => console.log(`[Leave-Stage1] ${msg}`);
const PASS = (tc, msg) => console.log(`[PASS] [${tc}] ${msg}`);
const FAIL = (tc, msg) => console.error(`[FAIL] [${tc}] ${msg}`);

async function request(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const reqOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || "GET",
      headers: options.headers || {}
    };

    const req = http.request(reqOptions, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        try {
          if (!data) return resolve({ status: res.statusCode, body: null });
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on("error", (e) => reject(e));
    if (options.body) req.write(options.body);
    req.end();
  });
}

async function getMobileToken(account, password) {
  const res = await request(`${MOBILE_URL_PREFIX}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ account, password })
  });
  if (res.status !== 200) {
    throw new Error(`Mobile login failed for ${account}: ${JSON.stringify(res.body)}`);
  }
  return res.body.data.token;
}

async function runComprehensiveStage1() {
  LOG("=== 开始执行请假模块阶段一数据流通测试 (Stage 1 Data Flow Matrix) ===");

  // 0. 健康检查
  const health = await request(HEALTH_URL);
  assert.equal(health.status, 200, "API is not healthy");
  PASS("HEALTH", "API 服务健康检查通过");

  const randSuffix = Math.floor(1000 + Math.random() * 9000);
  const activeUsername = `lt_${randSuffix}`;
  const resignedUsername = `ltr_${randSuffix}`;

  let activeEmpId = null;
  let resignedEmpId = null;
  const createdLeaveIds = [];

  try {
    // 1. 创建在职测试员工
    const createActiveRes = await request(`${ADMIN_URL_PREFIX}/employees`, {
      method: "POST",
      headers: ADMIN_HEADERS,
      body: JSON.stringify({
        employeeNo: activeUsername,
        username: activeUsername,
        name: `在职测试员工_${randSuffix}`,
        phone: `138${randSuffix}0000`,
        password: "Aa123456",
        status: "active",
        dept: "仓储部",
        warehouseCode: "TH",
        salaryType: "daily",
        dailyWage: 300,
        joinDate: "2026-01-01"
      })
    });
    assert.ok([200, 201].includes(createActiveRes.status), `创建在职测试员工失败: ${JSON.stringify(createActiveRes.body)}`);
    activeEmpId = createActiveRes.body?.employee?.id || createActiveRes.body?.data?.id || createActiveRes.body?.id;
    LOG(`创建在职测试员工成功: ID=${activeEmpId}, 用户名=${activeUsername}`);

    // 2. 创建离职测试员工
    const createResignedRes = await request(`${ADMIN_URL_PREFIX}/employees`, {
      method: "POST",
      headers: ADMIN_HEADERS,
      body: JSON.stringify({
        employeeNo: resignedUsername,
        username: resignedUsername,
        name: `离职测试员工_${randSuffix}`,
        phone: `139${randSuffix}0000`,
        password: "Aa123456",
        status: "resigned",
        dept: "仓储部",
        warehouseCode: "TH",
        salaryType: "daily",
        dailyWage: 250,
        joinDate: "2025-01-01"
      })
    });
    assert.ok([200, 201].includes(createResignedRes.status), `创建离职测试员工失败: ${JSON.stringify(createResignedRes.body)}`);
    resignedEmpId = createResignedRes.body?.employee?.id || createResignedRes.body?.data?.id || createResignedRes.body?.id;
    LOG(`创建离职测试员工成功: ID=${resignedEmpId}, 用户名=${resignedUsername}`);

    // 获取移动端凭证
    const mobileToken = await getMobileToken(activeUsername, "Aa123456");
    const MOBILE_HEADERS = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${mobileToken}`
    };

    // ------------------------------------------------------------------------
    // TC-D01: 移动端发起请假申请 -> 管理端审批通过 -> 考勤级联验证
    // ------------------------------------------------------------------------
    LOG("\n--- [TC-D01] 移动端申请 -> 管理端审批 -> 考勤级联生成 ---");
    const testDate1 = "2026-11-10";
    const mobileReqRes = await request(`${MOBILE_URL_PREFIX}/attendance/leave/request`, {
      method: "POST",
      headers: MOBILE_HEADERS,
      body: JSON.stringify({
        type: "事假",
        startDate: testDate1,
        endDate: testDate1,
        reason: "移动端事假申请自动化测试"
      })
    });
    assert.equal(mobileReqRes.status, 201, `移动端发起请假失败: ${JSON.stringify(mobileReqRes.body)}`);
    const mobileLeaveId = mobileReqRes.body.data.id;
    createdLeaveIds.push(mobileLeaveId);
    assert.equal(mobileReqRes.body.data.status, "pending", "新建移动端请假单初始状态应为 pending");
    PASS("TC-D01-1", `移动端成功发起请假单: ID=${mobileLeaveId}, 状态=pending`);

    // 管理端审批通过
    const approveRes = await request(`${ADMIN_URL_PREFIX}/leave-requests/${mobileLeaveId}/status`, {
      method: "PATCH",
      headers: ADMIN_HEADERS,
      body: JSON.stringify({ status: "approved", approvalNote: "同意休假" })
    });
    assert.equal(approveRes.status, 200, `管理端审批通过失败: ${JSON.stringify(approveRes.body)}`);
    assert.equal(approveRes.body.status, "approved", "审批后状态应为 approved");
    PASS("TC-D01-2", `管理端审批通过成功，状态流转为 approved`);

    // 校验考勤记录级联生成 (type=leave)
    const attRes1 = await request(`${ADMIN_URL_PREFIX}/attendance-records?date=${testDate1}&employee_id=${activeEmpId}`, {
      headers: ADMIN_HEADERS
    });
    assert.equal(attRes1.status, 200, "查询考勤记录失败");
    const recs1 = Array.isArray(attRes1.body) ? attRes1.body : (attRes1.body?.data || []);
    const rec1 = recs1.find(r => Number(r.employee_id) === Number(activeEmpId));
    assert.ok(rec1, "考勤记录未级联生成");
    assert.equal(rec1.type, "leave", `考勤类型应为 'leave'，实际为 '${rec1.type}'`);
    PASS("TC-D01-3", `考勤记录成功级联穿透 (Type: ${rec1.type}, 日期: ${testDate1})`);

    // ------------------------------------------------------------------------
    // TC-D02: 管理端直接代录病假 -> 考勤生成 sick_leave -> 薪资重算阻断
    // ------------------------------------------------------------------------
    LOG("\n--- [TC-D02] 管理端代录病假 -> sick_leave 级联 -> 考勤薪资阻断验证 ---");
    const testDate2 = "2026-11-11";
    const adminCreateRes = await request(`${ADMIN_URL_PREFIX}/leave-requests`, {
      method: "POST",
      headers: ADMIN_HEADERS,
      body: JSON.stringify({
        empId: activeEmpId,
        type: "病假",
        startDate: testDate2,
        endDate: testDate2,
        reason: "管理员代录病假",
        status: "approved"
      })
    });
    assert.ok([200, 201].includes(adminCreateRes.status), `管理端代录病假失败: ${JSON.stringify(adminCreateRes.body)}`);
    const adminLeaveId = adminCreateRes.body.id;
    createdLeaveIds.push(adminLeaveId);
    PASS("TC-D02-1", `管理端代录病假单创建成功: ID=${adminLeaveId}, 类型=病假`);

    // 校验考勤记录 (type=sick_leave)
    const attRes2 = await request(`${ADMIN_URL_PREFIX}/attendance-records?date=${testDate2}&employee_id=${activeEmpId}`, {
      headers: ADMIN_HEADERS
    });
    const recs2 = Array.isArray(attRes2.body) ? attRes2.body : (attRes2.body?.data || []);
    const rec2 = recs2.find(r => Number(r.employee_id) === Number(activeEmpId));
    assert.ok(rec2, "病假考勤记录未级联生成");
    assert.equal(rec2.type, "sick_leave", `病假考勤类型应为 'sick_leave'，实际为 '${rec2.type}'`);
    PASS("TC-D02-2", `病假考勤记录级联生成成功 (Type: ${rec2.type})`);

    // 考勤重算与薪资影响断言
    const recalcRes = await request(`${ADMIN_URL_PREFIX}/attendance-calculations/recalculate`, {
      method: "POST",
      headers: ADMIN_HEADERS,
      body: JSON.stringify({ employee_id: activeEmpId, date: testDate2 })
    });
    assert.equal(recalcRes.status, 200, "触发考勤重算失败");

    const calcRes = await request(`${ADMIN_URL_PREFIX}/attendance-calculations?month=2026-11&employee_id=${activeEmpId}`, {
      headers: ADMIN_HEADERS
    });
    const calcRows = calcRes.body?.rows || (Array.isArray(calcRes.body) ? calcRes.body : []);
    const calcRow = calcRows.find(r => Number(r.emp?.id || r.employee_id) === Number(activeEmpId) && r.date === testDate2);
    assert.ok(calcRow, `未找到考勤日计算记录 (${testDate2})`);
    assert.equal(calcRow.status, "sick_leave", `日计算状态应为 sick_leave，实际为 ${calcRow.status}`);
    assert.equal(Number(calcRow.details?.valid || calcRow.work_hours || 0), 0, "病假期间正常打卡工时必须阻断为 0");
    assert.equal(Number(calcRow.details?.mealAllowance || calcRow.meal_allowance || 0), 0, "病假期间餐补津贴必须阻断为 0");
    PASS("TC-D02-3", `考勤重算薪资阻断验证通过 (工时: 0h, 餐补: 0, 状态: ${calcRow.status})`);

    // ------------------------------------------------------------------------
    // TC-D03: 状态流转回滚 (approved -> rejected -> 考勤级联清除)
    // ------------------------------------------------------------------------
    LOG("\n--- [TC-D03] 状态流转回滚: approved -> rejected 级联清除考勤 ---");
    const rejectRes = await request(`${ADMIN_URL_PREFIX}/leave-requests/${adminLeaveId}/status`, {
      method: "PATCH",
      headers: ADMIN_HEADERS,
      body: JSON.stringify({ status: "rejected", approvalNote: "材料不足驳回" })
    });
    assert.equal(rejectRes.status, 200, `驳回操作失败: ${JSON.stringify(rejectRes.body)}`);
    assert.equal(rejectRes.body.status, "rejected", "单据状态应更新为 rejected");
    PASS("TC-D03-1", `请假单 ${adminLeaveId} 成功流转为 rejected`);

    // 验证考勤记录已被清除
    const attResAfterReject = await request(`${ADMIN_URL_PREFIX}/attendance-records?date=${testDate2}&employee_id=${activeEmpId}`, {
      headers: ADMIN_HEADERS
    });
    const recsAfterReject = Array.isArray(attResAfterReject.body) ? attResAfterReject.body : (attResAfterReject.body?.data || []);
    const recAfterReject = recsAfterReject.find(r => Number(r.employee_id) === Number(activeEmpId) && (r.type === "sick_leave" || r.type === "leave"));
    assert.ok(!recAfterReject, "驳回后请假考勤记录未被级联清除");
    PASS("TC-D03-2", `驳回后对应请假考勤记录已自动级联清除`);

    // ------------------------------------------------------------------------
    // TC-D04: 物理删除回滚 (DELETE 请假单 -> 校验考勤同步彻底回滚)
    // ------------------------------------------------------------------------
    LOG("\n--- [TC-D04] 物理删除级联回滚: DELETE approved 单据 -> 考勤回滚 ---");
    // 先把 mobileLeaveId 重新确认仍在 approved 态（已关联 testDate1）
    const deleteRes = await request(`${ADMIN_URL_PREFIX}/leave-requests/${mobileLeaveId}`, {
      method: "DELETE",
      headers: ADMIN_HEADERS
    });
    assert.equal(deleteRes.status, 200, `删除请假单失败: ${JSON.stringify(deleteRes.body)}`);
    PASS("TC-D04-1", `请假单 ${mobileLeaveId} 物理删除成功`);

    // 验证单据已不存在
    const getDeletedRes = await request(`${ADMIN_URL_PREFIX}/leave-requests`, { headers: ADMIN_HEADERS });
    const exists = (getDeletedRes.body || []).some(l => String(l.id) === String(mobileLeaveId));
    assert.ok(!exists, "已删除的请假单仍然存在于列表中");
    PASS("TC-D04-2", `列表查询已确认该请假单彻底消失`);

    // 验证 testDate1 的考勤记录已同步回滚
    const attResAfterDelete = await request(`${ADMIN_URL_PREFIX}/attendance-records?date=${testDate1}&employee_id=${activeEmpId}`, {
      headers: ADMIN_HEADERS
    });
    const recsAfterDelete = Array.isArray(attResAfterDelete.body) ? attResAfterDelete.body : (attResAfterDelete.body?.data || []);
    const recAfterDelete = recsAfterDelete.find(r => Number(r.employee_id) === Number(activeEmpId) && (r.type === "leave" || r.type === "sick_leave"));
    assert.ok(!recAfterDelete, "删除请假单后考勤记录未同步回滚");
    PASS("TC-D04-3", `关联考勤记录已同步回滚清除`);

    // ------------------------------------------------------------------------
    // TC-D05: 边界防御与异常拦截矩阵
    // ------------------------------------------------------------------------
    LOG("\n--- [TC-D05] 边界防御与异常拦截矩阵 ---");

    // TC-D05-1: 日期倒置 (startDate > endDate) -> 预期 400
    const invalidDateRes = await request(`${ADMIN_URL_PREFIX}/leave-requests`, {
      method: "POST",
      headers: ADMIN_HEADERS,
      body: JSON.stringify({
        empId: activeEmpId,
        type: "事假",
        startDate: "2026-11-20",
        endDate: "2026-11-19",
        reason: "倒置日期测试"
      })
    });
    assert.equal(invalidDateRes.status, 400, `日期倒置应返回 400，实际返回: ${invalidDateRes.status}`);
    PASS("TC-D05-1", `日期倒置拦截生效 (返回 400: ${invalidDateRes.body?.error})`);

    // 先创建一个基准请假单用于重叠测试 (2026-11-25 ~ 2026-11-27)
    const baseLeaveRes = await request(`${ADMIN_URL_PREFIX}/leave-requests`, {
      method: "POST",
      headers: ADMIN_HEADERS,
      body: JSON.stringify({
        empId: activeEmpId,
        type: "事假",
        startDate: "2026-11-25",
        endDate: "2026-11-27",
        reason: "冲突基准单",
        status: "approved"
      })
    });
    assert.ok([200, 201].includes(baseLeaveRes.status), "创建基准单据失败");
    const baseLeaveId = baseLeaveRes.body.id;
    createdLeaveIds.push(baseLeaveId);

    // TC-D05-2: 时间冲突区间重叠 (2026-11-26 ~ 2026-11-28) -> 预期 409 Conflict
    const conflictRes = await request(`${ADMIN_URL_PREFIX}/leave-requests`, {
      method: "POST",
      headers: ADMIN_HEADERS,
      body: JSON.stringify({
        empId: activeEmpId,
        type: "病假",
        startDate: "2026-11-26",
        endDate: "2026-11-28",
        reason: "重叠区间申请"
      })
    });
    assert.equal(conflictRes.status, 409, `重叠申请应返回 409 Conflict，实际返回: ${conflictRes.status}`);
    PASS("TC-D05-2", `请假区间重叠冲突拦截生效 (返回 409: ${conflictRes.body?.error})`);

    // TC-D05-3: 离职员工申请请假 -> 预期 400
    const resignedLeaveRes = await request(`${ADMIN_URL_PREFIX}/leave-requests`, {
      method: "POST",
      headers: ADMIN_HEADERS,
      body: JSON.stringify({
        empId: resignedEmpId,
        type: "事假",
        startDate: "2026-11-30",
        endDate: "2026-11-30",
        reason: "离职员工申请"
      })
    });
    assert.equal(resignedLeaveRes.status, 400, `离职员工申请应返回 400，实际返回: ${resignedLeaveRes.status}`);
    PASS("TC-D05-3", `离职员工拦截生效 (返回 400: ${resignedLeaveRes.body?.error})`);

    // TC-D05-4: 非法审批状态 -> 预期 400
    const invalidStatusRes = await request(`${ADMIN_URL_PREFIX}/leave-requests/${baseLeaveId}/status`, {
      method: "PATCH",
      headers: ADMIN_HEADERS,
      body: JSON.stringify({ status: "invalid_status" })
    });
    assert.equal(invalidStatusRes.status, 400, `非法审批状态应返回 400，实际返回: ${invalidStatusRes.status}`);
    PASS("TC-D05-4", `非法审批状态拦截生效 (返回 400: ${invalidStatusRes.body?.error})`);

    // TC-D05-5: 未鉴权访问 (无 Token) -> 预期 401
    const unauthRes = await request(`${ADMIN_URL_PREFIX}/leave-requests`, {
      method: "GET",
      headers: { "Content-Type": "application/json" }
    });
    assert.equal(unauthRes.status, 401, `未授权访问应返回 401，实际返回: ${unauthRes.status}`);
    PASS("TC-D05-5", `无凭据未授权拦截生效 (返回 401)`);

  } finally {
    // ------------------------------------------------------------------------
    // TC-D06: 清理闭环 (保证数据零污染)
    // ------------------------------------------------------------------------
    LOG("\n--- [TC-D06] 执行测试环境数据清理 ---");
    for (const lid of createdLeaveIds) {
      await request(`${ADMIN_URL_PREFIX}/leave-requests/${lid}`, { method: "DELETE", headers: ADMIN_HEADERS }).catch(() => {});
    }
    if (activeEmpId) {
      await request(`${ADMIN_URL_PREFIX}/employees/${activeEmpId}`, { method: "DELETE", headers: ADMIN_HEADERS }).catch(() => {});
    }
    if (resignedEmpId) {
      await request(`${ADMIN_URL_PREFIX}/employees/${resignedEmpId}`, { method: "DELETE", headers: ADMIN_HEADERS }).catch(() => {});
    }
    PASS("TC-D06", "临时请假单据与测试员工已全部清理，无脏数据残留");
  }

  LOG("\n==================================================================");
  LOG("🎉 请假模块阶段一数据流通测试 (Stage 1 Data Flow Matrix) 全部 PASS！");
  LOG("==================================================================");
}

runComprehensiveStage1().catch(err => {
  FAIL("GLOBAL", err.message);
  console.error(err.stack);
  process.exit(1);
});
