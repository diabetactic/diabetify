import { Injectable, inject } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import { environment } from '@env/environment';
import { LoggerService } from './logger.service';

export interface MockUser {
  id: string;
  username: string;
  email: string;
  name: string;
  age: number;
  diagnosisDate: Date;
  hospital: string;
  medicalTeam: string[];
  avatar?: string;
}

export interface MockReading {
  id: string;
  date: Date;
  glucose: number;
  type: 'fasting' | 'before_meal' | 'after_meal' | 'bedtime' | 'exercise';
  insulin?: number;
  carbs?: number;
  notes?: string;
  mood?: 'happy' | 'neutral' | 'sad';
  source: 'manual' | 'xdrip'; // Indicar si viene de entrada manual o importado de xDrip
}

export interface MockAppointment {
  id: string;
  date: Date;
  time: string;
  doctor: string;
  specialty: string;
  hospital: string;
  location: string; // Ej: "Consultorio 3B, 2do piso"
  status: 'upcoming' | 'completed' | 'cancelled';
  type: 'control_routine' | 'emergency' | 'follow_up' | 'nutritionist';
  notes?: string;
  reminders: boolean;
}

export interface BolusCalculation {
  carbGrams: number;
  currentGlucose: number;
  targetGlucose: number;
  carbRatio: number;
  correctionFactor: number;
  recommendedInsulin: number;
}

export interface MockStats {
  avgGlucose: number;
  avgGlucoseLast7Days: number;
  avgGlucoseLast30Days: number;
  readingsToday: number;
  readingsThisWeek: number;
  hba1c: number;
  timeInRange: number;
  timeAboveRange: number;
  timeBelowRange: number;
  trend: 'improving' | 'stable' | 'needs_attention';
}

@Injectable({ providedIn: 'root' })
export class MockDataService {
  private readonly logger = inject(LoggerService);

  private currentUser: MockUser = {
    id: 'pac001',
    username: 'demo_patient',
    email: 'sofia.rodriguez@example.com',
    name: 'Sofia Rodriguez',
    age: 12,
    diagnosisDate: new Date(2020, 5, 15),
    hospital: 'Centro Médico',
    medicalTeam: ['Dra. María González - Endocrinología', 'Lic. Ana Martínez - Nutrición'],
    avatar: 'https://i.pravatar.cc/150?img=25',
  };

  private patientParams = {
    carbRatio: 15,
    correctionFactor: 50,
    targetGlucose: 120,
    targetRange: { min: 70, max: 180 },
  };

  private readonly isMockMode = environment.backendMode === 'mock';

  private readings: MockReading[] = [
    {
      id: '1',
      date: new Date(),
      glucose: 145,
      type: 'before_meal',
      insulin: 5,
      carbs: 45,
      notes: 'Antes del almuerzo',
      mood: 'happy',
      source: 'manual',
    },
    {
      id: '2',
      date: new Date(Date.now() - 3600000 * 2),
      glucose: 180,
      type: 'after_meal',
      insulin: 3,
      notes: 'Post-desayuno',
      mood: 'neutral',
      source: 'manual',
    },
    {
      id: '3',
      date: new Date(Date.now() - 3600000 * 6),
      glucose: 95,
      type: 'fasting',
      mood: 'happy',
      source: 'xdrip', // Ejemplo de lectura que vendría de xDrip/Tidepool
    },
    {
      id: '4',
      date: new Date(Date.now() - 86400000),
      glucose: 210,
      type: 'after_meal',
      insulin: 6,
      carbs: 60,
      notes: 'Cumpleaños, comí torta',
      mood: 'happy',
      source: 'manual',
    },
    {
      id: '5',
      date: new Date(Date.now() - 86400000),
      glucose: 110,
      type: 'bedtime',
      mood: 'happy',
      source: 'manual',
    },
  ];

  private appointments: MockAppointment[] = [
    {
      id: 'appt001',
      date: new Date(Date.now() + 86400000 * 7),
      time: '10:30 AM',
      doctor: 'Dra. María González',
      specialty: 'Endocrinología Pediátrica',
      hospital: 'Centro Médico',
      location: 'Consultorio 3B, 2do piso',
      status: 'upcoming',
      type: 'control_routine',
      notes: 'Control trimestral + análisis HbA1c',
      reminders: true,
    },
    {
      id: 'appt002',
      date: new Date(Date.now() + 86400000 * 14),
      time: '2:00 PM',
      doctor: 'Lic. Ana Martínez',
      specialty: 'Nutrición',
      hospital: 'Centro Médico',
      location: 'Consultorio 1A, 1er piso',
      status: 'upcoming',
      type: 'nutritionist',
      notes: 'Ajuste de plan alimentario',
      reminders: true,
    },
    {
      id: 'appt003',
      date: new Date(Date.now() + 86400000 * 21),
      time: '11:00 AM',
      doctor: 'Dr. Carlos Rodriguez',
      specialty: 'Pediatría',
      hospital: 'Centro Médico',
      location: 'Consultorio 2C, 1er piso',
      status: 'upcoming',
      type: 'follow_up',
      notes: 'Seguimiento de control pediátrico general',
      reminders: true,
    },
    {
      id: 'appt004',
      date: new Date(Date.now() - 86400000 * 90),
      time: '10:00 AM',
      doctor: 'Dra. María González',
      specialty: 'Endocrinología Pediátrica',
      hospital: 'Centro Médico',
      location: 'Consultorio 3B, 2do piso',
      status: 'completed',
      type: 'control_routine',
      notes: 'Resultado HbA1c: 6.5%',
      reminders: false,
    },
    {
      id: 'appt005',
      date: new Date(Date.now() - 86400000 * 120),
      time: '9:30 AM',
      doctor: 'Lic. Maria Lopez',
      specialty: 'Nutrición',
      hospital: 'Centro Médico',
      location: 'Consultorio 1A, 1er piso',
      status: 'completed',
      type: 'nutritionist',
      notes: 'Plan alimentario actualizado',
      reminders: false,
    },
  ];

