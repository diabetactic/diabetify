import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError, from, of, firstValueFrom } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { Preferences } from '@capacitor/preferences';
import { Network } from '@capacitor/network';
import { PlatformDetectorService } from '@services/platform-detector.service';
import { LoggerService } from '@services/logger.service';
import { TokenService } from '@services/token.service';
import { AuthSessionService } from '@services/auth-session.service';

import { MockAdapterService } from '@services/mock-adapter.service';
import { EnvironmentConfigService } from '@core/config/environment-config.service';
import { ApiGatewayService } from '@services/api-gateway.service';
import { API_GATEWAY_BASE_URL } from '@shared/config/api-base-url';
import { safeJsonParse, isLocalUser } from '../utils/type-guards';
import { AccountState } from '../models/user-profile.model';

export { AccountState };

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
  accountState?: AccountState;
  profileImage?: string;
  phone?: string;
  dateOfBirth?: string;
  diabetesType?: '1' | '2' | 'gestational' | 'other';
  diagnosisDate?: string;
  createdAt: string;
  updatedAt: string;
  preferences?: UserPreferences;
  // Gamification fields from backend
  times_measured?: number;
  streak?: number;
  max_streak?: number;
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
  maxBolus?: number;
  lowGlucoseThreshold?: number;
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
 * Token response from server
 */
export interface TokenResponse {
  access_token: string;
  refresh_token: string | null;
  token_type: string;
  expires_in?: number | null;
  user: LocalUser;
}

