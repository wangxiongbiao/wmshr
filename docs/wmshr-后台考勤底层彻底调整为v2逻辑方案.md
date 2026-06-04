# WMSHR 后台考勤底层彻底调整为 v2 逻辑方案

## 1. 调整目标

本次目标不是在正式后台现有多规则体系上做界面简化，而是将后台考勤底层逻辑彻底调整为 `admin-v2` 的轻量逻辑。

调整后的核心口径：

```text
全局只有一套考勤规则
所有员工共用这套规则
员工不再绑定个人考勤规则
不再维护员工考勤规则历史
考勤页按员工 + 日期 + 考勤记录 + 全局规则实时计算
允许调整某员工某天的考勤记录
考勤计算页直接展示当天工时和当天费用
```

最终后台应从当前：

```text
多考勤规则库
员工绑定规则
员工规则历史
按员工历史规则计算
月度考勤汇总
薪资核算联动复杂规则
```

调整为：

```text
单一全局考勤规则
员工基础档案
每日考勤记录
按全局规则计算每日考勤
按 v2 逻辑展示当天费用
薪资模块基于轻量考勤结果继续计算
```

---

## 2. v2 考勤底层逻辑基准

### 2.1 数据组成

v2 只有三类核心数据：

```text
employees       员工档案
attendance      考勤记录
config          全局考勤规则
```

关系：

```text
员工 + 日期 + 当天考勤记录 + 全局规则 = 当天考勤计算结果
```

不包含：

```text
多套规则
员工规则绑定
员工规则历史
个人专属规则
规则有效期切换
```

### 2.2 全局考勤规则

全局规则字段：

```text
上班时间 startShift
下班时间 endShift
午休开始 breakStart
午休结束 breakEnd
标准工时 standardHours
加班费标准 otHourlyFee
```

默认值：

```text
startShift: 08:30
endShift: 17:30
breakStart: 12:00
breakEnd: 13:00
standardHours: 8
otHourlyFee: 50
```

规则修改后立即影响所有员工。

### 2.3 考勤表生成

v2 不是只展示已有考勤记录，而是：

```text
所有日期 × 所有员工
```

日期来源：

```text
已有考勤记录日期
今天
昨天
```

因此无记录员工也会显示一行，并自动判定为缺勤。

### 2.4 状态判断

优先级：

```text
员工休假 -> 假期
无考勤记录 -> 缺勤
有考勤记录 -> 使用记录 type
```

状态类型：

```text
normal   正常
late     迟到
early    早退
absent   缺勤
leave    假期
overtime 加班
```

### 2.5 工时计算

如果不是缺勤/假期，并且有上下班时间：

```text
原始工时 = 下班时间 - 上班时间
如果下班时间早于上班时间，按跨天处理：下班时间 + 24 小时
午休扣除 = 上下班区间与午休区间的重叠时长
有效工时 = 原始工时 - 午休扣除
加班时长 = max(0, 有效工时 - 标准工时)
```

v2 不做：

```text
迟到扣款
早退扣款
审批假期
多班次
考勤组
个人规则历史
加班半小时取整
```

### 2.6 费用计算

如果员工有基础月薪：

```text
上班费用 = 基础月薪 / 30
```

如果员工没有基础月薪：

```text
上班费用 = 非加班有效工时 × 时薪
非加班有效工时 = 有效工时 - 加班时长
```

加班费用：

```text
加班费用 = 加班时长 × 全局加班费标准
```

合计：

```text
合计费用 = 上班费用 + 加班费用
```

---

## 3. 当前正式后台需要砍掉的底层能力

以下能力与 v2 逻辑冲突，应从业务逻辑中彻底下线。

### 3.1 多考勤规则库

当前正式后台支持：

```text
attendance_rules 多条规则
规则启用/停用
规则有效期
关联员工统计
```

调整为 v2 后：

```text
不再存在规则列表
不再新增多套规则
不再编辑某一条规则模板
只保留一套全局配置
```

### 3.2 员工绑定考勤规则

当前员工字段中有：

```text
attendanceRuleId
attendanceRuleName
```

调整后：

```text
员工不再选择考勤规则
员工档案不再展示考勤规则字段
员工保存不再提交 attendanceRuleId
```

### 3.3 员工考勤规则历史

当前有：

