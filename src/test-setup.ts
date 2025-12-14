/**
 * Angular TestBed setup helper for Vitest
 *
 * Each test file MUST import this at the top to ensure TestBed is initialized:
 *
 * import '../../../test-setup'; // Adjust path as needed
 * // OR use the path alias: import '@app/../test-setup';
 */

import { vi } from 'vitest';

// ============================================================================
// CRITICAL: Capacitor mocks MUST be defined here to be hoisted properly
// vi.mock() is hoisted to the top of the module that imports it
// ============================================================================

// Mock Capacitor core
vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: vi.fn().mockReturnValue(false),
    getPlatform: vi.fn().mockReturnValue('web'),
    isPluginAvailable: vi.fn().mockReturnValue(true),
    convertFileSrc: vi.fn((filePath: string) => filePath),
    registerPlugin: vi.fn(),
  },
  registerPlugin: vi.fn(),
}));

// Mock Capacitor Preferences
vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: vi.fn().mockResolvedValue({ value: null }),
    set: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
    clear: vi.fn().mockResolvedValue(undefined),
    keys: vi.fn().mockResolvedValue({ keys: [] }),
  },
}));

// Mock Capacitor Device
vi.mock('@capacitor/device', () => ({
  Device: {
    getInfo: vi.fn().mockResolvedValue({
      platform: 'web',
      operatingSystem: 'unknown',
      osVersion: 'unknown',
      model: 'unknown',
      manufacturer: 'unknown',
      isVirtual: false,
      webViewVersion: 'unknown',
    }),
    getId: vi.fn().mockResolvedValue({ identifier: 'test-device-id' }),
    getBatteryInfo: vi.fn().mockResolvedValue({ batteryLevel: 1, isCharging: false }),
    getLanguageCode: vi.fn().mockResolvedValue({ value: 'en' }),
  },
}));

// Mock Capacitor Network
vi.mock('@capacitor/network', () => ({
  Network: {
    getStatus: vi.fn().mockResolvedValue({ connected: true, connectionType: 'wifi' }),
    addListener: vi.fn().mockResolvedValue({ remove: vi.fn() }),
  },
}));

// Mock Capacitor Keyboard
vi.mock('@capacitor/keyboard', () => ({
  Keyboard: {
    addListener: vi.fn().mockResolvedValue({ remove: vi.fn() }),
    hide: vi.fn().mockResolvedValue(undefined),
    show: vi.fn().mockResolvedValue(undefined),
  },
}));

// Mock Capacitor Haptics
vi.mock('@capacitor/haptics', () => ({
  Haptics: {
    impact: vi.fn().mockResolvedValue(undefined),
    notification: vi.fn().mockResolvedValue(undefined),
    vibrate: vi.fn().mockResolvedValue(undefined),
    selectionChanged: vi.fn().mockResolvedValue(undefined),
  },
  ImpactStyle: { Light: 'LIGHT', Medium: 'MEDIUM', Heavy: 'HEAVY' },
  NotificationType: { Success: 'SUCCESS', Warning: 'WARNING', Error: 'ERROR' },
}));

// Mock Capacitor StatusBar
vi.mock('@capacitor/status-bar', () => ({
  StatusBar: {
    setStyle: vi.fn().mockResolvedValue(undefined),
    setBackgroundColor: vi.fn().mockResolvedValue(undefined),
    show: vi.fn().mockResolvedValue(undefined),
    hide: vi.fn().mockResolvedValue(undefined),
  },
}));

// Mock Capacitor SplashScreen
vi.mock('@capacitor/splash-screen', () => ({
  SplashScreen: {
    show: vi.fn().mockResolvedValue(undefined),
    hide: vi.fn().mockResolvedValue(undefined),
  },
}));

// Mock Capacitor Browser
vi.mock('@capacitor/browser', () => ({
  Browser: {
    open: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    addListener: vi.fn().mockResolvedValue({ remove: vi.fn() }),
  },
}));

// Mock Capacitor SecureStorage
vi.mock('@aparajita/capacitor-secure-storage', () => ({
  SecureStorage: {
    get: vi.fn().mockResolvedValue({ value: null }),
    set: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
    clear: vi.fn().mockResolvedValue(undefined),
    keys: vi.fn().mockResolvedValue({ keys: [] }),
  },
}));

