/**
 * MOCK MODE - No backend required
 * Uses in-memory mock data for all operations
 * Perfect for: Development, testing, demos without backend
 */

export type BackendMode = 'mock' | 'local' | 'cloud';

export const environment = {
  production: false,
  backendMode: 'mock' as BackendMode,

  tidepool: {
    baseUrl: 'https://api.tidepool.org',
    authUrl: 'https://api.tidepool.org/auth',
    dataUrl: 'https://api.tidepool.org/data',
    uploadUrl: 'https://api.tidepool.org/data',
    clientId: 'diabetactic-mobile-dev',
    redirectUri: 'diabetactic://oauth/callback',
    scopes: 'data:read data:write profile:read',
    requestTimeout: 30000,
    maxRetries: 3,
    retryDelay: 1000,
  },

  logging: {
    enableConsole: true,
    enableApiLogging: true,
    logLevel: 'debug' as 'debug' | 'info' | 'warn' | 'error',
  },

  backendServices: {
    apiGateway: {
      baseUrl: '', // No backend needed in mock mode
      apiPath: '',
      requestTimeout: 30000,
    },
    glucoserver: { baseUrl: '', apiPath: '', requestTimeout: 30000 },
    appointments: { baseUrl: '', apiPath: '', requestTimeout: 30000 },
    auth: { baseUrl: '', apiPath: '', requestTimeout: 30000 },
  },

  features: {
    offlineMode: true,
    analyticsEnabled: false,
    crashReporting: false,
    useLocalBackend: false,
    useTidepoolIntegration: false,
    useTidepoolMock: true, // ← MOCK MODE ENABLED
    devTools: true,
    showEnvBadge: false, // Show CLOUD/LOCAL/MOCK badge (set true for debugging)
  },
};
