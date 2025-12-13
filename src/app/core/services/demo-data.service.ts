import { Injectable } from '@angular/core';
import { fakerES as faker } from '@faker-js/faker';
import { Observable, of } from 'rxjs';
import { delay, map } from 'rxjs/operators';
import { LocalGlucoseReading } from '@models/glucose-reading.model';
import { UserProfile, AccountState } from '@models/user-profile.model';
import { Appointment } from '@models/appointment.model';

/**
 * Demo Data Service for seeding test data
 * Provides mock data for demo mode and testing
 */
@Injectable({
  providedIn: 'root',
})
export class DemoDataService {
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
        user_id: 1000,
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
      },
      {
        appointment_id: 2,
        user_id: 1000,
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
      },
      {
        appointment_id: 3,
        user_id: 1000,
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
      },
    ];

    return of(appointments).pipe(delay(500));
  }

  /**
   * Generate demo glucose readings
   */
  getDemoReadings(days: number = 30): Observable<LocalGlucoseReading[]> {
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
  getDemoManualReadingsSummary(days: number = 30): Observable<Record<string, unknown>> {
    return this.getDemoReadings(days).pipe(
      map(readings => {
        const validReadings = readings.filter(r => r.value > 0);
        const beforeMealReadings = validReadings.filter(
          (r: LocalGlucoseReading) => r.mealContext === 'beforeMeal'
        );
        const afterMealReadings = validReadings.filter(
          (r: LocalGlucoseReading) => r.mealContext === 'afterMeal'
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
   * Get demo clinical form data
   */
  getDemoClinicalForm(): Observable<Record<string, unknown>> {
    return of({
      patientInfo: {
        name: 'Usuario Demo',
        dni: '1000',
        age: 45,
        gender: 'M',
        diabetesType: 'Tipo 2',
        diagnosisDate: '2020-03-15',
      },
      vitalSigns: {
        bloodPressure: '120/80',
        heartRate: 72,
        weight: 75,
        height: 170,
        bmi: 25.95,
        temperature: 36.5,
      },
      labResults: {
        hba1c: 7.2,
        fastingGlucose: 125,
        postprandialGlucose: 165,
        cholesterol: 190,
        triglycerides: 150,
        creatinine: 0.9,
      },
      medications: [
        {
          name: 'Metformina',
          dose: '850mg',
          frequency: 'Dos veces al día',
          since: '2020-04-01',
        },
        {
          name: 'Glimepirida',
          dose: '2mg',
          frequency: 'Una vez al día',
          since: '2021-06-15',
        },
      ],
      lifestyle: {
        diet: 'Dieta balanceada, baja en carbohidratos',
        exercise: '30 minutos de caminata, 5 días a la semana',
        smoking: 'No fumador',
        alcohol: 'Consumo ocasional',
      },
      complications: {
        retinopathy: false,
        nephropathy: false,
        neuropathy: false,
        cardiovascular: false,
        other: '',
      },
      notes: 'Paciente con buen control glucémico. Continuar con plan actual.',
      nextAppointment: '3 meses',
    }).pipe(delay(400));
  }

  /**
   * Generate demo user profile (using faker for realistic data)
   */
  generateUserProfile(): UserProfile {
    // Faker locale configured via import

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
        themeMode: 'light', // Default to light theme
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
  async generateGlucoseReadings(days: number = 30): Promise<LocalGlucoseReading[]> {
    return this.getDemoReadings(days).toPromise() as Promise<LocalGlucoseReading[]>;
  }

  /**
   * Generate appointments
   */
  async generateAppointments(_count: number = 5): Promise<Appointment[]> {
    return this.getDemoAppointments().toPromise() as Promise<Appointment[]>;
  }

  /**
   * Seed all demo data into local storage/IndexedDB
   */
  async seedDemoData(): Promise<void> {
    console.log('Seeding demo data...');

    // Store demo mode flag
    localStorage.setItem('demoMode', 'true');

    // Store demo user
    const demoUser = {
      id: '1000',
      dni: '1000',
      name: 'Usuario',
      surname: 'Demo',
      email: 'demo@diabetactic.com',
      password: 'demo123',
      role: 'patient',
    };
    localStorage.setItem('demoUser', JSON.stringify(demoUser));

    // Store demo profile
    const profile = this.generateUserProfile();
    localStorage.setItem('demoProfile', JSON.stringify(profile));

    // Store demo readings
    const readings = await this.generateGlucoseReadings(30);
    localStorage.setItem('demoReadings', JSON.stringify(readings));

    // Store demo appointments
    const appointments = await this.generateAppointments(5);
    localStorage.setItem('demoAppointments', JSON.stringify(appointments));

    console.log('Demo data seeded successfully');
    console.log('✅ Demo credentials: demo@diabetactic.com / demo123');
  }

  /**
   * Clear demo data
   */
  clearDemoData(): void {
    localStorage.removeItem('demoMode');
    localStorage.removeItem('demoUser');
    // Clear other demo data from IndexedDB
    console.log('Demo data cleared');
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

  private static getFutureDate(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
  }

  private static getPastDate(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString();
  }
}
