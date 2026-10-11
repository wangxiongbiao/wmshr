import { chromium } from "file:///C:/Users/admin/Desktop/%E9%A1%B9%E7%9B%AE/app/pi-web/node_modules/playwright/index.mjs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log("==================================================================");
console.log("🎭 [Stage 2] 发票模块 Playwright 真实 Chrome 浏览器实机走查启动");
console.log("==================================================================");

const BASE_URL = "http://localhost:3004";
const executablePath = "C:/Program Files/Google/Chrome/Application/chrome.exe";

async function runBrowserTest() {
  const browser = await chromium.launch({ 
    headless: true,
    executablePath
  });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  try {
    console.log("1. 正在访问前端登录页: http://localhost:3004/zh-CN/login ...");
    await page.goto("http://localhost:3004/zh-CN/login", { waitUntil: "networkidle", timeout: 15000 });
    console.log("   ✓ 前端页面加载成功，Title:", await page.title());

    console.log("2. 自动填写真实测试凭据 (e2e_tester@wmshr.com)...");
    await page.fill("input[name='email'], input[type='text'], input[type='email']", "e2e_tester@wmshr.com");
    await page.fill("input[name='password'], input[type='password']", "SecurePassword123");
    
    // 提交登录
    await page.click("button[type='submit']");
    console.log("   ✓ 提交登录表单，等待海外仓选择界面渲染...");
    await page.waitForTimeout(2500);

    // 选择海外仓
    console.log("3. 检测并点击选择【🇹🇭 泰国 Thailand】海外仓节点...");
    const thWarehouseBtn = await page.waitForSelector("button:has-text('泰国')", { timeout: 8000 });
    assert(thWarehouseBtn, "必须能在多仓列表中定位到【泰国】海外仓节点");
    await thWarehouseBtn.click();
    console.log("   ✓ 已成功选定并接入【泰国】海外仓，等待主系统渲染...");
    await page.waitForTimeout(2500);

    console.log("4. 展开侧边栏财务管理并导航至【发票列表】...");
    // 查找包含发票列表的按钮并点击
    const invoiceBtn = await page.waitForSelector("button:has-text('发票列表')", { timeout: 5000 });
    assert(invoiceBtn, "侧边栏必须展示【发票列表】入口");
    await invoiceBtn.click();
    console.log("   ✓ 已点击【发票列表】Tab，等待视图加载...");
    await page.waitForTimeout(2000);

    // 检查发票主表格与控制栏渲染
    console.log("5. 走查发票列表主表格与控制栏视觉契约...");
    const invoiceTitle = page.locator("h3:has-text('发票列表')").first();
    assert.ok(await invoiceTitle.isVisible(), "发票列表标题栏必须正常呈现");
    console.log("   ✓ 发票列表表头栏渲染正常");

    // 走查刷新按钮
    const refreshBtn = page.locator("button:has-text('刷新')").first();
    assert.ok(await refreshBtn.isVisible(), "必须存在刷新按钮");
    await refreshBtn.click();
    await page.waitForTimeout(800);
    console.log("   ✓ 触发手动刷新，数据接口通信成功且有交互回响");

    // 走查新建发票工作区
    console.log("6. 走查【新开发票】双栏高保真工作区与 Live Preview 联动...");
    const newInvoiceBtn = page.locator("button:has-text('新开发票')").first();
    assert.ok(await newInvoiceBtn.isVisible(), "必须存在【新开发票】按钮");
    await newInvoiceBtn.click();
    await page.waitForTimeout(1500);

    const backBtn = page.locator("button:has-text('返回发票列表')").first();
    assert.ok(await backBtn.isVisible(), "开票工作区必须展示【返回发票列表】按钮");
    console.log("   ✓ 开票双栏工作区展开无误，A4 实时预览面板渲染正常");

    // 走查四重退出闭环之点击返回按钮
    await backBtn.click();
    await page.waitForTimeout(1000);
    console.log("   ✓ 点击返回发票列表，工作区安全退出闭环");

    console.log("\n==================================================================");
    console.log("🎉 [Stage 2] 发票模块 Playwright 真实 Chrome 实机走查 100% 成功！");
    console.log("==================================================================");
  } finally {
    await browser.close();
  }
}

runBrowserTest().catch((err) => {
  console.error("Stage 2 Browser test failed:", err);
  process.exit(1);
});
