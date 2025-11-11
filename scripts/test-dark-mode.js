// Script to test dark mode rendering in real browser
const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 800, height: 900 });

  // Navigate to dashboard
  await page.goto('http://localhost:4200/tabs/dashboard', {
    waitUntil: 'networkidle2'
  });

  // Enable dark mode
  await page.evaluate(() => {
    document.body.classList.add('dark-theme');
    document.documentElement.classList.add('dark-theme');
  });

  // Wait a moment for styles to apply
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Check computed styles
  const gradients = await page.evaluate(() => {
    const cards = document.querySelectorAll('app-stat-card');
    return Array.from(cards).map(card => {
      const ionCard = card.shadowRoot?.querySelector('.stat-card') || card.querySelector('.stat-card');
      if (ionCard) {
        const styles = window.getComputedStyle(ionCard);
        return {
          background: styles.backgroundImage,
          backgroundColor: styles.backgroundColor
        };
      }
      return null;
    });
  });

  console.log('Computed gradients:', JSON.stringify(gradients, null, 2));

  // Take screenshot
  await page.screenshot({
    path: 'screenshots/dashboard-puppeteer-dark.png',
    fullPage: false
  });

  console.log('Screenshot saved to screenshots/dashboard-puppeteer-dark.png');

  await browser.close();
})();
