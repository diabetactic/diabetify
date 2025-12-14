/**
 * Capture screenshots for landing page
 * Run: node scripts/capture-landing-screenshots.mjs
 *
 * Requires: App running on localhost:4200 with Docker backend (npm run start:local)
 */
import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync, existsSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const screenshotsDir = join(__dirname, '../docs/assets/screenshots');

// Ensure screenshots directory exists
if (!existsSync(screenshotsDir)) {
  mkdirSync(screenshotsDir, { recursive: true });
}

const BASE_URL = 'http://localhost:4200';
// Julian Crespo (dni=40123456, hospital_account=1000, user_id=5)
const TEST_USER = '40123456';
const TEST_PASSWORD = 'tuvieja';

// Pages to capture with both themes
const PAGES = [
  { name: 'dashboard', path: '/tabs/dashboard', waitFor: 'ion-card' },
  { name: 'readings', path: '/tabs/readings', waitFor: 'ion-list' },
  { name: 'appointments', path: '/tabs/appointments', waitFor: 'ion-content' },
  { name: 'profile', path: '/tabs/profile', waitFor: 'ion-avatar' },
  { name: 'settings', path: '/settings', waitFor: 'ion-list' },
  { name: 'bolus-calculator', path: '/bolus-calculator', waitFor: 'ion-content' },
  { name: 'trends', path: '/trends', waitFor: 'ion-content' },
];

async function setTheme(page, theme) {
  await page.evaluate(t => {
    document.documentElement.setAttribute('data-theme', t);
    // Also update body class for Ionic
    if (t === 'dark') {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  }, theme);
  await page.waitForTimeout(300);
}

async function captureScreenshot(page, name, theme) {
  const filename = `${name}-${theme}.png`;
  await page.screenshot({
    path: join(screenshotsDir, filename),
    fullPage: false,
  });
  console.log(`  ✓ ${filename}`);
}

async function main() {
  console.log('Starting screenshot capture for landing page...');
  console.log(`Output: ${screenshotsDir}\n`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }, // iPhone 14 Pro size
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  try {
    // Login first
    console.log('Logging in as Julian (DNI: 40123456)...');
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
    await page.waitForSelector('ion-tab-bar', { timeout: 15000 });
    console.log('Logged in successfully\n');

    // Capture each page in both themes
    for (const pageInfo of PAGES) {
      console.log(`Capturing ${pageInfo.name}...`);
      await page.goto(`${BASE_URL}${pageInfo.path}`);
      await page.waitForTimeout(1500);

      try {
        await page.waitForSelector(pageInfo.waitFor, { timeout: 5000 });
      } catch {
        // Continue anyway
      }

      // Light theme
      await setTheme(page, 'diabetactic');
      await captureScreenshot(page, pageInfo.name, 'light');

      // Dark theme
      await setTheme(page, 'dark');
      await captureScreenshot(page, pageInfo.name, 'dark');
    }

    console.log('\nAll screenshots captured successfully!');
    console.log(`\nScreenshots saved to: ${screenshotsDir}`);
  } catch (error) {
    console.error('Error:', error.message);
    // Take debug screenshot
    await page.screenshot({ path: '/tmp/debug-screenshot.png' });
    console.log('Debug screenshot saved to /tmp/debug-screenshot.png');
    throw error;
  } finally {
    await browser.close();
  }
}

main();
