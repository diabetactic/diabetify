import { Page, expect, Locator } from '@playwright/test';
import { BasePage } from './base.page';

export class ReadingsPage extends BasePage {
  readonly list = this.page.locator('[data-testid="readings-list"]');
  readonly emptyState = this.page.locator('[data-testid="readings-empty"]');
  readonly searchInput = this.page.locator('ion-searchbar input');
  readonly addButton = this.page.locator('[data-testid="add-reading-btn"]');
  readonly fabButton = this.page.locator('[data-testid="fab-add-reading"]');

  constructor(page: Page) {
    super(page);
  }

  async goto(): Promise<void> {
    await this.page.click('[data-testid="tab-readings"]');
    await this.waitForUrl(/\/readings/);
    await this.waitForNetwork();
  }

  async waitForList(): Promise<void> {
    await this.page.waitForSelector(
      '[data-testid="readings-list"], [data-testid="readings-empty"]',
      {
        timeout: 10000,
      }
    );
  }

  getReadingItems(): Locator {
    return this.page.locator('[data-testid="readings-list"] ion-item, app-reading-item');
  }

  async getReadingCount(): Promise<number> {
    return this.getReadingItems().count();
  }

  async hasReadings(): Promise<boolean> {
    return (await this.list.count()) > 0;
  }

  async clickFirstReading(): Promise<void> {
    const firstReading = this.page
      .locator('[data-testid="readings-list"] ion-item[button]')
      .first();
    if ((await firstReading.count()) > 0) {
      await firstReading.evaluate((el: HTMLElement) => el.click());
      await this.page
        .locator('ion-modal')
        .first()
        .waitFor({ state: 'visible', timeout: 3000 })
        .catch(() => {});
    }
  }

  async searchReadings(query: string): Promise<void> {
    if ((await this.searchInput.count()) > 0) {
      await this.searchInput.fill(query);
      await this.waitForNetwork();
    }
  }

  async deleteFirstReading(): Promise<boolean> {
    const slidingItem = this.page.locator('ion-item-sliding').first();
    if ((await slidingItem.count()) === 0) return false;

    await this.swipeItemToRevealOptions(slidingItem);

    const deleteBtn = this.page.locator('ion-item-option[color="danger"]').first();
    if ((await deleteBtn.count()) > 0) {
      await deleteBtn.evaluate((el: HTMLElement) => el.click());
      await this.waitForNetwork();
      return true;
    }
    return false;
  }

  async openDetailModal(): Promise<boolean> {
    const readingButton = this.page
      .getByRole('button')
      .filter({ hasText: /mg\/dL|mmol/i })
      .first();

    if ((await readingButton.count()) > 0) {
      await readingButton.evaluate((el: HTMLElement) => {
        el.scrollIntoView({ behavior: 'instant', block: 'center' });
        el.click();
      });
      await this.page
        .locator('ion-modal')
        .first()
        .waitFor({ state: 'visible', timeout: 5000 })
        .catch(() => {});
      return true;
    }
    return false;
  }

  async isDetailModalVisible(): Promise<boolean> {
    const modal = this.page.locator('ion-modal.show-modal, ion-modal[aria-hidden="false"]').first();
    return modal.isVisible();
  }
}
