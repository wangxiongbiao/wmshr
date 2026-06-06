# Admin 数据看板加载速度优化设计文档

## 1. 背景

本次针对线上 `https://admin.dutylix.com` 的 Admin 数据看板加载速度做初步排查。测试范围包括：

- 线上 Admin 首页 HTML 响应耗时
- 首屏 JS / CSS 静态资源加载耗时
- `/api/admin/dashboard` 后端基础响应耗时
- Supabase 数据库直连查询耗时
- 数据看板底层查询字段与返回体大小

当前目标不是立即升级 Supabase / Vercel 免费额度，而是先确认慢点是否来自代码、数据结构和接口设计，避免用升级掩盖可优化问题。

## 2. 已测结论

### 2.1 线上访问入口

实际可访问入口为：

```text
https://admin.dutylix.com
```

其他入口状态：

- `https://admin.dutylix`：TLS 连接失败
- `http://admin.dutylix`：返回 502
- `http://admin.dutylix.com`：308 跳转后超时

因此后续性能测试以 `https://admin.dutylix.com` 为准。

### 2.2 首页 HTML 响应

连续 5 次访问首页 HTML：

- 1.18s
- 0.99s
- 2.27s
- 1.27s
- 1.40s

HTML 大小约 762 bytes，本体很小，但 TTFB 波动偏大，说明 Vercel / 网络链路 / Serverless 边缘响应存在波动。

### 2.3 静态资源

主要静态资源：

```text
/assets/index-BTjhFO46.js
/assets/index-C9970smu.css
```

测试结果：

- JS 原始大小约 1.37 MB，压缩传输约 426 KB，加载约 2.71s
- CSS 原始大小约 89.8 KB，压缩传输约 14.7 KB，加载约 1.30s

结论：Admin 首屏 JS 包偏大，是页面打开速度的重要压力点。

### 2.4 后端接口基础响应

未登录访问：

```text
/api/admin/dashboard
```

返回 401：

```json
{"error":"未登录，请先使用 Google 账号登录"}
```

连续 5 次耗时：

- 1.86s
- 1.03s
- 0.83s
- 1.16s
- 1.72s

即使未进入真实看板数据查询，后端函数基础响应也有 0.8s - 1.9s 波动。免费 Vercel Serverless 冷启动或边缘链路可能有影响，但不是唯一瓶颈。

### 2.5 数据库查询与返回体

最大样本账号：

- 员工：15 人
- 在职 / 试用：11 人
- 考勤计算结果：69 条

看板底层查询结果：

- `employees select *`
  - 15 行
  - 约 3.09 MB
  - 约 3.99s
- `employees` 不取 `photo`
  - 15 行
  - 约 6.5 KB
  - 约 1.19s
- `employees` 看板字段但包含 `photo`
  - 15 行
  - 约 3.08 MB
  - 约 5.93s
- `employees` 看板字段且不含 `photo`
  - 15 行
  - 约 2.5 KB
  - 约 2.23s
- `attendance_calculation_results select *`
  - 69 行
  - 约 55 KB
  - 约 1.71s
- `attendance_calculation_results` 看板字段
  - 69 行
  - 约 10.6 KB
  - 约 1.28s
- `attendance_config`
  - 1 行
  - 约 0.96s

结论：`employees.photo` 是当前数据看板接口返回体过大的最大风险点。只有 15 个员工就能导致 MB 级响应体，不应在看板接口中直接返回完整头像字段。

## 3. 当前问题定位

### 3.1 后端看板接口字段过宽

当前代码位置：

```text
apps/admin/server/index.js
```

接口：

```text
GET /api/admin/dashboard
```

当前核心查询：

```js
supabase
  .from("employees")
  .select("*")
  .eq("owner_user_id", ownerUserId)
  .order("id", { ascending: true })
```

问题：

- `select("*")` 会把 `photo` 等大字段一起拉回。
- 看板只需要 KPI、员工排行、部门统计和少量员工展示字段。
- 大字段会增加 Supabase 查询耗时、Vercel 函数处理耗时、网络传输耗时和浏览器 JSON 解析耗时。

### 3.2 Admin 首屏 bundle 偏大

Admin 当前是单包加载，用户打开后台时，即使只看数据看板，也可能加载员工、考勤、薪资、SOP 等多个模块代码。

问题：

- 首屏 JS 压缩后约 426 KB。
- 对免费 Vercel / 普通网络环境不友好。
- JS 下载和执行会拖慢首屏可交互时间。

### 3.3 免费额度有影响，但不是首要动作

免费 Supabase / Vercel 可能带来：

- Serverless 冷启动
- 边缘节点波动
- 数据库连接响应波动
- 免费实例资源限制

