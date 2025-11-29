# Test Failures Analysis

**Date**: 2025-11-25
**Total Tests**: 854
**Failures**: 91 (89 after latest fix)
**Success**: 763

## Summary

The test failures fall into **5 main categories** with 3 root causes:

### Root Causes

1. **State Pollution** - Tests share state via service singletons and storage mocks
2. **Missing Mock Setup** - Mocks not properly configured for async timing
3. **Error Message Mismatches** - Tests expect specific error strings that implementation doesn't produce

---

## Failure Categories

### 1. TidepoolInterceptor (24 failures)

**Test File**: `src/app/core/interceptors/tidepool.interceptor.spec.ts`

**Failing Tests**:

- Request Filtering (2-3)
- Authorization Header (4-7)
- 401 Unauthorized Handling (8-10)
- Retry Logic with Exponential Backoff (11-17)
- Error Handler Integration (18-19)
- POST/PUT/DELETE Requests (20-22)
- Edge Cases (23-25)

**Root Cause**: **Missing `TidepoolAuthService` mock**

The interceptor depends on `TidepoolAuthService.getAccessToken()` and `refreshAccessToken()`. Tests likely:

- Don't provide proper mock for the auth service
- Auth service returns undefined/null instead of valid token
- Async timing issues with token refresh

**Fix Strategy**:

```typescript
beforeEach(() => {
  const mockTidepoolAuth = {
    getAccessToken: jasmine.createSpy().and.returnValue(Promise.resolve('mock-token')),
    refreshAccessToken: jasmine.createSpy().and.returnValue(Promise.resolve('new-token')),
    isAuthenticated: jasmine.createSpy().and.returnValue(of(true)),
  };

  TestBed.configureTestingModule({
    providers: [{ provide: TidepoolAuthService, useValue: mockTidepoolAuth }],
  });
});
```

---

### 2. AppointmentService (25 failures)

**Test File**: `src/app/core/services/appointment.service.spec.ts`

**Failing Tests**:

- getAppointments() Success Cases (26-29)
- getAppointments() Error Cases (30-38)
- getAppointment() Error Cases (39)
- createAppointment() Success/Error Cases (40-46)
- Edge Cases (47-50)

**Root Cause**: **ApiGatewayService mock not properly configured**

The service uses `ApiGatewayService` for HTTP calls. Issues:

- Mock not returning expected response format
- Error handling expects specific error structure
- Async operations completing in wrong order

**Fix Strategy**:

```typescript
const mockApiGateway = {
  get: jasmine.createSpy().and.returnValue(of({ data: mockAppointments })),
  post: jasmine.createSpy().and.returnValue(of({ data: mockAppointment })),
  handleError: jasmine.createSpy().and.callFake(error => throwError(() => error)),
};
```

---

### 3. DiabetacticDatabase (23 failures)

**Test File**: `src/app/core/services/database.service.spec.ts`

**Failing Tests**:

- Readings Table CRUD (51-53)
- SyncQueue Table CRUD (54-63)
- Appointments Table CRUD (64-75)

**Root Cause**: **IndexedDB (Dexie) isolation issues**

Database tests have problems:

- Tests don't properly reset database between runs
- Previous test data persists
- Async writes may complete after test ends

**Fix Strategy**:

```typescript
beforeEach(async () => {
  // Clear all tables before each test
  await db.readings.clear();
  await db.syncQueue.clear();
  await db.appointments.clear();
});

afterEach(async () => {
  // Ensure clean state
  await db.close();
});
```

---

### 4. ProfileService (14 failures)

**Test File**: `src/app/core/services/profile.service.spec.ts`

**Failing Tests**:

- getProfile() (76-80) - State pollution
- setTidepoolCredentials() (81-82) - SecureStorage mock issues
- getTidepoolCredentials() (83-85) - State pollution
- isTidepoolConnected() (86-87) - State pollution
- hasProfile() (88) - State pollution
- importProfile() (89) - Error message mismatch

**Root Cause**: **Test state pollution + Service singleton + Error message mismatch**

**Specific Issues**:

1. **State pollution**: Tests run in sequence and previous test creates profile that persists:

   ```
   Expected null but got { id: 'user_xxx', name: 'Export Test', ... }
   ```

