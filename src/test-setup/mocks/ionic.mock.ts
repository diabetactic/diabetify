/**
 * Mocks de Ionic/Stencil para prevenir errores de inicialización
 * Debe cargarse ANTES de importar @ionic/angular
 */

import { vi } from 'vitest';

// ============================================================================
// Mock @stencil/core para prevenir errores de inicialización
// ============================================================================

vi.mock('@stencil/core', () => ({
  Component: vi.fn(),
  Prop: vi.fn(),
  State: vi.fn(),
  Watch: vi.fn(),
  Element: vi.fn(),
  Event: vi.fn(),
  Listen: vi.fn(),
  Method: vi.fn(),
  Host: vi.fn(),
  h: vi.fn(),
  Build: { isDev: false, isBrowser: true, isTesting: true },
}));

// Mock @stencil/core/internal/client para prevenir errores runtime
vi.mock('@stencil/core/internal/client', () => ({
  BUILD: { isDev: false, isBrowser: true, isTesting: true },
  doc: globalThis.document,
  win: globalThis.window,
  plt: {},
  supportsShadow: false,
  h: vi.fn(),
  createEvent: vi.fn(() => ({ emit: vi.fn() })),
  forceUpdate: vi.fn(),
  getRenderingRef: vi.fn(),
  registerInstance: vi.fn(),
  Host: vi.fn(),
}));

// Mock @stencil/core/internal/client/index.js (ruta real que se importa)
vi.mock('@stencil/core/internal/client/index.js', () => ({
  BUILD: { isDev: false, isBrowser: true, isTesting: true },
  doc: globalThis.document,
  win: globalThis.window,
  plt: {},
  supportsShadow: false,
  h: vi.fn(),
  createEvent: vi.fn(() => ({ emit: vi.fn() })),
  forceUpdate: vi.fn(),
  getRenderingRef: vi.fn(),
  registerInstance: vi.fn(),
  Host: vi.fn(),
}));

// ============================================================================
// Mock @ionic/core para evitar problemas de inicialización Stencil
// ============================================================================

vi.mock('@ionic/core', () => ({
  isPlatform: vi.fn().mockReturnValue(false),
  getPlatforms: vi.fn().mockReturnValue(['web']),
  getMode: vi.fn().mockReturnValue('md'),
}));

// Mock @ionic/core/components para evitar problemas ESM de Stencil
vi.mock('@ionic/core/components', async () => {
  return {
    setAssetPath: vi.fn(),
    isPlatform: vi.fn().mockReturnValue(false),
    getPlatforms: vi.fn().mockReturnValue(['web']),
    // Constantes de lifecycle requeridas por @ionic/angular
    LIFECYCLE_WILL_ENTER: 'ionViewWillEnter',
    LIFECYCLE_DID_ENTER: 'ionViewDidEnter',
    LIFECYCLE_WILL_LEAVE: 'ionViewWillLeave',
    LIFECYCLE_DID_LEAVE: 'ionViewDidLeave',
    LIFECYCLE_WILL_UNLOAD: 'ionViewWillUnload',
  };
});

// Mock @ionic/core/loader para prevenir errores de inicialización Stencil
vi.mock('@ionic/core/loader', async () => {
  return {
    defineCustomElements: vi.fn().mockResolvedValue(undefined),
    setAssetPath: vi.fn(),
    setNonce: vi.fn(),
  };
});

// Mock @ionic/core/loader/index.js specifically (ESM resolution)
vi.mock('@ionic/core/loader/index.js', async () => {
  return {
    defineCustomElements: vi.fn().mockResolvedValue(undefined),
    setAssetPath: vi.fn(),
    setNonce: vi.fn(),
  };
});

// Mock los archivos CJS específicos (nombres de archivo con hash)
// Estos son los archivos internos reales que @ionic/angular importa
vi.mock('@ionic/core/dist/cjs/index-D6Wc6v08.js', () => ({
  BUILD: { isDev: false, isBrowser: true, isTesting: true },
  doc: globalThis.document,
  win: globalThis.window,
  plt: {},
  supportsShadow: false,
}));

vi.mock('@ionic/core/dist/cjs/animation-Bt3H9L1C.js', () => ({
  createAnimation: vi.fn(() => ({
    addElement: vi.fn().mockReturnThis(),
    duration: vi.fn().mockReturnThis(),
    fromTo: vi.fn().mockReturnThis(),
    play: vi.fn().mockResolvedValue(undefined),
    onFinish: vi.fn().mockReturnThis(),
  })),
}));
