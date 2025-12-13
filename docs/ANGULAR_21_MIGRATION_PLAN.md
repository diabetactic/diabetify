# Angular 21 + Vitest Migration Plan

**Project**: Diabetify - Ionic/Angular Mobile App for Diabetes Management
**Current Version**: Angular 20.3.15
**Target Version**: Angular 21.x
**Migration Date**: TBD
**Document Version**: 1.0
**Last Updated**: 2025-12-13

---

## Executive Summary

This document outlines the migration path from Angular 20.3.15 to Angular 21, including the transition from Jest to Vitest as the default testing framework. Angular 21 represents a significant architectural shift with zoneless change detection by default, Signal Forms, and official Vitest support.

**Key Benefits:**

- 🚀 **Performance**: Faster startup, smaller bundles, cleaner stack traces
- 🧪 **Modern Testing**: Vitest with browser mode and Jest-compatible API
- 📊 **Signal Forms**: Experimental reactive forms built on Signals
- ⚡ **Zoneless by Default**: Explicit change detection without Zone.js overhead
- 🤖 **AI Tools**: Enhanced MCP server for AI-assisted development

**Estimated Effort**: 3-5 days (Medium complexity)
**Risk Level**: Medium (Breaking changes in testing infrastructure)

---

## 1. Current State Analysis

### 1.1 Current Angular Version

**From `/home/julito/TPP/diabetactic/diabetify/package.json`:**

```json
{
  "dependencies": {
    "@angular/animations": "^20.3.15",
    "@angular/common": "^20.3.15",
    "@angular/compiler": "^20.3.15",
    "@angular/core": "^20.3.15",
    "@angular/forms": "^20.3.15",
    "@angular/platform-browser": "^20.3.15",
    "@angular/router": "^20.3.15"
  },
  "devDependencies": {
    "@angular/cli": "^20.0.0",
    "@angular/compiler-cli": "^20.3.15"
  }
}
```

### 1.2 Current Test Infrastructure

**Testing Framework**: Jest 29.7.0 with `jest-preset-angular` 14.6.2

**Test Statistics:**

- **81 unit test files** (\*.spec.ts in src/)
- **1,012 tests passing**, 0 skipped, 0 failed
- **45 test suites**
- **19 E2E tests** (Playwright in playwright/tests/)

**Key Test Dependencies:**

```json
{
  "devDependencies": {
    "@angular-builders/jest": "^20.0.0",
    "jest": "^29.7.0",
    "jest-junit": "^16.0.0",
    "jest-preset-angular": "^14.6.2",
    "@types/jest": "^29.5.14"
  }
}
```

**Test Configuration Files:**

- `jest.config.js` - Main Jest configuration with jest-junit reporter
- `setup-jest.ts` - Comprehensive Capacitor mocks and Jasmine compatibility layer
- `jest.integration.config.js` - Integration test configuration

**Critical Test Features:**

- ✅ Jasmine compatibility layer for `.and.returnValue()` pattern
- ✅ Comprehensive Capacitor plugin mocks (Preferences, SecureStorage, Network, etc.)
- ✅ fake-indexeddb for Dexie testing
- ✅ jest-junit for CircleCI test visibility
- ✅ Custom path aliases (`@app/`, `@core/`, `@shared/`)

### 1.3 Current Architecture

**Key Features:**

- ✅ Standalone components throughout (Angular 18+ pattern)
- ✅ Signals for reactive state (some services use BehaviorSubject)
- ✅ Zone.js included (dependency: `zone.js": "~0.15.0"`)
- ⚠️ Not yet zoneless (will break in Angular 21 default)

**Testing Patterns:**

- Heavy use of `fakeAsync()` and `flushMicrotasks()` for async testing
- Jasmine compatibility via custom setup-jest.ts utilities
- 7 tests intentionally skipped in `tidepool.interceptor.spec.ts` (LEGACY)
- 4 tests skipped in `auth.interceptor.spec.ts` (timer-based retry incompatible with fakeAsync)

---

## 2. Angular 21 Key Features

### 2.1 Zoneless Change Detection by Default

