import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError, from, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { PlatformDetectorService } from './platform-detector.service';
import { LoggerService } from './logger.service';
import { MockDataService } from './mock-data.service';
import { environment } from '../../../environments/environment';

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
 * Account state enum
 */
export enum AccountState {
  PENDING = 'pending',
  ACTIVE = 'active',
  DISABLED = 'disabled',
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
  accountState?: AccountState;
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
 * Login result
 */
export interface LoginResult {
  success: boolean;
  user?: LocalUser;
  error?: string;
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
  // Authentication state
  private authStateSubject = new BehaviorSubject<LocalAuthState>({
    isAuthenticated: false,
    user: null,
    accessToken: null,
    refreshToken: null,
    expiresAt: null,
  });

  public authState$ = this.authStateSubject.asObservable();

  private baseUrl: string;

  constructor(
    private http: HttpClient,
    private platformDetector: PlatformDetectorService,
    private logger: LoggerService,
    private mockData: MockDataService
  ) {
    this.logger.info('Init', 'LocalAuthService initialized (USING MOCK DATA)');
    // Set base URL for API calls
    const defaultUrl = environment.backendServices?.apiGateway?.baseUrl || 'http://localhost:8000';
    this.baseUrl = this.platformDetector.getApiBaseUrl(defaultUrl);

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
            this.logger.info('Auth', 'Auth state restored from storage', { userId: user.id });
            this.authStateSubject.next({
              isAuthenticated: true,
              user,
              accessToken: accessToken.value,
              refreshToken: hasRefreshToken ? refreshToken.value : null,
              expiresAt,
            });
          } else if (hasRefreshToken) {
            this.logger.info('Auth', 'Token expired, attempting refresh');
            // Try to refresh the token
            this.refreshAccessToken().subscribe();
          }
        } else if (hasRefreshToken) {
          this.logger.info('Auth', 'No access token, attempting refresh');
          // Try to refresh the token
          this.refreshAccessToken().subscribe();
        }
      } catch (error) {
        this.logger.error('Auth', 'Failed to initialize auth state', error);
      }
    }
  }

  /**
   * Login with username (DNI or email) and password
   * Updated to be simpler and match the UI requirements
   */
  login(username: string, password: string, rememberMe: boolean = false): Observable<LoginResult> {
    this.logger.info('Auth', 'Login attempt (ALWAYS USING MOCK DATA)', { username, rememberMe });

    // ALWAYS USE MOCK DATA SERVICE
    return this.mockData.login(username, password).pipe(
      switchMap(mockUser => {
        const authResponse: TokenResponse = {
          access_token: 'mock_access_token_' + Date.now(),
          refresh_token: null,
          token_type: 'bearer',
          expires_in: 86400, // 24 hours
          user: {
            id: mockUser.id,
            email: mockUser.email,
            firstName: mockUser.name.split(' ')[0],
            lastName: mockUser.name.split(' ').slice(1).join(' '),
            role: 'patient',
            accountState: AccountState.ACTIVE,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            preferences: {
              glucoseUnit: 'mg/dL',
              targetRange: { low: 70, high: 180 },
              language: 'es',
              notifications: { appointments: true, readings: true, reminders: true },
              theme: 'light',
            },
          },
        };

        return from(this.handleAuthResponse(authResponse, rememberMe)).pipe(
          map(
            () =>
              ({
                success: true,
                user: authResponse.user,
              }) as LoginResult
          )
        );
      }),
      catchError(error => {
        this.logger.error('Auth', 'Mock login failed', error);
        return of({
          success: false,
          error: 'Error al iniciar sesión con datos mockeados',
        } as LoginResult);
      })
    );

    // Backend code removed - using only mock data
    const body = new HttpParams()
      .set('username', username) // Can be DNI or email
      .set('password', password);

    const headers = new HttpHeaders({
      'Content-Type': 'application/x-www-form-urlencoded',
    });

    // Call token endpoint directly
    return this.http
      .post<GatewayTokenResponse>(`${this.baseUrl}/token`, body.toString(), { headers })
      .pipe(
        switchMap(token => {
          if (!token?.access_token) {
            return throwError(
              () => new Error('Authentication service did not return an access token.')
            );
          }

          // After getting token, fetch user profile
          return this.fetchUserProfile(token.access_token).pipe(
            switchMap(profile => {
              // Check account state
              if (profile.state === 'pending') {
                this.logger.warn('Auth', 'Account pending activation', { username });
                return throwError(() => new Error('auth.errors.accountPending'));
              }
              if (profile.state === 'disabled') {
                this.logger.warn('Auth', 'Account disabled', { username });
                return throwError(() => new Error('auth.errors.accountDisabled'));
              }

              this.logger.info('Auth', 'Login successful', { username, userId: profile.dni });

              const authResponse: TokenResponse = {
                access_token: token.access_token,
                refresh_token: null, // No refresh token in current implementation
                token_type: token.token_type || 'bearer',
                expires_in: token.expires_in ?? 1800, // Default 30 minutes
                user: this.mapGatewayUser(profile),
              };

              return from(this.handleAuthResponse(authResponse, rememberMe)).pipe(
                map(
                  () =>
                    ({
                      success: true,
                      user: authResponse.user,
                    }) as LoginResult
                )
              );
            })
          );
        }),
        catchError(error => {
          const errorMessage = this.extractErrorMessage(error);
          this.logger.error('Auth', 'Login failed', error, { username });
          return of({
            success: false,
            error: errorMessage,
          } as LoginResult);
        })
      );
  }

  /**
   * Handle demo mode login without calling backend
   */
  private async handleDemoLogin(rememberMe: boolean): Promise<LoginResult> {
    try {
      const demoUser: LocalUser = {
        id: 'demo_patient',
        email: 'demo@diabetactic.com',
        firstName: 'Sofia',
        lastName: 'Rodriguez',
        role: 'patient',
        accountState: AccountState.ACTIVE,
        diabetesType: '1',
        diagnosisDate: '2020-03-15',
        dateOfBirth: '2013-08-22',
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
          theme: 'light',
        },
      };

      const mockToken: TokenResponse = {
        access_token: 'demo_access_token',
        refresh_token: null,
        token_type: 'bearer',
        expires_in: 86400, // 24 hours for demo
        user: demoUser,
      };

      await this.handleAuthResponse(mockToken, rememberMe);

      this.logger.info('Auth', 'Demo login successful');
      return {
        success: true,
        user: demoUser,
      };
    } catch (error) {
      this.logger.error('Auth', 'Demo login failed', error);
      return {
        success: false,
        error: 'Error al iniciar sesión en modo demo',
      };
    }
  }

  /**
   * Register a new user
   */
  register(request: RegisterRequest): Observable<LoginResult> {
    return of({
      success: false,
      error: 'User registration is not yet supported by the local auth service.',
    });
  }

  /**
   * Logout the user
   */
  async logout(): Promise<void> {
    const user = this.authStateSubject.value.user;
    this.logger.info('Auth', 'Logout initiated', { userId: user?.id });

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

    this.logger.info('Auth', 'Logout completed', { userId: user?.id });
  }

  /**
   * Refresh the access token
   * Note: Current backend doesn't support refresh tokens, so this returns an error
   */
  refreshAccessToken(): Observable<LocalAuthState> {
    this.logger.warn('Auth', 'Token refresh not supported');
    // When 401 is received, user must re-login as per the requirements
    return throwError(() => new Error('Token refresh is not supported. Please login again.'));
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
  isAuthenticated(): Observable<boolean> {
    return this.authState$.pipe(map(state => state.isAuthenticated && !!state.accessToken));
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
  private async handleAuthResponse(response: TokenResponse, rememberMe: boolean): Promise<void> {
    const expiresInSeconds = response.expires_in ?? 1800; // Default 30 minutes
    const expiresAt = Date.now() + expiresInSeconds * 1000;

    // Update auth state
    this.authStateSubject.next({
      isAuthenticated: true,
      user: response.user,
      accessToken: response.access_token,
      refreshToken: response.refresh_token,
      expiresAt,
    });

    // Store tokens and user info if remember me is checked or on native platforms
    if (Capacitor.isNativePlatform() || rememberMe) {
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
          : Promise.resolve(),
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

    // Schedule token expiration reminder (5 minutes before expiry)
    const reminderTime = (expiresInSeconds - 300) * 1000;
    if (reminderTime > 0) {
      setTimeout(() => {
        console.log('Token will expire soon. User should re-authenticate.');
        // Could emit an event here for the UI to show a warning
      }, reminderTime);
    }
  }

  /**
   * Fetch user profile information from the API Gateway after successful login
   */
  private fetchUserProfile(accessToken: string): Observable<GatewayUserResponse> {
    const headers = new HttpHeaders({
      Authorization: `Bearer ${accessToken}`,
    });

    // Call user profile endpoint directly
    return this.http.get<GatewayUserResponse>(`${this.baseUrl}/users/me`, { headers }).pipe(
      catchError(error => {
        return throwError(() => new Error('Failed to fetch user profile'));
      })
    );
  }

  /**
   * Map API Gateway user payload into the local user format used by the app
   */
  private mapGatewayUser(user: GatewayUserResponse): LocalUser {
    const accountState = user.state ? (user.state as AccountState) : AccountState.ACTIVE;

    return {
      id: user.dni,
      email: user.email,
      firstName: user.name,
      lastName: user.surname,
      role: 'patient',
      accountState,
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
   * Extract error message from various error formats
   */
  private extractErrorMessage(error: any): string {
    if (!error) {
      return 'An error occurred';
    }

    if (typeof error === 'string') {
      return error;
    }

    if (error.message) {
      // Check for specific error codes
      if (error.message.includes('accountPending')) {
        return 'Tu cuenta está pendiente de activación. Por favor, contacta al administrador.';
      }
      if (error.message.includes('accountDisabled')) {
        return 'Tu cuenta ha sido deshabilitada. Por favor, contacta al administrador.';
      }
      return error.message;
    }

    if (error.error) {
      if (error.error.detail) {
        if (Array.isArray(error.error.detail)) {
          return error.error.detail.map((d: any) => d.msg || d.detail || d).join(', ');
        }
        return error.error.detail;
      }
      if (error.error.message) {
        return error.error.message;
      }
    }

    // HTTP status code specific messages
    if (error.status) {
      switch (error.status) {
        case 401:
          return 'Credenciales incorrectas. Verifica tu DNI/email y contraseña.';
        case 403:
          return 'Acceso denegado. Por favor, verifica tu cuenta.';
        case 409:
          return 'El usuario ya existe con este email.';
        case 422:
          return 'Datos inválidos. Por favor, verifica tu información.';
        case 500:
          return 'Error del servidor. Por favor, intenta de nuevo más tarde.';
        case 0:
          return 'Error de conexión. Verifica tu conexión a internet.';
        default:
          return `Error ${error.status}: ${error.message || 'Algo salió mal'}`;
      }
    }

    return 'Error al iniciar sesión. Por favor, intenta de nuevo.';
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
  state?: 'pending' | 'active' | 'disabled';
  tidepool?: string | null;
  hospital_account: string;
  times_measured: number;
  streak: number;
  max_streak: number;
}
