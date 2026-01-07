import { Injectable, OnDestroy } from '@angular/core';
import { Observable, BehaviorSubject, combineLatest, of, from, Subject, throwError } from 'rxjs';
import { map, tap, catchError, takeUntil } from 'rxjs/operators';
import {
  TidepoolAuthService,
  AuthState as TidepoolAuthState,
} from '@services/tidepool-auth.service';
import {
  LocalAuthService,
  LocalAuthState,
  LoginRequest,
  RegisterRequest,
  UserPreferences as LocalUserPreferences,
} from '@services/local-auth.service';
import { LoggerService } from '@services/logger.service';
import { ApiGatewayService } from '@services/api-gateway.service';
import { LoginRateLimiterService, RateLimitResult } from '@services/login-rate-limiter.service';
import { TranslateService } from '@ngx-translate/core';

/**
 * Unified authentication provider type
 */
export type AuthProvider = 'tidepool' | 'local' | 'both';

/**
 * Unified authentication state combining both providers
 */
export interface UnifiedAuthState {
  isAuthenticated: boolean;
  provider: AuthProvider | null;
  tidepoolAuth: TidepoolAuthState | null;
  localAuth: LocalAuthState | null;
  user: UnifiedUser | null;
}

/**
 * Unified user interface combining data from both providers
 */
export interface UnifiedUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  provider: AuthProvider;

  // Local user specific
  role?: 'patient' | 'doctor' | 'admin';
  phone?: string;
  dateOfBirth?: string;
  diabetesType?: '1' | '2' | 'gestational' | 'other';
  diagnosisDate?: string;

  // Tidepool specific
  tidepoolUserId?: string;
  tidepoolEmail?: string;

  // Common preferences
  preferences?: {
    glucoseUnit: 'mg/dL' | 'mmol/L';
    targetRange: {
      low: number;
      high: number;
    };
    language: 'en' | 'es';
    theme: 'light' | 'dark' | 'auto';
    notifications: {
      appointments: boolean;
      readings: boolean;
      reminders: boolean;
    };
  };
}

@Injectable({
  providedIn: 'root',
})
export class UnifiedAuthService implements OnDestroy {
  // Subject for cleanup on destroy
  private destroy$ = new Subject<void>();

  // Unified auth state
  private unifiedAuthStateSubject = new BehaviorSubject<UnifiedAuthState>({
    isAuthenticated: false,
    provider: null,
    tidepoolAuth: null,
    localAuth: null,
    user: null,
  });

  public authState$ = this.unifiedAuthStateSubject.asObservable();
  public isAuthenticated$ = this.authState$.pipe(map(state => state.isAuthenticated));
  public currentUser$ = this.authState$.pipe(map(state => state.user));
  public provider$ = this.authState$.pipe(map(state => state.provider));

  constructor(
    private tidepoolAuth: TidepoolAuthService,
    private localAuth: LocalAuthService,
    private logger: LoggerService,
    private apiGateway: ApiGatewayService,
    private rateLimiter: LoginRateLimiterService,
    private translate: TranslateService
  ) {
    this.logger.info('Init', 'UnifiedAuthService initialized');
    // Combine both authentication states
    this.initializeUnifiedAuth();
  }

