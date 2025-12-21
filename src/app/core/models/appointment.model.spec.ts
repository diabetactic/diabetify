/**
 * Unit tests for appointment models
 * Tests interfaces, constants, and type definitions
 *
 * IMPORTANT: Backend enum validation is handled by backend-enums.contract.spec.ts.
 * This file tests model-specific functionality only.
 */

// Initialize TestBed environment for Vitest
import '../../../test-setup';

import {
  Appointment,
  CreateAppointmentRequest,
  AppointmentListResponse,
  APPOINTMENT_MOTIVES,
  INSULIN_TYPES,
  InsulinType,
  PUMP_TYPES,
  PumpType,
} from '@models/appointment.model';

import {
  BACKEND_APPOINTMENT_MOTIVES,
  isValidBackendMotive,
} from '@core/contracts/backend-enums.contract';

describe('AppointmentModel', () => {
  // ============================================================================
  // APPOINTMENT INTERFACE TESTS
  // ============================================================================

  describe('Appointment interface', () => {
    const baseAppointment: Appointment = {
      appointment_id: 1,
      user_id: 123,
      glucose_objective: 120,
      insulin_type: 'rapid',
      dose: 10,
      fast_insulin: 'humalog',
      fixed_dose: 8,
      ratio: 1.5,
      sensitivity: 50,
      pump_type: 'medtronic',
      control_data: '2024-01-01',
      motive: ['AJUSTE'],
    };

    it('should accept valid appointment with required fields', () => {
      expect(baseAppointment.appointment_id).toBe(1);
      expect(baseAppointment.user_id).toBe(123);
      expect(baseAppointment.glucose_objective).toBe(120);
      expect(baseAppointment.motive).toEqual(['AJUSTE']);
    });

    it('should accept optional fields and null values', () => {
      const withOptional: Appointment = {
        ...baseAppointment,
        another_treatment: 'metformin',
        other_motive: 'Custom motive text',
      };
      expect(withOptional.another_treatment).toBe('metformin');
      expect(withOptional.other_motive).toBe('Custom motive text');

      const withNull: Appointment = {
        ...baseAppointment,
        another_treatment: null,
        other_motive: null,
      };
      expect(withNull.another_treatment).toBeNull();
    });

    it('should accept multiple motives and various numeric values', () => {
      const multiMotive: Appointment = {
        ...baseAppointment,
        motive: ['AJUSTE', 'HIPOGLUCEMIA', 'HIPERGLUCEMIA'],
        dose: 25.5,
        ratio: 2.0,
        sensitivity: 40,
      };
      expect(multiMotive.motive).toHaveLength(3);
      expect(multiMotive.dose).toBe(25.5);
    });
  });

  // ============================================================================
  // CREATE REQUEST & LIST RESPONSE TESTS
  // ============================================================================

  describe('CreateAppointmentRequest interface', () => {
    it('should accept request without server-assigned fields', () => {
      const request: CreateAppointmentRequest = {
        glucose_objective: 120,
        insulin_type: 'rapid',
        dose: 10,
        fast_insulin: 'humalog',
        fixed_dose: 8,
        ratio: 1.5,
        sensitivity: 50,
        pump_type: 'medtronic',
        control_data: '2024-01-01',
        motive: ['AJUSTE'],
        other_motive: 'Custom reason',
        another_treatment: 'metformin',
      };

      expect(request.glucose_objective).toBe(120);
      expect('appointment_id' in request).toBe(false);
      expect('user_id' in request).toBe(false);
    });
  });

  describe('AppointmentListResponse interface', () => {
    it('should accept empty and populated lists with optional total', () => {
      const empty: AppointmentListResponse = { appointments: [] };
      expect(empty.appointments).toHaveLength(0);

      const populated: AppointmentListResponse = {
        appointments: [
          {
            appointment_id: 1,
            user_id: 123,
            glucose_objective: 120,
            insulin_type: 'rapid',
            dose: 10,
            fast_insulin: 'humalog',
            fixed_dose: 8,
            ratio: 1.5,
            sensitivity: 50,
            pump_type: 'medtronic',
            control_data: '2024-01-01',
            motive: ['AJUSTE'],
          },
          {
            appointment_id: 2,
            user_id: 123,
            glucose_objective: 110,
            insulin_type: 'long',
            dose: 15,
            fast_insulin: 'novolog',
            fixed_dose: 12,
            ratio: 1.8,
            sensitivity: 45,
            pump_type: 'omnipod',
            control_data: '2024-02-01',
            motive: ['HIPOGLUCEMIA', 'CETOSIS'],
          },
        ],
        total: 2,
      };
      expect(populated.appointments).toHaveLength(2);
      expect(populated.total).toBe(2);
    });
  });

  // ============================================================================
  // CONSTANTS TESTS
  // ============================================================================

  describe('APPOINTMENT_MOTIVES constant', () => {
    it('should match backend motives exactly and all be valid', () => {
      expect([...APPOINTMENT_MOTIVES]).toEqual([...BACKEND_APPOINTMENT_MOTIVES]);
      expect(APPOINTMENT_MOTIVES).toHaveLength(6);

      APPOINTMENT_MOTIVES.forEach(motive => {
        expect(isValidBackendMotive(motive)).toBe(true);
      });

      // Unique values
      expect(new Set(APPOINTMENT_MOTIVES).size).toBe(APPOINTMENT_MOTIVES.length);
    });
  });

  describe('INSULIN_TYPES constant', () => {
    it('should have all expected unique insulin types', () => {
      const expectedTypes: InsulinType[] = [
        'rapid',
        'short',
        'intermediate',
        'long',
        'mixed',
        'none',
      ];

      expect(INSULIN_TYPES).toEqual(expectedTypes);
      expect(INSULIN_TYPES).toHaveLength(6);
      expect(new Set(INSULIN_TYPES).size).toBe(INSULIN_TYPES.length);

      expectedTypes.forEach(type => {
        expect(INSULIN_TYPES).toContain(type);
      });
    });
  });

  describe('PUMP_TYPES constant', () => {
    it('should have all expected unique pump types', () => {
      const expectedTypes: PumpType[] = ['medtronic', 'omnipod', 'tandem', 'none', 'other'];

      expect(PUMP_TYPES).toEqual(expectedTypes);
      expect(PUMP_TYPES).toHaveLength(5);
      expect(new Set(PUMP_TYPES).size).toBe(PUMP_TYPES.length);

      expectedTypes.forEach(type => {
        expect(PUMP_TYPES).toContain(type);
      });
    });
  });

  // ============================================================================
  // DATA CONSISTENCY TESTS
  // ============================================================================

  describe('Data consistency', () => {
    it('should use same field types in Appointment and CreateAppointmentRequest', () => {
      const createRequest: CreateAppointmentRequest = {
        glucose_objective: 120,
        insulin_type: 'rapid',
        dose: 10,
        fast_insulin: 'humalog',
        fixed_dose: 8,
        ratio: 1.5,
        sensitivity: 50,
        pump_type: 'medtronic',
        control_data: '2024-01-01',
        motive: ['AJUSTE'],
      };

      const appointment: Appointment = {
        appointment_id: 1,
        user_id: 123,
        ...createRequest,
      };

      expect(appointment.glucose_objective).toBe(createRequest.glucose_objective);
      expect(appointment.insulin_type).toBe(createRequest.insulin_type);
      expect(appointment.dose).toBe(createRequest.dose);
      expect(appointment.motive).toEqual(createRequest.motive);
    });

    it('should accept appointments created from requests with optional fields', () => {
      const request: CreateAppointmentRequest = {
        glucose_objective: 110,
        insulin_type: 'long',
        dose: 20,
        fast_insulin: 'lantus',
        fixed_dose: 18,
        ratio: 2.0,
        sensitivity: 45,
        pump_type: 'none',
        control_data: '2024-03-01',
        motive: ['DUDAS', 'AJUSTE'],
        another_treatment: 'metformin',
      };

      const appointment: Appointment = {
        appointment_id: 5,
        user_id: 456,
        ...request,
      };

      expect(appointment.appointment_id).toBe(5);
      expect(appointment.user_id).toBe(456);
      expect(appointment.another_treatment).toBe(request.another_treatment);
    });
  });
});
