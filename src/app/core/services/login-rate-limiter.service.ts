import { Injectable, OnDestroy } from '@angular/core';
import { LoggerService } from '@services/logger.service';

/**
 * Rate limiting state for a single identifier (email/DNI)
 */
interface RateLimitState {
  attempts: number;
  lastAttempt: number;
  lockedUntil: number | null;
}

/**
 * Result of rate limit check
 */
export interface RateLimitResult {
  allowed: boolean;
  remainingAttempts: number;
  lockoutRemaining: number | null; // milliseconds until lockout expires
  waitTime: number | null; // milliseconds to wait before next attempt (backoff)
}

/**
 * LoginRateLimiterService - Implements exponential backoff and lockout for login attempts
 *
 * Security features:
 * - Tracks failed login attempts per identifier (email/DNI)
 * - Exponential backoff after each failed attempt
 * - 15-minute lockout after max attempts (configurable)
 * - In-memory storage (resets on app restart - can be enhanced with persistent storage)
 *
 * Configuration:
 * - MAX_ATTEMPTS: 5 failed attempts before lockout
 * - LOCKOUT_DURATION_MS: 15 minutes (900,000ms)
 * - BASE_BACKOFF_MS: 1 second base delay, doubles each attempt
 */
@Injectable({
  providedIn: 'root',
})
export class LoginRateLimiterService implements OnDestroy {
  // Configuration
  private readonly MAX_ATTEMPTS = 5;
  private readonly LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
  private readonly BASE_BACKOFF_MS = 1000; // 1 second
  private readonly MAX_BACKOFF_MS = 30000; // 30 seconds max backoff

  // In-memory storage of rate limit states
  // Key: normalized identifier (email/DNI lowercase)
  private rateLimitStates = new Map<string, RateLimitState>();

  // Cleanup interval for expired entries
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor(private logger: LoggerService) {
    // Start cleanup interval (every 5 minutes)
    this.startCleanupInterval();
  }

  /**
   * Normalize identifier for consistent tracking
   */
  private normalizeIdentifier(identifier: string): string {
    return identifier.toLowerCase().trim();
  }

  /**
   * Get or create rate limit state for an identifier
   */
  private getState(identifier: string): RateLimitState {
    const key = this.normalizeIdentifier(identifier);
    let state = this.rateLimitStates.get(key);

    if (!state) {
      state = {
        attempts: 0,
        lastAttempt: 0,
        lockedUntil: null,
      };
      this.rateLimitStates.set(key, state);
    }

    return state;
  }

  /**
   * Calculate exponential backoff delay
   * Formula: min(BASE * 2^attempts, MAX_BACKOFF)
   */
  private calculateBackoffMs(attempts: number): number {
    if (attempts <= 1) return 0; // No backoff for first attempt

    const delay = this.BASE_BACKOFF_MS * Math.pow(2, attempts - 1);
    return Math.min(delay, this.MAX_BACKOFF_MS);
  }

  /**
   * Check if a login attempt is allowed for the given identifier
   * Call this BEFORE attempting login
   *
   * @param identifier Email or DNI
   * @returns RateLimitResult with allowed status and timing info
   */
  checkRateLimit(identifier: string): RateLimitResult {
    const state = this.getState(identifier);
    const now = Date.now();

    // Check if currently locked out
    if (state.lockedUntil && now < state.lockedUntil) {
      const lockoutRemaining = state.lockedUntil - now;
      this.logger.warn('RateLimit', 'Login blocked - account locked', {
        identifier: this.maskIdentifier(identifier),
        lockoutRemaining: Math.ceil(lockoutRemaining / 1000),
      });

      return {
        allowed: false,
        remainingAttempts: 0,
        lockoutRemaining,
        waitTime: lockoutRemaining,
      };
    }

    // Check if lockout has expired
    if (state.lockedUntil && now >= state.lockedUntil) {
      // Reset after lockout expires
      state.attempts = 0;
      state.lockedUntil = null;
      this.logger.info('RateLimit', 'Lockout expired, resetting attempts', {
        identifier: this.maskIdentifier(identifier),
      });
    }

    // Calculate backoff wait time
    const backoffMs = this.calculateBackoffMs(state.attempts);
    const timeSinceLastAttempt = now - state.lastAttempt;

    if (backoffMs > 0 && timeSinceLastAttempt < backoffMs) {
      const waitTime = backoffMs - timeSinceLastAttempt;
      this.logger.debug('RateLimit', 'Backoff in effect', {
        identifier: this.maskIdentifier(identifier),
        waitTime: Math.ceil(waitTime / 1000),
        attempts: state.attempts,
      });

      return {
        allowed: false,
        remainingAttempts: this.MAX_ATTEMPTS - state.attempts,
        lockoutRemaining: null,
        waitTime,
      };
    }

    return {
      allowed: true,
      remainingAttempts: this.MAX_ATTEMPTS - state.attempts,
      lockoutRemaining: null,
      waitTime: null,
    };
  }

