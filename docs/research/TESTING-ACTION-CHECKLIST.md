# Angular 20 Testing Modernization - Action Checklist

**Goal**: Modernize Diabetify's testing infrastructure to align with Angular 20 (2025) best practices

**Estimated Total Effort**: 12-20 hours (across 1-2 sprints)

---

## 🔴 PRIORITY 1: Immediate Actions (This Week)

### ✅ Task 1: Remove Deprecated `waitForAsync` Pattern

**Effort**: 2 hours | **Impact**: High (remove deprecation warnings)

- [ ] **Search** for all `waitForAsync` usage:

  ```bash
  grep -r "waitForAsync" src/app --include="*.spec.ts"
  ```

- [ ] **Replace** with modern async pattern:

  ```typescript
  // Before
  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({ imports: [MyComponent] }).compileComponents();
  }));

  // After
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [MyComponent] }).compileComponents();
  });
  ```

- [ ] **Run tests** to validate no regressions:

  ```bash
  npm test
  ```

- [ ] **Commit** with message: `refactor(tests): replace waitForAsync with async/await`

**Files to Update**:

- `src/app/shared/components/stat-card/stat-card.component.spec.ts`
- (Add more as you find them with grep)

---

### ✅ Task 2: Add Unit Tests for Signal-Based Components

**Effort**: 4 hours | **Impact**: High (improve coverage, validate new patterns)

- [ ] **Create** missing test files:

  ```bash
  touch src/app/bolus-calculator/bolus-calculator.page.spec.ts
  ```

- [ ] **Implement** signal testing patterns:

  ```typescript
  import { ComponentFixture, TestBed } from '@angular/core/testing';
  import { BolusCalculatorPage } from './bolus-calculator.page';

  describe('BolusCalculatorPage', () => {
    let component: BolusCalculatorPage;
    let fixture: ComponentFixture<BolusCalculatorPage>;

    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [BolusCalculatorPage],
      }).compileComponents();

      fixture = TestBed.createComponent(BolusCalculatorPage);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('should create', () => {
      expect(component).toBeTruthy();
    });

    describe('Food Picker Modal', () => {
      it('should open food picker modal', () => {
        expect(component.showFoodPicker()).toBe(false);
        component.openFoodPicker();
        expect(component.showFoodPicker()).toBe(true);
      });

      it('should close food picker without applying', () => {
        component.showFoodPicker.set(true);
        component.onFoodPickerClosed();
        expect(component.showFoodPicker()).toBe(false);
      });
    });

    describe('Selected Foods', () => {
      it('should start with empty selection', () => {
        expect(component.selectedFoods()).toEqual([]);
      });

      it('should apply selected foods from picker', () => {
        const mockFoods = [{ id: '1', name: 'Apple', carbs: 15, servingSize: '1 medium' }];
        component.onFoodPickerApplied({ foods: mockFoods, totalCarbs: 15 });
        expect(component.selectedFoods()).toEqual(mockFoods);
      });
    });
  });
  ```

- [ ] **Verify** test coverage:

  ```bash
  npm run test:coverage
  ```

- [ ] **Commit**: `test(bolus-calculator): add unit tests for signal-based state`

---

### ✅ Task 3: Benchmark Current Test Performance

**Effort**: 30 minutes | **Impact**: Medium (establish baseline)

- [ ] **Time** current test suite:

  ```bash
  time npm test -- --passWithNoTests
  ```

- [ ] **Record** baseline metrics:

  ```
  Test Suites: ___
  Tests:       ___
  Time:        ___ seconds
  ```

- [ ] **Document** in `docs/research/test-performance-baseline.md`:

  ```markdown
  # Test Performance Baseline

  **Date**: 2025-12-06
  **Configuration**: Jest CommonJS, maxWorkers=2

  | Metric         | Value      |
  | -------------- | ---------- |
  | Total Tests    | 1099       |
  | Execution Time | \_\_\_ sec |
  | Test Suites    | \_\_\_     |
  | Avg Time/Test  | \_\_\_ ms  |
  ```

---

### ✅ Task 4: Document Jest-First Patterns in CLAUDE.md

**Effort**: 1 hour | **Impact**: High (guide future development)

