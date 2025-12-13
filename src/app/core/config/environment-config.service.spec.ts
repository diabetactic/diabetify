import { TestBed } from '@angular/core/testing';
import {
  EnvironmentConfigService,
  initializeEnvironmentConfig,
  ENVIRONMENT_CONFIG,
} from './environment-config.service';
import { environment } from '@env/environment';

// Mock Capacitor
jest.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: jest.fn(() => false),
    getPlatform: jest.fn(() => 'web'),
  },
}));

import { Capacitor } from '@capacitor/core';

describe('EnvironmentConfigService', () => {
  let service: EnvironmentConfigService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [EnvironmentConfigService],
    });
    service = TestBed.inject(EnvironmentConfigService);

    // Reset Capacitor mocks
    (Capacitor.isNativePlatform as jest.Mock).mockReturnValue(false);
    (Capacitor.getPlatform as jest.Mock).mockReturnValue('web');
  });

  describe('initialization', () => {
    it('should create', () => {
      expect(service).toBeTruthy();
    });

    it('should not be initialized before initialize() is called', () => {
      const newService = new EnvironmentConfigService();
      expect(newService.isInitialized).toBe(false);
    });

    it('should be initialized after initialize() is called', async () => {
      const newService = new EnvironmentConfigService();
      await newService.initialize();
      expect(newService.isInitialized).toBe(true);
    });

    it('initialize() should return a Promise', () => {
      const result = service.initialize();
      expect(result).toBeInstanceOf(Promise);
    });
  });

  describe('core configuration', () => {
    it('should return production flag from environment', () => {
      expect(service.production).toBe(environment.production);
    });

    it('should return backendMode from environment', () => {
      expect(service.backendMode).toBe(environment.backendMode);
    });
  });

  describe('tidepool configuration', () => {
    it('should return tidepool config', () => {
      expect(service.tidepool).toBeDefined();
      expect(service.tidepool.baseUrl).toBe(environment.tidepool.baseUrl);
      expect(service.tidepool.clientId).toBe(environment.tidepool.clientId);
    });

    it('should return readonly tidepool config', () => {
      const tidepool = service.tidepool;
      expect(tidepool).toBe(environment.tidepool);
    });
  });

  describe('logging configuration', () => {
    it('should return logging config', () => {
      expect(service.logging).toBeDefined();
      expect(service.logging.enableConsole).toBe(environment.logging.enableConsole);
      expect(service.logging.logLevel).toBe(environment.logging.logLevel);
    });
  });

  describe('backend services configuration', () => {
    it('should return backendServices config', () => {
      expect(service.backendServices).toBeDefined();
      expect(service.backendServices.apiGateway).toBeDefined();
    });

    it('should return apiGatewayBaseUrl', () => {
      expect(service.apiGatewayBaseUrl).toBe(environment.backendServices.apiGateway.baseUrl);
    });
  });

  describe('feature flags', () => {
    it('should return features config', () => {
      expect(service.features).toBeDefined();
    });

    it('should return offlineModeEnabled', () => {
      expect(service.offlineModeEnabled).toBe(environment.features.offlineMode);
    });

    it('should return devToolsEnabled', () => {
      expect(service.devToolsEnabled).toBe(environment.features.devTools);
    });
  });

  describe('backend mode helpers', () => {
    it('should correctly identify mock mode', () => {
      // Test depends on current environment
      if (environment.backendMode === 'mock') {
        expect(service.isMockMode).toBe(true);
        expect(service.isLocalMode).toBe(false);
        expect(service.isCloudMode).toBe(false);
      }
    });

    it('should correctly identify local mode', () => {
      if (environment.backendMode === 'local') {
        expect(service.isLocalMode).toBe(true);
        expect(service.isMockMode).toBe(false);
        expect(service.isCloudMode).toBe(false);
      }
    });

    it('should correctly identify cloud mode', () => {
      if (environment.backendMode === 'cloud') {
        expect(service.isCloudMode).toBe(true);
        expect(service.isMockMode).toBe(false);
        expect(service.isLocalMode).toBe(false);
      }
    });
  });

  describe('platform detection', () => {
    it('should return isNativePlatform from Capacitor', () => {
      (Capacitor.isNativePlatform as jest.Mock).mockReturnValue(false);
      expect(service.isNativePlatform).toBe(false);

      (Capacitor.isNativePlatform as jest.Mock).mockReturnValue(true);
      expect(service.isNativePlatform).toBe(true);
    });

    it('should return platform from Capacitor', () => {
      (Capacitor.getPlatform as jest.Mock).mockReturnValue('web');
      expect(service.platform).toBe('web');

      (Capacitor.getPlatform as jest.Mock).mockReturnValue('android');
      expect(service.platform).toBe('android');

      (Capacitor.getPlatform as jest.Mock).mockReturnValue('ios');
      expect(service.platform).toBe('ios');
    });
  });

  describe('getFullConfig', () => {
    it('should return complete configuration snapshot', () => {
      const config = service.getFullConfig();

      expect(config.production).toBe(environment.production);
      expect(config.backendMode).toBe(environment.backendMode);
      expect(config.tidepool).toBeDefined();
      expect(config.logging).toBeDefined();
      expect(config.backendServices).toBeDefined();
      expect(config.features).toBeDefined();
    });

    it('should return readonly config', () => {
      const config1 = service.getFullConfig();
      const config2 = service.getFullConfig();

      // Each call returns same structure
      expect(config1.production).toBe(config2.production);
      expect(config1.backendMode).toBe(config2.backendMode);
    });
  });

  describe('APP_INITIALIZER factory', () => {
    it('should return a function', () => {
      const factory = initializeEnvironmentConfig(service);
      expect(typeof factory).toBe('function');
    });

    it('should call service.initialize() when factory is executed', async () => {
      const initSpy = jest.spyOn(service, 'initialize');
      const factory = initializeEnvironmentConfig(service);

      await factory();

      expect(initSpy).toHaveBeenCalled();
    });

    it('should return a Promise from the factory', () => {
      const factory = initializeEnvironmentConfig(service);
      const result = factory();
      expect(result).toBeInstanceOf(Promise);
    });
  });

  describe('ENVIRONMENT_CONFIG injection token', () => {
    it('should be defined', () => {
      expect(ENVIRONMENT_CONFIG).toBeDefined();
    });
  });
});
