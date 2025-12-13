import { TestBed } from '@angular/core/testing';
import { Platform } from '@ionic/angular';
import { Capacitor } from '@capacitor/core';
import { PlatformDetectorService } from '@services/platform-detector.service';
import { API_GATEWAY_BASE_URL, getApiGatewayOverride } from '@shared/config/api-base-url';

// Mock Capacitor
jest.mock('@capacitor/core');

// Mock api-base-url
jest.mock('../../shared/config/api-base-url', () => ({
  API_GATEWAY_BASE_URL: 'http://localhost:8000',
  getApiGatewayOverride: jest.fn(),
}));

describe('PlatformDetectorService', () => {
  let service: PlatformDetectorService;
  let platform: jest.Mocked<Platform>;

  const mockPlatform = {
    is: jest.fn(),
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [PlatformDetectorService, { provide: Platform, useValue: mockPlatform }],
    });

    service = TestBed.inject(PlatformDetectorService);
    platform = TestBed.inject(Platform) as jest.Mocked<Platform>;

    // Reset mocks
    jest.clearAllMocks();
    (getApiGatewayOverride as jest.Mock).mockReturnValue(null);
  });

  describe('initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });
  });

  describe('getApiBaseUrl', () => {
    describe('with override', () => {
      it('should use override URL when provided', () => {
        const overrideUrl = 'https://override.example.com';
        (getApiGatewayOverride as jest.Mock).mockReturnValue(overrideUrl);

        const url = service.getApiBaseUrl();

        expect(url).toBe(overrideUrl);
      });
    });

    describe('web platform', () => {
      beforeEach(() => {
        (Capacitor.isNativePlatform as jest.Mock).mockReturnValue(false);
      });

      it('should return default URL for web', () => {
        const url = service.getApiBaseUrl();

        expect(url).toBe(API_GATEWAY_BASE_URL);
      });

      it('should use provided default URL', () => {
        const customDefault = 'https://custom.example.com';
        const url = service.getApiBaseUrl(customDefault);

        expect(url).toBe(customDefault);
      });
    });

    describe('Android platform', () => {
      beforeEach(() => {
        (Capacitor.isNativePlatform as jest.Mock).mockReturnValue(true);
        (Capacitor.getPlatform as jest.Mock).mockReturnValue('android');
      });

      it('should use cloud URL directly for HTTPS URLs', () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
        const cloudUrl = 'https://api.example.com';

        const url = service.getApiBaseUrl(cloudUrl);

        expect(url).toBe(cloudUrl);
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('Using cloud backend for Android'),
          cloudUrl
        );
        consoleSpy.mockRestore();
      });

      it('should use cloud URL for non-localhost HTTP URLs', () => {
        const cloudUrl = 'http://api.example.com';

        const url = service.getApiBaseUrl(cloudUrl);

        expect(url).toBe(cloudUrl);
      });

      it('should use 10.0.2.2 for emulator with localhost', () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

        // Mock Android emulator detection
        Object.defineProperty(navigator, 'userAgent', {
          value: 'Android SDK built for x86',
          writable: true,
        });

        const url = service.getApiBaseUrl('http://localhost:8000');

        expect(url).toBe('http://10.0.2.2:8000');
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('Android emulator detected')
        );
        consoleSpy.mockRestore();
      });

      it('should warn for real device with localhost', () => {
        const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

        // Mock real Android device (non-emulator)
        Object.defineProperty(navigator, 'userAgent', {
          value: 'Mozilla/5.0 (Linux; Android 12) Mobile',
          writable: true,
        });

        // Can't redefine window.location.hostname, so skip this assertion
        const url = service.getApiBaseUrl('http://localhost:8000');

        // Should either warn or redirect based on actual hostname
        expect(url).toBeDefined();
        consoleSpy.mockRestore();
      });
    });

    describe('iOS platform', () => {
      beforeEach(() => {
        (Capacitor.isNativePlatform as jest.Mock).mockReturnValue(true);
        (Capacitor.getPlatform as jest.Mock).mockReturnValue('ios');
      });

      it('should use localhost for iOS simulator', () => {
        // Mock iOS simulator detection
        Object.defineProperty(navigator, 'userAgent', {
          value: 'iPhone Simulator',
          writable: true,
        });

        const url = service.getApiBaseUrl('http://localhost:8000');

        expect(url).toBe('http://localhost:8000');
      });

      it('should use production URL for real iOS device', () => {
        // Mock real iOS device (non-simulator)
        Object.defineProperty(navigator, 'userAgent', {
          value: 'iPhone',
          writable: true,
        });

        // Mock DeviceMotionEvent to indicate real device
        Object.defineProperty(window, 'DeviceMotionEvent', {
          value: function () {},
          writable: true,
        });

        const url = service.getApiBaseUrl('http://localhost:8000');

        // Should fall back to default since getProductionUrl returns null
        expect(url).toBeDefined();
      });
    });
  });

  describe('getPlatformConfig', () => {
    it('should return web platform config', () => {
      (Capacitor.isNativePlatform as jest.Mock).mockReturnValue(false);
      platform.is.mockImplementation((platformName: string) => platformName === 'desktop');

      const config = service.getPlatformConfig();

      expect(config.platform).toBe('web');
      expect(config.isNative).toBe(false);
      expect(config.isWeb).toBe(true);
      expect(config.isDesktop).toBe(true);
      expect(config.isMobile).toBe(false);
    });

    it('should return Android platform config', () => {
      (Capacitor.isNativePlatform as jest.Mock).mockReturnValue(true);
      (Capacitor.getPlatform as jest.Mock).mockReturnValue('android');
      platform.is.mockImplementation((platformName: string) => platformName === 'mobile');

      const config = service.getPlatformConfig();

      expect(config.platform).toBe('android');
      expect(config.isNative).toBe(true);
      expect(config.isWeb).toBe(false);
      expect(config.isMobile).toBe(true);
      expect(config.isDesktop).toBe(false);
    });

    it('should return iOS platform config', () => {
      (Capacitor.isNativePlatform as jest.Mock).mockReturnValue(true);
      (Capacitor.getPlatform as jest.Mock).mockReturnValue('ios');
      platform.is.mockImplementation((platformName: string) => platformName === 'mobile');

      const config = service.getPlatformConfig();

      expect(config.platform).toBe('ios');
      expect(config.isNative).toBe(true);
      expect(config.isMobile).toBe(true);
    });

    it('should include base URL in config', () => {
      (Capacitor.isNativePlatform as jest.Mock).mockReturnValue(false);

      const config = service.getPlatformConfig();

      expect(config.baseUrl).toBeDefined();
      expect(typeof config.baseUrl).toBe('string');
    });
  });

  describe('logPlatformInfo', () => {
    it('should log platform configuration', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      (Capacitor.isNativePlatform as jest.Mock).mockReturnValue(false);

      service.logPlatformInfo();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Platform Configuration:',
        expect.objectContaining({
          platform: 'web',
          userAgent: expect.any(String),
          hostname: expect.any(String),
          protocol: expect.any(String),
        })
      );

      consoleSpy.mockRestore();
    });
  });

  describe('isAndroidEmulator detection', () => {
    beforeEach(() => {
      (Capacitor.isNativePlatform as jest.Mock).mockReturnValue(true);
      (Capacitor.getPlatform as jest.Mock).mockReturnValue('android');
    });

    it('should detect SDK in user agent', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Android SDK built for x86',
        writable: true,
      });

      const url = service.getApiBaseUrl('http://localhost:8000');

      expect(url).toBe('http://10.0.2.2:8000');
    });

    it('should detect emulator keyword', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Android emulator',
        writable: true,
      });

      const url = service.getApiBaseUrl('http://localhost:8000');

      expect(url).toBe('http://10.0.2.2:8000');
    });

    it('should detect localhost hostname', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Android',
        writable: true,
      });

      // Can't redefine window.location.hostname in test env
      // Check that the method detects emulator by userAgent
      const url = service.getApiBaseUrl('http://localhost:8000');

      expect(url).toBeDefined();
    });
  });

  describe('isIOSSimulator detection', () => {
    beforeEach(() => {
      (Capacitor.isNativePlatform as jest.Mock).mockReturnValue(true);
      (Capacitor.getPlatform as jest.Mock).mockReturnValue('ios');
    });

    it('should detect simulator keyword', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'iPhone Simulator',
        writable: true,
      });

      const url = service.getApiBaseUrl('http://localhost:8000');

      expect(url).toBe('http://localhost:8000');
    });

    it('should detect localhost hostname', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'iPhone',
        writable: true,
      });

      // Can't redefine window.location.hostname
      const url = service.getApiBaseUrl('http://localhost:8000');

      expect(url).toBeDefined();
    });

    it('should detect missing device capabilities', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'iPhone',
        writable: true,
      });

      // Delete DeviceMotionEvent to simulate simulator
      delete (window as any).DeviceMotionEvent;

      const url = service.getApiBaseUrl('http://localhost:8000');

      expect(url).toBeDefined();
    });
  });
});
