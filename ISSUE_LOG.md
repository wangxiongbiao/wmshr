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
