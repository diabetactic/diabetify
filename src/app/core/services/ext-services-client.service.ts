/**
 * ExtServicesClientService - Direct HTTP client for extServices microservices
 *
 * Simple, direct HTTP calls to the API Gateway (port 8000) without complex abstractions.
 * This service connects directly to the Python/FastAPI microservices running in Docker.
 *
 * Available endpoints:
 * - POST /token (login with username/password)
 * - GET /users/me (get current user profile)
 * - GET /appointments/mine (get user appointments)
 * - POST /appointments/create (create appointment)
 * - GET /glucose/mine (get glucose readings)
 * - POST /glucose/create (create glucose reading)
 */

import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { LoggerService } from './logger.service';

/**
 * Token response from POST /token endpoint
 */
export interface TokenResponse {
  access_token: string;
  token_type: string;
}

/**
 * User profile from GET /users/me endpoint
 */
export interface UserProfile {
  dni: string;
  name: string;
  surname: string;
  blocked: boolean;
  email: string;
  state?: 'pending' | 'active' | 'disabled';
  tidepool?: string | null;
  hospital_account: string;
  times_measured: number;
  streak: number;
  max_streak: number;
}

/**
 * Appointment from GET /appointments/mine endpoint
 */
export interface ExtAppointment {
  id: number;
  start_time: string; // ISO datetime
  type_: string;
  data_field1?: string;
  data_field2?: string;
  user_id: number;
  finished: boolean;
  created_at: string;
  updated_at: string;
  clinic_notes?: string;
}

/**
 * Glucose reading from GET /glucose/mine endpoint
 */
export interface ExtGlucoseReading {
  id: number;
  user_id: number;
  glucose_level: number;
  reading_type: string;
  created_at: string;
}

/**
 * Auth state
 */
export interface ExtAuthState {
  isAuthenticated: boolean;
  accessToken: string | null;
  user: UserProfile | null;
}

@Injectable({
  providedIn: 'root',
})
export class ExtServicesClientService {
  public readonly apiGatewayUrl: string; // Made public for testing page access

  // Auth state
  private authState$ = new BehaviorSubject<ExtAuthState>({
    isAuthenticated: false,
    accessToken: null,
    user: null,
  });

  constructor(
    public http: HttpClient, // Made public for testing page access
    private logger: LoggerService
  ) {
    // Get API Gateway URL from environment
    const baseUrl = environment.backendServices?.apiGateway?.baseUrl || 'http://localhost:8000';
    this.apiGatewayUrl = baseUrl;

    this.logger.info('Init', 'ExtServicesClientService initialized', {
      apiGatewayUrl: this.apiGatewayUrl,
    });
  }

  /**
   * Get auth state observable
   */
  getAuthState(): Observable<ExtAuthState> {
    return this.authState$.asObservable();
  }

  /**
   * Get current access token
   */
  getAccessToken(): string | null {
    return this.authState$.value.accessToken;
  }

  /**
   * Login with username (DNI) and password
   * Calls POST /token endpoint
   *
   * @param username - User DNI or email
   * @param password - User password
   * @returns Observable with token response
   */
  login(username: string, password: string): Observable<{ token: TokenResponse; user: UserProfile }> {
    this.logger.info('Auth', 'Login attempt', { username });

    // Create form-urlencoded body (required by OAuth2PasswordRequestForm)
    const body = new HttpParams().set('username', username).set('password', password);

    const headers = new HttpHeaders({
      'Content-Type': 'application/x-www-form-urlencoded',
    });

    return this.http.post<TokenResponse>(`${this.apiGatewayUrl}/token`, body.toString(), { headers }).pipe(
      tap(tokenResponse => {
        this.logger.info('Auth', 'Token received', { token_type: tokenResponse.token_type });
      }),
      // After getting token, fetch user profile
      map(tokenResponse => {
        // Store token temporarily
        this.authState$.next({
          isAuthenticated: true,
          accessToken: tokenResponse.access_token,
          user: null, // Will be fetched next
        });
        return tokenResponse;
      }),
      // Fetch user profile using the token
      map(tokenResponse => {
        return { token: tokenResponse, user: null as any }; // Return token, user will be fetched separately
      }),
      catchError(error => this.handleError('Login failed', error))
    );
  }

