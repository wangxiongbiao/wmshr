# PROJECT_ISSUES

### 2026-06-17 问题 3：一键生产发布被分支保护拦截
- 原因：执行项目既有生产发布入口 `HOME=/Users/admin npm run deploy:prod` 时，脚本 `scripts/deploy-production.sh` 检查到当前分支不是 `main`，报错 `Release must run on main, current branch: codex/mobile-empty-shell-test` 并主动退出。
- 导致的问题：本次生产发布尚未开始进入 lint / build / push / Vercel 部署阶段，无法继续执行正式环境发布。
- 当前判断：这不是发布脚本本身故障，而是仓库当前停留在功能分支；同时 `origin/main...HEAD` 处于双方各多 1 个提交的分叉状态，不能在未确认发布来源的情况下直接切换或强推。
- 已尝试：
  - 通过项目现成一键入口 `npm run deploy:prod` 发起正式发布；
  - 读取发布脚本确认它只允许在 `main` 上运行，且后续会自动 commit / push / Vercel alias / 线上验收；
  - 检查当前仓库状态，确认工作区仍有大量未提交改动与未跟踪文件，不适合未经确认直接切分支执行。
- 解决方式：改用已存在的 `main` 独立 worktree `/Users/admin/Desktop/project/wmshr-main-sync` 作为发布工作区，避免动当前脏工作区，并以 `origin/main` 对齐的内容继续生产发布。

### 2026-06-17 问题 4：隔离发布工作区的 Supabase link 状态缺失，阻塞默认 db push
- 原因：在 `main` worktree 中重新执行一键发布时，脚本已通过 lint / build / attendance 测试，但在 `supabase db push --yes` 阶段报错：`Cannot find project ref. Have you run supabase link?`。
- 导致的问题：默认生产发布流程在数据库步骤提前退出，尚未进入 Git push、Vercel 部署和线上验收。
- 当前判断：当前 `main` 相比上次正式发布提交 `f4c7c06` 没有任何 `supabase/` 目录变更，新增内容仅涉及移动端前端文件，因此这次失败更像是隔离 worktree 缺少本地 Supabase link 状态，而不是本次发布存在待执行 migration。
- 已尝试：
  - 在 `main` worktree 中按项目既有一键入口真实执行发布流程；
  - 读取失败报错并确认阻塞点位于 `supabase db push --yes`；
  - 对比 `f4c7c06..HEAD` 的文件差异，确认 `supabase/` 下无任何改动。
- 下一步：
  1. 使用脚本已提供的 `--no-db` 选项重跑正式发布，避免让无 migration 变更的发布被本地 link 状态阻塞；
  2. 若重跑后其余发布链路通过，则把本次问题回填为“通过无数据库变更校验后使用 `--no-db` 完成发布”；
  3. 若后续有真实 migration 需要上线，再回到带有效 Supabase link 的工作区执行默认发布流程。

### 2026-06-17 问题 5：前台非登录 shell 缺少 Vercel CLI PATH，阻塞 `--no-db` 重跑
- 原因：在同一 `main` worktree 中前台执行 `npm run deploy:prod -- --no-db` 时，脚本启动后立即报错 `Required command not found: vercel`。
- 导致的问题：基于 `--no-db` 的第二次重跑尚未进入 Git push / Vercel 部署阶段。
- 当前判断：这不是仓库代码问题，更像是 Hermes 当前前台 shell 与登录 shell 的 PATH 差异；此前在 PTY 环境中同一脚本能够继续跑到 `supabase db push`，说明 `vercel` CLI 实际已安装，只是当前 shell 没加载到对应 PATH。
- 已尝试：
  - 在前台非 PTY shell 中真实执行 `npm run deploy:prod -- --no-db`；
  - 对比“之前能跑到 Supabase 步骤”的 PTY 环境，确认这次更早失败在 `require_command vercel`。
