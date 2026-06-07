# Home 门户语言路径化任务进度

## 当前状态
- T1 路由基础设施接入：已完成
- T2 App 主状态源切到 path：已完成
- T3 LanguageSelector / hash / admin 跳转改造：已完成
- T4 构建与访问验证：已完成
- T5 繁体 key 对齐与 admin→官网语言回传：已完成

## 已完成
1. 已确认目标与范围。
2. 已建立确认文档：`.hermes/plans/home-language-route-confirmation.md`
3. 已建立任务安排文档：`.hermes/plans/home-language-route-task-plan.md`
4. 已建立本进度文档：`.hermes/plans/home-language-route-progress.md`
5. 已核实当前 home 现状：
   - 当前语言不在 path
   - `LanguageSelector` 仍直接 `i18n.changeLanguage(...)`
   - 门户跳 admin 已带语言，但门户自身刷新仍可能重置语言
6. 已新增 `src/lib/homeRoute.ts`，集中维护门户语言 path 的构造与归一化。
7. 已将 `src/App.tsx` 改为从 `location.pathname` 派生当前语言，并在 `/` 或非法路径时 replace 到规范 `/:lang`。
8. 已将门户语言同步改为路由驱动：切语言时更新 path，不再只更新 i18n 内存状态。
9. 已保留当前 `location.hash`，确保 `/:lang#about-us` 这类页内锚点在切语言时不丢失。
10. 已保持门户跳 admin 的语言传递逻辑，改为使用当前 path 语言拼接 `/:lang/dashboard`。
11. 已执行 `npm run lint --workspace @wmshr/home`，通过。
12. 已执行 `npm run build --workspace @wmshr/home`，通过。
13. 已使用现有本地 home 服务验证：
   - `http://127.0.0.1:3001/` 返回 200
   - `http://127.0.0.1:3001/en` 返回 200
   - `http://127.0.0.1:3001/zh` 返回 200
   - `http://127.0.0.1:3001/zh#about-us` 返回 200
14. 已将验证中遇到的脚本/端口问题记录到项目一级：`PROJECT_ISSUES.md`

## 本轮追加需求
1. 用户反馈门户与 admin 的繁体语言 key 不一致，需要核实并统一。
2. 用户要求 admin 的“返回官网”入口把当前 admin 语言传回门户。
3. 用户新增反馈：当前选择繁体中文后会自动跳回简体，需要继续排查语言归一化逻辑。

## 当前核实结果
1. 当前共享语言定义位于 `packages/i18n/src/languages.ts`，门户与 admin 都通过 `normalizeLanguage(...)` 使用同一套 `SupportedLanguageCode`。
2. 当前繁体中文规范值为 `zht`，`zh-TW / zh-HK / zh-MO` 会统一归一化为 `zht`。
3. 已确认门户与 admin 共用同一套共享语言定义；当前繁体中文规范值一致，均为 `zht`。
4. 已修复真实缺口：`apps/admin/src/components/AuthScreen.tsx` 的“返回官网”改为基于当前 admin 语言构造 `/:lang` 门户 URL。
5. 已将 `apps/admin/src/App.tsx` 改为向 `AuthScreen` 传入当前路由语言，避免登录页脱离 admin 路由状态单独猜语言。
6. 已执行 `npm run lint --workspace @wmshr/admin`，通过。
7. 已执行 `npm run build --workspace @wmshr/admin`，通过。
8. 已执行 `npm run lint --workspace @wmshr/home`，通过。
9. 已执行 `npm run build --workspace @wmshr/home`，通过。
10. 已用 Node 实际验证返回官网 URL 组装结果：`zht => https://dutylix.com/zht`。
11. 已确认新的真实根因：`normalizeLanguage(...)` 会把路由值 `zht` 错误命中 `startsWith("zh")`，因此 `/zht` 被归一化回 `/zh`。
12. 已修复 `packages/i18n/src/languages.ts`：先显式识别 `zht`，再判断 `zh-tw/zh-hk/zh-mo` 和通用 `zh`。
13. 已重新执行 `npm run lint --workspace @wmshr/home`，通过。
14. 已重新执行 `npm run lint --workspace @wmshr/admin`，通过。
15. 已重新执行 `npm run build --workspace @wmshr/home`，通过。
16. 已重新执行 `npm run build --workspace @wmshr/admin`，通过。
17. 已用 Node 直接导入源码验证：`zht => zht`、`zh-TW => zht`、`zh-HK => zht`、`zh => zh`。

## 阻塞
- 暂无

## 最终结果
- home 门户已改为以 `/:lang` 作为语言主状态源。
- 根路径 `/` 会按当前 detector 语言跳转到规范 `/:lang`。
- 切换语言时会保留当前 hash。
- 刷新 `/:lang` 时不会再因为语言不在 URL 而回退到其它语言来源。
- 门户跳 admin 时仍会把当前语言传到 `/:lang/dashboard`。
- admin 返回官网时现在也会把当前语言传回对应 `/:lang`。
- 繁体语言 `zht` 不会再被错误归一化回 `zh`。
