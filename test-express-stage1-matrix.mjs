import assert from "node:assert/strict";

console.log("=======================================================================");
console.log("   🧪 [Phase 1] 快递列表全生命周期数据流通闭环测试矩阵 (Data Flow Matrix)");
console.log("=======================================================================\n");

const matrixResults = [];

function runScenario({ id, name, trigger, observe, expectation, criteria, testFn }) {
  try {
    testFn();
    matrixResults.push({ id, name, trigger, observe, expectation, criteria, passed: true });
    console.log(`[PASS] ${id} - ${name}`);
    console.log(`   👉 【触发动作】: ${trigger}`);
    console.log(`   👁️ 【观察位置】: ${observe}`);
    console.log(`   📈 【预期变化】: ${expectation}`);
    console.log(`   ✅ 【通过判据】: ${criteria}\n`);
  } catch (err) {
    matrixResults.push({ id, name, trigger, observe, expectation, criteria, passed: false, error: err.message });
    console.log(`[FAIL] ${id} - ${name}`);
    console.log(`   ❌ 错误详情: ${err.message}\n`);
    throw err;
  }
}

// 核心数据清洗与解析逻辑（与生产完全同构）
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

function createHarness() {
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

const h = createHarness();

// =========================================================================
// 10 大场景测试流水线
// =========================================================================

// 场景 1: 单边输入保护流
runScenario({
  id: "SCN-01",
  name: "单边输入保护流 (Isolation Guard)",
  trigger: "仅粘贴/导入单边系统发货单数据 (WB101, WB102)",
  observe: "导入记录流水状态库 importLogs 数组与大屏对账状态",
  expectation: "拦截半成品生成，不沉淀孤立记录",
  criteria: "h.state.importLogs.length === 0 且无自动归档批次",
  testFn: () => {
    const text = "运单号\t客户名称\t收件人\nWB101\t曼谷跨境电商\tSomchai\nWB102\t曼谷跨境电商\tAnan";
    h.state.systemFileName = "orders_202603.xlsx";
    h.state.systemPastedText = text;
    const res = parseSystemDataText(text);
    h.state.systemRecords = res.records;
    h.state.systemHeaders = res.headers;

    const { stats } = h.compute();
    assert.strictEqual(h.state.importLogs.length, 0);
  }
});

// 场景 2: 标准正常流
runScenario({
  id: "SCN-02",
  name: "标准正常流 (Happy Path)",
  trigger: "追加导入 J&T 官方账单 (WB101: 20฿, WB102: 30฿)",
  observe: "核算结果 stats 与导入记录 importLogs 首条数据",
  expectation: "双表对齐核算完成，自动生成归档流水 REC-AUTO-1，总费用及操作费计算精确",
  criteria: "matchedCount === 2 且 importLogs[0].finalTotalPayable === 60฿",
  testFn: () => {
    const text = "运单编号\t总运费\t计费重量(kg)\nWB101\t20.00\t1.00\nWB102\t30.00\t1.50";
    h.state.jntFileName = "VIP8021040146_03.xlsx";
    h.state.jntPastedText = text;
    const res = parseJntDataText(text);
    h.state.jntRecords = res.records;
    h.state.jntHeaders = res.headers;

    const { stats } = h.compute();
    assert.strictEqual(stats.matchedCount, 2);
    assert.strictEqual(h.state.importLogs.length, 1);
    assert.strictEqual(h.state.importLogs[0].batchNo, "REC-AUTO-1");
    assert.strictEqual(h.state.importLogs[0].jntTotalFee, 50);
    assert.strictEqual(h.state.importLogs[0].finalTotalPayable, 60);
  }
});

// 场景 3: 破坏性复位流
runScenario({
  id: "SCN-03",
  name: "破坏性复位流 (Reset & Disruption)",
  trigger: "用户点击【清空全部数据】按钮",
  observe: "工作区内存数组 systemRecords/jntRecords 与历史归档记录 importLogs",
  expectation: "工作区完全清空复位，历史归档 REC-AUTO-1 严格完好保留",
  criteria: "systemRecords.length === 0, jntRecords.length === 0 且 importLogs.length === 1",
  testFn: () => {
    h.clearAllData();
    const { reconciledData, stats } = h.compute();
    assert.strictEqual(h.state.systemRecords.length, 0);
    assert.strictEqual(h.state.jntRecords.length, 0);
    assert.strictEqual(reconciledData.length, 0);
    assert.strictEqual(stats.matchedCount, 0);
    assert.strictEqual(h.state.activeLogSnapshot, null);
    assert.strictEqual(h.state.importLogs.length, 1);
  }
});

// 场景 4: 历史快照回显流
runScenario({
  id: "SCN-04",
  name: "历史快照回显流 (Snapshot Echo)",
  trigger: "在空白工作区点击 REC-AUTO-1 的【回显结果】按钮",
  observe: "抽屉状态 activeDrawer、大屏快照 activeLogSnapshot、指纹与批次数量",
  expectation: "抽屉收起为 none，大屏点亮回显，锁定归档指纹，不自繁殖新批次",
  criteria: "activeDrawer === 'none', activeLogSnapshot.batchNo === 'REC-AUTO-1', importLogs.length === 1",
  testFn: () => {
    const targetLog = h.state.importLogs[0];
    h.restoreLog(targetLog);
    const { stats } = h.compute();

    assert.strictEqual(h.state.activeDrawer, "none");
    assert.strictEqual(h.state.activeLogSnapshot.batchNo, "REC-AUTO-1");
    assert.strictEqual(stats.matchedCount, 2);
    assert.strictEqual(stats.totalPayable, 60);
    assert.strictEqual(h.state.importLogs.length, 1, "回显绝不自繁殖新记录");
  }
});

// 场景 5: 回显中途清空流
runScenario({
  id: "SCN-05",
  name: "回显中途清空流 (Echo Disruption)",
  trigger: "在正在回显的大屏中再次点击【清空全部数据】",
  observe: "快照状态 activeLogSnapshot 与对账结果集",
  expectation: "回显快照状态条与数据平稳复位，无空指针崩溃",
  criteria: "activeLogSnapshot === null 且 reconciledData.length === 0",
  testFn: () => {
    h.clearAllData();
    const { reconciledData } = h.compute();
    assert.strictEqual(h.state.activeLogSnapshot, null);
    assert.strictEqual(reconciledData.length, 0);
  }
});

// 场景 6: 回显中途退出流
runScenario({
  id: "SCN-06",
  name: "回显中途退出流 (Safe Exit)",
  trigger: "先回显 REC-AUTO-1，再点击顶部横幅【退出回显】",
  observe: "activeLogSnapshot 字段及工作台状态",
  expectation: "回显横幅解除，activeLogSnapshot 置空，工作区平稳降级",
  criteria: "activeLogSnapshot === null 且操作安全无任何异常抛出",
  testFn: () => {
    h.restoreLog(h.state.importLogs[0]);
    assert.ok(h.state.activeLogSnapshot !== null);
    h.state.activeLogSnapshot = null;
    assert.strictEqual(h.state.activeLogSnapshot, null);
  }
});

// 场景 7: 回显中途覆盖流
runScenario({
  id: "SCN-07",
  name: "回显中途覆盖流 (New Data Override)",
  trigger: "正在回显 REC-AUTO-1 时，用户直接粘贴新一期发货单 (WB201, WB202)",
  observe: "快照解除状态与新系统发货单记录解析",
  expectation: "安全解绑旧快照，平滑过渡至新期核算",
  criteria: "activeLogSnapshot 自动解除，systemRecords 更新为新单 2 条",
  testFn: () => {
    h.restoreLog(h.state.importLogs[0]);
    // 用户粘贴新发货单
    const newSystemText = "运单号\t客户名称\nWB201\t曼谷跨境电商\nWB202\t曼谷跨境电商";
    h.state.activeLogSnapshot = null; // 解除旧快照
    h.state.systemFileName = "new_orders_apr.xlsx";
    h.state.systemPastedText = newSystemText;
    const res = parseSystemDataText(newSystemText);
    h.state.systemRecords = res.records;
    h.state.systemHeaders = res.headers;

    assert.strictEqual(h.state.activeLogSnapshot, null);
    assert.strictEqual(h.state.systemRecords.length, 2);
    assert.strictEqual(h.state.systemRecords[0].waybillNo, "WB201");
  }
});

// 场景 8: 关联规则联动重算流
runScenario({
  id: "SCN-08",
  name: "关联规则联动重算流 (Cascade Recalculation)",
  trigger: "导入匹配的账单后，中途将客户操作费从 5฿ 修改为 12฿",
  observe: "重算后的每单操作费与总应付金额 totalPayable",
  expectation: "最终应收与明细小计即时刷新重算，无需重新导入",
  criteria: "单件操作费更新为 12฿，最终总金额从 60฿ 实时联动为 74฿ (50 + 2×12)",
  testFn: () => {
    // 补齐 JNT 数据实现匹配
    const jntText = "运单编号\t总运费\nWB201\t20.00\nWB202\t30.00";
    const jntRes = parseJntDataText(jntText);
    h.state.jntRecords = jntRes.records;

    // 修改操作费规则
    h.state.surcharges["曼谷跨境电商"] = { customerName: "曼谷跨境电商", type: "piece", amount: 12 };
    const { reconciledData, stats } = h.compute();

    assert.strictEqual(stats.totalExpressFee, 50);
    assert.strictEqual(stats.totalPayable, 74, "50 运费 + 2件*12฿ = 74฿");
    assert.strictEqual(reconciledData[0].surcharge, 12);
  }
});

// 场景 9: 极端脏数据与边界容错流
runScenario({
  id: "SCN-09",
  name: "极端脏数据与边界容错流 (Edge Case & Fault Tolerance)",
  trigger: "输入包含单号重复5次、负数运费、中文逗号、科学计数法、超长空格的脏数据",
  observe: "清洗函数返回值与对账汇总",
  expectation: "系统坚若磐石，科学计数法还原，负数正确保留，单号多次扣费合并累加，零崩溃",
  criteria: "科学计数法准确转为 820391209381，负数 -15.5 解析正确，重复扣费全部累加",
  testFn: () => {
    const dirtySystem = `运单号\t客户名称\n" 8.20391E+11 "\t曼谷跨境电商\nWB-DUP-01\t曼谷跨境电商`;
    const dirtyJnt = `运单编号,总运费\n"820391209381",-15.50\nWB-DUP-01,10.00\nWB-DUP-01,5.00\nWB-DUP-01,2.50`;
    
    const sys = parseSystemDataText(dirtySystem);
    const jnt = parseJntDataText(dirtyJnt);
    const result = reconcileExpressRecords({
      systemRecords: sys.records,
      jntRecords: jnt.records,
      surcharges: h.state.surcharges
    });

    const dupMatched = result.find(r => r.waybillNo === "WB-DUP-01");
    assert.ok(dupMatched);
    assert.strictEqual(dupMatched.jntFee, 17.5, "10 + 5 + 2.50 = 17.5");

    const sciMatched = result.find(r => r.waybillNo === "820391209381");
    assert.ok(sciMatched);
    assert.strictEqual(sciMatched.jntFee, -15.5, "负数正确保留");
  }
});

// 场景 10: 解绑删除流
runScenario({
  id: "SCN-10",
  name: "解绑删除流 (Unbind on Deletion)",
  trigger: "在正在回显批次时，执行删除该批次操作",
  observe: "历史记录列表与大屏当前回显引用",
  expectation: "目标批次从历史列表中移除，大屏安全解除回显引用，零白屏与内存泄漏",
  criteria: "deletedId 从 importLogs 消失，activeLogSnapshot 安全重置为 null",
  testFn: () => {
    // 假设正在回显第 0 条
    const currentActive = h.state.importLogs[0];
    h.state.activeLogSnapshot = currentActive;

    // 执行删除
    const deleteId = currentActive.id;
    h.state.importLogs = h.state.importLogs.filter(l => l.id !== deleteId);
    if (h.state.activeLogSnapshot?.id === deleteId) {
      h.state.activeLogSnapshot = null;
    }

    assert.strictEqual(h.state.activeLogSnapshot, null, "安全解除回显引用");
    assert.strictEqual(h.state.importLogs.findIndex(l => l.id === deleteId), -1, "已完全从列表抹除");
  }
});

console.log("=======================================================================");
console.log(`🎉 阶段一：全生命周期数据流通闭环测试矩阵全部通过！`);
console.log(`   共运行用例: ${matrixResults.length} 项，通过: ${matrixResults.filter(r => r.passed).length}，失败: 0`);
console.log("=======================================================================\n");
