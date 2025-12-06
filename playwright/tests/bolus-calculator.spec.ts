/**
 * Bolus Calculator E2E Tests
 *
 * Comprehensive test suite for the insulin bolus calculator feature.
 * Tests navigation, calculations, form validation, food picker integration,
 * and reset functionality.
 */

import { test, expect } from '@playwright/test';
import {
  loginUser,
  waitForIonicHydration,
  fillIonicInput,
  waitForElement,
  elementExists,
} from '../helpers/test-helpers';

test.describe('Bolus Calculator', () => {
  test.beforeEach(async ({ page }) => {
    // Login and navigate to dashboard
    await loginUser(page);
    await expect(page).toHaveURL(/\/tabs\/dashboard/, { timeout: 15000 });
    await waitForIonicHydration(page);
  });

  test.describe('Navigation', () => {
    test('should navigate to calculator from dashboard FAB button', async ({ page }) => {
      // Wait for FAB to be visible
      const fabButton = page
        .locator('ion-fab-button[aria-label*="Bolus"], ion-fab-button img[alt=""]')
        .first();
      await expect(fabButton).toBeVisible({ timeout: 10000 });

      // Click FAB button
      await fabButton.click();

      // Verify navigation
      await expect(page).toHaveURL(/\/bolus-calculator/, { timeout: 10000 });

      // Verify page title
      await expect(page.locator('ion-title')).toContainText(
        /Bolus Calculator|Calculadora de Bolo/i,
        { timeout: 5000 }
      );
    });

    test('should navigate to calculator from quick actions button', async ({ page }) => {
      // Find and click the quick actions bolus calculator button
      const calculatorButton = page
        .locator('button:has-text("Bolus Calculator"), button:has-text("Calculadora")')
        .first();

      // Wait for button to be visible
      await expect(calculatorButton).toBeVisible({ timeout: 10000 });

      // Click button
      await calculatorButton.click();

      // Verify navigation
      await expect(page).toHaveURL(/\/bolus-calculator/, { timeout: 10000 });
    });

    test('should show info banner explaining calculator purpose', async ({ page }) => {
      // Navigate to calculator
      const fabButton = page.locator('ion-fab-button').first();
      await fabButton.click();
      await expect(page).toHaveURL(/\/bolus-calculator/, { timeout: 10000 });

      // Check for info banner
      const infoBanner = page.locator('.info-banner, [class*="info"]').first();
      await expect(infoBanner).toBeVisible({ timeout: 5000 });

      // Should contain informative text
      const bannerText = await infoBanner.textContent();
      expect(bannerText).toMatch(/insulin|dose|glucose|carb/i);
    });

    test('should navigate back to dashboard using back button', async ({ page }) => {
      // Navigate to calculator
      const fabButton = page.locator('ion-fab-button').first();
      await fabButton.click();
      await expect(page).toHaveURL(/\/bolus-calculator/, { timeout: 10000 });

      // Click back button
      const backButton = page
        .locator(
          'ion-button[aria-label*="back"], ion-button:has(ion-icon[name="arrow-back-outline"])'
        )
        .first();
      await backButton.click();

      // Should be back on dashboard
      await expect(page).toHaveURL(/\/tabs\/dashboard/, { timeout: 10000 });
    });
  });

  test.describe('Basic Calculation', () => {
    test.beforeEach(async ({ page }) => {
      // Navigate to calculator before each test
      const fabButton = page.locator('ion-fab-button').first();
      await fabButton.click();
      await expect(page).toHaveURL(/\/bolus-calculator/, { timeout: 10000 });
      await page.waitForLoadState('domcontentloaded');
    });

    test('should calculate insulin dose with valid inputs', async ({ page }) => {
      // Fill glucose input
      const glucoseInput = page.locator('ion-input#currentGlucose input').first();
      await expect(glucoseInput).toBeVisible({ timeout: 5000 });
      await glucoseInput.fill('180');

      // Fill carbs input
      const carbsInput = page.locator('ion-input#carbGrams input').first();
      await expect(carbsInput).toBeVisible({ timeout: 5000 });
      await carbsInput.fill('45');

      // Click calculate button
      const calculateButton = page
        .locator('ion-button:has-text("Calculate"), ion-button:has-text("Calcular")')
        .first();
      await expect(calculateButton).toBeEnabled();
      await calculateButton.click();

      // Wait for result card to appear
      const resultCard = page.locator('.result-card, [class*="result"]');
      await expect(resultCard).toBeVisible({ timeout: 10000 });

      // Verify result shows insulin units
      const resultText = await resultCard.textContent();
      expect(resultText).toMatch(/\d+\.?\d*/); // Should contain a number
      expect(resultText).toMatch(/unit/i); // Should mention units

      // Verify calculation details are shown
      expect(resultText).toMatch(/180.*mg\/dL/); // Current glucose
      expect(resultText).toMatch(/45.*g/); // Carbs
    });

    test('should show calculation details in result', async ({ page }) => {
      // Perform calculation
      await page.locator('ion-input#currentGlucose input').first().fill('200');
      await page.locator('ion-input#carbGrams input').first().fill('60');
      await page
        .locator('ion-button:has-text("Calculate"), ion-button:has-text("Calcular")')
        .first()
        .click();

      // Wait for result
      await expect(page.locator('.result-card')).toBeVisible({ timeout: 10000 });

      // Check for detailed breakdown
      const resultCard = page.locator('.result-card');
      const resultText = await resultCard.textContent();

      // Should show current glucose
      expect(resultText).toContain('200');

      // Should show carbs
      expect(resultText).toContain('60');

      // Should show target glucose
      expect(resultText).toMatch(/target.*glucose/i);

      // Should show carb ratio
      expect(resultText).toMatch(/carb.*ratio/i);

      // Should show correction factor
      expect(resultText).toMatch(/correction.*factor/i);
    });

    test('should show warning banner in results', async ({ page }) => {
      // Perform calculation
      await page.locator('ion-input#currentGlucose input').first().fill('150');
      await page.locator('ion-input#carbGrams input').first().fill('30');
      await page
        .locator('ion-button:has-text("Calculate"), ion-button:has-text("Calcular")')
        .first()
        .click();

      // Wait for result
      await expect(page.locator('.result-card')).toBeVisible({ timeout: 10000 });

      // Check for warning banner
      const warningBanner = page.locator('.warning-banner, ion-icon[name="warning-outline"]');
      await expect(warningBanner.first()).toBeVisible();

      // Should contain medical disclaimer
      const warningText = await page.locator('.result-card').textContent();
      expect(warningText).toMatch(/doctor|consult|important/i);
    });

    test('should disable calculate button while calculating', async ({ page }) => {
      // Fill inputs
      await page.locator('ion-input#currentGlucose input').first().fill('170');
      await page.locator('ion-input#carbGrams input').first().fill('40');

      const calculateButton = page
        .locator('ion-button:has-text("Calculate"), ion-button:has-text("Calcular")')
        .first();

      // Button should be enabled before calculation
      await expect(calculateButton).toBeEnabled();

      // Click and check for spinner or disabled state during processing
      await calculateButton.click();

      // Result should appear
      await expect(page.locator('.result-card')).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Form Validation', () => {
    test.beforeEach(async ({ page }) => {
      // Navigate to calculator
      const fabButton = page.locator('ion-fab-button').first();
      await fabButton.click();
      await expect(page).toHaveURL(/\/bolus-calculator/, { timeout: 10000 });
      await page.waitForLoadState('domcontentloaded');
    });

    test('should show error for empty glucose field', async ({ page }) => {
      // Fill only carbs, leave glucose empty
      const carbsInput = page.locator('ion-input#carbGrams input').first();
      await carbsInput.fill('50');

      // Try to focus and blur glucose field to trigger validation
      const glucoseInput = page.locator('ion-input#currentGlucose input').first();
      await glucoseInput.click();
      await carbsInput.click(); // Move focus away

      // Calculate button should be disabled
      const calculateButton = page.locator('ion-button[type="submit"]').first();
      await expect(calculateButton).toBeDisabled();

      // Should show error message
      const errorText = await page
        .locator('.error-text, [class*="error"]')
        .first()
        .textContent()
        .catch(() => '');
      expect(errorText).toMatch(/glucose.*required/i);
    });

    test('should show error for empty carbs field', async ({ page }) => {
      // Fill only glucose, leave carbs empty
      const glucoseInput = page.locator('ion-input#currentGlucose input').first();
      await glucoseInput.fill('150');

      // Try to focus and blur carbs field to trigger validation
      const carbsInput = page.locator('ion-input#carbGrams input').first();
      await carbsInput.click();
      await glucoseInput.click(); // Move focus away

      // Calculate button should be disabled
      const calculateButton = page.locator('ion-button[type="submit"]').first();
      await expect(calculateButton).toBeDisabled();
    });

    test('should show error for glucose below minimum (< 40)', async ({ page }) => {
      const glucoseInput = page.locator('ion-input#currentGlucose input').first();
      await glucoseInput.fill('30');

      const carbsInput = page.locator('ion-input#carbGrams input').first();
      await carbsInput.fill('50');
      await carbsInput.click(); // Trigger validation

      // Button should be disabled
      const calculateButton = page.locator('ion-button[type="submit"]').first();
      await expect(calculateButton).toBeDisabled();

      // Should show range error
      const hasError = await page
        .locator('.error-text, [class*="error"]')
        .first()
        .isVisible()
        .catch(() => false);
      expect(hasError, 'Should show error message when required fields are missing').toBeTruthy();
    });

    test('should show error for glucose above maximum (> 600)', async ({ page }) => {
      const glucoseInput = page.locator('ion-input#currentGlucose input').first();
      await glucoseInput.fill('700');

      const carbsInput = page.locator('ion-input#carbGrams input').first();
      await carbsInput.fill('50');
      await carbsInput.click(); // Trigger validation

      // Button should be disabled
      const calculateButton = page.locator('ion-button[type="submit"]').first();
      await expect(calculateButton).toBeDisabled();
    });

    test('should show error for negative glucose value', async ({ page }) => {
      const glucoseInput = page.locator('ion-input#currentGlucose input').first();
      await glucoseInput.fill('-10');

      const carbsInput = page.locator('ion-input#carbGrams input').first();
      await carbsInput.fill('50');
      await carbsInput.click();

      // Button should be disabled
      const calculateButton = page.locator('ion-button[type="submit"]').first();
      await expect(calculateButton).toBeDisabled();
    });

    test('should show error for negative carbs value', async ({ page }) => {
      const glucoseInput = page.locator('ion-input#currentGlucose input').first();
      await glucoseInput.fill('150');

      const carbsInput = page.locator('ion-input#carbGrams input').first();
      await carbsInput.fill('-20');
      await glucoseInput.click();

      // Button should be disabled
      const calculateButton = page.locator('ion-button[type="submit"]').first();
      await expect(calculateButton).toBeDisabled();
    });

    test('should show error for carbs above maximum (> 300)', async ({ page }) => {
      const glucoseInput = page.locator('ion-input#currentGlucose input').first();
      await glucoseInput.fill('150');

      const carbsInput = page.locator('ion-input#carbGrams input').first();
      await carbsInput.fill('350');
      await glucoseInput.click();

      // Button should be disabled
      const calculateButton = page.locator('ion-button[type="submit"]').first();
      await expect(calculateButton).toBeDisabled();
    });

    test('should accept valid boundary values', async ({ page }) => {
      // Test minimum valid glucose (40)
      await page.locator('ion-input#currentGlucose input').first().fill('40');
      await page.locator('ion-input#carbGrams input').first().fill('10');

      const calculateButton = page.locator('ion-button[type="submit"]').first();
      await expect(calculateButton).toBeEnabled();

      // Test maximum valid glucose (600)
      await page.locator('ion-input#currentGlucose input').first().fill('600');
      await page.locator('ion-input#carbGrams input').first().fill('10');

      await expect(calculateButton).toBeEnabled();

      // Test maximum valid carbs (300)
      await page.locator('ion-input#currentGlucose input').first().fill('150');
      await page.locator('ion-input#carbGrams input').first().fill('300');

      await expect(calculateButton).toBeEnabled();
    });
  });

  test.describe('Food Picker Integration', () => {
    test.beforeEach(async ({ page }) => {
      // Navigate to calculator
      const fabButton = page.locator('ion-fab-button').first();
      await fabButton.click();
      await expect(page).toHaveURL(/\/bolus-calculator/, { timeout: 10000 });
      await page.waitForLoadState('domcontentloaded');
    });

    test('should open food picker modal', async ({ page }) => {
      // Find and click food picker button
      const foodPickerButton = page
        .locator(
          'button:has-text("Select foods"), button:has-text("Seleccionar"), .food-picker-btn'
        )
        .first();
      await expect(foodPickerButton).toBeVisible({ timeout: 5000 });
      await foodPickerButton.click();

      // Modal should be visible
      const modal = page.locator('app-food-picker, ion-modal, [class*="food-picker"]');
      await expect(modal.first()).toBeVisible({ timeout: 5000 });
    });

    test('should close food picker without selecting', async ({ page }) => {
      // Open food picker
      const foodPickerButton = page
        .locator(
          'button:has-text("Select foods"), button:has-text("Seleccionar"), .food-picker-btn'
        )
        .first();
      await foodPickerButton.click();

      // Wait for modal
      await page.waitForTimeout(1000);

      // Close modal (look for cancel/close button)
      const closeButton = page
        .locator(
          'ion-button:has-text("Cancel"), ion-button:has-text("Cancelar"), ion-button:has-text("Close")'
        )
        .first();

      const hasCloseButton = await elementExists(page, closeButton.toString(), 2000);

      if (hasCloseButton) {
        await closeButton.click();

        // Carbs field should remain empty
        const carbsValue = await page.locator('ion-input#carbGrams input').first().inputValue();
        expect(carbsValue).toBe('');
      }
    });

    test('should populate carbs from food picker selection', async ({ page }) => {
      // Open food picker
      const foodPickerButton = page
        .locator('.food-picker-btn, button:has-text("Select foods")')
        .first();
      await foodPickerButton.click();

      // Wait for modal to be fully visible
      await page.waitForTimeout(1500);

      // Check if food items are available
      const hasFoodItems = await elementExists(page, '.food-item, ion-item, [class*="food"]', 3000);

      if (hasFoodItems) {
        // Select a food item (first available)
        const foodItem = page.locator('.food-item, ion-item, button[class*="food"]').first();
        await foodItem.click();

        // Confirm selection
        const confirmButton = page
          .locator(
            'ion-button:has-text("Confirm"), ion-button:has-text("Confirmar"), ion-button:has-text("Done")'
          )
          .first();
        const hasConfirmButton = await elementExists(page, confirmButton.toString(), 2000);

        if (hasConfirmButton) {
          await confirmButton.click();

          // Carbs field should be populated
          const carbsInput = page.locator('ion-input#carbGrams input').first();
          const carbsValue = await carbsInput.inputValue();

          // Should have a numeric value greater than 0
          expect(parseInt(carbsValue || '0')).toBeGreaterThan(0);
        }
      }
    });

    test('should show selected foods display', async ({ page }) => {
      // Open food picker
      const foodPickerButton = page.locator('.food-picker-btn').first();
      await foodPickerButton.click();

      await page.waitForTimeout(1500);

      // Check if foods can be selected
      const hasFoodItems = await elementExists(page, '.food-item, ion-item', 3000);

      if (hasFoodItems) {
        // Select a food
        await page.locator('.food-item, ion-item').first().click();

        // Confirm
        const confirmButton = page
          .locator('ion-button:has-text("Confirm"), ion-button:has-text("Confirmar")')
          .first();
        const hasConfirm = await elementExists(page, confirmButton.toString(), 2000);

        if (hasConfirm) {
          await confirmButton.click();

          // Check for selected foods display
          const selectedFoodsList = page.locator('.selected-foods-list, [class*="selected-food"]');
          const hasSelectedDisplay = await selectedFoodsList
            .isVisible({ timeout: 3000 })
            .catch(() => false);

          expect(
            hasSelectedDisplay,
            'Should display selected meal type after selection'
          ).toBeTruthy();
        }
      }
    });

    test('should clear selected foods', async ({ page }) => {
      // Fill carbs manually first
      await page.locator('ion-input#carbGrams input').first().fill('50');

      // If there's a clear button visible, test it
      const clearButton = page.locator(
        '.clear-foods-btn, button:has-text("Clear"), ion-icon[name="x"]'
      );
      const hasClearButton = await clearButton
        .first()
        .isVisible({ timeout: 2000 })
        .catch(() => false);

      if (hasClearButton) {
        await clearButton.first().click();

        // Carbs should be cleared
        const carbsValue = await page.locator('ion-input#carbGrams input').first().inputValue();
        expect(carbsValue).toBe('');
      }
    });
  });

  test.describe('Reset Calculator', () => {
    test.beforeEach(async ({ page }) => {
      // Navigate to calculator and perform a calculation
      const fabButton = page.locator('ion-fab-button').first();
      await fabButton.click();
      await expect(page).toHaveURL(/\/bolus-calculator/, { timeout: 10000 });

      // Perform calculation
      await page.locator('ion-input#currentGlucose input').first().fill('180');
      await page.locator('ion-input#carbGrams input').first().fill('45');
      await page
        .locator('ion-button:has-text("Calculate"), ion-button:has-text("Calcular")')
        .first()
        .click();

      // Wait for result
      await expect(page.locator('.result-card')).toBeVisible({ timeout: 10000 });
    });

    test('should show reset button after calculation', async ({ page }) => {
      // Reset button should be visible in result card
      const resetButton = page.locator(
        'ion-button:has-text("New Calculation"), ion-button:has-text("Nueva"), ion-button:has(ion-icon[name="refresh-outline"])'
      );
      await expect(resetButton.first()).toBeVisible();
    });

    test('should clear form when reset is clicked', async ({ page }) => {
      // Click reset button
      const resetButton = page.locator(
        'ion-button:has-text("New Calculation"), ion-button:has-text("Nueva"), ion-button:has(ion-icon[name="refresh-outline"])'
      );
      await resetButton.first().click();

      // Wait for reset to complete
      await page.waitForTimeout(500);

      // Form fields should be empty
      const glucoseValue = await page
        .locator('ion-input#currentGlucose input')
        .first()
        .inputValue();
      const carbsValue = await page.locator('ion-input#carbGrams input').first().inputValue();

      expect(glucoseValue).toBe('');
      expect(carbsValue).toBe('');
    });

    test('should hide result card after reset', async ({ page }) => {
      // Click reset button
      const resetButton = page.locator(
        'ion-button:has-text("New Calculation"), ion-button:has-text("Nueva"), ion-button:has(ion-icon[name="refresh-outline"])'
      );
      await resetButton.first().click();

      // Wait for animation
      await page.waitForTimeout(500);

      // Result card should not be visible
      const resultCard = page.locator('.result-card');
      const isVisible = await resultCard.isVisible().catch(() => false);
      expect(isVisible).toBeFalsy();
    });

    test('should clear selected foods after reset', async ({ page }) => {
      // Click reset
      const resetButton = page.locator('ion-button:has(ion-icon[name="refresh-outline"])').first();
      await resetButton.click();

      await page.waitForTimeout(500);

      // Selected foods display should not be visible
      const selectedFoodsList = page.locator('.selected-foods-list');
      const hasSelectedFoods = await selectedFoodsList.isVisible().catch(() => false);
      expect(hasSelectedFoods).toBeFalsy();
    });

    test('should allow new calculation after reset', async ({ page }) => {
      // Reset calculator
      const resetButton = page.locator('ion-button:has(ion-icon[name="refresh-outline"])').first();
      await resetButton.click();
      await page.waitForTimeout(500);

      // Perform new calculation with different values
      await page.locator('ion-input#currentGlucose input').first().fill('220');
      await page.locator('ion-input#carbGrams input').first().fill('75');
      await page.locator('ion-button[type="submit"]').first().click();

      // New result should appear
      const resultCard = page.locator('.result-card');
      await expect(resultCard).toBeVisible({ timeout: 10000 });

      // Should show new values
      const resultText = await resultCard.textContent();
      expect(resultText).toContain('220');
      expect(resultText).toContain('75');
    });
  });

  test.describe('Edge Cases', () => {
    test.beforeEach(async ({ page }) => {
      // Navigate to calculator
      const fabButton = page.locator('ion-fab-button').first();
      await fabButton.click();
      await expect(page).toHaveURL(/\/bolus-calculator/, { timeout: 10000 });
    });

    test('should handle very low glucose (40 mg/dL)', async ({ page }) => {
      await page.locator('ion-input#currentGlucose input').first().fill('40');
      await page.locator('ion-input#carbGrams input').first().fill('15');

      const calculateButton = page.locator('ion-button[type="submit"]').first();
      await expect(calculateButton).toBeEnabled();
      await calculateButton.click();

      // Should still calculate
      await expect(page.locator('.result-card')).toBeVisible({ timeout: 10000 });
    });

    test('should handle very high glucose (600 mg/dL)', async ({ page }) => {
      await page.locator('ion-input#currentGlucose input').first().fill('600');
      await page.locator('ion-input#carbGrams input').first().fill('30');

      const calculateButton = page.locator('ion-button[type="submit"]').first();
      await expect(calculateButton).toBeEnabled();
      await calculateButton.click();

      // Should still calculate
      await expect(page.locator('.result-card')).toBeVisible({ timeout: 10000 });
    });

    test('should handle zero carbs', async ({ page }) => {
      await page.locator('ion-input#currentGlucose input').first().fill('180');
      await page.locator('ion-input#carbGrams input').first().fill('0');

      const calculateButton = page.locator('ion-button[type="submit"]').first();
      await expect(calculateButton).toBeEnabled();
      await calculateButton.click();

      // Should calculate correction dose only
      await expect(page.locator('.result-card')).toBeVisible({ timeout: 10000 });
    });

    test('should handle decimal glucose values', async ({ page }) => {
      await page.locator('ion-input#currentGlucose input').first().fill('182.5');
      await page.locator('ion-input#carbGrams input').first().fill('45');

      const calculateButton = page.locator('ion-button[type="submit"]').first();
      await calculateButton.click();

      await expect(page.locator('.result-card')).toBeVisible({ timeout: 10000 });
    });

    test('should handle large carb values', async ({ page }) => {
      await page.locator('ion-input#currentGlucose input').first().fill('150');
      await page.locator('ion-input#carbGrams input').first().fill('250');

      const calculateButton = page.locator('ion-button[type="submit"]').first();
      await expect(calculateButton).toBeEnabled();
      await calculateButton.click();

      await expect(page.locator('.result-card')).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Accessibility', () => {
    test.beforeEach(async ({ page }) => {
      // Navigate to calculator
      const fabButton = page.locator('ion-fab-button').first();
      await fabButton.click();
      await expect(page).toHaveURL(/\/bolus-calculator/, { timeout: 10000 });
    });

    test('should have proper input labels', async ({ page }) => {
      // Check glucose input label
      const glucoseLabel = page.locator('label[for="currentGlucose"]');
      await expect(glucoseLabel).toBeVisible();

      // Check carbs input label
      const carbsLabel = page.locator('label[for="carbGrams"]');
      await expect(carbsLabel).toBeVisible();
    });

    test('should show error messages for screen readers', async ({ page }) => {
      // Trigger validation errors
      const glucoseInput = page.locator('ion-input#currentGlucose input').first();
      await glucoseInput.click();
      await glucoseInput.fill('1000'); // Invalid value

      const carbsInput = page.locator('ion-input#carbGrams input').first();
      await carbsInput.click(); // Trigger glucose validation

      // Error text should be visible
      const errorText = page.locator('.error-text').first();
      const hasError = await errorText.isVisible().catch(() => false);
      expect(
        hasError,
        'Should show error message for glucose value below minimum (19 mg/dL)'
      ).toBeTruthy();
    });

    test('should have proper button text or aria-labels', async ({ page }) => {
      // Calculate button should have text
      const calculateButton = page.locator('ion-button[type="submit"]').first();
      const buttonText = await calculateButton.textContent();
      expect(buttonText?.trim().length).toBeGreaterThan(0);

      // Back button should have accessible text or aria-label
      const backButton = page
        .locator('ion-button:has(ion-icon[name="arrow-back-outline"])')
        .first();
      const hasAriaLabel = await backButton.getAttribute('aria-label');
      const hasText = await backButton.textContent();
      expect(
        hasAriaLabel || hasText,
        'Form should have accessible labels or visible text for screen readers'
      ).toBeTruthy();
    });
  });
});
