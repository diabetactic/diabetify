/**
 * Polyfills for Vitest/jsdom environment
 *
 * This file MUST run before zone.js and any other setup files.
 * It polyfills browser APIs that jsdom doesn't support but Ionic Core requires.
 */

// Polyfill adoptedStyleSheets (required by Ionic Core)
// jsdom doesn't support constructable stylesheets
if (typeof document !== 'undefined') {
  if (!document.adoptedStyleSheets) {
    Object.defineProperty(document, 'adoptedStyleSheets', {
      value: [],
      writable: true,
      configurable: true,
    });
  }
}

// Polyfill CSSStyleSheet constructor methods
if (typeof CSSStyleSheet !== 'undefined') {
  if (!CSSStyleSheet.prototype.replaceSync) {
    CSSStyleSheet.prototype.replaceSync = function (_text: string) {
      return this;
    };
  }
  if (!CSSStyleSheet.prototype.replace) {
    CSSStyleSheet.prototype.replace = function (_text: string) {
      return Promise.resolve(this);
    };
  }
}

// Ensure window exists and has necessary properties
if (typeof window !== 'undefined') {
  // Polyfill matchMedia if not present
  if (!window.matchMedia) {
    window.matchMedia = function (query: string): MediaQueryList {
      return {
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => true,
      } as MediaQueryList;
    };
  }

  // Polyfill ResizeObserver if not present
  if (!window.ResizeObserver) {
    (window as unknown as { ResizeObserver: typeof ResizeObserver }).ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver;
  }

  // Polyfill IntersectionObserver if not present
  if (!window.IntersectionObserver) {
    (
      window as unknown as { IntersectionObserver: typeof IntersectionObserver }
    ).IntersectionObserver = class {
      readonly root: Element | null = null;
      readonly rootMargin = '';
      readonly thresholds: ReadonlyArray<number> = [];
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return [];
      }
    } as unknown as typeof IntersectionObserver;
  }
}

// Polyfill structuredClone for IndexedDB operations
if (typeof globalThis.structuredClone === 'undefined') {
  globalThis.structuredClone = <T>(obj: T): T => {
    return JSON.parse(JSON.stringify(obj));
  };
}

export {};
