/**
 * ExtServicesClientService - Direct HTTP client for extServices microservices
 *
 * Complete implementation of all API Gateway endpoints based on OpenAPI schema.
 * Connects directly to Heroku: https://diabetactic-api-gateway-37949d6f182f.herokuapp.com
 */

import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { LoggerService } from './logger.service';

// ===== INTERFACES FROM OPENAPI SCHEMA =====

export interface Token {
  access_token: string;
  token_type: string;
}

export interface User {
  dni: string;
  name: string;
  surname: string;
  blocked: boolean;
  email?: string;
  state?: string;
  tidepool?: string | null;
  hospital_account?: string;
  times_measured?: number;
  streak?: number;
  max_streak?: number;
}

export interface Appointment {
  glucose_objective: number;
  insulin_type: string;
  dose: number;
  fast_insulin: string;
  fixed_dose: number;
  ratio: number;
  sensitivity: number;
  pump_type: string;
  another_treatment?: string | null;
  control_data: string;
  motive: string[]; // MotivesEnum: AJUSTE, HIPOGLUCEMIA, HIPERGLUCEMIA, CETOSIS, DUDAS, OTRO
  other_motive?: string | null;
  appointment_id: number;
  user_id: number;
}

export interface AppointmentPost {
  glucose_objective: number;
  insulin_type: string;
  dose: number;
  fast_insulin: string;
  fixed_dose: number;
  ratio: number;
  sensitivity: number;
  pump_type: string;
  another_treatment?: string | null;
  control_data: string;
  motive: string[];
  other_motive?: string | null;
}

export interface AppointmentResolution {
  appointment_id: number;
  change_basal_type: string;
  change_basal_dose: number;
  change_basal_time: string;
  change_fast_type: string;
  change_ratio: number;
  change_sensitivity: number;
  emergency_care: boolean;
  needed_physical_appointment: boolean;
}

export interface GlucoseReading {
  user_id: number;
  glucose_level: number;
  reading_type: string; // ReadingTypeEnum: DESAYUNO, ALMUERZO, MERIENDA, CENA, EJERCICIO, OTRAS_COMIDAS, OTRO
  id: number;
  created_at: string;
}

export interface GlucoseReadingList {
  readings: GlucoseReading[];
}

export interface ExtAuthState {
  isAuthenticated: boolean;
  accessToken: string | null;
  user: User | null;
}

@Injectable({
  providedIn: 'root',
})
export class ExtServicesClientService {
  public readonly apiGatewayUrl: string;

  // Auth state
  private authState$ = new BehaviorSubject<ExtAuthState>({
    isAuthenticated: false,
    accessToken: null,
    user: null,
  });

  constructor(
    public http: HttpClient,
    private logger: LoggerService
  ) {
    // Get API Gateway URL from environment
    const baseUrl = environment.backendServices?.apiGateway?.baseUrl || 'http://localhost:8000';
    this.apiGatewayUrl = baseUrl;

    this.logger.info('Init', 'ExtServicesClientService initialized', {
      apiGatewayUrl: this.apiGatewayUrl,
    });

    // Check for existing token
    const token = this.getAccessToken();
    if (token) {
      this.authState$.next({
        isAuthenticated: true,
        accessToken: token,
        user: null,
      });
    }
  }

