import { chromium } from "file:///C:/Users/admin/Desktop/项目/app/pi-web/node_modules/playwright/index.mjs";
import path from "node:path";
import fs from "node:fs";

const SCREENSHOT_DIR = "./test-screenshots/expense";
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const LOG = (msg) => console.log(`[Browser-Expense] ${msg}`);
const ERROR = (msg) => console.error(`[Browser-Expense] ERROR: ${msg}`);

async function runTest() {
  LOG("Starting Stage 2: Real Browser E2E for Expense/Reimbursement...");
  const chromePath = "C:/Program Files/Google/Chrome/Application/chrome.exe";
  const browser = await chromium.launch({
    executablePath: fs.existsSync(chromePath) ? chromePath : undefined,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const timestamp = Date.now();
  const testName = `AutoTestExp ${timestamp}`;

  try {
    // 1. 登录
    LOG("1. Logging in...");
    await page.goto("http://localhost:3004/zh-CN/login", { waitUntil: "domcontentloaded" });

    const TOKEN = "eyJzdGFnZSI6ImF1dGhlbnRpY2F0ZWQiLCJ1c2VySWQiOiI4NjdiOTIxOC1hMjMxLTRiOGMtYWUyYi0yM2Y5MjJlNWVlNmYiLCJhY2NvdW50SWQiOiI4NjdiOTIxOC1hMjMxLTRiOGMtYWUyYi0yM2Y5MjJlNWVlNmYiLCJvd25lclVzZXJJZCI6IjYwYWY0ZTNjLTI4OTAtNDJmMC04OWY2LWUwYmNhZTNlNDNlMCIsImFkbWluT3duZXJVc2VySWQiOiI2MGFmNGUzYy0yODkwLTQyZjAtODlmNi1lMGJjYWUzZTQzZTAiLCJhY2NvdW50IjoiYWRtaW5Ad21zaHIuY29tIiwiY291bnRyeUNvZGUiOiJUSCIsInBlcm1pc3Npb25zIjpbIioiXSwiZXhwIjoxODIzMDk2OTgxNDkzfQ.hspNedKtZ0r03NHNBxCJKUkSETde-glH9LdmP7I5ue4";
    const USER = {
      id: "867b9218-a231-4b8c-ae2b-23f922e5ee6f",
      accountId: "867b9218-a231-4b8c-ae2b-23f922e5ee6f",
      ownerUserId: "60af4e3c-2890-42f0-89f6-e0bcae3e43e0",
      authUserId: "867b9218-a231-4b8c-ae2b-23f922e5ee6f",
      account: "admin@wmshr.com", name: "Admin",
      role: "admin"
    };

    await page.evaluate(({ token, user }) => {
      localStorage.setItem("wms_admin_token", token);
      localStorage.setItem("wms_admin_user", JSON.stringify(user));
    }, { token: TOKEN, user: USER });

    // 2. 导航至报销模块
    LOG("2. Navigating to Expense module...");
    await page.goto("http://localhost:3004/zh-CN/");
    await page.waitForTimeout(2000);
    // Find any element containing 报销
    await page.goto("http://localhost:3004/zh-CN/expenses", { waitUntil: "networkidle" });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/1-expense-list-loaded.png` });

    // 3. 提单操作 (Create)
    LOG("3. Creating a new expense record...");
    await page.evaluate(() => document.getElementById('btn-create-expense').click());
    await page.waitForTimeout(1000);
    
    // 填表单
    await page.fill('input[placeholder*="请输入账单报销业务名称"]', testName);
    await page.fill('input[type="number"], input[name="amount"]', "150.50");
    await page.fill('textarea[placeholder*="请写明报销原委"]', "Initial E2E test note");
    
    // 由于是 E2E 黑盒测试，我们这里用截图留痕和直接保存来验证
    await page.click('button:has-text("保存"), button:has-text("确定")');
    LOG("Waiting for creation to complete...");
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/2-expense-created.png` });
    
    // 断言列表存在
    const rowExists = await page.isVisible(`text=${testName}`);
    if (!rowExists) throw new Error("Created expense not found in the list.");
    LOG("✓ Expense record created successfully.");

    // 4. 编辑操作 (Update)
    LOG("4. Updating the expense record...");
    // 找到那一行点击编辑，使用 XPath 或 Locator
    const rowLocator = page.locator(`tr:has-text("${testName}")`);
    await rowLocator.locator('button:has-text("编辑")').click();
    await page.waitForTimeout(1000);
    await page.fill('input[type="number"], input[name="amount"]', "250.00");
    await page.click('button:has-text("保存"), button:has-text("确定")');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/3-expense-updated.png` });
    
    const amountUpdated = await rowLocator.locator('text=250').isVisible() || await page.isVisible(`text=250.00`);
    if (!amountUpdated) throw new Error("Updated amount not reflected in the UI.");
    LOG("✓ Expense record updated successfully.");

    // 5. 审批流 (Approve)
    LOG("5. Approving the expense record...");
    await rowLocator.locator('button:has-text("通过"), button:has-text("审批")').click();
    await page.waitForTimeout(1000);
    // 可能会弹出弹窗输入审批意见
    const noteInput = page.locator('textarea[placeholder*="审批意见"], input[placeholder*="审批意见"]');
    if (await noteInput.isVisible()) {
      await noteInput.fill("Automated Approval");
      await page.click('button:has-text("确认"), button:has-text("提交")');
    } else {
      // 也许有另外的确认按钮
      try {
        await page.click('button:has-text("确认"), button:has-text("确定")');
      } catch (e) {
        // Ignore if no confirmation needed
      }
    }
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/4-expense-approved.png` });

    // 状态应该是已通过或类似字眼
    const isApproved = await rowLocator.locator('text=通过').isVisible() || await rowLocator.locator('text=已批准').isVisible() || await rowLocator.locator('text=Approved').isVisible();
    if (!isApproved) throw new Error("Expense status did not change to approved.");
    LOG("✓ Expense record approved successfully.");

    // 6. 删除流 (Delete)
    LOG("6. Deleting the expense record...");
    await rowLocator.locator('button[title="报销撤销删除"]').click();
    await page.waitForTimeout(1000);
    await page.click('button:has-text("确认删除")');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/5-expense-deleted.png` });

    const rowStillExists = await page.isVisible(`tr:has-text("${testName}")`);
    if (rowStillExists) throw new Error("Expense record still visible after deletion.");
    LOG("✓ Expense record deleted successfully.");

    LOG("\n==== STAGE 2: REAL BROWSER UI TEST PASSED ====");
  } catch (error) {
    ERROR(`Test failed: ${error.message}`);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/ERROR-expense.png`, fullPage: true });
    process.exit(1);
  } finally {
    await browser.close();
  }
}

runTest();
