# WMSHR Android 本地打包发布指南

本文按当前仓库配置整理，目标是让 `apps/mobile` 统一走 **本地构建 APK / AAB + GitHub Release 托管 APK + Supabase 更新记录** 的发布链路，不再依赖 Expo EAS 远端发布，也不再把 APK 放进 Vercel 静态目录。

## 当前标准发布链路

### Android APK 更新主入口

在仓库根目录执行：

```bash
npm run mobile:release:android
```

这条命令会自动完成：

1. 读取当前 `apps/mobile` 版本号并默认补丁位 `+1`（也可手动传 `--version`）。
2. 同步更新：
   - `apps/mobile/app.json`
   - `apps/mobile/package.json`
   - `apps/mobile/android/app/build.gradle`
3. 运行移动端 TypeScript 校验。
4. 本地构建 production-online release APK。
5. 创建或更新 GitHub Release `android-<version>`。
6. 上传 `wmshr-android-<version>.apk` 到 GitHub Release assets。
7. 回写 `public.mobile_app_releases`，让更新接口指向 GitHub Release asset URL。
8. 验证 GitHub 直链、Admin 下载代理、Portal 下载代理和更新 API。

### 常用参数

```bash
npm run mobile:release:android -- --version 0.1.30
npm run mobile:release:android -- --content "例行更新，修复已知问题并优化使用体验"
npm run mobile:release:android -- --version 0.1.30 --content "例行更新，修复已知问题并优化使用体验"
npm run mobile:release:android -- --dry-run
```

说明：

- `--version`：手动指定版本号。
- `--content`：指定更新说明。
- `--dry-run`：只打印步骤，不改文件、不构建、不发布。
- `--skip-lint`：跳过移动端 TypeScript 校验（仅在你明确知道当前 lint 与本次发布无关时使用）。

## 分步命令

### 1) 只本地构建线上运行环境 APK

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

也就是说，这个本地包就是线上更新包的标准构建来源。

### 2) 已有本地 APK 时，单独发布到 GitHub Release

```bash
npm run mobile:publish:android:github -- \
  --apk /Users/admin/Desktop/project/wmshr/apps/mobile/android/app/build/outputs/apk/release/app-release.apk \
  --version 0.1.29 \
  --content "例行更新，修复已知问题并优化使用体验"
```

该脚本会自动完成：

1. 校验本地 APK 首 4 字节为 `PK\x03\x04`。
2. 创建或更新 GitHub Release `android-<version>`。
3. 上传 `wmshr-android-<version>.apk`。
4. 回写 `public.mobile_app_releases` 到 GitHub asset URL。
5. 校验：
   - GitHub APK 直链
   - `https://admin.dutylix.com/api/public/mobile-app-download`
   - `https://dutylix.com/api/public/mobile-app-download`
   - Admin / Portal 的 `/api/public/mobile-app-update`

## 只做本地验收时可用的入口

### 本地 release APK（不强制线上环境）

```bash
npm run mobile:build:android:production:local
```

适合：

- 本机调试
- 侧载验证
- 不需要立刻同步线上更新时

### 本地 release AAB

```bash
npm run mobile:build:android:production:bundle:local
```

适合：

- 留档
- 人工上传分发
- 校验 AAB 产物形态

## 发布前提

发布 Android APK 前，至少确认：

1. 已在仓库根执行依赖安装。
2. 本机已具备：
   - JDK 17
   - Android SDK
   - NDK
   - cmake
3. `apps/admin/.env` 中具备：
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. GitHub CLI 登录态有效，且有 `wangxiongbiao/wmshr` release 写权限：

```bash
gh auth status
```

5. 当前 `dutylix` Vercel production 环境变量已同步到新 Supabase 项目；否则 Portal API 可能继续查旧库。

## 发布后验证

### 1. 验证更新接口

```bash
curl -s https://admin.dutylix.com/api/public/mobile-app-update
curl -s https://dutylix.com/api/public/mobile-app-update
```

期望看到：

- `version` 为新版本。
- `url` 指向 `https://github.com/wangxiongbiao/wmshr/releases/download/android-<version>/wmshr-android-<version>.apk`。

### 2. 验证 APK 真实可下载

```bash
curl -I -L -s https://github.com/wangxiongbiao/wmshr/releases/download/android-<version>/wmshr-android-<version>.apk
curl -I -L -s https://admin.dutylix.com/api/public/mobile-app-download
curl -I -L -s https://dutylix.com/api/public/mobile-app-download
```

期望返回：

- `HTTP 200`
- `content-type` 不是 `text/html`
- `content-length` 为正常 APK 大小量级
- 首 4 字节为 `PK\x03\x04`

## 常见问题

### 1. `gh: command not found` 或未登录

先安装并登录 GitHub CLI：

```bash
gh auth status
```

当前标准发布脚本依赖 GitHub Release asset，不再通过 Vercel 静态目录承载 APK。

### 2. 更新接口已更新，但 Portal 代理仍返回旧数据

优先检查：

- `dutylix` Vercel 项目的 `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` 是否已同步到新项目。
- 是否已重新部署 `dutylix` 让生产环境变量生效。
- `https://dutylix.com/api/public/mobile-app-update` 是否与 Admin 返回一致。

### 3. APK 能构建，但运行时还是连本地接口

请不要用错构建命令。要发线上更新包时，必须使用：

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

它已经取代原先的 Expo / EAS artifact 发布和 Vercel 静态托管流程；当前正式下载源是 GitHub Release asset，Admin / Portal 下载代理只负责跳转或透传验证。
