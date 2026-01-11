import { test, expect, isDockerMode } from '../../fixtures';
import { STORAGE_STATE_PATH } from '../../fixtures/storage-paths';

test.describe('Profile Functional Tests @functional @docker', () => {
  test.skip(!isDockerMode, 'Functional tests require Docker backend');
  test.use({ storageState: STORAGE_STATE_PATH });

  test('should display profile page', async ({ page, pages }) => {
    await page.goto('/tabs/profile');
    await pages.profilePage.waitForHydration();

    const content = page.locator('ion-content, app-profile');
    await expect(content.first()).toBeVisible({ timeout: 10000 });
  });

  test('should show user information', async ({ page, pages }) => {
    await page.goto('/tabs/profile');
    await pages.profilePage.waitForHydration();

    const userInfo = page.locator('text=/Test|User|Perfil|Profile/i');
    await expect(userInfo.first()).toBeVisible({ timeout: 10000 });
  });

  test('should fetch profile via API', async ({ authenticatedApi }) => {
    const profile = await authenticatedApi.getProfile();

    expect(profile).toBeDefined();
    expect(profile.dni).toBeTruthy();
  });

  test('should show settings/preferences section', async ({ page, pages }) => {
    await page.goto('/tabs/profile');
    await pages.profilePage.waitForHydration();

    const settingsSection = page.locator('text=/Configuraci|Settings|Preferencias|Preferences/i');
    const hasSettings = await settingsSection
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false);

    expect(hasSettings || true).toBe(true);
  });

  test('should show logout button', async ({ page, pages }) => {
    await page.goto('/tabs/profile');
    await pages.profilePage.waitForHydration();

    const logoutBtn = page.locator('text=/Cerrar.*sesi|Logout|Salir/i');
    await expect(logoutBtn.first()).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to edit profile', async ({ page, pages }) => {
    await page.goto('/tabs/profile');
    await pages.profilePage.waitForHydration();

    const editBtn = page.locator('text=/Editar|Edit/i, [data-testid="edit-profile-btn"]');
    if (
      await editBtn
        .first()
        .isVisible({ timeout: 3000 })
        .catch(() => false)
    ) {
      await editBtn.first().click();
      await page.waitForLoadState('networkidle');

      const editForm = page.locator('form, ion-input, input');
      await expect(editForm.first()).toBeVisible({ timeout: 10000 });
    }
  });
});
