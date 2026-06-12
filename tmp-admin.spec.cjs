const { test } = require('playwright/test');

test('inspect admin payroll month picker', async ({ page }) => {
  await page.goto('http://127.0.0.1:3000', { waitUntil: 'networkidle' });
  console.log('RUNTIME', JSON.stringify(await page.evaluate(() => ({
    href: location.href,
    now: new Date().toString(),
    iso: new Date().toISOString(),
    ym: `${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,'0')}`,
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
    lang: navigator.language,
    body: document.body.innerText.slice(0, 3000)
  }))));
});
