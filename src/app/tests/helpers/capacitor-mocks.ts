/**
 * Capacitor Mocks for Testing
 *
 * Provides mock implementations of Capacitor plugins for unit/integration tests.
 * These mocks prevent actual native functionality from being called during tests.
 */

/**
 * Mock Preferences storage
 */
export interface MockPreferences {
  data: Map<string, string>;
  get: jasmine.Spy;
  set: jasmine.Spy;
  remove: jasmine.Spy;
  clear: jasmine.Spy;
  keys: jasmine.Spy;
}

/**
 * Mock Capacitor Platform
 */
export interface MockCapacitorPlatform {
  getPlatform: jasmine.Spy;
  isNativePlatform: jasmine.Spy;
  isPluginAvailable: jasmine.Spy;
}

/**
 * Result from setupCapacitorMocks
 */
export interface CapacitorMocksResult {
  preferences: MockPreferences;
  platform: MockCapacitorPlatform;
  reset: () => void;
}

/**
 * Setup Capacitor mocks for testing
 *
 * @param platformType - The platform to mock ('android', 'ios', 'web')
 * @returns Object containing all mock instances and reset function
 *
 * @example
 * const mocks = setupCapacitorMocks('android');
 * // Later in test:
 * expect(mocks.platform.getPlatform).toHaveBeenCalled();
 * // Reset state between tests:
 * mocks.reset();
 */
export function setupCapacitorMocks(
  platformType: 'android' | 'ios' | 'web' = 'web'
): CapacitorMocksResult {
  // Create mock Preferences storage
  const preferencesData = new Map<string, string>();

  const preferences: MockPreferences = {
    data: preferencesData,
    get: jasmine.createSpy('Preferences.get').and.callFake(async ({ key }: { key: string }) => {
      return { value: preferencesData.get(key) ?? null };
    }),
    set: jasmine
      .createSpy('Preferences.set')
      .and.callFake(async ({ key, value }: { key: string; value: string }) => {
        preferencesData.set(key, value);
      }),
    remove: jasmine
      .createSpy('Preferences.remove')
      .and.callFake(async ({ key }: { key: string }) => {
        preferencesData.delete(key);
      }),
    clear: jasmine.createSpy('Preferences.clear').and.callFake(async () => {
      preferencesData.clear();
    }),
    keys: jasmine.createSpy('Preferences.keys').and.callFake(async () => {
      return { keys: Array.from(preferencesData.keys()) };
    }),
  };

  // Create mock Capacitor platform
  const isNative = platformType !== 'web';
  const platform: MockCapacitorPlatform = {
    getPlatform: jasmine.createSpy('Capacitor.getPlatform').and.returnValue(platformType),
    isNativePlatform: jasmine.createSpy('Capacitor.isNativePlatform').and.returnValue(isNative),
    isPluginAvailable: jasmine
      .createSpy('Capacitor.isPluginAvailable')
      .and.callFake((pluginName: string) => {
        // Common plugins that are "available" in tests
        const availablePlugins = ['Preferences', 'App', 'StatusBar', 'SplashScreen', 'Keyboard'];
        return availablePlugins.includes(pluginName);
      }),
  };

  // Install mocks on global/window
  const Capacitor = {
    getPlatform: platform.getPlatform,
    isNativePlatform: platform.isNativePlatform,
    isPluginAvailable: platform.isPluginAvailable,
    Plugins: {
      Preferences: preferences,
    },
  };

  // Install on window for compatibility
  (window as any).Capacitor = Capacitor;

  // Mock the @capacitor/preferences module
  const CapacitorPreferences = {
    Preferences: {
      get: preferences.get,
      set: preferences.set,
      remove: preferences.remove,
      clear: preferences.clear,
      keys: preferences.keys,
    },
  };
  (window as any).CapacitorPreferences = CapacitorPreferences;

  // Reset function to clear state between tests
  const reset = () => {
    preferencesData.clear();
    preferences.get.calls.reset();
    preferences.set.calls.reset();
    preferences.remove.calls.reset();
    preferences.clear.calls.reset();
    preferences.keys.calls.reset();
    platform.getPlatform.calls.reset();
    platform.isNativePlatform.calls.reset();
    platform.isPluginAvailable.calls.reset();
  };

  return {
    preferences,
    platform,
    reset,
  };
}

/**
 * Create a mock for a specific Capacitor plugin
 *
 * @param pluginName - Name of the plugin to mock
 * @param methods - Object with method names as keys and mock implementations as values
 * @returns The mock plugin object
 */
export function createCapacitorPluginMock<T extends Record<string, any>>(
  pluginName: string,
  methods: { [K in keyof T]: T[K] }
): T {
  const mockPlugin = {} as T;

  for (const [methodName, implementation] of Object.entries(methods)) {
    (mockPlugin as any)[methodName] = jasmine
      .createSpy(`${pluginName}.${methodName}`)
      .and.callFake(implementation);
  }

  // Register in Capacitor.Plugins
  if ((window as any).Capacitor?.Plugins) {
    (window as any).Capacitor.Plugins[pluginName] = mockPlugin;
  }

  return mockPlugin;
}

/**
 * Common Capacitor plugin mocks
 */
export const CommonCapacitorMocks = {
  /**
   * Mock App plugin
   */
  createAppMock() {
    return createCapacitorPluginMock('App', {
      addListener: async () => ({ remove: async () => {} }),
      removeAllListeners: async () => {},
      getState: async () => ({ isActive: true }),
      getLaunchUrl: async () => ({ url: null }),
      minimizeApp: async () => {},
      exitApp: async () => {},
    });
  },

  /**
   * Mock StatusBar plugin
   */
  createStatusBarMock() {
    return createCapacitorPluginMock('StatusBar', {
      setStyle: async () => {},
      setBackgroundColor: async () => {},
      show: async () => {},
      hide: async () => {},
      getInfo: async () => ({ visible: true, style: 'DEFAULT' }),
      setOverlaysWebView: async () => {},
    });
  },

  /**
   * Mock SplashScreen plugin
   */
  createSplashScreenMock() {
    return createCapacitorPluginMock('SplashScreen', {
      show: async () => {},
      hide: async () => {},
    });
  },

  /**
   * Mock Keyboard plugin
   */
  createKeyboardMock() {
    return createCapacitorPluginMock('Keyboard', {
      show: async () => {},
      hide: async () => {},
      setAccessoryBarVisible: async () => {},
      setScroll: async () => {},
      setStyle: async () => {},
      setResizeMode: async () => {},
      getResizeMode: async () => ({ mode: 'native' }),
      addListener: async () => ({ remove: async () => {} }),
      removeAllListeners: async () => {},
    });
  },
};
