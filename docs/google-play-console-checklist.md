# WMSHR Google Play Console 资料清单

本文用于把 `WMSHR App` 上架 Google Play 时需要准备的资料一次性列清，尽量减少你在 Play Console 里来回补资料。

## 一、应用基础信息

- App name：`WMSHR App`
- Default language：建议 `English (United States)` 或你的主要运营语言
- Package name：`com.wmshr.app`
- Category：建议先选 `Business`
- App type：`App`

## 二、商店文案建议

### Short description

建议英文版：

`Mobile workforce app for employee attendance, payroll viewing, SOP acknowledgment, and work notifications.`

建议中文版：

`面向员工的移动工作台，支持考勤打卡、工资单查看、SOP 阅读确认与工作通知。`

### Full description

建议英文版：

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

建议中文版：

`WMSHR App 为一线员工和分布式团队提供统一的移动工作入口。员工可通过应用安全登录，完成日常考勤打卡、查看薪资结果、阅读并确认 SOP 文件，以及接收企业下发的工作通知。

核心功能包括：
- 员工账号登录
- 上下班打卡
- 基于位置的考勤辅助核验
- 工资单与薪资结果查看
- SOP 阅读与确认
- 员工通知中心
- 多语言体验

WMSHR App 适用于需要将员工端移动流程与企业考勤、薪资和制度管理平台打通的组织。`

## 三、视觉素材清单

### 必备

- App icon：`512 x 512` PNG
- Feature graphic：`1024 x 500` PNG
- Phone screenshots：至少 `2` 张，建议 `4-8` 张

### 建议截图内容

1. 登录页
2. 首页 / 打卡页
3. 通知中心
4. 工资单详情
5. SOP 列表或 SOP 阅读页
6. 我的页面 / 个人信息页

### 截图注意事项

- 不要出现测试环境域名、报错弹窗、调试按钮
- 不要出现明显假数据，如 `test123`
- 如果截图里含员工姓名，建议使用演示账号或脱敏数据

## 四、隐私政策

你现在可以把下面这些地址作为最终目标填到 Play Console：

- `https://dutylix.com/en/privacy`
- `https://dutylix.com/en/terms`
- `https://dutylix.com/en/compliance`
- 中文可用：`https://dutylix.com/zh/privacy`
- 中文可用：`https://dutylix.com/zh/terms`
- 中文可用：`https://dutylix.com/zh/compliance`

如果最终生产域名不是 `dutylix.com`，发布前把域名替换成你的正式线上域名。
注意：这些法律页代码已经准备好，但需要你把最新门户代码部署上线后，线上地址才会真正显示对应内容。

## 五、App Access 审核账号准备

因为这个 app 需要登录，Google 审核通常需要测试账号。

建议准备：

- 测试账号
- 测试密码
- 如有二次验证，提供绕过方式或测试验证码流程说明
- 审核路径说明

建议在 App Access 里填写的说明：

`After sign-in, reviewers can access the Home screen, Attendance check-in flow, Notifications, Payroll detail view, SOP list, and the Mine tab. Location permission is requested only when the reviewer starts attendance check-in.`

## 六、Data safety 填写前核对

按当前代码，至少要重点核对这些数据类型是否声明：

### 很可能涉及

- Personal info
  - 姓名
  - 员工账号
- Financial info
  - 薪资结果或工资单信息
- Location
  - 精确位置
- App activity
  - 考勤记录
  - 通知已读状态
  - SOP 阅读确认
- Device or other identifiers
  - 登录态相关标识或会话标识

### 本地处理与存储

- 登录态保存在设备安全存储中
- 如果用户启用“记住我”，账号和密码也可能保存在本地安全存储

### 是否需要填写为“收集”

如果数据会从设备发送到你的服务端并与用户账户关联，通常就要按实际情况申报为收集。

## 七、Permissions 核对

当前最需要重点说明的是：

- Location permission
  - 用途：员工考勤打卡、地点识别、出勤记录同步

如果后续接入通知、相机、相册、通讯录、麦克风等权限，Play Console 与隐私政策也要同步更新。

## 八、Content rating 建议

按当前产品形态，通常属于企业工具类应用。填写时如实回答即可，重点避免：

- 错把用户生成公开内容写成有社交内容
- 错把薪资和通知功能写成博彩、金融交易或医疗用途

## 九、Target audience 建议

建议：

- 选择成年人工作人群
- 不面向儿童

如果选择包含儿童年龄段，会额外触发更严格的家庭政策要求，不建议误选。

## 十、Ads declaration

如果应用内没有广告，直接填 `No`。

## 十一、测试轨道建议

推荐顺序：

1. Internal testing
2. Closed testing
3. Production

如果你的账号属于 Google 新规覆盖的个人开发者账号，先做 closed testing 更稳。

## 十二、提交前最终检查

- Play Console 里 app 已创建
- 包名是 `com.wmshr.app`
- 已启用 Play App Signing
- 已准备 service account，并与 EAS 配置一致
- 已上传 AAB，不是 APK
- 已填隐私政策 URL
- 已填 Data safety
- 已填 App access
- 已填内容分级
- 已上传截图、图标、Feature graphic
- 已确认登录流程和打卡流程可用

## 十三、发布时推荐文案

### What's new

建议首版：

`Initial release of WMSHR App with employee sign-in, attendance check-in, payroll viewing, SOP acknowledgement, and notification access.`

后续版本：

`Bug fixes and stability improvements.`
