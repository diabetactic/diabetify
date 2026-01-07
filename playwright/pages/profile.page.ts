import { Page, expect } from '@playwright/test';
import { BasePage } from './base.page';

export class ProfilePage extends BasePage {
  readonly editButton = this.page.locator('[data-testid="edit-profile-btn"]');
  readonly settingsButton = this.page.locator(
    '[data-testid="settings-btn"], [data-testid="advanced-settings-btn"]'
  );
  readonly logoutButton = this.page.locator(
    'ion-button:has-text("Cerrar"), ion-button:has-text("Logout"), ion-button:has-text("Salir")'
  );

  readonly editModal = this.page.locator('ion-modal');
  readonly nameInput = this.page.locator('ion-modal ion-input[formControlName="name"] input');
  readonly saveButton = this.page.locator(
    'ion-modal ion-button:has-text("Guardar"), ion-modal ion-button:has-text("Save")'
  );

  constructor(page: Page) {
    super(page);
  }

  async goto(): Promise<void> {
    await this.page.click('[data-testid="tab-profile"]');
    await this.waitForUrl(/\/profile/);
    await this.waitForNetwork();
  }

  async openEditModal(): Promise<void> {
    await this.editButton.waitFor({ state: 'visible', timeout: 10000 });
    await this.editButton.click();
    await this.editModal.waitFor({ state: 'visible', timeout: 10000 });
    await this.nameInput.waitFor({ state: 'visible', timeout: 10000 });
    await this.waitForNetwork();
  }

  async editName(newName: string): Promise<void> {
    await this.nameInput.waitFor({ state: 'visible', timeout: 10000 });
    await this.nameInput.fill(newName);
  }

  async saveProfile(): Promise<void> {
    await this.saveButton.waitFor({ state: 'visible', timeout: 10000 });
    await this.saveButton.first().evaluate((el: HTMLElement) => {
      el.scrollIntoView({ behavior: 'instant', block: 'center' });
      el.click();
    });
    await this.editModal.waitFor({ state: 'hidden', timeout: 10000 });
    await this.waitForNetwork();
  }

  async openSettings(): Promise<void> {
    if ((await this.settingsButton.count()) > 0) {
      await this.page.evaluate(() => {
        const el = document.querySelector(
          '[data-testid="settings-btn"], [data-testid="advanced-settings-btn"]'
        ) as HTMLElement;
        if (el) {
          el.scrollIntoView({ behavior: 'instant', block: 'center' });
          el.click();
        }
      });
      await this.waitForNetwork();
    }
  }

  async logout(): Promise<void> {
    if (
      await this.logoutButton
        .first()
        .isVisible({ timeout: 3000 })
        .catch(() => false)
    ) {
      await this.logoutButton.first().click();
      await expect(this.page).toHaveURL(/\/(login|welcome)/, { timeout: 10000 });
    }
  }
}