- [ ] **Add** new section to CLAUDE.md:

  ```markdown
  ## Testing Best Practices (Angular 20)

  ### Signal Testing

  \`\`\`typescript
  // Testing signal state
  it('should update signal value', () => {
  component.mySignal.set('new value');
  expect(component.mySignal()).toBe('new value');
  });

  // Testing signal inputs (Angular 20+)
  fixture.componentRef.setInput('myInput', 'value');
  expect(component.myInput()).toBe('value');
  \`\`\`

  ### Jest Syntax (Preferred over Jasmine)

  \`\`\`typescript
  // ✅ PREFERRED: Pure Jest
  const mockService = { method: jest.fn().mockReturnValue('test') };

  // ❌ AVOID: Jasmine compatibility (legacy)
  const mockService = jasmine.createSpyObj('Service', ['method']);
  \`\`\`

  ### Modern Async Testing

  \`\`\`typescript
  // ✅ RECOMMENDED
  beforeEach(async () => {
  await TestBed.configureTestingModule({ imports: [MyComponent] }).compileComponents();
  });

  // ❌ DEPRECATED
  beforeEach(waitForAsync(() => { ... }));
  \`\`\`
  ```

- [ ] **Commit**: `docs(testing): add Angular 20 testing best practices`

---

## 🟡 PRIORITY 2: Short-Term Improvements (Next Sprint)

### ✅ Task 5: Test Jest ESM Mode

**Effort**: 4 hours | **Impact**: High (2-3x speed improvement)

- [ ] **Create** feature branch:

  ```bash
  git checkout -b feat/jest-esm-mode
  ```

- [ ] **Update** jest.config.js:

  ```javascript
  module.exports = {
    preset: 'jest-preset-angular/presets/defaults-esm', // ← ESM preset
    extensionsToTreatAsEsm: ['.ts'],
    moduleNameMapper: {
      '^(\\.{1,2}/.*)\\.js$': '$1', // Handle .js imports
      // ... keep existing mappings
    },
    transformIgnorePatterns: [
      'node_modules/(?!(@ionic|@stencil|@capacitor|@angular|rxjs|@ngx-translate|lucide-angular|dexie|tslib|@faker-js|ionicons)/)',
    ],
  };
  ```

- [ ] **Update** setup-jest.ts:

  ```typescript
  import { setupZoneTestEnv } from 'jest-preset-angular/setup-env/zone/testing-library';
  setupZoneTestEnv({ errorOnUnknownElements: true, errorOnUnknownProperties: true });
  ```

- [ ] **Test** full suite:

  ```bash
  npm test
  ```

- [ ] **Benchmark** performance:

  ```bash
  time npm test -- --passWithNoTests
  ```

- [ ] **Compare** results:
      | Mode | Time | Improvement |
      |------|------|-------------|
      | CommonJS | **_ sec | Baseline |
      | ESM | _** sec | \_\_\_% faster |

- [ ] **Document** findings in PR description

- [ ] **Decision**: Merge if all tests pass and speed improves

---

### ✅ Task 6: Audit TestBed Configuration for Optimization

**Effort**: 3 hours | **Impact**: Medium (faster test compilation)

- [ ] **Search** for over-imported modules:

  ```bash
  grep -r "HttpClientTestingModule\|RouterTestingModule" src/app --include="*.spec.ts"
  ```

- [ ] **Replace** with standalone providers:

  ```typescript
  // Before
  imports: [HttpClientTestingModule, RouterTestingModule];

  // After
  providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])];
  ```

- [ ] **Add** `NO_ERRORS_SCHEMA` to shallow component tests:

  ```typescript
  TestBed.configureTestingModule({
    imports: [ComponentUnderTest],
    schemas: [NO_ERRORS_SCHEMA], // Ignore child components
  });
  ```

- [ ] **Measure** impact on test execution time

- [ ] **Commit**: `refactor(tests): optimize TestBed configuration`

---

### ✅ Task 7: Evaluate Angular Testing Library (POC)

**Effort**: 4 hours | **Impact**: Medium (assess DX improvement)

- [ ] **Install** dependencies:

  ```bash
  npm install --save-dev @testing-library/angular @testing-library/user-event
  ```

- [ ] **Select** 2-3 component tests to rewrite:
  - `stat-card.component.spec.ts` (simple component)
  - `alert-banner.component.spec.ts` (medium complexity)

- [ ] **Rewrite** using Testing Library:

  ```typescript
  import { render, screen } from '@testing-library/angular';
  import userEvent from '@testing-library/user-event';

  it('should display stat value', async () => {
    await render(StatCardComponent, {
      componentInputs: { value: 120, label: 'Glucose' },
    });

    expect(screen.getByText('120')).toBeInTheDocument();
    expect(screen.getByText('Glucose')).toBeInTheDocument();
  });
  ```

- [ ] **Evaluate** developer experience:
  - [ ] Easier to write?
  - [ ] More readable?
  - [ ] Better error messages?
  - [ ] Less boilerplate?

- [ ] **Decision**: Adopt for new tests or stay with TestBed?

- [ ] **Document** decision in `docs/research/testing-library-evaluation.md`

---

## 🟢 PRIORITY 3: Long-Term Improvements (Future)

