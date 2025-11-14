// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

import { Capacitor } from '@capacitor/core';

/**
 * Get the appropriate base URL for backend services based on platform
 *
 * Platform-specific URLs:
 * - All platforms: Use Heroku production API
 *
 * Note: For local development, temporarily change this to 'http://localhost:8000'
 */
function getBaseUrl(): string {
  // IMPORTANT: Using proxy for development to bypass CORS
  // The proxy.conf.json redirects /api -> Heroku API Gateway
  if (Capacitor.isNativePlatform()) {
    // Native platforms: direct connection to Heroku (CORS not a problem)
    return 'https://diabetactic-api-gateway-37949d6f182f.herokuapp.com';
  }

  // Web development: use proxy to bypass CORS
  return '/api';
}

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
      baseUrl: getBaseUrl(), // http://localhost:8000 (web/iOS) or http://10.0.2.2:8000 (Android)
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
    useLocalBackend: true, // Use local backend services
    useTidepoolIntegration: false, // Disable Tidepool integration for MVP
    useTidepoolMock: true, // Use mock Tidepool adapter for testing
    devTools: true, // Enable developer tools (account state toggle, etc.)
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
