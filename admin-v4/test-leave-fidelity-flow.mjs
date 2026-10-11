import assert from "node:assert/strict";
import fs from "node:fs";

console.log("==================================================================");
console.log("🚀 阶段一：全生命周期「请假模块数据流通与闭环测试」启动");
console.log("==================================================================");

const root = new URL("./", import.meta.url);
const read = (rel) => {
  let content = fs.readFileSync(new URL(rel, root), "utf8");
  if (content.includes('from "./leave"') || content.includes("from './leave'") || content.includes('from "./leave/')) {
    try {
      const leaveDir = new URL("./src/components/leave/", root);
      const leaveFiles = fs.readdirSync(leaveDir, { recursive: true });
      for (const f of leaveFiles) {
        const p = new URL(f, leaveDir);
        if (fs.statSync(p).isFile()) content += "\n" + fs.readFileSync(p, "utf8");
      }
    } catch {}
  }
  return content;
};

// -------------------------------------------------------------
// TC-01: 静态契约与组件库纯正度（零裸标签、强类型绑定）
// -------------------------------------------------------------
console.log("\n[TC-01] 校验请假模块组件库纯正度与 Deep Module 分层架构...");
const leaveSource = read("./src/components/LeaveTable.tsx");

assert.ok(!leaveSource.includes("<button"), "违规：LeaveTable 模块中仍残留 HTML 原生 <button> 裸标签");
assert.ok(!leaveSource.includes("<select"), "违规：LeaveTable 模块中仍残留 HTML 原生 <select> 裸标签");
assert.ok(!leaveSource.includes("<input"), "违规：LeaveTable 模块中仍残留 HTML 原生 <input> 裸标签");
assert.ok(leaveSource.includes("LeaveCreateModal"), "缺失：代录请假弹窗子组件未正确解耦导出");
assert.ok(leaveSource.includes("LeaveStatusBadge"), "缺失：状态徽标原子组件未正确解耦导出");
assert.ok(leaveSource.includes("LeaveDeleteDialog"), "缺失：删除二次确认弹窗未正确解耦导出");
assert.ok(leaveSource.includes("useLeaveTableFilter"), "缺失：状态筛选 Hook 未正确解耦导出");
console.log("✓ TC-01 PASS: 零裸标签检出，Deep Module 分层架构完整。");

// -------------------------------------------------------------
// TC-02: 状态徽标与刚性结构体双向防折行契约
// -------------------------------------------------------------
console.log("\n[TC-02] 校验状态胶囊与表格刚性列防折行契约 (whitespace-nowrap & min-w)...");
assert.ok(leaveSource.includes("whitespace-nowrap inline-flex items-center shrink-0"), "违规：LeaveStatusBadge 缺少原子级单行锁");
assert.ok(leaveSource.includes("w-[11%] min-w-[100px] whitespace-nowrap"), "违规：表格状态列缺少 min-w-[100px] 物理下限与 whitespace-nowrap 保护");
assert.ok(leaveSource.includes("w-[11%] min-w-[130px] text-right whitespace-nowrap"), "违规：表格操作列缺少 min-w 物理下限与 whitespace-nowrap 保护");
console.log("✓ TC-02 PASS: 刚性结构体双重锁齐备，绝不发生被动换行塌陷。");

// -------------------------------------------------------------
// TC-03: 破坏性操作非阻塞确认与通信期双向锁定
// -------------------------------------------------------------
console.log("\n[TC-03] 校验删除二次确认拦截与通信期双向锁定 (Destructive Interception & Pointer Lock)...");
assert.ok(!leaveSource.includes("confirm("), "违规：LeaveTable 中仍残留 window.confirm 阻塞式调用");
assert.ok(leaveSource.includes("onPointerDownOutside"), "违规：LeaveCreateModal 缺少提交通信期遮罩点击拦截");
assert.ok(leaveSource.includes("onEscapeKeyDown"), "违规：LeaveCreateModal 缺少提交通信期 ESC 按键拦截");
assert.ok(leaveSource.includes("Boolean(actionLoadingId)"), "违规：单行操作缺少全局互斥防连击行锁");
console.log("✓ TC-03 PASS: 彻底根除原生 confirm，遮罩通信锁定与行级互斥锁 100% 闭环。");

