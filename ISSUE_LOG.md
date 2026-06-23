# ISSUE_LOG

## 2026-06-15 问题 1：本地 Android Gradle 后台构建未继承 Java 环境
- 原因：通过 Hermes 后台进程执行 `apps/mobile/android/./gradlew assembleDebug` 时，后台 shell 未继承 `~/.zshrc` 中新增的 `JAVA_HOME` / Android SDK PATH。
- 导致的问题：Gradle 进程立即报错：`Unable to locate a Java Runtime.`，本地 Android debug 包未能继续编译。
- 解决方式：
  1. 显式注入 `JAVA_HOME=/usr/local/opt/openjdk@17`、`ANDROID_SDK_ROOT=$HOME/Library/Android/sdk`、`ANDROID_HOME=$ANDROID_SDK_ROOT` 与补全后的 PATH；
  2. 先执行 `npx expo prebuild --platform android` 生成 `apps/mobile/android`；
  3. 再执行 `./gradlew assembleDebug`，完成本地原生编译并成功产出 `apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk`；
  4. 为避免后续重复踩坑，新增项目脚本 `scripts/build-mobile-android-local.sh` 与标准入口 `npm --workspace @wmshr/mobile run build:android:local`，把 Java / Android 环境显式写进脚本，而不是只依赖交互式 zsh 配置。

## 2026-06-15 问题 2：ADB 无线脚本在 macOS 默认 Bash 3.2 下使用 `mapfile` 失败
- 原因：`scripts/adb-connect-wifi.sh` 初版使用了 Bash 4+ 才有的 `mapfile`，而这台 macOS 14.8.3 默认 `/bin/bash` 仍是 3.2；后续发现 `scripts/adb-install-mobile-debug.sh` 也有同类写法。
- 导致的问题：执行 `npm run mobile:adb:wifi` 时直接报错 `mapfile: command not found`，无线 ADB 脚本无法在默认系统 Bash 下运行；安装脚本若走自动选设备分支也会遇到同类失败。
- 解决方式：把两支脚本都改成兼容 Bash 3.2 的数组收集写法，不再依赖 `mapfile`，并重新用项目入口实跑验证。

## 2026-06-15 问题 3：传统 `adb tcpip 5555` 无线模式在当前手机上拔线后不会保持监听
- 原因：电脑侧已确认 ADB 37.0.0 与脚本逻辑正常；多次实测表明，只要拔掉 USB，手机端 `172.16.9.156:5555` 很快就从可连接变成 `offline` / `Connection refused`。当前判断是：这台手机/当前 Android 系统或厂商策略不会稳定保留传统 `adb tcpip 5555` 监听，或会在拔线后主动关闭该监听。
- 导致的问题：虽然插线状态下可以临时执行 `npm run mobile:adb:wifi`、安装 APK、启动 App，但一旦拔线，后续 `adb connect 172.16.9.156:5555`、无线启动、无线日志都会失效，无法作为稳定长期调试链路。
- 已尝试：
  1. 反复执行 `adb tcpip 5555` + `adb connect 172.16.9.156:5555`；
  2. 在拔线前完成无线安装、无线启动、无线日志验证；
  3. 拔线后分别用 `adb devices -l`、TCP 5555 探测、项目脚本三种方式复验，结果一致为设备不再监听。
- 当前判断：问题根因更偏向设备侧 ADB 无线策略，而不是项目脚本或电脑环境；传统 5555 模式在这台手机上不可靠。
- 下一步：优先改走手机系统自带的“无线调试 / Wireless debugging（配对码或二维码）”模式；若该模式可用，再为项目补一条配对/重连脚本化说明，放弃把 `adb tcpip 5555` 当成默认长期方案。
- 最新验证：已在本机通过 `adb mdns services` 发现 `_adb-tls-connect._tcp` 服务 `172.16.9.156:41949`，并成功执行 `adb connect 172.16.9.156:41949`、无线启动 `com.wmshr.app`。说明当前设备的稳定方案应改为“无线调试的动态 TLS 端口”，而不是固定 5555。

