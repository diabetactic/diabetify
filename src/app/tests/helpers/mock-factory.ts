/**
 * Mock Factory Library
 * Centralized mock creation to ensure consistency across tests
 * Eliminates duplicate mock setup code and prevents inconsistent mocking
 *
 * @module tests/helpers/mock-factory
 */

import { HttpClient } from '@angular/common/http';
import { of } from 'rxjs';

/**
 * Centralized factory for creating consistent mocks across test suite
 * Reduces duplication and ensures all required methods are mocked
 */
export class MockFactory {
  /**
   * Create a mock HttpClient with all HTTP method mocks
   * Default behavior: returns empty object
   *
   * @example
   * const mockHttp = MockFactory.createHttpClientMock();
   * mockHttp.get.mockReturnValue(of({ data: 'test' }));
   */
  static createHttpClientMock(): jest.Mocked<HttpClient> {
    return {
      get: jest.fn().mockReturnValue(of({})),
      post: jest.fn().mockReturnValue(of({})),
      put: jest.fn().mockReturnValue(of({})),
      patch: jest.fn().mockReturnValue(of({})),
      delete: jest.fn().mockReturnValue(of({})),
      head: jest.fn().mockReturnValue(of({})),
      options: jest.fn().mockReturnValue(of({})),
      request: jest.fn().mockReturnValue(of({})),
      jsonp: jest.fn().mockReturnValue(of({})),
    } as unknown as jest.Mocked<HttpClient>;
  }

  /**
   * Create a mock ApiGatewayService
   * Default behavior: request resolves with mock response
   */
  static createApiGatewayMock() {
    return {
      request: jest.fn().mockReturnValue(
        of({
          success: true,
          data: {},
          metadata: {
            service: 'UNKNOWN',
            cached: false,
            timestamp: new Date().toISOString(),
          },
        })
      ),
      clearCache: jest.fn().mockReturnValue(undefined),
      setCacheEnabled: jest.fn().mockReturnValue(undefined),
      recordError: jest.fn().mockReturnValue(undefined),
      getServiceStatus: jest.fn().mockReturnValue({ status: 'healthy' }),
      isAvailable: jest.fn().mockReturnValue(true),
    };
  }

