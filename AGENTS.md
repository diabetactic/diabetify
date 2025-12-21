# AGENTS.md - Diabetactic AI Agent Configuration

> Universal configuration file for AI coding agents (Google Jules, OpenAI Codex, Claude Code)

## Project Overview

Diabetactic is an Ionic/Angular mobile app for diabetes glucose management.

**Stack**: Angular 21.0.5, Ionic 8.7.14, Capacitor 8.0.0, Tailwind CSS + DaisyUI, Vitest 4.0.15, Playwright 1.48.0

**Documentation**: See `CLAUDE.md` for comprehensive project documentation

## Build Commands

```bash
npm install              # Install dependencies
npm run build:prod       # Production build
npm test                 # Run Vitest unit tests
npm run lint             # ESLint + Stylelint
```

## Test Commands

```bash
npm run test:unit        # Vitest unit tests
npm run test:e2e         # Playwright E2E tests
npm run test:coverage    # Coverage report
```

## Coding Standards

### Angular Components

- Use standalone components (not NgModule)
- Import Ionic components individually: `IonHeader, IonToolbar, IonTitle`
- Always include `schemas: [CUSTOM_ELEMENTS_SCHEMA]`

### API Calls

- ALL HTTP requests through `ApiGatewayService`
- Never use HttpClient directly in components/services
- Use endpoint keys: `this.apiGateway.request('readings.list', { params })`

### Internationalization

- All user-facing text must be in both `en.json` AND `es.json`
- Use TranslateModule for templates: `{{ 'key' | translate }}`
- Run `npm run i18n:check` before committing

### Testing

- Vitest 4.0.15 for unit tests (\*.spec.ts alongside source)
- All Capacitor plugins mocked in `src/test-setup/`
- 1012 tests passing, 0 skipped, 0 failed (as of 2025-12-04)

## File Structure

```
src/app/
├── core/services/       # Singleton services (auth, api, database)
├── core/models/         # TypeScript interfaces
├── shared/              # Reusable components
├── dashboard/           # Main dashboard page
├── readings/            # Glucose readings management
├── appointments/        # Medical appointments
└── profile/             # User profile and settings
```

## Branch Protection

- **NEVER** merge directly to `master`
- Create feature branches: `feature/[agent]/[task]`
- All PRs require passing CI checks
- Squash merge preferred

## Test Credentials

| System     | Username | Password |
| ---------- | -------- | -------- |
| Mobile App | 1000     | tuvieja  |
| Backoffice | admin    | admin    |

## API Endpoints

- Main API: `https://diabetactic-api-gateway-37949d6f182f.herokuapp.com`
- Backoffice: `https://dt-api-gateway-backoffice-3dead350d8fa.herokuapp.com`

## Backend Modes

The app supports three backend modes controlled by `DEV_BACKEND_MODE`:

- `mock` - In-memory mock adapter, no backend required
- `local` - Local Docker backend at localhost:8000
- `cloud` - Heroku API Gateway (production)

```bash
ENV=mock npm start      # Mock backend (offline) - RECOMMENDED
ENV=cloud npm start     # Heroku production
```

## E2E Testing

### Web E2E (Playwright 1.48.0)

- **Location**: `playwright/tests/`
- **Run**: `npm run test:e2e` (headless) or `npm run test:e2e:headed`
- **Features**:
  - Visual regression testing
  - Accessibility audits with @axe-core/playwright
  - Auto-screenshots on failure in `playwright/artifacts/`
- **Key tests**:
  - `accessibility-audit.spec.ts` - WCAG compliance
  - `heroku-integration.spec.ts` - Backend integration
  - `heroku-appointments-flow.spec.ts` - Appointments E2E
  - `heroku-readings-crud.spec.ts` - Readings CRUD
  - `error-handling.spec.ts` - Error scenarios

### Mobile E2E (Maestro)

- **Location**: `maestro/tests/`
- **Run**: `maestro test maestro/tests/` (requires running emulator + installed APK)
- **Backend**: Tests against real Heroku production API
- **Test Structure**:
  - `readings/` - List, add, edit glucose readings
  - `appointments/` - Full appointment lifecycle (request → pending → accepted → created)
  - `profile/` - Profile editing
  - `settings/` - Theme and language persistence
  - `errors/` - Network errors, invalid login, form validation
- **Key Features**:
  - Bilingual support (Spanish/English regex patterns)
  - Shadow DOM bypass strategies
  - Backoffice API integration for appointment queue management
  - Deterministic state management with `clearState`

**Backoffice API helper** (for appointment tests):

```bash
# Actions: accept, deny, clear
ACTION=accept USER_ID=1000 node maestro/scripts/backoffice-api.js
ACTION=clear node maestro/scripts/backoffice-api.js
```

## Key Files to Know

| File                                              | Purpose                           |
| ------------------------------------------------- | --------------------------------- |
| `CLAUDE.md`                                       | Comprehensive project docs        |
| `src/app/core/services/api-gateway.service.ts`    | All API calls (endpoint registry) |
| `src/app/core/services/capacitor-http.service.ts` | Hybrid HTTP (web/native)          |
| `src/app/core/services/local-auth.service.ts`     | Authentication                    |
| `src/environments/environment.ts`                 | Backend mode config               |
| `setup-jest.ts`                                   | Jest + Capacitor mocks            |
| `playwright.config.ts`                            | Playwright E2E config             |
| `maestro/config.yaml`                             | Maestro E2E config                |

## Common Gotchas

1. **CUSTOM_ELEMENTS_SCHEMA** - Required in all standalone components for Ionic
2. **Translations** - Must add to both `en.json` AND `es.json`
3. **ApiGatewayService** - Never use HttpClient directly
4. **Branch protection** - Never commit to master directly

## Pre-Commit Checklist

- [ ] `npm test` passes
- [ ] `npm run lint` has no errors
- [ ] Translations added to both language files
- [ ] PR targets correct branch (NOT master)
- [ ] CUSTOM_ELEMENTS_SCHEMA included in new components

## Contact

Repository: https://github.com/diabetactic/diabetify
