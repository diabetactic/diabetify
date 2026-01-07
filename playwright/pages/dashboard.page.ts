import { Page, expect } from '@playwright/test';
import { BasePage } from './base.page';

export class DashboardPage extends BasePage {
  readonly statsContainer = this.page.locator('[data-testid="stats-container"]');
  readonly quickBolusButton = this.page.getByTestId('quick-bolus-calculator');
  readonly fabBolusButton = this.page.getByTestId('fab-bolus-calculator');

  constructor(page: Page) {
    super(page);
  }

  async goto(): Promise<void> {
    await this.page.click('[data-testid="tab-dashboard"]');
    await this.waitForUrl(/\/dashboard/);
    await this.waitForNetwork();
  }

  async waitForStats(): Promise<void> {
    await this.statsContainer.waitFor({ state: 'visible', timeout: 15000 });
  }

  async openBolusCalculator(): Promise<void> {
    await this.waitForHydration();
    await this.quickBolusButton.waitFor({ state: 'visible', timeout: 15000 });

    await this.page.evaluate(() => {
      const button = document.querySelector(
        '[data-testid="quick-bolus-calculator"]'
      ) as HTMLElement;
      if (button) button.click();
    });

    const navigated = await this.page
      .waitForURL(/\/bolus-calculator/, { timeout: 8000 })
      .then(() => true)
      .catch(() => false);
    if (navigated) return;

    const fabVisible = await this.isVisibleSoon(this.fabBolusButton, 3000);
    if (fabVisible) {
      await this.page.evaluate(() => {
        const button = document.querySelector(
          '[data-testid="fab-bolus-calculator"]'
        ) as HTMLElement;
        if (button) button.click();
      });
      await expect(this.page).toHaveURL(/\/bolus-calculator/, { timeout: 5000 });
    }
  }
}
