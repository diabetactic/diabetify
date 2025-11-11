/**
 * Mock Adapter Configuration Interface
 *
 * Defines the structure for mock backend configuration.
 * This allows granular control over which services use mock data.
 *
 * REVERSION INSTRUCTIONS:
 * To remove the mock adapter layer and restore original behavior:
 *
 * 1. Delete files:
 *    - src/app/core/services/mock-adapter.service.ts
 *    - src/app/core/config/mock-adapter-config.ts
 *
 * 2. Remove imports from services:
 *    - appointment.service.ts
 *    - readings.service.ts
 *    - unified-auth.service.ts
 *    - local-auth.service.ts
 *
 * 3. Restore original service methods:
 *    - Remove any `if (this.mockAdapter.isServiceMockEnabled(...))` checks
 *    - Restore original implementation code
 *
 * 4. Clear localStorage:
 *    - Remove key: 'diabetactic_use_mock_backend'
 *
 * 5. Rebuild application:
 *    npm run build
 *
 * The application will return to using real backend services exclusively,
 * respecting the existing environment.features.useLocalBackend flag.
 */

/**
 * Configuration interface for mock adapter
 */
export interface MockAdapterConfig {
  /**
   * Global toggle for mock backend
   * When false, all services use real backends regardless of individual settings
   */
  enabled: boolean;

  /**
   * Per-service mock enablement
   * Only applies when global 'enabled' is true
   */
  services: {
    /**
     * Mock appointment booking and retrieval
     */
    appointments: boolean;

    /**
     * Mock glucose reading storage and sync
     */
    glucoserver: boolean;

    /**
     * Mock authentication and user management
     */
    auth: boolean;
  };
}

/**
 * Default configuration
 *
 * By default, all services use mock data.
 * This is ideal for:
 * - Development without backend
 * - Testing and demos
 * - Offline scenarios
 *
 * To use real backends:
 * 1. Set enabled: false in MockAdapterService
 * 2. Or disable specific services via setServiceMockEnabled()
 */
export const DEFAULT_MOCK_ADAPTER_CONFIG: MockAdapterConfig = {
  enabled: true,
  services: {
    appointments: true,
    glucoserver: true,
    auth: true,
  },
};

/**
 * Production configuration example
 *
 * For production builds, typically disable all mocks:
 */
export const PRODUCTION_MOCK_ADAPTER_CONFIG: MockAdapterConfig = {
  enabled: false,
  services: {
    appointments: false,
    glucoserver: false,
    auth: false,
  },
};

/**
 * Hybrid configuration example
 *
 * Use real auth but mock data services (useful for backend testing):
 */
export const HYBRID_MOCK_ADAPTER_CONFIG: MockAdapterConfig = {
  enabled: true,
  services: {
    appointments: true,
    glucoserver: true,
    auth: false, // Use real authentication
  },
};
