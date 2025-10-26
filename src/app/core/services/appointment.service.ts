import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { catchError, map, retry, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

/**
 * Appointment status types
 */
export type AppointmentStatus =
  | 'pending'
  | 'confirmed'
  | 'cancelled'
  | 'completed'
  | 'no_show'
  | 'rescheduled';

/**
 * Appointment urgency levels
 */
export type AppointmentUrgency = 'routine' | 'urgent' | 'emergency';

/**
 * Doctor/Healthcare provider interface
 */
export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  title?: string;
  email?: string;
  phone?: string;
  availableDays?: string[];
  availableHours?: {
    start: string;
    end: string;
  };
  profileImage?: string;
  bio?: string;
  languages?: string[];
}

/**
 * Appointment time slot
 */
export interface TimeSlot {
  date: string;
  startTime: string;
  endTime: string;
  available: boolean;
  doctorId: string;
}

/**
 * Appointment interface
 */
export interface Appointment {
  id?: string;
  patientId: string;
  patientName?: string;
  doctorId: string;
  doctorName?: string;
  date: string;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  urgency: AppointmentUrgency;
  reason: string;
  notes?: string;
  videoCallUrl?: string;
  prescriptions?: string[];
  followUpDate?: string;
  createdAt?: string;
  updatedAt?: string;
  cancelledReason?: string;
  glucoseDataShared?: boolean;
}

/**
 * Appointment creation request
 */
export interface CreateAppointmentRequest {
  doctorId: string;
  date: string;
  startTime: string;
  endTime: string;
  urgency: AppointmentUrgency;
  reason: string;
  notes?: string;
  shareGlucoseData?: boolean;
}

/**
 * Appointment statistics
 */
export interface AppointmentStats {
  totalAppointments: number;
  completedAppointments: number;
  upcomingAppointments: number;
  cancelledAppointments: number;
  averageWaitTime?: number;
  lastAppointmentDate?: string;
  nextAppointmentDate?: string;
}

@Injectable({
  providedIn: 'root',
})
export class AppointmentService {
  private readonly baseUrl: string;
  private readonly apiPath: string;
  private readonly fullUrl: string;

  // Reactive state for appointments
  private appointmentsSubject = new BehaviorSubject<Appointment[]>([]);
  public appointments$ = this.appointmentsSubject.asObservable();

  // Reactive state for upcoming appointment
  private upcomingAppointmentSubject = new BehaviorSubject<Appointment | null>(null);
  public upcomingAppointment$ = this.upcomingAppointmentSubject.asObservable();

  constructor(private http: HttpClient) {
    const config = environment.backendServices.appointments;
    this.baseUrl = config.baseUrl;
    this.apiPath = config.apiPath;
    this.fullUrl = `${this.baseUrl}${this.apiPath}`;
  }

