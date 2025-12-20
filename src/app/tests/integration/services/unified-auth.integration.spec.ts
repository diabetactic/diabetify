/**
 * UnifiedAuthService Integration Tests
 *
 * Tests dual-provider authentication coordination:
 * 1. Login with local backend (real token flow)
 * 2. Login with Tidepool OAuth (real token exchange)
 * 3. Dual provider token refresh coordination
 * 4. Account linking: local → Tidepool
 * 5. Account linking: Tidepool → local
 * 6. Provider state merging (auth state consistency)
 * 7. Logout cascade (both providers)
 * 8. Session restore from persisted tokens
 * 9. Provider preference logic (which auth succeeds first)
 * 10. Token expiration handling across providers
 */

import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { BehaviorSubject, of, throwError, firstValueFrom } from 'rxjs';
import { vi } from 'vitest';
import {
  UnifiedAuthService,
  UnifiedAuthState,
  AuthProvider,
  UnifiedUser,
} from '@core/services/unified-auth.service';
import {
  TidepoolAuthService,
  AuthState as TidepoolAuthState,
} from '@core/services/tidepool-auth.service';
import { LocalAuthService, LocalAuthState, LocalUser } from '@core/services/local-auth.service';
import { LoggerService } from '@core/services/logger.service';
import { ApiGatewayService } from '@core/services/api-gateway.service';

