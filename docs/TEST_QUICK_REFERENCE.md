# Test Quick Reference Card

**Print this or bookmark for quick access during test writing**

---

## Service Test Template

```typescript
describe('MyService', () => {
  let service: MyService;
  let mockHttp = MockFactory.createHttpClientMock();

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [MyService, { provide: HttpClient, useValue: mockHttp }],
    });
    service = TestBed.inject(MyService);
    clearServiceCache(service);
  });

  it('should create', () => {
    expect(service).toBeTruthy();
  });

  it('should do X', async () => {
    mockHttp.get.mockReturnValue(of({ data: 'test' }));
    const result = await service.getData();
    expect(result).toBeDefined();
  });
});
```

---

## Component Test Template

```typescript
describe('MyComponent', () => {
  let component: MyComponent;
  let fixture: ComponentFixture<MyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MyComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(MyComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display value', () => {
    component.value = 'Test';
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Test');
  });
});
```

---

## Common Imports

```typescript
// Core testing
import { TestBed, ComponentFixture, fakeAsync, tick } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

// RxJS
import { of, throwError } from 'rxjs';
import { firstValueFrom } from 'rxjs';

// Factories & Helpers
import { MockFactory } from '../tests/helpers/mock-factory';
import {
  TestDataFactory,
  resetBehaviorSubject,
  clearServiceCache,
} from '../tests/helpers/test-isolation.helper';
```

---

## Test Data

```typescript
// User
const user = TestDataFactory.mockLocalUser({ email: 'test@example.com' });

// Glucose reading
const reading = TestDataFactory.mockGlucoseReading({ value: 120 });

// Appointment
const apt = TestDataFactory.mockAppointment({ status: 'pending' });

// API response
const response = TestDataFactory.mockApiResponse({ users: [] });

// API error
const error = TestDataFactory.mockApiError(500, 'Server error');

// Readings for date range
const readings = TestDataFactory.mockReadingsForDateRange(30);
```

---

## Mock Creation

```typescript
// HTTP Client
const mockHttp = MockFactory.createHttpClientMock();

// Database
const mockDb = MockFactory.createDatabaseMock();

// Services
const mockAuth = MockFactory.createLocalAuthMock();
const mockProfile = MockFactory.createProfileServiceMock();
const mockReadings = MockFactory.createReadingsServiceMock();
const mockAppointments = MockFactory.createAppointmentServiceMock();

// All at once
const allMocks = MockFactory.createCompleteTestModule();
```

---

## Assertions

```typescript
// Basic
expect(value).toBe(true);
expect(array).toHaveLength(3);
expect(fn).toHaveBeenCalled();
expect(fn).toHaveBeenCalledWith('arg');

// Objects
expect(obj).toEqual({ name: 'Test' });
expect(obj).toMatchObject({ name: 'Test' });

// Arrays
expect(array).toContain(item);
expect(array).toEqual([1, 2, 3]);

// Strings
expect(text).toContain('substring');
expect(text).toMatch(/regex/);

// Observables
const value = await firstValueFrom(observable$);
expect(value).toBeDefined();

// Errors
try {
  await service.fail();
  fail('Should throw');
} catch (error) {
  expect(error).toBeDefined();
}
```

---

## Async Patterns

```typescript
// ✅ Recommended: async/await
it('should work', async () => {
  const result = await service.doSomething();
  expect(result).toBeDefined();
});

// Observable to promise
const value = await firstValueFrom(observable$);
expect(value).toBeDefined();

// Timer testing with fakeAsync
it('should refresh after timeout', fakeAsync(() => {
  service.startTimer(3600000);
  tick(3600000);
  expect(service.refreshed).toBe(true);
}));

// Wait for condition
await AsyncTestHelpers.waitForCondition(() => service.isReady);
```

---

## HTTP Testing

```typescript
// Setup mock
const mockHttp = MockFactory.createHttpClientMock();
mockHttp.get.mockReturnValue(of({ data: 'test' }));

// Test
service.getData();
expect(mockHttp.get).toHaveBeenCalledWith('http://api/data');

// Error
mockHttp.post.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));

try {
  await service.post();
} catch (error) {
  expect(error.status).toBe(500);
}
```