**What Changed:**

- Zone.js is **no longer included by default** in new projects
- Change detection now uses **Signals** to track state explicitly
- No need for `provideZonelessChangeDetection()` - it's automatic

**Benefits:**

- **Smaller bundles**: Removing Zone.js reduces bundle size
- **Better performance**: No unnecessary change detection cycles
- **Cleaner debugging**: Stack traces no longer polluted by Zone.js
- **Future-proof**: Avoids Zone.js compatibility issues with modern JS features

**Impact on Diabetify:**

- 🚨 **Breaking Change**: Existing app relies on Zone.js (`zone.js": "~0.15.0"`)
- Migration will add `provideZoneChangeDetection()` automatically to maintain current behavior
- Future consideration: Migrate to zoneless for performance benefits

**Migration Tool:**

```bash
# Angular CLI will detect Zone.js usage and add provider automatically
ng update @angular/core @angular/cli
```

### 2.2 Signal Forms (Experimental)

**What's New:**

- New experimental forms API in `@angular/forms/signals`
- Built on Angular Signals for reactive state
- No more `valueChanges` observables - values exposed as Signals
- No manual unsubscription logic (`takeUntil`)

**Benefits:**

- **Simpler API**: Declarative, model-first approach
- **Better type safety**: Full TypeScript inference
- **Reactive by default**: Use `computed()` to derive values instantly
- **Composable**: Easy compound forms (FormGroups) and repeating groups (FormArrays)

**Compatibility:**

- Backwards compatible via `@angular/forms/signals/compat` package
- `compatForm()` function bridges reactive forms and signal forms

**Impact on Diabetify:**

- ✅ **Optional upgrade**: Current reactive forms still fully supported
- ⏳ **Future enhancement**: Consider Signal Forms for new features
- 📝 **No immediate action required**

**Example Usage:**

```typescript
import { form, control } from '@angular/forms/signals';

// Signal-based form
const profileForm = form({
  name: control(''),
  age: control(0),
});

// Access as signals
const name = profileForm.controls.name.value; // Signal<string>
const isValid = computed(() => profileForm.valid()); // Computed signal
```

### 2.3 Vitest as Default Testing Framework

**What Changed:**

- Vitest is now **stable** and the **default test runner** for new projects
- No longer experimental (was experimental in Angular 20)
- Web Test Runner and Jest support **deprecated** (removal planned in v22)

**Benefits:**

- **Fast**: Built on Vite, extremely short startup and repetition times
- **Modern**: ESM-first, TypeScript-native
- **Browser mode**: Run tests in real browsers (stable since Vitest 4, October 2025)
- **Jest-compatible**: Familiar API for easy migration
- **Rich API**: Snapshot testing, flexible fake timers, `expect.poll`, test fixtures

**Impact on Diabetify:**

- 🚨 **Major migration required**: 81 test files need refactoring
- ⚠️ **fakeAsync tests must be rewritten**: No Zone.js patching in Vitest
- ⚠️ **jest-junit needs replacement**: Vitest has different reporters
- ✅ **Jest API compatibility**: Most tests will auto-migrate

**Official Migration Guide:**

- https://angular.dev/guide/testing/migrating-to-vitest

### 2.4 Angular Aria (Developer Preview)

**What's New:**

- Headless accessibility-first components
- Available directives: Accordion, Autocomplete, ComboBox, Grid, ListBox, Menu, Multiselect, Select, Tabs, Toolbar, Tree
- Style your way (no opinionated CSS)

**Impact on Diabetify:**

- ✅ **Optional enhancement**: Consider for future accessibility improvements
- 📝 **No immediate action required**

### 2.5 AI-Powered Development Tools

**What's New:**

- Model Context Protocol (MCP) Server with 7 stable/experimental tools
- Better IDE and AI agent integration
- Smarter refactoring suggestions

**Impact on Diabetify:**

- ✅ **Developer experience enhancement**: Available immediately after upgrade
- 📝 **No code changes required**

### 2.6 Other Notable Improvements

