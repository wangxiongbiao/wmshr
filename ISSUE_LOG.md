# ISSUE_LOG

## 2026-06-27 问题 1：新 owner 调用 workspace bootstrap 返回 500
- 原因：`POST /api/admin/workspace/ensure-bootstrap` 在全新 owner 上触发后端现有逻辑异常，返回报错：`invalid input syntax for type bigint: "{...employee row json...}"`。
- 导致的问题：按原计划无法先走 workspace bootstrap 再做“创建员工 → 员工端请假 → admin 审批”的联调闭环。
- 当前判断：这是现有 bootstrap 逻辑的后端 bug，不是本次 admin 请假模块前端接入引入的问题；错误发生在新建 owner 的初始化阶段。
- 已尝试：
  - 复用项目标准入口 `npm run restart:dev` 启动 admin API / admin web / home web / mobile expo，并通过 `/api/health`、`/`、端口监听完成健康检查。
  - 使用真实 Supabase 临时管理员账号调用 `/api/admin/workspace/ensure-bootstrap`，稳定复现 500。
- 原计划验证入口：先 bootstrap workspace，再通过真实 admin token 创建员工、重置员工 App 账号、员工端登录提交请假、admin 审批并核对考勤回写。
- 替代验证：跳过 bootstrap，改走最小闭环验证路径——若 `POST /api/admin/employees`、`/api/mobile/auth/login`、`/api/mobile/attendance/leave/request`、`/api/admin/leave-requests/:id/approve` 可直接工作，则仍可完成本次请假模块联调验收。
- 下一步：继续尝试不依赖 bootstrap 的真实接口闭环；若员工创建也依赖 bootstrap，再回头定位 bootstrap 后端实现并单独修复。

## 2026-06-27 问题 2：门户官网点击“下载 App”无法实际下载 APK
- 原因：门户前端 `apps/home/src/App.tsx` 在初始化时请求 `/api/public/mobile-app-update`，并直接使用返回的 `payload.url` 作为按钮点击目标；当前后台 `apps/admin/server/index.js` 的 `getMobileAndroidUpdatePayload()` 也直接把数据库 `mobile_app_releases.url` 原样返回。当前数据库中的 URL 为 `https://dutylix.com/downloads/wmshr-android-0.1.25.apk`，但实测该地址返回的是 `text/html` 且 `content-disposition: inline; filename="index.html"`，并不是 APK 下载流。
- 导致的问题：官网点击“下载 App”时，浏览器打开的是网页/回源首页而不是安装包，因此用户感觉“不能下载”。
- 已尝试：
  - 调用 `http://127.0.0.1:3001/api/public/mobile-app-update` 与 `http://127.0.0.1:8788/api/public/mobile-app-update`，确认当前返回 `{"version":"0.1.26","url":"https://dutylix.com/downloads/wmshr-android-0.1.25.apk"}`。
  - 直接 `curl -I -L https://dutylix.com/downloads/wmshr-android-0.1.25.apk`，确认返回 `content-type: text/html`、`content-disposition: inline; filename="index.html"`。
  - 调用 `HEAD http://127.0.0.1:3001/api/public/mobile-app-download`，确认该代理接口会返回 `Content-Disposition: attachment; filename="wms-0.1.26.apk"`，属于可下载入口。
  - 修改 `apps/home/src/App.tsx`，保留用 `/api/public/mobile-app-update` 判断“当前是否已配置可用 Android 包”，但把桌面按钮和二维码统一切到同源 `/api/public/mobile-app-download`。
  - 执行 `npm --workspace @wmshr/home run lint` 与 `npm --workspace @wmshr/home run build`，确认前端类型检查和构建通过；构建产物中已能检索到 `mobile-app-download`，且未再检索到 `dutylix.com/downloads/wmshr-android` 旧直链。
