import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, combineLatest, of } from 'rxjs';
import { map, switchMap, tap, catchError } from 'rxjs/operators';
import { TidepoolAuthService, AuthState as TidepoolAuthState } from './tidepool-auth.service';
import {
  LocalAuthService,
  LocalAuthState,
  LoginRequest,
  RegisterRequest,
} from './local-auth.service';

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
export class UnifiedAuthService {
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
    private localAuth: LocalAuthService
  ) {
    // Combine both authentication states
    this.initializeUnifiedAuth();
  }

  /**
   * Initialize unified authentication by combining both providers
   */
  private initializeUnifiedAuth(): void {
    combineLatest([this.tidepoolAuth.authState$, this.localAuth.authState$]).subscribe(
      ([tidepoolState, localState]) => {
        this.updateUnifiedState(tidepoolState, localState);
      }
    );
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
   */
  loginLocal(request: LoginRequest): Observable<UnifiedAuthState> {
    return this.localAuth.login(request).pipe(
      map(() => this.unifiedAuthStateSubject.value),
      catchError(error => {
        console.error('Local login failed:', error);
        throw error;
      })
    );
  }

  /**
   * Login with Tidepool
   */
  loginTidepool(): Observable<void> {
    return this.tidepoolAuth.login();
  }

  /**
   * Register new user with local backend
   */
  register(request: RegisterRequest): Observable<UnifiedAuthState> {
    return this.localAuth.register(request).pipe(
      map(() => this.unifiedAuthStateSubject.value),
      catchError(error => {
        console.error('Registration failed:', error);
        throw error;
      })
    );
  }

  /**
   * Logout from both providers
   */
  async logout(): Promise<void> {
    const promises: Promise<void>[] = [];

    const state = this.unifiedAuthStateSubject.value;

    if (state.localAuth?.isAuthenticated) {
      promises.push(this.localAuth.logout());
    }

    if (state.tidepoolAuth?.isAuthenticated) {
      promises.push(this.tidepoolAuth.logout());
    }

    await Promise.all(promises);
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
      return this.tidepoolAuth.getValidAccessToken();
    }

    return of(null);
  }

  /**
   * Get access token for specific provider
   */
  getProviderToken(provider: 'tidepool' | 'local'): Observable<string | null> {
    if (provider === 'local') {
      return of(this.localAuth.getAccessToken());
    } else {
      return this.tidepoolAuth.getValidAccessToken();
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
    if (!this.localAuth.isAuthenticated()) {
      throw new Error('Must be logged in locally to link Tidepool account');
    }

    return this.tidepoolAuth.login().pipe(
      tap(() => {
        // After successful Tidepool login, update the backend
        // to link the accounts (implementation depends on backend API)
        console.log('Tidepool account linked successfully');
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
    const state = this.unifiedAuthStateSubject.value;
    const refreshObservables: Observable<any>[] = [];

    if (state.localAuth?.refreshToken) {
      refreshObservables.push(
        this.localAuth.refreshAccessToken().pipe(
          catchError(error => {
            console.warn('Local token refresh failed:', error);
            return of(null);
          })
        )
      );
    }

    if (state.tidepoolAuth?.isAuthenticated) {
      refreshObservables.push(
        this.tidepoolAuth.refreshTokenIfNeeded().pipe(
          catchError(error => {
            console.warn('Tidepool token refresh failed:', error);
            return of(null);
          })
        )
      );
    }

    if (refreshObservables.length === 0) {
      return of(this.unifiedAuthStateSubject.value);
    }

    return combineLatest(refreshObservables).pipe(map(() => this.unifiedAuthStateSubject.value));
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
      email: email,
      firstName: firstName,
      lastName: lastName,
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
      tidepoolUserId: tidepoolState.userId,
      tidepoolEmail: tidepoolState.email,
      preferences: localUser.preferences,
    };
  }

  /**
   * Update user preferences
   */
  updatePreferences(preferences: Partial<UnifiedUser['preferences']>): Observable<void> {
    const state = this.unifiedAuthStateSubject.value;

    if (state.localAuth?.isAuthenticated) {
      return this.localAuth.updatePreferences(preferences).pipe(map(() => void 0));
    }

    // For Tidepool-only users, store preferences locally
    // (would need to implement local storage for Tidepool users)
    return of(void 0);
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
