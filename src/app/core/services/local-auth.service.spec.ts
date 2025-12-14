// Initialize TestBed environment for Vitest
import '../../../test-setup';

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

// Mock Preferences - already mocked in setup-jest.ts but we need to control it per test
jest.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: jest.fn(),
    set: jest.fn(),
    remove: jest.fn(),
  },
}));

describe('LocalAuthService', () => {
  let service: LocalAuthService;
  let platformDetector: jest.Mocked<PlatformDetectorService>;
  let logger: jest.Mocked<LoggerService>;
  let mockData: jest.Mocked<MockDataService>;
  let mockAdapter: jest.Mocked<MockAdapterService>;
  let httpMock: jest.Mocked<HttpClient>;

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
    jest.clearAllMocks();

    // Default Preferences mock - no stored data
    (Preferences.get as jest.Mock).mockResolvedValue({ value: null });
    (Preferences.set as jest.Mock).mockResolvedValue(undefined);
    (Preferences.remove as jest.Mock).mockResolvedValue(undefined);

    // Create mock services
    platformDetector = {
      getApiBaseUrl: jest.fn().mockReturnValue('http://test-api.example.com'),
      isNativePlatform: jest.fn().mockReturnValue(false),
      isWebPlatform: jest.fn().mockReturnValue(true),
    } as unknown as jest.Mocked<PlatformDetectorService>;

    logger = {
      info: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as unknown as jest.Mocked<LoggerService>;

    mockData = {} as jest.Mocked<MockDataService>;

    mockAdapter = {
      isServiceMockEnabled: jest.fn().mockReturnValue(false),
    } as unknown as jest.Mocked<MockAdapterService>;

    httpMock = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<HttpClient>;

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        LocalAuthService,
        { provide: PlatformDetectorService, useValue: platformDetector },
        { provide: LoggerService, useValue: logger },
        { provide: MockDataService, useValue: mockData },
        { provide: MockAdapterService, useValue: mockAdapter },
        { provide: HttpClient, useValue: httpMock },
      ],
    });

    service = TestBed.inject(LocalAuthService);

    // Wait for initialization to complete
    await (service as any).initializationPromise;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should create the service', () => {
      expect(service).toBeTruthy();
    });

    it('should start with unauthenticated state when no stored data', async () => {
      const state = await new Promise<LocalAuthState>(resolve => {
        service.authState$.subscribe(s => resolve(s));
      });

      expect(state.isAuthenticated).toBe(false);
      expect(state.user).toBeNull();
      expect(state.accessToken).toBeNull();
    });

    it('should restore auth state from storage when valid token exists', async () => {
      // Setup stored data
      const storedUser = JSON.stringify(mockUser);
      const futureExpiry = (Date.now() + 3600000).toString(); // 1 hour from now

      (Preferences.get as jest.Mock).mockImplementation(({ key }: { key: string }) => {
        switch (key) {
          case 'local_access_token':
            return Promise.resolve({ value: 'stored-token' });
          case 'local_refresh_token':
            return Promise.resolve({ value: 'stored-refresh' });
          case 'local_user':
            return Promise.resolve({ value: storedUser });
          case 'local_token_expires':
            return Promise.resolve({ value: futureExpiry });
          default:
            return Promise.resolve({ value: null });
        }
      });

      // Create new service instance to trigger initialization with stored data
      const newService = new LocalAuthService(
        httpMock,
        platformDetector,
        logger,
        mockData,
        mockAdapter
      );

      await (newService as any).initializationPromise;

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

      it('should return demo user in mock mode', async () => {
        const result = await firstValueFrom(service.login('any@email.com', 'anypassword'));
        expect(result.success).toBe(true);
        expect(result.user).toBeDefined();
        expect(result.user?.email).toBe('demo@diabetactic.com');
        expect(result.user?.firstName).toBe('Sofia');
      });

      it('should store demo tokens when rememberMe is true', async () => {
        const result = await firstValueFrom(service.login('any@email.com', 'anypassword', true));
        expect(result.success).toBe(true);
        expect(Preferences.set).toHaveBeenCalled();
      });
    });

    describe('real backend mode', () => {
      beforeEach(() => {
        mockAdapter.isServiceMockEnabled.mockReturnValue(false);
      });

      it('should authenticate against backend successfully', async () => {
        // Mock token endpoint
        httpMock.post.mockReturnValueOnce(of(mockTokenResponse));

        // Mock user profile endpoint
        httpMock.get.mockReturnValueOnce(of(mockGatewayUserResponse));

        const result = await firstValueFrom(service.login('test@example.com', 'password123'));
        expect(result.success).toBe(true);
        expect(result.user).toBeDefined();
        expect(httpMock.post).toHaveBeenCalledWith(
          expect.stringContaining('/token'),
          expect.any(String),
          expect.any(Object)
        );
      });

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

      it('should return error when account is pending', () => new Promise<void>(resolve => {
        httpMock.post.mockReturnValueOnce(of(mockTokenResponse));
        httpMock.get.mockReturnValueOnce(
          of({
            ...mockGatewayUserResponse,
            state: 'pending',
          })
        );

        service.login('pending@example.com', 'password').subscribe({
          next: result => {
            expect(result.success).toBe(false);
            resolve();
          },
          error: err => {
            // Error might bubble up instead of being caught
            expect(err.message).toContain('accountPending');
            resolve();
          },
        }); // eslint-disable-line
      });

      it('should return error when account is disabled', () => new Promise<void>(resolve => {
        httpMock.post.mockReturnValueOnce(of(mockTokenResponse));
        httpMock.get.mockReturnValueOnce(
          of({
            ...mockGatewayUserResponse,
            state: 'disabled',
          })
        );

        service.login('disabled@example.com', 'password').subscribe({
          next: result => {
            expect(result.success).toBe(false);
            resolve();
          },
          error: err => {
            // Error might bubble up instead of being caught
            expect(err.message).toContain('accountDisabled');
            resolve();
          },
        });
      });

      it('should update authState$ on successful login', () => new Promise<void>(resolve => {
        httpMock.post.mockReturnValueOnce(of(mockTokenResponse));
        httpMock.get.mockReturnValueOnce(of(mockGatewayUserResponse));

        service.login('test@example.com', 'password123').subscribe(() => {
          service.authState$.subscribe(state => {
            expect(state.isAuthenticated).toBe(true);
            expect(state.accessToken).toBe('test-access-token');
            resolve();
          });
        });
      });

      it('should store tokens when login succeeds', () => new Promise<void>(resolve => {
        httpMock.post.mockReturnValueOnce(of(mockTokenResponse));
        httpMock.get.mockReturnValueOnce(of(mockGatewayUserResponse));

        service.login('test@example.com', 'password123', true).subscribe(() => {
          expect(Preferences.set).toHaveBeenCalledWith(
            expect.objectContaining({
              key: 'local_access_token',
              value: 'test-access-token',
            })
          );
          resolve();
        });
      });
    });
  });

  describe('logout', () => {
    beforeEach(async () => {
      // Setup authenticated state
      (service as any).authStateSubject.next({
        isAuthenticated: true,
        user: mockUser,
        accessToken: 'test-token',
        refreshToken: 'test-refresh',
        expiresAt: Date.now() + 3600000,
      });
    });

    it('should clear auth state', async () => {
      await service.logout();

      const state = await new Promise<LocalAuthState>(resolve => {
        service.authState$.subscribe(s => resolve(s));
      });

      expect(state.isAuthenticated).toBe(false);
      expect(state.user).toBeNull();
      expect(state.accessToken).toBeNull();
    });

    it('should remove tokens from storage', async () => {
      await service.logout();

      expect(Preferences.remove).toHaveBeenCalledWith({ key: 'local_access_token' });
      expect(Preferences.remove).toHaveBeenCalledWith({ key: 'local_refresh_token' });
      expect(Preferences.remove).toHaveBeenCalledWith({ key: 'local_user' });
      expect(Preferences.remove).toHaveBeenCalledWith({ key: 'local_token_expires' });
    });

    it('should log logout event', async () => {
      await service.logout();

      expect(logger.info).toHaveBeenCalledWith('Auth', 'Logout initiated', expect.any(Object));
      expect(logger.info).toHaveBeenCalledWith(
        'Auth',
        'Logout completed - all data cleared',
        expect.any(Object)
      );
    });

    it('should clear IndexedDB to remove PHI data', async () => {
      // Mock the database service import and clearAllData method
      const mockClearAllData = jest.fn().mockResolvedValue(undefined);
      jest.doMock('./database.service', () => ({
        db: {
          clearAllData: mockClearAllData,
        },
      }));

      await service.logout();

      // Verify clearAllData was called
      expect(mockClearAllData).toHaveBeenCalled();
    });
  });

  describe('refreshAccessToken', () => {
    it('should refresh token when refresh token exists', () => new Promise<void>(resolve => {
      (Preferences.get as jest.Mock).mockResolvedValueOnce({ value: 'stored-refresh-token' });

      httpMock.post.mockReturnValueOnce(
        of({
          access_token: 'new-access-token',
          token_type: 'bearer',
        })
      );

      // Setup existing user in state
      (service as any).authStateSubject.next({
        isAuthenticated: true,
        user: mockUser,
        accessToken: 'old-token',
        refreshToken: 'stored-refresh-token',
        expiresAt: Date.now() - 1000, // Expired
      });

      service.refreshAccessToken().subscribe(state => {
        expect(state.accessToken).toBe('new-access-token');
        expect(state.isAuthenticated).toBe(true);
        resolve();
      });
    });

    it('should throw error when no refresh token available', () => new Promise<void>(resolve => {
      (Preferences.get as jest.Mock).mockResolvedValueOnce({ value: null });

      service.refreshAccessToken().subscribe({
        error: error => {
          expect(error.message).toContain('No refresh token');
          resolve();
        },
      });
    });

    it('should throw error when refresh fails', () => new Promise<void>(resolve => {
      (Preferences.get as jest.Mock).mockResolvedValueOnce({ value: 'stored-refresh-token' });

      httpMock.post.mockReturnValueOnce(
        throwError(() => ({
          status: 401,
          error: { detail: 'Invalid refresh token' },
        }))
      );

      service.refreshAccessToken().subscribe({
        error: error => {
          expect(error).toBeDefined();
          resolve();
        },
      });
    });
  });

  describe('getAccessToken', () => {
    it('should return access token when authenticated', async () => {
      (service as any).authStateSubject.next({
        isAuthenticated: true,
        user: mockUser,
        accessToken: 'current-token',
        refreshToken: null,
        expiresAt: Date.now() + 3600000,
      });

      const token = await service.getAccessToken();
      expect(token).toBe('current-token');
    });

    it('should return null when not authenticated', async () => {
      (service as any).authStateSubject.next({
        isAuthenticated: false,
        user: null,
        accessToken: null,
        refreshToken: null,
        expiresAt: null,
      });

      const token = await service.getAccessToken();
      expect(token).toBeNull();
    });
  });

  describe('authState$ observable', () => {
    it('should emit state changes', () => new Promise<void>(resolve => {
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
      (service as any).authStateSubject.next({
        isAuthenticated: true,
        user: mockUser,
        accessToken: 'test-token',
        refreshToken: null,
        expiresAt: null,
      });
    });
  });

  describe('error handling', () => {
    it('should handle network errors gracefully', () => new Promise<void>(resolve => {
      mockAdapter.isServiceMockEnabled.mockReturnValue(false);

      httpMock.post.mockReturnValueOnce(throwError(() => new Error('Network error')));

      service.login('test@example.com', 'password').subscribe(result => {
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
        resolve();
      });
    });

    it('should handle malformed responses', () => new Promise<void>(resolve => {
      mockAdapter.isServiceMockEnabled.mockReturnValue(false);

      httpMock.post.mockReturnValueOnce(of({})); // No access_token

      service.login('test@example.com', 'password').subscribe(result => {
        expect(result.success).toBe(false);
        resolve();
      });
    });
  });

  describe('extractErrorMessage (via login error handling)', () => {
    beforeEach(() => {
      mockAdapter.isServiceMockEnabled.mockReturnValue(false);
    });

    it('should return timeout message for timeout errors', () => new Promise<void>(resolve => {
      httpMock.post.mockReturnValueOnce(
        throwError(() => ({
          isTimeout: true,
          status: 0,
          message: 'Request timed out',
        }))
      );

      service.login('test@example.com', 'password').subscribe(result => {
        expect(result.success).toBe(false);
        expect(result.error).toContain('tardó demasiado');
        resolve();
      });
    });

    it('should return specific message for 401 status', () => new Promise<void>(resolve => {
      httpMock.post.mockReturnValueOnce(
        throwError(() => ({
          status: 401,
        }))
      );

      service.login('test@example.com', 'wrongpassword').subscribe(result => {
        expect(result.success).toBe(false);
        expect(result.error).toContain('Credenciales incorrectas');
        resolve();
      });
    });

    it('should return specific message for 403 status', () => new Promise<void>(resolve => {
      httpMock.post.mockReturnValueOnce(
        throwError(() => ({
          status: 403,
        }))
      );

      service.login('blocked@example.com', 'password').subscribe(result => {
        expect(result.success).toBe(false);
        // 403 during login is treated as invalid credentials (user-friendly)
        expect(result.error).toContain('Credenciales incorrectas');
        resolve();
      });
    });

    it('should return specific message for 409 conflict', () => new Promise<void>(resolve => {
      httpMock.post.mockReturnValueOnce(
        throwError(() => ({
          status: 409,
        }))
      );

      service.login('existing@example.com', 'password').subscribe(result => {
        expect(result.success).toBe(false);
        expect(result.error).toContain('ya existe');
        resolve();
      });
    });

    it('should return specific message for 422 validation error', () => new Promise<void>(resolve => {
      httpMock.post.mockReturnValueOnce(
        throwError(() => ({
          status: 422,
        }))
      );

      service.login('invalid', 'x').subscribe(result => {
        expect(result.success).toBe(false);
        expect(result.error).toContain('Datos inválidos');
        resolve();
      });
    });

    it('should return specific message for 500 server error', () => new Promise<void>(resolve => {
      httpMock.post.mockReturnValueOnce(
        throwError(() => ({
          status: 500,
        }))
      );

      service.login('test@example.com', 'password').subscribe(result => {
        expect(result.success).toBe(false);
        expect(result.error).toContain('Error del servidor');
        resolve();
      });
    });

    it('should return connection error message for status 0', () => new Promise<void>(resolve => {
      httpMock.post.mockReturnValueOnce(
        throwError(() => ({
          status: 0,
        }))
      );

      service.login('test@example.com', 'password').subscribe(result => {
        expect(result.success).toBe(false);
        expect(result.error).toContain('Error de conexión');
        resolve();
      });
    });

    it('should handle nested error.detail array', () => new Promise<void>(resolve => {
      httpMock.post.mockReturnValueOnce(
        throwError(() => ({
          status: 422,
          error: {
            detail: [
              { msg: 'Field required', loc: ['body', 'username'] },
              { msg: 'Invalid format', loc: ['body', 'email'] },
            ],
          },
        }))
      );

      service.login('', '').subscribe(result => {
        expect(result.success).toBe(false);
        expect(result.error).toContain('Field required');
        expect(result.error).toContain('Invalid format');
        resolve();
      });
    });

    it('should handle nested error.detail string', () => new Promise<void>(resolve => {
      httpMock.post.mockReturnValueOnce(
        throwError(() => ({
          status: 400,
          error: {
            detail: 'Invalid credentials provided',
          },
        }))
      );

      service.login('test@example.com', 'wrong').subscribe(result => {
        expect(result.success).toBe(false);
        expect(result.error).toBe('Invalid credentials provided');
        resolve();
      });
    });

    it('should handle null/undefined error gracefully', () => new Promise<void>(resolve => {
      httpMock.post.mockReturnValueOnce(throwError(() => null));

      service.login('test@example.com', 'password').subscribe(result => {
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
        resolve();
      });
    });

    it('should handle string error', () => new Promise<void>(resolve => {
      httpMock.post.mockReturnValueOnce(throwError(() => 'Simple error message'));

      service.login('test@example.com', 'password').subscribe(result => {
        expect(result.success).toBe(false);
        expect(result.error).toBe('Simple error message');
        resolve();
      });
    });
  });

  describe('account state transitions', () => {
    beforeEach(() => {
      mockAdapter.isServiceMockEnabled.mockReturnValue(false);
    });

    it('should set user accountState from backend response', () => new Promise<void>(resolve => {
      httpMock.post.mockReturnValueOnce(of(mockTokenResponse));
      httpMock.get.mockReturnValueOnce(
        of({
          ...mockGatewayUserResponse,
          state: 'active',
        })
      );

      service.login('test@example.com', 'password').subscribe(() => {
        const currentUser = service.getCurrentUser();
        expect(currentUser?.accountState).toBe(AccountState.ACTIVE);
        resolve();
      });
    });

    it('should default to ACTIVE when backend returns no state', () => new Promise<void>(resolve => {
      httpMock.post.mockReturnValueOnce(of(mockTokenResponse));
      httpMock.get.mockReturnValueOnce(
        of({
          ...mockGatewayUserResponse,
          state: undefined,
        })
      );

      service.login('test@example.com', 'password').subscribe(() => {
        const currentUser = service.getCurrentUser();
        expect(currentUser?.accountState).toBe(AccountState.ACTIVE);
        resolve();
      });
    });

    it('should reject login for pending accounts with specific error', () => new Promise<void>(resolve => {
      httpMock.post.mockReturnValueOnce(of(mockTokenResponse));
      httpMock.get.mockReturnValueOnce(
        of({
          ...mockGatewayUserResponse,
          state: 'pending',
        })
      );

      service.login('pending@example.com', 'password').subscribe({
        next: result => {
          expect(result.success).toBe(false);
          resolve();
        },
        error: err => {
          expect(err.message).toContain('accountPending');
          resolve();
        },
      });
    });

    it('should reject login for disabled accounts with specific error', () => new Promise<void>(resolve => {
      httpMock.post.mockReturnValueOnce(of(mockTokenResponse));
      httpMock.get.mockReturnValueOnce(
        of({
          ...mockGatewayUserResponse,
          state: 'disabled',
        })
      );

      service.login('disabled@example.com', 'password').subscribe({
        next: result => {
          expect(result.success).toBe(false);
          resolve();
        },
        error: err => {
          expect(err.message).toContain('accountDisabled');
          resolve();
        },
      });
    });

    it('should NOT update auth state for pending accounts', () => new Promise<void>(resolve => {
      httpMock.post.mockReturnValueOnce(of(mockTokenResponse));
      httpMock.get.mockReturnValueOnce(
        of({
          ...mockGatewayUserResponse,
          state: 'pending',
        })
      );

      const initialState = service.getCurrentUser();

      service.login('pending@example.com', 'password').subscribe({
        complete: () => {
          // Auth state should not have changed
          expect(service.getCurrentUser()).toEqual(initialState);
          resolve();
        },
        error: () => {
          // Auth state should not have changed on error
          expect(service.getCurrentUser()).toEqual(initialState);
          resolve();
        },
      });
    });
  });

  describe('isAuthenticated observable', () => {
    it('should emit false when not authenticated', () => new Promise<void>(resolve => {
      (service as any).authStateSubject.next({
        isAuthenticated: false,
        user: null,
        accessToken: null,
        refreshToken: null,
        expiresAt: null,
      });

      service.isAuthenticated().subscribe(isAuth => {
        expect(isAuth).toBe(false);
        resolve();
      });
    });

    it('should emit true when authenticated with token', () => new Promise<void>(resolve => {
      (service as any).authStateSubject.next({
        isAuthenticated: true,
        user: mockUser,
        accessToken: 'valid-token',
        refreshToken: null,
        expiresAt: Date.now() + 3600000,
      });

      service.isAuthenticated().subscribe(isAuth => {
        expect(isAuth).toBe(true);
        resolve();
      });
    });

    it('should emit false when isAuthenticated is true but no token', () => new Promise<void>(resolve => {
      (service as any).authStateSubject.next({
        isAuthenticated: true,
        user: mockUser,
        accessToken: null, // No token
        refreshToken: null,
        expiresAt: null,
      });

      service.isAuthenticated().subscribe(isAuth => {
        expect(isAuth).toBe(false);
        resolve();
      });
    });
  });
});
