/**
 * Test Setup Helper
 *
 * Centralized test configuration to eliminate boilerplate across test files
 * Automatically configures all mocks, imports, and providers
 */
import { TestBed, TestModuleMetadata } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { Routes } from '@angular/router';

// Import our mock helpers
import { setupCapacitorMocks } from './capacitor-mocks';
import { createAllIonicMocks } from './ionic-mocks';
import { createMockPlatformDetectorService } from './platform-mocks';
import { PlatformDetectorService } from '@core/services/platform-detector.service';

import { Observable, of } from 'rxjs';

/**
 * Simple fake translate loader that returns empty dictionaries.
 * This avoids HTTP calls during unit/integration tests.
 */
export class FakeTranslateLoader implements TranslateLoader {
  getTranslation(_: string): Observable<any> {
    return of({});
  }
}

/**
 * Test setup options
 */
export interface TestSetupOptions {
  /** Platform to mock (android, ios, web) */
  platform?: 'android' | 'ios' | 'web';

  /** Include HttpClientTestingModule */
  includeHttp?: boolean;

  /** Include Router via provideRouter */
  includeRouter?: boolean;

  /** Custom routes for provideRouter */
  routes?: Routes;

  /** Include TranslateModule */
  includeTranslate?: boolean;

  /** Include Ionic mocks */
  includeIonicMocks?: boolean;

  /** Include Capacitor mocks */
  includeCapacitorMocks?: boolean;

  /** Additional imports */
  imports?: any[];

  /** Additional providers */
  providers?: any[];

  /** Additional declarations */
  declarations?: any[];

  /** Schemas (default includes CUSTOM_ELEMENTS_SCHEMA) */
  schemas?: any[];
}

/**
 * Result from setupTestBed containing all mocks and helpers
 */
export interface TestSetupResult {
  /** Capacitor mocks (Preferences, Platform) */
  capacitorMocks: ReturnType<typeof setupCapacitorMocks> | null;

  /** Ionic mocks (Platform, NavController, etc.) */
  ionicMocks: ReturnType<typeof createAllIonicMocks> | null;

  /** Platform detector mock */
  platformDetector: jasmine.SpyObj<PlatformDetectorService>;

  /** HTTP testing controller (if includeHttp: true) */
  httpMock: HttpTestingController | null;

  /** TestBed instance */
  testBed: typeof TestBed;
}

/**
 * Setup TestBed with all common mocks and configurations
 *
 * This function eliminates test boilerplate by:
 * 1. Setting up Capacitor mocks (Preferences, Platform)
 * 2. Creating Ionic mocks (all controllers)
 * 3. Configuring platform detection
 * 4. Adding HttpClientTestingModule
 * 5. Adding provideRouter
 * 6. Adding TranslateModule with fake loader
 * 7. Adding CUSTOM_ELEMENTS_SCHEMA for ion-* components
 *
 * @param options Configuration options
 * @returns Object containing all mocks and TestBed
 *
 * @example
 * describe('MyComponent', () => {
 *   let component: MyComponent;
 *   let fixture: ComponentFixture<MyComponent>;
 *   let mocks: TestSetupResult;
 *
 *   beforeEach(async () => {
 *     mocks = await setupTestBed({
 *       platform: 'android',
 *       declarations: [MyComponent],
 *       providers: [MyService]
 *     });
 *
 *     fixture = TestBed.createComponent(MyComponent);
 *     component = fixture.componentInstance;
 *   });
 *
 *   it('should create', () => {
 *     expect(component).toBeTruthy();
 *   });
 *
 *   it('should use Android platform', () => {
 *     expect(mocks.platformDetector.getApiBaseUrl()).toBe('http://10.0.2.2:8000');
 *   });
 * });
 */
