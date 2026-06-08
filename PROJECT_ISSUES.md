# PROJECT_ISSUES

### 2026-06-07 问题 1
- 原因：当前终端未登录 Expo（`npx eas-cli whoami` 返回 `Not logged in`），且环境变量 `EXPO_TOKEN` 不存在。
- 导致的问题：执行 `npx eas-cli build:view 3088a98a-5ec4-459d-8aa6-2fd5734f8fa3 --json` 失败，无法读取 EAS build 的 `artifacts.applicationArchiveUrl`。
- 当前判断：门户要接真正 APK 直链，仍需先拿到该 build 的 artifacts 字段；公开 build 页面 URL 本身不是 APK 直链。
- 已尝试：
  - 执行 `npx eas-cli whoami`
  - 执行 `npx eas-cli build:view 3088a98a-5ec4-459d-8aa6-2fd5734f8fa3 --json`
  - 检查当前进程环境中的 `EXPO_TOKEN` 是否存在（仅确认有无，不回显值）
- 下一步：
  - 在当前机器先执行 `npx eas-cli login` 登录后重跑 `build:view --json`，或
  - 在当前命令环境注入 `EXPO_TOKEN=[REDACTED]` 后重跑同一命令。

### 2026-06-07 问题 2
- 原因：执行 `HOME=/Users/admin npm run deploy:prod` 时，发布脚本在 `git fetch origin main` 阶段遇到远端传输异常：`RPC failed; curl 16 Error in the HTTP2 framing layer`。
- 导致的问题：一键生产发布在提交和 Vercel 部署前中断，当前工作区未进入自动提交阶段。
- 当前判断：这是 Git HTTP/2 传输层的瞬时网络/协议问题，不是 lint、build、测试、Supabase 推送或工作区内容本身失败。
- 已尝试：
  - 已完整执行到 `npm run lint`、`npm run build`、`git diff --check`、`node apps/admin/server/attendance-v2.test.mjs`、`supabase db push --yes`、`supabase migration list --linked`
  - 记录原始失败信息：`fatal: expected flush after ref listing`
- 下一步：
  - 先用 `git -c http.version=HTTP/1.1 fetch origin main` 做最小重试
  - 若重试成功，继续执行生产发布脚本
  - 若仍失败，再进一步改用 Git 传输层参数或检查远端连通性

  ### 2026-06-07 问题 3
  - 原因：门户新增 `qrcode` 依赖后，Vite 旧的依赖预构建缓存仍在被浏览器和 dev server 使用，出现 `Outdated Optimize Dep`；同时 `home-web.log` 中出现对 `apps/home/node_modules/i18next/dist/esm/i18next.js` 的旧解析路径读取失败，说明 workspace hoisted 依赖与本地 Vite 优化缓存状态不一致。
  - 导致的问题：首页本地开发环境报错，浏览器日志出现 `GET /node_modules/.vite/deps/qrcode.js ... 504 (Outdated Optimize Dep)`，页面资源加载异常。
  - 解决方式：删除 `apps/home/node_modules/.vite` 的依赖优化缓存，随后执行项目现有重启脚本 `npm run restart:dev`，让 `home-web` 基于当前依赖树重新生成 Vite 预构建结果；最终用 `http://127.0.0.1:3001/` 作为重复可核验的验收入口确认服务恢复。

### 2026-06-07 问题 4
- 原因：执行一键生产发布脚本时，代码检查、构建、测试、Supabase 推送、migration 校验、git fetch / commit / push 全部成功，但在 `vercel deploy --prod --yes` 阶段触发 Vercel 文件体积限制，CLI 输出 `Uploading (0.0B/2.4GB)` 后报错 `File size limit exceeded (100 MB)`，说明当前发布上下文把不应进入 Vercel 的大体积文件一并带上了。
- 导致的问题：生产发布在 Vercel 阶段中断，GitHub 已推送到 `main`，但线上部署未完成。
- 当前判断：阻塞不在代码编译或数据库迁移，而在 Vercel 上传范围配置；需要检查 `vercel.json`、项目根目录发布上下文和忽略规则，缩小上传内容后再重发。
- 已尝试：执行 `HOME=/Users/admin npm run deploy:prod`，确认失败点固定在 `vercel deploy --prod --yes`。
- 下一步：定位哪些目录被打进 Vercel 上传上下文，补正确的忽略或发布根目录配置后重跑生产发布。