---

## State Reset

```typescript
// Reset observable state
resetBehaviorSubject(service.state$, initialState);

// Clear caches
clearServiceCache(service);

// Reset HTTP mocks
jest.clearAllMocks();

// Reset Capacitor mocks
await resetCapacitorMocks();
```

---

## DOM Helpers (Components)

```typescript
// Query
const el = fixture.nativeElement.querySelector('button');
const els = fixture.nativeElement.querySelectorAll('.item');

// Set input value
const input = fixture.nativeElement.querySelector('input');
input.value = 'test';
input.dispatchEvent(new Event('input'));
fixture.detectChanges();

// Click element
const button = fixture.nativeElement.querySelector('button');
button.click();
fixture.detectChanges();

// Get text
const text = fixture.nativeElement.textContent;
```

---

## Test Structure

```typescript
describe('Feature Name', () => {
  let service: MyService;

  // SETUP
  beforeEach(() => {
    TestBed.configureTestingModule({
      /* ... */
    });
    service = TestBed.inject(MyService);
  });

  // CLEANUP
  afterEach(() => {
    jest.clearAllMocks();
  });

  // GROUP 1
  describe('Group 1', () => {
    it('should do X', async () => {
      // ARRANGE
      const input = { value: 120 };

      // ACT
      const result = await service.process(input);

      // ASSERT
      expect(result).toBe(expected);
    });
  });

  // GROUP 2
  describe('Group 2', () => {
    it('should handle error', async () => {
      // Test error case
    });
  });
});
```

---

## ❌ DON'T (Anti-patterns)

```typescript
// ❌ Don't use done() callbacks
it('should work', done => {
  service.data$.subscribe(() => {
    expect(true).toBe(true);
    done();
  });
});

// ❌ Don't hardcode waits
await new Promise(r => setTimeout(r, 500));

// ❌ Don't skip tests in commits (unless documented)
it.skip('should work', () => {});

// ❌ Don't share state between tests
let service: MyService;
beforeEach(() => {
  // service not reset - state pollution!
});

// ❌ Don't use complex setup
beforeEach(() => {
  // 20 lines of setup - extract to helper!
});
```

---

## ✅ DO (Best Practices)

```typescript
// ✅ Use async/await
it('should work', async () => {
  const result = await service.doSomething();
  expect(result).toBeDefined();
});

// ✅ Reset state per test
beforeEach(() => {
  service = TestBed.inject(MyService);
  clearServiceCache(service);
});

// ✅ Descriptive test names
it('should return average glucose for 30-day period when readings exist', () => {});

// ✅ Test error paths
it('should reject invalid reading', async () => {
  try {
    await service.add(invalidReading);
    fail('Should throw');
  } catch (error) {
    expect(error).toBeDefined();
  }
});

// ✅ Use test builders
const reading = TestDataFactory.mockGlucoseReading({ value: 120 });
```

---

## Checklist Before Commit

- [ ] Test has descriptive name (what + when)
- [ ] Uses async/await (no done() callbacks)
- [ ] Happy path tested
- [ ] Error path tested
- [ ] State is reset (clearServiceCache, resetBehaviorSubject)
- [ ] Mocks are configured (MockFactory)
- [ ] No hardcoded waits (setTimeout)
- [ ] Assertions are clear
- [ ] All tests pass locally: `npm test`
- [ ] Coverage didn't decrease: `npm run test:coverage`

---

## Useful Commands

```bash
# Run all tests
npm test

# Watch mode (TDD)
npm run test:watch

# Specific test file
npm test -- --testPathPattern="service-name"

# Specific test
npm test -- --testNamePattern="should do X"

# Coverage report
npm run test:coverage

# Coverage for file
npm test -- --coverage --testPathPattern="service-name"

# E2E tests
npm run test:e2e

# Clear Jest cache
npm test -- --clearCache
```

---

**Last Updated**: December 13, 2025
**Print & Bookmark This!**
