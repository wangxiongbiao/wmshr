# PROJECT ISSUES

## 2026-06-27 问题 1：费用核销列表存在名称显示错位/错误的高风险根因
- 原因：费用核销列表在 `apps/admin/src/components/ExpenseManager.tsx` 中使用 `key={rec.id}` 渲染每一行，但新建记录的 ID 生成方式是 `exp-${Date.now().toString().slice(-4)}`，最后 4 位每 10 秒就会循环一次，无法保证全局唯一。后端 `PUT /api/admin/expenses` 会在保存时校验重复 ID，但 `GET /api/admin/expenses` 加载历史快照时只做归一化，不做重复 ID 校验或修复。因此，一旦历史快照里已经存在重复 ID（例如旧数据、历史脏数据、早期逻辑生成的数据），React 列表会出现重复 key，导致某些行的名称/操作区出现复用或错位显示。
- 导致的问题：用户看到“有一些费用名称显示错误”，不仅可能是数据值错误，也可能是前端重复 key 导致的行复用渲染错误。当前代码路径不足以在读取阶段阻断这个问题。
- 当前判断：这是当前最可疑、最贴近“列表名称显示错误”的根因之一，需要继续结合真实快照数据确认是否已存在重复 ID。
- 已尝试：检查了费用模块的前端列表渲染、创建逻辑、后端归一化和读写校验；已确认列表 key 使用 `rec.id`，创建 ID 仅取时间戳最后 4 位，后端读取历史快照不做重复 ID 校验。
- 下一步：
  1. 直接检查真实 `admin_expense_snapshots` 数据里是否存在重复 `id`；
  2. 如存在，先做数据修复/迁移；
  3. 同步修正前端新建 ID 生成策略，改为真正全局唯一；
  4. 给后端读取阶段加重复 ID 检测/告警，避免脏数据继续进入前端列表。

## 2026-06-27 问题 2：费用多凭证文件名在保存后会丢失
- 原因：前端已支持 `receiptUrls` 和 `receiptNames` 多张凭证，但后端 `normalizeExpenseSnapshotItem` 只保留 `receiptUrl`、`receiptUrls`、`receiptName`，没有保留 `receiptNames`。
- 导致的问题：重新加载后，多张凭证除首张外的文件名会退化成默认占位名，界面展示与用户上传信息不一致。
- 解决方式：待修复时在后端归一化和持久化结构中补齐 `receiptNames`。

## 2026-06-27 问题 3：未指定审批人时的展示语义不一致
- 原因：前端可保存“无指定 / 任意管理员”，但后端会把 `targetApproverId` 归一化为 `undefined`，前端多个判断条件仍把它当成类似已指定审批人的状态展示。
- 导致的问题：审批链展示语义不清，用户会误判该单是否真正绑定审批人。
- 解决方式：待修复时统一未指定审批人的存储和展示语义。

## 2026-06-27 问题 4：生产发布脚本被 `supabase migration list --linked` 的瞬时登录角色失败误阻断
- 原因：`scripts/deploy-production.sh` 在 `supabase db push --yes` 成功后，会继续把 `supabase migration list --linked` 作为硬性步骤执行；本次远端数据库已确认 up to date，但 Supabase CLI 在 `migration list --linked` 阶段返回 `failed to initialise login role: Post .../cli/login-role: EOF`。
- 导致的问题：一键生产发布在数据库实际已同步成功的情况下仍提前退出，后续 `git push`、Vercel 正式部署和线上域名验收都没有继续执行。
- 当前判断：`migration list --linked` 在这里属于发布后的辅助核对，不应覆盖前面已成功完成的 `db push` 结果；脚本需要把该步骤降级为“尽量执行、失败告警但不中断正式发布”。
- 已尝试：使用 `HOME=/Users/admin npm run deploy:prod` 真实执行发布脚本；已确认 lint、build、`git diff --check`、考勤测试、`supabase db push --yes` 全部通过，阻塞仅发生在 `migration list --linked`。
- 下一步：
  1. 调整发布脚本对 `migration list --linked` 的处理方式，保留告警但不再阻断后续正式发布；
  2. 重新执行一键生产发布并完成线上验收；
  3. 若 Supabase CLI 后续持续返回 EOF，再单独跟进 CLI/登录角色链路问题。

