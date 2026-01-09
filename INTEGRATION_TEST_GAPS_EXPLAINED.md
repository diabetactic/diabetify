# Missing Integration Test Categories - Detailed Explanation

## Overview

Integration tests verify that multiple services work together correctly. Unlike unit tests (which test services in isolation), integration tests ensure the **data flow and coordination between services** functions as expected.

**Current Status**: 39 integration tests exist, covering auth flow, readings sync, and offline behavior. However, 5 key categories are missing.

---

## 1. Profile Service Integration Tests

### What It Means

Tests that verify `ProfileService` coordinates correctly with multiple backend and storage services:

- `ProfileService` ↔ `ApiGatewayService` (backend API calls)
- `ProfileService` ↔ `LocalStorageService` (local persistence)
- `ProfileService` ↔ `DatabaseService` (IndexedDB for offline)

### Why It Matters

Profile data is critical for the app:

- **Glucose unit preference** (mg/dL vs mmol/L) affects ALL reading displays
- **Target ranges** determine glucose status calculations
- **User metadata** (name, DNI) used throughout the app

A bug in profile sync could cause:

- Wrong glucose unit conversions (dangerous!)
- Lost user preferences after app restart
- Sync conflicts between local and backend data

### Example Test Scenarios

```typescript
// Scenario 1: Update profile on backend and sync to local storage
it('should update profile on backend and persist locally', async () => {
  // 1. User changes glucose unit from mg/dL to mmol/L
  await profileService.updateProfile({ glucoseUnit: 'mmol/L' });

  // 2. Verify API call was made
  expect(apiGateway.request).toHaveBeenCalledWith('profile.update', ...);

  // 3. Verify local storage was updated
  const localProfile = await localStorage.getItem('profile');
  expect(localProfile.glucoseUnit).toBe('mmol/L');

  // 4. Verify service emits updated profile
  expect(profileService.profile$.value.glucoseUnit).toBe('mmol/L');
});

// Scenario 2: Handle profile update failure and rollback
it('should rollback local changes if backend update fails', async () => {
  const originalUnit = 'mg/dL';

  // 1. Mock backend failure
  apiGateway.request.mockRejectedValue(new Error('Network error'));

  // 2. Try to update profile
  await expect(profileService.updateProfile({ glucoseUnit: 'mmol/L' }))
    .rejects.toThrow('Network error');

  // 3. Verify local state was NOT changed
  expect(profileService.profile$.value.glucoseUnit).toBe(originalUnit);
});

// Scenario 3: Profile sync after login
it('should fetch and merge profile from backend after login', async () => {
  // 1. Login user
  await authService.login('1000', 'password');

  // 2. Verify profile was fetched from backend
  expect(apiGateway.request).toHaveBeenCalledWith('profile.get');

  // 3. Verify local profile was updated
  const profile = await profileService.getProfile();
  expect(profile.dni).toBe('1000');
});
```

### Current Gap

**Exists**: `auth-flow.integration.spec.ts` tests profile sync AFTER login  
**Missing**: Profile update operations, preference changes, conflict resolution

### Value Assessment

**HIGH VALUE** ⭐⭐⭐

- Affects critical functionality (glucose unit conversion)
- Profile bugs are hard to debug (state spread across multiple services)
- Relatively easy to implement (services already exist)

---

## 2. Appointment Frontend Service Integration Tests

### What It Means

Tests that verify `AppointmentService` (frontend) coordinates with:

- `DatabaseService` (offline queue persistence)
- `ApiGatewayService` (backend appointment CRUD)
- `SyncService` (retry failed appointments)

### Why It Matters

Appointments involve complex state management:

- **6 possible states**: NONE → PENDING → ACCEPTED → CREATED → RESOLVED (+ DENIED, BLOCKED)
- **Offline capability**: User can create appointment while offline
- **Sync queue**: Failed requests must retry when network returns

A bug could cause:

- Appointment request lost when offline
- Duplicate appointments after sync
- State desync between frontend and backend

### Example Test Scenarios

