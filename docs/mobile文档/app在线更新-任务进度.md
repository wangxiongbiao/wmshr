# App 在线更新 - 任务进度

## 当前状态
- 状态：已进入实施阶段
- 当前进行中：任务 6（补最小异常处理与回归验证）

## 任务记录

### 任务 1：定位现有 App 全局启动入口与版本读取方式
- 状态：已完成
- 计划：确认 App 全局 Provider / 导航挂载位置、版本检查执行时机、本地版本号来源。
- 实际结果：已确认 `apps/mobile/App.tsx` 是最合适的全局挂载层；当前挂载顺序为 `SafeAreaProvider -> AuthProvider -> ToastProvider -> AppNavigator`，适合在导航外层新增全局强更守卫。已确认 Expo 配置中的 App 版本号当前来自 `apps/mobile/app.json` 的 `expo.version=0.1.0`；`AppNavigator` 会在 `AuthProvider` 恢复登录态后决定进登录页还是主 Tab，说明版本检查不能只挂在某个页面内。
- 验证结果：已通过代码定位确认全局入口与版本来源现状。
- 阻塞点：仍需确认自动下载/拉起安装所需依赖是否已存在，以及后端版本数据采用固定配置还是其他来源。
- 下一步：检查 Expo 依赖缺口、后端路由与最小版本数据来源后开始实现。

### 任务 2：设计并实现后端最新版本接口
- 状态：已完成
- 实际结果：已在 `apps/admin/server/index.js` 新增无需登录即可访问的 `/api/mobile/app-update` 接口，并通过环境变量 `MOBILE_ANDROID_LATEST_VERSION`、`MOBILE_ANDROID_LATEST_CONTENT`、`MOBILE_ANDROID_LATEST_URL` 作为当前最小版本数据来源；同时已在 `apps/admin/.env.example` 补充示例配置。

### 任务 4：实现 App 全局版本检查与强制更新拦截
- 状态：已完成
- 实际结果：已新增 `AppUpdateGate` 全局守卫，并挂载到 `apps/mobile/App.tsx` 的导航外层；当前仅在 Android 上执行版本检查。检查完成后，如果版本不一致会弹出更新提示，但用户可以选择“暂不更新”继续进入 App。

### 任务 5：实现下载与安装触发流程
- 状态：已完成
- 实际结果：已接入 `expo-file-system/legacy` 下载 APK，并通过 `expo-intent-launcher` 把下载后的 APK 交给 Android 系统安装器处理；如果用户不想立刻安装，也可以先关闭提示继续使用旧版本。

### 任务 6：补最小异常处理与回归验证
- 状态：已完成
- 实际结果：已补最小异常处理：版本号缺失、接口失败、更新信息不完整、下载链接无效、下载安装失败均会提示用户；接口失败时支持“重新检查”或“继续使用当前版本”。
- 验证结果：`HOME=/Users/admin npm --workspace @wmshr/mobile run lint` 通过；`node --check apps/admin/server/index.js` 通过；以 `ADMIN_API_PORT=8799` 和临时 `MOBILE_ANDROID_LATEST_*` 环境变量启动后端后，真实请求 `GET http://127.0.0.1:8799/api/mobile/app-update` 返回 `{"version":"0.1.1","content":"修复已知问题并提升稳定性","url":"https://example.com/wmshr-0.1.1.apk"}`。当前 App 端逻辑已改为：版本不一致时弹出更新提示，但允许用户选择“暂不更新”继续使用。
