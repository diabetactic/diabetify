import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError, from } from 'rxjs';
import { catchError, map, retry, switchMap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

/**
 * Local authentication state
 */
export interface LocalAuthState {
  isAuthenticated: boolean;
  user: LocalUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
}

/**
 * Local user interface
 */
export interface LocalUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'patient' | 'doctor' | 'admin';
  profileImage?: string;
  phone?: string;
  dateOfBirth?: string;
  diabetesType?: '1' | '2' | 'gestational' | 'other';
  diagnosisDate?: string;
  createdAt: string;
  updatedAt: string;
  preferences?: UserPreferences;
}

/**
 * User preferences
 */
export interface UserPreferences {
  glucoseUnit: 'mg/dL' | 'mmol/L';
  targetRange: {
    low: number;
    high: number;
  };
  language: 'en' | 'es';
  notifications: {
    appointments: boolean;
    readings: boolean;
    reminders: boolean;
  };
  theme: 'light' | 'dark' | 'auto';
}

/**
 * Login request interface
 */
export interface LoginRequest {
  email?: string;
  dni?: string;
  password: string;
  rememberMe?: boolean;
}

/**
 * Registration request interface
 */
export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: 'patient' | 'doctor';
  phone?: string;
  dateOfBirth?: string;
  diabetesType?: '1' | '2' | 'gestational' | 'other';
  diagnosisDate?: string;
}

/**
 * Token response from server
 */
export interface TokenResponse {
  access_token: string;
  refresh_token: string | null;
  token_type: string;
  expires_in?: number | null;
  user: LocalUser;
}

/**
 * Password reset request
 */
export interface PasswordResetRequest {
  email: string;
}

/**
 * Password update request
 */
export interface PasswordUpdateRequest {
  token: string;
  newPassword: string;
}

// Storage keys
const STORAGE_KEYS = {
  ACCESS_TOKEN: 'local_access_token',
  REFRESH_TOKEN: 'local_refresh_token',
  USER: 'local_user',
  EXPIRES_AT: 'local_token_expires',
};

@Injectable({
  providedIn: 'root',
})
export class LocalAuthService {
  private readonly baseUrl: string;
  private readonly apiPath: string;
  private readonly fullUrl: string;

  // Authentication state
  private authStateSubject = new BehaviorSubject<LocalAuthState>({
    isAuthenticated: false,
    user: null,
    accessToken: null,
    refreshToken: null,
    expiresAt: null,
  });

  public authState$ = this.authStateSubject.asObservable();

  constructor(private http: HttpClient) {
    const config = environment.backendServices.auth;
    this.baseUrl = config.baseUrl;
    this.apiPath = config.apiPath;
    this.fullUrl = `${this.baseUrl}${this.apiPath}`;

    // Initialize auth state from storage
    this.initializeAuthState();
  }

