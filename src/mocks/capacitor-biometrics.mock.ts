/**
 * Mock for @capawesome-team/capacitor-biometrics
 * The actual plugin is a premium/paid package not available in public npm.
 * This mock provides the interface for development and testing.
 */

export interface IsAvailableResult {
  isAvailable: boolean;
  biometryType?: 'FINGERPRINT' | 'FACE' | 'IRIS' | 'NONE';
}

export interface AuthenticateResult {
  success: boolean;
}

export interface AuthenticateOptions {
  reason?: string;
  title?: string;
  subtitle?: string;
  negativeButtonText?: string;
}

export const BiometricAuth = {
  isAvailable: async (): Promise<IsAvailableResult> => {
    // In mock mode, return as unavailable
    return { isAvailable: false, biometryType: 'NONE' };
  },

  authenticate: async (_options?: AuthenticateOptions): Promise<AuthenticateResult> => {
    // In mock mode, always fail authentication
    return { success: false };
  },
};
