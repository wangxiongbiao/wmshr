# Home 门户语言路径化需求确认

## 目标
把门户（home）当前语言放进 URL path，而不是只依赖 i18n detector / localStorage。这样刷新、复制链接、直接打开链接时，页面语言都不会被重置。

## 实施中追加需求（已纳入本轮范围）
1. 门户与 admin 的繁体语言 key / 路由值必须保持一致，不能出现一边用一种 key、另一边用另一种 key 的情况。
2. admin 中所有“返回官网”入口都要把当前 admin 语言传回门户，而不是回到不带语言的裸官网地址。

## 项目路径
- `/Users/admin/Desktop/project/wmshr/apps/home`

## 当前实现（已核实）
1. 当前门户没有使用 React Router 作为页面状态源。
2. `src/App.tsx` 里的语言切换组件 `LanguageSelector` 仍直接调用：
   - `i18n.changeLanguage(lang.code)`
3. 当前页面 URL 不携带语言状态。
4. 门户跳转 admin 时，已经改成把当前语言传到：
   - `/:lang/dashboard`
   但门户自身页面仍没有把语言放到自己的 path。

## 当前问题
因此门户自身还存在这些现象：
- 浏览器刷新时，语言可能回退到 detector / localStorage / navigator 决定的值
- 复制当前门户链接给别人时，链接本身不携带语言
- 用户切换语言后，URL 不变，页面状态与 URL 脱节

## 建议方案（推荐）
采用与 admin 一致的思路：让门户语言以 path 为主状态源。

建议 URL 形态：
- `/:lang`

说明：
- 当前 home 基本是单页展示，不需要像 admin 那样再挂业务 tab
- 页面内锚点（如 `#solutions`、`#about-us`）继续保留在 hash 上
- 语言成为 path 主状态源，锚点继续作为页内定位，不冲突

## 预期实现范围
### 第一阶段
1. 在 home 接入 React Router
2. 根路径 `/` 自动跳转到 `/:lang`
3. 从 path 读取 `lang` 作为当前语言主来源
4. `LanguageSelector` 切语言时改为路由跳转，而不是只调 `i18n.changeLanguage`
5. 页面内锚点导航继续可用
6. 门户跳 admin 时继续从当前 path 语言派生目标 admin URL
7. localStorage 仅作为默认语言兜底，而不是主状态源
8. 门户与 admin 对繁体中文使用同一套语言 key / URL 规范
9. admin 返回官网时把当前 admin 语言写回门户 URL

## 不在本次范围内
1. 不做更细粒度页面拆路由
2. 不改 hero / feature / about 等内容结构
3. 不顺手重构无关动画、样式、组件层级

## 关键实现原则
1. URL 里的 `lang` 是门户语言主状态源
2. 刷新后必须保持原语言
3. 切换语言时只替换 path，不破坏当前 hash
4. 非法 `lang` 自动归一化并 replace 到合法 URL
5. 现有 admin 跳转语言传递逻辑不能被破坏
6. 门户与 admin 的繁体语言 key / 路径值必须统一
7. admin 返回官网时不能丢失当前语言

## 风险点
1. 目前门户没有路由骨架，需小步接入 BrowserRouter
2. 现有锚点导航依赖 `#hash`，路由化后要验证 `/:lang#about-us` 这类形态仍正常
3. 现有 `LanguageSelector` 直接调用 `i18n.changeLanguage`，需要切到路径驱动，避免双状态源

## 成功判定
1. 直接打开 `/:lang` 时页面按对应语言展示
2. 刷新 `/:lang` 后语言不变
3. 切换语言后 URL 同步变化
4. 切换语言时若当前有 hash，hash 保留
5. 门户跳 admin 时仍能把当前语言正确传过去
6. 繁体中文从门户进入 admin、再返回官网时，URL key 前后一致
7. admin 的“返回官网”点击后会落到对应 `/:lang`

## 建议结论
建议直接做：
- home 改为 `/:lang`
- 根路径 `/` 统一跳到 `/:lang`
- path 成为语言主状态源
- hash 继续负责页内锚点
