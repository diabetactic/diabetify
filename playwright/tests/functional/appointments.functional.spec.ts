import { test, expect, isDockerMode } from '../../fixtures';
import { STORAGE_STATE_PATH } from '../../fixtures/storage-paths';

test.describe('Appointments Functional Tests @functional @docker', () => {
  test.describe.configure({ mode: 'serial' });
  test.skip(!isDockerMode, 'Functional tests require Docker backend');
  test.use({ storageState: STORAGE_STATE_PATH });

  test.beforeEach(async ({ authenticatedAdminApi, primaryUser }) => {
    await authenticatedAdminApi.openQueue();
    await authenticatedAdminApi.clearQueue(primaryUser.dni);
  });

  test('should display appointments page', async ({ page, pages }) => {
    await page.goto('/tabs/appointments');
    await pages.appointmentsPage.waitForHydration();

    const content = page.locator('ion-content, app-appointments');
    await expect(content.first()).toBeVisible({ timeout: 10000 });
  });

  test('should show request button when queue is clear', async ({ page, pages }) => {
    await page.goto('/tabs/appointments');
    await pages.appointmentsPage.waitForHydration();
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});

    const requestBtn = page.locator('text=/Solicitar|Request|Nueva/i');
    await expect(requestBtn.first()).toBeVisible({ timeout: 15000 });
  });

  test('should fetch appointment status via API', async ({ authenticatedApi }) => {
    const status = await authenticatedApi.getAppointmentStatus();

    expect(status).toBeDefined();
    expect(status.state).toBeDefined();
  });

  test('should submit appointment and show pending state', async ({
    page,
    pages,
    authenticatedApi,
  }) => {
    await authenticatedApi.submitAppointment();

    await page.goto('/tabs/appointments');
    await pages.appointmentsPage.waitForHydration();

    const pendingIndicator = page.locator('text=/Pendiente|Pending|En.*cola|Queue/i');
    await expect(pendingIndicator.first()).toBeVisible({ timeout: 10000 });
  });

  test('appointment state: NONE -> PENDING -> ACCEPTED', async ({
    authenticatedApi,
    authenticatedAdminApi,
  }) => {
    const initialStatus = await authenticatedApi.getAppointmentStatus();
    expect(initialStatus.state).toBe('NONE');

    const queuePlacement = await authenticatedApi.submitAppointment();

    const pendingStatus = await authenticatedApi.getAppointmentStatus();
    expect(pendingStatus.state).toBe('PENDING');

    await authenticatedAdminApi.acceptUser(queuePlacement);

    const acceptedStatus = await authenticatedApi.getAppointmentStatus();
    expect(acceptedStatus.state).toBe('ACCEPTED');
  });

  test('should reflect closed queue state via API', async ({ authenticatedAdminApi }) => {
    await authenticatedAdminApi.closeQueue();

    const status = await authenticatedAdminApi.getQueueStatus();
    expect(status.isOpen).toBe(false);

    await authenticatedAdminApi.openQueue();

    const openStatus = await authenticatedAdminApi.getQueueStatus();
    expect(openStatus.isOpen).toBe(true);
  });

  test('admin can manage queue state', async ({ authenticatedAdminApi }) => {
    await authenticatedAdminApi.openQueue();
    let status = await authenticatedAdminApi.getQueueStatus();
    expect(status.isOpen).toBe(true);

    await authenticatedAdminApi.closeQueue();
    status = await authenticatedAdminApi.getQueueStatus();
    expect(status.isOpen).toBe(false);

    await authenticatedAdminApi.openQueue();
    status = await authenticatedAdminApi.getQueueStatus();
    expect(status.isOpen).toBe(true);
  });
});