- 解决方式：门户下载按钮与二维码现已统一走同源代理下载接口 `/api/public/mobile-app-download`；数据库里的 `mobile_app_releases.url` 继续只作为“后台是否已配置当前最新包”的判断依据，不再直接暴露给官网用户入口。
- 验收结果：根因已定位并已修复；当前官网前端下载入口不再直接依赖返回 HTML 的失效 APK 直链，而是改走会返回 `attachment` 头的同源下载代理。

## 2026-07-14 问题 3：CodeGraph 被失效的 Node preload 环境变量阻塞
- 原因：当前终端继承的 `NODE_OPTIONS` 指向已不存在的 `electron-runtime-compat/preload.cjs`，导致 CodeGraph 启动时直接报 `Cannot find module .../preload.cjs`；后续脱敏解析又遇到本机未安装 `jq` 和系统 awk 不接受原 URL 正则的问题。
- 导致的问题：无法按原入口读取现有 CodeGraph 索引，并且首次 Supabase 链接元数据脱敏提取失败。
- 解决方式：仅对相关命令使用 `env -u NODE_OPTIONS` 清除失效 preload 配置；脱敏提取改用 Node 的 JSON 与 URL 标准解析能力，不输出 Supabase 密钥。
- 验收结果：CodeGraph `1.4.1` 已正常执行 `status` 和 `explore`，确认索引为最新状态；同时成功核对 Supabase project ref、URL host、组织标识和本地链接项目名称。

## 2026-07-14 问题 4：旧 Supabase project ref 已被移除
- 原因：项目配置的 ref `gmborqenwhzuofndjavf` 已无法在 Supabase 公共 DNS 中解析；通过现有 `DATABASE_URL` 连接 Session Pooler 时，服务端同时返回 `(ENOTFOUND) tenant/user postgres.gmborqenwhzuofndjavf not found`。这说明问题不在本机 DNS 或 API key，而是该 ref 对应的远程 tenant 当前不存在或项目配置已经过期。
- 导致的问题：Supabase Auth、REST API 和 PostgreSQL 数据库目前均无法连接，依赖这些服务的管理端和员工端功能无法正常工作。
- 当前判断：系统 DNS、Cloudflare DNS 和 Google DoH 均确认项目域名为 NXDOMAIN。当前登录账号可访问两个 organization，其中 `smartbillpro@gmail.com's Org` 的 ID `yhfosjxfdypsjusdsusi` 与本仓库旧绑定完全一致，但该组织当前项目列表为空。对旧 ref `gmborqenwhzuofndjavf` 直接请求 API key 和 physical backup 接口时，Supabase Management API 均返回 `Resource has been removed`，因此已确认项目在控制面被移除，而非只是切错组织或暂停。
- 已尝试：请求 `/auth/v1/health`；查询 `mobile_app_releases`；使用现有数据库连接串执行只读 `select 1`；使用本机及公共 DNS 查询项目域名；使用 `supabase orgs list` 和 `supabase projects list` 核对两个组织；对旧 ref 执行 `supabase projects api-keys` 与 `supabase backups list`。
- 下一步：不要恢复或改写 `smartbillpro` / `helpword`。新建 `wmshr` 专用 Supabase 项目并通过现有 migrations 重建 schema，再同步更新 `SUPABASE_URL`、API keys、`DATABASE_URL` 和本地 Supabase link。

## 2026-07-14 问题 5：Supabase CLI 登录成功后仍无法读取凭据
- 原因：旧版 Homebrew Supabase CLI `2.103.0` 的浏览器登录流程成功把凭据写入 macOS Keychain，但随后的项目列表命令无法自动读取该凭据，持续返回 `Access token not provided`。临时使用 npm `2.109.1` 验证时，该包又缺少当前 `darwin-x64` 二进制。
- 导致的问题：浏览器已完成授权，但旧版全局 CLI 仍表现为未登录，无法核对账号下的项目状态。
- 解决方式：从 Supabase 官方 GitHub Release 下载并校验 `2.109.1` 的 Intel macOS 二进制，确认新版能够读取同一 Keychain 凭据；随后信任官方 `supabase/tap/supabase` formula，并通过 Homebrew 把全局 CLI 从 `2.103.0` 升级到 `2.109.1`。
- 验收结果：`HOME=/Users/admin supabase --version` 返回 `2.109.1`，且未手工注入 token 的 `supabase projects list` 成功返回账号下两个项目，持久登录状态有效。

