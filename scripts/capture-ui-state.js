const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');

async function captureUIState() {
  console.log('🚀 Starting UI State Capture...');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 375, height: 812 }, // iPhone 12 Pro dimensions
  });
  const page = await context.newPage();

  const screenshotDir = path.join(__dirname, '../playwright/screenshots');
  await fs.mkdir(screenshotDir, { recursive: true });

  const findings = {
    screenshots: [],
    consoleErrors: [],
    visualIssues: [],
    accessibility: {},
  };

  // Capture console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      findings.consoleErrors.push({
        text: msg.text(),
        location: msg.location(),
      });
    }
  });

  try {
    // 1. Navigate to homepage
    console.log('📍 Navigating to http://localhost:4200...');
    await page.goto('http://localhost:4200', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Screenshot: Initial load
    const initialPath = path.join(screenshotDir, 'broken-ui-initial-load.png');
    await page.screenshot({ path: initialPath, fullPage: true });
    findings.screenshots.push({ name: 'initial-load', path: initialPath });
    console.log('✅ Captured: Initial load');

    // 2. Complete onboarding
    console.log('📍 Checking for onboarding...');
    const getStartedBtn = await page.locator('text="Get Started"').first();
    if (await getStartedBtn.isVisible().catch(() => false)) {
      console.log('🔘 Clicking "Get Started"...');
      await getStartedBtn.click();
      await page.waitForTimeout(1500);

      const onboardingPath = path.join(screenshotDir, 'broken-ui-post-onboarding.png');
      await page.screenshot({ path: onboardingPath, fullPage: true });
      findings.screenshots.push({ name: 'post-onboarding', path: onboardingPath });
      console.log('✅ Captured: Post-onboarding');
    }

    // 3. Dashboard (should be working)
    console.log('📍 Capturing Dashboard...');
    await page.waitForTimeout(1000);
    const dashboardPath = path.join(screenshotDir, 'broken-ui-dashboard.png');
    await page.screenshot({ path: dashboardPath, fullPage: true });
    findings.screenshots.push({ name: 'dashboard', path: dashboardPath });
    console.log('✅ Captured: Dashboard');

    // Get dashboard accessibility snapshot
    findings.accessibility.dashboard = await page.accessibility.snapshot();

    // 4. Try Readings tab
    console.log('📍 Testing Readings tab...');
    try {
      const readingsTab = page.locator('ion-tab-button[tab="readings"]');
      if (await readingsTab.isVisible().catch(() => false)) {
        await readingsTab.click();
        await page.waitForTimeout(1500);

        const readingsPath = path.join(screenshotDir, 'broken-ui-readings.png');
        await page.screenshot({ path: readingsPath, fullPage: true });
        findings.screenshots.push({ name: 'readings', path: readingsPath, accessible: true });
        console.log('✅ Captured: Readings tab');
        findings.accessibility.readings = await page.accessibility.snapshot();
      }
    } catch (error) {
      console.log('❌ Readings tab error:', error.message);
      findings.visualIssues.push({ tab: 'readings', error: error.message });
    }

    // 5. Try Appointments tab
    console.log('📍 Testing Appointments tab...');
    try {
      const appointmentsTab = page.locator('ion-tab-button[tab="appointments"]');
      if (await appointmentsTab.isVisible().catch(() => false)) {
        await appointmentsTab.click();
        await page.waitForTimeout(1500);

        const appointmentsPath = path.join(screenshotDir, 'broken-ui-appointments.png');
        await page.screenshot({ path: appointmentsPath, fullPage: true });
        findings.screenshots.push({
          name: 'appointments',
          path: appointmentsPath,
          accessible: true,
        });
        console.log('✅ Captured: Appointments tab');
        findings.accessibility.appointments = await page.accessibility.snapshot();
      }
    } catch (error) {
      console.log('❌ Appointments tab error:', error.message);
      findings.visualIssues.push({ tab: 'appointments', error: error.message });
    }

    // 6. Try Trends tab
    console.log('📍 Testing Trends tab...');
    try {
      const trendsTab = page.locator('ion-tab-button[tab="trends"]');
      if (await trendsTab.isVisible().catch(() => false)) {
        await trendsTab.click();
        await page.waitForTimeout(1500);

        const trendsPath = path.join(screenshotDir, 'broken-ui-trends.png');
        await page.screenshot({ path: trendsPath, fullPage: true });
        findings.screenshots.push({ name: 'trends', path: trendsPath, accessible: true });
        console.log('✅ Captured: Trends tab');
        findings.accessibility.trends = await page.accessibility.snapshot();
      }
    } catch (error) {
      console.log('❌ Trends tab error:', error.message);
      findings.visualIssues.push({ tab: 'trends', error: error.message });
    }

    // 7. Try Profile tab
    console.log('📍 Testing Profile tab...');
    try {
      const profileTab = page.locator('ion-tab-button[tab="profile"]');
      if (await profileTab.isVisible().catch(() => false)) {
        await profileTab.click();
        await page.waitForTimeout(1500);

        const profilePath = path.join(screenshotDir, 'broken-ui-profile.png');
        await page.screenshot({ path: profilePath, fullPage: true });
        findings.screenshots.push({ name: 'profile', path: profilePath, accessible: true });
        console.log('✅ Captured: Profile tab');
        findings.accessibility.profile = await page.accessibility.snapshot();
      }
    } catch (error) {
      console.log('❌ Profile tab error:', error.message);
      findings.visualIssues.push({ tab: 'profile', error: error.message });
    }

    // 8. Try add-reading page (should be working)
    console.log('📍 Testing add-reading page...');
    try {
      // Navigate to add-reading directly
      await page.goto('http://localhost:4200/add-reading', { waitUntil: 'networkidle' });
      await page.waitForTimeout(1500);

      const addReadingPath = path.join(screenshotDir, 'broken-ui-add-reading.png');
      await page.screenshot({ path: addReadingPath, fullPage: true });
      findings.screenshots.push({ name: 'add-reading', path: addReadingPath, accessible: true });
      console.log('✅ Captured: Add-reading page');
      findings.accessibility.addReading = await page.accessibility.snapshot();
    } catch (error) {
      console.log('❌ Add-reading page error:', error.message);
      findings.visualIssues.push({ page: 'add-reading', error: error.message });
    }

    // 9. Analyze visual issues from screenshots
    console.log('📊 Analyzing UI state...');
    findings.visualIssues.push({
      analysis: 'Screenshots captured for manual inspection',
      totalScreenshots: findings.screenshots.length,
      consoleErrorCount: findings.consoleErrors.length,
    });
  } catch (error) {
    console.error('❌ Fatal error:', error);
    findings.visualIssues.push({ fatal: error.message });
  } finally {
    // Save findings to JSON
    const findingsPath = path.join(screenshotDir, 'ui-capture-findings.json');
    await fs.writeFile(findingsPath, JSON.stringify(findings, null, 2));
    console.log(`\n📄 Findings saved to: ${findingsPath}`);

    await browser.close();
    console.log('✅ UI State Capture Complete!');
  }

  return findings;
}

captureUIState()
  .then(findings => {
    console.log('\n📊 Summary:');
    console.log(`  Screenshots: ${findings.screenshots.length}`);
    console.log(`  Console Errors: ${findings.consoleErrors.length}`);
    console.log(`  Visual Issues: ${findings.visualIssues.length}`);
  })
  .catch(err => {
    console.error('Script failed:', err);
    process.exit(1);
  });
