# wmshr-admin 字段差异分析文档

## 1. 文档目标

本文档用于对比 `wmshr-admin` 当前代码中的字段结构与项目一级目录业务文档中的字段规划，明确当前已有字段、缺失字段、字段冲突和后续改造优先级。

对比依据：

- 业务文档：`/Users/admin/Desktop/project/wmshr/wmshr-admin-business-flow-data-relations.md`
- 当前代码：`/Users/admin/Desktop/project/wmshr/wmshr-admin/src`

本次只做字段对比和差异分析，不涉及代码修改。

---

## 2. 总体结论

当前代码仍是“单一全局规则 + 员工时薪 + 简单考勤记录 + 即时薪资计算”的原型结构。

业务文档已经升级为真实业务系统设计，要求：

- 员工关联唯一当前考勤规则。
- 员工规则变更要保留历史。
- 考勤规则需要生效时间。
- 考勤计算要按考勤日期匹配历史有效规则。
- 固定工资和时薪二选一。
- 薪资周期按自然月。
- 补贴、扣款、其他为当前自然月一次性输入。
- 薪资结果需要可追溯明细。

因此，当前代码字段与业务文档字段差异较大，后续需要做一次数据模型升级。

---

## 3. 当前代码字段来源

当前字段主要来自以下文件：

- `src/types.ts`
- `src/constants.ts`
- `src/components/EmployeeList.tsx`
- `src/components/Modals.tsx`
- `src/components/AttendanceTable.tsx`
- `src/components/PayrollTable.tsx`
- `src/lib/utils.ts`

---

# 4. 员工管理模块字段对比

## 4.1 当前代码已有字段

当前 `Employee`：

```ts
export interface Employee {
  id: number;
  name: string;
  gender: Gender;
  country: CountryCode;
  role: string;
  dept: string;
  hourlyRate: number;
  currency: CurrencyCode;
  joinDate: string;
  status: EmployeeStatus;
  photo: string | null;
}
```

当前员工状态：

```ts
export type EmployeeStatus = '在职' | '休假';
```

当前页面实际使用字段：

- `id`
- `name`
- `gender`
- `country`
- `role`
- `dept`
- `hourlyRate`
- `currency`
- `joinDate`
- `status`
- `photo`

## 4.2 业务文档要求字段

业务文档中的 `Employee` 建议包含：

- 员工 ID
- 员工编号
- 姓名
- 性别
- 国家/地区
- 部门
- 岗位
- 入职日期
- 联系方式
- 员工状态
- 当前考勤规则 ID
- 计薪方式
- 固定工资金额
- 时薪金额
- 币种
- 照片/头像

## 4.3 已匹配字段

当前已有且可继续沿用：

- `id` → 员工 ID
- `name` → 姓名
- `gender` → 性别
- `country` → 国家/地区
- `dept` → 部门/区域
- `role` → 岗位
- `joinDate` → 入职日期
- `status` → 员工状态
- `currency` → 币种
- `photo` → 照片/头像
- `hourlyRate` → 时薪金额，但后续应与计薪方式绑定

## 4.4 当前缺失字段

员工管理缺失：

- 员工编号
- 联系方式
- 当前考勤规则 ID
- 计薪方式
- 固定工资金额
- 员工考勤规则变更历史
- 员工状态扩展

## 4.5 字段冲突与不一致

### 4.5.1 `hourlyRate` 目前是员工必填字段

当前员工只能按时薪：

```ts
hourlyRate: number;
```

但业务文档要求：

- 固定工资和时薪二选一。
- 不能默认所有员工都是时薪。

后续建议调整为：

```ts
salaryType: 'fixed' | 'hourly';
fixedSalary?: number;
hourlyRate?: number;
```

约束：

- `salaryType = fixed` 时，只使用 `fixedSalary`。
- `salaryType = hourly` 时，只使用 `hourlyRate`。

### 4.5.2 员工状态过少

当前只有：

- 在职
- 休假

真实业务需要支撑：

- 是否参与考勤
- 是否参与薪资
- 是否停用
- 是否离职

员工状态最终枚举仍需后续确认。

---

# 5. 考勤规则设置模块字段对比

## 5.1 当前代码已有字段

当前没有独立的 `AttendanceRule`，只有全局 `AppConfig`：