```text
employee_attendance_rule_history
ruleHistory
ruleEffectiveStartDate
ruleEffectiveEndDate
```

调整后：

```text
不再创建规则历史
不再读取规则历史
不再按历史规则计算
员工详情不再展示规则历史
```

### 3.4 按员工日期解析规则

当前服务端逻辑类似：

```text
员工 + 日期 -> employee_attendance_rule_history -> attendance_rules -> 计算
```

调整后：

```text
员工 + 日期 -> 全局考勤配置 -> 计算
```

---

## 4. 新底层数据模型

### 4.1 推荐保留的数据表

彻底调整后，核心表应收敛为：

```text
employees
attendance_records
attendance_config
attendance_calculation_results
monthly_attendance_summaries
salary_adjustment_items
monthly_payroll_results
```

其中：

```text
attendance_config
```

用于替代原来的多规则 `attendance_rules`。

### 4.2 新增/改造 attendance_config

建议新增单独表：

```sql
create table public.attendance_config (
  owner_user_id uuid primary key references auth.users(id) on delete cascade,
  start_shift time not null default '08:30',
  end_shift time not null default '17:30',
  break_start time not null default '12:00',
  break_end time not null default '13:00',
  standard_hours numeric(6,2) not null default 8,
  ot_hourly_fee numeric(12,2) not null default 50,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);
```

设计原则：

```text
每个账号只有一条全局考勤配置
owner_user_id 是主键
不需要 rule_id
不需要有效期
不需要启用/停用
不需要关联员工
```

### 4.3 employees 表调整

从业务模型移除：

```text
attendance_rule_id
```

如果数据库迁移允许，建议物理删除该字段。

如果需要分阶段迁移，可以先：

```text
前端不使用
API 不返回
计算不依赖
后续稳定后再 drop column
```

但最终目标是彻底 v2 化，因此最终 schema 应不包含员工规则字段。

员工保留字段按 v2 口径：

```text
id
employee_no 可选：如果正式后台还需要内部编号，可隐藏
name
gender
country
role
dept
hourly_rate
fixed_salary / base_monthly_wage
currency
join_date
status
photo 可删除或隐藏，列表只显示姓名首字母
is_deleted 可保留用于软删除
```

### 4.4 删除/下线表

最终可下线：

```text
attendance_rules
employee_attendance_rule_history
```

执行建议：

```text
第一阶段：代码不再读取/写入
第二阶段：数据迁移完成并验证通过
第三阶段：删除 API、类型、前端模块
第四阶段：数据库 drop table
```

---

## 5. 服务端 API 调整

### 5.1 删除/下线的 API

下线以下多规则相关 API：

```text
GET    /api/admin/attendance-rules/options
GET    /api/admin/attendance-rules
GET    /api/admin/attendance-rules/:id
POST   /api/admin/attendance-rules
PUT    /api/admin/attendance-rules/:id
PATCH  /api/admin/attendance-rules/:id/enable
PATCH  /api/admin/attendance-rules/:id/disable
GET    /api/admin/attendance-rules/:id/related-employees
```

这些能力不属于 v2。

### 5.2 新增全局考勤配置 API

新增：

```text
GET /api/admin/attendance-config
PUT /api/admin/attendance-config
```

返回结构：

```json
{
  "startShift": "08:30",
  "endShift": "17:30",
  "breakStart": "12:00",
  "breakEnd": "13:00",
  "standardHours": 8,
  "otHourlyFee": 50
}
```

保存结构同上。

服务端行为：

```text
GET：如果当前账号没有配置，自动创建默认配置并返回
PUT：upsert 当前账号唯一配置
```

### 5.3 员工 API 调整

员工创建/编辑 payload 移除：

```text
attendanceRuleId
ruleEffectiveStartDate
```

员工详情移除：

```text
ruleHistory
attendanceRuleName
```

`EmployeeUpsertPayload` 调整为：

```text
name
gender
country
phone 可隐藏或删除
role
dept
joinDate
status
salaryType 可按 v2 进一步移除，通过 fixedSalary 是否存在判断
hourlyRate
fixedSalary
salaryEffectiveStartDate 如不需要薪资历史也应下线
currency
photo 可隐藏/null
```

如果彻底按 v2，薪资类型也可以不显式维护：

