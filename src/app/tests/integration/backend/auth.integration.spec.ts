/**
 * Backend Integration Tests - Auth (Login Success & Failure)
 */

import {
  waitForBackendServices,
  loginTestUser,
  TEST_USER,
  SERVICE_URLS,
  isBackendAvailable,
} from '../../helpers/backend-services.helper';

// Check backend availability before running any tests
const runTests = async () => {
  const backendAvailable = await isBackendAvailable();
  if (!backendAvailable) {
    console.log('⏭️  Backend not available - skipping auth integration tests');
    return false;
  }
  return true;
};

// Use conditional describe to skip entire suite if backend unavailable
let shouldRun = false;

beforeAll(async () => {
  shouldRun = await runTests();
}, 10000);

// Helper to create conditional tests
const conditionalIt = (name: string, fn: () => Promise<void>, timeout?: number) => {
  it(
    name,
    async () => {
      if (!shouldRun) {
        console.log(`  ⏭️  Skipping: ${name}`);
        return;
      }
      await fn();
    },
    timeout
  );
};

describe('Backend Integration - Auth', () => {
  beforeAll(async () => {
    if (!shouldRun) {
      return;
    }
    // Ensure gateway and login service are healthy before testing auth flows
    await waitForBackendServices(['apiGateway', 'login']);
  }, 60000);

  conditionalIt('should login test user with valid credentials', async () => {
    const token = await loginTestUser(TEST_USER);
    expect(token).toBeTruthy();
    expect(token.split('.').length).toBe(3);
  });

  conditionalIt('should reject invalid credentials', async () => {
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