  constructor() {
    this.debugLog('🏥 DIABETACTIC Mock Service - Centro Médico');
  }

  // ====== AUTH ======

  login(username: string, _password: string): Observable<MockUser> {
    this.debugLog('🎭 MOCK LOGIN:', username);
    return of(this.currentUser).pipe(delay(800));
  }

  logout(): Observable<boolean> {
    this.debugLog('🎭 MOCK LOGOUT');
    return of(true).pipe(delay(200));
  }

  getCurrentUser(): Observable<MockUser> {
    return of(this.currentUser);
  }

  // ====== READINGS ======

  getReadings(startDate?: Date, endDate?: Date): Observable<MockReading[]> {
    let filtered = [...this.readings];

    if (startDate) {
      filtered = filtered.filter(r => new Date(r.date) >= startDate);
    }
    if (endDate) {
      filtered = filtered.filter(r => new Date(r.date) <= endDate);
    }

    filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    this.debugLog('🎭 MOCK GET READINGS:', filtered.length);
    return of(filtered).pipe(delay(300));
  }

  addReading(reading: Partial<MockReading>): Observable<MockReading> {
    const newReading: MockReading = {
      id: `read_${Date.now()}`,
      date: reading.date || new Date(),
      glucose: reading.glucose || 100,
      type: reading.type || 'before_meal',
      insulin: reading.insulin,
      carbs: reading.carbs,
      notes: reading.notes,
      mood: reading.mood,
      source: 'manual', // Siempre manual desde la app
    };

    this.readings.unshift(newReading);
    this.debugLog('🎭 MOCK ADD READING:', newReading);
    return of(newReading).pipe(delay(500));
  }

  deleteReading(id: string): Observable<boolean> {
    const index = this.readings.findIndex(r => r.id === id);
    if (index > -1) {
      this.readings.splice(index, 1);
      this.debugLog('🎭 MOCK DELETE READING:', id);
    }
    return of(true).pipe(delay(300));
  }

  // ====== BOLUS CALCULATOR ======

  calculateBolus(params: {
    carbGrams: number;
    currentGlucose: number;
  }): Observable<BolusCalculation> {
    const { carbGrams, currentGlucose } = params;
    const { carbRatio, correctionFactor, targetGlucose } = this.patientParams;

    const carbInsulin = carbGrams / carbRatio;
    const glucoseDiff = currentGlucose - targetGlucose;
    const correctionInsulin = glucoseDiff > 0 ? glucoseDiff / correctionFactor : 0;
    const totalInsulin = Math.max(0, carbInsulin + correctionInsulin);

    const result: BolusCalculation = {
      carbGrams,
      currentGlucose,
      targetGlucose,
      carbRatio,
      correctionFactor,
      recommendedInsulin: Math.round(totalInsulin * 10) / 10,
    };

    this.debugLog('🎭 MOCK BOLUS CALCULATION:', result);
    // Note: Removed delay(400) as it causes issues with zone.js in E2E tests
    // The delay isn't necessary for mock mode - it was just simulating network latency
    return of(result);
  }

  // ====== APPOINTMENTS - FUNCIONALIDAD IMPORTANTE ======

  getAppointments(
    filterStatus?: 'upcoming' | 'completed' | 'cancelled'
  ): Observable<MockAppointment[]> {
    let filtered = [...this.appointments];

    if (filterStatus) {
      filtered = filtered.filter(a => a.status === filterStatus);
    }

    // Ordenar: upcoming primero (por fecha ascendente), luego completed (por fecha descendente)
    filtered.sort((a, b) => {
      if (a.status === 'upcoming' && b.status === 'upcoming') {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      }
      if (a.status === 'completed' && b.status === 'completed') {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      }
      if (a.status === 'upcoming') return -1;
      return 1;
    });

    this.debugLog('🎭 MOCK GET APPOINTMENTS:', filtered.length);
    return of(filtered).pipe(delay(300));
  }

