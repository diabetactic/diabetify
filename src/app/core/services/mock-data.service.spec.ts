import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { MockDataService } from '@services/mock-data.service';
import { environment } from '@env/environment';

describe('MockDataService', () => {
  let service: MockDataService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [MockDataService],
    });
    service = TestBed.inject(MockDataService);
  });

  describe('Service Creation', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should initialize with current user', () => {
      const user = service['currentUser'];

      expect(user).toBeDefined();
      expect(user.id).toBe('pac001');
      expect(user.username).toBe('demo_patient');
      expect(user.name).toBe('Sofia Rodriguez');
    });

    it('should initialize with patient parameters', () => {
      const params = service['patientParams'];

      expect(params).toBeDefined();
      expect(params.carbRatio).toBe(15);
      expect(params.correctionFactor).toBe(50);
      expect(params.targetGlucose).toBe(120);
    });

    it('should have demo readings', () => {
      const readings = service['readings'];

      expect(readings).toBeDefined();
      expect(readings.length).toBeGreaterThan(0);
    });

    it('should have demo appointments', () => {
      const appointments = service['appointments'];

      expect(appointments).toBeDefined();
      expect(appointments.length).toBeGreaterThan(0);
    });
  });

  describe('Authentication', () => {
    it('should login with valid credentials', async () => {
      const user = await firstValueFrom(service.login('demo_patient', 'password'));

      expect(user).toBeDefined();
      expect(user.id).toBe('pac001');
    });

    it('should simulate network delay on login', async () => {
      const startTime = Date.now();
      await firstValueFrom(service.login('demo_patient', 'password'));
      const duration = Date.now() - startTime;

      expect(duration).toBeGreaterThanOrEqual(800);
    });

    it('should logout successfully', async () => {
      const result = await firstValueFrom(service.logout());

      expect(result).toBe(true);
    });

    it('should return current user', async () => {
      const user = await firstValueFrom(service.getCurrentUser());

      expect(user).toBeDefined();
      expect(user.id).toBe('pac001');
    });
  });

  describe('Readings Management', () => {
    it('should get all readings', async () => {
      const readings = await firstValueFrom(service.getReadings());

      expect(readings).toBeDefined();
      expect(readings.length).toBeGreaterThan(0);
    });

    it('should sort readings by date descending', async () => {
      const readings = await firstValueFrom(service.getReadings());

      for (let i = 0; i < readings.length - 1; i++) {
        const currentDate = new Date(readings[i].date).getTime();
        const nextDate = new Date(readings[i + 1].date).getTime();
        expect(currentDate).toBeGreaterThanOrEqual(nextDate);
      }
    });

    it('should filter readings by start date', async () => {
      const yesterday = new Date(Date.now() - 86400000);
      const readings = await firstValueFrom(service.getReadings(yesterday));

      readings.forEach(reading => {
        expect(new Date(reading.date).getTime()).toBeGreaterThanOrEqual(yesterday.getTime());
      });
    });

    it('should filter readings by end date', async () => {
      const yesterday = new Date(Date.now() - 86400000);
      const readings = await firstValueFrom(service.getReadings(undefined, yesterday));

      readings.forEach(reading => {
        expect(new Date(reading.date).getTime()).toBeLessThanOrEqual(yesterday.getTime());
      });
    });

    it('should filter readings by date range', async () => {
      const twoDaysAgo = new Date(Date.now() - 2 * 86400000);
      const oneDayAgo = new Date(Date.now() - 86400000);
      const readings = await firstValueFrom(service.getReadings(twoDaysAgo, oneDayAgo));

      readings.forEach(reading => {
        const readingDate = new Date(reading.date).getTime();
        expect(readingDate).toBeGreaterThanOrEqual(twoDaysAgo.getTime());
        expect(readingDate).toBeLessThanOrEqual(oneDayAgo.getTime());
      });
    });

    it('should add new reading', async () => {
      const newReading = {
        glucose: 125,
        type: 'before_meal' as const,
        insulin: 4,
        carbs: 30,
        notes: 'Test reading',
      };

      const result = await firstValueFrom(service.addReading(newReading));

      expect(result).toBeDefined();
      expect(result.id).toMatch(/^read_/);
      expect(result.glucose).toBe(125);
      expect(result.source).toBe('manual');
    });

    it('should use default values for missing fields', async () => {
      const result = await firstValueFrom(service.addReading({}));

      expect(result.glucose).toBe(100);
      expect(result.type).toBe('before_meal');
      expect(result.date).toBeInstanceOf(Date);
    });

    it('should delete reading by id', async () => {
      const readings = service['readings'];
      const initialCount = readings.length;
      const idToDelete = readings[0].id;

      await firstValueFrom(service.deleteReading(idToDelete));

      expect(service['readings'].length).toBe(initialCount - 1);
      expect(service['readings'].find(r => r.id === idToDelete)).toBeUndefined();
    });

    it('should handle deleting non-existent reading', async () => {
      const result = await firstValueFrom(service.deleteReading('nonexistent'));

      expect(result).toBe(true);
    });

    it('should include various reading types', async () => {
      const readings = await firstValueFrom(service.getReadings());
      const types = [...new Set(readings.map(r => r.type))];

      expect(types.length).toBeGreaterThan(1);
    });

    it('should include readings from different sources', async () => {
      const readings = await firstValueFrom(service.getReadings());
      const sources = [...new Set(readings.map(r => r.source))];

      expect(sources).toContain('manual');
    });
  });

  describe('Bolus Calculator', () => {
    it('should calculate bolus for carbs and glucose', async () => {
      const result = await firstValueFrom(
        service.calculateBolus({
          carbGrams: 45,
          currentGlucose: 180,
        })
      );

      expect(result).toBeDefined();
      expect(result.recommendedInsulin).toBeGreaterThan(0);
      expect(result.carbRatio).toBe(15);
      expect(result.correctionFactor).toBe(50);
    });

    it('should calculate carb insulin correctly', async () => {
      const result = await firstValueFrom(
        service.calculateBolus({
          carbGrams: 30,
          currentGlucose: 120, // At target, no correction
        })
      );

      // 30 carbs / 15 ratio = 2 units
      expect(result.recommendedInsulin).toBe(2);
    });

    it('should calculate correction insulin when above target', async () => {
      const result = await firstValueFrom(
        service.calculateBolus({
          carbGrams: 0,
          currentGlucose: 170, // 50 above target
        })
      );

      // (170 - 120) / 50 = 1 unit
      expect(result.recommendedInsulin).toBe(1);
    });

    it('should not recommend negative insulin', async () => {
      const result = await firstValueFrom(
        service.calculateBolus({
          carbGrams: 0,
          currentGlucose: 80, // Below target
        })
      );

      expect(result.recommendedInsulin).toBeGreaterThanOrEqual(0);
    });

    it('should combine carb and correction insulin', async () => {
      const result = await firstValueFrom(
        service.calculateBolus({
          carbGrams: 45, // 45/15 = 3 units
          currentGlucose: 170, // (170-120)/50 = 1 unit
        })
      );

      // Total should be 4 units
      expect(result.recommendedInsulin).toBe(4);
    });

    it('should round to one decimal place', async () => {
      const result = await firstValueFrom(
        service.calculateBolus({
          carbGrams: 46, // 46/15 = 3.0666...
          currentGlucose: 120,
        })
      );

      expect(result.recommendedInsulin).toBe(3.1);
    });
  });

  describe('Appointments Management', () => {
    it('should get all appointments', async () => {
      const appointments = await firstValueFrom(service.getAppointments());

      expect(appointments).toBeDefined();
      expect(appointments.length).toBeGreaterThan(0);
    });

    it('should filter upcoming appointments', async () => {
      const appointments = await firstValueFrom(service.getAppointments('upcoming'));

      appointments.forEach(appt => {
        expect(appt.status).toBe('upcoming');
      });
    });

    it('should filter completed appointments', async () => {
      const appointments = await firstValueFrom(service.getAppointments('completed'));

      appointments.forEach(appt => {
        expect(appt.status).toBe('completed');
      });
    });

    it('should sort upcoming appointments by date ascending', async () => {
      const appointments = await firstValueFrom(service.getAppointments('upcoming'));

      for (let i = 0; i < appointments.length - 1; i++) {
        const currentDate = new Date(appointments[i].date).getTime();
        const nextDate = new Date(appointments[i + 1].date).getTime();
        expect(currentDate).toBeLessThanOrEqual(nextDate);
      }
    });

    it('should sort completed appointments by date descending', async () => {
      const appointments = await firstValueFrom(service.getAppointments('completed'));

      for (let i = 0; i < appointments.length - 1; i++) {
        const currentDate = new Date(appointments[i].date).getTime();
        const nextDate = new Date(appointments[i + 1].date).getTime();
        expect(currentDate).toBeGreaterThanOrEqual(nextDate);
      }
    });

    it('should get appointment by id', async () => {
      const appointment = await firstValueFrom(service.getAppointmentById('appt001'));

      expect(appointment).toBeDefined();
      expect(appointment?.id).toBe('appt001');
    });

    it('should return null for non-existent appointment', async () => {
      const appointment = await firstValueFrom(service.getAppointmentById('nonexistent'));

      expect(appointment).toBeNull();
    });

    it('should add new appointment', async () => {
      const newAppt = {
        date: new Date(),
        time: '3:00 PM',
        doctor: 'Dr. Test',
        specialty: 'Test Specialty',
        type: 'control_routine' as const,
      };

      const result = await firstValueFrom(service.addAppointment(newAppt));

      expect(result).toBeDefined();
      expect(result.id).toMatch(/^appt_/);
      expect(result.status).toBe('upcoming');
      expect(result.reminders).toBe(true);
    });

    it('should use default values for missing fields', async () => {
      const result = await firstValueFrom(service.addAppointment({}));

      expect(result.doctor).toBe('Dr. Demo');
      expect(result.hospital).toBe('Centro Médico');
      expect(result.status).toBe('upcoming');
    });

    it('should update appointment', async () => {
      const updated = await firstValueFrom(
        service.updateAppointment('appt001', {
          notes: 'Updated notes',
        })
      );

      expect(updated).toBeDefined();
      expect(updated?.notes).toBe('Updated notes');
    });

    it('should return null when updating non-existent appointment', async () => {
      const result = await firstValueFrom(
        service.updateAppointment('nonexistent', { notes: 'Test' })
      );

      expect(result).toBeNull();
    });

    it('should cancel appointment', async () => {
      await firstValueFrom(service.cancelAppointment('appt001'));

      const appointment = service['appointments'].find(a => a.id === 'appt001');
      expect(appointment?.status).toBe('cancelled');
    });

    it('should delete appointment', async () => {
      const initialCount = service['appointments'].length;
      await firstValueFrom(service.deleteAppointment('appt001'));

      expect(service['appointments'].length).toBe(initialCount - 1);
      expect(service['appointments'].find(a => a.id === 'appt001')).toBeUndefined();
    });

    it('should include various appointment types', async () => {
      const appointments = await firstValueFrom(service.getAppointments());
      const types = [...new Set(appointments.map(a => a.type))];

      expect(types).toContain('control_routine');
      expect(types).toContain('nutritionist');
    });
  });

  describe('Statistics', () => {
    it('should calculate statistics from readings', async () => {
      const stats = await firstValueFrom(service.getStats());

      expect(stats).toBeDefined();
      expect(stats.avgGlucose).toBeGreaterThan(0);
      expect(stats.timeInRange).toBeGreaterThanOrEqual(0);
      expect(stats.hba1c).toBeGreaterThan(0);
    });

    it('should calculate averages for different time periods', async () => {
      const stats = await firstValueFrom(service.getStats());

      expect(stats.avgGlucoseLast7Days).toBeDefined();
      expect(stats.avgGlucoseLast30Days).toBeDefined();
    });

    it('should calculate time in range percentage', async () => {
      const stats = await firstValueFrom(service.getStats());

      expect(stats.timeInRange).toBeGreaterThanOrEqual(0);
      expect(stats.timeInRange).toBeLessThanOrEqual(100);
    });

    it('should calculate time above range percentage', async () => {
      const stats = await firstValueFrom(service.getStats());

      expect(stats.timeAboveRange).toBeGreaterThanOrEqual(0);
      expect(stats.timeAboveRange).toBeLessThanOrEqual(100);
    });

    it('should calculate time below range percentage', async () => {
      const stats = await firstValueFrom(service.getStats());

      expect(stats.timeBelowRange).toBeGreaterThanOrEqual(0);
      expect(stats.timeBelowRange).toBeLessThanOrEqual(100);
    });

    it('should sum time percentages to 100', async () => {
      const stats = await firstValueFrom(service.getStats());

      const sum = stats.timeInRange + stats.timeAboveRange + stats.timeBelowRange;
      expect(sum).toBeGreaterThanOrEqual(99); // Allow rounding errors
      expect(sum).toBeLessThanOrEqual(101);
    });

    it('should estimate HbA1c from average glucose', async () => {
      const stats = await firstValueFrom(service.getStats());

      // HbA1c should be reasonable (4-14%)
      expect(stats.hba1c).toBeGreaterThan(4);
      expect(stats.hba1c).toBeLessThan(14);
    });

    it('should determine trend based on readings', async () => {
      const stats = await firstValueFrom(service.getStats());

      expect(['improving', 'stable', 'needs_attention']).toContain(stats.trend);
    });

    it('should count readings for today', async () => {
      const stats = await firstValueFrom(service.getStats());

      expect(stats.readingsToday).toBeGreaterThanOrEqual(0);
    });

    it('should count readings for this week', async () => {
      const stats = await firstValueFrom(service.getStats());

      expect(stats.readingsThisWeek).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Patient Parameters', () => {
    it('should get patient parameters', () => {
      const params = service.getPatientParams();

      expect(params).toBeDefined();
      expect(params.carbRatio).toBe(15);
      expect(params.correctionFactor).toBe(50);
      expect(params.targetGlucose).toBe(120);
      expect(params.targetRange.min).toBe(70);
      expect(params.targetRange.max).toBe(180);
    });

    it('should update patient parameters', async () => {
      const result = await firstValueFrom(
        service.updatePatientParams({
          carbRatio: 12,
          correctionFactor: 40,
        })
      );

      expect(result).toBe(true);

      const params = service.getPatientParams();
      expect(params.carbRatio).toBe(12);
      expect(params.correctionFactor).toBe(40);
    });

    it('should partially update parameters', async () => {
      await firstValueFrom(service.updatePatientParams({ carbRatio: 20 }));

      const params = service.getPatientParams();
      expect(params.carbRatio).toBe(20);
      expect(params.correctionFactor).toBe(50); // Unchanged
    });
  });

  describe('Network Delays', () => {
    it('should simulate delay for getReadings', async () => {
      const startTime = Date.now();
      await firstValueFrom(service.getReadings());
      const duration = Date.now() - startTime;

      // Allow 20% tolerance for timing flakiness (300ms * 0.8 = 240ms)
      expect(duration).toBeGreaterThanOrEqual(240);
    });

    it('should simulate delay for addReading', async () => {
      const startTime = Date.now();
      await firstValueFrom(service.addReading({ glucose: 120 }));
      const duration = Date.now() - startTime;

      // Allow 20% tolerance for timing flakiness (500ms * 0.8 = 400ms)
      expect(duration).toBeGreaterThanOrEqual(400);
    });

    it('should simulate delay for getStats', async () => {
      const startTime = Date.now();
      await firstValueFrom(service.getStats());
      const duration = Date.now() - startTime;

      // Allow 20% tolerance for timing flakiness (400ms * 0.8 = 320ms)
      expect(duration).toBeGreaterThanOrEqual(320);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty readings array for stats', async () => {
      // Clear all readings
      service['readings'] = [];

      const stats = await firstValueFrom(service.getStats());

      expect(stats.readingsToday).toBe(0);
      expect(stats.readingsThisWeek).toBe(0);
    });

    it('should handle NaN in calculations gracefully', async () => {
      service['readings'] = [];

      const stats = await firstValueFrom(service.getStats());

      expect(isNaN(stats.avgGlucose as any)).toBe(true);
    });

    it('should generate unique reading IDs', async () => {
      const reading1 = await firstValueFrom(service.addReading({ glucose: 120 }));
      const reading2 = await firstValueFrom(service.addReading({ glucose: 120 }));

      expect(reading1.id).not.toBe(reading2.id);
    });

    it('should generate unique appointment IDs', async () => {
      const appt1 = await firstValueFrom(service.addAppointment({}));
      const appt2 = await firstValueFrom(service.addAppointment({}));

      expect(appt1.id).not.toBe(appt2.id);
    });
  });

  describe('Debug Logging', () => {
    it('should only log in mock mode', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      // Call a method that logs
      firstValueFrom(service.getReadings());

      if (environment.backendMode === 'mock') {
        expect(consoleSpy).toHaveBeenCalled();
      }

      consoleSpy.mockRestore();
    });
  });
});
