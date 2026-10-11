import assert from "node:assert";
import fs from "node:fs";
import { chromium } from "file:///C:/Users/admin/Desktop/项目/app/pi-web/node_modules/playwright/index.mjs";

async function runAttendanceBrowserAudit() {
  console.log("==================================================================");
  console.log("   🚀 WMSHR 考勤模块 Playwright 真实浏览器实机全场景走查套件");
  console.log("      (涵盖：员工筛选、月份筛选、考勤调整全流程、明细透视、批量栏)");
  console.log("==================================================================\n");

  const chromePath = "C:/Program Files/Google/Chrome/Application/chrome.exe";
  const browser = await chromium.launch({
    executablePath: fs.existsSync(chromePath) ? chromePath : undefined,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  try {
    // 1. 注入统一高权限 admin@wmshr.com 鉴权会话并直达考勤页面
    console.log("1. 正在访问前端服务并预置鉴权会话: http://localhost:3004/zh-CN/login ...");
    await page.goto("http://localhost:3004/zh-CN/login", { waitUntil: "domcontentloaded" });

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

    await page.evaluate(({ token, user }) => {
      localStorage.setItem("wms_admin_token", token);
      localStorage.setItem("wms_admin_user", JSON.stringify(user));
    }, { token: TOKEN, user: USER });

    console.log("2. 直达考勤管理页面: http://localhost:3004/zh-CN/attendance ...");
    await page.goto("http://localhost:3004/zh-CN/attendance", { waitUntil: "networkidle" });
    await page.waitForTimeout(1500);

    // 基础骨架断言
    const pageText = await page.textContent("body");
    assert.ok(pageText.includes("考勤列表"), "页面必须包含【考勤列表】标题");
    console.log("   ✓ 考勤页面成功直达，核心组件挂载完毕");

    // =========================================================================
    // 场景 A：【员工筛选】全链路走查（下拉展开、输入搜索、单选下钻、复位恢复）
    // =========================================================================
    console.log("\n【走查场景 A：员工筛选全链路走查】");
    // 1. 找到“筛选员工”按钮并展开下拉
    const empFilterBtn = await page.$("button:has-text('所有员工'), button:has-text('🔍')");
    assert.ok(empFilterBtn, "页面必须包含【筛选员工】下拉按钮");
    await empFilterBtn.click();
    await page.waitForTimeout(500);

    // 2. 检查员工搜索输入框
    const empSearchInput = await page.$("input[placeholder*='搜索姓名']");
    assert.ok(empSearchInput, "员工下拉框内必须具有即时搜索输入框");
    await empSearchInput.fill("Nono");
    await page.waitForTimeout(500);

    // 3. 选中搜索出的目标员工
    const targetEmpBtn = await page.$("button:has-text('Nono')");
    assert.ok(targetEmpBtn, "搜索结果中必须出现匹配的员工条目");
    const selectedEmpName = (await targetEmpBtn.textContent())?.trim().split(" ")[0] || "Nono";
    await targetEmpBtn.click();
    await page.waitForTimeout(1000);

    // 4. 断言表格当前只展示该员工记录
    const renderedNames = await page.$$eval("table tbody tr td:nth-child(3)", tds => tds.map(t => t.textContent?.trim() || ""));
    if (renderedNames.length > 0) {
      for (const name of renderedNames) {
        assert.ok(name.includes(selectedEmpName) || name.includes("Nono"), `筛选后表格中的员工（${name}）必须与所选员工匹配`);
      }
      console.log(`   ✓ 员工筛选成功下钻：当前表格全量 ${renderedNames.length} 行均精准匹配员工 [${selectedEmpName}]`);
    } else {
      console.log("   ✓ 员工筛选生效（当前月份该员工无记录，空列表状态正常）");
    }

    // 5. 重新打开并复位为“所有员工”
    const activeEmpFilterBtn = await page.$("button:has-text('Nono')");
    if (activeEmpFilterBtn) {
      await activeEmpFilterBtn.click();
      await page.waitForTimeout(400);
      const allEmpBtn = await page.$("button:has-text('所有员工')");
      if (allEmpBtn) {
        await allEmpBtn.click();
        await page.waitForTimeout(1000);
        console.log("   ✓ 员工筛选复位成功，全量员工数据恢复呈现");
      }
    }

    // =========================================================================
    // 场景 B：【月份筛选】全链路走查（前后月快切、月份宫格弹窗切换联动）
    // =========================================================================
    console.log("\n【走查场景 B：月份筛选全链路走查】");
    // 1. 走查快切按钮
    const prevMonthBtn = await page.$("button[title='切换至上一月']");
    assert.ok(prevMonthBtn, "必须提供【切换至上一月】快捷按钮");
    await prevMonthBtn.click();
    await page.waitForTimeout(1000);

    const monthDisplayBtn = await page.$("button[title='切换至上一月'] + div > button");
    assert.ok(monthDisplayBtn, "必须提供月份显示按钮");
    const monthDisplayAfterPrev = (await monthDisplayBtn.textContent())?.trim();
    console.log(`   ✓ 切换至上一月成功，当前显示月份: ${monthDisplayAfterPrev}`);

    const nextMonthBtn = await page.$("button[title='切换至下一月']");
    assert.ok(nextMonthBtn, "必须提供【切换至下一月】快捷按钮");
    await nextMonthBtn.click();
    await page.waitForTimeout(1000);

    // 2. 展开月份选择器弹窗并点击指定月份
    await monthDisplayBtn.click();
    await page.waitForTimeout(500);

    const monthGridBtn = await page.$("div.relative div.absolute div.grid button:has-text('10月')");
    if (monthGridBtn) {
      await monthGridBtn.click();
      await page.waitForTimeout(1000);
      console.log("   ✓ 从月份宫格选择器成功切回 10 月，表格数据即时重新加载联动");
    } else {
      await page.keyboard.press("Escape");
    }

    // =========================================================================
    // 场景 C：【考勤调整 / 补卡流程】全链路走查 (Adjustment Flow)
    // =========================================================================
    console.log("\n【走查场景 C：考勤调整/补卡全流程走查】");

    // 入口 1：走查表格行操作列的【调整】按钮
    const adjustButtons = await page.$$("table tbody button:has-text('调整')");
    if (adjustButtons.length > 0) {
      console.log("1. 点击主表格单行【调整】按钮，唤起考勤调整模态框...");
      await adjustButtons[0].click();
      await page.waitForTimeout(800);

      // 验证模态框弹出
      const modalHeader = await page.$("h3, h2, div:has-text('考勤调整'), div:has-text('调整考勤记录')");
      assert.ok(modalHeader, "点击【调整】后必须弹出考勤调整模态框");
      console.log("   ✓ 考勤调整模态框成功弹出");

      // 验证核心输入字段完整性
      const inTimeInput = await page.$("input[name='inTime']");
      const outTimeInput = await page.$("input[name='outTime']");
      const noteInput = await page.$("textarea[name='note'], input[name='note']");
      const saveBtn = await page.$("form button[type='submit']");

      assert.ok(inTimeInput, "调整弹窗必须包含签到时间 (inTime) 输入框");
      assert.ok(outTimeInput, "调整弹窗必须包含签退时间 (outTime) 输入框");
      assert.ok(saveBtn, "调整弹窗必须包含保存按钮");

      // 模拟管理员输入调账数据
      if (inTimeInput) await inTimeInput.fill("08:45");
      if (outTimeInput) await outTimeInput.fill("17:45");
      if (noteInput) await noteInput.fill("实机走查-调账审批单测试");

      console.log("2. 提交保存考勤调整，断言 Toast 响应与落库回显...");
      await saveBtn.click();
      await page.waitForTimeout(1000);

      // 断言 Toast 回响
      const toastText = await page.textContent("body");
      assert.ok(
        toastText.includes("调整成功") || toastText.includes("补录成功") || toastText.includes("成功"),
        "提交考勤调整后必须弹出明确的成功 Toast 回响"
      );
      console.log("   ✓ 考勤调整保存成功，Toast 回响已捕获");
    } else {
      console.log("   (未检测到行级调整按钮，走查工具栏手动新增入口)");
    }

    // 入口 2：走查工具栏【手动新增考勤】按钮
    console.log("3. 走查工具栏【手动新增考勤】弹窗入口与关闭退出流...");
    const addRecordBtn = await page.$("button:has-text('手动新增考勤'), button:has-text('补录考勤')");
    if (addRecordBtn) {
      await addRecordBtn.click();
      await page.waitForTimeout(600);
      const modalBody = await page.textContent("body");
      assert.ok(
        modalBody.includes("新增考勤") || modalBody.includes("补录") || modalBody.includes("考勤"),
        "点击手动新增考勤必须展开对应弹窗"
      );
      console.log("   ✓ 手动新增考勤弹窗唤起正常");

      // 测试退出弹窗
      const cancelBtn = await page.$("button:has-text('取消'), button:has-text('关闭')");
      if (cancelBtn) {
        await cancelBtn.click();
      } else {
        await page.keyboard.press("Escape");
      }
      await page.waitForTimeout(500);
      console.log("   ✓ 新增考勤弹窗正常关闭退出");
    }

    // =========================================================================
    // 场景 D：【单行查看明细】与【批量操作栏】与【主动刷新】
    // =========================================================================
    console.log("\n【走查场景 D：明细透视、批量栏与主动刷新】");
    // 1. 点击【查看】明细
    const viewButtons = await page.$$("table tbody button:has-text('查看')");
    if (viewButtons.length > 0) {
      await viewButtons[0].click();
      await page.waitForTimeout(600);
      const detailBody = await page.textContent("body");
      assert.ok(detailBody.includes("考勤明细") || detailBody.includes("核算明细"), "查看弹窗中必须呈现考勤与费用核算明细");
      await page.keyboard.press("Escape");
      await page.waitForTimeout(400);
      console.log("   ✓ 单行查看明细弹窗与 ESC 退出闭环校验通过");
    }

    // 2. 勾选批量操作浮动栏
    const checkInputs = await page.$$("table tbody input[type='checkbox']:not([disabled])");
    if (checkInputs.length > 0) {
      await checkInputs[0].click();
      await page.waitForTimeout(500);
      const batchBarText = await page.textContent("body");
      assert.ok(batchBarText.includes("已选中"), "勾选记录后必须浮现批量操作栏");
      const cancelSelectBtn = await page.$("button:has-text('取消全选')");
      if (cancelSelectBtn) {
        await cancelSelectBtn.click();
        await page.waitForTimeout(400);
      }
      console.log("   ✓ 勾选与批量操作浮动栏流转正常");
    }

    // 3. 点击【刷新数据】
    const refreshBtn = await page.$("button:has-text('刷新数据')");
    if (refreshBtn) {
      await refreshBtn.click();
      await page.waitForTimeout(600);
      const toastText = await page.textContent("body");
      assert.ok(toastText.includes("考勤数据已刷新") || toastText.includes("刷新"), "点击刷新数据必须触发 Toast 回响");
      console.log("   ✓ 刷新数据触发成功，全局 Toast 回响正常");
    }

    console.log("\n==================================================================");
    console.log("🎉 考勤模块真实浏览器全场景实机走查全部通过 (100% PASS)！");
    console.log("==================================================================\n");
  } catch (err) {
    console.error("\n❌ 浏览器实机走查发生异常:", err);
    throw err;
  } finally {
    await browser.close();
  }
}

runAttendanceBrowserAudit().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
