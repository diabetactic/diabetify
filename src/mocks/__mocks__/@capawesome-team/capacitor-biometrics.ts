/**
 * Mock for @capawesome-team/capacitor-biometrics
 * The actual plugin is a premium/paid package not available in public npm.
 * This mock provides the interface for testing.
 */

export const BiometricAuth = {
  isAvailable: jest.fn().mockResolvedValue({ isAvailable: false, biometryType: 'NONE' }),
  authenticate: jest.fn().mockResolvedValue({ success: false }),
};
