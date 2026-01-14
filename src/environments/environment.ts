// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

import { Capacitor } from '@capacitor/core';

export type BackendMode = 'mock' | 'local' | 'cloud';

/**
 * BACKEND MODE SELECTION
 *
 * Change DEV_BACKEND_MODE to switch between:
 *
 *   'mock'  → Mock adapter (in-memory, instant, no backend required)
 *             Use for: Development, fast testing, offline mode
 *
 *   'local' → Local Docker backend (http://localhost:8000)
 *             Use for: Full-stack development, Docker Compose testing
 *             Config: Docker Compose with extServices
 *
 *   'cloud' → Heroku API Gateway (https://diabetactic-api-gateway-37949d6f182f.herokuapp.com)
 *             Use for: Integration testing, production validation
 *
 * Default is 'cloud' for Heroku API. Override with ENV variable:
 *   ENV=local npm start    # Local Docker backend
 *   ENV=mock npm start     # In-memory mock (offline dev)
 */
const DEV_BACKEND_MODE: BackendMode = 'mock';

/**
 * Get the appropriate base URL for backend services based on platform and mode.
 */
function getBaseUrl(mode: BackendMode): string {
  if (mode === 'local') {
    if (Capacitor.isNativePlatform()) {
      const platform = Capacitor.getPlatform();
      if (platform === 'android') {
        return 'http://10.0.2.2:8000';
      }
      return 'http://localhost:8000';
    }
    return 'http://localhost:8000';
  }

  // cloud or mock → use Heroku API Gateway
  if (Capacitor.isNativePlatform()) {
    return 'https://diabetactic-api-gateway-37949d6f182f.herokuapp.com';
  }

  // Web development: use proxy to bypass CORS (proxy.conf.json → Heroku)
  return '/api';
}

/**
 * Environment configuration for development
 */
export const environment = {
  production: false,
  backendMode: DEV_BACKEND_MODE as BackendMode,

  // Tidepool API Configuration
  tidepool: {
    // API base URLs
    baseUrl: 'https://api.tidepool.org',
    authUrl: 'https://api.tidepool.org/auth',
    dataUrl: 'https://api.tidepool.org/data',
    uploadUrl: 'https://api.tidepool.org/data',

    // OAuth2 Configuration
    // Client ID for Tidepool authentication (auth-only integration)
    clientId: 'diabetactic-mobile-dev',

    // Redirect URI for OAuth flow (must be registered with Tidepool)
    // For Capacitor apps, use custom URL scheme
    redirectUri: 'diabetactic://oauth/callback',

    // OAuth scopes
    scopes: 'data:read data:write profile:read',

    // API request configuration
    requestTimeout: 30000, // 30 seconds
    maxRetries: 3,
    retryDelay: 1000, // 1 second initial delay
  },

  // Logging configuration
  logging: {
    enableConsole: true,
    enableApiLogging: true,
    logLevel: 'debug' as 'debug' | 'info' | 'warn' | 'error',
  },

  // Backend Services Configuration
  // IMPORTANT: Using API Gateway for all backend services (port 8000)
  // All services route through the gateway:
  //   - POST /token (login)
  //   - GET /users/me (user profile)
  //   - GET /appointments/mine (appointments)
  //   - POST /appointments/create
  //   - GET /glucose/mine (glucose readings)
  //   - POST /glucose/create
  backendServices: {
    // API Gateway - main entry point for all backend services
    apiGateway: {
      baseUrl: getBaseUrl(DEV_BACKEND_MODE),
      apiPath: '',
      requestTimeout: 30000,
    },

    // Legacy configs (kept for compatibility, but all requests go through API Gateway)
    glucoserver: {
      baseUrl: '', // Use API Gateway instead
      apiPath: '',
      requestTimeout: 30000,
    },

    appointments: {
      baseUrl: '', // Use API Gateway instead
      apiPath: '',
      requestTimeout: 30000,
    },

    auth: {
      baseUrl: '', // Use API Gateway instead
      apiPath: '',
      requestTimeout: 30000,
    },
  },

  // Feature flags
  features: {
    offlineMode: true,
    analyticsEnabled: false, // Disable analytics in development
    crashReporting: false,
    // Single-source backend mode flags
    useLocalBackend: (DEV_BACKEND_MODE as BackendMode) === 'local',
    useTidepoolIntegration: (DEV_BACKEND_MODE as BackendMode) === 'cloud',
    useTidepoolMock: (DEV_BACKEND_MODE as BackendMode) === 'mock',
    devTools: true, // Enable developer tools (account state toggle, etc.)
    showEnvBadge: false, // Show CLOUD/LOCAL/MOCK badge (set true for debugging)
    showStatusBadges: false, // Show floating demo badges (env/sync/network)
    webDeviceFrame: false, // Opt-in phone frame on desktop web (html.dt-device-frame)
  },
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
