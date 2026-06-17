# Admin v3 三模块集成实施计划

> **For Hermes:** 当前处于 `/plan` 规划模式，只输出计划，不直接实现。后续执行时按任务逐项推进，并在每一阶段完成真实验证后再进入下一阶段。

**Goal:** 将 `admin-v3` 中的 **入库管理（goods）**、**费用核销/费用管理（expenses）**、**客户管理（customers）** 三个模块完整集成到当前 `apps/admin`，实现与现有后台的路由、鉴权、数据模型、接口层、服务端持久化、UI 交互和稳定性策略一致，达到可长期维护、可真实使用的生产级状态。

**Architecture:** 不直接搬运 `admin-v3` 原型的状态管理和本地存储逻辑，而是以当前 `apps/admin` 为主系统，把 v3 原型中的业务概念、页面结构和交互意图抽取出来，重新接入当前 admin 的 `TabId + adminRoute + Sidebar + lib/api.ts + server/index.js` 架构。前端只保留可复用的 UI/交互设计，数据层统一收敛到当前 admin 的 API 和服务端持久化机制。

**Tech Stack:** React + TypeScript + React Router + 当前 `apps/admin/src/lib/api.ts` 请求层 + `apps/admin/server/index.js` 后端接口层 + 现有 Supabase session 鉴权链路。

---

## 1. 当前事实与规划依据

### 1.1 当前 admin 现状
- 当前一级业务页签定义在 `apps/admin/src/types.ts:6`
  - `TabId = 'dashboard' | 'employees' | 'attendance' | 'payroll' | 'sop'`
- 当前合法后台路由集中定义在 `apps/admin/src/lib/adminRoute.ts`
  - `ADMIN_TABS`
  - `DEFAULT_ADMIN_TAB`
  - `buildAdminRoute()`
  - `parseAdminRoute()`
- 当前 `apps/admin/src/App.tsx` 已有：
  - 路由化 tab 切换
  - 已访问 tab 缓存
  - 鉴权与 session 处理
  - 顶层 Header / Sidebar / workspace bootstrap / 数据预取节奏
- 当前前端 API 入口集中在 `apps/admin/src/lib/api.ts`
  - 已存在 `request()` 统一鉴权请求封装
  - 已存在员工、考勤、薪资、workspace bootstrap 等模式可复用
- 当前后端集中入口为：
  - `apps/admin/server/index.js`
  - 辅助模块 `apps/admin/server/attendance-v2.js`

### 1.2 v3 原型现状
- `admin-v3/src/types.ts` 中已扩展 tab：
  - `goods`
  - `expenses`
  - `customers`
  - 以及 `products`、`orders`
- `admin-v3/src/App.tsx` 已挂接：
  - `GoodsManager`
  - `ExpenseManager`
  - `CustomerManager`
- 但这三个模块当前本质仍是**原型态**：
  - 使用 `useState`
  - 使用 `localStorage`
  - 使用 `INITIAL_GOODS` 等前端种子数据
  - 没有接入当前 admin 的真实 API / 服务端持久化

### 1.3 本次集成的核心判断
**本次不是“复制三个组件”任务，而是“把三个原型业务域正式落入当前 admin 架构”的系统集成任务。**

因此必须同步完成：
1. 信息架构扩展
2. 类型系统扩展
3. API 契约设计
4. 服务端持久化实现
5. 前端页面迁移与重写
6. 与现有员工/权限/路由/语言/加载状态的融合
7. 真实验证与回归稳定性保障

---

## 2. 集成目标定义

### 2.1 模块范围（本轮必须完成）
1. **入库管理**
   - 入库单列表
   - 到货/签收/入库状态流转
   - SKU 明细
   - 签收人、签收时间、凭证/图片、备注
2. **费用核销 / 费用管理**
   - 费用申请/录入
   - 费用类型、支付方式、金额、币种
   - 凭证附件
   - 审批状态流转（pending / approved / rejected）
   - 审批人、审批说明
3. **客户管理**
   - 客户档案
   - 联系信息
   - 结算币种
   - 可用额度 / 信用额度
   - 计费模板
   - 店铺绑定信息
   - 信用流水/充值消耗记录（如果决定首期纳入）

### 2.2 本轮默认不承诺一次性做完的扩展模块
以下模块在 v3 中存在，但不自动纳入本次“必须交付范围”，避免 scope 膨胀：
- `products`
- `orders`

但规划时要为它们留好接口和数据模型的兼容余地，因为：
- `goods` 与 `customers` 会天然影响 `products`
- `customers` 会天然影响 `orders`

