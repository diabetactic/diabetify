// Initialize TestBed environment for Vitest
import '../../../test-setup';

import { type Mock } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { EnvironmentDetectorService } from '@services/environment-detector.service';
import { Capacitor } from '@capacitor/core';

// Mock Capacitor
vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: vi.fn(),
    getPlatform: vi.fn(),
  },
}));

describe('EnvironmentDetectorService', () => {
  let service: EnvironmentDetectorService;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // WEB PLATFORM TESTS
  // ============================================================================

  describe('Web Platform', () => {
    beforeEach(() => {
      (Capacitor.isNativePlatform as Mock).mockReturnValue(false);
      (Capacitor.getPlatform as Mock).mockReturnValue('web');

      TestBed.configureTestingModule({
        providers: [EnvironmentDetectorService],
      });
      service = TestBed.inject(EnvironmentDetectorService);
    });

    it('should detect web platform correctly', () => {
      expect(service.isWeb()).toBe(true);
      expect(service.isAndroid()).toBe(false);
      expect(service.isIOS()).toBe(false);
      expect(service.getPlatformName()).toBe('web');
      expect(service.needsNetworkSecurityConfig()).toBe(false);
    });

    it('should return localhost URLs for all services', () => {
      expect(service.getBaseUrl('http://localhost:8000')).toBe('http://localhost:8000');
      expect(service.getApiGatewayUrl()).toBe('http://localhost:8000');
      expect(service.getGlucoserverUrl()).toBe('http://localhost:8001');
      expect(service.getAppointmentsUrl()).toBe('http://localhost:8002');
      expect(service.getAuthUrl()).toBe('http://localhost:8003');
    });
  });

  // ============================================================================
  // ANDROID PLATFORM TESTS
  // ============================================================================

  describe('Android Platform', () => {
    beforeEach(() => {
      (Capacitor.isNativePlatform as Mock).mockReturnValue(true);
      (Capacitor.getPlatform as Mock).mockReturnValue('android');

      TestBed.configureTestingModule({
        providers: [EnvironmentDetectorService],
      });
      service = TestBed.inject(EnvironmentDetectorService);
    });

    it('should detect Android platform correctly', () => {
      expect(service.isAndroid()).toBe(true);
      expect(service.isWeb()).toBe(false);
      expect(service.isIOS()).toBe(false);
      expect(service.getPlatformName()).toBe('android');
      expect(service.isAndroidEmulator()).toBe(true);
      expect(service.needsNetworkSecurityConfig()).toBe(true);
    });

    it('should convert localhost to 10.0.2.2 for Android emulator', () => {
      expect(service.getBaseUrl('http://localhost:8000')).toBe('http://10.0.2.2:8000');
      expect(service.getBaseUrl('http://localhost:8000/api/endpoint')).toBe(
        'http://10.0.2.2:8000/api/endpoint'
      );
      expect(service.getBaseUrl('https://api.example.com')).toBe('https://api.example.com');
    });

    it('should return 10.0.2.2 URLs for all services', () => {
      expect(service.getApiGatewayUrl()).toBe('http://10.0.2.2:8000');
      expect(service.getGlucoserverUrl()).toBe('http://10.0.2.2:8001');
      expect(service.getAppointmentsUrl()).toBe('http://10.0.2.2:8002');
      expect(service.getAuthUrl()).toBe('http://10.0.2.2:8003');
    });
  });

  // ============================================================================
  // iOS PLATFORM TESTS
  // ============================================================================

  describe('iOS Platform', () => {
    beforeEach(() => {
      (Capacitor.isNativePlatform as Mock).mockReturnValue(true);
      (Capacitor.getPlatform as Mock).mockReturnValue('ios');

      TestBed.configureTestingModule({
        providers: [EnvironmentDetectorService],
      });
      service = TestBed.inject(EnvironmentDetectorService);
    });

    it('should detect iOS platform correctly', () => {
      expect(service.isIOS()).toBe(true);
      expect(service.isAndroid()).toBe(false);
      expect(service.isWeb()).toBe(false);
      expect(service.getPlatformName()).toBe('ios');
      expect(service.isAndroidEmulator()).toBe(false);
      expect(service.needsNetworkSecurityConfig()).toBe(false);
    });

    it('should use localhost directly on iOS', () => {
      expect(service.getBaseUrl('http://localhost:8000')).toBe('http://localhost:8000');
    });
  });
});
