# WMSHR Google Play 上架指南

本文按当前仓库配置整理，目标是让 `apps/mobile` 通过 Expo EAS 发布到 Google Play。

## 当前项目已具备的条件

- 移动端是 Expo 项目：`/Users/admin/Desktop/project/wmshr/apps/mobile`
- Android 包名已配置：`com.wmshr.app`
- 生产包已配置为 `AAB`：`apps/mobile/eas.json` 中 `build.production.android.buildType = "app-bundle"`
- Android 版本号已交给 EAS 远端管理：`cli.appVersionSource = "remote"`

这意味着构建层面已经接近可上架状态，剩下主要是 Play Console 配置和首次提交流程。

## 你现在可以直接用的命令

在仓库根目录执行：

```bash
cd /Users/admin/Desktop/project/wmshr/apps/mobile

# 构建 Android 生产包（线上 API 环境）
npm run build:android:production:online

# 把最新构建提交到 Google Play 内测轨道
npm run submit:android:internal

# 一步完成：构建并自动提交到内测轨道
npm run release:android:internal

# 一步完成：构建并自动提交到生产轨道
npm run release:android:production
```

说明：

- `release:android:internal` 更适合首次提测
- `release:android:production` 适合已经完成测试、准备正式发布
- 当前 `submit` profile 默认是 `releaseStatus: "draft"`，也就是上传后不会立刻自动对用户放量，方便你在 Play Console 最后确认一次

## 第一次上架前必须完成的事情

### 1. 在 Play Console 创建 app

- 进入 [Google Play Console](https://play.google.com/console/)
- 新建应用
- 包名必须和当前项目一致：`com.wmshr.app`

### 2. 打开 Play App Signing

- 首次上传建议直接启用 Google Play App Signing
- 这样以后由 Google 管正式签名，EAS 负责上传更省心

### 3. 创建 Google Service Account

这是为了让 `eas submit` 自动上传。

操作路径：

1. 打开 Google Cloud Console
2. `IAM & Admin` -> `Service Accounts`
3. 新建 service account
4. 下载 JSON key
5. 放到这个路径：

```bash
/Users/admin/Desktop/project/wmshr/apps/mobile/google-service-account.json
```

然后在 Play Console 里授权：

1. `Setup` -> `API access`
2. 关联 Google Cloud project
3. 给这个 service account 分配 Play Console 权限

建议至少给这些权限：

- 查看应用信息
- 管理测试轨道发布
- 如果要自动发生产，再加生产发布权限

## Play Console 必填资料清单

这些通常比 Apple 麻烦一些，也是最容易卡住的部分。

### 商店信息

- App name
- Short description
- Full description
- App icon
- Feature graphic
- 手机截图

建议你至少准备：

- 512 x 512 应用图标
- 1024 x 500 feature graphic
- 2 到 8 张 Android 手机截图

### App content

在 `Policy` -> `App content` 里通常要完成：

- Privacy policy
- App access
- Ads declaration
- Content rating
- Target audience
- Data safety

### 当前项目特别需要注意的点

#### 隐私政策 URL

仓库里已经补了门户隐私政策路由，建议线上使用：

- `https://dutylix.com/en/privacy`
- `https://dutylix.com/en/terms`
- `https://dutylix.com/en/compliance`
- `https://dutylix.com/zh/privacy`
- `https://dutylix.com/zh/terms`
- `https://dutylix.com/zh/compliance`

如果正式生产域名不是 `dutylix.com`，发布前替换成你们实际域名即可。
注意：这些页面需要在下一次门户部署完成后才会在正式域名上显示新内容。

并说明这些内容：

- 收集哪些数据
- 为什么收集
- 是否与第三方共享
- 登录鉴权和设备信息如何使用
- 如何联系你们删除/更正数据

#### Data safety 要如实填写

这 app 有登录、接口请求、持久化存储，提交前需要逐项核对是否涉及：

- Personal info
- App activity
- Device or other identifiers

如果你们用了第三方分析、崩溃收集、定位或推送，也要一并声明。

#### App access

如果审核员需要登录才能看到主功能，Play Console 里要提供测试账号、密码和使用说明。

## 个人账号和组织账号的区别

如果你的 Google Play 开发者账号是个人账号，并且属于 Google 新规则范围，首次上生产可能需要先做 closed testing。

保守做法建议：

1. 先发 `internal testing`
2. 再建 `closed testing`
3. 测试稳定后再申请生产发布

如果你是组织账号，流程通常会轻一些。

## 推荐发布节奏

### 阶段 1：内部测试

```bash
cd /Users/admin/Desktop/project/wmshr/apps/mobile
npm run release:android:internal
```

完成后在 Play Console：

- 检查内测 release 是否已上传
- 添加测试人员
- 用真实 Android 设备安装验证

### 阶段 2：补齐商店资料

- 上传图标、截图、描述
- 填完 Data safety / Content rating / Audience / App access
- 配好隐私政策 URL

### 阶段 3：生产发布

```bash
cd /Users/admin/Desktop/project/wmshr/apps/mobile
npm run release:android:production
```

因为当前配置是 `draft`，上传后还需要你在 Play Console 里手动点最后发布，这样最稳。

## 常见问题

### 1. `App not found`

说明 Play Console 里还没先创建这个 app。

### 2. `The service account does not have permission`

说明 API access 里没给够 Play Console 权限。

### 3. `Version code already used`

当前项目开启了 `autoIncrement: true`，一般不会撞；如果撞了，检查是否上传了旧构建或 profile 不一致。

### 4. 上传成功但商店不能发布

一般不是构建问题，而是：

- `App content` 没填完
- 隐私政策缺失
- Data safety 未完成
- 审核测试账号未提供

## 你现在最先该做的三件事

1. 在 Play Console 创建 `com.wmshr.app`
2. 把 service account JSON 放到 `apps/mobile/google-service-account.json`

也可以直接用仓库里的安装脚本：

```bash
npm run mobile:setup:google-play-key -- --file /absolute/path/to/service-account.json
```

后续一键提审：

```bash
npm run mobile:release:android:play
```

如果先走内部测试轨道：

```bash
npm run mobile:release:android:play -- --track internal
```

如果你在 Google Cloud 创建 JSON key 时看到 `iam.disableServiceAccountKeyCreation` 报错，说明父级资源正在强制执行“禁止创建服务账号密钥”策略。需要先在父级 Organization 或 Folder 的 Organization Policies 中关闭该限制，或者为当前项目添加例外，然后才能生成这个 JSON。
3. 补一个线上可访问的隐私政策页面 URL

这三件事完成后，这个仓库已经可以直接走命令行提交流程。
