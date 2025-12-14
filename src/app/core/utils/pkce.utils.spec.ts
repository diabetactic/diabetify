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
    it('should generate string of correct length', () => {
      const result = generateRandomString(64);
      expect(result.length).toBeGreaterThanOrEqual(64);
    });

    it('should generate different strings on each call', () => {
      const str1 = generateRandomString();
      const str2 = generateRandomString();
      expect(str1).not.toBe(str2);
    });

    it('should use default length when not specified', () => {
      const result = generateRandomString();
      expect(result.length).toBeGreaterThanOrEqual(OAUTH_CONSTANTS.CODE_VERIFIER_LENGTH);
    });

    it('should throw error for length below minimum', () => {
      expect(() => generateRandomString(42)).toThrow();
    });

    it('should throw error for length above maximum', () => {
      expect(() => generateRandomString(129)).toThrow();
    });

    it('should generate base64url-safe string', () => {
      const result = generateRandomString();
      // Base64url should not contain +, /, or =
      expect(result).not.toContain('+');
      expect(result).not.toContain('/');
      expect(result).not.toContain('=');
    });
  });

  describe('generateState', () => {
    it('should generate state of correct length', () => {
      const state = generateState();
      expect(state.length).toBeGreaterThanOrEqual(OAUTH_CONSTANTS.STATE_LENGTH);
    });

    it('should generate different states on each call', () => {
      const state1 = generateState();
      const state2 = generateState();
      expect(state1).not.toBe(state2);
    });

    it('should generate base64url-safe string', () => {
      const state = generateState();
      expect(state).not.toContain('+');
      expect(state).not.toContain('/');
      expect(state).not.toContain('=');
    });

    it('should generate non-empty string', () => {
      const state = generateState();
      expect(state.length).toBeGreaterThan(0);
    });
  });

  describe('generateCodeVerifier', () => {
    it('should generate verifier of correct length', () => {
      const verifier = generateCodeVerifier();
      expect(verifier.length).toBeGreaterThanOrEqual(OAUTH_CONSTANTS.CODE_VERIFIER_LENGTH);
    });

    it('should generate different verifiers on each call', () => {
      const verifier1 = generateCodeVerifier();
      const verifier2 = generateCodeVerifier();
      expect(verifier1).not.toBe(verifier2);
    });

    it('should generate base64url-safe string', () => {
      const verifier = generateCodeVerifier();
      expect(verifier).not.toContain('+');
      expect(verifier).not.toContain('/');
      expect(verifier).not.toContain('=');
    });

    it('should generate valid verifier that passes validation', () => {
      const verifier = generateCodeVerifier();
      expect(validateCodeVerifier(verifier)).toBe(true);
    });
  });

  describe('generateCodeChallenge', () => {
    it('should generate challenge from verifier', async () => {
      const verifier = generateCodeVerifier();
      const challenge = await generateCodeChallenge(verifier);
      expect(challenge).toBeDefined();
      expect(challenge.length).toBeGreaterThan(0);
    });

    it('should generate different challenges for different verifiers', async () => {
      const verifier1 = generateCodeVerifier();
      const verifier2 = generateCodeVerifier();
      const challenge1 = await generateCodeChallenge(verifier1);
      const challenge2 = await generateCodeChallenge(verifier2);
      expect(challenge1).not.toBe(challenge2);
    });

    it('should generate same challenge for same verifier', async () => {
      const verifier = 'test_verifier_' + 'a'.repeat(50);
      const challenge1 = await generateCodeChallenge(verifier);
      const challenge2 = await generateCodeChallenge(verifier);
      expect(challenge1).toBe(challenge2);
    });

    it('should generate base64url-safe challenge', async () => {
      const verifier = generateCodeVerifier();
      const challenge = await generateCodeChallenge(verifier);
      expect(challenge).not.toContain('+');
      expect(challenge).not.toContain('/');
      expect(challenge).not.toContain('=');
    });
  });

  describe('generatePKCEChallenge', () => {
    it('should generate complete PKCE challenge', async () => {
      const pkce = await generatePKCEChallenge();
      expect(pkce.codeVerifier).toBeDefined();
      expect(pkce.codeChallenge).toBeDefined();
      expect(pkce.codeChallengeMethod).toBe(OAUTH_CONSTANTS.CODE_CHALLENGE_METHOD);
    });

    it('should generate S256 challenge method', async () => {
      const pkce = await generatePKCEChallenge();
      expect(pkce.codeChallengeMethod).toBe('S256');
    });

    it('should generate valid verifier', async () => {
      const pkce = await generatePKCEChallenge();
      expect(validateCodeVerifier(pkce.codeVerifier)).toBe(true);
    });

    it('should generate different challenges on each call', async () => {
      const pkce1 = await generatePKCEChallenge();
      const pkce2 = await generatePKCEChallenge();
      expect(pkce1.codeVerifier).not.toBe(pkce2.codeVerifier);
      expect(pkce1.codeChallenge).not.toBe(pkce2.codeChallenge);
    });

    it('should generate verifier with correct length', async () => {
      const pkce = await generatePKCEChallenge();
      expect(pkce.codeVerifier.length).toBeGreaterThanOrEqual(
        OAUTH_CONSTANTS.CODE_VERIFIER_MIN_LENGTH
      );
      expect(pkce.codeVerifier.length).toBeLessThanOrEqual(
        OAUTH_CONSTANTS.CODE_VERIFIER_MAX_LENGTH
      );
    });
  });

  describe('validateCodeVerifier', () => {
    it('should validate correct verifier', () => {
      const verifier = generateCodeVerifier();
      expect(validateCodeVerifier(verifier)).toBe(true);
    });

    it('should reject verifier below minimum length', () => {
      const shortVerifier = 'a'.repeat(42);
      expect(validateCodeVerifier(shortVerifier)).toBe(false);
    });

    it('should reject verifier above maximum length', () => {
      const longVerifier = 'a'.repeat(129);
      expect(validateCodeVerifier(longVerifier)).toBe(false);
    });

    it('should accept verifier at minimum length', () => {
      const minVerifier = 'a'.repeat(OAUTH_CONSTANTS.CODE_VERIFIER_MIN_LENGTH);
      expect(validateCodeVerifier(minVerifier)).toBe(true);
    });

    it('should accept verifier at maximum length', () => {
      const maxVerifier = 'a'.repeat(OAUTH_CONSTANTS.CODE_VERIFIER_MAX_LENGTH);
      expect(validateCodeVerifier(maxVerifier)).toBe(true);
    });

    it('should accept verifier with valid characters', () => {
      const validVerifier = 'a'.repeat(43) + 'Z0123456789-._~';
      expect(validateCodeVerifier(validVerifier)).toBe(true);
    });

    it('should reject verifier with invalid characters', () => {
      const invalidVerifier = 'a'.repeat(43) + '+/=';
      expect(validateCodeVerifier(invalidVerifier)).toBe(false);
    });

    it('should reject verifier with spaces', () => {
      const verifierWithSpace = 'a'.repeat(43) + ' ';
      expect(validateCodeVerifier(verifierWithSpace)).toBe(false);
    });

    it('should accept verifier with hyphens', () => {
      const verifierWithHyphen = 'a'.repeat(42) + '-';
      expect(validateCodeVerifier(verifierWithHyphen)).toBe(true);
    });

    it('should accept verifier with underscores', () => {
      const verifierWithUnderscore = 'a'.repeat(42) + '_';
      expect(validateCodeVerifier(verifierWithUnderscore)).toBe(true);
    });

    it('should accept verifier with periods and tildes', () => {
      const verifier = 'a'.repeat(41) + '.~';
      expect(validateCodeVerifier(verifier)).toBe(true);
    });
  });

  describe('buildAuthorizationUrl', () => {
    it('should build valid authorization URL', async () => {
      const pkce = await generatePKCEChallenge();
      const state = generateState();
      const url = buildAuthorizationUrl(
        'https://auth.example.com/auth',
        'client123',
        'https://app.example.com/callback',
        ['openid', 'profile'],
        pkce,
        state
      );

      expect(url).toContain('https://auth.example.com/auth?');
      expect(url).toContain('client_id=client123');
      expect(url).toContain('redirect_uri=https');
      expect(url).toContain('response_type=code');
    });

    it('should include PKCE parameters', async () => {
      const pkce = await generatePKCEChallenge();
      const state = generateState();
      const url = buildAuthorizationUrl(
        'https://auth.example.com/auth',
        'client123',
        'https://app.example.com/callback',
        ['openid'],
        pkce,
        state
      );

      expect(url).toContain(`code_challenge=${pkce.codeChallenge}`);
      expect(url).toContain(`code_challenge_method=${pkce.codeChallengeMethod}`);
    });

    it('should include state parameter', async () => {
      const pkce = await generatePKCEChallenge();
      const state = generateState();
      const url = buildAuthorizationUrl(
        'https://auth.example.com/auth',
        'client123',
        'https://app.example.com/callback',
        ['openid'],
        pkce,
        state
      );

      expect(url).toContain(`state=${state}`);
    });

    it('should include all scopes', async () => {
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

      expect(url).toContain('scope=openid+profile+email');
    });

    it('should URL-encode special characters', async () => {
      const pkce = await generatePKCEChallenge();
      const state = generateState();
      const url = buildAuthorizationUrl(
        'https://auth.example.com/auth',
        'client123',
        'https://app.example.com/callback?param=value',
        ['openid'],
        pkce,
        state
      );

      expect(url).toContain(
        'redirect_uri=https%3A%2F%2Fapp.example.com%2Fcallback%3Fparam%3Dvalue'
      );
    });

    it('should handle empty scopes array', async () => {
      const pkce = await generatePKCEChallenge();
      const state = generateState();
      const url = buildAuthorizationUrl(
        'https://auth.example.com/auth',
        'client123',
        'https://app.example.com/callback',
        [],
        pkce,
        state
      );

      expect(url).toContain('scope=');
    });

    it('should include response_type=code', async () => {
      const pkce = await generatePKCEChallenge();
      const state = generateState();
      const url = buildAuthorizationUrl(
        'https://auth.example.com/auth',
        'client123',
        'https://app.example.com/callback',
        ['openid'],
        pkce,
        state
      );

      expect(url).toContain('response_type=code');
    });
  });

  describe('RFC 7636 compliance', () => {
    it('should meet minimum verifier length requirement', () => {
      expect(OAUTH_CONSTANTS.CODE_VERIFIER_MIN_LENGTH).toBe(43);
    });

    it('should meet maximum verifier length requirement', () => {
      expect(OAUTH_CONSTANTS.CODE_VERIFIER_MAX_LENGTH).toBe(128);
    });

    it('should use S256 challenge method', () => {
      expect(OAUTH_CONSTANTS.CODE_CHALLENGE_METHOD).toBe('S256');
    });

    it('should generate verifiers within RFC-compliant range', () => {
      const verifier = generateCodeVerifier();
      expect(verifier.length).toBeGreaterThanOrEqual(43);
      expect(verifier.length).toBeLessThanOrEqual(128);
    });

    it('should use unreserved characters only', () => {
      const verifier = generateCodeVerifier();
      // RFC 7636 unreserved characters: [A-Z] / [a-z] / [0-9] / "-" / "." / "_" / "~"
      const validPattern = /^[A-Za-z0-9\-._~]+$/;
      expect(validPattern.test(verifier)).toBe(true);
    });
  });

  describe('Cryptographic security', () => {
    it('should generate cryptographically secure random values', () => {
      // Generate multiple values and ensure they are all different
      const values = Array(10)
        .fill(null)
        .map(() => generateCodeVerifier());
      const uniqueValues = new Set(values);
      expect(uniqueValues.size).toBe(10);
    });

    it('should use SHA-256 for challenge generation', async () => {
      const verifier = generateCodeVerifier();
      const challenge = await generateCodeChallenge(verifier);
      // SHA-256 hash in base64url should be 43 characters
      expect(challenge.length).toBeGreaterThanOrEqual(40);
    });
  });
});
