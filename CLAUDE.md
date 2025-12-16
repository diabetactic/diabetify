# CLAUDE.md

> **Diabetify** - Angular 21/Ionic 8 mobile app for diabetes glucose management.
> Offline-first with Dexie IndexedDB, syncs to Heroku backend.

---

## CRITICAL RULES (YOU MUST FOLLOW)

1. **All API requests through `ApiGatewayService`** - Never direct HTTP calls
2. **`CUSTOM_ELEMENTS_SCHEMA`** required in ALL standalone components
3. **Translations in BOTH `en.json` AND `es.json`** - always
4. **Run `pnpm test` before committing**
5. **Use pnpm** (not npm) - 3x faster with Turborepo caching
6. **Offline-first**: Local IndexedDB first, sync when online

---

## File Boundaries

### Safe to Modify

- `src/app/**/*.ts` - Application code
- `src/assets/i18n/*.json` - Translations
- `.claude/skills/*.md` - Skills documentation

### DO NOT MODIFY (without good reason)

- `src/test-setup.ts` - Central test setup, carefully tuned
- `vitest.config.ts` - Pool forks config required for isolation
- `capacitor.config.ts` - Native bridge configuration

---

## Quick Commands

```bash
pnpm start:mock          # Development (RECOMMENDED)
pnpm test                # Run unit tests
pnpm run quality         # Lint + test (pre-commit)
/deploy                  # Deploy to Android (slash command)
/test                    # Run tests (slash command)
```

---

## Skills Reference

Skills auto-trigger on keywords. See `.claude/skills/README.md` for full list:

- **vitest** - Testing patterns (triggers: test, mock, spec)
- **angular-signals-migration** - Signals patterns (triggers: signal, toSignal)
- **dexie-offline** - Database patterns (triggers: dexie, offline, sync)

---

## Test Credentials (Dev Environment)

| System             | Username/ID  | Password               | URL                                                            |
| ------------------ | ------------ | ---------------------- | -------------------------------------------------------------- |
| **Mobile App**     | `julian`     | `tuvieja`              | N/A (app login) - Julian's personal account                    |
| **Mobile App**     | `1000`       | `tuvieja`              | N/A (app login) - Test user (Nacho Scocco)                     |
| **Backoffice API** | `admin`      | `admin`                | `https://dt-api-gateway-backoffice-3dead350d8fa.herokuapp.com` |
| **Main API**       | Bearer token | (from /token endpoint) | `https://diabetactic-api-gateway-37949d6f182f.herokuapp.com`   |

**Julian's Account** (primary dev/test account):

- **DNI/Username**: `julian`
- **Email**: `juliancrespo15@gmail.com`
- **Password**: `tuvieja`
- **User ID**: `4` (Docker), may differ in Heroku
- **Hospital Account**: `HOSP001`

### Unified API Helper Script

Use `scripts/diabetify-api.js` for all backend operations (auto-detects Docker vs Heroku):

```bash
# User Management
node scripts/diabetify-api.js list-users
node scripts/diabetify-api.js create-user --dni=X --email=X --name=X --surname=X --password=X

# Authentication
node scripts/diabetify-api.js login --user=julian --pass=tuvieja
node scripts/diabetify-api.js admin-login

# Glucose Readings (set USER_TOKEN first)
export USER_TOKEN=$(node scripts/diabetify-api.js login --user=julian --pass=tuvieja | jq -r .access_token)
node scripts/diabetify-api.js add-reading --level=95 --type=DESAYUNO --notes="Fasting"
node scripts/diabetify-api.js list-readings

# Appointment Queue (admin)
node scripts/diabetify-api.js open-queue
node scripts/diabetify-api.js pending-appointments
node scripts/diabetify-api.js accept --placement=0
node scripts/diabetify-api.js deny --placement=0
node scripts/diabetify-api.js clear-queue

# User Appointments
node scripts/diabetify-api.js submit-to-queue
node scripts/diabetify-api.js appointment-state
```

**Legacy scripts** (deprecated, use unified script above):

- `maestro/scripts/backoffice-api.js` - Uses wrong port (8006)
- `scripts/appointments/*.sh` - Heroku only, shell scripts

---

## Available AI Tools & Agents

### MCP Servers Available

The following MCP servers are configured and can be used for enhanced capabilities:

| Server                  | Purpose                             | Key Tools                                                       |
| ----------------------- | ----------------------------------- | --------------------------------------------------------------- |
| **claude-flow@alpha**   | Swarm orchestration, memory, agents | `swarm_init`, `agent_spawn`, `task_orchestrate`, `memory_usage` |
| **context7**            | Library documentation lookup        | `resolve-library-id`, `get-library-docs`                        |
| **sequential-thinking** | Complex problem solving             | `sequentialthinking`                                            |
| **angular-toolkit**     | Angular/DS component analysis       | (project-specific)                                              |

### Subagents (Task Tool)

Use these specialized agents for complex tasks:

