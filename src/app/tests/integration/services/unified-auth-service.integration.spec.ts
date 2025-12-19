/**
 * Unified Auth Service Integration Tests
 *
 * Tests combined authentication across providers:
 * 1. CombineLatest both auth states
 * 2. Login local + Tidepool simultaneously
 * 3. Logout from both providers
 * 4. Link/unlink Tidepool account
 * 5. Token refresh from either provider
 * 6. getAccessToken priority (local > Tidepool)
 * 7. isAuthenticatedWith provider checking
 * 8. User merging (local + Tidepool data)
 * 9. Observables (authState$, isAuthenticated$, currentUser$)
 */

// Initialize TestBed environment for Vitest
import '../../../../test-setup';

import { TestBed } from '@angular/core/testing';
import { BehaviorSubject, of, throwError, firstValueFrom } from 'rxjs';
import { vi, type Mock } from 'vitest';
import {
  UnifiedAuthService,
  UnifiedAuthState,
  AuthProvider,
  UnifiedUser,
} from '@core/services/unified-auth.service';
import { LocalAuthService, LocalAuthState, LocalUser } from '@core/services/local-auth.service';
import {
  TidepoolAuthService,
  AuthState as TidepoolAuthState,
} from '@core/services/tidepool-auth.service';
import { LoggerService } from '@core/services/logger.service';
import { ApiGatewayService } from '@core/services/api-gateway.service';

