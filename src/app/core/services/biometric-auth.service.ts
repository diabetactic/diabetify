import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Preferences } from '@capacitor/preferences';
import { LoggerService } from '@services/logger.service';
import { SecureStorageService } from '@services/secure-storage.service';

export interface BiometricConfig {
  enabled: boolean;
  enrolled: boolean;
  biometryType: 'fingerprint' | 'face' | 'iris' | 'none';
  lastEnrolledAt: string | null;
}

export interface BiometricAuthResult {
  success: boolean;
  authenticated: boolean;
  error?: string;
  biometryType?: string;
}

@Injectable({ providedIn: 'root' })
export class BiometricAuthService {
  private readonly STORAGE_KEY_BIOMETRIC_CONFIG = 'diabetactic_biometric_config';
  private readonly BIOMETRIC_CREDENTIAL_SERVER = 'io.diabetactic.app';

  // SECURITY: Secure storage keys for biometric-protected tokens
  private readonly BIOMETRIC_TOKEN_EXPIRY_KEY = 'biometric_token_expiry';
  private readonly BIOMETRIC_USER_ID_KEY = 'biometric_user_id';

  private biometricConfigSubject = new BehaviorSubject<BiometricConfig>({
    enabled: false,
    enrolled: false,
    biometryType: 'none',
    lastEnrolledAt: null,
  });

  public biometricConfig$ = this.biometricConfigSubject.asObservable();

  constructor(
    private logger: LoggerService,
    private secureStorage: SecureStorageService
  ) {
    this.initializeBiometricConfig();
  }

  /**
   * Check if biometric authentication is available on device
   */
  async isBiometricAvailable(): Promise<boolean> {
    try {
      const { NativeBiometric } = await import('@capgo/capacitor-native-biometric');
      const result = await NativeBiometric.isAvailable({ useFallback: false });
      return result.isAvailable;
    } catch (error) {
      this.logger.debug('Biometric', 'Biometric plugin not available', error);
      return false;
    }
  }

  /**
   * Get biometric type (fingerprint, face, iris)
   */
  async getBiometryType(): Promise<string> {
    try {
      const { NativeBiometric, BiometryType } = await import('@capgo/capacitor-native-biometric');
      const result = await NativeBiometric.isAvailable({ useFallback: false });

      switch (result.biometryType) {
        case BiometryType.FINGERPRINT:
        case BiometryType.TOUCH_ID:
          return 'fingerprint';
        case BiometryType.FACE_ID:
        case BiometryType.FACE_AUTHENTICATION:
          return 'face';
        case BiometryType.IRIS_AUTHENTICATION:
          return 'iris';
        default:
          return 'none';
      }
    } catch {
      return 'none';
    }
  }

  /**
   * Enroll biometric after successful password login
   *
   * SECURITY FIX: Stores REFRESH TOKEN instead of access token
   * - Refresh tokens have longer validity (days/weeks vs minutes)
   * - After biometric auth, refresh token is used to get fresh access token
   * - This prevents storing short-lived tokens that expire between sessions
   *
   * @param userId User identifier for the enrollment
   * @param refreshToken The refresh token to store (NOT the access token)
   * @param refreshTokenExpiresAt Optional expiry timestamp for the refresh token
   */
  async enrollBiometric(
    userId: string,
    refreshToken: string,
    refreshTokenExpiresAt?: number
  ): Promise<BiometricAuthResult> {
    try {
      const isAvailable = await this.isBiometricAvailable();
      if (!isAvailable) {
        return { success: false, authenticated: false, error: 'Biometric not available' };
      }

      if (!refreshToken) {
        this.logger.error('Biometric', 'Cannot enroll without refresh token');
        return { success: false, authenticated: false, error: 'No refresh token provided' };
      }

      // SECURITY: Store refresh token in native biometric secure storage
      // This requires biometric verification to access
      const { NativeBiometric } = await import('@capgo/capacitor-native-biometric');
      await NativeBiometric.setCredentials({
        username: userId,
        password: refreshToken, // SECURITY: Store REFRESH token, not access token
        server: this.BIOMETRIC_CREDENTIAL_SERVER,
      });

      // Store additional metadata in SecureStorage
      // User ID for verification, expiry for validation
      await Promise.all([
        this.secureStorage.set(this.BIOMETRIC_USER_ID_KEY, userId),
        refreshTokenExpiresAt
          ? this.secureStorage.set(
              this.BIOMETRIC_TOKEN_EXPIRY_KEY,
              refreshTokenExpiresAt.toString()
            )
          : Promise.resolve(),
      ]);

      // Update config
      const biometryType = await this.getBiometryType();
      const config: BiometricConfig = {
        enabled: true,
        enrolled: true,
        biometryType: biometryType as BiometricConfig['biometryType'],
        lastEnrolledAt: new Date().toISOString(),
      };

      await Preferences.set({
        key: this.STORAGE_KEY_BIOMETRIC_CONFIG,
        value: JSON.stringify(config),
      });

      this.biometricConfigSubject.next(config);
      this.logger.info('Biometric', 'Enrollment successful with refresh token', {
        biometryType,
        hasExpiry: Boolean(refreshTokenExpiresAt),
      });

      return { success: true, authenticated: true, biometryType };
    } catch (error) {
      this.logger.error('Biometric', 'Enrollment failed', error);
      return { success: false, authenticated: false, error: 'Enrollment failed' };
    }
  }

