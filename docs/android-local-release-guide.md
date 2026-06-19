# WMSHR Android 本地打包发布指南

本文按当前仓库配置整理，目标是让 `apps/mobile` 以后统一走 **本地构建 APK / AAB + 自有官网托管 APK** 的发布链路，不再依赖 Expo EAS 远端发布。

## 当前标准发布链路

### 官网 APK 更新主入口

在仓库根目录执行：

```bash
npm run mobile:release:android
```

这条命令会自动完成：

1. 读取当前 `apps/mobile` 版本号并默认补丁位 `+1`（也可手动传 `--version`）
2. 同步更新：
   - `apps/mobile/app.json`
   - `apps/mobile/package.json`
   - `apps/mobile/android/app/build.gradle`
3. 运行移动端 TypeScript 校验
4. 本地构建 production-online release APK
5. 把 APK 挂到 `dutylix.com/downloads/`
6. 回写 `public.mobile_app_releases`
7. 让 `admin.dutylix.com/api/public/mobile-app-update` 指向最新官网 APK

### 常用参数

```bash
npm run mobile:release:android -- --version 0.1.26
npm run mobile:release:android -- --content "例行更新，修复已知问题并优化使用体验"
npm run mobile:release:android -- --version 0.1.26 --content "例行更新，修复已知问题并优化使用体验"
npm run mobile:release:android -- --dry-run
```

说明：

- `--version`：手动指定版本号
- `--content`：指定官网更新说明
- `--dry-run`：只打印步骤，不改文件、不构建、不部署
- `--skip-lint`：跳过移动端 TypeScript 校验（仅在你明确知道当前 lint 与本次发布无关时使用）

## 分步命令

### 1) 只本地构建官网运行环境 APK

```bash
npm run mobile:build:android:production:online:local
```

真实产物路径：

```bash
apps/mobile/android/app/build/outputs/apk/release/app-release.apk
```

该 APK 的运行时环境固定为：

- `EXPO_PUBLIC_API_BASE_URL=https://admin.dutylix.com`
- `EXPO_PUBLIC_APP_ENV=production`

也就是说，这个本地包就是官网更新包的标准构建来源。

### 2) 已有本地 APK 时，单独发布到官网

```bash
npm run mobile:publish:android:local-to-home -- \
  --apk /Users/admin/Desktop/project/wmshr/apps/mobile/android/app/build/outputs/apk/release/app-release.apk \
  --version 0.1.25 \
  --content "例行更新，修复已知问题并优化使用体验"
```

该脚本会自动完成：

1. 将 APK 临时放入 `apps/home/public/downloads/`
2. 本地构建门户并确认 `dist/downloads/` 已包含 APK
3. 只部署 `dutylix` 门户项目到 `dutylix.com`
4. 校验 `https://dutylix.com/downloads/wmshr-android-<version>.apk` 可匿名访问
5. 回写 `public.mobile_app_releases`
6. 清理本地暂存的 APK 文件

## 只做本地验收时可用的入口

### 本地 release APK（不强制线上环境）

```bash
npm run mobile:build:android:production:local
```

适合：

- 本机调试
- 侧载验证
- 不需要立刻同步官网更新时

### 本地 release AAB

```bash
npm run mobile:build:android:production:bundle:local
```

适合：

- 留档
- 人工上传分发
- 校验 AAB 产物形态

## 发布前提

发布官网 APK 前，至少确认：

1. 已在仓库根执行依赖安装
2. 本机已具备：
   - JDK 17
   - Android SDK
   - NDK
   - cmake
3. `apps/admin/.env` 中具备：
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Vercel CLI 登录态有效：

```bash
bash -lc 'vercel whoami'
```

## 发布后验证

### 1. 验证官网更新接口

```bash
curl -s https://admin.dutylix.com/api/public/mobile-app-update
```

期望看到：

- `version` 为新版本
- `url` 指向 `https://dutylix.com/downloads/wmshr-android-<version>.apk`

### 2. 验证 APK 真实可下载

```bash
curl -I -L -s https://dutylix.com/downloads/wmshr-android-0.1.25.apk
```

期望返回：

- `HTTP 200`
- `content-type: application/vnd.android.package-archive`

## 常见问题

### 1. `vercel: command not found`

脚本会优先尝试当前 PATH，并兼容：

```bash
~/.npm-global/bin/vercel
```

如果仍失败，先检查 Vercel CLI 是否已安装并登录。

### 2. 官网接口已更新，但 APK 404

优先检查：

- 门户部署是否成功
- `apps/home/dist/downloads/` 是否真实包含目标 APK
- `dutylix.com/downloads/<apk>` 是否返回 200

### 3. APK 能构建，但运行时还是连本地接口

请不要用错构建命令。要发官网更新包时，必须使用：

```bash
npm run mobile:build:android:production:online:local
```

而不是普通的：

```bash
npm run mobile:build:android:production:local
```

## 结论

以后 Android 官网更新包的标准链路固定为：

```bash
npm run mobile:release:android
```

它已经取代原先的 Expo / EAS 发布流程，后续默认不再依赖 EAS artifact、private GitHub release 资产或 Play 自动提交脚本。
