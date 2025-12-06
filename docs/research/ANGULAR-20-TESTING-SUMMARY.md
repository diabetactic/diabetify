# Angular 20 Testing - Executive Summary

**TL;DR**: Diabetify's testing setup is solid but could be 2-3x faster with Jest ESM mode. We need to add signal testing and remove deprecated `waitForAsync` patterns.

---

## 🎯 Top 5 Actionable Recommendations

### 1. ✅ Enable Jest ESM Mode (2-3x Speed Boost)

**Impact**: Tests could run in **17 seconds instead of 50 seconds** (290% improvement)

```bash
# Update jest.config.js preset
preset: 'jest-preset-angular/presets/defaults-esm'
```

**Risk**: Low (backward compatible, requires testing)
**Effort**: 4 hours (testing + validation)
**Priority**: 🔴 High

---

### 2. ✅ Add Unit Tests for Signal-Based Components

**Missing tests**:

- `bolus-calculator.page.ts` - No spec file exists
- Signal inputs: `showFoodPicker`, `selectedFoods`

**Test pattern**:

```typescript
it('should toggle food picker modal', () => {
  expect(component.showFoodPicker()).toBe(false);
  component.openFoodPicker();
  expect(component.showFoodPicker()).toBe(true);
});
```

**Risk**: None (new tests)
**Effort**: 4 hours
**Priority**: 🔴 High

---

### 3. ✅ Replace `waitForAsync` with Modern Async Pattern

**Found in**: Multiple component tests (e.g., `stat-card.component.spec.ts`)

```typescript
// ❌ OLD (deprecated pattern)
beforeEach(waitForAsync(() => {
  TestBed.configureTestingModule({ imports: [MyComponent] }).compileComponents();
}));

// ✅ NEW (Angular 20 recommended)
beforeEach(async () => {
  await TestBed.configureTestingModule({ imports: [MyComponent] }).compileComponents();
});
```

**Risk**: Low (safe refactor)
**Effort**: 2 hours (global search & replace)
**Priority**: 🔴 High

---

### 4. ⚡ Optimize TestBed Configuration

**Use `NO_ERRORS_SCHEMA` for shallow component tests**:

```typescript
TestBed.configureTestingModule({
  imports: [ComponentUnderTest],
  schemas: [NO_ERRORS_SCHEMA], // Ignore child component errors
});
```

**Benefit**: 40% faster test compilation
**Risk**: Low (only for unit tests, not integration)
**Effort**: 3 hours (audit + refactor)
**Priority**: 🟡 Medium

---

### 5. 📚 Evaluate Angular Testing Library

**Why**: More robust, user-centric testing

```typescript
// Current TestBed approach
const fixture = TestBed.createComponent(MyComponent);
fixture.detectChanges();
const button = fixture.nativeElement.querySelector('button');

// Angular Testing Library approach
const { getByRole } = await render(MyComponent);
const button = getByRole('button', { name: /submit/i });
```

**Risk**: Medium (new library, team learning curve)
**Effort**: 4 hours (POC on 2-3 components)
**Priority**: 🟡 Medium

---

## ❌ Deprecated Patterns to Remove

