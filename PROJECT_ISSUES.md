# PROJECT_ISSUES

### 2026-06-07 问题 1：员工端打卡后 attendance_calculation_results 写入因 source_check 失败
- 原因：员工端打卡接口 `apps/admin/server/index.js:2732-2791` 会先把 `attendance_records.source` 写成 `"mobile"`，随后调用 `recalculateDailyAttendance`。日计算结果在 `apps/admin/server/attendance-v2.js:104-133` 里直接把 `record?.source` 透传到 `attendance_calculation_results.source`。仓库原先只有 `supabase/migrations/20260606035000_allow_mobile_attendance_source.sql` 为 `attendance_records_source_check` 放开了 `mobile`，缺少同步放开 `attendance_calculation_results_source_check` 的迁移。
- 导致的问题：App 打卡流程在定位和打卡请求已经进入后端后，重算 `attendance_calculation_results` 时因 `source = 'mobile'` 不满足旧约束而报错，前端看到 `new row for relation "attendance_calculation_results" violates check constraint "attendance_calculation_results_source_check"`。这不是前端定位权限本身报错，而是后端写计算结果时的数据库约束不一致。
- 解决方式：新增迁移 `supabase/migrations/20260607043500_allow_mobile_attendance_calculation_result_source.sql`，只重建 `attendance_calculation_results_source_check`，把允许值同步为 `('manual', 'import', 'system', 'device', 'mobile')`，与 `attendance_records.source` 保持一致。
- 验证结果：已用全局 `HOME=/Users/admin` 成功执行 `supabase db push --yes`，CLI 返回 `Remote database is up to date.`；随后执行 `HOME=/Users/admin supabase migration list --linked`，确认本地与远端都包含 `20260607043500` 这条迁移，说明修复约束已在远端库生效。继续用本地已启动的 `admin-api` 做只读复测：员工端登录接口 `/api/mobile/auth/login` 可成功返回 token，说明移动端账号链路可用；因此当前已完成数据库侧修复和登录侧贯通验证。尚未代替真实员工执行一次实际打卡写入，因为那会对真实考勤数据产生副作用；若需要，我可以在你明确允许后继续做一次真实打卡复测。

### 2026-06-07 问题 2：繁体语言路由 `zht` 被误归一化回 `zh`
- 原因：`packages/i18n/src/languages.ts` 里的 `normalizeLanguage(...)` 先判断了 `lowered.startsWith("zh")`，导致路由值 `zht` 也被误判成简体 `zh`。
- 导致的问题：门户或 admin 选择繁体中文后，URL 会立即从 `/zht` 被归一化回 `/zh`，界面看起来像“自动跳回简体中文”。
- 解决方式：先显式判断 `zht`，再判断 `zh-tw/zh-hk/zh-mo` 和通用 `zh`；随后重新执行 home/admin 的 lint、build，并用源码级脚本验证 `normalizeLanguage("zht") === "zht"`。

### 2026-06-07 问题 3：首次源码级验证路径无法直接执行 TypeScript
- 原因：修复后第一次尝试用裸 `node` 动态执行 `packages/i18n/src/languages.ts` 做验证，但该文件包含 TypeScript 的 `as const` 语法，裸 `node` 直接 `new Function(...)` 无法解析；随后尝试 `npx tsx` 时当前环境也没有可用的 `tsx` 命令。
- 导致的问题：验证命令先后报 `SyntaxError: Unexpected identifier 'as'`、`sh: tsx: command not found`，不能直接复用这两条路径确认修复结果。
- 解决方式：改用当前 Node 版本可直接导入 TypeScript ESM 的方式执行验证，避免依赖额外 CLI。
