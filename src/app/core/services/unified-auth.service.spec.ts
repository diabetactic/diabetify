// Initialize TestBed environment for Vitest
import '../../../test-setup';

import { TestBed } from '@angular/core/testing';
import { of, BehaviorSubject, throwError } from 'rxjs';
import { UnifiedAuthService } from '@services/unified-auth.service';
import {
  TidepoolAuthService,
  AuthState as TidepoolAuthState,
} from '@services/tidepool-auth.service';
import {
  LocalAuthService,
  LocalAuthState,
  LoginRequest,
  LoginResult,
  RegisterRequest,
} from '@services/local-auth.service';
import { ApiGatewayService } from '@services/api-gateway.service';

describe('UnifiedAuthService', () => {
  let service: UnifiedAuthService;
  let tidepoolAuthSpy: Mock<TidepoolAuthService>;
  let localAuthSpy: Mock<LocalAuthService>;
  let apiGatewaySpy: Mock<Partial<ApiGatewayService>>;

  // Mock auth states
  let mockTidepoolAuthState: BehaviorSubject<TidepoolAuthState>;
  let mockLocalAuthState: BehaviorSubject<LocalAuthState>;

  beforeEach(() => {
    // Create spy objects
    tidepoolAuthSpy = {
      login: vi.fn(),
      logout: vi.fn(),
      getAccessToken: vi.fn(),
      refreshAccessToken: vi.fn(),
      isTokenExpired: vi.fn(),
    } as unknown as Mock<TidepoolAuthService>;

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

    // Initialize mock auth states
    mockTidepoolAuthState = new BehaviorSubject<TidepoolAuthState>({
      isAuthenticated: false,
      isLoading: false,
      error: null,
      userId: null,
      email: null,
    });

    mockLocalAuthState = new BehaviorSubject<LocalAuthState>({
      isAuthenticated: false,
      user: null,
      accessToken: null,
      refreshToken: null,
      expiresAt: null,
    });

    // Set up spy return values - authState is a property, so we need to define it as such
    Object.defineProperty(tidepoolAuthSpy, 'authState', {
      value: mockTidepoolAuthState.asObservable(),
      writable: false,
    });
    Object.defineProperty(localAuthSpy, 'authState$', {
      value: mockLocalAuthState.asObservable(),
      writable: false,
    });

    TestBed.configureTestingModule({
      providers: [
        UnifiedAuthService,
        { provide: TidepoolAuthService, useValue: tidepoolAuthSpy },
        { provide: LocalAuthService, useValue: localAuthSpy },
        { provide: ApiGatewayService, useValue: apiGatewaySpy },
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

    it('should update state when local auth succeeds', () =>
      new Promise<void>(resolve => {
        const mockUser = {
          id: 'user123',
          email: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe',
          role: 'patient' as const,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        mockLocalAuthState.next({
          isAuthenticated: true,
          user: mockUser,
          accessToken: 'local-token',
          refreshToken: 'local-refresh',
          expiresAt: Date.now() + 3600000,
        });

        service.authState$.subscribe(state => {
          if (state.isAuthenticated) {
            expect(state.isAuthenticated).toBe(true);
            expect(state.provider).toBe('local');
            expect(state.user?.email).toBe('test@example.com');
            expect(state.user?.provider).toBe('local');
            resolve();
          }
        });
      }));

    it('should update state when Tidepool auth succeeds', () =>
      new Promise<void>(resolve => {
        mockTidepoolAuthState.next({
          isAuthenticated: true,
          isLoading: false,
          error: null,
          userId: 'tidepool-user-123',
          email: 'tidepool@example.com',
        });

        service.authState$.subscribe(state => {
          if (state.isAuthenticated) {
            expect(state.isAuthenticated).toBe(true);
            expect(state.provider).toBe('tidepool');
            expect(state.user?.email).toBe('tidepool@example.com');
            expect(state.user?.provider).toBe('tidepool');
            resolve();
          }
        });
      }));

    it('should handle both providers authenticated', () =>
      new Promise<void>(resolve => {
        const mockLocalUser = {
          id: 'user123',
          email: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe',
          role: 'patient' as const,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        mockLocalAuthState.next({
          isAuthenticated: true,
          user: mockLocalUser,
          accessToken: 'local-token',
          refreshToken: 'local-refresh',
          expiresAt: Date.now() + 3600000,
        });

        mockTidepoolAuthState.next({
          isAuthenticated: true,
          isLoading: false,
          error: null,
          userId: 'tidepool-user-123',
          email: 'tidepool@example.com',
        });

        service.authState$.subscribe(state => {
          if (state.provider === 'both') {
            expect(state.isAuthenticated).toBe(true);
            expect(state.provider).toBe('both');
            expect(state.user?.tidepoolUserId).toBe('tidepool-user-123');
            expect(state.user?.email).toBe('test@example.com'); // Local takes precedence
            resolve();
          }
        });
      }));
  });

  describe('Login Methods', () => {
    it('should login with local backend', () =>
      new Promise<void>(resolve => {
        const loginRequest: LoginRequest = {
          email: 'test@example.com',
          password: 'password123',
          rememberMe: true,
        };

        const mockUser = {
          id: 'user123',
          email: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe',
          role: 'patient' as const,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        const mockLoginResult: LoginResult = {
          success: true,
          user: mockUser,
        };

        const mockAuthState: LocalAuthState = {
          isAuthenticated: true,
          user: mockUser,
          accessToken: 'token',
          refreshToken: 'refresh',
          expiresAt: Date.now() + 3600000,
        };

        localAuthSpy.login.mockReturnValue(of(mockLoginResult));
        mockLocalAuthState.next(mockAuthState);

        service.loginLocal(loginRequest).subscribe(state => {
          expect(state.isAuthenticated).toBe(true);
          expect(state.provider).toBe('local');
          expect(localAuthSpy.login).toHaveBeenCalledWith(
            loginRequest.email || loginRequest.dni || '',
            loginRequest.password,
            loginRequest.rememberMe || false
          );
          resolve();
        });
      }));

    it('should handle local login failure', () =>
      new Promise<void>(resolve => {
        const loginRequest: LoginRequest = {
          email: 'test@example.com',
          password: 'wrong-password',
        };

        const mockLoginResult: LoginResult = {
          success: false,
          error: 'Invalid credentials',
        };
        localAuthSpy.login.mockReturnValue(of(mockLoginResult));

        service.loginLocal(loginRequest).subscribe(state => {
          expect(state.isAuthenticated).toBe(false);
          resolve();
        });
      }));

    it('should login with Tidepool', () => {
      tidepoolAuthSpy.login.mockReturnValue(Promise.resolve());

      service.loginTidepool();

      expect(tidepoolAuthSpy.login).toHaveBeenCalled();
    });
  });

  describe('Register Method', () => {
    it('should register new user with local backend', () =>
      new Promise<void>(resolve => {
        const registerRequest: RegisterRequest = {
          email: 'new@example.com',
          password: 'password123',
          firstName: 'Jane',
          lastName: 'Doe',
          role: 'patient',
          diabetesType: '1',
        };

        const mockUser = {
          id: 'new-user',
          email: 'new@example.com',
          firstName: 'Jane',
          lastName: 'Doe',
          role: 'patient' as const,
          diabetesType: '1' as const,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        const mockLoginResult: LoginResult = {
          success: true,
          user: mockUser,
        };

        const mockAuthState: LocalAuthState = {
          isAuthenticated: true,
          user: mockUser,
          accessToken: 'token',
          refreshToken: 'refresh',
          expiresAt: Date.now() + 3600000,
        };

        localAuthSpy.register.mockReturnValue(of(mockLoginResult));
        mockLocalAuthState.next(mockAuthState);

        service.register(registerRequest).subscribe(state => {
          expect(state.isAuthenticated).toBe(true);
          expect(state.user?.firstName).toBe('Jane');
          expect(localAuthSpy.register).toHaveBeenCalledWith(registerRequest);
          resolve();
        });
      }));
  });

  describe('Logout Methods', () => {
    it('should logout from both providers', async () => {
      // Set up authenticated state for both
      mockLocalAuthState.next({
        isAuthenticated: true,
        user: {
          id: 'user123',
          email: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe',
          role: 'patient',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        accessToken: 'local-token',
        refreshToken: 'local-refresh',
        expiresAt: Date.now() + 3600000,
      });

      mockTidepoolAuthState.next({
        isAuthenticated: true,
        isLoading: false,
        error: null,
        userId: 'tidepool-user',
        email: 'test@example.com',
      });

      localAuthSpy.logout.mockReturnValue(Promise.resolve());
      tidepoolAuthSpy.logout.mockReturnValue(Promise.resolve());

      await service.logout();

      expect(localAuthSpy.logout).toHaveBeenCalled();
      expect(tidepoolAuthSpy.logout).toHaveBeenCalled();
    });

    it('should logout from specific provider', async () => {
      localAuthSpy.logout.mockReturnValue(Promise.resolve());
      tidepoolAuthSpy.logout.mockReturnValue(Promise.resolve());

      await service.logoutFrom('local');
      expect(localAuthSpy.logout).toHaveBeenCalled();
      expect(tidepoolAuthSpy.logout).not.toHaveBeenCalled();

      await service.logoutFrom('tidepool');
      expect(tidepoolAuthSpy.logout).toHaveBeenCalled();
    });
  });

  describe('Token Management', () => {
    it('should get access token from local auth when available', () =>
      new Promise<void>(resolve => {
        mockLocalAuthState.next({
          isAuthenticated: true,
          user: null,
          accessToken: 'local-access-token',
          refreshToken: 'local-refresh',
          expiresAt: Date.now() + 3600000,
        });

        service.getAccessToken().subscribe(token => {
          expect(token).toBe('local-access-token');
          resolve();
        });
      }));

    it('should fallback to Tidepool token when local not available', () =>
      new Promise<void>(resolve => {
        mockTidepoolAuthState.next({
          isAuthenticated: true,
          isLoading: false,
          error: null,
          userId: 'user',
          email: 'test@example.com',
        });

        tidepoolAuthSpy.getAccessToken.mockReturnValue(Promise.resolve('tidepool-access-token'));

        service.getAccessToken().subscribe(token => {
          expect(token).toBe('tidepool-access-token');
          resolve();
        });
      }));

    it('should return null when not authenticated', () =>
      new Promise<void>(resolve => {
        service.getAccessToken().subscribe(token => {
          expect(token).toBeNull();
          resolve();
        });
      }));

    it('should get provider-specific token', () =>
      new Promise<void>(resolve => {
        localAuthSpy.getAccessToken.mockReturnValue(Promise.resolve('local-token'));
        tidepoolAuthSpy.getAccessToken.mockReturnValue(Promise.resolve('tidepool-token'));

        service.getProviderToken('local').subscribe(token => {
          expect(token).toBe('local-token');
          expect(localAuthSpy.getAccessToken).toHaveBeenCalled();
        });

        service.getProviderToken('tidepool').subscribe(token => {
          expect(token).toBe('tidepool-token');
          expect(tidepoolAuthSpy.getAccessToken).toHaveBeenCalled();
          resolve();
        });
      }));
  });

  describe('Token Refresh', () => {
    it('should refresh tokens for active providers', () =>
      new Promise<void>(resolve => {
        mockLocalAuthState.next({
          isAuthenticated: true,
          user: null,
          accessToken: 'local-token',
          refreshToken: 'local-refresh-token',
          expiresAt: Date.now() + 3600000,
        });

        mockTidepoolAuthState.next({
          isAuthenticated: true,
          isLoading: false,
          error: null,
          userId: 'user',
          email: 'test@example.com',
        });

        const newLocalState: LocalAuthState = {
          isAuthenticated: true,
          user: null,
          accessToken: 'new-local-token',
          refreshToken: 'new-local-refresh',
          expiresAt: Date.now() + 7200000,
        };

        localAuthSpy.refreshAccessToken.mockReturnValue(of(newLocalState));
        tidepoolAuthSpy.refreshAccessToken.mockReturnValue(Promise.resolve('new-tidepool-token'));

        service.refreshTokens().subscribe(() => {
          expect(localAuthSpy.refreshAccessToken).toHaveBeenCalled();
          expect(tidepoolAuthSpy.refreshAccessToken).toHaveBeenCalled();
          resolve();
        });
      }));

    it('should handle refresh failures gracefully', () =>
      new Promise<void>(resolve => {
        mockLocalAuthState.next({
          isAuthenticated: true,
          user: null,
          accessToken: 'local-token',
          refreshToken: 'local-refresh-token',
          expiresAt: Date.now() + 3600000,
        });

        localAuthSpy.refreshAccessToken.mockReturnValue(
          throwError(() => new Error('Refresh failed'))
        );

        service.refreshTokens().subscribe(state => {
          // Should not throw, just log warning
          expect(state).toBeDefined();
          resolve();
        });
      }));
  });

  describe('Provider Checks', () => {
    it('should check authentication with specific provider', () => {
      mockLocalAuthState.next({
        isAuthenticated: true,
        user: null,
        accessToken: 'token',
        refreshToken: 'refresh',
        expiresAt: Date.now() + 3600000,
      });

      expect(service.isAuthenticatedWith('local')).toBe(true);
      expect(service.isAuthenticatedWith('tidepool')).toBe(false);
    });

    it('should get current provider', () => {
      mockLocalAuthState.next({
        isAuthenticated: true,
        user: null,
        accessToken: 'token',
        refreshToken: 'refresh',
        expiresAt: Date.now() + 3600000,
      });

      expect(service.getProvider()).toBe('local');
    });
  });

  describe('Account Linking', () => {
    it('should link Tidepool account to local account', () => {
      // Mark local auth as authenticated so unified state reflects it
      mockLocalAuthState.next({
        isAuthenticated: true,
        user: null,
        accessToken: 'token',
        refreshToken: 'refresh',
        expiresAt: Date.now() + 3600000,
      });

      tidepoolAuthSpy.login.mockReturnValue(Promise.resolve());

      service.linkTidepoolAccount().subscribe(() => {
        expect(tidepoolAuthSpy.login).toHaveBeenCalled();
      });
    });

    it('should throw error if not logged in locally', () => {
      // Ensure local auth is not authenticated in unified state
      mockLocalAuthState.next({
        isAuthenticated: false,
        user: null,
        accessToken: null,
        refreshToken: null,
        expiresAt: null,
      });

      expect(() => service.linkTidepoolAccount()).toThrow(
        new Error('Must be logged in locally to link Tidepool account')
      );
    });

    it('should unlink Tidepool account', async () => {
      mockTidepoolAuthState.next({
        isAuthenticated: true,
        userId: 'user',
        email: 'test@example.com',
        isLoading: false,
        error: null,
      });

      tidepoolAuthSpy.logout.mockReturnValue(Promise.resolve());

      await service.unlinkTidepoolAccount();

      expect(tidepoolAuthSpy.logout).toHaveBeenCalled();
    });
  });

  describe('User Preferences', () => {
    it('should update preferences for local user', () =>
      new Promise<void>(resolve => {
        mockLocalAuthState.next({
          isAuthenticated: true,
          user: {
            id: 'user',
            email: 'test@example.com',
            firstName: 'John',
            lastName: 'Doe',
            role: 'patient',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          accessToken: 'token',
          refreshToken: 'refresh',
          expiresAt: Date.now() + 3600000,
        });

        const preferences = {
          glucoseUnit: 'mmol/L' as const,
          language: 'es' as const,
        };

        localAuthSpy.updatePreferences.mockReturnValue(
          of({
            id: 'user',
            email: 'test@example.com',
            firstName: 'John',
            lastName: 'Doe',
            role: 'patient',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            preferences: preferences as any,
          })
        );

        service.updatePreferences(preferences).subscribe(() => {
          expect(localAuthSpy.updatePreferences).toHaveBeenCalledWith(preferences);
          resolve();
        });
      }));
  });

  describe('User Management', () => {
    it('should get current user', () => {
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'patient' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockLocalAuthState.next({
        isAuthenticated: true,
        user: mockUser,
        accessToken: 'token',
        refreshToken: 'refresh',
        expiresAt: Date.now() + 3600000,
      });

      const user = service.getCurrentUser();
      expect(user?.email).toBe('test@example.com');
      expect(user?.provider).toBe('local');
    });

    it('should check if user is authenticated', () => {
      expect(service.isAuthenticated()).toBe(false);

      mockLocalAuthState.next({
        isAuthenticated: true,
        user: null,
        accessToken: 'token',
        refreshToken: 'refresh',
        expiresAt: Date.now() + 3600000,
      });

      expect(service.isAuthenticated()).toBe(true);
    });
  });
});
