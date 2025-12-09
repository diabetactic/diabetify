/**
 * Appointment Service
 *
 * Manages clinical appointment records (treatment data).
 * Note: Backend provides treatment/clinical data, NOT scheduling data.
 */

import { Injectable, inject, OnDestroy } from '@angular/core';
import { Observable, BehaviorSubject, throwError, of, Subject } from 'rxjs';
import { catchError, map, tap, takeUntil } from 'rxjs/operators';
import { ApiGatewayService } from './api-gateway.service';
import { TranslationService } from './translation.service';
import { NotificationService } from './notification.service';
import { LoggerService } from './logger.service';
import { environment } from '../../../environments/environment';
import {
  Appointment,
  CreateAppointmentRequest,
  AppointmentQueueState,
  AppointmentQueueStateResponse,
  AppointmentSubmitResponse,
  AppointmentResolutionResponse,
} from '../models/appointment.model';

/**
 * Mock appointment for development/testing
 */
interface MockAppointment extends Appointment {
  // Mock can add extra fields if needed
}

@Injectable({
  providedIn: 'root',
})
export class AppointmentService implements OnDestroy {
  private logger = inject(LoggerService);

  // Reactive state for appointments
  private appointmentsSubject = new BehaviorSubject<Appointment[]>([]);
  public appointments$ = this.appointmentsSubject.asObservable();

  // Subject for cleanup on destroy
  private destroy$ = new Subject<void>();

  private readonly isMockMode = environment.backendMode === 'mock';

