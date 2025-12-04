import { TestBed } from '@angular/core/testing';
import { of, BehaviorSubject, throwError } from 'rxjs';
import { UnifiedAuthService } from './unified-auth.service';
import { TidepoolAuthService, AuthState as TidepoolAuthState } from './tidepool-auth.service';
import {
  LocalAuthService,
  LocalAuthState,
  LoginRequest,
  LoginResult,
  RegisterRequest,
} from './local-auth.service';

describe('UnifiedAuthService', () => {
  let service: UnifiedAuthService;
  let tidepoolAuthSpy: jasmine.SpyObj<TidepoolAuthService>;
  let localAuthSpy: jasmine.SpyObj<LocalAuthService>;

  // Mock auth states
  let mockTidepoolAuthState: BehaviorSubject<TidepoolAuthState>;
  let mockLocalAuthState: BehaviorSubject<LocalAuthState>;

  beforeEach(() => {
    // Create spy objects
    tidepoolAuthSpy = jasmine.createSpyObj('TidepoolAuthService', [
      'login',
      'logout',
      'getAccessToken',
      'refreshAccessToken',
      'isTokenExpired',
    ]);

    localAuthSpy = jasmine.createSpyObj('LocalAuthService', [
      'login',
      'register',
      'logout',
      'getAccessToken',
      'isAuthenticated',
      'refreshAccessToken',
      'updatePreferences',
    ]);

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
      ],
    });

    service = TestBed.inject(UnifiedAuthService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Authentication State Management', () => {
    it('should initialize with unauthenticated state', done => {
      service.authState$.subscribe(state => {
        expect(state.isAuthenticated).toBe(false);
        expect(state.provider).toBeNull();
        expect(state.user).toBeNull();
        done();
      });
    });

    it('should update state when local auth succeeds', done => {
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
          done();
        }
      });
    });

    it('should update state when Tidepool auth succeeds', done => {
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
          done();
        }
      });
    });

    it('should handle both providers authenticated', done => {
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
          done();
        }
      });
    });
  });

  describe('Login Methods', () => {
    it('should login with local backend', done => {
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

      localAuthSpy.login.and.returnValue(of(mockLoginResult));
      mockLocalAuthState.next(mockAuthState);

      service.loginLocal(loginRequest).subscribe(state => {
        expect(state.isAuthenticated).toBe(true);
        expect(state.provider).toBe('local');
        expect(localAuthSpy.login).toHaveBeenCalledWith(
          loginRequest.email || loginRequest.dni || '',
          loginRequest.password,
          loginRequest.rememberMe || false
        );
        done();
      });
    });

    it('should handle local login failure', done => {
      const loginRequest: LoginRequest = {
        email: 'test@example.com',
        password: 'wrong-password',
      };

      const mockLoginResult: LoginResult = {
        success: false,
        error: 'Invalid credentials',
      };
      localAuthSpy.login.and.returnValue(of(mockLoginResult));

      service.loginLocal(loginRequest).subscribe(state => {
        expect(state.isAuthenticated).toBe(false);
        done();
      });
    });

    it('should login with Tidepool', () => {
      tidepoolAuthSpy.login.and.returnValue(Promise.resolve());

      service.loginTidepool();

      expect(tidepoolAuthSpy.login).toHaveBeenCalled();
    });
  });

  describe('Register Method', () => {
    it('should register new user with local backend', done => {
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

      localAuthSpy.register.and.returnValue(of(mockLoginResult));
      mockLocalAuthState.next(mockAuthState);

      service.register(registerRequest).subscribe(state => {
        expect(state.isAuthenticated).toBe(true);
        expect(state.user?.firstName).toBe('Jane');
        expect(localAuthSpy.register).toHaveBeenCalledWith(registerRequest);
        done();
      });
    });
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

      localAuthSpy.logout.and.returnValue(Promise.resolve());
      tidepoolAuthSpy.logout.and.returnValue(Promise.resolve());

      await service.logout();

      expect(localAuthSpy.logout).toHaveBeenCalled();
      expect(tidepoolAuthSpy.logout).toHaveBeenCalled();
    });

    it('should logout from specific provider', async () => {
      localAuthSpy.logout.and.returnValue(Promise.resolve());
      tidepoolAuthSpy.logout.and.returnValue(Promise.resolve());

      await service.logoutFrom('local');
      expect(localAuthSpy.logout).toHaveBeenCalled();
      expect(tidepoolAuthSpy.logout).not.toHaveBeenCalled();

      await service.logoutFrom('tidepool');
      expect(tidepoolAuthSpy.logout).toHaveBeenCalled();
    });
  });

  describe('Token Management', () => {
    it('should get access token from local auth when available', done => {
      mockLocalAuthState.next({
        isAuthenticated: true,
        user: null,
        accessToken: 'local-access-token',
        refreshToken: 'local-refresh',
        expiresAt: Date.now() + 3600000,
      });

      service.getAccessToken().subscribe(token => {
        expect(token).toBe('local-access-token');
        done();
      });
    });

    it('should fallback to Tidepool token when local not available', done => {
      mockTidepoolAuthState.next({
        isAuthenticated: true,
        isLoading: false,
        error: null,
        userId: 'user',
        email: 'test@example.com',
      });

      tidepoolAuthSpy.getAccessToken.and.returnValue(Promise.resolve('tidepool-access-token'));

      service.getAccessToken().subscribe(token => {
        expect(token).toBe('tidepool-access-token');
        done();
      });
    });

    it('should return null when not authenticated', done => {
      service.getAccessToken().subscribe(token => {
        expect(token).toBeNull();
        done();
      });
    });

    it('should get provider-specific token', done => {
      localAuthSpy.getAccessToken.and.returnValue(Promise.resolve('local-token'));
      tidepoolAuthSpy.getAccessToken.and.returnValue(Promise.resolve('tidepool-token'));

      service.getProviderToken('local').subscribe(token => {
        expect(token).toBe('local-token');
        expect(localAuthSpy.getAccessToken).toHaveBeenCalled();
      });

      service.getProviderToken('tidepool').subscribe(token => {
        expect(token).toBe('tidepool-token');
        expect(tidepoolAuthSpy.getAccessToken).toHaveBeenCalled();
        done();
      });
    });
  });

  describe('Token Refresh', () => {
    it('should refresh tokens for active providers', done => {
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

      localAuthSpy.refreshAccessToken.and.returnValue(of(newLocalState));
      tidepoolAuthSpy.refreshAccessToken.and.returnValue(Promise.resolve('new-tidepool-token'));

      service.refreshTokens().subscribe(() => {
        expect(localAuthSpy.refreshAccessToken).toHaveBeenCalled();
        expect(tidepoolAuthSpy.refreshAccessToken).toHaveBeenCalled();
        done();
      });
    });

    it('should handle refresh failures gracefully', done => {
      mockLocalAuthState.next({
        isAuthenticated: true,
        user: null,
        accessToken: 'local-token',
        refreshToken: 'local-refresh-token',
        expiresAt: Date.now() + 3600000,
      });

      localAuthSpy.refreshAccessToken.and.returnValue(
        throwError(() => new Error('Refresh failed'))
      );

      service.refreshTokens().subscribe(state => {
        // Should not throw, just log warning
        expect(state).toBeDefined();
        done();
      });
    });
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

      tidepoolAuthSpy.login.and.returnValue(Promise.resolve());

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

      tidepoolAuthSpy.logout.and.returnValue(Promise.resolve());

      await service.unlinkTidepoolAccount();

      expect(tidepoolAuthSpy.logout).toHaveBeenCalled();
    });
  });

  describe('User Preferences', () => {
    it('should update preferences for local user', done => {
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

      localAuthSpy.updatePreferences.and.returnValue(
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
        done();
      });
    });
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
