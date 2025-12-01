# LLM Test Triage & Speed Notes (2025‑11‑30)

This file is for future LLMs so they can fix tests quickly without re‑discovering known issues. See also `docs/TESTING_GUIDE.md` for general patterns.

---

## 1. Recommended Test Workflow

- **Fast feedback (unit only)**  
  `npm run test:unit -- --runInBand --maxWorkers=50%`

- **Targeted file while iterating**  
  `npx jest src/app/core/services/appointment.service.spec.ts --runInBand`

- **Integration tests only**  
  `npm run test:integration -- --runInBand`

- **Skip backend‑dependent suites during local dev**  
  Temporarily use `describe.skip` / `it.skip` in:
  - `src/app/tests/integration/backend/appointments-queue.integration.ts`
  - `src/app/tests/integration/backend/auth.integration.ts`
    until the backing services are running.

---

## 2. Current Unit Test Failures (Jest)

### 2.1 `src/app/core/services/appointment.service.spec.ts`

- **Root cause**  
  `AppointmentService.createAppointment` now always adds:
  - `scheduled_date` (may be `undefined`)
  - `reminder_minutes_before` (defaults to `30`)
    to the returned `Appointment`.

- **Symptoms**
  - `toEqual` failures where `createdAppointment` in the spec does not include these properties.
  - Timeouts caused by expectations never being satisfied (due to the mismatch).

- **Fix strategy (tests only)**
  - Either:
    - Update `createdAppointment`/other expected objects in the spec to include `scheduled_date` and `reminder_minutes_before: 30`, or
    - Switch to partial matching, e.g. `expect(appointment).toMatchObject({ ...createdAppointment, reminder_minutes_before: 30 })`.
  - Keep the service logic as‑is; tests should reflect the enriched model.

### 2.2 `src/app/core/services/tidepool-auth.service.spec.ts`

- **Root cause**  
  The spec mocks `@capacitor/app`, but `App.addListener` is still `undefined` when `TidepoolAuthService` runs its `initialize()` method.

- **Symptoms**
  - `TypeError: Cannot set properties of undefined (setting 'addListener')` when assigning `(App.addListener as jest.Mock) = ...`.

- **Fix strategy**
  - Ensure the Jest mock for `@capacitor/app` returns an object with `addListener` (and optionally `removeAllListeners`) before `TestBed` creates the service. Example pattern (in the spec only):
    - `jest.mock('@capacitor/app', () => ({ App: { addListener: jest.fn(), removeAllListeners: jest.fn() } }));`
  - Then you can override `App.addListener` inside `beforeEach` as the spec already attempts to do.

### 2.3 `src/app/settings/advanced/advanced.page.spec.ts`

- **Root cause**  
  `onAccountStateChange` expects a `CustomEvent`, but spec passes a plain object.

- **Symptoms**
  - TS2345: `{ detail: { value: string } }` is not assignable to `CustomEvent<any>`.

- **Fix strategy**
  - Change the test to construct a proper `CustomEvent`, or cast:
    - `const event = new CustomEvent('ionChange', { detail: { value: newState } });`
    - `component.onAccountStateChange(event as CustomEvent<{ value: string }>)`.

### 2.4 `src/app/core/utils/http-retry.util.spec.ts`

- **Root cause**  
  `SyncError.details` is typed as `Record<string, unknown>`, so property access triggers TS4111 in tests.

- **Symptoms**
  - Errors on `syncError.details?.stack` and `syncError.details?.name`.

- **Fix strategy**
  - In the spec, avoid dot access on `details`. Instead:
    - `expect(syncError.details && (syncError.details as any)['stack']).toBeDefined();`
    - `expect(syncError.details && (syncError.details as any)['name']).toBe('Error');`
  - No change needed in `http-retry.util.ts`.

### 2.5 `src/app/core/models/tidepool-sync.model.spec.ts`

- **Root cause**  
  `SyncError.details` is optional and an index signature (`Record<string, unknown>`).

- **Symptoms**
  - `error.details` possibly undefined, and TS4111 on `error.details.retryAfter`.

- **Fix strategy**
  - Guard and use bracket access:
    - `expect(error.details && (error.details as any)['retryAfter']).toBe(60);`

### 2.6 `src/app/readings/readings.page.spec.ts`

- **Root cause**  
  The `EmptyStateComponent` (used inside `ReadingsPageModule`) injects `ThemeService`, which calls `profileService.getProfile()`; the stubbed `ProfileService` in the spec does not define `getProfile`.

- **Symptoms**
  - `TypeError: this.profileService.getProfile is not a function` during component creation.

