# Admin 语言路由化任务安排

## 已确认目标
把 admin 的语言配置和当前业务页签都放入 URL，采用 path 形式作为单一状态源，保留现有 Google OAuth popup callback 行为。

## 实施范围
1. 在 admin 引入 React Router。
2. 路由结构改为 `/:lang/:tab`。
3. `lang` 负责驱动 i18n 当前语言。
4. `tab` 负责驱动当前业务页挂载。
5. localStorage 仅作为默认语言兜底来源。
6. 维持现有 Google 登录 callback 读 query 参数的能力。

## 不在本次范围内
1. 不处理更细粒度筛选条件上路由。
2. 不处理 SOP/员工列表内部子状态深链接。
3. 不顺手重构无关 UI 或接口。

## 任务拆分

### T1. 路由基础设施接入
- 状态：AFK
- 内容：
  - 检查/补充 `react-router-dom` 依赖
  - 在 `src/main.tsx` 挂载 `BrowserRouter`
  - 新增 admin 路由工具，集中维护合法 `lang` / `tab`、默认值和归一化逻辑
- 验收：
  - 项目可编译
  - 路由工具能把非法 `lang` / `tab` 归一化到合法值

### T2. App 主状态源从 useState 切到路由
- 状态：AFK
- 内容：
  - 用路由参数替代 `activeTab` 主状态
  - 页面标题、动画 key、业务组件挂载都从路由 tab 读取
  - 在路由变化时同步 i18n 语言
  - 初始访问 `/` 时重定向到默认 `/:lang/dashboard`
- 验收：
  - 刷新后保留当前语言和 tab
  - 非法 URL 自动 replace 到合法 URL

### T3. Sidebar / Header / 内部导航改造
- 状态：AFK
- 内容：
  - Sidebar 点击改为路由跳转
  - Header 切语言时仅替换 lang，保留当前 tab
  - Dashboard 等内部 `setActiveTab` 入口改成路由跳转函数
- 验收：
  - 页面内导航时 URL 同步变化
  - 切换语言时 tab 不跳回 dashboard

### T4. i18n detector 优先级调整
- 状态：AFK
- 内容：
  - `packages/i18n/src/web.ts` 调整 detection 顺序为 path 优先、localStorage 次之、navigator 最后
  - 与 admin 路由参数保持一致
- 验收：
  - 直接打开带语言 path 的 URL 时语言立即正确

### T5. OAuth callback 兼容与构建验证
- 状态：AFK
- 内容：
  - 确认 callback query 参数读取不被路由改造破坏
  - 执行 build 验证
  - 回填进度文档
- 验收：
  - build 成功
  - callback 相关分支仍可编译且逻辑不被路由吞掉

## 推荐实施顺序
1. T1
2. T2
3. T3
4. T4
5. T5

## 成功判定
1. `/:lang/:tab` 可直接打开并正确展示页面和语言。
2. 刷新后仍保持原 tab 和原语言。
3. Sidebar / 内部跳转后 URL 正确变化。
4. Header 切语言后 tab 保持不变。
5. 构建通过，OAuth callback 逻辑未回归。
