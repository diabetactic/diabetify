import fs from 'node:fs';
import path from 'node:path';

import { chromium } from '@playwright/test';

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const baseUrl = process.env.BASE_URL ?? 'http://localhost:4200';
const outputDir =
  process.env.OUTPUT_DIR ??
  path.resolve(process.cwd(), 'playwright-report', `coverage-once-${timestamp}`);

const mkdirp = dir => fs.mkdirSync(dir, { recursive: true });
const writeJson = (filePath, data) =>
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');

async function main() {
  mkdirp(outputDir);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();

  await Promise.all([
    page.coverage.startJSCoverage({ resetOnNavigation: false }),
    page.coverage.startCSSCoverage({ resetOnNavigation: false }),
  ]);

  const goto = async urlOrPath => {
    const url = urlOrPath.startsWith('http') ? urlOrPath : new URL(urlOrPath, baseUrl).toString();
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(300);
  };

  // Basic app flow (best-effort; this script is meant for one-off coverage capture).
  await goto('/welcome');

  // Welcome -> login (button text varies by locale/theme).
  const welcomeButton = page.getByRole('button', { name: /vamos/i });
  if (await welcomeButton.isVisible().catch(() => false)) {
    await welcomeButton.click();
  }

  await goto('/login');
  await page.getByTestId('login-username-input').fill(process.env.E2E_DNI ?? '1000');
  await page.getByTestId('login-password-input').fill(process.env.E2E_PASSWORD ?? 'tuvieja');
  await page.getByTestId('login-submit-btn').click();
  await page.waitForTimeout(800);

  // Main screens (use routes to avoid relying on UI labels).
  await goto('/tabs/dashboard');
  await goto('/tabs/readings');
  await goto('/tabs/appointments');
  await goto('/tabs/trends');
  await goto('/tabs/profile');

  // Extra non-tab screens we commonly care about.
  await goto('/settings');
  await goto('/bolus-calculator');
  await goto('/tips');
  await goto('/achievements');

  const [jsCoverage, cssCoverage] = await Promise.all([
    page.coverage.stopJSCoverage(),
    page.coverage.stopCSSCoverage(),
  ]);

  const coverageData = [...jsCoverage, ...cssCoverage];
  writeJson(path.join(outputDir, 'raw-playwright-coverage.json'), coverageData);

  const { default: MCR } = await import('monocart-coverage-reports');
  const mcr = MCR({
    name: `Diabetify Playwright V8 Coverage (one-off) - ${timestamp}`,
    outputDir,
    reports: ['v8', 'console-summary'],
    cleanCache: true,
  });

  await mcr.add(coverageData);
  await mcr.generate();

  await context.close();
  await browser.close();

  // eslint-disable-next-line no-console
  console.log(`Coverage report generated: ${path.join(outputDir, 'index.html')}`);
}

main().catch(err => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exitCode = 1;
});