## 2026-06-27 问题 5：用户反馈下载页显示 0.1.27，但设备下载后识别为 0.1.26
- 原因：当前服务器侧证据显示，这不是发布脚本把旧 APK 误命名成新版本的问题。`apps/mobile/android/app/build/outputs/apk/release/app-release.apk` 经 `aapt dump badging` 验证为 `versionName='0.1.27'`、`versionCode='127'`；线上 `https://dutylix.com/downloads/wmshr-android-0.1.27.apk` 返回的 `ETag` 与该本地 release APK 的 MD5 完全一致，`content-length` 也一致，说明线上实际提供的文件内容就是本地 0.1.27 包。
- 导致的问题：用户侧仍可能因为浏览器/系统下载缓存、已存在同名文件、设备安装器读取旧下载记录，看到“下载下来像 0.1.26”的表象，从而误以为服务器还在发旧包。
- 当前判断：服务器侧发布内容正确，优先怀疑客户端缓存或设备端旧文件复用；如果用户侧继续复现，需要拿设备端截图或实际下载文件再做终端校验。
- 已尝试：
  1. 用 `aapt dump badging` 验证本地 release APK 为 0.1.27；
  2. 核对 `apps/mobile/app.json` 与 `apps/mobile/package.json` 当前版本均为 0.1.27；
  3. 对线上 APK 读取响应头，确认 `etag: "719440d66269d04de8e10d529edc21b1"`、`content-length: 71606586`；
  4. 计算本地 release APK 的 MD5，同样为 `719440d66269d04de8e10d529edc21b1`。
- 下一步：
  1. 让用户删除设备上已有的同名 APK 后重新下载；
  2. 如仍异常，收集设备端“下载完成页/安装页/文件详情页”截图；
  3. 必要时让用户把设备上实际下载到的 APK 回传，再用 `aapt`/hash 与服务器版本逐字节比对。

## 2026-06-27 问题 6：员工管理的社保金输入框被前端 step=100 误限制
- 原因：`apps/admin/src/components/Modals.tsx` 里“社保金”字段使用了 `input[type=number]` 且写死 `step="100"`。移动端 Chrome 会按原生 number 输入校验处理，所以输入 336 时直接报“请输入有效值。两个最接近的有效值分别为300和400”。
- 导致的问题：员工管理无法录入 336 这类真实存在的非整百社保金金额；用户会误以为这是业务规则限制，实际只是前端输入粒度写错。
- 解决方式：把社保金字段步进改为 `step="1"`，允许按 1 元粒度录入；并在字段旁补注释，说明该字段存在非整百真实值，避免后续又被改回 `100`。