| Agent                | When to Use                                                            |
| -------------------- | ---------------------------------------------------------------------- |
| `Explore`            | Codebase exploration, finding files, answering architectural questions |
| `Plan`               | Designing implementation plans, architectural decisions                |
| `general-purpose`    | Complex multi-step research tasks                                      |
| `debugger`           | Errors, test failures, unexpected behavior                             |
| `code-reviewer`      | Review implementation against plan and standards                       |
| `test-automator`     | Test automation and quality engineering                                |
| `frontend-developer` | React/Angular components, UI implementation                            |
| `mobile-developer`   | React Native, Flutter, native mobile apps                              |

### Skills Available (Project-Specific)

These skills are auto-triggered by keywords in your queries. You can also invoke them directly.

| Skill                       | Triggers                                            | Description                                                   |
| --------------------------- | --------------------------------------------------- | ------------------------------------------------------------- |
| `vitest`                    | test, spec, mock, vi.mock, TestBed, waitForAsync    | Vitest 4.0 + Angular TestBed patterns, mocking, async testing |
| `angular-signals-migration` | signal, BehaviorSubject, toSignal, computed, effect | Migrate BehaviorSubject to Signals, rxResource patterns       |
| `dexie-offline`             | dexie, IndexedDB, offline, sync, encryption, HIPAA  | Offline-first patterns, PHI encryption, sync queue            |
| `diabetify-architecture`    | architecture, structure, folder, patterns           | Tech stack, folder structure, data flow diagrams              |
| `diabetify-testing`         | testing, spec, playwright, maestro                  | Testing strategy, E2E patterns, mobile testing                |
| `diabetify-api`             | api, endpoint, backend, gateway                     | API Gateway patterns, endpoint registry                       |
| `diabetify-services`        | service, readings, profile, auth                    | Core services documentation                                   |
| `diabetify-docker`          | docker, compose, local, backend                     | Docker backend setup, networking                              |
| `diabetify-deploy`          | deploy, android, apk, mobile                        | Mobile deployment workflow                                    |
| `playwright-testing`        | playwright, e2e, accessibility, visual              | E2E testing with Playwright                                   |
| `maestro-mobile`            | maestro, mobile test, flow                          | Mobile E2E testing with Maestro                               |
| `capacitor-6`               | capacitor, native, plugin                           | Capacitor 6 patterns and plugins                              |

**How triggers work**: When your query contains trigger keywords, Claude Code automatically loads the relevant skill context.

### Slash Commands

- `/test` - Run tests with various options
- `/dev` - Start development server with backend mode selection
- `/deploy` - Deploy to Android device or build APK
- `/doctor` - Check project health and common issues

---

<!-- ═══════════════════════════════════════════════════════════════════════════
     DETAILED REFERENCE SECTIONS BELOW
     The sections above (Critical Rules, File Boundaries, Quick Commands) are
     the most important. Sections below are comprehensive reference material.
     ═══════════════════════════════════════════════════════════════════════════ -->

## Essential Commands

**Note**: Use `pnpm` for 3x faster execution. All commands work with `npm` too.

```bash
# Development (three backend modes controlled by scripts/start-with-env.mjs)
pnpm start                     # Default - auto-detects ENV variable
pnpm run start:mock            # In-memory mock data, no backend needed (RECOMMENDED)
pnpm run start:local           # Local Docker backend (localhost:8000)
pnpm run start:cloud           # Heroku production API (cloud)

# Build (Web)
npm run build                 # Development build (outputs to www/)
npm run build:dev             # Development build (same as build)
npm run build:prod            # Production build with AOT and optimization
npm run build:mock            # Build with mock environment
npm run build:heroku          # Build with Heroku environment
npm run build:analyze         # Build with bundle analysis stats

# Mobile Build & Deploy
npm run mobile:sync           # Build prod + sync to Capacitor
npm run mobile:build          # Sync + Android debug build
npm run mobile:build:release  # Sync + Android release build
npm run mobile:install        # Build + install on connected device
npm run mobile:run            # Install + show filtered logcat output
npm run mobile:clean          # Clean Android build cache
npm run mobile:rebuild        # Full clean rebuild

# Android Specific
npm run android:open          # Open in Android Studio
npm run android:build         # Gradle debug build only
npm run android:build:release # Gradle release build only
npm run android:install       # Install debug APK
npm run android:uninstall     # Uninstall from device
npm run android:logs          # Show filtered logcat
npm run android:clear-logs    # Clear logcat buffer
npm run android:devices       # List connected devices
npm run android:emulator      # Start emulator

# Deploy
npm run deploy:local          # Same as mobile:install
npm run deploy:device         # Build and force reinstall APK
npm run deploy:apk            # Build and show APK path

# Testing (Vitest + Playwright)
npm test                      # Run all unit tests (Vitest)
npm run test:unit             # Run unit tests (same as test)
npm run test:watch            # Watch mode for unit tests
npm run test:coverage         # Unit tests with coverage report
npm run test:integration      # Integration tests (separate config)
npm test -- profile           # Run specific test file (Vitest pattern)
npm run test:e2e              # Playwright E2E tests (headless)
npm run test:e2e:headed       # E2E with browser visible
npm run test:a11y             # Accessibility audit tests
npm run test:a11y:headed      # Accessibility tests with browser
npm run test:ui-quality       # UI quality subset of a11y tests
npm run test:mobile           # Build mobile + run E2E

# Quality & Linting
npm run lint                  # ESLint for TypeScript/JavaScript
npm run lint:styles           # Stylelint for SCSS/CSS
npm run lint:fix              # ESLint with auto-fix
npm run format                # Prettier format all files
npm run quality               # Lint + test combined

# Utilities
npm run clean                 # Remove node_modules, www, .angular, reinstall
npm run clean:all             # Clean all (node + Android builds)
npm run i18n:check            # Check for missing translation keys
npm run cap:sync              # Sync Capacitor without building
npm run cap:update            # Update Capacitor plugins
```