## 2026-06-15 问题 4：无线安装 debug APK 时被手机端安装确认拦截
- 原计划验证入口：使用项目标准入口 `npm run mobile:install:android:debug -- --target 172.16.9.156:41949` 安装当前代码构建出的 debug APK，再用 `npm run mobile:launch:android -- --target 172.16.9.156:41949` 启动 App。
- 原因：手机端在覆盖安装 debug APK 时弹出了系统安装/权限确认，当前会话中未在设备上点允许。
- 导致的问题：ADB 安装被中止，真实报错为 `INSTALL_FAILED_ABORTED: User rejected permissions`；因此本轮尚未完成把当前构建安装到手机并启动。
- 已尝试：
  1. 先通过 `npm --workspace @wmshr/mobile run build:android:local` 成功构建最新 debug APK；
  2. 再通过项目安装脚本向无线目标 `172.16.9.156:41949` 执行 `adb install -r`；
  3. 同步检查包名 `com.wmshr.app`，确认安装未成功落到设备上。
- 当前判断：阻塞点在手机端人工确认，不是构建链路或 ADB 连接异常。
- 替代验证：在安装确认放行前，当前仍可成立的验收结果是——无线 ADB 已连通、最新 debug APK 已本地成功构建、安装命令已到达目标设备并被系统确认拦截。
- 下一步：用户在手机上允许安装/覆盖安装后，立即重跑项目安装脚本并继续执行启动脚本，完成真机启动验收。

## 2026-06-15 问题 5：EAS Android production_online 构建在上传项目压缩包阶段失败
- 原计划验证入口：使用项目现成生产入口 `HOME=/Users/admin npx eas-cli build -p android --profile production_online --non-interactive` 发起 Android 生产构建。
- 原因：当前问题不是单一网络错误，而是先后叠加了两层阻塞。第一层是仓库根目录缺少 `.easignore`，EAS CLI 在为 monorepo 生成上传副本时把 `.codegraph/daemon.sock` 一并带入，直接报 `Cannot copy a socket file: cp returned EINVAL ... .codegraph/daemon.sock`；补上项目根 `.easignore`、排除 `.codegraph/` 及与 mobile 云构建无关的目录后，这个前置错误被解除。第二层才是到 Google Storage 签名上传地址的真实链路问题：在带代理环境下报 `write EPIPE`，去掉代理后又分别出现 `read ETIMEDOUT` 与 `Client network socket disconnected before secure TLS connection was established`。
- 导致的问题：生产构建未真正进入远端编译；在 socket 文件阻塞存在时，连项目压缩包准备阶段都过不去；socket 问题修掉后，流程能推进到 HTTPS 上传阶段，但仍会在连接 Google Storage 签名 URL 时中断，因此拿不到线上 production 产物。
- 已尝试：
  1. 已确认使用的是 `production_online` profile；
  2. 已确认远端 Android credentials 与默认 keystore 可用；
  3. 已确认失败点发生在上传阶段，而不是登录态、签名或 profile 配置阶段；
  4. 已看到 EAS 成功完成 `versionCode` 自增与远端 keystore 选择，说明阻塞仍集中在项目压缩包上传链路；
  5. 已确认当前 shell 默认挂着 `HTTP_PROXY/HTTPS_PROXY/ALL_PROXY=http://127.0.0.1:7897`，且经该代理访问 `storage.googleapis.com` / `expo.dev` / `api.expo.dev` 会触发证书链校验失败；
  6. 已用 `curl` 验证系统层直连 `storage.googleapis.com` / `expo.dev` / `api.expo.dev` 可达；
  7. 已把项目标准 EAS 入口统一补成 `--non-interactive`，并在去代理环境下再次实跑同一 production_online 构建；
  8. 已新增项目根 `.easignore`，至少排除 `.codegraph/`、`.codex-tmp/`、`release/`、`node_modules/`、`apps/admin/`、`apps/home/`、`app-v2/`、`electron/` 等与移动端云构建无关的上下文，成功把错误从“本地 socket 文件打包失败”推进到“真实 HTTPS 上传失败”。
- 当前判断：`.easignore` 现在是这条线上构建链路的必需项，否则 EAS 会再次被本地 socket/脏上下文拦住；在此基础上，剩余未解阻塞仍是当前机器到 Google Storage 签名上传地址的 TLS/连接不稳定，而不是 Expo profile、账号、keystore 或交互提示错误。
- 替代验收：当前已补建并实测通过本地 production AAB 入口 `npm run mobile:build:android:production:bundle:local`，成功产出 `apps/mobile/android/app/build/outputs/bundle/release/app-release.aab`；同时本地 release APK `apps/mobile/android/app/build/outputs/apk/release/app-release.apk` 也仍可用。
- 下一步：继续保留 `.easignore`，并在更稳定的网络出口或不同上传环境下，再直接执行 `env -u HTTP_PROXY -u HTTPS_PROXY -u ALL_PROXY -u http_proxy -u https_proxy -u all_proxy HOME=/Users/admin npm run mobile:build:android:production:online` 重试；若当前要继续提交流程或做生产形态校验，先使用本地 release AAB。

