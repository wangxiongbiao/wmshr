# Admin 请假模块接入 Implementation Plan

> **For agentic workers:** 本计划基于 superpowers `writing-plans` 方法编写；执行时建议按任务逐块落地并在每块完成后做一次真实验证。

**Goal:** 在现有 `apps/admin` 后台中补齐“请假管理/审批”模块，让管理员可以查看员工请假申请、按状态筛选、审批通过/驳回，并与现有 mobile 请假链路和考勤回写逻辑对齐。

**Architecture:** 这次不是从零搭后端，而是在现有 admin 壳层中把已经存在的 `leave_requests` 数据能力接入为一个新的一级模块。前端沿用当前 admin 的 Tab 路由壳、Sidebar 导航、`lib/api.ts` 请求封装和现有表格/筛选/分页模式；后端仅补齐 admin 侧公开 API（如果还未暴露）或对接已存在的 server 内部函数，避免重复实现 mobile 已有的请假规则与审批副作用。

**Tech Stack:** React + TypeScript（admin 前端）、Express/Supabase（`apps/admin/server/index.js`）、现有 admin 路由壳（`App.tsx` / `adminRoute.ts` / `Sidebar.tsx`）、Supabase migration schema。

## 已确认现状

### 1. mobile 端请假已存在且已接真实接口
- `apps/mobile/src/features/attendance/screens/AttendanceListScreen.tsx`
  - 同时包含 `records` / `leave` 两个子 tab。
  - 通过 `fetchLeaveSummary`、`fetchLeaveHistory`、`submitLeaveRequest` 读写请假数据。
- `apps/mobile/src/features/attendance/services/attendanceApi.ts`
  - 已封装：
    - `GET /api/mobile/attendance/leave/summary`
    - `GET /api/mobile/attendance/leave/history`
    - `POST /api/mobile/attendance/leave/request`
- `apps/mobile/src/features/attendance/types.ts`
  - 已定义 `LeaveType`、`LeaveApprovalStatus`、`LeaveSummary`、`LeaveRecord`、`LeaveRequestPayload`。

### 2. 数据库和服务端核心能力已存在
- `supabase/migrations/20260625100000_add_leave_requests.sql`
  - 已存在 `public.leave_requests` 主表、索引、`attendance_records.leave_request_id` 关联字段。
- `apps/admin/server/index.js`
  - 已存在：
    - `fetchMobileLeaveSummary`
    - `fetchMobileLeaveHistory`
    - `createMobileLeaveRequest`
    - `listAdminLeaveRequests`
    - `approveLeaveRequest`
    - `rejectLeaveRequest`
    - `syncApprovedLeaveToAttendance`
  - 说明：审批通过后会回写 `attendance_records`，并触发日/月重算；这部分不要在前端重复实现。

### 3. admin 壳层目前没有 leave 一级模块
- `apps/admin/src/types.ts`
  - `TabId` 当前不包含 `leave`。
- `apps/admin/src/lib/adminRoute.ts`
  - `ADMIN_TABS` 当前为：`dashboard`、`employees`、`attendance`、`payroll`、`sop`、`customers`、`goods`、`expenses`。
- `apps/admin/src/components/Sidebar.tsx`
  - 当前无“请假管理”入口。
- `apps/admin/src/App.tsx`
  - `renderModulePage()` 尚未挂载 leave 页面组件。

---

## 推荐模块定位

### 模块名称
建议新增一级 tab：`leave`

### 导航名称
建议中文先用：`请假管理`

### 放置顺序
建议放在：`attendance` 后、`payroll` 前。

原因：
1. 业务上请假更接近考勤链路，而不是 SOP/客户/入库/费用类模块。
2. 当前服务端批准后会直接回写 `attendance_records` 并重算考勤/月汇总，说明它属于考勤上游输入源。
3. 用户在 admin 中理解路径更自然：`员工管理 -> 考勤计算 -> 请假管理 -> 薪资核算`。

---

## 目标范围（V1）

V1 只做后台审批与查看，不扩 scope 到复杂配额或多级审批。

### 必做
1. 新增 admin 一级 tab 与导航入口。
2. 新增 leave 请求列表页。
3. 支持按状态筛选：`pending` / `approved` / `rejected` / `all`。
4. 支持按员工筛选。
5. 支持分页。
6. 展示核心字段：
   - 员工
   - 部门
   - 请假类型
   - 开始/结束日期
   - 天数
   - 原因
   - 状态
   - 提交时间
   - 审批时间
   - 审批备注
7. 对 `pending` 记录支持：
   - 批准
   - 驳回
   - 填写审批备注
8. 审批完成后刷新列表，并让状态与考勤回写结果保持一致。

### V1 明确不做
1. 不做余额/年假额度规则。
2. 不做撤回申请。
3. 不做编辑历史申请。
4. 不做多级审批流。
5. 不做批量审批。
6. 不在 admin 前端重算考勤；继续复用服务端现有副作用链路。

---

## 文件结构与职责

### 一、壳层与路由
1. `apps/admin/src/types.ts`
   - 给 `TabId` 增加 `leave`。
   - 新增 admin 请假模块所需类型：列表项、分页结果、审批入参等。

