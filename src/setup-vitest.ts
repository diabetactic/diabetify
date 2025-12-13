// IMPORTANT: Set API base URL override BEFORE any other imports
// This ensures the api-base-url.ts module picks up the test URL
// when it's first imported by any test or service
(globalThis as any).__DIABETACTIC_API_BASE_URL = 'http://localhost:8000';

// Import zone.js for Angular support
import 'zone.js';
import 'zone.js/testing';

import { vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting,
} from '@angular/platform-browser-dynamic/testing';
import { TextEncoder, TextDecoder } from 'util';
import * as crypto from 'crypto';

// Initialize Angular testing environment
TestBed.initTestEnvironment(BrowserDynamicTestingModule, platformBrowserDynamicTesting(), {
  teardown: { destroyAfterEach: true },
});

// Alias Jest as vi globally for compatibility with tests that use jest.fn() directly
(global as any).jest = vi;

// Vitest compatibility layer for easier migration from Jest/Jasmine
// Provides jasmine.SpyObj and jasmine.createSpyObj with .and.returnValue() support

// Extend vi.Mock to support Jasmine's .and.returnValue() pattern
interface JasmineLikeMock<T extends (...args: any[]) => any = (...args: any[]) => any> {
  (...args: Parameters<T>): ReturnType<T>;
  mockReturnValue: (value: ReturnType<T>) => any;
  mockResolvedValue: (value: any) => any;
  mockRejectedValue: (error: any) => any;
  mockImplementation: (fn: T) => any;
  mock: {
    calls: Parameters<T>[];
    results: Array<{ value?: ReturnType<T> }>;
    invocationCallOrder: number[];
  };
  and: {
    returnValue: (value: ReturnType<T>) => JasmineLikeMock<T>;
    returnValues: (...values: ReturnType<T>[]) => JasmineLikeMock<T>;
    callFake: (fn: T) => JasmineLikeMock<T>;
    callThrough: () => JasmineLikeMock<T>;
    throwError: (error: any) => JasmineLikeMock<T>;
    resolveTo: (value: any) => JasmineLikeMock<T>;
    rejectWith: (error: any) => JasmineLikeMock<T>;
  };
  calls: {
    mostRecent: () => { args: Parameters<T>; returnValue?: ReturnType<T> };
    all: () => Array<{ args: Parameters<T>; returnValue?: ReturnType<T> }>;
    count: () => number;
    reset: () => void;
    first: () => { args: Parameters<T>; returnValue?: ReturnType<T> };
  };
}

function createJasmineLikeMock<T extends (...args: any[]) => any>(): JasmineLikeMock<T> {
  const mockFn = vi.fn() as any as JasmineLikeMock<T>;

  // Add .and property for Jasmine-like chaining
  mockFn.and = {
    returnValue: (value: any) => {
      mockFn.mockReturnValue(value);
      return mockFn;
    },
    returnValues: (...values: any[]) => {
      values.forEach(value => {
        mockFn.mockReturnValueOnce(value);
      });
      return mockFn;
    },
    callFake: (fn: T) => {
      mockFn.mockImplementation(fn);
      return mockFn;
    },
    callThrough: () => mockFn,
    throwError: (error: any) => {
      mockFn.mockImplementation(() => {
        throw error;
      });
      return mockFn;
    },
    // Jasmine async spy methods
    resolveTo: (value: any) => {
      mockFn.mockResolvedValue(value);
      return mockFn;
    },
    rejectWith: (error: any) => {
      mockFn.mockRejectedValue(error);
      return mockFn;
    },
  };

  // Add .calls property for Jasmine-like call inspection
  mockFn.calls = {
    mostRecent: () => {
      const calls = mockFn.mock.calls;
      if (calls.length === 0) {
        return { args: [] as any };
      }
      return {
        args: calls[calls.length - 1],
        returnValue: mockFn.mock.results[mockFn.mock.results.length - 1]?.value,
      };
    },
    all: () =>
      mockFn.mock.calls.map((args, index) => ({
        args,
        returnValue: mockFn.mock.results[index]?.value,
      })),
    count: () => mockFn.mock.calls.length,
    reset: () => mockFn.mockReset(),
    first: () => ({
      args: mockFn.mock.calls[0] || [],
      returnValue: mockFn.mock.results[0]?.value,
    }),
  };

  return mockFn;
}

