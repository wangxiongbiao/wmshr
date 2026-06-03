# WMshr Admin 弹窗规范

## 1. 目标

本规范用于统一 `wmshr-admin` 后台中所有弹窗类交互，包括：

- 表单编辑弹窗
- 详情查看弹窗
- 列表管理弹窗
- 风险确认弹窗
- 输入型弹窗
- 全局遮罩 loading

目标是保证：

- 视觉一致
- 交互一致
- 结构一致
- 后续新模块复用统一方案

---

## 2. 弹窗分层

后台中的弹窗体系分为 3 类：

### 2.1 业务弹窗

用于展示和编辑业务内容，例如：

- 编辑员工档案
- 考勤计算详情
- 调整原始考勤
- 薪酬结果详情
- 一次性薪资项管理

这类弹窗统一基于共享壳组件：

- [ModalShell.tsx](/Users/admin/Desktop/project/wmshr/wmshr-admin/src/components/ModalShell.tsx)

### 2.2 轻确认弹窗

用于确认、驳回、输入备注等轻量交互，例如：

- 是否继续保存
- 是否确认删除
- 填写驳回原因

这类弹窗统一基于：

- [DialogProvider.tsx](/Users/admin/Desktop/project/wmshr/wmshr-admin/src/components/DialogProvider.tsx)

调用方式统一为：

- `await confirm(...)`
- `await prompt(...)`
- `await alert(...)`

### 2.3 全局遮罩 loading

用于“页面仍保留，但当前操作需要等待详情返回”的场景，例如：

- 点击编辑员工时加载员工详情

这类 loading 不能替代整个列表内容，只作为全局遮罩层出现。

---

## 3. 共享弹窗壳规范

所有业务弹窗必须优先复用 `ModalShell`，不得在模块内重新手写一套新的浮层结构。

### 3.1 统一结构

业务弹窗统一采用三段式结构：

1. `Header`
2. `Body`
3. `Footer`

说明：

- `Header` 固定
- `Body` 可滚动
- `Footer` 固定

### 3.2 Header 规范

Header 必须包含：

- 左侧标题
- 右侧关闭按钮

Header 样式要求：

- 浅色背景
- 底部边框
- 标题加粗
- 关闭按钮固定右上

### 3.3 Body 规范

Body 是唯一允许滚动的区域。

要求：

- 默认保留统一内边距
- 大表单弹窗可覆盖 body padding
- 不允许同时出现 body 外层和 body 内层双重滚动

禁止：

- 外层 modal 滚动 + 内层 form 再滚动
- footer 跟随 body 内容一起滚动

### 3.4 Footer 规范

Footer 用于放操作按钮。

要求：

- 独立于 body
- 固定在弹窗底部
- 带顶部边框
- 带轻微分层阴影
- 与 body 有清晰视觉分界

Footer 常见按钮顺序：

- 左侧留空或状态提示
- 右侧 `取消`
- 最右侧主操作按钮，如 `保存` / `确认`

---

## 4. 视觉规范

### 4.1 外层遮罩

所有业务弹窗统一使用：

- 深色半透明遮罩
- 轻微背景模糊

### 4.2 外层容器

统一要求：

- 白色背景
- 大圆角
- 强阴影
- 最大高度受视口限制

### 4.3 层级

建议层级：

- 普通业务弹窗：`z-50`
- Toast：高于普通页面但低于全局 loading
- 全局 loading：高于业务弹窗触发前页面
- 轻确认弹窗：高于业务弹窗内容

### 4.4 按钮风格

统一按钮优先级：

- 主按钮：品牌蓝
- 次按钮：白底描边
- 危险按钮：红色语义

---

## 5. 交互规范

### 5.1 打开弹窗

打开业务弹窗时：

- 若详情数据已存在，可直接打开
- 若需先加载详情，则优先显示全局遮罩 loading
- 数据返回后再打开弹窗

禁止：

- 用列表 loading 替代详情加载
- 因打开弹窗导致整个列表区域消失

### 5.2 关闭弹窗

关闭弹窗方式统一支持：

- 右上角关闭按钮
- 取消按钮

后续如加点击遮罩关闭，必须按模块风险评估，不默认开启。

### 5.3 保存类弹窗

保存型弹窗必须满足：

- 主按钮始终可见
- 不需要用户滚动到底部才能操作
- 错误提示优先显示在 footer 上方或按钮区上方

### 5.4 风险确认

风险操作不得使用浏览器原生：

- `window.alert`
- `window.confirm`
- `window.prompt`

统一使用 `DialogProvider`。

---

## 6. 当前已接入模块

当前已接入统一弹窗壳的模块：

- 员工管理主弹窗
  - [Modals.tsx](/Users/admin/Desktop/project/wmshr/wmshr-admin/src/components/Modals.tsx)
- 考勤计算详情 / 调整弹窗
  - [AttendanceTable.tsx](/Users/admin/Desktop/project/wmshr/wmshr-admin/src/components/AttendanceTable.tsx)
- 薪酬结果详情 / 一次性薪资项相关弹窗
  - [PayrollTable.tsx](/Users/admin/Desktop/project/wmshr/wmshr-admin/src/components/PayrollTable.tsx)

当前已接入统一轻确认弹窗的模块：

- 员工相关风险确认
- 考勤重算确认
- 薪酬生成、重算、删除、驳回、确认

---

## 7. 员工编辑弹窗专项规则

员工编辑弹窗是当前后台的基准弹窗。

要求：

- 采用左右两栏布局
- 左侧主表单
- 右侧摘要和历史
- 中部表单滚动
- 底部 footer 固定
- 点击编辑员工时显示全局遮罩 loading，而不是列表 loading

---

## 8. 后续模块要求

后续新增模块如果需要弹窗，必须遵循：

1. 优先复用 `ModalShell`
2. 确认类交互优先复用 `DialogProvider`
3. 不允许模块内部复制粘贴另一套新的 modal 结构
4. 不允许重新引入浏览器原生确认框

---

## 9. 禁止事项

以下做法默认禁止：

- 一个模块自己手写独立遮罩和容器结构
- 一个弹窗里出现两层滚动条
- 主操作按钮跟随内容滚走
- 列表点击编辑后整页变 loading
- 继续使用浏览器原生确认框
- 同一个后台存在多套明显不同的弹窗头部、按钮区和阴影样式

---

## 10. 维护建议

后续如继续整理后台 UI，建议优先做这两件事：

1. 把所有业务弹窗都逐步迁移到 `ModalShell`
2. 把弹窗尺寸、footer 按钮布局、错误提示位置进一步抽成可配置规范

这样后面做：

- 考勤规则编辑
- 薪酬项管理
- 详情查看
- 批量操作确认

时，整体风格才能长期稳定。
