import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Security: Cleartext HTTP is only allowed in development mode.
 * Production builds enforce HTTPS-only communication.
 *
 * Build modes:
 * - Development: NODE_ENV !== 'production' -> cleartext enabled (for local testing)
 * - Production: NODE_ENV === 'production' -> cleartext disabled (secure)
 *
 * To build for production:
 *   NODE_ENV=production npx cap sync
 *   NODE_ENV=production ionic build --prod && npx cap sync
 */
const isProduction = process.env['NODE_ENV'] === 'production';

const config: CapacitorConfig = {
  appId: 'io.diabetactic.app',
  appName: 'diabetactic',
  webDir: 'www/browser',
  server: {
    // SECURITY: Cleartext HTTP disabled in production to prevent man-in-the-middle attacks
    // Only enabled in development for local API testing (e.g., localhost backends)
    cleartext: !isProduction,
    androidScheme: 'https',
    // Whitelist allowed navigation targets for security
    allowNavigation: ['https://*.herokuapp.com', 'diabetactic://*'],
  },
  plugins: {
    SecureStorage: {
      // Android Keystore configuration
      sharedPreferencesName: 'io.diabetactic.secure.prefs',
    },
    CapacitorHttp: {
      // Enable auto-patching: patches window.fetch and XMLHttpRequest
      // so Angular HttpClient uses native HTTP on mobile platforms
      // This bypasses CORS and allows interceptors to work properly
      enabled: true,
    },
  },
};

export default config;
