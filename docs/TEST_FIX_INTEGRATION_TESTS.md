# Integration Test Fix Guide

## Overview

Integration tests in the `src/app/tests/integration/enhanced/` directory are failing due to improper module loading and timeouts when loading real Ionic components. This guide provides a comprehensive approach to fix these tests using mocks and proper test setup patterns.

### The Problem

The integration tests currently import full page modules (e.g., `AppointmentsPageModule`, `AppointmentDetailPageModule`) which attempt to load real Ionic components from CDN. This causes:

- **Timeout errors**: Jasmine times out waiting for components to load (default: 5 seconds)
- **Network dependencies**: Tests fail without internet connection
- **Slow execution**: Each test takes significantly longer than necessary
- **Flaky tests**: Network issues cause intermittent failures

### The Solution

Use the `setupTestBed()` helper from `src/app/tests/helpers/test-setup.helper.ts` to configure tests with mocked components and services. This approach:

- ✅ Loads instantly (no network calls)
- ✅ Uses `CUSTOM_ELEMENTS_SCHEMA` to handle Ionic elements
- ✅ Provides mocked services and controllers
- ✅ Works offline
- ✅ Runs fast and reliably

---

## Files to Fix

1. **`src/app/tests/integration/enhanced/appointments-interaction.spec.ts`**
   - Currently imports: `AppointmentsPageModule`, `AppointmentDetailPageModule`
   - Problem: Loads real Ionic components, causes timeout

2. **`src/app/tests/integration/enhanced/auth-user-journey.spec.ts`**
   - Currently imports: Standalone components (LoginPage, DashboardPage, TabsPage)
   - Problem: Less severe, but could benefit from proper mock setup

3. **`src/app/tests/integration/enhanced/theme-dom-interaction.spec.ts`**
   - Currently imports: SettingsPage standalone component
   - Problem: Works better than #1, but should use consistent patterns

---

## Common Fix Patterns

### Pattern 1: Remove Module Imports (Critical for appointments-interaction.spec.ts)

**❌ BEFORE (Causes timeout):**
```typescript
import { AppointmentsPageModule } from '../../../appointments/appointments.module';
import { AppointmentDetailPageModule } from '../../../appointments/appointment-detail/appointment-detail.module';

beforeEach(async () => {
  await TestBed.configureTestingModule({
    imports: [
      AppointmentsPageModule,           // ❌ Loads real Ionic components from CDN
      AppointmentDetailPageModule,      // ❌ Causes network timeouts
      HttpClientTestingModule,
      RouterTestingModule,
    ],
    providers: [...]
  }).compileComponents();
});
```

**✅ AFTER (Loads instantly):**
```typescript
import { setupTestBed } from '../../helpers/test-setup.helper';
import { AppointmentsPage } from '../../../appointments/appointments.page';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

beforeEach(async () => {
  const { testBed, mocks } = await setupTestBed({
    platform: 'android',
    declarations: [AppointmentsPage],     // ✅ Declare component directly
    providers: [
      { provide: AppointmentService, useValue: mockAppointmentService }
    ],
    routes: [
      { path: 'appointments', component: AppointmentsPage }
    ]
  });

  // Access mocks if needed
  appointmentService = TestBed.inject(AppointmentService);
  fixture = TestBed.createComponent(AppointmentsPage);
  component = fixture.componentInstance;
});
```

### Pattern 2: Use CUSTOM_ELEMENTS_SCHEMA

The `setupTestBed()` helper automatically adds `CUSTOM_ELEMENTS_SCHEMA` to allow Ionic elements (`<ion-*>`) without importing real Ionic modules.

**This is handled automatically by setupTestBed():**
```typescript
schemas: [CUSTOM_ELEMENTS_SCHEMA]  // ✅ Already included
```

### Pattern 3: Mock Ionic Controllers

Ionic controllers (ToastController, AlertController, ModalController, etc.) are automatically mocked by `setupTestBed()`.

```typescript
const { mocks } = await setupTestBed({...});

// Access and configure mocks
mocks.ionic.toastController.create.and.returnValue(Promise.resolve({
  present: jasmine.createSpy('present'),
  dismiss: jasmine.createSpy('dismiss')
}));

mocks.ionic.alertController.create.and.returnValue(Promise.resolve({
  present: jasmine.createSpy('present')
}));
```

### Pattern 4: Use fakeAsync for Timing Control

Integration tests often need to wait for async operations. Use `fakeAsync` with `tick()` to control timing:

