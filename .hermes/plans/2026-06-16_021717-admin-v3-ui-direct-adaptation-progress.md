# Admin v3 三模块集成进度文档（UI 直接采用 v3 版）

> 对应计划文档：`/Users/admin/Desktop/project/wmshr/.hermes/plans/2026-06-16_020946-admin-v3-ui-direct-adaptation-plan.md`
>
> 说明：本文件用于持续记录该方案的实施进度、阶段状态、验证结果、阻塞点与下一步。当前已完成 **Phase 1 / Phase 2 / 首轮构建运行验证**，正在进入数据层替换阶段。

---

## 1. 项目目标

将 `admin-v3` 中的以下三个模块，以 **v3 UI 直接使用 + 当前系统通用适配 + 数据层接入真实后端** 的方式，集成到当前 `apps/admin`：

1. `customers` 客户管理
2. `goods` 入库管理
3. `expenses` 费用管理 / 费用核销

目标结果：
- 在当前 admin 中正式可访问
- 保持 v3 视觉主体
- 去除 `localStorage` 真实依赖
- 接入当前 admin 路由、导航、API、后端、鉴权
- 可真实保存、刷新、稳定运行

---

## 2. 当前总体状态

**项目状态：** 已开始实施，首轮壳层集成完成  
**当前阶段：** Phase 3 准备中 / 客户管理数据层替换前分析  
**总体进度：** 35%  
**当前进行中：** customers / goods / expenses 已接入当前 admin 壳层，下一步进入真实 API / 后端替换

---

## 3. 已完成事项

### 3.1 来源识别与纠偏
- [x] 识别并纠正了此前误放入项目的错误 `admin-v3` 来源
- [x] 确认真正的后台 v3 来源为下载目录中的：
  - `wmshr---海外仓员工管理系统 (3).zip`
  - `wmshr---海外仓员工管理系统 (3) (1).zip`
- [x] 用正确来源重新替换项目内的 `admin-v3`

### 3.2 模块确认
- [x] 确认 `admin-v3` 中存在以下后台模块：
  - `GoodsManager`
  - `ExpenseManager`
  - `CustomerManager`
  - 以及 `ProductManager`、`OrderManager`
- [x] 确认本轮用户目标聚焦于：
  - 入库管理
  - 费用管理 / 核销
  - 客户管理

### 3.3 架构差异确认
- [x] 确认当前 `apps/admin` 已有稳定主系统骨架：
  - `TabId`
  - `adminRoute`
  - `Sidebar`
  - `App.tsx`
  - `lib/api.ts`
  - `server/index.js`
- [x] 确认 `admin-v3` 三目标模块当前本质为：
  - UI 原型可直接用
  - 但数据层仍依赖 `useState + localStorage + mock 数据`

### 3.4 方案口径确认
- [x] 已根据用户最新要求重出新计划
- [x] 新计划已明确采用：
  - **UI 原型直接使用 v3 版本**
  - **只做系统通用界面适配**
  - **重点替换数据层与系统接缝层**

### 3.5 已完成的首轮实施
- [x] 已将 `CustomerManager`、`GoodsManager`、`ExpenseManager` 迁入 `apps/admin/src/components/`
- [x] 已扩展 `apps/admin/src/types.ts` 中的 `TabId` 与三模块所需数据类型
- [x] 已扩展 `apps/admin/src/lib/adminRoute.ts`，允许 `customers / goods / expenses` 进入当前 admin 路由体系
- [x] 已扩展 `apps/admin/src/components/Sidebar.tsx`，加入三个新导航入口
- [x] 已扩展 `apps/admin/src/App.tsx`，完成：
  - 新模块导入与挂载
  - 页面标题映射
  - goods / expenses 员工预取
  - customers / goods 的临时原型态持久化壳层
- [x] 已新增实施文档：
  - `docs/admin文档/v3三模块集成/v3三模块集成-需求确认.md`
  - `docs/admin文档/v3三模块集成/v3三模块集成-任务安排.md`

### 3.6 已完成验证
- [x] `npm run build:admin` 通过
- [x] `npm --workspace @wmshr/admin run lint`（`tsc --noEmit`）通过
- [x] `npm run dev:admin` 已启动，服务监听在 `http://127.0.0.1:3003`
- [x] 浏览器已验证以下路径可进入当前 admin 认证入口，且无前端控制台报错：
  - `/zh/customers`
  - `/zh/goods`
  - `/zh/expenses`

---

## 4. 阶段进度表

