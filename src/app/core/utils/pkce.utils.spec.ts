/**
 * Unit tests for PKCE utility functions
 * Tests RFC 7636 implementation for OAuth2 PKCE
 */

// Initialize TestBed environment for Vitest
import '../../../test-setup';

import {
  generateRandomString,
  generateState,
  generateCodeVerifier,
  generateCodeChallenge,
  generatePKCEChallenge,
  validateCodeVerifier,
  buildAuthorizationUrl,
} from './pkce.utils';
import { OAUTH_CONSTANTS } from '@core/config/oauth.config';

describe('PKCEUtils', () => {
  describe('generateRandomString', () => {
    it('should generate strings with correct length and uniqueness', () => {
      // Correct length
      const result = generateRandomString(64);
      expect(result.length).toBeGreaterThanOrEqual(64);

      // Default length
      const defaultResult = generateRandomString();
      expect(defaultResult.length).toBeGreaterThanOrEqual(OAUTH_CONSTANTS.CODE_VERIFIER_LENGTH);

      // Different strings each call
      expect(generateRandomString()).not.toBe(generateRandomString());
    });

    it('should generate base64url-safe strings', () => {
      const result = generateRandomString();
      expect(result).not.toContain('+');
      expect(result).not.toContain('/');
      expect(result).not.toContain('=');
    });

    it('should throw for invalid lengths', () => {
      expect(() => generateRandomString(42)).toThrow();
      expect(() => generateRandomString(129)).toThrow();
    });
  });

  describe('generateState', () => {
    it('should generate valid unique states', () => {
      const state1 = generateState();
      const state2 = generateState();

      expect(state1.length).toBeGreaterThanOrEqual(OAUTH_CONSTANTS.STATE_LENGTH);
      expect(state1.length).toBeGreaterThan(0);
      expect(state1).not.toBe(state2);

      // Base64url-safe
      expect(state1).not.toContain('+');
      expect(state1).not.toContain('/');
      expect(state1).not.toContain('=');
    });
  });

  describe('generateCodeVerifier', () => {
    it('should generate valid unique verifiers', () => {
      const verifier1 = generateCodeVerifier();
      const verifier2 = generateCodeVerifier();

      expect(verifier1.length).toBeGreaterThanOrEqual(OAUTH_CONSTANTS.CODE_VERIFIER_LENGTH);
      expect(verifier1).not.toBe(verifier2);

      // Base64url-safe
      expect(verifier1).not.toContain('+');
      expect(verifier1).not.toContain('/');
      expect(verifier1).not.toContain('=');

      // Passes validation
      expect(validateCodeVerifier(verifier1)).toBe(true);
    });
  });

  describe('generateCodeChallenge', () => {
    it('should generate consistent base64url-safe challenges from verifiers', async () => {
      const verifier1 = generateCodeVerifier();
      const verifier2 = generateCodeVerifier();

      const challenge1 = await generateCodeChallenge(verifier1);
      const challenge1Again = await generateCodeChallenge(verifier1);
      const challenge2 = await generateCodeChallenge(verifier2);

      // Different verifiers produce different challenges
      expect(challenge1).not.toBe(challenge2);

      // Same verifier produces same challenge
      expect(challenge1).toBe(challenge1Again);

      // Base64url-safe
      expect(challenge1).not.toContain('+');
      expect(challenge1).not.toContain('/');
      expect(challenge1).not.toContain('=');
    });
  });

  describe('generatePKCEChallenge', () => {
    it('should generate complete PKCE challenges with S256 method', async () => {
      const pkce1 = await generatePKCEChallenge();
      const pkce2 = await generatePKCEChallenge();

      expect(pkce1.codeVerifier).toBeDefined();
      expect(pkce1.codeChallenge).toBeDefined();
      expect(pkce1.codeChallengeMethod).toBe('S256');

      // Valid verifier
      expect(validateCodeVerifier(pkce1.codeVerifier)).toBe(true);

      // Different each time
      expect(pkce1.codeVerifier).not.toBe(pkce2.codeVerifier);
      expect(pkce1.codeChallenge).not.toBe(pkce2.codeChallenge);

      // Correct length range
      expect(pkce1.codeVerifier.length).toBeGreaterThanOrEqual(
        OAUTH_CONSTANTS.CODE_VERIFIER_MIN_LENGTH
      );
      expect(pkce1.codeVerifier.length).toBeLessThanOrEqual(
        OAUTH_CONSTANTS.CODE_VERIFIER_MAX_LENGTH
      );
    });
  });

  describe('validateCodeVerifier', () => {
    it('should validate verifiers by length', () => {
      expect(validateCodeVerifier(generateCodeVerifier())).toBe(true);

      // Boundary lengths
      expect(validateCodeVerifier('a'.repeat(OAUTH_CONSTANTS.CODE_VERIFIER_MIN_LENGTH))).toBe(true);
      expect(validateCodeVerifier('a'.repeat(OAUTH_CONSTANTS.CODE_VERIFIER_MAX_LENGTH))).toBe(true);

      // Invalid lengths
      expect(validateCodeVerifier('a'.repeat(42))).toBe(false);
      expect(validateCodeVerifier('a'.repeat(129))).toBe(false);
    });

    it('should validate verifiers by character set', () => {
      const validChars = [
        'a'.repeat(43) + 'Z0123456789-._~',
        'a'.repeat(42) + '-',
        'a'.repeat(42) + '_',
        'a'.repeat(41) + '.~',
      ];
      const invalidChars = ['a'.repeat(43) + '+/=', 'a'.repeat(43) + ' '];

      validChars.forEach(v => expect(validateCodeVerifier(v), v).toBe(true));
      invalidChars.forEach(v => expect(validateCodeVerifier(v), v).toBe(false));
    });
  });

  describe('buildAuthorizationUrl', () => {
    it('should build valid authorization URL with all parameters', async () => {
      const pkce = await generatePKCEChallenge();
      const state = generateState();
      const url = buildAuthorizationUrl(
        'https://auth.example.com/auth',
        'client123',
        'https://app.example.com/callback',
        ['openid', 'profile', 'email'],
        pkce,
        state
      );

      // Basic structure
      expect(url).toContain('https://auth.example.com/auth?');
      expect(url).toContain('client_id=client123');
      expect(url).toContain('response_type=code');

      // PKCE parameters
      expect(url).toContain(`code_challenge=${pkce.codeChallenge}`);
      expect(url).toContain(`code_challenge_method=${pkce.codeChallengeMethod}`);

      // State and scopes
      expect(url).toContain(`state=${state}`);
      expect(url).toContain('scope=openid+profile+email');
    });

    it('should URL-encode special characters and handle empty scopes', async () => {
      const pkce = await generatePKCEChallenge();
      const state = generateState();

      // Special characters in redirect URI
      const urlWithSpecial = buildAuthorizationUrl(
        'https://auth.example.com/auth',
        'client123',
        'https://app.example.com/callback?param=value',
        ['openid'],
        pkce,
        state
      );
      expect(urlWithSpecial).toContain(
        'redirect_uri=https%3A%2F%2Fapp.example.com%2Fcallback%3Fparam%3Dvalue'
      );

      // Empty scopes
      const urlEmptyScopes = buildAuthorizationUrl(
        'https://auth.example.com/auth',
        'client123',
        'https://app.example.com/callback',
        [],
        pkce,
        state
      );
      expect(urlEmptyScopes).toContain('scope=');
    });
  });

  describe('RFC 7636 compliance', () => {
    it('should meet all RFC 7636 requirements', () => {
      // Minimum and maximum verifier length
      expect(OAUTH_CONSTANTS.CODE_VERIFIER_MIN_LENGTH).toBe(43);
      expect(OAUTH_CONSTANTS.CODE_VERIFIER_MAX_LENGTH).toBe(128);

      // S256 challenge method
      expect(OAUTH_CONSTANTS.CODE_CHALLENGE_METHOD).toBe('S256');

      // Generated verifiers within range
      const verifier = generateCodeVerifier();
      expect(verifier.length).toBeGreaterThanOrEqual(43);
      expect(verifier.length).toBeLessThanOrEqual(128);

      // Only unreserved characters
      const validPattern = /^[A-Za-z0-9\-._~]+$/;
      expect(validPattern.test(verifier)).toBe(true);
    });
  });

  describe('Cryptographic security', () => {
    it('should generate cryptographically secure unique values and use SHA-256', async () => {
      // 10 unique verifiers
      const values = Array(10)
        .fill(null)
        .map(() => generateCodeVerifier());
      expect(new Set(values).size).toBe(10);

      // SHA-256 hash produces base64url of expected length
      const verifier = generateCodeVerifier();
      const challenge = await generateCodeChallenge(verifier);
      expect(challenge.length).toBeGreaterThanOrEqual(40);
    });
  });
});
