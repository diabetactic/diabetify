/**
 * ReadingsPage Class
 *
 * This POM class encapsulates the locators and actions for the readings page.
 * It provides methods for filtering readings by date and status, searching,
 * and clearing filters. It extends `BasePage` for common functionalities.
 */
import { Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class ReadingsPage extends BasePage {
  // Locators for filtering
  readonly filterButton = this.page.getByRole('button', {
    name: /filtrar|filter/i,
  });
  readonly filterModal = this.page.locator('ion-modal');
  readonly statusSelect = this.page.locator(
    'ion-select:has-text("Estado"), ion-select:has-text("Status")',
  );
  readonly applyFiltersButton = this.page.getByRole('button', {
    name: /aplicar|apply/i,
  });
  readonly clearFiltersButton = this.page.getByRole('button', {
    name: /limpiar|clear/i,
  });

  // Locators for date range quick filters
  readonly last24HoursButton = this.page.getByRole('button', { name: /24 horas/i });
  readonly last7DaysButton = this.page.getByRole('button', { name: /7 días/i });
  readonly last30DaysButton = this.page.getByRole('button', { name: /30 días/i });

  // Locator for search
  readonly searchBar = this.page.locator('ion-searchbar');

  constructor(page: Page) {
    super(page);
  }

  /**
   * Opens the filter modal.
   */
  async openFilterModal(): Promise<void> {
    await this.click(this.filterButton);
    await this.isVisible(this.filterModal);
  }

  /**
   * Filters readings by status.
   * @param status - The status to filter by (e.g., 'Normal', 'High').
   */
  async filterByStatus(status: string): Promise<void> {
    await this.openFilterModal();
    await this.click(this.statusSelect);
    await this.click(`ion-select-option:has-text("${status}")`);
    await this.click(this.applyFiltersButton);
  }

  /**
   * Filters readings by a predefined date range.
   * @param range - The date range to filter by.
   */
  async filterByDateRange(range: '24 hours' | '7 days' | '30 days'): Promise<void> {
    await this.openFilterModal();
    switch (range) {
      case '24 hours':
        await this.click(this.last24HoursButton);
        break;
      case '7 days':
        await this.click(this.last7DaysButton);
        break;
      case '30 days':
        await this.click(this.last30DaysButton);
        break;
    }
    await this.click(this.applyFiltersButton);
  }

  /**
   * Searches for readings and waits for the network response.
   * @param query - The search query.
   */
  async search(query: string): Promise<void> {
    const searchResponsePromise = this.page.waitForResponse(
      response =>
        response.url().includes('/readings') && response.request().method() === 'GET',
    );
    await this.fill(this.searchBar, query);
    await searchResponsePromise;
  }

  /**
   * Clears all active filters.
   */
  async clearFilters(): Promise<void> {
    await this.openFilterModal();
    await this.click(this.clearFiltersButton);
  }
}
