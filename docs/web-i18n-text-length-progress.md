# 门户 / Admin / 登录页 国际化长文案兼容任务进度

## 当前状态
- Task 1：completed
- Task 2：completed
- Task 3：completed
- Task 4：completed
- Task 5：completed

## 执行记录
- 已创建需求确认文档：`docs/web-i18n-text-length-confirmation.md`
- 已创建任务安排文档：`docs/web-i18n-text-length-task-plan.md`
- 用户已明确要求开始实施。
- 已通过 codegraph 与定点读文件锁定本轮高风险区域：
  - 门户：`apps/home/src/App.tsx`
    - 顶部导航 CTA 按钮
    - Dashboard showcase 场景标签与场景说明
    - Hero / CTA 主按钮
    - About 区团队说明文案
  - Admin：`apps/admin/src/components/Header.tsx`
    - 顶部标题区域在长翻译下容易和右侧操作区互相挤压
  - Admin：`apps/admin/src/components/Sidebar.tsx`
    - 侧栏宽度偏窄，导航项标签在多语言下有溢出风险
  - 登录页：`apps/admin/src/components/AuthScreen.tsx`
    - 主登录按钮文案
    - 左侧视觉卡片固定宽度文案
    - 右侧设备卡片标题/标签区域
- 已按范围完成样式修正与必要注释补充，未改业务逻辑、接口和路由。

## 验证结果
- 在仓库根目录执行：`npm run lint`
  - 实际覆盖：`@wmshr/admin` / `@wmshr/home` / `@wmshr/mobile` 的 `tsc --noEmit`
  - 结果：通过（exit code 0）
- 在仓库根目录执行：`npm run build`
  - 实际覆盖：`@wmshr/admin` Vite 构建、`@wmshr/home` Vite 构建 + `esbuild server.ts`
  - 结果：通过（exit code 0）
- 构建期间仅出现既有 chunk size warning，未阻断本次验证。

## 阻塞点
- 暂无

## 下一步
- 等待你继续指定：
  - 是否要我继续做第二轮页面级细化（例如专门补 admin 列表页 / portal 联系页的长文案位）
  - 或先提交、发布与线上复查
