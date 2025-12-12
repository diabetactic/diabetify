/**
 * BasePage Class
 *
 * This class serves as the foundation for all other Page Object Model (POM) classes.
 * It encapsulates a Playwright `Page` object and provides common, reusable methods
 * that are applicable across different pages of the application. This includes
 * navigation, waiting for elements, and handling common components like tabs.
 */
import { Page, Locator, expect } from '@playwright/test';

export class BasePage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Navigates to a specific URL.
   * @param path - The path to navigate to (e.g., '/login').
   */
  async goto(path: string): Promise<void> {
    await this.page.goto(path, { waitUntil: 'networkidle' });
  }

  /**
   * Waits for the Ionic framework to finish its hydration process.
   * This is crucial for ensuring that web components are interactive.
   */
  async waitForIonicHydration(): Promise<void> {
    await this.page.waitForSelector('ion-app.hydrated', {
      state: 'attached',
      timeout: 10000,
    });
  }

  /**
   * Navigates to a primary section of the app via the tab bar.
   * @param tabName - The name of the tab to navigate to.
   */
  async navigateToTab(
    tabName: 'dashboard' | 'readings' | 'appointments' | 'profile',
  ): Promise<void> {
    const tabButton = this.page.locator(
      `[data-testid="tab-${tabName}"], ion-tab-button[tab="${tabName}"]`,
    );
    await tabButton.click();
    await expect(this.page).toHaveURL(new RegExp(`/${tabName}`), { timeout: 10000 });
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * A generic click method that waits for an element to be visible before clicking.
   * @param selector - The selector of the element to click.
   */
  async click(selector: string | Locator): Promise<void> {
    const locator = typeof selector === 'string' ? this.page.locator(selector) : selector;
    await locator.waitFor({ state: 'visible', timeout: 10000 });
    await locator.click();
  }

  /**
   * A generic method to fill an input field.
   * @param selector - The selector of the input element.
   * @param value - The value to fill the input with.
   */
  async fill(selector: string | Locator, value: string): Promise<void> {
    const locator = typeof selector === 'string' ? this.page.locator(selector) : selector;
    await locator.waitFor({ state: 'visible', timeout: 10000 });
    await locator.fill(value);
  }

  /**
   * Checks if an element is visible on the page.
   * @param selector - The selector of the element to check.
   * @returns A boolean indicating whether the element is visible.
   */
  async isVisible(selector: string | Locator): Promise<boolean> {
    const locator = typeof selector === 'string' ? this.page.locator(selector) : selector;
    return locator.isVisible();
  }

  /**
   * Gets the text content of an element.
   * @param selector - The selector of the element.
   * @returns The text content of the element.
   */
  async getText(selector: string | Locator): Promise<string | null> {
    const locator = typeof selector === 'string' ? this.page.locator(selector) : selector;
    return locator.textContent();
  }
}
