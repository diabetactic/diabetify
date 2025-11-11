/**
 * Dashboard Page Object Model for E2E Tests
 * Encapsulates page interactions and selectors
 */

import { Page, Locator } from '@playwright/test';

export class DashboardPageObject {
  readonly page: Page;

  // Page sections
  readonly header: Locator;
  readonly statsSection: Locator;
  readonly chartSection: Locator;
  readonly appointmentsSection: Locator;
  readonly quickActionsSection: Locator;

  // Stat cards
  readonly averageGlucoseCard: Locator;
  readonly timeInRangeCard: Locator;
  readonly lastReadingCard: Locator;
  readonly totalReadingsCard: Locator;

  // Quick actions
  readonly addReadingButton: Locator;
  readonly syncButton: Locator;
  readonly exportButton: Locator;
  readonly shareButton: Locator;

  // Chart controls
  readonly timeRangeSelector: Locator;
  readonly chartCanvas: Locator;
  readonly chartLegend: Locator;

  // Appointment elements
  readonly appointmentCards: Locator;
  readonly joinVideoCallButton: Locator;
  readonly viewAllAppointmentsLink: Locator;

  // Forms
  readonly quickEntryForm: Locator;
  readonly glucoseInput: Locator;
  readonly notesInput: Locator;
  readonly saveReadingButton: Locator;
  readonly cancelButton: Locator;

  // Status indicators
  readonly syncStatus: Locator;
  readonly loadingSpinner: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;

    // Initialize page sections
    this.header = page.locator('ion-header');
    this.statsSection = page.locator('.statistics-section');
    this.chartSection = page.locator('.chart-section');
    this.appointmentsSection = page.locator('.appointments-section');
    this.quickActionsSection = page.locator('.quick-actions');

    // Initialize stat cards
    this.averageGlucoseCard = page.locator('[data-stat="average"]');
    this.timeInRangeCard = page.locator('[data-stat="time-in-range"]');
    this.lastReadingCard = page.locator('[data-stat="last-reading"]');
    this.totalReadingsCard = page.locator('[data-stat="total-readings"]');

    // Initialize quick actions
    this.addReadingButton = page.locator('[data-action="add-reading"]');
    this.syncButton = page.locator('[data-action="sync"]');
    this.exportButton = page.locator('[data-action="export"]');
    this.shareButton = page.locator('[data-action="share"]');

    // Initialize chart controls
    this.timeRangeSelector = page.locator('.time-range-selector');
    this.chartCanvas = page.locator('canvas#glucoseChart');
    this.chartLegend = page.locator('.chart-legend');

    // Initialize appointment elements
    this.appointmentCards = page.locator('.appointment-card');
    this.joinVideoCallButton = page.locator('.video-call-button');
    this.viewAllAppointmentsLink = page.locator('[href="/appointments"]');

    // Initialize form elements
    this.quickEntryForm = page.locator('.quick-entry-form');
    this.glucoseInput = page.locator('#glucose-value');
    this.notesInput = page.locator('#reading-notes');
    this.saveReadingButton = page.locator('[data-action="save-reading"]');
    this.cancelButton = page.locator('[data-action="cancel"]');

