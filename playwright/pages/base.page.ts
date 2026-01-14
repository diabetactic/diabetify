/**
 * Base Page Object - Common operations for all pages
 *
 * Encapsulates:
 * - Ionic-specific hydration and waiting
 * - Screenshot preparation
 * - Common element interactions
 */

import { Page, expect, Locator } from '@playwright/test';

export abstract class BasePage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Wait for Ionic components to fully hydrate.
   * Disables the mobile preview frame on desktop for full viewport access.
   */
  async waitForHydration(timeout = 15000): Promise<void> {
    await this.page.evaluate(() => {
      document.documentElement.classList.add('no-device-frame');
    });

    try {
      await this.page.waitForSelector('ion-app.hydrated', { state: 'attached', timeout });
    } catch {
      try {
        await this.page.waitForSelector('ion-content', { state: 'visible', timeout: 5000 });
      } catch {
        await this.page.waitForLoadState('domcontentloaded', { timeout: 5000 });
      }
    }

    await this.page.waitForTimeout(100);
  }

  /**
   * Wait for network to be idle
   */
  async waitForNetwork(timeout = 10000): Promise<void> {
    try {
      await this.page.waitForLoadState('networkidle', { timeout });
    } catch {
      await this.page.waitForLoadState('domcontentloaded', { timeout });
    }
  }

  /**
   * Prepare page for visual screenshot by hiding dynamic elements
   */
  async prepareForScreenshot(): Promise<void> {
    await this.waitForNetwork();
    await this.waitForHydration();
    await this.page.addStyleTag({
      content: `
        [data-testid="timestamp"], .timestamp, .time-ago { visibility: hidden !important; }
        ion-spinner, .loading-indicator, .loading { visibility: hidden !important; }
        *, *::before, *::after {
          animation-duration: 0s !important;
          transition-duration: 0s !important;
        }
      `,
    });
  }

  /**
   * Screenshot options for visual regression
   */
  get screenshotOptions() {
    return {
      maxDiffPixelRatio: 0.05,
      threshold: 0.2,
      animations: 'disabled' as const,
    };
  }

  /**
   * Take a visual regression screenshot with standard options
   */
  async takeScreenshot(name: string): Promise<void> {
    await this.prepareForScreenshot();
    await expect(this.page).toHaveScreenshot(name, this.screenshotOptions);
  }

  /**
   * Click element using JavaScript (bypasses overlays)
   */
  async jsClick(selector: string): Promise<void> {
    const locator = this.page.locator(selector).first();
    await locator.evaluate((el: HTMLElement) => {
      el.scrollIntoView({ behavior: 'instant', block: 'center' });
      el.click();
    });
  }

  /**
   * Check if locator is visible with timeout
   */
  async isVisibleSoon(locator: Locator, timeout = 3000): Promise<boolean> {
    try {
      await locator.waitFor({ state: 'visible', timeout });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Wait for URL to match pattern
   */
  async waitForUrl(pattern: RegExp, timeout = 10000): Promise<void> {
    await expect(this.page).toHaveURL(pattern, { timeout });
  }

  /**
   * Scroll Ionic content and click element
   */
  async scrollAndClick(selector: string): Promise<void> {
    const target = this.page.locator(selector).first();

    try {
      await target.waitFor({ state: 'attached', timeout: 5000 });
    } catch {
      console.warn('Scroll helper warning: Element not found');
      return;
    }

    await target.evaluate((button: HTMLElement) => {
      try {
        let current = button.parentElement;
        let ionContent: HTMLElement | null = null;
        while (current) {
          if (current.tagName === 'ION-CONTENT') {
            ionContent = current;
            break;
          }
          current = current.parentElement;
        }

        if (ionContent) {
          const shadowRoot = (ionContent as unknown as { shadowRoot?: ShadowRoot }).shadowRoot;
          const scrollElement = shadowRoot?.querySelector('.inner-scroll') as HTMLElement | null;
          if (scrollElement) {
            let offsetTop = 0;
            let el: HTMLElement | null = button;
            while (el && el !== ionContent) {
              offsetTop += el.offsetTop || 0;
              el = el.parentElement as HTMLElement | null;
            }
            const scrollTop = offsetTop - scrollElement.clientHeight / 2 + button.offsetHeight / 2;
            scrollElement.scrollTop = Math.max(0, scrollTop);
          } else {
            button.scrollIntoView({ behavior: 'instant', block: 'center' });
          }
        } else {
          button.scrollIntoView({ behavior: 'instant', block: 'center' });
        }

        button.click();
      } catch {
        button.click();
      }
    });

    await this.page.waitForTimeout(250);
  }

  /**
   * Handle Ionic alert dialog
   */
  async handleIonicAlert(action: 'confirm' | 'cancel' = 'confirm'): Promise<void> {
    const alert = this.page.locator('ion-alert');
    if (await alert.isVisible()) {
      const btnText =
        action === 'confirm'
          ? /OK|Accept|Yes|Si|Aceptar|Confirmar/i
          : /Cancel|No|Close|Cancelar|Cerrar/i;
      await alert.locator('button', { hasText: btnText }).click();
      await alert.waitFor({ state: 'detached', timeout: 3000 });
    }
  }

  async swipeItemToRevealOptions(
    itemLocator: Locator,
    side: 'start' | 'end' = 'end'
  ): Promise<void> {
    await itemLocator.evaluate((el: HTMLElement) => {
      el.scrollIntoView({ behavior: 'instant', block: 'center' });
    });
    await this.page.waitForTimeout(200);

    const opened = await itemLocator.evaluate(async (el, openSide) => {
      const sliding = el as unknown as { open?: (side: string) => Promise<void> };
      if (typeof sliding.open === 'function') {
        await sliding.open(openSide);
        return true;
      }
      return false;
    }, side);

    if (opened) {
      await this.page.waitForTimeout(300);
      return;
    }

    const box = await itemLocator.boundingBox();
    if (box) {
      const startX = side === 'end' ? box.x + box.width - 20 : box.x + 20;
      const endX = side === 'end' ? box.x + 50 : box.x + box.width - 50;
      await this.page.mouse.move(startX, box.y + box.height / 2);
      await this.page.mouse.down();
      await this.page.mouse.move(endX, box.y + box.height / 2);
      await this.page.mouse.up();
      await this.page.waitForTimeout(300);
    }
  }
}
