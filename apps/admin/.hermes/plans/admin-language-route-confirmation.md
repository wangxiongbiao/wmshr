# Admin 语言配置路由化需求确认

## 目标
把 admin 的当前语言配置放到路由里，而不是只依赖 i18n detector / localStorage。这样在以下场景里语言都能稳定保留：

- 浏览器刷新
- 页面内导航
- 直接复制链接打开
- 外部跳回 admin 页面

## 当前实现（已核实）

### 项目路径
- `/Users/admin/Desktop/project/wmshr/apps/admin`

### 关键文件
- `src/main.tsx`
- `src/i18n.ts`
- `src/App.tsx`
- `src/components/Header.tsx`
- `src/components/Sidebar.tsx`
- `packages/i18n/src/web.ts`

### 当前状态
1. admin 入口没有使用 React Router。
2. 页面切换靠 `App.tsx` 里的本地状态：
   - `const [activeTab, setActiveTab] = useState<TabId>('dashboard');`
3. 语言切换靠 `Header.tsx` 中：
   - `i18n.changeLanguage(event.target.value)`
4. web i18n 检测顺序在 `packages/i18n/src/web.ts` 中为：
   - `querystring -> localStorage -> navigator`
5. 当前语言虽然会缓存到 localStorage，但语言不是路由的一部分；因此链接本身不携带语言状态。

## 问题本质
当前 admin 有两类“页面状态”都不在路由里：

1. 语言 `lang`
2. 当前业务页签 `activeTab`

结果是：
- 刷新后业务页签一定回到默认 `dashboard`
- 语言是否保留依赖 detector / localStorage / 当前访问 URL，缺少“URL 即状态”的稳定来源
- 页面跳转、外部回跳、分享链接、未来多入口接入时，语言状态不够确定

## 建议方案
采用“路由成为单一状态源”的方案：

### 方案 A（推荐）
使用 React Router，把 `lang` 放进 path，把业务页签也放进 path。

建议 URL 形态：
- `/:lang/dashboard`
- `/:lang/employees`
- `/:lang/attendance`
- `/:lang/payroll`
- `/:lang/sop`

好处：
- 刷新不丢
- 页面切换不丢
- 复制链接即可完整恢复语言 + 页面位置
- 后续 breadcrumb、权限页、404、深链接都更自然
- 可以逐步替换当前 `activeTab` 的本地状态逻辑

### 方案 B（过渡）
暂时只把 `lang` 放进 querystring，例如：
- `/admin?lang=en`

问题：
- 只能解决语言，不解决 `activeTab` 刷新丢失
- `App.tsx` 里已有 Google OAuth query 参数逻辑，后续 querystring 容易继续堆叠
- 结构性不如 path 路由清晰

## 推荐实施范围
### 第一阶段
1. 引入 React Router
2. 把 `activeTab` 改为路由驱动
3. 把 `lang` 改为 path 参数驱动
4. 保留 localStorage 作为兜底默认值，而不是主状态源
5. 保证 Google OAuth popup callback 逻辑继续可用

### 第二阶段（可选）
1. 给各业务页补更细粒度子路由
2. 给需要分享/回跳的位置加更细 query 参数

## 预期代码形态
### 新增
- `src/router/...`（或在 `src/App.tsx` 内先小步落地）
- 路由到 `TabId` 的映射工具
- 语言参数解析/归一化工具

### 修改
- `src/main.tsx`：挂 `BrowserRouter`
- `src/App.tsx`：删除 `activeTab useState` 作为主来源，改从路由读取
- `src/components/Sidebar.tsx`：按钮改为路由跳转
- `src/components/Header.tsx`：切语言时改为保留当前业务页并跳到新语言路由
- `packages/i18n/src/web.ts`：把 detector 顺序改成“path 优先，localStorage 次之，navigator 最后”

## 关键实现原则
1. URL 里的 `lang` 是主状态源。
2. i18n 在路由变化时同步 `changeLanguage`。
3. 切换语言时必须保留当前 tab，不允许跳回 dashboard。
4. 遇到非法 `lang` / 非法 tab` 时自动归一化并 replace 到合法 URL。
5. 不能破坏现有 Google 登录 popup callback 参数读取。

## 风险点
1. `App.tsx` 当前直接读取 `window.location.search` 处理 Google callback，接路由后要明确 callback 页面是否继续走同一路由。
2. 现有很多地方把 `setActiveTab` 当作页面跳转入口；改造时要逐个替换成 navigate。
3. 一些动画 key、标题计算、默认跳页逻辑现在依赖 `activeTab` 状态，改成路由后要一起切换。

## 成功判定
1. 打开 `/:lang/:tab` 时页面语言与业务页一致恢复。
2. 刷新后仍停留在原语言和原业务页。
3. 从 sidebar / dashboard 内部跳转后，URL 同步变化。
4. 切换语言后，当前 tab 保持不变，只替换 `lang`。
5. Google 登录流程不回归。

## 建议结论
建议直接做方案 A：
- `lang` 上路由
- `tab` 也上路由
- localStorage 退为默认值兜底

这样这次不是只“补一个语言问题”，而是顺手把 admin 当前最明显的页面状态源问题一次收干净，但仍只限于语言 + tab，不扩散到更细业务筛选状态。