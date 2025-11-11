import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, from, of, throwError } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { ApiGatewayAdapterService } from './api-gateway-adapter.service';
import { LocalAuthService, LocalAuthState, LocalUser } from './local-auth.service';
import { LoggerService } from './logger.service';
import { Preferences } from '@capacitor/preferences';

/**
 * Enhanced LocalAuthService that uses ApiGatewayAdapterService
 * to fix path mismatches and add token refresh capability
 * WITHOUT modifying the backend services
 */
@Injectable({
  providedIn: 'root',
})
export class LocalAuthAdapterService extends LocalAuthService {
  private refreshTimer: any;
  private isRefreshing = false;

  constructor(
    protected override http: HttpClient,
    protected override platformDetector: PlatformDetectorService,
    protected override logger: LoggerService,
    private adapter: ApiGatewayAdapterService
  ) {
    super(http, platformDetector, logger);
    this.initializeAdapter();
  }

  private async initializeAdapter(): Promise<void> {
    // Check if we have a stored refresh token
    const { value: refreshToken } = await Preferences.get({ key: 'adapter_refresh_token' });
    if (refreshToken) {
      // Restore auth state
      await this.restoreAuthState();
    }
  }

  /**
   * Override login to use adapter
   */
  override login(username: string, password: string): Observable<LocalAuthState> {
    this.logger.info('Auth', 'Local login attempt with adapter');

    return this.adapter.login(username, password).pipe(
      switchMap(authResponse => {
        // Map adapter response to LocalAuthState
        const authState: LocalAuthState = {
          isAuthenticated: true,
          user: authResponse.user as LocalUser,
          accessToken: authResponse.access_token,
          refreshToken: authResponse.refresh_token,
          expiresAt: new Date(Date.now() + (authResponse.expires_in || 1800) * 1000),
        };

        // Store auth state
        this.authStateSubject.next(authState);

        // Schedule token refresh 5 minutes before expiry
        this.scheduleTokenRefresh(authResponse.expires_in || 1800);

        // Store tokens
        return from(this.storeAuthData(authState)).pipe(map(() => authState));
      }),
      catchError(error => {
        this.logger.error('Auth', 'Login failed', error);

        // Map adapter error codes to user-friendly messages
        let message = 'Login failed';
        if (error.message?.includes('INVALID_CREDENTIALS')) {
          message = 'Invalid username or password';
        } else if (error.message?.includes('ACCOUNT_DISABLED')) {
          message = 'Your account has been disabled';
        } else if (error.message?.includes('ACCOUNT_PENDING')) {
          message = 'Your account is pending activation';
        }

        return throwError(() => new Error(message));
      })
    );
  }

  /**
   * Override register to use adapter
   */
  override register(userData: any): Observable<LocalAuthState> {
    this.logger.info('Auth', 'Registration attempt with adapter');

    return this.adapter.register(userData).pipe(
      switchMap(response => {
        // Auto-login after registration
        return this.login(userData.dni || userData.email, userData.password);
      }),
      catchError(error => {
        this.logger.error('Auth', 'Registration failed', error);

        let message = 'Registration failed';
        if (error.message?.includes('USER_EXISTS')) {
          message = 'A user with this DNI or email already exists';
        } else if (error.message?.includes('VALIDATION_ERROR')) {
          message = 'Please check your input and try again';
        }

        return throwError(() => new Error(message));
      })
    );
  }

  /**
   * Implement REAL token refresh using adapter
   */
  override refreshAccessToken(): Observable<LocalAuthState> {
    if (this.isRefreshing) {
      // Wait for current refresh to complete
      return this.authState$.pipe(
        switchMap(state =>
          state.isAuthenticated ? of(state) : throwError(() => new Error('Refresh failed'))
        )
      );
    }

    this.isRefreshing = true;
    this.logger.info('Auth', 'Refreshing access token with adapter');

    return this.adapter.refreshToken().pipe(
      switchMap(authResponse => {
        // Update auth state with new tokens
        const currentState = this.authStateSubject.value;
        const authState: LocalAuthState = {
          ...currentState,
          accessToken: authResponse.access_token,
          refreshToken: authResponse.refresh_token,
          expiresAt: new Date(Date.now() + (authResponse.expires_in || 1800) * 1000),
        };

        this.authStateSubject.next(authState);

        // Schedule next refresh
        this.scheduleTokenRefresh(authResponse.expires_in || 1800);

        // Store updated tokens
        return from(this.storeAuthData(authState)).pipe(
          map(() => {
            this.isRefreshing = false;
            return authState;
          })
        );
      }),
      catchError(error => {
        this.isRefreshing = false;
        this.logger.error('Auth', 'Token refresh failed', error);

        // Check if max rotations reached
        if (error.message?.includes('MAX_ROTATIONS')) {
          this.logger.warn('Auth', 'Maximum token rotations reached, user must re-login');
          // Clear auth and redirect to login
          return from(this.logout()).pipe(
            switchMap(() => throwError(() => new Error('Session expired. Please login again.')))
          );
        }

        return throwError(() => error);
      })
    );
  }

