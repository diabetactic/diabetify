import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.diabetactic.app',
  appName: 'diabetactic',
  webDir: 'www',
  server: {
    // Allow external HTTP/HTTPS requests on Android
    cleartext: true,
    androidScheme: 'https',
    // Allow all origins for API requests
    allowNavigation: ['*'],
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
