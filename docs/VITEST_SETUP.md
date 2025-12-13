# Vitest Setup for Diabetify

## Overview

Vitest has been configured as an alternative test runner for the Diabetify Angular app. This allows running tests with Vitest's faster execution and modern features while maintaining compatibility with existing Jest/Jasmine tests.

## Installation

Dependencies installed:
- `vitest` ^4.0.15
- `@analogjs/vitest-angular` ^2.1.3 (not used due to compatibility issues)
- `jsdom` ^27.3.0
- `@vitest/ui` ^4.0.15

## Configuration Files

### vitest.config.ts

Custom configuration without the broken `@analogjs/vitest-angular` plugin:

```typescript
import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'url';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['src/setup-vitest.ts'],
    include: ['src/**/*.spec.ts'],
    reporters: ['default', 'html'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/app/**/*.ts'],
      exclude: ['src/app/**/*.spec.ts', 'src/app/**/*.mock.ts']
    },
    deps: {
      inline: [
        '@ionic/angular',
        '@ionic/core',
        '@capacitor/core',
        '@capacitor/preferences',
        '@capacitor/device',
        '@capacitor/network',
        '@ngx-translate/core'
      ]
    }
  },
  resolve: {
    alias: {
      '@core': fileURLToPath(new URL('./src/app/core', import.meta.url)),
      '@shared': fileURLToPath(new URL('./src/app/shared', import.meta.url)),
      // ... other aliases
    }
  }
});
```

### src/setup-vitest.ts

Converted from `setup-jest.ts` with the following key changes:

1. **Zone.js initialization** for Angular testing
2. **Global `jest` alias** pointing to `vi` for compatibility
3. **All `jest.fn()` → `vi.fn()`** in mocks
4. **All `jest.spyOn()` → `vi.spyOn()`** in utilities
5. **All `jest.Mock` → vi mock types** in type definitions
6. **Jasmine compatibility layer** maintained (createSpyObj, spyOn, etc.)

Key additions:
```typescript
import 'zone.js';
import 'zone.js/testing';
import { TestBed } from '@angular/core/testing';
import { BrowserDynamicTestingModule, platformBrowserDynamicTesting } from '@angular/platform-browser-dynamic/testing';

// Initialize Angular testing environment
TestBed.initTestEnvironment(
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting(),
  { teardown: { destroyAfterEach: true } }
);

// Alias Jest as vi globally for compatibility
(global as any).jest = vi;
```

## NPM Scripts

Added to package.json:

```json
"test:vitest": "vitest run",
"test:vitest:watch": "vitest",
"test:vitest:ui": "vitest --ui",
"test:vitest:coverage": "vitest run --coverage"
```

## Current Status

### Working (868 tests passing, 21 test files)

- All service tests that don't use `done()` callback
- All component tests
- Mocking system (Jasmine, Jest compatibility)
- Angular testing utilities
- Capacitor plugin mocks
- IndexedDB mocks (fake-indexeddb)

### Known Issues

1. **`done()` callback deprecated** (24 errors, 951 tests failed)
   - Vitest doesn't support `done()` callback pattern
   - Affected tests need conversion to async/await or Promise-based
   - Files affected: `error-handler.service.spec.ts` and others using RxJS observables with `done()`

2. **Snapshot format differences**
   - 1 obsolete snapshot in `readings.service.mapping.spec.ts`
   - Vitest snapshots are slightly different from Jest

## Migration Path

### Option 1: Gradual Migration (Recommended)

Keep both Jest and Vitest running in parallel:
- Use Jest as primary test runner (CI/CD)
- Use Vitest for faster local development
- Gradually convert tests away from `done()` callback

### Option 2: Full Migration

Convert all `done()` callback tests to async/await:

```typescript
// Before (Jest/Jasmine with done())
it('should handle error', (done) => {
  service.someObservable$.subscribe({
    error: (error) => {
      expect(error).toBeDefined();
      done();
    }
  });
});

// After (Vitest/modern async)
it('should handle error', async () => {
  await expect(
    firstValueFrom(service.someObservable$.pipe(catchError(err => of(err))))
  ).resolves.toBeDefined();
});
```

## Advantages of Vitest

1. **Faster execution** - 27.96s total vs Jest's typical 60-90s
2. **Modern ESM support** - Native ES modules
3. **Better watch mode** - Smarter test re-runs
4. **UI mode** - Visual test runner with `--ui` flag
5. **Vite integration** - Shares Vite config and transforms

## Disadvantages

1. **No `done()` callback** - Requires test refactoring
2. **Snapshot format** - Different from Jest (minor)
3. **Less mature** - Smaller ecosystem than Jest
4. **Angular support** - No official plugin (yet)

## Recommendation

**Keep both test runners for now:**
- Use Jest for CI/CD (stable, all tests pass)
- Use Vitest for local dev (faster, better DX)
- Monitor Vitest Angular support improvements

When Angular community provides better Vitest support (official plugin or preset), consider full migration.

## Running Tests

```bash
# Vitest (faster, some tests fail)
pnpm test:vitest              # Run once
pnpm test:vitest:watch        # Watch mode
pnpm test:vitest:ui           # Visual UI
pnpm test:vitest:coverage     # With coverage

# Jest (stable, all tests pass)
pnpm test                     # Run once
pnpm test:watch               # Watch mode
pnpm test:coverage            # With coverage

# Run specific file
pnpm test:vitest src/app/core/services/food.service.spec.ts
```

## Coverage

Vitest uses v8 coverage provider (faster than Jest's istanbul):

```bash
pnpm test:vitest:coverage
```

Coverage reports in:
- Terminal: Text summary
- HTML: `coverage/index.html`
- LCOV: `coverage/lcov.info`

---

**Last updated:** 2025-12-13
**Status:** Experimental - Keep Jest as primary
**Test Results:** 868/1823 passing (868 pass, 951 fail, 4 skip)
