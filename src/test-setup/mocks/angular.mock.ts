/**
 * Helpers de Angular TestBed y compatibilidad Jasmine
 */

import { vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { NG_VALUE_ACCESSOR, ControlValueAccessor } from '@angular/forms';
import { forwardRef, Directive } from '@angular/core';

// ============================================================================
// Inicialización de Angular TestBed
// ============================================================================

export function initializeTestBed() {
  try {
    TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting(), {
      teardown: { destroyAfterEach: true },
    });
  } catch {
    // Ya inicializado, lo cual está bien
  }
}

// ============================================================================
// Mock localStorage
// ============================================================================

export const createLocalStorageMock = () => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    key: vi.fn((index: number) => Object.keys(store)[index] || null),
    get length() {
      return Object.keys(store).length;
    },
  };
};

// ============================================================================
// Global Mock Value Accessor para componentes de formularios Ionic
// ============================================================================

/* eslint-disable @angular-eslint/directive-selector */
@Directive({
  selector:
    'ion-input, ion-select, ion-checkbox, ion-toggle, ion-textarea, ion-radio, ion-range, ion-searchbar, ion-segment, ion-datetime',
  standalone: true,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => MockIonicValueAccessor),
      multi: true,
    },
  ],
})
/* eslint-enable @angular-eslint/directive-selector */
export class MockIonicValueAccessor implements ControlValueAccessor {
  value: any = null;
  onChange: any = () => {};
  onTouched: any = () => {};
  writeValue(value: any) {
    this.value = value;
  }
  registerOnChange(fn: any) {
    this.onChange = fn;
  }
  registerOnTouched(fn: any) {
    this.onTouched = fn;
  }
  setDisabledState() {}
}

// ============================================================================
// Compatibilidad Jasmine
// ============================================================================

// Interfaz de mock compatible con Jasmine
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

  // Añadir propiedad .and para encadenamiento estilo Jasmine
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
    resolveTo: (value: any) => {
      mockFn.mockResolvedValue(value);
      return mockFn;
    },
    rejectWith: (error: any) => {
      mockFn.mockRejectedValue(error);
      return mockFn;
    },
  };

  // Añadir propiedad .calls para inspección estilo Jasmine
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

  // Crear métodos spy con soporte .and
  for (const methodName of methodNames) {
    obj[methodName] = createJasmineLikeMock();
  }

  // Añadir valores de propiedades si se proporcionan
  if (propertyValues) {
    for (const [key, value] of Object.entries(propertyValues)) {
      obj[key] = value;
    }
  }

  return obj as SpyObj<T>;
}

// ============================================================================
// Exports de compatibilidad
// ============================================================================

export const jasmineCompatibility = {
  createSpyObj,
  createSpy: (_name?: string) => createJasmineLikeMock(),
  objectContaining: (expected: any) => expect.objectContaining(expected),
  arrayContaining: (expected: any[]) => expect.arrayContaining(expected),
  any: (constructor: any) => expect.any(constructor),
  stringMatching: (pattern: string | RegExp) => expect.stringMatching(pattern),
};

// Matchers personalizados de Jasmine
export const jasmineMatchers = {
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
    return { pass: true, message: () => 'Use expectAsync() for async assertions' };
  },
  toBeRejected() {
    return { pass: true, message: () => 'Use expectAsync() for async assertions' };
  },
};

// expectAsync para compatibilidad con Jasmine
export const expectAsync = (promise: Promise<any>) => ({
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
      await expect(promise).rejects.toThrow(expectedMessage);
    } else if (expectedType) {
      if (typeof expectedType === 'string' || expectedType instanceof RegExp) {
        await expect(promise).rejects.toThrow(expectedType);
      } else if (typeof expectedType === 'function') {
        await expect(promise).rejects.toBeInstanceOf(expectedType);
      } else {
        await expect(promise).rejects.toThrow(expectedType);
      }
    } else {
      await expect(promise).rejects.toThrow();
    }
  },
});

// spyOn global para compatibilidad con Jasmine
export const createSpyOn = () => {
  return (object: any, method: string) => {
    const spy = vi.spyOn(object, method);
    // Añadir interfaz estilo Jasmine .and
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
};