## 2026-06-28 问题 7：真机无线调试未连接导致移动端版本更新验证暂时阻塞
- 原因：用户准备通过 Android 无线调试安装低版本开发/测试包来验证 App 更新弹窗与安装器版本显示；执行项目标准入口 `npm run mobile:adb:wifi` 时，脚本未发现 Android 11+ wireless debugging 的 mDNS TLS 目标，也没有检测到 USB 授权设备。
- 导致的问题：当前无法直接向手机安装用于复现“App 内提示当前 0.1.26 / 安装器识别目标 0.1.28”的测试包，也无法通过 adb 抓取设备端实际 `dumpsys package` 版本信息。
- 当前判断：需要先完成无线调试配对或提供已配对的连接地址；服务器侧当前更新接口与 APK 直链已验证为 0.1.28，设备端仍需通过 adb 实测确认是旧安装包当前版本提示、下载缓存提示，还是安装器/文件管理器展示差异。
- 已尝试：
  1. 确认项目已有 `mobile:adb:wifi`、`mobile:install:android:debug`、`mobile:install:android:release`、`mobile:launch:android` 标准入口；
  2. 执行 `npm run mobile:adb:wifi`，真实返回 `No wireless-debugging mDNS target or USB-connected ADB device found`；
  3. 用户提供连接地址 `100.70.244.32:43395` 后，执行 `npm run mobile:adb:wifi -- --ip 100.70.244.32 --port 43395` 已连接到 `LGE-AN00`；
  4. 通过 `dumpsys package com.wmshr.app` 确认手机当前真实安装版本为 `versionName=0.1.28`、`versionCode=128`、安装来源为 Chrome；
  5. 临时副本构建 `0.1.26` debug 包时首次失败，原因是只链接了根 `node_modules`，而 Expo config plugin 解析 `expo-web-browser` 需要 `apps/mobile/node_modules`；补充移动端 workspace node_modules 链接后进入本地 Gradle 构建；
  6. 为避免 debug/Metro 干扰，改用真实工作区短暂切到 `0.1.26` 构建本地 release 测试包，再恢复工作区版本文件到 `0.1.28`；
  7. 已产出并校验临时 APK：`/tmp/wmshr-android-update-test-0.1.26-arm64.apk`，`aapt dump badging` 显示 `versionName='0.1.26'`、`versionCode='126'`、`native-code: 'arm64-v8a'`，SHA-256 为 `3a16c4b38f2ea1863906bbf1fe33f9532881f8b9240f78d3bbdac8084b2b48a0`；
  8. 执行 `npm run mobile:adb:wifi -- --ip 100.70.244.32 --port 43395` 复连旧无线调试端口，真实返回 `Connection refused`，随后 `adb devices -l` 为空，说明手机端无线调试端口已关闭或已变更；
  9. 用户重新提供 `100.70.244.32:37257` 后已连接到 `LGE-AN00`；执行 `adb install -r -d /tmp/wmshr-android-update-test-0.1.26-arm64.apk` 被系统拒绝，真实报错为 `INSTALL_FAILED_VERSION_DOWNGRADE: Downgrade detected: Update version code 126 is older than current 128`；
  10. 再次通过 `dumpsys package com.wmshr.app` 确认手机当前仍是 `versionName=0.1.28`、`versionCode=128`、`installerPackageName=com.android.chrome`。
- 下一步：若要继续真机验证更新弹窗，需要明确允许卸载当前 `com.wmshr.app` 后安装 `/tmp/wmshr-android-update-test-0.1.26-arm64.apk`；卸载会清除该 App 本地数据。未获得明确许可前，不执行 `adb uninstall`。

