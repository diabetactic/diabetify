/**
 * Ionic Core Mock
 *
 * This file provides a complete mock for @ionic/core.
 * It prevents Stencil-related initialization errors during Vitest tests.
 */

// Re-export stencil mock for any stencil-related imports
export * from './stencil-core.mock';

// Ionic platform utilities
export const isPlatform = () => false;
export const getPlatforms = () => ['web'];
export const getMode = () => 'md';

// Ionic lifecycle constants (required by @ionic/angular)
export const LIFECYCLE_WILL_ENTER = 'ionViewWillEnter';
export const LIFECYCLE_DID_ENTER = 'ionViewDidEnter';
export const LIFECYCLE_WILL_LEAVE = 'ionViewWillLeave';
export const LIFECYCLE_DID_LEAVE = 'ionViewDidLeave';
export const LIFECYCLE_WILL_UNLOAD = 'ionViewWillUnload';

// Animation utilities
export const createAnimation = () => ({
  addElement: () => createAnimation(),
  addAnimation: () => createAnimation(),
  keyframes: () => createAnimation(),
  duration: () => createAnimation(),
  delay: () => createAnimation(),
  easing: () => createAnimation(),
  iterations: () => createAnimation(),
  fill: () => createAnimation(),
  direction: () => createAnimation(),
  fromTo: () => createAnimation(),
  from: () => createAnimation(),
  to: () => createAnimation(),
  play: () => Promise.resolve(),
  stop: () => {},
  destroy: () => {},
  pause: () => {},
  progressStart: () => {},
  progressStep: () => {},
  progressEnd: () => {},
  onFinish: () => createAnimation(),
  beforeAddClass: () => createAnimation(),
  beforeRemoveClass: () => createAnimation(),
  afterAddClass: () => createAnimation(),
  afterRemoveClass: () => createAnimation(),
  beforeStyles: () => createAnimation(),
  afterStyles: () => createAnimation(),
  beforeClearStyles: () => createAnimation(),
  afterClearStyles: () => createAnimation(),
});

// Gesture utilities
export const createGesture = () => ({
  enable: () => {},
  destroy: () => {},
});

// Menu utilities
export const menuController = {
  open: () => Promise.resolve(true),
  close: () => Promise.resolve(true),
  toggle: () => Promise.resolve(true),
  enable: () => Promise.resolve(true),
  isEnabled: () => Promise.resolve(true),
  isOpen: () => Promise.resolve(false),
  isAnimating: () => Promise.resolve(false),
  get: () => Promise.resolve(null),
  getMenus: () => Promise.resolve([]),
};

// Action sheet, alert, toast, etc. controller mocks
export const actionSheetController = {
  create: () => Promise.resolve({
    present: () => Promise.resolve(),
    dismiss: () => Promise.resolve(),
    onDidDismiss: () => Promise.resolve({ role: 'cancel' }),
    onWillDismiss: () => Promise.resolve({ role: 'cancel' }),
  }),
  dismiss: () => Promise.resolve(),
  getTop: () => Promise.resolve(null),
};

export const alertController = {
  create: () => Promise.resolve({
    present: () => Promise.resolve(),
    dismiss: () => Promise.resolve(),
    onDidDismiss: () => Promise.resolve({ role: 'cancel' }),
    onWillDismiss: () => Promise.resolve({ role: 'cancel' }),
  }),
  dismiss: () => Promise.resolve(),
  getTop: () => Promise.resolve(null),
};

export const loadingController = {
  create: () => Promise.resolve({
    present: () => Promise.resolve(),
    dismiss: () => Promise.resolve(),
    onDidDismiss: () => Promise.resolve(),
    onWillDismiss: () => Promise.resolve(),
  }),
  dismiss: () => Promise.resolve(),
  getTop: () => Promise.resolve(null),
};

export const modalController = {
  create: () => Promise.resolve({
    present: () => Promise.resolve(),
    dismiss: () => Promise.resolve(),
    onDidDismiss: () => Promise.resolve({ data: null, role: 'cancel' }),
    onWillDismiss: () => Promise.resolve({ data: null, role: 'cancel' }),
  }),
  dismiss: () => Promise.resolve(),
  getTop: () => Promise.resolve(null),
};

export const pickerController = {
  create: () => Promise.resolve({
    present: () => Promise.resolve(),
    dismiss: () => Promise.resolve(),
    onDidDismiss: () => Promise.resolve(),
    onWillDismiss: () => Promise.resolve(),
  }),
  dismiss: () => Promise.resolve(),
  getTop: () => Promise.resolve(null),
};

export const popoverController = {
  create: () => Promise.resolve({
    present: () => Promise.resolve(),
    dismiss: () => Promise.resolve(),
    onDidDismiss: () => Promise.resolve({ data: null, role: 'cancel' }),
    onWillDismiss: () => Promise.resolve({ data: null, role: 'cancel' }),
  }),
  dismiss: () => Promise.resolve(),
  getTop: () => Promise.resolve(null),
};

export const toastController = {
  create: () => Promise.resolve({
    present: () => Promise.resolve(),
    dismiss: () => Promise.resolve(),
    onDidDismiss: () => Promise.resolve(),
    onWillDismiss: () => Promise.resolve(),
  }),
  dismiss: () => Promise.resolve(),
  getTop: () => Promise.resolve(null),
};

// Config
export const IonicConfig = {};
export const setupIonicReact = () => {};
export const setupIonicAngular = () => {};

// Platform options
export const setPlatformOptions = () => {};

// Asset path
export const setAssetPath = () => {};
export const getAssetPath = (path: string) => path;

// Nonce for CSP
export const setNonce = () => {};

// Render utilities (from stencil)
export const render = () => {};

// Default export
export default {
  isPlatform,
  getPlatforms,
  getMode,
  LIFECYCLE_WILL_ENTER,
  LIFECYCLE_DID_ENTER,
  LIFECYCLE_WILL_LEAVE,
  LIFECYCLE_DID_LEAVE,
  LIFECYCLE_WILL_UNLOAD,
  createAnimation,
  createGesture,
  menuController,
  actionSheetController,
  alertController,
  loadingController,
  modalController,
  pickerController,
  popoverController,
  toastController,
  setAssetPath,
  getAssetPath,
  setNonce,
  render,
  setPlatformOptions,
};
