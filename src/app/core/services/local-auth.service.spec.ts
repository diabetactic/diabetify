/* eslint-disable */
// Initialize TestBed environment for Vitest
import '../../../test-setup';

import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of, throwError, firstValueFrom } from 'rxjs';
import { Preferences } from '@capacitor/preferences';

import {
  LocalAuthService,
  LocalAuthState,
  LocalUser,
  AccountState,
} from '@services/local-auth.service';
import { PlatformDetectorService } from '@services/platform-detector.service';
import { LoggerService } from '@services/logger.service';
import { MockDataService } from '@services/mock-data.service';
import { MockAdapterService } from '@services/mock-adapter.service';
import { HttpClient } from '@angular/common/http';
import { SecureStorageService } from '@services/secure-storage.service';
import { TokenService } from '@services/token.service';
import { EnvironmentConfigService } from '@core/config/environment-config.service';

// Mock Preferences for Vitest
vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: vi.fn(),
    set: vi.fn(),
    remove: vi.fn(),
  },
}));

describe('LocalAuthService', () => {
  let service: LocalAuthService;
  let platformDetector: PlatformDetectorService;
  let logger: LoggerService;
  let mockData: MockDataService;
  let mockAdapter: MockAdapterService;
  let httpMock: HttpClient;
  let secureStorage: Mock<SecureStorageService>;
  let tokenService: {
    waitForInitialization: Mock;
    getAccessToken: Mock;
    getRefreshToken: Mock;
    isTokenExpired: Mock;
    getExpiresAt: Mock;
    setTokens: Mock;
    clearTokens: Mock;
  };
  let envConfig: Partial<EnvironmentConfigService>;

  const mockUser: LocalUser = {
    id: 'test-user-123',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    role: 'patient',
    accountState: AccountState.ACTIVE,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockTokenResponse = {
    access_token: 'test-access-token',
    refresh_token: 'test-refresh-token',
    token_type: 'bearer',
    expires_in: 3600,
  };

  const mockGatewayUserResponse = {
    dni: 'test-user-123',
    email: 'test@example.com',
    name: 'Test',
    last_name: 'User',
    state: 'active',
  };

  beforeEach(async () => {
    // Reset all mocks
    vi.clearAllMocks();

    // Default Preferences mock - no stored data
    vi.mocked(Preferences.get).mockResolvedValue({ value: null });
    vi.mocked(Preferences.set).mockResolvedValue(undefined);
    vi.mocked(Preferences.remove).mockResolvedValue(undefined);

    // Create mock services
    platformDetector = {
      getApiBaseUrl: vi.fn().mockReturnValue('http://test-api.example.com'),
      isNativePlatform: vi.fn().mockReturnValue(false),
      isWebPlatform: vi.fn().mockReturnValue(true),
    } as unknown as PlatformDetectorService;

    logger = {
      info: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as LoggerService;

    mockData = {} as MockDataService;

    mockAdapter = {
      isServiceMockEnabled: vi.fn().mockReturnValue(false),
    } as unknown as MockAdapterService;

    secureStorage = {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue(undefined),
      remove: vi.fn().mockResolvedValue(undefined),
      migrateFromPreferences: vi.fn().mockResolvedValue(false),
      waitForInit: vi.fn().mockResolvedValue(undefined),
    } as unknown as Mock<SecureStorageService>;

    tokenService = {
      waitForInitialization: vi.fn().mockResolvedValue(undefined),
      getAccessToken: vi.fn().mockResolvedValue(null),
      getRefreshToken: vi.fn().mockResolvedValue(null),
      isTokenExpired: vi.fn().mockReturnValue(true),
      getExpiresAt: vi.fn().mockReturnValue(null),
      setTokens: vi.fn().mockResolvedValue(undefined),
      clearTokens: vi.fn().mockResolvedValue(undefined),
    };

    envConfig = {
      backendMode: 'cloud',
      isMockMode: false,
      devToolsEnabled: false,
    };

    httpMock = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    } as unknown as HttpClient;

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        LocalAuthService,
        { provide: PlatformDetectorService, useValue: platformDetector },
        { provide: LoggerService, useValue: logger },
        { provide: MockDataService, useValue: mockData },
        { provide: MockAdapterService, useValue: mockAdapter },
        { provide: HttpClient, useValue: httpMock },
        { provide: SecureStorageService, useValue: secureStorage },
        { provide: TokenService, useValue: tokenService },
        { provide: EnvironmentConfigService, useValue: envConfig },
      ],
    });

    service = TestBed.inject(LocalAuthService);

    // Wait for initialization to complete
    // @ts-expect-error - private property access for testing
    await service.initializationPromise;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should start with unauthenticated state when no stored data', async () => {
      const state = await new Promise<LocalAuthState>(resolve => {
        service.authState$.subscribe(s => resolve(s));
      });

      expect(state.isAuthenticated).toBe(false);
      expect(state.user).toBeNull();
      expect(state.accessToken).toBeNull();
    });

    it('should restore auth state from storage when valid token exists', async () => {
      const storedUser = JSON.stringify(mockUser);

      const testTokenService = {
        waitForInitialization: vi.fn().mockResolvedValue(undefined),
        getAccessToken: vi.fn().mockResolvedValue('stored-token'),
        getRefreshToken: vi.fn().mockResolvedValue('stored-refresh'),
        isTokenExpired: vi.fn().mockReturnValue(false),
        getExpiresAt: vi.fn().mockReturnValue(Date.now() + 3600000),
        setTokens: vi.fn().mockResolvedValue(undefined),
        clearTokens: vi.fn().mockResolvedValue(undefined),
      };

      const testEnvConfig = {
        backendMode: 'cloud',
        isMockMode: false,
        devToolsEnabled: false,
      };

      vi.mocked(Preferences.get).mockImplementation(({ key }: { key: string }) => {
        switch (key) {
          case 'local_user':
            return Promise.resolve({ value: storedUser });
          default:
            return Promise.resolve({ value: null });
        }
      });

      const newService = new LocalAuthService(
        httpMock,
        platformDetector,
        logger,
        mockAdapter,
        testTokenService as unknown as TokenService,
        testEnvConfig as unknown as EnvironmentConfigService
      );

      // @ts-expect-error - private property access for testing
      await newService.initializationPromise;

      const state = await new Promise<LocalAuthState>(resolve => {
        newService.authState$.subscribe(s => resolve(s));
      });

      expect(state.isAuthenticated).toBe(true);
      expect(state.user).toEqual(mockUser);
      expect(state.accessToken).toBe('stored-token');
    });
  });

  describe('login', () => {
    describe('mock mode', () => {
      beforeEach(() => {
        mockAdapter.isServiceMockEnabled.mockReturnValue(true);
      });

      it('should return demo user and store tokens when rememberMe is true', async () => {
        const result1 = await firstValueFrom(service.login('any@email.com', 'anypassword'));
        expect(result1.success).toBe(true);
        expect(result1.user).toBeDefined();
        expect(result1.user?.email).toBe('demo@diabetactic.com');
        expect(result1.user?.firstName).toBe('Sofia');

        vi.clearAllMocks();
        const result2 = await firstValueFrom(service.login('any@email.com', 'anypassword', true));
        expect(result2.success).toBe(true);
        expect(tokenService.setTokens).toHaveBeenCalledWith('demo_access_token', null, 86400);
        expect(Preferences.set).toHaveBeenCalled();
      });
    });

    describe('real backend mode', () => {
      beforeEach(() => {
        mockAdapter.isServiceMockEnabled.mockReturnValue(false);
      });

      it('should authenticate successfully, update state, and store tokens', () =>
        new Promise<void>(resolve => {
          httpMock.post.mockReturnValueOnce(of(mockTokenResponse));
          httpMock.get.mockReturnValueOnce(of(mockGatewayUserResponse));

          service.login('test@example.com', 'password123', true).subscribe(() => {
            expect(httpMock.post).toHaveBeenCalledWith(
              expect.stringContaining('/token'),
              expect.any(String),
              expect.any(Object)
            );

            expect(tokenService.setTokens).toHaveBeenCalled();

            service.authState$.subscribe(state => {
              expect(state.isAuthenticated).toBe(true);
              expect(state.accessToken).toBe('test-access-token');
              resolve();
            });
          });
        }));

      it('should return error when authentication fails', async () => {
        httpMock.post.mockReturnValueOnce(
          throwError(() => ({
            status: 401,
            error: { detail: 'Invalid credentials' },
          }))
        );

        const result = await firstValueFrom(service.login('wrong@example.com', 'wrongpassword'));
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      });

      it('should return error when account is blocked', () =>
        new Promise<void>(resolve => {
          httpMock.post.mockReturnValueOnce(of(mockTokenResponse));
          httpMock.get.mockReturnValueOnce(
            of({
              ...mockGatewayUserResponse,
              blocked: true,
            })
          );

          service.login('blocked@example.com', 'password').subscribe({
            next: result => {
              expect(result.success).toBe(false);
              resolve();
            },
            error: err => {
              expect(err.message).toContain('accountDisabled');
              resolve();
            },
          });
        }));
    });
  });

  describe('logout', () => {
    beforeEach(async () => {
      // Setup authenticated state
      // @ts-expect-error - private property access for testing
      service.authStateSubject.next({
        isAuthenticated: true,
        user: mockUser,
        accessToken: 'test-token',
        refreshToken: 'test-refresh',
        expiresAt: Date.now() + 3600000,
      });
    });

    it('should clear state and storage', async () => {
      await service.logout();

      const state = await new Promise<LocalAuthState>(resolve => {
        service.authState$.subscribe(s => resolve(s));
      });
      expect(state.isAuthenticated).toBe(false);
      expect(state.user).toBeNull();
      expect(state.accessToken).toBeNull();

      expect(tokenService.clearTokens).toHaveBeenCalled();
      expect(Preferences.remove).toHaveBeenCalledWith({ key: 'local_user' });
    });

    it('should log events and clear IndexedDB PHI data', async () => {
      // Mock the database service import and clearAllData method
      const mockClearAllData = vi.fn().mockResolvedValue(undefined);
      vi.doMock('./database.service', () => ({
        db: {
          clearAllData: mockClearAllData,
        },
      }));

      await service.logout();

      // Verify logging
      expect(logger.info).toHaveBeenCalledWith('Auth', 'Logout initiated', expect.any(Object));
      expect(logger.info).toHaveBeenCalledWith(
        'Auth',
        'Logout completed - all data cleared from secure storage',
        expect.any(Object)
      );

      // Verify IndexedDB cleared
      expect(mockClearAllData).toHaveBeenCalled();
    });
  });

  describe('refreshAccessToken', () => {
    it('should refresh token when refresh token exists', () =>
      new Promise<void>(resolve => {
        tokenService.getRefreshToken.mockResolvedValueOnce('stored-refresh-token');

        (httpMock.post as Mock).mockReturnValueOnce(
          of({
            access_token: 'new-access-token',
            token_type: 'bearer',
          })
        );

        // @ts-expect-error - private property access for testing
        service.authStateSubject.next({
          isAuthenticated: true,
          user: mockUser,
          accessToken: 'old-token',
          refreshToken: 'stored-refresh-token',
          expiresAt: Date.now() - 1000,
        });

        service.refreshAccessToken().subscribe(state => {
          expect(state.accessToken).toBe('new-access-token');
          expect(state.isAuthenticated).toBe(true);
          expect(tokenService.setTokens).toHaveBeenCalled();
          resolve();
        });
      }));

    it('should throw error when no refresh token available', () =>
      new Promise<void>(resolve => {
        tokenService.getRefreshToken.mockResolvedValueOnce(null);

        service.refreshAccessToken().subscribe({
          error: error => {
            expect(error.message).toContain('No refresh token');
            resolve();
          },
        });
      }));

    it('should throw error when refresh fails', () =>
      new Promise<void>(resolve => {
        tokenService.getRefreshToken.mockResolvedValueOnce('stored-refresh-token');

        (httpMock.post as Mock).mockReturnValueOnce(
          throwError(() => ({
            status: 401,
            error: { detail: 'Invalid refresh token' },
          }))
        );

        service.refreshAccessToken().subscribe({
          error: error => {
            expect(error).toBeDefined();
            expect(tokenService.clearTokens).toHaveBeenCalled();
            resolve();
          },
        });
      }));

    it('should handle 503 Token service unavailable error', () =>
      new Promise<void>(resolve => {
        tokenService.getRefreshToken.mockResolvedValueOnce('stored-refresh-token');

        // Mock 503 response (Redis down)
        (httpMock.post as Mock).mockReturnValueOnce(
          throwError(() => ({
            status: 503,
            error: { detail: 'Token service unavailable' },
          }))
        );

        service.refreshAccessToken().subscribe({
          error: error => {
            // Error should be propagated - could be original or wrapped
            expect(error).toBeDefined();
            // Tokens should be cleared on any refresh failure
            expect(tokenService.clearTokens).toHaveBeenCalled();
            resolve();
          },
        });
      }));
  });

  describe('getAccessToken', () => {
    it('should return token when authenticated or null when not', async () => {
      // Test authenticated
      // @ts-expect-error - private property access for testing
      service.authStateSubject.next({
        isAuthenticated: true,
        user: mockUser,
        accessToken: 'current-token',
        refreshToken: null,
        expiresAt: Date.now() + 3600000,
      });

      const token1 = await service.getAccessToken();
      expect(token1).toBe('current-token');

      // Test not authenticated
      // @ts-expect-error - private property access for testing
      service.authStateSubject.next({
        isAuthenticated: false,
        user: null,
        accessToken: null,
        refreshToken: null,
        expiresAt: null,
      });

      const token2 = await service.getAccessToken();
      expect(token2).toBeNull();
    });
  });

  describe('authState$ observable', () => {
    it('should emit state changes', () =>
      new Promise<void>(resolve => {
        const states: LocalAuthState[] = [];

        const sub = service.authState$.subscribe(state => {
          states.push(state);
          if (states.length === 2) {
            expect(states[0].isAuthenticated).toBe(false);
            expect(states[1].isAuthenticated).toBe(true);
            sub.unsubscribe();
            resolve();
          }
        });

        // Trigger state change
        // @ts-expect-error - private property access for testing
        service.authStateSubject.next({
          isAuthenticated: true,
          user: mockUser,
          accessToken: 'test-token',
          refreshToken: null,
          expiresAt: null,
        });
      }));
  });

  describe('error handling', () => {
    it('should handle network errors and malformed responses', async () => {
      mockAdapter.isServiceMockEnabled.mockReturnValue(false);

      // Network error
      httpMock.post.mockReturnValueOnce(throwError(() => new Error('Network error')));
      const result1 = await new Promise<{ success: boolean; error?: string }>(resolve => {
        service.login('test@example.com', 'password').subscribe(r => resolve(r));
      });
      expect(result1.success).toBe(false);
      expect(result1.error).toBeDefined();

      // Malformed response
      httpMock.post.mockReturnValueOnce(of({})); // No access_token
      const result2 = await new Promise<{ success: boolean; error?: string }>(resolve => {
        service.login('test@example.com', 'password').subscribe(r => resolve(r));
      });
      expect(result2.success).toBe(false);
    });
  });

  describe('extractErrorMessage (via login error handling)', () => {
    beforeEach(() => {
      mockAdapter.isServiceMockEnabled.mockReturnValue(false);
    });

    // Consolidated HTTP status code error handling (GOOD - already parametrized)
    it('should return correct error messages for all HTTP status codes', async () => {
      const statusCases = [
        { status: 401, expectedContains: 'Credenciales incorrectas' },
        { status: 403, expectedContains: 'Credenciales incorrectas' }, // user-friendly
        { status: 409, expectedContains: 'ya existe' },
        { status: 422, expectedContains: 'Datos inválidos' },
        { status: 500, expectedContains: 'Error del servidor' },
        { status: 0, expectedContains: 'Error de conexión' },
      ];

      for (const { status, expectedContains } of statusCases) {
        httpMock.post.mockReturnValueOnce(throwError(() => ({ status })));

        const result = await new Promise<{ success: boolean; error?: string }>(resolve => {
          service.login('test@example.com', 'password').subscribe(r => resolve(r));
        });

        expect(result.success, `status ${status}`).toBe(false);
        expect(result.error, `status ${status}`).toContain(expectedContains);
      }
    });

    it('should handle timeout errors', () =>
      new Promise<void>(resolve => {
        httpMock.post.mockReturnValueOnce(
          throwError(() => ({ isTimeout: true, status: 0, message: 'Request timed out' }))
        );

        service.login('test@example.com', 'password').subscribe(result => {
          expect(result.success).toBe(false);
          expect(result.error).toContain('tardó demasiado');
          resolve();
        });
      }));

    it('should handle nested error.detail (array and string)', async () => {
      // Array detail
      httpMock.post.mockReturnValueOnce(
        throwError(() => ({
          status: 422,
          error: { detail: [{ msg: 'Field required' }, { msg: 'Invalid format' }] },
        }))
      );

      let result = await new Promise<{ success: boolean; error?: string }>(resolve => {
        service.login('', '').subscribe(r => resolve(r));
      });
      expect(result.error).toContain('Field required');
      expect(result.error).toContain('Invalid format');

      // String detail
      httpMock.post.mockReturnValueOnce(
        throwError(() => ({ status: 400, error: { detail: 'Invalid credentials provided' } }))
      );

      result = await new Promise<{ success: boolean; error?: string }>(resolve => {
        service.login('test@example.com', 'wrong').subscribe(r => resolve(r));
      });
      expect(result.error).toBe('Invalid credentials provided');
    });

    it('should handle edge cases (null, undefined, string error)', async () => {
      const edgeCases = [
        { error: null, expectDefined: true },
        { error: 'Simple error message', expectExact: 'Simple error message' },
      ];

      for (const { error, expectDefined, expectExact } of edgeCases) {
        httpMock.post.mockReturnValueOnce(throwError(() => error));

        const result = await new Promise<{ success: boolean; error?: string }>(resolve => {
          service.login('test@example.com', 'password').subscribe(r => resolve(r));
        });

        expect(result.success).toBe(false);
        if (expectDefined) expect(result.error).toBeDefined();
        if (expectExact) expect(result.error).toBe(expectExact);
      }
    });

    it('should handle errors with statusCode property (AppError format)', async () => {
      // Simulate AppError format from ErrorHandlerService
      const appError = {
        statusCode: 403,
        message: 'Access denied',
        code: 'FORBIDDEN',
      };

      httpMock.post.mockReturnValueOnce(throwError(() => appError));

      const result = await new Promise<{ success: boolean; error?: string }>(resolve => {
        service.login('test@example.com', 'password').subscribe(r => resolve(r));
      });

      expect(result.success).toBe(false);
      // Should map 403 to invalid credentials message
      expect(result.error).toContain('Credenciales incorrectas');
    });
  });

  describe('account state transitions', () => {
    beforeEach(() => {
      mockAdapter.isServiceMockEnabled.mockReturnValue(false);
    });

    it('should set accountState from backend or default to ACTIVE', async () => {
      // Test explicit ACTIVE state
      httpMock.post.mockReturnValueOnce(of(mockTokenResponse));
      httpMock.get.mockReturnValueOnce(
        of({
          ...mockGatewayUserResponse,
          state: 'active',
        })
      );

      await new Promise<void>(resolve => {
        service.login('test@example.com', 'password').subscribe(() => {
          const currentUser = service.getCurrentUser();
          expect(currentUser?.accountState).toBe(AccountState.ACTIVE);
          resolve();
        });
      });

      // Test missing state defaults to ACTIVE
      httpMock.post.mockReturnValueOnce(of(mockTokenResponse));
      httpMock.get.mockReturnValueOnce(
        of({
          ...mockGatewayUserResponse,
          state: undefined,
        })
      );

      await new Promise<void>(resolve => {
        service.login('test@example.com', 'password').subscribe(() => {
          const currentUser = service.getCurrentUser();
          expect(currentUser?.accountState).toBe(AccountState.ACTIVE);
          resolve();
        });
      });
    });

    it('should reject login for blocked accounts without updating auth state', () =>
      new Promise<void>(resolve => {
        httpMock.post.mockReturnValueOnce(of(mockTokenResponse));
        httpMock.get.mockReturnValueOnce(
          of({
            ...mockGatewayUserResponse,
            blocked: true,
          })
        );

        const initialState = service.getCurrentUser();

        service.login('blocked@example.com', 'password').subscribe({
          next: result => {
            expect(result.success).toBe(false);
            expect(service.getCurrentUser()).toEqual(initialState);
            resolve();
          },
          error: err => {
            expect(err.message).toContain('accountDisabled');
            expect(service.getCurrentUser()).toEqual(initialState);
            resolve();
          },
        });
      }));
  });

  describe('isAuthenticated observable', () => {
    it('should emit correct auth status based on state and token', async () => {
      // Test not authenticated
      // @ts-expect-error - private property access for testing
      service.authStateSubject.next({
        isAuthenticated: false,
        user: null,
        accessToken: null,
        refreshToken: null,
        expiresAt: null,
      });

      const isAuth1 = await new Promise<boolean>(resolve => {
        service.isAuthenticated().subscribe(isAuth => resolve(isAuth));
      });
      expect(isAuth1).toBe(false);

      // Test authenticated with token
      // @ts-expect-error - private property access for testing
      service.authStateSubject.next({
        isAuthenticated: true,
        user: mockUser,
        accessToken: 'valid-token',
        refreshToken: null,
        expiresAt: Date.now() + 3600000,
      });

      const isAuth2 = await new Promise<boolean>(resolve => {
        service.isAuthenticated().subscribe(isAuth => resolve(isAuth));
      });
      expect(isAuth2).toBe(true);

      // Test authenticated flag but no token
      // @ts-expect-error - private property access for testing
      service.authStateSubject.next({
        isAuthenticated: true,
        user: mockUser,
        accessToken: null, // No token
        refreshToken: null,
        expiresAt: null,
      });

      const isAuth3 = await new Promise<boolean>(resolve => {
        service.isAuthenticated().subscribe(isAuth => resolve(isAuth));
      });
      expect(isAuth3).toBe(false);
    });
  });
});