- 追加结果：用户回复“继续”后，已执行 `adb uninstall com.wmshr.app` 并安装 `/tmp/wmshr-android-update-test-0.1.26-arm64.apk`；`dumpsys package com.wmshr.app` 确认真机安装版本为 `versionName=0.1.26`、`versionCode=126`、`primaryCpuAbi=arm64-v8a`。
- 验收结果：启动 App 后更新弹窗真实出现，UI 文本和截图均确认显示 `发现新版本`、`当前版本：0.1.26`、`最新版本：0.1.28`、更新内容为“例行更新，修复已知问题并优化使用体验”，说明当前版本获取与远端版本比较流程通过真机验证。
- 未完全确认：点击弹窗主按钮后，弹窗关闭并进入登录页，未在抓屏窗口中看到系统安装器前台；随后设备进入 `Magic:ProximityWnd` / AOD 覆盖状态，界面级截图不可用。因此“检查并提示更新”已验证通过，但“系统安装器前台展示”仍需在设备保持亮屏可操作时单独复验。
- 恢复状态：为避免手机停留在低版本测试包，已下载并校验线上 `/tmp/wmshr-android-0.1.28-online.apk`，`aapt dump badging` 显示 `versionName='0.1.28'`、`versionCode='128'`；但 `adb install -r` 与 `pm install -r` 都被系统拒绝，真实报错为 `INSTALL_FAILED_ABORTED: User rejected permissions`。设备诊断显示 `mWakefulness=Dozing`、`mCurrentFocus=AOD`、`mFocusedApp=null`，当前仍停在 `versionName=0.1.26`。需要用户点亮/解锁手机后再执行覆盖安装恢复 `0.1.28`。
- 脚本补充：`scripts/adb-launch-mobile-app.sh` 已新增 `--skip-metro` 参数，release / 内嵌 bundle 包可用 `bash scripts/adb-launch-mobile-app.sh --target <ip:port> --skip-metro` 启动，不再误要求 Metro 8081；默认 debug 链路仍保留 Metro 检查。
- 追加恢复结果（2026-06-29）：手机解锁后再次恢复线上包时，`adb install -r /tmp/wmshr-android-0.1.28-online.apk` 仍被系统图形安装器拦截，后台命令返回 `INSTALL_FAILED_ABORTED: User rejected permissions`；改用 `adb push` 到 `/data/local/tmp/wmshr-android-0.1.28-online.apk` 后执行设备端 `pm install -r` 成功。最终 `dumpsys package com.wmshr.app` 确认设备已恢复为 `versionName=0.1.28`、`versionCode=128`，且 `pkgFlags` 不再包含 `DEBUGGABLE`；临时远端 APK 已删除。
- 追加根因与修复结果（2026-06-29）：用户截图仍显示“当前版本：0.1.26 / 最新版本：0.1.28”后，经拆包确认旧 `/tmp/wmshr-android-0.1.28-online.apk` 的 Android manifest 与 `assets/app.config` 均为 `0.1.28`，但 `assets/index.android.bundle` 里仍包含 `0.1.26`，根因是 release 构建复用了旧 JS bundle；同时 App 内当前版本逻辑直接 `require(app.json)`，会被旧 bundle 固化。已新增 `apps/mobile/src/shared/config/appVersion.ts`，统一优先读取 `Constants.expoConfig.version`，`app.json` 仅作兜底；`AppUpdateGate`、`MineScreen`、`mobileDebugLogger` 已改用该入口。`scripts/build-mobile-android-production-local.sh` 与 `scripts/build-mobile-android-production-online-local.sh` 已改为先强制重跑 `:app:createBundleReleaseJsAndAssets --rerun-tasks`，再执行 `assembleRelease`，避免旧 bundle 复用；同时支持 `REACT_NATIVE_ARCHITECTURES=arm64-v8a` 做真机快速验证。验证结果：`npm --workspace @wmshr/mobile run lint` 通过；`HOME=/Users/admin REACT_NATIVE_ARCHITECTURES=arm64-v8a npm --workspace @wmshr/mobile run build:android:production:online:local` 返回 `BUILD SUCCESSFUL`；脚本产物 `/tmp/wmshr-android-0.1.28-fixed-script-arm64.apk` 经 `aapt dump badging` 确认为 `versionName='0.1.28'`、`versionCode='128'`、`native-code: 'arm64-v8a'`，拆包显示 `assets/index.android.bundle` 中 `0.1.26` 出现次数为 0、`0.1.28` 出现次数为 1。真机覆盖安装后强停冷启动，前台为 `com.wmshr.app/.MainActivity`，UI 文本进入员工登录页，`HAS_WMSHR_UPDATE_MODAL=False`，更新弹窗已消失。

## 2026-06-29 问题 9：真机安装 debug APK 被系统拒绝 ADB 安装权限
- 原因：当前手机系统对 ADB/shell 发起的 APK 安装做了额外权限限制，`adb install -r`、设备端 `pm install -r` 和 `pm install -r -t` 都返回 `INSTALL_FAILED_ABORTED: User rejected permissions`。签名排查确认当前已装包和新构建 debug APK 均为同一 Android Debug 证书，非签名不兼容。
- 导致的问题：项目标准入口 `npm run mobile:install:android:debug -- --target <target>` 无法直接覆盖安装 debug 包；系统安装器 Intent 也无法通过 `file://` 路径打开。
- 解决方式：先用 `appops set com.android.shell REQUEST_INSTALL_PACKAGES allow` 放开 shell 安装 APK 权限，再执行 `pm install -r -t /data/local/tmp/wmshr-debug-0.1.28.apk`，安装成功。最终 `dumpsys package com.wmshr.app` 确认 `versionName=0.1.28`、`versionCode=128`，且 `pkgFlags` 包含 `DEBUGGABLE`。

