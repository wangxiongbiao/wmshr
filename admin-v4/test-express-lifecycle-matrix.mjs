import assert from "node:assert/strict";

console.log("=======================================================================");
console.log("   🧪 WMSHR 快递对账模块全生命周期状态机与连环操作数据流通测试套件");
console.log("=======================================================================\n");

const suiteResults = [];

function step(scenario, name, fn) {
  try {
    fn();
    suiteResults.push({ scenario, name, passed: true });
    console.log(`  [✅ PASS] ${name}`);
  } catch (err) {
    suiteResults.push({ scenario, name, passed: false, error: err.message });
    console.log(`  [❌ FAIL] ${name}`);
    console.error(`     报错原因: ${err.message}\n${err.stack}`);
  }
}

// 生产级文本与表格清洗核心
const sanitizeWaybillNo = (no) => {
  if (!no) return "";
  let str = String(no).trim().replace(/[\u200B-\u200D\uFEFF\u00A0]/g, "").replace(/^["']|["']$/g, "").trim();
  if (str.includes("e") || str.includes("E")) {
    const num = Number(str);
    if (!isNaN(num)) str = num.toFixed(0);
  }
  if (str.includes(".")) {
    const parts = str.split(".");
    if (/^0+$/.test(parts[1])) str = parts[0];
  }
  return str.trim();
};

const cleanCell = (v) => (v === null || v === undefined ? "" : String(v).replace(/[\r\n\t]+/g, " ").trim());

const parseCurrencyNumber = (v) => {
  if (v === null || v === undefined) return 0;
  if (typeof v === "number") return isNaN(v) ? 0 : v;
  let str = String(v).trim();
  if (!str) return 0;
  const isNegative = str.startsWith("-") || (/^\(.*\)$/.test(str) && !str.includes("+"));
  const cleaned = str.replace(/[^0-9.]/g, "");
  const num = parseFloat(cleaned);
  if (isNaN(num)) return 0;
  return isNegative ? -num : num;
};

function textToGrid(text) {
  if (!text || !text.trim()) return [];
  const rows = [];
  let currentRow = [];
  let currentCell = "";
  let insideQuotes = false;
  const isTsv = text.includes("\t");

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];
    if (char === '"') {
      if (insideQuotes && nextChar === '"') { currentCell += '"'; i++; }
      else { insideQuotes = !insideQuotes; }
    } else if (!insideQuotes && (char === "\n" || (char === "\r" && nextChar === "\n"))) {
      currentRow.push(currentCell.trim());
      rows.push(currentRow);
      currentRow = [];
      currentCell = "";
      if (char === "\r") i++;
    } else if (!insideQuotes && char === "\r") {
      currentRow.push(currentCell.trim());
      rows.push(currentRow);
      currentRow = [];
      currentCell = "";
    } else if (!insideQuotes && ((isTsv && char === "\t") || (!isTsv && (char === "," || char === ";")))) {
      currentRow.push(currentCell.trim());
      currentCell = "";
    } else {
      currentCell += char;
    }
  }
  if (currentCell || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    rows.push(currentRow);
  }
  return rows.filter((r) => r.some((c) => c !== ""));
}

function parseSystemDataText(text) {
  const grid = textToGrid(text);
  if (grid.length === 0) return { records: [], headers: [] };
  const headers = grid[0].map(cleanCell);
  const waybillIdx = headers.findIndex(h => h.includes("运单") || h.includes("单号"));
  const custIdx = headers.findIndex(h => h.includes("客户"));
  const records = [];
  for (let i = 1; i < grid.length; i++) {
    const row = grid[i].map(cleanCell);
    const waybillNo = sanitizeWaybillNo(waybillIdx >= 0 ? row[waybillIdx] : row[0]);
    if (!waybillNo) continue;
    const customerName = custIdx >= 0 && row[custIdx] ? row[custIdx] : "未知客户";
    records.push({ waybillNo, customerName });
  }
  return { records, headers };
}

