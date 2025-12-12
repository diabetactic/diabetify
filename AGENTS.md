# AGENTS.md - Diabetactic AI Agent Configuration

> Universal configuration file for AI coding agents (Google Jules, OpenAI Codex, Claude Code)

## Project Overview

Diabetactic is an Ionic/Angular mobile app for diabetes glucose management.

**Stack**: Angular 20.3.14, Ionic 8.7.11, Capacitor 6.2.1, Tailwind CSS + DaisyUI

## Build Commands

```bash
npm install              # Install dependencies
npm run build:prod       # Production build
npm test                 # Run Jest unit tests (1012 tests)
npm run lint             # ESLint + Stylelint
```

## Test Commands

```bash
npm run test:unit        # Jest unit tests
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

- Jest for unit tests (\*.spec.ts alongside source)
- Playwright for web E2E (playwright/tests/)
- Maestro for mobile E2E (maestro/tests/)

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

## E2E Testing Branches

| Branch                        | Framework            | Status               |
| ----------------------------- | -------------------- | -------------------- |
| `test/e2e-playwright-android` | Playwright           | Ready                |
| `test/e2e-webdriverio-appium` | WebdriverIO + Appium | PRs #62-69 pending   |
| `test/e2e-mobile-mcp`         | Mobile MCP           | PR #60 has conflicts |

## Agent-Specific Instructions

### For Jules (Google)

- Focus on WebdriverIO E2E setup
- Branch: `test/e2e-webdriverio-appium`
- PRs #62-69 need review and merge
- Run: `npm test` before submitting PRs

### For Codex (OpenAI)

- Focus on Mobile MCP evaluation
- Branch: `test/e2e-mobile-mcp`
- PR #60 needs conflict resolution
- Test with: `cd maestro/mobile-mcp && node run-tests.js`

### For Claude Code

- Focus on Playwright Android testing
- Branch: `test/e2e-playwright-android`
- Branch is ready for testing
- Run: `npm run test:e2e -- --project=mobile-chromium`

## Key Files to Know

| File                                           | Purpose                |
| ---------------------------------------------- | ---------------------- |
| `src/app/core/services/api-gateway.service.ts` | All API calls          |
| `src/app/core/services/local-auth.service.ts`  | Authentication         |
| `src/environments/environment.ts`              | Backend mode config    |
| `setup-jest.ts`                                | Jest + Capacitor mocks |
| `playwright.config.ts`                         | E2E test config        |

## Common Gotchas

1. **CUSTOM_ELEMENTS_SCHEMA** - Required in all standalone components for Ionic
2. **Translations** - Must add to both `en.json` AND `es.json`
3. **ApiGatewayService** - Never use HttpClient directly
4. **Branch protection** - Never commit to master directly

## Pre-Commit Checklist

- [ ] `npm test` passes (all 1012 tests)
- [ ] `npm run lint` has no errors
- [ ] Translations added to both language files
- [ ] PR targets correct branch (NOT master)
- [ ] CUSTOM_ELEMENTS_SCHEMA included in new components

## Contact

Repository: https://github.com/diabetactic/diabetify
