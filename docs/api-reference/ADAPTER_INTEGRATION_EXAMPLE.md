# API Gateway Adapter Integration Example

This document shows how to integrate the `ApiGatewayAdapterService` with existing services.

## Option 1: Update LocalAuthService (Recommended)

### Before (Current Implementation)

```typescript
// src/app/core/services/local-auth.service.ts

@Injectable({ providedIn: 'root' })
export class LocalAuthService {
  login(username: string, password: string, rememberMe: boolean = false): Observable<LoginResult> {
    const body = new HttpParams()
      .set('username', username)
      .set('password', password);

    const headers = new HttpHeaders({
      'Content-Type': 'application/x-www-form-urlencoded',
    });

    // Direct call to backend
    return this.http
      .post<GatewayTokenResponse>(`${this.baseUrl}/token`, body.toString(), { headers })
      .pipe(
        switchMap(token => {
          // Fetch profile manually
          return this.fetchUserProfile(token.access_token).pipe(
            switchMap(profile => {
              // Manual state checks
              if (profile.state === 'pending') {
                return throwError(() => new Error('auth.errors.accountPending'));
              }
              // ... more manual logic
            })
          );
        })
      );
  }
}
```

### After (Using Adapter)

```typescript
// src/app/core/services/local-auth.service.ts

import { ApiGatewayAdapterService, AuthResponse } from './api-gateway-adapter.service';

@Injectable({ providedIn: 'root' })
export class LocalAuthService {
  private authStateSubject = new BehaviorSubject<LocalAuthState>({
    isAuthenticated: false,
    user: null,
    accessToken: null,
    refreshToken: null,
    expiresAt: null,
  });

  public authState$ = this.authStateSubject.asObservable();

  constructor(
    private adapter: ApiGatewayAdapterService,
    private logger: LoggerService
  ) {
    this.logger.info('Init', 'LocalAuthService initialized with adapter');
    this.initializeAuthState();
  }

  /**
   * Login with username and password
   */
  login(username: string, password: string, rememberMe: boolean = false): Observable<LoginResult> {
    this.logger.info('Auth', 'Login attempt via adapter', { username, rememberMe });

    return this.adapter.login(username, password).pipe(
      switchMap(authResponse => {
        // Adapter already validated account state and fetched profile
        return from(this.handleAuthResponse(authResponse, rememberMe)).pipe(
          map(() => ({
            success: true,
            user: this.mapAdapterUserToLocalUser(authResponse),
          } as LoginResult))
        );
      }),
      catchError(error => {
        const errorMessage = this.extractAdapterErrorMessage(error);
        this.logger.error('Auth', 'Login failed', error, { username });
        return of({
          success: false,
          error: errorMessage,
        } as LoginResult);
      })
    );
  }

  /**
   * Register a new user
   */
  register(request: RegisterRequest): Observable<LoginResult> {
    return this.adapter.register({
      email: request.email,
      password: request.password,
      firstName: request.firstName,
      lastName: request.lastName,
      dni: request.phone, // Use phone as DNI if available
    }).pipe(
      switchMap(authResponse => {
        return from(this.handleAuthResponse(authResponse, true)).pipe(
          map(() => ({
            success: true,
            user: this.mapAdapterUserToLocalUser(authResponse),
          } as LoginResult))
        );
      }),
      catchError(error => {
        return of({
          success: false,
          error: 'Registration is not yet supported',
        } as LoginResult);
      })
    );
  }

  /**
   * Logout the user
   */
  async logout(): Promise<void> {
    const user = this.authStateSubject.value.user;
    this.logger.info('Auth', 'Logout via adapter', { userId: user?.id });

    // Clear adapter tokens
    await this.adapter.logout();

    // Clear local state
    this.authStateSubject.next({
      isAuthenticated: false,
      user: null,
      accessToken: null,
      refreshToken: null,
      expiresAt: null,
    });

    this.logger.info('Auth', 'Logout completed');
  }

  /**
   * Refresh the access token
   */
  refreshAccessToken(): Observable<LocalAuthState> {
    const currentState = this.authStateSubject.value;

    if (!currentState.refreshToken) {
      this.logger.warn('Auth', 'No refresh token available');
      return throwError(() => new Error('No refresh token available'));
    }

    this.logger.info('Auth', 'Refreshing token via adapter');

    return this.adapter.refreshToken(currentState.refreshToken).pipe(
      switchMap(authResponse => {
        return from(this.handleAuthResponse(authResponse, true)).pipe(
          map(() => this.authStateSubject.value)
        );
      }),
      catchError(error => {
        this.logger.error('Auth', 'Token refresh failed', error);

        // If refresh fails, user must re-login
        if (error.message === 'MAX_REFRESH_EXCEEDED') {
          this.logout();
          return throwError(() => new Error('Session expired. Please login again.'));
        }

        return throwError(() => error);
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
  isAuthenticated(): Observable<boolean> {
    return this.authState$.pipe(map(state => state.isAuthenticated && !!state.accessToken));
  }

  /**
   * Update user profile
   */
  updateProfile(updates: Partial<LocalUser>): Observable<LocalUser> {
    const accessToken = this.getAccessToken();
    if (!accessToken) {
      return throwError(() => new Error('Not authenticated'));
    }

    // Map LocalUser updates to BackendUserProfile format
    const backendUpdates = {
      name: updates.firstName,
      surname: updates.lastName,
      email: updates.email,
    };

    return this.adapter.updateProfile(accessToken, backendUpdates).pipe(
      switchMap(profile => {
        // Update local user state
        const updatedUser = {
          ...this.authStateSubject.value.user!,
          firstName: profile.name,
          lastName: profile.surname,
          email: profile.email,
        };

        this.authStateSubject.next({
          ...this.authStateSubject.value,
          user: updatedUser,
        });

        return of(updatedUser);
      }),
      catchError(error => {
        this.logger.error('Auth', 'Profile update failed', error);
        return throwError(() => new Error('Profile update not supported'));
      })
    );
  }

  /**
   * Initialize authentication state from storage
   */
  private async initializeAuthState(): Promise<void> {
    // Check if adapter has stored tokens
    const tokens = await this.adapter.getStoredTokens();

    if (tokens.accessToken && tokens.expiresAt) {
      // Check if token is still valid
      if (Date.now() < tokens.expiresAt) {
        this.logger.info('Auth', 'Auth state restored from adapter storage');

        // Fetch current profile to populate user state
        this.adapter.getProfile(tokens.accessToken).subscribe({
          next: profile => {
            const user: LocalUser = {
              id: profile.dni,
              email: profile.email,
              firstName: profile.name,
              lastName: profile.surname,
              role: 'patient',
              accountState: profile.state as AccountState || AccountState.ACTIVE,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              preferences: this.getDefaultPreferences(),
            };

            this.authStateSubject.next({
              isAuthenticated: true,
              user,
              accessToken: tokens.accessToken,
              refreshToken: tokens.refreshToken,
              expiresAt: tokens.expiresAt,
            });
          },
          error: error => {
            this.logger.error('Auth', 'Failed to restore auth state', error);
            // Token might be expired, try refresh
            if (tokens.refreshToken) {
              this.refreshAccessToken().subscribe();
            }
          },
        });
      } else if (tokens.refreshToken) {
        // Token expired, try to refresh
        this.logger.info('Auth', 'Token expired, attempting refresh');
        this.refreshAccessToken().subscribe();
      }
    }
  }

  /**
   * Handle authentication response from adapter
   */
  private async handleAuthResponse(
    authResponse: AuthResponse,
    rememberMe: boolean
  ): Promise<void> {
    const expiresAt = Date.now() + authResponse.expires_in * 1000;

    // Map adapter user to local user format
    const user: LocalUser = {
      id: authResponse.user.id,
      email: authResponse.user.email,
      firstName: authResponse.user.firstName,
      lastName: authResponse.user.lastName,
      role: authResponse.user.role,
      accountState: authResponse.user.accountState as AccountState,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      preferences: this.getDefaultPreferences(),
    };

    // Update auth state
    this.authStateSubject.next({
      isAuthenticated: true,
      user,
      accessToken: authResponse.access_token,
      refreshToken: authResponse.refresh_token,
      expiresAt,
    });

    // Schedule token refresh check
    this.scheduleTokenRefresh(expiresAt);
  }

  /**
   * Map adapter user to local user format
   */
  private mapAdapterUserToLocalUser(authResponse: AuthResponse): LocalUser {
    return {
      id: authResponse.user.id,
      email: authResponse.user.email,
      firstName: authResponse.user.firstName,
      lastName: authResponse.user.lastName,
      role: authResponse.user.role,
      accountState: authResponse.user.accountState as AccountState,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      preferences: this.getDefaultPreferences(),
    };
  }

  /**
   * Extract error message from adapter error
   */
  private extractAdapterErrorMessage(error: any): string {
    const errorCode = error.code || error.message;

    switch (errorCode) {
      case 'ACCOUNT_PENDING':
        return 'Tu cuenta está pendiente de activación. Por favor, contacta al administrador.';
      case 'ACCOUNT_DISABLED':
        return 'Tu cuenta ha sido deshabilitada. Por favor, contacta al administrador.';
      case 'INVALID_CREDENTIALS':
        return 'Credenciales incorrectas. Verifica tu DNI/email y contraseña.';
      case 'NETWORK_ERROR':
        return 'Error de conexión. Verifica tu conexión a internet.';
      case 'SERVER_ERROR':
        return 'Error del servidor. Por favor, intenta de nuevo más tarde.';
      default:
        return error.message || 'Error al iniciar sesión. Por favor, intenta de nuevo.';
    }
  }

  /**
   * Get default user preferences
   */
  private getDefaultPreferences(): UserPreferences {
    return {
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
    };
  }

  /**
   * Schedule token refresh check
   */
  private scheduleTokenRefresh(expiresAt: number): void {
    const timeUntilRefresh = expiresAt - Date.now() - 5 * 60 * 1000; // 5 min before expiry

    if (timeUntilRefresh > 0) {
      setTimeout(async () => {
        const shouldRefresh = await this.adapter.shouldRefreshToken();
        if (shouldRefresh) {
          this.refreshAccessToken().subscribe({
            next: () => this.logger.info('Auth', 'Token auto-refreshed'),
            error: error => this.logger.error('Auth', 'Auto-refresh failed', error),
          });
        }
      }, timeUntilRefresh);
    }
  }
}
```