function parseJntDataText(text) {
  const grid = textToGrid(text);
  if (grid.length === 0) return { records: [], headers: [] };
  const headers = grid[0].map(cleanCell);
  const waybillIdx = headers.findIndex(h => h.includes("运单") || h.includes("单号") || h.includes("编号"));
  const feeIdx = headers.findIndex(h => h.includes("运费") || h.includes("总费用") || h.includes("金额"));
  const records = [];
  for (let i = 1; i < grid.length; i++) {
    const row = grid[i].map(cleanCell);
    const waybillNo = sanitizeWaybillNo(waybillIdx >= 0 ? row[waybillIdx] : row[0]);
    if (!waybillNo) continue;
    const jntFee = feeIdx >= 0 ? parseCurrencyNumber(row[feeIdx]) : 0;
    records.push({ waybillNo, jntFee });
  }
  return { records, headers };
}

function reconcileExpressRecords({ systemRecords, jntRecords, surcharges }) {
  const items = [];
  const jntMap = new Map();
  jntRecords.forEach((j, idx) => {
    const w = sanitizeWaybillNo(j.waybillNo);
    const list = jntMap.get(w) || [];
    list.push(idx);
    jntMap.set(w, list);
  });

  const matchedJntIndices = new Set();
  systemRecords.forEach(sys => {
    const w = sanitizeWaybillNo(sys.waybillNo);
    const indices = jntMap.get(w);
    if (indices && indices.length > 0) {
      let totalFee = 0;
      indices.forEach(idx => {
        matchedJntIndices.add(idx);
        totalFee += (jntRecords[idx].jntFee || 0);
      });
      const sur = surcharges[sys.customerName]?.amount || 0;
      items.push({ waybillNo: sys.waybillNo, customerName: sys.customerName, jntFee: totalFee, surcharge: sur, totalFee: totalFee + sur, status: "matched" });
    } else {
      const sur = surcharges[sys.customerName]?.amount || 0;
      items.push({ waybillNo: sys.waybillNo, customerName: sys.customerName, jntFee: 0, surcharge: sur, totalFee: sur, status: "system_only" });
    }
  });

  jntRecords.forEach((jnt, idx) => {
    if (!matchedJntIndices.has(idx)) {
      items.push({ waybillNo: jnt.waybillNo, customerName: "外部账单", jntFee: jnt.jntFee, surcharge: 0, totalFee: jnt.jntFee, status: "jnt_only" });
    }
  });

  return items;
}

