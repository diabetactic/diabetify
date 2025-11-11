/**
 * Appointment Service
 *
 * Manages healthcare appointments and data sharing.
 * All API calls are routed through the API Gateway for centralized
 * authentication, caching, and error handling.
 */

import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, throwError, from } from 'rxjs';
import { catchError, map, tap, switchMap } from 'rxjs/operators';
import { ApiGatewayService, ApiResponse } from './api-gateway.service';
import { ReadingsService, TeleAppointmentReadingSummary } from './readings.service';
import { TranslationService } from './translation.service';

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
 * Simplified appointment creation from UI
 */
export interface SimpleAppointmentRequest {
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  specialty: string;
  date: string;
  time: string;
  type: string;
  location: string;
  notes?: string;
  status: AppointmentStatus;
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

/**
 * Share glucose data response
 */
export interface ShareGlucoseResponse {
  shared: boolean;
  recordCount: number;
  message?: string;
}

@Injectable({
  providedIn: 'root',
})
export class AppointmentService {
  // Reactive state for appointments
  private appointmentsSubject = new BehaviorSubject<Appointment[]>([]);
  public appointments$ = this.appointmentsSubject.asObservable();

  // Reactive state for upcoming appointment
  private upcomingAppointmentSubject = new BehaviorSubject<Appointment | null>(null);
  public upcomingAppointment$ = this.upcomingAppointmentSubject.asObservable();

  constructor(
    private apiGateway: ApiGatewayService,
    private readingsService: ReadingsService,
    private translationService: TranslationService
  ) {}

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
    const params: any = {
      limit: limit.toString(),
      offset: offset.toString(),
    };

    if (status) {
      params.status = status;
    }
    if (startDate) {
      params.start_date = startDate.toISOString();
    }
    if (endDate) {
      params.end_date = endDate.toISOString();
    }

    return this.apiGateway.request<Appointment[]>('appointments.list', { params }).pipe(
      map(response => {
        if (response.success && response.data) {
          return response.data;
        }
        throw new Error(response.error?.message || 'Failed to fetch appointments');
      }),
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
    // Since we don't have a specific endpoint for single appointment, fetch from list
    return this.getAppointments().pipe(
      map(appointments => {
        const appointment = appointments.find(apt => apt.id === id);
        if (!appointment) {
          throw new Error('Appointment not found');
        }
        return appointment;
      })
    );
  }

  /**
   * Create a new appointment request
   */
  createAppointment(
    request: CreateAppointmentRequest | SimpleAppointmentRequest
  ): Observable<Appointment> {
    // Check if it's a simple request from the UI
    const isSimpleRequest = 'time' in request;

    let apiBody: any;

    if (isSimpleRequest) {
      // Convert simple request to API format
      const simpleReq = request as SimpleAppointmentRequest;
      apiBody = {
        patient_id: simpleReq.patientId,
        patient_name: simpleReq.patientName,
        doctor_id: simpleReq.doctorId,
        doctor_name: simpleReq.doctorName,
        specialty: simpleReq.specialty,
        date: simpleReq.date,
        time: simpleReq.time,
        type: simpleReq.type,
        location: simpleReq.location,
        notes: simpleReq.notes,
        status: simpleReq.status,
      };
    } else {
      apiBody = request;
    }

    return this.apiGateway.request<Appointment>('appointments.create', { body: apiBody }).pipe(
      map(response => {
        if (response.success && response.data) {
          return response.data;
        }
        // If no data but success, create a local appointment object
        if (response.success && isSimpleRequest) {
          const simpleReq = request as SimpleAppointmentRequest;
          return {
            id: `apt-${Date.now()}`,
            patientId: simpleReq.patientId,
            patientName: simpleReq.patientName,
            doctorId: simpleReq.doctorId,
            doctorName: simpleReq.doctorName,
            date: simpleReq.date,
            startTime: simpleReq.time,
            endTime: simpleReq.time, // Will be calculated by backend
            status: simpleReq.status,
            urgency: 'routine' as AppointmentUrgency,
            reason: simpleReq.type,
            notes: simpleReq.notes,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          } as Appointment;
        }
        throw new Error(response.error?.message || 'Failed to create appointment');
      }),
      tap(() => this.refreshAppointments()),
      catchError(this.handleError)
    );
  }

