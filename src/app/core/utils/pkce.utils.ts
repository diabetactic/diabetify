/**
 * PKCE (Proof Key for Code Exchange) Utility Functions
 *
 * Implements RFC 7636 - Proof Key for Code Exchange by OAuth Public Clients
 * PKCE adds security to OAuth2 authorization code flow by preventing
 * authorization code interception attacks.
 *
 * @see https://tools.ietf.org/html/rfc7636
 * @see https://developer.tidepool.org/authentication
 */

import { OAUTH_CONSTANTS } from '../config/oauth.config';
import type { PKCEChallenge } from '../models/tidepool-auth.model';

/**
 * Generate a cryptographically secure random string for PKCE
 *
 * Uses Web Crypto API for secure random generation.
 * Output is base64url-encoded (URL-safe base64 without padding).
 *
 * @param length - Length of the random string (default: 64)
 * @returns Base64url-encoded random string
 */
export function generateRandomString(
  length: number = OAUTH_CONSTANTS.CODE_VERIFIER_LENGTH
): string {
  // Validate length
  if (
    length < OAUTH_CONSTANTS.CODE_VERIFIER_MIN_LENGTH ||
    length > OAUTH_CONSTANTS.CODE_VERIFIER_MAX_LENGTH
  ) {
    throw new Error(
      `Random string length must be between ${OAUTH_CONSTANTS.CODE_VERIFIER_MIN_LENGTH} ` +
        `and ${OAUTH_CONSTANTS.CODE_VERIFIER_MAX_LENGTH} characters`
    );
  }

  // Generate random bytes
  const randomBytes = new Uint8Array(length);
  crypto.getRandomValues(randomBytes);

  // Convert to base64url (URL-safe base64 without padding)
  return base64urlEncode(randomBytes);
}

/**
 * Generate OAuth2 state parameter for CSRF protection
 * State parameter doesn't need to follow code verifier length constraints
 *
 * @returns Random state string
 */
export function generateState(): string {
  // Generate random bytes for state (32 characters)
  const randomBytes = new Uint8Array(OAUTH_CONSTANTS.STATE_LENGTH);
  crypto.getRandomValues(randomBytes);

  // Convert to base64url (URL-safe base64 without padding)
  return base64urlEncode(randomBytes);
}

/**
 * Generate PKCE code verifier
 *
 * A cryptographically random string using unreserved characters:
 * [A-Z] / [a-z] / [0-9] / "-" / "." / "_" / "~"
 *
 * @returns Code verifier string (base64url-encoded)
 */
export function generateCodeVerifier(): string {
  return generateRandomString(OAUTH_CONSTANTS.CODE_VERIFIER_LENGTH);
}

/**
 * Generate PKCE code challenge from code verifier
 *
 * Creates SHA-256 hash of the code verifier and encodes it as base64url.
 * This challenge is sent in the authorization request, and the original
 * verifier is sent when exchanging the authorization code for tokens.
 *
 * @param codeVerifier - The code verifier to hash
 * @returns Base64url-encoded SHA-256 hash of the code verifier
 */
export async function generateCodeChallenge(codeVerifier: string): Promise<string> {
  // Convert verifier to buffer
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);

  // Generate SHA-256 hash
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);

  // Convert to Uint8Array and base64url encode
  const hashArray = new Uint8Array(hashBuffer);
  return base64urlEncode(hashArray);
}

/**
 * Generate complete PKCE challenge (verifier + challenge)
 *
 * @returns PKCE challenge object with verifier and challenge
 */
export async function generatePKCEChallenge(): Promise<PKCEChallenge> {
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);

  return {
    codeVerifier,
    codeChallenge,
    codeChallengeMethod: OAUTH_CONSTANTS.CODE_CHALLENGE_METHOD,
  };
}

/**
 * Base64url encode (RFC 7636)
 *
 * Standard base64 encoding with URL-safe character substitutions:
 * - '+' becomes '-'
 * - '/' becomes '_'
 * - Remove padding '='
 *
 * @param input - Uint8Array to encode
 * @returns Base64url-encoded string
 */
function base64urlEncode(input: Uint8Array): string {
  // Convert to base64
  let base64 = '';
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

  // Process 3 bytes at a time
  for (let i = 0; i < input.length; i += 3) {
    const byte1 = input[i];
    const byte2 = i + 1 < input.length ? input[i + 1] : 0;
    const byte3 = i + 2 < input.length ? input[i + 2] : 0;

    const encoded1 = byte1 >> 2;
    const encoded2 = ((byte1 & 3) << 4) | (byte2 >> 4);
    const encoded3 = ((byte2 & 15) << 2) | (byte3 >> 6);
    const encoded4 = byte3 & 63;

    base64 += chars[encoded1];
    base64 += chars[encoded2];
    base64 += i + 1 < input.length ? chars[encoded3] : '=';
    base64 += i + 2 < input.length ? chars[encoded4] : '=';
  }

  // Convert to base64url: replace + with -, / with _, remove padding =
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * Validate code verifier format
 *
 * Code verifier must be:
 * - Between 43 and 128 characters
 * - Contain only [A-Z], [a-z], [0-9], '-', '.', '_', '~'
 *
 * @param verifier - Code verifier to validate
 * @returns True if valid, false otherwise
 */
export function validateCodeVerifier(verifier: string): boolean {
  // Check length
  if (
    verifier.length < OAUTH_CONSTANTS.CODE_VERIFIER_MIN_LENGTH ||
    verifier.length > OAUTH_CONSTANTS.CODE_VERIFIER_MAX_LENGTH
  ) {
    return false;
  }

  // Check character set (unreserved characters only)
  const validPattern = /^[A-Za-z0-9\-._~]+$/;
  return validPattern.test(verifier);
}

/**
 * Build authorization URL with PKCE parameters
 *
 * @param config - OAuth configuration
 * @param challenge - PKCE challenge
 * @param state - OAuth state parameter
 * @returns Complete authorization URL
 */
export function buildAuthorizationUrl(
  authorizationEndpoint: string,
  clientId: string,
  redirectUri: string,
  scopes: string[],
  challenge: PKCEChallenge,
  state: string
): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: OAUTH_CONSTANTS.RESPONSE_TYPE,
    scope: scopes.join(' '),
    state,
    code_challenge: challenge.codeChallenge,
    code_challenge_method: challenge.codeChallengeMethod,
  });

  return `${authorizationEndpoint}?${params.toString()}`;
}
