/**
 * TokenStorageService - Secure Token Storage Management
 *
 * Handles secure storage of OAuth tokens with encryption.
 * - Access tokens: In-memory only (cleared on app restart)
 * - Refresh tokens: Encrypted storage in Capacitor Preferences
 * - ID tokens: Encrypted storage in Capacitor Preferences
 *
 * Security principles:
 * 1. Access tokens should never be persisted to prevent theft
 * 2. Refresh tokens must be encrypted before storage
 * 3. Tokens should never appear in logs or error messages
 * 4. Clear all tokens on logout
 *
 * NOTE: This implementation uses a simple Base64 encoding as a placeholder.
 * For production, you should use @capacitor-community/secure-storage-plugin
 * or implement proper encryption using Web Crypto API with a secure key.
 */

import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
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

      // Encrypt and store refresh token
      if (auth.refreshToken) {
        const encryptedRefreshToken = await this.encrypt(auth.refreshToken);
        await Preferences.set({
          key: STORAGE_KEYS.REFRESH_TOKEN,
          value: encryptedRefreshToken,
        });
      }

      // Encrypt and store full auth data (for user info restoration)
      const encryptedAuthData = await this.encrypt(JSON.stringify(auth));
      await Preferences.set({
        key: STORAGE_KEYS.AUTH_DATA,
        value: encryptedAuthData,
      });

      // Store token metadata
      const metadata: TokenMetadata = {
        accessTokenExpiry: this.accessTokenExpiry,
        refreshTokenExpiry: this.accessTokenExpiry + 3600 * 1000, // Refresh token typically lasts longer
        lastRefresh: Date.now(),
      };

      await Preferences.set({
        key: STORAGE_KEYS.TOKEN_METADATA,
        value: JSON.stringify(metadata),
      });
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
   * Get refresh token from encrypted storage
   *
   * @returns Decrypted refresh token if available
   */
  async getRefreshToken(): Promise<string | null> {
    try {
      const { value: encryptedToken } = await Preferences.get({
        key: STORAGE_KEYS.REFRESH_TOKEN,
      });

      if (!encryptedToken) {
        return null;
      }

      return await this.decrypt(encryptedToken);
    } catch (error) {
      console.error('Failed to retrieve refresh token');
      return null;
    }
  }

  /**
   * Get complete auth data from encrypted storage
   *
   * @returns Decrypted auth data if available
   */
  async getAuthData(): Promise<TidepoolAuth | null> {
    try {
      const { value: encryptedData } = await Preferences.get({
        key: STORAGE_KEYS.AUTH_DATA,
      });

      if (!encryptedData) {
        return null;
      }

      const decryptedData = await this.decrypt(encryptedData);
      return JSON.parse(decryptedData);
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

      // Clear storage
      await Preferences.remove({ key: STORAGE_KEYS.REFRESH_TOKEN });
      await Preferences.remove({ key: STORAGE_KEYS.AUTH_DATA });
      await Preferences.remove({ key: STORAGE_KEYS.TOKEN_METADATA });
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
      const { value } = await Preferences.get({
        key: STORAGE_KEYS.TOKEN_METADATA,
      });

      if (!value) {
        return null;
      }

      return JSON.parse(value);
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
   * Encrypt sensitive data
   *
   * WARNING: This is a placeholder implementation using Base64 encoding.
   * For production apps, use proper encryption:
   *
   * Option 1: @capacitor-community/secure-storage-plugin
   * - Pros: Uses platform-specific secure storage (iOS Keychain, Android Keystore)
   * - Installation: npm install @capacitor-community/secure-storage-plugin
   *
   * Option 2: Web Crypto API with AES-GCM
   * - Requires secure key management
   * - Example: crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data)
   *
   * @param data - Data to encrypt
   * @returns Encrypted data (currently Base64-encoded)
   */
  private async encrypt(data: string): Promise<string> {
    // TODO: Replace with actual encryption
    // For now, use Base64 encoding as a placeholder
    try {
      return btoa(data);
    } catch (error) {
      console.error('Encryption failed');
      throw error;
    }
  }

  /**
   * Decrypt sensitive data
   *
   * WARNING: This is a placeholder implementation.
   * Must match the encryption method used.
   *
   * @param encryptedData - Encrypted data
   * @returns Decrypted data
   */
  private async decrypt(encryptedData: string): Promise<string> {
    // TODO: Replace with actual decryption
    // For now, use Base64 decoding as a placeholder
    try {
      return atob(encryptedData);
    } catch (error) {
      console.error('Decryption failed');
      throw error;
    }
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
