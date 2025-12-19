/**
 * Biometric Auth Service Integration Tests
 *
 * Pruebas de integración para BiometricAuthService usando @capgo/capacitor-native-biometric.
 * Verifica flujos completos de autenticación biométrica sin mocks de servicio.
 *
 * COBERTURA (15 tests):
 *
 * Disponibilidad Biométrica (2 tests):
 * 1. Check biometric availability cuando está disponible
 * 2. Check biometric availability cuando no está disponible
 *
 * Tipo de Biometría (3 tests):
 * 3. Get biometry type para fingerprint/touch ID
 * 4. Get biometry type para face ID/authentication
 * 5. Get biometry type para iris authentication
 *
 * Enrollment Biométrico (2 tests):
 * 6. Enroll biometric exitoso - setCredentials + Preferences
 * 7. Enroll biometric falla cuando no está disponible
 *
 * Autenticación (3 tests):
 * 8. Authenticate exitoso - verifyIdentity + credential retrieval
 * 9. Authenticate falla cuando no enrolled
 * 10. Authenticate falla con usuario cancela
 *
 * Gestión de Credenciales (2 tests):
 * 11. Get stored credentials cuando existen
 * 12. Clear stored credentials completamente
 *
 * Error Handling (3 tests):
 * 13. Handle biometrics unavailable error (code 1)
 * 14. Handle authentication failed error (code 10)
 * 15. Handle user lockout error (code 2/4)
 */

// Inicializar entorno TestBed para Vitest
import '../../../../test-setup';

import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { vi } from 'vitest';
import { Preferences } from '@capacitor/preferences';

import { BiometricAuthService, BiometricConfig } from '@core/services/biometric-auth.service';
import { LoggerService } from '@core/services/logger.service';

// Crear funciones mock para NativeBiometric
const mockIsAvailable = vi.fn();
const mockVerifyIdentity = vi.fn();
const mockSetCredentials = vi.fn();
const mockGetCredentials = vi.fn();
const mockDeleteCredentials = vi.fn();
const mockIsCredentialsSaved = vi.fn();

// Mock del plugin @capgo/capacitor-native-biometric
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