---

## Technology Stack

### Core Framework

- **Angular**: 21.0.5 (standalone components, signals, provideRouter)
- **Ionic**: 8.0.0+ (UI components, web components)
- **Capacitor**: 6.1.0+ (native bridge, plugins)
- **TypeScript**: 5.9.3
- **RxJS**: 7.8.0 (reactive state management, migrating to signals)

### Styling & UI

- **Tailwind CSS**: 3.4.13 (utility-first CSS)
- **DaisyUI**: 5.5.5 (component library)
- **Lucide Angular**: 0.553.0 (icon system)
- **PostCSS**: 8.5.6 + Autoprefixer 10.4.22

### Data & Storage

- **Dexie**: 4.2.1 (IndexedDB wrapper)
- **@aparajita/capacitor-secure-storage**: 6.0.1 (encrypted storage)
- **@capacitor/preferences**: 6.0.3 (key-value storage)

### Testing & Quality

- **Vitest**: 4.0.15 (unit tests - migrated from Jest Dec 2025)
- **@analogjs/vitest-angular**: Angular integration for Vitest
- **jsdom**: Test environment with custom Ionic polyfills
- **Playwright**: 1.48.0 (E2E tests)
- **@axe-core/playwright**: 4.11.0 (accessibility)
- **ESLint**: 9.0.0 + TypeScript ESLint 8.0.0
- **Stylelint**: 16.12.0 (CSS linting)
- **Prettier**: 3.6.2 (code formatting)

### Internationalization

- **@ngx-translate/core**: 17.0.0 (i18n framework)
- **@angular/localize**: 21.0.5

### Development Tools

- **pnpm**: 10.0+ (fast, disk-efficient package manager)
- **Turborepo**: 2.3.3 (build system with intelligent caching)
- **Lefthook**: 2.0.0 (fast git hooks manager)
- **lint-staged**: 16.2.3 (pre-commit linting)
- **@faker-js/faker**: 10.1.0 (test data)

---

## Tooling Modernization

As of December 2025, Diabetify has been upgraded with modern tooling for improved performance and developer experience.

### pnpm (Package Manager)

**Why pnpm?** 3x faster installs, 50% less disk space, strict dependency resolution.

```bash
# Installation
npm install -g pnpm@latest

# Usage (drop-in replacement for npm)
pnpm install                  # Install dependencies
pnpm run start:mock           # Run dev server
pnpm test                     # Run tests
pnpm run build:prod           # Production build

# Benefits
# - Symlinked node_modules saves ~1GB disk space
# - Parallel installs are 3x faster than npm
# - Strict mode prevents phantom dependencies
```

**All npm commands work with pnpm** - just replace `npm` with `pnpm`.

### Turborepo (Build System)

**Why Turborepo?** Intelligent task caching eliminates redundant work.

```bash
# Cached tasks (run instantly if inputs unchanged)
pnpm run build                # Caches build output
pnpm test                     # Caches test results
pnpm run lint                 # Caches lint results

# How it works
# 1. Turborepo hashes your source files
# 2. If hash matches cache, returns cached result instantly
# 3. If hash differs, runs task and caches new result

# Cache location: node_modules/.cache/turbo
# Clear cache: rm -rf node_modules/.cache/turbo
```

**Cache hits** mean tests/builds complete in <1s instead of minutes.

### Lefthook (Git Hooks)

**Why Lefthook?** 10x faster than Husky, written in Go, parallel execution.

```bash
# Hooks are configured in lefthook.yml
# Pre-commit: lint-staged (lint only changed files)
# Pre-push: run tests (ensure quality before push)

# Manual execution
pnpm exec lefthook run pre-commit
pnpm exec lefthook run pre-push

# Skip hooks (use sparingly)
git commit --no-verify
git push --no-verify
```

**Lefthook vs Husky**: Same functionality, 10x faster hook execution.

### Path Aliases (TypeScript)

Configured in `tsconfig.json` for cleaner imports:

```typescript
// Old (relative imports)
import { AuthService } from '../../../core/services/auth.service';

// New (path aliases)
import { AuthService } from '@app/core/services/auth.service';
import { ReadingModel } from '@app/core/models/reading.model';
import { SharedComponent } from '@app/shared/component';

// Available aliases
// @app/*        → src/app/*
// @env/*        → src/environments/*
// @assets/*     → src/assets/*
// @core/*       → src/app/core/*
// @shared/*     → src/app/shared/*
```

**Note**: Vitest and Angular are configured to resolve these aliases automatically.

### Migration Notes

- **npm → pnpm**: All existing scripts work unchanged
- **Husky → Lefthook**: Same hooks, faster execution
- **No Turborepo config needed**: Works automatically via turbo.json
- **Backwards compatible**: npm still works if pnpm not installed

---

## Architecture

### Backend Modes (src/environments/environment.ts)

The app supports three backend modes controlled by `DEV_BACKEND_MODE`:

- `mock` - In-memory mock adapter, no backend required
- `local` - Local Docker backend at localhost:8000
- `cloud` - Heroku API Gateway (production)

Control via ENV variable:

```bash
ENV=mock pnpm start      # Mock backend (offline) - RECOMMENDED for development
ENV=local pnpm start     # Local Docker (localhost:8000)
ENV=cloud pnpm start     # Heroku production (default)
```

### Core Services (src/app/core/services/)

| Service                       | Purpose                                                      | Test Coverage |
| ----------------------------- | ------------------------------------------------------------ | ------------- |
| `api-gateway.service.ts`      | All backend HTTP calls (endpoint registry pattern)           | ✅            |
| `local-auth.service.ts`       | Local authentication and user management                     | ✅ 22 tests   |
| `capacitor-http.service.ts`   | Hybrid HTTP (Angular on web, CapacitorHttp on native)        | ✅ 33 tests   |
| `profile.service.ts`          | User profile with Capacitor Preferences + SecureStorage      | ✅            |
| `database.service.ts`         | Dexie/IndexedDB for offline storage (readings, appointments) | ✅            |
| `notification.service.ts`     | Push notifications via @capacitor/local-notifications        | ✅            |
| `readings.service.ts`         | Glucose readings CRUD with offline-first sync                | ✅            |
| `appointment.service.ts`      | Medical appointments with auto-reminders                     | ✅            |
| `tidepool-auth.service.ts`    | Tidepool OAuth integration (auth-only, not data sync)        | ✅            |
| `tips.service.ts`             | Diabetes management tips and recommendations                 | ✅            |
| `bolus-calculator.service.ts` | Insulin dosage calculation helper                            | ✅            |

### CapacitorHttpService (Hybrid HTTP)

This service provides a critical abstraction for cross-platform HTTP:

- **Web**: Uses Angular HttpClient (works with dev proxy)
- **Native**: Uses CapacitorHttp (bypasses CORS, direct API access)

```typescript
// The service auto-detects platform
this.capacitorHttp.get<T>(url, { headers, params });
this.capacitorHttp.post<T>(url, data, { headers });

// For raw requests with full response (headers, status)
await this.capacitorHttp.request({ method, url, headers, data });
```

### API Gateway Pattern

All backend calls route through `ApiGatewayService` with endpoint registry pattern:

```typescript
// CORRECT: Request using endpoint key (not raw URL)
this.apiGateway.request('auth.login', { body: credentials });
this.apiGateway.request('readings.list', { params: { userId } });
this.apiGateway.request('appointments.create', { body: appointmentData });

// WRONG: Direct HTTP calls
this.http.get('/api/readings'); // DON'T DO THIS
```

**Key features:**

- Centralized endpoint management (no hardcoded URLs in services)
- Automatic platform detection (web proxy vs native direct)
- Built-in retry logic and error handling
- Request/response logging in dev mode
- TypeScript endpoint key validation
- Support for all HTTP methods (GET, POST, PUT, DELETE, PATCH)

**Endpoint Registry** (in `api-gateway.service.ts`):

- `auth.login` - POST /token
- `auth.register` - POST /users/register
- `users.me` - GET /users/me
- `readings.list` - GET /glucose/mine
- `readings.create` - POST /glucose/create
- `appointments.list` - GET /appointments/mine
- `appointments.create` - POST /appointments/create

### Component Structure

All pages use Angular standalone components with Ionic standalone imports:

```typescript
@Component({
  standalone: true,
  imports: [
    CommonModule,
    IonHeader, IonToolbar, IonTitle, // Import each Ionic component individually
    TranslateModule,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA], // REQUIRED for Ionic web components
})
```

---

## Testing

### Test Suite Status

- **2066 tests passing** (237 failing) across 70 test suites - 89.7% pass rate
- **Vitest migration**: Completed December 2025, migrated from Jest
- Unit tests (Vitest) + E2E tests (Playwright) + Mobile tests (Maestro)

### Unit Tests (Vitest 4.0.15)

- **Framework**: Vitest with `@analogjs/vitest-angular` for Angular TestBed integration
- **Configuration**: `vitest.config.ts` with pool forks for test isolation
- **IMPORTANT**: Every test file must import `test-setup.ts` at the top:
  ```typescript
  import '../../../test-setup'; // Path varies by file location
  ```