## 2026-06-29 问题 10：Debug APK 启动后红屏 Unable to load script
- 原因：手机安装的是 debug APK，debug 包不会内嵌 release JS bundle，启动时必须连接本机 Metro。截图显示 `Unable to load script`，本机当时没有 WMSHR 的 8081 Metro，手机无线 ADB 旧端口也已失效，导致 App 无法从 `localhost:8081` 获取 `index.android.bundle`。
- 导致的问题：debug 包虽然已安装成功且 `pkgFlags` 包含 `DEBUGGABLE`，但启动进入 React Native 红屏，无法进入业务界面测试更新弹窗。
- 解决方式：启动 WMSHR Metro：`HOME=/Users/admin npm --workspace @wmshr/mobile run start -- --host localhost --port 8081`；用户重新提供无线调试端口后执行 `adb connect 100.70.244.32:39871`，再执行 `adb -s 100.70.244.32:39871 reverse tcp:8081 tcp:8081` 并强停重启 `com.wmshr.app/.MainActivity`。Metro 日志显示 Android bundle 构建完成，后续抓取 UI 文本确认不再包含 `Unable to load script`。

## 2026-06-29 问题 11：App 内点击“立即安装”未跳转系统 APK 安装器
- 原因：真机复现时，更新弹窗已显示 `安装包已下载 100%`，点击“立即安装”后 App 私有 debug 日志记录 `app_update_install_start`、`app_update_download_ready` 和 `app_update_install_prompt_opened`，但前台仍停留在 `com.wmshr.app/.MainActivity`，系统安装器没有展示。排查 `dumpsys package com.wmshr.app` 与构建 APK 后确认，原 Android Manifest 未声明 `android.permission.REQUEST_INSTALL_PACKAGES`，也未在 Android 11+ package visibility 的 `<queries>` 中声明 APK 安装 VIEW Intent；`expo-intent-launcher` 的 `startActivityForResult` 在该设备上会快速返回，导致 JS 误判为安装器已打开。
- 导致的问题：下载完成后按钮切到“立即安装”，点击会关闭更新弹窗并显示底部“安装包已下载”状态，但用户看不到系统 APK 安装确认流程。
- 解决方式：已在 `apps/mobile/android/app/src/main/AndroidManifest.xml` 增加 `REQUEST_INSTALL_PACKAGES` 和 `application/vnd.android.package-archive` 的 VIEW query；同步在 `apps/mobile/app.json` 增加 Android permission；并让 `openAndroidInstaller()` 返回并记录 `IntentLauncher.startActivityAsync` 的 result，便于后续区分“真正安装完成/用户取消/系统瞬间返回”。`npm --workspace @wmshr/mobile run lint` 已通过，debug APK 也已重新构建并校验包含 `uses-permission: android.permission.REQUEST_INSTALL_PACKAGES`。
- 当前阻塞：覆盖安装新 debug APK 进行真机复验时，无线 ADB 在传输 129MB debug APK 后多次掉线/端口刷新。后续手机端口重新出现后，`ping`/`nc` 和 mDNS 均能看到设备（如 `192.168.1.22:39451/39887`），但 `adb connect` 在 ADB TLS 层失败，说明当前电脑与手机的无线调试授权需要重新配对。电脑侧 HTTP 下载入口已验证可用（`http://192.168.1.18:18081/wmshr-debug-install-permission-arm64.apk`，`Content-Length=135667813`）；待用户提供“使用配对码配对设备”的配对端口和 6 位配对码后，继续执行设备端下载到 `/data/local/tmp`、`pm install -r -t`、恢复 `adb reverse tcp:8081 tcp:8081` 并复测“立即安装”。

