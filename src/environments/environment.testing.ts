import { Capacitor } from '@capacitor/core';

export type BackendMode = 'mock' | 'local' | 'cloud';

/**
 * Get the appropriate base URL for backend services based on platform
 * In test mode with useLocalBackend, points to api-gateway
 * Otherwise uses mock adapters
 */
function getBaseUrl(): string {
  if (Capacitor.isNativePlatform()) {
    const platform = Capacitor.getPlatform();
    if (platform === 'android') {
      return 'http://10.0.2.2:8000';
    } else if (platform === 'ios') {
      return 'http://localhost:8000';
    }
  }
  return 'http://localhost:8000';
}

/**
 * Environment configuration for TEST mode
 *
 * TEST mode enables:
 * - Mock adapters for all services
 * - Debug features and panels
 * - Verbose logging
 * - Demo data generation
 */
export const environment = {
  production: false,
  TEST: true, // ⭐ Single flag that controls all test features
  backendMode: 'local' as BackendMode, // Backend mode for consistency with other environments

  // Tidepool API Configuration
  tidepool: {
    baseUrl: 'https://api.tidepool.org',
    authUrl: 'https://api.tidepool.org/auth',
    dataUrl: 'https://api.tidepool.org/data',
    uploadUrl: 'https://api.tidepool.org/data',
    clientId: 'diabetactic-mobile-test',
    redirectUri: 'diabetactic://oauth/callback',
    scopes: 'data:read data:write profile:read',
    requestTimeout: 30000,
    maxRetries: 3,
    retryDelay: 1000,
  },

  // Logging configuration (verbose in test mode)
  logging: {
    enableConsole: true,
    enableApiLogging: true,
    logLevel: 'debug' as 'debug' | 'info' | 'warn' | 'error',
  },

  // Backend Services Configuration
  backendServices: {
    glucoserver: {
      baseUrl: '',
      apiPath: '',
      requestTimeout: 30000,
    },
    appointments: {
      baseUrl: getBaseUrl(),
      apiPath: '/appointments',
      requestTimeout: 30000,
    },
    auth: {
      baseUrl: getBaseUrl(),
      apiPath: '',
      requestTimeout: 30000,
    },
    apiGateway: {
      baseUrl: getBaseUrl(),
      apiPath: '',
      requestTimeout: 30000,
    },
  },

  // Feature flags (all test features enabled)
  features: {
    offlineMode: true,
    analyticsEnabled: false,
    crashReporting: false,
    useLocalBackend: true, // Use local backend services via api-gateway
    useTidepoolIntegration: false, // Use mocks
    useTidepoolMock: true, // Enable Tidepool mock
    devTools: true, // Enable debug panel
    showEnvBadge: false, // Show CLOUD/LOCAL/MOCK badge (set true for debugging)
  },
};
