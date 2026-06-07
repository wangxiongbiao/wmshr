# App 每日任务模块移除任务安排

## 已确认范围
1. 从 `apps/mobile/src/features/home/screens/HomeScreen.tsx` 删除首页“今日任务”标题与两张静态任务卡片。
2. 删除不再使用的 `apps/mobile/src/features/home/components/TodayTaskCard.tsx`。
3. 清理无效 import，保持代码可通过校验。
4. 执行 mobile 端真实校验，确认删除后无报错。

## 依赖顺序
1. 先删除首页引用
2. 再删除无用组件文件
3. 最后执行 lint / 类型 / 构建类验证

## 验收标准
- 首页不再显示“今日任务”区块。
- 工程中不再存在 `TodayTaskCard` 的有效引用。
- mobile 端对应校验命令通过。

## AFK / HITL
- 当前实施：AFK
- 已确认开始执行，无需再次等待确认

## 推荐实施顺序
- Task 1：删除 HomeScreen 中每日任务区块
- Task 2：删除 TodayTaskCard 组件文件
- Task 3：执行校验并记录结果
