import assert from "node:assert/strict";
import { chromium } from "file:///C:/Users/admin/Desktop/项目/app/pi-web/node_modules/playwright/index.mjs";

console.log("=======================================================================");
console.log("   🧪 针对【文件导入核算数据 vs 历史记录回显数据一致性】专项测试");
console.log("=======================================================================\n");

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

// 构造 100 笔真实业务双表数据（远超之前的 60 行截断线）
const TOTAL_ROWS = 100;
let sysRows = ["运单号\t客户名称\t收件人"];
let jntRows = ["运单编号\t总运费\t计费重量(kg)"];

for (let i = 1; i <= TOTAL_ROWS; i++) {
  const wb = `TH-FIDELITY-${String(i).padStart(4, "0")}`;
  sysRows.push(`${wb}\t曼谷跨境电商\tCustomer_${i}`);
  jntRows.push(`${wb}\t${25.50 + i}\t${1.0 + (i % 3) * 0.5}`);
}

const sysDataText = sysRows.join("\n");
const jntDataText = jntRows.join("\n");

async function runEchoFidelityTest() {
  const chromePath = "C:/Program Files/Google/Chrome/Application/chrome.exe";
  const browser = await chromium.launch({
    executablePath: chromePath,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    permissions: ["clipboard-read", "clipboard-write"]
  });

  const page = await context.newPage();

  try {
    // 1. 注入登录凭据并直达
    await page.goto("http://localhost:3004/zh-CN/login", { waitUntil: "domcontentloaded" });
    await page.evaluate(({ token, user }) => {
      localStorage.setItem("wms_admin_token", token);
      localStorage.setItem("wms_admin_user", JSON.stringify(user));
    }, { token: TOKEN, user: USER });

    await page.goto("http://localhost:3004/zh-CN/express", { waitUntil: "networkidle" });
    console.log("1. 成功直达快递对账页面");

    // 2. 导入 100 笔系统发货单数据
    await page.evaluate((text) => navigator.clipboard.writeText(text), sysDataText);
    const pasteButtons = page.getByRole("button", { name: "从剪贴板快速粘贴" });
    await pasteButtons.nth(0).click();
    await page.waitForTimeout(600);
    console.log(`2. 成功导入系统发货数据: ${TOTAL_ROWS} 笔`);

    // 3. 导入 100 笔 J&T 官方账单数据
    await page.evaluate((text) => navigator.clipboard.writeText(text), jntDataText);
    await pasteButtons.nth(1).click();
    await page.waitForTimeout(1000);
    console.log(`3. 成功导入 J&T 官方账单: ${TOTAL_ROWS} 笔`);

    // 4. 记录首次核算大屏指标数据
    const originalMatchedBadge = await page.getByRole("button", { name: /^比对明细/ }).first().innerText();
    console.log(`   [原始数据] 比对明细 Badge: "${originalMatchedBadge.trim()}"`);
    assert.ok(originalMatchedBadge.includes(String(TOTAL_ROWS)), `原始比对明细必须包含 ${TOTAL_ROWS}`);

    // 等待自动沉淀历史归档
    await page.waitForTimeout(1000);

    // 5. 打开【导入记录】弹窗
    const logsBtn = page.getByRole("button", { name: /导入记录/ }).first();
    await logsBtn.click();
    await page.waitForTimeout(600);

    const restoreButtons = page.getByRole("button", { name: "回显结果" });
    const count = await restoreButtons.count();
    console.log(`4. 打开导入记录弹窗，发现 ${count} 个批次`);

    // 点击刚刚沉淀的最新批次【回显结果】
    await restoreButtons.first().click();
    await page.waitForTimeout(800);

    // 6. 验证大屏出现回显横幅
    const echoBadge = page.getByText("双表对账回显中");
    await echoBadge.waitFor({ state: "visible", timeout: 4000 });
    const fullBannerText = await page.locator("div.bg-blue-50\\/90").first().innerText();
    console.log(`5. 大屏成功回显横幅: "${fullBannerText.replace(/\s+/g, " ")}"`);
    assert.ok(fullBannerText.includes(`${TOTAL_ROWS} 单`) || fullBannerText.includes(`${TOTAL_ROWS}`), "横幅中必须保持 100 单完整数量！");

    // 7. 严格断言：回显后的明细总数、尾部单号、大屏指标 100% 完好无损一致！
    const echoedMatchedBadge = await page.getByRole("button", { name: /^比对明细/ }).first().innerText();
    console.log(`   [回显数据] 比对明细 Badge: "${echoedMatchedBadge.trim()}"`);
    assert.strictEqual(
      echoedMatchedBadge.trim(),
      originalMatchedBadge.trim(),
      `回显数据量与原始导入数据量必须 100% 严格一致（预期: ${originalMatchedBadge.trim()}, 实测: ${echoedMatchedBadge.trim()}）！`
    );

    // 切到明细检查首尾单号是否存在（证明没有被 60 行截断）
    const detailsTabBtn = page.getByRole("button", { name: /^比对明细/ }).first();
    await detailsTabBtn.click();
    await page.waitForTimeout(400);

    // 检查第 1 笔单号
    const firstWb = "TH-FIDELITY-0001";
    assert.ok(await page.getByText(firstWb).first().isVisible(), `第 1 笔单号 ${firstWb} 必须可见`);

    // 搜索第 100 笔单号（如果以前被截断为 60 行，第 100 笔单号必丢失！）
    const searchInput = page.getByPlaceholder(/搜索运单号/);
    await searchInput.fill("TH-FIDELITY-0100");
    await page.waitForTimeout(400);

    const lastWb = "TH-FIDELITY-0100";
    const lastWbVisible = await page.getByText(lastWb).first().isVisible();
    assert.ok(lastWbVisible, `第 100 笔单号 ${lastWb} 必须能被完整检索和呈现（未被截断）！`);
    console.log(`6. 成功检索到第 100 笔单号 ${lastWb}，验证无截断无数据丢失！`);

    console.log("\n=======================================================================");
    console.log("🎉 验证成功！导入数据与历史回显数据达成 100% 绝对一致！");
    console.log("=======================================================================\n");

  } finally {
    await browser.close();
  }
}

try {
  await runEchoFidelityTest();
} catch (err) {
  console.error("❌ 专项测试失败:", err.message);
  process.exit(1);
}
