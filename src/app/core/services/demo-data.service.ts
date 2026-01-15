import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';

// Lazy-loaded faker instance (only loaded in mock mode)
let fakerInstance: typeof import('@faker-js/faker').fakerES | null = null;
async function getFaker(): Promise<typeof import('@faker-js/faker').fakerES> {
  if (!fakerInstance) {
    const { fakerES } = await import('@faker-js/faker');
    fakerInstance = fakerES;
  }
  return fakerInstance;
}
import { delay, map } from 'rxjs/operators';
import { LocalGlucoseReading } from '@models/glucose-reading.model';
import { UserProfile, AccountState } from '@models/user-profile.model';
import { Appointment } from '@models/appointment.model';
import { LoggerService } from '@services/logger.service';
import { db } from '@services/database.service';

/**
 * Demo Data Service for seeding test data
 * Provides mock data for demo mode and testing
 */
@Injectable({
  providedIn: 'root',
})
export class DemoDataService {
  private readonly logger = inject(LoggerService);
  /**
   * Demo doctors list
   */
  private readonly DEMO_DOCTORS = [
    {
      id: 'dr-001',
      name: 'Dr. Ana García',
      specialty: 'Endocrinología',
      hospital: 'Hospital General',
      experience: '15 años',
      rating: 4.8,
      reviews: 127,
      availableDays: ['Lunes', 'Miércoles', 'Viernes'],
      profileImage: 'assets/demo/doctors/dr-garcia.jpg',
    },
    {
      id: 'dr-002',
      name: 'Dr. Carlos Mendoza',
      specialty: 'Diabetología',
      hospital: 'Centro Médico San Lucas',
      experience: '12 años',
      rating: 4.9,
      reviews: 203,
      availableDays: ['Martes', 'Jueves'],
      profileImage: 'assets/demo/doctors/dr-mendoza.jpg',
    },
    {
      id: 'dr-003',
      name: 'Dra. Laura Martínez',
      specialty: 'Medicina Interna',
      hospital: 'Clínica Universitaria',
      experience: '8 años',
      rating: 4.7,
      reviews: 89,
      availableDays: ['Lunes', 'Martes', 'Jueves'],
      profileImage: 'assets/demo/doctors/dr-martinez.jpg',
    },
    {
      id: 'dr-004',
      name: 'Dr. Roberto Silva',
      specialty: 'Endocrinología Pediátrica',
      hospital: 'Hospital Pediátrico',
      experience: '20 años',
      rating: 4.9,
      reviews: 315,
      availableDays: ['Miércoles', 'Viernes'],
      profileImage: 'assets/demo/doctors/dr-silva.jpg',
    },
  ];

  /**
   * Demo time slots
   */
  private readonly DEMO_TIME_SLOTS = [
    '08:00',
    '08:30',
    '09:00',
    '09:30',
    '10:00',
    '10:30',
    '11:00',
    '11:30',
    '14:00',
    '14:30',
    '15:00',
    '15:30',
    '16:00',
    '16:30',
    '17:00',
  ];

  /**
   * Demo appointment types
   */
  private readonly APPOINTMENT_TYPES = [
    { id: 'regular', name: 'Control Regular', duration: 30, icon: 'calendar-outline' },
    { id: 'first-visit', name: 'Primera Visita', duration: 45, icon: 'person-add-outline' },
    { id: 'follow-up', name: 'Seguimiento', duration: 20, icon: 'refresh-outline' },
    { id: 'urgent', name: 'Urgente', duration: 30, icon: 'warning-outline' },
    { id: 'teleconsult', name: 'Teleconsulta', duration: 20, icon: 'videocam-outline' },
  ];

  /**
   * Get demo doctors list
   */
  getDoctors(): Observable<Array<Record<string, unknown>>> {
    return of(this.DEMO_DOCTORS).pipe(
      delay(500), // Simulate network delay
      map(doctors =>
        doctors.map(doc => ({
          ...doc,
          nextAvailable: this.getNextAvailableDate(doc.availableDays),
        }))
      )
    );
  }

