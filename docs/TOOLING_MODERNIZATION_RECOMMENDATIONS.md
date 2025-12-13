# Tooling Modernization Recommendations for Diabetify

**Project**: Diabetify (Angular/Ionic/Capacitor Mobile App)
**Current Stack**: Angular 20.3, Ionic 8.7, Capacitor 6.2, Jest 29.7, npm
**node_modules size**: 902MB
**Test suite**: 1012 tests passing
**Date**: 2025-12-13

---

## Executive Summary

This document provides a comprehensive analysis of modern tooling improvements for the Diabetify mobile-first application. Recommendations are prioritized by effort/impact/risk and tailored specifically for an Angular/Ionic/Capacitor architecture.

**Key Insight**: Angular 20 already uses esbuild by default, which is a major performance win. Many "modern" tools would be lateral moves or introduce unnecessary complexity for this mobile-first use case.

---

## 1. Build Tools

### Current State

- **Angular CLI 20.0** with esbuild-based builder (`@angular-devkit/build-angular:browser`)
- **esbuild 0.25.9** for fast TypeScript compilation and bundling
- **webpack 5.101.2** (legacy, still included as transitive dependency)
- Build time: ~15-30s for production builds

### ❌ **NOT RECOMMENDED: Migrate to Vite**

| Metric | Rating |
| ------ | ------ |
| Effort | HIGH   |
| Impact | LOW    |
| Risk   | HIGH   |

**Why NOT:**

- Angular 20 already uses esbuild natively, which is Vite's core bundler
- `@analogjs/vite-plugin-angular` is experimental and not production-ready for Ionic/Capacitor
- Ionic/Capacitor has deep integration with Angular CLI (asset copying, native sync, etc.)
- Would break existing `angular.json` configurations (mock/local/heroku environments)
- No significant performance gain (Angular CLI already uses esbuild)
- Would require rewriting all build scripts and CI/CD pipeline

**Verdict**: Angular CLI's esbuild integration is already state-of-the-art. Vite would be a lateral move.

---

### ✅ **RECOMMENDED: Optimize esbuild Configuration**

| Metric | Rating |
| ------ | ------ |
| Effort | LOW    |
| Impact | MEDIUM |
| Risk   | LOW    |

**What to do:**

1. Add explicit esbuild optimization flags in `angular.json`
2. Enable tree-shaking hints
3. Configure bundle splitting strategy

**Changes to `angular.json`**:

```json
{
  "configurations": {
    "production": {
      "optimization": {
        "scripts": true,
        "styles": {
          "minify": true,
          "inlineCritical": true
        },
        "fonts": true
      },
      "outputHashing": "all",
      "sourceMap": false,
      "namedChunks": false,
      "aot": true,
      "extractLicenses": true,
      "vendorChunk": false,
      "buildOptimizer": true,
      "budgets": [
        {
          "type": "initial",
          "maximumWarning": "1.5mb", // Tighter than current 2mb
          "maximumError": "2mb" // Reduced from 5mb
        }
      ]
    }
  }
}
```

**Expected Impact**: 10-15% smaller bundle size, faster initial load

---

### ✅ **RECOMMENDED: Remove Webpack Dependencies**

| Metric | Rating |
| ------ | ------ |
| Effort | LOW    |
| Impact | LOW    |
| Risk   | LOW    |

**What to do:**

- Webpack is still installed as transitive dependency but not actively used
- Audit `package-lock.json` to see if webpack can be removed via dependency resolution
- Update bundle analysis script to use esbuild's native analyzer

**Changes to `package.json`**:

```json
{
  "scripts": {
    "build:analyze": "ng build --configuration=production --stats-json && npx esbuild-visualizer --metadata dist/stats.json"
  },
  "devDependencies": {
    "esbuild-visualizer": "^0.6.0"
  }
}
```

**Expected Impact**: Reduce node_modules from 902MB to ~850MB (-50MB)

---

## 2. Package Managers

### Current State

- **npm** with `package-lock.json`
- 902MB node_modules
- ~15-20s install time on CI

### ✅ **RECOMMENDED: Migrate to pnpm**

| Metric | Rating |
| ------ | ------ |
| Effort | LOW    |
| Impact | HIGH   |
| Risk   | LOW    |

**Why pnpm:**

