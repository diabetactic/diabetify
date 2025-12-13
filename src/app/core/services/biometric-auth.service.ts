import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Preferences } from '@capacitor/preferences';
import { SecureStorage } from '@aparajita/capacitor-secure-storage';
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
  private readonly BIOMETRIC_CREDENTIAL_ID = 'diabetactic_biometric_auth';

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
      // Dynamic import to avoid errors when plugin not installed
      const { BiometricAuth } = await import('@capawesome-team/capacitor-biometrics');
      const result = await BiometricAuth.isAvailable();
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
      const { BiometricAuth } = await import('@capawesome-team/capacitor-biometrics');
      const result = await BiometricAuth.isAvailable();
      return result.biometryType || 'unknown';
    } catch (error) {
      return 'unknown';
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

      // Store credentials in SecureStorage
      await SecureStorage.setItem(
        this.BIOMETRIC_CREDENTIAL_ID,
        JSON.stringify({ userId, accessToken, enrolledAt: new Date().toISOString() })
      );

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
    reason: string = 'Authenticate to access your account'
  ): Promise<BiometricAuthResult> {
    try {
      const config = this.biometricConfigSubject.value;
      if (!config.enrolled) {
        return { success: false, authenticated: false, error: 'Not enrolled' };
      }

      const { BiometricAuth } = await import('@capawesome-team/capacitor-biometrics');
      const result = await BiometricAuth.authenticate({
        reason,
        cancelTitle: 'Cancel',
        fallbackTitle: 'Use passcode',
        androidConfirmationRequired: false,
      });

      if (!result.success) {
        return { success: false, authenticated: false, error: 'Authentication failed' };
      }

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
      const result = await SecureStorage.getItem(this.BIOMETRIC_CREDENTIAL_ID);
      if (result) {
        return JSON.parse(result);
      }
      return null;
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
      await SecureStorage.removeItem(this.BIOMETRIC_CREDENTIAL_ID);

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
    switch (err['code']) {
      case 'NOT_AVAILABLE':
        return 'Biometric not available';
      case 'NOT_ENROLLED':
        return 'No biometric enrolled on device';
      case 'AUTHENTICATION_FAILED':
        return 'Authentication failed';
      case 'USER_CANCEL':
        return 'Cancelled';
      case 'BIOMETRIC_ERROR_LOCKOUT':
        return 'Too many attempts. Use password.';
      default:
        return 'Authentication failed';
    }
  }
}