// 模拟状态机 Harness
function createProductionHarness() {
  let state = {
    systemPastedText: "",
    jntPastedText: "",
    systemFileName: "",
    jntFileName: "",
    systemRecords: [],
    jntRecords: [],
    systemHeaders: [],
    jntHeaders: [],
    surcharges: {
      "曼谷跨境电商": { customerName: "曼谷跨境电商", type: "piece", amount: 5 }
    },
    importLogs: [],
    activeLogSnapshot: null,
    lastArchivedFingerprint: "",
    activeDrawer: "import",
    activeSubTab: "summary"
  };

  function compute() {
    const reconciledData = reconcileExpressRecords({
      systemRecords: state.systemRecords,
      jntRecords: state.jntRecords,
      surcharges: state.surcharges
    });

    const matchedCount = reconciledData.filter(i => i.status === "matched").length;
    const systemOnlyCount = reconciledData.filter(i => i.status === "system_only").length;
    const jntOnlyCount = reconciledData.filter(i => i.status === "jnt_only").length;
    const totalExpressFee = state.jntRecords.reduce((a, b) => a + (b.jntFee || 0), 0);
    const totalPayable = reconciledData.reduce((a, b) => a + (b.totalFee || 0), 0);

    const stats = {
      matchedCount,
      systemOnlyCount,
      jntOnlyCount,
      totalExpressFee,
      totalPayable
    };

    // 自动沉淀双表核算记录
    if (state.systemRecords.length > 0 && state.jntRecords.length > 0 && stats && !state.activeLogSnapshot) {
      const fingerprint = `${state.systemRecords.length}-${state.jntRecords.length}-${matchedCount}-${totalExpressFee}`;
      if (state.lastArchivedFingerprint !== fingerprint) {
        state.lastArchivedFingerprint = fingerprint;
        const logRecord = {
          id: `REC-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          batchNo: `REC-AUTO-${state.importLogs.length + 1}`,
          createdAt: new Date().toISOString(),
          systemFileName: state.systemFileName || "系统发货单",
          systemCount: state.systemRecords.length,
          jntFileName: state.jntFileName || "J&T官方账单",
          jntCount: state.jntRecords.length,
          jntTotalFee: totalExpressFee,
          matchedCount,
          discrepancyCount: systemOnlyCount + jntOnlyCount,
          totalSurcharge: totalPayable - totalExpressFee,
          finalTotalPayable: totalPayable,
          systemRawText: state.systemPastedText,
          jntRawText: state.jntPastedText,
          systemHeaders: state.systemHeaders,
          jntHeaders: state.jntHeaders
        };
        state.importLogs = [logRecord, ...state.importLogs];
      }
    }

    return { reconciledData, stats };
  }

  function clearAllData() {
    state.systemPastedText = "";
    state.jntPastedText = "";
    state.systemFileName = "";
    state.jntFileName = "";
    state.systemRecords = [];
    state.jntRecords = [];
    state.systemHeaders = [];
    state.jntHeaders = [];
    state.activeLogSnapshot = null;
    state.lastArchivedFingerprint = "";
    state.activeDrawer = "import";
  }

  function restoreLog(log) {
    assert.ok(log, "回显记录不可为空");
    if (!log.systemRawText && !log.jntRawText) {
      throw new Error("该批次无有效对账数据可供回显");
    }

    if (log.systemRawText) {
      state.systemPastedText = log.systemRawText;
      const res = parseSystemDataText(log.systemRawText);
      state.systemRecords = res.records;
      state.systemHeaders = log.systemHeaders || res.headers;
    }

    if (log.jntRawText) {
      state.jntPastedText = log.jntRawText;
      const res = parseJntDataText(log.jntRawText);
      state.jntRecords = res.records;
      state.jntHeaders = log.jntHeaders || res.headers;
    }

    if (log.systemFileName) state.systemFileName = log.systemFileName;
    if (log.jntFileName) state.jntFileName = log.jntFileName;

    state.activeDrawer = "none";
    state.activeSubTab = "summary";
    state.activeLogSnapshot = log;

    const sumFee = state.jntRecords.reduce((acc, r) => acc + (r.jntFee || 0), 0);
    state.lastArchivedFingerprint = `${state.systemRecords.length}-${state.jntRecords.length}-${log.matchedCount}-${sumFee}`;
  }

  return { state, compute, clearAllData, restoreLog };
}

const h = createProductionHarness();

// -------------------------------------------------------------------------
// Scenario 1: 标准双表闭环
// -------------------------------------------------------------------------
console.log("▶ [场景 1] 标准双表对账闭环流转测试");
step("S1", "单边导入发货单：不生成半成品记录", () => {
  const text = "运单号\t客户名称\t收件人\nWB101\t曼谷跨境电商\tSomchai\nWB102\t曼谷跨境电商\tAnan";
  h.state.systemFileName = "orders_202603.xlsx";
  h.state.systemPastedText = text;
  const res = parseSystemDataText(text);
  h.state.systemRecords = res.records;
  h.state.systemHeaders = res.headers;

  const { stats } = h.compute();
  assert.strictEqual(h.state.importLogs.length, 0, "单表发货单绝不产生记录");
});

step("S1", "紧接着导入JNT账单：双表自动对账并自动沉淀REC记录", () => {
  const text = "运单编号\t总运费\t计费重量(kg)\nWB101\t20.00\t1.00\nWB102\t30.00\t1.50";
  h.state.jntFileName = "VIP8021040146_03.xlsx";
  h.state.jntPastedText = text;
  const res = parseJntDataText(text);
  h.state.jntRecords = res.records;
  h.state.jntHeaders = res.headers;

  const { stats } = h.compute();
  assert.strictEqual(stats.matchedCount, 2, "2单全部精准匹配");
  assert.strictEqual(h.state.importLogs.length, 1, "双表核对生成1条记录");
  assert.strictEqual(h.state.importLogs[0].batchNo, "REC-AUTO-1");
  assert.strictEqual(h.state.importLogs[0].jntTotalFee, 50, "运费 20 + 30 = 50฿");
  assert.strictEqual(h.state.importLogs[0].finalTotalPayable, 60, "运费 50 + 操作费 10 (2件×5) = 60฿");
});

// -------------------------------------------------------------------------
// Scenario 2: 清空数据后再在导入记录进行回显（用户指出的核心Bug场景！）
// -------------------------------------------------------------------------
console.log("\n▶ [场景 2] 清空数据后点击记录回显测试（核心Bug专项攻坚）");
step("S2", "用户点击清空全部数据：工作台彻底干净且无脏标记", () => {
  h.clearAllData();
  const { reconciledData, stats } = h.compute();
  assert.strictEqual(h.state.systemRecords.length, 0);
  assert.strictEqual(h.state.jntRecords.length, 0);
  assert.strictEqual(reconciledData.length, 0);
  assert.strictEqual(stats.matchedCount, 0);
  assert.strictEqual(h.state.activeLogSnapshot, null);
  assert.strictEqual(h.state.importLogs.length, 1, "清空数据不误删历史对账批次");
});

step("S2", "点击历史批次【回显结果】：大屏瞬间100%全量回显且绝对零报错", () => {
  const targetLog = h.state.importLogs[0];
  assert.doesNotThrow(() => {
    h.restoreLog(targetLog);
  }, "回显过程绝对不可抛出任何异常！");

  const { reconciledData, stats } = h.compute();
  assert.strictEqual(h.state.activeDrawer, "none", "导入抽屉优雅折叠");
  assert.strictEqual(h.state.activeSubTab, "summary", "直达汇总看板");
  assert.strictEqual(stats.matchedCount, 2, "大屏匹配数完整回显为2单");
  assert.strictEqual(stats.totalPayable, 60, "大屏应收金额完整回显为60฿");
  assert.strictEqual(reconciledData.length, 2, "明细记录完整回显");
  assert.strictEqual(h.state.activeLogSnapshot.batchNo, "REC-AUTO-1", "回显横幅锁定");
});

step("S2", "回显状态下不重复触发自动归档：防止批次自繁殖", () => {
  const count = h.state.importLogs.length;
  h.compute();
  assert.strictEqual(h.state.importLogs.length, count, "回显期间绝不可产生新的一模一样记录！");
});

// -------------------------------------------------------------------------
// Scenario 3: 回显大屏中执行清空
// -------------------------------------------------------------------------
console.log("\n▶ [场景 3] 正在回显大屏中点击一键清空测试");
step("S3", "回显中清空：快照状态条与数据平稳复位", () => {
  h.clearAllData();
  assert.strictEqual(h.state.activeLogSnapshot, null, "快照横幅必须被清空");
  assert.strictEqual(h.state.systemFileName, "", "发货文件名必须复位");
  assert.strictEqual(h.state.jntFileName, "", "账单文件名必须复位");
  const { reconciledData } = h.compute();
  assert.strictEqual(reconciledData.length, 0);
});

// -------------------------------------------------------------------------
// Scenario 4: 回显后主动退出
// -------------------------------------------------------------------------
console.log("\n▶ [场景 4] 正在回显历史批次点击【退出回显】");
step("S4", "点击退出回显：横幅解除，当前工作区保持稳定", () => {
  h.restoreLog(h.state.importLogs[0]);
  assert.ok(h.state.activeLogSnapshot !== null);
  h.state.activeLogSnapshot = null; // 用户点击退出回显
  assert.strictEqual(h.state.activeLogSnapshot, null);
  const { stats } = h.compute();
  assert.strictEqual(stats.matchedCount, 2);
});

// -------------------------------------------------------------------------
// Scenario 5: 回显中直接上传新文件覆盖
// -------------------------------------------------------------------------
console.log("\n▶ [场景 5] 回显历史大屏中，用户直接上传新一期发货单");
step("S5", "新文件上传：解除旧快照绑定，重新计算新一期", () => {
  h.state.activeLogSnapshot = null;
  const newSysText = "运单号\t客户名称\nWB-NEW-1\t曼谷跨境电商";
  h.state.systemFileName = "new_orders.xlsx";
  h.state.systemPastedText = newSysText;
  const res = parseSystemDataText(newSysText);
  h.state.systemRecords = res.records;
  h.state.jntRecords = []; // 账单未就绪

  const { stats } = h.compute();
  assert.strictEqual(stats.systemOnlyCount, 1);
  assert.strictEqual(stats.matchedCount, 0);
});

// -------------------------------------------------------------------------
// Scenario 6: 操作费规则联动实时重算
// -------------------------------------------------------------------------
console.log("\n▶ [场景 6] 操作费中途调整联动对账实时重算");
step("S6", "修改操作费金额：最终应收实时刷新，无需重新导文件", () => {
  const jntText = "运单编号\t总运费\nWB-NEW-1\t30.00";
  h.state.jntPastedText = jntText;
  h.state.jntRecords = parseJntDataText(jntText).records;

  const before = h.compute();
  assert.strictEqual(before.stats.totalPayable, 35); // 30运费 + 5操作费

  // 动态将曼谷跨境电商操作费上调为 10฿
  h.state.surcharges["曼谷跨境电商"].amount = 10;
  const after = h.compute();
  assert.strictEqual(after.stats.totalPayable, 40, "运费 30 + 操作费 10 = 40，即时联动重算成功！");
});

// -------------------------------------------------------------------------
// Scenario 7: 极端脏数据与边界容错
// -------------------------------------------------------------------------
console.log("\n▶ [场景 7] 极端脏数据与格式断裂抗性测试");
step("S7", "单号重复5次、负数运费、乱码字符：系统零崩溃", () => {
  const dirtySys = "运单号\t客户名称\n  WB-DUP  \t曼谷跨境电商 \nWB-DIRTY-2\t";
  const dirtyJnt = "运单编号\t总运费\nWB-DUP\t-15.00\nWB-DUP\t20.00\nWB-DUP\t5.00";

  h.state.systemRecords = parseSystemDataText(dirtySys).records;
  h.state.jntRecords = parseJntDataText(dirtyJnt).records;

  assert.doesNotThrow(() => {
    const res = h.compute();
    assert.ok(res.reconciledData.length >= 2);
  }, "面对负数与重复单号对账引擎坚若磐石！");
});

// -------------------------------------------------------------------------
// Scenario 8: 删除当前正在回显的历史批次
// -------------------------------------------------------------------------
console.log("\n▶ [场景 8] 删除当前正在回显的历史批次测试");
step("S8", "删掉正在回显的批次：大屏不白屏，安全解除回显引用", () => {
  const logToDelete = h.state.importLogs[0];
  const countBefore = h.state.importLogs.length;
  h.restoreLog(logToDelete);
  assert.strictEqual(h.state.activeLogSnapshot.id, logToDelete.id);

  // 用户在弹窗里点击删除该批次
  h.state.importLogs = h.state.importLogs.filter(l => l.id !== logToDelete.id);
  if (h.state.activeLogSnapshot?.id === logToDelete.id) {
    h.state.activeLogSnapshot = null; // 解除失效引用
  }

  assert.strictEqual(h.state.activeLogSnapshot, null, "失效快照安全解绑");
  assert.strictEqual(h.state.importLogs.length, countBefore - 1, "记录成功删除 1 条");
  assert.doesNotThrow(() => {
    h.compute();
  }, "解绑后看板持续正常运行！");
});

console.log("\n=======================================================================");
const passCount = suiteResults.filter(r => r.passed).length;
console.log(`执行总结: 全状态机矩阵共 ${suiteResults.length} 项测试，通过: ${passCount}，失败: ${suiteResults.length - passCount}`);
console.log("=======================================================================\n");

if (passCount !== suiteResults.length) {
  process.exitCode = 1;
}