// Mock Capacitor LocalNotifications
vi.mock('@capacitor/local-notifications', () => ({
  LocalNotifications: {
    requestPermissions: vi.fn().mockResolvedValue({ display: 'granted' }),
    checkPermissions: vi.fn().mockResolvedValue({ display: 'granted' }),
    schedule: vi.fn().mockResolvedValue({ notifications: [] }),
    cancel: vi.fn().mockResolvedValue(undefined),
    getPending: vi.fn().mockResolvedValue({ notifications: [] }),
    addListener: vi.fn().mockResolvedValue({ remove: vi.fn() }),
  },
}));

// Mock Biometric Auth
vi.mock('@capawesome-team/capacitor-biometrics', () => ({
  BiometricAuth: {
    isAvailable: vi.fn().mockResolvedValue({ isAvailable: false, biometryType: 'NONE' }),
    authenticate: vi.fn().mockResolvedValue({ success: false }),
  },
}));

// Mock Capacitor App (for deep linking, app state)
vi.mock('@capacitor/app', () => ({
  App: {
    addListener: vi.fn().mockResolvedValue({ remove: vi.fn() }),
    removeAllListeners: vi.fn().mockResolvedValue(undefined),
    getState: vi.fn().mockResolvedValue({ isActive: true }),
    getLaunchUrl: vi.fn().mockResolvedValue({ url: null }),
    exitApp: vi.fn().mockResolvedValue(undefined),
  },
}));

// ============================================================================
// Mock Ionic Core modules to prevent ESM resolution errors
// ============================================================================

// Mock @ionic/core
vi.mock('@ionic/core', () => ({
  isPlatform: vi.fn().mockReturnValue(false),
  getPlatforms: vi.fn().mockReturnValue(['web']),
  getMode: vi.fn().mockReturnValue('md'),
}));

// Mock @ionic/core/loader and its subpaths
vi.mock('@ionic/core/loader', () => ({
  defineCustomElements: vi.fn().mockResolvedValue(undefined),
  setAssetPath: vi.fn(),
  setNonce: vi.fn(),
}));

// Mock @ionic/core/components for lifecycle constants
vi.mock('@ionic/core/components', () => ({
  setAssetPath: vi.fn(),
  isPlatform: vi.fn().mockReturnValue(false),
  getPlatforms: vi.fn().mockReturnValue(['web']),
  LIFECYCLE_WILL_ENTER: 'ionViewWillEnter',
  LIFECYCLE_DID_ENTER: 'ionViewDidEnter',
  LIFECYCLE_WILL_LEAVE: 'ionViewWillLeave',
  LIFECYCLE_DID_LEAVE: 'ionViewDidLeave',
  LIFECYCLE_WILL_UNLOAD: 'ionViewWillUnload',
}));

// Mock @stencil/core
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