- 下一步：
  1. 对比当前 shell 与登录 shell 的 `command -v vercel` / PATH；
  2. 复用能拿到 `vercel` CLI 的真实 shell 环境重跑 `--no-db` 发布；
  3. 若需要，再把 PATH 差异写回项目级问题记录，避免后续重复踩坑。

### 2026-06-17 问题 6：无本地提交的 `git push origin main` 被 HTTPS SSL 错误拦截
- 原因：补齐 PATH 后重跑 `npm run deploy:prod -- --no-db`，脚本已通过 lint / build / attendance 测试，并确认 `No local changes to commit.`，但在 `git push origin main` 阶段报错：`LibreSSL SSL_connect: SSL_ERROR_SYSCALL in connection to github.com:443`。
- 导致的问题：默认一键发布流程在进入 Vercel 部署前被 Git 推送步骤中断。
- 当前判断：由于这次运行前已 `git fetch origin main` 成功，且脚本明确输出“没有本地改动可提交”，这更像是对一个本可 no-op 的 push 发生了瞬时 HTTPS 连接失败，而不是代码或发布输入本身存在问题。
- 已尝试：
  - 在 `main` worktree 中使用登录 shell PATH 补齐 `vercel` 后重跑 `--no-db` 发布；
  - 确认脚本在 push 前已经通过 lint、build、attendance 测试，并输出 `No local changes to commit.`。
- 解决方式：核对后确认 `HEAD`、`origin/main` 与远端 `refs/heads/main` 的 SHA 完全一致，因此把这次 `git push` 失败视为无改动场景下的瞬时网络噪音；后续继续沿用同一一键发布脚本，但允许该 no-op push 不再阻塞发布。

### 2026-06-17 问题 7：隔离 worktree 缺少正式 `.vercel` 绑定，导致管理端被误发到临时项目
- 原因：在 `main` worktree 里继续执行一键发布时，本地 `.vercel/project.json` 不再是正式项目 `dutylix-admin`，而是被 Vercel CLI 自动绑定成了新项目 `wmshr-main-sync`。
- 导致的问题：管理端构建虽然成功上传，但部署 URL 变成了 `wmshr-main-sync-...vercel.app`，不符合发布脚本对正式管理端 `dutylix-admin-*` 域名的安全校验，脚本因此在后续解析/别名阶段退出。
- 当前判断：这是隔离 worktree 的本地 Vercel 元数据缺失所致，不是仓库代码、构建产物或正式域名本身的问题；原工作区的 `.vercel/project.json` 仍正确指向 `dutylix-admin`。
- 已尝试：
  - 在修复 PATH 和 no-op push 阻塞后重跑同一一键发布脚本；
  - 读取原工作区与隔离 worktree 的 `.vercel/project.json`，确认二者分别指向 `dutylix-admin` 与 `wmshr-main-sync`。
- 下一步：
  1. 把隔离 worktree 的 `.vercel/project.json` 改回正式项目 `dutylix-admin`；
  2. 继续使用同一一键发布脚本重跑 `--no-db` 发布；
  3. 验证管理端和门户正式域名都通过脚本内建验收。

### 2026-06-17 问题 8：后续重跑时 `git fetch origin main` 也受到同类 HTTPS SSL 抖动影响
- 原因：修正 `.vercel` 绑定后再次重跑一键发布，脚本在 `git fetch origin main` 阶段报错：`LibreSSL SSL_connect: SSL_ERROR_SYSCALL in connection to github.com:443`。
- 导致的问题：发布脚本在进入 Git 对齐检查前再次被网络层 HTTPS 抖动中断。
- 当前判断：这与前一个 no-op push 的阻塞属于同一类 Git HTTPS 瞬时连接问题；在此之前，本地 `HEAD`、`origin/main` 与远端 `refs/heads/main` 已经被核对为同一 SHA，因此更可能是网络波动而不是仓库状态变化。
- 已尝试：
  - 纠正隔离 worktree 的 `.vercel/project.json` 到正式项目后重跑同一脚本；
  - 观察到新的阻塞点前移到 `git fetch origin main`。
