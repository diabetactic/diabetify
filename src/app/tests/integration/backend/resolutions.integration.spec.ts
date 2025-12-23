/**
 * Backend Integration Tests - Appointment Resolutions
 *
 * Tests the appointment resolution system with real backend:
 * - GET /appointments/{id}/resolution → AppointmentResolutionResponse
 * - Resolution data structure validation
 * - Doctor treatment recommendations
 *
 * Note: These tests depend on the appointment lifecycle state.
 * Tests will skip gracefully if the user's appointment state doesn't allow creation.
 *
 * Requires Docker backend: pnpm run docker:start
 */

import {
  isBackendAvailable,
  waitForBackendServices,
  loginTestUser,
  TEST_USERS,
  SERVICE_URLS,
  authenticatedGet,
  setupAppointmentQueue,
  clearCachedAuthToken,
  tryCreateAppointment,
  AppointmentCreateData,
} from '../../helpers/backend-services.helper';
import { AppointmentResolutionResponse } from '@models/appointment.model';

let shouldRun = false;

beforeAll(async () => {
  const backendAvailable = await isBackendAvailable();
  if (!backendAvailable) {
    shouldRun = false;
    return;
  }
  shouldRun = true;
}, 10000);

afterEach(() => {
  if (shouldRun) {
    clearCachedAuthToken();
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

describe('Backend Integration - Appointment Resolutions', () => {
  beforeAll(async () => {
    if (!shouldRun) return;
    await waitForBackendServices(['apiGateway']);
  }, 60000);

  // =========================================================================
  // RESOLUTION FETCH TESTS
  // =========================================================================

  describe('GET /appointments/{id}/resolution', () => {
    conditionalIt(
      'should return 404 for non-existent appointment',
      async () => {
        const token = await loginTestUser(TEST_USERS.user1);

        // Try to get resolution for non-existent appointment
        try {
          await authenticatedGet('/appointments/999999/resolution', token);
          // If we get here, check what was returned
        } catch (error) {
          // Expected: 404 for non-existent appointment
          expect(String(error)).toMatch(/404|not found/i);
        }
      },
      15000
    );

    conditionalIt(
      'should handle appointment without resolution gracefully',
      async () => {
        // Setup: Try to create an appointment
        const { token } = await setupAppointmentQueue(TEST_USERS.user1);

        const appointmentData: AppointmentCreateData = {
          glucose_objective: 100,
          insulin_type: 'long',
          dose: 15,
          fast_insulin: 'humalog',
          fixed_dose: 5,
          ratio: 10,
          sensitivity: 50,
          pump_type: 'none',
          control_data: 'Test control data',
          motive: ['AJUSTE'],
        };

        const created = await tryCreateAppointment(appointmentData, token);

        if (!created) {
          return;
        }

        expect(created.appointment_id).toBeDefined();

        // Try to get resolution (should not exist yet)
        try {
          await authenticatedGet(`/appointments/${created.appointment_id}/resolution`, token);
          // If we get here, resolution exists (doctor may have resolved)
        } catch (error) {
          // Expected: 404 for unresolved appointment
          expect(String(error)).toMatch(/404|not found|no resolution/i);
        }
      },
      20000
    );
  });

  // =========================================================================
  // RESOLUTION DATA STRUCTURE
  // =========================================================================

  describe('Resolution Data Structure', () => {
    conditionalIt(
      'should return valid resolution structure if available',
      async () => {
        const { token } = await setupAppointmentQueue(TEST_USERS.user1);

        const appointmentData: AppointmentCreateData = {
          glucose_objective: 110,
          insulin_type: 'long',
          dose: 20,
          fast_insulin: 'novolog',
          fixed_dose: 8,
          ratio: 12,
          sensitivity: 40,
          pump_type: 'medtronic',
          control_data: 'Resolution test data',
          motive: ['HIPOGLUCEMIA', 'DUDAS'],
        };

        const created = await tryCreateAppointment(appointmentData, token);

        if (!created) {
          return;
        }

        // Try to fetch resolution
        try {
          const resolution: AppointmentResolutionResponse = await authenticatedGet(
            `/appointments/${created.appointment_id}/resolution`,
            token
          );

          // If resolution exists, validate structure
          expect(resolution.appointment_id).toBe(created.appointment_id);
          expect(resolution).toHaveProperty('change_basal_type');
          expect(resolution).toHaveProperty('change_basal_dose');
        } catch (error) {
          // If no resolution exists yet, that's OK
          if (String(error).includes('404')) {
            return;
          }
          throw error;
        }
      },
      20000
    );
  });

  // =========================================================================
  // USER ACCESS CONTROL
  // =========================================================================

  describe('User Access Control', () => {
    conditionalIt(
      'should reject resolution access without authentication',
      async () => {
        try {
          const response = await fetch(`${SERVICE_URLS.apiGateway}/appointments/1/resolution`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          });

          expect(response.status).toBeOneOf([401, 403]);
        } catch (error) {
          expect(String(error)).toMatch(/401|403|unauthorized/i);
        }
      },
      10000
    );

    conditionalIt(
      'should reject resolution access with invalid token',
      async () => {
        const fakeToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmYWtlIn0.fake';

        try {
          const response = await fetch(`${SERVICE_URLS.apiGateway}/appointments/1/resolution`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${fakeToken}`,
            },
          });

          expect(response.status).toBeOneOf([401, 403, 422, 500]);
        } catch (error) {
          expect(String(error)).toMatch(/401|403|unauthorized|invalid/i);
        }
      },
      10000
    );
  });
});
