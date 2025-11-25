/**
 * Appointment Service
 *
 * Manages clinical appointment records (treatment data).
 * Note: Backend provides treatment/clinical data, NOT scheduling data.
 */

import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, throwError, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { ApiGatewayService } from './api-gateway.service';
import { TranslationService } from './translation.service';
import { environment } from '../../../environments/environment';
import { Appointment, CreateAppointmentRequest } from '../models/appointment.model';

/**
 * Mock appointment for development/testing
 */
interface MockAppointment extends Appointment {
  // Mock can add extra fields if needed
}

@Injectable({
  providedIn: 'root',
})
export class AppointmentService {
  // Reactive state for appointments
  private appointmentsSubject = new BehaviorSubject<Appointment[]>([]);
  public appointments$ = this.appointmentsSubject.asObservable();

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
    private translationService: TranslationService
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
  createAppointment(formData: CreateAppointmentRequest): Observable<Appointment> {
    if (this.isMockMode) {
      const newAppointment: MockAppointment = {
        ...formData,
        appointment_id: Date.now(),
        user_id: 1000,
      };
      this.mockAppointments.push(newAppointment);
      this.appointmentsSubject.next([...this.mockAppointments]);
      return of(newAppointment);
    }

    return this.apiGateway
      .request<Appointment>('extservices.appointments.create', { body: formData })
      .pipe(
        map(response => {
          if (response.success && response.data) {
            return response.data;
          }
          throw new Error(response.error?.message || 'Failed to create appointment');
        }),
        tap(() => this.refreshAppointments()),
        catchError(this.handleError.bind(this))
      );
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
   * Handle errors
   */
  private handleError(error: any): Observable<never> {
    let errorMessage = 'An error occurred';

    if (error?.error?.message) {
      errorMessage = error.error.message;
    } else if (error?.message) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }

    // Check for specific error codes
    if (error?.error?.code) {
      switch (error.error.code) {
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
      }
    }

    console.error('AppointmentService Error:', errorMessage, error);
    return throwError(() => new Error(errorMessage));
  }
}
