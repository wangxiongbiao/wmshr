# 员工端 App 架构改造方案

项目路径：`/Users/admin/Desktop/project/wmshr/apps/mobile`

当前状态：`apps/mobile` 是 Expo React Native 员工端原型，功能集中在单文件 `App.tsx`，使用演示数据和本地内存状态，暂未接真实后端。

## 1. 改造目标

如果要把当前员工端做成可用完整 App，最先不要急着加页面或接接口，而应先改造应用架构骨架。

第一阶段目标：

```text
把单文件原型改造成“可接真实后端、可扩展页面、可维护状态”的 App 架构。
```

需要先拆出以下层次：

```text
App 入口
→ 导航层
→ 页面层
→ 业务模块层
→ API 层
→ 状态层
→ 类型层
→ 配置层
```

当前最大问题不是功能少，而是页面、状态、演示数据、业务逻辑全部堆在 `App.tsx`，后续接登录、接口、详情页、权限、SOP 阅读确认、考勤异常处理时会快速失控。

## 2. 第一优先级：建立目录分层

建议先把 `apps/mobile` 改造成以下结构：

```text
apps/mobile/
  App.tsx

  src/
    application/
      AppNavigator.tsx
      providers/
        AuthProvider.tsx
        ToastProvider.tsx

    features/
      auth/
        screens/
          LoginScreen.tsx
        services/
          authApi.ts
        types.ts

      home/
        screens/
          HomeScreen.tsx
        components/
          CheckInCard.tsx
          TodayTaskCard.tsx

      attendance/
        screens/
          AttendanceListScreen.tsx
          AttendanceDetailScreen.tsx
        services/
          attendanceApi.ts
        types.ts

      sop/
        screens/
          SopListScreen.tsx
          SopDetailScreen.tsx
        services/
          sopApi.ts
        types.ts

      mine/
        screens/
          MineScreen.tsx
          SettingsScreen.tsx

    shared/
      api/
        httpClient.ts
      components/
        AppButton.tsx
        AppCard.tsx
        AppText.tsx
        ScreenContainer.tsx
        EmptyState.tsx
        LoadingState.tsx
      config/
        env.ts
      constants/
        colors.ts
      types/
        common.ts
      utils/
        date.ts
```

这样拆分的目的：

- `App.tsx` 只负责挂载应用。
- `application/` 负责全局导航和 Provider；不用 `src/app`，避免 Expo Router 把该目录误判为路由根目录。
- `features/` 按业务域拆分。
- `shared/` 放通用组件、工具、API 客户端、配置。
- 每个业务模块维护自己的 screen、service、type。

## 3. 第二优先级：改为正式导航结构

当前页面切换方式是本地状态：

```ts
const [currentPage, setCurrentPage] = useState<Page>('home');
```

这个方式只适合原型。完整 App 应改为 React Navigation。

推荐导航结构：

```text
RootNavigator
  ├─ 未登录：AuthNavigator
  │    └─ LoginScreen
  │
  └─ 已登录：MainTabNavigator
       ├─ Home
       ├─ Attendance
       ├─ SOP
       └─ Mine
```

进一步拆分：

```text
AuthStack
  - Login

MainTabs
  - Home
  - Attendance
  - SOP
  - Mine

AttendanceStack
  - AttendanceList
  - AttendanceDetail

SopStack
  - SopList
  - SopDetail
```

导航需要最先改的原因：

- 登录态需要控制进入未登录页面或主页面。
- 考勤和 SOP 后续都会有详情页。
- 我的页面会进入设置、语言、账号安全等子页面。
- 继续用 `currentPage` 会让业务状态和导航状态混在一起。

## 4. 第三优先级：定义真实业务模型

当前数据结构仍偏演示，例如：

```ts
interface AttendanceRecord {
  date: string;
  in: string;
  out: string;
  type: 'normal' | 'overtime';
  hours: string;
}
```

完整 App 应先定义能承接真实接口的业务模型。

### 4.1 员工模型

```ts
export interface EmployeeProfile {
  id: string;
  employeeNo: string;
  name: string;
  nickname?: string;
  gender?: string;
  country?: string;
  phone?: string;
  role: string;
  dept: string;
  status: 'active' | 'on_leave' | 'probation' | 'disabled' | 'resigned';
}
```

### 4.2 今日打卡状态

```ts
export interface TodayAttendanceStatus {
  date: string;
  status: 'not_checked_in' | 'checked_in' | 'checked_out';
  checkInTime: string | null;
  checkOutTime: string | null;
  locationName: string | null;
  locationAccuracy: number | null;
  canCheckIn: boolean;
  canCheckOut: boolean;
  warning?: string;
}
```

### 4.3 打卡请求

```ts
export interface CheckInPayload {
  type: 'check_in' | 'check_out';
  latitude: number;
  longitude: number;
  accuracy: number;
  deviceId?: string;
  clientTime: string;
}
```

### 4.4 SOP 模型

```ts
export interface SopDocument {
  id: string;
  title: string;
  version: string;
  updatedAt: string;
  readStatus: 'unread' | 'read';
  readAt?: string | null;
}
```

这一步很重要。App 架构不是目录好看就行，而是类型和接口契约要能承接真实业务。

## 5. 第四优先级：建立 API 层，先用 mock 适配

