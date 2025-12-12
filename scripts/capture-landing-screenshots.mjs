/**
 * Capture screenshots for landing page
 * Run: node scripts/capture-landing-screenshots.mjs
 */
import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const screenshotsDir = join(__dirname, '../docs/assets/screenshots');

const BASE_URL = 'http://localhost:4200';
const TEST_USER = '1000';
const TEST_PASSWORD = 'tuvieja';

async function main() {
  console.log('🚀 Starting screenshot capture...');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }, // iPhone 14 Pro size
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  try {
    // Login first
    console.log('📱 Logging in...');
    await page.goto(`${BASE_URL}/welcome`);
    await page.waitForTimeout(2000);

    // Click "Vamos" or similar to get to login
    const vamosBtn = page.locator('text=¡Vamos!');
    if (await vamosBtn.isVisible()) {
      await vamosBtn.click();
      await page.waitForTimeout(1000);
    }

    // Fill login form
    await page.fill('input[formcontrolname="userId"], input[type="text"]', TEST_USER);
    await page.fill('input[formcontrolname="password"], input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"], ion-button[type="submit"]');
    await page.waitForTimeout(3000);

    // Wait for dashboard to load
    await page.waitForSelector('ion-tab-bar', { timeout: 10000 });
    console.log('✅ Logged in successfully');

    // 1. Bolus Calculator
    console.log('📸 Capturing Bolus Calculator...');
    await page.goto(`${BASE_URL}/bolus-calculator`);
    await page.waitForTimeout(2000);
    await page.screenshot({
      path: join(screenshotsDir, 'bolus-calculator.png'),
      fullPage: false,
    });
    console.log('✅ bolus-calculator.png saved');

    // 2. Profile (dark mode)
    console.log('📸 Capturing Profile (dark mode)...');
    await page.goto(`${BASE_URL}/tabs/profile`);
    await page.waitForTimeout(2000);
    // Enable dark mode
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'dark');
    });
    await page.waitForTimeout(500);
    await page.screenshot({
      path: join(screenshotsDir, 'profile-dark.png'),
      fullPage: false,
    });
    console.log('✅ profile-dark.png saved');

    // 3. Settings (dark mode)
    console.log('📸 Capturing Settings (dark mode)...');
    await page.goto(`${BASE_URL}/settings`);
    await page.waitForTimeout(2000);
    // Ensure dark mode
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'dark');
    });
    await page.waitForTimeout(500);
    await page.screenshot({
      path: join(screenshotsDir, 'settings-dark.png'),
      fullPage: false,
    });
    console.log('✅ settings-dark.png saved');

    console.log('\n🎉 All screenshots captured successfully!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    // Take debug screenshot
    await page.screenshot({ path: '/tmp/debug-screenshot.png' });
    console.log('Debug screenshot saved to /tmp/debug-screenshot.png');
  } finally {
    await browser.close();
  }
}

main();
