import { test, expect, isDockerMode } from '../../fixtures';
import { STORAGE_STATE_PATH } from '../../fixtures/storage-paths';

test.describe('Bolus Calculator Functional Tests @functional @docker', () => {
  test.describe.configure({ mode: 'serial' });
  test.skip(!isDockerMode, 'Functional tests require Docker backend');
  test.use({ storageState: STORAGE_STATE_PATH });

  test('should navigate to bolus calculator', async ({ page, pages }) => {
    await page.goto('/tabs/dashboard');
    await pages.dashboardPage.waitForHydration();

    await page.goto('/bolus-calculator');
    await pages.bolusCalculatorPage.waitForHydration();

    const calculatorContent = page.locator('ion-content, app-bolus-calculator');
    await expect(calculatorContent.first()).toBeVisible({ timeout: 10000 });
  });

  test('should display calculator form fields', async ({ page, pages }) => {
    await page.goto('/bolus-calculator');
    await pages.bolusCalculatorPage.waitForHydration();

    const glucoseInput = page.locator('[data-testid="glucose-input"]');
    await expect(glucoseInput).toBeVisible({ timeout: 10000 });

    const carbsInput = page.locator('[data-testid="carbs-input"]');
    await expect(carbsInput).toBeVisible({ timeout: 10000 });
  });

  test('should show calculate button', async ({ page, pages }) => {
    await page.goto('/bolus-calculator');
    await pages.bolusCalculatorPage.waitForHydration();

    const calculateBtn = page.locator('[data-testid="calculate-btn"]');
    await expect(calculateBtn).toBeVisible({ timeout: 10000 });
  });

  test('should open food picker modal', async ({ page, pages }) => {
    await page.goto('/bolus-calculator');
    await pages.bolusCalculatorPage.waitForHydration();

    const foodPickerBtn = page.locator('[data-testid="food-picker-btn"]');
    await foodPickerBtn.click();

    const foodModal = page.locator('.food-picker-modal');
    await expect(foodModal).toHaveClass(/food-picker-modal--open/, { timeout: 5000 });
    await expect(foodModal).toHaveAttribute('aria-hidden', 'false');

    await page.keyboard.press('Escape');
    await expect(foodModal).not.toHaveClass(/food-picker-modal--open/, { timeout: 5000 });
    await expect(foodModal).toHaveAttribute('aria-hidden', 'true');
  });
});