## 2026-06-15 问题 9：安装本地 release APK 到真机时，无线 ADB 连接已失效
- 原计划验证入口：把本地 release APK `apps/mobile/android/app/build/outputs/apk/release/app-release.apk` 直接安装到用户手机。
- 原因：当前手机未出现在 `adb devices -l` 里；尝试重连上次可用地址 `172.16.9.156:5555` 返回 `Connection refused`，且 `adb mdns services` 未发现 `_adb-tls-connect._tcp` 目标。
- 导致的问题：现阶段无法直接向真机下发 APK；阻塞点在无线调试会话未广播/未重连，而不是 APK 构建失败。
- 解决方式：
  1. 让用户在手机上重新打开“无线调试 / Wireless debugging”页面，恢复动态 TLS 广播；
  2. 使用用户返回的新目标 `100.70.244.32:40589` 执行 `adb connect`，确认 `get-state=device`；
  3. 为后续复用补建标准入口 `scripts/adb-install-mobile-release.sh` 与 `npm run mobile:install:android:release`；
  4. 通过该标准入口成功安装 release APK，并用 `pm path com.wmshr.app` 与 `dumpsys package` 复验包已落到设备上。

## 2026-06-16 问题 10：Android release APK 启动即闪退
- 原计划验证入口：安装本地 release APK 后直接在真机上启动并验证首页可进入。
- 原因：release JS 初始化阶段直接读取了 Web 专用的 `window.location.search` / `window.location.pathname`。在 React Native 原生环境里 `window` 可能存在，但 `window.location` 不存在，导致启动时抛出 `TypeError: Cannot read property 'search' of undefined`。
- 导致的问题：`com.wmshr.app` 在 `expo-router` 路由初始化前即崩溃，真机表现为一打开就闪退。
- 解决方式：在 `apps/mobile/src/shared/config/env.ts` 改为先判空 `window.location` 后再读取查询参数；在 `apps/mobile/src/application/providers/AuthProvider.tsx` 的 screenshots 路径判断也同步改为 `window.location?.pathname ?? ''`。修复后重新执行 `npm run mobile:build:android:production:local` 与 `npm run mobile:install:android:release -- --target 100.70.244.32:40589`，再次启动时进程保持存活，且 logcat 不再出现原先的 `Cannot read property 'search' of undefined` 崩溃；`adb shell am start -n com.wmshr.app/.MainActivity` 返回“its current task has been brought to the front”，说明主界面已能正常被系统拉起。

## 2026-06-16 问题 11：本地 release 形态包默认仍指向局域网 API，真机显示“网络异常”
- 原计划验证入口：在 release 不闪退后，继续用真机验证登录页或业务页是否能正常访问接口。
- 原因：本地 `production:local` 入口只产出 release 形态 APK，但没有注入 `production_online` 使用的运行时环境变量；`apps/mobile/src/shared/config/env.ts` 会回退到默认局域网地址 `http://172.16.11.231:8788` 与 `appEnv=local`。在 release 变体中，这会让真机看起来像“线上包”，实际却仍连本地局域网接口，从而出现“网络异常”。
- 导致的问题：虽然 APK 不再闪退，但手机上仍显示“网络异常”，不能作为线上环境验收包使用。
- 解决方式：新增本地标准入口 `scripts/build-mobile-android-production-online-local.sh`、`npm run mobile:build:android:production:online:local`，在本地 Gradle release 构建前显式注入 `EXPO_PUBLIC_API_BASE_URL=https://admin.dutylix.com`、`EXPO_PUBLIC_APP_ENV=production`、`NODE_ENV=production`；同时清理 release bundle 缓存后重打，确保 `index.android.bundle` 真实包含 `https://admin.dutylix.com`。随后重新安装到真机并继续做页面级验收。

