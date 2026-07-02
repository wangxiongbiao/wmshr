# WMSHR / Dutylix 发版后检查要点

本文是 `scripts/deploy-production.sh` 的配套检查文档。

- 标准发版入口：`npm run deploy:prod -- [options]`
- 脚本帮助：`npm run deploy:prod -- --help`
- 脚本会在开始时打印本文件路径，并在发布成功后再次提醒按本文做人工复核。

## 自动检查已覆盖什么

`deploy-production.sh` 在正式环境里已经自动覆盖以下检查；这些检查若失败，脚本会直接退出，并把已切换过的生产域名自动回归到本次发版开始前的 deployment URL：

### Admin 自动检查

- `https://admin.dutylix.com` 返回 `200`
- 首页 HTML 含 `Dutylix Admin` / `DUTYLIX考勤与薪资自动运行`
- `https://admin.dutylix.com/api/health` 返回 `200`，并且响应里包含 `"ok": true`
- `https://admin.dutylix.com/api/admin/employees` 匿名访问返回 `401`
- `https://admin.dutylix.com/api/public/google-auth-url?...` 返回 `200`

### Portal 自动检查

- `https://dutylix.com`、`/favicon.ico`、`/dutylix-icon.svg` 返回 `200`
- `https://dutylix.com/api/health` 返回 `200`
- 生产 bundle 仍含预期 CTA 文案 `Use Now` / `立即使用`
- 生产 bundle 不再出现旧的 `Login with Google` / `谷歌登录`
- `https://dutylix.com/api/public/mobile-app-update` 仍返回当前官网 APK 信息
- APK 直链与同源代理都必须满足：
  - `HTTP 200`
  - `content-type` 不是 `text/html`
  - `content-length` 至少是正常 APK 大小量级
  - 首 4 字节为 `PK\x03\x04`

## 自动回归版本的边界

脚本里的“回归版本”目前指的是：

- 把 `admin.dutylix.com` 切回本次发版开始前指向的 admin deployment
- 把 `dutylix.com` 切回本次发版开始前指向的 portal deployment

也就是说，**自动回归只负责恢复线上 Vercel 域名指向**，不会自动回退：

- Git 提交 / GitHub `main`
- `supabase db push` 已写入的数据库结构
- 任何外部手动数据变更

如果本次发版包含数据库迁移，人工判断是否还需要额外做 DB 层回退。

## 人工复核清单

即使脚本自动检查通过，发布后仍建议按下面顺序做 3~5 分钟人工复核：

### 1. 记录这次发布的前后 deployment URL

脚本结束时会打印：

- `Previous admin deployment`
- `Admin deployment`
- `Previous portal deployment`
- `Portal deployment`

先把这 4 个值保留下来。若后面的人工复核发现问题，可直接按本文最后的回退命令执行。

### 2. 官网（Portal）人工点检

至少确认：

- `https://dutylix.com` 首页能正常打开
- 关键 CTA 文案显示正常
- 官网 APK 下载按钮实际下载的是 APK，不是 HTML
- 下载后的文件名、大小、安装行为符合预期

建议补一条命令行抽检：

```bash
curl -I -L -s https://dutylix.com/downloads/wmshr-android-<version>.apk
curl -I -s https://dutylix.com/api/public/mobile-app-download
```

### 3. Admin 人工点检

至少确认：

- `https://admin.dutylix.com` 登录页/首页能打开
- Google 登录入口可正常拉起
- 一条关键业务路径可以正常进入（例如员工列表、薪资列表或工资条相关页面）

### 4. Android 更新链路人工点检

至少确认：

- `https://admin.dutylix.com/api/public/mobile-app-update` 的 `version` 与 `url` 正确
- 手机端/测试端点击“更新应用”后，落到的是当前官网 APK
- 安装包可以正常拉取，不会下载成 HTML 或空文件

## 如果人工复核失败，如何手动回归版本

将脚本输出中的 “Previous ... deployment” 值带回下面命令：

```bash
HOME=/Users/admin /Users/admin/.npm-global/bin/vercel alias set <previous-admin-deployment-url> admin.dutylix.com
HOME=/Users/admin /Users/admin/.npm-global/bin/vercel alias set <previous-portal-deployment-url> dutylix.com
```

执行后建议立即复核：

```bash
curl -I -s https://admin.dutylix.com/api/health
curl -I -s https://dutylix.com
curl -I -s https://dutylix.com/api/public/mobile-app-download
```

## 建议使用方式

### 正常正式发版

```bash
HOME=/Users/admin npm run deploy:prod
```

### 跳过 DB 推送的正式发版

```bash
HOME=/Users/admin npm run deploy:prod -- --no-db
```

### 查看脚本帮助与本文入口

```bash
HOME=/Users/admin npm run deploy:prod -- --help
```