- 下一步：
  1. 用更轻量的 `git ls-remote origin refs/heads/main` 再次核对远端 SHA；
  2. 若远端仍与本地 `HEAD` 一致，则把这次 `fetch` 视为被网络噪音拦住的无必要同步步骤，并继续执行发布脚本后续阶段；
  3. 若远端不一致，再停止旁路并重新处理 Git 同步。

### 2026-06-17 问题 9：管理端生产页内容验收阶段受到脚本网络/验收噪音影响，但线上管理端已实际恢复
- 原因：一键发布脚本在 `Production verification` 阶段退出，阻塞点出现在最终线上验收而不是构建、部署或 alias；期间既出现过首页文本 marker 校验失败，也出现过脚本内 `curl` 验收链路的瞬时网络噪音。
- 导致的问题：脚本未能把已经成功完成的管理端生产部署标记为成功，必须改用真实线上核对来判定结果。
- 实际核对结果：
  - `https://admin.dutylix.com` 返回 `200`；
  - `https://admin.dutylix.com/api/health` 返回 `200` 与 `{"ok":true}`；
  - `https://admin.dutylix.com/api/admin/employees` 未登录返回 `401`，说明后台门禁与 API 路由正常。
- 当前结论：管理端生产发布实际已成功；阻塞点是脚本验收链路不稳定，不是线上管理端故障。
- 后续建议：
  1. 将脚本中的管理端最终验收调整为更稳定的正式域名/接口组合校验；
  2. 保留首页可见资源检查，但不要只依赖单一文本 marker 或单次网络请求结果。

### 2026-06-17 问题 10：门户生产 API 依赖同源 `/api/*`，而 `dutylix` 项目最初未注入函数环境变量；现已补齐并恢复
- 原因：排查 `https://dutylix.com/api/health` 的 `500 FUNCTION_INVOCATION_FAILED` 时，运行时日志显示 `injected env (0)`；同时门户源码 `apps/home/src/App.tsx`、`apps/home/src/components/EmailFormPage.tsx`、`apps/home/server.ts` 明确依赖 `/api/public/mobile-app-update`、`/api/public/lead-requests`、`/api/public/google-auth-url` 等同源接口。
- 导致的问题：门户正式域名虽然已指向新 deployment，但其同源 API 层当时不可用，发布不能视为完成。
- 已定位结果：
  - `dutylix-admin` 生产环境有 7 个相关变量；
  - `dutylix` 生产环境最初为 `envs: []`；
  - 从本地 `apps/admin/.env` 补齐了 6 个有实际值的 Supabase 相关生产变量到 `dutylix` 项目；
  - 重新发布门户后，`dutylix.com` 同源 API 恢复正常。
- 实际核对结果：
  - `https://dutylix.com` 返回 `200`；
  - `https://dutylix.com/favicon.ico` 与 `https://dutylix.com/dutylix-icon.svg` 返回 `200`；
  - `https://dutylix.com/api/health` 返回 `200` 与 `{"ok":true}`；
  - `https://dutylix.com/api/public/mobile-app-update` 返回 `200` 与最新下载信息 JSON；
  - 门户生产 bundle 中可见 `Use Now` / `立即使用` 标记。
- 当前结论：门户生产发布已恢复并验收通过；这次阻塞来自 `dutylix` 项目环境配置缺失，而不是门户构建、域名 alias 或静态资源本身错误。
- 后续建议：
  1. 将 `dutylix` 项目的生产环境变量纳入固定发布前检查项；
  2. 后续若继续维护一键脚本，可把门户 API 所需环境校验前置，避免先 alias 后发现函数层缺参。

