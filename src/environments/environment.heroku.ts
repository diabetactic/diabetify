// Heroku / cloud-backed development environment
// Used when running `ENV=heroku npm start`

import { Capacitor } from '@capacitor/core';

export type BackendMode = 'mock' | 'local' | 'cloud';

// For Heroku dev we want to talk to the cloud gateway via the dev-server proxy.
const DEV_BACKEND_MODE: BackendMode = 'cloud';

/**
 * Get the appropriate base URL for backend services based on platform and mode.
 *
 * In 'cloud' mode for web:
 *   - return '/api' so Angular dev server proxies to Heroku (see proxy.conf.json)
 */
function getBaseUrl(mode: BackendMode): string {
  if (mode === 'local') {
    // Local Docker env (container-managing, host:8004 → container:8000)
    if (Capacitor.isNativePlatform()) {
      const platform = Capacitor.getPlatform();
      if (platform === 'android') {
        return 'http://10.0.2.2:8004';
      }
      // iOS simulator / device
      return 'http://localhost:8004';
    }
    // Web dev hitting local gateway directly
    return 'http://localhost:8004';
  }

  // cloud or mock → use Heroku API Gateway
  if (Capacitor.isNativePlatform()) {
    return 'https://diabetactic-api-gateway-37949d6f182f.herokuapp.com';
  }

  // Web development: use proxy to bypass CORS (proxy.conf.json → Heroku)
  return '/api';
}

/**
 * Environment configuration for Heroku-backed development
 */
export const environment = {
  production: false,
  backendMode: DEV_BACKEND_MODE as BackendMode,

  // Tidepool API Configuration
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
      baseUrl: getBaseUrl(DEV_BACKEND_MODE),
      apiPath: '',
      requestTimeout: 30000,
    },
    glucoserver: {
      baseUrl: '',
      apiPath: '',
      requestTimeout: 30000,
    },
    appointments: {
      baseUrl: '',
      apiPath: '',
      requestTimeout: 30000,
    },
    auth: {
      baseUrl: '',
      apiPath: '',
      requestTimeout: 30000,
    },
  },

  features: {
    offlineMode: true,
    analyticsEnabled: false,
    crashReporting: false,
    useLocalBackend: (DEV_BACKEND_MODE as BackendMode) === 'local',
    useTidepoolIntegration: (DEV_BACKEND_MODE as BackendMode) === 'cloud',
    useTidepoolMock: (DEV_BACKEND_MODE as BackendMode) === 'mock',
    devTools: true,
    showEnvBadge: false, // Show CLOUD/LOCAL/MOCK badge (set true for debugging)
    showStatusBadges: false, // Show floating demo badges (env/sync/network)
    webDeviceFrame: false, // Opt-in phone frame on desktop web (html.dt-device-frame)
  },
};
