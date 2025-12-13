# Testing Guide - Diabetactic Angular/Ionic App

Quick reference for writing tests in this codebase. See `TEST_QUALITY_ANALYSIS.md` for comprehensive analysis.

---

## Quick Start

### Run Tests

```bash
# All tests
npm test

# Watch mode (for TDD)
npm run test:watch

# Specific test file
npm test -- --testPathPattern="profile.service"

# With coverage
npm run test:coverage

# E2E tests
npm run test:e2e
```

### Test File Structure

```
src/app/
├── core/
│   ├── services/
│   │   ├── my.service.ts
│   │   └── my.service.spec.ts  ← Place here
│   ├── models/
│   │   ├── my.model.ts
│   │   └── my.model.spec.ts    ← Place here
│   └── guards/
│       ├── auth.guard.ts
│       └── auth.guard.spec.ts  ← Place here
└── features/
    └── dashboard/
        ├── dashboard.page.ts
        └── dashboard.page.spec.ts  ← Place here
```

---

## Common Test Patterns

### Service Tests

**Basic service test template:**

```typescript
import { TestBed } from '@angular/core/testing';
import { MyService } from './my.service';
import { MockFactory } from '../tests/helpers/mock-factory';
import { resetBehaviorSubject, clearServiceCache } from '../tests/helpers/test-isolation.helper';

describe('MyService', () => {
  let service: MyService;
  let mockHttp = MockFactory.createHttpClientMock();

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [MyService, { provide: HttpClient, useValue: mockHttp }],
    });

    service = TestBed.inject(MyService);

    // Reset state between tests
    clearServiceCache(service);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should create the service', () => {
      expect(service).toBeTruthy();
    });
  });

  describe('main functionality', () => {
    it('should do something', async () => {
      // Arrange
      mockHttp.get.mockReturnValue(of({ data: 'test' }));

      // Act
      const result = await service.getData();

      // Assert
      expect(result.data).toBe('test');
    });
  });
});
```

### Component Tests

**Basic component test template:**

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MyComponent } from './my.component';

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

  describe('rendering', () => {
    it('should display input value', () => {
      component.value = 'Test';
      fixture.detectChanges();

      const compiled = fixture.nativeElement;
      expect(compiled.textContent).toContain('Test');
    });
  });
});
```

---

## Best Practices

### 1. Use async/await (NOT done callbacks)

```typescript
// ✅ PREFER: async/await
it('should work', async () => {
  const result = await service.doSomething();
  expect(result).toBeDefined();
});
```

### 2. Test Both Happy and Error Paths

```typescript
describe('addReading', () => {
  it('should add valid reading', async () => {
    const reading = { value: 120, time: new Date() };
    await service.addReading(reading);
    expect(mockDb.readings.add).toHaveBeenCalled();
  });

  it('should reject invalid reading', async () => {
    const reading = { value: -10, time: new Date() };
    try {
      await service.addReading(reading);
      fail('Should have thrown');
    } catch (error) {
      expect(error.message).toContain('invalid');
    }
  });
});
```

### 3. Use Descriptive Test Names

```typescript
// ✅ CLEAR: What is being tested and expected?
it('should return average glucose reading for 30-day period', () => { ... });
it('should throw error when date range is invalid', () => { ... });
```

---

## Helper Functions

### Test Isolation

```typescript
import {
  resetBehaviorSubject,
  clearServiceCache,
  TestDataFactory,
} from '../tests/helpers/test-isolation.helper';

// Reset state
resetBehaviorSubject(service.state$, initialValue);
clearServiceCache(service);

// Create test data
const user = TestDataFactory.mockLocalUser();
const reading = TestDataFactory.mockGlucoseReading();
const response = TestDataFactory.mockApiResponse({ data: [] });
```

### Mock Factory

```typescript
import { MockFactory } from '../tests/helpers/mock-factory';

const mockHttp = MockFactory.createHttpClientMock();
const mockDb = MockFactory.createDatabaseMock();
const mockAuth = MockFactory.createLocalAuthMock();
```

---

## Resources

- **Full Analysis**: `TEST_QUALITY_ANALYSIS.md`
- **Setup**: `setup-jest.ts`
- **Helpers**: `/src/app/tests/helpers/`
- **Examples**: Existing specs in `/src/app/core/services/`

**Last Updated**: December 13, 2025
