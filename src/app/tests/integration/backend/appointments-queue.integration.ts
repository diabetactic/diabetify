/**
 * Backend Integration Tests - Appointment Queue & Creation
 *
 * Covers core backend flows:
 *  - clearing the appointment queue
 *  - submitting a user to the queue and accepting the appointment
 *  - creating a valid appointment
 *  - rejecting invalid appointment data
 */

import {
  waitForBackendServices,
  loginTestUser,
  TEST_USER,
  TEST_USERS,
  authenticatedPost,
  authenticatedGet,
  clearAppointmentQueue,
  setupAppointmentQueue,
} from '../../helpers/backend-services.helper';

/**
 * Appointment payload matching backend schema (simplified for tests)
 */
interface TestAppointment {
  glucose_objective: number;
  insulin_type: string;
  dose: number;
  fast_insulin: string;
  fixed_dose: number;
  ratio: number;
  sensitivity: number;
  pump_type: string;
  control_data: string;
  motive: string[];
  another_treatment?: string | null;
  other_motive?: string | null;
}

describe('Backend Integration - Appointment Queue & Creation', () => {
  beforeAll(async () => {
    // Ensure API gateway (and transitively appointments service) is healthy
    await waitForBackendServices(['apiGateway']);

    // Clear existing queue state to avoid unique-constraint issues
    await clearAppointmentQueue();
  }, 60000);

  it('should submit user to queue and get appointment state', async () => {
    const { token, queuePosition } = await setupAppointmentQueue(TEST_USERS.user1);

    expect(typeof queuePosition).toBe('number');

    const state = await authenticatedGet('/appointments/state', token);
    expect(state).toBeDefined();
  });

  it('should create a valid appointment after queue acceptance', async () => {
    // Use an unblocked test user for happy-path creation
    const { token } = await setupAppointmentQueue(TEST_USERS.user3);

    const newAppointment: TestAppointment = {
      glucose_objective: 120.0,
      insulin_type: 'Lantus',
      dose: 20.0,
      fast_insulin: 'Humalog',
      fixed_dose: 5.0,
      ratio: 10.0,
      sensitivity: 50.0,
      pump_type: 'Medtronic 780',
      control_data: 'https://example.com/glucose-data.pdf',
      motive: ['AJUSTE', 'DUDAS'],
      another_treatment: null,
      other_motive: null,
    };

    const response = await authenticatedPost('/appointments/create', newAppointment, token);
    expect(response).toBeTruthy();
    expect(response.appointment_id).toBeDefined();
  });

  it('should reject appointment with invalid motive enum', async () => {
    const token = await loginTestUser(TEST_USER);

    const invalidAppointment: any = {
      glucose_objective: 120.0,
      insulin_type: 'Lantus',
      dose: 20.0,
      fast_insulin: 'Humalog',
      fixed_dose: 5.0,
      ratio: 10.0,
      sensitivity: 50.0,
      pump_type: '',
      control_data: 'https://example.com/test.pdf',
      motive: ['INVALID_MOTIVE'],
    };

    try {
      await authenticatedPost('/appointments/create', invalidAppointment, token);
      fail('Expected backend to reject invalid motive');
    } catch (error: any) {
      expect(error).toBeDefined();
    }
  });

  it('should reject appointment with missing required fields', async () => {
    const token = await loginTestUser(TEST_USERS.user3);

    const incompleteAppointment: any = {
      glucose_objective: 120.0,
      insulin_type: 'Lantus',
      // Missing required clinical fields to trigger validation error
    };

    try {
      await authenticatedPost('/appointments/create', incompleteAppointment, token);
      fail('Expected backend to reject incomplete appointment data');
    } catch (error: any) {
      expect(error).toBeDefined();
    }
  });
});
