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
    clientId: 'diabetify-mobile-prod',

    // Redirect URI for OAuth flow (must be registered with Tidepool)
    // For Capacitor apps, use custom URL scheme
    redirectUri: 'diabetify://oauth/callback',

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

  // Feature flags
  features: {
    offlineMode: true,
    analyticsEnabled: true,
    crashReporting: true,
  },
};