type SpyObj<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any ? JasmineLikeMock<T[K]> : T[K];
};

function createSpyObj<T>(
  baseName: string,
  methodNames: (keyof T)[] | string[],
  propertyValues?: Partial<T>
): SpyObj<T> {
  const obj: any = {};

  // Create spy methods with .and support
  for (const methodName of methodNames) {
    obj[methodName] = createJasmineLikeMock();
  }

  // Add property values if provided
  if (propertyValues) {
    for (const [key, value] of Object.entries(propertyValues)) {
      obj[key] = value;
    }
  }

  return obj as SpyObj<T>;
}

// Make jasmine globally available for compatibility
(global as any).jasmine = {
  createSpyObj,
  createSpy: (_name?: string) => createJasmineLikeMock(),
  objectContaining: (expected: any) => expect.objectContaining(expected),
  arrayContaining: (expected: any[]) => expect.arrayContaining(expected),
  any: (constructor: any) => expect.any(constructor),
  stringMatching: (pattern: string | RegExp) => expect.stringMatching(pattern),
};

// Add Jasmine-specific expectAsync function
(global as any).expectAsync = (promise: Promise<any>) => ({
  toBeResolved: async () => {
    await expect(promise).resolves.toBeDefined();
  },
  toBeRejected: async () => {
    await expect(promise).rejects.toBeDefined();
  },
  toBeResolvedTo: async (expected: any) => {
    await expect(promise).resolves.toEqual(expected);
  },
  toBeRejectedWith: async (expected: any) => {
    await expect(promise).rejects.toEqual(expected);
  },
  toBeRejectedWithError: async (expectedType?: any, expectedMessage?: string | RegExp) => {
    if (expectedType && expectedMessage) {
      // Both type and message provided
      await expect(promise).rejects.toThrow(expectedMessage);
    } else if (expectedType) {
      // Single argument - could be a class/constructor or a string message
      if (typeof expectedType === 'string' || expectedType instanceof RegExp) {
        // It's a message string or RegExp
        await expect(promise).rejects.toThrow(expectedType);
      } else if (typeof expectedType === 'function') {
        // It's a class/constructor
        await expect(promise).rejects.toBeInstanceOf(expectedType);
      } else {
        // Unknown type, try to match
        await expect(promise).rejects.toThrow(expectedType);
      }
    } else {
      await expect(promise).rejects.toThrow();
    }
  },
});

// Add Jasmine-specific matchers to Vitest expect
expect.extend({
  toBeTrue(received: any) {
    const pass = received === true;
    return {
      pass,
      message: () => `expected ${received} ${pass ? 'not ' : ''}to be true`,
    };
  },
  toBeFalse(received: any) {
    const pass = received === false;
    return {
      pass,
      message: () => `expected ${received} ${pass ? 'not ' : ''}to be false`,
    };
  },
  toHaveBeenCalledBefore(received: any, expected: any) {
    const receivedCalls = received.mock.invocationCallOrder;
    const expectedCalls = expected.mock.invocationCallOrder;
    const pass =
      receivedCalls.length > 0 && expectedCalls.length > 0 && receivedCalls[0] < expectedCalls[0];
    return {
      pass,
      message: () => `expected first mock to have been called before second mock`,
    };
  },
  toBeResolved() {
    // This is a placeholder - use expectAsync().toBeResolved() for actual async assertions
    return { pass: true, message: () => 'Use expectAsync() for async assertions' };
  },
  toBeRejected() {
    // This is a placeholder - use expectAsync().toBeRejected() for actual async assertions
    return { pass: true, message: () => 'Use expectAsync() for async assertions' };
  },
});

// Make spyOn globally available (Jasmine uses global spyOn, Vitest uses vi.spyOn)
(global as any).spyOn = (object: any, method: string) => {
  const spy = vi.spyOn(object, method);
  // Add Jasmine-like .and interface
  (spy as any).and = {
    returnValue: (value: any) => {
      spy.mockReturnValue(value);
      return spy;
    },
    callFake: (fn: any) => {
      spy.mockImplementation(fn);
      return spy;
    },
    callThrough: () => spy,
    throwError: (error: any) => {
      spy.mockImplementation(() => {
        throw error;
      });
      return spy;
    },
    resolveTo: (value: any) => {
      spy.mockResolvedValue(value);
      return spy;
    },
    rejectWith: (error: any) => {
      spy.mockRejectedValue(error);
      return spy;
    },
  };
  (spy as any).calls = {
    mostRecent: () => ({
      args: spy.mock.calls[spy.mock.calls.length - 1] || [],
      returnValue: spy.mock.results[spy.mock.results.length - 1]?.value,
    }),
    all: () =>
      spy.mock.calls.map((args, index) => ({
        args,
        returnValue: spy.mock.results[index]?.value,
      })),
    count: () => spy.mock.calls.length,
    reset: () => spy.mockReset(),
    first: () => ({
      args: spy.mock.calls[0] || [],
      returnValue: spy.mock.results[0]?.value,
    }),
  };
  return spy;
};