2. `apps/admin/src/lib/adminRoute.ts`
   - 在 `ADMIN_TABS` 中加入 `leave`。
   - 保证 `parseAdminRoute` / `buildAdminRoute` 自动支持 `/:lang/leave`。

3. `apps/admin/src/components/Sidebar.tsx`
   - 新增“请假管理”导航入口。
   - 顺序建议：`attendance -> leave -> payroll`。

4. `apps/admin/src/App.tsx`
   - 引入 `LeaveRequestTable`（或 `LeaveManager`）。
   - 在 `renderModulePage()` 中增加 `case "leave"`。
   - 如 Header 标题映射是显式对象维护，还需同步加入 leave 文案。

### 二、admin API 封装
5. `apps/admin/src/lib/api.ts`
   - 新增 admin 侧请假接口封装：
     - `fetchAdminLeaveRequests(params)`
     - `approveAdminLeaveRequest(requestId, payload)`
     - `rejectAdminLeaveRequest(requestId, payload)`
   - 复用当前 `request<T>()` 认证逻辑。

### 三、admin 页面组件
6. `apps/admin/src/components/LeaveRequestTable.tsx`（建议新增）
   - 独立承载列表、筛选、分页、审批动作。
   - 尽量参考 `PayrollTable.tsx` / `AttendanceTable.tsx` 的交互模式，而不是塞回 `App.tsx`。

7. 可选拆分子组件（如果主文件过大）
   - `apps/admin/src/components/leave/LeaveStatusBadge.tsx`
   - `apps/admin/src/components/leave/LeaveApprovalModal.tsx`
   - `apps/admin/src/components/leave/LeaveFilters.tsx`

### 四、server 接口暴露层
8. `apps/admin/server/index.js`
   - 检查是否已经把以下内部函数暴露成 admin 接口：
     - `listAdminLeaveRequests`
     - `approveLeaveRequest`
     - `rejectLeaveRequest`
   - 若尚未暴露，则新增：
     - `GET /api/admin/leave-requests`
     - `PATCH /api/admin/leave-requests/:id/approve`
     - `PATCH /api/admin/leave-requests/:id/reject`
   - 继续沿用 admin 登录态鉴权，不引入新鉴权模式。

---

## 建议接口契约

### 1. 列表接口
`GET /api/admin/leave-requests?page=1&pageSize=20&status=pending&employeeId=123`

返回建议：
```ts
interface AdminLeaveRequestItem {
  id: number;
  employeeId: number;
  employeeName: string;
  employeeDept: string;
  type: 'personal' | 'sick' | 'annual' | 'special';
  durationDays: number;
  startDate: string;
  endDate: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  approvalNote: string;
}

interface AdminLeaveRequestPage {
  items: AdminLeaveRequestItem[];
  total: number;
  page: number;
  pageSize: number;
}
```

### 2. 批准接口
`PATCH /api/admin/leave-requests/:id/approve`

请求体：
```ts
{
  approvalNote?: string;
}
```

### 3. 驳回接口
`PATCH /api/admin/leave-requests/:id/reject`

请求体：
```ts
{
  approvalNote?: string;
}
```

说明：
- 审批备注可选，但 UI 应允许填写。
- 前端不要自行改状态机；接口成功后以服务端返回对象为准。

---

## 任务拆解

### Task 1：补齐类型、路由、导航壳层
**目标：** 让 admin 能进入 `/:lang/leave`，并在 UI 上看到“请假管理”入口。

**修改文件：**
- `apps/admin/src/types.ts`
- `apps/admin/src/lib/adminRoute.ts`
- `apps/admin/src/components/Sidebar.tsx`
- `apps/admin/src/App.tsx`

**完成标准：**
- 新 tab 类型编译通过。
- 侧边栏出现“请假管理”。
- 访问 `/:lang/leave` 不会回退到默认 tab。
- `renderModulePage()` 能挂载占位组件或正式组件。

### Task 2：补齐 admin 前端 API 封装与类型
**目标：** 让前端可以用和 payroll/attendance 一致的方式请求请假列表与审批动作。

**修改文件：**
- `apps/admin/src/lib/api.ts`
- `apps/admin/src/types.ts`

**完成标准：**
- 有列表查询函数。
- 有批准/驳回函数。
- 筛选参数与返回类型明确。
- 不重复造认证逻辑。

### Task 3：确认或补齐 server admin 接口暴露
**目标：** 确保前端有稳定的 admin API 可调，而不是直接依赖 server 内部函数存在。

**修改文件：**
- `apps/admin/server/index.js`

**完成标准：**
- `GET /api/admin/leave-requests`
- `PATCH /api/admin/leave-requests/:id/approve`
- `PATCH /api/admin/leave-requests/:id/reject`
- 都走 admin 鉴权。
- 成功返回统一 JSON，错误走现有 admin 错误风格。

### Task 4：实现 admin 请假列表页面
**目标：** 做出一个与当前 admin 风格一致的请假管理页。