    // Initialize status indicators
    this.syncStatus = page.locator('.sync-status');
    this.loadingSpinner = page.locator('ion-spinner');
    this.errorMessage = page.locator('.error-message');
  }

  /**
   * Navigate to dashboard page
   */
  async goto(): Promise<void> {
    await this.page.goto('/tabs/dashboard');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Wait for dashboard to fully load
   */
  async waitForLoad(): Promise<void> {
    await this.statsSection.waitFor({ state: 'visible' });
    await this.chartCanvas.waitFor({ state: 'visible' });
  }

  /**
   * Get statistic value
   */
  async getStatValue(
    statName: 'average' | 'time-in-range' | 'last-reading' | 'total'
  ): Promise<string> {
    const card = this.page.locator(`[data-stat="${statName}"] .stat-value`);
    return (await card.textContent()) || '';
  }

  /**
   * Add a quick glucose reading
   */
  async addQuickReading(value: number, notes?: string): Promise<void> {
    await this.addReadingButton.click();
    await this.quickEntryForm.waitFor({ state: 'visible' });

    await this.glucoseInput.fill(value.toString());

    if (notes) {
      await this.notesInput.fill(notes);
    }

    await this.saveReadingButton.click();
    await this.quickEntryForm.waitFor({ state: 'hidden' });
  }

  /**
   * Change chart time range
   */
  async selectTimeRange(range: '24h' | '7d' | '30d'): Promise<void> {
    const button = this.timeRangeSelector.locator(`[data-range="${range}"]`);
    await button.click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Sync data with Tidepool
   */
  async syncData(): Promise<void> {
    await this.syncButton.click();
    await this.syncStatus.locator('.syncing').waitFor({ state: 'visible' });
    await this.syncStatus.locator('.synced').waitFor({ state: 'visible', timeout: 10000 });
  }

  /**
   * Check if there are appointments
   */
  async hasAppointments(): Promise<boolean> {
    return (await this.appointmentCards.count()) > 0;
  }

  /**
   * Join video call for first appointment
   */
  async joinVideoCall(): Promise<void> {
    const firstCard = this.appointmentCards.first();
    await firstCard.hover();
    await this.joinVideoCallButton.first().click();
  }

  /**
   * Check if sync is in progress
   */
  async isSyncing(): Promise<boolean> {
    const syncingIndicator = this.syncStatus.locator('.syncing');
    return await syncingIndicator.isVisible();
  }

  /**
   * Check if there's an error
   */
  async hasError(): Promise<boolean> {
    return await this.errorMessage.isVisible();
  }

  /**
   * Get error message text
   */
  async getErrorMessage(): Promise<string> {
    return (await this.errorMessage.textContent()) || '';
  }

  /**
   * Refresh dashboard data
   */
  async refresh(): Promise<void> {
    await this.page.evaluate(() => {
      const content = document.querySelector('ion-content');
      if (content) {
        (content as any).scrollToTop(0);
      }
    });

    // Pull to refresh
    await this.page.mouse.move(200, 100);
    await this.page.mouse.down();
    await this.page.mouse.move(200, 400, { steps: 10 });
    await this.page.mouse.up();

    await this.loadingSpinner.waitFor({ state: 'visible' });
    await this.loadingSpinner.waitFor({ state: 'hidden', timeout: 5000 });
  }

  /**
   * Share glucose data
   */
  async shareData(): Promise<void> {
    await this.shareButton.click();
    await this.page.waitForTimeout(500); // Wait for share dialog
  }

  /**
   * Check if chart has data
   */
  async chartHasData(): Promise<boolean> {
    const noDataMessage = this.chartSection.locator('.no-data-message');
    const isNoData = await noDataMessage.isVisible();
    return !isNoData;
  }

  /**
   * Get appointment count
   */
  async getAppointmentCount(): Promise<number> {
    return await this.appointmentCards.count();
  }

  /**
   * Navigate to appointments page
   */
  async goToAppointments(): Promise<void> {
    await this.viewAllAppointmentsLink.click();
    await this.page.waitForURL('**/appointments');
  }

  /**
   * Export data
   */
  async exportData(format: 'csv' | 'pdf' | 'json' = 'csv'): Promise<void> {
    await this.exportButton.click();

    const exportDialog = this.page.locator('.export-dialog');
    await exportDialog.waitFor({ state: 'visible' });

    await exportDialog.locator(`[data-format="${format}"]`).click();
    await exportDialog.locator('[data-action="confirm-export"]').click();

    await exportDialog.waitFor({ state: 'hidden' });
  }

  /**
   * Check if user is in target range
   */
  async isInTargetRange(): Promise<boolean> {
    const tirValue = await this.getStatValue('time-in-range');
    const percentage = parseInt(tirValue.replace('%', ''));
    return percentage >= 70; // Standard target is 70% TIR
  }

  /**
   * Get all visible stat card values
   */
  async getAllStats(): Promise<Record<string, string>> {
    return {
      average: await this.getStatValue('average'),
      timeInRange: await this.getStatValue('time-in-range'),
      lastReading: await this.getStatValue('last-reading'),
      total: await this.getStatValue('total'),
    };
  }

  /**
   * Wait for real-time update
   */
  async waitForRealtimeUpdate(timeout = 5000): Promise<void> {
    const initialValue = await this.getStatValue('last-reading');

    await this.page.waitForFunction(
      ([selector, initial]) => {
        const element = document.querySelector(selector);
        return element?.textContent !== initial;
      },
      ['[data-stat="last-reading"] .stat-value', initialValue],
      { timeout }
    );
  }

  /**
   * Check dashboard health status
   */
  async getHealthStatus(): Promise<'good' | 'warning' | 'critical'> {
    const avgValue = await this.getStatValue('average');
    const avg = parseInt(avgValue);

    if (avg >= 70 && avg <= 180) return 'good';
    if ((avg >= 60 && avg < 70) || (avg > 180 && avg <= 250)) return 'warning';
    return 'critical';
  }
}
