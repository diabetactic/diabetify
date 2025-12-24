import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Preferences } from '@capacitor/preferences';
import { LoggerService } from '@services/logger.service';

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

  private biometricConfigSubject = new BehaviorSubject<BiometricConfig>({
    enabled: false,
    enrolled: false,
    biometryType: 'none',
    lastEnrolledAt: null,
  });

  public biometricConfig$ = this.biometricConfigSubject.asObservable();

  constructor(private logger: LoggerService) {
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
   */
  async enrollBiometric(userId: string, accessToken: string): Promise<BiometricAuthResult> {
    try {
      const isAvailable = await this.isBiometricAvailable();
      if (!isAvailable) {
        return { success: false, authenticated: false, error: 'Biometric not available' };
      }

      // Store credentials using the plugin's built-in secure storage
      const { NativeBiometric } = await import('@capgo/capacitor-native-biometric');
      await NativeBiometric.setCredentials({
        username: userId,
        password: accessToken,
        server: this.BIOMETRIC_CREDENTIAL_SERVER,
      });

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
      this.logger.info('Biometric', 'Enrollment successful', { biometryType });

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