```text
fixedSalary 有值 -> 月薪
fixedSalary 无值 -> 时薪
```

### 5.4 考勤计算 API 调整

保留：

```text
GET  /api/admin/attendance-calculations
POST /api/admin/attendance-calculations/recalculate-daily
POST /api/admin/attendance-calculations/recalculate-batch
POST /api/admin/attendance-calculations/recalculate-monthly
```

但内部逻辑改为：

```text
读取 attendance_config
不读取 attendance_rules
不读取 employee_attendance_rule_history
```

返回结果应补充 v2 页面需要的费用字段，建议直接服务端返回：

```text
shiftPay
activePay / workPay
otPay
totalPay
```

推荐命名：

```text
workPay      上班费用
overtimePay  加班费用
totalPay     合计费用
```

### 5.5 考勤记录 API 保留

保留：

```text
POST /api/admin/attendance-records
PUT  /api/admin/attendance-records/:id
```

调整弹窗只维护：

```text
date
type
inTime
outTime
note
```

保存后：

```text
创建/更新 attendance_records
立即重算该员工该日期
返回新的 calculation result
```

---

## 6. 服务端计算逻辑调整

### 6.1 删除原规则解析

删除或停用：

```text
resolveRuleForDate(historyRows, ruleMap, date)
```

不再使用：

```text
historyMap
ruleMap
employee_attendance_rule_history
attendance_rules
```

### 6.2 新增全局配置解析

新增：

```text
resolveAttendanceConfig(ownerUserId)
```

行为：

```text
读取 attendance_config
没有则创建默认配置
返回当前账号唯一配置
```

### 6.3 新每日计算流程

计算入口：

```text
calculateDailyAttendanceRow(employee, record, config, date, ownerUserId)
```

逻辑：

```text
1. 如果员工状态为休假：status = leave，费用和工时为 0
2. 如果没有考勤记录：status = absent，费用和工时为 0
3. 如果 record.type = leave：status = leave，费用和工时为 0
4. 如果 record.type = absent：status = absent，费用和工时为 0
5. 如果缺少上班/下班时间：status = exception
6. 否则计算 rawHours、breakDeductionHours、validHours、overtimeHours
7. 按 v2 费用公式计算 workPay、overtimePay、totalPay
```

### 6.4 加班计算按 v2

正式后台当前有半小时向下取整逻辑：

```text
overtimePayHours = floor(overtimeRawHours / 0.5) * 0.5
```

v2 逻辑应改为：

```text
overtimePayHours = overtimeRawHours
```

不取整。

### 6.5 月薪/时薪判断

按 v2：

```text
hasFixedSalary = fixedSalary > 0
```

费用：

```text
if hasFixedSalary:
  workPay = fixedSalary / 30
else:
  workPay = (validHours - overtimeHours) * hourlyRate

overtimePay = overtimeHours * config.otHourlyFee
totalPay = workPay + overtimePay
```

缺勤/假期：

```text
workPay = 0
overtimePay = 0
totalPay = 0
```

---

## 7. 前端模块调整

### 7.1 侧边栏

移除：

```text
考勤规则
```

保留：

```text
数据看板
员工管理
考勤计算
薪资核算
```

如果仍需 SOP，再按业务决定是否保留。

### 7.2 员工管理

员工新增/编辑不再展示：

```text
考勤规则
规则生效日期
规则历史
```

员工列表也不展示：

```text
attendanceRuleName
```

员工字段按 v2：

```text
姓名
性别
来源国家
职位
所属区域
时薪
基础工资/月薪
全勤奖
社保金
工资币种
入职日期
状态
```

头像：

```text
不上传头像
列表显示姓名首字母
```

### 7.3 考勤计算页

改为 v2 结构：

顶部筛选：

```text
筛选员工
时间筛选方式：全部时间 / 按天 / 按月
清除筛选条件
```

操作：

```text
导出当前数据
设置规则
```

表格字段：

```text
勾选
日期
员工
上班状态
上班
下班
有效工时
加班时长
上班费用
加班费用
合计费用
操作
```

底部说明：

```text
缺勤 = 当天无打卡记录
假期 = 员工休假状态
```

### 7.4 设置规则弹窗

替代原规则列表和规则编辑弹窗。

字段：

```text
上班时间
下班时间
午休开始
午休结束
加班费标准
```

