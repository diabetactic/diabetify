/**
 * Capacitor Test Mocks
 *
 * Provides comprehensive mocks for Capacitor APIs in browser test environment
 * Fixes ~40% of test failures related to token storage and platform detection
 */
import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';

/**
 * Mock storage for Preferences API
 */
const mockStorage = new Map<string, string>();

/**
 * Mock Capacitor Preferences API
 * Must be called BEFORE TestBed.configureTestingModule()
 *
 * @example
 * beforeEach(() => {
 *   mockCapacitorPreferences();
 *   TestBed.configureTestingModule({...});
 * });
 */
export function mockCapacitorPreferences() {
  mockStorage.clear();

  const preferencesMock: any = {
    get: jasmine.createSpy('Preferences.get').and.callFake(async (opts: { key: string }) => {
      const value = mockStorage.get(opts.key) || null;
      return { value };
    }),

    set: jasmine
      .createSpy('Preferences.set')
      .and.callFake(async (opts: { key: string; value: string }) => {
        mockStorage.set(opts.key, opts.value);
        return Promise.resolve();
      }),

    remove: jasmine.createSpy('Preferences.remove').and.callFake(async (opts: { key: string }) => {
      mockStorage.delete(opts.key);
      return Promise.resolve();
    }),

    clear: jasmine.createSpy('Preferences.clear').and.callFake(async () => {
      mockStorage.clear();
      return Promise.resolve();
    }),

    keys: jasmine.createSpy('Preferences.keys').and.callFake(async () => {
      return { keys: Array.from(mockStorage.keys()) };
    }),

    migrate: jasmine.createSpy('Preferences.migrate').and.returnValue(Promise.resolve()),

    removeOld: jasmine.createSpy('Preferences.removeOld').and.returnValue(Promise.resolve()),
  };

  // Override the actual Preferences API
  (Object.keys(preferencesMock) as Array<keyof typeof preferencesMock>).forEach(key => {
    if (Preferences && (Preferences as any)[key]) {
      spyOn(Preferences as any, key as any).and.callFake((preferencesMock as any)[key] as any);
    }
  });

  return preferencesMock;
}

/**
 * Mock Capacitor platform detection
 * @param platform Platform to mock ('android', 'ios', 'web')
 *
 * @example
 * mockCapacitorPlatform('android'); // Makes isNativePlatform() return true
 */
export function mockCapacitorPlatform(platform: 'android' | 'ios' | 'web') {
  const isNative = platform !== 'web';

  // Mock isNativePlatform - this is the critical fix
  if (typeof Capacitor.isNativePlatform === 'function') {
    spyOn(Capacitor, 'isNativePlatform').and.returnValue(isNative);
  }

  // Mock getPlatform
  if (typeof Capacitor.getPlatform === 'function') {
    spyOn(Capacitor, 'getPlatform').and.returnValue(platform);
  }

  // Mock isPluginAvailable
  if (typeof Capacitor.isPluginAvailable === 'function') {
    spyOn(Capacitor, 'isPluginAvailable').and.returnValue(isNative);
  }

  // Mock platform property for backward compatibility
  Object.defineProperty(Capacitor, 'platform', {
    get: () => platform,
    configurable: true,
  });

  // Mock Capacitor.Plugins if needed
  if (!Capacitor.Plugins) {
    (Capacitor as any).Plugins = {};
  }
  if (isNative && !(Capacitor.Plugins as any)['Preferences']) {
    (Capacitor.Plugins as any)['Preferences'] = Preferences;
  }
}

/**
 * Reset all Capacitor mocks to default state
 */
export function resetCapacitorMocks() {
  mockStorage.clear();
  mockCapacitorPlatform('web');
}

/**
 * Complete Capacitor mock setup for tests
 * This is the main function to use in test files
 *
 * @param platform Platform to mock (default: 'web')
 * @returns Object with preferences API and platform reset function
 *
 * @example
 * describe('MyService', () => {
 *   let mocks: ReturnType<typeof setupCapacitorMocks>;
 *
 *   beforeEach(() => {
 *     mocks = setupCapacitorMocks('android');
 *     TestBed.configureTestingModule({...});
 *   });
 *
 *   it('should work on Android', async () => {
 *     // Test native platform behavior
 *     expect(Capacitor.isNativePlatform()).toBe(true);
 *   });
 *
 *   it('should work on web', async () => {
 *     mocks.resetPlatform('web');
 *     expect(Capacitor.isNativePlatform()).toBe(false);
 *   });
 * });
 */
export function setupCapacitorMocks(platform: 'android' | 'ios' | 'web' = 'web') {
  mockCapacitorPreferences();
  mockCapacitorPlatform(platform);

  return {
    preferences: Preferences,
    storage: mockStorage,
    resetPlatform: (newPlatform: 'android' | 'ios' | 'web') => {
      mockCapacitorPlatform(newPlatform);
    },
    clearStorage: () => {
      mockStorage.clear();
    },
  };
}

/**
 * Helper to set mock preference values in tests
 *
 * @example
 * setMockPreference('auth_token', 'test-token-123');
 */
export function setMockPreference(key: string, value: string) {
  mockStorage.set(key, value);
}

/**
 * Helper to get mock preference values in tests
 */
export function getMockPreference(key: string): string | null {
  return mockStorage.get(key) || null;
}

/**
 * Helper to verify preference calls in tests
 *
 * @example
 * expectPreferenceCall('set', 'auth_token', 'test-token-123');
 */
export function expectPreferenceCall(
  method: keyof typeof Preferences,
  key?: string,
  value?: string
) {
  const spy = (Preferences as any)[method] as jasmine.Spy;
  expect(spy).toHaveBeenCalled();

  if (key) {
    if (method === 'set' && value !== undefined) {
      expect(spy).toHaveBeenCalledWith({ key, value });
    } else {
      expect(spy).toHaveBeenCalledWith({ key });
    }
  }
}