不要在页面里直接写 `fetch`。应先建立统一 API 层：

```text
shared/api/httpClient.ts
features/attendance/services/attendanceApi.ts
features/sop/services/sopApi.ts
features/auth/services/authApi.ts
```

示例：

```ts
// features/attendance/services/attendanceApi.ts
export async function fetchTodayAttendanceStatus() {}

export async function submitAttendanceCheckIn(payload: CheckInPayload) {}

export async function fetchAttendanceRecords(params: AttendanceQuery) {}
```

第一阶段可以先让 API 返回 mock 数据。

这样做的好处：

- 页面先按真实接口形态开发。
- 后面接 Supabase/Admin API 时，只改 service，不重写页面。
- mock 数据不会散落在各个组件里。
- 可以提前固定前后端契约。

## 6. 第五优先级：建立认证状态

完整 App 必须先解决登录态。

建议建立：

```text
src/application/providers/AuthProvider.tsx
```

它负责：

- 当前是否登录。
- 当前员工资料。
- token。
- 登录。
- 登出。
- 恢复本地 session。
- 判断进入 AuthStack 还是 MainTabs。

推荐第一版状态：

```text
AuthProvider
  - session
  - employee
  - loading
  - login()
  - logout()
  - refreshProfile()
```

状态可以先用 React Context，不必一开始引入复杂状态库。后续如果状态复杂，再考虑 Zustand 或 TanStack Query。

## 7. 第六优先级：页面拆分顺序

不要一口气改所有功能。建议按以下顺序拆。

### 7.1 App 入口和导航

从 `App.tsx` 拆出：

```text
src/application/AppNavigator.tsx
```

让 `App.tsx` 缩减为：

```tsx
export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppNavigator />
      </ToastProvider>
    </AuthProvider>
  );
}
```

### 7.2 首页

拆出：

```text
features/home/screens/HomeScreen.tsx
features/home/components/CheckInCard.tsx
features/home/components/TodayTaskCard.tsx
```

### 7.3 考勤

拆出：

```text
features/attendance/screens/AttendanceListScreen.tsx
features/attendance/screens/AttendanceDetailScreen.tsx
features/attendance/services/attendanceApi.ts
features/attendance/types.ts
```

### 7.4 SOP

拆出：

```text
features/sop/screens/SopListScreen.tsx
features/sop/screens/SopDetailScreen.tsx
features/sop/services/sopApi.ts
features/sop/types.ts
```

### 7.5 我的

拆出：

```text
features/mine/screens/MineScreen.tsx
features/mine/screens/SettingsScreen.tsx
```

## 8. 第七优先级：收口演示状态

当前这些都在 `App.tsx`：

- 当前时间。
- 打卡状态。
- Toast。
- 考勤假数据。
- SOP 假数据。
- 页面切换状态。

改造后应变成：

```text
Toast -> ToastProvider
页面切换 -> React Navigation
考勤数据 -> attendanceApi mock
SOP 数据 -> sopApi mock
员工信息 -> AuthProvider mock profile
打卡逻辑 -> attendance service + HomeScreen 调用
```

原则：

```text
页面只负责展示和触发动作；业务状态和数据来源放到对应 provider/service。
```

## 9. 第一阶段不要做的事

第一阶段不要急着做：

- 复杂 UI 重构。
- 大量新页面。
- 真实 GPS 权限。
- 真实 Supabase 登录。
- 推送通知。
- 离线缓存。
- 多语言。
- 薪资模块。
- 复杂状态库。

原因：当前最缺的是架构边界，不是功能数量。

## 10. 第一阶段改造清单

最建议先做：

```text
把单文件 App.tsx 拆成导航 + 四个 feature screen + shared components。
```

具体清单：

```text
1. 安装 React Navigation 依赖。
2. 新建 src/application/AppNavigator.tsx。
3. 新建 src/application/providers/AuthProvider.tsx。
4. 新建 src/application/providers/ToastProvider.tsx。
5. 新建四个 screen：
   - HomeScreen
   - AttendanceListScreen
   - SopListScreen
   - MineScreen
6. 新建 service：
   - attendanceApi.ts
   - sopApi.ts
7. 把 App.tsx 缩减成应用挂载入口。
8. 跑 TypeScript 检查和 Expo 启动验证。
```

## 11. 第一阶段成功判定

第一阶段改造完成后，应满足：

```text
1. App.tsx 不再承载所有页面和业务逻辑。
2. 底部导航由 React Navigation 管理。
3. 首页、考勤、SOP、我的都拆成独立 screen。
4. 打卡、考勤记录、SOP 数据都通过 service 获取。
5. mock 数据集中在 service 或 mock 文件中。
6. 登录态由 AuthProvider 管理。
7. npm --workspace @wmshr/mobile run lint 通过。
8. npm --workspace @wmshr/mobile run web 或 npm --workspace @wmshr/mobile run start 能正常打开。
```

## 12. 总结

员工端 App 的第一步不是补功能，而是把它从“单文件演示原型”改造成“按业务模块分层的移动端应用骨架”。

只有先完成这一步，后续接真实登录、今日打卡、考勤记录、SOP 阅读确认、异常申诉、通知、多语言和离线缓存时，才不会反复推翻已有代码。
