# Home 门户语言路径化任务安排

## 已确认目标
把 home 门户语言放入 URL path，采用 `/:lang` 作为主状态源，保证刷新、直接打开链接、复制分享链接时语言不重置，并保留现有页内 hash 锚点与门户跳 admin 的语言传递。

## 实施范围
1. 在 home 接入 React Router。
2. 路由结构改为 `/:lang`。
3. 根路径 `/` 自动跳转到 `/:lang`。
4. `lang` 负责驱动 i18n 当前语言。
5. `LanguageSelector` 切语言时改为路由跳转。
6. 切语言时保留当前 hash。
7. 门户跳 admin 时继续从当前语言派生 admin URL。
8. localStorage 仅作为默认语言兜底来源。
9. 门户与 admin 的繁体语言 key / URL 规范保持一致。
10. admin 返回官网时把当前 admin 语言传回门户。

## 不在本次范围内
1. 不拆分更多子页面路由。
2. 不处理更多筛选/弹层状态上路由。
3. 不顺手改无关样式、动画、布局。

## 任务拆分

### T1. 路由基础设施接入
- 状态：AFK
- 内容：
  - 检查并使用 `react-router-dom`
  - 在 `src/main.tsx` 挂载 `BrowserRouter`
  - 新增 home 路由工具，集中维护合法 `lang`、默认值和归一化逻辑
- 验收：
  - 项目可编译
  - 非法/缺失语言可归一化到合法 path

### T2. App 主状态源切到 path
- 状态：AFK
- 内容：
  - 从 path 读取当前语言
  - 根路径 `/` 自动跳转到 `/:lang`
  - 非法 path 自动 replace 到合法 `/:lang`
  - 路由变化时同步 i18n 语言
- 验收：
  - 直接打开 `/:lang` 时语言正确
  - 刷新 `/:lang` 后语言不变

### T3. LanguageSelector / hash / admin 跳转改造
- 状态：AFK
- 内容：
  - `LanguageSelector` 改为通过路由切语言
  - 切语言时保留当前 `location.hash`
  - 门户跳 admin 继续使用当前 path 语言
- 验收：
  - 切换语言时 URL 变化
  - 当前 hash 不丢失
  - 跳 admin 仍带当前语言

### T4. 构建与访问验证
- 状态：AFK
- 内容：
  - 执行 lint / build
  - 启动预览或对本地服务做路由访问验证
  - 回填进度文档
- 验收：
  - lint 通过
  - build 通过
  - `/en`、`/zh` 等路径访问正常

### T5. 繁体 key 对齐与 admin→官网语言回传
- 状态：AFK
- 内容：
  - 核实门户与 admin 当前共用的繁体语言 key / URL 值是否一致
  - 如发现不一致，统一到共享语言定义
  - 修改 admin 的“返回官网”入口，使其基于当前 admin 语言构造门户 URL
- 验收：
  - 繁体语言在门户与 admin 间往返时 key 一致
  - admin 点击“返回官网”会落到对应 `/:lang`

## 推荐实施顺序
1. T1
2. T2
3. T3
4. T5
5. T4

## 成功判定
1. `/:lang` 可直接打开并正确展示页面语言。
2. 刷新后仍保持原语言。
3. 切换语言后 URL 正确变化。
4. 切语言时若已有 hash，则 hash 保留。
5. 跳 admin 时仍带当前语言。
6. 门户与 admin 的繁体 key / URL 规范一致。
7. admin 返回官网时仍带当前语言。