```typescript
import { fakeAsync, tick, flush } from '@angular/core/testing';

it('should render appointment list', fakeAsync(() => {
  fixture.detectChanges();
  tick(100); // Allow time for async operations

  const compiled = fixture.nativeElement;
  const appointments = compiled.querySelectorAll('ion-card');
  expect(appointments.length).toBeGreaterThan(0);

  flush(); // Clear any pending timers
}));
```

### Pattern 5: Mock Service Dependencies

Create service mocks before calling `setupTestBed()`:

```typescript
beforeEach(async () => {
  // 1. Create service mocks
  appointmentService = jasmine.createSpyObj('AppointmentService', [
    'getAppointments',
    'createAppointment',
    'cancelAppointment',
    'shareGlucoseData'
  ]);

  appointmentService.getAppointments.and.returnValue(of(mockAppointments));

  // 2. Setup TestBed with mocks
  await setupTestBed({
    platform: 'android',
    declarations: [AppointmentsPage],
    providers: [
      { provide: AppointmentService, useValue: appointmentService }
    ]
  });

  // 3. Create component
  fixture = TestBed.createComponent(AppointmentsPage);
  component = fixture.componentInstance;
});
```

---

## Specific File Fixes

### 1. appointments-interaction.spec.ts (Priority: HIGH)

**Current State:** Lines 19-21
```typescript
import { AppointmentsPageModule } from '../../../appointments/appointments.module';
import { AppointmentDetailPageModule } from '../../../appointments/appointment-detail/appointment-detail.module';
```

**Recommended Changes:**

1. **Remove module imports:**
   ```typescript
   // ❌ REMOVE these lines:
   import { AppointmentsPageModule } from '../../../appointments/appointments.module';
   import { AppointmentDetailPageModule } from '../../../appointments/appointment-detail/appointment-detail.module';
   ```

2. **Add setupTestBed import:**
   ```typescript
   // ✅ ADD this line:
   import { setupTestBed } from '../../helpers/test-setup.helper';
   ```

3. **Replace beforeEach (around line 101-145):**

   **BEFORE:**
   ```typescript
   beforeEach(async () => {
     logger = new TestLogger('Appointments Interaction');
     networkMonitor = new NetworkMonitor();
     consoleCapture = new ConsoleErrorCapture();
     memoryDetector = new MemoryLeakDetector();

     logger.log('Setting up TestBed');
     consoleCapture.start();
     networkMonitor.start();
     memoryDetector.takeSnapshot('setup-start');

     // Create appointment service spy
     appointmentService = jasmine.createSpyObj('AppointmentService', [
       'getAppointments',
       'getAppointmentById',
       'createAppointment',
       'updateAppointment',
       'cancelAppointment',
       'shareGlucoseData',
       'revokeGlucoseShare',
       'refreshAppointments'
     ]);

     appointmentService.getAppointments.and.returnValue(of(mockAppointments));
     appointmentService.getAppointmentById.and.callFake((id: string) => {
       const appointment = mockAppointments.find(a => a.id === id);
       return of(appointment || null);
     });
     appointmentService.cancelAppointment.and.returnValue(of(void 0));
     appointmentService.shareGlucoseData.and.returnValue(of(void 0));

     await TestBed.configureTestingModule({
       imports: [
         AppointmentsPageModule,              // ❌ PROBLEM: Loads real Ionic
         AppointmentDetailPageModule,         // ❌ PROBLEM: Causes timeout
         RouterTestingModule.withRoutes([
           { path: 'appointments', component: AppointmentsPage },
           { path: 'appointments/:id', component: AppointmentDetailPage },
         ]),
         HttpClientTestingModule,
         getTranslateModuleForTesting(),
       ],
       providers: [
         { provide: AppointmentService, useValue: appointmentService },
         ApiGatewayService,
         ReadingsService,
       ],
       schemas: [CUSTOM_ELEMENTS_SCHEMA],
     }).compileComponents();

     fixture = TestBed.createComponent(AppointmentsPage);
     component = fixture.componentInstance;
     httpMock = TestBed.inject(HttpTestingController);

     logger.log('TestBed configured successfully');
     memoryDetector.takeSnapshot('setup-complete');
   });
   ```

   **AFTER:**
   ```typescript
   beforeEach(async () => {
     logger = new TestLogger('Appointments Interaction');
     networkMonitor = new NetworkMonitor();
     consoleCapture = new ConsoleErrorCapture();
     memoryDetector = new MemoryLeakDetector();

     logger.log('Setting up TestBed');
     consoleCapture.start();
     networkMonitor.start();
     memoryDetector.takeSnapshot('setup-start');

     // Create appointment service spy
     appointmentService = jasmine.createSpyObj('AppointmentService', [
       'getAppointments',
       'getAppointmentById',
       'createAppointment',
       'updateAppointment',
       'cancelAppointment',
       'shareGlucoseData',
       'revokeGlucoseShare',
       'refreshAppointments'
     ]);

     appointmentService.getAppointments.and.returnValue(of(mockAppointments));
     appointmentService.getAppointmentById.and.callFake((id: string) => {
       const appointment = mockAppointments.find(a => a.id === id);
       return of(appointment || null);
     });
     appointmentService.cancelAppointment.and.returnValue(of(void 0));
     appointmentService.shareGlucoseData.and.returnValue(of(void 0));

     // ✅ Use setupTestBed instead
     const { testBed, mocks } = await setupTestBed({
       platform: 'android',
       declarations: [AppointmentsPage, AppointmentDetailPage],  // ✅ Declare directly
       providers: [
         { provide: AppointmentService, useValue: appointmentService },
         ApiGatewayService,
         ReadingsService,
       ],
       routes: [
         { path: 'appointments', component: AppointmentsPage },
         { path: 'appointments/:id', component: AppointmentDetailPage },
       ]
     });

     fixture = TestBed.createComponent(AppointmentsPage);
     component = fixture.componentInstance;
     httpMock = TestBed.inject(HttpTestingController);

     logger.log('TestBed configured successfully');
     memoryDetector.takeSnapshot('setup-complete');
   });
   ```

