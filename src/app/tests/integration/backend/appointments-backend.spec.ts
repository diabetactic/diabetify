/**
 * Appointments Backend Integration Tests
 *
 * Tests appointment flow with real backend services including:
 * - Creating new appointments via API Gateway
 * - Fetching user appointments
 * - Appointment submission to queue
 * - Appointment state tracking
 *
 * @requires Backend services running (api-gateway on port 8004)
 */

import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HttpClient } from '@angular/common/http';

import {
  waitForBackendServices,
  loginTestUser,
  SERVICE_URLS,
  TEST_USER,
  TEST_USERS,
  authenticatedPost,
  authenticatedGet,
  clearCachedAuthToken,
  setupAppointmentQueue,
} from '../../helpers/backend-services.helper';

import { AppointmentService } from '../../../core/services/appointment.service';
import { ApiGatewayService } from '../../../core/services/api-gateway.service';
import { ReadingsService } from '../../../core/services/readings.service';
import { TranslationService } from '../../../core/services/translation.service';

/**
 * Test appointment data structure matching backend schema
 * Based on appointments service API and planilla.pdf form
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
  motive: string[]; // MUST be array of enum values
  another_treatment?: string | null;
  other_motive?: string | null;
}

describe('Appointments Backend Integration', () => {
  let httpClient: HttpClient;
  let httpMock: HttpTestingController;
  let token: string;

  beforeAll(async () => {
    console.log('🚀 Starting Appointments Backend Integration Tests');

    try {
      // Wait for backend services to be healthy (api-gateway includes appointments)
      await waitForBackendServices(['apiGateway']);

      // Clear appointment queue to avoid unique constraint violations
      console.log('🧹 Clearing appointment queue...');
      await fetch(`${SERVICE_URLS.appointments}/queue/`, { method: 'DELETE' });
      console.log('✅ Appointment queue cleared');

      // Login test user and get auth token
      token = await loginTestUser(TEST_USER);

      console.log('✅ Backend services ready and authenticated');
    } catch (error) {
      console.error('❌ Failed to setup backend integration tests:', error);
      throw error;
    }
  }, 60000); // 60 second timeout for service startup

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AppointmentService, ApiGatewayService, ReadingsService, TranslationService],
    }).compileComponents();

    httpClient = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    // Verify no outstanding HTTP requests
    httpMock.verify();
  });

  afterAll(() => {
    clearCachedAuthToken();
    console.log('✅ Appointments Backend Integration Tests Complete');
  });

  describe('Create Appointment', () => {
    it('should create new appointment via API Gateway (POST /appointments/create)', async () => {
      console.log('🧪 Testing appointment creation via API Gateway...');

      // Setup: Submit to queue and get accepted
      const { token } = await setupAppointmentQueue(TEST_USERS.user1);

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
      console.log('✅ Appointment created:', response);

      expect(response).toBeTruthy('Appointment creation should succeed');
      expect(response.appointment_id).toBeDefined('Response should include appointment ID');
      console.log('✅ Appointment creation test passed');
    });

    it('should create appointment with minimal data', async () => {
      console.log('🧪 Testing minimal appointment creation...');

      // Setup: Submit to queue and get accepted
      const { token } = await setupAppointmentQueue(TEST_USERS.user2);

      const minimalAppointment: TestAppointment = {
        glucose_objective: 110.0,
        insulin_type: 'Tresiba',
        dose: 15.0,
        fast_insulin: 'NovoRapid',
        fixed_dose: 4.0,
        ratio: 12.0,
        sensitivity: 45.0,
        pump_type: '',
        control_data: 'https://example.com/control.pdf',
        motive: ['HIPERGLUCEMIA'],
      };

      const response = await authenticatedPost('/appointments/create', minimalAppointment, token);
      expect(response).toBeDefined();
      expect(response.appointment_id).toBeDefined();
      console.log('✅ Minimal appointment created');
    });
  });

  describe('Fetch Appointments', () => {
    it('should fetch user appointments (GET /appointments/mine)', async () => {
      console.log('🧪 Testing appointment fetch via API Gateway...');

      const response = await authenticatedGet('/appointments/mine', token);
      console.log('✅ Appointments fetched:', response);

      expect(Array.isArray(response)).toBe(true, 'Response should be an array');
      console.log('✅ Appointment fetch test passed');
    });

    it('should return array of appointments for authenticated user', async () => {
      const response = await authenticatedGet('/appointments/mine', token);
      expect(Array.isArray(response)).toBe(true);
      // Response may be empty or contain appointments
    });
  });

  describe('Clinical Form Data', () => {
    it('should include clinical form data with JSONB field', async () => {
      // Setup: Submit to queue and get accepted
      const { token } = await setupAppointmentQueue(TEST_USERS.user3);

      const appointmentWithForm: TestAppointment = {
        glucose_objective: 130.0,
        insulin_type: 'Levemir',
        dose: 18.0,
        fast_insulin: 'Apidra',
        fixed_dose: 6.0,
        ratio: 8.0,
        sensitivity: 40.0,
        pump_type: 'Medtronic 640',
        control_data: 'https://example.com/detailed-data.pdf',
        motive: ['CETOSIS', 'HIPERGLUCEMIA'],
        another_treatment: 'Metformin 500mg',
        other_motive: null,
      };

      const response = await authenticatedPost('/appointments/create', appointmentWithForm, token);

      expect(response).toBeDefined();
      expect(response.appointment_id).toBeDefined();
      console.log('✅ Appointment with additional treatment created');
    });
  });

  describe('Appointment State', () => {
    it('should get appointment state for user (GET /appointments/state)', async () => {
      console.log('🧪 Testing appointment state fetch...');

      const state = await authenticatedGet('/appointments/state', token);
      console.log('✅ Appointment state:', state);

      expect(state).toBeDefined();
      // State should be one of: no_appointment, pending, accepted, or rejected
      console.log('✅ State fetch test passed');
    });

    it('should submit appointment to queue (POST /appointments/submit)', async () => {
      console.log('🧪 Testing appointment submission to queue...');

      // Login test user (don't use setupAppointmentQueue as this test IS testing the queue submission)
      const token = await loginTestUser(TEST_USERS.user4);

      // Submit to queue - this is what we're testing
      const queueResponse = await authenticatedPost('/appointments/submit', {}, token);
      console.log('✅ Submitted to queue:', queueResponse);

      expect(queueResponse).toBeDefined();
      expect(typeof queueResponse).toBe(
        'number',
        'Queue response should be a number (queue position)'
      );
      console.log('✅ Queue submission test passed');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should reject appointment with invalid motive', async () => {
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
        motive: ['INVALID_MOTIVE'], // Invalid enum value
      };

      try {
        await authenticatedPost('/appointments/create', invalidAppointment, token);
        fail('Should have rejected invalid motive');
      } catch (error: any) {
        expect(error).toBeDefined();
        console.log('✅ Invalid motive properly rejected');
      }
    });

    it('should reject appointment with missing required fields', async () => {
      const incompleteAppointment: any = {
        glucose_objective: 120.0,
        insulin_type: 'Lantus',
        // Missing dose, fast_insulin, fixed_dose, ratio, sensitivity, pump_type, control_data, motive
      };

      try {
        await authenticatedPost('/appointments/create', incompleteAppointment, token);
        fail('Should have rejected incomplete data');
      } catch (error: any) {
        expect(error).toBeDefined();
        console.log('✅ Missing fields properly rejected');
      }
    });

    it('should handle complete appointment data', async () => {
      // Setup: Submit to queue and get accepted
      const { token } = await setupAppointmentQueue(TEST_USERS.user5);

      const completeAppointment: TestAppointment = {
        glucose_objective: 115.0,
        insulin_type: 'Toujeo',
        dose: 25.0,
        fast_insulin: 'Fiasp',
        fixed_dose: 7.0,
        ratio: 9.0,
        sensitivity: 55.0,
        pump_type: 'Omnipod',
        control_data: 'https://example.com/complete-data.pdf',
        motive: ['HIPOGLUCEMIA', 'AJUSTE'],
        another_treatment: 'GLP-1 agonist',
        other_motive: null,
      };

      const response = await authenticatedPost('/appointments/create', completeAppointment, token);
      expect(response).toBeDefined();
      expect(response.appointment_id).toBeDefined();
      console.log('✅ Complete appointment created');
    });

    it('should handle appointment with other motive', async () => {
      // Setup: Submit to queue and get accepted
      const { token } = await setupAppointmentQueue(TEST_USERS.user6);

      const otherMotiveAppointment: TestAppointment = {
        glucose_objective: 135.0,
        insulin_type: 'Degludec',
        dose: 19.0,
        fast_insulin: 'Lispro',
        fixed_dose: 4.5,
        ratio: 13.0,
        sensitivity: 42.0,
        pump_type: 'Tandem t:slim',
        control_data: 'https://example.com/other-motive-data.pdf',
        motive: ['OTRO'],
        another_treatment: null,
        other_motive: 'Need prescription renewal for continuous glucose monitor',
      };

      const response = await authenticatedPost(
        '/appointments/create',
        otherMotiveAppointment,
        token
      );
      expect(response).toBeDefined();
      expect(response.appointment_id).toBeDefined();
      console.log('✅ Appointment with other motive created');
    });
  });

  describe('Performance', () => {
    it('should create appointment within acceptable time', async () => {
      // Setup: Submit to queue and get accepted
      const { token } = await setupAppointmentQueue(TEST_USERS.user7);

      const startTime = Date.now();

      const appointment: TestAppointment = {
        glucose_objective: 120.0,
        insulin_type: 'Lantus',
        dose: 20.0,
        fast_insulin: 'Humalog',
        fixed_dose: 5.0,
        ratio: 10.0,
        sensitivity: 50.0,
        pump_type: '',
        control_data: 'https://example.com/perf-test.pdf',
        motive: ['AJUSTE'],
      };

      await authenticatedPost('/appointments/create', appointment, token);

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(
        2000,
        'Appointment creation should complete in under 2 seconds'
      );
      console.log(`✅ Appointment created in ${duration}ms`);
    });

    it('should fetch appointments within acceptable time', async () => {
      const startTime = Date.now();

      await authenticatedGet('/appointments/mine', token);

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(
        1000,
        'Fetching appointments should complete in under 1 second'
      );
      console.log(`✅ Appointments fetched in ${duration}ms`);
    });
  });
});