  /**
   * Initialize authentication state from storage
   */
  private async initializeAuthState(): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      try {
        const [accessToken, refreshToken, userStr, expiresAtStr] = await Promise.all([
          Preferences.get({ key: STORAGE_KEYS.ACCESS_TOKEN }),
          Preferences.get({ key: STORAGE_KEYS.REFRESH_TOKEN }),
          Preferences.get({ key: STORAGE_KEYS.USER }),
          Preferences.get({ key: STORAGE_KEYS.EXPIRES_AT }),
        ]);

        const hasAccessToken = !!accessToken.value;
        const hasRefreshToken = !!refreshToken.value;
        const hasUser = !!userStr.value;

        if (hasAccessToken && hasUser && userStr.value) {
          const user = JSON.parse(userStr.value) as LocalUser;
          const expiresAt = expiresAtStr.value ? parseInt(expiresAtStr.value, 10) : null;

          // Check if token is expired
          if (!expiresAt || Date.now() < expiresAt) {
            this.authStateSubject.next({
              isAuthenticated: true,
              user,
              accessToken: accessToken.value,
              refreshToken: hasRefreshToken ? refreshToken.value : null,
              expiresAt,
            });
          } else if (hasRefreshToken) {
            // Try to refresh the token
            this.refreshAccessToken().subscribe();
          }
        } else if (hasRefreshToken) {
          // Try to refresh the token
          this.refreshAccessToken().subscribe();
        }
      } catch (error) {
        console.error('Failed to initialize auth state:', error);
      }
    }
  }

  /**
   * Login with email and password
   */
  login(request: LoginRequest): Observable<LocalAuthState> {
    const identifier = request.dni ?? request.email;

    if (!identifier) {
      return throwError(() => new Error('DNI or email required for login.'));
    }

    const body = new HttpParams().set('username', identifier).set('password', request.password);

    const headers = new HttpHeaders({
      'Content-Type': 'application/x-www-form-urlencoded',
    });

    return this.http
      .post<GatewayTokenResponse>(`${this.baseUrl}/token`, body.toString(), { headers })
      .pipe(
        retry(1),
        switchMap(token => {
          if (!token?.access_token) {
            return throwError(
              () => new Error('Authentication service did not return an access token.')
            );
          }

          return this.fetchUserProfile(token.access_token).pipe(
            switchMap(profile => {
              const response: TokenResponse = {
                access_token: token.access_token,
                refresh_token: null,
                token_type: token.token_type || 'bearer',
                expires_in: token.expires_in ?? null,
                user: this.mapGatewayUser(profile),
              };

              return from(this.handleAuthResponse(response));
            })
          );
        }),
        map(() => this.authStateSubject.value),
        catchError(error => this.handleError(error))
      );
  }

  /**
   * Register a new user
   */
  register(request: RegisterRequest): Observable<LocalAuthState> {
    return throwError(
      () => new Error('User registration is not yet supported by the local auth service.')
    );
  }

  /**
   * Logout the user
   */
  async logout(): Promise<void> {
    // Clear local state
    this.authStateSubject.next({
      isAuthenticated: false,
      user: null,
      accessToken: null,
      refreshToken: null,
      expiresAt: null,
    });

    // Clear storage
    if (Capacitor.isNativePlatform()) {
      await Promise.all([
        Preferences.remove({ key: STORAGE_KEYS.ACCESS_TOKEN }),
        Preferences.remove({ key: STORAGE_KEYS.REFRESH_TOKEN }),
        Preferences.remove({ key: STORAGE_KEYS.USER }),
        Preferences.remove({ key: STORAGE_KEYS.EXPIRES_AT }),
      ]);
    }
  }

  /**
   * Refresh the access token
   */
  refreshAccessToken(): Observable<LocalAuthState> {
    return throwError(
      () => new Error('Token refresh is not supported by the current authentication backend.')
    );
  }

  /**
   * Get current access token
   */
  getAccessToken(): string | null {
    return this.authStateSubject.value.accessToken;
  }

  /**
   * Get current user
   */
  getCurrentUser(): LocalUser | null {
    return this.authStateSubject.value.user;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    const state = this.authStateSubject.value;
    return state.isAuthenticated && !!state.accessToken;
  }

  /**
   * Update user profile
   */
  updateProfile(updates: Partial<LocalUser>): Observable<LocalUser> {
    return throwError(
      () => new Error('Updating profiles through the authentication service is not supported yet.')
    );
  }

  /**
   * Update user preferences
   */
  updatePreferences(preferences: Partial<UserPreferences>): Observable<LocalUser> {
    return throwError(
      () =>
        new Error(
          'Updating remote preferences is not supported by the current authentication backend.'
        )
    );
  }

  /**
   * Request password reset
   */
  requestPasswordReset(email: string): Observable<{ message: string }> {
    return throwError(
      () => new Error('Password reset is not supported by the current authentication backend.')
    );
  }

  /**
   * Reset password with token
   */
  resetPassword(token: string, newPassword: string): Observable<{ message: string }> {
    return throwError(
      () => new Error('Password reset is not supported by the current authentication backend.')
    );
  }

  /**
   * Change password (requires current password)
   */
  changePassword(currentPassword: string, newPassword: string): Observable<{ message: string }> {
    return throwError(
      () => new Error('Password changes are not supported by the current authentication backend.')
    );
  }

  /**
   * Verify email with token
   */
  verifyEmail(token: string): Observable<{ message: string }> {
    return throwError(
      () => new Error('Email verification is not supported by the current authentication backend.')
    );
  }

  /**
   * Resend verification email
   */
  resendVerificationEmail(): Observable<{ message: string }> {
    return throwError(
      () => new Error('Email verification is not supported by the current authentication backend.')
    );
  }

  /**
   * Handle authentication response
   */
  private async handleAuthResponse(response: TokenResponse): Promise<void> {
    const expiresInSeconds = response.expires_in ?? null;
    const expiresAt = expiresInSeconds ? Date.now() + expiresInSeconds * 1000 : null;

    // Update auth state
    this.authStateSubject.next({
      isAuthenticated: true,
      user: response.user,
      accessToken: response.access_token,
      refreshToken: response.refresh_token,
      expiresAt,
    });

    // Store tokens and user info
    if (Capacitor.isNativePlatform()) {
      await Promise.all([
        Preferences.set({
          key: STORAGE_KEYS.ACCESS_TOKEN,
          value: response.access_token,
        }),
        response.refresh_token
          ? Preferences.set({
              key: STORAGE_KEYS.REFRESH_TOKEN,
              value: response.refresh_token,
            })
          : Preferences.remove({ key: STORAGE_KEYS.REFRESH_TOKEN }),
        Preferences.set({
          key: STORAGE_KEYS.USER,
          value: JSON.stringify(response.user),
        }),
        expiresAt !== null
          ? Preferences.set({
              key: STORAGE_KEYS.EXPIRES_AT,
              value: expiresAt.toString(),
            })
          : Preferences.remove({ key: STORAGE_KEYS.EXPIRES_AT }),
      ]);
    }

    // Schedule token refresh
    if (response.refresh_token && expiresInSeconds) {
      this.scheduleTokenRefresh(expiresInSeconds);
    }
  }

  /**
   * Schedule automatic token refresh
   */
  private scheduleTokenRefresh(expiresIn: number): void {
    // Refresh 5 minutes before expiration
    const refreshTime = (expiresIn - 300) * 1000;

    if (refreshTime > 0) {
      setTimeout(() => {
        if (this.isAuthenticated()) {
          this.refreshAccessToken().subscribe();
        }
      }, refreshTime);
    }
  }

  /**
   * Fetch user profile information from the API Gateway after successful login
   */
  private fetchUserProfile(accessToken: string): Observable<GatewayUserResponse> {
    const headers = new HttpHeaders({
      Authorization: `Bearer ${accessToken}`,
    });

    return this.http.get<GatewayUserResponse>(`${this.baseUrl}/users/me`, { headers });
  }

  /**
   * Map API Gateway user payload into the local user format used by the app
   */
  private mapGatewayUser(user: GatewayUserResponse): LocalUser {
    return {
      id: user.dni,
      email: user.email,
      firstName: user.name,
      lastName: user.surname,
      role: 'patient',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      preferences: {
        glucoseUnit: 'mg/dL',
        targetRange: {
          low: 70,
          high: 180,
        },
        language: 'es',
        notifications: {
          appointments: true,
          readings: true,
          reminders: true,
        },
        theme: 'auto',
      },
    };
  }

  /**
   * Handle HTTP errors
   */
  private handleError(error: any): Observable<never> {
    let errorMessage = 'An error occurred';

    if (!error) {
      return throwError(() => new Error(errorMessage));
    }

    if (typeof error === 'string') {
      return throwError(() => new Error(error));
    }

    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Server-side error
      const status = typeof error.status === 'number' ? error.status : 0;
      const message = error.error?.message || error.message || errorMessage;
      errorMessage = status ? `Error Code: ${status}\nMessage: ${message}` : message;

      if (status === 401) {
        errorMessage = 'Invalid credentials or session expired.';
      } else if (status === 403) {
        errorMessage = 'Access forbidden. Please verify your account.';
      } else if (status === 409) {
        errorMessage = 'User already exists with this email.';
      } else if (status === 422) {
        errorMessage = 'Invalid data provided. Please check your input.';
      } else if (status === 500) {
        errorMessage = 'Server error. Please try again later.';
      }
      if (error.error?.detail) {
        errorMessage = Array.isArray(error.error.detail)
          ? error.error.detail.map((d: any) => d.msg || d.detail || d).join(', ')
          : error.error.detail;
      }
    }

    console.error('LocalAuthService Error:', errorMessage);
    return throwError(() => new Error(errorMessage));
  }
}

/**
 * Token payload returned by the API Gateway auth route
 */
interface GatewayTokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
}

/**
 * User payload returned by the login microservice through the API Gateway
 */
interface GatewayUserResponse {
  dni: string;
  name: string;
  surname: string;
  blocked: boolean;
  email: string;
  tidepool?: string | null;
  hospital_account: string;
  times_measured: number;
  streak: number;
  max_streak: number;
}
