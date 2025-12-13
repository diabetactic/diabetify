# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Diabetactic is an Ionic/Angular mobile app for diabetes glucose management. Built with Angular 20.3.14, Ionic 8.7.11, Capacitor 6.2.1, and Tailwind CSS v3.4.13 + DaisyUI 5.5.5.

**Architecture Note**: Tidepool integration is "auth-only" - used only for user authentication/ID, not for glucose data sync. Glucose data comes from Diabetactic backend.

---

## IMPORTANT: Key Rules

**YOU MUST follow these rules:**

1. **All API requests go through `ApiGatewayService`** - Never make direct HTTP calls
2. **Use `CUSTOM_ELEMENTS_SCHEMA`** in all standalone components for Ionic web components
3. **Translations required in both `en.json` AND `es.json`** for any user-facing text
4. **Prefer editing existing files** over creating new ones
5. **Never save files to root folder** - use appropriate subdirectories
6. **Run `pnpm test` before committing** - ensure tests pass
7. **Offline-first**: Data stored in IndexedDB (Dexie), synced when online
8. **Lefthook git hooks** are configured with lint-staged for pre-commit quality checks
9. **Use pnpm instead of npm** - 3x faster installs, better caching with Turborepo

---

## Test Credentials (Quick Reference)

| System             | Username/ID  | Password               | URL                                                            |
| ------------------ | ------------ | ---------------------- | -------------------------------------------------------------- |
| **Mobile App**     | `1000`       | `tuvieja`              | N/A (app login)                                                |
| **Backoffice API** | `admin`      | `admin`                | `https://dt-api-gateway-backoffice-3dead350d8fa.herokuapp.com` |
| **Main API**       | Bearer token | (from /token endpoint) | `https://diabetactic-api-gateway-37949d6f182f.herokuapp.com`   |

**Backoffice API Actions** (used by Maestro appointment tests):

```bash
# Accept/Deny/Clear appointment queue for user
ACTION=accept USER_ID=1000 node maestro/scripts/backoffice-api.js
ACTION=deny USER_ID=1000 node maestro/scripts/backoffice-api.js
ACTION=clear node maestro/scripts/backoffice-api.js
```

---

## Available AI Tools & Agents

### MCP Servers Available

The following MCP servers are configured and can be used for enhanced capabilities:

| Server       | Purpose                           | Key Tools                                                          |
| ------------ | --------------------------------- | ------------------------------------------------------------------ |
| **zen**      | Multi-model AI collaboration      | `chat`, `thinkdeep`, `codereview`, `debug`, `analyze`, `consensus` |
| **context7** | Library documentation lookup      | `resolve-library-id`, `get-library-docs`                           |
| **tavily**   | Web search and content extraction | `tavily-search`, `tavily-extract`, `tavily-crawl`                  |
| **github**   | GitHub repository management      | `list_issues`, `create_pull_request`, `get_file_contents`          |

**Zen MCP Models Available:**

- OpenAI: `gpt-5.1`, `gpt-5.1-codex`, `gpt-5-pro`, `o3`, `o3-mini`, `o4-mini`
- Google: `gemini-2.5-pro`, `gemini-3-pro-preview`, `gemini-2.5-flash`
- Use aliases like `pro`, `flash`, `codex`, `gpt5` for convenience

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

### Skills Available

| Skill                           | When to Use                               |
| ------------------------------- | ----------------------------------------- |
| `document-skills:xlsx`          | Working with spreadsheets                 |
| `document-skills:pdf`           | PDF manipulation                          |
| `example-skills:webapp-testing` | Testing web apps with Playwright          |
| `python-development:*`          | Python testing, packaging, async patterns |
| `superpowers:brainstorming`     | Before coding - refine ideas into designs |
| `superpowers:defense-in-depth`  | Validation at multiple system layers      |

### Slash Commands

- `/superpowers:brainstorm` - Interactive design refinement
- `/superpowers:execute-plan` - Execute plan with review checkpoints
- `/superpowers:write-plan` - Create detailed implementation plan
- `/episodic-memory:search-conversations` - Search previous conversations

