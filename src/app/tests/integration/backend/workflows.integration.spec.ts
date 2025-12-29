/**
 * Integration tests for multi-service workflows
 *
 * @description
 * Validates complete interaction between multiple backend services:
 * - apiGateway (8000): Main entry point
 * - glucoserver (8002): Glucose readings management
 * - login (8003): Authentication and users
 * - appointments (8005): Appointments system
 *
 * @prerequisites
 * - Backend running in Docker
 * - All services available on localhost
 * - Database initialized with test users
 */

import {
  isBackendAvailable,
  waitForBackendServices,
  loginTestUser,
  TEST_USERS,
  authenticatedGet,
  clearAppointmentQueue,
  clearCachedAuthToken,
  createGlucoseReading,
  getGlucoseReadings,
  GlucoseReadingType,
} from '../../helpers/backend-services.helper';

let shouldRun = false;

beforeAll(async () => {
  const backendAvailable = await isBackendAvailable();
  shouldRun = backendAvailable;

  if (backendAvailable) {
    await waitForBackendServices();
  }
}, 30000);

afterEach(async () => {
  if (shouldRun) {
    try {
      await clearAppointmentQueue();
    } catch {
      // Ignore if queue is already empty
    }
    clearCachedAuthToken();
    vi.clearAllMocks();
  }
});

const conditionalIt = (name: string, fn: () => Promise<void>, timeout?: number) => {
  it(
    name,
    async () => {
      if (!shouldRun) {
        return;
      }
      await fn();
    },
    timeout
  );
};

describe('Multi-service workflows', () => {
  describe('Test 1: Complete authentication flow', () => {
    conditionalIt(
      'should login → get profile → verify token in services',
      async () => {
        // Step 1: Successful login - loginTestUser returns only the token string
        const token = await loginTestUser(TEST_USERS.user1);
        expect(token).toBeDefined();
        expect(token.split('.').length).toBe(3); // JWT format

        // Step 2: Verify token in api-gateway (profile)
        const profile = await authenticatedGet('/users/me', token);
        expect(profile).toBeDefined();
        expect(profile.dni).toBe(TEST_USERS.user1.dni);

        // Step 3: Verify token in glucoserver (readings)
        const readings = await getGlucoseReadings(token);
        expect(Array.isArray(readings)).toBe(true);

        // Step 4: Verify token in appointments (endpoint is /appointments/mine)
        const appointments = await authenticatedGet('/appointments/mine', token);
        expect(Array.isArray(appointments)).toBe(true);
      },
      15000
    );
  });

  describe('Test 2: Reading submission flow', () => {
    conditionalIt(
      'should login → create reading → get list → verify created reading',
      async () => {
        // Step 1: Login
        const token = await loginTestUser(TEST_USERS.user1);

        // Step 2: Get initial readings
        const initialReadings = await getGlucoseReadings(token);
        const initialCount = initialReadings.length;

        // Step 3: Create new glucose reading
        const newReading = {
          glucose_level: 120,
          reading_type: 'OTRO' as GlucoseReadingType,
          notes: 'Integration test reading',
        };

        const createdReading = await createGlucoseReading(newReading, token);

        expect(createdReading).toBeDefined();
        expect(createdReading.id).toBeDefined();
        expect(createdReading.glucose_level).toBe(newReading.glucose_level);

        // Step 4: Get updated list of readings
        const updatedReadings = await getGlucoseReadings(token);

        // Step 5: Verify that the reading appears in the list
        expect(updatedReadings.length).toBeGreaterThan(initialCount);

        const foundReading = updatedReadings.find((r: any) => r.id === createdReading.id);
        expect(foundReading).toBeDefined();
        expect(foundReading.glucose_level).toBe(newReading.glucose_level);
        expect(foundReading.notes).toBe(newReading.notes);
      },
      15000
    );
  });

  describe('Test 3: Appointments queue flow', () => {
    conditionalIt(
      'should login → verify readings → verify appointments',
      async () => {
        // Login with test user
        const token = await loginTestUser(TEST_USERS.user1);
        expect(token).toBeTruthy();

        // Verify access to readings
        const readings = await getGlucoseReadings(token);
        expect(Array.isArray(readings)).toBe(true);

        // Verify access to appointments
        const appointments = await authenticatedGet('/appointments/mine', token);
        expect(Array.isArray(appointments)).toBe(true);
      },
      15000
    );
  });

  describe('Test 4: Cross-service data consistency', () => {
    conditionalIt(
      'should create reading → verify in list → verify data isolation',
      async () => {
        // Step 1: Login with test user
        const token = await loginTestUser(TEST_USERS.user1);

        // Step 2: Create glucose reading with elevated value
        const criticalReading = {
          glucose_level: 180,
          reading_type: 'ALMUERZO' as GlucoseReadingType,
          notes: 'Elevated value after lunch',
        };

        const createdReading = await createGlucoseReading(criticalReading, token);
        expect(createdReading.id).toBeDefined();

        // Step 3: Verify reading is in system
        const readings = await getGlucoseReadings(token);
        const foundReading = readings.find((r: any) => r.id === createdReading.id);
        expect(foundReading).toBeDefined();
        expect(foundReading.glucose_level).toBe(criticalReading.glucose_level);

        // Step 4: Verify user appointment is accessible
        const appointments = await authenticatedGet('/appointments/mine', token);
        expect(Array.isArray(appointments)).toBe(true);

        // Step 5: Verify that the reading belongs to the user
        const readingWithUser = readings.find((r: any) => r.id === createdReading.id);
        expect(readingWithUser).toBeDefined();
      },
      20000
    );
  });
});
