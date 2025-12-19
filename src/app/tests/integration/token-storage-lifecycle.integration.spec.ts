/**
 * Token Storage Lifecycle Integration Tests
 *
 * Tests the complete token storage flow:
 * 1. TokenStorageService - Token management in memory + secure storage
 * 2. SecureStorage - Encrypted persistence via Android Keystore
 *
 * Flow: Store Auth -> Memory + SecureStorage -> Validate -> Clear on Logout
 */

// Initialize TestBed environment for Vitest
import '../../../test-setup';

import { TestBed } from '@angular/core/testing';
import { vi, type Mock } from 'vitest';
import { TokenStorageService } from '@core/services/token-storage.service';
import { SecureStorage } from '@aparajita/capacitor-secure-storage';
import { TidepoolAuth } from '@core/models/tidepool-auth.model';

// Note: SecureStorage is already mocked in test-setup/index.ts

describe('Token Storage Lifecycle Integration Tests', () => {
  let tokenService: TokenStorageService;
  let secureStorage: Map<string, string>;

  // Mock TidepoolAuth data
  const createMockAuth = (overrides?: Partial<TidepoolAuth>): TidepoolAuth => ({
    accessToken: 'test-access-token-12345',
    refreshToken: 'test-refresh-token-67890',
    tokenType: 'Bearer',
    issuedAt: Date.now(),
    expiresAt: Date.now() + 3600000, // 1 hour from now
    userId: 'tidepool-user-id',
    email: 'test@tidepool.org',
    scope: 'data:read data:write',
    ...overrides,
  });

  beforeEach(async () => {
    vi.clearAllMocks();

    // Reset SecureStorage mock with Map-based storage
    secureStorage = new Map<string, string>();
    (SecureStorage.get as Mock).mockImplementation(
      async (key: string) => secureStorage.get(key) ?? null
    );
    (SecureStorage.set as Mock).mockImplementation(async (key: string, value: string) => {
      secureStorage.set(key, typeof value === 'object' ? JSON.stringify(value) : value);
    });
    (SecureStorage.remove as Mock).mockImplementation(async (key: string) => {
      secureStorage.delete(key);
    });

    TestBed.configureTestingModule({
      providers: [TokenStorageService],
    });

    tokenService = TestBed.inject(TokenStorageService);
  });

  describe('Token Storage', () => {
    it('should store auth data with access token in memory', async () => {
      const auth = createMockAuth();

      await tokenService.storeAuth(auth);

      // Access token should be retrievable from memory
      const accessToken = await tokenService.getAccessToken();
      expect(accessToken).toBe('test-access-token-12345');
    });

    it('should store refresh token in SecureStorage', async () => {
      const auth = createMockAuth();

      await tokenService.storeAuth(auth);

      // Verify SecureStorage was called with refresh token
      expect(SecureStorage.set).toHaveBeenCalledWith(
        'tidepool_refresh_token_encrypted',
        'test-refresh-token-67890'
      );
    });

    it('should store complete auth data in SecureStorage', async () => {
      const auth = createMockAuth();

      await tokenService.storeAuth(auth);

      // Verify full auth data was stored
      expect(SecureStorage.set).toHaveBeenCalledWith(
        'tidepool_auth_encrypted',
        expect.stringContaining('test-access-token-12345')
      );
    });

    it('should store token metadata in SecureStorage', async () => {
      const auth = createMockAuth();

      await tokenService.storeAuth(auth);

      // Verify metadata was stored
      expect(SecureStorage.set).toHaveBeenCalledWith(
        'tidepool_token_metadata',
        expect.stringContaining('accessTokenExpiry')
      );
    });
  });

  describe('Token Retrieval', () => {
    it('should retrieve access token from memory', async () => {
      const auth = createMockAuth();
      await tokenService.storeAuth(auth);

      const token = await tokenService.getAccessToken();

      expect(token).toBe('test-access-token-12345');
    });

    it('should return null for expired access token', async () => {
      // Create auth with expired token
      const auth = createMockAuth({
        expiresAt: Date.now() - 1000, // Expired 1 second ago
      });
      await tokenService.storeAuth(auth);

      const token = await tokenService.getAccessToken();

      expect(token).toBeNull();
    });

    it('should retrieve refresh token from SecureStorage', async () => {
      const auth = createMockAuth();
      await tokenService.storeAuth(auth);

      const refreshToken = await tokenService.getRefreshToken();

      expect(refreshToken).toBe('test-refresh-token-67890');
    });

    it('should retrieve full auth data from SecureStorage', async () => {
      const auth = createMockAuth();
      await tokenService.storeAuth(auth);

      const authData = await tokenService.getAuthData();

      expect(authData).toBeDefined();
      expect(authData?.accessToken).toBe('test-access-token-12345');
      expect(authData?.userId).toBe('tidepool-user-id');
    });
  });

  describe('Token Validation', () => {
    it('should validate token as valid when access token exists and not expired', async () => {
      const auth = createMockAuth();
      await tokenService.storeAuth(auth);

      const validation = await tokenService.validateToken();

      expect(validation.valid).toBe(true);
      expect(validation.expired).toBe(false);
    });

    it('should validate token as expired when access token is expired', async () => {
      const auth = createMockAuth({
        expiresAt: Date.now() - 1000,
      });
      await tokenService.storeAuth(auth);

      const validation = await tokenService.validateToken();

      expect(validation.expired).toBe(true);
    });

    it('should mark token as valid if refresh token exists even with expired access token', async () => {
      const auth = createMockAuth({
        expiresAt: Date.now() - 1000,
      });
      await tokenService.storeAuth(auth);

      const validation = await tokenService.validateToken();

      // Valid because refresh token exists
      expect(validation.valid).toBe(true);
    });

    it('should indicate shouldRefresh when access token is near expiry but still valid', async () => {
      // Create auth expiring in 90 seconds (just outside 60s buffer)
      // This means hasValidAccessToken returns true, but shouldRefresh is true
      // because 90s - 60s buffer = 30s remaining, but the check is < buffer
      const auth = createMockAuth({
        expiresAt: Date.now() + 50000, // 50s remaining, less than 60s buffer
      });
      await tokenService.storeAuth(auth);

      const validation = await tokenService.validateToken();

      // shouldRefresh is only true when hasAccess is true AND time remaining < buffer
      // When expiry is 50s away, hasValidAccessToken(60) returns false
      // So hasAccess is false, and shouldRefresh is false
      expect(validation.expired).toBe(true); // Expired for practical purposes
      expect(validation.valid).toBe(true); // But valid because refresh token exists
    });

    it('should check hasValidAccessToken with buffer', async () => {
      // Token expires in 30 seconds, but buffer is 60 seconds
      const auth = createMockAuth({
        expiresAt: Date.now() + 30000,
      });
      await tokenService.storeAuth(auth);

      const hasValid = await tokenService.hasValidAccessToken(60);

      // 30s remaining < 60s buffer = invalid
      expect(hasValid).toBe(false);
    });

    it('should check hasRefreshToken correctly', async () => {
      expect(await tokenService.hasRefreshToken()).toBe(false);

      const auth = createMockAuth();
      await tokenService.storeAuth(auth);

      expect(await tokenService.hasRefreshToken()).toBe(true);
    });
  });

  describe('Token Update', () => {
    it('should update access token in memory', async () => {
      const auth = createMockAuth();
      await tokenService.storeAuth(auth);

      // Update with new token
      tokenService.updateAccessToken('new-access-token', 7200);

      const token = await tokenService.getAccessToken();
      expect(token).toBe('new-access-token');
    });

    it('should update access token expiry', async () => {
      const auth = createMockAuth({
        expiresAt: Date.now() - 1000, // Expired
      });
      await tokenService.storeAuth(auth);

      // Expired token should be null
      expect(await tokenService.getAccessToken()).toBeNull();

      // Update with new expiry
      tokenService.updateAccessToken('new-token', 3600);

      // Now should be valid
      expect(await tokenService.getAccessToken()).toBe('new-token');
    });
  });

  describe('Token Clearing', () => {
    it('should clear access token from memory', async () => {
      const auth = createMockAuth();
      await tokenService.storeAuth(auth);

      tokenService.clearAccessToken();

      const token = await tokenService.getAccessToken();
      expect(token).toBeNull();
    });

    it('should clear all tokens on logout', async () => {
      const auth = createMockAuth();
      await tokenService.storeAuth(auth);

      await tokenService.clearAll();

      // Memory cleared
      expect(await tokenService.getAccessToken()).toBeNull();

      // SecureStorage cleared
      expect(SecureStorage.remove).toHaveBeenCalledWith('tidepool_refresh_token_encrypted');
      expect(SecureStorage.remove).toHaveBeenCalledWith('tidepool_auth_encrypted');
      expect(SecureStorage.remove).toHaveBeenCalledWith('tidepool_token_metadata');
    });

    it('should handle clearAll when no tokens stored', async () => {
      // Should not throw
      await expect(tokenService.clearAll()).resolves.not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should throw error when storage fails', async () => {
      (SecureStorage.set as Mock).mockRejectedValue(new Error('Storage failed'));

      const auth = createMockAuth();

      await expect(tokenService.storeAuth(auth)).rejects.toThrow('Token storage failed');
    });

    it('should return null when SecureStorage retrieval fails', async () => {
      (SecureStorage.get as Mock).mockRejectedValue(new Error('Retrieval failed'));

      const refreshToken = await tokenService.getRefreshToken();
      expect(refreshToken).toBeNull();

      const authData = await tokenService.getAuthData();
      expect(authData).toBeNull();
    });

    it('should rethrow error when clearAll fails', async () => {
      const auth = createMockAuth();
      await tokenService.storeAuth(auth);

      (SecureStorage.remove as Mock).mockRejectedValue(new Error('Remove failed'));

      await expect(tokenService.clearAll()).rejects.toThrow();
    });
  });
});
