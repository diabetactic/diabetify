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
    allowNavigation: ['*']
  },
  plugins: {
    SecureStorage: {
      // Android Keystore configuration
      sharedPreferencesName: 'io.diabetactic.secure.prefs'
    }
  }
};

export default config;