### 2.3 成功标准
用户最终应得到：
- 当前 admin 左侧导航中出现三个正式模块入口
- URL、路由、标题、语言切换都与现有 admin 一致
- 数据不再存 localStorage，而是走当前 admin 真实 API
- 页面刷新后数据不丢失
- 基础新增/编辑/状态变更可真实保存并重新加载
- 与现有员工体系、鉴权体系、UI 规范不冲突
- 不破坏现有 `dashboard / employees / attendance / payroll / sop`

---

## 3. 总体实施策略

### 3.1 采用“业务域重建 + 渐进挂载”，不采用“整体拷贝”
原因：
- 当前 admin 已有成熟路由与 API 分层
- `admin-v3` 的三个模块是原型实现，数据层不可直接上线
- 原型中的类型和当前 admin 类型命名、字段口径并不一致
- 如果整体搬运，会把 localStorage、示例数据、模拟交互、状态耦合一并带进主系统

### 3.2 推荐顺序
按依赖关系推进：
1. **客户管理**
2. **入库管理**
3. **费用核销**

原因：
- 入库管理记录里明显依赖客户信息
- 费用核销经常需要员工、审批人及可能的客户/业务单据关联
- 客户域先落地后，后续 goods/expenses 的筛选与关联会更稳定

### 3.3 每个模块都按“两层迁移”执行
1. **业务层迁移**：梳理字段、状态机、接口、持久化
2. **界面层迁移**：复用或重写 v3 组件结构、操作流与样式

---

## 4. 数据与架构设计原则

### 4.1 路由原则
需要扩展：
- `apps/admin/src/types.ts`
- `apps/admin/src/lib/adminRoute.ts`
- `apps/admin/src/components/Sidebar.tsx`
- `apps/admin/src/App.tsx`

新增正式一级 tab：
- `goods`
- `expenses`
- `customers`

### 4.2 API 原则
所有新模块都必须走 `apps/admin/src/lib/api.ts` 新增接口函数，不允许在页面组件里直接 `fetch()`。

建议 API 分组：
- `/api/admin/customers`
- `/api/admin/customer-credit-logs`
- `/api/admin/goods`
- `/api/admin/expenses`

### 4.3 服务端原则
后端先在 `apps/admin/server/index.js` 中按现有风格补齐接口；若逻辑过重，再抽出：
- `apps/admin/server/customers.js`
- `apps/admin/server/goods.js`
- `apps/admin/server/expenses.js`

是否拆分文件取决于实现阶段复杂度，但**计划上按可拆分结构设计**，避免 `index.js` 继续失控膨胀。

### 4.4 持久化原则
禁止继续沿用：
- `localStorage.getItem()`
- `localStorage.setItem()`
- `INITIAL_*` 作为真实数据源

真实数据源应统一到当前 admin 后端的持久化方式。实现前必须先查清：
1. 当前员工、考勤、薪资数据是如何落盘/落库的
2. 新模块应复用同一存储层还是新增结构
3. 是否已有 workspace 级隔离或 ownerUserId 维度

### 4.5 UI 原则
- 尽量复用当前 admin 的视觉组件风格
- 保持 `Header / Sidebar / Pagination / SearchableSelect / ModalShell / DialogProvider` 一致体验
- 只迁移 v3 的业务交互，不迁移其不符合当前系统规范的状态管理方式

---

## 5. 模块级设计计划

## 5.1 客户管理（第一优先级）

### 目标
先建立商户/客户主数据域，作为 goods/expenses 的上游关联基础。

### 功能范围
- 客户列表
- 客户新增/编辑/启停用
- 联系信息维护
- 币种/额度/模板维护
- 店铺绑定列表展示
- 信用流水展示（首期可只读，后续再补录入）

### 前端 likely files
- 修改 `apps/admin/src/types.ts`
- 修改 `apps/admin/src/lib/adminRoute.ts`
- 修改 `apps/admin/src/components/Sidebar.tsx`
- 修改 `apps/admin/src/App.tsx`
- 修改 `apps/admin/src/lib/api.ts`
- 新建 `apps/admin/src/components/CustomerManager.tsx`
- 可选新建 `apps/admin/src/components/customer/*`

### 后端 likely files
- 修改 `apps/admin/server/index.js`
- 可选新建 `apps/admin/server/customers.js`

### 关键设计点
- 客户状态字段统一枚举口径
- 店铺绑定结构需要明确是否只是展示，还是允许编辑
- 信用额度与可用额度需要区分：
  - `creditLimit`
  - `availableLimit`
- 信用流水是否支持手动追加/核销，需在实施前明确首期边界