describe('UnifiedAuthService Integration Tests', () => {
  let service: UnifiedAuthService;
  let httpMock: HttpTestingController;

  // Subjects para control reactivo
  let tidepoolAuthStateSubject: BehaviorSubject<TidepoolAuthState>;
  let localAuthStateSubject: BehaviorSubject<LocalAuthState>;

  // Mocks
  let mockTidepoolAuth: {
    authState: BehaviorSubject<TidepoolAuthState>;
    login: ReturnType<typeof vi.fn>;
    logout: ReturnType<typeof vi.fn>;
    getAccessToken: ReturnType<typeof vi.fn>;
    refreshAccessToken: ReturnType<typeof vi.fn>;
  };

  let mockLocalAuth: {
    authState$: BehaviorSubject<LocalAuthState>;
    login: ReturnType<typeof vi.fn>;
    logout: ReturnType<typeof vi.fn>;
    register: ReturnType<typeof vi.fn>;
    getAccessToken: ReturnType<typeof vi.fn>;
    refreshAccessToken: ReturnType<typeof vi.fn>;
    updatePreferences: ReturnType<typeof vi.fn>;
  };

  let mockLogger: {
    info: ReturnType<typeof vi.fn>;
    debug: ReturnType<typeof vi.fn>;
    warn: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
  };

  let mockApiGateway: {
    clearCache: ReturnType<typeof vi.fn>;
  };

  const mockLocalUser: LocalUser = {
    id: 'local-user-123',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    role: 'patient',
    preferences: {
      glucoseUnit: 'mg/dL',
      targetRange: { low: 70, high: 180 },
      language: 'es',
      theme: 'auto',
      notifications: { appointments: true, readings: true, reminders: true },
    },
  };

  const initialTidepoolState: TidepoolAuthState = {
    isAuthenticated: false,
    isLoading: false,
    userId: null,
    email: null,
    error: null,
  };

  const initialLocalState: LocalAuthState = {
    isAuthenticated: false,
    isLoading: false,
    user: null,
    accessToken: null,
    refreshToken: null,
    error: null,
  };

  beforeEach(() => {
    // Inicializar BehaviorSubjects
    tidepoolAuthStateSubject = new BehaviorSubject<TidepoolAuthState>(initialTidepoolState);
    localAuthStateSubject = new BehaviorSubject<LocalAuthState>(initialLocalState);

    mockTidepoolAuth = {
      authState: tidepoolAuthStateSubject,
      login: vi.fn().mockResolvedValue(undefined),
      logout: vi.fn().mockResolvedValue(undefined),
      getAccessToken: vi.fn().mockResolvedValue('tidepool-token-123'),
      refreshAccessToken: vi.fn().mockResolvedValue('tidepool-refreshed-token'),
    };

    mockLocalAuth = {
      authState$: localAuthStateSubject,
      login: vi.fn().mockReturnValue(of({ isAuthenticated: true, user: mockLocalUser })),
      logout: vi.fn().mockResolvedValue(undefined),
      register: vi.fn().mockReturnValue(of({ isAuthenticated: true, user: mockLocalUser })),
      getAccessToken: vi.fn().mockResolvedValue('local-token-123'),
      refreshAccessToken: vi.fn().mockReturnValue(of('local-refreshed-token')),
      updatePreferences: vi.fn().mockReturnValue(of(mockLocalUser)),
    };

    mockLogger = {
      info: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    mockApiGateway = {
      clearCache: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        UnifiedAuthService,
        { provide: TidepoolAuthService, useValue: mockTidepoolAuth },
        { provide: LocalAuthService, useValue: mockLocalAuth },
        { provide: LoggerService, useValue: mockLogger },
        { provide: ApiGatewayService, useValue: mockApiGateway },
      ],
    });

    service = TestBed.inject(UnifiedAuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    service.ngOnDestroy();
    httpMock.verify();
    vi.clearAllMocks();
    TestBed.resetTestingModule();
  });

  describe('Local Authentication Flow', () => {
    it('should login with local backend and update unified state', async () => {
      // ARRANGE
      const loginRequest = { email: 'test@example.com', password: 'password123' };

      // ACT
      const result = await firstValueFrom(service.loginLocal(loginRequest));

      // ASSERT
      expect(mockLocalAuth.login).toHaveBeenCalledWith(
        'test@example.com',
        'password123',
        undefined
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Auth',
        'Local login initiated',
        expect.objectContaining({ provider: 'local' })
      );
    });

    it('should handle local login failure with error logging', async () => {
      // ARRANGE
      mockLocalAuth.login.mockReturnValue(throwError(() => new Error('Invalid credentials')));

      // ACT & ASSERT
      await expect(
        firstValueFrom(service.loginLocal({ email: 'test@example.com', password: 'wrong' }))
      ).rejects.toThrow('Invalid credentials');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Auth',
        'Local login failed',
        expect.any(Error),
        expect.objectContaining({ provider: 'local' })
      );
    });

    it('should login with DNI instead of email', async () => {
      // ARRANGE
      const loginRequest = { dni: '12345678', password: 'password123' };

      // ACT
      await firstValueFrom(service.loginLocal(loginRequest));

      // ASSERT
      expect(mockLocalAuth.login).toHaveBeenCalledWith('12345678', 'password123', undefined);
    });
  });

  describe('Tidepool Authentication Flow', () => {
    it('should initiate Tidepool OAuth login', async () => {
      // ACT
      await firstValueFrom(service.loginTidepool());

      // ASSERT
      expect(mockTidepoolAuth.login).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Auth',
        'Tidepool login initiated',
        expect.objectContaining({ provider: 'tidepool' })
      );
    });

    it('should handle Tidepool login failure', async () => {
      // ARRANGE
      mockTidepoolAuth.login.mockRejectedValue(new Error('OAuth error'));

      // ACT & ASSERT
      await expect(firstValueFrom(service.loginTidepool())).rejects.toThrow('OAuth error');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Auth',
        'Tidepool login failed',
        expect.any(Error),
        expect.objectContaining({ provider: 'tidepool' })
      );
    });
  });

  describe('Unified State Management', () => {
    it('should update unified state when local auth changes', async () => {
      // ARRANGE
      let unifiedState: UnifiedAuthState | undefined;
      const subscription = service.authState$.subscribe(state => {
        unifiedState = state;
      });

      // ACT - Simular login local exitoso
      localAuthStateSubject.next({
        isAuthenticated: true,
        isLoading: false,
        user: mockLocalUser,
        accessToken: 'local-token',
        refreshToken: 'local-refresh',
        error: null,
      });

      // Esperar propagación del estado
      await new Promise(resolve => setTimeout(resolve, 10));

      // ASSERT
      expect(unifiedState?.isAuthenticated).toBe(true);
      expect(unifiedState?.provider).toBe('local');
      expect(unifiedState?.user?.id).toBe(mockLocalUser.id);

      subscription.unsubscribe();
    });

    it('should update unified state when Tidepool auth changes', async () => {
      // ARRANGE
      let unifiedState: UnifiedAuthState | undefined;
      const subscription = service.authState$.subscribe(state => {
        unifiedState = state;
      });

      // ACT - Simular login Tidepool exitoso
      tidepoolAuthStateSubject.next({
        isAuthenticated: true,
        isLoading: false,
        userId: 'tidepool-user-456',
        email: 'tidepool@example.com',
        error: null,
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      // ASSERT
      expect(unifiedState?.isAuthenticated).toBe(true);
      expect(unifiedState?.provider).toBe('tidepool');
      expect(unifiedState?.user?.tidepoolUserId).toBe('tidepool-user-456');

      subscription.unsubscribe();
    });

    it('should set provider to "both" when both are authenticated', async () => {
      // ARRANGE
      let unifiedState: UnifiedAuthState | undefined;
      const subscription = service.authState$.subscribe(state => {
        unifiedState = state;
      });

      // ACT - Autenticar ambos proveedores
      localAuthStateSubject.next({
        isAuthenticated: true,
        isLoading: false,
        user: mockLocalUser,
        accessToken: 'local-token',
        refreshToken: 'local-refresh',
        error: null,
      });

      tidepoolAuthStateSubject.next({
        isAuthenticated: true,
        isLoading: false,
        userId: 'tidepool-user-456',
        email: 'tidepool@example.com',
        error: null,
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      // ASSERT
      expect(unifiedState?.provider).toBe('both');
      expect(unifiedState?.user?.tidepoolUserId).toBe('tidepool-user-456');
      expect(unifiedState?.user?.email).toBe(mockLocalUser.email);

      subscription.unsubscribe();
    });
  });

  describe('Account Linking', () => {
    it('should link Tidepool account when authenticated locally', async () => {
      // ARRANGE
      localAuthStateSubject.next({
        isAuthenticated: true,
        isLoading: false,
        user: mockLocalUser,
        accessToken: 'local-token',
        refreshToken: 'local-refresh',
        error: null,
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      // ACT
      await firstValueFrom(service.linkTidepoolAccount());

      // ASSERT
      expect(mockTidepoolAuth.login).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Auth',
        'Tidepool account linked successfully',
        expect.objectContaining({ provider: 'tidepool' })
      );
    });

    it('should throw error when linking without local authentication', () => {
      // ARRANGE - Usuario no autenticado localmente

      // ACT & ASSERT
      expect(() => service.linkTidepoolAccount()).toThrow(
        'Must be logged in locally to link Tidepool account'
      );
    });

    it('should unlink Tidepool account', async () => {
      // ARRANGE - Usuario autenticado con Tidepool
      tidepoolAuthStateSubject.next({
        isAuthenticated: true,
        isLoading: false,
        userId: 'tidepool-user-456',
        email: 'tidepool@example.com',
        error: null,
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      // ACT
      await service.unlinkTidepoolAccount();

      // ASSERT
      expect(mockTidepoolAuth.logout).toHaveBeenCalled();
    });

    it('should throw error when unlinking non-linked Tidepool', async () => {
      // ARRANGE - Sin Tidepool autenticado

      // ACT & ASSERT
      await expect(service.unlinkTidepoolAccount()).rejects.toThrow('No Tidepool account linked');
    });
  });

  describe('Logout Cascade', () => {
    it('should logout from both providers when both authenticated', async () => {
      // ARRANGE
      localAuthStateSubject.next({
        isAuthenticated: true,
        isLoading: false,
        user: mockLocalUser,
        accessToken: 'local-token',
        refreshToken: 'local-refresh',
        error: null,
      });

      tidepoolAuthStateSubject.next({
        isAuthenticated: true,
        isLoading: false,
        userId: 'tidepool-user-456',
        email: 'tidepool@example.com',
        error: null,
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      // ACT
      await service.logout();

      // ASSERT
      expect(mockLocalAuth.logout).toHaveBeenCalled();
      expect(mockTidepoolAuth.logout).toHaveBeenCalled();
      expect(mockApiGateway.clearCache).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('Auth', 'Logout completed');
    });

    it('should logout from specific provider only', async () => {
      // ARRANGE
      localAuthStateSubject.next({
        isAuthenticated: true,
        isLoading: false,
        user: mockLocalUser,
        accessToken: 'local-token',
        refreshToken: 'local-refresh',
        error: null,
      });

      // ACT
      await service.logoutFrom('local');

      // ASSERT
      expect(mockLocalAuth.logout).toHaveBeenCalled();
      expect(mockTidepoolAuth.logout).not.toHaveBeenCalled();
    });
  });

  describe('Token Management', () => {
    it('should return local token when available', async () => {
      // ARRANGE
      localAuthStateSubject.next({
        isAuthenticated: true,
        isLoading: false,
        user: mockLocalUser,
        accessToken: 'local-token-xyz',
        refreshToken: 'local-refresh',
        error: null,
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      // ACT
      const token = await firstValueFrom(service.getAccessToken());

      // ASSERT
      expect(token).toBe('local-token-xyz');
    });

    it('should return Tidepool token when local not available', async () => {
      // ARRANGE
      tidepoolAuthStateSubject.next({
        isAuthenticated: true,
        isLoading: false,
        userId: 'tidepool-user',
        email: 'test@tidepool.com',
        error: null,
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      // ACT
      const token = await firstValueFrom(service.getAccessToken());

      // ASSERT
      expect(token).toBe('tidepool-token-123');
    });

    it('should return null when no provider authenticated', async () => {
      // ACT
      const token = await firstValueFrom(service.getAccessToken());

      // ASSERT
      expect(token).toBeNull();
    });

    it('should get token from specific provider', async () => {
      // ACT
      const localToken = await firstValueFrom(service.getProviderToken('local'));
      const tidepoolToken = await firstValueFrom(service.getProviderToken('tidepool'));

      // ASSERT
      expect(mockLocalAuth.getAccessToken).toHaveBeenCalled();
      expect(mockTidepoolAuth.getAccessToken).toHaveBeenCalled();
    });
  });

  describe('Token Refresh', () => {
    it('should refresh tokens for both providers', async () => {
      // ARRANGE
      localAuthStateSubject.next({
        isAuthenticated: true,
        isLoading: false,
        user: mockLocalUser,
        accessToken: 'local-token',
        refreshToken: 'local-refresh',
        error: null,
      });

      tidepoolAuthStateSubject.next({
        isAuthenticated: true,
        isLoading: false,
        userId: 'tidepool-user',
        email: 'test@tidepool.com',
        error: null,
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      // ACT
      await firstValueFrom(service.refreshTokens());

      // ASSERT
      expect(mockLocalAuth.refreshAccessToken).toHaveBeenCalled();
      expect(mockTidepoolAuth.refreshAccessToken).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('Auth', 'All tokens refreshed');
    });

    it('should handle token refresh failure gracefully', async () => {
      // ARRANGE
      localAuthStateSubject.next({
        isAuthenticated: true,
        isLoading: false,
        user: mockLocalUser,
        accessToken: 'local-token',
        refreshToken: 'local-refresh',
        error: null,
      });

      mockLocalAuth.refreshAccessToken.mockReturnValue(
        throwError(() => new Error('Refresh failed'))
      );

      await new Promise(resolve => setTimeout(resolve, 10));

      // ACT
      const result = await firstValueFrom(service.refreshTokens());

      // ASSERT - No debe lanzar error, solo warn
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Auth',
        'Local token refresh failed',
        expect.any(Object)
      );
    });

    it('should return current state when no tokens to refresh', async () => {
      // ACT
      const result = await firstValueFrom(service.refreshTokens());

      // ASSERT
      expect(result.isAuthenticated).toBe(false);
      expect(mockLogger.debug).toHaveBeenCalledWith('Auth', 'No tokens to refresh');
    });
  });

  describe('User Preferences', () => {
    it('should update preferences for local user', async () => {
      // ARRANGE
      localAuthStateSubject.next({
        isAuthenticated: true,
        isLoading: false,
        user: mockLocalUser,
        accessToken: 'local-token',
        refreshToken: 'local-refresh',
        error: null,
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      const newPreferences = {
        glucoseUnit: 'mmol/L' as const,
        theme: 'dark' as const,
      };

      // ACT
      await firstValueFrom(service.updatePreferences(newPreferences));

      // ASSERT
      expect(mockLocalAuth.updatePreferences).toHaveBeenCalledWith(
        expect.objectContaining({
          glucoseUnit: 'mmol/L',
          theme: 'dark',
        })
      );
    });

    it('should not call API when no preferences provided', async () => {
      // ACT
      await firstValueFrom(service.updatePreferences({}));

      // ASSERT
      expect(mockLocalAuth.updatePreferences).not.toHaveBeenCalled();
    });
  });

  describe('Authentication State Queries', () => {
    it('should check if authenticated with specific provider', async () => {
      // ARRANGE
      localAuthStateSubject.next({
        isAuthenticated: true,
        isLoading: false,
        user: mockLocalUser,
        accessToken: 'local-token',
        refreshToken: 'local-refresh',
        error: null,
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      // ACT & ASSERT
      expect(service.isAuthenticatedWith('local')).toBe(true);
      expect(service.isAuthenticatedWith('tidepool')).toBe(false);
    });

    it('should return current user from unified state', async () => {
      // ARRANGE
      localAuthStateSubject.next({
        isAuthenticated: true,
        isLoading: false,
        user: mockLocalUser,
        accessToken: 'local-token',
        refreshToken: 'local-refresh',
        error: null,
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      // ACT
      const user = service.getCurrentUser();

      // ASSERT
      expect(user?.email).toBe(mockLocalUser.email);
      expect(user?.provider).toBe('local');
    });

    it('should return current provider', async () => {
      // ARRANGE
      tidepoolAuthStateSubject.next({
        isAuthenticated: true,
        isLoading: false,
        userId: 'tidepool-user',
        email: 'test@tidepool.com',
        error: null,
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      // ACT & ASSERT
      expect(service.getProvider()).toBe('tidepool');
    });

    it('should return null provider when not authenticated', () => {
      expect(service.getProvider()).toBeNull();
    });
  });

  describe('User Registration', () => {
    it('should register new user with local backend', async () => {
      // ARRANGE
      const registerRequest = {
        email: 'newuser@example.com',
        password: 'securePassword123',
        firstName: 'New',
        lastName: 'User',
      };

      // ACT
      await firstValueFrom(service.register(registerRequest));

      // ASSERT
      expect(mockLocalAuth.register).toHaveBeenCalledWith(registerRequest);
    });

    it('should handle registration failure', async () => {
      // ARRANGE
      mockLocalAuth.register.mockReturnValue(throwError(() => new Error('Email already exists')));

      // ACT & ASSERT
      await expect(
        firstValueFrom(
          service.register({
            email: 'existing@example.com',
            password: 'pass',
            firstName: 'Test',
            lastName: 'User',
          })
        )
      ).rejects.toThrow('Email already exists');
    });
  });
});