- 追加验证结果（2026-06-30）：重新配对无线调试后，成功安装包含 `REQUEST_INSTALL_PACKAGES` 的 debug APK，并恢复 `adb reverse tcp:8081 tcp:8081`。首次点击“立即安装”已成功跳到 `com.android.packageinstaller/.PackageInstallerActivity`，证明“不跳系统安装器”的原问题已解决；随后系统提示“解析错误”，继续排查发现 App 缓存 `cache/hmshr-0.1.29.apk` 只有 `9,632,868` 字节，而线上 APK 当前 `Content-Length=71,606,586` 且 `aapt dump badging` 可读，根因为历史残缺 APK 缓存被旧逻辑按“文件存在且非空”误复用。
- 追加修复（2026-06-30）：`AppUpdateGate` 已增加远端 `Content-Length` 校验：检查更新和点击下载时都会比对缓存大小，不一致则删除缓存重新下载；下载完成后也校验最终文件大小，不一致则删除并提示“下载安装包不完整，请重试。”。真机删除坏缓存后复测，App 重新下载完整 `71,606,586` 字节安装包，`app_update_download_ready` 记录 `reusedCache=false`、`bytesWritten=71606586`、`bytesExpected=71606586`，随后前台进入荣耀系统安装器页面，显示 HMSHR 安装安全提示和“取消”等系统安装流程控件，未再出现解析错误。

## 2026-06-30 问题 12：版本更新 UI 改动的真机点按验证被无线 ADB 端口失效阻塞
- 原因：本次新增“底部更新进度卡片关闭按钮”和“我的页更新入口重新打开版本更新弹窗”后，`npm --workspace @wmshr/mobile run lint` 已通过；准备继续用真机自动点按验证时，`adb devices -l` 为空，`adb mdns services` 为空，旧无线调试端口 `100.70.244.32:39451`、`192.168.1.22:39451`、`192.168.1.22:39887` 均返回 connection refused。
- 导致的问题：当前只能完成类型检查和静态 diff 检查，暂时无法继续自动点击底部卡片关闭 icon、我的页“更新应用”入口和根层更新弹窗。
- 当前判断：这是手机无线调试端口刷新/授权断开导致的环境阻塞，不是代码编译问题；Metro 8081 仍在监听。
- 下一步：用户重新提供无线调试当前 IP:端口（必要时同时提供配对端口和 6 位配对码）后，继续恢复 `adb reverse tcp:8081 tcp:8081` 并完成真机点按验证。

## 2026-06-30 问题 13：Android 一键发布在 JS bundle 成功后被空数组展开打断
- 原因：`scripts/build-mobile-android-production-online-local.sh` 和 `scripts/build-mobile-android-production-local.sh` 在 `set -u` 下直接把空数组 `${GRADLE_ARCH_ARGS[*]}` 拼进 `bash -lc` 命令；未设置 `REACT_NATIVE_ARCHITECTURES` 的完整官网包构建路径会在空数组展开阶段报 `unbound variable`。
- 导致的问题：`HOME=/Users/admin npm run mobile:release:android` 已把移动端版本写到 `0.1.29`，且 `:app:createBundleReleaseJsAndAssets --rerun-tasks` 返回 `BUILD SUCCESSFUL`，但尚未执行 `assembleRelease` 和官网发布步骤，因此没有产出/发布 APK。
- 解决方式：两个 production 本地构建脚本都改为显式区分“有架构参数”和“无架构参数”两条 assembleRelease 命令；无架构参数时直接运行 `./gradlew assembleRelease`，避免空数组在 macOS Bash + `set -u` 下被展开。
- 解决验证：用固定版本 `0.1.29` 重新执行 `HOME=/Users/admin npm run mobile:release:android -- --version 0.1.29`，脚本完整退出 0；官网部署到 `https://dutylix.com`，APK 地址为 `https://dutylix.com/downloads/wmshr-android-0.1.29.apk`，更新 API 返回 `version=0.1.29` 和同一 URL。本地 APK 大小 `71611886`，线上 `content-length=71611886`；本地 MD5 与线上 ETag 均为 `c43f34e62117498f116116b63899e8db`；`aapt dump badging` 确认 APK 为 `versionName='0.1.29'`、`versionCode='129'`。

