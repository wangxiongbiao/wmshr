import { chromium } from "file:///C:/Users/admin/Desktop/项目/app/pi-web/node_modules/playwright/index.mjs";

async function main() {
  const browser = await chromium.launch({
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
    headless: true
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.goto("http://localhost:3004/zh-CN/login", { waitUntil: "domcontentloaded" });

  const TOKEN = "eyJzdGFnZSI6ImF1dGhlbnRpY2F0ZWQiLCJ1c2VySWQiOiI4NjdiOTIxOC1hMjMxLTRiOGMtYWUyYi0yM2Y5MjJlNWVlNmYiLCJhY2NvdW50SWQiOiI4NjdiOTIxOC1hMjMxLTRiOGMtYWUyYi0yM2Y5MjJlNWVlNmYiLCJvd25lclVzZXJJZCI6IjYwYWY0ZTNjLTI4OTAtNDJmMC04OWY2LWUwYmNhZTNlNDNlMCIsImFkbWluT3duZXJVc2VySWQiOiI2MGFmNGUzYy0yODkwLTQyZjAtODlmNi1lMGJjYWUzZTQzZTAiLCJhY2NvdW50IjoiYWRtaW5Ad21zaHIuY29tIiwiY291bnRyeUNvZGUiOiJUSCIsInBlcm1pc3Npb25zIjpbIioiXSwiZXhwIjoxODIzMDk2OTgxNDkzfQ.hspNedKtZ0r03NHNBxCJKUkSETde-glH9LdmP7I5ue4";
  const USER = {
    id: "867b9218-a231-4b8c-ae2b-23f922e5ee6f",
    accountId: "867b9218-a231-4b8c-ae2b-23f922e5ee6f",
    ownerUserId: "60af4e3c-2890-42f0-89f6-e0bcae3e43e0",
    adminOwnerUserId: "60af4e3c-2890-42f0-89f6-e0bcae3e43e0",
    account: "admin@wmshr.com",
    permissions: ["*"],
    countryCode: "TH"
  };

  await page.evaluate(({ token, user }) => {
    localStorage.setItem("wms_admin_token", token);
    localStorage.setItem("wms_admin_user", JSON.stringify(user));
  }, { token: TOKEN, user: USER });

  await page.goto("http://localhost:3004/zh-CN/attendance", { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);

  const text = await page.innerText("body");
  console.log("BODY TEXT:\n", text);

  if (adjustBtns > 0) {
    console.log("Clicking first adjust button...");
    await page.locator("div.overflow-x-auto table tbody tr button:has-text('调整')").first().click();
    await page.waitForTimeout(1000);

    const isModalVisible = await page.locator("div:has-text('调整考勤记录'), div:has-text('检测到已有记录')").first().isVisible();
    console.log("Is adjustment modal visible:", isModalVisible);

    const inTimeValue = await page.locator("input[name='inTime']").inputValue();
    const outTimeValue = await page.locator("input[name='outTime']").inputValue();
    console.log("Modal inTime:", inTimeValue, "outTime:", outTimeValue);
  }

  await browser.close();
}

main().catch(console.error);