### 2026-06-15 问题 1：Expo EAS Android APK 构建在 Install dependencies 阶段失败
- 原因：EAS 云端构建 `d4a77edb-05a0-4407-90c2-4880107d219f` 返回 `UNKNOWN_ERROR`，错误文案指向 **Install dependencies** 阶段：`Unknown error. See logs of the Install dependencies build phase for more information.`
- 导致的问题：基于当前工作区版本发起的 Android `preview`（APK）构建未产出可下载 APK。
- 当前判断：这次失败与同一代码指纹 `1c7c163232572a8ff43fdc0672d62be3211bb421` 的前两次 Android 构建失败现象一致，说明更像是依赖安装/云端构建环境层面的稳定问题，而不是单次偶发队列问题。
- 已尝试：
  - 通过项目现成入口 `npm run build:android:preview -- --non-interactive` 发起构建；
  - 使用 `npx eas-cli build:view d4a77edb-05a0-4407-90c2-4880107d219f --json` 确认最终状态为 `ERRORED`；
  - 尝试抓取 EAS 日志直链做进一步定位，但本地通过 Python 抓取时遇到证书链校验失败，`curl --compressed` 未返回有效日志正文。
- 下一步：
  1. 继续从 EAS Web 页面或刷新后的 CLI 日志查看 Install dependencies 详细报错；
  2. 优先检查 `apps/mobile/package.json`、锁文件、Expo SDK 54 相关依赖解析是否存在云端安装冲突；
  3. 必要时清理/调整依赖后重新发起 `preview` APK 构建。
- 相关构建：
  - Build ID：`d4a77edb-05a0-4407-90c2-4880107d219f`
  - Build 页面：`https://expo.dev/accounts/tthhers/projects/wmshr-app/builds/d4a77edb-05a0-4407-90c2-4880107d219f`
  - Profile：`preview`
  - App Version：`0.1.21`

### 2026-06-16 问题 2：Supabase CLI 无法在本机 Darwin x64 环境拉起，阻塞 customers migration 远端状态确认
- 原因：执行 `npx supabase migration list` 时，CLI 安装阶段报错：`No matching Supabase CLI binary package found for darwin-x64`。
- 导致的问题：无法通过预期的 Supabase CLI 路径直接确认 `20260616041000_add_customer_accounts.sql` 是否已在当前远端环境执行。
- 原计划验证入口：使用 `npx supabase migration list` / 后续 migration push，确认 customers 表结构已在 Supabase 侧存在。
- 实际阻塞：当前机器的 `npx supabase` 无可用 darwin-x64 二进制，CLI 在启动前即失败。
- 已尝试：
  - 在项目根目录直接执行 `npx supabase migration list`；
  - 确认项目存在 `supabase/config.toml`，排除“未初始化 Supabase 项目”的原因。
- 替代验证：
  - 继续以代码级链路核验为主：确认 `apps/admin/src/lib/api.ts`、`apps/admin/src/App.tsx`、`apps/admin/server/index.js` 已形成 customers 的真实前后端调用闭环；
  - 通过 `npm run build:admin` 与 `npm --workspace @wmshr/admin run lint` 验证编译与类型；
  - 通过已运行的本地 admin 服务验证未登录门禁与 customers 路由可达性；
  - 若后续需要远端落 migration，再改用可用的本地/容器化 Supabase CLI 或由已有数据库管理入口执行 SQL。
- 当前还能成立的替代验收结果：customers 相关源码、迁移文件与前后端接口已落盘且可编译；浏览器匿名访问能到登录门禁，但由于当前 WebUI 会话无后台登录态，尚不能在浏览器里直接完成已登录写操作验收。
- 下一步：
  1. 继续完成 customers 前后端实现与本地可编译验证；
  2. 视环境情况补一个可在这台机器运行的 Supabase 执行入口，或改走数据库管理面板执行 migration；
  3. 获得后台登录态后补做 customers 新增/编辑/店铺绑定/额度流水的已登录态验收。