  /**
   * Get available time slots for a doctor on a specific date
   */
  getTimeSlots(doctorId: string, date: string): Observable<Array<Record<string, unknown>>> {
    const baseSlots = [...this.DEMO_TIME_SLOTS];
    const randomUnavailable = DemoDataService.getRandomSlots(
      baseSlots,
      3 + Math.floor(Math.random() * 4)
    );

    const slots = baseSlots.map(time => ({
      time,
      available: !randomUnavailable.includes(time),
      doctorId,
      date,
    }));

    return of(slots).pipe(delay(300));
  }

  /**
   * Get appointment types
   */
  getAppointmentTypes(): Observable<Array<Record<string, unknown>>> {
    return of(this.APPOINTMENT_TYPES).pipe(delay(200));
  }

  /**
   * Create demo appointments (clinical treatment records)
   */
  getDemoAppointments(): Observable<Appointment[]> {
    const appointments: Appointment[] = [
      {
        appointment_id: 1,
        user_id: 40123456,
        glucose_objective: 120,
        insulin_type: 'rapid',
        dose: 10,
        fast_insulin: 'Humalog',
        fixed_dose: 5,
        ratio: 10,
        sensitivity: 50,
        pump_type: 'none',
        control_data: 'Control trimestral - niveles estables',
        motive: ['control_routine'],
        other_motive: null,
        another_treatment: null,
        status: 'CREATED',
        timestamps: { created_at: new Date().toISOString() },
      },
      {
        appointment_id: 2,
        user_id: 40123456,
        glucose_objective: 110,
        insulin_type: 'long',
        dose: 20,
        fast_insulin: 'Lantus',
        fixed_dose: 20,
        ratio: 12,
        sensitivity: 40,
        pump_type: 'none',
        control_data: 'Ajuste de dosis necesario',
        motive: ['adjustment', 'follow_up'],
        other_motive: 'Revisar lecturas matutinas',
        another_treatment: 'Metformina 500mg',
        status: 'CREATED',
        timestamps: { created_at: new Date().toISOString() },
      },
      {
        appointment_id: 3,
        user_id: 40123456,
        glucose_objective: 100,
        insulin_type: 'mixed',
        dose: 15,
        fast_insulin: 'NovoRapid',
        fixed_dose: 10,
        ratio: 8,
        sensitivity: 45,
        pump_type: 'medtronic',
        control_data: 'Transición a bomba de insulina',
        motive: ['consultation'],
        other_motive: null,
        another_treatment: null,
        status: 'CREATED',
        timestamps: { created_at: new Date().toISOString() },
      },
    ];

    return of(appointments).pipe(delay(500));
  }

  /**
   * Generate demo glucose readings
   */
  getDemoReadings(days = 30): Observable<LocalGlucoseReading[]> {
    const readings: LocalGlucoseReading[] = [];
    const now = new Date();
    // Typically 4 readings per day: Before breakfast, lunch, dinner, bedtime

    for (let day = 0; day < days; day++) {
      const date = new Date(now);
      date.setDate(date.getDate() - day);

      // Morning reading (before breakfast)
      if (Math.random() > 0.1) {
        // 90% chance of having a reading
        readings.push(this.createReading(date, 7, 0, 'beforeMeal', 85, 130));
      }

      // Lunch reading
      if (Math.random() > 0.2) {
        // 80% chance
        const mealType = Math.random() > 0.5 ? 'beforeMeal' : 'afterMeal';
        const range = mealType === 'beforeMeal' ? [80, 120] : [100, 180];
        readings.push(this.createReading(date, 13, 0, mealType, range[0], range[1]));
      }

      // Dinner reading
      if (Math.random() > 0.15) {
        // 85% chance
        const mealType = Math.random() > 0.5 ? 'beforeMeal' : 'afterMeal';
        const range = mealType === 'beforeMeal' ? [80, 120] : [100, 180];
        readings.push(this.createReading(date, 19, 30, mealType, range[0], range[1]));
      }

      // Bedtime reading
      if (Math.random() > 0.3) {
        // 70% chance
        readings.push(this.createReading(date, 22, 0, 'bedtime', 90, 140));
      }

      // Occasionally add an exercise or random reading
      if (Math.random() > 0.7) {
        const hour = 15 + Math.floor(Math.random() * 3);
        readings.push(this.createReading(date, hour, 30, 'exercise', 70, 110));
      }
    }

    return of(readings).pipe(delay(300));
  }

