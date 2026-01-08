// Inicializar entorno TestBed para Vitest
import '../../../test-setup';

import { TestBed } from '@angular/core/testing';
import { DemoDataService } from '@services/demo-data.service';
import { LoggerService } from '@services/logger.service';
import { LocalGlucoseReading } from '@models/glucose-reading.model';
import { AccountState } from '@models/user-profile.model';
import { Appointment } from '@models/appointment.model';
import { firstValueFrom } from 'rxjs';

describe('DemoDataService', () => {
  let service: DemoDataService;
  let loggerSpy: {
    info: ReturnType<typeof vi.fn>;
    warn: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    // Mock del LoggerService
    loggerSpy = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [DemoDataService, { provide: LoggerService, useValue: loggerSpy }],
    });

    service = TestBed.inject(DemoDataService);
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  // ============================================================================
  // DOCTOR DATA
  // ============================================================================

  describe('getDoctors', () => {
    it('should return list of demo doctors with next available date', async () => {
      const result = await firstValueFrom(service.getDoctors());

      expect(result).toHaveLength(4);
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('name');
      expect(result[0]).toHaveProperty('specialty');
      expect(result[0]).toHaveProperty('nextAvailable');
    });

    it('should include all required doctor fields', async () => {
      const result = await firstValueFrom(service.getDoctors());
      const doctor = result[0];

      expect(doctor).toHaveProperty('id');
      expect(doctor).toHaveProperty('name');
      expect(doctor).toHaveProperty('specialty');
      expect(doctor).toHaveProperty('hospital');
      expect(doctor).toHaveProperty('experience');
      expect(doctor).toHaveProperty('rating');
      expect(doctor).toHaveProperty('reviews');
      expect(doctor).toHaveProperty('availableDays');
      expect(doctor).toHaveProperty('profileImage');
    });

    it('should simulate network delay of 500ms', async () => {
      const start = Date.now();
      await firstValueFrom(service.getDoctors());
      const duration = Date.now() - start;

      // Debería tardar al menos 500ms (con margen de tolerancia)
      expect(duration).toBeGreaterThanOrEqual(450);
    });
  });

  // ============================================================================
  // TIME SLOTS
  // ============================================================================

  describe('getTimeSlots', () => {
    it('should return time slots for a doctor and date', async () => {
      const result = await firstValueFrom(service.getTimeSlots('dr-001', '2024-12-25'));

      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('time');
      expect(result[0]).toHaveProperty('available');
      expect(result[0]).toHaveProperty('doctorId', 'dr-001');
      expect(result[0]).toHaveProperty('date', '2024-12-25');
    });

    it('should have some unavailable slots randomly', async () => {
      const result = await firstValueFrom(service.getTimeSlots('dr-001', '2024-12-25'));
      const unavailableSlots = result.filter(slot => !slot.available);

      // Deberían haber entre 3 y 6 slots no disponibles
      expect(unavailableSlots.length).toBeGreaterThanOrEqual(3);
      expect(unavailableSlots.length).toBeLessThanOrEqual(6);
    });

    it('should simulate network delay of 300ms', async () => {
      const start = Date.now();
      await firstValueFrom(service.getTimeSlots('dr-001', '2024-12-25'));
      const duration = Date.now() - start;

      expect(duration).toBeGreaterThanOrEqual(250);
    });
  });

  // ============================================================================
  // APPOINTMENT TYPES
  // ============================================================================

  describe('getAppointmentTypes', () => {
    it('should return appointment types with required fields', async () => {
      const result = await firstValueFrom(service.getAppointmentTypes());

      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('name');
      expect(result[0]).toHaveProperty('duration');
      expect(result[0]).toHaveProperty('icon');
    });

    it('should include all 5 appointment types', async () => {
      const result = await firstValueFrom(service.getAppointmentTypes());

      expect(result).toHaveLength(5);
      const types = result.map(t => t.id);
      expect(types).toContain('regular');
      expect(types).toContain('first-visit');
      expect(types).toContain('follow-up');
      expect(types).toContain('urgent');
      expect(types).toContain('teleconsult');
    });
  });

  // ============================================================================
  // APPOINTMENTS
  // ============================================================================

  describe('getDemoAppointments', () => {
    it('should return demo appointments for user 1000', async () => {
      const result = await firstValueFrom(service.getDemoAppointments());

      expect(result).toHaveLength(3);
      result.forEach((appt: Appointment) => {
        expect(appt.user_id).toBe(1000);
        expect(appt).toHaveProperty('appointment_id');
        expect(appt).toHaveProperty('glucose_objective');
        expect(appt).toHaveProperty('insulin_type');
      });
    });

    it('should include all clinical data fields', async () => {
      const result = await firstValueFrom(service.getDemoAppointments());
      const appt = result[0];

      expect(appt).toHaveProperty('appointment_id');
      expect(appt).toHaveProperty('user_id');
      expect(appt).toHaveProperty('glucose_objective');
      expect(appt).toHaveProperty('insulin_type');
      expect(appt).toHaveProperty('dose');
      expect(appt).toHaveProperty('fast_insulin');
      expect(appt).toHaveProperty('fixed_dose');
      expect(appt).toHaveProperty('ratio');
      expect(appt).toHaveProperty('sensitivity');
      expect(appt).toHaveProperty('pump_type');
      expect(appt).toHaveProperty('control_data');
      expect(appt).toHaveProperty('motive');
    });
  });

  // ============================================================================
  // GLUCOSE READINGS GENERATION
  // ============================================================================

  describe('getDemoReadings', () => {
    it('should generate readings for specified number of days', async () => {
      const result = await firstValueFrom(service.getDemoReadings(7));

      // Debería haber múltiples lecturas (típicamente 4 por día, pero aleatorio)
      expect(result.length).toBeGreaterThan(0);
    });

    it('should generate readings with realistic values', async () => {
      const result = await firstValueFrom(service.getDemoReadings(30));

      result.forEach((reading: LocalGlucoseReading) => {
        expect(reading.value).toBeGreaterThan(40); // Valor mínimo realista
        expect(reading.value).toBeLessThan(400); // Valor máximo realista
        expect(reading.units).toBe('mg/dL');
        expect(reading.type).toBe('smbg');
      });
    });

    it('should include different meal contexts', async () => {
      const result = await firstValueFrom(service.getDemoReadings(30));

      const contexts = new Set(result.map(r => r.context));
      expect(contexts.size).toBeGreaterThan(1);
      expect(Array.from(contexts)).toContain('beforeMeal');
    });

    it('should generate readings with timestamps as ISO strings', async () => {
      const result = await firstValueFrom(service.getDemoReadings(7));

      result.forEach((reading: LocalGlucoseReading) => {
        const timestamp = new Date(reading.time);
        // Verificar que el timestamp es una fecha válida
        expect(timestamp.toString()).not.toBe('Invalid Date');
        expect(reading.time).toMatch(/^\d{4}-\d{2}-\d{2}T/); // ISO 8601 format
      });
    });

    it('should occasionally include notes', async () => {
      const result = await firstValueFrom(service.getDemoReadings(30));
      const withNotes = result.filter(r => r.notes);

      // Aproximadamente 20% deberían tener notas
      expect(withNotes.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // MANUAL READINGS SUMMARY
  // ============================================================================

  describe('getDemoManualReadingsSummary', () => {
    it('should calculate statistics from readings', async () => {
      const result = await firstValueFrom(service.getDemoManualReadingsSummary(30));

      expect(result).toHaveProperty('period');
      expect(result).toHaveProperty('statistics');
      expect(result).toHaveProperty('patterns');
      expect(result.statistics).toHaveProperty('totalReadings');
      expect(result.statistics).toHaveProperty('averageGlucose');
      expect(result.statistics).toHaveProperty('inRangePercentage');
    });

    it('should calculate time in range percentages', async () => {
      const result = await firstValueFrom(service.getDemoManualReadingsSummary(30));

      const stats = result.statistics as {
        inRangePercentage: number;
        belowRangePercentage: number;
        aboveRangePercentage: number;
      };

      // Los porcentajes deberían sumar aproximadamente 100 (puede haber errores de redondeo)
      const total =
        stats.inRangePercentage + stats.belowRangePercentage + stats.aboveRangePercentage;
      expect(total).toBeGreaterThanOrEqual(99);
      expect(total).toBeLessThanOrEqual(101);
    });

    it('should separate before/after meal averages', async () => {
      const result = await firstValueFrom(service.getDemoManualReadingsSummary(30));

      expect(result.statistics).toHaveProperty('averageBeforeMeal');
      expect(result.statistics).toHaveProperty('averageAfterMeal');
    });
  });

  // ============================================================================
  // USER PROFILE GENERATION (FAKER)
  // ============================================================================

  describe('generateUserProfile', () => {
    it('should generate realistic user profile using Faker', () => {
      const profile = service.generateUserProfile();

      expect(profile).toHaveProperty('id');
      expect(profile).toHaveProperty('name');
      expect(profile).toHaveProperty('age');
      expect(profile).toHaveProperty('diabetesType');
      expect(profile).toHaveProperty('preferences');
    });

    it('should generate different profiles on each call', () => {
      const profile1 = service.generateUserProfile();
      const profile2 = service.generateUserProfile();

      // IDs deberían ser diferentes
      expect(profile1.id).not.toBe(profile2.id);
    });

    it('should include healthcare provider', () => {
      const profile = service.generateUserProfile();

      expect(profile.healthcareProvider).toBeDefined();
      expect(profile.healthcareProvider?.name).toContain('Dr.');
      expect(profile.healthcareProvider?.phone).toBeDefined();
      expect(profile.healthcareProvider?.email).toBeDefined();
    });

    it('should include emergency contact', () => {
      const profile = service.generateUserProfile();

      expect(profile.emergencyContact).toBeDefined();
      expect(profile.emergencyContact?.name).toBeDefined();
      expect(profile.emergencyContact?.relationship).toBeDefined();
      expect(profile.emergencyContact?.phone).toBeDefined();
    });

    it('should have valid age range', () => {
      const profile = service.generateUserProfile();

      expect(profile.age).toBeGreaterThanOrEqual(25);
      expect(profile.age).toBeLessThanOrEqual(70);
    });

    it('should have account state active', () => {
      const profile = service.generateUserProfile();

      expect(profile.accountState).toBe(AccountState.ACTIVE);
    });
  });

  // ============================================================================
  // ASYNC GENERATION METHODS
  // ============================================================================

  describe('generateGlucoseReadings', () => {
    it('should generate glucose readings asynchronously', async () => {
      const readings = await service.generateGlucoseReadings(7);

      expect(readings).toBeDefined();
      expect(readings.length).toBeGreaterThan(0);
      expect(readings[0]).toHaveProperty('value');
      expect(readings[0]).toHaveProperty('time');
    });
  });

  describe('generateAppointments', () => {
    it('should generate appointments asynchronously', async () => {
      const appointments = await service.generateAppointments(5);

      expect(appointments).toBeDefined();
      expect(appointments).toHaveLength(3); // Devuelve siempre 3 demo appointments
      expect(appointments[0]).toHaveProperty('appointment_id');
    });
  });

  // ============================================================================
  // DEMO DATA SEEDING
  // ============================================================================

  describe('seedDemoData', () => {
    it('should seed all demo data to localStorage', async () => {
      await service.seedDemoData();

      expect(localStorage.getItem('demoMode')).toBe('true');
      expect(localStorage.getItem('demoUser')).toBeDefined();
      expect(localStorage.getItem('demoProfile')).toBeDefined();
      expect(localStorage.getItem('demoReadings')).toBeDefined();
      expect(localStorage.getItem('demoAppointments')).toBeDefined();
    });

    it('should log seeding progress', async () => {
      await service.seedDemoData();

      expect(loggerSpy.info).toHaveBeenCalledWith('DemoData', 'Seeding demo data...');
      expect(loggerSpy.info).toHaveBeenCalledWith('DemoData', 'Demo data seeded successfully');
      expect(loggerSpy.info).toHaveBeenCalledWith(
        'DemoData',
        'Demo credentials: demo@diabetactic.com / demo123'
      );
    });

    it('should create demo user with ID 1000', async () => {
      await service.seedDemoData();

      const demoUserStr = localStorage.getItem('demoUser');
      expect(demoUserStr).toBeDefined();
      const demoUser = JSON.parse(demoUserStr!);
      expect(demoUser.id).toBe('1000');
      expect(demoUser.dni).toBe('1000');
    });

    it('should store readings and appointments', async () => {
      await service.seedDemoData();

      const readingsStr = localStorage.getItem('demoReadings');
      const appointmentsStr = localStorage.getItem('demoAppointments');

      expect(readingsStr).toBeDefined();
      expect(appointmentsStr).toBeDefined();

      const readings = JSON.parse(readingsStr!);
      const appointments = JSON.parse(appointmentsStr!);

      expect(Array.isArray(readings)).toBe(true);
      expect(Array.isArray(appointments)).toBe(true);
    });
  });

  // ============================================================================
  // DEMO MODE MANAGEMENT
  // ============================================================================

  describe('Demo Mode Management', () => {
    it('should clear demo data', () => {
      localStorage.setItem('demoMode', 'true');
      localStorage.setItem('demoUser', '{}');

      service.clearDemoData();

      expect(localStorage.getItem('demoMode')).toBeNull();
      expect(localStorage.getItem('demoUser')).toBeNull();
      expect(loggerSpy.info).toHaveBeenCalledWith('DemoData', 'Demo data cleared');
    });

    it('should detect demo mode', () => {
      expect(service.isDemoMode()).toBe(false);

      localStorage.setItem('demoMode', 'true');
      expect(service.isDemoMode()).toBe(true);
    });
  });

  // ============================================================================
  // EDGE CASES & DATA QUALITY
  // ============================================================================

  describe('Edge Cases', () => {
    it('should handle generating readings for 0 days', async () => {
      const result = await firstValueFrom(service.getDemoReadings(0));

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should generate unique reading IDs', async () => {
      const result = await firstValueFrom(service.getDemoReadings(7));
      const ids = new Set(result.map(r => r.id));

      // Todos los IDs deberían ser únicos
      expect(ids.size).toBe(result.length);
    });

    it('should generate readings with parseable timestamps', async () => {
      const result = await firstValueFrom(service.getDemoReadings(7));

      result.forEach((reading: LocalGlucoseReading) => {
        const timestamp = new Date(reading.time);
        // Verificar que el timestamp se puede parsear correctamente
        expect(timestamp.toString()).not.toBe('Invalid Date');
        expect(typeof reading.time).toBe('string');
        expect(reading.time.length).toBeGreaterThan(0);
      });
    });

    it('should handle large number of days', async () => {
      const result = await firstValueFrom(service.getDemoReadings(365));

      expect(result.length).toBeGreaterThan(100);
    });
  });

  // ============================================================================
  // REALISTIC DATA DISTRIBUTION
  // ============================================================================

  describe('Data Quality and Realism', () => {
    it('should have majority of readings in normal range', async () => {
      const result = await firstValueFrom(service.getDemoReadings(30));
      const inRange = result.filter(r => r.value >= 70 && r.value <= 180);

      // Al menos 50% deberían estar en rango normal
      expect(inRange.length).toBeGreaterThan(result.length * 0.5);
    });

    it('should occasionally generate hypoglycemic events', async () => {
      const result = await firstValueFrom(service.getDemoReadings(30));
      const hypo = result.filter(r => r.value < 70);

      // Deberían existir algunos eventos hipoglucémicos
      expect(hypo.length).toBeGreaterThan(0);
    });

    it('should mark all readings as synced', async () => {
      const result = await firstValueFrom(service.getDemoReadings(7));

      result.forEach((reading: LocalGlucoseReading) => {
        expect(reading.synced).toBe(true);
      });
    });

    it('should use demo-device as deviceId', async () => {
      const result = await firstValueFrom(service.getDemoReadings(7));

      result.forEach((reading: LocalGlucoseReading) => {
        expect(reading.deviceId).toBe('demo-device');
      });
    });
  });
});