- **Hard links** reduce disk usage by 50-70% (902MB → ~300-450MB)
- **Strict dependency resolution** prevents phantom dependencies
- **Faster installs** (15-20s → 5-10s on CI)
- **Better monorepo support** if you ever split backend/frontend
- **Capacitor-compatible** (widely used with Ionic/Capacitor projects)

**Migration steps:**

1. Install pnpm globally: `npm install -g pnpm`
2. Remove `node_modules` and `package-lock.json`
3. Run `pnpm install --shamefully-hoist` (required for Capacitor/Ionic peer deps)
4. Update CI config (`.circleci/config.yml`):
   ```yaml
   - run:
       name: Install pnpm
       command: npm install -g pnpm@9
   - run:
       name: Install dependencies
       command: pnpm install --frozen-lockfile
   ```
5. Update Husky/lint-staged to use `pnpm` instead of `npm`

**`.npmrc` (create this file)**:

```ini
shamefully-hoist=true
strict-peer-dependencies=false
auto-install-peers=true
```

**Expected Impact**:

- 50-60% smaller disk usage (902MB → 400MB)
- 40-50% faster CI installs (15s → 7-8s)
- Better dependency hygiene

---

### ❌ **NOT RECOMMENDED: Bun**

| Metric | Rating |
| ------ | ------ |
| Effort | MEDIUM |
| Impact | MEDIUM |
| Risk   | HIGH   |

**Why NOT:**

- Capacitor/Ionic tooling may have compatibility issues with Bun
- Angular CLI expects Node.js (some native modules may break)
- CI/CD ecosystem (CircleCI) has mature npm/pnpm support, less so for Bun
- Risk of breaking Gradle/Android builds (Node.js scripts in build chain)

**Verdict**: Wait until Bun has better Capacitor/Ionic support (check in 2026)

---

## 3. Testing

### Current State

- **Jest 29.7** with `jest-preset-angular`
- 1012 tests passing, 45 suites
- Test time: ~45-60s locally, ~90s on CI (maxWorkers=2)
- Memory optimized: 512MB worker limit

### ✅ **RECOMMENDED: Migrate to Vitest**

| Metric | Rating |
| ------ | ------ |
| Effort | MEDIUM |
| Impact | HIGH   |
| Risk   | MEDIUM |

**Why Vitest:**

- **2-5x faster** than Jest (native ESM, Vite-powered)
- **Better TypeScript support** (no `ts-jest` needed)
- **Jest-compatible API** (minimal code changes)
- **Watch mode HMR** (instant re-runs on file changes)
- **Better Angular support** with `@analogjs/vitest-angular`

**Migration steps:**

1. Install dependencies:

   ```bash
   pnpm add -D vitest @analogjs/vitest-angular @vitest/ui jsdom
   pnpm remove jest jest-preset-angular @types/jest
   ```

2. Create `vitest.config.ts`:

   ```typescript
   import { defineConfig } from 'vitest/config';
   import angular from '@analogjs/vitest-angular';

   export default defineConfig({
     plugins: [angular()],
     test: {
       globals: true,
       environment: 'jsdom',
       setupFiles: ['src/setup-vitest.ts'],
       include: ['src/**/*.spec.ts'],
       exclude: ['src/environments/**'],
       coverage: {
         provider: 'v8',
         reporter: ['text', 'html', 'lcov'],
         exclude: ['src/app/**/*.spec.ts', 'src/app/tests/**', 'src/main.ts', 'src/polyfills.ts'],
       },
       reporters: ['default', 'html', 'junit'],
       outputFile: {
         junit: 'test-results/vitest/junit.xml',
       },
     },
   });
   ```

3. Rename `setup-jest.ts` → `setup-vitest.ts` (minimal changes needed)

4. Update `package.json`:

   ```json
   {
     "scripts": {
       "test": "vitest run",
       "test:watch": "vitest",
       "test:ui": "vitest --ui",
       "test:coverage": "vitest run --coverage"
     }
   }
   ```

5. Update `angular.json`:

   ```json
   {
     "test": {
       "builder": "@angular-builders/custom-webpack:karma",
       "options": {
         "main": "src/test.ts",
         "polyfills": "src/polyfills.ts"
       }
     }
   }
   ```

   **OR** remove `test` target entirely and use Vitest CLI directly.

**Expected Impact**:

- 50-70% faster test runs (60s → 15-25s)
- Better DX with instant watch mode
- Reduced node_modules size (remove Jest ecosystem)

**Risk Mitigation**:

