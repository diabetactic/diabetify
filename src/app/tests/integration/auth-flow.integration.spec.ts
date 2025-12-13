/**
 * Authentication Flow Integration Tests
 *
 * Tests the complete authentication flow across multiple services:
 * 1. LocalAuthService - Authentication and token management
 * 2. ProfileService - User profile loading and sync
 * 3. ApiGatewayService - HTTP layer coordination
 *
 * Flow: Login → Profile Fetch → Token Refresh → Logout
 */

import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { LocalAuthService, LocalUser, AccountState } from '../../core/services/local-auth.service';
import { ProfileService } from '../../core/services/profile.service';
import { ApiGatewayService } from '../../core/services/api-gateway.service';
import { ExternalServicesManager } from '../../core/services/external-services-manager.service';
import { PlatformDetectorService } from '../../core/services/platform-detector.service';
import { EnvironmentDetectorService } from '../../core/services/environment-detector.service';
import { LoggerService } from '../../core/services/logger.service';
import { MockAdapterService } from '../../core/services/mock-adapter.service';
import { MockDataService } from '../../core/services/mock-data.service';
import { TidepoolAuthService } from '../../core/services/tidepool-auth.service';
import { Preferences } from '@capacitor/preferences';

describe('Auth Flow Integration Tests', () => {
  let localAuthService: LocalAuthService;
  let profileService: ProfileService;
  let apiGatewayService: ApiGatewayService;
  let mockHttpClient: jasmine.SpyObj<HttpClient>;
  let mockExternalServices: jasmine.SpyObj<ExternalServicesManager>;

  const mockUser: LocalUser = {
    id: '1000',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    role: 'patient',
    accountState: AccountState.ACTIVE,
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

  const mockTokenResponse = {
    access_token: 'mock_access_token_12345',
    refresh_token: 'mock_refresh_token_67890',
    token_type: 'bearer',
    expires_in: 1800,
  };

  const mockGatewayUser = {
    dni: '1000',
    name: 'Test',
    surname: 'User',
    blocked: false,
    email: 'test@example.com',
    state: 'active' as const,
    hospital_account: 'test_hospital',
    times_measured: 0,
    streak: 0,
    max_streak: 0,
  };

  beforeEach(() => {
    // Create HttpClient mock (services now use HttpClient directly with Capacitor auto-patching)
    mockHttpClient = jasmine.createSpyObj('HttpClient', ['get', 'post', 'put', 'delete', 'patch']);

    // Create ExternalServicesManager mock
    mockExternalServices = jasmine.createSpyObj('ExternalServicesManager', [
      'isServiceAvailable',
      'getServiceStatus',
    ]);
    mockExternalServices.isServiceAvailable.and.returnValue(true);

    TestBed.configureTestingModule({
      providers: [
        LocalAuthService,
        ProfileService,
        ApiGatewayService,
        { provide: HttpClient, useValue: mockHttpClient },
        { provide: ExternalServicesManager, useValue: mockExternalServices },
        {
          provide: PlatformDetectorService,
          useValue: { getApiBaseUrl: () => 'http://localhost:8000' },
        },
        {
          provide: EnvironmentDetectorService,
          useValue: { isPlatformBrowser: () => true },
        },
        {
          provide: LoggerService,
          useValue: jasmine.createSpyObj('LoggerService', [
            'info',
            'debug',
            'warn',
            'error',
            'getRequestId',
            'setRequestId',
          ]),
        },
        {
          provide: MockAdapterService,
          useValue: { isServiceMockEnabled: () => false },
        },
        {
          provide: MockDataService,
          useValue: jasmine.createSpyObj('MockDataService', ['getStats']),
        },
        {
          provide: TidepoolAuthService,
          useValue: jasmine.createSpyObj('TidepoolAuthService', ['getAccessToken']),
        },
      ],
    });

    localAuthService = TestBed.inject(LocalAuthService);
    profileService = TestBed.inject(ProfileService);
    apiGatewayService = TestBed.inject(ApiGatewayService);

    // Reset Preferences mock for each test
    (Preferences.get as jest.Mock).mockResolvedValue({ value: null });
    (Preferences.set as jest.Mock).mockResolvedValue(undefined);
    (Preferences.remove as jest.Mock).mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Complete Login Flow', () => {
    it('should complete login → profile fetch → token storage flow', async () => {
      // ARRANGE: Setup HTTP responses
      mockHttpClient.post.and.returnValue(of(mockTokenResponse));
      mockHttpClient.get.and.returnValue(of(mockGatewayUser));

      // ACT: Execute login
      const loginResult = await localAuthService.login('1000', 'password').toPromise();

      // ASSERT: Login succeeded
      expect(loginResult?.success).toBeTrue();
      expect(loginResult?.user).toBeDefined();
      expect(loginResult?.user?.id).toBe('1000');

      // Verify HTTP calls were made in correct order
      expect(mockHttpClient.post).toHaveBeenCalledTimes(1);
      expect(mockHttpClient.get).toHaveBeenCalledTimes(1);

      // Verify token endpoint was called
      const postCall = mockHttpClient.post.calls.mostRecent();
      expect(postCall.args[0]).toContain('/token');

      // Verify profile endpoint was called with auth header
      const getCall = mockHttpClient.get.calls.mostRecent();
      expect(getCall.args[0]).toContain('/users/me');
      expect(getCall.args[1]?.headers?.Authorization).toBe('Bearer mock_access_token_12345');

      // Verify tokens were stored
      expect(Preferences.set).toHaveBeenCalledWith({
        key: 'local_access_token',
        value: 'mock_access_token_12345',
      });

      // Verify user data was stored
      const userSetCall = (Preferences.set as jest.Mock).mock.calls.find(
        (call: any) => call[0]?.key === 'local_user'
      );
      expect(userSetCall).toBeDefined();
      const storedUser = JSON.parse(userSetCall[0].value);
      expect(storedUser.id).toBe('1000');
      expect(storedUser.email).toBe('test@example.com');

      // Verify auth state is updated
      const authState = await localAuthService.authState$.toPromise();
      expect(authState?.isAuthenticated).toBeTrue();
      expect(authState?.user?.id).toBe('1000');
      expect(authState?.accessToken).toBe('mock_access_token_12345');
    });

    it('should handle account pending state during login', async () => {
      // ARRANGE: User with pending account
      const pendingUser = { ...mockGatewayUser, state: 'pending' as const };
      mockHttpClient.post.and.returnValue(of(mockTokenResponse));
      mockHttpClient.get.and.returnValue(of(pendingUser));

      // ACT: Execute login
      const loginResult = await localAuthService.login('1000', 'password').toPromise();

      // ASSERT: Login rejected due to pending state
      expect(loginResult?.success).toBeFalse();
      expect(loginResult?.error).toContain('accountPending');

      // Verify tokens were NOT stored (account not active)
      const tokenSetCalls = (Preferences.set as jest.Mock).mock.calls.filter(
        (call: any) => call[0]?.key === 'local_access_token'
      );
      expect(tokenSetCalls.length).toBe(0);
    });

    it('should handle account disabled state during login', async () => {
      // ARRANGE: User with disabled account
      const disabledUser = { ...mockGatewayUser, state: 'disabled' as const };
      mockHttpClient.post.and.returnValue(of(mockTokenResponse));
      mockHttpClient.get.and.returnValue(of(disabledUser));

      // ACT: Execute login
      const loginResult = await localAuthService.login('1000', 'password').toPromise();

      // ASSERT: Login rejected due to disabled state
      expect(loginResult?.success).toBeFalse();
      expect(loginResult?.error).toContain('accountDisabled');
    });
  });

  describe('Profile Sync After Login', () => {
    it('should create local profile after successful login', async () => {
      // ARRANGE
      mockHttpClient.post.and.returnValue(of(mockTokenResponse));
      mockHttpClient.get.and.returnValue(of(mockGatewayUser));

      // ACT: Login and create profile
      const loginResult = await localAuthService.login('1000', 'password').toPromise();
      expect(loginResult?.success).toBeTrue();

      // Create local profile from backend data
      await profileService.createProfile({
        name: loginResult!.user!.firstName,
        email: loginResult!.user!.email,
        age: 35,
        accountState: loginResult!.user!.accountState,
      });

      // ASSERT: Profile created and matches user data
      const profile = await profileService.getProfile();
      expect(profile).toBeDefined();
      expect(profile?.email).toBe('test@example.com');
      expect(profile?.name).toBe('Test');
    });

    it('should update profile preferences after login', async () => {
      // ARRANGE: Login first
      mockHttpClient.post.and.returnValue(of(mockTokenResponse));
      mockHttpClient.get.and.returnValue(of(mockGatewayUser));

      await localAuthService.login('1000', 'password').toPromise();
      await profileService.createProfile({
        name: 'Test',
        email: 'test@example.com',
        age: 35,
      });

      // ACT: Update preferences
      await profileService.updatePreferences({
        glucoseUnit: 'mmol/L',
        theme: 'dark',
      });

      // ASSERT: Preferences updated
      const profile = await profileService.getProfile();
      expect(profile?.preferences?.glucoseUnit).toBe('mmol/L');
      expect(profile?.preferences?.theme).toBe('dark');
    });

    it('should store gamification fields from backend user', async () => {
      // ARRANGE
      mockHttpClient.post.and.returnValue(of(mockTokenResponse));
      mockHttpClient.get.and.returnValue(of(mockGatewayUser));

      // ACT
      const loginResult = await localAuthService.login('1000', 'password').toPromise();
      expect(loginResult?.success).toBeTrue();

      // ASSERT: auth state contains streak fields
      const authState = await localAuthService.authState$.toPromise();
      expect(authState?.user?.streak).toBe(0);
      expect(authState?.user?.max_streak).toBe(0);
      expect(authState?.user?.times_measured).toBe(0);
    });
  });

  describe('Token Refresh Flow', () => {
    it('should refresh expired token and maintain session', async () => {
      // ARRANGE: Setup initial auth state with expired token
      const expiredTime = Date.now() - 1000; // 1 second ago
      (Preferences.get as jest.Mock).mockImplementation(({ key }: { key: string }) => {
        if (key === 'local_access_token') {
          return Promise.resolve({ value: 'expired_token' });
        }
        if (key === 'local_refresh_token') {
          return Promise.resolve({ value: 'valid_refresh_token' });
        }
        if (key === 'local_user') {
          return Promise.resolve({ value: JSON.stringify(mockUser) });
        }
        if (key === 'local_token_expires') {
          return Promise.resolve({ value: expiredTime.toString() });
        }
        return Promise.resolve({ value: null });
      });

      // Setup refresh response
      const newTokenResponse = {
        access_token: 'new_access_token_99999',
        token_type: 'bearer',
        expires_in: 1800,
      };
      mockHttpClient.post.and.returnValue(of(newTokenResponse));

      // ACT: Trigger token refresh
      const refreshedState = await localAuthService.refreshAccessToken().toPromise();

      // ASSERT: Token refreshed successfully
      expect(refreshedState?.accessToken).toBe('new_access_token_99999');
      expect(refreshedState?.isAuthenticated).toBeTrue();

      // Verify refresh endpoint was called
      const postCall = mockHttpClient.post.calls.mostRecent();
      expect(postCall.args[0]).toContain('/token');
      expect(postCall.args[1]).toContain('grant_type=refresh_token');
      expect(postCall.args[1]).toContain('refresh_token=valid_refresh_token');

      // Verify new token was stored
      expect(Preferences.set).toHaveBeenCalledWith({
        key: 'local_access_token',
        value: 'new_access_token_99999',
      });
    });

    it('should handle refresh token failure and clear session', async () => {
      // ARRANGE: Setup auth state with refresh token
      (Preferences.get as jest.Mock).mockImplementation(({ key }: { key: string }) => {
        if (key === 'local_refresh_token') {
          return Promise.resolve({ value: 'invalid_refresh_token' });
        }
        return Promise.resolve({ value: null });
      });

      // Setup failure response
      mockHttpClient.post.and.returnValue(
        throwError(() => ({ status: 401, message: 'Invalid refresh token' }))
      );

      // ACT & ASSERT: Refresh should fail
      try {
        await localAuthService.refreshAccessToken().toPromise();
        fail('Should have thrown error');
      } catch (error: any) {
        expect(error.message).toContain('Token refresh failed');
      }

      // Verify invalid refresh token was removed
      expect(Preferences.remove).toHaveBeenCalledWith({ key: 'local_refresh_token' });
    });
  });

  describe('Logout Flow', () => {
    it('should clear all auth data and profile on logout', async () => {
      // ARRANGE: Setup authenticated state
      mockHttpClient.post.and.returnValue(of(mockTokenResponse));
      mockHttpClient.get.and.returnValue(of(mockGatewayUser));

      await localAuthService.login('1000', 'password').toPromise();
      await profileService.createProfile({
        name: 'Test',
        email: 'test@example.com',
        age: 35,
      });

      // Verify authenticated
      const authStateBefore = await localAuthService.authState$.toPromise();
      expect(authStateBefore?.isAuthenticated).toBeTrue();

      // ACT: Logout
      await localAuthService.logout();

      // ASSERT: Auth state cleared
      const authStateAfter = await localAuthService.authState$.toPromise();
      expect(authStateAfter?.isAuthenticated).toBeFalse();
      expect(authStateAfter?.user).toBeNull();
      expect(authStateAfter?.accessToken).toBeNull();

      // Verify all storage keys were cleared
      expect(Preferences.remove).toHaveBeenCalledWith({ key: 'local_access_token' });
      expect(Preferences.remove).toHaveBeenCalledWith({ key: 'local_refresh_token' });
      expect(Preferences.remove).toHaveBeenCalledWith({ key: 'local_user' });
      expect(Preferences.remove).toHaveBeenCalledWith({ key: 'local_token_expires' });
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors during login', async () => {
      // ARRANGE: Simulate network error
      mockHttpClient.post.and.returnValue(
        throwError(() => ({ status: 0, message: 'Network error' }))
      );

      // ACT: Execute login
      const loginResult = await localAuthService.login('1000', 'password').toPromise();

      // ASSERT: Login failed with error message
      expect(loginResult?.success).toBeFalse();
      expect(loginResult?.error).toBeTruthy();

      // Verify no tokens were stored
      const tokenSetCalls = (Preferences.set as jest.Mock).mock.calls.filter(
        (call: any) => call[0]?.key === 'local_access_token'
      );
      expect(tokenSetCalls.length).toBe(0);
    });

    it('should handle invalid credentials during login', async () => {
      // ARRANGE: Simulate 401 unauthorized
      mockHttpClient.post.and.returnValue(
        throwError(() => ({ status: 401, message: 'Invalid credentials' }))
      );

      // ACT: Execute login
      const loginResult = await localAuthService.login('1000', 'wrong_password').toPromise();

      // ASSERT: Login failed
      expect(loginResult?.success).toBeFalse();
      expect(loginResult?.error).toContain('Credenciales incorrectas');
    });

    it('should handle profile fetch failure after successful token', async () => {
      // ARRANGE: Token succeeds but profile fetch fails
      mockHttpClient.post.and.returnValue(of(mockTokenResponse));
      mockHttpClient.get.and.returnValue(
        throwError(() => ({ status: 500, message: 'Server error' }))
      );

      // ACT: Execute login
      const loginResult = await localAuthService.login('1000', 'password').toPromise();

      // ASSERT: Login failed even though token was obtained
      expect(loginResult?.success).toBeFalse();
      expect(loginResult?.error).toBeTruthy();

      // Verify tokens were NOT persisted (full flow must succeed)
      const tokenSetCalls = (Preferences.set as jest.Mock).mock.calls.filter(
        (call: any) => call[0]?.key === 'local_access_token'
      );
      expect(tokenSetCalls.length).toBe(0);
    });
  });

  describe('Concurrent Request Handling', () => {
    it('should handle concurrent authenticated requests with single token', async () => {
      // ARRANGE: Login first
      mockHttpClient.post.and.returnValue(of(mockTokenResponse));
      mockHttpClient.get.and.returnValue(of(mockGatewayUser));

      await localAuthService.login('1000', 'password').toPromise();

      // Setup responses for concurrent requests
      const mockReadingsResponse = { readings: [] };
      const mockAppointmentsResponse = { appointments: [] };

      mockHttpClient.get.and.callFake((url: string) => {
        if (url.includes('/glucose/mine')) {
          return of(mockReadingsResponse);
        }
        if (url.includes('/appointments/mine')) {
          return of(mockAppointmentsResponse);
        }
        return of({});
      });

      // ACT: Make concurrent authenticated requests
      const [readingsResult, appointmentsResult] = await Promise.all([
        apiGatewayService.request('extservices.glucose.mine').toPromise(),
        apiGatewayService.request('extservices.appointments.mine').toPromise(),
      ]);

      // ASSERT: Both requests succeeded with same token
      expect(readingsResult?.success).toBeTrue();
      expect(appointmentsResult?.success).toBeTrue();

      // Verify both requests used the access token
      const calls = mockHttpClient.get.calls.all();
      const authenticatedCalls = calls.filter((call: any) =>
        call.args[1]?.headers?.Authorization?.includes('mock_access_token_12345')
      );
      expect(authenticatedCalls.length).toBe(2);
    });
  });
});