  /**
   * Schedule automatic token refresh
   */
  private scheduleTokenRefresh(expiresInSeconds: number): void {
    // Clear existing timer
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }

    // Schedule refresh 5 minutes before expiry
    const refreshInMs = (expiresInSeconds - 300) * 1000;
    if (refreshInMs > 0) {
      this.refreshTimer = setTimeout(() => {
        this.logger.info('Auth', 'Auto-refreshing token before expiry');
        this.refreshAccessToken().subscribe({
          next: () => this.logger.info('Auth', 'Token auto-refreshed successfully'),
          error: error => this.logger.error('Auth', 'Auto-refresh failed', error),
        });
      }, refreshInMs);
    }
  }

  /**
   * Update profile using adapter
   */
  updateProfile(profileData: Partial<LocalUser>): Observable<LocalUser> {
    return this.adapter.updateProfile(profileData).pipe(
      tap(updatedUser => {
        // Update local auth state
        const currentState = this.authStateSubject.value;
        if (currentState.isAuthenticated) {
          this.authStateSubject.next({
            ...currentState,
            user: { ...currentState.user, ...updatedUser } as LocalUser,
          });
        }
      }),
      catchError(error => {
        this.logger.error('Auth', 'Profile update failed', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Restore auth state from storage
   */
  private async restoreAuthState(): Promise<void> {
    try {
      const [
        { value: accessToken },
        { value: refreshToken },
        { value: userJson },
        { value: expiresAt },
      ] = await Promise.all([
        Preferences.get({ key: 'adapter_access_token' }),
        Preferences.get({ key: 'adapter_refresh_token' }),
        Preferences.get({ key: 'adapter_user_profile' }),
        Preferences.get({ key: 'adapter_token_expires_at' }),
      ]);

      if (accessToken && userJson) {
        const user = JSON.parse(userJson);
        const expiry = expiresAt ? new Date(parseInt(expiresAt)) : new Date();

        // Check if token is still valid
        if (expiry > new Date()) {
          const authState: LocalAuthState = {
            isAuthenticated: true,
            user: user as LocalUser,
            accessToken,
            refreshToken: refreshToken || undefined,
            expiresAt: expiry,
          };

          this.authStateSubject.next(authState);

          // Schedule refresh if needed
          const expiresInSeconds = Math.floor((expiry.getTime() - Date.now()) / 1000);
          if (expiresInSeconds > 300) {
            this.scheduleTokenRefresh(expiresInSeconds);
          } else {
            // Token expires soon, refresh immediately
            this.refreshAccessToken().subscribe();
          }
        } else {
          // Token expired, try to refresh
          if (refreshToken) {
            this.refreshAccessToken().subscribe({
              error: () => this.logout(),
            });
          }
        }
      }
    } catch (error) {
      this.logger.error('Auth', 'Failed to restore auth state', error);
    }
  }

  /**
   * Store auth data securely
   */
  private async storeAuthData(authState: LocalAuthState): Promise<void> {
    await Promise.all([
      Preferences.set({
        key: 'adapter_access_token',
        value: authState.accessToken || '',
      }),
      Preferences.set({
        key: 'adapter_refresh_token',
        value: authState.refreshToken || '',
      }),
      Preferences.set({
        key: 'adapter_user_profile',
        value: JSON.stringify(authState.user),
      }),
      Preferences.set({
        key: 'adapter_token_expires_at',
        value: authState.expiresAt?.getTime().toString() || '',
      }),
    ]);
  }

  /**
   * Enhanced logout
   */
  override async logout(): Promise<void> {
    // Clear refresh timer
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }

    // Clear adapter storage
    await this.adapter.logout();

    // Clear local storage
    await Promise.all([
      Preferences.remove({ key: 'adapter_access_token' }),
      Preferences.remove({ key: 'adapter_refresh_token' }),
      Preferences.remove({ key: 'adapter_user_profile' }),
      Preferences.remove({ key: 'adapter_token_expires_at' }),
    ]);

    // Call parent logout
    await super.logout();
  }
}

/**
 * Provider configuration for replacing LocalAuthService with adapter version
 * Add this to your app.module.ts providers:
 *
 * {
 *   provide: LocalAuthService,
 *   useClass: LocalAuthAdapterService
 * }
 */
export const LOCAL_AUTH_ADAPTER_PROVIDER = {
  provide: LocalAuthService,
  useClass: LocalAuthAdapterService,
};
