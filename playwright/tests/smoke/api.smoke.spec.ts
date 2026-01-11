import { test, expect, isDockerMode } from '../../fixtures';

test.describe('API Health Smoke Tests @smoke @docker', () => {
  test.skip(!isDockerMode, 'API smoke tests require Docker backend');

  test('should authenticate via API', async ({ api, primaryUser }) => {
    const token = await api.login(primaryUser);
    expect(token).toBeTruthy();
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(10);
  });

  test('should fetch user profile', async ({ authenticatedApi }) => {
    const profile = await authenticatedApi.getProfile();

    expect(profile).toBeDefined();
    expect(profile.dni).toBeTruthy();
  });

  test('should fetch readings list', async ({ authenticatedApi }) => {
    const readings = await authenticatedApi.getReadings();

    expect(Array.isArray(readings)).toBe(true);
  });

  test('should fetch appointment status', async ({ authenticatedApi }) => {
    const status = await authenticatedApi.getAppointmentStatus();

    expect(status).toBeDefined();
    expect(status.state).toBeDefined();
  });

  test('admin should authenticate', async ({ adminApi }) => {
    const token = await adminApi.login();

    expect(token).toBeTruthy();
    expect(typeof token).toBe('string');
  });

  test('admin should fetch queue status', async ({ authenticatedAdminApi }) => {
    const status = await authenticatedAdminApi.getQueueStatus();

    expect(status).toBeDefined();
    expect(typeof status.isOpen).toBe('boolean');
    expect(typeof status.size).toBe('number');
    expect(Array.isArray(status.pending)).toBe(true);
  });
});