### 验收要点
- 客户 CRUD 可真实保存
- 刷新页面数据不丢失
- 可在其它模块中复用客户筛选/关联

---

## 5.2 入库管理（第二优先级）

### 目标
把 v3 的货物到货/签收/入库原型转为正式后台模块。

### 功能范围
- 入库单列表
- 状态筛选（pending / arrived / completed）
- 新建入库单
- 编辑基础信息
- 记录签收信息
- 记录 SKU 明细 / 麦头 / 件数
- 附件/图片凭证
- 关联客户
- 关联员工签收人

### 前端 likely files
- 修改 `apps/admin/src/types.ts`
- 修改 `apps/admin/src/lib/api.ts`
- 修改 `apps/admin/src/App.tsx`
- 新建 `apps/admin/src/components/GoodsManager.tsx`
- 可选拆分：
  - `apps/admin/src/components/goods/GoodsList.tsx`
  - `apps/admin/src/components/goods/GoodsFormModal.tsx`
  - `apps/admin/src/components/goods/GoodsDetailDrawer.tsx`

### 后端 likely files
- 修改 `apps/admin/server/index.js`
- 可选新建 `apps/admin/server/goods.js`

### 关键设计点
- `GoodsRecord` 需要重新映射到当前 admin 类型体系
- `receiverId / receiverName` 应优先关联现有员工数据
- 图片/附件保存方式必须与当前系统现有上传/存储方式兼容
- 入库状态流转要明确定义为后端校验规则，而不是前端随意改枚举

### 验收要点
- 入库单可以新增、编辑、查询、状态变更
- 员工与客户可以从真实数据源选择
- 页面刷新后状态和明细保持一致

---

## 5.3 费用核销 / 费用管理（第三优先级）

### 目标
将原型里的费用录入与审批流，改造成正式的 admin 费用模块。

### 功能范围
- 费用列表
- 新建费用记录
- 类型/支付方式/金额/币种录入
- 凭证上传/展示
- 申请人/支付人/审批人关联
- 审批通过/拒绝
- 审批备注
- 状态筛选与关键字段搜索

### 前端 likely files
- 修改 `apps/admin/src/types.ts`
- 修改 `apps/admin/src/lib/api.ts`
- 修改 `apps/admin/src/App.tsx`
- 新建 `apps/admin/src/components/ExpenseManager.tsx`
- 可选拆分：
  - `apps/admin/src/components/expenses/ExpenseList.tsx`
  - `apps/admin/src/components/expenses/ExpenseFormModal.tsx`
  - `apps/admin/src/components/expenses/ExpenseApprovalModal.tsx`

### 后端 likely files
- 修改 `apps/admin/server/index.js`
- 可选新建 `apps/admin/server/expenses.js`

### 关键设计点
- “费用核销”要先定义业务语义：
  - 是审批通过即算核销
  - 还是存在单独的核销/结清动作
- 申请人、支付人、审批人优先复用现有员工体系
- 如果费用要关联客户/入库单，需在数据模型中预留外键字段

### 验收要点
- 费用记录增改查、审批流、附件展示都能真实工作
- 审批状态切换后刷新页面仍准确
- 不出现仅前端状态变化、后端没落地的假成功

---

## 6. 分阶段执行计划

### Phase 0：实施前建模与差异收口
**Objective:** 先确认新业务域在现有系统中的落点与字段映射，避免后面反复返工。

**Files:**
- Modify: `apps/admin/src/types.ts`
- Inspect: `apps/admin/src/lib/api.ts`
- Inspect: `apps/admin/server/index.js`
- Inspect: `admin-v3/src/types.ts`
- Inspect: `admin-v3/src/App.tsx`

**Tasks:**
1. 梳理 `Customer / GoodsRecord / ExpenseRecord` 与当前 `Employee / AppConfig / Attendance / Payroll` 的字段边界
2. 识别哪些字段可直接复用现有员工/语言/分页/UI 模式
3. 标记哪些原型字段属于演示性质、不可直接带入生产
4. 明确三个模块首期必须字段和可延期字段
5. 产出模块字段映射表与状态机说明

**Exit criteria:**
- 三个模块的字段映射表完成
- 三个模块的状态流转定义完成
- 首期范围冻结

---

### Phase 1：扩展 admin 顶层信息架构
**Objective:** 让当前 admin 在不接入真实业务前，先具备三个新模块的正式挂载能力。

**Files:**
- Modify: `apps/admin/src/types.ts`
- Modify: `apps/admin/src/lib/adminRoute.ts`
- Modify: `apps/admin/src/components/Sidebar.tsx`
- Modify: `apps/admin/src/App.tsx`

