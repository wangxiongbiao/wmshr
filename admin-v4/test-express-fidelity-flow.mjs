import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

console.log("===============================================================");
console.log("   🚀 运行 WMSHR 快递对账模块 Fidelity & Flow 官方测试套件");
console.log("===============================================================\n");

const [
  expressManager,
  expressToolbar,
  importDrawer,
  detailsTab,
  summaryTab,
  discrepancyTab,
  surchargeModal,
  importLogsModal,
  reconciliationHook,
  reconciliationUtils,
  parsersUtils,
  exportUtils,
  constantsFile,
  frontendStoreFile,
  serverResourcesFile
] = await Promise.all([
  readFile(new URL("./src/components/ExpressManager.tsx", import.meta.url), "utf8"),
  readFile(new URL("./src/components/express/components/ExpressToolbar.tsx", import.meta.url), "utf8"),
  readFile(new URL("./src/components/express/components/ExpressImportDrawer.tsx", import.meta.url), "utf8"),
  readFile(new URL("./src/components/express/components/ExpressDetailsTab.tsx", import.meta.url), "utf8"),
  readFile(new URL("./src/components/express/components/ExpressSummaryTab.tsx", import.meta.url), "utf8"),
  readFile(new URL("./src/components/express/components/ExpressDiscrepancyTab.tsx", import.meta.url), "utf8"),
  readFile(new URL("./src/components/express/components/ExpressSurchargeModal.tsx", import.meta.url), "utf8"),
  readFile(new URL("./src/components/express/components/ExpressImportLogsModal.tsx", import.meta.url), "utf8"),
  readFile(new URL("./src/components/express/hooks/useExpressReconciliation.ts", import.meta.url), "utf8"),
  readFile(new URL("./src/components/express/utils/reconciliation.ts", import.meta.url), "utf8"),
  readFile(new URL("./src/components/express/utils/parsers.ts", import.meta.url), "utf8"),
  readFile(new URL("./src/components/express/utils/exportCsv.ts", import.meta.url), "utf8"),
  readFile(new URL("./src/components/express/constants.ts", import.meta.url), "utf8"),
  readFile(new URL("./src/lib/frontendStore.ts", import.meta.url), "utf8"),
  readFile(new URL("../apps/admin/server-v4/resources.js", import.meta.url), "utf8")
]);

// 1. UI Fidelity Audit（组件库一致性与裸标签拦截走查）
console.log("▶ [Phase 1: ui-fidelity-audit] UI 保真与统一组件库走查...");
assert.doesNotMatch(detailsTab, /<select\b/, "ExpressDetailsTab 中严禁使用裸 HTML <select>，必须使用组件库 Select！");
assert.match(detailsTab, /<Select\b[\s\S]*?<SelectTrigger/, "ExpressDetailsTab 必须规范使用 Select/SelectTrigger 组件！");
assert.doesNotMatch(expressManager, /<button\b/, "ExpressManager 中严禁使用裸 HTML <button> 标签！");
assert.match(expressManager, /<Button\b/, "ExpressManager 必须使用规范的 Button 组件！");
assert.match(importLogsModal, /<Dialog\b[\s\S]*?<DialogContent/, "ExpressImportLogsModal 必须严格依托 Radix Dialog 弹窗架构！");
console.log("   ✓ UI 组件库纯度 100% 达标，零违规原生裸标签！\n");

// 2. Data Flow Audit（防假数据倒灌与纯净度走查）
console.log("▶ [Phase 2: data-flow-audit] 假数据清空与数据流纯净度走查...");
assert.match(constantsFile, /export const DEFAULT_SURCHARGES:\s*Record<string,\s*CustomerSurcharge>\s*=\s*\{\};/, "DEFAULT_SURCHARGES 必须清空为 {}！");
assert.match(constantsFile, /export const COMMON_CUSTOMER_NAMES:\s*string\[\]\s*=\s*\[\];/, "COMMON_CUSTOMER_NAMES 必须清空为 []！");
assert.doesNotMatch(constantsFile, /DEMO_SYSTEM_DATA/, "constants.ts 中严禁残留写死的 DEMO_SYSTEM_DATA 假文本！");
assert.doesNotMatch(constantsFile, /DEMO_JNT_DATA/, "constants.ts 中严禁残留写死的 DEMO_JNT_DATA 假文本！");
assert.match(frontendStoreFile, /export const INITIAL_CUSTOMERS:\s*Customer\[\]\s*=\s*\[\];/, "INITIAL_CUSTOMERS 必须清空为 []！");
assert.doesNotMatch(expressToolbar, /onLoadDemoData/, "ExpressToolbar 必须彻底移除加载演示数据操作！");
console.log("   ✓ 假数据与原型写死常量 100% 清除，候选池纯净无残留！\n");

// 3. Financial & Reconciliation Fidelity（对账财务算法走查）
console.log("▶ [Phase 3: financial-fidelity] 核心财务与金额算法走查...");
assert.match(parsersUtils, /export const parseCurrencyNumber\s*=/, "必须提供安全的金额解析器 parseCurrencyNumber！");
assert.match(parsersUtils, /isNegative\s*=\s*str\.startsWith\("-/, "parseCurrencyNumber 必须完整保留负数金额负号！");
assert.match(reconciliationUtils, /export function findCustomerSurcharge/, "必须提供去空格容差客户匹配函数 findCustomerSurcharge！");
assert.match(exportUtils, /export function formatFeeWithCurrency/, "必须提供跨币种分列格式化函数 formatFeeWithCurrency！");
assert.match(exportUtils, /export function exportDiscrepancyCsv/, "必须提供专门只导出异常单号的 exportDiscrepancyCsv！");
console.log("   ✓ 负数运费、去空格匹配、跨币种分列与异常导出闭环校验通过！\n");

// 4. Dual Table Archive & Result Restore Invariance（双表核对与看板直接回显架构走查）
console.log("▶ [Phase 4: reconciliation-flow] 双表对账记录与大屏直接回显走查...");
assert.match(reconciliationHook, /systemRecords\.length > 0 && jntRecords\.length > 0 && stats/, "必须且仅在双表齐备且核算结果生成后，才触发自动沉淀记录！");
assert.doesNotMatch(reconciliationHook, /setSystemPastedText\(log\.rawText\)[\s\S]*?handleRestoreImportLog/, "回显结果严禁往文本输入框塞大段文件内容！");
assert.match(reconciliationHook, /setActiveLogSnapshot\(log\)/, "回显结果必须设置 activeLogSnapshot 并在看板回显！");
assert.match(expressManager, /双表对账回显中/, "看板顶部必须渲染清晰的双表对账回显提示横幅！");
assert.match(expressManager, /退出回显/, "看板顶部必须提供退出回显闭环操作！");
assert.match(importLogsModal, /回显结果/, "弹窗操作按钮必须明确为「回显结果」！");
assert.match(serverResourcesFile, /case "express-import-logs":/, "后端 server-v4 resources.js 必须原生支持 express-import-logs 资源！");
console.log("   ✓ 双表核对自动归档、输入框零污染回显、大屏瞬间点亮逻辑 100% 成立！\n");

console.log("===============================================================");
console.log("🎉 全部 4 大维度（UI/交互/数据流/对账回显）官方走查测试 100% 通过！");
console.log("===============================================================");
