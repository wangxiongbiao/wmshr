import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "file:///C:/Users/admin/Desktop/项目/app/pi-web/node_modules/playwright/index.mjs";

console.log("=======================================================================");
console.log("   🚀 [Phase 2] 快递列表真实浏览器实机操作走查 (Real Browser E2E)");
console.log("=======================================================================\n");

const REPORT_DIR = path.resolve(".temp");
if (!fs.existsSync(REPORT_DIR)) {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
}

const TOKEN = "eyJzdGFnZSI6ImF1dGhlbnRpY2F0ZWQiLCJ1c2VySWQiOiI4NjdiOTIxOC1hMjMxLTRiOGMtYWUyYi0yM2Y5MjJlNWVlNmYiLCJhY2NvdW50SWQiOiI4NjdiOTIxOC1hMjMxLTRiOGMtYWUyYi0yM2Y5MjJlNWVlNmYiLCJvd25lclVzZXJJZCI6IjYwYWY0ZTNjLTI4OTAtNDJmMC04OWY2LWUwYmNhZTNlNDNlMCIsImFkbWluT3duZXJVc2VySWQiOiI2MGFmNGUzYy0yODkwLTQyZjAtODlmNi1lMGJjYWUzZTQzZTAiLCJhY2NvdW50IjoiYWRtaW5Ad21zaHIuY29tIiwiY291bnRyeUNvZGUiOiJUSCIsInBlcm1pc3Npb25zIjpbIioiXSwiZXhwIjoxODIzMDk2OTgxNDkzfQ.hspNedKtZ0r03NHNBxCJKUkSETde-glH9LdmP7I5ue4";

const USER = {
  id: "867b9218-a231-4b8c-ae2b-23f922e5ee6f",
  accountId: "867b9218-a231-4b8c-ae2b-23f922e5ee6f",
  ownerUserId: "60af4e3c-2890-42f0-89f6-e0bcae3e43e0",
  authUserId: "867b9218-a231-4b8c-ae2b-23f922e5ee6f",
  account: "admin@wmshr.com",
  email: "admin@wmshr.com",
  name: "系统管理员 (Gary)",
  role: "admin",
  permissions: ["*"],
  allowedWarehouses: ["*"],
  countryCode: "TH"
};

const browserSteps = [];

function step(id, name, fn) {
  return async () => {
    try {
      await fn();
      browserSteps.push({ id, name, passed: true });
      console.log(`  [✅ PASS] ${id}: ${name}`);
    } catch (err) {
      browserSteps.push({ id, name, passed: false, error: err.message });
      console.log(`  [❌ FAIL] ${id}: ${name}`);
      console.error(`     原因: ${err.message}\n${err.stack}`);
      throw err;
    }
  };
}

