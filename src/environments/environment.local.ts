/**
 * LOCAL MODE - Local backend (localhost)
 * Uses local API gateway running on your machine
 * Perfect for: Backend development, debugging
 */

import { Capacitor } from '@capacitor/core';

export type BackendMode = 'mock' | 'local' | 'cloud';

function getLocalBaseUrl(): string {
  if (Capacitor.isNativePlatform()) {
    // Use your PC's local IP for physical devices on the same WiFi network
    // Change this IP to match your PC's local IP address
    const PC_LOCAL_IP = '192.168.0.9';
    return `http://${PC_LOCAL_IP}:8000`;
  }
  // Web: use relative proxy path so `ng serve --proxy-config proxy.conf.local.cjs`
  // can route to the correct Docker host port (including non-default ports).
  return '/api';
}

export const environment = {
  production: false,
  backendMode: 'local' as BackendMode,

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
    devTools: true,
    showEnvBadge: false, // Show CLOUD/LOCAL/MOCK badge (set true for debugging)
    showStatusBadges: false, // Show floating demo badges (env/sync/network)
    webDeviceFrame: false, // Opt-in phone frame on desktop web (html.dt-device-frame)
  },
};
