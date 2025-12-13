# Tooling Modernization - Implementation Checklist

**Project**: Diabetify
**Date Started**: \***\*\_\_\_\*\***
**Team Lead**: \***\*\_\_\_\*\***

---

## Pre-Implementation

- [ ] Review all documentation in `docs/`:
  - [ ] `TOOLING_RECOMMENDATIONS_SUMMARY.md`
  - [ ] `TOOLING_DECISION_MATRIX.md`
  - [ ] `ARCHITECTURE_TOOLING_COMPARISON.md`
  - [ ] `migration-guides/01-pnpm-migration.md`
  - [ ] `migration-guides/02-turborepo-setup.md`

- [ ] Team meeting to discuss approach
- [ ] Assign team members to phases
- [ ] Create feature branch: `feat/modernize-tooling`
- [ ] Backup current `package-lock.json`: `cp package-lock.json package-lock.json.backup`
- [ ] Document current baseline metrics:
  - [ ] `du -sh node_modules` → \***\*\_\_\_\*\*** MB
  - [ ] `time npm install` → \***\*\_\_\_\*\*** seconds
  - [ ] `time npm test` → \***\*\_\_\_\*\*** seconds
  - [ ] `time npm run build` → \***\*\_\_\_\*\*** seconds
  - [ ] CI build time → \***\*\_\_\_\*\*** minutes

---

## Phase 1: Quick Wins (1-2 days)

### Day 1 Morning: pnpm Migration (2 hours)

#### Setup

- [ ] Install pnpm globally: `npm install -g pnpm@9`
- [ ] Verify installation: `pnpm -v` (should show 9.x.x)
- [ ] Create `.npmrc`:
  ```ini
  shamefully-hoist=true
  strict-peer-dependencies=false
  auto-install-peers=true
  ```

#### Migration

- [ ] Remove npm artifacts: `rm -rf node_modules package-lock.json`
- [ ] Install with pnpm: `pnpm install`
- [ ] Verify `pnpm-lock.yaml` was created
- [ ] Update `.gitignore`:
  ```
  pnpm-lock.yaml
  .pnpm-debug.log*
  ```

#### Testing

- [ ] Build works: `pnpm run build`
- [ ] Tests pass: `pnpm test` (all 1012 tests)
- [ ] Dev server works: `pnpm start`
- [ ] Capacitor sync works: `pnpm run mobile:sync`
- [ ] Lint passes: `pnpm run lint`

#### CI Update

- [ ] Update `.circleci/config.yml`:
  - [ ] Add pnpm installation step
  - [ ] Change `npm ci` → `pnpm install --frozen-lockfile`
  - [ ] Update cache keys to use `pnpm-lock.yaml`
  - [ ] Cache `~/.pnpm-store` instead of `node_modules`

#### Verification

- [ ] Push to feature branch
- [ ] Verify CI passes
- [ ] Measure new metrics:
  - [ ] `du -sh node_modules` → \***\*\_\_\_\*\*** MB (target: 350-450MB)
  - [ ] `time pnpm install` → \***\*\_\_\_\*\*** seconds (target: 5-10s)

**Checkpoint**: If tests fail, rollback to npm before proceeding.

---

### Day 1 Afternoon: Turborepo Setup (1 hour)

#### Installation

- [ ] Install Turborepo: `pnpm add -D turbo`
- [ ] Create `turbo.json` (copy from migration guide)
- [ ] Add `.turbo` to `.gitignore`

#### Configuration

- [ ] Update `package.json` scripts:
  ```json
  {
    "build": "turbo run build",
    "test": "turbo run test",
    "lint": "turbo run lint",
    "quality": "turbo run lint test"
  }
  ```

#### Testing

- [ ] First build: `pnpm run build` (cold cache)
- [ ] Second build: `pnpm run build` (should show "FULL TURBO")
- [ ] Verify `.turbo/cache/` contains artifacts
- [ ] Test parallel tasks: `pnpm turbo run lint test --parallel`

#### Remote Cache (Optional)

- [ ] Sign up for Vercel: `pnpm dlx turbo login`
- [ ] Link repo: `pnpm dlx turbo link`
- [ ] Add env vars to CircleCI:
  - [ ] `TURBO_TOKEN`
  - [ ] `TURBO_TEAM`

#### CI Update

- [ ] Update build command: `pnpm turbo run build --token=$TURBO_TOKEN --team=$TURBO_TEAM`
- [ ] Include `.turbo` in workspace artifacts

#### Verification

