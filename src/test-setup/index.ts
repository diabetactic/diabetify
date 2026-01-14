/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { PipeTransform } from '@angular/core';
/**
 * Setup principal de tests para Vitest
 * Re-exporta todos los módulos de configuración
 */

// IMPORTANTE: Establecer override de URL base de API ANTES de cualquier otro import
// Esto asegura que el módulo api-base-url.ts recoja la URL de test
// cuando es importado por primera vez por cualquier test o servicio
(globalThis as { __DIABETACTIC_API_BASE_URL?: string }).__DIABETACTIC_API_BASE_URL =
  'http://localhost:8000';

import { vi } from 'vitest';

// ============================================================================
// CRITICAL: Los mocks de vi.mock() DEBEN estar en este archivo para hoisting
// Vitest solo hace hoist de vi.mock() dentro del mismo archivo
// ============================================================================

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

// Mock @ionic/core
vi.mock('@ionic/core', () => ({
  isPlatform: vi.fn().mockReturnValue(false),
  getPlatforms: vi.fn().mockReturnValue(['web']),
  getMode: vi.fn().mockReturnValue('md'),
}));

vi.mock('@ionic/core/components', async () => {
  return {
    setAssetPath: vi.fn(),
    isPlatform: vi.fn().mockReturnValue(false),
    getPlatforms: vi.fn().mockReturnValue(['web']),
    LIFECYCLE_WILL_ENTER: 'ionViewWillEnter',
    LIFECYCLE_DID_ENTER: 'ionViewDidEnter',
    LIFECYCLE_WILL_LEAVE: 'ionViewWillLeave',
    LIFECYCLE_DID_LEAVE: 'ionViewDidLeave',
    LIFECYCLE_WILL_UNLOAD: 'ionViewWillUnload',
  };
});

vi.mock('@ionic/core/loader', async () => {
  return {
    defineCustomElements: vi.fn().mockResolvedValue(undefined),
    setAssetPath: vi.fn(),
    setNonce: vi.fn(),
  };
});

vi.mock('@ionic/core/loader/index.js', async () => {
  return {
    defineCustomElements: vi.fn().mockResolvedValue(undefined),
    setAssetPath: vi.fn(),
    setNonce: vi.fn(),
  };
});

// Mock @ionic/angular - MUST be here for proper hoisting
vi.mock('@ionic/angular', async () => {
  const mock = await import('../mocks/ionic-angular.mock');
  return mock;
});

vi.mock('@ionic/angular/standalone', async () => {
  const mock = await import('../mocks/ionic-angular.mock');
  return mock;
});

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

// Mock Capacitor plugins
vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: vi.fn().mockResolvedValue({ value: null }),
    set: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
    clear: vi.fn().mockResolvedValue(undefined),
    keys: vi.fn().mockResolvedValue({ keys: [] }),
  },
}));

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

vi.mock('@capacitor/network', () => ({
  Network: {
    getStatus: vi.fn().mockResolvedValue({ connected: true, connectionType: 'wifi' }),
    addListener: vi.fn().mockResolvedValue({ remove: vi.fn() }),
  },
}));