- **Setup files** (in order):
  1. `src/setup-polyfills.ts` - jsdom polyfills for Ionic
  2. `@analogjs/vitest-angular/setup-zone` - Zone.js for Angular
  3. `src/setup-vitest.ts` - Additional mocks and cleanup hooks
- **Mocks provided in `test-setup.ts`**:
  - Capacitor plugins (Preferences, Device, Network, SecureStorage, etc.)
  - Ionic Angular (Platform, NavController, AlertController, all standalone components)
  - Jest compatibility layer (`jest.fn()`, `jest.spyOn()`, `jest.mock()`)
  - Jasmine compatibility (`jasmine.createSpyObj()`)
- **Test location**: Spec files alongside source (`*.spec.ts`)
- **Coverage**: Run `pnpm run test:coverage` for HTML reports in `coverage/`
- **Fake IndexedDB**: `fake-indexeddb` package for Dexie testing

### Known Issues (Vitest)

| Issue                         | Count | Workaround                           |
| ----------------------------- | ----- | ------------------------------------ |
| `done()` callback deprecation | ~50   | Use async/await instead of done()    |
| Missing ControlValueAccessor  | ~30   | Add mock NG_VALUE_ACCESSOR providers |
| Translation key warnings      | ~20   | Non-blocking, translations work      |

### E2E Tests (Playwright 1.48.0)

**Location**: `playwright/tests/`

| Test File                          | Purpose                |
| ---------------------------------- | ---------------------- |
| `accessibility-audit.spec.ts`      | WCAG compliance checks |
| `heroku-integration.spec.ts`       | Backend integration    |
| `heroku-appointments-flow.spec.ts` | Appointments E2E       |
| `heroku-readings-crud.spec.ts`     | Readings CRUD          |
| `heroku-profile-sync.spec.ts`      | Profile sync           |
| `error-handling.spec.ts`           | Error scenarios        |
| `visual-regression.spec.ts`        | Visual diff testing    |

**Features**: Visual regression, accessibility audits with @axe-core/playwright
**Reporters**: HTML, JSON, and axe-html-reporter for a11y issues
**Browsers**: Chromium only (WebKit removed)
**Screenshots**: Auto-captured on failure in `playwright/artifacts/`

### Maestro Integration Tests

Mobile E2E tests using Maestro framework against real Heroku backend.

**Location**: `maestro/`

```
maestro/
├── config.yaml              # Global config (appId: io.diabetactic.app)
├── flows/                   # Reusable flows
│   ├── login.yaml           # Login with clearState
│   └── navigate-appointments.yaml
├── scripts/
│   └── backoffice-api.js    # Admin operations (accept/deny/clear)
└── tests/
    ├── readings/
    │   ├── 01-list-loads.yaml
    │   └── 02-add-reading.yaml
    ├── appointments/
    │   ├── 01-request-appointment.yaml   # NONE → PENDING
    │   ├── 02-accept-appointment.yaml    # PENDING → ACCEPTED (via API)
    │   ├── 03-create-appointment.yaml    # ACCEPTED → CREATED
    │   ├── 04-deny-appointment.yaml      # PENDING → DENIED (via API)
    │   └── 05-full-flow.yaml             # Complete E2E flow
    ├── profile/
    │   └── 01-edit-profile.yaml
    ├── settings/
    │   ├── 01-theme-persistence.yaml
    │   └── 02-language-persistence.yaml
    ├── errors/
    │   ├── 01-network-error.yaml
    │   ├── 02-invalid-login.yaml
    │   └── 03-form-validation.yaml
    └── resolution/
        └── 01-verify-resolution.yaml
```

**Running locally**:

```bash
# Install Maestro CLI
curl -Ls "https://get.maestro.mobile.dev" | bash

# Run all tests (requires running emulator + installed APK)
cd maestro && maestro test tests/

# Run specific test
maestro test tests/appointments/05-full-flow.yaml

# Run with env vars
maestro test tests/ \
  --env TEST_USER_ID=1000 \
  --env TEST_USER_PASSWORD=tuvieja \
  --env BACKOFFICE_API_URL=https://dt-api-gateway-backoffice-3dead350d8fa.herokuapp.com \
  --env BACKOFFICE_ADMIN_USERNAME=admin \
  --env BACKOFFICE_ADMIN_PASSWORD=admin
```

**Key patterns**:

- **Bilingual regex**: `"Citas|Appointments"` matches Spanish or English
- **Shadow DOM bypass**: tap label → inputText → hideKeyboard
- **Hydration waits**: `extendedWaitUntil` with 10-15s timeouts
- **Determinism**: `clearState` at test start, backoffice API for queue clearing

**Appointment State Machine**:

```
NONE → PENDING → ACCEPTED → CREATED
              ↘ DENIED
```

**Backoffice API helper** (`scripts/backoffice-api.js`):

```bash
# Actions: accept, deny, clear
ACTION=accept USER_ID=1000 node scripts/backoffice-api.js
ACTION=clear node scripts/backoffice-api.js
```

