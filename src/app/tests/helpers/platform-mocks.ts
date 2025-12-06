/**
 * Platform Detector Service Mock
 *
 * Provides mock for PlatformDetectorService to control platform behavior in tests
 * Fixes ~35% of test failures related to API URL mismatches
 */
import { PlatformDetectorService } from '../../core/services/platform-detector.service';

/**
 * API base URLs for different platforms
 */
export const PLATFORM_BASE_URLS = {
  android: 'http://10.0.2.2:8000', // Android emulator localhost
  ios: 'http://localhost:8000', // iOS simulator localhost
  web: 'http://localhost:8000', // Web browser localhost
} as const;

/**
 * Create a mock PlatformDetectorService
 *
 * @param platform Platform to mock (default: 'web')
 * @returns Jasmine spy object configured for the specified platform
 *
 * @example
 * const platformDetector = createMockPlatformDetectorService('android');
 * TestBed.configureTestingModule({
 *   providers: [
 *     { provide: PlatformDetectorService, useValue: platformDetector }
 *   ]
 * });
 */
export function createMockPlatformDetectorService(
  platform: 'android' | 'ios' | 'web' = 'web'
): jest.Mocked<PlatformDetectorService> {
  const mock = {
    getApiBaseUrl: jest.fn().mockReturnValue(PLATFORM_BASE_URLS[platform]),
    getPlatformConfig: jest.fn().mockReturnValue({
      platform,
      isNative: platform !== 'web',
      isWeb: platform === 'web',
      isMobile: platform !== 'web',
      isDesktop: platform === 'web',
      baseUrl: PLATFORM_BASE_URLS[platform],
    }),
    logPlatformInfo: jest.fn(),
  } as jest.Mocked<PlatformDetectorService>;

  return mock;
}

/**
 * Create a dynamic platform detector mock that can be changed during tests
 *
 * @example
 * const { mock, setPlatform } = createDynamicPlatformDetectorMock();
 *
 * it('should work on Android', () => {
 *   setPlatform('android');
 *   expect(mock.getApiBaseUrl()).toBe('http://10.0.2.2:8000');
 * });
 *
 * it('should work on iOS', () => {
 *   setPlatform('ios');
 *   expect(mock.getApiBaseUrl()).toBe('http://localhost:8000');
 * });
 */
export function createDynamicPlatformDetectorMock() {
  let currentPlatform: 'android' | 'ios' | 'web' = 'web';

  const mock = {
    getApiBaseUrl: jest.fn().mockImplementation(() => PLATFORM_BASE_URLS[currentPlatform]),
    getPlatformConfig: jest.fn().mockImplementation(() => ({
      platform: currentPlatform,
      isNative: currentPlatform !== 'web',
      isWeb: currentPlatform === 'web',
      isMobile: currentPlatform !== 'web',
      isDesktop: currentPlatform === 'web',
      baseUrl: PLATFORM_BASE_URLS[currentPlatform],
    })),
    logPlatformInfo: jest.fn(),
  } as jest.Mocked<PlatformDetectorService>;

  return {
    mock,
    setPlatform: (platform: 'android' | 'ios' | 'web') => {
      currentPlatform = platform;
    },
    getPlatform: () => currentPlatform,
  };
}

/**
 * Helper to verify platform detection in tests
 *
 * @example
 * expectPlatformConfig(service, 'android', 'http://10.0.2.2:8000');
 */
export function expectPlatformConfig(
  service: jest.Mocked<PlatformDetectorService>,
  expectedPlatform: string,
  expectedUrl: string
) {
  expect(service.getApiBaseUrl).toHaveBeenCalled();
  expect(service.getApiBaseUrl()).toBe(expectedUrl);

  const config = service.getPlatformConfig();
  expect(config.platform).toBe(expectedPlatform);
  expect(config.baseUrl).toBe(expectedUrl);
}