const STORAGE_KEYS = {
  USER: 'local_user',
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
    private mockAdapter: MockAdapterService,
    private tokenService: TokenService,
    private envConfig: EnvironmentConfigService,
    private authSession: AuthSessionService,
    private apiGateway: ApiGatewayService
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

    // Initialize auth state from storage (includes migration from insecure storage)
    this.initializeAuthState();
  }

  private async initializeAuthState(): Promise<void> {
    const INIT_REFRESH_TIMEOUT_MS = 8000;

    try {
      await this.tokenService.waitForInitialization();

      const [accessToken, refreshToken, userStr] = await Promise.all([
        this.tokenService.getAccessToken(),
        this.tokenService.getRefreshToken(),
        Preferences.get({ key: STORAGE_KEYS.USER }),
      ]);

      const hasAccessToken = Boolean(accessToken);
      const hasRefreshToken = Boolean(refreshToken);
      const hasUser = Boolean(userStr.value);

      if (hasAccessToken && hasUser && userStr.value) {
        const user = safeJsonParse<LocalUser>(userStr.value, isLocalUser);
        if (!user) {
          this.logger.warn('Auth', 'Stored user data is invalid, clearing tokens');
          await this.clearStoredTokens();
          return;
        }

        const tokenExpired = this.tokenService.isTokenExpired();

        if (!tokenExpired) {
          this.logger.info('Auth', 'Auth state restored from secure storage', { userId: user.id });
          const tokenState = await this.getTokenStateFromService();
          this.authStateSubject.next({
            isAuthenticated: true,
            user,
            accessToken: tokenState.accessToken,
            refreshToken: tokenState.refreshToken,
            expiresAt: tokenState.expiresAt,
          });
          this.authSession.setUser(user.id);
          await this.clearOrphanedDataIfNeeded(user.id);
        } else if (hasRefreshToken) {
          // Check network status before attempting refresh
          const status = await Network.getStatus();

          if (!status.connected) {
            this.logger.info(
              'Auth',
              'Offline mode: Access token expired but skipping refresh due to no connection',
              { userId: user.id }
            );
            // OPTIMISTIC AUTH: Restore session with expired token to allow offline access
            // The AuthInterceptor will handle refreshing automatically when connection is restored
            const tokenState = await this.getTokenStateFromService();
            this.authStateSubject.next({
              isAuthenticated: true,
              user,
              accessToken: tokenState.accessToken,
              refreshToken: tokenState.refreshToken,
              expiresAt: tokenState.expiresAt,
            });
            this.authSession.setUser(user.id);
            await this.clearOrphanedDataIfNeeded(user.id);
            return;
          }

          this.logger.info('Auth', 'Token expired, attempting refresh with timeout');
          try {
            const refreshPromise = firstValueFrom(this.refreshAccessToken());
            const timeoutPromise = new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('Init refresh timeout')), INIT_REFRESH_TIMEOUT_MS)
            );
            await Promise.race([refreshPromise, timeoutPromise]);
          } catch (err) {
            this.logger.error('Auth', 'Token refresh failed during init', err);
            await this.clearStoredTokens();
          }
        }
      } else if (hasRefreshToken) {
        this.logger.info('Auth', 'No access token, attempting refresh with timeout');
        try {
          const refreshPromise = firstValueFrom(this.refreshAccessToken());
          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Init refresh timeout')), INIT_REFRESH_TIMEOUT_MS)
          );
          await Promise.race([refreshPromise, timeoutPromise]);
        } catch (err) {
          this.logger.error('Auth', 'Token refresh failed during init', err);
          await this.clearStoredTokens();
        }
      }
    } catch (error) {
      this.logger.error('Auth', 'Failed to initialize auth state', error);
    } finally {
      this.initializationResolve();
    }
  }

  private async getTokenStateFromService(): Promise<{
    accessToken: string | null;
    refreshToken: string | null;
    expiresAt: number | null;
  }> {
    const [accessToken, refreshToken] = await Promise.all([
      this.tokenService.getAccessToken(),
      this.tokenService.getRefreshToken(),
    ]);
    return {
      accessToken,
      refreshToken,
      expiresAt: this.tokenService.getExpiresAt(),
    };
  }

  /**
   * Clear stored tokens from SecureStorage
   * Used when token refresh fails to prevent future hangs
   *
   * SECURITY: Clears tokens from secure storage (hardware-backed on mobile)
   */
  private async clearStoredTokens(): Promise<void> {
    try {
      await this.tokenService.clearTokens();
      this.logger.info('Auth', 'Cleared stored tokens from secure storage');
    } catch (e) {
      this.logger.error('Auth', 'Failed to clear stored tokens', e);
    }
  }

  /**
   * Login with username (DNI or email) and password
   * Updated to be simpler and match the UI requirements
   */
  login(username: string, password: string, rememberMe = false): Observable<LoginResult> {
    const isAuthMockEnabled = this.mockAdapter.isServiceMockEnabled('auth');
    this.logger.debug('Auth', 'Login attempt', {
      stage: 'start',
      backendMode: this.envConfig.backendMode,
      mockEnabled: isAuthMockEnabled,
    });

    // MOCK MODE: Return mock data immediately without HTTP calls
    if (isAuthMockEnabled) {
      this.logger.info('Auth', 'Mock mode login - bypassing HTTP calls', {
        stage: 'mock-login',
        username,
        backendMode: this.envConfig.backendMode,
      });
      return from(this.handleDemoLogin(rememberMe));
    }

    // REAL BACKEND MODE (cloud or local)
    this.logger.info('Auth', 'Login attempt - trying REAL backend', {
      stage: 'real-backend-start',
      username,
      passwordLength: password?.length ?? 0,
      rememberMe,
      baseUrl: this.baseUrl,
      tokenEndpoint: `${this.baseUrl}/token`,
      backendMode: this.envConfig.backendMode,
    });

    // Try REAL backend
    const body = new HttpParams()
      .set('username', username) // Can be DNI or email
      .set('password', password);

    this.logger.debug('Auth', 'Backend stage: sending token request', {
      stage: 'http-send',
      endpoint: `${this.baseUrl}/token`,
    });

    // Call token endpoint directly
    // With CapacitorHttp auto-patching enabled, HttpClient uses native HTTP on mobile
    const httpObservable = this.http.post<GatewayTokenResponse>(
      `${this.baseUrl}/token`,
      body.toString(),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }
    );
    return httpObservable.pipe(
      tap(response => {
        this.logger.debug('Auth', 'Backend stage: HTTP response received', {
          stage: 'http-response',
          hasAccessToken: Boolean(response?.access_token),
        });
      }),
      switchMap(token => {
        this.logger.debug('Auth', 'Backend stage: processing token response', {
          stage: 'process-token',
          hasAccessToken: Boolean(token?.access_token),
        });
        if (!token?.access_token) {
          return throwError(
            () => new Error('Authentication service did not return an access token.')
          );
        }

        // After getting token, fetch user profile
        return this.fetchUserProfile(token.access_token).pipe(
          switchMap(profile => {
            this.logger.debug('Auth', 'Backend stage: user profile fetched', {
              stage: 'profile-fetched',
              userId: profile?.dni,
            });
            if (profile.blocked === true) {
              this.logger.warn('Auth', 'Account blocked', { username });
              return throwError(() => new Error('auth.errors.accountDisabled'));
            }

            this.logger.info('Auth', 'Login successful', { username, userId: profile.dni });

            const authResponse: TokenResponse = {
              access_token: token.access_token,
              refresh_token: token.refresh_token ?? null,
              token_type: token.token_type || 'bearer',
              expires_in: token.expires_in ?? 1800,
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
        this.logger.error('Auth', 'Backend stage: catchError from HTTP', {
          stage: 'http-error',
          status: error?.status ?? null,
          message: error?.message,
        });

        const errorMessage = this.extractErrorMessage(error);

        this.logger.error('Auth', 'Login failed', error, {
          username,
          baseUrl: this.baseUrl,
          status: error?.status ?? null,
          backendPayload: error?.error,
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
        times_measured: 42,
        streak: 5,
        max_streak: 10,
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
   * Logout the user
   * SECURITY: Clears tokens from SecureStorage (hardware-backed on mobile)
   * CRITICAL: Also clears IndexedDB to remove PHI data (glucose readings, appointments)
   */
  async logout(): Promise<void> {
    const user = this.authStateSubject.value.user;
    this.logger.info('Auth', 'Logout initiated', { userId: user?.id });

    this.authSession.clearUser();

    // Clear local state
    this.authStateSubject.next({
      isAuthenticated: false,
      user: null,
      accessToken: null,
      refreshToken: null,
      expiresAt: null,
    });

    // SECURITY: Clear tokens from secure storage (hardware-backed on mobile)
    // User data can remain in regular Preferences
    await Promise.all([
      this.tokenService.clearTokens(),
      Preferences.remove({ key: STORAGE_KEYS.USER }),
    ]);

    // CRITICAL: Clear IndexedDB to remove PHI data (glucose readings, appointments)
    const { db } = await import('./database.service');
    await db.clearAllData();

    // SECURITY: Clear API response cache to prevent data leakage between users
    // This ensures cached responses from the previous user are not shown to the next user
    this.apiGateway.clearCache();

    this.logger.info('Auth', 'Logout completed - all data cleared from secure storage and cache', {
      userId: user?.id,
    });
  }

  /**
   * Refresh the access token using stored refresh token
   * Calls /token endpoint with grant_type=refresh_token
   *
   * SECURITY: Reads/writes tokens from SecureStorage (hardware-backed on mobile)
   */
  refreshAccessToken(): Observable<LocalAuthState> {
    this.logger.info('Auth', 'Attempting token refresh');

    return from(this.tokenService.getRefreshToken()).pipe(
      switchMap(refreshToken => {
        if (!refreshToken) {
          this.logger.warn('Auth', 'No refresh token available');
          return throwError(() => new Error('No refresh token available. Please login again.'));
        }

        const body = new HttpParams()
          .set('grant_type', 'refresh_token')
          .set('refresh_token', refreshToken);

        this.logger.info('Auth', 'Calling refresh endpoint', { endpoint: `${this.baseUrl}/token` });

        return this.http
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

              const currentUser = this.authStateSubject.value.user;
              if (!currentUser) {
                return throwError(() => new Error('No user in auth state'));
              }

              const expiresInSeconds = token.expires_in ?? 1800;
              const expiresAt = Date.now() + expiresInSeconds * 1000;
              const newRefreshToken = token.refresh_token || refreshToken;

              const newState: LocalAuthState = {
                isAuthenticated: true,
                user: currentUser,
                accessToken: token.access_token,
                refreshToken: newRefreshToken,
                expiresAt,
              };

              this.authStateSubject.next(newState);

              return from(
                this.tokenService.setTokens(token.access_token, newRefreshToken, expiresInSeconds)
              ).pipe(map(() => newState));
            }),
            catchError(error => {
              this.logger.error('Auth', 'Token refresh failed', error);
              return from(this.tokenService.clearTokens()).pipe(
                switchMap(() =>
                  throwError(() => new Error('Token refresh failed. Please login again.'))
                )
              );
            })
          );
      })
    );
  }

  /**
   * Wait for auth initialization to complete
   * Useful for guards and components that need to wait for auth state restoration
   */
  async waitForInitialization(): Promise<void> {
    await this.initializationPromise;
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
    return this.authState$.pipe(map(state => state.isAuthenticated && Boolean(state.accessToken)));
  }

  /**
   * Update user profile
   */
  updateProfile(_updates: Partial<LocalUser>): Observable<LocalUser> {
    return throwError(
      () => new Error('Updating profiles through the authentication service is not supported yet.')
    );
  }

  /**
   * Update user preferences
   */
  updatePreferences(_preferences: Partial<UserPreferences>): Observable<LocalUser> {
    return throwError(
      () =>
        new Error(
          'Updating remote preferences is not supported by the current authentication backend.'
        )
    );
  }

  requestPasswordReset(email: string): Observable<{ message: string }> {
    const isAuthMockEnabled = this.mockAdapter.isServiceMockEnabled('auth');

    if (isAuthMockEnabled) {
      this.logger.info('Auth', 'Mock mode - simulating password reset request', { email });
      return of({ message: 'Mail should be received anytime' });
    }

    this.logger.info('Auth', 'Requesting password reset', { email });

    return this.http
      .post<{ message: string } | string>(`${this.baseUrl}/forgot-password`, { email })
      .pipe(
        map(response => {
          if (typeof response === 'string') {
            return { message: response };
          }
          return response;
        }),
        tap(() => this.logger.info('Auth', 'Password reset request sent successfully')),
        catchError(error => {
          this.logger.error('Auth', 'Password reset request failed', error);
          return of({ message: 'Mail should be received anytime' });
        })
      );
  }

  resetPassword(token: string, newPassword: string): Observable<{ message: string }> {
    const isAuthMockEnabled = this.mockAdapter.isServiceMockEnabled('auth');

    if (isAuthMockEnabled) {
      this.logger.info('Auth', 'Mock mode - simulating password reset');
      return of({ message: 'Password reset successfully' });
    }

    this.logger.info('Auth', 'Resetting password with token');

    return this.http
      .post<{ status: string; message: string }>(`${this.baseUrl}/reset-password`, {
        token,
        new_password: newPassword,
      })
      .pipe(
        map(response => ({ message: response.message })),
        tap(() => this.logger.info('Auth', 'Password reset successfully')),
        catchError(error => {
          this.logger.error('Auth', 'Password reset failed', error);
          const errorMessage = error?.error?.detail || error?.message || 'Failed to reset password';
          return throwError(() => new Error(errorMessage));
        })
      );
  }

  /**
   * Change password (requires current password)
   */
  changePassword(_currentPassword: string, _newPassword: string): Observable<{ message: string }> {
    return throwError(
      () => new Error('Password changes are not supported by the current authentication backend.')
    );
  }

  /**
   * Verify email with token
   */
  verifyEmail(_token: string): Observable<{ message: string }> {
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
   * SECURITY: Stores tokens in SecureStorage (hardware-backed encryption on mobile)
   *
   * Token storage strategy:
   * - Access token: SecureStorage (encrypted, hardware-backed)
   * - Refresh token: SecureStorage (encrypted, hardware-backed)
   * - User data: Regular Preferences (not sensitive enough to encrypt)
   * - Expiry time: Regular Preferences (not sensitive)
   */
  private async handleAuthResponse(response: TokenResponse, _rememberMe: boolean): Promise<void> {
    const expiresInSeconds = response.expires_in ?? 1800;
    const expiresAt = Date.now() + expiresInSeconds * 1000;

    this.authStateSubject.next({
      isAuthenticated: true,
      user: response.user,
      accessToken: response.access_token,
      refreshToken: response.refresh_token,
      expiresAt,
    });

    this.authSession.setUser(response.user.id);
    await this.clearOrphanedDataIfNeeded(response.user.id);

    await Promise.all([
      this.tokenService.setTokens(response.access_token, response.refresh_token, expiresInSeconds),
      Preferences.set({
        key: STORAGE_KEYS.USER,
        value: JSON.stringify(response.user),
      }),
    ]);

    this.logger.info('Auth', 'Tokens stored securely', {
      hasAccessToken: true,
      hasRefreshToken: Boolean(response.refresh_token),
      expiresAt: new Date(expiresAt).toISOString(),
    });

    const reminderTime = (expiresInSeconds - 300) * 1000;
    if (reminderTime > 0) {
      setTimeout(() => {
        this.logger.warn('Auth', 'Token will expire soon - user should re-authenticate');
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

    // Call user profile endpoint directly
    // With CapacitorHttp auto-patching enabled, HttpClient uses native HTTP on mobile
    return this.http.get<GatewayUserResponse>(`${this.baseUrl}/users/me`, { headers }).pipe(
      catchError(() => {
        return throwError(() => new Error('Failed to fetch user profile'));
      })
    );
  }

  /**
   * Public method to refresh user profile (gamification data: streak, times_measured, max_streak)
   * Call this after syncing readings to update gamification stats without re-login.
   * Returns a promise that resolves when the profile is refreshed.
   */
  public async refreshUserProfile(): Promise<void> {
    const currentState = this.authStateSubject.value;

    if (!currentState.isAuthenticated || !currentState.accessToken) {
      this.logger.warn('Auth', 'Cannot refresh profile: user not authenticated');
      return;
    }

    try {
      this.logger.info('Auth', 'Refreshing user profile for gamification data');

      const profile = await firstValueFrom(this.fetchUserProfile(currentState.accessToken));

      const updatedUser = this.mapGatewayUser(profile);

      // Update the auth state with fresh user data
      this.authStateSubject.next({
        ...currentState,
        user: updatedUser,
      });

      // Persist the updated user to storage
      await Preferences.set({
        key: STORAGE_KEYS.USER,
        value: JSON.stringify(updatedUser),
      });

      this.logger.info('Auth', 'User profile refreshed successfully', {
        times_measured: updatedUser.times_measured,
        streak: updatedUser.streak,
        max_streak: updatedUser.max_streak,
      });
    } catch (error) {
      this.logger.error('Auth', 'Failed to refresh user profile', error);
      // Don't throw - this is a non-critical background refresh
    }
  }

  /**
   * Map API Gateway user payload into the local user format used by the app
   */
  private mapGatewayUser(user: GatewayUserResponse): LocalUser {
    const accountState = user.blocked ? AccountState.DISABLED : AccountState.ACTIVE;

    return {
      id: user.dni,
      email: user.email,
      firstName: user.name,
      lastName: user.surname,
      role: 'patient',
      accountState,
      times_measured: user.times_measured,
      streak: user.streak,
      max_streak: user.max_streak,
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

  private async clearOrphanedDataIfNeeded(currentUserId: string): Promise<void> {
    const { db } = await import('./database.service');

    const orphanedReadings = await db.readings.where('userId').notEqual(currentUserId).count();

    if (orphanedReadings > 0) {
      this.logger.warn('Auth', 'Clearing orphaned data from previous user', {
        count: orphanedReadings,
      });
      await db.readings.where('userId').notEqual(currentUserId).delete();
      await db.appointments.where('userId').notEqual(currentUserId).delete();
      await db.syncQueue.clear();
    }
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

    // Check for timeout error
    if (errorObj['isTimeout']) {
      return 'La solicitud tardó demasiado. Verifica tu conexión e intenta de nuevo.';
    }

    // Check nested error.detail first (for detailed validation errors like 422)
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

    // HTTP status code specific messages - user-friendly error messages
    // (use !== undefined to handle status 0)
    const status = errorObj['status'] ?? errorObj['statusCode'];
    if (status !== undefined) {
      const statusCode = status as number;
      switch (statusCode) {
        case 401:
        case 403:
          // Both 401 and 403 during login mean invalid credentials
          return 'Credenciales incorrectas. Verifica tu DNI y contraseña.';
        case 409:
          return 'El usuario ya existe con este email.';
        case 422:
          return 'Datos inválidos. Por favor, verifica tu información.';
        case 500:
          return 'Error del servidor. Por favor, intenta de nuevo más tarde.';
        case 0:
          return 'Error de conexión. Verifica tu conexión a internet.';
        default:
          // Other HTTP error codes - fall through to check message
          break;
      }
    }

    if (errorObj['message']) {
      const message = errorObj['message'] as string;
      if (message.includes('accountDisabled')) {
        return 'Tu cuenta ha sido deshabilitada. Por favor, contacta al administrador.';
      }
      // Check for timeout in message
      if (message.toLowerCase().includes('timeout') || message.includes('timed out')) {
        return 'La solicitud tardó demasiado. Verifica tu conexión e intenta de nuevo.';
      }
      // Don't show raw HTTP error messages to user
      if (message.includes('HTTP') && /\d{3}/.test(message)) {
        return 'Error al iniciar sesión. Por favor, intenta de nuevo.';
      }
      return message;
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
  hospital_account: string;
  times_measured: number;
  streak: number;
  max_streak: number;
}
