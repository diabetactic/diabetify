// Initialize TestBed environment for Vitest
import '../../../test-setup';

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { Platform } from '@ionic/angular';
import { Capacitor } from '@capacitor/core';
import { PlatformDetectorService } from '@services/platform-detector.service';
import { API_GATEWAY_BASE_URL, getApiGatewayOverride } from '@shared/config/api-base-url';

// Mock Capacitor
vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: vi.fn(() => false),
    getPlatform: vi.fn(() => 'web'),
  },
}));

// Mock api-base-url
vi.mock('../../shared/config/api-base-url', () => ({
  API_GATEWAY_BASE_URL: 'http://localhost:8000',
  getApiGatewayOverride: vi.fn(() => null),
}));

// Mock environment
vi.mock('../../../environments/environment', () => ({
  environment: {
    production: false,
  },
}));

describe('PlatformDetectorService', () => {
  let service: PlatformDetectorService;

  const mockPlatform = {
    is: vi.fn(),
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [PlatformDetectorService, { provide: Platform, useValue: mockPlatform }],
    });

    service = TestBed.inject(PlatformDetectorService);

    vi.clearAllMocks();
    vi.mocked(getApiGatewayOverride).mockReturnValue(null);
  });

  // ============================================================================
  // API BASE URL TESTS
  // ============================================================================

  describe('getApiBaseUrl', () => {
    it('should use override URL when provided', () => {
      const overrideUrl = 'https://override.example.com';
      vi.mocked(getApiGatewayOverride).mockReturnValue(overrideUrl);

      expect(service.getApiBaseUrl()).toBe(overrideUrl);
    });

    it('should return correct URL for web platform', () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);

      expect(service.getApiBaseUrl()).toBe(API_GATEWAY_BASE_URL);
      expect(service.getApiBaseUrl('https://custom.example.com')).toBe(
        'https://custom.example.com'
      );
    });

    it('should handle Android platform with HTTPS and localhost URLs', () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
      vi.mocked(Capacitor.getPlatform).mockReturnValue('android');

      // HTTPS and non-localhost URLs should pass through
      expect(service.getApiBaseUrl('https://api.example.com')).toBe('https://api.example.com');
      expect(service.getApiBaseUrl('http://api.example.com')).toBe('http://api.example.com');

      // Android emulator detection - localhost should become 10.0.2.2
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Android SDK built for x86',
        writable: true,
        configurable: true,
      });

      expect(service.getApiBaseUrl('http://localhost:8000')).toBe('http://10.0.2.2:8000');
    });

    it('should handle iOS platform with localhost', () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
      vi.mocked(Capacitor.getPlatform).mockReturnValue('ios');

      Object.defineProperty(navigator, 'userAgent', {
        value: 'iPhone Simulator',
        writable: true,
      });

      expect(service.getApiBaseUrl('http://localhost:8000')).toBe('http://localhost:8000');
    });
  });

  // ============================================================================
  // PLATFORM CONFIG TESTS
  // ============================================================================

  describe('getPlatformConfig', () => {
    it('should return correct config for web platform', () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
      mockPlatform.is.mockImplementation((p: string) => p === 'desktop');

      const config = service.getPlatformConfig();

      expect(config.platform).toBe('web');
      expect(config.isNative).toBe(false);
      expect(config.isWeb).toBe(true);
      expect(config.isDesktop).toBe(true);
      expect(config.isMobile).toBe(false);
      expect(config.baseUrl).toBeDefined();
    });

    it('should return correct config for native platforms', () => {
      // Android
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
      vi.mocked(Capacitor.getPlatform).mockReturnValue('android');
      mockPlatform.is.mockImplementation((p: string) => p === 'mobile');

      let config = service.getPlatformConfig();
      expect(config.platform).toBe('android');
      expect(config.isNative).toBe(true);
      expect(config.isWeb).toBe(false);
      expect(config.isMobile).toBe(true);
      expect(config.isDesktop).toBe(false);

      // iOS
      vi.mocked(Capacitor.getPlatform).mockReturnValue('ios');

      config = service.getPlatformConfig();
      expect(config.platform).toBe('ios');
      expect(config.isNative).toBe(true);
      expect(config.isMobile).toBe(true);
    });
  });
});