## 2026-06-16 问题 11：本地 release APK 默认仍连接本地环境，导致真机显示网络异常
- 原计划验证入口：在本地 release 构建链路下直接安装 APK 到手机，并期望它和线上 production 一样连 `https://admin.dutylix.com`。
- 原因：`apps/mobile/src/shared/config/env.ts` 的兜底值是 `EXPO_PUBLIC_API_BASE_URL || 'http://172.16.11.231:8788'` 与 `EXPO_PUBLIC_APP_ENV || 'local'`；而原有本地 release 脚本 `scripts/build-mobile-android-production-local.sh` 只跑 `./gradlew assembleRelease`，没有显式注入线上环境变量，所以即便是 release 形态，运行时仍会回落到本地 API。
- 导致的问题：用户拿到的 release APK 虽然不是 debug 包，但实际上仍访问本地 `172.16.11.231:8788`，在手机端表现为“网络异常”，也不等同于 EAS `production_online` 的运行环境。
- 解决方式：新增标准入口 `scripts/build-mobile-android-production-online-local.sh`、`apps/mobile package.json` 的 `build:android:production:online:local` 与仓库根 `npm run mobile:build:android:production:online:local`，在本地 release 构建前显式导出 `EXPO_PUBLIC_API_BASE_URL=https://admin.dutylix.com`、`EXPO_PUBLIC_APP_ENV=production`、`NODE_ENV=production`。首次验证发现 Gradle 复用了旧的 JS bundle 缓存，因此继续清理 `app/build/generated/assets/createBundleReleaseJsAndAssets` 与 release APK 后重打，最终确认新的 `index.android.bundle` 已包含 `https://admin.dutylix.com`，并重新安装到真机前台运行。
## 2026-06-16 问题 5：无线 ADB 启动本地 Android debug 包时未建立 Metro reverse，导致真机白屏
- 原因：`scripts/adb-launch-mobile-app.sh` 只负责发送 LAUNCHER 事件，没有把 React Native debug 包依赖的 `adb reverse tcp:8081 tcp:8081` 与本机 Metro 8081 监听检查纳入同一条启动链路；而当前 `apps/mobile` 的本地构建脚本产物是 `assembleDebug`，该包会从 Metro 加载 JS bundle。
- 导致的问题：无线安装后虽然能把 `com.wmshr.app` 拉到前台，但手机停在白屏；日志里能看到 `ws://localhost:8081/...`、`isMetroRunning()`，在 reverse 缺失时 bundle 无法正确送达。手动补上 `adb reverse tcp:8081 tcp:8081` 后，`ReactNativeJS: Running "main"` 立即出现，登录页恢复正常渲染。
- 解决方式：
  1. 在 `scripts/adb-launch-mobile-app.sh` 中增加本机 Metro 8081 监听检查，未启动时直接失败并提示先起调试服务；
  2. 在发送 LAUNCHER 事件前，自动执行 `adb -s <target> reverse tcp:8081 tcp:8081`；
  3. 实机复验时先 force-stop，再通过项目标准入口启动，确认白屏消失并进入登录页。

## 2026-06-16 问题 6：移动端根路由默认落到空白首页，且缺少根级 AuthProvider，导致真机启动后再次白屏
- 原因：`apps/mobile/app/index.tsx` 当时只返回一个纯背景色 `<View />`，原生冷启动进入 expo-router 的 `/` 时不会再自动跳去 `/login` 或 `/home`；同时根级 `AppProviders` 未把 `AuthProvider` 挂进路由树，后续登录页和受保护布局中的 `useAuth()` 也存在上下文缺失风险。
- 导致的问题：真机启动时即使原生 Activity 成功拉起，也会看到整屏白色空页面；后续若继续进入登录/业务页，还可能因为 `useAuth must be used within AuthProvider` 在运行时再次失败。
- 解决方式：
  1. 把 `app/index.tsx` 改成按 `loading/session` 状态在启动时立即重定向到 `/login` 或 `/home`，不再渲染空白占位页；
  2. 在 `src/application/AppProviders.tsx` 恢复并保留根层的 i18n ready、`ToastProvider`、`mobileDebugLog`，同时补上缺失的 `AuthProvider`，保证登录页与受保护页面共享同一认证上下文；
  3. 重新构建、无线安装并在真机复验启动结果。

