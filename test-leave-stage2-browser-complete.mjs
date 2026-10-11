import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { chromium } from "file:///C:/Users/admin/Desktop/项目/app/pi-web/node_modules/playwright/index.mjs";
import { signToken } from "./apps/admin/server/auth-v4.js";

console.log("=======================================================================");
console.log("   🚀 [Phase 2] 请假管理模块真实浏览器实机操作走查 (Real Browser E2E)");
console.log("=======================================================================\n");

const SCREENSHOT_DIR = path.resolve("test-screenshots/leave-stage2");
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

const envContent = fs.readFileSync("apps/admin/.env", "utf-8");
const SUPABASE_SERVICE_ROLE_KEY = envContent.split("\n").find(line => line.startsWith("SUPABASE_SERVICE_ROLE_KEY="))?.split("=")[1]?.trim();

const ADMIN_URL_PREFIX = "http://127.0.0.1:8789/api/v4/admin";

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

const TOKEN = signToken({
  stage: "authenticated",
  userId: USER.id,
  accountId: USER.accountId,
  ownerUserId: USER.ownerUserId,
  adminOwnerUserId: USER.ownerUserId,
  account: USER.account,
  countryCode: USER.countryCode,
  permissions: USER.permissions
}, 86400000, SUPABASE_SERVICE_ROLE_KEY);

const ADMIN_HEADERS = {
  "Content-Type": "application/json",
  "X-User-Email": USER.email,
  "Authorization": `Bearer ${TOKEN}`
};

async function apiRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const reqOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || "GET",
      headers: options.headers || {}
    };

    const req = http.request(reqOptions, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        try {
          if (!data) return resolve({ status: res.statusCode, body: null });
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on("error", (e) => reject(e));
    if (options.body) req.write(options.body);
    req.end();
  });
}

const browserSteps = [];

async function step(id, name, fn) {
  try {
    await fn();
    browserSteps.push({ id, name, passed: true });
    console.log(`  [✅ PASS] ${id}: ${name}`);
  } catch (err) {
    browserSteps.push({ id, name, passed: false, error: err.message });
    console.log(`  [❌ FAIL] ${id}: ${name}`);
    console.error(`     原因: ${err.message}`);
    throw err;
  }
}