## 2026-07-14 问题 6：跨项目 Supabase ref 脱敏解析命令被 shell 引号阻断
- 原因：首次用 Node 单行脚本读取 `smartbill/.env` 时，脚本中的单双引号正则与 zsh 外层引号冲突，报 `parse error near ')'`。
- 导致的问题：第一次未能脱敏确认 `smartbillpro` ref 在其他仓库中的具体变量归属。
- 解决方式：移除引号正则，改用字符码判断并剥离包裹引号，只输出命中的变量名、project ref 和 URL host，不输出其他环境变量或密钥。
- 验收结果：确认 `smartbill/.env` 的 `EXPO_PUBLIC_SUPABASE_URL` 指向 `vzpsyyojcvzldlxhxzoa.supabase.co`，从而排除该项目与 `wmshr` 的对应关系。

## 2026-07-14 问题 7：新版 Supabase CLI 在 Codex 环境中阻止交互式重新登录
- 原因：Supabase CLI `2.109.1` 在 Codex 环境中自动使用非交互 JSON 输出模式；直接执行 `logout` 和 `login` 分别报 `Cannot prompt for confirmation in JSON output mode` 与 `Cannot prompt for input in JSON output mode`。
- 导致的问题：首次无法清除现有 token，也无法显示浏览器登录和验证码输入提示。
- 解决方式：退出使用 `supabase logout --yes` 明确确认；登录使用 `supabase login --agent no --output-format text` 显式关闭 agent 非交互模式并启用文本提示。
- 验收结果：旧 token 已删除并成功完成第二次浏览器授权；重新执行 `supabase projects list` 仍返回相同 organization `feqwohlwbuyuagwqpczv` 及相同的 `smartbillpro`、`helpword` 两个项目，说明浏览器再次授权的是同一个账号，旧 `wmshr` ref 仍不在该账号中。

## 2026-07-14 问题 8：旧 Supabase 项目已移除且本机无整库备份
- 现状：Supabase CLI 的项目目录 `supabase/.temp` 只包含 project ref、organization、pooler URL 和组件版本等链接元数据；`~/.supabase` 只有遥测与 HTTP trace，不保存响应体，也未命中员工、考勤或薪资业务字段。CLI 登录凭据保存在 macOS Keychain，trace 中的 Authorization 值为脱敏值，这些都不能用于恢复数据库表数据。
- 已排查：项目目录、桌面项目、下载、文档、废纸篓和 Git 历史中未找到 `pg_dump`、Supabase dump、CSV/JSON 导出或其他整库备份；Time Machine 无可用的主机备份。本机没有 Docker CLI、Docker 进程或 Docker Desktop 数据目录，因此也没有发现 Supabase 本地开发数据卷。
- 可恢复数据：Codex 归档中的真实 API/SQL 命令输出可去重提取 6 名员工记录（其中 1 名明确为演示员工）、7 条 `2026-05`/`2026-06` 薪资计算记录和 3 个 `2026-06-13` 当日考勤状态快照。Electron 缓存另有 2 条 `2026-06-01`/`2026-06-02` 考勤明细，并确认 SOP 列表当时为空。`.codex-tmp` 中的 9 条考勤数据是 schema 脚本内的演示 seed，不应当作原生产数据。
- 数据库结构：`supabase/migrations` 中的迁移可重建 schema，但不包含原生产表数据。
- 验收结果：旧 organization 仍可访问，但其项目列表为空，且旧 ref 的 API key 与 physical backup 接口均返回 `Resource has been removed`。已确认 Supabase CLI 没有可恢复的业务数据缓存；本机目前只能做部分数据恢复，无法从现有本地文件还原完整 Supabase 数据库。
- 下一步：在新建 `wmshr` 专用 Supabase 项目前，先将上述归档输出和 Electron 缓存机械提取为脱离缓存的 JSON 恢复包，再按 migrations 重建 schema 并审核导入。

