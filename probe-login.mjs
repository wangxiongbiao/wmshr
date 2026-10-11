import { createRequire } from "node:module";
const require = createRequire("C:/Users/admin/Desktop/项目/app/pi-web/package.json");
const { chromium } = require("playwright");

async function probe() {
  const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  const page = await browser.newPage();
  await page.goto('http://localhost:3004/zh-CN/login');
  await page.fill('input[type="email"], input[type="text"]', 'e2e_tester@wmshr.com');
  await page.fill('input[type="password"]', 'SecurePassword123');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);
  
  const buttons = await page.$$('button');
  const texts = [];
  for (const b of buttons) {
    texts.push(await b.textContent());
  }
  console.log("找到的所有按钮文案:", texts);
  await browser.close();
}

probe();
