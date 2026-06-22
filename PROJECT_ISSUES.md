# PROJECT_ISSUES

## 2026-06-21 问题 1
- 原因：为 `packages/i18n/src/namespaces/auth.ts` 批量补充登录/注册国际化 key 时，新增条目插入在每个语言块的最后一条文案后，但没有同时给那条原有文案补尾逗号。
- 导致的问题：执行 `npm run build:admin` 时，Vite/esbuild 在 `packages/i18n/src/namespaces/auth.ts:18:4` 报错 `Expected "}" but found "\"Google 或邮箱进入\""`，admin 构建失败。
- 解决方式：给每个语言块中新增片段前的原有最后一条文案补上逗号，再重新执行 `npm run build:admin` 验证。
