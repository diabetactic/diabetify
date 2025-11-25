/**
 * TokenStorageService - Secure Token Storage Management
 *
 * Handles secure storage of OAuth tokens using Android Keystore.
 * - Access tokens: In-memory only (cleared on app restart)
 * - Refresh tokens: Encrypted storage via @aparajita/capacitor-secure-storage
 * - Auth data: Encrypted storage via Android Keystore
 *
 * Security principles:
 * 1. Access tokens should never be persisted to prevent theft
 * 2. Refresh tokens are encrypted using Android Keystore (hardware-backed)
 * 3. Tokens should never appear in logs or error messages
 * 4. Clear all tokens on logout
 *
 * Implementation: Uses @aparajita/capacitor-secure-storage v6.x for
 * platform-specific secure storage (Android Keystore).
 */

import { Injectable } from '@angular/core';
import { SecureStorage } from '@aparajita/capacitor-secure-storage';
import { TidepoolAuth, TokenValidation } from '../models/tidepool-auth.model';
import { OAUTH_CONSTANTS } from '../config/oauth.config';

/**
 * Storage keys for tokens
 */
const STORAGE_KEYS = {
  REFRESH_TOKEN: 'tidepool_refresh_token_encrypted',
  AUTH_DATA: 'tidepool_auth_encrypted',
  TOKEN_METADATA: 'tidepool_token_metadata',
} as const;

/**
 * Token metadata for tracking expiry
 */
interface TokenMetadata {
  accessTokenExpiry: number;
  refreshTokenExpiry: number;
  lastRefresh: number;
}

@Injectable({
  providedIn: 'root',
})
export class TokenStorageService {
  // In-memory storage for access token (not persisted)
  private accessToken: string | null = null;
  private accessTokenExpiry: number | null = null;

  constructor() {}

  /**
   * Store complete authentication data securely
   *
   * @param auth - Tidepool authentication data
   */
  async storeAuth(auth: TidepoolAuth): Promise<void> {
    try {
      // Store access token in memory only
      this.accessToken = auth.accessToken;
      this.accessTokenExpiry = new Date(auth.expiresAt).getTime();

      // Store refresh token in Android Keystore (hardware-backed encryption)
      if (auth.refreshToken) {
        await SecureStorage.set(STORAGE_KEYS.REFRESH_TOKEN, auth.refreshToken);
      }

      // Store full auth data in Android Keystore
      await SecureStorage.set(STORAGE_KEYS.AUTH_DATA, JSON.stringify(auth));

      // Store token metadata
      const metadata: TokenMetadata = {
        accessTokenExpiry: this.accessTokenExpiry,
        refreshTokenExpiry: this.accessTokenExpiry + 3600 * 1000, // Refresh token typically lasts longer
        lastRefresh: Date.now(),
      };

      await SecureStorage.set(STORAGE_KEYS.TOKEN_METADATA, JSON.stringify(metadata));
    } catch (error) {
      console.error('Failed to store authentication data');
      throw new Error('Token storage failed');
    }
  }

  /**
   * Get access token from memory
   *
   * @returns Access token if available and valid, null otherwise
   */
  async getAccessToken(): Promise<string | null> {
    if (!this.accessToken || !this.accessTokenExpiry) {
      return null;
    }

    // Check if token is expired
    if (this.isTokenExpired(this.accessTokenExpiry)) {
      this.clearAccessToken();
      return null;
    }

    return this.accessToken;
  }

  /**
   * Get refresh token from secure storage
   *
   * @returns Refresh token if available (automatically decrypted from Android Keystore)
   */
  async getRefreshToken(): Promise<string | null> {
    try {
      const token = await SecureStorage.get(STORAGE_KEYS.REFRESH_TOKEN);
      return (token as string) || null;
    } catch (error) {
      console.error('Failed to retrieve refresh token');
      return null;
    }
  }

  /**
   * Get complete auth data from secure storage
   *
   * @returns Auth data if available (automatically decrypted from Android Keystore)
   */
  async getAuthData(): Promise<TidepoolAuth | null> {
    try {
      const data = await SecureStorage.get(STORAGE_KEYS.AUTH_DATA);
      if (!data) {
        return null;
      }
      return JSON.parse(data as string);
    } catch (error) {
      console.error('Failed to retrieve auth data');
      return null;
    }
  }

