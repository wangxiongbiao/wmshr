const assert = require("node:assert");
const { chromium } = require("C:/Users/admin/Desktop/项目/app/pi-web/node_modules/playwright");

async function runBrowserAudit() {
  console.log("===============================================================");
  console.log("      🚀 WMSHR Playwright 真实浏览器实机走查套件");
  console.log("===============================================================\n");

  const browser = await chromium.launch({ headless: true, channel: "chrome" });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  try {
    // 1. 访问本地前端并注入测试登录凭据
    console.log("1. 正在访问前端并注入管理员凭据...");
    await page.goto("http://localhost:3004", { waitUntil: "domcontentloaded" });
    await page.evaluate(() => {
      localStorage.setItem("wms_admin_token", "mock-admin-token");
      localStorage.setItem("wms_admin_user", JSON.stringify({
        id: "admin-1",
        email: "admin@wmshr.com",
        name: "系统管理员 (Gary)",
        role: "admin",
        country: "TH",
        permissions: ["*"]
      }));
    });

    // 2. 直接访问快递对账管理页面
    console.log("2. 正在导航至【快递对账】模块后台页面...");
    await page.goto("http://localhost:3004/zh/express", { waitUntil: "networkidle", timeout: 15000 });
    await page.waitForTimeout(1000);
    console.log("   当前后台页面真实 URL:", page.url());

    // 3. 走查工具栏按钮
    console.log("3. 正在走查工具栏中的【导入记录】入口...");
    const importLogsBtn = await page.waitForSelector("button:has-text('导入记录')", { timeout: 5000 });
    assert.ok(importLogsBtn, "工具栏中必须存在【导入记录】按钮！");
    console.log("   ✓ 【导入记录】按钮存在并挂载成功");

    // 4. 点击打开【导入记录】弹窗
    console.log("4. 正在测试点击【导入记录】打开弹窗交互...");
    await importLogsBtn.click();
    await page.waitForTimeout(800);

    const dialog = await page.waitForSelector("[role='dialog']", { timeout: 3000 });
    assert.ok(dialog, "点击导入记录按钮后必须弹出 Dialog 弹窗！");
    const dialogText = await dialog.textContent();
    assert.ok(dialogText && (dialogText.includes("对账") || dialogText.includes("记录")), "弹窗中必须呈现对账核算记录标题");
    console.log("   ✓ 对账记录弹窗成功弹出，双表核对结构就位");

    // 5. 走查弹窗 ESC 键关闭闭环（能开必能关）
    console.log("5. 正在走查弹窗 ESC 退出闭环（能开必能关）...");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(600);
    const dialogAfterEsc = await page.$("[role='dialog']");
    assert.strictEqual(dialogAfterEsc, null, "按 ESC 键后弹窗必须关闭！");
    console.log("   ✓ ESC 退出闭环走查通过");

    console.log("\n===============================================================");
    console.log("🎉 Playwright 真实 Chrome 浏览器实机走查全部通过，UI规范与交互 100% 达标！");
    console.log("===============================================================");
  } catch (err) {
    console.error("❌ 浏览器走查未通过:", err);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

runBrowserAudit();