```typescript
// Scenario 1: Create appointment offline and sync when online
it('should persist appointment locally when offline and sync later', async () => {
  // 1. Simulate offline mode
  networkService.setOnline(false);

  // 2. User creates appointment
  await appointmentService.requestAppointment();

  // 3. Verify appointment saved to local DB
  const localQueue = await db.appointmentQueue.toArray();
  expect(localQueue).toHaveLength(1);
  expect(localQueue[0].synced).toBe(false);

  // 4. Go back online
  networkService.setOnline(true);
  await appointmentService.syncPendingAppointments();

  // 5. Verify appointment sent to backend
  expect(apiGateway.request).toHaveBeenCalledWith('appointments.request');

  // 6. Verify local queue cleared
  const updatedQueue = await db.appointmentQueue.toArray();
  expect(updatedQueue[0].synced).toBe(true);
});

// Scenario 2: Handle state transitions
it('should update local state when backend changes appointment status', async () => {
  // 1. User has PENDING appointment
  await appointmentService.requestAppointment();
  expect(appointmentService.queueState$.value).toBe('PENDING');

  // 2. Backend accepts appointment (simulated via polling or push)
  await appointmentService.checkQueueState();

  // 3. Verify state updated to ACCEPTED
  expect(appointmentService.queueState$.value).toBe('ACCEPTED');
});

// Scenario 3: Prevent duplicate appointments
it('should not allow second appointment when CREATED state exists', async () => {
  // 1. User has CREATED appointment
  await appointmentService.setState('CREATED');

  // 2. Try to request another appointment
  const canRequest = appointmentService.canRequestAppointment();
  expect(canRequest).toBe(false);

  // 3. Verify backend not called
  await appointmentService.requestAppointment().catch(() => {});
  expect(apiGateway.request).not.toHaveBeenCalled();
});
```

### Current Gap

**Exists**: Backend integration tests (appointment CRUD at API level)  
**Missing**: Frontend service coordination, offline queue, state management

### Value Assessment

**MEDIUM-HIGH VALUE** ⭐⭐½

- Appointments are less critical than glucose readings (lower usage frequency)
- But state management complexity warrants testing
- Already have 6 backend tests, frontend adds complementary coverage

---

## 3. Settings Service Integration Tests

### What It Means

Tests that verify `SettingsService` coordinates with:

- `Capacitor Preferences` (native storage plugin)
- `TranslationService` (language changes)
- `ThemeService` (dark mode toggle)
- App restart (persistence verification)

### Why It Matters

Settings must persist across:

- App restarts
- Language changes
- Theme changes
- Multiple tabs (if web version)

A bug could cause:

- Language resets to English on every app start
- Dark mode preference lost
- Glucose unit preference not applied

### Example Test Scenarios

```typescript
// Scenario 1: Persist theme preference across app restart
it('should restore theme preference after app restart', async () => {
  // 1. User enables dark mode
  await settingsService.setTheme('dark');

  // 2. Verify Capacitor Preferences updated
  const storedTheme = await Preferences.get({ key: 'theme' });
  expect(storedTheme.value).toBe('dark');

  // 3. Simulate app restart (reinitialize service)
  const newService = new SettingsService(...);
  await newService.loadSettings();

  // 4. Verify dark mode still active
  expect(newService.theme$.value).toBe('dark');
  expect(document.body.classList.contains('dark')).toBe(true);
});

// Scenario 2: Propagate language change to all components
it('should update all translations when language changes', async () => {
  // 1. App starts in English
  expect(translationService.currentLang).toBe('en');

  // 2. User changes to Spanish
  await settingsService.setLanguage('es');

  // 3. Verify TranslationService updated
  expect(translationService.currentLang).toBe('es');

  // 4. Verify Preferences updated
  const storedLang = await Preferences.get({ key: 'language' });
  expect(storedLang.value).toBe('es');

  // 5. Verify settings observable emitted change
  expect(settingsService.language$.value).toBe('es');
});

// Scenario 3: Glucose unit preference sync
it('should sync glucose unit between Settings and Profile services', async () => {
  // 1. User changes unit in profile settings
  await profileService.updatePreference('glucoseUnit', 'mmol/L');

  // 2. Verify settings service reflects change
  expect(settingsService.glucoseUnit$.value).toBe('mmol/L');

  // 3. Verify all reading displays update
  // (This would involve checking that components re-render)
});
```

### Current Gap

**Exists**: Individual service unit tests  
**Missing**: Cross-service coordination, persistence verification, app restart scenarios

### Value Assessment

**MEDIUM VALUE** ⭐⭐

- Settings are important for UX but less critical than health data
- Bugs are easy to spot (visual changes obvious)
- Manual testing often sufficient for UI settings
- **Recommendation**: Lower priority unless frequent bugs reported

---

## 4. Multi-Service Coordination Flows

### What It Means

Tests that verify **end-to-end data flows** involving 3+ services working together in sequence. Think of these as "integration integration tests" - testing the integration OF integrations.

### Why It Matters

Real user workflows involve multiple services:

