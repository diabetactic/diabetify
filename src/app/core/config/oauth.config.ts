/**
 * OAuth2/OpenID Connect Configuration for Tidepool
 *
 * Tidepool uses OpenID Connect (OIDC) and OAuth2 for authentication.
 * This configuration supports the Authorization Code Flow with PKCE
 * (Proof Key for Code Exchange) which is the recommended flow for mobile apps.
 *
 * @see https://developer.tidepool.org/authentication
 * @see https://openid.net/developers/how-connect-works/
 */

import { environment } from '../../../environments/environment';

/**
 * OAuth2 Configuration Interface
 */
export interface OAuthConfig {
  /** Authorization endpoint URL */
  authorizationEndpoint: string;
  /** Token endpoint URL */
  tokenEndpoint: string;
  /** Client ID registered with Tidepool */
  clientId: string;
  /** Redirect URI for OAuth callback */
  redirectUri: string;
  /** OAuth2 scopes to request */
  scopes: string[];
  /** Authentication realm (dev1, integration, tidepool) */
  realm: string;
}

/**
 * Get OAuth configuration based on environment
 */
export function getOAuthConfig(): OAuthConfig {
  // Determine realm based on environment
  const realm = environment.production ? 'tidepool' : 'integration';

  // Determine auth server based on environment
  const authServer = environment.production
    ? 'https://auth.tidepool.org'
    : 'https://auth.external.tidepool.org';

  return {
    authorizationEndpoint: `${authServer}/realms/${realm}/protocol/openid-connect/auth`,
    tokenEndpoint: `${authServer}/realms/${realm}/protocol/openid-connect/token`,
    clientId: environment.tidepool.clientId,
    redirectUri: environment.tidepool.redirectUri,
    scopes: environment.tidepool.scopes.split(' '),
    realm,
  };
}

/**
 * OAuth2 Constants
 */
export const OAUTH_CONSTANTS = {
  /** Response type for authorization code flow */
  RESPONSE_TYPE: 'code',

  /** PKCE code challenge method (S256 = SHA-256) */
  CODE_CHALLENGE_METHOD: 'S256',

  /** Storage key for PKCE code verifier (temporary) */
  CODE_VERIFIER_KEY: 'oauth_code_verifier',

  /** Storage key for OAuth state (CSRF protection) */
  STATE_KEY: 'oauth_state',

  /** Storage key for redirect target after auth */
  REDIRECT_TARGET_KEY: 'oauth_redirect_target',

  /** Minimum length for code verifier (RFC 7636) */
  CODE_VERIFIER_MIN_LENGTH: 43,

  /** Maximum length for code verifier (RFC 7636) */
  CODE_VERIFIER_MAX_LENGTH: 128,

  /** Default code verifier length */
  CODE_VERIFIER_LENGTH: 64,

  /** State parameter length */
  STATE_LENGTH: 32,

  /** Access token expiry buffer (refresh if within 1 minute of expiry) */
  TOKEN_EXPIRY_BUFFER_SECONDS: 60,

  /** Default token expiry if not provided (10 minutes) */
  DEFAULT_TOKEN_EXPIRY_SECONDS: 600,
} as const;
