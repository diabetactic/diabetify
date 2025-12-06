# Angular 20 Testing Best Practices Research (2025)

**Research Date**: 2025-12-06
**Project**: Diabetify (Diabetactic)
**Current Stack**: Angular 20.3.14, Jest 29.7.0, 1099 passing unit tests

---

## Executive Summary

This research analyzes Angular 20 (2025) testing best practices from official documentation and community sources, comparing them against Diabetify's current testing implementation to identify:

1. **Top 5 best practices to adopt**
2. **Deprecated patterns to remove**
3. **New Angular 20 features we're not using**
4. **Standalone component architecture recommendations**

---

## 1. Angular 20 Testing Landscape (2025)

### Official Changes in Angular 20

**Key Breaking Changes**:

- `TestBed.flushEffects()` **DEPRECATED** → Use `TestBed.tick()` for effect flushing
- `TestBed.get()` **REMOVED** (deprecated since v9) → Automatic migration to `TestBed.inject()`
- `ng-reflect-*` attributes removed from production builds (testing anti-pattern)
- Default test runner: **Vitest** (but Jest fully supported)

**Sources**:

- [Angular Official Testing Guide](https://angular.dev/guide/testing/unit-tests)
- [What's new in Angular 20.0 - Ninja Squad](https://blog.ninja-squad.com/2025/05/28/what-is-new-angular-20.0)
- [Advanced Angular Testing in 2025](https://medium.com/@roshannavale7/advanced-angular-testing-in-2025-best-practices-for-robust-unit-and-e2e-testing-1a7e629e000b)

---

## 2. Top 5 Best Practices for Diabetify

### ✅ 1. Adopt `ComponentRef.setInput()` for Signal Inputs

**What**: Use `componentRef.setInput(name, value)` instead of wrapper components for testing signal inputs.

**Current State**: We use signals in `bolus-calculator.page.ts` but no unit tests exist yet:

```typescript
// src/app/bolus-calculator/bolus-calculator.page.ts
showFoodPicker = signal(false);
selectedFoods = signal<SelectedFood[]>([]);
```

**Best Practice Pattern**:

```typescript
// RECOMMENDED: Direct input setting (requires jest-preset-angular 14.0.4+)
it('should update signal input', () => {
  const fixture = TestBed.createComponent(MyComponent);
  fixture.componentRef.setInput('mySignalInput', 'new value');
  fixture.detectChanges();
  expect(fixture.componentInstance.mySignalInput()).toBe('new value');
});

// ALTERNATIVE: Angular Testing Library approach
render(MyComponent, {
  componentInputs: { mySignalInput: 'test value' },
});
```

**Action Required**:

- Verify jest-preset-angular version (need 14.0.4+)
- Add unit tests for `bolus-calculator.page.ts` using `setInput()` pattern
- Document signal testing pattern in CLAUDE.md

**Sources**:

- [Testing Signal Inputs - Rainer Hahnekamp](https://www.rainerhahnekamp.com/en/how-do-i-test-signal-model-inputs/)
- [Angular Testing Library with Signals](https://timdeschryver.dev/blog/testing-signals-with-angular-testing-library)

---

### ✅ 2. Replace `TestBed.flushEffects()` with `TestBed.tick()`

**What**: Angular 20 deprecated `flushEffects()` in favor of `TestBed.tick()` for effect execution.

**Current State**: No usage found in codebase (good!).

**Best Practice Pattern**:

```typescript
// ❌ OLD (deprecated in Angular 20)
TestBed.flushEffects();

// ✅ NEW (Angular 20+)
TestBed.tick();
```

**Action Required**:

- No migration needed (we're not using `flushEffects()`)
- Add linting rule to prevent future usage
- Update CLAUDE.md with effect testing guidance

**Sources**:

- [Angular 20 Breaking Changes](https://blog.ninja-squad.com/2025/05/28/what-is-new-angular-20.0)

---

### ✅ 3. Use `TestBed.overrideComponent()` for Standalone Component Mocking

**What**: Standalone components require `overrideComponent()` to mock dependencies (not `overrideProvider()`).

**Current State**: We use standalone components everywhere, but tests don't show consistent mocking patterns.

**Example from our codebase**:

```typescript
// src/app/shared/components/stat-card/stat-card.component.spec.ts
beforeEach(waitForAsync(() => {
  TestBed.configureTestingModule({
    imports: [StatCardComponent], // ✅ Correct: import standalone component
  }).compileComponents();

  fixture = TestBed.createComponent(StatCardComponent);
  component = fixture.componentInstance;
  fixture.detectChanges();
}));
```

**Best Practice Pattern**:

```typescript
// For mocking services provided in standalone component
TestBed.configureTestingModule({
  imports: [MyStandaloneComponent],
}).overrideComponent(MyStandaloneComponent, {
  remove: { providers: [RealService] },
  add: { providers: [{ provide: RealService, useValue: mockService }] },
});
```

**Action Required**:

- Audit all standalone component tests for service mocking patterns
- Add examples to CLAUDE.md for common mocking scenarios
- Consider adopting ng-mocks library for complex scenarios

**Sources**:

- [Testing Angular Standalone Components - ANGULARarchitects](https://www.angulararchitects.io/blog/testing-angular-standalone-components/)
- [ng-mocks Standalone Guide](https://ng-mocks.sudo.eu/guides/component-standalone)

---

### ✅ 4. Enable Jest ESM Mode for 100%+ Faster Tests

**What**: Switch to Jest ESM mode for significantly faster test execution (2-3x speed improvement).

**Current State**:

- Using CommonJS mode (standard jest-preset-angular)
- 1099 tests run in ~unknown time (need baseline)

**Configuration Changes Required**:

```javascript
// jest.config.js
module.exports = {
  preset: 'jest-preset-angular/presets/defaults-esm', // ← ESM preset
  transformIgnorePatterns: [
    'node_modules/(?!(@ionic|@stencil|@capacitor|@angular|rxjs|@ngx-translate|lucide-angular|dexie|tslib|@faker-js|ionicons)/)',
  ],
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1', // Handle .js imports in ESM
  },
};
```

```typescript
// setup-jest.ts
import { setupZoneTestEnv } from 'jest-preset-angular/setup-env/zone/testing-library'; // ESM setup
setupZoneTestEnv({ errorOnUnknownElements: true, errorOnUnknownProperties: true });
```

**Benchmark Data** (from research):

- Before: 50 seconds (1000 tests)
- After: 17 seconds (290% speed improvement!)

**Action Required**:

- Benchmark current test suite runtime
- Test ESM migration on feature branch
- Validate all mocks work in ESM mode
- Update CI pipeline if changes needed

**Sources**:

- [Jest ESM Total Guide - Angular Experts](https://angularexperts.io/blog/total-guide-to-jest-esm-and-angular/)
- [Testing Angular Faster with Jest](https://www.xfive.co/blog/testing-angular-faster-jest)

---

### ✅ 5. Optimize TestBed Configuration with Shallow Imports

**What**: Only import what you test; avoid full module imports for 40% faster test execution.

**Current State**: Mixed quality - some tests are optimized, others not.

**Example - GOOD** (from our codebase):

```typescript
// src/app/shared/components/stat-card/stat-card.component.spec.ts
TestBed.configureTestingModule({
  imports: [StatCardComponent], // ✅ Only the component under test
}).compileComponents();
```

**Example - NEEDS IMPROVEMENT**:

```typescript
// src/app/core/services/readings.service.spec.ts
TestBed.configureTestingModule({
  providers: [
    ReadingsService,
    { provide: DiabetacticDatabase, useValue: mockDb },
    { provide: MockDataService, useValue: null }, // ← Could optimize
    { provide: LIVE_QUERY_FN, useValue: mockLiveQuery },
  ],
});
```

**Best Practice Pattern**:

```typescript
// Shallow rendering for component tests
TestBed.configureTestingModule({
  imports: [ComponentUnderTest],
  schemas: [NO_ERRORS_SCHEMA], // ← Ignore child component errors
});

// Service tests - only mock what's needed
TestBed.configureTestingModule({
  providers: [
    ServiceUnderTest,
    { provide: DependencyA, useValue: mockA },
    // Don't mock unused dependencies
  ],
});
```

**Action Required**:

- Audit all service tests for unused providers
- Add `NO_ERRORS_SCHEMA` to component tests that don't need child validation
- Measure impact on test execution time

**Sources**:

- [Unit Testing Angular Components - CodeZup](https://codezup.com/unit-testing-angular-components-jest-spectator/)
- [Good Testing Practices with Angular Testing Library](https://timdeschryver.dev/blog/good-testing-practices-with-angular-testing-library)

---

## 3. Deprecated Patterns to Remove

### ❌ 1. `waitForAsync` in Standalone Component Tests

**Why Deprecated**: With standalone components and modern TestBed, `waitForAsync` is rarely needed.

**Current Usage**: Found in multiple files:

```typescript
// src/app/shared/components/stat-card/stat-card.component.spec.ts
beforeEach(waitForAsync(() => {
  TestBed.configureTestingModule({
    imports: [StatCardComponent],
  }).compileComponents();
}));
```

**Modern Pattern**:

```typescript
// ✅ RECOMMENDED: Synchronous setup (no waitForAsync needed)
beforeEach(async () => {
  await TestBed.configureTestingModule({
    imports: [StatCardComponent],
  }).compileComponents();
});

// OR for most cases, just:
beforeEach(() => {
  TestBed.configureTestingModule({
    imports: [StatCardComponent],
  });
});
```

**Why**: Standalone components don't require async compilation in most cases. Only use `async/await` if you have actual async setup logic.

**Action Required**:

- Audit all `waitForAsync` usage (global search)
- Replace with synchronous or `async/await` pattern
- Update test template in CLAUDE.md

**Sources**:

- [Angular Testing Library Examples](https://testing-library.com/docs/angular-testing-library/examples/)

---

### ❌ 2. Jasmine Compatibility Layer Should Be Optional

**Current State**: We have extensive Jasmine compatibility in `setup-jest.ts` (lines 12-315):

```typescript
// Jasmine compatibility layer for easier migration
interface JasmineLikeMock<T> { ... }
(global as any).jasmine = { createSpyObj, createSpy, ... };
(global as any).spyOn = (object, method) => { ... };
```

**Assessment**:

- **KEEP for now** - Transitioning 1099 tests to pure Jest syntax is risky
- **FUTURE**: Gradually migrate to Jest idioms

**Recommended Migration Path**:

1. All **new tests** use Jest syntax (`jest.fn()`, `jest.spyOn()`)
2. Refactored tests migrate to Jest syntax
3. Document Jest patterns in CLAUDE.md
4. Remove compatibility layer when <10% tests use Jasmine

**Pure Jest Pattern**:

```typescript
// ❌ Jasmine style (current)
const mockService = jasmine.createSpyObj('MyService', ['method']);
mockService.method.and.returnValue('test');

// ✅ Jest style (preferred)
const mockService = {
  method: jest.fn().mockReturnValue('test'),
};
```

**Action Required**:

- Add linting rule to warn on Jasmine patterns in new files
- Update CLAUDE.md to show Jest-first examples
- Track migration progress (could use TODO marker in tests)

---

### ❌ 3. Avoid `ng-reflect-*` Attributes in Tests

**Why Deprecated**: Angular 20 removed `ng-reflect-*` attributes from production builds.

**Current State**: No usage found (good!).

**Anti-Pattern**:

```typescript
// ❌ DON'T: Test based on ng-reflect attributes
expect(el.getAttribute('ng-reflect-model')).toBe('test');

// ✅ DO: Test stable attributes or behavior
expect(el.getAttribute('data-testid')).toBe('my-input');
expect(component.myModel()).toBe('test'); // Signal value
```

**Action Required**:

- Add to CLAUDE.md as anti-pattern
- Use data-testid attributes for E2E tests (already doing this in Maestro!)

**Sources**:

- [Angular 20 Breaking Changes](https://blog.ninja-squad.com/2025/05/28/what-is-new-angular-20.0)

---

## 4. New Angular 20 Features We're Not Using

### 🆕 1. Angular Testing Library (Recommended)

**What**: User-centric testing library that encourages testing behavior over implementation.

**Why**:

- Aligns with Diabetify's accessibility focus
- Tests what users experience (not component internals)
- Works seamlessly with standalone components
- Less brittle tests (no fixture.detectChanges() dance)

**Example**:

```typescript
// Current approach (imperative)
const fixture = TestBed.createComponent(MyComponent);
const component = fixture.componentInstance;
fixture.detectChanges();
const button = fixture.nativeElement.querySelector('button');
button.click();
fixture.detectChanges();

// Angular Testing Library (declarative)
const { getByRole, getByText } = await render(MyComponent);
const button = getByRole('button', { name: /submit/i });
await userEvent.click(button);
// No manual detectChanges needed!
```

**Installation**:

```bash
npm install --save-dev @testing-library/angular @testing-library/user-event
```

**Action Required**:

- Install `@testing-library/angular`
- Try on 1-2 component tests as proof-of-concept
- Evaluate developer experience vs current approach
- Decision: Adopt for new tests or stay with TestBed?

**Sources**:

- [Good Testing Practices with Angular Testing Library](https://timdeschryver.dev/blog/good-testing-practices-with-angular-testing-library)
- [Testing Library Angular Docs](https://testing-library.com/docs/angular-testing-library/examples/)

---

### 🆕 2. `TestBed.tick()` for Effects (Already Covered)

See "Best Practice #2" above.

---

### 🆕 3. Spectator Testing Library

**What**: Wrapper around TestBed that reduces boilerplate and improves readability.

**Why**:

- Cleaner API than raw TestBed
- Built-in mocking utilities
- Excellent TypeScript support

**Example**:

```typescript
// With Spectator
import { createComponentFactory, Spectator } from '@ngneat/spectator/jest';

describe('StatCardComponent', () => {
  let spectator: Spectator<StatCardComponent>;
  const createComponent = createComponentFactory(StatCardComponent);

  beforeEach(() => (spectator = createComponent()));

  it('should display value', () => {
    spectator.setInput('value', 120);
    expect(spectator.query('.value')).toHaveText('120');
  });
});
```

**Trade-offs**:

- **PRO**: Less boilerplate, cleaner tests
- **CON**: Another abstraction to learn
- **CON**: May hide Angular testing knowledge from team

**Action Required**:

- Evaluate vs Angular Testing Library (pick one, not both)
- Consider for new project, not worth migration for Diabetify

**Sources**:

- [Unit Testing Angular Components with Spectator](https://codezup.com/unit-testing-angular-components-jest-spectator/)

---

### 🆕 4. Vitest as Default Test Runner

**What**: Angular CLI now defaults to Vitest instead of Karma.

**Current State**: We use Jest (perfectly fine!).

**Should We Switch?**:

- **NO** - Jest is well-established in our codebase
- **NO** - Migration would be significant effort
- **MAYBE** - If we see performance issues with Jest ESM

**Vitest Advantages**:

- Faster than Jest (native ESM, parallel execution)
- Better DX (instant watch mode, UI dashboard)
- Vite ecosystem integration

**Action Required**:

- Monitor Vitest adoption in Angular community
- Revisit in 6-12 months if Jest performance degrades
- Stay on Jest for now

**Sources**:

- [Angular Official Testing Guide](https://angular.dev/guide/testing/unit-tests)

---

## 5. Standalone Component Architecture Recommendations

### ✅ 1. Import Only What You Test

**Current State**: Excellent! All components use standalone imports correctly.

**Example from Diabetify**:

```typescript
// src/app/bolus-calculator/bolus-calculator.page.ts
@Component({
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TranslateModule,
    AppIconComponent, // Custom component
    FoodPickerComponent,
    // Only needed Ionic components
    IonHeader, IonToolbar, IonButtons, IonButton, IonIcon, IonTitle, IonContent, IonInput, IonSpinner,
  ],
})
```

**Testing Benefit**:

- Changes to component dependencies don't break tests
- Tests stay focused on component behavior
- Faster test compilation

**No Action Required** - Already following best practices!

---

### ✅ 2. Provide Services at Component Level for Testing

**Pattern**: Services provided in standalone components are easier to mock.

**Example**:

```typescript
@Component({
  standalone: true,
  providers: [MyLocalService], // ← Provided at component level
})
export class MyComponent {}

// Test mocking is straightforward
TestBed.configureTestingModule({
  imports: [MyComponent],
}).overrideComponent(MyComponent, {
  remove: { providers: [MyLocalService] },
  add: { providers: [{ provide: MyLocalService, useValue: mockService }] },
});
```

**Action Required**:

- Evaluate which services should be component-scoped vs root-scoped
- Update CLAUDE.md with mocking patterns

---

### ✅ 3. Use Standalone APIs for Test Providers

**What**: Use standalone provider functions for cleaner test setup.

**Example**:

```typescript
// ✅ GOOD: Standalone provider functions
TestBed.configureTestingModule({
  imports: [MyComponent],
  providers: [
    provideHttpClient(),
    provideHttpClientTesting(),
    provideRouter([]),
    provideLocationMocks(),
  ],
});

// ❌ OLD: Module-based setup
TestBed.configureTestingModule({
  imports: [HttpClientTestingModule, RouterTestingModule],
});
```

**Current State**: Need to audit test files for module-based imports.

**Action Required**:

- Search for `HttpClientTestingModule`, `RouterTestingModule`
- Replace with standalone provider functions
- Add examples to CLAUDE.md

---

## 6. Diabetify-Specific Recommendations

### 📱 1. Add Unit Tests for Signal-Based Components

**Missing Tests**:

- `src/app/bolus-calculator/bolus-calculator.page.ts` (no .spec.ts file)
- `src/app/shared/components/food-picker/food-picker.component.ts` (need to check)
- `src/app/core/services/food.service.ts` (need to check)

**Action Required**:

1. Create `bolus-calculator.page.spec.ts`
2. Test signal state changes:
   ```typescript
   it('should open food picker modal', () => {
     component.openFoodPicker();
     expect(component.showFoodPicker()).toBe(true);
   });
   ```

---

### 📱 2. Improve Jest Performance with Current Config

**Current Config Analysis**:

```javascript
// jest.config.js
maxWorkers: 2, // ✅ Good for memory-constrained CI
workerIdleMemoryLimit: '512MB', // ✅ Prevents OOM
cache: true, // ✅ Speeds up subsequent runs
testEnvironment: 'jsdom', // ✅ Correct for Angular
```

**Optimization Opportunities**:

- Enable `--runInBand` for CI (single-threaded, more predictable)
- Increase `testTimeout` for slow E2E integration tests
- Add `--maxWorkers=4` for local development (faster iteration)

**Action Required**:

- Add `test:dev` script: `"test:dev": "jest --maxWorkers=4 --watch"`
- Benchmark current test suite execution time
- Document CI vs local test configurations

---

### 📱 3. Add Accessibility Testing to Unit Tests

**Opportunity**: Integrate axe-core into unit tests (not just E2E).

**Example**:

```typescript
import { axe, toHaveNoViolations } from 'jest-axe';
expect.extend(toHaveNoViolations);

it('should have no accessibility violations', async () => {
  const { container } = await render(MyComponent);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

**Action Required**:

- Install `jest-axe`
- Add a11y tests to high-traffic components (dashboard, readings)
- Align with existing Playwright a11y tests

---

## 7. Action Plan Summary

### Immediate (High ROI, Low Risk)

| Action                                     | Effort | Impact                                  | Priority  |
| ------------------------------------------ | ------ | --------------------------------------- | --------- |
| Replace `waitForAsync` with `async/await`  | 2h     | Modernize, remove deprecation warnings  | 🔴 High   |
| Add unit tests for signal-based components | 4h     | Improve coverage, validate new patterns | 🔴 High   |
| Document Jest-first patterns in CLAUDE.md  | 1h     | Guide future development                | 🔴 High   |
| Benchmark test suite performance           | 30m    | Establish baseline for optimization     | 🟡 Medium |

### Short-Term (1-2 weeks)

| Action                                           | Effort | Impact                       | Priority  |
| ------------------------------------------------ | ------ | ---------------------------- | --------- |
| Test Jest ESM mode on feature branch             | 4h     | 2-3x faster tests            | 🔴 High   |
| Audit standalone component test mocking          | 3h     | Validate best practices      | 🟡 Medium |
| Add `test:dev` script for faster local iteration | 30m    | Improve DX                   | 🟡 Medium |
| Evaluate Angular Testing Library (POC)           | 4h     | Assess fit for team/codebase | 🟡 Medium |

### Long-Term (Future Sprints)

| Action                                   | Effort | Impact                              | Priority  |
| ---------------------------------------- | ------ | ----------------------------------- | --------- |
| Migrate Jasmine syntax to Jest (gradual) | 20h+   | Reduce compatibility layer overhead | 🟢 Low    |
| Add jest-axe for unit-level a11y testing | 8h     | Shift-left accessibility testing    | 🟡 Medium |
| Investigate Vitest migration feasibility | 4h     | Future-proof test infrastructure    | 🟢 Low    |

---

## 8. Key Takeaways

### ✅ What We're Doing Right

1. **Standalone components everywhere** - Aligns with Angular 20 best practices
2. **Jest + jsdom setup** - Solid foundation, well-configured
3. **Comprehensive mocking** - setup-jest.ts has excellent Capacitor mocks
4. **CI integration** - jest-junit for test visibility in CircleCI
5. **Memory optimization** - maxWorkers=2, workerIdleMemoryLimit configured

### ⚠️ What Needs Improvement

1. **Signal testing patterns** - Missing unit tests for signal-based components
2. **Deprecated `waitForAsync`** - Should migrate to modern async patterns
3. **Jasmine compatibility** - Long-term goal to migrate to pure Jest
4. **Test performance** - Could be 2-3x faster with Jest ESM mode
5. **TestBed optimization** - Some tests import more than needed

### 🚀 High-Impact Opportunities

1. **Jest ESM Mode** - Potential 290% speed improvement (50s → 17s)
2. **Angular Testing Library** - More robust, user-centric tests
3. **Signal Input Testing** - Validate modern Angular patterns
4. **A11y Unit Tests** - Shift-left accessibility testing

---

## 9. Sources

### Official Angular Documentation

- [Home • Angular Testing](https://angular.dev/guide/testing/unit-tests)
- [Testing • Overview • Angular](https://angular.dev/guide/testing)
- [Component testing scenarios • Angular](https://angular.dev/guide/testing/components-scenarios)

### Angular 20 Release Information

- [What's new in Angular 20.0? - Ninja Squad](https://blog.ninja-squad.com/2025/05/28/what-is-new-angular-20.0)
- [Angular 20: Complete Guide - MernStackDev](https://mernstackdev.com/angular-20-complete-guide-to-new-features-performance-improvements-migration-in-2025/)
- [Angular 20: What's New - Bacancy](https://www.bacancytechnology.com/blog/angular-20)

### Advanced Testing Practices

- [Advanced Angular Testing in 2025 - Medium](https://medium.com/@roshannavale7/advanced-angular-testing-in-2025-best-practices-for-robust-unit-and-e2e-testing-1a7e629e000b)
- [Testing Angular Standalone Components - ANGULARarchitects](https://www.angulararchitects.io/blog/testing-angular-standalone-components/)
- [Good Testing Practices with Angular Testing Library](https://timdeschryver.dev/blog/good-testing-practices-with-angular-testing-library)

### Standalone Component Testing

- [Testing a standalone component using the Angular testbed](https://this-is-angular.github.io/angular-guides/docs/standalone-apis/testing-a-standalone-component-using-the-angular-testbed)
- [How do I test and mock Standalone Components? - DEV](https://dev.to/this-is-angular/how-do-i-test-and-mock-standalone-components-508e)
- [ng-mocks Standalone Guide](https://ng-mocks.sudo.eu/guides/component-standalone)

### Signal Testing

- [Testing Signals with Angular Testing Library](https://timdeschryver.dev/blog/testing-signals-with-angular-testing-library)
- [How do I test Signal & Model Inputs? - Rainer Hahnekamp](https://www.rainerhahnekamp.com/en/how-do-i-test-signal-model-inputs/)
- [Mastering Angular Signals and Inputs with Jest Testing](https://anoe.dev/blog/mastering-angular-signals-and-inputs-a-practical-guide-with-jest-testing)

### Jest Configuration & Performance

- [Jest ESM - Total Guide - Angular Experts](https://angularexperts.io/blog/total-guide-to-jest-esm-and-angular/)
- [Testing Angular Faster with Jest - Xfive](https://www.xfive.co/blog/testing-angular-faster-jest)
- [Unit Testing Angular Components with Jest and Spectator](https://codezup.com/unit-testing-angular-components-jest-spectator/)

### Dependency Injection Mocking

- [Faking dependencies (Mocking) – Testing Angular](https://testing-angular.com/faking-dependencies/)
- [How to test a standalone component and mock imports - ng-mocks](https://ng-mocks.sudo.eu/guides/component-standalone)

---

**End of Research Report**