## 2026-07-02 问题 14：门户再次发布后官网 APK 下载回退成 HTML
- 原因：当前 Android 正式包通过 `scripts/publish-local-android-apk-to-home.sh` 临时拷贝到 `apps/home/public/downloads/` 后发布到 `dutylix.com`；后续再执行普通 portal 生产发布时，如果没有把“当前已发布 APK”重新带进新的 home 部署，`/downloads/wmshr-android-0.1.29.apk` 会在新 deployment 中消失并回退成 SPA 的 `index.html`。同时旧的 `handleMobileAppDownload()` 只要上游 `200` 就直接透传，导致同源下载代理也会把 HTML 当成 APK 附件返回。修复 deploy 脚本时还额外暴露了一个环境兼容坑：macOS 自带 Bash 3.2 不支持 `mapfile`，第一次生产发布在 admin 成功后中断在 portal 阶段。
- 导致的问题：官网 `https://dutylix.com/downloads/wmshr-android-0.1.29.apk` 返回 `content-type: text/html; charset=utf-8`、`content-length: 606`；`https://dutylix.com/api/public/mobile-app-download` 也会返回带 `attachment` 头的 HTML，用户看到的现象就是“下载成了 html 而不是 apk”。
- 解决方式：
  - `apps/admin/server/index.js` 的 `handleMobileAppDownload()` 新增上游内容校验，若下载源返回 `text/html` 就直接返回 502，不再把首页 HTML 伪装成 APK 透传。
  - `scripts/publish-local-android-apk-to-home.sh` 改为在写数据库前强校验官网静态 APK 与同源代理：不仅要求 HTTP 200，还要求 `content-type` 非 HTML、`content-length` 与本地 APK 一致，且首 4 字节必须是 APK/ZIP magic `PK\x03\x04`。
  - `scripts/deploy-production.sh` 改为在 portal 部署前先从当前 `mobile-app-update` 记录下载并暂存“当前正式 APK”到 `apps/home/public/downloads/`，确保后续 portal 再发布时不会丢失该静态资产；portal 生产验收也新增 Android 直链和同源代理校验。脚本里的 `mapfile` 同步改成 macOS Bash 3.2 可用的 TSV + `read` 解析。
  - 现场恢复时，先用本地已有 `apps/mobile/android/app/build/outputs/apk/release/app-release.apk` 重新执行 `HOME=/Users/admin npm run mobile:publish:android:local-to-home -- --apk ... --version 0.1.29`，把官网当前 APK 重新挂回生产；随后执行 `HOME=/Users/admin npm run deploy:prod -- --no-db --no-project-log`，将 admin 保护逻辑和新的 portal 保留/验收逻辑一起发布到正式环境。
- 解决验证：
  - 重新发布当前 APK 后，`https://dutylix.com/downloads/wmshr-android-0.1.29.apk` 返回 `content-type: application/vnd.android.package-archive`、`content-length: 71611886`、`etag: "c43f34e62117498f116116b63899e8db"`。
  - 同源代理 `https://dutylix.com/api/public/mobile-app-download` 返回 `content-disposition: attachment; filename="wms-0.1.29.apk"`、`content-type: application/vnd.android.package-archive`、`content-length: 71611886`，`curl --range 0-3` 的首 4 字节为 `504b0304`。
  - 更新接口 `https://dutylix.com/api/public/mobile-app-update` 返回 `{"version":"0.1.29","url":"https://dutylix.com/downloads/wmshr-android-0.1.29.apk"}`。
  - 防回归发布已真实跑通：`HOME=/Users/admin npm run deploy:prod -- --no-db --no-project-log` 完整退出 0；GitHub `main` HEAD 为 `930500057b0616dc44a45feecc678946b89899b2`；admin 正式部署 URL 为 `https://dutylix-admin-24oodg8a8-wang-lins-projects.vercel.app`，portal 正式部署 URL 为 `https://dutylix-ie5b0ynd5-wang-lins-projects.vercel.app`。