## 2026-07-14 问题 9：新建 `wmshr` Supabase 项目被逾期账单阻止
- 目标参数：项目名 `wmshr`，organization `yhfosjxfdypsjusdsusi` (`smartbillpro@gmail.com's Org`)，region `us-west-2`，使用默认实例规格。
- 失败原因：执行 `HOME=/Users/admin supabase projects create` 后，Supabase Management API 返回 `There are overdue invoices in the organization(s) wangxiongbiao's Org`，并要求先在 organization invoices 页面结清账单。虽然目标是另一个组织，当前账号下的逾期计费状态仍会阻止新项目创建。
- 安全处理：创建前随机生成的数据库密码曾临时写入 macOS Keychain，不在终端或文件中明文输出；创建失败后已立即删除该 Keychain 条目。
- 验收结果：重新执行 `supabase projects list` 后仍只有原 `smartbillpro` 和 `helpword` 两个项目，确认没有生成失败或半创建的 `wmshr` 项目。
- 解锁条件：需要先在 Supabase 控制台结清 `wangxiongbiao's Org` 的逾期发票；计费状态恢复后，按相同参数重新执行创建。

## 2026-07-14 问题 10：Supabase CLI 无法直接确认当前登录邮箱
- 现状：`supabase orgs list` 可确认当前 CLI 登录仍可访问 `wangxiongbiao's Org` (`feqwohlwbuyuagwqpczv`) 和 `smartbillpro@gmail.com's Org` (`yhfosjxfdypsjusdsusi`)，`supabase projects list` 也仍能读取前者下的 `smartbillpro` 与 `helpword`。
- 限制：Supabase CLI `2.109.1` 没有查询当前用户 profile/邮箱的子命令；organization 名称也不等于当前登录邮箱，不能用组织名代替账号身份结论。
- 已尝试：只读调用 Management API profile，仅计划输出邮箱和 user ID；但从 macOS Keychain 外部读取 `Supabase CLI` token 时被 Keychain ACL/不可见权限提示阻塞，连续两次均未得到 token，已停止重试，未暴露或改写凭据。
- 当前结论：可确认登录态未丢失且仍可访问上述两个组织；精确登录邮箱需以 Supabase Dashboard 右上角用户菜单显示为准。

## 2026-07-14 问题 11：长期暂停项目的数据库与 Storage 备份只能从 Dashboard 下载
- 目标项目：`smartbillpro` (`vzpsyyojcvzldlxhxzoa`, `us-west-2`) 和 `helpword` (`clclwhfzaqktsmukxpyj`, `us-east-1`)，两者当前均为 `INACTIVE`。
- CLI 排查：两个项目的 `supabase backups list` 均返回空 `backups` 与空 `physical_backup_data`；Functions、Secrets、SQL Snippets 和 API keys 列表也均为空。本机未找到这两个项目的数据库密码或 `DATABASE_URL`，`smartbill` 仓库只保存了前端 URL 和 anon key。
- Dashboard 机制：当前 Studio 对长期暂停项目使用 `/platform/projects/{ref}/pause/status` 查询可下载备份 ID，通过 `/platform/database/{ref}/backups/download` 获取数据库签名下载链接，并通过 `/platform/storage/{ref}/archive` 生成和下载 Storage 归档。这类暂停备份不会出现在 CLI `backups list` 中。
- 自动化阻塞：尝试从 macOS Keychain 只读取 `Supabase CLI` token，以自动调用上述 Dashboard 下载接口；但 Keychain ACL 权限对话框在当前执行环境中不可操作，等待后已主动终止进程。临时 token 文件已删除，未暴露或改写凭据。
- 已生成文件：权限受限的备份目录为 `/Users/admin/Desktop/Supabase备份/smartbillpro-helpword-20260714`，已写入 organizations、projects 以及两个项目的 backups/functions/secrets/snippets/api-keys JSON 清单。
- 人工步骤：已在当前浏览器分别打开两个项目 Dashboard；需要在页面中点击 `Download backups`，分别下载 `Database backup` 和 `Storage objects`。下载后再将文件移入上述备份目录、生成 SHA-256 校验和完整性清单。