describe('Unified Auth Service Integration Tests', () => {
  let unifiedAuthService: UnifiedAuthService;
  let mockLocalAuth: {
    authState$: BehaviorSubject<LocalAuthState>;
    login: Mock;
    logout: Mock;
    getAccessToken: Mock;
    refreshAccessToken: Mock;
    updatePreferences: Mock;
  };
  let mockTidepoolAuth: {
    authState: BehaviorSubject<TidepoolAuthState>;
    login: Mock;
    logout: Mock;
    getAccessToken: Mock;
    refreshAccessToken: Mock;
  };
  let mockLogger: {
    info: Mock;
    debug: Mock;
    warn: Mock;
    error: Mock;
  };
  let mockApiGateway: {
    clearCache: Mock;
  };

  const mockLocalUser: LocalUser = {
    id: '1000',
    email: 'local@example.com',
    firstName: 'Local',
    lastName: 'User',
    role: 'patient',
    phone: '+1234567890',
    dateOfBirth: '1990-01-01',
    diabetesType: '1',
    diagnosisDate: '2015-06-01',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    preferences: {
      glucoseUnit: 'mg/dL',
      targetRange: { low: 70, high: 180 },
      language: 'en',
      notifications: { appointments: true, readings: true, reminders: true },
      theme: 'light',
    },
  };

  const mockTidepoolUser = {
    userId: 'tidepool_user_123',
    email: 'tidepool@example.com',
  };

  beforeEach(() => {
    // Create LocalAuthService mock with BehaviorSubject
    mockLocalAuth = {
      authState$: new BehaviorSubject<LocalAuthState>({
        isAuthenticated: false,
        user: null,
        accessToken: null,
        refreshToken: null,
        expiresAt: null,
      }),
      login: vi.fn(),
      logout: vi.fn().mockResolvedValue(undefined),
      getAccessToken: vi.fn().mockResolvedValue(null),
      refreshAccessToken: vi.fn(),
      updatePreferences: vi.fn(),
    };

    // Create TidepoolAuthService mock with BehaviorSubject
    mockTidepoolAuth = {
      authState: new BehaviorSubject<TidepoolAuthState>({
        isAuthenticated: false,
        isLoading: false,
        error: null,
        userId: null,
        email: null,
      }),
      login: vi.fn().mockResolvedValue(undefined),
      logout: vi.fn().mockResolvedValue(undefined),
      getAccessToken: vi.fn().mockResolvedValue(null),
      refreshAccessToken: vi.fn().mockResolvedValue('refreshed_tidepool_token'),
    };

    // Create LoggerService mock
    mockLogger = {
      info: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    // Create ApiGatewayService mock
    mockApiGateway = {
      clearCache: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        UnifiedAuthService,
        { provide: LocalAuthService, useValue: mockLocalAuth },
        { provide: TidepoolAuthService, useValue: mockTidepoolAuth },
        { provide: LoggerService, useValue: mockLogger },
        { provide: ApiGatewayService, useValue: mockApiGateway },
      ],
    });

    unifiedAuthService = TestBed.inject(UnifiedAuthService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should initialize with no authentication and null provider', async () => {
      const state = await firstValueFrom(unifiedAuthService.authState$);
      expect(state.isAuthenticated).toBe(false);
      expect(state.provider).toBeNull();
      expect(state.user).toBeNull();
      expect(state.localAuth).toBeDefined();
      expect(state.tidepoolAuth).toBeDefined();
    });

    it('should emit false on isAuthenticated$ initially', async () => {
      const isAuthenticated = await firstValueFrom(unifiedAuthService.isAuthenticated$);
      expect(isAuthenticated).toBe(false);
    });

    it('should emit null on currentUser$ initially', async () => {
      const user = await firstValueFrom(unifiedAuthService.currentUser$);
      expect(user).toBeNull();
    });
  });

  describe('Local Authentication Only', () => {
    it('should update to local provider when local auth succeeds', async () => {
      // ARRANGE: Update local auth state to authenticated
      mockLocalAuth.authState$.next({
        isAuthenticated: true,
        user: mockLocalUser,
        accessToken: 'local_access_token',
        refreshToken: 'local_refresh_token',
        expiresAt: Date.now() + 3600000,
      });

      // ACT & ASSERT: Wait for state update and check
      await new Promise(resolve => setTimeout(resolve, 100));
      const state = await firstValueFrom(unifiedAuthService.authState$);
      expect(state.isAuthenticated).toBe(true);
      expect(state.provider).toBe('local');
      expect(state.user).toBeDefined();
      expect(state.user?.id).toBe('1000');
      expect(state.user?.email).toBe('local@example.com');
      expect(state.user?.provider).toBe('local');
      expect(state.user?.role).toBe('patient');
    });

    it('should call LocalAuthService.login when loginLocal is invoked', async () => {
      // ARRANGE
      const loginRequest = { email: 'test@example.com', password: 'password123', rememberMe: true };
      mockLocalAuth.login.mockReturnValue(
        of({
          success: true,
          user: mockLocalUser,
        })
      );

      // ACT
      await unifiedAuthService.loginLocal(loginRequest).toPromise();

      // ASSERT
      expect(mockLocalAuth.login).toHaveBeenCalledWith('test@example.com', 'password123', true);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Auth',
        'Local login initiated',
        expect.objectContaining({ username: 'test@example.com', provider: 'local' })
      );
    });

    it('should handle local login with DNI instead of email', async () => {
      // ARRANGE
      const loginRequest = { dni: '1000', password: 'password123' };
      mockLocalAuth.login.mockReturnValue(
        of({
          success: true,
          user: mockLocalUser,
        })
      );

      // ACT
      await unifiedAuthService.loginLocal(loginRequest).toPromise();

      // ASSERT
      expect(mockLocalAuth.login).toHaveBeenCalledWith('1000', 'password123', undefined);
    });
  });

  describe('Tidepool Authentication Only', () => {
    it('should update to tidepool provider when Tidepool auth succeeds', async () => {
      // ARRANGE: Update Tidepool auth state to authenticated
      mockTidepoolAuth.authState.next({
        isAuthenticated: true,
        isLoading: false,
        error: null,
        userId: mockTidepoolUser.userId,
        email: mockTidepoolUser.email,
      });

      // ACT & ASSERT: Wait for state update and check
      await new Promise(resolve => setTimeout(resolve, 100));
      const state = await firstValueFrom(unifiedAuthService.authState$);
      expect(state.isAuthenticated).toBe(true);
      expect(state.provider).toBe('tidepool');
      expect(state.user).toBeDefined();
      expect(state.user?.id).toBe(mockTidepoolUser.userId);
      expect(state.user?.email).toBe(mockTidepoolUser.email);
      expect(state.user?.provider).toBe('tidepool');
      expect(state.user?.tidepoolUserId).toBe(mockTidepoolUser.userId);
    });

    it('should call TidepoolAuthService.login when loginTidepool is invoked', async () => {
      // ARRANGE
      mockTidepoolAuth.login.mockResolvedValue(undefined);

      // ACT
      await unifiedAuthService.loginTidepool().toPromise();

      // ASSERT
      expect(mockTidepoolAuth.login).toHaveBeenCalledTimes(1);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Auth',
        'Tidepool login initiated',
        expect.objectContaining({ provider: 'tidepool' })
      );
    });
  });

  describe('Both Providers Authenticated', () => {
    it('should merge users when both providers are authenticated', async () => {
      // ARRANGE: Authenticate with local first
      mockLocalAuth.authState$.next({
        isAuthenticated: true,
        user: mockLocalUser,
        accessToken: 'local_access_token',
        refreshToken: 'local_refresh_token',
        expiresAt: Date.now() + 3600000,
      });

      // Then authenticate with Tidepool
      await new Promise(resolve => setTimeout(resolve, 50));
      mockTidepoolAuth.authState.next({
        isAuthenticated: true,
        isLoading: false,
        error: null,
        userId: mockTidepoolUser.userId,
        email: mockTidepoolUser.email,
      });

      // ACT & ASSERT: Wait and check merged state
      await new Promise(resolve => setTimeout(resolve, 100));
      const state = await firstValueFrom(unifiedAuthService.authState$);
      expect(state.isAuthenticated).toBe(true);
      expect(state.provider).toBe('both');
      expect(state.user).toBeDefined();
      // Should prioritize local user data
      expect(state.user?.id).toBe(mockLocalUser.id);
      expect(state.user?.email).toBe(mockLocalUser.email);
      expect(state.user?.firstName).toBe(mockLocalUser.firstName);
      expect(state.user?.provider).toBe('both');
      // Should include Tidepool data
      expect(state.user?.tidepoolUserId).toBe(mockTidepoolUser.userId);
      expect(state.user?.tidepoolEmail).toBe(mockTidepoolUser.email);
    });
  });

  describe('Logout Operations', () => {
    it('should logout from both providers when logout is called', async () => {
      // ARRANGE: Setup authenticated state with both providers
      mockLocalAuth.authState$.next({
        isAuthenticated: true,
        user: mockLocalUser,
        accessToken: 'local_token',
        refreshToken: null,
        expiresAt: null,
      });
      mockTidepoolAuth.authState.next({
        isAuthenticated: true,
        isLoading: false,
        error: null,
        userId: 'tidepool_id',
        email: 'tidepool@example.com',
      });

      // ACT
      await unifiedAuthService.logout();

      // ASSERT
      expect(mockLocalAuth.logout).toHaveBeenCalledTimes(1);
      expect(mockTidepoolAuth.logout).toHaveBeenCalledTimes(1);
      expect(mockApiGateway.clearCache).toHaveBeenCalledTimes(1);
      expect(mockLogger.info).toHaveBeenCalledWith('Auth', 'Logout completed');
    });

    it('should clear API cache after logout', async () => {
      // ARRANGE
      mockLocalAuth.authState$.next({
        isAuthenticated: true,
        user: mockLocalUser,
        accessToken: 'local_token',
        refreshToken: null,
        expiresAt: null,
      });

      // ACT
      await unifiedAuthService.logout();

      // ASSERT
      expect(mockApiGateway.clearCache).toHaveBeenCalledTimes(1);
      expect(mockLogger.debug).toHaveBeenCalledWith('Auth', 'API cache cleared');
    });

    it('should only logout from local when logoutFrom("local") is called', async () => {
      // ARRANGE
      mockLocalAuth.authState$.next({
        isAuthenticated: true,
        user: mockLocalUser,
        accessToken: 'local_token',
        refreshToken: null,
        expiresAt: null,
      });

      // ACT
      await unifiedAuthService.logoutFrom('local');

      // ASSERT
      expect(mockLocalAuth.logout).toHaveBeenCalledTimes(1);
      expect(mockTidepoolAuth.logout).not.toHaveBeenCalled();
    });

    it('should only logout from Tidepool when logoutFrom("tidepool") is called', async () => {
      // ARRANGE
      mockTidepoolAuth.authState.next({
        isAuthenticated: true,
        isLoading: false,
        error: null,
        userId: 'tidepool_id',
        email: 'tidepool@example.com',
      });

      // ACT
      await unifiedAuthService.logoutFrom('tidepool');

      // ASSERT
      expect(mockTidepoolAuth.logout).toHaveBeenCalledTimes(1);
      expect(mockLocalAuth.logout).not.toHaveBeenCalled();
    });
  });

  describe('Token Management', () => {
    it('should return local token when available (priority)', async () => {
      // ARRANGE: Setup local auth with token
      mockLocalAuth.authState$.next({
        isAuthenticated: true,
        user: mockLocalUser,
        accessToken: 'local_access_token',
        refreshToken: null,
        expiresAt: null,
      });
      mockLocalAuth.getAccessToken.mockResolvedValue('local_access_token');

      // ACT
      const token = await unifiedAuthService.getAccessToken().toPromise();

      // ASSERT
      expect(token).toBe('local_access_token');
      // Should not call Tidepool getAccessToken since local is available
      expect(mockTidepoolAuth.getAccessToken).not.toHaveBeenCalled();
    });

    it('should fall back to Tidepool token when local is not available', async () => {
      // ARRANGE: No local auth, but Tidepool is authenticated
      mockLocalAuth.authState$.next({
        isAuthenticated: false,
        user: null,
        accessToken: null,
        refreshToken: null,
        expiresAt: null,
      });
      mockTidepoolAuth.authState.next({
        isAuthenticated: true,
        isLoading: false,
        error: null,
        userId: 'tidepool_id',
        email: 'tidepool@example.com',
      });
      mockTidepoolAuth.getAccessToken.mockResolvedValue('tidepool_access_token');

      // ACT
      const token = await unifiedAuthService.getAccessToken().toPromise();

      // ASSERT
      expect(token).toBe('tidepool_access_token');
      expect(mockTidepoolAuth.getAccessToken).toHaveBeenCalledTimes(1);
    });

    it('should return null when no tokens are available', async () => {
      // ARRANGE: No authentication
      mockLocalAuth.authState$.next({
        isAuthenticated: false,
        user: null,
        accessToken: null,
        refreshToken: null,
        expiresAt: null,
      });
      mockTidepoolAuth.authState.next({
        isAuthenticated: false,
        isLoading: false,
        error: null,
        userId: null,
        email: null,
      });

      // ACT
      const token = await unifiedAuthService.getAccessToken().toPromise();

      // ASSERT
      expect(token).toBeNull();
    });
  });

  describe('Provider-Specific Token Access', () => {
    it('should get local token via getProviderToken("local")', async () => {
      // ARRANGE
      mockLocalAuth.getAccessToken.mockResolvedValue('local_specific_token');

      // ACT
      const token = await unifiedAuthService.getProviderToken('local').toPromise();

      // ASSERT
      expect(token).toBe('local_specific_token');
      expect(mockLocalAuth.getAccessToken).toHaveBeenCalledTimes(1);
    });

    it('should get Tidepool token via getProviderToken("tidepool")', async () => {
      // ARRANGE
      mockTidepoolAuth.getAccessToken.mockResolvedValue('tidepool_specific_token');

      // ACT
      const token = await unifiedAuthService.getProviderToken('tidepool').toPromise();

      // ASSERT
      expect(token).toBe('tidepool_specific_token');
      expect(mockTidepoolAuth.getAccessToken).toHaveBeenCalledTimes(1);
    });
  });

  describe('Provider Authentication Check', () => {
    it('should return true when authenticated with local provider', () => {
      // ARRANGE
      mockLocalAuth.authState$.next({
        isAuthenticated: true,
        user: mockLocalUser,
        accessToken: 'local_token',
        refreshToken: null,
        expiresAt: null,
      });

      // ACT
      const isAuthenticated = unifiedAuthService.isAuthenticatedWith('local');

      // ASSERT
      expect(isAuthenticated).toBe(true);
    });

    it('should return false when not authenticated with local provider', () => {
      // ARRANGE
      mockLocalAuth.authState$.next({
        isAuthenticated: false,
        user: null,
        accessToken: null,
        refreshToken: null,
        expiresAt: null,
      });

      // ACT
      const isAuthenticated = unifiedAuthService.isAuthenticatedWith('local');

      // ASSERT
      expect(isAuthenticated).toBe(false);
    });

    it('should return true when authenticated with Tidepool provider', () => {
      // ARRANGE
      mockTidepoolAuth.authState.next({
        isAuthenticated: true,
        isLoading: false,
        error: null,
        userId: 'tidepool_id',
        email: 'tidepool@example.com',
      });

      // ACT
      const isAuthenticated = unifiedAuthService.isAuthenticatedWith('tidepool');

      // ASSERT
      expect(isAuthenticated).toBe(true);
    });

    it('should return false when not authenticated with Tidepool provider', () => {
      // ARRANGE
      mockTidepoolAuth.authState.next({
        isAuthenticated: false,
        isLoading: false,
        error: null,
        userId: null,
        email: null,
      });

      // ACT
      const isAuthenticated = unifiedAuthService.isAuthenticatedWith('tidepool');

      // ASSERT
      expect(isAuthenticated).toBe(false);
    });
  });

  describe('Account Linking', () => {
    it('should link Tidepool account when local user is authenticated', async () => {
      // ARRANGE: Local user is authenticated
      mockLocalAuth.authState$.next({
        isAuthenticated: true,
        user: mockLocalUser,
        accessToken: 'local_token',
        refreshToken: null,
        expiresAt: null,
      });
      mockTidepoolAuth.login.mockResolvedValue(undefined);

      // ACT
      await unifiedAuthService.linkTidepoolAccount().toPromise();

      // ASSERT
      expect(mockTidepoolAuth.login).toHaveBeenCalledTimes(1);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Auth',
        'Tidepool account linked successfully',
        expect.objectContaining({ provider: 'tidepool' })
      );
    });

    it('should throw error when linking Tidepool without local authentication', async () => {
      // ARRANGE: No local authentication
      mockLocalAuth.authState$.next({
        isAuthenticated: false,
        user: null,
        accessToken: null,
        refreshToken: null,
        expiresAt: null,
      });

      // ACT & ASSERT
      await expect(unifiedAuthService.linkTidepoolAccount().toPromise()).rejects.toThrow(
        'Must be logged in locally to link Tidepool account'
      );
      expect(mockTidepoolAuth.login).not.toHaveBeenCalled();
    });

    it('should unlink Tidepool account when authenticated', async () => {
      // ARRANGE: Tidepool is authenticated
      mockTidepoolAuth.authState.next({
        isAuthenticated: true,
        isLoading: false,
        error: null,
        userId: 'tidepool_id',
        email: 'tidepool@example.com',
      });

      // ACT
      await unifiedAuthService.unlinkTidepoolAccount();

      // ASSERT
      expect(mockTidepoolAuth.logout).toHaveBeenCalledTimes(1);
    });

    it('should throw error when unlinking without Tidepool authentication', async () => {
      // ARRANGE: No Tidepool authentication
      mockTidepoolAuth.authState.next({
        isAuthenticated: false,
        isLoading: false,
        error: null,
        userId: null,
        email: null,
      });

      // ACT & ASSERT
      await expect(unifiedAuthService.unlinkTidepoolAccount()).rejects.toThrow(
        'No Tidepool account linked'
      );
      expect(mockTidepoolAuth.logout).not.toHaveBeenCalled();
    });
  });

  describe('Token Refresh', () => {
    it('should refresh both tokens when both providers are authenticated', async () => {
      // ARRANGE: Both providers authenticated with refresh tokens
      mockLocalAuth.authState$.next({
        isAuthenticated: true,
        user: mockLocalUser,
        accessToken: 'local_token',
        refreshToken: 'local_refresh_token',
        expiresAt: null,
      });
      mockTidepoolAuth.authState.next({
        isAuthenticated: true,
        isLoading: false,
        error: null,
        userId: 'tidepool_id',
        email: 'tidepool@example.com',
      });
      mockLocalAuth.refreshAccessToken.mockReturnValue(
        of({
          isAuthenticated: true,
          user: mockLocalUser,
          accessToken: 'refreshed_local_token',
          refreshToken: 'local_refresh_token',
          expiresAt: null,
        })
      );

      // ACT
      const result = await unifiedAuthService.refreshTokens().toPromise();

      // ASSERT
      expect(mockLocalAuth.refreshAccessToken).toHaveBeenCalledTimes(1);
      expect(mockTidepoolAuth.refreshAccessToken).toHaveBeenCalledTimes(1);
      expect(result).toBeDefined();
      expect(mockLogger.info).toHaveBeenCalledWith('Auth', 'All tokens refreshed');
    });

    it('should handle refresh failure gracefully', async () => {
      // ARRANGE: Local provider with refresh token that fails
      mockLocalAuth.authState$.next({
        isAuthenticated: true,
        user: mockLocalUser,
        accessToken: 'local_token',
        refreshToken: 'local_refresh_token',
        expiresAt: null,
      });
      mockLocalAuth.refreshAccessToken.mockReturnValue(
        throwError(() => new Error('Refresh failed'))
      );

      // ACT
      const result = await unifiedAuthService.refreshTokens().toPromise();

      // ASSERT: Should not throw, but log warning
      expect(result).toBeDefined();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Auth',
        'Local token refresh failed',
        expect.objectContaining({ error: 'Refresh failed' })
      );
    });

    it('should return current state when no tokens to refresh', async () => {
      // ARRANGE: No refresh tokens available
      mockLocalAuth.authState$.next({
        isAuthenticated: true,
        user: mockLocalUser,
        accessToken: 'local_token',
        refreshToken: null,
        expiresAt: null,
      });
      mockTidepoolAuth.authState.next({
        isAuthenticated: false,
        isLoading: false,
        error: null,
        userId: null,
        email: null,
      });

      // ACT
      const result = await unifiedAuthService.refreshTokens().toPromise();

      // ASSERT
      expect(result).toBeDefined();
      expect(mockLogger.debug).toHaveBeenCalledWith('Auth', 'No tokens to refresh');
      expect(mockLocalAuth.refreshAccessToken).not.toHaveBeenCalled();
      expect(mockTidepoolAuth.refreshAccessToken).not.toHaveBeenCalled();
    });
  });

  describe('User Preferences Update', () => {
    it('should update preferences via LocalAuthService when authenticated', async () => {
      // ARRANGE: Local user authenticated
      mockLocalAuth.authState$.next({
        isAuthenticated: true,
        user: mockLocalUser,
        accessToken: 'local_token',
        refreshToken: null,
        expiresAt: null,
      });
      mockLocalAuth.updatePreferences.mockReturnValue(of(mockLocalUser));

      // ACT
      const preferences = {
        glucoseUnit: 'mmol/L' as const,
        theme: 'dark' as const,
      };
      await unifiedAuthService.updatePreferences(preferences).toPromise();

      // ASSERT
      expect(mockLocalAuth.updatePreferences).toHaveBeenCalledWith({
        glucoseUnit: 'mmol/L',
        theme: 'dark',
      });
    });

    it('should handle empty preferences gracefully', async () => {
      // ARRANGE
      mockLocalAuth.authState$.next({
        isAuthenticated: true,
        user: mockLocalUser,
        accessToken: 'local_token',
        refreshToken: null,
        expiresAt: null,
      });

      // ACT
      await unifiedAuthService.updatePreferences({}).toPromise();

      // ASSERT
      expect(mockLocalAuth.updatePreferences).not.toHaveBeenCalled();
    });
  });

  describe('Observable Emissions', () => {
    it('should emit auth state changes on authState$', async () => {
      const emissions: UnifiedAuthState[] = [];

      const subscription = unifiedAuthService.authState$.subscribe(state => {
        emissions.push(state);
      });

      // Trigger authentication
      await new Promise(resolve => setTimeout(resolve, 50));
      mockLocalAuth.authState$.next({
        isAuthenticated: true,
        user: mockLocalUser,
        accessToken: 'local_token',
        refreshToken: null,
        expiresAt: null,
      });

      // Wait for emission
      await new Promise(resolve => setTimeout(resolve, 100));

      // Initial + after local auth
      expect(emissions.length).toBeGreaterThanOrEqual(2);
      expect(emissions[0].isAuthenticated).toBe(false);
      expect(emissions[emissions.length - 1].isAuthenticated).toBe(true);
      expect(emissions[emissions.length - 1].provider).toBe('local');

      subscription.unsubscribe();
    });

    it('should emit user changes on currentUser$', async () => {
      const emissions: (UnifiedUser | null)[] = [];

      const subscription = unifiedAuthService.currentUser$.subscribe(user => {
        emissions.push(user);
      });

      // Trigger authentication
      await new Promise(resolve => setTimeout(resolve, 50));
      mockLocalAuth.authState$.next({
        isAuthenticated: true,
        user: mockLocalUser,
        accessToken: 'local_token',
        refreshToken: null,
        expiresAt: null,
      });

      // Wait for emission
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(emissions.length).toBeGreaterThanOrEqual(2);
      expect(emissions[0]).toBeNull();
      expect(emissions[emissions.length - 1]).toBeDefined();
      expect(emissions[emissions.length - 1]?.id).toBe('1000');

      subscription.unsubscribe();
    });
  });

  describe('Helper Methods', () => {
    it('should return current user via getCurrentUser()', () => {
      // ARRANGE
      mockLocalAuth.authState$.next({
        isAuthenticated: true,
        user: mockLocalUser,
        accessToken: 'local_token',
        refreshToken: null,
        expiresAt: null,
      });

      // Wait for state update
      setTimeout(() => {
        // ACT
        const user = unifiedAuthService.getCurrentUser();

        // ASSERT
        expect(user).toBeDefined();
        expect(user?.id).toBe('1000');
      }, 100);
    });

    it('should return authentication status via isAuthenticated()', () => {
      // ARRANGE
      mockLocalAuth.authState$.next({
        isAuthenticated: true,
        user: mockLocalUser,
        accessToken: 'local_token',
        refreshToken: null,
        expiresAt: null,
      });

      // Wait for state update
      setTimeout(() => {
        // ACT
        const isAuth = unifiedAuthService.isAuthenticated();

        // ASSERT
        expect(isAuth).toBe(true);
      }, 100);
    });

    it('should return current provider via getProvider()', () => {
      // ARRANGE
      mockLocalAuth.authState$.next({
        isAuthenticated: true,
        user: mockLocalUser,
        accessToken: 'local_token',
        refreshToken: null,
        expiresAt: null,
      });

      // Wait for state update
      setTimeout(() => {
        // ACT
        const provider = unifiedAuthService.getProvider();

        // ASSERT
        expect(provider).toBe('local');
      }, 100);
    });
  });
});
