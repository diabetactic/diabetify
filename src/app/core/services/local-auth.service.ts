import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError, of } from 'rxjs';
import { catchError, map, retry, tap, switchMap } from 'rxjs/operators';
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
  email: string;
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
  refresh_token: string;
  token_type: string;
  expires_in: number;
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

        if (accessToken.value && refreshToken.value && userStr.value) {
          const user = JSON.parse(userStr.value) as LocalUser;
          const expiresAt = expiresAtStr.value ? parseInt(expiresAtStr.value, 10) : null;

          // Check if token is expired
          if (expiresAt && Date.now() < expiresAt) {
            this.authStateSubject.next({
              isAuthenticated: true,
              user,
              accessToken: accessToken.value,
              refreshToken: refreshToken.value,
              expiresAt,
            });
          } else if (refreshToken.value) {
            // Try to refresh the token
            this.refreshAccessToken().subscribe();
          }
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
    return this.http.post<TokenResponse>(`${this.fullUrl}/login`, request).pipe(
      retry(1),
      tap(response => this.handleAuthResponse(response)),
      map(() => this.authStateSubject.value),
      catchError(this.handleError)
    );
  }

  /**
   * Register a new user
   */
  register(request: RegisterRequest): Observable<LocalAuthState> {
    return this.http.post<TokenResponse>(`${this.fullUrl}/register`, request).pipe(
      retry(1),
      tap(response => this.handleAuthResponse(response)),
      map(() => this.authStateSubject.value),
      catchError(this.handleError)
    );
  }

  /**
   * Logout the user
   */
  async logout(): Promise<void> {
    const refreshToken = this.authStateSubject.value.refreshToken;

    // Call logout endpoint if we have a refresh token
    if (refreshToken) {
      this.http
        .post(`${this.fullUrl}/logout`, { refresh_token: refreshToken })
        .pipe(
          catchError(() => of(null)) // Ignore errors on logout
        )
        .subscribe();
    }

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
    const refreshToken = this.authStateSubject.value.refreshToken;

    if (!refreshToken) {
      return throwError(() => new Error('No refresh token available'));
    }

    return this.http
      .post<TokenResponse>(`${this.fullUrl}/refresh`, {
        refresh_token: refreshToken,
      })
      .pipe(
        retry(1),
        tap(response => this.handleAuthResponse(response)),
        map(() => this.authStateSubject.value),
        catchError(error => {
          // If refresh fails, logout the user
          this.logout();
          return this.handleError(error);
        })
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
    return this.http.put<LocalUser>(`${this.fullUrl}/profile`, updates).pipe(
      retry(1),
      tap(user => {
        const currentState = this.authStateSubject.value;
        this.authStateSubject.next({ ...currentState, user });
        if (Capacitor.isNativePlatform()) {
          Preferences.set({
            key: STORAGE_KEYS.USER,
            value: JSON.stringify(user),
          });
        }
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Update user preferences
   */
  updatePreferences(preferences: Partial<UserPreferences>): Observable<LocalUser> {
    return this.http.put<LocalUser>(`${this.fullUrl}/preferences`, preferences).pipe(
      retry(1),
      tap(user => {
        const currentState = this.authStateSubject.value;
        this.authStateSubject.next({ ...currentState, user });
        if (Capacitor.isNativePlatform()) {
          Preferences.set({
            key: STORAGE_KEYS.USER,
            value: JSON.stringify(user),
          });
        }
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Request password reset
   */
  requestPasswordReset(email: string): Observable<{ message: string }> {
    return this.http
      .post<{ message: string }>(`${this.fullUrl}/password/reset-request`, { email })
      .pipe(retry(1), catchError(this.handleError));
  }

  /**
   * Reset password with token
   */
  resetPassword(token: string, newPassword: string): Observable<{ message: string }> {
    return this.http
      .post<{ message: string }>(`${this.fullUrl}/password/reset`, {
        token,
        new_password: newPassword,
      })
      .pipe(retry(1), catchError(this.handleError));
  }

  /**
   * Change password (requires current password)
   */
  changePassword(currentPassword: string, newPassword: string): Observable<{ message: string }> {
    return this.http
      .post<{ message: string }>(`${this.fullUrl}/password/change`, {
        current_password: currentPassword,
        new_password: newPassword,
      })
      .pipe(retry(1), catchError(this.handleError));
  }

  /**
   * Verify email with token
   */
  verifyEmail(token: string): Observable<{ message: string }> {
    return this.http
      .post<{ message: string }>(`${this.fullUrl}/verify-email`, { token })
      .pipe(retry(1), catchError(this.handleError));
  }

  /**
   * Resend verification email
   */
  resendVerificationEmail(): Observable<{ message: string }> {
    return this.http
      .post<{ message: string }>(`${this.fullUrl}/resend-verification`, {})
      .pipe(retry(1), catchError(this.handleError));
  }

  /**
   * Handle authentication response
   */
  private async handleAuthResponse(response: TokenResponse): Promise<void> {
    const expiresAt = Date.now() + response.expires_in * 1000;

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
        Preferences.set({
          key: STORAGE_KEYS.REFRESH_TOKEN,
          value: response.refresh_token,
        }),
        Preferences.set({
          key: STORAGE_KEYS.USER,
          value: JSON.stringify(response.user),
        }),
        Preferences.set({
          key: STORAGE_KEYS.EXPIRES_AT,
          value: expiresAt.toString(),
        }),
      ]);
    }

    // Schedule token refresh
    this.scheduleTokenRefresh(response.expires_in);
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
   * Handle HTTP errors
   */
  private handleError(error: any): Observable<never> {
    let errorMessage = 'An error occurred';

    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Server-side error
      errorMessage = `Error Code: ${error.status}\nMessage: ${
        error.error?.message || error.message
      }`;

      if (error.status === 401) {
        errorMessage = 'Invalid credentials or session expired.';
      } else if (error.status === 403) {
        errorMessage = 'Access forbidden. Please verify your account.';
      } else if (error.status === 409) {
        errorMessage = 'User already exists with this email.';
      } else if (error.status === 422) {
        errorMessage = 'Invalid data provided. Please check your input.';
      } else if (error.status === 500) {
        errorMessage = 'Server error. Please try again later.';
      }
    }

    console.error('LocalAuthService Error:', errorMessage);
    return throwError(() => new Error(errorMessage));
  }
}
