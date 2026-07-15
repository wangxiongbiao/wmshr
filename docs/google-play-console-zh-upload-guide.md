# Google Play Console 中文后台上传指南

本文只针对当前项目 `com.wmshr.app`。目标是把本地生成的 AAB 传到 Google Play Console，并把“服务账号权限不够”的阻塞点说清楚。

## 0. 当前机器已经准备好的东西

- 应用包名：`com.wmshr.app`
- 服务账号邮箱：`wmshr-play-publisher@wmshr-498110.iam.gserviceaccount.com`
- 服务账号文件：`apps/mobile/google-service-account.json`
- 当前 Play 专用 AAB 路径：`apps/mobile/android/app/build/outputs/bundle/release/app-play-release-v130.aab`
- 当前 Play 专用 AAB SHA-256：`05e216c5737f08a4fe2cb829b9a8280dfcd4975a9f14916c3fe2c787086bf9f2`

> 注意：服务账号 JSON 里有私钥，不要上传到聊天、截图或公共仓库。

## 1. 先在本机检查权限

在项目根目录执行：

```bash
npm run mobile:google-play:check
```

如果输出类似下面这样，说明服务账号还没有 Play Console 权限：

```text
Play Console 权限检查：失败 403 PERMISSION_DENIED
Google 返回：The caller does not have permission
```

这不是 AAB 问题，也不是本机网络问题，而是 Play Console 账号权限没给到这个服务账号。

## 2. 中文 Play Console 授权步骤

1. 打开 Google Play Console：`https://play.google.com/console`
2. 选择你的开发者账号。
3. 左侧进入「用户和权限」。
   - 如果左侧没有直接看到，通常在「设置」里面。
4. 点击「邀请新用户」。
5. 邮箱填写：

   ```text
   wmshr-play-publisher@wmshr-498110.iam.gserviceaccount.com
   ```

6. 在「应用权限」里选择应用：

   ```text
   com.wmshr.app
   ```

7. 权限至少要包含发布相关能力。中文界面里通常要找这些含义的权限：
   - 查看应用信息
   - 创建和管理草稿版本
   - 管理测试轨道 / 内部测试
   - 发布版本 / 管理发布

8. 保存。

保存后回到本机再执行：

```bash
npm run mobile:google-play:check
```

看到下面这种结果才表示授权通过：

```text
Google OAuth：通过
Play edit：已创建 xxxxxxxx***
Play edit：已删除，HTTP 204
权限检查：通过。现在可以执行带 --upload --commit 的上传命令。
```

## 3. 构建 AAB

如果还没生成 AAB，先执行：

```bash
HOME=/Users/admin npm run mobile:build:android:production:bundle:local
```

生成路径：

```text
apps/mobile/android/app/build/outputs/bundle/release/app-release.aab
```

## 4. 上传到 Google Play Console

权限检查通过后，执行：

```bash
npm run mobile:google-play -- --upload --commit --track internal --status draft
```

含义：

- `--upload`：上传 AAB
- `--commit`：提交本次 Play edit，让后台能看到
- `--track internal`：放到「内部测试」轨道
- `--status draft`：先作为草稿，不直接正式发布

上传成功后，去中文后台查看：

1. 进入应用 `com.wmshr.app`
2. 左侧进入「测试」
3. 打开「内部测试」
4. 查看是否出现新草稿版本 / 新 AAB

也可以在本机复核内部测试轨道：

```bash
npm run mobile:google-play -- --verify-track --track internal
```

本次成功上传后的期望输出包含：

```text
status=draft versionCodes=129 name=WMSHR Android 129
```

## 5. 提交审核 / 发布内部测试

上传成功后，如果要把内部测试草稿提交到 Google 的审核/发布流程，执行：

```bash
npm run mobile:google-play:submit-review -- --version-code 129 --track internal
```

### 如果提示 REQUEST_INSTALL_PACKAGES 未声明

当前移动端为了官网 APK 自更新，会声明：

```text
android.permission.REQUEST_INSTALL_PACKAGES
```

Google Play 提交时如果返回：

```text
This release includes the REQUEST_INSTALL_PACKAGES permission, which hasn't been declared in Play Console.
```

需要先在中文后台补声明：

1. 进入应用 `com.wmshr.app`
2. 打开「政策和计划」或「应用内容」
3. 找到「敏感应用权限」/「特殊应用访问权限」相关声明
4. 声明 `REQUEST_INSTALL_PACKAGES` 的用途：用于企业自有 Android 安装包下载后拉起系统安装器完成应用内更新
5. 保存后重新执行：

   ```bash
   npm run mobile:google-play:submit-review -- --version-code 129 --track internal
   ```

如果不想在 Play 包里声明该权限，替代方案是构建一个 Play 专用 AAB：移除 `REQUEST_INSTALL_PACKAGES`，提升新的 `versionCode`，重新上传并提交。

本次已采用替代方案：构建 Play 专用 AAB，`versionCode=130`，并提交到内部测试轨道。成功复核输出为：

```text
status=completed versionCodes=130 name=WMSHR Android 130
```

随后已继续提交正式版 production 审核/发布流程，复核输出为：

```text
production
status=completed versionCodes=130 name=WMSHR Android 130
```

## 6. 如果你想手动上传

也可以不用脚本，直接在中文后台手动传：

1. 进入应用 `com.wmshr.app`
2. 左侧进入「测试」→「内部测试」
3. 点击「创建新版本」或「修改版本」
4. 上传这个文件：

   ```text
   apps/mobile/android/app/build/outputs/bundle/release/app-release.aab
   ```

5. 填写版本说明。
6. 保存为草稿，先不要直接推正式版。

## 7. 当前仍需注意的签名问题

当前本机已经接入 Play upload keystore：

```text
apps/mobile/android/keystore.properties
apps/mobile/android/app/wmshr-upload-key.jks
```

这两个文件是本地私密文件，已被 `.gitignore` 忽略，不要提交到 Git，也不要发到聊天或截图。

如果换机器构建 Play AAB，需要同步这两个私密文件；否则 Gradle 会回退 debug 签名，Google Play 会拒绝上传。