## 2026-06-16 问题 7：移动端更新门禁把低版本号字符串误判为“必须更新”，拦住真机启动验收
- 原因：`src/features/app-update/components/AppUpdateGate.tsx` 里的 `localAppVersionNeedsUpdate()` 当时只做字符串不相等判断：`LOCAL_APP_VERSION !== remoteVersion`；因此当本地版本是 `0.1.21`、远端版本是 `0.1.7` 时，也会被误判成“发现新版本”。
- 导致的问题：App 已经成功拉起到前台，但界面被更新弹窗覆盖，文案显示 `当前版本：0.1.21 / 最新版本：0.1.7`，用户只能看到“稍后再说 / 去更新”，无法进入登录页或业务页，看起来像启动异常。
- 解决方式：
  1. 把版本判断改成按 `.` 分段逐位比较，只在远端版本真实高于本地版本时才返回需要更新；
  2. 保留注释说明为什么不能再用“不相等即更新”的判断，避免后续回退再次把 `0.1.7` 误判成高于 `0.1.21`；
  3. 重新构建、无线安装并在真机复验更新弹窗是否消失。

## 2026-06-16 问题 8：本地 production release 构建在 Hermes 前台 600 秒窗口内超时
- 原计划验证入口：使用新的本地 production 标准入口 `npm --workspace @wmshr/mobile run build:android:production:local`，一次性产出 release APK 与 release AAB。
- 原因：release 变体会执行更重的原生编译、压缩与打包步骤；在 Hermes 前台 `terminal()` 的 600 秒上限内，构建尚未结束就被超时截断。
- 导致的问题：前台命令返回 `Command timed out after 600s`，无法在同一条前台调用里拿到最终产物路径；但从超时前日志看，构建链路已进入真实 release 阶段而非启动即失败。
- 当前判断：更像执行窗口限制，而不是本地 production 脚本或 Gradle 配置立即报错。
- 已尝试：
  1. 先新增 `scripts/build-mobile-android-production-local.sh`，显式注入 Java / Android 环境；
  2. 初版脚本同时跑 `assembleRelease bundleRelease`，在 Hermes 后台长时间无产物落盘，说明把本地侧载 APK 与线上 AAB 链路绑在一起并不适合作为默认本地入口；
  3. 随后把“本地 production”定义收窄为只构建 release APK，并保留 `build:android:production:online` 继续走 EAS 线上 production。
- 解决方式：
  1. 新增并实测通过 `npm --workspace @wmshr/mobile run build:android:production:local` / `npm run mobile:build:android:production:local`；
  2. 本地命令实际执行 `./gradlew assembleRelease`，成功产出 `apps/mobile/android/app/build/outputs/apk/release/app-release.apk`；
  3. 线上 production 保持独立命令 `build:android:production:online`，避免再次把本地 APK 与线上 AAB 混淆。

## 2026-06-16 问题 12：customers 接入时对 `App.tsx` import 区做补丁发生误命中
- 原因：在追加 `fetchCustomers / saveCustomersSnapshot` 导入时，补丁匹配到了已被局部改动过的 `./lib/api` import 段，导致 `App.tsx` 顶部出现嵌套的 `import {` 残片。
- 导致的问题：`App.tsx` 暂时进入语法损坏状态，若直接继续构建会在 TS/ESM 解析阶段失败，阻塞 customers 真实化接入继续推进。
- 解决方式：立即回读文件顶部实际内容，按当前真实导入列表重组 `./lib/api` import 块，并在修复后继续执行 customers Phase 3 开发与验证；不把这次阻塞只留在聊天记录中。

## 2026-06-15 问题 6：无线安装 release APK 时被手机锁屏/AOD 中止
- 原计划验证入口：执行 `npm run mobile:install:android:release -- --target 100.70.244.32:40589`，把本地 release APK 覆盖安装到当前无线 ADB 设备。
- 原因：ADB 安装命令已到达设备，但手机处于 AOD / 锁屏状态，系统安装确认未被人工放行，最终返回 `INSTALL_FAILED_ABORTED: User rejected permissions`。
- 导致的问题：release APK 本轮尚未成功覆盖安装到手机。
- 已尝试：
  1. 已重新通过 `adb connect 100.70.244.32:40589` 恢复无线 ADB；
  2. 已用项目标准脚本 `scripts/adb-install-mobile-release.sh` 发起真实安装；
  3. 已通过 `dumpsys window` 确认失败当时前台是 `AOD`，不是安装确认页。
- 当前判断：阻塞点在手机端需要亮屏解锁并确认安装，不是 APK 缺失、签名错误或 ADB 连接异常。
- 替代验证：当前仍可成立的验收结果是——目标设备已重新连上 ADB、release APK 路径存在、安装命令可到达设备，但需用户先解除锁屏并放行系统安装确认。
- 下一步：用户亮屏解锁后，立即重跑同一条 release 安装命令并验收包名与前台页面。