- **Customizable IntersectionObserver**: For `@defer` viewport triggers
- **Generic SimpleChanges**: Better type checking
- **KeyValue pipe**: Supports objects with optional keys
- **CDK overlays**: Use browser's built-in popovers (accessibility win)
- **Bundled Tailwind**: Configuration included in new projects (already using Tailwind 3.4.13)
- **Enhanced SSR**: Lazy hydration support for non-critical UI

---

## 3. Breaking Changes from Angular 20 to 21

### 3.1 Zoneless Change Detection Default

**What Breaks:**

- Apps relying on Zone.js for automatic change detection

**Auto-Migration:**
✅ Angular CLI migration will detect Zone.js usage and add `provideZoneChangeDetection()` automatically

**Manual Action:**

- Review generated provider configuration
- Consider future zoneless migration for performance

### 3.2 Testing Framework Changes

**What Breaks:**

- Jest/Web Test Runner are deprecated (removal in v22)
- fakeAsync tests require rewrite for Vitest (no Zone.js)

**Migration Path:**

1. Install Vitest and DOM emulation library (happy-dom or jsdom)
2. Run automated schematic: `ng generate @angular/cli:refactor-jasmine-vitest`
3. Manual fixes for fakeAsync tests
4. Update test configuration in angular.json

**What Schematic Does NOT Do:**

- ❌ Install dependencies
- ❌ Change angular.json builder
- ❌ Remove karma.conf.js or test.ts

### 3.3 DOM Update Issues (Reported)

**Known Issue:**
Some users reported DOM updates breaking after upgrading from 20.3.6 to 21.0.0, requiring rollback.

**Mitigation:**

- Test thoroughly in development environment
- Have rollback plan ready
- Monitor Angular issue tracker for patches

### 3.4 HttpClient Provided by Default

**What Changes:**

- HttpClient now provided automatically
- Can skip providing HttpClient in app configuration

**Impact on Diabetify:**

- ✅ **Minor cleanup**: Remove redundant `provideHttpClient()` if present
- ⚠️ **Verify**: Ensure custom interceptors still work

---

## 4. Jest to Vitest Migration Steps

### 4.1 Phase 1: Preparation (Day 1)

**1. Install Dependencies**

```bash
# Remove Jest dependencies
npm uninstall jest jest-preset-angular @angular-builders/jest @types/jest jest-junit

# Install Vitest and DOM emulation
npm install -D vitest @vitest/ui happy-dom @angular/build
# OR use jsdom if preferred: npm install -D jsdom

# Install Vitest Angular support (if available)
npm install -D @angular/vitest
```

**2. Create Vitest Configuration**

Create `vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';
import angular from '@angular/vitest';

export default defineConfig({
  plugins: [angular()],
  test: {
    globals: true, // Enable globals like describe, it, expect
    environment: 'happy-dom', // or 'jsdom'
    setupFiles: ['setup-vitest.ts'],
    include: ['src/**/*.spec.ts'],
    exclude: [
      'node_modules',
      'dist',
      'www',
      'playwright',
      'src/app/tests/integration',
      'src/environments',
    ],
    coverage: {
      provider: 'istanbul',
      reporter: ['html', 'text-summary', 'lcov'],
      reportsDirectory: 'coverage/diabetactic',
      exclude: [
        'src/app/**/*.spec.ts',
        'src/app/tests/**',
        'src/app/testing/**',
        'src/app/**/*.module.ts',
        'src/app/**/*.routes.ts',
        'src/app/**/index.ts',
        'src/app/explore-container/**',
        'src/main.ts',
        'src/polyfills.ts',
      ],
    },
    // JUnit reporter for CI
    reporters: ['default', 'junit'],
    outputFile: {
      junit: 'test-results/vitest/junit.xml',
    },
  },
  resolve: {
    alias: {
      '@app': '/src/app',
      '@core': '/src/app/core',
      '@shared': '/src/app/shared',
      '@environments': '/src/environments',
    },
  },
});
```

**3. Create Vitest Setup File**

Create `setup-vitest.ts` based on `setup-jest.ts`:

```typescript
import { setupZonelessTestEnv } from '@angular/core/testing';
import { TextEncoder, TextDecoder } from 'util';
import * as crypto from 'crypto';

// Set API base URL override
(globalThis as any).__DIABETACTIC_API_BASE_URL = 'http://localhost:8000';

// Setup zoneless test environment (Vitest always runs zoneless)
setupZonelessTestEnv();

// Polyfills
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as any;
Object.defineProperty(global, 'crypto', {
  value: crypto.webcrypto,
});

// Mock Capacitor plugins (migrate from setup-jest.ts)
// ... (copy Capacitor mocks)

// Vitest-compatible Jasmine compatibility layer
// Note: Use vi.fn() instead of jest.fn()
// ... (adapt Jasmine compatibility layer)
```

**4. Update angular.json**

Replace Jest builder with Vitest:

```json
{
  "projects": {
    "app": {
      "architect": {
        "test": {
          "builder": "@angular/build:vitest",
          "options": {
            "configFile": "vitest.config.ts"
          }
        }
      }
    }
  }
}
```

### 4.2 Phase 2: Automated Refactoring (Day 2)

**1. Run Migration Schematic**

```bash
ng generate @angular/cli:refactor-jasmine-vitest
```

**What It Converts:**

- ✅ `fit/fdescribe` → `it.only/describe.only`
- ✅ `xit/xdescribe` → `it.skip/describe.skip`
- ✅ `spyOn()` → `vi.spyOn()`
- ✅ `jasmine.objectContaining()` → `expect.objectContaining()`
- ✅ `jasmine.any()` → `expect.any()`
- ✅ `jasmine.createSpy()` → `vi.fn()`
- ✅ `fail()` → `vi.fail()`

**What It Leaves:**

- ❌ fakeAsync tests (requires manual rewrite)
- ❌ Capacitor mocks (already in setup file)
- ❌ Custom Jest matchers

**2. Review and Commit**

```bash
git add .
git commit -m "refactor: auto-migrate Jasmine to Vitest"
```

### 4.3 Phase 3: Manual Fixes (Days 2-3)

**1. Rewrite fakeAsync Tests**

**Before (Jest with fakeAsync):**

```typescript
it('should handle async operations', fakeAsync(() => {
  service.fetchData();
  tick(1000);
  flushMicrotasks();
  expect(service.data()).toBe('loaded');
}));
```

**After (Vitest with vi.useFakeTimers):**

```typescript
it('should handle async operations', async () => {
  vi.useFakeTimers();

  const promise = service.fetchData();
  await vi.advanceTimersByTimeAsync(1000);
  await promise;

  expect(service.data()).toBe('loaded');

  vi.useRealTimers();
});
```

**2. Update Imports**

Replace all Jest imports with Vitest:

```typescript
// Before
import { jest } from '@jest/globals';

// After
import { vi } from 'vitest';
```

**3. Fix Mock Resets**

Vitest's `mockReset` behaves differently:

```typescript
// Jest: mockReset replaces with empty function returning undefined
jest.fn().mockReset();

// Vitest: mockReset resets to original implementation
vi.fn().mockReset(); // Resets to original, not undefined!

// Use mockClear() instead if you want to clear calls
vi.fn().mockClear();
```

**4. Update Capacitor Mocks**

Adapt Capacitor plugin mocks from `setup-jest.ts` to use `vi.fn()`:

```typescript
// Before (Jest)
const mockPreferences = {
  get: jest.fn(),
  set: jest.fn(),
  remove: jest.fn(),
};

// After (Vitest)
const mockPreferences = {
  get: vi.fn(),
  set: vi.fn(),
  remove: vi.fn(),
};
```

**5. Handle Skipped Tests**

Re-enable or fix the 11 currently skipped tests:

- 7 in `tidepool.interceptor.spec.ts` (LEGACY - consider removing entire file)
- 4 in `auth.interceptor.spec.ts` (timer-based retry - rewrite with `vi.useFakeTimers`)

### 4.4 Phase 4: CI/CD Updates (Day 3)

