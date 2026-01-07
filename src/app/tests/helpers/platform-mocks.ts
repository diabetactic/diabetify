/**
 * Platform Mocks for Testing
 *
 * Provides mock implementations of platform detection services for unit/integration tests.
 */

import { PlatformDetectorService } from '@core/services/platform-detector.service';

/**
 * Platform configuration for mocking
 */
export interface MockPlatformConfig {
  platform: string;
  isNative: boolean;
  isWeb: boolean;
  isMobile: boolean;
  isDesktop: boolean;
  baseUrl: string;
}

/**
 * Platform-specific configurations
 */
const PLATFORM_CONFIGS: Record<'android' | 'ios' | 'web', MockPlatformConfig> = {
  android: {
    platform: 'android',
    isNative: true,
    isWeb: false,
    isMobile: true,
    isDesktop: false,
    baseUrl: 'http://10.0.2.2:8000',
  },
  ios: {
    platform: 'ios',
    isNative: true,
    isWeb: false,
    isMobile: true,
    isDesktop: false,
    baseUrl: 'http://localhost:8000',
  },
  web: {
    platform: 'web',
    isNative: false,
    isWeb: true,
    isMobile: false,
    isDesktop: true,
    baseUrl: '/api',
  },
};

/**
 * Create a mock PlatformDetectorService
 *
 * @param platformType - The platform to mock ('android', 'ios', 'web')
 * @returns A jasmine spy object that mocks PlatformDetectorService
 *
 * @example
 * const platformMock = createMockPlatformDetectorService('android');
 * TestBed.configureTestingModule({
 *   providers: [
 *     { provide: PlatformDetectorService, useValue: platformMock }
 *   ]
 * });
 *
 * // Verify calls:
 * expect(platformMock.getApiBaseUrl).toHaveBeenCalled();
 * expect(platformMock.getApiBaseUrl()).toBe('http://10.0.2.2:8000');
 */
export function createMockPlatformDetectorService(
  platformType: 'android' | 'ios' | 'web' = 'web'
): jasmine.SpyObj<PlatformDetectorService> {
  const config = PLATFORM_CONFIGS[platformType];

  const spy = jasmine.createSpyObj<PlatformDetectorService>('PlatformDetectorService', [
    'getApiBaseUrl',
    'getPlatformConfig',
    'logPlatformInfo',
  ]);

  spy.getApiBaseUrl.and.callFake((defaultUrl?: string) => {
    // If a custom default URL is provided and it's an HTTPS URL, use it
    if (defaultUrl && defaultUrl.startsWith('https://')) {
      return defaultUrl;
    }
    return config.baseUrl;
  });

  spy.getPlatformConfig.and.returnValue({ ...config });

  spy.logPlatformInfo.and.stub();

  return spy;
}

/**
 * Create a configurable mock PlatformDetectorService
 * Allows customizing the behavior after creation
 *
 * @param initialPlatform - Initial platform to mock
 * @returns Object with the mock and methods to configure it
 *
 * @example
 * const { mock, setBaseUrl, setPlatform } = createConfigurablePlatformMock('web');
 *
 * // Change behavior mid-test:
 * setBaseUrl('https://api.production.com');
 * expect(mock.getApiBaseUrl()).toBe('https://api.production.com');
 */
export function createConfigurablePlatformMock(
  initialPlatform: 'android' | 'ios' | 'web' = 'web'
): {
  mock: jasmine.SpyObj<PlatformDetectorService>;
  setBaseUrl: (url: string) => void;
  setPlatform: (platform: 'android' | 'ios' | 'web') => void;
  reset: () => void;
} {
  let currentConfig = { ...PLATFORM_CONFIGS[initialPlatform] };

  const mock = jasmine.createSpyObj<PlatformDetectorService>('PlatformDetectorService', [
    'getApiBaseUrl',
    'getPlatformConfig',
    'logPlatformInfo',
  ]);

  const updateSpies = () => {
    mock.getApiBaseUrl.and.callFake((defaultUrl?: string) => {
      if (defaultUrl && defaultUrl.startsWith('https://')) {
        return defaultUrl;
      }
      return currentConfig.baseUrl;
    });
    mock.getPlatformConfig.and.returnValue({ ...currentConfig });
  };

  updateSpies();
  mock.logPlatformInfo.and.stub();

  return {
    mock,
    setBaseUrl: (url: string) => {
      currentConfig.baseUrl = url;
      updateSpies();
    },
    setPlatform: (platform: 'android' | 'ios' | 'web') => {
      currentConfig = { ...PLATFORM_CONFIGS[platform] };
      updateSpies();
    },
    reset: () => {
      currentConfig = { ...PLATFORM_CONFIGS[initialPlatform] };
      updateSpies();
      mock.getApiBaseUrl.calls.reset();
      mock.getPlatformConfig.calls.reset();
      mock.logPlatformInfo.calls.reset();
    },
  };
}

/**
 * Create a mock for web development mode
 * Simulates running on localhost:4200 with Angular dev server
 */
export function createWebDevModePlatformMock(): jasmine.SpyObj<PlatformDetectorService> {
  const mock = createMockPlatformDetectorService('web');

  // Override to return /api (proxied through Angular dev server)
  mock.getApiBaseUrl.and.returnValue('/api');
  mock.getPlatformConfig.and.returnValue({
    platform: 'web',
    isNative: false,
    isWeb: true,
    isMobile: false,
    isDesktop: true,
    baseUrl: '/api',
  });

  return mock;
}

/**
 * Create a mock for production web mode
 * Simulates running on a production server
 */
export function createWebProductionPlatformMock(
  productionUrl: string = 'https://api.diabetactic.com'
): jasmine.SpyObj<PlatformDetectorService> {
  const mock = createMockPlatformDetectorService('web');

  mock.getApiBaseUrl.and.returnValue(productionUrl);
  mock.getPlatformConfig.and.returnValue({
    platform: 'web',
    isNative: false,
    isWeb: true,
    isMobile: false,
    isDesktop: true,
    baseUrl: productionUrl,
  });

  return mock;
}

/**
 * Create a mock for mobile web (responsive) mode
 * Simulates running in a mobile browser
 */
export function createMobileWebPlatformMock(): jasmine.SpyObj<PlatformDetectorService> {
  const mock = createMockPlatformDetectorService('web');

  mock.getPlatformConfig.and.returnValue({
    platform: 'web',
    isNative: false,
    isWeb: true,
    isMobile: true, // Mobile browser
    isDesktop: false,
    baseUrl: '/api',
  });

  return mock;
}
