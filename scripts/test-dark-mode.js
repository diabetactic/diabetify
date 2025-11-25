// Script to test dark mode rendering using Playwright
const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

(async () => {
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

  await page.waitForTimeout(1000);

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