async function runRealBrowserE2E() {
  const chromePath = "C:/Program Files/Google/Chrome/Application/chrome.exe";
  const browser = await chromium.launch({
    executablePath: fs.existsSync(chromePath) ? chromePath : undefined,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    permissions: ["clipboard-read", "clipboard-write"]
  });

  const page = await context.newPage();

  // 监听并自动接收 confirm 弹窗
  page.on("dialog", async (dialog) => {
    console.log(`     [Dialog: ${dialog.type()}] "${dialog.message()}" -> accept`);
    await dialog.accept();
  });

  page.on("console", (msg) => {
    if (msg.type() === "error" || msg.type() === "warn" || msg.text().includes("回显") || msg.text().includes("批次")) {
      console.log(`     [Browser Console: ${msg.type()}]`, msg.text());
    }
  });
  const networkErrors = [];
  page.on("response", (res) => {
    if (res.status() >= 400 && !res.url().includes("favicon")) {
      networkErrors.push({ url: res.url(), status: res.status() });
    }
  });

  try {
    // 步骤 1: 预置高权限鉴权凭据底座
    await step("B1-AUTH", "凭据底座开路：注入统一高权限 admin@wmshr.com 鉴权会话", async () => {
      await page.goto("http://localhost:3004/zh-CN/login", { waitUntil: "domcontentloaded" });
      await page.evaluate(({ token, user }) => {
        localStorage.setItem("wms_admin_token", token);
        localStorage.setItem("wms_admin_user", JSON.stringify(user));
      }, { token: TOKEN, user: USER });
    })();

    // 步骤 2: 直达快递列表页面
    await step("B2-NAV", "页面直达：导航至 http://localhost:3004/zh-CN/express 且无登录重定向", async () => {
      await page.goto("http://localhost:3004/zh-CN/express", { waitUntil: "networkidle" });
      const currentUrl = page.url();
      assert.ok(currentUrl.includes("/express"), `当前 URL 必须为 express，实测: ${currentUrl}`);
      const heading = await page.getByRole("heading", { name: "快递列表" }).first();
      await heading.waitFor({ state: "visible", timeout: 8000 });
      assert.strictEqual(networkErrors.length, 0, `页面加载期间无 4xx/5xx 请求错误: ${JSON.stringify(networkErrors)}`);
    })();

    // 步骤 3: 走查抽屉互斥切换与弹窗 ESC 关闭闭环
    await step("B3-MUTEX", "抽屉互斥流：切换【客户操作列表】与【数据导入抽屉】，走查弹窗 ESC 退出", async () => {
      // 1. 点击客户操作列表
      const surchargeBtn = page.getByRole("button", { name: /客户操作列表/ }).first();
      await surchargeBtn.click();
      await page.waitForTimeout(400);

      // 验证操作列表打开
      const surchargeHeader = page.getByText("客户操作费设置列表");
      await surchargeHeader.waitFor({ state: "visible", timeout: 4000 });

      // 2. 点击新建费用规则，唤起弹窗
      const addRuleBtn = page.getByRole("button", { name: /新增操作费规则|添加客户操作费/ }).first();
      if (await addRuleBtn.isVisible()) {
        await addRuleBtn.click();
        await page.waitForTimeout(400);
        // ESC 键关闭
        await page.keyboard.press("Escape");
        await page.waitForTimeout(400);
      }

      // 3. 点击“导入/粘贴数据”恢复导入区
      const restoreImportBtn = page.getByRole("button", { name: /导入\/粘贴数据|收起操作列表/ }).first();
      await restoreImportBtn.click();
      await page.waitForTimeout(400);

      // 验证导入区域正常恢复
      const step1Text = page.getByRole("heading", { name: /导入系统发货数据/ });
      await step1Text.waitFor({ state: "visible", timeout: 4000 });
    })();

    // 步骤 4: 剪贴板真实输入系统发货单
    await step("B4-CLIP-SYS", "真实数据输入(发货单)：通过剪贴板快速粘贴 2 笔发货单数据", async () => {
      const sysData = "运单号\t客户名称\t收件人\nTH-E2E-1001\t曼谷跨境电商\tSomchai\nTH-E2E-1002\t曼谷跨境电商\tAnan";
      await page.evaluate((text) => navigator.clipboard.writeText(text), sysData);

      // 点击系统端的【从剪贴板快速粘贴】按钮
      const pasteButtons = page.getByRole("button", { name: "从剪贴板快速粘贴" });
      await pasteButtons.nth(0).click();
      await page.waitForTimeout(600);

      // 验证已解析 2 笔发货
      const sysCountBadge = page.getByText(/已解析\s*2\s*笔发货/);
      await sysCountBadge.waitFor({ state: "visible", timeout: 5000 });
    })();

    // 步骤 5: 单边数据输入拦截验证
    await step("B5-ISOLATION", "单边隔离验证：仅导入发货单时，大屏拦截半成品，绝不产生虚假匹配单", async () => {
      // 验证系统发货单数卡片展示
      const sysMetric = page.getByText("系统发货单数");
      await sysMetric.waitFor({ state: "visible", timeout: 4000 });
      // 验证成功对账匹配指标展示为 0%
      const zeroPct = page.getByText(/单 \(0%\)/).first();
      await zeroPct.waitFor({ state: "visible", timeout: 4000 });
    })();

    // 步骤 6: 剪贴板真实输入 J&T 官方账单并触发自动核算
    await step("B6-CLIP-JNT", "真实数据输入(J&T账单)：粘贴账单后，系统自动双表对账并点亮大屏", async () => {
      const jntData = "运单编号\t总运费\t计费重量(kg)\nTH-E2E-1001\t35.00\t1.2\nTH-E2E-1002\t45.00\t1.8";
      await page.evaluate((text) => navigator.clipboard.writeText(text), jntData);

      // 点击 J&T 端的【从剪贴板快速粘贴】按钮
      const pasteButtons = page.getByRole("button", { name: "从剪贴板快速粘贴" });
      await pasteButtons.nth(1).click();
      await page.waitForTimeout(800);

      // 验证 J&T 侧已解析 2 笔结算
      const jntCountBadge = page.getByText(/已解析\s*2\s*笔结算/);
      await jntCountBadge.waitFor({ state: "visible", timeout: 5000 });

      // 验证大屏 6 大核心指标卡已点亮
      const matchedMetric = page.getByText("成功对账匹配");
      await matchedMetric.waitFor({ state: "visible", timeout: 5000 });
      const expressFeeMetric = page.getByText("J&T结算运费");
      await expressFeeMetric.waitFor({ state: "visible", timeout: 5000 });
    })();

    // 步骤 7: 走查三级 SubTab 视图联动与明细渲染
    await step("B7-SUBTABS", "三级标签切换：走查【客户账单汇总】、【比对明细】与【异常核对】", async () => {
      // 1. 点击比对明细 Tab
      const detailsTabBtn = page.getByRole("button", { name: /^比对明细/ }).first();
      await detailsTabBtn.click();
      await page.waitForTimeout(400);

      // 验证明细表格中包含 TH-E2E-1001 与 TH-E2E-1002
      await page.getByText("TH-E2E-1001").first().waitFor({ state: "visible", timeout: 4000 });
      await page.getByText("TH-E2E-1002").first().waitFor({ state: "visible", timeout: 4000 });

      // 2. 点击客户账单汇总 Tab
      const summaryTabBtn = page.getByRole("button", { name: /^客户账单汇总/ }).first();
      await summaryTabBtn.click();
      await page.waitForTimeout(400);
      await page.getByText("曼谷跨境电商").first().waitFor({ state: "visible", timeout: 4000 });

      // 3. 点击异常核对 Tab
      const discrepancyTabBtn = page.getByRole("button", { name: /^异常核对/ }).first();
      await discrepancyTabBtn.click();
      await page.waitForTimeout(400);
      // 验证当前无异常运单
      await page.getByText("未发现任何对账差异！").first().waitFor({ state: "visible", timeout: 4000 });
    })();

    // 步骤 8: 走查搜索过滤响应
    await step("B8-SEARCH", "搜索过滤联动：输入单号模糊匹配，表格过滤且能即时清空", async () => {
      // 切回明细页
      const detailsTabBtn = page.getByRole("button", { name: /^比对明细/ }).first();
      await detailsTabBtn.click();
      await page.waitForTimeout(300);

      // 输入搜索词
      const searchInput = page.getByPlaceholder(/搜索运单号/);
      await searchInput.fill("1001");
      await page.waitForTimeout(300);

      // 验证 TH-E2E-1001 存在，TH-E2E-1002 被过滤
      assert.ok(await page.getByText("TH-E2E-1001").first().isVisible());
      assert.strictEqual(await page.getByText("TH-E2E-1002").isVisible(), false);

      // 清空搜索词
      await searchInput.fill("");
      await page.waitForTimeout(300);
      assert.ok(await page.getByText("TH-E2E-1002").first().isVisible());
    })();

    // 步骤 9: 走查导入记录弹窗、大屏回显与退出回显
    await step("B9-ECHO", "历史快照回显走查：打开【导入记录】弹窗，点击回显结果，走查回显横幅与退出", async () => {
      // 打开导入记录弹窗
      const logsBtn = page.getByRole("button", { name: /导入记录/ }).first();
      await logsBtn.click();
      await page.waitForTimeout(600);

      // 验证弹窗打开
      const modalHeader = page.getByText("双表对账核算历史记录");
      await modalHeader.waitFor({ state: "visible", timeout: 4000 });

      const restoreButtons = page.getByRole("button", { name: "回显结果" });
      const count = await restoreButtons.count();
      console.log(`     [Modal Info] 发现 ${count} 个回显结果按钮`);

      // 点击首条记录的【回显结果】按钮
      await restoreButtons.first().click();
      await page.waitForTimeout(800);

      // 验证大屏顶部出现【双表对账回显中】横幅
      const echoBanner = page.getByText("双表对账回显中");
      await echoBanner.waitFor({ state: "visible", timeout: 4000 });

      // 验证横幅上的【退出回显】按钮
      const exitEchoBtn = page.getByRole("button", { name: "退出回显" });
      await exitEchoBtn.waitFor({ state: "visible", timeout: 4000 });
      await exitEchoBtn.click();
      await page.waitForTimeout(400);

      // 验证横幅安全消失
      assert.strictEqual(await echoBanner.isVisible(), false, "退出回显后横幅安全消失");
    })();

    // 步骤 10: 验证清空功能已彻底移除走查
    await step("B10-NO-CLEAR", "功能移除走查：验证工具栏【清空】功能按钮已彻底下线，杜绝误触抹除", async () => {
      // 验证工具栏上不再存在任何清空按钮
      const clearBtn = page.getByRole("button", { name: "清空" });
      const count = await clearBtn.count();
      assert.strictEqual(count, 0, "工具栏清空数据按钮已彻底移除");

      // 验证导出比对明细按钮与刷新按钮正常保留可用
      const exportBtn = page.getByRole("button", { name: /导出比对明细/ });
      assert.ok(await exportBtn.isVisible(), "导出按钮正常完好");
    })();

    // 截图保存为最终实机验收凭据
    const screenshotPath = path.join(REPORT_DIR, "express-e2e-real-browser-passed.png");
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`\n📸 [截图凭据] 验收快照已成功落盘: ${screenshotPath}`);

  } finally {
    await browser.close();
  }
}

try {
  await runRealBrowserE2E();
  console.log("\n=======================================================================");
  console.log("🎉 阶段二：真实浏览器实机操作走查全部 10 项步骤 100% 通过！");
  console.log(`   总执行步骤: ${browserSteps.length}，全部通过: ${browserSteps.every(s => s.passed)}`);
  console.log("=======================================================================\n");
} catch (err) {
  console.error("\n❌ 阶段二执行出现阻断:", err.message);
  process.exit(1);
}