  /**
   * Clean up subscriptions when service is destroyed
   * Prevents memory leaks from uncompleted BehaviorSubjects and subscriptions
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.unifiedAuthStateSubject.complete();
    this.logger.debug('Auth', 'UnifiedAuthService destroyed, resources cleaned up');
  }

  /**
   * Initialize unified authentication by combining both providers
   */
  private initializeUnifiedAuth(): void {
    combineLatest([this.tidepoolAuth.authState, this.localAuth.authState$])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([tidepoolState, localState]) => {
        this.updateUnifiedState(tidepoolState, localState);
      });
  }

  /**
   * Update unified authentication state
   */
  private updateUnifiedState(tidepoolState: TidepoolAuthState, localState: LocalAuthState): void {
    let provider: AuthProvider | null = null;
    let isAuthenticated = false;
    let user: UnifiedUser | null = null;

    // Determine authentication status and provider
    if (localState.isAuthenticated && tidepoolState.isAuthenticated) {
      provider = 'both';
      isAuthenticated = true;
      user = this.mergeUsers(localState, tidepoolState);
    } else if (localState.isAuthenticated) {
      provider = 'local';
      isAuthenticated = true;
      user = this.createUserFromLocal(localState);
    } else if (tidepoolState.isAuthenticated) {
      provider = 'tidepool';
      isAuthenticated = true;
      user = this.createUserFromTidepool(tidepoolState);
    }

    this.logger.info('Auth', 'Auth state updated', {
      provider,
      isAuthenticated,
      userId: user?.id,
    });

    this.unifiedAuthStateSubject.next({
      isAuthenticated,
      provider,
      tidepoolAuth: tidepoolState,
      localAuth: localState,
      user,
    });
  }

  /**
   * Login with local backend
   *
   * SECURITY: Implements rate limiting with exponential backoff
   * - Checks rate limit before attempting login
   * - Records failed attempts with exponential backoff
   * - 15-minute lockout after 5 failed attempts
   * - Resets on successful login
   */
  loginLocal(request: LoginRequest): Observable<UnifiedAuthState> {
    const username = request.email || request.dni || '';
    this.logger.info('Auth', 'Local login initiated', { username, provider: 'local' });

    // SECURITY: Check rate limit before attempting login
    const rateLimitCheck = this.rateLimiter.checkRateLimit(username);
    if (!rateLimitCheck.allowed) {
      const errorMessage = this.formatRateLimitError(rateLimitCheck);
      this.logger.warn('Auth', 'Login blocked by rate limiter', {
        username,
        remainingAttempts: rateLimitCheck.remainingAttempts,
        lockoutRemaining: rateLimitCheck.lockoutRemaining,
        waitTime: rateLimitCheck.waitTime,
      });
      return throwError(() => new Error(errorMessage));
    }

    return this.localAuth.login(username, request.password, request.rememberMe).pipe(
      tap(result => {
        // Check if login was successful based on the result
        if (result.success) {
          // SECURITY: Reset rate limit on successful login
          this.rateLimiter.recordSuccessfulLogin(username);
          this.logger.info('Auth', 'Local login successful', { username, provider: 'local' });
        } else {
          // SECURITY: Record failed attempt
          const rateLimitResult = this.rateLimiter.recordFailedAttempt(username);
          this.logger.warn('Auth', 'Login failed, rate limit updated', {
            username,
            remainingAttempts: rateLimitResult.remainingAttempts,
            waitTime: rateLimitResult.waitTime,
          });
        }
      }),
      map(() => this.unifiedAuthStateSubject.value),
      catchError(error => {
        // SECURITY: Record failed attempt on error
        const rateLimitResult = this.rateLimiter.recordFailedAttempt(username);
        this.logger.error('Auth', 'Local login failed', error, {
          username,
          provider: 'local',
          remainingAttempts: rateLimitResult.remainingAttempts,
        });
        throw error;
      })
    );
  }

  /**
   * Format rate limit error message for user display
   */
  private formatRateLimitError(rateLimitResult: RateLimitResult): string {
    if (rateLimitResult.lockoutRemaining) {
      const minutes = Math.ceil(rateLimitResult.lockoutRemaining / 60000);
      return this.translate.instant('login.messages.rateLimitLockout', { minutes });
    }

    if (rateLimitResult.waitTime) {
      const seconds = Math.ceil(rateLimitResult.waitTime / 1000);
      return this.translate.instant('login.messages.rateLimitBackoff', { seconds });
    }

    return this.translate.instant('login.messages.rateLimitGeneric');
  }

  /**
   * Get rate limit status for a username
   * Useful for UI to show remaining attempts or lockout timer
   */
  getRateLimitStatus(username: string): RateLimitResult {
    return this.rateLimiter.checkRateLimit(username);
  }

  /**
   * Get formatted lockout time remaining
   * Returns MM:SS format or null if not locked
   */
  getLockoutTimeRemaining(username: string): string | null {
    return this.rateLimiter.getLockoutTimeRemaining(username);
  }

  /**
   * Login with Tidepool
   */
  loginTidepool(): Observable<void> {
    this.logger.info('Auth', 'Tidepool login initiated', { provider: 'tidepool' });

    return from(this.tidepoolAuth.login()).pipe(
      tap(() => {
        this.logger.info('Auth', 'Tidepool login successful', { provider: 'tidepool' });
      }),
      catchError(error => {
        this.logger.error('Auth', 'Tidepool login failed', error, { provider: 'tidepool' });
        throw error;
      })
    );
  }

  /**
   * Register new user with local backend
   */
  register(request: RegisterRequest): Observable<UnifiedAuthState> {
    return this.localAuth.register(request).pipe(
      map(() => this.unifiedAuthStateSubject.value),
      catchError(error => {
        this.logger.error('UnifiedAuth', 'Registration failed', error);
        throw error;
      })
    );
  }

  /**
   * Logout from both providers
   */
  async logout(): Promise<void> {
    this.logger.info('Auth', 'Logout initiated');
    const promises: Promise<void>[] = [];

    const state = this.unifiedAuthStateSubject.value;

    if (state.localAuth?.isAuthenticated) {
      this.logger.debug('Auth', 'Logging out from local');
      promises.push(this.localAuth.logout());
    }

    if (state.tidepoolAuth?.isAuthenticated) {
      this.logger.debug('Auth', 'Logging out from Tidepool');
      promises.push(this.tidepoolAuth.logout());
    }

    await Promise.all(promises);

    // Clear API cache to prevent stale data from previous user
    this.apiGateway.clearCache();
    this.logger.debug('Auth', 'API cache cleared');

    this.logger.info('Auth', 'Logout completed');
  }

  /**
   * Logout from specific provider
   */
  async logoutFrom(provider: 'tidepool' | 'local'): Promise<void> {
    if (provider === 'local') {
      await this.localAuth.logout();
    } else {
      await this.tidepoolAuth.logout();
    }
  }

  /**
   * Get access token for API calls
   * Prioritizes local token if available, falls back to Tidepool
   */
  getAccessToken(): Observable<string | null> {
    const state = this.unifiedAuthStateSubject.value;

    if (state.localAuth?.accessToken) {
      return of(state.localAuth.accessToken);
    }

    if (state.tidepoolAuth?.isAuthenticated) {
      return from(this.tidepoolAuth.getAccessToken());
    }

    return of(null);
  }

  /**
   * Get access token for specific provider
   */
  getProviderToken(provider: 'tidepool' | 'local'): Observable<string | null> {
    if (provider === 'local') {
      return from(this.localAuth.getAccessToken());
    } else {
      return from(this.tidepoolAuth.getAccessToken());
    }
  }

  /**
   * Check if authenticated with specific provider
   */
  isAuthenticatedWith(provider: 'tidepool' | 'local'): boolean {
    const state = this.unifiedAuthStateSubject.value;

    if (provider === 'local') {
      return state.localAuth?.isAuthenticated || false;
    } else {
      return state.tidepoolAuth?.isAuthenticated || false;
    }
  }

  /**
   * Link Tidepool account to existing local account
   */
  linkTidepoolAccount(): Observable<void> {
    const isLocalAuthenticated =
      this.unifiedAuthStateSubject.value.localAuth?.isAuthenticated ?? false;

    if (!isLocalAuthenticated) {
      throw new Error('Must be logged in locally to link Tidepool account');
    }

    return from(this.tidepoolAuth.login()).pipe(
      tap(() => {
        // After successful Tidepool login, update the backend
        // to link the accounts (implementation depends on backend API)
        this.logger.info('Auth', 'Tidepool account linked successfully', {
          provider: 'tidepool',
        });
      })
    );
  }

  /**
   * Unlink Tidepool account
   */
  async unlinkTidepoolAccount(): Promise<void> {
    if (!this.isAuthenticatedWith('tidepool')) {
      throw new Error('No Tidepool account linked');
    }

    await this.tidepoolAuth.logout();
    // Optionally update backend to unlink accounts
  }

  /**
   * Refresh tokens for active providers
   */
  refreshTokens(): Observable<UnifiedAuthState> {
    this.logger.info('Auth', 'Token refresh initiated');
    const state = this.unifiedAuthStateSubject.value;
    const refreshObservables: Observable<unknown>[] = [];

    if (state.localAuth?.refreshToken) {
      refreshObservables.push(
        this.localAuth.refreshAccessToken().pipe(
          tap(() => {
            this.logger.info('Auth', 'Local token refreshed successfully');
          }),
          catchError(error => {
            this.logger.warn('Auth', 'Local token refresh failed', { error: error?.message });
            return of(null);
          })
        )
      );
    }

    if (state.tidepoolAuth?.isAuthenticated) {
      refreshObservables.push(
        from(this.tidepoolAuth.refreshAccessToken()).pipe(
          tap(() => {
            this.logger.info('Auth', 'Tidepool token refreshed successfully');
          }),
          catchError(error => {
            this.logger.warn('Auth', 'Tidepool token refresh failed', { error: error?.message });
            return of(null);
          })
        )
      );
    }

    if (refreshObservables.length === 0) {
      this.logger.debug('Auth', 'No tokens to refresh');
      return of(this.unifiedAuthStateSubject.value);
    }

    return combineLatest(refreshObservables).pipe(
      tap(() => {
        this.logger.info('Auth', 'All tokens refreshed');
      }),
      map(() => this.unifiedAuthStateSubject.value)
    );
  }

  /**
   * Create unified user from local auth state
   */
  private createUserFromLocal(localState: LocalAuthState): UnifiedUser | null {
    if (!localState.user) return null;

    return {
      id: localState.user.id,
      email: localState.user.email,
      firstName: localState.user.firstName,
      lastName: localState.user.lastName,
      fullName: `${localState.user.firstName} ${localState.user.lastName}`,
      provider: 'local',
      role: localState.user.role,
      phone: localState.user.phone,
      dateOfBirth: localState.user.dateOfBirth,
      diabetesType: localState.user.diabetesType,
      diagnosisDate: localState.user.diagnosisDate,
      preferences: localState.user.preferences,
    };
  }

  /**
   * Create unified user from Tidepool auth state
   */
  private createUserFromTidepool(tidepoolState: TidepoolAuthState): UnifiedUser | null {
    if (!tidepoolState.userId) return null;

    const email = tidepoolState.email || '';
    const nameParts = email.split('@')[0].split('.');
    const firstName = nameParts[0] || 'User';
    const lastName = nameParts[1] || '';

    return {
      id: tidepoolState.userId,
      email,
      firstName,
      lastName,
      fullName: `${firstName} ${lastName}`.trim(),
      provider: 'tidepool',
      tidepoolUserId: tidepoolState.userId,
      tidepoolEmail: email,
      preferences: {
        glucoseUnit: 'mg/dL',
        targetRange: {
          low: 70,
          high: 180,
        },
        language: 'en',
        theme: 'auto',
        notifications: {
          appointments: true,
          readings: true,
          reminders: true,
        },
      },
    };
  }

  /**
   * Merge users from both providers
   */
  private mergeUsers(
    localState: LocalAuthState,
    tidepoolState: TidepoolAuthState
  ): UnifiedUser | null {
    if (!localState.user) {
      return this.createUserFromTidepool(tidepoolState);
    }

    const localUser = localState.user;

    return {
      id: localUser.id,
      email: localUser.email,
      firstName: localUser.firstName,
      lastName: localUser.lastName,
      fullName: `${localUser.firstName} ${localUser.lastName}`,
      provider: 'both',
      role: localUser.role,
      phone: localUser.phone,
      dateOfBirth: localUser.dateOfBirth,
      diabetesType: localUser.diabetesType,
      diagnosisDate: localUser.diagnosisDate,
      tidepoolUserId: tidepoolState.userId || undefined,
      tidepoolEmail: tidepoolState.email || undefined,
      preferences: localUser.preferences,
    };
  }

  /**
   * Update user preferences
   */
  updatePreferences(preferences?: Partial<UnifiedUser['preferences']>): Observable<void> {
    const state = this.unifiedAuthStateSubject.value;

    if (!preferences || Object.keys(preferences).length === 0) {
      return of(undefined);
    }

    if (state.localAuth?.isAuthenticated) {
      const payload: Partial<LocalUserPreferences> = {};

      if (preferences.glucoseUnit) {
        payload.glucoseUnit = preferences.glucoseUnit;
      }

      if (preferences.targetRange) {
        payload.targetRange = { ...preferences.targetRange };
      }

      if (preferences.language) {
        payload.language = preferences.language;
      }

      if (preferences.theme) {
        payload.theme = preferences.theme;
      }

      if (preferences.notifications) {
        payload.notifications = { ...preferences.notifications };
      }

      if (Object.keys(payload).length === 0) {
        return of(undefined);
      }

      return this.localAuth.updatePreferences(payload).pipe(map(() => undefined));
    }

    // For Tidepool-only users, store preferences locally
    // (would need to implement local storage for Tidepool users)
    return of(undefined);
  }

  /**
   * Get current unified user
   */
  getCurrentUser(): UnifiedUser | null {
    return this.unifiedAuthStateSubject.value.user;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.unifiedAuthStateSubject.value.isAuthenticated;
  }

  /**
   * Get current authentication provider
   */
  getProvider(): AuthProvider | null {
    return this.unifiedAuthStateSubject.value.provider;
  }
}
