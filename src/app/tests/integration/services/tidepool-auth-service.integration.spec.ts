/**
 * Tidepool Auth Service Integration Tests
 *
 * Tests OAuth2 PKCE authentication flow:
 * 1. OAuth login flow → PKCE → Browser.open → deep link
 * 2. Login with credentials → Basic auth → session token
 * 3. Token exchange → code + PKCE verifier
 * 4. ID token decoding (JWT payload)
 * 5. Session token storage via TokenStorageService
 * 6. Token refresh with refresh_token grant
 * 7. Restore session → auto refresh
 * 8. Logout → clearAll
 * 9. Deep link parsing (code, state, error)
 * 10. CSRF protection via state validation
 */

// Initialize TestBed environment for Vitest
import '../../../test-setup';

import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { vi, type Mock } from 'vitest';
import { TidepoolAuthService, AuthState, AuthErrorCode } from '@core/services/tidepool-auth.service';
import { TokenStorageService } from '@core/services/token-storage.service';
import { LoggerService } from '@core/services/logger.service';
import { Browser } from '@capacitor/browser';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { NgZone } from '@angular/core';

describe('TidepoolAuthService Integration Tests', () => {
  let service: TidepoolAuthService;
  let httpMock: HttpTestingController;
  let mockTokenStorage: {
    storeAuth: Mock;
    getAccessToken: Mock;
    getRefreshToken: Mock;
    hasValidAccessToken: Mock;
    hasRefreshToken: Mock;
    getAuthData: Mock;
    clearAll: Mock;
  };
  let mockLogger: {
    info: Mock;
    debug: Mock;
    warn: Mock;
    error: Mock;
  };

  const mockCredentialsResponse = {
    userid: '1234567890',
    username: 'test@tidepool.org',
    emails: ['test@tidepool.org'],
  };

  const mockTokenResponse = {
    access_token: 'mock_access_token_abc123',
    refresh_token: 'mock_refresh_token_xyz789',
    token_type: 'Bearer',
    expires_in: 3600,
    scope: 'data:read data:write profile:read',
    id_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiZW1haWwiOiJ0ZXN0QHRpZGVwb29sLm9yZyIsImlhdCI6MTUxNjIzOTAyMn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
  };

  beforeEach(() => {
    // Create mock objects
    mockTokenStorage = {
      storeAuth: vi.fn().mockResolvedValue(undefined),
      getAccessToken: vi.fn().mockResolvedValue(null),
      getRefreshToken: vi.fn().mockResolvedValue(null),
      hasValidAccessToken: vi.fn().mockResolvedValue(false),
      hasRefreshToken: vi.fn().mockResolvedValue(false),
      getAuthData: vi.fn().mockResolvedValue(null),
      clearAll: vi.fn().mockResolvedValue(undefined),
    };

    mockLogger = {
      info: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        TidepoolAuthService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: TokenStorageService, useValue: mockTokenStorage },
        { provide: LoggerService, useValue: mockLogger },
        NgZone,
      ],
    });

    service = TestBed.inject(TidepoolAuthService);
    httpMock = TestBed.inject(HttpTestingController);

    // Clear mock state
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Verify no outstanding HTTP requests
    httpMock.verify();
  });

  describe('Login with Credentials (Basic Auth)', () => {
    it('should send Basic auth header with encoded credentials', async () => {
      // ACT
      const loginPromise = service.loginWithCredentials('test@tidepool.org', 'password123');

      // ASSERT - HTTP request
      const req = httpMock.expectOne('https://api.tidepool.org/auth/login');
      expect(req.request.method).toBe('POST');
      expect(req.request.headers.get('Authorization')).toContain('Basic ');
      expect(req.request.headers.get('Content-Type')).toBe('application/json');

      // Respond with session token in header
      req.flush(mockCredentialsResponse, {
        headers: {
          'x-tidepool-session-token': 'session_token_abc123',
        },
      });

      await loginPromise;
    });

    it('should extract session token from x-tidepool-session-token header', async () => {
      // ACT
      const loginPromise = service.loginWithCredentials('test@tidepool.org', 'password123');

      const req = httpMock.expectOne('https://api.tidepool.org/auth/login');
      req.flush(mockCredentialsResponse, {
        headers: {
          'x-tidepool-session-token': 'session_token_xyz789',
        },
      });

      await loginPromise;

      // ASSERT - Token storage called with session token
      expect(mockTokenStorage.storeAuth).toHaveBeenCalledWith(
        expect.objectContaining({
          accessToken: 'session_token_xyz789',
          refreshToken: 'session_token_xyz789',
          userId: '1234567890',
        })
      );
    });

    it('should store auth data via TokenStorageService', async () => {
      // ACT
      const loginPromise = service.loginWithCredentials('test@tidepool.org', 'password123');

      const req = httpMock.expectOne('https://api.tidepool.org/auth/login');
      req.flush(mockCredentialsResponse, {
        headers: {
          'x-tidepool-session-token': 'session_token_stored',
        },
      });

      await loginPromise;

      // ASSERT
      expect(mockTokenStorage.storeAuth).toHaveBeenCalledOnce();
      const storedAuth = mockTokenStorage.storeAuth.mock.calls[0][0];
      expect(storedAuth).toMatchObject({
        accessToken: 'session_token_stored',
        tokenType: 'Bearer',
        userId: '1234567890',
        email: 'test@tidepool.org',
      });
      expect(storedAuth.expiresAt).toBeGreaterThan(Date.now());
    });

    it('should update authState with userId and email', async () => {
      // ARRANGE - Subscribe to authState changes
      const authStates: AuthState[] = [];
      service.authState.subscribe(state => authStates.push(state));

      // ACT
      const loginPromise = service.loginWithCredentials('test@tidepool.org', 'password123');

      const req = httpMock.expectOne('https://api.tidepool.org/auth/login');
      req.flush(mockCredentialsResponse, {
        headers: {
          'x-tidepool-session-token': 'session_token_auth_state',
        },
      });

      await loginPromise;

      // ASSERT - Check final auth state
      const finalState = authStates[authStates.length - 1];
      expect(finalState).toMatchObject({
        isAuthenticated: true,
        isLoading: false,
        error: null,
        userId: '1234567890',
        email: 'test@tidepool.org',
      });
    });

    it('should handle 401 as invalid credentials error', async () => {
      // ACT
      const loginPromise = service.loginWithCredentials('test@tidepool.org', 'wrong_password');

      const req = httpMock.expectOne('https://api.tidepool.org/auth/login');
      req.flush({ error: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });

      // ASSERT
      await expect(loginPromise).rejects.toThrow('Invalid email or password');

      // Verify error state
      const authStates: AuthState[] = [];
      service.authState.subscribe(state => authStates.push(state));
      const errorState = authStates[authStates.length - 1];
      expect(errorState.error).toContain('Invalid email or password');
      expect(errorState.isLoading).toBe(false);
    });

    it('should handle missing session token in response', async () => {
      // ACT
      const loginPromise = service.loginWithCredentials('test@tidepool.org', 'password123');

      const req = httpMock.expectOne('https://api.tidepool.org/auth/login');
      // Respond without session token header
      req.flush(mockCredentialsResponse);

      // ASSERT
      await expect(loginPromise).rejects.toThrow('No session token received from Tidepool');
    });
  });

  describe('OAuth Login Flow', () => {
    it('should open Browser with authorization URL on native platform', async () => {
      // ARRANGE
      vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);

      // ACT
      await service.login();

      // ASSERT
      expect(Browser.open).toHaveBeenCalledOnce();
      const callArgs = vi.mocked(Browser.open).mock.calls[0][0];
      expect(callArgs.url).toContain('https://api.tidepool.org/v1/oauth2/authorize');
      expect(callArgs.url).toContain('client_id=');
      expect(callArgs.url).toContain('redirect_uri=');
      expect(callArgs.url).toContain('code_challenge=');
      expect(callArgs.url).toContain('state=');
    });

    it('should generate PKCE challenge and state parameters', async () => {
      // ARRANGE
      vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);

      // ACT
      await service.login();

      // ASSERT
      expect(Browser.open).toHaveBeenCalledOnce();
      const callArgs = vi.mocked(Browser.open).mock.calls[0][0];
      const url = new URL(callArgs.url);
      expect(url.searchParams.get('code_challenge')).toBeTruthy();
      expect(url.searchParams.get('code_challenge_method')).toBe('S256');
      expect(url.searchParams.get('state')).toBeTruthy();
      expect(url.searchParams.get('state')?.length).toBeGreaterThan(20);
    });

    it('should show message for web platform (not mobile)', async () => {
      // ARRANGE
      vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(false);

      // ACT
      await service.login();

      // ASSERT - Browser opened to Tidepool web app
      expect(Browser.open).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'https://app.tidepool.org',
        })
      );

      // Verify error state set
      const authStates: AuthState[] = [];
      service.authState.subscribe(state => authStates.push(state));
      const finalState = authStates[authStates.length - 1];
      expect(finalState.error).toContain('solo funciona en la app móvil');
    });
  });

  describe('Token Exchange (OAuth Callback)', () => {
    it('should send code and code_verifier to token endpoint', async () => {
      // ARRANGE - Simulate OAuth flow by triggering deep link handler
      vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);

      // Start login to set up PKCE state
      await service.login();

      // ACT - Simulate deep link callback
      const deepLinkUrl = 'diabetactic://oauth-callback?code=auth_code_123&state=test_state';

      // Trigger the deep link handler manually (normally called by Capacitor)
      // We need to access the private handler, so we'll trigger via App listener
      const appListener = vi.mocked(App.addListener).mock.calls.find(
        call => call[0] === 'appUrlOpen'
      );
      expect(appListener).toBeDefined();

      const handler = appListener![1] as (event: { url: string }) => void;
      handler({ url: deepLinkUrl });

      // ASSERT - Token exchange request
      const req = httpMock.expectOne('https://api.tidepool.org/v1/oauth2/token');
      expect(req.request.method).toBe('POST');
      expect(req.request.headers.get('Content-Type')).toBe('application/x-www-form-urlencoded');

      const body = req.request.body;
      expect(body).toContain('grant_type=authorization_code');
      expect(body).toContain('code=auth_code_123');
      expect(body).toContain('code_verifier=');

      req.flush(mockTokenResponse);
    });

    it('should store tokens after successful exchange', async () => {
      // ARRANGE
      vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
      await service.login();

      // ACT - Simulate callback
      const appListener = vi.mocked(App.addListener).mock.calls.find(
        call => call[0] === 'appUrlOpen'
      );
      const handler = appListener![1] as (event: { url: string }) => void;
      handler({ url: 'diabetactic://oauth-callback?code=auth_code_456&state=test_state' });

      const req = httpMock.expectOne('https://api.tidepool.org/v1/oauth2/token');
      req.flush(mockTokenResponse);

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 100));

      // ASSERT
      expect(mockTokenStorage.storeAuth).toHaveBeenCalledOnce();
      const storedAuth = mockTokenStorage.storeAuth.mock.calls[0][0];
      expect(storedAuth).toMatchObject({
        accessToken: 'mock_access_token_abc123',
        refreshToken: 'mock_refresh_token_xyz789',
        tokenType: 'Bearer',
      });
    });

    it('should decode ID token and extract sub and email claims', async () => {
      // ARRANGE
      vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
      await service.login();

      // ACT
      const appListener = vi.mocked(App.addListener).mock.calls.find(
        call => call[0] === 'appUrlOpen'
      );
      const handler = appListener![1] as (event: { url: string }) => void;
      handler({ url: 'diabetactic://oauth-callback?code=code_789&state=test_state' });

      const req = httpMock.expectOne('https://api.tidepool.org/v1/oauth2/token');
      req.flush(mockTokenResponse);

      await new Promise(resolve => setTimeout(resolve, 100));

      // ASSERT - ID token claims extracted
      const storedAuth = mockTokenStorage.storeAuth.mock.calls[0][0];
      expect(storedAuth.userId).toBe('1234567890'); // sub claim from JWT
      expect(storedAuth.email).toBe('test@tidepool.org'); // email claim from JWT
    });
  });

  describe('Token Refresh', () => {
    it('should send refresh_token grant to token endpoint', async () => {
      // ARRANGE
      mockTokenStorage.getRefreshToken.mockResolvedValue('existing_refresh_token');

      // ACT
      const refreshPromise = service.refreshAccessToken();

      // ASSERT
      const req = httpMock.expectOne('https://api.tidepool.org/v1/oauth2/token');
      expect(req.request.method).toBe('POST');

      const body = req.request.body;
      expect(body).toContain('grant_type=refresh_token');
      expect(body).toContain('refresh_token=existing_refresh_token');

      req.flush(mockTokenResponse);
      await refreshPromise;
    });

    it('should update stored tokens after refresh', async () => {
      // ARRANGE
      mockTokenStorage.getRefreshToken.mockResolvedValue('existing_refresh_token');

      // ACT
      const refreshPromise = service.refreshAccessToken();

      const req = httpMock.expectOne('https://api.tidepool.org/v1/oauth2/token');
      req.flush(mockTokenResponse);

      const newToken = await refreshPromise;

      // ASSERT
      expect(newToken).toBe('mock_access_token_abc123');
      expect(mockTokenStorage.storeAuth).toHaveBeenCalledWith(
        expect.objectContaining({
          accessToken: 'mock_access_token_abc123',
          refreshToken: 'mock_refresh_token_xyz789',
        })
      );
    });

    it('should clear session if refresh fails', async () => {
      // ARRANGE
      mockTokenStorage.getRefreshToken.mockResolvedValue('invalid_refresh_token');

      // ACT
      const refreshPromise = service.refreshAccessToken();

      const req = httpMock.expectOne('https://api.tidepool.org/v1/oauth2/token');
      req.flush({ error: 'invalid_grant' }, { status: 401, statusText: 'Unauthorized' });

      // ASSERT
      await expect(refreshPromise).rejects.toThrow('Session expired. Please log in again.');
      expect(mockTokenStorage.clearAll).toHaveBeenCalledOnce();
    });
  });

  describe('Session Restoration', () => {
    it('should check for stored refresh token on initialization', async () => {
      // Note: Service is already initialized in beforeEach
      // Verify that hasRefreshToken was called during initialization
      expect(mockTokenStorage.hasRefreshToken).toHaveBeenCalled();
    });

    it('should auto-refresh if refresh token exists', async () => {
      // ARRANGE - Re-initialize service with stored refresh token
      mockTokenStorage.hasRefreshToken.mockResolvedValue(true);
      mockTokenStorage.hasValidAccessToken.mockResolvedValue(false);
      mockTokenStorage.getRefreshToken.mockResolvedValue('stored_refresh_token');

      // Create new service instance to trigger initialization
      const newService = TestBed.inject(TidepoolAuthService);

      // Wait for initialization
      await new Promise(resolve => setTimeout(resolve, 100));

      // ASSERT - Token refresh triggered
      const reqs = httpMock.match('https://api.tidepool.org/v1/oauth2/token');
      expect(reqs.length).toBeGreaterThan(0);

      // Flush the request
      reqs[0].flush(mockTokenResponse);
    });
  });

  describe('Logout', () => {
    it('should clear all tokens via TokenStorageService', async () => {
      // ACT
      await service.logout();

      // ASSERT
      expect(mockTokenStorage.clearAll).toHaveBeenCalledOnce();
    });

    it('should update authState to unauthenticated', async () => {
      // ARRANGE - Subscribe to auth state
      const authStates: AuthState[] = [];
      service.authState.subscribe(state => authStates.push(state));

      // ACT
      await service.logout();

      // ASSERT
      const finalState = authStates[authStates.length - 1];
      expect(finalState).toMatchObject({
        isAuthenticated: false,
        isLoading: false,
        error: null,
        userId: null,
        email: null,
      });
    });
  });

  describe('Token Access', () => {
    it('should return valid token if not expired', async () => {
      // ARRANGE
      mockTokenStorage.hasValidAccessToken.mockResolvedValue(true);
      mockTokenStorage.getAccessToken.mockResolvedValue('valid_access_token');

      // ACT
      const token = await service.getAccessToken();

      // ASSERT
      expect(token).toBe('valid_access_token');
      expect(mockTokenStorage.hasValidAccessToken).toHaveBeenCalledOnce();
    });

    it('should refresh token if expired', async () => {
      // ARRANGE
      mockTokenStorage.hasValidAccessToken.mockResolvedValue(false);
      mockTokenStorage.hasRefreshToken.mockResolvedValue(true);
      mockTokenStorage.getRefreshToken.mockResolvedValue('refresh_token_123');

      // ACT
      const tokenPromise = service.getAccessToken();

      const req = httpMock.expectOne('https://api.tidepool.org/v1/oauth2/token');
      req.flush(mockTokenResponse);

      const token = await tokenPromise;

      // ASSERT
      expect(token).toBe('mock_access_token_abc123');
    });
  });

  describe('Deep Link Parsing and CSRF Protection', () => {
    it('should parse authorization code from callback URL', async () => {
      // ARRANGE
      vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
      await service.login();

      // ACT
      const appListener = vi.mocked(App.addListener).mock.calls.find(
        call => call[0] === 'appUrlOpen'
      );
      const handler = appListener![1] as (event: { url: string }) => void;
      handler({ url: 'diabetactic://oauth-callback?code=parsed_code_123&state=test_state' });

      // ASSERT
      const req = httpMock.expectOne('https://api.tidepool.org/v1/oauth2/token');
      expect(req.request.body).toContain('code=parsed_code_123');
      req.flush(mockTokenResponse);
    });

    it('should validate state parameter for CSRF protection', async () => {
      // ARRANGE
      vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
      await service.login();

      // Get the generated state from the login call
      const browserCall = vi.mocked(Browser.open).mock.calls[0][0];
      const authUrl = new URL(browserCall.url);
      const validState = authUrl.searchParams.get('state');

      // ACT - Use invalid state
      const appListener = vi.mocked(App.addListener).mock.calls.find(
        call => call[0] === 'appUrlOpen'
      );
      const handler = appListener![1] as (event: { url: string }) => void;
      handler({ url: `diabetactic://oauth-callback?code=code_123&state=invalid_state` });

      // Wait for error handling
      await new Promise(resolve => setTimeout(resolve, 100));

      // ASSERT - No token exchange request (validation failed)
      httpMock.expectNone('https://api.tidepool.org/v1/oauth2/token');

      // Error logged
      expect(mockLogger.error).toHaveBeenCalledWith(
        'TidepoolAuth',
        'OAuth callback error',
        expect.any(Error)
      );
    });

    it('should handle error in callback URL', async () => {
      // ARRANGE
      vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
      await service.login();

      // ACT
      const appListener = vi.mocked(App.addListener).mock.calls.find(
        call => call[0] === 'appUrlOpen'
      );
      const handler = appListener![1] as (event: { url: string }) => void;
      handler({
        url: 'diabetactic://oauth-callback?error=access_denied&error_description=User%20cancelled',
      });

      // Wait for error handling
      await new Promise(resolve => setTimeout(resolve, 100));

      // ASSERT - No token exchange
      httpMock.expectNone('https://api.tidepool.org/v1/oauth2/token');

      // Verify error logged
      expect(mockLogger.error).toHaveBeenCalledWith(
        'TidepoolAuth',
        'OAuth callback error',
        expect.objectContaining({
          message: expect.stringContaining('User cancelled'),
        })
      );
    });
  });
});
