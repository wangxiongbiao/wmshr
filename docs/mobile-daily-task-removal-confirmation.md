# App 每日任务模块移除需求确认

## 用户需求
- 去掉 app 的“每日任务模块”。

## 当前代码确认结果
- 当前 app 中的“每日任务”不是真正独立的业务模块、Tab 或接口。
- 现状是在首页 `apps/mobile/src/features/home/screens/HomeScreen.tsx` 底部渲染一段静态展示区：
  - 标题：`今日任务`
  - 卡片 1：`拣货任务 / A区入库 · 24 单待处理`
  - 卡片 2：`安全提醒 / 请完成叉车作业前检查`
- 该展示区通过组件 `apps/mobile/src/features/home/components/TodayTaskCard.tsx` 渲染。
- 代码图谱确认 `TodayTaskCard` 只有 1 个调用方：`HomeScreen.tsx`。
- 当前未发现：
  - 单独的“每日任务”页面
  - 单独的导航入口
  - 单独的移动端任务接口调用
  - 单独的任务状态数据流

## 默认实施范围
1. 从 `HomeScreen.tsx` 删除“今日任务”标题和两张任务卡片。
2. 删除不再被引用的 `TodayTaskCard.tsx` 组件文件。
3. 清理对应 import，保证 mobile 端可正常构建。
4. 用真实 lint / build 或最小可执行验证确认删除后无报错。

## 本次默认不做
- 不改打卡模块
- 不改考勤模块
- 不改 SOP / 我的 等 Tab
- 不新增替代入口或占位文案
- 不处理后台管理端任务功能（当前也未发现与此处直接相连）

## 验收标准
- App 首页不再显示“今日任务”区块。
- 工程内不再残留 `TodayTaskCard` 的有效引用。
- 删除后 mobile 端通过对应 lint / build 验证。

## 待你确认
请确认是否按以上范围执行：
- 只移除首页这块静态“今日任务”展示区
- 不额外改动其他模块