### ✅ Task 8: Gradual Migration from Jasmine to Jest Syntax

**Effort**: 20+ hours (spread over multiple sprints)

- [ ] **Add** ESLint rule to warn on Jasmine patterns in new files:

  ```json
  {
    "rules": {
      "no-restricted-globals": [
        "warn",
        { "name": "jasmine", "message": "Use jest.fn() instead of jasmine.createSpyObj()" }
      ]
    }
  }
  ```

- [ ] **Update** test template:

  ```typescript
  // Template for new test files
  describe('MyService', () => {
    let service: MyService;

    beforeEach(() => {
      TestBed.configureTestingModule({ providers: [MyService] });
      service = TestBed.inject(MyService);
    });

    it('should do something', () => {
      const mockFn = jest.fn().mockReturnValue('test'); // ✅ Jest syntax
      expect(mockFn()).toBe('test');
    });
  });
  ```

- [ ] **Migrate** tests incrementally (5-10 per sprint)

- [ ] **Track** progress:
  ```bash
  # Count Jasmine usage
  grep -r "jasmine.createSpyObj\|jasmine.createSpy" src/app --include="*.spec.ts" | wc -l
  ```

---

### ✅ Task 9: Add jest-axe for Unit-Level A11y Testing

**Effort**: 8 hours

- [ ] **Install** jest-axe:

  ```bash
  npm install --save-dev jest-axe
  ```

- [ ] **Configure** in setup-jest.ts:

  ```typescript
  import { toHaveNoViolations } from 'jest-axe';
  expect.extend(toHaveNoViolations);
  ```

- [ ] **Add** a11y tests to high-traffic components:

  ```typescript
  import { axe } from 'jest-axe';

  it('should have no accessibility violations', async () => {
    const { container } = await render(DashboardPage);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
  ```

- [ ] **Target components**:
  - [ ] dashboard.page.ts
  - [ ] readings.page.ts
  - [ ] appointments.page.ts
  - [ ] add-reading.page.ts

---

### ✅ Task 10: Investigate Vitest Migration Feasibility

**Effort**: 4 hours

- [ ] **Research** Vitest benefits for Angular 20:
  - Native ESM support (no transpilation)
  - Faster watch mode
  - Built-in UI dashboard
  - Vite ecosystem integration

- [ ] **Test** migration on small subset:

  ```bash
  npm install --save-dev vitest @vitest/ui
  ```

- [ ] **Compare** performance vs Jest ESM

- [ ] **Decision**: Migrate or stay on Jest?

- [ ] **Document** findings in `docs/research/vitest-evaluation.md`

---

## 📊 Progress Tracking

### Sprint 1 Checklist (Week 1)

- [ ] Task 1: Remove `waitForAsync` (2h)
- [ ] Task 2: Add signal tests (4h)
- [ ] Task 3: Benchmark performance (30m)
- [ ] Task 4: Update CLAUDE.md (1h)

**Total**: 7.5 hours

---

### Sprint 2 Checklist (Week 2)

- [ ] Task 5: Test Jest ESM mode (4h)
- [ ] Task 6: Optimize TestBed config (3h)
- [ ] Task 7: Evaluate Testing Library (4h)

**Total**: 11 hours

---

## ✅ Definition of Done

### For Each Task:

- [ ] Changes implemented and committed
- [ ] All tests passing (`npm test`)
- [ ] No new ESLint warnings
- [ ] Documentation updated (if applicable)
- [ ] PR created and reviewed (if significant)

### For Overall Modernization:

- [ ] All deprecated patterns removed
- [ ] Signal testing examples in CLAUDE.md
- [ ] Performance improvement documented (target: 2x faster)
- [ ] Team trained on new patterns

---

## 📚 Reference Materials

- **Full Research Report**: `docs/research/angular-20-testing-best-practices-2025.md`
- **Executive Summary**: `docs/research/ANGULAR-20-TESTING-SUMMARY.md`
- **This Checklist**: `docs/research/TESTING-ACTION-CHECKLIST.md`

---

## 🎯 Success Metrics

| Metric               | Baseline   | Target   | Achieved   |
| -------------------- | ---------- | -------- | ---------- |
| Test Execution Time  | \_\_\_ sec | < 20 sec | \_\_\_ sec |
| Tests Passing        | 1099       | 1099+    | \_\_\_     |
| Signal Test Coverage | 0%         | 100%     | \_\_\_%    |
| Deprecated Patterns  | \_\_\_%    | 0%       | \_\_\_%    |
| Jest Syntax Adoption | \_\_\_%    | 80%+     | \_\_\_%    |

---

**Last Updated**: 2025-12-06
**Next Review**: End of Sprint 2