**1. Update package.json Scripts**

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:ci": "vitest run --coverage --reporter=junit --reporter=default",
    "test:ui": "vitest --ui"
  }
}
```

**2. Update CircleCI Configuration**

Edit `.circleci/config.yml`:

```yaml
# Before
- run:
    name: Run tests
    command: npm run test:ci

- store_test_results:
    path: test-results/jest

# After
- run:
    name: Run tests
    command: npm run test:ci

- store_test_results:
    path: test-results/vitest
```

**3. Update Test Result Paths**

Vitest uses different output structure:

- Jest: `test-results/jest/junit.xml`
- Vitest: `test-results/vitest/junit.xml`

### 4.5 Phase 5: Validation (Day 4)

**1. Run Full Test Suite**

```bash
npm run test:coverage
```

**Expected Results:**

- ✅ All 1,012 tests passing (or manual rewrites for fakeAsync)
- ✅ Coverage reports generated in `coverage/diabetactic/`
- ✅ JUnit XML for CI in `test-results/vitest/`

**2. Run Integration Tests**

```bash
npm run test:integration
```

**3. Run E2E Tests**

```bash
npm run test:e2e
```

**4. Verify CI Pipeline**

Push to CI and ensure:

- ✅ Tests run successfully
- ✅ Test results visible in CircleCI UI
- ✅ Coverage reports uploaded

---

## 5. Angular 21 Migration Steps

### 5.1 Phase 1: Update Angular Core (Day 5)

**1. Run Angular Update**

```bash
ng update @angular/core@21 @angular/cli@21
```

**Expected Migrations:**

- ✅ Auto-add `provideZoneChangeDetection()` (app uses Zone.js)
- ✅ Update HttpClient usage (now provided by default)
- ✅ Migrate CommonModule to standalone imports (if applicable)
- ✅ Update RouterTestingModule usage

**2. Review Migration Output**

Check console output for breaking changes and manual actions required.

**3. Update Dependencies**

```bash
npm update @angular/animations @angular/common @angular/compiler \
  @angular/forms @angular/platform-browser @angular/router \
  @ionic/angular @capacitor/core
```

**4. Verify Compatibility**

Check for Ionic/Capacitor Angular 21 compatibility:

- Ionic 8.x should support Angular 21
- Capacitor 6.x should support Angular 21

### 5.2 Phase 2: Test and Fix Issues (Day 5)

**1. Build the App**

```bash
npm run build:prod
```

**Fix any build errors:**

- TypeScript errors from stricter type checking
- Template errors from updated compiler

**2. Run Tests**

```bash
npm run test:coverage
```

**Fix any test failures:**

- Change detection timing issues
- Template reference errors
- Async test failures

**3. Run E2E Tests**

```bash
npm run test:e2e
```

**4. Test Mobile Build**

```bash
npm run mobile:sync
npm run android:build
npm run android:install
```

**Manual Testing Checklist:**

- [ ] Login/logout flow
- [ ] Glucose readings CRUD
- [ ] Appointments management
- [ ] Profile editing
- [ ] Settings (theme, language)
- [ ] Offline functionality
- [ ] Push notifications

### 5.3 Phase 3: Cleanup (Day 5)

**1. Remove Deprecated Files**

```bash
# Remove Jest configuration (if fully migrated to Vitest)
rm jest.config.js setup-jest.ts jest.integration.config.js
rm -rf .jest-cache

