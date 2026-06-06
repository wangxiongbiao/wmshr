# 员工端打卡与 SOP 功能现状检查

检查时间：2026-06-05

项目路径：`/Users/admin/Desktop/project/wmshr`

## 1. 检查范围

本次检查围绕员工端下一阶段功能展开：

- 员工上班 / 下班打卡
- 打卡定位、位置描述、异常描述
- 根据 Admin 后台规则判断打卡状态
- 员工端 SOP 列表、搜索、详情、阅读确认、更新提醒
- 后台现有规则、表结构、接口和移动端接入状态

## 2. codegraph 索引状态

项目原来没有 `.codegraph` 索引，本次已生成并验证可用。

验证结果：

- 索引文件数：`101`
- 节点数：`1,114`
- 边数：`3,093`
- 状态：`Index is up to date`

后续理解项目结构、调用关系和影响面时，应优先使用该索引。

## 3. 考勤 / 打卡功能现状

### 3.1 已存在能力

后台已经具备考勤基础能力。

后台考勤规则接口已存在：

- `GET /api/admin/attendance-rules`
- `GET /api/admin/attendance-rules/:id`
- `POST /api/admin/attendance-rules`
- `PUT /api/admin/attendance-rules/:id`
- `GET /api/admin/attendance-config`
- `PUT /api/admin/attendance-config`

后台考勤记录和计算接口已存在：

- `POST /api/admin/attendance-records`
- `PUT /api/admin/attendance-records/:id`
- `GET /api/admin/attendance-calculations`
- `POST /api/admin/attendance-calculations/recalculate-daily`
- `POST /api/admin/attendance-calculations/recalculate-batch`
- `POST /api/admin/attendance-calculations/recalculate-monthly`

相关数据表 / 迁移已存在：

- `attendance_config`
- `attendance_rules`
- `attendance_records`
- `attendance_calculation_results`

移动端已有打卡页面骨架：

- `apps/mobile/src/features/home/components/CheckInCard.tsx`
- `apps/mobile/src/features/home/screens/HomeScreen.tsx`
- `apps/mobile/src/features/attendance/services/attendanceApi.ts`
- `apps/mobile/src/features/attendance/screens/AttendanceListScreen.tsx`

### 3.2 当前缺失

员工端打卡还没有接真实后端。

当前状态：

- `apps/mobile/src/features/attendance/services/attendanceApi.ts` 仍使用本地 mock 变量 `todayStatus`。
- 首页打卡仍使用固定坐标：
  - `latitude: 13.7563`
  - `longitude: 100.5018`
- 没有真实定位权限申请。
- 没有真实经纬度采集。
- 没有位置描述字段。
- 没有异常描述输入。
- 没有移动端打卡接口。

缺失的移动端打卡接口建议：

- `GET /api/mobile/attendance/today`
- `POST /api/mobile/attendance/check`
- `GET /api/mobile/attendance/records`

### 3.3 规则缺口

当前后台考勤规则主要服务于工时 / 薪资计算，不足以支撑员工端打卡规则。

需要新增或扩展的规则：

- 上班打卡允许窗口
- 下班打卡允许窗口
- 是否要求定位
- 允许打卡地点或范围
- 异常打卡是否要求描述
- 上班时间内打卡时是否必须填写描述

当前迁移中没有看到打卡位置相关字段，例如：

- `latitude`
- `longitude`
- `location_text`
- `check_description`

因此打卡实现前需要先补数据库字段或独立打卡表设计。

## 4. SOP 功能现状

### 4.1 已存在能力

SOP 后台能力已经较完整，并且已从旧 localStorage 方案迁移到真实 API / Supabase 表。

相关文件：

- 后台组件：`apps/admin/src/components/SopManager.tsx`
- 后台 API client：`apps/admin/src/lib/api.ts`
- 后端接口：`apps/admin/server/index.js`
- 数据库迁移：`supabase/migrations/20260605054500_add_sop_management.sql`

已有数据表：

- `sop_documents`
- `sop_document_targets`
- `sop_assets`
- `sop_reads`

已有后台接口：