## Option 2: Use Adapter Directly in Components

### Login Component

```typescript
// src/app/login/login.page.ts

import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ApiGatewayAdapterService } from '@core/services/api-gateway-adapter.service';
import { LoggerService } from '@core/services/logger.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
})
export class LoginPage {
  username = '';
  password = '';
  rememberMe = false;
  errorMessage = '';
  isLoading = false;

  constructor(
    private adapter: ApiGatewayAdapterService,
    private router: Router,
    private logger: LoggerService
  ) {}

  onSubmit() {
    if (!this.username || !this.password) {
      this.errorMessage = 'Please enter username and password';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.adapter.login(this.username, this.password).subscribe({
      next: (response) => {
        this.logger.info('Login', 'Login successful', { userId: response.user.id });

        // Store tokens (you might want to use a dedicated auth state service)
        sessionStorage.setItem('access_token', response.access_token);
        if (this.rememberMe && response.refresh_token) {
          localStorage.setItem('refresh_token', response.refresh_token);
        }

        // Store user data
        sessionStorage.setItem('user', JSON.stringify(response.user));

        // Navigate to dashboard
        this.router.navigate(['/dashboard']);
      },
      error: (error) => {
        this.isLoading = false;
        this.logger.error('Login', 'Login failed', error);

        // User-friendly error messages
        switch (error.code) {
          case 'ACCOUNT_PENDING':
            this.errorMessage = 'Your account is pending activation. Please contact support.';
            break;
          case 'ACCOUNT_DISABLED':
            this.errorMessage = 'Your account has been disabled. Please contact support.';
            break;
          case 'INVALID_CREDENTIALS':
            this.errorMessage = 'Invalid username or password. Please try again.';
            break;
          case 'NETWORK_ERROR':
            this.errorMessage = 'Network error. Please check your internet connection.';
            break;
          default:
            this.errorMessage = error.message || 'Login failed. Please try again.';
        }
      },
    });
  }
}
```

