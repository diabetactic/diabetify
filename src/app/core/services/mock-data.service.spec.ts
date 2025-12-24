// Inicializar entorno TestBed para Vitest
import '../../../test-setup';

import { TestBed } from '@angular/core/testing';
import { MockDataService } from '@services/mock-data.service';
import { firstValueFrom } from 'rxjs';

describe('MockDataService', () => {
  let service: MockDataService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [MockDataService],
    });

    service = TestBed.inject(MockDataService);
  });

  // ============================================================================
  // AUTHENTICATION
  // ============================================================================

  describe('Authentication', () => {
    it('should login with valid credentials', async () => {
      const result = await firstValueFrom(service.login('demo_patient', 'password'));

      expect(result).toBeDefined();
      expect(result.username).toBe('demo_patient');
      expect(result.name).toBe('Sofia Rodriguez');
    });

    it('should simulate network delay on login', async () => {
      const start = Date.now();
      await firstValueFrom(service.login('demo_patient', 'any_password'));
      const duration = Date.now() - start;

      expect(duration).toBeGreaterThanOrEqual(750);
    });

    it('should return current user', async () => {
      const result = await firstValueFrom(service.getCurrentUser());

      expect(result).toBeDefined();
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('username');
      expect(result).toHaveProperty('email');
      expect(result).toHaveProperty('medicalTeam');
    });

    it('should logout successfully', async () => {
      const result = await firstValueFrom(service.logout());

      expect(result).toBe(true);
    });
  });

  // ============================================================================
  // GLUCOSE READINGS CRUD
  // ============================================================================

  describe('Glucose Readings', () => {
    it('should get all readings sorted by date descending', async () => {
      const result = await firstValueFrom(service.getReadings());

      expect(result.length).toBeGreaterThan(0);
      for (let i = 0; i < result.length - 1; i++) {
        const current = new Date(result[i].date).getTime();
        const next = new Date(result[i + 1].date).getTime();
        expect(current).toBeGreaterThanOrEqual(next);
      }
    });

    it('should filter readings by start date', async () => {
      const yesterday = new Date(Date.now() - 86400000);
      const result = await firstValueFrom(service.getReadings(yesterday));

      for (const reading of result) {
        expect(new Date(reading.date).getTime()).toBeGreaterThanOrEqual(yesterday.getTime());
      }
    });

    it('should filter readings by date range', async () => {
      const startDate = new Date(Date.now() - 86400000 * 2);
      const endDate = new Date();

      const result = await firstValueFrom(service.getReadings(startDate, endDate));

      for (const reading of result) {
        const readingDate = new Date(reading.date).getTime();
        expect(readingDate).toBeGreaterThanOrEqual(startDate.getTime());
        expect(readingDate).toBeLessThanOrEqual(endDate.getTime());
      }
    });

    it('should add new reading with all fields', async () => {
      const newReading = {
        glucose: 150,
        type: 'before_meal' as const,
        insulin: 5,
        carbs: 45,
        notes: 'Test reading',
        mood: 'happy' as const,
      };

      const result = await firstValueFrom(service.addReading(newReading));

      expect(result.id).toMatch(/^read_/);
      expect(result.glucose).toBe(150);
      expect(result.type).toBe('before_meal');
      expect(result.source).toBe('manual');
    });

    it('should use defaults for missing fields', async () => {
      const result = await firstValueFrom(service.addReading({}));

      expect(result.glucose).toBe(100);
      expect(result.type).toBe('before_meal');
      expect(result.date).toBeDefined();
    });

    it('should delete reading by ID', async () => {
      const readings = await firstValueFrom(service.getReadings());
      const initialCount = readings.length;
      const idToDelete = readings[0].id;

      await firstValueFrom(service.deleteReading(idToDelete));

      const afterDelete = await firstValueFrom(service.getReadings());
      expect(afterDelete.length).toBe(initialCount - 1);
      expect(afterDelete.find(r => r.id === idToDelete)).toBeUndefined();
    });
  });

  // ============================================================================
  // BOLUS CALCULATOR
  // ============================================================================

  describe('Bolus Calculator', () => {
    it('should calculate bolus for carbs only', async () => {
      const result = await firstValueFrom(
        service.calculateBolus({
          carbGrams: 60,
          currentGlucose: 120,
        })
      );

      expect(result.recommendedInsulin).toBe(4);
      expect(result.carbRatio).toBe(15);
      expect(result.targetGlucose).toBe(120);
    });

    it('should calculate correction insulin when glucose is high', async () => {
      const result = await firstValueFrom(
        service.calculateBolus({
          carbGrams: 0,
          currentGlucose: 220,
        })
      );

      expect(result.recommendedInsulin).toBe(2);
    });

    it('should combine carb and correction insulin', async () => {
      const result = await firstValueFrom(
        service.calculateBolus({
          carbGrams: 60,
          currentGlucose: 170,
        })
      );

      expect(result.recommendedInsulin).toBe(5);
    });

    it('should not recommend negative insulin', async () => {
      const result = await firstValueFrom(
        service.calculateBolus({
          carbGrams: 0,
          currentGlucose: 80,
        })
      );

      expect(result.recommendedInsulin).toBeGreaterThanOrEqual(0);
    });
  });

  // ============================================================================
  // APPOINTMENTS
  // ============================================================================

  describe('Appointments', () => {
    it('should get all appointments', async () => {
      const result = await firstValueFrom(service.getAppointments());

      expect(result.length).toBeGreaterThan(0);
      for (const appt of result) {
        expect(appt).toHaveProperty('id');
        expect(appt).toHaveProperty('doctor');
        expect(appt).toHaveProperty('status');
      }
    });

    it('should filter upcoming appointments', async () => {
      const result = await firstValueFrom(service.getAppointments('upcoming'));

      for (const appt of result) {
        expect(appt.status).toBe('upcoming');
        expect(new Date(appt.date).getTime()).toBeGreaterThan(Date.now());
      }
    });

    it('should add new appointment', async () => {
      const newAppt = {
        date: new Date(Date.now() + 86400000 * 30),
        doctor: 'Dr. Test',
        specialty: 'Test Specialty',
        type: 'control_routine' as const,
      };

      const result = await firstValueFrom(service.addAppointment(newAppt));

      expect(result.id).toMatch(/^appt_/);
      expect(result.doctor).toBe('Dr. Test');
      expect(result.status).toBe('upcoming');
    });

    it('should cancel appointment', async () => {
      await firstValueFrom(service.cancelAppointment('appt001'));

      const appt = await firstValueFrom(service.getAppointmentById('appt001'));
      expect(appt?.status).toBe('cancelled');
    });
  });

  // ============================================================================
  // STATISTICS
  // ============================================================================

  describe('Statistics', () => {
    it('should calculate comprehensive stats', async () => {
      const result = await firstValueFrom(service.getStats());

      expect(result).toHaveProperty('avgGlucose');
      expect(result).toHaveProperty('hba1c');
      expect(result).toHaveProperty('timeInRange');
      expect(result).toHaveProperty('trend');
    });

    it('should calculate time in range percentages summing to 100', async () => {
      const result = await firstValueFrom(service.getStats());

      const total = result.timeInRange + result.timeAboveRange + result.timeBelowRange;
      expect(total).toBe(100);
    });
  });

  // ============================================================================
  // PATIENT PARAMETERS
  // ============================================================================

  describe('Patient Parameters', () => {
    it('should get patient parameters', () => {
      const params = service.getPatientParams();

      expect(params).toHaveProperty('carbRatio', 15);
      expect(params).toHaveProperty('correctionFactor', 50);
      expect(params).toHaveProperty('targetGlucose', 120);
    });

    it('should update patient parameters', async () => {
      const result = await firstValueFrom(
        service.updatePatientParams({
          carbRatio: 12,
          targetGlucose: 110,
        })
      );

      expect(result).toBe(true);

      const updated = service.getPatientParams();
      expect(updated.carbRatio).toBe(12);
      expect(updated.targetGlucose).toBe(110);
    });
  });
});
