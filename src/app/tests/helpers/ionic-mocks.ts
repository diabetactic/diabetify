/**
 * Ionic Mocks for Testing
 *
 * Provides mock implementations of Ionic services and controllers for unit/integration tests.
 * These mocks prevent actual Ionic functionality from being called during tests.
 */

/**
 * Mock Ionic Platform service
 */
export interface MockIonicPlatform {
  ready: jasmine.Spy;
  is: jasmine.Spy;
  pause: jasmine.SpyObj<{ subscribe: jasmine.Spy }>;
  resume: jasmine.SpyObj<{ subscribe: jasmine.Spy }>;
  resize: jasmine.SpyObj<{ subscribe: jasmine.Spy }>;
  backButton: jasmine.SpyObj<{ subscribeWithPriority: jasmine.Spy }>;
  keyboardDidShow: jasmine.SpyObj<{ subscribe: jasmine.Spy }>;
  keyboardDidHide: jasmine.SpyObj<{ subscribe: jasmine.Spy }>;
  width: jasmine.Spy;
  height: jasmine.Spy;
  isLandscape: jasmine.Spy;
  isPortrait: jasmine.Spy;
  isRTL: boolean;
  url: jasmine.Spy;
  testUserAgent: jasmine.Spy;
}

/**
 * Mock NavController
 */
export interface MockNavController {
  navigateForward: jasmine.Spy;
  navigateBack: jasmine.Spy;
  navigateRoot: jasmine.Spy;
  back: jasmine.Spy;
  pop: jasmine.Spy;
  setDirection: jasmine.Spy;
  setTopOutlet: jasmine.Spy;
  consumeTransition: jasmine.Spy;
}

/**
 * Mock Modal Controller
 */
export interface MockModalController {
  create: jasmine.Spy;
  dismiss: jasmine.Spy;
  getTop: jasmine.Spy;
}

/**
 * Mock Alert Controller
 */
export interface MockAlertController {
  create: jasmine.Spy;
  dismiss: jasmine.Spy;
  getTop: jasmine.Spy;
}

/**
 * Mock Loading Controller
 */
export interface MockLoadingController {
  create: jasmine.Spy;
  dismiss: jasmine.Spy;
  getTop: jasmine.Spy;
}

/**
 * Mock Toast Controller
 */
export interface MockToastController {
  create: jasmine.Spy;
  dismiss: jasmine.Spy;
  getTop: jasmine.Spy;
}

/**
 * Mock Action Sheet Controller
 */
export interface MockActionSheetController {
  create: jasmine.Spy;
  dismiss: jasmine.Spy;
  getTop: jasmine.Spy;
}

/**
 * Mock Popover Controller
 */
export interface MockPopoverController {
  create: jasmine.Spy;
  dismiss: jasmine.Spy;
  getTop: jasmine.Spy;
}

/**
 * Mock Menu Controller
 */
export interface MockMenuController {
  open: jasmine.Spy;
  close: jasmine.Spy;
  toggle: jasmine.Spy;
  enable: jasmine.Spy;
  isEnabled: jasmine.Spy;
  isOpen: jasmine.Spy;
  get: jasmine.Spy;
  getMenus: jasmine.Spy;
  getOpen: jasmine.Spy;
  registerAnimation: jasmine.Spy;
}

/**
 * All Ionic mocks combined
 */
export interface IonicMocksResult {
  platform: MockIonicPlatform;
  navController: MockNavController;
  modalController: MockModalController;
  alertController: MockAlertController;
  loadingController: MockLoadingController;
  toastController: MockToastController;
  actionSheetController: MockActionSheetController;
  popoverController: MockPopoverController;
  menuController: MockMenuController;
  reset: () => void;
}

/**
 * Create a mock Ionic Platform
 */