**Tasks:**
1. 扩展 `TabId`
2. 扩展 `ADMIN_TABS` 与默认路由判断
3. 扩展 Sidebar 导航项
4. 在 `App.tsx` 中挂入新 tab 占位页/空状态页
5. 校验语言路由切换、直接 URL 打开、刷新后落点是否正常

**Exit criteria:**
- `/[lang]/customers`
- `/[lang]/goods`
- `/[lang]/expenses`
均可进入且不破坏现有页面

---

### Phase 2：客户管理全链路落地
**Objective:** 先打通客户域的前后端与持久化，为后续 goods/expenses 提供主数据基础。

**Files:**
- Modify: `apps/admin/src/types.ts`
- Modify: `apps/admin/src/lib/api.ts`
- Modify: `apps/admin/src/App.tsx`
- Create: `apps/admin/src/components/CustomerManager.tsx`
- Modify/Create: `apps/admin/server/index.js`
- Optional Create: `apps/admin/server/customers.js`

**Tasks:**
1. 定义客户相关 TS 类型
2. 定义客户 API 接口函数
3. 实现后端 customers 列表/详情/新增/更新/状态切换接口
4. 实现前端列表页和表单交互
5. 接入真实加载、错误态、提交态、刷新重载
6. 验证与 Sidebar / Header / 标题联动正确

**Exit criteria:**
- 客户模块独立可用
- 真实保存与刷新可回显
- 可供 goods/expenses 选择客户

---

### Phase 3：入库管理全链路落地
**Objective:** 在客户域可用基础上接入 goods 模块。

**Files:**
- Modify: `apps/admin/src/types.ts`
- Modify: `apps/admin/src/lib/api.ts`
- Modify: `apps/admin/src/App.tsx`
- Create: `apps/admin/src/components/GoodsManager.tsx`
- Modify/Create: `apps/admin/server/index.js`
- Optional Create: `apps/admin/server/goods.js`

**Tasks:**
1. 设计 goods 类型与状态枚举
2. 设计 goods 列表/详情/新增/编辑/状态变更 API
3. 实现后端持久化
4. 实现前端列表与表单
5. 对接客户与员工选择器
6. 对接附件/图片处理
7. 验证状态流转与列表筛选

**Exit criteria:**
- goods 模块从创建到状态变更全链路可用
- 关联客户/员工正常
- 刷新不丢数据

---

### Phase 4：费用管理全链路落地
**Objective:** 完成费用记录与审批流。

**Files:**
- Modify: `apps/admin/src/types.ts`
- Modify: `apps/admin/src/lib/api.ts`
- Modify: `apps/admin/src/App.tsx`
- Create: `apps/admin/src/components/ExpenseManager.tsx`
- Modify/Create: `apps/admin/server/index.js`
- Optional Create: `apps/admin/server/expenses.js`

**Tasks:**
1. 设计 expense 类型与审批状态枚举
2. 设计 expense 列表/创建/编辑/审批 API
3. 实现后端持久化与审批校验
4. 实现前端列表、录入、审批 UI
5. 对接员工选择器与（可选）客户关联
6. 验证提交态、审批态、刷新回显

**Exit criteria:**
- 费用模块全链路可用
- 审批状态真实持久化
- 不依赖前端本地缓存

---

### Phase 5：融合与回归稳定性阶段
**Objective:** 把三个新模块真正变成“当前 admin 的一部分”，而不是旁路页面。

**Files:**
- Modify: `apps/admin/src/App.tsx`
- Modify: `apps/admin/src/components/Sidebar.tsx`
- Modify: `apps/admin/src/lib/api.ts`
- Modify: `apps/admin/server/index.js`
- Modify: 相关新旧组件文件

**Tasks:**
1. 统一页面标题、多语言文案、空状态、错误态、提交态
2. 校验 visitedTabs 缓存与新页面切换行为
3. 校验页面返回、刷新、直链访问
4. 校验与现有 employees / attendance / payroll / sop 无耦合破坏
5. 清理原型残留逻辑（localStorage、mock 文案、演示 alert）
6. 根据最终实现补齐注释与文档

**Exit criteria:**
- 三个模块与现有 admin 风格、路由、状态节奏一致
- 无明显原型残留行为
- 不影响旧模块正常运行

---

## 7. 测试与验证计划

## 7.1 功能验证
每个模块至少验证：
- 列表加载
- 新建
- 编辑
- 状态切换
- 刷新回显
- 异常提示
- 空数据状态

