import { Injectable, OnDestroy } from '@angular/core';
import { Observable, BehaviorSubject, of, Subject, throwError } from 'rxjs';
import { map, tap, catchError, takeUntil } from 'rxjs/operators';
import {
  LocalAuthService,
  LocalAuthState,
  LoginRequest,
  UserPreferences as LocalUserPreferences,
} from '@services/local-auth.service';
import { LoggerService } from '@services/logger.service';
import { ApiGatewayService } from '@services/api-gateway.service';
import { LoginRateLimiterService, RateLimitResult } from '@services/login-rate-limiter.service';
import { TranslateService } from '@ngx-translate/core';

export type AuthProvider = 'local';

export interface UnifiedAuthState {
  isAuthenticated: boolean;
  provider: AuthProvider | null;
  localAuth: LocalAuthState | null;
  user: UnifiedUser | null;
}

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
    localAuth: null,
    user: null,
  });

  public authState$ = this.unifiedAuthStateSubject.asObservable();
  public isAuthenticated$ = this.authState$.pipe(map(state => state.isAuthenticated));
  public currentUser$ = this.authState$.pipe(map(state => state.user));
  public provider$ = this.authState$.pipe(map(state => state.provider));

  constructor(
    private localAuth: LocalAuthService,
    private logger: LoggerService,
    private apiGateway: ApiGatewayService,
    private rateLimiter: LoginRateLimiterService,
    private translate: TranslateService
  ) {
    this.logger.info('Init', 'UnifiedAuthService initialized');
    // Initialize unified auth from local auth state
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
   * Initialize unified authentication from local auth state
   */
  private initializeUnifiedAuth(): void {
    this.localAuth.authState$.pipe(takeUntil(this.destroy$)).subscribe(localState => {
      this.updateUnifiedState(localState);
    });
  }

  /**
   * Update unified authentication state
   */
  private updateUnifiedState(localState: LocalAuthState): void {
    let provider: AuthProvider | null = null;
    let isAuthenticated = false;
    let user: UnifiedUser | null = null;

    if (localState.isAuthenticated) {
      provider = 'local';
      isAuthenticated = true;
      user = this.createUserFromLocal(localState);
    }

    this.logger.info('Auth', 'Auth state updated', {
      provider,
      isAuthenticated,
      userId: user?.id,
    });

    this.unifiedAuthStateSubject.next({
      isAuthenticated,
      provider,
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
   * Logout
   */
  async logout(): Promise<void> {
    this.logger.info('Auth', 'Logout initiated');

    const state = this.unifiedAuthStateSubject.value;

    if (state.localAuth?.isAuthenticated) {
      this.logger.debug('Auth', 'Logging out from local');
      await this.localAuth.logout();
    }

    // Clear API cache to prevent stale data from previous user
    this.apiGateway.clearCache();
    this.logger.debug('Auth', 'API cache cleared');

    this.logger.info('Auth', 'Logout completed');
  }

  /**
   * Get access token for API calls
   */
  getAccessToken(): Observable<string | null> {
    const state = this.unifiedAuthStateSubject.value;

    if (state.localAuth?.accessToken) {
      return of(state.localAuth.accessToken);
    }

    return of(null);
  }

  /**
   * Check if authenticated
   */
  isAuthenticatedWith(_provider: 'local'): boolean {
    const state = this.unifiedAuthStateSubject.value;
    return state.localAuth?.isAuthenticated || false;
  }

  /**
   * Refresh tokens
   */
  refreshTokens(): Observable<UnifiedAuthState> {
    this.logger.info('Auth', 'Token refresh initiated');
    const state = this.unifiedAuthStateSubject.value;

    if (!state.localAuth?.refreshToken) {
      this.logger.debug('Auth', 'No tokens to refresh');
      return of(this.unifiedAuthStateSubject.value);
    }

    return this.localAuth.refreshAccessToken().pipe(
      tap(() => {
        this.logger.info('Auth', 'Local token refreshed successfully');
      }),
      map(() => this.unifiedAuthStateSubject.value),
      catchError(error => {
        this.logger.warn('Auth', 'Local token refresh failed', { error: error?.message });
        return of(this.unifiedAuthStateSubject.value);
      })
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
