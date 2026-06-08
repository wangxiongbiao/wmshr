# 员工端 App iOS 测试包打包记录

## 背景

目标是把 `apps/mobile` 这个 Expo React Native 员工端项目打成可用于真机测试的 iOS 开发/测试包。

本次尝试时间：`2026-06-07`

项目位置：

- `apps/mobile`

相关账号：

- Expo 账号 owner：`nonogogo`
- EAS 项目：`@nonogogo/wmshr-app`
- EAS projectId：`39c2194c-2705-4784-8901-a50c4b684744`

## 本次完成的配置调整

### 1. 补齐 Expo / EAS iOS 出包配置

已更新 [apps/mobile/app.json](/Users/admin/Desktop/project/wmshr/apps/mobile/app.json)：

- 新增 `scheme: "wmshrapp"`
- 新增 `ios.bundleIdentifier: "com.wmshr.app"`
- 新增 `ios.infoPlist.ITSAppUsesNonExemptEncryption: false`
- 新增 `owner: "nonogogo"`
- 新增 `extra.eas.projectId`
- `plugins` 中补入 `expo-font`

已新增 [apps/mobile/eas.json](/Users/admin/Desktop/project/wmshr/apps/mobile/eas.json)：

- `development`：开发包 profile
- `preview`：内部测试安装包 profile
- `production`：正式发布 profile

已更新 [apps/mobile/package.json](/Users/admin/Desktop/project/wmshr/apps/mobile/package.json)：

- 新增 `prebuild:ios`
- 新增 `build:ios:preview`
- 新增 `build:ios:production`

### 2. 修复 monorepo 下 Expo 依赖与 Metro 配置

已更新 [apps/mobile/metro.config.js](/Users/admin/Desktop/project/wmshr/apps/mobile/metro.config.js)：

- 保留 workspace 根目录的 `watchFolders`
- 改为在 Expo 默认 `watchFolders` 基础上追加 workspace root
- 保留 `nodeModulesPaths` 指向 app 自己与 monorepo 根目录

原因：

- 这个仓库是 npm workspaces
- `expo/react/react-native` 会 hoist 到根 `node_modules`
- 如果 Metro 看不到 workspace root，Expo Go / Metro 可能解析到错误入口，出现 `Unable to resolve ../../App`

已更新 [package.json](/Users/admin/Desktop/project/wmshr/package.json)：

- 新增 `overrides.expo-font: "~14.0.12"`
- 新增根级 `devDependencies.expo-font: "~14.0.12"`

原因：

- Expo SDK 54 期望 `expo-font@~14.0.12`
- monorepo 根目录曾被 hoist 出 `expo-font@56.x`
- 这会导致 `expo-doctor` 报重复原生依赖与大版本不匹配

## 本次执行过的关键命令

在仓库根目录或 `apps/mobile` 下执行过：

```bash
npx expo-doctor
npx expo install --check
npx expo install expo-font
npx eas-cli@latest --version
npx eas-cli@latest whoami
npx eas-cli@latest init --non-interactive --force
npx eas-cli@latest build -p ios --profile production --non-interactive
npx eas-cli@latest build -p ios --profile preview
```

依赖修复后还执行过：

```bash
npm install
npm ls expo-font @expo/vector-icons --all
```

## 本次验证结果

### 成功项

1. Expo 配置已能被正确解析
2. EAS 项目已创建并绑定成功
3. `expo-doctor` 已达到 `18/18 checks passed`
4. Apple ID 登录成功
5. Apple 二次验证成功

### 关键输出

EAS 项目创建成功：

```text
Created @nonogogo/wmshr-app
Project successfully linked
```

Expo 健康检查成功：

```text
18/18 checks passed. No issues detected!
```

Apple 登录与 2FA 成功：

```text
Logged in and verified
Valid code
```

## 当前阻塞点

当前无法继续生成 iPhone/iPad 真机测试包，原因不是代码问题，而是 Apple Developer Portal 权限问题。

实际报错：

```text
Authentication with Apple Developer Portal failed!
You have no team associated with your Apple account, cannot proceed.
(Do you have a paid Apple Developer account?)
```

这说明当前使用的 Apple ID：

- 虽然可以登录 Apple 账号
- 也可以完成 2FA
- 但在 Apple Developer Portal 中没有可用的 `Team`

常见原因：

1. 该 Apple ID 尚未加入付费 Apple Developer Program
2. 已加入，但还有协议未确认
3. 被邀请加入团队但未接受邀请
4. 登录的是普通 Apple 账号，不是有开发者团队权限的账号

## 下次继续前需要确认的事项

请先登录：

- [Apple Developer Account](https://developer.apple.com/account/)

重点检查：

1. 是否能看到 `Team`
2. 是否有待接受的协议
3. 是否有团队邀请待接受
4. 该账号是否确实属于已付费开发者计划

## 账号问题解决后如何继续

进入员工端目录：

```bash
cd /Users/admin/Desktop/project/wmshr/apps/mobile
```

出测试包：

```bash
npm run build:ios:preview
```

出正式包：

```bash
npm run build:ios:production
```

如果只是生成开发包：

```bash
npx eas-cli@latest build -p ios --profile development
```

## 补充说明

### 关于本机 Xcode

这台机器当前只有 Command Line Tools，没有完整 Xcode，因此本地 `xcodebuild` 不能直接用于 iOS 原生构建。

但本次使用的是 EAS 云构建，所以这不影响最终生成真机安装包。当前唯一真正阻塞项仍然是 Apple Developer Team 权限。

### 关于 bundle identifier

当前暂用：

```text
com.wmshr.app
```

如果后续正式发布，建议改成你们自己确定的正式包名，例如带公司域名前缀的唯一标识，避免和未来其它应用冲突。
