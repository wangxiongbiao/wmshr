# Admin v3 三模块集成计划（UI 直接采用 v3 版）

> **For Hermes:** 当前处于 `/plan` 规划模式，只输出计划，不直接实现。此版本替代上一版“以当前 admin 为主重建 UI”的方案，新的前提是：**前端 UI 原型直接使用 `admin-v3` 的三模块界面，只做系统通用适配与数据层接入。**

**Goal:** 将 `admin-v3` 中的 **客户管理（customers）**、**入库管理（goods）**、**费用管理/费用核销（expenses）** 三个模块，以 **v3 原型 UI 为直接基础** 集成到当前 `apps/admin`，完成路由、导航、鉴权、通用样式、请求层、后端持久化和稳定性适配，使其在当前系统中可真实运行、可刷新保存、可长期维护。

**Architecture:** 采用“**UI 直用 + 系统适配**”策略：保留 `admin-v3` 三个模块现有页面结构、表单布局、列表交互和核心视觉表达，不再重写页面；仅围绕当前主系统的 `TabId / adminRoute / Sidebar / Header / lib/api.ts / server/index.js / 鉴权 / 多语言 / 通用组件规范` 做包裹式适配。数据层从 `localStorage + mock 数据` 替换为当前 admin 的真实 API 和服务端持久化。

**Tech Stack:** React + TypeScript + React Router + 当前 `apps/admin/src/lib/api.ts` 统一请求层 + `apps/admin/server/index.js` 后端接口层 + Supabase session 鉴权链路。

---

## 1. 本次计划的核心前提

### 1.1 新的实施口径
你已明确：
- **UI 原型直接使用 v3 版本**
- 只做一些**系统通用界面适配**
- 不希望我重新按当前 admin 风格重做三套页面

所以本次计划的重点变成：
1. **保留 v3 三模块 UI**
2. **把 v3 UI 嵌入当前 admin 的系统骨架**
3. **把 v3 的本地状态/原型数据改接真实后端**
4. **尽量少动 UI 结构，只动系统接缝层**

### 1.2 什么叫“系统通用界面适配”
这里统一定义为以下几类改动：
- 接入当前 admin 的左侧导航、顶部标题、语言路由
- 统一页面外层容器、高度、滚动、间距、响应式边界
- 统一按钮、弹窗、提示、空状态、错误态的系统行为
- 统一鉴权、加载、提交、异常反馈逻辑
- 必要时把 v3 中明显不符合当前系统的孤立样式/硬编码文案做轻量修正

### 1.3 什么不属于这次“轻适配”范围
以下不作为本次首选策略：
- 按当前 admin 规范重新设计三个页面
- 重构三模块为全新组件树
- 提前实现 `products`、`orders`
- 大规模替换 v3 现有交互布局

---

## 2. 当前事实与差异判断

### 2.1 当前主系统 `apps/admin`
已有稳定基础：
- 路由 tab：`dashboard / employees / attendance / payroll / sop`
- 系统级路由解析：`apps/admin/src/lib/adminRoute.ts`
- 系统壳：`apps/admin/src/App.tsx`
- 导航：`apps/admin/src/components/Sidebar.tsx`
- 请求层：`apps/admin/src/lib/api.ts`
- 服务端：`apps/admin/server/index.js`
- 鉴权：基于 Supabase session 的统一 request 封装

### 2.2 v3 三模块现状
`admin-v3` 中我们要用的目标模块：
- `CustomerManager`
- `GoodsManager`
- `ExpenseManager`

这三者目前的优势：
- 页面结构已经成型
- 列表/表单/操作按钮/状态流转 UI 已经有雏形
- 业务意图表达清楚，适合直接作为前端原型落地

当前的主要问题：
- 用 `useState` 做本地内存态
- 用 `localStorage` 做伪持久化
- 带初始 mock 数据
- 未接当前 admin 路由/导航/鉴权/请求/真实后端

### 2.3 结论
**这次最优路径不是“重做 UI”，而是“以 v3 UI 为壳，替换数据层并接入主系统外壳”。**

---

## 3. 集成目标

### 3.1 本轮必须完成的模块
1. **客户管理（customers）**
2. **入库管理（goods）**
3. **费用管理/费用核销（expenses）**

### 3.2 最终交付效果
用户最终应得到：
- 在当前 admin 左侧菜单能进入这 3 个模块
- 页面主体视觉与交互基本沿用 v3 原型
- URL、标题、语言切换遵循当前 admin 机制
- 不再依赖 localStorage
- 所有关键操作走当前 admin API 和真实后端
- 页面刷新后数据不丢
- 与现有 `employees / attendance / payroll / sop` 并存稳定