  // Mock data for development
  private mockAppointments: MockAppointment[] = [
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
      control_data: 'Regular checkup - stable control',
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
      control_data: 'Dose adjustment needed',
      motive: ['adjustment', 'follow_up'],
      other_motive: 'Review morning readings',
      another_treatment: 'Metformin 500mg',
    },
  ];

  constructor(
    private apiGateway: ApiGatewayService,
    private translationService: TranslationService,
    private notificationService: NotificationService
  ) {}

  /**
   * Get all appointments for the current user
   */
  getAppointments(): Observable<Appointment[]> {
    if (this.isMockMode) {
      return of(this.mockAppointments).pipe(
        tap(appointments => this.appointmentsSubject.next(appointments))
      );
    }

    return this.apiGateway.request<Appointment[]>('extservices.appointments.mine').pipe(
      map(response => {
        if (response.success && response.data) {
          return response.data;
        }
        throw new Error(response.error?.message || 'Failed to fetch appointments');
      }),
      tap(appointments => this.appointmentsSubject.next(appointments)),
      catchError(this.handleError.bind(this))
    );
  }

  /**
   * Get a single appointment by ID
   */
  getAppointment(id: number): Observable<Appointment> {
    return this.getAppointments().pipe(
      map(appointments => {
        const appointment = appointments.find(apt => apt.appointment_id === id);
        if (!appointment) {
          throw new Error('Appointment not found');
        }
        return appointment;
      })
    );
  }

  /**
   * Create a new appointment with clinical data
   */
  createAppointment(
    formData: CreateAppointmentRequest,
    scheduledDate?: Date,
    reminderMinutesBefore: number = 30
  ): Observable<Appointment> {
    if (this.isMockMode) {
      const newAppointment: MockAppointment = {
        ...formData,
        appointment_id: Date.now(),
        user_id: 1000,
        scheduled_date: scheduledDate,
        reminder_minutes_before: reminderMinutesBefore,
      };
      this.mockAppointments.push(newAppointment);
      this.appointmentsSubject.next([...this.mockAppointments]);

      // Schedule reminder if scheduled_date is provided
      if (scheduledDate) {
        this.scheduleReminder(newAppointment);
      }

      return of(newAppointment);
    }

    return this.apiGateway
      .request<Appointment>('extservices.appointments.create', { body: formData })
      .pipe(
        map(response => {
          if (response.success && response.data) {
            // Add client-side scheduling fields
            const appointment: Appointment = {
              ...response.data,
              scheduled_date: scheduledDate,
              reminder_minutes_before: reminderMinutesBefore,
            };
            return appointment;
          }
          throw new Error(response.error?.message || 'Failed to create appointment');
        }),
        tap(appointment => {
          this.refreshAppointments();
          // Schedule reminder if scheduled_date is provided
          if (appointment.scheduled_date) {
            this.scheduleReminder(appointment);
          }
        }),
        catchError(this.handleError.bind(this))
      );
  }

  /**
   * Get current queue state for the user
   * Note: Backend returns just a string like "ACCEPTED", "PENDING", etc.
   */
  getQueueState(): Observable<AppointmentQueueStateResponse> {
    if (this.isMockMode) {
      return of({ state: 'NONE' as AppointmentQueueState });
    }

    return this.apiGateway
      .request<string | AppointmentQueueStateResponse>('extservices.appointments.state')
      .pipe(
        map(response => {
          if (response.success && response.data) {
            // Backend returns just a string like "ACCEPTED", not an object
            if (typeof response.data === 'string') {
              return { state: response.data as AppointmentQueueState };
            }
            // If it's already an object with state property, use it
            return response.data as AppointmentQueueStateResponse;
          }
          // If no data, assume no queue state
          return { state: 'NONE' as AppointmentQueueState };
        }),
        catchError(error => {
          // If 404 or "does not exist" error, return NONE (no queue state exists)
          // Note: ApiGatewayService returns { success: false, error: ApiError }
          // ApiError has 'statusCode' and 'details', not 'status' or 'detail'
          const apiError = error?.error;
          const is404 = error?.status === 404 || apiError?.statusCode === 404;

          const errorDetails = apiError?.details;
          const detailMsg = errorDetails?.detail || errorDetails?.message || '';

          const isNotFound =
            detailMsg.includes('does not exist') ||
            apiError?.message?.includes('does not exist') ||
            apiError?.message?.includes('404');

          if (is404 || isNotFound) {
            return of({ state: 'NONE' as AppointmentQueueState });
          }
          return this.handleError(error);
        })
      );
  }

  /**
   * Get user's position in the appointment queue
   * Returns relative position (1 = first in line, 2 = second, etc.)
   * Returns -1 if user is not in PENDING state or no queue exists
   */
  getQueuePosition(): Observable<number> {
    if (this.isMockMode) {
      return of(1); // Mock: first in queue
    }
    return this.apiGateway.request<number>('extservices.appointments.placement').pipe(
      map(response => {
        if (response.success && typeof response.data === 'number') {
          return response.data;
        }
        return -1;
      }),
      catchError(() => of(-1)) // Return -1 on error (not in queue or error)
    );
  }

  /**
   * Check if the appointment queue is open
   */
  checkQueueOpen(): Observable<boolean> {
    if (this.isMockMode) {
      return of(true);
    }
    return this.apiGateway.request<boolean>('appointments.queue.open').pipe(
      map(response => !!response.data),
      catchError(() => of(false)) // Assume closed on error
    );
  }

  /**
   * Request an appointment (submit to queue)
   * Note: Backend returns a number (queue position), not an object
   */
  requestAppointment(): Observable<AppointmentSubmitResponse> {
    if (this.isMockMode) {
      return of({
        success: true,
        state: 'PENDING' as AppointmentQueueState,
        position: 1,
        message: 'Mock: Added to queue',
      });
    }

    // Backend returns just a number (queue position), not an AppointmentSubmitResponse object
    return this.apiGateway.request<number>('extservices.appointments.submit').pipe(
      map(response => {
        if (response.success) {
          // Transform the number response into AppointmentSubmitResponse
          const position = typeof response.data === 'number' ? response.data : 1;
          return {
            success: true,
            state: 'PENDING' as AppointmentQueueState,
            position,
            message: `Added to queue at position ${position}`,
          };
        }
        throw new Error(response.error?.message || 'Failed to submit appointment request');
      }),
      catchError(this.handleError.bind(this))
    );
  }

  /**
   * Get resolution for a specific appointment
   */
  getResolution(appointmentId: number): Observable<AppointmentResolutionResponse> {
    if (this.isMockMode) {
      return of({
        appointment_id: appointmentId,
        state: 'ACCEPTED' as AppointmentQueueState,
      });
    }

    return this.apiGateway
      .request<AppointmentResolutionResponse>(
        'extservices.appointments.resolution',
        {},
        { appointmentId: appointmentId.toString() }
      )
      .pipe(
        map(response => {
          if (response.success && response.data) {
            return response.data;
          }
          throw new Error(response.error?.message || 'Failed to get appointment resolution');
        }),
        catchError(this.handleError.bind(this))
      );
  }

  /**
   * Delete/cancel an appointment
   */
  deleteAppointment(appointmentId: number): Observable<void> {
    // Cancel notification first
    this.cancelAppointmentReminder(appointmentId);

    if (this.isMockMode) {
      const index = this.mockAppointments.findIndex(apt => apt.appointment_id === appointmentId);
      if (index !== -1) {
        this.mockAppointments.splice(index, 1);
        this.appointmentsSubject.next([...this.mockAppointments]);
      }
      return of(void 0);
    }

    // If backend has delete endpoint, implement here
    // For now, just cancel the notification
    return of(void 0);
  }

  /**
   * Update appointment scheduling information
   */
  updateAppointmentSchedule(
    appointmentId: number,
    scheduledDate: Date,
    reminderMinutesBefore: number = 30
  ): Observable<Appointment> {
    return this.getAppointment(appointmentId).pipe(
      tap(appointment => {
        // Update scheduling fields
        appointment.scheduled_date = scheduledDate;
        appointment.reminder_minutes_before = reminderMinutesBefore;

        // Reschedule reminder
        this.cancelAppointmentReminder(appointmentId);
        this.scheduleReminder(appointment);
      })
    );
  }

  /**
   * Schedule a notification reminder for an appointment
   */
  private scheduleReminder(appointment: Appointment): void {
    if (!appointment.scheduled_date) {
      return;
    }

    const reminderMinutes = appointment.reminder_minutes_before ?? 30;

    this.notificationService
      .scheduleAppointmentReminder({
        appointmentId: appointment.appointment_id.toString(),
        appointmentDate: appointment.scheduled_date,
        reminderMinutesBefore: reminderMinutes,
      })
      .catch(error => {
        this.logger.error('Appointments', 'Failed to schedule appointment reminder', error);
      });
  }

  /**
   * Cancel notification reminder for an appointment
   */
  private cancelAppointmentReminder(appointmentId: number): void {
    // Calculate notification ID using same logic as NotificationService
    const APPOINTMENT_REMINDER_BASE_ID = 2000;
    const notificationId =
      APPOINTMENT_REMINDER_BASE_ID + parseInt(appointmentId.toString().slice(-4), 16);

    this.notificationService.cancelNotification(notificationId).catch(error => {
      this.logger.error('Appointments', 'Failed to cancel appointment reminder', error);
    });
  }

  /**
   * Clean up subscriptions when service is destroyed
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.appointmentsSubject.complete();
  }

  /**
   * Refresh appointments list
   */
  private refreshAppointments(): void {
    this.getAppointments()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        error: err => this.logger.error('Appointments', 'Failed to refresh appointments', err),
      });
  }

  /**
   * Handle errors
   */
  private handleError(error: unknown): Observable<never> {
    let errorMessage = 'An error occurred';
    let errorDetail = '';

    // Extract error detail from response
    // Handle ApiError structure from ApiGatewayService
    const errorObj = error as Record<string, unknown>;
    const apiError = errorObj?.['error'] as Record<string, unknown> | undefined;
    const apiDetails = apiError?.['details'] as Record<string, unknown> | undefined;
    const errorNested = errorObj?.['error'] as Record<string, unknown> | undefined;

    if (apiDetails?.['detail']) {
      errorDetail = apiDetails['detail'] as string;
    } else if (apiDetails?.['message']) {
      errorDetail = apiDetails['message'] as string;
    } else if (apiError?.['message']) {
      errorDetail = apiError['message'] as string;
    } else if (errorNested?.['detail']) {
      // Fallback for raw HttpErrorResponse or other structures
      errorDetail = errorNested['detail'] as string;
    } else if (errorNested?.['message']) {
      errorDetail = errorNested['message'] as string;
    } else if (errorObj?.['message']) {
      errorDetail = errorObj['message'] as string;
    } else if (typeof error === 'string') {
      errorDetail = error;
    }

    // Map backend error messages to user-friendly translations
    const backendErrorMappings: Record<string, string> = {
      'Appointment Queue Full': 'appointments.errors.queueFull',
      'Appointment does not exist in queue': 'appointments.errors.notInQueue',
      "Appointment wasn't accepted yet": 'appointments.errors.notAccepted',
      'Appointment already exists in queue': 'appointments.errors.alreadyInQueue',
      'Appointment does not exist': 'appointments.errors.notFound',
      'Appointment Queue is not open': 'appointments.errors.queueClosed',
    };

    // Check for backend error message match (case-insensitive)
    const errorDetailLower = errorDetail.toLowerCase();
    for (const [backendMsg, translationKey] of Object.entries(backendErrorMappings)) {
      if (errorDetailLower.includes(backendMsg.toLowerCase())) {
        errorMessage = this.translationService.instant(translationKey);
        this.logger.error('Appointments', 'Error', error, { message: errorMessage });
        return throwError(() => new Error(errorMessage));
      }
    }

    // Check for specific error codes
    const errorCode =
      (apiError?.['code'] as string | undefined) || (errorNested?.['code'] as string | undefined);

    if (errorCode) {
      switch (errorCode) {
        case 'UNAUTHORIZED':
          errorMessage = this.translationService.instant('appointments.errors.unauthorized');
          break;
        case 'NOT_FOUND':
          errorMessage = this.translationService.instant('appointments.errors.notFound');
          break;
        case 'SERVICE_UNAVAILABLE':
          errorMessage = this.translationService.instant('appointments.errors.serviceUnavailable');
          break;
        case 'NETWORK_ERROR':
          errorMessage = this.translationService.instant('appointments.errors.networkError');
          break;
        default:
          errorMessage = errorDetail || errorMessage;
      }
    } else {
      errorMessage = errorDetail || errorMessage;
    }

    this.logger.error('Appointments', 'Error', error, { message: errorMessage });
    return throwError(() => new Error(errorMessage));
  }
}
