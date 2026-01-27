import { Page, expect } from '@playwright/test';
import { BasePage } from './base.page';

export type TabName = 'dashboard' | 'readings' | 'appointments' | 'profile';

export class TabsPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  getTabButton(tabName: TabName) {
    return this.page.locator(`[data-testid="tab-${tabName}"], ion-tab-button[tab="${tabName}"]`);
  }

  async navigateTo(tabName: TabName): Promise<void> {
    const tabButton = this.getTabButton(tabName).first();
    await tabButton.waitFor({ state: 'visible', timeout: 15_000 });

    await Promise.all([
      tabButton.click({ timeout: 15_000 }),
      this.page.waitForURL(new RegExp(`/tabs/${tabName}`), { timeout: 15_000 }),
    ]);

    await expect(this.page).toHaveURL(new RegExp(`/tabs/${tabName}`), { timeout: 15_000 });
    await expect(tabButton).toHaveClass(/tab-selected/, { timeout: 10_000 });
    await expect(this.page.locator(`app-${tabName} ion-content`).first()).toBeVisible({
      timeout: 10000,
    });
    await this.waitForNetwork();
  }

  async isTabActive(tabName: TabName): Promise<boolean> {
    const tabButton = this.getTabButton(tabName);
    const classes = await tabButton.getAttribute('class');
    return classes?.includes('tab-selected') ?? false;
  }

  async gotoDashboard(): Promise<void> {
    await this.navigateTo('dashboard');
  }

  async gotoReadings(): Promise<void> {
    await this.navigateTo('readings');
  }

  async gotoAppointments(): Promise<void> {
    await this.navigateTo('appointments');
  }

  async gotoProfile(): Promise<void> {
    await this.navigateTo('profile');
  }
}