  /**
   * Get current user profile
   * Calls GET /users/me endpoint (requires authentication)
   */
  getUserProfile(): Observable<UserProfile> {
    const token = this.getAccessToken();
    if (!token) {
      return throwError(() => new Error('No access token available. Please login first.'));
    }

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });

    return this.http.get<UserProfile>(`${this.apiGatewayUrl}/users/me`, { headers }).pipe(
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
   * Get user appointments
   * Calls GET /appointments/mine endpoint (requires authentication)
   */
  getAppointments(): Observable<ExtAppointment[]> {
    const token = this.getAccessToken();
    if (!token) {
      return throwError(() => new Error('No access token available. Please login first.'));
    }

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });

    return this.http.get<ExtAppointment[]>(`${this.apiGatewayUrl}/appointments/mine`, { headers }).pipe(
      tap(appointments => {
        this.logger.info('Appointments', 'Fetched appointments', {
          count: appointments.length,
        });
      }),
      catchError(error => this.handleError('Failed to fetch appointments', error))
    );
  }

  /**
   * Create new appointment
   * Calls POST /appointments/create endpoint (requires authentication)
   */
  createAppointment(appointmentData: {
    start_time: string;
    type_: string;
    data_field1?: string;
    data_field2?: string;
  }): Observable<ExtAppointment> {
    const token = this.getAccessToken();
    if (!token) {
      return throwError(() => new Error('No access token available. Please login first.'));
    }

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    });

    return this.http
      .post<ExtAppointment>(`${this.apiGatewayUrl}/appointments/create`, appointmentData, { headers })
      .pipe(
        tap(appointment => {
          this.logger.info('Appointments', 'Created appointment', {
            id: appointment.id,
            start_time: appointment.start_time,
          });
        }),
        catchError(error => this.handleError('Failed to create appointment', error))
      );
  }

  /**
   * Get glucose readings
   * Calls GET /glucose/mine endpoint (requires authentication)
   */
  getGlucoseReadings(): Observable<{ readings: ExtGlucoseReading[]; count: number }> {
    const token = this.getAccessToken();
    if (!token) {
      return throwError(() => new Error('No access token available. Please login first.'));
    }

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });

    return this.http
      .get<{ readings: ExtGlucoseReading[]; count: number }>(`${this.apiGatewayUrl}/glucose/mine`, {
        headers,
      })
      .pipe(
        tap(response => {
          this.logger.info('Glucose', 'Fetched glucose readings', {
            count: response.count,
          });
        }),
        catchError(error => this.handleError('Failed to fetch glucose readings', error))
      );
  }

  /**
   * Get latest glucose readings
   * Calls GET /glucose/mine/latest endpoint (requires authentication)
   */
  getLatestGlucoseReadings(): Observable<{ readings: ExtGlucoseReading[]; count: number }> {
    const token = this.getAccessToken();
    if (!token) {
      return throwError(() => new Error('No access token available. Please login first.'));
    }

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });

    return this.http
      .get<{ readings: ExtGlucoseReading[]; count: number }>(`${this.apiGatewayUrl}/glucose/mine/latest`, {
        headers,
      })
      .pipe(
        tap(response => {
          this.logger.info('Glucose', 'Fetched latest glucose readings', {
            count: response.count,
          });
        }),
        catchError(error => this.handleError('Failed to fetch latest glucose readings', error))
      );
  }

  /**
   * Create glucose reading
   * Calls POST /glucose/create endpoint (requires authentication)
   */
  createGlucoseReading(glucoseLevel: number, readingType: string): Observable<ExtGlucoseReading> {
    const token = this.getAccessToken();
    if (!token) {
      return throwError(() => new Error('No access token available. Please login first.'));
    }

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });

    const params = new HttpParams().set('glucose_level', glucoseLevel.toString()).set('reading_type', readingType);

    return this.http
      .post<ExtGlucoseReading>(`${this.apiGatewayUrl}/glucose/create`, null, {
        headers,
        params,
      })
      .pipe(
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

  /**
   * Logout - clear auth state
   */
  logout(): void {
    this.logger.info('Auth', 'Logging out');
    this.authState$.next({
      isAuthenticated: false,
      accessToken: null,
      user: null,
    });
  }

  /**
   * Handle HTTP errors
   */
  private handleError(context: string, error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'Unknown error occurred';

    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Server-side error
      errorMessage = `Status: ${error.status}, Message: ${error.message}`;

      // Extract detail from FastAPI error response
      if (error.error?.detail) {
        if (typeof error.error.detail === 'string') {
          errorMessage = error.error.detail;
        } else if (Array.isArray(error.error.detail)) {
          errorMessage = error.error.detail.map((d: any) => d.msg || d.detail).join(', ');
        }
      }
    }

    this.logger.error('ExtServices', context, error, {
      status: error.status,
      url: error.url,
      errorMessage,
    });

    return throwError(() => new Error(`${context}: ${errorMessage}`));
  }
}
