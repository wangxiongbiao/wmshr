# Admin 语言路由化任务进度

## 当前状态
- T1 路由基础设施接入：已完成
- T2 App 主状态源切路由：已完成
- T3 Sidebar / Header / 内部导航改造：已完成
- T4 i18n detector 优先级调整：已完成
- T5 OAuth callback 兼容与构建验证：已完成

## 已完成
1. 已确认目标与范围。
2. 已建立 admin codegraph 索引并验证可用。
3. 已核实当前状态：
   - admin 没有使用 React Router
   - `activeTab` 仍是本地 state
   - `lang` 仍由 detector/localStorage 驱动
4. 已接入 `react-router-dom` 并在 `src/main.tsx` 挂载 `BrowserRouter`。
5. 已新增 `src/lib/adminRoute.ts`，集中维护合法 `lang` / `tab`、默认值和 URL 构造。
6. 已将 `src/App.tsx` 改为从路由派生 `currentLanguage` 与 `activeTab`，并在非法/不完整路径时自动 replace 到规范 URL。
7. 已将 Header 语言切换改为路由驱动，切换语言时保留当前 tab。
8. 已将 Sidebar / Dashboard 的 tab 跳转改为路由跳转。
9. 已将 `packages/i18n/src/web.ts` 的 detector 优先级改为 path 优先、localStorage 次之、navigator 最后。
10. 已完成验证：
   - `npm run lint` 通过
   - `npm run build` 通过
   - `npm run preview -- --host 127.0.0.1 --port 4173` 可启动
   - `http://127.0.0.1:4173/` 返回 200
   - `http://127.0.0.1:4173/en/payroll` 返回 200

## 执行记录
- 规划确认文档：`.hermes/plans/admin-language-route-confirmation.md`
- 任务安排文档：`.hermes/plans/admin-language-route-task-plan.md`
- 本进度文档：`.hermes/plans/admin-language-route-progress.md`

## 阻塞
- 暂无

## 最终结果
- admin 已改为以 `/:lang/:tab` 为主状态源。
- 根路径会按当前 detector 得到的语言跳转到默认业务页。
- 切换语言时会保留当前 tab。
- 非法或不完整路径会自动 replace 到规范 URL。
- Google OAuth popup callback 仍保留 query 参数读取逻辑，未被这次路由改造删除。
