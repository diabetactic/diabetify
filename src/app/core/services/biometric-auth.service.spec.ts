import { TestBed } from '@angular/core/testing';
import { BiometricAuthService, BiometricConfig } from '@services/biometric-auth.service';
import { LoggerService } from '@services/logger.service';
import { Preferences } from '@capacitor/preferences';
import { SecureStorage } from '@aparajita/capacitor-secure-storage';

// Mock the biometric plugin
jest.mock('@capawesome-team/capacitor-biometrics', () => ({
  BiometricAuth: {
    isAvailable: jest.fn(),
    authenticate: jest.fn(),
  },
}));

describe('BiometricAuthService', () => {
  let service: BiometricAuthService;
  let mockLogger: jest.Mocked<LoggerService>;

  const mockBiometricConfig: BiometricConfig = {
    enabled: true,
    enrolled: true,
    biometryType: 'fingerprint',
    lastEnrolledAt: '2025-01-01T00:00:00.000Z',
  };

  beforeEach(async () => {
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as unknown as jest.Mocked<LoggerService>;

    // Reset mocks
    (Preferences.get as jest.Mock).mockResolvedValue({ value: null });
    (Preferences.set as jest.Mock).mockResolvedValue(undefined);
    (SecureStorage.getItem as jest.Mock).mockResolvedValue(null);
    (SecureStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    (SecureStorage.removeItem as jest.Mock).mockResolvedValue(undefined);

    await TestBed.configureTestingModule({
      providers: [BiometricAuthService, { provide: LoggerService, useValue: mockLogger }],
    }).compileComponents();

    service = TestBed.inject(BiometricAuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should have default config', done => {
      service.biometricConfig$.subscribe(config => {
        expect(config.enabled).toBe(false);
        expect(config.enrolled).toBe(false);
        expect(config.biometryType).toBe('none');
        done();
      });
    });
  });

  describe('isBiometricAvailable', () => {
    it('should return true when biometric is available', async () => {
      const { BiometricAuth } = await import('@capawesome-team/capacitor-biometrics');
      (BiometricAuth.isAvailable as jest.Mock).mockResolvedValue({
        isAvailable: true,
        biometryType: 'FINGERPRINT',
      });

      const result = await service.isBiometricAvailable();
      expect(result).toBe(true);
    });

    it('should return false when biometric is not available', async () => {
      const { BiometricAuth } = await import('@capawesome-team/capacitor-biometrics');
      (BiometricAuth.isAvailable as jest.Mock).mockResolvedValue({ isAvailable: false });

      const result = await service.isBiometricAvailable();
      expect(result).toBe(false);
    });

    it('should return false when plugin throws', async () => {
      const { BiometricAuth } = await import('@capawesome-team/capacitor-biometrics');
      (BiometricAuth.isAvailable as jest.Mock).mockRejectedValue(new Error('Plugin not available'));

      const result = await service.isBiometricAvailable();
      expect(result).toBe(false);
    });
  });

  describe('enrollBiometric', () => {
    it('should enroll successfully when biometric is available', async () => {
      const { BiometricAuth } = await import('@capawesome-team/capacitor-biometrics');
      (BiometricAuth.isAvailable as jest.Mock).mockResolvedValue({
        isAvailable: true,
        biometryType: 'FINGERPRINT',
      });

      const result = await service.enrollBiometric('user123', 'token123');

      expect(result.success).toBe(true);
      expect(result.authenticated).toBe(true);
      expect(SecureStorage.setItem).toHaveBeenCalled();
      expect(Preferences.set).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Biometric',
        'Enrollment successful',
        expect.any(Object)
      );
    });

    it('should fail when biometric is not available', async () => {
      const { BiometricAuth } = await import('@capawesome-team/capacitor-biometrics');
      (BiometricAuth.isAvailable as jest.Mock).mockResolvedValue({ isAvailable: false });

      const result = await service.enrollBiometric('user123', 'token123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Biometric not available');
    });
  });

  describe('authenticateWithBiometric', () => {
    beforeEach(async () => {
      // Set up enrolled state
      (Preferences.get as jest.Mock).mockResolvedValue({
        value: JSON.stringify(mockBiometricConfig),
      });
      service = TestBed.inject(BiometricAuthService);
    });

    it('should authenticate successfully', async () => {
      const { BiometricAuth } = await import('@capawesome-team/capacitor-biometrics');
      (BiometricAuth.authenticate as jest.Mock).mockResolvedValue({ success: true });

      const result = await service.authenticateWithBiometric('Test reason');

      expect(result.success).toBe(true);
      expect(result.authenticated).toBe(true);
    });

    it('should fail when not enrolled', async () => {
      (Preferences.get as jest.Mock).mockResolvedValue({ value: null });
      service = TestBed.inject(BiometricAuthService);

      const result = await service.authenticateWithBiometric();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Not enrolled');
    });
  });

  describe('clearBiometricEnrollment', () => {
    it('should clear enrollment', async () => {
      await service.clearBiometricEnrollment();

      expect(SecureStorage.removeItem).toHaveBeenCalled();
      expect(Preferences.set).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('Biometric', 'Enrollment cleared');
    });
  });

  describe('getStoredCredentials', () => {
    it('should return credentials when stored', async () => {
      const credentials = { userId: 'user123', accessToken: 'token123' };
      (SecureStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(credentials));

      const result = await service.getStoredCredentials();

      expect(result).toEqual(credentials);
    });

    it('should return null when no credentials stored', async () => {
      (SecureStorage.getItem as jest.Mock).mockResolvedValue(null);

      const result = await service.getStoredCredentials();

      expect(result).toBeNull();
    });
  });
});
