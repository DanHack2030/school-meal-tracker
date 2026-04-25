const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto('http://localhost:3009/login');
  
  await page.type('input[type="text"]', 'teacher1');
  await page.type('input[type="password"]', 'password');
  await page.click('button[type="submit"]');
  
  await page.waitForNavigation({ waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 2000));
  
  await page.screenshot({ path: 'C:/Users/Daniel Jaque/.gemini/antigravity/brain/34d6284e-5c26-4ece-885d-0852259648cd/artifacts/teacher_dashboard.png' });
  
  await browser.close();
})();
