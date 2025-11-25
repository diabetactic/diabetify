const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();

  const screens = [
    { name: '01-welcome', url: 'http://localhost:4200/welcome', selector: 'ion-content' },
    { name: '02-dashboard', url: 'http://localhost:4200/tabs/dashboard', selector: 'ion-content' },
    { name: '03-readings', url: 'http://localhost:4200/tabs/readings', selector: 'ion-content' },
    { name: '04-appointments', url: 'http://localhost:4200/tabs/appointments', selector: 'ion-content' },
    { name: '05-trends', url: 'http://localhost:4200/tabs/trends', selector: 'ion-content' },
    { name: '06-profile', url: 'http://localhost:4200/tabs/profile', selector: 'ion-content' },
  ];

  for (const screen of screens) {
    console.log(`Capturing ${screen.name}...`);
    await page.goto(screen.url, { waitUntil: 'networkidle' });
    try {
      await page.waitForSelector(screen.selector, { timeout: 5000 });
    } catch (e) {
      console.log(`  Warning: ${screen.selector} not found, continuing...`);
    }
    await page.waitForTimeout(1000); // Additional wait for animations
    await page.screenshot({
      path: `playwright/screenshots/fresh-${screen.name}.png`,
      fullPage: false
    });
  }

  await browser.close();
  console.log('All screenshots captured!');
})();