  /**
   * Update access token in memory
   *
   * @param token - New access token
   * @param expiresIn - Expiry time in seconds
   */
  updateAccessToken(token: string, expiresIn: number): void {
    this.accessToken = token;
    this.accessTokenExpiry = Date.now() + expiresIn * 1000;
  }

  /**
   * Clear access token from memory
   */
  clearAccessToken(): void {
    this.accessToken = null;
    this.accessTokenExpiry = null;
  }

  /**
   * Clear all tokens (logout)
   */
  async clearAll(): Promise<void> {
    try {
      // Clear memory
      this.clearAccessToken();

      // Clear secure storage
      await SecureStorage.remove(STORAGE_KEYS.REFRESH_TOKEN);
      await SecureStorage.remove(STORAGE_KEYS.AUTH_DATA);
      await SecureStorage.remove(STORAGE_KEYS.TOKEN_METADATA);
    } catch (error) {
      console.error('Failed to clear tokens');
      throw error;
    }
  }

  /**
   * Check if access token exists and is valid
   *
   * @param bufferSeconds - Consider token expired if within buffer time (default: 60s)
   * @returns True if token is valid
   */
  async hasValidAccessToken(
    bufferSeconds: number = OAUTH_CONSTANTS.TOKEN_EXPIRY_BUFFER_SECONDS
  ): Promise<boolean> {
    if (!this.accessToken || !this.accessTokenExpiry) {
      return false;
    }

    const now = Date.now();
    const buffer = bufferSeconds * 1000;

    return this.accessTokenExpiry - now > buffer;
  }

  /**
   * Check if refresh token exists
   *
   * @returns True if refresh token is stored
   */
  async hasRefreshToken(): Promise<boolean> {
    const token = await this.getRefreshToken();
    return token !== null;
  }

  /**
   * Validate token and get metadata
   *
   * @returns Token validation info
   */
  async validateToken(): Promise<TokenValidation> {
    const hasAccess = await this.hasValidAccessToken();
    const hasRefresh = await this.hasRefreshToken();

    let expiresIn: number | undefined;
    let expiresAt: string | undefined;

    if (this.accessTokenExpiry) {
      const now = Date.now();
      expiresIn = Math.max(0, Math.floor((this.accessTokenExpiry - now) / 1000));
      expiresAt = new Date(this.accessTokenExpiry).toISOString();
    }

    return {
      valid: hasAccess || hasRefresh,
      expired: !hasAccess,
      expiresIn: expiresIn ?? 0,
      shouldRefresh: hasAccess
        ? this.accessTokenExpiry! - Date.now() < OAUTH_CONSTANTS.TOKEN_EXPIRY_BUFFER_SECONDS * 1000
        : false,
    };
  }

  /**
   * Get token metadata
   *
   * @returns Token metadata if available
   */
  private async getMetadata(): Promise<TokenMetadata | null> {
    try {
      const value = await SecureStorage.get(STORAGE_KEYS.TOKEN_METADATA);
      if (!value) {
        return null;
      }
      return JSON.parse(value as string);
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if token is expired
   *
   * @param expiryTimestamp - Token expiry timestamp in milliseconds
   * @returns True if expired
   */
  private isTokenExpired(expiryTimestamp: number): boolean {
    return Date.now() >= expiryTimestamp;
  }

  /**
   * Sanitize sensitive data for logging
   *
   * Masks tokens and sensitive information to prevent exposure in logs.
   *
   * @param data - Data that may contain sensitive info
   * @returns Sanitized data safe for logging
   */
  static sanitizeForLogging(data: any): any {
    if (typeof data === 'string') {
      // If it looks like a JWT or long token, mask it
      if (data.length > 50 && (data.includes('.') || data.match(/^[A-Za-z0-9_-]+$/))) {
        return '***TOKEN***';
      }
      return data;
    }

    if (typeof data === 'object' && data !== null) {
      const sanitized: any = {};
      for (const key in data) {
        if (
          key.toLowerCase().includes('token') ||
          key.toLowerCase().includes('password') ||
          key.toLowerCase().includes('secret')
        ) {
          sanitized[key] = '***';
        } else {
          sanitized[key] = TokenStorageService.sanitizeForLogging(data[key]);
        }
      }
      return sanitized;
    }

    return data;
  }
}
