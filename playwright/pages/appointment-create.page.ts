import { Page } from '@playwright/test';
import { BasePage } from './base.page';

export class AppointmentCreatePage extends BasePage {
  readonly glucoseInput = this.page.locator('ion-input input').first();
  readonly doseInput = this.page.locator('ion-input[formControlName="dose"] input, #dose input');
  readonly ratioInput = this.page.locator('ion-input[formControlName="ratio"] input, #ratio input');
  readonly sensitivityInput = this.page.locator(
    'ion-input[formControlName="sensitivity"] input, #sensitivity input'
  );
  readonly fastInsulinInput = this.page.locator(
    'ion-input[formControlName="fast_insulin"] input, #fast_insulin input'
  );
  readonly submitButton = this.page.locator(
    'ion-button:has-text("Crear"), ion-button:has-text("Create"), ion-button:has-text("Guardar"), ion-button:has-text("Save")'
  );
  readonly cancelButton = this.page.locator(
    'ion-button:has-text("Cancelar"), ion-button:has-text("Cancel"), ion-back-button'
  );

  constructor(page: Page) {
    super(page);
  }

  async goto(): Promise<void> {
    await this.page.goto('/appointments/create');
    await this.waitForHydration();
    await this.waitForNetwork();
  }

  getMotiveCheckboxes() {
    return this.page.locator('ion-checkbox');
  }

  async selectMotive(index = 0): Promise<void> {
    const motive = this.getMotiveCheckboxes().nth(index);
    if ((await motive.count()) > 0) {
      await motive.evaluate((el: HTMLElement) => {
        el.scrollIntoView({ behavior: 'instant', block: 'center' });
        el.click();
      });
    }
  }

  async selectOtroMotive(): Promise<void> {
    const otroCheckbox = this.page.locator(
      'ion-checkbox:has-text("Otro"), ion-checkbox:has-text("Other")'
    );
    if ((await otroCheckbox.count()) > 0) {
      await otroCheckbox.first().click();
    }
  }

  async fillBasicForm(glucose = 100, dose = 10, ratio = 10, sensitivity = 50): Promise<void> {
    if ((await this.glucoseInput.count()) > 0) {
      await this.glucoseInput.evaluate((el: HTMLInputElement) => {
        el.scrollIntoView({ behavior: 'instant', block: 'center' });
      });
      await this.glucoseInput.fill(String(glucose));
    }

    await this.selectMotive(0);

    if ((await this.doseInput.count()) > 0) {
      await this.doseInput.evaluate((el: HTMLInputElement) => {
        el.scrollIntoView({ behavior: 'instant', block: 'center' });
      });
      await this.doseInput.fill(String(dose));
    }

    if ((await this.ratioInput.count()) > 0) {
      await this.ratioInput.evaluate((el: HTMLInputElement) => {
        el.scrollIntoView({ behavior: 'instant', block: 'center' });
      });
      await this.ratioInput.fill(String(ratio));
    }

    if ((await this.sensitivityInput.count()) > 0) {
      await this.sensitivityInput.evaluate((el: HTMLInputElement) => {
        el.scrollIntoView({ behavior: 'instant', block: 'center' });
      });
      await this.sensitivityInput.fill(String(sensitivity));
    }

    if ((await this.fastInsulinInput.count()) > 0) {
      await this.fastInsulinInput.evaluate((el: HTMLInputElement) => {
        el.scrollIntoView({ behavior: 'instant', block: 'center' });
      });
      await this.fastInsulinInput.fill('Humalog');
    }
  }

  async submit(): Promise<void> {
    if ((await this.submitButton.count()) > 0) {
      await this.submitButton.first().click();
      await this.waitForNetwork();
    }
  }

  async cancel(): Promise<void> {
    if ((await this.cancelButton.count()) > 0) {
      await this.cancelButton.first().click();
      await this.waitForUrl(/\/appointments/);
    }
  }

  async hasValidationError(): Promise<boolean> {
    const errorToast = this.page.locator('ion-toast');
    const errorMessage = this.page.locator('text=/error|requerido|required|invalido|invalid/i');
    return (await errorToast.count()) > 0 || (await errorMessage.count()) > 0;
  }
}