- **Login flow**: AuthService → ProfileService → ReadingsService → DashboardUpdate
- **Logout flow**: AuthService → DatabaseService → LocalStorageService → NavigationService
- **Network restore**: NetworkService → SyncService → ReadingsService → AppointmentService

A bug in coordination could cause:

- Partial data sync (profile loaded but readings not fetched)
- Memory leaks (services not cleaned up on logout)
- Race conditions (dashboard displays before data loads)

### Example Test Scenarios

```typescript
// Scenario 1: Complete login flow
it('should orchestrate full login flow: auth → profile → readings → dashboard', async () => {
  // 1. User logs in
  await authService.login('1000', 'password');

  // 2. Verify auth token stored
  expect(authService.isAuthenticated).toBe(true);

  // 3. Verify profile fetched
  await waitFor(() => expect(profileService.profile$.value).toBeDefined());
  expect(profileService.profile$.value.dni).toBe('1000');

  // 4. Verify readings synced from backend
  await waitFor(() => expect(readingsService.readings$.value.length).toBeGreaterThan(0));

  // 5. Verify dashboard statistics calculated
  const stats = await dashboardService.getStatistics();
  expect(stats.averageGlucose).toBeGreaterThan(0);
});

// Scenario 2: Complete logout flow
it('should clear all data on logout: auth → db → storage → navigate', async () => {
  // Setup: User logged in with data
  await authService.login('1000', 'password');
  await readingsService.addReading({ value: 120, ... });

  // 1. User logs out
  await authService.logout();

  // 2. Verify token cleared
  expect(authService.isAuthenticated).toBe(false);

  // 3. Verify database cleared
  const readings = await db.readings.toArray();
  expect(readings).toHaveLength(0);

  // 4. Verify local storage cleared
  const profile = await localStorage.getItem('profile');
  expect(profile).toBeNull();

  // 5. Verify navigation to login
  expect(router.url).toBe('/login');
});

// Scenario 3: Network restore triggers sync cascade
it('should sync all services when network restored', async () => {
  // Setup: Offline with pending changes
  networkService.setOnline(false);
  await readingsService.addReading({ value: 130, ... });
  await appointmentService.requestAppointment();

  // 1. Network restored
  networkService.setOnline(true);

  // 2. Verify sync service triggered
  expect(syncService.isSyncing$.value).toBe(true);

  // 3. Verify readings synced
  await waitFor(() => {
    const unsynced = await readingsService.getUnsyncedReadings();
    expect(unsynced).toHaveLength(0);
  });

  // 4. Verify appointments synced
  await waitFor(() => {
    const appointment = await appointmentService.getCurrentAppointment();
    expect(appointment.synced).toBe(true);
  });
});

// Scenario 4: Token refresh cascades to failed requests
it('should retry failed requests after token refresh', async () => {
  // 1. Token expires during reading sync
  apiGateway.request.mockRejectedValueOnce({ status: 401 });

  // 2. Trigger sync
  const syncPromise = readingsService.syncWithBackend();

  // 3. Verify token refresh triggered
  await waitFor(() => expect(authService.isRefreshing).toBe(true));

  // 4. Verify original request retried after refresh
  await syncPromise;
  expect(apiGateway.request).toHaveBeenCalledTimes(2); // Original + retry
});
```

### Current Gap

**Exists**: Individual service integration tests (auth flow, readings sync)  
**Missing**: Cross-service orchestration, cascading effects, race condition scenarios

### Value Assessment

**MEDIUM-HIGH VALUE** ⭐⭐½

- Critical for catching coordination bugs
- Harder to test manually (timing-dependent)
- But: overlap with E2E tests (which also test full flows)
- **Recommendation**: Focus on scenarios E2E tests can't easily cover (race conditions, error cascades)

---

## 5. Error Recovery Integration Tests

### What It Means

Tests that verify the system **gracefully recovers** from failure scenarios involving multiple services:

- Network failures mid-operation
- Partial sync failures (some items succeed, others fail)
- Conflict resolution (local vs backend data mismatch)
- Retry logic with exponential backoff

### Why It Matters

Real-world failures are messy:

- Network drops mid-sync (3 of 10 readings uploaded)
- Backend rejects some data but accepts others
- User edits reading while sync is in progress (conflict!)

Without robust error recovery:

- Data loss (unsaved readings)
- Stuck sync queues
- App crashes or freezes

### Example Test Scenarios