4. **Update test expectations (if needed):**
   - Most tests should work as-is after the beforeEach change
   - If tests rely on specific Ionic component behavior, adjust expectations

### 2. auth-user-journey.spec.ts (Priority: MEDIUM)

**Current State:** Already uses standalone components (lines 74-94), which is better than modules.

**Recommended Changes:**

The current setup is acceptable, but for consistency with other integration tests, consider using `setupTestBed()`:

```typescript
beforeEach(async () => {
  logger = new TestLogger('Auth User Journey');
  networkMonitor = new NetworkMonitor();
  consoleCapture = new ConsoleErrorCapture();
  memoryDetector = new MemoryLeakDetector();

  logger.log('Setting up test environment');
  consoleCapture.start();
  networkMonitor.start();
  memoryDetector.takeSnapshot('setup-start');

  // Create auth service spy
  authService = jasmine.createSpyObj(
    'UnifiedAuthService',
    ['login', 'loginLocal', 'logout', 'isAuthenticated', 'getCurrentUser', 'getAccessToken'],
    {
      isAuthenticated$: of(false),
      currentUser$: of(null),
      authState$: of({
        isAuthenticated: false,
        provider: null,
        tidepoolAuth: null,
        localAuth: null,
        user: null,
      }),
    }
  );

  // ✅ Use setupTestBed for consistency
  const { testBed, mocks } = await setupTestBed({
    platform: 'android',
    declarations: [LoginPage, DashboardPage, TabsPage],
    providers: [
      { provide: UnifiedAuthService, useValue: authService },
      ProfileService,
      AuthGuard,
      TranslateService,
    ],
    routes: [
      { path: 'login', component: LoginPage },
      {
        path: 'tabs',
        component: TabsPage,
        children: [
          {
            path: 'dashboard',
            component: DashboardPage,
            canActivate: [AuthGuard],
          },
        ],
      },
    ]
  });

  router = TestBed.inject(Router);
  location = TestBed.inject(Location);

  logger.log('Test environment ready');
  memoryDetector.takeSnapshot('setup-complete');
});
```

### 3. theme-dom-interaction.spec.ts (Priority: LOW)

**Current State:** Already uses standalone components (lines 98-100), works reasonably well.

**Recommended Changes:**

Optional: Use `setupTestBed()` for consistency:

```typescript
beforeEach(async () => {
  logger = new TestLogger('Theme DOM Interaction');
  consoleCapture = new ConsoleErrorCapture();
  memoryDetector = new MemoryLeakDetector();

  logger.log('Setting up TestBed');
  consoleCapture.start();
  memoryDetector.takeSnapshot('setup-start');

  // Create mock services
  mockProfileService = jasmine.createSpyObj(
    'ProfileService',
    ['getProfile', 'updateProfile', 'updatePreferences'],
    { profile$: of(null) }
  );
  mockProfileService.getProfile.and.returnValue(Promise.resolve(null));
  mockProfileService.updatePreferences.and.returnValue(
    Promise.resolve({
      id: 'test-profile',
      preferences: {
        glucoseUnit: 'mg/dL',
        targetRange: { low: 70, high: 180 },
        language: 'en',
        notifications: { appointments: true, readings: true, reminders: true },
        theme: 'auto',
      },
    } as any)
  );

  mockAuthService = jasmine.createSpyObj('LocalAuthService', [
    'isAuthenticated',
    'getCurrentUser',
  ]);
  mockAuthService.isAuthenticated.and.returnValue(of(true));
  mockAuthService.getCurrentUser.and.returnValue({
    dni: '1000',
    name: 'Test User',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    preferences: {
      glucoseUnit: 'mg/dL',
      targetRange: { low: 70, high: 180 },
      language: 'en',
      notifications: { appointments: true, readings: true, reminders: true },
      theme: 'auto',
    },
  } as any);

  mockDemoDataService = jasmine.createSpyObj('DemoDataService', ['isDemoMode']);
  mockDemoDataService.isDemoMode.and.returnValue(false);

  // ✅ Use setupTestBed
  const { testBed, mocks } = await setupTestBed({
    platform: 'web',  // Theme tests can run on web
    declarations: [SettingsPage],
    providers: [
      ThemeService,
      { provide: ProfileService, useValue: mockProfileService },
      { provide: LocalAuthService, useValue: mockAuthService },
      { provide: DemoDataService, useValue: mockDemoDataService },
    ]
  });

  fixture = TestBed.createComponent(SettingsPage);
  component = fixture.componentInstance;
  themeService = TestBed.inject(ThemeService);

  logger.log('TestBed configured successfully');
  memoryDetector.takeSnapshot('setup-complete');
});
```

---

## Common Test Patterns

### Pattern: Async Component Initialization

Many integration tests need to wait for components to initialize and render:

```typescript
it('should render appointment list', fakeAsync(() => {
  // 1. Trigger change detection
  fixture.detectChanges();

  // 2. Wait for async operations (observables, promises)
  tick(100);

  // 3. Query DOM
  const compiled = fixture.nativeElement;
  const appointments = compiled.querySelectorAll('ion-card');

  // 4. Assert
  expect(appointments.length).toBe(3);

  // 5. Clean up pending timers
  flush();
}));
```

### Pattern: Testing User Interactions

```typescript
it('should handle pull-to-refresh', fakeAsync(() => {
  fixture.detectChanges();
  tick(100);

  const refresher = fixture.nativeElement.querySelector('ion-refresher');
  expect(refresher).toBeTruthy();

  // Trigger refresh event
  const event = new CustomEvent('ionRefresh', {
    detail: {
      complete: jasmine.createSpy('complete')
    }
  });

  refresher.dispatchEvent(event);
  tick(100);

  // Verify service was called
  expect(appointmentService.refreshAppointments).toHaveBeenCalled();

  flush();
}));
```

### Pattern: Testing Navigation

```typescript
it('should navigate to appointment detail', fakeAsync(() => {
  fixture.detectChanges();
  tick(100);

  const appointmentCard = fixture.nativeElement.querySelector('ion-card');
  appointmentCard.click();
  tick(100);

  expect(router.navigate).toHaveBeenCalledWith(['/appointments', '1']);

  flush();
}));
```

### Pattern: Testing Form Interactions

```typescript
it('should validate appointment form', fakeAsync(() => {
  fixture.detectChanges();
  tick(100);

  // Get form controls
  const dateInput = fixture.nativeElement.querySelector('#appointment-date');
  const timeInput = fixture.nativeElement.querySelector('#appointment-time');
  const reasonInput = fixture.nativeElement.querySelector('#appointment-reason');

  // Fill form
  dateInput.value = '2025-11-15';
  dateInput.dispatchEvent(new Event('input'));

  timeInput.value = '14:30';
  timeInput.dispatchEvent(new Event('input'));

  reasonInput.value = 'Test reason';
  reasonInput.dispatchEvent(new Event('input'));

  tick(100);
  fixture.detectChanges();

  // Check form validity
  expect(component.appointmentForm.valid).toBe(true);

  flush();
}));
```

---

## Troubleshooting

### Issue: Test still times out after changes

**Cause:** Other async operations or network calls

**Solution:**
1. Check for any remaining module imports
2. Ensure all services are mocked
3. Use `fakeAsync` and `tick()` to control timing
4. Check for real HTTP calls (should use HttpTestingController)

