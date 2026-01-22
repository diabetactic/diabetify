/**
 * MOCK MODE - No backend required
 * Uses in-memory mock data for all operations
 * Perfect for: Development, testing, demos without backend
 */

export type BackendMode = 'mock' | 'local' | 'cloud';

export const environment = {
  production: false,
  backendMode: 'mock' as BackendMode,

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
    devTools: true,
    showEnvBadge: false, // Show CLOUD/LOCAL/MOCK badge (set true for debugging)
    showStatusBadges: false, // Show floating demo badges (env/sync/network)
    webDeviceFrame: false, // Opt-in phone frame on desktop web (html.dt-device-frame)
  },
};
