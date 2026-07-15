# WMSHR Google Play 提交素材包

这份文档收拢了你在 Google Play Console 中最常复制粘贴的内容。目标是让你打开后台后按块填写，不再来回翻项目。

## 1. 应用信息

- App name: `WMSHR App`
- Package name: `com.wmshr.app`
- Category: `Business`
- App type: `App`
- Default language: `English (United States)`

## 2. 法律页 URL

这些路由已经在代码里准备好了，但线上域名需要在下一次门户部署后才会真正展示新内容。

- Privacy policy: `https://dutylix.com/en/privacy`
- Terms of service: `https://dutylix.com/en/terms`
- Compliance page: `https://dutylix.com/en/compliance`
- 中文隐私页: `https://dutylix.com/zh/privacy`
- 中文条款页: `https://dutylix.com/zh/terms`
- 中文合规页: `https://dutylix.com/zh/compliance`

## 3. 商店文案

### Short description

`Mobile workforce app for employee attendance, payroll viewing, SOP acknowledgment, and work notifications.`

### Full description

`WMSHR App helps distributed teams and frontline employees complete daily workforce tasks in one place. Employees can sign in securely, complete attendance check-in and check-out, review payroll results, read company SOPs, and receive work notifications from the organization.

Key features:
- Employee account sign-in
- Attendance check-in and check-out
- Location-assisted attendance verification
- Payroll result viewing
- SOP reading and acknowledgement
- Employee notification center
- Multi-language experience

WMSHR App is designed for organizations that need a simple employee-side mobile workflow connected to their workforce operations platform.`

### What's new

`Initial release of WMSHR App with employee sign-in, attendance check-in, payroll viewing, SOP acknowledgement, and notification access.`

## 4. App Access 审核说明

如果 Google 审核要求登录信息，建议直接粘贴下面这段说明，再替换成你准备好的测试账号：

`Reviewers can sign in with the provided employee test account. After sign-in, the main flows available for review are Home, attendance check-in and check-out, Notifications, payroll detail, SOP acknowledgement, and the Mine tab. Location permission is requested only when the reviewer starts an attendance check-in flow.`

测试账号字段建议准备：

- Username / Employee account: `待你填`
- Password: `待你填`
- Additional instructions: `Use the Home tab to start attendance check-in.`

## 5. Data Safety 草稿

按当前代码和权限使用情况，Play Console 里至少应重点核对这些类别：

- Personal info
  - Name
  - Employee account
- Financial info
  - Payroll result details
- Location
  - Precise location for attendance verification
- App activity
  - Attendance records
  - SOP acknowledgement
  - Notification read status
- Device or other identifiers
  - Session-related identifiers used to keep users signed in

本地存储说明：

- Sign-in state is stored in secure device storage.
- If the user enables remember-me, credentials may also be stored locally in secure device storage for faster future sign-in.

## 6. 权限用途说明

### Location permission

`WMSHR App uses location permission only when the employee starts attendance check-in or check-out. The location is used to verify attendance location, improve workplace identification, and sync attendance records accurately.`

## 7. 素材文件

已为你准备好的基础素材路径：

- App icon source: [docs/assets/google-play/wmshr-play-icon.svg](/Users/admin/Desktop/project/wmshr/docs/assets/google-play/wmshr-play-icon.svg)
- App icon PNG: [docs/assets/google-play/wmshr-play-icon.png](/Users/admin/Desktop/project/wmshr/docs/assets/google-play/wmshr-play-icon.png)
- Feature graphic source: [docs/assets/google-play/wmshr-feature-graphic.svg](/Users/admin/Desktop/project/wmshr/docs/assets/google-play/wmshr-feature-graphic.svg)
- Feature graphic export source: [docs/assets/google-play/wmshr-feature-graphic-export.svg](/Users/admin/Desktop/project/wmshr/docs/assets/google-play/wmshr-feature-graphic-export.svg)
- Feature graphic PNG: [docs/assets/google-play/wmshr-feature-graphic-ready.png](/Users/admin/Desktop/project/wmshr/docs/assets/google-play/wmshr-feature-graphic-ready.png)

建议上传的最终文件：

- `wmshr-play-icon.png`
- `wmshr-feature-graphic-ready.png`

## 7. Google Play Console 中文上传

如果要把 AAB 上传到 Google Play Console，先看中文步骤：

```text
docs/google-play-console-zh-upload-guide.md
```

标准检查入口：

```bash
npm run mobile:google-play:check
```

权限通过后上传到内部测试草稿：

```bash
npm run mobile:google-play -- --upload --commit --track internal --status draft
```

上传后复核内部测试轨道：

```bash
npm run mobile:google-play -- --verify-track --track internal
```

提交审核 / 发布内部测试：

```bash
npm run mobile:google-play:submit-review -- --version-code 129 --track internal
```

若中文后台提示 `REQUEST_INSTALL_PACKAGES` 未声明，先在「应用内容」/「敏感应用权限」中补充该权限声明，再重试提交。

本次实际提交结果：已构建 Play 专用 AAB，移除 `REQUEST_INSTALL_PACKAGES`，使用 `versionCode=130` 提交内部测试和正式版 production；Google 复核两个轨道均为 `completed versionCodes=130 name=WMSHR Android 130`。

## 8. 还需要你最终补的唯一业务内容

下面这项我没法替你凭空生成真实值，需要你后面补进 Play Console：

- 审核测试账号和密码
- 最终 Android 截图

其中截图建议来自真实 Android 设备或模拟器，至少包含：

1. 登录页
2. 首页打卡卡片
3. 通知页
4. 工资单详情页
5. SOP 页
