import { test, expect, isDockerMode } from '../../fixtures';
import { STORAGE_STATE_PATH } from '../../fixtures/storage-paths';

test.describe('Readings Functional Tests @functional @docker', () => {
  test.describe.configure({ mode: 'serial' });
  test.skip(!isDockerMode, 'Functional tests require Docker backend');
  test.use({ storageState: STORAGE_STATE_PATH });

  test('should display readings page content', async ({ page, pages }) => {
    await page.goto('/tabs/readings');
    await pages.readingsPage.waitForHydration();

    const pageContent = page.locator(
      '[data-testid="readings-list"], [data-testid="readings-empty"], h2:text-matches("No Hay Lecturas|No Readings", "i")'
    );
    await expect(pageContent.first()).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to add reading page', async ({ page, pages }) => {
    await page.goto('/tabs/readings');
    await pages.readingsPage.waitForHydration();

    await page.goto('/add-reading');
    await pages.addReadingPage.waitForHydration();

    const glucoseInput = page.locator('[data-testid="glucose-input"], input[type="number"]');
    await expect(glucoseInput.first()).toBeVisible({ timeout: 10000 });
  });

  test('should create new reading via UI', async ({ page, pages }) => {
    const testValue = 142;

    await page.goto('/add-reading');
    await pages.addReadingPage.waitForHydration();

    const valueInput = page.locator('[data-testid="glucose-value-input"] input, ion-input input');
    await valueInput.first().fill(testValue.toString());
    await valueInput.first().dispatchEvent('change');
    await valueInput.first().dispatchEvent('input');

    await page.waitForTimeout(500);

    const submitBtn = page.locator('[data-testid="add-reading-save-btn"]');
    await expect(submitBtn).toBeEnabled({ timeout: 5000 });
    await submitBtn.click();

    await page.waitForURL(/\/tabs\/readings/, { timeout: 15000 });
    await pages.readingsPage.waitForHydration();

    const readingWithValue = page.locator('app-reading-item').filter({
      hasText: new RegExp(`${testValue}`),
    });
    await expect(readingWithValue.first()).toBeVisible({ timeout: 10000 });
  });

  test('should create and fetch reading via API', async ({ authenticatedApi }) => {
    const testValue = 139;
    await authenticatedApi.createReading(testValue, 'DESAYUNO', '__E2E_FUNCTIONAL__ API created');

    const readings = await authenticatedApi.getReadings();
    const createdReading = readings.find(r => r.glucose_level === testValue);

    expect(createdReading).toBeDefined();
    expect(createdReading!.glucose_level).toBe(testValue);
  });

  test('should fetch readings via API', async ({ authenticatedApi }) => {
    const readings = await authenticatedApi.getReadings();

    expect(Array.isArray(readings)).toBe(true);
  });

  test('should show reading types dropdown', async ({ page, pages }) => {
    await page.goto('/add-reading');
    await pages.addReadingPage.waitForHydration();

    const typeSelector = page.locator('[data-testid="reading-type-select"], ion-select, select');
    await expect(typeSelector.first()).toBeVisible({ timeout: 10000 });
  });
});