  getAppointmentById(id: string): Observable<MockAppointment | null> {
    const appt = this.appointments.find(a => a.id === id);
    this.debugLog('🎭 MOCK GET APPOINTMENT BY ID:', id, appt);
    return of(appt || null).pipe(delay(200));
  }

  addAppointment(appointment: Partial<MockAppointment>): Observable<MockAppointment> {
    const newAppt: MockAppointment = {
      id: `appt_${Date.now()}`,
      date: appointment.date || new Date(),
      time: appointment.time || '10:00 AM',
      doctor: appointment.doctor || 'Dr. Demo',
      specialty: appointment.specialty || 'General',
      hospital: appointment.hospital || 'Centro Médico',
      location: appointment.location || 'Consultorio TBD',
      status: 'upcoming',
      type: appointment.type || 'control_routine',
      notes: appointment.notes,
      reminders: appointment.reminders ?? true,
    };

    this.appointments.unshift(newAppt);
    this.debugLog('🎭 MOCK ADD APPOINTMENT:', newAppt);
    return of(newAppt).pipe(delay(500));
  }

  updateAppointment(
    id: string,
    updates: Partial<MockAppointment>
  ): Observable<MockAppointment | null> {
    const appt = this.appointments.find(a => a.id === id);
    if (appt) {
      Object.assign(appt, updates);
      this.debugLog('🎭 MOCK UPDATE APPOINTMENT:', appt);
      return of(appt).pipe(delay(400));
    }
    return of(null).pipe(delay(400));
  }

  cancelAppointment(id: string): Observable<boolean> {
    const appt = this.appointments.find(a => a.id === id);
    if (appt) {
      appt.status = 'cancelled';
      this.debugLog('🎭 MOCK CANCEL APPOINTMENT:', id);
    }
    return of(true).pipe(delay(300));
  }

  deleteAppointment(id: string): Observable<boolean> {
    const index = this.appointments.findIndex(a => a.id === id);
    if (index > -1) {
      this.appointments.splice(index, 1);
      this.debugLog('🎭 MOCK DELETE APPOINTMENT:', id);
    }
    return of(true).pipe(delay(300));
  }

  // ====== STATS ======

  getStats(): Observable<MockStats> {
    const last7Days = this.readings.filter(
      r => new Date(r.date) >= new Date(Date.now() - 86400000 * 7)
    );

    const last30Days = this.readings.filter(
      r => new Date(r.date) >= new Date(Date.now() - 86400000 * 30)
    );

    const avgGlucose7 = last7Days.reduce((sum, r) => sum + r.glucose, 0) / last7Days.length;
    const avgGlucose30 = last30Days.reduce((sum, r) => sum + r.glucose, 0) / last30Days.length;

    const inRange = last30Days.filter(
      r =>
        r.glucose >= this.patientParams.targetRange.min &&
        r.glucose <= this.patientParams.targetRange.max
    ).length;

    const aboveRange = last30Days.filter(
      r => r.glucose > this.patientParams.targetRange.max
    ).length;

    const belowRange = last30Days.filter(
      r => r.glucose < this.patientParams.targetRange.min
    ).length;

    const timeInRange = Math.round((inRange / last30Days.length) * 100);
    const timeAboveRange = Math.round((aboveRange / last30Days.length) * 100);
    const timeBelowRange = Math.round((belowRange / last30Days.length) * 100);

    const estimatedHbA1c = (avgGlucose30 + 46.7) / 28.7;

    let trend: 'improving' | 'stable' | 'needs_attention' = 'stable';
    if (timeInRange >= 70 && avgGlucose30 <= 154) {
      trend = 'improving';
    } else if (timeInRange < 60 || avgGlucose30 > 180) {
      trend = 'needs_attention';
    }

    const stats: MockStats = {
      avgGlucose: Math.round(avgGlucose30),
      avgGlucoseLast7Days: Math.round(avgGlucose7),
      avgGlucoseLast30Days: Math.round(avgGlucose30),
      readingsToday: this.readings.filter(
        r => new Date(r.date).toDateString() === new Date().toDateString()
      ).length,
      readingsThisWeek: last7Days.length,
      hba1c: Math.round(estimatedHbA1c * 10) / 10,
      timeInRange,
      timeAboveRange,
      timeBelowRange,
      trend,
    };

    this.debugLog('🎭 MOCK GET STATS:', stats);
    return of(stats).pipe(delay(400));
  }

  // ====== PATIENT PARAMETERS ======

  getPatientParams() {
    return { ...this.patientParams };
  }

  updatePatientParams(params: Partial<typeof this.patientParams>): Observable<boolean> {
    Object.assign(this.patientParams, params);
    this.debugLog('🎭 MOCK UPDATE PATIENT PARAMS:', this.patientParams);
    return of(true).pipe(delay(300));
  }

  private debugLog(message?: unknown, ...optionalParams: unknown[]): void {
    if (this.isMockMode) {
      this.logger.debug(
        'MockDataService',
        String(message),
        optionalParams.length > 0 ? optionalParams : undefined
      );
    }
  }
}
