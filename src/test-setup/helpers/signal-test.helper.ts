/**
 * Signal Testing Helper for Angular 21+
 *
 * Utilities for testing Angular signals, computed signals, and effects.
 * Handles the async nature of signal updates and effect execution.
 *
 * @example
 * ```typescript
 * // Test a signal value
 * const count = signal(0);
 * count.set(5);
 * await expectSignal(count).toBe(5);
 *
 * // Test computed signals
 * const doubled = computed(() => count() * 2);
 * await expectComputed(doubled).toBe(10);
 *
 * // Test effects
 * const effectSpy = vi.fn();
 * effect(() => effectSpy(count()));
 * count.set(10);
 * await flushEffects();
 * expect(effectSpy).toHaveBeenCalledWith(10);
 * ```
 */

import { TestBed } from '@angular/core/testing';
import {
  Signal,
  WritableSignal,
  effect,
  signal,
  Injector,
  runInInjectionContext,
} from '@angular/core';
import { expect, vi } from 'vitest';

/**
 * Flush all pending effects in the current test environment.
 * Must be called after signal updates to ensure effects have executed.
 */
export async function flushEffects(): Promise<void> {
  TestBed.flushEffects();
  // Allow microtasks to complete
  await new Promise(resolve => setTimeout(resolve, 0));
}

/**
 * Update a signal and flush effects in one operation.
 * Convenience method for the common pattern of update + flush.
 *
 * @param signal - The writable signal to update
 * @param value - The new value to set
 */
export async function updateSignalAndFlush<T>(sig: WritableSignal<T>, value: T): Promise<void> {
  sig.set(value);
  await flushEffects();
}

/**
 * Update a signal using the update function and flush effects.
 *
 * @param signal - The writable signal to update
 * @param updateFn - Function that receives current value and returns new value
 */
export async function updateSignalWithFnAndFlush<T>(
  sig: WritableSignal<T>,
  updateFn: (current: T) => T
): Promise<void> {
  sig.update(updateFn);
  await flushEffects();
}

/**
 * Create a signal assertion builder for fluent testing.
 *
 * @example
 * ```typescript
 * const name = signal('John');
 * await expectSignal(name).toBe('John');
 * await expectSignal(name).not.toBe('Jane');
 * ```
 */
export function expectSignal<T>(sig: Signal<T>) {
  return {
    /**
     * Assert the signal has the expected value
     */
    async toBe(expected: T): Promise<void> {
      await flushEffects();
      expect(sig()).toBe(expected);
    },

    /**
     * Assert the signal deeply equals the expected value
     */
    async toEqual(expected: T): Promise<void> {
      await flushEffects();
      expect(sig()).toEqual(expected);
    },

    /**
     * Assert the signal value is truthy
     */
    async toBeTruthy(): Promise<void> {
      await flushEffects();
      expect(sig()).toBeTruthy();
    },

    /**
     * Assert the signal value is falsy
     */
    async toBeFalsy(): Promise<void> {
      await flushEffects();
      expect(sig()).toBeFalsy();
    },

    /**
     * Assert the signal value is null
     */
    async toBeNull(): Promise<void> {
      await flushEffects();
      expect(sig()).toBeNull();
    },

    /**
     * Assert the signal value is undefined
     */
    async toBeUndefined(): Promise<void> {
      await flushEffects();
      expect(sig()).toBeUndefined();
    },

    /**
     * Assert the signal value is defined (not null or undefined)
     */
    async toBeDefined(): Promise<void> {
      await flushEffects();
      expect(sig()).toBeDefined();
    },

    /**
     * Assert the signal value matches a custom predicate
     */
    async toSatisfy(predicate: (value: T) => boolean): Promise<void> {
      await flushEffects();
      expect(predicate(sig())).toBe(true);
    },

    /**
     * Negated assertions
     */
    not: {
      async toBe(expected: T): Promise<void> {
        await flushEffects();
        expect(sig()).not.toBe(expected);
      },

      async toEqual(expected: T): Promise<void> {
        await flushEffects();
        expect(sig()).not.toEqual(expected);
      },

      async toBeNull(): Promise<void> {
        await flushEffects();
        expect(sig()).not.toBeNull();
      },

      async toBeUndefined(): Promise<void> {
        await flushEffects();
        expect(sig()).not.toBeUndefined();
      },
    },
  };
}

/**
 * Alias for expectSignal - use for computed signals for clarity
 */
export const expectComputed = expectSignal;

/**
 * Create a spy that tracks signal value changes.
 * Useful for testing that a signal updates correctly over time.
 *
 * @example
 * ```typescript
 * const count = signal(0);
 * const tracker = createSignalTracker(count);
 *
 * count.set(1);
 * count.set(2);
 * count.set(3);
 * await flushEffects();
 *
 * expect(tracker.values).toEqual([0, 1, 2, 3]);
 * expect(tracker.callCount).toBe(4);
 * ```
 */