但当前更明显的问题是：

- 接口返回体不合理
- 大字段直接进入看板查询
- 前端 bundle 未拆分

因此现阶段不建议直接升级，应该先做代码与数据接口优化。

## 4. 优化目标

### 4.1 后端接口目标

`/api/admin/dashboard` 目标：

- 员工查询响应体从 MB 级降到 KB 级。
- 看板接口常规响应尽量控制在 1s - 2s 内。
- 只返回看板渲染必需字段。
- 不在看板接口直接返回完整头像大字段。

### 4.2 前端加载目标

Admin 首屏目标：

- 降低首屏 JS 下载体积。
- 数据看板模块优先可见。
- 非当前 tab 模块延迟加载。
- 避免打开看板时加载薪资、考勤、SOP 等非必要模块代码。

## 5. 后端优化设计

### 5.1 收窄 employees 查询字段

将 `/api/admin/dashboard` 中员工查询从：

```js
.select("*")
```

调整为只取看板需要字段，例如：

```js
.select("id, employee_no, name, nickname, dept, role, status, is_deleted")
```

如看板确实需要头像，不直接返回完整 `photo`，而是改为：

- `photo_url`
- `photo_thumbnail_url`
- 或前端按需懒加载员工头像

注意：如果当前数据库只有 `photo` 字段且存储 base64，需要另开迁移方案，不能在本次优化中直接删除字段或破坏员工详情展示。

### 5.2 收窄 attendance_calculation_results 查询字段

当前看板需要的计算字段主要包括：

- `employee_id`
- `date`
- `status`
- `valid_hours`
- `overtime_pay_hours`
- `overtime_pay`
- `has_exception`

可将：

```js
.select("*")
```

调整为：

```js
.select("employee_id, date, status, valid_hours, overtime_pay_hours, overtime_pay, has_exception")
```

如果后续看板新增字段，再按需补充，禁止恢复 `select("*")`。

### 5.3 避免循环内重复查找

当前部门统计中有按计算结果循环，再用 `activeEmployees.find(...)` 找员工的逻辑。数据量较小时影响不大，但可以在不改变业务结果的前提下建立 Map：

```js
const activeEmployeeMap = new Map(
  activeEmployees.map((employee) => [Number(employee.id), employee])
);
```

然后循环中使用：

```js
const employee = activeEmployeeMap.get(Number(row.employee_id));
```

这样避免员工数和考勤结果数增长后出现不必要的 O(n*m) 查找。

### 5.4 保持接口契约不变

本次优化只应改变查询字段和内部计算方式，不改变前端 `DashboardData` 的返回结构。

必须保持：

- `activeEmployeeCount`
- `totalEmployeeCount`
- `inactiveEmployeeCount`
- `dashboardDate`
- `todayWorkHours`
- `todayAverageWorkHours`
- `todayOvertimeHours`
- `todayOvertimeEstimatePay`
- `todayExceptionCount`
- `todayExceptionRate`
- `employeeStats`
- `departmentStats`
- `config`

前端不应因为本次后端优化而需要大改。

## 6. 前端优化设计

### 6.1 Admin 模块懒加载

当前 Admin 可按 tab 拆分：

- Dashboard
- Employees
- Attendance
- Payroll
- SOP

建议使用 `React.lazy` / 动态 import，将非首屏 tab 延迟加载。

原则：

- 默认 tab 是 `dashboard`，Dashboard 可以保留同步加载。
- Employees / Attendance / Payroll / SOP 改为按需加载。
- 加载时展示轻量 loading，不影响整体布局。

### 6.2 避免看板依赖非必要模块

检查 `apps/admin/src/App.tsx` 是否在顶部静态 import 了所有重模块组件。若是，应改为动态 import。

注意：

- 不要为了拆包重构业务状态。
- 不要改变 tab 行为。
- 不要改动无关 UI。
- 拆包后必须验证每个 tab 仍可打开。

### 6.3 图片加载策略

如果看板员工排行需要头像：

- 优先使用小尺寸 URL。
- 图片加 `loading="lazy"`。
- 不要把 base64 图片放进 dashboard JSON。

如果暂时没有缩略图能力：

- 看板先显示姓名首字母 / 默认头像。
- 员工详情页继续保留原 `photo` 展示能力。

## 7. 数据结构建议

### 7.1 头像字段长期方案

如果 `employees.photo` 当前保存 base64 大字段，建议后续迁移为：

- Supabase Storage 文件
- 数据库保存 URL / path
- 可选保存缩略图 URL

建议字段：

```text
photo_url
photo_thumbnail_url
```

迁移原则：

