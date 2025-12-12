import { test, expect } from '@playwright/test';
import { waitForIonicHydration } from '../helpers/test-helpers';

test.describe('Login Flow E2E', () => {
  // This loop will generate 3 independent tests to verify the login flow's stability.
  for (let i = 1; i <= 3; i++) {
    test(`Run ${i}/3: should login with valid credentials`, async ({ page }) => {
      // Set a higher navigation timeout for this specific test.
      page.setDefaultNavigationTimeout(60000);

      // Mock API requests
      await page.route('**/api/token', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            access_token: 'fake-token',
            token_type: 'bearer',
            expires_in: 3600,
            refresh_token: 'fake-refresh-token',
          }),
        });
      });
      await page.route('**/api/user**', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 1,
            name: 'Test User',
            email: 'test@example.com',
          }),
        });
      });

      // 1. Navigate to the app's entry point
      await page.goto('/');
      await waitForIonicHydration(page);

      // 2. Handle the welcome screen
      // Use a robust selector for bilingual support ("Vamos" or "Let's go")
      // A short timeout is used because this screen may not always be present.
      try {
        await page.getByText(/Vamos|Let's go/i).click({ timeout: 5000 });
      } catch (error) {
        // If the button is not found, we assume we are already on the login page.
        console.log('Welcome screen not found, proceeding to login.');
      }

      // 3. Fill in the login form
      // Updated placeholder to handle "DNI" as a valid username field.
      await page.getByPlaceholder(/DNI|Usuario|User/i).fill('1000');
      await page.getByPlaceholder(/Contraseña|Password/i).fill('tuvieja');

      // 4. Submit the form
      // Using a test ID is the most resilient way to select the login button.
      await page.getByRole('button', { name: /Iniciar Sesión|Login/i }).click();

      // 5. Verify successful login by checking for dashboard content
      // The dashboard text can be "Dashboard" or "Panel".
      await expect(page.getByText(/Dashboard|Panel/i)).toBeVisible({ timeout: 15000 });
    });
  }
});