- Run Jest and Vitest in parallel during migration
- Migrate suite-by-suite (start with simple services)
- `@analogjs/vitest-angular` is production-ready (used by Analog community)

---

### ❌ **NOT RECOMMENDED: Bun Test Runner**

| Metric | Rating |
| ------ | ------ |
| Effort | HIGH   |
| Impact | MEDIUM |
| Risk   | HIGH   |

**Why NOT:**

- No Angular-specific test utilities
- Breaking changes with Capacitor mocks (IndexedDB, SecureStorage, etc.)
- No established migration path from Jest/Vitest
- CircleCI lacks native Bun support

**Verdict**: Too immature for Angular/Ionic testing

---

## 4. TypeScript Tooling

### Current State

- **TypeScript 5.8.0**
- Strict mode enabled
- Path aliases defined in `tsconfig.json` but not actively used

### ✅ **RECOMMENDED: Add Path Aliases**

| Metric | Rating |
| ------ | ------ |
| Effort | LOW    |
| Impact | MEDIUM |
| Risk   | LOW    |

**Current `tsconfig.json` has unused aliases:**

```json
{
  "compilerOptions": {
    "baseUrl": "./",
    "paths": {
      "@app/*": ["src/app/*"],
      "@core/*": ["src/app/core/*"],
      "@shared/*": ["src/app/shared/*"],
      "@environments/*": ["src/environments/*"]
    }
  }
}
```

**These are defined in `jest.config.js` but not used in code!**

**What to do:**

1. Refactor imports across codebase to use aliases:

   ```typescript
   // BEFORE
   import { ApiGatewayService } from '../../core/services/api-gateway.service';

   // AFTER
   import { ApiGatewayService } from '@core/services/api-gateway.service';
   ```

2. Update ESLint to enforce path aliases:
   ```json
   {
     "rules": {
       "no-restricted-imports": [
         "error",
         {
           "patterns": ["../**/core/*", "../**/shared/*"]
         }
       ]
     }
   }
   ```

**Expected Impact**:

- Cleaner imports
- Easier refactoring (no breaking imports when moving files)
- Better IDE autocomplete

---

### ✅ **RECOMMENDED: Stricter TypeScript Settings**

| Metric | Rating |
| ------ | ------ |
| Effort | MEDIUM |
| Impact | HIGH   |
| Risk   | LOW    |

**Add these flags to `tsconfig.json`:**

```json
{
  "compilerOptions": {
    "strict": true, // Already enabled
    "noUncheckedIndexedAccess": true, // NEW: Safer array/object access
    "noImplicitOverride": true, // Already enabled
    "exactOptionalPropertyTypes": true, // NEW: Stricter optional props
    "noUnusedLocals": true, // NEW: Catch unused variables
    "noUnusedParameters": true, // NEW: Catch unused params
    "allowUnreachableCode": false // NEW: Catch dead code
  }
}
```

**Migration approach:**

1. Enable flags one at a time
2. Fix errors in `src/app/core` first (most critical)
3. Gradually expand to other modules

**Expected Impact**: Catch 10-20% more bugs at compile-time

---

### ❌ **NOT RECOMMENDED: tsup for Library Builds**

| Metric | Rating |
| ------ | ------ |
| Effort | N/A    |
| Impact | N/A    |
| Risk   | N/A    |

**Why NOT:**

- Diabetify is an **application**, not a library
- No need for dual ESM/CJS builds
- Angular CLI already handles all bundling

**Verdict**: Not applicable to this project

---

## 5. Developer Experience

### Current State

- **Husky 9.1.7** for git hooks
- **lint-staged 16.2.3** for pre-commit linting
- No caching layer
- No monorepo tooling

### ✅ **RECOMMENDED: Add Turborepo for Caching**

| Metric | Rating |
| ------ | ------ |
| Effort | LOW    |
| Impact | HIGH   |
| Risk   | LOW    |

**Why Turborepo:**

- **Task caching** (lint/test/build cached by content hash)
- **50-80% faster CI** on unchanged code
- **Works with single repos** (no monorepo required!)
- **Vercel-backed** (actively maintained)

**Setup:**

1. Install:

   ```bash
   pnpm add -D turbo
   ```

