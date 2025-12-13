# Path Alias Migration Plan

## Executive Summary

This document outlines the migration from relative imports to path aliases in the Diabetify Angular application. The migration will improve code maintainability, reduce import complexity, and align with modern Angular best practices.

**Status**: Analysis Complete - Ready for Implementation
**Date**: 2025-12-13
**Estimated Effort**: 4-6 hours (automated + verification)

---

## Current State Analysis

### TypeScript Configuration

**File**: `tsconfig.json`

Current configuration:

- `baseUrl`: `./` (set, enables path mapping)
- `paths`: **NOT CONFIGURED** (no path aliases currently defined)

**File**: `tsconfig.app.json`

- Extends main tsconfig.json
- No additional path configurations

### Import Pattern Statistics

Total TypeScript files analyzed: **224 files** in `src/app/`

#### Relative Import Occurrences by Pattern

| Import Pattern           | Occurrences | Files Affected | Description                            |
| ------------------------ | ----------- | -------------- | -------------------------------------- |
| `../../core/`            | 71          | 15             | Deep core imports (2 levels up)        |
| `../core/`               | 116         | 28             | Core imports (1 level up)              |
| `../../shared/`          | 11          | 10             | Deep shared imports (2 levels up)      |
| `../shared/`             | 37          | 17             | Shared imports (1 level up)            |
| `../../../environments/` | 18          | 18             | Deep environment imports (3 levels up) |
| `../../environments/`    | 5           | 5              | Environment imports (2 levels up)      |
| Total environments       | 26          | 23             | All environment imports combined       |

**Total relative imports**: ~260+ occurrences
**Total files with relative imports**: 123 files (55% of codebase)

### Representative Import Examples

#### Dashboard Page (src/app/dashboard/dashboard.page.ts)

```typescript
// Current relative imports
import { ReadingsService } from '../core/services/readings.service';
import { LoggerService } from '../core/services/logger.service';
import { LocalGlucoseReading } from '../core/models/glucose-reading.model';
import { StatCardComponent } from '../shared/components/stat-card/stat-card.component';
import { EmptyStateComponent } from '../shared/components/empty-state/empty-state.component';
import { environment } from '../../environments/environment';
import { ROUTES } from '../core/constants';
```

#### API Gateway Service (src/app/core/services/api-gateway.service.ts)

```typescript
// Current relative imports
import { environment } from '../../../environments/environment';
import { API_GATEWAY_BASE_URL } from '../../shared/config/api-base-url';
import { LocalGlucoseReading } from '../models/glucose-reading.model';
```

#### Deep Nested Components (src/app/dashboard/dashboard-detail/dashboard-detail.page.ts)

```typescript
// Current relative imports (2 levels deep)
import { ReadingsService } from '../../core/services/readings.service';
import { ProfileService } from '../../core/services/profile.service';
import { GlucoseStatistics } from '../../core/models/glucose-reading.model';
import { StatCardComponent } from '../../shared/components/stat-card/stat-card.component';
import { ROUTES } from '../../core/constants';
```

---

## Proposed Solution

### Path Aliases Configuration

Add the following to `tsconfig.json` under `compilerOptions`:

```json
{
  "compilerOptions": {
    "baseUrl": "./",
    "paths": {
      "@core/*": ["src/app/core/*"],
      "@shared/*": ["src/app/shared/*"],
      "@env/*": ["src/environments/*"],
      "@tests/*": ["src/app/tests/*"],
      "@testing/*": ["src/testing/*"]
    }
  }
}
```

### Migration Examples

#### Before → After (Dashboard Page)

```typescript
// BEFORE
import { ReadingsService } from '../core/services/readings.service';
import { LoggerService } from '../core/services/logger.service';
import { LocalGlucoseReading } from '../core/models/glucose-reading.model';
import { StatCardComponent } from '../shared/components/stat-card/stat-card.component';
import { environment } from '../../environments/environment';
import { ROUTES } from '../core/constants';

// AFTER
import { ReadingsService } from '@core/services/readings.service';
import { LoggerService } from '@core/services/logger.service';
import { LocalGlucoseReading } from '@core/models/glucose-reading.model';
import { StatCardComponent } from '@shared/components/stat-card/stat-card.component';
import { environment } from '@env/environment';
import { ROUTES } from '@core/constants';
```

#### Before → After (Deep Nested Component)

```typescript
// BEFORE
import { ReadingsService } from '../../core/services/readings.service';
import { StatCardComponent } from '../../shared/components/stat-card/stat-card.component';

// AFTER
import { ReadingsService } from '@core/services/readings.service';
import { StatCardComponent } from '@shared/components/stat-card/stat-card.component';
```

#### Before → After (Core Service)

