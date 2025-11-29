/**
 * Unit tests for Tidepool authentication models
 * Tests OAuth2/PKCE type definitions and interfaces
 */

import {
  TokenType,
  GrantType,
  TidepoolTokenResponse,
  TidepoolAuth,
  AuthorizationRequest,
  TokenRequest,
  OAuthFlowState,
  TidepoolSession,
  TokenValidation,
  PKCEChallenge,
} from './tidepool-auth.model';

describe('TidepoolAuthModel', () => {
  describe('Type definitions', () => {
    it('should support TokenType', () => {
      const tokenType: TokenType = 'Bearer';
      expect(tokenType).toBe('Bearer');
    });

    it('should support both GrantType values', () => {
      const grantTypes: GrantType[] = ['authorization_code', 'refresh_token'];
      grantTypes.forEach(grantType => {
        const type: GrantType = grantType;
        expect(type).toBe(grantType);
      });
    });
  });

  describe('TidepoolTokenResponse interface', () => {
    it('should accept minimal token response', () => {
      const response: TidepoolTokenResponse = {
        access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        refresh_token: 'refresh_token_value',
        token_type: 'Bearer',
        expires_in: 3600,
      };
      expect(response.access_token).toBeDefined();
      expect(response.refresh_token).toBeDefined();
      expect(response.token_type).toBe('Bearer');
      expect(response.expires_in).toBe(3600);
    });

    it('should accept response with all optional fields', () => {
      const response: TidepoolTokenResponse = {
        access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        refresh_token: 'refresh_token_value',
        token_type: 'Bearer',
        expires_in: 3600,
        id_token: 'id_token_jwt_value',
        scope: 'openid profile email',
      };
      expect(response.id_token).toBe('id_token_jwt_value');
      expect(response.scope).toBe('openid profile email');
    });

    it('should accept various expiration times', () => {
      const response: TidepoolTokenResponse = {
        access_token: 'token',
        refresh_token: 'refresh',
        token_type: 'Bearer',
        expires_in: 7200,
      };
      expect(response.expires_in).toBe(7200);
      expect(response.expires_in).toBeGreaterThan(0);
    });
  });

  describe('TidepoolAuth interface', () => {
    it('should accept minimal auth credentials', () => {
      const now = Date.now();
      const auth: TidepoolAuth = {
        accessToken: 'access_token_value',
        refreshToken: 'refresh_token_value',
        tokenType: 'Bearer',
        issuedAt: now,
        expiresAt: now + 3600000,
        userId: 'user123',
      };
      expect(auth.accessToken).toBeDefined();
      expect(auth.userId).toBe('user123');
      expect(auth.expiresAt).toBeGreaterThan(auth.issuedAt);
    });

    it('should accept auth with all optional fields', () => {
      const now = Date.now();
      const auth: TidepoolAuth = {
        accessToken: 'access_token_value',
        refreshToken: 'refresh_token_value',
        tokenType: 'Bearer',
        issuedAt: now,
        expiresAt: now + 3600000,
        userId: 'user123',
        email: 'user@example.com',
        scope: 'openid profile email',
      };
      expect(auth.email).toBe('user@example.com');
      expect(auth.scope).toBe('openid profile email');
    });

    it('should have valid timestamp relationship', () => {
      const now = Date.now();
      const auth: TidepoolAuth = {
        accessToken: 'token',
        refreshToken: 'refresh',
        tokenType: 'Bearer',
        issuedAt: now,
        expiresAt: now + 3600000,
        userId: 'user123',
      };
      expect(auth.expiresAt).toBeGreaterThan(auth.issuedAt);
      expect(auth.expiresAt - auth.issuedAt).toBe(3600000);
    });
  });

  describe('AuthorizationRequest interface', () => {
    it('should accept minimal authorization request', () => {
      const request: AuthorizationRequest = {
        response_type: 'code',
        client_id: 'my-client-id',
        redirect_uri: 'https://app.example.com/callback',
      };
      expect(request.response_type).toBe('code');
      expect(request.client_id).toBe('my-client-id');
      expect(request.redirect_uri).toBeDefined();
    });

    it('should accept request with all optional fields', () => {
      const request: AuthorizationRequest = {
        response_type: 'code',
        client_id: 'my-client-id',
        redirect_uri: 'https://app.example.com/callback',
        scope: 'openid profile email',
        state: 'random_state_value',
        code_challenge: 'code_challenge_hash',
        code_challenge_method: 'S256',
      };
      expect(request.scope).toBe('openid profile email');
      expect(request.state).toBe('random_state_value');
      expect(request.code_challenge).toBe('code_challenge_hash');
      expect(request.code_challenge_method).toBe('S256');
    });

    it('should support PKCE parameters', () => {
      const request: AuthorizationRequest = {
        response_type: 'code',
        client_id: 'my-client-id',
        redirect_uri: 'https://app.example.com/callback',
        code_challenge: 'PKCE_challenge',
        code_challenge_method: 'S256',
      };
      expect(request.code_challenge).toBeDefined();
      expect(request.code_challenge_method).toBe('S256');
    });
  });

  describe('TokenRequest interface', () => {
    it('should accept authorization code grant request', () => {
      const request: TokenRequest = {
        grant_type: 'authorization_code',
        code: 'auth_code_123',
        client_id: 'my-client-id',
        redirect_uri: 'https://app.example.com/callback',
        code_verifier: 'pkce_verifier',
      };
      expect(request.grant_type).toBe('authorization_code');
      expect(request.code).toBe('auth_code_123');
      expect(request.code_verifier).toBe('pkce_verifier');
    });

    it('should accept refresh token grant request', () => {
      const request: TokenRequest = {
        grant_type: 'refresh_token',
        refresh_token: 'refresh_token_value',
        client_id: 'my-client-id',
      };
      expect(request.grant_type).toBe('refresh_token');
      expect(request.refresh_token).toBe('refresh_token_value');
    });

    it('should accept minimal token request', () => {
      const request: TokenRequest = {
        grant_type: 'authorization_code',
        client_id: 'my-client-id',
      };
      expect(request.grant_type).toBe('authorization_code');
      expect(request.client_id).toBe('my-client-id');
    });
  });

  describe('OAuthFlowState interface', () => {
    it('should accept idle state', () => {
      const state: OAuthFlowState = {
        status: 'idle',
      };
      expect(state.status).toBe('idle');
    });

    it('should accept authorizing state', () => {
      const state: OAuthFlowState = {
        status: 'authorizing',
        state: 'csrf_state',
        codeVerifier: 'pkce_verifier',
        startedAt: Date.now(),
      };
      expect(state.status).toBe('authorizing');
      expect(state.state).toBe('csrf_state');
      expect(state.codeVerifier).toBe('pkce_verifier');
    });

    it('should accept authenticated state', () => {
      const state: OAuthFlowState = {
        status: 'authenticated',
        startedAt: Date.now(),
      };
      expect(state.status).toBe('authenticated');
    });

    it('should accept error state', () => {
      const state: OAuthFlowState = {
        status: 'error',
        error: 'access_denied',
        errorDescription: 'User denied access',
        startedAt: Date.now(),
      };
      expect(state.status).toBe('error');
      expect(state.error).toBe('access_denied');
      expect(state.errorDescription).toBe('User denied access');
    });

    it('should support all status values', () => {
      const statuses: OAuthFlowState['status'][] = [
        'idle',
        'authorizing',
        'exchanging_token',
        'authenticated',
        'error',
      ];
      statuses.forEach(status => {
        const state: OAuthFlowState = { status };
        expect(state.status).toBe(status);
      });
    });
  });

  describe('TidepoolSession interface', () => {
    it('should accept minimal session', () => {
      const session: TidepoolSession = {
        userid: 'user123',
        username: 'user@example.com',
        emails: ['user@example.com'],
        emailVerified: true,
      };
      expect(session.userid).toBe('user123');
      expect(session.username).toBe('user@example.com');
      expect(session.emailVerified).toBe(true);
    });

    it('should accept session with all fields', () => {
      const session: TidepoolSession = {
        userid: 'user123',
        username: 'user@example.com',
        emails: ['user@example.com', 'user2@example.com'],
        roles: ['patient', 'clinic_member'],
        termsAccepted: '2024-01-01T00:00:00Z',
        emailVerified: true,
      };
      expect(session.emails.length).toBe(2);
      expect(session.roles?.length).toBe(2);
      expect(session.termsAccepted).toBe('2024-01-01T00:00:00Z');
    });

    it('should accept multiple emails', () => {
      const session: TidepoolSession = {
        userid: 'user123',
        username: 'user@example.com',
        emails: ['user@example.com', 'alt@example.com', 'backup@example.com'],
        emailVerified: true,
      };
      expect(session.emails.length).toBe(3);
    });

    it('should accept unverified email status', () => {
      const session: TidepoolSession = {
        userid: 'user123',
        username: 'user@example.com',
        emails: ['user@example.com'],
        emailVerified: false,
      };
      expect(session.emailVerified).toBe(false);
    });
  });

  describe('TokenValidation interface', () => {
    it('should accept valid token validation', () => {
      const validation: TokenValidation = {
        valid: true,
        expired: false,
        expiresIn: 3600000,
        shouldRefresh: false,
      };
      expect(validation.valid).toBe(true);
      expect(validation.expired).toBe(false);
      expect(validation.expiresIn).toBeGreaterThan(0);
    });

    it('should accept expired token validation', () => {
      const validation: TokenValidation = {
        valid: false,
        expired: true,
        expiresIn: -1000,
        shouldRefresh: true,
      };
      expect(validation.valid).toBe(false);
      expect(validation.expired).toBe(true);
      expect(validation.expiresIn).toBeLessThan(0);
      expect(validation.shouldRefresh).toBe(true);
    });

    it('should accept token nearing expiration', () => {
      const validation: TokenValidation = {
        valid: true,
        expired: false,
        expiresIn: 300000,
        shouldRefresh: true,
      };
      expect(validation.valid).toBe(true);
      expect(validation.shouldRefresh).toBe(true);
    });
  });

  describe('PKCEChallenge interface', () => {
    it('should accept valid PKCE challenge', () => {
      const challenge: PKCEChallenge = {
        codeVerifier: 'random_verifier_string_at_least_43_characters_long_12345678901234567890',
        codeChallenge: 'base64url_encoded_sha256_hash',
        codeChallengeMethod: 'S256',
      };
      expect(challenge.codeVerifier).toBeDefined();
      expect(challenge.codeChallenge).toBeDefined();
      expect(challenge.codeChallengeMethod).toBe('S256');
    });

    it('should accept long verifier strings', () => {
      const longVerifier = 'a'.repeat(128);
      const challenge: PKCEChallenge = {
        codeVerifier: longVerifier,
        codeChallenge: 'challenge_hash',
        codeChallengeMethod: 'S256',
      };
      expect(challenge.codeVerifier.length).toBe(128);
    });
  });

  describe('Data flow validation', () => {
    it('should convert token response to auth credentials', () => {
      const now = Date.now();
      const tokenResponse: TidepoolTokenResponse = {
        access_token: 'access123',
        refresh_token: 'refresh456',
        token_type: 'Bearer',
        expires_in: 3600,
      };

      const auth: TidepoolAuth = {
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token,
        tokenType: tokenResponse.token_type,
        issuedAt: now,
        expiresAt: now + tokenResponse.expires_in * 1000,
        userId: 'user123',
      };

      expect(auth.accessToken).toBe(tokenResponse.access_token);
      expect(auth.refreshToken).toBe(tokenResponse.refresh_token);
      expect(auth.expiresAt - auth.issuedAt).toBe(tokenResponse.expires_in * 1000);
    });

    it('should validate token expiration correctly', () => {
      const now = Date.now();
      const auth: TidepoolAuth = {
        accessToken: 'token',
        refreshToken: 'refresh',
        tokenType: 'Bearer',
        issuedAt: now - 3700000,
        expiresAt: now - 100000,
        userId: 'user123',
      };

      const validation: TokenValidation = {
        valid: false,
        expired: true,
        expiresIn: auth.expiresAt - now,
        shouldRefresh: true,
      };

      expect(validation.expired).toBe(true);
      expect(validation.expiresIn).toBeLessThan(0);
      expect(validation.shouldRefresh).toBe(true);
    });
  });
});
