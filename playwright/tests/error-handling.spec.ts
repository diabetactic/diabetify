/**
 * Error Handling Tests
 *
 * Tests:
 * - Invalid login credentials show error
 * - Form validation errors display correctly
 * - Network errors are handled gracefully
 * - Empty states display properly
 */

import { test, expect } from '@playwright/test';

test.describe('Error Handling', () => {
  test('invalid login shows error message', async ({ page }) => {
    await page.goto('/login');
    await page.waitForSelector('form', { state: 'visible', timeout: 10000 });

    // Enter invalid credentials
    await page.fill('input[placeholder*="DNI"], input[placeholder*="email"]', 'invalid_user');
    await page.fill('input[type="password"]', 'wrong_password');

    // Submit
    await page.click('button:has-text("Iniciar"), button:has-text("Sign In")');

    // Wait for error message
    const errorMessage = page.locator('text=/Error|Inválido|Invalid|Incorrecto|credenciales/i');
    await expect(errorMessage).toBeVisible({ timeout: 5000 });

    // Should still be on login page
    await expect(page).toHaveURL(/\/login/, { timeout: 3000 });
  });

  test('form validation shows errors for empty fields', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.waitForSelector('form', { state: 'visible', timeout: 10000 });

    const username = process.env.E2E_TEST_USERNAME || '1000';
    const password = process.env.E2E_TEST_PASSWORD || 'tuvieja';

    await page.fill('input[placeholder*="DNI"], input[placeholder*="email"]', username);
    await page.fill('input[type="password"]', password);
    await page.click('button:has-text("Iniciar"), button:has-text("Sign In")');

    await expect(page).toHaveURL(/\/tabs\//, { timeout: 15000 });

    // Navigate to add reading
    await page.click('[data-testid="tab-readings"], ion-tab-button[tab="readings"]');
    await page.waitForSelector('ion-content', { state: 'visible', timeout: 5000 });

    const addButton = page.locator('ion-button:has-text("Agregar"), ion-button:has-text("Add")');
    if (await addButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await addButton.click();
      await page.waitForSelector('ion-content', { state: 'visible', timeout: 5000 });

      // Try to submit empty form
      const submitButton = page.locator(
        'ion-button:has-text("Guardar"), ion-button:has-text("Save")'
      );
      if (await submitButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await submitButton.click();
        await page.waitForLoadState('networkidle', { timeout: 10000 });

        // Should show validation error
        const validationError = page.locator(
          'text=/requerido|required|obligatorio|necesario|inválido|invalid/i'
        );
        await expect(validationError).toBeVisible({ timeout: 3000 });
      }
    }
  });

  test('form validation shows errors for invalid glucose values', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.waitForSelector('form', { state: 'visible', timeout: 10000 });

    const username = process.env.E2E_TEST_USERNAME || '1000';
    const password = process.env.E2E_TEST_PASSWORD || 'tuvieja';

    await page.fill('input[placeholder*="DNI"], input[placeholder*="email"]', username);
    await page.fill('input[type="password"]', password);
    await page.click('button:has-text("Iniciar"), button:has-text("Sign In")');

    await expect(page).toHaveURL(/\/tabs\//, { timeout: 15000 });

    // Navigate to add reading
    await page.click('[data-testid="tab-readings"], ion-tab-button[tab="readings"]');
    await page.waitForSelector('ion-content', { state: 'visible', timeout: 5000 });

    const addButton = page.locator('ion-button:has-text("Agregar"), ion-button:has-text("Add")');
    if (await addButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await addButton.click();
      await page.waitForSelector('ion-content', { state: 'visible', timeout: 5000 });

      // Enter invalid value (negative)
      const glucoseInput = page.locator('ion-input input').first();
      if (await glucoseInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await glucoseInput.fill('-50');

        // Try to submit
        const submitButton = page.locator(
          'ion-button:has-text("Guardar"), ion-button:has-text("Save")'
        );
        if (await submitButton.isVisible({ timeout: 3000 }).catch(() => false)) {
          await submitButton.click();
          await page.waitForLoadState('networkidle', { timeout: 10000 });

          // Should show validation error
          const validationError = page.locator('text=/inválido|invalid|error|rango|range/i');
          await expect(validationError).toBeVisible({ timeout: 3000 });
        }
      }
    }
  });

  test('empty state displays when no data exists', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.waitForSelector('form', { state: 'visible', timeout: 10000 });

    const username = process.env.E2E_TEST_USERNAME || '1000';
    const password = process.env.E2E_TEST_PASSWORD || 'tuvieja';

    await page.fill('input[placeholder*="DNI"], input[placeholder*="email"]', username);
    await page.fill('input[type="password"]', password);
    await page.click('button:has-text("Iniciar"), button:has-text("Sign In")');

    await expect(page).toHaveURL(/\/tabs\//, { timeout: 15000 });

    // Navigate to readings
    await page.click('[data-testid="tab-readings"], ion-tab-button[tab="readings"]');
    await page.waitForSelector('ion-content', { state: 'visible', timeout: 5000 });

    // Should show either data or empty state (not an error)
    const emptyState = page.locator('text=/No hay|No data|Sin datos|vacío|empty/i');
    const dataExists = page.locator('ion-card, .reading-item');

    // Either empty state or data should be visible (not crash)
    const hasContent = await Promise.race([
      emptyState.isVisible({ timeout: 5000 }).catch(() => false),
      dataExists.isVisible({ timeout: 5000 }).catch(() => false),
    ]);

    expect(
      hasContent,
      'Dashboard should display content even when some data fails to load'
    ).toBeTruthy();
  });

  test('navigation errors are handled gracefully', async ({ page }) => {
    // Try to access protected route without login
    await page.goto('/tabs/dashboard');

    // Should redirect to login or welcome
    await expect(page).toHaveURL(/\/(login|welcome)/, { timeout: 5000 });

    // Should not crash or show blank page
    const content = page.locator('ion-content').first();
    await expect(content).toBeVisible();
  });

  test('network error on login shows error message', async ({ page }) => {
    // Mock the API route to simulate a network error
    await page.route('**/token', async (route) => {
      // Respond with a network error
      await route.abort();
    });

    await page.goto('/login');
    await page.waitForSelector('form', { state: 'visible', timeout: 10000 });

    // Enter valid credentials
    await page.fill('input[placeholder*="DNI"], input[placeholder*="email"]', 'any_user');
    await page.fill('input[type="password"]', 'any_password');

    // Submit
    await page.click('button:has-text("Iniciar"), button:has-text("Sign In")');

    // Wait for error message
    const errorMessage = page.locator('text=/Error de conexión/i');
    await expect(errorMessage).toBeVisible({ timeout: 5000 });

    // Should still be on login page
    await expect(page).toHaveURL(/\/login/, { timeout: 3000 });
  });
});