vi.mock('@capacitor/keyboard', () => ({
  Keyboard: {
    addListener: vi.fn().mockResolvedValue({ remove: vi.fn() }),
    hide: vi.fn().mockResolvedValue(undefined),
    show: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@capacitor/haptics', () => ({
  Haptics: {
    impact: vi.fn().mockResolvedValue(undefined),
    notification: vi.fn().mockResolvedValue(undefined),
    vibrate: vi.fn().mockResolvedValue(undefined),
    selectionChanged: vi.fn().mockResolvedValue(undefined),
  },
  ImpactStyle: {
    Light: 'LIGHT',
    Medium: 'MEDIUM',
    Heavy: 'HEAVY',
  },
  NotificationType: {
    Success: 'SUCCESS',
    Warning: 'WARNING',
    Error: 'ERROR',
  },
}));

vi.mock('@capacitor/status-bar', () => ({
  StatusBar: {
    setStyle: vi.fn().mockResolvedValue(undefined),
    setBackgroundColor: vi.fn().mockResolvedValue(undefined),
    show: vi.fn().mockResolvedValue(undefined),
    hide: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@capacitor/splash-screen', () => ({
  SplashScreen: {
    show: vi.fn().mockResolvedValue(undefined),
    hide: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@capacitor/browser', () => ({
  Browser: {
    open: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    addListener: vi.fn().mockResolvedValue({ remove: vi.fn() }),
  },
}));

vi.mock('@aparajita/capacitor-secure-storage', () => ({
  SecureStorage: {
    get: vi.fn().mockResolvedValue({ value: null }),
    set: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
    clear: vi.fn().mockResolvedValue(undefined),
    keys: vi.fn().mockResolvedValue({ keys: [] }),
  },
}));

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

vi.mock('@capawesome-team/capacitor-biometrics', () => ({
  BiometricAuth: {
    isAvailable: vi.fn().mockResolvedValue({ isAvailable: false, biometryType: 'NONE' }),
    authenticate: vi.fn().mockResolvedValue({ success: false }),
  },
}));

vi.mock('@capacitor/app', () => ({
  App: {
    addListener: vi.fn().mockResolvedValue({ remove: vi.fn() }),
    removeAllListeners: vi.fn().mockResolvedValue(undefined),
    getState: vi.fn().mockResolvedValue({ isActive: true }),
    getLaunchUrl: vi.fn().mockResolvedValue({ url: null }),
    exitApp: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@capacitor-mlkit/barcode-scanning', () => ({
  BarcodeScanner: {
    scan: vi.fn(),
    requestPermissions: vi.fn(),
    isSupported: vi.fn(),
    isGoogleBarcodeScannerModuleAvailable: vi.fn(),
    installGoogleBarcodeScannerModule: vi.fn(),
    openSettings: vi.fn(),
    removeAllListeners: vi.fn(),
  },
}));

// Mock lucide-angular - MUST be here for proper hoisting
// Includes all icons from src/app/shared/icons/lucide-icons.ts
vi.mock('lucide-angular', async () => {
  const { NgModule, Component, Input } = await import('@angular/core');

  // Create a mock icon object
  const mockIcon = { name: 'mock-icon', data: [] };

  // Create a minimal mock component for lucide-icon with all required inputs
  @Component({
    selector: 'lucide-icon', // eslint-disable-line @angular-eslint/component-selector
    template: '',
    standalone: true,
  })
  class MockLucideIconComponent {
    @Input() name: string | object = '';
    @Input() size: number | string = 24;
    @Input() color: string = '';
    @Input() strokeWidth: number | string = 2;
    @Input() absoluteStrokeWidth: boolean = false;
    @Input() class: string = '';
    @Input() img: object | null = null;
  }

  // Create a proper NgModule mock that can be used directly in imports
  // and also has a static pick() method
  @NgModule({
    imports: [MockLucideIconComponent],
    exports: [MockLucideIconComponent],
  })
  class MockLucideAngularModule {
    static pick(_icons: Record<string, unknown>) {
      return {
        ngModule: MockLucideAngularModule,
        providers: [],
      };
    }
  }

  return {
    LucideAngularModule: MockLucideAngularModule,
    LucideIconComponent: MockLucideIconComponent,
    icons: {},
    Accessibility: mockIcon,
    Activity: mockIcon,
    AlarmClock: mockIcon,
    AlertCircle: mockIcon,
    AlertTriangle: mockIcon,
    Apple: mockIcon,
    ArrowDown: mockIcon,
    ArrowLeft: mockIcon,
    ArrowRight: mockIcon,
    ArrowUp: mockIcon,
    ArrowUpDown: mockIcon,
    Award: mockIcon,
    Ban: mockIcon,
    Barcode: mockIcon,
    BarChart3: mockIcon,
    BatteryCharging: mockIcon,
    BatteryFull: mockIcon,
    Bell: mockIcon,
    Bookmark: mockIcon,
    Brain: mockIcon,
    Bug: mockIcon,
    Calculator: mockIcon,
    Calendar: mockIcon,
    CalendarCheck: mockIcon,
    CalendarPlus: mockIcon,
    Camera: mockIcon,
    Check: mockIcon,
    CheckCircle: mockIcon,
    ChevronDown: mockIcon,
    ChevronLeft: mockIcon,
    ChevronRight: mockIcon,
    ChevronUp: mockIcon,
    Circle: mockIcon,
    Clipboard: mockIcon,
    ClipboardCheck: mockIcon,
    ClipboardList: mockIcon,
    Clock: mockIcon,
    Cloud: mockIcon,
    CloudOff: mockIcon,
    Code: mockIcon,
    Contrast: mockIcon,
    Copy: mockIcon,
    Database: mockIcon,
    Dna: mockIcon,
    DollarSign: mockIcon,
    Download: mockIcon,
    DownloadCloud: mockIcon,
    Droplet: mockIcon,
    Dumbbell: mockIcon,
    Edit2: mockIcon,
    Edit3: mockIcon,
    Eye: mockIcon,
    EyeOff: mockIcon,
    File: mockIcon,
    FilePlus: mockIcon,
    FileText: mockIcon,
    Filter: mockIcon,
    Fingerprint: mockIcon,
    Flame: mockIcon,
    FlaskConical: mockIcon,
    Folder: mockIcon,
    FolderOpen: mockIcon,
    FolderPlus: mockIcon,
    Footprints: mockIcon,
    Frown: mockIcon,
    GitBranch: mockIcon,
    GitCommit: mockIcon,
    GitMerge: mockIcon,
    GitPullRequest: mockIcon,
    Globe: mockIcon,
    Hash: mockIcon,
    Heart: mockIcon,
    HelpCircle: mockIcon,
    History: mockIcon,
    Home: mockIcon,
    Hospital: mockIcon,
    Image: mockIcon,
    Info: mockIcon,
    Languages: mockIcon,
    LayoutDashboard: mockIcon,
    Lightbulb: mockIcon,
    LineChart: mockIcon,
    Link: mockIcon,
    Loader: mockIcon,
    LoaderCircle: mockIcon,
    Lock: mockIcon,
    LogIn: mockIcon,
    LogOut: mockIcon,
    Mail: mockIcon,
    Map: mockIcon,
    MapPin: mockIcon,
    Maximize2: mockIcon,
    Menu: mockIcon,
    MessageSquare: mockIcon,
    Mic: mockIcon,
    Minimize2: mockIcon,
    Minus: mockIcon,
    MinusCircle: mockIcon,
    Moon: mockIcon,
    MoreHorizontal: mockIcon,
    MoreVertical: mockIcon,
    Navigation: mockIcon,
    Paperclip: mockIcon,
    Pause: mockIcon,
    Phone: mockIcon,
    PieChart: mockIcon,
    Pill: mockIcon,
    Play: mockIcon,
    Plus: mockIcon,
    PlusCircle: mockIcon,
    Printer: mockIcon,
    RefreshCw: mockIcon,
    RotateCw: mockIcon,
    Save: mockIcon,
    Search: mockIcon,
    Send: mockIcon,
    Server: mockIcon,
    Settings: mockIcon,
    Share2: mockIcon,
    Shield: mockIcon,
    ShieldCheck: mockIcon,
    ShoppingBag: mockIcon,
    ShoppingCart: mockIcon,
    Signal: mockIcon,
    SkipBack: mockIcon,
    SkipForward: mockIcon,
    Smartphone: mockIcon,
    Smile: mockIcon,
    Square: mockIcon,
    Star: mockIcon,
    Stethoscope: mockIcon,
    Store: mockIcon,
    Sun: mockIcon,
    Syringe: mockIcon,
    Terminal: mockIcon,
    ThumbsDown: mockIcon,
    ThumbsUp: mockIcon,
    Trash2: mockIcon,
    TrendingDown: mockIcon,
    TrendingUp: mockIcon,
    Trophy: mockIcon,
    Unlock: mockIcon,
    Upload: mockIcon,
    UploadCloud: mockIcon,
    User: mockIcon,
    UserCircle: mockIcon,
    UserMinus: mockIcon,
    UserPlus: mockIcon,
    Users: mockIcon,
    UtensilsCrossed: mockIcon,
    Video: mockIcon,
    Volume2: mockIcon,
    Wifi: mockIcon,
    WifiOff: mockIcon,
    Wrench: mockIcon,
    X: mockIcon,
    XCircle: mockIcon,
  };
});

// Mock @ngx-translate/core - MUST be here for proper hoisting
vi.mock('@ngx-translate/core', async () => {
  const { BehaviorSubject, of } = await import('rxjs');

  class MockTranslateService {
    currentLang = 'es';
    defaultLang = 'es';
    onLangChange = new BehaviorSubject({ lang: 'es', translations: {} });
    onTranslationChange = new BehaviorSubject({ lang: 'es', translations: {} });
    onDefaultLangChange = new BehaviorSubject({ lang: 'es', translations: {} });

    private langs = ['es', 'en'];
    private translations: Record<string, any> = {};

    get(key: string | string[], interpolateParams?: any) {
      if (Array.isArray(key)) {
        const result: Record<string, string> = {};
        key.forEach(k => {
          result[k] = this.instant(k, interpolateParams);
        });
        return of(result);
      }
      return of(this.instant(key, interpolateParams));
    }

    instant(key: string | string[], interpolateParams?: any): any {
      if (Array.isArray(key)) {
        const result: Record<string, string> = {};
        key.forEach(k => {
          result[k] = this.processTranslation(k, interpolateParams);
        });
        return result;
      }
      return this.processTranslation(key, interpolateParams);
    }

    stream(key: string | string[], interpolateParams?: any) {
      return this.get(key, interpolateParams);
    }

    use(lang: string) {
      this.currentLang = lang;
      this.onLangChange.next({ lang, translations: this.translations[lang] || {} });
      return of(this.translations[lang] || {});
    }

    setDefaultLang(lang: string): void {
      this.defaultLang = lang;
      this.onDefaultLangChange.next({ lang, translations: this.translations[lang] || {} });
    }

    addLangs(langs: string[]): void {
      this.langs = [...new Set([...this.langs, ...langs])];
    }

    getLangs(): string[] {
      return this.langs;
    }

    getBrowserLang(): string {
      return 'es';
    }

    getBrowserCultureLang(): string {
      return 'es-ES';
    }

    setTranslation(lang: string, translations: any, shouldMerge = false): void {
      if (shouldMerge && this.translations[lang]) {
        this.translations[lang] = { ...this.translations[lang], ...translations };
      } else {
        this.translations[lang] = translations;
      }
      this.onTranslationChange.next({ lang, translations: this.translations[lang] });
    }

    getTranslation(lang: string) {
      return of(this.translations[lang] || {});
    }

    reloadLang(lang: string) {
      return of(this.translations[lang] || {});
    }

    resetLang(lang: string): void {
      this.translations[lang] = {};
    }

    private processTranslation(key: string, interpolateParams?: any): string {
      let translation = this.translations[this.currentLang]?.[key] || key;

      if (interpolateParams && typeof translation === 'string') {
        Object.keys(interpolateParams).forEach(param => {
          translation = translation.replace(
            new RegExp(`{{\\s*${param}\\s*}}`, 'g'),
            interpolateParams[param]
          );
        });
      }

      return translation;
    }
  }

  const { Pipe, NgModule, inject } = await import('@angular/core');

  // Mock TranslatePipe
  @Pipe({
    name: 'translate',
    standalone: true,
    pure: false,
  })
  class MockTranslatePipe implements PipeTransform {
    private translateService = inject(MockTranslateService);

    transform(value: string): string {
      return this.translateService.instant(value);
    }
  }

  // Mock TranslateModule
  @NgModule({
    imports: [MockTranslatePipe],
    exports: [MockTranslatePipe],
    providers: [MockTranslateService],
  })
  class MockTranslateModule {
    static forRoot(_config?: any) {
      return {
        ngModule: MockTranslateModule,
        providers: [
          { provide: MockTranslateService, useClass: MockTranslateService },
          { provide: 'TranslateService', useClass: MockTranslateService },
        ],
      };
    }

    static forChild(_config?: any) {
      return MockTranslateModule.forRoot(_config);
    }
  }

  // Mock TranslateLoader
  class MockTranslateLoader {
    getTranslation(lang: string) {
      return of({});
    }
  }

  return {
    TranslateService: MockTranslateService,
    TranslatePipe: MockTranslatePipe,
    TranslateModule: MockTranslateModule,
    TranslateLoader: MockTranslateLoader,
  };
});

// ============================================================================
// 1. POLYFILLS (deben cargarse primero)
// ============================================================================
import './polyfills';

// ============================================================================
// 3. ANGULAR TESTBED Y COMPATIBILIDAD
// ============================================================================
import {
  initializeTestBed,
  createLocalStorageMock,
  MockIonicValueAccessor,
  jasmineCompatibility,
  jasmineMatchers,
  expectAsync,
  createSpyOn,
  MockTranslateService,
  MockTranslatePipe,
  MockTranslateModule,
  MockTranslateLoader,
  provideTranslateServiceMock,
} from './mocks/angular.mock';

// Mock IndexedDB para Dexie
import 'fake-indexeddb/auto';

// Inicializar TestBed
initializeTestBed();

// Configurar localStorage
const localStorageMock = createLocalStorageMock();
Object.defineProperty(window, 'localStorage', { value: localStorageMock, writable: true });
Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
  configurable: true,
});

// ============================================================================
// 4. COMPATIBILIDAD GLOBAL JASMINE/JEST
// ============================================================================

// Alias jest como vi globalmente
const jestCompat = {
  ...vi,
  mock: vi.mock,
  spyOn: vi.spyOn,
  fn: vi.fn,
  clearAllMocks: vi.clearAllMocks,
  resetAllMocks: vi.resetAllMocks,
  restoreAllMocks: vi.restoreAllMocks,
  Mock: vi.fn().constructor,
};
(global as typeof globalThis & { jest: typeof jestCompat }).jest = jestCompat;

// Hacer jasmine globalmente disponible
(global as any).jasmine = jasmineCompatibility;

// Hacer expectAsync globalmente disponible
(global as any).expectAsync = expectAsync;

// Hacer spyOn globalmente disponible
(global as any).spyOn = createSpyOn();

// Extender expect con matchers de Jasmine
expect.extend(jasmineMatchers);

// Exportar MockIonicValueAccessor para módulos de test
(globalThis as any).MockIonicValueAccessor = MockIonicValueAccessor;

// ============================================================================
// 5. SUPRIMIR WARNINGS DE CONSOLA
// ============================================================================

const originalConsoleWarn = console.warn;
console.warn = (...args: unknown[]) => {
  // Filtrar warnings conocidos que hacen ruido
  const message = args[0]?.toString() || '';
  if (
    message.includes('NG0') || // Warnings de Angular
    message.includes('Ionic') ||
    message.includes('deprecated')
  ) {
    return;
  }
  originalConsoleWarn.apply(console, args);
};

// ============================================================================
// EXPORTS
// ============================================================================

export * from './mocks/angular.mock';
export * from './helpers/async.helper';

// Re-export para fácil acceso
export {
  MockTranslateService,
  MockTranslatePipe,
  MockTranslateModule,
  MockTranslateLoader,
  provideTranslateServiceMock,
};

// ============================================================================
// DECLARACIONES TYPESCRIPT GLOBALES
// ============================================================================

declare global {
  namespace jasmine {
    type SpyObj<T> = any;

    function createSpyObj<T = any>(
      baseName: string,
      methodNames: (keyof T)[] | string[],
      propertyValues?: Partial<T>
    ): SpyObj<T>;

    function createSpy(name?: string): any;
    function objectContaining(expected: any): any;
    function arrayContaining(expected: any[]): any;
    function any(constructor: any): any;
    function stringMatching(pattern: string | RegExp): any;
  }

  function spyOn<T extends object, M extends keyof T>(
    object: T,
    method: M
  ): any & {
    and: {
      returnValue: (value: any) => any;
      callFake: (fn: any) => any;
      callThrough: () => any;
      throwError: (error: any) => any;
      resolveTo: (value: any) => any;
      rejectWith: (error: any) => any;
    };
    calls: {
      mostRecent: () => { args: any[]; returnValue?: any };
      all: () => Array<{ args: any[]; returnValue?: any }>;
      count: () => number;
      reset: () => void;
      first: () => { args: any[]; returnValue?: any };
    };
  };

  function expectAsync(promise: Promise<any>): {
    toBeResolved: () => Promise<void>;
    toBeRejected: () => Promise<void>;
    toBeResolvedTo: (expected: any) => Promise<void>;
    toBeRejectedWith: (expected: any) => Promise<void>;
    toBeRejectedWithError: (expectedType?: any, expectedMessage?: string | RegExp) => Promise<void>;
  };

  type DoneFn = () => void;
}

interface CustomMatchers<R = unknown> {
  toBeTrue(): R;
  toBeFalse(): R;
  toHaveBeenCalledBefore(expected: any): R;
}

declare module 'vitest' {
  interface Assertion<T = any> extends CustomMatchers<T> {}
  interface AsymmetricMatchersContaining extends CustomMatchers {}
}
