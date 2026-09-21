import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import assert from "node:assert/strict";

console.log("Starting Invoice Full-Stack Data & Interaction Flow verification...");

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 1. Component checks
const invoiceManagerPath = path.join(__dirname, "src/components/InvoiceManager.tsx");
assert(fs.existsSync(invoiceManagerPath), "InvoiceManager.tsx must exist");
const content = fs.readFileSync(invoiceManagerPath, "utf-8");

// Check duplicate declaration prevention
const decls = [];
const lines = content.split(/\r?\n/);
lines.forEach((l, i) => {
  const m = l.match(/^\s*(?:const|let|var|function)\s+([a-zA-Z0-9_]+)\s*=/);
  if (m && m[1] === "handleDeleteInvoice") {
    decls.push(i + 1);
  }
});
assert.equal(decls.length, 1, `handleDeleteInvoice must be declared exactly once, found ${decls.length}`);

// Check interactive handlers
assert.ok(content.includes("handleOpenCreate"), "Must have handleOpenCreate handler");
assert.ok(content.includes("handleOpenEdit"), "Must have handleOpenEdit handler");
assert.ok(content.includes("handleSaveInvoice"), "Must have handleSaveInvoice handler");
assert.ok(content.includes("modal-live-preview-pane"), "Must have real-time live preview pane");
assert.ok(content.includes("Loader2"), "Must include Loader2 for in-table loading state");
assert.ok(content.includes("RefreshCw"), "Must include RefreshCw icon for manual refresh button");
assert.ok(content.includes("Pagination"), "Must import and mount Pagination component");
assert.ok(content.includes("TableHorizontalScroller"), "Must provide TableHorizontalScroller component");
assert.ok(content.includes("MonthPicker"), "Must provide MonthPicker component");

// 2. Frontend API Service checks
const apiPath = path.join(__dirname, "src/lib/invoiceApi.ts");
assert(fs.existsSync(apiPath), "invoiceApi.ts must exist");
const apiContent = fs.readFileSync(apiPath, "utf-8");
assert.ok(apiContent.includes("fromApiInvoice"), "Must implement fromApiInvoice mapping");
assert.ok(apiContent.includes("toApiInvoice"), "Must implement toApiInvoice mapping");
assert.ok(apiContent.includes("fetchInvoices"), "Must export fetchInvoices");
assert.ok(apiContent.includes("createInvoice"), "Must export createInvoice");
assert.ok(apiContent.includes("updateInvoice"), "Must export updateInvoice");
assert.ok(apiContent.includes("deleteInvoice"), "Must export deleteInvoice");
assert.ok(apiContent.includes("fetchInvoiceStats"), "Must export fetchInvoiceStats");

// 3. Backend Router checks
const serverRouterPath = path.resolve(__dirname, "../apps/admin/server-v4/invoices.js");
assert(fs.existsSync(serverRouterPath), "server-v4/invoices.js must exist");
const serverContent = fs.readFileSync(serverRouterPath, "utf-8");
assert.ok(serverContent.includes("createInvoiceRouter"), "Must export createInvoiceRouter");
assert.ok(serverContent.includes("mapInvoiceRow"), "Must export mapInvoiceRow");
assert.ok(serverContent.includes("router.get(\"/invoices\""), "Must handle GET /invoices");
assert.ok(serverContent.includes("router.post(\"/invoices\""), "Must handle POST /invoices");
assert.ok(serverContent.includes("router.put(\"/invoices/:id\""), "Must handle PUT /invoices/:id");
assert.ok(serverContent.includes("router.patch(\"/invoices/:id/status\""), "Must handle PATCH /invoices/:id/status");
assert.ok(serverContent.includes("router.delete(\"/invoices/:id\""), "Must handle DELETE /invoices/:id");
assert.ok(serverContent.includes("router.get(\"/invoices/stats\""), "Must handle GET /invoices/stats");
assert.ok(serverContent.includes("已收款入账（状态为已支付），禁止直接删除"), "Must enforce financial protection invariant against deleting paid invoices");

// 4. Server Mounting checks
const serverIndexPath = path.resolve(__dirname, "../apps/admin/server-v4/index.js");
const serverIndexContent = fs.readFileSync(serverIndexPath, "utf-8");
assert.ok(serverIndexContent.includes("createInvoiceRouter"), "server-v4/index.js must import and mount createInvoiceRouter");

// 5. Database Schema checks
const migrationPath = path.resolve(__dirname, "../supabase/migrations/20260919120000_create_workspace_invoices.sql");
assert(fs.existsSync(migrationPath), "Migration 20260919120000_create_workspace_invoices.sql must exist");

// 6. Test DTO Two-way Echo Fidelity
import { fromApiInvoice, toApiInvoice } from "./src/lib/invoiceApi.ts";

const mockDto = {
  id: 101,
  invoice_no: "WMS-INV-2026070101",
  customer_id: "CUST-101",
  customer_name: "上海凯信国际贸易商社",
  invoice_type: "增值税专用发票",
  copy_text: "第一联 记账联",
  currency: "CNY",
  subtotal: 23113.21,
  tax_rate: 6,
  tax_amount: 1386.79,
  amount: 24500,
  issue_date: "2026-07-01",
  due_date: "2026-07-31",
  status: "paid",
  seller_name: "WMS HR Overseas Logistics Group Ltd.",
  seller_tax_no: "91310115MA1H7XW5XT",
  seller_bank_name: "中国建设银行上海浦东分行",
  seller_bank_account: "6217 0021 3004 5589 101",
  seller_address: "上海市浦东新区张江高科园区博雅路455号",
  seller_phone: "+66 2 123 4567",
  seller_contact: "张经理",
  seller_logo: null,
  seller_signature: null,
  seller_stamp: null,
  sig_x: 20,
  sig_y: 30,
  stamp_x: 50,
  stamp_y: 60,
  buyer_tax_no: "91310115MA1H7CUST0",
  buyer_bank_name: "招商银行上海徐家汇支行",
  buyer_bank_account: "6214 8301 2294 3301",
  buyer_address: "上海市徐汇区虹桥路355号凯科国际大厦12楼",
  buyer_phone: "+86 21 5489 2000",
  buyer_contact: "",
  buyer_logo: null,
  items: [
    { id: "item-1", description: "海外仓一件代发处理服务费", qty: 15000, unit_price: 1.2, amount: 18000 }
  ],
  note: "测试发票数据",
  pdf_url: null
};

const vm = fromApiInvoice(mockDto);
assert.equal(vm.invoiceNo, "WMS-INV-2026070101");
assert.equal(vm.amount, 24500);
assert.equal(vm.items[0].unitPrice, 1.2);
assert.equal(vm.sigX, 20);
assert.equal(vm.stampY, 60);

const backDto = toApiInvoice(vm);
assert.equal(backDto.invoice_no, mockDto.invoice_no);
assert.equal(backDto.amount, mockDto.amount);
assert.equal(backDto.items[0].unit_price, 1.2);
assert.equal(backDto.sig_x, 20);

console.log("✓ All Invoice Full-Stack Data & Interaction Flow checks passed successfully!");