// TypeScript declaration for jasmine global
declare global {
  namespace jasmine {
    // Use any for SpyObj to avoid all TypeScript strictness issues
    // The actual spy functionality is provided at runtime by our createSpyObj implementation
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    type SpyObj<T> = any;

    function createSpyObj<T = any>(
      baseName: string,
      methodNames: (keyof T)[] | string[],
      propertyValues?: Partial<T>
    ): SpyObj<T>;

    function createSpy(name?: string): any;

    function objectContaining(expected: any): any;
    function arrayContaining(expected: any[]): any;
    function any(constructor: any): any;
    function stringMatching(pattern: string | RegExp): any;
  }

  // Global spyOn function (Jasmine compatibility)
  function spyOn<T extends object, M extends keyof T>(
    object: T,
    method: M
  ): any & {
    and: {
      returnValue: (value: any) => any;
      callFake: (fn: any) => any;
      callThrough: () => any;
      throwError: (error: any) => any;
      resolveTo: (value: any) => any;
      rejectWith: (error: any) => any;
    };
    calls: {
      mostRecent: () => { args: any[]; returnValue?: any };
      all: () => Array<{ args: any[]; returnValue?: any }>;
      count: () => number;
      reset: () => void;
      first: () => { args: any[]; returnValue?: any };
    };
  };

  // Jasmine expectAsync compatibility
  function expectAsync(promise: Promise<any>): {
    toBeResolved: () => Promise<void>;
    toBeRejected: () => Promise<void>;
    toBeResolvedTo: (expected: any) => Promise<void>;
    toBeRejectedWith: (expected: any) => Promise<void>;
    toBeRejectedWithError: (expectedType?: any, expectedMessage?: string | RegExp) => Promise<void>;
  };

  interface Window {
    matchMedia(query: string): MediaQueryList;
  }

  // Jasmine DoneFn type alias for async tests
  type DoneFn = () => void;
}

// Extend Vitest matchers with Jasmine-specific ones
interface CustomMatchers<R = unknown> {
  toBeTrue(): R;
  toBeFalse(): R;
  toHaveBeenCalledBefore(expected: any): R;
}

declare module 'vitest' {
  interface Assertion<T = any> extends CustomMatchers<T> {}
  interface AsymmetricMatchersContaining extends CustomMatchers {}
}

// Polyfill TextEncoder/TextDecoder for crypto operations
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as typeof global.TextDecoder;

// Polyfill structuredClone for IndexedDB operations (jsdom doesn't have it)
if (typeof globalThis.structuredClone === 'undefined') {
  globalThis.structuredClone = <T>(obj: T): T => {
    return JSON.parse(JSON.stringify(obj));
  };
}

// Mock crypto.subtle for PKCE tests (jsdom doesn't have it)
Object.defineProperty(global, 'crypto', {
  value: {
    getRandomValues: (arr: Uint8Array) => crypto.randomFillSync(arr),
    subtle: {
      digest: async (algorithm: string, data: ArrayBuffer) => {
        const hash = crypto.createHash('sha256');
        hash.update(Buffer.from(data));
        return hash.digest().buffer;
      },
    },
  },
});

// Mock Capacitor plugins
vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: vi.fn().mockResolvedValue({ value: null }),
    set: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
    clear: vi.fn().mockResolvedValue(undefined),
    keys: vi.fn().mockResolvedValue({ keys: [] }),
  },
}));