## 2026-07-15 问题 12：Supabase CLI 重新登录需要绕过 Codex 非交互模式
- 原因：直接执行 `supabase logout` 时，CLI 在 Codex 环境中使用非交互 JSON 输出模式，报错 `Cannot prompt for confirmation in JSON output mode`；首次执行浏览器自动登录流程后回调未在等待窗口内返回。
- 导致的问题：无法通过默认交互流程完成 Supabase CLI 重新登录。
- 解决方式：先执行 `supabase logout --yes` 删除本地 token，再执行 `supabase login --agent no --output-format text --no-browser` 生成手动登录链接；用户在浏览器完成授权并提供 verification code 后，将验证码填回 CLI。
- 验收结果：CLI 输出 `You are now logged in. Happy coding!`；随后执行 `supabase projects list` 成功返回 `{"projects":[],"message":""}`，确认新的 CLI 登录态已生效。

## 2026-07-15 问题 13：重建 Supabase 验证命令被本机 Node/CLI 环境干扰
- 原因：当前 shell 仍继承失效的 `NODE_OPTIONS` preload 路径，导致 Node、CodeGraph 和 Vercel CLI 报 `Cannot find module .../electron-runtime-compat/preload.cjs`；Supabase CLI 读取 API key 时还出现一次 PostHog 退出超时，报 `Timeout while shutting down PostHog. Some events may not have been sent.`。
- 导致的问题：首次读取本地 `.env` 变量名、CodeGraph 查询、Vercel env 命令和一次 Supabase API key 读取被中断。
- 解决方式：对 Node/Vercel/CodeGraph 相关命令统一使用 `env -u NODE_OPTIONS ...`；执行 `supabase telemetry disable` 关闭本机 Supabase CLI telemetry，避免遥测退出阶段影响真实管理命令结果。
- 验收结果：后续成功静默更新 `apps/admin/.env`，成功更新 Vercel production 环境变量，并完成 Supabase `db push`、`db lint` 与数据库 smoke test。

## 2026-07-15 问题 14：本地重启脚本的前端服务在验证窗口内消失
- 原因：`scripts/restart-dev-services.sh` 原先只把 Admin API 和 Expo 放入 tmux，Admin Web 与 Home Web 仍由 `nohup` 托管；本机桌面环境中这两个前端进程会出现“健康检查刚通过、随后监听端口消失”的情况。后续手动 `curl` 还被 `ALL_PROXY=http://127.0.0.1:7897` 代理到本机代理，返回 502，干扰了真实直连判断。
- 原计划验证入口：执行 `npm run restart:dev` 后验证 `/api/health`、Admin Web、Home Web 和 Expo/Metro 监听。
- 解决方式：将 Admin Web 与 Home Web 也改为独立 tmux session 托管，并在脚本中统一检查对应 tmux session 是否提前退出；HTTP 验证改用 `curl --noproxy '*'` 直连本机端口。
- 验收结果：重新执行 `env -u NODE_OPTIONS npm run restart:dev` 成功，`127.0.0.1:8788/api/health` 返回 `{"ok":true}`，`127.0.0.1:3000/` 与 `127.0.0.1:3001/` 均返回 `200 text/html`，端口 `3000`、`3001`、`8788`、`8081` 均处于监听状态。

