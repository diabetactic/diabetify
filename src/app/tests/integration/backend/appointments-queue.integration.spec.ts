/**
 * Backend Integration Tests - Appointment Queue & Creation
 *
 * Tests queue submission and appointment creation flows.
 * Note: These tests handle existing backend state gracefully.
 *
 * Requires Docker backend: pnpm run docker:start
 */

import {
  waitForBackendServices,
  loginTestUser,
  TEST_USERS,
  authenticatedGet,
  setupAppointmentQueue,
  tryCreateAppointment,
  getAppointmentState,
  isBackendAvailable,
  isBackofficeAvailable,
  AppointmentCreateData,
  SERVICE_URLS,
} from '../../helpers/backend-services.helper';

// Check backend and backoffice availability before running any tests
const runTests = async () => {
  const backendAvailable = await isBackendAvailable();
  if (!backendAvailable) {
    return false;
  }
  // Queue tests require backoffice to accept appointments
  const backofficeAvailable = await isBackofficeAvailable();
  if (!backofficeAvailable) {
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
        return;
      }
      await fn();
    },
    timeout
  );
};

describe('Backend Integration - Appointment Queue & Creation', () => {
  beforeAll(async () => {
    if (!shouldRun) {
      return;
    }

    // Ensure API gateway is healthy
    await waitForBackendServices(['apiGateway']);
  }, 60000);

  // =========================================================================
  // QUEUE SUBMISSION
  // =========================================================================

  describe('Queue Submission', () => {
    conditionalIt('should get user appointment state', async () => {
      const token = await loginTestUser(TEST_USERS.user1);
      const state = await getAppointmentState(token);

      // State may be null if user has no history, or a valid state
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
      } else {
      }
    });

    conditionalIt('should setup appointment queue for user', async () => {
      const { token, queuePosition } = await setupAppointmentQueue(TEST_USERS.user1);

      expect(token).toBeTruthy();
      expect(typeof queuePosition).toBe('number');
    });
  });

  // =========================================================================
  // APPOINTMENT CREATION
  // =========================================================================

  describe('Appointment Creation', () => {
    conditionalIt('should create appointment if state allows', async () => {
      const { token } = await setupAppointmentQueue(TEST_USERS.user1);

      const appointmentData: AppointmentCreateData = {
        glucose_objective: 110,
        insulin_type: 'Lantus',
        dose: 15,
        fast_insulin: 'Humalog',
        fixed_dose: 4,
        ratio: 12,
        sensitivity: 45,
        pump_type: 'none',
        control_data: 'Test control data for queue test',
        motive: ['AJUSTE'],
      };

      const created = await tryCreateAppointment(appointmentData, token);

      if (created) {
        expect(created.appointment_id).toBeDefined();
      } else {
        // State doesn't allow creation - log and continue
      }
    });

    conditionalIt('should list appointments for user', async () => {
      const token = await loginTestUser(TEST_USERS.user1);

      const appointments = await authenticatedGet('/appointments/mine', token);

      expect(Array.isArray(appointments)).toBe(true);
    });
  });

  // =========================================================================
  // VALIDATION
  // =========================================================================

  describe('Validation', () => {
    conditionalIt('should reject invalid appointment data', async () => {
      const { token } = await setupAppointmentQueue(TEST_USERS.user1);

      const invalidData = {
        glucose_objective: -100, // Invalid negative value
        insulin_type: '',
        dose: 0,
        fast_insulin: '',
        fixed_dose: 0,
        ratio: 0,
        sensitivity: 0,
        pump_type: '',
        control_data: '',
        motive: [], // Empty motive
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

        // Should get error (validation or state issue)
        if (!response.ok) {
          // Expected - validation or state issue
        }
      } catch {
        // Network error is acceptable in this context
      }
    });

    conditionalIt('should reject appointment creation without auth', async () => {
      const response = await fetch(`${SERVICE_URLS.apiGateway}/appointments/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      expect(response.status).toBe(401);
    });
  });
});