  private getHeaders(): HttpHeaders {
    const token = this.getAccessToken();
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    });
  }

  // ===== AUTH ENDPOINTS =====

  /**
   * POST /token - Login with username and password
   * @param username - User DNI
   * @param password - User password
   */
  login(username: string, password: string): Observable<{ token: Token; user: User | null }> {
    this.logger.info('Auth', 'Login attempt', { username });

    const body = new HttpParams().set('username', username).set('password', password);

    const headers = new HttpHeaders({
      'Content-Type': 'application/x-www-form-urlencoded',
    });

    return this.http.post<Token>(`${this.apiGatewayUrl}/token`, body.toString(), { headers }).pipe(
      tap(tokenResponse => {
        this.logger.info('Auth', 'Token received', { token_type: tokenResponse.token_type });

        // Store token
        localStorage.setItem('access_token', tokenResponse.access_token);
        this.authState$.next({
          isAuthenticated: true,
          accessToken: tokenResponse.access_token,
          user: null,
        });
      }),
      map(tokenResponse => {
        return { token: tokenResponse, user: null };
      }),
      catchError(error => this.handleError('Login failed', error))
    );
  }

  /**
   * GET /users/me - Get current user profile
   */
  getUserProfile(): Observable<User> {
    const token = this.getAccessToken();
    if (!token) {
      return throwError(() => new Error('No access token available. Please login first.'));
    }

    return this.http.get<User>(`${this.apiGatewayUrl}/users/me`, {
      headers: this.getHeaders(),
    }).pipe(
      tap(user => {
        this.logger.info('Auth', 'User profile fetched', {
          dni: user.dni,
          email: user.email,
          state: user.state,
        });

        // Update auth state with user profile
        this.authState$.next({
          isAuthenticated: true,
          accessToken: token,
          user: user,
        });
      }),
      catchError(error => this.handleError('Failed to fetch user profile', error))
    );
  }

  /**
   * Logout - clear auth state
   */
  logout(): void {
    this.logger.info('Auth', 'Logging out');
    localStorage.removeItem('access_token');
    this.authState$.next({
      isAuthenticated: false,
      accessToken: null,
      user: null,
    });
  }

  /**
   * Get current access token
   */
  getAccessToken(): string | null {
    return localStorage.getItem('access_token');
  }

  /**
   * Get auth state observable
   */
  getAuthState(): Observable<ExtAuthState> {
    return this.authState$.asObservable();
  }

  // ===== APPOINTMENTS ENDPOINTS =====

  /**
   * GET /appointments/mine - Get user's appointments
   */
  getAppointments(): Observable<Appointment[]> {
    const token = this.getAccessToken();
    if (!token) {
      return throwError(() => new Error('No access token available. Please login first.'));
    }

    return this.http.get<Appointment[]>(`${this.apiGatewayUrl}/appointments/mine`, {
      headers: this.getHeaders(),
    }).pipe(
      tap(appointments => {
        this.logger.info('Appointments', 'Fetched appointments', {
          count: appointments.length,
        });
      }),
      catchError(error => this.handleError('Failed to fetch appointments', error))
    );
  }

  /**
   * GET /appointments/state - Get appointment queue state
   */
  getAppointmentState(): Observable<string> {
    const token = this.getAccessToken();
    if (!token) {
      return throwError(() => new Error('No access token available. Please login first.'));
    }

    return this.http.get<string>(`${this.apiGatewayUrl}/appointments/state`, {
      headers: this.getHeaders(),
    }).pipe(
      tap(state => {
        this.logger.info('Appointments', 'Fetched appointment state', { state });
      }),
      catchError(error => this.handleError('Failed to fetch appointment state', error))
    );
  }

  /**
   * POST /appointments/create - Create new appointment
   */
  createAppointment(data: AppointmentPost): Observable<Appointment> {
    const token = this.getAccessToken();
    if (!token) {
      return throwError(() => new Error('No access token available. Please login first.'));
    }

    return this.http.post<Appointment>(`${this.apiGatewayUrl}/appointments/create`, data, {
      headers: this.getHeaders(),
    }).pipe(
      tap(appointment => {
        this.logger.info('Appointments', 'Created appointment', {
          appointment_id: appointment.appointment_id,
        });
      }),
      catchError(error => this.handleError('Failed to create appointment', error))
    );
  }

  /**
   * GET /appointments/{appointment_id}/resolution - Get appointment resolution
   */
  getAppointmentResolution(appointmentId: number): Observable<AppointmentResolution> {
    const token = this.getAccessToken();
    if (!token) {
      return throwError(() => new Error('No access token available. Please login first.'));
    }

    return this.http.get<AppointmentResolution>(
      `${this.apiGatewayUrl}/appointments/${appointmentId}/resolution`,
      { headers: this.getHeaders() }
    ).pipe(
      tap(resolution => {
        this.logger.info('Appointments', 'Fetched resolution', {
          appointment_id: resolution.appointment_id,
        });
      }),
      catchError(error => this.handleError('Failed to fetch appointment resolution', error))
    );
  }

  /**
   * POST /appointments/submit - Submit appointment to queue
   */
  submitAppointment(): Observable<number> {
    const token = this.getAccessToken();
    if (!token) {
      return throwError(() => new Error('No access token available. Please login first.'));
    }

    return this.http.post<number>(`${this.apiGatewayUrl}/appointments/submit`, {}, {
      headers: this.getHeaders(),
    }).pipe(
      tap(id => {
        this.logger.info('Appointments', 'Submitted appointment', { id });
      }),
      catchError(error => this.handleError('Failed to submit appointment', error))
    );
  }

  // ===== GLUCOSE ENDPOINTS =====

  /**
   * GET /glucose/mine - Get all glucose readings
   */
  getGlucoseReadings(): Observable<GlucoseReadingList> {
    const token = this.getAccessToken();
    if (!token) {
      return throwError(() => new Error('No access token available. Please login first.'));
    }

    return this.http.get<GlucoseReadingList>(`${this.apiGatewayUrl}/glucose/mine`, {
      headers: this.getHeaders(),
    }).pipe(
      tap(response => {
        this.logger.info('Glucose', 'Fetched glucose readings', {
          count: response.readings?.length || 0,
        });
      }),
      catchError(error => this.handleError('Failed to fetch glucose readings', error))
    );
  }

  /**
   * GET /glucose/mine/latest - Get latest glucose readings
   */
  getLatestGlucoseReadings(): Observable<GlucoseReadingList> {
    const token = this.getAccessToken();
    if (!token) {
      return throwError(() => new Error('No access token available. Please login first.'));
    }

    return this.http.get<GlucoseReadingList>(`${this.apiGatewayUrl}/glucose/mine/latest`, {
      headers: this.getHeaders(),
    }).pipe(
      tap(response => {
        this.logger.info('Glucose', 'Fetched latest glucose readings', {
          count: response.readings?.length || 0,
        });
      }),
      catchError(error => this.handleError('Failed to fetch latest glucose readings', error))
    );
  }

  /**
   * POST /glucose/create - Create glucose reading
   */
  createGlucoseReading(glucoseLevel: number, readingType: string): Observable<GlucoseReading> {
    const token = this.getAccessToken();
    if (!token) {
      return throwError(() => new Error('No access token available. Please login first.'));
    }

    const params = new HttpParams()
      .set('glucose_level', glucoseLevel.toString())
      .set('reading_type', readingType);

    return this.http.post<GlucoseReading>(
      `${this.apiGatewayUrl}/glucose/create`,
      null,
      { headers: this.getHeaders(), params }
    ).pipe(
      tap(reading => {
        this.logger.info('Glucose', 'Created glucose reading', {
          id: reading.id,
          glucose_level: reading.glucose_level,
          reading_type: reading.reading_type,
        });
      }),
      catchError(error => this.handleError('Failed to create glucose reading', error))
    );
  }

  // ===== ERROR HANDLING =====

  private handleError(context: string, error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'Unknown error occurred';

    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Client Error: ${error.error.message}`;
    } else {
      // Server-side error
      errorMessage = `Server Error: ${error.status} ${error.statusText}`;
      if (error.error?.detail) {
        errorMessage += ` - ${error.error.detail}`;
      }
    }

    this.logger.error(context, errorMessage, { error });
    return throwError(() => new Error(errorMessage));
  }
}
