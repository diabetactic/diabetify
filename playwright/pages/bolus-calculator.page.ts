import { Page } from '@playwright/test';
import { BasePage } from './base.page';

export class BolusCalculatorPage extends BasePage {
  readonly glucoseInput = this.page.locator(
    '[data-testid="glucose-input"], ion-input[formControlName="currentGlucose"]'
  );
  readonly carbsInput = this.page.locator(
    '[data-testid="carbs-input"], ion-input[formControlName="carbs"]'
  );
  readonly calculateButton = this.page.locator(
    '[data-testid="calculate-btn"], ion-button:has-text("Calcular"), ion-button:has-text("Calculate")'
  );
  readonly warningModal = this.page.locator('ion-modal:visible');
  readonly confirmButton = this.page.locator(
    'ion-button:has-text("CONFIRM"), ion-button:has-text("Confirmar")'
  );

  constructor(page: Page) {
    super(page);
  }

  async goto(): Promise<void> {
    await this.page.goto('/bolus-calculator');
    await this.waitForHydration();
    await this.glucoseInput.waitFor({ state: 'visible', timeout: 10000 });
  }

  async waitForReady(): Promise<void> {
    await this.waitForHydration();
    await this.glucoseInput.waitFor({ state: 'visible', timeout: 10000 });
  }

  async fillGlucose(value: number): Promise<void> {
    await this.glucoseInput.locator('input').fill(String(value));
  }

  async fillCarbs(value: number): Promise<void> {
    if ((await this.carbsInput.count()) > 0) {
      await this.carbsInput.locator('input').fill(String(value));
    }
  }

  async calculate(): Promise<void> {
    if ((await this.calculateButton.count()) > 0) {
      await this.calculateButton.first().click();
      await this.waitForNetwork();
    }
  }

  private async closeFoodPickerIfOpen(): Promise<void> {
    const foodPickerOpen = this.page.locator('.food-picker-modal--open').first();
    if (await foodPickerOpen.isVisible().catch(() => false)) {
      await this.page.keyboard.press('Escape');
      await foodPickerOpen.waitFor({ state: 'hidden', timeout: 1000 }).catch(() => {});

      if (await foodPickerOpen.isVisible().catch(() => false)) {
        const foodPickerCloseBtn = this.page.locator('.food-picker-close').first();
        await foodPickerCloseBtn.evaluate((btn: HTMLElement) => btn.click());
        await foodPickerOpen.waitFor({ state: 'hidden', timeout: 1000 }).catch(() => {});
      }
    }
  }

  async confirmWarningIfPresent(): Promise<boolean> {
    await this.closeFoodPickerIfOpen();

    try {
      await this.warningModal.first().waitFor({ state: 'visible', timeout: 3000 });
    } catch {
      return false;
    }

    await this.page
      .waitForFunction(() => {
        const modals = Array.from(document.querySelectorAll('ion-modal'));
        const visibleModal = modals.find(modal => {
          const style = window.getComputedStyle(modal);
          return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
        });
        if (!visibleModal) return false;
        return visibleModal.querySelectorAll('ion-button, button').length > 0;
      })
      .catch(() => {});

    const clicked = await this.page.evaluate(() => {
      const modals = Array.from(document.querySelectorAll('ion-modal')).filter(modal => {
        const style = window.getComputedStyle(modal);
        return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
      });

      for (const modal of modals) {
        const header = modal.querySelector('ion-title');
        const headerText = header?.textContent?.trim().toLowerCase() || '';

        if (headerText.includes('warning') || modal.querySelector('.modal-actions')) {
          const buttons = Array.from(modal.querySelectorAll('ion-button'));
          for (const btn of buttons) {
            const text = btn.textContent?.trim().toUpperCase();
            if (text === 'CONFIRM' || text === 'CONFIRMAR') {
              (btn as HTMLElement).click();
              return true;
            }
          }

          const actionsButtons = Array.from(modal.querySelectorAll('.modal-actions ion-button'));
          if (actionsButtons.length >= 2) {
            (actionsButtons[1] as HTMLElement).click();
            return true;
          }
        }
      }
      return false;
    });

    if (clicked) {
      await this.warningModal
        .first()
        .waitFor({ state: 'hidden', timeout: 2000 })
        .catch(() => {});
      return true;
    }

    try {
      const confirmBtn = this.warningModal
        .last()
        .getByRole('button', { name: /CONFIRM|Confirm|Confirmar/i });
      await confirmBtn.evaluate((el: HTMLElement) => el.click());
      await this.warningModal
        .first()
        .waitFor({ state: 'hidden', timeout: 2000 })
        .catch(() => {});
      return true;
    } catch {
      await this.page.keyboard.press('Escape');
      return false;
    }
  }
}