export async function setupTestBed(options: TestSetupOptions = {}): Promise<TestSetupResult> {
  const {
    platform = 'web',
    includeHttp = true,
    includeRouter = true,
    routes = [],
    includeTranslate = true,
    includeIonicMocks = true,
    includeCapacitorMocks = true,
    imports = [],
    providers = [],
    declarations = [],
    schemas = [CUSTOM_ELEMENTS_SCHEMA],
  } = options;

  // Setup Capacitor mocks BEFORE TestBed configuration
  const capacitorMocks = includeCapacitorMocks ? setupCapacitorMocks(platform) : null;

  // Create Ionic mocks
  const ionicMocks = includeIonicMocks ? createAllIonicMocks() : null;

  // Create platform detector mock
  const platformDetector = createMockPlatformDetectorService(platform);

  // Build TestBed configuration
  const config: TestModuleMetadata = {
    imports: [...imports],
    providers: [{ provide: PlatformDetectorService, useValue: platformDetector }, ...providers],
    declarations: [...declarations],
    schemas,
  };

  // Add HTTP testing module
  if (includeHttp) {
    config.imports!.push(HttpClientTestingModule);
  }

  // Add Router via provideRouter
  if (includeRouter) {
    config.providers!.push(provideRouter(routes));
  }

  // Add Translate module
  if (includeTranslate) {
    config.imports!.push(
      TranslateModule.forRoot({
        loader: { provide: TranslateLoader, useClass: FakeTranslateLoader },
      })
    );
  }

  // Add Ionic mocks to providers
  if (ionicMocks) {
    config.providers!.push(
      { provide: 'Platform', useValue: ionicMocks.platform },
      { provide: 'NavController', useValue: ionicMocks.navController },
      { provide: 'ModalController', useValue: ionicMocks.modalController },
      { provide: 'AlertController', useValue: ionicMocks.alertController },
      { provide: 'LoadingController', useValue: ionicMocks.loadingController },
      { provide: 'ToastController', useValue: ionicMocks.toastController },
      { provide: 'ActionSheetController', useValue: ionicMocks.actionSheetController },
      { provide: 'PopoverController', useValue: ionicMocks.popoverController }
    );
  }

  // Configure TestBed
  await TestBed.configureTestingModule(config).compileComponents();

  // Get HTTP mock if included
  const httpMock = includeHttp ? TestBed.inject(HttpTestingController) : null;

  return {
    capacitorMocks,
    ionicMocks,
    platformDetector,
    httpMock,
    testBed: TestBed,
  };
}

/**
 * Get TranslateModule configured for testing
 * Use this for components that use the translate pipe
 *
 * @example
 * TestBed.configureTestingModule({
 *   imports: [getTranslateModuleForTesting()],
 *   declarations: [MyComponent]
 * });
 */
export function getTranslateModuleForTesting() {
  return TranslateModule.forRoot({
    loader: { provide: TranslateLoader, useClass: FakeTranslateLoader },
  });
}

/**
 * Simplified setup for service tests
 * Use when you only need to test a service, not a component
 *
 * @example
 * const { service, mocks } = await setupServiceTest(MyService, { platform: 'android' });
 */
export async function setupServiceTest<T>(
  serviceClass: new (...args: any[]) => T,
  options: TestSetupOptions = {}
): Promise<{ service: T; mocks: TestSetupResult }> {
  const mocks = await setupTestBed({
    ...options,
    includeRouter: false,
    includeTranslate: false,
  });

  const service = TestBed.inject(serviceClass);

  return { service, mocks };
}

/**
 * Simplified setup for component tests
 * Use when you need a component with all standard mocks
 *
 * @example
 * const { component, fixture, mocks } = await setupComponentTest(MyComponent, {
 *   platform: 'ios',
 *   providers: [MyService]
 * });
 */
export async function setupComponentTest<T>(
  componentClass: new (...args: any[]) => T,
  options: TestSetupOptions = {}
): Promise<{ component: T; fixture: any; mocks: TestSetupResult }> {
  const mocks = await setupTestBed({
    ...options,
    declarations: [componentClass, ...(options.declarations || [])],
  });

  const fixture = TestBed.createComponent(componentClass);
  const component = fixture.componentInstance;

  return { component, fixture, mocks };
}

/**
 * Expect HTTP request helper
 * Simplifies HTTP mocking in tests
 *
 * @example
 * expectHttpRequest(mocks.httpMock, 'GET', '/api/data', { data: 'test' });
 */
export function expectHttpRequest(
  httpMock: HttpTestingController,
  method: string,
  url: string,
  responseData: any,
  status = 200
) {
  const req = httpMock.expectOne(request => {
    return request.method === method && request.url.includes(url);
  });

  req.flush(responseData, { status, statusText: status === 200 ? 'OK' : 'Error' });
}

/**
 * Wait for async operations to complete
 * Use in tests that need to wait for observables/promises
 *
 * @example
 * await waitForAsync(() => {
 *   service.getData().subscribe(data => {
 *     expect(data).toBeDefined();
 *   });
 * });
 */
export function waitForAsync(fn: () => void): Promise<void> {
  return new Promise(resolve => {
    fn();
    setTimeout(resolve, 0);
  });
}
