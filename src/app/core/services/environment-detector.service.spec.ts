// Initialize TestBed environment for Vitest
import '../../../test-setup';

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

  describe('Web Platform', () => {
    beforeEach(() => {
      (Capacitor.isNativePlatform as Mock).mockReturnValue(false);
      (Capacitor.getPlatform as Mock).mockReturnValue('web');

      TestBed.configureTestingModule({
        providers: [EnvironmentDetectorService],
      });
      service = TestBed.inject(EnvironmentDetectorService);
    });

    it('should detect web platform', () => {
      expect(service.isWeb()).toBe(true);
      expect(service.isAndroid()).toBe(false);
      expect(service.isIOS()).toBe(false);
    });

    it('should return localhost for base URL on web', () => {
      const url = service.getBaseUrl('http://localhost:8000');

      expect(url).toBe('http://localhost:8000');
    });

    it('should return web as platform name', () => {
      expect(service.getPlatformName()).toBe('web');
    });

    it('should not require network security config for web', () => {
      expect(service.needsNetworkSecurityConfig()).toBe(false);
    });

    it('should return localhost for API Gateway URL', () => {
      const url = service.getApiGatewayUrl();

      expect(url).toBe('http://localhost:8000');
    });

    it('should return localhost for Glucoserver URL', () => {
      const url = service.getGlucoserverUrl();

      expect(url).toBe('http://localhost:8001');
    });

    it('should return localhost for Appointments URL', () => {
      const url = service.getAppointmentsUrl();

      expect(url).toBe('http://localhost:8002');
    });

    it('should return localhost for Auth URL', () => {
      const url = service.getAuthUrl();

      expect(url).toBe('http://localhost:8003');
    });
  });

  describe('Android Platform', () => {
    beforeEach(() => {
      (Capacitor.isNativePlatform as Mock).mockReturnValue(true);
      (Capacitor.getPlatform as Mock).mockReturnValue('android');

      TestBed.configureTestingModule({
        providers: [EnvironmentDetectorService],
      });
      service = TestBed.inject(EnvironmentDetectorService);
    });

    it('should detect Android platform', () => {
      expect(service.isAndroid()).toBe(true);
      expect(service.isWeb()).toBe(false);
      expect(service.isIOS()).toBe(false);
    });

    it('should convert localhost to 10.0.2.2 for Android emulator', () => {
      const url = service.getBaseUrl('http://localhost:8000');

      expect(url).toBe('http://10.0.2.2:8000');
    });

    it('should not modify non-localhost URLs', () => {
      const url = service.getBaseUrl('https://api.example.com');

      expect(url).toBe('https://api.example.com');
    });

    it('should handle localhost in URL path correctly', () => {
      const url = service.getBaseUrl('http://localhost:8000/api/endpoint');

      expect(url).toBe('http://10.0.2.2:8000/api/endpoint');
    });

    it('should detect as Android emulator', () => {
      expect(service.isAndroidEmulator()).toBe(true);
    });

    it('should return android as platform name', () => {
      expect(service.getPlatformName()).toBe('android');
    });

    it('should require network security config for Android', () => {
      expect(service.needsNetworkSecurityConfig()).toBe(true);
    });

    it('should return 10.0.2.2 for API Gateway URL', () => {
      const url = service.getApiGatewayUrl();

      expect(url).toBe('http://10.0.2.2:8000');
    });

    it('should return 10.0.2.2 for Glucoserver URL', () => {
      const url = service.getGlucoserverUrl();

      expect(url).toBe('http://10.0.2.2:8001');
    });

    it('should return 10.0.2.2 for Appointments URL', () => {
      const url = service.getAppointmentsUrl();

      expect(url).toBe('http://10.0.2.2:8002');
    });

    it('should return 10.0.2.2 for Auth URL', () => {
      const url = service.getAuthUrl();

      expect(url).toBe('http://10.0.2.2:8003');
    });
  });

  describe('iOS Platform', () => {
    beforeEach(() => {
      (Capacitor.isNativePlatform as Mock).mockReturnValue(true);
      (Capacitor.getPlatform as Mock).mockReturnValue('ios');

      TestBed.configureTestingModule({
        providers: [EnvironmentDetectorService],
      });
      service = TestBed.inject(EnvironmentDetectorService);
    });

    it('should detect iOS platform', () => {
      expect(service.isIOS()).toBe(true);
      expect(service.isAndroid()).toBe(false);
      expect(service.isWeb()).toBe(false);
    });

    it('should use localhost directly on iOS', () => {
      const url = service.getBaseUrl('http://localhost:8000');

      expect(url).toBe('http://localhost:8000');
    });

    it('should return ios as platform name', () => {
      expect(service.getPlatformName()).toBe('ios');
    });

    it('should not require network security config for iOS', () => {
      expect(service.needsNetworkSecurityConfig()).toBe(false);
    });

    it('should not detect as Android emulator', () => {
      expect(service.isAndroidEmulator()).toBe(false);
    });
  });

  describe('Service URLs', () => {
    it('should use different ports for different services', () => {
      (Capacitor.isNativePlatform as Mock).mockReturnValue(false);
      (Capacitor.getPlatform as Mock).mockReturnValue('web');

      TestBed.configureTestingModule({
        providers: [EnvironmentDetectorService],
      });
      service = TestBed.inject(EnvironmentDetectorService);

      const apiGateway = service.getApiGatewayUrl();
      const glucoserver = service.getGlucoserverUrl();
      const appointments = service.getAppointmentsUrl();
      const auth = service.getAuthUrl();

      expect(apiGateway).toBe('http://localhost:8000');
      expect(glucoserver).toBe('http://localhost:8001');
      expect(appointments).toBe('http://localhost:8002');
      expect(auth).toBe('http://localhost:8003');
    });
  });
});
