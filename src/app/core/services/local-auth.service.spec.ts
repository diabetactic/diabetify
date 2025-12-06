import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';
import { Preferences } from '@capacitor/preferences';

import { LocalAuthService, LocalAuthState, LocalUser, AccountState } from './local-auth.service';
import { PlatformDetectorService } from './platform-detector.service';
import { LoggerService } from './logger.service';
import { MockDataService } from './mock-data.service';
import { MockAdapterService } from './mock-adapter.service';
import { CapacitorHttpService } from './capacitor-http.service';

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
  let capacitorHttp: jest.Mocked<CapacitorHttpService>;

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

    capacitorHttp = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<CapacitorHttpService>;

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        LocalAuthService,
        { provide: PlatformDetectorService, useValue: platformDetector },
        { provide: LoggerService, useValue: logger },
        { provide: MockDataService, useValue: mockData },
        { provide: MockAdapterService, useValue: mockAdapter },
        { provide: CapacitorHttpService, useValue: capacitorHttp },
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
        TestBed.inject(HttpClientTestingModule as any),
        platformDetector,
        logger,
        mockData,
        mockAdapter,
        capacitorHttp
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

      it('should return demo user in mock mode', done => {
        service.login('any@email.com', 'anypassword').subscribe(result => {
          expect(result.success).toBe(true);
          expect(result.user).toBeDefined();
          expect(result.user?.email).toBe('demo@diabetactic.com');
          expect(result.user?.firstName).toBe('Sofia');
          done();
        });
      });

      it('should store demo tokens when rememberMe is true', done => {
        service.login('any@email.com', 'anypassword', true).subscribe(result => {
          expect(result.success).toBe(true);
          expect(Preferences.set).toHaveBeenCalled();
          done();
        });
      });
    });

    describe('real backend mode', () => {
      beforeEach(() => {
        mockAdapter.isServiceMockEnabled.mockReturnValue(false);
      });

      it('should authenticate against backend successfully', done => {
        // Mock token endpoint
        capacitorHttp.post.mockReturnValueOnce(of(mockTokenResponse));

        // Mock user profile endpoint
        capacitorHttp.get.mockReturnValueOnce(of(mockGatewayUserResponse));

        service.login('test@example.com', 'password123').subscribe(result => {
          expect(result.success).toBe(true);
          expect(result.user).toBeDefined();
          expect(capacitorHttp.post).toHaveBeenCalledWith(
            expect.stringContaining('/token'),
            expect.any(String),
            expect.any(Object)
          );
          done();
        });
      });

      it('should return error when authentication fails', done => {
        capacitorHttp.post.mockReturnValueOnce(
          throwError(() => ({
            status: 401,
            error: { detail: 'Invalid credentials' },
          }))
        );

        service.login('wrong@example.com', 'wrongpassword').subscribe(result => {
          expect(result.success).toBe(false);
          expect(result.error).toBeDefined();
          done();
        });
      });

      it('should return error when account is pending', done => {
        capacitorHttp.post.mockReturnValueOnce(of(mockTokenResponse));
        capacitorHttp.get.mockReturnValueOnce(
          of({
            ...mockGatewayUserResponse,
            state: 'pending',
          })
        );

        service.login('pending@example.com', 'password').subscribe({
          next: result => {
            expect(result.success).toBe(false);
            done();
          },
          error: err => {
            // Error might bubble up instead of being caught
            expect(err.message).toContain('accountPending');
            done();
          },
        });
      });

      it('should return error when account is disabled', done => {
        capacitorHttp.post.mockReturnValueOnce(of(mockTokenResponse));
        capacitorHttp.get.mockReturnValueOnce(
          of({
            ...mockGatewayUserResponse,
            state: 'disabled',
          })
        );

        service.login('disabled@example.com', 'password').subscribe({
          next: result => {
            expect(result.success).toBe(false);
            done();
          },
          error: err => {
            // Error might bubble up instead of being caught
            expect(err.message).toContain('accountDisabled');
            done();
          },
        });
      });

      it('should update authState$ on successful login', done => {
        capacitorHttp.post.mockReturnValueOnce(of(mockTokenResponse));
        capacitorHttp.get.mockReturnValueOnce(of(mockGatewayUserResponse));

        service.login('test@example.com', 'password123').subscribe(() => {
          service.authState$.subscribe(state => {
            expect(state.isAuthenticated).toBe(true);
            expect(state.accessToken).toBe('test-access-token');
            done();
          });
        });
      });

      it('should store tokens when login succeeds', done => {
        capacitorHttp.post.mockReturnValueOnce(of(mockTokenResponse));
        capacitorHttp.get.mockReturnValueOnce(of(mockGatewayUserResponse));

        service.login('test@example.com', 'password123', true).subscribe(() => {
          expect(Preferences.set).toHaveBeenCalledWith(
            expect.objectContaining({
              key: 'local_access_token',
              value: 'test-access-token',
            })
          );
          done();
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
    it('should refresh token when refresh token exists', done => {
      (Preferences.get as jest.Mock).mockResolvedValueOnce({ value: 'stored-refresh-token' });

      capacitorHttp.post.mockReturnValueOnce(
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
        done();
      });
    });

    it('should throw error when no refresh token available', done => {
      (Preferences.get as jest.Mock).mockResolvedValueOnce({ value: null });

      service.refreshAccessToken().subscribe({
        error: error => {
          expect(error.message).toContain('No refresh token');
          done();
        },
      });
    });

    it('should throw error when refresh fails', done => {
      (Preferences.get as jest.Mock).mockResolvedValueOnce({ value: 'stored-refresh-token' });

      capacitorHttp.post.mockReturnValueOnce(
        throwError(() => ({
          status: 401,
          error: { detail: 'Invalid refresh token' },
        }))
      );

      service.refreshAccessToken().subscribe({
        error: error => {
          expect(error).toBeDefined();
          done();
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
    it('should emit state changes', done => {
      const states: LocalAuthState[] = [];

      const sub = service.authState$.subscribe(state => {
        states.push(state);
        if (states.length === 2) {
          expect(states[0].isAuthenticated).toBe(false);
          expect(states[1].isAuthenticated).toBe(true);
          sub.unsubscribe();
          done();
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
    it('should handle network errors gracefully', done => {
      mockAdapter.isServiceMockEnabled.mockReturnValue(false);

      capacitorHttp.post.mockReturnValueOnce(throwError(() => new Error('Network error')));

      service.login('test@example.com', 'password').subscribe(result => {
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
        done();
      });
    });

    it('should handle malformed responses', done => {
      mockAdapter.isServiceMockEnabled.mockReturnValue(false);

      capacitorHttp.post.mockReturnValueOnce(of({})); // No access_token

      service.login('test@example.com', 'password').subscribe(result => {
        expect(result.success).toBe(false);
        done();
      });
    });
  });

  describe('extractErrorMessage (via login error handling)', () => {
    beforeEach(() => {
      mockAdapter.isServiceMockEnabled.mockReturnValue(false);
    });

    it('should return timeout message for timeout errors', done => {
      capacitorHttp.post.mockReturnValueOnce(
        throwError(() => ({
          isTimeout: true,
          status: 0,
          message: 'Request timed out',
        }))
      );

      service.login('test@example.com', 'password').subscribe(result => {
        expect(result.success).toBe(false);
        expect(result.error).toContain('tardó demasiado');
        done();
      });
    });

    it('should return specific message for 401 status', done => {
      capacitorHttp.post.mockReturnValueOnce(
        throwError(() => ({
          status: 401,
        }))
      );

      service.login('test@example.com', 'wrongpassword').subscribe(result => {
        expect(result.success).toBe(false);
        expect(result.error).toContain('Credenciales incorrectas');
        done();
      });
    });

    it('should return specific message for 403 status', done => {
      capacitorHttp.post.mockReturnValueOnce(
        throwError(() => ({
          status: 403,
        }))
      );

      service.login('blocked@example.com', 'password').subscribe(result => {
        expect(result.success).toBe(false);
        // 403 during login is treated as invalid credentials (user-friendly)
        expect(result.error).toContain('Credenciales incorrectas');
        done();
      });
    });

    it('should return specific message for 409 conflict', done => {
      capacitorHttp.post.mockReturnValueOnce(
        throwError(() => ({
          status: 409,
        }))
      );

      service.login('existing@example.com', 'password').subscribe(result => {
        expect(result.success).toBe(false);
        expect(result.error).toContain('ya existe');
        done();
      });
    });

    it('should return specific message for 422 validation error', done => {
      capacitorHttp.post.mockReturnValueOnce(
        throwError(() => ({
          status: 422,
        }))
      );

      service.login('invalid', 'x').subscribe(result => {
        expect(result.success).toBe(false);
        expect(result.error).toContain('Datos inválidos');
        done();
      });
    });

    it('should return specific message for 500 server error', done => {
      capacitorHttp.post.mockReturnValueOnce(
        throwError(() => ({
          status: 500,
        }))
      );

      service.login('test@example.com', 'password').subscribe(result => {
        expect(result.success).toBe(false);
        expect(result.error).toContain('Error del servidor');
        done();
      });
    });

    it('should return connection error message for status 0', done => {
      capacitorHttp.post.mockReturnValueOnce(
        throwError(() => ({
          status: 0,
        }))
      );

      service.login('test@example.com', 'password').subscribe(result => {
        expect(result.success).toBe(false);
        expect(result.error).toContain('Error de conexión');
        done();
      });
    });

    it('should handle nested error.detail array', done => {
      capacitorHttp.post.mockReturnValueOnce(
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
        done();
      });
    });

    it('should handle nested error.detail string', done => {
      capacitorHttp.post.mockReturnValueOnce(
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
        done();
      });
    });

    it('should handle null/undefined error gracefully', done => {
      capacitorHttp.post.mockReturnValueOnce(throwError(() => null));

      service.login('test@example.com', 'password').subscribe(result => {
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
        done();
      });
    });

    it('should handle string error', done => {
      capacitorHttp.post.mockReturnValueOnce(throwError(() => 'Simple error message'));

      service.login('test@example.com', 'password').subscribe(result => {
        expect(result.success).toBe(false);
        expect(result.error).toBe('Simple error message');
        done();
      });
    });
  });

  describe('account state transitions', () => {
    beforeEach(() => {
      mockAdapter.isServiceMockEnabled.mockReturnValue(false);
    });

    it('should set user accountState from backend response', done => {
      capacitorHttp.post.mockReturnValueOnce(of(mockTokenResponse));
      capacitorHttp.get.mockReturnValueOnce(
        of({
          ...mockGatewayUserResponse,
          state: 'active',
        })
      );

      service.login('test@example.com', 'password').subscribe(() => {
        const currentUser = service.getCurrentUser();
        expect(currentUser?.accountState).toBe(AccountState.ACTIVE);
        done();
      });
    });

    it('should default to ACTIVE when backend returns no state', done => {
      capacitorHttp.post.mockReturnValueOnce(of(mockTokenResponse));
      capacitorHttp.get.mockReturnValueOnce(
        of({
          ...mockGatewayUserResponse,
          state: undefined,
        })
      );

      service.login('test@example.com', 'password').subscribe(() => {
        const currentUser = service.getCurrentUser();
        expect(currentUser?.accountState).toBe(AccountState.ACTIVE);
        done();
      });
    });

    it('should reject login for pending accounts with specific error', done => {
      capacitorHttp.post.mockReturnValueOnce(of(mockTokenResponse));
      capacitorHttp.get.mockReturnValueOnce(
        of({
          ...mockGatewayUserResponse,
          state: 'pending',
        })
      );

      service.login('pending@example.com', 'password').subscribe({
        next: result => {
          expect(result.success).toBe(false);
          done();
        },
        error: err => {
          expect(err.message).toContain('accountPending');
          done();
        },
      });
    });

    it('should reject login for disabled accounts with specific error', done => {
      capacitorHttp.post.mockReturnValueOnce(of(mockTokenResponse));
      capacitorHttp.get.mockReturnValueOnce(
        of({
          ...mockGatewayUserResponse,
          state: 'disabled',
        })
      );

      service.login('disabled@example.com', 'password').subscribe({
        next: result => {
          expect(result.success).toBe(false);
          done();
        },
        error: err => {
          expect(err.message).toContain('accountDisabled');
          done();
        },
      });
    });

    it('should NOT update auth state for pending accounts', done => {
      capacitorHttp.post.mockReturnValueOnce(of(mockTokenResponse));
      capacitorHttp.get.mockReturnValueOnce(
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
          done();
        },
        error: () => {
          // Auth state should not have changed on error
          expect(service.getCurrentUser()).toEqual(initialState);
          done();
        },
      });
    });
  });

  describe('isAuthenticated observable', () => {
    it('should emit false when not authenticated', done => {
      (service as any).authStateSubject.next({
        isAuthenticated: false,
        user: null,
        accessToken: null,
        refreshToken: null,
        expiresAt: null,
      });

      service.isAuthenticated().subscribe(isAuth => {
        expect(isAuth).toBe(false);
        done();
      });
    });

    it('should emit true when authenticated with token', done => {
      (service as any).authStateSubject.next({
        isAuthenticated: true,
        user: mockUser,
        accessToken: 'valid-token',
        refreshToken: null,
        expiresAt: Date.now() + 3600000,
      });

      service.isAuthenticated().subscribe(isAuth => {
        expect(isAuth).toBe(true);
        done();
      });
    });

    it('should emit false when isAuthenticated is true but no token', done => {
      (service as any).authStateSubject.next({
        isAuthenticated: true,
        user: mockUser,
        accessToken: null, // No token
        refreshToken: null,
        expiresAt: null,
      });

      service.isAuthenticated().subscribe(isAuth => {
        expect(isAuth).toBe(false);
        done();
      });
    });
  });
});