```ts
export interface AppConfig {
  startShift: string;
  endShift: string;
  breakStart: string;
  breakEnd: string;
  standardHours: number;
  otHourlyFee: number;
  overtimeMultiplier: number;
  taxRate: number;
  dailyBreakMinutes: number;
  currency: CurrencyCode;
}
```

当前默认配置：

```ts
export const INITIAL_CONFIG: AppConfig = {
  startShift: "08:30",
  endShift: "17:30",
  breakStart: "12:00",
  breakEnd: "13:00",
  standardHours: 8,
  otHourlyFee: 50,
  overtimeMultiplier: 1.5,
  taxRate: 0.05,
  dailyBreakMinutes: 60,
  currency: 'THB'
};
```

当前设置弹窗实际展示字段：

- 上班时间：`startShift`
- 下班时间：`endShift`
- 午休开始：`breakStart`
- 午休结束：`breakEnd`
- 加班费标准：`otHourlyFee`

说明：

- `standardHours`、`overtimeMultiplier`、`taxRate`、`dailyBreakMinutes`、`currency` 在类型和默认值里存在。
- 但设置弹窗目前没有完整展示这些字段。

## 5.2 业务文档要求字段

业务文档中的 `AttendanceRule` 建议包含：

- 规则 ID
- 规则名称
- 是否启用
- 生效开始时间
- 生效结束时间，可选
- 上班时间
- 下班时间
- 休息开始时间
- 休息结束时间
- 标准工时
- 是否启用加班
- 加班最小计量单位：0.5 小时
- 加班取整方式：向下取整到 0.5 小时
- 迟到规则，待确认
- 早退规则，待确认
- 缺勤规则，待确认

## 5.3 已匹配字段

当前已有且可迁移到 `AttendanceRule`：

- `startShift` → 上班时间
- `endShift` → 下班时间
- `breakStart` → 休息开始时间
- `breakEnd` → 休息结束时间
- `standardHours` → 标准工时
- `otHourlyFee` → 加班费标准/加班费率

## 5.4 当前缺失字段

考勤规则缺失：

- 规则 ID
- 规则名称
- 是否启用
- 生效开始时间
- 生效结束时间
- 是否启用加班
- 加班最小计量单位
- 加班取整方式
- 迟到规则
- 早退规则
- 缺勤规则

## 5.5 字段冲突与不一致

### 5.5.1 当前是全局规则，不是多规则

当前 `config` 是全局状态：

```ts
const [config, setConfig] = useState<AppConfig>(INITIAL_CONFIG);
```

所有员工共用同一套规则。

但业务文档要求：

- 员工当前只关联一个考勤规则。
- 员工可以更换考勤规则。
- 历史规则需要保留。
- 考勤按日期匹配当时有效规则。

后续需要从：

```ts
AppConfig
```

升级为：

```ts
AttendanceRule[];
Employee.attendanceRuleId;
EmployeeAttendanceRuleHistory[];
```

### 5.5.2 `overtimeMultiplier` 与业务文档规则冲突或待处理

当前有：

```ts
overtimeMultiplier: number;
```

但业务文档已确认加班费按小时费用计算，不是倍率制。

当前实际薪资计算也没有使用 `overtimeMultiplier`，而是使用：

```ts
otPay += d.ot * config.otHourlyFee;
```

后续建议：

- 删除，或
- 暂时保留但不参与真实业务，或
- 作为未来扩展字段，不在本轮实现。

### 5.5.3 `taxRate` 在当前代码中使用，但业务文档没有纳入确认规则

当前薪资核算使用：

```ts
net = gross * (1 - config.taxRate);
```

但业务文档当前薪资规则没有确认税率，只确认了：

- 固定工资
- 时薪
- 加班费
- 补贴
- 扣款
- 其他
- 自然月

所以 `taxRate` 是当前代码已有但业务文档未确认的字段。

后续处理建议：

- 作为“扣款”的一种处理，不单独作为全局规则；或
- 作为待确认规则；或
- 本轮移出真实业务计算。

### 5.5.4 `dailyBreakMinutes` 与 `breakStart/breakEnd` 重复

当前有：

- `breakStart`
- `breakEnd`
- `dailyBreakMinutes`

实际计算中使用 `breakStart/breakEnd` 算重叠休息时长，并没有直接使用 `dailyBreakMinutes`。

因此 `dailyBreakMinutes` 目前更像展示字段，不是核心计算字段。