```typescript
// BEFORE
import { environment } from '../../../environments/environment';
import { API_GATEWAY_BASE_URL } from '../../shared/config/api-base-url';
import { LocalGlucoseReading } from '../models/glucose-reading.model';

// AFTER
import { environment } from '@env/environment';
import { API_GATEWAY_BASE_URL } from '@shared/config/api-base-url';
import { LocalGlucoseReading } from '@core/models/glucose-reading.model';
```

---

## Benefits

### 1. **Improved Readability**

- Clear intent: `@core/services/` vs `../../../core/services/`
- Immediate understanding of import source
- Consistent import style across the codebase

### 2. **Refactoring Safety**

- Moving files no longer breaks imports
- Rename/restructure folders without updating hundreds of imports
- Easier to reorganize code structure

### 3. **Developer Experience**

- Better IDE autocomplete support
- Faster navigation to source files
- Reduced mental overhead when writing imports

### 4. **Maintainability**

- Aligns with modern Angular best practices
- Easier onboarding for new developers
- Consistent with industry standards

### 5. **Future-Proof**

- Supports monorepo migrations
- Compatible with Nx and other build tools
- Easier to extract code to libraries

---

## Migration Strategy

### Phase 1: Configuration (15 minutes)

1. **Update tsconfig.json**
   - Add `paths` configuration
   - Verify `baseUrl` is set to `./`

2. **Update jest.config.js**
   - Add `moduleNameMapper` to support path aliases in tests

   ```javascript
   moduleNameMapper: {
     '^@core/(.*)$': '<rootDir>/src/app/core/$1',
     '^@shared/(.*)$': '<rootDir>/src/app/shared/$1',
     '^@env/(.*)$': '<rootDir>/src/environments/$1',
     '^@tests/(.*)$': '<rootDir>/src/app/tests/$1',
     '^@testing/(.*)$': '<rootDir>/src/testing/$1',
   }
   ```

3. **Update playwright.config.ts** (if needed for E2E tests)

### Phase 2: Automated Migration (2-3 hours)

**Option A: Manual Search & Replace (Safer)**

Use VS Code's multi-file search & replace with regex:

1. **Core imports (1 level)**
   - Search: `from ['"]\.\.\/core\/(.*?)['"]`
   - Replace: `from '@core/$1'`

2. **Core imports (2 levels)**
   - Search: `from ['"]\.\.\/\.\.\/core\/(.*?)['"]`
   - Replace: `from '@core/$1'`

3. **Shared imports (1 level)**
   - Search: `from ['"]\.\.\/shared\/(.*?)['"]`
   - Replace: `from '@shared/$1'`

4. **Shared imports (2 levels)**
   - Search: `from ['"]\.\.\/\.\.\/shared\/(.*?)['"]`
   - Replace: `from '@shared/$1'`

5. **Environment imports (2 levels)**
   - Search: `from ['"]\.\.\/\.\.\/environments\/(.*?)['"]`
   - Replace: `from '@env/$1'`

6. **Environment imports (3 levels)**
   - Search: `from ['"]\.\.\/\.\.\/\.\.\/environments\/(.*?)['"]`
   - Replace: `from '@env/$1'`

7. **Tests imports**
   - Search: `from ['"]\.\.\/tests\/(.*?)['"]`
   - Replace: `from '@tests/$1'`

**Option B: Automated Script (Faster)**

Create a migration script using `ts-morph` or similar AST tool.

### Phase 3: Verification (1-2 hours)

1. **Verify TypeScript Compilation**

   ```bash
   npm run build
   ```

2. **Run All Tests**

   ```bash
   npm test
   ```

3. **Run E2E Tests**

   ```bash
   npm run test:e2e
   ```

4. **Verify Linting**

   ```bash
   npm run lint
   ```

5. **Manual Smoke Testing**
   - Test development server: `npm run start:mock`
   - Test production build: `npm run build:prod`
   - Test mobile build: `npm run mobile:sync`

### Phase 4: Documentation & Cleanup (30 minutes)

1. **Update CLAUDE.md**
   - Add path alias usage guidelines
   - Update import examples in documentation

2. **Update Code Review Guidelines**
   - Require path aliases for new code
   - Reject PRs with relative imports (via linting)

3. **Add ESLint Rule** (optional, recommended)
   ```javascript
   // .eslintrc.json
   {
     "rules": {
       "no-restricted-imports": ["error", {
         "patterns": [
           "../core/*",
           "../../core/*",
           "../../../core/*",
           "../shared/*",
           "../../shared/*",
           "../../../shared/*",
           "../../environments/*",
           "../../../environments/*"
         ]
       }]
     }
   }
   ```

---

## Files Requiring Updates

### High-Priority Files (Most Imports)

Based on analysis, these files have the most relative imports and should be prioritized:

1. **Dashboard Pages** (15+ imports each)
   - `src/app/dashboard/dashboard.page.ts`
   - `src/app/dashboard/dashboard.page.spec.ts`
   - `src/app/dashboard/dashboard-detail/dashboard-detail.page.ts`

