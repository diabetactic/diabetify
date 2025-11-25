/**
 * Backend Integration Tests - Auth (Login Success & Failure)
 */

import {
  waitForBackendServices,
  loginTestUser,
  TEST_USER,
  SERVICE_URLS,
} from '../../helpers/backend-services.helper';

describe('Backend Integration - Auth', () => {
  beforeAll(async () => {
    // Ensure gateway and login service are healthy before testing auth flows
    await waitForBackendServices(['apiGateway', 'login']);
  }, 60000);

  it('should login test user with valid credentials', async () => {
    const token = await loginTestUser(TEST_USER);
    expect(token).toBeTruthy();
    expect(token.split('.').length).toBe(3);
  });

  it('should reject invalid credentials', async () => {
    const formData = new URLSearchParams();
    formData.append('username', TEST_USER.dni);
    formData.append('password', 'wrong-password');

    const response = await fetch(`${SERVICE_URLS.apiGateway}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: formData.toString(),
    });

    expect(response.ok).toBeFalse();
    expect([401, 403]).toContain(response.status);
  });
});