async function runStage2Browser() {
  const randNum = Math.floor(1000 + Math.random() * 9000);
  const testEmpUsername = `ui_emp_${randNum}`;
  const testEmpName = `UI测试员工_${randNum}`;
  let testEmpId = null;

  console.log(`[准备工作] 预创建用于 UI 实机测试的专属员工: ${testEmpName}...`);
  const createEmpRes = await apiRequest(`${ADMIN_URL_PREFIX}/employees`, {
    method: "POST",
    headers: ADMIN_HEADERS,
    body: JSON.stringify({
      employeeNo: testEmpUsername,
      username: testEmpUsername,
      name: testEmpName,
      phone: `138${randNum}1234`,
      password: "Aa123456",
      status: "active",
      dept: "仓储部",
      warehouseCode: "TH",
      salaryType: "daily",
      dailyWage: 300,
      joinDate: "2026-01-01"
    })
  });
  assert.ok([200, 201].includes(createEmpRes.status), "预创建测试员工失败");
  testEmpId = createEmpRes.body?.employee?.id || createEmpRes.body?.data?.id || createEmpRes.body?.id;
  console.log(`[准备工作] 专属测试员工已就绪: ID=${testEmpId}, 姓名=${testEmpName}`);

  const chromePath = "C:/Program Files/Google/Chrome/Application/chrome.exe";
  const browser = await chromium.launch({
    executablePath: fs.existsSync(chromePath) ? chromePath : undefined,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });

  const page = await context.newPage();

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      console.log(`  [Browser Console Error]: ${msg.text()}`);
    }
  });

  try {
    // 注入管理员 Token
    await page.goto("http://localhost:3004/zh-CN/login", { waitUntil: "domcontentloaded" });
    await page.evaluate(({ token, user }) => {
      localStorage.setItem("wms_admin_token", token);
      localStorage.setItem("wms_admin_user", JSON.stringify(user));
      localStorage.setItem("wmshr_admin_token", token);
      localStorage.setItem("wmshr_admin_user", JSON.stringify(user));
    }, { token: TOKEN, user: USER });

    console.log("准备进入请假模块页面 (leave_requests)...");

    // TC-UI01: 首屏结构与指标呈现
    await step("TC-UI01", "首屏加载与请假管理基础结构回显", async () => {
      await page.goto("http://localhost:3004/zh-CN/leave_requests", { waitUntil: "networkidle" });
      await page.waitForTimeout(1000);

      const hasHeading = await page.evaluate(() => {
        return document.body.innerText.includes("请假列表") || document.body.innerText.includes("代录请假单");
      });
      assert.ok(hasHeading, "页面未能成功载入请假管理模块");

      // 验证代录请假单按钮存在
      const addBtn = page.locator("button:has-text('代录请假单')").first();
      await addBtn.waitFor({ state: "visible", timeout: 5000 });

      // 验证状态筛选 Tabs
      const allTab = page.locator("button:has-text('全部')").first();
      await allTab.waitFor({ state: "visible", timeout: 5000 });

      const shot01 = path.join(SCREENSHOT_DIR, "01_initial_page.png");
      await page.screenshot({ path: shot01 });
      console.log(`     [截图留存]: ${shot01}`);
    });

    // TC-UI02: 搜索与筛选过滤联动
    await step("TC-UI02", "搜索框输入、清空与状态 Tab 过滤切换", async () => {
      const searchInput = page.locator("input[placeholder*='搜索员工']").first();
      await searchInput.fill("NON_EXISTENT_KEYWORD_XYZ");
      await page.waitForTimeout(400);

      // 验证无数据空态
      const emptyOrFew = await page.evaluate(() => {
        return (
          document.body.innerText.includes("暂无符合条件的请假记录") ||
          document.body.innerText.includes("暂无请假记录") ||
          document.querySelectorAll("tbody tr td[colspan]").length > 0
        );
      });
      assert.ok(emptyOrFew, "无效搜索关键字应导致表格显示暂无符合条件记录空态");

      // 清空搜索输入框
      const clearBtn = page.locator("button[title='清空搜索']").first();
      if (await clearBtn.isVisible()) {
        await clearBtn.click();
        await page.waitForTimeout(300);
      } else {
        await searchInput.fill("");
        await page.waitForTimeout(300);
      }

      // 切换待审批 Tab
      const pendingTab = page.locator("button:has-text('待审批')").first();
      await pendingTab.click();
      await page.waitForTimeout(400);

      // 切换回全部 Tab
      const allTab = page.locator("button:has-text('全部')").first();
      await allTab.click();
      await page.waitForTimeout(400);

      const shot02 = path.join(SCREENSHOT_DIR, "02_filter_and_search.png");
      await page.screenshot({ path: shot02 });
      console.log(`     [截图留存]: ${shot02}`);
    });

    // TC-UI03: 代录请假单模态框录入、提交与 Toast 回响
    const uniqueReason = `UI实测事假_${randNum}`;
    await step("TC-UI03", "代录请假单模态框表单填写与提交闭环", async () => {
      const addBtn = page.locator("button:has-text('代录请假单')").first();
      await addBtn.click();
      await page.waitForTimeout(600);

      // 验证模态框出现
      const modal = page.locator("[role='dialog']");
      await modal.waitFor({ state: "visible", timeout: 3000 });

      // 选择我们刚创建的专属员工
      const empSelectTrigger = modal.locator("button[role='combobox']").first();
      await empSelectTrigger.click();
      await page.waitForTimeout(300);
      const empOption = page.locator(`[role='option']:has-text('${testEmpName}')`).first();
      if (await empOption.isVisible()) {
        await empOption.click();
      } else {
        // 如果在列表中，直接选第一个在职员工
        await page.locator("[role='option']").first().click();
      }
      await page.waitForTimeout(300);

      // 填写请假原因（根据精确 placeholder 选择）
      const reasonInput = modal.locator("input[placeholder*='请输入请假具体原因']").first();
      await reasonInput.waitFor({ state: "visible", timeout: 3000 });
      await reasonInput.fill(uniqueReason);

      // 将初始状态选择为“待审批 (草稿待确认)”
      const triggers = modal.locator("button[role='combobox']");
      const triggerCount = await triggers.count();
      if (triggerCount >= 3) {
        await triggers.nth(2).click();
        await page.waitForTimeout(300);
        const pendingOption = page.locator("[role='option']:has-text('待审批')").first();
        if (await pendingOption.isVisible()) {
          await pendingOption.click();
          await page.waitForTimeout(300);
        }
      }

      const shot03 = path.join(SCREENSHOT_DIR, "03_create_modal_filled.png");
      await page.screenshot({ path: shot03 });
      console.log(`     [截图留存]: ${shot03}`);

      // 点击确认录入
      const submitBtn = page.locator("button:has-text('确认录入')").first();
      await submitBtn.click();

      // 等待 Toast 弹出
      const toast = page.locator("[role='alert'], .toast, div:has-text('已成功为')").first();
      await toast.waitFor({ state: "visible", timeout: 5000 });
      const toastText = await toast.innerText();
      console.log(`     [Toast 检测]: ${toastText.replace(/\n/g, ' ')}`);
      assert.ok(toastText.includes("已成功为") || toastText.includes("请假申请"), "录入成功 Toast 未正确弹出");

      const shot04 = path.join(SCREENSHOT_DIR, "04_toast_create_success.png");
      await page.screenshot({ path: shot04 });
      console.log(`     [截图留存]: ${shot04}`);

      // 验证模态框自动关闭
      await page.waitForTimeout(1000);
      assert.ok(!(await modal.isVisible()), "提交后模态框未自动关闭");

      // 验证表格中包含该新增记录
      const tableText = await page.locator("table").innerText();
      assert.ok(tableText.includes(uniqueReason), "表格中未即时新增刚提交的请假单");
    });

    // TC-UI04: 行级审批交互与状态胶囊即时刷新
    await step("TC-UI04", "行级审批通过操作、Toast 回响与状态胶囊刷新", async () => {
      // 找到包含 uniqueReason 的那一行 tr
      const row = page.locator(`tr:has-text('${uniqueReason}')`).first();
      await row.waitFor({ state: "visible", timeout: 5000 });

      // 点击“同意”按钮
      const approveBtn = row.locator("button:has-text('同意')").first();
      await approveBtn.waitFor({ state: "visible", timeout: 3000 });
      await approveBtn.click();

      // 验证 Toast 回响
      const toast = page.locator("div:has-text('已批准')").first();
      await toast.waitFor({ state: "visible", timeout: 5000 });
      const toastText = await toast.innerText();
      console.log(`     [Toast 检测]: ${toastText.replace(/\n/g, ' ')}`);
      assert.ok(toastText.includes("已批准"), "批准操作 Toast 未正确提示");

      // 验证状态胶囊刷新为已批准，且操作按钮变为“重置审批”
      await page.waitForTimeout(1000);
      const resetBtn = row.locator("button:has-text('重置审批')").first();
      await resetBtn.waitFor({ state: "visible", timeout: 5000 });

      const shot05 = path.join(SCREENSHOT_DIR, "05_approved_status_and_toast.png");
      await page.screenshot({ path: shot05 });
      console.log(`     [截图留存]: ${shot05}`);
    });

    // TC-UI05: 行级删除二次确认与即时清除
    await step("TC-UI05", "行级删除唤起确认弹窗、取消与确认彻底删除闭环", async () => {
      const row = page.locator(`tr:has-text('${uniqueReason}')`).first();
      await row.waitFor({ state: "visible", timeout: 5000 });

      // 点击行级删除按钮 (垃圾桶图标)
      const deleteIconBtn = row.locator("button:has(svg.lucide-trash-2)").first();
      await deleteIconBtn.click();
      await page.waitForTimeout(500);

      // 验证 LeaveDeleteDialog 二次确认弹窗唤起
      const deleteDialog = page.locator("[role='dialog']:has-text('删除请假记录确认')").first();
      await deleteDialog.waitFor({ state: "visible", timeout: 3000 });

      // 取消测试
      const cancelBtn = deleteDialog.locator("button:has-text('取消')").first();
      await cancelBtn.click();
      await page.waitForTimeout(400);
      assert.ok(!(await deleteDialog.isVisible()), "取消后删除弹窗未正常关闭");
      assert.ok(await row.isVisible(), "取消删除后记录不应被删除");

      // 重新唤起并确认删除
      await deleteIconBtn.click();
      await page.waitForTimeout(400);
      await deleteDialog.waitFor({ state: "visible", timeout: 3000 });

      const shot06 = path.join(SCREENSHOT_DIR, "06_delete_dialog_open.png");
      await page.screenshot({ path: shot06 });
      console.log(`     [截图留存]: ${shot06}`);

      // 点击确认删除按钮
      const confirmDeleteBtn = deleteDialog.locator("button:has-text('确认删除')").first();
      await confirmDeleteBtn.click();

      // 验证 Toast 弹出
      const toast = page.locator("div:has-text('请假记录已彻底删除')").first();
      await toast.waitFor({ state: "visible", timeout: 5000 });
      const toastText = await toast.innerText();
      console.log(`     [Toast 检测]: ${toastText.replace(/\n/g, ' ')}`);
      assert.ok(toastText.includes("请假记录已彻底删除"), "删除成功 Toast 未正确提示");

      const shot07 = path.join(SCREENSHOT_DIR, "07_toast_delete_success.png");
      await page.screenshot({ path: shot07 });
      console.log(`     [截图留存]: ${shot07}`);

      // 验证行已彻底从前端列表移除
      await page.waitForTimeout(1000);
      const isGone = !(await page.locator(`tr:has-text('${uniqueReason}')`).isVisible());
      assert.ok(isGone, "删除后该请假记录依然留在表格中");
      console.log("     [DOM 验证]: 确认已删除请假单已彻底从前端列表移除。");
    });

    console.log("\n=======================================================================");
    console.log("   🎉 阶段二真实浏览器实机走查所有步骤 (TC-UI01 ~ TC-UI05) 全部 PASS！");
    console.log("=======================================================================");

  } finally {
    await browser.close();
    if (testEmpId) {
      console.log(`[清理收尾] 清理测试专用员工 ID=${testEmpId}...`);
      await apiRequest(`${ADMIN_URL_PREFIX}/employees/${testEmpId}`, { method: "DELETE", headers: ADMIN_HEADERS }).catch(() => {});
      console.log(`[清理收尾] 测试数据已全部干净清理。`);
    }
  }
}

runStage2Browser().catch((err) => {
  console.error("阶段二测试失败:", err);
  process.exit(1);
});