# Remove legacy test files (if applicable)
# Manually review and delete tidepool.interceptor.spec.ts
```

**2. Update Documentation**

- Update `/home/julito/TPP/diabetactic/diabetify/CLAUDE.md` with Angular 21 version
- Document Vitest usage in test guidelines
- Update CI/CD documentation

**3. Commit Changes**

```bash
git add .
git commit -m "feat: upgrade to Angular 21 with Vitest"
```

---

## 6. Estimated Effort & Timeline

### 6.1 Effort Breakdown

| Phase                        | Effort    | Days  | Risk    |
| ---------------------------- | --------- | ----- | ------- |
| **Jest → Vitest Migration**  |           |       |         |
| - Preparation & dependencies | 4 hours   | 0.5   | Low     |
| - Automated refactoring      | 2 hours   | 0.25  | Low     |
| - Manual fakeAsync fixes     | 8 hours   | 1     | High    |
| - CI/CD updates              | 4 hours   | 0.5   | Low     |
| - Validation & testing       | 6 hours   | 0.75  | Med     |
| **Angular 21 Upgrade**       |           |       |         |
| - Core update & migrations   | 4 hours   | 0.5   | Med     |
| - Build & test fixes         | 6 hours   | 0.75  | High    |
| - Mobile build verification  | 4 hours   | 0.5   | Med     |
| - Cleanup & documentation    | 2 hours   | 0.25  | Low     |
| **Total**                    | **40hrs** | **5** | **Med** |

### 6.2 Recommended Timeline

**Week 1: Vitest Migration**

- **Day 1**: Preparation, dependency installation, configuration
- **Day 2**: Automated refactoring, review changes
- **Day 3**: Manual fixes (fakeAsync, mocks, skipped tests)
- **Day 4**: CI/CD updates, validation

**Week 2: Angular 21 Upgrade**

- **Day 5**: Angular update, testing, cleanup

**Buffer**: +1-2 days for unexpected issues

---

## 7. Risks & Mitigation

### 7.1 High Risk Items

#### Risk #1: fakeAsync Test Rewrites

**Impact**: 🔴 High - Many tests use `fakeAsync()`, `tick()`, `flushMicrotasks()`
**Probability**: 🟠 Medium - Known incompatibility with Vitest

**Mitigation:**

- ✅ **Before migration**: Identify all fakeAsync usage with grep
- ✅ **Progressive approach**: Fix tests incrementally, use `it.skip()` temporarily
- ✅ **Alternative patterns**: Use `vi.useFakeTimers()` and `await vi.advanceTimersByTimeAsync()`
- ✅ **Fallback**: Keep Jest for fakeAsync tests, run dual test runners temporarily

**Detection:**

```bash
grep -r "fakeAsync" src/ --include="*.spec.ts" | wc -l
```

#### Risk #2: Capacitor Mock Compatibility

**Impact**: 🔴 High - 100% of tests depend on Capacitor mocks
**Probability**: 🟡 Low - Vitest API similar to Jest

**Mitigation:**

- ✅ **Careful migration**: Adapt `setup-jest.ts` to `setup-vitest.ts` line-by-line
- ✅ **Early testing**: Test core services first (auth, database, profile)
- ✅ **Rollback ready**: Keep Jest setup as reference

#### Risk #3: CI/CD Test Result Reporting

**Impact**: 🟠 Medium - CircleCI depends on junit.xml format
**Probability**: 🟡 Low - Vitest supports JUnit reporter

**Mitigation:**

- ✅ **Vitest JUnit reporter**: Configure in vitest.config.ts
- ✅ **Verify early**: Test CI pipeline in feature branch

### 7.2 Medium Risk Items

#### Risk #4: DOM Update Issues (Angular 21)

**Impact**: 🟠 Medium - Reported by some users
**Probability**: 🟡 Low - Edge case, likely fixed in patches

**Mitigation:**

- ✅ **Thorough testing**: Manual QA on all core flows
- ✅ **Staging environment**: Test upgrade in non-production first
- ✅ **Rollback plan**: Keep Angular 20 branch ready

#### Risk #5: Third-Party Library Compatibility

**Impact**: 🟠 Medium - Ionic, Capacitor, DaisyUI may lag
**Probability**: 🟡 Low - Major libraries usually support quickly

**Mitigation:**

- ✅ **Check compatibility**: Review Ionic 8.x, Capacitor 6.x release notes
- ✅ **Test early**: Build and test mobile APK immediately
- ✅ **Community research**: Check GitHub issues for known problems

### 7.3 Low Risk Items

#### Risk #6: TypeScript Strict Mode

**Impact**: 🟢 Low - May reveal type errors
**Probability**: 🟡 Low - Already using TypeScript 5.8.0

**Mitigation:**

- ✅ **Incremental fixes**: Fix type errors file-by-file
- ✅ **Compiler flags**: Adjust tsconfig.json if needed

---

## 8. Rollback Plan

### 8.1 Git Branching Strategy

**Recommended:**

```bash
git checkout -b feat/angular-21-migration
git push -u origin feat/angular-21-migration
```

**Checkpoints:**

1. After Vitest migration: `git tag vitest-migration-complete`
2. After Angular 21 update: `git tag angular-21-complete`
3. After all tests pass: `git tag migration-validated`

### 8.2 Rollback Steps

**If Vitest migration fails:**

```bash
git checkout master
npm install # Restore package-lock.json from master
npm test    # Verify Jest tests still work
```

**If Angular 21 upgrade fails:**

```bash
git checkout vitest-migration-complete
ng update @angular/core@20 @angular/cli@20 # Downgrade
npm install
npm run test
npm run build:prod
```

**Emergency rollback:**

```bash
git checkout master
npm ci
npm run build:prod
npm run mobile:sync
```

---

## 9. Post-Migration Tasks

### 9.1 Optional Enhancements

**1. Zoneless Migration (Future)**

- Gradually remove Zone.js dependency
- Convert to explicit change detection with Signals
- Use migration tool: `ng generate @angular/core:onpush-zoneless-migration`

**2. Signal Forms (Future)**

- Evaluate Signal Forms for new features
- Migrate existing forms progressively using `@angular/forms/signals/compat`

**3. Angular Aria (Future)**

- Evaluate headless components for accessibility improvements
- Consider for complex UI patterns (Autocomplete, Combobox, etc.)

### 9.2 Performance Monitoring

**Metrics to Track:**

- [ ] Bundle size before/after (target: -5% from Zone.js removal)
- [ ] Test execution time before/after (target: -20% with Vitest)
- [ ] Build time before/after
- [ ] Startup time (mobile app)
- [ ] Memory usage (CI workers)

**Tools:**

```bash
# Bundle analysis
npm run build:analyze
npx webpack-bundle-analyzer dist/stats.json

