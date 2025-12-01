import { test } from '@playwright/test';

test('click tidepool info button', async ({ page }) => {
  await page.goto('/tabs/profile');
  await page.waitForTimeout(2000);

  const infoBtn = page.locator('[data-testid="tidepool-info-btn"]');
  const count = await infoBtn.count();
  console.log('Found tidepool-info-btn count:', count);

  await page.screenshot({ path: '/tmp/before-click.png' });

  if (count > 0) {
    await infoBtn.click();
    await page.waitForTimeout(4000);
    await page.screenshot({ path: '/tmp/after-click.png' });
  }
});
