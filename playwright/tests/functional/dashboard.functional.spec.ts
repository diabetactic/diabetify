import { test, expect, isDockerMode } from '../../fixtures';
import { STORAGE_STATE_PATH } from '../../fixtures/storage-paths';
import { Page } from '@playwright/test';

test.describe('Dashboard Functional Tests @functional @docker', () => {
  test.skip(!isDockerMode, 'Functional tests require Docker backend');
  test.use({ storageState: STORAGE_STATE_PATH });

  /**
   * Helper: Wait for dashboard content to fully load
   * Dashboard has loading state that shows skeleton, then renders content
   */
  async function waitForDashboardContent(page: Page) {
    // Wait for main loading skeleton to disappear (dashboard sets isLoading=false)
    // We target the specific container for the main skeleton to avoid waiting for
    // independent component skeletons (like the streak card) if they are not critical
    await page.waitForFunction(
      () => {
        const mainSkeleton = document.querySelector('.page-shell > .animate-pulse');
        const content = document.querySelector('[data-testid="stats-container"]');
        return !mainSkeleton && content !== null;
      },
      null,
      { timeout: 30000 }
    );
  }

  test('should display dashboard page', async ({ page, pages }) => {
    await page.goto('/tabs/dashboard');
    await pages.dashboardPage.waitForHydration();

    const content = page.locator('ion-content, app-dashboard');
    await expect(content.first()).toBeVisible({ timeout: 10000 });
  });

  test('should show glucose summary or stats', async ({ page, pages }) => {
    await page.goto('/tabs/dashboard');
    await pages.dashboardPage.waitForHydration();
    await waitForDashboardContent(page);

    // Dashboard stats container with Time in Range and Average Glucose cards
    const statsSection = page.locator('[data-testid="stats-container"]');
    await expect
      .soft(statsSection.first(), 'Dashboard should show glucose stats section')
      .toBeVisible({ timeout: 10000 });
  });

  test('should show quick actions or FAB', async ({ page, pages }) => {
    await page.goto('/tabs/dashboard');
    await pages.dashboardPage.waitForHydration();

    const fab = page.locator('ion-fab, [data-testid="fab"], [data-testid="quick-actions"]');
    await expect(fab.first(), 'Dashboard should show FAB or quick actions').toBeVisible({
      timeout: 5000,
    });
  });

  test('should show recent readings section', async ({ page, pages }) => {
    await page.goto('/tabs/dashboard');
    await pages.dashboardPage.waitForHydration();
    await waitForDashboardContent(page);

    // Recent readings section with data-testid
    const recentSection = page.locator('[data-testid="recent-readings"]');
    await expect
      .soft(recentSection.first(), 'Dashboard should show recent readings section')
      .toBeVisible({ timeout: 10000 });
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

  test('should show streak or gamification visualization', async ({ page, pages }) => {
    await page.goto('/tabs/dashboard');
    await pages.dashboardPage.waitForHydration();
    await waitForDashboardContent(page);

    // Dashboard shows streak card with progress visualization instead of charts
    const streakCard = page.locator('app-streak-card');
    await expect
      .soft(streakCard.first(), 'Dashboard should show streak/gamification visualization')
      .toBeVisible({ timeout: 10000 });
  });
});
