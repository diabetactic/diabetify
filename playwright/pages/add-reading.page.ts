import { Page, expect } from '@playwright/test';
import { BasePage } from './base.page';

export class AddReadingPage extends BasePage {
  readonly glucoseInput = this.page.locator('[data-testid="glucose-value-input"] input');
  readonly saveButton = this.page.locator('[data-testid="add-reading-save-btn"]');
  readonly form = this.page.locator('form');

  constructor(page: Page) {
    super(page);
  }

  async goto(): Promise<void> {
    await this.page.goto('/add-reading');
    await this.waitForHydration();
    await this.form.waitFor({ state: 'visible', timeout: 10000 });
  }

  async fillGlucoseValue(value: number): Promise<void> {
    await this.glucoseInput.waitFor({ state: 'visible', timeout: 10000 });
    await this.glucoseInput.fill(String(value));
  }

  async submit(): Promise<void> {
    await this.saveButton.waitFor({ state: 'visible', timeout: 10000 });
    await this.saveButton.click();
    await this.waitForNetwork();
    await this.waitForUrl(/\/readings/);
  }

  async addReading(glucoseValue: number): Promise<void> {
    await this.goto();
    await this.fillGlucoseValue(glucoseValue);
    await this.submit();
  }
}
