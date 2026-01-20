// Initialize TestBed environment for Vitest
import '../../../test-setup';

import { TestBed } from '@angular/core/testing';
import { of, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { UnifiedAuthService } from '@services/unified-auth.service';
import {
  LocalAuthService,
  LocalAuthState,
  LoginRequest,
  LoginResult,
} from '@services/local-auth.service';
import { ApiGatewayService } from '@services/api-gateway.service';
import { TranslateService } from '@ngx-translate/core';
import { LoggerService } from '@services/logger.service';
import { LoginRateLimiterService } from '@services/login-rate-limiter.service';

describe('UnifiedAuthService', () => {
  let service: UnifiedAuthService;
  let localAuthSpy: Mock<LocalAuthService>;
  let apiGatewaySpy: Mock<Partial<ApiGatewayService>>;
  let translateSpy: Mock<TranslateService>;
  let loggerSpy: Mock<LoggerService>;
  let rateLimiterSpy: Mock<LoginRateLimiterService>;

  let mockLocalAuthState: BehaviorSubject<LocalAuthState>;

  beforeEach(() => {
    localAuthSpy = {
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      getAccessToken: vi.fn(),
      isAuthenticated: vi.fn(),
      refreshAccessToken: vi.fn(),
      updatePreferences: vi.fn(),
    } as unknown as Mock<LocalAuthService>;

    apiGatewaySpy = {
      clearCache: vi.fn(),
    } as Mock<Partial<ApiGatewayService>>;

    translateSpy = {
      instant: vi.fn((key: string) => key),
    } as unknown as Mock<TranslateService>;

    loggerSpy = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as Mock<LoggerService>;

    rateLimiterSpy = {
      canAttemptLogin: vi.fn().mockReturnValue({ allowed: true }),
      checkRateLimit: vi.fn().mockReturnValue({ allowed: true, remainingAttempts: 5 }),
      recordSuccessfulLogin: vi.fn(),
      recordFailedAttempt: vi.fn().mockReturnValue({ allowed: true, remainingAttempts: 4 }),
      getLockoutTimeRemaining: vi.fn().mockReturnValue(null),
    } as unknown as Mock<LoginRateLimiterService>;

    mockLocalAuthState = new BehaviorSubject<LocalAuthState>({
      isAuthenticated: false,
      user: null,
      accessToken: null,
      refreshToken: null,
      expiresAt: null,
    });

    Object.defineProperty(localAuthSpy, 'authState$', {
      value: mockLocalAuthState.asObservable(),
      writable: false,
    });

    TestBed.configureTestingModule({
      providers: [
        UnifiedAuthService,
        { provide: LocalAuthService, useValue: localAuthSpy },
        { provide: ApiGatewayService, useValue: apiGatewaySpy },
        { provide: TranslateService, useValue: translateSpy },
        { provide: LoggerService, useValue: loggerSpy },
        { provide: LoginRateLimiterService, useValue: rateLimiterSpy },
      ],
    });

    service = TestBed.inject(UnifiedAuthService);
  });

  describe('Authentication State Management', () => {
    it('should initialize with unauthenticated state', () =>
      new Promise<void>(resolve => {
        service.authState$.subscribe(state => {
          expect(state.isAuthenticated).toBe(false);
          expect(state.provider).toBeNull();
          expect(state.user).toBeNull();
          resolve();
        });
      }));

    it('should update state when local auth state changes', () =>
      new Promise<void>(resolve => {
        mockLocalAuthState.next({
          isAuthenticated: true,
          user: {
            id: 'local-user-123',
            dni: '12345678',
            email: 'test@example.com',
            firstName: 'Test',
            lastName: 'User',
            role: 'patient',
          },
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
          expiresAt: Date.now() + 3600000,
        });

        service.authState$.subscribe(state => {
          if (state.isAuthenticated) {
            expect(state.provider).toBe('local');
            expect(state.user?.email).toBe('test@example.com');
            resolve();
          }
        });
      }));
  });

  describe('Login', () => {
    it('should login with local auth', () =>
      new Promise<void>(resolve => {
        const credentials: LoginRequest = {
          dni: '12345678',
          password: 'password123',
        };

        const loginResult: LoginResult = {
          success: true,
          user: {
            id: 'user-123',
            dni: '12345678',
            email: 'test@example.com',
            firstName: 'Test',
            lastName: 'User',
            role: 'patient',
          },
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
          expiresIn: 3600,
        };

        localAuthSpy.login.mockReturnValue(
          of(loginResult).pipe(
            tap(() => {
              mockLocalAuthState.next({
                isAuthenticated: true,
                user: loginResult.user,
                accessToken: loginResult.accessToken,
                refreshToken: loginResult.refreshToken,
                expiresAt: Date.now() + 3600000,
              });
            })
          )
        );

        service.loginLocal(credentials).subscribe(state => {
          expect(state.isAuthenticated).toBe(true);
          expect(state.provider).toBe('local');
          expect(localAuthSpy.login).toHaveBeenCalledWith(
            credentials.dni,
            credentials.password,
            undefined
          );
          resolve();
        });
      }));

    it('should handle login failure', () =>
      new Promise<void>(resolve => {
        const credentials: LoginRequest = {
          dni: '12345678',
          password: 'wrong-password',
        };

        const loginResult: LoginResult = {
          success: false,
          error: 'Invalid credentials',
        };

        localAuthSpy.login.mockReturnValue(of(loginResult));

        service.loginLocal(credentials).subscribe(state => {
          expect(state.isAuthenticated).toBe(false);
          resolve();
        });
      }));
  });

  describe('Logout', () => {
    it('should logout from local auth', async () => {
      mockLocalAuthState.next({
        isAuthenticated: true,
        user: {
          id: 'user-123',
          dni: '12345678',
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          role: 'patient',
        },
        accessToken: 'token',
        refreshToken: 'refresh',
        expiresAt: Date.now() + 3600000,
      });

      localAuthSpy.logout.mockReturnValue(Promise.resolve());

      await service.logout();

      expect(localAuthSpy.logout).toHaveBeenCalled();
    });
  });

  describe('Token Management', () => {
    it('should get local access token', () =>
      new Promise<void>(resolve => {
        mockLocalAuthState.next({
          isAuthenticated: true,
          user: null,
          accessToken: 'local-access-token',
          refreshToken: null,
          expiresAt: null,
        });

        localAuthSpy.getAccessToken.mockReturnValue(Promise.resolve('local-access-token'));

        service.getAccessToken().subscribe(token => {
          expect(token).toBe('local-access-token');
          resolve();
        });
      }));

    it('should return null when not authenticated', () =>
      new Promise<void>(resolve => {
        localAuthSpy.getAccessToken.mockReturnValue(Promise.resolve(null));

        service.getAccessToken().subscribe(token => {
          expect(token).toBeNull();
          resolve();
        });
      }));
  });

  describe('Authentication Status', () => {
    it('should correctly report local auth status', () => {
      mockLocalAuthState.next({
        isAuthenticated: true,
        user: {
          id: 'user-123',
          dni: '12345678',
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          role: 'patient',
        },
        accessToken: 'token',
        refreshToken: 'refresh',
        expiresAt: Date.now() + 3600000,
      });

      expect(service.isAuthenticatedWith('local')).toBe(true);
    });
  });
});
