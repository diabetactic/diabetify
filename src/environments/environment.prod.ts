import { Capacitor } from '@capacitor/core';

export type BackendMode = 'mock' | 'local' | 'cloud';

// Production default: talk to cloud gateway.
// For staging/local builds you can temporarily set this to 'local' or 'mock'.
const PROD_BACKEND_MODE: BackendMode = 'cloud';

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

  // cloud or mock → use Heroku production API
  if (Capacitor.isNativePlatform()) {
    return 'https://diabetactic-api-gateway-37949d6f182f.herokuapp.com';
  }

  // Web: use proxy to bypass CORS (Netlify redirects /api/* to Heroku)
  return '/api';
}

/**
 * Environment configuration for production
 */
export const environment = {
  production: true,
  backendMode: PROD_BACKEND_MODE as BackendMode,

  // Tidepool API Configuration
  tidepool: {
    // API base URLs
    baseUrl: 'https://api.tidepool.org',
    authUrl: 'https://api.tidepool.org/auth',
    dataUrl: 'https://api.tidepool.org/data',
    uploadUrl: 'https://api.tidepool.org/data',

    // OAuth2 Configuration
    // Client ID for Tidepool authentication (auth-only integration)
    clientId: 'diabetactic-mobile-prod',

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
    enableConsole: false, // Disable console logs in production
    enableApiLogging: false,
    logLevel: 'error' as 'debug' | 'info' | 'warn' | 'error',
  },

  // Backend Services Configuration
  backendServices: {
    // Glucose data management service
    glucoserver: {
      baseUrl: getBaseUrl(PROD_BACKEND_MODE), // Same API gateway as auth/appointments
      apiPath: '',
      requestTimeout: 30000,
    },

    // Appointment management service
    appointments: {
      baseUrl: getBaseUrl(PROD_BACKEND_MODE),
      apiPath: '/appointments',
      requestTimeout: 30000,
    },

    // Authentication service
    auth: {
      baseUrl: getBaseUrl(PROD_BACKEND_MODE),
      apiPath: '',
      requestTimeout: 30000,
    },

    // API Gateway
    apiGateway: {
      baseUrl: getBaseUrl(PROD_BACKEND_MODE),
      apiPath: '',
      requestTimeout: 30000,
    },
  },

  // Feature flags
  features: {
    offlineMode: true,
    analyticsEnabled: true,
    crashReporting: true,
    useLocalBackend: (PROD_BACKEND_MODE as BackendMode) === 'local',
    useTidepoolIntegration: (PROD_BACKEND_MODE as BackendMode) === 'cloud',
    useTidepoolMock: (PROD_BACKEND_MODE as BackendMode) === 'mock',
    devTools: false, // Disable developer tools in production
    showEnvBadge: false, // Never show CLOUD/LOCAL/MOCK badge in production
  },
};
