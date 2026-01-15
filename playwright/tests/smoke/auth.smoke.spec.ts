import { test, expect } from '../../fixtures';

test.describe('Authentication Smoke Tests @smoke @docker', () => {
  test('should login with valid credentials', async ({ pages, primaryUser }) => {
    await pages.loginPage.goto();
    await pages.loginPage.login({
      username: primaryUser.dni,
      password: primaryUser.password,
    });

    await expect(pages.loginPage.page).toHaveURL(/\/tabs\//);
  });

  test('should reject invalid credentials', async ({ pages }) => {
    await pages.loginPage.goto();

    await pages.loginPage.usernameInput.fill('invalid_user');
    await pages.loginPage.passwordInput.fill('wrong_password');
    await pages.loginPage.submitButton.click();

    // Wait for error state: either error message appears or URL stays on login page
    // Use explicit timeout in assertion instead of waitForTimeout
    await expect(pages.loginPage.page).not.toHaveURL(/\/tabs\//, { timeout: 5000 });
  });

  test('should redirect unauthenticated users to login or welcome', async ({ page }) => {
    await page.goto('/tabs/dashboard');
    await expect(page).toHaveURL(/\/(login|welcome)/);
  });
});