## 2026-06-16 问题 7：EAS Android production_online 远端构建因 lockfile 不同步失败，修复后已成功出包
- 原计划验证入口：执行 `env -u HTTP_PROXY -u HTTPS_PROXY -u ALL_PROXY -u http_proxy -u https_proxy -u all_proxy HOME=/Users/admin npm run mobile:build:android:production:online`，通过 Expo / EAS 产出正式 Android production AAB。
- 原因：在本地上传与远端任务创建恢复正常后，EAS 远端 `INSTALL_DEPENDENCIES` 阶段执行 `npm ci --include=dev` 失败；真实根因为仓库 `package-lock.json` 与 `apps/mobile/package.json` 不同步，远端日志明确报 `Missing: react-native-webview@13.16.1 from lock file`。
- 导致的问题：第一次恢复上传后的远端 build `bdf5e46d-232a-4946-a4da-ce34e573aba3` 在依赖安装阶段失败，未能进入后续 Android 编译。
- 解决方式：
  1. 先用 Node 解开 EAS 远端 Brotli 日志，确认失败点不是 Expo 平台本身，而是 `npm ci` 的 lockfile 一致性校验；
  2. 在仓库根执行 `npm uninstall react-native-webview --workspace @wmshr/mobile && npm install react-native-webview@13.16.1 --workspace @wmshr/mobile`，强制同步 mobile workspace 的实际安装版本与根 `package-lock.json`；
  3. 本地验收确认 `npm ls react-native-webview --workspace @wmshr/mobile` 已为 `13.16.1`，且 `package-lock.json` 已锁到 `https://registry.npmjs.org/react-native-webview/-/react-native-webview-13.16.1.tgz`；
  4. 重新执行同一条 EAS production_online 命令后，远端 build `0b4e7607-8a78-4e3c-aeb3-4385ee56fbae` 成功完成。
- 最终结果：Expo / EAS 正式 production AAB 已成功产出。
- 产物：`https://expo.dev/artifacts/eas/qWDAH8H5n8fbxpSB9G0P0CJYXp65kPg0wysrnO2Fn-o.aab`
- 关键结论：当前机器的 Expo / EAS 正式上传链路并非不可用；在清理 `.easignore` 前置问题、避开代理变量并修正 lockfile 不同步后，`production_online` 可以成功出正式 AAB。

## 2026-06-16 问题 8：官网 APK 记录已更新到 0.1.22，但下载后安装包内部版本仍显示 0.1.21
- 原因：一键 APK 发布脚本 `scripts/release-mobile-android.sh` 只会修改 `apps/mobile/app.json` 与 `apps/mobile/package.json` 的 `version`，然后发起 EAS `preview_online` 构建并把数据库版本记录回填为 0.1.22。
- 导致的问题：由于仓库已经存在原生 `apps/mobile/android/` 目录，Android 构建实际仍读取 `apps/mobile/android/app/build.gradle` 里的 `versionName "0.1.21"` / `versionCode 1`，因此生成出来的 APK 内部版本仍是 0.1.21；官网接口与下载文件名虽然已切到 0.1.22，但用户安装后看到的 App 版本还是 0.1.21，形成线上版本号不一致。
- 已验证：
  - EAS build `da27d077-0f76-4f63-9e53-57526fb4345f` 返回 `appVersion: 0.1.21`
  - `apps/mobile/android/app/build.gradle` 当前仍写死 `versionName "0.1.21"`
  - 手机已安装包 `com.wmshr.app` 的 `versionName=0.1.21`
- 下一步：
  - 修正发布链路，让一键脚本同步更新 Android native `versionName/versionCode`（必要时同时校准 iOS/应用内本地版本常量）；
  - 重打新的 APK 后再回填官网记录，避免数据库版本号先于真实 APK 版本号。 

