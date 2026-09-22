import * as XLSX from "xlsx";
import { ShipmentRecord, JntRecord } from "../types";

/**
 * 运单号清洗函数：去除不可见字符、前后引号、科学计数法与浮点尾缀
 */
export const sanitizeWaybillNo = (no: string | undefined | null): string => {
  if (!no) return "";
  let str = String(no).trim();

  // 1. 去除零宽空格、BOM 与不可见字符
  str = str.replace(/[\u200B-\u200D\uFEFF\u00A0]/g, "");

  // 2. 去除首尾引号或多余括号
  str = str.replace(/^["']|["']$/g, "").trim();

  // 3. 处理科学计数法 (如 8.64836e+11)
  if (str.includes("e") || str.includes("E")) {
    const num = Number(str);
    if (!isNaN(num)) {
      str = num.toFixed(0);
    }
  }

  // 4. 去除多余的浮点尾缀 (如 864836334692.0)
  if (str.includes(".")) {
    const parts = str.split(".");
    if (/^0+$/.test(parts[1])) {
      str = parts[0];
    }
  }

  return str.trim();
};

/**
 * 单元格内容净化：平铺换行符为空格，避免单元格内换行撕裂行结构
 */
export const cleanCell = (v: any): string => {
  if (v === null || v === undefined) return "";
  return String(v)
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
};

/**
 * 通用纯文本表格切分器：支持引号包裹内换行的标准 CSV 与 TSV
 */
export function textToGrid(text: string): string[][] {
  if (!text || !text.trim()) return [];
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = "";
  let insideQuotes = false;
  const isTsv = text.includes("\t");

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentCell += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
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

/**
 * 系统发货表格（order_xxx.xlsx）核心解析器
 */
export function parseSystemRows(rawRows: (string | number | any)[][]): {
  records: ShipmentRecord[];
  headers: string[];
} {
  if (!rawRows || rawRows.length === 0) {
    return { records: [], headers: [] };
  }

  // 1. 定位表头锚点行
  let headerRowIdx = -1;
  for (let i = 0; i < Math.min(rawRows.length, 15); i++) {
    const row = rawRows[i].map(cleanCell);
    if (row.includes("运单号") || row.includes("客户") || row.includes("包裹号") || row.includes("客户代码")) {
      headerRowIdx = i;
      break;
    }
  }
  if (headerRowIdx === -1) headerRowIdx = 0;

  const headerRow = rawRows[headerRowIdx].map(cleanCell);
  const headers = headerRow.filter(Boolean);

  // 2. 构建确切列名字典映射
  const colMap = new Map<string, number>();
  headerRow.forEach((name, idx) => {
    if (name) colMap.set(name, idx);
  });

  // 运单号
  let waybillIdx = colMap.has("运单号") ? colMap.get("运单号")! : -1;
  if (waybillIdx === -1) {
    for (const [name, idx] of colMap.entries()) {
      if (name === "运单编号" || name.toLowerCase() === "waybill" || name.toLowerCase() === "tracking") {
        waybillIdx = idx;
        break;
      }
    }
  }

  // 客户名称：必须精准匹配 "客户" 或 "客户名称"，严禁被 "客户代码" 覆盖
  let customerIdx = colMap.has("客户") ? colMap.get("客户")! : -1;
  if (customerIdx === -1 && colMap.has("客户名称")) {
    customerIdx = colMap.get("客户名称")!;
  }
  if (customerIdx === -1) {
    for (const [name, idx] of colMap.entries()) {
      if ((name.includes("客户") || name.includes("发货商")) && !name.includes("代码") && !name.includes("编码") && !name.includes("编号")) {
        customerIdx = idx;
        break;
      }
    }
  }

  // 客户代码
  let customerCodeIdx = colMap.has("客户代码") ? colMap.get("客户代码")! : -1;
  if (customerCodeIdx === -1 && colMap.has("客户编码")) {
    customerCodeIdx = colMap.get("客户编码")!;
  }

  // 收件人：精准匹配，严禁被 "收件人公司名称" 覆盖
  let recipientIdx = colMap.has("收件人") ? colMap.get("收件人")! : -1;
  if (recipientIdx === -1 && colMap.has("收件人姓名")) {
    recipientIdx = colMap.get("收件人姓名")!;
  }
  if (recipientIdx === -1) {
    for (const [name, idx] of colMap.entries()) {
      if ((name.includes("收件人") || name.includes("收货人")) && !name.includes("公司")) {
        recipientIdx = idx;
        break;
      }
    }
  }

  // 手机号
  let phoneIdx = colMap.has("手机号") ? colMap.get("手机号")! : -1;
  if (phoneIdx === -1) {
    for (const [name, idx] of colMap.entries()) {
      if (name.includes("手机") || name.includes("电话") || name.toLowerCase().includes("phone") || name.toLowerCase().includes("mobile")) {
        phoneIdx = idx;
        break;
      }
    }
  }

  // 重量字段（克自动转换为千克）
  const weightGIdx = colMap.has("包裹重量(g)") ? colMap.get("包裹重量(g)")! : -1;
  let weightKgIdx = colMap.has("包裹重量") ? colMap.get("包裹重量")! : -1;
  if (weightKgIdx === -1 && colMap.has("重量(kg)")) weightKgIdx = colMap.get("重量(kg)")!;

  // 订单号与包裹号
  const orderNoIdx = colMap.has("平台订单号") ? colMap.get("平台订单号")! : (colMap.has("订单号") ? colMap.get("订单号")! : -1);
  const packageNoIdx = colMap.has("包裹号") ? colMap.get("包裹号")! : (colMap.has("ERP包裹号") ? colMap.get("ERP包裹号")! : -1);

  // 3. 提取数据行
  const records: ShipmentRecord[] = [];

  for (let i = headerRowIdx + 1; i < rawRows.length; i++) {
    const row = rawRows[i].map(cleanCell);
    if (!row || row.every((c) => !c)) continue;

    const rawWaybill = waybillIdx >= 0 && waybillIdx < row.length ? row[waybillIdx] : (row[0] || "");
    const waybillNo = sanitizeWaybillNo(rawWaybill);

    // 过滤无单号行或合计统计行
    if (!waybillNo || waybillNo.includes("合计") || waybillNo.includes("总计")) {
      continue;
    }

    const customerName = (customerIdx >= 0 && customerIdx < row.length ? row[customerIdx] : "") || "未知客户";
    const recipientName = (recipientIdx >= 0 && recipientIdx < row.length ? row[recipientIdx] : "") || "-";
    const recipientPhone = phoneIdx >= 0 && phoneIdx < row.length ? row[phoneIdx] : "";
    const customerCode = customerCodeIdx >= 0 && customerCodeIdx < row.length ? row[customerCodeIdx] : "";
    const orderNo = orderNoIdx >= 0 && orderNoIdx < row.length ? row[orderNoIdx] : "";
    const packageNo = packageNoIdx >= 0 && packageNoIdx < row.length ? row[packageNoIdx] : "";

    // 重量换算：如果是包裹重量(g)，除以 1000 转为 kg
    let weight = 0;
    if (weightGIdx >= 0 && weightGIdx < row.length && row[weightGIdx]) {
      const g = parseFloat(row[weightGIdx].replace(/[^0-9.]/g, "")) || 0;
      weight = parseFloat((g / 1000).toFixed(3));
    } else if (weightKgIdx >= 0 && weightKgIdx < row.length && row[weightKgIdx]) {
      weight = parseFloat(row[weightKgIdx].replace(/[^0-9.]/g, "")) || 0;
    }

    const rawValues: Record<string, string> = {};
    headerRow.forEach((colName, cIdx) => {
      if (colName && cIdx < row.length) {
        rawValues[colName] = row[cIdx];
      }
    });

    records.push({
      waybillNo,
      customerName,
      recipientName,
      recipientPhone,
      weight,
      orderNo,
      packageNo,
      customerCode,
      sourceText: row.join("\t"),
      rawValues
    });
  }

  return { records, headers };
}

/**
 * J&T 官方结算对账表（VIPxxx.xlsx）核心解析器
 */
export function parseJntRows(rawRows: (string | number | any)[][]): {
  records: JntRecord[];
  headers: string[];
} {
  if (!rawRows || rawRows.length === 0) {
    return { records: [], headers: [] };
  }

  // 1. 定位表头锚点行
  let headerRowIdx = -1;
  for (let i = 0; i < Math.min(rawRows.length, 15); i++) {
    const row = rawRows[i].map(cleanCell);
    if (row.includes("运单编号") || row.includes("总运费") || row.includes("客户所属网点") || row.includes("客户编码")) {
      headerRowIdx = i;
      break;
    }
  }
  if (headerRowIdx === -1) headerRowIdx = 0;

  const headerRow = rawRows[headerRowIdx].map(cleanCell);
  const headers = headerRow.filter(Boolean);

  // 2. 构建列名字典映射
  const colMap = new Map<string, number>();
  headerRow.forEach((name, idx) => {
    if (name) colMap.set(name, idx);
  });

  const waybillIdx = colMap.has("运单编号") ? colMap.get("运单编号")! : (colMap.has("运单号") ? colMap.get("运单号")! : -1);
  const totalFeeIdx = colMap.has("总运费") ? colMap.get("总运费")! : (colMap.has("结算金额") ? colMap.get("结算金额")! : -1);
  const baseFeeIdx = colMap.has("运费") ? colMap.get("运费")! : -1;
  const remoteFeeIdx = colMap.has("偏远费") ? colMap.get("偏远费")! : -1;
  const insuranceFeeIdx = colMap.has("保价费") ? colMap.get("保价费")! : -1;
  const packageFeeIdx = colMap.has("包材费") ? colMap.get("包材费")! : -1;
  const weightIdx = colMap.has("包裹重量") ? colMap.get("包裹重量")! : (colMap.has("重量") ? colMap.get("重量")! : -1);

  const entryTimeIdx = colMap.has("录入时间") ? colMap.get("录入时间")! : -1;
  const signTimeIdx = colMap.has("签收时间") ? colMap.get("签收时间")! : -1;
  const branchNameIdx = colMap.has("客户所属网点") ? colMap.get("客户所属网点")! : (colMap.has("网点") ? colMap.get("网点")! : -1);
  const mgmtTypeIdx = colMap.has("管理方式") ? colMap.get("管理方式")! : -1;
  const bizModeIdx = colMap.has("经营模式") ? colMap.get("经营模式")! : -1;
  const customerCodeIdx = colMap.has("客户编码") ? colMap.get("客户编码")! : -1;
  const customerNameIdx = colMap.has("客户名称") ? colMap.get("客户名称")! : -1;
  const payCycleIdx = colMap.has("付款周期") ? colMap.get("付款周期")! : -1;
  const productTypeIdx = colMap.has("产品类型") ? colMap.get("产品类型")! : -1;
  const shippingMethodIdx = colMap.has("寄件方式") ? colMap.get("寄件方式")! : -1;
  const itemTypeIdx = colMap.has("物品类型") ? colMap.get("物品类型")! : -1;

  // 3. 提取数据行并严格过滤尾部合计行
  const records: JntRecord[] = [];

  for (let i = headerRowIdx + 1; i < rawRows.length; i++) {
    const row = rawRows[i].map(cleanCell);
    if (!row || row.every((c) => !c)) continue;

    const rawWaybill = waybillIdx >= 0 && waybillIdx < row.length ? row[waybillIdx] : "";
    const waybillNo = sanitizeWaybillNo(rawWaybill);

    // 关键：J&T 账单尾部第 71 行是财务合计行，运单编号为空，直接排除；若有合计字样也直接排除
    if (!waybillNo || waybillNo.includes("合计") || waybillNo.includes("总计")) {
      continue;
    }

    const totalFeeStr = totalFeeIdx >= 0 && totalFeeIdx < row.length ? row[totalFeeIdx] : "0";
    const jntFee = parseFloat(totalFeeStr.replace(/[^0-9.]/g, "")) || 0;

    const baseFeeStr = baseFeeIdx >= 0 && baseFeeIdx < row.length ? row[baseFeeIdx] : "0";
    const baseFee = parseFloat(baseFeeStr.replace(/[^0-9.]/g, "")) || 0;

    const remoteFeeStr = remoteFeeIdx >= 0 && remoteFeeIdx < row.length ? row[remoteFeeIdx] : "0";
    const remoteFee = parseFloat(remoteFeeStr.replace(/[^0-9.]/g, "")) || 0;

    const insuranceFeeStr = insuranceFeeIdx >= 0 && insuranceFeeIdx < row.length ? row[insuranceFeeIdx] : "0";
    const insuranceFee = parseFloat(insuranceFeeStr.replace(/[^0-9.]/g, "")) || 0;

    const packageFeeStr = packageFeeIdx >= 0 && packageFeeIdx < row.length ? row[packageFeeIdx] : "0";
    const packageFee = parseFloat(packageFeeStr.replace(/[^0-9.]/g, "")) || 0;

    const weightStr = weightIdx >= 0 && weightIdx < row.length ? row[weightIdx] : "0";
    const weight = parseFloat(weightStr.replace(/[^0-9.]/g, "")) || 0;

    const entryTime = entryTimeIdx >= 0 && entryTimeIdx < row.length ? row[entryTimeIdx] : "";
    const signTime = signTimeIdx >= 0 && signTimeIdx < row.length ? row[signTimeIdx] : "";
    const branchName = branchNameIdx >= 0 && branchNameIdx < row.length ? row[branchNameIdx] : "";
    const mgmtType = mgmtTypeIdx >= 0 && mgmtTypeIdx < row.length ? row[mgmtTypeIdx] : "";
    const bizMode = bizModeIdx >= 0 && bizModeIdx < row.length ? row[bizModeIdx] : "";
    const customerCode = customerCodeIdx >= 0 && customerCodeIdx < row.length ? row[customerCodeIdx] : "";
    const customerName = customerNameIdx >= 0 && customerNameIdx < row.length ? row[customerNameIdx] : "";
    const payCycle = payCycleIdx >= 0 && payCycleIdx < row.length ? row[payCycleIdx] : "";
    const productType = productTypeIdx >= 0 && productTypeIdx < row.length ? row[productTypeIdx] : "";
    const shippingMethod = shippingMethodIdx >= 0 && shippingMethodIdx < row.length ? row[shippingMethodIdx] : "";
    const itemType = itemTypeIdx >= 0 && itemTypeIdx < row.length ? row[itemTypeIdx] : "";

    const rawValues: Record<string, string> = {};
    headerRow.forEach((colName, cIdx) => {
      if (colName && cIdx < row.length) {
        rawValues[colName] = row[cIdx];
      }
    });

    records.push({
      waybillNo,
      jntFee,
      baseFee,
      remoteFee,
      insuranceFee,
      packageFee,
      weight,
      entryTime,
      signTime,
      branchName,
      mgmtType,
      bizMode,
      customerCode,
      customerName,
      payCycle,
      productType,
      shippingMethod,
      itemType,
      sourceText: row.join("\t"),
      rawValues
    });
  }

  return { records, headers };
}

/**
 * 纯文本粘贴解析（系统订单）
 */
export function parseSystemDataText(text: string): { records: ShipmentRecord[]; headers: string[] } {
  if (!text.trim()) return { records: [], headers: [] };
  const grid = textToGrid(text);
  return parseSystemRows(grid);
}

/**
 * 纯文本粘贴解析（J&T账单）
 */
export function parseJntDataText(text: string): { records: JntRecord[]; headers: string[] } {
  if (!text.trim()) return { records: [], headers: [] };
  const grid = textToGrid(text);
  return parseJntRows(grid);
}

/**
 * 原生文件高精度解析器：支持 .xlsx / .xls 二维流式解析与 CSV/TSV
 */
export async function parseUploadedFile(
  file: File,
  target: "system" | "jnt"
): Promise<{ records: any[]; headers: string[]; previewText: string }> {
  const isExcel = file.name.endsWith(".xlsx") || file.name.endsWith(".xls");

  if (isExcel) {
    const buffer = await file.arrayBuffer();
    const data = new Uint8Array(buffer);
    const workbook = XLSX.read(data, { type: "array" });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];

    if (!worksheet) {
      throw new Error("工作表中未找到数据！");
    }

    // 单元格类型修正，防止大数字或科学计数法被错误截断
    for (const key in worksheet) {
      if (key[0] === "!") continue;
      const cell = worksheet[key];
      if (cell && cell.t === "n") {
        const val = cell.v;
        if (typeof val === "number") {
          const w = cell.w || "";
          const isSci = w.includes("e") || w.includes("E") || w.includes("+");
          const isLargeInt = val >= 1000000 && Number.isInteger(val);
          if (isSci || isLargeInt) {
            cell.t = "s";
            cell.v = String(val);
            cell.w = String(val);
          }
        }
      }
    }

    const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      raw: false,
      defval: ""
    });

    const result = target === "system" ? parseSystemRows(rows) : parseJntRows(rows);

    // 生成前 60 行预览文本用于在界面的粘贴框中回显
    const previewRows = rows.slice(0, 60).map((r) => r.map(cleanCell).join("\t"));
    const previewText = previewRows.join("\n");

    return {
      records: result.records,
      headers: result.headers,
      previewText
    };
  } else {
    // CSV / TSV / 文本文件
    const buffer = await file.arrayBuffer();
    let text = "";
    try {
      const utf8Decoder = new TextDecoder("utf-8", { fatal: true });
      text = utf8Decoder.decode(buffer);
    } catch {
      try {
        const thaiDecoder = new TextDecoder("windows-874");
        text = thaiDecoder.decode(buffer);
      } catch {
        const fallbackDecoder = new TextDecoder("utf-8");
        text = fallbackDecoder.decode(buffer);
      }
    }

    const grid = textToGrid(text);
    const result = target === "system" ? parseSystemRows(grid) : parseJntRows(grid);
    return {
      records: result.records,
      headers: result.headers,
      previewText: text
    };
  }
}

