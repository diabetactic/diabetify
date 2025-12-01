import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError, from, of } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { PlatformDetectorService } from './platform-detector.service';
import { LoggerService } from './logger.service';
import { MockDataService } from './mock-data.service';
import { MockAdapterService } from './mock-adapter.service';
import { CapacitorHttpService } from './capacitor-http.service';
import { environment } from '../../../environments/environment';
import { API_GATEWAY_BASE_URL } from '../../shared/config/api-base-url';

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
  protected authStateSubject = new BehaviorSubject<LocalAuthState>({
    isAuthenticated: false,
    user: null,
    accessToken: null,
    refreshToken: null,
    expiresAt: null,
  });

  public authState$ = this.authStateSubject.asObservable();

  private baseUrl: string;

  // Promise that resolves when initialization is complete
  private initializationPromise: Promise<void>;
  private initializationResolve!: () => void;

  constructor(
    private http: HttpClient,
    private platformDetector: PlatformDetectorService,
    private logger: LoggerService,
    private mockData: MockDataService,
    private mockAdapter: MockAdapterService,
    private capacitorHttp: CapacitorHttpService
  ) {
    this.logger.info('Init', 'LocalAuthService initialized');
    // Set base URL for API calls
    const defaultUrl = API_GATEWAY_BASE_URL;
    this.baseUrl = this.platformDetector.getApiBaseUrl(defaultUrl);

    this.logger.debug('Auth', 'LocalAuthService baseUrl resolved', {
      defaultUrl,
      resolvedBaseUrl: this.baseUrl,
    });

    // Create initialization promise
    this.initializationPromise = new Promise<void>(resolve => {
      this.initializationResolve = resolve;
    });

    // Initialize auth state from storage
    this.initializeAuthState();
  }

  /**
   * Initialize authentication state from storage
   * Resolves initializationPromise when complete
   * NOTE: Capacitor Preferences uses localStorage on web, so we always use it
   */
  private async initializeAuthState(): Promise<void> {
    try {
      // Always try to restore from storage (works on both native and web)
      // Capacitor Preferences uses localStorage on web platforms
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
    } finally {
      // Resolve initialization promise when complete (success or error)
      this.initializationResolve();
    }
  }

  /**
   * Login with username (DNI or email) and password
   * Updated to be simpler and match the UI requirements
   */
  login(username: string, password: string, rememberMe: boolean = false): Observable<LoginResult> {
    const isAuthMockEnabled = this.mockAdapter.isServiceMockEnabled('auth');
    // SECURITY: Removed credential logging - HIPAA/COPPA compliance
    this.logger.debug('Auth', 'Login attempt', {
      backendMode: (environment as { backendMode?: string }).backendMode,
      mockEnabled: isAuthMockEnabled,
    });

    // MOCK MODE: Return mock data immediately without HTTP calls
    if (isAuthMockEnabled) {
      console.log('🎭 [AUTH] MOCK MODE - Bypassing backend, returning mock data');
      this.logger.info('Auth', 'Mock mode login - bypassing HTTP calls', {
        username,
        backendMode: (environment as { backendMode?: string }).backendMode,
      });
      return from(this.handleDemoLogin(rememberMe));
    }

    // REAL BACKEND MODE (cloud or local)
    console.log('🔐 [AUTH] Base URL:', this.baseUrl);
    console.log('🔐 [AUTH] Token endpoint:', `${this.baseUrl}/token`);

    this.logger.info('Auth', 'Login attempt - trying REAL backend', {
      username,
      passwordLength: password?.length ?? 0,
      rememberMe,
      baseUrl: this.baseUrl,
      tokenEndpoint: `${this.baseUrl}/token`,
      backendMode: environment.backendMode,
    });

    // Try REAL backend
    const body = new HttpParams()
      .set('username', username) // Can be DNI or email
      .set('password', password);

    const headers = new HttpHeaders({
      'Content-Type': 'application/x-www-form-urlencoded',
    });

    console.log('🔐 [AUTH] Request body:', body.toString());
    console.log('🔐 [AUTH] Request headers:', headers);
    console.log('🔐 [AUTH] Making HTTP POST request...');

    // Call token endpoint directly (use Capacitor HTTP to bypass CORS)
    return this.capacitorHttp
      .post<GatewayTokenResponse>(`${this.baseUrl}/token`, body.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      })
      .pipe(
        tap(response => {
          console.log('✅ [AUTH] HTTP POST successful, response received');
          console.log('✅ [AUTH] Response:', JSON.stringify(response));
        }),
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
          console.error('❌ [AUTH] HTTP request failed');
          console.error('❌ [AUTH] Error object:', error);
          console.error('❌ [AUTH] Error status:', error?.status);
          console.error('❌ [AUTH] Error statusText:', error?.statusText);
          console.error('❌ [AUTH] Error message:', error?.message);
          console.error('❌ [AUTH] Error error:', error?.error);
          console.error(
            '❌ [AUTH] Full error JSON:',
            JSON.stringify(error, Object.getOwnPropertyNames(error))
          );

          const errorMessage = this.extractErrorMessage(error);
          console.error('❌ [AUTH] Extracted error message:', errorMessage);

          this.logger.error('Auth', 'Login failed', error, {
            username,
            baseUrl: this.baseUrl,
            status: (error && error.status) || null,
            backendPayload: error && error.error,
          });
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
   * NOTE: Always clears storage (Capacitor Preferences uses localStorage on web)
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

    // Always clear storage (works on both native and web)
    // Capacitor Preferences uses localStorage on web platforms
    await Promise.all([
      Preferences.remove({ key: STORAGE_KEYS.ACCESS_TOKEN }),
      Preferences.remove({ key: STORAGE_KEYS.REFRESH_TOKEN }),
      Preferences.remove({ key: STORAGE_KEYS.USER }),
      Preferences.remove({ key: STORAGE_KEYS.EXPIRES_AT }),
    ]);

    this.logger.info('Auth', 'Logout completed', { userId: user?.id });
  }

  /**
   * Refresh the access token using stored refresh token
   * Calls /token endpoint with grant_type=refresh_token
   */
  refreshAccessToken(): Observable<LocalAuthState> {
    this.logger.info('Auth', 'Attempting token refresh');

    return from(Preferences.get({ key: STORAGE_KEYS.REFRESH_TOKEN })).pipe(
      switchMap(({ value: refreshToken }) => {
        if (!refreshToken) {
          this.logger.warn('Auth', 'No refresh token available');
          return throwError(() => new Error('No refresh token available. Please login again.'));
        }

        // Call refresh endpoint with refresh_token grant
        const body = new HttpParams()
          .set('grant_type', 'refresh_token')
          .set('refresh_token', refreshToken);

        const headers = new HttpHeaders({
          'Content-Type': 'application/x-www-form-urlencoded',
        });

        this.logger.info('Auth', 'Calling refresh endpoint', { endpoint: `${this.baseUrl}/token` });

        return this.capacitorHttp
          .post<GatewayTokenResponse>(`${this.baseUrl}/token`, body.toString(), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          })
          .pipe(
            switchMap(token => {
              if (!token?.access_token) {
                return throwError(
                  () => new Error('Token refresh failed: no access token in response')
                );
              }

              this.logger.info('Auth', 'Token refresh successful');

              // Update access token in state and storage
              const currentUser = this.authStateSubject.value.user;
              if (!currentUser) {
                return throwError(() => new Error('No user in auth state'));
              }

              const expiresAt = Date.now() + (token.expires_in ?? 1800) * 1000;

              // Update state
              const newState: LocalAuthState = {
                isAuthenticated: true,
                user: currentUser,
                accessToken: token.access_token,
                refreshToken: token.refresh_token || refreshToken, // Use new refresh token or keep old one
                expiresAt,
              };

              this.authStateSubject.next(newState);

              // Persist new tokens
              return from(
                Promise.all([
                  Preferences.set({
                    key: STORAGE_KEYS.ACCESS_TOKEN,
                    value: token.access_token,
                  }),
                  token.refresh_token
                    ? Preferences.set({
                        key: STORAGE_KEYS.REFRESH_TOKEN,
                        value: token.refresh_token,
                      })
                    : Promise.resolve(),
                  Preferences.set({
                    key: STORAGE_KEYS.EXPIRES_AT,
                    value: expiresAt.toString(),
                  }),
                ])
              ).pipe(map(() => newState));
            }),
            catchError(error => {
              this.logger.error('Auth', 'Token refresh failed', error);
              // Clear invalid refresh token
              from(Preferences.remove({ key: STORAGE_KEYS.REFRESH_TOKEN })).subscribe();
              return throwError(() => new Error('Token refresh failed. Please login again.'));
            })
          );
      })
    );
  }

  /**
   * Get current access token
   * Waits for initialization to complete before returning
   */
  async getAccessToken(): Promise<string | null> {
    // Wait for initialization to complete
    await this.initializationPromise;
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
   * NOTE: Always persists to storage (Capacitor Preferences uses localStorage on web)
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

    // Always store tokens and user info (works on both native and web)
    // Capacitor Preferences uses localStorage on web platforms
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
    const headers = {
      Authorization: `Bearer ${accessToken}`,
    };

    // Call user profile endpoint directly (use Capacitor HTTP to bypass CORS)
    return this.capacitorHttp
      .get<GatewayUserResponse>(`${this.baseUrl}/users/me`, { headers })
      .pipe(
        catchError(error => {
          return throwError(() => new Error('Failed to fetch user profile'));
        })
      );
  }

  /**
   * Map API Gateway user payload into the local user format used by the app
   */
  private mapGatewayUser(user: GatewayUserResponse): LocalUser {
    const accountState: AccountState = user.state
      ? (user.state as AccountState)
      : AccountState.ACTIVE;

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
  private extractErrorMessage(error: unknown): string {
    if (!error) {
      return 'An error occurred';
    }

    if (typeof error === 'string') {
      return error;
    }

    const errorObj = error as Record<string, unknown>;

    if (errorObj['message']) {
      const message = errorObj['message'] as string;
      // Check for specific error codes
      if (message.includes('accountPending')) {
        return 'Tu cuenta está pendiente de activación. Por favor, contacta al administrador.';
      }
      if (message.includes('accountDisabled')) {
        return 'Tu cuenta ha sido deshabilitada. Por favor, contacta al administrador.';
      }
      return message;
    }

    const errorNested = errorObj['error'] as Record<string, unknown> | undefined;
    if (errorNested) {
      if (errorNested['detail']) {
        if (Array.isArray(errorNested['detail'])) {
          return (errorNested['detail'] as unknown[])
            .map((d: unknown) => {
              const detailObj = d as Record<string, unknown>;
              return (
                (detailObj['msg'] as string | undefined) ||
                (detailObj['detail'] as string | undefined) ||
                d
              );
            })
            .join(', ');
        }
        return errorNested['detail'] as string;
      }
      if (errorNested['message']) {
        return errorNested['message'] as string;
      }
    }

    // HTTP status code specific messages
    if (errorObj['status']) {
      const status = errorObj['status'] as number;
      switch (status) {
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
          return `Error ${status}: ${(errorObj['message'] as string | undefined) || 'Algo salió mal'}`;
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
  refresh_token?: string;
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
