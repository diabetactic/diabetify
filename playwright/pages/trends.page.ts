import { Page, expect } from '@playwright/test';
import { BasePage } from './base.page';

export class TrendsPage extends BasePage {
  readonly periodSelector = this.page.locator('ion-segment, [data-testid="period-selector"]');
  readonly weekButton = this.page.locator(
    'ion-segment-button:has-text("Semana"), ion-segment-button:has-text("Week")'
  );
  readonly monthButton = this.page.locator(
    'ion-segment-button:has-text("Mes"), ion-segment-button:has-text("Month")'
  );
  readonly refresher = this.page.locator('ion-refresher');

  constructor(page: Page) {
    super(page);
  }

  async goto(): Promise<void> {
    const trendsTab = this.page.locator('[data-testid="tab-trends"], a[href*="trends"]');
    if ((await trendsTab.count()) > 0) {
      await trendsTab.first().click();
    } else {
      await this.page.goto('/tabs/trends');
    }
    await this.waitForUrl(/\/trends/);
    await this.waitForNetwork();
  }

  async selectWeekPeriod(): Promise<void> {
    if ((await this.weekButton.count()) > 0) {
      await this.weekButton.first().click();
      await this.waitForNetwork();
    }
  }

  async selectMonthPeriod(): Promise<void> {
    if ((await this.monthButton.count()) > 0) {
      await this.monthButton.first().click();
      await this.waitForNetwork();
    }
  }

  async hasChart(): Promise<boolean> {
    const chart = this.page.locator('canvas, svg, [class*="chart"]');
    const chartContainer = this.page.locator('[class*="time-in-range"], [data-testid*="chart"]');
    return (await chart.count()) > 0 || (await chartContainer.count()) > 0;
  }

  async hasStatistics(): Promise<boolean> {
    const hasAverage = (await this.page.locator('text=/Promedio|Average|Media/i').count()) > 0;
    const hasStdDev =
      (await this.page.locator('text=/Desviacion|Std.*Dev|Variabilidad/i').count()) > 0;
    const hasCV = (await this.page.locator('text=/CV|Coeficiente/i').count()) > 0;
    const hasReadingsCount =
      (await this.page.locator('text=/Lecturas|Readings|Total/i').count()) > 0;
    return hasAverage || hasStdDev || hasCV || hasReadingsCount;
  }

  async hasGlucoseUnit(): Promise<boolean> {
    const hasMgDl = (await this.page.locator('text=/mg\\/dL/').count()) > 0;
    const hasMmolL = (await this.page.locator('text=/mmol\\/L/').count()) > 0;
    return hasMgDl || hasMmolL;
  }

  async hasPullToRefresh(): Promise<boolean> {
    return (await this.refresher.count()) > 0;
  }

  async enableDarkMode(): Promise<void> {
    await this.page.evaluate(() => {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
    });
  }
}