export function createMockIonicPlatform(
  platformType: 'android' | 'ios' | 'web' = 'web'
): MockIonicPlatform {
  const createObservableSpyObj = () => ({
    subscribe: jasmine.createSpy('subscribe').and.returnValue({ unsubscribe: () => {} }),
  });

  return {
    ready: jasmine.createSpy('Platform.ready').and.returnValue(Promise.resolve()),
    is: jasmine.createSpy('Platform.is').and.callFake((query: string) => {
      const platforms: Record<string, string[]> = {
        android: ['android', 'mobile', 'hybrid', 'capacitor'],
        ios: ['ios', 'mobile', 'hybrid', 'capacitor', 'iphone', 'ipad'],
        web: ['desktop', 'mobileweb'],
      };
      return platforms[platformType]?.includes(query) ?? false;
    }),
    pause: createObservableSpyObj() as any,
    resume: createObservableSpyObj() as any,
    resize: createObservableSpyObj() as any,
    backButton: {
      subscribeWithPriority: jasmine
        .createSpy('backButton.subscribeWithPriority')
        .and.returnValue({ unsubscribe: () => {} }),
    } as any,
    keyboardDidShow: createObservableSpyObj() as any,
    keyboardDidHide: createObservableSpyObj() as any,
    width: jasmine.createSpy('Platform.width').and.returnValue(375),
    height: jasmine.createSpy('Platform.height').and.returnValue(812),
    isLandscape: jasmine.createSpy('Platform.isLandscape').and.returnValue(false),
    isPortrait: jasmine.createSpy('Platform.isPortrait').and.returnValue(true),
    isRTL: false,
    url: jasmine.createSpy('Platform.url').and.returnValue('http://localhost'),
    testUserAgent: jasmine.createSpy('Platform.testUserAgent').and.returnValue(false),
  };
}

/**
 * Create a mock NavController
 */
export function createMockNavController(): MockNavController {
  return {
    navigateForward: jasmine.createSpy('NavController.navigateForward').and.returnValue(true),
    navigateBack: jasmine.createSpy('NavController.navigateBack').and.returnValue(true),
    navigateRoot: jasmine.createSpy('NavController.navigateRoot').and.returnValue(true),
    back: jasmine.createSpy('NavController.back'),
    pop: jasmine.createSpy('NavController.pop').and.returnValue(Promise.resolve(true)),
    setDirection: jasmine.createSpy('NavController.setDirection'),
    setTopOutlet: jasmine.createSpy('NavController.setTopOutlet'),
    consumeTransition: jasmine
      .createSpy('NavController.consumeTransition')
      .and.returnValue({ direction: 'forward', animation: undefined }),
  };
}

/**
 * Create a mock overlay element (modal, alert, loading, toast, etc.)
 */
function createMockOverlayElement() {
  return {
    present: jasmine.createSpy('overlay.present').and.returnValue(Promise.resolve()),
    dismiss: jasmine.createSpy('overlay.dismiss').and.returnValue(Promise.resolve(true)),
    onDidDismiss: jasmine
      .createSpy('overlay.onDidDismiss')
      .and.returnValue(Promise.resolve({ data: undefined, role: undefined })),
    onWillDismiss: jasmine
      .createSpy('overlay.onWillDismiss')
      .and.returnValue(Promise.resolve({ data: undefined, role: undefined })),
  };
}

/**
 * Create a mock Modal Controller
 */
export function createMockModalController(): MockModalController {
  return {
    create: jasmine
      .createSpy('ModalController.create')
      .and.returnValue(Promise.resolve(createMockOverlayElement())),
    dismiss: jasmine.createSpy('ModalController.dismiss').and.returnValue(Promise.resolve(true)),
    getTop: jasmine.createSpy('ModalController.getTop').and.returnValue(Promise.resolve(null)),
  };
}

/**
 * Create a mock Alert Controller
 */
export function createMockAlertController(): MockAlertController {
  return {
    create: jasmine
      .createSpy('AlertController.create')
      .and.returnValue(Promise.resolve(createMockOverlayElement())),
    dismiss: jasmine.createSpy('AlertController.dismiss').and.returnValue(Promise.resolve(true)),
    getTop: jasmine.createSpy('AlertController.getTop').and.returnValue(Promise.resolve(null)),
  };
}

/**
 * Create a mock Loading Controller
 */
export function createMockLoadingController(): MockLoadingController {
  return {
    create: jasmine
      .createSpy('LoadingController.create')
      .and.returnValue(Promise.resolve(createMockOverlayElement())),
    dismiss: jasmine.createSpy('LoadingController.dismiss').and.returnValue(Promise.resolve(true)),
    getTop: jasmine.createSpy('LoadingController.getTop').and.returnValue(Promise.resolve(null)),
  };
}

/**
 * Create a mock Toast Controller
 */
export function createMockToastController(): MockToastController {
  return {
    create: jasmine
      .createSpy('ToastController.create')
      .and.returnValue(Promise.resolve(createMockOverlayElement())),
    dismiss: jasmine.createSpy('ToastController.dismiss').and.returnValue(Promise.resolve(true)),
    getTop: jasmine.createSpy('ToastController.getTop').and.returnValue(Promise.resolve(null)),
  };
}