## 2026-07-15 问题 15：Supabase Google OAuth authorize 验证被代理 CONNECT 状态误判
- 原因：本机 `curl` 经过代理访问 `https://ptsmigtxbtruohvchskf.supabase.co/auth/v1/authorize` 时，响应头文件中先出现代理 CONNECT 的 `HTTP 200`，随后才是 Supabase Auth 的 `HTTP 302` 跳转；首次验证脚本只读取第一条 HTTP 状态，因此误判为未返回跳转。
- 导致的问题：Google OAuth provider 已配置成功，但首次非交互验证命令以退出码 `2` 失败。
- 解决方式：改为读取所有 HTTP 状态并解析 `location` 头；确认最终跳转主机为 `accounts.google.com`、路径为 `/o/oauth2/v2/auth`，且 `client_id` 与 Google Console OAuth Client ID 一致。
- 验收结果：Supabase Auth 已能生成 Google OAuth 授权跳转；剩余完整登录闭环需要在浏览器中用真实 Google 账号完成。

## 2026-07-15 问题 16：移除 admin 一键初始化后构建产物仍含旧文案
- 原因：前端 `App.tsx` 和后端 API 已删除一键初始化入口后，`packages/i18n/src/namespaces/admin.ts` 仍保留旧初始化相关翻译 key；Vite 会把全量 admin 翻译资源打入产物，因此 `apps/admin/dist` 仍能检索到“立即初始化当前后台”等旧文案。
- 导致的问题：首次验证 “源码/产物均不含一键初始化入口” 时，源码检查通过但构建产物检查失败。
- 原计划验证入口：`npm --workspace @wmshr/admin run lint`、`npm --workspace @wmshr/admin run build` 后检索源码和 `apps/admin/dist` 中的初始化入口文案与接口路径。
- 解决方式：删除 i18n admin namespace 中已无代码引用的初始化相关 key，再重新执行 admin lint/build。
- 验收结果：`npm --workspace @wmshr/admin run lint` 与 `npm --workspace @wmshr/admin run build` 均通过；重启本地服务后，`/api/health` 返回 `{"ok":true}`，Admin 根页面返回 `200 text/html`，源码和构建产物均不再含一键初始化入口文案或 `/workspace/bootstrap*` 路径。

## 2026-07-15 问题 17：生产发布脚本在空库 APK 验证阶段失败并触发回滚
- 原因：新 Supabase 空库没有 `mobile_app_releases` 记录，`/api/public/mobile-app-update` 返回“Android 更新信息未配置完整”；发布脚本仍把当前 APK 作为强制发布前置条件。失败路径里 `staged_mobile_release` 退化为 `apps/home/public/downloads/` 目录，`rm -f` 目录失败又阻断了 `vercel.json` 的 RETURN trap 恢复。
- 导致的问题：第一次生产发布已完成 Supabase up-to-date 检查、GitHub `main` 提交推送和两个 Vercel 构建，但生产验证未完成，脚本退出码为 1 并触发自动回滚；工作区短暂留下门户版 `vercel.json` 和空 APK 临时文件。
- 原计划验证入口：执行 `npm run deploy:prod -- -m "release production rebuild supabase and remove admin bootstrap"`，由脚本完成 lint/build/db push/commit/push/Vercel 发布/正式域名验证。
- 解决方式：恢复根 `vercel.json` 为 admin 配置并删除临时下载目录；更新发布脚本，让空库未配置 Android release 或门户代理返回移动更新 `fetch failed` 时跳过 APK staging 和 APK 下载验证，同时把 Vercel portal 生产部署的自动 alias 标记为可回滚，并确保临时文件清理不会阻断 `vercel.json` 恢复。
- 验收结果：已通过 `bash -n scripts/deploy-production.sh` 静态校验，并重跑完整 `npm run deploy:prod -- -m "fix production deploy for empty mobile release"` 成功；发布脚本退出码为 0，GitHub release HEAD 为 `c9218ee9fe31737e6e0d8c40ea38a62034f8eab9`，`admin.dutylix.com` 指向 `dutylix-admin-7bo4um1rg-wang-lins-projects.vercel.app`，`dutylix.com` 指向 `dutylix-45ss8pq1h-wang-lins-projects.vercel.app`。空库未配置 APK 被明确跳过，页面和核心 API 仍完成生产验证。
