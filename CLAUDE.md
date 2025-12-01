# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Diabetactic is an Ionic/Angular mobile app for diabetes glucose management with Tidepool integration. Built with Angular 20.3.14, Ionic 8.7.11, Capacitor 6.2.1, and Tailwind CSS v3.4.13 + DaisyUI 5.5.5.

## Essential Commands

```bash
# Development (three backend modes controlled by scripts/start-with-env.mjs)
npm start                     # Default - auto-detects ENV variable
npm run start:mock            # In-memory mock data, no backend needed
npm run start:local           # Local Docker backend (localhost:8000)
npm run start:cloud           # Heroku production API (cloud)

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
- **Playwright**: 1.48.0 (E2E tests)
- **@axe-core/playwright**: 4.11.0 (accessibility)
- **ESLint**: 9.0.0 + TypeScript ESLint 8.0.0
- **Stylelint**: 16.12.0 (CSS linting)
- **Prettier**: 3.6.2 (code formatting)

### Internationalization

- **@ngx-translate/core**: 17.0.0 (i18n framework)
- **@angular/localize**: 20.3.7

### Development Tools

- **Husky**: 9.1.7 (git hooks)
- **lint-staged**: 16.2.3 (pre-commit linting)
- **@faker-js/faker**: 10.1.0 (test data)

## Architecture

### Backend Modes (src/environments/environment.ts)

The app supports three backend modes controlled by `DEV_BACKEND_MODE`:

- `mock` - In-memory mock adapter, no backend required
- `local` - Local Docker backend at localhost:8000
- `cloud` - Heroku API Gateway (production)

### Core Services (src/app/core/services/)

Key services to understand:

- `api-gateway.service.ts` - All backend HTTP calls route through here (endpoint registry pattern)
- `local-auth.service.ts` - Local authentication and user management
- `profile.service.ts` - User profile with Capacitor Preferences + SecureStorage
- `database.service.ts` - Dexie/IndexedDB for offline storage (readings, appointments)
- `notification.service.ts` - Push notifications via @capacitor/local-notifications
- `readings.service.ts` - Glucose readings CRUD with offline-first sync
- `appointment.service.ts` - Medical appointments with auto-reminders
- `tidepool-auth.service.ts` - Tidepool OAuth integration
- `tips.service.ts` - Diabetes management tips and recommendations
- `bolus-calculator.service.ts` - Insulin dosage calculation helper

### API Gateway Pattern

All backend calls route through `ApiGatewayService` with endpoint registry pattern:

```typescript
// Request using endpoint key (not raw URL)
this.apiGateway.request('auth.login', { body: credentials });
this.apiGateway.request('readings.list', { params: { userId } });
this.apiGateway.request('appointments.create', { body: appointmentData });
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
    IonHeader, IonToolbar, IonTitle, // etc - import each Ionic component
    TranslateModule,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA], // Required for Ionic web components
})
```

### Testing Setup

#### Unit Tests (Jest 29.7.0)

- **Framework**: Jest with Jasmine compatibility layer via `jest-preset-angular`
- **Configuration**: `setup-jest.ts` with comprehensive Capacitor mocks
- **Patterns**: Use Jest (`jest.fn()`, `jest.spyOn()`) or Jasmine (`jasmine.createSpyObj()`)
- **Capacitor mocks**: Pre-configured for all plugins (Preferences, SecureStorage, Network, etc.)
- **Test location**: Spec files alongside source (`*.spec.ts`)
- **Coverage**: Run `npm run test:coverage` for HTML reports in `coverage/`
- **Fake IndexedDB**: `fake-indexeddb` package for Dexie testing

#### E2E Tests (Playwright 1.48.0)

- **Location**: `playwright/tests/`
- **Features**: Visual regression, accessibility audits with @axe-core/playwright
- **Reporters**: HTML, JSON, and axe-html-reporter for a11y issues
- **Browsers**: Chromium, Firefox, WebKit (configured in playwright.config.ts)
- **Screenshots**: Auto-captured on failure in `playwright/screenshots/`
- **Accessibility**: Dedicated `test:a11y` command for WCAG compliance checks

#### Test Commands Summary

- `npm test` - Unit tests only
- `npm run test:watch` - Watch mode for TDD
- `npm run test:coverage` - Unit tests with coverage
- `npm run test:integration` - Integration tests (separate config)
- `npm run test:e2e` - All E2E tests headless
- `npm run test:a11y` - Accessibility audit suite
- `npm run test:mobile` - Build mobile + run E2E

### i18n

- Translations: `src/assets/i18n/en.json` and `es.json`
- Service: `@ngx-translate/core`
- Check for missing keys: `npm run i18n:check`

### Styling

- **Tailwind CSS v3.4.13** + **DaisyUI 5.5.5** for utility-first styling
- Global styles: `src/global.css` (design tokens, themes, animations)
- Theme variables: `src/theme/variables.scss` (Ionic CSS custom properties)
- DaisyUI themes: `diabetactic` (light) and `dark` in `tailwind.config.js`
- Dark mode: Set via `[data-theme='dark']` attribute on root element
- Tailwind plugins: `@tailwindcss/forms`, `@tailwindcss/typography`, `@aparajita/tailwind-ionic`
- Icon system: Lucide Angular (v0.553.0) for consistent icon design

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

## File Organization

- `src/app/core/` - Singleton services, guards, interceptors, models
- `src/app/shared/` - Reusable components
- `src/app/dashboard/` - Main dashboard with glucose stats and charts
- `src/app/readings/` - Glucose readings list and management
- `src/app/add-reading/` - Modal for adding new glucose readings
- `src/app/appointments/` - Medical appointments management
- `src/app/profile/` - User profile and settings
- `src/app/settings/` - App configuration and preferences
- `src/app/welcome/` - Onboarding and login flow
- `src/app/tips/` - Diabetes management tips
- `src/app/bolus-calculator/` - Insulin dose calculator
- `src/app/trends/` - Glucose trends and analytics
- `playwright/tests/` - E2E tests with Playwright
- `e2e/` - Legacy E2E tests (Protractor-style)
- `docs/` - Documentation files
- `scripts/` - Build and development scripts
- `postman/` - API collection and environment files for testing

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

## Current Status

### Package Versions (as of 2025-12-01)

- **Angular**: 20.3.14
- **Ionic**: 8.7.11
- **Capacitor**: 6.2.1
- **TypeScript**: 5.8.0
- **Tailwind CSS**: 3.4.13
- **DaisyUI**: 5.5.5
- **Jest**: 29.7.0
- **Playwright**: 1.48.0

### Lint Status

Current lint warnings (125 total, non-blocking):

- `@typescript-eslint/no-unused-vars` - Unused imports/variables across services and tests
- `@angular-eslint/prefer-standalone` - 3 legacy non-standalone components
- `@angular-eslint/template/click-events-have-key-events` - 4 accessibility warnings
- Stylelint: 4 browser compatibility warnings for experimental CSS features
- Run `npm run lint:fix` to auto-fix most issues

### Test Coverage

- Unit tests: Jest with Jasmine compatibility layer
- Integration tests: Separate Jest config (passWithNoTests)
- E2E tests: Playwright with accessibility audits
- UI quality tests: Subset of accessibility tests

## Important Notes

- All API requests go through ApiGatewayService, not direct HTTP calls
- Offline-first: Data stored in IndexedDB (Dexie), synced when online
- Use `CUSTOM_ELEMENTS_SCHEMA` in all standalone components for Ionic
- When testing services, mock Capacitor plugins are already configured in setup-jest.ts
- Prefer editing existing files over creating new ones
- Never save working files to root folder - use appropriate subdirectories
- Translations required in both `en.json` and `es.json` for any user-facing text
- Backend mode controlled by `DEV_BACKEND_MODE` in environment.ts (default: 'cloud')
- Use `npm run start:mock` for offline development without backend
- Husky git hooks configured with lint-staged for pre-commit quality checks

## Quick Reference

### Common Development Tasks

**Start development server:**

```bash
npm run start:mock      # Offline development (recommended)
npm run start:cloud     # Test against Heroku backend
```

**Run tests:**

```bash
npm test                # Quick unit test run
npm run test:watch      # TDD mode
npm run test:e2e        # Full E2E suite
```

**Code quality:**

```bash
npm run quality         # Lint + test
npm run lint:fix        # Auto-fix lint issues
npm run format          # Format all files
```

**Build and deploy to Android:**

```bash
npm run mobile:sync     # Build + sync
npm run android:open    # Open Android Studio
npm run deploy:device   # Full build + install
```

**Debugging:**

```bash
npm run android:logs    # View app logs
npm run build:analyze   # Analyze bundle size
```

### Environment Variables

Control backend mode via ENV variable:

```bash
ENV=mock npm start      # Mock backend (offline)
ENV=local npm start     # Local Docker (localhost:8000)
ENV=cloud npm start     # Heroku production (default)
```

### Key Files

- `src/environments/environment.ts` - Environment config and backend modes
- `src/app/core/services/api-gateway.service.ts` - API endpoint registry
- `setup-jest.ts` - Jest config with Capacitor mocks
- `tailwind.config.js` - Tailwind and DaisyUI theme config
- `angular.json` - Angular build configurations
- `capacitor.config.ts` - Capacitor native bridge config
- `playwright.config.ts` - E2E test configuration