### 3.3 首期不纳入范围
除非你后面追加，否则首期不做：
- `products`
- `orders`

但字段和结构上要为后续接入留余地，尤其：
- `customers` 未来会影响 `orders`
- `goods` 未来会影响 `products`

---

## 4. 总体策略：UI 直用，数据层重接，系统壳适配

### 4.1 三层改造模型
本次按三层处理，不推倒重来：

#### 第 1 层：系统壳接入层
把 v3 三模块正式挂到当前 admin：
- `TabId`
- `adminRoute`
- `Sidebar`
- `App.tsx`
- 页面标题 / 语言路由 / 顶层容器

#### 第 2 层：数据接缝替换层
把 v3 模块里的：
- `useState` 本地业务数据
- `localStorage`
- `INITIAL_*` mock 数据
替换为：
- `apps/admin/src/lib/api.ts`
- 后端真实接口
- 页面级 `loading / submitting / error / refetch`

#### 第 3 层：通用 UI 适配层
只修正与当前系统冲突的部分：
- 外层布局高度/滚动
- 统一提示方式
- 统一 modal / dialog 入口
- 统一语言文案接入策略
- 统一空状态和错误态

### 4.2 不做的事情
- 不把 v3 的三个模块拆碎后重新按当前 admin 风格重写
- 不优先做视觉统一工程
- 不先追求所有组件完全共用
- 不为了“代码整洁”牺牲交付速度，把原型 UI 过早重构掉

---

## 5. 推荐实施顺序

### 顺序结论
1. **系统壳接入**
2. **客户管理**
3. **入库管理**
4. **费用管理**
5. **统一适配与稳定性回归**

### 原因
- 三模块先能进系统，后面才能并行验证 UI 接入是否顺
- `goods` 依赖客户信息更明显
- `expenses` 往往也会依赖员工/审批人/可能的客户维度
- 先打通 `customers` 可以减少表单回填与筛选逻辑返工

---

## 6. 分阶段实施计划

## Phase 0：接入前审计与最小保留原则确认
**Objective:** 先确认 v3 三个模块哪些 UI 可以原样保留，哪些必须做系统适配，避免实施中边改边猜。

**Files:**
- Inspect: `admin-v3/src/App.tsx`
- Inspect: `admin-v3/src/components/CustomerManager.tsx`
- Inspect: `admin-v3/src/components/GoodsManager.tsx`
- Inspect: `admin-v3/src/components/ExpenseManager.tsx`
- Inspect: `apps/admin/src/App.tsx`
- Inspect: `apps/admin/src/components/Sidebar.tsx`
- Inspect: `apps/admin/src/lib/api.ts`

**Tasks:**
1. 标出 v3 三模块中可直接复用的 UI 区块
2. 标出必须替换的数据来源和状态处理代码
3. 标出必须做的系统级适配点：路由、标题、布局、提示、弹窗、i18n
4. 冻结“尽量不动 UI”的边界，避免后续越改越像重写

**Exit criteria:**
- 每个模块的“保留区 / 替换区 / 适配区”清单完成
- 不再存在“到底要不要重做 UI”的歧义

---

## Phase 1：主系统骨架扩展（先让 3 个模块挂进去）
**Objective:** 在当前 admin 中加入 `customers / goods / expenses` 三个正式 tab 与路由落点。

**Files:**
- Modify: `apps/admin/src/types.ts`
- Modify: `apps/admin/src/lib/adminRoute.ts`
- Modify: `apps/admin/src/components/Sidebar.tsx`
- Modify: `apps/admin/src/App.tsx`

**Tasks:**
1. 扩展 `TabId`
2. 扩展 `ADMIN_TABS`
3. 扩展 `buildAdminRoute / parseAdminRoute`
4. 在 Sidebar 中加入 3 个正式导航入口
5. 在 `App.tsx` 先为 3 个模块挂上占位组件或直接挂接引入组件
6. 验证：直链访问、刷新、语言切换、菜单跳转

**Exit criteria:**
- `/[lang]/customers`
- `/[lang]/goods`
- `/[lang]/expenses`
均可进入
- 不影响原有 5 个模块

---

## Phase 2：v3 UI 迁入当前 admin（先迁壳，不改数据层）
**Objective:** 把 v3 的 `CustomerManager / GoodsManager / ExpenseManager` 先作为 UI 壳挂进主系统，尽快看到真实集成形态。

**Files:**
- Create/Copy-adapt: `apps/admin/src/components/CustomerManager.tsx`
- Create/Copy-adapt: `apps/admin/src/components/GoodsManager.tsx`
- Create/Copy-adapt: `apps/admin/src/components/ExpenseManager.tsx`
- Modify: `apps/admin/src/App.tsx`
- Optional Create: `apps/admin/src/components/admin-v3-shared/*`

