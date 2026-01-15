const { chromium } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

// Ensure screenshots directory exists
const screenshotsDir = path.join(__dirname, '..', 'screenshots');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

async function captureScreenshots() {
  console.log('🚀 Launching Playwright (Chromium)...');

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
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });

  const page = await browser.newPage();
  await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE size

  const baseUrl = 'http://localhost:4200';

  const screenshots = [
    { path: '/login', name: '01-login' },
    { path: '/register', name: '02-register' },
    { path: '/welcome', name: '03-welcome' },
    { path: '/tabs/dashboard', name: '04-dashboard' },
    { path: '/tabs/profile', name: '05-profile' },
    { path: '/tabs/readings', name: '06-readings' },
    { path: '/appointments', name: '07-appointments' },
    { path: '/appointments/create', name: '08-appointment-create' },
    { path: '/add-reading', name: '09-add-reading' },
    { path: '/bolus-calculator', name: '10-bolus-calculator' },
    { path: '/settings', name: '11-settings' },
    { path: '/dashboard/detail', name: '12-dashboard-detail' },
  ];

  console.log(`📸 Capturing ${screenshots.length} screenshots...\n`);

  for (const screenshot of screenshots) {
    try {
      console.log(`   → ${screenshot.name}: ${baseUrl}${screenshot.path}`);
      await page.goto(`${baseUrl}${screenshot.path}`, { waitUntil: 'networkidle' });
      await waitForStableUi(page);

      const screenshotPath = path.join(screenshotsDir, `${screenshot.name}.png`);
      await page.screenshot({
        path: screenshotPath,
        fullPage: false,
      });

      console.log(`   ✓ Saved: ${screenshot.name}.png`);
    } catch (error) {
      console.error(`   ✗ Failed ${screenshot.name}:`, error.message);
    }
  }

  // Capture dark mode profile
  try {
    console.log(`   → 13-profile-dark: Dark mode`);
    await page.goto(`${baseUrl}/tabs/profile`, { waitUntil: 'networkidle' });
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'dark');
    });
    await waitForStableUi(page);
    await page.screenshot({
      path: path.join(screenshotsDir, '13-profile-dark.png'),
      fullPage: false,
    });
    console.log(`   ✓ Saved: 13-profile-dark.png`);
  } catch (error) {
    console.error(`   ✗ Failed dark mode:`, error.message);
  }

  // Capture profile in edit mode
  try {
    console.log(`   → 14-profile-edit: Edit mode`);
    await page.goto(`${baseUrl}/tabs/profile`, { waitUntil: 'networkidle' });
    await waitForStableUi(page);

    // Try to click edit button
    try {
      await page.click('ion-button:has-text("Editar Perfil")');
      await waitForStableUi(page);
    } catch (e) {
      console.log('   (Could not click edit button, taking screenshot anyway)');
    }

    await page.screenshot({
      path: path.join(screenshotsDir, '14-profile-edit.png'),
      fullPage: false,
    });
    console.log(`   ✓ Saved: 14-profile-edit.png`);
  } catch (error) {
    console.error(`   ✗ Failed edit mode:`, error.message);
  }

  // Capture dashboard with success alert
  try {
    console.log(`   → 15-dashboard-alert: With alert`);
    await page.goto(`${baseUrl}/tabs/dashboard?alert=success`, { waitUntil: 'networkidle' });
    await waitForStableUi(page);
    await page.screenshot({
      path: path.join(screenshotsDir, '15-dashboard-alert.png'),
      fullPage: false,
    });
    console.log(`   ✓ Saved: 15-dashboard-alert.png`);
  } catch (error) {
    console.error(`   ✗ Failed alert:`, error.message);
  }

  // Capture tablet view (dashboard)
  try {
    console.log(`   → 16-dashboard-tablet: Tablet view`);
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto(`${baseUrl}/tabs/dashboard`, { waitUntil: 'networkidle' });
    await waitForStableUi(page);
    await page.screenshot({
      path: path.join(screenshotsDir, '16-dashboard-tablet.png'),
      fullPage: false,
    });
    console.log(`   ✓ Saved: 16-dashboard-tablet.png`);
  } catch (error) {
    console.error(`   ✗ Failed tablet:`, error.message);
  }

  // Capture desktop view (dashboard)
  try {
    console.log(`   → 17-dashboard-desktop: Desktop view`);
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto(`${baseUrl}/tabs/dashboard`, { waitUntil: 'networkidle' });
    await waitForStableUi(page);
    await page.screenshot({
      path: path.join(screenshotsDir, '17-dashboard-desktop.png'),
      fullPage: false,
    });
    console.log(`   ✓ Saved: 17-dashboard-desktop.png`);
  } catch (error) {
    console.error(`   ✗ Failed desktop:`, error.message);
  }

  await browser.close();

  console.log('\n✅ Screenshot capture complete!');
  console.log(`📁 Screenshots saved to: ${screenshotsDir}`);

  // Count total screenshots
  const files = fs.readdirSync(screenshotsDir).filter(f => f.endsWith('.png'));
  console.log(`📸 Total screenshots: ${files.length}`);
}

captureScreenshots().catch(console.error);