## 2026-06-16 问题 9：官网 Expo/EAS APK 安装后启动即闪退，根因是 Expo 原生模块版本不兼容
- 原因：真实安装官网 APK（EAS build `da27d077-0f76-4f63-9e53-57526fb4345f`，artifact `FvjFH6lFjj-QaMW4nzHz8732x6ml9bjyDr5pBQbdiA4.apk`）到真机后，启动日志出现 `java.lang.NoClassDefFoundError: Failed resolution of: Lexpo/modules/kotlin/types/AnyTypeCache;`，崩溃栈从 `expo.modules.webbrowser.WebBrowserModule.definition(WebBrowserModule.kt:181)` 开始，说明 `expo-web-browser` 启动时引用了当前打包产物里不存在的 Expo Kotlin 类型类。
- 导致的问题：官网 / App 内更新下载到的 Expo/EAS APK 一启动就崩溃退出；而本地 APK 可正常打开，用户会误以为是同一个包的随机闪退。
- 已验证：
  - 真机安装官网 APK 成功：`adb install -r .../tmp/eas-apk/wmshr-eas-preview-online.apk` 返回 `Success`
  - 启动后真机 `logcat` 明确报错：`NoClassDefFoundError ... AnyTypeCache`，调用链位于 `expo-web-browser` → `expo.modules.kotlin` → `ReactHostImpl`
  - 当前依赖树中 `expo-web-browser@56.0.5`
  - 当前依赖树中 `expo-modules-core@3.0.30`
  - 本地搜索 `node_modules/expo-modules-core` 不存在 `AnyTypeCache`，说明 `expo-web-browser` 当前产物与仓库里的 Expo core 版本不匹配
  - 同一官网 APK 的 EAS 元数据仍显示 `appVersion: 0.1.21`，且已确认发布脚本没有同步更新 native `versionName`
- 当前判断：
  - 远端 Expo/EAS APK 闪退的直接根因是 Expo 模块组合不兼容；`expo-web-browser` 所在版本需要的 Kotlin runtime/class 不在当前 `expo-modules-core@3.0.30` 中
  - 本地 APK 不闪退，至少说明“业务 JS / API 地址”不是首要根因；优先修依赖版本与原生工程同步链路
- 下一步：
  - 校准 Expo SDK 54 对应的模块版本，优先把 `expo-web-browser` 等 Expo 包改回与 `expo@54.0.35` 兼容的精确版本，避免使用跨 SDK 的 `^56.0.5`
  - 重新安装依赖并重建原生工程/重新构建 APK，再做真机复验
  - 同步修复一键发布脚本，使版本号更新同时覆盖 native `versionName/versionCode`，避免官网记录与 APK 内部版本再次分叉

## 2026-06-16 问题 10：EAS preview_online 新一轮构建在上传元数据阶段异常后最终失败
- 触发命令：`HOME=/Users/admin npm run mobile:release:android`
- 对应 build：`e768310f-e6e6-48eb-9333-2667eaea8da6`
- 现象：EAS CLI 在上传阶段出现 `Failed to upload metadata to EAS Build`，目标为 `storage.googleapis.com/turtle-v2-projects-metadata/...`；随后虽然 CLI 显示 `Uploaded to EAS` 且完成了 fingerprint 计算，但最终远端状态仍为 `Build failed`。
- 当前判断：这是另一类独立问题，更像 EAS 远端上传/构建链路不稳定或服务端失败；它不同于已在真机上确认的 Expo APK 启动闪退（`NoClassDefFoundError: expo.modules.kotlin.types.AnyTypeCache`）。
- 下一步：若继续走 EAS 官网 APK 方案，需要先修 Expo 模块版本兼容，再重试 EAS；若只为先恢复官网可下载可安装，优先切回本地验证通过的 APK 发布链。 

## 2026-06-16 问题 11：重新执行生产 AAB 一键发布脚本，生成新的 production AAB 版本
- 原因：先前下载到 `~/Downloads` 的 production AAB 来自旧 build `0b4e7607-8a78-4e3c-aeb3-4385ee56fbae`，内部版本为 `0.1.21 (build 11)`，用户要求重新使用一键发布脚本生成新版本 AAB。
- 解决方式：实际执行项目现成一键入口 `HOME=/Users/admin npm run mobile:release:android:play`。本地 CLI 在等待阶段多次出现 `Client network socket disconnected before secure TLS connection was established`，但新的远端 EAS production build 仍成功创建并最终完成：build `2c1c7914-a209-4f9d-be14-1b3db718979e`，profile `production_online`，`appVersion 0.1.24`，`appBuildVersion 12`，artifact 为 `https://expo.dev/artifacts/eas/YITwOPmVrkBG34VZtNfwks0UJMyCHRY_zVPk1thF94U.aab`。
- 验证结果：已将新 AAB 下载到 `/Users/admin/Downloads/wmshr-production-0.1.24-v12.aab`，替代旧的 `0.1.21-v11` 下载件供后续分发/上传。