```typescript
// Scenario 1: Partial sync failure with retry
it('should retry failed items and preserve successful syncs', async () => {
  // 1. Create 5 readings
  const readings = await Promise.all([
    readingsService.addReading({ value: 100, ... }),
    readingsService.addReading({ value: 120, ... }),
    readingsService.addReading({ value: 140, ... }),
    readingsService.addReading({ value: 160, ... }),
    readingsService.addReading({ value: 180, ... }),
  ]);

  // 2. Mock backend to fail readings 2 and 4
  apiGateway.request.mockImplementation((endpoint, { body }) => {
    if (body.value === 120 || body.value === 160) {
      return Promise.reject(new Error('Validation error'));
    }
    return Promise.resolve({ success: true });
  });

  // 3. Trigger sync
  await readingsService.performFullSync();

  // 4. Verify successful readings marked as synced
  const reading1 = await db.readings.get(readings[0].id);
  expect(reading1.synced).toBe(true);

  // 5. Verify failed readings still in queue
  const unsyncedReadings = await readingsService.getUnsyncedReadings();
  expect(unsyncedReadings).toHaveLength(2);
  expect(unsyncedReadings.map(r => r.value)).toEqual([120, 160]);

  // 6. Fix backend and retry
  apiGateway.request.mockResolvedValue({ success: true });
  await readingsService.retrySyncQueue();

  // 7. Verify all readings now synced
  const stillUnsynced = await readingsService.getUnsyncedReadings();
  expect(stillUnsynced).toHaveLength(0);
});

// Scenario 2: Conflict resolution (local edit during sync)
it('should resolve conflicts when local data changes during sync', async () => {
  // 1. Create reading
  const reading = await readingsService.addReading({ value: 130, ... });

  // 2. Start sync (don't await)
  const syncPromise = readingsService.syncWithBackend();

  // 3. User edits reading while sync in progress
  await readingsService.updateReading(reading.id, { value: 140 });

  // 4. Wait for sync to complete
  await syncPromise;

  // 5. Verify local edit preserved (not overwritten by sync)
  const updated = await db.readings.get(reading.id);
  expect(updated.value).toBe(140);

  // 6. Verify updated reading queued for re-sync
  const unsyncedReadings = await readingsService.getUnsyncedReadings();
  expect(unsyncedReadings.some(r => r.id === reading.id)).toBe(true);
});

// Scenario 3: Exponential backoff retry logic
it('should use exponential backoff when retrying failed syncs', async () => {
  // 1. Mock persistent backend failure
  let attemptCount = 0;
  const attemptTimestamps: number[] = [];

  apiGateway.request.mockImplementation(() => {
    attemptTimestamps.push(Date.now());
    attemptCount++;
    if (attemptCount < 4) {
      return Promise.reject(new Error('Network error'));
    }
    return Promise.resolve({ success: true });
  });

  // 2. Create reading and trigger sync with retry
  await readingsService.addReading({ value: 150, ... });
  await syncService.syncWithRetry();

  // 3. Verify retry attempts
  expect(attemptCount).toBe(4); // Initial + 3 retries

  // 4. Verify exponential backoff timing
  // Retry 1: ~1 second after initial
  // Retry 2: ~2 seconds after retry 1
  // Retry 3: ~4 seconds after retry 2
  const delays = attemptTimestamps.map((t, i) =>
    i > 0 ? t - attemptTimestamps[i-1] : 0
  );
  expect(delays[1]).toBeGreaterThanOrEqual(900); // ~1s
  expect(delays[2]).toBeGreaterThanOrEqual(1800); // ~2s
  expect(delays[3]).toBeGreaterThanOrEqual(3600); // ~4s
});

// Scenario 4: Network failure mid-transaction
it('should rollback local changes if network fails during multi-step sync', async () => {
  // 1. User creates appointment (multi-step: validate + create + update state)
  apiGateway.request
    .mockResolvedValueOnce({ valid: true }) // Step 1: validation succeeds
    .mockRejectedValueOnce(new Error('Network timeout')); // Step 2: create fails

  // 2. Try to create appointment
  await expect(appointmentService.createAppointment({ ... }))
    .rejects.toThrow('Network timeout');

  // 3. Verify local state rolled back (not stuck in CREATING state)
  expect(appointmentService.queueState$.value).toBe('ACCEPTED'); // Back to previous state

  // 4. Verify no partial data in database
  const appointments = await db.appointments.toArray();
  expect(appointments).toHaveLength(0);
});
```

### Current Gap

**Exists**: Some offline-online tests in `offline-online.integration.spec.ts`  
**Missing**: Partial failures, conflict resolution, exponential backoff, rollback scenarios

### Value Assessment

**HIGH VALUE** ⭐⭐⭐