- [ ] Local cache hits work
- [ ] Remote cache works (if configured)
- [ ] CI build passes
- [ ] Measure cache hit rate on second CI run: \***\*\_\_\_\*\*** %

**Checkpoint**: Verify cache hit rate >50% before proceeding.

---

### Day 1 Late: Lefthook Migration (30 minutes)

#### Installation

- [ ] Install Lefthook: `pnpm add -D @evilmartians/lefthook`
- [ ] Remove Husky: `pnpm remove husky`
- [ ] Delete `.husky/` directory

#### Configuration

- [ ] Create `lefthook.yml` (copy from example below)
- [ ] Update `package.json`:
  ```json
  {
    "prepare": "lefthook install"
  }
  ```
- [ ] Run `pnpm prepare` to install hooks

#### Testing

- [ ] Make a small change to a TS file
- [ ] Run `git add .`
- [ ] Run `git commit -m "test: verify lefthook"` (should trigger pre-commit)
- [ ] Verify hook ran in <3 seconds

#### Verification

- [ ] Pre-commit hooks work
- [ ] Hooks run in parallel
- [ ] Hook time: \***\*\_\_\_\*\*** seconds (target: 2-3s)

**Checkpoint**: Test on multiple file types (TS, HTML, SCSS).

---

### Day 2 Morning: esbuild Optimization (1 hour)

#### Update `angular.json`

- [ ] Set tighter budgets:
  ```json
  {
    "maximumWarning": "1.5mb",
    "maximumError": "2mb"
  }
  ```
- [ ] Enable optimization flags (see full config in recommendations doc)

#### Testing

- [ ] Production build: `pnpm run build:prod`
- [ ] Verify bundle size reduced
- [ ] Test deployed app works

#### Verification

- [ ] Bundle size: \***\*\_\_\_\*\*** MB (target: <1.6MB)
- [ ] App functionality intact

---

### Day 2 Afternoon: Path Aliases Refactoring (4 hours)

#### Preparation

- [ ] Verify `tsconfig.json` has path aliases configured
- [ ] Add ESLint rule to enforce aliases:
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

#### Refactoring

- [ ] Refactor `src/app/core/` imports
- [ ] Refactor `src/app/shared/` imports
- [ ] Refactor page components
- [ ] Run `pnpm run lint:fix` to auto-fix violations

#### Testing

- [ ] All tests pass: `pnpm test`
- [ ] Build succeeds: `pnpm run build`
- [ ] Dev server works: `pnpm start`

#### Verification

- [ ] No `../../` imports in codebase
- [ ] All imports use `@core/`, `@shared/`, etc.

---

### Phase 1 Completion Checklist

- [ ] All tests pass (1012/1012)
- [ ] CI build passes
- [ ] Measure final Phase 1 metrics:
  - [ ] node_modules: \***\*\_\_\_\*\*** MB (target: 350-450MB, -50%)
  - [ ] Install time: \***\*\_\_\_\*\*** seconds (target: 5-10s, -50%)
  - [ ] CI build time: \***\*\_\_\_\*\*** minutes (target: 2-4min, -50%)
  - [ ] Pre-commit hooks: \***\*\_\_\_\*\*** seconds (target: 2-3s, -60%)

- [ ] Create PR for Phase 1
- [ ] Team review and merge
- [ ] Deploy to staging
- [ ] Verify production build works

**Decision Point**: Proceed to Phase 2 or pause for stabilization?

---

## Phase 2: Testing Modernization (3-5 days)

### Day 1: Vitest Setup

#### Installation

- [ ] Install Vitest: `pnpm add -D vitest @analogjs/vitest-angular @vitest/ui jsdom`
- [ ] Remove Jest (KEEP INSTALLED until migration complete):
  ```bash
  # Don't remove yet, keep both during migration
  ```

#### Configuration

- [ ] Create `vitest.config.ts` (copy from migration guide)
- [ ] Rename `setup-jest.ts` → `setup-vitest.ts`
- [ ] Update Capacitor mocks in `setup-vitest.ts`

#### Testing

- [ ] Run Vitest: `pnpm vitest --run`
- [ ] Should fail (no tests migrated yet)
- [ ] Verify config loads without errors

---

### Day 2: Migrate Core Services

#### Migration Priority

1. [ ] `src/app/core/services/database.service.spec.ts`
2. [ ] `src/app/core/services/profile.service.spec.ts`
3. [ ] `src/app/core/services/api-gateway.service.spec.ts`
4. [ ] `src/app/core/services/local-auth.service.spec.ts`
5. [ ] Remaining core services

