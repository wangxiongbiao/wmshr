# WMSHR V4 服务前后端对接 API 规范文档

> **版本号**: 4.0.0 (Production Ready)  
> **适用对象**: Flutter 移动端（Android / iOS / Web / Desktop）、Admin 管理端前端研发团队、后端服务开发团队、QA 自动化测试及第三方集成方  
> **文档维护状态**: 活跃更新 (基于 Server-V4 微服务架构全量实装与绿灯验证)  
> **更新时间**: 2026-09-23  

---

## 目录 (Table of Contents)

1. [全局规范与通信协议](#一全局规范与通信协议)
   - 1.1 服务基准与网络地址
   - 1.2 双轨 Token 认证体系
   - 1.3 统一响应体规范 (Response Envelope)
   - 1.4 全局 HTTP 状态码与业务错误码
   - 1.5 租户隔离与安全沙箱机制
   - 1.6 路由别名与无缝升级兼容
2. [核心业务流转时序图](#二核心业务流转时序图)
   - 2.1 移动端员工身份认证与鉴权流
   - 2.2 移动考勤定位打卡与地理围栏算法
   - 2.3 月度薪资“核算 -> 审批 -> 确认发放 -> 员工电子签名”全流程
   - 2.4 费用报销“员工提交 -> 票据上传 -> 管理审核 -> 财务打款”流
   - 2.5 规程培训与全员安全承诺签署流
3. [员工移动端专有接口组 (/api/v4/mobile/*)](#三员工移动端专有接口组-apiv4mobile)
   - 3.1 移动端身份鉴权 (登录 / 个人画像)
   - 3.2 移动考勤与打卡记录 (考勤日历 / 上班打卡 / 下班打卡)
   - 3.3 请假单申请与历史追踪
   - 3.4 薪资条查询与电子手写签名
   - 3.5 费用报销提单与撤回
   - 3.6 规程培训学习与强制阅读确认 (SOP)
4. [管理端后台控制接口组 (/api/v4/admin/*)](#四管理端后台控制接口组-apiv4admin)
   - 4.1 租户与管理员认证 (注册开户 / 登录 / 资料)
   - 4.2 员工档案全生命周期管理 (花名册 / 录入 / 编辑 / 离职 / 密码重置)
   - 4.3 考勤基准与规则配置 (GPS 坐标围栏 / 全员打卡流水 / 审批请假)
   - 4.4 财务发票台账管理 (统计指标 / 流水明细 / 录入发票)
   - 4.5 月度薪资大盘与核算发布 (全员台账 / 自动核算初稿 / 审核 / **确认发放**)
   - 4.6 费用报销审核大盘 (报销单全景 / 审批通过 / 驳回 / 财务已打款)
   - 4.7 SOP 规程管理中心 (图文与多附件发布 / 状态维护 / 阅读率追踪)
5. [Flutter 通用 REST 资源与状态引擎](#五flutter-通用-rest-资源与状态引擎)
   - 5.1 通用资源架构设计背景 (ApiResourceClient 映射)
   - 5.2 资源字典与数据表映射表
   - 5.3 标准 REST 协议规范 (GET / POST / PATCH / DELETE)
   - 5.4 键值状态热同步引擎 (/api/v4/state/:key)
6. [联调指南、测试用例与 FAQ](#六联调指南测试用例与-faq)
   - 6.1 联调环境测试账号与 Token 获取
   - 6.2 常用接口 cURL 调试样例
   - 6.3 常见对接踩坑与排查手册 (FAQ)

---

## 一、全局规范与通信协议

### 1.1 服务基准与网络地址
- **通信协议**: HTTP / 1.1 与 HTTPS (生产环境强制启用 TLS 1.3 加密传输)
- **数据交互格式**: 请求体与响应体正文均强制使用 `application/json; charset=utf-8`
- **微服务基准端口**: `8789`
- **Base URL 环境区分**:
  - 本地开发环境 (Dev): `http://127.0.0.1:8789/api/v4`
  - 测试联调环境 (Staging): `https://staging-api.wmshr.internal/api/v4`
  - 生产发布环境 (Prod): `https://api.wmshr.com/api/v4`
  - *注：服务内置了路由兼容层，访问 `http://127.0.0.1:8789/api` 与 `/api/v4` 完全等价。*

### 1.2 双轨 Token 认证体系
系统对「企业管理员」与「移动端员工」实行严格的双轨 JWT 鉴权隔离机制，两套 Token 签名互不串用，杜绝越权访问：

| 客户端终端 | 签发接口 | Token 载荷核心字段 (Payload) | 请求 Header 规范 |
| :--- | :--- | :--- | :--- |
| **移动端员工 (Flutter)** | `POST /api/v4/mobile/auth/login` | `stage: "employee_authenticated"`<br>`employeeId: <int>`<br>`ownerUserId: "<uuid>"`<br>`account: "<str>"`<br>`role: "<str>"` | `Authorization: Bearer <employee_token>` |
| **管理端后台 (Admin)** | `POST /api/v4/admin/auth/login` | `stage: "authenticated"`<br>`sub: "<uuid>"`<br>`ownerUserId: "<uuid>"`<br>`email: "<str>"`<br>`permissions: ["*"]` | `Authorization: Bearer <admin_token>` |

- **Token 传递方式**: 客户端每次发起受保护请求时，必须在 HTTP Headers 中附带：
  ```http
  Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
  ```
- **有效期与生命周期**: 默认 Token 有效期为 7 天。在客户端长期处于活跃状态下，建议定期更新本地持久化缓存。

### 1.3 统一响应体规范 (Response Envelope)
所有业务响应均统一采用封装格式，避免客户端针对不同模块编写差异化的解析逻辑。

#### 1.3.1 成功响应格式 (HTTP 200 / 201)
```json
{
  "success": true,
  "code": 200,
  "message": "操作成功",
  "data": { ... }
}
```
- `success`: (boolean) 标识业务逻辑执行是否成功。
- `code`: (integer) 业务状态码，通常与 HTTP 状态码保持同步 (200 / 201)。
- `message`: (string) 人类可读的操作提示文本（可直接用于移动端 Toast 或弹窗提示）。
- `data`: (object | array | null) 具体的业务数据载荷。

#### 1.3.2 失败响应格式 (HTTP 4xx / 5xx)
```json
{
  "success": false,
  "code": 400,
  "error": "参数校验失败：打卡经纬度不能为空",
  "message": "参数校验失败：打卡经纬度不能为空"
}
```
- `error` 与 `message`: 错误原因简述，便于排查与展示给最终用户。

### 1.4 全局 HTTP 状态码与业务错误码
| HTTP 状态码 | 业务 Code | 状态说明 | 客户端标准处置动作 |
| :--- | :--- | :--- | :--- |
| **200 OK** | 200 | 请求成功，业务正常处理完毕 | 正常消费 `data` 结构体 |
| **201 Created** | 201 | 资源创建成功 (如打卡、提交申请、录入员工) | 提示成功并刷新列表视图 |
| **400 Bad Request** | 400 | 请求入参缺失、校验未通过或格式非法 | 弹窗或 Toast 提示 `error` 内容 |
| **401 Unauthorized** | 401 | 未携带 Token、Token 已过期或签名非法 | 清空本地 Token，重定向至登录页面 |
| **403 Forbidden** | 403 | 角色权限不足或试图越界访问租户数据 | 提示无权访问，阻断非法操作 |
| **404 Not Found** | 404 | 请求资源不存在或已被级联删除 | 提示资源不存在，返回上一级界面 |
| **409 Conflict** | 409 | 业务状态冲突 (如重复打卡、已签收工资条重复签署) | 提示当前状态冲突并重新加载数据 |
| **500 Internal Error** | 500 | 后端服务异常或数据库异常中断 | 友好提示“服务开小差了，请稍后重试” |

### 1.5 租户隔离与安全沙箱机制
- **数据隔离基准**: 所有业务实体数据均深度绑定 `owner_user_id`（即租户主键）。
- **后端自动注入**: 前端在发起请求时**严禁**随意传递或修改 `ownerUserId`。网关与鉴权中间件会自动解析有效 Token，并在数据库查询与写入中强制挂载当前合法绑定的 `ownerUserId`，从协议底层根除水平越权与越界篡改风险。

### 1.6 路由别名与无缝升级兼容
为确保已发布的 Flutter 历史版本与第三方服务无感知平滑过渡，V4 服务层已内置了全局路由等价映射：
- `/api/v4/mobile/*`  <===>  `/api/mobile/*` (完全等价)
- `/api/v4/admin/*`   <===>  `/api/admin/*` (完全等价)
- `/api/v4/resources/*` <===> `/api/resources/*` (完全等价)
- `/api/v4/state/*`     <===> `/api/state/*` (完全等价)

## 二、核心业务流转时序图

### 2.1 移动端员工身份认证与鉴权流
```mermaid
sequenceDiagram
    autonumber
    actor Employee as "员工 (Flutter App)"
    participant Gateway as "V4 API 网关"
    participant MobileRouter as "移动端认证模块"
    participant DB as "数据库 (Employees/Accounts)"
    
    Employee->>Gateway: POST /api/v4/mobile/auth/login { account, password }
    Gateway->>MobileRouter: 验证参数格式非空
    MobileRouter->>DB: 查询员工档案与密码哈希
    alt 账号或密码错误
      DB-->>MobileRouter: 校验失败
      MobileRouter-->>Employee: 401 Unauthorized { success: false, error: "账号或密码错误" }
    else 验证通过
      DB-->>MobileRouter: 返回员工基础档案
      MobileRouter->>MobileRouter: 签发 7 天有效期的 Employee JWT
      MobileRouter-->>Employee: 200 OK { success: true, data: { token, employee } }
      Employee->>Employee: 本地安全加密存储 Token 与员工上下文
    end
    
    Note over Employee,Gateway: 后续所有受保护接口交互
    Employee->>Gateway: 请求头附加 Authorization: Bearer <token>
    Gateway->>MobileRouter: requireMobileAuth 中间件验签
    MobileRouter->>MobileRouter: 校验通过，挂载 req.mobileAuth 上下文
```

### 2.2 移动考勤定位打卡与地理围栏算法
```mermaid
sequenceDiagram
    autonumber
    actor Employee as "员工 (Flutter App)"
    participant Gateway as "V4 API 网关"
    participant DB as "数据库 (Attendance)"
    
    Employee->>Employee: 获取当前 GPS 经纬度与定位精度 (lat, lng)
    Employee->>Gateway: POST /api/v4/mobile/attendance/check-in { lat, lng, distance, deviated }
    Gateway->>DB: 查询当前租户配置的基准点坐标与允许半径 (例如 500 米)
    alt 距离超出安全范围 (distance > radius)
      Gateway->>Gateway: 自动标记 deviated=true，记录偏差告警 note
    else 处于有效范围内
      Gateway->>Gateway: 标记 deviated=false，正常出勤
    end
    Gateway->>DB: 写入当日打卡考勤流水 (attendance_records)
    Gateway-->>Employee: 200 OK { success: true, message: "上班打卡成功", data: { record } }
```

### 2.3 月度薪资“核算 -> 审批 -> 确认发放 -> 员工电子签名”全流程闭环
```mermaid
sequenceDiagram
    autonumber
    actor Admin as "财务/人事管理员 (Web)"
    participant Gateway as "V4 薪酬引擎"
    actor Employee as "员工 (Flutter App)"
    
    Admin->>Gateway: POST /api/v4/admin/payroll-results/generate-monthly { yearMonth: "2026-09" }
    Gateway->>Gateway: 自动聚合全员考勤工时、加班时数、请假扣减与基本时薪，计算全员工资
    Gateway-->>Admin: 返回生成结果，状态 draft (草稿状态，移动端员工不可见)
    
    Admin->>Gateway: PATCH /api/v4/admin/payroll-results/:id/approve
    Gateway->>Gateway: 财务复核通过，状态标记为 approved (内部审批流)
    
    Admin->>Gateway: PATCH /api/v4/admin/payroll-results/:id/confirm
    Gateway->>Gateway: ★确认发放并归档，状态置为 confirmed (正式解锁员工端可见权限)
    Gateway-->>Admin: 200 OK { success: true, message: "薪资结果已确认发放" }
    
    Employee->>Gateway: GET /api/v4/mobile/payroll-results?yearMonth=2026-09
    Gateway-->>Employee: 成功返回已确认发放的工资条明细及待签收状态
    
    Employee->>Employee: 在 Flutter 签名板上手写签名并导出 Base64 PNG
    Employee->>Gateway: POST /api/v4/mobile/payroll-results/:id/sign-off { signatureValue }
    Gateway->>Gateway: 持久化电子签名快照与签收时间戳
    Gateway-->>Employee: 200 OK { success: true, message: "工资条签收成功" }
    
    Admin->>Gateway: GET /api/v4/admin/payroll-results/:id
    Gateway-->>Admin: 管理端可实时查验员工已签署状态及签名笔迹原图
```

### 2.4 费用报销单“员工提交 -> 凭证上传 -> 管理审核 -> 财务打款”流
```mermaid
sequenceDiagram
    autonumber
    actor Employee as "员工 (Flutter App)"
    participant Gateway as "V4 API 网关"
    actor Admin as "财务审核员 (Web)"
    
    Employee->>Gateway: POST /api/v4/mobile/expenses { category, amount, description, attachments }
    Gateway->>Gateway: 校验类目与金额，状态初始化为 pending
    Gateway-->>Employee: 201 Created { success: true, data: { id, status: "pending" } }
    
    Admin->>Gateway: GET /api/v4/admin/expenses
    Gateway-->>Admin: 返回报销单大盘，附带员工工号、部门、姓名及凭证附件
    
    alt 审核驳回
      Admin->>Gateway: PUT /api/v4/admin/expenses/:id { status: "rejected", approvalNote: "发票抬头不规范" }
      Gateway-->>Admin: 200 OK { success: true, message: "报销审批成功" }
    else 审核通过并打款
      Admin->>Gateway: PUT /api/v4/admin/expenses/:id { status: "approved", approvalNote: "审核通过" }
      Gateway-->>Admin: 200 OK
      Admin->>Gateway: PUT /api/v4/admin/expenses/:id { status: "paid" }
      Gateway-->>Admin: 200 OK (财务打款完成)
    end
    
    Employee->>Gateway: GET /api/v4/mobile/expenses
    Gateway-->>Employee: 员工端同步获取最新流转状态与审核批注
```

### 2.5 规程培训与全员安全承诺签署流
```mermaid
sequenceDiagram
    autonumber
    actor Admin as "管理员 (Web)"
    participant Gateway as "V4 API 网关"
    actor Employee as "员工 (Flutter App)"
    
    Admin->>Gateway: POST /api/v4/admin/sops { title, category, contentHtml, mustRead: true, attachments }
    Gateway->>Gateway: 规程持久化入库，状态置为 published
    Gateway-->>Admin: 201 Created
    
    Employee->>Gateway: GET /api/v4/mobile/sop-documents
    Gateway-->>Employee: 返回列表 (标识 mustRead: true，高亮未读规程)
    
    Employee->>Gateway: GET /api/v4/mobile/sop-documents/:id
    Gateway-->>Employee: 完整下发图文 HTML 规程与附件下载链接
    
    Employee->>Gateway: POST /api/v4/mobile/sop-documents/:id/read
    Gateway->>Gateway: 记录该员工在 sop_reads 的已读时间戳及签署承诺
    Gateway-->>Employee: 200 OK { success: true, message: "已完成阅读与承诺签署" }
    
    Admin->>Gateway: GET /api/v4/admin/sops/:id/readers
    Gateway-->>Admin: 返回各部门员工阅读率、已读名单及未读名单
```

## 三、员工移动端专有接口组 (/api/v4/mobile/*)

### 3.1 移动端身份鉴权

#### 3.1.1 员工登录 (Login)
- **请求方式**: `POST`
- **接口路径**: `/api/v4/mobile/auth/login` (兼容别名: `/api/mobile/auth/login`)
- **鉴权类型**: 公开访问
- **接口说明**: 员工输入工号、账号或手机号，以及登录密码进行凭证认证。
- **请求体 (Request Body)**:
  | 字段名 | 类型 | 必填 | 示例值 | 说明 |
  | :--- | :--- | :--- | :--- | :--- |
  | `account` | string | 是 | `"wms0004"` | 员工账号、工号 (employeeNo) 或注册手机号 |
  | `password` | string | 是 | `"123456"` | 员工登录密码 |
  | `tenantId` | string | 否 | `"14f3a54f-..."` | 多租户场景下所属租户 ID，若单租户或账号唯一可不传 |

- **请求示例**:
  ```json
  {
    "account": "wms0004",
    "password": "password123"
  }
  ```

- **成功响应 (200 OK)**:
  ```json
  {
    "success": true,
    "message": "登录成功",
    "data": {
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expiresIn": "7d",
      "employee": {
        "id": 4,
        "employeeNo": "wms0004",
        "name": "张三",
        "dept": "仓储部",
        "role": "拣货员",
        "phone": "13800138000",
        "currency": "CNY",
        "hourlyRate": 35.0,
        "status": "active"
      }
    }
  }
  ```

#### 3.1.2 获取当前登录员工资料 (Me)
- **请求方式**: `GET`
- **接口路径**: `/api/v4/mobile/auth/me`
- **鉴权类型**: `Bearer <employee_token>`
- **接口说明**: 用于 App 启动时或个人中心刷新展示员工岗位、时薪、入职时间及部门。
- **成功响应 (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "id": 4,
      "employeeNo": "wms0004",
      "name": "张三",
      "dept": "仓储部",
      "role": "拣货员",
      "phone": "13800138000",
      "joinDate": "2024-01-15",
      "currency": "CNY",
      "hourlyRate": 35.0,
      "status": "active"
    }
  }
  ```

---

### 3.2 移动考勤与打卡记录

#### 3.2.1 获取员工月度考勤流水 (Attendance Records)
- **请求方式**: `GET`
- **接口路径**: `/api/v4/mobile/attendance/records`
- **鉴权类型**: `Bearer <employee_token>`
- **Query 参数**:
  | 参数名 | 类型 | 必填 | 示例值 | 说明 |
  | :--- | :--- | :--- | :--- | :--- |
  | `month` | string | 是 | `"2026-09"` | 目标月份 (YYYY-MM) |
  | `empId` | string | 否 | `"4"` | 默认为当前登录员工，通常无需显式传参 |

- **成功响应 (200 OK)**:
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "rec_001",
        "empId": "4",
        "date": "2026-09-22",
        "inTime": "08:55",
        "outTime": "18:05",
        "workHours": 8.0,
        "otHours": 1.0,
        "status": "present",
        "deviated": false,
        "note": "正常打卡，距打卡点 120 米"
      }
    ]
  }
  ```

#### 3.2.2 上班打卡 (Check-in)
- **请求方式**: `POST`
- **接口路径**: `/api/v4/mobile/attendance/check-in`
- **鉴权类型**: `Bearer <employee_token>`
- **请求体 (Request Body)**:
  | 字段名 | 类型 | 必填 | 示例值 | 说明 |
  | :--- | :--- | :--- | :--- | :--- |
  | `timestamp` | string | 否 | `"2026-09-23T08:58:00.000Z"` | 打卡时刻 ISO 格式，默认取服务端当前时间 |
  | `lat` | number | 否 | `13.7563` | 当前设备 GPS 纬度 |
  | `lng` | number | 否 | `100.5018` | 当前设备 GPS 经度 |
  | `distance` | number | 否 | `320.5` | 距离公司打卡基准点距离 (米) |
  | `deviated` | boolean | 否 | `false` | 是否超出地理围栏偏差阈值 |
  | `note` | string | 否 | `"距公司 320 米"` | 打卡备注信息 |

- **成功响应 (200 OK)**:
  ```json
  {
    "success": true,
    "message": "上班打卡成功",
    "data": {
      "record": {
        "id": "rec_20260923_4",
        "empId": "4",
        "date": "2026-09-23",
        "inTime": "08:58",
        "outTime": null,
        "status": "present",
        "deviated": false
      }
    }
  }
  ```

#### 3.2.3 下班打卡 (Check-out)
- **请求方式**: `POST`
- **接口路径**: `/api/v4/mobile/attendance/check-out`
- **鉴权类型**: `Bearer <employee_token>`
- **接口说明**: 记录下班打卡时刻，后端根据上班打卡与标准工时（默认 8 小时）自动计算当日工时与加班时数。
- **请求示例**:
  ```json
  {
    "lat": 13.7563,
    "lng": 100.5018,
    "distance": 315.0,
    "deviated": false
  }
  ```

- **成功响应 (200 OK)**:
  ```json
  {
    "success": true,
    "message": "下班打卡成功",
    "data": {
      "record": {
        "id": "rec_20260923_4",
        "empId": "4",
        "date": "2026-09-23",
        "inTime": "08:58",
        "outTime": "18:02",
        "workHours": 8.0,
        "otHours": 0.0,
        "status": "present"
      }
    }
  }
  ```

---

### 3.3 请假单申请与历史追踪

#### 3.3.1 获取员工个人请假历史
- **请求方式**: `GET`
- **接口路径**: `/api/v4/mobile/attendance/leave/history`
- **鉴权类型**: `Bearer <employee_token>`
- **Query 参数**:
  | 参数名 | 类型 | 必填 | 示例值 | 说明 |
  | :--- | :--- | :--- | :--- | :--- |
  | `year` | string | 否 | `"2026"` | 目标年份，不填则默认查询近期全部 |

- **成功响应 (200 OK)**:
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "leave_101",
        "empId": "4",
        "type": "事假",
        "startDate": "2026-09-10",
        "endDate": "2026-09-11",
        "days": 2.0,
        "reason": "家中有事办理",
        "status": "approved",
        "submittedAt": "2026-09-08T10:00:00Z"
      }
    ]
  }
  ```

#### 3.3.2 提交请假申请 (Leave Request)
- **请求方式**: `POST`
- **接口路径**: `/api/v4/mobile/attendance/leave/request`
- **鉴权类型**: `Bearer <employee_token>`
- **请求体 (Request Body)**:
  | 字段名 | 类型 | 必填 | 示例值 | 说明 |
  | :--- | :--- | :--- | :--- | :--- |
  | `type` | string | 是 | `"病假"` | 请假类型 (病假 / 事假 / 年假 / 婚假 / 产假 / 调休) |
  | `startDate` | string | 是 | `"2026-09-25"` | 起始日期 (YYYY-MM-DD) |
  | `endDate` | string | 是 | `"2026-09-25"` | 截止日期 (YYYY-MM-DD) |
  | `days` | number | 是 | `1.0` | 请假天数 (支持 0.5 递进) |
  | `reason` | string | 是 | `"身体发热，去医院就医挂水"` | 请假事由详情 |

- **成功响应 (201 Created)**:
  ```json
  {
    "success": true,
    "message": "请假申请已提交",
    "data": {
      "id": "leave_102",
      "empId": "4",
      "status": "pending"
    }
  }
  ```

---

### 3.4 薪资条查询与电子手写签名

#### 3.4.1 获取已发布工资条列表
- **请求方式**: `GET`
- **接口路径**: `/api/v4/mobile/payroll-results`
- **鉴权类型**: `Bearer <employee_token>`
- **核心业务规则**: 仅返回管理端已经执行过 **确认发放 (`confirmed`)** 的月度薪资单，处于 `draft` 草稿或仅内部审核中的薪资单对员工端严格不可见。
- **Query 参数**:
  | 参数名 | 类型 | 必填 | 示例值 | 说明 |
  | :--- | :--- | :--- | :--- | :--- |
  | `yearMonth` | string | 否 | `"2026-08"` | 查询指定月份 (YYYY-MM) |

- **成功响应 (200 OK)**:
  ```json
  {
    "success": true,
    "data": [
      {
        "id": 501,
        "employeeId": 4,
        "yearMonth": "2026-08",
        "workingDays": 22,
        "netSalary": 8500.0,
        "currency": "CNY",
        "calculationStatus": "confirmed",
        "signed": true
      }
    ]
  }
  ```

#### 3.4.2 获取某月工资条详情
- **请求方式**: `GET`
- **接口路径**: `/api/v4/mobile/payroll-results/:id`
- **鉴权类型**: `Bearer <employee_token>`
- **成功响应 (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "result": {
        "id": 501,
        "employeeId": 4,
        "yearMonth": "2026-08",
        "workingDays": 22,
        "baseSalary": 7000.0,
        "overtimePay": 1200.0,
        "attendanceBonus": 300.0,
        "mealAllowance": 500.0,
        "taxDeduction": 300.0,
        "socialSecurityDeduction": 200.0,
        "netSalary": 8500.0,
        "currency": "CNY",
        "calculationStatus": "confirmed"
      },
      "employee": {
        "id": 4,
        "name": "张三",
        "dept": "仓储部",
        "role": "拣货员"
      },
      "signOff": {
        "signed": true,
        "signedAt": "2026-09-05T12:00:00Z",
        "signatureValue": "data:image/png;base64,iVBORw0KG..."
      }
    }
  }
  ```

#### 3.4.3 员工工资条签名签收 (Sign-off)
- **请求方式**: `POST`
- **接口路径**: `/api/v4/mobile/payroll-results/:id/sign-off`
- **鉴权类型**: `Bearer <employee_token>`
- **接口说明**: 员工核对当月明细无误后，通过触控板签署名字确认，锁定工资单存证。
- **请求体 (Request Body)**:
  | 字段名 | 类型 | 必填 | 示例值 | 说明 |
  | :--- | :--- | :--- | :--- | :--- |
  | `signatureValue` | string | 是 | `"data:image/png;base64,iVBORw0KG..."` | 签名图片的 Base64 Data URL |
  | `fileId` | string | 否 | `"storage_blob_001"` | 若已上传云存储，可传对应文件 ID |

- **成功响应 (200 OK)**:
  ```json
  {
    "success": true,
    "message": "工资条签收成功",
    "data": {
      "signed": true,
      "signedAt": "2026-09-23T10:15:00.000Z"
    }
  }
  ```

---

### 3.5 移动端费用报销

#### 3.5.1 获取个人报销单列表
- **请求方式**: `GET`
- **接口路径**: `/api/v4/mobile/expenses`
- **鉴权类型**: `Bearer <employee_token>`
- **Query 参数**:
  | 参数名 | 类型 | 必填 | 示例值 | 说明 |
  | :--- | :--- | :--- | :--- | :--- |
  | `status` | string | 否 | `"pending"` | 状态过滤: pending(待审), approved(通过), rejected(驳回), paid(已打款) |

- **成功响应 (200 OK)**:
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "exp_202609_001",
        "category": "物耗杂费",
        "amount": 180.5,
        "currency": "CNY",
        "description": "采购仓库打包胶带与防滑手套",
        "status": "pending",
        "date": "2026-09-20",
        "attachments": [
          "https://storage.wmshr.com/receipts/rec_01.jpg"
        ]
      }
    ]
  }
  ```

#### 3.5.2 提交报销申请
- **请求方式**: `POST`
- **接口路径**: `/api/v4/mobile/expenses`
- **鉴权类型**: `Bearer <employee_token>`
- **请求体 (Request Body)**:
  | 字段名 | 类型 | 必填 | 示例值 | 说明 |
  | :--- | :--- | :--- | :--- | :--- |
  | `category` | string | 是 | `"差旅费"` | 报销费用类目 |
  | `amount` | number | 是 | `450.0` | 报销金额 |
  | `currency` | string | 否 | `"CNY"` | 币种代码 (CNY / THB / USD)，默认根据员工币种自动填充 |
  | `description` | string | 是 | `"拜访华东分拨仓城际往返打车费"` | 费用说明与事由 |
  | `date` | string | 否 | `"2026-09-23"` | 费用发生日期，默认当天 |
  | `attachments` | array | 否 | `["data:image/jpeg;base64,..."]` | 发票/票据照片列表 (支持 Base64 或 URL) |

- **成功响应 (201 Created)**:
  ```json
  {
    "success": true,
    "message": "报销单提交成功",
    "data": {
      "id": "exp_202609_002",
      "status": "pending"
    }
  }
  ```

#### 3.5.3 撤回报销申请 (Recall)
- **请求方式**: `POST`
- **接口路径**: `/api/v4/mobile/expenses/:id/recall`
- **鉴权类型**: `Bearer <employee_token>`
- **说明**: 仅当报销单处于 `pending` (待审核) 状态时允许员工自主撤回并删除。
- **成功响应 (200 OK)**:
  ```json
  {
    "success": true,
    "message": "报销单已成功撤回"
  }
  ```

---

### 3.6 规程培训学习与强制阅读确认 (SOP)

#### 3.6.1 获取移动端可见的规程列表
- **请求方式**: `GET`
- **接口路径**: `/api/v4/mobile/sop-documents`
- **鉴权类型**: `Bearer <employee_token>`
- **Query 参数**:
  | 参数名 | 类型 | 必填 | 示例值 | 说明 |
  | :--- | :--- | :--- | :--- | :--- |
  | `category` | string | 否 | `"training"` | 分类: training(岗前培训), catering(仓储餐饮), safety(生产安全) |

- **成功响应 (200 OK)**:
  ```json
  {
    "success": true,
    "data": [
      {
        "id": 12,
        "title": "仓储重型货架叉车安全规程",
        "category": "safety",
        "docType": "training",
        "status": "published",
        "contentHtml": "<h2>安全第一</h2><p>进入立体库作业区必须佩戴安全帽及荧光马甲...</p>",
        "mustRead": true,
        "hasRead": false,
        "createdAt": "2026-09-01"
      }
    ]
  }
  ```

#### 3.6.2 获取规程图文详情及附件
- **请求方式**: `GET`
- **接口路径**: `/api/v4/mobile/sop-documents/:id`
- **鉴权类型**: `Bearer <employee_token>`
- **成功响应 (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "id": 12,
      "title": "仓储重型货架叉车安全规程",
      "contentHtml": "<h2>作业细则</h2><p>作业前后应检查油压与电瓶状态...</p>",
      "mustRead": true,
      "hasRead": true,
      "readAt": "2026-09-23T11:00:00Z",
      "assets": [
        {
          "name": "叉车点检对照表.pdf",
          "url": "https://storage.wmshr.com/docs/forklift_checklist.pdf",
          "size": 1048576
        }
      ]
    }
  }
  ```

#### 3.6.3 规程已读上报与承诺签署
- **请求方式**: `POST`
- **接口路径**: `/api/v4/mobile/sop-documents/:id/read`
- **鉴权类型**: `Bearer <employee_token>`
- **说明**: 用于员工完整学习 SOP 文档后进行签署确认，写入合规审计记录。
- **成功响应 (200 OK)**:
  ```json
  {
    "success": true,
    "message": "已完成阅读与承诺签署",
    "data": {
      "documentId": 12,
      "readAt": "2026-09-23T11:00:00Z"
    }
  }
  ```

## 四、管理端后台控制接口组 (/api/v4/admin/*)

### 4.1 租户与管理员认证

#### 4.1.1 管理员开户注册 (Register)
- **请求方式**: `POST`
- **接口路径**: `/api/v4/admin/auth/register`
- **鉴权类型**: 公开访问
- **说明**: 注册新企业管理员，同时自动完成默认租户初始化与超级管理员角色权限授权。
- **请求体**:
  ```json
  {
    "email": "admin@example.com",
    "password": "Password@123",
    "name": "系统管理员",
    "countryCode": "TH"
  }
  ```
- **成功响应 (200 OK)**:
  ```json
  {
    "success": true,
    "token": "eyJhbGciOi...",
    "user": {
      "id": "14f3a54f-410f-4dfd-ae11-6adb3c956b45",
      "email": "admin@example.com",
      "role": "超级管理员"
    }
  }
  ```

#### 4.1.2 管理员登录 (Login)
- **请求方式**: `POST`
- **接口路径**: `/api/v4/admin/auth/login`
- **请求体**:
  ```json
  {
    "email": "admin@example.com",
    "password": "Password@123"
  }
  ```
- **成功响应 (200 OK)**:
  ```json
  {
    "success": true,
    "token": "eyJhbGciOi...",
    "user": {
      "id": "14f3a54f-410f-4dfd-ae11-6adb3c956b45",
      "email": "admin@example.com",
      "role": "超级管理员",
      "permissions": ["*"]
    }
  }
  ```

#### 4.1.3 获取当前管理员资料与权限范围 (Me)
- **请求方式**: `GET`
- **接口路径**: `/api/v4/admin/auth/me`
- **鉴权类型**: `Bearer <admin_token>`

---

### 4.2 员工档案全生命周期管理

#### 4.2.1 员工花名册列表 (List Employees)
- **请求方式**: `GET`
- **接口路径**: `/api/v4/admin/employees`
- **鉴权类型**: `Bearer <admin_token>`
- **Query 参数**:
  | 参数名 | 类型 | 必填 | 示例值 | 说明 |
  | :--- | :--- | :--- | :--- | :--- |
  | `search` | string | 否 | `"张三"` | 支持工号、姓名、手机号模糊搜索 |
  | `dept` | string | 否 | `"仓储部"` | 按所属部门筛选 |
  | `status` | string | 否 | `"active"` | 状态: active(在职), resigned(已离职) |

- **成功响应 (200 OK)**:
  ```json
  {
    "success": true,
    "data": [
      {
        "id": 4,
        "employeeNo": "wms0004",
        "name": "张三",
        "dept": "仓储部",
        "role": "拣货员",
        "phone": "13800138000",
        "currency": "CNY",
        "hourlyRate": 35.0,
        "status": "active",
        "joinDate": "2024-01-15"
      }
    ]
  }
  ```

#### 4.2.2 新增员工入职 (Create Employee)
- **请求方式**: `POST`
- **接口路径**: `/api/v4/admin/employees`
- **请求体 (Request Body)**:
  | 字段名 | 类型 | 必填 | 示例值 | 说明 |
  | :--- | :--- | :--- | :--- | :--- |
  | `name` | string | 是 | `"李四"` | 员工真实姓名 |
  | `dept` | string | 是 | `"干货仓"` | 所在部门 |
  | `role` | string | 是 | `"叉车司机"` | 岗位职位 |
  | `phone` | string | 否 | `"13900139000"` | 联系手机号 |
  | `hourlyRate` | number | 是 | `40.0` | 基本结算时薪 (计算薪酬基准) |
  | `currency` | string | 否 | `"CNY"` | 薪资结算币种，默认 CNY |
  | `password` | string | 否 | `"123456"` | 移动端初始登录密码，未填默认 123456 |

- **成功响应 (201 Created)**:
  ```json
  {
    "success": true,
    "message": "员工入职创建成功",
    "data": {
      "id": 5,
      "employeeNo": "EMP1005",
      "name": "李四"
    }
  }
  ```

#### 4.2.3 修改员工档案 (Update Employee)
- **请求方式**: `PUT`
- **接口路径**: `/api/v4/admin/employees/:id`
- **说明**: 更新员工部门、岗位、时薪、手机号等信息。

#### 4.2.4 修改员工在职状态 (Toggle Status)
- **请求方式**: `PATCH`
- **接口路径**: `/api/v4/admin/employees/:id/status`
- **请求体**: `{ "status": "resigned" }` (或 `active`)

#### 4.2.5 重置员工移动端密码
- **请求方式**: `POST`
- **接口路径**: `/api/v4/admin/employees/:id/reset-password`
- **请求体**: `{ "password": "new_password_888" }`

---

### 4.3 考勤基准与规则配置

#### 4.3.1 获取考勤配置与打卡围栏
- **请求方式**: `GET`
- **接口路径**: `/api/v4/admin/attendance-config`
- **成功响应 (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "standardHours": 8.0,
      "workStartTime": "09:00",
      "workEndTime": "18:00",
      "allowedRadiusMeters": 500,
      "latitude": 13.7563,
      "longitude": 100.5018,
      "addressName": "曼谷中心保税 1 号仓"
    }
  }
  ```

#### 4.3.2 更新考勤打卡基准围栏
- **请求方式**: `PUT`
- **接口路径**: `/api/v4/admin/attendance-config`
- **请求体**: 传入经纬度、半径及标准上下班时间。

#### 4.3.3 全员考勤流水与异常打卡审计
- **请求方式**: `GET`
- **接口路径**: `/api/v4/admin/attendance-records`
- **Query 参数**: `month=2026-09&empId=4`

#### 4.3.4 全员请假单审批大盘
- **请求方式**: `GET`
- **接口路径**: `/api/v4/admin/leave-requests`
- **审批单据**: `PATCH /api/v4/admin/leave-requests/:id/status`
  - 请求体: `{ "status": "approved" }` 或 `{ "status": "rejected", "rejectReason": "人员紧张" }`

---

### 4.4 财务发票台账管理

#### 4.4.1 发票统计大盘指标
- **请求方式**: `GET`
- **接口路径**: `/api/v4/admin/invoices/stats`
- **成功响应 (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "totalAmount": 128500.0,
      "paidAmount": 98000.0,
      "unpaidAmount": 30500.0,
      "totalCount": 42
    }
  }
  ```

#### 4.4.2 发票明细流水列表
- **请求方式**: `GET`
- **接口路径**: `/api/v4/admin/invoices`
- **录入新发票**: `POST /api/v4/admin/invoices`

---

### 4.5 月度薪资大盘与核算发布 (Payroll Engine)

#### 4.5.1 获取月度全员薪资核算大盘
- **请求方式**: `GET`
- **接口路径**: `/api/v4/admin/payroll-results`
- **鉴权类型**: `Bearer <admin_token>`
- **Query 参数**:
  | 参数名 | 类型 | 必填 | 示例值 | 说明 |
  | :--- | :--- | :--- | :--- | :--- |
  | `yearMonth` | string | 否 | `"2026-09"` | 目标核算月份 (YYYY-MM) |
  | `employeeId` | integer | 否 | `4` | 指定员工筛选 |

- **成功响应 (200 OK)**:
  ```json
  {
    "success": true,
    "data": [
      {
        "id": 501,
        "employeeId": 4,
        "employeeName": "张三",
        "dept": "仓储部",
        "yearMonth": "2026-09",
        "workingDays": 22,
        "totalWorkHours": 176.0,
        "overtimeHours": 12.0,
        "baseSalary": 7000.0,
        "overtimePay": 630.0,
        "netSalary": 7630.0,
        "currency": "CNY",
        "calculationStatus": "confirmed",
        "signed": true,
        "signedAt": "2026-09-23T10:15:00Z"
      }
    ]
  }
  ```

#### 4.5.2 获取单笔薪酬核算明细与签名快照
- **请求方式**: `GET`
- **接口路径**: `/api/v4/admin/payroll-results/:id`

#### 4.5.3 按月自动生成全员工资核算初稿 (Generate Monthly)
- **请求方式**: `POST`
- **接口路径**: `/api/v4/admin/payroll-results/generate-monthly`
- **接口说明**: 遍历所有在职员工，抓取当月已批准考勤与加班时数，按设置的时薪自动计算全员工资初稿。生成的记录状态为 `draft`（草稿），移动端完全不可见。
- **请求体**:
  ```json
  {
    "yearMonth": "2026-09"
  }
  ```
- **成功响应 (200 OK)**:
  ```json
  {
    "success": true,
    "message": "2026-09 月度薪资初稿生成成功，共计核算 18 人"
  }
  ```

#### 4.5.4 重新核算月度工资 (Recalculate Monthly)
- **请求方式**: `POST`
- **接口路径**: `/api/v4/admin/payroll-results/recalculate-monthly`
- **请求体**: `{ "yearMonth": "2026-09" }`

#### 4.5.5 ★确认发放薪资（解锁移动端员工查看）(Confirm)
- **请求方式**: `PATCH`
- **接口路径**: `/api/v4/admin/payroll-results/:id/confirm`
- **接口说明**: **核心业务发布节点**。管理员审核无误后确认正式发放，状态流转为 `confirmed`，此时该工资条正式对移动端对应员工可见并允许签名签收。
- **成功响应 (200 OK)**:
  ```json
  {
    "success": true,
    "message": "薪资结果已确认发放，已同步至移动端"
  }
  ```

#### 4.5.6 财务内部审核 (Approve / Reject)
- **审核通过**: `PATCH /api/v4/admin/payroll-results/:id/approve`
- **审核驳回**: `PATCH /api/v4/admin/payroll-results/:id/reject` (请求体: `{ "reason": "加班工时核算有误" }`)

---

### 4.6 费用报销审核大盘 (Expenses Admin)

#### 4.6.1 获取全员报销列表与分类大盘
- **请求方式**: `GET`
- **接口路径**: `/api/v4/admin/expenses`
- **成功响应 (200 OK)**:
  ```json
  {
    "success": true,
    "expenses": [
      {
        "id": "exp_202609_001",
        "employeeId": 4,
        "employeeName": "张三",
        "dept": "仓储部",
        "category": "物耗杂费",
        "amount": 180.5,
        "currency": "CNY",
        "description": "采购仓库胶带手套",
        "status": "pending",
        "attachments": ["https://..."]
      }
    ],
    "categories": ["差旅费", "办公用品", "物耗杂费", "餐饮招待", "设备维护费", "其他杂项"]
  }
  ```

#### 4.6.2 管理端审批报销单 (审核通过 / 驳回 / 财务已打款)
- **请求方式**: `PUT`
- **接口路径**: `/api/v4/admin/expenses/:id`
- **请求体 (Request Body)**:
  | 字段名 | 类型 | 必填 | 示例值 | 说明 |
  | :--- | :--- | :--- | :--- | :--- |
  | `status` | string | 是 | `"approved"` | 目标状态: approved(审批通过), rejected(驳回), paid(已打款完成) |
  | `approvalNote` | string | 否 | `"发票核对无误，同意报销"` | 审批批注与留言 |

- **成功响应 (200 OK)**:
  ```json
  {
    "success": true,
    "message": "报销审批成功",
    "data": {
      "id": "exp_202609_001",
      "status": "approved",
      "approvalNote": "发票核对无误，同意报销"
    }
  }
  ```

#### 4.6.3 作废或删除报销单
- **请求方式**: `DELETE`
- **接口路径**: `/api/v4/admin/expenses/:id`

---

### 4.7 SOP 规程管理中心 (SOP Admin)

#### 4.7.1 规程文档列表
- **请求方式**: `GET`
- **接口路径**: `/api/v4/admin/sops` (支持 `/api/v4/admin/sop-documents`)

#### 4.7.2 新建与发布 SOP 规程
- **请求方式**: `POST`
- **接口路径**: `/api/v4/admin/sops`
- **请求体 (Request Body)**:
  | 字段名 | 类型 | 必填 | 示例值 | 说明 |
  | :--- | :--- | :--- | :--- | :--- |
  | `title` | string | 是 | `"进仓危险品货物安全码放 SOP"` | 规程标题 |
  | `category` | string | 否 | `"safety"` | 规程类别 (safety / training / catering) |
  | `contentHtml` | string | 是 | `"<h2>安全防范</h2><p>防爆标识必须朝外...</p>"` | 富文本正文 |
  | `mustRead` | boolean | 否 | `true` | 是否设为全员强制必读 |
  | `targetRoles` | array | 否 | `["拣货员", "叉车司机"]` | 面向推送角色范围，空数组表示全员 |
  | `assets` | array | 否 | `[{ "name": "防爆操作手册.pdf", "url": "..." }]` | 附件文件列表 |

- **成功响应 (201 Created)**:
  ```json
  {
    "success": true,
    "message": "规程发布成功",
    "data": {
      "id": 15,
      "title": "进仓危险品货物安全码放 SOP",
      "status": "published"
    }
  }
  ```

#### 4.7.3 编辑更新 SOP 规程
- **请求方式**: `PUT`
- **接口路径**: `/api/v4/admin/sops/:id`

#### 4.7.4 下架或删除 SOP 规程
- **请求方式**: `DELETE`
- **接口路径**: `/api/v4/admin/sops/:id`

#### 4.7.5 员工阅读率与签名追踪
- **请求方式**: `GET`
- **接口路径**: `/api/v4/admin/sops/:id/readers`
- **成功响应 (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "totalTargetCount": 40,
      "readCount": 38,
      "readRate": "95.0%",
      "readers": [
        {
          "employeeId": 4,
          "employeeName": "张三",
          "dept": "仓储部",
          "readAt": "2026-09-23T11:00:00Z"
        }
      ],
      "unreadList": [
        {
          "employeeId": 5,
          "employeeName": "李四",
          "dept": "干货仓"
        }
      ]
    }
  }
  ```

## 五、Flutter 通用 REST 资源与状态引擎

Flutter App 内部广泛封装了 `ApiResourceClient`（位于 `lib/core/network/api_resource_client.dart`），V4 后端特别提供了完全匹配的一阶通用 REST 资源接口与状态键值同步服务。

### 5.1 资源映射字典
通用接口路由形式为：`/api/v4/resources/:resource` (兼容 `/api/resources/:resource`)

| 资源名 (`:resource`) | 业务功能实体 | 后端物理存储映射 | 支持操作 |
| :--- | :--- | :--- | :--- |
| `employees` | 员工档案花名册 | `employees` 表 | GET (查), POST (增), PATCH (改) |
| `attendance` | 考勤打卡流水 | `attendance_records` 表 | GET (查), POST (增) |
| `leave-requests` | 请假单记录 | `leave_requests` 表 | GET (查), POST (增), PATCH (改) |
| `invoices` | 财务发票记录 | `invoices` 表 | GET (查), POST (增), PATCH (改), DELETE (删) |
| `expense-records` | 费用报销单据 | `admin_expense_snapshots` | GET (查), POST (增), PATCH (改), DELETE (删) |
| `sop-documents` | SOP 规程与公告 | `sop_documents` 表 | GET (查), POST (增), PATCH (改), DELETE (删) |
| `customers` | 客户与货主名册 | 基础数据快照 | GET (查), POST (增), PATCH (改) |
| `products` | 仓储商品与 SKU | 基础数据快照 | GET (查), POST (增), PATCH (改) |
| `orders` | 履约订单列表 | 订单快照 | GET (查), POST (增), PATCH (改) |
| `goods` | 货物与存货卡片 | 货物快照 | GET (查), POST (增), PATCH (改) |
| `express-surcharges` | 快递超区附加费 | 计费规则快照 | GET (查), POST (增), PATCH (改) |

### 5.2 标准 REST 协议说明

#### 1. 列表查询: `GET /api/v4/resources/:resource`
- **响应示例**:
  ```json
  {
    "success": true,
    "data": [
      { "id": 1, "name": "示例项目", "status": "active" }
    ]
  }
  ```

#### 2. 新建资源: `POST /api/v4/resources/:resource`
- **请求体**: 对应实体的 JSON 载荷
- **响应**: `{ "success": true, "data": { "id": 2, ... } }`

#### 3. 更新资源: `PATCH /api/v4/resources/:resource/:id`
- **请求体**: 需要差量修改的字段键值对

#### 4. 删除资源: `DELETE /api/v4/resources/:resource/:id`
- **响应**: `{ "success": true, "message": "删除成功" }`

### 5.3 全局键值状态热更新引擎 (/api/v4/state/:key)
用于客户端热拉取或更新配置（如考勤围栏半径、打卡坐标点、全局开关），无需重启服务或重新发版。

#### 5.3.1 读取配置: `GET /api/v4/state/:key`
- 示例: `GET /api/v4/state/config`
- 响应:
  ```json
  {
    "success": true,
    "data": {
      "standardHours": 8.0,
      "allowedRadiusMeters": 500,
      "latitude": 13.7563,
      "longitude": 100.5018
    }
  }
  ```

#### 5.3.2 热更新配置: `PATCH /api/v4/state/:key`
- 示例: `PATCH /api/v4/state/config`
- 请求体: `{ "standardHours": 8.5 }`
- 响应: `{ "success": true, "message": "状态已更新", "data": { ... } }`

---

## 六、联调指南、测试用例与 FAQ

### 6.1 联调环境测试账号与 Token 获取

#### 1. 管理端预设测试租户
- **租户 Owner ID**: `14f3a54f-410f-4dfd-ae11-6adb3c956b45`
- **管理员账号**: `smartbillpro@gmail.com`
- **所属国家与权限**: 泰国仓 (TH), 超级管理员 (`permissions: ["*"]`)

#### 2. 移动端预设测试员工
- **员工 ID**: `4` (工号: `wms0004`)
- **员工账号**: `wms0004`
- **默认测试密码**: `123456`

### 6.2 常用接口 cURL 调试样例

#### 1. 移动端员工登录
```bash
curl -X POST http://127.0.0.1:8789/api/v4/mobile/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "account": "wms0004",
    "password": "password123"
  }'
```

#### 2. 员工上班打卡 (带经纬度与测距)
```bash
curl -X POST http://127.0.0.1:8789/api/v4/mobile/attendance/check-in \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <EMPLOYEE_TOKEN>" \
  -d '{
    "lat": 13.7563,
    "lng": 100.5018,
    "distance": 85.0,
    "deviated": false,
    "note": "1号仓入口正常打卡"
  }'
```

#### 3. 管理端确认发放薪资条 (关键发布动作)
```bash
curl -X PATCH http://127.0.0.1:8789/api/v4/admin/payroll-results/501/confirm \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

#### 4. 员工端签名确认工资条
```bash
curl -X POST http://127.0.0.1:8789/api/v4/mobile/payroll-results/501/sign-off \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <EMPLOYEE_TOKEN>" \
  -d '{
    "signatureValue": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
  }'
```

---

### 6.3 常见对接踩坑与排查手册 (FAQ)

#### Q1: 移动端调用 `GET /mobile/payroll-results` 返回空列表，但管理端已经生成了工资？
- **排查原因**: 薪资核算处于 **草稿 (`draft`)** 或仅财务初审状态。系统在设计上为了保障薪酬隐私与避免未定稿数据误导员工，**只有管理端执行了 `PATCH /payroll-results/:id/confirm` (确认发放)** 之后，该条薪资才会被推送至移动端。
- **解决方法**: 在管理端薪酬台账界面，点击“确认发放”，状态变为 `confirmed` 后，员工端即可实时刷新显示。

#### Q2: 移动端打卡提示 `deviated: true` 是什么原因？
- **排查原因**: 客户端上传打卡经纬度计算出的 `distance` 超过了管理端设定的 `allowedRadiusMeters`（默认 500 米）。
- **解决方法**: 属于正常地理围栏预警机制。系统仍会记录此次打卡，但会在后台标记异常偏差，供考勤专员人工审核。

#### Q3: Flutter 端通过 `ApiResourceClient` 调用接口报 401 错误？
- **排查原因**: 
  1. `AuthInterceptor` 未在请求头注入 `Authorization: Bearer <token>`。
  2. 使用了已过期的 Token，或混淆了管理员 Token 与员工 Token。
- **解决方法**: 检查客户端本地存储是否正确保存了登录后下发的 Token，并在发起请求时确保 Header 键名为 `Authorization`。

#### Q4: 图片附件上传应该传 URL 还是 Base64？
- **规范说明**: 
  1. 对于报销票据凭证与 SOP 附件，支持直接传递已上传文件服务器的绝对 HTTP(S) URL。
  2. 对于工资条手写触控签名与小尺寸发票照片（< 2MB），支持直接传递标准 `data:image/png;base64,...` 字符串，后端已配置 `express.json({ limit: "5mb" })` 进行安全反序列化。

---
