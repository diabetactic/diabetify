import { TestBed } from '@angular/core/testing';
import { HttpClient, HttpHeaders, HttpResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { TidepoolAuthService } from '@services/tidepool-auth.service';
import { TokenStorageService } from '@services/token-storage.service';
import { TidepoolAuth } from '@models/tidepool-auth.model';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';

// Helper to create mock HttpResponse with headers
function createMockHttpResponse<T>(
  body: T,
  headers: Record<string, string>,
  status = 200
): HttpResponse<T> {
  const httpHeaders = new HttpHeaders(headers);
  return new HttpResponse<T>({ body, headers: httpHeaders, status });
}

// Mock Capacitor modules
jest.mock('@capacitor/browser');
jest.mock('@capacitor/app', () => ({
  App: {
    addListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
    removeAllListeners: jest.fn().mockResolvedValue(undefined),
  },
}));
jest.mock('@capacitor/core');

describe('TidepoolAuthService', () => {
  let service: TidepoolAuthService;
  let httpMock: jest.Mocked<HttpClient>;
  let tokenStorageMock: jest.Mocked<TokenStorageService>;

  const mockAuthData: TidepoolAuth = {
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
    tokenType: 'Bearer',
    issuedAt: Date.now(),
    expiresAt: Date.now() + 3600000,
    userId: 'user123',
    email: 'test@example.com',
    scope: 'data:read data:write profile:read',
  };

  beforeEach(() => {
    httpMock = {
      post: jest.fn(),
    } as any;

    tokenStorageMock = {
      storeAuth: jest.fn().mockResolvedValue(undefined),
      getAccessToken: jest.fn().mockResolvedValue('mock-token'),
      getRefreshToken: jest.fn().mockResolvedValue('mock-refresh-token'),
      getAuthData: jest.fn().mockResolvedValue(mockAuthData),
      hasValidAccessToken: jest.fn().mockResolvedValue(true),
      hasRefreshToken: jest.fn().mockResolvedValue(true),
      clearAll: jest.fn().mockResolvedValue(undefined),
    } as any;

    // Mock Capacitor as non-native platform by default
    (Capacitor.isNativePlatform as jest.Mock) = jest.fn().mockReturnValue(false);
    (Browser.open as jest.Mock) = jest.fn().mockResolvedValue(undefined);
    (Browser.close as jest.Mock) = jest.fn().mockResolvedValue(undefined);
    // App.addListener is already mocked via the factory function at module level

    TestBed.configureTestingModule({
      providers: [
        TidepoolAuthService,
        { provide: HttpClient, useValue: httpMock },
        { provide: TokenStorageService, useValue: tokenStorageMock },
      ],
    });

    service = TestBed.inject(TidepoolAuthService);
  });

  describe('loginWithCredentials', () => {
    it('should successfully login with valid credentials', async () => {
      const mockBody = { userid: 'user123', username: 'test@example.com' };
      const mockHeaders = { 'x-tidepool-session-token': 'session-token-123' };

      httpMock.post.mockReturnValue(of(createMockHttpResponse(mockBody, mockHeaders)));

      await service.loginWithCredentials('test@example.com', 'password123');

      expect(httpMock.post).toHaveBeenCalledWith(
        'https://api.tidepool.org/auth/login',
        null,
        expect.objectContaining({
          headers: expect.any(HttpHeaders),
          observe: 'response',
        })
      );

      expect(tokenStorageMock.storeAuth).toHaveBeenCalledWith(
        expect.objectContaining({
          accessToken: 'session-token-123',
          userId: 'user123',
          email: 'test@example.com',
        })
      );
    });

    it('should handle invalid credentials', async () => {
      httpMock.post.mockReturnValue(
        throwError(() => ({ status: 401, message: 'Invalid credentials' }))
      );

      await expect(
        service.loginWithCredentials('test@example.com', 'wrongpassword')
      ).rejects.toThrow('Invalid email or password');
    });

    it('should handle missing session token', async () => {
      const mockBody = { userid: 'user123' };
      httpMock.post.mockReturnValue(of(createMockHttpResponse(mockBody, {})));

      await expect(service.loginWithCredentials('test@example.com', 'password123')).rejects.toThrow(
        'No session token received from Tidepool'
      );
    });

    it('should handle missing user ID', async () => {
      const mockHeaders = { 'x-tidepool-session-token': 'token' };
      httpMock.post.mockReturnValue(of(createMockHttpResponse({}, mockHeaders)));

      await expect(service.loginWithCredentials('test@example.com', 'password123')).rejects.toThrow(
        'No user ID received from Tidepool'
      );
    });

    it('should update auth state on successful login', async () => {
      const mockBody = { userid: 'user123', username: 'test@example.com' };
      const mockHeaders = { 'x-tidepool-session-token': 'token' };

      httpMock.post.mockReturnValue(of(createMockHttpResponse(mockBody, mockHeaders)));

      await service.loginWithCredentials('test@example.com', 'password123');

      service.authState.subscribe(state => {
        expect(state.isAuthenticated).toBe(true);
        expect(state.userId).toBe('user123');
        expect(state.email).toBe('test@example.com');
        expect(state.isLoading).toBe(false);
        expect(state.error).toBeNull();
      });
    });
  });

  describe('login (OAuth)', () => {
    it('should redirect to Tidepool web app on non-native platform', async () => {
      (Capacitor.isNativePlatform as jest.Mock).mockReturnValue(false);

      await service.login();

      expect(Browser.open).toHaveBeenCalledWith({
        url: 'https://app.tidepool.org',
        presentationStyle: 'popover',
      });
    });

    it('should start OAuth flow on native platform', async () => {
      (Capacitor.isNativePlatform as jest.Mock).mockReturnValue(true);

      await service.login();

      // The OAuth flow builds a URL with auth endpoint and query params
      expect(Browser.open).toHaveBeenCalledWith(
        expect.objectContaining({
          url: expect.stringMatching(/\/auth\?|\/protocol\/openid-connect\/auth/),
          presentationStyle: 'popover',
        })
      );
    });

    it('should handle browser open errors', async () => {
      (Capacitor.isNativePlatform as jest.Mock).mockReturnValue(true);
      (Browser.open as jest.Mock).mockRejectedValue(new Error('Browser error'));

      await expect(service.login()).rejects.toThrow();
    });
  });

  describe('refreshAccessToken', () => {
    it('should refresh access token successfully', async () => {
      const mockTokenResponse = {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        expires_in: 3600,
        scope: 'data:read data:write',
        id_token:
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyMTIzIiwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIn0.test',
      };

      httpMock.post.mockReturnValue(of(mockTokenResponse));

      const newToken = await service.refreshAccessToken();

      expect(newToken).toBe('new-access-token');
      expect(tokenStorageMock.storeAuth).toHaveBeenCalled();
    });

    it('should logout if refresh token is missing', async () => {
      tokenStorageMock.getRefreshToken.mockResolvedValue(null);

      await expect(service.refreshAccessToken()).rejects.toThrow(
        'Session expired. Please log in again.'
      );
    });

    it('should logout if refresh fails', async () => {
      httpMock.post.mockReturnValue(throwError(() => new Error('Refresh failed')));

      await expect(service.refreshAccessToken()).rejects.toThrow('Session expired');

      service.authState.subscribe(state => {
        expect(state.isAuthenticated).toBe(false);
      });
    });
  });

  describe('getAccessToken', () => {
    it('should return valid token if available', async () => {
      tokenStorageMock.hasValidAccessToken.mockResolvedValue(true);
      tokenStorageMock.getAccessToken.mockResolvedValue('valid-token');

      const token = await service.getAccessToken();

      expect(token).toBe('valid-token');
    });

    it('should refresh token if expired', async () => {
      tokenStorageMock.hasValidAccessToken.mockResolvedValue(false);
      tokenStorageMock.hasRefreshToken.mockResolvedValue(true);

      const mockTokenResponse = {
        access_token: 'refreshed-token',
        refresh_token: 'new-refresh',
        expires_in: 3600,
        id_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyMTIzIn0.test',
      };

      httpMock.post.mockReturnValue(of(mockTokenResponse));

      const token = await service.getAccessToken();

      expect(token).toBe('refreshed-token');
    });

    it('should return null if no tokens available', async () => {
      tokenStorageMock.hasValidAccessToken.mockResolvedValue(false);
      tokenStorageMock.hasRefreshToken.mockResolvedValue(false);

      const token = await service.getAccessToken();

      expect(token).toBeNull();
    });
  });

  describe('logout', () => {
    it('should clear all tokens and update auth state', async () => {
      await service.logout();

      expect(tokenStorageMock.clearAll).toHaveBeenCalled();

      service.authState.subscribe(state => {
        expect(state.isAuthenticated).toBe(false);
        expect(state.userId).toBeNull();
        expect(state.email).toBeNull();
      });
    });

    it('should handle logout errors', async () => {
      tokenStorageMock.clearAll.mockRejectedValue(new Error('Clear failed'));

      await expect(service.logout()).rejects.toThrow('Clear failed');
    });
  });

  describe('isAuthenticated', () => {
    it('should return true if valid token exists', async () => {
      tokenStorageMock.hasValidAccessToken.mockResolvedValue(true);
      tokenStorageMock.getAccessToken.mockResolvedValue('valid-token');

      const result = await service.isAuthenticated();

      expect(result).toBe(true);
    });

    it('should return false if no token', async () => {
      tokenStorageMock.hasValidAccessToken.mockResolvedValue(false);
      tokenStorageMock.hasRefreshToken.mockResolvedValue(false);

      const result = await service.isAuthenticated();

      expect(result).toBe(false);
    });
  });

  describe('decodeIdToken', () => {
    it('should decode valid JWT token', () => {
      // JWT: { "sub": "user123", "email": "test@example.com" }
      const token =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyMTIzIiwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

      const decoded = service['decodeIdToken'](token);

      expect(decoded['sub']).toBe('user123');
      expect(decoded['email']).toBe('test@example.com');
    });

    it('should return empty object for invalid token', () => {
      const decoded = service['decodeIdToken']('invalid-token');

      expect(decoded).toEqual({});
    });
  });

  describe('auth state observable', () => {
    it('should emit auth state changes', done => {
      let emissionCount = 0;

      service.authState.subscribe(state => {
        emissionCount++;
        if (emissionCount === 2) {
          // Initial + after login
          expect(state.isAuthenticated).toBeDefined();
          done();
        }
      });

      // Trigger state change
      service['updateAuthState']({ isAuthenticated: true });
    });
  });
});
