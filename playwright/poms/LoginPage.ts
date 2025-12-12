/**
 * LoginPage Class
 *
 * This POM class encapsulates the locators and actions related to the login page.
 * It extends the `BasePage` to inherit common functionalities.
 */
import { Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class LoginPage extends BasePage {
  // Locators
  readonly usernameInput = this.page.locator(
    '[data-testid="login-username-input"], input[placeholder*="DNI"], input[placeholder*="email"]'
  );
  readonly passwordInput = this.page.locator(
    '[data-testid="login-password-input"], input[placeholder*="contraseña"], input[type="password"]'
  );
  readonly loginButton = this.page.getByRole('button', {
    name: /iniciar|login/i,
  });

  constructor(page: Page) {
    super(page);
  }

  /**
   * Logs the user into the application.
   * @param user - The username.
   * @param pass - The password.
   */
  async login(user: string, pass: string): Promise<void> {
    await this.goto('/login');
    await this.fill(this.usernameInput, user);
    await this.fill(this.passwordInput, pass);
    await this.click(this.loginButton);
    await this.waitForIonicHydration();
  }
}
