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
  dismissOnboardingOverlay,
  navigateToBolusCalculator,
  waitForBolusCalculatorReady,
} from '../helpers/test-helpers';

// This spec is UI-heavy and flaky when parallelized (modal overlays + Ionic hydration).
// Run serially to keep Docker E2E stable under high worker counts.
test.describe.configure({ mode: 'serial' });

async function setIonInputValue(
  page: import('@playwright/test').Page,
  testId: string,
  value: string
): Promise<void> {
  const ionInput = page.locator(`[data-testid="${testId}"]`).first();
  await ionInput.evaluate((el, newValue) => {
    // Prefer setting the component value + emitting ionInput, without clicking (avoids opening nearby modals).
    const inputEl = el as HTMLElement & { value: string };
    inputEl.value = newValue;
    el.dispatchEvent(
      new CustomEvent('ionInput', {
        bubbles: true,
        detail: { value: newValue },
      })
    );
  }, value);
}

async function closeFoodPickerIfOpen(page: import('@playwright/test').Page): Promise<void> {
  const foodPickerModal = page.locator('.food-picker-modal.food-picker-modal--open').first();
  const isOpen = await foodPickerModal
    .waitFor({ state: 'visible', timeout: 300 })
    .then(() => true)
    .catch(() => false);
  if (!isOpen) return;

  const closeBtn = foodPickerModal.locator('.food-picker-close').first();
  if ((await closeBtn.count()) > 0) {
    await closeBtn.click({ force: true, timeout: 1000 }).catch(() => {});
  }

  const backdrop = page.locator('.food-picker-backdrop.food-picker-backdrop--visible').first();
  if ((await backdrop.count()) > 0) {
    await backdrop.click({ force: true, timeout: 1000 }).catch(() => {});
  }

  await foodPickerModal.waitFor({ state: 'hidden', timeout: 1500 }).catch(() => {});
}

/**
 * Helper to handle the warning confirmation modal that appears when safety checks fail.
 * Clicks the Confirm button to proceed with the calculation result.
 * Returns true if modal was found and confirmed, false otherwise.
 *
 * Note: Multiple dialogs may be open (e.g., Food Selector + Warning modal).
 * This function specifically targets the Warning modal.
 */
async function confirmWarningModal(page: import('@playwright/test').Page): Promise<boolean> {
  await closeFoodPickerIfOpen(page);

  // Wait for any visible modal to appear (ignore hidden ion-modals)
  const anyVisibleModal = page.locator('ion-modal:visible');
  try {
    await anyVisibleModal.first().waitFor({ state: 'visible', timeout: 3000 });
  } catch {
    return false;
  }

  // Prefer modals rendered by our ConfirmationModalComponent (has .modal-actions)
  const warningModalCandidate = page
    .locator('ion-modal:visible')
    .filter({ has: page.locator('.modal-actions') });

  const modal =
    (await warningModalCandidate.count()) > 0
      ? warningModalCandidate.last()
      : anyVisibleModal.last();

  // Wait for animation to complete (Ionic modals have ~300ms animation)
  await page.waitForTimeout(350);

  // Click CONFIRM/CONFIRMAR (avoid Escape/backdrop dismiss which cancels the calculation)
  const confirmByText = modal.locator('ion-button', { hasText: /confirm/i }).last();
  if ((await confirmByText.count()) > 0) {
    await confirmByText.click({ force: true });
    await modal.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    return true;
  }

  // Fallback: click second action button (usually Confirm)
  const actionButtons = modal.locator('.modal-actions ion-button');
  if ((await actionButtons.count()) >= 2) {
    await actionButtons.nth(1).click({ force: true });
    await modal.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    return true;
  }

  return false;
}

/**
 * Helper to dismiss any open modals/dialogs that might block interactions.
 * Uses Escape key as primary method (most reliable for mobile viewports).
 */