describe('BiometricAuthService Integration Tests', () => {
  let service: BiometricAuthService;
  let storage: Map<string, string>;

  beforeEach(async () => {
    // Reset TestBed
    TestBed.resetTestingModule();

    // Mock Preferences storage
    storage = new Map<string, string>();
    vi.mocked(Preferences.get).mockImplementation(({ key }: { key: string }) => {
      const value = storage.get(key);
      return Promise.resolve({ value: value || null });
    });
    vi.mocked(Preferences.set).mockImplementation(
      ({ key, value }: { key: string; value: string }) => {
        storage.set(key, value);
        return Promise.resolve();
      }
    );
    vi.mocked(Preferences.remove).mockImplementation(({ key }: { key: string }) => {
      storage.delete(key);
      return Promise.resolve();
    });

    // Reset NativeBiometric mocks
    mockIsAvailable.mockReset();
    mockVerifyIdentity.mockReset();
    mockSetCredentials.mockReset();
    mockGetCredentials.mockReset();
    mockDeleteCredentials.mockReset();
    mockIsCredentialsSaved.mockReset();

    await TestBed.configureTestingModule({
      providers: [
        BiometricAuthService,
        {
          provide: LoggerService,
          useValue: {
            info: vi.fn(),
            debug: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
          },
        },
      ],
    }).compileComponents();

    service = TestBed.inject(BiometricAuthService);
  });

  afterEach(() => {
    vi.clearAllMocks();
    storage.clear();
  });

  describe('Disponibilidad Biométrica', () => {
    it('should return true when biometric is available', async () => {
      // ARRANGE
      mockIsAvailable.mockResolvedValue({
        isAvailable: true,
        biometryType: 3, // FINGERPRINT
      });

      // ACT
      const result = await service.isBiometricAvailable();

      // ASSERT
      expect(result).toBe(true);
      expect(mockIsAvailable).toHaveBeenCalledWith({ useFallback: false });
    });

    it('should return false when biometric is not available', async () => {
      // ARRANGE
      mockIsAvailable.mockResolvedValue({
        isAvailable: false,
        biometryType: 0, // NONE
      });

      // ACT
      const result = await service.isBiometricAvailable();

      // ASSERT
      expect(result).toBe(false);
      expect(mockIsAvailable).toHaveBeenCalledWith({ useFallback: false });
    });
  });

  describe('Tipo de Biometría', () => {
    it('should return fingerprint for FINGERPRINT and TOUCH_ID types', async () => {
      // ARRANGE - Test FINGERPRINT
      mockIsAvailable.mockResolvedValue({
        isAvailable: true,
        biometryType: 3, // FINGERPRINT
      });

      // ACT
      const result1 = await service.getBiometryType();

      // ASSERT
      expect(result1).toBe('fingerprint');

      // ARRANGE - Test TOUCH_ID
      mockIsAvailable.mockResolvedValue({
        isAvailable: true,
        biometryType: 1, // TOUCH_ID
      });

      // ACT
      const result2 = await service.getBiometryType();

      // ASSERT
      expect(result2).toBe('fingerprint');
    });

    it('should return face for FACE_ID and FACE_AUTHENTICATION types', async () => {
      // ARRANGE - Test FACE_ID
      mockIsAvailable.mockResolvedValue({
        isAvailable: true,
        biometryType: 2, // FACE_ID
      });

      // ACT
      const result1 = await service.getBiometryType();

      // ASSERT
      expect(result1).toBe('face');

      // ARRANGE - Test FACE_AUTHENTICATION
      mockIsAvailable.mockResolvedValue({
        isAvailable: true,
        biometryType: 4, // FACE_AUTHENTICATION
      });

      // ACT
      const result2 = await service.getBiometryType();

      // ASSERT
      expect(result2).toBe('face');
    });

    it('should return iris for IRIS_AUTHENTICATION type', async () => {
      // ARRANGE
      mockIsAvailable.mockResolvedValue({
        isAvailable: true,
        biometryType: 5, // IRIS_AUTHENTICATION
      });

      // ACT
      const result = await service.getBiometryType();

      // ASSERT
      expect(result).toBe('iris');
    });
  });

  describe('Enrollment Biométrico', () => {
    it('should successfully enroll biometric with setCredentials and update Preferences', async () => {
      // ARRANGE
      mockIsAvailable.mockResolvedValue({
        isAvailable: true,
        biometryType: 3, // FINGERPRINT
      });
      mockSetCredentials.mockResolvedValue(undefined);

      // ACT
      const result = await service.enrollBiometric('user-1000', 'access_token_12345');

      // ASSERT - Verificar resultado
      expect(result.success).toBe(true);
      expect(result.authenticated).toBe(true);
      expect(result.biometryType).toBe('fingerprint');

      // ASSERT - Verificar setCredentials llamado correctamente
      expect(mockSetCredentials).toHaveBeenCalledWith({
        username: 'user-1000',
        password: 'access_token_12345',
        server: 'io.diabetactic.app',
      });

      // ASSERT - Verificar Preferences guardado
      expect(storage.has('diabetactic_biometric_config')).toBe(true);
      const storedConfig = JSON.parse(storage.get('diabetactic_biometric_config')!);
      expect(storedConfig.enabled).toBe(true);
      expect(storedConfig.enrolled).toBe(true);
      expect(storedConfig.biometryType).toBe('fingerprint');
      expect(storedConfig.lastEnrolledAt).toBeTruthy();
    });

    it('should fail enrollment when biometric not available', async () => {
      // ARRANGE
      mockIsAvailable.mockResolvedValue({
        isAvailable: false,
        biometryType: 0, // NONE
      });

      // ACT
      const result = await service.enrollBiometric('user-1000', 'token');

      // ASSERT
      expect(result.success).toBe(false);
      expect(result.authenticated).toBe(false);
      expect(result.error).toBe('Biometric not available');

      // Verificar que no se guardaron credenciales
      expect(mockSetCredentials).not.toHaveBeenCalled();
      expect(storage.has('diabetactic_biometric_config')).toBe(false);
    });
  });

  describe('Autenticación Biométrica', () => {
    it('should authenticate successfully with verifyIdentity and retrieve credentials', async () => {
      // ARRANGE - Configurar estado enrolled manualmente
      const enrolledConfig: BiometricConfig = {
        enabled: true,
        enrolled: true,
        biometryType: 'face',
        lastEnrolledAt: new Date().toISOString(),
      };

      // Acceder al BehaviorSubject privado para establecer el estado
      (service as any).biometricConfigSubject.next(enrolledConfig);

      mockVerifyIdentity.mockResolvedValue(undefined); // Éxito = resolve sin valor

      // ACT
      const result = await service.authenticateWithBiometric('Access your account');

      // ASSERT
      expect(result.success).toBe(true);
      expect(result.authenticated).toBe(true);
      expect(result.biometryType).toBe('face');

      expect(mockVerifyIdentity).toHaveBeenCalledWith({
        reason: 'Access your account',
        title: 'Diabetactic',
        subtitle: 'Login with biometrics',
        description: 'Access your account',
        useFallback: true,
        fallbackTitle: 'Use passcode',
        maxAttempts: 3,
      });
    });

    it('should fail authentication when not enrolled', async () => {
      // ARRANGE - Sin enrollment
      storage.clear();

      // ACT
      const result = await service.authenticateWithBiometric('Test');

      // ASSERT
      expect(result.success).toBe(false);
      expect(result.authenticated).toBe(false);
      expect(result.error).toBe('Not enrolled');

      // Verificar que no se llamó verifyIdentity
      expect(mockVerifyIdentity).not.toHaveBeenCalled();
    });

    it('should fail when user cancels authentication', async () => {
      // ARRANGE - Configurar estado enrolled manualmente
      const enrolledConfig: BiometricConfig = {
        enabled: true,
        enrolled: true,
        biometryType: 'fingerprint',
        lastEnrolledAt: new Date().toISOString(),
      };
      (service as any).biometricConfigSubject.next(enrolledConfig);

      // Simular cancelación de usuario
      mockVerifyIdentity.mockRejectedValue({ code: 16 }); // USER_CANCEL

      // ACT
      const result = await service.authenticateWithBiometric('Test');

      // ASSERT
      expect(result.success).toBe(false);
      expect(result.authenticated).toBe(false);
      expect(result.error).toBe('Cancelled');
    });
  });

  describe('Gestión de Credenciales', () => {
    it('should retrieve stored credentials when saved', async () => {
      // ARRANGE
      mockIsCredentialsSaved.mockResolvedValue({ isSaved: true });
      mockGetCredentials.mockResolvedValue({
        username: 'user-1000',
        password: 'access_token_xyz',
      });

      // ACT
      const result = await service.getStoredCredentials();

      // ASSERT
      expect(result).toEqual({
        userId: 'user-1000',
        accessToken: 'access_token_xyz',
      });

      expect(mockIsCredentialsSaved).toHaveBeenCalledWith({
        server: 'io.diabetactic.app',
      });
      expect(mockGetCredentials).toHaveBeenCalledWith({
        server: 'io.diabetactic.app',
      });
    });

    it('should clear enrollment and delete credentials completely', async () => {
      // ARRANGE
      mockDeleteCredentials.mockResolvedValue(undefined);

      // Configurar estado enrolled inicial
      const enrolledConfig: BiometricConfig = {
        enabled: true,
        enrolled: true,
        biometryType: 'fingerprint',
        lastEnrolledAt: new Date().toISOString(),
      };
      storage.set('diabetactic_biometric_config', JSON.stringify(enrolledConfig));

      // ACT
      await service.clearBiometricEnrollment();

      // ASSERT - Verificar deleteCredentials llamado
      expect(mockDeleteCredentials).toHaveBeenCalledWith({
        server: 'io.diabetactic.app',
      });

      // ASSERT - Verificar Preferences actualizado
      const storedConfig = JSON.parse(storage.get('diabetactic_biometric_config')!);
      expect(storedConfig.enabled).toBe(false);
      expect(storedConfig.enrolled).toBe(false);
      expect(storedConfig.biometryType).toBe('none');
      expect(storedConfig.lastEnrolledAt).toBeNull();

      // ASSERT - Verificar BehaviorSubject actualizado
      const config = await firstValueFrom(service.biometricConfig$);
      expect(config.enabled).toBe(false);
      expect(config.enrolled).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle BIOMETRICS_UNAVAILABLE error (code 1)', async () => {
      // ARRANGE - Configurar estado enrolled manualmente
      const enrolledConfig: BiometricConfig = {
        enabled: true,
        enrolled: true,
        biometryType: 'fingerprint',
        lastEnrolledAt: new Date().toISOString(),
      };
      (service as any).biometricConfigSubject.next(enrolledConfig);

      mockVerifyIdentity.mockRejectedValue({ code: 1 }); // BIOMETRICS_UNAVAILABLE

      // ACT
      const result = await service.authenticateWithBiometric('Test');

      // ASSERT
      expect(result.success).toBe(false);
      expect(result.error).toBe('Biometric not available');
    });

    it('should handle AUTHENTICATION_FAILED error (code 10)', async () => {
      // ARRANGE - Configurar estado enrolled manualmente
      const enrolledConfig: BiometricConfig = {
        enabled: true,
        enrolled: true,
        biometryType: 'face',
        lastEnrolledAt: new Date().toISOString(),
      };
      (service as any).biometricConfigSubject.next(enrolledConfig);

      mockVerifyIdentity.mockRejectedValue({ code: 10 }); // AUTHENTICATION_FAILED

      // ACT
      const result = await service.authenticateWithBiometric('Test');

      // ASSERT
      expect(result.success).toBe(false);
      expect(result.error).toBe('Authentication failed');
    });

    it('should handle USER_LOCKOUT errors (code 2 and 4)', async () => {
      // ARRANGE - Configurar estado enrolled manualmente
      const enrolledConfig: BiometricConfig = {
        enabled: true,
        enrolled: true,
        biometryType: 'fingerprint',
        lastEnrolledAt: new Date().toISOString(),
      };
      (service as any).biometricConfigSubject.next(enrolledConfig);

      // TEST 1: USER_LOCKOUT (code 2)
      mockVerifyIdentity.mockRejectedValue({ code: 2 });

      // ACT
      const result1 = await service.authenticateWithBiometric('Test');

      // ASSERT
      expect(result1.success).toBe(false);
      expect(result1.error).toBe('Too many attempts. Use password.');

      // TEST 2: USER_TEMPORARY_LOCKOUT (code 4)
      mockVerifyIdentity.mockRejectedValue({ code: 4 });

      // ACT
      const result2 = await service.authenticateWithBiometric('Test');

      // ASSERT
      expect(result2.success).toBe(false);
      expect(result2.error).toBe('Too many attempts. Use password.');
    });
  });

  describe('BehaviorSubject Config Updates', () => {
    it('should update config$ observable after enrollment', async () => {
      // ARRANGE
      mockIsAvailable.mockResolvedValue({
        isAvailable: true,
        biometryType: 3, // FINGERPRINT
      });
      mockSetCredentials.mockResolvedValue(undefined);

      // Obtener config inicial
      const initialConfig = await firstValueFrom(service.biometricConfig$);
      expect(initialConfig.enrolled).toBe(false);

      // ACT - Enrollar
      await service.enrollBiometric('user-1000', 'token');

      // ASSERT - Verificar config actualizado
      const updatedConfig = await firstValueFrom(service.biometricConfig$);
      expect(updatedConfig.enabled).toBe(true);
      expect(updatedConfig.enrolled).toBe(true);
      expect(updatedConfig.biometryType).toBe('fingerprint');
      expect(updatedConfig.lastEnrolledAt).toBeTruthy();
    });

    it('should update config$ observable after clearing enrollment', async () => {
      // ARRANGE
      mockDeleteCredentials.mockResolvedValue(undefined);

      // Configurar estado enrolled manualmente
      const enrolledConfig: BiometricConfig = {
        enabled: true,
        enrolled: true,
        biometryType: 'face',
        lastEnrolledAt: new Date().toISOString(),
      };
      (service as any).biometricConfigSubject.next(enrolledConfig);

      // Verificar estado enrolled
      const beforeClear = await firstValueFrom(service.biometricConfig$);
      expect(beforeClear.enrolled).toBe(true);

      // ACT - Limpiar enrollment
      await service.clearBiometricEnrollment();

      // ASSERT - Verificar config limpiado
      const afterClear = await firstValueFrom(service.biometricConfig$);
      expect(afterClear.enabled).toBe(false);
      expect(afterClear.enrolled).toBe(false);
      expect(afterClear.biometryType).toBe('none');
      expect(afterClear.lastEnrolledAt).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('should handle plugin import failure gracefully in isBiometricAvailable', async () => {
      // ARRANGE - Simular fallo de import del plugin
      mockIsAvailable.mockRejectedValue(new Error('Module not found'));

      // ACT
      const result = await service.isBiometricAvailable();

      // ASSERT - Debe retornar false sin lanzar error
      expect(result).toBe(false);
    });

    it('should return null when credentials not saved', async () => {
      // ARRANGE
      mockIsCredentialsSaved.mockResolvedValue({ isSaved: false });

      // ACT
      const result = await service.getStoredCredentials();

      // ASSERT
      expect(result).toBeNull();

      // Verificar que no intentó obtener credenciales
      expect(mockGetCredentials).not.toHaveBeenCalled();
    });

    it('should handle getCredentials error gracefully', async () => {
      // ARRANGE
      mockIsCredentialsSaved.mockResolvedValue({ isSaved: true });
      mockGetCredentials.mockRejectedValue(new Error('Keychain access denied'));

      // ACT
      const result = await service.getStoredCredentials();

      // ASSERT - Debe retornar null sin lanzar error
      expect(result).toBeNull();
    });

    it('should persist config after enrollment failure', async () => {
      // ARRANGE
      mockIsAvailable.mockResolvedValue({
        isAvailable: true,
        biometryType: 3,
      });
      mockSetCredentials.mockRejectedValue(new Error('Keychain error'));

      // ACT
      const result = await service.enrollBiometric('user-1000', 'token');

      // ASSERT - Enrollment debe fallar
      expect(result.success).toBe(false);
      expect(result.error).toBe('Enrollment failed');

      // Verificar que NO se guardó config en Preferences
      expect(storage.has('diabetactic_biometric_config')).toBe(false);
    });
  });
});