## 2026-06-16 问题 12：production AAB 已成功构建并已调度 Play 提交，但本地等待 submission 状态时 GraphQL 请求失败
- 触发命令：`HOME=/Users/admin npm run mobile:release:android:play`
- 构建结果：EAS build `2c1c7914-a209-4f9d-be14-1b3db718979e` 已 `FINISHED`，产物 AAB 为 `https://expo.dev/artifacts/eas/YITwOPmVrkBG34VZtNfwks0UJMyCHRY_zVPk1thF94U.aab`，版本 `0.1.24`，`versionCode 12`。
- 提交结果：CLI 已成功执行 `Scheduling Android submission` 并返回 submission `bc2ee6ce-deb0-436c-8b3b-c4535156a239`，release track 为 `production`，release status 为 `DRAFT`。
- 本地报错：随后在“Waiting for submission to complete”阶段出现 `request to https://api.expo.dev/graphql failed`，导致 CLI 退出码为 1。
- 结论：这次失败点不在 AAB 构建，也不在 submission 创建；是本地等待/轮询 submission 最终状态时的网络/GraphQL 请求失败。后续应以 EAS submission 实际状态为准继续核验，而不是把本地 CLI 退出码直接等同于“未提交”。

## 2026-06-16 问题 13：admin-v3 本地预览地址失效，原因是开发服务已退出
- 原计划验证入口：直接访问上一次已验证通过的 `http://127.0.0.1:3003/` 查看 `admin-v3` 页面。
- 原因：此前启动的 Vite 开发进程已经退出；Hermes 进程跟踪返回 `No process with ID proc_fef199f32adf`，同时本机 `curl http://127.0.0.1:3003` 与浏览器访问都报连接失败 / `ERR_CONNECTION_REFUSED`。
- 导致的问题：用户继续使用旧地址访问时会看到服务不可达，误以为页面本身有问题。
- 解决方式：
  1. 复用已补建的项目标准入口 `./scripts/start-admin-v3.sh` 重新启动 `admin-v3`；
  2. 实测确认新进程重新监听 `*:3003`；
  3. 用 `curl -I http://127.0.0.1:3003` 验证返回 `HTTP/1.1 200 OK`；
  4. 再用浏览器访问 `http://127.0.0.1:3003/`，确认页面已恢复渲染。
- 替代验证：原计划是直接复用旧地址；实际阻塞后改为“重启脚本 + 端口监听检查 + HTTP 200 + 浏览器打开页面”四步替代验收，最终确认当前可用地址仍为 `http://127.0.0.1:3003/`。

## 2026-06-23 问题 14：一键生产发布在 git diff --check 阶段被 ExpenseManager 行尾空格拦截
- 原计划验证入口：直接执行项目现成一键入口 `HOME=/Users/admin npm run deploy:prod`，完成 lint/build/db push/git push/Vercel 生产发布与正式域名校验。
- 原因：本次费用核销凭证多图/拖拽改动写入 `apps/admin/src/components/ExpenseManager.tsx` 后，文件里残留了多处行尾空格；发布脚本在 `git diff --check` 阶段按预期拦截。
- 导致的问题：一键发布在真正 push main 和 Vercel 生产部署之前提前退出，真实报错包含 `trailing whitespace`。
- 解决方式：清理 `ExpenseManager.tsx` 的行尾空格后，重新执行同一条 `HOME=/Users/admin npm run deploy:prod` 发布入口。

## 2026-06-23 问题 15：一键生产发布在 git fetch origin main 阶段遭遇 GitHub HTTPS 瞬时 SSL 连接失败
- 原计划验证入口：继续执行项目现成一键入口 `HOME=/Users/admin npm run deploy:prod`，让脚本在 push main 前先完成 `git fetch origin main` 祖先校验。
- 原因：发布脚本第二次实跑到 `git fetch origin main` 时，GitHub HTTPS 连接瞬时失败，真实报错为 `LibreSSL SSL_connect: SSL_ERROR_SYSCALL in connection to github.com:443`。
- 导致的问题：脚本在正式 push 与 Vercel 生产部署前提前退出，无法继续后半段发布流程。
- 解决方式：立即做 GitHub 连通性复核；`curl -I https://github.com` 返回 HTTP 200，随后手动重试 `git fetch origin main` 成功，因此判断为瞬时网络抖动，并继续重跑同一条生产发布入口。
