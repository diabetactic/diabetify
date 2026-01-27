import { test, expect } from '../../fixtures';
import { TIMEOUTS } from '../../config/test-config';

test.describe('Password Recovery Flow @functional @docker', () => {
  test.describe('Forgot Password Page', () => {
    test('should navigate to forgot password from login', async ({ pages }) => {
      await pages.loginPage.goto();
      await pages.loginPage.page.getByTestId('forgot-password-link').click();
      await expect(pages.loginPage.page).toHaveURL(/\/forgot-password/);
    });

    test('should display forgot password form', async ({ page }) => {
      await page.goto('/forgot-password');
      await page.waitForSelector('ion-app.hydrated', { state: 'attached', timeout: TIMEOUTS.navigation });

      await expect(page.getByTestId('forgot-password-email-input')).toBeVisible();
      await expect(page.getByTestId('forgot-password-submit-btn')).toBeVisible();
      await expect(page.getByTestId('forgot-password-submit-btn')).toBeDisabled();
    });

    test('should validate email format', async ({ page }) => {
      await page.goto('/forgot-password');
      await page.waitForSelector('ion-app.hydrated', { state: 'attached', timeout: TIMEOUTS.navigation });

      const emailInput = page.getByTestId('forgot-password-email-input');
      await emailInput.fill('invalid-email');
      await emailInput.blur();

      await expect(page.locator('.error-text')).toBeVisible();
    });

    test('should enable submit button with valid email', async ({ page }) => {
      await page.goto('/forgot-password');
      await page.waitForSelector('ion-app.hydrated', { state: 'attached', timeout: TIMEOUTS.navigation });

      const emailInput = page.getByTestId('forgot-password-email-input');
      await emailInput.fill('valid@example.com');

      await expect(page.getByTestId('forgot-password-submit-btn')).toBeEnabled();
    });

    test('should show success message after submitting email', async ({ page, primaryUser }) => {
      await page.goto('/forgot-password');
      await page.waitForSelector('ion-app.hydrated', { state: 'attached', timeout: TIMEOUTS.navigation });

      const emailInput = page.getByTestId('forgot-password-email-input');
      await emailInput.fill(primaryUser.email);
      await page.getByTestId('forgot-password-submit-btn').click();

      await expect(page.locator('.success-message')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('.success-message ion-button')).toBeVisible();
    });

    test('should navigate back to login from success state', async ({ page, primaryUser }) => {
      await page.goto('/forgot-password');
      await page.waitForSelector('ion-app.hydrated', { state: 'attached', timeout: TIMEOUTS.navigation });

      await page.getByTestId('forgot-password-email-input').fill(primaryUser.email);
      await page.getByTestId('forgot-password-submit-btn').click();

      await expect(page.locator('.success-message')).toBeVisible({ timeout: 10000 });
      await page.locator('.success-message').getByRole('link').click();

      await expect(page).toHaveURL(/\/login/);
    });
  });

  test.describe('Reset Password Page', () => {
    test('should show error when no token provided', async ({ page }) => {
      await page.goto('/reset-password');
      await page.waitForSelector('ion-app.hydrated', { state: 'attached', timeout: TIMEOUTS.navigation });

      await expect(page.locator('.error-message')).toBeVisible();
      await expect(page.getByTestId('reset-password-input')).not.toBeVisible();
    });

    test('should show form when token is provided', async ({ page }) => {
      await page.goto('/reset-password?token=test-token-123');
      await page.waitForSelector('ion-app.hydrated', { state: 'attached', timeout: TIMEOUTS.navigation });

      await expect(page.getByTestId('reset-password-input')).toBeVisible();
      await expect(page.getByTestId('reset-confirm-password-input')).toBeVisible();
      await expect(page.getByTestId('reset-password-submit-btn')).toBeVisible();
    });

    test('should validate password minimum length', async ({ page }) => {
      await page.goto('/reset-password?token=test-token-123');
      await page.waitForSelector('ion-app.hydrated', { state: 'attached', timeout: TIMEOUTS.navigation });

      await page.getByTestId('reset-password-input').fill('12345');
      await page.getByTestId('reset-password-input').blur();

      await expect(page.locator('.error-text')).toBeVisible();
    });

    test('should validate passwords match', async ({ page }) => {
      await page.goto('/reset-password?token=test-token-123');
      await page.waitForSelector('ion-app.hydrated', { state: 'attached', timeout: TIMEOUTS.navigation });

      await page.getByTestId('reset-password-input').fill('newPassword123');
      await page.getByTestId('reset-confirm-password-input').fill('differentPassword');
      await page.getByTestId('reset-confirm-password-input').blur();

      await expect(page.locator('.error-text')).toBeVisible();
    });

    test('should enable submit with valid matching passwords', async ({ page }) => {
      await page.goto('/reset-password?token=test-token-123');
      await page.waitForSelector('ion-app.hydrated', { state: 'attached', timeout: TIMEOUTS.navigation });

      await page.getByTestId('reset-password-input').fill('newPassword123');
      await page.getByTestId('reset-confirm-password-input').fill('newPassword123');

      await expect(page.getByTestId('reset-password-submit-btn')).toBeEnabled();
    });

    test('should show error toast with invalid token', async ({ page }) => {
      await page.goto('/reset-password?token=invalid-token-will-fail');
      await page.waitForSelector('ion-app.hydrated', { state: 'attached', timeout: TIMEOUTS.navigation });

      await page.getByTestId('reset-password-input').fill('newPassword123');
      await page.getByTestId('reset-confirm-password-input').fill('newPassword123');
      await page.getByTestId('reset-password-submit-btn').click();

      await expect(page.locator('ion-toast')).toBeVisible({ timeout: 10000 });
    });

    test('should navigate to forgot-password from no-token error state', async ({ page }) => {
      await page.goto('/reset-password');
      await page.waitForSelector('ion-app.hydrated', { state: 'attached', timeout: TIMEOUTS.navigation });

      await expect(page.locator('.error-message')).toBeVisible();
      await page.locator('.error-message').getByRole('link').click();

      await expect(page).toHaveURL(/\/forgot-password/);
    });
  });

  test.describe('Navigation Flow', () => {
    test('should have back button on forgot password page', async ({ page }) => {
      await page.goto('/forgot-password');
      await page.waitForSelector('ion-app.hydrated', { state: 'attached', timeout: TIMEOUTS.navigation });

      await expect(page.locator('ion-back-button')).toBeVisible();
    });

    test('should navigate back to login using back button', async ({ page }) => {
      await page.goto('/login');
      await page.waitForSelector('ion-app.hydrated', { state: 'attached', timeout: TIMEOUTS.navigation });

      await page.getByTestId('forgot-password-link').click();
      await expect(page).toHaveURL(/\/forgot-password/);

      await page.goBack();
      await expect(page).toHaveURL(/\/login/);
    });
  });
});