按钮：

```text
恢复默认
保存规则
```

保存调用：

```text
PUT /api/admin/attendance-config
```

### 7.5 调整考勤弹窗

字段：

```text
日期
考勤类型
上班时间
下班时间
调整备注
```

不展示：

```text
规则选择
班次选择
审批信息
```

保存后：

```text
POST/PUT attendance-records
然后触发或由后端自动完成单日重算
刷新当前行
```

---

## 8. 薪资模块联动调整

v2 考勤页已经计算当天费用，但薪资模块仍需要按月汇总。

### 8.1 月度汇总口径

月度考勤汇总应基于每日计算结果：

```text
totalValidHours
totalOvertimeHours
recordCount
absentCount
leaveCount
manualAdjustedCount
totalWorkPay
totalOvertimePay
totalAttendancePay
```

建议新增或调整月度汇总字段：

```text
total_work_pay
total_overtime_pay
total_attendance_pay
```

### 8.2 月薪员工薪资

v2 的日费用展示是：

```text
fixedSalary / 30
```

月薪核算可以有两种口径：

#### 口径 A：按每日出勤累计

```text
基础工资 = 出勤天数 × fixedSalary / 30
```

缺勤/假期为 0。

#### 口径 B：按月薪整月，再扣缺勤

```text
基础工资 = fixedSalary - 缺勤扣款
```

v2 更接近口径 A，因为考勤页每天已经计算了 `基础月薪 / 30`。

建议采用：

```text
口径 A
```

这样考勤页与薪资页一致。

### 8.3 全勤奖和社保金

全勤奖、社保金属于员工固定档案字段，同时参与薪资：

```text
全勤奖 -> 工资加项
社保金 -> 工资扣项
```

薪资公式建议：

```text
考勤工资 = 月度 totalAttendancePay
应发工资 = 考勤工资 + 全勤奖 + 其他加项
实发工资 = 应发工资 - 社保金 - 其他扣项
```

---

## 9. 数据迁移步骤

### 9.1 第一阶段：新增 v2 全局配置

1. 新增 `attendance_config` 表。
2. 为每个已有 owner 生成一条配置。
3. 配置来源优先级：

```text
如果存在已启用 attendance_rules：取第一条启用规则
否则使用默认值 08:30-17:30 / 12:00-13:00 / 8h / 50
```

### 9.2 第二阶段：服务端改读全局配置

1. 考勤计算不再查询规则历史。
2. 考勤计算统一读取 `attendance_config`。
3. 重算日/月考勤使用新逻辑。
4. 返回 v2 需要的费用字段。

### 9.3 第三阶段：前端移除多规则入口

1. 侧边栏删除“考勤规则”。
2. 员工弹窗删除规则选择和规则生效日期。
3. 员工详情删除规则历史。
4. 考勤页增加/保留 `设置规则` 弹窗，接全局配置 API。

### 9.4 第四阶段：接口清理

删除或停止使用：

```text
attendance-rules 全套 API
related-employees API
rule options API
```

### 9.5 第五阶段：数据库清理

确认线上稳定后删除：

```text
employee_attendance_rule_history
attendance_rules
employees.attendance_rule_id
```

如果短期担心回滚，可以先保留表但不再读写。

---

## 10. 代码改动范围

### 10.1 必改文件

```text
apps/admin/src/types.ts
apps/admin/src/lib/api.ts
apps/admin/src/App.tsx
apps/admin/src/components/Sidebar.tsx
apps/admin/src/components/EmployeeList.tsx
apps/admin/src/components/Modals.tsx
apps/admin/src/components/AttendanceTable.tsx
apps/admin/src/components/PayrollTable.tsx
apps/admin/server/index.js
supabase/migrations/*.sql
```

### 10.2 可删除文件/模块

```text
apps/admin/src/components/AttendanceRuleList.tsx
```

以及相关 modal：

```text
AttendanceRuleModal
AttendanceRuleRelatedEmployeesModal
AttendanceRuleToggleModal
```

### 10.3 类型删除

删除或不再使用：

```text
AttendanceRule
AttendanceRuleOption
AttendanceRuleFormData
AttendanceRuleDetail
AttendanceRuleRelatedEmployee
EmployeeAttendanceRuleHistory
```

新增：

