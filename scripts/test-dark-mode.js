// Script to test dark mode rendering using Playwright
const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

(async () => {
  const waitForStableUi = async page => {
    await page.waitForLoadState('domcontentloaded');
    await page
      .waitForSelector('ion-app.hydrated, ion-content', { state: 'visible', timeout: 10000 })
      .catch(() => {});
    await page.evaluate(async () => {
      if (document.fonts && document.fonts.status !== 'loaded') {
        await document.fonts.ready;
      }
    });
    await page.evaluate(
      () =>
        new Promise(resolve => {
          requestAnimationFrame(() => requestAnimationFrame(resolve));
        })
    );
  };

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewportSize({ width: 800, height: 900 });

  // Navigate to dashboard
  await page.goto('http://localhost:4200/tabs/dashboard', {
    waitUntil: 'networkidle',
  });

  // Enable dark mode (match ThemeService logic)
  await page.evaluate(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
  });

  await waitForStableUi(page);

  // Check computed styles for stat cards
  const gradients = await page.evaluate(() => {
    const cards = document.querySelectorAll('app-stat-card');
    return Array.from(cards).map(card => {
      const ionCard =
        (card.shadowRoot && card.shadowRoot.querySelector('.stat-card')) ||
        card.querySelector('.stat-card');
      if (ionCard) {
        const styles = window.getComputedStyle(ionCard);
        return {
          background: styles.backgroundImage,
          backgroundColor: styles.backgroundColor,
        };
      }
      return null;
    });
  });

  console.log('Computed gradients:', JSON.stringify(gradients, null, 2));

  // Ensure screenshots directory exists
  const screenshotsDir = path.join(__dirname, '..', 'screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  // Take screenshot
  const screenshotPath = path.join(screenshotsDir, 'dashboard-dark-mode.png');
  await page.screenshot({
    path: screenshotPath,
    fullPage: false,
  });

  console.log(`Screenshot saved to ${screenshotPath}`);

  await browser.close();
})().catch(err => {
  console.error('Dark mode test failed:', err);
  process.exit(1);
});
