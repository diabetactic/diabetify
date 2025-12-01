// Simple Playwright-driven screenshot runner
// Starts the dev server on port 4301, then captures key routes.
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const PORT = 4301;
const BASE = `http://localhost:${PORT}`;
const OUTPUT_DIR = path.join(__dirname, '..', 'screenshots', 'ui-captures');

const routes = [
  { name: 'welcome', url: '/welcome' },
  { name: 'login', url: '/login' },
  { name: 'register', url: '/register' },
  { name: 'appointments', url: '/appointments' },
  { name: 'account-pending', url: '/account-pending' },
];

async function waitForServer(timeoutMs = 120000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(BASE, { method: 'GET' });
      if (res.ok) return;
    } catch {
      // Server not ready yet, retry
    }
    await new Promise(r => setTimeout(r, 500));
  }
  throw new Error('Dev server did not become ready in time');
}

(async () => {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Start dev server
  const server = spawn(
    'npm',
    ['run', 'start', '--', `--port=${PORT}`, '--configuration', 'development'],
    {
      stdio: 'pipe',
      env: { ...process.env, BROWSER: 'none' },
    }
  );

  let serverOutput = '';
  server.stdout.on('data', chunk => (serverOutput += chunk.toString()));
  server.stderr.on('data', chunk => (serverOutput += chunk.toString()));

  try {
    await waitForServer();
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const page = await context.newPage();

    for (const route of routes) {
      const url = `${BASE}${route.url}`;
      console.log('Capturing', url);
      await page.goto(url, { waitUntil: 'networkidle' });
      // wait for content to paint
      await page.waitForTimeout(1000);
      const outPath = path.join(OUTPUT_DIR, `${route.name}.png`);
      await page.screenshot({ path: outPath, fullPage: true });
    }

    await browser.close();
    console.log('Screenshots saved to', OUTPUT_DIR);
  } catch (err) {
    console.error('Capture failed:', err);
    console.error(serverOutput);
    process.exitCode = 1;
  } finally {
    server.kill('SIGTERM');
  }
})();
