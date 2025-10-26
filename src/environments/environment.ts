// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

/**
 * Environment configuration for development
 */
export const environment = {
  production: false,

  // Tidepool API Configuration
  tidepool: {
    // API base URLs
    baseUrl: 'https://api.tidepool.org',
    authUrl: 'https://api.tidepool.org/auth',
    dataUrl: 'https://api.tidepool.org/data',
    uploadUrl: 'https://api.tidepool.org/data',

    // OAuth2 Configuration
    // TODO: Replace with actual client ID from Tidepool developer portal
    clientId: 'diabetify-mobile-dev',

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
    enableConsole: true,
    enableApiLogging: true,
    logLevel: 'debug' as 'debug' | 'info' | 'warn' | 'error',
  },

  // Backend Services Configuration
  backendServices: {
    // Glucose data management service
    glucoserver: {
      baseUrl: 'http://localhost:8001',
      apiPath: '/api/v1',
      requestTimeout: 30000,
    },

    // Appointment management service
    appointments: {
      baseUrl: 'http://localhost:8002',
      apiPath: '/api',
      requestTimeout: 30000,
    },

    // Authentication service
    auth: {
      baseUrl: 'http://localhost:8003',
      apiPath: '/api/auth',
      requestTimeout: 30000,
    },

    // API Gateway (if running)
    apiGateway: {
      baseUrl: 'http://localhost:8000',
      apiPath: '/api',
      requestTimeout: 30000,
    },
  },

  // Feature flags
  features: {
    offlineMode: true,
    analyticsEnabled: false, // Disable analytics in development
    crashReporting: false,
    useLocalBackend: true, // Use local backend services
    useTidepoolIntegration: true, // Keep Tidepool integration active
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