  /**
   * Record a failed login attempt
   * Call this AFTER a failed login
   *
   * @param identifier Email or DNI
   * @returns Updated rate limit status
   */
  recordFailedAttempt(identifier: string): RateLimitResult {
    const state = this.getState(identifier);
    const now = Date.now();

    state.attempts++;
    state.lastAttempt = now;

    this.logger.warn('RateLimit', 'Failed login attempt recorded', {
      identifier: this.maskIdentifier(identifier),
      attempts: state.attempts,
      maxAttempts: this.MAX_ATTEMPTS,
    });

    // Check if we should lock out
    if (state.attempts >= this.MAX_ATTEMPTS) {
      state.lockedUntil = now + this.LOCKOUT_DURATION_MS;
      this.logger.error('RateLimit', 'Account locked due to too many failed attempts', {
        identifier: this.maskIdentifier(identifier),
        lockedUntilMs: state.lockedUntil,
        lockoutMinutes: this.LOCKOUT_DURATION_MS / 60000,
      });

      return {
        allowed: false,
        remainingAttempts: 0,
        lockoutRemaining: this.LOCKOUT_DURATION_MS,
        waitTime: this.LOCKOUT_DURATION_MS,
      };
    }

    const backoffMs = this.calculateBackoffMs(state.attempts);

    return {
      allowed: false,
      remainingAttempts: this.MAX_ATTEMPTS - state.attempts,
      lockoutRemaining: null,
      waitTime: backoffMs,
    };
  }

  /**
   * Record a successful login attempt
   * Call this AFTER a successful login to reset the rate limit
   *
   * @param identifier Email or DNI
   */
  recordSuccessfulLogin(identifier: string): void {
    const key = this.normalizeIdentifier(identifier);
    this.rateLimitStates.delete(key);
    this.logger.debug('RateLimit', 'Successful login, rate limit reset', {
      identifier: this.maskIdentifier(identifier),
    });
  }

  /**
   * Clear rate limit state for an identifier
   * Useful for password reset flows
   *
   * @param identifier Email or DNI
   */
  clearRateLimit(identifier: string): void {
    const key = this.normalizeIdentifier(identifier);
    this.rateLimitStates.delete(key);
    this.logger.info('RateLimit', 'Rate limit cleared', {
      identifier: this.maskIdentifier(identifier),
    });
  }

  /**
   * Get remaining lockout time in a human-readable format
   *
   * @param identifier Email or DNI
   * @returns Formatted string like "14:32" or null if not locked
   */
  getLockoutTimeRemaining(identifier: string): string | null {
    const state = this.getState(identifier);
    const now = Date.now();

    if (!state.lockedUntil || now >= state.lockedUntil) {
      return null;
    }

    const remainingMs = state.lockedUntil - now;
    const minutes = Math.floor(remainingMs / 60000);
    const seconds = Math.floor((remainingMs % 60000) / 1000);

    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  /**
   * Mask identifier for logging (privacy)
   */
  private maskIdentifier(identifier: string): string {
    if (identifier.includes('@')) {
      // Email: show first 2 chars and domain
      const [local, domain] = identifier.split('@');
      return `${local.substring(0, 2)}***@${domain}`;
    } else {
      // DNI: show first 2 and last 2 chars
      if (identifier.length > 4) {
        return `${identifier.substring(0, 2)}***${identifier.substring(identifier.length - 2)}`;
      }
      return '***';
    }
  }

  /**
   * Start periodic cleanup of expired entries
   */
  private startCleanupInterval(): void {
    // Clean up every 5 minutes
    this.cleanupInterval = setInterval(
      () => {
        this.cleanupExpiredEntries();
      },
      5 * 60 * 1000
    );
  }

  /**
   * Remove expired rate limit entries to prevent memory leaks
   */
  private cleanupExpiredEntries(): void {
    const now = Date.now();
    const expireThreshold = 30 * 60 * 1000; // 30 minutes after last attempt
    let removed = 0;

    for (const [key, state] of this.rateLimitStates.entries()) {
      // Remove if: not locked and last attempt was more than 30 minutes ago
      const isExpired = !state.lockedUntil && now - state.lastAttempt > expireThreshold;

      // Remove if: lockout has expired and last attempt was more than 30 minutes ago
      const lockoutExpired =
        state.lockedUntil && now > state.lockedUntil && now - state.lastAttempt > expireThreshold;

      if (isExpired || lockoutExpired) {
        this.rateLimitStates.delete(key);
        removed++;
      }
    }

    if (removed > 0) {
      this.logger.debug('RateLimit', 'Cleaned up expired entries', { removed });
    }
  }

  /**
   * Cleanup on service destroy
   */
  ngOnDestroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}