2. Create `turbo.json`:

   ```json
   {
     "$schema": "https://turbo.build/schema.json",
     "tasks": {
       "build": {
         "dependsOn": ["^build"],
         "outputs": ["www/**", ".angular/**"]
       },
       "test": {
         "dependsOn": ["^build"],
         "outputs": ["coverage/**", "test-results/**"],
         "cache": true
       },
       "lint": {
         "outputs": [],
         "cache": true
       },
       "format": {
         "outputs": [],
         "cache": true
       },
       "mobile:sync": {
         "dependsOn": ["build"],
         "outputs": ["android/app/build/**"],
         "cache": false // Don't cache native builds
       }
     }
   }
   ```

3. Update `package.json` scripts:

   ```json
   {
     "scripts": {
       "build": "turbo run build",
       "test": "turbo run test",
       "lint": "turbo run lint",
       "quality": "turbo run lint test"
     }
   }
   ```

4. Update CircleCI to use Turborepo cache:

   ```yaml
   - restore_cache:
       keys:
         - turbo-{{ .Branch }}-{{ checksum "pnpm-lock.yaml" }}
         - turbo-{{ .Branch }}-
         - turbo-

   - run: pnpm turbo run test lint --cache-dir=.turbo

   - save_cache:
       key: turbo-{{ .Branch }}-{{ checksum "pnpm-lock.yaml" }}
       paths:
         - .turbo
   ```

**Expected Impact**:

- 50-70% faster CI on non-code changes (docs, config)
- Local caching speeds up repetitive tasks
- Better DX for incremental development

---

### ❌ **NOT RECOMMENDED: Nx Monorepo**

| Metric | Rating    |
| ------ | --------- |
| Effort | VERY HIGH |
| Impact | MEDIUM    |
| Risk   | HIGH      |

**Why NOT:**

- Diabetify is a **single app**, not a monorepo
- Nx adds 100+ dependencies and significant complexity
- Angular CLI is sufficient for single-project builds
- Would require complete project restructure
- CI/CD pipeline rewrite

**Verdict**: Overkill for this project. Consider only if splitting into multiple apps (e.g., separate admin dashboard)

---

### ✅ **RECOMMENDED: Migrate to Lefthook**

| Metric | Rating |
| ------ | ------ |
| Effort | LOW    |
| Impact | MEDIUM |
| Risk   | LOW    |

**Why Lefthook:**

- **10-50x faster** than Husky (Go binary vs Node.js)
- **Parallel hook execution** (run multiple linters simultaneously)
- **YAML config** (easier to read/maintain than shell scripts)
- **Zero dependencies** (single binary, no npm packages)

**Migration:**

1. Install:

   ```bash
   pnpm add -D @evilmartians/lefthook
   pnpm remove husky
   rm -rf .husky
   ```

2. Create `lefthook.yml`:

   ```yaml
   pre-commit:
     parallel: true
     commands:
       lint-ts:
         glob: '*.{ts,js}'
         run: pnpm prettier --write {staged_files} && pnpm eslint --fix {staged_files}
       lint-html:
         glob: '*.html'
         run: pnpm prettier --write {staged_files}
       lint-scss:
         glob: '*.scss'
         run: pnpm prettier --write {staged_files} && pnpm stylelint --fix {staged_files}
       lint-json:
         glob: '*.{json,md}'
         run: pnpm prettier --write {staged_files}

   pre-push:
     commands:
       quality:
         run: pnpm run quality
   ```

3. Update `package.json`:
   ```json
   {
     "scripts": {
       "prepare": "lefthook install"
     }
   }
   ```

**Expected Impact**:

- 30-50% faster pre-commit hooks
- Parallel linting (multiple file types at once)
- Easier configuration

---

## 6. Bundle Optimization

### Current State

- Initial bundle: ~1.8MB (within 2MB budget)
- Component styles: 4-6KB (within 6KB budget)
- Lazy loading: Implemented for routes
- Tree-shaking: Enabled

### ✅ **RECOMMENDED: Advanced Code Splitting**

| Metric | Rating |
| ------ | ------ |
| Effort | MEDIUM |
| Impact | HIGH   |
| Risk   | LOW    |

**Strategies:**

1. **Split vendor chunks by frequency of change:**

   ```json
   // angular.json
   {
     "optimization": {
       "scripts": true,
       "styles": {
         "minify": true,
         "inlineCritical": true
       }
     },
     "commonChunk": false, // Disable default chunking
     "vendorChunk": false,
     "namedChunks": true,
     "outputHashing": "all"
   }
   ```