// Helper to create mock form control component with NG_VALUE_ACCESSOR
function createMockFormControl(
  Component: any,
  forwardRef: any,
  NG_VALUE_ACCESSOR: any,
  selector: string,
  template: string = ''
) {
  class MockFormControl {
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

  return Component({
    selector,
    template: template || '<ng-content></ng-content>',
    standalone: true,
    providers: [
      {
        provide: NG_VALUE_ACCESSOR,
        useExisting: forwardRef(() => MockFormControl),
        multi: true,
      },
    ],
  })(MockFormControl);
}

// Mock @ionic/angular to prevent ESM resolution issues with @ionic/core/loader
vi.mock('@ionic/angular', async () => {
  const { NgModule, Injectable, Directive, Component, forwardRef } =
    await vi.importActual<typeof import('@angular/core')>('@angular/core');
  const { NG_VALUE_ACCESSOR } =
    await vi.importActual<typeof import('@angular/forms')>('@angular/forms');

  @Injectable({ providedIn: 'root' })
  class MockPlatform {
    ready = () => Promise.resolve('web');
    is = () => false;
    platforms = () => ['web'];
    width = () => 1024;
    height = () => 768;
    isLandscape = () => false;
    isPortrait = () => true;
    url = () => '';
    testUserAgent = () => false;
    resume = { subscribe: () => ({ unsubscribe: () => {} }) };
    pause = { subscribe: () => ({ unsubscribe: () => {} }) };
    resize = { subscribe: () => ({ unsubscribe: () => {} }) };
  }

  @Injectable({ providedIn: 'root' })
  class MockNavController {
    navigateForward = vi.fn().mockResolvedValue(true);
    navigateBack = vi.fn().mockResolvedValue(true);
    navigateRoot = vi.fn().mockResolvedValue(true);
    back = vi.fn();
    pop = vi.fn().mockResolvedValue(true);
    setDirection = vi.fn();
    setTopOutlet = vi.fn();
  }

  @Injectable({ providedIn: 'root' })
  class MockAlertController {
    create = vi.fn().mockResolvedValue({
      present: vi.fn().mockResolvedValue(undefined),
      dismiss: vi.fn().mockResolvedValue(undefined),
      onDidDismiss: vi.fn().mockResolvedValue({ role: 'cancel' }),
    });
    dismiss = vi.fn().mockResolvedValue(undefined);
    getTop = vi.fn().mockResolvedValue(null);
  }

  @Injectable({ providedIn: 'root' })
  class MockToastController {
    create = vi.fn().mockResolvedValue({
      present: vi.fn().mockResolvedValue(undefined),
      dismiss: vi.fn().mockResolvedValue(undefined),
      onDidDismiss: vi.fn().mockResolvedValue(undefined),
    });
    dismiss = vi.fn().mockResolvedValue(undefined);
    getTop = vi.fn().mockResolvedValue(null);
  }

  @Injectable({ providedIn: 'root' })
  class MockLoadingController {
    create = vi.fn().mockResolvedValue({
      present: vi.fn().mockResolvedValue(undefined),
      dismiss: vi.fn().mockResolvedValue(undefined),
      onDidDismiss: vi.fn().mockResolvedValue(undefined),
    });
    dismiss = vi.fn().mockResolvedValue(undefined);
    getTop = vi.fn().mockResolvedValue(null);
  }

  @Injectable({ providedIn: 'root' })
  class MockModalController {
    create = vi.fn().mockResolvedValue({
      present: vi.fn().mockResolvedValue(undefined),
      dismiss: vi.fn().mockResolvedValue(undefined),
      onDidDismiss: vi.fn().mockResolvedValue({ data: null, role: 'cancel' }),
    });
    dismiss = vi.fn().mockResolvedValue(undefined);
    getTop = vi.fn().mockResolvedValue(null);
  }

  @Injectable({ providedIn: 'root' })
  class MockActionSheetController {
    create = vi.fn().mockResolvedValue({
      present: vi.fn().mockResolvedValue(undefined),
      dismiss: vi.fn().mockResolvedValue(undefined),
      onDidDismiss: vi.fn().mockResolvedValue({ role: 'cancel' }),
    });
    dismiss = vi.fn().mockResolvedValue(undefined);
    getTop = vi.fn().mockResolvedValue(null);
  }

  @Injectable({ providedIn: 'root' })
  class MockMenuController {
    open = vi.fn().mockResolvedValue(true);
    close = vi.fn().mockResolvedValue(true);
    toggle = vi.fn().mockResolvedValue(true);
    enable = vi.fn().mockResolvedValue(true);
    isEnabled = vi.fn().mockResolvedValue(true);
    isOpen = vi.fn().mockResolvedValue(false);
  }

  @NgModule({
    imports: [],
    exports: [],
    providers: [
      { provide: MockPlatform, useClass: MockPlatform },
      { provide: MockNavController, useClass: MockNavController },
      { provide: MockAlertController, useClass: MockAlertController },
      { provide: MockToastController, useClass: MockToastController },
      { provide: MockLoadingController, useClass: MockLoadingController },
      { provide: MockModalController, useClass: MockModalController },
      { provide: MockActionSheetController, useClass: MockActionSheetController },
      { provide: MockMenuController, useClass: MockMenuController },
    ],
  })
  class IonicModule {
    static forRoot = () => ({
      ngModule: IonicModule,
      providers: [
        { provide: MockPlatform, useClass: MockPlatform },
        { provide: MockNavController, useClass: MockNavController },
      ],
    });
  }

  return {
    IonicModule,
    Platform: MockPlatform,
    NavController: MockNavController,
    AlertController: MockAlertController,
    ToastController: MockToastController,
    LoadingController: MockLoadingController,
    ModalController: MockModalController,
    ActionSheetController: MockActionSheetController,
    MenuController: MockMenuController,
    IonRouterOutlet: Directive({ selector: 'ion-router-outlet', standalone: true })(class {}),
    // Re-export common Ionic standalone components as empty stubs
    IonApp: Component({
      selector: 'ion-app',
      template: '<ng-content></ng-content>',
      standalone: true,
    })(class {}),
    IonHeader: Component({
      selector: 'ion-header',
      template: '<ng-content></ng-content>',
      standalone: true,
    })(class {}),
    IonToolbar: Component({
      selector: 'ion-toolbar',
      template: '<ng-content></ng-content>',
      standalone: true,
    })(class {}),
    IonTitle: Component({
      selector: 'ion-title',
      template: '<ng-content></ng-content>',
      standalone: true,
    })(class {}),
    IonContent: Component({
      selector: 'ion-content',
      template: '<ng-content></ng-content>',
      standalone: true,
    })(class {}),
    IonButton: Component({
      selector: 'ion-button',
      template: '<ng-content></ng-content>',
      standalone: true,
    })(class {}),
    IonIcon: Component({ selector: 'ion-icon', template: '', standalone: true })(class {}),
    IonInput: Component({ selector: 'ion-input', template: '', standalone: true })(class {}),
    IonItem: Component({
      selector: 'ion-item',
      template: '<ng-content></ng-content>',
      standalone: true,
    })(class {}),
    IonLabel: Component({
      selector: 'ion-label',
      template: '<ng-content></ng-content>',
      standalone: true,
    })(class {}),
    IonList: Component({
      selector: 'ion-list',
      template: '<ng-content></ng-content>',
      standalone: true,
    })(class {}),
  };
});

// Also mock @ionic/angular/standalone to prevent the standalone entry point from loading @ionic/core/components
vi.mock('@ionic/angular/standalone', async () => {
  const { Component, Directive } =
    await vi.importActual<typeof import('@angular/core')>('@angular/core');

  // Create empty standalone components and directives
  const IonRouterOutlet = Directive({ selector: 'ion-router-outlet', standalone: true })(class {});

  return {
    IonRouterOutlet,
    IonApp: Component({
      selector: 'ion-app',
      template: '<ng-content></ng-content>',
      standalone: true,
    })(class {}),
    IonHeader: Component({
      selector: 'ion-header',
      template: '<ng-content></ng-content>',
      standalone: true,
    })(class {}),
    IonToolbar: Component({
      selector: 'ion-toolbar',
      template: '<ng-content></ng-content>',
      standalone: true,
    })(class {}),
    IonTitle: Component({
      selector: 'ion-title',
      template: '<ng-content></ng-content>',
      standalone: true,
    })(class {}),
    IonContent: Component({
      selector: 'ion-content',
      template: '<ng-content></ng-content>',
      standalone: true,
    })(class {}),
    IonButton: Component({
      selector: 'ion-button',
      template: '<ng-content></ng-content>',
      standalone: true,
    })(class {}),
    IonIcon: Component({ selector: 'ion-icon', template: '', standalone: true })(class {}),
    IonInput: Component({ selector: 'ion-input', template: '', standalone: true })(class {}),
    IonItem: Component({
      selector: 'ion-item',
      template: '<ng-content></ng-content>',
      standalone: true,
    })(class {}),
    IonLabel: Component({
      selector: 'ion-label',
      template: '<ng-content></ng-content>',
      standalone: true,
    })(class {}),
    IonList: Component({
      selector: 'ion-list',
      template: '<ng-content></ng-content>',
      standalone: true,
    })(class {}),
    IonBackButton: Component({ selector: 'ion-back-button', template: '', standalone: true })(
      class {}
    ),
    IonButtons: Component({
      selector: 'ion-buttons',
      template: '<ng-content></ng-content>',
      standalone: true,
    })(class {}),
    IonCard: Component({
      selector: 'ion-card',
      template: '<ng-content></ng-content>',
      standalone: true,
    })(class {}),
    IonCardContent: Component({
      selector: 'ion-card-content',
      template: '<ng-content></ng-content>',
      standalone: true,
    })(class {}),
    IonCardHeader: Component({
      selector: 'ion-card-header',
      template: '<ng-content></ng-content>',
      standalone: true,
    })(class {}),
    IonCardTitle: Component({
      selector: 'ion-card-title',
      template: '<ng-content></ng-content>',
      standalone: true,
    })(class {}),
    IonFooter: Component({
      selector: 'ion-footer',
      template: '<ng-content></ng-content>',
      standalone: true,
    })(class {}),
    IonGrid: Component({
      selector: 'ion-grid',
      template: '<ng-content></ng-content>',
      standalone: true,
    })(class {}),
    IonRow: Component({
      selector: 'ion-row',
      template: '<ng-content></ng-content>',
      standalone: true,
    })(class {}),
    IonCol: Component({
      selector: 'ion-col',
      template: '<ng-content></ng-content>',
      standalone: true,
    })(class {}),
    IonTabs: Component({
      selector: 'ion-tabs',
      template: '<ng-content></ng-content>',
      standalone: true,
    })(class {}),
    IonTabBar: Component({
      selector: 'ion-tab-bar',
      template: '<ng-content></ng-content>',
      standalone: true,
    })(class {}),
    IonTabButton: Component({
      selector: 'ion-tab-button',
      template: '<ng-content></ng-content>',
      standalone: true,
    })(class {}),
    IonSpinner: Component({ selector: 'ion-spinner', template: '', standalone: true })(class {}),
    IonRefresher: Component({ selector: 'ion-refresher', template: '', standalone: true })(
      class {}
    ),
    IonRefresherContent: Component({
      selector: 'ion-refresher-content',
      template: '',
      standalone: true,
    })(class {}),
    IonToggle: Component({ selector: 'ion-toggle', template: '', standalone: true })(class {}),
    IonSelect: Component({
      selector: 'ion-select',
      template: '<ng-content></ng-content>',
      standalone: true,
    })(class {}),
    IonSelectOption: Component({
      selector: 'ion-select-option',
      template: '<ng-content></ng-content>',
      standalone: true,
    })(class {}),
    IonSkeletonText: Component({ selector: 'ion-skeleton-text', template: '', standalone: true })(
      class {}
    ),
    IonThumbnail: Component({
      selector: 'ion-thumbnail',
      template: '<ng-content></ng-content>',
      standalone: true,
    })(class {}),
    IonBadge: Component({
      selector: 'ion-badge',
      template: '<ng-content></ng-content>',
      standalone: true,
    })(class {}),
    IonChip: Component({
      selector: 'ion-chip',
      template: '<ng-content></ng-content>',
      standalone: true,
    })(class {}),
    IonFab: Component({
      selector: 'ion-fab',
      template: '<ng-content></ng-content>',
      standalone: true,
    })(class {}),
    IonFabButton: Component({
      selector: 'ion-fab-button',
      template: '<ng-content></ng-content>',
      standalone: true,
    })(class {}),
    IonNote: Component({
      selector: 'ion-note',
      template: '<ng-content></ng-content>',
      standalone: true,
    })(class {}),
    IonText: Component({
      selector: 'ion-text',
      template: '<ng-content></ng-content>',
      standalone: true,
    })(class {}),
    IonModal: Component({
      selector: 'ion-modal',
      template: '<ng-content></ng-content>',
      standalone: true,
    })(class {}),
    IonAlert: Component({ selector: 'ion-alert', template: '', standalone: true })(class {}),
    IonToast: Component({ selector: 'ion-toast', template: '', standalone: true })(class {}),
    IonPopover: Component({
      selector: 'ion-popover',
      template: '<ng-content></ng-content>',
      standalone: true,
    })(class {}),
    IonMenu: Component({
      selector: 'ion-menu',
      template: '<ng-content></ng-content>',
      standalone: true,
    })(class {}),
    IonMenuButton: Component({ selector: 'ion-menu-button', template: '', standalone: true })(
      class {}
    ),
    IonSearchbar: Component({ selector: 'ion-searchbar', template: '', standalone: true })(
      class {}
    ),
    IonSegment: Component({
      selector: 'ion-segment',
      template: '<ng-content></ng-content>',
      standalone: true,
    })(class {}),
    IonSegmentButton: Component({
      selector: 'ion-segment-button',
      template: '<ng-content></ng-content>',
      standalone: true,
    })(class {}),
    IonDatetime: Component({ selector: 'ion-datetime', template: '', standalone: true })(class {}),
    IonPicker: Component({ selector: 'ion-picker', template: '', standalone: true })(class {}),
    IonRange: Component({ selector: 'ion-range', template: '', standalone: true })(class {}),
    IonCheckbox: (() => {
      class MockCheckbox {
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
      return Component({
        selector: 'ion-checkbox',
        template: '',
        standalone: true,
        providers: [
          {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => MockCheckbox),
            multi: true,
          },
        ],
      })(MockCheckbox);
    })(),
    IonRadio: Component({ selector: 'ion-radio', template: '', standalone: true })(class {}),
    IonRadioGroup: Component({
      selector: 'ion-radio-group',
      template: '<ng-content></ng-content>',
      standalone: true,
    })(class {}),
    IonTextarea: Component({ selector: 'ion-textarea', template: '', standalone: true })(class {}),
    IonItemDivider: Component({
      selector: 'ion-item-divider',
      template: '<ng-content></ng-content>',
      standalone: true,
    })(class {}),
    IonItemGroup: Component({
      selector: 'ion-item-group',
      template: '<ng-content></ng-content>',
      standalone: true,
    })(class {}),
    IonItemSliding: Component({
      selector: 'ion-item-sliding',
      template: '<ng-content></ng-content>',
      standalone: true,
    })(class {}),
    IonItemOptions: Component({
      selector: 'ion-item-options',
      template: '<ng-content></ng-content>',
      standalone: true,
    })(class {}),
    IonItemOption: Component({
      selector: 'ion-item-option',
      template: '<ng-content></ng-content>',
      standalone: true,
    })(class {}),
    IonListHeader: Component({
      selector: 'ion-list-header',
      template: '<ng-content></ng-content>',
      standalone: true,
    })(class {}),
    IonVirtualScroll: Component({
      selector: 'ion-virtual-scroll',
      template: '<ng-content></ng-content>',
      standalone: true,
    })(class {}),
    IonAvatar: Component({
      selector: 'ion-avatar',
      template: '<ng-content></ng-content>',
      standalone: true,
    })(class {}),
    IonImg: Component({ selector: 'ion-img', template: '', standalone: true })(class {}),
    IonInfiniteScroll: Component({
      selector: 'ion-infinite-scroll',
      template: '<ng-content></ng-content>',
      standalone: true,
    })(class {}),

    IonInfiniteScrollContent: Component({
      selector: 'ion-infinite-scroll-content',
      template: '',
      standalone: true,
    })(class {}),
    IonRippleEffect: Component({ selector: 'ion-ripple-effect', template: '', standalone: true })(
      class {}
    ),
    IonNavLink: Component({
      selector: 'ion-nav-link',
      template: '<ng-content></ng-content>',
      standalone: true,
    })(class {}),
    IonSplitPane: Component({
      selector: 'ion-split-pane',
      template: '<ng-content></ng-content>',
      standalone: true,
    })(class {}),
    IonActionSheet: Component({ selector: 'ion-action-sheet', template: '', standalone: true })(
      class {}
    ),
    IonLoading: Component({ selector: 'ion-loading', template: '', standalone: true })(class {}),
    IonProgressBar: Component({ selector: 'ion-progress-bar', template: '', standalone: true })(
      class {}
    ),
    IonReorder: Component({ selector: 'ion-reorder', template: '', standalone: true })(class {}),
    IonReorderGroup: Component({
      selector: 'ion-reorder-group',
      template: '<ng-content></ng-content>',
      standalone: true,
    })(class {}),
    IonAccordion: Component({
      selector: 'ion-accordion',
      template: '<ng-content></ng-content>',
      standalone: true,
    })(class {}),
    IonAccordionGroup: Component({
      selector: 'ion-accordion-group',
      template: '<ng-content></ng-content>',
      standalone: true,
    })(class {}),
    IonBreadcrumb: Component({
      selector: 'ion-breadcrumb',
      template: '<ng-content></ng-content>',
      standalone: true,
    })(class {}),
    IonBreadcrumbs: Component({
      selector: 'ion-breadcrumbs',
      template: '<ng-content></ng-content>',
      standalone: true,
    })(class {}),
  };
});

// ============================================================================
// Mock IndexedDB for Dexie
// ============================================================================
import 'fake-indexeddb/auto';

// ============================================================================
// Now import Angular testing modules
// ============================================================================

import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';

// Initialize TestBed once per module import
const TESTBED_INIT_KEY = Symbol.for('angular-testbed-init');

if (!(globalThis as any)[TESTBED_INIT_KEY]) {
  (globalThis as any)[TESTBED_INIT_KEY] = true;

  try {
    TestBed.resetTestEnvironment();
  } catch {
    // Ignore if not initialized
  }

  TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting(), {
    teardown: { destroyAfterEach: true },
  });
}

// Jest compatibility layer for tests using jest.fn(), jest.spyOn() etc.
const JEST_COMPAT_KEY = Symbol.for('jest-compat-init');

if (!(globalThis as any)[JEST_COMPAT_KEY]) {
  (globalThis as any)[JEST_COMPAT_KEY] = true;

  const jestCompat = {
    ...vi,
    mock: vi.mock,
    spyOn: vi.spyOn,
    fn: vi.fn,
    clearAllMocks: vi.clearAllMocks,
    resetAllMocks: vi.resetAllMocks,
    restoreAllMocks: vi.restoreAllMocks,
  };

  (globalThis as any).jest = jestCompat;
}

export {};
