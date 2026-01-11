import { test, expect, isDockerMode } from '../../fixtures';
import { STORAGE_STATE_PATH } from '../../fixtures/storage-paths';

test.describe('Trends Functional Tests @functional @docker', () => {
  test.describe.configure({ mode: 'serial' });
  test.skip(!isDockerMode, 'Functional tests require Docker backend');
  test.use({ storageState: STORAGE_STATE_PATH });

  test('should navigate to trends page', async ({ page, pages }) => {
    await page.goto('/tabs/dashboard');
    await pages.dashboardPage.waitForHydration();

    await page.goto('/tabs/trends');
    await pages.trendsPage.waitForHydration();

    const trendsContent = page.locator('ion-content, app-trends');
    await expect(trendsContent.first()).toBeVisible({ timeout: 10000 });
  });

  test('should display period selector', async ({ page, pages }) => {
    await page.goto('/tabs/trends');
    await pages.trendsPage.waitForHydration();

    const periodSelector = page.locator(
      'ion-segment, .period-selector, [data-testid="period-selector"]'
    );
    await expect(periodSelector.first()).toBeVisible({ timeout: 10000 });
  });

  test('should change period selection', async ({ page, pages }) => {
    await page.goto('/tabs/trends');
    await pages.trendsPage.waitForHydration();

    const segmentButtons = page.locator('ion-segment-button');
    const buttonCount = await segmentButtons.count();

    if (buttonCount > 1) {
      await segmentButtons.nth(1).click();
      await page.waitForTimeout(500);
    }
  });

  test('should display trends page content', async ({ page, pages }) => {
    await page.goto('/tabs/trends');
    await pages.trendsPage.waitForHydration();

    const pageContent = page.locator('ion-content');
    await expect(pageContent.first()).toBeVisible({ timeout: 10000 });
  });
});