  /**
   * Get demo manual readings summary for appointment sharing
   */
  getDemoManualReadingsSummary(days = 30): Observable<Record<string, unknown>> {
    return this.getDemoReadings(days).pipe(
      map(readings => {
        const validReadings = readings.filter(r => r.value > 0);
        const beforeMealReadings = validReadings.filter(
          (r: LocalGlucoseReading) => r.mealContext === 'DESAYUNO' || r.mealContext === 'ALMUERZO'
        );
        const afterMealReadings = validReadings.filter(
          (r: LocalGlucoseReading) => r.mealContext === 'MERIENDA' || r.mealContext === 'CENA'
        );

        return {
          period: {
            start: new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString(),
            end: new Date().toISOString(),
          },
          statistics: {
            totalReadings: validReadings.length,
            averageGlucose: Math.round(
              validReadings.reduce((sum, r) => sum + r.value, 0) / validReadings.length
            ),
            averageBeforeMeal:
              beforeMealReadings.length > 0
                ? Math.round(
                    beforeMealReadings.reduce((sum, r) => sum + r.value, 0) /
                      beforeMealReadings.length
                  )
                : null,
            averageAfterMeal:
              afterMealReadings.length > 0
                ? Math.round(
                    afterMealReadings.reduce((sum, r) => sum + r.value, 0) /
                      afterMealReadings.length
                  )
                : null,
            inRangePercentage: Math.round(
              (validReadings.filter(r => r.value >= 70 && r.value <= 180).length /
                validReadings.length) *
                100
            ),
            belowRangePercentage: Math.round(
              (validReadings.filter(r => r.value < 70).length / validReadings.length) * 100
            ),
            aboveRangePercentage: Math.round(
              (validReadings.filter(r => r.value > 180).length / validReadings.length) * 100
            ),
            readingsPerDay: Math.round(validReadings.length / days),
          },
          patterns: {
            morningAverage:
              validReadings.filter(r => new Date(r.time).getHours() < 10).length > 0
                ? Math.round(
                    validReadings
                      .filter(r => new Date(r.time).getHours() < 10)
                      .reduce((sum, r) => sum + r.value, 0) /
                      validReadings.filter(r => new Date(r.time).getHours() < 10).length
                  )
                : null,
            afternoonAverage:
              validReadings.filter(
                r => new Date(r.time).getHours() >= 12 && new Date(r.time).getHours() < 18
              ).length > 0
                ? Math.round(
                    validReadings
                      .filter(
                        r => new Date(r.time).getHours() >= 12 && new Date(r.time).getHours() < 18
                      )
                      .reduce((sum, r) => sum + r.value, 0) /
                      validReadings.filter(
                        r => new Date(r.time).getHours() >= 12 && new Date(r.time).getHours() < 18
                      ).length
                  )
                : null,
            nightAverage:
              validReadings.filter(r => new Date(r.time).getHours() >= 20).length > 0
                ? Math.round(
                    validReadings
                      .filter(r => new Date(r.time).getHours() >= 20)
                      .reduce((sum, r) => sum + r.value, 0) /
                      validReadings.filter(r => new Date(r.time).getHours() >= 20).length
                  )
                : null,
          },
          lastReading: validReadings.length > 0 ? validReadings[0] : null,
          notes: 'Datos de demostración generados automáticamente',
        };
      })
    );
  }

  /**
   * Generate demo user profile (using faker for realistic data)
   */
  async generateUserProfile(): Promise<UserProfile> {
    const faker = await getFaker();

    return {
      id: faker.string.uuid(),
      name: faker.person.fullName(),
      age: faker.number.int({ min: 25, max: 70 }),
      accountState: AccountState.ACTIVE,
      dateOfBirth: faker.date
        .birthdate({ min: 25, max: 70, mode: 'age' })
        .toISOString()
        .split('T')[0],
      diabetesType: faker.helpers.arrayElement(['type1', 'type2'] as const),
      diagnosisDate: faker.date.past({ years: 5 }).toISOString().split('T')[0],
      tidepoolConnection: {
        connected: false,
      },
      preferences: {
        glucoseUnit: 'mg/dL',
        colorPalette: 'default',
        themeMode: 'light',
        highContrastMode: false,
        targetRange: {
          min: 70,
          max: 180,
          unit: 'mg/dL',
          label: 'Default',
        },
        notificationsEnabled: true,
        soundEnabled: true,
        showTrendArrows: true,
        autoSync: false,
        syncInterval: 15,
        language: 'es',
        dateFormat: '24h',
      },
      createdAt: faker.date.past({ years: 2 }).toISOString(),
      updatedAt: new Date().toISOString(),
      healthcareProvider: {
        name: `Dr. ${faker.person.fullName()}`,
        phone: faker.phone.number(),
        email: faker.internet.email(),
      },
      emergencyContact: {
        name: faker.person.fullName(),
        relationship: faker.helpers.arrayElement([
          'Esposo/a',
          'Hijo/a',
          'Padre/Madre',
          'Hermano/a',
        ]),
        phone: faker.phone.number(),
      },
      hasCompletedOnboarding: true,
    } as UserProfile;
  }

