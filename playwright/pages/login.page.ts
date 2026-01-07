import { Page, expect } from '@playwright/test';
import { BasePage } from './base.page';

export interface LoginCredentials {
  username: string;
  password: string;
}

export class LoginPage extends BasePage {
  readonly usernameInput = this.page.locator('[data-testid="login-username-input"]');
  readonly passwordInput = this.page.locator('[data-testid="login-password-input"]');
  readonly submitButton = this.page.locator('[data-testid="login-submit-btn"]');

  constructor(page: Page) {
    super(page);
  }

  async goto(): Promise<void> {
    await this.page.goto('/login', { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await this.waitForHydration(15000);
  }

  async login(credentials?: LoginCredentials): Promise<void> {
    const username = credentials?.username || process.env.E2E_TEST_USERNAME || '1000';
    const password = credentials?.password || this.getDefaultPassword();

    if (!this.page.url().includes('/login')) {
      await this.goto();
    }

    if (this.page.url().includes('/tabs/')) {
      return;
    }

    await this.usernameInput.waitFor({ state: 'visible', timeout: 15000 });
    await this.page.fill('[data-testid="login-username-input"]', username);
    await this.page.fill('[data-testid="login-password-input"]', password);
    await this.submitButton.click();

    await expect(this.page).toHaveURL(/\/tabs\//, { timeout: 30000 });
    await this.completeOnboarding();
    await this.page.reload();
    await this.waitForHydration();
    await this.dismissOnboardingOverlay();
  }

  private getDefaultPassword(): string {
    if (process.env.E2E_TEST_PASSWORD) {
      return process.env.E2E_TEST_PASSWORD;
    }
    const isMockMode = process.env.E2E_MOCK_MODE === 'true';
    return isMockMode ? 'demo123' : 'tuvieja';
  }

  private async completeOnboarding(): Promise<void> {
    const userProfile = {
      id: 'user_12345',
      name: 'E2E Test User',
      email: 'e2e@test.com',
      age: 30,
      accountState: 'active',
      dateOfBirth: '1993-01-01',
      tidepoolConnection: { connected: false },
      preferences: {
        useDarkTheme: false,
        language: 'en',
        notifications: {
          glucoseReadings: { enabled: true, interval: 15 },
          appointmentReminders: { enabled: true, reminderLeadTime: 60 },
        },
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      diagnosisDate: '2020-01-01',
      diabetesType: 'TYPE_1',
      hasCompletedOnboarding: true,
    };

    const profileJson = JSON.stringify(userProfile);
    const tooltipsJson = JSON.stringify({
      dashboard: true,
      readings: true,
      bolus: true,
      appointments: true,
      profile: true,
      fab: true,
      quickActions: true,
    });

    await this.page.evaluate(
      ({ profileJson, tooltipsJson }) => {
        localStorage.setItem('diabetactic_user_profile', profileJson);
        localStorage.setItem('diabetactic_schema_version', '1');
        localStorage.setItem('diabetactic_onboarding_completed', 'true');
        localStorage.setItem('diabetactic_coach_dismissed', 'true');
        localStorage.setItem('diabetactic_tooltips_seen', tooltipsJson);
        localStorage.setItem('diabetactic_tutorial_completed', 'true');
        localStorage.setItem('diabetactic_first_login_completed', 'true');
        localStorage.setItem('CapacitorStorage.diabetactic_user_profile', profileJson);
        localStorage.setItem('CapacitorStorage.diabetactic_schema_version', '1');
        localStorage.setItem('CapacitorStorage.diabetactic_onboarding_completed', 'true');
        localStorage.setItem('CapacitorStorage.diabetactic_coach_dismissed', 'true');
        localStorage.setItem('CapacitorStorage.diabetactic_tooltips_seen', tooltipsJson);
      },
      { profileJson, tooltipsJson }
    );
  }

  private async dismissOnboardingOverlay(): Promise<void> {
    const overlaySelectors = [
      '.onboarding-overlay',
      '.coach-overlay',
      '.tooltip-overlay',
      '[class*="onboarding"]',
      '[class*="coach"]',
      '.intro-overlay',
      '[data-testid="onboarding-dismiss"]',
    ];

    for (const selector of overlaySelectors) {
      const overlay = this.page.locator(selector).first();
      if (await overlay.isVisible({ timeout: 300 }).catch(() => false)) {
        const dismissBtn = overlay.locator(
          'button, [aria-label*="close"], [aria-label*="dismiss"], .close-btn'
        );
        if (
          await dismissBtn
            .first()
            .isVisible({ timeout: 300 })
            .catch(() => false)
        ) {
          await dismissBtn
            .first()
            .click()
            .catch(() => {});
        } else {
          await this.page.keyboard.press('Escape');
        }
      }
    }

    await this.page.evaluate(() => {
      document
        .querySelectorAll('[class*="onboarding"], [class*="coach"], [class*="overlay"]')
        .forEach(el => {
          if (el.classList.contains('onboarding') || el.classList.contains('coach')) {
            (el as HTMLElement).style.display = 'none';
          }
        });
    });
  }

  async isLoggedIn(): Promise<boolean> {
    return this.page.url().includes('/tabs/');
  }
}
