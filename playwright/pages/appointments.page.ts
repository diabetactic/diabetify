import { Page } from '@playwright/test';
import { BasePage } from './base.page';

export type QueueState = 'PENDING' | 'ACCEPTED' | 'DENIED' | 'CREATED' | 'BLOCKED' | 'NONE';

export class AppointmentsPage extends BasePage {
  readonly requestButton = this.page.locator('#request-appointment-btn');
  readonly createButton = this.page
    .locator('ion-button')
    .filter({ hasText: /Agregar Nueva Cita|Add New Appointment|Crear|Create/i });
  readonly appointmentCard = this.page.locator('ion-card.appointment-card');

  constructor(page: Page) {
    super(page);
  }

  async goto(): Promise<void> {
    await this.page.click('[data-testid="tab-appointments"]');
    await this.waitForUrl(/\/appointments/);
    await this.waitForNetwork();
  }

  async requestAppointment(): Promise<void> {
    if ((await this.requestButton.count()) > 0 && !(await this.requestButton.isDisabled())) {
      await this.scrollAndClick('#request-appointment-btn');
      await this.waitForNetwork();
    }
  }

  async clickCreateAppointment(): Promise<void> {
    if ((await this.createButton.count()) > 0) {
      await this.createButton.first().evaluate((el: HTMLElement) => {
        el.scrollIntoView({ behavior: 'instant', block: 'center' });
        el.click();
      });
      await this.waitForNetwork();
    }
  }

  async getQueueState(): Promise<QueueState | null> {
    const stateAttr = await this.page
      .locator('[data-queue-state]')
      .first()
      .getAttribute('data-queue-state');
    if (stateAttr) return stateAttr as QueueState;

    if ((await this.page.getByText(/Pendiente|Pending|En cola/i).count()) > 0) return 'PENDING';
    if ((await this.page.getByText(/Aceptada|Accepted/i).count()) > 0) return 'ACCEPTED';
    if ((await this.page.getByText(/Denegada|Denied/i).count()) > 0) return 'DENIED';
    if ((await this.page.getByText(/cola.*cerrada|queue.*closed|bloqueado|blocked/i).count()) > 0)
      return 'BLOCKED';

    return null;
  }

  async isPending(): Promise<boolean> {
    return (await this.getQueueState()) === 'PENDING';
  }

  async isAccepted(): Promise<boolean> {
    return (await this.getQueueState()) === 'ACCEPTED';
  }

  async isDenied(): Promise<boolean> {
    return (await this.getQueueState()) === 'DENIED';
  }

  async isBlocked(): Promise<boolean> {
    return (await this.getQueueState()) === 'BLOCKED';
  }

  async expandPastAppointments(): Promise<void> {
    const pastHeader = this.page.getByText(/Anteriores|Past|Historial|History/i);
    if ((await pastHeader.count()) > 0) {
      await pastHeader.first().evaluate((el: HTMLElement) => {
        el.scrollIntoView({ behavior: 'instant', block: 'center' });
        el.click();
      });
      await this.waitForFrames();
    }
  }

  async clickAppointmentCard(): Promise<void> {
    if ((await this.appointmentCard.count()) > 0) {
      await this.appointmentCard.first().evaluate((el: HTMLElement) => {
        el.scrollIntoView({ behavior: 'instant', block: 'center' });
        el.click();
      });
      await this.waitForNetwork();
    }
  }

  async hasResolution(): Promise<boolean> {
    const resolutionText = this.page.getByText(/Resolucion|Resolution/i);
    const basalInfo = this.page.getByText(/Basal|basal/i);
    return (await resolutionText.count()) > 0 || (await basalInfo.count()) > 0;
  }
}