#### For Each Spec File

- [ ] Update imports: `jest` → `vitest`
- [ ] Replace `jest.fn()` → `vi.fn()`
- [ ] Replace `jest.spyOn()` → `vi.spyOn()`
- [ ] Update `beforeEach` async patterns if needed
- [ ] Run individual test: `pnpm vitest <file>`

#### Verification

- [ ] All core service tests pass in Vitest
- [ ] Original Jest tests still pass (keep both working)

---

### Day 3: Migrate Components

#### Migration Priority

1. [ ] `src/app/dashboard/`
2. [ ] `src/app/readings/`
3. [ ] `src/app/appointments/`
4. [ ] `src/app/profile/`
5. [ ] Remaining pages

#### Verification

- [ ] Component tests pass in Vitest
- [ ] Ionic component mocking works

---

### Day 4: CI Integration

#### Update `angular.json`

- [ ] Replace Jest builder with Vitest (or remove entirely)
- [ ] Update `package.json`:
  ```json
  {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage"
  }
  ```

#### Update `.circleci/config.yml`

- [ ] Replace `pnpm test` with `pnpm vitest --run`
- [ ] Update coverage paths if needed

#### Verification

- [ ] CI tests pass
- [ ] Coverage reports generated
- [ ] Test results visible in CircleCI UI

---

### Day 5: Cleanup

#### Remove Jest

- [ ] Remove Jest packages: `pnpm remove jest jest-preset-angular @types/jest jest-junit`
- [ ] Delete `jest.config.js`
- [ ] Delete `jest.integration.config.js`
- [ ] Delete `setup-jest.ts`

#### Verification

- [ ] All tests pass: `pnpm test` (should run Vitest)
- [ ] CI passes
- [ ] Coverage reports work
- [ ] Test time: \***\*\_\_\_\*\*** seconds (target: 15-25s)

---

### Phase 2 Completion Checklist

- [ ] All 1012 tests migrated to Vitest
- [ ] CI integration complete
- [ ] Test execution time reduced by 50-70%
- [ ] Coverage reporting works
- [ ] Jest dependencies removed

**Decision Point**: Proceed to Phase 3 or pause for stabilization?

---

## Phase 3: Bundle Optimization (2-3 days)

### Day 1: Code Splitting

#### Analysis

- [ ] Run bundle analyzer: `pnpm run build:analyze`
- [ ] Open `npx esbuild-visualizer --metadata dist/stats.json`
- [ ] Identify large chunks

#### Implementation

- [ ] Implement advanced lazy loading (see recommendations doc)
- [ ] Split vendor chunks by update frequency
- [ ] Add preload hints for critical routes

#### Verification

- [ ] Bundle size reduced: \***\*\_\_\_\*\*** MB → \***\*\_\_\_\*\*** MB
- [ ] App loads correctly
- [ ] Lazy routes work

---

### Day 2: CSS/Asset Optimization

#### Tailwind Optimization

- [ ] Update `tailwind.config.js` (see recommendations)
- [ ] Enable `optimizeUniversalDefaults`
- [ ] Disable unused core plugins

#### Image Optimization

- [ ] Create `scripts/optimize-images.mjs`
- [ ] Convert PNG/JPG → WebP
- [ ] Add to `prebuild:prod` script

#### Verification

- [ ] CSS bundle size: \***\*\_\_\_\*\*** KB (target: -10-15%)
- [ ] Image sizes: \***\*\_\_\_\*\*** KB (target: -30-50%)
- [ ] Images render correctly

---

### Day 3: Verification & Testing

#### Lighthouse Audits

- [ ] Run Lighthouse on deployed app
- [ ] Performance score: \***\*\_\_\_\*\*** (target: >90)
- [ ] Best Practices score: \***\*\_\_\_\*\*** (target: >95)

#### Real Device Testing

- [ ] Test on Android device
- [ ] Measure load time on 4G
- [ ] Verify offline functionality

#### Final Metrics

- [ ] Production bundle: \***\*\_\_\_\*\*** MB (target: 1.2-1.4MB)
- [ ] Initial load time: \***\*\_\_\_\*\*** seconds (target: <2s on 4G)
- [ ] Time to Interactive: \***\*\_\_\_\*\*** seconds

---

### Phase 3 Completion Checklist

- [ ] Bundle size reduced by 20-30%
- [ ] Lighthouse scores improved
- [ ] Real device performance verified
- [ ] All functionality intact

---

## Phase 4: TypeScript Strictness (1-2 weeks, ongoing)

