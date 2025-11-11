/**
 * Ionic Component Mocks
 *
 * Provides stubs for Ionic components to avoid chunk loading issues
 * Fixes ~10% of test failures related to component loading timeouts
 */

/**
 * Mock Ionic Platform service
 * Used to detect platform capabilities
 */
export function createMockPlatform() {
  const mock = jasmine.createSpyObj(
    'Platform',
    ['is', 'ready', 'resume', 'pause', 'width', 'height', 'isPortrait', 'isLandscape'],
    {
      platforms: () => ['web'],
      isRTL: false,
    }
  );

  // Set default return values
  mock.is.and.returnValue(false);
  mock.ready.and.returnValue(Promise.resolve());
  mock.resume.and.returnValue({ subscribe: jasmine.createSpy() });
  mock.pause.and.returnValue({ subscribe: jasmine.createSpy() });
  mock.width.and.returnValue(360);
  mock.height.and.returnValue(640);
  mock.isPortrait.and.returnValue(true);
  mock.isLandscape.and.returnValue(false);

  return mock;
}

/**
 * Mock Ionic NavController
 * Used for navigation between pages
 */
export function createMockNavController() {
  const mock = jasmine.createSpyObj('NavController', [
    'navigateForward',
    'navigateBack',
    'navigateRoot',
    'pop',
    'push',
    'setDirection',
    'canGoBack',
  ]);

  // Set default return values for promises
  mock.navigateForward.and.returnValue(Promise.resolve(true));
  mock.navigateBack.and.returnValue(Promise.resolve(true));
  mock.navigateRoot.and.returnValue(Promise.resolve(true));
  mock.pop.and.returnValue(Promise.resolve(true));
  mock.push.and.returnValue(Promise.resolve(true));
  mock.setDirection.and.returnValue(mock);
  mock.canGoBack.and.returnValue(false);

  return mock;
}

/**
 * Mock Ionic ModalController
 * Used for presenting modal dialogs
 */
export function createMockModalController() {
  const mockModal = {
    present: jasmine.createSpy('present').and.returnValue(Promise.resolve()),
    dismiss: jasmine.createSpy('dismiss').and.returnValue(Promise.resolve(true)),
    onDidDismiss: jasmine
      .createSpy('onDidDismiss')
      .and.returnValue(Promise.resolve({ data: undefined, role: 'backdrop' })),
    onWillDismiss: jasmine
      .createSpy('onWillDismiss')
      .and.returnValue(Promise.resolve({ data: undefined, role: 'backdrop' })),
  };

  const mock = jasmine.createSpyObj('ModalController', ['create', 'dismiss', 'getTop']);
  mock.create.and.returnValue(Promise.resolve(mockModal));
  mock.dismiss.and.returnValue(Promise.resolve(true));
  mock.getTop.and.returnValue(Promise.resolve(mockModal));

  return mock;
}

/**
 * Mock Ionic AlertController
 * Used for alert dialogs
 */
export function createMockAlertController() {
  const mockAlert = {
    present: jasmine.createSpy('present').and.returnValue(Promise.resolve()),
    dismiss: jasmine.createSpy('dismiss').and.returnValue(Promise.resolve(true)),
    onDidDismiss: jasmine
      .createSpy('onDidDismiss')
      .and.returnValue(Promise.resolve({ data: undefined, role: 'backdrop' })),
    onWillDismiss: jasmine
      .createSpy('onWillDismiss')
      .and.returnValue(Promise.resolve({ data: undefined, role: 'backdrop' })),
  };

  const mock = jasmine.createSpyObj('AlertController', ['create', 'dismiss', 'getTop']);
  mock.create.and.returnValue(Promise.resolve(mockAlert));
  mock.dismiss.and.returnValue(Promise.resolve(true));
  mock.getTop.and.returnValue(Promise.resolve(mockAlert));

  return mock;
}

/**
 * Mock Ionic LoadingController
 * Used for loading spinners
 */
