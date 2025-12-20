/**
 * Polyfills necesarios para el entorno de pruebas jsdom
 * Debe cargarse ANTES de cualquier otro import
 */

import { TextEncoder, TextDecoder } from 'util';
import * as crypto from 'crypto';

// ============================================================================
// CRITICAL: Polyfill adoptedStyleSheets ANTES de cualquier import
// Ionic Core verifica esto durante la inicialización y jsdom no lo soporta
// ============================================================================
if (typeof document !== 'undefined') {
  // Polyfill adoptedStyleSheets si no existe
  if (!document.adoptedStyleSheets) {
    Object.defineProperty(document, 'adoptedStyleSheets', {
      value: [],
      writable: true,
      configurable: true,
    });
  }

  // También hacer polyfill de CSSStyleSheet.replaceSync
  if (typeof CSSStyleSheet !== 'undefined' && !CSSStyleSheet.prototype.replaceSync) {
    CSSStyleSheet.prototype.replaceSync = function () {
      return this;
    };
    CSSStyleSheet.prototype.replace = function () {
      return Promise.resolve(this);
    };
  }
}

// Polyfill TextEncoder/TextDecoder para operaciones crypto
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as typeof global.TextDecoder;

// Polyfill structuredClone para operaciones IndexedDB (jsdom no lo tiene)
if (typeof globalThis.structuredClone === 'undefined') {
  globalThis.structuredClone = <T>(obj: T): T => {
    return JSON.parse(JSON.stringify(obj));
  };
}

// Mock crypto.subtle para tests PKCE (jsdom no lo tiene)
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

// Global test utilities
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
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

declare global {
  interface Window {
    matchMedia(query: string): MediaQueryList;
  }
}