2. **Core Services** (10+ imports each)
   - `src/app/core/services/api-gateway.service.ts`
   - `src/app/core/services/readings.service.ts`
   - `src/app/core/services/local-auth.service.ts`
   - `src/app/core/services/service-orchestrator.service.ts`

3. **Page Components** (8+ imports each)
   - `src/app/readings/readings.page.ts`
   - `src/app/appointments/appointments.page.ts`
   - `src/app/profile/profile.page.ts`
   - `src/app/settings/settings.page.ts`

4. **Integration Tests** (10+ imports each)
   - `src/app/tests/integration/*.spec.ts`
   - All test helper files

### Complete File List

Total files needing updates: **123 files**

Categories:

- **Pages**: ~30 files
- **Core Services**: ~40 files
- **Shared Components**: ~15 files
- **Tests**: ~35 files
- **Other**: ~3 files

Full list available via:

```bash
grep -r "from ['\"]\.\./" src/app --include="*.ts" -l
```

---

## Risks & Mitigation

### Risk 1: Breaking Changes During Migration

**Severity**: Medium
**Mitigation**:

- Work on a dedicated branch
- Run full test suite after each batch of changes
- Use atomic commits for easy rollback
- Test mobile builds separately

### Risk 2: IDE Cache Issues

**Severity**: Low
**Mitigation**:

- Restart TypeScript language server
- Clear `.angular` cache: `rm -rf .angular`
- Clear node_modules: `npm run clean`

### Risk 3: Build Tool Compatibility

**Severity**: Low
**Mitigation**:

- Angular CLI supports path aliases out of the box
- Jest configuration already tested
- Playwright may need config updates

### Risk 4: Missed Imports

**Severity**: Low
**Mitigation**:

- Use comprehensive regex patterns
- Run TypeScript compiler to catch missing imports
- Full test suite execution

---

## Post-Migration Validation Checklist

- [ ] TypeScript compilation succeeds (`npm run build`)
- [ ] All unit tests pass (`npm test`)
- [ ] All E2E tests pass (`npm run test:e2e`)
- [ ] Linting passes (`npm run lint`)
- [ ] Development server runs (`npm run start:mock`)
- [ ] Production build succeeds (`npm run build:prod`)
- [ ] Mobile sync works (`npm run mobile:sync`)
- [ ] No console errors in browser
- [ ] All imports resolve correctly in IDE
- [ ] No circular dependency warnings
- [ ] Git diff review completed
- [ ] Documentation updated

---

## Implementation Timeline

| Phase            | Duration      | Tasks                                       |
| ---------------- | ------------- | ------------------------------------------- |
| 1. Configuration | 15 min        | Update tsconfig, jest, playwright configs   |
| 2. Migration     | 2-3 hours     | Automated search & replace across 123 files |
| 3. Verification  | 1-2 hours     | Build, test, manual smoke testing           |
| 4. Documentation | 30 min        | Update CLAUDE.md, add ESLint rules          |
| **Total**        | **4-6 hours** | Complete migration with full testing        |

---

## Success Criteria

1. **Zero relative imports** for `core/`, `shared/`, `environments/`
2. **All tests pass** (1012 tests, 0 failures)
3. **Clean builds** for web and mobile
4. **No TypeScript errors** in IDE
5. **Documentation updated** with new import patterns
6. **ESLint rule** enforcing path aliases

---

## Example ESLint Configuration

Add to `.eslintrc.json` to enforce path aliases going forward:

```json
{
  "rules": {
    "no-restricted-imports": [
      "error",
      {
        "patterns": [
          {
            "group": ["../core/*", "../../core/*", "../../../core/*"],
            "message": "Use @core/* path alias instead of relative imports"
          },
          {
            "group": ["../shared/*", "../../shared/*", "../../../shared/*"],
            "message": "Use @shared/* path alias instead of relative imports"
          },
          {
            "group": ["../../environments/*", "../../../environments/*"],
            "message": "Use @env/* path alias instead of relative imports"
          }
        ]
      }
    ]
  }
}
```

---

## References

- Angular Style Guide: https://angular.io/guide/styleguide#t-04-06
- TypeScript Module Resolution: https://www.typescriptlang.org/docs/handbook/module-resolution.html
- Jest Module Mapper: https://jestjs.io/docs/configuration#modulenamemapper-objectstring-string--arraystring

---

## Next Steps

1. **Create feature branch**: `git checkout -b refactor/path-aliases`
2. **Update configurations** (Phase 1)
3. **Run automated migration** (Phase 2)
4. **Verify & test** (Phase 3)
5. **Update documentation** (Phase 4)
6. **Create PR** with detailed change summary
7. **Team review** before merging to master

---

**Document Version**: 1.0
**Last Updated**: 2025-12-13
**Status**: Ready for Implementation
