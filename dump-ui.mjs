import fs from "fs";
import { chromium } from "file:///C:/Users/admin/Desktop/项目/app/pi-web/node_modules/playwright/index.mjs";

async function dump() {
  const chromePath = "C:/Program Files/Google/Chrome/Application/chrome.exe";
  const browser = await chromium.launch({
    executablePath: fs.existsSync(chromePath) ? chromePath : undefined,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));

  await page.goto("http://localhost:3004/zh-CN/login", { waitUntil: "domcontentloaded" });
  const TOKEN = "eyJzdGFnZSI6ImF1dGhlbnRpY2F0ZWQiLCJ1c2VySWQiOiI4NjdiOTIxOC1hMjMxLTRiOGMtYWUyYi0yM2Y5MjJlNWVlNmYiLCJhY2NvdW50SWQiOiI4NjdiOTIxOC1hMjMxLTRiOGMtYWUyYi0yM2Y5MjJlNWVlNmYiLCJvd25lclVzZXJJZCI6IjYwYWY0ZTNjLTI4OTAtNDJmMC04OWY2LWUwYmNhZTNlNDNlMCIsImFkbWluT3duZXJVc2VySWQiOiI2MGFmNGUzYy0yODkwLTQyZjAtODlmNi1lMGJjYWUzZTQzZTAiLCJhY2NvdW50IjoiYWRtaW5Ad21zaHIuY29tIiwiY291bnRyeUNvZGUiOiJUSCIsInBlcm1pc3Npb25zIjpbIioiXSwiZXhwIjoxODIzMDk2OTgxNDkzfQ.hspNedKtZ0r03NHNBxCJKUkSETde-glH9LdmP7I5ue4";
  const USER = {
    id: "867b9218-a231-4b8c-ae2b-23f922e5ee6f",
    accountId: "867b9218-a231-4b8c-ae2b-23f922e5ee6f",
    ownerUserId: "60af4e3c-2890-42f0-89f6-e0bcae3e43e0",
    authUserId: "867b9218-a231-4b8c-ae2b-23f922e5ee6f",
    account: "admin@wmshr.com",
    role: "admin"
  };

  await page.evaluate(({ token, user }) => {
    localStorage.setItem("wms_admin_token", token);
    localStorage.setItem("wms_admin_user", JSON.stringify(user));
  }, { token: TOKEN, user: USER });

  await page.goto("http://localhost:3004/zh-CN/expenses", { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);
  
  await browser.close();
  console.log("Done");
}
dump();