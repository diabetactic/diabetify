/**
 * Stencil Core Mock
 *
 * This file provides a complete mock for @stencil/core and its internal modules.
 * It's used to prevent Stencil initialization errors during Vitest tests.
 *
 * Why this is needed:
 * - @ionic/core depends on @stencil/core for web components
 * - Stencil tries to initialize browser-specific features that don't exist in Node/jsdom
 * - The nested path @ionic/core/node_modules/@stencil/core bypasses normal vi.mock()
 * - Using alias resolution in vitest.config.ts redirects ALL stencil imports here
 */

// Stencil decorators (no-op in tests)
export const Component = () => () => {};
export const Prop = () => () => {};
export const State = () => () => {};
export const Watch = () => () => {};
export const Element = () => () => {};
export const Event = () => () => {};
export const Listen = () => () => {};
export const Method = () => () => {};

// Stencil JSX helpers
export const Host = () => {};
export const h = (() => {
  const createVNode = (..._args: unknown[]) => ({
    $flags$: 0,
    $tag$: null,
    $text$: null,
    $elm$: null,
    $children$: null,
    $attrs$: null,
    $key$: null,
    $name$: null,
  });
  createVNode.Fragment = null;
  return createVNode;
})();

// Build-time constants
export const Build = {
  isDev: false,
  isBrowser: true,
  isTesting: true,
  isServer: false,
};

// Runtime platform utilities (from @stencil/core/internal/client)
export const doc = typeof document !== 'undefined' ? document : {};
export const win = typeof window !== 'undefined' ? window : {};
export const plt = {};
export const supportsShadow = false;
export const BUILD = Build;

// Stencil runtime APIs
export const getAssetPath = (path: string) => path;
export const setAssetPath = () => {};
export const getElement = () => ({});
export const forceUpdate = () => {};
export const getRenderingRef = () => null;
export const writeTask = (cb: () => void) => cb();
export const readTask = (cb: () => void) => cb();
export const getMode = () => 'md';

// Custom Elements Registry helpers
export const proxyCustomElement = (Cstr: unknown) => Cstr;
export const defineCustomElements = async () => {};

// Default export for imports like `import Stencil from '@stencil/core'`
export default {
  Component,
  Prop,
  State,
  Watch,
  Element,
  Event,
  Listen,
  Method,
  Host,
  h,
  Build,
  getAssetPath,
  setAssetPath,
  getElement,
  forceUpdate,
  getRenderingRef,
  writeTask,
  readTask,
  getMode,
  proxyCustomElement,
  defineCustomElements,
};