### Skipped Tests (intentional)

| File                           | Count | Reason                                                           |
| ------------------------------ | ----- | ---------------------------------------------------------------- |
| `tidepool.interceptor.spec.ts` | 7     | LEGACY - Will be removed with auth-only refactor                 |
| `auth.interceptor.spec.ts`     | 4     | 5xx retry uses timer() with jitter (incompatible with fakeAsync) |

---

## DO NOT TOUCH

These files are stable and should not be modified without good reason:

- `src/app/core/services/database.service.spec.ts` - Complex Dexie setup with fresh DB per test
- `src/app/core/services/profile.service.spec.ts` - State pollution fixes carefully applied
- `src/test-setup.ts` - Central test setup with Capacitor/Ionic mocks, TestBed init, Jest compat
- `src/setup-vitest.ts` - Vitest-specific setup with cleanup hooks
- `vitest.config.ts` - Pool forks config required for test isolation

---

## Code Quality & Analysis

The project includes comprehensive code quality analysis tools integrated into the development workflow.

### Available Analysis Tools

| Tool                         | Purpose                                            | Command                          | Auto-runs          |
| ---------------------------- | -------------------------------------------------- | -------------------------------- | ------------------ |
| **Knip**                     | Dead code detection (unused exports, dependencies) | `pnpm run analyze:dead-code`     | Pre-push           |
| **dpdm**                     | Circular dependency detection                      | `pnpm run analyze:circular`      | Pre-push           |
| **cyclomatic-complexity**    | Code complexity analysis (threshold: 10)           | `pnpm run analyze:complexity`    | Pre-push (warning) |
| **jscpd**                    | Duplicate code detection                           | `pnpm run analyze:duplication`   | Manual             |
| **type-coverage**            | TypeScript type coverage analysis                  | `pnpm run analyze:type-coverage` | Manual             |
| **@angular-experts/hawkeye** | Bundle size analysis (esbuild)                     | `pnpm run analyze:bundle`        | Manual             |
| **npm-check-updates**        | Dependency update checker                          | `pnpm run fix:deps:check`        | Manual             |

### Quick Commands

```bash
# Run all analysis checks
pnpm run analyze:all

# Individual checks
pnpm run analyze:dead-code       # Find unused exports/dependencies
pnpm run analyze:circular        # Detect circular dependencies
pnpm run analyze:complexity      # Check code complexity
pnpm run analyze:duplication     # Find duplicate code
pnpm run analyze:type-coverage   # TypeScript coverage report
pnpm run analyze:bundle          # Bundle size breakdown

# Fix commands
pnpm run fix:dead-code          # Auto-remove unused exports (knip --fix)
pnpm run fix:deps:check         # Check for dependency updates
pnpm run fix:deps               # Update dependencies (interactive)
pnpm run fix:audit              # Fix security vulnerabilities
```

### Automated Checks (Lefthook Pre-Push)

The following checks run automatically on `git push`:

1. **Dead code check** (knip) - Fails if unused exports detected
2. **Circular dependencies** (dpdm) - Fails if circular imports found
3. **Code complexity** (cyclomatic-complexity) - Warning only, doesn't block
4. **Quality suite** (`pnpm run quality`) - Lint + tests
5. **TypeScript check** - Production build with type validation
6. **Build verification** - Full production build

### Configuration Files

- `knip.json` - Dead code detection config (ignores test files, mocks)
- `.jscpd.json` - Duplication detection config (min 5 lines, 50 tokens)
- `turbo.json` - Caching configuration for all analysis tasks

### Turborepo Caching

All analysis tasks are cached by Turborepo for faster execution:

```bash
# First run: analyzes all files
pnpm run analyze:dead-code
# ... 15 seconds

# Second run (no changes): instant cache hit
pnpm run analyze:dead-code
# ... 0.1 seconds
```

Cache is invalidated when source files, config files, or dependencies change.

### Integration with CI/CD

Add to `.github/workflows/ci.yml`:

```yaml
- name: Code Quality Analysis
  run: |
    pnpm run analyze:all
    pnpm run analyze:bundle
```

### Reports Directory

Analysis reports are saved to `reports/`:

- `reports/jscpd/` - Duplication reports
- `reports/bundle-analysis.json` - Bundle size breakdown

Add `reports/` to `.gitignore` to exclude from commits.

---

## Common Gotchas

### 1. Ionic Component Imports

```typescript
// WRONG - importing IonicModule (legacy)
import { IonicModule } from '@ionic/angular';

// CORRECT - import each component individually (standalone)
import { IonHeader, IonToolbar, IonTitle } from '@ionic/angular/standalone';
```

### 2. BehaviorSubject State Pollution

When testing services with BehaviorSubject, always reset state in `beforeEach`:

```typescript
beforeEach(() => {
  (service as any).stateSubject.next(initialState);
});
```

### 3. HTTP Interceptor Testing

Use `useExisting` instead of `useClass` to avoid dual instance issues:

