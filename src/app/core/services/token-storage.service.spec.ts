// Initialize TestBed environment for Vitest
import '../../../test-setup';

import { type Mock } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { SecureStorage } from '@aparajita/capacitor-secure-storage';

import { TokenStorageService } from '@services/token-storage.service';
import { TidepoolAuth } from '@models/tidepool-auth.model';
import { OAUTH_CONSTANTS } from '@core/config/oauth.config';

// Mock SecureStorage
vi.mock('@aparajita/capacitor-secure-storage', () => ({
  SecureStorage: {
    get: vi.fn(),
    set: vi.fn(),
    remove: vi.fn(),
    clear: vi.fn(),
  },
}));

describe('TokenStorageService', () => {
  let service: TokenStorageService;

  const mockAuth: TidepoolAuth = {
    accessToken: 'test-access-token-abc123',
    refreshToken: 'test-refresh-token-xyz789',
    tokenType: 'Bearer',
    issuedAt: Date.now(),
    expiresAt: Date.now() + 3600000,
    userId: 'test-user-id-123',
    email: 'test@example.com',
    scope: 'openid profile email',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (SecureStorage.get as Mock).mockResolvedValue(null);
    (SecureStorage.set as Mock).mockResolvedValue(undefined);
    (SecureStorage.remove as Mock).mockResolvedValue(undefined);
    (SecureStorage.clear as Mock).mockResolvedValue(undefined);

    TestBed.configureTestingModule({
      providers: [TokenStorageService],
    });
    service = TestBed.inject(TokenStorageService);
  });

  // ============================================================================
  // STORE AUTH TESTS
  // ============================================================================

  describe('storeAuth', () => {
    it('should store access token in memory only (not SecureStorage)', async () => {
      await service.storeAuth(mockAuth);

      const accessToken = await service.getAccessToken();
      expect(accessToken).toBe('test-access-token-abc123');

      const setCalls = (SecureStorage.set as Mock).mock.calls;
      const accessTokenStored = setCalls.some(call => call[0] === 'tidepool_access_token');
      expect(accessTokenStored).toBe(false);
    });

    it('should store refresh token and auth data in SecureStorage', async () => {
      await service.storeAuth(mockAuth);

      expect(SecureStorage.set).toHaveBeenCalledWith(
        'tidepool_refresh_token_encrypted',
        'test-refresh-token-xyz789'
      );
      expect(SecureStorage.set).toHaveBeenCalledWith(
        'tidepool_auth_encrypted',
        JSON.stringify(mockAuth)
      );
    });

    it('should store token metadata with correct structure', async () => {
      await service.storeAuth(mockAuth);

      const metadataCall = (SecureStorage.set as Mock).mock.calls.find(
        call => call[0] === 'tidepool_token_metadata'
      );
      const metadata = JSON.parse(metadataCall[1]);

      expect(metadata).toHaveProperty('accessTokenExpiry');
      expect(metadata).toHaveProperty('refreshTokenExpiry');
      expect(metadata).toHaveProperty('lastRefresh');
      expect(metadata.accessTokenExpiry).toBe(mockAuth.expiresAt);
    });

    it('should handle missing refresh token and storage errors', async () => {
      // Missing refresh token - should not store
      const authWithoutRefresh = { ...mockAuth, refreshToken: '' };
      await service.storeAuth(authWithoutRefresh);

      const refreshTokenCalls = (SecureStorage.set as Mock).mock.calls.filter(
        call => call[0] === 'tidepool_refresh_token_encrypted'
      );
      expect(refreshTokenCalls).toHaveLength(0);

      // Storage error - should throw generic message
      vi.clearAllMocks();
      (SecureStorage.set as Mock).mockRejectedValueOnce(new Error('Encryption key not found'));

      await expect(service.storeAuth(mockAuth)).rejects.toThrow('Token storage failed');
    });
  });

  // ============================================================================
  // GET ACCESS TOKEN TESTS
  // ============================================================================

  describe('getAccessToken', () => {
    it('should return token when valid and null when expired/missing', async () => {
      // Valid token
      await service.storeAuth(mockAuth);
      expect(await service.getAccessToken()).toBe('test-access-token-abc123');

      // Fresh service with no token
      const freshService = new TokenStorageService();
      expect(await freshService.getAccessToken()).toBeNull();

      // Expired token
      const expiredAuth = { ...mockAuth, expiresAt: Date.now() - 1000 };
      await service.storeAuth(expiredAuth);
      expect(await service.getAccessToken()).toBeNull();

      // Token near expiry (1 second away) should still be valid
      const almostExpiredAuth = { ...mockAuth, expiresAt: Date.now() + 1000 };
      await service.storeAuth(almostExpiredAuth);
      expect(await service.getAccessToken()).toBe('test-access-token-abc123');
    });
  });

  // ============================================================================
  // GET REFRESH TOKEN TESTS
  // ============================================================================

  describe('getRefreshToken', () => {
    it('should retrieve refresh token from SecureStorage', async () => {
      (SecureStorage.get as Mock).mockResolvedValueOnce('stored-refresh-token');

      const token = await service.getRefreshToken();

      expect(token).toBe('stored-refresh-token');
      expect(SecureStorage.get).toHaveBeenCalledWith('tidepool_refresh_token_encrypted');
    });

    it('should return null for missing, empty, or errored storage', async () => {
      // Missing
      (SecureStorage.get as Mock).mockResolvedValueOnce(null);
      expect(await service.getRefreshToken()).toBeNull();

      // Empty string
      (SecureStorage.get as Mock).mockResolvedValueOnce('');
      expect(await service.getRefreshToken()).toBeNull();

      // Storage error
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation();
      (SecureStorage.get as Mock).mockRejectedValueOnce(new Error('Decryption failed'));
      expect(await service.getRefreshToken()).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to retrieve refresh token');
      consoleErrorSpy.mockRestore();
    });
  });

  // ============================================================================
  // GET AUTH DATA TESTS
  // ============================================================================

  describe('getAuthData', () => {
    it('should retrieve and parse auth data from SecureStorage', async () => {
      (SecureStorage.get as Mock).mockResolvedValueOnce(JSON.stringify(mockAuth));

      const authData = await service.getAuthData();

      expect(authData).toEqual(mockAuth);
      expect(SecureStorage.get).toHaveBeenCalledWith('tidepool_auth_encrypted');
    });

    it('should return null for missing, empty, malformed, or errored storage', async () => {
      // Missing
      (SecureStorage.get as Mock).mockResolvedValueOnce(null);
      expect(await service.getAuthData()).toBeNull();

      // Empty string
      (SecureStorage.get as Mock).mockResolvedValueOnce('');
      expect(await service.getAuthData()).toBeNull();

      // Malformed JSON
      (SecureStorage.get as Mock).mockResolvedValueOnce('invalid json {');
      expect(await service.getAuthData()).toBeNull();

      // Storage error
      (SecureStorage.get as Mock).mockRejectedValueOnce(new Error('Storage error'));
      expect(await service.getAuthData()).toBeNull();
    });
  });

  // ============================================================================
  // UPDATE AND CLEAR ACCESS TOKEN TESTS
  // ============================================================================

  describe('updateAccessToken', () => {
    it('should update in-memory token without persisting to storage', async () => {
      const newToken = 'new-access-token-def456';
      service.updateAccessToken(newToken, 7200);

      expect(await service.getAccessToken()).toBe(newToken);
      expect(await service.hasValidAccessToken()).toBe(true);
      expect(SecureStorage.set).not.toHaveBeenCalled();
    });
  });

  describe('clearAccessToken', () => {
    it('should clear in-memory token without affecting SecureStorage', async () => {
      await service.storeAuth(mockAuth);
      vi.clearAllMocks();

      service.clearAccessToken();

      expect(await service.getAccessToken()).toBeNull();
      expect(SecureStorage.remove).not.toHaveBeenCalled();
      expect(SecureStorage.clear).not.toHaveBeenCalled();

      // Should be idempotent
      service.clearAccessToken();
      service.clearAccessToken();
    });
  });

  // ============================================================================
  // CLEAR ALL TESTS
  // ============================================================================

  describe('clearAll', () => {
    it('should clear in-memory token and all SecureStorage keys', async () => {
      await service.storeAuth(mockAuth);
      vi.clearAllMocks();

      await service.clearAll();

      expect(await service.getAccessToken()).toBeNull();
      expect(SecureStorage.remove).toHaveBeenCalledWith('tidepool_refresh_token_encrypted');
      expect(SecureStorage.remove).toHaveBeenCalledWith('tidepool_auth_encrypted');
      expect(SecureStorage.remove).toHaveBeenCalledWith('tidepool_token_metadata');
      expect(SecureStorage.remove).toHaveBeenCalledTimes(3);
    });

    it('should propagate storage errors', async () => {
      const originalError = new Error('Storage unavailable');
      (SecureStorage.remove as Mock).mockRejectedValueOnce(originalError);

      await expect(service.clearAll()).rejects.toBe(originalError);
    });
  });

  // ============================================================================
  // HAS VALID ACCESS TOKEN TESTS
  // ============================================================================

  describe('hasValidAccessToken', () => {
    it('should validate token existence, expiry, and buffer', async () => {
      // No token
      expect(await service.hasValidAccessToken()).toBe(false);

      // Valid token with default buffer
      const validAuth = { ...mockAuth, expiresAt: Date.now() + 300000 };
      await service.storeAuth(validAuth);
      expect(await service.hasValidAccessToken()).toBe(true);

      // Expired token
      const expiredAuth = { ...mockAuth, expiresAt: Date.now() - 1000 };
      await service.storeAuth(expiredAuth);
      expect(await service.hasValidAccessToken()).toBe(false);

      // Custom buffer: token expires in 45s, default 60s buffer fails, 30s/0s buffers pass
      const tokenExpiresIn45Seconds = { ...mockAuth, expiresAt: Date.now() + 45000 };
      await service.storeAuth(tokenExpiresIn45Seconds);
      expect(await service.hasValidAccessToken()).toBe(false); // Default 60s buffer
      expect(await service.hasValidAccessToken(30)).toBe(true); // 30s buffer
      expect(await service.hasValidAccessToken(0)).toBe(true); // No buffer
    });
  });

  // ============================================================================
  // HAS REFRESH TOKEN TESTS
  // ============================================================================

  describe('hasRefreshToken', () => {
    it('should detect presence of refresh token in various states', async () => {
      const testCases = [
        { mockValue: 'refresh-token-abc', expected: true, description: 'present' },
        { mockValue: null, expected: false, description: 'missing' },
        { mockValue: '', expected: false, description: 'empty' },
      ];

      for (const { mockValue, expected } of testCases) {
        (SecureStorage.get as Mock).mockResolvedValueOnce(mockValue);
        expect(await service.hasRefreshToken()).toBe(expected);
      }

      // Storage error
      (SecureStorage.get as Mock).mockRejectedValueOnce(new Error('Storage error'));
      expect(await service.hasRefreshToken()).toBe(false);
    });
  });

  // ============================================================================
  // VALIDATE TOKEN TESTS
  // ============================================================================

  describe('validateToken', () => {
    it('should validate token states and calculate expiry correctly', async () => {
      // Valid access token
      const validAuth = { ...mockAuth, expiresAt: Date.now() + 300000 };
      await service.storeAuth(validAuth);
      let validation = await service.validateToken();
      expect(validation.valid).toBe(true);
      expect(validation.expired).toBe(false);
      expect(validation.shouldRefresh).toBe(false);
      expect(validation.expiresIn).toBeGreaterThan(240);

      // Only refresh token exists (access token expired)
      service.clearAccessToken(); // Clear in-memory access token
      vi.clearAllMocks();
      (SecureStorage.get as Mock).mockResolvedValueOnce('refresh-token');
      validation = await service.validateToken();
      expect(validation.valid).toBe(true);
      expect(validation.expired).toBe(true);
      expect(validation.shouldRefresh).toBe(false); // No access token to refresh
      expect(validation.expiresIn).toBe(0);

      // No tokens exist
      (SecureStorage.get as Mock).mockResolvedValueOnce(null);
      validation = await service.validateToken();
      expect(validation.valid).toBe(false);
      expect(validation.expired).toBe(true);
      expect(validation.expiresIn).toBe(0);

      // Expiry calculation accuracy (5 minutes from now)
      const fiveMinutesFromNow = Date.now() + 300000;
      await service.storeAuth({ ...mockAuth, expiresAt: fiveMinutesFromNow });
      validation = await service.validateToken();
      expect(validation.expiresIn).toBeGreaterThan(298);
      expect(validation.expiresIn).toBeLessThan(302);
    });
  });

  // ============================================================================
  // SANITIZE FOR LOGGING TESTS
  // ============================================================================

  describe('sanitizeForLogging (static method)', () => {
    it('should mask tokens and sensitive fields', () => {
      // Token masking
      const tokenTests = [
        {
          input: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abc',
          expected: '***TOKEN***',
        },
        { input: 'a'.repeat(60), expected: '***TOKEN***' },
        { input: 'hello', expected: 'hello' },
      ];
      tokenTests.forEach(({ input, expected }) => {
        expect(TokenStorageService.sanitizeForLogging(input)).toBe(expected);
      });

      // Sensitive object fields (recursive and case-insensitive)
      const data = {
        user: {
          name: 'John',
          credentials: {
            accessToken: 'secret',
            password: 'pass123',
            clientSecret: 'very-secret',
          },
        },
        AccessToken: 'secret1',
        REFRESH_TOKEN: 'secret2',
        Password: 'secret3',
        CLIENT_SECRET: 'secret4',
        email: 'test@example.com',
      };

      const sanitized = TokenStorageService.sanitizeForLogging(data) as any;

      expect(sanitized.user.name).toBe('John');
      expect(sanitized.user.credentials.accessToken).toBe('***');
      expect(sanitized.user.credentials.password).toBe('***');
      expect(sanitized.user.credentials.clientSecret).toBe('***');
      expect(sanitized.AccessToken).toBe('***');
      expect(sanitized.REFRESH_TOKEN).toBe('***');
      expect(sanitized.Password).toBe('***');
      expect(sanitized.CLIENT_SECRET).toBe('***');
      expect(sanitized.email).toBe('test@example.com');

      // Primitives and edge cases
      expect(TokenStorageService.sanitizeForLogging(null)).toBeNull();
      expect(TokenStorageService.sanitizeForLogging(undefined)).toBeUndefined();
      expect(TokenStorageService.sanitizeForLogging(123)).toBe(123);
      expect(TokenStorageService.sanitizeForLogging(true)).toBe(true);
      expect(TokenStorageService.sanitizeForLogging(['normal', 'password123'])).toEqual({
        '0': 'normal',
        '1': 'password123',
      });
    });
  });

  // ============================================================================
  // SECURITY TESTS
  // ============================================================================

  describe('security and encryption', () => {
    it('should never persist access token directly to SecureStorage', async () => {
      await service.storeAuth(mockAuth);

      const setCalls = (SecureStorage.set as Mock).mock.calls;
      const accessTokenCalls = setCalls.filter(call => call[0].toLowerCase().includes('access'));
      expect(accessTokenCalls.length).toBe(0);
    });

    it('should not log sensitive token values in errors', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation();
      (SecureStorage.set as Mock).mockRejectedValueOnce(new Error('Encryption failed'));

      try {
        await service.storeAuth(mockAuth);
      } catch {
        const hasTokenInLog = consoleErrorSpy.mock.calls.some(call =>
          call.some(arg => typeof arg === 'string' && arg.includes('test-access-token'))
        );
        expect(hasTokenInLog).toBe(false);
      }

      consoleErrorSpy.mockRestore();
    });
  });

  // ============================================================================
  // EDGE CASES TESTS
  // ============================================================================

  describe('edge cases', () => {
    it('should handle optional fields and extreme token values', async () => {
      // Missing optional fields
      const authWithoutUserId = { ...mockAuth, userId: '' };
      await expect(service.storeAuth(authWithoutUserId)).resolves.not.toThrow();
      const authWithoutEmail = { ...mockAuth, email: undefined };
      await expect(service.storeAuth(authWithoutEmail)).resolves.not.toThrow();

      // Very long token strings
      const longToken = 'a'.repeat(10000);
      const authWithLongToken = { ...mockAuth, accessToken: longToken };
      await service.storeAuth(authWithLongToken);
      expect(await service.getAccessToken()).toBe(longToken);

      // Concurrent storeAuth calls
      const auth1 = { ...mockAuth, accessToken: 'token1' };
      const auth2 = { ...mockAuth, accessToken: 'token2' };
      await Promise.all([service.storeAuth(auth1), service.storeAuth(auth2)]);
      const token = await service.getAccessToken();
      expect(token).toBeTruthy();
    });

    it('should handle extreme expiry values', async () => {
      // Expiry at current time - should be null
      const authExpiringNow = { ...mockAuth, expiresAt: Date.now() };
      await service.storeAuth(authExpiringNow);
      expect(await service.getAccessToken()).toBeNull();

      // Negative expiry - should be null
      const authNegativeExpiry = { ...mockAuth, expiresAt: -1000 };
      await service.storeAuth(authNegativeExpiry);
      expect(await service.getAccessToken()).toBeNull();

      // Large buffer making valid token invalid
      const authValid = { ...mockAuth, expiresAt: Date.now() + 3600000 };
      await service.storeAuth(authValid);
      expect(await service.hasValidAccessToken(7200)).toBe(false);
    });
  });
});
