import { test, expect } from "@playwright/test";

test.describe("Expense Module E2E Test Suite", () => {
  test.beforeEach(async ({ page }) => {
    // 注入管理员 Token 并在本地存储初始化测试环境
    await page.addInitScript(() => {
      localStorage.setItem("wms_admin_token", "test-token-wmshr-super-admin");
      localStorage.setItem("wms_user", JSON.stringify({
        id: 1,
        username: "admin@wmshr.com",
        name: "系统超级管理员",
        role: "超级管理员",
        permissions: ["*"]
      }));
    });

    await page.goto("http://127.0.0.1:3004");
    // 等待主界面渲染
    await page.waitForLoadState("networkidle");
  });

  test("1. 导航与页面结构加载：能成功切换到报销列表", async ({ page }) => {
    // 点击侧边栏报销列表
    const expenseMenu = page.locator("button, a").filter({ hasText: "报销列表" }).first();
    await expect(expenseMenu).toBeVisible();
    await expenseMenu.click();

    // 验证报销看板统计与主按钮
    await expect(page.locator("text=申报总金额").first()).toBeVisible();
    await expect(page.locator("text=待审核金额").first()).toBeVisible();
    await expect(page.locator("text=已批准总金额").first()).toBeVisible();
    await expect(page.locator("#btn-create-expense")).toBeVisible();
  });

  test("2. 快捷 Tab 过滤与状态筛选：联动正确", async ({ page }) => {
    await page.locator("button, a").filter({ hasText: "报销列表" }).first().click();

    // 点击待审批 Tab
    const pendingTab = page.locator("button").filter({ hasText: "待审批" }).first();
    await expect(pendingTab).toBeVisible();
    await pendingTab.click();

    // 检查表格中是否仅显示待审批单据
    const statusBadges = page.locator("tbody tr");
    const count = await statusBadges.count();
    if (count > 0) {
      await expect(page.locator("tbody tr").first()).toContainText("待审批");
    }

    // 点击全部 Tab 还原
    const allTab = page.locator("button").filter({ hasText: "全部" }).first();
    await allTab.click();
  });

  test("3. 搜索与能搜必能清闭环：关键字搜索与清空联动", async ({ page }) => {
    await page.locator("button, a").filter({ hasText: "报销列表" }).first().click();

    const searchInput = page.locator("input[placeholder*='搜索员工姓名']");
    await expect(searchInput).toBeVisible();

    // 输入搜索关键字
    await searchInput.fill("场地租金");
    await expect(page.locator("tbody")).toContainText("场地租金");

    // 检查清空按钮浮现并点击
    const clearBtn = page.locator("button[title='清空检索']");
    await expect(clearBtn).toBeVisible();
    await clearBtn.click();

    await expect(searchInput).toHaveValue("");
  });

  test("4. 新建费用核销单：完整表单填写、保存并在表格回显", async ({ page }) => {
    await page.locator("button, a").filter({ hasText: "报销列表" }).first().click();

    // 点击新建报销单
    await page.locator("#btn-create-expense").click();

    // 验证弹窗可见
    await expect(page.locator("text=新建费用核销报销单")).toBeVisible();

    // 填写名称
    const testExpenseName = "E2E自动化测试物耗采购_" + Date.now().toString().slice(-4);
    await page.locator("input[placeholder*='请输入账单报销业务名称']").fill(testExpenseName);

    // 填写金额
    await page.locator("input[placeholder='0.00']").fill("258.50");

    // 填写备注
    await page.locator("textarea[placeholder*='请写明报销原委']").fill("E2E自动化测试创建的耗材凭证");

    // 点击保存
    await page.locator("button:has-text('保存记录')").click();

    // 验证弹窗关闭并回显
    await expect(page.locator("text=新建费用核销报销单")).not.toBeVisible();
    await expect(page.locator("tbody")).toContainText(testExpenseName);
  });

  test("5. 查看明细与审批流程进度抽屉", async ({ page }) => {
    await page.locator("button, a").filter({ hasText: "报销列表" }).first().click();

    // 点击第一行的“查看”
    const viewBtn = page.locator("tbody tr Button:has-text('查看')").first();
    if (await viewBtn.isVisible()) {
      await viewBtn.click();
      await expect(page.locator("text=查看报销单")).toBeVisible();
      await expect(page.locator("text=审批流程进度")).toBeVisible();
      // 关闭弹窗
      await page.locator("button:has-text('确定')").last().click();
      await expect(page.locator("text=查看报销单")).not.toBeVisible();
    }
  });

  test("6. 类别管理弹窗：非阻塞内联二次确认机制正常", async ({ page }) => {
    await page.locator("button, a").filter({ hasText: "报销列表" }).first().click();

    // 打开类别配置
    await page.locator("#btn-configure-expense-categories").click();
    await expect(page.locator("text=费用类型配置")).toBeVisible();

    // 添加一个临时类别
    const testCategoryName = "自动化临时类别_" + Date.now().toString().slice(-4);
    await page.locator("input[placeholder*='如：仓储代办']").fill(testCategoryName);
    await page.locator("form Button:has-text('添加')").click();

    // 验证列表出现
    await expect(page.locator(`text=${testCategoryName}`)).toBeVisible();

    // 点击垃圾桶删除图标，触发内联确认
    const categoryRow = page.locator("div.p-3").filter({ hasText: testCategoryName });
    await categoryRow.locator("button[title='删除此类型']").click();

    // 验证内联确认条浮现（绝对无原生 window.confirm 弹框）
    await expect(categoryRow.locator("text=确认删除该类型？")).toBeVisible();
    await categoryRow.locator("button:has-text('确认删除')").click();

    // 验证类别已删除
    await expect(page.locator(`text=${testCategoryName}`)).not.toBeVisible();

    // 关闭弹窗
    await page.locator("button:has-text('保存')").last().click();
  });
});
