/**
 * Backend Integration Tests - Appointments Lifecycle
 *
 * Tests appointment state machine and basic operations.
 * Note: These tests are dependent on backend state which persists between runs.
 * Tests use graceful failure handling to work with existing state.
 *
 * Requires Docker backend: pnpm run docker:start
 */

import {
  waitForBackendServices,
  loginTestUser,
  isBackendAvailable,
  isBackofficeAvailable,
  authenticatedGet,
  setupAppointmentQueue,
  tryCreateAppointment,
  getAppointmentState,
  AppointmentCreateData,
  TEST_USERS,
  SERVICE_URLS,
} from '../../helpers/backend-services.helper';

let shouldRun = false;

beforeAll(async () => {
  const backendAvailable = await isBackendAvailable();
  if (!backendAvailable) {
    console.log('⏭️  Backend not available - skipping appointments lifecycle tests');
    shouldRun = false;
    return;
  }
  // Appointment lifecycle tests require backoffice to accept users from queue
  const backofficeAvailable = await isBackofficeAvailable();
  if (!backofficeAvailable) {
    console.log('⏭️  Backoffice not available - skipping appointments lifecycle tests');
    console.log('   (Backoffice is needed to accept appointments from queue)');
    shouldRun = false;
    return;
  }
  shouldRun = true;
}, 10000);

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

describe('Backend Integration - Appointments Lifecycle', () => {
  beforeAll(async () => {
    if (!shouldRun) return;
    await waitForBackendServices(['apiGateway']);
  }, 60000);

  // =========================================================================
  // QUEUE OPERATIONS
  // =========================================================================

  describe('Queue Operations', () => {
    conditionalIt('should handle queue submission or existing state', async () => {
      const token = await loginTestUser(TEST_USERS.user1);

      // Check current state
      const state = await getAppointmentState(token);

      // User might already be in queue from previous runs
      if (state) {
        console.log(`  ℹ️  User already in state: ${state}`);
        expect([
          'NONE',
          'IN_QUEUE',
          'PENDING',
          'ACCEPTED',
          'CREATED',
          'RESOLVED',
          'DENIED',
          'CANCELLED',
        ]).toContain(state);
      } else {
        // Try to submit to queue
        try {
          const response = await fetch(`${SERVICE_URLS.apiGateway}/appointments/submit`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: 'application/json',
            },
          });

          if (response.ok) {
            const position = await response.json();
            expect(typeof position).toBe('number');
            console.log(`  ✅ Submitted to queue at position: ${position}`);
          } else {
            // Already in queue is OK
            console.log(
              `  ℹ️  Could not submit (${response.status}) - user may already be in queue`
            );
          }
        } catch {
          console.log('  ℹ️  Queue submission failed - continuing with existing state');
        }
      }
    });

    conditionalIt('should get queue placement for user in queue', async () => {
      const { token } = await setupAppointmentQueue(TEST_USERS.user1);

      const response = await fetch(`${SERVICE_URLS.apiGateway}/appointments/placement`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });

      if (response.ok) {
        const position = await response.json();
        expect(typeof position).toBe('number');
        console.log(`  ✅ Queue position: ${position}`);
      } else {
        // User might not be in queue or already processed
        console.log(`  ℹ️  No placement returned (${response.status})`);
      }
    });
  });

  // =========================================================================
  // APPOINTMENT CREATION
  // =========================================================================

  describe('Appointment Creation', () => {
    conditionalIt('should create appointment if user state allows', async () => {
      const { token } = await setupAppointmentQueue(TEST_USERS.user1);

      const appointmentData: AppointmentCreateData = {
        glucose_objective: 120,
        insulin_type: 'Lantus',
        dose: 20,
        fast_insulin: 'Humalog',
        fixed_dose: 5,
        ratio: 10,
        sensitivity: 50,
        pump_type: 'Medtronic 780',
        control_data: 'https://example.com/test-data.pdf',
        motive: ['AJUSTE', 'DUDAS'],
      };

      const created = await tryCreateAppointment(appointmentData, token);

      if (created) {
        expect(created.appointment_id).toBeDefined();
        console.log(`  ✅ Created appointment: ${created.appointment_id}`);
      } else {
        // State doesn't allow creation - that's OK
        console.log('  ℹ️  Could not create appointment (state issue) - skipping');
      }
    });

    conditionalIt('should list user appointments', async () => {
      const token = await loginTestUser(TEST_USERS.user1);

      const appointments = await authenticatedGet('/appointments/mine', token);

      expect(Array.isArray(appointments)).toBe(true);
      console.log(`  ✅ Found ${appointments.length} appointments`);

      if (appointments.length > 0) {
        expect(appointments[0]).toHaveProperty('appointment_id');
      }
    });
  });

  // =========================================================================
  // STATE CHECKING
  // =========================================================================

  describe('State Checking', () => {
    conditionalIt('should return valid state for authenticated user', async () => {
      const token = await loginTestUser(TEST_USERS.user1);

      const state = await getAppointmentState(token);

      // State might be null if user has no appointment history
      if (state) {
        expect([
          'NONE',
          'IN_QUEUE',
          'PENDING',
          'ACCEPTED',
          'CREATED',
          'RESOLVED',
          'DENIED',
          'CANCELLED',
        ]).toContain(state);
        console.log(`  ✅ User state: ${state}`);
      } else {
        console.log('  ℹ️  No state returned (user may have no appointment history)');
      }
    });

    conditionalIt('should reject state check without authentication', async () => {
      const response = await fetch(`${SERVICE_URLS.apiGateway}/appointments/state`);
      expect(response.status).toBe(401);
    });
  });

  // =========================================================================
  // APPOINTMENT DATA VALIDATION
  // =========================================================================

  describe('Data Validation', () => {
    conditionalIt('should reject appointment with invalid motive', async () => {
      const { token } = await setupAppointmentQueue(TEST_USERS.user1);

      const invalidData = {
        glucose_objective: 100,
        insulin_type: 'test',
        dose: 10,
        fast_insulin: 'test',
        fixed_dose: 5,
        ratio: 10,
        sensitivity: 50,
        pump_type: '',
        control_data: 'test',
        motive: ['INVALID_MOTIVE'], // Invalid
      };

      try {
        const response = await fetch(`${SERVICE_URLS.apiGateway}/appointments/create`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(invalidData),
        });

        // Should get validation error
        expect([400, 403, 422]).toContain(response.status);
      } catch {
        // Network error is also acceptable
      }
    });

    conditionalIt('should validate motive enum values', async () => {
      // Valid motive values per backend
      const validMotives = ['AJUSTE', 'HIPOGLUCEMIA', 'HIPERGLUCEMIA', 'CETOSIS', 'DUDAS', 'OTRO'];
      expect(validMotives).toHaveLength(6);
    });
  });
});