---

# 6. 考勤计算模块字段对比

## 6.1 当前代码已有字段

当前 `AttendanceRecord`：

```ts
export interface AttendanceRecord {
  id: string;
  empId: number;
  date: string;
  inTime: string;
  outTime: string;
  type: AttendanceType;
  note: string;
}
```

当前 `AttendanceType`：

```ts
export type AttendanceType = 'normal' | 'late' | 'early' | 'absent' | 'leave' | 'overtime';
```

当前计算结果 `AttendanceDetails`：

```ts
export interface AttendanceDetails {
  raw: number;
  valid: number;
  standard: number;
  ot: number;
}
```

当前计算函数：

```ts
calcAttendanceDetails(rec, config)
```

返回：

- `raw`
- `valid`
- `standard`
- `ot`

## 6.2 业务文档要求字段

业务文档中的 `AttendanceRecord` 建议包含：

- 考勤记录 ID
- 员工 ID
- 考勤日期
- 上班打卡时间
- 下班打卡时间
- 考勤来源
- 备注

业务文档中的 `AttendanceCalculationResult` 建议包含：

- 结果 ID
- 员工 ID
- 考勤日期
- 使用的考勤规则 ID
- 原始上班时间
- 原始下班时间
- 原始工时
- 休息扣除时长
- 有效工时
- 标准工时
- 加班原始时长
- 加班计薪时长
- 考勤状态
- 异常标记
- 异常原因

业务文档中的 `MonthlyAttendanceSummary` 建议包含：

- 汇总 ID
- 员工 ID
- 年月
- 自然月开始日期
- 自然月结束日期
- 总有效工时
- 总标准工时
- 总加班计薪时长
- 迟到次数，规则待确认
- 早退次数，规则待确认
- 缺勤次数，规则待确认
- 异常记录数量
- 是否可进入薪资核算

## 6.3 已匹配字段

当前 `AttendanceRecord` 已匹配：

- `id` → 考勤记录 ID
- `empId` → 员工 ID
- `date` → 考勤日期
- `inTime` → 上班打卡时间
- `outTime` → 下班打卡时间
- `note` → 备注

当前 `AttendanceDetails` 已匹配部分计算字段：

- `raw` → 原始工时
- `valid` → 有效工时
- `standard` → 标准工时
- `ot` → 当前加班时长

## 6.4 当前缺失字段

原始考勤记录缺失：

- 考勤来源

单日考勤计算结果缺失：

- 结果 ID
- 使用的考勤规则 ID
- 原始上班时间
- 原始下班时间
- 休息扣除时长
- 加班原始时长
- 加班计薪时长
- 考勤状态
- 异常标记
- 异常原因

自然月汇总缺失：

- 汇总 ID
- 年月
- 自然月开始日期
- 自然月结束日期
- 总有效工时
- 总标准工时
- 总加班计薪时长
- 迟到次数
- 早退次数
- 缺勤次数
- 异常记录数量
- 是否可进入薪资核算

员工规则历史缺失：

- `EmployeeAttendanceRuleHistory` 整个对象目前不存在。

## 6.5 字段冲突与不一致

### 6.5.1 当前考勤计算使用全局规则

当前：

```ts
calcAttendanceDetails(rec, config)
```

只接受一条全局 `config`。

业务文档要求：

```text
AttendanceRecord + EmployeeAttendanceRuleHistory + AttendanceRule = AttendanceCalculationResult
```

后续计算函数不能只接收全局配置，而应按：

- 员工 ID
- 考勤日期
- 员工规则历史
- 考勤规则集合

找到当天有效规则后再计算。

### 6.5.2 当前加班未按 0.5 小时向下取整

当前：

```ts
const ot = Math.max(0, valid - config.standardHours);
```

例如：

- 0.9 小时加班会显示 0.9。
- 1.2 小时加班会显示 1.2。

但业务文档确认规则是：

- 0.9 → 0.5
- 1.2 → 1.0
- 1.9 → 1.5

后续需要区分：

- `overtimeRawHours`
- `overtimePayableHours`

当前只有一个 `ot`，不够。

### 6.5.3 当前 `type` 是人工/记录字段，但文档更偏向计算结果字段

当前 `AttendanceRecord.type` 直接存：

- 正常
- 迟到
- 早退
- 缺勤
- 假期
- 加班