## Option 3: Create an Interceptor for Automatic Token Refresh

```typescript
// src/app/core/interceptors/token-refresh.interceptor.ts

import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse,
} from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, switchMap, filter, take } from 'rxjs/operators';
import { ApiGatewayAdapterService } from '@core/services/api-gateway-adapter.service';

@Injectable()
export class TokenRefreshInterceptor implements HttpInterceptor {
  private isRefreshing = false;
  private refreshTokenSubject = new BehaviorSubject<string | null>(null);

  constructor(private adapter: ApiGatewayAdapterService) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401 && !request.url.includes('/token')) {
          return this.handle401Error(request, next);
        }
        return throwError(() => error);
      })
    );
  }

  private handle401Error(
    request: HttpRequest<unknown>,
    next: HttpHandler
  ): Observable<HttpEvent<unknown>> {
    if (!this.isRefreshing) {
      this.isRefreshing = true;
      this.refreshTokenSubject.next(null);

      const refreshToken = localStorage.getItem('refresh_token');

      if (refreshToken) {
        return this.adapter.refreshToken(refreshToken).pipe(
          switchMap((authResponse) => {
            this.isRefreshing = false;
            this.refreshTokenSubject.next(authResponse.access_token);

            // Update stored tokens
            sessionStorage.setItem('access_token', authResponse.access_token);
            if (authResponse.refresh_token) {
              localStorage.setItem('refresh_token', authResponse.refresh_token);
            }

            // Retry original request with new token
            return next.handle(this.addToken(request, authResponse.access_token));
          }),
          catchError((error) => {
            this.isRefreshing = false;

            // If refresh fails, redirect to login
            if (error.message === 'MAX_REFRESH_EXCEEDED') {
              localStorage.removeItem('refresh_token');
              sessionStorage.removeItem('access_token');
              window.location.href = '/login';
            }

            return throwError(() => error);
          })
        );
      }
    }

    // Wait for refresh to complete
    return this.refreshTokenSubject.pipe(
      filter((token) => token != null),
      take(1),
      switchMap((token) => next.handle(this.addToken(request, token!)))
    );
  }

  private addToken(request: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
    return request.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
  }
}
```