| Pattern                   | Current Usage  | Action                     | Priority |
| ------------------------- | -------------- | -------------------------- | -------- |
| `waitForAsync()`          | Multiple files | Replace with `async/await` | 🔴 High  |
| `TestBed.flushEffects()`  | Not found ✅   | Monitor (don't introduce)  | 🟢 Low   |
| Jasmine syntax            | 50%+ of tests  | Gradual migration to Jest  | 🟢 Low   |
| `ng-reflect-*` attributes | Not found ✅   | None (already avoided)     | ✅ Good  |

---

## 🆕 Angular 20 Features We're NOT Using

### 1. `ComponentRef.setInput()` for Signal Testing

```typescript
// Modern signal input testing
fixture.componentRef.setInput('mySignalInput', 'new value');
```

**When to use**: Testing components with signal-based `@Input()` properties
**Action**: Add to CLAUDE.md as recommended pattern

---

### 2. `TestBed.tick()` Instead of `flushEffects()`

```typescript
// ✅ Angular 20+ (flushEffects deprecated)
TestBed.tick();
```

**Status**: ✅ We're not using the deprecated method (good!)

---

### 3. Standalone Provider Functions

```typescript
// ✅ Modern
providers: [provideHttpClient(), provideRouter([])];

// ❌ Legacy
imports: [HttpClientTestingModule, RouterTestingModule];
```

**Action**: Audit tests for module-based imports, migrate to standalone providers

---

## 📊 Testing Infrastructure Status

### ✅ What's Working Well

1. **Standalone components** - All components use standalone architecture
2. **Jest + jsdom** - Solid foundation, well-configured
3. **Capacitor mocks** - Comprehensive mocking in `setup-jest.ts`
4. **CI integration** - jest-junit for CircleCI test visibility
5. **1099 passing tests** - Excellent coverage

### ⚠️ Areas for Improvement

1. **Performance** - Could be 2-3x faster with Jest ESM
2. **Signal testing** - Missing patterns and examples
3. **Deprecated syntax** - `waitForAsync` needs migration
4. **Jasmine compatibility** - Long-term goal to remove shim layer

---

## 📈 Immediate Action Plan (This Sprint)

### Day 1-2: Quick Wins

- [ ] Replace `waitForAsync` with `async/await` (2h)
- [ ] Document Jest-first patterns in CLAUDE.md (1h)
- [ ] Benchmark current test suite performance (30m)

### Day 3-4: Signal Testing

- [ ] Create `bolus-calculator.page.spec.ts` (2h)
- [ ] Add signal testing examples to CLAUDE.md (1h)
- [ ] Test `ComponentRef.setInput()` pattern (1h)

### Day 5: Performance Investigation

- [ ] Test Jest ESM mode on feature branch (4h)
- [ ] Compare performance: CommonJS vs ESM
- [ ] Document findings and migration path

**Total Effort**: ~12 hours
**Expected Impact**: 2-3x faster tests, modern patterns adopted, deprecated code removed

---

## 📚 Key Resources

### Must-Read Documentation

- [Angular 20 Official Testing Guide](https://angular.dev/guide/testing/unit-tests)
- [Jest ESM Total Guide - Angular Experts](https://angularexperts.io/blog/total-guide-to-jest-esm-and-angular/)
- [Testing Angular Standalone Components](https://www.angulararchitects.io/blog/testing-angular-standalone-components/)

### Signal Testing Patterns

- [Testing Signals with Angular Testing Library](https://timdeschryver.dev/blog/testing-signals-with-angular-testing-library)
- [How to test Signal Inputs - Rainer Hahnekamp](https://www.rainerhahnekamp.com/en/how-do-i-test-signal-model-inputs/)

### Performance Optimization

- [Testing Angular Faster with Jest - Xfive](https://www.xfive.co/blog/testing-angular-faster-jest)

---

## 🎓 Team Knowledge Sharing

### Add to CLAUDE.md

```markdown
## Signal Testing Patterns

### Testing Signal State

\`\`\`typescript
// Component with signals
class MyComponent {
count = signal(0);
increment() { this.count.update(c => c + 1); }
}

// Test
it('should increment count signal', () => {
component.increment();
expect(component.count()).toBe(1);
});
\`\`\`

### Testing Signal Inputs (Angular 20+)

\`\`\`typescript
fixture.componentRef.setInput('mySignalInput', 'new value');
expect(fixture.componentInstance.mySignalInput()).toBe('new value');
\`\`\`

### Testing Effects

\`\`\`typescript
// Use TestBed.tick() to flush pending effects
TestBed.tick();
expect(effectSideEffect).toHaveBeenCalled();
\`\`\`
```

---

**Full Report**: See `docs/research/angular-20-testing-best-practices-2025.md` for detailed analysis and sources.