# Test performance
npm run test:coverage # Compare execution time
```

### 9.3 Documentation Updates

**Files to Update:**

- [ ] `/home/julito/TPP/diabetactic/diabetify/CLAUDE.md` - Update Angular version, test commands
- [ ] `/home/julito/TPP/diabetactic/diabetify/README.md` - Update getting started guide
- [ ] `/home/julito/TPP/diabetactic/diabetify/docs/TESTING.md` - Document Vitest patterns
- [ ] `.circleci/config.yml` - Update comments with new test paths

---

## 10. Decision Matrix

### 10.1 Should We Migrate to Angular 21?

| Factor                 | Score   | Rationale                                             |
| ---------------------- | ------- | ----------------------------------------------------- |
| **Technical Benefits** | +8      | Modern testing, better performance, future-proof      |
| **Risk**               | -4      | fakeAsync rewrites, potential third-party lag         |
| **Effort**             | -3      | 5 days of development time                            |
| **Long-term Value**    | +9      | Official Vitest support, Signals ecosystem, AI tools  |
| **Community Momentum** | +7      | Angular 21 is latest stable, ecosystem moving forward |
| **Maintenance Burden** | +5      | Staying current reduces future migration debt         |
| **Total**              | **+22** | **Recommendation: Migrate** ✅                        |

### 10.2 Should We Migrate to Vitest?

| Factor                | Score   | Rationale                                        |
| --------------------- | ------- | ------------------------------------------------ |
| **Performance**       | +8      | 2x-10x faster than Jest in many benchmarks       |
| **Future Support**    | +9      | Official Angular default, Jest deprecated in v22 |
| **API Compatibility** | +7      | Jest-compatible API, minimal learning curve      |
| **Risk**              | -5      | fakeAsync rewrites, Capacitor mock migration     |
| **Effort**            | -4      | 3-4 days for 81 test files                       |
| **Ecosystem**         | +6      | Browser mode, Vite integration, growing adoption |
| **Total**             | **+21** | **Recommendation: Migrate** ✅                   |

---

## 11. Resources & References

### 11.1 Official Documentation

- [Angular 21 Release Notes](https://blog.angular.dev/announcing-angular-v21-57946c34f14b)
- [Angular 21 Features Overview](https://angular.dev/events/v21)
- [Angular Update Guide](https://angular.dev/update-guide)
- [Vitest Migration Guide](https://angular.dev/guide/testing/migrating-to-vitest)
- [What's New in Angular 21.0?](https://blog.ninja-squad.com/2025/11/20/what-is-new-angular-21.0)

### 11.2 Vitest Resources

- [Vitest Official Docs](https://vitest.dev/)
- [Vitest Migration Guide (from Jest)](https://vitest.dev/guide/migration.html)
- [Angular.Schule Vitest Guide](https://angular.schule/blog/2025-11-migrate-to-vitest/)
- [Complete Karma-to-Vitest Migration Guide](https://javascript.plainenglish.io/angular-21-vitest-testing-revolution-complete-karma-to-vitest-migration-guide-icov-coverage-44012295f9f9)

### 11.3 Community Resources

- [Angular 21 - What's New (Angular.love)](https://angular.love/angular-21-whats-new/)
- [Google Ships Angular 21 (InfoQ)](https://www.infoq.com/news/2025/11/angular-21-released/)
- [Vitest vs Jest Comparison](https://www.speakeasy.com/blog/vitest-vs-jest)
- [Unit Testing in Angular with Vitest](https://www.telerik.com/blogs/unit-testing-angular-modern-testing-vitest)

### 11.4 Tools & Utilities

- [Angular CLI](https://angular.dev/cli)
- [Vitest UI](https://vitest.dev/guide/ui.html) - Web UI for tests
- [happy-dom](https://github.com/capricorn86/happy-dom) - Fast DOM emulation
- [jsdom](https://github.com/jsdom/jsdom) - Alternative DOM emulation

---

## 12. Conclusion

### 12.1 Recommendation

**✅ PROCEED WITH MIGRATION**

The Angular 21 + Vitest migration is **highly recommended** for the Diabetify project:

1. **Future-proof**: Angular 21 is the latest stable release with official Vitest support
2. **Performance**: Zoneless mode and Vitest offer measurable speed improvements
3. **Ecosystem alignment**: Staying current reduces technical debt
4. **Manageable effort**: 5 days is reasonable for the benefits gained
5. **Low risk**: Comprehensive test suite (1,012 tests) provides safety net

### 12.2 Critical Success Factors

1. **Thorough testing**: Run full test suite + manual QA before merging
2. **Incremental approach**: Migrate Vitest first, then Angular 21
3. **Team communication**: Ensure all developers understand new testing patterns
4. **Rollback readiness**: Keep feature branch until fully validated

### 12.3 Next Steps

1. **Schedule migration**: Allocate 1 week of developer time
2. **Create feature branch**: `feat/angular-21-migration`
3. **Set up staging environment**: Test mobile build thoroughly
4. **Follow this plan**: Execute phases sequentially, validate at each step
5. **Document learnings**: Update this document with actual findings

---

**Document Status**: ✅ Ready for Review
**Approval Required**: Tech Lead / Engineering Manager
**Questions/Concerns**: Contact migration team

**Sources:**

- [Angular v21 Release](https://blog.angular.dev/announcing-angular-v21-57946c34f14b)
- [Vitest in Angular 21: Migration Guide](https://angular.schule/blog/2025-11-migrate-to-vitest/)
- [Angular 21 - What's New](https://angular.love/angular-21-whats-new/)
- [Migrating from Karma to Vitest](https://angular.dev/guide/testing/migrating-to-vitest)
- [What's new in Angular 21.0? - Ninja Squad](https://blog.ninja-squad.com/2025/11/20/what-is-new-angular-21.0)
- [Angular 21: Signal Forms, Zoneless Mode & Vitest](https://javascript-conference.com/blog/angular-21-signal-forms-zoneless-vitest/)
- [Google Ships Angular 21 - InfoQ](https://www.infoq.com/news/2025/11/angular-21-released/)
