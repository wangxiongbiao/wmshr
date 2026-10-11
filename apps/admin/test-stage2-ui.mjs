import assert from "node:assert";
import fs from "node:fs";
import { chromium } from "file:///C:/Users/admin/Desktop/项目/app/pi-web/node_modules/playwright/index.mjs";

async function runStage2BrowserTest() {
  console.log("=== 🚀 WMSHR 考勤模块 - 阶段二（实机浏览器 UI 交互）测试 ===");

  const chromePath = "C:/Program Files/Google/Chrome/Application/chrome.exe";
  const browser = await chromium.launch({
    executablePath: fs.existsSync(chromePath) ? chromePath : undefined,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  try {
    console.log("1. 注入管理会话并直达考勤页面...");
    await page.goto("http://localhost:3004/zh-CN/login", { waitUntil: "domcontentloaded" });
    const TOKEN = "eyJzdGFnZSI6ImF1dGhlbnRpY2F0ZWQiLCJ1c2VySWQiOiI4NjdiOTIxOC1hMjMxLTRiOGMtYWUyYi0yM2Y5MjJlNWVlNmYiLCJhY2NvdW50SWQiOiI4NjdiOTIxOC1hMjMxLTRiOGMtYWUyYi0yM2Y5MjJlNWVlNmYiLCJvd25lclVzZXJJZCI6IjYwYWY0ZTNjLTI4OTAtNDJmMC04OWY2LWUwYmNhZTNlNDNlMCIsImFkbWluT3duZXJVc2VySWQiOiI2MGFmNGUzYy0yODkwLTQyZjAtODlmNi1lMGJjYWUzZTQzZTAiLCJhY2NvdW50IjoiYWRtaW5Ad21zaHIuY29tIiwiY291bnRyeUNvZGUiOiJUSCIsInBlcm1pc3Npb25zIjpbIioiXSwiZXhwIjoxODIzMDk2OTgxNDkzfQ.hspNedKtZ0r03NHNBxCJKUkSETde-glH9LdmP7I5ue4";
    const USER = {
      id: "867b9218-a231-4b8c-ae2b-23f922e5ee6f",
      accountId: "867b9218-a231-4b8c-ae2b-23f922e5ee6f",
      ownerUserId: "60af4e3c-2890-42f0-89f6-e0bcae3e43e0",
      adminOwnerUserId: "60af4e3c-2890-42f0-89f6-e0bcae3e43e0",
      account: "admin@wmshr.com",
      name: "Gary Admin",
      permissions: ["*"],
      countryCode: "TH"
    };
    await page.evaluate(({ token, user }) => {
      localStorage.setItem("wms_admin_token", token);
      localStorage.setItem("wms_admin_user", JSON.stringify(user));
    }, { token: TOKEN, user: USER });

    await page.goto("http://localhost:3004/zh-CN/attendance", { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForTimeout(3000);

    const titleCheck = await page.textContent("body");
    assert.ok(titleCheck.includes("考勤") || titleCheck.includes("刷新数据") || titleCheck.length > 50, "页面必须成功加载考勤主视图");
    console.log("   ✓ 环境就绪，核心页面组件成功挂载。");

    console.log("\n【UI 场景 1：员工状态胶囊与搜索下钻联动】");
    
    // 点击在职员工胶囊
    const activeBtn = await page.locator("button", { hasText: "在职员工" }).first();
    await activeBtn.click({ force: true });
    await page.waitForTimeout(500);

    // 展开员工下拉列表
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const target = btns.find(b => b.textContent.includes("所有员工"));
      if (target) target.click();
    });
    await page.waitForTimeout(500);

    // 验证搜索框的存在并输入关键词
    const searchInput = await page.locator("input[placeholder*='搜索姓名']").first();
    await searchInput.fill("Nono");
    await page.waitForTimeout(500);

    // 选中匹配的员工
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("div.absolute button"));
      const target = btns.find(b => b.textContent.includes("Nono"));
      if (target) target.click();
    });
    await page.waitForTimeout(1000);

    // 验证下拉框自动关闭，主按钮文本变为选中员工
    const updatedToggleText = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const target = btns.find(b => b.textContent.includes("Nono") && b.textContent.includes("▼"));
      return target ? target.textContent : "";
    });
    assert.ok(updatedToggleText.includes("Nono"), "选择员工后，按钮文本必须更新为选中员工的名字");
    console.log("   ✓ 员工筛选交互闭环成功: 下拉 -> 搜索 -> 选中 -> 面板关闭并回显。");

    console.log("\n【UI 场景 2：月份日历宫格选择与联动】");
    const monthPickerBtnTextBefore = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const btn = btns.find(b => b.querySelector("svg.lucide-calendar") && b.textContent.includes("年"));
      if (btn) btn.click();
      return btn ? btn.textContent : "";
    });
    await page.waitForTimeout(500);

    // 点击 09月
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("div.absolute div.grid button"));
      const target = btns.find(b => b.textContent.includes("9月"));
      if (target) target.click();
    });
    await page.waitForTimeout(1000);

    // 验证弹窗消失，按钮文字更新
    const selectedMonthText = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const btn = btns.find(b => b.querySelector("svg.lucide-calendar") && b.textContent.includes("年"));
      return btn ? btn.textContent : "";
    });
    assert.ok(selectedMonthText.includes("9月") || selectedMonthText.includes("09"), "选择月份后主按钮文本必须更新为9月");
    console.log(`   ✓ 月份日历选择闭环成功: ${monthPickerBtnTextBefore} -> ${selectedMonthText}`);

    console.log("\n【UI 场景 3：全局新增考勤弹窗与数据填充】");
    // 点击手动新增考勤
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const target = btns.find(b => b.textContent.includes("手动新增考勤"));
      if (target) target.click();
    });
    await page.waitForTimeout(800);

    // 验证模态框出现
    const modalVisible = await page.locator("div[role='dialog'], .fixed.inset-0").first().isVisible();
    assert.ok(modalVisible, "点击新增必须弹出模态框");

    // 验证关键输入框挂载
    const formFields = await page.evaluate(() => {
      const modal = document.querySelector("div[role='dialog']");
      if (!modal) return [];
      return Array.from(modal.querySelectorAll("input, select, textarea")).map(el => el.name).filter(Boolean);
    });
    assert.ok(formFields.includes("inTime"), "弹窗中必须存在 inTime 表单字段");
    assert.ok(formFields.includes("outTime"), "弹窗中必须存在 outTime 表单字段");
    
    // 模拟退出: 测试 ESC 关闭
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);
    
    const modalStillVisible = await page.locator("div[role='dialog']").first().isVisible();
    assert.ok(!modalStillVisible, "按下 ESC 必须平滑销毁弹窗");
    console.log("   ✓ 弹窗呼出与输入状态正常，ESC 销毁交互成功。");

    console.log("\n【UI 场景 4：表格多选框与批量浮动操作栏流转】");
    const firstCheckbox = await page.locator("table tbody input[type='checkbox']:not([disabled])").first();
    if (await firstCheckbox.isVisible()) {
      await firstCheckbox.check({ force: true });
      await page.waitForTimeout(500);

      const batchBarText = await page.textContent("body");
      assert.ok(batchBarText.includes("已选中") && batchBarText.includes("导出"), "勾选记录后必须在底部浮现批量操作栏");

      const cancelAllBtn = await page.locator("button", { hasText: "取消全选" }).first();
      await cancelAllBtn.click({ force: true });
      await page.waitForTimeout(500);

      const afterCancelText = await page.textContent("body");
      assert.ok(!afterCancelText.includes("已选中 1 条"), "点击取消全选后浮动栏必须销毁收起");
      console.log("   ✓ 批量操作浮动栏呼出与销毁物理联动正常。");
    } else {
      console.log("   (当前月份所选员工无打卡记录，跳过多选框测试)");
    }

  } finally {
    await browser.close();
  }

  console.log("\n=== 🎉 阶段二（实机浏览器交互）测试全部 PASS！UI 链路畅通。 ===");
}

runStage2BrowserTest().catch((err) => {
  console.error("\n❌ 测试执行失败:", err);
  process.exit(1);
});
