// Initialize TestBed environment for Vitest
import '../../../test-setup';

import { TestBed } from '@angular/core/testing';
import { BiometricAuthService, BiometricConfig } from '@services/biometric-auth.service';
import { LoggerService } from '@services/logger.service';
import { Preferences } from '@capacitor/preferences';

// Create mock functions for NativeBiometric
const mockIsAvailable = vi.fn();
const mockVerifyIdentity = vi.fn();
const mockSetCredentials = vi.fn();
const mockGetCredentials = vi.fn();
const mockDeleteCredentials = vi.fn();
const mockIsCredentialsSaved = vi.fn();

// Mock the Capgo biometric plugin
vi.mock('@capgo/capacitor-native-biometric', () => ({
  NativeBiometric: {
    isAvailable: mockIsAvailable,
    verifyIdentity: mockVerifyIdentity,
    setCredentials: mockSetCredentials,
    getCredentials: mockGetCredentials,
    deleteCredentials: mockDeleteCredentials,
    isCredentialsSaved: mockIsCredentialsSaved,
  },
  BiometryType: {
    NONE: 0,
    TOUCH_ID: 1,
    FACE_ID: 2,
    FINGERPRINT: 3,
    FACE_AUTHENTICATION: 4,
    IRIS_AUTHENTICATION: 5,
    MULTIPLE: 6,
  },
}));

describe('BiometricAuthService', () => {
  let service: BiometricAuthService;
  let mockLogger: Mock<LoggerService>;

  const mockBiometricConfig: BiometricConfig = {
    enabled: true,
    enrolled: true,
    biometryType: 'fingerprint',
    lastEnrolledAt: '2025-01-01T00:00:00.000Z',
  };

  beforeEach(async () => {
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as Mock<LoggerService>;

    // Reset all mocks
    vi.clearAllMocks();

    // Reset Capacitor Preferences mocks
    (Preferences.get as Mock).mockResolvedValue({ value: null });
    (Preferences.set as Mock).mockResolvedValue(undefined);

    await TestBed.configureTestingModule({
      providers: [BiometricAuthService, { provide: LoggerService, useValue: mockLogger }],
    }).compileComponents();

    service = TestBed.inject(BiometricAuthService);
  });

  describe('initial state', () => {
    it('should have default config', () =>
      new Promise<void>(resolve => {
        service.biometricConfig$.subscribe(config => {
          expect(config.enabled).toBe(false);
          expect(config.enrolled).toBe(false);
          expect(config.biometryType).toBe('none');
          resolve();
        });
      }));
  });

  describe('isBiometricAvailable', () => {
    it('should return true when biometric is available', async () => {
      mockIsAvailable.mockResolvedValue({
        isAvailable: true,
        biometryType: 3, // FINGERPRINT
      });

      const result = await service.isBiometricAvailable();
      expect(result).toBe(true);
    });

    it('should return false when biometric is not available', async () => {
      mockIsAvailable.mockResolvedValue({ isAvailable: false, biometryType: 0 });

      const result = await service.isBiometricAvailable();
      expect(result).toBe(false);
    });

    it('should return false when plugin throws', async () => {
      mockIsAvailable.mockRejectedValue(new Error('Plugin not available'));

      const result = await service.isBiometricAvailable();
      expect(result).toBe(false);
    });
  });

  describe('enrollBiometric', () => {
    it('should enroll successfully when biometric is available', async () => {
      mockIsAvailable.mockResolvedValue({
        isAvailable: true,
        biometryType: 3, // FINGERPRINT
      });
      mockSetCredentials.mockResolvedValue(undefined);

      const result = await service.enrollBiometric('user123', 'token123');

      expect(result.success).toBe(true);
      expect(result.authenticated).toBe(true);
      expect(mockSetCredentials).toHaveBeenCalledWith({
        username: 'user123',
        password: 'token123',
        server: 'io.diabetactic.app',
      });
      expect(Preferences.set).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Biometric',
        'Enrollment successful with refresh token',
        expect.any(Object)
      );
    });

    it('should fail when biometric is not available', async () => {
      mockIsAvailable.mockResolvedValue({ isAvailable: false, biometryType: 0 });

      const result = await service.enrollBiometric('user123', 'token123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Biometric not available');
    });
  });

  describe('authenticateWithBiometric', () => {
    it('should authenticate successfully when enrolled', async () => {
      // Manually set the biometric config to enrolled state
      (service as any).biometricConfigSubject.next(mockBiometricConfig);
      mockVerifyIdentity.mockResolvedValue(undefined); // verifyIdentity resolves on success

      const result = await service.authenticateWithBiometric('Test reason');

      expect(result.success).toBe(true);
      expect(result.authenticated).toBe(true);
      expect(mockVerifyIdentity).toHaveBeenCalledWith(
        expect.objectContaining({
          reason: 'Test reason',
          title: 'Diabetactic',
        })
      );
    });

    it('should fail when not enrolled', async () => {
      const result = await service.authenticateWithBiometric();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Not enrolled');
    });

    it('should fail when user cancels', async () => {
      // Manually set the biometric config to enrolled state
      (service as any).biometricConfigSubject.next(mockBiometricConfig);
      mockVerifyIdentity.mockRejectedValue({ code: 16 }); // USER_CANCEL

      const result = await service.authenticateWithBiometric('Test reason');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Cancelled');
    });
  });

  describe('clearBiometricEnrollment', () => {
    it('should clear enrollment', async () => {
      mockDeleteCredentials.mockResolvedValue(undefined);

      await service.clearBiometricEnrollment();

      expect(mockDeleteCredentials).toHaveBeenCalledWith({
        server: 'io.diabetactic.app',
      });
      expect(Preferences.set).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('Biometric', 'Enrollment cleared');
    });
  });

  describe('getStoredCredentials', () => {
    it('should return credentials when stored', async () => {
      mockIsCredentialsSaved.mockResolvedValue({ isSaved: true });
      mockGetCredentials.mockResolvedValue({
        username: 'user123',
        password: 'token123',
      });

      const result = await service.getStoredCredentials();

      expect(result).toEqual({
        userId: 'user123',
        accessToken: 'token123',
      });
    });

    it('should return null when no credentials stored', async () => {
      mockIsCredentialsSaved.mockResolvedValue({ isSaved: false });

      const result = await service.getStoredCredentials();

      expect(result).toBeNull();
    });
  });
});