2. **Lazy load heavy dependencies:**

   ```typescript
   // BEFORE: Lucide icons imported statically
   import { LucideAngularModule } from 'lucide-angular';

   // AFTER: Lazy load icon module
   const loadIcons = () => import('lucide-angular').then(m => m.LucideAngularModule);
   ```

3. **Optimize Ionic component imports:**

   ```typescript
   // BEFORE: Import all from standalone
   import { IonHeader, IonToolbar, IonTitle, ... } from '@ionic/angular/standalone';

   // AFTER: Use IonicModule.forRoot() in main.ts, lazy load pages
   // (Ionic already optimizes this via tree-shaking)
   ```

4. **Defer non-critical modules:**
   ```typescript
   // app.routes.ts
   export const routes: Routes = [
     {
       path: 'tips',
       loadComponent: () => import('./tips/tips.page').then(m => m.TipsPage),
       // Add preloading strategy
     },
     {
       path: 'trends',
       loadComponent: () => import('./trends/trends.page').then(m => m.TrendsPage),
     },
   ];
   ```

**Expected Impact**:

- 15-20% smaller initial bundle (1.8MB → 1.4MB)
- Faster Time to Interactive (TTI)

---

### ✅ **RECOMMENDED: Optimize Tailwind CSS**

| Metric | Rating |
| ------ | ------ |
| Effort | LOW    |
| Impact | MEDIUM |
| Risk   | LOW    |

**Current Tailwind config lacks optimization.**

**Update `tailwind.config.js`:**

```javascript
module.exports = {
  content: ['./src/**/*.{html,ts,scss}', './src/index.html'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      // Keep existing config
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
    require('@aparajita/tailwind-ionic'),
    require('daisyui'),
  ],
  // NEW: Optimization flags
  corePlugins: {
    preflight: false, // Ionic has own reset
  },
  experimental: {
    optimizeUniversalDefaults: true,
  },
};
```

**Add PurgeCSS safelist** (in `angular.json`):

```json
{
  "styles": [
    {
      "input": "src/global.css",
      "bundleName": "global",
      "inject": true
    }
  ],
  "stylePreprocessorOptions": {
    "includePaths": ["src/theme"]
  }
}
```

**Expected Impact**: 10-15% smaller CSS bundle

---

### ✅ **RECOMMENDED: Image Optimization**

| Metric | Rating |
| ------ | ------ |
| Effort | LOW    |
| Impact | MEDIUM |
| Risk   | LOW    |

**Add image optimization to build pipeline:**

1. Install:

   ```bash
   pnpm add -D @squoosh/lib sharp
   ```

2. Create `scripts/optimize-images.mjs`:

   ```javascript
   import { imagetools } from 'vite-imagetools';
   import sharp from 'sharp';
   import { glob } from 'glob';

   const images = await glob('src/assets/**/*.{png,jpg,jpeg}');

   for (const image of images) {
     await sharp(image)
       .resize(1200, null, { withoutEnlargement: true })
       .webp({ quality: 85 })
       .toFile(image.replace(/\.(png|jpg|jpeg)$/, '.webp'));
   }
   ```

3. Update `package.json`:
   ```json
   {
     "scripts": {
       "optimize:images": "node scripts/optimize-images.mjs",
       "prebuild:prod": "npm run optimize:images"
     }
   }
   ```

**Expected Impact**: 30-50% smaller image assets

---

## 7. CI/CD Optimizations

### Current State

- **CircleCI** with Docker executors
- Build time: ~5-8 minutes
- Gradle caching enabled
- No build artifact reuse

### ✅ **RECOMMENDED: Add Remote Caching**

| Metric | Rating |
| ------ | ------ |
| Effort | LOW    |
| Impact | HIGH   |
| Risk   | LOW    |

**Turborepo + Vercel Remote Cache:**

1. Sign up for Vercel (free tier)
2. Link Turborepo:
   ```bash
   pnpm turbo link
   ```
3. Update `.circleci/config.yml`:
   ```yaml
   - run:
       name: Build with remote cache
       command: pnpm turbo run build --token=$TURBO_TOKEN --team=$TURBO_TEAM
   ```
4. Add env vars in CircleCI:
   - `TURBO_TOKEN`
   - `TURBO_TEAM`

**Expected Impact**: 60-80% faster CI on cache hits

---

## Implementation Roadmap

### Phase 1: Quick Wins (1-2 days)