- **Fix strategy**
  - Extend `ProfileServiceStub` to include a `getProfile` method with the expected signature (likely `Promise` or observable returning a profile or `null`), or
  - Provide a mocked `ThemeService` in the test module that does nothing in `initialize()`.

---

## 3. Current Integration Test Issues (`npm run test:integration`)

### 3.1 `src/app/tests/integration/features/dashboard.integration.ts`

- **Root causes**
  - Imports `Appointment` from the service:  
    `import { AppointmentService, Appointment } from '../../../core/services/appointment.service';`  
    but `Appointment` is declared in and should come from `core/models/appointment.model`.
  - Test references to `DashboardPage.upcomingAppointment` and `DashboardPage.viewAppointmentDetails()` do not match the current implementation of `DashboardPage`.

- **Fix strategy**
  - Update import to:  
    `import { Appointment } from '../../../core/models/appointment.model';`
  - Either:
    - Align tests to the current dashboard behaviour (e.g. verifying what the page actually exposes now), or
    - If those features were intentionally removed, delete or rewrite the affected scenarios.

### 3.2 `src/app/tests/integration/features/profile-editing.integration.ts`

- **Root cause**
  - The spec assumes the settings page exposes:
    - `notificationSettings`
    - `privacySettings`
    - `syncSettings`
  - Actual `SettingsPage` uses:
    - `preferences` (with nested `notifications`)
    - `readingReminders`
    - internal state rather than those old structures.

- **Fix strategy**
  - Rewrite this integration suite to interact with:
    - `preferences.notifications` / `preferences.theme` etc.
    - `readingReminders`
  - Use the patterns documented in `docs/TESTING_GUIDE.md` for standalone components (import `SettingsPage` in `imports`, not `declarations`).

### 3.3 `src/app/tests/integration/components/readings-filtering.integration.ts`

- **Root cause**
  - `ReadingsPage` is a standalone component, but the spec puts it in `declarations` instead of `imports`.

- **Symptoms**
  - “Unexpected "ReadingsPage" found in the "declarations" array… is marked as standalone and can't be declared…”

- **Fix strategy**
  - Move `ReadingsPage` into `imports: [ReadingsPage, ...]` in `TestBed.configureTestingModule` and remove it from `declarations`.

### 3.4 `src/app/tests/integration/backend/appointments-backend.integration.ts`

- **Root cause**
  - Uses Jasmine’s `.withContext`, which Jest does not support.

- **Symptoms**
  - TS2339: `withContext` does not exist on `JestMatchers<boolean>`.

- **Fix strategy**
  - Replace lines like:  
    `expect(response.ok).withContext('...').toBe(true);`  
    with:
    ```ts
    expect(response.ok).toBe(true); // and log context via console.error if needed
    ```

### 3.5 Backend health‑check suites

- **Files**
  - `src/app/tests/integration/backend/appointments-queue.integration.ts`
  - `src/app/tests/integration/backend/auth.integration.ts`

- **Root cause**
  - Both rely on `waitForBackendServices` which polls health endpoints:
    - `http://localhost:8000/health` (apiGateway)
    - `http://localhost:8003/health` (login)
  - In a typical local/Jest environment, these services are not running.

- **Symptoms**
  - Repeated “service not healthy after 30 attempt(s)” messages.
  - Tests throw `Backend services unhealthy: ...` and fail after ~30s.

- **Fix strategy**
  - When you actually want backend integration:
    - Start the required services before running `npm run test:integration`.
  - For faster local/unit runs:
    - Temporarily skip these suites with `describe.skip` or guard them based on `process.env.BACKEND_E2E === 'true'`.
  - Do not silently change production code to accommodate tests; gate the tests instead.

---

## 4. Performance / Structure Tips

- Prefer **targeted runs** over full `npm test`:
  - Use `--testPathPattern` or direct file paths.
  - Keep `--runInBand` for Angular/JSDOM tests; parallel workers tend to cause higher memory and flaky behaviour.
- Keep **backend‑dependent integration tests** opt‑in:
  - Guard them behind an env variable so most CI/local jobs don’t pay the 30× health‑check penalty unless explicitly requested.
- When adding new tests:
  - Mock heavy services (Capacitor, ThemeService, TidepoolSyncService) at the boundary, following `docs/TESTING_GUIDE.md`.
  - Prefer Jest mocks for new code; Jasmine spies are kept only for legacy tests.

---

## 5. Playwright / E2E Status

- Playwright tests were not run in the last analysis.
- To run them realistically you need:
  - App dev server running (typically `npm start` / `ng serve`),
  - Backend or mocks configured to satisfy flows.
- See `docs/TESTING_GUIDE.md` and `playwright.config.ts` for base URL and options before enabling them in CI.
