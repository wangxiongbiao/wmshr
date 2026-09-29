import ExcelJS from "exceljs";
import { PayrollSummary, AppConfig } from "../types";

export interface ExportPayrollExcelOptions {
  monthStr: string; // e.g. "2026-08"
  payrollRows: PayrollSummary[];
  config?: AppConfig;
  companyName?: string;
  approverName?: string;
}

export async function exportPayrollExcel(options: ExportPayrollExcelOptions): Promise<void> {
  const {
    monthStr,
    payrollRows,
    config,
    companyName = "( SHUOMAX Co., LTD. )",
    approverName = "ZHANYINGLONG"
  } = options;

  const wb = new ExcelJS.Workbook();
  wb.creator = "SHUOMAX";
  const ws = wb.addWorksheet("7");

  // Worksheet view settings: default activeCell A2, Page Break Preview ("????"), zoom 85%
  ws.views = [
    {
      state: "normal",
      style: "pageBreakPreview",
      activeCell: "A2",
      zoomScale: 85,
      zoomScaleNormal: 90,
      showGridLines: true,
      showRowColHeaders: true,
      showRuler: true
    }
  ];

  // Page setup matching template: A4 landscape, scale 56%, standard margins
  ws.pageSetup = {
    paperSize: 9,
    orientation: "landscape",
    scale: 56,
    fitToPage: false,
    margins: {
      left: 0.75,
      right: 0.75,
      top: 1,
      bottom: 1,
      header: 0.5,
      footer: 0.5
    }
  };

  // Exact column widths matching the original template
  ws.columns = [
    { key: "item", width: 7.33 },          // A: Item
    { key: "idCard", width: 40.88 },       // B: ID Card
    { key: "name", width: 31.44 },         // C: Name
    { key: "startwork", width: 17.0 },     // D: Startwork
    { key: "position", width: 15.11 },     // E: position
    { key: "salary", width: 11.33 },       // F: Salary
    { key: "incentive", width: 15.0 },     // G: Incentive
    { key: "licenseFee", width: 14.22 },   // H: License fee
    { key: "allowances", width: 14.22 },   // I: Allowances
    { key: "ot", width: 14.22 },           // J: OT
    { key: "totalIncomes", width: 13.67 }, // K: Total Incomes
    { key: "ssf", width: 12.78 },          // L: SSF
    { key: "tax", width: 12.78 },          // M: Tax
    { key: "otherExpense", width: 12.78 }, // N: Other Expense
    { key: "leaveNoPay", width: 12.78 },   // O: Leave without Pay
    { key: "totalExpenses", width: 12.78 },// P: Total Expenses
    { key: "netIncome", width: 12.11 },    // Q: Net Income
    { key: "bankAccount", width: 13.33 }   // R: Bank Account
  ];

  // Parse Year and Month
  const parts = (monthStr || "").split("-");
  const year = parts[0] || new Date().getFullYear().toString();
  const month = parts[1] || String(new Date().getMonth() + 1).padStart(2, "0");
  const monthNum = parseInt(month, 10) || month;

  // Reusable colors
  const COLOR_BLACK = "FF000000";
  const COLOR_RED = "FFFF0000";
  const COLOR_ORANGE = "FFFF6600";
  const FILL_INCOME_YELLOW = "FFFFFF99";
  const FILL_EXPENSE_PEACH = "FFFFF2CC";
  const FILL_TOTAL_CYAN = "FFCCFFFF";

  const blackBorderThin = { style: "thin" as const, color: { argb: COLOR_BLACK } };

  // Row 1: Company Header
  ws.getRow(1).height = 23.95;
  ws.mergeCells("A1:E1");
  const cA1 = ws.getCell("A1");
  cA1.value = companyName;
  cA1.font = { name: "Arial", size: 11, bold: true, color: { argb: COLOR_BLACK } };
  cA1.alignment = { vertical: "middle", horizontal: "left" };

  // Row 2: Report Title (Strictly preserves Chinese '?' and '? ?' via Unicode)
  ws.getRow(2).height = 23.95;
  const cA2 = ws.getCell("A2");
  cA2.value = `Payroll Summary Report of ( ${month}\u6708${year} \u5E74 \uFF09`;
  cA2.font = { name: "Arial", size: 11, bold: true, color: { argb: COLOR_BLACK } };
  cA2.alignment = { vertical: "middle", horizontal: "left" };

  // Row 3: Value Date (Orange text)
  ws.getRow(3).height = 23.95;
  ws.mergeCells("A3:C3");
  const cA3 = ws.getCell("A3");
  cA3.value = `Value Date : ${month}/${year}`;
  cA3.font = { name: "Arial", size: 11, bold: true, color: { argb: COLOR_ORANGE } };
  cA3.alignment = { vertical: "middle", horizontal: "left" };

  // Row 4: Incomes & Expense Category Groupings
  ws.getRow(4).height = 23.95;

  // Incomes banner (F4:K4)
  ws.mergeCells("F4:K4");
  const cIncomes = ws.getCell("F4");
  cIncomes.value = "Incomes";
  cIncomes.font = { name: "Arial", size: 11, bold: true, color: { argb: COLOR_BLACK } };
  cIncomes.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  for (let c = 6; c <= 11; c++) {
    const cell = ws.getRow(4).getCell(c);
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: FILL_INCOME_YELLOW }, bgColor: { argb: FILL_INCOME_YELLOW } };
    cell.border = {
      top: blackBorderThin,
      bottom: blackBorderThin,
      left: c === 6 ? blackBorderThin : undefined,
      right: c === 11 ? blackBorderThin : undefined
    };
  }

  // Expense banner (L4:P4) - Note: RED font
  ws.mergeCells("L4:P4");
  const cExpense = ws.getCell("L4");
  cExpense.value = "Expense";
  cExpense.font = { name: "Arial", size: 11, bold: true, color: { argb: COLOR_RED } };
  cExpense.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  for (let c = 12; c <= 16; c++) {
    const cell = ws.getRow(4).getCell(c);
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: FILL_EXPENSE_PEACH }, bgColor: { argb: FILL_EXPENSE_PEACH } };
    cell.border = {
      top: blackBorderThin,
      bottom: blackBorderThin,
      left: c === 12 ? blackBorderThin : undefined,
      right: c === 16 ? blackBorderThin : undefined
    };
  }

  // Row 5: Column Headers
  ws.getRow(5).height = 30.9;
  const headers = [
    { text: "Item", fontName: "Tahoma", isExpense: false },
    { text: "ID Card", fontName: "Tahoma", isExpense: false },
    { text: "Name", fontName: "Tahoma", isExpense: false },
    { text: "Startwork", fontName: "Tahoma", isExpense: false },
    { text: "position", fontName: "Tahoma", isExpense: false },
    { text: "Salary", fontName: "Tahoma", isExpense: false },
    { text: "Incentive", fontName: "Tahoma", isExpense: false },
    { text: "License fee", fontName: "Tahoma", isExpense: false },
    { text: "Allowances", fontName: "Tahoma", isExpense: false },
    { text: "OT", fontName: "Tahoma", isExpense: false },
    { text: "Total Incomes", fontName: "Arial", isExpense: false },
    { text: "SSF", fontName: "Tahoma", isExpense: true },
    { text: "Tax", fontName: "Tahoma", isExpense: true },
    { text: "Other Expense", fontName: "Tahoma", isExpense: true },
    { text: "Leave without Pay", fontName: "Tahoma", isExpense: true },
    { text: "Total Expenses", fontName: "Tahoma", isExpense: true },
    { text: "Net Income", fontName: "Tahoma", isExpense: false },
    { text: "Bank Account", fontName: "Arial", isExpense: false }
  ];

  headers.forEach((h, idx) => {
    const colIdx = idx + 1;
    const cell = ws.getRow(5).getCell(colIdx);
    cell.value = h.text;
    cell.font = {
      name: h.fontName,
      size: 11,
      bold: true,
      color: { argb: h.isExpense ? COLOR_RED : COLOR_BLACK }
    };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: h.isExpense ? FILL_EXPENSE_PEACH : FILL_INCOME_YELLOW },
      bgColor: { argb: h.isExpense ? FILL_EXPENSE_PEACH : FILL_INCOME_YELLOW }
    };
    cell.border = {
      top: blackBorderThin,
      bottom: blackBorderThin,
      left: colIdx === 1 ? blackBorderThin : undefined,
      right: blackBorderThin
    };
  });

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "";
    const clean = String(dateStr).split("T")[0];
    const p = clean.split("-");
    if (p.length === 3) {
      return `${parseInt(p[2], 10)}/${parseInt(p[1], 10)}/${p[0]}`;
    }
    return dateStr;
  };

  const startRow = 6;
  const taxRate = typeof config?.taxRate === "number" && !isNaN(config.taxRate) ? config.taxRate : 0.05;

  payrollRows.forEach((item, index) => {
    const r = startRow + index;
    const row = ws.getRow(r);
    row.height = 23.95;

    const emp = item.emp;
    const basePay = Math.round(Number(item.basePay || 0) * 100) / 100;
    const incentive = Math.round(Number(emp.attendanceBonus || 0) * 100) / 100;
    const licenseFee = Math.round(Number(item.licenseFee || emp.licenseFee || 0) * 100) / 100;
    const allowances = Math.round(Number(item.mealAllowance || 0) * 100) / 100;
    const ot = Math.round(Number(item.otPay || 0) * 100) / 100;
    const totalIncomesNum = basePay + incentive + licenseFee + allowances + ot;

    // SSF: Thai standard 5% of Total Incomes (or configured socialSecurity)
    const ssf = (emp.currency === "THB" || !emp.currency)
      ? (emp.socialSecurity !== undefined && emp.socialSecurity !== null && emp.socialSecurity > 0
          ? Number(emp.socialSecurity)
          : Math.round(totalIncomesNum * 0.05 * 100) / 100)
      : Number(emp.socialSecurity || 0);

    const tax = Math.round((basePay + ot + incentive) * taxRate * 100) / 100;
    const otherExpense = Math.round(Number(item.serviceFee || 0) * 100) / 100;
    const leaveWithoutPay = 0;
    const totalExpensesNum = ssf + tax + otherExpense + leaveWithoutPay;
    const netIncomeNum = totalIncomesNum - totalExpensesNum;

    // Cell values
    row.getCell(1).value = index + 1; // Item
    row.getCell(2).value = emp.idCard || "-"; // ID Card
    row.getCell(3).value = emp.name; // Name
    row.getCell(4).value = formatDate(emp.joinDate); // Startwork
    row.getCell(5).value = emp.role || "-"; // position
    row.getCell(6).value = basePay; // Salary
    row.getCell(7).value = incentive; // Incentive
    row.getCell(8).value = licenseFee; // License fee
    row.getCell(9).value = allowances; // Allowances
    row.getCell(10).value = ot; // OT
    // Total Incomes: Formula
    row.getCell(11).value = { formula: `SUM(F${r}:J${r})`, result: totalIncomesNum };
    row.getCell(12).value = ssf; // SSF
    row.getCell(13).value = tax; // Tax
    row.getCell(14).value = otherExpense; // Other Expense
    row.getCell(15).value = leaveWithoutPay; // Leave without Pay
    // Total Expenses: Formula
    row.getCell(16).value = { formula: `SUM(L${r}:O${r})`, result: totalExpensesNum };
    // Net Income: Formula
    row.getCell(17).value = { formula: `K${r}-P${r}`, result: netIncomeNum };
    row.getCell(18).value = emp.bankCardNumber || ""; // Bank Account

    // Styling per cell
    for (let c = 1; c <= 18; c++) {
      const cell = row.getCell(c);
      cell.border = {
        top: blackBorderThin,
        bottom: blackBorderThin,
        left: c === 1 ? blackBorderThin : undefined,
        right: blackBorderThin
      };

      const isExpenseCol = c >= 12 && c <= 16;
      const isBoldCol = c === 2 || c === 3 || c === 11 || c === 16 || c === 17 || c === 18;

      cell.font = {
        name: (c === 11 || c === 16 || c === 17) ? "Tahoma" : "Arial",
        size: (c === 2 || c === 3) ? 12 : 11,
        bold: isBoldCol,
        color: { argb: isExpenseCol ? COLOR_RED : COLOR_BLACK }
      };

      if (c === 1 || c === 4 || c === 5) {
        cell.alignment = { vertical: "middle", horizontal: "center" };
      } else if (c === 2 || c === 3) {
        cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
      } else if (c === 18) {
        cell.alignment = { vertical: "middle", horizontal: "center" };
      } else {
        cell.alignment = { vertical: "middle", horizontal: "right" };
        cell.numFmt = "#,##0.00";
      }
    }
  });

  const totalRowIndex = startRow + (payrollRows.length > 0 ? payrollRows.length : 1);
  const totalRow = ws.getRow(totalRowIndex);
  totalRow.height = 23.95;

  ws.mergeCells(`A${totalRowIndex}:E${totalRowIndex}`);
  const totalLabelCell = totalRow.getCell(1);
  totalLabelCell.value = " Total";
  totalLabelCell.font = { name: "Arial", size: 11, bold: true, color: { argb: COLOR_BLACK } };
  totalLabelCell.alignment = { vertical: "middle", horizontal: "center" };

  for (let c = 1; c <= 18; c++) {
    const cell = totalRow.getCell(c);
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: FILL_TOTAL_CYAN }, bgColor: { argb: FILL_TOTAL_CYAN } };
    cell.border = {
      top: blackBorderThin,
      bottom: blackBorderThin,
      left: c === 1 ? blackBorderThin : undefined,
      right: blackBorderThin
    };

    if (c >= 6 && c <= 17) {
      const colLetter = String.fromCharCode(64 + c);
      const endRow = Math.max(startRow, totalRowIndex - 1);
      cell.value = {
        formula: `SUM(${colLetter}${startRow}:${colLetter}${endRow})`
      };
      const isExpenseCol = c >= 12 && c <= 16;
      cell.font = {
        name: "Tahoma",
        size: 11,
        bold: true,
        color: { argb: isExpenseCol ? COLOR_RED : COLOR_BLACK }
      };
      cell.alignment = { vertical: "middle", horizontal: "right" };
      cell.numFmt = "#,##0.00";
    }
  }

  // Footer: Approvals & Date
  const approveRowIndex = totalRowIndex + 5;
  ws.mergeCells(`L${approveRowIndex}:P${approveRowIndex}`);
  const approveCell = ws.getCell(`L${approveRowIndex}`);
  approveCell.value = `Approved by\u2026................${approverName}.............................................. `;
  approveCell.font = { name: "Arial", size: 10 };
  approveCell.alignment = { vertical: "middle", horizontal: "center" };

  const dateRowIndex = approveRowIndex + 1;
  const now = new Date();
  const dateStr = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;
  ws.mergeCells(`L${dateRowIndex}:P${dateRowIndex}`);
  const dateCell = ws.getCell(`L${dateRowIndex}`);
  dateCell.value = `Date\u2026...........${dateStr}............................`;
  dateCell.font = { name: "Arial", size: 10 };
  dateCell.alignment = { vertical: "middle", horizontal: "center" };

  // Write and trigger browser download
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  // Matching template filename: e.g. SHUOMAX????(8??).xlsx
  link.download = `SHUOMAX\uFF5E\u5DE5\u8D44\u8868(${monthNum}\u6708\u4EFD).xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