| 阶段 | 名称 | 状态 | 说明 |
|---|---|---|---|
| Phase 0 | 接入前审计与最小保留原则确认 | 已完成 | 已明确采用 v3 UI 直用路线，并识别出系统接缝层改造重点 |
| Phase 1 | 主系统骨架扩展 | 已完成 | 已扩展 `TabId`、`adminRoute`、`Sidebar`、`App.tsx` |
| Phase 2 | v3 UI 迁入当前 admin | 已完成 | 三模块组件已迁入并挂载到当前 admin 内容区 |
| Phase 3 | 客户管理数据层替换 | 未开始 | 待接入 customers API 和服务端 |
| Phase 4 | 入库管理数据层替换 | 未开始 | 待接入 goods API 和服务端 |
| Phase 5 | 费用管理数据层替换 | 未开始 | 待接入 expenses API 和服务端 |
| Phase 6 | 系统通用界面适配收尾 | 部分完成 | 标题与主壳挂载已完成，细节适配待数据层接入后继续收尾 |
| Phase 7 | 回归与稳定性验证 | 部分完成 | 已完成 build / lint / dev / 路由入口验证，待登录后业务态回归 |

---

## 5. 当前实施边界（已冻结）

### 本轮纳入范围
- `customers`
- `goods`
- `expenses`

### 本轮默认不纳入范围
- `products`
- `orders`

### 当前实施原则
- 尽量保留 v3 UI 主体
- 不重做页面
- 不做大规模视觉统一工程
- 数据层必须改接真实 API / 后端
- 系统行为必须融入当前 admin 主系统

---

## 6. 当前已确认的关键文件

### 当前 admin 主系统关键文件
- `apps/admin/src/types.ts`
- `apps/admin/src/lib/adminRoute.ts`
- `apps/admin/src/App.tsx`
- `apps/admin/src/components/Sidebar.tsx`
- `apps/admin/src/lib/api.ts`
- `apps/admin/server/index.js`

### v3 迁移参考文件
- `admin-v3/src/App.tsx`
- `admin-v3/src/types.ts`
- `admin-v3/src/components/CustomerManager.tsx`
- `admin-v3/src/components/GoodsManager.tsx`
- `admin-v3/src/components/ExpenseManager.tsx`

### 计划文档
- `/.hermes/plans/2026-06-16_020946-admin-v3-ui-direct-adaptation-plan.md`

---

## 7. 当前阻塞 / 待确认项

以下问题**不会阻止继续进入 Phase 3 / Phase 4 / Phase 5**，但会影响后续数据层落地细节：

1. **费用“核销”是否等于审批通过？**
   - 如果不是，需要单独定义核销完成动作。

2. **附件/凭证首期怎么处理？**
   - 入库单签收凭证
   - 费用凭证
   - 是接正式上传，还是先走 URL / 文本字段过渡

3. **客户信用流水首期是否需要可编辑？**
   - 还是只读展示即可

4. **是否明确首期不做 `products / orders`？**
   - 当前计划默认不做，但最好在开工前保持一致口径

---

## 8. 下一步建议

### 推荐下一执行步
从 **Phase 3：客户管理数据层替换** 开始。

具体顺序建议：
1. 先梳理当前 admin 后端在 `apps/admin/server/index.js` 的 owner_user_id + Supabase 持久化模式
2. 设计 customers 表结构 / API 读写契约
3. 先完成 `customers` 前后端真实化
4. 再复用同一模式推进 `goods`
5. 最后处理 `expenses`，并同步澄清“审批”和“核销”的状态边界

### 原因
这样能在已完成壳层接入的基础上，尽快把“可展示页面”推进成“可真实保存的数据模块”，并尽早暴露：
- Supabase 表结构缺口
- API 契约与 v3 原型字段不一致的问题
- owner_user_id 隔离与附件处理策略问题

---

## 9. 开始实施后的回填规则

后续一旦进入实施，本文件需要持续更新以下内容：

### 每完成一个阶段，必须补写
- 实际修改了哪些文件
- 实际验证结果
- 是否达到阶段退出条件
- 是否发现新的阻塞
- 下一步是什么

### 每次出现阻塞，必须补写
- 问题现象
- 影响范围
- 临时处理方式
- 是否需要用户确认

---

## 10. 当前结论

当前该项目的状态不是“还没想清楚怎么做”，而是：

- **方案已经定了**
- **技术路径已经定了**
- **目标模块已经定了**
- **正确 v3 来源已经定了**
- **还差正式开始实施**

当前最合理的继续推进点是：
**保持已完成的壳层接入成果不动，按 customers → goods → expenses 的顺序逐个把 localStorage / mock 原型数据换成真实 API。**
