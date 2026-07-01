const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Users/matti/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe', headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1400, height: 900 });

  await page.goto('http://localhost:5173/login');
  await page.fill('input[type="email"]', 'mcalvi@primark.it');
  await page.fill('input[type="password"]', 'Primark2026!');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2500);

  await page.goto('http://localhost:5173/account');
  await page.waitForTimeout(2500);
  await page.screenshot({ path: 'C:/Users/matti/OneDrive/Desktop/Popsquare2.0/ss_icons.png' });

  await browser.close();
  console.log('done');
})();
