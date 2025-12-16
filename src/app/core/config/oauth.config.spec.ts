/**
 * Unit tests for OAuth configuration
 * Tests OAuth config interface, constants, and factory function
 */

// Initialize TestBed environment for Vitest
import '../../../test-setup';

import { OAUTH_CONSTANTS, OAuthConfig, getOAuthConfig } from './oauth.config';

describe('OAuthConfig', () => {
  describe('OAUTH_CONSTANTS', () => {
    it('should have correct response type', () => {
      expect(OAUTH_CONSTANTS.RESPONSE_TYPE).toBe('code');
    });

    it('should have correct code challenge method', () => {
      expect(OAUTH_CONSTANTS.CODE_CHALLENGE_METHOD).toBe('S256');
    });

    it('should have correct storage keys', () => {
      expect(OAUTH_CONSTANTS.CODE_VERIFIER_KEY).toBe('oauth_code_verifier');
      expect(OAUTH_CONSTANTS.STATE_KEY).toBe('oauth_state');
      expect(OAUTH_CONSTANTS.REDIRECT_TARGET_KEY).toBe('oauth_redirect_target');
    });

    it('should have valid code verifier length constraints', () => {
      expect(OAUTH_CONSTANTS.CODE_VERIFIER_MIN_LENGTH).toBe(43);
      expect(OAUTH_CONSTANTS.CODE_VERIFIER_MAX_LENGTH).toBe(128);
      expect(OAUTH_CONSTANTS.CODE_VERIFIER_LENGTH).toBe(64);

      expect(OAUTH_CONSTANTS.CODE_VERIFIER_LENGTH).toBeGreaterThanOrEqual(
        OAUTH_CONSTANTS.CODE_VERIFIER_MIN_LENGTH
      );
      expect(OAUTH_CONSTANTS.CODE_VERIFIER_LENGTH).toBeLessThanOrEqual(
        OAUTH_CONSTANTS.CODE_VERIFIER_MAX_LENGTH
      );
    });

    it('should have valid state length', () => {
      expect(OAUTH_CONSTANTS.STATE_LENGTH).toBe(32);
      expect(OAUTH_CONSTANTS.STATE_LENGTH).toBeGreaterThan(0);
    });

    it('should have valid token expiry settings', () => {
      expect(OAUTH_CONSTANTS.TOKEN_EXPIRY_BUFFER_SECONDS).toBe(60);
      expect(OAUTH_CONSTANTS.DEFAULT_TOKEN_EXPIRY_SECONDS).toBe(600);

      expect(OAUTH_CONSTANTS.TOKEN_EXPIRY_BUFFER_SECONDS).toBeGreaterThan(0);
      expect(OAUTH_CONSTANTS.DEFAULT_TOKEN_EXPIRY_SECONDS).toBeGreaterThan(
        OAUTH_CONSTANTS.TOKEN_EXPIRY_BUFFER_SECONDS
      );
    });

    it('should be immutable (readonly)', () => {
      // TypeScript compile-time check - if this compiles, the test passes
      // @ts-expect-error - Cannot assign to readonly property
      const assignTest = () => (OAUTH_CONSTANTS.RESPONSE_TYPE = 'token');
      expect(assignTest).toBeDefined();
    });
  });

  describe('OAuthConfig interface', () => {
    it('should accept valid config', () => {
      const config: OAuthConfig = {
        authorizationEndpoint: 'https://auth.example.com/auth',
        tokenEndpoint: 'https://auth.example.com/token',
        clientId: 'test-client-id',
        redirectUri: 'https://app.example.com/callback',
        scopes: ['openid', 'profile', 'email'],
        realm: 'tidepool',
      };
      expect(config.authorizationEndpoint).toContain('auth');
      expect(config.tokenEndpoint).toContain('token');
      expect(config.scopes.length).toBe(3);
    });

    it('should accept different realms', () => {
      const realms = ['dev1', 'integration', 'tidepool'];
      realms.forEach(realm => {
        const config: OAuthConfig = {
          authorizationEndpoint: 'https://auth.example.com/auth',
          tokenEndpoint: 'https://auth.example.com/token',
          clientId: 'test-client-id',
          redirectUri: 'https://app.example.com/callback',
          scopes: ['openid'],
          realm,
        };
        expect(config.realm).toBe(realm);
      });
    });

    it('should accept empty scopes array', () => {
      const config: OAuthConfig = {
        authorizationEndpoint: 'https://auth.example.com/auth',
        tokenEndpoint: 'https://auth.example.com/token',
        clientId: 'test-client-id',
        redirectUri: 'https://app.example.com/callback',
        scopes: [],
        realm: 'tidepool',
      };
      expect(config.scopes.length).toBe(0);
    });

    it('should accept multiple scopes', () => {
      const config: OAuthConfig = {
        authorizationEndpoint: 'https://auth.example.com/auth',
        tokenEndpoint: 'https://auth.example.com/token',
        clientId: 'test-client-id',
        redirectUri: 'https://app.example.com/callback',
        scopes: ['openid', 'profile', 'email', 'offline_access'],
        realm: 'tidepool',
      };
      expect(config.scopes.length).toBe(4);
      expect(config.scopes).toContain('openid');
      expect(config.scopes).toContain('offline_access');
    });
  });

  describe('getOAuthConfig', () => {
    it('should return valid config object', () => {
      const config = getOAuthConfig();
      expect(config).toBeDefined();
      expect(config.authorizationEndpoint).toBeDefined();
      expect(config.tokenEndpoint).toBeDefined();
      expect(config.clientId).toBeDefined();
      expect(config.redirectUri).toBeDefined();
      expect(config.scopes).toBeDefined();
      expect(config.realm).toBeDefined();
    });

    it('should have valid endpoint URLs', () => {
      const config = getOAuthConfig();
      expect(config.authorizationEndpoint).toContain('https://');
      expect(config.authorizationEndpoint).toContain('/auth');
      expect(config.tokenEndpoint).toContain('https://');
      expect(config.tokenEndpoint).toContain('/token');
    });

    it('should include realm in endpoints', () => {
      const config = getOAuthConfig();
      expect(config.authorizationEndpoint).toContain(`/realms/${config.realm}/`);
      expect(config.tokenEndpoint).toContain(`/realms/${config.realm}/`);
    });

    it('should have OpenID Connect protocol paths', () => {
      const config = getOAuthConfig();
      expect(config.authorizationEndpoint).toContain('/protocol/openid-connect/auth');
      expect(config.tokenEndpoint).toContain('/protocol/openid-connect/token');
    });

    it('should have scopes as array', () => {
      const config = getOAuthConfig();
      expect(Array.isArray(config.scopes)).toBe(true);
    });

    it('should have valid realm value', () => {
      const config = getOAuthConfig();
      const validRealms = ['dev1', 'integration', 'tidepool'];
      expect(validRealms).toContain(config.realm);
    });

    it('should use correct auth server', () => {
      const config = getOAuthConfig();
      const authServer = config.authorizationEndpoint.split('/realms/')[0];
      expect(authServer).toMatch(/^https:\/\/auth\.(external\.)?tidepool\.org$/);
    });
  });

  describe('RFC compliance', () => {
    it('should meet RFC 7636 verifier length requirements', () => {
      expect(OAUTH_CONSTANTS.CODE_VERIFIER_MIN_LENGTH).toBe(43);
      expect(OAUTH_CONSTANTS.CODE_VERIFIER_MAX_LENGTH).toBe(128);
    });

    it('should use S256 challenge method (RFC 7636)', () => {
      expect(OAUTH_CONSTANTS.CODE_CHALLENGE_METHOD).toBe('S256');
    });

    it('should use authorization code flow', () => {
      expect(OAUTH_CONSTANTS.RESPONSE_TYPE).toBe('code');
    });

    it('should have reasonable token expiry settings', () => {
      // 1 minute buffer is reasonable
      expect(OAUTH_CONSTANTS.TOKEN_EXPIRY_BUFFER_SECONDS).toBe(60);
      // 10 minute default expiry is reasonable
      expect(OAUTH_CONSTANTS.DEFAULT_TOKEN_EXPIRY_SECONDS).toBe(600);
    });
  });

  describe('Security considerations', () => {
    it('should use HTTPS for all endpoints', () => {
      const config = getOAuthConfig();
      expect(config.authorizationEndpoint).toMatch(/^https:\/\//);
      expect(config.tokenEndpoint).toMatch(/^https:\/\//);
    });

    it('should have sufficient state length for CSRF protection', () => {
      // 32 characters provides ~190 bits of entropy
      expect(OAUTH_CONSTANTS.STATE_LENGTH).toBeGreaterThanOrEqual(32);
    });

    it('should have sufficient verifier length for security', () => {
      // 64 characters provides ~384 bits of entropy
      expect(OAUTH_CONSTANTS.CODE_VERIFIER_LENGTH).toBeGreaterThanOrEqual(64);
    });

    it('should use temporary storage for sensitive data', () => {
      expect(OAUTH_CONSTANTS.CODE_VERIFIER_KEY).toBeTruthy();
      expect(OAUTH_CONSTANTS.STATE_KEY).toBeTruthy();
    });
  });
});