  /**
   * Authenticate with biometric
   */
  async authenticateWithBiometric(
    reason = 'Authenticate to access your account'
  ): Promise<BiometricAuthResult> {
    try {
      const config = this.biometricConfigSubject.value;
      if (!config.enrolled) {
        return { success: false, authenticated: false, error: 'Not enrolled' };
      }

      const { NativeBiometric } = await import('@capgo/capacitor-native-biometric');

      // verifyIdentity throws on failure, resolves on success
      await NativeBiometric.verifyIdentity({
        reason,
        title: 'Diabetactic',
        subtitle: 'Login with biometrics',
        description: reason,
        useFallback: true,
        fallbackTitle: 'Use passcode',
        maxAttempts: 3,
      });

      this.logger.info('Biometric', 'Authentication successful');
      return { success: true, authenticated: true, biometryType: config.biometryType };
    } catch (error) {
      const errorMessage = this.extractBiometricError(error);
      this.logger.error('Biometric', 'Authentication failed', error);
      return { success: false, authenticated: false, error: errorMessage };
    }
  }

  /**
   * Get stored credentials after successful biometric auth
   */
  async getStoredCredentials(): Promise<{ userId: string; accessToken: string } | null> {
    try {
      const { NativeBiometric } = await import('@capgo/capacitor-native-biometric');

      // First check if credentials are saved
      const { isSaved } = await NativeBiometric.isCredentialsSaved({
        server: this.BIOMETRIC_CREDENTIAL_SERVER,
      });

      if (!isSaved) {
        return null;
      }

      const credentials = await NativeBiometric.getCredentials({
        server: this.BIOMETRIC_CREDENTIAL_SERVER,
      });

      return {
        userId: credentials.username,
        accessToken: credentials.password,
      };
    } catch (error) {
      this.logger.error('Biometric', 'Failed to get stored credentials', error);
      return null;
    }
  }

  /**
   * Clear biometric enrollment
   */
  async clearBiometricEnrollment(): Promise<void> {
    try {
      const { NativeBiometric } = await import('@capgo/capacitor-native-biometric');
      await NativeBiometric.deleteCredentials({
        server: this.BIOMETRIC_CREDENTIAL_SERVER,
      });

      const config: BiometricConfig = {
        enabled: false,
        enrolled: false,
        biometryType: 'none',
        lastEnrolledAt: null,
      };

      await Preferences.set({
        key: this.STORAGE_KEY_BIOMETRIC_CONFIG,
        value: JSON.stringify(config),
      });

      this.biometricConfigSubject.next(config);
      this.logger.info('Biometric', 'Enrollment cleared');
    } catch (error) {
      this.logger.error('Biometric', 'Failed to clear enrollment', error);
    }
  }

  private async initializeBiometricConfig(): Promise<void> {
    try {
      const { value } = await Preferences.get({ key: this.STORAGE_KEY_BIOMETRIC_CONFIG });
      if (value) {
        const config = JSON.parse(value) as BiometricConfig;
        this.biometricConfigSubject.next(config);
      }
    } catch (error) {
      this.logger.error('Biometric', 'Failed to initialize config', error);
    }
  }

  private extractBiometricError(error: unknown): string {
    const err = error as Record<string, unknown>;
    const code = err['code'] || err['errorCode'];

    // BiometricAuthError enum values from @capgo/capacitor-native-biometric
    switch (code) {
      case 1: // BIOMETRICS_UNAVAILABLE
        return 'Biometric not available';
      case 3: // BIOMETRICS_NOT_ENROLLED
        return 'No biometric enrolled on device';
      case 10: // AUTHENTICATION_FAILED
        return 'Authentication failed';
      case 16: // USER_CANCEL
        return 'Cancelled';
      case 2: // USER_LOCKOUT
      case 4: // USER_TEMPORARY_LOCKOUT
        return 'Too many attempts. Use password.';
      case 17: // USER_FALLBACK
        return 'User chose fallback';
      default:
        return 'Authentication failed';
    }
  }
}