- `GET /api/admin/sops`
- `GET /api/admin/sops/:id`
- `POST /api/admin/sops`
- `PUT /api/admin/sops/:id`
- `DELETE /api/admin/sops/:id`
- `POST /api/admin/sops/:id/read`

后台已具备能力：

- 后台录入 SOP
- SOP 草稿 / 发布状态
- 全部员工可见
- 指定员工可见
- 图片
- 附件
- HTML 正文
- 搜索标题 / 创建人 / 正文
- 阅读记录
- 员工可见性过滤逻辑

### 4.2 当前缺失

移动端 SOP 仍是 mock。

当前状态：

- `apps/mobile/src/features/sop/services/sopApi.ts` 只返回本地 `sopDocuments`。
- `apps/mobile/src/features/sop/types.ts` 字段非常简化。
- `SopListScreen.tsx` 没有真实搜索、分类筛选、未读提醒。
- `SopDetailScreen.tsx` 仍是骨架，只显示标题和提示文案。

移动端缺失接口：

- `GET /api/mobile/sops`
- `GET /api/mobile/sops/:id`
- `POST /api/mobile/sops/:id/read`
- `GET /api/mobile/sops/notifications`

### 4.3 关键判断

SOP 后台侧已经基本具备真实数据能力，最适合优先接移动端。

当前主要缺口不是后台 SOP 管理，而是：

- 移动端 token 鉴权中间件
- 移动端 SOP 专用接口
- 移动端列表、搜索、详情、已读确认和未读提醒 UI

## 5. 移动端鉴权现状

已有员工 App 登录接口：

- `POST /api/mobile/auth/login`

已有员工 token 生成逻辑：

- `generateEmployeeAppToken`

Token 内含：

- `accountId`
- `ownerUserId`
- `employeeId`
- `expiresAt`

但目前没有看到通用移动端鉴权中间件。

后续需要新增：

- 读取 `Authorization: Bearer <token>`
- 校验 token 签名
- 校验 token 过期时间
- 重新查询 `employee_app_accounts`
- 校验账号是否 active
- 校验员工是否未 disabled / resigned
- 将结果写入 `req.employeeApp`

这是 SOP 移动端接口和打卡接口的共同前置依赖。

## 6. 本地接口运行状态

检查时尝试请求：

- `http://127.0.0.1:8788/api/mobile/attendance/today`
- `http://127.0.0.1:8788/api/mobile/sops`
- `http://127.0.0.1:8788/api/health`

结果：`8788` 当时没有监听。

说明：本次检查是代码和文件层面的现状检查；当时没有重新启动服务。

## 7. 结论

### 7.1 打卡功能结论

当前状态：后台考勤基础存在，但员工端真实打卡功能缺口较大。

主要缺口：

1. 移动端 token 鉴权中间件
2. 打卡位置字段或独立打卡表设计
3. Admin 打卡规则扩展
4. 移动端打卡接口
5. 移动端真实定位、位置描述、异常描述输入

### 7.2 SOP 功能结论

当前状态：后台 SOP 基础较完整，适合优先接员工端。

主要缺口：

1. 移动端 token 鉴权中间件
2. 移动端 SOP 列表接口
3. 移动端 SOP 详情接口
4. 移动端 SOP 阅读确认接口
5. 移动端 SOP 未读 / 更新提醒接口
6. 移动端 SOP 页面接真实数据

## 8. 推荐实施顺序

推荐下一步按以下顺序执行：

1. 新增 `/api/mobile` 鉴权中间件。
2. 先实现移动端 SOP 真实接口。
3. 接入移动端 SOP 列表、搜索、详情和阅读确认。
4. 新增 SOP 未读 / 更新提醒接口和红点展示。
5. 扩展打卡数据库字段和 Admin 打卡规则。
6. 实现员工端真实打卡接口。
7. 接入移动端定位、位置描述、异常描述输入和日期切换记录。

## 9. 推荐优先级

优先做 SOP。

原因：

- SOP 后台表、后台接口、后台页面已经基本完成。
- 移动端只需要补鉴权接口和页面接入。
- 打卡还涉及定位、位置描述、异常描述、打卡窗口、规则判断和表结构扩展，改动范围更大。