**修改文件：**
- `apps/admin/src/components/LeaveRequestTable.tsx`
- 可选：`apps/admin/src/components/leave/*`
- `apps/admin/src/App.tsx`

**页面建议结构：**
1. 顶部筛选栏
   - 状态筛选
   - 员工筛选（可参考 `SearchableSelect`）
   - 分页信息 / 刷新按钮
2. 中部列表
   - 行展示请假申请核心字段
   - `pending` 行显示批准/驳回入口
3. 审批动作弹窗
   - 标题：批准申请 / 驳回申请
   - 文本域：审批备注
   - 确认按钮带 loading 态
4. 底部分页
   - 复用 `Pagination.tsx`

### Task 5：把审批完成后的联动验证跑通
**目标：** 确保 admin 审批不仅改了状态，而且真正触发服务端既有副作用。

**重点验证链路：**
1. mobile 提交一条 pending 请假。
2. admin 列表能看见该申请。
3. admin 点击批准后：
   - 列表状态变为 approved。
   - 服务端写入 `attendance_records.leave_request_id` 关联记录。
   - 当月/当日考勤重算链路触发。
4. admin 点击驳回后：
   - 列表状态变为 rejected。
   - 不产生新的考勤记录。

---

## 页面设计建议（贴合现有代码库）

### 交互风格
优先复用现有 admin 交互习惯：
- 表格页参考 `AttendanceTable.tsx` / `PayrollTable.tsx`
- 弹窗与确认流程参考 `useDialog()` 和已有 modal shell
- 状态展示沿用 badge 色块，不单独引入新设计体系

### 状态文案建议
- `pending` → `待审批`
- `approved` → `已批准`
- `rejected` → `已驳回`

### 请假类型文案建议
- `personal` → `事假`
- `sick` → `病假`
- `annual` → `年假`
- `special` → `特殊请假`

### 记录排序
- 默认按 `submittedAt/created_at desc`
- 与服务端 `listAdminLeaveRequests()` 当前实现保持一致

---

## 真实风险与注意点

### 1. 不要在前端重复实现审批副作用
`approveLeaveRequest()` 之后服务端会：
- 生成 `attendance_records`
- 对历史/当日进行重算调度
- 触发月级重算

所以前端只负责调用接口和刷新，不要自己拼“批准后本地插入考勤记录”的假逻辑。

### 2. `pending -> approved` 失败回滚已经在服务端做了
`apps/admin/server/index.js` 里批准后若 `syncApprovedLeaveToAttendance()` 报错，会把 `leave_requests` 状态回滚回 `pending`。前端必须把错误原样展示，而不是先乐观改成 approved。

### 3. 需要关注 Header 标题映射是否还有隐藏维护点
当前已确认：
- `types.ts`
- `adminRoute.ts`
- `Sidebar.tsx`
- `App.tsx renderModulePage()`

但若 admin Header 标题还有基于 tab 的显式映射对象，也必须同步加 `leave`，否则进入新页签可能标题缺失或落回默认值。

### 4. 员工筛选最好复用现有搜索式选择器
如果直接预加载所有员工作为下拉，未来数据量变大时会影响体验。可优先参考现有 `SearchableSelect` 和 payroll 页面做法。

### 5. i18n 要一起补齐
新增以下文案后，需同步 admin 翻译资源：
- 请假管理
- 待审批 / 已批准 / 已驳回
- 批准申请 / 驳回申请
- 审批备注
- 请假类型
- 开始日期 / 结束日期 / 请假天数 / 请假原因 / 提交时间 / 审批时间
- 暂无请假申请 / 请假申请加载失败 / 审批成功 / 审批失败

---

## 验证方案

### 前端验证
1. 运行 admin 开发环境。
2. 打开 `/:lang/leave`。
3. 检查：
   - 侧栏入口存在
   - 切页正常
   - 刷新后 URL 保持
   - 筛选与分页可用

### 接口验证
1. 先在 mobile 提交一条新的请假申请。
2. 打开 admin leave 页面确认该记录出现。
3. 对 pending 记录执行批准。
4. 再检查：
   - 列表状态变为 approved
   - 相关考勤日期在 admin attendance 中可见 leave/sick_leave 结果
5. 新建另一条申请并驳回。
6. 检查 rejected 记录展示与备注保存。

### 回归验证
至少回归：
- `attendance` 页面正常
- `payroll` 页面正常
- Sidebar 顺序与其他模块未被破坏
- URL 规范化未受影响

---

## 最终建议的落地顺序

1. 先加 `TabId` / `ADMIN_TABS` / `Sidebar` / `App` 壳层。
2. 再加 `types.ts` 与 `lib/api.ts` 的 admin leave 契约。
3. 接着确认 server admin 路由是否已暴露；没有就补。
4. 然后实现 `LeaveRequestTable.tsx` 页面。
5. 最后跑一遍“mobile 提交 -> admin 审批 -> attendance 回写”的端到端验证。

---

## 一句话结论
这不是“从零做请假系统”，而是“把已经存在的 mobile + server + DB 请假能力接进 admin 壳层并补齐审批 UI”。因此最稳的策略是：**最小新增页面、最大复用现有服务端规则与 admin 表格范式**。