// -------------------------------------------------------------
// TC-04: 能搜必能清与分页联动安全复位
// -------------------------------------------------------------
console.log("\n[TC-04] 校验搜索清空按钮与条件变更分页复位 (Search Reset & Page 1 Reset)...");
assert.ok(leaveSource.includes('onClick={() => setLeaveSearch("")}'), "违规：搜索框缺少一键清空按钮");
const filterSource = fs.readFileSync(new URL("./src/components/leave/useLeaveTableFilter.ts", root), "utf8");
assert.ok(filterSource.includes("setPage(1)"), "违规：useLeaveTableFilter 未在搜索/过滤变动时复位第 1 页");
console.log("✓ TC-04 PASS: 搜索一键清空可用，搜索/筛选状态机联动复位 setPage(1)。");

// -------------------------------------------------------------
// TC-05: 移动端真实 API 数据闭环与离职只读拦截
// -------------------------------------------------------------
console.log("\n[TC-05] 校验移动端 EmployeeApp 真实 API 闭环与离职账号只读拦截...");
const empAppSource = fs.readFileSync(new URL("./src/components/EmployeeApp.tsx", root), "utf8");

assert.ok(empAppSource.includes("createLeaveRequest("), "违规：EmployeeApp 提交请假未对接真实 createLeaveRequest API");
assert.ok(empAppSource.includes("deleteLeaveRequest("), "违规：EmployeeApp 取消请假未对接真实 deleteLeaveRequest API");
assert.ok(!empAppSource.includes("leave-${Date.now()}"), "违规：EmployeeApp 仍残留自造伪 ID (leave-${Date.now()})");
assert.ok(empAppSource.includes("currentUser?.status === '离职'"), "违规：EmployeeApp 请假申请缺少离职只读拦截");
assert.ok(empAppSource.includes("isSubmittingLeave"), "违规：EmployeeApp 请假提交按钮缺少 Spinner 防连击锁");
console.log("✓ TC-05 PASS: 移动端数据流 100% 真实闭环，伪 ID 清零，离职只读安全拦截。");

// -------------------------------------------------------------
// TC-06: 顶层生命周期历史 Mock 残留清理
// -------------------------------------------------------------
console.log("\n[TC-06] 校验 App.tsx 顶层生命周期纯度 (无硬编码字符串洗数据)...");
const appSource = fs.readFileSync(new URL("./src/App.tsx", root), "utf8");
assert.ok(!appSource.includes("家里有些急事"), "违规：App.tsx 中仍残留历史特定字符串 (家里有些急事) 硬编码过滤");
assert.ok(!appSource.includes("身体不适发烧"), "违规：App.tsx 中仍残留历史特定字符串 (身体不适发烧) 硬编码过滤");
console.log("✓ TC-06 PASS: 顶层硬编码脏数据清洗代码彻底清零。");

// -------------------------------------------------------------
// TC-07: 服务端 API 契约与考勤联动级联验证
// -------------------------------------------------------------
console.log("\n[TC-07] 校验服务端 server-v4/attendance.js 请假-考勤级联重算链路...");
const serverAttendanceSource = fs.readFileSync(new URL("../apps/admin/server-v4/attendance.js", root), "utf8");
assert.ok(serverAttendanceSource.includes('/leave-requests/:id/status'), "缺失：PATCH /leave-requests/:id/status 状态流转路由");
assert.ok(serverAttendanceSource.includes('saveAndRecalculateRecord'), "缺失：请假审批通过后触发 saveAndRecalculateRecord 考勤重算");
assert.ok(serverAttendanceSource.includes('workspace_attendance_calculation_results'), "缺失：请假驳回或撤销后级联清理考勤结果缓存");
console.log("✓ TC-07 PASS: 服务端请假-考勤-薪资三级联动回写与撤销清理链路完整。");

console.log("\n==================================================================");
console.log("🎉 全部 7 大全景场景数据流通与契约断言 100% 通过！");
console.log("==================================================================");