  /**
   * Get all appointments for the current user
   */
  getAppointments(
    status?: AppointmentStatus,
    startDate?: Date,
    endDate?: Date,
    limit = 50,
    offset = 0
  ): Observable<Appointment[]> {
    let params = new HttpParams().set('limit', limit.toString()).set('offset', offset.toString());

    if (status) {
      params = params.set('status', status);
    }
    if (startDate) {
      params = params.set('start_date', startDate.toISOString());
    }
    if (endDate) {
      params = params.set('end_date', endDate.toISOString());
    }

    return this.http.get<Appointment[]>(`${this.fullUrl}/appointments`, { params }).pipe(
      retry(2),
      tap(appointments => {
        this.appointmentsSubject.next(appointments);
        this.updateUpcomingAppointment(appointments);
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Get a single appointment by ID
   */
  getAppointment(id: string): Observable<Appointment> {
    return this.http
      .get<Appointment>(`${this.fullUrl}/appointments/${id}`)
      .pipe(retry(2), catchError(this.handleError));
  }

  /**
   * Create a new appointment request
   */
  createAppointment(request: CreateAppointmentRequest): Observable<Appointment> {
    return this.http.post<Appointment>(`${this.fullUrl}/appointments`, request).pipe(
      retry(1),
      tap(() => this.refreshAppointments()),
      catchError(this.handleError)
    );
  }

  /**
   * Update an existing appointment
   */
  updateAppointment(id: string, updates: Partial<Appointment>): Observable<Appointment> {
    return this.http.put<Appointment>(`${this.fullUrl}/appointments/${id}`, updates).pipe(
      retry(1),
      tap(() => this.refreshAppointments()),
      catchError(this.handleError)
    );
  }

  /**
   * Cancel an appointment
   */
  cancelAppointment(id: string, reason?: string): Observable<Appointment> {
    const body = {
      status: 'cancelled' as AppointmentStatus,
      cancelledReason: reason,
    };

    return this.http.put<Appointment>(`${this.fullUrl}/appointments/${id}/cancel`, body).pipe(
      retry(1),
      tap(() => this.refreshAppointments()),
      catchError(this.handleError)
    );
  }

  /**
   * Reschedule an appointment
   */
  rescheduleAppointment(
    id: string,
    newDate: string,
    newStartTime: string,
    newEndTime: string
  ): Observable<Appointment> {
    const body = {
      date: newDate,
      startTime: newStartTime,
      endTime: newEndTime,
      status: 'rescheduled' as AppointmentStatus,
    };

    return this.http.put<Appointment>(`${this.fullUrl}/appointments/${id}/reschedule`, body).pipe(
      retry(1),
      tap(() => this.refreshAppointments()),
      catchError(this.handleError)
    );
  }

  /**
   * Get list of available doctors
   */
  getDoctors(specialty?: string): Observable<Doctor[]> {
    let params = new HttpParams();
    if (specialty) {
      params = params.set('specialty', specialty);
    }

    return this.http
      .get<Doctor[]>(`${this.fullUrl}/doctors`, { params })
      .pipe(retry(2), catchError(this.handleError));
  }

  /**
   * Get doctor details by ID
   */
  getDoctor(id: string): Observable<Doctor> {
    return this.http
      .get<Doctor>(`${this.fullUrl}/doctors/${id}`)
      .pipe(retry(2), catchError(this.handleError));
  }

  /**
   * Get available time slots for a doctor
   */
  getAvailableSlots(doctorId: string, date: Date, days = 7): Observable<TimeSlot[]> {
    const params = new HttpParams()
      .set('doctor_id', doctorId)
      .set('start_date', date.toISOString())
      .set('days', days.toString());

    return this.http
      .get<TimeSlot[]>(`${this.fullUrl}/slots`, { params })
      .pipe(retry(2), catchError(this.handleError));
  }

  /**
   * Get appointment statistics
   */
  getStatistics(): Observable<AppointmentStats> {
    return this.http
      .get<AppointmentStats>(`${this.fullUrl}/appointments/stats`)
      .pipe(retry(2), catchError(this.handleError));
  }

  /**
   * Join video call for an appointment
   */
  joinVideoCall(appointmentId: string): Observable<{ url: string; token?: string }> {
    return this.http
      .post<{
        url: string;
        token?: string;
      }>(`${this.fullUrl}/appointments/${appointmentId}/join-call`, {})
      .pipe(retry(1), catchError(this.handleError));
  }

  /**
   * Share glucose data with doctor for an appointment
   */
  shareGlucoseData(
    appointmentId: string,
    dateRange?: { start: Date; end: Date }
  ): Observable<{ shared: boolean; recordCount: number }> {
    const body = dateRange
      ? {
          startDate: dateRange.start.toISOString(),
          endDate: dateRange.end.toISOString(),
        }
      : {};

    return this.http
      .post<{
        shared: boolean;
        recordCount: number;
      }>(`${this.fullUrl}/appointments/${appointmentId}/share-glucose`, body)
      .pipe(retry(1), catchError(this.handleError));
  }

  /**
   * Get appointment reminders settings
   */
  getReminderSettings(): Observable<any> {
    return this.http
      .get(`${this.fullUrl}/appointments/reminders`)
      .pipe(retry(2), catchError(this.handleError));
  }

  /**
   * Update appointment reminder settings
   */
  updateReminderSettings(settings: any): Observable<any> {
    return this.http
      .put(`${this.fullUrl}/appointments/reminders`, settings)
      .pipe(retry(1), catchError(this.handleError));
  }

  /**
   * Refresh appointments list
   */
  private refreshAppointments(): void {
    this.getAppointments().subscribe();
  }

  /**
   * Update upcoming appointment
   */
  private updateUpcomingAppointment(appointments: Appointment[]): void {
    const now = new Date();
    const upcoming = appointments
      .filter(apt => new Date(`${apt.date} ${apt.startTime}`) > now && apt.status === 'confirmed')
      .sort(
        (a, b) =>
          new Date(`${a.date} ${a.startTime}`).getTime() -
          new Date(`${b.date} ${b.startTime}`).getTime()
      )[0];

    this.upcomingAppointmentSubject.next(upcoming || null);
  }

  /**
   * Handle HTTP errors
   */
  private handleError(error: any): Observable<never> {
    let errorMessage = 'An error occurred';

    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Server-side error
      errorMessage = `Error Code: ${error.status}\nMessage: ${error.message}`;

      if (error.status === 401) {
        errorMessage = 'Unauthorized. Please log in again.';
      } else if (error.status === 404) {
        errorMessage = 'Appointment not found.';
      } else if (error.status === 409) {
        errorMessage = 'Time slot is no longer available.';
      } else if (error.status === 500) {
        errorMessage = 'Server error. Please try again later.';
      }
    }

    console.error('AppointmentService Error:', errorMessage);
    return throwError(() => new Error(errorMessage));
  }
}