export function createSignalTracker<T>(sig: Signal<T>) {
  const values: T[] = [];
  const spy = vi.fn((value: T) => values.push(value));
  const injector = TestBed.inject(Injector);

  // Create an effect to track changes (within injection context)
  const effectRef = runInInjectionContext(injector, () =>
    effect(() => {
      spy(sig());
    })
  );

  return {
    /**
     * All values the signal has had (including initial)
     */
    get values(): T[] {
      return [...values];
    },

    /**
     * Number of times the signal value was read/changed
     */
    get callCount(): number {
      return spy.mock.calls.length;
    },

    /**
     * The last value the signal had
     */
    get lastValue(): T | undefined {
      return values[values.length - 1];
    },

    /**
     * The underlying spy function
     */
    spy,

    /**
     * Clean up the effect (call in afterEach)
     */
    destroy(): void {
      effectRef.destroy();
    },

    /**
     * Reset tracking data
     */
    reset(): void {
      values.length = 0;
      spy.mockClear();
    },
  };
}

/**
 * Test that an effect runs with expected values.
 *
 * @example
 * ```typescript
 * const count = signal(0);
 *
 * const result = await testEffect(
 *   () => count() * 2,
 *   async () => {
 *     count.set(5);
 *     count.set(10);
 *   }
 * );
 *
 * expect(result.values).toEqual([0, 10, 20]);
 * ```
 */
export async function testEffect<T>(
  effectFn: () => T,
  actions: () => Promise<void> | void
): Promise<{ values: T[]; callCount: number }> {
  const values: T[] = [];
  const injector = TestBed.inject(Injector);
  const effectRef = runInInjectionContext(injector, () =>
    effect(() => {
      values.push(effectFn());
    })
  );

  try {
    await flushEffects(); // Capture initial value
    await actions();
    await flushEffects(); // Capture final values
  } finally {
    effectRef.destroy();
  }

  return {
    values,
    callCount: values.length,
  };
}

/**
 * Create a test signal with a spy attached.
 * Useful for testing components that depend on input signals.
 *
 * @example
 * ```typescript
 * const { signal: mockInput, set, update } = createTestSignal('initial');
 * component.inputValue = mockInput;
 *
 * set('updated');
 * await flushEffects();
 *
 * expect(component.derivedValue()).toBe('UPDATED');
 * ```
 */
export function createTestSignal<T>(initialValue: T) {
  const sig = signal(initialValue);
  const setSpy = vi.fn((value: T) => sig.set(value));
  const updateSpy = vi.fn((fn: (current: T) => T) => sig.update(fn));

  return {
    /**
     * The signal (read-only view for passing to components)
     */
    signal: sig.asReadonly(),

    /**
     * The writable signal (for test manipulation)
     */
    writable: sig,

    /**
     * Set the signal value (with spy tracking)
     */
    set: setSpy,

    /**
     * Update the signal value (with spy tracking)
     */
    update: updateSpy,

    /**
     * Set and flush in one operation
     */
    async setAndFlush(value: T): Promise<void> {
      setSpy(value);
      await flushEffects();
    },

    /**
     * Get current value
     */
    get value(): T {
      return sig();
    },
  };
}

/**
 * Wait for a signal to have a specific value.
 * Useful for async operations that update signals.
 *
 * @param signal - The signal to watch
 * @param predicate - Function that returns true when the expected value is reached
 * @param timeout - Maximum time to wait in milliseconds (default: 5000)
 */
export async function waitForSignal<T>(
  sig: Signal<T>,
  predicate: (value: T) => boolean,
  timeout = 5000
): Promise<T> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    await flushEffects();
    const value = sig();
    if (predicate(value)) {
      return value;
    }
    await new Promise(resolve => setTimeout(resolve, 10));
  }

  throw new Error(
    `Signal did not reach expected value within ${timeout}ms. Current value: ${JSON.stringify(sig())}`
  );
}

/**
 * Assert that a signal eventually has a value.
 *
 * @example
 * ```typescript
 * const loading = signal(true);
 * setTimeout(() => loading.set(false), 100);
 *
 * await expectSignalEventually(loading).toBe(false);
 * ```
 */
export function expectSignalEventually<T>(sig: Signal<T>, timeout = 5000) {
  return {
    async toBe(expected: T): Promise<void> {
      await waitForSignal(sig, value => value === expected, timeout);
    },

    async toEqual(expected: T): Promise<void> {
      await waitForSignal(
        sig,
        value => JSON.stringify(value) === JSON.stringify(expected),
        timeout
      );
    },

    async toBeTruthy(): Promise<void> {
      await waitForSignal(sig, value => !!value, timeout);
    },

    async toBeFalsy(): Promise<void> {
      await waitForSignal(sig, value => !value, timeout);
    },

    async toSatisfy(predicate: (value: T) => boolean): Promise<void> {
      await waitForSignal(sig, predicate, timeout);
    },
  };
}
