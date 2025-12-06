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
  const mock = {
    is: jest.fn().mockReturnValue(false),
    ready: jest.fn().mockResolvedValue(undefined),
    resume: jest.fn().mockReturnValue({ subscribe: jest.fn() }),
    pause: jest.fn().mockReturnValue({ subscribe: jest.fn() }),
    width: jest.fn().mockReturnValue(360),
    height: jest.fn().mockReturnValue(640),
    isPortrait: jest.fn().mockReturnValue(true),
    isLandscape: jest.fn().mockReturnValue(false),
    platforms: () => ['web'],
    isRTL: false,
  };

  return mock;
}

/**
 * Mock Ionic NavController
 * Used for navigation between pages
 */
export function createMockNavController() {
  const mock = {
    navigateForward: jest.fn().mockResolvedValue(true),
    navigateBack: jest.fn().mockResolvedValue(true),
    navigateRoot: jest.fn().mockResolvedValue(true),
    pop: jest.fn().mockResolvedValue(true),
    push: jest.fn().mockResolvedValue(true),
    setDirection: jest.fn(),
    canGoBack: jest.fn().mockReturnValue(false),
  };

  mock.setDirection.mockReturnValue(mock);

  return mock;
}

/**
 * Mock Ionic ModalController
 * Used for presenting modal dialogs
 */
export function createMockModalController() {
  const mockModal = {
    present: jest.fn().mockResolvedValue(undefined),
    dismiss: jest.fn().mockResolvedValue(true),
    onDidDismiss: jest.fn().mockResolvedValue({ data: undefined, role: 'backdrop' }),
    onWillDismiss: jest.fn().mockResolvedValue({ data: undefined, role: 'backdrop' }),
  };

  const mock = {
    create: jest.fn().mockResolvedValue(mockModal),
    dismiss: jest.fn().mockResolvedValue(true),
    getTop: jest.fn().mockResolvedValue(mockModal),
  };

  return mock;
}

/**
 * Mock Ionic AlertController
 * Used for alert dialogs
 */
export function createMockAlertController() {
  const mockAlert = {
    present: jest.fn().mockResolvedValue(undefined),
    dismiss: jest.fn().mockResolvedValue(true),
    onDidDismiss: jest.fn().mockResolvedValue({ data: undefined, role: 'backdrop' }),
    onWillDismiss: jest.fn().mockResolvedValue({ data: undefined, role: 'backdrop' }),
  };

  const mock = {
    create: jest.fn().mockResolvedValue(mockAlert),
    dismiss: jest.fn().mockResolvedValue(true),
    getTop: jest.fn().mockResolvedValue(mockAlert),
  };

  return mock;
}

/**
 * Mock Ionic LoadingController
 * Used for loading spinners
 */
export function createMockLoadingController() {
  const mockLoading = {
    present: jest.fn().mockResolvedValue(undefined),
    dismiss: jest.fn().mockResolvedValue(true),
    onDidDismiss: jest.fn().mockResolvedValue({ data: undefined, role: undefined }),
  };

  const mock = {
    create: jest.fn().mockResolvedValue(mockLoading),
    dismiss: jest.fn().mockResolvedValue(true),
    getTop: jest.fn().mockResolvedValue(mockLoading),
  };

  return mock;
}

/**
 * Mock Ionic ToastController
 * Used for toast notifications
 */
export function createMockToastController() {
  const mockToast = {
    present: jest.fn().mockResolvedValue(undefined),
    dismiss: jest.fn().mockResolvedValue(true),
    onDidDismiss: jest.fn().mockResolvedValue({ data: undefined, role: undefined }),
  };

  const mock = {
    create: jest.fn().mockResolvedValue(mockToast),
    dismiss: jest.fn().mockResolvedValue(true),
    getTop: jest.fn().mockResolvedValue(mockToast),
  };

  return mock;
}

/**
 * Mock Ionic ActionSheetController
 * Used for action sheets
 */
export function createMockActionSheetController() {
  const mockActionSheet = {
    present: jest.fn().mockResolvedValue(undefined),
    dismiss: jest.fn().mockResolvedValue(true),
    onDidDismiss: jest.fn().mockResolvedValue({ data: undefined, role: 'backdrop' }),
  };

  const mock = {
    create: jest.fn().mockResolvedValue(mockActionSheet),
    dismiss: jest.fn().mockResolvedValue(true),
    getTop: jest.fn().mockResolvedValue(mockActionSheet),
  };

  return mock;
}

/**
 * Mock Ionic PopoverController
 * Used for popover menus
 */
export function createMockPopoverController() {
  const mockPopover = {
    present: jest.fn().mockResolvedValue(undefined),
    dismiss: jest.fn().mockResolvedValue(true),
    onDidDismiss: jest.fn().mockResolvedValue({ data: undefined, role: 'backdrop' }),
  };

  const mock = {
    create: jest.fn().mockResolvedValue(mockPopover),
    dismiss: jest.fn().mockResolvedValue(true),
    getTop: jest.fn().mockResolvedValue(mockPopover),
  };

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