```typescript
// CORRECT - same instance used everywhere
{ provide: HTTP_INTERCEPTORS, useExisting: MyInterceptor, multi: true }

// WRONG - creates two instances (one in DI, one in interceptors)
{ provide: HTTP_INTERCEPTORS, useClass: MyInterceptor, multi: true }
```

### 4. fakeAsync with Promises

When testing code with nested Promises, use multiple `flushMicrotasks()`:

```typescript
it('should handle nested promises', fakeAsync(() => {
  service.doAsyncThing();
  flushMicrotasks(); // First Promise
  flushMicrotasks(); // Nested Promise
  expect(result).toBe(expected);
}));
```

### 5. Timer-based Retry Logic

Tests using `timer()` with random jitter are incompatible with fakeAsync. Options:

- Mock the delay function to return `timer(0)`
- Use `done()` callback style with real timeouts
- Skip and document as known limitation

### 6. Capacitor Plugin Mocks

All Capacitor plugins are mocked in `setup-jest.ts`. If you need to control mock behavior per test:

```typescript
import { Preferences } from '@capacitor/preferences';

beforeEach(() => {
  (Preferences.get as jest.Mock).mockResolvedValue({ value: 'test' });
});
```

---

## i18n

- Translations: `src/assets/i18n/en.json` and `es.json`
- Service: `@ngx-translate/core`
- Check for missing keys: `npm run i18n:check`
- **IMPORTANT**: All user-facing text must be in both language files

---

## Styling

- **Tailwind CSS v3.4.13** + **DaisyUI 5.5.5** for utility-first styling
- Global styles: `src/global.css` (design tokens, themes, animations)
- Theme variables: `src/theme/variables.scss` (Ionic CSS custom properties)
- DaisyUI themes: `diabetactic` (light) and `dark` in `tailwind.config.js`
- Dark mode: Set via `[data-theme='dark']` attribute on root element
- Tailwind plugins: `@tailwindcss/forms`, `@tailwindcss/typography`, `@aparajita/tailwind-ionic`
- Icon system: Lucide Angular (v0.553.0) for consistent icon design

---

## File Organization

```
src/app/
├── core/                 # Singleton services, guards, interceptors, models
│   ├── services/         # All services (auth, api, database, etc.)
│   ├── guards/           # Route guards (auth, onboarding)
│   ├── interceptors/     # HTTP interceptors
│   ├── models/           # TypeScript interfaces and types
│   ├── constants/        # App-wide constants
│   └── contracts/        # API contracts and enums
├── shared/               # Reusable components
├── dashboard/            # Main dashboard with glucose stats and charts
├── readings/             # Glucose readings list and management
├── add-reading/          # Modal for adding new glucose readings
├── appointments/         # Medical appointments management
├── profile/              # User profile and settings
├── settings/             # App configuration and preferences
├── welcome/              # Onboarding and login flow
├── tips/                 # Diabetes management tips
├── bolus-calculator/     # Insulin dose calculator
└── trends/               # Glucose trends and analytics
```

Other directories:

- `playwright/tests/` - E2E tests with Playwright
- `maestro/` - Mobile E2E tests with Maestro
- `docs/` - Documentation files
- `scripts/` - Build and development scripts
- `postman/` - API collection and environment files for testing

---

## Routing

App uses lazy-loaded routes with `OnboardingGuard` protecting authenticated pages:

- `/welcome` - Entry point, unauthenticated
- `/account-pending` - Account verification pending page
- `/tabs/*` - Main app (dashboard, readings, appointments, profile)
  - `/tabs/dashboard` - Main dashboard with stats
  - `/tabs/readings` - Glucose readings list
  - `/tabs/appointments` - Appointments list
  - `/tabs/profile` - User profile
- `/add-reading` - Add glucose reading modal
- `/settings/*` - User settings pages
- `/tips` - Diabetes management tips
- `/trends` - Glucose trends analysis
- `/bolus-calculator` - Insulin dose calculator

---

## CI/CD (GitHub Actions)

Configuration in `.github/workflows/`. Three workflows:

### CI Workflow (`ci.yml`)

Runs on all pushes to master/main/develop and PRs:

- **test** - Lint + Unit tests with coverage
- **build-web** - Production build (uploads www/ artifact)
- **build-android** - Android debug build (master only)

### Android Workflow (`android.yml`)

Runs on pushes to master:

- **build-android** - Full Android build with caching
- **upload-artifact** - APK available for download

### Release Workflow (`release.yml`)

Manual trigger for production releases:

- Builds versioned APK: `diabetactic-v{version}.apk`
- Creates GitHub Release with APK attached

### Key Features

- **Node.js 20**: Consistent across all jobs
- **npm ci**: Fast, reproducible installs
- **DeepSource**: Coverage reporting integration
- **Artifact uploads**: Build outputs preserved for 7 days

### Environment Variables (GitHub Secrets)

- `DEEPSOURCE_DSN` - DeepSource coverage reporting
- `NETLIFY_SITE_ID` - Netlify site ID (optional)
- `NETLIFY_AUTH_TOKEN` - Netlify deploy token (optional)

