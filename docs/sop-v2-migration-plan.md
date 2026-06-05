# SOP 管理模块 v2 迁移方案

## 目标

将 `admin-v2/src/components/SopManager.tsx` 的 SOP 管理模块迁移到当前 `apps/admin`，保持 v2 可见界面与操作体验，同时按当前后台架构逐步接入真实数据、账号隔离和可验证接口。

## 当前已完成的集成

- 已将 v2 SOP 组件复制到：`apps/admin/src/components/SopManager.tsx`
- 已在 `TabId` 中加入 `sop`
- 已在侧边栏加入 `SOP管理` 入口
- 已在 `App.tsx` 中挂载 SOP 页面
- 已补充前端类型：`SopAttachment`、`SopDocument`
- 已新增 Supabase 迁移：`sop_documents`、`sop_document_targets`、`sop_assets`、`sop_reads`
- 已新增管理端接口：SOP 列表、详情、创建、编辑、删除、员工模拟签收
- 已将 `SopManager` 从 `localStorage` 切换为账号级 API 读写

当前 SOP 数据源是数据库和 `/api/admin/sops` 系列接口；不要再把 `localStorage` 作为业务持久化兜底，否则会破坏 Google 账号隔离和签收统计一致性。

## 迁移经验原则

1. **先迁移 v2 可见界面，再写/接 API**
   - 不从旧后台字段倒推 UI。
   - 先让 v2 的页面、按钮、弹窗、列表、模拟手机端流程完整可见。
   - 再从页面实际需要的字段定义接口契约。

2. **接口契约按业务界面设计**
   - SOP 主列表需要：标题、发布人、发布时间、状态、受众范围、阅读统计、附件/图片摘要。
   - SOP 详情需要：正文 HTML、图片、附件、指定员工、签收记录。
   - 员工端模拟需要：当前员工可见 SOP 列表、已读/未读状态、签收时间。

3. **账号隔离必须在服务端完成**
   - 后端所有 SOP 表都必须带 `owner_user_id`。
   - 查询、创建、更新、删除、签收都必须按当前登录用户过滤。
   - 前端不能用 localStorage 作为最终业务数据源。

4. **SOP 是内容发布模块，不要混入考勤/薪资计算逻辑**
   - 只读取员工基础信息用于指定受众。
   - 不反向修改员工、考勤、薪资数据。
   - 不引入技术统计字段到主界面，保持业务管理视角。

5. **每个行为都要有可验证结果**
   - 发布后列表出现。
   - 编辑后详情同步更新。
   - 删除后员工端不可见。
   - 指定员工发布后只有目标员工可见。
   - 员工签收后阅读统计和详情记录更新。

## 建议数据模型

### `sop_documents`

- `id bigint primary key`
- `owner_user_id uuid not null`
- `title text not null`
- `content_html text not null`
- `target_type text not null`：`all` / `specific`
- `creator text not null`
- `status text not null`：`draft` / `published`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

### `sop_document_targets`

- `id bigint primary key`
- `owner_user_id uuid not null`
- `sop_id bigint not null references sop_documents(id)`
- `employee_id bigint not null references employees(id)`

仅当 `target_type = specific` 时写入。

### `sop_assets`

- `id bigint primary key`
- `owner_user_id uuid not null`
- `sop_id bigint not null references sop_documents(id)`
- `name text not null`
- `url text not null`
- `size_label text not null`
- `kind text not null`：`attachment` / `image`
- `sort_order integer not null default 0`

当前 v2 的图片 URL 与附件可先统一落此表，真实上传后再替换 URL 来源。

### `sop_reads`

- `id bigint primary key`
- `owner_user_id uuid not null`
- `sop_id bigint not null references sop_documents(id)`
- `employee_id bigint not null references employees(id)`
- `read_at timestamptz not null default now()`
- 唯一约束：`owner_user_id, sop_id, employee_id`

## API 契约建议

### 管理端

- `GET /api/admin/sops?keyword=`
  - 返回 SOP 主列表，包含阅读人数、目标人数、附件数、图片数。

- `GET /api/admin/sops/:id`
  - 返回 SOP 详情：正文、图片、附件、指定员工、签收记录。

- `POST /api/admin/sops`
  - 创建并发布/保存草稿。

- `PUT /api/admin/sops/:id`
  - 编辑标题、正文、受众、附件、图片。

- `DELETE /api/admin/sops/:id`
  - 删除或撤回 SOP。

### 员工端模拟

- `GET /api/admin/sops/employee-view?employeeId=`
  - 返回该员工可见的已发布 SOP。

- `POST /api/admin/sops/:id/read`
  - 指定员工签收学习。

## 实施步骤

### 阶段 1：界面基线落地

- 保留当前已集成的 v2 SOP 页面。
- 确认侧边栏、标题、管理端模式、手机端模拟、起草/编辑/删除/签收流程可见。
- 验证 `npm run lint` 和 `npm run build`。

### 阶段 2：抽出前端数据适配层

- 在 `apps/admin/src/lib/api.ts` 增加 SOP API 方法。
- `SopManager.tsx` 初始化、保存、删除、签收均调用 API。
- 保留维护注释：SOP 必须走账号级 API，不能回退到浏览器缓存。

### 阶段 3：数据库迁移与后端接口

- 新增 Supabase migration：SOP 文档、目标员工、附件、阅读记录四组表。
- 在 `apps/admin/server/index.js` 增加 SOP routes。
- 所有查询必须按 `owner_user_id` 过滤。
- 后端返回字段直接匹配 `SopDocument` 或新的 SOP 前端类型。

### 阶段 4：前端接真实接口

- 页面初始化调用 `fetchSops`。
- 创建/编辑/删除调用后端后刷新列表或同步本地状态。
- 手机端员工可见性由后端 `employeeId` 过滤规则和前端当前列表共同约束。
- 签收调用 `markSopRead`，成功后刷新当前详情与统计。

### 阶段 5：验证

- `node --check apps/admin/server/index.js`
- `npm run lint`
- `npm run build`
- `supabase db push --dry-run`
- 本地 HTTP 验证：
  - 前端 `http://localhost:3000`
  - API `http://localhost:8788/api/health`
  - SOP 列表/详情/创建/签收接口

## 验收标准

- 侧边栏出现 `SOP管理`。
- 管理端可以查看、搜索、创建、编辑、删除 SOP。
- 可以选择全部员工或指定员工下发。
- 手机端模拟可以切换员工，并只看到该员工可见 SOP。
- 员工签收后，管理端阅读统计同步变化。
- 数据按登录账号隔离。
- 刷新页面后数据仍存在于数据库，而不是 localStorage。