但文档中“考勤状态”更适合出现在 `AttendanceCalculationResult`。

后续建议：

- 原始记录保留原始打卡数据。
- `type/status` 作为计算结果。
- 如果需要人工调整，则增加调整来源/人工状态字段，避免原始记录和计算结果混在一起。

---

# 7. 薪资核算模块字段对比

## 7.1 当前代码已有字段

当前 `PayrollSummary`：

```ts
export interface PayrollSummary {
  emp: Employee;
  valid: number;
  ot: number;
  basePay: number;
  otPay: number;
  gross: number;
  net: number;
}
```

当前薪资计算逻辑：

```ts
const basePay = (valid - ot) * emp.hourlyRate;
const gross = basePay + otPay;
const net = gross * (1 - config.taxRate);
```

当前薪资页面展示：

- 员工
- 有效总工时
- 加班总时长
- 基础薪资
- 加班费用
- 税后实发

## 7.2 业务文档要求字段

业务文档中的 `SalaryProfile` 建议包含：

- 员工 ID
- 计薪方式
  - 固定工资
  - 时薪
- 固定工资金额
- 时薪金额
- 币种

业务文档中的 `SalaryAdjustmentItem` 建议包含：

- 项目 ID
- 员工 ID
- 年月
- 项目类型
  - 补贴
  - 扣款
  - 其他
- 项目名称
- 金额
- 备注
- 创建时间

业务文档中的 `MonthlyPayrollResult` 建议包含：

- 薪资结果 ID
- 员工 ID
- 年月
- 计薪方式
- 固定工资金额
- 时薪金额
- 有效工时
- 时薪工资
- 加班计薪时长
- 加班费
- 补贴合计
- 扣款合计
- 其他合计
- 应发金额
- 扣款金额
- 实发金额
- 币种
- 计算状态
- 核对状态

## 7.3 已匹配字段

当前 `PayrollSummary` 已匹配一部分：

- `emp` → 员工信息
- `valid` → 有效工时
- `ot` → 加班时长，但不是文档要求的加班计薪时长
- `basePay` → 基础工资
- `otPay` → 加班费
- `gross` → 应发金额，接近但当前不含补贴/其他
- `net` → 实发金额，当前按税率扣除

## 7.4 当前缺失字段

薪资基础配置缺失：

- `SalaryProfile`
- 计薪方式
- 固定工资金额
- 时薪金额与固定工资互斥规则

一次性薪资项缺失：

- `SalaryAdjustmentItem`
- 年月
- 项目类型
- 项目名称
- 金额
- 备注
- 创建时间

自然月薪资结果缺失：

- 薪资结果 ID
- 员工 ID
- 年月
- 固定工资金额
- 时薪金额
- 时薪工资
- 加班计薪时长
- 补贴合计
- 扣款合计
- 其他合计
- 扣款金额
- 币种，当前从员工拿，但结果中没有固化
- 计算状态
- 核对状态

## 7.5 字段冲突与不一致

### 7.5.1 当前薪资只支持时薪

当前：

```ts
basePay = (valid - ot) * emp.hourlyRate;
```

业务文档要求：

- 固定工资
- 时薪
- 二选一

所以当前薪资模型不能支撑固定工资员工。

### 7.5.2 当前基础工资计算扣除了加班时长

当前：

```ts
basePay = (valid - ot) * emp.hourlyRate;
```

这表示：

```text
基础工资 = 非加班有效工时 × 时薪
```

业务文档中时薪规则是：

```text
基础工资 = 自然月有效工时 × 时薪
```

这里需要后续确认实现口径：

- 如果“有效工时”已经包含加班，那么再加加班费会重复。
- 如果“基础工资”只算标准工时，那么文档里的“自然月有效工时 × 时薪”需要改成“自然月标准内有效工时 × 时薪”。

当前代码实际上采用的是：

```text
标准内有效工时工资 + 加班费
```

这与业务文档描述存在口径差异，建议在下一版文档里明确。

### 7.5.3 当前有税率扣除，业务文档没有确认

当前：

```ts
net = gross * (1 - config.taxRate);
```

但业务文档没有把税率纳入确认规则。

如果真实业务暂时只做：

- 补贴
- 扣款
- 其他

则 `taxRate` 应先从核心薪资规则中移出，或作为“扣款项”录入。

---

# 8. 对象级缺失清单

## 8.1 需要新增的核心对象

