/**
 * LOCAL MODE - Local backend (localhost)
 * Uses local API gateway running on your machine
 * Perfect for: Backend development, debugging
 */

import { Capacitor } from '@capacitor/core';

export type BackendMode = 'mock' | 'local' | 'cloud';

function getLocalBaseUrl(): string {
  if (Capacitor.isNativePlatform()) {
    const platform = Capacitor.getPlatform();
    if (platform === 'android') {
      return 'http://10.0.2.2:8000'; // Android emulator
    }
    return 'http://localhost:8000'; // iOS
  }
  return 'http://localhost:8000'; // Web
}

export const environment = {
  production: false,
  backendMode: 'local' as BackendMode,

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
      baseUrl: getLocalBaseUrl(),
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
    useLocalBackend: true, // ← LOCAL BACKEND MODE
    useTidepoolIntegration: false,
    useTidepoolMock: false,
    devTools: true,
    showEnvBadge: false, // Show CLOUD/LOCAL/MOCK badge (set true for debugging)
  },
};
