/**
 * AppointmentsPage Class
 *
 * This POM class encapsulates the locators and actions for the appointments page.
 * It provides methods for requesting an appointment, checking the appointment status,
 * and creating a new clinical appointment. It extends `BasePage` for common functionalities.
 */
import { Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class AppointmentsPage extends BasePage {
  // Locators
  readonly requestAppointmentButton = this.page.getByRole('button', {
    name: /solicitar cita/i,
  });
  readonly createAppointmentButton = this.page.getByRole('button', {
    name: /agregar nueva cita|crear cita/i,
  });
  readonly pendingBadge = this.page.locator('.badge-warning:has-text("Pendiente")');
  readonly acceptedBadge = this.page.locator('.badge-success:has-text("Aceptada")');
  readonly glucoseObjectiveInput = this.page.locator(
    'ion-input[formcontrolname="glucose_objective"]',
  );
  readonly saveAppointmentButton = this.page.getByRole('button', {
    name: /guardar/i,
  });

  constructor(page: Page) {
    super(page);
  }

  /**
   * Requests a new appointment.
   */
  async requestAppointment(): Promise<void> {
    this.page.on('dialog', async dialog => await dialog.accept());
    await this.click(this.requestAppointmentButton);
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Checks the status of the current appointment.
   * @returns The status of the appointment ('PENDING', 'ACCEPTED', 'NONE').
   */
  async checkAppointmentStatus(): Promise<'PENDING' | 'ACCEPTED' | 'NONE'> {
    if (await this.isVisible(this.pendingBadge)) {
      return 'PENDING';
    }
    if (await this.isVisible(this.acceptedBadge)) {
      return 'ACCEPTED';
    }
    return 'NONE';
  }

  /**
   * Creates a new clinical appointment.
   * @param glucoseObjective - The glucose objective for the appointment.
   */
  async createClinicalAppointment(glucoseObjective: string): Promise<void> {
    await this.click(this.createAppointmentButton);
    await this.fill(this.glucoseObjectiveInput, glucoseObjective);
    await this.click(this.saveAppointmentButton);
    await this.page.waitForURL(/\/appointments/);
  }
}