```text
AttendanceConfig
```

---

## 11. 验证口径

### 11.1 员工管理验证

确认：

```text
新增员工不需要选择考勤规则
编辑员工不显示规则历史
保存员工不会提交 attendanceRuleId
列表不显示 attendanceRuleName
```

### 11.2 全局规则验证

确认：

```text
打开考勤计算页
点击设置规则
修改上班/下班/午休/加班费
保存后所有员工计算统一变化
刷新页面后规则仍保留
```

### 11.3 缺勤验证

准备某员工某天无考勤记录。

应显示：

```text
状态：缺勤
上班：-
下班：-
有效工时：-
加班时长：0.00h
费用：0
```

### 11.4 假期验证

员工状态为休假，或记录 type 为 leave。

应显示：

```text
状态：假期
工时：0
费用：0
```

### 11.5 正常出勤验证

规则：

```text
08:30 - 17:30
午休 12:00 - 13:00
标准工时 8
加班费 50
```

考勤：

```text
08:30 - 18:30
```

结果：

```text
原始工时：10
午休扣除：1
有效工时：9
加班时长：1
```

如果时薪 300：

```text
上班费用 = 8 × 300 = 2400
加班费用 = 1 × 50 = 50
合计 = 2450
```

如果月薪 60000：

```text
上班费用 = 60000 / 30 = 2000
加班费用 = 1 × 50 = 50
合计 = 2050
```

### 11.6 跨天验证

考勤：

```text
20:00 - 04:00
```

应按跨天处理：

```text
下班时间 + 24 小时
原始工时 = 8
```

### 11.7 导出验证

导出当前筛选数据，字段应为：

```text
日期
员工姓名
来源国家
性别
职位
所属区域
时薪
基本日薪
上班时间
下班时间
有效工时
加班工时
今天上班费用
加班费
合计费用
考勤状态
备注
```

---

## 12. 风险点

### 12.1 历史考勤结果口径变化

因为原来按员工历史规则计算，改成全局规则后，历史月份重算结果会变。

处理方式：

```text
上线后统一按新 v2 口径重算
不要混用旧结果和新结果
```

### 12.2 薪资结果口径变化

原来薪资可能按正式后台复杂汇总计算，改成 v2 后，应明确采用：

```text
月薪按出勤日折算
时薪按有效工时计算
加班按全局加班费计算
全勤奖加项
社保金扣项
```

### 12.3 删除规则表前要确认无引用

删除前必须确认：

```text
前端无引用
API 无引用
服务端计算无引用
bootstrap 无引用
薪资计算无引用
Dashboard 无引用
```

### 12.4 演示数据初始化要同步改

当前 bootstrap 会创建考勤规则和员工规则历史。

调整后 bootstrap 应改为：

```text
创建 attendance_config
创建 employees
创建 attendance_records
创建 salary_adjustment_items 如需要
重算考勤
生成薪资
```

不再创建：

```text
attendance_rules
employee_attendance_rule_history
```

---

## 13. 推荐执行顺序

```text
1. 新增 attendance_config 类型、API、数据库迁移
2. 修改服务端考勤计算，统一读 attendance_config
3. 修改 attendance calculation 返回字段，加入当天费用
4. 修改员工 API，移除规则字段依赖
5. 修改前端员工管理，移除规则字段和规则历史
6. 修改前端考勤计算页，接全局设置弹窗和 v2 表格
7. 修改薪资模块，按 v2 月度考勤费用汇总
8. 修改 bootstrap 初始化逻辑
9. 删除考勤规则页面和相关 API
10. 全量测试员工、考勤、薪资、导出
11. 稳定后 drop 旧规则表和字段
```

---

## 14. 最终完成判定

完成后应满足：

```text
后台没有考勤规则列表页
员工档案没有考勤规则选择
员工详情没有规则历史
考勤计算页只有一个“设置规则”入口
所有员工共用同一套规则
调整只调整某员工某天考勤记录
缺勤自动由无记录产生
休假自动由员工状态或记录类型产生
考勤页直接展示上班费用、加班费用、合计费用
导出字段与 v2 一致
薪资结果按 v2 轻量考勤口径汇总
```

一句话目标：

```text
把正式后台考勤从“多规则企业考勤系统”重构为“v2 轻量全局规则考勤计算表”。
```