1. ✅ Migrate to pnpm (2 hours)
2. ✅ Add Turborepo caching (1 hour)
3. ✅ Optimize esbuild config (1 hour)
4. ✅ Enable path aliases (4 hours refactoring)
5. ✅ Migrate to Lefthook (30 minutes)

**Expected impact**: 40-50% faster CI, 50% smaller node_modules

---

### Phase 2: Testing Modernization (3-5 days)

1. ✅ Migrate to Vitest (2 days)
   - Day 1: Setup + migrate core services
   - Day 2: Migrate remaining suites + CI integration
2. ✅ Add test UI for debugging (1 hour)
3. ✅ Optimize coverage reporting (1 hour)

**Expected impact**: 50-70% faster test runs

---

### Phase 3: Bundle Optimization (2-3 days)

1. ✅ Implement advanced code splitting (1 day)
2. ✅ Optimize Tailwind CSS (2 hours)
3. ✅ Add image optimization pipeline (4 hours)
4. ✅ Audit bundle with esbuild-visualizer (2 hours)

**Expected impact**: 20-30% smaller production bundle

---

### Phase 4: Type Safety (1-2 weeks, ongoing)

1. ✅ Enable stricter TypeScript flags (1 week of gradual fixes)
2. ✅ Refactor to use path aliases (ongoing with new code)
3. ✅ Add ESLint rules for type safety (1 day)

**Expected impact**: Fewer runtime bugs, better DX

---

## Cost-Benefit Analysis

| Change                    | Effort | CI Time Savings | Bundle Size Savings | Risk   |
| ------------------------- | ------ | --------------- | ------------------- | ------ |
| **pnpm**                  | 2h     | 40%             | 50% (disk)          | LOW    |
| **Turborepo**             | 1h     | 60%             | N/A                 | LOW    |
| **Vitest**                | 2d     | 50% (tests)     | -5% (smaller deps)  | MEDIUM |
| **Lefthook**              | 30m    | 30% (hooks)     | N/A                 | LOW    |
| **esbuild optimization**  | 1h     | 10%             | 10-15%              | LOW    |
| **Code splitting**        | 1d     | N/A             | 20-25%              | LOW    |
| **Tailwind optimization** | 2h     | N/A             | 10-15% (CSS)        | LOW    |
| **Stricter TypeScript**   | 1w     | N/A             | N/A                 | LOW    |
| **Path aliases**          | 4h     | N/A             | N/A                 | LOW    |

---

## Things to AVOID

### ❌ Vite Migration

- Angular CLI already uses esbuild
- No performance gain
- High migration cost

### ❌ Bun Runtime

- Capacitor/Android tooling compatibility issues
- Immature ecosystem for mobile builds

### ❌ Nx Monorepo

- Overkill for single-app project
- Adds massive complexity

### ❌ SWC for TypeScript

- Angular CLI uses esbuild, which is already fast
- SWC has limited Angular support
- No tangible benefit

### ❌ Web Test Runner

- Jest/Vitest have better Angular ecosystem
- More complex setup for Capacitor mocks

---

## Monitoring & Validation

After implementing changes, track these metrics:

1. **CI Build Time**: Target 3-5 minutes (currently 5-8 minutes)
2. **Test Execution**: Target 15-25 seconds (currently 45-60 seconds)
3. **Bundle Size**: Target 1.2-1.4MB initial (currently 1.8MB)
4. **node_modules Size**: Target 350-450MB (currently 902MB)
5. **Developer Feedback**: Survey team on DX improvements

---

## Conclusion

**High-Priority Recommendations (Do First):**

1. ✅ **pnpm** - Biggest disk/speed win with low risk
2. ✅ **Turborepo** - Massive CI speedup for minimal effort
3. ✅ **Lefthook** - Faster git hooks, better DX
4. ✅ **esbuild optimization** - Bundle size wins

**Medium-Priority (Do Next):**

1. ✅ **Vitest** - Modern testing with great DX
2. ✅ **Code splitting** - Smaller bundles, faster loads
3. ✅ **Path aliases** - Cleaner codebase

**Low-Priority (Nice to Have):**

1. ✅ **Stricter TypeScript** - Long-term code quality
2. ✅ **Image optimization** - Asset size reduction

**Avoid:**

- Vite (no benefit over Angular CLI + esbuild)
- Bun (immature for mobile builds)
- Nx (overkill for single app)

---

**Total estimated effort**: 2-3 weeks for full implementation
**Expected ROI**: 50% faster CI, 40% smaller artifacts, significantly better DX