**Tasks:**
1. 从 `admin-v3` 迁入三个目标组件
2. 修正 import 路径、类型引用、共享图标/工具函数依赖
3. 去掉与当前 admin 冲突的独立壳层结构
4. 让页面在当前 admin 内容区中正确显示
5. 修正高度、滚动、边距、容器宽度等系统适配项

**Exit criteria:**
- 三个页面 UI 能在当前 admin 中直接打开
- 视觉主体保持 v3 风格
- 不因布局冲突导致页面不可用

---

## Phase 3：客户管理数据层替换（优先）
**Objective:** 在保留 v3 客户管理 UI 的前提下，把数据层从 localStorage 替换成当前 admin 的真实 API。

**Files:**
- Modify: `apps/admin/src/types.ts`
- Modify: `apps/admin/src/lib/api.ts`
- Modify: `apps/admin/src/components/CustomerManager.tsx`
- Modify: `apps/admin/src/App.tsx`
- Modify/Create: `apps/admin/server/index.js`
- Optional Create: `apps/admin/server/customers.js`

**Tasks:**
1. 定义客户类型在当前 admin 中的正式版本
2. 在 `lib/api.ts` 新增 customers 相关请求函数
3. 在服务端新增客户列表/新增/编辑/状态变更接口
4. 把 `CustomerManager` 中 `localStorage`/本地 state 读取替换为 API 加载
5. 把新增/编辑/启停用操作替换为真实提交
6. 接入 `loading / submitting / error / refetch`

**Exit criteria:**
- 客户模块 UI 仍保持 v3 风格
- 数据来自真实后端
- 刷新不丢数据
- 可为 goods / expenses 提供客户来源

---

## Phase 4：入库管理数据层替换
**Objective:** 保留 v3 入库 UI，替换为真实后端数据与状态流转。

**Files:**
- Modify: `apps/admin/src/types.ts`
- Modify: `apps/admin/src/lib/api.ts`
- Modify: `apps/admin/src/components/GoodsManager.tsx`
- Modify: `apps/admin/src/App.tsx`
- Modify/Create: `apps/admin/server/index.js`
- Optional Create: `apps/admin/server/goods.js`

**Tasks:**
1. 重新定义 `GoodsRecord` 在当前 admin 中的正式字段
2. 新增 goods 列表/新增/编辑/状态变更 API
3. 用真实 API 替换页面内的 mock 数据与本地状态源
4. 接入客户选择、员工选择的真实数据
5. 处理附件/图片字段的首期策略
6. 接入 loading / error / submit / refetch

**Exit criteria:**
- v3 入库页面保留
- 入库单数据真实可存可查
- 状态流转真实生效
- 刷新后回显正确

---

## Phase 5：费用管理数据层替换
**Objective:** 保留 v3 费用 UI，替换为真实后端接口和审批流。

**Files:**
- Modify: `apps/admin/src/types.ts`
- Modify: `apps/admin/src/lib/api.ts`
- Modify: `apps/admin/src/components/ExpenseManager.tsx`
- Modify: `apps/admin/src/App.tsx`
- Modify/Create: `apps/admin/server/index.js`
- Optional Create: `apps/admin/server/expenses.js`

**Tasks:**
1. 明确费用记录正式字段与审批状态口径
2. 新增 expense 列表/新增/编辑/审批 API
3. 替换 `ExpenseManager` 的 localStorage / 本地提交逻辑
4. 接入员工、审批人、可选客户关联
5. 统一审批通过/拒绝的提交反馈与刷新逻辑

**Exit criteria:**
- v3 费用页面保留
- 审批流接入真实后端
- 数据可持久化
- 刷新后状态准确

---

## Phase 6：系统通用界面适配收尾
**Objective:** 在不大改 UI 的前提下，统一三模块和当前系统的“壳行为”。

**Files:**
- Modify: `apps/admin/src/App.tsx`
- Modify: `apps/admin/src/components/Sidebar.tsx`
- Modify: `apps/admin/src/components/Header.tsx`（如需要）
- Modify: 三个新模块组件文件
- Modify: `apps/admin/src/lib/api.ts`

**Tasks:**
1. 统一页面标题映射
2. 统一 toast / dialog / confirm 行为
3. 统一页面内容区滚动与高度策略
4. 统一空状态、错误态、加载态
5. 去除原型里明显不适合正式系统的 alert / 纯演示文案
6. 补齐必要 i18n 或保留首期中文直出策略