根据业务文档，对比当前代码，以下对象当前不存在：

- `AttendanceRule`
- `EmployeeAttendanceRuleHistory`
- `AttendanceCalculationResult`
- `MonthlyAttendanceSummary`
- `SalaryProfile`
- `SalaryAdjustmentItem`
- `MonthlyPayrollResult`

## 8.2 当前已有但需要升级的对象

### 8.2.1 `Employee`

需要从：

```text
员工基础信息 + 时薪
```

升级为：

```text
员工基础信息 + 当前考勤规则 + 规则历史 + 计薪方式 + 固定工资/时薪
```

### 8.2.2 `AppConfig`

需要拆分/迁移为：

```text
AttendanceRule
```

其中部分字段可迁移，部分字段需删除或待确认。

### 8.2.3 `AttendanceRecord`

需要从：

```text
原始记录 + 考勤类型
```

调整为：

```text
原始打卡记录
```

并把计算状态转移到：

```text
AttendanceCalculationResult
```

### 8.2.4 `PayrollSummary`

需要从页面即时汇总对象升级为：

```text
MonthlyPayrollResult
```

---

# 9. 当前最关键差异点

最关键的 5 个差异是：

## 9.1 当前没有独立考勤规则对象

当前只有全局 `AppConfig`，业务文档要求 `AttendanceRule`。

影响：

- 考勤规则无法多套并存。
- 员工无法关联规则。
- 历史规则无法追溯。

## 9.2 当前员工没有关联考勤规则

当前没有：

- `attendanceRuleId`
- `EmployeeAttendanceRuleHistory`

影响：

- 无法按员工规则计算考勤。
- 无法按考勤日期匹配历史有效规则。

## 9.3 当前薪资只支持时薪

当前没有：

- 固定工资
- 计薪方式二选一

影响：

- 无法支持固定工资员工。
- 无法满足真实薪资核算要求。

## 9.4 当前加班没有按 0.5 小时向下取整

当前直接使用原始加班小时。

影响：

- 与已确认业务规则不一致。
- 需要区分原始加班时长和计薪加班时长。

## 9.5 当前没有自然月薪资项和薪资结果对象

当前没有：

- 补贴
- 扣款
- 其他
- 月度薪资结果
- 核对状态

影响：

- 无法生成可追溯的自然月薪资结果。
- 不利于后期接口对接。

---

# 10. 改造优先级建议

## 10.1 第一优先级：统一数据模型

原因：当前字段结构和业务文档差距最大，先不统一模型，后面页面改造会反复返工。

需要先规划这些类型：

- `AttendanceRule`
- `EmployeeAttendanceRuleHistory`
- `SalaryProfile`
- `SalaryAdjustmentItem`
- `AttendanceCalculationResult`
- `MonthlyAttendanceSummary`
- `MonthlyPayrollResult`

## 10.2 第二优先级：员工管理字段升级

重点补齐：

- 员工编号
- 联系方式
- 当前考勤规则 ID
- 计薪方式
- 固定工资金额
- 时薪金额
- 员工状态扩展

## 10.3 第三优先级：考勤规则从全局配置升级为规则列表

重点补齐：

- 规则 ID
- 规则名称
- 启用状态
- 生效开始时间
- 生效结束时间
- 加班取整规则

## 10.4 第四优先级：考勤计算拆出结果对象

从当前：

```text
AttendanceRecord → 直接展示计算结果
```

升级为：

```text
AttendanceRecord → AttendanceCalculationResult → MonthlyAttendanceSummary
```

## 10.5 第五优先级：薪资核算升级为自然月结果

重点补齐：

- 固定工资/时薪二选一
- 一次性补贴
- 一次性扣款
- 一次性其他
- 月度薪资结果
- 核对状态

---

# 11. 推荐下一步

建议下一步输出：

**《字段差异改造任务清单》**

把上述差异拆成可执行任务，例如：

1. 定义新类型结构。
2. 升级员工字段。
3. 拆出考勤规则对象。
4. 增加员工规则历史。
5. 拆出考勤计算结果。
6. 增加自然月汇总。
7. 增加薪资基础配置。
8. 增加一次性薪资项。
9. 增加月度薪资结果。
10. 调整页面展示字段。

这样可以先明确“要改哪些字段、影响哪些页面、验收标准是什么”，再进入代码修改。
