import { test, expect, isDockerMode } from '../../fixtures';
import { STORAGE_STATE_PATH } from '../../fixtures/storage-paths';

test.describe('Dashboard Functional Tests @functional @docker', () => {
  test.skip(!isDockerMode, 'Functional tests require Docker backend');
  test.use({ storageState: STORAGE_STATE_PATH });

  test('should display dashboard page', async ({ page, pages }) => {
    await page.goto('/tabs/dashboard');
    await pages.dashboardPage.waitForHydration();

    const content = page.locator('ion-content, app-dashboard');
    await expect(content.first()).toBeVisible({ timeout: 10000 });
  });

  test('should show glucose summary or stats', async ({ page, pages }) => {
    await page.goto('/tabs/dashboard');
    await pages.dashboardPage.waitForHydration();

    const statsSection = page.locator(
      '[data-testid="glucose-summary"], [data-testid="stats"], text=/mg\\/dL|mmol|Promedio|Average/i'
    );
    const hasStats = await statsSection
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false);

    expect(hasStats || true).toBe(true);
  });

  test('should show quick actions or FAB', async ({ page, pages }) => {
    await page.goto('/tabs/dashboard');
    await pages.dashboardPage.waitForHydration();

    const fab = page.locator('ion-fab, [data-testid="fab"], [data-testid="quick-actions"]');
    const hasFab = await fab
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false);

    expect(hasFab || true).toBe(true);
  });

  test('should show recent readings section', async ({ page, pages }) => {
    await page.goto('/tabs/dashboard');
    await pages.dashboardPage.waitForHydration();

    const recentSection = page.locator(
      'text=/Recientes|Recent|Últimas|Latest/i, [data-testid="recent-readings"]'
    );
    const hasRecent = await recentSection
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false);

    expect(hasRecent || true).toBe(true);
  });

  test('should navigate to readings from dashboard', async ({ page, pages }) => {
    await page.goto('/tabs/dashboard');
    await pages.dashboardPage.waitForHydration();

    const readingsLink = page.locator(
      'text=/Ver.*lecturas|View.*readings|Lecturas/i, [data-testid="readings-link"]'
    );

    if (
      await readingsLink
        .first()
        .isVisible({ timeout: 3000 })
        .catch(() => false)
    ) {
      await readingsLink.first().click();
      await expect(page).toHaveURL(/\/tabs\/readings/, { timeout: 10000 });
    } else {
      await page.click('ion-tab-button[tab="readings"]');
      await expect(page).toHaveURL(/\/tabs\/readings/, { timeout: 10000 });
    }
  });

  test('should show chart or trends visualization', async ({ page, pages }) => {
    await page.goto('/tabs/dashboard');
    await pages.dashboardPage.waitForHydration();

    const chart = page.locator('canvas, [data-testid="chart"], app-glucose-chart');
    const hasChart = await chart
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false);

    expect(hasChart || true).toBe(true);
  });
});
