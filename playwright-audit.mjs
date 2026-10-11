import assert from "node:assert";
import { chromium } from "playwright";

async function runBrowserAudit() {
  console.log("===============================================================");
  console.log("      🚀 WMSHR Playwright 真实浏览器实机走查套件");
  console.log("===============================================================\n");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  try {
    // 1. 访问本地前端服务
    console.log("1. 正在访问前端服务: http://localhost:3004 ...");
    await page.goto("http://localhost:3004", { waitUntil: "networkidle", timeout: 15000 });
    console.log("   ✓ 前端页面加载成功，Title:", await page.title());

    // 2. 检查是否有登录表单
    const passwordInput = await page.$("input[type='password']");
    if (passwordInput) {
      console.log("   检测到登录页，自动填充测试凭据登录...");
      const userInput = await page.$("input[type='text'], input[type='email']");
      if (userInput) await userInput.fill("admin@wmshr.com");
      await passwordInput.fill("admin123");
      const submitBtn = await page.$("button[type='submit']");
      if (submitBtn) await submitBtn.click();
      await page.waitForTimeout(2000);
    }

    // 3. 点击导航到快递对账页面
    console.log("2. 正在导航至【快递对账】模块...");
    const navButtons = await page.$$("button, a, div");
    for (const btn of navButtons) {
      const text = await btn.textContent();
      if (text && text.includes("快递")) {
        await btn.click();
        break;
      }
    }
    await page.waitForTimeout(1000);

    // 4. 检查快递工具栏上的【导入记录】按钮
    console.log("3. 正在走查工具栏中的【导入记录】入口...");
    const allButtons = await page.$$("button");
    let importLogsBtn = null;
    for (const b of allButtons) {
      const t = await b.textContent();
      if (t && t.includes("导入记录")) {
        importLogsBtn = b;
        break;
      }
    }
    assert.ok(importLogsBtn, "工具栏中必须存在【导入记录】按钮！");
    console.log("   ✓ 【导入记录】按钮挂载正常");

    // 5. 点击打开【导入记录】弹窗
    console.log("4. 正在测试点击【导入记录】打开弹窗交互...");
    await importLogsBtn.click();
    await page.waitForTimeout(800);

    const dialog = await page.$("[role='dialog']");
    assert.ok(dialog, "点击导入记录按钮后必须弹出 Dialog 弹窗！");
    const dialogText = await dialog.textContent();
    assert.ok(dialogText && (dialogText.includes("对账") || dialogText.includes("记录")), "弹窗中必须呈现对账核算记录标题");
    console.log("   ✓ 对账记录弹窗成功弹出，内容渲染正常");

    // 6. 测试弹窗 ESC 键关闭闭环
    console.log("5. 正在走查弹窗 ESC 退出闭环（能开必能关）...");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(600);
    const dialogAfterEsc = await page.$("[role='dialog']");
    assert.strictEqual(dialogAfterEsc, null, "按 ESC 键后弹窗必须关闭！");
    console.log("   ✓ ESC 退出闭环走查通过");

    console.log("\n===============================================================");
    console.log("🎉 Playwright 真实浏览器实机走查全部通过，UI规范与交互无异常！");
    console.log("===============================================================");
  } catch (err) {
    console.error("❌ 浏览器走查未通过:", err);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

runBrowserAudit();