vi.mock('@capacitor/device', () => ({
  Device: {
    getInfo: vi.fn().mockResolvedValue({
      platform: 'web',
      operatingSystem: 'unknown',
      osVersion: 'unknown',
      model: 'unknown',
      manufacturer: 'unknown',
      isVirtual: false,
      webViewVersion: 'unknown',
    }),
    getId: vi.fn().mockResolvedValue({ identifier: 'test-device-id' }),
    getBatteryInfo: vi.fn().mockResolvedValue({ batteryLevel: 1, isCharging: false }),
    getLanguageCode: vi.fn().mockResolvedValue({ value: 'en' }),
  },
}));

vi.mock('@capacitor/network', () => ({
  Network: {
    getStatus: vi.fn().mockResolvedValue({ connected: true, connectionType: 'wifi' }),
    addListener: vi.fn().mockResolvedValue({ remove: vi.fn() }),
  },
}));

vi.mock('@capacitor/keyboard', () => ({
  Keyboard: {
    addListener: vi.fn().mockResolvedValue({ remove: vi.fn() }),
    hide: vi.fn().mockResolvedValue(undefined),
    show: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@capacitor/haptics', () => ({
  Haptics: {
    impact: vi.fn().mockResolvedValue(undefined),
    notification: vi.fn().mockResolvedValue(undefined),
    vibrate: vi.fn().mockResolvedValue(undefined),
    selectionChanged: vi.fn().mockResolvedValue(undefined),
  },
  ImpactStyle: {
    Light: 'LIGHT',
    Medium: 'MEDIUM',
    Heavy: 'HEAVY',
  },
  NotificationType: {
    Success: 'SUCCESS',
    Warning: 'WARNING',
    Error: 'ERROR',
  },
}));

vi.mock('@capacitor/status-bar', () => ({
  StatusBar: {
    setStyle: vi.fn().mockResolvedValue(undefined),
    setBackgroundColor: vi.fn().mockResolvedValue(undefined),
    show: vi.fn().mockResolvedValue(undefined),
    hide: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@capacitor/splash-screen', () => ({
  SplashScreen: {
    show: vi.fn().mockResolvedValue(undefined),
    hide: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@capacitor/browser', () => ({
  Browser: {
    open: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    addListener: vi.fn().mockResolvedValue({ remove: vi.fn() }),
  },
}));

vi.mock('@aparajita/capacitor-secure-storage', () => ({
  SecureStorage: {
    get: vi.fn().mockResolvedValue({ value: null }),
    set: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
    clear: vi.fn().mockResolvedValue(undefined),
    keys: vi.fn().mockResolvedValue({ keys: [] }),
  },
}));

vi.mock('@capacitor/local-notifications', () => ({
  LocalNotifications: {
    requestPermissions: vi.fn().mockResolvedValue({ display: 'granted' }),
    checkPermissions: vi.fn().mockResolvedValue({ display: 'granted' }),
    schedule: vi.fn().mockResolvedValue({ notifications: [] }),
    cancel: vi.fn().mockResolvedValue(undefined),
    getPending: vi.fn().mockResolvedValue({ notifications: [] }),
    addListener: vi.fn().mockResolvedValue({ remove: vi.fn() }),
  },
}));

// Mock @capawesome-team/capacitor-biometrics (premium plugin not in public npm)
vi.mock('@capawesome-team/capacitor-biometrics', () => ({
  BiometricAuth: {
    isAvailable: vi.fn().mockResolvedValue({ isAvailable: false, biometryType: 'NONE' }),
    authenticate: vi.fn().mockResolvedValue({ success: false }),
  },
}));

// Mock @ionic/core/components to avoid Stencil ESM issues
vi.mock('@ionic/core/components', () => ({
  setAssetPath: vi.fn(),
  isPlatform: vi.fn().mockReturnValue(false),
  getPlatforms: vi.fn().mockReturnValue(['web']),
}));

// Mock IndexedDB for Dexie
import 'fake-indexeddb/auto';

// Global test utilities
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  readonly root: Element | null = null;
  readonly rootMargin: string = '';
  readonly thresholds: ReadonlyArray<number> = [];

  constructor() {}
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
};

// Suppress console warnings during tests (optional - comment out to debug)
const originalConsoleWarn = console.warn;
console.warn = (...args: unknown[]) => {
  // Filter out known noisy warnings
  const message = args[0]?.toString() || '';
  if (
    message.includes('NG0') || // Angular warnings
    message.includes('Ionic') ||
    message.includes('deprecated')
  ) {
    return;
  }
  originalConsoleWarn.apply(console, args);
};