/**
 * Create a mock Action Sheet Controller
 */
export function createMockActionSheetController(): MockActionSheetController {
  return {
    create: jasmine
      .createSpy('ActionSheetController.create')
      .and.returnValue(Promise.resolve(createMockOverlayElement())),
    dismiss: jasmine
      .createSpy('ActionSheetController.dismiss')
      .and.returnValue(Promise.resolve(true)),
    getTop: jasmine
      .createSpy('ActionSheetController.getTop')
      .and.returnValue(Promise.resolve(null)),
  };
}

/**
 * Create a mock Popover Controller
 */
export function createMockPopoverController(): MockPopoverController {
  return {
    create: jasmine
      .createSpy('PopoverController.create')
      .and.returnValue(Promise.resolve(createMockOverlayElement())),
    dismiss: jasmine.createSpy('PopoverController.dismiss').and.returnValue(Promise.resolve(true)),
    getTop: jasmine.createSpy('PopoverController.getTop').and.returnValue(Promise.resolve(null)),
  };
}

/**
 * Create a mock Menu Controller
 */
export function createMockMenuController(): MockMenuController {
  return {
    open: jasmine.createSpy('MenuController.open').and.returnValue(Promise.resolve(true)),
    close: jasmine.createSpy('MenuController.close').and.returnValue(Promise.resolve(true)),
    toggle: jasmine.createSpy('MenuController.toggle').and.returnValue(Promise.resolve(true)),
    enable: jasmine.createSpy('MenuController.enable').and.returnValue(Promise.resolve(null)),
    isEnabled: jasmine.createSpy('MenuController.isEnabled').and.returnValue(Promise.resolve(true)),
    isOpen: jasmine.createSpy('MenuController.isOpen').and.returnValue(Promise.resolve(false)),
    get: jasmine.createSpy('MenuController.get').and.returnValue(Promise.resolve(null)),
    getMenus: jasmine.createSpy('MenuController.getMenus').and.returnValue(Promise.resolve([])),
    getOpen: jasmine.createSpy('MenuController.getOpen').and.returnValue(Promise.resolve(null)),
    registerAnimation: jasmine.createSpy('MenuController.registerAnimation'),
  };
}

/**
 * Create all Ionic mocks at once
 *
 * @param platformType - The platform to mock ('android', 'ios', 'web')
 * @returns Object containing all mock instances and reset function
 *
 * @example
 * const mocks = createAllIonicMocks('android');
 * // Use in TestBed:
 * TestBed.configureTestingModule({
 *   providers: [
 *     { provide: Platform, useValue: mocks.platform },
 *     { provide: NavController, useValue: mocks.navController }
 *   ]
 * });
 */
export function createAllIonicMocks(
  platformType: 'android' | 'ios' | 'web' = 'web'
): IonicMocksResult {
  const platform = createMockIonicPlatform(platformType);
  const navController = createMockNavController();
  const modalController = createMockModalController();
  const alertController = createMockAlertController();
  const loadingController = createMockLoadingController();
  const toastController = createMockToastController();
  const actionSheetController = createMockActionSheetController();
  const popoverController = createMockPopoverController();
  const menuController = createMockMenuController();

  const reset = () => {
    // Reset all spies
    Object.values(platform).forEach(spy => {
      if (spy && typeof spy === 'object' && 'calls' in spy) {
        (spy as jasmine.Spy).calls.reset();
      }
    });
    Object.values(navController).forEach(spy => {
      if (spy && typeof spy === 'object' && 'calls' in spy) {
        (spy as jasmine.Spy).calls.reset();
      }
    });
    Object.values(modalController).forEach(spy => (spy as jasmine.Spy).calls.reset());
    Object.values(alertController).forEach(spy => (spy as jasmine.Spy).calls.reset());
    Object.values(loadingController).forEach(spy => (spy as jasmine.Spy).calls.reset());
    Object.values(toastController).forEach(spy => (spy as jasmine.Spy).calls.reset());
    Object.values(actionSheetController).forEach(spy => (spy as jasmine.Spy).calls.reset());
    Object.values(popoverController).forEach(spy => (spy as jasmine.Spy).calls.reset());
    Object.values(menuController).forEach(spy => (spy as jasmine.Spy).calls.reset());
  };

  return {
    platform,
    navController,
    modalController,
    alertController,
    loadingController,
    toastController,
    actionSheetController,
    popoverController,
    menuController,
    reset,
  };
}