- 不直接删除旧 `photo`。
- 先兼容读取旧字段。
- 新上传走 Storage。
- 后台员工详情可逐步切换。
- 看板只使用缩略图或默认头像。

### 7.2 索引建议

看板查询常用条件：

- `owner_user_id`
- `date`
- `employee_id`

建议确认以下表已有索引：

- `employees(owner_user_id)`
- `attendance_calculation_results(owner_user_id, date)`
- `attendance_calculation_results(owner_user_id, employee_id)`
- `attendance_config(owner_user_id)`

如果没有，应通过 Supabase migration 增加索引，而不是只依赖升级套餐。

## 8. 验证方案

### 8.1 修改前基线

保留当前基线：

- 首页 HTML：约 1.0s - 2.3s
- JS 压缩加载：约 2.71s
- `/api/admin/dashboard` 未登录 401：约 0.8s - 1.9s
- `employees select *`：约 3.99s / 3.09 MB
- `employees` 不含 `photo`：约 1.19s / 6.5 KB

### 8.2 后端优化后验证

验证项：

1. 登录后打开数据看板，页面正常展示。
2. `/api/admin/dashboard` 返回结构不变。
3. dashboard 接口响应体明显降低。
4. 员工 KPI、工时排行、部门负荷诊断数据一致。
5. 员工详情页头像能力不受影响。

建议命令：

```bash
npm run build:admin
```

如有条件，再用真实浏览器登录抓取 Network：

- `/api/admin/dashboard` status
- response size
- waiting / content download time
- JSON parse 是否有明显阻塞

### 8.3 前端优化后验证

验证项：

1. `npm run build:admin` 成功。
2. 构建产物出现多个 chunk。
3. 首屏 JS 主包体积下降。
4. 默认进入 Dashboard 正常。
5. 切换 Employees / Attendance / Payroll / SOP 均正常。
6. 浏览器 Console 无动态导入错误。

## 9. 实施顺序

### 第一阶段：后端接口瘦身

优先级最高，风险较低。

任务：

1. 修改 `/api/admin/dashboard` 中 `employees` 查询字段。
2. 修改 `attendance_calculation_results` 查询字段。
3. 增加 `activeEmployeeMap`，避免循环内重复 find。
4. 保持返回结构不变。
5. 构建并测试。

成功判定：

- dashboard 接口响应体从 MB 级降到 KB 级。
- 页面展示不变。
- `npm run build:admin` 通过。

### 第二阶段：头像存储方案

任务：

1. 确认 `employees.photo` 存储形态。
2. 如果是 base64，设计迁移到 Supabase Storage。
3. 新增缩略图或默认头像策略。
4. 员工详情页兼容旧数据。
5. 看板不再依赖大字段。

成功判定：

- 看板接口永不返回大头像字段。
- 员工详情头像仍可用。
- 新上传头像不会继续扩大数据库行体积。

### 第三阶段：前端代码拆包

任务：

1. 按 tab 动态 import 非首屏模块。
2. 保持 Dashboard 默认加载。
3. 给懒加载模块增加轻量 loading。
4. 构建并检查 chunk 体积。
5. 浏览器逐个 tab 验证。

成功判定：

- admin 首屏 JS 主包体积下降。
- 所有模块正常打开。
- Console 无错误。

### 第四阶段：评估是否升级

完成前三阶段后重新测试。

如果仍出现以下情况，再考虑升级：

- 登录后的 `/api/admin/dashboard` 经常超过 2s。
- Supabase 简单单行查询仍稳定超过 1s。
- Vercel 函数冷启动明显影响用户日常使用。
- 免费额度已接近或超过限制。

升级判断：

- 数据库查询慢、连接波动大：优先考虑 Supabase 升级。
- API Serverless 冷启动明显：考虑 Vercel 升级或改后端部署形态。
- 静态资源下载慢：优先看 bundle 拆分和缓存策略，不急于升级。

## 10. 风险与注意事项

1. 不要直接删除 `employees.photo` 字段。
2. 不要在没有兼容方案前改变员工详情头像展示。
3. 不要把 `select("*")` 从一个接口移动到另一个接口隐藏问题。
4. 不要在本次优化中顺手重构整个 Admin 状态管理。
5. 不要改变 DashboardData 接口契约，除非同步修改前端类型和所有使用处。
6. 所有性能结论必须以实际测量结果为准，不能只凭代码直觉判断。

## 11. 当前建议

当前不建议马上升级免费额度。

推荐先执行：

1. 后端 dashboard 接口字段瘦身。
2. 处理 `photo` 大字段返回问题。
3. 重新测试真实登录后的 `/api/admin/dashboard`。
4. 再做 Admin 前端拆包。
5. 最后根据优化后数据决定是否升级 Supabase / Vercel。