/**
 * 兼容旧版的纯文本读取函数
 */
export async function readUploadedFileAsText(file: File): Promise<string> {
  const parsed = await parseUploadedFile(file, "system");
  return parsed.previewText;
}

/**
 * 兼容旧版的单元格行切分函数
 */
export const splitCells = (line: string): string[] => {
  if (!line) return [];
  if (line.includes("\t")) {
    return line.split("\t").map(cleanCell);
  }
  return line.split(/[,;]|\s{2,}/).map(cleanCell);
};

/**
 * 兼容旧版的表头索引探测函数
 */
export function resolveHeaderIndexes(lines: string[], isJnt: boolean) {
  const grid = lines.map((l) => splitCells(l));
  const res = isJnt ? parseJntRows(grid) : parseSystemRows(grid);
  return {
    waybillIdx: 0,
    customerIdx: isJnt ? -1 : 1,
    recipientIdx: isJnt ? -1 : 2,
    phoneIdx: -1,
    feeIdx: 1,
    weightIdx: -1,
    entryTimeIdx: -1,
    signTimeIdx: -1,
    branchNameIdx: -1,
    mgmtTypeIdx: -1,
    bizModeIdx: -1,
    customerCodeIdx: -1,
    customerNameIdx: -1,
    payCycleIdx: -1,
    productTypeIdx: -1,
    shippingMethodIdx: -1,
    itemTypeIdx: -1,
    baseFeeIdx: -1,
    remoteFeeIdx: -1,
    insuranceFeeIdx: -1,
    packageFeeIdx: -1,
    headerEndLine: 1,
    mergedHeaders: res.headers.map((text, idx) => ({ idx, text }))
  };
}