## 7.2 路由验证
验证以下 URL：
- `/zh/customers`
- `/zh/goods`
- `/zh/expenses`
- 以及其它语言前缀路由

检查：
- 直接访问
- 页面刷新
- 从 Sidebar 进入
- 切换语言后路径保留 tab

## 7.3 融合验证
检查：
- 新模块是否复用了统一鉴权
- 新模块是否复用了统一 API error handling
- 新模块是否影响现有 `attendance` 和 `payroll` 的 loading / submitting 状态
- 新模块是否引入全局状态串扰

## 7.4 稳定性验证
检查：
- 刷新后数据一致
- 提交失败后表单状态和提示合理
- 多次切 tab 不出现重复请求风暴
- 无 localStorage 作为真实依赖

## 7.5 构建与运行验证
实施时必须真实执行并记录结果：
- admin 前端构建
- admin server 启动
- 三个模块真实访问
- 至少一轮端到端手工回归

---

## 8. 风险与难点

### 风险 1：原型字段与现有系统字段口径不一致
影响：类型映射、接口定义、后端落地都可能反复改。

应对：先做字段映射表，再写代码。

### 风险 2：原型默认依赖 localStorage 和演示数据
影响：如果直接搬代码，会产生“看起来能用，刷新即丢”的假集成。

应对：数据层全部重写进 `lib/api.ts + server`。

### 风险 3：`apps/admin/server/index.js` 已较大
影响：继续堆逻辑会提升维护成本和出错概率。

应对：计划上允许逐步拆分为域模块文件。

### 风险 4：三个模块之间存在天然依赖
影响：如果先做 goods/expenses，再补 customers，会导致字段回填与页面返工。

应对：先做 customers。

### 风险 5：附件/图片处理路径不明确
影响：goods / expenses 都可能因上传策略不清晰而卡住。

应对：在实施前先核对当前 admin 是否已有附件上传模式可复用。

---

## 9. 开放问题（实施前建议先确认）

1. **费用“核销”在你的业务里，是否等于审批通过？**
   - 还是审批通过后还需要一个单独“结清/核销完成”动作？
2. **客户信用流水首期要不要支持写入，只读展示是否够用？**
3. **入库单附件与费用凭证，是否必须接入当前正式上传存储？**
   - 还是首期允许先留文本/URL 字段？
4. **产品管理、订单管理是否明确不在本轮范围内？**
   - 建议本轮先不做，但要为后续兼容预留字段。
5. **三个模块是否需要权限区分？**
   - 例如某些账号只能看费用、不能审批。

---

## 10. 推荐实施顺序（结论版）

1. 冻结字段映射与状态定义
2. 扩展 admin 顶层 tab / route / sidebar
3. 先落客户管理全链路
4. 再落入库管理全链路
5. 最后落费用管理全链路
6. 做融合清理与稳定性回归

---

## 11. 执行时最可能变更的文件清单

### 必改（高概率）
- `apps/admin/src/types.ts`
- `apps/admin/src/lib/adminRoute.ts`
- `apps/admin/src/lib/api.ts`
- `apps/admin/src/App.tsx`
- `apps/admin/src/components/Sidebar.tsx`
- `apps/admin/server/index.js`

### 大概率新增
- `apps/admin/src/components/CustomerManager.tsx`
- `apps/admin/src/components/GoodsManager.tsx`
- `apps/admin/src/components/ExpenseManager.tsx`

### 可能新增（按复杂度拆分）
- `apps/admin/src/components/customers/*`
- `apps/admin/src/components/goods/*`
- `apps/admin/src/components/expenses/*`
- `apps/admin/server/customers.js`
- `apps/admin/server/goods.js`
- `apps/admin/server/expenses.js`

### 参考来源（只作迁移参考，不直接照搬）
- `admin-v3/src/App.tsx`
- `admin-v3/src/types.ts`
- `admin-v3/src/components/CustomerManager.tsx`
- `admin-v3/src/components/GoodsManager.tsx`
- `admin-v3/src/components/ExpenseManager.tsx`

---

## 12. 最终建议

这次集成应该按“**把 v3 原型业务域产品化**”来做，而不是“把 v3 页面复制进来”。

如果按这个计划执行，最终得到的会是：
- 在当前 admin 内长期可维护的三模块
- 与现有员工/考勤/薪资/SOP 同一套路由和数据层
- 真正可保存、可刷新、可回归、可扩展到 products/orders 的后台基础

如果直接图快搬组件，后续一定会在：
- 持久化
- 字段口径
- 路由融合
- 状态串扰
- mock 残留
这些地方反复返工。
