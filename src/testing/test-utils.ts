/**
 * Test Utilities for Diabetactic
 *
 * Provides utilities to prevent test state pollution by:
 * 1. Resetting Angular TestBed between tests
 * 2. Clearing IndexedDB tables (using the singleton db instance)
 * 3. Clearing all Vitest mocks
 * 4. Resetting service state (BehaviorSubjects, internal state)
 */

import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { db } from '../app/core/services/database.service';

/**
 * Reset all test state between tests.
 * Call this in afterEach() hooks for comprehensive cleanup.
 *
 * @example
 * afterEach(async () => {
 *   await resetAllTestState();
 * });
 */
export async function resetAllTestState(): Promise<void> {
  // Reset Angular TestBed to force new service instances
  TestBed.resetTestingModule();

  // Clear all Vitest mocks
  vi.clearAllMocks();
  vi.restoreAllMocks();
}

/**
 * Clear all IndexedDB tables.
 * Use this when testing services that interact with the database.
 *
 * IMPORTANT: Uses the exported singleton `db` instance, not a local instance.
 * This ensures the same database instance used by services is cleared.
 *
 * @example
 * beforeEach(async () => {
 *   await clearDatabaseTables();
 * });
 */
export async function clearDatabaseTables(): Promise<void> {
  try {
    // Clear all tables using transaction to prevent PrematureCommitError
    await db.transaction('rw', [db.readings, db.appointments, db.syncQueue], async () => {
      await db.readings.clear();
      await db.appointments.clear();
      await db.syncQueue.clear();
    });
  } catch (error) {
    // Handle PrematureCommitError in fake-indexeddb or unopened database
    if ((error as Error).name === 'PrematureCommitError') {
      await db.readings.clear();
      await db.appointments.clear();
      await db.syncQueue.clear();
    } else {
      console.warn('Could not clear database tables:', error);
    }
  }
}

/**
 * Reset service internal state (BehaviorSubjects, flags, etc.)
 *
 * Use this generic function to reset any service's internal state.
 * Pass in the service instance and an object with default values.
 *
 * @example
 * afterEach(() => {
 *   resetServiceState(myService, {
 *     _profile$: new BehaviorSubject(null),
 *     isRefreshing: false
 *   });
 * });
 */
export function resetServiceState<T extends object>(
  service: T,
  defaults: Partial<{ [K in keyof T]: T[K] }>
): void {
  Object.assign(service, defaults);
}

/**
 * Reset HTTP interceptor state.
 * Interceptors often have internal state like isRefreshing and token subjects.
 *
 * @param interceptor The interceptor instance
 * @param subjectFactory Function that creates a fresh Subject/BehaviorSubject
 *
 * @example
 * beforeEach(() => {
 *   const interceptor = TestBed.inject(TidepoolInterceptor);
 *   resetInterceptorState(interceptor, () => new Subject<string | null>());
 * });
 */
export function resetInterceptorState<T extends { [key: string]: unknown }>(
  interceptor: T,
  subjectFactory: () => unknown
): void {
  // Reset common interceptor state properties
  if ('isRefreshing' in interceptor) {
    (interceptor as { isRefreshing: boolean }).isRefreshing = false;
  }

  if ('refreshTokenSubject' in interceptor) {
    (interceptor as { refreshTokenSubject: unknown }).refreshTokenSubject = subjectFactory();
  }
}

/**
 * Create a mock storage map for Capacitor Preferences/SecureStorage testing.
 * Provides spy methods for get/set/remove operations.
 *
 * @example
 * const mockStorage = createMockStorage();
 * mockStorage.set('key', 'value');
 * await mockStorage.get({ key: 'key' }); // returns { value: 'value' }
 */
export function createMockStorage(): {
  storage: Map<string, string>;
  get: ReturnType<typeof vi.fn>;
  set: ReturnType<typeof vi.fn>;
  remove: ReturnType<typeof vi.fn>;
  clear: () => void;
} {
  const storage = new Map<string, string>();

  return {
    storage,
    get: vi.fn(async (options: { key: string }) => ({
      value: storage.get(options.key) ?? null,
    })),
    set: vi.fn(async (options: { key: string; value: string }) => {
      storage.set(options.key, options.value);
    }),
    remove: vi.fn(async (options: { key: string }) => {
      storage.delete(options.key);
    }),
    clear: () => storage.clear(),
  };
}

/**
 * Wait for async operations to settle.
 * Alternative to using done() callbacks.
 *
 * @param ms Milliseconds to wait (default: 0, uses microtask)
 *
 * @example
 * await flushAsync();
 * expect(someValue).toBe(expected);
 */
export function flushAsync(ms = 0): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Helper to count observable emissions.
 * Useful for testing BehaviorSubject-based services.
 *
 * @example
 * const counter = createEmissionCounter(service.profile$);
 * await service.createProfile(input);
 * expect(counter.count).toBe(2); // initial + after create
 */
export function createEmissionCounter<T>(observable: {
  subscribe: (cb: (value: T) => void) => { unsubscribe: () => void };
}): {
  count: number;
  values: T[];
  unsubscribe: () => void;
} {
  const result = {
    count: 0,
    values: [] as T[],
    unsubscribe: () => {
      /* Placeholder inicializado como no-op; será sobrescrito con el método real de subscription.unsubscribe() */
    },
  };

  const subscription = observable.subscribe(value => {
    result.count++;
    result.values.push(value);
  });

  result.unsubscribe = () => subscription.unsubscribe();

  return result;
}