---

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

# Testing (Jest + Playwright)
npm test                      # Run all unit tests (Jest)
npm run test:unit             # Run unit tests (same as test)
npm run test:watch            # Watch mode for unit tests
npm run test:coverage         # Unit tests with coverage report
npm run test:integration      # Integration tests (separate config)
npm test -- --testPathPattern="profile"  # Run specific test file
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

- **Angular**: 20.3.14 (standalone components, signals, provideRouter)
- **Ionic**: 8.7.11 (UI components, web components)
- **Capacitor**: 6.2.1 (native bridge, plugins)
- **TypeScript**: 5.8.0
- **RxJS**: 7.8.0 (reactive state management)

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

- **Jest**: 29.7.0 (unit tests)
- **jest-junit**: For CI test results (visible in GitHub Actions)
- **Playwright**: 1.48.0 (E2E tests)
- **@axe-core/playwright**: 4.11.0 (accessibility)
- **ESLint**: 9.0.0 + TypeScript ESLint 8.0.0
- **Stylelint**: 16.12.0 (CSS linting)
- **Prettier**: 3.6.2 (code formatting)

### Internationalization

- **@ngx-translate/core**: 17.0.0 (i18n framework)
- **@angular/localize**: 20.3.7

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

**Note**: Jest and Angular are configured to resolve these aliases automatically.

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

- **2060+ tests** across 69 test suites
- Unit tests (Jest) + E2E tests (Playwright) + Mobile tests (Maestro)

### Unit Tests (Jest 29.7.0)

- **Framework**: Jest with Jasmine compatibility layer via `jest-preset-angular`
- **Configuration**: `setup-jest.ts` with comprehensive Capacitor mocks
- **Patterns**: Use Jest (`jest.fn()`, `jest.spyOn()`) or Jasmine (`jasmine.createSpyObj()`)
- **Capacitor mocks**: Pre-configured for all plugins (Preferences, SecureStorage, Network, etc.)
- **Test location**: Spec files alongside source (`*.spec.ts`)
- **Coverage**: Run `npm run test:coverage` for HTML reports in `coverage/`
- **Fake IndexedDB**: `fake-indexeddb` package for Dexie testing
- **CI Results**: jest-junit configured for GitHub Actions test visibility

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
- `setup-jest.ts` - Carefully configured Capacitor mocks for all plugins

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

### Lint Status

Current lint warnings (non-blocking):

- `@typescript-eslint/no-unused-vars` - Unused imports/variables across services and tests
- `@angular-eslint/prefer-standalone` - 3 legacy non-standalone components
- `@angular-eslint/template/click-events-have-key-events` - 4 accessibility warnings
- Stylelint: 4 browser compatibility warnings for experimental CSS features
- Run `npm run lint:fix` to auto-fix most issues

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
pnpm run start:mock      # Best for offline development
pnpm run start:cloud     # Test against Heroku backend
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

| File                                              | Purpose                              |
| ------------------------------------------------- | ------------------------------------ |
| `src/environments/environment.ts`                 | Environment config and backend modes |
| `src/app/core/services/api-gateway.service.ts`    | API endpoint registry                |
| `src/app/core/services/capacitor-http.service.ts` | Hybrid HTTP abstraction              |
| `src/app/core/services/local-auth.service.ts`     | Authentication service               |
| `setup-jest.ts`                                   | Jest config with Capacitor mocks     |
| `jest.config.js`                                  | Jest configuration with jest-junit   |
| `tailwind.config.js`                              | Tailwind and DaisyUI theme config    |
| `angular.json`                                    | Angular build configurations         |
| `capacitor.config.ts`                             | Capacitor native bridge config       |
| `playwright.config.ts`                            | E2E test configuration               |
| `.github/workflows/ci.yml`                        | CI/CD pipeline configuration         |

---

_Last updated: 2025-12-12_
