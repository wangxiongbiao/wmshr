import fs from "fs";
import path from "path";
import {
  DEMO_SYSTEM_DATA,
  DEMO_JNT_DATA,
  DEFAULT_SURCHARGES
} from "./src/components/express/constants";
import {
  parseSystemDataText,
  parseJntDataText
} from "./src/components/express/utils/parsers";
import {
  reconcileExpressRecords,
  computeCustomerSummary,
  computeReconciliationStats
} from "./src/components/express/utils/reconciliation";

console.log("=== 1. 测试演示数据解析 ===");
const sys = parseSystemDataText(DEMO_SYSTEM_DATA);
const jnt = parseJntDataText(DEMO_JNT_DATA);

console.log("系统发货单解析行数:", sys.records.length, "表头:", sys.headers);
console.log("J&T对账单解析行数:", jnt.records.length, "表头数:", jnt.headers.length);

if (sys.records.length !== 9) throw new Error("系统发货单期望解析 9 行，实际: " + sys.records.length);
if (jnt.records.length !== 9) throw new Error("J&T对账单期望解析 9 行，实际: " + jnt.records.length);

console.log("=== 2. 测试双向关联与穿透对账算法 ===");
const reconciled = reconcileExpressRecords({
  systemRecords: sys.records,
  jntRecords: jnt.records,
  surcharges: DEFAULT_SURCHARGES,
  matchKeyOption: "waybill_and_alt",
  systemAltKey: "订单号",
  jntAltKey: "商家订单号"
});

console.log("对账总行数:", reconciled.length);
const matched = reconciled.filter((r) => r.status === "matched");
const sysOnly = reconciled.filter((r) => r.status === "system_only");
const jntOnly = reconciled.filter((r) => r.status === "jnt_only");

console.log("匹配成功数:", matched.length);
console.log("仅系统记录数 (JNT未结):", sysOnly.length);
console.log("仅JNT账单数 (系统无单):", jntOnly.length);

// Verify alternative match (EXPR1008 matched with JNT1008_ALT via ORD-1008)
const altMatch = reconciled.find((r) => r.matchMethod === "alt_key");
console.log("穿透备选匹配运单:", altMatch ? altMatch.waybillNo : "NONE");
if (!altMatch) throw new Error("双重标识穿透匹配失败！");

console.log("=== 3. 测试客户维度汇总与最终应付款计算 ===");
const custSummary = computeCustomerSummary(reconciled, DEFAULT_SURCHARGES);
console.log("客户汇总数:", custSummary.length);

const stats = computeReconciliationStats({
  systemCount: sys.records.length,
  jntCount: jnt.records.length,
  reconciledData: reconciled,
  customerSummary: custSummary
});

console.log("财务汇总指标:", stats);
if (stats.matchedCount !== 8) throw new Error("期望匹配成功 7 单，实际: " + stats.matchedCount);
if (stats.systemOnlyCount !== 1) throw new Error("期望系统单未结算 2 单，实际: " + stats.systemOnlyCount);
if (stats.jntOnlyCount !== 1) throw new Error("期望JNT多扣费 2 单，实际: " + stats.jntOnlyCount);

console.log("=== 4. 检查 express 目录下的 UI 库合规性 ===");
const expressDir = path.resolve("admin-v4/src/components/express");
const files = fs.readdirSync(expressDir, { recursive: true }) as string[];
let nativeSelects = 0;

for (const f of files) {
  if (f.endsWith(".tsx") || f.endsWith(".ts")) {
    const code = fs.readFileSync(path.join(expressDir, f), "utf8");
    const m = code.match(/<select\b/g);
    if (m) nativeSelects += m.length;
  }
}

console.log("原生 <select> 标签数量 (应为 0):", nativeSelects);
if (nativeSelects !== 0) throw new Error("检测到原生 <select> 标签，违反 UI 库规范！");

console.log("\n✅ 所有测试全部通过！");