  /**
   * Generate glucose readings with realistic data
   */
  async generateGlucoseReadings(days = 30): Promise<LocalGlucoseReading[]> {
    return this.getDemoReadings(days).toPromise() as Promise<LocalGlucoseReading[]>;
  }

  private buildDeterministicReadings(): LocalGlucoseReading[] {
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const statusFor = (mgdl: number): LocalGlucoseReading['status'] => {
      if (mgdl < 54) return 'critical-low';
      if (mgdl < 70) return 'low';
      if (mgdl > 250) return 'critical-high';
      if (mgdl >= 180) return 'high';
      return 'normal';
    };

    const build = (
      baseDay: Date,
      hour: number,
      minute: number,
      value: number,
      mealContext?: string
    ): LocalGlucoseReading => {
      const t = new Date(baseDay);
      t.setHours(hour, minute, 0, 0);
      const iso = t.toISOString();
      const id = `demo_${baseDay.getTime()}_${hour}_${minute}_${value}`;
      return {
        id,
        localId: id,
        type: 'smbg',
        value,
        units: 'mg/dL',
        time: iso,
        synced: true,
        userId: '40123456',
        localStoredAt: iso,
        isLocalOnly: false,
        status: statusFor(value),
        mealContext,
      } as LocalGlucoseReading;
    };

    // Keep labels stable for screenshots: only use Today/Yesterday buckets.
    return [
      build(today, 7, 30, 92, 'beforeMeal'),
      build(today, 10, 15, 135, 'afterMeal'),
      build(today, 13, 0, 72, 'beforeMeal'),
      build(today, 15, 45, 205, 'afterMeal'),
      build(today, 18, 30, 160, 'beforeMeal'),
      build(today, 22, 0, 58, 'bedtime'),
      build(yesterday, 7, 20, 98, 'beforeMeal'),
      build(yesterday, 12, 50, 175, 'afterMeal'),
      build(yesterday, 16, 10, 250, 'afterMeal'),
      build(yesterday, 19, 5, 68, 'beforeMeal'),
    ];
  }

  private async seedReadingsToDexie(readings: LocalGlucoseReading[]): Promise<void> {
    // Ensure stable demo data exists in the same storage layer used by the UI (Dexie/IndexedDB).
    try {
      await db.transaction('rw', [db.readings], async () => {
        await db.readings.clear();
        await db.readings.bulkPut(readings);
      });
    } catch (error) {
      if ((error as Error).name === 'PrematureCommitError') {
        await db.readings.clear();
        await db.readings.bulkPut(readings);
      } else {
        throw error;
      }
    }
  }

  /**
   * Generate appointments
   */
  async generateAppointments(_count = 5): Promise<Appointment[]> {
    return this.getDemoAppointments().toPromise() as Promise<Appointment[]>;
  }