**Exit criteria:**
- 三模块虽保留 v3 风格，但系统行为与主 admin 一致
- 没有明显“像外嵌页面”的割裂感

---

## Phase 7：回归与稳定性验证
**Objective:** 确保三模块不是“能打开而已”，而是真能稳定跑在当前系统上。

**Files:**
- Verify only: 前后端涉及文件
- Optional docs update during implementation phase

**Tasks:**
1. 验证三个模块的页面进入、刷新、跳转、语言切换
2. 验证列表加载、表单提交、状态变更、异常提示
3. 验证现有老模块未被破坏
4. 验证多次切 tab 不出现明显重复请求风暴
5. 验证 localStorage 已不再作为真实数据源依赖
6. 做一轮完整手工回归

**Exit criteria:**
- 三模块稳定运行
- 与现有 admin 共存正常
- 页面刷新、重新登录后仍保持正确数据

---

## 7. 文件改动范围（结论版）

### 必改
- `apps/admin/src/types.ts`
- `apps/admin/src/lib/adminRoute.ts`
- `apps/admin/src/App.tsx`
- `apps/admin/src/components/Sidebar.tsx`
- `apps/admin/src/lib/api.ts`
- `apps/admin/server/index.js`

### 新增或迁入
- `apps/admin/src/components/CustomerManager.tsx`
- `apps/admin/src/components/GoodsManager.tsx`
- `apps/admin/src/components/ExpenseManager.tsx`

### 可能新增
- `apps/admin/server/customers.js`
- `apps/admin/server/goods.js`
- `apps/admin/server/expenses.js`
- `apps/admin/src/components/admin-v3-shared/*`

### 主要参考来源
- `admin-v3/src/components/CustomerManager.tsx`
- `admin-v3/src/components/GoodsManager.tsx`
- `admin-v3/src/components/ExpenseManager.tsx`
- `admin-v3/src/types.ts`
- `admin-v3/src/App.tsx`

---

## 8. 验收标准

### 8.1 UI 层面
- 页面主结构基本保持 v3 原型风格
- 只做必要系统适配，不被重写成另一套页面
- 在当前 admin 容器中显示正常，无布局错乱

### 8.2 数据层面
- 不再依赖 localStorage
- 列表、创建、编辑、状态变更都走真实 API
- 刷新后数据保持一致

### 8.3 系统层面
- 走当前 admin 的路由体系
- 走当前 admin 的鉴权体系
- 走当前 admin 的请求层
- 不破坏原有后台模块

### 8.4 运行层面
- 前端可构建
- 后端可启动
- 三模块可真实访问并完成关键操作

---

## 9. 风险与控制点

### 风险 1：v3 组件耦合了太多页面内本地状态
**影响：** UI 虽能迁入，但替换数据层时可能需要改不少逻辑。

**控制：** 优先保留 JSX 结构和交互布局，只替换状态来源与提交函数，不急着拆组件。

### 风险 2：v3 样式与当前 admin 外层容器冲突
**影响：** 高度、滚动、边距、宽度可能错位。

**控制：** 只在容器层做适配，不随意改业务区布局。

### 风险 3：三模块的字段口径还不够正式
**影响：** 后端接口和真实数据结构可能需要补定义。

**控制：** 先冻结字段映射，再替换数据层。

### 风险 4：费用“核销”业务语义不够清晰
**影响：** 审批流和核销流可能不是同一个动作。

**控制：** 在实施前先确认费用状态机，不要边做边改。

### 风险 5：附件/凭证策略不明确
**影响：** `goods` 和 `expenses` 都可能卡在上传/存储方式上。

**控制：** 首期先明确是正式上传、URL 字段过渡，还是已有系统能力复用。

---

## 10. 需要你最终确认的几个业务点

1. **费用“核销”是否等于审批通过？**
   - 还是审批通过后还需要单独“核销完成/结清”步骤？
2. **入库单附件、签收凭证、费用凭证** 首期是否必须接入正式上传？
   - 还是允许先用 URL / 文本字段过渡？
3. **客户信用流水** 首期是否需要可编辑，还是只读就够？
4. **首期是否明确不做 `products / orders`？**
   - 我建议先不做，避免 scope 膨胀。

---

## 11. 最终建议

这次最合适的执行方式是：

**前端界面尽量保留 v3，重点只做三类事情：**
1. 挂进当前 admin 系统骨架
2. 换掉 localStorage / mock 数据
3. 修正系统通用行为与外层样式接缝

这样能最大化保留你认可的 v3 界面，同时把实现成本集中到真正关键的部分：
- 路由接入
- 真实数据
- 后端持久化
- 稳定运行

相比“重做 UI”的路线，这版计划更贴近你的真实目标，也更省返工。
