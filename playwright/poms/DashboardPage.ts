/**
 * DashboardPage Class
 *
 * This POM class contains the locators and actions related to the dashboard page.
 * It extends `BasePage` to inherit common functionalities.
 */
import { Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class DashboardPage extends BasePage {
  // Locators
  readonly welcomeMessage = this.page.locator('h1:has-text("Welcome")');
  readonly readingsChart = this.page.locator('[data-testid="readings-chart"]');
  readonly appointmentsSection = this.page.locator(
    '[data-testid="appointments-section"]',
  );

  constructor(page: Page) {
    super(page);
  }

  /**
   * Verifies that the main dashboard elements are visible.
   */
  async verifyDashboardElements(): Promise<void> {
    await this.isVisible(this.welcomeMessage);
    await this.isVisible(this.readingsChart);
    await this.isVisible(this.appointmentsSection);
  }
}
