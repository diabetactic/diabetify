import { Capacitor } from '@capacitor/core';

/**
 * Get the appropriate base URL for backend services based on platform
 *
 * Platform-specific URLs:
 * - Android: Use production API URL (native platform detection)
 * - iOS: Use production API URL
 * - Web: Use production API URL
 *
 * Note: In production, all platforms use HTTPS API endpoint
 */
function getBaseUrl(): string {
  // In production, always use the production API URL
  // Platform detection is maintained for consistency with dev environment
  return 'https://api.diabetactic.com';
}

/**
 * Environment configuration for production
 */
export const environment = {
  production: true,

  // Tidepool API Configuration
  tidepool: {
    // API base URLs
    baseUrl: 'https://api.tidepool.org',
    authUrl: 'https://api.tidepool.org/auth',
    dataUrl: 'https://api.tidepool.org/data',
    uploadUrl: 'https://api.tidepool.org/data',

    // OAuth2 Configuration
    // TODO: Replace with actual production client ID from Tidepool developer portal
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
      baseUrl: '', // Disabled by default after removing xDrip/glucoserver integration
      apiPath: '',
      requestTimeout: 30000,
    },

    // Appointment management service
    appointments: {
      baseUrl: getBaseUrl(),
      apiPath: '/appointments',
      requestTimeout: 30000,
    },

    // Authentication service
    auth: {
      baseUrl: getBaseUrl(),
      apiPath: '',
      requestTimeout: 30000,
    },

    // API Gateway
    apiGateway: {
      baseUrl: getBaseUrl(),
      apiPath: '',
      requestTimeout: 30000,
    },
  },

  // Feature flags
  features: {
    offlineMode: true,
    analyticsEnabled: true,
    crashReporting: true,
    useLocalBackend: false, // Use production backend services
    useTidepoolIntegration: true, // Enable Tidepool integration in production
    useTidepoolMock: false, // Use real Tidepool API in production
    devTools: false, // Disable developer tools in production
  },
};