```typescript
afterEach(() => {
  httpMock.verify(); // Ensures no outstanding HTTP requests
});
```

### Issue: "Cannot find name 'setupTestBed'"

**Cause:** Missing import

**Solution:**
```typescript
import { setupTestBed } from '../../helpers/test-setup.helper';
```

### Issue: "Unknown element ion-*"

**Cause:** Missing CUSTOM_ELEMENTS_SCHEMA

**Solution:** `setupTestBed()` adds this automatically. If not using setupTestBed:
```typescript
schemas: [CUSTOM_ELEMENTS_SCHEMA]
```

### Issue: "Cannot read property 'create' of undefined" (Ionic controllers)

**Cause:** Ionic controllers not mocked

**Solution:** `setupTestBed()` provides mocked Ionic controllers:
```typescript
const { mocks } = await setupTestBed({...});

// Access mocks
mocks.ionic.toastController.create.and.returnValue(...);
mocks.ionic.alertController.create.and.returnValue(...);
mocks.ionic.modalController.create.and.returnValue(...);
```

### Issue: Component properties are undefined

**Cause:** Component not initialized or change detection not triggered

**Solution:**
```typescript
fixture.detectChanges();  // Trigger initialization
tick(100);                // Wait for async operations
```

---

## Best Practices

1. **Always use `fakeAsync` for integration tests:**
   - Provides control over async timing
   - Makes tests deterministic
   - Prevents flaky tests

2. **Always call `flush()` at end of fakeAsync tests:**
   ```typescript
   it('test', fakeAsync(() => {
     // test code
     flush(); // Clean up pending timers
   }));
   ```

3. **Mock all external dependencies:**
   - Services
   - HTTP calls
   - Ionic controllers
   - Browser APIs

4. **Use consistent test structure:**
   ```typescript
   describe('Feature', () => {
     beforeEach(async () => {
       // Setup
     });

     afterEach(() => {
       // Cleanup
       httpMock.verify();
     });

     it('should do something', fakeAsync(() => {
       // Arrange
       // Act
       // Assert
       flush();
     }));
   });
   ```

5. **Test one thing at a time:**
   - Each test should verify a single behavior
   - Use descriptive test names
   - Keep tests focused and simple

6. **Use the diagnostic helpers:**
   ```typescript
   const logger = new TestLogger('Feature Name');
   const consoleCapture = new ConsoleErrorCapture();
   const memoryDetector = new MemoryLeakDetector();
   const networkMonitor = new NetworkMonitor();

   beforeEach(() => {
     logger.log('Starting test');
     consoleCapture.start();
     networkMonitor.start();
     memoryDetector.takeSnapshot('start');
   });

   afterEach(() => {
     logger.log('Test complete');
     consoleCapture.getErrors().forEach(err => logger.error(err));
     memoryDetector.detectLeaks('start', 'end');
   });
   ```

---

## Summary

### Key Changes Required

1. **appointments-interaction.spec.ts (HIGH PRIORITY):**
   - Remove: `AppointmentsPageModule`, `AppointmentDetailPageModule` imports
   - Add: `setupTestBed` import
   - Replace: `TestBed.configureTestingModule` with `setupTestBed()`

2. **auth-user-journey.spec.ts (MEDIUM PRIORITY):**
   - Optional: Use `setupTestBed()` for consistency
   - Current implementation is acceptable

3. **theme-dom-interaction.spec.ts (LOW PRIORITY):**
   - Optional: Use `setupTestBed()` for consistency
   - Current implementation is acceptable

### Expected Results

After fixes:
- ✅ Tests run in <1 second (vs 5+ seconds with timeout)
- ✅ No network dependencies
- ✅ Reliable, deterministic results
- ✅ Works offline
- ✅ Consistent patterns across all integration tests

### Next Steps

1. Fix `appointments-interaction.spec.ts` first (highest impact)
2. Run tests: `npm run test -- --include='**/appointments-interaction.spec.ts'`
3. Verify tests pass
4. Apply same patterns to other integration tests if needed
5. Run full test suite: `npm run test:ci`

---

## Reference Files

- **Test setup helper:** `src/app/tests/helpers/test-setup.helper.ts`
- **Translation helper:** `src/app/tests/helpers/translate-test.helper.ts`
- **Test diagnostics:** `src/app/tests/helpers/test-diagnostics.ts`
- **Karma config:** `karma.conf.js`
- **Integration tests:** `src/app/tests/integration/enhanced/*.spec.ts`
