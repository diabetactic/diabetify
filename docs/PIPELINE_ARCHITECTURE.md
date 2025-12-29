# Diabetify Pipeline Architecture & Visualization

---

## Current CI/CD Pipeline Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          GITHUB PUSH / PR EVENT                              │
└──────────────────────────────────┬──────────────────────────────────────────┘

         ┌──────────────────────────┴──────────────────────────┐
         │                                                      │
    PUSH EVENT                                             PR EVENT
         │                                                      │
         ▼                                                      ▼
    ┌─────────────────┐                                   ┌──────────────────┐
    │ Branch: master  │                                   │ Branch: PR       │
    │ Paths: src/**   │                                   │ No path filter    │
    │ Tag: v*         │                                   │                  │
    └────────┬────────┘                                   └────────┬─────────┘
             │                                                     │
             └─────────────────────────┬──────────────────────────┘
                                       │
                        ┌──────────────▼────────────────┐
                        │   CONCURRENCY GROUP SETUP     │
                        │  (cancel-in-progress: true)   │
                        └──────────────┬────────────────┘
                                       │
         ┌─────────────────────────────┴──────────────────────────┐
         │                                                        │
         │           PHASE 1: FAST FEEDBACK (parallel)            │
         │                  ~90 seconds total                      │
         │                                                        │
         ├──────────────────┬──────────────────┬─────────────────┤
         │                  │                  │                 │
         ▼                  ▼                  ▼                 ▼
    ┌─────────┐      ┌──────────┐      ┌────────────┐
    │  LINT   │      │  UNIT    │      │   i18n     │
    │         │      │  TESTS   │      │   CHECK    │
    │ ✓ TSC   │      │          │      │            │
    │ ✓ ESLint│      │ ✓ Vitest │      │ ✓ Keys ok? │
    │         │      │ ✓ Coverage       │            │
    └────┬────┘      └────┬─────┘      └────┬───────┘
         │                │                  │
         │                ▼                  │
         │           ┌──────────┐            │
         │           │ DeepSource           │
         │           │ Upload   │            │
         │           └──────────┘            │
         │                │                  │
         └────┬───────────┴──────────────────┘
              │
              ▼ (All succeed? Continue)
         ┌──────────────────────┐
         │ PHASE 2: BUILD (~60s) │
         │  (depends: Phase 1)   │
         │                      │
         ├──────────────────────┤
         │ • Build Mock Mode    │
         │ • Angular optimizer  │
         │ • Upload artifact    │
         └──────────┬───────────┘
                    │
         ┌──────────┴──────────────────────┐
         │                                 │
    MASTER/MAIN                       ALWAYS CONTINUE
    (special handling)                (upload www/)
         │                                 │
         ├──────────┬──────────────────────┤
         │          │                      │
         ▼          ▼                      ▼
    ┌──────────────────────┐        ┌─────────────┐
    │  PHASE 3: UI TESTS   │        │  PHASE 4:   │
    │  (~90 seconds)       │        │  DOCKER E2E │
    │  (depends: build)    │        │  (optional) │
    │                      │        │             │
    │ • Playwright cached  │        │ Conditional:│
    │ • Mobile chromium    │        │ • master OR │
    │ • Mock backend       │        │ • run-e2e   │
    │ • Upload artifacts   │        │   label     │
    └──────────┬───────────┘        │             │
               │                    │ • Docker    │
               │                    │   services  │
               │                    │ • Maestro   │
               │                    │   tests     │
               │                    │ • Full E2E  │
               │                    │             │
               │                    └────────┬────┘
               │                             │
               └──────────────┬──────────────┘
                              │
                              ▼
                        ┌────────────────┐
                        │  PR LABELER    │
                        │                │
                        │ • Size labels  │
                        │   (xs/s/m/l)   │
                        └────────────────┘
```

---

## Deployment Pipeline Flow

```
┌────────────────────────────────────────────────────────────────┐
│              DEPLOYMENT TRIGGER EVENTS                         │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│ • Push tag (v*) → Deploy to Netlify                          │
│ • Manual dispatch → Manual deployment + E2E tests             │
│ • Develop branch → Staging environment (NEW)                  │
│                                                                │
└────────────────────────┬─────────────────────────────────────┘
                         │
                    ┌────▼────────┐
                    │   BUILD     │
                    │  PRODUCTION │
                    └────┬────────┘
                         │
                    ┌────▼────────────────┐
                    │   PLAYWRIGHT E2E    │
                    │   (optional, UI)    │
                    └────┬────────────────┘
                         │
              ┌──────────┴──────────┐
              │                     │
              ▼                     ▼
         ┌─────────┐          ┌──────────┐
         │ SUCCESS │          │  FAILED  │
         └────┬────┘          └──────────┘
              │
         ┌────▼─────────────┐
         │ DEPLOY TO NETLIFY│
         │  (production)    │
         └──────────────────┘
```

---

## Test Pyramid Architecture

```
                        ┌──────────────────────┐
                        │   MANUAL/EXPLORATORY │
                        │     (Ad-hoc)         │
                        │      Speed: varies   │
                        │      Cost: High      │
                        │      Coverage: N/A   │
                        └──────────────────────┘

                     ┌────────────────────────────┐
                     │    MAESTRO MOBILE TESTS    │
                     │    (Native interactions)   │
                     │    Speed: 2-3 minutes      │
                     │    Cost: High              │
                     │    Coverage: Critical path │
                     └────────────────────────────┘

                  ┌──────────────────────────────────┐
                  │      DOCKER E2E TESTS            │
                  │   (Real backend, real API)       │
                  │   ~10 tests, 60-90 seconds       │
                  │   Speed: Slow (~2 req/test)      │
                  │   Cost: Medium (Docker stack)    │
                  │   Coverage: Critical user flows  │
                  └──────────────────────────────────┘

             ┌────────────────────────────────────────┐
             │      PLAYWRIGHT UI TESTS               │
             │    (Mock backend, fast UI tests)       │
             │    ~30 tests, 30-45 seconds            │
             │    Speed: Medium (~100 tests/min)      │
             │    Cost: Low                           │
             │    Coverage: Core flows, components    │
             └────────────────────────────────────────┘

        ┌─────────────────────────────────────────────┐
        │          UNIT TESTS (Vitest)                │
        │     Service logic, calculations, utils      │
        │     ~150 tests, 5-10 seconds                │
        │     Speed: Very fast (30 tests/sec)         │
        │     Cost: Very low                          │
        │     Coverage: ~70% codebase                 │
        └─────────────────────────────────────────────┘

     Many fast tests    ←→    Few slow tests
     Good coverage      ←→    High confidence
```

---

## Job Dependency Graph

```
                    START (push/PR)
                         │
            ┌────────────┬┴─────────────┐
            │            │              │
            ▼            ▼              ▼
        ┌─────────┐  ┌──────────┐  ┌───────────┐
        │  LINT   │  │UNIT-TEST │  │  i18n     │
        └────┬────┘  └────┬─────┘  └─────┬─────┘
             │            │              │
             └────┬───────┴──────────────┘
                  │
                  ▼ (Phase 1 complete)
            ┌──────────┐
            │  BUILD   │
            └────┬─────┘
                 │
        ┌────────┴─────────┐
        │                  │
        ▼                  ▼
    ┌─────────┐       ┌──────────────┐
    │ UI-TEST │       │ DOCKER-E2E   │
    │         │       │ (conditional)│
    └────┬────┘       └──────┬───────┘
         │                   │
         └────────┬──────────┘
                  │
                  ▼
            ┌──────────────┐
            │  PR-LABELER  │
            └──────────────┘
```

---

## Build Configuration Options

```
Angular Build Targets
│
├─ production
│  ├─ AOT: Yes
│  ├─ Optimization: Full
│  ├─ Source Maps: No
│  ├─ Minify: Yes
│  ├─ Bundle Size: 2.8MB max
│  └─ Speed: ~45-60 seconds
│
├─ mock (for E2E tests)
│  ├─ AOT: No
│  ├─ Optimization: No
│  ├─ Source Maps: Yes
│  ├─ Minify: No
│  ├─ File Replacements: environment.mock.ts
│  └─ Speed: ~30-40 seconds
│
├─ local (for Docker dev)
│  ├─ AOT: No
│  ├─ Optimization: No
│  ├─ Source Maps: Yes
│  ├─ Minify: No
│  └─ Hot reload: Yes
│
├─ heroku (legacy)
│  └─ For old Heroku deployments
│
└─ development
   ├─ All development optimizations
   ├─ Source maps: Full
   ├─ Hot reload: Yes
   └─ For local ng serve
```

---

## Testing Environment Stack

```
UNIT TESTS (Vitest)
├─ Environment: jsdom (browser-like)
├─ Isolation: Fork-based (each test file)
├─ Setup: TestBed initialization
├─ Mocks: MSW (Mock Service Worker)
├─ Speed: ~500 tests/minute
└─ Output: HTML report + LCOV coverage

UI INTEGRATION TESTS (Playwright)
├─ Mock Backend
│  ├─ Environment: Browser (Chromium)
│  ├─ Viewport: Mobile (390x844)
│  ├─ Backend: Mock with MSW
│  ├─ Speed: ~2 tests/minute
│  └─ Output: HTML report + screenshots
│
└─ Docker Backend
   ├─ Environment: Real browser + real API
   ├─ Services: 5 Docker containers
   ├─ Database: PostgreSQL 16 (fresh each run)
   ├─ Speed: ~1 test/minute
   └─ Output: HTML report + videos on failure

NATIVE MOBILE TESTS (Maestro)
├─ Environment: Android emulator
├─ App: Real APK
├─ Interactions: Native (touch, swipe, etc.)
├─ Speed: ~1 test/3 minutes
└─ Trigger: Manual (workflow_dispatch)

E2E TESTING TARGETS
├─ Mobile viewport (Pixel 5): PRIMARY
├─ Desktop viewport: Secondary
├─ Mobile touch: Yes
├─ Desktop touch: No
└─ Visual regression: Snapshot comparison
```

---

## Security Pipeline

```
┌────────────────────────────────────────────┐
│        PULL REQUEST → MERGE → MAIN          │
└───────────────────┬────────────────────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
    (always)              (on PR only)
        │                       │
        ▼                       ▼
    ┌──────────┐          ┌──────────────┐
    │ CodeQL   │          │ PNPM Audit   │
    │          │          │              │
    │ Languages│          │ Thresholds:  │
    │ • JS     │          │ moderate     │
    │ • TS     │          │ high         │
    │          │          │ critical     │
    └────┬─────┘          └──────┬───────┘
         │                       │
         └───────────┬───────────┘
                     │
                 ┌───▼─────┐
                 │ Results │
                 └─────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
        ▼                         ▼
    PASS: Merge OK          FAIL: Block merge
    (if enabled)            (if enabled)

Additional Security (Pre-commit hooks)
├─ Secret detection (API keys, passwords)
├─ Large file prevention (>1MB)
├─ Lockfile consistency (pnpm-lock.yaml)
└─ Circular dependency detection
```

---

## Docker Compose Services Topology

```
LOCAL DEVELOPMENT (docker-compose.yml)

┌─────────────────────────────────────┐
│      diabetactic-network            │
├─────────────────────────────────────┤
│                                     │
│  ┌──────────────┐  ┌────────────┐  │
│  │   dev        │  │   test     │  │
│  │ (hot reload) │  │ (vitest)   │  │
│  └──────────────┘  └────────────┘  │
│                                     │
│  ┌──────────────┐  ┌────────────┐  │
│  │  test-watch  │  │ coverage   │  │
│  │ (interactive)│  │ (reports)  │  │
│  └──────────────┘  └────────────┘  │
│                                     │
│  ┌──────────────┐  ┌────────────┐  │
│  │   e2e        │  │   a11y     │  │
│  │ (playwright) │  │(accessibility) │
│  └──────────────┘  └────────────┘  │
│                                     │
│  ┌──────────────┐  ┌────────────┐  │
│  │   lint       │  │    ci      │  │
│  │ (eslint)     │  │ (full run) │  │
│  └──────────────┘  └────────────┘  │
│                                     │
│  ┌──────────────┐  ┌────────────┐  │
│  │ build-prod   │  │   shell    │  │
│  │ (release)    │  │ (debugging)│  │
│  └──────────────┘  └────────────┘  │
│                                     │
└─────────────────────────────────────┘

CI E2E TESTING (docker-compose.ci.yml)

┌────────────────────────────────────────┐
│        diabetactic-ci network          │
├────────────────────────────────────────┤
│                                        │
│  ┌──────────────────┐                 │
│  │  postgres:16     │                 │
│  ├──────────────────┤                 │
│  │  glucoserver_db  │                 │
│  │  users_db        │                 │
│  │  appointments_db │                 │
│  └──────┬───────────┘                 │
│         │                             │
│  ┌──────▼────────────────────┐       │
│  │    Backend Services        │       │
│  ├────────────────────────────┤       │
│  │  • glucoserver             │       │
│  │  • login_service           │       │
│  │  • appointments            │       │
│  │  • api-gateway :8000       │       │
│  │  • api-gateway-backoffice  │       │
│  │    :8001                   │       │
│  └──────┬────────────────────┘        │
│         │                             │
│  ┌──────▼──────────────┐             │
│  │   test_utils        │             │
│  │ (data seeding)      │             │
│  └─────────────────────┘             │
│                                        │
└────────────────────────────────────────┘
```

---

## Deployment Targets

```
WEB APPLICATION (Angular + Netlify)
├─ Source: GitHub push (tag v*)
├─ Build: pnpm run build:prod
├─ Target: Netlify (production)
├─ Time: ~5 minutes
├─ Status: ✓ Fully automated
├─ Rollback: Manual (re-deploy old tag)
└─ URL: https://diabetify.netlify.app

STAGING (NEW - to implement)
├─ Source: Push to develop branch
├─ Build: pnpm run build:mock
├─ Target: Netlify staging subdomain
├─ Time: ~3 minutes
├─ Status: ⚠️ Needs implementation
└─ URL: https://staging-[run]--diabetify.netlify.app

ANDROID APPLICATION (Mobile)
├─ Development
│  ├─ Build: Debug APK
│  ├─ Install: adb install-debug
│  └─ Status: ✓ Local development
│
├─ Testing (Maestro)
│  ├─ Build: Debug APK
│  ├─ Test: E2E Maestro tests
│  └─ Status: ⚠️ Manual workflow_dispatch
│
└─ Release
   ├─ Build: Release APK (needs signing)
   ├─ Destination: Play Store beta track
   ├─ Status: ✗ Not automated (Fastlane to implement)
   └─ Time: 30+ minutes (manual)

iOS APPLICATION (Mobile)
├─ Status: ✗ Not configured
├─ Required: Xcode build pipeline
├─ Required: TestFlight/App Store distribution
└─ Timeline: Need 2-3 weeks for implementation
```

---

## Git Hooks Pipeline

```
DEVELOPER WORKFLOW
│
└─ git add <files>
   │
   └─ ✓ Pre-commit hooks (parallel, ~5-10s)
      │
      ├─ Lint & Format
      │  ├─ ESLint --fix *.ts,*.js
      │  ├─ Prettier *.html,*.json,*.md
      │  └─ Stylelint --fix *.scss
      │
      ├─ Security Checks
      │  ├─ Secrets detection (grep-based)
      │  ├─ Large file prevention
      │  └─ Lockfile consistency
      │
      └─ Code Quality
         ├─ Console.log detection (warning)
         ├─ Hardcoded text in CSS (warning)
         └─ All checks staged + fixed files

      │
      └─ ✓ Status: Ready to commit
         (if all blocking checks pass)
         │
         └─ git commit -m "type(scope): message"
            │
            └─ ✓ Commit-msg hooks
               │
               ├─ Conventional commit format check
               │  (feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)
               │
               └─ ✓ Status: Message validated
                  │
                  └─ git push
                     │
                     └─ ✓ Pre-push hooks (sequential, ~10-30s)
                        │
                        ├─ Branch name validation
                        │  (master|main|develop|feature/|fix/|hotfix/|release/|etc)
                        │
                        ├─ Linting errors check
                        │  └─ pnpm run lint --quiet
                        │
                        ├─ Circular dependencies check (BLOCKS)
                        │  └─ pnpm run analyze:circular
                        │
                        ├─ Dead code detection (warning)
                        │  └─ pnpm run analyze:dead-code
                        │
                        └─ Code complexity check (warning)
                           └─ pnpm run analyze:complexity
                           │
                           └─ ✓ Status: Ready to push
                              │
                              └─ Push to remote
                                 │
                                 └─ → GitHub Actions CI starts
```

---

## Artifact Retention Policy

```
ARTIFACT LIFECYCLE

Coverage Reports
├─ Retention: 7 days
├─ Size: ~2-5 MB
└─ Usage: DeepSource, trend tracking

UI Test Artifacts (Success)
├─ Retention: 7 days
├─ Content: Screenshots, traces, videos
├─ Size: ~50-100 MB
└─ Usage: Debugging test failures

Docker E2E Artifacts (Failure Only)
├─ Retention: 7 days
├─ Content: Playwright reports + videos
├─ Size: ~50-200 MB (videos large)
└─ Usage: Debugging E2E failures

Build Output (www/)
├─ Retention: 1 day (cleaned up after deploy)
├─ Size: ~10-30 MB (production build)
└─ Usage: Passed between jobs

APK Artifacts (Maestro)
├─ Retention: 7 days
├─ Size: ~50-100 MB
└─ Usage: Manual testing, debugging

Release APK
├─ Retention: 90 days
├─ Size: ~50-100 MB
├─ Named: diabetactic-v{version}.apk
└─ Usage: Distribution, version tracking

Playwright Reports
├─ Retention: 7 days
├─ Format: HTML with embedded screenshots
├─ Access: GitHub Actions → Artifacts tab
└─ Usage: UI test debugging
```

---

## Performance Profile

```
CI BUILD TIMELINE (on cache hit)

0:00  ┌─ Checkout code
0:05  │
0:10  ├─ Setup pnpm (cache hit: ~5s)
0:15  │
0:20  ├─ Install deps (cache hit: ~2s)
0:25  │
0:30  ├─ Phase 1 (parallel, ~90s)
0:35  │  ├─ Lint: ~30-40s
1:00  │  ├─ Unit Tests: ~40-50s
1:05  │  └─ i18n Check: ~5s
1:10  │
1:15  ├─ Phase 2 Build (depends on Phase 1)
1:20  │  └─ Angular build: ~60s
1:25  │     └─ (optimization active)
2:20  │
2:25  ├─ Phase 3 UI Tests (parallel with above)
2:30  │  ├─ Playwright browsers: ~20s (cache hit)
2:50  │  ├─ Server startup: ~5s
2:55  │  └─ Tests: ~45s
3:40  │
3:45  ├─ Phase 4 E2E Tests (conditional)
3:50  │  ├─ Docker startup: ~15s
4:05  │  ├─ Data seeding: ~10s
4:15  │  ├─ Playwright browser: ~5s
4:20  │  └─ Tests: ~60-90s
5:50  │
5:55  ├─ PR Labeler
6:00  │
6:05  ▼ TOTAL: ~6 minutes (with all phases)
      ~3 minutes (Phase 1-3 only)

CACHE IMPACT
├─ First run (cold): 10-12 minutes
├─ Warm cache: 5-6 minutes
├─ Pre-commit hooks: 5-15 seconds
└─ Bottleneck: Angular build (~60s)
```

---

## Success Criteria by Phase

```
PHASE 1: Fast Feedback
├─ Metrics
│  ├─ Phase 1 execution: < 2 minutes
│  ├─ Lint pass rate: > 99%
│  ├─ Test pass rate: > 95%
│  └─ i18n check: 100% pass
│
└─ Gates
   ├─ Lint errors: BLOCK
   ├─ Type errors: BLOCK
   ├─ Test failures: BLOCK
   └─ i18n issues: BLOCK

PHASE 2: Build
├─ Metrics
│  ├─ Build time: < 90 seconds
│  ├─ Bundle size: < 2.8 MB
│  └─ Build success rate: > 99%
│
└─ Gates
   └─ Build errors: BLOCK

PHASE 3: UI Integration
├─ Metrics
│  ├─ Test execution: < 60 seconds
│  ├─ Test pass rate: > 95%
│  └─ Flaky tests: < 2%
│
└─ Gates
   └─ Critical test failure: BLOCK

PHASE 4: Full E2E
├─ Metrics
│  ├─ Test execution: < 120 seconds
│  ├─ Test pass rate: > 90%
│  └─ Coverage: > 80%
│
└─ Gates (optional)
   └─ Critical flow failures: WARNING

DEPLOYMENT GATES
├─ All phases pass: REQUIRED
├─ Security scan: REQUIRED
├─ Coverage thresholds: REQUIRED
└─ Manual approval: OPTIONAL
```

---

**Document Version:** 1.0
**Last Updated:** 2025-12-29
**Diagrams:** ASCII text-based (GitHub-compatible)