  /**
   * Update an existing appointment
   */
  updateAppointment(id: string, updates: Partial<Appointment>): Observable<Appointment> {
    return this.apiGateway
      .request<Appointment>('appointments.update', { body: updates }, { id })
      .pipe(
        map(response => {
          if (response.success && response.data) {
            return response.data;
          }
          throw new Error(response.error?.message || 'Failed to update appointment');
        }),
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

    return this.apiGateway.request<Appointment>('appointments.cancel', { body }, { id }).pipe(
      map(response => {
        if (response.success && response.data) {
          return response.data;
        }
        throw new Error(response.error?.message || 'Failed to cancel appointment');
      }),
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

    // Use the update endpoint for rescheduling
    return this.updateAppointment(id, body);
  }

  /**
   * Get list of available doctors
   */
  getDoctors(specialty?: string): Observable<Doctor[]> {
    const params: any = {};
    if (specialty) {
      params.specialty = specialty;
    }

    return this.apiGateway.request<Doctor[]>('appointments.doctors.list', { params }).pipe(
      map(response => {
        if (response.success && response.data) {
          return response.data;
        }
        throw new Error(response.error?.message || 'Failed to fetch doctors');
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Get doctor details by ID
   */
  getDoctor(id: string): Observable<Doctor> {
    // Fetch from the doctors list and filter
    return this.getDoctors().pipe(
      map(doctors => {
        const doctor = doctors.find(doc => doc.id === id);
        if (!doctor) {
          throw new Error('Doctor not found');
        }
        return doctor;
      })
    );
  }

  /**
   * Get available time slots for a doctor
   */
  getAvailableSlots(doctorId: string, date: Date, days = 7): Observable<TimeSlot[]> {
    const params = {
      doctor_id: doctorId,
      start_date: date.toISOString(),
      days: days.toString(),
    };

    return this.apiGateway.request<TimeSlot[]>('appointments.slots.available', { params }).pipe(
      map(response => {
        if (response.success && response.data) {
          return response.data;
        }
        throw new Error(response.error?.message || 'Failed to fetch time slots');
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Get appointment statistics
   */
  getStatistics(): Observable<AppointmentStats> {
    // This might need a new endpoint in the gateway
    // For now, calculate from local appointments
    return this.getAppointments().pipe(
      map(appointments => {
        const now = new Date();
        const stats: AppointmentStats = {
          totalAppointments: appointments.length,
          completedAppointments: appointments.filter(apt => apt.status === 'completed').length,
          upcomingAppointments: appointments.filter(
            apt => new Date(`${apt.date} ${apt.startTime}`) > now && apt.status === 'confirmed'
          ).length,
          cancelledAppointments: appointments.filter(apt => apt.status === 'cancelled').length,
        };

        // Find last and next appointments
        const completed = appointments
          .filter(apt => apt.status === 'completed')
          .sort(
            (a, b) =>
              new Date(`${b.date} ${b.startTime}`).getTime() -
              new Date(`${a.date} ${a.startTime}`).getTime()
          );

        if (completed.length > 0) {
          stats.lastAppointmentDate = completed[0].date;
        }

        const upcoming = appointments
          .filter(
            apt => new Date(`${apt.date} ${apt.startTime}`) > now && apt.status === 'confirmed'
          )
          .sort(
            (a, b) =>
              new Date(`${a.date} ${a.startTime}`).getTime() -
              new Date(`${b.date} ${b.startTime}`).getTime()
          );

        if (upcoming.length > 0) {
          stats.nextAppointmentDate = upcoming[0].date;
        }

        return stats;
      })
    );
  }

  /**
   * Join video call for an appointment
   * Note: This might need a specific endpoint in the gateway
   */
  joinVideoCall(appointmentId: string): Observable<{ url: string; token?: string }> {
    // This would need a new endpoint in the gateway
    // For now, returning a mock response
    return throwError(() => new Error('Video call feature not yet implemented'));
  }

  /**
   * Share glucose data with doctor for an appointment
   * Legacy method - prefer shareManualGlucoseData for manual-first approach
   */
  shareGlucoseData(
    appointmentId: string,
    dateRange?: { start: Date; end: Date }
  ): Observable<ShareGlucoseResponse> {
    const body = dateRange
      ? {
          startDate: dateRange.start.toISOString(),
          endDate: dateRange.end.toISOString(),
        }
      : {};

    return this.apiGateway
      .request<ShareGlucoseResponse>('appointments.shareGlucose', { body }, { id: appointmentId })
      .pipe(
        map(response => {
          if (response.success && response.data) {
            return response.data;
          }
          throw new Error(response.error?.message || 'Failed to share glucose data');
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Share glucose data with manual readings summary included in the request body.
   * This is the primary method for sharing glucose data, supporting manual-first mode
   * where readings live locally and the backend cannot fetch them itself.
   *
   * @param appointmentId The appointment ID to share data with
   * @param options Configuration for the date range
   * @returns Observable with sharing result
   */
  shareManualGlucoseData(
    appointmentId: string,
    options?: {
      dateRange?: { start: Date; end: Date };
      days?: number; // when dateRange is not provided, default 30
    }
  ): Observable<ShareGlucoseResponse> {
    // Calculate date range (default to last 30 days as per spec)
    const startEnd = options?.dateRange
      ? options.dateRange
      : (() => {
          const end = new Date();
          const start = new Date();
          const days = options?.days ?? 30; // Default to 30 days as per spec
          start.setDate(end.getDate() - days);
          return { start, end };
        })();

    // Calculate number of days for the summary
    const dayCount = Math.max(
      1,
      Math.round((startEnd.end.getTime() - startEnd.start.getTime()) / (1000 * 60 * 60 * 24))
    );

    // Get the manual readings summary and then share
    return from(this.readingsService.exportManualReadingsSummary(dayCount)).pipe(
      switchMap((summary: TeleAppointmentReadingSummary) => {
        const body = {
          startDate: startEnd.start.toISOString(),
          endDate: startEnd.end.toISOString(),
          manualReadingsSummary: summary,
        };

        return this.apiGateway.request<ShareGlucoseResponse>(
          'appointments.shareGlucose',
          { body },
          { id: appointmentId }
        );
      }),
      map(response => {
        if (response.success && response.data) {
          return {
            shared: response.data.shared,
            recordCount: response.data.recordCount || 0,
            message:
              response.data.message ||
              this.translationService.instant('appointments.shareData.successMessage'),
          };
        }
        throw new Error(response.error?.message || 'Failed to share glucose data');
      }),
      catchError(error => {
        // If no manual readings are available, return a specific response
        if (error.message?.includes('No manual readings')) {
          return throwError(
            () => new Error(this.translationService.instant('appointments.shareData.noReadings'))
          );
        }
        return this.handleError(error);
      })
    );
  }

  /**
   * Get appointment reminders settings
   */
  getReminderSettings(): Observable<any> {
    // This would need a new endpoint in the gateway
    // For now, returning default settings
    return throwError(() => new Error('Reminder settings not yet implemented'));
  }

  /**
   * Update appointment reminder settings
   */
  updateReminderSettings(settings: any): Observable<any> {
    // This would need a new endpoint in the gateway
    return throwError(() => new Error('Reminder settings not yet implemented'));
  }

  /**
   * Refresh appointments list
   */
  private refreshAppointments(): void {
    this.getAppointments().subscribe({
      error: err => console.error('Failed to refresh appointments:', err),
    });
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
   * Handle errors
   */
  private handleError(error: any): Observable<never> {
    // If error is already in API Gateway format with success: false, pass it through
    if (error?.success === false && error?.error) {
      console.error('AppointmentService Error:', error.error.message, error);
      return throwError(() => error);
    }

    let errorMessage = 'An error occurred';

    if (error?.error?.message) {
      errorMessage = error.error.message;
    } else if (error?.message) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }

    // Check for specific error codes from ApiGatewayService
    if (error?.error?.code) {
      switch (error.error.code) {
        case 'UNAUTHORIZED':
          errorMessage = this.translationService.instant('appointments.errors.unauthorized');
          break;
        case 'NOT_FOUND':
          errorMessage = this.translationService.instant('appointments.errors.notFound');
          break;
        case 'CONFLICT':
          errorMessage = this.translationService.instant('appointments.errors.slotUnavailable');
          break;
        case 'SERVICE_UNAVAILABLE':
          errorMessage = this.translationService.instant('appointments.errors.serviceUnavailable');
          break;
        case 'NETWORK_ERROR':
          errorMessage = this.translationService.instant('appointments.errors.networkError');
          break;
      }
    }

    console.error('AppointmentService Error:', errorMessage, error);
    return throwError(() => new Error(errorMessage));
  }
}