- Critical for data integrity
- Very hard to test manually (timing-dependent, edge cases)
- Prevents data loss in production
- **Recommendation**: HIGH priority - implement after Profile integration tests

---

## Recommendations: Which Tests to Implement?

### Priority Matrix

| Category                       | Value  | Effort | Priority | Implement? |
| ------------------------------ | ------ | ------ | -------- | ---------- |
| **Profile Service**            | ⭐⭐⭐ | Low    | **HIGH** | ✅ YES     |
| **Error Recovery**             | ⭐⭐⭐ | Medium | **HIGH** | ✅ YES     |
| **Multi-Service Coordination** | ⭐⭐½  | Medium | MEDIUM   | ⚠️ PARTIAL |
| **Appointment Frontend**       | ⭐⭐½  | Low    | MEDIUM   | ⚠️ PARTIAL |
| **Settings Service**           | ⭐⭐   | Low    | LOW      | ❌ SKIP    |

### Recommended Implementation Plan

#### Phase 1: High Priority (Implement Now)

1. **Profile Service Integration** (~2-3 hours)
   - Test profile update + backend sync
   - Test preference changes (glucose unit)
   - Test profile fetch after login
   - Test rollback on failure

2. **Error Recovery Integration** (~3-4 hours)
   - Test partial sync failure + retry
   - Test conflict resolution (local edit during sync)
   - Test exponential backoff
   - Test rollback on multi-step failure

#### Phase 2: Medium Priority (Implement If Time Permits)

3. **Multi-Service Coordination** (~2 hours, PARTIAL)
   - Focus on: Token refresh cascade
   - Focus on: Network restore sync cascade
   - Skip: Login/logout flows (already covered by E2E tests)

4. **Appointment Frontend Service** (~2 hours, PARTIAL)
   - Focus on: Offline appointment creation + sync
   - Focus on: State transition handling
   - Skip: Duplicate prevention (already tested in E2E)

#### Phase 3: Low Priority (Skip for Now)

5. **Settings Service** (SKIP)
   - Manual testing sufficient
   - Low risk of regression
   - UI-focused (better suited for E2E)

### Why This Priority?

**Profile + Error Recovery** are highest value because:

- Affect critical health data (glucose readings, appointments)
- Hard to test manually (race conditions, partial failures)
- High risk of data loss or corruption if bugs exist
- Relatively easy to implement (services already exist)

**Settings** is lowest priority because:

- Bugs are immediately visible (easy to catch)
- Low risk (doesn't affect health data)
- Better suited for E2E testing (UI-focused)

---

## Implementation Guide

For each category, tests should be created in:

```
src/app/tests/integration/
├── profile-service.integration.spec.ts        (NEW)
├── error-recovery.integration.spec.ts         (NEW)
├── multi-service-coordination.integration.spec.ts (NEW - PARTIAL)
└── appointment-service.integration.spec.ts    (NEW - PARTIAL)
```

Each test file should:

1. Import necessary services
2. Mock external dependencies (API calls, storage)
3. Test data flow between services
4. Verify state consistency
5. Clean up after each test

**Test Structure Pattern**:

```typescript
import { TestBed } from '@angular/core/testing';
import { ProfileService } from '@services/profile.service';
import { ApiGatewayService } from '@services/api-gateway.service';

describe('Profile Service Integration', () => {
  let profileService: ProfileService;
  let apiGateway: jasmine.SpyObj<ApiGatewayService>;

  beforeEach(() => {
    const apiGatewaySpy = jasmine.createSpyObj('ApiGatewayService', ['request']);

    TestBed.configureTestingModule({
      providers: [ProfileService, { provide: ApiGatewayService, useValue: apiGatewaySpy }],
    });

    profileService = TestBed.inject(ProfileService);
    apiGateway = TestBed.inject(ApiGatewayService) as jasmine.SpyObj<ApiGatewayService>;
  });

  it('should update profile on backend and persist locally', async () => {
    // Test implementation...
  });
});
```

---

## Summary

**Missing integration tests explained:**

1. ✅ **Profile Service** - HIGH priority, affects critical glucose unit conversions
2. ✅ **Error Recovery** - HIGH priority, prevents data loss in production
3. ⚠️ **Multi-Service Coordination** - MEDIUM priority, partial implementation recommended
4. ⚠️ **Appointment Frontend** - MEDIUM priority, partial implementation recommended
5. ❌ **Settings Service** - LOW priority, skip for now

**Total estimated effort**: 7-9 hours for high + medium priority tests

**Recommendation**: Implement Profile + Error Recovery tests first (5-7 hours), then assess if Multi-Service tests add value beyond existing E2E coverage.
