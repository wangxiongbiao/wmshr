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
  console.log("   🚀 WMSHR 考勤模块阶段一（数据流通黑盒闭环）全场景集成测试");
  console.log("===============================================================\n");

  const createdRecordIds = [];
  const createdLeaveRequestIds = [];

  try {
    // 0. 基础探活与配置读取
    console.log("【场景 0：考勤配置与服务探活】");
    const configRes = await request("/api/v4/admin/attendance-config?warehouse_code=TH");
    assert.equal(configRes.status, 200, "读取考勤配置必须返回 200");
    assert.ok(configRes.data.startShift, "配置中必须包含标准上班时间");
    assert.ok(configRes.data.endShift, "配置中必须包含标准下班时间");
    console.log(`   ✓ 考勤配置校验通过: 上班=${configRes.data.startShift}, 下班=${configRes.data.endShift}, 标准工时=${configRes.data.standardHours}h`);

    // 获取测试在职员工
    const empRes = await request("/api/v4/admin/employees?warehouse_code=TH");
    assert.equal(empRes.status, 200);
    const testEmp = (empRes.data.items || []).find(e => e.status === "active" && e.id === 16) || empRes.data.items[0];
    assert.ok(testEmp, "必须至少存在一个在职测试员工");
    console.log(`   ✓ 锁定测试员工: ID=${testEmp.id}, 姓名=${testEmp.name}, 仓库=${testEmp.warehouseCode}, 日薪=${testEmp.dailyWage}`);

    // 清理可能遗留的历史测试数据
    const preRecords = await request("/api/v4/admin/attendance-records?month=2026-10&warehouse_code=TH");
    if (Array.isArray(preRecords.data)) {
      for (const r of preRecords.data) {
        if (Number(r.employee_id || r.empId) === testEmp.id && ["2026-10-06", "2026-10-03"].includes(r.date)) {
          await request(`/api/v4/admin/attendance-records/${r.id}`, { method: "DELETE" });
        }
      }
    }

    // 场景 1：标准工作日打卡与工时费用自动核算流
    console.log("\n【场景 1：标准考勤打卡与工时费用自动核算流】");
    const rec1Payload = {
      employeeId: testEmp.id,
      date: "2026-10-06", // 2026-10-06 为周二标准工作日
      inTime: "08:30",
      outTime: "17:30",
      type: "normal",
      note: "E2E测试-标准工作日打卡",
      allowOverwrite: true
    };
    const rec1Res = await request("/api/v4/admin/attendance-records", {
      method: "POST",
      body: JSON.stringify(rec1Payload)
    });
    assert.ok([200, 201].includes(rec1Res.status), `创建标准打卡应成功: ${JSON.stringify(rec1Res.data)}`);
    assert.ok(rec1Res.data.record?.id, "返回数据中必须包含记录ID");
    const record1Id = rec1Res.data.record.id;
    createdRecordIds.push(record1Id);

    const metrics1 = rec1Res.data.metrics;
    assert.ok(metrics1, "创建成功后后端必须实时返回工时指标 metrics");
    assert.equal(metrics1.valid, 8, "在岗9小时扣除1小时午休，有效工时必须精准等于8小时");
    assert.equal(metrics1.ot, 0, "标准班次无加班，ot必须为0");
    console.log(`   ✓ 打卡指标核算精准: valid=${metrics1.valid}h, ot=${metrics1.ot}h, raw=${metrics1.raw}h, break=${metrics1.breakDeduction}h`);

    // 验证打卡列表回显
    const listRes = await request("/api/v4/admin/attendance-records?month=2026-10&warehouse_code=TH");
    assert.equal(listRes.status, 200);
    const foundRec1 = (listRes.data || []).find(r => Number(r.employee_id) === testEmp.id && r.date === "2026-10-06");
    assert.ok(foundRec1, "考勤列表接口中必须能检索到刚录入的标准打卡");
    assert.equal(foundRec1.in_time, "08:30");
    assert.equal(foundRec1.out_time, "17:30");
    console.log("   ✓ 考勤列表对称回显验证通过");

    // 场景 2：阶梯加班补卡与倍率核算/重算联动流
    console.log("\n【场景 2：阶梯加班补卡与倍率核算/重算联动流】");
    const rec2Payload = {
      employeeId: testEmp.id,
      date: "2026-10-03", // 2026-10-03 为周六周末
      inTime: "08:30",
      outTime: "20:30", // 在岗12h，扣除1h午休，总计11h（标准8h + 加班3h）
      type: "normal",
      note: "E2E测试-周末加班打卡",
      allowOverwrite: true
    };
    const rec2Res = await request("/api/v4/admin/attendance-records", {
      method: "POST",
      body: JSON.stringify(rec2Payload)
    });
    assert.ok([200, 201].includes(rec2Res.status), `创建加班打卡应成功: ${JSON.stringify(rec2Res.data)}`);
    createdRecordIds.push(rec2Res.data.record.id);
    const metrics2 = rec2Res.data.metrics;
    assert.equal(metrics2.valid, 11, "总有效在岗工时为12h扣除1h午休=11h");
    assert.equal(metrics2.ot, 3, "延时加班工时必须精准等于3小时");
    assert.equal(metrics2.valid - metrics2.ot, 8, "基础工时部分为 valid - ot = 8h");
    console.log(`   ✓ 周末加班工时切分精准: 总工时=${metrics2.valid}h, 基础=${metrics2.valid - metrics2.ot}h, 加班=${metrics2.ot}h, otPay=${metrics2.otPay}`);

    // 触发月度批量重新计算接口
    console.log("   正在触发月度批量考勤重算接口 POST /attendance-calculations/recalculate ...");
    const recalcRes = await request("/api/v4/admin/attendance-calculations/recalculate", {
      method: "POST",
      body: JSON.stringify({ month: "2026-10", warehouseCode: "TH" })
    });
    assert.equal(recalcRes.status, 200);
    assert.equal(recalcRes.data.success, true);
    console.log(`   ✓ 月度重算完成: recalculatedCount=${recalcRes.data.recalculatedCount}`);

    // 查询月度考勤计算底册
    const calcRes = await request("/api/v4/admin/attendance-calculations?month=2026-10&warehouse_code=TH");
    assert.equal(calcRes.status, 200);
    const row2 = (calcRes.data.rows || []).find(r => r.emp?.id === testEmp.id && r.date === "2026-10-03");
    assert.ok(row2, "月度计算表中必须存在该员工 2026-10-03 的核算结果");
    assert.equal(row2.details.valid, 11);
    assert.equal(row2.details.ot, 3);
    assert.equal(row2.details.valid - row2.details.ot, 8);
    console.log(`   ✓ 月度底册快照核验完全对齐: 日期=${row2.date}, 工时=${row2.details.valid}h, 加班=${row2.details.ot}h, totalPay=${row2.totalPay}`);

    // 场景 3：请假审批穿透与考勤状态机联动流
    console.log("\n【场景 3：请假审批穿透与考勤状态机联动流】");
    // 清理历史请假单冲突
    const preLeaves = await request("/api/v4/admin/leave-requests?warehouse_code=TH");
    if (Array.isArray(preLeaves.data)) {
      for (const l of preLeaves.data) {
        if (Number(l.employee_id || l.empId) === testEmp.id && l.start_date === "2026-10-07") {
          await request(`/api/v4/admin/leave-requests/${l.id}`, { method: "DELETE" });
        }
      }
    }

    const leavePayload = {
      empId: testEmp.id,
      type: "sick",
      startDate: "2026-10-07",
      endDate: "2026-10-07",
      reason: "E2E测试-流感就医病假",
      status: "pending"
    };
    const leaveCreateRes = await request("/api/v4/admin/leave-requests", {
      method: "POST",
      body: JSON.stringify(leavePayload)
    });
    assert.ok([200, 201].includes(leaveCreateRes.status), `发起请假单应成功: ${JSON.stringify(leaveCreateRes.data)}`);
    const leaveId = leaveCreateRes.data.id;
    createdLeaveRequestIds.push(leaveId);
    console.log(`   ✓ 请假单创建成功: ID=${leaveId}, 状态=${leaveCreateRes.data.status}`);

    // 管理员审批通过
    const approveRes = await request(`/api/v4/admin/leave-requests/${leaveId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: "approved", approvalNote: "主管在线审批同意" })
    });
    assert.equal(approveRes.status, 200, "审批请假单应返回 200");
    assert.equal(approveRes.data.status, "approved", "审批后状态必须更新为 approved");
    console.log("   ✓ 请假审批流转闭环成功: status=approved");

    // 验证请假穿透到月度考勤计算结果
    const calcLeaveRes = await request("/api/v4/admin/attendance-calculations?month=2026-10&warehouse_code=TH");
    assert.equal(calcLeaveRes.status, 200);
    const leaveRow = (calcLeaveRes.data.rows || []).find(r => r.emp?.id === testEmp.id && r.date === "2026-10-07");
    assert.ok(leaveRow, "考勤月度计算表必须覆盖请假日 2026-10-07");
    assert.ok(
      leaveRow.status === "sick_leave" || leaveRow.status === "leave" || leaveRow.status === "sick",
      `请假日的考勤状态必须穿透为请假，当前为: ${leaveRow.status}`
    );
    assert.equal(leaveRow.details.valid, 0, "请假全天不计正常打卡出勤工时");
    console.log(`   ✓ 请假穿透校验通过: 日期=${leaveRow.date}, 状态=${leaveRow.status}, 有效工时=${leaveRow.details.valid}h`);

    // 场景 4：考勤记录手动调账/异常覆写与安全删除流
    console.log("\n【场景 4：考勤记录手动调账/异常覆写与安全删除流】");
    const updatePayload = {
      inTime: "09:00",
      outTime: "18:00",
      type: "normal",
      note: "E2E测试-管理员系统补卡审批单 #ATT-202610-001"
    };
    const updateRes = await request(`/api/v4/admin/attendance-records/${record1Id}`, {
      method: "PUT",
      body: JSON.stringify(updatePayload)
    });
    assert.equal(updateRes.status, 200, "更新考勤记录应成功");
    assert.equal(updateRes.data.record.in_time, "09:00");
    assert.equal(updateRes.data.record.out_time, "18:00");
    assert.equal(updateRes.data.record.note, updatePayload.note);
    console.log("   ✓ 考勤手动调账成功，新打卡时间与审批备注落库对齐");

    // 安全物理删除记录
    const deleteRes = await request(`/api/v4/admin/attendance-records/${record1Id}`, {
      method: "DELETE"
    });
    assert.equal(deleteRes.status, 200, "删除考勤记录应成功");
    assert.equal(deleteRes.data.success, true);
    // 从待清理清单中移除
    const idx = createdRecordIds.indexOf(record1Id);
    if (idx !== -1) createdRecordIds.splice(idx, 1);

    // 验证删除后记录不存在
    const verifyListRes = await request("/api/v4/admin/attendance-records?month=2026-10&warehouse_code=TH");
    const afterDelete = (verifyListRes.data || []).find(r => r.id === record1Id);
    assert.equal(afterDelete, undefined, "删除后的考勤记录绝不能继续残留在列表中");
    console.log("   ✓ 考勤记录物理删除与防残留校验通过");

    // 场景 5：全仓月度全景报表与字段对称性
    console.log("\n【场景 5：全仓月度全景报表与字段对称性】");
    const summaryRes = await request("/api/v4/admin/attendance-calculations?month=2026-10&warehouse_code=TH");
    assert.equal(summaryRes.status, 200);
    assert.ok(Array.isArray(summaryRes.data.rows), "返回结果必须包含 rows 数组");
    assert.ok(typeof summaryRes.data.total === "number", "返回结果必须包含数值型 total");
    assert.equal(summaryRes.data.month, "2026-10", "返回月份必须与请求一致");

    // 字段无损与非空校验
    for (const r of summaryRes.data.rows.slice(0, 10)) {
      assert.ok(r.date, "每行必须具有明确日期");
      assert.ok(r.emp && r.emp.id, "每行必须绑定明确员工对象");
      assert.ok(typeof r.details?.valid === "number" && !Number.isNaN(r.details.valid), "valid工时必须为合法数字");
      assert.ok(typeof r.details?.ot === "number" && !Number.isNaN(r.details.ot), "ot加班工时必须为合法数字");
      assert.ok(typeof r.totalPay === "number" && !Number.isNaN(r.totalPay), "totalPay必须为合法数字且不为NaN");
    }
    console.log(`   ✓ 报表字段完整性与数值健壮性校验通过 (已抽检 ${Math.min(10, summaryRes.data.rows.length)} 行)`);

  } finally {
    // 数据清理（保持幂等与环境清洁）
    console.log("\n【测试套件清理阶段】正在清理 E2E 注入的测试数据...");
    for (const id of createdRecordIds) {
      await request(`/api/v4/admin/attendance-records/${id}`, { method: "DELETE" }).catch(() => {});
    }
    for (const id of createdLeaveRequestIds) {
      await request(`/api/v4/admin/leave-requests/${id}`, { method: "DELETE" }).catch(() => {});
    }
    console.log("   ✓ 清理完成，数据库恢复初始状态。");
  }

  console.log("\n===============================================================");
  console.log("   🎉 考勤模块阶段一（数据流通）全场景黑盒测试全部通过！");
  console.log("===============================================================\n");
}

runStage1Tests().catch((err) => {
  console.error("\n❌ 阶段一测试执行失败:", err);
  process.exit(1);
});
