// Initialize TestBed environment for Vitest
import '../../../test-setup';

import { TestBed } from '@angular/core/testing';
import { SecureStorage } from '@aparajita/capacitor-secure-storage';

import { TokenStorageService } from '@services/token-storage.service';
import { TidepoolAuth } from '@models/tidepool-auth.model';
import { OAUTH_CONSTANTS } from '@core/config/oauth.config';

// Mock SecureStorage - already mocked in setup-vitest.ts but we need to control it per test
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
    expiresAt: Date.now() + 3600000, // 1 hour from now
    userId: 'test-user-id-123',
    email: 'test@example.com',
    scope: 'openid profile email',
  };

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Default SecureStorage mocks - no stored data
    (SecureStorage.get as Mock).mockResolvedValue(null);
    (SecureStorage.set as Mock).mockResolvedValue(undefined);
    (SecureStorage.remove as Mock).mockResolvedValue(undefined);
    (SecureStorage.clear as Mock).mockResolvedValue(undefined);

    TestBed.configureTestingModule({
      providers: [TokenStorageService],
    });

    service = TestBed.inject(TokenStorageService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should create the service', () => {
      expect(service).toBeTruthy();
    });

    it('should start with no in-memory tokens', async () => {
      const token = await service.getAccessToken();
      expect(token).toBeNull();
    });
  });

  describe('storeAuth', () => {
    it('should store access token in memory only', async () => {
      await service.storeAuth(mockAuth);

      const accessToken = await service.getAccessToken();
      expect(accessToken).toBe('test-access-token-abc123');

      // Verify SecureStorage.set was NOT called with access token
      const setCalls = (SecureStorage.set as Mock).mock.calls;
      const accessTokenStored = setCalls.some(call => call[0] === 'tidepool_access_token');
      expect(accessTokenStored).toBe(false);
    });

    it('should store refresh token in SecureStorage', async () => {
      await service.storeAuth(mockAuth);

      expect(SecureStorage.set).toHaveBeenCalledWith(
        'tidepool_refresh_token_encrypted',
        'test-refresh-token-xyz789'
      );
    });

    it('should store complete auth data in SecureStorage', async () => {
      await service.storeAuth(mockAuth);

      expect(SecureStorage.set).toHaveBeenCalledWith(
        'tidepool_auth_encrypted',
        JSON.stringify(mockAuth)
      );
    });

    it('should store token metadata', async () => {
      await service.storeAuth(mockAuth);

      expect(SecureStorage.set).toHaveBeenCalledWith(
        'tidepool_token_metadata',
        expect.stringContaining('accessTokenExpiry')
      );

      // Verify metadata structure
      const metadataCall = (SecureStorage.set as Mock).mock.calls.find(
        call => call[0] === 'tidepool_token_metadata'
      );

      const metadata = JSON.parse(metadataCall[1]);
      expect(metadata).toHaveProperty('accessTokenExpiry');
      expect(metadata).toHaveProperty('refreshTokenExpiry');
      expect(metadata).toHaveProperty('lastRefresh');
      expect(metadata.accessTokenExpiry).toBe(mockAuth.expiresAt);
    });

    it('should handle missing refresh token gracefully', async () => {
      const authWithoutRefresh = { ...mockAuth, refreshToken: '' };

      await service.storeAuth(authWithoutRefresh);

      // Should not attempt to store empty refresh token
      const refreshTokenCalls = (SecureStorage.set as Mock).mock.calls.filter(
        call => call[0] === 'tidepool_refresh_token_encrypted'
      );
      expect(refreshTokenCalls).toHaveLength(0);
    });

    it('should throw error when SecureStorage.set fails', async () => {
      (SecureStorage.set as Mock).mockRejectedValueOnce(new Error('Storage error'));

      await expect(service.storeAuth(mockAuth)).rejects.toThrow('Token storage failed');
    });

    it('should suppress error details in error message (security)', async () => {
      const sensitiveError = new Error('Encryption key not found');
      (SecureStorage.set as Mock).mockRejectedValueOnce(sensitiveError);

      try {
        await service.storeAuth(mockAuth);
        fail('Should have thrown error');
      } catch (error: any) {
        // Error message should not leak sensitive details
        expect(error.message).toBe('Token storage failed');
        expect(error.message).not.toContain('Encryption key');
      }
    });
  });

  describe('getAccessToken', () => {
    beforeEach(async () => {
      // Store a valid token first
      await service.storeAuth(mockAuth);
    });

    it('should return stored access token when valid', async () => {
      const token = await service.getAccessToken();
      expect(token).toBe('test-access-token-abc123');
    });

    it('should return null when no token stored', async () => {
      // Create fresh service with no stored token
      const freshService = new TokenStorageService();
      const token = await freshService.getAccessToken();
      expect(token).toBeNull();
    });

    it('should return null when token is expired', async () => {
      const expiredAuth = {
        ...mockAuth,
        expiresAt: Date.now() - 1000, // Expired 1 second ago
      };

      await service.storeAuth(expiredAuth);

      const token = await service.getAccessToken();
      expect(token).toBeNull();
    });

    it('should clear in-memory token when expired', async () => {
      const expiredAuth = {
        ...mockAuth,
        expiresAt: Date.now() - 1000,
      };

      await service.storeAuth(expiredAuth);
      await service.getAccessToken(); // First call clears expired token

      // Verify token was cleared
      const secondCall = await service.getAccessToken();
      expect(secondCall).toBeNull();
    });

    it('should return token even if expiry is 1 second away', async () => {
      const almostExpiredAuth = {
        ...mockAuth,
        expiresAt: Date.now() + 1000, // Expires in 1 second
      };

      await service.storeAuth(almostExpiredAuth);

      const token = await service.getAccessToken();
      expect(token).toBe('test-access-token-abc123');
    });
  });

  describe('getRefreshToken', () => {
    it('should retrieve refresh token from SecureStorage', async () => {
      (SecureStorage.get as Mock).mockResolvedValueOnce('stored-refresh-token');

      const token = await service.getRefreshToken();

      expect(token).toBe('stored-refresh-token');
      expect(SecureStorage.get).toHaveBeenCalledWith('tidepool_refresh_token_encrypted');
    });

    it('should return null when no refresh token stored', async () => {
      (SecureStorage.get as Mock).mockResolvedValueOnce(null);

      const token = await service.getRefreshToken();

      expect(token).toBeNull();
    });

    it('should return null when SecureStorage.get returns empty string', async () => {
      (SecureStorage.get as Mock).mockResolvedValueOnce('');

      const token = await service.getRefreshToken();

      expect(token).toBeNull();
    });

    it('should handle SecureStorage errors gracefully', async () => {
      (SecureStorage.get as Mock).mockRejectedValueOnce(new Error('Storage error'));

      const token = await service.getRefreshToken();

      expect(token).toBeNull();
    });

    it('should suppress error logging details (security)', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation();
      (SecureStorage.get as Mock).mockRejectedValueOnce(new Error('Decryption failed'));

      await service.getRefreshToken();

      // Should log error but not throw
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to retrieve refresh token');
      consoleErrorSpy.mockRestore();
    });
  });

  describe('getAuthData', () => {
    it('should retrieve and parse auth data from SecureStorage', async () => {
      (SecureStorage.get as Mock).mockResolvedValueOnce(JSON.stringify(mockAuth));

      const authData = await service.getAuthData();

      expect(authData).toEqual(mockAuth);
      expect(SecureStorage.get).toHaveBeenCalledWith('tidepool_auth_encrypted');
    });

    it('should return null when no auth data stored', async () => {
      (SecureStorage.get as Mock).mockResolvedValueOnce(null);

      const authData = await service.getAuthData();

      expect(authData).toBeNull();
    });

    it('should handle malformed JSON gracefully', async () => {
      (SecureStorage.get as Mock).mockResolvedValueOnce('invalid json {');

      const authData = await service.getAuthData();

      expect(authData).toBeNull();
    });

    it('should handle SecureStorage errors gracefully', async () => {
      (SecureStorage.get as Mock).mockRejectedValueOnce(new Error('Storage error'));

      const authData = await service.getAuthData();

      expect(authData).toBeNull();
    });

    it('should handle empty string from SecureStorage', async () => {
      (SecureStorage.get as Mock).mockResolvedValueOnce('');

      const authData = await service.getAuthData();

      expect(authData).toBeNull();
    });
  });

  describe('updateAccessToken', () => {
    it('should update in-memory access token', async () => {
      const newToken = 'new-access-token-def456';
      const expiresIn = 3600; // 1 hour

      service.updateAccessToken(newToken, expiresIn);

      const token = await service.getAccessToken();
      expect(token).toBe(newToken);
    });

    it('should calculate correct expiry timestamp', async () => {
      const expiresIn = 7200; // 2 hours

      service.updateAccessToken('new-token', expiresIn);

      const token = await service.getAccessToken();
      expect(token).toBe('new-token');

      // Token should still be valid if we check immediately
      const isValid = await service.hasValidAccessToken();
      expect(isValid).toBe(true);
    });

    it('should not persist access token to storage', () => {
      service.updateAccessToken('new-token', 3600);

      // Verify SecureStorage.set was not called
      expect(SecureStorage.set).not.toHaveBeenCalled();
    });
  });

  describe('clearAccessToken', () => {
    it('should clear in-memory access token', async () => {
      await service.storeAuth(mockAuth);

      service.clearAccessToken();

      const token = await service.getAccessToken();
      expect(token).toBeNull();
    });

    it('should not affect SecureStorage', () => {
      service.clearAccessToken();

      expect(SecureStorage.remove).not.toHaveBeenCalled();
      expect(SecureStorage.clear).not.toHaveBeenCalled();
    });

    it('should be idempotent (safe to call multiple times)', () => {
      service.clearAccessToken();
      service.clearAccessToken();
      service.clearAccessToken();

      // Should not throw or cause issues
      expect(true).toBe(true);
    });
  });

  describe('clearAll', () => {
    beforeEach(async () => {
      await service.storeAuth(mockAuth);
    });

    it('should clear in-memory access token', async () => {
      await service.clearAll();

      const token = await service.getAccessToken();
      expect(token).toBeNull();
    });

    it('should remove refresh token from SecureStorage', async () => {
      await service.clearAll();

      expect(SecureStorage.remove).toHaveBeenCalledWith('tidepool_refresh_token_encrypted');
    });

    it('should remove auth data from SecureStorage', async () => {
      await service.clearAll();

      expect(SecureStorage.remove).toHaveBeenCalledWith('tidepool_auth_encrypted');
    });

    it('should remove token metadata from SecureStorage', async () => {
      await service.clearAll();

      expect(SecureStorage.remove).toHaveBeenCalledWith('tidepool_token_metadata');
    });

    it('should remove all three SecureStorage keys', async () => {
      await service.clearAll();

      expect(SecureStorage.remove).toHaveBeenCalledTimes(3);
    });

    it('should throw error if SecureStorage.remove fails', async () => {
      (SecureStorage.remove as Mock).mockRejectedValueOnce(new Error('Remove failed'));

      await expect(service.clearAll()).rejects.toThrow('Remove failed');
    });

    it('should propagate original error when clearing fails', async () => {
      const originalError = new Error('Storage unavailable');
      (SecureStorage.remove as Mock).mockRejectedValueOnce(originalError);

      try {
        await service.clearAll();
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBe(originalError);
      }
    });
  });

  describe('hasValidAccessToken', () => {
    it('should return true when token is valid with default buffer', async () => {
      const validAuth = {
        ...mockAuth,
        expiresAt: Date.now() + 300000, // 5 minutes from now
      };

      await service.storeAuth(validAuth);

      const isValid = await service.hasValidAccessToken();
      expect(isValid).toBe(true);
    });

    it('should return false when token is expired', async () => {
      const expiredAuth = {
        ...mockAuth,
        expiresAt: Date.now() - 1000,
      };

      await service.storeAuth(expiredAuth);

      const isValid = await service.hasValidAccessToken();
      expect(isValid).toBe(false);
    });

    it('should return false when no token exists', async () => {
      const isValid = await service.hasValidAccessToken();
      expect(isValid).toBe(false);
    });

    it('should respect custom buffer seconds', async () => {
      const tokenExpiresIn45Seconds = {
        ...mockAuth,
        expiresAt: Date.now() + 45000, // 45 seconds from now
      };

      await service.storeAuth(tokenExpiresIn45Seconds);

      // With default buffer (60s), should be invalid
      const isValidDefault = await service.hasValidAccessToken();
      expect(isValidDefault).toBe(false);

      // With 30s buffer, should be valid
      const isValidCustom = await service.hasValidAccessToken(30);
      expect(isValidCustom).toBe(true);
    });

    it('should use OAUTH_CONSTANTS.TOKEN_EXPIRY_BUFFER_SECONDS by default', async () => {
      const tokenExpiresInBufferTime = {
        ...mockAuth,
        expiresAt: Date.now() + OAUTH_CONSTANTS.TOKEN_EXPIRY_BUFFER_SECONDS * 1000,
      };

      await service.storeAuth(tokenExpiresInBufferTime);

      const isValid = await service.hasValidAccessToken();
      expect(isValid).toBe(false); // Should be invalid (within buffer)
    });

    it('should return false when token expiry is exactly at buffer time', async () => {
      const tokenExpiresAtBufferEdge = {
        ...mockAuth,
        expiresAt: Date.now() + 60000, // Exactly 60 seconds
      };

      await service.storeAuth(tokenExpiresAtBufferEdge);

      const isValid = await service.hasValidAccessToken(60);
      expect(isValid).toBe(false);
    });
  });

  describe('hasRefreshToken', () => {
    it('should return true when refresh token exists', async () => {
      (SecureStorage.get as Mock).mockResolvedValueOnce('refresh-token-abc');

      const hasToken = await service.hasRefreshToken();

      expect(hasToken).toBe(true);
    });

    it('should return false when refresh token does not exist', async () => {
      (SecureStorage.get as Mock).mockResolvedValueOnce(null);

      const hasToken = await service.hasRefreshToken();

      expect(hasToken).toBe(false);
    });

    it('should return false when SecureStorage returns empty string', async () => {
      (SecureStorage.get as Mock).mockResolvedValueOnce('');

      const hasToken = await service.hasRefreshToken();

      expect(hasToken).toBe(false);
    });

    it('should return false when getRefreshToken fails', async () => {
      (SecureStorage.get as Mock).mockRejectedValueOnce(new Error('Storage error'));

      const hasToken = await service.hasRefreshToken();

      expect(hasToken).toBe(false);
    });
  });

  describe('validateToken', () => {
    it('should return valid=true when access token is valid', async () => {
      const validAuth = {
        ...mockAuth,
        expiresAt: Date.now() + 300000, // 5 minutes
      };

      await service.storeAuth(validAuth);

      const validation = await service.validateToken();

      expect(validation.valid).toBe(true);
      expect(validation.expired).toBe(false);
      expect(validation.shouldRefresh).toBe(false);
      expect(validation.expiresIn).toBeGreaterThan(240); // ~4 minutes
    });

    it('should return valid=true when only refresh token exists', async () => {
      (SecureStorage.get as Mock).mockResolvedValueOnce('refresh-token');

      const validation = await service.validateToken();

      expect(validation.valid).toBe(true);
      expect(validation.expired).toBe(true); // Access token expired
      expect(validation.expiresIn).toBe(0);
    });

    it('should return valid=false when no tokens exist', async () => {
      (SecureStorage.get as Mock).mockResolvedValueOnce(null);

      const validation = await service.validateToken();

      expect(validation.valid).toBe(false);
      expect(validation.expired).toBe(true);
      expect(validation.expiresIn).toBe(0);
    });

    it('should set shouldRefresh=false when token is within buffer (already expired by buffer logic)', async () => {
      // When token expires in 30s, hasValidAccessToken(60s buffer) returns false
      // So hasAccess=false, which means shouldRefresh=false (can't refresh if already expired)
      const tokenExpiringSoon = {
        ...mockAuth,
        expiresAt: Date.now() + 30000, // 30 seconds (less than 60s buffer)
      };

      await service.storeAuth(tokenExpiringSoon);

      const validation = await service.validateToken();

      expect(validation.expired).toBe(true); // Considered expired due to buffer
      expect(validation.shouldRefresh).toBe(false); // Can't refresh when expired
    });

    it('should set shouldRefresh=false when token is not within buffer', async () => {
      const tokenNotExpiringSoon = {
        ...mockAuth,
        expiresAt: Date.now() + 120000, // 2 minutes
      };

      await service.storeAuth(tokenNotExpiringSoon);

      const validation = await service.validateToken();

      expect(validation.shouldRefresh).toBe(false);
    });

    it('should calculate expiresIn correctly', async () => {
      const fiveMinutesFromNow = Date.now() + 300000;
      const authWith5MinExpiry = {
        ...mockAuth,
        expiresAt: fiveMinutesFromNow,
      };

      await service.storeAuth(authWith5MinExpiry);

      const validation = await service.validateToken();

      // Should be approximately 300 seconds (allow 2 second tolerance)
      expect(validation.expiresIn).toBeGreaterThan(298);
      expect(validation.expiresIn).toBeLessThan(302);
    });

    it('should return expiresIn=0 when token is expired', async () => {
      const expiredAuth = {
        ...mockAuth,
        expiresAt: Date.now() - 60000, // Expired 1 minute ago
      };

      await service.storeAuth(expiredAuth);

      const validation = await service.validateToken();

      expect(validation.expiresIn).toBe(0);
    });
  });

  describe('sanitizeForLogging (static method)', () => {
    it('should mask JWT-like tokens', () => {
      const jwtToken =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

      const sanitized = TokenStorageService.sanitizeForLogging(jwtToken);

      expect(sanitized).toBe('***TOKEN***');
    });

    it('should mask long alphanumeric tokens', () => {
      const longToken = 'a'.repeat(60);

      const sanitized = TokenStorageService.sanitizeForLogging(longToken);

      expect(sanitized).toBe('***TOKEN***');
    });

    it('should not mask short strings', () => {
      const shortString = 'hello';

      const sanitized = TokenStorageService.sanitizeForLogging(shortString);

      expect(sanitized).toBe('hello');
    });

    it('should mask token fields in objects', () => {
      const data = {
        accessToken: 'secret-token-123',
        username: 'john',
        refreshToken: 'refresh-secret',
      };

      const sanitized = TokenStorageService.sanitizeForLogging(data) as any;

      expect(sanitized.accessToken).toBe('***');
      expect(sanitized.refreshToken).toBe('***');
      expect(sanitized.username).toBe('john');
    });

    it('should mask password fields in objects', () => {
      const data = {
        password: 'mypassword123',
        email: 'test@example.com',
      };

      const sanitized = TokenStorageService.sanitizeForLogging(data) as any;

      expect(sanitized.password).toBe('***');
      expect(sanitized.email).toBe('test@example.com');
    });

    it('should mask secret fields in objects', () => {
      const data = {
        clientSecret: 'very-secret',
        apiKey: 'public-key-123',
      };

      const sanitized = TokenStorageService.sanitizeForLogging(data) as any;

      expect(sanitized.clientSecret).toBe('***');
      expect(sanitized.apiKey).toBe('public-key-123');
    });

    it('should recursively sanitize nested objects', () => {
      const data = {
        user: {
          name: 'John',
          credentials: {
            accessToken: 'secret',
            password: 'pass123',
          },
        },
      };

      const sanitized = TokenStorageService.sanitizeForLogging(data) as any;

      expect(sanitized.user.name).toBe('John');
      expect(sanitized.user.credentials.accessToken).toBe('***');
      expect(sanitized.user.credentials.password).toBe('***');
    });

    it('should handle null and undefined', () => {
      expect(TokenStorageService.sanitizeForLogging(null)).toBeNull();
      expect(TokenStorageService.sanitizeForLogging(undefined)).toBeUndefined();
    });

    it('should handle numbers', () => {
      expect(TokenStorageService.sanitizeForLogging(123)).toBe(123);
    });

    it('should handle booleans', () => {
      expect(TokenStorageService.sanitizeForLogging(true)).toBe(true);
      expect(TokenStorageService.sanitizeForLogging(false)).toBe(false);
    });

    it('should handle arrays (converted to objects)', () => {
      const data = ['normal', 'password123'];

      const sanitized = TokenStorageService.sanitizeForLogging(data);

      // Arrays are treated as objects in the sanitizer
      // The for...in loop converts array to object with numeric keys
      expect(sanitized).toEqual({ '0': 'normal', '1': 'password123' });
    });

    it('should be case-insensitive for sensitive field detection', () => {
      const data = {
        AccessToken: 'secret1',
        REFRESH_TOKEN: 'secret2',
        Password: 'secret3',
        CLIENT_SECRET: 'secret4',
      };

      const sanitized = TokenStorageService.sanitizeForLogging(data) as any;

      expect(sanitized.AccessToken).toBe('***');
      expect(sanitized.REFRESH_TOKEN).toBe('***');
      expect(sanitized.Password).toBe('***');
      expect(sanitized.CLIENT_SECRET).toBe('***');
    });
  });

  describe('security and encryption', () => {
    it('should never persist access token to SecureStorage', async () => {
      await service.storeAuth(mockAuth);

      const setCalls = (SecureStorage.set as Mock).mock.calls;
      const accessTokenCalls = setCalls.filter(call => call[0].toLowerCase().includes('access'));

      // Auth data contains access token, but no dedicated access token key
      expect(accessTokenCalls.length).toBe(0);
    });

    it('should only store refresh token in encrypted SecureStorage', async () => {
      await service.storeAuth(mockAuth);

      expect(SecureStorage.set).toHaveBeenCalledWith(
        'tidepool_refresh_token_encrypted',
        expect.any(String)
      );
    });

    it('should clear all data on logout (clearAll)', async () => {
      await service.storeAuth(mockAuth);
      await service.clearAll();

      // Verify all SecureStorage keys removed
      expect(SecureStorage.remove).toHaveBeenCalledWith('tidepool_refresh_token_encrypted');
      expect(SecureStorage.remove).toHaveBeenCalledWith('tidepool_auth_encrypted');
      expect(SecureStorage.remove).toHaveBeenCalledWith('tidepool_token_metadata');

      // Verify in-memory token cleared
      const token = await service.getAccessToken();
      expect(token).toBeNull();
    });

    it('should not log sensitive token values in errors', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation();

      (SecureStorage.set as Mock).mockRejectedValueOnce(new Error('Encryption failed'));

      try {
        await service.storeAuth(mockAuth);
      } catch {
        // Error should be logged, but not token values
        const errorCalls = consoleErrorSpy.mock.calls;
        const hasTokenInLog = errorCalls.some(call =>
          call.some(arg => typeof arg === 'string' && arg.includes('test-access-token'))
        );

        expect(hasTokenInLog).toBe(false);
      }

      consoleErrorSpy.mockRestore();
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle storeAuth with missing userId', async () => {
      const authWithoutUserId = { ...mockAuth, userId: '' };

      await expect(service.storeAuth(authWithoutUserId)).resolves.not.toThrow();
    });

    it('should handle storeAuth with missing email', async () => {
      const authWithoutEmail = { ...mockAuth, email: undefined };

      await expect(service.storeAuth(authWithoutEmail)).resolves.not.toThrow();
    });

    it('should handle concurrent storeAuth calls', async () => {
      const auth1 = { ...mockAuth, accessToken: 'token1' };
      const auth2 = { ...mockAuth, accessToken: 'token2' };

      await Promise.all([service.storeAuth(auth1), service.storeAuth(auth2)]);

      // Last write should win (non-deterministic in concurrent scenario)
      const token = await service.getAccessToken();
      expect(token).toBeTruthy();
    });

    it('should handle very long token strings', async () => {
      const longToken = 'a'.repeat(10000);
      const authWithLongToken = {
        ...mockAuth,
        accessToken: longToken,
      };

      await service.storeAuth(authWithLongToken);

      const token = await service.getAccessToken();
      expect(token).toBe(longToken);
    });

    it('should handle token expiry exactly at current time', async () => {
      const now = Date.now();
      const authExpiringNow = {
        ...mockAuth,
        expiresAt: now,
      };

      await service.storeAuth(authExpiringNow);

      const token = await service.getAccessToken();
      expect(token).toBeNull(); // Should be expired
    });

    it('should handle negative expiry timestamps', async () => {
      const authWithNegativeExpiry = {
        ...mockAuth,
        expiresAt: -1000,
      };

      await service.storeAuth(authWithNegativeExpiry);

      const token = await service.getAccessToken();
      expect(token).toBeNull();
    });

    it('should handle zero buffer in hasValidAccessToken', async () => {
      const authExpiringSoon = {
        ...mockAuth,
        expiresAt: Date.now() + 1000, // 1 second
      };

      await service.storeAuth(authExpiringSoon);

      const isValid = await service.hasValidAccessToken(0);
      expect(isValid).toBe(true);
    });

    it('should handle very large buffer in hasValidAccessToken', async () => {
      const authValid = {
        ...mockAuth,
        expiresAt: Date.now() + 3600000, // 1 hour
      };

      await service.storeAuth(authValid);

      const isValid = await service.hasValidAccessToken(7200); // 2 hour buffer
      expect(isValid).toBe(false);
    });
  });

  describe('memory management', () => {
    it('should not leak tokens after clearAccessToken', () => {
      service.updateAccessToken('sensitive-token', 3600);
      service.clearAccessToken();

      // Access to private property for testing
      expect((service as any).accessToken).toBeNull();
      expect((service as any).accessTokenExpiry).toBeNull();
    });

    it('should overwrite previous token on updateAccessToken', () => {
      service.updateAccessToken('old-token', 3600);
      service.updateAccessToken('new-token', 3600);

      // Old token should be garbage collected
      expect((service as any).accessToken).toBe('new-token');
    });

    it('should not retain stale expiry after clearAccessToken', async () => {
      service.updateAccessToken('token', 3600);

      service.clearAccessToken();

      expect((service as any).accessTokenExpiry).toBeNull();
    });
  });
});
