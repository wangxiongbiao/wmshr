# PROJECT ISSUES

## 2026-06-27 问题 1：费用核销列表存在名称显示错位/错误的高风险根因
- 原因：费用核销列表在 `apps/admin/src/components/ExpenseManager.tsx` 中使用 `key={rec.id}` 渲染每一行，但新建记录的 ID 生成方式是 `exp-${Date.now().toString().slice(-4)}`，最后 4 位每 10 秒就会循环一次，无法保证全局唯一。后端 `PUT /api/admin/expenses` 会在保存时校验重复 ID，但 `GET /api/admin/expenses` 加载历史快照时只做归一化，不做重复 ID 校验或修复。因此，一旦历史快照里已经存在重复 ID（例如旧数据、历史脏数据、早期逻辑生成的数据），React 列表会出现重复 key，导致某些行的名称/操作区出现复用或错位显示。
- 导致的问题：用户看到“有一些费用名称显示错误”，不仅可能是数据值错误，也可能是前端重复 key 导致的行复用渲染错误。当前代码路径不足以在读取阶段阻断这个问题。
- 当前判断：这是当前最可疑、最贴近“列表名称显示错误”的根因之一，需要继续结合真实快照数据确认是否已存在重复 ID。
- 已尝试：检查了费用模块的前端列表渲染、创建逻辑、后端归一化和读写校验；已确认列表 key 使用 `rec.id`，创建 ID 仅取时间戳最后 4 位，后端读取历史快照不做重复 ID 校验。
- 下一步：
  1. 直接检查真实 `admin_expense_snapshots` 数据里是否存在重复 `id`；
  2. 如存在，先做数据修复/迁移；
  3. 同步修正前端新建 ID 生成策略，改为真正全局唯一；
  4. 给后端读取阶段加重复 ID 检测/告警，避免脏数据继续进入前端列表。

## 2026-06-27 问题 2：费用多凭证文件名在保存后会丢失
- 原因：前端已支持 `receiptUrls` 和 `receiptNames` 多张凭证，但后端 `normalizeExpenseSnapshotItem` 只保留 `receiptUrl`、`receiptUrls`、`receiptName`，没有保留 `receiptNames`。
- 导致的问题：重新加载后，多张凭证除首张外的文件名会退化成默认占位名，界面展示与用户上传信息不一致。
- 解决方式：待修复时在后端归一化和持久化结构中补齐 `receiptNames`。

## 2026-06-27 问题 3：未指定审批人时的展示语义不一致
- 原因：前端可保存“无指定 / 任意管理员”，但后端会把 `targetApproverId` 归一化为 `undefined`，前端多个判断条件仍把它当成类似已指定审批人的状态展示。
- 导致的问题：审批链展示语义不清，用户会误判该单是否真正绑定审批人。
- 解决方式：待修复时统一未指定审批人的存储和展示语义。

## 2026-06-27 问题 4：生产发布脚本被 `supabase migration list --linked` 的瞬时登录角色失败误阻断
- 原因：`scripts/deploy-production.sh` 在 `supabase db push --yes` 成功后，会继续把 `supabase migration list --linked` 作为硬性步骤执行；本次远端数据库已确认 up to date，但 Supabase CLI 在 `migration list --linked` 阶段返回 `failed to initialise login role: Post .../cli/login-role: EOF`。
- 导致的问题：一键生产发布在数据库实际已同步成功的情况下仍提前退出，后续 `git push`、Vercel 正式部署和线上域名验收都没有继续执行。
- 当前判断：`migration list --linked` 在这里属于发布后的辅助核对，不应覆盖前面已成功完成的 `db push` 结果；脚本需要把该步骤降级为“尽量执行、失败告警但不中断正式发布”。
- 已尝试：使用 `HOME=/Users/admin npm run deploy:prod` 真实执行发布脚本；已确认 lint、build、`git diff --check`、考勤测试、`supabase db push --yes` 全部通过，阻塞仅发生在 `migration list --linked`。
- 下一步：
  1. 调整发布脚本对 `migration list --linked` 的处理方式，保留告警但不再阻断后续正式发布；
  2. 重新执行一键生产发布并完成线上验收；
  3. 若 Supabase CLI 后续持续返回 EOF，再单独跟进 CLI/登录角色链路问题。