---

## Mobile Development

```bash
# Android Development Workflow
npm run mobile:sync           # Build prod + sync to Capacitor
npm run android:open          # Open in Android Studio
npm run android:build         # Build debug APK via Gradle
npm run android:install       # Install on connected device
npm run android:logs          # View filtered logcat output

# Quick Deploy
npm run deploy:device         # Build + force reinstall on device
npm run android:emulator      # Start Android emulator

# Capacitor Commands
npx cap sync                  # Sync without building
npx cap open android          # Open in Android Studio
npx cap run android           # Build and run on device/emulator

# Requirements
# - Android Studio (latest)
# - Java 21 (configured in gradle)
# - Android SDK 34+
# - Gradle 8.x (wrapper included)
```

---

## Current Status

### Work in Progress (2025-12-13)

**Sync Proof & Screenshots**:

- Created comprehensive Playwright test: `playwright/tests/sync-proof-comprehensive.spec.ts`
- Captured 27 screenshots in `docs/assets/screenshots/sync-proof/`
- All screens in light + dark themes
- Generated `docs/SYNC_PROOF.md` documentation

**Docker Local Backend**:

- Docker networking requires system reboot (kernel module issue)
- Running kernel 6.12.60-1-lts but modules updated to 6.12.61-1-lts
- After reboot: `cd docker && docker-compose -f docker-compose.local.yml up -d`

**Files to Cleanup** (optional):

- `.aider*` - Aider AI tool artifacts (77KB)
- `package-lock.json` - Obsolete, using pnpm-lock.yaml now
- `.hive-mind/` - Old swarm data (400KB)
- `html/` - Landing page artifacts

### Lint Status

Current lint warnings (non-blocking):

- `@typescript-eslint/no-unused-vars` - Unused imports/variables across services and tests
- `@angular-eslint/prefer-standalone` - 3 legacy non-standalone components
- `@angular-eslint/template/click-events-have-key-events` - 4 accessibility warnings
- Stylelint: 4 browser compatibility warnings for experimental CSS features
- Run `pnpm run lint:fix` to auto-fix most issues

### Tidepool "Auth-Only" Architecture

Tidepool integration has been simplified to auth-only (completed 2025-12-04):

**Removed** (sync functionality no longer needed):

- `tidepool-sync.service.ts` - Data fetching removed
- `tidepool-storage.service.ts` - Tidepool storage removed
- `tidepool-transform.util.ts` - Data transforms removed
- `tidepool-mock.adapter.ts` - Mock adapter removed
- `tidepool.interceptor.ts` - HTTP interceptor removed

**Remaining** (auth-only):

- `tidepool-auth.service.ts` - Login + getUserId only
- `tidepool-auth.model.ts` - Auth state models

---

## Quick Reference

### Start Development

```bash
pnpm run start:mock      # Best for offline development (no backend)
pnpm run start:local     # Local Docker backend (localhost:8000)
pnpm run start:cloud     # Test against Heroku backend
```

### Start Docker Backend

```bash
cd docker
docker-compose -f docker-compose.local.yml up -d    # Start all services
docker-compose -f docker-compose.local.yml logs -f  # View logs
docker-compose -f docker-compose.local.yml down     # Stop all
```

### Before Committing

```bash
pnpm run quality         # Lint + test (cached by Turborepo)
pnpm run format          # Format all files
```

### Run Tests

```bash
pnpm test                # Quick unit test run (cached by Turborepo)
pnpm run test:watch      # TDD mode
pnpm run test:e2e        # Full E2E suite
```

### Deploy to Android

```bash
pnpm run mobile:sync     # Build + sync (cached by Turborepo)
pnpm run android:open    # Open Android Studio
pnpm run deploy:device   # Full build + install
```

### Debugging

```bash
pnpm run android:logs    # View app logs
pnpm run build:analyze   # Analyze bundle size
```

---

## Key Files

| File                                              | Purpose                                     |
| ------------------------------------------------- | ------------------------------------------- |
| `src/environments/environment.ts`                 | Environment config and backend modes        |
| `src/app/core/services/api-gateway.service.ts`    | API endpoint registry                       |
| `src/app/core/services/capacitor-http.service.ts` | Hybrid HTTP abstraction                     |
| `src/app/core/services/local-auth.service.ts`     | Authentication service                      |
| `src/test-setup.ts`                               | Central test setup (mocks, TestBed, compat) |
| `src/setup-vitest.ts`                             | Vitest setup with cleanup hooks             |
| `vitest.config.ts`                                | Vitest configuration with pool forks        |
| `tailwind.config.js`                              | Tailwind and DaisyUI theme config           |
| `angular.json`                                    | Angular build configurations                |
| `capacitor.config.ts`                             | Capacitor native bridge config              |
| `playwright.config.ts`                            | E2E test configuration                      |
| `.github/workflows/ci.yml`                        | CI/CD pipeline configuration                |

---

_Last updated: 2025-12-13_