export function createMockLoadingController() {
  const mockLoading = {
    present: jasmine.createSpy('present').and.returnValue(Promise.resolve()),
    dismiss: jasmine.createSpy('dismiss').and.returnValue(Promise.resolve(true)),
    onDidDismiss: jasmine
      .createSpy('onDidDismiss')
      .and.returnValue(Promise.resolve({ data: undefined, role: undefined })),
  };

  const mock = jasmine.createSpyObj('LoadingController', ['create', 'dismiss', 'getTop']);
  mock.create.and.returnValue(Promise.resolve(mockLoading));
  mock.dismiss.and.returnValue(Promise.resolve(true));
  mock.getTop.and.returnValue(Promise.resolve(mockLoading));

  return mock;
}

/**
 * Mock Ionic ToastController
 * Used for toast notifications
 */
export function createMockToastController() {
  const mockToast = {
    present: jasmine.createSpy('present').and.returnValue(Promise.resolve()),
    dismiss: jasmine.createSpy('dismiss').and.returnValue(Promise.resolve(true)),
    onDidDismiss: jasmine
      .createSpy('onDidDismiss')
      .and.returnValue(Promise.resolve({ data: undefined, role: undefined })),
  };

  const mock = jasmine.createSpyObj('ToastController', ['create', 'dismiss', 'getTop']);
  mock.create.and.returnValue(Promise.resolve(mockToast));
  mock.dismiss.and.returnValue(Promise.resolve(true));
  mock.getTop.and.returnValue(Promise.resolve(mockToast));

  return mock;
}

/**
 * Mock Ionic ActionSheetController
 * Used for action sheets
 */
export function createMockActionSheetController() {
  const mockActionSheet = {
    present: jasmine.createSpy('present').and.returnValue(Promise.resolve()),
    dismiss: jasmine.createSpy('dismiss').and.returnValue(Promise.resolve(true)),
    onDidDismiss: jasmine
      .createSpy('onDidDismiss')
      .and.returnValue(Promise.resolve({ data: undefined, role: 'backdrop' })),
  };

  const mock = jasmine.createSpyObj('ActionSheetController', ['create', 'dismiss', 'getTop']);
  mock.create.and.returnValue(Promise.resolve(mockActionSheet));
  mock.dismiss.and.returnValue(Promise.resolve(true));
  mock.getTop.and.returnValue(Promise.resolve(mockActionSheet));

  return mock;
}

/**
 * Mock Ionic PopoverController
 * Used for popover menus
 */
export function createMockPopoverController() {
  const mockPopover = {
    present: jasmine.createSpy('present').and.returnValue(Promise.resolve()),
    dismiss: jasmine.createSpy('dismiss').and.returnValue(Promise.resolve(true)),
    onDidDismiss: jasmine
      .createSpy('onDidDismiss')
      .and.returnValue(Promise.resolve({ data: undefined, role: 'backdrop' })),
  };

  const mock = jasmine.createSpyObj('PopoverController', ['create', 'dismiss', 'getTop']);
  mock.create.and.returnValue(Promise.resolve(mockPopover));
  mock.dismiss.and.returnValue(Promise.resolve(true));
  mock.getTop.and.returnValue(Promise.resolve(mockPopover));

  return mock;
}

/**
 * Create all Ionic mocks at once
 *
 * @example
 * const ionicMocks = createAllIonicMocks();
 * TestBed.configureTestingModule({
 *   providers: [
 *     { provide: Platform, useValue: ionicMocks.platform },
 *     { provide: NavController, useValue: ionicMocks.navController },
 *     // ... etc
 *   ]
 * });
 */
export function createAllIonicMocks() {
  return {
    platform: createMockPlatform(),
    navController: createMockNavController(),
    modalController: createMockModalController(),
    alertController: createMockAlertController(),
    loadingController: createMockLoadingController(),
    toastController: createMockToastController(),
    actionSheetController: createMockActionSheetController(),
    popoverController: createMockPopoverController(),
  };
}
