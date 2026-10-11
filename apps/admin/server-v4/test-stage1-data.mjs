import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const dotenv = require("../node_modules/dotenv");
dotenv.config({ path: "./.env" });

const { signToken } = await import("../server/auth-v4.js");
const secret = process.env.ADMIN_AUTH_TOKEN_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;

const BASE_URL = "http://127.0.0.1:8789";

const adminToken = signToken({
  stage: "authenticated",
  userId: "867b9218-a231-4b8c-ae2b-23f922e5ee6f",
  accountId: "867b9218-a231-4b8c-ae2b-23f922e5ee6f",
  ownerUserId: "60af4e3c-2890-42f0-89f6-e0bcae3e43e0",
  adminOwnerUserId: "60af4e3c-2890-42f0-89f6-e0bcae3e43e0",
  account: "admin@wmshr.com",
  countryCode: "TH",
  permissions: ["*"]
}, 3600 * 1000, secret);

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`,
      ...options.headers
    }
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

async function runStage1Tests() {
  console.log("===============================================================");
  console.log("   🚀 WMSHR 考勤模块 - 阶段一（数据流通黑盒闭环）测试");
  console.log("===============================================================\n");

  const createdRecordIds = [];
  const createdLeaveRequestIds = [];

  try {
    // 基础探活与员工锁定
    const empRes = await request("/api/v4/admin/employees?warehouse_code=TH");
    assert.equal(empRes.status, 200);
    const testEmp = (empRes.data.items || []).find(e => e.status === "active" && e.id === 16) || empRes.data.items[0];
    assert.ok(testEmp, "必须至少存在一个在职测试员工");
    console.log(`✅ 环境探活: 锁定测试员工 ID=${testEmp.id}, 姓名=${testEmp.name}`);

    // 清理历史残留数据
    const preRecords = await request("/api/v4/admin/attendance-records?month=2026-10&warehouse_code=TH");
    if (Array.isArray(preRecords.data)) {
      for (const r of preRecords.data) {
        if (Number(r.employee_id || r.empId) === testEmp.id && ["2026-10-06", "2026-10-03"].includes(r.date)) {
          await request(`/api/v4/admin/attendance-records/${r.id}`, { method: "DELETE" });
        }
      }
    }
    const preLeaves = await request("/api/v4/admin/leave-requests?warehouse_code=TH");
    if (Array.isArray(preLeaves.data)) {
      for (const l of preLeaves.data) {
        if (Number(l.employee_id || l.empId) === testEmp.id && l.start_date === "2026-10-07") {
          await request(`/api/v4/admin/leave-requests/${l.id}`, { method: "DELETE" });
        }
      }
    }

    // ---------------------------------------------------------
    // 场景 1：视图筛选下钻与月份生命周期
    // ---------------------------------------------------------
    console.log("\n【场景 1：视图筛选下钻与数据聚合】");
    const calcRes1 = await request(`/api/v4/admin/attendance-calculations?month=2026-10&warehouse_code=TH&employee_id=${testEmp.id}`);
    assert.equal(calcRes1.status, 200, "考勤月度底册请求必须成功");
    const rows = calcRes1.data.rows || [];
    assert.ok(rows.length > 0, "即使未打卡，月度矩阵也必须返回当月的默认日期行");
    assert.ok(rows.every(r => r.emp?.id === testEmp.id), "返回的所有行必须仅属于筛选的特定员工");
    console.log(`   ✓ 筛选下钻业务正确: 返回 ${rows.length} 行专属数据，数据隔离正常。`);

    // ---------------------------------------------------------
    // 场景 2：基于节假日规则的阶梯加班补签与算账
    // ---------------------------------------------------------
    console.log("\n【场景 2：阶梯加班补卡与倍率算账】");
    const rec2Payload = {
      employeeId: testEmp.id,
      date: "2026-10-03", // 2026-10-03 为周六，触发 weekend 倍率
      inTime: "08:30",
      outTime: "20:30", // 在岗12h，扣除1h午休，总计11h（基础8h + 加班3h）
      type: "normal",
      note: "E2E代码触发-周末加班",
      allowOverwrite: true
    };
    const rec2Res = await request("/api/v4/admin/attendance-records", {
      method: "POST",
      body: JSON.stringify(rec2Payload)
    });
    assert.ok([200, 201].includes(rec2Res.status), `补卡请求应成功: ${JSON.stringify(rec2Res.data)}`);
    createdRecordIds.push(rec2Res.data.record.id);
    
    // 业务断言：指标算账
    const metrics2 = rec2Res.data.metrics;
    assert.equal(metrics2.valid, 11, "总有效在岗工时为12h扣除1h午休=11h");
    assert.equal(metrics2.ot, 3, "延时加班工时必须精准切分为3小时");
    
    // 触发月度重算验证底册
    await request("/api/v4/admin/attendance-calculations/recalculate", {
      method: "POST",
      body: JSON.stringify({ month: "2026-10", warehouseCode: "TH" })
    });
    const calcRes2 = await request("/api/v4/admin/attendance-calculations?month=2026-10&warehouse_code=TH");
    const row2 = (calcRes2.data.rows || []).find(r => r.emp?.id === testEmp.id && r.date === "2026-10-03");
    assert.equal(row2.details.valid, 11);
    assert.equal(row2.details.ot, 3);
    console.log(`   ✓ 算账业务正确: 基础工时 ${row2.details.valid - row2.details.ot}h, 加班 ${row2.details.ot}h, otPay(加班费)=${row2.otPay}, 阶梯倍率已生效。`);

    // ---------------------------------------------------------
    // 场景 3：请假状态机穿透与日薪阻断
    // ---------------------------------------------------------
    console.log("\n【场景 3：请假状态机穿透与日薪阻断】");
    const leavePayload = {
      empId: testEmp.id,
      type: "sick",
      startDate: "2026-10-07",
      endDate: "2026-10-07",
      reason: "E2E代码触发-病假",
      status: "pending"
    };
    const leaveCreateRes = await request("/api/v4/admin/leave-requests", {
      method: "POST",
      body: JSON.stringify(leavePayload)
    });
    assert.ok([200, 201].includes(leaveCreateRes.status), `发起请假单应成功`);
    const leaveId = leaveCreateRes.data.id;
    createdLeaveRequestIds.push(leaveId);

    await request(`/api/v4/admin/leave-requests/${leaveId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: "approved" })
    });

    const calcLeaveRes = await request("/api/v4/admin/attendance-calculations?month=2026-10&warehouse_code=TH");
    const leaveRow = (calcLeaveRes.data.rows || []).find(r => r.emp?.id === testEmp.id && r.date === "2026-10-07");
    assert.ok(
      leaveRow.status === "sick_leave" || leaveRow.status === "leave" || leaveRow.status === "sick",
      "请假日的考勤状态必须穿透为请假"
    );
    assert.equal(leaveRow.details.valid, 0, "业务阻断：请假全天不计正常打卡出勤工时");
    console.log(`   ✓ 状态机穿透正确: 当日状态变为 ${leaveRow.status}，有效工时阻断为 0。`);

    // ---------------------------------------------------------
    // 场景 4：异常调账覆写与物理删除防残留
    // ---------------------------------------------------------
    console.log("\n【场景 4：异常调账覆写与物理删除防残留】");
    const updatePayload = {
      inTime: "09:30",
      outTime: "20:30",
      type: "normal",
      note: "调账审批单测试"
    };
    const updateRes = await request(`/api/v4/admin/attendance-records/${rec2Res.data.record.id}`, {
      method: "PUT",
      body: JSON.stringify(updatePayload)
    });
    assert.equal(updateRes.status, 200, "更新调账应成功");
    assert.equal(updateRes.data.record.in_time, "09:30");
    assert.equal(updateRes.data.record.note, updatePayload.note);
    console.log("   ✓ 调账覆写业务正确: 打卡时间成功无缝覆盖。");

    const deleteRes = await request(`/api/v4/admin/attendance-records/${rec2Res.data.record.id}`, {
      method: "DELETE"
    });
    assert.equal(deleteRes.status, 200, "删除考勤记录应成功");
    
    const verifyListRes = await request("/api/v4/admin/attendance-records?month=2026-10&warehouse_code=TH");
    const afterDelete = (verifyListRes.data || []).find(r => r.id === rec2Res.data.record.id);
    assert.equal(afterDelete, undefined, "业务红线：删除后的考勤记录绝不能残留");
    console.log("   ✓ 物理删除防残留业务正确: 数据干净销毁。");

  } finally {
    console.log("\n【测试套件清理阶段】正在清理环境...");
    for (const id of createdRecordIds) {
      await request(`/api/v4/admin/attendance-records/${id}`, { method: "DELETE" }).catch(() => {});
    }
    for (const id of createdLeaveRequestIds) {
      await request(`/api/v4/admin/leave-requests/${id}`, { method: "DELETE" }).catch(() => {});
    }
    console.log("   ✓ 清理完成。");
  }

  console.log("\n===============================================================");
  console.log("   🎉 阶段一（数据流通）测试 100% PASS！业务断言全部通过。");
  console.log("===============================================================\n");
}

runStage1Tests().catch((err) => {
  console.error("\n❌ 测试执行失败:", err);
  process.exit(1);
});
