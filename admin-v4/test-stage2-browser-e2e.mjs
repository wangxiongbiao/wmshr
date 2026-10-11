import { chromium } from "file:///C:/Users/admin/Desktop/%E9%A1%B9%E7%9B%AE/app/pi-web/node_modules/playwright/index.mjs";
import assert from "node:assert/strict";

console.log("==================================================================");
console.log("🌐 阶段二：Playwright 实机浏览器走查「报销模块全流程真实走查」启动");
console.log("==================================================================");

async function runBrowserE2E() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:/Users/admin/AppData/Local/ms-playwright/chromium-1194/chrome-win/chrome.exe"
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });

  const page = await context.newPage();

  // 拦截后端基础 API，提供合规管理员身份与海外仓上下文
  await page.route("**/api/v4/admin/auth/me", route => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        user: {
          id: 1,
          username: "admin@wmshr.com",
          name: "系统超级管理员",
          role: "超级管理员",
          permissions: ["*"],
          country: "🇹🇭 泰国",
          countryCode: "TH",
          currency: "THB"
        }
      })
    });
  });

  await page.route("**/api/v4/admin/**", route => {
    const url = route.request().url();
    if (url.includes("/auth/me")) return;
    if (url.includes("/employees")) {
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ employees: [], total: 0 }) });
    } else if (url.includes("/attendance-records")) {
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) });
    } else if (url.includes("/leave-requests")) {
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) });
    } else if (url.includes("/attendance-config")) {
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ workHours: 8 }) });
    } else if (url.includes("/holidays")) {
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) });
    } else if (url.includes("/expenses")) {
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items: [] }) });
    } else {
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
    }
  });

  await page.addInitScript(() => {
    localStorage.setItem("wms_admin_token", "test-valid-admin-token");
    localStorage.setItem("wms_admin_user", JSON.stringify({
      id: 1,
      username: "admin@wmshr.com",
      name: "系统超级管理员",
      role: "超级管理员",
      permissions: ["*"],
      country: "🇹🇭 泰国",
      countryCode: "TH",
      currency: "THB"
    }));
  });

  try {
    console.log("\n[Step 1] 访问后台系统并导航至「报销列表」...");
    await page.goto("http://127.0.0.1:3004");
    await page.waitForTimeout(1000);

    const menuBtn = page.locator("button").filter({ hasText: "报销列表" }).first();
    await menuBtn.waitFor({ state: "visible", timeout: 8000 });
    await menuBtn.click();
    await page.waitForTimeout(500);

    console.log("  - 检查顶部指标统计看板...");
    assert.ok(await page.locator("text=申报总金额").first().isVisible(), "申报总金额卡片未正常渲染");
    assert.ok(await page.locator("text=待审核金额").first().isVisible(), "待审核金额卡片未正常渲染");
    assert.ok(await page.locator("text=已批准总金额").first().isVisible(), "已批准总金额卡片未正常渲染");
    assert.ok(await page.locator("#btn-create-expense").isVisible(), "新建报销单按钮未渲染");
    console.log("  ✓ Step 1 PASS: 成功进入报销列表大盘，统计卡片正常。");

    console.log("\n[Step 2] 验证状态快捷分段 Tab 切换与过滤联动...");
    const pendingTab = page.locator("button").filter({ hasText: "待审批" }).first();
    await pendingTab.click();
    await page.waitForTimeout(300);

    assert.ok(await page.locator("table").isVisible(), "待审批 Tab 表格未能正常加载");
    
    const allTab = page.locator("button").filter({ hasText: "全部" }).first();
    await allTab.click();
    await page.waitForTimeout(300);
    console.log("  ✓ Step 2 PASS: 状态快捷 Tab 切换流畅。");

    console.log("\n[Step 3] 验证搜索框能搜必能清与分页联动...");
    const searchInput = page.locator("input[placeholder*='搜索员工姓名']");
    await searchInput.fill("场地租金");
    await page.waitForTimeout(300);

    const clearBtn = page.locator("button[title='清空检索']");
    assert.ok(await clearBtn.isVisible(), "搜索框未在输入后浮现一键清空 X 按钮");
    await clearBtn.click();
    await page.waitForTimeout(300);
    assert.equal(await searchInput.inputValue(), "", "清空按钮点击后未清空输入框文本");
    console.log("  ✓ Step 3 PASS: 搜索框一键清空闭环验证通过。");

    console.log("\n[Step 4] 验证新建报销单表单流程与新增数据回显...");
    const createBtn = page.locator("#btn-create-expense");
    await createBtn.click();
    await page.waitForTimeout(500);

    assert.ok(await page.locator("text=新建费用核销报销单").isVisible(), "新建费用核销报销单弹窗未能打开");

    const testExpenseName = "Playwright自动化物耗采购_" + Date.now().toString().slice(-4);
    await page.locator("input[placeholder*='请输入账单报销业务名称']").fill(testExpenseName);
    await page.locator("input[placeholder='0.00']").fill("168.00");
    const payerInput = page.locator("input[placeholder*='请输入手垫支出人姓名']");
    if (await payerInput.isVisible()) {
      await payerInput.fill("张三(自动化)");
    }
    await page.locator("textarea[placeholder*='请写明报销原委']").fill("真实浏览器走查实测单据");

    const saveBtn = page.locator("button:has-text('保存记录')");
    await saveBtn.click();
    await page.waitForTimeout(600);

    assert.ok(!(await page.locator("text=新建费用核销报销单").isVisible()), "保存后弹窗未自动关闭");
    assert.ok(await page.locator(`text=${testExpenseName}`).isVisible(), "新建的报销单未在表格中及时回显");
    console.log(`  ✓ Step 4 PASS: 报销单创建成功，表格回显单据: ${testExpenseName}`);

    console.log("\n[Step 5] 验证报销单查看抽屉与多级审批流程进度轴...");
    const detailRow = page.locator("tr").filter({ hasText: testExpenseName });
    await detailRow.locator("button:has-text('查看')").click();
    await page.waitForTimeout(500);

    assert.ok(await page.locator("span:has-text('查看报销单')").first().isVisible(), "查看详情抽屉未打开");
    assert.ok(await page.locator("text=审批流程进度").isVisible(), "未展示审批流程进度时间轴");

    await page.locator("button:has-text('确定')").last().click();
    await page.waitForTimeout(400);
    console.log("  ✓ Step 5 PASS: 查看详情与审批时间轴正常展示。");

    console.log("\n[Step 6] 验证费用类别管理非阻塞内联二次确认机制...");
    const categoryConfigBtn = page.locator("#btn-configure-expense-categories");
    await categoryConfigBtn.click();
    await page.waitForTimeout(500);

    assert.ok(await page.locator("text=费用类型配置").isVisible(), "类型配置弹窗未正常弹出");

    const tempCategory = "临时自动化类型_" + Date.now().toString().slice(-4);
    await page.locator("input[placeholder*='如：仓储代办']").fill(tempCategory);
    await page.locator("form button:has-text('添加')").click();
    await page.waitForTimeout(300);

    const deleteBtn = page.locator(`button.btn-delete-cat[data-cat='${tempCategory}']`);
    assert.ok(await deleteBtn.isVisible(), "新类型未添加至列表");

    await deleteBtn.click();
    await page.waitForTimeout(300);

    assert.ok(await page.locator("text=确认删除该类型？").isVisible(), "内联删除确认条未浮现");
    await page.locator("button:has-text('确认删除')").click();
    await page.waitForTimeout(300);

    assert.ok(!(await deleteBtn.isVisible()), "类型未被成功删除");
    await page.locator("button:has-text('保存')").last().click();
    await page.waitForTimeout(400);
    console.log("  ✓ Step 6 PASS: 类别内联非阻塞二次确认交互完全闭环。");

    console.log("\n[Step 7] 验证报销单删除二次确认弹窗与通信期双向锁定...");
    const targetRow = page.locator("tr").filter({ hasText: testExpenseName });
    await targetRow.locator("button[title='报销撤销删除']").click();
    await page.waitForTimeout(400);

    assert.ok(await page.locator("span:has-text('确认删除报销单')").first().isVisible(), "删除确认弹窗未打开");
    assert.ok(await page.locator("text=此操作不可恢复！").isVisible(), "缺少不可逆后果警示文本");

    // 点击弹窗内唯一定义的确认删除按钮
    const confirmDeleteBtn = page.locator("#btn-confirm-delete-expense");
    await confirmDeleteBtn.click();
    await page.waitForTimeout(600);

    assert.ok(!(await page.locator("span:has-text('确认删除报销单')").first().isVisible()), "删除后弹窗未关闭");
    // 检查表格中已不包含该测试记录
    assert.ok(!(await page.locator("tbody").filter({ hasText: testExpenseName }).isVisible()), "删除后单据仍残留在表格中");
    console.log("  ✓ Step 7 PASS: 删除二次确认防误触弹窗闭环完成。");

    console.log("\n==================================================================");
    console.log("🎉 阶段二：Playwright 实机浏览器全流程走查 7 项步骤 100% 成功通过！");
    console.log("==================================================================");

  } catch (error) {
    console.error("❌ 浏览器测试执行异常:", error);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

runBrowserE2E();