  /**
   * Seed all demo data into local storage/IndexedDB
   */
  async seedDemoData(): Promise<void> {
    this.logger.info('DemoData', 'Seeding demo data...');

    // Store demo mode flag
    localStorage.setItem('demoMode', 'true');

    // Store demo user
    const demoUser = {
      id: '40123456',
      dni: '40123456',
      name: 'Usuario',
      surname: 'Demo',
      email: 'demo@diabetactic.com',
      password: 'thepassword', // Public test credentials (primary account)
      role: 'patient',
    };
    localStorage.setItem('demoUser', JSON.stringify(demoUser));

    // Store demo profile
    const profile = await this.generateUserProfile();
    localStorage.setItem('demoProfile', JSON.stringify(profile));

    // Store demo readings
    const readings = this.buildDeterministicReadings();
    localStorage.setItem('demoReadings', JSON.stringify(readings));
    await this.seedReadingsToDexie(readings);

    // Store demo appointments
    const appointments = await this.generateAppointments(5);
    localStorage.setItem('demoAppointments', JSON.stringify(appointments));

    this.logger.info('DemoData', 'Demo data seeded successfully');
    this.logger.info('DemoData', 'Demo credentials: 40123456 / thepassword');
  }

  /**
   * Clear demo data
   */
  clearDemoData(): void {
    localStorage.removeItem('demoMode');
    localStorage.removeItem('demoUser');
    // Clear other demo data from IndexedDB
    this.logger.info('DemoData', 'Demo data cleared');
  }

  /**
   * Ensure demo data is seeded if database is empty
   */
  async ensureSeeded(): Promise<void> {
    const count = await db.readings.count();
    if (count === 0) {
      this.logger.info('DemoData', 'Database empty in mock mode, seeding demo data...');
      await this.seedDemoData();
    } else {
      this.logger.info('DemoData', 'Database already seeded', { count });
    }
  }

  /**
   * Check if demo mode is active
   */
  isDemoMode(): boolean {
    return localStorage.getItem('demoMode') === 'true';
  }

  // Helper methods

  private createReading(
    date: Date,
    hour: number,
    minute: number,
    context: string,
    minValue: number,
    maxValue: number
  ): LocalGlucoseReading {
    const timestamp = new Date(date);
    timestamp.setHours(hour, minute, 0, 0);

    // Add some randomness to the time
    timestamp.setMinutes(timestamp.getMinutes() + Math.floor(Math.random() * 30) - 15);

    // Generate realistic glucose value with occasional outliers
    let glucoseValue: number;
    const random = Math.random();
    if (random < 0.7) {
      // 70% in normal range
      glucoseValue = minValue + Math.random() * (maxValue - minValue);
    } else if (random < 0.9) {
      // 20% slightly out of range
      glucoseValue =
        Math.random() > 0.5 ? maxValue + Math.random() * 30 : minValue - Math.random() * 20;
    } else {
      // 10% significantly out of range (hypo or hyper events)
      glucoseValue = Math.random() > 0.5 ? 200 + Math.random() * 100 : 50 + Math.random() * 20;
    }

    return {
      id: `demo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'smbg' as const,
      value: Math.round(glucoseValue),
      units: 'mg/dL' as const,
      time: timestamp.toISOString(),
      context: context as 'beforeMeal' | 'afterMeal' | 'bedtime' | 'exercise' | 'other',
      notes: DemoDataService.getRandomNote(glucoseValue, context),
      deviceId: 'demo-device',
      localOnly: false,
      synced: true,
      createdAt: timestamp.toISOString(),
      updatedAt: timestamp.toISOString(),
    } as LocalGlucoseReading;
  }

  private static getRandomNote(value: number, context: string): string | undefined {
    if (Math.random() > 0.8) {
      // 20% chance of having a note
      if (value < 70) {
        return 'Me sentí mareado/a';
      } else if (value > 200) {
        return 'Comí carbohidratos extra';
      } else if (context === 'exercise') {
        return 'Caminata de 30 minutos';
      } else if (context === 'beforeMeal') {
        return 'Antes del desayuno';
      }
    }
    return undefined;
  }

  private getNextAvailableDate(availableDays: string[]): string {
    const dayMap: { [key: string]: number } = {
      Lunes: 1,
      Martes: 2,
      Miércoles: 3,
      Jueves: 4,
      Viernes: 5,
    };

    const today = new Date();

    for (let i = 1; i <= 7; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() + i);
      const checkDay = checkDate.getDay();

      const dayName = Object.keys(dayMap).find(key => dayMap[key] === checkDay);
      if (dayName && availableDays.includes(dayName)) {
        return checkDate.toISOString().split('T')[0];
      }
    }

    return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  }

  private static getRandomSlots(slots: string[], count: number): string[] {
    const shuffled = [...slots].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }
}
