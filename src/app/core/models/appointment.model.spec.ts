/**
 * Unit tests for appointment models
 * Tests interfaces, constants, and type definitions
 */

import {
  Appointment,
  CreateAppointmentRequest,
  AppointmentListResponse,
  APPOINTMENT_MOTIVES,
  AppointmentMotive,
  INSULIN_TYPES,
  InsulinType,
  PUMP_TYPES,
  PumpType,
} from './appointment.model';

describe('AppointmentModel', () => {
  describe('Appointment interface', () => {
    it('should accept valid appointment', () => {
      const appointment: Appointment = {
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
        motive: ['control_routine'],
      };
      expect(appointment.appointment_id).toBe(1);
      expect(appointment.user_id).toBe(123);
      expect(appointment.glucose_objective).toBe(120);
      expect(appointment.insulin_type).toBe('rapid');
    });

    it('should accept appointment with optional fields', () => {
      const appointment: Appointment = {
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
        motive: ['control_routine', 'adjustment'],
        another_treatment: 'metformin',
        other_motive: 'Custom motive text',
      };
      expect(appointment.another_treatment).toBe('metformin');
      expect(appointment.other_motive).toBe('Custom motive text');
    });

    it('should accept null for optional fields', () => {
      const appointment: Appointment = {
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
        motive: ['control_routine'],
        another_treatment: null,
        other_motive: null,
      };
      expect(appointment.another_treatment).toBeNull();
      expect(appointment.other_motive).toBeNull();
    });

    it('should accept multiple motives', () => {
      const appointment: Appointment = {
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
        motive: ['control_routine', 'follow_up', 'adjustment'],
      };
      expect(appointment.motive.length).toBe(3);
      expect(appointment.motive).toContain('control_routine');
      expect(appointment.motive).toContain('follow_up');
      expect(appointment.motive).toContain('adjustment');
    });

    it('should accept various numeric values', () => {
      const appointment: Appointment = {
        appointment_id: 999,
        user_id: 456,
        glucose_objective: 140,
        insulin_type: 'long',
        dose: 25.5,
        fast_insulin: 'novolog',
        fixed_dose: 15,
        ratio: 2.0,
        sensitivity: 40,
        pump_type: 'none',
        control_data: '2024-06-15',
        motive: ['consultation'],
      };
      expect(appointment.dose).toBe(25.5);
      expect(appointment.ratio).toBe(2.0);
      expect(appointment.sensitivity).toBe(40);
    });
  });

  describe('CreateAppointmentRequest interface', () => {
    it('should accept minimal request', () => {
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
        motive: ['control_routine'],
      };
      expect(request.glucose_objective).toBe(120);
      expect(request.motive).toEqual(['control_routine']);
    });

    it('should accept request with all optional fields', () => {
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
        motive: ['control_routine'],
        other_motive: 'Custom reason',
        another_treatment: 'metformin',
      };
      expect(request.other_motive).toBe('Custom reason');
      expect(request.another_treatment).toBe('metformin');
    });

    it('should not have appointment_id or user_id', () => {
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
        motive: ['control_routine'],
      };
      expect('appointment_id' in request).toBe(false);
      expect('user_id' in request).toBe(false);
    });
  });

  describe('AppointmentListResponse interface', () => {
    it('should accept empty list', () => {
      const response: AppointmentListResponse = {
        appointments: [],
      };
      expect(response.appointments.length).toBe(0);
    });

    it('should accept list with appointments', () => {
      const response: AppointmentListResponse = {
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
            motive: ['control_routine'],
          },
        ],
      };
      expect(response.appointments.length).toBe(1);
      expect(response.appointments[0].appointment_id).toBe(1);
    });

    it('should accept list with total count', () => {
      const response: AppointmentListResponse = {
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
            motive: ['control_routine'],
          },
        ],
        total: 10,
      };
      expect(response.total).toBe(10);
      expect(response.appointments.length).toBe(1);
    });

    it('should accept multiple appointments', () => {
      const response: AppointmentListResponse = {
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
            motive: ['control_routine'],
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
            motive: ['follow_up', 'adjustment'],
          },
        ],
        total: 2,
      };
      expect(response.appointments.length).toBe(2);
      expect(response.total).toBe(2);
    });
  });

  describe('APPOINTMENT_MOTIVES constant', () => {
    it('should have all expected motives', () => {
      expect(APPOINTMENT_MOTIVES).toEqual([
        'control_routine',
        'follow_up',
        'emergency',
        'consultation',
        'adjustment',
        'other',
      ]);
    });

    it('should have 6 motives', () => {
      expect(APPOINTMENT_MOTIVES.length).toBe(6);
    });

    it('should be readonly array', () => {
      expect(Array.isArray(APPOINTMENT_MOTIVES)).toBe(true);
    });

    it('should have unique values', () => {
      const unique = new Set(APPOINTMENT_MOTIVES);
      expect(unique.size).toBe(APPOINTMENT_MOTIVES.length);
    });
  });

  describe('AppointmentMotive type', () => {
    it('should accept all defined motives', () => {
      const motives: AppointmentMotive[] = [
        'control_routine',
        'follow_up',
        'emergency',
        'consultation',
        'adjustment',
        'other',
      ];
      motives.forEach(motive => {
        expect(APPOINTMENT_MOTIVES).toContain(motive);
      });
    });
  });

  describe('INSULIN_TYPES constant', () => {
    it('should have all expected insulin types', () => {
      expect(INSULIN_TYPES).toEqual(['rapid', 'short', 'intermediate', 'long', 'mixed', 'none']);
    });

    it('should have 6 types', () => {
      expect(INSULIN_TYPES.length).toBe(6);
    });

    it('should be readonly array', () => {
      expect(Array.isArray(INSULIN_TYPES)).toBe(true);
    });

    it('should have unique values', () => {
      const unique = new Set(INSULIN_TYPES);
      expect(unique.size).toBe(INSULIN_TYPES.length);
    });
  });

  describe('InsulinType type', () => {
    it('should accept all defined insulin types', () => {
      const types: InsulinType[] = ['rapid', 'short', 'intermediate', 'long', 'mixed', 'none'];
      types.forEach(type => {
        expect(INSULIN_TYPES).toContain(type);
      });
    });
  });

  describe('PUMP_TYPES constant', () => {
    it('should have all expected pump types', () => {
      expect(PUMP_TYPES).toEqual(['medtronic', 'omnipod', 'tandem', 'none', 'other']);
    });

    it('should have 5 types', () => {
      expect(PUMP_TYPES.length).toBe(5);
    });

    it('should be readonly array', () => {
      expect(Array.isArray(PUMP_TYPES)).toBe(true);
    });

    it('should have unique values', () => {
      const unique = new Set(PUMP_TYPES);
      expect(unique.size).toBe(PUMP_TYPES.length);
    });
  });

  describe('PumpType type', () => {
    it('should accept all defined pump types', () => {
      const types: PumpType[] = ['medtronic', 'omnipod', 'tandem', 'none', 'other'];
      types.forEach(type => {
        expect(PUMP_TYPES).toContain(type);
      });
    });
  });

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
        motive: ['control_routine'],
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

    it('should accept appointments created from requests', () => {
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
        motive: ['consultation', 'adjustment'],
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
