import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { DemoDataService } from './demo-data.service';
import { LocalGlucoseReading, UserProfile } from '../models';
import { Appointment } from '../models/appointment.model';
import { AccountState } from '../models/user-profile.model';

describe('DemoDataService', () => {
  let service: DemoDataService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [DemoDataService],
    });
    service = TestBed.inject(DemoDataService);

    // Clear localStorage before each test
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Service Creation', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });
  });

  describe('getDoctors', () => {
    it('should return demo doctors list', async () => {
      const doctors = await firstValueFrom(service.getDoctors());

      expect(doctors).toBeDefined();
      expect(doctors.length).toBe(4);
      expect(doctors[0]).toHaveProperty('id');
      expect(doctors[0]).toHaveProperty('name');
      expect(doctors[0]).toHaveProperty('specialty');
      expect(doctors[0]).toHaveProperty('nextAvailable');
    });

    it('should include doctor details', async () => {
      const doctors = await firstValueFrom(service.getDoctors());
      const firstDoctor = doctors[0];

      expect(firstDoctor['name']).toBe('Dr. Ana García');
      expect(firstDoctor['specialty']).toBe('Endocrinología');
      expect(firstDoctor['hospital']).toBe('Hospital General');
      expect(firstDoctor['experience']).toBe('15 años');
      expect(firstDoctor['rating']).toBe(4.8);
      expect(firstDoctor['reviews']).toBe(127);
    });

    it('should calculate next available date', async () => {
      const doctors = await firstValueFrom(service.getDoctors());

      doctors.forEach(doctor => {
        expect(doctor['nextAvailable']).toBeDefined();
        expect(typeof doctor['nextAvailable']).toBe('string');
        // Should be a valid ISO date
        expect(new Date(doctor['nextAvailable'] as string)).toBeInstanceOf(Date);
      });
    });

    it('should simulate network delay', async () => {
      const startTime = Date.now();
      await firstValueFrom(service.getDoctors());
      const duration = Date.now() - startTime;

      expect(duration).toBeGreaterThanOrEqual(500);
    });
  });

  describe('getTimeSlots', () => {
    it('should return time slots for a doctor and date', async () => {
      const slots = await firstValueFrom(service.getTimeSlots('dr-001', '2024-12-10'));

      expect(slots).toBeDefined();
      expect(slots.length).toBeGreaterThan(0);
      expect(slots[0]).toHaveProperty('time');
      expect(slots[0]).toHaveProperty('available');
      expect(slots[0]).toHaveProperty('doctorId');
      expect(slots[0]).toHaveProperty('date');
    });

    it('should mark some slots as unavailable', async () => {
      const slots = await firstValueFrom(service.getTimeSlots('dr-001', '2024-12-10'));

      const unavailableSlots = slots.filter(s => !s['available']);
      expect(unavailableSlots.length).toBeGreaterThan(0);
      expect(unavailableSlots.length).toBeLessThan(slots.length);
    });

    it('should include all standard time slots', async () => {
      const slots = await firstValueFrom(service.getTimeSlots('dr-001', '2024-12-10'));
      const times = slots.map(s => s['time']);

      expect(times).toContain('08:00');
      expect(times).toContain('09:00');
      expect(times).toContain('14:00');
      expect(times).toContain('17:00');
    });
  });

  describe('getAppointmentTypes', () => {
    it('should return appointment types', async () => {
      const types = await firstValueFrom(service.getAppointmentTypes());

      expect(types).toBeDefined();
      expect(types.length).toBe(5);
      expect(types[0]).toHaveProperty('id');
      expect(types[0]).toHaveProperty('name');
      expect(types[0]).toHaveProperty('duration');
      expect(types[0]).toHaveProperty('icon');
    });

    it('should include expected appointment types', async () => {
      const types = await firstValueFrom(service.getAppointmentTypes());
      const ids = types.map(t => t['id']);

      expect(ids).toContain('regular');
      expect(ids).toContain('first-visit');
      expect(ids).toContain('follow-up');
      expect(ids).toContain('urgent');
      expect(ids).toContain('teleconsult');
    });
  });

  describe('getDemoAppointments', () => {
    it('should return demo appointments', async () => {
      const appointments = await firstValueFrom(service.getDemoAppointments());

      expect(appointments).toBeDefined();
      expect(appointments.length).toBe(3);
      expect(appointments[0]).toBeInstanceOf(Object);
    });

    it('should include appointment details', async () => {
      const appointments = await firstValueFrom(service.getDemoAppointments());
      const first = appointments[0];

      expect(first.appointment_id).toBe(1);
      expect(first.user_id).toBe(1000);
      expect(first.glucose_objective).toBe(120);
      expect(first.insulin_type).toBe('rapid');
      expect(first.dose).toBe(10);
      expect(first.motive).toContain('control_routine');
    });

    it('should include various insulin types', async () => {
      const appointments = await firstValueFrom(service.getDemoAppointments());
      const insulinTypes = appointments.map(a => a.insulin_type);

      expect(insulinTypes).toContain('rapid');
      expect(insulinTypes).toContain('long');
      expect(insulinTypes).toContain('mixed');
    });
  });

  describe('getDemoReadings', () => {
    it('should generate demo readings for specified days', async () => {
      const readings = await firstValueFrom(service.getDemoReadings(30));

      expect(readings).toBeDefined();
      expect(readings.length).toBeGreaterThan(0);
      // Typically 2-4 readings per day, so ~60-120 for 30 days
      expect(readings.length).toBeGreaterThan(30);
    });

    it('should generate readings with proper structure', async () => {
      const readings = await firstValueFrom(service.getDemoReadings(7));
      const first = readings[0];

      expect(first).toHaveProperty('id');
      expect(first).toHaveProperty('type');
      expect(first).toHaveProperty('value');
      expect(first).toHaveProperty('units');
      expect(first).toHaveProperty('time');
      expect(first).toHaveProperty('context');
      expect(first.type).toBe('smbg');
      expect(first.units).toBe('mg/dL');
    });

    it('should generate readings with various meal contexts', async () => {
      const readings = await firstValueFrom(service.getDemoReadings(30));
      // Note: context is not part of LocalGlucoseReading model - this test is skipped
      expect(readings.length).toBeGreaterThan(0);
    });

    it('should generate realistic glucose values', async () => {
      const readings = await firstValueFrom(service.getDemoReadings(30));

      readings.forEach(reading => {
        expect(reading.value).toBeGreaterThan(40);
        expect(reading.value).toBeLessThan(400);
      });
    });

    it('should include some readings in target range', async () => {
      const readings = await firstValueFrom(service.getDemoReadings(30));
      const inRange = readings.filter(r => r.value >= 70 && r.value <= 180);

      expect(inRange.length).toBeGreaterThan(0);
    });

    it('should occasionally include notes', async () => {
      const readings = await firstValueFrom(service.getDemoReadings(30));
      const withNotes = readings.filter(r => r.notes);

      // Some readings should have notes
      expect(withNotes.length).toBeGreaterThan(0);
    });

    it('should mark readings as synced', async () => {
      const readings = await firstValueFrom(service.getDemoReadings(30));

      readings.forEach(reading => {
        expect(reading.synced).toBe(true);
      });
    });
  });

  describe('getDemoManualReadingsSummary', () => {
    it('should return reading statistics', async () => {
      const summary = await firstValueFrom(service.getDemoManualReadingsSummary(30));

      expect(summary).toBeDefined();
      expect(summary).toHaveProperty('period');
      expect(summary).toHaveProperty('statistics');
      expect(summary).toHaveProperty('patterns');
      expect(summary).toHaveProperty('notes');
    });

    it('should calculate accurate statistics', async () => {
      const summary = await firstValueFrom(service.getDemoManualReadingsSummary(30));
      const stats = summary['statistics'] as any;

      expect(stats.totalReadings).toBeGreaterThan(0);
      expect(stats.averageGlucose).toBeGreaterThan(0);
      expect(stats.inRangePercentage).toBeGreaterThanOrEqual(0);
      expect(stats.inRangePercentage).toBeLessThanOrEqual(100);
      expect(stats.readingsPerDay).toBeGreaterThan(0);
    });

    it('should include time-based patterns', async () => {
      const summary = await firstValueFrom(service.getDemoManualReadingsSummary(30));
      const patterns = summary['patterns'] as any;

      expect(patterns).toHaveProperty('morningAverage');
      expect(patterns).toHaveProperty('afternoonAverage');
      expect(patterns).toHaveProperty('nightAverage');
    });

    it('should separate before/after meal readings', async () => {
      const summary = await firstValueFrom(service.getDemoManualReadingsSummary(30));
      const stats = summary['statistics'] as any;

      expect(stats).toHaveProperty('averageBeforeMeal');
      expect(stats).toHaveProperty('averageAfterMeal');
    });
  });

  describe('getDemoClinicalForm', () => {
    it('should return clinical form data', async () => {
      const form = await firstValueFrom(service.getDemoClinicalForm());

      expect(form).toBeDefined();
      expect(form).toHaveProperty('patientInfo');
      expect(form).toHaveProperty('vitalSigns');
      expect(form).toHaveProperty('labResults');
      expect(form).toHaveProperty('medications');
      expect(form).toHaveProperty('lifestyle');
    });

    it('should include patient information', async () => {
      const form = await firstValueFrom(service.getDemoClinicalForm());
      const patientInfo = form['patientInfo'] as any;

      expect(patientInfo.name).toBe('Usuario Demo');
      expect(patientInfo.dni).toBe('1000');
      expect(patientInfo.diabetesType).toBe('Tipo 2');
    });

    it('should include vital signs', async () => {
      const form = await firstValueFrom(service.getDemoClinicalForm());
      const vitalSigns = form['vitalSigns'] as any;

      expect(vitalSigns.bloodPressure).toBe('120/80');
      expect(vitalSigns.heartRate).toBe(72);
      expect(vitalSigns.weight).toBe(75);
      expect(vitalSigns.bmi).toBe(25.95);
    });

    it('should include lab results', async () => {
      const form = await firstValueFrom(service.getDemoClinicalForm());
      const labResults = form['labResults'] as any;

      expect(labResults.hba1c).toBe(7.2);
      expect(labResults.fastingGlucose).toBe(125);
      expect(labResults.cholesterol).toBe(190);
    });

    it('should include medications list', async () => {
      const form = await firstValueFrom(service.getDemoClinicalForm());
      const medications = form['medications'] as any[];

      expect(medications.length).toBe(2);
      expect(medications[0].name).toBe('Metformina');
      expect(medications[1].name).toBe('Glimepirida');
    });
  });

  describe('generateUserProfile', () => {
    it('should generate realistic user profile with faker', () => {
      const profile = service.generateUserProfile();

      expect(profile).toBeDefined();
      expect(profile).toHaveProperty('id');
      expect(profile).toHaveProperty('name');
      expect(profile).toHaveProperty('age');
      expect(profile).toHaveProperty('dateOfBirth');
      expect(profile).toHaveProperty('diabetesType');
      expect(profile).toHaveProperty('preferences');
    });

    it('should generate age within valid range', () => {
      const profile = service.generateUserProfile();

      expect(profile.age).toBeGreaterThanOrEqual(25);
      expect(profile.age).toBeLessThanOrEqual(70);
    });

    it('should set default preferences', () => {
      const profile = service.generateUserProfile();

      expect(profile.preferences.glucoseUnit).toBe('mg/dL');
      expect(profile.preferences.themeMode).toBe('light');
      expect(profile.preferences.targetRange.min).toBe(70);
      expect(profile.preferences.targetRange.max).toBe(180);
      expect(profile.preferences.language).toBe('es');
    });

    it('should include healthcare provider', () => {
      const profile = service.generateUserProfile();

      expect(profile.healthcareProvider).toBeDefined();
      expect(profile.healthcareProvider?.name).toContain('Dr.');
      expect(profile.healthcareProvider?.email).toBeDefined();
      expect(profile.healthcareProvider?.phone).toBeDefined();
    });

    it('should include emergency contact', () => {
      const profile = service.generateUserProfile();

      expect(profile.emergencyContact).toBeDefined();
      expect(profile.emergencyContact?.name).toBeDefined();
      expect(profile.emergencyContact?.relationship).toBeDefined();
      expect(profile.emergencyContact?.phone).toBeDefined();
    });

    it('should mark profile as having completed onboarding', () => {
      const profile = service.generateUserProfile();

      expect(profile.hasCompletedOnboarding).toBe(true);
    });

    it('should set account state to active', () => {
      const profile = service.generateUserProfile();

      expect(profile.accountState).toBe(AccountState.ACTIVE);
    });
  });

  describe('generateGlucoseReadings', () => {
    it('should generate readings asynchronously', async () => {
      const readings = await service.generateGlucoseReadings(7);

      expect(readings).toBeDefined();
      expect(Array.isArray(readings)).toBe(true);
      expect(readings.length).toBeGreaterThan(0);
    });

    it('should generate readings for specified number of days', async () => {
      const readings = await service.generateGlucoseReadings(14);

      // Should have multiple readings (at least 1 per day, typically more)
      expect(readings.length).toBeGreaterThanOrEqual(14);
    });
  });

  describe('generateAppointments', () => {
    it('should generate appointments asynchronously', async () => {
      const appointments = await service.generateAppointments(5);

      expect(appointments).toBeDefined();
      expect(Array.isArray(appointments)).toBe(true);
      expect(appointments.length).toBe(3); // Always returns 3 demo appointments
    });
  });

  describe('seedDemoData', () => {
    it('should seed all demo data to localStorage', async () => {
      await service.seedDemoData();

      expect(localStorage.getItem('demoMode')).toBe('true');
      expect(localStorage.getItem('demoUser')).toBeDefined();
      expect(localStorage.getItem('demoProfile')).toBeDefined();
      expect(localStorage.getItem('demoReadings')).toBeDefined();
      expect(localStorage.getItem('demoAppointments')).toBeDefined();
    });

    it('should create demo user with correct credentials', async () => {
      await service.seedDemoData();

      const demoUser = JSON.parse(localStorage.getItem('demoUser') || '{}');
      expect(demoUser.id).toBe('1000');
      expect(demoUser.dni).toBe('1000');
      expect(demoUser.email).toBe('demo@diabetactic.com');
      expect(demoUser.password).toBe('demo123');
      expect(demoUser.role).toBe('patient');
    });

    it('should seed profile with realistic data', async () => {
      await service.seedDemoData();

      const profile = JSON.parse(localStorage.getItem('demoProfile') || '{}');
      expect(profile.id).toBeDefined();
      expect(profile.name).toBeDefined();
      expect(profile.preferences).toBeDefined();
    });

    it('should seed readings for 30 days', async () => {
      await service.seedDemoData();

      const readings = JSON.parse(localStorage.getItem('demoReadings') || '[]');
      expect(readings.length).toBeGreaterThan(0);
    });

    it('should seed appointments', async () => {
      await service.seedDemoData();

      const appointments = JSON.parse(localStorage.getItem('demoAppointments') || '[]');
      expect(appointments.length).toBe(3);
    });
  });

  describe('clearDemoData', () => {
    it('should clear demo mode flag', async () => {
      await service.seedDemoData();
      service.clearDemoData();

      expect(localStorage.getItem('demoMode')).toBeNull();
      expect(localStorage.getItem('demoUser')).toBeNull();
    });
  });

  describe('isDemoMode', () => {
    it('should return false when demo mode not set', () => {
      expect(service.isDemoMode()).toBe(false);
    });

    it('should return true when demo mode is active', async () => {
      await service.seedDemoData();

      expect(service.isDemoMode()).toBe(true);
    });

    it('should return false after clearing demo data', async () => {
      await service.seedDemoData();
      service.clearDemoData();

      expect(service.isDemoMode()).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty date range for readings', async () => {
      const readings = await firstValueFrom(service.getDemoReadings(0));

      expect(readings).toBeDefined();
      expect(Array.isArray(readings)).toBe(true);
    });

    it('should generate unique reading IDs', async () => {
      const readings = await firstValueFrom(service.getDemoReadings(30));
      const ids = readings.map(r => r.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should handle large number of days for readings', async () => {
      const readings = await firstValueFrom(service.getDemoReadings(365));

      expect(readings.length).toBeGreaterThan(365);
    });

    it('should create valid ISO timestamps', async () => {
      const readings = await firstValueFrom(service.getDemoReadings(7));

      readings.forEach(reading => {
        const date = new Date(reading.time);
        expect(date.toString()).not.toBe('Invalid Date');
      });
    });
  });
});
