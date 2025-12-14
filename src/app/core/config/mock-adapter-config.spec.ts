/**
 * Unit tests for mock adapter configuration
 * Tests configuration interfaces and preset configurations
 */

// Initialize TestBed environment for Vitest
import '../../../test-setup';

import {
  MockAdapterConfig,
  DEFAULT_MOCK_ADAPTER_CONFIG,
  PRODUCTION_MOCK_ADAPTER_CONFIG,
  HYBRID_MOCK_ADAPTER_CONFIG,
} from './mock-adapter-config';

describe('MockAdapterConfig', () => {
  describe('MockAdapterConfig interface', () => {
    it('should accept valid config', () => {
      const config: MockAdapterConfig = {
        enabled: true,
        services: {
          appointments: true,
          glucoserver: true,
          auth: true,
        },
      };
      expect(config.enabled).toBe(true);
      expect(config.services.appointments).toBe(true);
    });

    it('should accept disabled config', () => {
      const config: MockAdapterConfig = {
        enabled: false,
        services: {
          appointments: false,
          glucoserver: false,
          auth: false,
        },
      };
      expect(config.enabled).toBe(false);
      expect(config.services.appointments).toBe(false);
    });

    it('should accept mixed service config', () => {
      const config: MockAdapterConfig = {
        enabled: true,
        services: {
          appointments: true,
          glucoserver: false,
          auth: true,
        },
      };
      expect(config.services.appointments).toBe(true);
      expect(config.services.glucoserver).toBe(false);
      expect(config.services.auth).toBe(true);
    });

    it('should have all required service keys', () => {
      const config: MockAdapterConfig = {
        enabled: true,
        services: {
          appointments: true,
          glucoserver: true,
          auth: true,
        },
      };
      expect(config.services.appointments).toBeDefined();
      expect(config.services.glucoserver).toBeDefined();
      expect(config.services.auth).toBeDefined();
    });
  });

  describe('DEFAULT_MOCK_ADAPTER_CONFIG', () => {
    it('should be enabled by default', () => {
      expect(DEFAULT_MOCK_ADAPTER_CONFIG.enabled).toBe(true);
    });

    it('should have all services enabled', () => {
      expect(DEFAULT_MOCK_ADAPTER_CONFIG.services.appointments).toBe(true);
      expect(DEFAULT_MOCK_ADAPTER_CONFIG.services.glucoserver).toBe(true);
      expect(DEFAULT_MOCK_ADAPTER_CONFIG.services.auth).toBe(true);
    });

    it('should have all required service keys', () => {
      const services = DEFAULT_MOCK_ADAPTER_CONFIG.services;
      expect('appointments' in services).toBe(true);
      expect('glucoserver' in services).toBe(true);
      expect('auth' in services).toBe(true);
    });

    it('should be suitable for development', () => {
      expect(DEFAULT_MOCK_ADAPTER_CONFIG.enabled).toBe(true);
      const allServicesEnabled = Object.values(DEFAULT_MOCK_ADAPTER_CONFIG.services).every(
        enabled => enabled === true
      );
      expect(allServicesEnabled).toBe(true);
    });
  });

  describe('PRODUCTION_MOCK_ADAPTER_CONFIG', () => {
    it('should be disabled', () => {
      expect(PRODUCTION_MOCK_ADAPTER_CONFIG.enabled).toBe(false);
    });

    it('should have all services disabled', () => {
      expect(PRODUCTION_MOCK_ADAPTER_CONFIG.services.appointments).toBe(false);
      expect(PRODUCTION_MOCK_ADAPTER_CONFIG.services.glucoserver).toBe(false);
      expect(PRODUCTION_MOCK_ADAPTER_CONFIG.services.auth).toBe(false);
    });

    it('should be suitable for production', () => {
      expect(PRODUCTION_MOCK_ADAPTER_CONFIG.enabled).toBe(false);
      const allServicesDisabled = Object.values(PRODUCTION_MOCK_ADAPTER_CONFIG.services).every(
        enabled => enabled === false
      );
      expect(allServicesDisabled).toBe(true);
    });

    it('should have all required service keys', () => {
      const services = PRODUCTION_MOCK_ADAPTER_CONFIG.services;
      expect('appointments' in services).toBe(true);
      expect('glucoserver' in services).toBe(true);
      expect('auth' in services).toBe(true);
    });
  });

  describe('HYBRID_MOCK_ADAPTER_CONFIG', () => {
    it('should be enabled', () => {
      expect(HYBRID_MOCK_ADAPTER_CONFIG.enabled).toBe(true);
    });

    it('should have data services enabled', () => {
      expect(HYBRID_MOCK_ADAPTER_CONFIG.services.appointments).toBe(true);
      expect(HYBRID_MOCK_ADAPTER_CONFIG.services.glucoserver).toBe(true);
    });

    it('should have auth service disabled', () => {
      expect(HYBRID_MOCK_ADAPTER_CONFIG.services.auth).toBe(false);
    });

    it('should be suitable for backend testing', () => {
      expect(HYBRID_MOCK_ADAPTER_CONFIG.enabled).toBe(true);
      expect(HYBRID_MOCK_ADAPTER_CONFIG.services.auth).toBe(false);
      expect(HYBRID_MOCK_ADAPTER_CONFIG.services.appointments).toBe(true);
    });

    it('should have all required service keys', () => {
      const services = HYBRID_MOCK_ADAPTER_CONFIG.services;
      expect('appointments' in services).toBe(true);
      expect('glucoserver' in services).toBe(true);
      expect('auth' in services).toBe(true);
    });
  });

  describe('Configuration comparison', () => {
    it('should have different enabled states', () => {
      expect(DEFAULT_MOCK_ADAPTER_CONFIG.enabled).toBe(true);
      expect(PRODUCTION_MOCK_ADAPTER_CONFIG.enabled).toBe(false);
      expect(HYBRID_MOCK_ADAPTER_CONFIG.enabled).toBe(true);
    });

    it('should have different service configurations', () => {
      const defaultServices = DEFAULT_MOCK_ADAPTER_CONFIG.services;
      const productionServices = PRODUCTION_MOCK_ADAPTER_CONFIG.services;
      const hybridServices = HYBRID_MOCK_ADAPTER_CONFIG.services;

      // Default: all enabled
      expect(defaultServices.appointments).toBe(true);
      expect(defaultServices.glucoserver).toBe(true);
      expect(defaultServices.auth).toBe(true);

      // Production: all disabled
      expect(productionServices.appointments).toBe(false);
      expect(productionServices.glucoserver).toBe(false);
      expect(productionServices.auth).toBe(false);

      // Hybrid: data enabled, auth disabled
      expect(hybridServices.appointments).toBe(true);
      expect(hybridServices.glucoserver).toBe(true);
      expect(hybridServices.auth).toBe(false);
    });

    it('should all have the same service keys', () => {
      const defaultKeys = Object.keys(DEFAULT_MOCK_ADAPTER_CONFIG.services).sort();
      const productionKeys = Object.keys(PRODUCTION_MOCK_ADAPTER_CONFIG.services).sort();
      const hybridKeys = Object.keys(HYBRID_MOCK_ADAPTER_CONFIG.services).sort();

      expect(defaultKeys).toEqual(productionKeys);
      expect(defaultKeys).toEqual(hybridKeys);
    });
  });

  describe('Service types', () => {
    it('should include appointments service', () => {
      expect(DEFAULT_MOCK_ADAPTER_CONFIG.services.appointments).toBeDefined();
      expect(PRODUCTION_MOCK_ADAPTER_CONFIG.services.appointments).toBeDefined();
      expect(HYBRID_MOCK_ADAPTER_CONFIG.services.appointments).toBeDefined();
    });

    it('should include glucoserver service', () => {
      expect(DEFAULT_MOCK_ADAPTER_CONFIG.services.glucoserver).toBeDefined();
      expect(PRODUCTION_MOCK_ADAPTER_CONFIG.services.glucoserver).toBeDefined();
      expect(HYBRID_MOCK_ADAPTER_CONFIG.services.glucoserver).toBeDefined();
    });

    it('should include auth service', () => {
      expect(DEFAULT_MOCK_ADAPTER_CONFIG.services.auth).toBeDefined();
      expect(PRODUCTION_MOCK_ADAPTER_CONFIG.services.auth).toBeDefined();
      expect(HYBRID_MOCK_ADAPTER_CONFIG.services.auth).toBeDefined();
    });

    it('should have boolean values for all services', () => {
      const configs = [
        DEFAULT_MOCK_ADAPTER_CONFIG,
        PRODUCTION_MOCK_ADAPTER_CONFIG,
        HYBRID_MOCK_ADAPTER_CONFIG,
      ];

      configs.forEach(config => {
        Object.values(config.services).forEach(value => {
          expect(typeof value).toBe('boolean');
        });
      });
    });
  });

  describe('Configuration validity', () => {
    it('should have valid structure for all configs', () => {
      const configs = [
        DEFAULT_MOCK_ADAPTER_CONFIG,
        PRODUCTION_MOCK_ADAPTER_CONFIG,
        HYBRID_MOCK_ADAPTER_CONFIG,
      ];

      configs.forEach(config => {
        expect(typeof config.enabled).toBe('boolean');
        expect(config.services).toBeDefined();
        expect(typeof config.services).toBe('object');
      });
    });

    it('should have non-null service objects', () => {
      expect(DEFAULT_MOCK_ADAPTER_CONFIG.services).not.toBeNull();
      expect(PRODUCTION_MOCK_ADAPTER_CONFIG.services).not.toBeNull();
      expect(HYBRID_MOCK_ADAPTER_CONFIG.services).not.toBeNull();
    });

    it('should have exactly 3 service keys', () => {
      const configs = [
        DEFAULT_MOCK_ADAPTER_CONFIG,
        PRODUCTION_MOCK_ADAPTER_CONFIG,
        HYBRID_MOCK_ADAPTER_CONFIG,
      ];

      configs.forEach(config => {
        expect(Object.keys(config.services).length).toBe(3);
      });
    });
  });

  describe('Use case scenarios', () => {
    it('default config should support offline development', () => {
      expect(DEFAULT_MOCK_ADAPTER_CONFIG.enabled).toBe(true);
      expect(DEFAULT_MOCK_ADAPTER_CONFIG.services.appointments).toBe(true);
      expect(DEFAULT_MOCK_ADAPTER_CONFIG.services.glucoserver).toBe(true);
      expect(DEFAULT_MOCK_ADAPTER_CONFIG.services.auth).toBe(true);
    });

    it('production config should use real backends', () => {
      expect(PRODUCTION_MOCK_ADAPTER_CONFIG.enabled).toBe(false);
      expect(PRODUCTION_MOCK_ADAPTER_CONFIG.services.appointments).toBe(false);
      expect(PRODUCTION_MOCK_ADAPTER_CONFIG.services.glucoserver).toBe(false);
      expect(PRODUCTION_MOCK_ADAPTER_CONFIG.services.auth).toBe(false);
    });

    it('hybrid config should support backend testing with real auth', () => {
      expect(HYBRID_MOCK_ADAPTER_CONFIG.enabled).toBe(true);
      expect(HYBRID_MOCK_ADAPTER_CONFIG.services.auth).toBe(false);
      expect(HYBRID_MOCK_ADAPTER_CONFIG.services.appointments).toBe(true);
      expect(HYBRID_MOCK_ADAPTER_CONFIG.services.glucoserver).toBe(true);
    });
  });
});