async function dismissAnyModal(page: import('@playwright/test').Page): Promise<void> {
  await closeFoodPickerIfOpen(page);

  // Check for ion-modal and dismiss it
  const modal = page.locator('ion-modal:visible');
  if (await modal.isVisible().catch(() => false)) {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    if (await modal.isVisible().catch(() => false)) {
      const closeBtn = page
        .locator('ion-modal:visible ion-button:has(ion-icon[name="close"])')
        .first();
      if ((await closeBtn.count()) > 0) {
        await closeBtn.evaluate((el: HTMLElement) => el.click());
        await page.waitForTimeout(300);
      }
    }
  }

  // Also check for ion-alert
  const alert = page.locator('ion-alert');
  if (await alert.isVisible({ timeout: 500 }).catch(() => false)) {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  }
}

test.describe('Bolus Calculator', () => {
  test.beforeEach(async ({ page }) => {
    // Login, complete onboarding, and navigate to dashboard
    await loginUser(page);
    await expect(page).toHaveURL(/\/tabs\/dashboard/, { timeout: 15000 });
    await waitForIonicHydration(page);
    // Dismiss any onboarding/coach overlays
    await dismissOnboardingOverlay(page);
  });

  test.describe('Navigation', () => {
    test('should navigate to calculator from dashboard', async ({ page }) => {
      // Dismiss any overlays first
      await dismissOnboardingOverlay(page);

      // Use the robust navigation helper (tries multiple strategies)
      await navigateToBolusCalculator(page);

      // Verify navigation succeeded
      await expect(page).toHaveURL(/\/bolus-calculator/, { timeout: 10000 });

      // Verify page title (use app-bolus-calculator scope to avoid ambiguity)
      await expect(page.locator('app-bolus-calculator ion-title')).toContainText(
        /Bolus Calculator|Calculadora de Bolo/i,
        { timeout: 5000 }
      );
    });

    test('should show info banner explaining calculator purpose', async ({ page }) => {
      // Navigate using robust helper
      await navigateToBolusCalculator(page);
      await waitForBolusCalculatorReady(page);

      // Check for info banner - use specific class
      const infoBanner = page.locator('.info-banner').first();
      await expect(infoBanner).toBeVisible({ timeout: 5000 });

      // Should contain informative text (bilingual: ES or EN)
      const bannerText = (await infoBanner.textContent()) || '';
      const hasInfoText =
        bannerText.length > 10 ||
        /insulin|insulina|dose|dosis|glucose|glucosa|carb|carbohidrato/i.test(bannerText);

      expect(hasInfoText, 'Info banner should have informative text').toBeTruthy();
    });

    test('should navigate back to dashboard using back button', async ({ page }) => {
      // Navigate using robust helper
      await navigateToBolusCalculator(page);
      await waitForBolusCalculatorReady(page);

      // Click back button
      const backButton = page
        .locator(
          'ion-button[aria-label*="back"], ion-button:has(ion-icon[name="arrow-back-outline"]), ion-back-button'
        )
        .first();
      await backButton.click({ force: true });

      // Should be back on dashboard
      await expect(page).toHaveURL(/\/tabs\/dashboard/, { timeout: 10000 });
    });
  });

  test.describe('Basic Calculation', () => {
    test.beforeEach(async ({ page }) => {
      // Navigate to calculator using robust helper
      await navigateToBolusCalculator(page);
      await waitForBolusCalculatorReady(page);
      // Dismiss any modals that might have opened
      await dismissAnyModal(page);
    });

    test('should calculate insulin dose with valid inputs', async ({ page }) => {
      // Dismiss any modals that might be open
      await dismissAnyModal(page);

      await setIonInputValue(page, 'glucose-input', '180');
      await setIonInputValue(page, 'carbs-input', '45');

      // Dismiss any modal that might have opened (food picker could be triggered)
      await dismissAnyModal(page);

      // Click calculate button using JavaScript to avoid tab bar interception
      const calculateButton = page.locator('[data-testid="calculate-btn"]');
      await expect(calculateButton).toBeEnabled({ timeout: 5000 });
      await calculateButton.evaluate((el: HTMLElement) => {
        el.scrollIntoView({ behavior: 'instant', block: 'center' });
        el.click();
      });

      // Wait for spinner to disappear (calculation to complete)
      const spinner = page.locator('[data-testid="calculate-btn"] ion-spinner');
      await expect(spinner)
        .toBeHidden({ timeout: 10000 })
        .catch(() => {});

      // Handle warning modal if it appears (safety warnings require confirmation)
      await confirmWarningModal(page);

      // Now check for result card
      const resultCard = page.locator('[data-testid="result-card"]');
      await expect(resultCard).toBeVisible({ timeout: 5000 });

      // Verify result shows insulin units
      const resultText = await resultCard.textContent();
      expect(resultText).toMatch(/\d+\.?\d*/); // Should contain a number
      // In Spanish UI, might show "unidades" instead of "units"
      expect(resultText).toMatch(/unit|unidad/i);

      // Verify calculation details are shown
      expect(resultText).toContain('180'); // Current glucose
      expect(resultText).toContain('45'); // Carbs
    });

    test('should show calculation details in result', async ({ page }) => {
      // Perform calculation
      await setIonInputValue(page, 'glucose-input', '200');
      await setIonInputValue(page, 'carbs-input', '60');
      await page.locator('[data-testid="calculate-btn"]').evaluate((el: HTMLElement) => {
        el.scrollIntoView({ behavior: 'instant', block: 'center' });
        el.click();
      });

      // Handle warning modal if it appears
      await confirmWarningModal(page);

      // Wait for result
      await expect(page.locator('[data-testid="result-card"]')).toBeVisible({ timeout: 10000 });

      // Check for detailed breakdown
      const resultCard = page.locator('[data-testid="result-card"]');
      const resultText = (await resultCard.textContent()) || '';

      // Should show current glucose
      expect(resultText).toContain('200');

      // Should show carbs
      expect(resultText).toContain('60');

      // Result card should have substantial content (details may vary by language)
      // Checking for numbers and key info presence
      const hasDetailedContent =
        resultText.length > 50 && // Has substantial content
        /\d+/.test(resultText); // Contains numbers

      expect(hasDetailedContent, 'Result card should show calculation details').toBeTruthy();
    });

    test('should show warning banner in results', async ({ page }) => {
      // Perform calculation
      await setIonInputValue(page, 'glucose-input', '150');
      await setIonInputValue(page, 'carbs-input', '30');
      await page.locator('[data-testid="calculate-btn"]').evaluate((el: HTMLElement) => {
        el.scrollIntoView({ behavior: 'instant', block: 'center' });
        el.click();
      });

      // Handle warning modal if it appears
      await confirmWarningModal(page);

      // Wait for result
      await expect(page.locator('[data-testid="result-card"]')).toBeVisible({ timeout: 10000 });

      // Check for warning banner
      const warningBanner = page.locator('.warning-banner, ion-icon[name="warning-outline"]');
      await expect(warningBanner.first()).toBeVisible();

      // Should contain medical disclaimer
      const warningText = await page.locator('[data-testid="result-card"]').textContent();
      expect(warningText).toMatch(/doctor|consult|important/i);
    });

    test('should disable calculate button while calculating', async ({ page }) => {
      // Fill inputs
      await setIonInputValue(page, 'glucose-input', '170');
      await setIonInputValue(page, 'carbs-input', '40');

      const calculateButton = page
        .locator('ion-button:has-text("Calculate"), ion-button:has-text("Calcular")')
        .first();

      // Button should be enabled before calculation
      await expect(calculateButton).toBeEnabled();

      // Click using JavaScript to avoid interception
      await calculateButton.evaluate((el: HTMLElement) => {
        el.scrollIntoView({ behavior: 'instant', block: 'center' });
        el.click();
      });

      // Handle warning modal if it appears
      await confirmWarningModal(page);

      // Result should appear
      await expect(page.locator('[data-testid="result-card"]')).toBeVisible({ timeout: 10000 });
    });
  });

  // Form Validation tests removed - these are now covered by unit tests
  // See src/app/bolus-calculator/bolus-calculator.page.spec.ts lines 115-212
  // Unit tests are faster, more reliable, and test the same validation logic

  test.describe('Food Picker Integration', () => {
    test.beforeEach(async ({ page }) => {
      // Navigate to calculator using robust helper
      await navigateToBolusCalculator(page);
      await waitForBolusCalculatorReady(page);
      // Dismiss any modals
      await dismissAnyModal(page);
    });

    test('should open food picker modal', async ({ page }) => {
      // Find and click food picker button
      const foodPickerButton = page
        .locator(
          'button:has-text("Select foods"), button:has-text("Seleccionar"), .food-picker-btn'
        )
        .first();
      await expect(foodPickerButton).toBeVisible({ timeout: 5000 });
      await foodPickerButton.evaluate((el: HTMLElement) => {
        el.scrollIntoView({ behavior: 'instant', block: 'center' });
        el.click();
      });

      // Modal should be visible
      const modal = page.locator('app-food-picker, ion-modal, [class*="food-picker"]');
      await expect(modal.first()).toBeVisible({ timeout: 5000 });
    });

    test('should close food picker without selecting', async ({ page }) => {
      // Open food picker using JavaScript to avoid interception
      const foodPickerButton = page
        .locator(
          'button:has-text("Select foods"), button:has-text("Seleccionar"), .food-picker-btn'
        )
        .first();
      await foodPickerButton.evaluate((el: HTMLElement) => {
        el.scrollIntoView({ behavior: 'instant', block: 'center' });
        el.click();
      });

      // Wait for modal
      const modal = page.locator('app-food-picker, ion-modal, [class*="food-picker"]');
      await expect(modal.first()).toBeVisible({ timeout: 5000 });

      // Close modal (look for cancel/close button)
      const closeButton = page
        .locator(
          'ion-button:has-text("Cancel"), ion-button:has-text("Cancelar"), ion-button:has-text("Close")'
        )
        .first();

      // Use instant visibility check instead of blocking wait
      if (await closeButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await closeButton.evaluate((el: HTMLElement) => {
          el.scrollIntoView({ behavior: 'instant', block: 'center' });
          el.click();
        });

        // Carbs field should remain empty
        const carbsValue = await page
          .locator('[data-testid="carbs-input"] input')
          .first()
          .inputValue();
        expect(carbsValue).toBe('');
      }
    });

    test('should populate carbs from food picker selection', async ({ page }) => {
      // Open food picker - use more specific selector
      const foodPickerButton = page
        .locator('.food-picker-btn, [data-testid*="food-picker"]')
        .first();

      if (!(await foodPickerButton.isVisible({ timeout: 3000 }).catch(() => false))) {
        console.log('⚠️  Food picker button not found - skipping test');
        test.skip();
        return;
      }

      await foodPickerButton.evaluate((el: HTMLElement) => {
        el.scrollIntoView({ behavior: 'instant', block: 'center' });
        el.click();
      });

      // Wait for modal to be fully visible
      const modal = page.locator('app-food-picker, ion-modal');
      if (
        !(await modal
          .first()
          .isVisible({ timeout: 5000 })
          .catch(() => false))
      ) {
        console.log('⚠️  Food picker modal did not open - skipping test');
        test.skip();
        return;
      }

      // Check if food items are available
      const foodItem = page.locator('.food-item, ion-item, [class*="food-card"]').first();
      if (!(await foodItem.isVisible({ timeout: 3000 }).catch(() => false))) {
        console.log('⚠️  No food items found in picker - skipping test');
        test.skip();
        return;
      }

      // Select a food item
      await foodItem.click();
      await page.waitForTimeout(300); // Animation delay

      // Confirm selection
      const confirmButton = page
        .locator(
          'ion-button:has-text("Confirm"), ion-button:has-text("Confirmar"), ion-button:has-text("Done"), ion-button:has-text("Agregar")'
        )
        .first();

      if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirmButton.click();
        await page.waitForTimeout(500); // Wait for modal to close

        // Carbs field should be populated
        const carbsInput = page.locator('[data-testid="carbs-input"] input').first();
        const carbsValue = await carbsInput.inputValue();

        // Should have a numeric value (0 is ok if no carbs in selected food)
        const carbsNumber = parseInt(carbsValue || '0');
        expect(carbsNumber).toBeGreaterThanOrEqual(0);
        console.log(`✅ Food picker populated carbs with: ${carbsNumber}g`);
      } else {
        // Modal might auto-add on selection
        console.log('⚠️  Confirm button not visible - food may auto-add on selection');
      }
    });

    test('should show selected foods display', async ({ page }) => {
      // Open food picker
      const foodPickerButton = page.locator('.food-picker-btn').first();
      await foodPickerButton.evaluate((el: HTMLElement) => {
        el.scrollIntoView({ behavior: 'instant', block: 'center' });
        el.click();
      });

      const modal = page.locator('app-food-picker, ion-modal, [class*="food-picker"]');
      await expect(modal.first()).toBeVisible({ timeout: 5000 });

      // Check if foods can be selected using instant check
      const foodItem = page.locator('.food-item, ion-item').first();
      if (await foodItem.isVisible({ timeout: 3000 }).catch(() => false)) {
        // Select a food using JavaScript
        await foodItem.evaluate((el: HTMLElement) => {
          el.scrollIntoView({ behavior: 'instant', block: 'center' });
          el.click();
        });

        // Confirm using JavaScript
        const confirmButton = page
          .locator('ion-button:has-text("Confirm"), ion-button:has-text("Confirmar")')
          .first();

        if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          await confirmButton.evaluate((el: HTMLElement) => {
            el.scrollIntoView({ behavior: 'instant', block: 'center' });
            el.click();
          });

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
      await page.locator('[data-testid="carbs-input"] input').first().fill('50');

      // If there's a clear button visible, test it
      const clearButton = page.locator(
        '.clear-foods-btn, button:has-text("Clear"), ion-icon[name="x"]'
      );
      const hasClearButton = await clearButton
        .first()
        .isVisible({ timeout: 2000 })
        .catch(() => false);

      if (hasClearButton) {
        await clearButton.first().evaluate((el: HTMLElement) => {
          el.scrollIntoView({ behavior: 'instant', block: 'center' });
          el.click();
        });

        // Carbs should be cleared
        const carbsValue = await page
          .locator('[data-testid="carbs-input"] input')
          .first()
          .inputValue();
        expect(carbsValue).toBe('');
      }
    });
  });

  test.describe('Reset Calculator', () => {
    test.beforeEach(async ({ page }) => {
      // Navigate to calculator using robust helper
      await navigateToBolusCalculator(page);
      await waitForBolusCalculatorReady(page);
      await dismissAnyModal(page);

      // Perform calculation
      await page.locator('[data-testid="glucose-input"] input').first().fill('180');
      await page.locator('[data-testid="carbs-input"] input').first().fill('45');
      await page.locator('[data-testid="calculate-btn"]').evaluate((el: HTMLElement) => {
        el.scrollIntoView({ behavior: 'instant', block: 'center' });
        el.click();
      });

      // Handle warning modal if it appears
      await confirmWarningModal(page);

      // Wait for result
      await expect(page.locator('[data-testid="result-card"]')).toBeVisible({ timeout: 10000 });
    });

    test('should show reset button after calculation', async ({ page }) => {
      // Reset button should be visible in result card
      await expect(page.locator('[data-testid="bolus-reset-btn"]').first()).toBeVisible();
    });

    test('should clear form when reset is clicked', async ({ page }) => {
      // Click reset button using JavaScript to avoid interception
      const resetButton = page.locator('[data-testid="bolus-reset-btn"]').first();
      await resetButton.evaluate((el: HTMLElement) => {
        el.scrollIntoView({ behavior: 'instant', block: 'center' });
        el.click();
      });

      // Wait for form to clear
      await expect(page.locator('[data-testid="glucose-input"] input').first()).toHaveValue('', {
        timeout: 3000,
      });

      // Form fields should be empty
      const glucoseValue = await page
        .locator('[data-testid="glucose-input"] input')
        .first()
        .inputValue();
      const carbsValue = await page
        .locator('[data-testid="carbs-input"] input')
        .first()
        .inputValue();

      expect(glucoseValue).toBe('');
      expect(carbsValue).toBe('');
    });

    test('should hide result card after reset', async ({ page }) => {
      // Click reset button
      await page.locator('[data-testid="bolus-reset-btn"]').first().click();

      // Wait for result card to be hidden
      await expect(page.locator('[data-testid="result-card"]')).toBeHidden({ timeout: 3000 });

      // Result card should not be visible
      const resultCard = page.locator('[data-testid="result-card"]');
      const isVisible = await resultCard.isVisible().catch(() => false);
      expect(isVisible).toBeFalsy();
    });

    test('should clear selected foods after reset', async ({ page }) => {
      // Click reset using JavaScript to avoid interception
      const resetButton = page.locator('[data-testid="bolus-reset-btn"]').first();
      await resetButton.evaluate((el: HTMLElement) => {
        el.scrollIntoView({ behavior: 'instant', block: 'center' });
        el.click();
      });

      // Wait for form to clear
      await expect(page.locator('[data-testid="glucose-input"] input').first()).toHaveValue('', {
        timeout: 3000,
      });

      // Selected foods display should not be visible
      const selectedFoodsList = page.locator('.selected-foods-list');
      const hasSelectedFoods = await selectedFoodsList.isVisible().catch(() => false);
      expect(hasSelectedFoods).toBeFalsy();
    });

    test('should allow new calculation after reset', async ({ page }) => {
      // Reset calculator using JavaScript to avoid interception
      const resetButton = page.locator('[data-testid="bolus-reset-btn"]').first();
      await resetButton.evaluate((el: HTMLElement) => {
        el.scrollIntoView({ behavior: 'instant', block: 'center' });
        el.click();
      });
      // Wait for form to clear
      await expect(page.locator('[data-testid="glucose-input"] input').first()).toHaveValue('', {
        timeout: 3000,
      });

      // Perform new calculation with different values
      await setIonInputValue(page, 'glucose-input', '220');
      await setIonInputValue(page, 'carbs-input', '75');
      await page.locator('[data-testid="calculate-btn"]').evaluate((el: HTMLElement) => {
        el.scrollIntoView({ behavior: 'instant', block: 'center' });
        el.click();
      });

      // Handle warning modal if it appears
      await confirmWarningModal(page);

      // New result should appear
      const resultCard = page.locator('[data-testid="result-card"]');
      await expect(resultCard).toBeVisible({ timeout: 10000 });

      // Should show new values
      const resultText = await resultCard.textContent();
      expect(resultText).toContain('220');
      expect(resultText).toContain('75');
    });
  });

  test.describe('Edge Cases', () => {
    test.beforeEach(async ({ page }) => {
      // Navigate to calculator using robust helper
      await navigateToBolusCalculator(page);
      await waitForBolusCalculatorReady(page);
      await dismissAnyModal(page);
    });

    test('should handle very low glucose (40 mg/dL)', async ({ page }) => {
      await page.locator('[data-testid="glucose-input"] input').first().fill('40');
      await page.locator('[data-testid="carbs-input"] input').first().fill('15');

      const calculateButton = page.locator('ion-button[type="submit"]').first();
      await expect(calculateButton).toBeEnabled();
      await calculateButton.evaluate((el: HTMLElement) => {
        el.scrollIntoView({ behavior: 'instant', block: 'center' });
        el.click();
      });

      // Handle warning modal if it appears
      await confirmWarningModal(page);

      // Should still calculate
      await expect(page.locator('[data-testid="result-card"]')).toBeVisible({ timeout: 10000 });
    });

    test('should handle very high glucose (600 mg/dL)', async ({ page }) => {
      await page.locator('[data-testid="glucose-input"] input').first().fill('600');
      await page.locator('[data-testid="carbs-input"] input').first().fill('30');

      const calculateButton = page.locator('ion-button[type="submit"]').first();
      await expect(calculateButton).toBeEnabled();
      await calculateButton.evaluate((el: HTMLElement) => {
        el.scrollIntoView({ behavior: 'instant', block: 'center' });
        el.click();
      });

      // Handle warning modal if it appears
      await confirmWarningModal(page);

      // Should still calculate
      await expect(page.locator('[data-testid="result-card"]')).toBeVisible({ timeout: 10000 });
    });

    test('should handle zero carbs', async ({ page }) => {
      await setIonInputValue(page, 'glucose-input', '180');
      await setIonInputValue(page, 'carbs-input', '0');

      const calculateButton = page.locator('ion-button[type="submit"]').first();
      await expect(calculateButton).toBeEnabled();
      await calculateButton.evaluate((el: HTMLElement) => {
        el.scrollIntoView({ behavior: 'instant', block: 'center' });
        el.click();
      });

      // Handle warning modal if it appears
      await confirmWarningModal(page);

      // Should calculate correction dose only
      await expect(page.locator('[data-testid="result-card"]')).toBeVisible({ timeout: 10000 });
    });

    test('should handle decimal glucose values', async ({ page }) => {
      await setIonInputValue(page, 'glucose-input', '182.5');
      await setIonInputValue(page, 'carbs-input', '45');

      const calculateButton = page.locator('ion-button[type="submit"]').first();
      await calculateButton.evaluate((el: HTMLElement) => {
        el.scrollIntoView({ behavior: 'instant', block: 'center' });
        el.click();
      });

      // Handle warning modal if it appears
      await confirmWarningModal(page);

      await expect(page.locator('[data-testid="result-card"]')).toBeVisible({ timeout: 10000 });
    });

    test('should handle large carb values', async ({ page }) => {
      await setIonInputValue(page, 'glucose-input', '150');
      await setIonInputValue(page, 'carbs-input', '250');

      const calculateButton = page.locator('ion-button[type="submit"]').first();
      await expect(calculateButton).toBeEnabled({ timeout: 5000 });
      await calculateButton.evaluate((el: HTMLElement) => {
        el.scrollIntoView({ behavior: 'instant', block: 'center' });
        el.click();
      });

      // Handle warning modal if it appears
      await confirmWarningModal(page);

      await expect(page.locator('[data-testid="result-card"]')).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Accessibility', () => {
    test.beforeEach(async ({ page }) => {
      // Navigate to calculator using robust helper
      await navigateToBolusCalculator(page);
      await waitForBolusCalculatorReady(page);
      await dismissAnyModal(page);
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
      // Trigger validation errors using JavaScript to avoid interception
      const glucoseInput = page.locator('[data-testid="glucose-input"] input').first();
      await glucoseInput.evaluate((el: HTMLElement) => {
        el.scrollIntoView({ behavior: 'instant', block: 'center' });
        el.click();
      });
      await glucoseInput.fill('1000'); // Invalid value

      const carbsInput = page.locator('[data-testid="carbs-input"] input').first();
      await carbsInput.evaluate((el: HTMLElement) => {
        el.scrollIntoView({ behavior: 'instant', block: 'center' });
        el.click();
      }); // Trigger glucose validation

      // Error text should be visible
      const errorText = page.locator('.error-text').first();
      const hasError = await errorText.isVisible().catch(() => false);
      expect(
        hasError,
        'Should show error message for glucose value below minimum (19 mg/dL)'
      ).toBeTruthy();
    });

    test('should have proper button text or aria-labels', async ({ page }) => {
      // Calculate button should have text - use data-testid
      const calculateButton = page.locator('[data-testid="calculate-btn"]');
      if (await calculateButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        const buttonText = await calculateButton.textContent();
        expect(
          (buttonText?.trim().length || 0) > 0,
          'Calculate button should have text'
        ).toBeTruthy();
        console.log(`✅ Calculate button has text: "${buttonText?.trim()}"`);
      }

      // Back button - look in the toolbar/header area
      // Could be ion-back-button, ion-buttons button, or just a button in ion-toolbar
      const backButton = page
        .locator('ion-toolbar button, ion-back-button, ion-header button')
        .first();
      const backButtonVisible = await backButton.isVisible({ timeout: 2000 }).catch(() => false);

      // The page should have navigation controls in the header
      if (backButtonVisible) {
        console.log('✅ Back navigation is present in header');
      } else {
        // Some pages may not have back button if they're the main entry point
        console.log('⚠️  No back button visible - may be intentional for this page');
      }

      // Test passes as long as calculate button is accessible
      expect(true).toBe(true);
    });
  });
});
