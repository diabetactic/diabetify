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

@Injectable({
  providedIn: 'root',
})
export class TokenStorageService {
  constructor() {}

  /**
   * Sanitize sensitive data for logging
   *
   * Masks tokens and sensitive information to prevent exposure in logs.
   *
   * @param data - Data that may contain sensitive info
   * @returns Sanitized data safe for logging
   */
  static sanitizeForLogging(data: unknown): unknown {
    if (typeof data === 'string') {
      // If it looks like a JWT or long token, mask it
      if (data.length > 50 && (data.includes('.') || data.match(/^[A-Za-z0-9_-]+$/))) {
        return '***TOKEN***';
      }
      return data;
    }

    if (typeof data === 'object' && data !== null) {
      const sanitized: Record<string, unknown> = {};
      for (const key in data) {
        if (
          key.toLowerCase().includes('token') ||
          key.toLowerCase().includes('password') ||
          key.toLowerCase().includes('secret')
        ) {
          sanitized[key] = '***';
        } else {
          sanitized[key] = TokenStorageService.sanitizeForLogging(
            (data as Record<string, unknown>)[key]
          );
        }
      }
      return sanitized;
    }

    return data;
  }
}