### Register the Interceptor

```typescript
// src/app/app.module.ts

import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { TokenRefreshInterceptor } from '@core/interceptors/token-refresh.interceptor';

@NgModule({
  // ...
  providers: [
    {
      provide: HTTP_INTERCEPTORS,
      useClass: TokenRefreshInterceptor,
      multi: true,
    },
  ],
})
export class AppModule {}
```

## Migration Checklist

- [ ] Install and test `ApiGatewayAdapterService`
- [ ] Update `LocalAuthService` to use adapter (Option 1)
- [ ] OR use adapter directly in components (Option 2)
- [ ] Implement token refresh interceptor (Option 3)
- [ ] Update login component to handle adapter error codes
- [ ] Test login flow with valid credentials
- [ ] Test login flow with invalid credentials
- [ ] Test pending account scenario
- [ ] Test disabled account scenario
- [ ] Test token refresh flow
- [ ] Test automatic token refresh before expiry
- [ ] Test logout flow
- [ ] Update unit tests to mock adapter
- [ ] Update E2E tests to use new login flow
- [ ] Document any custom integrations

## Benefits of Using the Adapter

1. **Path Abstraction**: App doesn't need to know actual backend paths
2. **Centralized Auth Logic**: All authentication logic in one place
3. **Token Management**: Automatic token refresh and rotation
4. **Error Handling**: Standardized error codes and messages
5. **Security**: Secure token storage and rotation
6. **Backward Compatibility**: Easy to update when backend changes
7. **No Backend Changes**: Backend remains unchanged
8. **Testing**: Easy to mock and test

## Next Steps

1. Choose integration approach (Option 1, 2, or 3)
2. Implement chosen approach
3. Test thoroughly
4. Monitor logs for any issues
5. Update documentation
6. Deploy to production

## Support

For issues or questions:
- Check logs: `LoggerService` outputs
- Review error codes in adapter
- Check backend connectivity
- Verify token storage
- Test with mock mode