2. **SecureStorage mock undefined**:

   ```
   Cannot read properties of undefined (reading 'returnValue')
   ```

3. **Error message mismatch**:
   ```
   Expected 'Invalid profile data: missing required fields'
   Got 'Invalid profile data'
   ```

**Fix Strategy**:

```typescript
// 1. Create fresh service for each test needing clean state
describe('Observables', () => {
  let freshService: ProfileService;

  beforeEach(() => {
    mockStorage.clear();
    mockSecureStorage.clear();
    TestBed.resetTestingModule();
    // Re-configure TestBed
    freshService = TestBed.inject(ProfileService);
  });
});

// 2. Fix SecureStorage spy setup
let secureStorageSpy: jasmine.SpyObj<typeof SecureStorage>;
beforeEach(() => {
  secureStorageSpy = jasmine.createSpyObj('SecureStorage', ['get', 'set', 'remove']);
  secureStorageSpy.get.and.returnValue(Promise.resolve(null));
});

// 3. Fix error message or update test expectation
it('should throw error on missing required fields', async () => {
  await expectAsync(service.importProfile(invalidProfile)).toBeRejectedWithError(
    /Invalid profile data/
  ); // Use regex
});
```

---

### 5. AuthInterceptor (1 failure)

**Test File**: `src/app/core/interceptors/auth.interceptor.spec.ts`

**Failing Test**:

- "should give up after max retries (3 attempts)"

**Root Cause**: **Timing issue with retry logic**

The test expects exactly 3 retry attempts but:

- Exponential backoff timing may not align with test timeout
- `fakeAsync`/`tick` not properly advancing time

**Fix Strategy**:

```typescript
it('should give up after max retries', fakeAsync(() => {
  // Setup 5xx error
  httpMock.expectOne(req => true).flush(null, { status: 500 });

  tick(1000); // First retry delay
  httpMock.expectOne(req => true).flush(null, { status: 500 });

  tick(2000); // Second retry delay (exponential)
  httpMock.expectOne(req => true).flush(null, { status: 500 });

  tick(4000); // Third retry delay
  // Verify error is thrown
}));
```

---

## Quick Fix Priority

1. **High Priority** (blocks most tests):
   - Fix TidepoolAuthService mock - unblocks 24 tests
   - Fix ApiGatewayService mock - unblocks 25 tests

2. **Medium Priority**:
   - Fix Database test isolation - unblocks 23 tests
   - Fix ProfileService state isolation - unblocks 14 tests

3. **Low Priority**:
   - Fix AuthInterceptor timing - 1 test

---

## Recommended Actions

### Option A: Quick Fix (Skip problematic tests)

Add `xdescribe` or `xit` to skip flaky tests temporarily:

```typescript
xdescribe('Problematic Suite', () => { ... });
```

### Option B: Fix Root Causes

1. Create proper test utilities:

   ```typescript
   // test-utils.ts
   export function createMockApiGateway() { ... }
   export function createMockTidepoolAuth() { ... }
   export function resetTestDatabase() { ... }
   ```

2. Use `TestBed.resetTestingModule()` between describe blocks

3. Ensure async operations complete with `fakeAsync`/`tick` or `waitForAsync`

### Option C: Use Separate Test Modules

Split tests into isolated modules that don't share state:

```typescript
// profile-basic.spec.ts - Basic CRUD
// profile-tidepool.spec.ts - Tidepool integration
// profile-observables.spec.ts - Observable behavior
```

---

## Test Files to Fix

| File                           | Failures | Priority |
| ------------------------------ | -------- | -------- |
| `tidepool.interceptor.spec.ts` | 24       | High     |
| `appointment.service.spec.ts`  | 25       | High     |
| `database.service.spec.ts`     | 23       | Medium   |
| `profile.service.spec.ts`      | 14       | Medium   |
| `auth.interceptor.spec.ts`     | 1        | Low      |

---

## Commands

```bash
# Run specific test file
npm test -- --include='**/profile.service.spec.ts'

# Run tests with verbose output
npm run test:unit -- --reporters=progress,kjhtml

# Run single test suite
npm test -- --include='**/appointment.service.spec.ts' --grep='getAppointments'
```