### Week 1: Enable Stricter Flags

#### Update `tsconfig.json`

- [ ] Enable `noUncheckedIndexedAccess`
- [ ] Enable `exactOptionalPropertyTypes`
- [ ] Enable `noUnusedLocals`
- [ ] Enable `noUnusedParameters`
- [ ] Enable `allowUnreachableCode: false`

#### Incremental Fixes

- [ ] Day 1-2: Fix `src/app/core/` errors
- [ ] Day 3-4: Fix `src/app/shared/` errors
- [ ] Day 5: Fix page component errors

---

### Week 2: ESLint Rules

#### Update ESLint Config

- [ ] Add type-safety rules
- [ ] Enforce path alias usage
- [ ] Add import order rules

#### Verification

- [ ] `pnpm run lint` passes
- [ ] No new TypeScript errors
- [ ] Code quality improved

---

## Post-Implementation

### Documentation Updates

- [ ] Update `README.md` with pnpm install instructions
- [ ] Update `CLAUDE.md` with new scripts
- [ ] Update onboarding docs
- [ ] Create troubleshooting guide

### Team Training

- [ ] Team meeting to demonstrate new tools
- [ ] Share Vitest vs Jest differences
- [ ] Explain Turborepo caching
- [ ] Document common issues

### Monitoring

- [ ] Track CI build times for 2 weeks
- [ ] Monitor cache hit rates
- [ ] Collect team feedback
- [ ] Document pain points

---

## Success Metrics Summary

### Baseline (Before)

- node_modules: \***\*\_\_\_\*\*** MB
- Install time: \***\*\_\_\_\*\*** seconds
- Build time: \***\*\_\_\_\*\*** seconds
- Test time: \***\*\_\_\_\*\*** seconds
- Pre-commit hooks: \***\*\_\_\_\*\*** seconds
- CI total time: \***\*\_\_\_\*\*** minutes
- Bundle size: \***\*\_\_\_\*\*** MB

### Target (After All Phases)

- node_modules: 350-450MB (-50-60%)
- Install time: 5-10s (-50%)
- Build time: 1-3s cached (-90%)
- Test time: 15-25s (-67%)
- Pre-commit hooks: 2-3s (-60%)
- CI total time: 2-4min (-50%)
- Bundle size: 1.2-1.4MB (-25-30%)

### Actual Results (After Implementation)

- node_modules: \***\*\_\_\_\*\*** MB (**\_**% change)
- Install time: \***\*\_\_\_\*\*** seconds (**\_**% change)
- Build time: \***\*\_\_\_\*\*** seconds (**\_**% change)
- Test time: \***\*\_\_\_\*\*** seconds (**\_**% change)
- Pre-commit hooks: \***\*\_\_\_\*\*** seconds (**\_**% change)
- CI total time: \***\*\_\_\_\*\*** minutes (**\_**% change)
- Bundle size: \***\*\_\_\_\*\*** MB (**\_**% change)

---

## Rollback Procedures

### If Phase 1 Fails (pnpm/Turborepo)

```bash
# Remove pnpm artifacts
rm -rf node_modules pnpm-lock.yaml .npmrc

# Restore npm
cp package-lock.json.backup package-lock.json
npm ci

# Revert CI config
git checkout .circleci/config.yml

# Remove Turborepo
rm turbo.json
git checkout package.json
```

### If Phase 2 Fails (Vitest)

```bash
# Reinstall Jest
pnpm add -D jest jest-preset-angular @types/jest jest-junit

# Restore config
git checkout jest.config.js setup-jest.ts

# Revert package.json scripts
git checkout package.json
```

---

## Appendix: Lefthook Configuration

**File**: `lefthook.yml`

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

---

## Troubleshooting Reference

| Issue                             | Solution                                               |
| --------------------------------- | ------------------------------------------------------ |
| "Cannot find module X" after pnpm | Run `pnpm add X` (missing dependency)                  |
| Capacitor CLI fails               | Ensure `.npmrc` has `shamefully-hoist=true`            |
| Turborepo cache never hits        | Check `inputs` in `turbo.json` exclude generated files |
| Vitest tests fail but Jest passed | Check for `jest.fn()` → `vi.fn()` migration            |
| Lefthook hooks don't run          | Run `pnpm prepare` to reinstall hooks                  |
| CI build slower after Turborepo   | Verify `TURBO_TOKEN` and `TURBO_TEAM` are set          |

---

**Completion Date**: \***\*\_\_\_\*\***
**Final Sign-off**: \***\*\_\_\_\*\***