  /**
   * Create a mock Dexie database with all table operations
   * Default behavior: all operations return empty/success
   */
  static createDatabaseMock() {
    const createTableMock = () => ({
      toArray: jest.fn().mockResolvedValue([]),
      where: jest.fn().mockReturnValue({
        equals: jest.fn().mockReturnValue({
          toArray: jest.fn().mockResolvedValue([]),
          first: jest.fn().mockResolvedValue(undefined),
          delete: jest.fn().mockResolvedValue(undefined),
        }),
        between: jest.fn().mockReturnValue({
          toArray: jest.fn().mockResolvedValue([]),
          first: jest.fn().mockResolvedValue(undefined),
          delete: jest.fn().mockResolvedValue(undefined),
        }),
        above: jest.fn().mockReturnValue({
          toArray: jest.fn().mockResolvedValue([]),
          delete: jest.fn().mockResolvedValue(undefined),
        }),
        below: jest.fn().mockReturnValue({
          toArray: jest.fn().mockResolvedValue([]),
          delete: jest.fn().mockResolvedValue(undefined),
        }),
      }),
      add: jest.fn().mockResolvedValue('mock-id'),
      update: jest.fn().mockResolvedValue(1),
      delete: jest.fn().mockResolvedValue(undefined),
      bulkAdd: jest.fn().mockResolvedValue(undefined),
      bulkDelete: jest.fn().mockResolvedValue(undefined),
      bulkPut: jest.fn().mockResolvedValue(undefined),
      bulkUpdate: jest.fn().mockResolvedValue(undefined),
      clear: jest.fn().mockResolvedValue(undefined),
      get: jest.fn().mockResolvedValue(undefined),
      put: jest.fn().mockResolvedValue('mock-id'),
      filter: jest.fn().mockReturnValue({
        toArray: jest.fn().mockResolvedValue([]),
        delete: jest.fn().mockResolvedValue(undefined),
      }),
      orderBy: jest.fn().mockReturnValue({
        reverse: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            toArray: jest.fn().mockResolvedValue([]),
            first: jest.fn().mockResolvedValue(undefined),
          }),
          toArray: jest.fn().mockResolvedValue([]),
          first: jest.fn().mockResolvedValue(undefined),
        }),
        limit: jest.fn().mockReturnValue({
          toArray: jest.fn().mockResolvedValue([]),
          first: jest.fn().mockResolvedValue(undefined),
        }),
        toArray: jest.fn().mockResolvedValue([]),
        first: jest.fn().mockResolvedValue(undefined),
      }),
      toCollection: jest.fn().mockReturnValue({
        toArray: jest.fn().mockResolvedValue([]),
        delete: jest.fn().mockResolvedValue(undefined),
      }),
      count: jest.fn().mockResolvedValue(0),
    });

    return {
      readings: createTableMock(),
      syncQueue: createTableMock(),
      appointments: createTableMock(),
      transaction: jest.fn().mockImplementation(async (mode: string, ...args: unknown[]) => {
        const callback = args[args.length - 1] as () => Promise<unknown>;
        return await callback();
      }),
    };
  }

  /**
   * Create a mock LocalAuthService
   * Default behavior: authenticated with valid tokens
   */
  static createLocalAuthMock() {
    return {
      getAccessToken: jest.fn().mockResolvedValue('mock-access-token'),
      getRefreshToken: jest.fn().mockResolvedValue('mock-refresh-token'),
      isAuthenticated: jest.fn().mockReturnValue(true),
      hasValidAccessToken: jest.fn().mockReturnValue(true),
      hasValidRefreshToken: jest.fn().mockReturnValue(true),
      login: jest.fn().mockResolvedValue({ id: 'mock-user-123', email: 'test@example.com' }),
      logout: jest.fn().mockResolvedValue(undefined),
      refreshToken: jest.fn().mockResolvedValue(undefined),
      storeAuth: jest.fn().mockResolvedValue(undefined),
      clearAuth: jest.fn().mockResolvedValue(undefined),
      authState$: {
        asObservable: jest.fn().mockReturnValue(
          of({
            isAuthenticated: true,
            user: { id: 'mock-user-123' },
            accessToken: 'mock-token',
          })
        ),
      },
    };
  }

  /**
   * Create a mock ProfileService
   * Default behavior: returns valid user profile
   */
  static createProfileServiceMock() {
    return {
      getProfile: jest.fn().mockResolvedValue({
        id: 'user_123',
        name: 'Test User',
        email: 'test@example.com',
        preferences: {
          glucoseUnit: 'mg/dL',
          language: 'en',
        },
      }),
      createProfile: jest.fn().mockResolvedValue({ id: 'user_123' }),
      updateProfile: jest.fn().mockResolvedValue({ id: 'user_123' }),
      deleteProfile: jest.fn().mockResolvedValue(undefined),
      storeProfile: jest.fn().mockResolvedValue(undefined),
      hasProfile: jest.fn().mockResolvedValue(true),
      getPreferences: jest.fn().mockResolvedValue({
        glucoseUnit: 'mg/dL',
        language: 'en',
      }),
      setPreferences: jest.fn().mockResolvedValue(undefined),
      profile$: {
        asObservable: jest.fn().mockReturnValue(of({ id: 'user_123', name: 'Test User' })),
      },
    };
  }

  /**
   * Create a mock ReadingsService
   * Default behavior: empty readings list
   */
  static createReadingsServiceMock() {
    return {
      addReading: jest.fn().mockResolvedValue({ id: 'reading_123' }),
      getReading: jest.fn().mockResolvedValue({
        id: 'reading_123',
        value: 120,
        time: new Date().toISOString(),
      }),
      getReadings: jest.fn().mockResolvedValue([]),
      updateReading: jest.fn().mockResolvedValue({ id: 'reading_123' }),
      deleteReading: jest.fn().mockResolvedValue(undefined),
      getStatistics: jest.fn().mockResolvedValue({ average: 120, min: 80, max: 160 }),
      syncReadings: jest.fn().mockResolvedValue(undefined),
      readings$: { asObservable: jest.fn().mockReturnValue(of([])) },
    };
  }

  /**
   * Create a mock AppointmentService
   * Default behavior: empty appointments list
   */
  static createAppointmentServiceMock() {
    return {
      getAppointments: jest.fn().mockResolvedValue([]),
      getAppointment: jest.fn().mockResolvedValue(undefined),
      createAppointment: jest.fn().mockResolvedValue({ id: 'apt_123' }),
      updateAppointment: jest.fn().mockResolvedValue({ id: 'apt_123' }),
      deleteAppointment: jest.fn().mockResolvedValue(undefined),
      acceptAppointment: jest.fn().mockResolvedValue(undefined),
      denyAppointment: jest.fn().mockResolvedValue(undefined),
      appointments$: { asObservable: jest.fn().mockReturnValue(of([])) },
    };
  }

  /**
   * Create a mock NotificationService
   * Default behavior: notifications enabled
   */
  static createNotificationServiceMock() {
    return {
      requestPermissions: jest.fn().mockResolvedValue({ display: 'granted' }),
      checkPermissions: jest.fn().mockResolvedValue({ display: 'granted' }),
      scheduleNotification: jest.fn().mockResolvedValue(undefined),
      cancelNotification: jest.fn().mockResolvedValue(undefined),
      getPendingNotifications: jest.fn().mockResolvedValue([]),
      isNotificationsEnabled: jest.fn().mockReturnValue(true),
    };
  }

  /**
   * Create a mock PlatformDetectorService
   * Default behavior: web platform
   */
  static createPlatformDetectorMock() {
    return {
      isNativePlatform: jest.fn().mockReturnValue(false),
      isWebPlatform: jest.fn().mockReturnValue(true),
      isAndroid: jest.fn().mockReturnValue(false),
      isIOS: jest.fn().mockReturnValue(false),
      isMobilePlatform: jest.fn().mockReturnValue(false),
      getApiBaseUrl: jest.fn().mockReturnValue('http://localhost:8000'),
      getPlatformName: jest.fn().mockReturnValue('web'),
    };
  }

  /**
   * Create a mock EnvironmentDetectorService
   * Default behavior: development environment
   */
  static createEnvironmentDetectorMock() {
    return {
      isPlatformBrowser: jest.fn().mockReturnValue(true),
      isProduction: jest.fn().mockReturnValue(false),
      isDevelopment: jest.fn().mockReturnValue(true),
      isMockMode: jest.fn().mockReturnValue(false),
      getEnvironment: jest.fn().mockReturnValue('development'),
    };
  }

  /**
   * Create a mock LoggerService
   * Default behavior: no-op logging
   */
  static createLoggerServiceMock() {
    return {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      log: jest.fn(),
      setRequestId: jest.fn(),
      getRequestId: jest.fn().mockReturnValue('test-request-id'),
      clearRequestId: jest.fn(),
    };
  }

  /**
   * Create a mock ExternalServicesManager
   * Default behavior: all services available
   */
  static createExternalServicesManagerMock() {
    return {
      isServiceAvailable: jest.fn().mockReturnValue(true),
      getServiceStatus: jest.fn().mockReturnValue({ status: 'healthy', lastCheck: new Date() }),
      recordServiceError: jest.fn(),
      recordServiceSuccess: jest.fn(),
      getServiceStats: jest.fn().mockReturnValue({ errors: 0, successes: 0, lastError: null }),
    };
  }

  /**
   * Create a mock ThemeService
   * Default behavior: light theme
   */
  static createThemeServiceMock() {
    return {
      setTheme: jest.fn(),
      getTheme: jest.fn().mockReturnValue('light'),
      toggleTheme: jest.fn(),
      isDarkMode: jest.fn().mockReturnValue(false),
      theme$: { asObservable: jest.fn().mockReturnValue(of('light')) },
    };
  }

  /**
   * Create a mock TranslationService
   * Default behavior: English language
   */
  static createTranslationServiceMock() {
    return {
      setLanguage: jest.fn().mockResolvedValue(undefined),
      getLanguage: jest.fn().mockReturnValue('en'),
      translate: jest.fn().mockReturnValue('Translated Text'),
      getCurrentLanguage: jest.fn().mockReturnValue('en'),
      language$: { asObservable: jest.fn().mockReturnValue(of('en')) },
    };
  }

  /**
   * Create a complete test module with all common services mocked
   * Useful for complex integration tests
   */
  static createCompleteTestModule() {
    return {
      httpClient: this.createHttpClientMock(),
      apiGateway: this.createApiGatewayMock(),
      database: this.createDatabaseMock(),
      localAuth: this.createLocalAuthMock(),
      profile: this.createProfileServiceMock(),
      readings: this.createReadingsServiceMock(),
      appointments: this.createAppointmentServiceMock(),
      notifications: this.createNotificationServiceMock(),
      platformDetector: this.createPlatformDetectorMock(),
      environmentDetector: this.createEnvironmentDetectorMock(),
      logger: this.createLoggerServiceMock(),
      externalServices: this.createExternalServicesManagerMock(),
      theme: this.createThemeServiceMock(),
      translation: this.createTranslationServiceMock(),
    };
  }

  /**
   * Reset all mocks in a module to initial state
   */
  static resetModuleMocks(mocks: Record<string, any>): void {
    Object.values(mocks).forEach(mock => {
      if (jest.isMockFunction(mock)) {
        mock.mockReset();
      } else if (mock && typeof mock === 'object') {
        Object.values(mock).forEach(method => {
          if (jest.isMockFunction(method)) {
            method.mockReset();
          }
        });
      }
    });
  }
}
