/**
 * Tidepool OAuth2 authentication models
 * Based on Tidepool API authentication flow
 * @see https://tidepool.stoplight.io/docs/tidepool-api/
 */

/**
 * OAuth2 token type
 */
export type TokenType = 'Bearer';

/**
 * OAuth2 grant types supported by Tidepool
 */
export type GrantType = 'authorization_code' | 'refresh_token';

/**
 * OAuth2 token response from Tidepool
 * Received after successful authorization or token refresh
 */
export interface TidepoolTokenResponse {
  /** Access token for API requests */
  access_token: string;

  /** Refresh token for obtaining new access tokens */
  refresh_token: string;

  /** Token type (always "Bearer" for Tidepool) */
  token_type: TokenType;

  /** Expiration time in seconds from token issuance */
  expires_in: number;

  /** OpenID Connect ID token (JWT with user claims) */
  id_token?: string;

  /** Scope of access granted (space-separated string) */
  scope?: string;
}

/**
 * Stored authentication credentials
 * Includes calculated expiration timestamp for easier validation
 */
export interface TidepoolAuth {
  /** Access token for API requests */
  accessToken: string;

  /** Refresh token for obtaining new access tokens */
  refreshToken: string;

  /** Token type (always "Bearer") */
  tokenType: TokenType;

  /** Timestamp (milliseconds) when token was issued */
  issuedAt: number;

  /** Timestamp (milliseconds) when token expires */
  expiresAt: number;

  /** Tidepool user ID associated with this token */
  userId: string;

  /** User's email (for display purposes) */
  email?: string;

  /** Access scope granted */
  scope?: string;
}

/**
 * OAuth2 authorization request parameters
 * Used to initiate the authorization flow
 */
export interface AuthorizationRequest {
  /** OAuth2 response type (always "code" for authorization code flow) */
  response_type: 'code';

  /** Client ID registered with Tidepool */
  client_id: string;

  /** Redirect URI registered with Tidepool */
  redirect_uri: string;

  /** Requested access scope (space-separated) */
  scope?: string;

  /** State parameter for CSRF protection */
  state?: string;

  /** PKCE code challenge */
  code_challenge?: string;

  /** PKCE code challenge method */
  code_challenge_method?: 'S256';
}

/**
 * OAuth2 token request parameters
 * Used to exchange authorization code for tokens
 */
export interface TokenRequest {
  /** Grant type */
  grant_type: GrantType;

  /** Authorization code (for authorization_code grant) */
  code?: string;

  /** Refresh token (for refresh_token grant) */
  refresh_token?: string;

  /** Client ID */
  client_id: string;

  /** Redirect URI (must match authorization request) */
  redirect_uri?: string;

  /** PKCE code verifier */
  code_verifier?: string;
}

/**
 * OAuth flow state (internal state machine for authorization process)
 * Renamed from AuthState to avoid confusion with TidepoolAuthService.AuthState
 */
export interface OAuthFlowState {
  /** Current state of the authentication process */
  status: 'idle' | 'authorizing' | 'exchanging_token' | 'authenticated' | 'error';

  /** State parameter for CSRF protection */
  state?: string;

  /** PKCE code verifier (stored temporarily) */
  codeVerifier?: string;

  /** Error message if status is 'error' */
  error?: string;

  /** Error description for debugging */
  errorDescription?: string;

  /** Timestamp when authentication started */
  startedAt?: number;
}

/**
 * Tidepool API session information
 * Received from /auth/user endpoint
 */
export interface TidepoolSession {
  /** Tidepool user ID */
  userid: string;

  /** User's email */
  username: string;

  /** List of emails associated with the account */
  emails: string[];

  /** Roles assigned to the user */
  roles?: string[];

  /** Terms of service acceptance date */
  termsAccepted?: string;

  /** Email verification status */
  emailVerified: boolean;
}

/**
 * Utility type for token validation result
 */
export interface TokenValidation {
  /** Is the token valid */
  valid: boolean;

  /** Is the token expired */
  expired: boolean;

  /** Milliseconds until expiration (negative if expired) */
  expiresIn: number;

  /** Should the token be refreshed */
  shouldRefresh: boolean;
}

/**
 * PKCE (Proof Key for Code Exchange) helper
 * Used for enhanced security in OAuth flow
 */
export interface PKCEChallenge {
  /** Code verifier (random string) */
  codeVerifier: string;

  /** Code challenge (SHA256 hash of verifier, base64url encoded) */
  codeChallenge: string;

  /** Challenge method (always S256) */
  codeChallengeMethod: 'S256';
}
